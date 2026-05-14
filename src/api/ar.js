import request from '@/utils/request'

export function listInvoices(params) {
  return request({ url: '/finance/ar/invoices', method: 'get', params })
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
