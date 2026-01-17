import request from '@/utils/request'

/**
 * 设备管理API
 */

// 获取设备列表
export function getEquipmentList(params) {
  return request({
    url: '/production/equipment/list',
    method: 'get',
    params
  })
}

// 根据ID获取设备
export function getEquipmentById(id) {
  return request({
    url: `/production/equipment/${id}`,
    method: 'get'
  })
}

// 新增设备
export function addEquipment(data) {
  return request({
    url: '/production/equipment',
    method: 'post',
    data
  })
}

// 修改设备
export function updateEquipment(data) {
  return request({
    url: '/production/equipment',
    method: 'put',
    data
  })
}

// 删除设备
export function deleteEquipment(id) {
  return request({
    url: `/production/equipment/${id}`,
    method: 'delete'
  })
}

// 获取设备类型列表
export function getEquipmentTypes() {
  return request({
    url: '/production/equipment/types',
    method: 'get'
  })
}

// 获取车间列表
export function getWorkshops() {
  return request({
    url: '/production/equipment/workshops',
    method: 'get'
  })
}

// 根据设备类型获取可用设备
export function getAvailableByType(type) {
  return request({
    url: `/production/equipment/available/${type}`,
    method: 'get'
  })
}

// 更新设备状态
export function updateEquipmentStatus(id, status) {
  return request({
    url: `/production/equipment/${id}/status`,
    method: 'put',
    params: { status }
  })
}

// 导入设备
export function importEquipment(data) {
  return request({
    url: '/production/equipment/import',
    method: 'post',
    data,
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

// 导出设备数据
export function exportEquipment(params) {
  return request({
    url: '/production/equipment/export',
    method: 'get',
    params,
    responseType: 'blob'
  })
}

// 下载导入模板
export function downloadTemplate() {
  return request({
    url: '/production/equipment/template',
    method: 'get',
    responseType: 'blob'
  })
}

// ==================== 车间管理 ====================

/**
 * 获取车间列表（分页）
 */
export function getWorkshopList(params) {
  return request({
    url: '/production/equipment/workshop/list',
    method: 'get',
    params
  })
}

/**
 * 新增车间
 */
export function addWorkshop(data) {
  return request({
    url: '/production/equipment/workshop',
    method: 'post',
    data
  })
}

/**
 * 更新车间
 */
export function updateWorkshop(data) {
  return request({
    url: '/production/equipment/workshop',
    method: 'put',
    data
  })
}

/**
 * 删除车间
 */
export function deleteWorkshop(id) {
  return request({
    url: `/production/equipment/workshop/${id}`,
    method: 'delete'
  })
}

// ==================== 设备类型管理 ====================

/**
 * 获取设备类型列表（分页）
 */
export function getEquipmentTypeList(params) {
  return request({
    url: '/production/equipment/type/list',
    method: 'get',
    params
  })
}

// ==================== 班组（跨模块调用） ====================

/**
 * 根据车间获取班组
 */
export function getTeamsByWorkshop(workshopId) {
  return request({
    url: `/production/staff/team/byWorkshop/${workshopId}`,
    method: 'get'
  })
}
