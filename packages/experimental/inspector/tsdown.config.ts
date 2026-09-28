import type { UserConfig } from 'tsdown'
import { clientBundle } from '../../client/tsdown.client.ts'
import { profileWorkerBanner } from '../../tsdown.worker.ts'

const worker: UserConfig = {
  entry: { worker: 'lib/types/worker/entry.js' },
  outDir: 'lib',
  format: ['esm'],
  banner: profileWorkerBanner('esm'),
  platform: 'node',
  target: 'es2024',
  fixedExtension: false,
  dts: false,
  clean: false,
  outputOptions: { inlineDynamicImports: true },
  deps: { neverBundle: specifier => (
    specifier === 'ws' || specifier === '@singula-ai/alego-app-boot/worker/profile-resolution-bootstrap'
  ) },
}

/** Build the Host plugin and Worker during the Host pass, and the dynamic Client plugin during the Client pass. */
export default clientBundle(
  '@singula-ai/alego-experimental-inspector',
  ['lib/types/index.js'],
  { hostPhase: true, companions: [worker] },
)
