/** Agent Teams runtime invariant companion. */

import type { Context } from '@singula-ai/cordis'
import type { InvariantFailure, InvariantInstaller } from '@singula-ai/alego-invariants'
import type { Session, SessionEvent } from '@singula-ai/alego-session'
import {
  isTeamEvent,
  teamProjectionDefinition,
  type TeamProjectionState,
} from './projection.ts'

const PACKAGE_NAME = '@singula-ai/alego-experimental-agent-team'

/** Cordis companion plugin name. */
export const name = 'team-invariant'
/** Invariant registry required by the companion. */
export const inject = ['invariants']

/** Validate candidate Team events against the projected committed prefix. */
const install: InvariantInstaller = Object.assign((ctx: Context, fail: InvariantFailure) => {
  ctx.on('internal/dispatch', (_mode, eventName, args) => {
    if (eventName !== 'session/event') return
    const [session, event] = args as [Session, SessionEvent]
    /* v8 ignore next -- non-Team Session events have no Agent Teams invariant. */
    if (!isTeamEvent(event)) return
    const state = ctx.sessionProjections.stateOf(session, 'agentTeam') as TeamProjectionState
    const candidate = teamProjectionDefinition.apply(structuredClone(state), event)
    if (candidate.failure !== undefined) {
      fail(`session event ${event.seq} violates the Agent Teams stream: ${candidate.failure}`)
    }
  }, { global: true })
}, { inject: ['sessionProjections'] })

/** Register the package invariant companion. */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
