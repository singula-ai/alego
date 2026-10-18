/** Fixed POSIX directory context for synthetic compaction pressure recordings. */
import type { Context } from '@singula-ai/cordis'
import type {} from '@singula-ai/alego-agent'

/** Stable Loader identity. */
export const name = 'compaction-working-directory'

/**
 * Set the initial effective directory before any model request while retaining the original project.
 * @param ctx - plugin context observing Agent creation.
 */
export function apply(ctx: Context): void {
  ctx.on('agent/created', async ({ agent }) => {
    agent.session.append('working-directory/change', { cwd: '/tmp' })
  })
}
