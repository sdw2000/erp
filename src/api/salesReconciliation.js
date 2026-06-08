import request from '@/utils/request'

export function getSalesReconciliationStatement(params) {
  return request({
    url: '/sales/reconciliation/statement',
    method: 'get',
    params
  })
}

export function getSalesReconciliationOverview(params) {
  return request({
    url: '/sales/reconciliation/overview',
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

export function appendUnreconciledSalesReconciliation(params) {
  return request({
    url: '/sales/reconciliation/append-unreconciled',
    method: 'post',
    params
  })
}

export function queryUnreconciledSalesReconciliationCandidates(params) {
  return request({
    url: '/sales/reconciliation/unreconciled-candidates',
    method: 'get',
    params
  })
}

export function removeSalesReconciliationDetail(params) {
  const detailId = params.detailId || params.noticeItemId || params.returnItemId
  return request({
    url: `/sales/reconciliation/statement/detail/${detailId}`,
    method: 'delete',
    params: {
      customerCode: params.customerCode,
      month: params.month,
      bizType: params.bizType
    }
  })
}

export function exportSalesReconciliationStatement(params) {
  return request({
    url: '/sales/reconciliation/export',
    method: 'get',
    params,
    responseType: 'blob'
  })
}

export function importSalesReconciliationHistory(customerCode, fileOrFormData) {
  const formData = fileOrFormData instanceof FormData ? fileOrFormData : new FormData()
  if (!(fileOrFormData instanceof FormData)) {
    formData.append('file', fileOrFormData)
  }
  const params = {}
  if (customerCode) {
    params.customerCode = customerCode
  }
  return request({
    url: '/sales/reconciliation/history/import',
    method: 'post',
    params,
    data: formData,
    timeout: 600000
  })
}

export function initializeSalesReconciliationHistory(data) {
  return request({
    url: '/sales/reconciliation/history/initialize',
    method: 'post',
    data
  })
}

export function rollbackSalesReconciliationFinanceConfirm(params) {
  return request({
    url: '/sales/reconciliation/rollback-finance-confirm',
    method: 'post',
    params
  })
}
