import { Context } from '@singula-ai/cordis'
import InvariantRegistry from '@singula-ai/alego-invariants'
import { describe, expect, it } from 'vitest'
import * as BrandInvariant from '../src/invariant.ts'
import { apply as nodeApply } from '../src/index.ts'

describe('official brand invariant companion', () => {
  it('reserves package ownership with an empty installer', async () => {
    const ctx = new Context()
    await ctx.plugin(InvariantRegistry, { enabled: true })

    await expect(ctx.plugin(BrandInvariant).await()).resolves.toBeDefined()
  })

  it('keeps the node half as an inert Loader seat', () => {
    expect(() => { nodeApply() }).not.toThrow()
  })
})
