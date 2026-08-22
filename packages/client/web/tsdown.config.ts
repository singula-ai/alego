import { staticLinked } from '../tsdown.client.ts'

export default staticLinked(
  '@alego/client-web',
  ['lib/types/index.js', 'lib/types/invariant.js'],
)
