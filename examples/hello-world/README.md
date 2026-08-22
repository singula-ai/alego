# hello-world

English | [中文](README.zh.md)

The smallest plugin an Alego user can write, and the smallest composition that can carry it. Use it as the starting shape for a new plugin and as a check that the plugin surface is wired.

[`src/hello-world.ts`](src/hello-world.ts) is the whole plugin: a Cordis plugin `name`, the services it declares in `inject`, a Schemastery-validated `Config`, and an `apply` that registers one model-visible tool on the `tools` seam. Cordis owns the registration, so disposing the plugin's fiber withdraws the tool; nothing has to be unregistered by hand.

[`cordis.yml`](cordis.yml) mounts it by relative path. A plugin published to npm is mounted the same way with its package name in place of the path, which is why this leaf doubles as the template for a third-party plugin.

## Run

```sh
pnpm vitest run examples/hello-world
```

The smoke boots this `cordis.yml` through the same app boot path a deployment uses and asserts the tool is registered, published in the model-visible schema list, executable, and withdrawn on disposal. It needs no key, model, or network.

The composition registers a tool but mounts no model, so it has nothing to drive a turn with and no app bin of its own. To reach the tool from a real agent, add the `hello-world` entry to a composition that already boots one — [`examples/headless-agent/cordis.yml`](../headless-agent/cordis.yml) — and ask the agent to greet someone.

The Loader owns the config file it boots and writes entry state back to it, so anything that boots a checked-in `cordis.yml` and changes entry state rewrites tracked source. [The test](tests/hello-world.spec.ts) boots a copy for that reason.
