# Agent Note: 将 harness 品牌重塑为 Alego

Status: implemented

[English](2026-08-22-alego-rebrand.md) | 中文

## Problem

本仓库 fork 自 DeepSeek Harness，以自己的名字发布，发布方为 Singula AI。每一处承载品牌的表面都必须迁移——npm scope 与包名、`dsh` 命令、`DSH_` 环境变量前缀、`dsh` 插件 manifest（元数据清单）键、`~/.dsh`、散文与图形素材——同时不改变它们的任何行为。

这次重命名不能是无差别替换。`dsh` 会出现在普通英文单词内部（`handshake`、`headSha`、`CardShell`、`spreadsheet`），而 `deepseek` 指代两件不同的事物：本 harness，以及它所对接的第三方模型提供方。

## Decision

**DeepSeek 作为提供方保持不变。** `llm-deepseek`、`web-search-deepseek`、`deepseek-official` 提供方路由、`DEEPSEEK_API_KEY`、`api.deepseek.com` 以及各 DeepSeek 模型 ID 命名的是一项外部服务。重命名它们会破坏该集成，因此本次重命名只覆盖 harness 自身的身份标识。同样的原则适用于 [THIRD_PARTY_NOTICES.md](../../../../THIRD_PARTY_NOTICES.md) 中 vendored 包的上游出处 URL——它们必须保持准确才称得上是署名——以及指向上游 issue 与 pull request 的引用，这些继续指向上游仓库，才能正常解析。

**`dsh` 仅在作为完整标识符片段时才被重命名。** 片段由分隔符或大小写变化界定：`dsh-`、`dsh_`、`DSH_`、`Dsh`、`dsh` 后接大写字母，以及处于单词边界的裸 `dsh`。位于单词内部的 `dsh` 保持不变，这正是 `handshake` 得以完好的原因。

DeepSeek HTTP 扩展保留上游协议名称 `x-deepseek-harness-user-id`、`x-deepseek-harness-session-id`、`x-deepseek-harness-compact`、`dsh_plugin_packages` 和 `dsh_session_log`。它们标识提供方协议字段，而非 Alego 命令或配置。User-Agent 中的产品名和包身份仍使用 Alego。

**scope 命名公司，前缀命名产品**，与上游的做法完全一致。`@deepseek-ai/dsh-<name>` 变为 `@singula-ai/alego-<name>`，而 CLI 包——上游的裸 `@deepseek-ai/dsh`——变为裸 `@singula-ai/alego`，因此对外发布的入口是 `npx @singula-ai/alego web`。Singula AI 拥有不止一个产品，所以 scope 归公司所有，产品名落在包名里。

**上游未加产品前缀的包，这里同样不加。** 重新 scope 的 Cordis vendor 树（`@singula-ai/cordis`、`@singula-ai/schemastery`、`@singula-ai/cosmokit`、`@singula-ai/cordis-plugin-*`）、Landlock addon 家族与 website 都不带 `alego-` 前缀，因为它们不是产品。正是这一点使得一次前缀判断就能把 MIT 产品与共享同一 scope 的其他东西区分开。

**品牌图形是被替换，而不是被重命名。** DeepSeek 的鲸鱼与字标以字面 SVG 路径数据的形式存在于 `FishLogo.tsx`、`BrandWordmark.tsx`、两个 favicon、`wordmark.svg` 以及一个徽章 PNG 中。fork 不得以自己的名义分发这些素材，因此 `AlegoMark` 绘制了一枚原创的凸点积木标志，字标也改用实时文本渲染名称，而非烘焙的字形轮廓。

## What the product name still owns

