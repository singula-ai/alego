import { describe, expect, it } from 'vitest'
import { Context } from '@alego/cordis'
import * as SlotsInvariant from '@alego/client-ui-slots/invariant'
import InvariantRegistry from '@alego/invariants'

describe('invariant companion', () => {
  it('registers under the package name with an empty installer', async () => {
    const ctx = new Context()
    await ctx.plugin(InvariantRegistry, { enabled: true })
    await expect(ctx.plugin(SlotsInvariant).await()).resolves.toBeDefined()
  })
})
