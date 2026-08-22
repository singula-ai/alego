/**
 * CPython subprocess code runtime for the Alego code-execution seam.
 *
 * The package owns the versionless fd-3 wire protocol between the Node host and
 * the CPython subprocess. The protocol's host-side codec and hostile-frame
 * validators are re-exported so every consumer of the wire shares one
 * vocabulary.
 * @module @alego/code-runtime-python
 */

export type { BootMessage, ChildToHost, ReplyMessage } from './protocol.ts'
export {
  checkDoneValue,
  encodeJsonPlain,
  hasNonLosslessNumber,
  hasUnsafeIntegerToken,
  logTruncationMarker,
  validateChildFrame,
} from './protocol.ts'
