import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  benchmarkNpmResolution,
  buildRegistryIndex,
  parseBenchmarkOptions,
  publishWorkspaceRange,
  resolveNpmPackageLock,
  runCommandWithTimeout,
  type RegistryIndex,
} from './benchmark-npm-resolution.ts'

const roots: string[] = []
// Cold npm startup and package-lock generation share the 90-second process-test
// allowance; the child leaves time for forced exit and registry cleanup.
const NPM_RESOLUTION_TIMEOUT_MS = 60_000

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

function writeJson(root: string, path: string, value: unknown): void {
  const absolute = join(root, path)
  mkdirSync(dirname(absolute), { recursive: true })
  writeFileSync(absolute, `${JSON.stringify(value, null, 2)}\n`)
}

function processCanExecute(pid: number): boolean {
  try {
    process.kill(pid, 0)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ESRCH') return false
    throw error
  }
  if (process.platform !== 'linux') return true
  try {
    const stat = readFileSync(`/proc/${pid}/stat`, 'utf8')
    const state = stat.slice(stat.lastIndexOf(')') + 2).split(/\s+/, 1)[0]
    return !/^[ZXx]$/.test(state ?? '')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false
    throw error
  }
}

describe('npm resolution benchmark', { timeout: 90_000 }, () => {
  it('parses repeat, timeout, threshold, and ref options', () => {
    expect(parseBenchmarkOptions([])).toEqual({ runs: 1, timeoutMs: 300_000 })
    expect(parseBenchmarkOptions([
      '--runs', '3', '--timeout-ms', '45000', '--max-ms', '20000', '--ref', 'master',
    ])).toEqual({ runs: 3, timeoutMs: 45_000, maxMs: 20_000, ref: 'master' })
    expect(parseBenchmarkOptions(['--', '--runs', '2'])).toEqual({ runs: 2, timeoutMs: 300_000 })
    expect(() => parseBenchmarkOptions(['--runs', '0'])).toThrow('--runs must be a positive integer')
  })

  it('projects workspace protocols to published ranges', () => {
    expect(publishWorkspaceRange('workspace:^', '1.2.3')).toBe('^1.2.3')
    expect(publishWorkspaceRange('workspace:~', '1.2.3')).toBe('~1.2.3')
    expect(publishWorkspaceRange('workspace:*', '1.2.3')).toBe('1.2.3')
    expect(publishWorkspaceRange('^4.0.0', '1.2.3')).toBe('^4.0.0')
  })

  it('combines installed metadata with current publishable workspace fields', () => {
    const root = mkdtempSync(join(tmpdir(), 'alego-npm-registry-index-'))
    roots.push(root)
    writeJson(root, 'node_modules/.pnpm/external@2.0.0/node_modules/external/package.json', {
      name: 'external',
      version: '2.0.0',
      dependencies: { child: '^1.0.0' },
      devDependencies: { ignored: '^1.0.0' },
    })
    writeJson(root, 'apps/cli/package.json', {
      name: '@singula-ai/alego',
      version: '0.1.0',
      dependencies: { '@singula-ai/alego-child': 'workspace:^', external: '^2.0.0' },
      devDependencies: { ignored: 'workspace:^' },
    })
    writeJson(root, 'packages/core/child/package.json', {
      name: '@singula-ai/alego-child',
      version: '0.1.0',
    })

    const index = buildRegistryIndex(root)

    expect(index.get('external')?.get('2.0.0')).toMatchObject({ dependencies: { child: '^1.0.0' } })
    expect(index.get('@singula-ai/alego')?.get('0.1.0')).toEqual({
      name: '@singula-ai/alego',
      version: '0.1.0',
      dependencies: { '@singula-ai/alego-child': '^0.1.0', external: '^2.0.0' },
    })
  })

  it('runs npm against the local registry without requesting an archive', async () => {
    const index: RegistryIndex = new Map([[
      '@singula-ai/alego',
      new Map([['0.1.0', { name: '@singula-ai/alego', version: '0.1.0' }]]),
    ]])
    const result = await benchmarkNpmResolution(index, '0.1.0', NPM_RESOLUTION_TIMEOUT_MS)

    expect(result.durationMs).toBeGreaterThan(0)
    expect(result.registryRequests).toBeGreaterThan(0)
    expect(result.archiveRequests).toBe(0)
    expect(result.unknownPackages).toEqual([])
  })

  it('returns npm placement for two aliased package versions without requesting archives', async () => {
    const index: RegistryIndex = new Map([[
      '@singula-ai/alego',
      new Map([
        ['0.1.0', { name: '@singula-ai/alego', version: '0.1.0' }],
        ['0.2.0', { name: '@singula-ai/alego', version: '0.2.0' }],
      ]),
    ]])

    const result = await resolveNpmPackageLock(index, {
      '@singula-ai/alego': '0.2.0',
      'alego-previous': 'npm:@singula-ai/alego@0.1.0',
    }, NPM_RESOLUTION_TIMEOUT_MS)

    expect(result.archiveRequests).toBe(0)
    expect(result.packageLock.packages['node_modules/@singula-ai/alego']?.version).toBe('0.2.0')
    expect(result.packageLock.packages['node_modules/alego-previous']).toMatchObject({
      name: '@singula-ai/alego',
      version: '0.1.0',
    })
  })

  it('isolates peer resolution from inherited npm configuration', async () => {
    const root = mkdtempSync(join(tmpdir(), 'alego-hostile-npm-config-'))
    roots.push(root)
    const userConfig = join(root, 'user.npmrc')
    writeFileSync(userConfig, '@singula-ai:registry=http://127.0.0.1:1/\nlegacy-peer-deps=true\nomit=peer\n')
    const previous = {
      userConfig: process.env.npm_config_userconfig,
      legacyPeerDeps: process.env.npm_config_legacy_peer_deps,
      omit: process.env.npm_config_omit,
    }
    process.env.npm_config_userconfig = userConfig
    process.env.npm_config_legacy_peer_deps = 'true'
    process.env.npm_config_omit = 'peer'
    try {
      const index: RegistryIndex = new Map([
        ['@singula-ai/alego', new Map([['0.1.0', {
          name: '@singula-ai/alego',
          version: '0.1.0',
          peerDependencies: { '@singula-ai/alego-peer': '1.0.0' },
        }]])],
        ['@singula-ai/alego-peer', new Map([['1.0.0', {
          name: '@singula-ai/alego-peer',
          version: '1.0.0',
        }]])],
      ])

      const result = await resolveNpmPackageLock(index, { '@singula-ai/alego': '0.1.0' }, NPM_RESOLUTION_TIMEOUT_MS)

      expect(result.archiveRequests).toBe(0)
      expect(result.packageLock.packages['node_modules/@singula-ai/alego-peer']?.version).toBe('1.0.0')
    } finally {
      if (previous.userConfig === undefined) delete process.env.npm_config_userconfig
      else process.env.npm_config_userconfig = previous.userConfig
      if (previous.legacyPeerDeps === undefined) delete process.env.npm_config_legacy_peer_deps
      else process.env.npm_config_legacy_peer_deps = previous.legacyPeerDeps
      if (previous.omit === undefined) delete process.env.npm_config_omit
      else process.env.npm_config_omit = previous.omit
    }
  })

  it.skipIf(process.platform === 'win32')('force-kills a timed-out process tree', async () => {
    const source = [
      "const { spawn } = require('node:child_process')",
      "process.on('SIGTERM', () => {})",
      'const child = spawn(process.execPath, [\'-e\', "process.on(\'SIGTERM\', () => {}); setInterval(() => {}, 1000)"], { stdio: \'ignore\' })',
      'console.log(child.pid)',
      'setInterval(() => {}, 1000)',
    ].join(';')
    let descendantPid: number | undefined
    try {
      const result = await runCommandWithTimeout(process.execPath, ['-e', source], {
        cwd: process.cwd(),
        env: process.env,
        timeoutMs: 1_000,
        terminationGraceMs: 100,
      })
      const reportedPid = Number.parseInt(result.output.trim(), 10)
      if (!Number.isSafeInteger(reportedPid)) throw new Error(`child reported invalid pid ${result.output.trim()}`)
      descendantPid = reportedPid

      expect(result.timedOut).toBe(true)
      expect(result.signal).toBe('SIGKILL')
      await expect.poll(() => processCanExecute(reportedPid), { timeout: 5_000 }).toBe(false)
    } finally {
      if (descendantPid !== undefined && Number.isSafeInteger(descendantPid)) {
        try {
          process.kill(descendantPid, 'SIGKILL')
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error
        }
      }
    }
  })
})
