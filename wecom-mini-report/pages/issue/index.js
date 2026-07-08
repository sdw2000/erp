const {
  getMaterialIssueTemplate,
  issueMaterial,
  getMaterialIssues,
  getCoatingSchedulesPage
} = require('../../api/report')
const { getStaffList } = require('../../api/user')
const { getTapeStockList, getStockByQrCode, simpleIssueMaterial } = require('../../api/stock')
const { getToken, getUserInfo, clearToken } = require('../../utils/auth')

function emptyIssue() {
  return {
    materialType: '',
    materialCode: '',
    materialName: '',
    unit: '',
    stockId: '',
    rollCode: '',
    planArea: '',
    actualArea: '',
    lossArea: '',
    remark: '',
    packCount: '',
    batchOptions: [],
    planLabel: '计划数量',
    actualLabel: '实际数量',
    lossLabel: '损耗数量'
  }
}

Page({
  data: {
    scene: 'default',
    isCoatingScene: false,
    isSimplifiedMode: false, // 简化模式，用于包装领料
    pageTitle: '领料登记',
    pageDesc: '优先填写 scheduleId；可先带出BOM模板再提交',
    processTypeOptions: [
      { label: '涂布 COATING', value: 'COATING' },
      { label: '复卷 REWINDING', value: 'REWINDING' },
      { label: '分切 SLITTING', value: 'SLITTING' }
    ],
    processTypeIndex: 0,
    scheduleId: '',
    orderDetailId: '',
    operator: '',
    remark: '',
    qrCode: '',
    qrLoading: false,
    materialIssues: [emptyIssue()],
    loadingTemplate: false,
    submitting: false,
    autoSplitLoading: false,
    queryLoading: false,
    issueHistory: [],
    scheduleLoading: false,
    scheduleList: [],
    scheduleDisplayList: [],
    scheduleKeyword: '',
    scanCode: '',
    lineOptions: ['全部线别'],
    lineOptionValues: [''],
    selectedLineIndex: 0,
    selectedScheduleId: '',

    // 简化模式专有
    targetSectionOptions: ['包装','分切','复卷','涂布','成品仓'],
    targetSectionIndex: 0,
    targetPerson: '',
    targetPersonIndex: 0,
    staffOptions: ['加载人员中...'],
    staffList: [],
    simpleScannedList: [] // 简化模式扫码列表
  },

  onLoad(options = {}) {
    const scene = (options.scene || '').trim()
    console.log('Issue onLoad scene:', scene)
    
    // 如果没有指定场景，通过工序索引尝试识别 (如果是从通用入口进入)
    if (scene === 'coatingIssue') {
      this.setData({
        scene,
        isCoatingScene: true,
        pageTitle: '涂布领料登记',
        pageDesc: '默认工序为涂布 COATING，可按排程带出模板后提交',
        processTypeIndex: 0,
        remark: 'SCENE=COATING_ISSUE'
      })
      wx.setNavigationBarTitle({ title: '涂布领料' })
      return
    }
    if (scene === 'packagingIssue') {
      this.setData({
        scene,
        isSimplifiedMode: true,
        pageTitle: '包装领料登记',
        pageDesc: '极简模式：扫码 -> 填入领料量 -> 提交至线边仓',
        processTypeIndex: 2,
        remark: 'SCENE=PACKAGING_ISSUE',
        targetSectionIndex: 0 
      })
      wx.setNavigationBarTitle({ title: '包装领料' })
      this.loadPackagingStaff()
      return
    }

    // 默认情况
    this.setData({ scene: 'default' })
  },

  async loadPackagingStaff() {
    try {
      // 同时加载：包装A组(5)、包装B组(4)、以及部门为“包装”的人员
      const [resA, resB, resDept] = await Promise.all([
        getStaffList({ page: 1, size: 50, teamId: 5, status: 'active' }),
        getStaffList({ page: 1, size: 50, teamId: 4, status: 'active' }),
        getStaffList({ page: 1, size: 50, department: '包装', status: 'active' })
      ])
      
      let list = []
      if (resA.data && resA.data.list) list = list.concat(resA.data.list)
      if (resB.data && resB.data.list) list = list.concat(resB.data.list)
      if (resDept.data && resDept.data.list) list = list.concat(resDept.data.list)
      
      // 按照 ID 去重
      const uniqueMap = {}
      list.forEach(s => { if (s && s.id) uniqueMap[s.id] = s })
      let finalStaffs = Object.values(uniqueMap)

      // 如果还是没人（或者人太少），加载全部在职人员
      if (finalStaffs.length < 5) {
        const resAll = await getStaffList({ page: 1, size: 200, status: 'active' })
        if (resAll.data && resAll.data.list) {
          finalStaffs = resAll.data.list
        }
      }

      // 排序
      finalStaffs.sort((a, b) => a.staffName.localeCompare(b.staffName, 'zh-Hans-CN'))

      const options = finalStaffs.map(s => `${s.staffName} (${s.staffCode})`)
      if (options.length === 0) options.push('未找到人员')

      // 尝试匹配当前登录人
      const userInfo = getUserInfo() || {}
      const loginName = userInfo.name || userInfo.username || ''
      let matchIndex = 0
      if (loginName) {
        const idx = finalStaffs.findIndex(s => s.staffName === loginName)
        if (idx !== -1) matchIndex = idx
      }

      this.setData({
        staffList: finalStaffs,
        staffOptions: options,
        targetPersonIndex: matchIndex,
        targetPerson: finalStaffs[matchIndex] ? finalStaffs[matchIndex].staffName : ''
      })
    } catch (e) {
      console.error('Load staff failed', e)
      this.setData({ staffOptions: ['加载失败，请重试'] })
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
    if (name && !this.data.operator) {
      this.setData({ operator: name })
    }
    // 确保人员列表已加载
    if (!this.data.staffList || this.data.staffList.length <= 1) {
      this.loadPackagingStaff()
    }
    if (this.data.isCoatingScene) {
      this.loadCoatingSchedules()
    }
  },

  onTargetSectionChange(e) { this.setData({ targetSectionIndex: Number(e.detail.value) || 0 }) },
  onTargetPersonChange(e) {
    const index = Number(e.detail.value) || 0
    const staff = this.data.staffList[index]
    this.setData({
      targetPersonIndex: index,
      targetPerson: staff ? staff.staffName : ''
    })
  },
  onTargetPersonInput(e) { this.setData({ targetPerson: e.detail.value }) },

  // 极简扫码领料：连续扫码
  onScanSimple() {
    wx.scanCode({
      success: async (res) => {
        const qrCode = res.result
        if (!qrCode) return
        
        // 查找是否已在清单中
        const isDuplicate = this.data.simpleScannedList.some(i => i.qrCode === qrCode)
        if (isDuplicate) {
          wx.showToast({ title: '重复扫码，已忽略', icon: 'none' })
          return
        }

        wx.showLoading({ title: '识别中...' })
        try {
          const resStock = await getTapeStockList({ page: 1, size: 1, qrCode })
          const records = resStock.data.records
          if (records && records.length > 0) {
            const stock = records[0]
            const realLen = stock.currentLength || stock.length || '-'
            const thickness = stock.thickness || stock.thicknessUm || '-'
            const width = stock.width || stock.widthMm || '-'
            const newItem = {
              qrCode: stock.qrCode,
              materialCode: stock.materialCode,
              productName: stock.productName,
              width: stock.width,
              thickness: stock.thickness,
              spec: `${thickness}μm * ${width}mm * ${realLen}m`,
              totalRolls: stock.totalRolls || 0,
              systemArea: stock.totalSqm || 0,
              issueArea: stock.totalSqm || 0, // 默认领全额
              unit: stock.unit || '㎡',
              batchNo: stock.batchNo,
              remark: ''
            }
            this.setData({
              simpleScannedList: [newItem, ...this.data.simpleScannedList]
            })
            wx.vibrateShort()
          } else {
            wx.showToast({ title: '未找到库存', icon: 'none' })
          }
        } catch (e) {
          wx.showToast({ title: '查询失败', icon: 'none' })
        } finally {
          wx.hideLoading()
        }
      }
    })
  },

  onSimpleIssueInput(e) {
    const { index, key } = e.currentTarget.dataset
    const list = this.data.simpleScannedList.slice()
    list[index][key] = e.detail.value
    this.setData({ simpleScannedList: list })
  },

  removeSimpleRow(e) {
    const index = Number(e.currentTarget.dataset.index)
    const list = this.data.simpleScannedList.slice()
    list.splice(index, 1)
    this.setData({ simpleScannedList: list })
  },

  async submitSimpleIssue() {
    const { simpleScannedList, targetSectionOptions, targetSectionIndex, targetPerson, operator } = this.data
    if (!simpleScannedList.length) {
      wx.showToast({ title: '请先扫码', icon: 'none' })
      return
    }

    const targetSection = targetSectionOptions[targetSectionIndex]
    this.setData({ submitting: true })
    
    let successCount = 0
    let failCount = 0

    for (const item of simpleScannedList) {
      try {
        await simpleIssueMaterial({
          qrCode: item.qrCode,
          issueArea: item.issueArea,
          targetSection,
          targetPerson,
          operator,
          remark: item.remark
        })
        successCount++
      } catch (e) {
        failCount++
      }
    }

    this.setData({ submitting: false })
    if (failCount === 0) {
      wx.showModal({
        title: '提交成功',
        content: `成功记录 ${successCount} 项，请通知现场人员确认。`,
        showCancel: false,
        success: () => {
          this.setData({ simpleScannedList: [] })
        }
      })
    } else {
      wx.showToast({ title: `成功:${successCount}, 失败:${failCount}`, icon: 'none' })
    }
  },

  onProcessTypeChange(e) { this.setData({ processTypeIndex: Number(e.detail.value) || 0 }) },
  onScheduleIdInput(e) { this.setData({ scheduleId: e.detail.value }) },
  onOrderDetailIdInput(e) { this.setData({ orderDetailId: e.detail.value }) },
  onOperatorChange(e) {
    const idx = e.detail.value
    const name = this.data.staffOptions[idx]
    this.setData({
      staffIndex: idx,
      operator: name
    })
  },
  onRemarkInput(e) { this.setData({ remark: e.detail.value }) },
  onQrCodeInput(e) { this.setData({ qrCode: e.detail.value }) },
  onScheduleKeywordInput(e) {
    this.setData({ scheduleKeyword: e.detail.value || '' })
    this.applyScheduleFilter()
  },
  onScanCodeInput(e) { this.setData({ scanCode: e.detail.value || '' }) },

  onLineChange(e) {
    const selectedLineIndex = Number(e.detail.value) || 0
    this.setData({ selectedLineIndex })
    this.applyScheduleFilter()
  },

  normalizeSchedule(row = {}) {
    const scheduleId = row.schedule_id || row.scheduleId || row.id || ''
    const orderDetailId = row.order_detail_id || row.orderDetailId || row.detail_id || row.detailId || ''
    const orderNo = row.order_no || row.orderNo || '-'
    const materialCode = row.material_code || row.materialCode || '-'
    const plannedArea = row.planned_area || row.plannedArea || row.plan_area || row.planArea || row.planned_length || row.plannedLength || '-'
    const line = row.coating_line || row.coatingLine || row.equipment_code || row.equipmentCode || row.equipment_name || row.equipmentName || ''
    return { scheduleId, orderDetailId, orderNo, materialCode, plannedArea, line }
  },

  buildLineOptions(list) {
    const values = (Array.isArray(list) ? list : [])
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

  async loadCoatingSchedules() {
    if (!this.data.isCoatingScene) {
      return
    }
    this.setData({ scheduleLoading: true })
    try {
      const res = await getCoatingSchedulesPage({ current: 1, size: 50, includeCompleted: false })
      const pageData = (res && res.data) || {}
      const records = Array.isArray(pageData.records) ? pageData.records : []
      const scheduleList = records.map(item => this.normalizeSchedule(item))
      const { lineOptions, lineOptionValues } = this.buildLineOptions(scheduleList)
      this.setData({
        scheduleList,
        lineOptions,
        lineOptionValues,
        selectedLineIndex: 0,
        selectedScheduleId: ''
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
    const list = Array.isArray(this.data.scheduleList) ? this.data.scheduleList : []
    const keyword = String(this.data.scheduleKeyword || '').trim().toUpperCase()
    const selectedLine = this.data.lineOptionValues[this.data.selectedLineIndex] || ''
    const filtered = list.filter(item => {
      const lines = String(item.line || '').split(',').map(v => v.trim()).filter(Boolean)
      const lineMatched = !selectedLine || lines.includes(selectedLine)
      if (!lineMatched) {
        return false
      }
      if (!keyword) {
        return true
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
    const row = (this.data.scheduleDisplayList || [])[index]
    if (!row) {
      return
    }
    this.setData({
      selectedScheduleId: String(row.scheduleId || ''),
      scheduleId: String(row.scheduleId || ''),
      orderDetailId: String(row.orderDetailId || '')
    })
    this.loadTemplate()
    this.queryIssueHistory()
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

  onScanSelectSchedule() {
    const code = String(this.data.scanCode || '').trim()
    if (!code) {
      wx.showToast({ title: '请先输入扫码内容', icon: 'none' })
      return
    }
    const row = this.findRowByScanCode(code)
    if (!row) {
      wx.showToast({ title: '未匹配到排程', icon: 'none' })
      return
    }
    const idx = (this.data.scheduleDisplayList || []).findIndex(item => String(item.scheduleId || '') === String(row.scheduleId || ''))
    this.setData({
      selectedScheduleId: String(row.scheduleId || ''),
      scheduleId: String(row.scheduleId || ''),
      orderDetailId: String(row.orderDetailId || '')
    })
    if (idx >= 0) {
      this.setData({ scheduleKeyword: '' })
      this.applyScheduleFilter()
    }
    this.loadTemplate()
    this.queryIssueHistory()
  },

  onScanCodeTap() {
    wx.scanCode({
      scanType: ['qrCode', 'barCode'],
      success: (res) => {
        const result = (res && (res.result || res.rawData)) || ''
        this.setData({ scanCode: result })
        this.onScanSelectSchedule()
      },
      fail: () => {
        wx.showToast({ title: '扫码已取消', icon: 'none' })
      }
    })
  },

  getCurrentIssueProcessType() {
    if (this.data.isCoatingScene) {
      return 'COATING'
    }
    const options = this.data.processTypeOptions || []
    const index = Number(this.data.processTypeIndex) || 0
    return (options[index] && options[index].value) || 'COATING'
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

  async fillByQrCode() {
    const qrCode = (this.data.qrCode || '').trim()
    if (!qrCode) {
      wx.showToast({ title: '请先扫码或输入二维码', icon: 'none' })
      return
    }
    this.setData({ qrLoading: true })
    try {
      const res = await getStockByQrCode(qrCode)
      const stock = res && res.data
      if (!stock) {
        wx.showToast({ title: '未找到对应库存或任务', icon: 'none' })
        return
      }

      const list = this.data.materialIssues.slice()
      const scannedCode = (stock.materialCode || '').trim().toUpperCase()

      // 新增：料号不一致时弹出警告框
      if (list.length > 0) {
        const requiredCodes = list.map(item => (item.materialCode || '').trim().toUpperCase()).filter(c => c)
        // 如果模板里有要求的料号，且扫入的料号不在需求范围内
        if (requiredCodes.length > 0 && !requiredCodes.includes(scannedCode)) {
          const confirm = await new Promise(resolve => {
            wx.showModal({
              title: '领料错误',
              content: `扫入料号(${scannedCode})不在订单需求范围内！\n要求：${requiredCodes.join(' / ')}。\n是否强制录入？`,
              confirmText: '强制录入',
              cancelText: '取消',
              success: (mRes) => resolve(mRes.confirm)
            })
          })
          if (!confirm) return // 用户选择取消，停止后续逻辑
        }
      }

      if (!list.length) {
        list.push(emptyIssue())
      }
      
      // 智能匹配目标行：优先寻找料号一致且未填写卷号的行
      let targetIdx = list.findIndex(item => (item.materialCode || '').trim().toUpperCase() === scannedCode && !item.rollCode)
      if (targetIdx < 0) {
        // 找不到空的匹配行，找任意料号一致的行
        targetIdx = list.findIndex(item => (item.materialCode || '').trim().toUpperCase() === scannedCode)
      }
      if (targetIdx < 0) {
        // 找不到料号一致的，找第一个完全空白的行
        targetIdx = list.findIndex(item => !item.materialCode && !item.rollCode)
      }
      if (targetIdx < 0) {
        // 还没找到，默认更新第一行（或者可选 push 新行，这里保持更新首行以保持预览感）
        targetIdx = 0
      }

      const bizType = stock.bizType
      const isTask = bizType === 'PRODUCTION_TASK'
      
      const t = stock.thickness || stock.thicknessUm || '-'
      const w = stock.width || stock.widthMm || '-'
      const l = stock.currentLength || stock.length || '-'
      const spec = `${t}μm * ${w}mm * ${l}m`

      list[targetIdx] = {
        ...list[targetIdx],
        materialType: stock.rollType || stock.materialType || list[targetIdx].materialType,
        materialCode: stock.materialCode || list[targetIdx].materialCode,
        materialName: stock.productName || list[targetIdx].materialName,
        spec: spec || list[targetIdx].spec || '',
        stockId: stock.id || '',
        rollCode: stock.batchNo || stock.taskNo || list[targetIdx].rollCode,
        actualArea: stock.totalArea || stock.plannedArea || stock.targetArea || list[targetIdx].actualArea || '',
        remark: isTask ? `生产任务:${stock.taskNo}` : list[targetIdx].remark
      }
      this.setData({ materialIssues: this.decorateIssueListLabels(list) })
      wx.showToast({ title: isTask ? '已带出生产任务信息' : '已带出库存信息', icon: 'success' })
    } catch (e) {
      wx.showToast({ title: (e && (e.msg || e.message)) || '二维码查询失败', icon: 'none' })
    } finally {
      this.setData({ qrLoading: false })
    }
  },

  updateIssueField(index, key, value) {
    const list = this.data.materialIssues.slice()
    if (!list[index]) return
    list[index][key] = value
    list[index] = this.decorateIssueLabels(list[index])
    this.setData({ materialIssues: this.decorateIssueListLabels(list) })
  },

  normalizeDisplayUnit(unit) {
    const raw = String(unit || '').trim()
    if (!raw) return ''
    const upper = raw.toUpperCase().replace('²', '2')
    if (raw === '㎡' || raw === '平米' || raw === '平方' || raw === '平方米' || upper === 'M2' || upper === 'M^2') {
      return '㎡'
    }
    if (raw === '公斤' || raw === '千克' || upper === 'KG') {
      return 'kg'
    }
    return raw
  },

  inferQtyLabelsByRow(row = {}) {
    const unit = this.normalizeDisplayUnit(row.unit)
    const type = String(row.materialType || '').trim()
    if (unit === '㎡' || type === '薄膜' || type === '母卷') {
      return { planLabel: '计划面积', actualLabel: '实际面积', lossLabel: '损耗面积' }
    }
    if (unit === 'kg' || type === '原料' || type === '化工') {
      return { planLabel: '计划重量', actualLabel: '实际重量', lossLabel: '损耗重量' }
    }
    return { planLabel: '计划数量', actualLabel: '实际数量', lossLabel: '损耗数量' }
  },

  decorateIssueLabels(row = {}) {
    const normalizedUnit = this.normalizeDisplayUnit(row.unit)
    return {
      ...row,
      unit: normalizedUnit,
      ...this.inferQtyLabelsByRow({ ...row, unit: normalizedUnit })
    }
  },

  decorateIssueListLabels(list = []) {
    return (Array.isArray(list) ? list : []).map(item => this.decorateIssueLabels(item || {}))
  },

  onIssueInput(e) {
    const index = Number(e.currentTarget.dataset.index)
    const key = e.currentTarget.dataset.key
    this.updateIssueField(index, key, e.detail.value)
  },

  toNumber(value) {
    if (value === null || value === undefined || value === '') {
      return 0
    }
    const n = Number(value)
    return Number.isFinite(n) ? n : 0
  },

  cloneIssueWithOption(base, option, qty, seqText) {
    const row = {
      ...base,
      stockId: option.stockId || base.stockId || '',
      rollCode: option.batchNo || base.rollCode || '',
      // 计划数量沿用BOM计划值，不随拆分动作改变
      planArea: base.planArea,
      actualArea: qty,
      lossArea: base.lossArea || '',
      packCount: '',
      remark: `${base.remark || '按BOM自动带出'}${seqText ? `;${seqText}` : ''}`,
      unit: base.unit || option.unit || '',
      batchOptions: base.batchOptions || []
    }
    return row
  },

  splitIssueByQty(base) {
    const options = Array.isArray(base.batchOptions) ? base.batchOptions : []
    let target = this.toNumber(base.actualArea)
    if (target <= 0) {
      target = this.toNumber(base.planArea)
    }
    if (!options.length || target <= 0) {
      return { rows: [], remain: target }
    }
    let remain = target
    const rows = []
    for (let i = 0; i < options.length && remain > 0; i++) {
      const opt = options[i] || {}
      const available = this.toNumber(opt.availableQty)
      if (available <= 0) continue
      const take = Math.min(available, remain)
      if (take <= 0) continue
      rows.push(this.cloneIssueWithOption(base, opt, take, `自动拆分${i + 1}`))
      remain = Number((remain - take).toFixed(6))
    }
    return { rows, remain }
  },

  splitIssueByPack(base) {
    const options = Array.isArray(base.batchOptions) ? base.batchOptions : []
    const needPack = Math.floor(this.toNumber(base.packCount))
    if (!options.length || needPack <= 0) {
      return { rows: [], missing: needPack > 0 ? needPack : 0 }
    }
    const usable = options.filter(opt => this.toNumber(opt.availableQty) > 0)
    if (!usable.length) {
      return { rows: [], missing: needPack }
    }
    const takeCount = Math.min(needPack, usable.length)
    const rows = []
    for (let i = 0; i < takeCount; i++) {
      const opt = usable[i]
      const qty = this.toNumber(opt.packBaseQty) > 0 ? this.toNumber(opt.packBaseQty) : this.toNumber(opt.availableQty)
      rows.push(this.cloneIssueWithOption(base, opt, qty, `按桶/卷拆分${i + 1}`))
    }
    return { rows, missing: Math.max(needPack - takeCount, 0) }
  },

  onAutoSplitByQty(e) {
    const index = Number(e.currentTarget.dataset.index)
    const list = this.data.materialIssues.slice()
    const base = list[index]
    if (!base) {
      return
    }
    const options = Array.isArray(base.batchOptions) ? base.batchOptions : []
    if (!options.length) {
      wx.showToast({ title: '该行无可用库存明细', icon: 'none' })
      return
    }

    const target = this.toNumber(base.actualArea) > 0 ? this.toNumber(base.actualArea) : this.toNumber(base.planArea)
    if (target <= 0) {
      wx.showToast({ title: '请先填写计划/实际数量', icon: 'none' })
      return
    }

    const { rows, remain } = this.splitIssueByQty(base)

    if (!rows.length) {
      wx.showToast({ title: '无可拆分库存', icon: 'none' })
      return
    }
    if (remain > 0) {
      wx.showToast({ title: `库存不足，还差${remain}`, icon: 'none' })
    }

    const next = []
    for (let i = 0; i < list.length; i++) {
      if (i === index) {
        next.push(...rows)
      } else {
        next.push(list[i])
      }
    }
    this.setData({ materialIssues: this.decorateIssueListLabels(next) })
  },

  onAutoSplitByPack(e) {
    const index = Number(e.currentTarget.dataset.index)
    const list = this.data.materialIssues.slice()
    const base = list[index]
    if (!base) {
      return
    }
    const options = Array.isArray(base.batchOptions) ? base.batchOptions : []
    if (!options.length) {
      wx.showToast({ title: '该行无可用库存明细', icon: 'none' })
      return
    }

    const needPack = Math.floor(this.toNumber(base.packCount))
    if (needPack <= 0) {
      wx.showToast({ title: '请填写桶/卷数量', icon: 'none' })
      return
    }

    const { rows, missing } = this.splitIssueByPack(base)
    const takeCount = rows.length

    if (!rows.length) {
      wx.showToast({ title: '无可用库存明细', icon: 'none' })
      return
    }

    if (missing > 0) {
      wx.showToast({ title: `库存明细不足，仅拆分${takeCount}条`, icon: 'none' })
    }

    const next = []
    for (let i = 0; i < list.length; i++) {
      if (i === index) {
        next.push(...rows)
      } else {
        next.push(list[i])
      }
    }
    this.setData({ materialIssues: this.decorateIssueListLabels(next) })
  },

  onAutoSplitAllByQty() {
    const list = this.data.materialIssues.slice()
    if (!list.length) {
      wx.showToast({ title: '暂无可拆分行', icon: 'none' })
      return
    }
    const next = []
    let affected = 0
    let shortage = 0
    list.forEach((row) => {
      const hasOptions = Array.isArray(row.batchOptions) && row.batchOptions.length > 0
      if (!hasOptions) {
        next.push(row)
        return
      }
      const target = this.toNumber(row.actualArea) > 0 ? this.toNumber(row.actualArea) : this.toNumber(row.planArea)
      if (target <= 0) {
        next.push(row)
        return
      }
      const { rows, remain } = this.splitIssueByQty(row)
      if (!rows.length) {
        next.push(row)
        return
      }
      affected++
      if (remain > 0) shortage++
      next.push(...rows)
    })
    this.setData({ materialIssues: this.decorateIssueListLabels(next) })
    wx.showToast({ title: shortage > 0 ? `已拆分${affected}行，${shortage}行库存不足` : `已拆分${affected}行`, icon: 'none' })
  },

  onAutoSplitAllByPack() {
    const list = this.data.materialIssues.slice()
    if (!list.length) {
      wx.showToast({ title: '暂无可拆分行', icon: 'none' })
      return
    }
    const next = []
    let affected = 0
    let shortage = 0
    list.forEach((row) => {
      const hasOptions = Array.isArray(row.batchOptions) && row.batchOptions.length > 0
      const needPack = Math.floor(this.toNumber(row.packCount))
      if (!hasOptions || needPack <= 0) {
        next.push(row)
        return
      }
      const { rows, missing } = this.splitIssueByPack(row)
      if (!rows.length) {
        next.push(row)
        return
      }
      affected++
      if (missing > 0) shortage++
      next.push(...rows)
    })
    this.setData({ materialIssues: this.decorateIssueListLabels(next) })
    wx.showToast({ title: shortage > 0 ? `已拆分${affected}行，${shortage}行明细不足` : `已拆分${affected}行`, icon: 'none' })
  },

  addIssueRow() {
    const list = this.data.materialIssues.slice()
    list.push(emptyIssue())
    this.setData({ materialIssues: this.decorateIssueListLabels(list) })
  },

  removeIssueRow(e) {
    const index = Number(e.currentTarget.dataset.index)
    const list = this.data.materialIssues.slice()
    if (list.length <= 1) {
      this.setData({ materialIssues: this.decorateIssueListLabels([emptyIssue()]) })
      return
    }
    list.splice(index, 1)
    this.setData({ materialIssues: this.decorateIssueListLabels(list) })
  },

  normalizeIssues() {
    return (this.data.materialIssues || [])
      .map(item => ({
        materialType: (item.materialType || '').trim() || undefined,
        materialCode: (item.materialCode || '').trim() || undefined,
        stockId: item.stockId ? Number(item.stockId) : undefined,
        rollCode: (item.rollCode || '').trim() || undefined,
        planArea: item.planArea === '' ? undefined : Number(item.planArea),
        actualArea: item.actualArea === '' ? undefined : Number(item.actualArea),
        lossArea: item.lossArea === '' ? undefined : Number(item.lossArea),
        remark: (item.remark || '').trim() || undefined
      }))
      .filter(item => {
        const hasQty = (Number(item.actualArea) > 0) || (Number(item.planArea) > 0) || (Number(item.lossArea) > 0)
        return hasQty || !!item.materialCode || !!item.rollCode
      })
  },

  async loadTemplate() {
    const { scheduleId, orderDetailId } = this.data
    if (!scheduleId && !orderDetailId) {
      wx.showToast({ title: '请先填写 scheduleId 或 orderDetailId', icon: 'none' })
      return
    }

    this.setData({ loadingTemplate: true })
    try {
      const res = await getMaterialIssueTemplate({
        scheduleId: scheduleId ? Number(scheduleId) : undefined,
        orderDetailId: orderDetailId ? Number(orderDetailId) : undefined,
        processType: this.getCurrentIssueProcessType()
      })
      const rows = Array.isArray(res.data) ? res.data : []
      if (rows.length === 0) {
        wx.showToast({ title: '未查询到BOM模板', icon: 'none' })
        return
      }
      const mapped = rows.map(row => {
        const t = row.thickness || row.thicknessUm || '-'
        const w = row.width || row.widthMm || '-'
        const l = row.length || row.lengthM || '-'
        const spec = (t !== '-' || w !== '-' || l !== '-') ? `${t}μm * ${w}mm * ${l}m` : (row.spec || row.specification || '')

        return {
          materialType: row.materialType || row.material_type || '',
          materialCode: row.materialCode || row.material_code || '',
          materialName: row.materialName || row.material_name || '',
          spec: spec,
          unit: row.unit || '',
          stockId: row.stockId || row.stock_id || '',
          rollCode: row.rollCode || row.roll_code || '',
          planArea: row.planArea || row.plan_area || '',
          actualArea: row.actualArea || row.actual_area || row.planArea || row.plan_area || '',
          lossArea: row.lossArea || row.loss_area || '',
          remark: row.remark || '',
          packCount: '',
          batchOptions: Array.isArray(row.batchOptions) ? row.batchOptions : []
        }
      })
      this.setData({ materialIssues: this.decorateIssueListLabels(mapped.length ? mapped : [emptyIssue()]) })
      wx.showToast({ title: '已带出模板', icon: 'success' })
    } catch (e) {
      wx.showToast({ title: (e && (e.msg || e.message)) || '模板加载失败', icon: 'none' })
    } finally {
      this.setData({ loadingTemplate: false })
    }
  },

  async submitIssue() {
    const { scheduleId, orderDetailId, operator, remark } = this.data
    if (!scheduleId && !orderDetailId) {
      wx.showToast({ title: 'scheduleId 和 orderDetailId 不能同时为空', icon: 'none' })
      return
    }

    const materialIssues = this.normalizeIssues()
    if (!materialIssues.length) {
      wx.showToast({ title: '请至少填写一条领料项', icon: 'none' })
      return
    }

    this.setData({ submitting: true })
    try {
      await issueMaterial({
        processType: this.getCurrentIssueProcessType(),
        scheduleId: scheduleId ? Number(scheduleId) : undefined,
        orderDetailId: orderDetailId ? Number(orderDetailId) : undefined,
        operator: (operator || '').trim() || undefined,
        remark: (remark || '').trim() || undefined,
        materialIssues
      })
      wx.showToast({ title: '领料登记成功', icon: 'success' })
      this.queryIssueHistory()
    } catch (e) {
      if (e && (e.code === 50008 || e.code === 50012 || e.code === 50014)) {
        clearToken()
        wx.reLaunch({ url: '/pages/login/index' })
        return
      }
      wx.showToast({ title: (e && (e.msg || e.message)) || '领料失败', icon: 'none' })
    } finally {
      this.setData({ submitting: false })
    }
  },

  async queryIssueHistory() {
    const { scheduleId } = this.data
    if (!scheduleId) {
      wx.showToast({ title: '查询历史需要 scheduleId', icon: 'none' })
      return
    }
    this.setData({ queryLoading: true })
    try {
      const res = await getMaterialIssues({
        scheduleId: Number(scheduleId),
        processType: this.getCurrentIssueProcessType()
      })
      this.setData({ issueHistory: Array.isArray(res.data) ? res.data : [] })
    } catch (e) {
      wx.showToast({ title: (e && (e.msg || e.message)) || '查询失败', icon: 'none' })
      this.setData({ issueHistory: [] })
    } finally {
      this.setData({ queryLoading: false })
    }
  }
})
