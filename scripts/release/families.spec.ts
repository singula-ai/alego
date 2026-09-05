/** Release family discovery, publish order, tag naming, and the bump judgements. */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { officialClientBuildEnvironment, writeClientBuildRecord } from '../client-build-environment.ts'
import { releaseFamily, type ReleaseMember } from './families.ts'
import { compareVersions, nextVendorVersion, planShared, reachesPayload } from './bump.ts'

/**
 * A release member standing in for a manifest on disk.
 * @param directory - repository-relative package directory.
 * @param name - package name.
 * @param manifest - manifest fields the subject reads.
 * @returns The member.
 */
function member(directory: string, name: string, manifest: Record<string, unknown> = {}): ReleaseMember {
  return { directory, name, version: '0.0.1', manifest }
}

const roots: string[] = []

function write(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, content)
}

function buildFixture(environment: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'alego-release-build-'))
  roots.push(root)
  write(join(root, 'package.json'), `${JSON.stringify({ version: environment.ALEGO_CLIENT_VERSION ?? '0.0.1' })}\n`)
  write(join(root, 'apps/web/dist/index.html'), '<main></main>')
  write(join(root, 'packages/client/example/lib/client.js'), 'module.exports = {}\n')
  writeClientBuildRecord(root, environment)
  return root
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
  vi.unstubAllEnvs()
})

