/**
 * Resolve the public SDK launch configuration to one alego subprocess.
 * @module @singula-ai/alego-sdk-client/launch
 */

import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { HarnessClientOptions } from './types.ts'

/** Default bound for a profile to answer the SDK initialize handshake. */
export const DEFAULT_INITIALIZE_TIMEOUT_MS = 10_000

/** Internal generic process launch used by the transport and fake-runtime tests. */
export interface RuntimeProcessOptions {
  command: string
  args: string[]
  cwd?: string
  /** Materialize the complete child environment when the client starts its subprocess. */
  environment: () => NodeJS.ProcessEnv
  description: string
  initializeTimeoutMs: number
  requestTimeoutMs?: number
  shutdownTimeoutMs?: number
  disposeEofGraceMs?: number
  disposeGraceMs?: number
}

/** Node argv plus internal profile patches required by one resolved alego entry. */
export interface AlegoNodeLaunch {
  /** Arguments before the profile selector. */
  nodeArgs: string[]
  /** Internal patches applied below caller-supplied patches. */
  patches: string[]
  /** Environment values required by the resolved entry mode. */
  environment: NodeJS.ProcessEnv
}

interface PackageManifest {
  version?: unknown
  bin?: unknown
}

/** Read a package manifest from one resolved package.json URL. */
function manifest(url: string): PackageManifest {
  return JSON.parse(readFileSync(fileURLToPath(url), 'utf8')) as PackageManifest
}

/**
 * Resolve and version-check an alego executable from package manifests.
 * @param alegoManifestUrl - resolved URL of the alego package manifest.
 * @param clientManifestUrl - resolved URL of the SDK client manifest.
 * @returns the absolute alego executable path.
 */
export function resolveAlegoBinFromManifests(alegoManifestUrl: string, clientManifestUrl: string): string {
  const alegoManifest = manifest(alegoManifestUrl)
  const clientManifest = manifest(clientManifestUrl)
  if (typeof alegoManifest.version !== 'string' || alegoManifest.version !== clientManifest.version) {
    throw new Error(`alego SDK client ${String(clientManifest.version)} requires the same alego version, got ${String(alegoManifest.version)}`)
  }
  const bin = typeof alegoManifest.bin === 'object' && alegoManifest.bin !== null
    ? (alegoManifest.bin as Record<string, unknown>).alego
    : alegoManifest.bin
  if (typeof bin !== 'string' || bin === '') throw new Error('@singula-ai/alego declares no alego executable')
  return resolve(dirname(fileURLToPath(alegoManifestUrl)), bin)
}

/**
 * Resolve and version-check the built alego executable installed with this SDK.
 * @returns the absolute built executable path, whether or not it exists in a source checkout.
 */
export function installedAlegoBin(): string {
  return resolveAlegoBinFromManifests(
    import.meta.resolve('@singula-ai/alego/package.json'),
    new URL('../package.json', import.meta.url).href,
  )
}

/**
 * Resolve the Node launch for one same-version alego package.
 * @param alegoManifestUrl - resolved URL of the alego package manifest.
 * @param clientManifestUrl - resolved URL of the SDK client manifest.
 * @param sourceLoaderUrl - optional absolute tsx loader URL for deterministic tests.
 * @returns built output, or the source entry plus its compatibility patch and tsx environment.
 */
export function resolveAlegoNodeLaunchFromManifests(
  alegoManifestUrl: string,
  clientManifestUrl: string,
  sourceLoaderUrl?: string,
): AlegoNodeLaunch {
  const bin = resolveAlegoBinFromManifests(alegoManifestUrl, clientManifestUrl)
  if (existsSync(bin)) return { nodeArgs: [bin], patches: [], environment: {} }

  const packageDir = dirname(fileURLToPath(alegoManifestUrl))
  const sourceBin = resolve(packageDir, 'src/bin.ts')
  const sourcePatch = resolve(packageDir, 'src/sdk-source.cordis.patch.yml')
  const sourceTsconfig = resolve(packageDir, 'tsconfig.json')
  if (!existsSync(sourceBin) || !existsSync(sourcePatch) || !existsSync(sourceTsconfig)) {
    throw new Error(
      `@singula-ai/alego is missing its built executable ${bin} and complete source launch files ${sourceBin}, ${sourcePatch}, ${sourceTsconfig}`,
    )
  }
  const loader = sourceLoaderUrl ?? import.meta.resolve('tsx/esm')
  return {
    nodeArgs: ['--import', loader, sourceBin],
    patches: [sourcePatch],
    environment: { TSX_TSCONFIG_PATH: sourceTsconfig },
  }
}

/**
 * Resolve the installed alego package to a built or source Node launch.
 * @returns the launch descriptor for the current checkout or installed package.
 */
function installedAlegoNodeLaunch(): AlegoNodeLaunch {
  return resolveAlegoNodeLaunchFromManifests(
    import.meta.resolve('@singula-ai/alego/package.json'),
    new URL('../package.json', import.meta.url).href,
  )
}

/**
 * Resolve caller-relative filesystem inputs and construct canonical alego argv.
 * @param options - public SDK launch options.
 * @param callerCwd - parent-process directory used for lexical resolution.
 * @returns one generic subprocess spec for the JSON-RPC transport.
 */
export function resolveAlegoLaunch(
  options: HarnessClientOptions = {},
  callerCwd: string = process.cwd(),
): RuntimeProcessOptions {
  const profile = options.profile ?? 'sdk'
  const alegoLaunch = options.alegoBin === undefined
    ? installedAlegoNodeLaunch()
    : { nodeArgs: [resolve(callerCwd, options.alegoBin)], patches: [], environment: {} }
  const patches = [
    ...alegoLaunch.patches,
    ...(options.patches ?? []).map(path => resolve(callerCwd, path)),
  ]
  const alegoHome = options.alegoHome === undefined ? undefined : resolve(callerCwd, options.alegoHome)
  return {
    command: process.execPath,
    args: [...alegoLaunch.nodeArgs, '--profile', profile, ...patches.flatMap(path => ['--patch', path])],
    ...options.processCwd === undefined ? {} : { cwd: resolve(callerCwd, options.processCwd) },
    environment: () => ({
      ...(options.env ?? process.env),
      ...alegoLaunch.environment,
      ...alegoHome === undefined ? {} : { ALEGO_HOME: alegoHome },
    }),
    description: `alego profile ${JSON.stringify(profile)}`,
    initializeTimeoutMs: options.initializeTimeoutMs ?? DEFAULT_INITIALIZE_TIMEOUT_MS,
    ...options.requestTimeoutMs === undefined ? {} : { requestTimeoutMs: options.requestTimeoutMs },
    ...options.shutdownTimeoutMs === undefined ? {} : { shutdownTimeoutMs: options.shutdownTimeoutMs },
    ...options.disposeEofGraceMs === undefined ? {} : { disposeEofGraceMs: options.disposeEofGraceMs },
    ...options.disposeGraceMs === undefined ? {} : { disposeGraceMs: options.disposeGraceMs },
  }
}
