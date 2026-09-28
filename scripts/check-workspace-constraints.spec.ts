/** Workspace dependency ranges and package publication constraints. */

import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it, onTestFinished } from 'vitest'
import {
  isPublicExperimentalPackageDirectory,
  PRIVATE_EXPERIMENTAL_PACKAGE_DIRECTORIES,
} from './experimental-package-policy.ts'
import {
  checkAlegoFamilyVersion,
  checkWorkspaceManifest,
  checkWorkspaceProtocol,
  checkExperimentalDependencyIsolation,
  checkExperimentalManifest,
  expectedAlegoPackageFiles,
  readWorkspaceManifests,
  type WorkspaceManifest,
} from './check-workspace-constraints.ts'

const experimental = {
  dir: 'packages/experimental/prototype',
  manifest: {
    name: '@singula-ai/alego-experimental-prototype',
    publishConfig: { access: 'public' },
  },
} satisfies WorkspaceManifest

describe('workspace dependency ranges', () => {
  const dependency = { dir: 'packages/core/runtime', manifest: { name: '@singula-ai/alego-runtime' } }
  const cli = { dir: 'apps/cli', manifest: { name: '@singula-ai/alego' } }
  const vendor = { dir: 'vendor/cordis', manifest: { name: '@singula-ai/cordis' } }
  const native = { dir: 'native/system', manifest: { name: '@singula-ai/node-addon-system' } }
  const platform = { dir: 'native/system/packages/darwin-arm64', manifest: { name: '@singula-ai/node-addon-system-darwin-arm64' } }
  const unrelated = { dir: 'tools/helper', manifest: { name: '@other/helper' } }

  describe.each([
    '.', 'packages/core/probe', 'packages/experimental/probe', 'apps/cli', 'apps/web',
    'apps/desktop', 'apps/desktop-host', 'benchmarks', 'website', 'python/sdk-runtime', 'tools/probe',
    'vendor/loader', 'native/system', 'native/system/packages/entry',
  ])('consumer %s', (dir) => {
    it.each(['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'] as const)(
      'requires exact ALEGO and tilde vendor/native %s independently of the consumer name',
      (section) => {
        const consumer = (name: string, range: string): WorkspaceManifest => ({
          dir, manifest: { name: 'consumer', [section]: { [name]: range } },
        })
        const check = (name: string, range: string): string[] =>
          checkWorkspaceProtocol([dependency, cli, vendor, native, platform, unrelated, consumer(name, range)])
        for (const name of ['@singula-ai/alego', '@singula-ai/alego-runtime']) {
          expect(check(name, 'workspace:*')).toEqual([])
          for (const range of ['workspace:^', 'workspace:~', 'workspace:^0.1.7', '^0.1.7', '*']) {
            expect(check(name, range)).toEqual([
              `consumer: ${section}.${name} must use workspace:*, got ${range}`,
            ])
          }
        }
        for (const name of ['@singula-ai/cordis', '@singula-ai/node-addon-system', '@singula-ai/node-addon-system-darwin-arm64']) {
          expect(check(name, 'workspace:~')).toEqual([])
          for (const range of ['workspace:*', 'workspace:^', '^4.0.3', '~4.0.3']) {
            expect(check(name, range)).toEqual([
              `consumer: ${section}.${name} must use workspace:~, got ${range}`,
            ])
          }
        }
        for (const range of ['workspace:*', 'workspace:^']) {
          expect(check('@other/helper', range)).toEqual([])
        }
        expect(check('@other/helper', '^0.1.0')).toEqual([
          `consumer: ${section}.@other/helper must use the workspace: protocol, got ^0.1.0`,
        ])
        expect(check('external', '^1.2.3')).toEqual([])
      },
    )
  })
})

