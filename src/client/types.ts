export interface Collection {
  id: string
  userId: string
  title: string
  description?: string
  createdAt: number // 我們後端設定為 timestamp_ms
}

export interface Card {
  id: string
  collectionId: string
  front: string
  back: string
  state: 'new' | 'learning' | 'review' | 'relearning'
  dueDate: number
  // 其他統計欄位暫時前端用不到，可省略
}
