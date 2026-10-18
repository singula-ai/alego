import { spawnSync } from 'node:child_process'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, it } from 'vitest'
import { loadDesktopPackageEnvironment } from '../scripts/desktop-package-environment.mjs'

async function withPreset(run: (root: string) => Promise<void>) {
  const root = await mkdtemp(join(tmpdir(), 'alego-windows-preset-'))
  try {
    await mkdir(join(root, 'presets'))
    await mkdir(join(root, 'secrets'))
    await writeFile(join(root, 'presets/test.env'), 'ALEGO_DESKTOP_AUTO_UPDATE_ENV=test\nALEGO_DESKTOP_APP_ID=com.example.desktop\n')
    await run(root)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
}

it('loads unsigned public settings without requiring the signing secret file or personal dotenv', async () => {
  await withPreset(async (root) => {
    const environment = loadDesktopPackageEnvironment('win32', {
      ALEGO_PACKAGING_CONFIG_DIR: root, ALEGO_PACKAGING_PRESET: 'test', ALEGO_DESKTOP_WINDOWS_TOKEN_PIN: 'ambient-secret',
    }, join(root, 'missing-checkout'), { unsigned: true })
    expect(environment.ALEGO_DESKTOP_APP_ID).toBe('com.example.desktop')
    expect(environment.ALEGO_DESKTOP_WINDOWS_TOKEN_PIN).toBeUndefined()
    const prepared = loadDesktopPackageEnvironment('win32', {
      ALEGO_PACKAGING_CONFIG_DIR: root, ALEGO_PACKAGING_PRESET: 'test',
    }, root, { prepareOnly: true })
    expect(prepared.ALEGO_DESKTOP_WINDOWS_TOKEN_PIN).toBeUndefined()
    expect(prepared.ALEGO_PACKAGING_PRESET).toBe('test')
    expect(() => loadDesktopPackageEnvironment('win32', { ALEGO_PACKAGING_CONFIG_DIR: root, ALEGO_PACKAGING_PRESET: 'test' }))
      .toThrow(/cannot read/u)
  })
})

it('resolves signing file paths relative to the secret file and rejects public overrides there', async () => {
  await withPreset(async (root) => {
    const env = { ALEGO_PACKAGING_CONFIG_DIR: root, ALEGO_PACKAGING_PRESET: 'test' }
    const file = join(root, 'secrets/windows-signing.env')
    await writeFile(file, 'ALEGO_DESKTOP_WINDOWS_CER_FILE=../certificates/ev.cer\nALEGO_DESKTOP_WINDOWS_TOKEN_PIN="private-value"\n')
    const result = loadDesktopPackageEnvironment('win32', env)
    expect(result.ALEGO_DESKTOP_WINDOWS_CER_FILE).toBe(join(root, 'certificates/ev.cer'))
    expect(result.ALEGO_DESKTOP_WINDOWS_TOKEN_PIN).toBe('private-value')
    await writeFile(file, 'ALEGO_DESKTOP_AUTO_UPDATE_ENV=production\n')
    expect(() => loadDesktopPackageEnvironment('win32', env)).toThrow(/unsupported setting/u)
  })
})

it('preserves the selected preset when Windows environment enumeration uses lowercase keys', async () => {
  await withPreset(async (root) => {
    const values: NodeJS.ProcessEnv = { alego_packaging_config_dir: root, alego_packaging_preset: 'test' }
    const environment = new Proxy(values, {
      get: (target, name) => typeof name === 'string' ? target[name.toLowerCase()] : undefined,
    })
    const selected = loadDesktopPackageEnvironment('win32', environment, root, { unsigned: true })
    expect(selected.ALEGO_PACKAGING_PRESET).toBe('test')
  })
})

it('rejects missing presets, traversal, deployment mismatches and secrets in public configuration', async () => {
  await withPreset(async (root) => {
    const env = { ALEGO_PACKAGING_CONFIG_DIR: root, ALEGO_PACKAGING_PRESET: 'test' }
    const load = (override = {}) => loadDesktopPackageEnvironment('win32', { ...env, ...override }, root, { unsigned: true })
    expect(() => load({ ALEGO_PACKAGING_CONFIG_DIR: 'relative' })).toThrow(/absolute/u)
    expect(() => load({ ALEGO_PACKAGING_CONFIG_DIR: undefined })).toThrow(/absolute/u)
    expect(() => load({ ALEGO_PACKAGING_PRESET: '../secrets' })).toThrow(/preset must/u)
    expect(() => load({ ALEGO_PACKAGING_PRESET: 'production' })).toThrow(/cannot read/u)
    await writeFile(join(root, 'presets/test.env'), 'ALEGO_DESKTOP_AUTO_UPDATE_ENV=production\n')
    expect(() => load()).toThrow(/must match/u)
    await writeFile(join(root, 'presets/test.env'), 'ALEGO_DESKTOP_WINDOWS_TOKEN_PIN=private-value\n')
    expect(() => load()).toThrow(/unsupported setting ALEGO_DESKTOP_WINDOWS_TOKEN_PIN/u)
    expect(() => load()).not.toThrow(/private-value/u)
  })
})

it('cache maintenance reaches cache path validation without a signing file', async () => {
  await withPreset(async (root) => {
    await writeFile(join(root, 'presets/test.env'),
      'ALEGO_DESKTOP_AUTO_UPDATE_ENV=test\nALEGO_DESKTOP_WINDOWS_SIGNATURE_CACHE_DIR=relative-cache\n')
    const result = spawnSync(process.execPath,
      [join(import.meta.dirname, '../scripts/manage-windows-signature-cache.mjs'), '--usage'], {
        env: { ...process.env, ALEGO_PACKAGING_CONFIG_DIR: root, ALEGO_PACKAGING_PRESET: 'test' },
        encoding: 'utf8', timeout: 10_000, windowsHide: true,
      })
    expect(result.error).toBeUndefined()
    expect(result.signal).toBeNull()
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('absolute local')
    expect(result.stderr).not.toContain('cannot read')
  })
})

it.each(['win32', 'darwin'] as const)('applies an explicit test channel override on %s without changing the preset file', async (platform) => {
  await withPreset(async (root) => {
    const path = join(root, 'presets/test.env')
    const original = 'a'.repeat(32)
    await writeFile(path, `ALEGO_DESKTOP_AUTO_UPDATE_ENV=test\nDOWNLOAD_TEST_RELEASE_ID=${original}\n`)
    const env = { ALEGO_PACKAGING_CONFIG_DIR: root, ALEGO_PACKAGING_PRESET: 'test' }
    const select = (id: string) => loadDesktopPackageEnvironment(platform,
      { ...env, PACKAGE_TEST_RELEASE_ID: id }, root, { unsigned: true })
    expect(select('b'.repeat(32)).DOWNLOAD_TEST_RELEASE_ID).toBe('b'.repeat(32))
    expect(select('').DOWNLOAD_TEST_RELEASE_ID).toBe(original)
    expect(select('   ').DOWNLOAD_TEST_RELEASE_ID).toBe(original)
    expect(() => select('../other')).toThrow(/32 lowercase hexadecimal/u)
    expect(() => select('A'.repeat(32))).toThrow(/32 lowercase hexadecimal/u)
    await writeFile(join(root, 'presets/production.env'), 'ALEGO_DESKTOP_AUTO_UPDATE_ENV=production\n')
    expect(() => loadDesktopPackageEnvironment(platform,
      { ...env, ALEGO_PACKAGING_PRESET: 'production', PACKAGE_TEST_RELEASE_ID: original }, root, { unsigned: true }))
      .toThrow(/requires the test preset/u)
  })
})
