import request from '@/utils/request'

// ==================== 人员管理 ====================

/**
 * 获取人员列表
 */
export function getStaffList(params) {
  return request({
    url: '/production/staff/list',
    method: 'get',
    params
  })
}

/**
 * 获取人员详情
 */
export function getStaffDetail(id) {
  return request({
    url: `/production/staff/${id}`,
    method: 'get'
  })
}

/**
 * 新增人员
 */
export function addStaff(data) {
  return request({
    url: '/production/staff',
    method: 'post',
    data
  })
}

/**
 * 更新人员
 */
export function updateStaff(id, data) {
  return request({
    url: `/production/staff/${id}`,
    method: 'put',
    data
  })
}

/**
 * 删除人员
 */
export function deleteStaff(id) {
  return request({
    url: `/production/staff/${id}`,
    method: 'delete'
  })
}

/**
 * 批量删除人员
 */
export function batchDeleteStaff(ids) {
  return request({
    url: '/production/staff/batch',
    method: 'delete',
    data: ids
  })
}

/**
 * 导入人员
 */
export function importStaff(data) {
  return request({
    url: '/production/staff/import',
    method: 'post',
    data,
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

/**
 * 获取人员技能
 */
export function getStaffSkills(staffId) {
  return request({
    url: `/production/staff/${staffId}/skills`,
    method: 'get'
  })
}

/**
 * 保存人员技能
 */
export function saveStaffSkills(staffId, skills) {
  return request({
    url: `/production/staff/${staffId}/skills`,
    method: 'post',
    data: skills
  })
}

/**
 * 根据设备类型获取可操作人员
 */
export function getStaffByEquipmentType(equipmentType) {
  return request({
    url: `/production/staff/byEquipmentType/${equipmentType}`,
    method: 'get'
  })
}

/**
 * 获取所有在职人员
 */
export function getAllActiveStaff() {
  return request({
    url: '/production/staff/active',
    method: 'get'
  })
}

// ==================== 班组管理 ====================

/**
 * 获取班组列表
 */
export function getTeamList(params) {
  return request({
    url: '/production/staff/team/list',
    method: 'get',
    params
  })
}

/**
 * 获取班组详情
 */
export function getTeamDetail(id) {
  return request({
    url: `/production/staff/team/${id}`,
    method: 'get'
  })
}

/**
 * 新增班组
 */
export function addTeam(data) {
  return request({
    url: '/production/staff/team',
    method: 'post',
    data
  })
}

/**
 * 更新班组
 */
export function updateTeam(id, data) {
  return request({
    url: `/production/staff/team/${id}`,
    method: 'put',
    data
  })
}

/**
 * 删除班组
 */
export function deleteTeam(id) {
  return request({
    url: `/production/staff/team/${id}`,
    method: 'delete'
  })
}

/**
 * 根据车间获取班组
 */
export function getTeamsByWorkshop(workshopId) {
  return request({
    url: `/production/staff/team/byWorkshop/${workshopId}`,
    method: 'get'
  })
}

/**
 * 获取所有启用的班组
 */
export function getAllActiveTeams() {
  return request({
    url: '/production/staff/team/active',
    method: 'get'
  })
}

// ==================== 班次管理 ====================

/**
 * 获取所有班次
 */
export function getAllShifts() {
  return request({
    url: '/production/staff/shift/list',
    method: 'get'
  })
}

// ==================== 请假管理 ====================

export function getLeaveList(params) {
  return request({
    url: '/production/staff/leave/list',
    method: 'get',
    params
  })
}

export function addLeave(data) {
  return request({
    url: '/production/staff/leave',
    method: 'post',
    data
  })
}

export function updateLeave(id, data) {
  return request({
    url: `/production/staff/leave/${id}`,
    method: 'put',
    data
  })
}

export function approveLeave(id, status) {
  return request({
    url: `/production/staff/leave/${id}/approve`,
    method: 'put',
    params: { status }
  })
}

export function deleteLeave(id) {
  return request({
    url: `/production/staff/leave/${id}`,
    method: 'delete'
  })
}

// ==================== 加班管理 ====================

export function getOvertimeList(params) {
  return request({
    url: '/production/staff/overtime/list',
    method: 'get',
    params
  })
}

export function addOvertime(data) {
  return request({
    url: '/production/staff/overtime',
    method: 'post',
    data
  })
}

export function updateOvertime(id, data) {
  return request({
    url: `/production/staff/overtime/${id}`,
    method: 'put',
    data
  })
}

export function approveOvertime(id, status) {
  return request({
    url: `/production/staff/overtime/${id}/approve`,
    method: 'put',
    params: { status }
  })
}

export function deleteOvertime(id) {
  return request({
    url: `/production/staff/overtime/${id}`,
    method: 'delete'
  })
}
