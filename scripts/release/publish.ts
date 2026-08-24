/**
 * Publish one packed release family from the tarballs the pack step produced.
 *
 * Publication is decided per package against the registry, never from a list of
 * "what this release includes": a version the registry lacks is published, a
 * version whose published tarball has the same integrity is skipped, and a
 * version whose published tarball differs fails the run — that last case means
 * the content changed without a version bump
 * ([rationale](../../.agents/notes/implemented/process/2026-08-10-npm-release-sequences.md)).
 *
 * Skipping on identical integrity is what makes re-running the publish step over
 * the same artifact safe.
 */

import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'
import { parseArgs } from 'node:util'
import { releaseFamily } from './families.ts'
import { attempt, attemptEchoed, isEntry } from './process.ts'
import { packedIdentity, readPublishOrder } from './tarball.ts'

/**
 * Registry codes that answer a write which did not settle, rather than a
 * rejection of what was sent. `E409 Failed to save packument` is the one this
 * sequence actually hits: publishing several packages in a row can outrun the
 * registry's own processing. A rejected payload (`E403` over an existing
 * version, a malformed manifest) never clears on a retry and must surface.
 */
const TRANSIENT_PUBLISH_CODES = ['E409', 'E429', 'E500', 'E502', 'E503', 'E504', 'ETIMEDOUT', 'ECONNRESET', 'EAI_AGAIN'] as const

/** How many times one tarball's publish is attempted for a transient failure other than a rate limit. */
const PUBLISH_ATTEMPTS = 4

/**
 * Attempts and first backoff for a rate-limited publish (`E429`).
 *
 * The registry meters new-package creation over windows of minutes, not
 * seconds: the first alego release saw `E429` persist across retries spaced
 * 2–8 seconds while npm's own in-client retries had already waited about a
 * minute per invocation, so a short ladder turns one metering window into a
 * failed run. Five doubling waits from one minute total ~31 minutes — long
 * enough to ride out metering, while a hard quota still fails within the
 * publish job's time budget
 * ([incident](../../.agents/notes/implemented/process/2026-08-24-npm-publish-rate-limit-recovery.md)).
 */
const RATE_LIMIT_ATTEMPTS = 6

/** First wait after a rate-limited attempt; each further wait doubles it. */
const RATE_LIMIT_BACKOFF_MS = 60_000

/**
 * Shortest gap between two publishes, and the first retry backoff.
 *
 * The registry needs a moment to commit a packument before the next write; back
 * to back publishes are what produce `E409`.
 */
const PUBLISH_SPACING_MS = 2_000

/** What the registry knows about one version. */
type RegistryState =
  | { readonly kind: 'absent' }
  | { readonly kind: 'present'; readonly integrity: string }

/**
 * Whether a failed publish is worth another attempt.
 * @param output - combined npm output.
 * @returns True when the registry reported a write it did not commit.
 */
function isTransientFailure(output: string): boolean {
  return TRANSIENT_PUBLISH_CODES.some(code => output.includes(`code ${code}`))
}

/**
 * The subresource integrity string npm records for a tarball.
 * @param tarball - absolute tarball path.
 * @returns A `sha512-<base64>` string.
 */
function integrityOf(tarball: string): string {
  return `sha512-${createHash('sha512').update(readFileSync(tarball)).digest('base64')}`
}

/**
 * Ask the registry whether a version exists, and with what integrity.
 * @param name - package name.
 * @param version - package version.
 * @returns The registry state for that version.
 */
function registryState(name: string, version: string): RegistryState {
  const result = attempt('npm', ['view', `${name}@${version}`, 'dist.integrity', '--json'])
  if (result.status !== 0) {
    const output = `${result.stdout}${result.stderr}`
    if (output.includes('E404') || output.includes('404 Not Found')) return { kind: 'absent' }
    throw new Error(`npm view ${name}@${version} failed:\n${output}`)
  }
  const parsed: unknown = JSON.parse(result.stdout)
  if (typeof parsed !== 'string' || parsed === '') {
    throw new Error(`registry reported no dist.integrity for ${name}@${version}`)
  }
  return { kind: 'present', integrity: parsed }
}

/**
 * Publish one tarball, retrying a registry write that did not settle.
 *
 * Every retry re-reads the registry first, because `E409` can answer a write
 * that landed anyway: republishing a version that now exists fails permanently,
 * so the same integrity appearing under the failed attempt counts as success.
 * @param tarball - absolute tarball path.
 * @param name - package name the tarball declares.
 * @param version - package version the tarball declares.
 */
/** One retryable failed publish attempt: how long to wait, and under which budget. */
export interface PublishRetryDirective {
  /** Milliseconds to wait before the next attempt. */
  readonly delayMs: number
  /** True when the failure was the registry's rate limit rather than another transient code. */
  readonly rateLimited: boolean
  /** One-based number of the attempt that just failed, within its budget. */
  readonly attempt: number
  /** Total attempts that budget allows. */
  readonly budget: number
}

