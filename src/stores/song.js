import { defineStore } from "pinia"
import { ref, computed } from "vue"
import { storage, STORAGE_KEYS } from "../utils/storage"
import { generateId } from "../utils/id"

const defaultSongs = [
  { id: generateId(), name: "海阔天空", artist: "Beyond", duration: 326, tempo: "中速", difficulty: "中等", description: "经典摇滚曲目", createdAt: Date.now() },
  { id: generateId(), name: "光辉岁月", artist: "Beyond", duration: 295, tempo: "中速", difficulty: "简单", description: "励志经典", createdAt: Date.now() }
]

export const useSongStore = defineStore("song", () => {
  const songs = ref(storage.get(STORAGE_KEYS.SONGS) || defaultSongs)

  const songList = computed(() => songs.value)
  const songCount = computed(() => songs.value.length)

  function persist() {
    storage.set(STORAGE_KEYS.SONGS, songs.value)
  }

  function getSongById(id) {
    return songs.value.find(s => s.id === id)
  }

  function addSong(song) {
    const newSong = {
      id: generateId(),
      ...song,
      createdAt: Date.now()
    }
    songs.value.push(newSong)
    persist()
    return newSong
  }

  function updateSong(id, updates) {
    const index = songs.value.findIndex(s => s.id === id)
    if (index === -1) return null
    songs.value[index] = { ...songs.value[index], ...updates, updatedAt: Date.now() }
    persist()
    return songs.value[index]
  }

  function deleteSong(id) {
    const index = songs.value.findIndex(s => s.id === id)
    if (index === -1) return false
    songs.value.splice(index, 1)
    persist()
    return true
  }

  function searchSongs(keyword) {
    if (!keyword) return songs.value
    const lowerKeyword = keyword.toLowerCase()
    return songs.value.filter(s =>
      s.name.toLowerCase().includes(lowerKeyword) ||
      s.artist.toLowerCase().includes(lowerKeyword)
    )
  }

  if (!storage.get(STORAGE_KEYS.SONGS)) {
    persist()
  }

  return {
    songs,
    songList,
    songCount,
    getSongById,
    addSong,
    updateSong,
    deleteSong,
    searchSongs
  }
})

