import request from '@/utils/request'

export function getPurchaseStatement(params) {
  return request({
    url: '/purchase/reconciliation/statement',
    method: 'get',
    params
  })
}

export function getPurchaseStatementOverview(params) {
  return request({
    url: '/purchase/reconciliation/overview',
    method: 'get',
    params
  })
}

export function getPurchaseReconciliationHistory(params) {
  return request({
    url: '/purchase/reconciliation/history',
    method: 'get',
    params
  })
}

export function savePurchaseReconciliationHistory(data) {
  return request({
    url: '/purchase/reconciliation/history',
    method: 'post',
    data
  })
}

export function deletePurchaseReconciliationHistory(id) {
  return request({
    url: `/purchase/reconciliation/history/${id}`,
    method: 'delete'
  })
}

export function confirmPurchaseStatementDetails(data) {
  return request({
    url: '/purchase/reconciliation/confirm-details',
    method: 'post',
    data
  })
}
