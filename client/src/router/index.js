import { createRouter, createWebHistory } from 'vue-router'
import store from '../store'
import { showToast } from 'vant'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { requiresGuest: true }
  },
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/Home.vue'),
    meta: { requiresAuth: true, requiresRole: ['admin'] }
  },
  {
    path: '/upload',
    name: 'Upload',
    component: () => import('../views/Upload.vue'),
    meta: { requiresAuth: true, requiresRole: ['admin'] }
  },
  {
    path: '/questions',
    name: 'Questions',
    component: () => import('../views/Questions.vue'),
    meta: { requiresAuth: true, requiresRole: ['admin'] }
  },
  {
    path: '/records',
    name: 'Records',
    component: () => import('../views/Records.vue'),
    meta: { requiresAuth: true, requiresRole: ['admin'] }
  },
  {
    path: '/practice',
    name: 'Practice',
    component: () => import('../views/Practice.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/practice/stats',
    name: 'PracticeStats',
    component: () => import('../views/PracticeStats.vue'),
    meta: { requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  const isLoggedIn = store.getters.isLoggedIn
  const userRole = store.getters.userRole
  
  // 如果是访客允许的页面
  if (to.meta.allowGuest) {
    next()
    return
  }
  
  // 如果需要游客状态（如登录页）
  if (to.meta.requiresGuest) {
    if (isLoggedIn) {
      // 已登录用户根据角色重定向
      if (userRole === 'admin') {
        next('/')
      } else {
        next('/practice')
      }
    } else {
      next()
    }
    return
  }
  
  // 如果需要登录
  if (to.meta.requiresAuth) {
    if (!isLoggedIn) {
      showToast('请先登录')
      next('/login')
      return
    }
    
    // 检查角色权限
    if (to.meta.requiresRole && !to.meta.requiresRole.includes(userRole)) {
      showToast('权限不足')
      if (userRole === 'admin') {
        next('/')
      } else {
        next('/practice')
      }
      return
    }
  }
  
  next()
})

export default router