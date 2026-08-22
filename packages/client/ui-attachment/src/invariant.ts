/**
 * Package-owned invariant companion for `@alego/client-ui-attachment`.
 * @module @alego/client-ui-attachment/invariant
 */

/* jscpd:ignore-start */
import type { Context } from '@alego/cordis'
import type { InvariantInstaller } from '@alego/invariants'

const PACKAGE_NAME = '@alego/client-ui-attachment'

/** Cordis companion plugin name. */
export const name = 'client-ui-attachment-invariant'
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants']

/**
 * No runtime invariant: the package contributes only effect-owned slot entries;
 * the slot registry owns their lifecycle and validates their declarations.
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
