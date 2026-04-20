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
  return request({
    url: '/sales/reconciliation/history/import',
    method: 'post',
    params: { customerCode },
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
