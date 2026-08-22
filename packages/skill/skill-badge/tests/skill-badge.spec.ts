import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { Context } from '@alego/cordis'
import { describe, expect, it } from 'vitest'
import SkillRegistry from '@alego/skill'
import * as SkillBadge from '@alego/skill-badge'

describe('alego-skill-badge', () => {
  it('registers and disposes the bundled badge skill', async () => {
    const ctx = new Context()
    await ctx.plugin(SkillRegistry)
    const fiber = await ctx.plugin(SkillBadge)
    const resourcePath = fileURLToPath(new URL('../assets/', import.meta.url))

    expect(await ctx.skills.list()).toEqual([{
      name: 'alego-badge',
      description: 'Add the official “powered by alego” badge to documents, pull requests, merge requests, and other content produced with Alego. Use whenever creating a pull request or merge request. Also use when the user asks for an alego badge, powered-by-alego attribution, or a reusable alego badge asset or snippet.',
      invocation: { modelInvocable: true, userInvocable: true },
      provider: 'alego-badge',
      source: 'bundled',
      resourceBase: { kind: 'directory', path: resourcePath },
    }])
    const loaded = await ctx.skills.get('alego-badge')
    expect(loaded?.content).toContain('Preserve the badge\'s 121×20 dimensions')
    expect(loaded?.resourceBase).toEqual({ kind: 'directory', path: resourcePath })

    await fiber.dispose()
    expect(await ctx.skills.list()).toEqual([])
  })

  it('ships the official 726×120 PNG unchanged', async () => {
    const image = await readFile(new URL('../assets/alego-badge.png', import.meta.url))
    expect(image.readUInt32BE(16)).toBe(726)
    expect(image.readUInt32BE(20)).toBe(120)
    expect(createHash('sha256').update(image).digest('hex')).toBe(
      'd7925cd9090a1857564cdb01eb06aefb322aa5ec4e946d22c57fc10ea39a3262',
    )
  })
})
