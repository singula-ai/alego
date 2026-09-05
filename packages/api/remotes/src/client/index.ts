/** Platform-neutral assembly of generated Host Remote contributions. */

import type { Context } from '@singula-ai/cordis'
import agentPresetsRemote from '@singula-ai/alego-agent-presets/remote'
import commandsRemote from '@singula-ai/alego-commands/remote'
import settingsControllerRemote from '@singula-ai/alego-api-settings-controller/remote'
import goalsRemote from '@singula-ai/alego-goal/remote'
import llmRemote from '@singula-ai/alego-llm/remote'
import dynamicRemote from '@singula-ai/alego-cordis-host-runner/remote'
import pluginInventoryRemote from '@singula-ai/alego-host-plugin-inventory/remote'
import messageFeedbackRemote from '@singula-ai/alego-message-feedback/remote'
import fileUploadsRemote from '@singula-ai/alego-client-file-upload/remote'
import sessionReferencesRemote from '@singula-ai/alego-session-reference/remote'
import subagentsRemote from '@singula-ai/alego-subagent/remote'
import sessionRemote from '@singula-ai/alego-api-session-controller/remote'
import workspaceRemote from '@singula-ai/alego-api-workspace-controller/remote'
import type { ClientRemote } from '@singula-ai/alego-api-gateway/client'

export type { ClientRemote } from '@singula-ai/alego-api-gateway/client'
export type { PluginInventorySnapshot } from '@singula-ai/alego-host-plugin-inventory/types'
export type {} from '@singula-ai/alego-agent-presets/remote'
export type {} from '@singula-ai/alego-commands/remote'
export type {} from '@singula-ai/alego-api-settings-controller/remote'
export type {} from '@singula-ai/alego-goal/remote'
export type {} from '@singula-ai/alego-llm/remote'
export type {} from '@singula-ai/alego-host-plugin-inventory/remote'
export type {} from '@singula-ai/alego-message-feedback/remote'
export type {} from '@singula-ai/alego-client-file-upload/remote'
export type {} from '@singula-ai/alego-session-reference/remote'
export type {} from '@singula-ai/alego-subagent/remote'
export type * from '@singula-ai/alego-subagent/client'
export type {} from '@singula-ai/alego-api-session-controller/remote'
export type * from '@singula-ai/alego-api-session-controller/types'
export type {} from '@singula-ai/alego-api-workspace-controller/remote'
export type * from '@singula-ai/alego-api-workspace-controller/types'
export type { SessionJob as JobView } from '@singula-ai/alego-api-session-controller/types'
// The forwarded-event allowlist's selection seat: without it in the consumer's
// compilation face `TypertRemoteEvent` is `never` and every `$on` call fails.
export type { ApiRemoteForwardedEvent } from '../types.ts'
// The owner packages' client-safe `./types` exports supply the `Events`
// signatures `$on` hands to a listener, so a consumer reads the very
// declaration the Host emits rather than a flattened restatement of it.
export type {} from '@singula-ai/alego-commands/types'
export type {} from '@singula-ai/alego-cordis-host-runner/types'
export type {} from '@singula-ai/alego-credentials/types'
export type {} from '@singula-ai/alego-llm/types'
export type {} from '@singula-ai/alego-agent-presets/types'
export type {} from '@singula-ai/alego-settings/types'
export type {} from '@singula-ai/alego-user-approval/types'
export type {} from '@singula-ai/alego-user-questions/types'
export type {} from '@singula-ai/alego-api-session-controller/types'

/**
 * The carrier's Client-facing types, re-exported so a business package names one
 * assembly package instead of both this facade and the Connection plugin. Type-only:
 * the carrier's runtime values stay behind their own module edge.
 */
export type {
  ConnectionHandle, ConnectionSinks, ContentBlock,
  MessageId,
  RpcId, RpcRequest, RpcResponse, RpcResult, SessionId,
  StreamChunk,
} from '@singula-ai/alego-client-connection/client'
export type {} from '@singula-ai/alego-api-gateway/client'
export type {} from '@singula-ai/alego-cordis-host-runner/remote'

