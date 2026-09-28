import { clientBundle } from '../../client/tsdown.client.ts'

export default clientBundle(
  '@singula-ai/alego-api-terminal-controller',
  ['lib/types/index.js'],
  { hostPhase: true },
)
