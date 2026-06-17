<template>
  <div class="song-config-panel">
    <div class="panel-header">
      <h3>曲目配置（谱面/领奏/替补）</h3>
      <select v-model="selectedPerformanceId" class="select-input mini">
        <option value="">- 选择演出单 -</option>
        <option v-for="p in configurablePerformances" :key="p.id" :value="p.id">
          {{ p.name }} ({{ formatDate(p.performanceDate) }})
        </option>
      </select>
    </div>

    <div v-if="!selectedPerformanceId" class="empty-tip">
      请先选择要配置的演出单
    </div>

    <div v-else-if="songList.length === 0" class="empty-tip">
      该演出单暂未关联曲目
    </div>

    <div v-else class="config-list">
      <div v-for="song in songList" :key="song.id" class="config-card">
        <div class="config-head" @click="toggleExpand(song.id)">
          <div class="song-title">
            <span class="expand-icon">{{ expandedSongId === song.id ? '▼' : '▶' }}</span>
            <strong>{{ song.name }}</strong>
            <span class="song-artist">{{ song.artist }}</span>
          </div>
          <div class="config-summary">
            <span v-if="getCfg(song.id)?.scoreVersion" class="sum-tag sum-version">
              谱面: {{ getCfg(song.id).scoreVersion }}
            </span>
            <span v-if="getConductorName(song.id)" class="sum-tag sum-lead">
              🎙 领奏: {{ getConductorName(song.id) }}
            </span>
            <span class="sum-tag sum-count">
              {{ countAssignments(song.id) }} 人分派
            </span>
          </div>
        </div>

        <div v-if="expandedSongId === song.id" class="config-body">
          <div class="form-row">
            <div class="form-group">
              <label>谱面版本</label>
              <input type="text" v-model="scoreDraft[song.id]" placeholder="如: V2.3 现场版" />
              <button class="btn btn-sm btn-outline" @click="saveScoreVersion(song.id)">保存谱面</button>
            </div>
            <div class="form-group">
              <label>领奏（Leader）</label>
              <select v-model="conductorDraft[song.id]" class="select-input">
                <option value="">- 未指派 -</option>
                <option v-for="u in memberList" :key="u.id" :value="u.id">
                  {{ u.name }}
                </option>
              </select>
              <button class="btn btn-sm btn-outline" @click="saveConductor(song.id)">保存领奏</button>
            </div>
          </div>

          <h5 class="sub-title">声部成员分派（主力/替补）与最低人数</h5>
          <div class="part-config">
            <div v-for="part in partList" :key="part.id" class="part-row">
              <div class="part-head">
                <span class="part-name">
                  {{ part.name }}
                  <span v-if="part.isKey" class="key-dot">●关键</span>
                </span>
                <div class="min-count-row">
                  <label>最低人数:</label>
                  <input type="number" min="0" :value="minCountDraft[part.id] ?? 0" @input="minCountDraft[part.id] = Number($event.target.value)" />
                  <button class="btn btn-sm btn-outline" @click="saveMinCount(song.id, part.id)">保存</button>
                </div>
              </div>
              <div class="part-assignments">
                <div class="assign-list">
                  <div
                    v-for="a in getAssignmentsForPart(song.id, part.id)"
                    :key="a.userId"
                    class="assign-tag"
                  >
                    <span :class="'role-' + a.role">{{ roleLabel(a.role) }}</span>
                    <span class="u-name">{{ getUserName(a.userId) }}</span>
                    <span class="unbind-btn" @click="removeAssign(song.id, part.id, a.userId)">×</span>
                  </div>
                  <div v-if="getAssignmentsForPart(song.id, part.id).length === 0" class="no-assign">
                    暂未分派
                  </div>
                </div>
                <div class="add-assign-row">
                  <select v-model="addUserDraft[part.id]" class="select-input mini">
                    <option value="">- 成员 -</option>
                    <option v-for="u in memberList" :key="u.id" :value="u.id">{{ u.name }}</option>
                  </select>
                  <select v-model="addRoleDraft[part.id]" class="select-input mini">
                    <option v-for="(l, k) in SONG_CONFIG_PART_ROLE_LABEL" :key="k" :value="k">{{ l }}</option>
                  </select>
                  <button class="btn btn-sm btn-primary" @click="addAssign(song.id, part.id)">+ 分派</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive, watch } from 'vue'
