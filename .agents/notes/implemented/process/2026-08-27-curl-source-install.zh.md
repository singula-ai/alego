# Agent Note：经 PATH 启动器的一条命令源码安装

Status: implemented

[English](2026-08-27-curl-source-install.md) | 中文

## Problem

仓库文档以 `npx @singula-ai/alego web` 作为入口，但 registry 目前无法提供它：alego 族在 registry 每账号每天 25 个新包名的限制下逐名发布，在 `@singula-ai/alego` 本身落地之前，整条 npm 路径解析不到任何东西。从源码运行虽然可行，却需要五步手工操作，而"从 GitHub 装上它"没有一个 README 能一行递给别人的答案。

## Decision

根目录 [`install.sh`](../../../../install.sh) 以 `curl -fsSL https://raw.githubusercontent.com/singula-ai/alego/main/install.sh | bash` 运行，端到端完成受支持的源码安装：校验 `git` 与 engines 范围（`^22.19.0 || >=24`），缺少 pnpm 时通过 `corepack enable` 提供、由 `packageManager` 钉住版本，`--depth 1` 克隆到 `ALEGO_SRC_DIR`（默认 `~/.alego-src`，刻意避开运行时持有的 `~/.alego`），执行 `pnpm install --frozen-lockfile` 与完整 `pnpm run build`，再向 `ALEGO_BIN_DIR`（默认 `~/.local/bin`）写入两行启动器，exec `node <检出>/apps/cli/lib/bin.js`。重复运行会拉取 ref 并重新构建；受管检出内的本地修改在更新时被丢弃，脚本会予以声明。`ALEGO_REPO` 与 `ALEGO_REF` 用于选择 fork 与分支。

全局命令是写出的启动器文件，而非包管理器链接。`pnpm link --global` 要求已配置全局 bin 目录（`pnpm setup` / `PNPM_HOME`），在从未运行过它的机器上以 `ERR_PNPM_NO_GLOBAL_BIN_DIR` 失败；`npm link` 会孤立地安装 `apps/cli`，其 `workspace:^` 范围在那里无从解析。启动器文件只依赖 `PATH`，且当 bin 目录不在 PATH 上时脚本会明说。

## Alternatives considered

**等待 npm 完成发布。**registry 限制使其还需数日，而源码路径此后仍值得一条命令——用于未发布分支、fork 与贡献者。

**`pnpm link --global` / `npm link`。**因上述失败模式而拒绝；二者还把命令绑定到因机器而异的包管理器全局状态，而启动器用 `cat` 即可查验。

**安装预构建产物。**目前没有可拉取的已发布产物渠道；打包好的 tarball 同样困在该 registry 限制之后。

## Consequences

- 仅支持 Linux 与 macOS；Windows 继续走 npm 路径与手动检出。脚本为 bash 且从不提权：一切落在 `$HOME` 之下。
- 启动器硬编码检出路径，移动 `ALEGO_SRC_DIR` 意味着重新运行安装器。
- 已在干净前缀上端到端验证：匿名克隆公开仓库、frozen 安装、完整构建，并通过写出的启动器运行 `alego --version`。
