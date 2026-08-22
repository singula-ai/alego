# Alego

English | [中文](README.zh.md)

Alego (`alego`) is an open-source agent harness: the building-block foundation for AI agent applications, where every capability arrives as a plugin you snap in.

It uses an architecture where **everything is a plugin**, and is powered by [Cordis](https://github.com/cordiverse/cordis), whose design is described in [_A Programming Paradigm for Spatiotemporal Composability_](https://github.com/cordiverse/paper).

Alego is a fork of [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness), rebranded and developed independently. It is not affiliated with, endorsed by, or sponsored by DeepSeek.

## Developer preview

Alego is currently in _developer preview_ and is iterating rapidly. **THERE WILL BE COMPATIBILITY-BREAKING CHANGES.**

## Run

### Run from `npm`

Install `Node.js`, then run:

```sh
npx @singula-ai/alego web
```

The command starts the Web UI at `http://127.0.0.1:3080` by default and opens it in the default browser for a local launch. An SSH launch only prints the host URL because the SSH client or editor owns the local forwarded address. Pass `--no-open` to run the server without opening a browser. See [Web UI guide](docs/user/guide/index.md).

### Run from source

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

- Project site: <https://alego.dev>.
- Feel free to submit feedback or bug reports through [GitHub Discussions](https://github.com/singula-ai/alego/discussions).
- Add the [`alego-plugin`](https://github.com/topics/alego-plugin) topic to your plugin repository for discoverability.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Development

Start with the [development guide](docs/development.md) and [architecture documentation](docs/architecture.md).

For agents, follow [AGENTS.md](AGENTS.md).

## License

[MIT](LICENSE)

Third-party dependencies and their licenses are disclosed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