// The payload vocabulary of the selected namespaces, re-exported so a Client
// contribution can name what it sends and receives without importing a Host
// package: this assembly is the one place both planes legitimately meet.
export type {
  ApprovalRequestId,
  CordisHalfState,
  CordisDynamicPackageId,
  CordisDynamicPluginId,
  CordisDynamicPluginRunId,
  CordisDynamicRunMode,
  CordisInspectMethodManifest,
  CordisInspectPlatform,
  CordisInspectProviderManifest,
  CordisInspectProviderView,
  CordisInspectQueryRequest,
  CordisInspectQueryResolution,
  CordisInspectQueryResolved,
  CordisInspectRequestId,
  CordisInspectResolveAck,
  CordisRunDiagnostic,
  CordisRunStatus,
  DynamicCordisClientSource,
  DynamicCordisHostHalfResult,
  DynamicCordisInventoryRow,
  DynamicCordisInvokeResult,
  DynamicCordisPackage,
  DynamicCordisRequestResolved,
  DynamicCordisResolveAck,
  DynamicCordisRetracted,
  DynamicCordisRunRequest,
  DynamicCordisRunResolution,
  DynamicCordisRunAttempt,
  DynamicCordisRunResponse,
  DynamicCordisStopResponse,
  DynamicCordisUndefineReceipt,
  RequestRunOutcome,
} from '@singula-ai/alego-cordis-host-runner/types'
// Credential state vocabulary for the credentials namespace (values never ride it).
export type { CredentialInfo } from '@singula-ai/alego-credentials/types'
// Redacted namespace vocabulary for the settings namespace (secrets never ride
// it). It travels with its seam, whose `./types` the Client face already reads.
export type {
  SettingsDescribeValue, SettingsNamespaceView, SettingsPathOpView, SettingsSecretView,
} from '@singula-ai/alego-settings/types'
// Provider registry and discovery vocabulary for the llm namespace.
export type {
  LlmConfigurableProvider, LlmDiscoveredModel,
  LlmModelDiscoveryRequest, LlmProviderInfo,
} from '@singula-ai/alego-llm/types'
// Reference-discovery result vocabulary for the fileReferences and
// sessionReferenceResolver namespaces.
export type { FileReferenceCandidate } from '@singula-ai/alego-file-reference/types'
export type { SessionReferenceMentionCandidate } from '@singula-ai/alego-session-reference/types'

// The Remote failure vocabulary, re-exported so business packages keep naming
// this assembly alone. Types only: a value export would make spec imports load
// this module's owner /remote artifacts; specs take RemoteError from
// alego-client-test-runtime instead.
export type {
  RemoteErrorCode, RemoteErrorDetailsMap, RemoteFailure, RemoteResult,
} from '@singula-ai/alego-typert-protocol'
export type { RemoteHostFacts } from '@singula-ai/alego-api-gateway/client'

declare module '@singula-ai/cordis' {
  interface Context {
    /** Generated Remote namespaces selected by this Client assembly. */
    remote: ClientRemote
  }
}

/** Required service: the typed Client Remote contribution mount. */
export const inject = ['remote']

/**
 * Mount the Host capabilities explicitly selected for this Client assembly.
 * @param ctx - Client Cordis root carrying the typed API service.
 * @returns disposer after every selected Remote namespace is ready.
 */
export async function apply(ctx: Context): Promise<() => Promise<void>> {
  const disposers: Array<() => Promise<void>> = []
  try {
    for (const contribution of [
      agentPresetsRemote, commandsRemote, settingsControllerRemote, goalsRemote, llmRemote, dynamicRemote,
      pluginInventoryRemote, messageFeedbackRemote, fileUploadsRemote, sessionReferencesRemote,
      subagentsRemote, sessionRemote, workspaceRemote,
    ]) {
      disposers.push(await ctx.remote.$mount(contribution))
    }
  } catch (error) {
    for (const dispose of disposers.reverse()) await dispose()
    throw error
  }
  // Unwound in reverse mount order, so a namespace never outlives one mounted
  // after it.
  return async () => {
    for (const dispose of disposers.reverse()) await dispose()
  }
}
