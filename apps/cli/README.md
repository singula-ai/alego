# `@singula-ai/alego`

English | [中文](README.zh.md)

The `alego` command is the sole supported Node application launcher: profiles are ordered stacks of plugin-bundle patch layers under the user's own overrides. SDK and ACP are profiles, not separate public bins. The Python runtime wheel packages this same command; the SDK defaults to `sdk`, and the minimal example selects `sdk-minimal`. [`src/args.ts`](src/args.ts) owns the command grammar, and [`src/bin.ts`](src/bin.ts) loads only the selected runner. Invalid commands, options from another mode, configuration errors, and boot failures exit nonzero.

## Entry modes

| Command | Purpose |
|---|---|
| `alego --profile <name>` | Boot the named profile under `$ALEGO_HOME/profiles/<name>`. |
| `alego --profile acp` | Serve automation clients over ACP stdio until disconnect. |
| `alego --profile headless "job"` | Run one fresh persisted session, print the final answer, and exit. |
| `alego --profile sdk` | Serve SDK clients over JSON-RPC stdio until shutdown or disconnect. |
| `alego --profile sdk-minimal` | Serve SDK clients with the standalone minimal agent tree. |
| `alego web` | Alias of `--profile web`. |
| `alego plugin --profile <name> <pnpm args>` | Manage a profile's plugins by forwarding to pnpm in the profile directory. |

The invoking directory is the default workspace root. The `web`, `headless`, `sdk`, `sdk-minimal`, and `acp` profiles auto-initialize on first use from shipped templates; any other profile must be created through `alego plugin`.

## App arguments

The launcher parses only its own flags and hands everything after them to the booted profile, where any injected app plugin may parse the shared immutable snapshot ([`alego-cmdline`](../../packages/boot/cmdline/README.md)). The first token the launcher does not recognize starts the app's arguments:

```sh
alego --profile web --port 8080       # --port belongs to the web app
alego --profile tui --resume <id>     # example, assuming the tui profile is installed; --resume belongs to the terminal app
alego --profile headless "run the tests"
alego --profile web --help            # the web app's flags, not the launcher's
alego --help                          # the launcher's own help
```

<a id="profiles"></a>
## Profiles

A profile directory holds a `package.json` (out-of-tree plugin dependencies plus the profile manifest `alego.profile` with its ordered `bundles` list and `patchReload` lifecycle) and a `cordis.patch.yml` (the user's own patch layer). `patchReload: live` watches the profile and home-level patch files; `startup` applies them once.

The tree composes over an empty root:
- each bundle's patch in `alego.profile.bundles` order
- then the profile's `cordis.patch.yml`, then the home-level `$ALEGO_HOME/cordis.patch.yml`
- then `--patch` overlays

Bundles named in `alego.profile.bundles` resolve from the alego installation first (`@singula-ai/alego-base`, `@singula-ai/alego-web-app`, `@singula-ai/alego-headless`, `@singula-ai/alego-sdk-app`, `@singula-ai/alego-sdk-minimal`, `@singula-ai/alego-acp-app`), then from the profile's own `node_modules`, where pnpm installs out-of-tree plugins.

Use `--dump-default-config` and `--dump-config` to inspect the composed tree without booting it.

The [CLI behavior reference](reference/README.md) owns exact layer precedence, flags, shutdown behavior, deployment defaults, and source execution.

## Optional overlays

`config/examples/` ships opt-in overlays for GitHub review webhooks, session-local Schedule, memory MCP servers, and runtime Cordis tools. They are never part of a default profile; the [user guides](../../docs/user/guide/index.md) and [developer practice guides](../../docs/user/develop/practice/index.md) own setup and safety instructions.

## Development

Production runs require built package and frontend artifacts. From the repository root, run `pnpm run build` separately, then use `pnpm alego <args...>` to run the TypeScript entry and forward every argument; the [source-execution reference](reference/README.md#source-execution) owns the module-resolution contract.
