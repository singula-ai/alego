# hello-world

[English](README.md) | 中文

Alego 用户能写出的最小插件，以及能承载它的最小组合。可以把它当作新插件的起始骨架，也可以用它检查插件面是否接通。

[`src/hello-world.ts`](src/hello-world.ts) 就是插件的全部：一个 Cordis 插件 `name`、在 `inject` 中声明的服务、一份经 Schemastery 校验的 `Config`，以及在 `tools` 能力缝上注册一个模型可见工具的 `apply`。注册由 Cordis 持有，因此销毁该插件的 fiber 就会撤回这个工具，无需手工反注册。

[`cordis.yml`](cordis.yml) 以相对路径挂载它。发布到 npm 的插件用包名替换该路径，挂载方式完全相同——所以这个 leaf 同时也是第三方插件的模板。

## 运行

```sh
pnpm vitest run examples/hello-world
```

该 smoke 通过与部署相同的 app boot 路径启动这份 `cordis.yml`，并断言工具已注册、出现在模型可见的 schema 列表中、可以执行，并在销毁时被撤回。它不需要密钥、模型或网络。

该组合只注册工具、不挂载模型，因此没有任何东西可以驱动一次轮次，也没有自己的 app bin。若要让真实 agent 使用这个工具，把 `hello-world` 条目加入一个已经启动 agent 的组合——[`examples/headless-agent/cordis.yml`](../headless-agent/cordis.yml)——然后让 agent 去问候某人。

Loader 持有它所启动的配置文件，并会把条目状态写回该文件；因此任何启动已签入的 `cordis.yml` 并改变条目状态的操作都会重写受版本管理的源文件。[测试](tests/hello-world.spec.ts)正因如此启动的是一份副本。
