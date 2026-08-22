/**
 * Package-owned invariant companion for `@singula-ai/alego-tool-str-replace-editor`.
 * @module @singula-ai/alego-tool-str-replace-editor/invariant
 */

/* jscpd:ignore-start */
import type { Context } from '@singula-ai/cordis'
import type { InvariantInstaller } from '@singula-ai/alego-invariants'

const PACKAGE_NAME = '@singula-ai/alego-tool-str-replace-editor'

/** Cordis companion plugin name. */
export const name = 'tool-str-replace-editor-invariant'
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants']

/**
 * No runtime invariant: the tool adapter owns no independent durable state;
 * filesystem mutation relations stay with the provider and policy plugins.
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
