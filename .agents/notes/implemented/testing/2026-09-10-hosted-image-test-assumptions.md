# Agent Note: Hosted-image assumptions in the coverage suite

Status: implemented

English | [中文](2026-09-10-hosted-image-test-assumptions.zh.md)

## Problem

The [failover leg](../process/2026-09-09-blacksmith-failover-leg.md) runs this suite on pools this repository does not own — Blacksmith's ephemeral images, and the in-house `vm-backup` and `alego-win-ci` standbys. On the hosted image the coverage lanes failed on host properties their cases never named: whether the host offered a usable user-systemd scope decided which containment a mocked PTY exit raced; the wall-clock grace a managed scope needed before it could take a `SIGKILL` was below what a loaded image provides; a starved reader coalesced writes the illegal-UTF-8 residual cases assumed arrived as separate chunks; and a Windows Server image refuses `CoCreateInstance(CLSID_FileOpenDialog)` outright.

## Decision

Every case names the host property it depends on, so the same revision reports the same verdict on the in-house pool and on a hosted image.

Terminal cases that drive a mocked PTY exit pin the containment they need (`internals = { platform: 'darwin' }` in `packages/subprocess/subprocess-local/tests/local.spec.ts`); under the host's native scope the mocked exit races the scope bootstrap and fails as `terminal scope exited before its bootstrap consumed the launch request`. Mocking the `linux-scope.ts` probes to reach the same path was removed: the platform pin skips both probes, so the mock could not change the selected path.

`disposal contains a spawn-failure rejection that races teardown` asserts the settlement contract instead of one winner of the race: a bootstrap that published its pre-exec failure rejects with that failure, and a teardown that stopped the bootstrap first settles as the requested `SIGTERM`. Only the Linux scope records the stopped arm, because the win32 job owner turns a cancelled start into a rejection and the fallback launcher rejects the missing directory.

`plugin-config dispose graces reach the real ACP run` configures 5000ms dispose graces. At 150ms the hosted image escalated while the scope could not take the signal — `systemctl` failed the kill (`Failed to send signal SIGKILL to auxiliary processes: Invalid argument`) and the teardown reported a failure the configuration never asked for. Its mock refuses stdin EOF and `SIGTERM` by design, so the case waits out both graces (~10s) and carries a 30s case budget, above the 5000ms default the local unit entry grants.

Both illegal-UTF-8 residual cases in `packages/experimental/code-runtime-python/tests/runtime.spec.ts` pace their writes with `time.sleep(0.001)`: `os.sched_yield()` lets a loaded reader coalesce the writes into one chunk, and the coalesced chunk is what the wrapped `Buffer.concat` measures (the hosted image measured 2563 against the 2048 bound with a correct implementation). Their payloads stay above that bound — 3200 bytes for the `0xFF` case and 1100 `ED A0 80` sequences, 3300 raw bytes, for the CESU-8 case, past the 3072-byte budget a raw-byte undercount reaches — so the undercount still flushes above 2048. Each carries a 20s case budget for the paced writes plus the interpreter start.

The stray-output sealing test in `packages/experimental/code-runtime-python/tests/stray-fragments.spec.ts` keeps a real Python child but splits its stdout reads into single-byte events. OS pipe coalescing cannot guarantee the 1024 fragments needed to seal a block: [run 34465259316](https://github.com/singula-ai/alego/actions/runs/34465259316) passed all assertions but missed that branch. The controlled reads exercise repeated sealing and the final newline merge; exact output and bounded copy volume detect dropped bytes and repeated prefix copies.

The Linux coverage lane grants `ALEGO_COVERAGE_TEST_TIMEOUT_MS: '90000'`, matching the Windows coverage lane, because the disposal cases in `subprocess-local` and `bash-sandbox` exceed the 5000ms default when the lane's partitions, workers, and sibling gates share one host.

The Windows folder-dialog smoke probes `CoCreateInstance(CLSID_FileOpenDialog)` through PowerShell instead of gating on `process.platform`. An image that answers `CLASS_E_CLASSNOTAVAILABLE` (0x80040111) runs the clean-rejection case and skips the real-dialog case, so `win32-dialog.ts` keeps its file coverage without a host that can open a dialog. Every exception from that activation reads as refusal, so a host failing the probe for another reason only loses the real-dialog case; a probe that cannot run at all keeps the win32 assumption.

## Alternatives considered

**Excluding the coverage lanes from the hosted leg.** Rejected: the leg exists to run the same suite on another pool, and the failures named real host dependencies rather than a suite the pool cannot support.

**Raising only the lane's per-test budget.** Rejected: a wider budget does not change the cases whose cost or behaviour is deterministic — a trapped ACP child still waits out both graces, and a coalesced reader still inflates the measured peak.

**Keeping the `linux-scope.ts` probe mocks.** Rejected as inert: the platform pin selects the fallback path before either probe is called, so the mock changed no execution path.

**Cutting the illegal-UTF-8 payloads to keep the cases fast.** Rejected: below the 2048 bound the assertion can no longer fail for the undercount it names, which leaves the regression unguarded.

## Consequences

The suite's verdict no longer depends on which pool served the lane, at the cost of fixtures pinned to one containment choice: the `linux-scope` and win32-job paths keep their own dedicated cases instead of being reached through these ones. The ACP dispose case costs about 10s of wall clock per run and each residual case about 3.5s, all deterministic rather than host-paced. Hosted-image evidence: [run 34449848541](https://github.com/singula-ai/alego/actions/runs/34449848541) failed on these cases, [run 34457655892](https://github.com/singula-ai/alego/actions/runs/34457655892) is green with this diff plus the 90000ms lane budget, and `windows node 24 / coverage` is green on five consecutive hosted runs, where the probe reports the refusal (`clsid-probe=refused`).
