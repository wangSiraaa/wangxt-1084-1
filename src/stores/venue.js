import { defineStore } from "pinia"
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

export const VENUE_FACILITY_TYPES = [
  { id: "audio", name: "音响系统", icon: "🔊" },
  { id: "microphone", name: "话筒/麦克风", icon: "🎤" },
  { id: "power", name: "电源供应", icon: "⚡" },
  { id: "lighting", name: "灯光系统", icon: "💡" },
  { id: "piano", name: "钢琴/键盘", icon: "🎹" },
  { id: "drumset", name: "架子鼓", icon: "🥁" },
  { id: "amplifier", name: "音箱/功放", icon: "🔈" }
]

const defaultVenues = [
  {
    id: "v-rehearsal-1",
    name: "主排练厅",
    location: "A栋3层301室",
    capacity: 20,
    status: VENUE_STATUS.AVAILABLE,
    description: "标准乐队排练厅，配备基础音响设备",
    facilities: ["audio", "microphone", "power", "lighting", "amplifier"],
    contact: "物业前台 8001",
    createdAt: Date.now()
  },
  {
    id: "v-rehearsal-2",
    name: "小排练室",
    location: "A栋3层305室",
    capacity: 8,
    status: VENUE_STATUS.AVAILABLE,
    description: "适合小型乐队或分声部练习",
    facilities: ["audio", "power", "amplifier"],
    contact: "物业前台 8001",
    createdAt: Date.now()
  },
  {
    id: "v-stage-1",
    name: "多功能舞台",
    location: "B栋1层演艺中心",
    capacity: 500,
    status: VENUE_STATUS.AVAILABLE,
    description: "正式演出场地，具备完善的音响灯光系统",
    facilities: ["audio", "microphone", "power", "lighting", "piano", "amplifier"],
    contact: "场地管理 8002",
    createdAt: Date.now()
  },
  {
    id: "v-livehouse",
    name: "Live House",
    location: "C栋地下1层",
    capacity: 150,
    status: VENUE_STATUS.MAINTENANCE,
    description: "专业小型演出场地，正在进行音响升级",
    facilities: ["audio", "microphone", "power", "lighting", "drumset", "amplifier"],
    contact: "Live House管理 8003",
    createdAt: Date.now()
  }
]

export const useVenueStore = defineStore("venue", () => {
  const venues = ref(storage.get(STORAGE_KEYS.VENUES) || defaultVenues)

  const venueList = computed(() => venues.value)
  const availableVenues = computed(() => venues.value.filter(v => v.status === VENUE_STATUS.AVAILABLE))
  const venueCount = computed(() => venues.value.length)
  const availableCount = computed(() => availableVenues.value.length)

  function persist() {
    storage.set(STORAGE_KEYS.VENUES, venues.value)
  }

  function getVenueById(id) {
    return venues.value.find(v => v.id === id)
  }

  function getVenuesByStatus(status) {
    return venues.value.filter(v => v.status === status)
  }

  function getVenuesWithFacility(facilityType) {
    return venues.value.filter(v => v.facilities && v.facilities.includes(facilityType))
  }

  function createVenue(venueData) {
    const newVenue = {
      id: `venue-${generateId()}`,
      status: VENUE_STATUS.AVAILABLE,
      facilities: [],
      createdAt: Date.now(),
      ...venueData
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

  function setVenueStatus(id, status) {
    return updateVenue(id, { status })
  }

  function setVenueMaintenance(id, isMaintenance) {
    return setVenueStatus(id, isMaintenance ? VENUE_STATUS.MAINTENANCE : VENUE_STATUS.AVAILABLE)
  }

  function getVenueFacilities(venueId) {
    const venue = getVenueById(venueId)
    if (!venue) return []
    return (venue.facilities || []).map(fid => {
      const def = VENUE_FACILITY_TYPES.find(f => f.id === fid)
      return def ? { ...def, venueId } : { id: fid, name: fid, icon: "📍", venueId }
    })
  }

  function hasVenueFacility(venueId, facilityType) {
    const venue = getVenueById(venueId)
    return !!(venue && venue.facilities && venue.facilities.includes(facilityType))
  }

  function checkVenueAvailability(venueId, date, excludePerformanceId, equipmentScheduleStore) {
    const venue = getVenueById(venueId)
    if (!venue) return { available: false, reason: "场地不存在", conflicts: [] }
    if (venue.status === VENUE_STATUS.MAINTENANCE) {
      return { available: false, reason: "场地维护中", conflicts: [] }
    }

    const conflicts = equipmentScheduleStore
      ? equipmentScheduleStore.getSchedulesByPerformanceId().filter(s =>
          s.venueId === venueId &&
          s.startAt &&
          new Date(s.startAt).toDateString() === new Date(date).toDateString() &&
          (!excludePerformanceId || s.performanceId !== excludePerformanceId)
        )
      : []

    return {
      available: conflicts.length === 0,
      reason: conflicts.length > 0 ? `该日期已有 ${conflicts.length} 条档期占用` : "",
      conflicts
    }
  }

  function checkFacilityAvailability(venueId, facilityType, startAt, endAt, excludePerformanceId, equipmentScheduleStore) {
    if (!hasVenueFacility(venueId, facilityType)) {
      return { available: false, reason: "该场地未配备此设施", conflicts: [] }
    }

    const conflicts = equipmentScheduleStore
      ? equipmentScheduleStore.checkFacilityConflict(venueId, facilityType, startAt, endAt, excludePerformanceId)
      : []

    return {
      available: conflicts.length === 0,
      reason: conflicts.length > 0 ? `设施 ${facilityType} 档期冲突，共 ${conflicts.length} 条` : "",
      conflicts
    }
  }

  function checkAllFacilitiesAvailability(venueId, startAt, endAt, excludePerformanceId, equipmentScheduleStore) {
    const venue = getVenueById(venueId)
    if (!venue) return {}
    const result = {}
    for (const fid of (venue.facilities || [])) {
      result[fid] = checkFacilityAvailability(venueId, fid, startAt, endAt, excludePerformanceId, equipmentScheduleStore)
    }
    return result
  }

  function searchVenues(keyword, statusFilter, requiredFacilities) {
    let result = venues.value
    if (statusFilter) {
      result = result.filter(v => v.status === statusFilter)
    }
    if (requiredFacilities && requiredFacilities.length > 0) {
      result = result.filter(v =>
        requiredFacilities.every(f => v.facilities && v.facilities.includes(f))
      )
    }
    if (keyword) {
      const lowerKeyword = keyword.toLowerCase()
      result = result.filter(v =>
        v.name.toLowerCase().includes(lowerKeyword) ||
        v.location.toLowerCase().includes(lowerKeyword) ||
        (v.description && v.description.toLowerCase().includes(lowerKeyword))
      )
    }
    return result
  }

  if (!storage.get(STORAGE_KEYS.VENUES)) {
    persist()
  }

  return {
    venues,
    venueList,
    availableVenues,
    venueCount,
    availableCount,
    getVenueById,
    getVenuesByStatus,
    getVenuesWithFacility,
    createVenue,
    updateVenue,
    deleteVenue,
    setVenueStatus,
    setVenueMaintenance,
    getVenueFacilities,
    hasVenueFacility,
    checkVenueAvailability,
    checkFacilityAvailability,
    checkAllFacilitiesAvailability,
    searchVenues
  }
})
