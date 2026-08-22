import { clientBundle } from '../tsdown.client.ts'

export default clientBundle(
  '@singula-ai/alego-client-modules',
  ['lib/types/index.js', 'lib/types/invariant.js'],
)
