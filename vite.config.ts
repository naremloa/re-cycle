import { resolve } from 'node:path'
import devServer from '@hono/vite-dev-server'
import pagesAdapter from '@hono/vite-dev-server/cloudflare'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

function resolvePath(...paths: string[]) {
  return resolve(import.meta.dirname, ...paths)
}

export default defineConfig(({ mode }) => {
  const commonAlias = {
    '@': resolvePath('src/client'),
  }

  // 1. Client Build
  if (mode === 'client') {
    return {
      root: resolvePath('src/client'),
      envDir: resolvePath(),
      resolve: { alias: commonAlias },
      plugins: [vue()],
      build: {
        outDir: resolvePath('dist'),
        emptyOutDir: true,
        rollupOptions: { input: 'index.html' },
      },
    }
  }

  // 2. Server Build
  if (mode === 'server') {
    return {
      build: {
        outDir: resolvePath('dist'),
        emptyOutDir: false,
        ssr: true,
        target: 'esnext',
        rollupOptions: {
          input: resolvePath('src/server/index.ts'),
          output: {
            format: 'es',
            entryFileNames: '_worker.js',
          },
        },
      },
    }
  }

  // 3. Dev Server
  return {
    root: resolvePath('src/client'),
    envDir: resolvePath(),
    resolve: { alias: commonAlias },
    plugins: [
      vue(),
      devServer({
        entry: resolvePath('src/server/index.ts'),
        adapter: pagesAdapter,
        exclude: [/^(?!\/api)/],
      }),
    ],
  }
})
