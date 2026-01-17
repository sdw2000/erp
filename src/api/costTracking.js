import request from '@/utils/request'

/**
 * 成本核算追溯 API
 */

/**
 * 获取订单成本追溯信息
 * @param {Number} orderId - 订单ID
 * @returns {Promise}
 */
export function getOrderCostTracking(orderId) {
  return request({
    url: `/api/production/cost-tracking/order/${orderId}`,
    method: 'get'
  })
}

/**
 * 获取订单物料成本明细
 * @param {Number} orderId - 订单ID
 * @returns {Promise}
 */
export function getOrderMaterialCost(orderId) {
  return request({
    url: `/api/production/cost-tracking/material-cost/${orderId}`,
    method: 'get'
  })
}

/**
 * 获取订单工序成本明细
 * @param {Number} orderId - 订单ID
 * @returns {Promise}
 */
export function getOrderProcessCost(orderId) {
  return request({
    url: `/api/production/cost-tracking/process-cost/${orderId}`,
    method: 'get'
  })
}

/**
 * 获取订单全流程追溯
 * @param {Number} orderId - 订单ID
 * @returns {Promise}
 */
export function getOrderFullTracking(orderId) {
  return request({
    url: `/api/production/cost-tracking/full-tracking/${orderId}`,
    method: 'get'
  })
}

/**
 * 导出订单成本报表
 * @param {Number} orderId - 订单ID
 * @returns {Promise}
 */
export function exportOrderCostReport(orderId) {
  return request({
    url: `/api/production/cost-tracking/export/${orderId}`,
    method: 'get',
    responseType: 'blob'
  })
}

/**
 * 获取批量订单成本汇总
 * @param {Array} orderIds - 订单ID数组
 * @returns {Promise}
 */
export function getBatchOrderCostSummary(orderIds) {
  return request({
    url: '/api/production/cost-tracking/batch-summary',
    method: 'post',
    data: { orderIds }
  })
}

/**
 * 获取成本分析报表
 * @param {Object} params - 查询参数
 * @returns {Promise}
 */
export function getCostAnalysisReport(params) {
  return request({
    url: '/api/production/cost-tracking/analysis',
    method: 'get',
    params
  })
}
/**
 * 初始化订单成本追溯
 * @param {Number} orderId - 订单ID
 * @returns {Promise}
 */
export function initializeCostTracking(orderId) {
  return request({
    url: `/api/production/cost-tracking/initialize/${orderId}`,
    method: 'post'
  })
}

/**
 * 更新物料成本
 * @param {Number} orderId - 订单ID
 * @param {Number} cost - 成本金额
 * @returns {Promise}
 */
export function updateMaterialCost(orderId, cost) {
  return request({
    url: `/api/production/cost-tracking/update-material-cost/${orderId}`,
    method: 'post',
    params: { cost }
  })
}

/**
 * 更新分切成本
 * @param {Number} orderId - 订单ID
 * @param {Number} cost - 成本金额
 * @returns {Promise}
 */
export function updateSlittingCost(orderId, cost) {
  return request({
    url: `/api/production/cost-tracking/update-slitting-cost/${orderId}`,
    method: 'post',
    params: { cost }
  })
}

/**
 * 更新涂布成本
 * @param {Number} orderId - 订单ID
 * @param {Number} cost - 成本金额
 * @returns {Promise}
 */
export function updateCoatingCost(orderId, cost) {
  return request({
    url: `/api/production/cost-tracking/update-coating-cost/${orderId}`,
    method: 'post',
    params: { cost }
  })
}

/**
 * 更新人工成本
 * @param {Number} orderId - 订单ID
 * @param {Number} cost - 成本金额
 * @returns {Promise}
 */
export function updateLaborCost(orderId, cost) {
  return request({
    url: `/api/production/cost-tracking/update-labor-cost/${orderId}`,
    method: 'post',
    params: { cost }
  })
}

/**
 * 完成成本汇总
 * @param {Number} orderId - 订单ID
 * @param {Number} finishedQty - 完成数量
 * @returns {Promise}
 */
export function completeCostTracking(orderId, finishedQty) {
  return request({
    url: `/api/production/cost-tracking/complete/${orderId}`,
    method: 'post',
    params: { finishedQty }
  })
}

/**
 * 分页查询成本追溯
 * @param {Object} params - 查询参数
 * @returns {Promise}
 */
export function getCostTrackingPage(params) {
  return request({
    url: '/api/production/cost-tracking/page',
    method: 'get',
    params
  })
}

/**
 * 获取订单成本详情
 * @param {Number} orderId - 订单ID
 * @returns {Promise}
 */
export function getOrderCostDetail(orderId) {
  return request({
    url: `/api/production/cost-tracking/detail/${orderId}`,
    method: 'get'
  })
}