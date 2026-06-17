import { defineStore } from "pinia"
import { ref, computed } from "vue"
import { storage, STORAGE_KEYS } from "../utils/storage"
import { generateId } from "../utils/id"
import { EQUIPMENT_STATUS } from "./equipment"

export const PERFORMANCE_STATUS = {
  DRAFT: "draft",
  CONFIRMED: "confirmed",
  STARTED: "started",
  COMPLETED: "completed"
}

export const PERFORMANCE_STATUS_LABEL = {
  [PERFORMANCE_STATUS.DRAFT]: "草稿",
  [PERFORMANCE_STATUS.CONFIRMED]: "已确认",
  [PERFORMANCE_STATUS.STARTED]: "进行中",
  [PERFORMANCE_STATUS.COMPLETED]: "已完成"
}

export const PERFORMANCE_STATUS_FLOW = {
  [PERFORMANCE_STATUS.DRAFT]: [PERFORMANCE_STATUS.CONFIRMED],
  [PERFORMANCE_STATUS.CONFIRMED]: [PERFORMANCE_STATUS.DRAFT, PERFORMANCE_STATUS.STARTED],
  [PERFORMANCE_STATUS.STARTED]: [PERFORMANCE_STATUS.COMPLETED],
  [PERFORMANCE_STATUS.COMPLETED]: []
}

const defaultPerformances = []

