import { Context } from '@singula-ai/cordis'
import { onTestFinished } from 'vitest'
import SessionStore from '@singula-ai/alego-session'
import FileSystem from '@singula-ai/alego-fs-local'
import Subprocess from '@singula-ai/alego-subprocess-local'
import Sandbox from '@singula-ai/alego-sandbox-local'
import SandboxPolicy from '@singula-ai/alego-sandbox-policy'
import SessionProjections from '@singula-ai/alego-session-projection'
import type { SandboxMode } from '@singula-ai/alego-sandbox'
import NodeRuntime from '../src/index.ts'
import type { Config } from '../src/index.ts'

export async function mountRuntime(ctx: Context, config: Config = {}, policy: { mode?: SandboxMode; workspaceRoot?: string } = {}) {
  onTestFinished(async () => { await ctx.fiber.dispose() })
  if (!ctx.get('sessions')) await ctx.plugin(SessionStore)
  if (!ctx.get('fs')) await ctx.plugin(FileSystem)
  if (!ctx.get('subprocess')) await ctx.plugin(Subprocess)
  if (!ctx.get('sandbox')) await ctx.plugin(Sandbox, {})
  if (!ctx.get('sessionProjections')) await ctx.plugin(SessionProjections)
  if (!ctx.get('sandboxPolicy')) await ctx.plugin(SandboxPolicy, { mode: 'danger-full-access', ...policy })
  await ctx.plugin(NodeRuntime, config)
  return ctx.ptcRuntime as NodeRuntime
}
