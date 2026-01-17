import request from '@/utils/request'

/**
 * 客户管理API
 */

// 分页查询客户列表
export function getCustomerList(params) {
  return request({
    url: '/api/sales/customers',
    method: 'get',
    params
  })
}

// 根据ID查询客户详情
export function getCustomerDetail(id) {
  return request({
    url: `/api/sales/customers/${id}`,
    method: 'get'
  })
}

// 新增客户
export function addCustomer(data) {
  return request({
    url: '/api/sales/customers',
    method: 'post',
    data
  })
}

// 更新客户
export function updateCustomer(id, data) {
  return request({
    url: `/api/sales/customers/${id}`,
    method: 'put',
    data
  })
}

// 删除客户
export function deleteCustomer(id) {
  return request({
    url: `/api/sales/customers/${id}`,
    method: 'delete'
  })
}

// 批量删除客户
export function batchDeleteCustomers(ids) {
  return request({
    url: '/api/sales/customers/batch',
    method: 'delete',
    data: ids
  })
}

// 更新客户状态
export function updateCustomerStatus(id, status) {
  return request({
    url: `/api/sales/customers/${id}/status`,
    method: 'put',
    params: { status }
  })
}

// 根据客户ID查询联系人列表
export function getContactsByCustomerId(customerId) {
  return request({
    url: `/api/sales/customers/${customerId}/contacts`,
    method: 'get'
  })
}

// 设置主联系人
export function setPrimaryContact(customerId, contactId) {
  return request({
    url: `/api/sales/customers/${customerId}/contacts/${contactId}/primary`,
    method: 'put'
  })
}

// 检查客户编号是否存在
export function checkCustomerCode(customerCode) {
  return request({
    url: '/api/sales/customers/check-code',
    method: 'get',
    params: { customerCode }
  })
}

// 检查客户名称是否存在
export function checkCustomerName(customerName, excludeId) {
  return request({
    url: '/api/sales/customers/check-name',
    method: 'get',
    params: { customerName, excludeId }
  })
}

// 生成客户编号预览
export function generateCustomerCode(prefix) {
  return request({
    url: '/api/sales/customers/generate-code',
    method: 'get',
    params: { prefix }
  })
}

// ============== 导入导出功能 ==============

// 下载导入模板
export function downloadCustomerTemplate() {
  return request({
    url: '/api/sales/customers/template',
    method: 'get',
    responseType: 'blob'
  })
}

// 导入客户数据
export function importCustomers(file) {
  const formData = new FormData()
  formData.append('file', file)
  return request({
    url: '/api/sales/customers/import',
    method: 'post',
    data: formData,
    timeout: 120000, // 2分钟超时
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

// 导出客户数据
export function exportCustomers() {
  return request({
    url: '/api/sales/customers/export',
    method: 'get',
    responseType: 'blob'
  })
}
