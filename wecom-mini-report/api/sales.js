const request = require('../utils/request')

function getSalesOrders(data) {
  return request({
    url: '/sales/orders',
    method: 'GET',
    data
  })
}

function createSalesOrder(data) {
  return request({
    url: '/sales/orders',
    method: 'POST',
    data
  })
}

function getSalesOrderDetail(orderNo) {
  return request({
    url: `/sales/orders/${encodeURIComponent(orderNo)}`,
    method: 'GET'
  })
}

function generateSalesOrderNo(data) {
  return request({
    url: '/sales/orders/generate-no',
    method: 'GET',
    data
  })
}

function getCustomerList(data) {
  return request({
    url: '/api/sales/customers',
    method: 'GET',
    data
  })
}

function getEnabledSpecs(data) {
  return request({
    url: '/api/tape-spec/enabled',
    method: 'GET',
    data
  })
}

function getOrderHistorySpecs(data) {
  return request({
    url: '/sales/orders/history-specs',
    method: 'GET',
    data
  })
}

function getOrderRemarkHistory(data) {
  return request({
    url: '/sales/orders/remark-history',
    method: 'GET',
    data
  })
}

function getQuotationList(data) {
  return request({
    url: '/quotation/list',
    method: 'GET',
    data
  })
}

function createSampleOrder(data) {
  return request({
    url: '/api/sales/samples',
    method: 'POST',
    data
  })
}

function generateSampleNo() {
  return request({
    url: '/api/sales/samples/generate-no',
    method: 'GET'
  })
}

function createDeliveryNotice(data) {
  return request({
    url: '/delivery/create',
    method: 'POST',
    data
  })
}

function getDeliveryNotices(data) {
  return request({
    url: '/delivery/list',
    method: 'GET',
    data
  })
}

module.exports = {
  getSalesOrders,
  createSalesOrder,
  getSalesOrderDetail,
  generateSalesOrderNo,
  getCustomerList,
  getEnabledSpecs,
  getOrderHistorySpecs,
  getOrderRemarkHistory,
  getQuotationList,
  createSampleOrder,
  generateSampleNo,
  createDeliveryNotice,
  getDeliveryNotices
}
