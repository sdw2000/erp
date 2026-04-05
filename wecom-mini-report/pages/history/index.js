const { getReportWorkList } = require('../../api/report')

Page({
  data: {
    processTypeOptions: [
      { label: '涂布 COATING', value: 'COATING' },
      { label: '复卷 REWINDING', value: 'REWINDING' },
      { label: '分切 SLITTING', value: 'SLITTING' }
    ],
    processTypeIndex: 0,
    scheduleId: '',
    loading: false,
    list: []
  },

  onScheduleIdInput(e) {
    this.setData({ scheduleId: e.detail.value })
  },

  onProcessTypeChange(e) {
    this.setData({ processTypeIndex: Number(e.detail.value) || 0 })
  },

  async onQuery() {
    const { scheduleId, processTypeOptions, processTypeIndex } = this.data
    if (!scheduleId) {
      wx.showToast({ title: '请填写 scheduleId', icon: 'none' })
      return
    }

    this.setData({ loading: true })
    try {
      const res = await getReportWorkList({
        scheduleId: Number(scheduleId),
        processType: processTypeOptions[processTypeIndex].value
      })
      this.setData({ list: Array.isArray(res.data) ? res.data : [] })
    } catch (e) {
      wx.showToast({ title: (e && (e.msg || e.message)) || '查询失败', icon: 'none' })
      this.setData({ list: [] })
    } finally {
      this.setData({ loading: false })
    }
  }
})
