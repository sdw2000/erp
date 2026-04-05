import request from '@/utils/request'

// 获取所有角色列表
export function getRoles(params) {
  return request({
    url: '/api/roles',
    method: 'get',
    params
  })
}

// 根据ID获取角色
export function getRoleById(id) {
  return request({
    url: `/api/roles/${id}`,
    method: 'get'
  })
}

// 创建角色
export function createRole(data) {
  return request({
    url: '/api/roles',
    method: 'post',
    data
  })
}

// 更新角色
export function updateRole(id, data) {
  return request({
    url: `/api/roles/${id}`,
    method: 'put',
    data
  })
}

// 删除角色
export function deleteRole(id) {
  return request({
    url: `/api/roles/${id}`,
    method: 'delete'
  })
}

// 为用户分配角色
export function assignRolesToUser(userId, roleIds) {
  return request({
    url: `/api/roles/assign/${userId}`,
    method: 'post',
    data: { roleIds }
  })
}

// 获取用户的角色ID列表
export function getUserRoleIds(userId) {
  return request({
    url: `/api/roles/user/${userId}`,
    method: 'get'
  })
}

// 导出角色数据
export function exportRoles() {
  return request({
    url: '/api/roles/export',
    method: 'get',
    responseType: 'blob'
  })
}

// 导入角色数据
export function importRoles(file) {
  const formData = new FormData()
  formData.append('file', file)
  return request({
    url: '/api/roles/import',
    method: 'post',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

// 下载角色导入模板
export function downloadRoleTemplate() {
  return request({
    url: '/api/roles/template',
    method: 'get',
    responseType: 'blob'
  })
}

// 保留原有的路由接口（用于菜单权限）
export function getRoutes() {
  return request({
    url: '/vue-element-admin/routes',
    method: 'get'
  })
}

// 兼容旧接口
export function addRole(data) {
  return createRole(data)
}
