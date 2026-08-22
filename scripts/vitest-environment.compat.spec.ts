// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'

describe('Vitest jsdom compatibility', () => {
  it('provides isolated browser storage instead of Node process storage', () => {
    if (process.allowedNodeEnvironmentFlags.has('--webstorage')) {
      expect(process.execArgv.filter(argument => argument === '--no-webstorage')).toHaveLength(1)
    }
    localStorage.setItem('alego-vitest-storage-probe', 'available')

    expect(localStorage.getItem('alego-vitest-storage-probe')).toBe('available')
    localStorage.removeItem('alego-vitest-storage-probe')
  })
})
