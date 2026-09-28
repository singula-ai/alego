/** Device-local shortcut preferences in Electron userData; writes share one serialized coordinator. */
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { writeFileAtomic } from '@singula-ai/alego-atomic-write'
import { ShortcutPersistence } from '@singula-ai/alego-client-shortcuts/protocol'
import type { ShortcutConfigSnapshot, ShortcutPlatform } from '@singula-ai/alego-client-shortcuts/protocol'

/**
 * Open the device configuration with atomic replacement.
 * @param userData - Electron-owned userData directory, never a Renderer-supplied path.
 * @param platform - local input platform.
 * @param publish - updates the native binding index and trusted product page after commit.
 * @returns the single-writer transaction coordinator.
 */
export function desktopKeybindings(userData: string, platform: ShortcutPlatform,
  publish: (snapshot: ShortcutConfigSnapshot) => void): ShortcutPersistence {
  const path = join(userData, 'keybindings.json')
  return new ShortcutPersistence({
    read: async () => {
      try { return await readFile(path, 'utf8') } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
        throw error
      }
    },
    write: raw => writeFileAtomic(path, raw, { mode: 0o600, dirMode: 0o700 }),
  }, 'desktop', platform, false, publish)
}
