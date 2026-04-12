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

export function batchSaveLabelPrintConfigs(data, params) {
  return request({
    url: '/basic-data/label-print-config/batch-save',
    method: 'post',
    data,
    params
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

export function getTemplatePreviewSamples() {
  return request({
    url: '/basic-data/label-print-config/template-preview-samples',
    method: 'get'
  })
}

export function saveTemplatePreviewSamples(data) {
  return request({
    url: '/basic-data/label-print-config/template-preview-samples',
    method: 'post',
    data
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

// 按模板获取打印渲染数据
export function getPrintTemplateData(params) {
  return request({
    url: '/basic-data/label-print-config/template-data',
    method: 'get',
    params
  })
}

// 每模板独立查询接口：销售合同
export function getSalesContractPrintTemplateData(templateKey, orderNo) {
  return request({
    url: `/basic-data/label-print-config/template-data/sales-contract/${encodeURIComponent(templateKey)}`,
    method: 'get',
    params: { orderNo }
  })
}

// 每模板独立查询接口：发货通知
export function getDeliveryPrintTemplateData(templateKey, noticeId) {
  return request({
    url: `/basic-data/label-print-config/template-data/delivery-notice/${encodeURIComponent(templateKey)}`,
    method: 'get',
    params: { noticeId }
  })
}
