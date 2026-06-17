<template>
  <div class="conflict-coord-panel">
    <div class="panel-header">
      <h3>冲突协调中心</h3>
      <div class="header-right">
        <select v-model="statusFilter" class="select-input mini">
          <option v-for="(l, k) in CONFLICT_STATUS_LABEL" :key="k" :value="k">{{ l }}</option>
        </select>
        <select v-model="typeFilter" class="select-input mini">
          <option value="">全部类型</option>
          <option v-for="(l, k) in CONFLICT_TYPE_LABEL" :key="k" :value="k">{{ l }}</option>
        </select>
        <button class="btn btn-primary" @click="openNewConflict()">+ 上报冲突</button>
      </div>
    </div>

    <div v-if="conflictList.length === 0" class="empty-tip">
      🎉 暂无冲突记录
    </div>

    <div v-else class="conflict-list">
      <div v-for="c in conflictList" :key="c.id" class="conflict-card">
        <div class="conf-head">
          <div class="conf-main">
            <div class="conf-title-row">
              <span :class="['sev-badge', 'sev-' + c.severity]">{{ severityLabel(c) }}</span>
              <span :class="['type-badge', 'type-' + c.type]">{{ typeLabel(c) }}</span>
              <h4 class="conf-title">{{ c.title }}</h4>
            </div>
            <div class="conf-sub" v-if="c.description">{{ c.description }}</div>
            <div class="conf-meta">
              <span v-if="c.performanceId" class="meta-tag">
                📋 {{ getPerformance(c.performanceId)?.name || c.performanceId }}
              </span>
              <span v-if="c.songId" class="meta-tag">🎵 {{ getSong(c.songId)?.name || c.songId }}</span>
              <span v-if="c.facilityType" class="meta-tag">🏗️ 设施: {{ c.facilityType }}</span>
              <span class="meta-tag">🕐 {{ formatTime(c.createdAt) }}</span>
            </div>
          </div>
          <div :class="['status-badge', 'st-' + c.status]">{{ statusLabel(c) }}</div>
        </div>

        <div class="conf-body">
          <div class="affected-box" v-if="hasAffected(c)">
            <div class="affected-title">受影响内容（标记为待协调，不能直接删除）：</div>
            <div class="affected-row">
              <span v-for="sid in c.affectedSongIds" :key="'s'+sid" class="aff-tag aff-song">
                🎵 {{ getSong(sid)?.name || sid }}
              </span>
              <span v-for="eid in c.affectedEquipmentIds" :key="'e'+eid" class="aff-tag aff-eq">
                🔧 {{ getEquipment(eid)?.name || eid }}
              </span>
              <span v-for="fid in c.affectedFacilityIds" :key="'f'+fid" class="aff-tag aff-fac">
                🏗️ {{ fid }}
              </span>
            </div>
          </div>

          <div class="windows-box" v-if="c.suggestedWindows && c.suggestedWindows.length > 0">
            <div class="windows-title">💡 系统推荐的替代排练窗口：</div>
            <div class="windows-row">
              <div
                v-for="(w, idx) in c.suggestedWindows"
                :key="idx"
                class="window-card"
                @click="applyWindow(c, w)"
              >
                <div class="w-label">{{ w.label }}</div>
                <div class="w-time">{{ formatTime(w.startAt) }}</div>
              </div>
            </div>
          </div>

          <div class="windows-box" v-else-if="c.type === 'venue_facility' || c.type === 'equipment'">
            <button class="btn btn-outline" @click="autoSuggest(c)">🤖 自动生成替代窗口</button>
          </div>

          <div class="part-shortage-box" v-if="c.type === 'part'">
            <div class="ps-row">声部: <strong>{{ c.partName }}</strong></div>
            <div class="ps-row">需要: <strong class="req">{{ c.required }}</strong> / 可用: <strong class="avail">{{ c.available }}</strong></div>
            <div v-if="c.backupCandidates && c.backupCandidates.length > 0" class="ps-row">
              替补候选人: 
              <span v-for="b in c.backupCandidates" :key="b.userId" class="cand-tag">{{ b.userName }}</span>
            </div>
            <div v-if="c.recommendedAction" class="ps-row ps-rec">
              推荐: {{ recommendLabel(c.recommendedAction) }}
            </div>
          </div>

          <div class="resolve-row">
            <input v-model="resolveDraft[c.id]" type="text" placeholder="输入处理备注..." />
            <button
              v-if="c.status !== CONFLICT_STATUS.RESOLVED"
              class="btn btn-success"
              @click="resolve(c)"
            >✅ 标记已解决</button>
            <button
              v-if="c.status === CONFLICT_STATUS.RESOLVED"
              class="btn btn-outline"
              @click="reopen(c)"
            >🔄 重新打开</button>
            <button
              v-if="c.status === CONFLICT_STATUS.PENDING_COORDINATION"
              class="btn btn-outline"
              @click="ignore(c)"
            >🙈 忽略</button>
          </div>
          <div v-if="c.resolutionNote" class="resolution-note">
            📝 {{ c.resolutionNote }}
          </div>
        </div>
      </div>
    </div>

    <div v-if="showNewModal" class="modal-overlay" @click.self="showNewModal = false">
      <div class="modal modal-medium">
        <div class="modal-header">
          <h3>上报新冲突</h3>
          <button class="modal-close" @click="showNewModal = false">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>冲突类型 *</label>
            <select v-model="newForm.type" class="select-input">
              <option value="">- 请选择 -</option>
              <option v-for="(l, k) in CONFLICT_TYPE_LABEL" :key="k" :value="k">{{ l }}</option>
            </select>
          </div>
          <div class="form-group">
            <label>标题 *</label>
            <input v-model="newForm.title" type="text" placeholder="简短描述" />
          </div>
          <div class="form-group">
            <label>关联演出单</label>
            <select v-model="newForm.performanceId" class="select-input">
              <option value="">- 不关联 -</option>
              <option v-for="p in performanceStore.performanceList" :key="p.id" :value="p.id">{{ p.name }}</option>
            </select>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>严重程度</label>
              <select v-model="newForm.severity" class="select-input">
                <option v-for="(l, k) in CONFLICT_SEVERITY_LABEL" :key="k" :value="k">{{ l }}</option>
              </select>
            </div>
            <div class="form-group">
              <label>设施类型</label>
              <input v-model="newForm.facilityType" type="text" placeholder="如：音响/话筒/电源" />
            </div>
          </div>
          <div class="form-group">
            <label>详细描述</label>
            <textarea v-model="newForm.description" rows="3" placeholder="冲突详情、受影响范围..."></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" @click="showNewModal = false">取消</button>
          <button class="btn btn-primary" @click="submitNew()">提交</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import {
  useConflictStore,
  CONFLICT_TYPE,
  CONFLICT_TYPE_LABEL,
  CONFLICT_STATUS,
  CONFLICT_STATUS_LABEL,
  CONFLICT_SEVERITY_LABEL
} from '../stores/conflict'
import { usePerformanceStore } from '../stores/performance'
import { useSongStore } from '../stores/song'
import { useEquipmentStore } from '../stores/equipment'
import { useEquipmentScheduleStore } from '../stores/equipmentSchedule'
import { LEAVE_RESOLUTION_ACTION_LABEL } from '../stores/leave'

