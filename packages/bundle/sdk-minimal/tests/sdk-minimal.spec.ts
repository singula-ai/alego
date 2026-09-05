/** The standalone SDK-minimal bundle's complete declared Cordis tree. */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as yaml from 'js-yaml'
import { describe, expect, it } from 'vitest'
import { entryListSchema } from '@singula-ai/cordis-plugin-include'

function packageName(specifier: string): string {
  return specifier.startsWith('@') ? specifier.split('/').slice(0, 2).join('/') : specifier.split('/')[0]!
}

describe('alego-sdk-minimal bundle', () => {
  it('declares one standalone allowlisted tree with every row dependency', () => {
    const root = fileURLToPath(new URL('..', import.meta.url))
    const manifest = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')) as {
      dependencies?: Record<string, string>
      alego?: { bundle?: { patch?: string } }
    }
    expect(manifest.alego?.bundle?.patch).toBe('./cordis.patch.yml')
    const patches = yaml.load(
      readFileSync(resolve(root, manifest.alego!.bundle!.patch!), 'utf8'),
      { schema: entryListSchema },
    ) as Array<{ insert?: Array<{ id?: string; inject?: string[]; name?: string; config?: Record<string, unknown>; disabled?: unknown }> }>
    expect(patches).toHaveLength(1)
    const rows = patches[0]?.insert ?? []
    expect(rows.map(row => [row.id, row.name])).toEqual([
      ['sdk-app-startup', '@singula-ai/alego-sdk-app'],
      ['sdk-jsonrpc-server', '@singula-ai/alego-sdk-jsonrpc-server'],
      ['deepseek-llm-api-extensions', '@singula-ai/alego-deepseek-llm-api-extensions'],
      ['session-log-deepseek', '@singula-ai/alego-session-log-deepseek'],
      ['plugin-package-inventory-deepseek', '@singula-ai/alego-plugin-package-inventory-deepseek'],
      ['llm-deepseek', '@singula-ai/alego-llm-deepseek'],
      ['sandbox', '@singula-ai/alego-sandbox-local'],
      ['session-projection', '@singula-ai/alego-session-projection'],
      ['sandbox-policy', '@singula-ai/alego-sandbox-policy'],
      ['subprocess', '@singula-ai/alego-subprocess-local'],
      ['pty', '@singula-ai/alego-terminal'],
      ['terminal-bash', '@singula-ai/alego-terminal-bash'],
      ['terminal-pwsh', '@singula-ai/alego-terminal-bash'],
      ['fs-local', '@singula-ai/alego-fs-local'],
      ['timer', '@singula-ai/cordis-plugin-timer'],
      ['llm', '@singula-ai/alego-llm'],
      ['session', '@singula-ai/alego-session'],
      ['session-title', '@singula-ai/alego-session-title'],
      ['system-prompt', '@singula-ai/alego-system-prompt'],
      ['tools', '@singula-ai/alego-tools'],
      ['agent', '@singula-ai/alego-agent'],
      ['llm-retry', '@singula-ai/alego-llm-retry'],
      ['jobs', '@singula-ai/alego-jobs-local'],
      ['invariants', '@singula-ai/alego-invariants'],
      ['session-invariant', '@singula-ai/alego-session/invariant'],
      ['agent-invariant', '@singula-ai/alego-agent/invariant'],
      ['scope-invariant', '@singula-ai/alego-scope/invariant'],
      ['agent-loop-invariant', '@singula-ai/alego-agent-loop/invariant'],
      ['agent-loop', '@singula-ai/alego-agent-loop'],
      ['persistent-bash', '@singula-ai/alego-tool-bash-persistent'],
      ['persistent-pwsh', '@singula-ai/alego-tool-pwsh-persistent'],
      ['str-replace-editor', '@singula-ai/alego-tool-str-replace-editor'],
      ['sessions', '@singula-ai/alego-session-persistence-jsonl'],
    ])
    expect(rows.find(row => row.id === 'sdk-app-startup')?.config).toEqual({ profile: 'sdk-minimal' })
    expect(rows.find(row => row.id === 'sdk-jsonrpc-server')).toMatchObject({
      inject: ['sdkAppStartup', 'loader'],
      config: { maxTokensAsSuccess: false },
    })
    expect(rows.find(row => row.id === 'llm-deepseek')?.config).toEqual({
      apiKeyEnv: 'DEEPSEEK_API_KEY',
      defaultContextWindow: { __jsExpr: 'Number(process.env.ALEGO_CONTEXT_WINDOW ?? 1000000)' },
      streamIdleTimeoutMs: 172800000,
    })
    expect(rows.find(row => row.id === 'system-prompt')?.config).toEqual({
      includeHarnessIdentity: false,
      includeRuntimeContext: false,
      persona: { __jsExpr: "process.env.ALEGO_SYSTEM_PROMPT ?? 'You are a helpful software engineer assistant.'" },
    })
    expect(rows.find(row => row.id === 'agent-loop')?.config).toEqual({ agents: [] })
    expect(rows.find(row => row.id === 'terminal-bash')).toMatchObject({
      disabled: { __jsExpr: "process.platform === 'win32'" },
    })
    expect(rows.find(row => row.id === 'terminal-pwsh')).toMatchObject({
      disabled: { __jsExpr: "process.platform !== 'win32'" },
      config: { shellDialect: 'pwsh', timeoutMs: 300000 },
    })
    expect(Object.keys(manifest.dependencies ?? {}).sort()).toEqual(
      [...new Set(rows.map(row => row.name).filter((name): name is string => name !== undefined).map(packageName))].sort(),
    )
  })
})
