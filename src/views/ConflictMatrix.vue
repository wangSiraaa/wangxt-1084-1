<template>
  <div class="matrix-page">
    <div class="page-header">
      <div>
        <h2>🔍 综合冲突矩阵</h2>
        <p class="page-desc">统一查看所有曲目、声部、器材、场地设施的冲突状态</p>
      </div>
      <div class="header-actions">
        <select v-model="perfFilter" class="select-input">
          <option value="">全部演出单</option>
          <option v-for="p in performanceList" :key="p.id" :value="p.id">{{ p.name }}</option>
        </select>
        <button class="btn btn-outline" @click="goBack">← 返回工作台</button>
      </div>
    </div>

    <div class="summary-row">
      <div class="s-card s-song">
        <span class="s-icon">🎵</span>
        <div><div class="s-v">{{ songCount }}</div><div class="s-l">曲目总数</div></div>
      </div>
      <div class="s-card s-part">
        <span class="s-icon">🎼</span>
        <div><div class="s-v">{{ partCount }}</div><div class="s-l">声部总数</div></div>
      </div>
      <div class="s-card s-eq">
        <span class="s-icon">🔧</span>
        <div><div class="s-v">{{ equipmentCount }}</div><div class="s-l">器材总数</div></div>
      </div>
      <div class="s-card s-cf">
        <span class="s-icon">⚠️</span>
        <div><div class="s-v danger">{{ pendingCount }}</div><div class="s-l">待协调冲突</div></div>
      </div>
    </div>

    <div class="matrix-wrapper">
      <table class="matrix-table">
        <thead>
          <tr>
            <th class="col-song">曲目 / 配置</th>
            <th class="col-conflict">谱面版本</th>
            <th class="col-conflict">领奏</th>
            <th
              v-for="part in partList" :key="part.id"
              :class="['col-part', { 'col-key': part.isKey }]"
            >
              {{ part.name }}
              <span v-if="part.isKey" class="key-star">★</span>
            </th>
            <th class="col-eq">器材需求</th>
            <th class="col-venue">场地设施</th>
            <th class="col-status">冲突状态</th>
            <th class="col-action">操作</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="p in filteredPerformances" :key="p.id">
            <tr class="perf-sep">
              <td :colspan="colspanCount" class="perf-header">
                <span class="perf-name">📋 {{ p.name }}</span>
                <span :class="['status-badge', 'status-' + p.status]">
                  {{ PERFORMANCE_STATUS_LABEL[p.status] }}
                </span>
                <span class="perf-date">{{ formatDate(p.performanceDate) }}</span>
                <span v-if="p.venue" class="perf-venue">📍 {{ p.venue }}</span>
              </td>
            </tr>
            <tr
              v-for="s in getSongs(p)" :key="p.id + '-' + s.id"
              :class="rowClass(p, s)"
            >
              <td class="cell-song">
                <div class="song-line">
                  <span class="song-name">{{ s.name }}</span>
                  <span class="song-artist">{{ s.artist }}</span>
                </div>
                <div v-if="hasAffectedConflict(p, s)" class="affected-indicator">
                  ⚠️ 受冲突影响：{{ getConflictTitles(p, s) }}
                </div>
              </td>
              <td class="cell-center">
                <span :class="['pill', scoreVersionClass(p, s)]">
                  {{ getCfg(p.id, s.id)?.scoreVersion || '未配置' }}
                </span>
              </td>
              <td class="cell-center">
                <span :class="['pill', conductorClass(p, s)]">
                  {{ getConductorName(p, s) }}
                </span>
              </td>
              <td
                v-for="part in partList" :key="part.id"
                :class="['cell-part', shortageClass(p, s, part)]"
              >
                <div class="part-info">
                  <div class="count-bar">
                    <span class="count-num">
                      {{ getEffectiveCount(p.id, part.id) }} / {{ getRequiredMin(p.id, s.id, part.id) }}
                    </span>
                    <span v-if="getRequiredMin(p.id, s.id, part.id) > getEffectiveCount(p.id, part.id)" class="short">❌</span>
                    <span v-else-if="hasBackup(p.id, s.id, part.id)" class="ok">✅</span>
                  </div>
                  <div class="backup-list">
                    <span
                      v-for="a in getAssignments(p.id, s.id, part.id)"
                      :key="a.userId"
                      :class="['utag', 'role-' + a.role]"
                    >
                      {{ roleShort(a.role) }}{{ userName(a.userId) }}
                    </span>
                    <span v-if="getAssignments(p.id, s.id, part.id).length === 0" class="muted-tiny">-</span>
                  </div>
                </div>
              </td>
              <td class="cell-eq">
                <div class="eq-list">
                  <span v-for="e in getEquipments(p)" :key="e.id" class="eq-chip">
                    🔧 {{ e.name }}
                  </span>
                  <span v-if="getEquipments(p).length === 0" class="muted-tiny">（无）</span>
                </div>
              </td>
              <td class="cell-venue">
                <div class="venue-info">
                  <span v-if="p.venue" class="venue-name">📍 {{ p.venue }}</span>
                  <div class="fac-chips">
                    <span
                      v-for="f in getVenueFacilityList(p)" :key="f.id"
                      :class="['fac-chip', f.available ? 'ok' : 'bad']"
                    >
                      {{ f.icon }} {{ f.name }}
                    </span>
                  </div>
                </div>
              </td>
              <td class="cell-status">
                <div class="status-list">
                  <span
                    v-for="c in getSongConflicts(p, s)" :key="c.id"
                    :class="['conf-chip', 'c-' + c.status]"
                  >
                    <span class="sev-dot" :class="'sev-' + c.severity"></span>
                    {{ c.typeLabel }}
                  </span>
                  <span v-if="getSongConflicts(p, s).length === 0 && p.status === 'suspended'" class="conf-chip st-suspended">
                    🔕 演出单挂起
                  </span>
                  <span v-if="getSongConflicts(p, s).length === 0 && p.status !== 'suspended'" class="conf-chip ok-chip">
                    ✓ 正常
                  </span>
                </div>
              </td>
              <td class="cell-action">
                <div class="action-btns">
                  <button class="btn btn-sm btn-outline" @click="goLeader(p)">配置</button>
                  <button
                    v-if="getSongConflicts(p, s).length > 0"
                    class="btn btn-sm btn-primary"
                    @click="goResolve(p)">协调</button>
                </div>
              </td>
            </tr>
          </template>
          <tr v-if="filteredPerformances.length === 0">
            <td :colspan="colspanCount" class="empty-row">暂无演出单</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="legend-row">
      <span class="legend-title">图例：</span>
      <span class="legend-item"><span class="utag role-lead role-demo">L</span> 领奏</span>
      <span class="legend-item"><span class="utag role-main role-demo">M</span> 主力</span>
      <span class="legend-item"><span class="utag role-backup role-demo">B</span> 替补</span>
      <span class="legend-item"><span class="conf-chip c-pending_coordination"><span class="sev-dot sev-critical"></span>待协调</span></span>
      <span class="legend-item"><span class="conf-chip c-resolved"><span class="sev-dot sev-warning"></span>已解决</span></span>
      <span class="legend-item"><span class="key-star">★</span>关键声部</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import {
  usePerformanceStore,
  PERFORMANCE_STATUS,
  PERFORMANCE_STATUS_LABEL
} from '../stores/performance'
import { useSongStore } from '../stores/song'
import { usePartStore } from '../stores/part'
import { useEquipmentStore } from '../stores/equipment'
import { useVenueStore, VENUE_FACILITY_TYPES } from '../stores/venue'
import { useSongConfigStore, SONG_CONFIG_PART_ROLE } from '../stores/songConfig'
import { useLeaveStore } from '../stores/leave'
import { useConflictStore, CONFLICT_STATUS } from '../stores/conflict'
import { useSignupStore } from '../stores/signup'

