<template>
  <div class="admin-dashboard">
    <div class="page-header">
      <div>
        <h2>🎛️ 管理员工作台</h2>
        <p class="subtitle">设备全生命周期管理 · 设备需求总览</p>
      </div>
      <div class="header-actions">
        <button class="btn btn-warning header-matrix-btn" @click="gotoMatrix">
          ⚠️ 冲突矩阵
          <span v-if="conflictStore.pendingCount > 0" class="pending-dot">{{ conflictStore.pendingCount }}</span>
        </button>
      </div>
    </div>

    <div class="stats-row">
      <div class="stat-card total">
        <div class="stat-icon">📦</div>
        <div class="stat-info">
          <div class="stat-value">{{ equipmentStore.equipmentCount }}</div>
          <div class="stat-label">设备总数</div>
        </div>
      </div>
      <div class="stat-card available">
        <div class="stat-icon">✅</div>
        <div class="stat-info">
          <div class="stat-value">{{ equipmentStore.availableCount }}</div>
          <div class="stat-label">可用设备</div>
        </div>
      </div>
      <div class="stat-card maintenance">
        <div class="stat-icon">🔧</div>
        <div class="stat-info">
          <div class="stat-value">{{ equipmentStore.maintenanceCount }}</div>
          <div class="stat-label">维护中</div>
        </div>
      </div>
      <div class="stat-card performance">
        <div class="stat-icon">🎵</div>
        <div class="stat-info">
          <div class="stat-value">{{ performanceStore.performanceCount }}</div>
          <div class="stat-label">演出单总数</div>
        </div>
      </div>
    </div>

    <div class="content-tabs">
      <div class="tabs-header">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          :class="['tab-btn', { active: activeTab === tab.key }]"
          @click="activeTab = tab.key"
        >
          <span class="tab-icon">{{ tab.icon }}</span>
          <span>{{ tab.label }}</span>
        </button>
      </div>

      <div class="tabs-content">
        <div v-if="activeTab === 'equipment'" class="tab-panel">
          <div class="panel-toolbar">
            <div class="search-group">
              <input
                v-model="searchKeyword"
                type="text"
                class="search-input"
                placeholder="🔍 搜索设备名称、分类、描述..."
              />
              <select v-model="statusFilter" class="filter-select">
                <option value="">全部状态</option>
                <option value="available">可用</option>
                <option value="maintenance">维护中</option>
              </select>
              <select v-model="categoryFilter" class="filter-select">
                <option value="">全部分类</option>
                <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
              </select>
            </div>
            <button class="btn btn-primary" @click="openEquipmentModal()">
              ➕ 新增设备
            </button>
          </div>

          <div v-if="filteredEquipments.length === 0" class="empty-state">
            <div class="empty-icon">📭</div>
            <p>暂无符合条件的设备</p>
          </div>

          <div v-else class="equipment-grid">
            <div v-for="eq in filteredEquipments" :key="eq.id" class="equipment-card">
              <div class="eq-header">
                <h4 class="eq-name">{{ eq.name }}</h4>
                <span
                  :class="['status-badge', eq.status]"
                >{{ EQUIPMENT_STATUS_LABEL[eq.status] }}</span>
              </div>
              <div class="eq-meta">
                <span class="eq-category">🏷️ {{ eq.category }}</span>
                <span class="eq-date">📅 上次维护: {{ formatDate(eq.lastMaintenanceDate) }}</span>
              </div>
              <p v-if="eq.description" class="eq-desc">{{ eq.description }}</p>

              <div class="eq-usage">
                <strong>使用情况：</strong>
                <span v-if="getEquipmentUsage(eq.id).length === 0" class="no-usage">暂未被演出单引用</span>
                <span v-else class="usage-count">被 {{ getEquipmentUsage(eq.id).length }} 个演出单使用</span>
              </div>

              <div v-if="getEquipmentUsage(eq.id).length > 0" class="usage-list">
                <div v-for="p in getEquipmentUsage(eq.id).slice(0, 3)" :key="p.id" class="usage-item">
                  🎤 {{ p.name }}
                  <span :class="['mini-status', p.status]">{{ PERFORMANCE_STATUS_LABEL[p.status] }}</span>
                </div>
                <div v-if="getEquipmentUsage(eq.id).length > 3" class="usage-more">
                  ...还有 {{ getEquipmentUsage(eq.id).length - 3 }} 个演出单
                </div>
              </div>

              <div class="eq-actions">
                <button
                  v-if="eq.status === 'available'"
                  class="btn btn-warning btn-sm"
                  @click="handleSetMaintenance(eq)"
                >
                  🔧 标记维护
                </button>
                <button
                  v-else
                  class="btn btn-success btn-sm"
                  @click="handleSetAvailable(eq)"
                >
                  ✅ 恢复可用
                </button>
                <button class="btn btn-default btn-sm" @click="openEquipmentModal(eq)">
                  ✏️ 编辑
                </button>
                <button
                  class="btn btn-danger btn-sm"
                  @click="handleDeleteEquipment(eq)"
                  :disabled="getEquipmentUsage(eq.id).length > 0"
                  :title="getEquipmentUsage(eq.id).length > 0 ? '设备被使用中，无法删除' : ''"
                >
                  🗑️ 删除
                </button>
              </div>
            </div>
          </div>
        </div>

        <div v-if="activeTab === 'demand'" class="tab-panel">
          <div class="panel-toolbar">
            <h3 class="panel-title">📋 设备需求总览</h3>
            <select v-model="perfStatusFilter" class="filter-select">
              <option value="">全部演出单</option>
              <option value="draft">草稿</option>
              <option value="confirmed">已确认</option>
              <option value="started">进行中</option>
              <option value="completed">已完成</option>
            </select>
          </div>

          <div v-if="filteredPerformances.length === 0" class="empty-state">
            <div class="empty-icon">📭</div>
            <p>暂无演出单设备需求</p>
          </div>

          <div v-else class="demand-list">
            <div v-for="perf in filteredPerformances" :key="perf.id" class="demand-card">
              <div class="demand-header">
                <div>
                  <h4>🎤 {{ perf.name }}</h4>
                  <div class="demand-meta">
                    <span>📅 {{ formatDate(perf.performanceDate) }}</span>
                    <span v-if="perf.venue">📍 {{ perf.venue }}</span>
                    <span :class="['status-badge', perf.status]">{{ PERFORMANCE_STATUS_LABEL[perf.status] }}</span>
                  </div>
                </div>
                <div class="demand-summary">
                  <div class="summary-item">
                    <span class="summary-label">曲目</span>
                    <span class="summary-value">{{ (perf.songIds || []).length }} 首</span>
                  </div>
                  <div class="summary-item">
                    <span class="summary-label">设备</span>
                    <span class="summary-value">{{ (perf.equipmentIds || []).length }} 件</span>
                  </div>
                </div>
              </div>

              <div class="demand-equipments">
                <div
                  v-if="(perf.equipmentIds || []).length === 0"
                  class="no-equipment"
                >
                  ⚠️ 该演出单尚未分配设备
                </div>
                <div v-else class="equipment-tags">
                  <div
                    v-for="eqId in perf.equipmentIds"
                    :key="eqId"
                    :class="['eq-tag', getEquipmentById(eqId)?.status || '']"
                  >
                    <span class="tag-icon">{{ getCategoryIcon(getEquipmentById(eqId)?.category) }}</span>
                    <span class="tag-name">{{ getEquipmentById(eqId)?.name || '未知设备' }}</span>
                    <span v-if="getEquipmentById(eqId)?.status === 'maintenance'" class="tag-warn">⚠️ 维护中</span>
                  </div>
                </div>

                <div v-if="getMaintenanceEquipmentsInPerf(perf).length > 0" class="maintenance-warning">
                  ⚠️ 以下设备处于维护中，建议更换：
                  <span v-for="eq in getMaintenanceEquipmentsInPerf(perf)" :key="eq.id" class="warn-item">
                    {{ eq.name }}
                  </span>
                </div>
              </div>

              <div class="demand-footer">
                <div class="missing-hint">
                  <span v-if="getMissingKeyPartsHint(perf.id)" class="danger-hint">
                    🔴 {{ getMissingKeyPartsHint(perf.id) }}
                  </span>
                  <span v-else class="safe-hint">✅ 关键声部报名齐全</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="activeTab === 'conflicts'" class="tab-panel">
          <ConflictCoordinationPanel />
        </div>
      </div>
    </div>

    <div v-if="showEquipmentModal" class="modal-overlay" @click.self="closeEquipmentModal">
      <div class="modal-content modal-lg">
        <div class="modal-header">
          <h3>{{ editingEquipment ? '✏️ 编辑设备' : '➕ 新增设备' }}</h3>
          <button class="modal-close" @click="closeEquipmentModal">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">设备名称 <span class="required">*</span></label>
            <input v-model="equipmentForm.name" type="text" class="form-input" placeholder="请输入设备名称" />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">设备分类 <span class="required">*</span></label>
              <select v-model="equipmentForm.category" class="form-input">
                <option value="">请选择分类</option>
                <option v-for="cat in allCategories" :key="cat" :value="cat">{{ cat }}</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">设备状态</label>
              <select v-model="equipmentForm.status" class="form-input">
                <option value="available">可用</option>
                <option value="maintenance">维护中</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">设备描述</label>
            <textarea
              v-model="equipmentForm.description"
              class="form-input"
              rows="3"
              placeholder="请输入设备描述、备注等信息..."
            ></textarea>
          </div>
          <div v-if="formErrors.length > 0" class="form-errors">
            <div v-for="(err, i) in formErrors" :key="i" class="error-item">❌ {{ err }}</div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-default" @click="closeEquipmentModal">取消</button>
          <button class="btn btn-primary" @click="handleSaveEquipment">💾 保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import { useEquipmentStore, EQUIPMENT_STATUS, EQUIPMENT_STATUS_LABEL } from '../stores/equipment'
