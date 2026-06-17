import { defineStore } from "pinia"
import { ref, computed } from "vue"
import { storage, STORAGE_KEYS } from "../utils/storage"
import { generateId } from "../utils/id"
import { EQUIPMENT_STATUS } from "./equipment"

export const PERFORMANCE_STATUS = {
  DRAFT: "draft",
  CONFIRMED: "confirmed",
  SUSPENDED: "suspended",
  STARTED: "started",
  COMPLETED: "completed"
}

export const PERFORMANCE_STATUS_LABEL = {
  [PERFORMANCE_STATUS.DRAFT]: "草稿",
  [PERFORMANCE_STATUS.CONFIRMED]: "已确认",
  [PERFORMANCE_STATUS.SUSPENDED]: "已挂起",
  [PERFORMANCE_STATUS.STARTED]: "进行中",
  [PERFORMANCE_STATUS.COMPLETED]: "已完成"
}

export const PERFORMANCE_STATUS_FLOW = {
  [PERFORMANCE_STATUS.DRAFT]: [PERFORMANCE_STATUS.CONFIRMED],
  [PERFORMANCE_STATUS.CONFIRMED]: [PERFORMANCE_STATUS.DRAFT, PERFORMANCE_STATUS.STARTED, PERFORMANCE_STATUS.SUSPENDED],
  [PERFORMANCE_STATUS.SUSPENDED]: [PERFORMANCE_STATUS.CONFIRMED, PERFORMANCE_STATUS.DRAFT],
  [PERFORMANCE_STATUS.STARTED]: [PERFORMANCE_STATUS.COMPLETED],
  [PERFORMANCE_STATUS.COMPLETED]: []
}

export const SONG_CHANGE_REASON = {
  SUPPLEMENT: "supplement",
  TECHNICAL: "technical",
  OTHER: "other"
}

export const SONG_CHANGE_REASON_LABEL = {
  [SONG_CHANGE_REASON.SUPPLEMENT]: "补录",
  [SONG_CHANGE_REASON.TECHNICAL]: "技术调整",
  [SONG_CHANGE_REASON.OTHER]: "其他"
}

const defaultPerformances = []

