const { getToken } = require('./auth')

function request(options) {
  const app = getApp()
  const baseUrl = (app && app.globalData && app.globalData.baseUrl) || ''
  const token = getToken()

  return new Promise((resolve, reject) => {
    wx.request({
      url: `${baseUrl}${options.url}`,
      method: options.method || 'GET',
      data: options.data || {},
      header: {
        'content-type': 'application/json',
        'X-Token': token,
        token,
        ...(options.header || {})
      },
      success(res) {
        const body = res.data || {}
        if (body.code === 200 || body.code === 20000) {
          resolve(body)
        } else {
          reject(body)
        }
      },
      fail(err) {
        reject(err)
      }
    })
  })
}

module.exports = request
