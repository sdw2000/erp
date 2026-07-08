import request from '@/utils/request'

export function getMaterialConfigList(params) {
  return request({
    url: '/api/material-config/list',
    method: 'get',
    params
  })
}

export function getMaterialConfigById(id) {
  return request({
    url: `/api/material-config/${id}`,
    method: 'get'
  })
}

export function saveMaterialConfig(data) {
  const isUpdate = !!data.id
  return request({
    url: isUpdate ? '/api/material-config/update' : '/api/material-config/create',
    method: isUpdate ? 'put' : 'post',
    data
  })
}

export function deleteMaterialConfig(id) {
  return request({
    url: `/api/material-config/delete/${id}`,
    method: 'delete'
  })
}

export function batchImportMaterialConfig(data) {
  return request({
    url: '/api/material-config/batch-import',
    method: 'post',
    data
  })
}
