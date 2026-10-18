import { Context } from '@singula-ai/cordis'
import Sandbox from '@singula-ai/alego-sandbox-local'
import SandboxPolicy from '@singula-ai/alego-sandbox-policy'
import SessionProjections from '@singula-ai/alego-session-projection'
import { onTestFinished } from 'vitest'
import type { SandboxMode } from '@singula-ai/alego-sandbox'

/** Mount the Python runtime's policy and confinement providers with owned teardown. */
export async function createRuntimeContext(policy: { mode?: SandboxMode; workspaceRoot?: string } = {}): Promise<Context> {
  const ctx = new Context()
  onTestFinished(async () => { await ctx.fiber.dispose() })
  await ctx.plugin(Sandbox, {})
  await ctx.plugin(SessionProjections)
  await ctx.plugin(SandboxPolicy, { mode: 'danger-full-access', ...policy })
  return ctx
}
