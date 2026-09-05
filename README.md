# Alego

English | [中文](README.zh.md)

Alego (`alego`) is an open-source agent harness from Singula AI: a building-block foundation for AI agent applications.

It is built on an **everything-is-a-plugin** architecture and powered by [Cordis](https://github.com/cordiverse/cordis), whose design is described in [_A Programming Paradigm for Spatiotemporal Composability_](https://arxiv.org/abs/2608.25512).

Alego is an independent fork of [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness), with no affiliation or endorsement from DeepSeek. Start with the [documentation](docs/user/index.md).

## Developer preview

Alego is in _developer preview_ and iterating rapidly. **THERE WILL BE COMPATIBILITY-BREAKING CHANGES.**

Review the [safety notice](SAFETY.md) before running the project.

## Run

### Run from `npm`

Install `Node.js`, then run:

```sh
npx @singula-ai/alego web
```

The command starts the Web UI at `http://127.0.0.1:3080` by default and opens it in the default browser for a local launch. An SSH launch only prints the host URL because the SSH client or editor owns the local forwarded address. Pass `--no-open` to run the server without opening a browser. See [Web UI guide](docs/user/guide/index.md).

### Run from source

On Linux/macOS, the source installer builds Alego and adds a launcher in `~/.local/bin`:

```sh
curl -fsSL https://raw.githubusercontent.com/singula-ai/alego/main/install.sh | bash
```

To run from a repository checkout:

```sh
git clone https://github.com/singula-ai/alego.git
cd alego
pnpm install
pnpm run build
pnpm alego web
```

`pnpm run build` prepares the repository artifacts. `pnpm alego web` uses those built artifacts without rebuilding.

## Community and support

- Submit feedback or bug reports through [GitHub Discussions](https://github.com/singula-ai/alego/discussions).
- Add the [`alego-plugin`](https://github.com/topics/alego-plugin) topic to your plugin repository for discoverability.
- Project site: <https://alego.dev>.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Development

Start with the [development guide](docs/development.md) and [architecture documentation](docs/architecture.md).

For agents, follow [AGENTS.md](AGENTS.md).

## License

[MIT](LICENSE)

Third-party dependencies and their licenses are disclosed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
