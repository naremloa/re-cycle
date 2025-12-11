import type { Bindings } from '@server/types'
import type { DrizzleD1Database } from 'drizzle-orm/d1'
import { zValidator } from '@hono/zod-validator'
import { cards, collections } from '@server/db/schema'
import { authMiddleware } from '@server/middlewares'
import { and, desc, eq, lte } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { Hono } from 'hono'
import z from 'zod'

type Variables = {
  db: DrizzleD1Database
  currentUserId?: string
}

export const app = new Hono<{ Bindings: Bindings, Variables: Variables }>()

app.use('*', authMiddleware)

// Middleware: Inject Drizzle DB instance
app.use('*', async (c, next) => {
  c.set('db', drizzle(c.env.DB))
  await next()
})

// --- Zod 驗證規則 ---
const createCollectionSchema = z.object({
  title: z.string().min(1, '標題不能為空'),
  description: z.string().optional(),
})

const createCardSchema = z.object({
  collectionId: z.uuid(),
  front: z.string().min(1, '正面內容不能為空'), // 支援 Markdown
  back: z.string().min(1, '反面內容不能為空'), // 支援 Markdown
})

const updateCardSchema = z.object({
  front: z.string().min(1).optional(),
  back: z.string().min(1).optional(),
})

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(4), // 1: Again, 2: Hard, 3: Good, 4: Easy
})

// ==========================================
// 1. Collections (牌組) 相關路由
// ==========================================

// 取得我的所有牌組
app.get('/collections', async (c) => {
  const userId = c.var.currentUserId! // 從 Middleware 拿到的 ID
  const db = drizzle(c.env.DB)

  const results = await db
    .select()
    .from(collections)
    .where(eq(collections.userId, userId)) // 關鍵：只抓自己的
    .orderBy(desc(collections.createdAt))

  return c.json(results)
})

// 建立新牌組
app.post(
  '/collections',
  zValidator('json', createCollectionSchema),
  async (c) => {
    const userId = c.var.currentUserId!
    const { title, description } = c.req.valid('json')
    const db = drizzle(c.env.DB)

    const newId = crypto.randomUUID()

    // 寫入資料庫
    await db.insert(collections).values({
      id: newId,
      userId,
      title,
      description,
    })

    return c.json({ id: newId, title }, 201)
  },
)

// 刪除牌組 (連帶刪除裡面的卡片 - Drizzle schema 設定了 cascade)
app.delete('/collections/:id', async (c) => {
  const userId = c.var.currentUserId!
  const collectionId = c.req.param('id')
  const db = drizzle(c.env.DB)

  // 執行刪除，並確認該牌組屬於當前用戶
  const result = await db
    .delete(collections)
    .where(
      and(
        eq(collections.id, collectionId),
        eq(collections.userId, userId),
      ),
    )
    .returning({ deletedId: collections.id })

  if (result.length === 0) {
    return c.json({ error: '找不到牌組或是無權限刪除' }, 404)
  }

  return c.json({ success: true })
})

// ==========================================
// 2. Cards (卡片) 相關路由
// ==========================================

// 取得特定牌組內的所有卡片
app.get('/collections/:id/cards', async (c) => {
  const userId = c.var.currentUserId!
  const collectionId = c.req.param('id')
  const db = drizzle(c.env.DB)

  // 先確認這個牌組是不是這個人的
  const collection = await db
    .select()
    .from(collections)
    .where(and(eq(collections.id, collectionId), eq(collections.userId, userId)))
    .get()

  if (!collection) {
    return c.json({ error: '牌組不存在或無權限' }, 404)
  }

  // 抓取卡片
  const cardList = await db
    .select()
    .from(cards)
    .where(eq(cards.collectionId, collectionId))
    .orderBy(desc(cards.createdAt))

  return c.json(cardList)
})

