# Agent Note: One-command source install through a PATH launcher

Status: implemented

English | [中文](2026-08-27-curl-source-install.zh.md)

## Problem

The repository documents `npx @singula-ai/alego web` as the front door, but the registry cannot yet serve it: the alego family publishes name-by-name under the registry's 25-new-names-per-day account limit, and until `@singula-ai/alego` itself lands the whole npm route resolves nothing. Running from source worked but took five manual steps, and "install this from GitHub" had no answer a README can hand to someone in one line.

## Decision

A root [`install.sh`](../../../../install.sh), run as `curl -fsSL https://raw.githubusercontent.com/singula-ai/alego/main/install.sh | bash`, performs the supported source setup end to end: verify `git` and the engines range (`^22.19.0 || >=24`), provide pnpm through `corepack enable` when absent so the `packageManager` pin decides the version, clone `--depth 1` into `ALEGO_SRC_DIR` (default `~/.alego-src`, deliberately not `~/.alego`, which the runtime owns), `pnpm install --frozen-lockfile`, full `pnpm run build`, and write a two-line launcher into `ALEGO_BIN_DIR` (default `~/.local/bin`) that execs `node <checkout>/apps/cli/lib/bin.js`. Re-running fetches the ref, runs `pnpm run clean` after the frozen install, and rebuilds; local edits inside the managed checkout are discarded on update, which the script announces. The clean step is required because `git reset --hard` keeps ignored build output: after upstream deleted `packages/settings/settings-file`, its stale `lib/types/index.js` still matched the tsdown workspace glob `packages/*/*` and failed the update's build on the removed `SettingsProvider` export. `ALEGO_REPO` and `ALEGO_REF` select fork and branch.

The global command is a written launcher rather than a package-manager link. `pnpm link --global` requires a configured global bin directory (`pnpm setup` / `PNPM_HOME`) and fails with `ERR_PNPM_NO_GLOBAL_BIN_DIR` on machines that never ran it, and `npm link` tries to install `apps/cli` in isolation, where its `workspace:^` ranges resolve nowhere. A launcher file depends only on `PATH`, and the script says so when the bin directory is not on it.

## Alternatives considered

**Waiting for the npm rollout.** The registry limit makes that days away, and the source path stays worth one command afterwards — for unreleased branches, forks, and contributors.

**`pnpm link --global` / `npm link`.** Rejected for the failure modes above; both also bind the command to package-manager global state that differs per machine, while a launcher is inspectable with `cat`.

**Installing prebuilt artifacts.** There is no released artifact channel to fetch from yet; the packed tarballs live behind the same registry limit.

## Consequences

- Linux and macOS only; Windows keeps the npm route and the manual checkout. The script is bash and never elevates: everything lands under `$HOME`.
- The launcher hardwires the checkout path, so moving `ALEGO_SRC_DIR` means re-running the installer.
- Every run rebuilds from scratch, because the clean step also removes the live packages' build output.
- Verified end to end on a clean prefix: anonymous clone of the public repository, frozen install, full build, and `alego --version` through the written launcher.