describe('workspace manifest discovery', () => {
  it('checks root, app, runtime, tooling, and newly declared members while honoring exclusions', () => {
    const root = mkdtempSync(join(tmpdir(), 'alego-workspace-ranges-'))
    onTestFinished(() => { rmSync(root, { recursive: true, force: true }) })
    const consumers = ['.', 'apps/cli', 'apps/web', 'apps/desktop', 'apps/desktop-host', 'benchmarks', 'website', 'python/sdk-runtime', 'tools/probe']
    writeFileSync(join(root, 'pnpm-workspace.yaml'), [
      'packages:', '  - packages/*/*', '  - apps/*', '  - apps/cli', '  - benchmarks',
      '  - website', '  - python/sdk-runtime', '  - tools/*', '  - "!tools/excluded"',
    ].join('\n'))
    for (const dir of [...consumers, 'tools/excluded', 'unlisted/probe', 'packages/core/runtime']) {
      mkdirSync(join(root, dir), { recursive: true })
      writeFileSync(join(root, dir, 'package.json'), JSON.stringify(dir === 'packages/core/runtime'
        ? { name: '@singula-ai/alego-runtime' }
        : { dependencies: { '@singula-ai/alego-runtime': 'workspace:^' } }))
    }
    const manifests = readWorkspaceManifests(root)
    expect(manifests.map(entry => entry.dir).sort()).toEqual([...consumers, 'packages/core/runtime'].sort())
    expect(checkWorkspaceProtocol(manifests).sort()).toEqual(consumers.map(dir =>
      `${dir}: dependencies.@singula-ai/alego-runtime must use workspace:*, got workspace:^`).sort())
  })

  it.each(['', 'null', '{}', 'packages: []', 'packages: [false]', 'packages: [""]', 'packages: wrong'])(
    'rejects an invalid workspace declaration: %s', (contents) => {
      const root = mkdtempSync(join(tmpdir(), 'alego-workspace-ranges-'))
      onTestFinished(() => { rmSync(root, { recursive: true, force: true }) })
      writeFileSync(join(root, 'pnpm-workspace.yaml'), contents)
      expect(() => readWorkspaceManifests(root)).toThrow('packages must be a non-empty list of workspace patterns')
    },
  )

  it('rejects a declaration that matches no workspace members', () => {
    const root = mkdtempSync(join(tmpdir(), 'alego-workspace-ranges-'))
    onTestFinished(() => { rmSync(root, { recursive: true, force: true }) })
    writeFileSync(join(root, 'pnpm-workspace.yaml'), 'packages: [missing/*]')
    expect(() => readWorkspaceManifests(root)).toThrow('packages matched no workspace manifests')
  })
})

