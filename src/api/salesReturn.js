import request from '@/utils/request'

export function getSalesReturns(params) {
  return request({
    url: '/sales/returns',
    method: 'get',
    params
  })
}

export function createSalesReturn(data) {
  return request({
    url: '/sales/returns',
    method: 'post',
    data
  })
}

export function updateSalesReturn(data) {
  return request({
    url: '/sales/returns',
    method: 'put',
    data
  })
}

export function deleteSalesReturn(returnNo) {
  return request({
    url: '/sales/returns',
    method: 'delete',
    params: { returnNo }
  })
}

export function getSalesReturnDetail(returnNo) {
  return request({
    url: `/sales/returns/${returnNo}`,
    method: 'get'
  })
}

export function generateSalesReturnNo(params) {
  return request({
    url: '/sales/returns/generate-no',
    method: 'get',
    params
  })
}

export function getSalesReturnReconciliationSummary(month) {
  return request({
    url: '/sales/returns/reconciliation',
    method: 'get',
    params: { month }
  })
}

export function getReturnableOrderItems(params) {
  return request({
    url: '/sales/returns/order-items',
    method: 'get',
    params
  })
}

export function getSalesReturnAuditLogs(params) {
  return request({
    url: '/sales/returns/audit-logs',
    method: 'get',
    params
  })
}

export function createInboundRequestsFromReturn(returnNo) {
  return request({
    url: `/sales/returns/${encodeURIComponent(returnNo)}/create-inbound-requests`,
    method: 'post'
  })
}
