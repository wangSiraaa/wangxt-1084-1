import { defineStore } from "pinia"
import { ref, computed } from "vue"
import { storage, STORAGE_KEYS } from "../utils/storage"
import { generateId } from "../utils/id"

const defaultUsers = [
  { id: generateId(), username: "admin", password: "admin123", name: "系统管理员", role: "admin", createdAt: Date.now() },
  { id: generateId(), username: "captain", password: "cap123", name: "张队长", role: "captain", createdAt: Date.now() },
  { id: generateId(), username: "member1", password: "mem123", name: "李成员", role: "member", createdAt: Date.now() },
  { id: generateId(), username: "member2", password: "mem456", name: "王成员", role: "member", createdAt: Date.now() }
]

export const useAuthStore = defineStore("auth", () => {
  const users = ref(storage.get(STORAGE_KEYS.USERS) || defaultUsers)
  const currentUser = ref(storage.get(STORAGE_KEYS.AUTH_USER) || null)

  const isLoggedIn = computed(() => !!currentUser.value)
  const isAdmin = computed(() => currentUser.value?.role === "admin")
  const isCaptain = computed(() => currentUser.value?.role === "captain")
  const isMember = computed(() => currentUser.value?.role === "member")

  function persistUsers() {
    storage.set(STORAGE_KEYS.USERS, users.value)
  }

  function persistCurrentUser() {
    if (currentUser.value) {
      storage.set(STORAGE_KEYS.AUTH_USER, currentUser.value)
    } else {
      storage.remove(STORAGE_KEYS.AUTH_USER)
    }
  }

  function login(username, password) {
    const user = users.value.find(u => u.username === username && u.password === password)
    if (!user) {
      return { success: false, message: "用户名或密码错误" }
    }
    const { password: _, ...userInfo } = user
    currentUser.value = userInfo
    persistCurrentUser()
    return { success: true, user: userInfo }
  }

  function logout() {
    currentUser.value = null
    persistCurrentUser()
  }

  function getUserById(id) {
    return users.value.find(u => u.id === id)
  }

  if (!storage.get(STORAGE_KEYS.USERS)) {
    persistUsers()
  }

  return {
    users,
    currentUser,
    isLoggedIn,
    isAdmin,
    isCaptain,
    isMember,
    login,
    logout,
    getUserById
  }
})

