import request from '@/utils/request'

export function listInvoices(params) {
  return request({ url: '/finance/ar/invoices', method: 'get', params })
}

export function listUnpaidDetails(params) {
  return request({ url: '/finance/ar/unpaid-details', method: 'get', params })
}

export function getInvoice(id) {
  return request({ url: `/finance/ar/invoice/${id}`, method: 'get' })
}

export function createInvoice(data) {
  return request({ url: '/finance/ar/invoice', method: 'post', data })
}

export function createAndPostInvoice(data) {
  return request({ url: '/finance/ar/invoice/post', method: 'post', data })
}

export function listReceipts(params) {
  return request({ url: '/finance/ar/receipts', method: 'get', params })
}

export function createReceipt(data) {
  return request({ url: '/finance/ar/receipt', method: 'post', data })
}

export function reconcileReceipt(id) {
  return request({ url: `/finance/ar/receipt/${id}/reconcile`, method: 'post' })
}

export function reconcileReceiptHistory(id, data) {
  return request({ url: `/finance/ar/receipt/${id}/reconcile-history`, method: 'post', data })
}

export function reverseReceipt(id) {
  return request({ url: `/finance/ar/receipt/${id}/reverse`, method: 'post' })
}

export function updateReceipt(data) {
  return request({ url: '/finance/ar/receipt', method: 'put', data })
}

export function deleteReceipt(id) {
  return request({ url: `/finance/ar/receipt/${id}`, method: 'delete' })
}

export function searchArCustomers(params) {
  return request({ url: '/finance/ar/customers', method: 'get', params })
}
