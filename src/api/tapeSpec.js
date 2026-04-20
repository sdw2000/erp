import request from '@/utils/request'

/**
 * 胶带规格管理API（研发管理）
 */

// 分页查询规格列表
export async function getSpecList(params = {}) {
  try {
    return await request({
      url: '/api/tape-spec/list',
      method: 'get',
      params,
      silentError: true
    })
  } catch (e) {
    // 兜底：权限不足时，改查物料生产配置，保证排程模块可继续使用
    const fallback = await request({
      url: '/api/material-config/list',
      method: 'get',
      params: {
        pageNum: params.page || params.pageNum || 1,
        pageSize: params.size || params.pageSize || 20,
        materialCode: params.materialCode || '',
        isActive: params.status === 1 ? 1 : undefined
      },
      silentError: true
    })

    const page = (fallback && fallback.data) || {}
    const records = Array.isArray(page.records) ? page.records : []
    const normalizedRecords = records.map(item => ({
      ...item,
      id: item.id,
      materialCode: item.materialCode || '',
      productName: item.materialName || '',
      materialName: item.materialName || '',
      totalThickness: item.recommendedThickness,
      total_thickness: item.recommendedThickness,
      status: Number(item.isActive == null ? 1 : item.isActive)
    }))

    return {
      code: 20000,
      msg: 'success',
      data: {
        records: normalizedRecords,
        list: normalizedRecords,
        total: Number(page.total || normalizedRecords.length || 0),
        current: Number(page.current || params.page || params.pageNum || 1),
        size: Number(page.size || params.size || params.pageSize || 20)
      }
    }
  }
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
export async function getSpecByMaterialCode(materialCode) {
  try {
    // 主路径：研发规格
    return await request({
      url: `/api/tape-spec/by-code/${materialCode}`,
      method: 'get',
      silentError: true
    })
  } catch (e) {
    // 兜底路径：生产侧物料信息（兼容无 tape-spec 访问权限账号）
    const fallback = await request({
      url: `/api/production/schedule/material-info/${materialCode}`,
      method: 'get',
      silentError: true
    })

    if (fallback && (fallback.code === 200 || fallback.code === 20000)) {
      const data = fallback.data || {}
      const normalized = {
        ...data,
        productName: data.productName || data.materialName || data.name || '',
        materialName: data.materialName || data.productName || data.name || '',
        totalThickness: data.totalThickness != null ? data.totalThickness : data.thickness,
        total_thickness: data.total_thickness != null ? data.total_thickness : data.thickness,
        status: Number(data.status == null ? 1 : data.status)
      }
      return {
        ...fallback,
        data: normalized
      }
    }

    return fallback
  }
}

// 料号建议（仅研发规格表）
export function getSpecSuggestions(keyword, limit = 5) {
  return request({
    url: '/api/tape-spec/suggest',
    method: 'get',
    params: {
      keyword,
      limit
    },
    silentError: true
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
