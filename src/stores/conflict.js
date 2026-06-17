import { defineStore } from "pinia"
import { ref, computed } from "vue"
import { storage, STORAGE_KEYS } from "../utils/storage"
import { generateId } from "../utils/id"

export const CONFLICT_TYPE = {
  EQUIPMENT: "equipment",
  VENUE: "venue",
  VENUE_FACILITY: "venue_facility",
  PART: "part",
  SCHEDULE: "schedule"
}

export const CONFLICT_TYPE_LABEL = {
  [CONFLICT_TYPE.EQUIPMENT]: "设备冲突",
  [CONFLICT_TYPE.VENUE]: "场地冲突",
  [CONFLICT_TYPE.VENUE_FACILITY]: "场地设施冲突",
  [CONFLICT_TYPE.PART]: "声部人员不足",
  [CONFLICT_TYPE.SCHEDULE]: "时间冲突"
}

export const CONFLICT_SEVERITY = {
  CRITICAL: "critical",
  WARNING: "warning",
  INFO: "info"
}

export const CONFLICT_SEVERITY_LABEL = {
  [CONFLICT_SEVERITY.CRITICAL]: "严重",
  [CONFLICT_SEVERITY.WARNING]: "警告",
  [CONFLICT_SEVERITY.INFO]: "提示"
}

export const CONFLICT_STATUS = {
  PENDING_COORDINATION: "pending_coordination",
  RESOLVED: "resolved",
  IGNORED: "ignored"
}

export const CONFLICT_STATUS_LABEL = {
  [CONFLICT_STATUS.PENDING_COORDINATION]: "待协调",
  [CONFLICT_STATUS.RESOLVED]: "已解决",
  [CONFLICT_STATUS.IGNORED]: "已忽略"
}

