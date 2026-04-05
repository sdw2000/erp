import request from '@/utils/request'

/**
 * 获取工艺参数列表
 */
export function getProcessParamsList(params) {
  return request({
    url: '/production/process-params/list',
    method: 'get',
    params
  })
}

/**
 * 根据料号和工序类型获取参数
 */
export function getProcessParams(materialCode, processType, equipmentCode) {
  return request({
    url: '/production/process-params/get',
    method: 'get',
    params: { materialCode, processType, equipmentCode }
  })
}

/**
 * 根据料号获取所有工序参数
 */
export function getProcessParamsByMaterial(materialCode) {
  return request({
    url: `/production/process-params/byMaterial/${materialCode}`,
    method: 'get'
  })
}

/**
 * 获取工艺参数详情
 */
export function getProcessParamsById(id) {
  return request({
    url: `/production/process-params/${id}`,
    method: 'get'
  })
}

/**
 * 新增工艺参数
 */
export function addProcessParams(data) {
  return request({
    url: '/production/process-params',
    method: 'post',
    data
  })
}

/**
 * 更新工艺参数
 */
export function updateProcessParams(id, data) {
  return request({
    url: `/production/process-params/${id}`,
    method: 'put',
    data
  })
}

/**
 * 删除工艺参数
 */
export function deleteProcessParams(id) {
  return request({
    url: `/production/process-params/${id}`,
    method: 'delete'
  })
}

/**
 * 批量保存料号的工艺参数
 */
export function batchSaveProcessParams(materialCode, paramsList) {
  return request({
    url: `/production/process-params/batch/${materialCode}`,
    method: 'post',
    data: paramsList
  })
}

/**
 * 导入工艺参数
 */
export function importProcessParams(data) {
  return request({
    url: '/production/process-params/import',
    method: 'post',
    data,
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}
