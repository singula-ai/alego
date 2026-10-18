---
description: "Records a persistence type transition and its compatibility acknowledgement."
kind: persistence-change
---

# 2026-09-21-user-question-reply

English | [中文](2026-09-21-user-question-reply.zh.md)

## Summary

Adds a qualified user-question-reply message source for a late answer to a continued ask_user_question call.

## Table of Contents

- [Declaration](#declaration)
- [Compatibility](#compatibility)
- [Verification](#verification)
- [Dev Note](#dev-note)

<a id="declaration"></a>
## Declaration

```yaml persistence-change
schemaVersion: 1
id: 2026-09-21-user-question-reply
baseline: false
changes:
  - root: "event:agent/inbox/spliced"
    previous: "2026-09-16-session-format-v4"
    after: "b51cd6a19a15d655ed2559b61124658099f206bb61b81d888bf49cc53db1e730"
    decision: same-version
  - root: "event:developer/message"
    previous: "2026-09-16-session-format-v4"
    after: "683f3bce58d95fe2fa04a281220be6510da028940e80fd8648f359f97ec7a1fd"
    decision: same-version
  - root: "event:session/title-llm-request"
    previous: "2026-09-16-session-format-v4"
    after: "e0cb1def18dc4ec490270e057997ba33206c55399b228c2e887f719c0a4c9e5c"
    decision: same-version
  - root: "event:user/message"
    previous: "2026-09-16-session-format-v4"
    after: "cc3872fb5eb3070d24f97e4b9792c2d4c2e7e71c51f40254182243b6267c99b0"
    decision: same-version
```

<a id="compatibility"></a>
## Compatibility

Existing logs contain no such source and remain valid. The new source is qualified attribution on an ordinary user message; readers without alego-user-questions preserve the message and derive history from its content. Only the userQuestions projection reads this source to close the named question and record its answers. The answer RPC is its only producer and writes outcome answered; closing the Client panel persists no reply. No event type or Session header changes.

<a id="verification"></a>
## Verification

pnpm exec vitest run packages/interaction/user-questions/tests packages/interaction/tool-ask-user/tests: 81 tests passed. The focused projection, reply, view, and process-group suite passed 70 tests. pnpm run typecheck passed. pnpm run doc-sync passed all 42 gates, including persistence history and translation pairing.

<a id="dev-note"></a>
## Dev Note

None.
