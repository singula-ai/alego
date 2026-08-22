import { fileURLToPath } from 'node:url'
import { Context } from '@singula-ai/cordis'
import { agentEvents, Inbox, type Agent } from '@singula-ai/alego-agent'
import { CallId } from '@singula-ai/alego-llm'
import { boot, loadOverlayPatches } from '@singula-ai/alego-app-boot'
import { SessionId } from '@singula-ai/alego-session'
import type {} from '@singula-ai/alego-skill'
import type {} from '@singula-ai/alego-tools'

const overlayPath = process.argv[2]
if (overlayPath === undefined) throw new Error('alego-badge snapshot requires an overlay path')
const rootConfigPath = fileURLToPath(new URL('../../../../../packages/bundle/base/tests/fixtures/root.cordis.yml', import.meta.url))
const basePatchPath = fileURLToPath(new URL('../../../../../packages/bundle/base/cordis.patch.yml', import.meta.url))
const ctx = await boot('alego-badge-snapshot', rootConfigPath, [
  ...loadOverlayPatches('alego-badge-snapshot', basePatchPath),
  ...loadOverlayPatches('alego-badge-snapshot', overlayPath),
])

try {
  const agentId = SessionId('alego-badge-snapshot')
  const session = ctx.sessions.create(agentId, { meta: { cwd: process.cwd() } })
  const agent: Agent = {
    ctx: new Context(),
    id: agentId,
    options: {},
    session,
    inbox: new Inbox(session, { inserted: () => {}, discarded: () => {}, claimed: () => {} }),
    status: 'idle',
    send: () => {},
    followup: () => {},
    steer: () => {},
    inject: () => { throw new Error('alego-badge snapshot must receive the catalog at the step boundary') },
    cancel: () => {},
    runMaintenance: job => job(new AbortController().signal),
    whenIdle: () => Promise.resolve(),
  }
  const decision = await agentEvents(ctx, agent).waterfall(
    'agent/pre-step',
    { messages: [], turn: 1, step: 1, signal: new AbortController().signal },
    () => Promise.resolve({ kind: 'enter' as const, messages: [] }),
  )
  const catalog = decision.kind === 'enter'
    ? decision.messages.find(message => message.role === 'user'
      && message.source.kind === 'skill-catalog')?.content
    : undefined
  const summary = (await ctx.skills.list()).find(skill => skill.name === 'alego-badge')
  const result = await ctx.tools.execute({
    callId: CallId('alego-badge-snapshot'),
    name: 'skill',
    arguments: { name: 'alego-badge' },
    signal: new AbortController().signal,
  })
  process.stdout.write(`${JSON.stringify({ catalog: catalog ?? null, summary: summary ?? null, result })}\n`)
} finally {
  await ctx.fiber.dispose()
}
