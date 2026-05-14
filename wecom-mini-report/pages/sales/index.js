const { getToken } = require('../../utils/auth')

Page({
  data: {
    canSales: false
  },

  onShow() {
    const token = getToken()
    if (!token) {
      wx.reLaunch({ url: '/pages/login/index' })
      return
    }
    const userInfo = getApp().globalData.userInfo || wx.getStorageSync('mes_user_info') || {}
    const roles = Array.isArray(userInfo.roles) ? userInfo.roles : []
    const canSales = roles.includes('sales') || roles.includes('finance') || roles.includes('admin')
    this.setData({ canSales })
  },

  goSalesOrder() {
    wx.navigateTo({ url: '/pages/sales-order/index' })
  },

  goSampleOrder() {
    wx.navigateTo({ url: '/pages/sample-order/index' })
  },

  goDelivery() {
    wx.navigateTo({ url: '/pages/delivery/index' })
  }
})
