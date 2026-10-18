import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { join } from 'node:path'
import { c as createTar } from 'tar'
import { expect, it } from 'vitest'
import { main } from '../src/cli.ts'
import { generate, type GenerateOptions } from '../src/generate.ts'
import { onCleanup, scratch } from './support.ts'

/** Pack a package directory the way npm does: every file under `package/`. */
async function pack(files: Record<string, string | Uint8Array>): Promise<Buffer> {
  const dir = scratch()
  for (const [path, contents] of Object.entries(files)) {
    mkdirSync(join(dir, 'package', path, '..'), { recursive: true })
    writeFileSync(join(dir, 'package', path), contents)
  }
  await createTar({ gzip: true, cwd: dir, file: join(dir, 'out.tgz'), portable: true }, ['package'])
  return readFileSync(join(dir, 'out.tgz'))
}

/** One published version: manifest fields besides name and version, and its tarball. */
interface Published {
  readonly manifest?: object
  readonly time?: string
  /** Tarball bytes, or `oversized` for a 2 MiB body sent without a content length. */
  readonly tarball?: Buffer | 'oversized'
  readonly integrity?: string
}

/** Packages by name: versions in publication order, or an HTTP status for the registry document. */
type Packages = Record<string, Readonly<Record<string, Published>> | number>

/** Serve registry documents under `/` and `/mirror/`, and tarballs; `tarballs` lists downloaded tarball paths. */
async function registry(packages: Packages) {
  const tarballs: string[] = []
  const server = createServer((request, response) => {
    const url = decodeURIComponent(request.url ?? '')
    const tarball = /^\/tarballs\/(.+)\/([^/]+)\.tgz$/u.exec(url)
    if (tarball !== null) {
      tarballs.push(url)
      const published = (packages[tarball[1] as string] as Record<string, Published>)[tarball[2] as string]?.tarball
      if (published === undefined) return void response.writeHead(404).end()
      if (published !== 'oversized') return void response.writeHead(200).end(published)
      response.writeHead(200)
      for (let sent = 0; sent < 2 << 20; sent += 1 << 16) response.write(Buffer.alloc(1 << 16))
      return void response.end()
    }
    const name = url.replace(/^\/(?:mirror\/)?/u, '')
    const versions = url.startsWith('/mirror/') ? 503 : packages[name] ?? 404
    if (typeof versions === 'number') return void response.writeHead(versions).end()
    response.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({
      'dist-tags': { latest: Object.keys(versions).at(-1) },
      time: Object.fromEntries(Object.entries(versions).flatMap(([version, { time }]) => time === undefined ? [] : [[version, time]])),
      // A package without versions has a registry document without a `versions` member.
      ...Object.keys(versions).length === 0 ? {} : { versions: Object.fromEntries(Object.entries(versions).map(([version, published]) => {
        const bytes = published.tarball
        const integrity = published.integrity ?? (Buffer.isBuffer(bytes) ? `sha512-${createHash('sha512').update(bytes).digest('base64')}` : undefined)
        return [version, {
          name, version, ...published.manifest,
          dist: { tarball: `${base}/tarballs/${encodeURIComponent(name)}/${version}.tgz`, ...integrity === undefined ? {} : { integrity } },
        }]
      })) },
    }))
  })
  await new Promise<void>((resolve) => { server.listen(0, '127.0.0.1', resolve) })
  const address = server.address()
  if (address === null || typeof address === 'string') throw new Error('no port')
  const base = `http://127.0.0.1:${address.port}`
  onCleanup(() => new Promise<void>((resolve) => {
    server.close(() => { resolve() })
    server.closeAllConnections()
  }))
  return { url: `${base}/`, tarballs }
}

const BUNDLE = { alego: { bundle: { patch: './cordis.patch.yml' } } }

const bundleManifest = (name: string, version: string, extra: object = {}) => JSON.stringify({ name, version, ...BUNDLE, ...extra })

function options(registryUrl: string, cacheDir: string, lines: string[], warnings: string[]): GenerateOptions {
  return {
    sources: lines.map(name => ({ kind: 'npm' as const, line: name, name })),
    cacheDir, registry: registryUrl, recordRegistry: true, title: 'Test Market', description: 'For tests',
    inlineIconBytes: 64, limits: { timeoutMs: 10000, maxTarballBytes: 1 << 20 }, concurrency: 2,
    warn: (message) => { warnings.push(message) },
  }
}

