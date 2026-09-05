# Agent Note: Rebranding the harness to Alego

Status: implemented

English | [中文](2026-08-22-alego-rebrand.zh.md)

## Problem

This repository is a fork of DeepSeek Harness that ships under its own name, published by Singula AI. Every brand-bearing surface had to move — npm scope and package names, the `dsh` command, the `DSH_` environment prefix, the `dsh` plugin manifest key, `~/.dsh`, prose, and artwork — without changing what any of it does.

The rename could not be a blind substitution. `dsh` occurs inside ordinary words (`handshake`, `headSha`, `CardShell`, `spreadsheet`), and `deepseek` names two different things: this harness, and the third-party model provider it integrates with.

## Decision

**DeepSeek the provider stays.** `llm-deepseek`, `web-search-deepseek`, the `deepseek-official` provider route, `DEEPSEEK_API_KEY`, `api.deepseek.com`, and the DeepSeek model ids name an external service. Renaming them would break the integration, so the rename covers only the harness's own identity. The same applies to the vendored packages' upstream provenance URLs in [THIRD_PARTY_NOTICES.md](../../../../THIRD_PARTY_NOTICES.md), which must stay accurate to be attribution at all, and to references to upstream issues and pull requests, which keep pointing at the upstream repository so they still resolve.

**`dsh` is renamed only as a whole identifier segment.** A segment is bounded by a separator or a case change: `dsh-`, `dsh_`, `DSH_`, `Dsh`, `dsh` before an uppercase letter, and bare `dsh` at a word boundary. Word-internal `dsh` is left alone, which is what keeps `handshake` intact.

DeepSeek HTTP extensions retain the upstream wire names `x-dsh-user-id`, `x-dsh-session-id`, `x-dsh-compact`, `dsh_plugin_packages`, and `dsh_session_log`. These identify provider protocol fields, not Alego commands or configuration. The user-agent product and package identities still name Alego.

**The scope names the company and the prefix names the product**, exactly as upstream had it. `@deepseek-ai/dsh-<name>` became `@singula-ai/alego-<name>`, and the CLI package — upstream's bare `@deepseek-ai/dsh` — became the bare `@singula-ai/alego`, so the published entry point is `npx @singula-ai/alego web`. Singula AI ships more than one product, so the scope belongs to the company and the product lives in the package name.

**Packages upstream published without the product prefix keep none here.** The rescoped Cordis vendor tree (`@singula-ai/cordis`, `@singula-ai/schemastery`, `@singula-ai/cosmokit`, `@singula-ai/cordis-plugin-*`), the Landlock addon family, and the website carry no `alego-` prefix, because they are not the product. That is what lets one prefix test separate the MIT product from everything else sharing the scope.

**Brand artwork was replaced, not renamed.** The DeepSeek whale and wordmark were shipped as literal SVG path data in `FishLogo.tsx`, `BrandWordmark.tsx`, both favicons, `wordmark.svg`, and a badge PNG. A fork may not ship them under its own name, so `AlegoMark` draws an original studded-block mark and the wordmark sets the name as live text instead of baked letterforms.

## What the product name still owns

The scope names the company; nothing the user types changed with it. The command stays `alego`, the environment prefix stays `ALEGO_`, the per-user directory stays `~/.alego`, the plugin manifest key stays `alego`, CSS custom properties stay `--alego-*`, and the JSDoc scan tag stays `@alegoScopeScan`. Third-party plugins are discovered as `alego-plugin-*` under the [`alego-plugin`](https://github.com/topics/alego-plugin) topic. npm package names are the one surface carrying the company name, which keeps the plugin ecosystem keyed on the product it extends.

## Upstream synchronization

The source baseline is [deepseek-ai/deepseek-harness at `d347e703908d0406b7a7ef80e3a0e594d86b2215`](https://github.com/deepseek-ai/deepseek-harness/commit/d347e703908d0406b7a7ef80e3a0e594d86b2215), version `0.1.3-alpha.1`. Imports include every tracked upstream file and remove obsolete source paths; naming, brand artwork, and repository targets are the fork's changes. Upstream owns runtime behavior, session migrations, package layout, and test structure. The source installer remains an Alego distribution convenience.

Existing archived triplets retain their exact bytes and seals. Upstream adds new triplets without modifying old ones; new imports receive the same brand mapping before their first Alego seal. Neither binary images nor opaque encoded data are subject to text replacement. Source files containing literal NUL test inputs still receive identifier updates.

The sidebar and hero use the same Alego block mark. The hero retains the upstream slot and reduced-motion-aware hover animation, with block artwork replacing the whale's path morph. GitHub source links and push workflows target `singula-ai/alego` on `main`; required CI uses hosted runners available to this repository. Cloudflare previews require the repository's explicit `ALEGO_CLOUDFLARE_PREVIEW_ENABLED` opt-in.

Self-hosted standby drills require `ALEGO_SELF_HOSTED_STANDBY_ENABLED`; the repository has no configured standby runners. The upstream-only CDN publication record is archived with its original infrastructure identities. Local validation requires explicit Vue resolution for the documentation build and disposal of the subagent-list test contexts before removing their session directories; neither changes application behavior.

The E2E workflow's opt-in `record_brand_demo` input selects the existing real-host, real-model first-send smoke and uploads empty, typed, and completed frames from one isolated run. Ordinary runs retain the full E2E suite. The capture waits for the durable Assistant response and its exact rendered text, not the prompt's echoed marker. The UI-copy gate permits the literal `alego` wordmark across locales but still rejects untranslated phrases containing it.

## Alternatives considered

**Scope by product (`@alego/<name>`, CLI `@alego/cli`).** Shipped first, then replaced. It is shorter at the import site and matches how single-product tool ecosystems name themselves, but it collapsed the company and product into one token. Three gates had been reading that split to tell the MIT product from the rescoped vendor tree, the BSD-3-Clause Landlock addon, and the unpublished website, and each had to be rewritten to identify packages by directory instead; restoring the prefix reverted all three to upstream's logic. It also named the CLI after its tier rather than the product — `npx @alego/cli web` — and with more than one Singula AI product, a company scope is also one npm organization to own, secure, and audit rather than one per product.

**Rename the DeepSeek provider packages too.** Rejected: they name a third-party API, not this product, and the rename would have changed behavior — the opposite of the goal.

## Consequences

The product uses Alego identity while DeepSeek integrations retain their external service names. The upstream [built CLI tests](../../../../apps/cli/tests/built-bin.e2e.ts) exercise custom profiles and plugin installation through the published `alego` entry point. Recorded-session scenarios retain the upstream [snapshot layout](../../../../snapshots/AGENTS.md) and exercise the rebranded profiles, tool schemas, and SDK projections.

Because the naming structure mirrors upstream one-for-one, [`verify-alego-package-licenses`](../../../../scripts/verify-alego-package-licenses.ts), [`verify-client-packages`](../../../../scripts/verify-client-packages.ts), and [`package-graph`](../../../../scripts/package-graph.ts) keep upstream's logic with only the two brand tokens substituted, so a future upstream sync has no naming divergence to reconcile.

The cost is length: `@singula-ai/alego-client-ui-settings-plugin-inventory` at every import site, and the company name typed to reach the product.

Package names, the command, environment variables, manifest fields, and home directory consistently use Alego. Upstream's released-session migration rules remain intact; no compatibility aliases for the DeepSeek Harness product identity are introduced.