const conflictStore = useConflictStore()
const performanceStore = usePerformanceStore()
const songStore = useSongStore()
const equipmentStore = useEquipmentStore()
const scheduleStore = useEquipmentScheduleStore()

const statusFilter = ref(CONFLICT_STATUS.PENDING_COORDINATION)
const typeFilter = ref('')

const showNewModal = ref(false)
const newForm = reactive({
  type: '',
  title: '',
  performanceId: '',
  severity: 'warning',
  facilityType: '',
  description: ''
})
const resolveDraft = reactive({})

const conflictList = computed(() =>
  conflictStore.searchConflicts('', typeFilter.value, statusFilter.value)
)

function severityLabel(c) { return CONFLICT_SEVERITY_LABEL[c.severity] || c.severity }
function typeLabel(c) { return CONFLICT_TYPE_LABEL[c.type] || c.type }
function statusLabel(c) { return CONFLICT_STATUS_LABEL[c.status] || c.status }
function formatTime(t) {
  if (!t) return '-'
  const d = new Date(t)
  return d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}
function getPerformance(id) { return performanceStore.getPerformanceById(id) }
function getSong(id) { return songStore.getSongById(id) }
function getEquipment(id) { return equipmentStore.getEquipmentById(id) }
function hasAffected(c) {
  return (c.affectedSongIds || []).length + (c.affectedEquipmentIds || []).length + (c.affectedFacilityIds || []).length > 0
}
function recommendLabel(a) { return LEAVE_RESOLUTION_ACTION_LABEL[a] || a }

