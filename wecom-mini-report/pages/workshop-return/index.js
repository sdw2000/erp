const { batchReturnToWarehouse } = require('../../api/workshop')
const { getTapeStockList } = require('../../api/stock')
const { getUserInfo } = require('../../utils/auth')

Page({
  data: {
    warehouseOptions: ['成品仓', '原料仓', '半成品区', '暂存区'],
    warehouseIndex: 0,
    currentCode: '',
    scannedItems: [],
    remark: '',
    submitting: false,
    operator: ''
  },

  onLoad() {
    const userInfo = getUserInfo() || {}
    this.setData({
      operator: userInfo.name || userInfo.username || 'unknown'
    })
  },

  onWarehouseChange(e) {
    this.setData({ warehouseIndex: e.detail.value })
  },

  onCodeInput(e) {
    this.setData({ currentCode: e.detail.value })
  },

  onRemarkInput(e) {
    this.setData({ remark: e.detail.value })
  },

  onScanCode() {
    wx.scanCode({
      success: (res) => {
        const code = (res.result || '').trim()
        if (code) {
          this.addCode(code)
        }
      }
    })
  },

  addCodeByInput() {
    const code = this.data.currentCode.trim()
    if (!code) return
    this.addCode(code)
    this.setData({ currentCode: '' })
  },

  async addCode(code) {
    // 检查是否已存在
    if (this.data.scannedItems.some(item => item.qrCode === code)) {
      wx.showToast({ title: '批次已在列表中', icon: 'none' })
      return
    }

    // 先添加到列表，前端显示
    const newItem = {
      qrCode: code,
      materialCode: '',
      spec: ''
    }
    
    const newList = [...this.data.scannedItems, newItem]
    this.setData({ scannedItems: newList })

    // 尝试获取库存信息补充显示
    try {
      const res = await getTapeStockList({ qrCode: code, page: 1, limit: 1 })
      const records = res.data && res.data.records ? res.data.records : []
      if (records.length > 0) {
        const stock = records[0]
        const updatedList = this.data.scannedItems.map(item => {
          if (item.qrCode === code) {
            return {
              ...item,
              materialCode: stock.materialCode,
              spec: `${stock.width}mm * ${stock.length}m`
            }
          }
          return item
        })
        this.setData({ scannedItems: updatedList })
      } else {
        // 如果没找到，可能是原材料，尝试其他接口（此处简化处理）
      }
    } catch (e) {
      console.error('获取库存信息失败', e)
    }
  },

  removeItem(e) {
    const index = e.currentTarget.dataset.index
    const list = [...this.data.scannedItems]
    list.splice(index, 1)
    this.setData({ scannedItems: list })
  },

  clearAll() {
    wx.showModal({
      title: '确认清空',
      content: '是否清空已扫描的所有批次？',
      success: (res) => {
        if (res.confirm) {
          this.setData({ scannedItems: [] })
        }
      }
    })
  },

  async submitReturn() {
    if (this.data.scannedItems.length === 0) {
      wx.showToast({ title: '请先扫码', icon: 'none' })
      return
    }

    this.setData({ submitting: true })
    try {
      const codes = this.data.scannedItems.map(item => item.qrCode)
      const res = await batchReturnToWarehouse({
        qrCodes: codes,
        targetLocation: this.data.warehouseOptions[this.data.warehouseIndex],
        remark: this.data.remark || '小程序批量退料',
        operator: this.data.operator
      })

      wx.showModal({
        title: '提交成功',
        content: `成功退仓 ${this.data.scannedItems.length} 件物料。`,
        showCancel: false,
        success: () => {
          this.setData({ scannedItems: [], remark: '' })
          wx.navigateBack()
        }
      })
    } catch (e) {
      wx.showToast({ 
        title: (e && e.msg) || '提交失败，请联系IT',
        icon: 'none'
      })
    } finally {
      this.setData({ submitting: false })
    }
  }
})
