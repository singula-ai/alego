// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { DocumentTitle } from '../src/client/DocumentTitle.tsx'

afterEach(() => {
  cleanup()
  document.title = ''
  vi.unstubAllEnvs()
})

describe('DocumentTitle', () => {
  it('projects a durable title and restores the product title', () => {
    vi.stubEnv('ALEGO_CLIENT_TITLE', 'Alego')
    document.title = 'stale title'
    const mounted = render(<DocumentTitle productTitle="Alego" />)
    expect(document.title).toBe('Alego')
    mounted.rerender(<DocumentTitle title="First title" productTitle="Alego" />)
    expect(document.title).toBe('First title — Alego')
    mounted.rerender(<DocumentTitle title="Revised title" productTitle="Alego" />)
    expect(document.title).toBe('Revised title — Alego')
    mounted.rerender(<DocumentTitle productTitle="Alego" />)
    expect(document.title).toBe('Alego')
    mounted.unmount()
    expect(document.title).toBe('Alego')
  })

  it('uses the generic title when the build provides no title', () => {
    vi.stubEnv('ALEGO_CLIENT_TITLE', '')
    delete process.env.ALEGO_CLIENT_TITLE
    const mounted = render(<DocumentTitle title="First title" productTitle="ALEGO Local Build" />)
    expect(document.title).toBe('First title — ALEGO Local Build')
    mounted.unmount()
    expect(document.title).toBe('ALEGO Local Build')
  })
})
