import { Context } from '@singula-ai/cordis'
import Loader from '@singula-ai/cordis-plugin-loader'
import Group from '@singula-ai/cordis-plugin-group'
import LlmRuntime from '@singula-ai/alego-llm'
import SessionStore, { SessionId } from '@singula-ai/alego-session'
import SessionProjectionRegistry from '@singula-ai/alego-session-projection'
import SystemPrompt from '@singula-ai/alego-system-prompt'
import ToolRuntime from '@singula-ai/alego-tools'
import AgentRegistry from '@singula-ai/alego-agent'
import AgentLoop from '@singula-ai/alego-agent-loop'
import AgentPresets, { type PresetDefinition } from '../src/index.ts'
import { liveConfig } from '../../../settings/settings/tests/live-config.ts'

/** Loader-backed registry entries by harness context, for tests that edit live fields. */
export const liveRegistries = new WeakMap<Context, Awaited<ReturnType<typeof liveConfig>>>()

export const plugin = (name: string): string => new URL(`./fixtures/plugins/${name}.js`, import.meta.url).href
export const contribution = (tool: string): PresetDefinition => ({ id: tool, plugins: [{ name: plugin('contribute'), config: { tool } }] })
export async function harness(options: { live?: boolean } = {}): Promise<Context> {
  const ctx = new Context()
  ctx.baseUrl = new URL('./fixtures/', import.meta.url).href
  await ctx.plugin(Loader)
  ctx.loader.builtins.group = Group
  await ctx.plugin(LlmRuntime)
  await ctx.plugin(SessionStore)
  await ctx.plugin(SessionProjectionRegistry)
  await ctx.plugin(SystemPrompt, { personaPrefix: '' })
  await ctx.plugin(ToolRuntime)
  await ctx.plugin(AgentRegistry)
  await ctx.plugin(AgentLoop, { agents: [] })
  if (options.live) liveRegistries.set(ctx, await liveConfig(ctx, AgentPresets, { default: 'standard' }))
  else await ctx.plugin(AgentPresets, { default: 'standard' })
  return ctx
}
export async function declare(ctx: Context, config: PresetDefinition) {
  return await ctx.plugin({
    inject: ['agentPresets'],
    async* apply(child: Context) { yield await child.agentPresets.register(config) },
  })
}
export async function agentOn(ctx: Context, id: string, presetId?: string) {
  const handle = await ctx.agents.create({
    sessionId: SessionId(id),
    setup: async (agentCtx: Context) => { await ctx.agentPresets.mount(agentCtx, presetId) },
  })
  return handle.agent
}

export async function currentKey(ctx: Context, id?: string) {
  await using lease = await ctx.agentPresets.acquireScope(id)
  return lease.key
}
