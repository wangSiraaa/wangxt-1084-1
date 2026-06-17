<template>
  <div class="leave-process-panel">
    <div class="panel-header">
      <h3>请假处理与声部判定</h3>
      <div class="header-right">
        <span :class="['summary-tag warn']" v-if="leaveStore.pendingCount > 0">
          ⏳ {{ leaveStore.pendingCount }} 条待审批
        </span>
      </div>
    </div>

    <div class="leave-list" v-if="leaveStore.leaveList.length > 0">
      <div v-for="lve in leaveStore.leaveList" :key="lve.id" class="leave-card">
        <div class="leave-head">
          <div class="leave-info">
            <div class="user-row">
              <span class="avatar">{{ (getUser(lve.userId)?.name || '?').charAt(0) }}</span>
              <div>
                <div class="user-name">
                  {{ getUser(lve.userId)?.name || '未知用户' }}
                  <span class="leave-part" v-if="getPart(lve.partId)">({{ getPart(lve.partId)?.name }})</span>
                </div>
                <div class="leave-dates">
                  {{ formatDate(lve.startDate) }} ~ {{ formatDate(lve.endDate) }}
                </div>
              </div>
            </div>
            <div class="leave-reason" v-if="lve.reason">"{{ lve.reason }}"</div>
          </div>
          <div :class="['status-badge', 'status-' + lve.status]">
            {{ LEAVE_STATUS_LABEL[lve.status] }}
          </div>
        </div>

        <div v-if="lve.status === LEAVE_STATUS.PENDING" class="leave-body">
          <div v-if="analyzedLeaveId === lve.id && analyzeResult" class="analyze-box">
            <div class="analyze-title">📊 声部人数判定</div>
            <div v-if="analyzeResult.reasons.length === 0" class="analyze-ok">
              ✅ 声部人数均满足要求
            </div>
            <div v-else class="analyze-warnings">
              <div v-for="(r, i) in analyzeResult.reasons" :key="i" class="warn-row">⚠️ {{ r }}</div>
            </div>
            <div class="analyze-suggest">
              <div class="sug-title">推荐方案：</div>
              <div v-for="(s, i) in analyzeResult.suggestions" :key="i" class="sug-row">
                <span :class="['sug-tag', 'sug-' + s.action]">
                  {{ LEAVE_RESOLUTION_ACTION_LABEL[s.action] }}
                </span>
                <span class="sug-text">
                  {{ s.reason || s.partName }}
                  <span v-if="s.candidates" class="sug-candidates">
                    (候选替补: {{ s.candidates.map(c => c.userName).join('、') }})
                  </span>
                </span>
              </div>
            </div>
            <div class="resolution-row">
              <label>选择处理方式:</label>
              <select v-model="resolutionDraft[lve.id]" class="select-input mini">
                <option value="">- 请选择 -</option>
                <option v-for="s in analyzeResult.suggestions" :key="s.action" :value="s.action">
                  {{ LEAVE_RESOLUTION_ACTION_LABEL[s.action] }}
                </option>
              </select>
              <label class="inline-label">指定替补:</label>
              <select v-model="substituteDraft[lve.id]" class="select-input mini">
                <option value="">- 无 -</option>
                <option v-for="c in collectCandidates(analyzeResult)" :key="c.userId" :value="c.userId">
                  {{ c.userName }}
                </option>
              </select>
              <input v-model="resNoteDraft[lve.id]" type="text" placeholder="处理备注..." />
            </div>
          </div>

          <div class="leave-actions">
            <button v-if="analyzedLeaveId !== lve.id" class="btn btn-outline" @click="analyzeImpact(lve)">
              🔍 声部人数判定
            </button>
            <template v-else>
              <button
                class="btn btn-success"
                :disabled="!resolutionDraft[lve.id]"
                @click="doApprove(lve)"
              >
                ✅ 批准并执行方案
              </button>
              <button class="btn btn-danger" @click="doReject(lve)">❌ 驳回</button>
            </template>
          </div>
        </div>

        <div v-if="lve.status === LEAVE_STATUS.APPROVED && lve.resolution" class="resolution-info">
          处理方式: <strong>{{ LEAVE_RESOLUTION_ACTION_LABEL[lve.resolution] }}</strong>
          <span v-if="lve.substituteUserId"> | 替补: {{ getUser(lve.substituteUserId)?.name }}</span>
          <span v-if="lve.resolutionNote"> | 备注: {{ lve.resolutionNote }}</span>
        </div>
      </div>
    </div>
    <div v-else class="empty-tip">暂无请假记录</div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import {
  useLeaveStore,
  LEAVE_STATUS,
  LEAVE_STATUS_LABEL,
  LEAVE_RESOLUTION_ACTION,
  LEAVE_RESOLUTION_ACTION_LABEL
} from '../stores/leave'
import { usePerformanceStore } from '../stores/performance'
import { useSignupStore } from '../stores/signup'
import { useSongConfigStore } from '../stores/songConfig'
import { usePartStore } from '../stores/part'
import { useAuthStore } from '../stores/auth'

