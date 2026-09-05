#!/usr/bin/env node
/** Test driver that sends two turns through one Headless Loader composition. */

import { resolveConfigPath } from '@singula-ai/alego-app-boot'
import { runFixtureTurn } from '@singula-ai/alego-loader-smoke'
import { bootProductionProfile } from '../../../../test-support/loader-smoke/tests/fixtures/production-profile.ts'

const configPath = process.argv[2]
if (configPath === undefined) throw new Error('time-context driver requires a config path')

const ctx = await bootProductionProfile({
  binName: 'time-context-e2e',
  profile: 'headless',
  overlayPaths: [resolveConfigPath(configPath, undefined)],
})
try {
  await runFixtureTurn(ctx, { task: 'first' })
  await runFixtureTurn(ctx, { task: 'second' })
} finally {
  await ctx.fiber.dispose()
}
