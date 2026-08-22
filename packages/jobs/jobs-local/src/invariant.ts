/**
 * Package-owned invariant companion for `@alego/jobs-local`.
 * @module @alego/jobs-local/invariant
 */

/* jscpd:ignore-start */
import type { Context } from '@alego/cordis'
import type { InvariantInstaller } from '@alego/invariants'

const PACKAGE_NAME = '@alego/jobs-local'

/** Cordis companion plugin name. */
export const name = 'jobs-local-invariant'
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants']

/**
 * No runtime invariant: `@alego/jobs/invariant` owns per-snapshot identity, status,
 * timestamp, and owner checks. This provider's admission decision uses private configuration and
 * must fail before a backend starter runs; `LocalJobRegistry.start()` enforces it synchronously
 * for current producers. Repeating an aggregate after publication would expose private
 * configuration solely to this companion and would not verify the fail-closed pre-start guarantee.
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