export const usePerformanceStore = defineStore("performance", () => {
  const performances = ref(storage.get(STORAGE_KEYS.PERFORMANCES) || defaultPerformances)

  const performanceList = computed(() => performances.value)
  const draftPerformances = computed(() => performances.value.filter(p => p.status === PERFORMANCE_STATUS.DRAFT))
  const confirmedPerformances = computed(() => performances.value.filter(p => p.status === PERFORMANCE_STATUS.CONFIRMED))
  const startedPerformances = computed(() => performances.value.filter(p => p.status === PERFORMANCE_STATUS.STARTED))
  const completedPerformances = computed(() => performances.value.filter(p => p.status === PERFORMANCE_STATUS.COMPLETED))
  const performanceCount = computed(() => performances.value.length)

  function persist() {
    storage.set(STORAGE_KEYS.PERFORMANCES, performances.value)
  }

  function getPerformanceById(id) {
    return performances.value.find(p => p.id === id)
  }

  function canTransition(currentStatus, nextStatus) {
    const allowed = PERFORMANCE_STATUS_FLOW[currentStatus] || []
    return allowed.includes(nextStatus)
  }

  function validatePerformance(performance, songStore, equipmentStore) {
    const errors = []

    if (!performance.name || !performance.name.trim()) {
      errors.push("演出单名称不能为空")
    }

    if (!performance.performanceDate) {
      errors.push("演出日期不能为空")
    }

    if (!performance.songIds || performance.songIds.length === 0) {
      errors.push("至少需要关联一个曲目")
    }

    if (songStore) {
      const invalidSongIds = performance.songIds.filter(id => !songStore.getSongById(id))
      if (invalidSongIds.length > 0) {
        errors.push("存在无效的曲目关联")
      }
    }

    if (performance.equipmentIds && equipmentStore) {
      const invalidEquipmentIds = performance.equipmentIds.filter(id => {
        const eq = equipmentStore.getEquipmentById(id)
        return !eq || eq.status !== EQUIPMENT_STATUS.AVAILABLE
      })
      if (invalidEquipmentIds.length > 0) {
        errors.push("存在不可用的设备关联")
      }
    }

    return { valid: errors.length === 0, errors }
  }

  function createPerformance(performanceData, songStore, equipmentStore) {
    const data = {
      songIds: [],
      equipmentIds: [],
      ...performanceData
    }

    const validation = validatePerformance(data, songStore, equipmentStore)
    if (!validation.valid) {
      return { success: false, errors: validation.errors }
    }

    const newPerformance = {
      id: generateId(),
      status: PERFORMANCE_STATUS.DRAFT,
      ...data,
      createdAt: Date.now()
    }

    performances.value.push(newPerformance)
    persist()
    return { success: true, performance: newPerformance }
  }

  function updatePerformance(id, updates, songStore, equipmentStore) {
    const index = performances.value.findIndex(p => p.id === id)
    if (index === -1) {
      return { success: false, errors: ["演出单不存在"] }
    }

    const current = performances.value[index]
    const merged = { ...current, ...updates }

    if (updates.status && updates.status !== current.status) {
      if (!canTransition(current.status, updates.status)) {
        return { success: false, errors: [`不允许从 ${PERFORMANCE_STATUS_LABEL[current.status]} 变更为 ${PERFORMANCE_STATUS_LABEL[updates.status]}`] }
      }
    }

    if (updates.songIds !== undefined || updates.equipmentIds !== undefined || updates.name !== undefined || updates.performanceDate !== undefined) {
      const validation = validatePerformance(merged, songStore, equipmentStore)
      if (!validation.valid) {
        return { success: false, errors: validation.errors }
      }
    }

    performances.value[index] = { ...merged, updatedAt: Date.now() }
    persist()
    return { success: true, performance: performances.value[index] }
  }

  function deletePerformance(id) {
    const index = performances.value.findIndex(p => p.id === id)
    if (index === -1) return { success: false, errors: ["演出单不存在"] }

    const performance = performances.value[index]
    if (performance.status !== PERFORMANCE_STATUS.DRAFT) {
      return { success: false, errors: ["只能删除草稿状态的演出单"] }
    }

    performances.value.splice(index, 1)
    persist()
    return { success: true }
  }

  function transitionStatus(id, nextStatus, songStore, equipmentStore) {
    const performance = getPerformanceById(id)
    if (!performance) {
      return { success: false, errors: ["演出单不存在"] }
    }

    if (!canTransition(performance.status, nextStatus)) {
      return { success: false, errors: [`不允许从 ${PERFORMANCE_STATUS_LABEL[performance.status]} 变更为 ${PERFORMANCE_STATUS_LABEL[nextStatus]}`] }
    }

    if (nextStatus === PERFORMANCE_STATUS.CONFIRMED || nextStatus === PERFORMANCE_STATUS.STARTED) {
      const validation = validatePerformance(performance, songStore, equipmentStore)
      if (!validation.valid) {
        return { success: false, errors: validation.errors }
      }
    }

    return updatePerformance(id, { status: nextStatus }, songStore, equipmentStore)
  }

  function confirmPerformance(id, songStore, equipmentStore) {
    return transitionStatus(id, PERFORMANCE_STATUS.CONFIRMED, songStore, equipmentStore)
  }

  function startPerformance(id, songStore, equipmentStore) {
    return transitionStatus(id, PERFORMANCE_STATUS.STARTED, songStore, equipmentStore)
  }

  function completePerformance(id) {
    return transitionStatus(id, PERFORMANCE_STATUS.COMPLETED)
  }

  function backToDraft(id) {
    return transitionStatus(id, PERFORMANCE_STATUS.DRAFT)
  }

  function searchPerformances(keyword, statusFilter) {
    let result = performances.value
    if (statusFilter) {
      result = result.filter(p => p.status === statusFilter)
    }
    if (keyword) {
      const lowerKeyword = keyword.toLowerCase()
      result = result.filter(p =>
        p.name.toLowerCase().includes(lowerKeyword) ||
        (p.venue && p.venue.toLowerCase().includes(lowerKeyword)) ||
        (p.description && p.description.toLowerCase().includes(lowerKeyword))
      )
    }
    return result
  }

  function getSongsByPerformanceId(id, songStore) {
    const performance = getPerformanceById(id)
    if (!performance || !songStore) return []
    return performance.songIds.map(songId => songStore.getSongById(songId)).filter(Boolean)
  }

  function getEquipmentsByPerformanceId(id, equipmentStore) {
    const performance = getPerformanceById(id)
    if (!performance || !equipmentStore) return []
    return (performance.equipmentIds || []).map(eqId => equipmentStore.getEquipmentById(eqId)).filter(Boolean)
  }

  if (!storage.get(STORAGE_KEYS.PERFORMANCES)) {
    persist()
  }

  return {
    performances,
    performanceList,
    draftPerformances,
    confirmedPerformances,
    startedPerformances,
    completedPerformances,
    performanceCount,
    getPerformanceById,
    canTransition,
    validatePerformance,
    createPerformance,
    updatePerformance,
    deletePerformance,
    transitionStatus,
    confirmPerformance,
    startPerformance,
    completePerformance,
    backToDraft,
    searchPerformances,
    getSongsByPerformanceId,
    getEquipmentsByPerformanceId
  }
})

