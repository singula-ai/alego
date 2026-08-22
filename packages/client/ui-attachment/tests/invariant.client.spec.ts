import { describe, expect, it } from 'vitest'
import { Context } from '@singula-ai/cordis'
import * as AttachmentInvariant from '@singula-ai/alego-client-ui-attachment/invariant'
import InvariantRegistry from '@singula-ai/alego-invariants'

describe('invariant companion', () => {
  it('registers under the package name with an empty installer', async () => {
    const ctx = new Context()
    await ctx.plugin(InvariantRegistry, { enabled: true })
    await expect(ctx.plugin(AttachmentInvariant).await()).resolves.toBeDefined()
  })
})
