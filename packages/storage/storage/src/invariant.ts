/**
 * Package-owned invariant companion for `@alego/storage`.
 * @module @alego/storage/invariant
 */

/* jscpd:ignore-start */
import type { Context } from '@alego/cordis'
import type { InvariantInstaller } from '@alego/invariants'

const PACKAGE_NAME = '@alego/storage'

/** Cordis companion plugin name. */
export const name = 'storage-invariant'
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants']

/**
 * No runtime invariant: the hub is a pure registration table (names →
 * backends, forms → facilities) whose consistency is fully enforced at the
 * call sites (duplicate/missing entries fail loud synchronously); it owns no
 * event stream or mutable medium to cross-check.
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
