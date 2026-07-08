const { login, getInfo } = require('../../api/user')
const { setToken, setUserInfo } = require('../../utils/auth')

Page({
  data: {
    username: '',
    password: '',
    loading: false
  },

  onLoad() {
    console.log('Login Page Loaded');
    console.log('Current Data:', this.data);
  },

  onReady() {
    console.log('Login Page Ready');
  },

  onShow() {
    console.log('Login Page Showing');
    const app = getApp()
    const fixedBaseUrl = 'https://api.maxtritape.com'
    app.globalData.baseUrl = fixedBaseUrl
    wx.setStorageSync('mes_base_url', fixedBaseUrl)
  },

  onUsernameInput(e) {
    this.setData({ username: e.detail.value })
  },

  onPasswordInput(e) {
    this.setData({ password: e.detail.value })
  },

  async onLogin() {
    const { username, password } = this.data
    if (!username || !password) {
      wx.showToast({ title: '请输入账号密码', icon: 'none' })
      return
    }

    const app = getApp()
    const normalizedBaseUrl = 'https://api.maxtritape.com'
    app.globalData.baseUrl = normalizedBaseUrl
    wx.setStorageSync('mes_base_url', normalizedBaseUrl)

    this.setData({ loading: true })
    try {
      const res = await login({ username, password })
      const token = (res && res.data && (res.data.token || res.data)) || ''
      if (!token) {
        wx.showToast({ title: '登录返回无token', icon: 'none' })
        return
      }
      setToken(token)
      app.globalData.token = token

      try {
        const infoRes = await getInfo(token)
        const userInfo = infoRes && infoRes.data ? infoRes.data : null
        setUserInfo(userInfo)
        app.globalData.userInfo = userInfo
      } catch (e) {
        // getInfo失败不阻断
      }

      wx.reLaunch({
        url: '/pages/home/index',
        fail: () => {
          wx.reLaunch({ url: '/pages/report/index' })
        }
      })
    } catch (e) {
      wx.showToast({ title: (e && (e.msg || e.message)) || '登录失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  }
})
