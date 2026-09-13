// @vitest-environment jsdom
/**
 * TestClient over the web profile's roster read from its bundles: production
 * `bootClient` over in-process modules, every Remote call answered by a
 * `RemoteMock` installed as the Connection carrier, mount, HMR-style reload,
 * unload, and fail-loud teardown.
 */
import type {} from '@singula-ai/alego-client-ui-renderer/client'
import { RemoteMock, ok, openStream } from '@singula-ai/alego-remote-mock'
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import type { AssemblyPlan, TestClientOptions } from '../src/assembly/index.ts'
import { ClientRoster, TestClient, remoteDefaultResponses, webApp } from '../src/assembly/index.ts'

/** The Gateway client and what it injects: the Typert registry and the Connection. */
const API_ROSTER = webApp.closure(['@singula-ai/alego-api-gateway'])
const SIDEBAR = '@singula-ai/alego-client-ui-sidebar'
/** Declared by ui-sidebar, whose SlotMap merge is outside this package's compilation face. */
const SIDEBAR_SETTINGS = 'sidebar.settings' as never
const BRAND = '@singula-ai/alego-client-ui-brand-official'
const globals = globalThis as { __ALEGO_TRANSPORT__?: unknown; EventSource?: unknown; ResizeObserver?: unknown }
/** The whole roster's first boot pays the cold module transform of every plugin package. */
const COLD_BOOT_TIMEOUT_MS = 60_000

async function started(plan: AssemblyPlan, options?: TestClientOptions): Promise<TestClient> {
  const mock = RemoteMock.create().load(remoteDefaultResponses)
  const client = await TestClient.start(plan, mock, options)
  onTestFinished(() => client.dispose())
  return client
}

