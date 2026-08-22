/**
 * Package-owned invariant companion for `@singula-ai/alego-sdk-protocol`.
 * @module @singula-ai/alego-sdk-protocol/invariant
 */

/* jscpd:ignore-start */
import type { Context } from '@singula-ai/cordis'
import type { InvariantInstaller } from '@singula-ai/alego-invariants'

const PACKAGE_NAME = '@singula-ai/alego-sdk-protocol'

/** Cordis companion plugin name. */
export const name = 'sdk-protocol-invariant'
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants']

/**
 * No runtime invariant: a pure wire library (transport class + type
 * declarations) with no event stream or mutable data relation of its own;
 * both wire ends own their protocol behavior.
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
