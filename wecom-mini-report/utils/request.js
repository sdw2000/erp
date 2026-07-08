const { getToken } = require('./auth')

function sanitizeData(data) {
  if (Array.isArray(data)) return data
  const src = data && typeof data === 'object' ? data : {}
  const out = {}
  Object.keys(src).forEach((key) => {
    const value = src[key]
    if (value === undefined || value === null) return
    if (typeof value === 'number' && Number.isNaN(value)) return
    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (!trimmed) return
      if (trimmed.toLowerCase() === 'undefined' || trimmed.toLowerCase() === 'null') return
      out[key] = trimmed
      return
    }
    out[key] = value
  })
  return out
}

function request(options) {
  const app = getApp()
  const baseUrl = (app && app.globalData && app.globalData.baseUrl) || ''
  const token = getToken()
  const method = (options.method || 'GET').toUpperCase()
  const payload = sanitizeData(options.data || {})
  const useToken = options.withToken !== false
  const authHeaders = useToken && token
    ? {
        'X-Token': token,
        token
      }
    : {}

  return new Promise((resolve, reject) => {
    wx.request({
      url: `${baseUrl}${options.url}`,
      method,
      timeout: Number(options.timeout || 15000),
      data: payload,
      header: {
        'content-type': 'application/json',
        ...authHeaders,
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
        const isTimeout = err && (err.errMsg || '').toLowerCase().includes('timeout')
        if (isTimeout) {
          reject({ code: 408, msg: '请求超时，请检查网络后重试' })
          return
        }
        reject(err)
      }
    })
  })
}

module.exports = request