describe('experimental workspace constraints', () => {
  it('requires the experimental package-name prefix', () => {
    expect(checkExperimentalManifest({
      ...experimental,
      manifest: { ...experimental.manifest, name: '@singula-ai/alego-prototype' },
    })).toEqual([
      '@singula-ai/alego-prototype: experimental package name must start with "@singula-ai/alego-experimental-"',
    ])
  })

  it('requires public metadata for unlisted experimental packages', () => {
    expect(checkExperimentalManifest(experimental)).toEqual([])
    expect(checkExperimentalManifest({
      ...experimental,
      manifest: { name: experimental.manifest.name, private: true },
    })).toEqual([
      '@singula-ai/alego-experimental-prototype: public experimental package must not set "private": true',
      '@singula-ai/alego-experimental-prototype: public experimental package must set publishConfig.access to "public"',
    ])
  })

  it('requires private metadata for an explicitly excluded prototype', () => {
    const { dir, manifest: { name } } = experimental
    const privateDirectories = [dir]
    expect(isPublicExperimentalPackageDirectory(dir, privateDirectories)).toBe(false)
    expect(checkExperimentalManifest({ dir, manifest: { name, private: true } }, privateDirectories)).toEqual([])
    expect(checkExperimentalManifest(experimental, privateDirectories)).toEqual([
      `${name}: experimental package must set "private": true`,
      `${name}: experimental package must omit publishConfig`,
    ])
  })

  it('keeps the current experimental publication set unrestricted', () => {
    expect(PRIVATE_EXPERIMENTAL_PACKAGE_DIRECTORIES).toEqual([])
  })

  it('limits the public default to experimental package directories', () => {
    expect(isPublicExperimentalPackageDirectory(experimental.dir)).toBe(true)
    for (const dir of [
      'packages/core/session',
      'apps/cli',
      'vendor/cordis',
      'packages/experimental',
      'packages/experimental/prototype/src',
      ...PRIVATE_EXPERIMENTAL_PACKAGE_DIRECTORIES,
    ]) {
      expect(isPublicExperimentalPackageDirectory(dir)).toBe(false)
    }
  })

  it.each(['dependencies', 'optionalDependencies', 'peerDependencies'] as const)(
    'rejects release %s on an experimental package',
    (section) => {
      expect(checkExperimentalDependencyIsolation([experimental, {
        dir: 'packages/core/consumer',
        manifest: {
          name: '@singula-ai/alego-consumer',
          [section]: { '@singula-ai/alego-experimental-prototype': 'workspace:^' },
        },
      }])).toEqual([
        `@singula-ai/alego-consumer: ${section}.@singula-ai/alego-experimental-prototype must not reference an experimental package`,
      ])
    },
  )

  it('allows the alego installation to ship the optional bundles the launcher names, and nothing else experimental', () => {
    const listed = { '@singula-ai/alego-experimental-prototype': 'workspace:^' }
    const installation = { dir: 'apps/cli', manifest: { name: '@singula-ai/alego', dependencies: listed } } satisfies WorkspaceManifest
    expect(checkExperimentalDependencyIsolation([experimental, installation], ['@singula-ai/alego-experimental-prototype'])).toEqual([])
    expect(checkExperimentalDependencyIsolation([experimental, installation], [])).toEqual([
      '@singula-ai/alego: dependencies.@singula-ai/alego-experimental-prototype must not reference an experimental package',
    ])
    // Only a plain dependency edge is offered; a peer would make the bundle a requirement of every consumer.
    expect(checkExperimentalDependencyIsolation([experimental, {
      dir: 'apps/cli',
      manifest: { name: '@singula-ai/alego', peerDependencies: listed },
    }], ['@singula-ai/alego-experimental-prototype'])).toEqual([
      '@singula-ai/alego: peerDependencies.@singula-ai/alego-experimental-prototype must not reference an experimental package',
    ])
  })

  it('allows development and experimental consumers but rejects the Python release runtime', () => {
    const manifests: WorkspaceManifest[] = [experimental, {
      dir: 'packages/core/test-only',
      manifest: {
        name: '@singula-ai/alego-test-only',
        devDependencies: { '@singula-ai/alego-experimental-prototype': 'workspace:^' },
      },
    }, {
      dir: 'packages/experimental/consumer',
      manifest: {
        name: '@singula-ai/alego-experimental-consumer',
        dependencies: { '@singula-ai/alego-experimental-prototype': 'workspace:^' },
      },
    }, {
      dir: 'python/sdk-runtime',
      manifest: {
        name: '@singula-ai/alego-python-runtime',
        dependencies: { '@singula-ai/alego-experimental-prototype': 'workspace:^' },
      },
    }]

    expect(checkExperimentalDependencyIsolation(manifests)).toEqual([
      '@singula-ai/alego-python-runtime: dependencies.@singula-ai/alego-experimental-prototype must not reference an experimental package',
    ])
  })
})

describe('alego family version coherence', () => {
  it('rejects a package carrying a stale shared version', () => {
    expect(checkAlegoFamilyVersion(
      { name: '@singula-ai/alego-http-proxy', version: '0.1.2-alpha.5' },
      '0.1.2-rc.1',
    )).toBe('@singula-ai/alego-http-proxy: package.json version must match root version 0.1.2-rc.1')
  })

  it('rejects the root-named CLI app on a stale shared version', () => {
    expect(checkAlegoFamilyVersion(
      { name: '@singula-ai/alego', version: '0.1.2-alpha.5' },
      '0.1.2-rc.1',
    )).toBe('@singula-ai/alego: package.json version must match root version 0.1.2-rc.1')
  })

  it('accepts a manifest carrying the shared version', () => {
    expect(checkAlegoFamilyVersion(
      { name: '@singula-ai/alego-http-proxy', version: '0.1.2-rc.1' },
      '0.1.2-rc.1',
    )).toBeUndefined()
  })

  it('leaves other sequences to their own version lines', () => {
    expect(checkAlegoFamilyVersion({ name: '@singula-ai/cordis', version: '4.0.1' }, '0.1.2-rc.1')).toBeUndefined()
    expect(checkAlegoFamilyVersion(
      { name: '@singula-ai/node-addon-system', version: '0.1.1' },
      '0.1.2-rc.1',
    )).toBeUndefined()
    expect(checkAlegoFamilyVersion({ version: '0.1.2-alpha.5' }, '0.1.2-rc.1')).toBeUndefined()
  })
})

