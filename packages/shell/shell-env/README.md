# @singula-ai/alego-shell-env

English | [中文](README.zh.md)

The tool-independent shell environment plugin: owns the `ctx.shellEnv` registry of trusted, per-execution `ALEGO_*` variables that the model-facing shell tools (`alego-tool-bash`, `alego-tool-pwsh`) collect into every shell call's environment. Built-in shell facts (`ALEGO_HOME`, `ALEGO_SHELL=1`, `ALEGO_SESSION_ID`) are owned by the registry itself; other plugins register additional enumerable facts with effect-scoped disposal, and duplicate ownership or undeclared runtime keys fail loudly.

The package root exports the Cordis plugin contract (`name`, `inject`, `Config`, `apply`) plus the `ShellEnvRegistry` service class and its contributor types; consumers use `ctx.shellEnv` after loading this plugin.

## Config

```yaml
- id: shell-env
  name: '@singula-ai/alego-shell-env'
  config:
    alegoHome: C:\Users\me\.alego   # default: $ALEGO_HOME, then ~/.alego
```

## Managed environment

Every foreground and background model shell call receives a newly collected trusted `ALEGO_*` environment. `ALEGO_HOME` is the absolute Harness home resolved by [`@singula-ai/alego-home-paths`](../../util/home-paths/README.md) (`alegoHome` config, then ambient `$ALEGO_HOME`, then `~/.alego`) and `ALEGO_SHELL=1` identifies the managed child. Agent calls additionally receive `ALEGO_SESSION_ID=agent.session.header.id`; when the active persistence seam locates a JSONL artifact they also receive `ALEGO_SESSION_JSONL=<absolute target path>`. The JSONL path is a location hint: it may not exist before the first flush or contain the current buffered turn, and it is not an authorization credential.

`ctx.shellEnv` owns collection. Other plugins can register an effect-scoped contributor with a stable name, declared keys/descriptions, and `resolve(execution: ToolExecution)`; duplicate ownership and undeclared runtime keys fail loudly, while `list()` enumerates declarations without executing providers. Harness built-ins reserve `ALEGO_HOME`, `ALEGO_SHELL`, and `ALEGO_SESSION_ID`; this plugin's persistence translator owns `ALEGO_SESSION_JSONL` by reading the backend-neutral `sessionPersistence.locate()` seam.

```ts
import type { Context } from '@singula-ai/cordis'
import type {} from '@singula-ai/alego-shell-env'

export const inject = ['shellEnv']

export function apply(ctx: Context): void {
  ctx.shellEnv.register({
    name: 'deployment-region',
    variables: { ALEGO_DEPLOYMENT_REGION: { description: 'Current deployment region.' } },
    resolve: execution => execution.agent === undefined ? {} : { ALEGO_DEPLOYMENT_REGION: 'cn-north' },
  })
}
```

The overlay is computed from the current `ToolExecution` and passed through the dedicated `ShellExecRequest.alegoEnv` channel. The local executors remove all inherited `ALEGO_*` before merging that snapshot, so nested harnesses and concurrent parent/child agents cannot leak stale identities. `process.env` is never modified. The shell tools' descriptions teach the generic `$ALEGO_*` convention rather than naming persistence-specific variables or adding a permanent system-prompt section.

## Model Experience

Indirectly, through the shell tools (`alego-tool-bash`, `alego-tool-pwsh`), which collect this registry's managed `ALEGO_*` snapshot into every shell-tool call.

#### KV Cache effect

No direct invalidation; the named consumers own any request-prefix changes.

## Known Limitations and Deferred Work

- **`list()` enumerates contributor-declared variables only** — registry-owned built-ins (`ALEGO_HOME`, `ALEGO_SHELL`, `ALEGO_SESSION_ID`) are not included, so diagnostics, prompt, or UI code must not treat `list()` as an exhaustive environment catalog.
