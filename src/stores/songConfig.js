import { defineStore } from "pinia"
import { ref, computed } from "vue"
import { storage, STORAGE_KEYS } from "../utils/storage"
import { generateId } from "../utils/id"

export const SONG_CONFIG_PART_ROLE = {
  LEAD: "lead",
  MAIN: "main",
  BACKUP: "backup"
}

export const SONG_CONFIG_PART_ROLE_LABEL = {
  [SONG_CONFIG_PART_ROLE.LEAD]: "领奏",
  [SONG_CONFIG_PART_ROLE.MAIN]: "主力",
  [SONG_CONFIG_PART_ROLE.BACKUP]: "替补"
}

export const useSongConfigStore = defineStore("songConfig", () => {
  const songConfigs = ref(storage.get(STORAGE_KEYS.SONG_CONFIGS) || [])

  const songConfigList = computed(() => songConfigs.value)
  const songConfigCount = computed(() => songConfigs.value.length)

  function persist() {
    storage.set(STORAGE_KEYS.SONG_CONFIGS, songConfigs.value)
  }

  function getConfigById(id) {
    return songConfigs.value.find(sc => sc.id === id)
  }

  function getConfigsByPerformanceId(performanceId) {
    return songConfigs.value.filter(sc => sc.performanceId === performanceId)
  }

  function getConfigsBySongId(songId) {
    return songConfigs.value.filter(sc => sc.songId === songId)
  }

  function getConfig(performanceId, songId) {
    return songConfigs.value.find(sc =>
      sc.performanceId === performanceId && sc.songId === songId
    )
  }

  function ensureConfig(performanceId, songId) {
    let cfg = getConfig(performanceId, songId)
    if (!cfg) {
      cfg = createConfig({
        performanceId,
        songId,
        scoreVersion: "",
        conductorUserId: null,
        partAssignments: [],
        requiredMinCount: {},
        notes: ""
      })
    }
    return cfg
  }

  function createConfig(configData) {
    const newConfig = {
      id: generateId(),
      scoreVersion: "",
      conductorUserId: null,
      partAssignments: [],
      requiredMinCount: {},
      notes: "",
      ...configData,
      createdAt: Date.now()
    }
    songConfigs.value.push(newConfig)
    persist()
    return newConfig
  }

  function updateConfig(id, updates) {
    const index = songConfigs.value.findIndex(sc => sc.id === id)
    if (index === -1) return null
    songConfigs.value[index] = { ...songConfigs.value[index], ...updates, updatedAt: Date.now() }
    persist()
    return songConfigs.value[index]
  }

  function upsertConfig(performanceId, songId, updates) {
    const cfg = ensureConfig(performanceId, songId)
    return updateConfig(cfg.id, updates)
  }

  function deleteConfig(id) {
    const index = songConfigs.value.findIndex(sc => sc.id === id)
    if (index === -1) return false
    songConfigs.value.splice(index, 1)
    persist()
    return true
  }

  function deleteConfigsByPerformanceId(performanceId) {
    const before = songConfigs.value.length
    songConfigs.value = songConfigs.value.filter(sc => sc.performanceId !== performanceId)
    if (songConfigs.value.length !== before) persist()
    return before - songConfigs.value.length
  }

  function setScoreVersion(performanceId, songId, scoreVersion) {
    return upsertConfig(performanceId, songId, { scoreVersion })
  }

  function setConductor(performanceId, songId, conductorUserId) {
    return upsertConfig(performanceId, songId, { conductorUserId })
  }

  function setPartAssignment(performanceId, songId, partId, userId, role = SONG_CONFIG_PART_ROLE.MAIN) {
    const cfg = ensureConfig(performanceId, songId)
    const assignments = [...(cfg.partAssignments || [])]
    const existingIdx = assignments.findIndex(a => a.partId === partId && a.userId === userId)
    if (existingIdx >= 0) {
      assignments[existingIdx] = { ...assignments[existingIdx], role }
    } else {
      assignments.push({ partId, userId, role, assignedAt: Date.now() })
    }
    return updateConfig(cfg.id, { partAssignments: assignments })
  }

  function removePartAssignment(performanceId, songId, partId, userId) {
    const cfg = getConfig(performanceId, songId)
    if (!cfg) return null
    const assignments = (cfg.partAssignments || []).filter(a => !(a.partId === partId && a.userId === userId))
    return updateConfig(cfg.id, { partAssignments: assignments })
  }

  function setRequiredMinCount(performanceId, songId, partId, minCount) {
    const cfg = ensureConfig(performanceId, songId)
    const requiredMinCount = { ...(cfg.requiredMinCount || {}) }
    if (minCount && minCount > 0) {
      requiredMinCount[partId] = minCount
    } else {
      delete requiredMinCount[partId]
    }
    return updateConfig(cfg.id, { requiredMinCount })
  }

  function getPartAssignmentsByRole(performanceId, songId, role) {
    const cfg = getConfig(performanceId, songId)
    if (!cfg) return []
    return (cfg.partAssignments || []).filter(a => a.role === role)
  }

  function getLeads(performanceId, songId) {
    return getPartAssignmentsByRole(performanceId, songId, SONG_CONFIG_PART_ROLE.LEAD)
  }

  function getBackups(performanceId, songId, partId) {
    const cfg = getConfig(performanceId, songId)
    if (!cfg) return []
    return (cfg.partAssignments || []).filter(a =>
      a.role === SONG_CONFIG_PART_ROLE.BACKUP && (!partId || a.partId === partId)
    )
  }

  if (!storage.get(STORAGE_KEYS.SONG_CONFIGS)) {
    persist()
  }

  return {
    songConfigs,
    songConfigList,
    songConfigCount,
    getConfigById,
    getConfigsByPerformanceId,
    getConfigsBySongId,
    getConfig,
    ensureConfig,
    createConfig,
    updateConfig,
    upsertConfig,
    deleteConfig,
    deleteConfigsByPerformanceId,
    setScoreVersion,
    setConductor,
    setPartAssignment,
    removePartAssignment,
    setRequiredMinCount,
    getPartAssignmentsByRole,
    getLeads,
    getBackups
  }
})
