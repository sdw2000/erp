import request from '@/utils/request'

export function listPurchaseReturns(params) {
  return request({
    url: '/purchase/returns',
    method: 'get',
    params
  })
}

export function getPurchaseReturnDetail(id) {
  return request({
    url: `/purchase/returns/${id}`,
    method: 'get'
  })
}

export function createPurchaseReturn(data) {
  return request({
    url: '/purchase/returns',
    method: 'post',
    data
  })
}

export function updatePurchaseReturn(data) {
  return request({
    url: '/purchase/returns',
    method: 'put',
    data
  })
}

export function deletePurchaseReturn(id) {
  return request({
    url: `/purchase/returns/${id}`,
    method: 'delete'
  })
}
