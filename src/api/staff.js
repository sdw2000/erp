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
