import request from '@/utils/request'

/**
 * 胶带库存管理API
 */

// ============= 库存管理 =============

// 分页查询库存
export function getStockList(params) {
  return request({
    url: '/api/tape-stock/list',
    method: 'get',
    params
  })
}

// 按料号汇总库存
export function getStockSummary() {
  return request({
    url: '/api/tape-stock/summary',
    method: 'get'
  })
}

// 根据料号查询所有批次（FIFO排序）
export function getStockByMaterial(materialCode) {
  return request({
    url: `/api/tape-stock/by-material/${materialCode}`,
    method: 'get'
  })
}

// 根据ID查询库存详情
export function getStockById(id) {
  return request({
    url: `/api/tape-stock/${id}`,
    method: 'get'
  })
}

// 导入Excel库存数据
export function importStock(file) {
  const formData = new FormData()
  formData.append('file', file)
  return request({
    url: '/api/tape-stock/import',
    method: 'post',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

// 导出库存数据（带token下载）
export function exportStock(params = {}) {
  return request({
    url: '/api/tape-stock/export',
    method: 'get',
    params,
    responseType: 'blob'
  })
}

// 下载导入模板（带token下载）
export function downloadTemplate() {
  return request({
    url: '/api/tape-stock/template',
    method: 'get',
    responseType: 'blob'
  })
}

// ============= 入库申请 =============

// 分页查询入库申请
export function getInboundList(params) {
  return request({
    url: '/api/tape-stock/inbound/list',
    method: 'get',
    params
  })
}

// 创建入库申请
export function createInboundRequest(data) {
  return request({
    url: '/api/tape-stock/inbound',
    method: 'post',
    data
  })
}

// 审批入库申请
export function approveInbound(id, approved, auditor, auditRemark) {
  return request({
    url: `/api/tape-stock/inbound/${id}/approve`,
    method: 'post',
    params: { approved, auditor, auditRemark }
  })
}

// 取消入库申请
export function cancelInbound(id) {
  return request({
    url: `/api/tape-stock/inbound/${id}/cancel`,
    method: 'post'
  })
}

// 待审批入库数量
export function countPendingInbound() {
  return request({
    url: '/api/tape-stock/inbound/pending-count',
    method: 'get'
  })
}

// ============= 出库申请 =============

// 分页查询出库申请
export function getOutboundList(params) {
  return request({
    url: '/api/tape-stock/outbound/list',
    method: 'get',
    params
  })
}

// 创建出库申请（手动选择批次）
export function createOutboundRequest(data) {
  return request({
    url: '/api/tape-stock/outbound',
    method: 'post',
    data
  })
}

// 创建出库申请（FIFO自动分配）
export function createOutboundRequestFIFO(params) {
  return request({
    url: '/api/tape-stock/outbound/fifo',
    method: 'post',
    params
  })
}

// 审批出库申请
export function approveOutbound(id, approved, auditor, auditRemark) {
  return request({
    url: `/api/tape-stock/outbound/${id}/approve`,
    method: 'post',
    params: { approved, auditor, auditRemark }
  })
}

// 取消出库申请
export function cancelOutbound(id) {
  return request({
    url: `/api/tape-stock/outbound/${id}/cancel`,
    method: 'post'
  })
}

// 待审批出库数量
export function countPendingOutbound() {
  return request({
    url: '/api/tape-stock/outbound/pending-count',
    method: 'get'
  })
}

// ============= 库存流水 =============

// 分页查询库存流水
export function getStockLogList(params) {
  return request({
    url: '/api/tape-stock/log/list',
    method: 'get',
    params
  })
}

// 导出库存流水URL
export function getExportLogUrl(params = {}) {
  const query = new URLSearchParams(params).toString()
  return `/api/tape-stock/log/export${query ? '?' + query : ''}`
}
