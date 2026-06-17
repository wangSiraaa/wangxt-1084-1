const STORAGE_KEYS = {
  USERS: 'band_users',
  AUTH_USER: 'band_auth_user',
  SONGS: 'band_songs',
  PARTS: 'band_parts',
  EQUIPMENTS: 'band_equipments',
  PERFORMANCES: 'band_performances',
  SIGNUPS: 'band_signups'
}

const storage = {
  get(key) {
    try {
      const value = localStorage.getItem(key)
      return value ? JSON.parse(value) : null
    } catch (e) {
      console.error('Storage get error:', e)
      return null
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value))
      return true
    } catch (e) {
      console.error('Storage set error:', e)
      return false
    }
  },

  remove(key) {
    try {
      localStorage.removeItem(key)
      return true
    } catch (e) {
      console.error('Storage remove error:', e)
      return false
    }
  },

  clearAll() {
    try {
      Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key)
      })
      return true
    } catch (e) {
      console.error('Storage clear error:', e)
      return false
    }
  }
}

export { storage, STORAGE_KEYS }