import {
  useSongConfigStore,
  SONG_CONFIG_PART_ROLE,
  SONG_CONFIG_PART_ROLE_LABEL
} from '../stores/songConfig'
import { useSongStore } from '../stores/song'
import { usePartStore } from '../stores/part'
import { usePerformanceStore, PERFORMANCE_STATUS } from '../stores/performance'
import { useAuthStore } from '../stores/auth'

const songConfigStore = useSongConfigStore()
const songStore = useSongStore()
const partStore = usePartStore()
const performanceStore = usePerformanceStore()
const authStore = useAuthStore()

const selectedPerformanceId = ref('')
const expandedSongId = ref(null)

const scoreDraft = reactive({})
const conductorDraft = reactive({})
const minCountDraft = reactive({})
const addUserDraft = reactive({})
const addRoleDraft = reactive({})

watch(selectedPerformanceId, () => {
  expandedSongId.value = null
  Object.keys(scoreDraft).forEach(k => delete scoreDraft[k])
  Object.keys(conductorDraft).forEach(k => delete conductorDraft[k])
  songList.value.forEach(s => {
    const cfg = songConfigStore.getConfig(selectedPerformanceId.value, s.id)
    scoreDraft[s.id] = cfg?.scoreVersion || ''
    conductorDraft[s.id] = cfg?.conductorUserId || ''
    partList.value.forEach(p => {
      minCountDraft[p.id] = cfg?.requiredMinCount?.[p.id] || 0
      addUserDraft[p.id] = ''
      addRoleDraft[p.id] = SONG_CONFIG_PART_ROLE.MAIN
    })
  })
}, { deep: true })

const configurablePerformances = computed(() => {
  return performanceStore.performanceList.filter(p =>
    p.status === PERFORMANCE_STATUS.DRAFT ||
    p.status === PERFORMANCE_STATUS.CONFIRMED ||
    p.status === PERFORMANCE_STATUS.STARTED
  )
})

const songList = computed(() => {
  const p = performanceStore.getPerformanceById(selectedPerformanceId.value)
  if (!p) return []
  return (p.songIds || []).map(id => songStore.getSongById(id)).filter(Boolean)
})

const partList = computed(() => partStore.partList)
const memberList = computed(() => authStore.users.filter(u => u.role === 'member' || u.role === 'captain' || u.role === 'leader'))

function toggleExpand(id) {
  expandedSongId.value = expandedSongId.value === id ? null : id
  const s = songStore.getSongById(id)
  const cfg = songConfigStore.ensureConfig(selectedPerformanceId.value, id)
  scoreDraft[id] = cfg?.scoreVersion || ''
  conductorDraft[id] = cfg?.conductorUserId || ''
  partList.value.forEach(p => {
    minCountDraft[p.id] = cfg?.requiredMinCount?.[p.id] || 0
    addUserDraft[p.id] = addUserDraft[p.id] || ''
    addRoleDraft[p.id] = addRoleDraft[p.id] || SONG_CONFIG_PART_ROLE.MAIN
  })
}

function getCfg(songId) {
  return songConfigStore.getConfig(selectedPerformanceId.value, songId)
}

function getConductorName(songId) {
  const cid = getCfg(songId)?.conductorUserId
  return cid ? authStore.getUserById(cid)?.name : ''
}

function countAssignments(songId) {
  return (getCfg(songId)?.partAssignments || []).length
}

function getAssignmentsForPart(songId, partId) {
  return (getCfg(songId)?.partAssignments || []).filter(a => a.partId === partId)
}

function getUserName(uid) {
  return authStore.getUserById(uid)?.name || '未知'
}

function roleLabel(r) {
  return SONG_CONFIG_PART_ROLE_LABEL[r] || r
}

function saveScoreVersion(songId) {
  songConfigStore.setScoreVersion(selectedPerformanceId.value, songId, scoreDraft[songId])
  alert('谱面版本已保存')
}

function saveConductor(songId) {
  songConfigStore.setConductor(selectedPerformanceId.value, songId, conductorDraft[songId])
  alert('领奏已保存')
}

function saveMinCount(songId, partId) {
  songConfigStore.setRequiredMinCount(
    selectedPerformanceId.value, songId, partId, minCountDraft[partId] || 0
  )
  alert('最低人数已保存')
}

function addAssign(songId, partId) {
  const uid = addUserDraft[partId]
  if (!uid) {
    alert('请选择成员')
    return
  }
  songConfigStore.setPartAssignment(
    selectedPerformanceId.value, songId, partId, uid, addRoleDraft[partId]
  )
  addUserDraft[partId] = ''
}

