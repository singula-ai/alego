/**
 * Package-owned invariant companion for `@singula-ai/alego-base`.
 * @module @singula-ai/alego-base/invariant
 */

import type { Context } from '@singula-ai/cordis'
import type { InvariantInstaller } from '@singula-ai/alego-invariants'

const PACKAGE_NAME = '@singula-ai/alego-base'

/** Cordis companion plugin name. */
export const name = 'base-bundle-invariant'
/** Service required before the companion can register. */
export const inject = ['invariants']

// No runtime invariant: the package is a static patch-list carrier (a YAML
// document of loader rows owned by other packages); it mounts no service,
// emits no events, and owns no mutable relation to check. Each inserted row's
// own package carries that row's invariants.
const install: InvariantInstaller = () => {}

/**
 * Register this package's invariant companion.
 * @param ctx - Cordis context carrying the invariant service.
 * @returns the installed registration's disposer after setup succeeds.
 */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
