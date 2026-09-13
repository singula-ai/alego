/** FileTypeIcon's default per-category palette as CSS text. */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import type { CodeFileType, FileType } from '@singula-ai/alego-client-ui-primitives'

const css = readFileSync(fileURLToPath(new URL('../src/FileTypeIcon.module.css', import.meta.url)), 'utf8')

type TraditionalFileType = Exclude<FileType, CodeFileType>

const TYPE_COLORS: Readonly<Record<TraditionalFileType, string>> = {
  code: 'var(--dsw-static-deepseek-500)',
  excel: 'var(--dsw-static-green-500)',
  folder: 'var(--dsw-static-amber-400)',
  html: 'var(--dsw-static-deepseek-500)',
  image: 'var(--alego-file-type-violet)',
  markdown: 'var(--dsw-static-deepseek-500)',
  other: 'var(--dsw-static-neutral-bluish-300)',
  pdf: 'var(--dsw-static-red-600)',
  ppt: 'var(--dsw-static-amber-500)',
  video: 'var(--alego-file-type-violet)',
  word: 'var(--dsw-static-deepseek-450)',
}

describe('FileTypeIcon.module.css', () => {
  it.each(Object.entries(TYPE_COLORS) as [TraditionalFileType, string][])(
    '%s has its own default color',
    (type, color) => {
      const rule = css.match(new RegExp(`\\.${type}\\s*\\{([^}]*)\\}`))?.[1]
      expect(rule).toContain(`--alego-file-type-default-color: ${color}`)
    },
  )

  it('keeps one caller override and the supplied violet in named variables', () => {
    expect(css).toContain('color: var(--alego-file-type-icon-color, var(--alego-file-type-default-color))')
    expect(css).toContain('--alego-file-type-violet: rgb(139, 118, 246)')
  })
})