describe('package payload constraints', () => {
  it.each(['./art/icon.svg', 'art/icon.svg'])('includes declared icon %s in the canonical payload', (icon) => {
    expect(expectedAlegoPackageFiles({ icon, exports: { './locale/*.json': './locale/*.json' } })).toEqual([
      'art/icon.svg', 'locale/*.json', 'lib/index.js', 'lib/types/**/*.d.ts',
    ])
  })

  it('accepts the Agent Team icon payload and rejects its omission', () => {
    const dir = 'packages/experimental/agent-team-profile'
    const manifest = JSON.parse(readFileSync(new URL(`../${dir}/package.json`, import.meta.url), 'utf8')) as WorkspaceManifest['manifest']
    expect(checkWorkspaceManifest({ dir, manifest })).toEqual([])
    expect(checkWorkspaceManifest({ dir, manifest: { ...manifest, files: manifest.files!.filter(file => file !== 'icon.svg') } }))
      .toEqual([expect.stringContaining('package.json files must be')])
  })

  it.each([
    { exports: { './locale/*.json': './locale/*.json' }, resources: ['locale/*.json'] },
    { exports: { './search/locale/*.json': './resources/search/*.json' }, resources: ['resources/search/*.json'] },
    { exports: { './locale/en.json': './locale/en.json', './locale/zh.json': './locale/zh.json' }, resources: ['locale/en.json', 'locale/zh.json'] },
    { exports: { './locale/*.json': { default: './locale/*.json' } }, resources: ['locale/*.json'] },
    { exports: { './locale/*.json': './locale/*.json', './search/locale/*.json': './locale/*.json' }, resources: ['locale/*.json'] },
    { exports: { './search/locale/*.json': './z/*.json', './locale/*.json': './a/*.json' }, resources: ['a/*.json', 'z/*.json'] },
  ])('includes declared locale resources in the canonical payload: $exports', ({ exports, resources }) => {
    expect(expectedAlegoPackageFiles({ name: '@singula-ai/alego-localized', exports })).toEqual([
      ...resources, 'lib/index.js', 'lib/types/**/*.d.ts',
    ])
  })

  it('does not infer locale payloads from unrelated or non-JSON exports', () => {
    expect(expectedAlegoPackageFiles({
      exports: {
        './config.json': './config.json',
        './locale/README.md': './locale/README.md',
        './locale/en.json': './metadata.js',
        './locale/zh.json': null,
        './locale/fr.json': { types: './locale/fr.d.ts' },
      },
    })).toEqual(['lib/index.js', 'lib/types/**/*.d.ts'])
  })

  it.each(['agent-team', 'agent-team-profile', 'auto-review', 'client-ui-agent-team', 'tool-agent-team'])(
    'accepts the published locale files for %s and rejects their omission', (name) => {
      const dir = `packages/experimental/${name}`
      const manifest = JSON.parse(readFileSync(new URL(`../${dir}/package.json`, import.meta.url), 'utf8')) as WorkspaceManifest['manifest']
      expect(checkWorkspaceManifest({ dir, manifest })).toEqual([])
      expect(checkWorkspaceManifest({ dir, manifest: {
        ...manifest, files: manifest.files!.filter(file => file !== 'locale/*.json'),
      } })).toEqual([expect.stringContaining('package.json files must be')])
    },
  )

  it('rejects locale publication entries without their resource exports', () => {
    const dir = 'packages/experimental/auto-review'
    const manifest = JSON.parse(readFileSync(new URL(`../${dir}/package.json`, import.meta.url), 'utf8')) as WorkspaceManifest['manifest']
    const exports = { ...manifest.exports }
    delete exports['./locale/*.json']
    expect(checkWorkspaceManifest({ dir, manifest: { ...manifest, exports } }))
      .toEqual([expect.stringContaining('package.json files must be')])
  })

  it('includes a declared profile patch without a package-name allowlist', () => {
    expect(expectedAlegoPackageFiles({
      name: '@singula-ai/alego-private-profile',
      alego: { bundle: { patch: './cordis.patch.yml' } },
    })).toEqual([
      'lib/index.js',
      'cordis.patch.yml',
      'lib/types/**/*.d.ts',
    ])
    expect(expectedAlegoPackageFiles({
      name: '@singula-ai/alego-private-profile',
      alego: { bundle: { patch: ['./cordis.patch.yml', './layers/web.patch.yml'] } },
    })).toEqual([
      'lib/index.js',
      'cordis.patch.yml',
      'layers/web.patch.yml',
      'lib/types/**/*.d.ts',
    ])
  })

  it.each([
    'packages/client/ui-sidebar-documentpreview',
    'packages/client/ui-sidebar-terminal',
  ])('accepts package-local Client chunks from %s', (dir) => {
    const manifest = JSON.parse(readFileSync(new URL(`../${dir}/package.json`, import.meta.url), 'utf8')) as WorkspaceManifest['manifest']
    expect(checkWorkspaceManifest({ dir, manifest })).toEqual([])
  })
})

