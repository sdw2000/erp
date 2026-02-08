import request from '@/utils/request'

/**
 * 订单预处理 API
 */

// 查询待预处理的订单列表
export function getPreprocessingList(params) {
  return request({
    url: '/api/production/preprocessing/list',
    method: 'get',
    params
  })
}

// 查询未完成的销售订单明细（按面积口径）
export function getPendingOrderItems(params) {
  return request({
    url: '/sales/order-items/pending',
    method: 'get',
    params
  })
}

// 查询可锁定的物料列表 (FIFO)
// 增加 orderItemId 便于按订单长度过滤
export function getAvailableMaterials(materialCode, limit = 50, orderItemId) {
  return request({
    url: '/api/production/preprocessing/available-materials',
    method: 'get',
    params: {
      materialCode,
      limit,
      orderItemId
    }
  })
}

// 锁定物料
export function lockMaterials(data) {
  return request({
    url: '/api/production/preprocessing/lock-materials',
    method: 'post',
    data
  })
}

// 解除锁定，释放库存
export function unlockMaterials(data) {
  return request({
    url: '/api/production/preprocessing/unlock-materials',
    method: 'post',
    data
  })
}

// 同步创建预处理记录（从未完成明细）
export function bootstrapPreprocessing(params) {
  return request({
    url: '/api/production/preprocessing/bootstrap',
    method: 'post',
    params
  })
}

// 提交预处理订单
export function submitPreprocessing(data) {
  return request({
    url: '/api/production/preprocessing/submit',
    method: 'post',
    data
  })
}

// 取消订单明细：释放锁定并清理排程池
export function cancelOrderItem(data) {
  return request({
    url: '/api/production/preprocessing/cancel-order-item',
    method: 'post',
    data
  })
}

// 获取预处理记录详情
export function getPreprocessingDetail(id) {
  return request({
    url: `/api/production/preprocessing/${id}`,
    method: 'get'
  })
}

// 查询锁定的物料列表
export function getLocks(orderItemId) {
  return request({
    url: `/api/production/preprocessing/locks/${orderItemId}`,
    method: 'get'
  })
}
