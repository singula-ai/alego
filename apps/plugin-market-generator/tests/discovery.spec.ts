import { describe, expect, it } from 'vitest'
import { PackageFiles } from '../src/files.ts'
import { readDisplayMetadata } from '../src/metadata.ts'
import { alegoRange, findBundlePackages, isBundle, readManifest, type Manifest } from '../src/packages.ts'
import { parseSources } from '../src/sources.ts'

/** An in-memory tree from relative path → file contents. */
function tree(contents: Record<string, string | Uint8Array>): PackageFiles {
  return new PackageFiles(new Map(Object.entries(contents).map(([path, value]) => {
    const bytes = Buffer.from(value)
    return [path, { size: bytes.length, read: () => Promise.resolve(bytes) }]
  })))
}

const bundle = (name: string, extra: object = {}): string => JSON.stringify({ name, version: '1.0.0', alego: { bundle: { patch: './cordis.patch.yml' } }, ...extra })

async function readDisplay(files: PackageFiles, manifest: Manifest, inlineBytes = 100) {
  const warnings: string[] = []
  const result = await readDisplayMetadata(files, manifest, { inlineBytes, warn: (message) => { warnings.push(message) } })
  return { ...result, warnings }
}

describe('parseSources', () => {
  it('reads package names and repository URLs, ignoring comments, blanks, and repeats', () => {
    expect(parseSources('# market\n\n@scope/alego-a\nalego-b\nhttps://github.com/o/r.git\nhttps://github.com/o/r/\nalego-b\nhttps://gitlab.example.com/g/sub/r\n')).toEqual([
      { kind: 'npm', line: '@scope/alego-a', name: '@scope/alego-a' },
      { kind: 'npm', line: 'alego-b', name: 'alego-b' },
      { kind: 'git', line: 'https://github.com/o/r.git', url: 'https://github.com/o/r' },
      { kind: 'git', line: 'https://gitlab.example.com/g/sub/r', url: 'https://gitlab.example.com/g/sub/r' },
    ])
  })

  it.each([
    ['Not A Name', 'line 1: not an npm package name or an https Git repository URL (must be a valid npm package name): Not A Name'],
    ['x'.repeat(215), 'must be a valid npm package name'],
    ['http://github.com/o/r', 'must use https:'],
    ['ssh://git@github.com/o/r', 'must use https:'],
    ['\nhttps://u:p@github.com/o/r', 'line 2: not an npm package name or an https Git repository URL (must not contain credentials)'],
    ['https://github.com/o/r#main', 'must not contain a query or fragment'],
    ['https://github.com/o/r?ref=main', 'must not contain a query or fragment'],
    ['https://github.com/r', 'must name a repository with at least two path segments'],
    ['https://example.com/o/r/archive.tar.gz', 'must name a repository, not a tarball'],
    ['https://', 'must be an absolute URL'],
  ])('refuses %j', (line, message) => {
    expect(() => parseSources(line)).toThrow(message)
  })
})

