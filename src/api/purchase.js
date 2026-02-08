import request from '@/utils/request'

export function getPurchaseOrders(params) {
  return request({
    url: '/purchase/orders',
    method: 'get',
    params
  })
}

export function createPurchaseOrder(data) {
  return request({
    url: '/purchase/orders',
    method: 'post',
    data
  })
}

export function updatePurchaseOrder(data) {
  return request({
    url: '/purchase/orders',
    method: 'put',
    data
  })
}

export function deletePurchaseOrder(orderNo) {
  return request({
    url: '/purchase/orders',
    method: 'delete',
    params: { orderNo }
  })
}

export function getPurchaseOrderDetail(orderNo) {
  return request({
    url: `/purchase/orders/${orderNo}`,
    method: 'get'
  })
}

export function downloadPurchaseTemplate() {
  return request({
    url: '/purchase/orders/template',
    method: 'get',
    responseType: 'blob'
  })
}

export function importPurchaseOrders(file) {
  const formData = new FormData()
  formData.append('file', file)
  return request({
    url: '/purchase/orders/import',
    method: 'post',
    data: formData,
    timeout: 120000,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

export function exportPurchaseOrders() {
  return request({
    url: '/purchase/orders/export',
    method: 'get',
    responseType: 'blob'
  })
}
