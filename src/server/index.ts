import type { Bindings } from './types'
import { Hono } from 'hono'
import { app as apiV1 } from './api-v1'

const app = new Hono<{ Bindings: Bindings }>()

app.route('/api/v1', apiV1)

app.get('*', async (c) => {
  const env = c.env
  if (env && env.ASSETS) {
    // A. Try to fetch the corresponding static file (e.g., /style.css, /logo.png)
    const response = await env.ASSETS.fetch(c.req.raw)
    if (response.status < 400) {
      return response
    }

    // B. If file not found (404) and not an API request, return index.html
    // This supports Vue Router's History Mode (e.g., /about, /user/123)
    const indexUrl = new URL('/index.html', c.req.url)
    const indexResponse = await env.ASSETS.fetch(new Request(indexUrl, c.req.raw))
    return indexResponse
  }

  // Local development fallback when ASSETS is not available
  // (Usually devServer excludes this, mainly for build behavior)
  return c.text('Not Found', 404)
})

export default app
