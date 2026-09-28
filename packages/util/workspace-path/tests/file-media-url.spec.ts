import { describe, expect, it } from 'vitest'
import { fileMediaUrl } from '../src/index.ts'

describe('fileMediaUrl', () => {
  it.each(['/work/测试 文件#100%.png', 'C:\\work\\测试 文件.png'])(
    'preserves the decoded native path %s under a mounted application', (path) => {
      const url = new URL(fileMediaUrl('https://host/tools/alego/', path)!)
      expect(url.pathname).toBe('/tools/alego/api/file')
      expect(url.searchParams.get('path')).toBe(path)
    },
  )
  it.each(['image.png', '//host/image.png', '\\\\host\\image.png', '/work/\u0000.png', '/work/\n.png'])(
    'rejects a non-local or invalid path %s', (path) => {
      expect(fileMediaUrl('https://host/', path)).toBeUndefined()
    },
  )
  it.each(['alego-app://app/', 'alego-app://app/index.html'])(
    'serves decoded native paths through the Desktop application %s', (base) => {
      for (const path of ['/work/测试 文件#100%.png', 'C:\\work\\测试 文件.png']) {
        const url = new URL(fileMediaUrl(base, path)!)
        expect(url.href.split('?')[0]).toBe('alego-app://app/api/file')
        expect(url.searchParams.get('path')).toBe(path)
      }
    },
  )
  it.each(['file:///app/', 'alego-app://shell/', 'alego-app://app.example/', 'alego-app://app:80/',
    'alego-app://user@app/', 'alego-app://app@other/', 'about:blank'])(
    'rejects an unsupported application base %s', (base) => {
      expect(fileMediaUrl(base, '/work/image.png')).toBeUndefined()
    },
  )
})