describe('isBundle and alegoRange', () => {
  it('accepts only a bundle whose patch is a string or a list of strings', () => {
    expect([
      { patch: 'a.yml' }, { patch: ['a.yml', 'b.yml'] }, { patch: [] }, { patch: [1] }, {}, [], null, 'a.yml',
    ].map(value => isBundle({ alego: { bundle: value } }))).toEqual([true, true, true, false, false, false, false, false])
    expect(isBundle(undefined)).toBe(false)
  })

  it('copies engines.alego, else joins ALEGO peer ranges, and refuses ranges installation rejects', () => {
    expect(alegoRange({ engines: { alego: '>=0.2.0' }, peerDependencies: { '@singula-ai/alego': '1' } })).toBe('>=0.2.0')
    expect(alegoRange({ peerDependencies: { react: '18', '@singula-ai/alego-agent': 'workspace:*', '@singula-ai/alego': '*' } })).toBeUndefined()
    // Installation refuses an empty range, any `workspace:` engines.alego, and a padded workspace peer on every ALEGO version.
    for (const manifest of [
      { peerDependencies: { '@singula-ai/alego': ' ' } }, { engines: { alego: '' } }, { engines: { alego: 'workspace:*' } },
      { peerDependencies: { '@singula-ai/alego': ' workspace:*' } },
    ]) expect(alegoRange(manifest)).toBeInstanceOf(Error)
    expect(alegoRange({ engines: { alego: '>1 <1' } })).toEqual(new Error('no ALEGO version satisfies the ALEGO range: >1 <1'))
    expect(alegoRange({ engines: { alego: ' * ' } })).toBeUndefined()
    expect(alegoRange({ engines: { node: '22' }, peerDependencies: [] })).toBeUndefined()
    expect(alegoRange({
      peerDependencies: { '@singula-ai/alego-a': '^0.2.0 || ^0.3.0', '@singula-ai/alego-b': '>=0.2.1', '@singula-ai/alego-c': '>=0.2.1', '@singula-ai/alego-d': '<1 ||' },
    })).toBe('>=0.2.0 <0.3.0-0 >=0.2.1 || >=0.3.0 <0.4.0-0 >=0.2.1')
    // A hyphen range is expanded before combining, and combinations no version satisfies are dropped.
    expect(alegoRange({ peerDependencies: { '@singula-ai/alego': '1.0.0 - 2.0.0', '@singula-ai/alego-x': '>=1.5.0 || <0.5.0' } })).toBe('>=1.0.0-0 <2.0.1-0 >=1.5.0')
    expect(alegoRange({ peerDependencies: { '@singula-ai/alego': '^0.1.0', '@singula-ai/alego-x': '^0.2.0' } }))
      .toEqual(new Error('no ALEGO version satisfies every ALEGO peer range: ^0.1.0, ^0.2.0'))
    expect(alegoRange({ peerDependencies: { '@singula-ai/alego': '^0.2.0-rc.1' } })).toBe('^0.2.0-rc.1')
    expect(alegoRange({ peerDependencies: { '@singula-ai/alego': '>=0.1.0 || *', '@singula-ai/alego-x': '^0.2.0 || *' } })).toBeUndefined()
    expect(alegoRange({ peerDependencies: { '@singula-ai/alego': '<0.1.0', '@singula-ai/alego-x': '>=0.2.0' } }))
      .toEqual(new Error('no ALEGO version satisfies every ALEGO peer range: <0.1.0, >=0.2.0'))
    expect(alegoRange({ peerDependencies: { '@singula-ai/alego': '*', '@singula-ai/alego-x': '>=0' } })).toBeUndefined()
    expect(alegoRange({ peerDependencies: { '@singula-ai/alego-llm': '*', '@singula-ai/alego-x': '*' } })).toBeUndefined()
    const wide = Object.fromEntries(Array.from({ length: 3 }, (_, peer) => [`@singula-ai/alego-${peer}`, Array.from({ length: 10 }, (_, minor) => `>=0.${minor}.${peer}`).join(' || ')]))
    expect(alegoRange({ peerDependencies: wide })).toEqual(new Error('ALEGO peer ranges combine into more than 256 alternatives'))
    expect(alegoRange({ peerDependencies: { '@singula-ai/alego-a': 'workspace:>=1' } })).toEqual(new Error('ALEGO range "workspace:>=1" is not a valid SemVer range'))
    expect(alegoRange({ engines: { alego: 'not a range' } })).toBeInstanceOf(Error)
    expect(alegoRange({ peerDependencies: { '@singula-ai/alego': '>=0.2.0', '@singula-ai/alego-x': 'not a range' } })).toEqual(new Error('ALEGO range "not a range" is not a valid SemVer range'))
  })
})

