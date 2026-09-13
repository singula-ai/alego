/** TestClient without a DOM: the api roster boots and connects; mount is refused; flush degrades to a microtask flush. */
import type { ClientTransportHooks } from '@singula-ai/alego-client-connection/client'
import { RemoteMock } from '@singula-ai/alego-remote-mock'
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { TestClient, remoteDefaultResponses, webApp } from '../src/assembly/index.ts'

/** The Gateway client and what it injects: the Typert registry and the Connection. */
const API_ROSTER = webApp.closure(['@singula-ai/alego-api-gateway'])
const TYPERT_ONLY = webApp.pick(['@singula-ai/alego-typert-registry'])
const globals = globalThis as { __ALEGO_TRANSPORT__?: ClientTransportHooks }

describe('TestClient (node environment)', () => {
  it('boots the api roster, connects, and flushes without a DOM', async () => {
    expect(typeof document).toBe('undefined')
    const mock = RemoteMock.create().load(remoteDefaultResponses)
    const client = await TestClient.start({ roster: API_ROSTER }, mock)
    onTestFinished(() => client.dispose())
    expect(client.connection.state.getSnapshot()).toBe('connected')
    await client.flush()
  }, 60_000)

  it('releases the shared globals even when the plugin tree fails to dispose, and still rethrows', async () => {
    const mock = RemoteMock.create().load(remoteDefaultResponses)
    const client = await TestClient.start({ roster: API_ROSTER }, mock)
    const dispose = client.ctx.fiber.dispose.bind(client.ctx.fiber)
    const failure = vi.spyOn(client.ctx.fiber, 'dispose').mockImplementation(async () => {
      await dispose()
      // oxlint-disable-next-line typescript/prefer-promise-reject-errors -- Exercises normalization of non-Error teardown failures.
      return Promise.reject('teardown boom')
    })
    onTestFinished(async () => {
      failure.mockRestore()
      try { await dispose() } finally { await client.dispose() }
    })
    await expect(client.dispose()).rejects.toThrow('teardown boom')
    expect(globals.__ALEGO_TRANSPORT__).toBeUndefined()
    expect(mock.log.streams('$events').map(stream => stream.state)).toEqual(['cancelled'])
    await client.dispose() // idempotent after a failed teardown
  })

  it('rethrows a row that fails to apply, releases the globals, and lets the next boot take its turn', async () => {
    const failing = { apply(): void { throw new Error('apply boom') } }
    await expect(TestClient.start({ roster: TYPERT_ONLY, provide: { '@singula-ai/alego-typert-registry': failing } }, RemoteMock.create()))
      .rejects.toThrow(/apply boom|typert-registry/)
    expect(globals.__ALEGO_TRANSPORT__).toBeUndefined()
    const mock = RemoteMock.create().load(remoteDefaultResponses)
    const client = await TestClient.start({ roster: API_ROSTER }, mock)
    onTestFinished(() => client.dispose())
    expect(client.connection.state.getSnapshot()).toBe('connected')
  })

  it('refuses a provide entry for the api-remotes row, whose services are the proxies', async () => {
    const roster = webApp.closure(['@singula-ai/alego-api-remotes'])
    await expect(TestClient.start({ roster, provide: { '@singula-ai/alego-api-remotes': { apply() {} } } }, RemoteMock.create()))
      .rejects.toThrow('@singula-ai/alego-api-remotes cannot be provided; its remote.<ns> services are the tier\'s proxies')
    expect(globals.__ALEGO_TRANSPORT__).toBeUndefined()
  })

  it('reports unmatched requests alongside a failed teardown instead of hiding them', async () => {
    const mock = RemoteMock.create().load(remoteDefaultResponses)
    const client = await TestClient.start({ roster: API_ROSTER }, mock)
    const dispose = client.ctx.fiber.dispose.bind(client.ctx.fiber)
    const failure = vi.spyOn(client.ctx.fiber, 'dispose').mockImplementation(async () => {
      await dispose()
      throw new Error('teardown boom')
    })
    onTestFinished(async () => {
      failure.mockRestore()
      try { await dispose() } finally { await client.dispose() }
    })
    await mock.dispatch('nowhere/call', []).catch(() => undefined)
    await expect(client.dispose()).rejects.toThrow(/nowhere\/call \(unary\)[\s\S]*also failed to dispose: teardown boom/)
    expect(globals.__ALEGO_TRANSPORT__).toBeUndefined()
    expect(mock.log.streams('$events').map(stream => stream.state)).toEqual(['cancelled'])
  })

  it('lets a concurrent second dispose wait for the first teardown instead of returning early', async () => {
    const mock = RemoteMock.create().load(remoteDefaultResponses)
    const client = await TestClient.start({ roster: API_ROSTER }, mock)
    const first = client.dispose()
    const second = client.dispose()
    await second
    expect(globals.__ALEGO_TRANSPORT__).toBeUndefined()
    await first
  })

  it('refuses to mount without a DOM before installing the transport', async () => {
    await expect(TestClient.start({ roster: API_ROSTER }, RemoteMock.create(), { mount: true }))
      .rejects.toThrow('mount requires a DOM')
    expect(globals.__ALEGO_TRANSPORT__).toBeUndefined()
  })

  it('fails loud, then restores the transport, when the roster cannot provide a connection', async () => {
    await expect(TestClient.start({ roster: TYPERT_ONLY }, RemoteMock.create()))
      .rejects.toThrow('provides no `connection` service')
    expect(globals.__ALEGO_TRANSPORT__).toBeUndefined()
  })

  it('skips readiness on request and restores a pre-existing transport on dispose', async () => {
    const previous: ClientTransportHooks = { fetch: () => Promise.reject(new Error('unused')) }
    globals.__ALEGO_TRANSPORT__ = previous
    onTestFinished(() => { delete globals.__ALEGO_TRANSPORT__ })
    const client = await TestClient.start({ roster: TYPERT_ONLY }, RemoteMock.create(), { awaitConnected: false })
    expect(globals.__ALEGO_TRANSPORT__).not.toBe(previous)
    expect(client.ctx.get('typert')).toBeDefined()
    expect(() => client.connection).toThrow('provides no `connection` service')
    await client.dispose()
    expect(globals.__ALEGO_TRANSPORT__).toBe(previous)
  })
})
