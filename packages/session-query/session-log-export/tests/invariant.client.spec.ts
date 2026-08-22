import { describe, expect, it, vi } from 'vitest'
import { Context } from '@singula-ai/cordis'
import { apply, inject, name } from '../src/invariant.ts'

describe('@singula-ai/alego-session-log-export/invariant', () => {
  it('registers the package-owned empty companion', async () => {
    const register = vi.fn(() => vi.fn())
    const ctx = new Context()
    ctx.provide('invariants', { register })
    const dispose = await apply(ctx)
    expect(name).toBe('session-export-invariant')
    expect(inject).toEqual(['invariants'])
    expect(register).toHaveBeenCalledWith('@singula-ai/alego-session-log-export', expect.any(Function))
    dispose()
  })
})
