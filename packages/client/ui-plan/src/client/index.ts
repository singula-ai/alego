/** Plan-mode control, persistent Chat cards, and Session-backed sidebar previews. */
import type {} from '@singula-ai/alego-api-remotes/client'
import type { Context as ClientContext } from '@singula-ai/cordis'
import type { SessionId } from '@singula-ai/alego-session/types'
// Type-only: pulls the ui-conversation SlotMap merge (the input.plan seat).
import type {} from '@singula-ai/alego-client-ui-conversation/client'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@singula-ai/alego-client-locale/client'
// Type-only: pulls the `plan` SessionProjectionMap merge for useProjection.
import type {} from '@singula-ai/alego-plan-mode/client'
import type {} from '@singula-ai/alego-client-ui-renderer/client'
import type {} from '@singula-ai/alego-client-ui-session/client'
import type {} from '@singula-ai/alego-api-session-controller/remote'
import type {} from '@singula-ai/alego-client-ui-chat/client'
import type {} from '@singula-ai/alego-client-ui-user-questions/client'
import type {} from '@singula-ai/alego-client-ui-sidebar-right/client'
import type {} from '@singula-ai/alego-client-resources/client'
import { extractMarkdownPlainText } from '@singula-ai/alego-client-ui-primitives'
import { randomUUID } from '@singula-ai/alego-util-crypto'
import { PlanCards, PlanReviewOpen, type PlanCardsInjected, type PlanOpenInjected, type PlanReviewOpenInjected } from './PlanCard.tsx'
import { PlanPreview, PlanTitle } from './PlanPreview.tsx'
import { planDefinition } from './plan-definition.ts'
import { planResourceProvider } from './plan-resource.ts'
import { planAddress, parsePlanAddress } from './plan.ts'
import { isReviewPreviewAddress, reviewPreviewAddress } from './review-preview.ts'
import { createPlanReviewStore } from './review-store.ts'
import { PlanChip } from './PlanModeControl.tsx'
import { en, zh, type PlanKey } from './locales.ts'

export type { PlanKey } from './locales.ts'

declare module '@singula-ai/alego-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The composer plan chip's copy. */
    plan: PlanKey
  }
}

/** Dictionary namespace owned by this plugin. */
const NS = 'plan'

/** Injected business face of the composer plan seat. */
export interface PlanChipInjected {
  /**
   * Leave plan mode by executing /plan off.
   * @returns null on admitted execution; a user-visible failure line otherwise.
   */
  exitPlanMode: () => Promise<string | null>
}

/** Services for plan controls, Conversation projection, and resource navigation. */
export const inject = ['slots', 'remote', 'remote.commands', 'remote.session', 'sessions', 'locale', 'uiConversation', 'resources', 'sidebarRight', 'sidebarRightTabs']

/**
 * Register plan controls, permanent Chat cards, and sidebar document reading.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-plan: dictionaries')

  const previewId = '@singula-ai/alego-client-ui-plan'
  const t = ctx.locale.bind(NS)
  ctx.effect(() => ctx.uiConversation.events.register(planDefinition), 'ui-plan: conversation definition')
  ctx.effect(() => ctx.resources.register(planResourceProvider(ctx.remote.session)), 'ui-plan: resources')
  ctx.effect(() => ctx.sidebarRightTabs.register({
    id: previewId, kind: 'plan', patterns: ['alego-resource://plan/**', 'alego-resource://plan-review/**'], priority: 'builtin',
    canOpen: address => parsePlanAddress(address) !== undefined || isReviewPreviewAddress(address),
    title: () => t('preview.title'),
  }), 'ui-plan: sidebar type')
  const open = (sessionId: SessionId): PlanOpenInjected => ({
    openPlan: (callId) => {
      const child = ctx.sessions.subagentAddress(sessionId)
      const session = child === undefined ? { kind: 'session' as const, sessionId } : { kind: 'subagent' as const, ...child }
      ctx.sidebarRight.openResource(planAddress({ session, callId }))
    },
  })
  const reviewWindow = randomUUID()
  const reviewStore = createPlanReviewStore()
  ctx.slots.inject('conversation.chat.turnTail', () => ctx.slots.register({
    name: 'conversation.chat.turnTail', id: previewId, locale: NS,
    inject: (sessionId: SessionId): PlanCardsInjected => {
      const binding = ctx.sessions.binding(sessionId)
      if (binding === undefined) throw new Error(`ui-plan: unknown session "${sessionId}"`)
      const chat = ctx.uiConversation.binding(binding).target('chat')
      return {
        ...open(sessionId),
        keyedHooks: {
          plans: (turn) => {
            const snapshot = chat.getSnapshot()
            if (snapshot === undefined) throw new Error('ui-plan: Chat target is unavailable')
            return snapshot.nodes.turnDataSource(Number(turn), 'submitted-plan')
          },
        },
      }
    },
  }, PlanCards))
  ctx.slots.inject('conversation.plan-review.actions', () => ctx.slots.register({
    name: 'conversation.plan-review.actions', id: previewId, locale: NS, store: reviewStore,
    inject: (sessionId: SessionId): PlanReviewOpenInjected => ({
      openReview: (review, requestKey) => {
        if (review.callId !== undefined) { open(sessionId).openPlan(review.callId); return }
        ctx.sidebarRight.openResource(reviewPreviewAddress(sessionId, `${reviewWindow}:${requestKey}`), {
          params: { planReview: { markdown: review.plan, title: extractMarkdownPlainText(review.plan, { mode: 'first-line' }) } },
        })
      },
      hooks: { sidebarMounted: ctx.sidebarRight.mounted },
    }),
  }, PlanReviewOpen))
  ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register({
    name: 'sidebar.right.pane.tab', key: previewId, locale: NS,
  }, PlanPreview))
  ctx.slots.inject('sidebar.right.pane.tab.title', () => ctx.slots.register({
    name: 'sidebar.right.pane.tab.title', key: previewId,
  }, PlanTitle))

  ctx.slots.inject('conversation.input.plan', () => ctx.slots.register({
    name: 'conversation.input.plan',
    locale: NS,
    inject: (sessionId: SessionId): PlanChipInjected => ({
      // Failure strings stay English (error-surface policy: not localized).
      exitPlanMode: async () => {
        const result = await ctx.remote.commands.execute(sessionId, '/plan off', [])
        if (!result.ok) return `${result.error.message} (${result.error.code})`
        if (result.value === undefined) return 'unknown command: /plan off'
        return null
      },
    }),
  }, PlanChip))
}
