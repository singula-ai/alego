# Agent Note: Rebranding the harness to Alego

Status: implemented

English | [中文](2026-08-22-alego-rebrand.zh.md)

## Problem

This repository is a fork of DeepSeek Harness that ships under its own name, published by Singula AI. Every brand-bearing surface had to move — npm scope and package names, the `dsh` command, the `DSH_` environment prefix, the `dsh` plugin manifest key, `~/.dsh`, prose, and artwork — without changing what any of it does.

The rename could not be a blind substitution. `dsh` occurs inside ordinary words (`handshake`, `headSha`, `CardShell`, `spreadsheet`), and `deepseek` names two different things: this harness, and the third-party model provider it integrates with.

## Decision

**DeepSeek the provider stays.** `llm-deepseek`, `web-search-deepseek`, the `deepseek-official` provider route, `DEEPSEEK_API_KEY`, `api.deepseek.com`, and the DeepSeek model ids name an external service. Renaming them would break the integration, so the rename covers only the harness's own identity. The same applies to the vendored packages' upstream provenance URLs in [THIRD_PARTY_NOTICES.md](../../../../THIRD_PARTY_NOTICES.md), which must stay accurate to be attribution at all, and to references to upstream issues and pull requests, which keep pointing at the upstream repository so they still resolve.

**`dsh` is renamed only as a whole identifier segment.** A segment is bounded by a separator or a case change: `dsh-`, `dsh_`, `DSH_`, `Dsh`, `dsh` before an uppercase letter, and bare `dsh` at a word boundary. Word-internal `dsh` is left alone, which is what keeps `handshake` intact.

**The scope names the company and the prefix names the product**, exactly as upstream had it. `@deepseek-ai/dsh-<name>` became `@singula-ai/alego-<name>`, and the CLI package — upstream's bare `@deepseek-ai/dsh` — became the bare `@singula-ai/alego`, so the published entry point is `npx @singula-ai/alego web`. Singula AI ships more than one product, so the scope belongs to the company and the product lives in the package name.

**Packages upstream published without the product prefix keep none here.** The rescoped Cordis vendor tree (`@singula-ai/cordis`, `@singula-ai/schemastery`, `@singula-ai/cosmokit`, `@singula-ai/cordis-plugin-*`), the Landlock addon family, and the website carry no `alego-` prefix, because they are not the product. That is what lets one prefix test separate the MIT product from everything else sharing the scope.

**Brand artwork was replaced, not renamed.** The DeepSeek whale and wordmark were shipped as literal SVG path data in `FishLogo.tsx`, `BrandWordmark.tsx`, both favicons, `wordmark.svg`, and a badge PNG. A fork may not ship them under its own name, so `AlegoMark` draws an original studded-block mark and the wordmark sets the name as live text instead of baked letterforms.

## What the product name still owns

The scope names the company; nothing the user types changed with it. The command stays `alego`, the environment prefix stays `ALEGO_`, the per-user directory stays `~/.alego`, the plugin manifest key stays `alego`, CSS custom properties stay `--alego-*`, and the JSDoc scan tag stays `@alegoScopeScan`. Third-party plugins are discovered as `alego-plugin-*` under the [`alego-plugin`](https://github.com/topics/alego-plugin) topic. npm package names are the one surface carrying the company name, which keeps the plugin ecosystem keyed on the product it extends.

## The frozen archive was re-sealed

`archived/manifest.json` is append-only so archived Agent Notes cannot change. A repository-wide rename necessarily rewrites their text, so the manifest was re-sealed wholesale — the one edit the freeze does not anticipate. Nothing but brand tokens changed in those files; no archived decision was altered.

## Alternatives considered

**Scope by product (`@alego/<name>`, CLI `@alego/cli`).** Shipped first, then replaced. It is shorter at the import site and matches how single-product tool ecosystems name themselves, but it collapsed the company and product into one token. Three gates had been reading that split to tell the MIT product from the rescoped vendor tree, the BSD-3-Clause Landlock addon, and the unpublished website, and each had to be rewritten to identify packages by directory instead; restoring the prefix reverted all three to upstream's logic. It also named the CLI after its tier rather than the product — `npx @alego/cli web` — and with more than one Singula AI product, a company scope is also one npm organization to own, secure, and audit rather than one per product.

**Rename the DeepSeek provider packages too.** Rejected: they name a third-party API, not this product, and the rename would have changed behavior — the opposite of the goal.

## Consequences

The harness carries no DeepSeek brand token, while every DeepSeek integration keeps working against the real API. Nothing about the plugin surface changed shape: [examples/hello-world](../../../../examples/hello-world/README.md) mounts a plugin from `cordis.yml`, and its keyless smoke asserts the tool is registered, published in the model-visible schema list, executable, and withdrawn when the plugin fiber is disposed.

Because the naming structure mirrors upstream one-for-one, [`verify-alego-package-licenses`](../../../../scripts/verify-alego-package-licenses.ts), [`verify-client-packages`](../../../../scripts/verify-client-packages.ts), and [`package-graph`](../../../../scripts/package-graph.ts) keep upstream's logic with only the two brand tokens substituted, so a future upstream sync has no naming divergence to reconcile.

The cost is length: `@singula-ai/alego-client-ui-settings-plugin-inventory` at every import site, and the company name typed to reach the product.

Package names, the `alego` command, `ALEGO_*`, the `alego` manifest key, and `~/.alego` all changed at once, so no on-disk state, environment, or composition written against the old names is readable. The pre-release stance in [AGENTS.md](../../../../AGENTS.md) permits exactly this, and there are no external consumers to migrate.
