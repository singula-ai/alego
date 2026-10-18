/**
 * The Worker's `node-addon-require-builtin`: the internal-module channel the vendored Loader, app-boot, and HMR
 * reach Node through when `--expose-internals` is absent. It answers Node's module ids with the members those
 * callers read, backed by the Worker loader; anything the Worker does not provide refuses with Node's platform code.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createNodeBuiltins } from '../../src/node/builtins.ts'
import { installProcessGlobal } from '../../src/node/globals/process.ts'
import { setActiveModuleLoader, WorkerModuleLoader, type WorkerRequire } from '../../src/module-system/module-loader.ts'
import { MemoryVfs } from '../../src/storage/memory.ts'

interface Addon { requireBuiltin(id: string): unknown }
interface CascadedLoader {
  resolveSync(
    parentURL: string | undefined,
    request: { specifier: string; attributes?: Record<string, string> },
  ): { url: string; format: string }
  import(specifier: string, parentURL: string | undefined, attributes?: Record<string, string>): Promise<unknown>
  getOrCreateModuleJob(): unknown
  loadCache: Map<string, unknown> & {
    get(url: string, type?: string): unknown
    has(url: string, type?: string): boolean
    set(url: string, type?: string, job?: unknown): unknown
  }
}

const realProcess = globalThis.process
let require: WorkerRequire

beforeEach(() => {
  const vfs = new MemoryVfs()
  vfs.seedDirectory('/alego/node_modules/pkg/locale')
  vfs.writeFileSync('/alego/node_modules/pkg/package.json', JSON.stringify({
    name: 'pkg', exports: { '.': './index.js', './locale/*.json': './locale/*.json' },
  }))
  vfs.writeFileSync('/alego/node_modules/pkg/index.js', 'module.exports = { marker: "pkg" }')
  vfs.writeFileSync('/alego/node_modules/pkg/locale/en.json', '{}')
  const loader = new WorkerModuleLoader({ vfs, root: '/alego', staticModules: createNodeBuiltins() })
  setActiveModuleLoader(loader)
  installProcessGlobal({ cwd: '/alego', env: {} })
  require = loader.createRequire('/alego/')
})

afterEach(() => {
  ;(globalThis as { process: unknown }).process = realProcess
})

function addon(): Addon {
  return require('node-addon-require-builtin') as Addon
}

function cascaded(): CascadedLoader {
  const module = addon().requireBuiltin('internal/modules/esm/loader') as { getOrInitializeCascadedLoader(): CascadedLoader }
  return module.getOrInitializeCascadedLoader()
}

function codeOf(run: () => unknown): unknown {
  try { run() } catch (error) { return (error as { code?: unknown }).code }
  throw new Error('expected a refusal')
}

describe('node-addon-require-builtin in the Worker', () => {
  it('answers each provided id with one module object', () => {
    for (const id of [
      'internal/modules/esm/loader', 'internal/modules/esm/module_map', 'internal/modules/cjs/loader',
      'internal/modules/package_json_reader', 'internal/bootstrap/realm',
    ]) {
      expect(addon().requireBuiltin(id), id).toBe(addon().requireBuiltin(id))
    }
  })

  it('refuses ids the Worker does not provide with the Node platform code', () => {
    expect(codeOf(() => addon().requireBuiltin('internal/modules/helpers'))).toBe('ERR_FEATURE_UNAVAILABLE_ON_PLATFORM')
  })
})

describe('the cascaded ESM loader', () => {
  it('is one object with the Node 24 module-job member, so the vendored Loader classifies it as v2', () => {
    expect(cascaded()).toBe(cascaded())
    expect(typeof cascaded().getOrCreateModuleJob).toBe('function')
    expect(codeOf(() => cascaded().getOrCreateModuleJob())).toBe('ERR_FEATURE_UNAVAILABLE_ON_PLATFORM')
  })

  it('resolves with the Node 24 argument order', () => {
    expect(cascaded().resolveSync('file:///alego/', { specifier: 'pkg/locale/en.json', attributes: {} }))
      .toEqual({ url: 'file:///alego/node_modules/pkg/locale/en.json', format: 'json' })
    expect(cascaded().resolveSync('file:///alego/', { specifier: 'node:path' }))
      .toEqual({ url: 'node:path', format: 'builtin' })
  })

  it('reports a missing resource with the codes Node ESM resolution uses', () => {
    expect(codeOf(() => cascaded().resolveSync('file:///alego/', { specifier: 'pkg/icon' }))).toBe('ERR_PACKAGE_PATH_NOT_EXPORTED')
    expect(codeOf(() => cascaded().resolveSync('file:///alego/', { specifier: 'absent' }))).toBe('ERR_MODULE_NOT_FOUND')
    expect(codeOf(() => cascaded().resolveSync('file:///alego/', { specifier: './absent.js' }))).toBe('ERR_MODULE_NOT_FOUND')
  })

  it('imports through the Worker loader', async () => {
    await expect(cascaded().import('pkg', 'file:///alego/', {})).resolves.toEqual({ marker: 'pkg' })
  })

  it('keeps an empty load cache with Node LoadCache lookups', () => {
    const cache = cascaded().loadCache
    expect(cache).toBeInstanceOf(Map)
    expect(cache.size).toBe(0)
    expect(cache.get('file:///alego/x.js')).toBeUndefined()
    expect(cache.has('file:///alego/x.js')).toBe(false)
    expect(cache.has('file:///alego/x.json', 'json')).toBe(false)
    expect(codeOf(() => cache.get(1 as never))).toBe('ERR_INVALID_ARG_TYPE')
    expect(codeOf(() => cache.set('file:///alego/x.js', 'javascript', {}))).toBe('ERR_FEATURE_UNAVAILABLE_ON_PLATFORM')
  })
})

describe('surfaces HMR reads while expiring package configuration', () => {
  it('keeps the cache objects and replaceable members Node exposes', () => {
    const { Module } = addon().requireBuiltin('internal/modules/cjs/loader') as {
      Module: { _pathCache: object; _resolveFilename(): unknown; _load(): unknown }
    }
    expect(Object.keys(Module._pathCache)).toEqual([])
    expect(Object.keys({ ...Module })).toEqual(expect.arrayContaining(['_pathCache', '_resolveFilename', '_load']))
    expect(codeOf(() => Module._load())).toBe('ERR_FEATURE_UNAVAILABLE_ON_PLATFORM')

    const reader = addon().requireBuiltin('internal/modules/package_json_reader') as { getNearestParentPackageJSON(): unknown }
    expect(codeOf(() => reader.getNearestParentPackageJSON())).toBe('ERR_FEATURE_UNAVAILABLE_ON_PLATFORM')

    const realm = addon().requireBuiltin('internal/bootstrap/realm') as { internalBinding(name: string): Record<string, () => unknown> }
    const binding = realm.internalBinding('modules')
    expect(realm.internalBinding('modules')).toBe(binding)
    expect(Object.keys(binding)).toEqual(['readPackageJSON', 'getPackageScopeConfig', 'getPackageType'])
    expect(codeOf(() => binding.readPackageJSON?.())).toBe('ERR_FEATURE_UNAVAILABLE_ON_PLATFORM')
    expect(codeOf(() => realm.internalBinding('fs'))).toBe('ERR_FEATURE_UNAVAILABLE_ON_PLATFORM')
  })

  it('serializes resolve-cache keys the way Node does', () => {
    const { ResolveCache } = addon().requireBuiltin('internal/modules/esm/module_map') as {
      ResolveCache: new () => Map<string, unknown> & {
        serializeKey(specifier: string, attributes: Record<string, string>): string
        get(key: string, parent: string): unknown
        set(key: string, parent: string, value: unknown): unknown
        has(key: string, parent: string): boolean
      }
    }
    const cache = new ResolveCache()
    const key = cache.serializeKey('./a.json', { type: 'json' })
    expect(key).toBe('./a.json::"type""json"')
    expect(cache.serializeKey('./a.js', {})).toBe('./a.js::')
    expect(cache.has(key, 'file:///alego/')).toBe(false)
    cache.set(key, 'file:///alego/', { url: 'file:///alego/a.json', format: 'json' })
    expect(cache.get(key, 'file:///alego/')).toEqual({ url: 'file:///alego/a.json', format: 'json' })
  })
})

describe('the process shim', () => {
  it('reports a Node 24 runtime, the version the provided internals follow', () => {
    expect(process.versions.node).toBe('24.18.0')
    expect(process.version).toBe('v24.18.0')
  })
})
