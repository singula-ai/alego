/**
 * The smallest complete Alego plugin: one model-visible tool contributed
 * through the `tools` capability seam.
 *
 * Everything a third-party plugin needs is in this file — the Cordis plugin
 * name, the services it injects, a validated config, and an `apply` that
 * registers the contribution. Nothing here is example-only: a published
 * plugin package exports the same four names and is mounted the same way.
 *
 * @module hello-world
 */

import type { Context } from '@singula-ai/cordis'
import z from '@singula-ai/schemastery'
import { defineTool } from '@singula-ai/alego-tools'

/** Cordis plugin name used by Loader diagnostics. */
export const name = 'hello-world'

/** The tool registry this plugin contributes to. */
export const inject = ['tools']

/** Greeting configuration, changeable from `cordis.yml` without editing the plugin. */
export interface Config {
  /** Word placed before the greeted name. */
  greeting: string
}

/** Schemastery validation for {@link Config}. */
export const Config: z<Config> = z.object({
  greeting: z.string().default('Hello'),
})

/**
 * Register the `hello_world` tool for the lifetime of `ctx`.
 * @param ctx - plugin context carrying the tool registry.
 * @param config - validated greeting configuration.
 */
export function apply(ctx: Context, config: Config): void {
  ctx.tools.register(defineTool({
    name: 'hello_world',
    description: 'Greet someone by name. Call it to confirm that a mounted plugin reaches the model.',
    parameters: {
      name: {
        type: 'string',
        required: true,
        description: 'Who to greet.',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          message: { type: 'string', required: true },
        },
      },
      render: (_args, value) => [{ type: 'text', text: value.message }],
    },
    execute: args => Promise.resolve({ message: `${config.greeting}, ${args.name}!` }),
    presentCall: args => ({ card: 'generic', title: 'Hello world', kind: 'other', rawInput: args.name }),
  }))
}
