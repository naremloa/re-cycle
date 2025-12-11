<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../utils/api'

const router = useRouter()
const isRegister = ref(false)
const error = ref('')

const form = reactive({
  email: '',
  password: '',
})

function toggleMode() {
  isRegister.value = !isRegister.value
  error.value = ''
}

async function handleSubmit() {
  error.value = ''
  try {
    const endpoint = isRegister.value ? '/api/auth/register' : '/api/auth/login'
    const res = await api.client(endpoint, { method: 'POST', body: form })

    // 儲存 Token
    api.setToken(res.token)

    // 跳轉回首頁
    router.push('/')
  }
  catch (err: any) {
    error.value = err.message
  }
}
</script>

<template>
  <div class="login-container">
    <h2>{{ isRegister ? '註冊帳號' : '登入 Re-Call' }}</h2>

    <form @submit.prevent="handleSubmit">
      <div class="form-group">
        <label>Email</label>
        <input v-model="form.email" type="email" required>
      </div>

      <div class="form-group">
        <label>Password</label>
        <input v-model="form.password" type="password" required minlength="6">
      </div>

      <div v-if="error" class="error">
        {{ error }}
      </div>

      <button type="submit">
        {{ isRegister ? '註冊' : '登入' }}
      </button>
    </form>

    <p class="switch-mode" @click="toggleMode">
      {{ isRegister ? '已有帳號？去登入' : '沒有帳號？去註冊' }}
    </p>
  </div>
</template>

<style scoped>
.login-container { max-width: 300px; margin: 50px auto; padding: 20px; border: 1px solid #ccc; border-radius: 8px; }
.form-group { margin-bottom: 15px; }
input { width: 100%; padding: 8px; box-sizing: border-box; }
button { width: 100%; padding: 10px; background: #42b883; color: white; border: none; cursor: pointer; }
.error { color: red; margin-bottom: 10px; font-size: 0.9em; }
.switch-mode { text-align: center; margin-top: 10px; color: blue; cursor: pointer; font-size: 0.9em; }
</style>
