/** Directory collaborator for consumer-only tests with structural Agent stubs. */
import type { Context } from '@singula-ai/cordis'
import type { Agent } from '@singula-ai/alego-agent'
import type { Session } from '@singula-ai/alego-session'

/**
 * Supply fixed directory values without filesystem checks or durable changes.
 * @param ctx - context owning this test collaborator.
 * @param defaultDirectory - fallback for fixtures without a Session directory.
 */
export function provideWorkingDirectoryFixture(ctx: Context, defaultDirectory = process.cwd()): void {
  const get = (session: Session): string => session.header.cwd ?? defaultDirectory
  ctx.provide('workingDirectory', {
    defaultDirectory,
    get,
    ensure: (agent: Agent): Promise<string> => Promise.resolve(get(agent.session)),
  })
}
