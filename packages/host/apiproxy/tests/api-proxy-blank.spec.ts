/**
 * The summary blank bit means "conversation not started" (no turn has run),
 * not "log empty": standalone plugin events — command lifecycle records,
 * plan/mode, permission knob events, session titles — never flip it, so running /plan or /goal on a
 * fresh session keeps it list-hidden and reusable, while the first accepted
 * prompt's turn/start clears it. The host/session-added frame shares the
 * same predicate function (covered by the workspace spec's frame assertion).
 */

import { describe, expect, it } from 'vitest'
import { Context } from '@singula-ai/cordis'
import AgentRegistry from '@singula-ai/alego-agent'
import type { Agent } from '@singula-ai/alego-agent'
import SessionStore from '@singula-ai/alego-session'
import type { Session } from '@singula-ai/alego-session'
import UserQuestionService from '@singula-ai/alego-user-questions'
import { CommandId } from '@singula-ai/alego-commands/brand'
// Side-effect type imports: the knob-event SessionEventMap merges.
import type {} from '@singula-ai/alego-permission-presets'
import type {} from '@singula-ai/alego-sandbox-policy'
import type {} from '@singula-ai/alego-user-approval'
import type { ApiProxy, RpcRequest } from '@singula-ai/alego-host-apiproxy/api'
import { RpcId } from '@singula-ai/alego-host-apiproxy/api/rpc'
import { createApiProxy } from '@singula-ai/alego-host-apiproxy'

let nextRpc = 1
function request<P>(payload: P): RpcRequest<P> {
  return { rpcId: RpcId(`blank-${String(nextRpc++)}`), payload }
}

async function harness(): Promise<{ ctx: Context; api: ApiProxy; attach: (session: Session) => void }> {
  const ctx = new Context()
  await ctx.plugin(SessionStore)
  await ctx.plugin(UserQuestionService)
  await ctx.plugin(AgentRegistry)
  return {
    ctx,
    api: createApiProxy(ctx, { defaultModelSelection: () => ({ provider: 'p', model: 'm' }), cwd: '/tmp' }),
    attach: (session) => {
      ctx.agents.register({ id: session.id, session, status: 'idle', ctx } as Agent)
    },
  }
}

/** Append the standalone (non-conversation) event family a fresh session can accumulate. */
function appendStandalone(session: Session): void {
  session.append('command/run', {
    commandId: CommandId('blank-cmd-1'), name: 'plan', args: '', source: { kind: 'user' },
  })
  session.append('plan/mode', { active: true })
  session.append('command/done', { commandId: CommandId('blank-cmd-1'), kind: 'success', text: 'Plan mode on.' })
  session.append('session/title', {
    title: 'standalone title', messageSeqs: [], source: { kind: 'fallback' },
  })
  // The three permission knob events (a /permission switch on a fresh session).
  session.append('permission/preset', { preset: 'danger-full-access' })
  session.append('sandbox/mode', { mode: 'danger-full-access' })
  session.append('approval/policy', { policy: 'never' })
}

async function listBlank(api: ApiProxy, id: string): Promise<boolean | undefined> {
  const response = await api.sessions.list(request({}))
  if (!response.result.ok) throw new Error('list failed')
  return response.result.value.items.find(item => item.sessionId === id)?.blank
}

describe('summary blank = conversation not started', () => {
  it('standalone events (command lifecycle, plan/mode, title) keep the session blank', async () => {
    const { ctx, api, attach } = await harness()
    const session = ctx.sessions.create()
    attach(session)
    expect(await listBlank(api, session.id)).toBe(true)
    appendStandalone(session)
    expect(await listBlank(api, session.id)).toBe(true)
  })

  it('the first turn clears blank', async () => {
    const { ctx, api, attach } = await harness()
    const session = ctx.sessions.create()
    attach(session)
    appendStandalone(session)
    session.append('turn/start', { turn: 0 })
    expect(await listBlank(api, session.id)).toBe(false)
  })
})
