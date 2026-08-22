/**
 * Keyless smoke for the plugin surface: boot the real `cordis.yml` through the
 * app boot path and the Cordis Loader, then assert that the locally mounted
 * plugin's tool is registered, schema-visible, and executable. No model, no
 * network, no key — this covers the wiring a plugin author depends on.
 *
 * Each boot runs against a temporary copy of the leaf: the Loader owns the
 * config file it boots and writes entry state back to it, so booting the
 * checked-in copy would rewrite tracked source.
 */

import { cpSync, mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, describe, expect, it } from 'vitest'
import { boot } from '@singula-ai/alego-app-boot'
import type {} from '@singula-ai/alego-tools'

const leaf = fileURLToPath(new URL('..', import.meta.url))
const examplesRoot = fileURLToPath(new URL('../..', import.meta.url))
const staged: string[] = []

/**
 * Copy the leaf to a disposable sibling and return its bootable config path.
 * The copy stays under `examples/` because that directory is the module
 * resolution root for example configs: outside it, the `@singula-ai/alego-*` entries and
 * the plugin's own imports do not resolve.
 * @returns absolute path of the staged `cordis.yml`.
 */
function stagedConfig(): string {
  const dir = mkdtempSync(join(examplesRoot, '.tmp-hello-world-'))
  staged.push(dir)
  cpSync(leaf, dir, { recursive: true })
  return join(dir, 'cordis.yml')
}

afterAll(() => {
  for (const dir of staged) rmSync(dir, { recursive: true, force: true })
})

describe('hello-world plugin through a real Loader composition', () => {
  it('registers, publishes, and executes its tool', async () => {
    const ctx = await boot('alego-hello-world', stagedConfig())
    try {
      const entries = [...ctx.loader.entries()]
      expect(entries.some(entry => entry.options.name === './src/hello-world.ts' && entry.fiber !== undefined)).toBe(true)

      const tool = ctx.tools.get('hello_world')
      expect(tool).toBeDefined()
      expect(ctx.tools.schemas().map(schema => schema.name)).toContain('hello_world')

      await expect(tool?.execute({ name: 'world' }, { agent: undefined } as never))
        .resolves.toEqual({ message: 'Hello, world!' })
    } finally {
      await ctx.fiber.dispose()
    }
  })

  it('withdraws its tool when the plugin fiber is disposed', async () => {
    const ctx = await boot('alego-hello-world', stagedConfig())
    try {
      const entry = [...ctx.loader.entries()].find(candidate => candidate.options.name === './src/hello-world.ts')
      expect(entry?.fiber).toBeDefined()
      await entry?.fiber?.dispose()
      expect(ctx.tools.get('hello_world')).toBeUndefined()
    } finally {
      await ctx.fiber.dispose()
    }
  })
})
