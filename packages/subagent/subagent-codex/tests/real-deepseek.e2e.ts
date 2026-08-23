import { execFile } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { promisify } from 'node:util'
import { Context } from '@singula-ai/cordis'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Agent } from '@singula-ai/alego-agent'
import SubagentRuntime from '@singula-ai/alego-subagent'
import type { SubagentResult } from '@singula-ai/alego-subagent'
import type { SubprocessHandle } from '@singula-ai/alego-subprocess'
import LocalSubprocessRuntime from '@singula-ai/alego-subprocess-local'
import * as codex from '../src/index.ts'
import {
  startDeepSeekResponsesBridge,
  type DeepSeekResponsesBridge,
} from './deepseek-responses-bridge.ts'

const execFileAsync = promisify(execFile)
const codexPackageJson = createRequire(import.meta.url).resolve('@openai/codex/package.json')
const codexPackage = JSON.parse(readFileSync(
  codexPackageJson,
  'utf8',
)) as { version: string; bin: { codex: string } }
const codexEntry = resolve(dirname(codexPackageJson), codexPackage.bin.codex)

/**
 * Describe why a run did not complete, for the assertion that reports it.
 *
 * A bare `expected 'error' to be 'completed'` names no cause, and the provider
 * diagnostic and the bridge's own refusals are the only records of one.
 * @param result - the settled run result.
 * @param bridge - the bridge that served the run.
 * @returns Provider diagnostic and bridge failures, or a note that neither exists.
 */
function failureDetail(result: SubagentResult, bridge: DeepSeekResponsesBridge): string {
  // Codex retries hard, so one cause can appear dozens of times; the counted
  // set keeps the message bounded while still naming every distinct reason.
  const counted = new Map<string, number>()
  for (const failure of bridge.failures) counted.set(failure, (counted.get(failure) ?? 0) + 1)
  const summary = [...counted].map(([reason, times]) => `${String(times)}x ${reason}`).join('; ')
  const parts = [
    result.diagnostic === undefined ? undefined : `diagnostic: ${result.diagnostic}`,
    summary === '' ? undefined : `bridge: ${summary}`,
  ].filter((part): part is string => part !== undefined)
  return parts.length === 0 ? 'no provider diagnostic and no bridge failure' : parts.join(' | ')
}

const roots: string[] = []
const contexts: Context[] = []
const bridges: DeepSeekResponsesBridge[] = []

afterEach(async () => {
  await Promise.all(contexts.splice(0).map(ctx => ctx.fiber.dispose()))
  await Promise.all(bridges.splice(0).map(bridge => bridge.close()))
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

async function expectQuiescent(handles: readonly SubprocessHandle[]): Promise<void> {
  expect(handles.length).toBeGreaterThan(0)
  for (const handle of handles) {
    await expect(handle.waitForExit()).resolves.toBe(true)
    await expect(handle.done).resolves.toHaveProperty('exitCode')
  }
}

describe.skipIf(!process.env.DEEPSEEK_API_KEY)(
  'Codex provider with real DeepSeek API',
  () => {
    it('returns one unique nonce through the production provider and real Codex', async () => {
      const apiKey = process.env.DEEPSEEK_API_KEY
      if (apiKey === undefined) throw new Error('e2e ran without DEEPSEEK_API_KEY')
      const root = mkdtempSync(join(tmpdir(), 'alego-codex-deepseek-e2e-'))
      roots.push(root)
      const workspace = join(root, 'workspace')
      const codexHome = join(root, 'codex-home')
      mkdirSync(workspace)
      mkdirSync(codexHome)
      const nonce = `ALEGO_CODEX_DEEPSEEK_${randomUUID()}`
      const bridge = await startDeepSeekResponsesBridge(nonce)
      bridges.push(bridge)
      writeFileSync(join(codexHome, 'config.toml'), [
        'model = "deepseek-v4-flash"',
        'model_provider = "deepseek-e2e"',
        'approval_policy = "never"',
        'sandbox_mode = "read-only"',
        'disable_response_storage = true',
        'check_for_update_on_startup = false',
        '',
        '[model_providers.deepseek-e2e]',
        'name = "DeepSeek E2E bridge"',
        `base_url = "${bridge.baseUrl}"`,
        'env_key = "DEEPSEEK_API_KEY"',
        'wire_api = "responses"',
        'requires_openai_auth = false',
        '',
        '[analytics]',
        'enabled = false',
        '',
      ].join('\n'))
      const env = {
        DEEPSEEK_API_KEY: apiKey,
        CODEX_HOME: codexHome,
        HOME: root,
        XDG_CONFIG_HOME: join(root, 'xdg-config'),
        PATH: root,
        HTTP_PROXY: '',
        HTTPS_PROXY: '',
        ALL_PROXY: '',
        NO_PROXY: '127.0.0.1,localhost',
      }
      const ctx = new Context()
      contexts.push(ctx)
      await ctx.plugin(SubagentRuntime)
      await ctx.plugin(LocalSubprocessRuntime)
      const handles: SubprocessHandle[] = []
      const spawn = ctx.subprocess.spawn.bind(ctx.subprocess)
      vi.spyOn(ctx.subprocess, 'spawn').mockImplementation((spec) => {
        const handle = spawn(spec)
        handles.push(handle)
        return handle
      })
      await ctx.plugin(codex, { env, disposeGraceMs: 2_000 })
      const version = await execFileAsync(process.execPath, [codexEntry, '--version'], {
        env: { ...process.env, ...env },
      })
      expect(codexPackage.version).toBe('0.147.0')
      expect(version.stdout.trim()).toBe('codex-cli 0.147.0')

      const parent = {
        id: 'deepseek-e2e-parent',
        session: { header: { cwd: workspace } },
      } as unknown as Agent
      const run = await ctx.subagents.start('codex', {
        prompt: [{
          type: 'text',
          text: `Reply with exactly ${nonce} and nothing else. Do not use tools.`,
        }],
        parent,
        signal: new AbortController().signal,
      })
      const result = await run.result
      await run.dispose()

      expect(result.stopReason, failureDetail(result, bridge)).toBe('completed')
      const text = result.output
        .filter(block => block.type === 'text')
        .map(block => block.text)
        .join('')
        .trim()
      expect(text).toBe(nonce)
      expect(bridge.completedRequests).toBe(1)
      await expectQuiescent(handles)
    }, 180_000)
  },
)
