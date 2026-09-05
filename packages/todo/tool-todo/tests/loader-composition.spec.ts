// Proves `allowParallelInProgress` is real configurability and not a constant:
// the flag is set in a cordis.yml booted through the real Loader, and both faces
// it controls — the model-facing description and the accepted input — follow it.
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { Context } from '@singula-ai/cordis'
import Loader from '@singula-ai/cordis-plugin-loader'
import Include from '@singula-ai/cordis-plugin-include'
import { ToolCallId } from '@singula-ai/alego-llm'
import { Session, SessionId } from '@singula-ai/alego-session'
import AgentRegistry, { Inbox } from '@singula-ai/alego-agent'
import type { Agent } from '@singula-ai/alego-agent'
import SystemPrompt from '@singula-ai/alego-system-prompt'
import ToolRuntime from '@singula-ai/alego-tools'
import SessionProjectionRegistry from '@singula-ai/alego-session-projection'
import * as ToolTodo from '@singula-ai/alego-tool-todo'

let root: string | undefined
let context: Context | undefined

afterEach(async () => {
  await context?.fiber.dispose()
  context = undefined
  if (root !== undefined) await rm(root, { recursive: true, force: true })
  root = undefined
})

function agent(ctx: Context): Agent {
  const scope = ctx.plugin(() => {})
  const id = SessionId('todo-loader-agent')
  const session = Session.create(id)
  const value: Agent = {
    id, options: {}, session, inbox: new Inbox(session, { inserted: () => {}, discarded: () => {}, claimed: () => {} }),
    status: 'idle', ctx: scope.ctx,
    followup: () => {}, steer: () => {}, inject: () => {}, send: () => {}, cancel() {},
    runMaintenance: task => task(new AbortController().signal),
    whenIdle: () => Promise.resolve(),
  }
  ctx.agents.register(value)
  return value
}

function resultText(result: { content: { type: string; text?: string }[] }): string {
  return result.content.filter(block => block.type === 'text').map(block => block.text).join('')
}

/**
 * Boot a cordis.yml carrying the given tool-todo config block.
 * @param configLines - YAML lines nested under the tool's `config:` key.
 * @returns the booted context.
 */
async function boot(configLines: readonly string[]): Promise<Context> {
  root = await mkdtemp(join(tmpdir(), 'alego-todo-loader-'))
  const configPath = join(root, 'cordis.yml')
  await writeFile(configPath, [
    "- name: '@singula-ai/alego-agent'",
    "- name: '@singula-ai/alego-system-prompt'",
    "- name: '@singula-ai/alego-tools'",
    "- name: '@singula-ai/alego-session-projection'",
    "- name: '@singula-ai/alego-tool-todo'",
    ...configLines.length > 0 ? ['  config:', ...configLines] : [],
    '',
  ].join('\n'))

  const ctx = new Context()
  context = ctx
  ctx.baseUrl = pathToFileURL(root).href + '/'
  await ctx.plugin(Loader)
  ctx.loader.builtins.include = Include
  const modules = new Map<string, unknown>([
    ['@singula-ai/alego-agent', AgentRegistry],
    ['@singula-ai/alego-system-prompt', SystemPrompt],
    ['@singula-ai/alego-tools', ToolRuntime],
    ['@singula-ai/alego-session-projection', SessionProjectionRegistry],
    ['@singula-ai/alego-tool-todo', ToolTodo],
  ])
  ctx.loader.internal = {
    version: 'v2',
    async import(specifier: string) {
      if (!modules.has(specifier)) throw new Error(`unexpected Loader import: ${specifier}`)
      return modules.get(specifier)
    },
  } as unknown as NonNullable<typeof ctx.loader.internal>
  await ctx.loader.create({ name: 'cordis:include', config: { path: pathToFileURL(configPath).href } })
  await ctx.loader.await()
  return ctx
}

const PARALLEL_TODOS = [
  { content: 'run subagent a', status: 'in_progress' },
  { content: 'run subagent b', status: 'in_progress' },
]

describe('tool-todo real Loader composition through cordis.yml', () => {
  it('allowParallelInProgress: false narrows the description and rejects a parallel write', async () => {
    const ctx = await boot(['    allowParallelInProgress: false'])
    const description = ctx.tools.schemas().find(s => s.name === 'todo_write')?.description ?? ''
    expect(description).toContain('Keep AT MOST ONE todo `in_progress`')
    expect(description).not.toContain('several at once')

    const owner = agent(ctx)
    const result = await ctx.tools.execute({
      signal: new AbortController().signal,
      callId: ToolCallId('parallel'),
      name: 'todo_write',
      arguments: { todos: PARALLEL_TODOS },
      agent: owner,
    })
    expect(result.isError).toBe(true)
    expect(resultText(result)).toContain('at most one task may be in_progress')
    expect(owner.session.snapshotEvents().some(e => e.type === 'todo/write')).toBe(false)
  }, 30_000)

  it('allowParallelInProgress: true permits a parallel write end to end', async () => {
    const ctx = await boot(['    allowParallelInProgress: true'])
    const description = ctx.tools.schemas().find(s => s.name === 'todo_write')?.description ?? ''
    expect(description).toContain('several at once when work genuinely runs in parallel')

    const owner = agent(ctx)
    const result = await ctx.tools.execute({
      signal: new AbortController().signal,
      callId: ToolCallId('parallel-enabled'),
      name: 'todo_write',
      arguments: { todos: PARALLEL_TODOS },
      agent: owner,
    })
    expect(result.isError).toBe(false)
    expect(owner.session.snapshotEvents().findLast(e => e.type === 'todo/write')?.data.todos).toEqual(PARALLEL_TODOS)
  }, 30_000)

  it.each([
    { label: 'is omitted', configLines: [], failure: '$.allowParallelInProgress missing required value' },
    { label: 'is not boolean', configLines: ['    allowParallelInProgress: "no"'], failure: '$.allowParallelInProgress expected boolean' },
  ])('fails loading when allowParallelInProgress $label', async ({ configLines, failure }) => {
    // The policy is self-contained, so misconfiguration fails at load: the
    // entry's apply rejects and boot never reaches a running tool.
    await expect(boot(configLines)).rejects.toThrow(failure)
  }, 30_000)
})
