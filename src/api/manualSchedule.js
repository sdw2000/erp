import request from '@/utils/request'

/**
 * 获取待排程订单列表
 */
export function getPendingOrders() {
  return request({
    url: '/schedule/manual/pending-orders',
    method: 'get'
  })
}

/**
 * 获取已完成涂布待复卷的订单列表
 */
export function getCoatingCompletedOrders() {
  return request({
    url: '/schedule/manual/coating-completed-orders',
    method: 'get'
  })
}

/**
 * 匹配库存（先进先出）
 */
export function matchStock(data) {
  return request({
    url: '/schedule/manual/match-stock',
    method: 'post',
    data
  })
}

/**
 * 计算涂布需求
 */
export function calculateCoating(data) {
  return request({
    url: '/schedule/manual/calculate-coating',
    method: 'post',
    data
  })
}

/**
 * 创建手动排程
 */
export function createSchedule(data) {
  return request({
    url: '/schedule/manual/create',
    method: 'post',
    data
  })
}

/**
 * 创建复卷排程
 */
export function createRewindingSchedule(data) {
  return request({
    url: '/schedule/manual/create-rewinding',
    method: 'post',
    data
  })
}

/**
 * 创建涂布排程
 */
export function createCoatingSchedule(data) {
  return request({
    url: '/schedule/manual/create-coating',
    method: 'post',
    data
  })
}

/**
 * 获取涂布排程列表
 */
export function getCoatingSchedules() {
  return request({
    url: '/schedule/manual/coating-schedules',
    method: 'get'
  })
}

/**
 * 确认排程
 */
export function confirmSchedule(data) {
  return request({
    url: '/schedule/manual/confirm',
    method: 'post',
    data
  })
}
