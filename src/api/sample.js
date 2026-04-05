import request from '@/utils/request'

/**
 * 获取送样单列表
 * @param {Object} params - 查询参数
 */
export function getSampleList(params) {
  return request({
    url: '/api/sales/samples',
    method: 'get',
    params
  })
}

/**
 * 获取送样单详情
 * @param {String} sampleNo - 送样单号
 */
export function getSampleDetail(sampleNo) {
  const encodedSampleNo = encodeURIComponent(sampleNo)
  return request({
    url: `/api/sales/samples/${encodedSampleNo}`,
    method: 'get'
  })
}

/**
 * 生成送样单号
 */
export function generateSampleNo() {
  return request({
    url: '/api/sales/samples/generate-no',
    method: 'get'
  })
}

/**
 * 新增送样单
 * @param {Object} data - 送样单数据
 */
export function addSample(data) {
  return request({
    url: '/api/sales/samples',
    method: 'post',
    data
  })
}

/**
 * 更新送样单
 * @param {Object} data - 送样单数据
 */
export function updateSample(data) {
  return request({
    url: '/api/sales/samples',
    method: 'put',
    data
  })
}

/**
 * 删除送样单
 * @param {String} sampleNo - 送样单号
 */
export function deleteSample(sampleNo) {
  const encodedSampleNo = encodeURIComponent(sampleNo)
  return request({
    url: `/api/sales/samples/${encodedSampleNo}`,
    method: 'delete'
  })
}

/**
 * 更新物流信息
 * @param {String} sampleNo - 送样单号
 * @param {Object} data - 物流数据
 */
export function updateSampleLogistics(sampleNo, data) {
  const encodedSampleNo = encodeURIComponent(sampleNo)
  return request({
    url: `/api/sales/samples/${encodedSampleNo}/logistics`,
    method: 'put',
    data
  })
}

/**
 * 获取物流信息
 * @param {String} sampleNo - 送样单号
 */
export function getSampleLogistics(sampleNo, params) {
  const encodedSampleNo = encodeURIComponent(sampleNo)
  return request({
    url: `/api/sales/samples/${encodedSampleNo}/logistics`,
    method: 'get',
    params
  })
}

/**
 * 导入送样单
 */
export function importSample(data) {
  return request({
    url: '/api/sales/samples/import',
    method: 'post',
    data,
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

/**
 * 导出送样单
 */
export function exportSample(params) {
  return request({
    url: '/api/sales/samples/export',
    method: 'get',
    params,
    responseType: 'blob'
  })
}
