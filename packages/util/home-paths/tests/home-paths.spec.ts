import { mkdir, mkdtemp, realpath, rm, symlink, writeFile } from 'node:fs/promises'
import { homedir, tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_ALEGO_HOME_DISPLAY,
  ALEGO_HOME_DIR_NAME,
  canonicalizeWatchPath,
  defaultAlegoHome,
  alegoHomeDisplay,
  alegoHomePath,
  expandHomePath,
  resolveAlegoHome,
} from '@singula-ai/alego-home-paths'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('alego path helpers', () => {
  it('owns the shared default ALEGO home directory name', () => {
    expect(ALEGO_HOME_DIR_NAME).toBe('.alego')
    expect(DEFAULT_ALEGO_HOME_DISPLAY).toBe('~/.alego')
    expect(defaultAlegoHome()).toBe(join(homedir(), '.alego'))
  })

  it('expands tilde paths without changing non-tilde paths', () => {
    expect(expandHomePath('~')).toBe(homedir())
    expect(expandHomePath('~/.alego')).toBe(join(homedir(), '.alego'))
    expect(expandHomePath('~\\.alego')).toBe(join(homedir(), '.alego'))
    expect(expandHomePath('/tmp/.alego')).toBe('/tmp/.alego')
    expect(expandHomePath('~other/.alego')).toBe('~other/.alego')
  })

  it('resolves explicit path before ALEGO_HOME and the default', () => {
    const envHome = join(homedir(), 'env-alego')

    expect(resolveAlegoHome('/tmp/explicit-alego', { ALEGO_HOME: '~/env-alego' })).toBe(resolve('/tmp/explicit-alego'))
    expect(resolveAlegoHome(undefined, { ALEGO_HOME: '~/env-alego' })).toBe(envHome)
    expect(resolveAlegoHome(undefined, {})).toBe(defaultAlegoHome())
  })

  it('treats an empty or whitespace-only ALEGO_HOME as unset', () => {
    expect(resolveAlegoHome(undefined, { ALEGO_HOME: '' })).toBe(defaultAlegoHome())
    expect(resolveAlegoHome(undefined, { ALEGO_HOME: '   ' })).toBe(defaultAlegoHome())
  })

  it('joins child segments onto the resolved ALEGO_HOME', () => {
    vi.stubEnv('ALEGO_HOME', '~/env-alego')
    expect(alegoHomePath()).toBe(join(homedir(), 'env-alego'))
    expect(alegoHomePath('storages', 'cache')).toBe(join(homedir(), 'env-alego', 'storages', 'cache'))
  })

  it('labels a resolved home by whether it is the default root', () => {
    expect(alegoHomeDisplay(resolve(defaultAlegoHome()))).toBe('~/.alego')
    expect(alegoHomeDisplay('/some/other/root')).toBe('$ALEGO_HOME')
  })

  it('canonicalizes a watcher ancestor while preserving a missing suffix', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alego-watch-path-'))
    const target = join(root, 'target')
    const alias = join(root, 'alias')
    try {
      await mkdir(target)
      await symlink(target, alias, process.platform === 'win32' ? 'junction' : 'dir')
      await expect(canonicalizeWatchPath(join(alias, 'later', 'config.yml'))).resolves.toBe(
        join(await realpath(target), 'later', 'config.yml'),
      )
      const file = join(root, 'file')
      await writeFile(file, 'not a directory')
      await expect(canonicalizeWatchPath(join(file, 'child'))).rejects.toMatchObject({ code: 'ENOTDIR' })
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})
