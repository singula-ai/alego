import type { Context } from '@singula-ai/cordis'
import '@singula-ai/alego-user-questions'

/** Snapshot-only answerer whose invocation means the child guard failed. */
export const name = 'child-question-tripwire'

/** User-interaction service required by the tripwire answerer. */
export const inject = ['userQuestions']

/** Register an answerer that must remain unreachable for the delegated call. */
export function apply(ctx: Context): void {
  ctx.on('user-questions/request', async () => {
    throw new Error('snapshot tripwire: delegated question reached the UI answerer')
  })
}
