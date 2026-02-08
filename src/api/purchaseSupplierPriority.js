import request from '@/utils/request'

export function listSupplierPriority(params) {
  return request({
    url: '/purchase/supplier-priority',
    method: 'get',
    params
  })
}

export function createSupplierPriority(data) {
  return request({
    url: '/purchase/supplier-priority',
    method: 'post',
    data
  })
}

export function updateSupplierPriority(data) {
  return request({
    url: '/purchase/supplier-priority',
    method: 'put',
    data
  })
}

export function deleteSupplierPriority(id) {
  return request({
    url: `/purchase/supplier-priority/${id}`,
    method: 'delete'
  })
}
