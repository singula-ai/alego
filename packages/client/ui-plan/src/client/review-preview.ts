/** Temporary review previews carry their document in in-memory tab navigation. */
import type { SessionId } from '@singula-ai/alego-session/types'
import type { PlanDocument } from './plan.ts'

declare module '@singula-ai/alego-client-ui-sidebar-right/client' {
  interface SidebarRightResourceParamsMap {
    /** Review text without a logged invocation; never persisted in sidebar layout. */
    'plan-review': { planReview: PlanDocument }
  }
}

/**
 * Name one temporary review within its browser lifetime and Session.
 * @param sessionId - Session displaying the review.
 * @param requestKey - Browser-unique pending request identity.
 * @returns the address used to focus or reopen its preview.
 */
export function reviewPreviewAddress(sessionId: SessionId, requestKey: string): string {
  return `alego-resource://plan-review/${encodeURIComponent(sessionId)}/${encodeURIComponent(requestKey)}`
}

/**
 * Recognize temporary plan navigation without interpreting it as logged history.
 * @param address - Saved or caller-supplied navigation address.
 * @returns whether the address identifies a temporary review preview.
 */
export function isReviewPreviewAddress(address: string): boolean {
  return /^alego-resource:\/\/plan-review\/[^/?#]+\/[^/?#]+$/.test(address)
}
