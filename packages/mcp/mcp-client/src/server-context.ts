/**
 * Publish connection-owned MCP resources and literal server instructions.
 *
 * @module @singula-ai/alego-mcp-client
 */

import type { Context } from '@singula-ai/cordis'
import type { McpResourceProvider } from '@singula-ai/alego-mcp-resources'
import type {} from '@singula-ai/alego-system-prompt'

/** Connection-owned values used by the resource and prompt consumers. */
export interface ServerContext {
  /** Resource access through the current connection generation. */
  resources: McpResourceProvider
  /**
   * Read the last successfully connected server's attributed instructions.
   * @returns literal prompt text, or an empty string when no server instructions are active.
   */
  instructions(): string
}

/**
 * Contribute server context to the services enabled by this composition.
 * @param ctx - server plugin's registration scope and effect owner.
 * @param server - configured server identity.
 * @param connection - live resource operations and successful instruction snapshot.
 */
export function registerServerContext(ctx: Context, server: string, connection: ServerContext): void {
  ctx.inject(['mcpResources'], (inner) => {
    inner.mcpResources.register(server, connection.resources)
  })
  ctx.inject(['systemPrompt'], (inner) => {
    inner.systemPrompt.section({
      name: `mcp:${server}`,
      order: inner.systemPrompt.getSectionOrder('MCP_SERVERS'),
      interpolate: false,
      text: () => connection.instructions(),
    })
  })
}
