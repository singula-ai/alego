import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { NotarizeOptions } from '@electron/notarize'
import {
  resolveDesktopAppId,
  resolveMacOSNotarizationEnvironment,
  resolveMacOSSigningEnvironment,
} from '../scripts/desktop-release-environment.mjs'
import { notarizeMacOSDiskImageArtifact } from '../scripts/notarize-macos-disk-images.mjs'
import {
  assertMacOSRuntimeSignatureDetails,
  assertMacOSSignatureDetails,
} from '../scripts/verify-macos-signature.mjs'

const RELEASE_ENVIRONMENT = {
  ALEGO_DESKTOP_APP_ID: 'com.example.desktop',
  ALEGO_DESKTOP_MANDATORY_UPDATE_TEST_ORIGIN: 'https://policy.example.com',
  ALEGO_DESKTOP_MANDATORY_UPDATE_CONFIG: JSON.stringify({ allowedAuthOrigins: ['https://login.example.com'] }),
  ALEGO_DESKTOP_TARGET_PLATFORM: 'darwin',
  ALEGO_DESKTOP_TARGET_ARCH: 'arm64',
  ALEGO_DESKTOP_MACOS_SIGNING_IDENTITY: 'Example Company (TEAMID1234)',
  ALEGO_DESKTOP_MACOS_TEAM_ID: 'TEAMID1234',
  APPLE_API_KEY: '/private/credentials/AuthKey_TEST123456.p8',
  APPLE_API_KEY_ID: 'TEST123456',
  APPLE_API_ISSUER: '11111111-2222-3333-4444-555555555555',
  DOWNLOAD_TEST_ORIGIN: 'https://desktop-updates.example.com', DOWNLOAD_TEST_RELEASE_ID: '0123456789abcdef0123456789abcdef',
}

function portablePath(value: string): string {
  return value.replaceAll('\\', '/')
}