import { usePerformanceStore, PERFORMANCE_STATUS, PERFORMANCE_STATUS_LABEL } from '../stores/performance'
import { useSignupStore } from '../stores/signup'
import ConflictCoordinationPanel from '../components/ConflictCoordinationPanel.vue'
import { useRouter } from 'vue-router'
import { useConflictStore } from '../stores/conflict'

const router = useRouter()
const conflictStore = useConflictStore()
function gotoMatrix() { router.push('/conflicts') }

const equipmentStore = useEquipmentStore()
const performanceStore = usePerformanceStore()
const signupStore = useSignupStore()

const tabs = [
  { key: 'equipment', label: '设备管理', icon: '🔧' },
  { key: 'demand', label: '设备需求总览', icon: '📋' },
  { key: 'conflicts', label: '冲突协调', icon: '⚠️' }
]
const activeTab = ref('equipment')

const searchKeyword = ref('')
const statusFilter = ref('')
const categoryFilter = ref('')
const perfStatusFilter = ref('')

const allCategories = ['吉他', '贝斯', '打击乐', '键盘', '音频', '音箱', '其他']
const categories = computed(() => {
  const set = new Set(equipmentStore.equipmentList.map(e => e.category).filter(Boolean))
  return Array.from(set)
})

const filteredEquipments = computed(() => {
  let result = equipmentStore.equipmentList
  if (statusFilter.value) {
    result = result.filter(e => e.status === statusFilter.value)
  }
  if (categoryFilter.value) {
    result = result.filter(e => e.category === categoryFilter.value)
  }
  if (searchKeyword.value) {
    const kw = searchKeyword.value.toLowerCase()
    result = result.filter(e =>
      e.name.toLowerCase().includes(kw) ||
      e.category.toLowerCase().includes(kw) ||
      (e.description && e.description.toLowerCase().includes(kw))
    )
  }
  return result
})

