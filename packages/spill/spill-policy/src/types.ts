/**
 * Vocabulary for the spill-policy plugin: the minimal structural view of a tool
 * execution the policy needs to derive the owning session for a spill artifact.
 *
 * `@alego/tools`' `ToolExecution` satisfies this shape, so the policy
 * reads `exec` straight through without importing `alego-tools` or `alego-agent`.
 * Only the session HEADER id is read — the same identity every other subsystem
 * keys off (see `alego-tool-bash`'s owner derivation).
 *
 * @module @alego/spill-policy/types
 */

import type { SessionId } from '@alego/session'

/** Minimal structural view of a tool execution: the owning session's header id, when present. */
export interface SpillPolicyExec {
  /** The agent on whose behalf the call runs, when there is one. */
  agent?: {
    session: {
      header: {
        /** The canonical session identity — the spill owner. */
        id: SessionId
      }
    }
  }
}
