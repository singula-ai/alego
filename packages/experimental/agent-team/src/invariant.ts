/** Package-owned relational checks for Agent Teams durable records. */

import type { Context } from '@singula-ai/cordis'
import type { InvariantFailure, InvariantInstaller } from '@singula-ai/alego-invariants'
import type { Session, SessionEvent } from '@singula-ai/alego-session'
import { applyTeamEvent, foldTeam, isTeamEvent } from './fold.ts'

const PACKAGE_NAME = '@singula-ai/alego-experimental-agent-team'

/** Cordis companion plugin name. */
export const name = 'team-invariant'
/** Invariant registry required by the companion. */
export const inject = ['invariants']

/** Validate candidate Team events against the committed prefix before append. */
const install: InvariantInstaller = Object.assign((ctx: Context, fail: InvariantFailure) => {
  ctx.on('internal/dispatch', (_mode, eventName, args) => {
    if (eventName !== 'session/event') return
    const [session, event] = args as [Session, SessionEvent]
    if (!isTeamEvent(event)) return
    try {
      const state = foldTeam(session.id, session.events)
      applyTeamEvent(state, event)
    } catch (error: unknown) {
      /* v8 ignore next -- the strict Team fold throws Error instances. */
      const message = error instanceof Error ? error.message : String(error)
      fail(`session event ${event.seq} violates the Agent Teams stream: ${message}`)
    }
  }, { global: true })
}, { inject: ['sessions'] })

/** Register the package invariant companion. */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
