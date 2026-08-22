/** Assembled keyless snapshot for the default `alego web` browser handoff. */

import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execa } from 'execa'
import { afterEach, describe, expect, it } from 'vitest'

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url))
const builtBin = join(repoRoot, 'apps/cli/lib/bin.js')
const frontendIndex = join(repoRoot, 'apps/web/dist/index.html')
const openerHook = new URL('./fixtures/web-browser-open/register.mjs', import.meta.url).href
const openingMessage = 'alego web: opening the default browser; pass --no-open to disable'
const tempRoots: string[] = []
const builtArtifactsExist = existsSync(builtBin) && existsSync(frontendIndex)

if (process.env.ALEGO_EXAMPLE_MODE === 'lib' && !builtArtifactsExist) {
  throw new Error('alego web browser-open snapshot requires built CLI and Web artifacts in lib mode')
}

afterEach(() => {
  for (const root of tempRoots.splice(0)) rmSync(root, { recursive: true, force: true })
})

interface BrowserOpenRecord {
  url: string
  status: number
  bootManifest: boolean
  apiKeyPresent: boolean
  alegoHomePresent: boolean
}

function normalizeLocalUrl(url: string): string {
  return url.replace(/:\d+$/, ':{{port}}')
}

describe.skipIf(!builtArtifactsExist)('alego web browser-open assembled snapshot', () => {
  it('hands the reachable page to the default browser after the shipped tree settles', async () => {
    const root = mkdtempSync(join(tmpdir(), 'alego-web-browser-open-snapshot-'))
    tempRoots.push(root)
    const result = await execa(process.execPath, [
      '--import', openerHook,
      builtBin,
      'web',
      '--port', '0',
    ], {
      cwd: root,
      env: {
        ...process.env,
        DEEPSEEK_API_KEY: 'keyless-browser-open-no-call',
        ALEGO_AGENTS_HOME: join(root, '.agents'),
        ALEGO_HOME: join(root, '.alego'),
        ALEGO_TELEMETRY_DISABLED: '1',
        NODE_NO_WARNINGS: '1',
        SSH_CONNECTION: '',
        SSH_TTY: '',
      },
      input: '',
      timeout: 30_000,
      killSignal: 'SIGKILL',
      reject: false,
    })
    const readyUrl = /alego web: (http:\/\/[^\s]+)/u.exec(result.stdout)?.[1]
    const openLine = result.stdout.split('\n').find(line => line.startsWith('alego browser-open: '))
    const opening = result.stdout.includes(openingMessage)
    if (readyUrl === undefined || openLine === undefined || !opening) {
      throw new Error(`alego web browser-open evidence missing\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`)
    }
    const opened = JSON.parse(openLine.slice('alego browser-open: '.length)) as BrowserOpenRecord

    expect({
      exitCode: result.exitCode,
      opening,
      readyUrl: normalizeLocalUrl(readyUrl),
      openedUrl: normalizeLocalUrl(opened.url),
      status: opened.status,
      bootManifest: opened.bootManifest,
      apiKeyPresent: opened.apiKeyPresent,
      alegoHomePresent: opened.alegoHomePresent,
      stderr: result.stderr,
    }).toMatchInlineSnapshot(`
      {
        "apiKeyPresent": false,
        "bootManifest": true,
        "alegoHomePresent": false,
        "exitCode": 0,
        "openedUrl": "http://127.0.0.1:{{port}}",
        "opening": true,
        "readyUrl": "http://127.0.0.1:{{port}}",
        "status": 200,
        "stderr": "",
      }
    `)
  })

  it('prints the launcher reason and manual URL after the Web app is ready', async () => {
    const root = mkdtempSync(join(tmpdir(), 'alego-web-browser-open-failure-snapshot-'))
    tempRoots.push(root)
    const result = await execa(process.execPath, [
      '--import', openerHook,
      builtBin,
      'web',
      '--port', '0',
    ], {
      cwd: root,
      env: {
        ...process.env,
        BROWSER_OPEN_TEST_FAILURE: 'fixture desktop unavailable',
        DEEPSEEK_API_KEY: 'keyless-browser-open-no-call',
        ALEGO_AGENTS_HOME: join(root, '.agents'),
        ALEGO_BROWSER_OPEN_TEST_EXIT_ON_FAILURE: '1',
        ALEGO_HOME: join(root, '.alego'),
        ALEGO_TELEMETRY_DISABLED: '1',
        NODE_NO_WARNINGS: '1',
        SSH_CONNECTION: '',
        SSH_TTY: '',
      },
      input: '',
      timeout: 30_000,
      killSignal: 'SIGKILL',
      reject: false,
    })
    const readyUrl = /alego web: (http:\/\/[^\s]+)/u.exec(result.stdout)?.[1]
    const diagnostic = result.stderr.split(/\r?\n/u)
      .find(line => line.startsWith('web-app: could not open the default browser because '))
      ?.replace(/http:\/\/127\.0\.0\.1:\d+/u, 'http://127.0.0.1:{{port}}')

    expect({
      diagnostic,
      exitCode: result.exitCode,
      opened: result.stdout.includes('alego browser-open: '),
      opening: result.stdout.includes(openingMessage),
      readyUrl: readyUrl === undefined ? undefined : normalizeLocalUrl(readyUrl),
    }).toMatchInlineSnapshot(`
      {
        "diagnostic": "web-app: could not open the default browser because fixture desktop unavailable; visit http://127.0.0.1:{{port}} manually",
        "exitCode": 0,
        "opened": false,
        "opening": true,
        "readyUrl": "http://127.0.0.1:{{port}}",
      }
    `)
  })

  it('prints the host URL without launching a browser in a VS Code Remote SSH session', async () => {
    const root = mkdtempSync(join(tmpdir(), 'alego-web-browser-open-ssh-snapshot-'))
    tempRoots.push(root)
    const result = await execa(process.execPath, [
      '--import', openerHook,
      builtBin,
      'web',
      '--port', '0',
    ], {
      cwd: root,
      env: {
        ...process.env,
        DEEPSEEK_API_KEY: 'keyless-browser-open-no-call',
        ALEGO_AGENTS_HOME: join(root, '.agents'),
        ALEGO_BROWSER_OPEN_TEST_EXIT_ON_READY: '1',
        ALEGO_HOME: join(root, '.alego'),
        ALEGO_TELEMETRY_DISABLED: '1',
        NODE_NO_WARNINGS: '1',
        SSH_CONNECTION: '10.0.0.2 55000 10.0.0.9 22',
        SSH_TTY: '',
        VSCODE_IPC_HOOK_CLI: '/tmp/vscode-ipc',
      },
      input: '',
      timeout: 30_000,
      killSignal: 'SIGKILL',
      reject: false,
    })
    const readyUrl = /alego web: (http:\/\/[^\s]+)/u.exec(result.stdout)?.[1]

    expect({
      exitCode: result.exitCode,
      opening: result.stdout.includes(openingMessage),
      readyUrl: readyUrl === undefined ? undefined : normalizeLocalUrl(readyUrl),
      opened: result.stdout.includes('alego browser-open: '),
      stderr: result.stderr,
    }).toMatchInlineSnapshot(`
      {
        "exitCode": 0,
        "opened": false,
        "opening": false,
        "readyUrl": "http://127.0.0.1:{{port}}",
        "stderr": "",
      }
    `)
  })

  it('rejects a project browser command before starting the Web app', async () => {
    const root = mkdtempSync(join(tmpdir(), 'alego-web-browser-open-env-snapshot-'))
    tempRoots.push(root)
    writeFileSync(join(root, '.env'), 'BROWSER=./project-browser\n')
    const result = await execa(process.execPath, [
      '--import', openerHook,
      builtBin,
      'web',
      '--port', '0',
    ], {
      cwd: root,
      env: {
        ...process.env,
        DEEPSEEK_API_KEY: 'keyless-browser-open-no-call',
        ALEGO_AGENTS_HOME: join(root, '.agents'),
        ALEGO_HOME: join(root, '.alego'),
        ALEGO_TELEMETRY_DISABLED: '1',
        NODE_NO_WARNINGS: '1',
        SSH_CONNECTION: '',
        SSH_TTY: '',
      },
      input: '',
      timeout: 30_000,
      killSignal: 'SIGKILL',
      reject: false,
    })

    const diagnostic = result.stderr.split(/\r?\n/u)
      .find(line => line.startsWith('Error: alego: '))
      ?.replace(/^Error: alego: .*[/\\]\.env/u, 'alego: {{root}}/.env')

    expect({
      diagnostic,
      exitCode: result.exitCode,
      opening: result.stdout.includes(openingMessage),
      opened: result.stdout.includes('alego browser-open: '),
      ready: result.stdout.includes('alego web: '),
    }).toMatchInlineSnapshot(`
      {
        "diagnostic": "alego: {{root}}/.env sets "BROWSER", which only the launching environment may set (it decides how this process starts, where its code and instructions load from, or how it reaches the network); export BROWSER instead of putting it in a .env file",
        "exitCode": 1,
        "opened": false,
        "opening": false,
        "ready": false,
      }
    `)
  })
})
