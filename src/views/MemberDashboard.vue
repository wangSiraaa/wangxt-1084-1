<template>
  <div class="member-dashboard">
    <div class="dashboard-header">
      <h2>🎹 成员工作台</h2>
      <p class="header-desc">查看可报名的排练计划，选择声部参与演出</p>
    </div>

    <div class="stats-row">
      <div class="stat-card stat-available">
        <div class="stat-icon">📅</div>
        <div class="stat-info">
          <div class="stat-value">{{ availableCount }}</div>
          <div class="stat-label">可报名排练</div>
        </div>
      </div>
      <div class="stat-card stat-joined">
        <div class="stat-icon">✅</div>
        <div class="stat-info">
          <div class="stat-value">{{ joinedCount }}</div>
          <div class="stat-label">已报名次数</div>
        </div>
      </div>
      <div class="stat-card stat-progress">
        <div class="stat-icon">🎯</div>
        <div class="stat-info">
          <div class="stat-value">{{ progressingCount }}</div>
          <div class="stat-label">进行中排练</div>
        </div>
      </div>
      <div class="stat-card stat-done">
        <div class="stat-icon">🏆</div>
        <div class="stat-info">
          <div class="stat-value">{{ completedCount }}</div>
          <div class="stat-label">完成排练</div>
        </div>
      </div>
    </div>

    <div class="tabs-container">
      <div class="tabs-nav">
        <div
          v-for="tab in tabs"
          :key="tab.key"
          :class="['tab-item', { active: activeTab === tab.key }]"
          @click="activeTab = tab.key"
        >
          <span class="tab-icon">{{ tab.icon }}</span>
          <span>{{ tab.label }}</span>
          <span v-if="tab.count > 0" class="tab-badge">{{ tab.count }}</span>
        </div>
      </div>

      <div class="tabs-content">
        <!-- 可报名排练 -->
        <div v-show="activeTab === 'available'" class="tab-panel">
          <div class="panel-header">
            <h3>可报名的排练计划</h3>
          </div>

          <div class="filter-bar">
            <input
              v-model="searchKeyword"
              type="text"
              placeholder="搜索演出单名称、地点..."
              class="search-input"
            />
          </div>

          <div class="performance-list" v-if="filteredAvailable.length > 0">
            <div v-for="perf in filteredAvailable" :key="perf.id" class="performance-card">
              <div class="perf-header">
                <div class="perf-title-row">
                  <h4>{{ perf.name }}</h4>
                  <span :class="['status-badge', 'status-' + perf.status]">
                    {{ PERFORMANCE_STATUS_LABEL[perf.status] }}
                  </span>
                </div>
                <div class="perf-date">
                  📅 {{ formatDate(perf.performanceDate) }}
                </div>
              </div>

              <div class="perf-body">
                <div class="perf-info">
                  <div class="info-row" v-if="perf.venue">
                    <span class="info-label">地点:</span><span>{{ perf.venue }}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">曲目:</span><span>{{ perf.songIds?.length || 0 }} 首</span>
                  </div>
                  <div class="info-row" v-if="perf.description">
                    <span class="info-label">备注:</span><span>{{ perf.description }}</span>
                  </div>
                </div>

                <div class="part-summary">
                  <div class="part-summary-title">声部报名情况:</div>
                  <div class="part-tags">
                    <span
                      v-for="part in partStore.partList"
                      :key="part.id"
                      :class="['part-tag', getPartTagClass(perf, part)]"
                    >
                      {{ part.isKey ? '★' : '' }}{{ part.name }}
                      ({{ getPartSignupCount(perf.id, part.id) }})
                    </span>
                  </div>
                </div>
              </div>

              <div class="perf-footer">
                <div v-if="hasSignedUp(perf.id)" class="signed-info">
                  ✅ 您已报名: <strong>{{ getMyPartName(perf.id) }}</strong>
                  <button class="btn btn-sm btn-outline" @click="cancelSignup(perf)">取消报名</button>
                </div>
                <div v-else class="signup-form">
                  <select v-model="signupPartMap[perf.id]" class="select-input signup-select">
                    <option value="">选择声部报名...</option>
                    <option v-for="part in partStore.partList" :key="part.id" :value="part.id">
                      {{ part.isKey ? '★ ' : '' }}{{ part.name }}
                      {{ part.isKey ? '(关键声部)' : '' }}
                      - {{ getPartSignupCount(perf.id, part.id) }}人已报
                    </option>
                  </select>
                  <button
                    class="btn btn-primary"
                    :disabled="!signupPartMap[perf.id]"
                    @click="handleSignup(perf)"
                  >
                    立即报名
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="empty-state">
            <div class="empty-icon">📋</div>
            <p>暂无可报名的排练计划</p>
          </div>
        </div>

        <!-- 我的报名 -->
        <div v-show="activeTab === 'my'" class="tab-panel">
          <div class="panel-header">
            <h3>我的报名记录</h3>
          </div>

          <div class="signup-list" v-if="mySignups.length > 0">
            <div v-for="su in mySignups" :key="su.id" class="signup-card">
              <div class="signup-header">
                <div>
                  <h4>{{ getPerf(su.performanceId)?.name || '未知演出单' }}</h4>
                  <div class="signup-meta">
                    <span>📅 {{ formatDate(getPerf(su.performanceId)?.performanceDate) }}</span>
                    <span v-if="getPerf(su.performanceId)?.venue">📍 {{ getPerf(su.performanceId)?.venue }}</span>
                  </div>
                </div>
                <span :class="['status-badge', 'status-' + getPerf(su.performanceId)?.status]">
                  {{ PERFORMANCE_STATUS_LABEL[getPerf(su.performanceId)?.status] || '未知' }}
                </span>
              </div>
              <div class="signup-body">
                <div class="my-part">
                  <span class="part-icon">🎤</span>
                  <span class="part-label">报名声部:</span>
                  <strong class="part-name">{{ getPart(su.partId)?.name || '未知声部' }}</strong>
                  <span v-if="getPart(su.partId)?.isKey" class="key-tag">关键声部</span>
                </div>
                <div class="song-count">
                  🎵 包含 {{ getPerf(su.performanceId)?.songIds?.length || 0 }} 首曲目
                </div>
              </div>
              <div class="signup-footer" v-if="canCancel(getPerf(su.performanceId))">
                <button class="btn btn-sm btn-danger" @click="cancelSignupById(su)">取消报名</button>
              </div>
            </div>
          </div>
          <div v-else class="empty-state">
            <div class="empty-icon">📝</div>
            <p>您还没有报名任何排练计划</p>
          </div>
        </div>

        <!-- 曲目列表 -->
        <div v-show="activeTab === 'songs'" class="tab-panel">
          <div class="panel-header">
            <h3>排练曲目库</h3>
          </div>
          <div class="search-bar">
            <input
              v-model="songSearch"
              type="text"
              placeholder="搜索曲目名称、歌手..."
              class="search-input"
            />
          </div>

          <div class="card-grid" v-if="filteredSongs.length > 0">
            <div v-for="song in filteredSongs" :key="song.id" class="data-card">
              <div class="card-header">
                <h4>{{ song.name }}</h4>
              </div>
              <div class="card-body">
                <div class="info-row"><span class="info-label">歌手:</span><span>{{ song.artist }}</span></div>
                <div class="info-row"><span class="info-label">时长:</span><span>{{ formatDuration(song.duration) }}</span></div>
                <div class="info-row"><span class="info-label">速度:</span><span>{{ song.tempo }}</span></div>
                <div class="info-row"><span class="info-label">难度:</span><span :class="getDiffClass(song.difficulty)">{{ song.difficulty }}</span></div>
                <div class="info-row" v-if="song.description"><span class="info-label">描述:</span><span>{{ song.description }}</span></div>
              </div>
            </div>
          </div>
          <div v-else class="empty-state">
            <div class="empty-icon">🎵</div>
            <p>暂无曲目</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { usePerformanceStore, PERFORMANCE_STATUS_LABEL } from '../stores/performance'
