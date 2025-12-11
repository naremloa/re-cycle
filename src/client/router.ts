import { createRouter, createWebHistory } from 'vue-router'
import { isAuthenticated } from './utils/api'
import ReviewSession from './views/ReviewSession.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', component: () => import('./views/Login.vue'), meta: { public: true } },
    { path: '/', component: () => import('./views/Dashboard.vue') },
    { path: '/collections/:id', component: () => import('./views/CollectionDetail.vue') },
    { path: '/collections/:id/review', component: ReviewSession },
  ],
})

// 路由守衛
router.beforeEach((to, _, next) => {
  if (!to.meta.public && !isAuthenticated.value) {
    return next('/login')
  }
  next()
})

export default router