describe('findBundlePackages', () => {
  it('takes the root package when it is a bundle, even with workspaces', async () => {
    expect(await findBundlePackages(tree({ 'package.json': bundle('root', { workspaces: ['packages/*'] }), 'packages/a/package.json': bundle('a') }))).toEqual([''])
  })

  it('expands package.json and pnpm workspace globs', async () => {
    const files = tree({
      'package.json': JSON.stringify({ name: 'mono', private: true, workspaces: { packages: ['plugins/*'] } }),
      'pnpm-workspace.yaml': 'packages:\n  - tools/**\n  - single\n  - "!plugins/excluded"\n  - "packages/*/*"\n  - "alego-*"\n  - missing\n',
      'plugins/a/package.json': bundle('a'),
      'plugins/lib/package.json': JSON.stringify({ name: 'lib', version: '1.0.0' }),
      'tools/group/b/package.json': bundle('b'),
      'single/package.json': bundle('single'),
      'packages/core/c/package.json': bundle('c'),
      'alego-x/package.json': bundle('x'),
      'other/package.json': bundle('other'),
    })
    const warnings: string[] = []
    expect(await findBundlePackages(files, (message) => { warnings.push(message) })).toEqual(['alego-x', 'packages/core/c', 'plugins/a', 'single', 'tools/group/b'])
    expect(warnings).toEqual(['workspace glob "missing" matches no directory'])
  })

  it('scans three levels without a root manifest, skipping test, example, hidden, and node_modules trees', async () => {
    const files = tree({
      'alego-pet/package.json': bundle('pet'),
      'alego-pet/runtime/helper/package.json': bundle('nested-under-bundle'),
      'plugins/alego/package.json': bundle('alego'),
      'a/b/c/package.json': bundle('deep'),
      'a/b/c/d/package.json': bundle('under-bundle'),
      'x/y/z/w/package.json': bundle('too-deep'),
      'examples/template/package.json': bundle('example'),
      'node_modules/x/package.json': bundle('dependency'),
      '.hidden/package.json': bundle('hidden'),
      'broken/package.json': '{',
      'array/package.json': '[]',
    })
    expect(await findBundlePackages(files)).toEqual(['a/b/c', 'alego-pet', 'plugins/alego'])
    expect(await readManifest(files, 'broken')).toBeUndefined()
    expect(await readManifest(files, 'array')).toBeUndefined()
  })

  it('ignores a malformed workspace file and parent-relative globs', async () => {
    const files = tree({ 'pnpm-workspace.yaml': 'packages: [', 'package.json': JSON.stringify({ workspaces: ['../x', 'missing/*'] }), 'p/package.json': bundle('p') })
    expect(await findBundlePackages(files)).toEqual(['p'])
    expect(await findBundlePackages(tree({ 'pnpm-workspace.yaml': 'packages: p', 'p/package.json': bundle('p') }))).toEqual(['p'])
  })
})

describe('PackageFiles', () => {
  it('resolves references inside the tree only', () => {
    expect([['', './a/b'], ['a', '../c'], ['a', '../..'], ['', '/etc/passwd'], ['a', '.'], ['', 'x/']].map(([base, path]) => PackageFiles.resolve(base as string, path as string)))
      .toEqual(['a/b', 'c', undefined, undefined, 'a', 'x'])
  })

  it('lists directories and files and reroots subtrees', async () => {
    const files = tree({ 'a/x.json': '1', 'a/b/y.json': '2', 'z': '3' })
    expect([files.directories(''), files.fileNames(''), files.fileNames('a'), files.directories('missing'), files.fileNames('missing')])
      .toEqual([['a'], ['z'], ['x.json'], [], []])
    expect(files.within('')).toBe(files)
    expect(Buffer.from(await files.within('a').read('b/y.json') ?? []).toString()).toBe('2')
    expect(await files.read('missing')).toBeUndefined()
  })
})