it('publishes CLI runtime declarations and rejects a payload that omits them', () => {
  const manifest = JSON.parse(readFileSync(new URL('../apps/cli/package.json', import.meta.url), 'utf8')) as WorkspaceManifest['manifest']
  expect(checkWorkspaceManifest({ dir: 'apps/cli', manifest })).toEqual([])
  expect(checkWorkspaceManifest({ dir: 'apps/cli', manifest: { ...manifest, files: ['lib/*.js'] } }))
    .toEqual([expect.stringContaining('@singula-ai/alego: package.json files must be ["lib/*.js","lib/types/*.d.ts"]')])
})

it('requires the shared Web injection entry in the published payload', () => {
  const manifest = JSON.parse(readFileSync(new URL('../packages/client/web/package.json', import.meta.url), 'utf8')) as WorkspaceManifest['manifest']
  expect(checkWorkspaceManifest({ dir: 'packages/client/web', manifest })).toEqual([])
  expect(checkWorkspaceManifest({ dir: 'packages/client/web', manifest: {
    ...manifest, files: ['lib/index.js', 'lib/**/*.css', 'lib/types/**/*.d.ts'],
  } })).toEqual([expect.stringContaining('package.json files must be')])
})

it('requires Office skill bodies and helpers in the published payload', () => {
  const manifest = JSON.parse(readFileSync(new URL('../packages/skill/skill-office/package.json', import.meta.url), 'utf8')) as WorkspaceManifest['manifest']
  expect(checkWorkspaceManifest({ dir: 'packages/skill/skill-office', manifest })).toEqual([])
  expect(checkWorkspaceManifest({ dir: 'packages/skill/skill-office', manifest: {
    ...manifest, files: ['lib/index.js', 'lib/types/**/*.d.ts'],
  } })).toEqual([expect.stringContaining('package.json files must be')])
})

it('requires the local speech worker and locked runtime in the published payload', () => {
  const dir = 'packages/experimental/speech-to-text-sensevoice'
  const manifest = JSON.parse(readFileSync(new URL(`../${dir}/package.json`, import.meta.url), 'utf8')) as WorkspaceManifest['manifest']
  expect(checkWorkspaceManifest({ dir, manifest })).toEqual([])
  for (const omitted of ['lib/worker.js', 'runtime/assets.json']) {
    expect(checkWorkspaceManifest({ dir, manifest: { ...manifest, files: manifest.files!.filter(file => file !== omitted) } }))
      .toEqual([expect.stringContaining('package.json files must be')])
  }
})

it('requires the standalone shortcut protocol and rejects unrelated runtime files', () => {
  const dir = 'packages/client/shortcuts'
  const manifest = JSON.parse(readFileSync(new URL(`../${dir}/package.json`, import.meta.url), 'utf8')) as WorkspaceManifest['manifest']
  expect(checkWorkspaceManifest({ dir, manifest })).toEqual([])
  for (const files of [
    ['lib/index.js', 'lib/client.js', 'lib/types/**/*.d.ts'],
    ['lib/index.js', 'lib/client.js', 'lib/protocol.js', 'lib/extra.js', 'lib/types/**/*.d.ts'],
  ]) {
    expect(checkWorkspaceManifest({ dir, manifest: { ...manifest, files } }))
      .toEqual([expect.stringContaining('package.json files must be')])
  }
})
