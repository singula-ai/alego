/** Shell-result projection over shared sandbox diagnostics. */
import type { ShellRunResult } from '@singula-ai/alego-shell'
import { matchesSignature } from '@singula-ai/alego-sandbox'
export { isRunnerSpawnFailure, classifyRunnerFailure, matchesSignature } from '@singula-ai/alego-sandbox'

/**
 * Classify a failed run against the selected backend's denial dialect.
 * @param result - settled foreground run.
 * @param signatures - case-insensitive denial substrings from the active wrap.
 * @returns whether the failed run matches that denial dialect.
 */
export function classifyDenial(result: ShellRunResult, signatures: readonly string[]): boolean {
  return matchesSignature(result.exitCode, result.stderr.text, signatures)
}
