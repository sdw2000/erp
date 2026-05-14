const { createSampleOrder, generateSampleNo } = require('../../api/sales')
const { getToken, clearToken } = require('../../utils/auth')

function todayText() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

Page({
  data: {
    sampleNo: '',
    customerName: '',
    contactName: '',
    contactPhone: '',
    contactAddress: '',
    sendDate: todayText(),
    expectedFeedbackDate: '',

    materialCode: '',
    materialName: '',
    specification: '',
    quantity: '1',
    unit: '卷',

    remark: '',
    submitting: false,
    lastSampleNo: ''
  },

  onShow() {
    const token = getToken()
    if (!token) {
      wx.reLaunch({ url: '/pages/login/index' })
    }
  },

  onInput(e) {
    const key = e.currentTarget.dataset.key
    this.setData({ [key]: e.detail.value || '' })
  },

  async onGenerateSampleNo() {
    try {
      const res = await generateSampleNo()
      const sampleNo = (res && res.data) || ''
      this.setData({ sampleNo: sampleNo || '' })
      if (sampleNo) {
        wx.showToast({ title: '样板单号已生成', icon: 'success' })
      }
    } catch (e) {
      wx.showToast({ title: (e && (e.msg || e.message)) || '生成失败', icon: 'none' })
    }
  },

  async onSubmit() {
    if (!this.data.customerName) {
      wx.showToast({ title: '请填写客户名称', icon: 'none' })
      return
    }
    if (!this.data.materialCode && !this.data.materialName) {
      wx.showToast({ title: '请填写样品信息', icon: 'none' })
      return
    }

    const payload = {
      sampleNo: this.data.sampleNo || undefined,
      customerName: this.data.customerName,
      contactName: this.data.contactName || undefined,
      contactPhone: this.data.contactPhone || undefined,
      contactAddress: this.data.contactAddress || undefined,
      sendDate: this.data.sendDate || todayText(),
      expectedFeedbackDate: this.data.expectedFeedbackDate || undefined,
      status: '待反馈',
      remark: this.data.remark || undefined,
      items: [
        {
          materialCode: this.data.materialCode || undefined,
          materialName: this.data.materialName || undefined,
          specification: this.data.specification || undefined,
          quantity: Number(this.data.quantity || 1),
          unit: this.data.unit || '卷'
        }
      ]
    }

    this.setData({ submitting: true })
    try {
      const res = await createSampleOrder(payload)
      const sampleNo = (res && res.data) || payload.sampleNo || ''
      this.setData({ lastSampleNo: sampleNo })
      wx.showToast({ title: '样板单创建成功', icon: 'success' })
    } catch (e) {
      if (e && (e.code === 50008 || e.code === 50012 || e.code === 50014)) {
        clearToken()
        wx.reLaunch({ url: '/pages/login/index' })
        return
      }
      wx.showToast({ title: (e && (e.msg || e.message)) || '创建失败', icon: 'none' })
    } finally {
      this.setData({ submitting: false })
    }
  }
})
