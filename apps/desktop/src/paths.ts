/** Filesystem ownership for the Electron-managed desktop installation. */

import { join } from 'node:path'
import { resolveAlegoHome } from '@singula-ai/alego-home-paths'

/** Stable desktop installation paths under the shared Harness home. */
export interface DesktopPaths {
  readonly root: string
  readonly profile: string
  readonly lock: string
  readonly pnpm: {
    readonly root: string
    readonly store: string
    readonly cache: string
    readonly state: string
    readonly config: string
    readonly home: string
  }
}

/**
 * Resolve every Electron-owned path without changing the shared data roots.
 * @param alegoHome - Harness home shared with npm-installed alego.
 * @returns immutable desktop path set.
 */
export function resolveDesktopPaths(alegoHome: string = resolveAlegoHome()): DesktopPaths {
  const root = join(alegoHome, 'desktop')
  const pnpm = join(root, 'pnpm')
  return {
    root,
    profile: join(alegoHome, 'profiles', 'desktop'),
    lock: join(alegoHome, 'profiles', 'desktop', 'lock'),
    pnpm: {
      root: pnpm,
      store: join(pnpm, 'store'),
      cache: join(pnpm, 'cache'),
      state: join(pnpm, 'state'),
      config: join(pnpm, 'config'),
      home: join(pnpm, 'home'),
    },
  }
}
