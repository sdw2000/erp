const {
  reportWork,
  getCoatingSchedulesPage,
  getRewindingSchedulesPage,
  getSlittingSchedulesPage,
  getNextCoatingRollCode,
  savePrintRecord,
  issueMaterial,
  getMaterialIssues,
  getMaterialIssueTemplate
} = require('../../api/report')
const {
  getStockByQrCode
} = require('../../api/stock')
const { getToken, getUserInfo, clearToken } = require('../../utils/auth')
const { getStaffList } = require('../../api/user')

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
      { label: '涂布', value: 'COATING', unit: '㎡' },
      { label: '复卷', value: 'REWINDING', unit: '卷' },
      { label: '分切', value: 'SLITTING', unit: '卷' }
    ],
    displayProcessTypeOptions: [],
    processTypeIndex: 0,
    scheduleId: '',
    orderDetailId: '',
    producedQty: '',
    currentUnit: '㎡',
    operator: '',
    staffOptions: [],
    staffIndex: -1,
    startTime: nowText(),
    endTime: nowText(),
    remark: '',
    proceedNextProcess: true,
    submitting: false,
    lastResult: null,
    overReportConfirmed: false,
    canReport: true,
    canWarehouse: false,
    canSales: false,
    roles: [],
    scheduleLoading: false,
    scheduleList: [],
    scheduleDisplayList: [],
    scheduleKeyword: '',
    schedulePage: 1,
    scheduleTotal: 0,
    scheduleSize: 30,
    loadingMore: false,
    issueSubmitting: false,
    scanCode: '',
    lineOptions: ['全部线别'],
    lineOptionValues: [''],
    selectedLineIndex: 0,
    selectedScheduleIndex: -1,
    selectedScheduleId: '',
    selectedSchedule: null,
    issueHistory: [],
    issueTemplate: [], // 新增：领料需求模板用于校验
    netMaterialUsage: 0,
    referenceArea: 0, // 新增：参考面积
    showReportModal: false,
    // --- 领退料连续扫码 ---
    activeIssues: [], // 待提交的领退料队列
    showIssueEditModal: false,
    editingIssue: null,
    // --- 涂布专用逻辑 ---
    producedRolls: [],
    isCoatingStarted: false,
    currentRoll: {
      widthMm: '',
      lengthM: '',
      area: 0
    },
    remotePrint: true, // 默认开启远程打印
    form: {
      coatingUseRewindingLabel: false,
      rewindingMotherRollCode: '',
      rewindingSerialStart: 1,
      rewindingPrintCount: 0,
      widthMm: '',
      lengthM: '',
      materialCode: '',
      orderNo: '',
      customerOrderNo: '',
      thickness: ''
    }
  },

  onLoad(options) {
    if (options.scheduleId || options.orderDetailId) {
      this.setData({
        scheduleId: options.scheduleId || '',
        orderDetailId: options.orderDetailId || '',
        selectedScheduleId: options.scheduleId || ''
      })
      // 如果传了ID，尝试加载并匹配
      setTimeout(() => {
        if (options.processType) {
          const idx = this.data.processTypeOptions.findIndex(opt => opt.value === options.processType)
          if (idx !== -1) {
            this.setData({ 
              processTypeIndex: idx,
              currentUnit: this.data.processTypeOptions[idx].unit || '㎡'
            })
          }
        }
        this.loadSchedules()
      }, 300)
    }

    if (options.qrCode) {
      this.setData({ scanCode: options.qrCode })
      // 如果从扫码进来，延迟加载后自动匹配
      setTimeout(() => {
        this.onScanCodeTap()
      }, 500)
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
    const roles = Array.isArray(userInfo.roles) ? userInfo.roles : []
    const canWarehouse = roles.includes('warehouse') || roles.includes('admin') || roles.includes('packing')
    const canReport = roles.includes('coating') || roles.includes('admin') || roles.includes('packing')
    const canSales = roles.includes('sales') || roles.includes('finance') || roles.includes('admin')
    if (name && !this.data.operator) {
      this.setData({ operator: name })
    }

    // 根据角色过滤工序选项
    const allOptions = [
      { label: '涂布', value: 'COATING', unit: '㎡' },
      { label: '复卷', value: 'REWINDING', unit: '卷' },
      { label: '分切', value: 'SLITTING', unit: '卷' }
    ];
    let filteredOptions = [];
    if (roles.includes('admin')) {
      filteredOptions = allOptions;
    } else {
      const isPacking = roles.includes('packing');
      const isCoating = roles.includes('coating');
      
      if (isCoating) {
        filteredOptions.push(allOptions[0]); // 涂布
      }
      if (isPacking || isCoating) {
        filteredOptions.push(allOptions[1]); // 复卷
        filteredOptions.push(allOptions[2]); // 分切
      }
      // 如果什么都没有，至少给个分切或者保持空
      if (filteredOptions.length === 0) filteredOptions = allOptions;
    }

    // 确保去重
    filteredOptions = filteredOptions.filter((opt, index, self) => 
      index === self.findIndex((t) => t.value === opt.value)
    );

    const oldType = (this.data.processTypeOptions[this.data.processTypeIndex] || {}).value || '';
    let newIndex = filteredOptions.findIndex(opt => opt.value === oldType);
    if (newIndex === -1) {
      // 包装身份(packing)或管理员 → 默认分切；涂布身份(coating) → 默认涂布
      const isPacking = roles.includes('packing');
      if (isPacking || roles.includes('admin')) {
        const slittingIdx = filteredOptions.findIndex(opt => opt.value === 'SLITTING');
        newIndex = slittingIdx !== -1 ? slittingIdx : 0;
      } else {
        newIndex = 0; // coating 身份，第0个即涂布
      }
    }

    this.setData({ 
      roles, 
      canWarehouse, 
      canReport, 
      canSales,
      processTypeOptions: filteredOptions,
      processTypeIndex: newIndex,
      currentUnit: filteredOptions[newIndex] ? filteredOptions[newIndex].unit : '㎡'
    }, () => {
      // 在设置完工序索引后，加载对应车间的操作人
      this.loadStaffList()
    })

    if (canReport) {
      this.loadSchedules()
    }
  },

  loadStaffList(customIndex) {
    const index = customIndex !== undefined ? customIndex : this.data.processTypeIndex
    const processTypeObj = this.data.processTypeOptions[index]
    if (!processTypeObj) return

    const processType = processTypeObj.value
    // 根据工序自动匹配车间ID: 1-涂布, 2-复卷分切
    let workshopId = null
    if (processType === 'COATING') workshopId = 1
    else if (processType === 'REWINDING' || processType === 'SLITTING') workshopId = 2

    getStaffList({ page: 1, size: 500, status: 'active', workshopId }).then(res => {
      // 兼容后端不同的分页返回格式 (records 或 list)
      const list = (res.data && (res.data.list || res.data.records)) || []
      if (list.length > 0) {
        // 格式化为 "姓名 (工号)" 形式，方便区分
        const staff = list.map(s => s.staffName + (s.staffCode ? ` (${s.staffCode})` : '')).filter(n => !!n)
        this.setData({ staffOptions: staff })
        
        // 尝试匹配当前登录人 (只匹配姓名部分)
        if (this.data.operator) {
          const idx = staff.findIndex(opt => opt.startsWith(this.data.operator))
          if (idx !== -1) {
            this.setData({ staffIndex: idx })
          } else {
            // 如果切换车间后当前人不在列表中，清空索引避免误选
            this.setData({ staffIndex: -1 })
          }
        }
      } else {
        this.setData({ staffOptions: [], staffIndex: -1 })
      }
    })
  },

  onOperatorChange(e) {
    const idx = Number(e.detail.value)
    const displayVal = this.data.staffOptions[idx]
    // 提取姓名部分作为提交值
    const name = displayVal.includes(' (') ? displayVal.split(' (')[0] : displayVal
    this.setData({
      staffIndex: idx,
      operator: name
    })
  },

  onProcessTypeChange(e) {
    const processTypeIndex = Number(e.detail.value) || 0
    const processTypeObj = this.data.processTypeOptions[processTypeIndex]
    const processType = processTypeObj.value
    this.setData({
      processTypeIndex,
      currentUnit: processTypeObj.unit || '㎡',
      selectedScheduleIndex: -1,
      selectedScheduleId: '',
      scheduleList: [],
      scheduleDisplayList: [],
      scheduleId: '',
      orderDetailId: '',
      lineOptions: ['全部线别'],
      lineOptionValues: [''],
      selectedLineIndex: 0,
      scanCode: '',
      overReportConfirmed: false
    })
    if (processType) {
      this.loadSchedules()
      this.loadStaffList(processTypeIndex)
    }
  },
  onScheduleIdInput(e) { this.setData({ scheduleId: e.detail.value }) },
  onOrderDetailIdInput(e) { this.setData({ orderDetailId: e.detail.value }) },
  onProducedQtyInput(e) { 
    const val = e.detail.value
    this.setData({ producedQty: val, overReportConfirmed: false })
    this.calcReferenceArea(val)
  },
  calcReferenceArea(qty) {
    const q = parseFloat(qty)
    const { selectedSchedule, processTypeOptions, processTypeIndex } = this.data
    if (!selectedSchedule || isNaN(q) || q <= 0) {
      this.setData({ referenceArea: 0 })
      return
    }

    const processType = processTypeOptions[processTypeIndex].value
    
    // 只有复卷和分切需要对应算出平米（因为此时单位是卷）
    if (processType !== 'REWINDING' && processType !== 'SLITTING') {
      this.setData({ referenceArea: 0 })
      return
    }

    let width = parseFloat(selectedSchedule.width) || 0
    let length = parseFloat(selectedSchedule.length) || 0

    // 如果字段里没有直接拿到宽高，尝试从规格文本解析 (格式一般为: 38μm * 50mm * 3000m)
    if ((width <= 0 || length <= 0) && selectedSchedule.specText) {
      const parts = selectedSchedule.specText.split('*')
      if (parts.length >= 3) {
        const wMatch = parts[1].match(/(\d+\.?\d*)/)
        const lMatch = parts[2].match(/(\d+\.?\d*)/)
        if (wMatch) width = parseFloat(wMatch[1])
        if (lMatch) length = parseFloat(lMatch[1])
      }
    }

    if (width > 0 && length > 0) {
      // 宽度 (mm) * 长度 (m) * 卷数 / 1000 = 总平米
      const area = (width * length * q) / 1000
      this.setData({ referenceArea: area.toFixed(2) })
    } else {
      // 兜底方案：按排程总面积/排程总卷数的比例计算
      const planQty = parseFloat(selectedSchedule.plannedQty) || 0
      const planArea = parseFloat(selectedSchedule.plannedArea) || 0
      if (planQty > 0 && planArea > 0) {
        const areaPerRoll = planArea / planQty
        this.setData({ referenceArea: (q * areaPerRoll).toFixed(2) })
      } else {
        this.setData({ referenceArea: 0 })
      }
    }
  },
  onStartTimeInput(e) { this.setData({ startTime: e.detail.value }) },
  onEndTimeInput(e) { this.setData({ endTime: e.detail.value }) },
  onRemarkInput(e) { this.setData({ remark: e.detail.value }) },
  onProceedNextChange(e) { this.setData({ proceedNextProcess: !!e.detail.value }) },
  onScheduleKeywordInput(e) {
    this.setData({ scheduleKeyword: e.detail.value || '' })
    this.applyScheduleFilter()
  },

  // --- 涂布卷明细逻辑 ---
  onWidthInput(e) {
    const width = e.detail.value
    this.setData({ 'currentRoll.widthMm': width })
    this.calcCurrentRollArea()
  },
  onLengthInput(e) {
    const length = e.detail.value
    this.setData({ 'currentRoll.lengthM': length })
    this.calcCurrentRollArea()
  },
  calcCurrentRollArea() {
    const w = parseFloat(this.data.currentRoll.widthMm) || 0
    const l = parseFloat(this.data.currentRoll.lengthM) || 0
    const area = (w * l / 1000).toFixed(2)
    this.setData({ 'currentRoll.area': parseFloat(area) })
  },
  removeRoll(e) {
    const id = e.currentTarget.dataset.id
    const newList = this.data.producedRolls.filter(r => r.id !== id)
    this.setData({ producedRolls: newList })
    this.updateTotalProducedQty()
  },
  updateTotalProducedQty() {
    const total = this.data.producedRolls.reduce((sum, r) => sum + r.area, 0).toFixed(2)
    this.setData({ producedQty: parseFloat(total) })
  },
  onRemotePrintChange(e) {
    this.setData({ remotePrint: !!e.detail.value })
  },

  onLineChange(e) {
    const selectedLineIndex = Number(e.detail.value) || 0
    const preferredLine = this.data.lineOptionValues[selectedLineIndex] || ''
    this.setData({ selectedLineIndex })
    this.applyScheduleFilter()
    this.loadSchedules({ preserveSelectedLine: true, preferredLine })
  },

  normalizeSchedule(row) {
    const processType = this.getCurrentProcessType()
    const scheduleId = row.scheduleId || row.schedule_id || row.id || row.SCHEDULE_ID
    const orderDetailId = row.orderDetailId || row.order_detail_id || row.orderItemId || row.order_item_id || row.detailId || row.detail_id || row.ORDER_DETAIL_ID
    const materialCode = row.materialCode || row.material_code || '-'
    const orderNo = row.orderNo || row.order_no || '-'
    const customerCode = row.customerCode || row.customer_code || row.customer_name || row.customerName || ''
    
    let plannedQty = '-'
    if (processType === 'COATING') {
      plannedQty = row.coating_area || row.planSqm || row.plan_sqm || row.planned_area || row.plannedArea || row.plan_area || row.planArea || row.planned_meters || row.plannedMeters || row.planned_length || row.plannedLength || 0
    } else {
      plannedQty = row.schedule_qty || row.planRolls || row.plan_rolls || row.scheduleQty || row.plan_qty || row.planQty || row.rewinding_roll_count || row.rewindingRollCount || 0
    }
    
    // 如果是数字且不为0，显示保留整数或一位小数
    if (typeof plannedQty === 'number' || !isNaN(parseFloat(plannedQty))) {
      const q = parseFloat(plannedQty)
      plannedQty = q > 0 ? (q % 1 === 0 ? q : q.toFixed(1)) : (q === 0 ? '0' : '-')
    }

    const line = row.coating_line || row.coatingLine || row.coating_equipment || row.coatingEquipment || row.rewinding_line || row.rewindingLine || row.rewinding_equipment || row.rewindingEquipment || row.slitting_line || row.slittingLine || row.slitting_equipment || row.slittingEquipment || row.equipment_code || row.equipmentCode || row.equipment_name || row.equipmentName || row.line_name || row.lineName || ''
    
    // 简短时间处理
    let timeText = ''
    const timeVal = row.coating_schedule_date || row.rewinding_start_time || row.slitting_start_time || row.rewinding_date || row.slitting_schedule_date || row.planStartTime || row.plan_start_time || row.startTime || row.start_time || row.planDate || row.plan_date
    if (timeVal) {
      const d = new Date(String(timeVal).replace(' ', 'T'))
      if (!isNaN(d.getTime())) {
        const mm = String(d.getMonth() + 1).padStart(2, '0')
        const dd = String(d.getDate()).padStart(2, '0')
        const hh = String(d.getHours()).padStart(2, '0')
        const mi = String(d.getMinutes()).padStart(2, '0')
        
        // 如果是今天/明天，可以提示，但暂时按通用格式 MM-DD HH:mm
        timeText = `${mm}-${dd} ${hh}:${mi}`
        
        // 如果分钟和小时都是0，可能只是日期，简化显示
        if (hh === '00' && mi === '00') {
          timeText = `${mm}-${dd}`
        }
      }
    }

    // 规格处理
    const t = row.thickness || row.totalThickness || row.total_thickness || row.THICKNESS || ''
    const w = row.width || row.jumboWidth || row.widthMm || row.jumbo_width || row.slit_width || row.slitWidth || row.WIDTH || ''
    const l = row.length || row.planLength || row.lengthM || row.plan_length || row.slit_length || row.slitLength || row.LENGTH || ''
    let specText = ''
    if (t || w || l) {
      specText = `${t ? t + 'μm' : '-' } * ${w ? w + 'mm' : '-' } * ${l ? l + 'm' : '-' }`
    } else {
      specText = row.spec || row.specText || row.materialSpec || row.SPEC || ''
    }

    let plannedArea = row.plan_sqm || row.planned_area || row.planArea || row.plannedArea || row.coating_area || row.PLAN_SQM || row.AREA || 0
    if (plannedArea > 0) {
      plannedArea = parseFloat(plannedArea).toFixed(1)
    }

    return {
      scheduleId,
      orderDetailId,
      materialCode,
      orderNo,
      plannedQty,
      plannedArea,
      customerCode,
      line,
      timeText,
      specText,
      width: w,
      length: l
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
    const resetPagination = options.resetPagination !== false
    const isLoadMore = options.isLoadMore === true
    const pageSize = options.searchMode ? 200 : this.data.scheduleSize
    
    if (resetPagination && !isLoadMore) {
      this.setData({ schedulePage: 1, scheduleTotal: 0, scheduleLoading: true })
    } else if (isLoadMore) {
      this.setData({ loadingMore: true })
    } else {
      this.setData({ scheduleLoading: true })
    }

    const currentPage = isLoadMore ? this.data.schedulePage + 1 : this.data.schedulePage
    
    try {
      const res = await requestApi({
        current: currentPage,
        size: pageSize,
        orderNo: options.orderNo || undefined
      })
      const pageData = res && res.data ? res.data : {}
      const records = Array.isArray(pageData.records) ? pageData.records : []
      const total = Number(pageData.total || 0)
      console.log('=== [loadSchedules] API返回记录数:', records.length, 'total:', total, 'page:', currentPage, 'orderNo:', options.orderNo)
      if (records.length > 0) console.log('=== [loadSchedules] 第一条order_no:', records[0].order_no, 'schedule_id:', records[0].schedule_id || records[0].id)
      if (records.length === 0 && options.orderNo && !isLoadMore) {
        wx.showToast({ title: '后端无匹配排程（' + options.orderNo + '）', icon: 'none', duration: 3000 })
      }
      const normalized = records.map(item => this.normalizeSchedule(item))
      
      if (isLoadMore) {
        // 追加模式：合并已有数据
        const merged = [...this.data.scheduleList, ...normalized]
        const { lineOptions, lineOptionValues } = this.buildLineOptions(merged)
        const targetLine = preferredLine || (preserveSelectedLine ? currentSelectedLine : '')
        const nextSelectedLineIndex = targetLine ? Math.max(0, lineOptionValues.indexOf(targetLine)) : 0
        this.setData({
          scheduleList: merged,
          schedulePage: currentPage,
          scheduleTotal: total,
          lineOptions,
          lineOptionValues,
          selectedLineIndex: nextSelectedLineIndex
        })
        this.applyScheduleFilter()
      } else {
        // 首次加载模式：替换数据
        const { lineOptions, lineOptionValues } = this.buildLineOptions(normalized)
        const targetLine = preferredLine || (preserveSelectedLine ? currentSelectedLine : '')
        const nextSelectedLineIndex = targetLine ? Math.max(0, lineOptionValues.indexOf(targetLine)) : 0
        this.setData({
          scheduleList: normalized,
          schedulePage: currentPage,
          scheduleTotal: total,
          lineOptions,
          lineOptionValues,
          selectedLineIndex: nextSelectedLineIndex,
          selectedScheduleIndex: -1,
          selectedScheduleId: '',
          scheduleId: '',
          orderDetailId: ''
        })
        this.applyScheduleFilter()
      }
    } catch (e) {
      wx.showToast({ title: (e && (e.msg || e.message)) || '排程加载失败', icon: 'none' })
      if (!isLoadMore) {
        this.setData({ scheduleList: [], scheduleDisplayList: [] })
      }
    } finally {
      this.setData({ scheduleLoading: false, loadingMore: false })
    }
  },

  onScheduleScrollToLower() {
    if (this.data.loadingMore) return
    if (this.data.scheduleLoading) return
    const loaded = this.data.scheduleList.length
    const total = this.data.scheduleTotal
    if (total > 0 && loaded >= total) return
    this.loadSchedules({ resetPagination: false, isLoadMore: true })
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
      const orderDetailId = String(item.orderDetailId || '').toUpperCase()
      return orderNo.includes(keyword) || materialCode.includes(keyword) || orderDetailId.includes(keyword)
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

    // 尝试获取上一次记录的规格作为默认值
    const lastWidth = this.data.currentRoll.widthMm
    const lastLength = this.data.currentRoll.lengthM
    const defaultWidth = row.specText && row.specText.includes('*') ? row.specText.split('*')[1].replace('mm','').trim() : ''

    const sid = row.scheduleId || row.schedule_id || row.id || row.SCHEDULE_ID
    const did = row.orderDetailId || row.order_detail_id || row.orderItemId || row.order_item_id || row.detailId || row.detail_id || row.ORDER_DETAIL_ID
    
    this.setData({
      selectedSchedule: row,
      selectedScheduleIndex: realIndex,
      selectedScheduleId: sid ? String(sid) : '',
      scheduleId: sid ? String(sid) : '',
      orderDetailId: did ? String(did) : '',
      producedQty: row.plannedQty && row.plannedQty !== '-' ? row.plannedQty : '',
      overReportConfirmed: false,
      showReportModal: true,
      issueHistory: [],
      activeIssues: [],
      netMaterialUsage: 0,
      referenceArea: 0,
      producedRolls: [],
      currentRoll: { 
        widthMm: lastWidth || defaultWidth, 
        lengthM: lastLength || '', 
        area: 0 
      },
      form: {
        ...this.data.form,
        orderNo: row.orderNo || '',
        customerOrderNo: row.customerOrderNo || '',
        materialCode: row.materialCode || '',
        thickness: row.specText ? row.specText.split('*')[0].replace('μm','').trim() : '',
        widthMm: lastWidth || defaultWidth,
        lengthM: lastLength || '',
        coatingUseRewindingLabel: false,
        rewindingMotherRollCode: '',
        rewindingSerialStart: 1,
        rewindingPrintCount: 0
      },
      nextRollCodePreview: ''
    }, () => {
      if (this.data.producedQty) {
        this.calcReferenceArea(this.data.producedQty)
      }
    })
    this.fetchNextRollCodePreview()
    this.fetchIssueHistory()
    this.fetchIssueTemplate() // 新增：获取领料需求模板用于后续校验
  },

  fetchIssueTemplate() {
    const { scheduleId, orderDetailId, processTypeOptions, processTypeIndex } = this.data
    if (!scheduleId && !orderDetailId) return
    const processType = processTypeOptions[processTypeIndex].value
    getMaterialIssueTemplate({
      scheduleId: scheduleId ? Number(scheduleId) : undefined,
      orderDetailId: orderDetailId ? Number(orderDetailId) : undefined,
      processType
    }).then(res => {
      this.setData({ issueTemplate: res.data || [] })
    })
  },

  fetchIssueHistory() {
    const { selectedScheduleId, processTypeIndex, processTypeOptions } = this.data
    if (!selectedScheduleId) return
    const processType = processTypeOptions[processTypeIndex].value
    
    getMaterialIssues({ 
      scheduleId: selectedScheduleId, 
      processType 
    }).then(res => {
      if (res.code === 200 || res.code === 20000) {
        const history = res.data || []
        let net = 0
        history.forEach(item => {
          net += (item.actualArea || 0)
        })
        this.setData({
          issueHistory: history,
          netMaterialUsage: net.toFixed(2)
        })
      }
    })
  },

  onScanIssue() {
    this.onScanMaterial('ISSUE')
  },

  onScanReturn() {
    this.onScanMaterial('RETURN')
  },

  onScanMaterial(type) {
    const { selectedScheduleId, processTypeIndex, processTypeOptions } = this.data
    const processType = processTypeOptions[processTypeIndex].value
    
    wx.scanCode({
      success: (res) => {
        const qrCode = res.result
        if (!qrCode) return
        
        // 检查是否已经在队列中
        if (this.data.activeIssues.some(i => i.rollCode === qrCode && i.type === type)) {
          wx.showModal({
            title: '提示',
            content: '该卷同类型操作已在列表中',
            showCancel: false,
            confirmText: '继续扫码',
            success: () => this.onScanMaterial(type)
          })
          return
        }

        wx.showLoading({ title: '获取库存...' })
        getStockByQrCode(qrCode).then(async stockRes => {
          wx.hideLoading()
          if ((stockRes.code === 200 || stockRes.code === 20000) && stockRes.data) {
            const stock = stockRes.data
            const processType = this.data.processTypeOptions[this.data.processTypeIndex].value

            // 三分支校验（分切严格 / 复卷长度> / 涂布配料表）
            const scannedCode = (stock.materialCode || '').trim().toUpperCase()
            const scannedLength = parseFloat(stock.currentLength || stock.length || 0)
            const template = this.data.issueTemplate || []
            
            if (template.length > 0) {
              const productTemplate = template.find(t => t.isProduct)
              
              if (productTemplate && processType === 'SLITTING') {
                // === 分切：料号+长度严格一致（±0.1m） ===
                const targetCode = (productTemplate.materialCode || '').trim().toUpperCase()
                const targetLength = parseFloat(productTemplate.targetLength || 0)
                
                if (scannedCode !== targetCode) {
                  wx.showModal({
                    title: '⚠️ 料号不符',
                    content: `订单要求: ${targetCode}\n当前扫入: ${scannedCode}\n料号不一致，禁止领料！`,
                    confirmColor: '#ee0a24', showCancel: false,
                    success: () => this.onScanMaterial(type)
                  })
                  return
                }
                if (targetLength > 0) {
                  const diff = Math.abs(scannedLength - targetLength)
                  if (diff > 0.1) {
                    wx.showModal({
                      title: '⚠️ 长度不符',
                      content: `订单要求长度: ${targetLength}m\n当前库存长度: ${scannedLength}m\n长度不一致，禁止领料！`,
                      confirmColor: '#ee0a24', showCancel: false,
                      success: () => this.onScanMaterial(type)
                    })
                    return
                  }
                }
              } else if (productTemplate && processType === 'REWINDING') {
                // === 复卷：料号严格一致 + 扫入长度必须 > 排程目标长度 ===
                const targetCode = (productTemplate.materialCode || '').trim().toUpperCase()
                const targetLength = parseFloat(productTemplate.targetLength || 0)
                
                if (scannedCode !== targetCode) {
                  wx.showModal({
                    title: '⚠️ 料号不符',
                    content: `订单要求: ${targetCode}\n当前扫入: ${scannedCode}\n料号不一致，禁止领料！`,
                    confirmColor: '#ee0a24', showCancel: false,
                    success: () => this.onScanMaterial(type)
                  })
                  return
                }
                if (targetLength > 0 && scannedLength <= targetLength) {
                  wx.showModal({
                    title: '⚠️ 长度不足',
                    content: `复卷领料要求母卷长度 > ${targetLength}m\n当前库存长度: ${scannedLength}m\n长度不足，禁止领料！`,
                    confirmColor: '#ee0a24', showCancel: false,
                    success: () => this.onScanMaterial(type)
                  })
                  return
                }
              } else if (processType === 'COATING') {
                // === 涂布：料号必须在配料表原材料清单中 ===
                const rawMaterialCodes = template
                  .filter(t => !t.isProduct)
                  .map(t => (t.materialCode || '').trim().toUpperCase())
                  .filter(c => c)
                if (rawMaterialCodes.length > 0 && !rawMaterialCodes.includes(scannedCode)) {
                  wx.showModal({
                    title: '⚠️ 物料不符',
                    content: `扫入料号(${scannedCode})不在配料表中！\n配料要求：${rawMaterialCodes.join(' / ')}`,
                    confirmColor: '#ee0a24', showCancel: false,
                    success: () => this.onScanMaterial(type)
                  })
                  return
                }
              } else {
                // 通用校验（保留原有宽松逻辑）
                const requiredCodes = template.map(t => (t.materialCode || '').trim().toUpperCase()).filter(c => c)
                if (requiredCodes.length > 0 && !requiredCodes.includes(scannedCode)) {
                  const confirmed = await new Promise(resolve => {
                    wx.showModal({
                      title: '⚠️ 领料错误',
                      content: `扫入料号(${scannedCode})不在订单需求范围内！\n要求：${requiredCodes.join(' / ')}。\n是否强制录入？`,
                      confirmText: '强制录入',
                      confirmColor: '#ee0a24',
                      cancelText: '取消扫码',
                      success: (mRes) => resolve(mRes.confirm)
                    })
                  })
                  if (!confirmed) return
                }
              }
            }

            // 退料关联校验：退料时必须该卷号之前领过
            if (type === 'RETURN') {
              const hasIssued = this.data.issueHistory.some(h => 
                h.rollCode === qrCode && (h.type === 'ISSUE' || h.actualArea > 0)
              )
              const pendingIssued = this.data.activeIssues.some(a => 
                a.rollCode === qrCode && a.type === 'ISSUE'
              )
              if (!hasIssued && !pendingIssued) {
                wx.showModal({
                  title: '⚠️ 无法退料',
                  content: `卷号 ${qrCode} 未在本排程中领过料，无法退料！`,
                  confirmColor: '#ee0a24', showCancel: false,
                  success: () => this.onScanMaterial(type)
                })
                return
              }
            }

            const area = stock.availableArea || stock.area || 0

            // 从配料表中读取该物料的单位（kg/㎡），自适应显示
            const matchedIssue = template.find(t => 
              (t.materialCode || '').trim().toUpperCase() === scannedCode
            )
            const issueUnit = (matchedIssue && matchedIssue.unit) ? matchedIssue.unit : '㎡'
            
            const newIssue = {
              rollCode: qrCode,
              type: type,
              materialCode: stock.materialCode,
              widthMm: stock.widthMm || stock.width || '',
              thickness: stock.thickness || '',
              originalArea: area,
              actualArea: type === 'ISSUE' ? area : -area,
              unit: issueUnit,
              isEditing: false
            }

            const newList = [...this.data.activeIssues, newIssue]
            this.setData({ activeIssues: newList })
            
            // 自动触发表单变化以重新计算
            this.updateNetMaterialUsage()
            
            // 提示一下并自动继续扫
            wx.showToast({ title: '已添加', icon: 'success', duration: 1000 })
            setTimeout(() => {
              this.onScanMaterial(type)
            }, 1100)
          } else {
            wx.showModal({
              title: '提示',
              content: '无效卷号',
              showCancel: false,
              confirmText: '继续扫码',
              success: () => this.onScanMaterial(type)
            })
          }
        }).catch(() => {
          wx.hideLoading()
          wx.showModal({
            title: '提示',
            content: '查询失败',
            showCancel: false,
            confirmText: '继续扫码',
            success: () => this.onScanMaterial(type)
          })
        })
      },
      fail: (err) => {
        // 用户取消或设备异常，不处理，停止连续扫码
      }
    })
  },

  updateNetMaterialUsage() {
    let net = 0
    this.data.issueHistory.forEach(h => net += (h.actualArea || 0))
    this.data.activeIssues.forEach(a => net += (a.actualArea || 0))
    this.setData({ netMaterialUsage: net.toFixed(2) })
  },

  onRemoveActiveIssue(e) {
    const idx = e.currentTarget.dataset.index
    const list = [...this.data.activeIssues]
    list.splice(idx, 1)
    this.setData({ activeIssues: list }, () => {
      this.updateNetMaterialUsage()
    })
  },

  onEditIssueSpec(e) {
    const idx = e.currentTarget.dataset.index
    const item = this.data.activeIssues[idx]
    this.setData({
      editingIssue: { ...item, index: idx },
      showIssueEditModal: true
    })
  },

  onEditSpecInput(e) {
    const field = e.currentTarget.dataset.field
    const val = e.detail.value
    this.setData({ [`editingIssue.${field}`]: val })
    
    // 如果修改了长宽，重新计算面积（退料逻辑）
    if (field === 'widthMm' || field === 'lengthM') {
      const w = parseFloat(this.data.editingIssue.widthMm) || 0
      const l = parseFloat(this.data.editingIssue.lengthM) || 0
      if (w > 0 && l > 0) {
        const area = parseFloat((w * l / 1000).toFixed(2))
        this.setData({ 
          'editingIssue.actualArea': (this.data.editingIssue.type === 'RETURN' || this.data.editingIssue.type === 'RET') ? -area : area 
        })
      }
    }
  },

  confirmEditSpec() {
    const { editingIssue, activeIssues } = this.data
    const list = [...activeIssues]
    
    // 强制修正正负号并转为数字
    let area = Math.abs(parseFloat(editingIssue.actualArea) || 0)
    if (editingIssue.type === 'RETURN' || editingIssue.type === 'RET') {
      area = -area
    }
    editingIssue.actualArea = area
    
    list[editingIssue.index] = { ...editingIssue }
    delete list[editingIssue.index].index
    
    this.setData({
      activeIssues: list,
      showIssueEditModal: false,
      editingIssue: null
    }, () => {
      this.updateNetMaterialUsage()
    })
  },

  async batchSubmitIssues() {
    const { activeIssues, selectedScheduleId, scheduleId, orderDetailId, selectedSchedule, processTypeOptions, processTypeIndex, operator, remark, issueSubmitting } = this.data
    if (activeIssues.length === 0) return
    if (issueSubmitting) return
    
    const processType = processTypeOptions[processTypeIndex].value
    this.setData({ issueSubmitting: true })
    wx.showLoading({ title: '正批量提交...' })
    
    try {
      // 防御性补丁：确保从选中的 schedule 对象获取 ID
      const sid = selectedScheduleId || scheduleId || (selectedSchedule && selectedSchedule.scheduleId)
      const did = orderDetailId || (selectedSchedule && (selectedSchedule.orderDetailId || selectedSchedule.order_detail_id))
      
      // 准备后端要求的 materialIssues 列表结构
      const materialIssues = activeIssues.map(item => ({
        rollCode: item.rollCode,
        actualArea: item.actualArea,
        materialCode: item.materialCode
      }))

      const payload = {
        scheduleId: (sid && sid !== 'undefined') ? Number(sid) : undefined,
        orderDetailId: (did && did !== 'undefined') ? Number(did) : undefined,
        processType,
        materialIssues: materialIssues,
        operator: operator || '',
        remark: remark || ''
      }
      
      const res = await issueMaterial(payload)
      
      wx.hideLoading()
      if (res.code === 200 || res.code === 20000) {
        wx.showToast({ title: '全部提交成功' })
        this.setData({ activeIssues: [] })
        this.fetchIssueHistory()
      } else {
        wx.showModal({ title: '提交失败', content: (res && (res.msg || res.message)) || '后端接口返回错误', showCancel: false })
      }
    } catch (e) {
      wx.hideLoading()
      console.error('Submit issue failed:', e)
      const errorMsg = (e && (e.msg || e.message)) || '网络或服务器异常'
      wx.showModal({ title: '提交异常', content: errorMsg, showCancel: false })
      this.fetchIssueHistory()
    } finally {
      this.setData({ issueSubmitting: false })
    }
  },

  submitIssueWork(data) {
    wx.showLoading({ title: '提交中...' })
    issueMaterial(data).then(res => {
      wx.hideLoading()
      if (res.code === 200 || res.code === 20000) {
        wx.showToast({ title: '操作成功' })
        this.fetchIssueHistory()
      } else {
        wx.showModal({ title: '失败', content: res.msg || '操作异常', showCancel: false })
      }
    }).catch(err => {
      wx.hideLoading()
      wx.showToast({ title: '网络异常', icon: 'none' })
    })
  },

  async fetchNextRollCodePreview() {
    const { scheduleId, startTime, operator } = this.data
    if (!scheduleId) return
    try {
      const res = await getNextCoatingRollCode({ 
        scheduleId: Number(scheduleId),
        productionDateTime: startTime,
        workGroup: operator // 传入操作人，后端会解析所属班组用于生成编号中的班组位
      })
      if (res.code === 200 || res.code === 20000) {
        this.setData({ nextRollCodePreview: res.data })
      }
    } catch (e) {
      console.error('Prefetch roll code error:', e)
    }
  },

  closeReportModal() {
    this.setData({ showReportModal: false })
  },

  onScanCodeInput(e) {
    this.setData({ scanCode: e.detail.value || '' })
  },

  parseScanCode(raw) {
    const text = String(raw || '').trim()
    const result = { odid: '', ono: '' }
    if (!text.includes('|')) return result
    const segments = text.split('|')
    for (const seg of segments) {
      const colonIdx = seg.indexOf(':')
      if (colonIdx > 0) {
        const key = seg.substring(0, colonIdx).trim().toUpperCase()
        const value = seg.substring(colonIdx + 1).trim()
        if (key === 'ODID') result.odid = value
        else if (key === 'ONO') result.ono = value
      }
    }
    return result
  },

  findSchedulesByScanCode(code) {
    const parsed = this.parseScanCode(code)
    const text = String(code || '').trim()
    const upper = text.toUpperCase()
    const digits = upper.replace(/\D/g, '')
    const list = Array.isArray(this.data.scheduleList) ? this.data.scheduleList : []

    // 1. 优先用解析出的 ODID 精确匹配 orderDetailId
    if (parsed.odid) {
      const matches = list.filter(row => String(row.orderDetailId || '').trim() === parsed.odid)
      if (matches.length > 0) return { matches, matchedBy: 'orderDetailId' }
    }

    // 2. 纯文本/数字按 orderDetailId 精确匹配
    const byDetail = list.filter(row => {
      const did = String(row.orderDetailId || '').trim()
      return did === digits || did === upper
    })
    if (byDetail.length > 0) return { matches: byDetail, matchedBy: 'orderDetailId' }

    // 3. orderNo 匹配（可能多行）
    const keyword = parsed.ono || upper
    const byOrderNo = list.filter(row => {
      const orderNo = String(row.orderNo || '').trim().toUpperCase()
      return orderNo === keyword.toUpperCase()
    })
    if (byOrderNo.length > 0) return { matches: byOrderNo, matchedBy: 'orderNo' }

    return { matches: [], matchedBy: null }
  },

  applyScanSelectSchedule(rawCode) {
    const code = String(rawCode || '').trim()
    if (!code) {
      wx.showToast({ title: '请先输入或扫码', icon: 'none' })
      return
    }
    const parsed = this.parseScanCode(code)
    const displayCode = parsed.odid || code
    const { matches } = this.findSchedulesByScanCode(code)
    if (!matches || matches.length === 0) {
      wx.showToast({ title: '未找到对应排程', icon: 'none' })
      return
    }
    const row = matches[0]
    const realIndex = this.data.scheduleList.findIndex(item =>
      String(item.scheduleId || '') === String(row.scheduleId || '') &&
      String(item.orderDetailId || '') === String(row.orderDetailId || '')
    )
    this.setData({
      selectedScheduleIndex: realIndex,
      selectedScheduleId: row.scheduleId ? String(row.scheduleId) : '',
      scheduleId: row.scheduleId ? String(row.scheduleId) : '',
      orderDetailId: row.orderDetailId ? String(row.orderDetailId) : '',
      scanCode: displayCode,
      producedQty: row.plannedQty && row.plannedQty !== '-' ? row.plannedQty : '',
      showReportModal: true,
      producedRolls: [],
      currentRoll: { widthMm: row.specText && row.specText.includes('*') ? row.specText.split('*')[1].replace('mm','').trim() : '', lengthM: '', area: 0 },
      form: {
        ...this.data.form,
        orderNo: row.orderNo || '',
        customerOrderNo: row.customerOrderNo || '',
        materialCode: row.materialCode || '',
        thickness: row.specText ? row.specText.split('*')[0].replace('μm','').trim() : '',
        widthMm: row.specText && row.specText.includes('*') ? row.specText.split('*')[1].replace('mm','').trim() : '',
        lengthM: row.specText && row.specText.split('*').length > 2 ? row.specText.split('*')[2].replace('m','').trim() : '',
        coatingUseRewindingLabel: false,
        rewindingMotherRollCode: '',
        rewindingSerialStart: 1,
        rewindingPrintCount: 0
      },
      nextRollCodePreview: ''
    })
    this.fetchNextRollCodePreview()
    this.applyScheduleFilter()
  },

  onScanSelectSchedule() {
    this.applyScanSelectSchedule(this.data.scanCode)
  },

  onScanCodeTap() {
    const doMatch = (result) => {
      this.setData({ scanCode: result })
      
      // 解析扫码结果
      const parsed = this.parseScanCode(result)
      const searchOrderNo = parsed.ono || result
      
      // 先设置 keyword，再统一走后端搜索（loadSchedules 内部会调 applyScheduleFilter）
      this.setData({ scheduleKeyword: searchOrderNo.toUpperCase(), selectedLineIndex: 0 })
      wx.showLoading({ title: '搜索排程...' })
      this.loadSchedules({
        searchMode: true,
        includeCompleted: true,
        orderNo: searchOrderNo
      }).then(() => {
        wx.hideLoading()
        // 用后端搜索结果匹配
        const { matches, matchedBy } = this.findSchedulesByScanCode(result)
        
        if (matchedBy === 'orderDetailId') {
          // 明细号：弹窗报工
          if (parsed.odid) this.setData({ scanCode: parsed.odid })
          this.applyScanSelectSchedule(result)
        } else if (matchedBy !== 'orderNo') {
          // 非订单号也非明细号 → 无结果
          wx.showToast({ title: '未找到匹配排程', icon: 'none' })
        }
        // matchedBy === 'orderNo' 时已在 loadSchedules 中完成了 applyScheduleFilter，无需额外操作
      }).catch(() => {
        wx.hideLoading()
        wx.showToast({ title: '搜索失败', icon: 'none' })
      })
    }

    // 每次点击扫码键，都先清空上次扫码结果，再重新扫码
    this.setData({ scanCode: '' })
    wx.scanCode({
      scanType: ['qrCode', 'barCode'],
      success: (res) => {
        const result = (res && (res.result || res.rawData)) || ''
        if (!this.data.scheduleList || this.data.scheduleList.length === 0) {
          wx.showLoading({ title: '加载排程数据...' })
          this.loadSchedules().then(() => {
            wx.hideLoading()
            doMatch(result)
          }).catch(() => {
            wx.hideLoading()
            doMatch(result)
          })
          return
        }
        doMatch(result)
      },
      fail: () => {
        wx.showToast({ title: '扫码已取消', icon: 'none' })
      }
    })
  },

  onRemotePrintChange(e) {
    this.setData({ remotePrint: e.detail.value })
  },

  onCoatingUseRewindingLabelChange(e) {
    this.setData({ 'form.coatingUseRewindingLabel': e.detail.value })
  },

  onRewindingMotherRollCodeInput(e) {
    this.setData({ 'form.rewindingMotherRollCode': e.detail.value })
  },

  onRewindingSerialStartInput(e) {
    this.setData({ 'form.rewindingSerialStart': Number(e.detail.value) || 1 })
  },

  onRewindingPrintCountInput(e) {
    this.setData({ 'form.rewindingPrintCount': Math.trunc(Number(e.detail.value) || 0) })
  },

  async fetchNextRewindingMotherRollCode() {
    const { selectedScheduleId, startTime, operator } = this.data
    if (!selectedScheduleId) return
    wx.showLoading({ title: '获取中...' })
    try {
      const res = await getNextCoatingRollCode({ 
        scheduleId: Number(selectedScheduleId),
        productionDateTime: startTime,
        workGroup: operator
      })
      wx.hideLoading()
      if (res.code === 200 || res.code === 20000) {
        this.setData({ 'form.rewindingMotherRollCode': res.data })
      } else {
        wx.showToast({ title: res.msg || '获取失败', icon: 'none' })
      }
    } catch (err) {
      wx.hideLoading()
      wx.showToast({ title: '接口调用异常', icon: 'none' })
    }
  },

  async printAndBackfillRewindingLabels() {
    const { form, selectedScheduleId, producedRolls } = this.data
    const { rewindingMotherRollCode, rewindingSerialStart, rewindingPrintCount, widthMm, lengthM } = form

    if (!rewindingMotherRollCode) {
      wx.showToast({ title: '请输入母卷号前缀', icon: 'none' })
      return
    }
    if (rewindingPrintCount <= 0) {
      wx.showToast({ title: '张数必须大于0', icon: 'none' })
      return
    }

    wx.showLoading({ title: '正在批量打印...' })
    try {
      const newRolls = []
      for (let i = 0; i < rewindingPrintCount; i++) {
        const serialNo = Number(rewindingSerialStart) + i
        const rollCode = `${rewindingMotherRollCode}-${serialNo}`
        
        // 发送打印记录 (批量)
        await savePrintRecord({
          bizType: 'REWINDING', // 涂布小支模式使用复卷模板
          rollCode: rollCode,
          materialCode: form.materialCode,
          widthMm: Number(widthMm),
          lengthM: Number(lengthM),
          operator: wx.getStorageSync('userName') || 'Mobile',
          printDate: new Date().toISOString().split('T')[0],
          orderNo: form.orderNo,
          customerOrderNo: form.customerOrderNo,
          thickness: form.thickness,
          remark: `涂布小支模式批量打印: ${rewindingMotherRollCode}`
        })

        newRolls.push({
          rollCode: rollCode,
          widthMm: widthMm,
          lengthM: lengthM,
          area: ((Number(widthMm) * Number(lengthM)) / 1000).toFixed(2)
        })
      }

      const updatedProducedRolls = [...producedRolls, ...newRolls]
      // 重新计算总面积
      const totalArea = updatedProducedRolls.reduce((sum, r) => sum + Number(r.area || 0), 0).toFixed(2)

      this.setData({
        producedRolls: updatedProducedRolls,
        producedQty: totalArea,
        'form.rewindingSerialStart': Number(rewindingSerialStart) + rewindingPrintCount
      })
      
      wx.hideLoading()
      wx.showToast({ title: `已生成 ${rewindingPrintCount} 卷`, icon: 'success' })
    } catch (err) {
      wx.hideLoading()
      console.error('Batch print error:', err)
      wx.showToast({ title: '批量处理失败', icon: 'none' })
    }
  },

  // 涂布母卷面积计算
  onWidthInput(e) {
    const val = e.detail.value
    this.setData({ 'currentRoll.widthMm': val, 'form.widthMm': val })
    this.calcCurrentRollArea()
  },

  onLengthInput(e) {
    const val = e.detail.value
    this.setData({ 'currentRoll.lengthM': val, 'form.lengthM': val })
    this.calcCurrentRollArea()
  },

  calcCurrentRollArea() {
    const { widthMm, lengthM } = this.data.currentRoll
    if (widthMm && lengthM) {
      const area = (Number(widthMm) * Number(lengthM) / 1000).toFixed(2)
      this.setData({ 'currentRoll.area': area })
    }
  },

  async addRoll() {
    // 仅涂布工序支持添加母卷
    const currentProcessType = this.data.processTypeOptions[this.data.processTypeIndex].value
    if (currentProcessType !== 'COATING') {
      wx.showToast({ title: '仅涂布工序支持添加母卷', icon: 'none' })
      return
    }
    const { scheduleId, form, producedRolls, currentRoll, startTime, operator } = this.data
    if (!scheduleId) {
      wx.showToast({ title: '没有排程ID', icon: 'none' })
      return
    }

    wx.showLoading({ title: '生成中...' })
    try {
      console.log('Fetching next roll code for scheduleId:', scheduleId)
      const res = await getNextCoatingRollCode({ 
        scheduleId: Number(scheduleId),
        productionDateTime: startTime,
        workGroup: operator
      })
      wx.hideLoading()

      if (res.code === 200 || res.code === 20000) {
        const nextRollCode = res.data
        if (!nextRollCode) {
          wx.showToast({ title: '未获取到编码', icon: 'none' })
          return
        }

        const width = currentRoll.widthMm || form.widthMm || ''
        const length = currentRoll.lengthM || form.lengthM || ''
        const area = (Number(width) * Number(length) / 1000).toFixed(2)

        wx.showModal({
          title: '确认打印并添加母卷',
          content: `母卷号: ${nextRollCode}\n规格: ${width}mm x ${length}m`,
          success: async (modalRes) => {
            if (modalRes.confirm) {
              wx.showLoading({ title: '发送任务...' })
              try {
                await savePrintRecord({
                  bizType: 'COATING_MOTHER',
                  rollCode: nextRollCode,
                  materialCode: form.materialCode,
                  widthMm: Number(width),
                  lengthM: Number(length),
                  operator: wx.getStorageSync('userName') || 'Mobile',
                  printDate: new Date().toISOString().split('T')[0],
                  orderNo: form.orderNo,
                  customerOrderNo: form.customerOrderNo,
                  thickness: form.thickness
                })

                const newRoll = {
                  rollCode: nextRollCode,
                  widthMm: width,
                  lengthM: length,
                  area: area
                }
                const newList = [...producedRolls, newRoll]
                const totalArea = newList.reduce((sum, r) => sum + Number(r.area || 0), 0).toFixed(2)

                this.setData({
                  producedRolls: newList,
                  producedQty: totalArea,
                  // 自动记忆并延续规格
                  'currentRoll.widthMm': width,
                  'currentRoll.lengthM': length,
                  'form.widthMm': width,
                  'form.lengthM': length
                })
                this.fetchNextRollCodePreview() // 刷新下一个编号预览
                wx.hideLoading()
                wx.showToast({ title: '添加成功' })
              } catch (e) {
                wx.hideLoading()
                wx.showToast({ title: '保存失败', icon: 'none' })
              }
            }
          }
        })
      } else {
        wx.showToast({ title: res.msg || '获取母卷号失败', icon: 'none' })
      }
    } catch (err) {
      wx.hideLoading()
      wx.showToast({ title: '接口调用失败', icon: 'none' })
    }
  },

  removeRoll(e) {
    const { id, index } = e.currentTarget.dataset
    const list = [...this.data.producedRolls]
    const targetIdx = index !== undefined ? index : list.findIndex(r => r.rollCode === id)
    if (targetIdx > -1) {
      list.splice(targetIdx, 1)
      const totalArea = list.reduce((sum, r) => sum + Number(r.area || 0), 0).toFixed(2)
      this.setData({
        producedRolls: list,
        producedQty: totalArea
      })
    }
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

    // 瑞浦客户超报提醒
    const rpList = ['RP01', 'GDRP01', 'JSRP01', 'JXRP001', 'LZRP01', 'SHRP001']
    const idx = this.data.selectedScheduleIndex
    const selectedTask = idx >= 0 && idx < this.data.scheduleList.length
      ? this.data.scheduleList[idx]
      : null
    if (selectedTask && rpList.includes(String(selectedTask.customerCode || '').toUpperCase())) {
      const pQty = Number(producedQty)
      const plan = Number(selectedTask.plannedQty)
      if (pQty > plan && !this.data.overReportConfirmed) {
        wx.showModal({
          title: '超量报工提醒',
          content: `当前产量(${pQty})已超过计划(${plan})，是否确认超报？多报数量将进入共享池。`,
          success: (res) => {
            if (res.confirm) {
              this.setData({ overReportConfirmed: true }, () => {
                this.onSubmit()
              })
            }
          }
        })
        return
      }
    }

    const { selectedScheduleId } = this.data
    const sid = scheduleId || selectedScheduleId
    
    const payload = {
      processType: processTypeOptions[processTypeIndex].value,
      scheduleId: (sid && sid !== 'undefined') ? Number(sid) : undefined,
      orderDetailId: (orderDetailId && orderDetailId !== 'undefined') ? Number(orderDetailId) : undefined,
      producedQty: Number(producedQty),
      startTime: startTime || nowText(),
      endTime: (endTime && endTime !== startTime) ? endTime : nowText(),
      operator: operator || undefined,
      remark: remark || undefined,
      proceedNextProcess: !!proceedNextProcess
    }

    if (payload.processType === 'SLITTING' && !Number.isInteger(Number(producedQty))) {
      wx.showToast({ title: '分切报工数量必须为整数卷', icon: 'none' })
      return
    }

    // 涂布增加卷明细
    if (payload.processType === 'COATING' && this.data.producedRolls.length > 0) {
      payload.producedRolls = this.data.producedRolls.map(r => ({
        rollCode: r.rollCode,
        widthMm: Number(r.widthMm),
        lengthM: Number(r.lengthM),
        area: Number(r.area)
      }))
    }

    this.setData({ submitting: true })
    try {
      const res = await reportWork(payload)
      const resData = res.data || {}
      
      const labelMap = { 'COATING': '涂布', 'REWINDING': '复卷', 'SLITTING': '分切' }
      if (resData.processType) {
        resData.processTypeLabel = labelMap[resData.processType] || resData.processType
      }
      this.setData({ lastResult: resData, showReportModal: false })
      wx.showToast({ title: '报工成功', icon: 'success' })
      // 成功后清除所有报工状态，防止重复提交和数据残留
      this.setData({
        selectedScheduleId: '',
        selectedScheduleIndex: -1,
        selectedSchedule: null,
        producedQty: '',
        producedRolls: [],
        currentRoll: { widthMm: '', lengthM: '', area: 0 },
        activeIssues: [],
        issueHistory: [],
        issueTemplate: [],
        netMaterialUsage: 0,
        referenceArea: 0,
        overReportConfirmed: false,
        showReportModal: false
      })
      this.loadSchedules() // 刷新列表，隐藏已完成的
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
    const userInfo = getUserInfo() || {}
    const roles = Array.isArray(userInfo.roles) ? userInfo.roles : []
    if (roles.includes('packing')) {
      wx.navigateTo({ url: '/pages/issue/index?scene=packagingIssue' })
    } else {
      wx.navigateTo({ url: '/pages/issue/index' })
    }
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
