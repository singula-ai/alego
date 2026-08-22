/**
 * Package-owned invariant companion for `@alego/anonymous-user-id`.
 * @module @alego/anonymous-user-id/invariant
 */

/* jscpd:ignore-start */
import type { Context } from '@alego/cordis'
import type { InvariantInstaller } from '@alego/invariants'

const PACKAGE_NAME = '@alego/anonymous-user-id'

/** Cordis companion plugin name. */
export const name = 'anonymous-user-id-invariant'
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants']

/**
 * No runtime invariant: the API owns one private memo and one best-effort
 * file, with no independent event stream or public mutable relation for a
 * companion to compare without creating the identity as a side effect.
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
