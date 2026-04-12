import request from '@/utils/request'

// 获取订单列表
export function getOrders(params) {
  return request({
    url: '/sales/orders',
    method: 'get',
    params
  })
}

// 创建订单
export function createOrder(data) {
  return request({
    url: '/sales/orders',
    method: 'post',
    data
  })
}

// 更新订单
export function updateOrder(data) {
  return request({
    url: '/sales/orders',
    method: 'put',
    data
  })
}

// 删除订单
export function deleteOrder(orderNo) {
  return request({
    url: '/sales/orders',
    method: 'delete',
    params: { orderNo }
  })
}

// 删除订单明细
export function deleteOrderItem(orderNo, itemId) {
  return request({
    url: '/sales/orders/item',
    method: 'delete',
    params: { orderNo, itemId }
  })
}

// 取消订单（必须填写取消原因）
export function cancelOrder(data) {
  return request({
    url: '/sales/orders/cancel',
    method: 'post',
    data
  })
}

// 获取订单详情
export function getOrderDetail(orderNo) {
  return request({
    url: `/sales/orders/${orderNo}`,
    method: 'get'
  })
}

// 生产任务场景：只读订单详情（权限放在 /sales/order-items 下）
export function getOrderDetailForProduction(orderNo) {
  return request({
    url: '/sales/order-items/order-detail',
    method: 'get',
    params: { orderNo }
  })
}

// 生产任务扫码：按订单明细ID解析
export function resolveOrderItemByDetailId(detailId) {
  return request({
    url: '/sales/order-items/resolve-detail',
    method: 'get',
    params: { detailId }
  })
}

// 搜索订单（用于下拉选择）
export function searchSalesOrders(params) {
  return request({
    url: '/sales/orders/search',
    method: 'get',
    params
  })
}

// 生成订单号
export function generateOrderNo(params) {
  return request({
    url: '/sales/orders/generate-no',
    method: 'get',
    params
  })
}

// 查询客户+料号历史下单规格
export function getOrderHistorySpecs(params) {
  return request({
    url: '/sales/orders/history-specs',
    method: 'get',
    params
  })
}

// 查询客户历史订单备注（订单表头备注下拉）
export function getOrderRemarkHistory(params) {
  return request({
    url: '/sales/orders/remark-history',
    method: 'get',
    params
  })
}

// 下载导入模板
export function downloadOrderTemplate() {
  return request({
    url: '/sales/orders/template',
    method: 'get',
    responseType: 'blob'
  })
}

// 导入订单Excel
export function importOrders(fileOrFormData) {
  const formData = fileOrFormData instanceof FormData ? fileOrFormData : new FormData()
  if (!(fileOrFormData instanceof FormData)) {
    formData.append('file', fileOrFormData)
  }
  return request({
    url: '/sales/orders/import',
    method: 'post',
    data: formData,
    timeout: 600000 // 10分钟超时
  })
}

// 查询销售订单历史初始化状态
export function getHistoryInitStatus() {
  return request({
    url: '/sales/orders/history-init/status',
    method: 'get'
  })
}

// 历史初始化导入（一次性）
export function importHistoryInitOrders(fileOrFormData) {
  const formData = fileOrFormData instanceof FormData ? fileOrFormData : new FormData()
  if (!(fileOrFormData instanceof FormData)) {
    formData.append('file', fileOrFormData)
  }
  return request({
    url: '/sales/orders/history-init/import',
    method: 'post',
    data: formData,
    timeout: 600000
  })
}

// 初始化后的增量同步导入
export function syncIncrementalOrders(fileOrFormData) {
  const formData = fileOrFormData instanceof FormData ? fileOrFormData : new FormData()
  if (!(fileOrFormData instanceof FormData)) {
    formData.append('file', fileOrFormData)
  }
  return request({
    url: '/sales/orders/history-init/sync',
    method: 'post',
    data: formData,
    timeout: 600000
  })
}

// 导出所有订单
export function exportOrders(params) {
  return request({
    url: '/sales/orders/export',
    method: 'get',
    params,
    responseType: 'blob'
  })
}
