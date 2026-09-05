/**
 * Registry tests for `@singula-ai/alego-shell-env`: built-in facts, contributor
 * ownership and validation, collection ordering, effect-scoped disposal, and
 * the explicit disposer contract.
 */

import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Context } from '@singula-ai/cordis'
import { ToolCallId } from '@singula-ai/alego-llm'
import type { Agent } from '@singula-ai/alego-agent'
import { SESSION_FORMAT_VERSION } from '@singula-ai/alego-session'
import type { ToolExecution } from '@singula-ai/alego-tools'
import { ShellEnvRegistry } from '@singula-ai/alego-shell-env'
import * as BashEnvPlugin from '@singula-ai/alego-shell-env'

const testToolSignal = new AbortController().signal

afterEach(() => vi.unstubAllEnvs())

function execution(sessionId?: string): ToolExecution {
  return {
    signal: testToolSignal,
    token: Symbol('bash-env-test') as ToolExecution['token'],
    callId: ToolCallId('bash-env-call'),
    rootCallId: ToolCallId('bash-env-call'),
    name: 'bash',
    arguments: { command: 'true' },
    ...(sessionId === undefined
      ? {}
      : {
        agent: {
          session: {
            header: { version: SESSION_FORMAT_VERSION, id: sessionId, createdAt: 0, isSeeded: false },
          },
        } as unknown as Agent,
      }),
  }
}

