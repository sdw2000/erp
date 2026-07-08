const { getToken, getUserInfo } = require('../../utils/auth')

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
    const userInfo = getUserInfo() || {}
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
  },

  goCustomers() {
    wx.showToast({ title: '客户管理模块开发中', icon: 'none' })
  },

  goQuotation() {
    wx.showToast({ title: '报价管理模块开发中', icon: 'none' })
  },

  goPriceInquiry() {
    wx.showToast({ title: '价格查询模块开发中', icon: 'none' })
  },

  goSalesStats() {
    wx.showToast({ title: '销售报表统计开发中', icon: 'none' })
  },

  goReturnOrder() {
    wx.showToast({ title: '退换货流程开发中', icon: 'none' })
  },

  goWorkLog() {
    wx.showToast({ title: '销售日志模块开发中', icon: 'none' })
  }
})
