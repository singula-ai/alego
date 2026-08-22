#!/usr/bin/env node

import { Context } from '@alego/cordis'
import { pathToFileURL } from 'node:url'
import Loader from '@alego/cordis-plugin-loader'

const ctx = new Context()
ctx.baseUrl = pathToFileURL(process.cwd()).href + '/'

await ctx.plugin(Loader)
await ctx.loader.create({
  name: '@alego/cordis-plugin-include',
  config: {
    path: './cordis.yml',
  },
})
