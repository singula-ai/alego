/** Fixed startup code for Node Worker bundles, after the executable's VFS bootstrap. */

/**
 * Load the parent's profile resolver before Worker business code executes.
 * ESM static dependencies must resolve without the profile resolver.
 * @param format - emitted Worker module format.
 * @returns a tsdown banner that loads the shared native Worker bootstrap.
 */
export function profileWorkerBanner(format: 'cjs' | 'esm'): string {
  return format === 'cjs'
    ? '"use strict";\nrequire("@singula-ai/alego-app-boot/worker/profile-resolution-bootstrap");'
    : 'import "@singula-ai/alego-app-boot/worker/profile-resolution-bootstrap";'
}
