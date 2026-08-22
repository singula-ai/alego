# Alego

[English](README.md) | 中文

Alego（`alego`）是一个开源 agent harness（智能体框架）：面向 AI agent 应用的积木式基础设施，每一项能力都以插件的形式拼装进来。

它采用**一切皆插件**的架构，并由 [Cordis](https://github.com/cordiverse/cordis) 驱动，其设计参见论文 [_A Programming Paradigm for Spatiotemporal Composability_](https://github.com/cordiverse/paper)。

Alego fork 自 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)，经过品牌重塑后独立开发，与 DeepSeek 无隶属、背书或赞助关系。

## 开发者预览

Alego 目前处于 _开发者预览_ 阶段，正在快速迭代。**未来将出现破坏兼容性的变更。**

<a id="run"></a>

## 运行

### 通过 `npm` 运行

安装 `Node.js`，然后运行：

```sh
npx @alego/cli web
```

该命令默认会在 `http://127.0.0.1:3080` 启动 Web UI，本机启动时还会用默认浏览器打开页面。通过 SSH 启动时只打印宿主机 URL，因为本地转发地址由 SSH 客户端或编辑器持有。传入 `--no-open` 可仅运行服务器而不打开浏览器。详见 [Web UI 指南](docs/user/guide/index.zh.md)。

<a id="run-from-source"></a>

### 从源码运行

如需从仓库源码运行：

```sh
git clone https://github.com/singula-ai/alego.git
cd alego
pnpm install
pnpm run build
pnpm alego web
```

`pnpm run build` 会准备仓库产物。`pnpm alego web` 会直接使用这些已构建产物，不会重新构建。

## 社区与支持

- 项目站点：<https://alego.dev>。
- 欢迎通过 [GitHub Discussions](https://github.com/singula-ai/alego/discussions) 提交反馈或 bug 报告。
- 为你的插件仓库添加 [`alego-plugin`](https://github.com/topics/alego-plugin) 话题，便于被发现。

## 参与贡献

参见 [CONTRIBUTING.md](CONTRIBUTING.zh.md)。

## 开发

请先阅读[开发指南](docs/development.zh.md)与[架构文档](docs/architecture.zh.md)。

面向 agent：请遵循 [AGENTS.md](AGENTS.md)。

## 许可证

[MIT](LICENSE)

第三方依赖及其许可证见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
