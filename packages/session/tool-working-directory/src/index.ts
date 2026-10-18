/**
 * Read or change the calling Session's working directory.
 * @module @singula-ai/alego-tool-working-directory
 */

import type { Context } from '@singula-ai/cordis'
import { defineTool } from '@singula-ai/alego-tools'
import type {} from '@singula-ai/alego-working-directory'

/** Cordis plugin name. */
export const name = 'tool-working-directory'
/** Services used by the tool. */
export const inject = ['tools', 'workingDirectory']

/**
 * Register the working-directory tool for this composition.
 * @param ctx - context providing the tool registry and directory owner.
 */
export function apply(ctx: Context): void {
  ctx.tools.register(defineTool({
    name: 'working_directory',
    description: 'Read the current working directory, or change it with cd. Relative paths use the current directory. Existing shells and running processes keep their own directories.',
    parameters: {
      cd: { type: 'string', description: 'Existing directory to enter. Omit to read the current directory.' },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: { cwd: { type: 'string', required: true, description: 'Current absolute working directory.' } },
      },
      render: (_args, value) => [{ type: 'text', text: value.cwd }],
    },
    async execute(args, exec) {
      if (exec.agent === undefined) throw new Error('working_directory requires an agent Session')
      const cwd = args.cd === undefined
        ? await ctx.workingDirectory.ensure(exec.agent, exec.signal)
        : await ctx.workingDirectory.set(exec.agent, args.cd, exec.signal)
      return { cwd }
    },
  }))
}
