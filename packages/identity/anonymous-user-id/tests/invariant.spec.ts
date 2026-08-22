import { describe, expect, it } from 'vitest'
import { Context } from '@alego/cordis'
import InvariantRegistry from '@alego/invariants'
import * as UserIdInvariant from '@alego/anonymous-user-id/invariant'

describe('invariant companion', () => {
  it('registers the package ownership with an empty installer', async () => {
    const ctx = new Context()
    await ctx.plugin(InvariantRegistry, { enabled: true })
    await expect(ctx.plugin(UserIdInvariant).await()).resolves.toBeDefined()
  })
})
