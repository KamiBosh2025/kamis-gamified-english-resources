import { readdirSync } from 'node:fs'
import { basename, resolve } from 'node:path'
import { defineConfig } from 'vite'

const htmlEntries = Object.fromEntries(
  readdirSync(import.meta.dirname)
    .filter((fileName) => fileName.endsWith('.html'))
    .map((fileName) => [basename(fileName, '.html'), resolve(import.meta.dirname, fileName)]),
)

export default defineConfig({
  build: {
    rollupOptions: {
      input: htmlEntries,
    },
  },
})
