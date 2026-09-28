/** Filesystem ownership for the Electron-managed desktop installation. */

import { join } from 'node:path'
import { resolveAlegoHome } from '@singula-ai/alego-home-paths'

/** Stable desktop installation paths under the shared Harness home. */
export interface DesktopPaths {
  readonly profile: string
  readonly lock: string
}

/**
 * Resolve every Electron-owned path without changing the shared data roots.
 * @param alegoHome - Harness home shared with npm-installed alego.
 * @returns immutable desktop path set.
 */
export function resolveDesktopPaths(alegoHome: string = resolveAlegoHome()): DesktopPaths {
  return {
    profile: join(alegoHome, 'profiles', 'desktop'),
    lock: join(alegoHome, 'profiles', 'desktop', 'lock'),
  }
}
