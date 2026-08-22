import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { Context } from '@alego/cordis'
import Loader from '@alego/cordis-plugin-loader'
import Include from '@alego/cordis-plugin-include'
import LlmRuntime from '@alego/llm'
import SessionStore from '@alego/session'
import TokenMeter from '@alego/token-meter'
import BasicCompactionEngine from '@alego/compaction-basic'
import ToolResultPruner from '@alego/compaction-tool-result-pruner'

let root: string | undefined
let context: Context | undefined

afterEach(async () => {
  await context?.fiber.dispose()
  context = undefined
  if (root !== undefined) await rm(root, { recursive: true, force: true })
  root = undefined
})

async function loadYaml(lines: readonly string[]): Promise<Context> {
  root = await mkdtemp(join(tmpdir(), 'alego-token-meter-loader-'))
  const configPath = join(root, 'cordis.yml')
  await writeFile(configPath, [...lines, ''].join('\n'))

  context = new Context()
  context.baseUrl = pathToFileURL(root).href + '/'
  await context.plugin(Loader)
  context.loader.builtins.include = Include
  const modules = new Map<string, unknown>([
    ['@alego/llm', LlmRuntime],
    ['@alego/session', SessionStore],
    ['@alego/token-meter', TokenMeter],
    ['@alego/compaction-tool-result-pruner', ToolResultPruner],
    ['@alego/compaction-basic', BasicCompactionEngine],
  ])
  context.loader.internal = {
    version: 'v2',
    async import(specifier: string) {
      if (!modules.has(specifier)) throw new Error(`unexpected Loader import: ${specifier}`)
      return modules.get(specifier)
    },
  } as unknown as NonNullable<typeof context.loader.internal>
  await context.loader.create({
    name: 'cordis:include',
    config: { path: pathToFileURL(configPath).href },
  })
  await context.loader.await()
  return context
}

describe('real Loader composition', () => {
  it('loads the shipped token-meter, pruning, and compaction-basic YAML order', async () => {
    const loaded = await loadYaml([
      "- name: '@alego/llm'",
      "- name: '@alego/session'",
      "- name: '@alego/token-meter'",
      "- name: '@alego/compaction-tool-result-pruner'",
      '  config:',
      '    thresholdChars: 100',
      '    headChars: 20',
      '    tailChars: 10',
      "- name: '@alego/compaction-basic'",
      '  config:',
      '    thresholdRatio: 0.5',
      '    retainRatio: 0.125',
      '    auto: false',
    ])

    const unloaded = [...loaded.loader.entries()]
      .filter(entry => entry.fiber === undefined && !entry.disabled)
      .map(entry => entry.options.name)
    expect(unloaded).toEqual([])
    expect(loaded.get('toolResultPruner')).toBeInstanceOf(ToolResultPruner)
    expect(loaded.get('compaction')).toBeInstanceOf(BasicCompactionEngine)
    expect((loaded.compaction as unknown as BasicCompactionEngine).config).toMatchObject({
      thresholdRatio: 0.5,
      retainRatio: 0.125,
      auto: false,
    })
  })

  it('rejects stale token-meter config after Schemastery normalization', async () => {
    context = new Context()
    await expect(context.plugin(TokenMeter, {
      contextWindow: 4096,
    } as never)).rejects.toThrow(/TokenMeterConfig: unknown key "contextWindow"/)
  })

  it('rejects stale compaction-basic config after Schemastery normalization', async () => {
    context = new Context()
    await context.plugin(LlmRuntime)
    await context.plugin(SessionStore)
    await context.plugin(TokenMeter)
    await expect(context.plugin(BasicCompactionEngine, {
      models: { legacy: { thresholdRatio: 0.5 } },
    } as never)).rejects.toThrow(/BasicCompactionConfig: unknown key "models"/)
  })

  it('rejects a capacity-independent merged ratio conflict during plugin load', async () => {
    context = new Context()
    await context.plugin(LlmRuntime)
    await context.plugin(SessionStore)
    await context.plugin(TokenMeter)
    await expect(context.plugin(BasicCompactionEngine, {
      retainRatio: 0.2,
      modelPolicies: [{
        provider: 'test-provider',
        model: 'test-model',
        thresholdRatio: 0.1,
      }],
    })).rejects.toThrow(/modelPolicies\[0\]: retainRatio \(0.2\).*thresholdRatio \(0.1\)/)
  })

  it('rejects an incomplete model-policy summarization pair during plugin load', async () => {
    context = new Context()
    await context.plugin(LlmRuntime)
    await context.plugin(SessionStore)
    await context.plugin(TokenMeter)
    await expect(context.plugin(BasicCompactionEngine, {
      summarizationProvider: 'default-provider',
      summarizationModel: 'default-model',
      modelPolicies: [{
        provider: 'test-provider',
        model: 'test-model',
        summarizationModel: '',
      }],
    })).rejects.toThrow(/modelPolicies\[0\].*must be set together/)
  })
})