const leaveStore = useLeaveStore()
const performanceStore = usePerformanceStore()
const signupStore = useSignupStore()
const songConfigStore = useSongConfigStore()
const partStore = usePartStore()
const authStore = useAuthStore()

const analyzedLeaveId = ref(null)
const analyzeResult = ref(null)
const resolutionDraft = reactive({})
const substituteDraft = reactive({})
const resNoteDraft = reactive({})

function getUser(id) { return id ? authStore.getUserById(id) : null }
function getPart(id) { return id ? partStore.getPartById(id) : null }
function formatDate(d) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
}

function analyzeImpact(lve) {
  analyzedLeaveId.value = lve.id
  analyzeResult.value = leaveStore.analyzeLeaveImpact(
    lve.id, performanceStore, signupStore, songConfigStore, partStore, authStore
  )
  resolutionDraft[lve.id] = resolutionDraft[lve.id] || ''
  substituteDraft[lve.id] = substituteDraft[lve.id] || ''
  resNoteDraft[lve.id] = resNoteDraft[lve.id] || ''
}

function collectCandidates(r) {
  const arr = []
  if (!r) return arr
  for (const s of r.suggestions || []) {
    if (s.candidates) {
      for (const c of s.candidates) if (!arr.find(a => a.userId === c.userId)) arr.push(c)
    }
  }
  return arr
}

function doApprove(lve) {
  const action = resolutionDraft[lve.id]
  if (!action) {
    alert('请先选择处理方式')
    return
  }
  leaveStore.approveLeaveWithResolution(
    lve.id, action, resNoteDraft[lve.id], substituteDraft[lve.id]
  )
  if (action === LEAVE_RESOLUTION_ACTION.SUSPEND_PERFORMANCE) {
    const perf = performanceStore.getPerformanceById(lve.performanceId)
    if (perf) {
      performanceStore.suspendPerformance(perf.id, `请假挂起: ${getUser(lve.userId)?.name || ''} 请假 (${lve.reason || ''})`)
    }
  }
  alert('请假已批准，方案已记录')
  analyzedLeaveId.value = null
  analyzeResult.value = null
}

function doReject(lve) {
  const reason = prompt('请输入驳回理由：')
  if (reason === null) return
  leaveStore.rejectLeave(lve.id, reason)
  alert('已驳回')
}
</script>

