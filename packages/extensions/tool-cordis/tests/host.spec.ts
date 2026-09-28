import { Context } from '@singula-ai/cordis'
import { CordisInspectRegistryService } from '@singula-ai/alego-cordis-host-runner'
import SystemPrompt from '@singula-ai/alego-system-prompt'
import ToolRegistry from '@singula-ai/alego-tools'
import { describe, expect, it } from 'vitest'
import * as CordisInspectProviders from '../src/host.ts'

/**
 * The Host inspect providers are one process-global set: the host entry
 * registers them beside the registry, and the per-session tool rows only read
 * them. Mounting several presets that carry `tool-cordis` over the shared
 * registry is covered by `apps/cli/tests/web-agent-presets.e2e.ts`.
 */

async function host(): Promise<Context> {
  const ctx = new Context()
  // The tool registry injects `systemPrompt`; nothing under test registers a prompt section.
  await ctx.plugin(SystemPrompt)
  await ctx.plugin(ToolRegistry)
  await ctx.plugin(CordisInspectRegistryService)
  return ctx
}

describe('the cordis-inspect-providers host entry', () => {
  it('registers the first-party Host providers and withdraws them on disposal', async () => {
    const ctx = await host()
    const fiber = ctx.plugin(CordisInspectProviders)
    await fiber

    expect(ctx.cordisInspect.list().map(provider => provider.id)).toEqual(['Service', 'Event', 'Config', 'Tool'])

    await fiber.dispose()
    expect(ctx.cordisInspect.list()).toEqual([])
  })
})
