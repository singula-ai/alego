# Agent Note: Rebranding the harness to Alego

Status: implemented

English | [中文](2026-08-22-alego-rebrand.zh.md)

## Problem

This repository is a fork of DeepSeek Harness that ships under its own name. Every brand-bearing surface had to move — npm scope and package names, the `dsh` command, the `DSH_` environment prefix, the `dsh` plugin manifest key, `~/.dsh`, prose, and artwork — without changing what any of it does.

The rename could not be a blind substitution. `dsh` occurs inside ordinary words (`handshake`, `headSha`, `CardShell`, `spreadsheet`), and `deepseek` names two different things: this harness, and the third-party model provider it integrates with.

## Decision

**DeepSeek the provider stays.** `llm-deepseek`, `web-search-deepseek`, the `deepseek-official` provider route, `DEEPSEEK_API_KEY`, `api.deepseek.com`, and the DeepSeek model ids name an external service. Renaming them would break the integration, so the rename covers only the harness's own identity. The same applies to the vendored packages' upstream provenance URLs in [THIRD_PARTY_NOTICES.md](../../../../THIRD_PARTY_NOTICES.md), which must stay accurate to be attribution at all, and to references to upstream issues and pull requests, which keep pointing at the upstream repository so they still resolve.

**`dsh` is renamed only as a whole identifier segment.** A segment is bounded by a separator or a case change: `dsh-`, `dsh_`, `DSH_`, `Dsh`, `dsh` before an uppercase letter, and bare `dsh` at a word boundary. Word-internal `dsh` is left alone, which is what keeps `handshake` intact.

**The npm scope carries the product name, so the package prefix is gone.** `@deepseek-ai/dsh-<name>` became `@alego/<name>`, and the CLI package `@deepseek-ai/dsh` became `@alego/cli`.

**Brand artwork was replaced, not renamed.** The DeepSeek whale and wordmark were shipped as literal SVG path data in `FishLogo.tsx`, `BrandWordmark.tsx`, both favicons, `wordmark.svg`, and a badge PNG. A fork may not ship them under its own name, so `AlegoMark` draws an original studded-block mark and the wordmark sets the name as live text instead of baked letterforms.

## Package identity is directory-shaped, not prefix-shaped

Upstream used the `dsh-` prefix to separate the product from everything else sharing the `@deepseek-ai` scope: the rescoped Cordis vendor packages, the BSD-3-Clause Landlock addon, and the unpublished website. Collapsing the prefix into the scope removed that signal, and three gates had been reading it:

- [`verify-alego-package-licenses`](../../../../scripts/verify-alego-package-licenses.ts) now selects the MIT product by manifest path (root, `apps/*`, `packages/*/*`) rather than by name prefix.
- [`verify-client-packages`](../../../../scripts/verify-client-packages.ts) reads the rescoped names from `vendor/*/package.json` and treats them as ordinary third-party dependencies, as before; Cordis stays a peer relationship by policy.
- [`package-graph`](../../../../scripts/package-graph.ts) keeps only edges between graph members, so a peer dependency on vendored Cordis no longer looks like an unsatisfiable node.

Directory is the more truthful discriminator: it is what actually distinguishes these trees, and it does not depend on a naming convention holding.

## The frozen archive was re-sealed

`archived/manifest.json` is append-only so archived Agent Notes cannot change. A repository-wide rename necessarily rewrites their text, so the manifest was re-sealed wholesale — the one edit the freeze does not anticipate. Nothing but brand tokens changed in those files; no archived decision was altered.

## Alternatives considered

**Keep a product prefix (`@alego/alego-<name>`).** A direct structural mirror of upstream that would have preserved the prefix signal for free. Rejected: it repeats the brand in every specifier for the benefit of three gates, and the directory rule those gates now use is independent of naming.

**Rename the DeepSeek provider packages too.** Rejected: they name a third-party API, not this product, and the rename would have changed behavior — the opposite of the goal.

## Consequences

The harness carries no DeepSeek brand token, while every DeepSeek integration keeps working against the real API. Nothing about the plugin surface changed shape: [examples/hello-world](../../../../examples/hello-world/README.md) mounts a plugin from `cordis.yml`, and its keyless smoke asserts the tool is registered, published in the model-visible schema list, executable, and withdrawn when the plugin fiber is disposed.

The cost is that the scope no longer says which tree a package belongs to. Three gates absorbed that by reading directories instead, but any future check that wants "the product, not the vendored framework" has to make the same choice deliberately rather than matching a prefix.

Package names, the `alego` command, `ALEGO_*`, the `alego` manifest key, and `~/.alego` all changed at once, so no on-disk state, environment, or composition written against the old names is readable. The pre-release stance in [AGENTS.md](../../../../AGENTS.md) permits exactly this, and there are no external consumers to migrate.
