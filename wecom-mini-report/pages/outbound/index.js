const { getToken, getUserInfo, clearToken } = require('../../utils/auth')
const {
  getTapeStockList,
  getOutboundList,
  createOutboundRequest
} = require('../../api/stock')

Page({
  data: {
    scene: 'default',
    pageTitle: '成品出库申请',
    pageDesc: '先按料号查询分切卷库存，再提交出库申请',
    qrCode: '',
    materialCode: '',
    rolls: '1',
    applicant: '',
    applyDept: '生产',
    remark: '',
    loadingStock: false,
    submitting: false,
    queryLoading: false,
    stockList: [],
    stockPicker: [],
    stockIndex: -1,
    outboundList: []
  },

  onLoad(options = {}) {
    const scene = (options.scene || '').trim()
    if (!scene) {
      return
    }
    if (scene === 'salesOutbound') {
      this.setData({
        scene,
        pageTitle: '销售出库申请',
        pageDesc: '用于销售发货出库，先定位库存再提交申请',
        applyDept: '销售',
        remark: 'SCENE=SALES_OUTBOUND'
      })
      wx.setNavigationBarTitle({ title: '销售出库' })
    }
  },

  onShow() {
    const token = getToken()
    if (!token) {
      wx.reLaunch({ url: '/pages/login/index' })
      return
    }
    const userInfo = getUserInfo() || {}
    const name = userInfo.name || userInfo.username || ''
    if (name && !this.data.applicant) {
      this.setData({ applicant: name })
    }
  },

  onMaterialCodeInput(e) { this.setData({ materialCode: e.detail.value }) },
  onQrCodeInput(e) { this.setData({ qrCode: e.detail.value }) },
  onRollsInput(e) { this.setData({ rolls: e.detail.value }) },
  onApplicantInput(e) { this.setData({ applicant: e.detail.value }) },
  onApplyDeptInput(e) { this.setData({ applyDept: e.detail.value }) },
  onRemarkInput(e) { this.setData({ remark: e.detail.value }) },

  onStockChange(e) {
    this.setData({ stockIndex: Number(e.detail.value) || 0 })
  },

  onScanQrCode() {
    wx.scanCode({
      onlyFromCamera: false,
      success: (res) => {
        this.setData({ qrCode: res.result || '' })
      },
      fail: () => {
        wx.showToast({ title: '扫码取消或失败', icon: 'none' })
      }
    })
  },

  async loadByQrCode() {
    const qrCode = (this.data.qrCode || '').trim()
    if (!qrCode) {
      wx.showToast({ title: '请先扫码或输入二维码', icon: 'none' })
      return
    }
    this.setData({ loadingStock: true })
    try {
      const res = await getTapeStockList({ page: 1, size: 20, qrCode })
      const data = res.data || {}
      const list = Array.isArray(data.records) ? data.records : []
      const picker = list.map(item => {
        const id = item.id || '-'
        const batch = item.batch_no || item.batchNo || '-'
        const total = item.total_rolls || item.totalRolls || 0
        const loc = item.location || '-'
        return `#${id} | 批次:${batch} | 可用:${total}卷 | 库位:${loc}`
      })
      this.setData({
        stockList: list,
        stockPicker: picker,
        stockIndex: list.length ? 0 : -1,
        materialCode: list.length ? (list[0].materialCode || '') : this.data.materialCode
      })
      if (!list.length) {
        wx.showToast({ title: '未找到对应库存', icon: 'none' })
      }
    } catch (e) {
      if (e && (e.code === 50008 || e.code === 50012 || e.code === 50014)) {
        clearToken()
        wx.reLaunch({ url: '/pages/login/index' })
        return
      }
      wx.showToast({ title: (e && (e.msg || e.message)) || '二维码查询失败', icon: 'none' })
    } finally {
      this.setData({ loadingStock: false })
    }
  },

  normalizeRecord(item) {
    return {
      id: item.id,
      requestNo: item.request_no || item.requestNo || '-',
      materialCode: item.material_code || item.materialCode || '-',
      batchNo: item.batch_no || item.batchNo || '-',
      rolls: item.rolls || '-',
      status: item.status,
      applicant: item.applicant || '-'
    }
  },

  statusText(status) {
    if (status === 0) return '待审批'
    if (status === 1) return '已通过'
    if (status === 2) return '已拒绝'
    if (status === 3) return '已取消'
    return '-'
  },

  async loadStock() {
    const materialCode = (this.data.materialCode || '').trim()
    if (!materialCode) {
      wx.showToast({ title: '请先输入料号', icon: 'none' })
      return
    }

    this.setData({ loadingStock: true })
    try {
      const res = await getTapeStockList({
        page: 1,
        size: 100,
        materialCode,
        rollType: '分切卷'
      })
      const data = res.data || {}
      const list = Array.isArray(data.records) ? data.records : []
      const picker = list.map(item => {
        const id = item.id || '-'
        const batch = item.batch_no || item.batchNo || '-'
        const total = item.total_rolls || item.totalRolls || 0
        const loc = item.location || '-'
        return `#${id} | 批次:${batch} | 可用:${total}卷 | 库位:${loc}`
      })

      this.setData({
        stockList: list,
        stockPicker: picker,
        stockIndex: list.length ? 0 : -1
      })

      if (!list.length) {
        wx.showToast({ title: '未查到可用库存', icon: 'none' })
      }
    } catch (e) {
      if (e && (e.code === 50008 || e.code === 50012 || e.code === 50014)) {
        clearToken()
        wx.reLaunch({ url: '/pages/login/index' })
        return
      }
      wx.showToast({ title: (e && (e.msg || e.message)) || '库存查询失败', icon: 'none' })
    } finally {
      this.setData({ loadingStock: false })
    }
  },

  async submitOutbound() {
    const { stockList, stockIndex, rolls, applicant, applyDept, remark } = this.data
    if (!stockList.length || stockIndex < 0 || !stockList[stockIndex]) {
      wx.showToast({ title: '请先查询并选择库存', icon: 'none' })
      return
    }
    if (!applicant) {
      wx.showToast({ title: '请填写申请人', icon: 'none' })
      return
    }

    const selected = stockList[stockIndex]
    const payload = {
      stockId: Number(selected.id),
      rolls: Math.max(1, Number(rolls) || 1),
      applicant: applicant.trim(),
      applyDept: (applyDept || '').trim() || undefined,
      remark: (remark || '').trim() || undefined
    }

    this.setData({ submitting: true })
    try {
      await createOutboundRequest(payload)
      wx.showToast({ title: '出库申请已提交', icon: 'success' })
      this.queryOutboundList()
    } catch (e) {
      if (e && (e.code === 50008 || e.code === 50012 || e.code === 50014)) {
        clearToken()
        wx.reLaunch({ url: '/pages/login/index' })
        return
      }
      wx.showToast({ title: (e && (e.msg || e.message)) || '提交失败', icon: 'none' })
    } finally {
      this.setData({ submitting: false })
    }
  },

  async queryOutboundList() {
    this.setData({ queryLoading: true })
    try {
      const res = await getOutboundList({
        page: 1,
        size: 20,
        materialCode: (this.data.materialCode || '').trim() || undefined
      })
      const data = res.data || {}
      const records = Array.isArray(data.records) ? data.records : []
      this.setData({ outboundList: records.map(item => this.normalizeRecord(item)) })
    } catch (e) {
      wx.showToast({ title: (e && (e.msg || e.message)) || '查询失败', icon: 'none' })
      this.setData({ outboundList: [] })
    } finally {
      this.setData({ queryLoading: false })
    }
  }
})
