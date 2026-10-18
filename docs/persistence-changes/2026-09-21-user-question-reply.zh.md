---
description: "记录持久化类型更改及其兼容性确认。"
kind: persistence-change
---

# 2026-09-21-user-question-reply

[English](2026-09-21-user-question-reply.md) | 中文

## 概述

新增受限定的 user-question-reply 消息来源，将已继续的 ask_user_question 调用的迟到回答送入 agent inbox。

## 目录

- [声明](#declaration)
- [兼容性](#compatibility)
- [验证](#verification)
- [开发备注](#dev-note)

<a id="declaration"></a>
## 声明

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
## 兼容性

已有日志不含该来源，仍然有效。新来源是普通用户消息上的受限定归属；没有 alego-user-questions 的读取方保留消息，并从内容推导历史。只有 userQuestions projection 读取该来源，关闭指定的问题并记录答案。answer RPC 是唯一生产方，只写入 outcome answered；关闭 Client 面板不会持久化回复。不新增事件类型，也不改变 Session header。

<a id="verification"></a>
## 验证

pnpm exec vitest run packages/interaction/user-questions/tests packages/interaction/tool-ask-user/tests：81 个测试通过。projection、reply、view 和 process-group 的定向测试共 70 个通过。pnpm run typecheck 通过。pnpm run doc-sync 的 42 项检查全部通过，包括持久化历史和翻译配对。

<a id="dev-note"></a>
## 开发备注

无。
