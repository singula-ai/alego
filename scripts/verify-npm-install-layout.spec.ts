import { describe, expect, it } from 'vitest'
import type { NpmPackageLock, RegistryIndex } from './benchmark-npm-resolution.ts'
import {
  assertDualAlegoInstallLayout,
  buildDualAlegoRegistry,
} from './verify-npm-install-layout.ts'

function validLayout(): NpmPackageLock {
  return {
    lockfileVersion: 3,
    packages: {
      '': { dependencies: { '@singula-ai/alego': '0.2.0', 'alego-previous': 'npm:@singula-ai/alego@0.1.0' } },
      'node_modules/@singula-ai/cordis': { version: '4.0.1' },
      'node_modules/@singula-ai/alego': {
        version: '0.2.0',
        dependencies: { '@singula-ai/alego-child': '^0.2.0' },
        peerDependencies: { '@singula-ai/cordis': '^4.0.1' },
      },
      'node_modules/@singula-ai/alego-child': {
        version: '0.2.0',
        dependencies: { '@singula-ai/alego-leaf': '^0.2.0' },
      },
      'node_modules/@singula-ai/alego-leaf': { version: '0.2.0' },
      'node_modules/alego-previous': {
        name: '@singula-ai/alego',
        version: '0.1.0',
        dependencies: { '@singula-ai/alego-child': '^0.1.0' },
        peerDependencies: { '@singula-ai/cordis': '^4.0.1' },
      },
      'node_modules/alego-previous/node_modules/@singula-ai/alego-child': {
        version: '0.1.0',
        dependencies: { '@singula-ai/alego-leaf': '^0.1.0' },
      },
      'node_modules/alego-previous/node_modules/@singula-ai/alego-leaf': { version: '0.1.0' },
    },
  }
}

describe('npm install layout verifier', () => {
  it('creates two incompatible versions of every ALEGO package', () => {
    const index: RegistryIndex = new Map([
      ['@singula-ai/alego', new Map([['0.1.1-rc.2', {
        name: '@singula-ai/alego',
        version: '0.1.1-rc.2',
        dependencies: { '@singula-ai/alego-child': '^0.1.1-rc.2' },
        peerDependencies: { '@singula-ai/cordis': '^4.0.1' },
      }]])],
      ['@singula-ai/alego-child', new Map([['0.1.1-rc.2', {
        name: '@singula-ai/alego-child',
        version: '0.1.1-rc.2',
      }]])],
      ['@singula-ai/cordis', new Map([['4.0.1', {
        name: '@singula-ai/cordis',
        version: '4.0.1',
      }]])],
    ])

    const dual = buildDualAlegoRegistry(index, '0.1.1-rc.2')

    expect([...dual.get('@singula-ai/alego')?.keys() ?? []]).toEqual(['0.1.0', '0.2.0'])
    expect(dual.get('@singula-ai/alego')?.get('0.1.0')).toMatchObject({
      version: '0.1.0',
      dependencies: { '@singula-ai/alego-child': '^0.1.0' },
      peerDependencies: { '@singula-ai/cordis': '^4.0.1' },
    })
    expect(dual.get('@singula-ai/alego')?.get('0.2.0')).toMatchObject({
      version: '0.2.0',
      dependencies: { '@singula-ai/alego-child': '^0.2.0' },
    })
    expect(dual.get('@singula-ai/cordis')).toBe(index.get('@singula-ai/cordis'))
  })

  it('accepts isolated ALEGO releases with one shared Cordis installation', () => {
    expect(assertDualAlegoInstallLayout(validLayout())).toEqual({
      alegoPackagesPerVersion: 3,
      checkedAlegoEdges: 4,
    })
  })

  it('rejects an internal edge that crosses release versions', () => {
    const layout = validLayout()
    const packages = { ...layout.packages }
    Reflect.deleteProperty(packages, 'node_modules/alego-previous/node_modules/@singula-ai/alego-leaf')

    expect(() => assertDualAlegoInstallLayout({ ...layout, packages })).toThrow(
      'node_modules/alego-previous/node_modules/@singula-ai/alego-child: dependencies '
      + '@singula-ai/alego-leaf resolves to node_modules/@singula-ai/alego-leaf@0.2.0, expected 0.1.0',
    )
  })

  it('rejects a second Cordis installation', () => {
    const layout = validLayout()
    const packages = {
      ...layout.packages,
      'node_modules/alego-previous/node_modules/@singula-ai/cordis': { version: '4.0.1' },
    }

    expect(() => assertDualAlegoInstallLayout({ ...layout, packages })).toThrow(
      'expected one shared @singula-ai/cordis',
    )
  })
})
