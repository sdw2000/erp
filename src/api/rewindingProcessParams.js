import request from '@/utils/request'

export function getRewindingProcessParamsList(params) {
  return request({
    url: '/production/rewinding-params/list',
    method: 'get',
    params
  })
}

export function getRewindingProcessParams(materialCode, equipmentCode) {
  return request({
    url: '/production/rewinding-params/get',
    method: 'get',
    params: { materialCode, equipmentCode }
  })
}

export function getRewindingProcessParamsById(id) {
  return request({
    url: `/production/rewinding-params/${id}`,
    method: 'get'
  })
}

export function addRewindingProcessParams(data) {
  return request({
    url: '/production/rewinding-params',
    method: 'post',
    data
  })
}

export function updateRewindingProcessParams(id, data) {
  return request({
    url: `/production/rewinding-params/${id}`,
    method: 'put',
    data
  })
}

export function deleteRewindingProcessParams(id) {
  return request({
    url: `/production/rewinding-params/${id}`,
    method: 'delete'
  })
}
