/** Stable React identities for the two grouping reference kinds. */
import type { RenderEntry } from '@singula-ai/alego-client-ui-conversation/client'
import { assertNever } from '@singula-ai/alego-util-values'

/**
 * Identify a rendering position independently of presentation mode.
 * @param entry - mode-independent rendering reference.
 * @returns its collision-free React key.
 */
export function chatRenderKey(entry: RenderEntry): string {
  switch (entry.kind) {
    case 'node': return JSON.stringify(['node', entry.key, entry.groupPart ?? null])
    case 'group': return JSON.stringify(['group', entry.key])
    default: return assertNever(entry)
  }
}
