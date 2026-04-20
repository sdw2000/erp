import request from '@/utils/request'

/**
 * 获取待排程订单列表
 */
export function getPendingOrders(params) {
  return request({
    url: '/schedule/manual/pending-orders/page',
    method: 'get',
    params
  })
}

/**
 * 获取待排程欠料总平米数
 */
export function getPendingOrdersOweArea(params) {
  return request({
    url: '/schedule/manual/pending-orders/owe-area',
    method: 'get',
    params
  })
}

/**
 * 获取待排程订单列表（不分页）
 */
export function getPendingOrdersAll(params) {
  return request({
    url: '/schedule/manual/pending-orders',
    method: 'get',
    params
  })
}

/**
 * 获取已完成涂布待复卷的订单列表
 */
export function getCoatingCompletedOrders(params) {
  return request({
    url: '/schedule/manual/coating-completed-orders/page',
    method: 'get',
    params
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
 * 保存涂布分配明细
 */
export function saveCoatingAllocation(data) {
  return request({
    url: '/schedule/manual/coating-allocation/save',
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
 * 预估涂布机台可用时间
 */
export function getCoatingAvailability(data) {
  return request({
    url: '/schedule/manual/coating-availability',
    method: 'post',
    data
  })
}

/**
 * 预估复卷机台可用时间
 */
export function getRewindingAvailability(data) {
  return request({
    url: '/schedule/manual/rewinding-availability',
    method: 'post',
    data
  })
}

/**
 * 预估分切机台可用时间
 */
export function getSlittingAvailability(data) {
  return request({
    url: '/schedule/manual/slitting-availability',
    method: 'post',
    data
  })
}

/**
 * 获取涂布排程列表
 */
export function getCoatingSchedules(params) {
  return request({
    url: '/schedule/manual/coating-schedules/page',
    method: 'get',
    params
  })
}

/**
 * 获取复卷已排列表
 */
export function getRewindingSchedules(params) {
  return request({
    url: '/schedule/manual/rewinding-schedules/page',
    method: 'get',
    params
  })
}

/**
 * 获取分切已排列表
 */
export function getSlittingSchedules(params) {
  return request({
    url: '/schedule/manual/slitting-schedules/page',
    method: 'get',
    params
  })
}

/**
 * 更新分切/包装日期
 */
export function updateSlittingSchedule(data) {
  return request({
    url: '/schedule/manual/update-slitting',
    method: 'post',
    data
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

/**
 * 终止排程（保留已开工，回滚未开工）
 */
export function terminateSchedule(data) {
  return request({
    url: '/schedule/manual/terminate',
    method: 'post',
    data
  })
}

/**
 * 排程减量（仅减少未开工部分）
 */
export function reduceSchedule(data) {
  return request({
    url: '/schedule/manual/reduce',
    method: 'post',
    data
  })
}

/**
 * 清空排程并重排（按订单明细）
 */
export function resetScheduleByOrderDetail(data) {
  return request({
    url: '/schedule/manual/reset-by-order-detail',
    method: 'post',
    data
  })
}

/**
 * 清空单条排程（按排程ID）
 */
export function resetScheduleBySchedule(data) {
  return request({
    url: '/schedule/manual/reset-by-schedule',
    method: 'post',
    data
  })
}

/**
 * 工序报工
 */
export function reportWork(data) {
  return request({
    url: '/schedule/manual/report-work',
    method: 'post',
    data
  })
}

/**
 * 查询工序报工明细
 */
export function getReportWorkList(params) {
  return request({
    url: '/schedule/manual/report-work/list',
    method: 'get',
    params
  })
}

/**
 * 更新工序报工记录
 */
export function updateReportWork(data) {
  return request({
    url: '/schedule/manual/report-work/update',
    method: 'post',
    data
  })
}

/**
 * 删除工序报工记录
 */
export function deleteReportWork(data) {
  return request({
    url: '/schedule/manual/report-work/delete',
    method: 'post',
    data
  })
}

/**
 * 查询订单的涂布母卷锁定明细
 */
export function getCoatingRollLocks(params) {
  return request({
    url: '/schedule/manual/report-work/coating-roll-locks',
    method: 'get',
    params
  })
}

/**
 * 查询工序领料明细
 */
export function getProcessMaterialIssues(params) {
  return request({
    url: '/schedule/manual/report-work/material-issues',
    method: 'get',
    params
  })
}

/**
 * 领料登记（可独立于报工）
 */
export function issueProcessMaterial(data) {
  return request({
    url: '/schedule/manual/report-work/material-issue',
    method: 'post',
    data
  })
}

/**
 * 生成下一个涂布母卷号
 */
export function getNextCoatingRollCode(params) {
  return request({
    url: '/schedule/manual/report-work/next-coating-roll-code',
    method: 'get',
    params
  })
}

/**
 * 按订单明细查询最新排程ID
 */
export function getLatestScheduleId(params) {
  return request({
    url: '/schedule/manual/latest-schedule-id',
    method: 'get',
    params
  })
}

/**
 * 获取急单抢占保护参数
 */
export function getUrgentPreemptConfig() {
  return request({
    url: '/schedule/manual/urgent-preempt-config',
    method: 'get'
  })
}

/**
 * 保存急单抢占保护参数
 */
export function saveUrgentPreemptConfig(data) {
  return request({
    url: '/schedule/manual/urgent-preempt-config',
    method: 'post',
    data
  })
}

/**
 * 急单抢料（先锁可用库存，不足再抢占低优先级未消耗锁定）
 */
export function urgentLock(data) {
  return request({
    url: '/schedule/manual/urgent-lock',
    method: 'post',
    data
  })
}

/**
 * 批量查询订单明细齐套状态
 */
export function getOrderItemsReadiness(data) {
  return request({
    url: '/api/production/readiness/order-items/batch',
    method: 'post',
    data
  })
}
