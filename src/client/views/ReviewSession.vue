<script setup lang="ts">
import type { Card } from '../types'
import MarkdownIt from 'markdown-it'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '../utils/api'

const route = useRoute()
const router = useRouter()
const md = new MarkdownIt()

const collectionId = route.params.id as string
const queue = ref<Card[]>([])
const loading = ref(true)
const showAnswer = ref(false)

// 計算屬性
const currentCard = computed(() => queue.value[0])
const finished = computed(() => !loading.value && queue.value.length === 0)

// Helper
const renderMd = (text: string) => md.render(text || '')

// 1. 載入需複習卡片
async function fetchDueCards() {
  try {
    const res = await api.client<Card[]>(`/api/v1/collections/${collectionId}/review`)
    queue.value = res
  }
  catch (e: unknown) {
    alert('載入失敗')
    router.push('/')
  }
  finally {
    loading.value = false
  }
}

// 2. 顯示答案
function revealAnswer() {
  showAnswer.value = true
}

// 3. 提交評分
async function submitReview(rating: number) {
  if (!currentCard.value)
    return

  const cardId = currentCard.value.id

  // 樂觀更新 (Optimistic UI): 先把卡片移出佇列，讓使用者感覺很快
  // 如果是 rating 1 (Again)，理論上應該要重新排入佇列，這裡簡單做：直接移到最後面
  const processedCard = queue.value.shift()
  showAnswer.value = false // 重置介面

  // 如果是 Again，這張卡片等一下還要再問一次
  if (rating === 1 && processedCard) {
    queue.value.push(processedCard)
  }

  try {
    // 背景發送請求
    await api.client(`/api/v1/cards/${cardId}/review`, { method: 'POST', body: { rating } })
  }
  catch (e) {
    console.error('評分提交失敗', e)
    // 嚴謹的話這裡應該要把卡片加回去並報錯
  }
}

onMounted(fetchDueCards)
</script>

<template>
  <div class="review-container">
    <header>
      <button class="btn-text" @click="router.push('/')">
        ✕ 結束
      </button>
      <span>剩餘: {{ queue.length }} 張</span>
    </header>

    <div v-if="finished" class="finished-state">
      <h2>🎉 太棒了！</h2>
      <p>這個牌組目前沒有需要複習的卡片。</p>
      <button class="btn-primary" @click="router.push('/')">
        回到首頁
      </button>
    </div>

    <div v-else-if="loading" class="loading">
      準備卡片中...
    </div>

    <div v-else class="flashcard">
      <div class="card-face front">
        <div class="label">
          Q
        </div>
        <div class="markdown-body" v-html="renderMd(currentCard?.front ?? '')" />
      </div>

      <hr v-if="showAnswer">

      <div v-if="showAnswer" class="card-face back">
        <div class="label">
          A
        </div>
        <div class="markdown-body" v-html="renderMd(currentCard?.back ?? '')" />
      </div>
    </div>

    <div v-if="!finished && !loading" class="controls">
      <button
        v-if="!showAnswer"
        class="btn-reveal"
        @click="revealAnswer"
      >
        顯示答案
      </button>

      <div v-else class="rating-grid">
        <button class="rate-btn again" @click="submitReview(1)">
          <small>重來</small>Again
        </button>
        <button class="rate-btn hard" @click="submitReview(2)">
          <small>困難</small>Hard
        </button>
        <button class="rate-btn good" @click="submitReview(3)">
          <small>良好</small>Good
        </button>
        <button class="rate-btn easy" @click="submitReview(4)">
          <small>簡單</small>Easy
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.review-container {
  max-width: 600px; margin: 0 auto; padding: 20px;
  height: 90vh; display: flex; flex-direction: column;
}

header { display: flex; justify-content: space-between; margin-bottom: 20px; color: #666; }
.btn-text { background: none; border: none; cursor: pointer; color: #666; font-size: 1rem; }

.flashcard {
  flex: 1; border: 1px solid #ddd; border-radius: 12px; padding: 30px;
  background: white; box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  display: flex; flex-direction: column; overflow-y: auto;
}

.card-face { margin-bottom: 20px; }
.label {
  font-weight: bold; color: #ccc; margin-bottom: 10px; font-size: 0.8rem; letter-spacing: 1px;
}

/* 底部控制區 (固定高度避免跳動) */
.controls { height: 80px; margin-top: 20px; }

.btn-reveal {
  width: 100%; height: 50px; background: #333; color: white; border: none; border-radius: 8px;
  font-size: 1.1rem; cursor: pointer;
}

.rating-grid { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 10px; }
.rate-btn {
  height: 60px; border: none; border-radius: 8px; cursor: pointer;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  font-weight: bold; color: white; transition: filter 0.2s;
}
.rate-btn small { font-weight: normal; font-size: 0.75rem; opacity: 0.8; margin-bottom: 2px; }
.rate-btn:hover { filter: brightness(1.1); }

/* Anki 經典配色 */
.again { background-color: #ff5252; } /* 紅 */
.hard { background-color: #607d8b; }  /* 灰 */
.good { background-color: #4caf50; }  /* 綠 */
.easy { background-color: #2196f3; }  /* 藍 */

.finished-state { text-align: center; margin-top: 50px; }
.btn-primary { background: #42b883; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }
</style>