it('lists every non-deprecated bundle version from the registry document and reads display fields from the highest tarball', async () => {
  const packages: Packages = {
    'alego-a': {
      '0.9.0': { time: '2026-01-01T00:00:00.000Z' },
      '1.0.0': { time: '2026-02-01T00:00:00.000Z', manifest: { ...BUNDLE, keywords: ['old'], engines: { alego: '>=0.2.0' }, peerDependencies: { '@singula-ai/alego': '9' } } },
      '1.1.0': { time: '2026-03-01T00:00:00.000Z', manifest: { ...BUNDLE, deprecated: 'broken' } },
      '1.2.0': {
        time: '2026-04-01T00:00:00.000Z',
        manifest: {
          ...BUNDLE, deprecated: '',
          peerDependencies: { '@singula-ai/alego': '>=0.2.0', '@singula-ai/alego-agent': '>=0.2.0', '@singula-ai/alego-tools': '^0.2.0 || ^0.3.0', react: '18' },
        },
      },
      '1.3.0': { time: '2026-05-01T00:00:00.000Z', manifest: { ...BUNDLE, peerDependencies: { '@singula-ai/alego-agent': 'workspace:>=1' } } },
      '1.4.0': { manifest: BUNDLE },
      '2.0.0-rc.1': {
        time: '2026-06-01T00:00:00.000Z',
        manifest: { ...BUNDLE, author: { name: 'Jane Doe', email: 'jane@example.com' } },
        tarball: await pack({
          'package.json': bundleManifest('alego-a', '2.0.0-rc.1', { author: { name: 'Jane Doe' }, icon: 'icon.png', homepage: 'https://example.com/alego-a', repository: { type: 'git', url: 'git+https://github.com/jane/plugins.git', directory: 'packages/a' }, keywords: ['alpha', '', 'alpha'] }),
          'locale/en.json': JSON.stringify({ meta: { title: 'Alpha' } }),
          'locale/zh.json': JSON.stringify({ meta: { title: '甲' } }),
          'locale/x_y.json': '{}',
          'icon.png': new Uint8Array(100),
          'node_modules/dep/package.json': '{}',
        }),
      },
    },
    'alego-b': { '1.0.0': { time: '2026-06-02T00:00:00.000Z', manifest: { ...BUNDLE, author: 'Bob' }, tarball: await pack({ 'package.json': bundleManifest('alego-b', '1.0.0') }) } },
    'plain-lib': { '1.0.0': { time: '2026-06-01T00:00:00.000Z' } },
    'alego-imposter': { '1.0.0': { time: '2026-06-01T00:00:00.000Z', manifest: BUNDLE, tarball: await pack({ 'package.json': bundleManifest('alego-other', '1.0.0') }) } },
    'alego-tampered': { '1.0.0': { time: '2026-06-01T00:00:00.000Z', manifest: BUNDLE, tarball: await pack({ 'package.json': bundleManifest('alego-tampered', '1.0.0') }), integrity: 'sha512-AAAA' } },
    'alego-unsigned': { '1.0.0': { time: '2026-06-01T00:00:00.000Z', manifest: BUNDLE } },
    'alego-huge': { '1.0.0': { time: '2026-06-01T00:00:00.000Z', manifest: BUNDLE, tarball: 'oversized', integrity: 'sha512-AAAA' } },
    'alego-bomb': { '1.0.0': { time: '2026-06-01T00:00:00.000Z', manifest: BUNDLE, tarball: await pack({ 'package.json': bundleManifest('alego-bomb', '1.0.0'), 'zeros.bin': new Uint8Array(2 << 20) }) } },
    'alego-no-tarball': { '1.0.0': { time: '2026-06-01T00:00:00.000Z', manifest: BUNDLE, integrity: 'sha512-AAAA' } },
    'alego-unpublished': {},
    'alego-missing': 404,
  }
  const server = await registry(packages)
  const cacheDir = scratch()
  const warnings: string[] = []
  const lines = ['alego-a', 'alego-b', 'plain-lib', 'alego-imposter', 'alego-tampered', 'alego-unsigned', 'alego-huge', 'alego-bomb', 'alego-no-tarball', 'alego-unpublished', 'alego-missing']
  const first = await generate(options(server.url, cacheDir, lines, warnings))
  const npm = { type: 'npm', registry: server.url }
  expect(first.index).toMatchObject({ format: 1, title: 'Test Market', description: 'For tests' })
  expect(first.index.plugins).toEqual([
    {
      name: 'alego-a', title: { en: 'Alpha', zh: '甲' }, icon: expect.stringMatching(/^icons\/[0-9a-f]{16}\.png$/u) as string, author: 'Jane Doe', homepage: 'https://example.com/alego-a',
      repository: { url: 'https://github.com/jane/plugins', directory: 'packages/a' },
      metadata: { keywords: ['alpha', '', 'alpha'] },
      versions: [
        { version: '2.0.0-rc.1', publishTimestamp: 1780272000, source: npm },
        { version: '1.2.0', publishTimestamp: 1775001600, source: npm, engines: { alego: '>=0.2.0 <0.3.0-0 || >=0.2.0 >=0.3.0 <0.4.0-0' } },
        { version: '1.0.0', publishTimestamp: 1769904000, source: npm, engines: { alego: '>=0.2.0' } },
      ],
    },
    { name: 'alego-b', title: 'alego-b', versions: [{ version: '1.0.0', publishTimestamp: 1780358400, source: npm }] },
  ])
  expect(existsSync(first.icons.get(first.index.plugins[0]?.icon ?? '') ?? '')).toBe(true)
  expect(server.tarballs.filter(path => path.includes('alego-a'))).toEqual(['/tarballs/alego-a/2.0.0-rc.1.tgz'])
  expect(first.failures).toEqual([
    'alego-imposter: alego-imposter@1.0.0: tarball package.json does not name alego-imposter@1.0.0',
    'alego-tampered: alego-tampered@1.0.0: tarball does not match its registry integrity',
    'alego-unsigned: alego-unsigned@1.0.0: registry lists no tarball with integrity',
    `alego-huge: alego-huge@1.0.0: tarball exceeds ${1 << 20} bytes`,
    `alego-bomb: alego-bomb@1.0.0: unpacked tarball exceeds ${1 << 20} bytes`,
    'alego-no-tarball: alego-no-tarball@1.0.0: tarball answered HTTP 404',
    'alego-missing: alego-missing: registry answered HTTP 404',
  ])
  expect(warnings).toEqual(expect.arrayContaining([
    'alego-a: alego-a@1.3.0 skipped: ALEGO range "workspace:>=1" is not a valid SemVer range',
    'alego-a@2.0.0-rc.1: locale file locale/x_y.json ignored: its name is not a language id',
    'plain-lib: no published version declares alego.bundle',
    'alego-unpublished: no published version declares alego.bundle',
  ]))

  // Unchanged version lists come from the cache; a failing source keeps its last result for the same registry only.
  packages['alego-b'] = 500
  const downloads = server.tarballs.length
  const second = await generate(options(server.url, cacheDir, lines, warnings))
  expect(server.tarballs.length - downloads).toBe(5)
  expect(second.index.plugins).toEqual(first.index.plugins)
  expect(warnings).toContain('alego-b: alego-b: registry answered HTTP 500; keeping the last successful result')
  const mirror = await generate(options(`${server.url}mirror/`, cacheDir, ['alego-b'], warnings))
  expect([mirror.index.plugins, mirror.failures]).toEqual([[], ['alego-b: alego-b: registry answered HTTP 503']])
})

