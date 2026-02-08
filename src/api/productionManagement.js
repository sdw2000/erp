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
