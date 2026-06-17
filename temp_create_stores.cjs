const fs = require('fs');
const path = require('path');

const storesDir = '/Users/mingyuan/workspace/sihuo/wangxtw3/1084/src/stores';

const conflictContent = `import { defineStore } from "pinia"
import { ref, computed } from "vue"
import { storage, STORAGE_KEYS } from "../utils/storage"
import { generateId } from "../utils/id"

export const CONFLICT_STATUS = {
  PENDING: "pending",
  RESOLVED: "resolved",
  IGNORED: "ignored"
}

export const CONFLICT_TYPE = {
  EQUIPMENT: "equipment",
  VENUE: "venue",
  VENUE_FACILITY: "venue_facility",
  PART: "part",
  SCHEDULE: "schedule"
}

export const CONFLICT_STATUS_LABEL = {
  [CONFLICT_STATUS.PENDING]: "待处理",
  [CONFLICT_STATUS.RESOLVED]: "已解决",
  [CONFLICT_STATUS.IGNORED]: "已忽略"
}

export const CONFLICT_TYPE_LABEL = {
  [CONFLICT_TYPE.EQUIPMENT]: "设备冲突",
  [CONFLICT_TYPE.VENUE]: "场地冲突",
  [CONFLICT_TYPE.VENUE_FACILITY]: "场地设施冲突",
  [CONFLICT_TYPE.PART]: "声部冲突",
  [CONFLICT_TYPE.SCHEDULE]: "时间冲突"
}

export const useConflictStore = defineStore("conflict", () => {
  const conflicts = ref(storage.get(STORAGE_KEYS.CONFLICTS) || [])

  const conflictList = computed(() => conflicts.value)
  const activeConflicts = computed(() => conflicts.value.filter(c => c.status === CONFLICT_STATUS.PENDING))
  const conflictCount = computed(() => conflicts.value.length)

  function persist() {
    storage.set(STORAGE_KEYS.CONFLICTS, conflicts.value)
  }

  function getConflictById(id) {
    return conflicts.value.find(c => c.id === id)
  }

  function getConflictsByPerformanceId(performanceId) {
    return conflicts.value.filter(c => c.performanceId === performanceId)
  }

  function createConflict(conflictData) {
    const newConflict = {
      id: generateId(),
      suggestedWindows: [],
      status: CONFLICT_STATUS.PENDING,
      resolvedAt: null,
      resolvedBy: null,
      ...conflictData,
      createdAt: Date.now()
    }
    conflicts.value.push(newConflict)
    persist()
    return newConflict
  }

  function updateConflict(id, updates) {
    const index = conflicts.value.findIndex(c => c.id === id)
    if (index === -1) return null
    conflicts.value[index] = { ...conflicts.value[index], ...updates, updatedAt: Date.now() }
    persist()
    return conflicts.value[index]
  }

  function markResolved(id, userId) {
    return updateConflict(id, {
      status: CONFLICT_STATUS.RESOLVED,
      resolvedAt: Date.now(),
      resolvedBy: userId || null
    })
  }

  function markPending(id) {
    return updateConflict(id, {
      status: CONFLICT_STATUS.PENDING,
      resolvedAt: null,
      resolvedBy: null
    })
  }

  function getActiveConflicts(performanceId) {
    const result = conflicts.value.filter(c => c.status === CONFLICT_STATUS.PENDING)
    if (performanceId) {
      return result.filter(c => c.performanceId === performanceId)
    }
    return result
  }

  if (!storage.get(STORAGE_KEYS.CONFLICTS)) {
    persist()
  }

  return {
    conflicts,
    conflictList,
    activeConflicts,
    conflictCount,
    getConflictById,
    getConflictsByPerformanceId,
    createConflict,
    updateConflict,
    markResolved,
    markPending,
    getActiveConflicts
  }
})
`;

const songConfigContent = `import { defineStore } from "pinia"
import { ref, computed } from "vue"
import { storage, STORAGE_KEYS } from "../utils/storage"
import { generateId } from "../utils/id"

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

  function createConfig(configData) {
    const newConfig = {
      id: generateId(),
      conductorUserId: null,
      backupPartIds: [],
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

  function deleteConfig(id) {
    const index = songConfigs.value.findIndex(sc => sc.id === id)
    if (index === -1) return false
    songConfigs.value.splice(index, 1)
    persist()
    return true
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
    createConfig,
    updateConfig,
    deleteConfig
  }
})
`;

