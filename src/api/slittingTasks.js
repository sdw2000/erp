// 分切任务相关API
import request from '@/utils/request'

// 获取分切任务列表
export function getSlittingTasks(params) {
  return request({
    url: '/api/production/schedule/slitting/list',
    method: 'get',
    params
  })
}

// 新增分切任务
export function addSlittingTask(data) {
  return request({
    url: '/api/production/schedule/slitting',
    method: 'post',
    data
  })
}

// 更新分切任务
export function updateSlittingTask(data) {
  return request({
    url: `/api/production/schedule/slitting/${data.id}`,
    method: 'put',
    data
  })
}

// 删除分切任务
export function deleteSlittingTask(id) {
  return request({
    url: `/api/production/schedule/slitting/${id}`,
    method: 'delete'
  })
}

// 开始分切任务
export function startSlittingTask(id) {
  return request({
    url: `/api/production/schedule/slitting/${id}/start`,
    method: 'post'
  })
}

// 完成分切任务
export function completeSlittingTask(id) {
  return request({
    url: `/api/production/schedule/slitting/${id}/complete`,
    method: 'post'
  })
}

// 批量操作
export function batchSlittingTasks(ids, action) {
  return request({
    url: '/api/production/schedule/slitting/batch',
    method: 'post',
    data: { ids, action }
  })
}
