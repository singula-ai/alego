/**
 * Pins shared client-bundle preset rules: module-edge purity, source-map
 * chaining, and physical watch dependencies hidden behind virtual CSS Modules.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it, vi } from 'vitest'
import { clientBundle, requestedExternals } from '../packages/client/tsdown.client.ts'

type ResolveId = (source: string) => null | { id: string; external: boolean }

interface CssModulePlugin {
  name: string
  resolveId?: (source: string, importer: string | undefined) => null | string
  load?: (this: { addWatchFile: (id: string) => void }, id: string) => Promise<unknown>
}

interface SourceMapPlugin {
  name: string
  load?: (id: string) => Promise<unknown>
}

/** A representative dynamic bundle using the shared client baseline. */
const REQUESTING_PACKAGE = '@singula-ai/alego-client-ui-conversation'

function clientConfigs(id = REQUESTING_PACKAGE) {
  return clientBundle(id, ['lib/types/index.js', 'lib/types/invariant.js'])(
    { env: { ALEGO_BUILD_FACE: 'client' } },
  ).filter(config => config.platform === 'browser')
}

describe('client bundle build faces', () => {
  it('watches source in development and consumes emitted JavaScript in the Client build', () => {
    const bundle = clientBundle('@singula-ai/alego-client-test', ['lib/types/index.js'])
    const development = bundle({ env: {} }).find(config => config.platform === 'browser')
    const artifact = bundle({ env: { ALEGO_BUILD_FACE: 'client' } })
      .find(config => config.platform === 'browser')

    expect(development?.entry).toEqual({ client: 'src/client/index.ts' })
    expect(artifact?.entry).toEqual({ client: 'lib/types/client/index.js' })
  })
})

function clientSourceMapPath(packagePath: string): string {
  return fileURLToPath(new URL(`../packages/${packagePath}/lib/client.js.map`, import.meta.url))
}

function purityResolveId(id = REQUESTING_PACKAGE): ResolveId {
  // libEntry is spelled at every call site (no default) so the
  // package-invariants text check can see the invariant entry per package.
  const configs = clientConfigs(id)
  const plugins = (configs[0] as { plugins: { name: string; resolveId?: unknown }[] }).plugins
  const gate = plugins.find(p => p.name === 'alego-client-bundle-purity')
  if (gate?.resolveId === undefined) throw new Error('purity plugin missing from client config')
  return gate.resolveId as ResolveId
}

function cssModulePlugin(): CssModulePlugin {
  const configs = clientConfigs()
  const plugins = (configs[0] as { plugins: CssModulePlugin[] }).plugins
  const plugin = plugins.find(candidate => candidate.name === 'alego-css-modules-inline')
  if (plugin?.resolveId === undefined || plugin.load === undefined) {
    throw new Error('CSS Modules plugin missing from client config')
  }
  return plugin
}

function sourceMapPlugin(): SourceMapPlugin {
  const configs = clientConfigs()
  const plugins = (configs[0] as { plugins: SourceMapPlugin[] }).plugins
  const plugin = plugins.find(candidate => candidate.name === 'alego-tsc-sourcemap')
  if (plugin?.load === undefined) throw new Error('tsc sourcemap plugin missing from client config')
  return plugin
}

