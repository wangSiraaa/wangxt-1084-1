import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const routes = [
  {
    path: '/',
    name: 'Login',
    component: () => import('../views/Login.vue')
  },
  {
    path: '/leader',
    name: 'LeaderDashboard',
    component: () => import('../views/LeaderDashboard.vue'),
    meta: { role: ['captain', 'leader'] }
  },
  {
    path: '/member',
    name: 'MemberDashboard',
    component: () => import('../views/MemberDashboard.vue'),
    meta: { role: ['member'] }
  },
  {
    path: '/admin',
    name: 'AdminDashboard',
    component: () => import('../views/AdminDashboard.vue'),
    meta: { role: ['admin'] }
  },
  {
    path: '/conflicts',
    name: 'ConflictMatrix',
    component: () => import('../views/ConflictMatrix.vue'),
    meta: { role: ['admin', 'captain', 'leader', 'member'] }
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  if (to.meta.role) {
    const allowedRoles = Array.isArray(to.meta.role) ? to.meta.role : [to.meta.role]
    if (!allowedRoles.includes(authStore.currentUser?.role)) {
      next('/')
    } else {
      next()
    }
  } else {
    next()
  }
})

export default router