export const useConflictStore = defineStore("conflict", () => {
  const conflicts = ref(storage.get(STORAGE_KEYS.CONFLICTS) || [])

  const conflictList = computed(() => conflicts.value)
  const pendingConflicts = computed(() =>
    conflicts.value.filter(c => c.status === CONFLICT_STATUS.PENDING_COORDINATION)
  )
  const conflictCount = computed(() => conflicts.value.length)
  const pendingCount = computed(() => pendingConflicts.value.length)

  function persist() {
    storage.set(STORAGE_KEYS.CONFLICTS, conflicts.value)
  }

  function getConflictById(id) {
    return conflicts.value.find(c => c.id === id)
  }

  function getConflictsByPerformanceId(performanceId) {
    return conflicts.value.filter(c => c.performanceId === performanceId)
  }

  function getPendingConflictsByPerformanceId(performanceId) {
    return conflicts.value.filter(c =>
      c.performanceId === performanceId && c.status === CONFLICT_STATUS.PENDING_COORDINATION
    )
  }

  function getConflictsByType(type) {
    return conflicts.value.filter(c => c.type === type)
  }

  function createConflict(conflictData) {
    const newConflict = {
      id: generateId(),
      status: CONFLICT_STATUS.PENDING_COORDINATION,
      severity: CONFLICT_SEVERITY.WARNING,
      affectedSongIds: [],
      affectedEquipmentIds: [],
      affectedFacilityIds: [],
      suggestedWindows: [],
      resolutionNote: "",
      createdAt: Date.now(),
      ...conflictData
    }

    conflicts.value.push(newConflict)
    persist()
    return newConflict
  }

  function createVenueFacilityConflict(data) {
    return createConflict({
      type: CONFLICT_TYPE.VENUE_FACILITY,
      severity: CONFLICT_SEVERITY.CRITICAL,
      title: data.title || "场地设施档期冲突",
      description: data.description,
      performanceId: data.performanceId,
      songId: data.songId || null,
      venueId: data.venueId,
      facilityType: data.facilityType,
      affectedSongIds: data.affectedSongIds || (data.songId ? [data.songId] : []),
      affectedFacilityIds: data.affectedFacilityIds || [],
      conflictingSchedule: data.conflictingSchedule || null,
      suggestedWindows: data.suggestedWindows || []
    })
  }

  function createEquipmentConflict(data) {
    return createConflict({
      type: CONFLICT_TYPE.EQUIPMENT,
      severity: CONFLICT_SEVERITY.WARNING,
      title: data.title || "设备档期冲突",
      description: data.description,
      performanceId: data.performanceId,
      songId: data.songId || null,
      affectedSongIds: data.affectedSongIds || [],
      affectedEquipmentIds: data.affectedEquipmentIds || [],
      suggestedWindows: data.suggestedWindows || []
    })
  }

  function createPartShortageConflict(data) {
    return createConflict({
      type: CONFLICT_TYPE.PART,
      severity: CONFLICT_SEVERITY.CRITICAL,
      title: data.title || "声部人员不足",
      description: data.description,
      performanceId: data.performanceId,
      songId: data.songId || null,
      affectedSongIds: data.affectedSongIds || (data.songId ? [data.songId] : []),
      partId: data.partId,
      partName: data.partName,
      required: data.required,
      available: data.available,
      backupCandidates: data.backupCandidates || [],
      recommendedAction: data.recommendedAction || null
    })
  }

  function markAffectedPending(conflictId, affectedIds, markFn) {
    const conflict = getConflictById(conflictId)
    if (!conflict) return { success: false, errors: ["冲突不存在"] }
    if (typeof markFn === "function") {
      markFn(conflict, affectedIds)
    }
    persist()
    return { success: true, conflict }
  }

  function updateConflict(id, updates) {
    const index = conflicts.value.findIndex(c => c.id === id)
    if (index === -1) return null

    conflicts.value[index] = {
      ...conflicts.value[index],
      ...updates,
      updatedAt: Date.now()
    }
    persist()
    return conflicts.value[index]
  }

  function resolveConflict(id, resolutionNote, resolvedById) {
    return updateConflict(id, {
      status: CONFLICT_STATUS.RESOLVED,
      resolutionNote: resolutionNote || "",
      resolvedAt: Date.now(),
      resolvedById: resolvedById || null
    })
  }

  function ignoreConflict(id, ignoreReason, ignoredById) {
    return updateConflict(id, {
      status: CONFLICT_STATUS.IGNORED,
      ignoreReason: ignoreReason || "",
      ignoredAt: Date.now(),
      ignoredById: ignoredById || null
    })
  }

  function reopenConflict(id) {
    return updateConflict(id, {
      status: CONFLICT_STATUS.PENDING_COORDINATION
    })
  }

  function setSuggestedWindows(id, windows) {
    return updateConflict(id, { suggestedWindows: windows || [] })
  }

  function appendSuggestedWindow(id, window) {
    const c = getConflictById(id)
    if (!c) return null
    const newWindows = [...(c.suggestedWindows || []), window]
    return setSuggestedWindows(id, newWindows)
  }

  function searchConflicts(keyword, typeFilter, statusFilter, performanceId) {
    let result = conflicts.value
    if (performanceId) {
      result = result.filter(c => c.performanceId === performanceId)
    }
    if (typeFilter) {
      result = result.filter(c => c.type === typeFilter)
    }
    if (statusFilter) {
      result = result.filter(c => c.status === statusFilter)
    }
    if (keyword) {
      const lowerKeyword = keyword.toLowerCase()
      result = result.filter(c =>
        (c.title && c.title.toLowerCase().includes(lowerKeyword)) ||
        (c.description && c.description.toLowerCase().includes(lowerKeyword))
      )
    }
    return result
  }

  function getAllConflictsMatrix() {
    return conflicts.value.map(c => ({
      id: c.id,
      type: c.type,
      typeLabel: CONFLICT_TYPE_LABEL[c.type],
      status: c.status,
      statusLabel: CONFLICT_STATUS_LABEL[c.status],
      severity: c.severity,
      severityLabel: CONFLICT_SEVERITY_LABEL[c.severity],
      title: c.title,
      description: c.description,
      performanceId: c.performanceId,
      songId: c.songId,
      affectedSongIds: c.affectedSongIds,
      affectedEquipmentIds: c.affectedEquipmentIds,
      affectedFacilityIds: c.affectedFacilityIds,
      facilityType: c.facilityType || null,
      partName: c.partName || null,
      hasSuggestedWindows: (c.suggestedWindows || []).length > 0,
      createdAt: c.createdAt
    }))
  }

  if (!storage.get(STORAGE_KEYS.CONFLICTS)) {
    persist()
  }

  return {
    conflicts,
    conflictList,
    pendingConflicts,
    conflictCount,
    pendingCount,
    getConflictById,
    getConflictsByPerformanceId,
    getPendingConflictsByPerformanceId,
    getConflictsByType,
    createConflict,
    createVenueFacilityConflict,
    createEquipmentConflict,
    createPartShortageConflict,
    markAffectedPending,
    updateConflict,
    resolveConflict,
    ignoreConflict,
    reopenConflict,
    setSuggestedWindows,
    appendSuggestedWindow,
    searchConflicts,
    getAllConflictsMatrix
  }
})
