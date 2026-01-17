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

// 获取订单详情
export function getOrderDetail(orderNo) {
  return request({
    url: `/sales/orders/${orderNo}`,
    method: 'get'
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
export function importOrders(file) {
  const formData = new FormData()
  formData.append('file', file)
  return request({
    url: '/sales/orders/import',
    method: 'post',
    data: formData,
    timeout: 120000, // 2分钟超时
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

// 导出所有订单
export function exportOrders() {
  return request({
    url: '/sales/orders/export',
    method: 'get',
    responseType: 'blob'
  })
}
