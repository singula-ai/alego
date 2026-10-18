---
description: "Records a persistence type transition and its compatibility acknowledgement."
kind: persistence-change
---

# 2026-10-05-working-directory-attribution

English | [中文](2026-10-05-working-directory-attribution.zh.md)

## Summary

Adds producer-owned working-directory notice attribution.

## Table of Contents

- [Declaration](#declaration)
- [Compatibility](#compatibility)
- [Verification](#verification)
- [Dev Note](#dev-note)

<a id="declaration"></a>
## Declaration

```yaml persistence-change
schemaVersion: 1
id: 2026-10-05-working-directory-attribution
baseline: false
changes:
  - root: "event:agent/inbox/spliced"
    previous: "2026-09-21-user-question-reply"
    after: "dad5b487fcd291178b037e3f42732bb2c375d4c537b685c6539895ed34686b3b"
    decision: same-version
  - root: "event:developer/message"
    previous: "2026-09-21-user-question-reply"
    after: "6168b74a4ea467e1291a4cf9ff32d56097f801323235aa62f186897e837f03bf"
    decision: same-version
  - root: "event:session/title-llm-request"
    previous: "2026-09-21-user-question-reply"
    after: "b26681e7ab29876ba03fe522471e52e367e3c188b70946395cddd3bac102bb82"
    decision: same-version
  - root: "event:user/message"
    previous: "2026-09-21-user-question-reply"
    after: "84e2ea76ff6829762d23a5a67d439f99cc61e9612ad4c37c5793812372501a08"
    decision: same-version
```

<a id="compatibility"></a>
## Compatibility

Existing records remain valid. The additive working-directory source kind is attribution only; the declared source policy preserves unknown attribution without interpreting it. The Session format remains unchanged.

<a id="verification"></a>
## Verification

pnpm exec vitest run packages/session/working-directory/tests packages/shell/tool-bash/tests/tools.spec.ts packages/shell/tool-pwsh/tests/tools.spec.ts packages/subagent/subagent/tests/schedule-tools.spec.ts: 5 files and 207 tests passed.

<a id="dev-note"></a>
## Dev Note

None.
