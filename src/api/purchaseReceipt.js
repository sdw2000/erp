import request from '@/utils/request'

export function listPurchaseReceipts(params) {
  return request({
    url: '/purchase/receipts',
    method: 'get',
    params
  })
}

export function getPurchaseReceiptDetail(id) {
  return request({
    url: `/purchase/receipts/${id}`,
    method: 'get'
  })
}

export function createPurchaseReceipt(data) {
  return request({
    url: '/purchase/receipts',
    method: 'post',
    data
  })
}

export function updatePurchaseReceipt(data) {
  return request({
    url: '/purchase/receipts',
    method: 'put',
    data
  })
}

export function deletePurchaseReceipt(id) {
  return request({
    url: `/purchase/receipts/${id}`,
    method: 'delete'
  })
}
