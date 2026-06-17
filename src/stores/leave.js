import { defineStore } from "pinia"
import { ref, computed } from "vue"
import { storage, STORAGE_KEYS } from "../utils/storage"
import { generateId } from "../utils/id"
import { PERFORMANCE_STATUS } from "./performance"
import { SONG_CONFIG_PART_ROLE } from "./songConfig"

export const LEAVE_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  CANCELLED: "cancelled"
}

export const LEAVE_STATUS_LABEL = {
  [LEAVE_STATUS.PENDING]: "待审批",
  [LEAVE_STATUS.APPROVED]: "已批准",
  [LEAVE_STATUS.REJECTED]: "已拒绝",
  [LEAVE_STATUS.CANCELLED]: "已取消"
}

export const LEAVE_RESOLUTION_ACTION = {
  FIND_SUBSTITUTE: "find_substitute",
  CHANGE_SONG: "change_song",
  SUSPEND_PERFORMANCE: "suspend_performance",
  ACCEPT_RISK: "accept_risk"
}

export const LEAVE_RESOLUTION_ACTION_LABEL = {
  [LEAVE_RESOLUTION_ACTION.FIND_SUBSTITUTE]: "找人替补",
  [LEAVE_RESOLUTION_ACTION.CHANGE_SONG]: "调整曲目",
  [LEAVE_RESOLUTION_ACTION.SUSPEND_PERFORMANCE]: "挂起演出单",
  [LEAVE_RESOLUTION_ACTION.ACCEPT_RISK]: "接受风险继续"
}

