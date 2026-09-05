import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  PACKAGE_DEPENDENCY_POLICY,
  type PackageDependencyPolicy,
} from './package-dependency-policy.ts'
import {
  collectHostDependencyExportPolicyViolations,
  collectPackageDependencyViolations,
  collectRuntimeSourceExportUses,
  discoverPackageDependencyScope,
  fixPackageDependencies,
  formatManagedRuntimeDependencies,
  formatPeerRequiredRuntimeDependencies,
  readPackageDependencyFacts,
  repairPackageDependencyManifest,
  type PackageDependencyFacts,
  type PackageDependencyManifest,
  type WorkspacePackageManifest,
} from './verify-package-dependencies.ts'

const CORDIS = '@singula-ai/cordis'
const roots: string[] = []

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

function pkg(
  name: string,
  manifestPath: string,
  manifest: Partial<PackageDependencyManifest> = {},
): WorkspacePackageManifest {
  return {
    name,
    manifestPath,
    dir: dirname(manifestPath),
    manifest: { name, ...manifest },
  }
}

function policy(fields: Partial<PackageDependencyPolicy> = {}): PackageDependencyPolicy {
  return {
    clientFaceInclude: [],
    clientFaceExclude: [],
    hostPackages: [],
    configurationOnlyDevDependencies: {},
    safeHostDependencyExports: {},
    peerRequiredHostExports: {},
    ...fields,
  }
}

function facts(manifest: PackageDependencyManifest): PackageDependencyFacts {
  return {
    manifestPath: 'packages/core/probe/package.json',
    role: 'configured-host',
    manifest,
    workspaceNames: new Set([
      CORDIS,
      '@singula-ai/alego-runtime',
      '@singula-ai/alego-types',
      '@singula-ai/alego-stale',
      '@singula-ai/schemastery',
    ]),
    allSourceUses: new Map([
      ['@singula-ai/alego-runtime', ['packages/core/probe/src/index.ts']],
      ['@singula-ai/alego-types', ['packages/core/probe/src/types.ts']],
    ]),
    hostRuntimeSourceUses: new Map([
      ['@singula-ai/alego-runtime', ['packages/core/probe/src/index.ts']],
    ]),
    hostRuntimeExportUses: [{
      packageName: '@singula-ai/alego-runtime',
      specifier: '@singula-ai/alego-runtime',
      exportName: 'runtimeValue',
      sourcePath: 'packages/core/probe/src/index.ts',
      line: 1,
      column: 10,
      sourceLine: "import { runtimeValue } from '@singula-ai/alego-runtime'",
    }],
    peerRequiredHostDependencies: new Set(),
    configurationOnlyDevDependencies: new Set(),
    clientInject: new Set(),
  }
}

function hostRuntimeFixture(): {
  provider: WorkspacePackageManifest
  workspaceNames: Set<string>
  consumerFacts: PackageDependencyFacts
} {
  const consumer = pkg('@f/consumer', 'packages/core/consumer/package.json')
  const provider = pkg('@f/provider', 'packages/core/provider/package.json')
  const sourcePath = 'packages/core/consumer/src/index.ts'
  const specifier = `${provider.name}/api`
  const workspaceNames = new Set([CORDIS, consumer.name, provider.name])
  const consumerFacts: PackageDependencyFacts = {
    manifestPath: consumer.manifestPath,
    role: 'configured-host',
    manifest: consumer.manifest,
    workspaceNames,
    allSourceUses: new Map(),
    hostRuntimeSourceUses: new Map([[provider.name, [sourcePath]]]),
    hostRuntimeExportUses: [{
      packageName: provider.name,
      specifier,
      exportName: 'safeValue',
      sourcePath,
      line: 1,
      column: 10,
      sourceLine: `import { safeValue } from '${specifier}'`,
    }],
    peerRequiredHostDependencies: new Set(),
    configurationOnlyDevDependencies: new Set(),
    clientInject: new Set(),
  }
  return { provider, workspaceNames, consumerFacts }
}

