# @singula-ai/alego-agent-spine-demo

English | [中文](README.zh.md)

The **default executor-less, UI-less agent spine** as ONE Cordis bundle plugin. It loads the fixed set of services every harness agent needs, including the local skill provider, and forwards the loop's `agents` list as its own config — so an app package composes a working agent by adding only an entry point and the swappable backends.

Read this package for the whole plugin tree and its composition order.

## The tree it loads

`apply(ctx, config)` mounts each of these as a child of the bundle fiber:

```
@singula-ai/cordis-plugin-timer  timer service (writes nothing to stdout)
@singula-ai/alego-llm              abstract LLM service + content-block vocabulary
@singula-ai/alego-session          event-sourced session log + store
@singula-ai/alego-session-title    log-backed title service + deterministic fallback
@singula-ai/alego-system-prompt    prompt-section + tool-schema assembly
@singula-ai/alego-tools            registry + guarded pre/around/post/final-result pipeline
@singula-ai/alego-skill            skill provider registry
@singula-ai/alego-skill-filesystem      local filesystem skill provider
@singula-ai/alego-agent            agent registry + initiator scope + agent/* events
@singula-ai/alego-goal             optional persisted same-session goal domain
@singula-ai/alego-tool-goal        optional model-facing goal controls
@singula-ai/alego-goal-round-driver     optional same-session goal-round driver
@singula-ai/alego-llm-retry        provider-routed request retry policy
@singula-ai/alego-jobs-local      generic background-job registry
@singula-ai/alego-invariants       configurable invariant registry service
@singula-ai/alego-session/invariant
@singula-ai/alego-agent/invariant
@singula-ai/alego-scope/invariant
@singula-ai/alego-agent-loop/invariant
                                  package-owned relational checks
@singula-ai/alego-tool-bash        the model-facing bash schema (unless toolBash=false)
@singula-ai/alego-agent-instructions  AGENTS.md/CLAUDE.md workspace context loader
@singula-ai/alego-tool-skill       session-prefix skill catalog + model-facing loader schema
@singula-ai/alego-tool-jobs       job_output/job_list/job_kill schemas + completion notices
@singula-ai/alego-agent-loop       THE concrete loop (gets the forwarded `agents`)
                                  (alego-system-prompt gets the forwarded `persona`)
```

## What it deliberately leaves OUTSIDE the bundle

The spine is everything COMMON to every entry point. The swappable and entry-point-coupled pieces stay out, picked by whatever loads the bundle:

- **the LLM adapter** — the bundle ships the abstract `llm` service; the leaf registers a concrete adapter on `ctx.llm` (`llm-deepseek`, `llm-pi-ai`, `llm-replay`).
- **model-backed session-title providers** — the bundle mounts the fallback service with overridable example limits (5 words, 40 fallback bytes, 80 accepted-title bytes); a leaf may opt into exactly one first-prompt or all-messages LLM provider.
- **the bash executor** — the bundle ships `tool-bash` (the consumer schema); the leaf provides `ctx.shell` (`bash-local` or a sandboxed impl).
- **non-local skill providers** — the bundle ships the skill registry, the local filesystem provider, and the `skill` tool; deployments can add other providers such as embedded or remote catalogs as siblings.
- **entry point + per-app infrastructure** — headless, ACP, and JSON-RPC app packages own transport, stdout, and reload choices. `timer` stays in the spine because it is common and stdout-silent.

This applies the [Service Definition / Service Provider / Consumer separation](../../../.agents/notes/implemented/architecture/2026-06-13-capability-seams.md) at the composition level: the bundle owns the shared spine, the leaf owns the backends, the app package owns the entry point.

## Config

```ts
import type { Config } from '@singula-ai/alego-agent-spine-demo'
// { agents?, maxParallelToolCalls?, includeHarnessIdentity?, includeRuntimeContext?, persona?, toolOrder?, tools?, alegoHome?, sessionTitle?, skills?, workspaceContext, toolBash?, jobs?, toolJobs?, goals?, invariants? }
// workspaceContext requires { maxBytes } or false; the other owner schemas supply defaults.
```

The bundle forwards each field to the child that owns it. App packages supply any pre-created agents: headless and JSON-RPC compositions create `main`, while the ACP app creates agents on demand at `session/new`. `includeRuntimeContext: false` is forwarded to `alego-system-prompt` and suppresses all dynamic context snapshots for fresh sessions without disabling their policy services. Prompt, tool, title, skill, agent-instructions, invariant, goal, and task settings retain the schemas and defaults documented by their owning packages; `jobs.maxConcurrentJobsPerOwner` configures the local provider independently of the model-facing `toolJobs` controls. `pickSpineConfig()` copies only fields owned by this bundle, and conflicting `alegoHome` values fail during composition.

For example, `{ invariants: { enabled: true, package_allowlist: ['^@singula-ai/alego-'], package_blocklist: ['agent-loop$'] } }` keeps the package-owned companions mounted but suppresses the blocked owner. Blocklist matches override allowlist matches; see [`alego-invariants`](../../runtime-diagnostics/invariants/README.md) for regex and lifecycle rules.

## Why a code bundle, not a shared YAML include

A YAML include can deduplicate config but cannot own a bin or provide entry-point defaults. The ACP app package makes protocol-pure stdout wiring the default, though a leaf can still add an unsafe logger. Bundle children register services in the root isolate-keyed store, so injected leaf siblings see them without load-order coupling.

The retry policy may repeat a failed request in a new numbered step. Retry status, provider errors, and failed partial chunks stay outside model history; each provider attempt can still incur billing, always mode has no attempt limit, entry points derive usage across every logged step, and the reconstructed request preserves the prior prefix for provider cache reuse.

## Model Experience

Indirectly, through `alego-system-prompt`, `alego-tool-skill`, `alego-tool-bash`, `alego-tools`, and `alego-llm-retry`, plus `alego-tool-goal` and goal-round prompts when `goals` is enabled. The bundle adds no model-bound wrapper content of its own.

#### KV Cache effect

No direct invalidation; the named consumer owns any request-prefix changes.

## Known Limitations and Deferred Work

- **Most of the spine set is fixed in code** — `apply()` always mounts the core services; config can omit bundled goals, skills, bash, and task-control tools, but swapping the loop or dropping another spine member means composing a different bundle.
- **The invariant service and companions remain fixed members** — `invariants.enabled: false` or package filters suppress checks but do not remove the service or companion registrations; Session's always-on validation and freezing are separate.
