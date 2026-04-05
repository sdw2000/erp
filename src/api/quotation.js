import request from '@/utils/request'

/**
 * 获取所有报价单列表
 */
export function getQuotationList() {
  return request({
    url: '/quotation/list',
    method: 'get',
    timeout: 30000
  })
}

/**
 * 分页获取报价单列表
 */
export function getQuotationPage(params) {
  return request({
    url: '/quotation/page',
    method: 'get',
    params,
    timeout: 30000
  })
}

/**
 * 根据ID获取报价单详情
 */
export function getQuotationDetail(quotationId) {
  return request({
    url: `/quotation/detail/${quotationId}`,
    method: 'get'
  })
}

/**
 * 创建报价单
 */
export function createQuotation(data) {
  return request({
    url: '/quotation/create',
    method: 'post',
    data
  })
}

/**
 * 更新报价单
 */
export function updateQuotation(data) {
  return request({
    url: '/quotation/update',
    method: 'put',
    data
  })
}

export function getQuotationVersionHistory(data) {
  return request({
    url: '/quotation/item-versions',
    method: 'post',
    data
  })
}

/**
 * 删除报价单
 */
export function deleteQuotation(quotationId) {
  return request({
    url: `/quotation/delete/${quotationId}`,
    method: 'delete'
  })
}

/**
 * 导入报价单
 */
export function importQuotation(data) {
  return request({
    url: '/quotation/import',
    method: 'post',
    data,
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

/**
 * 导出报价单
 */
export function exportQuotation(params) {
  return request({
    url: '/quotation/export',
    method: 'get',
    params,
    responseType: 'blob'
  })
}