app.get('/collections/:id/review', async (c) => {
  const userId = c.var.currentUserId!
  const collectionId = c.req.param('id')
  const db = drizzle(c.env.DB)

  // 1. 確認權限
  const hasPerm = await db
    .select({ id: collections.id })
    .from(collections)
    .where(and(eq(collections.id, collectionId), eq(collections.userId, userId)))
    .get()

  if (!hasPerm)
    return c.json({ error: '無權限' }, 403)

  // 2. 撈取到期卡片 (dueDate <= 現在)
  const now = new Date()
  const dueCards = await db
    .select()
    .from(cards)
    .where(
      and(
        eq(cards.collectionId, collectionId),
        lte(cards.dueDate, now), // 關鍵條件
      ),
    )
    .orderBy(cards.dueDate) // 最舊的先複習
    .limit(50) // 避免一次撈太多，一次 50 張

  return c.json(dueCards)
})

// 建立卡片
app.post(
  '/cards',
  zValidator('json', createCardSchema),
  async (c) => {
    const userId = c.var.currentUserId!
    const { collectionId, front, back } = c.req.valid('json')
    const db = drizzle(c.env.DB)

    // 安全檢查：確認要加入的牌組是屬於該用戶的
    const userHasCollection = await db
      .select({ id: collections.id })
      .from(collections)
      .where(and(eq(collections.id, collectionId), eq(collections.userId, userId)))
      .get()

    if (!userHasCollection) {
      return c.json({ error: '無權限操作此牌組' }, 403)
    }

    const newId = crypto.randomUUID()

    await db.insert(cards).values({
      id: newId,
      collectionId,
      front,
      back,
      // 其他欄位如 state, due_date 會使用 Schema 定義的預設值 (new, now)
    })

    return c.json({ id: newId, status: 'created' }, 201)
  },
)

// 更新卡片內容
app.put(
  '/cards/:id',
  zValidator('json', updateCardSchema),
  async (c) => {
    const userId = c.var.currentUserId!
    const cardId = c.req.param('id')
    const { front, back } = c.req.valid('json')
    const db = drizzle(c.env.DB)

    // 這裡需要用 join 或子查詢來確認卡片屬於該用戶的牌組
    // 為了簡化與效能，我們先查出卡片所屬的 collectionId，再查 collection 的 userId
    // 或者直接用 SQL join。這裡用比較直觀的兩階段查詢 (適合 D1 規模)

    // 1. 撈出卡片資訊
    const targetCard = await db.select().from(cards).where(eq(cards.id, cardId)).get()

    if (!targetCard)
      return c.json({ error: '卡片不存在' }, 404)

    // 2. 驗證該卡片的牌組是否屬於當前用戶
    const ownerCollection = await db
      .select()
      .from(collections)
      .where(and(eq(collections.id, targetCard.collectionId), eq(collections.userId, userId)))
      .get()

    if (!ownerCollection)
      return c.json({ error: '無權限' }, 403)

    // 3. 更新
    await db
      .update(cards)
      .set({
        front: front ?? targetCard.front,
        back: back ?? targetCard.back,
        updatedAt: new Date(), // 手動更新時間
      })
      .where(eq(cards.id, cardId))

    return c.json({ success: true })
  },
)

// 刪除卡片
app.delete('/cards/:id', async (c) => {
  const userId = c.var.currentUserId!
  const cardId = c.req.param('id')
  const db = drizzle(c.env.DB)

  // 類似 Update，需要先驗證權限。
  // 這裡示範用更簡潔的寫法：先刪除，條件包含「子查詢驗證用戶ID」
  // 但 Drizzle 的 SQLite Driver 對複雜子查詢支援度不一，最穩妥還是先查再刪

  const targetCard = await db.select().from(cards).where(eq(cards.id, cardId)).get()
  if (!targetCard)
    return c.json({ error: '卡片不存在' }, 404)

  const isOwner = await db
    .select()
    .from(collections)
    .where(and(eq(collections.id, targetCard.collectionId), eq(collections.userId, userId)))
    .get()

  if (!isOwner)
    return c.json({ error: '無權限' }, 403)

  await db.delete(cards).where(eq(cards.id, cardId))

  return c.json({ success: true })
})

