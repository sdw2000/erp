import request from '@/utils/request'

/**
 * 薄膜库存管理API
 */

// 查询所有薄膜库存
export function getFilmStockList() {
  return request({
    url: '/api/stock/film/list',
    method: 'get'
  })
}

// 分页查询薄膜库存
export function getFilmStockPage(params) {
  return request({
    url: '/api/stock/film/list/page',
    method: 'get',
    params
  })
}

// 查询薄膜库存统计（全表聚合，非当前页）
export function getFilmStockStatistics(params) {
  return request({
    url: '/api/stock/film/list/statistics',
    method: 'get',
    params
  })
}

// 按规格查询薄膜库存
export function getFilmStockBySpec(params) {
  return request({
    url: '/api/stock/film/spec',
    method: 'get',
    params
  })
}

// 根据ID查询薄膜库存
export function getFilmStockById(id) {
  return request({
    url: `/api/stock/film/${id}`,
    method: 'get'
  })
}

// 查询薄膜库存明细
export function getFilmStockDetails(id) {
  return request({
    url: `/api/stock/film/${id}/details`,
    method: 'get'
  })
}

// 分页查询薄膜库存明细（支持排序）
export function getFilmStockDetailsPage(id, params) {
  return request({
    url: `/api/stock/film/${id}/details/page`,
    method: 'get',
    params
  })
}

// 新增薄膜库存明细
export function createFilmStockDetail(filmStockId, data) {
  return request({
    url: `/api/stock/film/${filmStockId}/details`,
    method: 'post',
    data
  })
}

// 更新薄膜库存明细
export function updateFilmStockDetail(filmStockId, detailId, data) {
  return request({
    url: `/api/stock/film/${filmStockId}/details/${detailId}`,
    method: 'put',
    data
  })
}

// 删除薄膜库存明细
export function deleteFilmStockDetail(filmStockId, detailId) {
  return request({
    url: `/api/stock/film/${filmStockId}/details/${detailId}`,
    method: 'delete'
  })
}

// 查询可用的薄膜明细
export function getAvailableFilmDetails(id) {
  return request({
    url: `/api/stock/film/${id}/available`,
    method: 'get'
  })
}

// 按料号分页查询可用薄膜明细（支持排序）
export function getAvailableFilmDetailsPage(params) {
  return request({
    url: '/api/stock/film/available/page',
    method: 'get',
    params
  })
}

// 查询薄膜出库记录
export function getFilmOutboundBySchedule(scheduleId) {
  return request({
    url: `/api/stock/film/outbound/schedule/${scheduleId}`,
    method: 'get'
  })
}

// 薄膜出库
export function createFilmOutbound(data) {
  return request({
    url: '/api/stock/film/outbound',
    method: 'post',
    data
  })
}

// 分页查询薄膜出库记录
export function getFilmOutboundList(params) {
  return request({
    url: '/api/stock/film/outbound/list',
    method: 'get',
    params
  })
}

// 下载薄膜库存导入模板
export function downloadFilmTemplate() {
  return request({
    url: '/api/stock/film/template',
    method: 'get',
    responseType: 'blob'
  })
}

// 按导入模板格式导出薄膜库存（可修改后回导）
export function exportFilmStockImportFormat(params) {
  return request({
    url: '/api/stock/film/export/import-format',
    method: 'get',
    params,
    responseType: 'blob'
  })
}

