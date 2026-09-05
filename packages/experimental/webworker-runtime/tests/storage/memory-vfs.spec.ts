/**
 * The identity, timestamp, link, mutation, and durability-sink guarantees
 * MemoryVfs owes its consumers, asserted directly rather than through the
 * `node:fs` bridge.
 *
 * `alego-fs-local` builds a version token from `dev:ino:size:mtimeNs:ctimeNs` and
 * refuses a write whose token moved since it read. Two properties carry that:
 * `ino` identifies the entry at a path, and `mtimeMs` moves on every write. The
 * timestamp cases freeze the clock, because these writes are in memory and two
 * revisions routinely land in the same millisecond — a real-clock test passes
 * whether or not the strict increment exists.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryVfs } from '../../src/storage/memory.ts'
import type { VfsBigIntStats, VfsMutation, VfsMutationSink, VfsStats } from '../../src/storage/types.ts'

const identity = (vfs: MemoryVfs, path: string): bigint =>
  (vfs.statSync(path, { bigint: true }) as VfsBigIntStats).ino

const linkCount = (vfs: MemoryVfs, path: string): bigint =>
  (vfs.statSync(path, { bigint: true }) as VfsBigIntStats).nlink

const modified = (vfs: MemoryVfs, path: string): number => (vfs.statSync(path) as VfsStats).mtimeMs

afterEach(() => { vi.restoreAllMocks() })

describe('entry identity', () => {
  it('distinguishes paths and holds each identity across repeated stats', () => {
    const vfs = new MemoryVfs()
    vfs.seed('/alego/one.txt', 'one')
    vfs.seed('/alego/two.txt', 'two')
    const first = identity(vfs, '/alego/one.txt')
    expect(identity(vfs, '/alego/two.txt')).not.toBe(first)
    expect(identity(vfs, '/alego/one.txt')).toBe(first)
  })

  it('forgets the identities under a directory removed as a subtree', () => {
    const vfs = new MemoryVfs()
    vfs.seed('/alego/skills/git/SKILL.md', '# git\n')
    const before = identity(vfs, '/alego/skills/git/SKILL.md')
    vfs.rmSync('/alego/skills', { recursive: true })
    vfs.seed('/alego/skills/git/SKILL.md', '# git rebuilt\n')
    expect(identity(vfs, '/alego/skills/git/SKILL.md')).not.toBe(before)
  })

  it('moves the source identity when a file replaces another path', () => {
    const vfs = new MemoryVfs()
    vfs.seed('/alego/from.txt', 'moved')
    vfs.seed('/alego/to.txt', 'replaced')
    const [source, destination] = [identity(vfs, '/alego/from.txt'), identity(vfs, '/alego/to.txt')]
    vfs.renameSync('/alego/from.txt', '/alego/to.txt')
    const renamed = identity(vfs, '/alego/to.txt')
    expect(vfs.readFileSync('/alego/to.txt', 'utf8')).toBe('moved')
    expect([renamed === source, renamed === destination]).toEqual([true, false])
  })
})

describe('modification time', () => {
  it('hydrates explicit metadata without confusing timestamps with permission bits', () => {
    const vfs = new MemoryVfs()
    vfs.seed('/alego/restored', 'value', { mode: 0o600, mtimeMs: 1_600_000_000_000 })
    vfs.seedDirectory('/alego/restored-directory', { mode: 0o700, mtimeMs: 1_600_000_000_001 })
    const stats = vfs.statSync('/alego/restored') as VfsStats
    const directory = vfs.statSync('/alego/restored-directory') as VfsStats
    expect([stats.mode & 0o777, stats.mtimeMs]).toEqual([0o600, 1_600_000_000_000])
    expect([directory.mode & 0o777, directory.mtimeMs]).toEqual([0o700, 1_600_000_000_001])
  })

  it('advances on every write even while the clock stands still', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)
    const vfs = new MemoryVfs()
    vfs.seed('/alego/log.jsonl', 'first\n')
    const seeded = modified(vfs, '/alego/log.jsonl')
    vfs.writeFileSync('/alego/log.jsonl', 'second\n')
    const written = modified(vfs, '/alego/log.jsonl')
    vfs.appendFileSync('/alego/log.jsonl', 'third\n')
    const appended = modified(vfs, '/alego/log.jsonl')
    vfs.truncateSync('/alego/log.jsonl', 6)
    const truncated = modified(vfs, '/alego/log.jsonl')
    expect([written > seeded, appended > written, truncated > appended]).toEqual([true, true, true])
    // One millisecond per revision: the increment is the minimum that separates
    // two tokens, not a coarser bump that would skew a real timestamp.
    expect(truncated - seeded).toBe(3)
  })

  it('takes the clock once the clock has passed the entry', () => {
    const clock = vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)
    const vfs = new MemoryVfs()
    vfs.seed('/alego/log.jsonl', 'first\n')
    clock.mockReturnValue(1_700_000_005_000)
    vfs.writeFileSync('/alego/log.jsonl', 'second\n')
    expect(modified(vfs, '/alego/log.jsonl')).toBe(1_700_000_005_000)
  })

  it('extends truncation with zero bytes', async () => {
    const vfs = new MemoryVfs()
    vfs.seed('/alego/file', new Uint8Array([1, 2]))
    vfs.truncateSync('/alego/file', 5)
    expect([...vfs.readFileSync('/alego/file') as Uint8Array]).toEqual([1, 2, 0, 0, 0])
    const handle = vfs.open('/alego/file', 'r+')
    await handle.truncate(7)
    expect([...vfs.readFileSync('/alego/file') as Uint8Array]).toEqual([1, 2, 0, 0, 0, 0, 0])
  })

  it('advances a directory only when its immediate entry set changes', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)
    const vfs = new MemoryVfs()
    vfs.seedDirectory('/alego/workspace')
    const empty = modified(vfs, '/alego/workspace')
    vfs.writeFileSync('/alego/workspace/file.txt', 'one')
    const created = modified(vfs, '/alego/workspace')
    vfs.writeFileSync('/alego/workspace/file.txt', 'two')
    const rewritten = modified(vfs, '/alego/workspace')
    vfs.rmSync('/alego/workspace/file.txt')
    const removed = modified(vfs, '/alego/workspace')
    expect([created > empty, rewritten === created, removed > rewritten]).toEqual([true, true, true])
  })
})

describe('mutation publication', () => {
  it('publishes only committed runtime changes and keeps image seeding silent', () => {
    const vfs = new MemoryVfs()
    const mutations: VfsMutation[] = []
    vfs.subscribe((mutation) => { mutations.push(mutation) })
    vfs.seed('/alego/seeded.txt', 'seeded')
    expect(mutations).toEqual([])
    vfs.writeFileSync('/alego/seeded.txt', 'changed')
    vfs.mkdirSync('/alego/created')
    vfs.chmodSync('/alego/created', 0o700)
    vfs.renameSync('/alego/seeded.txt', '/alego/renamed.txt')
    vfs.rmSync('/alego/created', { recursive: true })
    expect(mutations.map(mutation => ({
      kind: mutation.kind,
      path: mutation.path,
      ...mutation.kind === 'write' ? { entryChanged: mutation.entryChanged } : {},
      ...mutation.kind === 'chmod' ? { mode: mutation.mode } : {},
    }))).toEqual([
      { kind: 'write', path: '/alego/seeded.txt', entryChanged: false },
      { kind: 'mkdir', path: '/alego/created' },
      { kind: 'chmod', path: '/alego/created', mode: 0o700 },
      { kind: 'remove', path: '/alego/seeded.txt' },
      { kind: 'write', path: '/alego/renamed.txt', entryChanged: true },
      { kind: 'remove', path: '/alego/created' },
    ])
    const renamed = mutations[4]
    expect(renamed?.kind === 'write' && new TextDecoder().decode(renamed.bytes)).toBe('changed')
    expect(() => { vfs.writeFileSync('/missing/file', 'no') }).toThrow(/ENOENT/)
    expect(mutations).toHaveLength(6)
  })

  it('contains a faulty observer and lets disposal stop later notifications', () => {
    const vfs = new MemoryVfs()
    vfs.seedDirectory('/alego')
    const reported = vi.spyOn(console, 'error').mockImplementation(() => {})
    const first = vfs.subscribe(() => { throw new Error('observer failed') })
    const seen: string[] = []
    const second = vfs.subscribe((mutation) => { seen.push(mutation.path) })
    vfs.writeFileSync('/alego/one', '1')
    first()
    second()
    vfs.writeFileSync('/alego/two', '2')
    expect(seen).toEqual(['/alego/one'])
    expect(reported).toHaveBeenCalledOnce()
  })

  it('feeds the same complete mutations to a durable sink and live subscribers', async () => {
    const recorded: VfsMutation[] = []
    let flushes = 0
    const sink: VfsMutationSink = {
      record: (mutation) => { recorded.push(mutation) },
      flush: async () => { flushes += 1 },
    }
    const vfs = new MemoryVfs({ sink })
    vfs.seedDirectory('/alego')
    const observed: VfsMutation[] = []
    vfs.subscribe((mutation) => { observed.push(mutation) })
    vfs.writeFileSync('/alego/log', 'a')
    vfs.appendFileSync('/alego/log', 'bc')
    await vfs.flush()
    expect(observed).toEqual(recorded)
    expect(observed[0]).toBe(recorded[0])
    expect(recorded[0]).toMatchObject({ kind: 'write', path: '/alego/log', mode: 0o644, entryChanged: true })
    expect(recorded[1]).toMatchObject({ kind: 'write', path: '/alego/log', mode: 0o644, entryChanged: false, appendedFrom: 1 })
    expect(recorded[1]?.kind === 'write' && new TextDecoder().decode(recorded[1].bytes)).toBe('abc')
    expect(flushes).toBe(1)
  })

  it('publishes descriptor writes at the file identity current path', () => {
    const mutations: VfsMutation[] = []
    const vfs = new MemoryVfs()
    vfs.seed('/alego/source', 'old')
    const descriptor = vfs.openFileSync('/alego/source', 'r+')
    vfs.subscribe((mutation) => { mutations.push(mutation) })
    vfs.renameSync('/alego/source', '/alego/destination')
    mutations.length = 0
    descriptor.write(0, new TextEncoder().encode('new'))
    expect(mutations.map(mutation => mutation.path)).toEqual(['/alego/destination'])
    expect(vfs.readFileSync('/alego/destination', 'utf8')).toBe('new')
    vfs.unlinkSync('/alego/destination')
    mutations.length = 0
    descriptor.write(0, new TextEncoder().encode('detached'))
    expect(mutations).toEqual([])
    expect(new TextDecoder().decode(descriptor.read(0, descriptor.stat().size))).toBe('detached')
  })

  it('decomposes a directory rename into replayable destination state', () => {
    const recorded: VfsMutation[] = []
    const vfs = new MemoryVfs({
      sink: { record: (mutation) => { recorded.push(mutation) }, flush: () => Promise.resolve() },
    })
    vfs.seedDirectory('/alego/staging/nested', { mode: 0o700 })
    vfs.seed('/alego/staging/nested/file', 'value', { mode: 0o600 })
    vfs.renameSync('/alego/staging', '/alego/published')

    expect(recorded.map(mutation => [mutation.kind, mutation.path])).toEqual([
      ['remove', '/alego/staging'],
      ['mkdir', '/alego/published'],
      ['mkdir', '/alego/published/nested'],
      ['write', '/alego/published/nested/file'],
    ])
    expect(recorded[3]).toMatchObject({ kind: 'write', mode: 0o600, entryChanged: true })
    expect(recorded[3]?.kind === 'write' && new TextDecoder().decode(recorded[3].bytes)).toBe('value')
  })
})

describe('directory rename', () => {
  it('rejects file, non-empty directory, and missing-parent destinations before mutation', () => {
    const vfs = new MemoryVfs()
    vfs.seed('/alego/source/nested/file', 'source')
    vfs.seed('/alego/file', 'destination')
    vfs.seed('/alego/non-empty/child', 'destination')
    const mutations: VfsMutation[] = []
    vfs.subscribe((mutation) => { mutations.push(mutation) })

    expect(() => { vfs.renameSync('/alego/source', '/alego/file') })
      .toThrow(expect.objectContaining({ code: 'ENOTDIR' }))
    expect(() => { vfs.renameSync('/alego/source', '/alego/non-empty') })
      .toThrow(expect.objectContaining({ code: 'ENOTEMPTY' }))
    expect(() => { vfs.renameSync('/alego/source', '/missing/destination') })
      .toThrow(expect.objectContaining({ code: 'ENOENT' }))

    expect(vfs.readFileSync('/alego/source/nested/file', 'utf8')).toBe('source')
    expect(vfs.readFileSync('/alego/file', 'utf8')).toBe('destination')
    expect(vfs.readFileSync('/alego/non-empty/child', 'utf8')).toBe('destination')
    expect(mutations).toEqual([])
  })

  it('replaces an empty directory with the source subtree', () => {
    const vfs = new MemoryVfs()
    vfs.seedDirectory('/alego/source/nested', { mode: 0o700 })
    vfs.seed('/alego/source/nested/file', 'source')
    vfs.seedDirectory('/alego/destination', { mode: 0o711 })

    vfs.renameSync('/alego/source', '/alego/destination')

    expect(vfs.existsSync('/alego/source')).toBe(false)
    expect(vfs.readFileSync('/alego/destination/nested/file', 'utf8')).toBe('source')
    expect((vfs.statSync('/alego/destination') as VfsStats).mode & 0o777).toBe(0o755)
    expect((vfs.statSync('/alego/destination/nested') as VfsStats).mode & 0o777).toBe(0o700)
  })
})

describe('hard links', () => {
  it('shares identity, bytes, and mode until one name is removed', () => {
    const vfs = new MemoryVfs()
    vfs.seed('/alego/session.jsonl', 'committed\n')
    vfs.linkSync('/alego/session.jsonl', '/alego/session-latest.jsonl')
    vfs.linkSync('/alego/session-latest.jsonl', '/alego/session-archive.jsonl')
    expect(identity(vfs, '/alego/session-latest.jsonl')).toBe(identity(vfs, '/alego/session.jsonl'))
    expect(linkCount(vfs, '/alego/session.jsonl')).toBe(3n)
    expect(vfs.readFileSync('/alego/session-latest.jsonl', 'utf8')).toBe('committed\n')
    const changedPaths: string[] = []
    vfs.subscribe((mutation) => { changedPaths.push(mutation.path) })
    vfs.appendFileSync('/alego/session.jsonl', 'appended\n')
    expect(changedPaths).toEqual([
      '/alego/session.jsonl',
      '/alego/session-latest.jsonl',
      '/alego/session-archive.jsonl',
    ])
    expect(vfs.readFileSync('/alego/session.jsonl', 'utf8')).toBe('committed\nappended\n')
    expect(vfs.readFileSync('/alego/session-latest.jsonl', 'utf8')).toBe('committed\nappended\n')
    vfs.chmodSync('/alego/session-latest.jsonl', 0o600)
    expect((vfs.statSync('/alego/session.jsonl') as VfsStats).mode & 0o777).toBe(0o600)
    vfs.unlinkSync('/alego/session-latest.jsonl')
    expect(linkCount(vfs, '/alego/session.jsonl')).toBe(2n)
    vfs.unlinkSync('/alego/session-archive.jsonl')
    expect(linkCount(vfs, '/alego/session.jsonl')).toBe(1n)
    expect(vfs.readFileSync('/alego/session.jsonl', 'utf8')).toBe('committed\nappended\n')
  })

  it('treats rename between names of the same node as a no-op', () => {
    const vfs = new MemoryVfs()
    vfs.seed('/alego/source', 'value')
    vfs.linkSync('/alego/source', '/alego/alias')
    const mutations: VfsMutation[] = []
    vfs.subscribe((mutation) => { mutations.push(mutation) })

    vfs.renameSync('/alego/source', '/alego/alias')

    expect(vfs.readFileSync('/alego/source', 'utf8')).toBe('value')
    expect(vfs.readFileSync('/alego/alias', 'utf8')).toBe('value')
    expect(linkCount(vfs, '/alego/source')).toBe(2n)
    expect(mutations).toEqual([])
  })

  it('retargets linked names through file replacement and directory moves', () => {
    const vfs = new MemoryVfs()
    vfs.seed('/alego/replacement', 'replacement')
    vfs.seed('/alego/target', 'old')
    vfs.linkSync('/alego/target', '/alego/target-alias')
    const replaced = vfs.openFileSync('/alego/target', 'r+')
    vfs.renameSync('/alego/replacement', '/alego/target')
    const mutations: VfsMutation[] = []
    vfs.subscribe((mutation) => { mutations.push(mutation) })

    replaced.write(0, new TextEncoder().encode('changed'))
    expect(mutations.map(mutation => mutation.path)).toEqual(['/alego/target-alias'])
    expect(vfs.readFileSync('/alego/target', 'utf8')).toBe('replacement')
    expect(vfs.readFileSync('/alego/target-alias', 'utf8')).toBe('changed')
    expect(linkCount(vfs, '/alego/target-alias')).toBe(1n)

    vfs.seed('/alego/tree/file', 'tree')
    vfs.linkSync('/alego/tree/file', '/alego/outside')
    const moved = vfs.openFileSync('/alego/tree/file', 'r+')
    vfs.renameSync('/alego/tree', '/alego/moved')
    mutations.length = 0
    moved.write(0, new TextEncoder().encode('moved'))
    expect(mutations.map(mutation => mutation.path)).toEqual(['/alego/outside', '/alego/moved/file'])
    expect(linkCount(vfs, '/alego/moved/file')).toBe(2n)

    vfs.rmSync('/alego/moved', { recursive: true })
    mutations.length = 0
    moved.write(0, new TextEncoder().encode('kept!'))
    expect(mutations.map(mutation => mutation.path)).toEqual(['/alego/outside'])
    expect(vfs.readFileSync('/alego/outside', 'utf8')).toBe('kept!')
    expect(linkCount(vfs, '/alego/outside')).toBe(1n)
  })

  it('rejects renaming a file over an existing directory', () => {
    const vfs = new MemoryVfs()
    vfs.seed('/alego/file', 'value')
    vfs.seedDirectory('/alego/directory')
    expect(() => { vfs.renameSync('/alego/file', '/alego/directory') }).toThrow(expect.objectContaining({ code: 'EISDIR' }))
    expect(vfs.readFileSync('/alego/file', 'utf8')).toBe('value')
    expect(vfs.statSync('/alego/directory').isDirectory()).toBe(true)
  })
})