function openNewConflict() {
  Object.assign(newForm, {
    type: '', title: '', performanceId: '', severity: 'warning', facilityType: '', description: ''
  })
  showNewModal.value = true
}

function submitNew() {
  if (!newForm.type || !newForm.title) {
    alert('请填写类型和标题')
    return
  }
  conflictStore.createConflict({ ...newForm })
  showNewModal.value = false
}

function resolve(c) {
  conflictStore.resolveConflict(c.id, resolveDraft[c.id] || '')
}
function reopen(c) {
  conflictStore.reopenConflict(c.id)
}
function ignore(c) {
  const reason = prompt('请输入忽略原因：')
  if (reason === null) return
  conflictStore.ignoreConflict(c.id, reason)
}

function autoSuggest(c) {
  const allSchedules = []
  if (c.type === CONFLICT_TYPE.VENUE_FACILITY) {
    allSchedules.push(...(scheduleStore.checkFacilityConflict(c.venueId || '', c.facilityType, 0, 0) || []))
  }
  const base = Date.now() + 3600 * 1000
  const baseEnd = base + 2 * 3600 * 1000
  const suggestions = scheduleStore.suggestAlternativeWindows(
    allSchedules.length > 0 ? allSchedules : scheduleStore.facilitySchedules.value.concat(scheduleStore.schedules.value),
    new Date(base).toISOString(),
    new Date(baseEnd).toISOString()
  )
  if (suggestions.length === 0) {
    alert('暂未找到空窗期，请手动协调')
    return
  }
  conflictStore.setSuggestedWindows(c.id, suggestions)
}

function applyWindow(c, w) {
  if (!confirm(`采用窗口「${w.label}」 - ${formatTime(w.startAt)} ？会把冲突标记为已解决并记录。`)) return
  const note = `采用推荐窗口: ${w.label} (${formatTime(w.startAt)})`
  conflictStore.resolveConflict(c.id, note)
}
</script>

<style scoped>
.conflict-coord-panel { display: flex; flex-direction: column; gap: 14px; }
.panel-header { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; }
.panel-header h3 { margin: 0; }
.header-right { display: flex; gap: 8px; align-items: center; }
.select-input.mini { padding: 6px 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 13px; }
.conflict-list { display: flex; flex-direction: column; gap: 12px; }
.conflict-card { border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden; }
.conf-head {
  padding: 14px 16px;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}
