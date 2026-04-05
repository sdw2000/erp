import request from '@/utils/request'

// 分页查询
export function getCartonSpecList(params) {
  return request({
    url: '/api/rd/carton-spec/list',
    method: 'get',
    params
  })
}

// 详情
export function getCartonSpecById(id) {
  return request({
    url: `/api/rd/carton-spec/${id}`,
    method: 'get'
  })
}

// 按料号查询（分切报工页用）
export function getCartonSpecByMaterial(materialCode, status = 1) {
  return request({
    url: `/api/rd/carton-spec/by-material/${encodeURIComponent(materialCode)}`,
    method: 'get',
    params: { status }
  })
}

// 新增
export function createCartonSpec(data) {
  return request({
    url: '/api/rd/carton-spec',
    method: 'post',
    data
  })
}

// 更新
export function updateCartonSpec(data) {
  return request({
    url: '/api/rd/carton-spec',
    method: 'put',
    data
  })
}

// 删除
export function deleteCartonSpec(id) {
  return request({
    url: `/api/rd/carton-spec/${id}`,
    method: 'delete'
  })
}
