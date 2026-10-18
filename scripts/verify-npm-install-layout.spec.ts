import { describe, expect, it } from 'vitest'
import type { NpmPackageLock, RegistryIndex } from './benchmark-npm-resolution.ts'
import {
  assertDualAlegoInstallLayout,
  assertResolutionWorkBudget,
  buildDualAlegoRegistry,
  MAX_RESOLUTION_WORK_UNITS,
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

  it.each([
    ['react', 'node_modules/react'],
    ['react-dom', 'node_modules/react-dom'],
    ['react', 'node_modules/alego-previous/node_modules/react'],
    ['react-dom', 'node_modules/alego-previous/node_modules/react-dom'],
  ])('rejects browser runtime %s installed at %s in the ALEGO-only consumer', (name, path) => {
    const layout = validLayout()
    const packages = { ...layout.packages, [path]: { version: '18.3.1' } }
    expect(() => assertDualAlegoInstallLayout({ ...layout, packages })).toThrow(
      `${path}: ${name} is a browser build input`,
    )
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

describe('resolution work budget', () => {
  it('accepts the measured dual-release graph', () => {
    expect(assertResolutionWorkBudget({ alegoPackagesPerVersion: 277, checkedAlegoEdges: 2524 }))
      .toBe(699_148)
  })

  it('accepts a graph exactly at the budget and rejects one internal edge above it', () => {
    const packages = 350
    const edgesAtBudget = Math.floor(MAX_RESOLUTION_WORK_UNITS / packages)

    expect(packages * edgesAtBudget).toBe(MAX_RESOLUTION_WORK_UNITS)
    expect(assertResolutionWorkBudget({ alegoPackagesPerVersion: packages, checkedAlegoEdges: edgesAtBudget }))
      .toBe(MAX_RESOLUTION_WORK_UNITS)
    expect(() => assertResolutionWorkBudget({
      alegoPackagesPerVersion: packages,
      checkedAlegoEdges: edgesAtBudget + 1,
    })).toThrow(`= ${String(MAX_RESOLUTION_WORK_UNITS + packages)} unit(s), budget ${String(MAX_RESOLUTION_WORK_UNITS)} unit(s)`)
  })

  it('accepts the headroom and rejects a runaway graph with its own measured counts', () => {
    expect(assertResolutionWorkBudget({ alegoPackagesPerVersion: 300, checkedAlegoEdges: 2800 }))
      .toBe(840_000)
    expect(() => assertResolutionWorkBudget({ alegoPackagesPerVersion: 400, checkedAlegoEdges: 3000 }))
      .toThrow('400 package(s) per release x 3000 internal edge(s) = 1200000 unit(s), budget 875000 unit(s)')
  })
})
