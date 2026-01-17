import request from '@/utils/request'

/**
 * 复卷分切排程 API
 */

/**
 * 从物料缺口创建分切任务
 * @param {Number} shortageId - 缺口ID
 * @param {Number} equipmentId - 设备ID
 * @param {Number} scheduledDate - 计划日期
 * @returns {Promise}
 */
export function createSlittingTask(shortageId, equipmentId, scheduledDate) {
  return request({
    url: '/api/production/slitting-schedule/create-from-shortage',
    method: 'post',
    params: { shortageId, equipmentId, scheduledDate }
  })
}

/**
 * 分页查询分切任务
 * @param {Object} params - 查询参数
 * @returns {Promise}
 */
export function getSlittingTaskPage(params) {
  return request({
    url: '/api/production/slitting-schedule/page',
    method: 'get',
    params
  })
}

/**
 * 启动分切任务
 * @param {Number} taskId - 任务ID
 * @returns {Promise}
 */
export function startSlittingTask(taskId) {
  return request({
    url: `/api/production/slitting-schedule/start/${taskId}`,
    method: 'post'
  })
}

/**
 * 完成分切任务（回流库存）
 * @param {Number} taskId - 任务ID
 * @param {Number} completedQty - 完成数量
 * @param {Number} wasteQty - 废料数量
 * @returns {Promise}
 */
export function completeSlittingTask(taskId, completedQty, wasteQty) {
  return request({
    url: `/api/production/slitting-schedule/complete/${taskId}`,
    method: 'post',
    params: { completedQty, wasteQty }
  })
}

/**
 * 标记分切任务失败
 * @param {Number} taskId - 任务ID
 * @param {String} reason - 失败原因
 * @returns {Promise}
 */
export function failSlittingTask(taskId, reason) {
  return request({
    url: `/api/production/slitting-schedule/fail/${taskId}`,
    method: 'post',
    params: { reason }
  })
}

/**
 * 获取分切统计
 * @returns {Promise}
 */
export function getSlittingStats() {
  return request({
    url: '/api/production/slitting-schedule/stats',
    method: 'get'
  })
}
