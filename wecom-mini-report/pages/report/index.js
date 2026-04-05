const { reportWork } = require('../../api/report')
const { getToken, getUserInfo, clearToken } = require('../../utils/auth')

function nowText() {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`
}

Page({
  data: {
    processTypeOptions: [
      { label: '涂布 COATING', value: 'COATING' },
      { label: '复卷 REWINDING', value: 'REWINDING' },
      { label: '分切 SLITTING', value: 'SLITTING' }
    ],
    processTypeIndex: 0,
    scheduleId: '',
    orderDetailId: '',
    producedQty: '',
    operator: '',
    startTime: nowText(),
    endTime: nowText(),
    remark: '',
    proceedNextProcess: true,
    submitting: false,
    lastResult: null
  },

  onShow() {
    const token = getToken()
    if (!token) {
      wx.reLaunch({ url: '/pages/login/index' })
      return
    }
    const userInfo = getUserInfo() || {}
    const name = userInfo.name || userInfo.username || ''
    if (name && !this.data.operator) {
      this.setData({ operator: name })
    }
  },

  onProcessTypeChange(e) { this.setData({ processTypeIndex: Number(e.detail.value) || 0 }) },
  onScheduleIdInput(e) { this.setData({ scheduleId: e.detail.value }) },
  onOrderDetailIdInput(e) { this.setData({ orderDetailId: e.detail.value }) },
  onProducedQtyInput(e) { this.setData({ producedQty: e.detail.value }) },
  onOperatorInput(e) { this.setData({ operator: e.detail.value }) },
  onStartTimeInput(e) { this.setData({ startTime: e.detail.value }) },
  onEndTimeInput(e) { this.setData({ endTime: e.detail.value }) },
  onRemarkInput(e) { this.setData({ remark: e.detail.value }) },
  onProceedNextChange(e) { this.setData({ proceedNextProcess: !!e.detail.value }) },

  async onSubmit() {
    const {
      processTypeOptions,
      processTypeIndex,
      scheduleId,
      orderDetailId,
      producedQty,
      operator,
      startTime,
      endTime,
      remark,
      proceedNextProcess
    } = this.data

    if (!scheduleId && !orderDetailId) {
      wx.showToast({ title: 'scheduleId 和 orderDetailId 不能同时为空', icon: 'none' })
      return
    }
    if (!producedQty) {
      wx.showToast({ title: '请填写产量 producedQty', icon: 'none' })
      return
    }

    const payload = {
      processType: processTypeOptions[processTypeIndex].value,
      scheduleId: scheduleId ? Number(scheduleId) : undefined,
      orderDetailId: orderDetailId ? Number(orderDetailId) : undefined,
      producedQty: Number(producedQty),
      startTime: startTime || nowText(),
      endTime: endTime || nowText(),
      operator: operator || undefined,
      remark: remark || undefined,
      proceedNextProcess: !!proceedNextProcess
    }

    this.setData({ submitting: true })
    try {
      const res = await reportWork(payload)
      this.setData({ lastResult: res.data || null })
      wx.showToast({ title: '报工成功', icon: 'success' })
    } catch (e) {
      if (e && (e.code === 50008 || e.code === 50012 || e.code === 50014)) {
        clearToken()
        wx.reLaunch({ url: '/pages/login/index' })
        return
      }
      wx.showToast({ title: (e && (e.msg || e.message)) || '报工失败', icon: 'none' })
    } finally {
      this.setData({ submitting: false })
    }
  },

  goHistory() {
    wx.navigateTo({ url: '/pages/history/index' })
  }
})