describe('readDisplayMetadata', () => {
  it.each([
    { keywords: ['search', '', ' search ', 'search', '搜索'] },
    { keywords: [] },
  ])('preserves manifest keywords $keywords', async ({ keywords }) => {
    const result = await readDisplay(tree({}), { name: 'alego-a', keywords })
    expect(result).toEqual({ display: { title: 'alego-a', metadata: { keywords } }, warnings: [] })
  })

  it('omits metadata without manifest keywords', async () => {
    expect(await readDisplay(tree({}), { name: 'alego-a' })).toEqual({ display: { title: 'alego-a' }, warnings: [] })
  })

  it.each([['search', 1], [null], 'search', null, 1, false, {}].map(keywords => ({ keywords })))('warns and omits invalid keywords $keywords entirely', async ({ keywords }) => {
    const result = await readDisplay(tree({}), { name: 'alego-a', keywords })
    expect(result).toEqual({
      display: { title: 'alego-a' },
      warnings: ['package.json keywords must be an array of strings; it is omitted'],
    })
  })

  it.each([
    ['github:jane/alego-a', { url: 'https://github.com/jane/alego-a' }],
    ['jane/alego-a', { url: 'https://github.com/jane/alego-a' }],
    ['  github:jane/alego-a  ', { url: 'https://github.com/jane/alego-a' }],
    ['github:jane/alego-a#semver:^1', { url: 'https://github.com/jane/alego-a' }],
    [{ type: 'git', url: 'git+ssh://git@github.com/jane/plugins.git', directory: 'packages/a' }, { url: 'https://github.com/jane/plugins', directory: 'packages/a' }],
    [{ url: 'git+https://u:p@git.example/g/sub/r.git?x=1#main', directory: './packages/a/' }, { url: 'https://git.example/g/sub/r', directory: 'packages/a' }],
    [{ url: 'http://git.intranet/o/r' }, { url: 'http://git.intranet/o/r' }],
  ])('converts the manifest repository %j to its web page', async (repository, expected) => {
    expect(await readDisplay(tree({}), { name: 'alego-a', repository })).toEqual({ display: { title: 'alego-a', repository: expected }, warnings: [] })
  })

  it.each([
    'git://git.example/o/r.git',
    { url: 'ssh://git@git.example/o/r.git' },
    { directory: 'packages/a' },
    3,
  ])('warns and omits a repository %j without an http(s) page', async (repository) => {
    expect(await readDisplay(tree({}), { name: 'alego-a', repository })).toEqual({
      display: { title: 'alego-a' },
      warnings: [`package.json repository ${JSON.stringify(repository)} names no http(s) repository page; it is omitted`],
    })
  })

  it.each(['../a', 'a/./b', 'a b', 4])('keeps the repository but omits the directory %j', async (directory) => {
    expect(await readDisplay(tree({}), { name: 'alego-a', repository: { url: 'https://github.com/o/r', directory } })).toEqual({
      display: { title: 'alego-a', repository: { url: 'https://github.com/o/r' } },
      warnings: [`package.json repository.directory ${JSON.stringify(directory)} is not a relative directory; it is omitted`],
    })
  })

  it('copies an http(s) homepage as written and reports any other value without a substitute', async () => {
    const homepage = 'https://github.com/jane/alego-a#readme'
    expect((await readDisplay(tree({}), { name: 'alego-a', homepage })).display).toEqual({ title: 'alego-a', homepage })
    // A repository stays its own field and does not replace a rejected homepage.
    const manifest = { name: 'alego-a', homepage: 'javascript:alert(1)', repository: 'https://github.com/jane/alego-a' }
    const rejected = await readDisplay(tree({}), manifest)
    expect(rejected.display).toEqual({ title: 'alego-a', repository: { url: 'https://github.com/jane/alego-a' } })
    expect(rejected.warnings).toEqual(['package.json homepage "javascript:alert(1)" is not an http(s) URL; it is omitted'])
    expect((await readDisplay(tree({}), { name: 'alego-a', homepage: 'docs/readme' })).display).toEqual({ title: 'alego-a' })
  })

  it('combines locale meta with manifest fallbacks, reports unusable locale files, and reads the author', async () => {
    const files = tree({
      'locale/en.json': JSON.stringify({ meta: { title: 'Alpha' } }),
      'locale/fr.json': JSON.stringify({ meta: {} }),
      'locale/zh.json': JSON.stringify({ meta: { title: '甲', description: '做甲' } }),
      'locale/FR.json': JSON.stringify({ meta: { title: 'Alpha (fr)' } }),
      'locale/Bad_Name.json': '{}',
      'locale/de.json': '{',
      'locale/es.json': '[]',
      'locale/it.json': JSON.stringify({ meta: 'x' }),
      'locale/ja.json': JSON.stringify({ meta: { title: 1 } }),
      'locale/ko.json': JSON.stringify({}),
      'locale/readme.md': 'not a locale',
    })
    const { display, warnings } = await readDisplay(files, { name: 'alego-a', description: 'Does A', author: { name: 'Jane', email: 'j@example.com' } })
    expect(display).toEqual({ title: { en: 'Alpha', fr: 'Alpha (fr)', zh: '甲' }, description: { en: 'Does A', zh: '做甲' }, author: 'Jane' })
    expect(warnings).toEqual([
      'locale file locale/Bad_Name.json ignored: its name is not a language id',
      expect.stringMatching(/^locale file locale\/de\.json ignored: SyntaxError/u) as string,
      'locale file locale/es.json ignored: must be a JSON object',
      'locale file locale/fr.json ignored: duplicates locale fr',
      'locale file locale/it.json ignored: meta must be an object',
      'locale file locale/ja.json ignored: meta.title must be a non-empty string',
    ])
  })

  it('reads no locale directory without locale/en.json and returns plain strings without translations', async () => {
    expect((await readDisplay(tree({ 'locale/zh.json': JSON.stringify({ meta: { title: '甲' } }) }), { name: 'alego-a', author: 'Jane <j@example.com>' })).display)
      .toEqual({ title: 'alego-a', author: 'Jane' })
    expect((await readDisplay(tree({ 'locale/en.json': JSON.stringify({ meta: { description: 'English only' } }) }), { name: 'alego-a', author: { url: 'x' } })).display)
      .toEqual({ title: 'alego-a', description: 'English only' })
    expect((await readDisplay(tree({ 'locale/en.json': '{}', 'locale/zh.json': JSON.stringify({ meta: { description: '只有中文' } }) }), { name: 'alego-a' })).display)
      .toEqual({ title: 'alego-a' })
  })

  it('resolves locale files and the icon through the exports map', async () => {
    const files = tree({
      'dist/locale/en.json': JSON.stringify({ meta: { title: 'Alpha' } }),
      'dist/locale/zh.json': JSON.stringify({ meta: { title: '甲' } }),
      'dist/locale/fr.json': JSON.stringify({ meta: { title: 'Alpha (fr)' } }),
      'other/fr.json': JSON.stringify({ meta: { title: 'elsewhere' } }),
      'locale/en.json': JSON.stringify({ meta: { title: 'not exported' } }),
      'art/icon.svg': '<svg/>',
      'icon.svg': '<svg>unexported</svg>',
    })
    const { display, warnings } = await readDisplay(files, {
      name: 'alego-a',
      exports: { './locale/fr.json': './other/fr.json', './locale/*': './dist/locale/*', './icon': { types: './icon.d.ts', default: './art/icon.svg' } },
    })
    expect(display).toEqual({ title: { en: 'Alpha', zh: '甲' }, icon: 'data:image/svg+xml;base64,PHN2Zy8+' })
    expect(warnings).toEqual(['locale file dist/locale/fr.json ignored: ./locale/fr.json does not resolve into dist/locale'])
    expect((await readDisplay(files, { name: 'alego-a', exports: { '.': './index.js' } })).display).toEqual({ title: 'alego-a' })
    const flat = tree({ 'en.json': JSON.stringify({ meta: { title: 'Alpha' } }), 'zh.json': JSON.stringify({ meta: { title: '甲' } }), 'package.json': '{}' })
    expect((await readDisplay(flat, { exports: { './locale/*': './*' } })).display).toEqual({ title: { en: 'Alpha', zh: '甲' } })
    expect((await readDisplay(flat, {})).display).toEqual({})
    expect((await readDisplay(files, { name: 'alego-a', exports: { './locale/en.json': './../outside.json' } })).display).toEqual({ title: 'alego-a' })
  })

  it('inlines small icons, returns larger ones as files, and prefers the manifest icon', async () => {
    const files = tree({ 'icon.svg': '<svg/>', 'big.png': new Uint8Array(200), 'assets/i.webp': new Uint8Array(4) })
    expect((await readDisplay(files, { name: 'a', icon: './icon.svg', exports: { './icon': './assets/i.webp' } })).display.icon).toBe('data:image/svg+xml;base64,PHN2Zy8+')
    const large = await readDisplay(files, { name: 'a', icon: 'big.png' })
    expect(large.display.icon).toMatch(/^icons\/[0-9a-f]{16}\.png$/u)
    expect(large.iconFile?.bytes.length).toBe(200)
    expect((await readDisplay(files, { name: 'a', exports: { './icon': { import: { default: './assets/i.webp' } } } })).display.icon).toBe('data:image/webp;base64,AAAAAA==')
    expect((await readDisplay(files, { name: 'a', exports: { './icon': [] } })).warnings).toEqual([])
  })

  it('reports icons that are not used', async () => {
    const files = tree({ 'icon.gif': 'GIF89a', 'huge.png': new Uint8Array(256 * 1024 + 1), 'folder.png/x': '' })
    const cases: [unknown, string][] = [
      ['/etc/secret.svg', 'icon /etc/secret.svg is outside the package'],
      ['../secret.svg', 'icon ../secret.svg is outside the package'],
      ['https://cdn.example/i.png', 'icon must be a relative file path'],
      [3, 'icon must be a relative file path'],
      ['missing.svg', 'icon missing.svg is not a file in the package'],
      ['folder.png', 'icon folder.png is not a file in the package'],
      ['icon.gif', 'icon icon.gif must be SVG, PNG, JPEG, or WebP'],
      ['huge.png', 'icon huge.png exceeds 256 KiB'],
    ]
    for (const [icon, message] of cases) {
      const result = await readDisplay(files, { name: 'a', icon })
      expect([result.display.icon, result.warnings]).toEqual([undefined, [`${message}; the icon is omitted`]])
    }
  })
})
