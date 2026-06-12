import request from '@/utils/request'

/**
 * 生产管理 - 任务查询
 */
export function getProductionTasks(params) {
  return request({
    url: '/api/production/management/tasks',
    method: 'get',
    params
  })
}

export function updateCoatingActualTimes(id, data) {
  return request({
    url: `/api/production/management/coating/${id}/actual-times`,
    method: 'post',
    data
  })
}

/**
 * 获取分切样板单任务列表
 */
export function getSlittingSampleTasks(params) {
  return request({
    url: '/api/production/management/slitting-sample-tasks',
    method: 'get',
    params
  })
}

/**
 * 确保样板明细有可报工的排程ID
 */
export function ensureSlittingSampleSchedule(data) {
  return request({
    url: '/api/production/management/slitting-sample-tasks/ensure-schedule',
    method: 'post',
    data
  })
}
