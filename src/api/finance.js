import request from '@/utils/request'

export function getCoatingCostAccounting(params) {
  return request({
    url: '/finance/cost-accounting/coating',
    method: 'get',
    params
  })
}

export function getCoatingCostSummary(params) {
  return request({
    url: '/finance/cost-accounting/coating-summary',
    method: 'get',
    params
  })
}

export function getFormulaTheoreticalCost(params) {
  return request({
    url: '/finance/cost-accounting/formula-theoretical',
    method: 'get',
    params
  })
}

export function getFormulaCostFactor(params) {
  return request({
    url: '/finance/cost-accounting/formula-factor',
    method: 'get',
    params
  })
}

export function saveFormulaCostFactor(data) {
  return request({
    url: '/finance/cost-accounting/formula-factor',
    method: 'post',
    data
  })
}

export function getMaterialCostConfigPage(params) {
  return request({
    url: '/finance/cost-accounting/material-config',
    method: 'get',
    params
  })
}

export function saveMaterialCostConfig(data) {
  return request({
    url: '/finance/cost-accounting/material-config',
    method: 'post',
    data
  })
}

export function getProductionCostMvpPage(params) {
  return request({
    url: '/finance/cost-accounting/production-mvp/page',
    method: 'get',
    params
  })
}

export function getProductionCostMvpDetail(params) {
  return request({
    url: '/finance/cost-accounting/production-mvp/detail',
    method: 'get',
    params
  })
}

export function getMonthlyBasicConfig(params) {
  return request({
    url: '/finance/basic-config/monthly',
    method: 'get',
    params
  })
}

export function saveMonthlyBasicConfig(data) {
  return request({
    url: '/finance/basic-config/monthly',
    method: 'post',
    data
  })
}

export function getSalaryPage(params) {
  return request({
    url: '/finance/salary/page',
    method: 'get',
    params
  })
}

export function saveSalaryRecord(data) {
  return request({
    url: '/finance/salary',
    method: 'post',
    data
  })
}

export function deleteSalaryRecord(id) {
  return request({
    url: `/finance/salary/${id}`,
    method: 'delete'
  })
}

export function getBankLedgerPage(params) {
  return request({
    url: '/finance/bank-ledger/page',
    method: 'get',
    params
  })
}

export function saveBankLedger(data) {
  return request({
    url: '/finance/bank-ledger',
    method: 'post',
    data
  })
}

export function pushBankLedgerToKingdee(id) {
  return request({
    url: `/finance/bank-ledger/kingdee/push/${id}`,
    method: 'post'
  })
}

export function getKingdeeTemplate() {
  return request({
    url: '/finance/bank-ledger/kingdee/template',
    method: 'get'
  })
}

export function recalcInventoryPrice(params) {
  return request({
    url: '/finance/cost-accounting/inventory-price/recalc',
    method: 'post',
    params
  })
}

export function initInventoryPriceSync(params) {
  return request({
    url: '/finance/cost-accounting/inventory-price/init-sync',
    method: 'post',
    params
  })
}

export function getInventoryPriceLatest(params) {
  return request({
    url: '/finance/cost-accounting/inventory-price/latest',
    method: 'get',
    params
  })
}

export function getInventoryPriceChange(params) {
  return request({
    url: '/finance/cost-accounting/inventory-price/change',
    method: 'get',
    params
  })
}

export function exportInventoryPriceLatest(params) {
  return request({
    url: '/finance/cost-accounting/inventory-price/latest/export',
    method: 'get',
    params,
    responseType: 'blob'
  })
}

export function exportInventoryPriceChange(params) {
  return request({
    url: '/finance/cost-accounting/inventory-price/change/export',
    method: 'get',
    params,
    responseType: 'blob'
  })
}

export function importInventoryPriceLatest(fileOrFormData) {
  const formData = fileOrFormData instanceof FormData ? fileOrFormData : new FormData()
  if (!(fileOrFormData instanceof FormData)) {
    formData.append('file', fileOrFormData)
  }
  return request({
    url: '/finance/cost-accounting/inventory-price/latest/import',
    method: 'post',
    data: formData,
    timeout: 600000
  })
}

export function importInventoryPriceChange(fileOrFormData) {
  const formData = fileOrFormData instanceof FormData ? fileOrFormData : new FormData()
  if (!(fileOrFormData instanceof FormData)) {
    formData.append('file', fileOrFormData)
  }
  return request({
    url: '/finance/cost-accounting/inventory-price/change/import',
    method: 'post',
    data: formData,
    timeout: 600000
  })
}
