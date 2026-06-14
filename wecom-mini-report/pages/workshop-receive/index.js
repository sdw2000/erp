const { batchReceiveToFloor } = require('../../api/workshop')
const { getTapeStockList } = require('../../api/stock')

Page({
  data: {
    sections: [
      { value: '涂布机组', label: '涂布机组' },
      { value: '分切机组', label: '分切机组' },
      { value: '包装机组', label: '包装机组' }
    ],
    sectionIndex: 0,
    shifts: [
      { value: 'A杯', label: 'A班' },
      { value: 'B杯', label: 'B班' },
      { value: 'C杯', label: 'C班' }
    ],
    shiftIndex: 0,
    currentCode: '',
    items: [],
    loading: false
  },

  bindSectionChange(e) {
    this.setData({ sectionIndex: e.detail.value })
  },

  bindShiftChange(e) {
    this.setData({ shiftIndex: e.detail.value })
  },

  scanCode() {
    wx.scanCode({
      success: (res) => {
        if (res.result) {
          this.setData({ currentCode: res.result })
          this.addCode()
        }
      }
    })
  },

  async addCode() {
    const code = this.data.currentCode.trim()
    if (!code) return

    // 检查重复
    if (this.data.items.some(item => item.barcode === code)) {
      wx.showToast({ title: '已在列表中', icon: 'none' })
      this.setData({ currentCode: '' })
      return
    }

    wx.showLoading({ title: '查询中...' })
    try {
      // 通过条码查询物料详情
      const res = await getTapeStockList({ barcode: code })
      const stockItem = res.data && res.data.records ? res.data.records[0] : null
      
      if (!stockItem) {
        wx.showToast({ title: '未找到物料', icon: 'none' })
      } else {
        const newItem = {
          barcode: stockItem.barcode,
          materialName: stockItem.materialName,
          spec: stockItem.specification,
          area: stockItem.availableArea
        }
        this.setData({
          items: [...this.data.items, newItem],
          currentCode: ''
        })
      }
    } catch (err) {
      wx.showToast({ title: '查询失败', icon: 'none' })
    } finally {
      wx.hideLoading()
    }
  },

  removeItem(e) {
    const index = e.currentTarget.dataset.index
    const list = [...this.data.items]
    list.splice(index, 1)
    this.setData({ items: list })
  },

  async submitReceive() {
    if (this.data.items.length === 0) return

    this.setData({ loading: true })
    const barcodes = this.data.items.map(i => i.barcode)
    const section = this.data.sections[this.data.sectionIndex].value
    const shift = this.data.shifts[this.data.shiftIndex].value

    try {
      const res = await batchReceiveToFloor({
        barcodes,
        workshopSection: section,
        shiftCode: shift
      })

      if (res.code === 200 || res.code === 20000) {
        wx.showModal({
          title: '收货成功',
          content: `已成功收货 ${barcodes.length} 件物料到 ${section}`,
          showCancel: false,
          success: () => {
            wx.navigateBack()
          }
        })
      } else {
        wx.showToast({ title: res.message || '操作失败', icon: 'none' })
      }
    } catch (err) {
      wx.showToast({ title: '网络错误', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  }
})