.conf-main { flex: 1; }
.conf-title-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-bottom: 4px; }
.conf-title { margin: 0; font-size: 15px; color: #1f2937; }
.sev-badge { padding: 2px 10px; border-radius: 10px; font-weight: 600; font-size: 11px; }
.sev-critical { background: #fee2e2; color: #b91c1c; }
.sev-warning { background: #fef3c7; color: #92400e; }
.sev-info { background: #dbeafe; color: #1d4ed8; }
.type-badge { padding: 2px 10px; border-radius: 10px; font-weight: 600; font-size: 11px; }
.type-equipment { background: #e0e7ff; color: #3730a3; }
.type-venue { background: #fae8ff; color: #86198f; }
.type-venue_facility { background: #fed7aa; color: #9a3412; }
.type-part { background: #bbf7d0; color: #166534; }
.type-schedule { background: #bae6fd; color: #0369a1; }
.conf-sub { color: #4b5563; font-size: 13px; margin-bottom: 6px; }
.conf-meta { display: flex; flex-wrap: wrap; gap: 6px; }
.meta-tag { padding: 2px 8px; background: white; border: 1px solid #e5e7eb; border-radius: 10px; font-size: 11px; color: #4b5563; }
.status-badge { padding: 4px 12px; border-radius: 12px; font-weight: 600; font-size: 12px; white-space: nowrap; }
.st-pending_coordination { background: #fef3c7; color: #92400e; }
.st-resolved { background: #d1fae5; color: #059669; }
.st-ignored { background: #e5e7eb; color: #6b7280; }
.conf-body { padding: 14px 16px; display: flex; flex-direction: column; gap: 10px; }
.affected-box {
  padding: 10px 12px;
  border-radius: 8px;
  background: linear-gradient(135deg, #fffbeb, #fef3c7);
  border: 1px solid #fde68a;
}
.affected-title { font-size: 12px; font-weight: 600; color: #92400e; margin-bottom: 6px; }
.affected-row { display: flex; gap: 6px; flex-wrap: wrap; }
.aff-tag { padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: 500; }
.aff-song { background: #fef3c7; color: #92400e; }
.aff-eq { background: #e0e7ff; color: #3730a3; }
.aff-fac { background: #fed7aa; color: #9a3412; }
.windows-box {
  padding: 10px 12px;
  border-radius: 8px;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
}
.windows-title { font-size: 12px; font-weight: 600; color: #166534; margin-bottom: 8px; }
.windows-row { display: flex; gap: 8px; flex-wrap: wrap; }
.window-card {
  padding: 8px 12px;
  background: white;
  border: 1px solid #bbf7d0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 140px;
}
.window-card:hover { background: #dcfce7; transform: translateY(-1px); }
.w-label { font-weight: 600; color: #15803d; font-size: 13px; }
.w-time { font-size: 12px; color: #4b5563; margin-top: 2px; }
.part-shortage-box {
  padding: 10px 12px;
  border-radius: 8px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  display: flex; flex-direction: column; gap: 6px;
}
.ps-row { font-size: 13px; color: #7f1d1d; display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
.ps-row .req { color: #b91c1c; }
.ps-row .avail { color: #dc2626; }
.ps-rec { padding-top: 4px; border-top: 1px dashed #fecaca; }
.cand-tag { padding: 2px 10px; background: white; border: 1px solid #fecaca; border-radius: 10px; font-size: 12px; }
.resolve-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; padding-top: 6px; border-top: 1px solid #f3f4f6; }
.resolve-row input[type=text] {
  flex: 1; min-width: 200px; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 7px; font-size: 13px; outline: none;
}
.resolve-row input:focus { border-color: #667eea; box-shadow: 0 0 0 3px rgba(102,126,234,0.15); }
.resolution-note { padding: 8px 12px; background: #ecfdf5; color: #065f46; border-radius: 6px; font-size: 13px; }
.btn { padding: 6px 14px; border-radius: 7px; font-size: 13px; border: none; cursor: pointer; font-weight: 500; }
.btn-primary { background: linear-gradient(135deg, #667eea, #764ba2); color: white; }
.btn-success { background: linear-gradient(135deg, #10b981, #059669); color: white; }
.btn-outline { background: white; color: #374151; border: 1px solid #d1d5db; }
.empty-tip { padding: 40px; background: #f9fafb; color: #9ca3af; text-align: center; border-radius: 8px; }

/* Modal */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
.modal { background: white; border-radius: 14px; max-height: 90vh; display: flex; flex-direction: column; animation: slideUp 0.2s ease; }
.modal-medium { width: 100%; max-width: 560px; }
@keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
.modal-header { padding: 18px 24px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; }
.modal-header h3 { margin: 0; }
.modal-close { background: none; border: none; font-size: 28px; color: #9ca3af; cursor: pointer; }
.modal-body { padding: 20px 24px; overflow-y: auto; display: flex; flex-direction: column; gap: 14px; }
.modal-footer { padding: 16px 24px; border-top: 1px solid #e5e7eb; display: flex; justify-content: flex-end; gap: 10px; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.form-group label { display: block; font-size: 13px; font-weight: 500; color: #374151; margin-bottom: 6px; }
.form-group input, .form-group textarea, .form-group select {
  width: 100%; padding: 9px 12px; border: 1px solid #d1d5db; border-radius: 7px; font-size: 13px;
  outline: none; box-sizing: border-box; font-family: inherit;
}
.form-group input:focus, .form-group textarea:focus, .form-group select:focus {
  border-color: #667eea; box-shadow: 0 0 0 3px rgba(102,126,234,0.15);
}
</style>
