import { Context } from '@singula-ai/cordis'
import type { SessionEvent } from '@singula-ai/alego-session'
import type { Agent } from '@singula-ai/alego-agent'
import AgentLoop from '@singula-ai/alego-agent-loop'
import SessionProjectionRegistry from '@singula-ai/alego-session-projection'
import { mountAgentLoopTestDependencies } from '@singula-ai/alego-agent-loop-testkit'
import { LocalBashExecutor } from '@singula-ai/alego-bash-local'
import * as BashEnvPlugin from '@singula-ai/alego-shell-env'
import LocalSubprocessRuntime from '@singula-ai/alego-subprocess-local'
import * as ToolBash from '@singula-ai/alego-tool-bash'
import * as ToolTodo from '@singula-ai/alego-tool-todo'
import * as LlmDeepSeek from '@singula-ai/alego-llm-deepseek'
import TokenMeter from '@singula-ai/alego-token-meter'
import ToolResultPruner from '@singula-ai/alego-compaction-tool-result-pruner'
import JsonlSessionPersistence from '@singula-ai/alego-session-persistence-jsonl'
import * as SessionCheckpointPolicy from '@singula-ai/alego-session-checkpoint-policy'
import { BasicCompactionEngine } from '@singula-ai/alego-compaction-basic'
import type { BasicCompactionConfig } from '@singula-ai/alego-compaction-basic'

/**
 * Shared harness for the headless-agent e2e suites: the full plugin stack
 * with the real DeepSeek adapter and the real bash + todo_write tools. Lives
 * outside the *.e2e.ts pattern so importing it never re-registers another
 * file's tests.
 */

export const SYSTEM_PROMPT = 'You are a coding agent. Use bash for file operations '
  + 'with cat/grep/heredocs; check [exit code: N] markers, '
  + 'and report results briefly.'

/** System prompt for the todo_write e2e: nudges the model to plan with the tool. */
export const TODO_SYSTEM_PROMPT = 'You are a coding agent. For multi-step work, '
  + 'use the todo_write tool to track a task list: send the WHOLE list each call, '
  + 'mark every task being actively worked on in_progress (several at once when '
  + 'work runs in parallel, at least one while work remains), and mark a task '
  + 'completed as soon as it is done.'

/** Options for {@link codingHarness}. */
export interface CodingHarnessOptions {
  /**
   * Deployment persona for the tree (the system-prompt plugin's `persona`
   * config — per-context, not per-agent). Omitted ⇒ no persona section.
   */
  persona?: string
  /** Durable JSONL persistence root (the resume suite needs it; others stay file-free). */
  persistenceRoot?: string
  /**
   * Load {@link BasicCompactionEngine} with this config so the compaction e2e can
   * trigger compaction at a small, controlled history size. Omitted ⇒ no
   * compaction plugin (the default suites run without it).
   */
  compact?: BasicCompactionConfig
  /** Test-only context capacity advertised for `deepseek-v4-flash`. */
  modelContextWindow?: number
}

export async function codingHarness(workdir: string, options: CodingHarnessOptions = {}): Promise<Context> {
  const ctx = new Context()
  await ctx.plugin(SessionProjectionRegistry)
  await mountAgentLoopTestDependencies(ctx, {
    systemPrompt: { persona: options.persona ?? '' },
  })
  await ctx.plugin(AgentLoop, { agents: [] })
  await ctx.plugin(LlmDeepSeek, options.modelContextWindow === undefined ? {} : {
    models: [{ id: 'deepseek-v4-flash', contextWindow: options.modelContextWindow }],
  })
  await ctx.plugin(LocalSubprocessRuntime)
  await ctx.plugin(BashEnvPlugin)
  await ctx.plugin(LocalBashExecutor, { cwd: workdir, timeoutMs: 30_000 })
  await ctx.plugin(ToolBash)
  await ctx.plugin(ToolTodo, { allowParallelInProgress: true })
  // Compaction is opt-in: only the compaction e2e loads the reusable meter and backend.
  if (options.compact !== undefined) {
    await ctx.plugin(TokenMeter)
    await ctx.plugin(ToolResultPruner)
    await ctx.plugin(BasicCompactionEngine, options.compact)
  }
  // Durable JSONL persistence is opt-in: only the resume e2e needs it, and the
  // other suites stay file-free. Loaded last so a resume's deferred
  // `ctx.inject(['sessionPersistence'])` resolves once this is present.
  if (options.persistenceRoot !== undefined) {
    await ctx.plugin(JsonlSessionPersistence, { root: options.persistenceRoot })
    await ctx.plugin(SessionCheckpointPolicy)
  }
  return ctx
}

export function waitForIdle(ctx: Context, agent: Agent): Promise<void> {
  return new Promise((resolve) => {
    const dispose = ctx.on('agent/status', ({ agent: subject, status }) => {
      if (subject === agent && status === 'idle') {
        dispose()
        resolve()
      }
    })
  })
}

export function finalText(events: readonly SessionEvent[]): string {
  const message = events.findLast(event => event.type === 'assistant/message')
  if (message?.type !== 'assistant/message') return ''
  return message.data.message.content
    .filter(block => block.type === 'text')
    .map(block => block.text)
    .join('')
}
