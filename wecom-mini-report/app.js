App({
  globalData: {
    baseUrl: 'http://localhost:8090',
    token: '',
    userInfo: null
  },
  onLaunch() {
    const token = wx.getStorageSync('mes_token') || ''
    const userInfo = wx.getStorageSync('mes_user_info') || null
    this.globalData.token = token
    this.globalData.userInfo = userInfo
  }
})
