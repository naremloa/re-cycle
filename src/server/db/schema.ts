import { sql } from 'drizzle-orm'
import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core'

// --- 1. 用戶表 (Users) ---
export const users = sqliteTable('users', {
  id: text('id').primaryKey(), // 使用 crypto.randomUUID() 生成
  email: text('email').notNull().unique(),
  password: text('password').notNull(), // 存 Hash 過後的密碼
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
})

// --- 2. 牌組表 (Collections) ---
export const collections = sqliteTable('collections', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }), // 用戶刪除，牌組連帶刪除
  title: text('title').notNull(),
  description: text('description'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
})

// --- 3. 卡片表 (Cards) ---
export const cards = sqliteTable('cards', {
  id: text('id').primaryKey(),
  collectionId: text('collection_id')
    .notNull()
    .references(() => collections.id, { onDelete: 'cascade' }), // 牌組刪除，卡片連帶刪除

  // 內容區域 (Markdown)
  front: text('front').notNull(), // 正面
  back: text('back').notNull(), // 反面

  // --- 複習演算法欄位 (Based on Anki/SM-2) ---

  // 狀態: new(新卡), learning(學習中), review(複習中), relearning(重新學習)
  state: text('state', { enum: ['new', 'learning', 'review', 'relearning'] })
    .notNull()
    .default('new'),

  // 到期日: 下一次需要複習的時間 (UTC Timestamp)
  // 查詢今日任務: WHERE due_date <= Date.now()
  dueDate: integer('due_date', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),

  // 間隔天數: 上次複習與下次複習的間隔 (天)
  lastInterval: real('last_interval').notNull().default(0),

  // 熟悉度係數 (Ease Factor): 預設 2.5 (Anki 標準)
  // < 1.3 表示很難，> 2.5 表示簡單
  easeFactor: real('ease_factor').notNull().default(2.5),

  // 統計欄位
  reps: integer('reps').notNull().default(0), // 總複習次數
  lapses: integer('lapses').notNull().default(0), // 忘記次數 (按了 Again)

  // 時間戳記
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
})
