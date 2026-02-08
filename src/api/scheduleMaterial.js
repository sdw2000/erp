import request from '@/utils/request'

/**
 * 排程物料管理 API
 */

/**
 * 排程启动时锁定物料
 * @param {number} scheduleId 排程ID
 * @returns {Promise}
 */
export function lockMaterials(scheduleId) {
  return request({
    url: `/production/schedule-material/lock/${scheduleId}`,
    method: 'post'
  })
}

/**
 * 查询排程的物料分配情况
 * @param {number} scheduleId 排程ID
 * @returns {Promise}
 */
export function queryAllocationBySchedule(scheduleId) {
  return request({
    url: `/production/schedule-material/allocation/${scheduleId}`,
    method: 'get'
  })
}

/**
 * 查询排程中某订单的分配情况
 * @param {number} scheduleId 排程ID
 * @param {number} orderId 订单ID
 * @returns {Promise}
 */
export function queryAllocationByOrder(scheduleId, orderId) {
  return request({
    url: `/production/schedule-material/allocation/${scheduleId}/${orderId}`,
    method: 'get'
  })
}

/**
 * 查询物料被锁定的情况
 * @param {number} tapeId 物料ID
 * @returns {Promise}
 */
export function queryTapeLocks(tapeId) {
  return request({
    url: `/production/schedule-material/tape-locks/${tapeId}`,
    method: 'get'
  })
}

/**
 * 查询订单的锁定记录
 * @param {number} orderId 订单ID
 * @returns {Promise}
 */
export function queryOrderLocks(orderId) {
  return request({
    url: `/production/schedule-material/order-locks/${orderId}`,
    method: 'get'
  })
}

/**
 * 生产领料（扣减库存）
 * @param {array} lockIds 锁定记录IDs
 * @returns {Promise}
 */
export function allocateMaterials(lockIds) {
  return request({
    url: '/production/schedule-material/allocate',
    method: 'post',
    data: {
      lockIds: lockIds
    }
  })
}

/**
 * 生产退料（库存归还）
 * @param {array} lockIds 锁定记录IDs
 * @returns {Promise}
 */
export function returnMaterials(lockIds) {
  return request({
    url: '/production/schedule-material/return',
    method: 'post',
    data: { lockIds }
  })
}

/**
 * 释放排程的锁定（排程取消时）
 * @param {number} scheduleId 排程ID
 * @returns {Promise}
 */
export function releaseLocks(scheduleId) {
  return request({
    url: `/production/schedule-material/release/${scheduleId}`,
    method: 'post'
  })
}
