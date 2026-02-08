import request from '@/utils/request'

export function listSuppliers(params) {
  return request({
    url: '/purchase/suppliers',
    method: 'get',
    params
  })
}

export function createSupplier(data) {
  return request({
    url: '/purchase/suppliers',
    method: 'post',
    data
  })
}

export function updateSupplier(data) {
  return request({
    url: '/purchase/suppliers',
    method: 'put',
    data
  })
}

export function deleteSupplier(id) {
  return request({
    url: `/purchase/suppliers/${id}`,
    method: 'delete'
  })
}

export function getSupplierDetail(id) {
  return request({
    url: `/purchase/suppliers/${id}`,
    method: 'get'
  })
}
