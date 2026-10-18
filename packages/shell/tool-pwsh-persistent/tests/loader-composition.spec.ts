import { spawnSync } from 'node:child_process'
import { provideWorkingDirectoryFixture, unsupportedInbox } from '@singula-ai/alego-agent-loop-testkit'
import { mkdtemp, realpath, rm, writeFile } from 'node:fs/promises'
import { release, tmpdir, version } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterEach, describe, expect, it, onTestFailed, vi } from 'vitest'
import { Context } from '@singula-ai/cordis'
import Loader from '@singula-ai/cordis-plugin-loader'
import Include from '@singula-ai/cordis-plugin-include'
import { ToolCallId } from '@singula-ai/alego-llm'
import { SESSION_FORMAT_VERSION, Session, SessionId } from '@singula-ai/alego-session'
import AgentRegistry from '@singula-ai/alego-agent'
import SessionProjectionRegistry from '@singula-ai/alego-session-projection'
import type { Agent } from '@singula-ai/alego-agent'
import TerminalSessionService from '@singula-ai/alego-terminal'
import type { TerminalWaitReason } from '@singula-ai/alego-terminal'
import * as TerminalBash from '@singula-ai/alego-terminal-bash'
import SandboxProvider from '@singula-ai/alego-sandbox'
import type { ConfinedArgv, SandboxPolicy } from '@singula-ai/alego-sandbox'
import SandboxPolicyService from '@singula-ai/alego-sandbox-policy'
import LocalSubprocessService from '@singula-ai/alego-subprocess-local'
import { resolvePwshPath } from '@singula-ai/alego-pwsh-local/src/resolve.ts'
import SystemPrompt from '@singula-ai/alego-system-prompt'
import ToolRegistry from '@singula-ai/alego-tools'
import * as ToolPwshPersistent from '@singula-ai/alego-tool-pwsh-persistent'
import { ReadinessTimeline, TIMELINE_HEADER } from './readiness-timeline.ts'

const pwshPath = resolvePwshPath()
const hasPwsh = spawnSync(
  pwshPath, ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', '$true'],
  { encoding: 'utf8' },
).status === 0

// The system conhost version identifies the host OS; Windows PTYs use node-pty's bundled
// OpenConsole, so that version does not identify the console rendering these sessions.
const HOST_FACTS_COMMAND = [
  '"pwsh $($PSVersionTable.PSVersion) PSReadLine $((Get-Module PSReadLine -ListAvailable | Sort-Object Version -Descending | Select-Object -First 1).Version)"',
  'if ($env:OS -eq \'Windows_NT\') { "system conhost (unused) $((Get-Item (Join-Path $env:SystemRoot \'System32\\conhost.exe\')).VersionInfo.FileVersion)" }',
].join('; ')

function hostFacts(): string {
  const probe = spawnSync(
    pwshPath, ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', HOST_FACTS_COMMAND],
    { encoding: 'utf8', timeout: 30_000 },
  )
  const shell = probe.status === 0
    ? probe.stdout.trim().split(/\r?\n/).join('; ')
    : `version probe failed: ${probe.error?.message ?? probe.stderr.trim()}`
  return [
    `host: ${process.platform} ${process.arch} ${release()} (${version()}); node ${process.version}`,
    `shell: ${pwshPath}; ${shell}`,
    process.platform === 'win32'
      ? 'conpty: node-pty bundled OpenConsole (useConptyDll=true)'
      : 'conpty: not applicable (POSIX PTY)',
  ].join('\n')
}

let root: string | undefined
let context: Context | undefined

afterEach(async () => {
  vi.restoreAllMocks()
  await context?.fiber.dispose()
  context = undefined
  if (root !== undefined) await rm(root, { recursive: true, force: true })
  root = undefined
})

class PassthroughSandbox extends SandboxProvider {
  async confine(argv: readonly string[], _policy: SandboxPolicy): Promise<ConfinedArgv> {
    return { argv: [...argv], enforcement: 'full', denialSignatures: [], runnerFailureRules: [] }
  }
}

