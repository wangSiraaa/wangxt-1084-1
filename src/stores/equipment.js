import { defineStore } from "pinia"
import { ref, computed } from "vue"
import { storage, STORAGE_KEYS } from "../utils/storage"
import { generateId } from "../utils/id"

export const EQUIPMENT_STATUS = {
  AVAILABLE: "available",
  MAINTENANCE: "maintenance"
}

export const EQUIPMENT_STATUS_LABEL = {
  [EQUIPMENT_STATUS.AVAILABLE]: "可用",
  [EQUIPMENT_STATUS.MAINTENANCE]: "维护中"
}

const defaultEquipments = [
  { id: generateId(), name: "Fender Stratocaster 吉他", category: "吉他", status: EQUIPMENT_STATUS.AVAILABLE, description: "主音吉他手使用", lastMaintenanceDate: Date.now() - 86400000 * 30, createdAt: Date.now() },
  { id: generateId(), name: "Gibson Les Paul 吉他", category: "吉他", status: EQUIPMENT_STATUS.AVAILABLE, description: "节奏吉他手使用", lastMaintenanceDate: Date.now() - 86400000 * 15, createdAt: Date.now() },
  { id: generateId(), name: "Fender Precision Bass 贝斯", category: "贝斯", status: EQUIPMENT_STATUS.AVAILABLE, description: "贝斯手专用", lastMaintenanceDate: Date.now() - 86400000 * 45, createdAt: Date.now() },
  { id: generateId(), name: "Yamaha 架子鼓套装", category: "打击乐", status: EQUIPMENT_STATUS.MAINTENANCE, description: "鼓手专用，镲片维护中", lastMaintenanceDate: Date.now() - 86400000 * 5, createdAt: Date.now() },
  { id: generateId(), name: "Roland 键盘合成器", category: "键盘", status: EQUIPMENT_STATUS.AVAILABLE, description: "键盘手使用", lastMaintenanceDate: Date.now() - 86400000 * 60, createdAt: Date.now() },
  { id: generateId(), name: "Shure SM58 麦克风", category: "音频", status: EQUIPMENT_STATUS.AVAILABLE, description: "主唱麦克风", lastMaintenanceDate: Date.now() - 86400000 * 10, createdAt: Date.now() }
]

export const useEquipmentStore = defineStore("equipment", () => {
  const equipments = ref(storage.get(STORAGE_KEYS.EQUIPMENTS) || defaultEquipments)

  const equipmentList = computed(() => equipments.value)
  const availableEquipments = computed(() => equipments.value.filter(e => e.status === EQUIPMENT_STATUS.AVAILABLE))
  const maintenanceEquipments = computed(() => equipments.value.filter(e => e.status === EQUIPMENT_STATUS.MAINTENANCE))
  const equipmentCount = computed(() => equipments.value.length)
  const availableCount = computed(() => availableEquipments.value.length)
  const maintenanceCount = computed(() => maintenanceEquipments.value.length)

  function persist() {
    storage.set(STORAGE_KEYS.EQUIPMENTS, equipments.value)
  }

  function getEquipmentById(id) {
    return equipments.value.find(e => e.id === id)
  }

  function addEquipment(equipment) {
    const newEquipment = {
      id: generateId(),
      status: EQUIPMENT_STATUS.AVAILABLE,
      ...equipment,
      createdAt: Date.now()
    }
    equipments.value.push(newEquipment)
    persist()
    return newEquipment
  }

  function updateEquipment(id, updates) {
    const index = equipments.value.findIndex(e => e.id === id)
    if (index === -1) return null
    equipments.value[index] = { ...equipments.value[index], ...updates, updatedAt: Date.now() }
    persist()
    return equipments.value[index]
  }

  function deleteEquipment(id) {
    const index = equipments.value.findIndex(e => e.id === id)
    if (index === -1) return false
    equipments.value.splice(index, 1)
    persist()
    return true
  }

  function setStatus(id, status) {
    if (!Object.values(EQUIPMENT_STATUS).includes(status)) {
      return null
    }
    return updateEquipment(id, { status, lastMaintenanceDate: status === EQUIPMENT_STATUS.MAINTENANCE ? Date.now() : undefined })
  }

  function setAvailable(id) {
    return setStatus(id, EQUIPMENT_STATUS.AVAILABLE)
  }

  function setMaintenance(id) {
    return setStatus(id, EQUIPMENT_STATUS.MAINTENANCE)
  }

  function searchEquipments(keyword, statusFilter) {
    let result = equipments.value
    if (statusFilter) {
      result = result.filter(e => e.status === statusFilter)
    }
    if (keyword) {
      const lowerKeyword = keyword.toLowerCase()
      result = result.filter(e =>
        e.name.toLowerCase().includes(lowerKeyword) ||
        e.category.toLowerCase().includes(lowerKeyword) ||
        e.description.toLowerCase().includes(lowerKeyword)
      )
    }
    return result
  }

  if (!storage.get(STORAGE_KEYS.EQUIPMENTS)) {
    persist()
  }

  return {
    equipments,
    equipmentList,
    availableEquipments,
    maintenanceEquipments,
    equipmentCount,
    availableCount,
    maintenanceCount,
    getEquipmentById,
    addEquipment,
    updateEquipment,
    deleteEquipment,
    setStatus,
    setAvailable,
    setMaintenance,
    searchEquipments
  }
})

