import { defineStore } from "pinia"
import { ref, computed } from "vue"
import { storage, STORAGE_KEYS } from "../utils/storage"
import { generateId } from "../utils/id"

export const SCHEDULE_TARGET_TYPE = {
  EQUIPMENT: "equipment",
  VENUE_FACILITY: "venue_facility"
}

export const VENUE_FACILITY_TYPE = {
  AUDIO: "音响",
  MICROPHONE: "话筒",
  POWER: "电源",
  LIGHTING: "灯光",
  PIANO: "钢琴"
}

export const useEquipmentScheduleStore = defineStore("equipmentSchedule", () => {
  const schedules = ref(storage.get(STORAGE_KEYS.EQUIPMENT_SCHEDULES) || [])
  const facilitySchedules = ref(storage.get(STORAGE_KEYS.VENUE_FACILITY_SCHEDULES) || [])

  const scheduleList = computed(() => schedules.value)
  const facilityScheduleList = computed(() => facilitySchedules.value)

  function persistEquipment() {
    storage.set(STORAGE_KEYS.EQUIPMENT_SCHEDULES, schedules.value)
  }

  function persistFacility() {
    storage.set(STORAGE_KEYS.VENUE_FACILITY_SCHEDULES, facilitySchedules.value)
  }

  function createEquipmentSchedule(data) {
    const s = {
      id: generateId(),
      targetType: SCHEDULE_TARGET_TYPE.EQUIPMENT,
      targetId: data.equipmentId,
      performanceId: data.performanceId || null,
      songId: data.songId || null,
      startAt: data.startAt,
      endAt: data.endAt,
      note: data.note || "",
      createdAt: Date.now()
    }
    schedules.value.push(s)
    persistEquipment()
    return s
  }

  function createFacilitySchedule(data) {
    const s = {
      id: generateId(),
      targetType: SCHEDULE_TARGET_TYPE.VENUE_FACILITY,
      targetId: data.facilityId || data.facilityType,
      venueId: data.venueId || null,
      performanceId: data.performanceId || null,
      songId: data.songId || null,
      facilityType: data.facilityType,
      startAt: data.startAt,
      endAt: data.endAt,
      note: data.note || "",
      createdAt: Date.now()
    }
    facilitySchedules.value.push(s)
    persistFacility()
    return s
  }

  function deleteSchedule(id) {
    const idx = schedules.value.findIndex(s => s.id === id)
    if (idx >= 0) {
      schedules.value.splice(idx, 1)
      persistEquipment()
      return true
    }
    const fidx = facilitySchedules.value.findIndex(s => s.id === id)
    if (fidx >= 0) {
      facilitySchedules.value.splice(fidx, 1)
      persistFacility()
      return true
    }
    return false
  }

  function getEquipmentSchedules(targetId) {
    return schedules.value.filter(s => s.targetId === targetId)
  }

  function getFacilitySchedules(venueId, facilityType) {
    return facilitySchedules.value.filter(s =>
      s.venueId === venueId && (!facilityType || s.facilityType === facilityType)
    )
  }

  function _overlaps(aStart, aEnd, bStart, bEnd) {
    const as = new Date(aStart).getTime()
    const ae = new Date(aEnd).getTime()
    const bs = new Date(bStart).getTime()
    const be = new Date(bEnd).getTime()
    return as < be && bs < ae
  }

  function checkEquipmentConflict(equipmentId, startAt, endAt, excludePerformanceId) {
    return schedules.value.filter(s => {
      if (s.targetId !== equipmentId) return false
      if (excludePerformanceId && s.performanceId === excludePerformanceId) return false
      return _overlaps(s.startAt, s.endAt, startAt, endAt)
    })
  }

  function checkFacilityConflict(venueId, facilityType, startAt, endAt, excludePerformanceId) {
    return facilitySchedules.value.filter(s => {
      if (s.venueId !== venueId) return false
      if (facilityType && s.facilityType !== facilityType) return false
      if (excludePerformanceId && s.performanceId === excludePerformanceId) return false
      return _overlaps(s.startAt, s.endAt, startAt, endAt)
    })
  }

  function getSchedulesByPerformanceId(performanceId) {
    const eq = schedules.value.filter(s => s.performanceId === performanceId)
    const fa = facilitySchedules.value.filter(s => s.performanceId === performanceId)
    return [...eq, ...fa]
  }

  function suggestAlternativeWindows(conflicts, baseStart, baseEnd, slotMinutes = 60, maxSuggestions = 3) {
    const suggestions = []
    const base = new Date(baseStart).getTime()
    const duration = new Date(baseEnd).getTime() - base
    const dayMs = 24 * 60 * 60 * 1000
    const slotMs = slotMinutes * 60 * 1000

    for (let offset = 1; offset <= 14 && suggestions.length < maxSuggestions; offset++) {
      for (let dir of [1, -1]) {
        if (suggestions.length >= maxSuggestions) break
        const candidateStart = base + dir * offset * slotMs
        const candidateEnd = candidateStart + duration

        const hasConflict = conflicts.some(c =>
          _overlaps(c.startAt, c.endAt, candidateStart, candidateEnd)
        )
        if (!hasConflict) {
          suggestions.push({
            startAt: new Date(candidateStart).toISOString(),
            endAt: new Date(candidateEnd).toISOString(),
            label: dir > 0 ? `推迟 ${offset * slotMinutes} 分钟` : `提前 ${offset * slotMinutes} 分钟`
          })
        }
      }
    }

    if (suggestions.length < maxSuggestions) {
      for (let d = 1; d <= 7 && suggestions.length < maxSuggestions; d++) {
        for (let dir of [1, -1]) {
          if (suggestions.length >= maxSuggestions) break
          const candidateStart = base + dir * d * dayMs
          const candidateEnd = candidateStart + duration
          const hasConflict = conflicts.some(c =>
            _overlaps(c.startAt, c.endAt, candidateStart, candidateEnd)
          )
          if (!hasConflict) {
            suggestions.push({
              startAt: new Date(candidateStart).toISOString(),
              endAt: new Date(candidateEnd).toISOString(),
              label: dir > 0 ? `${d} 天后同一时段` : `${d} 天前同一时段`
            })
          }
        }
      }
    }
    return suggestions
  }

  if (!storage.get(STORAGE_KEYS.EQUIPMENT_SCHEDULES)) persistEquipment()
  if (!storage.get(STORAGE_KEYS.VENUE_FACILITY_SCHEDULES)) persistFacility()

  return {
    schedules,
    facilitySchedules,
    scheduleList,
    facilityScheduleList,
    createEquipmentSchedule,
    createFacilitySchedule,
    deleteSchedule,
    getEquipmentSchedules,
    getFacilitySchedules,
    checkEquipmentConflict,
    checkFacilityConflict,
    getSchedulesByPerformanceId,
    suggestAlternativeWindows
  }
})
