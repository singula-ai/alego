#!/usr/bin/env node
/**
 * Boot an ACP stdio server from `cordis.yml`; usage is
 * `alego-acp-demo [--config path]`, defaulting to `./cordis.yml`. Shared env
 * loading, Loader guards, snapshot config selection, and settled-tree boot live
 * in alego-app-boot. Replay skips `.env` and selects sibling
 * `cordis.snapshot.yml` so a stray key cannot trigger a model call. EOF disposes
 * and flushes snapshot runs; the calling automation owns process lifetime. Stdout is
 * reserved for JSON-RPC, so diagnostics go only to stderr.
 * @module @alego/acp-demo/bin
 */

import { parseArgs } from 'node:util'
import { boot, installFailLoud, loadEnv, resolveConfigPath } from '@alego/app-boot'

const NAME = 'alego-acp-demo'

/* v8 ignore start -- thin self-executing composition over the unit-tested
   alego-app-boot helpers; exercised end-to-end by the snapshot suite and the
   built-bin smoke */
installFailLoud(NAME)
const snapshotMode = process.env['ALEGO_SNAPSHOT']
if (snapshotMode !== 'replay') loadEnv(NAME)
const { values } = parseArgs({
  args: process.argv.slice(2),
  options: { config: { type: 'string', short: 'c' } },
  strict: true,
})
const ctx = await boot(NAME, resolveConfigPath(values.config ?? './cordis.yml', snapshotMode))
if (snapshotMode !== undefined) {
  process.stdin.on('end', () => {
    void ctx.fiber.dispose().then(() => { process.exit(0) })
  })
}
/* v8 ignore stop */
