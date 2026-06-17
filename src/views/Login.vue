<template>
  <div class="login-container">
    <div class="login-card">
      <div class="login-header">
        <div class="logo-icon">🎵</div>
        <h2>社区乐队排练管理系统</h2>
        <p class="subtitle">欢迎回来，请登录您的账号</p>
      </div>

      <form class="login-form" @submit.prevent="handleLogin">
        <div class="form-group">
          <label for="username">用户名</label>
          <input
            id="username"
            v-model="form.username"
            type="text"
            placeholder="请输入用户名"
            autocomplete="username"
          />
        </div>

        <div class="form-group">
          <label for="password">密码</label>
          <input
            id="password"
            v-model="form.password"
            type="password"
            placeholder="请输入密码"
            autocomplete="current-password"
          />
        </div>

        <div v-if="errorMsg" class="error-message">
          {{ errorMsg }}
        </div>

        <button type="submit" class="btn btn-primary btn-login" :disabled="loading">
          {{ loading ? '登录中...' : '登 录' }}
        </button>
      </form>

      <div class="demo-accounts">
        <h4>演示账号</h4>
        <div class="accounts-list">
          <div class="account-item" @click="fillAccount('captain', 'cap123')">
            <span class="role-tag tag-leader">队长</span>
            <span class="account-info">captain / cap123</span>
          </div>
          <div class="account-item" @click="fillAccount('member1', 'mem123')">
            <span class="role-tag tag-member">成员</span>
            <span class="account-info">member1 / mem123</span>
          </div>
          <div class="account-item" @click="fillAccount('member2', 'mem456')">
            <span class="role-tag tag-member">成员</span>
            <span class="account-info">member2 / mem456</span>
          </div>
          <div class="account-item" @click="fillAccount('admin', 'admin123')">
            <span class="role-tag tag-admin">管理员</span>
            <span class="account-info">admin / admin123</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const form = reactive({
  username: '',
  password: ''
})

const errorMsg = ref('')
const loading = ref(false)

function handleLogin() {
  errorMsg.value = ''

  if (!form.username.trim()) {
    errorMsg.value = '请输入用户名'
    return
  }
  if (!form.password.trim()) {
    errorMsg.value = '请输入密码'
    return
  }

  loading.value = true
  setTimeout(() => {
    const result = authStore.login(form.username.trim(), form.password)
    loading.value = false

    if (!result.success) {
      errorMsg.value = result.message
      return
    }

    const role = result.user.role
    if (role === 'captain' || role === 'leader') {
      router.push('/leader')
    } else {
      router.push(`/${role}`)
    }
  }, 300)
}

function fillAccount(username, password) {
  form.username = username
  form.password = password
  errorMsg.value = ''
}
</script>

<style scoped>
.login-container {
  min-height: calc(100vh - 80px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.login-card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  padding: 40px;
  width: 100%;
  max-width: 440px;
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.logo-icon {
  font-size: 56px;
  margin-bottom: 12px;
}

.login-header h2 {
  color: #1f2937;
  font-size: 24px;
  margin: 0 0 8px 0;
}

.subtitle {
  color: #6b7280;
  margin: 0;
  font-size: 14px;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.form-group input {
  padding: 12px 14px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.2s;
  outline: none;
}

.form-group input:focus {
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.15);
}

.error-message {
  background: #fef2f2;
  color: #dc2626;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 13px;
  border: 1px solid #fecaca;
}

.btn-login {
  padding: 12px;
  font-size: 15px;
  font-weight: 600;
}

.btn-login:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.demo-accounts {
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid #e5e7eb;
}

.demo-accounts h4 {
  margin: 0 0 12px 0;
  font-size: 13px;
  color: #6b7280;
  font-weight: 500;
}

.accounts-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.account-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  background: #f9fafb;
  cursor: pointer;
  transition: all 0.2s;
}

.account-item:hover {
  background: #f3f4f6;
}

.role-tag {
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  color: white;
}

.tag-leader {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.tag-member {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.tag-admin {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.account-info {
  font-size: 13px;
  color: #4b5563;
  font-family: 'Monaco', monospace;
}
</style>
