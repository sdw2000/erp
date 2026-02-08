import request from '@/utils/request'

const BASE_URL = '/api/production/coating-schedule'

/**
 * 动态涂布排程 API
 */

/**
 * 获取待涂布订单池列表
 * @param {Object} params - 查询参数
 * @returns {Promise}
 */
export function getPendingCoatingPool(params) {
  return request({
    url: `${BASE_URL}/pending-pool`,
    method: 'get',
    params
  })
}

/**
 * 按料号分组获取待涂布订单
 * @returns {Promise}
 */
export function getPendingCoatingByMaterial() {
  return request({
    url: `${BASE_URL}/pending-by-material`,
    method: 'get'
  })
}

/**
 * 添加订单到待涂布池
 * @param {Object} data - 订单数据
 * @returns {Promise}
 */
export function addToPendingCoatingPool(data) {
  return request({
    url: `${BASE_URL}/add-to-pool`,
    method: 'post',
    data
  })
}

/**
 * 从待涂布池移除订单
 * @param {Number} poolId - 池ID
 * @param {String} operator - 操作人
 * @returns {Promise}
 */
export function removeFromPendingCoatingPool(poolId, operator) {
  return request({
    url: `${BASE_URL}/remove-from-pool/${poolId}`,
    method: 'post',
    params: { operator }
  })
}

/**
 * 生成涂布排程任务
 * @param {Object} data - 排程数据
 * @returns {Promise}
 */
export function generateCoatingTasks(data) {
  return request({
    url: `${BASE_URL}/generate-tasks`,
    method: 'post',
    data
  })
}

/**
 * 获取涂布排程队列
 * @param {Object} params - 查询参数
 * @returns {Promise}
 */
export function getCoatingQueue(params) {
  return request({
    url: `${BASE_URL}/queue`,
    method: 'get',
    params
  })
}

/**
 * 获取涂布合并记录
 * @param {Object} params - 查询参数
 * @returns {Promise}
 */
export function getCoatingMergeRecords(params) {
  return request({
    url: `${BASE_URL}/merge-records`,
    method: 'get',
    params
  })
}

/**
 * 调整涂布任务时间
 * @param {Number} taskId - 任务ID
 * @param {Object} data - 时间数据
 * @returns {Promise}
 */
export function adjustCoatingTaskTime(taskId, data) {
  return request({
    url: `${BASE_URL}/adjust-time/${taskId}`,
    method: 'post',
    data
  })
}

/**
 * 调整涂布任务涂布量
 * @param {Number} taskId - 任务ID
 * @param {Object} data - { planSqm }
 * @returns {Promise}
 */
export function adjustCoatingTaskQuantity(taskId, data) {
  return request({
    url: `${BASE_URL}/adjust-quantity/${taskId}`,
    method: 'post',
    data
  })
}

/**
 * 获取涂布时间轴数据
 * @param {String} planDate - 计划日期
 * @returns {Promise}
 */
export function getCoatingTimeline(planDate) {
  return request({
    url: `${BASE_URL}/timeline`,
    method: 'get',
    params: { planDate }
  })
}

/**
 * 获取涂布统计数据
 * @returns {Promise}
 */
export function getCoatingStats() {
  return request({
    url: `${BASE_URL}/stats`,
    method: 'get'
  })
}
/**
 * 从待涂布池创建排程
 * @param {Number} poolId - 待涂布池ID
 * @param {Number} equipmentId - 设备ID
 * @param {Number} scheduledStart - 计划开始时间
 * @returns {Promise}
 */
export function createScheduleFromPool(poolId, equipmentId, scheduledStart) {
  return request({
    url: `${BASE_URL}/create-from-pool`,
    method: 'post',
    params: { poolId, equipmentId, scheduledStart }
  })
}

/**
 * 分页查询排程
 * @param {Object} params - 查询参数
 * @returns {Promise}
 */
export function getSchedulePage(params) {
  return request({
    url: `${BASE_URL}/page`,
    method: 'get',
    params
  })
}

/**
 * 检查设备冲突
 * @param {Number} equipmentId - 设备ID
 * @param {Number} startTime - 开始时间
 * @param {Number} endTime - 结束时间
 * @returns {Promise}
 */
export function checkEquipmentConflicts(equipmentId, startTime, endTime) {
  return request({
    url: `${BASE_URL}/check-conflicts`,
    method: 'get',
    params: { equipmentId, startTime, endTime }
  })
}

/**
 * 更新涂布任务设备
 * @param {Object} data { taskId, equipmentId }
 * @returns {Promise}
 */
export function updateCoatingEquipment(data) {
  return request({
    url: `${BASE_URL}/equipment`,
    method: 'post',
    data
  })
}

/**
 * 完成排程
 * @param {Number} scheduleId - 排程ID
 * @param {Number} actualEnd - 实际完成时间
 * @returns {Promise}
 */
export function completeSchedule(scheduleId, actualEnd) {
  return request({
    url: `${BASE_URL}/complete/${scheduleId}`,
    method: 'post',
    params: { actualEnd }
  })
}

/**
 * 取消排程
 * @param {Number} scheduleId - 排程ID
 * @returns {Promise}
 */
export function cancelSchedule(scheduleId) {
  return request({
    url: `${BASE_URL}/cancel/${scheduleId}`,
    method: 'post'
  })
}

/**
 * 获取复卷汇总（后端聚合，按料号+长度）
 */
export function getRewindSummary() {
  return request({
    url: `${BASE_URL}/rewind-summary`,
    method: 'get'
  })
}
