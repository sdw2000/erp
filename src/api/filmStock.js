import request from '@/utils/request'

/**
 * 获取可用的薄膜宽度列表
 * @param {Number} thickness - 可选，厚度筛选
 */
export function getAvailableFilmWidths(thickness) {
  return request({
    url: '/api/film/available-widths',
    method: 'get',
    params: { thickness }
  })
}

/**
 * 获取指定规格的库存详情
 * @param {Number} width - 宽度(mm)
 * @param {Number} thickness - 可选，厚度(μm)
 */
export function getFilmStockDetail(width, thickness) {
  return request({
    url: '/api/film/stock-detail',
    method: 'get',
    params: { width, thickness }
  })
}

/**
 * 检查库存是否充足
 * @param {Number} width - 宽度(mm)
 * @param {Number} thickness - 可选，厚度(μm)
 * @param {Number} requiredArea - 需求面积(㎡)
 */
export function checkFilmStock(width, thickness, requiredArea) {
  return request({
    url: '/api/film/check-stock',
    method: 'get',
    params: { width, thickness, requiredArea }
  })
}

/**
 * 锁定排程物料
 * @param {Object} data - 锁定请求
 */
export function lockScheduleMaterial(data) {
  return request({
    url: '/api/schedule/material-lock/lock',
    method: 'post',
    data
  })
}

/**
 * 自动锁定物料
 * @param {Number} scheduleId - 排程ID
 * @param {Number} filmWidth - 薄膜宽度
 * @param {Number} filmThickness - 可选，薄膜厚度
 */
export function autoLockMaterial(scheduleId, filmWidth, filmThickness) {
  return request({
    url: '/api/schedule/material-lock/auto-lock',
    method: 'post',
    params: { scheduleId, filmWidth, filmThickness }
  })
}

/**
 * 释放锁定物料
 * @param {Number} scheduleId - 排程ID
 */
export function unlockScheduleMaterial(scheduleId) {
  return request({
    url: `/api/schedule/material-lock/unlock/${scheduleId}`,
    method: 'post'
  })
}

/**
 * 获取锁定物料信息
 * @param {Number} scheduleId - 排程ID
 */
export function getLockedMaterials(scheduleId) {
  return request({
    url: `/api/schedule/material-lock/locked-materials/${scheduleId}`,
    method: 'get'
  })
}

/**
 * 批量锁定物料
 * @param {Array} data - 锁定请求列表
 */
export function batchLockMaterial(data) {
  return request({
    url: '/api/schedule/material-lock/batch-lock',
    method: 'post',
    data
  })
}