const router = useRouter()
const performanceStore = usePerformanceStore()
const songStore = useSongStore()
const partStore = usePartStore()
const equipmentStore = useEquipmentStore()
const venueStore = useVenueStore()
const songConfigStore = useSongConfigStore()
const leaveStore = useLeaveStore()
const signupStore = useSignupStore()
const conflictStore = useConflictStore()
const authStore = useAuthStore()

const perfFilter = ref('')

const performanceList = computed(() => performanceStore.performanceList)
const filteredPerformances = computed(() => {
  if (!perfFilter.value) return performanceList.value
  return performanceList.value.filter(p => p.id === perfFilter.value)
})
const songCount = computed(() => songStore.songCount)
const partCount = computed(() => partStore.partCount)
const equipmentCount = computed(() => equipmentStore.equipmentCount)
const pendingCount = computed(() => conflictStore.pendingCount)
const partList = computed(() => partStore.partList)
const colspanCount = computed(() => 7 + partList.value.length)

function getSongs(p) {
  return (p.songIds || []).map(id => songStore.getSongById(id)).filter(Boolean)
}
function getCfg(pid, sid) {
  return songConfigStore.getConfig(pid, sid)
}
function scoreVersionClass(p, s) {
  return getCfg(p.id, s.id)?.scoreVersion ? 'pill-filled' : 'pill-empty'
}
function conductorClass(p, s) {
  return getCfg(p.id, s.id)?.conductorUserId ? 'pill-filled' : 'pill-empty'
}
function getConductorName(p, s) {
  const uid = getCfg(p.id, s.id)?.conductorUserId
  return uid ? authStore.getUserById(uid)?.name || uid : '未指派'
}
function getEffectiveCount(pid, partid) {
  return leaveStore.computeEffectivePartCount(pid, partid, signupStore, leaveStore)
}
function getRequiredMin(pid, sid, partid) {
  const cfg = getCfg(pid, sid)
  const part = partStore.getPartById(partid)
  if (cfg?.requiredMinCount && cfg.requiredMinCount[partid] !== undefined) {
    return cfg.requiredMinCount[partid]
  }
  return part?.isKey ? 1 : 0
}
function hasBackup(pid, sid, partid) {
  const asgs = getCfg(pid, sid)?.partAssignments || []
  return asgs.some(a => a.partId === partid && a.role === SONG_CONFIG_PART_ROLE.BACKUP)
}
function getAssignments(pid, sid, partid) {
  return (getCfg(pid, sid)?.partAssignments || []).filter(a => a.partId === partid)
}
function roleShort(r) {
  if (r === SONG_CONFIG_PART_ROLE.LEAD) return 'L'
  if (r === SONG_CONFIG_PART_ROLE.MAIN) return 'M'
  return 'B'
}
function userName(uid) {
  return (authStore.getUserById(uid)?.name || '?').charAt(0)
}
function getEquipments(p) {
  return (p.equipmentIds || []).map(id => equipmentStore.getEquipmentById(id)).filter(Boolean)
}
function shortageClass(p, s, part) {
  const req = getRequiredMin(p.id, s.id, part.id)
  const eff = getEffectiveCount(p.id, part.id)
  if (req > 0 && eff < req) return 'shortage'
  if (req > 0) return 'ok'
  return ''
}
function findVenue(p) {
  if (p.venueId) return venueStore.getVenueById(p.venueId)
  if (p.venue) return venueStore.venueList.find(v => v.name === p.venue)
  return null
}
function getVenueFacilityList(p) {
  const v = findVenue(p)
  if (!v) return []
  const facs = venueStore.getVenueFacilities(v.id)
  const start = p.performanceDate ? new Date(p.performanceDate).toISOString() : null
  return facs.map(f => ({
    ...f,
    available: true
  }))
}
function getSongConflicts(p, s) {
  const all = conflictStore.getAllConflictsMatrix()
  return all.filter(c =>
    c.performanceId === p.id && (
      c.songId === s.id ||
      (c.affectedSongIds || []).includes(s.id) ||
      (!c.songId && (c.affectedSongIds || []).length === 0)
    )
  )
}
function hasAffectedConflict(p, s) {
  return getSongConflicts(p, s).length > 0
}
function getConflictTitles(p, s) {
  return getSongConflicts(p, s).map(c => c.typeLabel).join('、')
}
function rowClass(p, s) {
  if (p.status === PERFORMANCE_STATUS.SUSPENDED) return 'row-suspended'
  const conflicts = getSongConflicts(p, s)
  if (conflicts.some(c => c.status === CONFLICT_STATUS.PENDING_COORDINATION)) return 'row-pending'
  if (conflicts.length > 0 && conflicts.every(c => c.status === CONFLICT_STATUS.RESOLVED)) return 'row-resolved'
  return ''
}
function goBack() {
  const role = authStore.currentUser?.role
  if (role === 'admin') router.push('/admin')
  else if (role === 'captain' || role === 'leader') router.push('/leader')
  else router.push('/member')
}
function goLeader(p) {
  const role = authStore.currentUser?.role
  if (role === 'captain' || role === 'leader' || role === 'admin') {
    router.push('/leader')
  } else {
    alert('仅队长或管理员可以配置')
  }
}
function goResolve(p) {
  const role = authStore.currentUser?.role
  if (role === 'admin') {
    router.push('/admin')
  } else if (role === 'captain' || role === 'leader') {
    router.push('/leader')
  } else {
    alert('请联系队长或管理员协调冲突')
  }
}
function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit', weekday: 'short' })
}
</script>