describe('desktop macOS release signature', () => {
  beforeAll(() => {
    for (const [name, value] of Object.entries(RELEASE_ENVIRONMENT)) vi.stubEnv(name, value)
  })

  afterAll(() => {
    vi.unstubAllEnvs()
  })

  it('loads release identifiers from the environment and requires code signing', async () => {
    const { createElectronBuilderConfig } = await import('../electron-builder.config.mjs')
    const config = createElectronBuilderConfig(RELEASE_ENVIRONMENT, 'darwin', 'arm64')
    expect(config.protocols).toEqual([{ name: 'Alego', schemes: ['alego'] }])
    expect(portablePath(config.directories.output)).toContain('/.desktop-build/targets/mac-arm64/artifacts')
    expect(config.mac.extendInfo.NSMicrophoneUsageDescription).toContain('microphone')
    expect(config.extraResources).toHaveLength(2)
    expect(config.extraResources[0]?.to).toBe('runtime')
    expect(portablePath(config.extraResources[0]?.from ?? '')).toContain('/.desktop-build/targets/mac-arm64/runtime')
    const [alegoFiles, alegoNodeModules] = config.files.slice(-2)
    if (!alegoFiles || !alegoNodeModules || typeof alegoFiles === 'string' || typeof alegoNodeModules === 'string') {
      throw new Error('desktop ALEGO resources must use electron-builder file mappings')
    }
    expect(portablePath(alegoFiles.from)).toContain('/.desktop-build/targets/mac-arm64/alego')
    expect(alegoFiles.to).toBe('alego')
    expect(portablePath(alegoNodeModules.from)).toContain('/.desktop-build/targets/mac-arm64/alego/node_modules')
    expect(alegoNodeModules.to).toBe('alego/node_modules')
    expect(config.asarUnpack).toEqual(expect.arrayContaining([
      '**/*.{node,dylib,dll,so,exe}',
      '**/@vscode/ripgrep-*/bin/rg',
    ]))
    expect(config).toMatchObject({
      appId: RELEASE_ENVIRONMENT.ALEGO_DESKTOP_APP_ID,
      mac: {
        identity: RELEASE_ENVIRONMENT.ALEGO_DESKTOP_MACOS_SIGNING_IDENTITY,
        forceCodeSigning: true,
        notarize: true,
        signIgnore: ['/Contents/Resources/app\\.asar\\.unpacked/alego(?:/|$)', '/Contents/Resources/runtime/primary-runtime(?:/|$)', '\\.pak$'],
      },
      dmg: {
        sign: true,
        writeUpdateInfo: false,
      },
      publish: [{
        provider: 'generic',
        url: 'https://desktop-updates.example.com/alego-desk/0123456789abcdef0123456789abcdef/feeds/mac-arm64/',
        channel: 'nightly',
      }],
    })
    expect(typeof config.artifactBuildCompleted).toBe('function')
  })

  it('seals PAK resources with their enclosing bundle while signing executable code', async () => {
    const { createElectronBuilderConfig } = await import('../electron-builder.config.mjs')
    const config = createElectronBuilderConfig(RELEASE_ENVIRONMENT, 'darwin', 'arm64')
    const ignored = (path: string): boolean => config.mac.signIgnore.some(pattern => new RegExp(pattern).test(path))
    expect(ignored('/App.app/Contents/Frameworks/Electron.framework/Versions/A/Resources/en.lproj/locale.pak')).toBe(true)
    expect(ignored('/App.app/Contents/Frameworks/Electron.framework/Versions/A/Resources/resources.pak')).toBe(true)
    for (const path of [
      '/App.app/Contents/Resources/runtime/node/node',
      '/App.app/Contents/Resources/runtime/pnpm/addon.node',
      '/App.app/Contents/Frameworks/Electron.framework/Versions/A/library.dylib',
      '/App.app/Contents/Frameworks/Electron.framework',
      '/App.app',
    ]) expect(ignored(path)).toBe(false)
  })

  it('validates Windows signing without requiring macOS identifiers for a Windows target', async () => {
    const { createElectronBuilderConfig } = await import('../electron-builder.config.mjs')
    expect(() => createElectronBuilderConfig({
      ALEGO_DESKTOP_APP_ID: RELEASE_ENVIRONMENT.ALEGO_DESKTOP_APP_ID,
      ALEGO_DESKTOP_MANDATORY_UPDATE_TEST_ORIGIN: 'https://policy.example.com',
      ALEGO_DESKTOP_MANDATORY_UPDATE_CONFIG: JSON.stringify({ allowedAuthOrigins: ['https://login.example.com'] }),
      ALEGO_DESKTOP_TARGET_PLATFORM: 'win32',
    }, 'win32')).toThrow(/ALEGO_DESKTOP_WINDOWS_CER_FILE/u)
  })

  it('isolates unsigned Windows artifacts and omits updater metadata without release credentials', async () => {
    const { createElectronBuilderConfig } = await import('../electron-builder.config.mjs')
    const config = createElectronBuilderConfig({
      ALEGO_DESKTOP_APP_ID: RELEASE_ENVIRONMENT.ALEGO_DESKTOP_APP_ID,
      ALEGO_DESKTOP_MANDATORY_UPDATE_TEST_ORIGIN: 'https://policy.example.com',
      ALEGO_DESKTOP_MANDATORY_UPDATE_CONFIG: JSON.stringify({ allowedAuthOrigins: ['https://login.example.com'] }),
      ALEGO_DESKTOP_TARGET_PLATFORM: 'win32',
      ALEGO_DESKTOP_UNSIGNED: '1',
    }, 'win32', 'x64')
    expect(portablePath(config.directories.output)).toContain('/targets/win-x64/unsigned-artifacts')
    expect(portablePath(config.nsis.include)).toMatch(/\/scripts\/installer\.nsh$/u)
    expect(config).toMatchObject({
      win: { forceCodeSigning: false, signtoolOptions: { sign: undefined } },
      publish: null,
    })
  })

  it('rejects unsigned macOS builds and malformed signing modes', async () => {
    const { createElectronBuilderConfig } = await import('../electron-builder.config.mjs')
    expect(() => createElectronBuilderConfig({ ...RELEASE_ENVIRONMENT, ALEGO_DESKTOP_UNSIGNED: '1' }))
      .toThrow(/unsigned builds require Windows/u)
    expect(() => createElectronBuilderConfig({ ...RELEASE_ENVIRONMENT, ALEGO_DESKTOP_UNSIGNED: 'yes' }))
      .toThrow(/must be 0 or 1/u)
  })

  it('accepts the configured authority and team', () => {
    const expected = resolveMacOSSigningEnvironment(RELEASE_ENVIRONMENT)
    expect(() => {
      assertMacOSSignatureDetails([
        `Authority=Developer ID Application: ${expected.signingIdentity}`,
        `TeamIdentifier=${expected.teamId}`,
      ].join('\n'), expected)
    }).not.toThrow()
  })

  it('requires a secure timestamp and hardened runtime for runtime code', () => {
    const expected = resolveMacOSSigningEnvironment(RELEASE_ENVIRONMENT)
    const details = [
      `Authority=Developer ID Application: ${expected.signingIdentity}`,
      `TeamIdentifier=${expected.teamId}`,
      'Timestamp=31 Aug 2026 at 20:00:00',
      'CodeDirectory v=20500 size=773 flags=0x10000(runtime) hashes=13+7 location=embedded',
    ].join('\n')
    expect(() => { assertMacOSRuntimeSignatureDetails(details, expected) }).not.toThrow()
    expect(() => {
      assertMacOSRuntimeSignatureDetails(details.replace(/^Timestamp=.*\n/um, ''), expected)
    }).toThrow(/secure timestamp/u)
    expect(() => {
      assertMacOSRuntimeSignatureDetails(details.replace('flags=0x10000(runtime)', 'flags=0x0(none)'), expected)
    }).toThrow(/hardened runtime/u)
  })

  it('rejects another developer identity', () => {
    const expected = resolveMacOSSigningEnvironment(RELEASE_ENVIRONMENT)
    expect(() => {
      assertMacOSSignatureDetails([
        'Authority=Developer ID Application: Other Company (OTHERID123)',
        'TeamIdentifier=OTHERID123',
      ].join('\n'), expected)
    }).toThrow(/release identity/u)
  })

  it('rejects an unexpected team even when the authority is present', () => {
    const expected = resolveMacOSSigningEnvironment(RELEASE_ENVIRONMENT)
    expect(() => {
      assertMacOSSignatureDetails([
        `Authority=Developer ID Application: ${expected.signingIdentity}`,
        'TeamIdentifier=OTHERID123',
      ].join('\n'), expected)
    }).toThrow(`TeamIdentifier=${expected.teamId}`)
  })

  it('rejects missing and malformed release identifiers', () => {
    expect(() => resolveDesktopAppId({})).toThrow(/ALEGO_DESKTOP_APP_ID/u)
    expect(() => resolveDesktopAppId({ ALEGO_DESKTOP_APP_ID: 'not-a-bundle-id' })).toThrow(/reverse-DNS/u)
    expect(() => resolveMacOSSigningEnvironment({})).toThrow(/ALEGO_DESKTOP_MACOS_SIGNING_IDENTITY/u)
    expect(() => resolveMacOSSigningEnvironment({
      ALEGO_DESKTOP_MACOS_SIGNING_IDENTITY: 'Developer ID Application: Example Company (TEAMID1234)',
      ALEGO_DESKTOP_MACOS_TEAM_ID: 'TEAMID1234',
    })).toThrow(/must omit/u)
    expect(() => resolveMacOSSigningEnvironment({
      ALEGO_DESKTOP_MACOS_SIGNING_IDENTITY: 'Example Company (TEAMID1234)',
      ALEGO_DESKTOP_MACOS_TEAM_ID: 'short',
    })).toThrow(/10 uppercase/u)
  })

  it('requires one complete notarization credential strategy', () => {
    expect(resolveMacOSNotarizationEnvironment(RELEASE_ENVIRONMENT)).toEqual({
      appleApiKey: RELEASE_ENVIRONMENT.APPLE_API_KEY,
      appleApiKeyId: RELEASE_ENVIRONMENT.APPLE_API_KEY_ID,
      appleApiIssuer: RELEASE_ENVIRONMENT.APPLE_API_ISSUER,
    })
    expect(resolveMacOSNotarizationEnvironment({
      APPLE_KEYCHAIN_PROFILE: 'alego-notary',
    })).toEqual({ keychainProfile: 'alego-notary' })
    expect(() => resolveMacOSNotarizationEnvironment({})).toThrow(/macOS packaging requires/u)
    expect(() => resolveMacOSNotarizationEnvironment({ APPLE_API_KEY: '/tmp/key.p8' })).toThrow(/APPLE_API_KEY_ID/u)
  })

  it('notarizes and qualifies a DMG before electron-builder publishes it', async () => {
    const submitted: string[] = []
    const submit = vi.fn(async (options: NotarizeOptions) => { submitted.push(options.appPath) })
    const verified: string[] = []
    const verify = vi.fn((path: string) => { verified.push(path) })
    await notarizeMacOSDiskImageArtifact(
      { file: '/tmp/release.dmg' },
      RELEASE_ENVIRONMENT,
      resolveMacOSSigningEnvironment(RELEASE_ENVIRONMENT),
      submit,
      verify,
    )
    await notarizeMacOSDiskImageArtifact(
      { file: '/tmp/release.zip' },
      RELEASE_ENVIRONMENT,
      resolveMacOSSigningEnvironment(RELEASE_ENVIRONMENT),
      submit,
      verify,
    )
    expect(submitted).toEqual(['/tmp/release.dmg'])
    expect(verified).toEqual(['/tmp/release.dmg'])
  })
})
