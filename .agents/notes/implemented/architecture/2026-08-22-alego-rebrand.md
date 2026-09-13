# Agent Note: Rebranding the harness to Alego

Status: implemented

English | [中文](2026-08-22-alego-rebrand.zh.md)

## Problem

This repository is a fork of DeepSeek Harness that ships under its own name, published by Singula AI. Every brand-bearing surface had to move — npm scope and package names, the `dsh` command, the `DSH_` environment prefix, the `dsh` plugin manifest key, `~/.dsh`, prose, and artwork — without changing what any of it does.

The rename could not be a blind substitution. `dsh` occurs inside ordinary words (`handshake`, `headSha`, `CardShell`, `spreadsheet`), and `deepseek` names two different things: this harness, and the third-party model provider it integrates with.

## Decision

**DeepSeek the provider stays.** `llm-deepseek`, `web-search-deepseek`, the `deepseek-official` provider route, `DEEPSEEK_API_KEY`, `api.deepseek.com`, and the DeepSeek model ids name an external service. Renaming them would break the integration, so the rename covers only the harness's own identity. The same applies to the vendored packages' upstream provenance URLs in [THIRD_PARTY_NOTICES.md](../../../../THIRD_PARTY_NOTICES.md), which must stay accurate to be attribution at all, and to references to upstream issues and pull requests, which keep pointing at the upstream repository so they still resolve.

**`dsh` is renamed only as a whole identifier segment.** A segment is bounded by a separator or a case change: `dsh-`, `dsh_`, `DSH_`, `Dsh`, `dsh` before an uppercase letter, and bare `dsh` at a word boundary. Word-internal `dsh` is left alone, which is what keeps `handshake` intact.

DeepSeek HTTP extensions retain the upstream wire names `x-deepseek-harness-user-id`, `x-deepseek-harness-session-id`, `x-deepseek-harness-compact`, `dsh_plugin_packages`, and `dsh_session_log`. These identify provider protocol fields, not Alego commands or configuration. The user-agent product and package identities still name Alego.

**The scope names the company and the prefix names the product**, exactly as upstream had it. `@deepseek-ai/dsh-<name>` became `@singula-ai/alego-<name>`, and the CLI package — upstream's bare `@deepseek-ai/dsh` — became the bare `@singula-ai/alego`, so the published entry point is `npx @singula-ai/alego web`. Singula AI ships more than one product, so the scope belongs to the company and the product lives in the package name.

**Packages upstream published without the product prefix keep none here.** The rescoped Cordis vendor tree (`@singula-ai/cordis`, `@singula-ai/schemastery`, `@singula-ai/cosmokit`, `@singula-ai/cordis-plugin-*`), the Landlock addon family, and the website carry no `alego-` prefix, because they are not the product. That is what lets one prefix test separate the MIT product from everything else sharing the scope.

**Brand artwork was replaced, not renamed.** The DeepSeek whale and wordmark were shipped as literal SVG path data in `FishLogo.tsx`, `BrandWordmark.tsx`, both favicons, `wordmark.svg`, and a badge PNG. A fork may not ship them under its own name, so `AlegoMark` draws an original studded-block mark and the wordmark sets the name as live text instead of baked letterforms.

## What the product name still owns

