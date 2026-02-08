import request from '@/utils/request'

export function listPurchaseQuotations(params) {
  return request({
    url: '/purchase/quotations',
    method: 'get',
    params
  })
}

export function getPurchaseQuotationDetail(id) {
  return request({
    url: `/purchase/quotations/${id}`,
    method: 'get'
  })
}

export function createPurchaseQuotation(data) {
  return request({
    url: '/purchase/quotations',
    method: 'post',
    data
  })
}

export function updatePurchaseQuotation(data) {
  return request({
    url: '/purchase/quotations',
    method: 'put',
    data
  })
}

export function deletePurchaseQuotation(id) {
  return request({
    url: `/purchase/quotations/${id}`,
    method: 'delete'
  })
}