const filteredPerformances = computed(() => {
  let result = performanceStore.performanceList
  if (perfStatusFilter.value) {
    result = result.filter(p => p.status === perfStatusFilter.value)
  }
  return result.sort((a, b) => new Date(b.performanceDate) - new Date(a.performanceDate))
})

const showEquipmentModal = ref(false)
const editingEquipment = ref(null)
const formErrors = ref([])
const equipmentForm = reactive({
  name: '',
  category: '',
  status: EQUIPMENT_STATUS.AVAILABLE,
  description: ''
})

function formatDate(timestamp) {
  if (!timestamp) return '—'
  const d = new Date(timestamp)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getEquipmentById(id) {
  return equipmentStore.getEquipmentById(id)
}

function getEquipmentUsage(equipmentId) {
  return performanceStore.performanceList.filter(p =>
    (p.equipmentIds || []).includes(equipmentId)
  )
}

function getCategoryIcon(category) {
  const map = {
    '吉他': '🎸',
    '贝斯': '🎸',
    '打击乐': '🥁',
    '键盘': '🎹',
    '音频': '🎤',
    '音箱': '🔊'
  }
  return map[category] || '📦'
}

function getMaintenanceEquipmentsInPerf(perf) {
  return (perf.equipmentIds || [])
    .map(id => getEquipmentById(id))
    .filter(eq => eq && eq.status === EQUIPMENT_STATUS.MAINTENANCE)
}

function getMissingKeyPartsHint(performanceId) {
  const missing = signupStore.getMissingKeyParts(performanceId)
  if (missing.length === 0) return ''
  return `关键声部缺失：${missing.map(p => p.name).join('、')}`
}

function openEquipmentModal(equipment = null) {
  editingEquipment.value = equipment
  formErrors.value = []
  if (equipment) {
    equipmentForm.name = equipment.name
    equipmentForm.category = equipment.category
    equipmentForm.status = equipment.status
    equipmentForm.description = equipment.description || ''
  } else {
    equipmentForm.name = ''
    equipmentForm.category = ''
    equipmentForm.status = EQUIPMENT_STATUS.AVAILABLE
    equipmentForm.description = ''
  }
  showEquipmentModal.value = true
}

function closeEquipmentModal() {
  showEquipmentModal.value = false
  editingEquipment.value = null
}

function validateEquipmentForm() {
  const errors = []
  if (!equipmentForm.name.trim()) errors.push('设备名称不能为空')
  if (!equipmentForm.category) errors.push('请选择设备分类')
  return errors
}

function handleSaveEquipment() {
  const errors = validateEquipmentForm()
  if (errors.length > 0) {
    formErrors.value = errors
    return
  }
  if (editingEquipment.value) {
    equipmentStore.updateEquipment(editingEquipment.value.id, { ...equipmentForm })
  } else {
    equipmentStore.addEquipment({ ...equipmentForm })
  }
  closeEquipmentModal()
}

function handleSetMaintenance(eq) {
  const usage = getEquipmentUsage(eq.id)
  const activeUsage = usage.filter(p =>
    p.status === PERFORMANCE_STATUS.DRAFT ||
    p.status === PERFORMANCE_STATUS.CONFIRMED ||
    p.status === PERFORMANCE_STATUS.STARTED
  )
  if (activeUsage.length > 0) {
    if (!confirm(`设备"${eq.name}"正在被 ${activeUsage.length} 个活动演出单使用，确定标记为维护中吗？\n这些演出单中的该设备将被标记为异常。`)) {
      return
    }
  }
  equipmentStore.setMaintenance(eq.id)
}

function handleSetAvailable(eq) {
  equipmentStore.setAvailable(eq.id)
}

function handleDeleteEquipment(eq) {
  const usage = getEquipmentUsage(eq.id)
  if (usage.length > 0) {
    alert('该设备已被演出单引用，无法删除。请先从相关演出单中移除该设备。')
    return
  }
  if (confirm(`确定删除设备"${eq.name}"吗？此操作不可撤销。`)) {
    equipmentStore.deleteEquipment(eq.id)
  }
}
</script>

<style scoped>
.admin-dashboard {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 24px;
}
.page-header h2 {
  font-size: 28px;
  color: #1a1a2e;
  margin: 0 0 6px;
}
.subtitle {
  color: #6b7280;
  margin: 0;
  font-size: 14px;
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
  margin-bottom: 28px;
}
.stat-card {
  background: white;
  border-radius: 14px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06);
  border-left: 4px solid #6366f1;
}
.stat-card.total { border-left-color: #6366f1; }
.stat-card.available { border-left-color: #10b981; }
.stat-card.maintenance { border-left-color: #f59e0b; }
.stat-card.performance { border-left-color: #8b5cf6; }
.stat-icon {
  font-size: 38px;
  line-height: 1;
}
.stat-value {
  font-size: 30px;
  font-weight: 700;
  color: #1a1a2e;
}
.stat-label {
  font-size: 13px;
  color: #6b7280;
  margin-top: 2px;
}

.content-tabs {
  background: white;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  overflow: hidden;
}
.tabs-header {
  display: flex;
  border-bottom: 1px solid #e5e7eb;
  padding: 0 12px;
  background: #fafbff;
}
.tab-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 24px;
  border: none;
  background: none;
  font-size: 15px;
  color: #6b7280;
  cursor: pointer;
  border-bottom: 3px solid transparent;
  transition: all 0.2s;
  font-weight: 500;
}
.tab-btn:hover {
  color: #4f46e5;
}
.tab-btn.active {
  color: #4f46e5;
  border-bottom-color: #4f46e5;
}
.tab-icon {
  font-size: 18px;
}

.tabs-content {
  padding: 24px;
}

.panel-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 20px;
}
.panel-title {
  margin: 0;
  font-size: 18px;
  color: #1a1a2e;
}
.search-group {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.search-input, .filter-select {
  padding: 9px 14px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  transition: all 0.2s;
}
.search-input {
  min-width: 260px;
}
.search-input:focus, .filter-select:focus {
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
}

.equipment-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 16px;
}
.equipment-card {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 18px;
  transition: all 0.2s;
  background: #fefefe;
}
.equipment-card:hover {
  border-color: #c7d2fe;
  box-shadow: 0 4px 14px rgba(99, 102, 241, 0.1);
}
.eq-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 10px;
}
.eq-name {
  margin: 0;
  font-size: 16px;
  color: #1a1a2e;
  font-weight: 600;
  line-height: 1.4;
}
.status-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
}
.status-badge.available { background: #d1fae5; color: #065f46; }
.status-badge.maintenance { background: #fef3c7; color: #92400e; }
.status-badge.draft { background: #e0e7ff; color: #3730a3; }
.status-badge.confirmed { background: #dbeafe; color: #1e40af; }
.status-badge.started { background: #fce7f3; color: #9d174d; }
.status-badge.completed { background: #d1d5db; color: #374151; }

.eq-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 10px;
}
.eq-desc {
  font-size: 13px;
  color: #4b5563;
  margin: 0 0 12px;
  line-height: 1.5;
  padding: 10px;
  background: #f9fafb;
  border-radius: 8px;
}
.eq-usage {
  font-size: 13px;
  margin-bottom: 8px;
  color: #374151;
}
.usage-count { color: #4f46e5; font-weight: 600; }
.no-usage { color: #9ca3af; }

.usage-list {
  background: #f8fafc;
  border-radius: 8px;
  padding: 8px 10px;
  margin-bottom: 12px;
}
.usage-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 5px 0;
  font-size: 12px;
  border-bottom: 1px dashed #e5e7eb;
}
.usage-item:last-child { border-bottom: none; }
.mini-status {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 10px;
  background: #e0e7ff;
  color: #4338ca;
}
.usage-more {
  font-size: 11px;
  color: #9ca3af;
  padding-top: 6px;
  text-align: center;
}

.eq-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid #f3f4f6;
}

.demand-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.demand-card {
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  overflow: hidden;
  background: #fefefe;
}
.demand-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 20px 24px;
  background: linear-gradient(135deg, #f8fafc 0%, #f0f4ff 100%);
  border-bottom: 1px solid #e5e7eb;
  gap: 20px;
  flex-wrap: wrap;
}
.demand-header h4 {
  margin: 0 0 8px;
  font-size: 18px;
  color: #1a1a2e;
}
.demand-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  font-size: 13px;
  color: #6b7280;
  align-items: center;
}
.demand-summary {
  display: flex;
  gap: 24px;
}
.summary-item {
  text-align: center;
}
.summary-label {
  display: block;
  font-size: 12px;
  color: #9ca3af;
  margin-bottom: 4px;
}
.summary-value {
  font-size: 22px;
  font-weight: 700;
  color: #4f46e5;
}

.demand-equipments {
  padding: 20px 24px;
}
.no-equipment {
  padding: 14px;
  background: #fffbeb;
  border-radius: 8px;
  color: #92400e;
  font-size: 14px;
}
.equipment-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.eq-tag {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 14px;
  background: #eef2ff;
  border-radius: 20px;
  font-size: 13px;
  color: #3730a3;
  border: 1px solid #c7d2fe;
}
.eq-tag.maintenance {
  background: #fef3c7;
  border-color: #fcd34d;
  color: #92400e;
}
.tag-icon { font-size: 16px; }
.tag-name { font-weight: 500; }
.tag-warn { font-size: 11px; font-weight: 600; }

.maintenance-warning {
  margin-top: 14px;
  padding: 12px 16px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  color: #991b1b;
  font-size: 13px;
}
.warn-item {
  display: inline-block;
  margin-left: 8px;
  padding: 2px 10px;
  background: white;
  border-radius: 10px;
  font-weight: 500;
}

.demand-footer {
  padding: 14px 24px;
  background: #fafbfc;
  border-top: 1px solid #f3f4f6;
}
.danger-hint {
  color: #dc2626;
  font-weight: 500;
  font-size: 13px;
}
.safe-hint {
  color: #059669;
  font-weight: 500;
  font-size: 13px;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #9ca3af;
}
.empty-icon {
  font-size: 56px;
  margin-bottom: 12px;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
  backdrop-filter: blur(3px);
}
.modal-content {
  background: white;
  border-radius: 16px;
  width: 100%;
  max-width: 560px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  animation: slideUp 0.25s ease;
}
.modal-lg { max-width: 600px; }
@keyframes slideUp {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
}
.modal-header h3 {
  margin: 0;
  font-size: 18px;
  color: #1a1a2e;
}
.modal-close {
  border: none;
  background: none;
  font-size: 22px;
  color: #6b7280;
  cursor: pointer;
  padding: 4px;
  line-height: 1;
  transition: color 0.2s;
}
.modal-close:hover { color: #ef4444; }
.modal-body {
  padding: 24px;
}
.modal-footer {
  padding: 16px 24px;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.form-group {
  margin-bottom: 18px;
}
.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
.form-label {
  display: block;
  margin-bottom: 7px;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}
.form-label .required { color: #ef4444; }
.form-input {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  transition: all 0.2s;
  font-family: inherit;
  box-sizing: border-box;
}
.form-input:focus {
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
}

.form-errors {
  margin-top: 14px;
  padding: 12px;
  background: #fef2f2;
  border-radius: 8px;
}
.error-item {
  color: #dc2626;
  font-size: 13px;
  margin-bottom: 4px;
}
.error-item:last-child { margin-bottom: 0; }

.btn {
  padding: 9px 18px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.btn:hover { transform: translateY(-1px); }
.btn:active { transform: translateY(0); }
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}
.btn-sm { padding: 6px 12px; font-size: 12px; }
.btn-primary {
  background: linear-gradient(135deg, #6366f1, #4f46e5);
  color: white;
}
.btn-primary:hover {
  background: linear-gradient(135deg, #4f46e5, #4338ca);
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
}
.btn-success {
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
}
.btn-success:hover {
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}
.btn-warning {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: white;
}
.btn-warning:hover {
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
}
.btn-danger {
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: white;
}
.btn-danger:hover {
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}
.btn-default {
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #e5e7eb;
}
.btn-default:hover {
  background: #e5e7eb;
}
</style>
