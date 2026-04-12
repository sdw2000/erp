import request from '@/utils/request'

/**
 * 客户优先级管理 API
 */

/**
 * 获取订单客户优先级列表
 * @param {Object} params - 查询参数
 * @returns {Promise}
 */
export function getCustomerPriorityList(params) {
  return request({
    url: '/api/production/customer-priority/list',
    method: 'get',
    params
  })
}

/**
 * 批量计算订单客户优先级
 * @param {Array} orderIds - 订单ID数组
 * @returns {Promise}
 */
export function calculatePriority(customerIds) {
  return request({
    url: '/api/production/customer-priority/calculate',
    method: 'post',
    data: { orderIds: customerIds }
  })
}

/**
 * 获取单个订单优先级详情
 * @param {Number} orderId - 订单ID
 * @returns {Promise}
 */
export function getPriorityDetail(orderId) {
  return request({
    url: `/api/production/customer-priority/${orderId}`,
    method: 'get'
  })
}

/**
 * 重新计算所有待排程订单的优先级
 * @returns {Promise}
 */
export function recalculateAllPriorities() {
  return request({
    url: '/api/production/customer-priority/recalculate-all',
    method: 'post',
    timeout: 300000
  })
}

/**
 * 获取客户交易统计
 * @param {Number} customerId - 客户ID
 * @returns {Promise}
 */
export function getCustomerTransactionStats(customerId) {
  return request({
    url: `/api/production/customer-priority/transaction-stats/${customerId}`,
    method: 'get'
  })
}

/**
 * 获取客户料号单价统计
 * @param {Number} customerId - 客户ID
 * @param {String} materialCode - 料号
 * @returns {Promise}
 */
export function getCustomerMaterialPriceStats(customerId, materialCode) {
  return request({
    url: `/api/production/customer-priority/material-price-stats`,
    method: 'get',
    params: { customerId, materialCode }
  })
}
