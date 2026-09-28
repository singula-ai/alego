/** Shared Host wiring for the DeepSeek protocol adapter. */
import type { Context } from '@singula-ai/cordis'
import type {} from '@singula-ai/alego-settings'
import type {} from '@singula-ai/cordis-plugin-loader'
import type {} from '@singula-ai/alego-fs'
import { resolveImageAttachmentAccess } from '@singula-ai/alego-llm'
import { getOrCreateAnonymousUserId, type AnonymousUserId } from '@singula-ai/alego-anonymous-user-id'
import { deepEqualJson } from '@singula-ai/alego-util-values'
import { DeepSeekAdapter } from './adapter.ts'
import type { DeepSeekAdapterOptions, DeepSeekConnectionOptions } from './types.ts'

/**
 * Register one provider with request-local transport services and live retry policy.
 * @param ctx - provider plugin lifetime with the LLM registry injected.
 * @param provider - exact route owned by this plugin.
 * @param dependencies - provider-owned discovery, credential, and configuration callbacks.
 */
export function registerDeepSeekProvider<C extends DeepSeekConnectionOptions>(
  ctx: Context, provider: string, dependencies: Pick<DeepSeekAdapterOptions<C>,
  'options' | 'resolveAuth' | 'providerName' | 'discoverModels'>): void {
  ctx.inject(['settings'], (child) => { child.effect(() => child.settings.configure({ auto: false }, ctx.fiber)) })
  let userId: AnonymousUserId | undefined
  const adapter = new DeepSeekAdapter({
    ...dependencies,
    resolveUserId: () => userId ??= getOrCreateAnonymousUserId(),
    onReplayDegrade: ({ provider, model, reason }) => {
      ctx.logger.warn(`llm-deepseek: unusable Messages replay state on assistant history for route "${provider}/${model}"; sending provider-neutral content (${reason})`)
    },
    onExtensionsOmitted: ({ provider, model, fields, error }) => {
      ctx.logger.warn(`llm-deepseek: sending route "${provider}/${model}" without request extension fields ${fields.join(', ')} because they failed to serialize: %o`, error)
    },
    resolveAttachments: () => ctx.get('attachments'),
    resolveImageAccess: (attachments, ref) => resolveImageAttachmentAccess(
      attachments, hostPath => ctx.get('fs')?.processPathFromHostPath(hostPath), ref,
    ),
    prepareExtensions: request => ctx.get('deepseekLlmApiExtensions')?.prepare(request)
      ?? Promise.resolve({ fields: {}, accept: () => Promise.resolve() }),
  })
  const registration = ctx.llm.registerAdapter([provider], adapter)
  let registeredPolicy = dependencies.options().retryPolicy
  ctx.on('loader/volatile-update', () => {
    let policy: typeof registeredPolicy
    try { policy = dependencies.options().retryPolicy }
    catch (error) { ctx.logger.warn(error); return }
    if (deepEqualJson(policy, registeredPolicy)) return
    registration.replace([provider])
    registeredPolicy = policy
  })
}
