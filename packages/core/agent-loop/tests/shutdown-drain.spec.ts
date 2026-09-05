/** Root-fiber shutdown drains buffered session events durably (both mount orders). */

import { describe, expect, it, afterEach } from 'vitest'
import { Context } from '@singula-ai/cordis'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createUserMessage } from '@singula-ai/alego-llm'
import LlmRuntime from '@singula-ai/alego-llm'
import SessionStore, { SessionId } from '@singula-ai/alego-session'
import SessionProjectionRegistry from '@singula-ai/alego-session-projection'
import SystemPrompt from '@singula-ai/alego-system-prompt'
import ToolRuntime from '@singula-ai/alego-tools'
import AgentRegistry, { type Agent } from '@singula-ai/alego-agent'
import JsonlSessionPersistence from '@singula-ai/alego-session-persistence-jsonl'
import AgentLoop from '@singula-ai/alego-agent-loop'
import { MockAdapter, textResponse } from './mock-adapter.ts'

const dirs: string[] = []
afterEach(async () => { for (const d of dirs.splice(0)) await rm(d, { recursive: true, force: true }) })

function waitForIdle(ctx: Context, agent: Agent): Promise<void> {
  return new Promise((resolve) => {
    const dispose = ctx.on('agent/status', ({ agent: subject, status }) => {
      if (subject === agent && status === 'idle') { dispose(); resolve() }
    })
  })
}

async function mount(order: 'backend-first' | 'loop-first'): Promise<{ ctx: Context; root: string }> {
  const root = await mkdtemp(join(tmpdir(), 'alego-shutdown-drain-'))
  dirs.push(root)
  const ctx = new Context()
  await ctx.plugin(LlmRuntime)
  await ctx.plugin(SessionStore)
  await ctx.plugin(SessionProjectionRegistry)
  await ctx.plugin(SystemPrompt)
  await ctx.plugin(ToolRuntime)
  await ctx.plugin(AgentRegistry)
  if (order === 'backend-first') {
    await ctx.plugin(JsonlSessionPersistence, { root })
    await ctx.plugin(AgentLoop, { agents: [] })
  } else {
    await ctx.plugin(AgentLoop, { agents: [] })
    await ctx.plugin(JsonlSessionPersistence, { root })
  }
  ctx.llm.registerAdapter(['mock'], new MockAdapter([textResponse('done')]))
  return { ctx, root }
}

describe.each(['backend-first', 'loop-first'] as const)('root shutdown drain (%s)', (order) => {
  it('persists buffered turn events without an explicit flush before dispose', async () => {
    const { ctx, root } = await mount(order)
    const sessionId = SessionId('shutdown-drain')
    const handle = await ctx.agents.create({ sessionId, agentOptions: { provider: 'mock', model: 'mock' } })
    handle.agent.followup(createUserMessage({ content: [{ type: 'text', text: 'q' }], source: { kind: 'user' } }))
    await waitForIdle(ctx, handle.agent)
    // No explicit flush and no agent dispose: root teardown must drain.
    await ctx.fiber.dispose()

    const verify = new Context()
    await verify.plugin(JsonlSessionPersistence, { root })
    const reader = await verify.sessionPersistence.open(sessionId, 'read')
    const events = await reader.read()
    await reader.close()
    expect(events.at(-1)).toMatchObject({ type: 'turn/end', data: { reason: { kind: 'completed' } } })
    await verify.fiber.dispose()
  })
})