describe('release families', () => {
  it('excludes private experimental packages from the alego release', () => {
    const members = releaseFamily('alego').members(resolve(import.meta.dirname, '../..'))

    expect(members.some(member => member.directory.startsWith('packages/experimental/'))).toBe(false)
    expect(members.map(member => member.name)).not.toContain('@singula-ai/alego-experimental-agent-team')
  })

  it('bumps private alego packages without adding release tags', () => {
    const root = mkdtempSync(join(tmpdir(), 'alego-release-version-'))
    roots.push(root)
    write(join(root, 'package.json'), '{"version":"0.0.1"}\n')
    write(join(root, 'packages/experimental/prototype/package.json'), '{"version":"0.0.1","private":true}\n')
    write(join(root, 'packages/core/unselected/package.json'), '{"version":"0.0.1"}\n')

    const alego = releaseFamily('alego')
    const published = member('packages/core/published', '@singula-ai/alego-published')
    const { planned } = planShared(alego, root, [published], '0.0.2')

    expect(planned.map(entry => ({ path: entry.manifestPath, tag: entry.tag }))).toEqual([
      { path: 'package.json', tag: undefined },
      { path: 'packages/core/published/package.json', tag: 'alego-v0.0.2' },
      { path: 'packages/experimental/prototype/package.json', tag: undefined },
    ])
  })

  it.each(['0.0.2-alpha.1', '0.0.2-canary.1', '0.0.2-rc.1'])(
    'accepts the explicit alego prerelease version %s',
    (version) => {
      const root = mkdtempSync(join(tmpdir(), 'alego-release-prerelease-'))
      roots.push(root)
      write(join(root, 'package.json'), '{"version":"0.0.1"}\n')

      const alego = releaseFamily('alego')
      const published = member('packages/core/published', '@singula-ai/alego-published')
      const plan = planShared(alego, root, [published], version)

      expect(plan.version).toBe(version)
      expect(plan.planned[1]?.tag).toBe(`alego-v${version}`)
    },
  )

  it('names one tag for the whole alego family and one per vendored package', () => {
    const alego = releaseFamily('alego')
    const vendor = releaseFamily('vendor')
    const cli = member('apps/cli', '@singula-ai/alego')
    const cordis = { ...member('vendor/cordis', '@singula-ai/cordis'), version: '4.0.1' }

    expect(alego.tagFor(cli)).toBe('alego-v0.0.1')
    expect(vendor.tagFor(cordis)).toBe('vendor-cordis-v4.0.1')
    // The prefix is constructed, not recovered from a tag: a version with a
    // hyphen would defeat any suffix-stripping.
    expect(vendor.tagPrefixFor({ ...cordis, version: '4.0.0-rc.7' })).toBe('vendor-cordis-v')
    expect(vendor.tagFor({ ...cordis, version: '4.0.0-rc.7' })).toBe('vendor-cordis-v4.0.0-rc.7')
  })

  it('assigns alpha and canary dist-tags only to alego releases', () => {
    const alego = releaseFamily('alego')
    const vendor = releaseFamily('vendor')

    expect(alego.distTagForVersion('0.0.2-alpha.1')).toBe('alpha')
    expect(alego.distTagForVersion('0.0.2-canary.1')).toBe('canary')
    expect(alego.distTagForVersion('0.0.2-rc.1')).toBe('next')
    expect(alego.distTagForVersion('0.0.2')).toBeUndefined()
    expect(vendor.distTagForVersion('4.0.1-alpha.1')).toBe('next')
    expect(vendor.distTagForVersion('4.0.1-canary.1')).toBe('next')
  })

  it('rejects a family whose members disagree on the shared version', () => {
    const alego = releaseFamily('alego')
    const members = [member('apps/cli', '@singula-ai/alego'), { ...member('apps/web', '@singula-ai/alego-web-frontend'), version: '0.0.2' }]

    expect(() => { alego.verifyVersions(members) }).toThrow(/must share one version/)
    expect(() => { alego.verifyVersions([members[0]!]) }).not.toThrow()
  })

  it('accepts independent vendored versions and rejects an unpublishable one', () => {
    const vendor = releaseFamily('vendor')
    const members = [
      { ...member('vendor/cordis', '@singula-ai/cordis'), version: '4.0.1' },
      { ...member('vendor/cosmokit', '@singula-ai/cosmokit'), version: '1.8.2' },
    ]

    expect(() => { vendor.verifyVersions(members) }).not.toThrow()
    expect(() => { vendor.verifyVersions([{ ...members[0]!, version: 'latest' }]) }).toThrow(/unpublishable version/)
  })

  it('requires a current official client build only for alego artifacts', () => {
    const alego = releaseFamily('alego')
    const vendor = releaseFamily('vendor')
    const officialEnvironment = officialClientBuildEnvironment(resolve(import.meta.dirname, '../..'))
    vi.stubEnv('ALEGO_CLIENT_COMMIT_HASH', officialEnvironment.ALEGO_CLIENT_COMMIT_HASH)
    const official = buildFixture(officialEnvironment)
    const defaultBuild = buildFixture({})
    const missing = join(defaultBuild, 'missing')
    write(join(missing, 'package.json'), `${JSON.stringify({ version: officialEnvironment.ALEGO_CLIENT_VERSION })}\n`)

    expect(() => { alego.verifyBuildArtifacts(official) }).not.toThrow()
    expect(() => { alego.verifyBuildArtifacts(defaultBuild) }).toThrow(/ALEGO_CLIENT_TITLE/)
    expect(() => { alego.verifyBuildArtifacts(missing) }).toThrow(/record.*missing/)
    expect(() => { vendor.verifyBuildArtifacts(missing) }).not.toThrow()

    write(join(official, 'packages/client/example/lib/client.js'), 'module.exports = { changed: true }\n')
    expect(() => { alego.verifyBuildArtifacts(official) }).toThrow(/artifacts differ/)
  })

  it('publishes a dependency before its consumer, and orders ties by name', () => {
    const alego = releaseFamily('alego')
    const members = [
      member('packages/a/consumer', '@singula-ai/alego-consumer', { dependencies: { '@singula-ai/alego-library': 'workspace:^' } }),
      member('packages/a/library', '@singula-ai/alego-library'),
      member('packages/a/zebra', '@singula-ai/alego-zebra'),
    ]

    expect(alego.publishOrder(members).order.map(entry => entry.name)).toEqual([
      '@singula-ai/alego-library',
      '@singula-ai/alego-consumer',
      '@singula-ai/alego-zebra',
    ])
  })

  it('reports a runtime dependency cycle instead of emitting an arbitrary order', () => {
    const alego = releaseFamily('alego')
    const members = [
      member('packages/a/left', '@singula-ai/alego-left', { dependencies: { '@singula-ai/alego-right': 'workspace:^' } }),
      member('packages/a/right', '@singula-ai/alego-right', { dependencies: { '@singula-ai/alego-left': 'workspace:^' } }),
    ]

    expect(() => { alego.publishOrder(members) }).toThrow(/dependency cycle/)
  })

  it('publishes a peer before its consumer', () => {
    const alego = releaseFamily('alego')
    const members = [
      member('packages/a/consumer', '@singula-ai/alego-consumer', { peerDependencies: { '@singula-ai/alego-zebra': 'workspace:^' } }),
      member('packages/a/zebra', '@singula-ai/alego-zebra'),
    ]

    // Name order alone would place the consumer first; the peer edge moves it.
    expect(alego.publishOrder(members).order.map(entry => entry.name)).toEqual([
      '@singula-ai/alego-zebra',
      '@singula-ai/alego-consumer',
    ])
  })

  it('orders around a peer cycle rather than refusing to publish, and reports the edge it dropped', () => {
    const alego = releaseFamily('alego')
    const members = [
      member('packages/a/left', '@singula-ai/alego-left', { peerDependencies: { '@singula-ai/alego-right': 'workspace:^' } }),
      member('packages/a/right', '@singula-ai/alego-right', { peerDependencies: { '@singula-ai/alego-left': 'workspace:^' } }),
    ]

    // Sibling packages declare each other as peers, and npm treats an unmet peer
    // as a warning, so this pair has to publish rather than fail the release.
    const plan = alego.publishOrder(members)
    expect(plan.order.map(entry => entry.name)).toEqual([
      '@singula-ai/alego-right',
      '@singula-ai/alego-left',
    ])
    // One of the two edges has to give, and which one it is belongs in the log.
    expect(plan.droppedPeerEdges).toEqual([
      { consumer: '@singula-ai/alego-right', peer: '@singula-ai/alego-left' },
    ])
  })

  it('honours an install edge even when a peer cycle surrounds it', () => {
    const alego = releaseFamily('alego')
    const members = [
      member('packages/a/base', '@singula-ai/alego-base', { peerDependencies: { '@singula-ai/alego-consumer': 'workspace:^' } }),
      member('packages/a/consumer', '@singula-ai/alego-consumer', {
        dependencies: { '@singula-ai/alego-base': 'workspace:^' },
        peerDependencies: { '@singula-ai/alego-base': 'workspace:^' },
      }),
    ]

    // The install edge is absolute: base publishes first, and the peer edge that
    // would reverse it is the one dropped.
    const plan = alego.publishOrder(members)
    expect(plan.order.map(entry => entry.name)).toEqual([
      '@singula-ai/alego-base',
      '@singula-ai/alego-consumer',
    ])
    expect(plan.droppedPeerEdges).toEqual([
      { consumer: '@singula-ai/alego-base', peer: '@singula-ai/alego-consumer' },
    ])
  })

  it('refuses an order that would publish a consumer before a dependency it installs', () => {
    const alego = releaseFamily('alego')
    const members = [
      member('packages/a/alpha', '@singula-ai/alego-alpha', { peerDependencies: { '@singula-ai/alego-bravo': 'workspace:^' } }),
      member('packages/a/bravo', '@singula-ai/alego-bravo', { peerDependencies: { '@singula-ai/alego-charlie': 'workspace:^' } }),
      member('packages/a/charlie', '@singula-ai/alego-charlie', { dependencies: { '@singula-ai/alego-alpha': 'workspace:^' } }),
    ]

    // A cycle of two peer edges closed by one install edge: dropping a peer edge
    // would order this, and the traversal drops the install edge instead. That
    // order would publish charlie before the alpha it installs, so it is refused
    // here rather than published.
    expect(() => { alego.publishOrder(members) }).toThrow(/no publish order honours @singula-ai\/alego-charlie -> @singula-ai\/alego-alpha/)
  })

  it('ignores devDependencies when ordering', () => {
    const alego = releaseFamily('alego')
    const members = [
      member('packages/a/alpha', '@singula-ai/alego-alpha', { devDependencies: { '@singula-ai/alego-zebra': 'workspace:^' } }),
      member('packages/a/zebra', '@singula-ai/alego-zebra'),
    ]

    // A dev dependency is absent from the published package, so it must not move
    // the consumer behind it.
    expect(alego.publishOrder(members).order.map(entry => entry.name)).toEqual([
      '@singula-ai/alego-alpha',
      '@singula-ai/alego-zebra',
    ])
  })

  it('applies the harness payload policy to alego and keeps upstream payloads for vendored packages', () => {
    const alego = releaseFamily('alego')
    const vendor = releaseFamily('vendor')
    const harness = member('packages/a/library', '@singula-ai/alego-library')
    const vendored = member('vendor/cordis', '@singula-ai/cordis')

    expect(() => { alego.validatePayload(harness, ['package/lib/index.js', 'package/src/index.ts']) })
      .toThrow(/publishes source file/)
    expect(() => { vendor.validatePayload(vendored, ['package/lib/index.js', 'package/src/index.ts']) }).not.toThrow()
    expect(() => { vendor.validatePayload(vendored, []) }).toThrow(/empty tarball/)
  })

  it('drives the installed entry only for the family that publishes one', () => {
    expect(releaseFamily('alego').installedEntry).toEqual({ packageName: '@singula-ai/alego', binPath: 'lib/bin.js' })
    expect(releaseFamily('vendor').installedEntry).toBeUndefined()
  })

  it('rejects an unknown family identifier', () => {
    expect(() => { releaseFamily('native') }).toThrow(/unknown release family/)
  })
})