describe('ShellEnvRegistry', () => {
  it('collects unconditional shell facts and the current agent session id', () => {
    const ctx = new Context()
    const registry = new ShellEnvRegistry(ctx, { alegoHome: './test-alego-home' })

    expect(registry.collect(execution())).toEqual({
      ALEGO_HOME: resolve('./test-alego-home'),
      ALEGO_SHELL: '1',
    })
    expect(registry.collect(execution('session-a'))).toEqual({
      ALEGO_HOME: resolve('./test-alego-home'),
      ALEGO_SESSION_ID: 'session-a',
      ALEGO_SHELL: '1',
    })
  })

  it('resolves ALEGO_HOME from the ambient override or the user-home default', () => {
    vi.stubEnv('ALEGO_HOME', './ambient-alego-home')
    const fromEnvironment = new ShellEnvRegistry(new Context())
    expect(fromEnvironment.collect(execution()).ALEGO_HOME).toBe(resolve('./ambient-alego-home'))

    vi.stubEnv('ALEGO_HOME', undefined)
    const fromDefault = new ShellEnvRegistry(new Context())
    expect(fromDefault.collect(execution()).ALEGO_HOME).toBe(join(homedir(), '.alego'))
  })

  it('collects declared contributor variables and omits unavailable values', () => {
    const ctx = new Context()
    const registry = new ShellEnvRegistry(ctx, { alegoHome: './test-alego-home' })
    registry.register({
      name: 'optional-session-fact',
      variables: {
        ALEGO_SESSION_OPTIONAL: { description: 'Optional session-scoped test fact.' },
      },
      resolve: exec => exec.agent === undefined ? {} : { ALEGO_SESSION_OPTIONAL: exec.agent.session.header.id },
    })
    registry.register({
      name: 'always-available-fact',
      variables: {
        ALEGO_ALWAYS_AVAILABLE: { description: 'Always-available test fact.' },
      },
      resolve: () => ({ ALEGO_ALWAYS_AVAILABLE: 'yes' }),
    })

    expect(registry.collect(execution())).not.toHaveProperty('ALEGO_SESSION_OPTIONAL')
    expect(registry.collect(execution()).ALEGO_ALWAYS_AVAILABLE).toBe('yes')
    expect(registry.collect(execution('session-b')).ALEGO_SESSION_OPTIONAL).toBe('session-b')
    expect(registry.list()).toEqual([
      {
        contributor: 'always-available-fact',
        description: 'Always-available test fact.',
        key: 'ALEGO_ALWAYS_AVAILABLE',
      },
      {
        contributor: 'optional-session-fact',
        description: 'Optional session-scoped test fact.',
        key: 'ALEGO_SESSION_OPTIONAL',
      },
    ])
  })

  it('rejects duplicate variable ownership at registration time', () => {
    const ctx = new Context()
    const registry = new ShellEnvRegistry(ctx, { alegoHome: './test-alego-home' })
    registry.register({
      name: 'first',
      variables: { ALEGO_SHARED: { description: 'First owner.' } },
      resolve: () => ({ ALEGO_SHARED: 'first' }),
    })

    expect(() => registry.register({
      name: 'second',
      variables: { ALEGO_SHARED: { description: 'Second owner.' } },
      resolve: () => ({ ALEGO_SHARED: 'second' }),
    })).toThrow(/ALEGO_SHARED.*first.*second|ALEGO_SHARED.*second.*first/)
  })

  it('rejects duplicate contributor names and malformed declarations', () => {
    const registry = new ShellEnvRegistry(new Context(), { alegoHome: './test-alego-home' })
    registry.register({
      name: 'declared',
      variables: { ALEGO_DECLARED: { description: 'Declared fact.' } },
      resolve: () => ({}),
    })

    expect(() => registry.register({
      name: 'declared',
      variables: { ALEGO_ANOTHER: { description: 'Another fact.' } },
      resolve: () => ({}),
    })).toThrow(/already registered/)
    expect(() => registry.register({
      name: ' ',
      variables: { ALEGO_BLANK_NAME: { description: 'Blank owner.' } },
      resolve: () => ({}),
    })).toThrow(/name must be non-empty/)
    expect(() => registry.register({
      name: 'invalid-key',
      variables: { alego_invalid: { description: 'Invalid key.' } } as unknown as Record<'ALEGO_INVALID', { description: string }>,
      resolve: () => ({}),
    })).toThrow(/invalid key/)
    expect(() => registry.register({
      name: 'reserved-key',
      variables: { ALEGO_HOME: { description: 'Reserved key.' } },
      resolve: () => ({}),
    })).toThrow(/reserved key/)
    expect(() => registry.register({
      name: 'blank-description',
      variables: { ALEGO_BLANK_DESCRIPTION: { description: ' ' } },
      resolve: () => ({}),
    })).toThrow(/must describe/)
  })

  it('rejects undeclared variables returned by a contributor', () => {
    const ctx = new Context()
    const registry = new ShellEnvRegistry(ctx, { alegoHome: './test-alego-home' })
    registry.register({
      name: 'drifted-provider',
      variables: { ALEGO_DECLARED: { description: 'Declared fact.' } },
      resolve: () => ({ ALEGO_UNDECLARED: 'bad' }),
    })

    expect(() => registry.collect(execution())).toThrow(/drifted-provider.*ALEGO_UNDECLARED/)
  })

  it('rejects non-string values returned by a contributor', () => {
    const registry = new ShellEnvRegistry(new Context(), { alegoHome: './test-alego-home' })
    registry.register({
      name: 'wrong-value-type',
      variables: { ALEGO_STRING: { description: 'String fact.' } },
      resolve: () => ({ ALEGO_STRING: 42 }) as unknown as Record<'ALEGO_STRING', string>,
    })

    expect(() => registry.collect(execution())).toThrow(/wrong-value-type.*non-string.*ALEGO_STRING/)
  })

  it('removes an effect-scoped contributor when its plugin is disposed', async () => {
    const ctx = new Context()
    const registry = new ShellEnvRegistry(ctx, { alegoHome: './test-alego-home' })
    const fiber = await ctx.plugin({
      inject: ['shellEnv'],
      apply(inner: Context) {
        inner.shellEnv.register({
          name: 'temporary',
          variables: { ALEGO_TEMPORARY: { description: 'Temporary fact.' } },
          resolve: () => ({ ALEGO_TEMPORARY: 'present' }),
        })
      },
    })

    expect(registry.collect(execution()).ALEGO_TEMPORARY).toBe('present')
    await fiber.dispose()
    expect(registry.collect(execution())).not.toHaveProperty('ALEGO_TEMPORARY')
  })

  it('returns an explicit contributor disposer', () => {
    const registry = new ShellEnvRegistry(new Context(), { alegoHome: './test-alego-home' })
    const dispose = registry.register({
      name: 'explicit-disposal',
      variables: { ALEGO_EXPLICIT_DISPOSAL: { description: 'Explicitly disposed fact.' } },
      resolve: () => ({ ALEGO_EXPLICIT_DISPOSAL: 'present' }),
    })

    expect(registry.collect(execution()).ALEGO_EXPLICIT_DISPOSAL).toBe('present')
    dispose()
    expect(registry.collect(execution())).not.toHaveProperty('ALEGO_EXPLICIT_DISPOSAL')
  })

  it('the plugin registers the service with no contributors on load', async () => {
    const ctx = new Context()
    await ctx.plugin(BashEnvPlugin)
    expect(ctx.shellEnv).toBeInstanceOf(ShellEnvRegistry)
    expect(ctx.shellEnv.list()).toEqual([])
  })
})
