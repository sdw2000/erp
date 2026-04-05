import request from '@/utils/request'

export function getSlittingProcessParamsList(params) {
  return request({
    url: '/production/slitting-params/list',
    method: 'get',
    params
  })
}

export function getSlittingProcessParams(totalThickness, processLength, processWidth, equipmentCode) {
  return request({
    url: '/production/slitting-params/get',
    method: 'get',
    params: { totalThickness, processLength, processWidth, equipmentCode }
  })
}

export function getSlittingProcessParamsById(id) {
  return request({
    url: `/production/slitting-params/${id}`,
    method: 'get'
  })
}

export function addSlittingProcessParams(data) {
  return request({
    url: '/production/slitting-params',
    method: 'post',
    data
  })
}

export function updateSlittingProcessParams(id, data) {
  return request({
    url: `/production/slitting-params/${id}`,
    method: 'put',
    data
  })
}

export function deleteSlittingProcessParams(id) {
  return request({
    url: `/production/slitting-params/${id}`,
    method: 'delete'
  })
}