describe('client bundle purity gate', () => {
  const resolveId = purityResolveId()

  it('leaves default externals and non-scoped specifiers alone', () => {
    expect(resolveId('@singula-ai/alego-client-store')).toBeNull()
    expect(resolveId('@singula-ai/alego-client-ui-slots')).toBeNull()
    expect(resolveId('@singula-ai/alego-client-ui-primitives')).toBeNull()
    expect(resolveId('react')).toBeNull()
    expect(resolveId('zod')).toBeNull()
  })

  it('rejects the retired web-react platform package', () => {
    expect(() => resolveId('@singula-ai/alego-client-web-react')).toThrow(/purity/)
    expect(() => resolveId('@singula-ai/alego-client-web-react/store')).toThrow(/purity/)
  })

  it('lets inline-safe libraries inline', () => {
    expect(resolveId('@singula-ai/alego-session/surface')).toBeNull()
    expect(resolveId('@singula-ai/alego-brand')).toBeNull()
    expect(resolveId('@singula-ai/alego-deque')).toBeNull()
    expect(resolveId('@singula-ai/alego-util-values')).toBeNull()
    expect(resolveId('@singula-ai/alego-token-meter/client')).toBeNull()
    expect(() => resolveId('@singula-ai/alego-token-meter')).toThrow(/purity/)
    expect(() => resolveId('@singula-ai/alego-token-meter/client/internal')).toThrow(/purity/)
  })

  it('lets exact generated Remote contributions inline without admitting their package implementation', () => {
    expect(resolveId('@singula-ai/alego-goal/remote')).toBeNull()
    expect(() => resolveId('@singula-ai/alego-goal')).toThrow(/purity/)
    expect(() => resolveId('@singula-ai/alego-goal/client')).toThrow(/purity/)
    expect(() => resolveId('@singula-ai/alego-goal/remote/nested')).toThrow(/purity/)
  })

  it('throws on any other @singula-ai leak', () => {
    expect(() => resolveId('@singula-ai/alego-agent')).toThrow(/purity/)
    expect(() => resolveId('@singula-ai/alego-client-web')).toThrow(/purity/)
  })

  it('throws on cross-plugin value imports — bare plugin names and /client subpaths alike', () => {
    expect(() => resolveId('@singula-ai/alego-client-connection')).toThrow(/purity/)
    expect(() => resolveId('@singula-ai/alego-client-ui-session')).toThrow(/purity/)
    expect(() => resolveId('@singula-ai/alego-client-ui-layout/client')).toThrow(/purity/)
  })

  it('admits package-specific requests only for the declaring bundle', () => {
    const requesting = purityResolveId('@singula-ai/alego-api-session-controller')
    expect(requesting('@singula-ai/alego-api-gateway/client')).toBeNull()
    expect(() => resolveId('@singula-ai/alego-api-gateway/client')).toThrow(/purity/)
  })

  it('externalizes the baseline independently of each package manifest', () => {
    const requesting = clientConfigs()[0]?.deps as { neverBundle: (specifier: string) => boolean }
    const plain = clientConfigs('@singula-ai/alego-client-connection')[0]?.deps as {
      neverBundle: (specifier: string) => boolean
    }

    expect(requesting.neverBundle('react')).toBe(true)
    expect(requesting.neverBundle('zod')).toBe(false)
    expect(plain.neverBundle('react')).toBe(true)
    expect(plain.neverBundle('@singula-ai/alego-client-store')).toBe(true)
  })
})

describe('client bundle module requests', () => {
  it('requests what the declaration lists', () => {
    const requests = requestedExternals('@singula-ai/alego-client-fixture', {
      external: ['react', 'react/jsx-runtime', '@singula-ai/alego-client-ui-slots'],
    })

    expect([...requests].sort()).toEqual([
      '@singula-ai/alego-client-ui-slots', 'react', 'react/jsx-runtime',
    ])
  })

  it('requests nothing when the declaration is absent', () => {
    expect(requestedExternals('@singula-ai/alego-client-fixture', {}).size).toBe(0)
  })

  it('rejects a malformed declaration instead of reading past it', () => {
    expect(() => requestedExternals('@singula-ai/alego-client-fixture', { external: 'react' }))
      .toThrow(/alego\.client\.external must be a string array/)
  })
})

