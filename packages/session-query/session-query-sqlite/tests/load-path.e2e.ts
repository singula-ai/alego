import { createUserMessage } from '@singula-ai/alego-llm'
/**
 * Keyless real-Loader-path smoke for the combined SQLite session-query service.
 *
 * @module @singula-ai/alego-session-query-sqlite/tests/load-path
 */

import { afterEach, describe, expect, it } from 'vitest'
import { Context } from '@singula-ai/cordis'
import Loader from '@singula-ai/cordis-plugin-loader'
import SessionStore, { SessionSeq, SESSION_FORMAT_VERSION, SessionId } from '@singula-ai/alego-session'
import SessionProjectionRegistry from '@singula-ai/alego-session-projection'
import JsonlSessionPersistence from '@singula-ai/alego-session-persistence-jsonl'
import SqliteSessionQueryEngine, * as queryModule from '@singula-ai/alego-session-query-sqlite'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const temporaryDirectories: string[] = []

afterEach(async () => {
  for (const directory of temporaryDirectories.splice(0)) {
    await rm(directory, { recursive: true, force: true })
  }
})

async function temporaryPath(name: string): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'alego-session-search-loader-'))
  temporaryDirectories.push(directory)
  return join(directory, name)
}

describe('alego-session-query-sqlite real Loader path', () => {
  it('unwraps, mounts, and searches the real persistence backend', async () => {
    const persistenceRoot = await temporaryPath('canonical')
    const searchPath = await temporaryPath('derived.db')
    const ctx = new Context()
    await ctx.plugin(SessionProjectionRegistry)
    await ctx.plugin(SessionStore)
    const persistence = await ctx.plugin(JsonlSessionPersistence, {
      root: persistenceRoot,
      compression: 'none',
    })

    const loader = Object.create(Loader.prototype) as Loader
    const unwrapped = loader.unwrapExports(queryModule) as Parameters<Context['plugin']>[0]
    expect(unwrapped).toBe(SqliteSessionQueryEngine)
    const query = await ctx.plugin(unwrapped, { path: searchPath })

    const id = SessionId('loader-path')
    const writer = await ctx.sessionPersistence.create({ version: SESSION_FORMAT_VERSION, id, createdAt: 10, isSeeded: false })
    await writer.append([{
      type: 'user/message',
      seq: SessionSeq(0),
      time: 10,
      data: createUserMessage({
        content: [{ type: 'text', text: 'real Loader needle' }], source: { kind: 'user' },
      }),
      surfaceOp: 'append',
    }])
    await writer.close()

    await expect(ctx.sessionQuery.searchSessions({ query: 'Loader needle' }))
      .resolves.toMatchObject({ items: [{ header: { id }, persisted: true, live: false }] })
    await expect(ctx.sessionQuery.listSessions())
      .resolves.toMatchObject([{ header: { id }, persisted: true, live: false }])
    await query.dispose()
    await persistence.dispose()
  })
})
