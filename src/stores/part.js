import { defineStore } from "pinia"
import { ref, computed } from "vue"
import { storage, STORAGE_KEYS } from "../utils/storage"
import { generateId } from "../utils/id"

const defaultParts = [
  { id: generateId(), name: "主唱", description: "主要演唱声部", isKey: true, sortOrder: 1, createdAt: Date.now() },
  { id: generateId(), name: "和声", description: "辅助和声声部", isKey: false, sortOrder: 2, createdAt: Date.now() },
  { id: generateId(), name: "主音吉他", description: "主旋律吉他", isKey: true, sortOrder: 3, createdAt: Date.now() },
  { id: generateId(), name: "节奏吉他", description: "节奏伴奏吉他", isKey: false, sortOrder: 4, createdAt: Date.now() },
  { id: generateId(), name: "贝斯", description: "低音声部", isKey: true, sortOrder: 5, createdAt: Date.now() },
  { id: generateId(), name: "架子鼓", description: "打击乐声部", isKey: true, sortOrder: 6, createdAt: Date.now() },
  { id: generateId(), name: "键盘", description: "键盘/合成器", isKey: false, sortOrder: 7, createdAt: Date.now() }
]

export const usePartStore = defineStore("part", () => {
  const parts = ref(storage.get(STORAGE_KEYS.PARTS) || defaultParts)

  const partList = computed(() => [...parts.value].sort((a, b) => a.sortOrder - b.sortOrder))
  const keyParts = computed(() => partList.value.filter(p => p.isKey))
  const partCount = computed(() => parts.value.length)

  function persist() {
    storage.set(STORAGE_KEYS.PARTS, parts.value)
  }

  function getPartById(id) {
    return parts.value.find(p => p.id === id)
  }

  function addPart(part) {
    const maxSort = parts.value.reduce((max, p) => Math.max(max, p.sortOrder || 0), 0)
    const newPart = {
      id: generateId(),
      isKey: false,
      sortOrder: maxSort + 1,
      ...part,
      createdAt: Date.now()
    }
    parts.value.push(newPart)
    persist()
    return newPart
  }

  function updatePart(id, updates) {
    const index = parts.value.findIndex(p => p.id === id)
    if (index === -1) return null
    parts.value[index] = { ...parts.value[index], ...updates, updatedAt: Date.now() }
    persist()
    return parts.value[index]
  }

  function deletePart(id) {
    const index = parts.value.findIndex(p => p.id === id)
    if (index === -1) return false
    parts.value.splice(index, 1)
    persist()
    return true
  }

  function toggleKeyPart(id) {
    const part = getPartById(id)
    if (!part) return null
    return updatePart(id, { isKey: !part.isKey })
  }

  function searchParts(keyword) {
    if (!keyword) return partList.value
    const lowerKeyword = keyword.toLowerCase()
    return partList.value.filter(p =>
      p.name.toLowerCase().includes(lowerKeyword) ||
      p.description.toLowerCase().includes(lowerKeyword)
    )
  }

  if (!storage.get(STORAGE_KEYS.PARTS)) {
    persist()
  }

  return {
    parts,
    partList,
    keyParts,
    partCount,
    getPartById,
    addPart,
    updatePart,
    deletePart,
    toggleKeyPart,
    searchParts
  }
})