/**
 * Decide whether a failed publish attempt is retried, and after how long.
 *
 * A rate limit waits minutes on its own budget, because the registry meters
 * new-package creation over windows that outlast the seconds-scale ladder;
 * every other transient code keeps the short ladder that answers `E409`
 * packument settling. The two budgets are independent, so metering cannot
 * consume the settling attempts nor the reverse.
 * @param output - combined npm output of the failed attempt.
 * @param transientFailures - prior failed attempts with a non-rate-limit transient code.
 * @param rateLimitedFailures - prior failed attempts with `E429`.
 * @returns The retry directive, or undefined when the failure is terminal — a
 * non-transient code, or the matching budget is exhausted.
 */
export function publishRetryDirective(
  output: string,
  transientFailures: number,
  rateLimitedFailures: number,
): PublishRetryDirective | undefined {
  if (!isTransientFailure(output)) return undefined
  const rateLimited = output.includes('code E429')
  const attempt = (rateLimited ? rateLimitedFailures : transientFailures) + 1
  const budget = rateLimited ? RATE_LIMIT_ATTEMPTS : PUBLISH_ATTEMPTS
  if (attempt >= budget) return undefined
  const base = rateLimited ? RATE_LIMIT_BACKOFF_MS : PUBLISH_SPACING_MS
  return { delayMs: base * 2 ** (attempt - 1), rateLimited, attempt, budget }
}

async function publishTarball(tarball: string, name: string, version: string): Promise<void> {
  // A prerelease version never takes the latest dist-tag.
  const tagArgs = version.includes('-') ? ['--tag', 'next'] : []
  let transientFailures = 0
  let rateLimitedFailures = 0
  for (;;) {
    // No --access: the sequences do not share one access level, so a
    // command-line flag could not serve both and would override the manifest
    // that does. Each packed manifest decides, and
    // check-workspace-constraints holds every manifest to its sequence's level.
    const result = attemptEchoed('npm', ['publish', tarball, ...tagArgs])
    const output = `${result.stdout}${result.stderr}`
    if (result.status === 0) return

    const settled = registryState(name, version)
    if (settled.kind === 'present' && settled.integrity === integrityOf(tarball)) {
      console.log(`release publish: ${name}@${version} landed despite a reported failure, continuing`)
      return
    }
    const retry = publishRetryDirective(output, transientFailures, rateLimitedFailures)
    if (retry === undefined) {
      throw new Error(`npm publish ${name}@${version} failed:\n${output}`)
    }
    if (retry.rateLimited) rateLimitedFailures += 1
    else transientFailures += 1
    console.log(
      `release publish: ${name}@${version} ${retry.rateLimited ? 'is rate limited' : 'hit a transient registry failure'}`
      + ` (attempt ${String(retry.attempt)} of ${String(retry.budget)}), retrying in ${String(retry.delayMs)}ms`,
    )
    await sleep(retry.delayMs)
  }
}

/** Publish the family named by `--family` from the directory named by `--from`. */
async function main(): Promise<void> {
  const { values } = parseArgs({
    options: { family: { type: 'string' }, from: { type: 'string' } },
    allowPositionals: false,
  })
  if (values.family === undefined || values.from === undefined) {
    throw new Error('usage: publish.ts --family <alego|vendor> --from <packed directory>')
  }

  const family = releaseFamily(values.family)
  const directory = resolve(process.cwd(), values.from)

  // Every entry in the order settles as either published or already present, so
  // one counter answers "how far along is this run" for whoever is watching a
  // release that takes minutes per family.
  const order = readPublishOrder(directory)
  const total = String(order.length)
  let published = 0
  let skipped = 0
  for (const [index, filename] of order.entries()) {
    const progress = `[${String(index + 1)}/${total}]`
    const tarball = join(directory, filename)
    const { name, version } = packedIdentity(tarball)
    const state = registryState(name, version)
    if (state.kind === 'present') {
      const local = integrityOf(tarball)
      if (state.integrity !== local) {
        throw new Error(
          `${name}@${version} is already published with different content`
          + `\n  registry: ${state.integrity}\n  packed:   ${local}`
          + '\nBump the version, or investigate why the build is not reproducible.',
        )
      }
      console.log(`release publish: ${progress} ${name}@${version} already published, skipping`)
      skipped += 1
      continue
    }
    // Space out the writes: the gap belongs between publishes, so a run that
    // only skips does not wait at all.
    if (published > 0) await sleep(PUBLISH_SPACING_MS)
    await publishTarball(tarball, name, version)
    console.log(`release publish: ${progress} ${name}@${version} published`)
    published += 1
  }

  console.log(
    `release publish: family ${family.id}, ${total} member(s),`
    + ` ${String(published)} published, ${String(skipped)} already present`,
  )
}

if (isEntry(import.meta.url)) await main()
