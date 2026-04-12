import request from '@/utils/request'

export function getSalesReconciliationStatement(params) {
  return request({
    url: '/sales/reconciliation/statement',
    method: 'get',
    params
  })
}

export function getSalesReconciliationHistory(params) {
  return request({
    url: '/sales/reconciliation/history',
    method: 'get',
    params
  })
}

export function saveSalesReconciliationHistory(data) {
  return request({
    url: '/sales/reconciliation/history',
    method: 'post',
    data
  })
}

export function deleteSalesReconciliationHistory(id) {
  return request({
    url: `/sales/reconciliation/history/${id}`,
    method: 'delete'
  })
}

export function confirmSalesReconciliationDetails(data) {
  return request({
    url: '/sales/reconciliation/confirm-details',
    method: 'post',
    data
  })
}
