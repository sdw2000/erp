App({
  globalData: {
    baseUrl: 'https://api.maxtritape.com',
    token: '',
    userInfo: null
  },
  onLaunch() {
    console.log('App Launching...');
    const fixedBaseUrl = 'https://api.maxtritape.com'
    const token = wx.getStorageSync('mes_token') || ''
    const userInfo = wx.getStorageSync('mes_user_info') || null
    this.globalData.baseUrl = fixedBaseUrl
    wx.setStorageSync('mes_base_url', fixedBaseUrl)
    this.globalData.token = token
    this.globalData.userInfo = userInfo
  }
})