describe('client bundle debug artifacts', () => {
  it('emits source maps for plugin TS and TSX outside the Vite module graph', () => {
    const configs = clientConfigs()
    expect(configs[0]?.sourcemap).toBe(true)
    expect(configs[0]?.outputOptions).toMatchObject({ sourcemapExcludeSources: false })
  })

  it('chains emitted tsc maps when the production Client build consumes lib/types', async () => {
    const root = mkdtempSync(join(tmpdir(), 'alego-client-sourcemap-'))
    try {
      const entry = join(root, 'lib', 'types', 'client', 'index.js')
      const source = join(root, 'src', 'client', 'index.ts')
      const map = { version: 3, names: [], mappings: 'AAAA', sources: ['../../../src/client/index.ts'] }
      mkdirSync(join(root, 'lib', 'types', 'client'), { recursive: true })
      mkdirSync(join(root, 'src', 'client'), { recursive: true })
      writeFileSync(entry, 'export const marker = true\n//# sourceMappingURL=index.js.map\n')
      writeFileSync(`${entry}.map`, JSON.stringify(map))
      writeFileSync(source, 'export const marker: true = true\n')

      await expect(sourceMapPlugin().load!(entry)).resolves.toEqual({
        code: 'export const marker = true',
        map: { ...map, sourcesContent: ['export const marker: true = true\n'] },
      })
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('maps first-party sources to their repository package paths', () => {
    const configs = clientConfigs('@singula-ai/alego-client-ui-goal')
    const outputOptions = configs[0]?.outputOptions
    if (typeof outputOptions !== 'object' || outputOptions === null) throw new Error('client output options missing')
    const transform = outputOptions.sourcemapPathTransform
    if (transform === undefined) throw new Error('client sourcemap path transform missing')

    const source = transform('../src/client/GoalBar.tsx', clientSourceMapPath('client/ui-goal'))
    expect(source).toBe('../../../packages/client/ui-goal/src/client/GoalBar.tsx')
    const resolved = new URL(source, 'https://alego.test/plugins/@singula-ai/alego-client-ui-goal/client.js.map')
    expect(resolved.pathname).toBe('/packages/client/ui-goal/src/client/GoalBar.tsx')
  })

  it('maps dual-face host sources to the host package group', () => {
    const configs = clientConfigs('@singula-ai/alego-host-directory-picker-native')
    const outputOptions = configs[0]?.outputOptions
    if (typeof outputOptions !== 'object' || outputOptions === null) throw new Error('client output options missing')
    const transform = outputOptions.sourcemapPathTransform
    if (transform === undefined) throw new Error('client sourcemap path transform missing')

    const source = transform('../src/client/index.ts', clientSourceMapPath('host/directory-picker-native'))
    expect(source).toBe('../../../packages/host/directory-picker-native/src/client/index.ts')
  })

  it('maps inlined workspace sources to packages and leaves dependencies outside it unchanged', () => {
    const configs = clientConfigs('@singula-ai/alego-client-connection')
    const outputOptions = configs[0]?.outputOptions
    if (typeof outputOptions !== 'object' || outputOptions === null) throw new Error('client output options missing')
    const transform = outputOptions.sourcemapPathTransform
    if (transform === undefined) throw new Error('client sourcemap path transform missing')

    const sourceMapPath = clientSourceMapPath('client/connection')
    const workspaceSource = transform('../src/rpc.ts', sourceMapPath)
    expect(workspaceSource).toBe('../../../packages/client/connection/src/rpc.ts')
    const resolved = new URL(workspaceSource, 'https://alego.test/plugins/@singula-ai/alego-client-connection/client.js.map')
    expect(resolved.pathname).toBe('/packages/client/connection/src/rpc.ts')

    const dependencySource = '../../../../node_modules/.pnpm/zod@4.4.3/node_modules/zod/index.js'
    expect(transform(dependencySource, sourceMapPath)).toBe(dependencySource)
  })
})

describe('client bundle CSS Modules watch graph', () => {
  it('registers the physical stylesheet read behind a virtual module', async () => {
    const plugin = cssModulePlugin()
    const importer = fileURLToPath(new URL(
      '../packages/client/ui-conversation/src/client/queue/QueueDock.tsx',
      import.meta.url,
    ))
    const stylesheet = fileURLToPath(new URL(
      '../packages/client/ui-conversation/src/client/queue/QueueDock.module.css',
      import.meta.url,
    ))
    const virtualId = plugin.resolveId?.('./QueueDock.module.css', importer)
    if (virtualId === null || virtualId === undefined) throw new Error('CSS Modules import was not resolved')
    const addWatchFile = vi.fn()

    await plugin.load?.call({ addWatchFile }, virtualId)

    expect(addWatchFile).toHaveBeenCalledExactlyOnceWith(stylesheet)
  })
})
