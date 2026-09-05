import type { TurnBoundaryProjection } from './types.ts'
import type {} from '@singula-ai/alego-session-projection'

declare module '@singula-ai/alego-session-projection/types' {
  interface SessionProjectionStateMap {
    /** The agent session's open/last turn and step boundary facts (whole value). */
    turnBoundary: TurnBoundaryProjection
  }
}

export {}
