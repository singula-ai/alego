/** Test-only Cordis plugin whose disposer announces entry and never settles. */

import { existsSync } from 'node:fs'

/**
 * Register a disposer that keeps process shutdown pending until it is forced.
 * @param {import('@singula-ai/cordis').Context} ctx - loader-mounted test plugin context.
 */
export function apply(ctx) {
  const keepAlive = setInterval(() => {}, 60_000)
  process.stderr.write('alego-test: never-dispose ready\n')
  ctx.effect(() => async () => {
    clearInterval(keepAlive)
    const armFile = process.env.ALEGO_TEST_SHUTDOWN_ARM_FILE
    if (armFile === undefined || !existsSync(armFile)) return
    process.stderr.write('alego-test: never-dispose started\n')
    await new Promise(() => {})
  })
}
