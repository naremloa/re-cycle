<script setup lang="ts">
import { ofetch } from 'ofetch'
import { onMounted, ref } from 'vue'

interface Post {
  id: number
  title: string
  content: string
  notes: string
  createdAt: string
}

const title = import.meta.env.VITE_APP_TITLE
const msg = ref<string>('Loading...')
const posts = ref<Post[]>([])
const isCreating = ref(false)

async function fetchPosts() {
  try {
    posts.value = await ofetch<Post[]>('/api/v1/posts')
  }
  catch (error) {
    console.error('Failed to fetch posts:', error)
  }
}

async function createPost() {
  if (isCreating.value)
    return

  isCreating.value = true
  try {
    await ofetch('/api/v1/posts', { method: 'POST' })
    await fetchPosts()
  }
  catch (error) {
    console.error('Failed to create post:', error)
  }
  finally {
    isCreating.value = false
  }
}

onMounted(async () => {
  const { message } = await ofetch<{ message: string, timestamp: string }>('/api/v1/hello')
  msg.value = message
  await fetchPosts()
})
</script>

<template>
  <h1>{{ title }}</h1>
  <div>{{ msg }}</div>

  <div style="margin-top: 2rem;">
    <h2>Posts</h2>
    <button
      @click="createPost"
      :disabled="isCreating"
      style="margin-bottom: 1rem;"
    >
      {{ isCreating ? 'Creating...' : 'Create New Post' }}
    </button>

    <div v-if="posts.length === 0">
      No posts yet. Create one!
    </div>

    <div v-for="post in posts" :key="post.id" style="border: 1px solid #ccc; padding: 1rem; margin-bottom: 1rem;">
      <h3>{{ post.title }}</h3>
      <p>{{ post.content }}</p>
      <small>{{ post.createdAt }}</small>
    </div>
  </div>
</template>
