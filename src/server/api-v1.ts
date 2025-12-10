import type { DrizzleD1Database } from 'drizzle-orm/d1'
import type { Bindings } from './types'
import { drizzle } from 'drizzle-orm/d1'
import { Hono } from 'hono'
import { posts } from './db/schema'

type Variables = {
  db: DrizzleD1Database
}

export const app = new Hono<{ Bindings: Bindings, Variables: Variables }>()

// Middleware: Inject Drizzle DB instance
app.use('*', async (c, next) => {
  c.set('db', drizzle(c.env.DB))
  await next()
})

app.get('/hello', (c) => {
  const version = c.env.VERSION ?? 'V0'
  return c.json({
    message: `Hello from Hono (VERSION: ${version})!`,
    timestamp: new Date().toISOString(),
  })
})

app.get('/posts', async (c) => {
  const db = c.get('db')
  const result = await db.select().from(posts).all()
  return c.json(result)
})

app.post('/posts', async (c) => {
  const db = c.get('db')
  // 簡單模擬寫入
  const newPost = await db.insert(posts).values({
    title: 'Hello D1',
    content: 'This data comes from local Drizzle!',
    notes: '',
  }).returning()

  return c.json(newPost)
})
