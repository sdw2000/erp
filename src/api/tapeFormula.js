import request from '@/utils/request'

/**
 * 配胶标准单API
 */

// 分页查询配方列表
export function getFormulaList(params) {
  return request({
    url: '/api/tape-formula/list',
    method: 'get',
    params
  })
}

// 根据ID查询详情（包含原料明细）
export function getFormulaById(id) {
  return request({
    url: `/api/tape-formula/${id}`,
    method: 'get'
  })
}

// 根据产品料号查询配方
export function getFormulaByMaterialCode(materialCode) {
  return request({
    url: `/api/tape-formula/by-code/${materialCode}`,
    method: 'get'
  })
}

// 新增配方
export function createFormula(data) {
  return request({
    url: '/api/tape-formula',
    method: 'post',
    data
  })
}

// 更新配方
export function updateFormula(data) {
  return request({
    url: '/api/tape-formula',
    method: 'put',
    data
  })
}

// 删除配方
export function deleteFormula(id) {
  return request({
    url: `/api/tape-formula/${id}`,
    method: 'delete'
  })
}

// 导出配方Excel
export function exportFormula(id) {
  return request({
    url: `/api/tape-formula/export/${id}`,
    method: 'get',
    responseType: 'blob'
  })
}

// 获取打印数据
export function getPrintData(id) {
  return request({
    url: `/api/tape-formula/print/${id}`,
    method: 'get'
  })
}

// =============== 原料字典 ===============

// 获取原料字典列表
export function getRawMaterialList() {
  return request({
    url: '/api/tape-formula/raw-materials',
    method: 'get'
  })
}

// 新增原料
export function createRawMaterial(data) {
  return request({
    url: '/api/tape-formula/raw-material',
    method: 'post',
    data
  })
}

// 更新原料
export function updateRawMaterial(data) {
  return request({
    url: '/api/tape-formula/raw-material',
    method: 'put',
    data
  })
}

// 删除原料
export function deleteRawMaterial(id) {
  return request({
    url: `/api/tape-formula/raw-material/${id}`,
    method: 'delete'
  })
}

// =============== 导入导出 ===============

// 下载导入模板
export function downloadTemplate() {
  return request({
    url: '/api/tape-formula/template',
    method: 'get',
    responseType: 'blob'
  })
}

// 导入配方Excel
export function importFormula(file) {
  const formData = new FormData()
  formData.append('file', file)
  return request({
    url: '/api/tape-formula/import',
    method: 'post',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

// 批量导出所有配方
export function exportAllFormula() {
  return request({
    url: '/api/tape-formula/export-all',
    method: 'get',
    responseType: 'blob'
  })
}
