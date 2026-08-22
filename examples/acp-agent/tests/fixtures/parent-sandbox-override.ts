import type { Context } from '@alego/cordis'
import { setSandboxMode } from '@alego/sandbox-policy'
import type {} from '@alego/agent'

export const name = 'parent-sandbox-override'

/**
 * Snapshot-only overlay: switch each ROOT session to `read-only` at creation —
 * the UI "Access" switch equivalent (one runtime `sandbox/mode` event on the
 * session log) — so the scenario proves a continuable background child
 * inherits the parent's explicit override as a `source: 'delegation'` event
 * instead of falling back to the deployment default.
 */
export function apply(ctx: Context): void {
  ctx.on('agent/created', ({ agent }) => {
    if (agent.session.header.parentSession !== undefined) return
    setSandboxMode(agent.session, 'read-only')
  })
}
