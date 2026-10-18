---
kind: upgrade-guide
description: "The `agent-instructions` row no longer accepts `alegoHome`; instruction loading always resolves the harness home from `$ALEGO_HOME` or `~/.alego`."
---

# Instruction loading resolves one harness home

English | [中文](guide.zh.md)

## Change

`@singula-ai/alego-agent-instructions` removed its `alegoHome` config field. The plugin resolves the harness home through `resolveAlegoHome()` from `@singula-ai/alego-home-paths`, like every other harness consumer: the home is `$ALEGO_HOME` when it is set and non-blank, otherwise `~/.alego`, with tilde expansion.

A `cordis.yml`, profile patch, or `--patch` overlay that still sets `alegoHome` on the `agent-instructions` row has no effect: the row keeps the stray key and the plugin ignores it, so instruction loading follows the process home. Other providers, such as `alego-skill-filesystem` and `alego-shell-env`, keep their own home fields; this removal covers the instruction loader only.

## Migration

1. Delete `alegoHome` from the `agent-instructions` row in `cordis.yml`, `$ALEGO_HOME/cordis.patch.yml`, `$ALEGO_HOME/profiles/<profile>/cordis.patch.yml`, and any `--patch` overlay.
2. Where the override pointed at a non-default home, export `ALEGO_HOME` for the process instead, so every harness consumer reads that home.
3. Confirm with `alego --profile <profile> --dump-config` that the `agent-instructions` row lists only its remaining fields, and that a new session's first request shows `Instructions from: $ALEGO_HOME/AGENTS.md` (or `~/.alego/AGENTS.md`) when that file exists.
