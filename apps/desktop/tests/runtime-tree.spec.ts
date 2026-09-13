import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, expect, it } from 'vitest'
import { DESKTOP_HOST_PACKAGE, DESKTOP_HOST_RUNTIME_FILES } from '../src/core-package-set.ts'
import { DESKTOP_RUNTIME_FILE, desktopRuntimeId, readDesktopRuntime, runtimePath, verifyDesktopRuntime } from '../src/runtime-tree.ts'
import { runtimeFixture } from './runtime-fixture.ts'

const roots: string[] = []
function fixture(): string {
  const root = mkdtempSync(join(tmpdir(), 'desktop-runtime-'))
  roots.push(root)
  runtimeFixture(join(root, 'alego'))
  return root
}
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }) })

it('verifies a runtime after relocation without depending on build paths', async () => {
  const root = fixture()
  const before = await verifyDesktopRuntime(join(root, 'alego'), '1.0.0')
  cpSync(join(root, 'alego'), join(root, 'moved'), { recursive: true })
  expect(desktopRuntimeId(await verifyDesktopRuntime(join(root, 'moved'), '1.0.0'))).toBe(desktopRuntimeId(before))
})
it.each(['changed', 'same-size', 'extra', 'missing'])('checks %s runtime bytes only during build verification', async (operation) => {
  const alego = join(fixture(), 'alego')
  const before = readDesktopRuntime(alego)
  if (operation === 'changed') writeFileSync(join(alego, 'package.json'), '{}')
  if (operation === 'same-size') writeFileSync(join(alego, 'package.json'), '{"type":"Module"}\n')
  if (operation === 'extra') writeFileSync(join(alego, 'extra'), '')
  if (operation === 'missing') rmSync(join(alego, 'package.json'))
  expect(readDesktopRuntime(alego)).toEqual(before)
  await expect(verifyDesktopRuntime(alego, '1.0.0')).rejects.toThrow(/integrity/u)
})
it('rejects filesystem links and incompatible targets', async () => {
  const alego = join(fixture(), 'alego')
  await expect(verifyDesktopRuntime(alego, '1.0.0', { platform: process.platform, arch: 'wrong' })).rejects.toThrow(/incompatible/u)
  symlinkSync(join(alego, 'node_modules'), join(alego, 'outside'), process.platform === 'win32' ? 'junction' : 'dir')
  expect(readDesktopRuntime(alego).release.version).toBe('1.0.0')
  await expect(verifyDesktopRuntime(alego, '1.0.0')).rejects.toThrow(/unsupported filesystem/u)
})
it('reads file inventory records unchanged during startup', () => {
  const alego = join(fixture(), 'alego')
  const path = join(alego, DESKTOP_RUNTIME_FILE)
  const descriptor = JSON.parse(readFileSync(path, 'utf8')) as { files: unknown[] }
  descriptor.files.unshift({ path: '../outside', bytes: -1.5, sha256: 'unchecked', executable: 'unchecked' })
  writeFileSync(path, JSON.stringify(descriptor))
  expect(readDesktopRuntime(alego).files).toEqual(descriptor.files)
})
it.each(['missing', 'directory'])('checks a %s Host entry only during build verification', async (operation) => {
  const alego = join(fixture(), 'alego')
  const path = join(alego, 'node_modules', DESKTOP_HOST_PACKAGE, DESKTOP_HOST_RUNTIME_FILES[0])
  rmSync(path)
  if (operation === 'directory') mkdirSync(path)
  expect(readDesktopRuntime(alego).release.version).toBe('1.0.0')
  await expect(verifyDesktopRuntime(alego, '1.0.0')).rejects.toThrow(/integrity/u)
})
it('checks the shell version only during build verification', async () => {
  const alego = join(fixture(), 'alego')
  expect(readDesktopRuntime(alego).release.version).toBe('1.0.0')
  await expect(verifyDesktopRuntime(alego, '2.0.0')).rejects.toThrow(/does not match Electron/u)
})
it.each([
  { schemaVersion: 2 },
  { platform: 'other' },
  { arch: 'other' },
  { release: { schemaVersion: 2 } },
  { release: { hostProtocolVersion: 999 } },
  { release: { nodeVersion: 'invalid' } },
  { release: { pnpmVersion: 'invalid' } },
])('checks release compatibility only during build verification: %j', async (patch) => {
  const alego = join(fixture(), 'alego')
  const path = join(alego, DESKTOP_RUNTIME_FILE)
  const original = readDesktopRuntime(alego)
  const descriptor = { ...original, ...patch, release: { ...original.release, ...patch.release } }
  writeFileSync(path, JSON.stringify(descriptor))
  expect(readDesktopRuntime(alego)).toEqual(descriptor)
  await expect(verifyDesktopRuntime(alego, '1.0.0')).rejects.toThrow(/invalid|incompatible/u)
})
it.each(['missing', 'invalid-json', 'mismatched'])('checks %s shared manifests only during build verification', async (operation) => {
  const alego = join(fixture(), 'alego')
  const before = readDesktopRuntime(alego)
  const path = join(alego, 'node_modules', DESKTOP_HOST_PACKAGE, 'package.json')
  if (operation === 'missing') rmSync(path)
  else writeFileSync(path, operation === 'invalid-json' ? '{' : '{}')
  expect(readDesktopRuntime(alego)).toEqual(before)
  await expect(verifyDesktopRuntime(alego, '1.0.0')).rejects.toThrow()
})
it('rejects a descriptor that maps a shared package outside node_modules', async () => {
  const alego = join(fixture(), 'alego')
  const path = join(alego, DESKTOP_RUNTIME_FILE)
  const descriptor = JSON.parse(readFileSync(path, 'utf8')) as { sharedPackages: { path: string }[] }
  descriptor.sharedPackages[0]!.path = '../outside'
  writeFileSync(path, JSON.stringify(descriptor))
  await expect(verifyDesktopRuntime(alego, '1.0.0')).rejects.toThrow(/shared package record/u)
})
it('verifies recorded executable permissions only on Unix', async () => {
  const alego = join(fixture(), 'alego')
  const path = join(alego, DESKTOP_RUNTIME_FILE)
  const descriptor = JSON.parse(readFileSync(path, 'utf8')) as { files: { executable: boolean }[] }
  descriptor.files[0]!.executable = !descriptor.files[0]!.executable
  writeFileSync(path, JSON.stringify(descriptor))
  if (process.platform === 'win32') await expect(verifyDesktopRuntime(alego, '1.0.0')).resolves.toMatchObject(descriptor)
  else await expect(verifyDesktopRuntime(alego, '1.0.0')).rejects.toThrow(/integrity/u)
})
it.each(['../outside', '/absolute', 'C:/absolute', 'a\\b', 'a//b', './a'])('rejects nonportable path %s', (path) => {
  expect(() => runtimePath('/runtime', path)).toThrow(/invalid relative path/u)
})
