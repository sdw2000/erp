import request from '@/utils/request'

export function login(data) {
  return request({
    url: '/user/login',
    method: 'post',
    data
  })
}

export function getInfo(token) {
  return request({
    url: '/user/info',
    method: 'get',
    params: { token }
  })
}

export function logout() {
  return request({
    url: '/user/logout',
    method: 'post'
  })
}

// ---- User management CRUD APIs ----
// List users with pagination and optional search
export function getUsers(params) {
  // params: { page, size, username }
  return request({
    url: '/api/users',
    method: 'get',
    params

  })
}

// Get simple user list for dropdown selection (no admin permission required)
export function getUsersSimple(params) {
  return request({
    url: '/api/users/simple',
    method: 'get',
    params
  })
}

export function getUser(id) {
  return request({
    url: `/api/users/${id}`,
    method: 'get'
  })
}

export function createUser(data) {
  // data: { username, password, real_name, email, status }
  return request({
    url: '/api/users',
    method: 'post',
    data
  })
}

export function updateUser(id, data) {
  // data: fields to update; omit password when not changing
  return request({
    url: `/api/users/${id}`,
    method: 'put',
    data
  })
}

export function deleteUser(id) {
  return request({
    url: `/api/users/${id}`,
    method: 'delete'
  })
}

// 导出用户数据
export function exportUsers(params) {
  return request({
    url: '/api/users/export',
    method: 'get',
    params,
    responseType: 'blob'
  })
}

// 导入用户数据
export function importUsers(file) {
  const formData = new FormData()
  formData.append('file', file)
  return request({
    url: '/api/users/import',
    method: 'post',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

// 下载用户导入模板
export function downloadUserTemplate() {
  return request({
    url: '/api/users/template',
    method: 'get',
    responseType: 'blob'
  })
}

// 获取用户的角色ID列表
export function getUserRoles(userId) {
  return request({
    url: `/api/roles/user/${userId}`,
    method: 'get'
  })
}

// 为用户分配角色
export function assignUserRoles(userId, roleIds) {
  return request({
    url: `/api/roles/assign/${userId}`,
    method: 'post',
    data: { roleIds }
  })
}
