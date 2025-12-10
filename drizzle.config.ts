import fs from 'node:fs'
import { join, resolve } from 'node:path'
import { defineConfig } from 'drizzle-kit'

function getLocalD1DB() {
  try {
    const basePath = resolve('.wrangler/state/v3/d1/miniflare-D1DatabaseObject')
    const files = fs.readdirSync(basePath)
    const dbFile = files.find(f => f.endsWith('.sqlite'))
    if (dbFile)
      return join(basePath, dbFile)
  }
  catch { return null }
}

const localUrl = getLocalD1DB()

export default defineConfig({
  schema: './src/server/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  ...(localUrl ? { dbCredentials: { url: localUrl } } : {}),
})
