const { getToken, getUserInfo, clearToken } = require('../../utils/auth')
const { getTapeStockList, stocktakeById } = require('../../api/stock')

Page({
  data: {
    qrCode: '',
    loading: false,
    submitting: false,
    stock: null,
    actualRolls: '',
    actualSqm: '',
    operator: '',
    reason: '小程序扫码盘点'
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
    if (!canWarehouse) {
      wx.showToast({ title: '当前账号无盘点权限', icon: 'none' })
    }
    const name = userInfo.name || userInfo.username || ''
    if (name && !this.data.operator) {
      this.setData({ operator: name })
    }
  },

  onQrCodeInput(e) { this.setData({ qrCode: e.detail.value }) },
  onActualRollsInput(e) { this.setData({ actualRolls: e.detail.value }) },
  onActualSqmInput(e) { this.setData({ actualSqm: e.detail.value }) },
  onOperatorInput(e) { this.setData({ operator: e.detail.value }) },
  onReasonInput(e) { this.setData({ reason: e.detail.value }) },

  onScanQrCode() {
    wx.scanCode({
      onlyFromCamera: false,
      success: (res) => {
        this.setData({ qrCode: res.result || '' })
      },
      fail: () => wx.showToast({ title: '扫码取消或失败', icon: 'none' })
    })
  },

  async queryByQrCode() {
    const qrCode = (this.data.qrCode || '').trim()
    if (!qrCode) {
      wx.showToast({ title: '请先扫码或输入二维码', icon: 'none' })
      return
    }

    this.setData({ loading: true })
    try {
      const res = await getTapeStockList({ page: 1, size: 1, qrCode })
      const records = (res && res.data && res.data.records) || []
      if (!records.length) {
        wx.showToast({ title: '未找到库存记录', icon: 'none' })
        this.setData({ stock: null })
        return
      }
      const stock = records[0]
      this.setData({
        stock,
        actualRolls: String(stock.totalRolls || stock.total_rolls || ''),
        actualSqm: String(stock.totalArea || stock.total_area || '')
      })
      wx.showToast({ title: '已带出库存', icon: 'success' })
    } catch (e) {
      if (e && (e.code === 50008 || e.code === 50012 || e.code === 50014)) {
        clearToken()
        wx.reLaunch({ url: '/pages/login/index' })
        return
      }
      wx.showToast({ title: (e && (e.msg || e.message)) || '查询失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  async submitStocktake() {
    const { stock, actualRolls, actualSqm, operator, reason } = this.data
    if (!stock || !stock.id) {
      wx.showToast({ title: '请先查询库存', icon: 'none' })
      return
    }
    if (actualRolls === '' && actualSqm === '') {
      wx.showToast({ title: '请填写实际卷数或面积', icon: 'none' })
      return
    }

    this.setData({ submitting: true })
    try {
      await stocktakeById(stock.id, {
        actualRolls: actualRolls === '' ? null : Number(actualRolls),
        actualSqm: actualSqm === '' ? null : Number(actualSqm),
        operator: (operator || '').trim() || undefined,
        reason: (reason || '').trim() || undefined
      })
      wx.showToast({ title: '盘点成功', icon: 'success' })
      this.queryByQrCode()
    } catch (e) {
      wx.showToast({ title: (e && (e.msg || e.message)) || '盘点失败', icon: 'none' })
    } finally {
      this.setData({ submitting: false })
    }
  }
})