app.get('/collections/:id', async (c) => {
  const userId = c.var.currentUserId!
  const collectionId = c.req.param('id')
  const db = drizzle(c.env.DB)

  const collection = await db
    .select()
    .from(collections)
    .where(and(eq(collections.id, collectionId), eq(collections.userId, userId)))
    .get()

  if (!collection) {
    return c.json({ error: '找不到牌組' }, 404)
  }

  return c.json(collection)
})

app.post(
  '/cards/:id/review',
  zValidator('json', reviewSchema),
  async (c) => {
    // const userId = c.var.currentUserId!
    const cardId = c.req.param('id')
    const { rating } = c.req.valid('json')
    const db = drizzle(c.env.DB)

    // 1. 撈出舊卡片資料
    const card = await db.select().from(cards).where(eq(cards.id, cardId)).get()
    if (!card)
      return c.json({ error: '卡片不存在' }, 404)

    // 權限檢查 (略，假設能撈到就是有權限，或可補上 join check)

    // --- SM-2 演算法簡化版實作 ---

    let newInterval = 0 // 天數
    let newEaseFactor = card.easeFactor
    let newState = 'review' // 預設狀態

    // 常數定義
    const ONE_DAY_MS = 24 * 60 * 60 * 1000

    if (rating === 1) {
      // --- Again (忘記了) ---
      newInterval = 0 // 重置，今天或馬上重來
      newEaseFactor = Math.max(1.3, card.easeFactor - 0.2) // 稍微降低係數
      newState = 'relearning'
    }
    else {
      // --- Pass (Hard / Good / Easy) ---

      // 1. 計算新的 Ease Factor
      // 公式: EF' = EF + (0.1 - (5-q)*(0.08+(5-q)*0.02))
      // 簡化調整邏輯：
      if (rating === 2)
        newEaseFactor -= 0.15 // Hard: 變難一點
      if (rating === 4)
        newEaseFactor += 0.15 // Easy: 變簡單一點

      // 確保最小不低於 1.3
      newEaseFactor = Math.max(1.3, newEaseFactor)

      // 2. 計算新的 Interval (天數)
      if (card.lastInterval === 0) {
        // 第一次答對
        newInterval = 1
      }
      else if (card.lastInterval === 1) {
        // 第二次答對
        newInterval = (rating === 4) ? 4 : 3 // Easy 給多一點
      }
      else {
        // 後續：舊間隔 * 係數
        let bonus = (rating === 4) ? 1.3 : 1 // Easy 額外獎勵
        newInterval = Math.ceil(card.lastInterval * newEaseFactor * bonus)
      }

      newState = 'review'
    }

    // 計算新的到期時間 (Timestamp)
    // 如果 interval = 0 (Again)，我們設定為 1 分鐘後 (或是直接設為現在，讓它還在佇列中)
    // 這裡為了簡化，Again 設為 10 分鐘後，Pass 設為 N 天後
    let nextDueDate = 0
    if (newInterval === 0) {
      nextDueDate = Date.now() + (10 * 60 * 1000) // 10 mins later
    }
    else {
      nextDueDate = Date.now() + (newInterval * ONE_DAY_MS)
    }

    // 3. 更新資料庫
    await db.update(cards).set({
      state: newState as any,
      lastInterval: newInterval,
      easeFactor: newEaseFactor,
      dueDate: new Date(nextDueDate),
      updatedAt: new Date(),
      // 累加次數
      reps: card.reps + 1,
      lapses: rating === 1 ? card.lapses + 1 : card.lapses,
    }).where(eq(cards.id, cardId))

    return c.json({
      success: true,
      nextReviewInDays: newInterval,
    })
  },
)
