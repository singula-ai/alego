import { describe, expect, it } from 'vitest'
import { publishRetryDirective } from './publish.ts'

const E429 = 'npm error code E429\nnpm error 429 Too Many Requests - PUT … rate limited exceeded'
const E409 = 'npm error code E409\nnpm error Failed to save packument'
const E403 = 'npm error code E403\nnpm error You cannot publish over the previously published versions'

describe('publishRetryDirective', () => {
  it('waits minutes for a rate limit and gives up on the sixth attempt', () => {
    expect([0, 1, 2, 3, 4].map(prior => publishRetryDirective(E429, 0, prior)?.delayMs))
      .toEqual([60_000, 120_000, 240_000, 480_000, 960_000])
    expect(publishRetryDirective(E429, 0, 5)).toBeUndefined()
  })

  it('keeps the seconds ladder for packument settling and gives up on the fourth attempt', () => {
    expect([0, 1, 2].map(prior => publishRetryDirective(E409, prior, 0)?.delayMs))
      .toEqual([2_000, 4_000, 8_000])
    expect(publishRetryDirective(E409, 3, 0)).toBeUndefined()
  })

  it('never retries a rejected payload', () => {
    expect(publishRetryDirective(E403, 0, 0)).toBeUndefined()
  })

  it('tracks the two budgets independently', () => {
    // Exhausted settling attempts leave the full rate-limit budget, and the reverse.
    expect(publishRetryDirective(E429, 3, 0)?.delayMs).toBe(60_000)
    expect(publishRetryDirective(E409, 0, 5)?.delayMs).toBe(2_000)
  })

  it('labels each directive with its own budget', () => {
    expect(publishRetryDirective(E429, 0, 0)).toMatchObject({ rateLimited: true, attempt: 1, budget: 6 })
    expect(publishRetryDirective(E409, 1, 0)).toMatchObject({ rateLimited: false, attempt: 2, budget: 4 })
  })
})
