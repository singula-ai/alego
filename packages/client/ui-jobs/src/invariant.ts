/**
 * Package-owned invariant companion for `@alego/client-ui-jobs`.
 * @module @alego/client-ui-jobs/invariant
 */

/* jscpd:ignore-start */
import type { Context } from '@alego/cordis'
import type { InvariantInstaller } from '@alego/invariants'

const PACKAGE_NAME = '@alego/client-ui-jobs'

/** Cordis companion plugin name. */
export const name = 'client-ui-jobs-invariant'
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants']

/**
 * No runtime invariant: this package is a read-only projection of the
 * `jobsBySession` mirror onto one header slot entry. It emits no cordis
 * events, owns no cross-plugin mutable state, and its single slot registration
 * proves disposal through the HMR-safety spec.
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
