/** The experimental bundle must carry one parseable, explicit Team layer. */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import * as yaml from 'js-yaml'
import { entryListSchema } from '@singula-ai/cordis-plugin-include'

describe('Agent Teams profile bundle', () => {
  it('declares a private parseable layer with Team-owned controls', () => {
    const root = fileURLToPath(new URL('..', import.meta.url))
    const manifest = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')) as {
      private?: boolean
      publishConfig?: unknown
      dependencies?: Record<string, string>
      alego?: { bundle?: { patch?: string } }
    }
    expect(manifest.private).toBe(true)
    expect(manifest.publishConfig).toBeUndefined()
    expect(manifest.alego?.bundle?.patch).toBe('./cordis.patch.yml')
    expect(manifest.dependencies).toMatchObject({
      '@singula-ai/alego-experimental-agent-team': 'workspace:^',
      '@singula-ai/alego-experimental-tool-agent-team': 'workspace:^',
    })

    const parsed = yaml.load(
      readFileSync(resolve(root, manifest.alego!.bundle!.patch!), 'utf8'),
      { schema: entryListSchema },
    )
    expect(Array.isArray(parsed)).toBe(true)
    const patches = parsed as {
      id?: string
      disabled?: boolean
      config?: Record<string, unknown>
      insert?: { id?: string; name?: string; config?: Record<string, unknown> }[]
    }[]
    expect(patches.find(patch => patch.id === 'tool-subagent-control')).toMatchObject({ disabled: true })
    expect(patches.find(patch => patch.id === 'tool-subagent-list-agents')).toMatchObject({ disabled: true })
    expect(patches.find(patch => patch.id === 'tool-subagent')?.config).toMatchObject({ backgroundMode: 'one-shot' })
    expect(patches.find(patch => patch.id === 'tool-subagent-fork')?.config).toMatchObject({ backgroundMode: 'one-shot' })
    const inserted = patches.flatMap(patch => patch.insert ?? [])
    expect(inserted.find(entry => entry.id === 'agent-team')).toMatchObject({
      name: '@singula-ai/alego-experimental-agent-team',
      config: { maxMembers: 8 },
    })
    expect(inserted.find(entry => entry.id === 'tool-agent-team')).toMatchObject({
      name: '@singula-ai/alego-experimental-tool-agent-team',
      config: { freshProvider: 'spawn', forkProvider: 'fork' },
    })
  })
})
