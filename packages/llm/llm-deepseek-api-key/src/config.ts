/** API-key configuration resolved together with one Messages endpoint generation. */
import type { Volatile } from '@singula-ai/cordis'
import z from '@singula-ai/schemastery'
import { credentialRef, type CredentialRef } from '@singula-ai/alego-credentials'
import type { LaunchEnvironmentSnapshot } from '@singula-ai/alego-launch-environment'
import { deepSeekConfigFields, type Config as ProtocolConfig, plainOptions as protocolOptions, resolveAdapterOptions as resolveProtocolOptions } from '@singula-ai/alego-llm-deepseek'
import type { Options as ProtocolOptions, DeepSeekConnectionOptions } from '@singula-ai/alego-llm-deepseek'

/** Messages configuration with a per-request API-key reference. */
export interface Config extends ProtocolConfig {
  /** Credential reference resolved per request; defaults to DEEPSEEK_API_KEY. */
  apiKeyEnv: Volatile<string>
}
export const Config = z.object({
  ...deepSeekConfigFields,
  apiKeyEnv: z.string().role('credential-ref').default('DEEPSEEK_API_KEY').volatile(),
})
/** Plain deployment inputs for the API-key provider. */
export type Options = ProtocolOptions & { apiKeyEnv?: string }
/** Endpoint and credential reference captured from the same configuration generation. */
export interface ResolvedDeepSeekOptions extends DeepSeekConnectionOptions {
  /** Credential reference used only for this connection snapshot. */
  apiKeyEnv: CredentialRef
}
/** Read one validated provider configuration.
 * @param config - live plugin configuration.
 * @returns detached resolver inputs.
 */
export function plainOptions(config: Config): Options {
  return { ...protocolOptions(config), apiKeyEnv: config.apiKeyEnv.get() }
}
/** Resolve API-key and protocol settings together.
 * @param config - raw deployment settings.
 * @param environment - application launch environment.
 * @returns validated endpoint facts and the matching credential reference.
 */
export function resolveAdapterOptions(config: Options, environment?: LaunchEnvironmentSnapshot): ResolvedDeepSeekOptions {
  return { ...resolveProtocolOptions(config, environment), apiKeyEnv: credentialRef(config.apiKeyEnv ?? 'DEEPSEEK_API_KEY') }
}
