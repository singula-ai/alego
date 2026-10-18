---
description: "记录持久化类型更改及其兼容性确认。"
kind: persistence-change
---

# 2026-10-13-user-rpc-principal

[English](2026-10-13-user-rpc-principal.md) | 中文

## 概述

为 owner 以外的调用方提交的 prompt，在 user-rpc 消息来源上增加可选的 principal。

## 目录

- [声明](#declaration)
- [兼容性](#compatibility)
- [验证](#verification)
- [开发备注](#dev-note)

<a id="declaration"></a>
## 声明

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
## 兼容性

owner 的 prompt 不写该字段，因此其来源与所有既有 Session 日志都不变；缺少 principal 即为 owner。早于该字段的读取方会忽略它，并因 kind 仍为 'user' 而把消息当作普通用户消息。当前读取方读取旧日志时找不到 principal，把每条消息都视为 owner 的消息。该字段不进入任何模型请求：provider 适配器只读取模型可见的消息内容。SESSION_FORMAT_VERSION 不变。

<a id="verification"></a>
## 验证

pnpm exec vitest run packages/api/session-controller/tests/remote-access.host.spec.ts packages/subagent/subagent/tests/control.spec.ts packages/api/session-controller/tests/session-cold.host.spec.ts：非 owner 的 prompt 在 agent/inbox/spliced 中持久化 source.principal，owner 与既有时区来源保持逐字节不变；全部测试通过。

<a id="dev-note"></a>
## 开发备注

无。
