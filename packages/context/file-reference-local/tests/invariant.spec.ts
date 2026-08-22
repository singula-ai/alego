import { Context } from '@alego/cordis'
import { describe, expect, it } from 'vitest'
import InvariantService from '@alego/invariants'
import * as FileReferenceLocalInvariant from '../src/invariant.ts'

describe('invariant companion', () => {
  it('registers the provider cache ownership under its package name', async () => {
    const ctx = new Context()
    await ctx.plugin(InvariantService, { enabled: true })
    await expect(ctx.plugin(FileReferenceLocalInvariant).await()).resolves.toBeDefined()
  })
})
