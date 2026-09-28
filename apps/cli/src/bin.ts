#!/usr/bin/env node
/**
 * Command-line entry for alego.
 * @module @singula-ai/alego/bin
 */

/* v8 ignore file -- built-bin acceptance exercises this self-executing dispatch. */

import { getAlegoRuntimeVersion, loadLayeredEnv, StartupError } from '@singula-ai/alego-app-boot'
import { resolveAlegoHome } from '@singula-ai/alego-home-paths'
import { parseAlegoArgs } from './args.ts'
import { reportStartupFailure } from './startup-diagnostics.ts'

/**
 * Run the public alego command-line interface.
 * @returns a promise that settles when the selected command mode finishes.
 */
export async function runCli(): Promise<void> {
  const version = getAlegoRuntimeVersion()
  const invocation = parseAlegoArgs(process.argv.slice(2), version)

  switch (invocation.mode) {
    case 'profile': {
      const { runProfile } = await import('./profile-boot.ts')
      try {
        await runProfile({
          environment: loadLayeredEnv('alego'),
          profile: invocation.profile,
          fromDefaultProfile: invocation.fromDefaultProfile,
          patchFiles: invocation.patches,
          args: invocation.args,
        })
      } catch (error) {
        if (!(error instanceof StartupError)) throw error
        await reportStartupFailure(error, { home: resolveAlegoHome(), version, profile: invocation.profile })
        process.exit(1)
      }
      break
    }
    case 'plugin': {
      const { runPlugin } = await import('./plugin.ts')
      process.exit(await runPlugin(invocation.profile, invocation.args))
      break
    }
    case 'dump-config': {
      const { runDumpConfig } = await import('./dump-config.ts')
      runDumpConfig(
        invocation.profile,
        invocation.defaultOnly,
        invocation.patches,
        invocation.fromDefaultProfile,
      )
      break
    }
    case 'dump-config-schema': {
      const { runDumpConfigSchema } = await import('./dump-config-schema.ts')
      await runDumpConfigSchema(invocation.profile, invocation.patches, invocation.fromDefaultProfile)
      break
    }
    default:
      invocation satisfies never
      throw new Error(`alego: unhandled invocation mode ${JSON.stringify(invocation)}`)
  }
}

if (import.meta.main) {
  await runCli()
}
