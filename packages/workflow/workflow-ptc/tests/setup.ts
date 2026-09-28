import { mkdtemp, mkdir, rm } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { Context } from '@singula-ai/cordis'
import type { Agent } from '@singula-ai/alego-agent'
import SessionStore from '@singula-ai/alego-session'
import SessionProjections from '@singula-ai/alego-session-projection'
import FileSystem from '@singula-ai/alego-fs-local'
import Subprocess from '@singula-ai/alego-subprocess-local'
import Sandbox from '@singula-ai/alego-sandbox-local'
import SandboxPolicy from '@singula-ai/alego-sandbox-policy'
import type { SandboxMode } from '@singula-ai/alego-sandbox'
import NodePtcRuntime from '@singula-ai/alego-ptc-runtime-node'
import type { Config as NodeRuntimeConfig } from '@singula-ai/alego-ptc-runtime-node'
import { onTestFinished } from 'vitest'

/** Mount real Node execution services with a private working directory and awaited cleanup. */
export async function mountPtcRuntime(ctx: Context, mode: SandboxMode = 'danger-full-access') {
  const root = await mkdtemp(join(homedir(), '.alego-workflow-test-'))
  onTestFinished(async () => {
    await ctx.fiber.dispose()
    await rm(root, { recursive: true, force: true })
  })
  const cwd = join(root, 'workspace')
  await mkdir(cwd)
  await mountWorkflowRuntime(ctx, { cwd, mode, runtimeConfig: { graceMs: 50 } })
  return { root, cwd }
}

/** Mount the real execution services in a caller-owned context and directory. */
export async function mountWorkflowRuntime(
  ctx: Context,
  options: { cwd?: string; mode?: SandboxMode; runtimeConfig?: NodeRuntimeConfig } = {},
): Promise<NodePtcRuntime> {
  if (!ctx.get('sessions')) await ctx.plugin(SessionStore)
  if (!ctx.get('sessionProjections')) await ctx.plugin(SessionProjections)
  if (!ctx.get('fs')) await ctx.plugin(FileSystem)
  if (!ctx.get('subprocess')) await ctx.plugin(Subprocess)
  if (!ctx.get('sandbox')) await ctx.plugin(Sandbox)
  if (!ctx.get('sandboxPolicy')) await ctx.plugin(SandboxPolicy, {
    mode: options.mode ?? 'danger-full-access',
    ...options.cwd === undefined ? {} : { workspaceRoot: options.cwd },
  })
  if (!ctx.get('ptcRuntime')) await ctx.plugin(NodePtcRuntime, options.runtimeConfig ?? {})
  return ctx.ptcRuntime as NodePtcRuntime
}

/** Give a stub subagent provider a parent with a real Session and immutable cwd. */
export function fakeParent(ctx: Context): Agent {
  const session = ctx.sessions.create(undefined, { meta: { cwd: ctx.sandboxPolicy.workspaceRoot } })
  return { id: session.id, session, options: {} } as unknown as Agent
}