describe('vendored version baseline', () => {
  it('drops an upstream prerelease segment and increments the patch', () => {
    expect(nextVendorVersion('4.0.0-rc.7', undefined)).toBe('4.0.1')
    expect(nextVendorVersion('1.0.0-rc.5', undefined)).toBe('1.0.1')
    expect(nextVendorVersion('1.8.1', undefined)).toBe('1.8.2')
  })

  it('increments from the last published version when a re-sync restored a lower one', () => {
    // Upstream moved rc.7 -> rc.8 after this repository published 4.0.1;
    // incrementing the manifest alone would name 4.0.1 a second time.
    expect(nextVendorVersion('4.0.0-rc.8', '4.0.1')).toBe('4.0.2')
    expect(nextVendorVersion('4.1.0', '4.0.1')).toBe('4.1.1')
  })

  it('appends a rehearsal prerelease without consuming its release numbers', () => {
    // A rehearsal burns 4.0.1-rc.1 and leaves 4.0.1 free, so the stable release
    // that follows takes those same numbers instead of skipping to 4.0.2.
    expect(nextVendorVersion('4.0.0-rc.7', undefined, 'rc.1')).toBe('4.0.1-rc.1')
    expect(nextVendorVersion('4.0.0-rc.7', '4.0.1-rc.1', 'rc.2')).toBe('4.0.1-rc.2')
    expect(nextVendorVersion('4.0.0-rc.7', '4.0.1-rc.1')).toBe('4.0.1')
    expect(nextVendorVersion('4.0.0-rc.7', '4.0.1')).toBe('4.0.2')
  })
})

