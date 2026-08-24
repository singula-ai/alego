# Agent Note: Rate-limited npm publication recovers by re-running, never re-packing

Status: implemented

English | [中文](2026-08-24-npm-publish-rate-limit-recovery.zh.md)

## Problem

The first alego publication hit the registry's meter on new-package creation: after 25 new packages in one day across the vendor, native, and alego sequences, every further publish answered `E429 rate limited exceeded` for hours, from CI and from a residential connection alike, so the limit follows the account rather than request rate, client version, or network. The publish step's retry ladder waited 2–8 seconds while npm's own in-client retries had already waited about a minute per invocation, so one metering window failed the run after 13 of 227 members. Recovery then met a second wall: a fresh dispatch re-packs, and this repository's build is not byte-reproducible — two packs of one commit differed by 18 bytes — so the integrity guard correctly refused to continue over the members the first run had published.

## Decision

`publishTarball` keeps two independent retry budgets: `E429` waits on its own ladder of five doubling backoffs from one minute (~31 minutes in total, long enough to ride out metering while a hard quota still fails within the job), and every other transient code keeps the seconds-scale ladder that answers `E409` packument settling. The judgement is the exported pure `publishRetryDirective` in [scripts/release/publish.ts](../../../../scripts/release/publish.ts), covered by [scripts/release/publish.spec.ts](../../../../scripts/release/publish.spec.ts).

Recovery from a partial publication re-runs the failed publish job of the original workflow run, because that reuses the run's packed artifact: already-published members skip on identical integrity, which the incident proved across four such re-runs. A fresh dispatch is never a resume — it re-packs, and until reproducibility is fixed the first dispatch's artifact is the release's only publishable bytes.

Registry verification after publishing reads `/{package}/{version}`: the packument endpoint serves long-lived cached 404s for names polled before they existed and reported nine live packages as absent.

## Alternatives considered

**Longer spacing between publishes (10–30 seconds).** Rejected: attempts 45–85 minutes apart still answered `E429` on their first PUT, so the meter is a count quota over a long window, not a request rate; spacing spends wall-clock without buying budget.

**Publishing from a different network.** Tried: a residential connection with the same token and the same artifact bytes answered the identical `E429`, ruling out keying on CI egress addresses.

**One in-job wait long enough for any window.** Rejected: a window of hours would idle a runner against the six-hour job ceiling, while re-running the publish job later resumes identically for free.

**Unpublishing the partial set to restart clean.** Unavailable: the registry refuses DELETE from a bypass-2FA token, and enabling account 2FA for an interactive unpublish failed in practice.

## Consequences

- A hard quota still fails a run after ~31 minutes on one member; the recovery is re-running that run's publish job once the window opens, and otherwise a registry support request (filed for the first release on 2026-08-24).
- Byte reproducibility remains unmeasured and unfixed; `packages/util/brand` is the smallest reproduction of the drift. Fix it before any release whose re-pack must equal a prior pack.
- 13 members remain published at 0.1.1 with no entry package, because that family's completion was abandoned with its history; the first complete release is 0.1.2. They cannot be unpublished: the publishing token bypasses 2FA and the registry refuses DELETE from such tokens.
