const { getToken, getUserInfo, clearToken } = require('../../utils/auth')
const { createInboundRequest, getInboundList, getTapeStockList, approveInbound, cancelInbound, getScanInboundDocument, submitInboundScan } = require('../../api/stock')

Page({
  data: {
    scene: 'default',
    pageTitle: '完工入库申请',
    scanCardTitle: '扫码入库',
    scanSourceText: '采购收货单（待入库）',
    showForm: true,
    qrCode: '',
    materialCode: '',
    productName: '',
    batchNo: '',
    customerBatchNo: '',
    rolls: '1',
    qtyUnit: '卷',
    thickness: '',
    width: '',
    length: '',
    location: '',
    applicant: '',
    applyDept: '生产',
    remark: 'PROCESS=SLITTING',
    submitting: false,
    queryLoading: false,
    queryStatus: '',
    querySourceType: '',
    inboundList: [],
    auditLocationMap: {},
    auditRollCodeMap: {},
    canWarehouse: false,
    scanCode: '',
    palletLocation: '',
    scanDetail: null,
    scanLoading: false,
    inboundSubmitting: false,
    coatingScanMode: false,
    coatingScanCode: '',
    coatingScanLocation: '',
    coatingScanLoading: false,
    coatingSubmitting: false,
    coatingKeyword: '',
    coatingAllInboundList: [],
    coatingPageSize: 50,
    coatingCurrentPage: 0,
    coatingTotal: 0,
    coatingHasMore: false,
    coatingLoadingMore: false,
    coatingScannedItems: [],
    coatingScannedGrouped: [],
    selectedCoatingId: null,
    selectedCoatingRow: null,
    coatingSummary: {
      planQty: 0,
      printedQty: 0,
      scannedQty: 0,
      currentScanQty: 0
    }
  },

  beginNativeScanSession() {
    this._suppressOnShowRefresh = true
  },

  endNativeScanSession() {
    setTimeout(() => {
      this._suppressOnShowRefresh = false
    }, 250)
  },

  onLoad(options = {}) {
    const scene = (options.scene || '').trim()
    if (!scene) {
      return
    }
    if (scene === 'purchaseInbound') {
      this.setData({
        scene,
        pageTitle: '采购入库申请',
        scanCardTitle: '采购入库（扫码）',
        scanSourceText: '采购收货单（待入库）',
        showForm: false,
        applyDept: '采购',
        remark: 'SCENE=PURCHASE_INBOUND',
        queryStatus: 0,
        querySourceType: 'PURCHASE_RECEIVING'
      })
      wx.setNavigationBarTitle({ title: '采购入库' })
      return
    }
    if (scene === 'coatingInbound') {
      this.setData({
        scene,
        pageTitle: '涂布入库申请',
        scanCardTitle: '涂布入库（扫码）',
        scanSourceText: '涂布入库单（待入库）',
        showForm: false,
        applyDept: '涂布',
        remark: 'SCENE=COATING_INBOUND',
        queryStatus: 0,
        querySourceType: 'PROD_COATING'
      })
      wx.setNavigationBarTitle({ title: '涂布入库' })
      return
    }
    if (scene === 'packagingReturnInbound') {
      this.setData({
        scene,
        pageTitle: '包装车间退仓申请',
        applyDept: '包装',
        remark: 'SCENE=PACKAGING_RETURN',
        queryStatus: 0,
        querySourceType: 'PROD_PACKAGING'
      })
      wx.setNavigationBarTitle({ title: '包装退仓' })
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
    const canWarehouse = roles.includes('warehouse') || roles.includes('admin')
    if (name && !this.data.applicant) {
      this.setData({ applicant: name })
    }
    this.setData({ canWarehouse })
    if (this._suppressOnShowRefresh) {
      return
    }
    if (this.data.scene === 'purchaseInbound') {
      return
    }
    if (this.data.scene === 'coatingInbound') {
      this.queryInboundList()
      return
    }
    this.queryInboundList()
  },

  onUnload() {
    this._suppressOnShowRefresh = false
    this._coatingLooping = false
    if (this.data.coatingScanMode) {
      this.setData({ coatingScanMode: false })
    }
  },

  onHide() {
    this._coatingLooping = false
    if (this.data.coatingScanMode) {
      this.setData({ coatingScanMode: false })
    }
  },

  isSalesReturnInbound(item) {
    const remark = String((item && item.remark) || '').toUpperCase()
    return remark.includes('[SALES_RETURN]')
  },

  isSlittingFinishedInbound(item) {
    const applyDept = String((item && item.applyDept) || '')
    const remark = String((item && item.remark) || '').toUpperCase()
    const batchNo = String((item && item.batchNo) || '').toUpperCase()
    const isProduction = applyDept.includes('生产')
    const matchProcess =
      remark.includes('PROCESS=SLITTING') ||
      remark.includes('PROCESS=SLIT') ||
      remark.includes('PROCESS=REWINDING') ||
      remark.includes('PROCESS=PACKAGING') ||
      batchNo.includes('-SLITTING-') ||
      batchNo.includes('-SLIT-')
    return isProduction && matchProcess
  },

  shouldRequireLocationForApprove(item) {
    return !this.isSalesReturnInbound(item) && !this.isSlittingFinishedInbound(item)
  },

  openCreateForm() {
    this.setData({ showForm: true })
  },

  closeCreateForm() {
    this.setData({ showForm: false })
  },

  useRecordAsTemplate(e) {
    const index = Number((e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.index) || -1)
    const row = (this.data.inboundList || [])[index]
    if (!row) return
    this.setData({
      showForm: true,
      materialCode: row.materialCode && row.materialCode !== '-' ? row.materialCode : this.data.materialCode,
      productName: row.productName && row.productName !== '-' ? row.productName : (this.data.productName || row.materialCode || ''),
      batchNo: row.batchNo && row.batchNo !== '-' ? row.batchNo : this.data.batchNo,
      customerBatchNo: row.customerBatchNo && row.customerBatchNo !== '-' ? row.customerBatchNo : (row.batchNo && row.batchNo !== '-' ? row.batchNo : this.data.customerBatchNo),
      rolls: row.rolls && row.rolls !== '-' ? String(row.rolls) : this.data.rolls,
      qtyUnit: row.qtyUnit && row.qtyUnit !== '-' ? row.qtyUnit : this.data.qtyUnit
    })
    wx.showToast({ title: '已带入表单', icon: 'success' })
  },

  onMaterialCodeInput(e) { this.setData({ materialCode: e.detail.value }) },
  onQrCodeInput(e) { this.setData({ qrCode: e.detail.value }) },
  onProductNameInput(e) { this.setData({ productName: e.detail.value }) },
  onBatchNoInput(e) { this.setData({ batchNo: e.detail.value }) },
  onCustomerBatchNoInput(e) { this.setData({ customerBatchNo: e.detail.value }) },
  onRollsInput(e) { this.setData({ rolls: e.detail.value }) },
  onQtyUnitInput(e) { this.setData({ qtyUnit: e.detail.value }) },
  onThicknessInput(e) { this.setData({ thickness: e.detail.value }) },
  onWidthInput(e) { this.setData({ width: e.detail.value }) },
  onLengthInput(e) { this.setData({ length: e.detail.value }) },
  onLocationInput(e) { this.setData({ location: e.detail.value }) },
  onApplicantInput(e) { this.setData({ applicant: e.detail.value }) },
  onApplyDeptInput(e) { this.setData({ applyDept: e.detail.value }) },
  onRemarkInput(e) { this.setData({ remark: e.detail.value }) },

  onScanQrCode() {
    this.beginNativeScanSession()
    wx.scanCode({
      onlyFromCamera: false,
      success: (res) => {
        this.endNativeScanSession()
        this.setData({ qrCode: res.result || '' })
      },
      fail: () => {
        this.endNativeScanSession()
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
    this.setData({ queryLoading: true })
    try {
      const res = await getTapeStockList({ page: 1, size: 1, qrCode })
      const records = (res && res.data && res.data.records) || []
      if (!records.length) {
        wx.showToast({ title: '未找到对应库存', icon: 'none' })
        return
      }
      const stock = records[0]
      this.setData({
        materialCode: stock.materialCode || this.data.materialCode,
        productName: stock.productName || this.data.productName,
        batchNo: stock.batchNo || this.data.batchNo,
        customerBatchNo: stock.batchNo || this.data.customerBatchNo,
        thickness: stock.thickness || this.data.thickness,
        width: stock.width || this.data.width,
        length: stock.length || this.data.length
      })
      wx.showToast({ title: '已带出库存信息', icon: 'success' })
    } catch (e) {
      wx.showToast({ title: (e && (e.msg || e.message)) || '二维码查询失败', icon: 'none' })
    } finally {
      this.setData({ queryLoading: false })
    }
  },

  onScanCodeInput(e) {
    this.setData({ scanCode: (e.detail && e.detail.value) || '' })
  },

  onPalletLocationInput(e) {
    this.setData({ palletLocation: (e.detail && e.detail.value) || '' })
  },

  toggleCoatingScanMode() {
    const next = !this.data.coatingScanMode
    this.setData({
      coatingScanMode: next,
      coatingScanCode: next ? this.data.coatingScanCode : '',
      coatingScanLocation: next ? this.data.coatingScanLocation : '',
      coatingScannedItems: next ? this.data.coatingScannedItems : []
    })
  },

  onStartCoatingScan() {
    if (this.data.coatingScanMode) {
      return
    }
    this._coatingLooping = true
    this.setData({ coatingScanMode: true })
    this.scanNextCoatingCode()
  },

  onStopCoatingScan() {
    this._coatingLooping = false
    this.setData({ coatingScanMode: false })
    this.endNativeScanSession()
  },

  scanNextCoatingCode() {
    if (!this.data.coatingScanMode || !this._coatingLooping) {
      this.endNativeScanSession()
      return
    }
    this.beginNativeScanSession()
    wx.scanCode({
      onlyFromCamera: false,
      success: async (res) => {
        const code = String((res && (res.result || res.rawData)) || '').trim()
        if (code) {
          await this.addCoatingScanByCode(code)
        }
        if (this.data.coatingScanMode && this._coatingLooping) {
          setTimeout(() => this.scanNextCoatingCode(), 100)
        } else {
          this.endNativeScanSession()
        }
      },
      fail: () => {
        this._coatingLooping = false
        this.setData({ coatingScanMode: false })
        this.endNativeScanSession()
        wx.showToast({ title: '扫码已停止', icon: 'none' })
      }
    })
  },

  scanFromCameraOnly() {
    return new Promise((resolve) => {
      this.beginNativeScanSession()
      wx.scanCode({
        onlyFromCamera: true,
        success: (res) => {
          this.endNativeScanSession()
          const code = String((res && (res.result || res.rawData)) || '').trim()
          resolve(code || '')
        },
        fail: (err) => {
          this.endNativeScanSession()
          const msg = String((err && err.errMsg) || '').toLowerCase()
          if (msg.indexOf('cancel') < 0) {
            wx.showToast({ title: '扫码失败', icon: 'none' })
          }
          resolve('')
        }
      })
    })
  },

  onCoatingScanCodeInput(e) {
    this.setData({ coatingScanCode: (e.detail && e.detail.value) || '' })
  },

  onAddCoatingManualCode() {
    const code = String(this.data.coatingScanCode || '').trim()
    if (!code) {
      wx.showToast({ title: '请先输入编码', icon: 'none' })
      return
    }
    this.addCoatingScanByCode(code)
    this.setData({ coatingScanCode: '' })
  },

  onCoatingScanLocationInput(e) {
    this.setData({ coatingScanLocation: (e.detail && e.detail.value) || '' })
  },

  onCoatingKeywordInput(e) {
    this.setData({ coatingKeyword: (e.detail && e.detail.value) || '' })
  },

  onScanCoatingKeyword() {
    this.beginNativeScanSession()
    wx.scanCode({
      onlyFromCamera: false,
      success: async (res) => {
        this.endNativeScanSession()
        const code = String((res && (res.result || res.rawData)) || '').trim()
        if (!code) return
        this.setData({ coatingKeyword: code })
        await this.queryCoatingInboundListByKeyword({ appendScannedCode: code })
      },
      fail: () => {
        this.endNativeScanSession()
        wx.showToast({ title: '扫码取消或失败', icon: 'none' })
      }
    })
  },

  async queryCoatingInboundListByKeyword(options = {}) {
    await this.queryInboundList({ reset: true })
    const code = String((options && options.appendScannedCode) || '').trim()
    if (code) {
      await this.addCoatingScanByCode(code)
    }
  },

  filterCoatingRowsByKeyword(rows, keyword) {
    const list = Array.isArray(rows) ? rows : []
    const k = String(keyword || '').trim()
    if (!k) return list
    const candidates = this.extractScanCandidates(k).map(v => String(v || '').trim().toUpperCase()).filter(Boolean)
    const normalizedRaw = this.normalizeInboundScanCode(k).toUpperCase()
    return list.filter(row => this.isScanCodeMatchedRow(row, candidates, normalizedRaw))
  },

  isScanCodeMatchedRow(row, candidateCodes, normalizedRaw) {
    const candidates = Array.isArray(candidateCodes)
      ? candidateCodes.map(v => String(v || '').trim().toUpperCase()).filter(Boolean)
      : []
    const rowData = row || {}
    const requestNo = String(rowData.requestNo || '').trim().toUpperCase()
    const batchNo = String(rowData.batchNo || '').trim().toUpperCase()
    const customerBatchNo = String(rowData.customerBatchNo || '').trim().toUpperCase()
    const orderNo = String(rowData.orderNo || '').trim().toUpperCase()
    const rollCode = String(rowData.rollCode || '').trim().toUpperCase()
    const qrCode = String(rowData.qrCode || '').trim().toUpperCase()
    const remark = String(rowData.remark || '').trim().toUpperCase()
    const remarkTokens = this.extractRemarkTokenCandidates(remark)
    const fields = [requestNo, batchNo, customerBatchNo, orderNo, rollCode, qrCode, ...remarkTokens].filter(Boolean)
    const hitField = candidates.some(code => fields.some(f => f === code || f.indexOf(code) > -1 || code.indexOf(f) > -1))
    const hitRemark = candidates.some(code => code && remark.includes(code))
    const normalized = String(normalizedRaw || '').trim().toUpperCase()
    const hitNormalized = !!normalized && fields.some(f => f === normalized || f.indexOf(normalized) > -1 || normalized.indexOf(f) > -1)
    return hitField || hitRemark || hitNormalized
  },

  extractRemarkTokenCandidates(remarkText) {
    const text = String(remarkText || '').trim()
    if (!text) return []
    const keys = ['ROLLCODE', 'MOTHERROLLNO', 'ROLL_NO', 'ROLLNO', 'QRCODE', 'BATCHNO', 'INCOMINGBATCHNO']
    const values = []
    keys.forEach((key) => {
      const reg = new RegExp(`${key}\\s*[:：=]\\s*([^|,;\\s]+)`, 'ig')
      let m
      while ((m = reg.exec(text))) {
        const val = String((m && m[1]) || '').trim().toUpperCase()
        if (val && values.indexOf(val) < 0) values.push(val)
      }
    })
    return values
  },

  onScanCoatingLocation() {
    this.beginNativeScanSession()
    wx.scanCode({
      onlyFromCamera: false,
      success: (res) => {
        this.endNativeScanSession()
        const code = String((res && (res.result || res.rawData)) || '').trim()
        if (!code) return
        this.setData({ coatingScanLocation: code })
      },
      fail: () => {
        this.endNativeScanSession()
        wx.showToast({ title: '扫码取消或失败', icon: 'none' })
      }
    })
  },

  onScanCoatingInboundCode() {
    this.beginNativeScanSession()
    wx.scanCode({
      onlyFromCamera: false,
      success: (res) => {
        this.endNativeScanSession()
        const code = String((res && (res.result || res.rawData)) || '').trim()
        if (!code) {
          wx.showToast({ title: '未识别到扫码内容', icon: 'none' })
          return
        }
        this.setData({ coatingScanCode: code }, () => this.addCoatingScanByCode(code))
      },
      fail: () => {
        this.endNativeScanSession()
        wx.showToast({ title: '扫码取消或失败', icon: 'none' })
      }
    })
  },

  async getCoatingInboundRecordsForScan() {
    const localList = Array.isArray(this.data.coatingAllInboundList) && this.data.coatingAllInboundList.length > 0
      ? this.data.coatingAllInboundList
      : (Array.isArray(this.data.inboundList) ? this.data.inboundList : [])
    if (localList.length > 0) {
      return localList
    }
    await this.queryInboundList({ reset: true })
    return Array.isArray(this.data.coatingAllInboundList) ? this.data.coatingAllInboundList : []
  },

  async queryCoatingInboundByCode(scanCode) {
    const code = String(scanCode || '').trim()
    if (!code) return []
    const candidates = this.extractScanCandidates(code)
      .map(v => String(v || '').trim())
      .filter(Boolean)
    const tried = new Set()
    for (let i = 0; i < candidates.length; i += 1) {
      const k = candidates[i]
      const up = k.toUpperCase()
      if (tried.has(up)) continue
      tried.add(up)
      const res = await getInboundList({
        current: 1,
        page: 1,
        size: 30,
        status: 0,
        sourceType: 'PROD_COATING',
        keyword: k
      })
      let records = (((res || {}).data || {}).records) || []
      if (Array.isArray(records) && records.length > 0) {
        records = records.filter(item => this.isCoatingInboundRecord(item))
      }
      const normalized = this.sortInboundRowsLikePurchase((Array.isArray(records) ? records : []).map(item => this.normalizeRecord(item)))
      if (normalized.length > 0) {
        return normalized
      }
    }
    return []
  },

  isCoatingInboundRecord(item) {
    const row = item || {}
    const sourceType = String(row.sourceType || row.source_type || '').trim().toUpperCase()
    const applyDept = String(row.applyDept || row.apply_dept || '').trim()
    const requestNo = String(row.requestNo || row.request_no || '').trim()
    const remarkRaw = String(row.remark || '')
    const remarkUp = remarkRaw.toUpperCase()

    if (sourceType === 'PROD_COATING' || sourceType === 'MANUAL_COATING' || sourceType.indexOf('COATING') > -1) return true

    if (applyDept.includes('涂布')) return true
    if (requestNo.toUpperCase().includes('COATING')) return true

    if (
      remarkUp.includes('PROCESS=COATING') ||
      remarkUp.includes('PROCESS = COATING') ||
      remarkUp.includes('MANUAL-COATING')
    ) return true

    if (
      remarkRaw.includes('process=涂布') ||
      remarkRaw.includes('process = 涂布') ||
      remarkRaw.includes('PROCESS=涂布') ||
      remarkRaw.includes('PROCESS = 涂布') ||
      remarkRaw.includes('工序报工入库申请') && remarkRaw.includes('涂布')
    ) return true

    return false
  },

  extractOrderInfoByRecord(record) {
    const row = record || {}
    const direct = String(row.orderNo || row.order_no || '').trim()
    if (direct) return direct
    const remark = String(row.remark || '').trim()
    if (!remark) return '-'
    const m = remark.match(/orderNo\s*=\s*([^,;\s]+)/i) || remark.match(/order[_-]?no\s*[:：=]\s*([^,;\s]+)/i)
    return m && m[1] ? String(m[1]).trim() : '-'
  },

  findMatchedInboundRecord(records, scanCode) {
    const exact = this.findMatchedInboundRecordExact(records, scanCode)
    if (exact) return exact
    const list = Array.isArray(records) ? records : []
    const candidates = this.extractScanCandidates(scanCode).map(v => String(v || '').trim().toUpperCase()).filter(Boolean)
    const normalizedRaw = this.normalizeInboundScanCode(scanCode).toUpperCase()
    for (let i = 0; i < list.length; i += 1) {
      const row = list[i] || {}
      if (this.isScanCodeMatchedRow(row, candidates, normalizedRaw)) {
        return row
      }
    }
    return null
  },

  findMatchedInboundRecordExact(records, scanCode) {
    const list = Array.isArray(records) ? records : []
    const candidates = this.extractScanCandidates(scanCode)
      .map(v => String(v || '').trim().toUpperCase())
      .filter(Boolean)
    if (!candidates.length) return null
    for (let i = 0; i < list.length; i += 1) {
      const row = list[i] || {}
      const fields = [
        row.requestNo,
        row.batchNo,
        row.customerBatchNo,
        row.rollCode,
        row.qrCode
      ].map(v => String(v || '').trim().toUpperCase()).filter(Boolean)
      const hit = candidates.some(code => fields.includes(code))
      if (hit) return row
    }
    return null
  },

  isLikelyBatchCode(code) {
    const v = String(code || '').trim().toUpperCase()
    if (!v) return false
    return /^[A-Z0-9]{6,}(?:-[A-Z0-9]{1,8}){1,3}$/.test(v)
  },

  async addCoatingScanByCode(scanCodeArg) {
    const scanCode = String(scanCodeArg || this.data.coatingScanCode || '').trim()
    if (!scanCode) {
      wx.showToast({ title: '请先扫码或输入编码', icon: 'none' })
      return
    }
    this.setData({ coatingScanLoading: true })
    try {
      // 复用“涂布入库申请”列表数据进行匹配；本地无数据时再拉取。
      const list = await this.getCoatingInboundRecordsForScan()
      let matched = this.findMatchedInboundRecord(list, scanCode)
      let remoteRows = []
      if (!matched) {
        remoteRows = await this.queryCoatingInboundByCode(scanCode)
        matched = this.findMatchedInboundRecord(remoteRows, scanCode)
      }
      if (!matched || !matched.id) {
        wx.showToast({ title: '未匹配到待入库涂布明细', icon: 'none' })
        return
      }

      // 关键校验：扫码值看起来是批次号时，必须与匹配到的申请批次一致。
      const scanUpper = String(scanCode || '').trim().toUpperCase()
      const matchedBatch = String((matched && matched.batchNo) || '').trim().toUpperCase()
      if (this.isLikelyBatchCode(scanUpper) && matchedBatch && matchedBatch !== scanUpper) {
        if (!remoteRows.length) {
          remoteRows = await this.queryCoatingInboundByCode(scanCode)
        }
        const exactRemote = this.findMatchedInboundRecordExact(remoteRows, scanCode)
        if (exactRemote && exactRemote.id) {
          matched = exactRemote
        } else {
          wx.showToast({ title: '扫码批次与申请批次不一致，请核对标签', icon: 'none' })
          return
        }
      }

      const selectedId = Number(this.data.selectedCoatingId || 0)
      if (selectedId > 0 && Number(matched.id) !== selectedId) {
        const selectedRow = this.data.selectedCoatingRow || null
        const selectedOrderNo = String((selectedRow && selectedRow.orderNo) || '').trim().toUpperCase()
        const matchedOrderNo = String((matched && matched.orderNo) || '').trim().toUpperCase()
        if (selectedOrderNo && matchedOrderNo && selectedOrderNo === matchedOrderNo) {
          // 同一订单允许连续扫码多个入库申请（与采购扫码“单据内多明细”一致）
        } else {
          wx.showToast({ title: '该码不属于当前选择的入库申请', icon: 'none' })
          return
        }
      }

      const existed = (this.data.coatingScannedItems || []).some(item => {
        const oldCode = String(item.scanCode || '').trim().toUpperCase()
        const newCode = String(scanCode || '').trim().toUpperCase()
        return oldCode && newCode && oldCode === newCode
      })
      if (existed) {
        wx.showToast({ title: '该码已扫码', icon: 'none' })
        return
      }

      const scanItem = {
        id: matched.id,
        requestNo: matched.requestNo,
        orderInfo: this.extractOrderInfoByRecord(matched),
        batchNo: matched.batchNo || '-',
        materialCode: matched.materialCode,
        productName: matched.productName || '-',
        specDesc: matched.specDesc || '-',
        qtyText: matched.qtyText || '-',
        motherRollNo: matched.batchNo || '-',
        scanCode
      }
      const next = (this.data.coatingScannedItems || []).concat(scanItem)
      this.setData({
        selectedCoatingId: selectedId > 0 ? selectedId : Number(matched.id),
        selectedCoatingRow: selectedId > 0 ? (this.data.selectedCoatingRow || matched) : matched,
        coatingScannedItems: next,
        coatingScannedGrouped: this.rebuildCoatingScannedGrouped(next),
        coatingScanCode: ''
      })
      this.refreshCoatingSummary(this.data.selectedCoatingRow || matched, next)
      wx.showToast({ title: '已加入扫码明细', icon: 'success' })
    } catch (e) {
      wx.showToast({ title: (e && (e.msg || e.message)) || '扫码解析失败', icon: 'none' })
    } finally {
      this.setData({ coatingScanLoading: false })
    }
  },

  removeCoatingScanItem(e) {
    const id = Number((e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.id) || 0)
    const scanCode = String((e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.scanCode) || '').trim().toUpperCase()
    if (!(id > 0) && !scanCode) return
    const next = (this.data.coatingScannedItems || []).filter((item) => {
      if (id > 0) {
        return Number(item.id || 0) !== id
      }
      return String(item.scanCode || '').trim().toUpperCase() !== scanCode
    })
    this.setData({
      coatingScannedItems: next,
      coatingScannedGrouped: this.rebuildCoatingScannedGrouped(next)
    })
    this.refreshCoatingSummary(this.data.selectedCoatingRow, next)
  },

  clearCoatingScanItems() {
    this.setData({ coatingScannedItems: [], coatingScannedGrouped: [] })
    this.refreshCoatingSummary(this.data.selectedCoatingRow, [])
  },

  rebuildCoatingScannedGrouped(scannedItems) {
    const list = Array.isArray(scannedItems) ? scannedItems : []
    const grouped = new Map()
    list.forEach((row) => {
      const id = Number((row && row.id) || 0)
      const key = id > 0 ? `id:${id}` : `code:${String((row && row.scanCode) || '').trim().toUpperCase()}`
      const old = grouped.get(key)
      if (!old) {
        grouped.set(key, {
          id: row.id || null,
          requestNo: row.requestNo || '-',
          orderInfo: row.orderInfo || '-',
          materialCode: row.materialCode || '-',
          productName: row.productName || '-',
          batchNo: row.batchNo || '-',
          qtyText: row.qtyText || '-',
          count: 1,
          lastScanCode: row.scanCode || '-'
        })
        return
      }
      old.count += 1
      old.lastScanCode = row.scanCode || old.lastScanCode
    })
    return Array.from(grouped.values())
  },

  onSelectCoatingRequest(e) {
    const id = Number((e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.id) || 0)
    if (!id) return
    const row = (this.data.inboundList || []).find(item => Number(item.id) === id)
    if (!row) {
      wx.showToast({ title: '申请不存在或已更新', icon: 'none' })
      return
    }
    const currentId = Number(this.data.selectedCoatingId || 0)
    const keepScanned = currentId > 0 && currentId === id
    const scanned = keepScanned ? (this.data.coatingScannedItems || []) : []
    this.setData({
      selectedCoatingId: id,
      selectedCoatingRow: row,
      coatingScannedItems: scanned,
      coatingScannedGrouped: this.rebuildCoatingScannedGrouped(scanned),
      coatingScanCode: ''
    })
    this.refreshCoatingSummary(row, scanned)
    wx.showToast({ title: '已选择当前申请', icon: 'success' })
  },

  refreshCoatingSummary(selectedRow, scannedItems) {
    const row = selectedRow || this.data.selectedCoatingRow || null
    const scanned = Array.isArray(scannedItems) ? scannedItems : (this.data.coatingScannedItems || [])
    const toNum = (v) => {
      const n = Number(v)
      return Number.isFinite(n) ? n : 0
    }
    const planQty = row ? toNum(row.planQty || row.rolls || 0) : 0
    const printedQty = row ? toNum(row.printedQty || 0) : 0
    const scannedQty = row ? toNum(row.scannedQty || 0) : 0
    this.setData({
      coatingSummary: {
        planQty,
        printedQty,
        scannedQty,
        currentScanQty: scanned.length
      }
    })
  },

  async submitCoatingScannedInbound() {
    const items = this.data.coatingScannedItems || []
    const selectedId = Number(this.data.selectedCoatingId || 0)
    if (!this.data.canWarehouse) {
      wx.showToast({ title: '当前账号无入仓审批权限，请用仓库/管理员账号', icon: 'none' })
      return
    }
    if (!(selectedId > 0)) {
      wx.showToast({ title: '请先在步骤1选择入库申请', icon: 'none' })
      return
    }
    if (!items.length) {
      wx.showToast({ title: '请先扫码添加明细', icon: 'none' })
      return
    }
    const scannedLocation = (this.data.coatingScanLocation || '').trim()
    if (!scannedLocation) {
      wx.showToast({ title: '请先填写卡板位', icon: 'none' })
      return
    }
    const userInfo = getUserInfo() || {}
    const auditor = (userInfo.name || userInfo.username || '').trim()
    if (!auditor) {
      wx.showToast({ title: '无法识别当前审批人', icon: 'none' })
      return
    }

    this.setData({ coatingSubmitting: true })
    try {
      const uniqueRows = []
      const idSet = new Set()
      for (let i = 0; i < items.length; i += 1) {
        const row = items[i] || {}
        const id = Number(row.id || 0)
        if (!(id > 0)) continue
        if (idSet.has(id)) continue
        idSet.add(id)
        uniqueRows.push(row)
      }
      for (let i = 0; i < uniqueRows.length; i += 1) {
        const row = uniqueRows[i]
        await approveInbound(row.id, {
          approved: true,
          auditor,
          auditRemark: '小程序涂布扫码批量入库',
          scannedLocation,
          scannedRollCode: row.motherRollNo || undefined
        })
      }
      wx.showToast({ title: '批量入库完成', icon: 'success' })
      this.setData({
        coatingScannedItems: [],
        coatingScannedGrouped: [],
        coatingScanLocation: '',
        coatingScanCode: '',
        coatingScanMode: false,
        selectedCoatingId: null,
        selectedCoatingRow: null,
        coatingSummary: {
          planQty: 0,
          printedQty: 0,
          scannedQty: 0,
          currentScanQty: 0
        }
      })
      this.queryInboundList()
    } catch (e) {
      wx.showToast({ title: (e && (e.msg || e.message)) || '批量入库失败', icon: 'none' })
    } finally {
      this.setData({ coatingSubmitting: false })
    }
  },

  onScanInboundCode() {
    this.beginNativeScanSession()
    wx.scanCode({
      onlyFromCamera: false,
      success: (res) => {
        this.endNativeScanSession()
        const code = String((res && (res.result || res.rawData)) || '').trim()
        if (!code) {
          wx.showToast({ title: '未识别到扫码内容', icon: 'none' })
          return
        }
        this.setData({ scanCode: code }, () => this.fetchInboundDetailByScanCode())
      },
      fail: () => {
        this.endNativeScanSession()
        wx.showToast({ title: '扫码取消或失败', icon: 'none' })
      }
    })
  },

  normalizeInboundScanCode(scanCode) {
    const raw = String(scanCode || '').trim()
    if (!raw) return ''
    const separators = ['-', '_', '/']
    for (let i = 0; i < separators.length; i += 1) {
      const sep = separators[i]
      const idx = raw.lastIndexOf(sep)
      if (idx > 0) {
        const suffix = raw.slice(idx + 1)
        if (/^\d{1,4}$/.test(suffix)) {
          return raw.slice(0, idx)
        }
      }
    }
    return raw
  },

  extractScanCandidates(scanCode) {
    const raw = String(scanCode || '').trim()
    if (!raw) return []
    const list = []
    const push = (v) => {
      const s = String(v || '').trim()
      if (!s) return
      if (list.indexOf(s) < 0) list.push(s)
    }
    push(raw)
    push(raw.toUpperCase())
    push(this.normalizeInboundScanCode(raw))
    push(this.normalizeInboundScanCode(raw).toUpperCase())

    const inMatch = raw.toUpperCase().match(/IN\d{8,}/)
    if (inMatch && inMatch[0]) push(inMatch[0])

    try {
      const qIdx = raw.indexOf('?')
      if (qIdx > -1) {
        const query = raw.substring(qIdx + 1)
        query.split('&').forEach(pair => {
          const [k, v] = pair.split('=')
          const key = decodeURIComponent((k || '').trim()).toLowerCase()
          if (
            key === 'code' ||
            key === 'receiptno' ||
            key === 'requestno' ||
            key === 'batchno' ||
            key === 'rollcode' ||
            key === 'roll_no' ||
            key === 'motherrollno' ||
            key === 'qrcode'
          ) {
            push(decodeURIComponent((v || '').trim()))
          }
        })
      }
    } catch (e) {}

    raw.split(/[|,，;；\s]+/g)
      .map(v => String(v || '').trim())
      .filter(v => v.length >= 6)
      .forEach(push)

    raw.split(/[^A-Za-z0-9_-]+/g)
      .map(v => String(v || '').trim())
      .filter(v => v.length >= 6)
      .forEach(push)

    const requestLike = raw.toUpperCase().match(/IN\d{8,}/g) || []
    requestLike.forEach(push)

    const batchLike = raw.toUpperCase().match(/[A-Z0-9]{6,}(?:-[A-Z0-9]{1,8}){1,3}/g) || []
    batchLike.forEach(push)
    return list
  },

  parseReceiptIdFromRemark(remark) {
    const text = String(remark || '')
    const m = text.match(/\|receiptId=(\d+)\|/i)
    if (!m || !m[1]) return null
    const id = Number(m[1])
    return Number.isFinite(id) && id > 0 ? id : null
  },

  async tryResolveReceiptIdByInboundList(candidates) {
    try {
      const isCoating = this.data.scene === 'coatingInbound'
      const res = await getInboundList({
        current: 1,
        page: 1,
        size: 200,
        status: 0,
        sourceType: isCoating ? 'PROD_COATING' : 'PURCHASE_RECEIVING'
      })
      const records = (((res || {}).data || {}).records) || []
      if (!Array.isArray(records) || records.length === 0) return null
      const codeList = (candidates || [])
        .map(v => String(v || '').trim().toUpperCase())
        .filter(v => !!v)
      for (let i = 0; i < records.length; i += 1) {
        const r = records[i] || {}
        const requestNo = String(r.requestNo || r.request_no || '').trim().toUpperCase()
        const batchNo = String(r.batchNo || r.batch_no || '').trim().toUpperCase()
        const customerBatchNo = String(r.customerBatchNo || r.customer_batch_no || '').trim().toUpperCase()
        if (codeList.indexOf(requestNo) > -1 || codeList.indexOf(batchNo) > -1 || codeList.indexOf(customerBatchNo) > -1) {
          const rid = this.parseReceiptIdFromRemark(r.remark)
          if (rid) return rid
        }
      }
      return null
    } catch (e) {
      return null
    }
  },

  pickMatchedScanItem(items, scanCode) {
    if (!Array.isArray(items) || items.length === 0) return null
    const raw = String(scanCode || '').trim().toUpperCase()
    const normalized = this.normalizeInboundScanCode(raw).toUpperCase()
    for (let i = 0; i < items.length; i += 1) {
      const row = items[i] || {}
      const requestNo = String(row.requestNo || '').trim().toUpperCase()
      const incomingBatchNo = String(row.incomingBatchNo || '').trim().toUpperCase()
      if ((requestNo && requestNo === raw) || (incomingBatchNo && (incomingBatchNo === raw || incomingBatchNo === normalized))) {
        return row
      }
    }
    return items[0]
  },

  async fetchInboundDetailByScanCode() {
    const scanCode = (this.data.scanCode || '').trim()
    if (!scanCode) {
      wx.showToast({ title: '请先扫码或输入编码', icon: 'none' })
      return
    }
    this.setData({ scanLoading: true })
    try {
      if (this.data.scene === 'coatingInbound') {
        const rows = await this.queryCoatingInboundByCode(scanCode)
        const matched = this.findMatchedInboundRecord(rows, scanCode)
        if (!matched || !matched.id) {
          wx.showToast({ title: '未找到待入库涂布申请', icon: 'none' })
          return
        }
        const detail = {
          requestId: matched.id,
          requestNo: matched.requestNo || '-',
          materialCode: matched.materialCode || '-',
          materialName: matched.productName || '-',
          specification: matched.specDesc || '-',
          materialQty: matched.qtyText || '-',
          supplierCode: '-',
          productionDate: '-',
          batchNo: matched.batchNo || '-',
          submitScanCode: scanCode
        }
        this.setData({ scanDetail: detail })
        wx.showToast({ title: '已获取涂布入库详情', icon: 'success' })
        return
      }

      const candidates = this.extractScanCandidates(scanCode)
      let data = null
      let items = []

      for (let i = 0; i < candidates.length; i += 1) {
        const code = candidates[i]
        try {
          const res = await getScanInboundDocument({
            scanCode: code,
            receiptNo: code
          })
          data = (res && res.data) || {}
          items = Array.isArray(data.items) ? data.items : []
          if (items.length > 0) {
            break
          }
        } catch (e) {}
      }

      if (!items.length) {
        const receiptId = await this.tryResolveReceiptIdByInboundList(candidates)
        if (receiptId) {
          const resById = await getScanInboundDocument({ receiptId })
          data = (resById && resById.data) || {}
          items = Array.isArray(data.items) ? data.items : []
        }
      }

      if (!items.length) {
        wx.showToast({ title: '未找到待入库明细', icon: 'none' })
        return
      }
      const row = this.pickMatchedScanItem(items, scanCode)
      const rawReceiptId = data.receiptId
      const receiptId = Number(rawReceiptId)
      const normalizedReceiptId = Number.isFinite(receiptId) && receiptId > 0 ? receiptId : null
      const receiptNo = String(data.receiptNo || '').trim()
      const detail = {
        receiptId: normalizedReceiptId,
        receiptNo: receiptNo && receiptNo !== '-' ? receiptNo : '',
        requestId: row.requestId || null,
        requestNo: row.requestNo || '-',
        materialCode: row.materialCode || '-',
        materialName: row.materialName || '-',
        specification: row.specification || '-',
        materialQty: `${row.planQty || 0}${row.unit || ''}`,
        supplierCode: row.supplierCode || data.supplier || '-',
        productionDate: row.productionDate || '-',
        batchNo: row.incomingBatchNo || '-',
        submitScanCode: scanCode
      }
      this.setData({ scanDetail: detail })
      wx.showToast({ title: '已获取入库详情', icon: 'success' })
    } catch (e) {
      wx.showToast({ title: (e && (e.msg || e.message)) || '扫码解析失败', icon: 'none' })
    } finally {
      this.setData({ scanLoading: false })
    }
  },

  async confirmScannedInbound() {
    const detail = this.data.scanDetail
    if (!detail) {
      wx.showToast({ title: '请先扫码获取入库详情', icon: 'none' })
      return
    }
    const scannedLocation = (this.data.palletLocation || '').trim()
    if (!scannedLocation) {
      wx.showToast({ title: '请先填写卡板位', icon: 'none' })
      return
    }
    const userInfo = getUserInfo() || {}
    const operator = (userInfo.name || userInfo.username || '').trim() || 'miniapp'
    this.setData({ inboundSubmitting: true })
    try {
      if (this.data.scene === 'coatingInbound') {
        const requestId = Number(detail.requestId || 0)
        if (!(requestId > 0)) {
          wx.showToast({ title: '未识别到涂布入库申请', icon: 'none' })
          return
        }
        await approveInbound(requestId, {
          approved: true,
          auditor: operator,
          auditRemark: '小程序涂布扫码入库',
          scannedLocation,
          scannedRollCode: (detail.batchNo || '').trim() || undefined
        })
        wx.showToast({ title: '涂布入库完成', icon: 'success' })
        this.setData({
          scanCode: '',
          palletLocation: '',
          scanDetail: null
        })
        return
      }

      const scanCode = (detail.submitScanCode || this.data.scanCode || '').trim()
      await submitInboundScan({
        receiptId: detail.receiptId || undefined,
        receiptNo: (detail.receiptNo || '').trim() || undefined,
        scanCodes: scanCode ? [scanCode] : [],
        scannedLocation,
        operator
      })
      wx.showToast({ title: '入库完成', icon: 'success' })
      this.setData({
        scanCode: '',
        palletLocation: '',
        scanDetail: null
      })
    } catch (e) {
      wx.showToast({ title: (e && (e.msg || e.message)) || '入库失败', icon: 'none' })
    } finally {
      this.setData({ inboundSubmitting: false })
    }
  },

  normalizeRecord(item) {
    const needLocation = this.shouldRequireLocationForApprove(item)
    const rolls = item.rolls === null || item.rolls === undefined ? '-' : item.rolls
    const qtyUnit = item.qty_unit || item.qtyUnit || '卷'
    const t = Number(item.thickness)
    const w = Number(item.width)
    const l = Number(item.length)
    const hasDims = Number.isFinite(t) && t > 0 && Number.isFinite(w) && w > 0 && Number.isFinite(l) && l > 0
    const specDescRaw = String(item.spec_desc || item.specDesc || '').trim()
    // 规格显示优先使用后端返回原文（采购来料场景必须与采购单/收货单一致），
    // 仅在原文缺失时才使用厚宽长兜底拼接。
    const specDesc = specDescRaw || (hasDims ? `${t}μm*${w}mm*${l}m` : '-')
    const toNum = (v) => {
      const n = Number(v)
      return Number.isFinite(n) ? n : 0
    }
    const planQty = toNum(item.plan_qty || item.planQty || item.material_qty || item.materialQty || item.rolls)
    const printedQty = toNum(item.printed_qty || item.printedQty)
    const scannedQty = toNum(item.scanned_qty || item.scannedQty || item.inboundQty)
    return {
      id: item.id,
      requestNo: item.request_no || item.requestNo || '-',
      orderNo: this.extractOrderInfoByRecord(item),
      sourceType: item.sourceType || item.source_type || '',
      applyTime: item.apply_time || item.applyTime || item.createTime || item.create_time || item.updateTime || item.update_time || '',
      materialCode: item.material_code || item.materialCode || '-',
      productName: item.product_name || item.productName || (item.material_code || item.materialCode || '-'),
      batchNo: item.batch_no || item.batchNo || '-',
      rollCode: item.roll_code || item.rollCode || item.mother_roll_no || item.motherRollNo || '-',
      qrCode: item.qr_code || item.qrCode || '-',
      customerBatchNo: item.customer_batch_no || item.customerBatchNo || item.batch_no || item.batchNo || '-',
      specDesc,
      qtyUnit,
      qtyText: rolls === '-' ? '-' : `${rolls}${qtyUnit || ''}`,
      rolls,
      location: item.location || '-',
      status: item.status,
      applicant: item.applicant || '-',
      applyDept: item.apply_dept || item.applyDept || '',
      remark: item.remark || '',
      needLocation,
      planQty,
      printedQty,
      scannedQty
    }
  },

  sortInboundRowsLikePurchase(rows) {
    const list = Array.isArray(rows) ? rows.slice() : []
    const toTime = (row) => {
      const raw = row && row.applyTime
      if (!raw) return 0
      const t = new Date(raw).getTime()
      return Number.isFinite(t) ? t : 0
    }
    list.sort((a, b) => {
      const ta = toTime(a)
      const tb = toTime(b)
      if (tb !== ta) return tb - ta
      const ia = Number((a && a.id) || 0)
      const ib = Number((b && b.id) || 0)
      return ib - ia
    })
    return list
  },

  onAuditLocationInput(e) {
    const id = Number((e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.id) || 0)
    if (!id) return
    const val = (e.detail && e.detail.value) || ''
    const map = { ...(this.data.auditLocationMap || {}) }
    map[id] = val
    this.setData({ auditLocationMap: map })
  },

  onAuditRollCodeInput(e) {
    const id = Number((e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.id) || 0)
    if (!id) return
    const val = (e.detail && e.detail.value) || ''
    const map = { ...(this.data.auditRollCodeMap || {}) }
    map[id] = val
    this.setData({ auditRollCodeMap: map })
  },

  onScanAuditLocation(e) {
    const id = Number((e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.id) || 0)
    if (!id) return
    this.beginNativeScanSession()
    wx.scanCode({
      onlyFromCamera: false,
      success: (res) => {
        this.endNativeScanSession()
        const val = String((res && (res.result || res.rawData)) || '').trim()
        if (!val) return
        const map = { ...(this.data.auditLocationMap || {}) }
        map[id] = val
        this.setData({ auditLocationMap: map })
      },
      fail: () => {
        this.endNativeScanSession()
        wx.showToast({ title: '扫码取消或失败', icon: 'none' })
      }
    })
  },

  onScanAuditRollCode(e) {
    const id = Number((e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.id) || 0)
    if (!id) return
    this.beginNativeScanSession()
    wx.scanCode({
      onlyFromCamera: false,
      success: (res) => {
        this.endNativeScanSession()
        const val = String((res && (res.result || res.rawData)) || '').trim()
        if (!val) return
        const map = { ...(this.data.auditRollCodeMap || {}) }
        map[id] = val
        this.setData({ auditRollCodeMap: map })
      },
      fail: () => {
        this.endNativeScanSession()
        wx.showToast({ title: '扫码取消或失败', icon: 'none' })
      }
    })
  },

  async approveRecord(e) {
    const id = Number((e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.id) || 0)
    if (!id) return
    if (!this.data.canWarehouse) {
      wx.showToast({ title: '仅仓库/管理员可审批', icon: 'none' })
      return
    }
    const userInfo = getUserInfo() || {}
    const auditor = (userInfo.name || userInfo.username || '').trim()
    if (!auditor) {
      wx.showToast({ title: '无法识别当前审批人', icon: 'none' })
      return
    }
    const row = (this.data.inboundList || []).find(item => Number(item.id) === id)
    const needLocation = row ? !!row.needLocation : true
    const scannedLocation = ((this.data.auditLocationMap || {})[id] || '').trim()
    if (needLocation && !scannedLocation) {
      wx.showToast({ title: '请先输入卡板位', icon: 'none' })
      return
    }
    const scannedRollCode = ((this.data.auditRollCodeMap || {})[id] || '').trim()
    try {
      await approveInbound(id, {
        approved: true,
        auditor,
        auditRemark: '小程序来料入库审批通过',
        scannedLocation: scannedLocation || undefined,
        scannedRollCode: scannedRollCode || undefined
      })
      wx.showToast({ title: '审批通过', icon: 'success' })
      this.queryInboundList()
    } catch (e1) {
      wx.showToast({ title: (e1 && (e1.msg || e1.message)) || '审批失败', icon: 'none' })
    }
  },

  async rejectRecord(e) {
    const id = Number((e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.id) || 0)
    if (!id) return
    const userInfo = getUserInfo() || {}
    const auditor = (userInfo.name || userInfo.username || '').trim()
    if (!auditor) {
      wx.showToast({ title: '无法识别当前审批人', icon: 'none' })
      return
    }
    try {
      await approveInbound(id, {
        approved: false,
        auditor,
        auditRemark: '小程序来料入库审批拒绝'
      })
      wx.showToast({ title: '已拒绝', icon: 'success' })
      this.queryInboundList()
    } catch (e1) {
      wx.showToast({ title: (e1 && (e1.msg || e1.message)) || '操作失败', icon: 'none' })
    }
  },

  async cancelRecord(e) {
    const id = Number((e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.id) || 0)
    if (!id) return
    try {
      await cancelInbound(id)
      wx.showToast({ title: '已取消', icon: 'success' })
      this.queryInboundList()
    } catch (e1) {
      wx.showToast({ title: (e1 && (e1.msg || e1.message)) || '取消失败', icon: 'none' })
    }
  },

  async submitInbound() {
    const {
      materialCode,
      productName,
      batchNo,
      customerBatchNo,
      rolls,
      qtyUnit,
      thickness,
      width,
      length,
      location,
      applicant,
      applyDept,
      remark
    } = this.data

    if (!materialCode) {
      wx.showToast({ title: '请填写料号', icon: 'none' })
      return
    }
    if (!applicant) {
      wx.showToast({ title: '请填写申请人', icon: 'none' })
      return
    }

    const resolvedCustomerBatchNo = (customerBatchNo || '').trim() || (batchNo || '').trim()
    if (!resolvedCustomerBatchNo) {
      wx.showToast({ title: '请填写客户批次号', icon: 'none' })
      return
    }

    const payload = {
      materialCode: materialCode.trim(),
      productName: (productName || '').trim() || materialCode.trim(),
      batchNo: (batchNo || '').trim() || undefined,
      customerBatchNo: resolvedCustomerBatchNo,
      rolls: Math.max(1, Number(rolls) || 1),
      qtyUnit: (qtyUnit || '').trim() || '卷',
      thickness: thickness === '' ? undefined : Number(thickness),
      width: width === '' ? undefined : Number(width),
      length: length === '' ? undefined : Number(length),
      location: (location || '').trim() || undefined,
      applicant: applicant.trim(),
      applyDept: (applyDept || '').trim() || '生产',
      remark: (remark || '').trim() || undefined
    }

    this.setData({ submitting: true })
    try {
      await createInboundRequest(payload)
      wx.showToast({ title: '入库申请已提交', icon: 'success' })
      this.queryInboundList()
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

  async queryInboundList(options = {}) {
    const isPurchase = this.data.scene === 'purchaseInbound'
    const isCoating = this.data.scene === 'coatingInbound'
    const reset = options && options.reset === false ? false : true
    const loadingState = reset ? { queryLoading: true } : { coatingLoadingMore: true }
    this.setData(loadingState)
    try {
      const sourceType = this.data.querySourceType || (isPurchase ? 'PURCHASE_RECEIVING' : undefined)
      const status = this.data.queryStatus !== '' ? this.data.queryStatus : (isPurchase ? 0 : undefined)
      const nextPage = isCoating ? (reset ? 1 : (Number(this.data.coatingCurrentPage || 0) + 1)) : 1
      const size = isCoating ? Number(this.data.coatingPageSize || 50) : 50
      const materialCodeFilter = isCoating ? undefined : ((this.data.materialCode || '').trim() || undefined)
      const keyword = isCoating ? String(this.data.coatingKeyword || '').trim() : ''
      const res = await getInboundList({
        current: nextPage,
        page: nextPage,
        size,
        status,
        sourceType,
        materialCode: materialCodeFilter,
        keyword: keyword || undefined
      })
      const data = res.data || {}
      let records = Array.isArray(data.records) ? data.records : []

      if (isCoating && records.length > 0) {
        records = records.filter(item => this.isCoatingInboundRecord(item))
      }

      const normalized = this.sortInboundRowsLikePurchase(records.map(item => this.normalizeRecord(item)))
      if (isCoating) {
        const currentList = reset ? [] : (Array.isArray(this.data.coatingAllInboundList) ? this.data.coatingAllInboundList : [])
        const merged = currentList.concat(normalized)
        const dedupMap = new Map()
        merged.forEach((row) => {
          const id = Number((row && row.id) || 0)
          if (id > 0 && !dedupMap.has(id)) {
            dedupMap.set(id, row)
          }
        })
        const displayList = Array.from(dedupMap.values())
        const total = Number(data.total || 0)
        const currentPage = Number(data.current || nextPage)
        const pageSize = Number(data.size || size)
        const hasMore = (currentPage * pageSize) < total
        const selectedId = Number(this.data.selectedCoatingId || 0)
        let selectedRow = selectedId > 0
          ? ((displayList || []).find(item => Number(item.id) === selectedId) || null)
          : null
        let selectedIdNext = selectedRow ? selectedId : null
        if (!selectedRow && reset && displayList.length === 1) {
          selectedRow = displayList[0]
          selectedIdNext = Number((selectedRow && selectedRow.id) || 0) || null
        }
        this.setData({
          coatingAllInboundList: displayList,
          inboundList: displayList,
          coatingCurrentPage: currentPage,
          coatingTotal: total,
          coatingHasMore: hasMore,
          selectedCoatingId: selectedIdNext,
          selectedCoatingRow: selectedRow
        })
        if (reset && keyword && displayList.length === 0) {
          wx.showToast({ title: '未匹配到涂布待入库申请', icon: 'none' })
        }
        this.refreshCoatingSummary(selectedRow, this.data.coatingScannedItems || [])
      } else {
        const selectedId = Number(this.data.selectedCoatingId || 0)
        const selectedRow = selectedId > 0
          ? (normalized.find(item => Number(item.id) === selectedId) || null)
          : null
        this.setData({
          inboundList: normalized,
          selectedCoatingId: selectedRow ? selectedId : null,
          selectedCoatingRow: selectedRow
        })
        this.refreshCoatingSummary(selectedRow, this.data.coatingScannedItems || [])
      }
    } catch (e) {
      const msg = String((e && (e.msg || e.message)) || '查询失败')
      if (msg.indexOf('403') > -1 || msg.indexOf('权限') > -1 || msg.toLowerCase().indexOf('forbidden') > -1) {
        wx.showToast({ title: '当前账号无查询权限，请联系管理员开通 production/warehouse', icon: 'none' })
      } else {
        wx.showToast({ title: msg, icon: 'none' })
      }
      this.setData({
        inboundList: [],
        coatingAllInboundList: [],
        coatingCurrentPage: 0,
        coatingTotal: 0,
        coatingHasMore: false,
        selectedCoatingId: null,
        selectedCoatingRow: null
      })
      this.refreshCoatingSummary(null, [])
    } finally {
      this.setData({ queryLoading: false, coatingLoadingMore: false })
    }
  },

  onReachBottom() {
    if (this.data.scene !== 'coatingInbound') return
    if (this.data.queryLoading || this.data.coatingLoadingMore) return
    if (!this.data.coatingHasMore) return
    this.queryInboundList({ reset: false })
  }
})
