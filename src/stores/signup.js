import { defineStore } from "pinia"
import { ref, computed } from "vue"
import { storage, STORAGE_KEYS } from "../utils/storage"
import { generateId } from "../utils/id"
import { PERFORMANCE_STATUS } from "./performance"

export const useSignupStore = defineStore("signup", () => {
  const signups = ref(storage.get(STORAGE_KEYS.SIGNUPS) || [])

  const signupList = computed(() => signups.value)
  const signupCount = computed(() => signups.value.length)

  function persist() {
    storage.set(STORAGE_KEYS.SIGNUPS, signups.value)
  }

  function getSignupById(id) {
    return signups.value.find(s => s.id === id)
  }

  function getSignupsByPerformanceId(performanceId) {
    return signups.value.filter(s => s.performanceId === performanceId)
  }

  function getSignupsByUserId(userId) {
    return signups.value.filter(s => s.userId === userId)
  }

  function getSignup(performanceId, userId, partId) {
    return signups.value.find(s =>
      s.performanceId === performanceId &&
      s.userId === userId &&
      s.partId === partId
    )
  }

  function hasUserSignedUp(performanceId, userId) {
    return signups.value.some(s =>
      s.performanceId === performanceId && s.userId === userId
    )
  }

  function getUserSignupForPerformance(performanceId, userId) {
    return signups.value.find(s =>
      s.performanceId === performanceId && s.userId === userId
    )
  }

  function getSignupsByPartId(performanceId, partId) {
    return signups.value.filter(s =>
      s.performanceId === performanceId && s.partId === partId
    )
  }

  function createSignup(signupData, performanceStore, partStore) {
    const { performanceId, userId, partId, remark } = signupData

    const performance = performanceStore?.getPerformanceById(performanceId)
    if (!performance) {
      return { success: false, errors: ["演出单不存在"] }
    }

    if (performance.status === PERFORMANCE_STATUS.COMPLETED) {
      return { success: false, errors: ["演出已完成，不能报名"] }
    }

    const part = partStore?.getPartById(partId)
    if (!part) {
      return { success: false, errors: ["声部不存在"] }
    }

    if (hasUserSignedUp(performanceId, userId)) {
      return { success: false, errors: ["您已报名此演出，不能重复报名"] }
    }

    const newSignup = {
      id: generateId(),
      performanceId,
      userId,
      partId,
      remark: remark || "",
      status: "signed",
      createdAt: Date.now()
    }

    signups.value.push(newSignup)
    persist()
    return { success: true, signup: newSignup }
  }

  function cancelSignup(id) {
    const index = signups.value.findIndex(s => s.id === id)
    if (index === -1) {
      return { success: false, errors: ["报名记录不存在"] }
    }

    signups.value.splice(index, 1)
    persist()
    return { success: true }
  }

  function updateSignup(id, updates) {
    const index = signups.value.findIndex(s => s.id === id)
    if (index === -1) return null

    signups.value[index] = { ...signups.value[index], ...updates, updatedAt: Date.now() }
    persist()
    return signups.value[index]
  }

  function deleteSignupsByPerformanceId(performanceId) {
    const beforeLength = signups.value.length
    signups.value = signups.value.filter(s => s.performanceId !== performanceId)
    if (signups.value.length !== beforeLength) {
      persist()
    }
    return beforeLength - signups.value.length
  }

  function isPartFilled(performanceId, partId) {
    return getSignupsByPartId(performanceId, partId).length > 0
  }

  function getMissingKeyParts(performanceId, partStore, performanceStore) {
    if (!partStore || !performanceStore) return []

    const keyParts = partStore.keyParts
    return keyParts.filter(part => !isPartFilled(performanceId, part.id))
  }

  function canConfirmPerformance(performanceId, partStore, performanceStore) {
    const missing = getMissingKeyParts(performanceId, partStore, performanceStore)
    return missing.length === 0
  }

  if (!storage.get(STORAGE_KEYS.SIGNUPS)) {
    persist()
  }

  return {
    signups,
    signupList,
    signupCount,
    getSignupById,
    getSignupsByPerformanceId,
    getSignupsByUserId,
    getSignup,
    hasUserSignedUp,
    getUserSignupForPerformance,
    getSignupsByPartId,
    createSignup,
    cancelSignup,
    updateSignup,
    deleteSignupsByPerformanceId,
    isPartFilled,
    getMissingKeyParts,
    canConfirmPerformance
  }
})
