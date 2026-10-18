---
description: "Records a persistence type transition and its compatibility acknowledgement."
kind: persistence-change
---

# 2026-10-13-user-rpc-principal

English | [中文](2026-10-13-user-rpc-principal.zh.md)

## Summary

Adds an optional principal to the user-rpc message source for prompts submitted by a caller other than the owner.

## Table of Contents

- [Declaration](#declaration)
- [Compatibility](#compatibility)
- [Verification](#verification)
- [Dev Note](#dev-note)

<a id="declaration"></a>
## Declaration

```yaml persistence-change
schemaVersion: 1
id: 2026-10-13-user-rpc-principal
baseline: false
changes:
  - root: "event:agent/inbox/spliced"
    previous: "2026-10-05-working-directory-attribution"
    after: "eb4f40f0cc018cf73ffb280442b881f3f1005ed9b12eee30746c3720da5406e2"
    decision: same-version
  - root: "event:developer/message"
    previous: "2026-10-05-working-directory-attribution"
    after: "36fbac1f486e5191878544c78ef522163904883bb52b0298c57fbf0f5be291fd"
    decision: same-version
  - root: "event:session/title-llm-request"
    previous: "2026-10-07-title-reasoning-effort"
    after: "dd5ee70e476a8d0c241df3e7417a7d67b8a6b658a6ed0d1320e4f2371b181f4c"
    decision: same-version
  - root: "event:user/message"
    previous: "2026-10-05-working-directory-attribution"
    after: "42b84cce02f87ed1414434afcc8865d764d8213bec8806fe81706df986249a69"
    decision: same-version
```

<a id="compatibility"></a>
## Compatibility

Owner prompts omit the field, so their sources and every existing Session log are unchanged; an absent principal means the owner. A reader that predates the field ignores it and treats the message as an ordinary user message, because the kind stays 'user'. A current reader of an older log finds no principal and treats every message as the owner's. The field is not part of any model request: provider adapters read only the model-visible message content. SESSION_FORMAT_VERSION does not change.

<a id="verification"></a>
## Verification

pnpm exec vitest run packages/api/session-controller/tests/remote-access.host.spec.ts packages/subagent/subagent/tests/control.spec.ts packages/api/session-controller/tests/session-cold.host.spec.ts: non-owner prompts persist source.principal in agent/inbox/spliced, owner and existing time-zone sources stay byte-identical; all tests passed.

<a id="dev-note"></a>
## Dev Note

None.
