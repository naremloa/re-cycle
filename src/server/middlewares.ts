import type { Bindings } from '@server/types'
import { createMiddleware } from 'hono/factory'
import { verify } from 'hono/jwt'

// 這是我們自定義的保護 Middleware
export const authMiddleware = createMiddleware<{ Bindings: Bindings, Variables: { currentUserId?: string } }>(async (c, next) => {
  const authHeader = c.req.header('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized: 缺少 Token' }, 401)
  }

  const token = authHeader.split(' ')[1]

  try {
    // 驗證 Token 是否合法
    const payload = await verify(token, c.env.JWT_SECRET!)

    // 將解析出來的 user_id (sub) 放入 Context 變數中
    // 這樣後續的 API 就可以透過 c.var.currentUserId 知道是誰在操作
    c.set('currentUserId', payload.sub as string)

    await next()
  }
  catch (err) {
    console.warn('JWT Verification Error:', err)
    return c.json({ error: 'Unauthorized: Token 無效或已過期' }, 401)
  }
})