const venueContent = `import { defineStore } from "pinia"
import { ref, computed } from "vue"
import { storage, STORAGE_KEYS } from "../utils/storage"
import { generateId } from "../utils/id"

export const VENUE_STATUS = {
  AVAILABLE: "available",
  MAINTENANCE: "maintenance",
  OCCUPIED: "occupied"
}

export const VENUE_STATUS_LABEL = {
  [VENUE_STATUS.AVAILABLE]: "可用",
  [VENUE_STATUS.MAINTENANCE]: "维护中",
  [VENUE_STATUS.OCCUPIED]: "已占用"
}

const defaultVenues = [
  {
    id: generateId(),
    name: "主排练厅",
    location: "艺术中心1楼",
    capacity: 50,
    facilities: ["音响", "话筒", "电源", "钢琴"],
    status: VENUE_STATUS.AVAILABLE,
    description: "大型综合排练场地，配备专业音响设备",
    createdAt: Date.now()
  },
  {
    id: generateId(),
    name: "小型练习室A",
    location: "艺术中心2楼201",
    capacity: 10,
    facilities: ["电源", "钢琴"],
    status: VENUE_STATUS.AVAILABLE,
    description: "适合小组练习和声乐训练",
    createdAt: Date.now()
  },
  {
    id: generateId(),
    name: "音乐厅",
    location: "艺术中心B区",
    capacity: 200,
    facilities: ["音响", "话筒", "电源", "钢琴", "灯光"],
    status: VENUE_STATUS.AVAILABLE,
    description: "正式演出场地，配备专业灯光音响",
    createdAt: Date.now()
  }
]

export const useVenueStore = defineStore("venue", () => {
  const venues = ref(storage.get(STORAGE_KEYS.VENUES) || defaultVenues)

  const venueList = computed(() => venues.value)
  const availableVenues = computed(() => venues.value.filter(v => v.status === VENUE_STATUS.AVAILABLE))
  const venueCount = computed(() => venues.value.length)

  function persist() {
    storage.set(STORAGE_KEYS.VENUES, venues.value)
  }

  function getVenueById(id) {
    return venues.value.find(v => v.id === id)
  }

  function addVenue(venue) {
    const newVenue = {
      id: generateId(),
      status: VENUE_STATUS.AVAILABLE,
      facilities: [],
      ...venue,
      createdAt: Date.now()
    }
    venues.value.push(newVenue)
    persist()
    return newVenue
  }

  function updateVenue(id, updates) {
    const index = venues.value.findIndex(v => v.id === id)
    if (index === -1) return null
    venues.value[index] = { ...venues.value[index], ...updates, updatedAt: Date.now() }
    persist()
    return venues.value[index]
  }

  function deleteVenue(id) {
    const index = venues.value.findIndex(v => v.id === id)
    if (index === -1) return false
    venues.value.splice(index, 1)
    persist()
    return true
  }

  function setStatus(id, status) {
    return updateVenue(id, { status })
  }

  function searchVenues(keyword) {
    if (!keyword) return venues.value
    const lowerKeyword = keyword.toLowerCase()
    return venues.value.filter(v =>
      v.name.toLowerCase().includes(lowerKeyword) ||
      v.location.toLowerCase().includes(lowerKeyword) ||
      (v.description && v.description.toLowerCase().includes(lowerKeyword)) ||
      (v.facilities && v.facilities.some(f => f.toLowerCase().includes(lowerKeyword)))
    )
  }

  function checkVenueAvailability(venueId, date, performanceStore) {
    const venue = getVenueById(venueId)
    if (!venue) return { available: false, reason: "场地不存在" }
    if (venue.status === VENUE_STATUS.MAINTENANCE) {
      return { available: false, reason: "场地维护中" }
    }

    if (performanceStore && date) {
      const targetDate = new Date(date).toDateString()
      const occupiedPerformances = performanceStore.performances.filter(p => {
        if (!p.venueId || p.venueId !== venueId) return false
        if (!p.performanceDate) return false
        return new Date(p.performanceDate).toDateString() === targetDate
      })
      if (occupiedPerformances.length > 0) {
        return {
          available: false,
          reason: "该日期场地已被占用",
          performances: occupiedPerformances
        }
      }
    }

    return { available: true }
  }

  if (!storage.get(STORAGE_KEYS.VENUES)) {
    persist()
  }

  return {
    venues,
    venueList,
    availableVenues,
    venueCount,
    getVenueById,
    addVenue,
    updateVenue,
    deleteVenue,
    setStatus,
    searchVenues,
    checkVenueAvailability
  }
})
`;

try {
  fs.writeFileSync(path.join(storesDir, 'venue.js'), venueContent);
  console.log('venue.js created successfully');
  
  fs.writeFileSync(path.join(storesDir, 'conflict.js'), conflictContent);
  console.log('conflict.js created successfully');
  
  fs.writeFileSync(path.join(storesDir, 'songConfig.js'), songConfigContent);
  console.log('songConfig.js created successfully');
} catch (err) {
  console.error('Error:', err);
}
