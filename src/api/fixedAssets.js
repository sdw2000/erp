import request from '@/utils/request'

export function listFixedAssets(params) {
  return request({ url: '/finance/fixed-assets/list', method: 'get', params })
}

export function getFixedAsset(id) {
  return request({ url: `/finance/fixed-assets/${id}`, method: 'get' })
}

export function createFixedAsset(data) {
  return request({ url: '/finance/fixed-assets', method: 'post', data })
}

export function updateFixedAsset(id, data) {
  return request({ url: `/finance/fixed-assets/${id}`, method: 'put', data })
}

export function depreciateFixedAsset(data) {
  return request({ url: '/finance/fixed-assets/depreciate', method: 'post', data })
}

export function batchDepreciateFixedAssets(data) {
  return request({ url: '/finance/fixed-assets/depreciate/batch', method: 'post', data })
}

export function listDepreciations(id) {
  return request({ url: `/finance/fixed-assets/${id}/depreciations`, method: 'get' })
}

export function disposeFixedAsset(id, data) {
  return request({ url: `/finance/fixed-assets/${id}/dispose`, method: 'post', data })
}

export function getFixedAssetReportSummary(params) {
  return request({ url: '/finance/fixed-assets/report/summary', method: 'get', params })
}

export function getFixedAssetReportLedger(params) {
  return request({ url: '/finance/fixed-assets/report/ledger', method: 'get', params })
}

export function exportFixedAssetReport(params) {
  return request({
    url: '/finance/fixed-assets/report/export',
    method: 'get',
    params,
    responseType: 'blob',
    returnRawResponse: true
  })
}
