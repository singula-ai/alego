/**
 * Package-owned invariant companion for `@singula-ai/alego-client-ui-renderer`.
 * @module @singula-ai/alego-client-ui-renderer/invariant
 */

/* jscpd:ignore-start */
import type { Context } from '@singula-ai/cordis'
import type { InvariantInstaller } from '@singula-ai/alego-invariants'

const PACKAGE_NAME = '@singula-ai/alego-client-ui-renderer'

/** Cordis companion plugin name. */
export const name = 'client-ui-renderer-invariant'
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants']

/**
 * No runtime invariant: the package installs the render adapter and provides a
 * mount callback but owns no event stream or mutable cross-plugin data relation.
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
