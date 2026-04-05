import request from '@/utils/request'

export function fetchLogisticsCompanies(params) {
  return request({
    url: '/logistics-company/list',
    method: 'get',
    params
  })
}

export function createLogisticsCompany(data) {
  return request({
    url: '/logistics-company/create',
    method: 'post',
    data
  })
}

export function updateLogisticsCompany(data) {
  return request({
    url: '/logistics-company/update',
    method: 'post',
    data
  })
}

export function deleteLogisticsCompany(id) {
  return request({
    url: `/logistics-company/delete/${id}`,
    method: 'post'
  })
}
