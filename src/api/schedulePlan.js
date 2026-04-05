import request from '@/utils/request'

/**
 * 获取日排程计划
 */
export function getDailyPlan(date) {
  const params = {}
  if (date) {
    params.date = date
  }
  return request({
    url: '/schedule/plan/daily',
    method: 'get',
    params
  })
}

/**
 * 新增或更新计划
 */
export function upsertPlan(data) {
  return request({
    url: '/schedule/plan/upsert',
    method: 'post',
    data
  })
}

/**
 * 获取涂布计划任务分页（按计划时间升序）
 */
export function getCoatingPlanTaskPage(params) {
  return request({
    url: '/schedule/plan/coating/page',
    method: 'get',
    params
  })
}

/**
 * 获取指定工序计划任务分页（COATING/REWINDING/SLITTING）
 */
export function getStagePlanTaskPage(params) {
  return request({
    url: '/schedule/plan/stage/page',
    method: 'get',
    params
  })
}

/**
 * 订单->母卷 对应关系分页
 */
export function getOrderMaterialRelationPage(params) {
  return request({
    url: '/schedule/plan/relation/order-material/page',
    method: 'get',
    params
  })
}

/**
 * 母卷->订单 对应关系分页
 */
export function getMaterialOrderRelationPage(params) {
  return request({
    url: '/schedule/plan/relation/material-order/page',
    method: 'get',
    params
  })
}

/**
 * 对应关系汇总指标
 */
export function getPlanRelationSummary() {
  return request({
    url: '/schedule/plan/relation/summary',
    method: 'get'
  })
}