import { usePartStore } from '../stores/part'
import { useSongStore } from '../stores/song'
import { useSignupStore } from '../stores/signup'
import { useAuthStore } from '../stores/auth'

const performanceStore = usePerformanceStore()
const partStore = usePartStore()
const songStore = useSongStore()
const signupStore = useSignupStore()
const authStore = useAuthStore()

const userId = computed(() => authStore.currentUser?.id)

const activeTab = ref('available')
const searchKeyword = ref('')
const songSearch = ref('')
const signupPartMap = reactive({})

const availablePerformances = computed(() => {
  return performanceStore.performanceList.filter(p =>
    p.status === 'draft' || p.status === 'confirmed'
  )
})

const availableCount = computed(() => availablePerformances.value.length)

const joinedCount = computed(() => {
  return signupStore.getSignupsByUserId(userId.value).length
})

const progressingCount = computed(() => {
  return signupStore.getSignupsByUserId(userId.value).filter(su => {
    const p = performanceStore.getPerformanceById(su.performanceId)
    return p?.status === 'started' || p?.status === 'confirmed'
  }).length
})

const completedCount = computed(() => {
  return signupStore.getSignupsByUserId(userId.value).filter(su => {
    const p = performanceStore.getPerformanceById(su.performanceId)
    return p?.status === 'completed'
  }).length
})