it('keeps packages with absent or invalid keywords and preserves empty keywords in generated and cached output', async () => {
  const cases = [
    { name: 'alego-absent', fields: {}, metadata: undefined },
    { name: 'alego-empty', fields: { keywords: [] }, metadata: { keywords: [] } },
    { name: 'alego-mixed', fields: { keywords: ['valid', 1] }, metadata: undefined },
    { name: 'alego-nonarray', fields: { keywords: 'search' }, metadata: undefined },
  ]
  const packages: Packages = Object.fromEntries(await Promise.all(cases.map(async ({ name, fields }) => [name, {
    '1.0.0': { time: '2026-06-01T00:00:00.000Z', manifest: BUNDLE, tarball: await pack({ 'package.json': bundleManifest(name, '1.0.0', fields) }) },
  }] as const)))
  const server = await registry(packages)
  const warnings: string[] = []
  const opts = options(server.url, scratch(), cases.map(({ name }) => name), warnings)
  const first = await generate(opts)
  expect(first.failures).toEqual([])
  expect(first.index.plugins.map(({ name, metadata }) => ({ name, metadata })))
    .toEqual(cases.map(({ name, metadata }) => ({ name, metadata })))
  for (const plugin of first.index.plugins) {
    if (plugin.name !== 'alego-empty') expect(plugin).not.toHaveProperty('metadata')
  }
  expect(warnings.sort()).toEqual([
    'alego-mixed@1.0.0: package.json keywords must be an array of strings; it is omitted',
    'alego-nonarray@1.0.0: package.json keywords must be an array of strings; it is omitted',
  ])
  const cached = await generate(opts)
  expect(cached).toEqual(first)
  expect(server.tarballs).toHaveLength(cases.length)
  for (const { name } of cases) packages[name] = 503
  expect((await generate(opts)).index).toEqual(first.index)
})

