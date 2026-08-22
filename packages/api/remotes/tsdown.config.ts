import { clientBundle } from '../../client/tsdown.client.ts'

export default clientBundle(
  '@singula-ai/alego-api-remotes',
  ['lib/types/index.js', 'lib/types/invariant.js'],
  { hostPhase: true },
)
