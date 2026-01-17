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

// 查询可用的薄膜明细
export function getAvailableFilmDetails(id) {
  return request({
    url: `/api/stock/film/${id}/available`,
    method: 'get'
  })
}

// 查询薄膜出库记录
export function getFilmOutboundBySchedule(scheduleId) {
  return request({
    url: `/api/stock/film/outbound/schedule/${scheduleId}`,
    method: 'get'
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

// 查询化工库存明细
export function getChemicalStockDetails(id) {
  return request({
    url: `/api/stock/chemical/${id}/details`,
    method: 'get'
  })
}

// 查询可用的化工明细
export function getAvailableChemicalDetails(id) {
  return request({
    url: `/api/stock/chemical/${id}/available`,
    method: 'get'
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
