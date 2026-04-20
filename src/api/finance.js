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
