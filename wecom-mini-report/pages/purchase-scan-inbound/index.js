const { getToken, getUserInfo, clearToken } = require('../../utils/auth')
const {
  getInboundScanDocuments,
  getInboundScanDocument,
  submitInboundScan
} = require('../../api/stock')

function toUpperSafe(v) {
  return String(v || '').trim().toUpperCase()
}

Page({
  data: {
    keyword: '',
    documentList: [],
    listLoading: false,

    selectedReceiptId: null,
    selectedReceiptNo: '',
    documentLoading: false,
    document: null,
    displayItems: [],
    focusedCode: '',
    focusedSummary: null,
    scanGroupedItems: [],

    scannedLocation: '',
    scanCodeInput: '',
    scanCodes: [],
    failedCodeMap: {},
    scanning: false,

    submitting: false,
    submitSummary: null,
    operator: ''
  },

  beginNativeScanSession() {
    this._suppressOnShowRefresh = true
  },

  endNativeScanSession() {
    setTimeout(() => {
      if (!this.data.scanning) {
        this._suppressOnShowRefresh = false
      }
    }, 250)
  },

  onShow() {
    const token = getToken()
    if (!token) {
      wx.reLaunch({ url: '/pages/login/index' })
      return
    }
    const userInfo = getUserInfo() || {}
    const roles = Array.isArray(userInfo.roles) ? userInfo.roles : []
    const canWarehouse = roles.includes('warehouse') || roles.includes('admin')
    if (!canWarehouse) {
      wx.showToast({ title: '仅仓库/管理员可扫码入库', icon: 'none' })
      return
    }
    const name = userInfo.name || userInfo.username || ''
    if (name && !this.data.operator) {
      this.setData({ operator: name })
    }
    if (this._suppressOnShowRefresh) {
      return
    }
    this.queryDocuments()
  },

  onHide() {
    if (this._suppressOnShowRefresh) {
      return
    }
    this.setData({ scanning: false })
  },

  onUnload() {
    this._suppressOnShowRefresh = false
    this.setData({ scanning: false })
  },

  onKeywordInput(e) {
    this.setData({ keyword: (e.detail && e.detail.value) || '' })
  },

  async queryDocuments() {
    this.setData({ listLoading: true })
    try {
      const keyword = (this.data.keyword || '').trim() || undefined
      let loadedByKeyword = false
      const res = await getInboundScanDocuments({
        page: 1,
        size: 30,
        keyword
      })
      const data = (res && res.data) || {}
      let records = Array.isArray(data.records) ? data.records : []

      // 兜底：当关键字是标签码/批次码时，列表接口可能查不到，直接走扫码详情接口反查单据。
      if (keyword) {
        try {
          const detailRes = await getInboundScanDocument({
            scanCode: keyword,
            receiptNo: keyword
          })
          const doc = (detailRes && detailRes.data) || null
          if (doc && (doc.receiptId || doc.receiptNo || (Array.isArray(doc.items) && doc.items.length > 0))) {
            records = [this.toDocumentListRow(doc, keyword)]
            loadedByKeyword = await this.loadDocument({
              receiptId: doc.receiptId || undefined,
              receiptNo: doc.receiptNo || undefined,
              scanCode: keyword,
              silent: true,
              preserveOnSameDoc: true
            })
          }
        } catch (e1) {}
      }

      this.setData({ documentList: records })
      if (!loadedByKeyword && keyword && records.length === 1) {
        const only = records[0] || {}
        await this.loadDocument({
          receiptId: only.id || undefined,
          receiptNo: only.receiptNo || undefined,
          scanCode: keyword,
          silent: true,
          preserveOnSameDoc: true
        })
      }
    } catch (e) {
      if (e && (e.code === 50008 || e.code === 50012 || e.code === 50014)) {
        clearToken()
        wx.reLaunch({ url: '/pages/login/index' })
        return
      }
      wx.showToast({ title: (e && (e.msg || e.message)) || '查询失败', icon: 'none' })
      this.setData({ documentList: [] })
    } finally {
      this.setData({ listLoading: false })
    }
  },

  onScanReceiptNo() {
    this.beginNativeScanSession()
    wx.scanCode({
      onlyFromCamera: false,
      success: async (res) => {
        this.endNativeScanSession()
        const code = String((res && (res.result || res.rawData)) || '').trim()
        if (!code) return
        this.setData({ keyword: code })
        await this.queryDocuments()
      },
      fail: () => {
        this.endNativeScanSession()
        wx.showToast({ title: '扫码取消或失败', icon: 'none' })
      }
    })
  },

  onSelectDocument(e) {
    const id = Number((e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.id) || 0)
    const receiptNo = String((e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.receiptno) || '')
    const scanCode = String((e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.scancode) || '')
    if (!id && !receiptNo && !scanCode) return
    this.loadDocument({ receiptId: id || undefined, receiptNo: receiptNo || undefined, scanCode: scanCode || undefined })
  },

  async loadDocument({ receiptId, receiptNo, scanCode, silent = false, preserveOnSameDoc = false } = {}) {
    this.setData({ documentLoading: true, submitSummary: null })
    try {
      const res = await getInboundScanDocument({
        receiptId: receiptId || undefined,
        receiptNo: receiptNo || undefined,
        scanCode: scanCode || undefined
      })
      const doc = (res && res.data) || null
      if (!doc || (!doc.receiptId && !doc.receiptNo)) {
        if (!silent) wx.showToast({ title: '单据不存在', icon: 'none' })
        return false
      }
      const sameDoc = this.isSameDocument(this.data.document, doc)
      const preserveScans = !!preserveOnSameDoc && sameDoc && Array.isArray(this.data.scanCodes) && this.data.scanCodes.length > 0
      
      let initialCodes = preserveScans ? (this.data.scanCodes || []) : []
      if (!preserveScans && scanCode) {
        // 如果扫描的 code 能匹配到明细中的任何一项（无论是通过申请单号、批次号还是模糊批次号）
        // 且它不是单据编号本身，则自动将其加入待提交列表
        const isReceiptNoMatch = toUpperSafe(scanCode) === (doc.receiptNo || '').toUpperCase()
        if (!isReceiptNoMatch && this.findDocItemByCode(scanCode, doc)) {
          initialCodes = [scanCode]
        }
      }

      console.log('loadDocument scanCodes:', initialCodes)

      this.setData({
        selectedReceiptId: doc.receiptId || null,
        selectedReceiptNo: doc.receiptNo || '',
        document: doc,
        displayItems: this.buildDisplayItems(doc, scanCode),
        focusedCode: (scanCode || '').trim(),
        focusedSummary: this.buildFocusedSummary(doc, scanCode),
        scanGroupedItems: initialCodes.length > 0 ? this.buildScanGroupedItems(initialCodes, doc) : (preserveScans ? (this.data.scanGroupedItems || []) : []),
        scanCodes: initialCodes,
        failedCodeMap: preserveScans ? (this.data.failedCodeMap || {}) : {},
        scanning: false,
        scanCodeInput: ''
      })
      if (!silent) wx.showToast({ title: '单据已载入', icon: 'success' })
      return true
    } catch (e) {
      if (!silent) wx.showToast({ title: (e && (e.msg || e.message)) || '加载失败', icon: 'none' })
      return false
    } finally {
      this.setData({ documentLoading: false })
    }
  },

  isSameDocument(a, b) {
    if (!a || !b) return false
    const idA = Number(a.receiptId || 0)
    const idB = Number(b.receiptId || 0)
    if (idA > 0 && idB > 0) return idA === idB
    const noA = String(a.receiptNo || '').trim().toUpperCase()
    const noB = String(b.receiptNo || '').trim().toUpperCase()
    return !!noA && noA === noB
  },

  toDocumentListRow(doc, scanCode) {
    return {
      id: doc.receiptId || doc.id || '',
      receiptNo: doc.receiptNo || scanCode || '-',
      supplier: doc.supplierCode || doc.supplier || '-',
      supplierCode: doc.supplierCode || doc.supplier || '-',
      purchaseOrderNo: doc.purchaseOrderNo || '-',
      status: doc.status || '-',
      scanCode: scanCode || ''
    }
  },

  buildFocusedSummary(doc, scanCode) {
    const code = toUpperSafe(scanCode)
    if (!code) return null
    const items = this.buildDisplayItems(doc, scanCode)
    if (!Array.isArray(items) || items.length === 0) return null
    const summary = {
      planQty: 0,
      printedQty: 0,
      scannedQty: 0
    }
    items.forEach((it) => {
      summary.planQty += Number(it.planQty || 0)
      summary.printedQty += Number(it.printedQty || 0)
      summary.scannedQty += Number(it.scannedQty || 0)
    })
    return summary
  },

  buildDisplayItems(doc, scanCode) {
    const items = Array.isArray((doc || {}).items) ? doc.items : []
    const code = toUpperSafe(scanCode)
    if (!code) return items
    const batch = this.extractBatchCode(code)
    const filtered = items.filter((row) => {
      const requestNo = toUpperSafe(row && row.requestNo)
      const incomingBatchNo = toUpperSafe(row && row.incomingBatchNo)
      return requestNo === code || incomingBatchNo === code || incomingBatchNo === batch
    })
    return filtered.length > 0 ? filtered : items
  },

  onLocationInput(e) {
    this.setData({ scannedLocation: (e.detail && e.detail.value) || '' })
  },

  onScanLocation() {
    this.beginNativeScanSession()
    wx.scanCode({
      onlyFromCamera: false,
      success: (res) => {
        this.endNativeScanSession()
        const code = String((res && (res.result || res.rawData)) || '').trim()
        if (!code) return
        this.setData({ scannedLocation: code })
      },
      fail: () => {
        this.endNativeScanSession()
        wx.showToast({ title: '扫码取消或失败', icon: 'none' })
      }
    })
  },

  onScanCodeInput(e) {
    this.setData({ scanCodeInput: (e.detail && e.detail.value) || '' })
  },

  onAddManualCode() {
    this.acceptScannedCode(this.data.scanCodeInput)
    this.setData({ scanCodeInput: '' })
  },

  onStartScan() {
    if (!this.data.document) {
      wx.showToast({ title: '请先选择单据', icon: 'none' })
      return
    }
    if (this.data.scanning) {
      return
    }
    this.setData({ scanning: true })
    this.scanNext()
  },

  onStopScan() {
    this._suppressOnShowRefresh = false
    this.setData({ scanning: false })
  },

  scanNext() {
    if (!this.data.scanning) return
    this.beginNativeScanSession()
    wx.scanCode({
      onlyFromCamera: false,
      success: (res) => {
        const code = String((res && (res.result || res.rawData)) || '').trim()
        this.acceptScannedCode(code)
        if (this.data.scanning) {
          setTimeout(() => this.scanNext(), 100)
        } else {
          this.endNativeScanSession()
        }
      },
      fail: () => {
        this.setData({ scanning: false })
        this.endNativeScanSession()
        wx.showToast({ title: '扫码已停止', icon: 'none' })
      }
    })
  },

  acceptScannedCode(rawCode) {
    const code = toUpperSafe(rawCode)
    if (!code) {
      wx.showToast({ title: '空码无效', icon: 'none' })
      return
    }

    const exists = (this.data.scanCodes || []).some(v => toUpperSafe(v) === code)
    if (exists) {
      wx.showToast({ title: '重复码', icon: 'none', duration: 2000 })
      return
    }

    const batch = this.extractBatchCode(code)
    if (!this.isKnownBatch(batch)) {
      wx.showToast({ title: '无效码:' + batch, icon: 'none', duration: 2500 })
      return
    }
    if (this.isAlreadyInBatch(batch)) {
      wx.showToast({ title: '已入库码或无效', icon: 'none', duration: 2500 })
      return
    }

    const next = [...(this.data.scanCodes || []), code]
    this.setData({
      scanCodes: next,
      scanGroupedItems: this.buildScanGroupedItems(next)
    })
    // 自动滚动到底部（如果有上百条，方便用户确认）
    wx.showToast({ title: `已录入(${next.length})`, icon: 'success', duration: 800 })
  },

  findDocItemByCode(code, providedDoc) {
    const doc = providedDoc || this.data.document || {}
    const items = Array.isArray(doc.items) ? doc.items : []
    const raw = toUpperSafe(code)
    const rawBatch = this.extractBatchCode(raw)
    
    for (let i = 0; i < items.length; i += 1) {
      const row = items[i] || {}
      const requestNo = toUpperSafe(row.requestNo)
      const incomingBatchNo = toUpperSafe(row.incomingBatchNo)
      const rowBatch = this.extractBatchCode(incomingBatchNo)
      
      // 多重匹配逻辑：
      // 1. 扫描的内容完全等于 申请单号 或 原始批号
      // 2. 扫描提取后的批号 等于 申请单号 或 原始批号
      // 3. 扫描提取后的批号 等于 原始批号提取后的批号
      if (requestNo === raw || incomingBatchNo === raw || 
          requestNo === rawBatch || incomingBatchNo === rawBatch || 
          rowBatch === rawBatch || rowBatch === raw) {
        return row
      }
    }
    return null
  },

  buildScanGroupedItems(scanCodes, providedDoc) {
    const activeDoc = providedDoc || this.data.document
    const grouped = {}
    const list = Array.isArray(scanCodes) ? scanCodes : []
    list.forEach((code) => {
      const row = this.findDocItemByCode(code, activeDoc)
      if (!row) return

      const key = String(row.itemId || row.requestId || row.incomingBatchNo || row.materialCode || code)
      if (!grouped[key]) {
        grouped[key] = {
          itemId: row.itemId || null,
          materialCode: row.materialCode || '-',
          materialName: row.materialName || '-',
          incomingBatchNo: row.incomingBatchNo || '-',
          scannedThisRound: 0
        }
      }
      grouped[key].scannedThisRound += 1
    })
    return Object.keys(grouped).map(k => grouped[k])
  },

  normalizeSubmitFailureReason(reason) {
    const text = String(reason || '').trim()
    if (!text) return '提交失败'
    if (text.includes('已入库码')) return '该标签已完成入库，请勿重复提交'
    if (text.includes('无效码')) return '未匹配到待入库明细，请核对标签或单据'
    if (text.includes('rollback-only') || text.includes('Transaction rolled back')) {
      return '系统事务回滚，请重试；若持续失败请联系管理员'
    }
    if (text.startsWith('入库失败:')) return text.replace('入库失败:', '入库处理失败：')
    return text
  },

  buildFailedCodeMap(failures) {
    const map = {}
    const list = Array.isArray(failures) ? failures : []
    list.forEach((f) => {
      const code = toUpperSafe(f && f.code)
      if (code) map[code] = true
    })
    return map
  },

  extractBatchCode(code) {
    let text = toUpperSafe(code)
    // 支持 | 分隔符提取批次
    if (text.includes('|')) {
      const parts = text.split('|')
      if (parts.length >= 2) text = parts[1].trim()
    }
    const idx = text.lastIndexOf('-')
    if (idx > 0 && idx < text.length - 1) {
      const suffix = text.substring(idx + 1)
      if (/^\d{1,4}$/.test(suffix)) {
        return text.substring(0, idx)
      }
    }
    return text
  },

  isKnownBatch(batch) {
    // 逻辑：只要能匹配到明细里的任何一项，就是已知批次
    if (this.findDocItemByCode(batch)) return true

    const doc = this.data.document || {}
    const valid = Array.isArray(doc.validBatchNos) ? doc.validBatchNos : []
    const already = Array.isArray(doc.alreadyInBatchNos) ? doc.alreadyInBatchNos : []
    const all = [...valid, ...already].map(v => toUpperSafe(v))
    const b = toUpperSafe(batch)
    const shortB = this.extractBatchCode(b)
    
    return all.some(v => v === b || v === shortB || this.extractBatchCode(v) === shortB)
  },

  isAlreadyInBatch(batch) {
    const doc = this.data.document || {}
    const already = Array.isArray(doc.alreadyInBatchNos) ? doc.alreadyInBatchNos : []
    const b = toUpperSafe(batch)
    const shortB = this.extractBatchCode(b)
    return already.some(v => {
      const sv = toUpperSafe(v)
      return sv === b || sv === shortB || this.extractBatchCode(sv) === shortB
    })
  },

  async onSubmitInbound() {
    const doc = this.data.document || {}
    const receiptId = doc.receiptId || this.data.selectedReceiptId
    const receiptNo = doc.receiptNo || this.data.selectedReceiptNo

    if (!receiptId && (!receiptNo || receiptNo === '-')) {
      wx.showToast({ title: '请先选择单据', icon: 'none' })
      return
    }
    if (!Array.isArray(this.data.scanCodes) || this.data.scanCodes.length === 0) {
      wx.showToast({ title: '请先扫码', icon: 'none' })
      return
    }

    this.setData({ submitting: true })
    try {
      const submittedCodes = [...(this.data.scanCodes || [])]
      const res = await submitInboundScan({
        receiptId: receiptId || undefined,
        receiptNo: receiptNo || undefined,
        scanCodes: submittedCodes,
        scannedLocation: (this.data.scannedLocation || '').trim() || undefined,
        operator: (this.data.operator || '').trim() || undefined
      })
      const rawSummary = (res && res.data) || {}
      const rawFailures = Array.isArray(rawSummary.failures) ? rawSummary.failures : []
      const failures = rawFailures.map((f) => ({
        code: String((f && f.code) || ''),
        reason: this.normalizeSubmitFailureReason(f && f.reason)
      }))
      const failedCodeMap = this.buildFailedCodeMap(failures)
      const failedCodes = submittedCodes.filter(c => !!failedCodeMap[toUpperSafe(c)])
      const isAllSuccess = failures.length === 0
      const summary = { ...rawSummary, failures }

      this.setData({
        submitSummary: summary,
        scanCodes: isAllSuccess ? [] : failedCodes,
        scanGroupedItems: isAllSuccess ? [] : this.buildScanGroupedItems(failedCodes),
        failedCodeMap,
        scanning: false
      })

      wx.showToast({ title: isAllSuccess ? '提交完成' : (failures.length > 0 ? '部分提交失败' : '提交完成'), icon: isAllSuccess ? 'success' : 'none' })
      
      // 使用后台返回的最新单据信息进行重载，优先使用 receiptId
      const targetId = rawSummary.receiptId || receiptId
      const targetNo = (rawSummary.receiptNo && rawSummary.receiptNo !== '-') ? rawSummary.receiptNo : receiptNo
      
      this.loadDocument({ 
        receiptId: targetId || undefined, 
        receiptNo: targetNo || undefined, 
        preserveOnSameDoc: !isAllSuccess,
        silent: isAllSuccess
      })
    } catch (e) {
      wx.showToast({ title: (e && (e.msg || e.message)) || '提交失败', icon: 'none' })
    } finally {
      this.setData({ submitting: false })
    }
  }
})
