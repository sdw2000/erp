import request from '@/utils/request'

export function getCustomerMaterialMappingPage(params) {
  return request({
    url: '/sales/customer-material-mapping/page',
    method: 'get',
    params
  })
}

export function getAllCustomerMaterialMappings(params) {
  return request({
    url: '/sales/customer-material-mapping/all',
    method: 'get',
    params
  })
}

export function saveCustomerMaterialMapping(data) {
  return request({
    url: '/sales/customer-material-mapping',
    method: 'post',
    data
  })
}

export function batchSaveCustomerMaterialMappings(data) {
  return request({
    url: '/sales/customer-material-mapping/batch-save',
    method: 'post',
    data
  })
}

export function deleteCustomerMaterialMapping(id) {
  return request({
    url: `/sales/customer-material-mapping/${id}`,
    method: 'delete'
  })
}

export function matchCustomerMaterialMapping(params) {
  return request({
    url: '/sales/customer-material-mapping/match',
    method: 'get',
    params
  })
}

export function initCustomerMaterialMappingsFromHistory(data) {
  return request({
    url: '/sales/customer-material-mapping/init-from-history',
    method: 'post',
    data
  })
}
