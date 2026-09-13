import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  assertDesktopHostPackageFiles,
  selectDesktopPackageClosure,
  type PackedDesktopPackage,
} from '../scripts/prepare-package-set.ts'

function packed(name: string, manifest: Record<string, unknown> = {}): PackedDesktopPackage {
  return { tarball: `${name}.tgz`, manifest: { name, version: '1.0.0', ...manifest } }
}

describe('desktop package-set selection', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('does not select a packaging target when imported as a library', async () => {
    vi.stubEnv('ALEGO_DESKTOP_TARGET_PLATFORM', 'linux')
    vi.stubEnv('ALEGO_DESKTOP_TARGET_ARCH', 'x64')
    vi.resetModules()
    await expect(import('../scripts/prepare-package-set.ts')).resolves.toHaveProperty('prepareDesktopPackageSet')
  })

  it('includes only the available internal production closure', () => {
    const available = new Map<string, PackedDesktopPackage>([
      ['@singula-ai/alego', packed('@singula-ai/alego', {
        dependencies: { '@singula-ai/alego-base': '^1.0.0', external: '^2.0.0' },
        optionalDependencies: { '@singula-ai/platform-package': '1.0.0', '@singula-ai/missing-platform': '1.0.0' },
      })],
      ['@singula-ai/alego-desktop-host', packed('@singula-ai/alego-desktop-host', {
        dependencies: { '@singula-ai/alego': '^1.0.0' },
      })],
      ['@singula-ai/alego-base', packed('@singula-ai/alego-base', {
        peerDependencies: { '@singula-ai/cordis': '^1.0.0' },
      })],
      ['@singula-ai/cordis', packed('@singula-ai/cordis')],
      ['@singula-ai/platform-package', packed('@singula-ai/platform-package')],
      ['@singula-ai/unused', packed('@singula-ai/unused')],
    ])
    expect(selectDesktopPackageClosure(available).map(entry => entry.manifest.name)).toEqual([
      '@singula-ai/alego',
      '@singula-ai/alego-base',
      '@singula-ai/alego-desktop-host',
      '@singula-ai/cordis',
      '@singula-ai/platform-package',
    ])
  })

  it('rejects a required internal package absent from the packed release inputs', () => {
    const available = new Map<string, PackedDesktopPackage>([
      ['@singula-ai/alego', packed('@singula-ai/alego', {
        dependencies: { '@singula-ai/alego-base': '^1.0.0' },
      })],
      ['@singula-ai/alego-desktop-host', packed('@singula-ai/alego-desktop-host', {
        dependencies: { '@singula-ai/alego': '^1.0.0' },
      })],
    ])
    expect(() => selectDesktopPackageClosure(available)).toThrow(/unpacked internal package/u)
    expect(() => selectDesktopPackageClosure(new Map([
      ['@singula-ai/alego', packed('@singula-ai/alego')],
    ]))).toThrow(/omit @singula-ai\/alego-desktop-host/u)
  })

  it('requires the Desktop Host entry and its packaged overlay', () => {
    const files = [
      'package/lib/index.js',
      'package/config/desktop.cordis.patch.yml',
    ]
    expect(() => {
      assertDesktopHostPackageFiles(files)
    }).not.toThrow()
    expect(() => {
      assertDesktopHostPackageFiles(files.slice(0, 1))
    }).toThrow(/desktop\.cordis\.patch\.yml/u)
    expect(() => {
      assertDesktopHostPackageFiles(files.slice(1))
    }).toThrow(/lib\/index\.js/u)
  })
})
