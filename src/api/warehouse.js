import request from '@/utils/request'

/**
 * 获取仓库列表
 */
export function getWarehouseList(params) {
  return request({
    url: '/api/warehouse/list',
    method: 'get',
    params
  })
}

/**
 * 保存仓库
 */
export function saveWarehouse(data) {
  return request({
    url: '/api/warehouse/save',
    method: 'post',
    data
  })
}

/**
 * 删除仓库
 */
export function deleteWarehouse(id) {
  return request({
    url: `/api/warehouse/delete/${id}`,
    method: 'delete'
  })
}

/**
 * 获取所有可用仓库 (不分页)
 */
export function getAllWarehouses() {
  return request({
    url: '/api/warehouse/all',
    method: 'get'
  })
}

/**
 * 获取库位列表
 */
export function getLocationList(params) {
  return request({
    url: '/api/warehouse/location/list',
    method: 'get',
    params
  })
}

/**
 * 保存库位
 */
export function saveLocation(data) {
  return request({
    url: '/api/warehouse/location/save',
    method: 'post',
    data
  })
}

/**
 * 删除库位
 */
export function deleteLocation(id) {
  return request({
    url: `/api/warehouse/location/delete/${id}`,
    method: 'delete'
  })
}
