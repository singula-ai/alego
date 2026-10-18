---
description: "记录持久化类型更改及其兼容性确认。"
kind: persistence-change
---

# 2026-10-05-working-directory-attribution

[English](2026-10-05-working-directory-attribution.md) | 中文

## 概述

新增由工作目录组件拥有的通知来源标记。

## 目录

- [声明](#declaration)
- [兼容性](#compatibility)
- [验证](#verification)
- [开发备注](#dev-note)

<a id="declaration"></a>
## 声明

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
## 兼容性

已有记录仍然有效。新增的 working-directory 来源种类只提供来源标记；已声明的来源策略保留未知标记而不解释其含义。Session 格式保持不变。

<a id="verification"></a>
## 验证

pnpm exec vitest run packages/session/working-directory/tests packages/shell/tool-bash/tests/tools.spec.ts packages/shell/tool-pwsh/tests/tools.spec.ts packages/subagent/subagent/tests/schedule-tools.spec.ts：5 个文件、207 个测试通过。

<a id="dev-note"></a>
## 开发备注

无。
