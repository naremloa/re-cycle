<script setup lang="ts">
import type { Card, Collection } from '../types'
import MarkdownIt from 'markdown-it'
import { onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '../utils/api'

const route = useRoute()
const router = useRouter()
const md = new MarkdownIt()

// 狀態
const collectionId = route.params.id as string
const collection = ref<Collection | null>(null)
const cards = ref<Card[]>([])
const loading = ref(true)
const submitting = ref(false)

// 表單狀態
const isEditing = ref(false)
const editingCardId = ref<string | null>(null)
const form = reactive({
  front: '',
  back: '',
})

// Markdown 渲染 helper
const renderMd = (text: string) => md.render(text || '')

// 1. 載入資料 (牌組詳情 + 卡片列表)
async function fetchData() {
  try {
    const [colRes, cardsRes] = await Promise.all([
      api.client<Collection>(`/api/v1/collections/${collectionId}`),
      api.client<Card[]>(`/api/v1/collections/${collectionId}/cards`),
    ])
    collection.value = colRes
    cards.value = cardsRes
  }
  catch {
    alert('無法載入牌組資料，可能已被刪除')
    router.push('/')
  }
  finally {
    loading.value = false
  }
}

// 2. 提交 (新增或更新)
async function submitCard() {
  if (!form.front || !form.back)
    return alert('正反面內容都不能為空')
  submitting.value = true

  try {
    if (isEditing.value && editingCardId.value) {
      // 更新模式
      await api.client(`/api/v1/cards/${editingCardId.value}`, {
        method: 'PUT',
        body: {
          front: form.front,
          back: form.back,
        },
      })

      // 更新本地列表
      const target = cards.value.find(c => c.id === editingCardId.value)
      if (target) {
        target.front = form.front
        target.back = form.back
      }
      cancelEdit() // 退出編輯模式
    }
    else {
      // 新增模式
      const res = await api.client('/api/v1/cards', {
        method: 'POST',
        body: {
          collectionId,
          front: form.front,
          back: form.back,
        },
      })

      // 新增到列表最上方
      cards.value.unshift({
        id: res.id,
        collectionId,
        front: form.front,
        back: form.back,
        state: 'new',
        dueDate: Date.now(),
      })

      // 清空表單，方便繼續新增下一張
      form.front = ''
      form.back = ''
    }
  }
  catch (e: any) {
    alert(e.message)
  }
  finally {
    submitting.value = false
  }
}

// 3. 刪除卡片
async function deleteCard(id: string) {
  if (!confirm('確定刪除這張卡片？'))
    return
  try {
    await api.client(`/api/v1/cards/${id}`, { method: 'DELETE' })
    cards.value = cards.value.filter(c => c.id !== id)
  }
  catch (e) {
    alert('刪除失敗')
  }
}

// 4. 進入編輯模式
function editCard(card: Card) {
  isEditing.value = true
  editingCardId.value = card.id
  form.front = card.front
  form.back = card.back
  // 自動捲動到上方編輯區
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// 5. 取消編輯
function cancelEdit() {
  isEditing.value = false
  editingCardId.value = null
  form.front = ''
  form.back = ''
}

onMounted(fetchData)
</script>

<template>
  <div class="detail-container">
    <header class="header">
      <button class="btn-back" @click="router.push('/')">
        ← 返回列表
      </button>
      <div v-if="collection" class="title-section">
        <h1>{{ collection.title }}</h1>
        <span class="count">{{ cards.length }} 張卡片</span>
      </div>
    </header>

    <section class="editor-section">
      <h2>{{ isEditing ? '編輯卡片' : '新增卡片' }}</h2>

      <div class="editor-grid">
        <div class="input-group">
          <label>正面 (Front)</label>
          <textarea
            v-model="form.front"
            placeholder="支援 Markdown (e.g., **粗體**, - 列表)"
            rows="3"
          />
        </div>

        <div class="input-group">
          <label>反面 (Back)</label>
          <textarea
            v-model="form.back"
            placeholder="答案或詳解..."
            rows="3"
          />
        </div>
      </div>

      <div v-if="form.front || form.back" class="preview-box">
        <div class="preview-item">
          <small>正面預覽：</small>
          <div class="markdown-body" v-html="renderMd(form.front)" />
        </div>
        <div class="preview-item">
          <small>反面預覽：</small>
          <div class="markdown-body" v-html="renderMd(form.back)" />
        </div>
      </div>

      <div class="actions">
        <button :disabled="submitting" class="btn-primary" @click="submitCard">
          {{ isEditing ? '儲存修改' : '+ 新增卡片' }}
        </button>
        <button v-if="isEditing" class="btn-secondary" @click="cancelEdit">
          取消編輯
        </button>
      </div>
    </section>

    <hr>

    <section class="card-list">
      <div v-if="loading" class="loading">
        載入中...
      </div>
      <div v-else-if="cards.length === 0" class="empty">
        這個牌組還沒有卡片。
      </div>

      <div v-for="card in cards" v-else :key="card.id" class="card-item">
        <div class="card-content">
          <div class="card-face">
            <span class="badge">Q</span>
            <div class="markdown-body" v-html="renderMd(card.front)" />
          </div>
          <div class="divider" />
          <div class="card-face">
            <span class="badge answer">A</span>
            <div class="markdown-body" v-html="renderMd(card.back)" />
          </div>
        </div>

        <div class="card-actions">
          <button class="btn-icon" @click="editCard(card)">
            ✎ 編輯
          </button>
          <button class="btn-icon delete" @click="deleteCard(card.id)">
            🗑 刪除
          </button>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.detail-container { max-width: 800px; margin: 0 auto; padding: 20px; }
.header { display: flex; align-items: center; gap: 20px; margin-bottom: 30px; }
.btn-back { background: transparent; border: 1px solid #ddd; color: #666; padding: 5px 10px; cursor: pointer; }
.title-section h1 { margin: 0; font-size: 1.5rem; }
.count { color: #888; font-size: 0.9rem; }

/* 編輯區樣式 */
.editor-section { background: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 30px; border: 1px solid #eee; }
.editor-grid { display: grid; gap: 15px; margin-bottom: 15px; }
.input-group label { display: block; margin-bottom: 5px; font-weight: bold; font-size: 0.9rem; }
textarea { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-family: inherit; resize: vertical; }

.preview-box { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; background: white; padding: 10px; border: 1px dashed #ccc; margin-bottom: 15px; font-size: 0.9rem; }
.preview-item small { display: block; color: #999; margin-bottom: 5px; }

.actions { display: flex; gap: 10px; }
.btn-primary { background: #42b883; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; }
.btn-secondary { background: #666; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; }
button:disabled { opacity: 0.6; cursor: not-allowed; }

/* 卡片列表樣式 */
.card-item { background: white; border: 1px solid #ddd; border-radius: 8px; margin-bottom: 15px; padding: 15px; display: flex; justify-content: space-between; align-items: flex-start; }
.card-content { flex: 1; margin-right: 20px; }
.card-face { display: flex; gap: 10px; margin-bottom: 8px; }
.badge { background: #e0f2fe; color: #0284c7; padding: 2px 6px; border-radius: 4px; font-size: 0.8rem; height: fit-content; }
.badge.answer { background: #f0fdf4; color: #16a34a; }
.divider { border-bottom: 1px solid #eee; margin: 8px 0; }

.card-actions { display: flex; flex-direction: column; gap: 5px; }
.btn-icon { background: none; border: none; cursor: pointer; color: #666; font-size: 0.9rem; text-align: left; }
.btn-icon:hover { color: #42b883; }
.btn-icon.delete:hover { color: #ff4444; }

/* Markdown 基本樣式補強 */
:deep(.markdown-body p) { margin: 0; }
:deep(.markdown-body ul) { margin: 0; padding-left: 20px; }
</style>
