/**
 * Package-owned invariant companion for `@singula-ai/alego-session-stats`.
 * @module @singula-ai/alego-session-stats/invariant
 */

/* jscpd:ignore-start */
import type { Context } from '@singula-ai/cordis'
import type { InvariantInstaller } from '@singula-ai/alego-invariants'

const PACKAGE_NAME = '@singula-ai/alego-session-stats'

/** Cordis companion plugin name. */
export const name = 'session-stats-invariant'
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants']

/**
 * No runtime invariant: the package owns a single pure projection fold whose
 * wire payload is schema-validated by the projection registry at every
 * snapshot and change-feed emission, and the event relations the fold relies
 * on (`step/end` exactly once per entered step, monotonic host-assigned turn
 * numbers, chunk and tool events carrying their step coordinates and call
 * ids) are owned and runtime-checked by alego-agent-loop and the session
 * surface, not here.
 */
const install: InvariantInstaller = () => {}

/**
 * Register this package's invariant companion.
 * @param ctx - Cordis context carrying the invariant service.
 * @returns the installed registration's disposer after setup succeeds.
 */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
/* jscpd:ignore-end */
