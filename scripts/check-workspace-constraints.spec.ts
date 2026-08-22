/** Experimental-package publication and dependency constraints. */

import { describe, expect, it } from 'vitest'
import {
  checkExperimentalDependencyIsolation,
  checkExperimentalManifest,
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
