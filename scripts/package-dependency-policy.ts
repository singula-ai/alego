/** Explicit exceptions and Host packages for the published dependency policy. */

/** Packages treated as Client/Host packages without declaring `alego.client`. */
const CLIENT_FACE_INCLUDE: readonly string[] = []

/** Packages exempted from automatic Client/Host treatment despite declaring `alego.client`. */
const CLIENT_FACE_EXCLUDE: readonly string[] = [
  '@singula-ai/alego-api-session-controller',
  '@singula-ai/alego-api-workspace-controller',
]

/** Host-only packages whose peer relays are deliberately flattened. */
const HOST_DEPENDENCY_PACKAGES: readonly string[] = [
  '@singula-ai/alego-llm',
  '@singula-ai/alego-session',
]

/** Development-only package relationships not represented by source imports. */
const CONFIGURATION_ONLY_DEV_DEPENDENCIES = {
  '@singula-ai/alego-client-locale': ['@singula-ai/alego-api-remotes'],
  '@singula-ai/alego-client-ui-conversation': [
    '@singula-ai/alego-api-remotes',
    '@singula-ai/alego-client-ui-workspace',
  ],
  '@singula-ai/alego-client-ui-model-selection': ['@singula-ai/alego-client-ui-input-trigger'],
  '@singula-ai/alego-client-ui-sidebar': ['@singula-ai/alego-client-ui-workspace'],
  '@singula-ai/alego-client-ui-subagent': ['@singula-ai/alego-client-ui-input-trigger'],
  '@singula-ai/alego-client-ui-theme': ['@singula-ai/alego-api-remotes'],
  '@singula-ai/alego-client-ui-tool': ['@singula-ai/alego-api-remotes'],
} as const satisfies Readonly<Record<string, readonly string[]>>

/** Workspace packages whose complete runtime surface is safe across duplicate installations. */
const DUPLICATE_SAFE_PACKAGES: readonly string[] = [
  '@singula-ai/alego-brand',
  '@singula-ai/alego-typert-protocol',
  '@singula-ai/alego-util-crypto',
  '@singula-ai/alego-util-values',
]

/**
 * Runtime exports whose values remain valid when npm installs another package copy.
 */
const SAFE_HOST_DEPENDENCY_EXPORTS = {
  '@singula-ai/alego-credentials': ['credentialKey'],
  '@singula-ai/alego-deque': ['Deque'],
  '@singula-ai/alego-llm': ['BlockAssembler', 'callConfigEquals', 'expandAssistantStream'],
  '@singula-ai/alego-session-format': ['sessionFormatLogFilename'],
  '@singula-ai/alego-timeout': ['MAX_TIMER_DELAY_MS'],
  '@singula-ai/schemastery': ['default'],
} as const satisfies HostDependencyExports

/** Runtime exports that require every consumer to resolve the provider's shared peer instance. */
const PEER_REQUIRED_HOST_EXPORTS = {
  '@singula-ai/alego-scope': ['carrierKeyOf', 'scopeOf', 'scopeTarget'],
  '@singula-ai/alego-session': ['SESSION_FORMAT_VERSION'],
  '@singula-ai/alego-session-persistence': ['SessionPersistenceNotFoundError'],
} as const satisfies HostDependencyExports

/** Exact import specifier to reviewed runtime exports. */
type HostDependencyExports = Readonly<Record<string, readonly string[]>>

/** Complete configurable input to package dependency classification. */
export interface PackageDependencyPolicy {
  readonly clientFaceInclude: readonly string[]
  readonly clientFaceExclude: readonly string[]
  readonly hostPackages: readonly string[]
  readonly configurationOnlyDevDependencies: Readonly<Record<string, readonly string[]>>
  readonly duplicateSafePackages?: readonly string[]
  readonly safeHostDependencyExports: HostDependencyExports
  readonly peerRequiredHostExports: HostDependencyExports
}

/** Repository dependency policy consumed by verification and benchmarking. */
export const PACKAGE_DEPENDENCY_POLICY: PackageDependencyPolicy = {
  clientFaceInclude: CLIENT_FACE_INCLUDE,
  clientFaceExclude: CLIENT_FACE_EXCLUDE,
  hostPackages: HOST_DEPENDENCY_PACKAGES,
  configurationOnlyDevDependencies: CONFIGURATION_ONLY_DEV_DEPENDENCIES,
  duplicateSafePackages: DUPLICATE_SAFE_PACKAGES,
  safeHostDependencyExports: SAFE_HOST_DEPENDENCY_EXPORTS,
  peerRequiredHostExports: PEER_REQUIRED_HOST_EXPORTS,
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Whether a package manifest declares a dynamically loaded Client entry. */
export function hasClientDeclaration(alegoField: unknown): boolean {
  return isRecord(alegoField) && Object.hasOwn(alegoField, 'client')
}

/** Whether the repository policy flattens one package's non-Cordis peers. */
export function usesFlattenedPackageDependencies(
  manifestPath: string,
  packageName: string,
  alegoField: unknown,
  policy: PackageDependencyPolicy = PACKAGE_DEPENDENCY_POLICY,
): boolean {
  if (!manifestPath.startsWith('packages/') || manifestPath.startsWith('packages/experimental/')) return false
  if (policy.hostPackages.includes(packageName)) return true
  if (manifestPath.startsWith('packages/client/')) return true
  const included = hasClientDeclaration(alegoField) || policy.clientFaceInclude.includes(packageName)
  return included && !policy.clientFaceExclude.includes(packageName)
}