describe('version precedence', () => {
  it('orders alpha, canary, and release-candidate versions by semver precedence', () => {
    expect(compareVersions('4.0.1-alpha.1', '4.0.1-canary.1')).toBeLessThan(0)
    expect(compareVersions('4.0.1-canary.1', '4.0.1-rc.1')).toBeLessThan(0)
    expect(compareVersions('4.0.1-rc.1', '4.0.1')).toBeLessThan(0)
  })

  it('ranks a release above the prerelease it follows', () => {
    // git --sort=v:refname disagrees, placing 4.0.1-rc.1 above 4.0.1, which is
    // why the newest published version is chosen here rather than by git.
    expect(compareVersions('4.0.1', '4.0.1-rc.1')).toBeGreaterThan(0)
    expect(compareVersions('4.0.1-rc.1', '4.0.1')).toBeLessThan(0)
  })

  it('compares numeric prerelease fields numerically', () => {
    expect(compareVersions('4.0.1-rc.10', '4.0.1-rc.1')).toBeGreaterThan(0)
    expect(compareVersions('4.0.1-rc.2', '4.0.1-rc.10')).toBeLessThan(0)
  })

  it('ranks a numeric field below an alphanumeric one, and a shorter list below a longer', () => {
    expect(compareVersions('4.0.1-1', '4.0.1-alpha')).toBeLessThan(0)
    expect(compareVersions('4.0.1-rc', '4.0.1-rc.1')).toBeLessThan(0)
    expect(compareVersions('4.0.2', '4.0.1')).toBeGreaterThan(0)
    expect(compareVersions('4.0.1-rc.1', '4.0.1-rc.1')).toBe(0)
  })
})

describe('payload change judgement', () => {
  const sourceShipping = member('vendor/cosmokit', '@singula-ai/cosmokit', {
    files: ['lib/index.js', 'lib/types/**/*.d.ts', 'src'],
  })
  const buildOutputOnly = member('vendor/cordis', '@singula-ai/cordis', {
    files: ['lib/index.js', 'lib/types/**/*.d.ts', 'bin.js'],
  })

  it('counts the manifest and the files npm always publishes', () => {
    expect(reachesPayload(sourceShipping, 'vendor/cosmokit/package.json')).toBe(true)
    expect(reachesPayload(sourceShipping, 'vendor/cosmokit/README.md')).toBe(true)
    expect(reachesPayload(sourceShipping, 'vendor/cosmokit/src/index.ts')).toBe(true)
  })

  it('counts build inputs for a package whose payload is build output', () => {
    // cordis publishes lib/ only, and lib/ is not tracked: without this, a real
    // source change reads as "nothing changed" and the next publish fails on a
    // version whose bytes moved.
    expect(reachesPayload(buildOutputOnly, 'vendor/cordis/src/context.ts')).toBe(true)
    expect(reachesPayload(buildOutputOnly, 'vendor/cordis/tsconfig.json')).toBe(true)
  })

  it('ignores paths no tarball carries', () => {
    expect(reachesPayload(sourceShipping, 'vendor/cosmokit/tests/unit.spec.ts')).toBe(false)
    expect(reachesPayload(sourceShipping, 'vendor/cosmokit/CHANGELOG.md')).toBe(false)
    // The README pattern is deliberately loose: over-reporting a change costs one
    // unnecessary patch bump, while under-reporting fails the next publish on a
    // version whose bytes moved.
    expect(reachesPayload(sourceShipping, 'vendor/cosmokit/README.i18n.yaml')).toBe(true)
    expect(reachesPayload(member('packages/a/library', '@singula-ai/alego-library', { files: ['lib/index.js'] }),
      'packages/a/library/tests/library.spec.ts')).toBe(false)
  })
})