function removeAssign(songId, partId, userId) {
  songConfigStore.removePartAssignment(selectedPerformanceId.value, songId, partId, userId)
}

function formatDate(d) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
}
</script>

<style scoped>
.song-config-panel { display: flex; flex-direction: column; gap: 14px; }
.panel-header { display: flex; align-items: center; gap: 14px; justify-content: space-between; margin-bottom: 6px; }
.panel-header h3 { margin: 0; }
.select-input.mini { max-width: 220px; flex: 0 0 220px; }
.config-list { display: flex; flex-direction: column; gap: 12px; }
.config-card { border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden; }
.config-head {
  padding: 12px 16px;
  background: #f9fafb;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}
.config-head:hover { background: #f3f4f6; }
.song-title { display: flex; align-items: center; gap: 10px; }
.expand-icon { color: #9ca3af; font-size: 11px; }
.song-title strong { font-size: 15px; color: #1f2937; }
.song-artist { color: #6b7280; font-size: 13px; }
.config-summary { display: flex; gap: 8px; flex-wrap: wrap; }
.sum-tag {
  padding: 3px 10px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 500;
}
.sum-version { background: #dbeafe; color: #1d4ed8; }
.sum-lead { background: #fce7f3; color: #be185d; }
.sum-count { background: #e5e7eb; color: #374151; }
.config-body { padding: 16px; border-top: 1px solid #e5e7eb; display: flex; flex-direction: column; gap: 16px; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-group label { font-size: 13px; font-weight: 500; color: #374151; }
.form-group input, .form-group select {
  padding: 8px 10px; border: 1px solid #d1d5db; border-radius: 7px; font-size: 13px; outline: none;
}
.form-group input:focus, .form-group select:focus { border-color: #667eea; box-shadow: 0 0 0 3px rgba(102,126,234,0.15); }
.sub-title { margin: 0; padding-bottom: 6px; border-bottom: 2px solid #eef2ff; color: #4338ca; font-size: 14px; }
.part-config { display: flex; flex-direction: column; gap: 10px; }
.part-row { border: 1px solid #eef2ff; border-radius: 8px; padding: 10px 12px; background: #fafbff; }
.part-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.part-name { font-weight: 600; color: #374151; font-size: 14px; display: flex; gap: 8px; align-items: center; }
.key-dot { color: #f59e0b; font-size: 11px; font-weight: 500; }
.min-count-row { display: flex; align-items: center; gap: 6px; font-size: 13px; }
.min-count-row input { width: 70px; padding: 5px 8px; border: 1px solid #d1d5db; border-radius: 6px; }
.part-assignments { display: flex; flex-direction: column; gap: 8px; }
.assign-list { display: flex; flex-wrap: wrap; gap: 6px; }
.assign-tag {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 3px 6px 3px 10px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  font-size: 12px;
}
.role-lead { background: #fce7f3; color: #be185d; padding: 1px 8px; border-radius: 10px; font-weight: 600; }
.role-main { background: #dbeafe; color: #1d4ed8; padding: 1px 8px; border-radius: 10px; font-weight: 600; }
.role-backup { background: #d1fae5; color: #059669; padding: 1px 8px; border-radius: 10px; font-weight: 600; }
.u-name { color: #1f2937; }
.unbind-btn {
  margin-left: 2px; color: #ef4444; cursor: pointer;
  width: 18px; height: 18px; display: inline-flex; align-items: center; justify-content: center;
  border-radius: 50%;
}
.unbind-btn:hover { background: #fee2e2; }
.no-assign { color: #9ca3af; font-size: 12px; padding: 4px 6px; }
.add-assign-row { display: flex; gap: 6px; align-items: center; padding-top: 6px; border-top: 1px dashed #e5e7eb; }
.empty-tip { padding: 40px; background: #f9fafb; color: #9ca3af; text-align: center; border-radius: 8px; }
.btn { padding: 5px 12px; border-radius: 6px; font-size: 12px; border: none; cursor: pointer; font-weight: 500; }
.btn-sm { padding: 4px 10px; font-size: 12px; }
.btn-primary { background: linear-gradient(135deg, #667eea, #764ba2); color: white; }
.btn-outline { background: white; color: #374151; border: 1px solid #d1d5db; }
@media (max-width: 640px) { .form-row { grid-template-columns: 1fr; } }
</style>
