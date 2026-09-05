/** Experimental-package publication and dependency constraints. */

import { describe, expect, it } from 'vitest'
import {
  checkAlegoFamilyVersion,
  checkExperimentalDependencyIsolation,
  checkExperimentalManifest,
  expectedAlegoPackageFiles,
  type WorkspaceManifest,
} from './check-workspace-constraints.ts'

const experimental: WorkspaceManifest = {
  dir: 'packages/experimental/prototype',
  manifest: { name: '@singula-ai/alego-experimental-prototype', private: true },
}

describe('experimental workspace constraints', () => {
  it('requires the experimental package-name prefix', () => {
    expect(checkExperimentalManifest({
      ...experimental,
      manifest: { ...experimental.manifest, name: '@singula-ai/alego-prototype' },
    })).toEqual([
      '@singula-ai/alego-prototype: experimental package name must start with "@singula-ai/alego-experimental-"',
    ])
  })

  it('requires private manifests without publication metadata', () => {
    expect(checkExperimentalManifest(experimental)).toEqual([])
    expect(checkExperimentalManifest({
      ...experimental,
      manifest: { ...experimental.manifest, private: false, publishConfig: { access: 'public' } },
    })).toEqual([
      '@singula-ai/alego-experimental-prototype: experimental package must set "private": true',
      '@singula-ai/alego-experimental-prototype: experimental package must omit publishConfig',
    ])
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
      { name: '@singula-ai/node-addon-landlock-run', version: '0.1.1' },
      '0.1.2-rc.1',
    )).toBeUndefined()
    expect(checkAlegoFamilyVersion({ version: '0.1.2-alpha.5' }, '0.1.2-rc.1')).toBeUndefined()
  })
})

describe('package payload constraints', () => {
  it('includes a declared profile patch without a package-name allowlist', () => {
    expect(expectedAlegoPackageFiles({
      name: '@singula-ai/alego-private-profile',
      alego: { bundle: { patch: './cordis.patch.yml' } },
    })).toEqual([
      'lib/index.js',
      'cordis.patch.yml',
      'lib/types/**/*.d.ts',
    ])
  })
})