export const usePerformanceStore = defineStore("performance", () => {
  const performances = ref(storage.get(STORAGE_KEYS.PERFORMANCES) || defaultPerformances)
  const supplementRecords = ref(storage.get(STORAGE_KEYS.SUPPLEMENT_RECORDS) || [])

  const performanceList = computed(() => performances.value)
  const draftPerformances = computed(() => performances.value.filter(p => p.status === PERFORMANCE_STATUS.DRAFT))
  const confirmedPerformances = computed(() => performances.value.filter(p => p.status === PERFORMANCE_STATUS.CONFIRMED))
  const suspendedPerformances = computed(() => performances.value.filter(p => p.status === PERFORMANCE_STATUS.SUSPENDED))
  const startedPerformances = computed(() => performances.value.filter(p => p.status === PERFORMANCE_STATUS.STARTED))
  const completedPerformances = computed(() => performances.value.filter(p => p.status === PERFORMANCE_STATUS.COMPLETED))
  const performanceCount = computed(() => performances.value.length)

  function persist() {
    storage.set(STORAGE_KEYS.PERFORMANCES, performances.value)
  }

  function persistSupplement() {
    storage.set(STORAGE_KEYS.SUPPLEMENT_RECORDS, supplementRecords.value)
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
      suspendedReason: "",
      ...data,
      createdAt: Date.now()
    }

    performances.value.push(newPerformance)
    persist()
    return { success: true, performance: newPerformance }
  }

  function canModifySongs(performance) {
    if (!performance) return false
    if (performance.status === PERFORMANCE_STATUS.STARTED ||
        performance.status === PERFORMANCE_STATUS.COMPLETED) {
      return false
    }
    return true
  }

  function canDeleteSongs(performance) {
    if (!performance) return false
    if (performance.status === PERFORMANCE_STATUS.STARTED ||
        performance.status === PERFORMANCE_STATUS.COMPLETED) {
      return false
    }
    return true
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

    if (updates.songIds !== undefined) {
      const addedSongs = updates.songIds.filter(id => !current.songIds.includes(id))
      const removedSongs = current.songIds.filter(id => !updates.songIds.includes(id))

      if (current.status === PERFORMANCE_STATUS.STARTED || current.status === PERFORMANCE_STATUS.COMPLETED) {
        if (removedSongs.length > 0) {
          return { success: false, errors: ["排练已开始，不能删除曲目，仅允许补录新增"] }
        }
        if (addedSongs.length > 0 && !(updates._supplementNote)) {
          return { success: false, errors: ["排练已开始，新增曲目需通过补录流程"] }
        }
      }
    }

    if (updates.songIds !== undefined || updates.equipmentIds !== undefined || updates.name !== undefined || updates.performanceDate !== undefined) {
      const validation = validatePerformance(merged, songStore, equipmentStore)
      if (!validation.valid) {
        return { success: false, errors: validation.errors }
      }
    }

    const cleanUpdates = { ...updates }
    delete cleanUpdates._supplementNote

    performances.value[index] = { ...merged, ...cleanUpdates, updatedAt: Date.now() }
    persist()
    return { success: true, performance: performances.value[index] }
  }

  function addSupplementSong(performanceId, songId, reason, note, operatorId) {
    const perf = getPerformanceById(performanceId)
    if (!perf) return { success: false, errors: ["演出单不存在"] }
    if (perf.status !== PERFORMANCE_STATUS.STARTED && perf.status !== PERFORMANCE_STATUS.CONFIRMED) {
      return { success: false, errors: ["仅确认或进行中的演出单可补录曲目"] }
    }
    if (perf.songIds.includes(songId)) {
      return { success: false, errors: ["该曲目已在演出单中"] }
    }

    const record = {
      id: generateId(),
      performanceId,
      songId,
      reason: reason || SONG_CHANGE_REASON.SUPPLEMENT,
      note: note || "",
      operatorId: operatorId || null,
      createdAt: Date.now()
    }
    supplementRecords.value.push(record)
    persistSupplement()

    const newSongIds = [...perf.songIds, songId]
    return updatePerformance(performanceId, { songIds: newSongIds, _supplementNote: true })
  }

  function getSupplementRecordsByPerformanceId(performanceId) {
    return supplementRecords.value.filter(r => r.performanceId === performanceId)
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

  function transitionStatus(id, nextStatus, songStore, equipmentStore, extra) {
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

    const updates = { status: nextStatus, ...(extra || {}) }
    return updatePerformance(id, updates, songStore, equipmentStore)
  }

  function confirmPerformance(id, songStore, equipmentStore) {
    return transitionStatus(id, PERFORMANCE_STATUS.CONFIRMED, songStore, equipmentStore)
  }

  function startPerformance(id, songStore, equipmentStore) {
    return transitionStatus(id, PERFORMANCE_STATUS.STARTED, songStore, equipmentStore)
  }

  function suspendPerformance(id, reason) {
    return transitionStatus(id, PERFORMANCE_STATUS.SUSPENDED, null, null, { suspendedReason: reason || "" })
  }

  function resumePerformance(id) {
    return transitionStatus(id, PERFORMANCE_STATUS.CONFIRMED)
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

  function getPerformancesBySongId(songId) {
    return performances.value.filter(p => (p.songIds || []).includes(songId))
  }

  function removeSongFromPerformances(songId, allowedStatuses) {
    let affected = 0
    performances.value.forEach(p => {
      if (p.songIds && p.songIds.includes(songId) && allowedStatuses.includes(p.status)) {
        p.songIds = p.songIds.filter(id => id !== songId)
        p.updatedAt = Date.now()
        affected++
      }
    })
    if (affected > 0) persist()
    return affected
  }

  if (!storage.get(STORAGE_KEYS.PERFORMANCES)) {
    persist()
  }
  if (!storage.get(STORAGE_KEYS.SUPPLEMENT_RECORDS)) {
    persistSupplement()
  }

  return {
    performances,
    supplementRecords,
    performanceList,
    draftPerformances,
    confirmedPerformances,
    suspendedPerformances,
    startedPerformances,
    completedPerformances,
    performanceCount,
    getPerformanceById,
    canTransition,
    validatePerformance,
    canModifySongs,
    canDeleteSongs,
    createPerformance,
    updatePerformance,
    addSupplementSong,
    getSupplementRecordsByPerformanceId,
    deletePerformance,
    transitionStatus,
    confirmPerformance,
    startPerformance,
    suspendPerformance,
    resumePerformance,
    completePerformance,
    backToDraft,
    searchPerformances,
    getSongsByPerformanceId,
    getEquipmentsByPerformanceId,
    getPerformancesBySongId,
    removeSongFromPerformances
  }
})
