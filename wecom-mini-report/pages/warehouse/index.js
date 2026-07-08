const { getToken, getUserInfo } = require('../../utils/auth')
const { getStockByQrCode } = require('../../api/stock')
const request = require('../../utils/request')

Page({
  data: {
    canWarehouse: false,
    showScanModal: false,
    scanResult: null
  },

  onShow() {
    const token = getToken()
    if (!token) {
      wx.reLaunch({ url: '/pages/login/index' })
      return
    }
    const userInfo = getUserInfo() || {}
    const roles = Array.isArray(userInfo.roles) ? userInfo.roles : []
    const canWarehouse = roles.includes('warehouse') || roles.includes('admin') || roles.includes('packing')
    this.setData({ 
      canWarehouse,
      userName: userInfo.name || userInfo.username || '管理员'
    })
  },

  onUniversalScan() {
    wx.scanCode({
      success: (res) => {
        const qrCode = res.result
        wx.showLoading({ title: '识别中...' })
        getStockByQrCode(qrCode).then(res => {
          if (res.code === 200 || res.code === 20000) {
            const data = res.data
            let displayData = {
              qrCode: qrCode,
              tag: data.tag,
              materialCode: '-',
              materialName: '-',
              area: 0,
              status: ''
            }

            if (data.tag === 'STOCK' && data.stockInfo) {
              displayData.materialCode = data.stockInfo.materialCode
              displayData.materialName = data.stockInfo.materialName
              displayData.area = data.stockInfo.availableArea || data.stockInfo.area
              displayData.status = '在库'
            } else if (data.tag === 'WORKSHOP' && data.stockInfo) {
              displayData.materialCode = data.stockInfo.materialCode
              displayData.materialName = data.stockInfo.materialName
              displayData.area = data.stockInfo.availableArea || data.stockInfo.area
              displayData.status = '车间在制 (待消耗)'
            } else if (data.tag === 'PRODUCTION_TASK' && data.taskInfo) {
              displayData.materialCode = data.taskInfo.materialCode
              displayData.materialName = data.taskInfo.materialName
              displayData.area = data.taskInfo.plannedArea
              displayData.status = `生产中: ${data.taskInfo.taskType}`
              displayData.scheduleId = data.taskInfo.scheduleId || data.taskInfo.id
              displayData.orderDetailId = data.taskInfo.orderItemId || data.taskInfo.orderDetailId || data.taskInfo.order_detail_id
              displayData.processType = data.taskInfo.taskType // 可能是 COATING/REWINDING/SLITTING
            }

            this.setData({
              scanResult: displayData,
              showScanModal: true
            })
          } else {
            wx.showToast({ title: '未找到相关信息', icon: 'none' })
          }
        }).catch(err => {
          wx.showToast({ title: '查询失败', icon: 'none' })
        }).finally(() => {
          wx.hideLoading()
        })
      }
    })
  },

  closeScanModal() {
    this.setData({ showScanModal: false })
  },

  onScanAction() {
    const { scanResult } = this.data
    this.closeScanModal()
    
    if (scanResult.tag === 'PRODUCTION_TASK') {
      // 先打码场景：提供预创建选项
      wx.showActionSheet({
        itemList: ['打印并预创建入库单', '前往车间报工'],
        success: (res) => {
          if (res.tapIndex === 0) {
            wx.showLoading({ title: '创建中...' })
            request({
              url: '/stock/tape/inbound/pre-create',
              method: 'post',
              params: { taskNo: scanResult.qrCode, operator: this.data.userName }
            }).then(resp => {
              if (resp.code === 200 || resp.code === 20000) {
                wx.showToast({ title: '入库申请已同步' })
              } else {
                wx.showToast({ title: resp.message || '创建失败', icon: 'none' })
              }
            }).catch(() => {
              wx.showToast({ title: '网络请求失败', icon: 'none' })
            }).finally(() => {
              wx.hideLoading()
            })
          } else if (res.tapIndex === 1) {
            const { scheduleId, orderDetailId, processType, qrCode, materialCode } = scanResult
            wx.reLaunch({
              url: `/pages/report/index?qrCode=${qrCode}&materialCode=${materialCode}&scheduleId=${scheduleId || ''}&orderDetailId=${orderDetailId || ''}&processType=${processType || ''}`
            })
          }
        }
      })
    } else {
      // 如果是库存，跳转到入库或盘点
      wx.navigateTo({
        url: `/pages/stocktake/index?qrCode=${scanResult.qrCode}`
      })
    }
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
  },

  goWorkshopWarehouse() {
    wx.navigateTo({ url: '/pages/workshop-warehouse/index' })
  }
})
