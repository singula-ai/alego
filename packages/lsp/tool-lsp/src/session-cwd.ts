/**
 * Derive the workspace root an `lsp` call resolves against from the calling
 * agent's session. A missing cwd fails as `LSP_WORKSPACE_REQUIRED` because the
 * local provider must canonicalize a real workspace before starting a server.
 * @module @singula-ai/alego-tool-lsp/session-cwd
 */

import type { ToolExecution } from '@singula-ai/alego-tools'

/**
 * The session workspace cwd for this call, or `undefined` when none applies.
 * @param exec - the tool-execution context; only its optional `agent` is read.
 * @returns the calling agent's session cwd, or undefined for a non-agent caller.
 */
export function sessionCwd(exec: ToolExecution): string | undefined {
  return exec.agent?.session.header.cwd
}
