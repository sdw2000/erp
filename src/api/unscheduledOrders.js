import request from '@/utils/request'

/**
 * 未排程订单 API
 */

/**
 * 分页查询未排程订单
 * @param {Object} params - 查询参数
 * @returns {Promise}
 */
export function getUnscheduledOrdersPage(params) {
  return request({
    url: '/api/production/unscheduled-orders/page',
    method: 'get',
    params
  })
}

/**
 * 获取未排程订单详情
 * @param {Number} orderId - 订单ID
 * @returns {Promise}
 */
export function getUnscheduledOrderDetail(orderId) {
  return request({
    url: `/api/production/unscheduled-orders/${orderId}/detail`,
    method: 'get'
  })
}

/**
 * 获取订单物料缺口列表
 * @param {Number} orderId - 订单ID
 * @returns {Promise}
 */
export function getOrderShortages(orderId) {
  return request({
    url: `/api/production/unscheduled-orders/${orderId}/shortages`,
    method: 'get'
  })
}

/**
 * 获取可用的源物料(用于复卷分切)
 * @param {Number} orderId - 订单ID
 * @returns {Promise}
 */
export function getAvailableSourceMaterials(orderId) {
  return request({
    url: `/api/production/unscheduled-orders/${orderId}/source-materials`,
    method: 'get'
  })
}

/**
 * 获取未排程订单统计
 * @returns {Promise}
 */
export function getUnscheduledOrdersStats() {
  return request({
    url: '/api/production/unscheduled-orders/stats',
    method: 'get'
  })
}

/**
 * 订单进入待排程池(库存充足)
 * @param {Number} orderId - 订单ID
 * @param {String} operator - 操作人
 * @returns {Promise}
 */
export function enterCoatingPool(orderId, operator) {
  return request({
    url: `/api/production/unscheduled-orders/${orderId}/enter-pool`,
    method: 'post',
    params: { operator }
  })
}

/**
 * 批量订单进入待排程池
 * @param {Array} orderIds - 订单ID列表
 * @param {String} operator - 操作人
 * @returns {Promise}
 */
export function batchEnterCoatingPool(orderIds, operator) {
  return request({
    url: '/api/production/unscheduled-orders/batch-enter-pool',
    method: 'post',
    data: orderIds,
    params: { operator }
  })
}

/**
 * 为缺口创建复卷分切任务
 * @param {Number} shortageId - 缺口ID
 * @param {Number} equipmentId - 分切设备ID
 * @param {String} scheduledDate - 计划分切日期
 * @param {String} operator - 操作人
 * @returns {Promise}
 */
export function createSlittingTaskForShortage(shortageId, equipmentId, scheduledDate, operator) {
  return request({
    url: `/api/production/unscheduled-orders/${shortageId}/create-slitting`,
    method: 'post',
    params: { equipmentId, scheduledDate, operator }
  })
}

/**
 * 刷新订单排程状态
 * @param {Number} orderId - 订单ID
 * @returns {Promise}
 */
export function refreshOrderScheduleStatus(orderId) {
  return request({
    url: `/api/production/unscheduled-orders/${orderId}/refresh-status`,
    method: 'post'
  })
}

/**
 * 提高订单优先级
 * @param {Number} orderId - 订单ID
 * @param {Number} increment - 优先级增加值
 * @param {String} operator - 操作人
 * @returns {Promise}
 */
export function increaseOrderPriority(orderId, increment, operator) {
  return request({
    url: `/api/production/unscheduled-orders/${orderId}/increase-priority`,
    method: 'post',
    params: { increment, operator }
  })
}

/**
 * 获取订单排程进度
 * @param {Number} orderId - 订单ID
 * @returns {Promise}
 */
export function getOrderScheduleProgress(orderId) {
  return request({
    url: `/api/production/unscheduled-orders/${orderId}/progress`,
    method: 'get'
  })
}
