<template>
  <div id="app-wrapper">
    <header class="app-header">
      <div class="header-content">
        <h1 class="app-title" @click="goHome">🎵 社区乐队排练管理系统</h1>
        <div class="header-right" v-if="authStore.isLoggedIn">
          <span class="user-info">{{ authStore.currentUser?.name }}</span>
          <span :class="['role-badge', roleClass]">{{ roleLabel }}</span>
          <button class="btn btn-logout" @click="logout">退出登录</button>
        </div>
      </div>
    </header>
    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from './stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const roleLabel = computed(() => {
  const map = {
    leader: '队长',
    member: '成员',
    admin: '管理员',
    captain: '队长'
  }
  return map[authStore.currentUser?.role] || ''
})

const roleClass = computed(() => {
  const map = {
    leader: 'role-leader',
    captain: 'role-leader',
    member: 'role-member',
    admin: 'role-admin'
  }
  return map[authStore.currentUser?.role] || ''
})

const goHome = () => {
  if (authStore.isLoggedIn) {
    const role = authStore.currentUser?.role
    if (role === 'captain' || role === 'leader') {
      router.push('/leader')
    } else {
      router.push(`/${role}`)
    }
  } else {
    router.push('/')
  }
}

const logout = () => {
  authStore.logout()
  router.push('/')
}
</script>

<style scoped>
.app-header {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  padding: 16px 24px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-content {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.app-title {
  font-size: 22px;
  color: #667eea;
  cursor: pointer;
  user-select: none;
  margin: 0;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.role-badge {
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
}

.role-leader {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.role-member {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.role-admin {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.user-info {
  color: #34495e;
  font-weight: 500;
}

.main-content {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
  min-height: calc(100vh - 80px);
}

.btn-logout {
  padding: 6px 16px;
  border: none;
  border-radius: 6px;
  background: #ef4444;
  color: white;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}

.btn-logout:hover {
  background: #dc2626;
}
</style>