describe('package dependency scope', () => {
  it('keeps the measured Host relay roster explicit', () => {
    expect(PACKAGE_DEPENDENCY_POLICY.clientFaceExclude).toEqual([
      '@singula-ai/alego-api-session-controller',
      '@singula-ai/alego-api-workspace-controller',
    ])
    expect(PACKAGE_DEPENDENCY_POLICY.hostPackages).toEqual([
      '@singula-ai/alego-llm',
      '@singula-ai/alego-session',
    ])
    expect(PACKAGE_DEPENDENCY_POLICY.configurationOnlyDevDependencies).toEqual({
      '@singula-ai/alego-client-locale': ['@singula-ai/alego-api-remotes'],
      '@singula-ai/alego-client-ui-conversation': [
        '@singula-ai/alego-api-remotes',
        '@singula-ai/alego-client-ui-workspace',
      ],
      '@singula-ai/alego-client-ui-model-selection': ['@singula-ai/alego-client-ui-input-trigger'],
      '@singula-ai/alego-client-ui-sidebar': ['@singula-ai/alego-client-ui-workspace'],
      '@singula-ai/alego-client-ui-subagent': ['@singula-ai/alego-client-ui-input-trigger'],
      '@singula-ai/alego-client-ui-theme': ['@singula-ai/alego-api-remotes'],
      '@singula-ai/alego-client-ui-tool': ['@singula-ai/alego-api-remotes'],
    })
    expect(PACKAGE_DEPENDENCY_POLICY.duplicateSafePackages).toEqual([
      '@singula-ai/alego-brand',
      '@singula-ai/alego-typert-protocol',
      '@singula-ai/alego-util-crypto',
      '@singula-ai/alego-util-values',
    ])
    expect(PACKAGE_DEPENDENCY_POLICY.safeHostDependencyExports['@singula-ai/alego-deque']).toEqual(['Deque'])
    expect(PACKAGE_DEPENDENCY_POLICY.safeHostDependencyExports['@singula-ai/schemastery']).toEqual(['default'])
    expect(PACKAGE_DEPENDENCY_POLICY.safeHostDependencyExports['@singula-ai/alego-session/types']).toBeUndefined()
    expect(PACKAGE_DEPENDENCY_POLICY.safeHostDependencyExports['@singula-ai/alego-typert-protocol']).toBeUndefined()
    expect(PACKAGE_DEPENDENCY_POLICY.peerRequiredHostExports['@singula-ai/alego-scope']).toEqual([
      'carrierKeyOf', 'scopeOf', 'scopeTarget',
    ])
    expect(PACKAGE_DEPENDENCY_POLICY.peerRequiredHostExports['@singula-ai/alego-typert-protocol']).toBeUndefined()
  })

  it('discovers the Client directory, alego.client declarations, and configured Host packages', () => {
    const packages = [
      pkg('@f/static', 'packages/client/static/package.json'),
      pkg('@f/dynamic-client', 'packages/client/dynamic/package.json', { alego: { client: {} } }),
      pkg('@f/dual', 'packages/api/dual/package.json', { alego: { client: {} } }),
      pkg('@f/export-only', 'packages/api/export-only/package.json', { exports: { './client': './lib/client.js' } }),
      pkg('@f/forced-client', 'packages/api/forced/package.json'),
      pkg('@f/excluded', 'packages/api/excluded/package.json', { alego: { client: {} } }),
      pkg('@f/host', 'packages/core/host/package.json'),
    ]

    const found = discoverPackageDependencyScope(packages, policy({
      clientFaceInclude: ['@f/forced-client'],
      clientFaceExclude: ['@f/excluded'],
      hostPackages: ['@f/host'],
    }))

    expect(found.violations).toEqual([])
    expect(found.selected.map(item => [item.name, item.role])).toEqual([
      ['@f/dual', 'client-host'],
      ['@f/forced-client', 'client-host'],
      ['@f/dynamic-client', 'client-host'],
      ['@f/static', 'client-only'],
      ['@f/host', 'configured-host'],
    ])
  })

  it('rejects stale, redundant, overlapping, and unknown configuration', () => {
    const packages = [
      pkg('@f/client', 'packages/client/client/package.json'),
      pkg('@f/dual', 'packages/api/dual/package.json', { alego: { client: {} } }),
      pkg('@f/host', 'packages/core/host/package.json'),
    ]
    const found = discoverPackageDependencyScope(packages, policy({
      clientFaceInclude: ['@f/dual', '@f/missing', '@f/host'],
      clientFaceExclude: ['@f/client', '@f/host', '@f/missing'],
      hostPackages: ['@f/dual'],
    }))

    expect(found.violations).toEqual(expect.arrayContaining([
      expect.stringContaining('clientFaceInclude redundantly names automatically discovered package @f/dual'),
      expect.stringContaining('@f/host appears in both clientFaceInclude and clientFaceExclude'),
      expect.stringContaining('clientFaceExclude cannot exempt packages/client package @f/client'),
      expect.stringContaining('clientFaceExclude names @f/host, which declares no alego.client entry'),
      expect.stringContaining('hostPackages redundantly names Client-faced package @f/dual'),
      expect.stringContaining('unknown release package @f/missing'),
    ]))
  })

  it('rejects stale, duplicate, and unbounded safe Host export entries', () => {
    const { provider, workspaceNames, consumerFacts } = hostRuntimeFixture()

    expect(collectHostDependencyExportPolicyViolations(
      [consumerFacts],
      workspaceNames,
      {
        safeHostDependencyExports: {
          [`${provider.name}/api`]: ['safeValue', 'safeValue', '*', 'staleValue'],
        },
        peerRequiredHostExports: {
          [`${provider.name}/api`]: ['safeValue'],
        },
      },
    )).toEqual(expect.arrayContaining([
      expect.stringContaining('export safeValue more than once'),
      expect.stringContaining('cannot classify unbounded'),
      expect.stringContaining('unused @f/provider/api export staleValue'),
      expect.stringContaining('appears in both Host export classifications'),
    ]))
  })

  it('applies a duplicate-safe package classification to its subpaths', () => {
    const { provider, workspaceNames, consumerFacts } = hostRuntimeFixture()

    expect(collectHostDependencyExportPolicyViolations(
      [consumerFacts],
      workspaceNames,
      {
        duplicateSafePackages: [provider.name],
        safeHostDependencyExports: {},
        peerRequiredHostExports: {},
      },
    )).toEqual([])
    expect(collectHostDependencyExportPolicyViolations(
      [consumerFacts],
      workspaceNames,
      {
        duplicateSafePackages: [provider.name],
        safeHostDependencyExports: { [`${provider.name}/api`]: ['safeValue'] },
        peerRequiredHostExports: {},
      },
    )).toContain(`safeHostDependencyExports redundantly classifies duplicate-install-safe package ${provider.name}/api`)
  })
})