// 导入薄膜库存
export function importFilmStock(file, options = {}) {
  const formData = new FormData()
  formData.append('file', file)
  return request({
    url: '/api/stock/film/import',
    method: 'post',
    params: {
      clearBeforeImport: options.clearBeforeImport === true
    },
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

// 清空薄膜库存（用于重导）
export function clearFilmStockForReimport(params = { clearOutbound: true }) {
  return request({
    url: '/api/stock/film/clear-for-reimport',
    method: 'post',
    params
  })
}

/**
 * 化工原料库存管理API
 */

// 查询所有化工库存
export function getChemicalStockList() {
  return request({
    url: '/api/stock/chemical/list',
    method: 'get'
  })
}

// 分页查询化工库存
export function getChemicalStockPage(params) {
  return request({
    url: '/api/stock/chemical/list/page',
    method: 'get',
    params
  })
}

// 查询化工库存统计（全表聚合，非当前页）
export function getChemicalStockStatistics(params) {
  return request({
    url: '/api/stock/chemical/list/statistics',
    method: 'get',
    params
  })
}

// 按类型查询化工库存
export function getChemicalStockByType(chemicalType) {
  return request({
    url: `/api/stock/chemical/type/${chemicalType}`,
    method: 'get'
  })
}

// 根据ID查询化工库存
export function getChemicalStockById(id) {
  return request({
    url: `/api/stock/chemical/${id}`,
    method: 'get'
  })
}

// 更新化工库存主表
export function updateChemicalStock(id, data) {
  return request({
    url: `/api/stock/chemical/${id}`,
    method: 'put',
    data
  })
}

// 查询化工库存明细
export function getChemicalStockDetails(id) {
  return request({
    url: `/api/stock/chemical/${id}/details`,
    method: 'get'
  })
}

// 新增化工库存明细
export function createChemicalStockDetail(chemicalStockId, data) {
  return request({
    url: `/api/stock/chemical/${chemicalStockId}/details`,
    method: 'post',
    data
  })
}

// 更新化工库存明细
export function updateChemicalStockDetail(chemicalStockId, detailId, data) {
  return request({
    url: `/api/stock/chemical/${chemicalStockId}/details/${detailId}`,
    method: 'put',
    data
  })
}

// 删除化工库存明细
export function deleteChemicalStockDetail(chemicalStockId, detailId) {
  return request({
    url: `/api/stock/chemical/${chemicalStockId}/details/${detailId}`,
    method: 'delete'
  })
}

// 查询可用的化工明细
export function getAvailableChemicalDetails(id) {
  return request({
    url: `/api/stock/chemical/${id}/available`,
    method: 'get'
  })
}

// 按料号分页查询可用化工明细（支持排序）
export function getAvailableChemicalDetailsPage(params) {
  return request({
    url: '/api/stock/chemical/available/page',
    method: 'get',
    params
  })
}

// 查询即将过期的化工原料
export function getExpiringChemicals(days = 30) {
  return request({
    url: '/api/stock/chemical/expiring',
    method: 'get',
    params: { days }
  })
}

// 查询化工出库记录
export function getChemicalOutboundBySchedule(scheduleId) {
  return request({
    url: `/api/stock/chemical/outbound/schedule/${scheduleId}`,
    method: 'get'
  })
}

// 化工原材料出库
export function createChemicalOutbound(data) {
  return request({
    url: '/api/stock/chemical/outbound',
    method: 'post',
    data
  })
}

// 分页查询化工出库记录
export function getChemicalOutboundList(params) {
  return request({
    url: '/api/stock/chemical/outbound/list',
    method: 'get',
    params
  })
}

// 下载化工库存导入模板
export function downloadChemicalTemplate() {
  return request({
    url: '/api/stock/chemical/template',
    method: 'get',
    responseType: 'blob'
  })
}

// 按导入模板格式导出化工库存（可修改后回导）
export function exportChemicalStockImportFormat(params) {
  return request({
    url: '/api/stock/chemical/export/import-format',
    method: 'get',
    params,
    responseType: 'blob'
  })
}

// 导入化工库存
export function importChemicalStock(file, options = {}) {
  const formData = new FormData()
  formData.append('file', file)
  return request({
    url: '/api/stock/chemical/import',
    method: 'post',
    params: {
      clearBeforeImport: options.clearBeforeImport === true
    },
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

// 清空化工库存（用于重导）
export function clearChemicalStockForReimport(params = { clearOutbound: true }) {
  return request({
    url: '/api/stock/chemical/clear-for-reimport',
    method: 'post',
    params
  })
}

/**
 * 包材仓库存管理API
 */

// 分页查询包材库存
export function getPackageStockPage(params) {
  return request({
    url: '/api/stock/package/list/page',
    method: 'get',
    params
  })
}

// 查询包材库存统计
export function getPackageStockStatistics(params) {
  return request({
    url: '/api/stock/package/list/statistics',
    method: 'get',
    params
  })
}

// 分页查询包材库存明细
export function getPackageStockDetailsPage(id, params) {
  return request({
    url: `/api/stock/package/${id}/details/page`,
    method: 'get',
    params
  })
}
