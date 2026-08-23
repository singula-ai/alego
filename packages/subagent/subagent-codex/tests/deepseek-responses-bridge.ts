import { createServer } from 'node:http'
import type {
  IncomingMessage,
  Server,
  ServerResponse,
} from 'node:http'
import { completeResponsesEvents } from './responses-fixture.ts'

const OFFICIAL_DEEPSEEK_BASE_URL = 'https://api.deepseek.com'
const MAX_REQUEST_BYTES = 1_048_576

/**
 * Upstream budget. Codex retries a request it considers timed out, and the
 * bridge answers exactly one request, so a retry inbound is a hard 409 that
 * ends the run. These bounds keep the worst case (two attempts plus backoff,
 * ~50s) below any Codex-side timeout and far below the 180s test timeout; a
 * healthy completion takes about one second.
 */
const UPSTREAM_TIMEOUT_MS = 25_000

/** How many times the upstream completion is attempted before the bridge fails. */
const UPSTREAM_ATTEMPTS = 2

/** Backoff between upstream attempts. */
const UPSTREAM_BACKOFF_MS = 500

/**
 * Upstream statuses that answer load rather than reject the request. The CI
 * e2e lane drives fourteen workers through one shared key, so a single slow or
 * shed response must not decide the run.
 */
const UPSTREAM_RETRY_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504])

/** One running test-only Responses-to-DeepSeek bridge. */
export interface DeepSeekResponsesBridge {
  readonly baseUrl: string
  readonly completedRequests: number
  /**
   * Why the bridge refused or failed a request, in arrival order. A run that
   * ends in `stopReason: 'error'` reports this: without it the only surviving
   * evidence is the stop reason itself.
   */
  readonly failures: readonly string[]
  close(): Promise<void>
}

/** An upstream attempt that failed, and whether another attempt may succeed. */
class UpstreamFailure extends Error {
  constructor(message: string, readonly retryable: boolean) {
    super(message)
    this.name = 'UpstreamFailure'
  }
}

function readRequest(request: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = ''
    request.setEncoding('utf8')
    request.on('data', (chunk: string) => {
      body += chunk
      if (Buffer.byteLength(body) > MAX_REQUEST_BYTES) {
        request.destroy(new Error('DeepSeek bridge request exceeded its byte limit'))
      }
    })
    request.on('end', () => { resolve(body) })
    request.on('error', reject)
  })
}

function responseInputTexts(body: Record<string, unknown>): string[] {
  if (!Array.isArray(body.input)) return []
  return body.input.flatMap((item): string[] => {
    if (item === null || typeof item !== 'object') return []
    const content = (item as Record<string, unknown>).content
    if (!Array.isArray(content)) return []
    return content.flatMap((part): string[] => (
      part !== null
      && typeof part === 'object'
      && typeof (part as Record<string, unknown>).text === 'string'
        ? [(part as Record<string, unknown>).text as string]
        : []
    ))
  })
}

function taskText(body: Record<string, unknown>): string {
  const input = responseInputTexts(body).join('\n')
  if (input.trim().length > 0) return input
  return typeof body.instructions === 'string' ? body.instructions : ''
}

function deepSeekBaseUrl(): string {
  const configured = (process.env.DEEPSEEK_BASE_URL ?? OFFICIAL_DEEPSEEK_BASE_URL)
    .replace(/\/+$/, '')
  if (configured !== OFFICIAL_DEEPSEEK_BASE_URL) {
    throw new Error('Codex DeepSeek e2e requires the official DeepSeek base URL')
  }
  return configured
}

async function completeOnce(
  authorization: string,
  task: string,
): Promise<string> {
  let response: Response
  try {
    response = await fetch(`${deepSeekBaseUrl()}/chat/completions`, {
      method: 'POST',
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      headers: {
        authorization,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-v4-flash',
        messages: [
          {
            role: 'system',
            content: 'Follow the user instruction and return only the requested nonce.',
          },
          { role: 'user', content: task },
        ],
        temperature: 0,
        max_tokens: 64,
        stream: false,
      }),
    })
  } catch (error: unknown) {
    // A transport fault or the attempt timeout; both may clear on a retry.
    throw new UpstreamFailure(
      `DeepSeek bridge upstream request failed: ${error instanceof Error ? error.message : String(error)}`,
      true,
    )
  }
  if (!response.ok) {
    void response.body?.cancel()
    throw new UpstreamFailure(
      `DeepSeek bridge upstream returned HTTP ${String(response.status)}`,
      UPSTREAM_RETRY_STATUSES.has(response.status),
    )
  }
  const payload = await response.json() as {
    choices?: Array<{ message?: { content?: unknown } }>
  }
  const content = payload.choices?.[0]?.message?.content
  if (typeof content !== 'string' || content.trim().length === 0) {
    throw new UpstreamFailure('DeepSeek bridge upstream returned no text', true)
  }
  return content
}

