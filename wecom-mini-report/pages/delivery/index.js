const { createDeliveryNotice, getSalesOrderDetail } = require('../../api/sales')
const { getToken, clearToken } = require('../../utils/auth')

function todayText() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function makeSpec(item) {
  const t = item && item.thickness != null ? item.thickness : ''
  const w = item && item.width != null ? item.width : ''
  const l = item && item.length != null ? item.length : ''
  if (t === '' && w === '' && l === '') return ''
  return `${t}μm*${w}mm*${l}m`
}

Page({
  data: {
    orderNo: '',
    orderId: '',
    customer: '',
    customerOrderNo: '',
    deliveryDate: todayText(),
    deliveryAddress: '',
    contactPerson: '',
    contactPhone: '',
    carrierName: '',
    carrierNo: '',
    remark: '',

    orderLoading: false,
    orderItems: [],
    selectedItemIndex: 0,
    quantity: '',

    submitting: false,
    lastNoticeNo: ''
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

  onItemChange(e) {
    const selectedItemIndex = Number(e.detail.value) || 0
    const item = this.data.orderItems[selectedItemIndex] || {}
    this.setData({
      selectedItemIndex,
      quantity: item.rolls != null ? String(item.rolls) : this.data.quantity
    })
  },

  async onLoadOrder() {
    if (!this.data.orderNo) {
      wx.showToast({ title: '请先输入订单号', icon: 'none' })
      return
    }
    this.setData({ orderLoading: true })
    try {
      const res = await getSalesOrderDetail(this.data.orderNo)
      const order = (res && res.data) || {}
      const items = Array.isArray(order.items) ? order.items : []
      this.setData({
        orderId: order.id || '',
        customer: order.customer || '',
        customerOrderNo: order.customerOrderNo || '',
        deliveryAddress: order.deliveryAddress || '',
        orderItems: items,
        selectedItemIndex: 0,
        quantity: items[0] && items[0].rolls != null ? String(items[0].rolls) : ''
      })
      wx.showToast({ title: '订单明细已加载', icon: 'success' })
    } catch (e) {
      wx.showToast({ title: (e && (e.msg || e.message)) || '加载订单失败', icon: 'none' })
      this.setData({ orderItems: [] })
    } finally {
      this.setData({ orderLoading: false })
    }
  },

  async onSubmit() {
    if (!this.data.orderNo) {
      wx.showToast({ title: '请填写订单号', icon: 'none' })
      return
    }
    if (!this.data.deliveryDate) {
      wx.showToast({ title: '请填写发货日期', icon: 'none' })
      return
    }
    if (!this.data.carrierName) {
      wx.showToast({ title: '请填写物流公司', icon: 'none' })
      return
    }
    if (!this.data.quantity) {
      wx.showToast({ title: '请填写发货数量', icon: 'none' })
      return
    }

    const item = this.data.orderItems[this.data.selectedItemIndex] || {}
    const payload = {
      orderId: this.data.orderId ? Number(this.data.orderId) : undefined,
      orderNo: this.data.orderNo,
      customer: this.data.customer || undefined,
      customerOrderNo: this.data.customerOrderNo || undefined,
      deliveryDate: this.data.deliveryDate,
      deliveryAddress: this.data.deliveryAddress || undefined,
      contactPerson: this.data.contactPerson || undefined,
      contactPhone: this.data.contactPhone || undefined,
      carrierName: this.data.carrierName,
      carrierNo: this.data.carrierNo || undefined,
      remark: this.data.remark || undefined,
      items: [
        {
          orderItemId: item.id || undefined,
          materialCode: item.materialCode || undefined,
          spec: makeSpec(item),
          quantity: Number(this.data.quantity || 0),
          remark: item.remark || undefined
        }
      ]
    }

    this.setData({ submitting: true })
    try {
      const res = await createDeliveryNotice(payload)
      const notice = (res && res.data) || {}
      this.setData({ lastNoticeNo: notice.noticeNo || '' })
      wx.showToast({ title: '发货通知已创建', icon: 'success' })
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
