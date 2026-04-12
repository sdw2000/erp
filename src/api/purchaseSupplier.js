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

export function downloadSupplierTemplate() {
  return request({
    url: '/purchase/suppliers/template',
    method: 'get',
    responseType: 'blob'
  })
}

export function importSuppliers(file) {
  const formData = new FormData()
  formData.append('file', file)
  return request({
    url: '/purchase/suppliers/import',
    method: 'post',
    data: formData,
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

export function exportSuppliers(params) {
  return request({
    url: '/purchase/suppliers/export',
    method: 'get',
    params,
    responseType: 'blob'
  })
}
