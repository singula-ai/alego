# Agent Note：npm 发布触发限流后靠重跑恢复，绝不重新打包

Status: implemented

[English](2026-08-24-npm-publish-rate-limit-recovery.md) | 中文

## Problem

alego 的首次发布撞上了 registry 对新建包的计量：vendor、native、alego 三个序列一天内新建 25 个包之后，后续每次发布都持续数小时返回 `E429 rate limited exceeded`，CI 与家用网络无一例外，因此该限制跟随账号，而非请求速率、客户端版本或网络。发布步骤的重试梯子只等 2–8 秒，而 npm 客户端自身的内部重试每次调用已等约一分钟，于是一个计量窗口就让整次运行在 227 个成员发布到第 13 个时失败。恢复又撞上第二堵墙：重新 dispatch 会重新打包，而本仓库的构建并非字节可复现——同一 commit 的两次打包相差 18 字节——完整性门禁因此正确地拒绝越过首次运行已发布的成员继续。

## Decision

`publishTarball` 维护两条彼此独立的重试预算：`E429` 走自己的梯子，从一分钟起五次翻倍退避（合计约 31 分钟，足以熬过计量窗口，硬配额则仍在 job 时限内失败）；其余瞬态码保留应对 `E409` packument 落盘的秒级梯子。该判定是 [scripts/release/publish.ts](../../../../scripts/release/publish.ts) 中导出的纯函数 `publishRetryDirective`，由 [scripts/release/publish.spec.ts](../../../../scripts/release/publish.spec.ts) 覆盖。

部分发布的恢复方式是重跑原 workflow run 中失败的 publish job，因为重跑复用该 run 打好的 artifact：已发布成员按相同完整性跳过，事故中四次这样的重跑都证明了这一点。重新 dispatch 永远不是续传——它会重新打包；在可复现性修复之前，首次 dispatch 的 artifact 就是该次发布唯一可发布的字节。

发布后的 registry 校验读取 `/{package}/{version}`：packument 端点会对发布前查询过的包名返回长期缓存的 404，曾把九个已上线的包报告为不存在。

## Alternatives considered

**拉长发布间隔（10–30 秒）。**拒绝：间隔 45–85 分钟的多次尝试仍在首个 PUT 上收到 `E429`，说明计量是长窗口的计数配额而非请求速率；加大间隔只消耗墙钟时间，买不来配额。

**换网络发布。**试过：家用网络用同一 token、同一 artifact 字节收到完全相同的 `E429`，排除了按 CI 出口地址计费的可能。

**在 job 内等足任意窗口。**拒绝：窗口若以小时计，会让 runner 在六小时 job 上限内空转；稍后重跑 publish job 能免费获得同样的续传。

**下架已发布的部分成员重新开始。**不可用：registry 拒绝 bypass-2FA token 的 DELETE，而为交互式下架启用账号 2FA 在实践中未能完成。

## Consequences

- 硬配额仍会让一次运行在单个成员上耗约 31 分钟后失败；恢复手段是等窗口打开后重跑该 run 的 publish job，再不行就向 registry 提交支持工单（首次发布已于 2026-08-24 提交）。
- 字节可复现性仍未测量、未修复；`packages/util/brand` 是该漂移的最小复现。任何要求重打包与先前打包相等的发布之前必须先修复。
- 13 个成员滞留在 0.1.1 且没有入口包，因为该族的收尾随其历史一起被放弃；首个完整发布是 0.1.2。它们无法下架：发布用 token 绕过 2FA，而 registry 拒绝此类 token 的 DELETE。