The scope names the company; nothing the user types changed with it. The command stays `alego`, the environment prefix stays `ALEGO_`, the per-user directory stays `~/.alego`, the plugin manifest key stays `alego`, CSS custom properties stay `--alego-*`, and the JSDoc scan tag stays `@alegoScopeScan`. Third-party plugins are discovered as `alego-plugin-*` under the [`alego-plugin`](https://github.com/topics/alego-plugin) topic. npm package names are the one surface carrying the company name, which keeps the plugin ecosystem keyed on the product it extends.

## Upstream synchronization

The source baseline is [deepseek-ai/deepseek-harness at `c291e7961a515f6d7af9304e7fd1d257929aef26`](https://github.com/deepseek-ai/deepseek-harness/commit/c291e7961a515f6d7af9304e7fd1d257929aef26), version `0.1.5-rc.2`. Imports include every tracked upstream source path and remove obsolete source paths. Upstream owns runtime behavior, session migrations, package layout, and test structure; the fork owns product naming, brand artwork, repository targets, and its source installer.

Existing archived triplets retain their exact bytes and seals. New upstream archive imports receive the brand mapping before their first Alego seal. Binary images and opaque encoded data are excluded from text replacement. Source files containing literal NUL test inputs still receive identifier updates.

The sidebar and hero use the same Alego block mark. The hero combines its locale-owned rainbow ALEGO headline with the upstream preview badge and reduced-motion-aware hover animation. Browser title, npm and Python packages, desktop resources, plugin manifests, and release artifact names use Alego identity.

GitHub source links and push workflows target `singula-ai/alego` on `main`. Required CI uses available hosted runners. Cloudflare previews require `ALEGO_CLOUDFLARE_PREVIEW_ENABLED`; self-hosted standby drills require `ALEGO_SELF_HOSTED_STANDBY_ENABLED`. Issue and Project automation requests App tokens only when the repository enables Issues. Coverage uses two partitions on hosted runners, and the Linux consumer job runs one gate at a time while retaining each gate's internal parallelism.

Desktop packaging and uploads require the selected HTTPS origin through `DOWNLOAD_TEST_ORIGIN` or `DOWNLOAD_PROD_ORIGIN`. Both use `_/alego/desktop/stable/<target>/`; no Alego build defaults to DeepSeek's download server. The existing updater, signing, notarization, COS upload, and platform selection mechanisms remain in place.

The fork retains the terminal startup check that waits for a controlled PowerShell prompt before accepting input. Test fixtures synchronize late Python binding completion on admission and abort, and canonicalize temporary browser roots so macOS path aliases do not change Vite asset names.

The E2E workflow's opt-in `record_brand_demo` input captures the real-host, real-model first-send flow from isolated state. Ordinary runs retain the complete E2E suite. The UI-copy gate permits the literal Alego wordmark across locales and rejects untranslated phrases containing it.

## Alternatives considered

**Scope by product (`@alego/<name>`, CLI `@alego/cli`).** Shipped first, then replaced. It is shorter at the import site and matches how single-product tool ecosystems name themselves, but it collapsed the company and product into one token. Three gates had been reading that split to tell the MIT product from the rescoped vendor tree, the BSD-3-Clause Landlock addon, and the unpublished website, and each had to be rewritten to identify packages by directory instead; restoring the prefix reverted all three to upstream's logic. It also named the CLI after its tier rather than the product — `npx @alego/cli web` — and with more than one Singula AI product, a company scope is also one npm organization to own, secure, and audit rather than one per product.

**Rename the DeepSeek provider packages too.** Rejected: they name a third-party API, not this product, and the rename would have changed behavior — the opposite of the goal.

## Consequences

The product uses Alego identity while DeepSeek integrations retain their external service names. The upstream [built CLI tests](../../../../apps/cli/tests/built-bin.e2e.ts) exercise custom profiles and plugin installation through the published `alego` entry point. Recorded-session scenarios retain the upstream [snapshot layout](../../../../snapshots/AGENTS.md) and exercise the rebranded profiles, tool schemas, and SDK projections.

Because the naming structure mirrors upstream one-for-one, [`verify-alego-package-licenses`](../../../../scripts/verify-alego-package-licenses.ts), [`verify-client-packages`](../../../../scripts/verify-client-packages.ts), and [`package-graph`](../../../../scripts/package-graph.ts) keep upstream's logic with only the two brand tokens substituted, so a future upstream sync has no naming divergence to reconcile.

The cost is length: `@singula-ai/alego-client-ui-settings-plugin-inventory` at every import site, and the company name typed to reach the product.

Package names, the command, environment variables, manifest fields, and home directory consistently use Alego. Upstream's released-session migration rules remain intact; no compatibility aliases for the DeepSeek Harness product identity are introduced.