<style scoped>
.leave-process-panel { display: flex; flex-direction: column; gap: 14px; }
.panel-header { display: flex; justify-content: space-between; align-items: center; }
.panel-header h3 { margin: 0; }
.summary-tag { padding: 4px 12px; border-radius: 12px; font-weight: 600; font-size: 12px; }
.summary-tag.warn { background: #fef3c7; color: #92400e; }
.leave-list { display: flex; flex-direction: column; gap: 12px; }
.leave-card { border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden; }
.leave-head {
  padding: 14px 16px;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;
}
.leave-info { flex: 1; display: flex; flex-direction: column; gap: 8px; }
.user-row { display: flex; align-items: center; gap: 10px; }
.avatar {
  width: 36px; height: 36px; border-radius: 50%;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white; display: flex; align-items: center; justify-content: center;
  font-weight: 700;
}
.user-name { font-weight: 600; color: #1f2937; }
.leave-part { color: #667eea; font-size: 12px; margin-left: 6px; }
.leave-dates { color: #6b7280; font-size: 12px; }
.leave-reason { color: #4b5563; font-size: 13px; padding: 6px 10px; background: white; border-radius: 6px; border: 1px solid #e5e7eb; font-style: italic; }
.status-badge { padding: 4px 12px; border-radius: 12px; font-weight: 600; font-size: 12px; white-space: nowrap; }
.status-pending { background: #fef3c7; color: #92400e; }
.status-approved { background: #d1fae5; color: #059669; }
.status-rejected { background: #fee2e2; color: #b91c1c; }
.status-cancelled { background: #e5e7eb; color: #4b5563; }
.leave-body { padding: 14px 16px; display: flex; flex-direction: column; gap: 12px; }
.analyze-box {
  padding: 14px;
  border-radius: 8px;
  background: linear-gradient(135deg, #f8fafc, #f1f5f9);
  border: 1px solid #e2e8f0;
  display: flex; flex-direction: column; gap: 10px;
}
.analyze-title { font-weight: 700; color: #1f2937; font-size: 14px; }
.analyze-ok { color: #059669; font-weight: 600; }
.analyze-warnings { display: flex; flex-direction: column; gap: 4px; }
.warn-row { color: #b45309; font-size: 13px; }
.analyze-suggest { border-top: 1px dashed #cbd5e1; padding-top: 10px; display: flex; flex-direction: column; gap: 6px; }
.sug-title { font-size: 12px; font-weight: 600; color: #475569; }
.sug-row { display: flex; align-items: center; gap: 8px; font-size: 13px; }
.sug-tag { padding: 2px 10px; border-radius: 10px; font-weight: 600; font-size: 11px; }
.sug-find_substitute { background: #dbeafe; color: #1d4ed8; }
.sug-change_song { background: #fef3c7; color: #92400e; }
.sug-suspend_performance { background: #fee2e2; color: #b91c1c; }
.sug-accept_risk { background: #d1fae5; color: #059669; }
.sug-text { color: #374151; }
.sug-candidates { color: #4338ca; margin-left: 4px; }
.resolution-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; padding-top: 8px; border-top: 1px dashed #cbd5e1; }
.resolution-row label { font-size: 12px; color: #475569; font-weight: 500; }
.inline-label { margin-left: 4px; }
.resolution-row input[type=text] {
  flex: 1; min-width: 160px; padding: 6px 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 13px; outline: none;
}
.resolution-row input:focus { border-color: #667eea; }
.select-input.mini { padding: 6px 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 13px; outline: none; }
.leave-actions { display: flex; gap: 10px; }
.resolution-info {
  padding: 10px 16px;
  background: #ecfdf5;
  border-top: 1px solid #a7f3d0;
  font-size: 13px;
  color: #065f46;
}
.btn { padding: 7px 14px; border-radius: 7px; font-size: 13px; border: none; cursor: pointer; font-weight: 500; }
.btn-success { background: linear-gradient(135deg, #10b981, #059669); color: white; }
.btn-danger { background: #ef4444; color: white; }
.btn-outline { background: white; color: #374151; border: 1px solid #d1d5db; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.empty-tip { padding: 40px; background: #f9fafb; color: #9ca3af; text-align: center; border-radius: 8px; }
</style>
