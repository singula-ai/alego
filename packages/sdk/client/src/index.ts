/**
 * TypeScript client SDK for the Alego runtime: spawn the
 * same-version `alego --profile sdk` runtime as a subprocess and drive agent
 * turns over stdio JSON-RPC. `Alego` is the high-level run API;
 * `HarnessClient` is the lower-level protocol client. A pure library — it
 * registers nothing on a Cordis context; named profiles and ordered patch
 * files customize the runtime process it spawns.
 *
 * @module @singula-ai/alego-sdk-client
 */

export { Alego, HarnessSession } from './api.ts'
export type { RunOptions } from './api.ts'
export {
  HarnessClient,
  RequestTimeoutError,
  SdkProtocolError,
  TransportClosedError,
} from './client.ts'
export type { NotificationSubscription } from './client.ts'
export { JsonRpcResponseError } from '@singula-ai/alego-sdk-protocol'
export type {
  ContentBlock,
  SdkPromptContentBlock,
  AlegoOptions,
  HarnessClientOptions,
  HarnessNotification,
  NotificationFilter,
  RunResult,
} from './types.ts'