scope 命名的是公司，但用户实际输入的一切都没有随之改变。命令仍是 `alego`，环境变量前缀仍是 `ALEGO_`，用户级目录仍是 `~/.alego`，插件 manifest 键仍是 `alego`，CSS 自定义属性仍是 `--alego-*`，JSDoc 扫描标签仍是 `@alegoScopeScan`。第三方插件以 `alego-plugin-*` 的形式、通过 [`alego-plugin`](https://github.com/topics/alego-plugin) 话题被发现。npm 包名是唯一携带公司名的表面，这让插件生态继续以它所扩展的产品为锚。

## Upstream synchronization

源码基线为 [deepseek-ai/deepseek-harness 的 `c291e7961a515f6d7af9304e7fd1d257929aef26`](https://github.com/deepseek-ai/deepseek-harness/commit/c291e7961a515f6d7af9304e7fd1d257929aef26)，版本为 `0.1.5-rc.2`。导入包含上游的每个受跟踪源码路径，并移除过时源码路径。运行时行为、会话迁移、包布局和测试结构由上游定义；fork 负责产品命名、品牌图形、仓库目标及其源码安装脚本。

现有归档三件套保留逐字节内容及封存哈希。新导入的上游归档文件在首次 Alego 封存前应用品牌映射。二进制图片和不透明编码数据不参与文本替换。包含字面 NUL 测试输入的源文件仍须更新标识符。

侧栏和首屏使用相同的 Alego 积木标志。首屏将本地化的彩虹 ALEGO 标题与上游的预览徽章及遵循减少动画偏好的悬停动画组合。浏览器标题、npm 和 Python 包、桌面资源、插件 manifest 以及发布产物名称均使用 Alego 身份。

GitHub 源码链接和 push 工作流指向 `singula-ai/alego` 的 `main`。必需 CI 使用可用的托管 runner。Cloudflare 预览要求启用 `ALEGO_CLOUDFLARE_PREVIEW_ENABLED`；自托管备用演练要求启用 `ALEGO_SELF_HOSTED_STANDBY_ENABLED`。Issue 和 Project 自动化仅在仓库启用 Issues 时申请 App token。托管 runner 的覆盖率检查使用两个分区，Linux 消费端任务每次运行一个门禁，同时保留各门禁内部的并行执行。

桌面打包和上传必须通过 `DOWNLOAD_TEST_ORIGIN` 或 `DOWNLOAD_PROD_ORIGIN` 提供所选环境的 HTTPS origin。两者均使用 `_/alego/desktop/stable/<target>/`；Alego 构建不会默认连接 DeepSeek 的下载服务器。现有更新器、签名、公证、COS 上传和平台选择机制保持完整。

此分支保留终端启动检查，在接受输入前等待受控的 PowerShell 提示符。测试夹具通过调用已获准执行和中止信号来同步 Python 绑定的延迟完成，并将浏览器临时根目录转换为规范路径，避免 macOS 路径别名改变 Vite 资源名称。

E2E 工作流的可选 `record_brand_demo` 输入从隔离状态捕获真实 Host、真实模型的首轮发送流程。普通运行保留完整 E2E 套件。UI 文案门禁允许各语言共用 Alego 字标，但拒绝包含它的未翻译短语。

## Alternatives considered

**按产品划分 scope（`@alego/<name>`，CLI 为 `@alego/cli`）。** 先落地、随后被替换。它在 import 处更短，也贴合单产品工具生态的命名习惯，但它把公司与产品压缩成了一个 token。此前有三道门禁依赖这一区分来把 MIT 产品与重新 scope 的 vendor 树、采用 BSD-3-Clause 的 Landlock addon 以及不发布的 website 分开，它们都不得不改为按目录识别包；恢复前缀后，这三处全部回退为上游的逻辑。它还让 CLI 以所在层级而非产品命名——`npx @alego/cli web`——并且在 Singula AI 拥有多个产品的情况下，公司 scope 意味着只需拥有、保护并审计一个 npm organization，而不是每个产品一个。

**同时重命名 DeepSeek 提供方相关的包。** 否决理由：它们命名的是第三方 API 而非本产品，重命名会改变行为——与目标恰好相反。

## Consequences

产品使用 Alego 身份，而 DeepSeek 集成保留其外部服务名称。上游的[已构建 CLI 测试](../../../../apps/cli/tests/built-bin.e2e.ts)通过发布的 `alego` 入口验证自定义 profile 和插件安装。录制会话场景保留上游[快照布局](../../../../snapshots/AGENTS.md)，验证重命名后的 profile、工具 schema 和 SDK 投影。

由于命名结构与上游一一对应，[`verify-alego-package-licenses`](../../../../scripts/verify-alego-package-licenses.ts)、[`verify-client-packages`](../../../../scripts/verify-client-packages.ts) 与 [`package-graph`](../../../../scripts/package-graph.ts) 保留了上游的逻辑，只替换了两个品牌 token，因此将来与上游同步时不存在需要调和的命名分歧。

代价是长度：每个 import 处都要写 `@singula-ai/alego-client-ui-settings-plugin-inventory`，并且要输入公司名才能触达产品。

包名、命令、环境变量、manifest 字段和主目录统一使用 Alego。上游已发布会话的迁移规则保持完整；不引入 DeepSeek Harness 产品身份的兼容别名。
