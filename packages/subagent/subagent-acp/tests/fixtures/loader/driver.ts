#!/usr/bin/env node
/** Test driver: one delegation turn through a headless Loader composition. */

import { resolveConfigPath } from '@singula-ai/alego-app-boot'
import { runFixtureTurn } from '@singula-ai/alego-loader-smoke'
import { bootProductionProfile } from '../../../../../test-support/loader-smoke/tests/fixtures/production-profile.ts'

const configPath = process.argv[2]
if (configPath === undefined) throw new Error('acp-subagent cwd driver requires a config path')

const ctx = await bootProductionProfile({
  binName: 'acp-subagent-cwd-e2e',
  profile: 'headless',
  overlayPaths: [resolveConfigPath(configPath, undefined)],
})
try {
  await runFixtureTurn(ctx, { task: 'delegate' })
} finally {
  await ctx.fiber.dispose()
}
