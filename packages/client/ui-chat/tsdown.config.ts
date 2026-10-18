import { clientBundle } from '../tsdown.client.ts'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const bundle = clientBundle(import.meta.dirname, ['lib/types/index.js'])
const stylesheet = fileURLToPath(new URL('./src/client/chat/ChatView.module.css', import.meta.url)).replaceAll('\\', '/')
const blockImage = fileURLToPath(new URL('./src/client/chat/running-block@2x.png', import.meta.url))

export default ((options) => bundle(options).map(config => ({
  ...config,
  plugins: [...(config.plugins ?? []), {
    name: 'chat-block-image',
    async transform(code: string, id: string) {
      if (id.replaceAll('\\', '/') !== `\0alego-css:${stylesheet}.mjs`) return null
      const imageUrl = './running-block@2x.png'
      if (!code.includes(imageUrl)) return null
      this.addWatchFile(blockImage)
      const image = await readFile(blockImage)
      return { code: code.replaceAll(imageUrl, `data:image/png;base64,${image.toString('base64')}`), map: null }
    },
  }],
}))) satisfies typeof bundle
