import { clientBundle } from '../tsdown.client.ts'

export default clientBundle(
  '@singula-ai/alego-client-shortcuts',
  ['lib/types/index.js', 'lib/types/protocol.js'],
  { hostPhase: true },
)