export const useLeaveStore = defineStore("leave", () => {
  const leaves = ref(storage.get(STORAGE_KEYS.LEAVES) || [])

  const leaveList = computed(() => leaves.value)
  const pendingLeaves = computed(() => leaves.value.filter(l => l.status === LEAVE_STATUS.PENDING))
  const leaveCount = computed(() => leaves.value.length)

  function persist() {
    storage.set(STORAGE_KEYS.LEAVES, leaves.value)
  }

  function getLeaveById(id) {
    return leaves.value.find(l => l.id === id)
  }

  function getLeavesByUserId(userId) {
    return leaves.value.filter(l => l.userId === userId)
  }

  function getLeavesByPerformanceId(performanceId) {
    return leaves.value.filter(l => l.performanceId === performanceId)
  }

  function getApprovedLeavesByPerformanceId(performanceId) {
    return getLeavesByPerformanceId(performanceId).filter(l => l.status === LEAVE_STATUS.APPROVED)
  }

  function createLeave(leaveData, _performanceStore, _signupStore) {
    const { performanceId, userId } = leaveData

    const performance = _performanceStore?.getPerformanceById?.(performanceId) || null
    if (performance) {
      if (performance.status === PERFORMANCE_STATUS.COMPLETED) {
        return { success: false, errors: ["演出已完成，不能请假"] }
      }
    }

    const hasSignedUp = _signupStore?.hasUserSignedUp?.(performanceId, userId)
    if (_signupStore && hasSignedUp === false) {
      return { success: false, errors: ["您未报名该演出，不能请假"] }
    }

    const existingLeave = leaves.value.find(l =>
      l.performanceId === performanceId &&
      l.userId === userId &&
      l.status !== LEAVE_STATUS.CANCELLED
    )
    if (existingLeave) {
      return { success: false, errors: ["您已存在该演出的请假申请"] }
    }

    const signup = _signupStore?.getUserSignupForPerformance?.(performanceId, userId) || null

    const newLeave = {
      id: generateId(),
      performanceId,
      userId,
      partId: leaveData.partId || signup?.partId || null,
      reason: leaveData.reason || "",
      startDate: leaveData.startDate,
      endDate: leaveData.endDate,
      status: LEAVE_STATUS.PENDING,
      resolution: null,
      resolutionNote: "",
      substituteUserId: null,
      createdAt: Date.now()
    }

    leaves.value.push(newLeave)
    persist()
    return { success: true, leave: newLeave }
  }

  function updateLeave(id, updates) {
    const index = leaves.value.findIndex(l => l.id === id)
    if (index === -1) return null

    leaves.value[index] = { ...leaves.value[index], ...updates, updatedAt: Date.now() }
    persist()
    return leaves.value[index]
  }

  function computeEffectivePartCount(performanceId, partId, signupStore, leaveStore) {
    const allSignups = signupStore?.getSignupsByPartId(performanceId, partId) || []
    const approvedLeaves = (leaveStore || this).getApprovedLeavesByPerformanceId(performanceId)
    const leaveUserIds = new Set(approvedLeaves.filter(l => !l.partId || l.partId === partId).map(l => l.userId))
    return allSignups.filter(s => !leaveUserIds.has(s.userId)).length
  }

  function analyzeLeaveImpact(leaveId, performanceStore, signupStore, songConfigStore, partStore, authStore) {
    const leave = getLeaveById(leaveId)
    if (!leave) return { canApprove: false, reasons: ["请假申请不存在"] }

    const performance = performanceStore.getPerformanceById(leave.performanceId)
    if (!performance) return { canApprove: false, reasons: ["演出单不存在"] }

    const reasons = []
    const suggestions = []
    const affectedSongs = []
    const partShortages = []

    const songIds = performance.songIds || []

    for (const songId of songIds) {
      const cfg = songConfigStore.getConfig(performance.id, songId)
      const requiredMins = cfg?.requiredMinCount || {}
      const keyParts = partStore.keyParts

      for (const part of partStore.partList) {
        const required = requiredMins[part.id] || (part.isKey ? 1 : 0)
        if (required <= 0) continue

        const effectiveCount = computeEffectivePartCount.call(
          this, performance.id, part.id, signupStore, this
        )

        const wouldCount = leave.partId && leave.partId !== part.id
          ? effectiveCount
          : effectiveCount - 1

        if (wouldCount < required) {
          const song = songId ? { id: songId } : null
          const shortage = {
            partId: part.id,
            partName: part.name,
            isKey: part.isKey,
            required,
            current: effectiveCount,
            afterLeave: Math.max(0, wouldCount),
            gap: required - wouldCount,
            songId
          }
          partShortages.push(shortage)

          const backups = songConfigStore.getBackups(performance.id, songId, part.id)
          const backupCandidates = backups.map(b => {
            const user = authStore.getUserById(b.userId)
            return { userId: b.userId, userName: user?.name || "未知用户" }
          })

          affectedSongs.push({
            songId,
            partShortage: shortage,
            backupCandidates
          })

          reasons.push(
            `曲目「${songId}」声部「${part.name}」最低需${required}人，请假后仅${Math.max(0, wouldCount)}人`
          )

          if (backupCandidates.length > 0) {
            suggestions.push({
              action: LEAVE_RESOLUTION_ACTION.FIND_SUBSTITUTE,
              partName: part.name,
              candidates: backupCandidates,
              songId
            })
          }
        }
      }
    }

    if (partShortages.length > 0) {
      const hasKeyShortage = partShortages.some(s => s.isKey && s.gap > 0)
      if (hasKeyShortage) {
        suggestions.push({
          action: LEAVE_RESOLUTION_ACTION.SUSPEND_PERFORMANCE,
          reason: "有关键声部人数不达标，建议挂起演出单"
        })
      } else {
        suggestions.push({
          action: LEAVE_RESOLUTION_ACTION.CHANGE_SONG,
          reason: "非关键声部人数不达标，可调整曲目"
        })
      }
    } else {
      suggestions.push({
        action: LEAVE_RESOLUTION_ACTION.ACCEPT_RISK,
        reason: "声部人数满足要求，可正常批准"
      })
    }

    const canApprove = suggestions.some(s =>
      s.action !== LEAVE_RESOLUTION_ACTION.SUSPEND_PERFORMANCE
    ) || reasons.length === 0

    return {
      canApprove,
      reasons,
      suggestions,
      affectedSongs,
      partShortages
    }
  }

  function approveLeaveWithResolution(id, resolution, resolutionNote, substituteUserId) {
    const updates = {
      status: LEAVE_STATUS.APPROVED,
      resolution,
      resolutionNote: resolutionNote || "",
      substituteUserId: substituteUserId || null
    }
    return updateLeave(id, updates)
  }

  function approveLeave(id) {
    return updateLeave(id, { status: LEAVE_STATUS.APPROVED })
  }

  function rejectLeave(id, reason) {
    return updateLeave(id, {
      status: LEAVE_STATUS.REJECTED,
      rejectReason: reason || ""
    })
  }

  function cancelLeave(id) {
    return updateLeave(id, { status: LEAVE_STATUS.CANCELLED })
  }
  function withdrawLeave(id) {
    return cancelLeave(id)
  }

  if (!storage.get(STORAGE_KEYS.LEAVES)) {
    persist()
  }

  return {
    leaves,
    leaveList,
    pendingLeaves,
    leaveCount,
    getLeaveById,
    getLeavesByUserId,
    getLeavesByPerformanceId,
    getApprovedLeavesByPerformanceId,
    createLeave,
    updateLeave,
    computeEffectivePartCount,
    analyzeLeaveImpact,
    approveLeaveWithResolution,
    approveLeave,
    rejectLeave,
    cancelLeave,
    withdrawLeave
  }
})
