import type { Bindings } from '@server/types'
import { zValidator } from '@hono/zod-validator'
import { users } from '@server/db/schema'
import * as bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { Hono } from 'hono'
import { sign } from 'hono/jwt'
import { z } from 'zod'

export const app = new Hono<{ Bindings: Bindings }>()

// --- 驗證規則 (Validation Schemas) ---
const authSchema = z.object({
  email: z.email(),
  password: z.string().min(6, '密碼至少需要 6 個字元'),
})

// 1. 註冊 (Register)
app.post(
  '/register',
  zValidator('json', authSchema), // Middleware: 驗證請求內容
  async (c) => {
    const { email, password } = c.req.valid('json')
    const db = drizzle(c.env.DB)

    // A. 檢查 Email 是否已存在
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .get()

    if (existingUser) {
      return c.json({ error: '此 Email 已經被註冊' }, 409)
    }

    // B. 密碼加密 (Hashing)
    const hashedPassword = await bcrypt.hash(password, 10)

    // C. 寫入資料庫
    const userId = crypto.randomUUID()
    await db.insert(users).values({
      id: userId,
      email,
      password: hashedPassword,
    })

    // D. 簽發 JWT Token
    // Payload 包含 user_id 和過期時間 (exp)
    const token = await sign(
      { sub: userId, email, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 }, // 7天過期
      c.env.JWT_SECRET!,
    )

    return c.json({
      token,
      user: { id: userId, email },
    }, 201)
  },
)

// 2. 登入 (Login)
app.post(
  '/login',
  zValidator('json', authSchema),
  async (c) => {
    const { email, password } = c.req.valid('json')
    const db = drizzle(c.env.DB)

    // A. 尋找用戶
    const user = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .get()

    if (!user) {
      return c.json({ error: '帳號或密碼錯誤' }, 401)
    }

    // B. 比對密碼
    const isValid = await bcrypt.compare(password, user.password)
    if (!isValid) {
      return c.json({ error: '帳號或密碼錯誤' }, 401)
    }

    // C. 簽發 JWT Token
    const token = await sign(
      { sub: user.id, email, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 },
      c.env.JWT_SECRET!,
    )

    return c.json({
      token,
      user: { id: user.id, email: user.email },
    })
  },
)
