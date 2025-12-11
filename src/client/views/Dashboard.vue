<script setup lang="ts">
import type { Collection } from '../types'
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../utils/api'

const router = useRouter()
const collections = ref<Collection[]>([])
const loading = ref(true)
const isSubmitting = ref(false)

// 新增表單資料
const newCollection = reactive({
  title: '',
  description: '',
})

// 1. 載入資料
async function fetchCollections() {
  try {
    // api.get 已經由 ofetch 處理好型別與 token
    collections.value = await api.client<Collection[]>('/api/v1/collections')
  }
  catch (error) {
    console.error('Failed to fetch collections', error)
  }
  finally {
    loading.value = false
  }
}

// 2. 建立牌組
async function createCollection() {
  if (isSubmitting.value)
    return
  isSubmitting.value = true

  try {
    const res = await api.client<Collection>('/api/v1/collections', {
      method: 'POST',
      body: newCollection,
    })
    // 成功後，將新資料推入列表 (也可以重新 fetch，但這樣比較快)
    collections.value.unshift({
      ...res, // API 回傳包含 id, title
      userId: '', // 暫時不需要
      createdAt: Date.now(),
      description: newCollection.description,
    })

    // 清空表單
    newCollection.title = ''
    newCollection.description = ''
  }
  catch (error: any) {
    alert(error.message || '建立失敗')
  }
  finally {
    isSubmitting.value = false
  }
}

// 3. 刪除牌組
async function deleteCollection(id: string) {
  if (!confirm('確定要刪除這個牌組嗎？裡面的卡片也會一併刪除喔！'))
    return

  try {
    await api.client(`/api/v1/collections/${id}`, { method: 'DELETE' })

    // 從前端列表移除
    collections.value = collections.value.filter(c => c.id !== id)
  }
  catch (error: any) {
    alert('刪除失敗')
  }
}

// 4. 跳轉到詳情頁 (尚未實作)
function goToCollection(id: string) {
  router.push(`/collections/${id}`)
}

// 5. 登出
function logout() {
  api.logout()
}

// 工具函式：格式化日期
const formatDate = (ts: number) => new Date(ts).toLocaleDateString()

// 初始化
onMounted(() => {
  fetchCollections()
})

function startReview(id: string) {
  router.push(`/collections/${id}/review`)
}
</script>

<template>
  <div class="dashboard-container">
    <header class="header">
      <h1>我的牌組 ({{ collections.length }})</h1>
      <button class="btn-secondary" @click="logout">
        登出
      </button>
    </header>

    <section class="create-section">
      <form class="create-form" @submit.prevent="createCollection">
        <input
          v-model="newCollection.title"
          type="text"
          placeholder="輸入新牌組名稱 (例如: 多益單字)"
          required
        >
        <input
          v-model="newCollection.description"
          type="text"
          placeholder="描述 (選填)"
        >
        <button type="submit" :disabled="isSubmitting">
          {{ isSubmitting ? '建立中...' : '+ 新增牌組' }}
        </button>
      </form>
    </section>

    <hr>

    <div v-if="loading" class="loading">
      載入中...
    </div>

    <div v-else-if="collections.length === 0" class="empty-state">
      目前沒有牌組，趕快建立一個吧！
    </div>

    <div v-else class="collection-grid">
      <div
        v-for="col in collections"
        :key="col.id"
        class="collection-card"
        @click="goToCollection(col.id)"
      >
        <div class="card-content">
          <h3>{{ col.title }}</h3>
          <p>{{ col.description || '無描述' }}</p>
          <span class="date">{{ formatDate(col.createdAt) }}</span>
        </div>

        <div class="card-actions">
          <button class="btn-review" @click.stop.prevent="startReview(col.id)">
            開始複習
          </button>
          <button
            class="btn-delete"
            @click.stop.prevent="deleteCollection(col.id)"
          >
            刪除
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard-container { max-width: 800px; margin: 0 auto; padding: 20px; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }

/* 表單樣式 */
.create-form { display: flex; gap: 10px; margin-bottom: 20px; }
.create-form input { padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
.create-form input[type="text"] { flex: 1; }
button { cursor: pointer; padding: 8px 16px; border-radius: 4px; border: none; background: #42b883; color: white; }
button:disabled { background: #a8d5c2; cursor: not-allowed; }
.btn-secondary { background: #666; }

/* Grid 樣式 */
.collection-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 15px; }
.collection-card {
  border: 1px solid #ddd; border-radius: 8px; padding: 15px;
  cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;
  background: white; display: flex; flex-direction: column; justify-content: space-between;
  min-height: 120px;
}
.collection-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); border-color: #42b883; }
.card-content h3 { margin: 0 0 5px 0; font-size: 1.1em; }
.card-content p { color: #666; font-size: 0.9em; margin: 0; }
.date { font-size: 0.8em; color: #999; margin-top: 10px; display: block; }

.card-actions { margin-top: 15px; text-align: right; }
.btn-delete { background: transparent; color: #ff4444; border: 1px solid #ff4444; padding: 4px 8px; font-size: 0.8em; }
.btn-delete:hover { background: #ff4444; color: white; }

.empty-state { text-align: center; color: #888; margin-top: 50px; }
</style>
