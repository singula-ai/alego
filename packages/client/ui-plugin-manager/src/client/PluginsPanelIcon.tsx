/** The sidebar's Plugins entry icon; the sidebar owns the button, label, and selected state around it. */

import type { ReactNode } from 'react'
import { IconPluginPinwheelOutlineRegular } from '@singula-ai/alego-client-ui-primitives'
import type { PropsRuntime } from '@singula-ai/alego-client-ui-slots'
import type {} from '@singula-ai/alego-client-ui-sidebar/client'

/**
 * Render the plugin glyph at the size the sidebar asks for.
 * @param props - the sidebar's icon share: the requested edge and whether the panel is selected.
 * @returns the icon element.
 */
export function PluginsPanelIcon({ size }: PropsRuntime<'sidebar.panellist'>): ReactNode {
  return <IconPluginPinwheelOutlineRegular size={size} />
}
