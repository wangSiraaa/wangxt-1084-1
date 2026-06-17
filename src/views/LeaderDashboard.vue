<template>
  <div class="leader-dashboard">
    <div class="dashboard-header">
      <h2>🎤 队长工作台</h2>
      <p class="header-desc">管理曲目、声部和演出单，确保排练顺利进行</p>
    </div>

    <div class="stats-row">
      <div class="stat-card stat-song">
        <div class="stat-icon">🎸</div>
        <div class="stat-info">
          <div class="stat-value">{{ songStore.songCount }}</div>
          <div class="stat-label">曲目总数</div>
        </div>
      </div>
      <div class="stat-card stat-part">
        <div class="stat-icon">🎼</div>
        <div class="stat-info">
          <div class="stat-value">{{ partStore.partCount }}</div>
          <div class="stat-label">声部数量</div>
        </div>
      </div>
      <div class="stat-card stat-performance">
        <div class="stat-icon">📋</div>
        <div class="stat-info">
          <div class="stat-value">{{ performanceStore.performanceCount }}</div>
          <div class="stat-label">演出单总数</div>
        </div>
      </div>
      <div class="stat-card stat-signup">
        <div class="stat-icon">👥</div>
        <div class="stat-info">
          <div class="stat-value">{{ signupStore.signupCount }}</div>
          <div class="stat-label">报名次数</div>
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
        </div>
      </div>

      <div class="tabs-content">
        <!-- 曲目管理 -->
        <div v-show="activeTab === 'songs'" class="tab-panel">
          <div class="panel-header">
            <h3>曲目管理</h3>
            <button class="btn btn-primary" @click="openSongModal()">
              + 新增曲目
            </button>
          </div>

          <div class="search-bar">
            <input
              v-model="songSearch"
              type="text"
              placeholder="搜索曲目名称或歌手..."
              class="search-input"
            />
          </div>

          <div class="card-grid" v-if="filteredSongs.length > 0">
            <div v-for="song in filteredSongs" :key="song.id" class="data-card">
              <div class="card-header">
                <h4>{{ song.name }}</h4>
                <div class="card-actions">
                  <button class="btn btn-sm btn-outline" @click="openSongModal(song)">编辑</button>
                  <button class="btn btn-sm btn-danger" @click="handleDeleteSong(song)">删除</button>
                </div>
              </div>
              <div class="card-body">
                <div class="info-row"><span class="info-label">歌手:</span><span>{{ song.artist }}</span></div>
                <div class="info-row"><span class="info-label">时长:</span><span>{{ formatDuration(song.duration) }}</span></div>
                <div class="info-row"><span class="info-label">速度:</span><span>{{ song.tempo }}</span></div>
                <div class="info-row"><span class="info-label">难度:</span><span :class="getDifficultyClass(song.difficulty)">{{ song.difficulty }}</span></div>
                <div class="info-row" v-if="song.description"><span class="info-label">描述:</span><span>{{ song.description }}</span></div>
              </div>
            </div>
          </div>
          <div v-else class="empty-state">
            <div class="empty-icon">🎵</div>
            <p>暂无曲目，点击"新增曲目"开始添加</p>
          </div>
        </div>

        <!-- 声部管理 -->
        <div v-show="activeTab === 'parts'" class="tab-panel">
          <div class="panel-header">
            <h3>声部管理</h3>
            <button class="btn btn-primary" @click="openPartModal()">
              + 新增声部
            </button>
          </div>

          <div class="search-bar">
            <input
              v-model="partSearch"
              type="text"
              placeholder="搜索声部名称..."
              class="search-input"
            />
          </div>

          <div class="card-grid" v-if="filteredParts.length > 0">
            <div v-for="part in filteredParts" :key="part.id" class="data-card">
              <div class="card-header">
                <h4>
                  {{ part.name }}
                  <span v-if="part.isKey" class="key-badge">关键声部</span>
                </h4>
                <div class="card-actions">
                  <button class="btn btn-sm btn-outline" @click="openPartModal(part)">编辑</button>
                  <button class="btn btn-sm btn-danger" @click="handleDeletePart(part)">删除</button>
                </div>
              </div>
              <div class="card-body">
                <div class="info-row"><span class="info-label">排序:</span><span>{{ part.sortOrder }}</span></div>
                <div class="info-row"><span class="info-label">是否关键:</span>
                  <span :class="['switch-tag', { active: part.isKey }]" @click="toggleKeyPart(part)">
                    {{ part.isKey ? '是' : '否' }}
                  </span>
                </div>
                <div class="info-row" v-if="part.description"><span class="info-label">描述:</span><span>{{ part.description }}</span></div>
              </div>
            </div>
          </div>
          <div v-else class="empty-state">
            <div class="empty-icon">🎼</div>
            <p>暂无声部，点击"新增声部"开始添加</p>
          </div>
        </div>

        <!-- 演出单管理 -->
        <div v-show="activeTab === 'performances'" class="tab-panel">
          <div class="panel-header">
            <h3>演出单管理</h3>
            <button class="btn btn-primary" @click="openPerformanceModal()">
              + 新增演出单
            </button>
          </div>

          <div class="filter-bar">
            <input
              v-model="perfSearch"
              type="text"
              placeholder="搜索演出单名称或地点..."
              class="search-input"
            />
            <select v-model="perfStatusFilter" class="select-input">
              <option value="">全部状态</option>
              <option v-for="(label, key) in PERFORMANCE_STATUS_LABEL" :key="key" :value="key">
                {{ label }}
              </option>
            </select>
          </div>

          <div class="performance-list" v-if="filteredPerformances.length > 0">
            <div v-for="perf in filteredPerformances" :key="perf.id" class="performance-card">
              <div class="perf-header">
                <div class="perf-title-row">
                  <h4>{{ perf.name }}</h4>
                  <span :class="['status-badge', 'status-' + perf.status]">
                    {{ PERFORMANCE_STATUS_LABEL[perf.status] }}
                  </span>
                </div>
                <div class="perf-actions">
                  <button class="btn btn-sm btn-outline" @click="viewPerformanceDetail(perf)">详情</button>
                  <button v-if="perf.status === 'draft'" class="btn btn-sm btn-primary" @click="openPerformanceModal(perf)">编辑</button>
                  <button v-if="perf.status === 'draft'" class="btn btn-sm btn-danger" @click="handleDeletePerformance(perf)">删除</button>
                </div>
              </div>

              <div class="perf-body">
                <div class="perf-info">
                  <div class="info-row"><span class="info-label">演出日期:</span><span>{{ formatDate(perf.performanceDate) }}</span></div>
                  <div class="info-row" v-if="perf.venue"><span class="info-label">演出地点:</span><span>{{ perf.venue }}</span></div>
                  <div class="info-row"><span class="info-label">曲目数量:</span><span>{{ perf.songIds?.length || 0 }} 首</span></div>
                  <div class="info-row"><span class="info-label">设备数量:</span><span>{{ perf.equipmentIds?.length || 0 }} 件</span></div>
                </div>

                <div class="perf-missing" v-if="perf.status === 'draft'">
                  <div class="missing-title">关键声部报名检查:</div>
                  <div v-if="getMissingParts(perf).length === 0" class="missing-ok">
                    ✅ 所有关键声部已有人报名
                  </div>
                  <div v-else class="missing-list">
                    <span v-for="p in getMissingParts(perf)" :key="p.id" class="missing-tag">
                      ⚠️ {{ p.name }}
                    </span>
                  </div>
                </div>
              </div>

              <div class="perf-footer">
                <div v-if="perf.status === 'draft'" class="footer-actions">
                  <button
                    class="btn btn-success"
                    :disabled="!canConfirmPerf(perf)"
                    :title="!canConfirmPerf(perf) ? '关键声部缺失，无法确认' : ''"
                    @click="confirmPerformance(perf)"
                  >
                    确认演出单
                  </button>
                </div>
                <div v-if="perf.status === 'confirmed'" class="footer-actions">
                  <button class="btn btn-outline" @click="backToDraft(perf)">返回草稿</button>
                  <button class="btn btn-primary" @click="startPerformance(perf)">开始排练</button>
                </div>
                <div v-if="perf.status === 'started'" class="footer-actions">
                  <span class="started-tip">🔴 排练进行中...</span>
                  <button class="btn btn-success" @click="completePerformance(perf)">完成排练</button>
                </div>
                <div v-if="perf.status === 'completed'" class="footer-actions">
                  <span class="completed-tip">✅ 排练已完成</span>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="empty-state">
            <div class="empty-icon">📋</div>
            <p>暂无演出单，点击"新增演出单"开始创建</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 曲目弹窗 -->
    <div v-if="showSongModal" class="modal-overlay" @click.self="closeSongModal">
      <div class="modal modal-medium">
        <div class="modal-header">
          <h3>{{ editingSong ? '编辑曲目' : '新增曲目' }}</h3>
          <button class="modal-close" @click="closeSongModal">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>曲目名称 *</label>
            <input v-model="songForm.name" type="text" placeholder="请输入曲目名称" />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>歌手/乐队 *</label>
              <input v-model="songForm.artist" type="text" placeholder="请输入歌手或乐队名称" />
            </div>
            <div class="form-group">
              <label>时长(秒)</label>
              <input v-model.number="songForm.duration" type="number" placeholder="例如: 326" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>速度</label>
              <select v-model="songForm.tempo" class="select-input">
                <option value="慢速">慢速</option>
                <option value="中速">中速</option>
                <option value="快速">快速</option>
              </select>
            </div>
            <div class="form-group">
              <label>难度</label>
              <select v-model="songForm.difficulty" class="select-input">
                <option value="简单">简单</option>
                <option value="中等">中等</option>
                <option value="困难">困难</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label>描述</label>
            <textarea v-model="songForm.description" placeholder="曲目描述、排练注意事项等" rows="3"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" @click="closeSongModal">取消</button>
          <button class="btn btn-primary" @click="saveSong">保存</button>
        </div>
      </div>
    </div>

    <!-- 声部弹窗 -->
    <div v-if="showPartModal" class="modal-overlay" @click.self="closePartModal">
      <div class="modal modal-medium">
        <div class="modal-header">
          <h3>{{ editingPart ? '编辑声部' : '新增声部' }}</h3>
          <button class="modal-close" @click="closePartModal">×</button>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <div class="form-group">
              <label>声部名称 *</label>
              <input v-model="partForm.name" type="text" placeholder="例如: 主唱、吉他手" />
            </div>
            <div class="form-group">
              <label>排序号</label>
              <input v-model.number="partForm.sortOrder" type="number" placeholder="数字越小越靠前" />
            </div>
          </div>
          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" v-model="partForm.isKey" />
              <span>设为关键声部（缺少此声部不能确认演出单）</span>
            </label>
          </div>
          <div class="form-group">
            <label>描述</label>
            <textarea v-model="partForm.description" placeholder="声部说明" rows="3"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" @click="closePartModal">取消</button>
          <button class="btn btn-primary" @click="savePart">保存</button>
        </div>
      </div>
    </div>

    <!-- 演出单弹窗 -->
    <div v-if="showPerformanceModal" class="modal-overlay" @click.self="closePerformanceModal">
      <div class="modal modal-large">
        <div class="modal-header">
          <h3>{{ editingPerformance ? '编辑演出单' : '新增演出单' }}</h3>
          <button class="modal-close" @click="closePerformanceModal">×</button>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <div class="form-group">
              <label>演出单名称 *</label>
              <input v-model="perfForm.name" type="text" placeholder="例如: 周末排练计划" />
            </div>
            <div class="form-group">
              <label>演出日期 *</label>
              <input v-model="perfForm.performanceDate" type="date" />
            </div>
          </div>
          <div class="form-group">
            <label>演出地点</label>
            <input v-model="perfForm.venue" type="text" placeholder="例如: 社区活动中心3楼" />
          </div>
          <div class="form-group">
            <label>备注说明</label>
            <textarea v-model="perfForm.description" placeholder="排练注意事项等" rows="2"></textarea>
          </div>

          <div class="form-group">
            <label>选择曲目 *</label>
            <div class="checkbox-list" v-if="songStore.songList.length > 0">
              <label v-for="song in songStore.songList" :key="song.id" class="checkbox-item">
                <input
                  type="checkbox"
                  :value="song.id"
                  v-model="perfForm.songIds"
                />
                <span><strong>{{ song.name }}</strong> - {{ song.artist }} ({{ formatDuration(song.duration) }})</span>
              </label>
            </div>
            <div v-else class="empty-tip">暂无曲目，请先在"曲目管理"中添加</div>
          </div>

          <div class="form-group">
            <label>选择设备</label>
            <div class="checkbox-list" v-if="equipmentStore.availableEquipments.length > 0">
              <label v-for="eq in equipmentStore.availableEquipments" :key="eq.id" class="checkbox-item">
                <input
                  type="checkbox"
                  :value="eq.id"
                  v-model="perfForm.equipmentIds"
                />
                <span><strong>{{ eq.name }}</strong> ({{ eq.category }})</span>
              </label>
            </div>
            <div v-else class="empty-tip">暂无可用设备，维护中的设备不能加入</div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" @click="closePerformanceModal">取消</button>
          <button class="btn btn-primary" @click="savePerformance">保存</button>
        </div>
      </div>
    </div>

    <!-- 演出单详情弹窗 -->
    <div v-if="showDetailModal" class="modal-overlay" @click.self="closeDetailModal">
      <div class="modal modal-large">
        <div class="modal-header">
          <h3>演出单详情 - {{ detailPerf?.name }}</h3>
          <button class="modal-close" @click="closeDetailModal">×</button>
        </div>
        <div class="modal-body" v-if="detailPerf">
          <div class="detail-section">
            <h4>基本信息</h4>
            <div class="detail-grid">
              <div class="info-row"><span class="info-label">状态:</span><span :class="['status-badge', 'status-' + detailPerf.status]">{{ PERFORMANCE_STATUS_LABEL[detailPerf.status] }}</span></div>
              <div class="info-row"><span class="info-label">日期:</span><span>{{ formatDate(detailPerf.performanceDate) }}</span></div>
              <div class="info-row"><span class="info-label">地点:</span><span>{{ detailPerf.venue || '-' }}</span></div>
              <div class="info-row"><span class="info-label">备注:</span><span>{{ detailPerf.description || '-' }}</span></div>
            </div>
          </div>

          <div class="detail-section">
            <h4>曲目列表 ({{ detailPerf.songIds?.length || 0 }} 首)</h4>
            <div class="song-list" v-if="getPerfSongs(detailPerf).length > 0">
              <div v-for="(song, idx) in getPerfSongs(detailPerf)" :key="song.id" class="song-item">
                <span class="song-idx">{{ idx + 1 }}.</span>
                <span class="song-name">{{ song.name }}</span>
                <span class="song-artist">{{ song.artist }}</span>
                <span class="song-dur">{{ formatDuration(song.duration) }}</span>
              </div>
            </div>
            <div v-else class="empty-tip">暂无曲目</div>
          </div>

          <div class="detail-section">
            <h4>设备清单 ({{ detailPerf.equipmentIds?.length || 0 }} 件)</h4>
            <div class="equipment-list" v-if="getPerfEquipments(detailPerf).length > 0">
              <div v-for="eq in getPerfEquipments(detailPerf)" :key="eq.id" class="eq-item">
                <span class="eq-name">🎹 {{ eq.name }}</span>
                <span class="eq-cat">{{ eq.category }}</span>
                <span class="eq-desc">{{ eq.description }}</span>
              </div>
            </div>
            <div v-else class="empty-tip">暂无设备</div>
          </div>

          <div class="detail-section">
            <h4>声部报名情况</h4>
            <div class="signup-list">
              <div v-for="part in partStore.partList" :key="part.id" class="signup-row">
                <div class="signup-part">
                  <span v-if="part.isKey" class="key-dot">●</span>
                  <strong>{{ part.name }}</strong>
                  <span v-if="part.isKey" class="key-label">(关键)</span>
                </div>
                <div class="signup-users">
                  <span
                    v-for="su in getSignupUsers(detailPerf.id, part.id)"
                    :key="su.id"
                    class="user-tag"
                  >
                    {{ getUser(su.userId)?.name }}
                  </span>
                  <span v-if="getSignupUsers(detailPerf.id, part.id).length === 0" class="empty-signup" :class="{ warn: part.isKey }">
                    {{ part.isKey ? '⚠️ 无人报名' : '- 无人报名' }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div class="detail-section" v-if="getMissingParts(detailPerf).length > 0 && detailPerf.status === 'draft'">
            <div class="warning-box">
              ⚠️ 以下关键声部缺少报名，演出单暂不能确认:
              <span v-for="p in getMissingParts(detailPerf)" :key="p.id" class="missing-tag">
                {{ p.name }}
              </span>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-primary" @click="closeDetailModal">关闭</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useSongStore } from '../stores/song'
import { usePartStore } from '../stores/part'
import { useEquipmentStore } from '../stores/equipment'
import { usePerformanceStore, PERFORMANCE_STATUS_LABEL, PERFORMANCE_STATUS } from '../stores/performance'
import { useSignupStore } from '../stores/signup'
import { useAuthStore } from '../stores/auth'

const songStore = useSongStore()
const partStore = usePartStore()
const equipmentStore = useEquipmentStore()
const performanceStore = usePerformanceStore()
const signupStore = useSignupStore()
const authStore = useAuthStore()

const tabs = [
  { key: 'songs', label: '曲目管理', icon: '🎸' },
  { key: 'parts', label: '声部管理', icon: '🎼' },
  { key: 'performances', label: '演出单管理', icon: '📋' }
]

const activeTab = ref('songs')
const songSearch = ref('')
const partSearch = ref('')
const perfSearch = ref('')
const perfStatusFilter = ref('')

const filteredSongs = computed(() => songStore.searchSongs(songSearch.value))
const filteredParts = computed(() => partStore.searchParts(partSearch.value))
const filteredPerformances = computed(() => performanceStore.searchPerformances(perfSearch.value, perfStatusFilter.value))

const showSongModal = ref(false)
const editingSong = ref(null)
const songForm = reactive({
  name: '',
  artist: '',
  duration: 0,
  tempo: '中速',
  difficulty: '中等',
  description: ''
})

const showPartModal = ref(false)
const editingPart = ref(null)
const partForm = reactive({
  name: '',
  description: '',
  isKey: false,
  sortOrder: 1
})

const showPerformanceModal = ref(false)
const editingPerformance = ref(null)
const perfForm = reactive({
  name: '',
  performanceDate: '',
  venue: '',
  description: '',
  songIds: [],
  equipmentIds: []
})

const showDetailModal = ref(false)
const detailPerf = ref(null)

function openSongModal(song = null) {
  editingSong.value = song
  if (song) {
    Object.assign(songForm, {
      name: song.name,
      artist: song.artist,
      duration: song.duration,
      tempo: song.tempo,
      difficulty: song.difficulty,
      description: song.description || ''
    })
  } else {
    Object.assign(songForm, {
      name: '',
      artist: '',
      duration: 0,
      tempo: '中速',
      difficulty: '中等',
      description: ''
    })
  }
  showSongModal.value = true
}

function closeSongModal() {
  showSongModal.value = false
  editingSong.value = null
}

function saveSong() {
  if (!songForm.name.trim() || !songForm.artist.trim()) {
    alert('请填写曲目名称和歌手')
    return
  }

  if (editingSong.value) {
    songStore.updateSong(editingSong.value.id, { ...songForm })
  } else {
    songStore.addSong({ ...songForm })
  }
  closeSongModal()
}

function handleDeleteSong(song) {
  if (confirm(`确定要删除曲目「${song.name}」吗？`)) {
    songStore.deleteSong(song.id)
  }
}

function openPartModal(part = null) {
  editingPart.value = part
  if (part) {
    Object.assign(partForm, {
      name: part.name,
      description: part.description || '',
      isKey: part.isKey,
      sortOrder: part.sortOrder
    })
  } else {
    Object.assign(partForm, {
      name: '',
      description: '',
      isKey: false,
      sortOrder: partStore.partCount + 1
    })
  }
  showPartModal.value = true
}

function closePartModal() {
  showPartModal.value = false
  editingPart.value = null
}

function savePart() {
  if (!partForm.name.trim()) {
    alert('请填写声部名称')
    return
  }

  if (editingPart.value) {
    partStore.updatePart(editingPart.value.id, { ...partForm })
  } else {
    partStore.addPart({ ...partForm })
  }
  closePartModal()
}

function handleDeletePart(part) {
  if (confirm(`确定要删除声部「${part.name}」吗？`)) {
    partStore.deletePart(part.id)
  }
}

function toggleKeyPart(part) {
  partStore.toggleKeyPart(part.id)
}

function openPerformanceModal(perf = null) {
  editingPerformance.value = perf
  if (perf) {
    Object.assign(perfForm, {
      name: perf.name,
      performanceDate: perf.performanceDate,
      venue: perf.venue || '',
      description: perf.description || '',
      songIds: [...(perf.songIds || [])],
      equipmentIds: [...(perf.equipmentIds || [])]
    })
  } else {
    Object.assign(perfForm, {
      name: '',
      performanceDate: '',
      venue: '',
      description: '',
      songIds: [],
      equipmentIds: []
    })
  }
  showPerformanceModal.value = true
}

function closePerformanceModal() {
  showPerformanceModal.value = false
  editingPerformance.value = null
}

function savePerformance() {
  if (!perfForm.name.trim() || !perfForm.performanceDate) {
    alert('请填写演出单名称和演出日期')
    return
  }
  if (perfForm.songIds.length === 0) {
    alert('请至少选择一个曲目')
    return
  }

  let result
  if (editingPerformance.value) {
    result = performanceStore.updatePerformance(editingPerformance.value.id, { ...perfForm }, songStore, equipmentStore)
  } else {
    result = performanceStore.createPerformance({ ...perfForm }, songStore, equipmentStore)
  }

  if (!result.success) {
    alert(result.errors.join('\n'))
    return
  }
  closePerformanceModal()
}

function handleDeletePerformance(perf) {
  if (confirm(`确定要删除演出单「${perf.name}」吗？`)) {
    const result = performanceStore.deletePerformance(perf.id)
    if (!result.success) {
      alert(result.errors.join('\n'))
    } else {
      signupStore.deleteSignupsByPerformanceId(perf.id)
    }
  }
}

function viewPerformanceDetail(perf) {
  detailPerf.value = perf
  showDetailModal.value = true
}

function closeDetailModal() {
  showDetailModal.value = false
  detailPerf.value = null
}

function getMissingParts(perf) {
  return signupStore.getMissingKeyParts(perf.id, partStore, performanceStore)
}

function canConfirmPerf(perf) {
  const missing = getMissingParts(perf)
  if (missing.length > 0) return false
  if (perf.songIds?.length === 0) return false
  return true
}

function confirmPerformance(perf) {
  if (!canConfirmPerf(perf)) {
    alert('关键声部缺失或未添加曲目，无法确认演出单')
    return
  }
  const result = performanceStore.confirmPerformance(perf.id, songStore, equipmentStore)
  if (!result.success) {
    alert(result.errors.join('\n'))
  }
}

function backToDraft(perf) {
  performanceStore.backToDraft(perf.id)
}

function startPerformance(perf) {
  if (confirm(`确定要开始排练「${perf.name}」吗？开始后不能删除曲目。`)) {
    const result = performanceStore.startPerformance(perf.id, songStore, equipmentStore)
    if (!result.success) {
      alert(result.errors.join('\n'))
    }
  }
}

function completePerformance(perf) {
  performanceStore.completePerformance(perf.id)
}

function getPerfSongs(perf) {
  return performanceStore.getSongsByPerformanceId(perf.id, songStore)
}

function getPerfEquipments(perf) {
  return performanceStore.getEquipmentsByPerformanceId(perf.id, equipmentStore)
}

function getSignupUsers(perfId, partId) {
  return signupStore.getSignupsByPartId(perfId, partId)
}

function getUser(userId) {
  return authStore.getUserById(userId)
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

function getDifficultyClass(d) {
  const map = { '简单': 'diff-easy', '中等': 'diff-medium', '困难': 'diff-hard' }
  return map[d] || ''
}
</script>

<style scoped>
.leader-dashboard {
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

.stat-song .stat-icon { background: linear-gradient(135deg, #fef3c7, #fde68a); }
.stat-part .stat-icon { background: linear-gradient(135deg, #dbeafe, #bfdbfe); }
.stat-performance .stat-icon { background: linear-gradient(135deg, #fce7f3, #fbcfe8); }
.stat-signup .stat-icon { background: linear-gradient(135deg, #d1fae5, #a7f3d0); }

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

.tab-panel {
  padding: 24px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.panel-header h3 {
  margin: 0;
  color: #1f2937;
}

.search-bar, .filter-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.search-input, .select-input {
  flex: 1;
  padding: 10px 14px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  transition: all 0.2s;
}

.search-input:focus, .select-input:focus {
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.15);
}

.filter-bar .search-input { flex: 2; }
.filter-bar .select-input { flex: 1; }

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
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
  padding: 14px 16px;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
}

.card-header h4 {
  margin: 0;
  color: #1f2937;
  display: flex;
  align-items: center;
  gap: 8px;
}

.card-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.card-body {
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
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

.key-badge {
  background: #fef3c7;
  color: #b45309;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 600;
}

.switch-tag {
  padding: 2px 10px;
  border-radius: 10px;
  background: #f3f4f6;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s;
}

.switch-tag.active {
  background: #fef3c7;
  color: #b45309;
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

.empty-tip {
  padding: 16px;
  background: #f9fafb;
  border-radius: 8px;
  color: #9ca3af;
  text-align: center;
  font-size: 13px;
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

.perf-actions {
  display: flex;
  gap: 8px;
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
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.perf-missing {
  padding: 12px 16px;
  background: #fffbeb;
  border-radius: 8px;
  border: 1px solid #fde68a;
}

.missing-title {
  font-size: 13px;
  color: #92400e;
  font-weight: 600;
  margin-bottom: 6px;
}

.missing-ok {
  color: #059669;
  font-size: 13px;
  font-weight: 600;
}

.missing-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.missing-tag {
  padding: 2px 10px;
  background: #fef3c7;
  color: #b45309;
  border-radius: 10px;
  font-size: 12px;
}

.perf-footer {
  padding: 14px 20px;
  border-top: 1px solid #e5e7eb;
  background: #fafafa;
}

.footer-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.started-tip {
  color: #b45309;
  font-weight: 600;
}

.completed-tip {
  color: #059669;
  font-weight: 600;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal {
  background: white;
  border-radius: 14px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  animation: slideUp 0.2s ease;
}

.modal-medium { width: 100%; max-width: 560px; }
.modal-large { width: 100%; max-width: 760px; }

@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.modal-header {
  padding: 18px 24px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
  color: #1f2937;
}

.modal-close {
  background: none;
  border: none;
  font-size: 28px;
  color: #9ca3af;
  cursor: pointer;
  line-height: 1;
}

.modal-body {
  padding: 20px 24px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.modal-footer {
  padding: 16px 24px;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.form-group label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 6px;
}

.form-group input[type="text"],
.form-group input[type="number"],
.form-group input[type="date"],
.form-group textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  transition: all 0.2s;
  box-sizing: border-box;
  font-family: inherit;
}

.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.15);
}

.checkbox-label {
  display: flex !important;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 8px 0;
}

.checkbox-label input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.checkbox-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 200px;
  overflow-y: auto;
  padding: 10px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
}

.checkbox-item:hover {
  background: #f9fafb;
}

.checkbox-item input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.detail-section {
  margin-bottom: 20px;
}

.detail-section h4 {
  margin: 0 0 12px 0;
  padding-bottom: 8px;
  border-bottom: 2px solid #e5e7eb;
  color: #374151;
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.song-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.song-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: #f9fafb;
  border-radius: 6px;
}

.song-idx {
  width: 24px;
  color: #667eea;
  font-weight: 700;
}

.song-name {
  flex: 1;
  font-weight: 600;
  color: #1f2937;
}

.song-artist {
  color: #6b7280;
  font-size: 13px;
}

.song-dur {
  color: #9ca3af;
  font-size: 13px;
  font-family: monospace;
}

.equipment-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.eq-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: #f9fafb;
  border-radius: 6px;
}

.eq-name {
  font-weight: 600;
  color: #1f2937;
}

.eq-cat {
  padding: 2px 10px;
  background: #dbeafe;
  color: #1d4ed8;
  border-radius: 10px;
  font-size: 12px;
}

.eq-desc {
  flex: 1;
  color: #6b7280;
  font-size: 13px;
  text-align: right;
}

.signup-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.signup-row {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 12px;
  background: #f9fafb;
  border-radius: 8px;
}

.signup-part {
  min-width: 120px;
  font-size: 14px;
}

.key-dot {
  color: #f59e0b;
  margin-right: 4px;
}

.key-label {
  color: #f59e0b;
  font-size: 12px;
}

.signup-users {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.user-tag {
  padding: 4px 12px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border-radius: 14px;
  font-size: 12px;
  font-weight: 500;
}

.empty-signup {
  color: #9ca3af;
  font-size: 13px;
}

.empty-signup.warn {
  color: #dc2626;
  font-weight: 600;
}

.warning-box {
  padding: 14px 16px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #dc2626;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
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

.btn-success {
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
}

.btn-success:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
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

  .perf-body {
    grid-template-columns: 1fr;
  }

  .form-row {
    grid-template-columns: 1fr;
  }

  .detail-grid {
    grid-template-columns: 1fr;
  }
}
</style>
