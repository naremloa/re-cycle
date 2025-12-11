import { ofetch } from 'ofetch'
import { ref } from 'vue'

// 狀態：是否已登入
export const isAuthenticated = ref(!!localStorage.getItem('token'))

// 內部使用的登出邏輯
function handleLogout() {
  localStorage.removeItem('token')
  isAuthenticated.value = false

  // 避免在登入頁重複跳轉
  if (window.location.pathname !== '/login') {
    window.location.href = '/login'
  }
}

// 建立一個設定好的 fetch 實例
const client = ofetch.create({
  // 請求攔截器 (Request Interceptor)
  onRequest({ options }) {
    const token = localStorage.getItem('token')
    if (token) {
      // 確保 headers 存在並設定 Authorization
      options.headers = new Headers(options.headers)
      options.headers.set('Authorization', `Bearer ${token}`)
    }
  },

  // 回應錯誤攔截器 (Response Error Interceptor)
  onResponseError({ response }) {
    // 如果是 401 Unauthorized，直接登出
    if (response.status === 401) {
      handleLogout()
    }
  },
})

// 匯出 API 封裝物件 (保持與原本介面一致，方便 Vue 元件使用)
export const api = {
  // 設定 Token
  setToken(token: string) {
    localStorage.setItem('token', token)
    isAuthenticated.value = true
  },

  // 登出
  logout: handleLogout,

  client,
}
