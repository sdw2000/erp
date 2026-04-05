import request from '@/utils/request'

export function getLabelPrintConfigList(params) {
  return request({
    url: '/basic-data/label-print-config/list',
    method: 'get',
    params
  })
}

export function getActiveLabelPrintConfigs() {
  return request({
    url: '/basic-data/label-print-config/active',
    method: 'get'
  })
}

export function batchSaveLabelPrintConfigs(data) {
  return request({
    url: '/basic-data/label-print-config/batch-save',
    method: 'post',
    data
  })
}

// 二期：销售合同打印模板（云端）
export function getSalesContractTemplates() {
  return request({
    url: '/basic-data/label-print-config/sales-contract/templates',
    method: 'get'
  })
}

export function getSalesContractCustomerDefaultTemplate(customerCode) {
  return request({
    url: '/basic-data/label-print-config/sales-contract/default',
    method: 'get',
    params: { customerCode }
  })
}

export function saveSalesContractCustomerDefaultTemplate(data) {
  return request({
    url: '/basic-data/label-print-config/sales-contract/default',
    method: 'post',
    data
  })
}

// 发货通知打印模板（云端）
export function getDeliveryNoticeTemplates() {
  return request({
    url: '/basic-data/label-print-config/delivery-notice/templates',
    method: 'get'
  })
}

export function getDeliveryNoticeCustomerDefaultTemplate(customerCode) {
  return request({
    url: '/basic-data/label-print-config/delivery-notice/default',
    method: 'get',
    params: { customerCode }
  })
}

export function saveDeliveryNoticeCustomerDefaultTemplate(data) {
  return request({
    url: '/basic-data/label-print-config/delivery-notice/default',
    method: 'post',
    data
  })
}

export function getAllDeliveryNoticeTemplates() {
  return request({
    url: '/basic-data/label-print-config/delivery-notice/templates/all',
    method: 'get'
  })
}

export function saveDeliveryNoticeTemplate(data) {
  return request({
    url: '/basic-data/label-print-config/delivery-notice/template',
    method: 'post',
    data
  })
}

export function deleteDeliveryNoticeTemplate(templateKey) {
  return request({
    url: '/basic-data/label-print-config/delivery-notice/template',
    method: 'delete',
    params: { templateKey }
  })
}
