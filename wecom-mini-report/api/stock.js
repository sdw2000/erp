const request = require('../utils/request')

function toQuery(params = {}) {
  const pairs = Object.keys(params)
    .filter(key => params[key] !== undefined && params[key] !== null && `${params[key]}` !== '')
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
  return pairs.length ? `?${pairs.join('&')}` : ''
}

function getTapeStockList(data) {
  return request({
    url: '/api/tape-stock/list',
    method: 'GET',
    data
  })
}

function getOutboundList(data) {
  return request({
    url: '/api/tape-stock/outbound/list',
    method: 'GET',
    data
  })
}

function createOutboundRequest(data) {
  return request({
    url: '/api/tape-stock/outbound',
    method: 'POST',
    data
  })
}

function getInboundList(data) {
  return request({
    url: '/api/tape-stock/inbound/list',
    method: 'GET',
    data
  })
}

function createInboundRequest(data) {
  return request({
    url: '/api/tape-stock/inbound',
    method: 'POST',
    data
  })
}

function approveInbound(id, data) {
  const query = toQuery(data)
  return request({
    url: `/api/tape-stock/inbound/${id}/approve${query}`,
    method: 'POST'
  })
}

function cancelInbound(id) {
  return request({
    url: `/api/tape-stock/inbound/${id}/cancel`,
    method: 'POST'
  })
}

function stocktakeById(id, data) {
  return request({
    url: `/api/tape-stock/${id}/stocktake`,
    method: 'POST',
    data
  })
}

function getInboundScanDocuments(data) {
  return request({
    url: '/api/tape-stock/inbound/scan/documents',
    method: 'GET',
    data
  })
}

function getInboundScanDocument(data) {
  return request({
    url: '/api/tape-stock/inbound/scan/document',
    method: 'GET',
    data
  })
}

function submitInboundScan(data) {
  return request({
    url: '/api/tape-stock/inbound/scan/submit',
    method: 'POST',
    data
  })
}

module.exports = {
  getTapeStockList,
  getOutboundList,
  createOutboundRequest,
  getInboundList,
  createInboundRequest,
  approveInbound,
  cancelInbound,
  stocktakeById,
  getInboundScanDocuments,
  getInboundScanDocument,
  submitInboundScan
}
