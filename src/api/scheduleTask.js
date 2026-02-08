import request from '@/utils/request'

export function planScheduleTasks(data) {
  return request({
    url: '/api/production/schedule-task/plan',
    method: 'post',
    data
  })
}

export function getScheduleTaskPage(params) {
  return request({
    url: '/api/production/schedule-task/page',
    method: 'get',
    params
  })
}

export function updateScheduleTaskStatus(id, status) {
  return request({
    url: `/api/production/schedule-task/${id}/status`,
    method: 'post',
    params: { status }
  })
}

export function updateScheduleTaskStatusByOrderItem(orderItemId, status) {
  return request({
    url: '/api/production/schedule-task/status/by-order-item',
    method: 'post',
    params: { orderItemId, status }
  })
}

export function getScheduleEquipments(processType) {
  return request({
    url: '/api/production/schedule-task/equipments',
    method: 'get',
    params: { processType }
  })
}

export function updateScheduleTaskPlan(id, data) {
  return request({
    url: `/api/production/schedule-task/${id}/plan`,
    method: 'post',
    data
  })
}

export function getScheduleBatchDetail(batchId) {
  return request({
    url: `/api/production/schedule-task/batch/${batchId}`,
    method: 'get'
  })
}

export function getAvailableMaterials(params) {
  return request({
    url: '/api/production/preprocessing/available-materials',
    method: 'get',
    params
  })
}

export function lockMaterials(data) {
  return request({
    url: '/api/production/preprocessing/lock-materials',
    method: 'post',
    data
  })
}
