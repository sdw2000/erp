import request from '@/utils/request'

// 原材料字典列表（兼容旧页面调用）
export function getRawMaterialList(params = {}) {
  return request({
    url: '/api/tape-formula/raw-materials',
    method: 'get',
    params
  })
}

// 别名：部分页面使用 listRawMaterials 命名
export const listRawMaterials = getRawMaterialList

// 原材料分页查询
export function getRawMaterialPage(params) {
  return request({
    url: '/api/tape-formula/raw-materials/list',
    method: 'get',
    params
  })
}

// 原材料详情
export function getRawMaterialById(id) {
  return request({
    url: `/api/tape-formula/raw-material/${id}`,
    method: 'get'
  })
}

// 新增原材料
export function createRawMaterial(data) {
  return request({
    url: '/api/tape-formula/raw-material',
    method: 'post',
    data
  })
}

// 更新原材料
export function updateRawMaterial(data) {
  return request({
    url: '/api/tape-formula/raw-material',
    method: 'put',
    data
  })
}

// 删除原材料
export function deleteRawMaterial(id) {
  return request({
    url: `/api/tape-formula/raw-material/${id}`,
    method: 'delete'
  })
}

// 导出原材料
export function exportRawMaterials(params = {}) {
  return request({
    url: '/api/tape-formula/raw-material/export',
    method: 'get',
    params,
    responseType: 'blob'
  })
}

// 下载模板
export function downloadRawMaterialTemplate() {
  return request({
    url: '/api/tape-formula/raw-material/template',
    method: 'get',
    responseType: 'blob'
  })
}

// 导入原材料
export function importRawMaterials(file) {
  const formData = new FormData()
  formData.append('file', file)
  return request({
    url: '/api/tape-formula/raw-material/import',
    method: 'post',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

export function initializeRawMaterials() {
  return request({
    url: '/api/tape-formula/raw-material/initialize',
    method: 'post'
  })
}