async function agent(ctx: Context, cwd: string): Promise<Agent> {
  const id = SessionId('persistent-pwsh-loader-agent')
  const scope = ctx.plugin(() => {})
  const session = Session.create(id, [], {
    version: SESSION_FORMAT_VERSION, id, createdAt: 0, cwd, isSeeded: false,
  })
  const value: Agent = {
    id,
    options: {},
    session,
    inbox: unsupportedInbox(),
    status: 'idle',
    ctx: scope.ctx,
    send: () => {},
    followup: () => {},
    steer: () => ({ outcome: Promise.resolve({ status: 'rejected' as const }) }),
    inject: () => {},
    cancel() {},
    runMaintenance: task => task(new AbortController().signal),
    whenIdle: () => Promise.resolve(),
  }
  await ctx.agents.register(value)
  return value
}

function text(result: { content: { type: string; text?: string }[] }): string {
  return result.content.filter(block => block.type === 'text').map(block => block.text).join('')
}

describe.skipIf(!hasPwsh)('persistent pwsh through a real cordis.yml Loader composition', () => {
  it('preserves cwd and environment across calls', async () => {
    root = await realpath(await mkdtemp(join(tmpdir(), 'alego-persistent-pwsh-loader-')))
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
      '    shellDialect: pwsh',
      '    pollIntervalMs: 10',
      '    exactProbeAfterMs: 20',
      // The silence tier keeps its product default; the case body records each
      // send's wait reason, which pins the controlled-prompt fast path directly
      // instead of relying on how long silence would take to settle.
      '    handoffGraceMs: 300',
      // promptTailGraceMs keeps its product default (0): the self-hosted Windows failures of
      // 2026-09-25..27 settled at the plain silence bound with the tolerance present and absent
      // alike, so it never applied there and would only lengthen a never-arriving-tail fallback.
      '    scrollbackLines: 20000',
      // The first call pays the full pwsh cold-start latency (spawn + .NET +
      // PSReadLine + Defender) inside the tool deadline; a 60s bound on the
      // fully loaded self-hosted Windows pool is exceeded often enough to
      // reset the session mid-test (2026-09-01, two runs ~62s each). 300s
      // matches the alego-tool-pwsh-persistent product default; the
      // alego-terminal-bash value bounds one send plus the complete startup
      // sequence, so it covers the same cold start (its 30s product default
      // would not).
      '    timeoutMs: 300000',
      '    disposeGraceMs: 500',
      "- name: '@singula-ai/alego-tool-pwsh-persistent'",
      '  config:',
      '    timeoutMs: 300000',
      '',
    ].join('\n'))

    context = new Context()

    provideWorkingDirectoryFixture(context)
    context.baseUrl = pathToFileURL(root).href + '/'
    await context.plugin(Loader)
    context.loader.builtins.include = Include
    const modules = new Map<string, unknown>([
      ['@singula-ai/alego-agent', AgentRegistry],
      ['@singula-ai/alego-system-prompt', SystemPrompt],
      ['@singula-ai/alego-tools', ToolRegistry],
      ['@singula-ai/alego-terminal', TerminalSessionService],
      ['@singula-ai/alego-test-sandbox', PassthroughSandbox],
      ['@singula-ai/alego-session-projection', SessionProjectionRegistry],
      ['@singula-ai/alego-sandbox-policy', SandboxPolicyService],
      ['@singula-ai/alego-subprocess-local', LocalSubprocessService],
      ['@singula-ai/alego-terminal-bash', TerminalBash],
      ['@singula-ai/alego-tool-pwsh-persistent', ToolPwshPersistent],
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

    const terminals = context.terminals
    const startSend = terminals.startSend.bind(terminals)
    // A send that lost the controlled-prompt fast path settles as inferred_idle
    // after the silence tier, so recording why every send settled detects that
    // regression immediately instead of through accumulated wall-clock. The
    // timeline records what the session observed on the way there — every pty
    // chunk's prompt verdict, every foreground poll, every write — because the
    // reason alone cannot say whether the marker was missing, its tail was
    // invalidated by later output, or the foreground comparison failed.
    const timeline = new ReadinessTimeline(hostFacts)
    timeline.observeSanitizer()
    const spawnTerminal = context.subprocess.spawnTerminal.bind(context.subprocess)
    vi.spyOn(context.subprocess, 'spawnTerminal').mockImplementation(async (spec) => {
      const handle = await spawnTerminal(spec)
      timeline.observeTerminal(handle)
      return handle
    })
    const settleReasons: TerminalWaitReason[] = []
    vi.spyOn(terminals, 'startSend').mockImplementation((owner, id, request) => {
      const operation = startSend(owner, id, request)
      timeline.track(operation, request)
      void operation.done.then(
        (settled) => { settleReasons.push(settled.waitReason) },
        // A rejected send is the tool's error path, not a settle reason.
        () => {},
      )
      return operation
    })
    // The runner's timeout never reaches the assertions below; print the timeline
    // for that path too, unless a failed assertion already carries it.
    onTestFailed(({ task }) => {
      if (task.result?.errors?.some(error => error.message?.includes(TIMELINE_HEADER))) return
      console.error(timeline.format())
    })

    const owner = await agent(context, root)
    const signal = new AbortController().signal
    const execute = (id: string, command: string) => {
      timeline.label(id)
      return context!.tools.execute({
        signal,
        callId: ToolCallId(id),
        name: 'pwsh',
        arguments: { command },
        agent: owner,
      })
    }

    expect(context.tools.schemas().map(schema => schema.name)).toEqual(['pwsh'])
    await execute('state', '$env:KEEP = "loader"; New-Item -ItemType Directory -Force -Path nested | Out-Null; Set-Location nested')
    const observed = text(await execute('observe', 'Write-Output "cwd=$PWD keep=$env:KEEP"'))
    expect(observed).toContain(`cwd=${join(root, 'nested')} keep=loader`)
    expect(observed).not.toContain('ALEGO_PERSISTENT_PWSH')

    const multiline = text(await execute(
      'multiline',
      '$value = "line one"\nWrite-Output "${value}:it\'s fine"',
    ))
    expect(multiline).toBe("line one:it's fine")
    expect(multiline).not.toContain('ALEGO_PERSISTENT_PWSH')

    const hereString = text(await execute(
      'here-string',
      "$h = @'\nalpha\nbeta\n'@\nWrite-Output $h",
    ))
    expect(hereString).toBe('alpha\nbeta')

    const large = text(await execute('large-output', '1..12050 | ForEach-Object { $_ }'))
    expect(large.startsWith('1\n2\n3\n')).toBe(true)
    expect(large).toContain('<response clipped>')
    expect(large).not.toContain('beginning of this command output was dropped')

    const afterScroll = text(await execute('after-scroll', 'Write-Output "cwd=$PWD keep=$env:KEEP"'))
    expect(afterScroll).toBe(`cwd=${join(root, 'nested')} keep=loader`)

    const exited = text(await execute('exit', 'exit'))
    expect(exited).toContain('next pwsh call starts from the workspace')
    expect(text(await execute('after-exit', 'Write-Output "$PWD"'))).toBe(root)

    // Each ordinary command must settle on the prompt, including the next command on the
    // scrolled shell and the first command after restart. Extra sends can conceal a timeout.
    // Formatting probes host versions, so only a failed sequence pays that cost.
    const expected: TerminalWaitReason[] = [
      'stdin_read', 'stdin_read', 'stdin_read', 'stdin_read',
      'stdin_read', 'stdin_read', 'session_exit', 'stdin_read',
    ]
    const degraded = settleReasons.length !== expected.length
      || settleReasons.some((reason, index) => reason !== expected[index])
    const failure = degraded ? `${JSON.stringify(settleReasons)}\n${timeline.format()}` : ''
    expect(settleReasons, failure).toEqual(expected)
  }, 120_000)
})
