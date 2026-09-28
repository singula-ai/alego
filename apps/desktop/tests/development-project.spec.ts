import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { prepareDevelopmentProject } from '../scripts/development-project.ts'
import { DESKTOP_HOST_PROTOCOL_VERSION } from '../src/host-protocol.ts'
import { DesktopProjectManager } from '../src/project-manager.ts'
import { resolveDesktopPaths } from '../src/paths.ts'
import type { DesktopRelease } from '../src/release.ts'

const roots: string[] = []

function temporaryRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'alego-desktop-development-test-'))
  roots.push(root)
  return root
}

function release(version = '1.2.3'): DesktopRelease {
  return {
    schemaVersion: 1,
    version,
    hostProtocolVersion: DESKTOP_HOST_PROTOCOL_VERSION,
    nodeVersion: '24.17.0',
    pnpmVersion: '11.7.0',
  }
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

describe('desktop development project', () => {
  it('includes declared workspace packages missing from the hoist directory in the runtime inventory', () => {
    const root = temporaryRoot()
    const cli = join(root, 'cli')
    const host = join(root, 'host')
    const dependency = join(root, 'unhoisted')
    const hoisted = join(root, 'hoisted')
    mkdirSync(join(cli, 'node_modules'), { recursive: true })
    mkdirSync(join(host, 'lib'), { recursive: true })
    mkdirSync(dependency)
    mkdirSync(hoisted)
    writeFileSync(join(cli, 'package.json'), JSON.stringify({ name: '@singula-ai/alego', version: '1.2.3', dependencies: { unhoisted: 'workspace:^' } }))
    writeFileSync(join(host, 'package.json'), JSON.stringify({ name: '@singula-ai/alego-desktop-host', version: '1.2.3' }))
    writeFileSync(join(host, 'lib/index.js'), '')
    writeFileSync(join(dependency, 'package.json'), JSON.stringify({ name: 'unhoisted', version: '1.2.3' }))
    symlinkSync(dependency, join(cli, 'node_modules/unhoisted'), process.platform === 'win32' ? 'junction' : 'dir')
    const project = prepareDevelopmentProject({ projectDir: join(root, 'runtime'), cliDir: cli, hostDir: host, dependencyDir: hoisted, release: release(), target: 'mac-arm64' })
    expect(realpathSync(join(project, 'node_modules/unhoisted'))).toBe(realpathSync(dependency))
    const descriptor = JSON.parse(readFileSync(join(project, 'desktop-runtime.json'), 'utf8')) as { platform: string; arch: string; sharedPackages: unknown[] }
    expect(descriptor).toMatchObject({ platform: 'darwin', arch: 'arm64' })
    expect(descriptor.sharedPackages).toContainEqual({ name: 'unhoisted', version: '1.2.3', path: 'node_modules/unhoisted' })
  })

  it('manages development plugins without modifying the linked workspace packages', async () => {
    const root = temporaryRoot()
    const cli = join(root, 'apps', 'cli')
    const host = join(root, 'apps', 'desktop-host')
    const dependencies = join(root, 'workspace-dependencies')
    mkdirSync(join(cli, 'lib'), { recursive: true })
    mkdirSync(join(host, 'lib'), { recursive: true })
    mkdirSync(join(dependencies, '@scope'), { recursive: true })
    mkdirSync(join(dependencies, '@singula-ai', 'alego'), { recursive: true })
    writeFileSync(join(cli, 'package.json'), '{"name":"@singula-ai/alego","version":"1.2.3"}\n')
    writeFileSync(join(host, 'package.json'), '{"name":"@singula-ai/alego-desktop-host","version":"1.2.3"}\n')
    writeFileSync(join(host, 'lib', 'index.js'), '')
    writeFileSync(join(dependencies, '@singula-ai', 'alego', 'package.json'), '{}\n')
    mkdirSync(join(dependencies, 'plain-dependency'))
    writeFileSync(join(dependencies, 'plain-dependency', 'package.json'), '{}\n')
    mkdirSync(join(dependencies, '@scope', 'dependency'))
    writeFileSync(join(dependencies, '@scope', 'dependency', 'package.json'), '{}\n')

    const project = prepareDevelopmentProject({
      projectDir: join(root, 'development'),
      cliDir: cli,
      hostDir: host,
      dependencyDir: dependencies,
      release: release(),
      target: 'win-x64',
    })
    expect(realpathSync(join(project, 'node_modules', '@singula-ai', 'alego'))).toBe(realpathSync(cli))
    expect(realpathSync(join(project, 'node_modules', '@singula-ai', 'alego-desktop-host'))).toBe(realpathSync(host))
    expect(realpathSync(join(project, 'node_modules', 'plain-dependency')))
      .toBe(realpathSync(join(dependencies, 'plain-dependency')))
    expect(realpathSync(join(project, 'node_modules', '@scope', 'dependency')))
      .toBe(realpathSync(join(dependencies, '@scope', 'dependency')))
    const manifest = JSON.parse(readFileSync(join(project, 'package.json'), 'utf8')) as {
      dependencies: Record<string, string>
    }
    expect(manifest.dependencies['@singula-ai/alego']).toBe('1.2.3')
    expect(manifest.dependencies['@singula-ai/alego-desktop-host']).toBe('1.2.3')
    const descriptor = JSON.parse(readFileSync(join(project, 'desktop-runtime.json'), 'utf8')) as { platform: string; arch: string }
    expect(descriptor).toMatchObject({ platform: 'win32', arch: 'x64' })
    const manager = new DesktopProjectManager(resolveDesktopPaths(join(root, 'home')), {
      alego: project,
    })
    await manager.applyRelease()
    await manager.disableAllPlugins()
    expect(readFileSync(join(cli, 'package.json'), 'utf8')).toBe('{"name":"@singula-ai/alego","version":"1.2.3"}\n')
    expect(readFileSync(join(host, 'lib', 'index.js'), 'utf8')).toBe('')

  })

  it('rejects a CLI package from another release', () => {
    const root = temporaryRoot()
    const cli = join(root, 'apps', 'cli')
    const host = join(root, 'apps', 'desktop-host')
    const dependencies = join(root, 'workspace-dependencies')
    mkdirSync(join(cli, 'lib'), { recursive: true })
    mkdirSync(join(host, 'lib'), { recursive: true })
    mkdirSync(dependencies, { recursive: true })
    writeFileSync(join(cli, 'package.json'), '{"name":"@singula-ai/alego","version":"2.0.0"}\n')
    writeFileSync(join(host, 'package.json'), '{"name":"@singula-ai/alego-desktop-host","version":"1.2.3"}\n')
    writeFileSync(join(host, 'lib', 'index.js'), '')
    expect(() => prepareDevelopmentProject({
      projectDir: join(root, 'development'),
      cliDir: cli,
      hostDir: host,
      dependencyDir: dependencies,
      release: release(),
      target: 'mac-x64',
    })).toThrow(/must be @singula-ai\/alego@1\.2\.3/u)
  })
})
