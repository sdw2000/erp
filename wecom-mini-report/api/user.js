const request = require('../utils/request')

function login(data) {
  return request({
    url: '/user/login',
    method: 'POST',
    data
  })
}

function getInfo(token) {
  return request({
    url: '/user/info',
    method: 'GET',
    data: { token }
  })
}

module.exports = {
  login,
  getInfo
}
