/** The embedded shell page delegates actions only to its owning application preload. */
if (window.parent !== window && window.alegoMandatoryUpdate === undefined) {
  let state
  let port
  let sequence = 0
  const listeners = new Set()
  const requests = new Map()
  const initial = Promise.withResolvers()
  const receive = event => {
    const message = event.data
    if (message?.type === 'alego-mandatory-state' && message.state) {
      state = message.state
      initial.resolve(state)
      for (const listener of listeners) listener(state)
    }
    if (message?.type === 'alego-mandatory-result') {
      const request = requests.get(message.id)
      if (!request) return
      requests.delete(message.id)
      if (message.ok) request.resolve()
      else request.reject(new Error('Update action failed'))
    }
  }
  window.addEventListener('message', event => {
    if (!event.isTrusted || event.source !== window.parent || event.origin !== 'alego-app://app'
      || event.data?.type !== 'alego-mandatory-connect' || event.ports.length !== 1 || port) return
    port = event.ports[0]
    port.onmessage = receive
  })
  window.addEventListener('pagehide', () => { port?.close() }, { once: true })
  window.alegoMandatoryUpdate = {
    status: () => state ? Promise.resolve(state) : initial.promise,
    subscribe: listener => { listeners.add(listener); return () => listeners.delete(listener) },
    action: (action, version, revision) => {
      const id = ++sequence
      const request = Promise.withResolvers()
      requests.set(id, request)
      port.postMessage({ type: 'alego-mandatory-action', id, action, version, revision })
      return request.promise
    },
  }
}
