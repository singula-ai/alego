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
import TerminalSessionService from '@singula-ai/alego-terminal'
import SandboxProvider from '@singula-ai/alego-sandbox'
import type { ConfinedArgv, SandboxPolicy } from '@singula-ai/alego-sandbox'
import SandboxPolicyService from '@singula-ai/alego-sandbox-policy'
import SessionProjectionRegistry from '@singula-ai/alego-session-projection'
import LocalSubprocessRuntime from '@singula-ai/alego-subprocess-local'
import * as TerminalLocal from '@singula-ai/alego-terminal-bash'
import * as ToolPty from '@singula-ai/alego-tool-terminal'

let root: string | undefined
let context: Context | undefined

afterEach(async () => {
  await context?.fiber.dispose()
  context = undefined
  if (root !== undefined) await rm(root, { recursive: true, force: true })
  root = undefined
})

class PassthroughSandbox extends SandboxProvider {
  confine(argv: readonly string[], _policy: SandboxPolicy): ConfinedArgv {
    return { argv: [...argv], enforcement: 'full', denialSignatures: [], runnerFailureRules: [] }
  }
}

function agent(ctx: Context): Agent {
  const scope = ctx.plugin(() => {})
  const id = SessionId('pty-loader-agent')
  const session = Session.create(id)
  const value: Agent = {
    id, options: {}, session, inbox: new Inbox(session, { inserted: () => {}, discarded: () => {}, claimed: () => {} }),
    status: 'idle',
    ctx: scope.ctx,
    send: () => {},
    followup: () => {}, steer: () => {}, inject: () => {}, cancel() {},
    runMaintenance: job => job(new AbortController().signal),
    whenIdle: () => Promise.resolve(),
  }
  ctx.agents.register(value)
  return value
}

function resultText(result: { content: { type: string; text?: string }[] }): string {
  return result.content.filter(block => block.type === 'text').map(block => block.text).join('')
}

const suite = process.platform === 'linux' || process.platform === 'darwin' ? describe : describe.skip

suite('terminal real Loader composition through cordis.yml', () => {
  it('boots cordis.yml and preserves shell state across real tool calls', async () => {
    root = await mkdtemp(join(tmpdir(), 'alego-pty-loader-'))
    const configPath = join(root, 'cordis.yml')
    await writeFile(configPath, [
      "- name: '@singula-ai/alego-agent'",
      "- name: '@singula-ai/alego-system-prompt'",
      "- name: '@singula-ai/alego-tools'",
      "- name: '@singula-ai/alego-terminal'",
      "- name: '@singula-ai/alego-test-sandbox'",
      "- name: '@singula-ai/alego-session-projection'",
      "- name: '@singula-ai/alego-sandbox-policy'",
      '  config:',
      '    mode: danger-full-access',
      `    workspaceRoot: ${JSON.stringify(root)}`,
      "- name: '@singula-ai/alego-subprocess-local'",
      "- name: '@singula-ai/alego-terminal-bash'",
      '  config:',
      '    pollIntervalMs: 10',
      '    exactProbeAfterMs: 20',
      '    idleSilenceMs: 250',
      '    handoffGraceMs: 250',
      '    timeoutMs: 2000',
      '    disposeGraceMs: 500',
      "- name: '@singula-ai/alego-tool-terminal'",
      '',
    ].join('\n'))

    context = new Context()
    context.baseUrl = pathToFileURL(root).href + '/'
    await context.plugin(Loader)
    context.loader.builtins.include = Include
    const modules = new Map<string, unknown>([
      ['@singula-ai/alego-agent', AgentRegistry],
      ['@singula-ai/alego-system-prompt', SystemPrompt],
      ['@singula-ai/alego-tools', ToolRuntime],
      ['@singula-ai/alego-terminal', TerminalSessionService],
      ['@singula-ai/alego-test-sandbox', PassthroughSandbox],
      ['@singula-ai/alego-session-projection', SessionProjectionRegistry],
      ['@singula-ai/alego-sandbox-policy', SandboxPolicyService],
      ['@singula-ai/alego-subprocess-local', LocalSubprocessRuntime],
      ['@singula-ai/alego-terminal-bash', TerminalLocal],
      ['@singula-ai/alego-tool-terminal', ToolPty],
    ])
    context.loader.internal = {
      version: 'v2',
      async import(specifier: string) {
        if (!modules.has(specifier)) throw new Error(`unexpected Loader import: ${specifier}`)
        return modules.get(specifier)
      },
    } as unknown as NonNullable<typeof context.loader.internal>
    await context.loader.create({ name: 'cordis:include', config: { path: pathToFileURL(configPath).href } })
    await context.loader.await()

    const owner = agent(context)
    const signal = new AbortController().signal
    const spawn = await context.tools.execute({
      signal, callId: ToolCallId('spawn'), name: 'terminal_open', arguments: { type: 'shell', name: 'main', cwd: root }, agent: owner,
    })
    expect(resultText(spawn)).toContain('started terminal session pty-1 (main)')

    await context.tools.execute({
      signal, callId: ToolCallId('state'), name: 'terminal_send', arguments: { sessionId: 'pty-1', text: 'export KEEP=loader; cd /' }, agent: owner,
    })
    const read = await context.tools.execute({
      signal, callId: ToolCallId('read'), name: 'terminal_send', arguments: { sessionId: 'pty-1', text: 'printf "cwd=%s keep=%s\\n" "$PWD" "$KEEP"' }, agent: owner,
    })
    expect(resultText(read)).toContain('cwd=/ keep=loader')
    expect(context.terminals.list(owner)).toHaveLength(1)
  }, 15_000)
})
