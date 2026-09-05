/** Default-browser startup over a real Loader tree and listening Web server. */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Context } from '@singula-ai/cordis'
import Include from '@singula-ai/cordis-plugin-include'
import Loader from '@singula-ai/cordis-plugin-loader'
import WebServer from '@singula-ai/alego-host-webserver'
import { apply, internals } from '../src/index.ts'

const contexts: Context[] = []
const tempRoots: string[] = []
const originalResolveDistIndex = internals.resolveDistIndex
const originalOpenBrowser = internals.openBrowser

beforeEach(() => {
  vi.stubEnv('SSH_CONNECTION', '')
  vi.stubEnv('SSH_TTY', '')
})

afterEach(async () => {
  for (const ctx of contexts.splice(0)) await ctx.fiber.dispose()
  for (const root of tempRoots.splice(0)) rmSync(root, { recursive: true, force: true })
  internals.resolveDistIndex = originalResolveDistIndex
  internals.openBrowser = originalOpenBrowser
  vi.unstubAllEnvs()
  Reflect.deleteProperty(globalThis, '__alegoWebAppApply')
  Reflect.deleteProperty(globalThis, '__alegoWebServer')
  Reflect.deleteProperty(globalThis, '__alegoConnection')
})

describe('web app browser startup', () => {
  it('opens the canonical URL only after the complete page is reachable', async () => {
    const root = mkdtempSync(join(tmpdir(), 'alego-web-browser-open-'))
    tempRoots.push(root)
    const dist = join(root, 'dist')
    mkdirSync(dist)
    const index = join(dist, 'index.html')
    writeFileSync(index, '<!doctype html><title>ready</title>')
    internals.resolveDistIndex = () => index

    const webserverModule = join(root, 'webserver.mjs')
    const connectionModule = join(root, 'connection.mjs')
    const webAppModule = join(root, 'web-app.mjs')
    writeFileSync(webserverModule, 'export default globalThis.__alegoWebServer\n')
    writeFileSync(connectionModule, [
      "export const inject = ['webServer']",
      "export const apply = ctx => ctx.provide('connection', globalThis.__alegoConnection)",
      '',
    ].join('\n'))
    writeFileSync(webAppModule, [
      "export const name = 'fixture-web-app'",
      "export const inject = ['webServer']",
      'export const apply = (ctx, config) => globalThis.__alegoWebAppApply(ctx, config)',
      '',
    ].join('\n'))
    const config = join(root, 'cordis.yml')
    writeFileSync(config, [
      '- id: webserver',
      `  name: ${pathToFileURL(webserverModule).href}`,
      '  config:',
      '    host: 127.0.0.1',
      '    port: 0',
      '- id: connection',
      `  name: ${pathToFileURL(connectionModule).href}`,
      '- id: web-app',
      `  name: ${pathToFileURL(webAppModule).href}`,
      '  config:',
      '    openBrowser: true',
      '    printUrl: false',
      '    surfaceContext: false',
      '    trustedHosts: []',
      '',
    ].join('\n'))

    const globals = globalThis as unknown as {
      __alegoWebAppApply: typeof apply
      __alegoWebServer: typeof WebServer
      __alegoConnection: {
        authenticatedUrl(baseUrl: string): string
        authorizeIndex(): boolean
        requestRejection(): undefined
        rpc: object
      }
    }
    globals.__alegoWebAppApply = apply
    globals.__alegoWebServer = WebServer
    globals.__alegoConnection = {
      authenticatedUrl: (baseUrl) => {
        const url = new URL(baseUrl)
        url.searchParams.set('token', 'fixture-token')
        return url.href
      },
      authorizeIndex: () => true,
      requestRejection: () => undefined,
      rpc: {},
    }

    let openedUrl: string | undefined
    let openedStatus: number | undefined
    let resolveOpened!: () => void
    const opened = new Promise<void>((resolve) => { resolveOpened = resolve })
    internals.openBrowser = async (url) => {
      openedUrl = url
      openedStatus = (await fetch(url)).status
      resolveOpened()
    }

    const ctx = new Context()
    contexts.push(ctx)
    await ctx.plugin(Loader)
    ctx.loader.builtins.include = Include
    await ctx.loader.create({
      name: 'cordis:include',
      config: { path: pathToFileURL(config).href },
    })
    await ctx.loader.await()
    await opened

    expect(openedUrl).toBe(`http://127.0.0.1:${String(ctx.webServer.port)}/?token=fixture-token`)
    expect(openedStatus).toBe(200)
  })
})
