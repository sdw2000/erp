const { getToken, getUserInfo } = require('../../utils/auth')

Page({
  data: {
    canWarehouse: false
  },

  onShow() {
    const token = getToken()
    if (!token) {
      wx.reLaunch({ url: '/pages/login/index' })
      return
    }
    const userInfo = getUserInfo() || {}
    const roles = Array.isArray(userInfo.roles) ? userInfo.roles : []
    const canWarehouse = roles.includes('warehouse') || roles.includes('admin')
    this.setData({ canWarehouse })
  },

  goOutbound() {
    wx.navigateTo({ url: '/pages/outbound/index' })
  },

  goPurchaseInbound() {
    wx.navigateTo({ url: '/pages/inbound/index?scene=purchaseInbound' })
  },

  goPurchaseScanInbound() {
    wx.navigateTo({ url: '/pages/purchase-scan-inbound/index' })
  },

  goCoatingInbound() {
    wx.navigateTo({ url: '/pages/inbound/index?scene=coatingInbound' })
  },

  goPackagingReturnInbound() {
    wx.navigateTo({ url: '/pages/inbound/index?scene=packagingReturnInbound' })
  },

  goWorkshopReturn() {
    wx.navigateTo({ url: '/pages/workshop-return/index' })
  },

  goWorkshopReceive() {
    wx.navigateTo({ url: '/pages/workshop-receive/index' })
  },

  goCoatingIssue() {
    wx.navigateTo({ url: '/pages/issue/index?scene=coatingIssue' })
  },

  goPackagingIssue() {
    wx.navigateTo({ url: '/pages/issue/index?scene=packagingIssue' })
  },

  goSalesOutbound() {
    wx.navigateTo({ url: '/pages/outbound/index?scene=salesOutbound' })
  },

  goInbound() {
    wx.navigateTo({ url: '/pages/inbound/index' })
  },

  goStocktake() {
    wx.navigateTo({ url: '/pages/stocktake/index' })
  }
})
