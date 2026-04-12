import request from '@/utils/request'

/**
 * 胶带规格管理API（研发管理）
 */

// 分页查询规格列表
export function getSpecList(params) {
  return request({
    url: '/api/tape-spec/list',
    method: 'get',
    params
  })
}

// 别名导出，兼容旧代码
export const getTapeSpecList = getSpecList

// 根据ID查询详情
export function getSpecById(id) {
  return request({
    url: `/api/tape-spec/${id}`,
    method: 'get'
  })
}

// 根据料号查询
export function getSpecByMaterialCode(materialCode) {
  return request({
    url: `/api/tape-spec/by-code/${materialCode}`,
    method: 'get'
  })
}

// 新增规格
export function createSpec(data) {
  return request({
    url: '/api/tape-spec',
    method: 'post',
    data
  })
}

// 更新规格
export function updateSpec(data) {
  return request({
    url: '/api/tape-spec',
    method: 'put',
    data
  })
}

// 删除规格
export function deleteSpec(id) {
  return request({
    url: `/api/tape-spec/${id}`,
    method: 'delete'
  })
}

// 获取所有启用的规格（下拉选择用）
export function getAllEnabledSpecs() {
  return request({
    url: '/api/tape-spec/enabled',
    method: 'get'
  })
}

// 获取颜色字典
export function getColorDict() {
  return request({
    url: '/api/tape-spec/dict/color',
    method: 'get'
  })
}

// 颜色字典管理列表
export function getColorDictList(params) {
  return request({
    url: '/api/tape-spec/dict/color/list',
    method: 'get',
    params
  })
}

// 新增颜色字典
export function createColorDict(data) {
  return request({
    url: '/api/tape-spec/dict/color',
    method: 'post',
    data
  })
}

// 更新颜色字典
export function updateColorDict(data) {
  return request({
    url: '/api/tape-spec/dict/color',
    method: 'put',
    data
  })
}

// 删除颜色字典
export function deleteColorDict(id) {
  return request({
    url: `/api/tape-spec/dict/color/${id}`,
    method: 'delete'
  })
}

// 获取基材材质字典
export function getBaseMaterialDict() {
  return request({
    url: '/api/tape-spec/dict/base-material',
    method: 'get'
  })
}

// 获取胶水材质字典
export function getGlueMaterialDict() {
  return request({
    url: '/api/tape-spec/dict/glue-material',
    method: 'get'
  })
}

// 导出Excel
export function exportSpec(params = {}) {
  return request({
    url: '/api/tape-spec/export',
    method: 'get',
    params,
    responseType: 'blob'
  })
}

// 导入Excel
export function importSpec(file) {
  const formData = new FormData()
  formData.append('file', file)
  return request({
    url: '/api/tape-spec/import',
    method: 'post',
    data: formData,
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

// 下载导入模板
export function downloadTemplate() {
  return request({
    url: '/api/tape-spec/template',
    method: 'get',
    responseType: 'blob'
  })
}

// 品质校验
export function checkQuality(materialCode, paramName, value) {
  return request({
    url: '/api/tape-spec/check-quality',
    method: 'get',
    params: { materialCode, paramName, value }
  })
}
