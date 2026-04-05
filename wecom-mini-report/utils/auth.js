function setToken(token) {
  wx.setStorageSync('mes_token', token || '')
}

function getToken() {
  return wx.getStorageSync('mes_token') || ''
}

function clearToken() {
  wx.removeStorageSync('mes_token')
  wx.removeStorageSync('mes_user_info')
}

function setUserInfo(userInfo) {
  wx.setStorageSync('mes_user_info', userInfo || null)
}

function getUserInfo() {
  return wx.getStorageSync('mes_user_info') || null
}

module.exports = {
  setToken,
  getToken,
  clearToken,
  setUserInfo,
  getUserInfo
}
