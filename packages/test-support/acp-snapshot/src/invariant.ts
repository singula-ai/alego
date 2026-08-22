/**
 * Package-owned invariant companion for `@alego/acp-snapshot`.
 * @module @alego/acp-snapshot/invariant
 */

/* jscpd:ignore-start */
import type { Context } from '@alego/cordis'
import type { InvariantInstaller } from '@alego/invariants'

const PACKAGE_NAME = '@alego/acp-snapshot'

/** Cordis companion plugin name. */
export const name = 'acp-snapshot-invariant'
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants']

/**
 * No runtime invariant: this test-support package owns no production event stream or mutable data;
 * consuming test suites exercise its behavior.
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