<style scoped>
.matrix-page {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  max-width: 1600px;
  margin: 0 auto;
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 14px;
}
.page-header h2 { margin: 0; color: #1f2937; }
.page-desc { margin: 6px 0 0 0; color: #6b7280; font-size: 14px; }
.header-actions { display: flex; gap: 10px; align-items: center; }
.select-input {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 13px;
  outline: none;
}
.summary-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.s-card {
  padding: 16px;
  background: white;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 14px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}
.s-icon {
  width: 48px; height: 48px;
  border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  font-size: 24px;
  background: linear-gradient(135deg, #f3f4f6, #e5e7eb);
}
.s-song .s-icon { background: linear-gradient(135deg, #fef3c7, #fde68a); }
.s-part .s-icon { background: linear-gradient(135deg, #dbeafe, #bfdbfe); }
.s-eq .s-icon { background: linear-gradient(135deg, #fce7f3, #fbcfe8); }
.s-cf .s-icon { background: linear-gradient(135deg, #fee2e2, #fecaca); }
.s-v { font-size: 22px; font-weight: 700; color: #1f2937; }
.s-l { font-size: 12px; color: #6b7280; }
.danger { color: #b91c1c; }
.matrix-wrapper {
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  overflow: auto;
}
.matrix-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  min-width: 1200px;
}
.matrix-table th,
.matrix-table td {
  border-bottom: 1px solid #e5e7eb;
  padding: 12px 10px;
  text-align: left;
  vertical-align: middle;
}
.matrix-table thead th {
  background: #f8fafc;
  color: #475569;
  font-weight: 600;
  font-size: 12px;
  position: sticky;
  top: 0;
  z-index: 2;
  white-space: nowrap;
}
.col-song { min-width: 220px; }
.col-conflict { min-width: 100px; text-align: center; }
.col-part { min-width: 140px; }
.col-key { background: #fffbeb !important; }
.col-eq { min-width: 180px; }
.col-venue { min-width: 210px; }
.col-status { min-width: 180px; }
.col-action { min-width: 130px; }
.key-star { color: #f59e0b; margin-left: 2px; }
.perf-sep td { padding: 0 !important; border: none; }
.perf-header {
  background: linear-gradient(90deg, #eef2ff, #f5f3ff);
  padding: 12px 16px !important;
  display: flex;
  align-items: center;
  gap: 10px;
  color: #4338ca;
  border-bottom: 1px solid #c7d2fe;
}
.perf-name { font-weight: 700; font-size: 14px; }
.perf-date { color: #6366f1; font-size: 12px; }
.perf-venue { color: #6366f1; font-size: 12px; }
.status-badge {
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
}
.status-draft { background: #e5e7eb; color: #4b5563; }
.status-confirmed { background: #dbeafe; color: #1d4ed8; }
.status-suspended { background: #fee2e2; color: #b91c1c; }
.status-started { background: #fef3c7; color: #b45309; }
.status-completed { background: #d1fae5; color: #059669; }
.row-pending { background: #fffbeb; }
.row-resolved { background: #f0fdf4; }
.row-suspended { background: #fef2f2; }
.cell-song {}
.song-line { display: flex; flex-direction: column; gap: 2px; }
.song-name { font-weight: 600; color: #111827; }
.song-artist { font-size: 12px; color: #6b7280; }
.affected-indicator {
  margin-top: 6px;
  padding: 4px 8px;
  background: #fef3c7;
  color: #92400e;
  border-radius: 6px;
  font-size: 11px;
}
.cell-center { text-align: center; }
.pill {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}
.pill-filled { background: #eef2ff; color: #4338ca; }
.pill-empty { background: #f3f4f6; color: #9ca3af; }
.part-info { display: flex; flex-direction: column; gap: 6px; }
.count-bar { display: flex; align-items: center; gap: 6px; }
.count-num { font-weight: 700; font-size: 14px; color: #374151; }
.short { color: #dc2626; }
.ok { color: #16a34a; }
.cell-part.shortage { background: #fef2f2; }
.cell-part.ok { background: #f0fdf9; }
.backup-list { display: flex; flex-wrap: wrap; gap: 4px; }
.utag {
  display: inline-flex; align-items: center;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
  background: white;
  border: 1px solid #e5e7eb;
}
.utag.role-lead { background: #fce7f3; color: #be185d; border-color: #f9a8d4; }
.utag.role-main { background: #dbeafe; color: #1d4ed8; border-color: #93c5fd; }
.utag.role-backup { background: #d1fae5; color: #059669; border-color: #6ee7b7; }
.muted-tiny { color: #9ca3af; font-size: 11px; }
.eq-list { display: flex; flex-direction: column; gap: 4px; }
.eq-chip {
  display: inline-block;
  padding: 2px 8px;
  background: #f3f4f6;
  border-radius: 10px;
  font-size: 11px;
  color: #374151;
}
.venue-info { display: flex; flex-direction: column; gap: 4px; }
.venue-name { font-size: 12px; color: #374151; }
.fac-chips { display: flex; flex-wrap: wrap; gap: 4px; }
.fac-chip {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
}
.fac-chip.ok { background: #d1fae5; color: #065f46; }
.fac-chip.bad { background: #fee2e2; color: #991b1b; }
.status-list { display: flex; flex-wrap: wrap; gap: 4px; }
.conf-chip {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
}
.conf-chip.c-pending_coordination { background: #fef3c7; color: #92400e; }
.conf-chip.c-resolved { background: #d1fae5; color: #065f46; }
.conf-chip.c-ignored { background: #e5e7eb; color: #4b5563; }
.conf-chip.st-suspended { background: #fee2e2; color: #991b1b; }
.conf-chip.ok-chip { background: #ecfdf5; color: #059669; }
.sev-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  display: inline-block;
}
.sev-dot.sev-critical { background: #dc2626; }
.sev-dot.sev-warning { background: #f59e0b; }
.sev-dot.sev-info { background: #3b82f6; }
.action-btns { display: flex; gap: 4px; flex-wrap: wrap; }
.btn { padding: 4px 10px; border-radius: 6px; border: none; cursor: pointer; font-size: 12px; font-weight: 500; }
.btn-sm { padding: 4px 10px; font-size: 12px; }
.btn-primary { background: linear-gradient(135deg, #667eea, #764ba2); color: white; }
.btn-outline { background: white; border: 1px solid #d1d5db; color: #374151; }
.empty-row {
  padding: 40px !important;
  text-align: center !important;
  color: #9ca3af;
}
.legend-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  padding: 12px 16px;
  background: white;
  border-radius: 10px;
  font-size: 12px;
  color: #6b7280;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}
.legend-title { font-weight: 600; color: #374151; }
.legend-item { display: inline-flex; align-items: center; gap: 4px; }
.role-demo {
  width: 20px; height: 20px;
  border-radius: 10px;
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 10px;
  border: none !important;
}
@media (max-width: 768px) {
  .summary-row { grid-template-columns: repeat(2, 1fr); }
}
</style>
