import { Context, Service } from '@singula-ai/cordis'
import { resolve } from 'node:path'
import type { Agent } from '@singula-ai/alego-agent'
import type { Session } from '@singula-ai/alego-session'

/** Directory selection for orchestration fixtures whose paths are symbolic and whose logs exclude context providers. */
class FixtureWorkingDirectory extends Service {
  private readonly directories = new WeakMap<Session, string>()

  constructor(ctx: Context) {
    super(ctx, 'workingDirectory')
  }

  get(session: Session): string {
    return this.directories.get(session) ?? session?.header.cwd ?? process.cwd()
  }

  async ensure(agent: Agent, signal?: AbortSignal): Promise<string> {
    signal?.throwIfAborted()
    return this.get(agent.session)
  }

  async set(agent: Agent, path: string, signal?: AbortSignal): Promise<string> {
    signal?.throwIfAborted()
    const cwd = resolve(this.get(agent.session), path)
    this.directories.set(agent.session, cwd)
    return cwd
  }
}

/** Mount the directory collaborator without filesystem or model-context behavior unrelated to an orchestration test. */
export async function mountWorkingDirectoryFixture(ctx: Context): Promise<void> {
  if (ctx.get('workingDirectory') === undefined) await ctx.plugin(FixtureWorkingDirectory)
}
