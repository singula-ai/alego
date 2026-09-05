/** The experimental Web bundle must carry one parseable Team Client layer. */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import * as yaml from 'js-yaml'
import { entryListSchema } from '@singula-ai/cordis-plugin-include'

describe('Agent Teams Web profile bundle', () => {
  it('declares a private parseable layer containing the Team UI', () => {
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
    expect(manifest.dependencies).toEqual({
      '@singula-ai/alego-experimental-client-ui-agent-team': 'workspace:^',
    })

    const parsed = yaml.load(
      readFileSync(resolve(root, manifest.alego!.bundle!.patch!), 'utf8'),
      { schema: entryListSchema },
    ) as { insert?: { id?: string; name?: string }[] }[]
    expect(parsed.flatMap(patch => patch.insert ?? [])).toEqual([
      { id: 'ui-agent-team', name: '@singula-ai/alego-experimental-client-ui-agent-team' },
    ])
  })
})
