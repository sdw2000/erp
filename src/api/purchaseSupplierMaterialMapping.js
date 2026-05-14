import request from '@/utils/request'

export function getPurchaseSupplierMaterialMappingPage(params) {
  return request({
    url: '/purchase/supplier-material-mapping/page',
    method: 'get',
    params
  })
}

export function getAllPurchaseSupplierMaterialMappings(params) {
  return request({
    url: '/purchase/supplier-material-mapping/all',
    method: 'get',
    params
  })
}

export function savePurchaseSupplierMaterialMapping(data) {
  return request({
    url: '/purchase/supplier-material-mapping',
    method: 'post',
    data
  })
}

export function deletePurchaseSupplierMaterialMapping(id) {
  return request({
    url: `/purchase/supplier-material-mapping/${id}`,
    method: 'delete'
  })
}

export function matchPurchaseSupplierMaterialMapping(params) {
  return request({
    url: '/purchase/supplier-material-mapping/match',
    method: 'get',
    params
  })
}
