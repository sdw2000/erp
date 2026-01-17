import request from '@/utils/request'

/**
 * 物料锁定管理 API
 */

/**
 * 获取订单物料锁定列表
 * @param {Object} params - 查询参数
 * @returns {Promise}
 */
export function getOrderMaterialLocks(params) {
  return request({
    url: '/api/production/material-lock/order-locks',
    method: 'get',
    params
  })
}

/**
 * 锁定订单物料
 * @param {Object} data - 锁定数据
 * @returns {Promise}
 */
export function lockOrderMaterial(data) {
  return request({
    url: '/api/production/material-lock/lock',
    method: 'post',
    data
  })
}

/**
 * 释放订单物料锁定
 * @param {Number} lockId - 锁定ID
 * @param {String} operator - 操作人
 * @returns {Promise}
 */
export function releaseOrderMaterialLock(lockId, operator) {
  return request({
    url: `/api/production/material-lock/release/${lockId}`,
    method: 'post',
    params: { operator }
  })
}

/**
 * 批量释放订单物料锁定
 * @param {Array} lockIds - 锁定ID数组
 * @param {String} operator - 操作人
 * @returns {Promise}
 */
export function batchReleaseOrderMaterialLocks(lockIds, operator) {
  return request({
    url: '/api/production/material-lock/batch-release',
    method: 'post',
    data: { lockIds, operator }
  })
}

/**
 * 触发领料
 * @param {Number} lockId - 锁定ID
 * @param {String} operator - 操作人
 * @returns {Promise}
 */
export function triggerMaterialPicking(lockId, operator) {
  return request({
    url: `/api/production/material-lock/trigger-picking/${lockId}`,
    method: 'post',
    params: { operator }
  })
}

/**
 * 获取物料的多单共用情况
 * @param {String} qrCode - 物料二维码
 * @returns {Promise}
 */
export function getMaterialSharedLocks(qrCode) {
  return request({
    url: `/api/production/material-lock/shared-locks/${qrCode}`,
    method: 'get'
  })
}

/**
 * 获取涂布原材料锁定列表
 * @param {Object} params - 查询参数
 * @returns {Promise}
 */
export function getCoatingMaterialLocks(params) {
  return request({
    url: '/api/production/material-lock/coating-locks',
    method: 'get',
    params
  })
}

/**
 * 获取订单发料单
 * @param {Number} orderId - 订单ID
 * @returns {Promise}
 */
export function getOrderDeliveryNote(orderId) {
  return request({
    url: `/api/production/material-lock/delivery-note/${orderId}`,
    method: 'get'
  })
}

/**
 * 获取物料锁定统计
 * @returns {Promise}
 */
export function getMaterialLockStats() {
  return request({
    url: '/api/production/material-lock/stats',
    method: 'get'
  })
}