describe('face-aware source classification', () => {
  it('fails when a managed Host package has no Host entry', () => {
    const root = mkdtempSync(join(tmpdir(), 'alego-package-missing-host-'))
    roots.push(root)
    const subject = pkg('@f/host', 'packages/g/host/package.json')

    expect(() => readPackageDependencyFacts(root, subject, 'configured-host', new Set([subject.name])))
      .toThrow('packages/g/host/package.json: Host runtime entry packages/g/host/src/index.ts does not exist')
  })

  it('counts Host values as dependencies and Client values as development inputs', () => {
    const root = mkdtempSync(join(tmpdir(), 'alego-package-faces-'))
    roots.push(root)
    const subject = pkg('@f/dual', 'packages/g/dual/package.json', {
      alego: { client: { inject: ['@f/injected'] } },
    })
    const files = {
      'packages/g/dual/src/index.ts': [
        "import { value } from '@f/runtime'",
        "import type { Shared } from '@f/types'",
        "import type { Hidden } from './types.ts'",
        "export { nested } from './nested.ts'",
      ].join('\n'),
      'packages/g/dual/src/nested.ts': "export { nested } from '@f/nested'",
      'packages/g/dual/src/types.ts': "import { hidden } from '@f/hidden'; export type Hidden = typeof hidden",
      'packages/g/dual/src/client/index.ts': "import { browser } from '@f/browser'",
    }
    for (const [path, source] of Object.entries(files)) {
      mkdirSync(dirname(join(root, path)), { recursive: true })
      writeFileSync(join(root, path), source)
    }
    const found = readPackageDependencyFacts(root, subject, 'client-host', new Set([
      CORDIS, '@f/runtime', '@f/types', '@f/nested', '@f/hidden', '@f/browser', '@f/injected',
    ]), policy({
      configurationOnlyDevDependencies: { '@f/dual': ['@f/injected'] },
    }))

    expect([...found.hostRuntimeSourceUses.keys()].sort()).toEqual(['@f/nested', '@f/runtime'])
    expect([...found.configurationOnlyDevDependencies]).toEqual(['@f/injected'])
    expect(found.hostRuntimeExportUses).toEqual([
      {
        packageName: '@f/nested',
        specifier: '@f/nested',
        exportName: 'nested',
        sourcePath: 'packages/g/dual/src/nested.ts',
        line: 1,
        column: 10,
        sourceLine: "export { nested } from '@f/nested'",
      },
      {
        packageName: '@f/runtime',
        specifier: '@f/runtime',
        exportName: 'value',
        sourcePath: 'packages/g/dual/src/index.ts',
        line: 1,
        column: 10,
        sourceLine: "import { value } from '@f/runtime'",
      },
    ])
    expect([...found.allSourceUses.keys()].sort()).toEqual([
      '@f/browser', '@f/hidden', '@f/nested', '@f/runtime', '@f/types',
    ])
  })

  it('identifies exact runtime exports without treating type imports as values', () => {
    const source = [
      "import defaultValue, { value as local, type Kind } from '@f/root'",
      "import * as namespace from '@f/namespace'",
      "import '@f/effect'",
      "import type { TypeOnly } from '@f/types'",
      "export { source as renamed, type SourceType } from '@f/reexport'",
      "export * from '@f/star'",
      "void import('@f/dynamic')",
      "void require('@f/required')",
      'void defaultValue; void local; void namespace',
    ].join('\n')
    const uses = collectRuntimeSourceExportUses('probe.ts', source)
    expect(uses.map(({ specifier, exportName }) => ({ specifier, exportName }))).toEqual([
      { specifier: '@f/dynamic', exportName: '*' },
      { specifier: '@f/effect', exportName: '(side effect)' },
      { specifier: '@f/namespace', exportName: '*' },
      { specifier: '@f/reexport', exportName: 'source' },
      { specifier: '@f/required', exportName: '*' },
      { specifier: '@f/root', exportName: 'default' },
      { specifier: '@f/root', exportName: 'value' },
      { specifier: '@f/star', exportName: '*' },
    ])
    expect(uses.find(use => use.specifier === '@f/root' && use.exportName === 'value')).toMatchObject({
      line: 1,
      column: 24,
      sourceLine: "import defaultValue, { value as local, type Kind } from '@f/root'",
    })
  })
})

