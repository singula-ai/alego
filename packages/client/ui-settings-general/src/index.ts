/** Welcome acknowledgement stored in the plugin configuration. */
import type {} from '@singula-ai/alego-settings'

import type { Volatile, Context } from '@singula-ai/cordis'

import z from '@singula-ai/schemastery'

/** Runtime preferences projected to the browser. */
export interface Config {
  /** Last acknowledged welcome notice version. */
  welcomeNoticeVersion: Volatile<string | undefined>
}

/** Live welcome preference. */
export const Config = z.object({
  welcomeNoticeVersion: z.string().volatile(),
})

/** The browser consumes the configuration form projection.
 * @param ctx Plugin context used for optional settings presentation.
 */
export function apply(ctx: Context): void {
  ctx.inject(['settings'], (child) => { child.effect(() => child.settings.configure({ auto: false }, ctx.fiber)) })
}
