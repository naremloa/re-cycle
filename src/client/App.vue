<script setup lang="ts">
import { ofetch } from 'ofetch'
import { onMounted, ref } from 'vue'

const title = import.meta.env.VITE_APP_TITLE
const msg = ref<string>('Loading...')

onMounted(async () => {
  const { message } = await ofetch<{ message: string, timestamp: string }>('/api/hello')
  msg.value = message
})
</script>

<template>
  <h1>{{ title }}</h1>
  <div>{{ msg }}</div>
</template>
