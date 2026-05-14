const {
  reportWork,
  getCoatingSchedulesPage,
  getRewindingSchedulesPage,
  getSlittingSchedulesPage
} = require('../../api/report')
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
    lastResult: null,
    canReport: true,
    canWarehouse: false,
    canSales: false,
    roles: [],
    scheduleLoading: false,
    scheduleList: [],
    scheduleDisplayList: [],
    scheduleKeyword: '',
    scanCode: '',
    lineOptions: ['全部线别'],
    lineOptionValues: [''],
    selectedLineIndex: 0,
    selectedScheduleIndex: -1,
    selectedScheduleId: ''
  },

  onShow() {
    const token = getToken()
    if (!token) {
      wx.reLaunch({ url: '/pages/login/index' })
      return
    }
    const userInfo = getUserInfo() || {}
    const name = userInfo.name || userInfo.username || ''
    const roles = Array.isArray(userInfo.roles) ? userInfo.roles : []
    const canWarehouse = roles.includes('warehouse') || roles.includes('admin')
    const canReport = roles.includes('production') || roles.includes('admin')
    const canSales = roles.includes('sales') || roles.includes('finance') || roles.includes('admin')
    if (name && !this.data.operator) {
      this.setData({ operator: name })
    }
    this.setData({ roles, canWarehouse, canReport, canSales })

    if (canReport) {
      this.loadSchedules()
    }
  },

  onProcessTypeChange(e) {
    const processTypeIndex = Number(e.detail.value) || 0
    const processType = this.data.processTypeOptions[processTypeIndex].value
    this.setData({
      processTypeIndex,
      selectedScheduleIndex: -1,
      selectedScheduleId: '',
      scheduleList: [],
      scheduleDisplayList: [],
      scheduleId: '',
      orderDetailId: '',
      lineOptions: ['全部线别'],
      lineOptionValues: [''],
      selectedLineIndex: 0,
      scanCode: ''
    })
    if (processType) this.loadSchedules()
  },
  onScheduleIdInput(e) { this.setData({ scheduleId: e.detail.value }) },
  onOrderDetailIdInput(e) { this.setData({ orderDetailId: e.detail.value }) },
  onProducedQtyInput(e) { this.setData({ producedQty: e.detail.value }) },
  onOperatorInput(e) { this.setData({ operator: e.detail.value }) },
  onStartTimeInput(e) { this.setData({ startTime: e.detail.value }) },
  onEndTimeInput(e) { this.setData({ endTime: e.detail.value }) },
  onRemarkInput(e) { this.setData({ remark: e.detail.value }) },
  onProceedNextChange(e) { this.setData({ proceedNextProcess: !!e.detail.value }) },
  onScheduleKeywordInput(e) {
    this.setData({ scheduleKeyword: e.detail.value || '' })
    this.applyScheduleFilter()
  },

  onLineChange(e) {
    const selectedLineIndex = Number(e.detail.value) || 0
    const preferredLine = this.data.lineOptionValues[selectedLineIndex] || ''
    this.setData({ selectedLineIndex })
    this.applyScheduleFilter()
    this.loadSchedules({ preserveSelectedLine: true, preferredLine })
  },

  normalizeSchedule(row) {
    const scheduleId = row.schedule_id || row.scheduleId || row.id
    const orderDetailId = row.order_detail_id || row.orderDetailId || row.detail_id || row.detailId
    const materialCode = row.material_code || row.materialCode || '-'
    const orderNo = row.order_no || row.orderNo || '-'
    const plannedArea = row.planned_area || row.plannedArea || row.plan_area || row.planArea || row.planned_meters || row.plannedMeters || row.planned_length || row.plannedLength || '-'
    const line = row.coating_line || row.coatingLine || row.rewinding_line || row.rewindingLine || row.slitting_line || row.slittingLine || row.equipment_code || row.equipmentCode || row.coating_equipment || row.coatingEquipment || row.rewinding_equipment || row.rewindingEquipment || row.slitting_equipment || row.slittingEquipment || row.equipment_name || row.equipmentName || row.line_name || row.lineName || ''
    return {
      scheduleId,
      orderDetailId,
      materialCode,
      orderNo,
      plannedArea,
      line
    }
  },

  getCurrentProcessType() {
    return this.data.processTypeOptions[this.data.processTypeIndex].value
  },

  getScheduleApiByProcessType(processType) {
    if (processType === 'REWINDING') return getRewindingSchedulesPage
    if (processType === 'SLITTING') return getSlittingSchedulesPage
    return getCoatingSchedulesPage
  },

  buildLineOptions(list) {
    const source = Array.isArray(list) ? list : []
    const values = source
      .flatMap(item => String(item.line || '').split(','))
      .map(item => item.trim())
      .filter(Boolean)
      .filter((value, index, arr) => arr.indexOf(value) === index)
      .sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'))
    return {
      lineOptions: ['全部线别', ...values],
      lineOptionValues: ['', ...values]
    }
  },

  async loadSchedules(options = {}) {
    const preserveSelectedLine = !!options.preserveSelectedLine
    const preferredLine = options.preferredLine || ''
    const currentSelectedLine = this.data.lineOptionValues[this.data.selectedLineIndex] || ''
    const processType = this.getCurrentProcessType()
    const requestApi = this.getScheduleApiByProcessType(processType)
    this.setData({ scheduleLoading: true })
    try {
      const res = await requestApi({
        current: 1,
        size: 30,
        includeCompleted: false
      })
      const pageData = res && res.data ? res.data : {}
      const records = Array.isArray(pageData.records) ? pageData.records : []
      const normalized = records.map(item => this.normalizeSchedule(item))
      const { lineOptions, lineOptionValues } = this.buildLineOptions(normalized)
      const targetLine = preferredLine || (preserveSelectedLine ? currentSelectedLine : '')
      const nextSelectedLineIndex = targetLine ? Math.max(0, lineOptionValues.indexOf(targetLine)) : 0
      this.setData({
        scheduleList: normalized,
        lineOptions,
        lineOptionValues,
        selectedLineIndex: nextSelectedLineIndex,
        selectedScheduleIndex: -1,
        selectedScheduleId: '',
        scheduleId: '',
        orderDetailId: ''
      })
      this.applyScheduleFilter()
    } catch (e) {
      wx.showToast({ title: (e && (e.msg || e.message)) || '排程加载失败', icon: 'none' })
      this.setData({ scheduleList: [], scheduleDisplayList: [] })
    } finally {
      this.setData({ scheduleLoading: false })
    }
  },

  applyScheduleFilter() {
    const keyword = (this.data.scheduleKeyword || '').trim().toUpperCase()
    const list = Array.isArray(this.data.scheduleList) ? this.data.scheduleList : []
    const selectedLine = this.data.lineOptionValues[this.data.selectedLineIndex] || ''
    const matchLine = (item) => {
      if (!selectedLine) {
        return true
      }
      const lines = String(item.line || '').split(',').map(v => v.trim()).filter(Boolean)
      return lines.includes(selectedLine)
    }
    if (!keyword) {
      const base = list.filter(item => matchLine(item))
      this.setData({ scheduleDisplayList: base })
      return
    }
    const filtered = list.filter(item => {
      if (!matchLine(item)) {
        return false
      }
      const orderNo = String(item.orderNo || '').toUpperCase()
      const materialCode = String(item.materialCode || '').toUpperCase()
      const scheduleId = String(item.scheduleId || '').toUpperCase()
      return orderNo.includes(keyword) || materialCode.includes(keyword) || scheduleId.includes(keyword)
    })
    this.setData({ scheduleDisplayList: filtered })
  },

  onSelectSchedule(e) {
    const index = Number(e.currentTarget.dataset.index)
    const row = this.data.scheduleDisplayList[index]
    if (!row) {
      return
    }
    const realIndex = this.data.scheduleList.findIndex(item =>
      String(item.scheduleId || '') === String(row.scheduleId || '') &&
      String(item.orderDetailId || '') === String(row.orderDetailId || '')
    )
    this.setData({
      selectedScheduleIndex: realIndex,
      selectedScheduleId: row.scheduleId ? String(row.scheduleId) : '',
      scheduleId: row.scheduleId ? String(row.scheduleId) : '',
      orderDetailId: row.orderDetailId ? String(row.orderDetailId) : ''
    })
  },

  onScanCodeInput(e) {
    this.setData({ scanCode: e.detail.value || '' })
  },

  findRowByScanCode(code) {
    const text = String(code || '').trim()
    if (!text) return null
    const upper = text.toUpperCase()
    const digits = upper.replace(/\D/g, '')
    const list = Array.isArray(this.data.scheduleList) ? this.data.scheduleList : []
    return list.find((row) => {
      const scheduleId = String(row.scheduleId || '').trim()
      const orderDetailId = String(row.orderDetailId || '').trim()
      const orderNo = String(row.orderNo || '').trim().toUpperCase()
      const materialCode = String(row.materialCode || '').trim().toUpperCase()
      if (scheduleId && (scheduleId === upper || scheduleId === digits)) return true
      if (orderDetailId && (orderDetailId === upper || orderDetailId === digits)) return true
      if (orderNo && orderNo === upper) return true
      if (materialCode && materialCode === upper) return true
      return false
    }) || null
  },

  applyScanSelectSchedule(rawCode) {
    const code = String(rawCode || '').trim()
    if (!code) {
      wx.showToast({ title: '请先输入或扫码', icon: 'none' })
      return
    }
    const row = this.findRowByScanCode(code)
    if (!row) {
      wx.showToast({ title: '未找到对应排程', icon: 'none' })
      return
    }
    const realIndex = this.data.scheduleList.findIndex(item =>
      String(item.scheduleId || '') === String(row.scheduleId || '') &&
      String(item.orderDetailId || '') === String(row.orderDetailId || '')
    )
    this.setData({
      selectedScheduleIndex: realIndex,
      selectedScheduleId: row.scheduleId ? String(row.scheduleId) : '',
      scheduleId: row.scheduleId ? String(row.scheduleId) : '',
      orderDetailId: row.orderDetailId ? String(row.orderDetailId) : '',
      scanCode: code
    })
    this.applyScheduleFilter()
  },

  onScanSelectSchedule() {
    this.applyScanSelectSchedule(this.data.scanCode)
  },

  onScanCodeTap() {
    wx.scanCode({
      scanType: ['qrCode', 'barCode'],
      success: (res) => {
        const result = (res && (res.result || res.rawData)) || ''
        this.applyScanSelectSchedule(result)
      },
      fail: () => {
        wx.showToast({ title: '扫码已取消', icon: 'none' })
      }
    })
  },

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

    if (!scheduleId) {
      wx.showToast({ title: '请先从排程列表选择条目', icon: 'none' })
      return
    }
    if (!this.data.canReport) {
      wx.showToast({ title: '当前账号无报工权限', icon: 'none' })
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
  },

  goIssue() {
    wx.navigateTo({ url: '/pages/issue/index' })
  },

  goOutbound() {
    wx.navigateTo({ url: '/pages/outbound/index' })
  },

  goInbound() {
    wx.navigateTo({ url: '/pages/inbound/index' })
  },

  goStocktake() {
    wx.navigateTo({ url: '/pages/stocktake/index' })
  },

  goSales() {
    wx.navigateTo({ url: '/pages/sales/index' })
  },

  goSalesOrder() {
    wx.navigateTo({ url: '/pages/sales-order/index' })
  },

  goSampleOrder() {
    wx.navigateTo({ url: '/pages/sample-order/index' })
  },

  goDelivery() {
    wx.navigateTo({ url: '/pages/delivery/index' })
  }
})
