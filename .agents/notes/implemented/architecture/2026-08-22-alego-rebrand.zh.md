# Agent Note: 将 harness 品牌重塑为 Alego

Status: implemented

[English](2026-08-22-alego-rebrand.md) | 中文

## Problem

本仓库 fork 自 DeepSeek Harness，并以自己的名字发布。每一处承载品牌的表面都必须迁移——npm scope 与包名、`dsh` 命令、`DSH_` 环境变量前缀、`dsh` 插件 manifest（元数据清单）键、`~/.dsh`、散文与图形素材——同时不改变它们的任何行为。

这次重命名不能是无差别替换。`dsh` 会出现在普通英文单词内部（`handshake`、`headSha`、`CardShell`、`spreadsheet`），而 `deepseek` 指代两件不同的事物：本 harness，以及它所对接的第三方模型提供方。

## Decision

**DeepSeek 作为提供方保持不变。** `llm-deepseek`、`web-search-deepseek`、`deepseek-official` 提供方路由、`DEEPSEEK_API_KEY`、`api.deepseek.com` 以及各 DeepSeek 模型 ID 命名的是一项外部服务。重命名它们会破坏该集成，因此本次重命名只覆盖 harness 自身的身份标识。同样的原则适用于 [THIRD_PARTY_NOTICES.md](../../../../THIRD_PARTY_NOTICES.md) 中 vendored 包的上游出处 URL——它们必须保持准确才称得上是署名——以及指向上游 issue 与 pull request 的引用，这些继续指向上游仓库，才能正常解析。

**`dsh` 仅在作为完整标识符片段时才被重命名。** 片段由分隔符或大小写变化界定：`dsh-`、`dsh_`、`DSH_`、`Dsh`、`dsh` 后接大写字母，以及处于单词边界的裸 `dsh`。位于单词内部的 `dsh` 保持不变，这正是 `handshake` 得以完好的原因。

**npm scope 已承载产品名，因此包名前缀被去掉。** `@deepseek-ai/dsh-<name>` 变为 `@alego/<name>`，CLI 包 `@deepseek-ai/dsh` 变为 `@alego/cli`。

**品牌图形是被替换，而不是被重命名。** DeepSeek 的鲸鱼与字标以字面 SVG 路径数据的形式存在于 `FishLogo.tsx`、`BrandWordmark.tsx`、两个 favicon、`wordmark.svg` 以及一个徽章 PNG 中。fork 不得以自己的名义分发这些素材，因此 `AlegoMark` 绘制了一枚原创的凸点积木标志，字标也改用实时文本渲染名称，而非烘焙的字形轮廓。

## 包身份由目录界定，而非前缀

上游用 `dsh-` 前缀把产品与共享 `@deepseek-ai` scope 的其他东西区分开：重新 scope 的 Cordis vendor 包、采用 BSD-3-Clause 的 Landlock addon，以及不发布的 website。把前缀并入 scope 后，这个信号消失了，而此前有三道门禁依赖它：

- [`verify-alego-package-licenses`](../../../../scripts/verify-alego-package-licenses.ts) 现在按 manifest 路径（根目录、`apps/*`、`packages/*/*`）而非名称前缀来选取 MIT 产品包。
- [`verify-client-packages`](../../../../scripts/verify-client-packages.ts) 从 `vendor/*/package.json` 读取重新 scope 后的包名，并像以往一样把它们视为普通第三方依赖；Cordis 依政策仍是 peer 关系。
- [`package-graph`](../../../../scripts/package-graph.ts) 只保留图成员之间的边，因此对 vendored Cordis 的 peer 依赖不再表现为无法满足的节点。

目录是更真实的判别依据：它才是这些树之间的实际区别，并且不依赖某项命名约定继续成立。

## 冻结的归档被重新封存

`archived/manifest.json` 是只追加的，以保证归档 Agent Note 不可更改。而仓库范围的重命名必然会重写它们的文本，因此该 manifest 被整体重新封存——这是冻结机制未曾预期的唯一一处改动。这些文件中除品牌 token 外没有任何变化，也没有任何归档决策被修改。

## Alternatives considered

**保留产品前缀（`@alego/alego-<name>`）。** 这是对上游结构的直接镜像，可以无代价地保住前缀信号。否决理由：它为了三道门禁而在每个 specifier 中重复品牌名，而这些门禁现在采用的目录规则本就与命名无关。

**同时重命名 DeepSeek 提供方相关的包。** 否决理由：它们命名的是第三方 API 而非本产品，重命名会改变行为——与目标恰好相反。

## Consequences

harness 中已不含任何 DeepSeek 品牌 token，同时每一处 DeepSeek 集成仍能对真实 API 正常工作。插件面的形态没有任何变化：[examples/hello-world](../../../../examples/hello-world/README.zh.md) 从 `cordis.yml` 挂载一个插件，其无密钥 smoke 断言该工具已注册、出现在模型可见的 schema 列表中、可以执行，并在插件 fiber 被销毁时撤回。

代价是 scope 不再表明一个包属于哪棵树。三道门禁通过改读目录吸收了这一点，但今后任何想区分「产品，而非 vendored 框架」的检查，都必须自行作出同样的判断，而不能靠匹配前缀。

包名、`alego` 命令、`ALEGO_*`、`alego` manifest 键与 `~/.alego` 一次性全部改变，因此任何依据旧名写下的磁盘状态、环境变量或组合都无法再被读取。[AGENTS.md](../../../../AGENTS.md) 中的预发布立场正允许这样做，且不存在需要迁移的外部消费方。