it('rebuilds a cached record the index format rejects', async () => {
  const server = await registry({ 'alego-a': { '1.0.0': { time: '2026-06-01T00:00:00.000Z', manifest: BUNDLE, tarball: await pack({ 'package.json': bundleManifest('alego-a', '1.0.0') }) } } })
  const cacheDir = scratch()
  const first = await generate(options(server.url, cacheDir, ['alego-a'], []))
  const results = join(cacheDir, 'results')
  for (const record of ['{', JSON.stringify({ plugins: [{ name: 'Bad Name', versions: [] }] })]) {
    for (const file of readdirSync(results)) writeFileSync(join(results, file), record)
    expect((await generate(options(server.url, cacheDir, ['alego-a'], []))).index.plugins).toEqual(first.index.plugins)
  }
  expect(server.tarballs).toHaveLength(3)
})

it('keeps the first source of a repeated package name', async () => {
  const tarball = await pack({ 'package.json': bundleManifest('alego-a', '1.0.0') })
  const server = await registry({ 'alego-a': { '1.0.0': { time: '2026-06-01T00:00:00.000Z', manifest: BUNDLE, tarball } } })
  const warnings: string[] = []
  const source = { kind: 'npm' as const, line: 'alego-a', name: 'alego-a' }
  const result = await generate({ ...options(server.url, scratch(), [], warnings), recordRegistry: false, sources: [source, { ...source, line: 'alego-a ' }] })
  expect(result.index.plugins.map(entry => [entry.name, entry.versions[0]?.source])).toEqual([['alego-a', { type: 'npm' }]])
  expect(warnings).toEqual(['alego-a: listed by more than one source; keeping the first'])
})

it('writes the index and icons once, keeps the cache beside the input, and removes only stale generated icon files', async () => {
  const server = await registry({
    'alego-a': { '1.0.0': { time: '2026-06-01T00:00:00.000Z', manifest: BUNDLE, tarball: await pack({ 'package.json': bundleManifest('alego-a', '1.0.0', { icon: 'i.png' }), 'i.png': new Uint8Array(20000) }) } },
  })
  const lists = scratch()
  const out = join(scratch(), 'site')
  const list = join(lists, 'plugins.txt')
  writeFileSync(list, 'alego-a\n')
  const args = ['--input', list, '--output', join(out, 'index.json'), '--title', 'T', '--registry', server.url]
  expect(await main(args)).toBe(0)
  const written = readFileSync(join(out, 'index.json'), 'utf8')
  const icon = (JSON.parse(written) as { plugins: { icon: string }[] }).plugins[0]?.icon ?? ''
  expect(readFileSync(join(out, icon)).length).toBe(20000)
  expect([existsSync(join(lists, '.plugin-market-cache')), existsSync(join(out, '.plugin-market-cache'))]).toEqual([true, false])
  writeFileSync(join(out, 'icons', '0123456789abcdef.png'), 'stale')
  writeFileSync(join(out, 'icons', 'keep.txt'), 'mine')
  mkdirSync(join(out, 'icons', 'fedcba9876543210.svg'))
  expect(await main(args)).toBe(0)
  expect(readFileSync(join(out, 'index.json'), 'utf8')).toBe(written)
  expect(['0123456789abcdef.png', 'keep.txt', 'fedcba9876543210.svg', icon.slice('icons/'.length)].map(name => existsSync(join(out, 'icons', name))))
    .toEqual([false, true, true, true])
  writeFileSync(list, 'alego-gone\n')
  const other = join(scratch(), 'index.json')
  expect(await main(['--input', list, '--output', other, '--title', 'T', '--description', 'D', '--registry', server.url, '--concurrency', '2', '--cache', join(lists, 'other-cache')])).toBe(1)
  expect((JSON.parse(readFileSync(other, 'utf8')) as { description: string }).description).toBe('D')
  writeFileSync(list, 'http://example.com/o/r\n')
  expect(await main(['--input', list, '--output', other, '--title', 'T'])).toBe(2)
})
