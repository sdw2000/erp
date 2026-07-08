const request = require('../utils/request')

function login(data) {
  return request({
    url: '/user/login',
    method: 'POST',
    data,
    withToken: false
  })
}

function getInfo(token) {
  return request({
    url: '/user/info',
    method: 'GET',
    data: { token }
  })
}

function getStaffList(data) {
  return request({
    url: '/production/staff/list',
    method: 'GET',
    data
  })
}

module.exports = {
  login,
  getInfo,
  getStaffList
}
