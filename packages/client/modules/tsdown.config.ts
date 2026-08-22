import { clientBundle } from '../tsdown.client.ts'

export default clientBundle(
  '@alego/client-modules',
  ['lib/types/index.js', 'lib/types/invariant.js'],
)
