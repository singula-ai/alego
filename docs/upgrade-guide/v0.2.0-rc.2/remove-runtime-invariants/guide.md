---
kind: upgrade-guide
description: "The runtime invariant registry package and every package's `./invariant` subpath export are removed."
---

# Runtime invariant plugins are removed

English | [中文](guide.zh.md)

## Change

In v0.2.0-rc.2, `@singula-ai/alego-invariants` provided the `ctx.invariants` service, and workspace packages such as `@singula-ai/alego-session`, `@singula-ai/alego-agent`, `@singula-ai/alego-scope`, and `@singula-ai/alego-agent-loop` published `./invariant` companion plugins that registered checks with it. The `sdk-minimal` profile mounted five of these rows with ids `invariants`, `session-invariant`, `agent-invariant`, `scope-invariant`, and `agent-loop-invariant`.

The next release no longer publishes `@singula-ai/alego-invariants`, `InvariantRegistry`, `InvariantInstaller`, `InvariantFailure`, `InvariantError`, or any `<package>/invariant` subpath. The `sdk-minimal` profile no longer contains the five rows. The `credentials/reference-updated`, `credentials/record-updated`, `authorization/settled`, and `llm/adapters-updated` emitters contain and log every listener failure, including errors with `code: 'INVARIANT'`, instead of rethrowing them.

A `cordis.yml`, patch, or overlay that names a removed module fails to load it. A patch that targets one of the five `sdk-minimal` ids logs `patch: entry <id> not found`. TypeScript code that imports a removed module or symbol no longer compiles.

## Migration

1. Delete rows whose `name` is `@singula-ai/alego-invariants` or ends in `/invariant` from `cordis.yml`, `$ALEGO_HOME/profiles/<name>/cordis.patch.yml`, and `--patch` overlays.
2. Delete patch entries that target the ids `invariants`, `session-invariant`, `agent-invariant`, `scope-invariant`, or `agent-loop-invariant`.
3. Remove `@singula-ai/alego-invariants` from `package.json` dependencies and delete imports of it and of `<package>/invariant` subpaths. A plugin that relied on a rethrown `INVARIANT` failure from one of the four emitters must report the failure through its own channel.
4. Confirm: `alego` starts the profile without a module-not-found error or `patch: entry ... not found` warning, and `tsc` reports no missing module or export.
