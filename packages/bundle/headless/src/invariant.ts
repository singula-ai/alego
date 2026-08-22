/**
 * Package-owned invariant companion for `@alego/headless`.
 * @module @alego/headless/invariant
 */

import type { Context } from '@alego/cordis'
import type { InvariantInstaller } from '@alego/invariants'

const PACKAGE_NAME = '@alego/headless'

/** Cordis companion plugin name. */
export const name = 'headless-invariant'
/** Service required before the companion can register. */
export const inject = ['invariants']

/**
 * No runtime invariant: the runner is a one-shot driver over the API carrier
 * whose observable contract (final text on stdout, exit code by turn-end
 * reason) is process-level and owned by the launcher e2e; it registers
 * nothing and holds no mutable relation to audit inside the tree.
 */
const install: InvariantInstaller = () => {}

/**
 * Register this package's invariant companion.
 * @param ctx - Cordis context carrying the invariant service.
 * @returns the installed registration's disposer after setup succeeds.
 */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
