import request from '@/utils/request'

/**
 * 获取安全库存列表
 */
export function getSafetyStockList(params) {
  return request({
    url: '/production/safety-stock/list',
    method: 'get',
    params
  })
}

/**
 * 根据料号和库存类型获取
 */
export function getSafetyStockByMaterialAndType(materialCode, stockType) {
  return request({
    url: '/production/safety-stock/get',
    method: 'get',
    params: { materialCode, stockType }
  })
}

/**
 * 获取安全库存详情
 */
export function getSafetyStockById(id) {
  return request({
    url: `/production/safety-stock/${id}`,
    method: 'get'
  })
}

/**
 * 新增安全库存配置
 */
export function addSafetyStock(data) {
  return request({
    url: '/production/safety-stock',
    method: 'post',
    data
  })
}

/**
 * 更新安全库存配置
 */
export function updateSafetyStock(id, data) {
  return request({
    url: `/production/safety-stock/${id}`,
    method: 'put',
    data
  })
}

/**
 * 删除安全库存配置
 */
export function deleteSafetyStock(id) {
  return request({
    url: `/production/safety-stock/${id}`,
    method: 'delete'
  })
}

/**
 * 获取需要补货的产品列表
 */
export function getNeedRestockList() {
  return request({
    url: '/production/safety-stock/need-restock',
    method: 'get'
  })
}

/**
 * 获取库存预警统计
 */
export function getStockWarningStats() {
  return request({
    url: '/production/safety-stock/warning-stats',
    method: 'get'
  })
}