const tabs = computed(() => [
  { key: 'available', label: '可报名排练', icon: '📅', count: availableCount.value },
  { key: 'my', label: '我的报名', icon: '📝', count: joinedCount.value },
  { key: 'songs', label: '曲目库', icon: '🎵', count: 0 }
])

const filteredAvailable = computed(() => {
  if (!searchKeyword.value) return availablePerformances.value
  const kw = searchKeyword.value.toLowerCase()
  return availablePerformances.value.filter(p =>
    p.name.toLowerCase().includes(kw) ||
    (p.venue && p.venue.toLowerCase().includes(kw))
  )
})

const mySignups = computed(() => {
  return [...signupStore.getSignupsByUserId(userId.value)].sort((a, b) => b.createdAt - a.createdAt)
})

const filteredSongs = computed(() => songStore.searchSongs(songSearch.value))

function hasSignedUp(perfId) {
  return signupStore.hasUserSignedUp(perfId, userId.value)
}

function getMyPartId(perfId) {
  const su = signupStore.getUserSignupForPerformance(perfId, userId.value)
  return su?.partId
}

function getMyPartName(perfId) {
  const partId = getMyPartId(perfId)
  return partStore.getPartById(partId)?.name || ''
}

function getPartSignupCount(perfId, partId) {
  return signupStore.getSignupsByPartId(perfId, partId).length
}

function getPartTagClass(perf, part) {
  const count = getPartSignupCount(perf.id, part.id)
  if (count > 0) return 'part-filled'
  if (part.isKey) return 'part-missing-key'
  return 'part-empty'
}

function canCancel(perf) {
  return perf && (perf.status === 'draft' || perf.status === 'confirmed')
}

function handleSignup(perf) {
  const partId = signupPartMap[perf.id]
  if (!partId) {
    alert('请选择要报名的声部')
    return
  }

  const result = signupStore.createSignup(
    { performanceId: perf.id, userId: userId.value, partId },
    performanceStore,
    partStore
  )

  if (!result.success) {
    alert(result.errors?.join('\n') || '报名失败')
    return
  }

  signupPartMap[perf.id] = ''
}

function cancelSignup(perf) {
  const su = signupStore.getUserSignupForPerformance(perf.id, userId.value)
  if (!su) return
  if (!confirm('确定要取消报名吗？')) return
  signupStore.cancelSignup(su.id)
}

function cancelSignupById(su) {
  if (!confirm('确定要取消报名吗？')) return
  signupStore.cancelSignup(su.id)
}

function getPerf(id) {
  return performanceStore.getPerformanceById(id)
}

function getPart(id) {
  return partStore.getPartById(id)
}

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '-'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })
}

function getDiffClass(d) {
  const map = { '简单': 'diff-easy', '中等': 'diff-medium', '困难': 'diff-hard' }
  return map[d] || ''
}
</script>

