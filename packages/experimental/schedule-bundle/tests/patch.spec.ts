/** The experimental Schedule bundle inserts the three Schedule rows the shipped Web composition leaves out. */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import * as yaml from 'js-yaml'
import { entryListSchema } from '@singula-ai/cordis-plugin-include'

const root = fileURLToPath(new URL('..', import.meta.url))

interface Manifest {
  name?: string
  icon?: string
  private?: boolean
  publishConfig?: { access?: string }
  exports?: Record<string, unknown>
  dependencies?: Record<string, string>
  alego?: { bundle?: { patch?: string } }
}

describe('experimental Schedule bundle', () => {
  const manifest = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')) as Manifest

  it('publishes as an experimental bundle with plugin-manager display metadata', () => {
    expect(manifest.name).toBe('@singula-ai/alego-experimental-schedule-bundle')
    expect(manifest.private).toBeUndefined()
    expect(manifest.publishConfig?.access).toBe('public')
    expect(manifest.icon).toBe('./icon.svg')
    expect(manifest.alego?.bundle?.patch).toBe('./cordis.patch.yml')
    expect(manifest.exports?.['./locale/*.json']).toBe('./locale/*.json')
    expect(manifest.exports?.['./cordis.patch.yml']).toBe('./cordis.patch.yml')
    // Each inserted row names a package the bundle depends on, so the rows resolve from the bundle.
    expect(Object.keys(manifest.dependencies ?? {}).sort()).toEqual([
      '@singula-ai/alego-client-ui-schedule', '@singula-ai/alego-schedule', '@singula-ai/alego-time-context',
    ])
  })

  it('inserts the three Schedule rows switched on', () => {
    const parsed = yaml.load(readFileSync(resolve(root, './cordis.patch.yml'), 'utf8'), { schema: entryListSchema })
    expect(parsed).toEqual([{ insert: [
      { id: 'time-context', name: '@singula-ai/alego-time-context' },
      { id: 'schedule', name: '@singula-ai/alego-schedule' },
      { id: 'ui-schedule', name: '@singula-ai/alego-client-ui-schedule' },
    ] }])
  })
})
