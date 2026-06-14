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
    list: [],
    pageNum: 1,
    pageSize: 10,
    hasMore: true
  },

  onScheduleIdInput(e) {
    this.setData({ scheduleId: e.detail.value })
  },

  onProcessTypeChange(e) {
    this.setData({ 
      processTypeIndex: Number(e.detail.value) || 0,
      pageNum: 1,
      list: [],
      hasMore: true
    }, () => {
      this.onQuery()
    })
  },

  async onQuery(isLoadMore = false) {
    if (this.data.loading) return
    if (isLoadMore && !this.data.hasMore) return

    const { scheduleId, processTypeOptions, processTypeIndex, pageNum, pageSize } = this.data
    
    this.setData({ loading: true })
    try {
      const res = await getReportWorkList({
        scheduleId: scheduleId ? Number(scheduleId) : undefined,
        processType: processTypeOptions[processTypeIndex].value,
        pageNum: isLoadMore ? pageNum + 1 : 1,
        pageSize
      })
      
      const newData = res.data.records || []
      const hasMore = newData.length === pageSize
      
      this.setData({ 
        list: isLoadMore ? this.data.list.concat(newData) : newData,
        pageNum: isLoadMore ? pageNum + 1 : 1,
        hasMore
      })
    } catch (e) {
      wx.showToast({ title: (e && (e.msg || e.message)) || '查询失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  onReachBottom() {
    this.onQuery(true)
  }
})