<style scoped>
.member-dashboard {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.dashboard-header h2 {
  margin: 0;
  color: #1f2937;
  font-size: 26px;
}

.header-desc {
  margin: 6px 0 0 0;
  color: #6b7280;
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
}

.stat-available .stat-icon { background: linear-gradient(135deg, #dbeafe, #bfdbfe); }
.stat-joined .stat-icon { background: linear-gradient(135deg, #d1fae5, #a7f3d0); }
.stat-progress .stat-icon { background: linear-gradient(135deg, #fef3c7, #fde68a); }
.stat-done .stat-icon { background: linear-gradient(135deg, #ede9fe, #ddd6fe); }

.stat-value {
  font-size: 26px;
  font-weight: 700;
  color: #1f2937;
}

.stat-label {
  font-size: 13px;
  color: #6b7280;
}

.tabs-container {
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.tabs-nav {
  display: flex;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
}

.tab-item {
  padding: 14px 24px;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  color: #6b7280;
  font-weight: 500;
  border-bottom: 3px solid transparent;
  transition: all 0.2s;
}

.tab-item:hover {
  color: #374151;
  background: #f3f4f6;
}

.tab-item.active {
  color: #667eea;
  border-bottom-color: #667eea;
  background: white;
}

.tab-icon {
  font-size: 18px;
}

.tab-badge {
  background: #f3f4f6;
  color: #6b7280;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
}

.tab-item.active .tab-badge {
  background: #667eea;
  color: white;
}

.tab-panel {
  padding: 24px;
}

.panel-header {
  margin-bottom: 16px;
}

.panel-header h3 {
  margin: 0;
  color: #1f2937;
}

.filter-bar, .search-bar {
  margin-bottom: 16px;
}

.search-input, .select-input {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  transition: all 0.2s;
  box-sizing: border-box;
}

.search-input:focus, .select-input:focus {
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.15);
}

.performance-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.performance-card {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.2s;
}

.performance-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
  border-color: #c7d2fe;
}

.perf-header {
  padding: 16px 20px;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.perf-title-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.perf-title-row h4 {
  margin: 0;
  color: #1f2937;
  font-size: 17px;
}

.perf-date {
  color: #4b5563;
  font-size: 13px;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.status-draft { background: #e5e7eb; color: #4b5563; }
.status-confirmed { background: #dbeafe; color: #1d4ed8; }
.status-started { background: #fef3c7; color: #b45309; }
.status-completed { background: #d1fae5; color: #059669; }

.perf-body {
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.info-row {
  display: flex;
  gap: 8px;
  font-size: 13px;
}

.info-label {
  color: #6b7280;
  min-width: 50px;
  flex-shrink: 0;
}

.part-summary-title {
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
}

.part-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.part-tag {
  padding: 4px 10px;
  border-radius: 10px;
  font-size: 12px;
  background: #f3f4f6;
  color: #6b7280;
}

.part-filled {
  background: #d1fae5;
  color: #059669;
}

.part-missing-key {
  background: #fef2f2;
  color: #dc2626;
}

.part-empty {
  background: #f3f4f6;
  color: #9ca3af;
}

.perf-footer {
  padding: 14px 20px;
  border-top: 1px solid #e5e7eb;
  background: #fafafa;
}

.signup-form {
  display: flex;
  gap: 10px;
  align-items: center;
}

.signup-select {
  flex: 1;
  max-width: 300px;
}

.signed-info {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #059669;
  font-weight: 500;
}

.signup-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.signup-card {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.2s;
}

.signup-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
}

.signup-header {
  padding: 14px 18px;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.signup-header h4 {
  margin: 0 0 6px 0;
  color: #1f2937;
}

.signup-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: #6b7280;
}

.signup-body {
  padding: 14px 18px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.my-part {
  display: flex;
  align-items: center;
  gap: 8px;
}

.part-icon {
  font-size: 20px;
}

.part-label {
  color: #6b7280;
  font-size: 13px;
}

.part-name {
  color: #667eea;
  font-size: 15px;
}

.key-tag {
  background: #fef3c7;
  color: #b45309;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 600;
}

.song-count {
  color: #6b7280;
  font-size: 13px;
}

.signup-footer {
  padding: 10px 18px;
  border-top: 1px solid #e5e7eb;
  background: #fafafa;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 14px;
}

.data-card {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  overflow: hidden;
  transition: all 0.2s;
}

.data-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  border-color: #c7d2fe;
}

.card-header {
  padding: 12px 16px;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}

.card-header h4 {
  margin: 0;
  color: #1f2937;
}

.card-body {
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.diff-easy { color: #16a34a; font-weight: 600; }
.diff-medium { color: #ca8a04; font-weight: 600; }
.diff-hard { color: #dc2626; font-weight: 600; }

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #9ca3af;
}

.empty-icon {
  font-size: 56px;
  margin-bottom: 12px;
  opacity: 0.6;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 7px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-outline {
  background: white;
  border: 1px solid #d1d5db;
  color: #374151;
}

.btn-outline:hover {
  background: #f9fafb;
  border-color: #9ca3af;
}

.btn-danger {
  background: #ef4444;
  color: white;
}

.btn-danger:hover {
  background: #dc2626;
}

.btn-sm {
  padding: 5px 12px;
  font-size: 12px;
}

@media (max-width: 768px) {
  .stats-row {
    grid-template-columns: repeat(2, 1fr);
  }

  .signup-form {
    flex-direction: column;
    align-items: stretch;
  }

  .signup-select {
    max-width: none;
  }
}
</style>
