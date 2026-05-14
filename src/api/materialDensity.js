import request from '@/utils/request'

export function getMaterialDensityList(params) {
  return request({
    url: '/api/rd/material-density/list',
    method: 'get',
    params
  })
}

export function getMaterialDensityById(id) {
  return request({
    url: `/api/rd/material-density/${id}`,
    method: 'get'
  })
}

export function createMaterialDensity(data) {
  return request({
    url: '/api/rd/material-density',
    method: 'post',
    data
  })
}

export function updateMaterialDensity(data) {
  return request({
    url: '/api/rd/material-density',
    method: 'put',
    data
  })
}

export function deleteMaterialDensity(id) {
  return request({
    url: `/api/rd/material-density/${id}`,
    method: 'delete'
  })
}
