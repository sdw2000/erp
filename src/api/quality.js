import request from '@/utils/request'

// ========== 质检记录接口 ==========

/**
 * 获取质检记录列表
 */
export function getInspectionList(params) {
  return request({
    url: '/api/quality/inspection/list',
    method: 'get',
    params
  })
}

/**
 * 获取质检记录详情
 */
export function getInspectionDetail(id) {
  return request({
    url: `/api/quality/inspection/${id}`,
    method: 'get'
  })
}

/**
 * 添加质检记录
 */
export function addInspection(data) {
  return request({
    url: '/api/quality/inspection',
    method: 'post',
    data
  })
}

/**
 * 更新质检记录
 */
export function updateInspection(id, data) {
  return request({
    url: `/api/quality/inspection/${id}`,
    method: 'put',
    data
  })
}

/**
 * 删除质检记录
 */
export function deleteInspection(id) {
  return request({
    url: `/api/quality/inspection/${id}`,
    method: 'delete'
  })
}

// 新：来料 / 过程 / 出货 检测接口（拆分四页面用）
export function listIncomingInspections(params) {
  return request({ url: '/api/quality/incoming', method: 'get', params })
}

export function listProcessInspections(params) {
  return request({ url: '/api/quality/process', method: 'get', params })
}

export function listOutboundInspections(params) {
  return request({ url: '/api/quality/outbound', method: 'get', params })
}

export function createIncomingInspection(data) {
  return request({ url: '/api/quality/incoming', method: 'post', data })
}

export function createProcessInspection(data) {
  return request({ url: '/api/quality/process', method: 'post', data })
}

export function createOutboundInspection(data) {
  return request({ url: '/api/quality/outbound', method: 'post', data })
}

export function updateIncomingInspection(data) {
  return request({ url: '/api/quality/incoming', method: 'put', data })
}

export function updateProcessInspection(data) {
  return request({ url: '/api/quality/process', method: 'put', data })
}

export function updateOutboundInspection(data) {
  return request({ url: '/api/quality/outbound', method: 'put', data })
}

export function deleteIncomingInspection(id) {
  return request({ url: `/api/quality/incoming/${id}`, method: 'delete' })
}

export function deleteProcessInspection(id) {
  return request({ url: `/api/quality/process/${id}`, method: 'delete' })
}

export function deleteOutboundInspection(id) {
  return request({ url: `/api/quality/outbound/${id}`, method: 'delete' })
}

// ========== 不良品处置接口 ==========

export function getDispositionList(params) {
  return request({ url: '/api/quality/disposition', method: 'get', params })
}

export function getDispositionDetail(id) {
  return request({ url: `/api/quality/disposition/${id}`, method: 'get' })
}

export function createDisposition(data) {
  return request({ url: '/api/quality/disposition', method: 'post', data })
}

export function updateDisposition(data) {
  return request({ url: '/api/quality/disposition', method: 'put', data })
}

export function deleteDisposition(id) {
  return request({ url: `/api/quality/disposition/${id}`, method: 'delete' })
}

export function approveDisposition(id, status, remark) {
  return request({ url: `/api/quality/disposition/${id}/approve`, method: 'post', params: { status, remark }})
}

// ========== 报表统计 ==========

export function getQualitySummary() {
  return request({ url: '/api/quality/report/summary', method: 'get' })
}

// ========== 检验统计接口 ==========

/**
 * 获取检验统计数据
 */
export function getInspectionStatistics(params) {
  return request({
    url: '/api/quality/statistics/inspection',
    method: 'get',
    params
  })
}

/**
 * 获取不良品统计
 */
export function getDefectStatistics(params) {
  return request({
    url: '/api/quality/statistics/defect',
    method: 'get',
    params
  })
}

/**
 * 获取来料检统计
 */
export function getIncomingStatistics(params) {
  return request({
    url: '/api/quality/statistics/incoming',
    method: 'get',
    params
  })
}

/**
 * 获取工序检统计
 */
export function getProcessStatistics(params) {
  return request({
    url: '/api/quality/statistics/process',
    method: 'get',
    params
  })
}

/**
 * 获取成品检统计
 */
export function getFinalStatistics(params) {
  return request({
    url: '/api/quality/statistics/final',
    method: 'get',
    params
  })
}

/**
 * 获取不合格率趋势
 */
export function getDefectRateTrend(params) {
  return request({
    url: '/api/quality/statistics/defect-rate-trend',
    method: 'get',
    params
  })
}

// ========== 缺陷类型维护接口 ==========

/**
 * 获取缺陷类型列表
 */
export function getDefectTypeList() {
  return request({
    url: '/api/quality/defect-type/list',
    method: 'get'
  })
}

/**
 * 添加缺陷类型
 */
export function addDefectType(data) {
  return request({
    url: '/api/quality/defect-type',
    method: 'post',
    data
  })
}

/**
 * 更新缺陷类型
 */
export function updateDefectType(id, data) {
  return request({
    url: `/api/quality/defect-type/${id}`,
    method: 'put',
    data
  })
}

/**
 * 删除缺陷类型
 */
export function deleteDefectType(id) {
  return request({
    url: `/api/quality/defect-type/${id}`,
    method: 'delete'
  })
}
