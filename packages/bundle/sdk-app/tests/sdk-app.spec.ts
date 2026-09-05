/** The SDK app bundle's declared profile patch. */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as yaml from 'js-yaml'
import { describe, expect, it } from 'vitest'
import { entryListSchema } from '@singula-ai/cordis-plugin-include'

describe('alego-sdk-app bundle', () => {
  it('declares startup-gated JSON-RPC serving without overriding base HMR policy', () => {
    const root = fileURLToPath(new URL('..', import.meta.url))
    const manifest = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')) as {
      dependencies?: Record<string, string>
      alego?: { bundle?: { patch?: string } }
    }
    expect(manifest.alego?.bundle?.patch).toBe('./cordis.patch.yml')
    expect(manifest.dependencies).toHaveProperty('@singula-ai/alego-sdk-jsonrpc-server')
    const patches = yaml.load(
      readFileSync(resolve(root, manifest.alego!.bundle!.patch!), 'utf8'),
      { schema: entryListSchema },
    ) as Array<{ id?: string; disabled?: boolean; insert?: Array<{ id?: string; inject?: string[]; name?: string }> }>
    expect(patches.find(patch => patch.id === 'hmr')).toBeUndefined()
    expect(patches.find(patch => patch.id === 'session-title-llm')).toMatchObject({ disabled: true })
    const rows = patches.flatMap(patch => patch.insert ?? [])
    expect(rows.find(row => row.id === 'sdk-app-startup')?.name).toBe('@singula-ai/alego-sdk-app')
    expect(rows.find(row => row.id === 'sdk-jsonrpc-server')?.inject).toEqual(['sdkAppStartup', 'loader'])
  })
})
