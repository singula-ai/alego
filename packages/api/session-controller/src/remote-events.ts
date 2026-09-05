/** Session Controller events available to a Remote Event assembly. */
type SessionControllerRemoteEvent =
  | 'api-session/activity'
  | 'api-session/added'
  | 'api-session/error'
  | 'api-session/removed'
  | 'api-session/status'

declare module '@singula-ai/alego-typert-protocol' {
  interface TypertRemoteEventSelection extends
    Record<SessionControllerRemoteEvent, true> {}
}

export {}