describe('dependency sections', () => {
  it('does not leak repository configuration into captured dependency facts', () => {
    const manifest: PackageDependencyManifest = {
      name: '@singula-ai/alego-client-locale',
      dependencies: { '@singula-ai/alego-runtime': 'workspace:^' },
      devDependencies: { [CORDIS]: 'workspace:^', '@singula-ai/alego-types': 'workspace:^' },
      peerDependencies: { [CORDIS]: 'workspace:^' },
    }
    const base = facts(manifest)
    const subject: PackageDependencyFacts = {
      ...base,
      workspaceNames: new Set([...base.workspaceNames, '@singula-ai/alego-api-remotes']),
    }

    expect(collectPackageDependencyViolations({
      facts: [subject], packages: [], policyViolations: [], workspaceNames: subject.workspaceNames,
    })).toEqual([])
  })

  it('requires non-workspace Host runtime imports in dependencies', () => {
    const manifest: PackageDependencyManifest = {
      name: '@singula-ai/alego-probe',
      dependencies: { '@singula-ai/alego-runtime': 'workspace:^' },
      devDependencies: { [CORDIS]: 'workspace:^', '@singula-ai/alego-types': 'workspace:^', external: '^1.0.0' },
      peerDependencies: { [CORDIS]: 'workspace:^' },
    }
    const subject: PackageDependencyFacts = {
      ...facts(manifest),
      hostRuntimeSourceUses: new Map([
        ['@singula-ai/alego-runtime', ['packages/core/probe/src/index.ts']],
        ['external', ['packages/core/probe/src/index.ts']],
      ]),
    }
    const state = {
      facts: [subject], packages: [], policyViolations: [], workspaceNames: subject.workspaceNames,
    }

    expect(collectPackageDependencyViolations(state)).toContain(
      'packages/core/probe/package.json: external (packages/core/probe/src/index.ts) '
      + 'must be dependencies-only; found devDependencies',
    )
    repairPackageDependencyManifest(subject)
    expect(manifest.dependencies?.external).toBe('^1.0.0')
    expect(manifest.devDependencies?.external).toBeUndefined()

    delete manifest.dependencies?.external
    expect(collectPackageDependencyViolations(state)).toContain(
      'packages/core/probe/package.json: external (packages/core/probe/src/index.ts) '
      + 'must be dependencies-only; found no dependency section',
    )
  })

  it('accepts Host dependencies, development-only inputs, and shared Cordis', () => {
    const manifest: PackageDependencyManifest = {
      name: '@singula-ai/alego-probe',
      dependencies: {
        '@singula-ai/alego-runtime': 'workspace:^',
        '@singula-ai/schemastery': 'workspace:^',
        external: '^1.0.0',
      },
      devDependencies: {
        '@singula-ai/alego-types': 'workspace:^',
        [CORDIS]: 'workspace:^',
      },
      peerDependencies: { [CORDIS]: 'workspace:^' },
    }
    expect(collectPackageDependencyViolations({
      facts: [facts(manifest)], packages: [], policyViolations: [], workspaceNames: facts(manifest).workspaceNames,
    })).toEqual([])
  })

  it('lists managed Host runtime dependencies for fix review', () => {
    const subject = facts({ name: '@singula-ai/alego-probe' })
    expect(formatManagedRuntimeDependencies({
      facts: [subject], packages: [], policyViolations: [], workspaceNames: subject.workspaceNames,
    })).toEqual([
      'verify-package-dependencies: 1 managed Host runtime edge(s) remain in dependencies across 1 package(s):',
      '  @singula-ai/alego-probe -> @singula-ai/alego-runtime: @singula-ai/alego-runtime#runtimeValue',
    ])
  })

  it('reports an unapproved Host runtime export without rewriting its dependency section', () => {
    const manifest: PackageDependencyManifest = {
      name: '@singula-ai/alego-probe',
      dependencies: { '@singula-ai/alego-runtime': 'workspace:^' },
      devDependencies: { [CORDIS]: 'workspace:^', '@singula-ai/alego-types': 'workspace:^' },
      peerDependencies: { [CORDIS]: 'workspace:^' },
    }
    const subject = facts(manifest)
    const safetyViolations = collectHostDependencyExportPolicyViolations(
      [subject],
      subject.workspaceNames,
      { safeHostDependencyExports: {}, peerRequiredHostExports: {} },
    )
    const state = {
      facts: [subject], packages: [], policyViolations: safetyViolations, workspaceNames: subject.workspaceNames,
    }

    expect(safetyViolations).toEqual([
      'packages/core/probe/src/index.ts:1:10: @singula-ai/alego-runtime#runtimeValue is not classified as '
      + 'safe or peer-required — import { runtimeValue } from \'@singula-ai/alego-runtime\'',
    ])
    expect(fixPackageDependencies('/unused', state)).toEqual([])
    expect(manifest.dependencies).toEqual({ '@singula-ai/alego-runtime': 'workspace:^' })
  })

  it('keeps an edge as a peer when one imported export requires shared identity', () => {
    const manifest: PackageDependencyManifest = {
      name: '@singula-ai/alego-probe',
      dependencies: { '@singula-ai/alego-runtime': 'workspace:^' },
      devDependencies: { [CORDIS]: 'workspace:^', '@singula-ai/alego-types': 'workspace:^' },
      peerDependencies: { [CORDIS]: 'workspace:^' },
    }
    const subject: PackageDependencyFacts = {
      ...facts(manifest),
      peerRequiredHostDependencies: new Set(['@singula-ai/alego-runtime']),
    }
    expect(collectHostDependencyExportPolicyViolations(
      [subject],
      subject.workspaceNames,
      {
        safeHostDependencyExports: {},
        peerRequiredHostExports: {
          '@singula-ai/alego-runtime': ['runtimeValue'],
        },
      },
    )).toEqual([])

    repairPackageDependencyManifest(subject)
    expect(manifest.dependencies).toBeUndefined()
    expect(manifest.peerDependencies).toMatchObject({
      [CORDIS]: 'workspace:^',
      '@singula-ai/alego-runtime': 'workspace:^',
    })
    expect(manifest.devDependencies).toMatchObject({
      [CORDIS]: 'workspace:^',
      '@singula-ai/alego-runtime': 'workspace:^',
    })
    expect(formatPeerRequiredRuntimeDependencies({
      facts: [subject], packages: [], policyViolations: [], workspaceNames: subject.workspaceNames,
    })).toEqual([
      'verify-package-dependencies: 1 Host runtime edge(s) remain in peerDependencies because their exports require shared identity across 1 package(s):',
      '  @singula-ai/alego-probe -> @singula-ai/alego-runtime: @singula-ai/alego-runtime#runtimeValue',
    ])
  })

  it('reports wrong sections, workspace ranges, and stale peer metadata', () => {
    const manifest: PackageDependencyManifest = {
      name: '@singula-ai/alego-probe',
      dependencies: { '@singula-ai/alego-types': 'workspace:*' },
      devDependencies: { [CORDIS]: 'workspace:^', '@singula-ai/alego-runtime': 'workspace:^' },
      peerDependencies: { [CORDIS]: 'workspace:*', '@singula-ai/alego-runtime': 'workspace:^' },
      peerDependenciesMeta: { '@singula-ai/alego-missing': { optional: true } },
    }
    const state = {
      facts: [facts(manifest)], packages: [], policyViolations: [], workspaceNames: facts(manifest).workspaceNames,
    }
    const violations = collectPackageDependencyViolations(state)
    expect(violations).toEqual(expect.arrayContaining([
      expect.stringContaining('@singula-ai/alego-runtime'),
      expect.stringContaining('@singula-ai/alego-types'),
      expect.stringContaining(`${CORDIS} must be matching peerDependencies + devDependencies`),
      expect.stringContaining('dependencies.@singula-ai/alego-types must use workspace:^'),
      expect.stringContaining('peerDependenciesMeta.@singula-ai/alego-missing has no matching'),
    ]))
  })

  it('repairs owned relationships without changing unrelated dependencies', () => {
    const root = mkdtempSync(join(tmpdir(), 'alego-package-dependencies-'))
    roots.push(root)
    const manifestPath = 'package.json'
    const manifest: PackageDependencyManifest = {
      name: '@singula-ai/alego-probe',
      dependencies: { '@singula-ai/schemastery': 'workspace:*', external: '^1.0.0' },
      devDependencies: { [CORDIS]: 'workspace:^', '@singula-ai/alego-runtime': 'workspace:^' },
      peerDependencies: {
        [CORDIS]: 'workspace:^',
        '@singula-ai/alego-runtime': 'workspace:^',
        '@singula-ai/alego-stale': 'workspace:^',
      },
      peerDependenciesMeta: { '@singula-ai/alego-stale': { optional: true } },
    }
    writeFileSync(join(root, manifestPath), `${JSON.stringify(manifest, null, 2)}\n`)
    const subject = { ...facts(manifest), manifestPath }
    const state = { facts: [subject], packages: [], policyViolations: [], workspaceNames: subject.workspaceNames }

    expect(fixPackageDependencies(root, state)).toEqual([manifestPath])
    const fixed = JSON.parse(readFileSync(join(root, manifestPath), 'utf8')) as PackageDependencyManifest
    expect(fixed.dependencies).toEqual({
      '@singula-ai/schemastery': 'workspace:^',
      external: '^1.0.0',
      '@singula-ai/alego-runtime': 'workspace:^',
    })
    expect(fixed.devDependencies).toEqual({
      [CORDIS]: 'workspace:^',
      '@singula-ai/alego-types': 'workspace:^',
      '@singula-ai/alego-stale': 'workspace:^',
    })
    expect(fixed.peerDependencies).toEqual({ [CORDIS]: 'workspace:^' })
    expect(fixed.peerDependenciesMeta).toBeUndefined()
  })

  it('repairs an in-memory manifest for benchmark simulation', () => {
    const manifest: PackageDependencyManifest = {
      name: '@singula-ai/alego-probe',
      peerDependencies: { [CORDIS]: 'workspace:^', '@singula-ai/alego-runtime': 'workspace:^' },
      devDependencies: { [CORDIS]: 'workspace:^', '@singula-ai/alego-runtime': 'workspace:^' },
    }
    repairPackageDependencyManifest(facts(manifest))
    expect(manifest.dependencies).toEqual({ '@singula-ai/alego-runtime': 'workspace:^' })
    expect(manifest.peerDependencies).toEqual({ [CORDIS]: 'workspace:^' })
  })
})