describe('TestClient (jsdom)', () => {
  it('boots the whole web-app roster, connects, mounts, and disposes with nothing unmatched', async () => {
    const mock = RemoteMock.create().load(remoteDefaultResponses)
    const client = await TestClient.start({ roster: webApp }, mock, { mount: true })
    expect(client.connection.state.getSnapshot()).toBe('connected')
    expect(mock.log.streams('$events')).toHaveLength(1)
    const container = client.container!
    expect(document.body.contains(container)).toBe(true)
    expect(container.childElementCount).toBeGreaterThan(0)
    expect(globals.__ALEGO_TRANSPORT__).toBeDefined()
    expect(globals.EventSource).toBeDefined()
    expect(globals.ResizeObserver).toBeDefined()
    await client.dispose()
    expect(document.body.contains(container)).toBe(false)
    expect(globals.__ALEGO_TRANSPORT__).toBeUndefined()
    expect(globals.EventSource).toBeUndefined()
    expect(globals.ResizeObserver).toBeUndefined()
    await client.dispose()
  }, COLD_BOOT_TIMEOUT_MS)

  it('leaves a pre-existing global alone and removes only the shims it installed', async () => {
    const existing = { existing: true }
    vi.stubGlobal('ResizeObserver', existing)
    onTestFinished(() => { vi.unstubAllGlobals() })
    const client = await started({ roster: API_ROSTER })
    expect(globals.ResizeObserver).toBe(existing)
    expect(globals.EventSource).toBeDefined()
    await client.dispose()
    expect(globals.ResizeObserver).toBe(existing)
    expect(globals.EventSource).toBeUndefined()
  })

  it('boots overlapping clients one at a time onto their own mocks and keeps the shared globals until the last dispose', async () => {
    const mockA = RemoteMock.create().load(remoteDefaultResponses).unary('session/rename', ok({ title: 'a', seq: 1 }))
    const mockB = RemoteMock.create().load(remoteDefaultResponses).unary('session/rename', ok({ title: 'b', seq: 1 }))
    const [a, b] = await Promise.all([
      TestClient.start({ roster: API_ROSTER }, mockA),
      TestClient.start({ roster: API_ROSTER }, mockB),
    ])
    onTestFinished(() => b.dispose())
    const rename = async (client: TestClient): Promise<unknown> =>
      (client.ctx as unknown as { remote: { session: { rename(request: unknown): Promise<unknown> } } }).remote.session.rename({ sessionId: 's', title: 't' })
    await expect(rename(a)).resolves.toEqual({ ok: true, value: { title: 'a', seq: 1 } })
    await expect(rename(b)).resolves.toEqual({ ok: true, value: { title: 'b', seq: 1 } })
    expect(mockA.log.calls('session/rename')).toHaveLength(1)
    expect(mockB.log.calls('session/rename')).toHaveLength(1)
    // A rebuilt connection row reads its own mock even after another client installed the transport last.
    await a.reload('@singula-ai/alego-client-connection')
    await vi.waitFor(() => { expect(a.connection.state.getSnapshot()).toBe('connected') })
    await expect(rename(a)).resolves.toEqual({ ok: true, value: { title: 'a', seq: 1 } })
    expect(mockA.log.calls('session/rename')).toHaveLength(2)
    expect(mockB.log.calls('session/rename')).toHaveLength(1)
    await a.dispose()
    expect(globals.__ALEGO_TRANSPORT__).toBeDefined()
    expect(globals.EventSource).toBeDefined()
    await b.dispose()
    expect(globals.__ALEGO_TRANSPORT__).toBeUndefined()
    expect(globals.EventSource).toBeUndefined()
  })

  it('boots the api subset without a mount and exposes the typed Remote', async () => {
    const client = await started({ roster: API_ROSTER })
    expect(client.container).toBeUndefined()
    expect(client.ctx.remote.session).toBeDefined()
    expect(client.connection.state.getSnapshot()).toBe('connected')
  })

  it('refuses to mount a roster that provides no uiRenderer instead of returning an empty container', async () => {
    const before = document.body.childElementCount
    await expect(TestClient.start({ roster: API_ROSTER }, RemoteMock.create().load(remoteDefaultResponses), { mount: true }))
      .rejects.toThrow('mount requested, but the roster provides no `uiRenderer`')
    expect(document.body.childElementCount).toBe(before)
    expect(globals.__ALEGO_TRANSPORT__).toBeUndefined()
  })

  it('creates no mount element when the roster cannot be loaded', async () => {
    const roster = ClientRoster.of([{ name: '@singula-ai/alego-client-test-runtime-missing', inject: [], immediately: true }])
    const before = document.body.childElementCount
    await expect(TestClient.start({ roster }, RemoteMock.create(), { mount: true })).rejects.toThrow()
    expect(document.body.childElementCount).toBe(before)
    expect(globals.__ALEGO_TRANSPORT__).toBeUndefined()
  })

  it('mounts into a caller-supplied element and leaves it in place on dispose', async () => {
    const host = document.createElement('main')
    document.body.appendChild(host)
    const mock = RemoteMock.create().load(remoteDefaultResponses)
    const client = await TestClient.start({ roster: webApp }, mock, { mount: host })
    expect(client.container).toBe(host)
    expect(host.childElementCount).toBeGreaterThan(0)
    await client.dispose()
    expect(document.body.contains(host)).toBe(true)
    host.remove()
  })

  it('boots with a provided row in place of the real plugin', async () => {
    const apply = vi.fn()
    const client = await started({ roster: webApp, provide: { [BRAND]: { apply } } }, { mount: true })
    expect(apply).toHaveBeenCalledOnce()
    expect([...client.ctx.loader.entries()].some(entry => entry.options.name === BRAND)).toBe(true)
  })

  it('reload rebuilds the declaring entry; unload collapses it', async () => {
    const client = await started({ roster: webApp }, { mount: true })
    expect(client.ctx.slots.entries(SIDEBAR_SETTINGS)).toHaveLength(1)
    await client.reload(SIDEBAR)
    await client.flush()
    expect(client.ctx.slots.entries(SIDEBAR_SETTINGS)).toHaveLength(1)
    await client.unload(SIDEBAR)
    await client.flush()
    expect(client.ctx.slots.entries(SIDEBAR_SETTINGS)).toHaveLength(0)
    await expect(client.reload(SIDEBAR)).rejects.toThrow(`no Loader entry named ${SIDEBAR}`)
  })

  it('fails loud by teardown at the latest when a boot-time endpoint has no fixture', async () => {
    const mock = RemoteMock.create()
    const run = TestClient.start({ roster: webApp }, mock, { mount: true }).then(client => client.dispose())
    await expect(run).rejects.toThrow(/session\/control|workspace\/follow|session\/list|settings\/describe/)
  })

  it('waits through a carrier flap for the connection to become ready', async () => {
    let opens = 0
    const mock = RemoteMock.create().load(remoteDefaultResponses).stream('$events', (_args, stream) => {
      opens += 1
      const first = opens === 1
      setTimeout(() => {
        if (first) stream.fail(new Error('flap'))
        // Branded on the Gateway side; the test mints a plain string.
        else stream.push({ type: 'ready', clientId: 'reconnected' as never, host: { home: '/home/mock' } })
      }, 20)
    })
    const client = await TestClient.start({ roster: API_ROSTER }, mock)
    onTestFinished(() => client.dispose())
    expect(client.connection.state.getSnapshot()).toBe('connected')
    expect(mock.log.streams('$events')).toHaveLength(2)
  })

  it('reports the log when the connection never becomes ready', async () => {
    // No fixtures: workspace-controller's follow has no rule, so the proxy dispatches it as a unary call the mock
    // logs as unmatched, while $events never sends ready.
    const roster = webApp.closure(['@singula-ai/alego-api-workspace-controller'])
    const mock = RemoteMock.create().stream('$events', openStream([]))
    await expect(TestClient.start({ roster }, mock, { connectTimeoutMs: 300 }))
      .rejects.toThrow(/connection state is \S+ after 300ms; unmatched: \[unary workspace\/follow\]; streams: \[.*\$events \(open\).*\]/)
    expect(globals.__ALEGO_TRANSPORT__).toBeUndefined()
    expect(globals.EventSource).toBeUndefined()
  })
})
