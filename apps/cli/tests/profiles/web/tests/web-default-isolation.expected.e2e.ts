/** Real Web startup, mounted plugin package identities, and delivered Client graph isolation. */

import { FiberState } from '@singula-ai/cordis'
import type { WebBootGraph } from '@singula-ai/alego-client-modules/client'
import { expect, it } from 'vitest'
import { experimentalRuntimeReferences, modulePackage } from './runtime-roster.ts'
import { withDefaultWeb, webGet } from './default-web-process.ts'

const experimentalName = '@singula-ai/alego-experimental-client-ui-agent-team'

it('boots default Web without experimental modules, scheduling, time context, or an active built-in Browser', async (test) => {
  await withDefaultWeb(test, async ({ url, request }) => {
    const auth = await webGet(url, test.signal)
    const cookie = auth.headers['set-cookie']?.[0]?.split(';', 1)[0]
    expect(cookie).toBeDefined()
    const page = await webGet(new URL('/', url), test.signal, { cookie: cookie! })
    expect(page.status).toBe(200)
    const html = page.text
    const rawBoot = /globalThis\["__ALEGO_BOOT__"\] = ([\s\S]*?)<\/script>/u.exec(html)?.[1]
    expect(rawBoot, html).toBeDefined()
    const delivered = JSON.parse(rawBoot!) as WebBootGraph
    const roster = await request('roster')
    expect(roster.client).toEqual(delivered)
    expect(roster.entries).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: '@singula-ai/alego-host-webserver', state: FiberState.ACTIVE }),
      expect.objectContaining({ name: '@singula-ai/alego-client-modules', state: FiberState.ACTIVE }),
    ]))
    expect(roster.entries.some(entry => entry.name.endsWith('/runtime-roster-observer.js') && entry.state === FiberState.ACTIVE)).toBe(true)
    expect(roster.plugins.length).toBeGreaterThan(roster.entries.length)
    expect(roster.modules.some(url => modulePackage(url) === '@singula-ai/alego')).toBe(true)
    expect(roster.client.entries.length).toBeGreaterThan(0)
    const browser = roster.entries.find(entry => entry.name === '@singula-ai/alego-client-ui-sidebar-browser')
    expect(browser).toBeDefined()
    expect(browser!.state).toBeUndefined()
    expect(delivered.entries.some(entry => entry.id === '@singula-ai/alego-client-ui-sidebar-browser')).toBe(false)
    // The optional Schedule bundle inserts these rows; the shipped composition carries none of them.
    for (const name of ['@singula-ai/alego-time-context', '@singula-ai/alego-schedule', '@singula-ai/alego-client-ui-schedule']) {
      expect(roster.entries.some(entry => entry.name === name), name).toBe(false)
      expect(delivered.entries.some(entry => entry.id === name), name).toBe(false)
    }
    expect(experimentalRuntimeReferences(roster)).toEqual([])

    const contaminated = await request('mount-experimental')
    expect(contaminated.entries.some(entry => entry.name === experimentalName)).toBe(false)
    const mounted = contaminated.plugins.filter(plugin => plugin.modules.some(url => modulePackage(url) === experimentalName))
    expect(mounted).toEqual([expect.objectContaining({ state: FiberState.ACTIVE })])
    expect(experimentalRuntimeReferences(contaminated)).toEqual(expect.arrayContaining([
      expect.stringContaining('/packages/experimental/client-ui-agent-team/'),
    ]))
  })
})