/**
 * Complete the task upstream, retrying a response that answers load.
 * @param authorization - bearer credential forwarded from the incoming request.
 * @param task - prompt text extracted from the Responses request.
 * @returns The completion text.
 */
async function completeWithDeepSeek(
  authorization: string,
  task: string,
): Promise<string> {
  let last: Error = new Error('DeepSeek bridge made no upstream attempt')
  for (let attempt = 1; attempt <= UPSTREAM_ATTEMPTS; attempt += 1) {
    try {
      return await completeOnce(authorization, task)
    } catch (error: unknown) {
      last = error instanceof Error ? error : new Error(String(error))
      const retryable = error instanceof UpstreamFailure && error.retryable
      if (!retryable || attempt === UPSTREAM_ATTEMPTS) break
      await new Promise<void>((resolve) => {
        setTimeout(resolve, UPSTREAM_BACKOFF_MS)
      })
    }
  }
  throw last
}

function closeServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error !== undefined) reject(error)
      else resolve()
    })
    server.closeAllConnections()
  })
}

/**
 * Start the single-purpose loopback bridge used by the Codex credentialed e2e.
 * @param nonce - unique answer the incoming Responses task must request.
 * @returns loopback endpoint, completion count, and close operation.
 */
export async function startDeepSeekResponsesBridge(
  nonce: string,
): Promise<DeepSeekResponsesBridge> {
  let seenRequests = 0
  let completedRequests = 0
  const failures: string[] = []
  const openResponses = new Set<ServerResponse>()
  // Written through as well as collected: a failure inside the request handler
  // is otherwise invisible in a CI log, which reports only the run's stop reason.
  const recordFailure = (reason: string): void => {
    failures.push(reason)
    process.stderr.write(`DeepSeek bridge failure: ${reason}\n`)
  }
  const server = createServer((request, response) => {
    openResponses.add(response)
    response.on('close', () => { openResponses.delete(response) })
    void (async () => {
      if (request.method !== 'POST' || request.url !== '/v1/responses') {
        recordFailure(`unexpected ${request.method ?? '(no method)'} ${request.url ?? '(no url)'}`)
        response.writeHead(404)
        response.end()
        return
      }
      if (seenRequests !== 0) {
        recordFailure('a second request was refused; the bridge answers exactly one')
        response.writeHead(409)
        response.end()
        return
      }
      const authorization = request.headers.authorization
      if (
        typeof authorization !== 'string'
        || !authorization.startsWith('Bearer ')
        || authorization.length === 'Bearer '.length
      ) {
        throw new Error('Codex DeepSeek bridge received no bearer credential')
      }
      const body = JSON.parse(await readRequest(request)) as Record<string, unknown>
      const task = taskText(body)
      if (!task.includes(nonce)) {
        throw new Error('Codex DeepSeek bridge request omitted the expected nonce')
      }
      // Counted only once the request is accepted. Counting a rejected request
      // spends the single-request budget on it, so Codex's retry of a request
      // the bridge never served answers 409 and reports contention instead of
      // the rejection that actually ended the run.
      seenRequests += 1
      const text = await completeWithDeepSeek(authorization, task)
      completedRequests += 1
      response.writeHead(200, {
        'content-type': 'text/event-stream',
        'cache-control': 'no-cache',
        connection: 'keep-alive',
        'x-request-id': 'req_deepseek_e2e',
      })
      for (const event of completeResponsesEvents(text)) {
        response.write(`data: ${JSON.stringify(event)}\n\n`)
      }
      response.end('data: [DONE]\n\n')
    })().catch((error: unknown) => {
      const reason = error instanceof Error ? error.message : String(error)
      recordFailure(reason)
      if (!response.headersSent) {
        response.writeHead(502, { 'content-type': 'application/json' })
      }
      response.end(JSON.stringify({ error: { message: reason } }))
    })
  })
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject)
      resolve()
    })
  })
  const address = server.address()
  if (address === null || typeof address === 'string') {
    throw new Error('DeepSeek bridge did not acquire a TCP port')
  }
  return {
    baseUrl: `http://127.0.0.1:${address.port}/v1`,
    get completedRequests(): number { return completedRequests },
    get failures(): readonly string[] { return [...failures] },
    async close(): Promise<void> {
      for (const response of openResponses) response.destroy()
      await closeServer(server)
    },
  }
}
