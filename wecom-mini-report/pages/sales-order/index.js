const {
  createSalesOrder,
  generateSalesOrderNo,
  getCustomerList,
  getEnabledSpecs,
  getOrderHistorySpecs,
  getOrderRemarkHistory,
  getQuotationList
} = require('../../api/sales')
const { getToken, clearToken } = require('../../utils/auth')

function todayText() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function toNumber(value) {
  if (value === '' || value === null || value === undefined) return undefined
  const num = Number(value)
  return Number.isFinite(num) ? num : undefined
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase()
}

function normalizeMaterialCode(value) {
  return String(value || '')
    .replace(/\u00A0/g, ' ')
    .replace(/\u3000/g, ' ')
    .replace(/\s+/g, '')
    .replace(/[^0-9A-Za-z\u4e00-\u9fa5_-]/g, '')
    .toUpperCase()
    .trim()
}

function numberEquals(a, b) {
  if (a === null || a === undefined || b === null || b === undefined) return false
  return Math.abs(Number(a) - Number(b)) < 0.000001
}

function normalizePricingUnit(unit) {
  const rawUnit = String(unit || '').trim()
  if (rawUnit === '米' || rawUnit === 'M' || rawUnit === 'm') return 'm'
  if (rawUnit === '平方米' || rawUnit === 'm²' || rawUnit === 'm2' || rawUnit === 'M²' || rawUnit === 'M2' || rawUnit === '㎡') return '㎡'
  if (rawUnit === '卷') return '卷'
  return '㎡'
}

function formatUnitPrice(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return ''
  return n.toFixed(4).replace(/0+$/, '').replace(/\.$/, '')
}

function createItem() {
  return {
    materialKeyword: '',
    materialCode: '',
    materialName: '',
    thickness: '',
    width: '',
    length: '',
    rolls: '',
    unitPrice: '',
    remark: '',
    materialOptions: [],
    materialOptionLabels: [],
    materialOptionIndex: -1,
    historySpecOptions: [],
    historySpecLabels: [],
    historySpecIndex: -1,
    unit: '㎡',
    unitPriceLocked: false,
    priceMatchReason: ''
  }
}

Page({
  data: {
    orderNo: '',
    customerCode: '',
    customerName: '',
    customerKeyword: '',
    customerOptions: [],
    customerOptionLabels: [],
    customerOptionIndex: -1,
    customerOrderNo: '',
    orderDate: todayText(),
    deliveryDate: todayText(),
    remark: '',

    customers: [],
    specs: [],
    quotationList: [],
    items: [createItem()],
    orderRemarkOptions: [],

    totalArea: '0.00',
    totalAmount: '0.00',

    submitting: false,
    generated: false,
    lastOrderNo: '',
    loadingMaster: false
  },

  calculateTotal() {
    let totalArea = 0
    let totalAmount = 0
    const items = this.data.items.map(item => {
      const thickness = parseFloat(item.thickness) || 0
      const width = parseFloat(item.width) || 0
      const length = parseFloat(item.length) || 0
      const rolls = parseInt(item.rolls) || 0
      const unitPrice = parseFloat(item.unitPrice) || 0
      
      // 计算单行面积
      let rowArea = 0
      if (width > 0 && length > 0 && rolls > 0) {
        rowArea = (width / 1000) * length * rolls
      }
      
      // 计算单行金额
      let rowAmount = 0
      if (item.unit === '㎡') {
        rowAmount = rowArea * unitPrice
      } else if (item.unit === '卷') {
        rowAmount = rolls * unitPrice
      } else if (item.unit === 'm') {
        rowAmount = length * rolls * unitPrice
      }
      
      totalArea += rowArea
      totalAmount += rowAmount
      
      return {
        ...item,
        rowArea: rowArea.toFixed(2),
        rowAmount: rowAmount.toFixed(2)
      }
    })
    
    this.setData({
      items,
      totalArea: totalArea.toFixed(2),
      totalAmount: totalAmount.toFixed(2)
    })
  },

  onItemFieldInput(e) {
    const { index, key } = e.currentTarget.dataset
    const value = e.detail.value
    const items = this.data.items
    items[index][key] = value
    this.setData({ items }, () => {
      // 只有数值类字段变动才重新计算
      if (['thickness', 'width', 'length', 'rolls', 'unitPrice'].includes(key)) {
        this.calculateTotal()
      }
    })
  },

  async onShow() {
    const token = getToken()
    if (!token) {
      wx.reLaunch({ url: '/pages/login/index' })
      return
    }
    if (!this.data.customers.length || !this.data.specs.length) {
      await this.loadMasterData()
    }
  },

  onInput(e) {
    const key = e.currentTarget.dataset.key
    const value = e.detail.value || ''
    this.setData({ [key]: value })
    if (key === 'remark') return
    if (key === 'deliveryDate' || key === 'customerOrderNo' || key === 'orderNo' || key === 'orderDate') return
  },

  async loadMasterData() {
    this.setData({ loadingMaster: true })
    try {
      const [customerRes, specRes, quotationRes] = await Promise.all([
        getCustomerList({ page: 1, size: 1000 }),
        getEnabledSpecs(),
        getQuotationList()
      ])
      const customersRaw = customerRes && customerRes.data
      const customers = Array.isArray(customersRaw)
        ? customersRaw
        : (customersRaw && Array.isArray(customersRaw.records) ? customersRaw.records : [])
      const specs = Array.isArray(specRes && specRes.data) ? specRes.data : []
      const quotationRaw = (quotationRes && quotationRes.data)
      const quotationListData = (quotationRaw && quotationRaw.data) || quotationRaw || []
      const quotationList = Array.isArray(quotationListData) ? quotationListData : []
      this.setData({ customers, specs, quotationList })
      this.filterCustomers(this.data.customerKeyword)
    } catch (e) {
      wx.showToast({ title: (e && (e.msg || e.message)) || '基础数据加载失败', icon: 'none' })
    } finally {
      this.setData({ loadingMaster: false })
    }
  },

  formatCustomerLabel(customer) {
    const code = customer.customerCode || '-'
    const shortName = customer.shortName || customer.customerShortName || '-'
    const name = customer.customerName || shortName
    return `${code} / ${shortName} / ${name}`
  },

  onCustomerKeywordInput(e) {
    const keyword = e.detail.value || ''
    this.setData({ customerKeyword: keyword })
    this.filterCustomers(keyword)
  },

  filterCustomers(keyword) {
    const key = normalizeText(keyword)
    const list = (this.data.customers || []).filter(item => {
      if (!key) return true
      const code = normalizeText(item.customerCode)
      const shortName = normalizeText(item.shortName || item.customerShortName)
      const name = normalizeText(item.customerName)
      return code.includes(key) || shortName.includes(key) || name.includes(key)
    }).slice(0, 50)
    this.setData({
      customerOptions: list,
      customerOptionLabels: list.map(item => this.formatCustomerLabel(item)),
      customerOptionIndex: list.length ? 0 : -1
    })
  },

  async onCustomerPick(e) {
    const index = Number(e.detail.value)
    const customer = this.data.customerOptions[index]
    if (!customer) return
    await this.applyCustomer(customer)
  },

  async applyCustomer(customer) {
    const customerCode = customer.customerCode || ''
    const customerName = customer.customerName || customer.shortName || customer.customerShortName || ''
    this.setData({
      customerCode,
      customerName,
      customerKeyword: this.formatCustomerLabel(customer)
    })
    await this.loadOrderRemarkHistory(customerCode)
    await this.loadAllHistorySpecs()
    this.syncAllItemUnitPricesByQuotation()
  },

  async loadOrderRemarkHistory(customerCode) {
    const normalizedCode = String(customerCode || '').trim()
    if (!normalizedCode) {
      this.setData({ orderRemarkOptions: [] })
      return
    }
    try {
      const res = await getOrderRemarkHistory({ customerCode: normalizedCode, limit: 30 })
      const rows = Array.isArray(res && res.data) ? res.data : []
      const unique = []
      const used = {}
      rows.forEach(item => {
        const text = String((item && item.remark) || '').trim()
        if (!text || used[text]) return
        used[text] = true
        unique.push(text)
      })
      this.setData({ orderRemarkOptions: unique })
    } catch (e) {
      this.setData({ orderRemarkOptions: [] })
    }
  },

  onOrderRemarkPick(e) {
    const index = Number(e.currentTarget.dataset.index)
    const value = (this.data.orderRemarkOptions || [])[index]
    if (!value) return
    this.setData({ remark: value })
  },

  updateItem(index, updater) {
    const list = (this.data.items || []).slice()
    const current = list[index]
    if (!current) return
    list[index] = { ...current, ...updater }
    this.setData({ items: list })
  },

  onItemFieldInput(e) {
    const index = Number(e.currentTarget.dataset.index)
    const key = e.currentTarget.dataset.key
    const value = e.detail.value || ''
    this.updateItem(index, { [key]: value })
    if (key === 'width' || key === 'length' || key === 'rolls' || key === 'unitPrice') {
      this.recalcSummary()
    }
    if (key === 'width' || key === 'length' || key === 'materialCode') {
      this.syncItemUnitPriceFromQuotation(index)
    }
  },

  onMaterialKeywordInput(e) {
    const index = Number(e.currentTarget.dataset.index)
    const keyword = e.detail.value || ''
    const key = normalizeText(keyword)
    const options = (this.data.specs || []).filter(spec => {
      if (!key) return true
      const code = normalizeText(spec.materialCode)
      const name = normalizeText(spec.productName || spec.materialName)
      return code.includes(key) || name.includes(key)
    }).slice(0, 60)
    const labels = options.map(spec => `${spec.materialCode || '-'} / ${spec.productName || spec.materialName || '-'}`)
    this.updateItem(index, {
      materialKeyword: keyword,
      materialOptions: options,
      materialOptionLabels: labels,
      materialOptionIndex: options.length ? 0 : -1
    })
  },

  async onMaterialPick(e) {
    const index = Number(e.currentTarget.dataset.index)
    const optionIndex = Number(e.detail.value)
    const row = (this.data.items || [])[index]
    if (!row) return
    const spec = (row.materialOptions || [])[optionIndex]
    if (!spec) return
    const thickness = spec.totalThickness || spec.total_thickness || spec.baseThickness || ''
    this.updateItem(index, {
      materialCode: spec.materialCode || '',
      materialName: spec.productName || spec.materialName || '',
      thickness: thickness === null || thickness === undefined ? '' : String(thickness),
      materialKeyword: spec.materialCode || ''
    })
    await this.loadHistorySpecsForItem(index)
    this.syncItemUnitPriceFromQuotation(index)
    this.recalcSummary()
  },

  async onMaterialCodeBlur(e) {
    const index = Number(e.currentTarget.dataset.index)
    const row = (this.data.items || [])[index]
    if (!row) return
    const code = String(row.materialCode || '').trim()
    if (!code) {
      this.updateItem(index, {
        historySpecOptions: [],
        historySpecLabels: [],
        historySpecIndex: -1
      })
      return
    }
    const normalizedCode = normalizeText(code)
    const matched = (this.data.specs || []).find(spec => normalizeText(spec.materialCode) === normalizedCode)
    if (matched) {
      const thickness = matched.totalThickness || matched.total_thickness || matched.baseThickness || row.thickness
      this.updateItem(index, {
        materialName: row.materialName || matched.productName || matched.materialName || '',
        thickness: thickness === null || thickness === undefined ? '' : String(thickness)
      })
    }
    await this.loadHistorySpecsForItem(index)
    this.syncItemUnitPriceFromQuotation(index)
  },

  async loadHistorySpecsForItem(index) {
    const row = (this.data.items || [])[index]
    const customerCode = String(this.data.customerCode || '').trim()
    const materialCode = String((row && row.materialCode) || '').trim()
    if (!row || !customerCode || !materialCode) {
      this.updateItem(index, {
        historySpecOptions: [],
        historySpecLabels: [],
        historySpecIndex: -1
      })
      return
    }
    try {
      const res = await getOrderHistorySpecs({ customerCode, materialCode })
      const rows = Array.isArray(res && res.data) ? res.data : []
      const options = rows
        .map(item => {
          const thickness = toNumber(item.thickness)
          const width = toNumber(item.width)
          const length = toNumber(item.length)
          if (thickness === undefined || width === undefined || length === undefined) return null
          const useCount = Number(item.useCount || 0)
          const label = `${thickness}*${width}*${length}${useCount > 0 ? `（历史${useCount}次）` : ''}`
          return { thickness, width, length, label }
        })
        .filter(Boolean)
      this.updateItem(index, {
        historySpecOptions: options,
        historySpecLabels: options.map(it => it.label),
        historySpecIndex: options.length ? 0 : -1
      })
    } catch (e) {
      this.updateItem(index, {
        historySpecOptions: [],
        historySpecLabels: [],
        historySpecIndex: -1
      })
    }
  },

  async loadAllHistorySpecs() {
    const rows = this.data.items || []
    for (let i = 0; i < rows.length; i += 1) {
      await this.loadHistorySpecsForItem(i)
    }
  },

  onHistorySpecPick(e) {
    const index = Number(e.currentTarget.dataset.index)
    const optionIndex = Number(e.detail.value)
    const row = (this.data.items || [])[index]
    if (!row) return
    const selected = (row.historySpecOptions || [])[optionIndex]
    if (!selected) return
    this.updateItem(index, {
      historySpecIndex: optionIndex,
      thickness: String(selected.thickness),
      width: String(selected.width),
      length: String(selected.length)
    })
    this.syncItemUnitPriceFromQuotation(index)
    this.recalcSummary()
  },

  syncAllItemUnitPricesByQuotation() {
    const rows = this.data.items || []
    for (let i = 0; i < rows.length; i += 1) {
      this.syncItemUnitPriceFromQuotation(i)
    }
  },

  syncItemUnitPriceFromQuotation(index) {
    const row = (this.data.items || [])[index]
    if (!row) return

    const customerCode = String(this.data.customerCode || '').trim()
    const normalizedCustomerCode = customerCode.toUpperCase()
    const materialCode = normalizeMaterialCode(row.materialCode)
    const rowWidth = toNumber(row.width)
    const rowLength = toNumber(row.length)

    if (!customerCode || !materialCode) {
      this.updateItem(index, {
        unitPriceLocked: false,
        priceMatchReason: !customerCode ? '未选择客户' : '未填写料号'
      })
      return
    }

    const allCandidates = []
    let totalQuoteCount = 0
    let customerMatchedCount = 0
    let acceptedMatchedCount = 0
    let materialMatchedCount = 0
    let specMatchedCount = 0
    ;(this.data.quotationList || []).forEach(q => {
      if (!q) return
      totalQuoteCount += 1

      const quoteCustomerCode = String(q.customer || '').trim().toUpperCase()
      if (quoteCustomerCode !== normalizedCustomerCode) return
      customerMatchedCount += 1

      const qStatus = String(q.status || '').trim().toLowerCase()
      if (qStatus !== 'accepted' && qStatus !== '已接受') return
      acceptedMatchedCount += 1

      const items = Array.isArray(q.items) ? q.items : []

      ;items.forEach(item => {
        if (!item) return
        if (normalizeMaterialCode(item.materialCode) !== materialCode) return
        materialMatchedCount += 1

        const itemPrice = toNumber(item.unitPrice)
        if (itemPrice === undefined || itemPrice <= 0) return

        const unit = normalizePricingUnit(item.unit || q.pricingUnit)
        const itemWidth = toNumber(item.width)
        const itemLength = toNumber(item.length)

        // 严格匹配（按业务）：
        // m：宽度一致
        // 卷：宽度+长度一致
        // ㎡：不按规格卡控（客户+料号即可）
        let specMatched = false
        if (unit === 'm') {
          specMatched = numberEquals(itemWidth, rowWidth)
        } else if (unit === '卷') {
          specMatched = numberEquals(itemWidth, rowWidth) && numberEquals(itemLength, rowLength)
        } else if (unit === '㎡') {
          specMatched = true
        }
        if (!specMatched) return
        specMatchedCount += 1

        allCandidates.push({
          unitPrice: itemPrice,
          unit,
          width: itemWidth,
          length: itemLength,
          versionNo: toNumber(item.versionNo),
          quotationDate: q.quotationDate || '',
          sortTime: q.updatedAt || q.quotationDate || q.createdAt || ''
        })
      })
    })

    const matched = allCandidates

    const toTs = (v) => {
      const t = Date.parse(String(v || '').replace(/-/g, '/'))
      return Number.isFinite(t) ? t : 0
    }

    matched.sort((a, b) => {
      const t1 = toTs(b.sortTime) - toTs(a.sortTime)
      if (t1 !== 0) return t1
      const t2 = toTs(b.quotationDate) - toTs(a.quotationDate)
      if (t2 !== 0) return t2
      return (toNumber(b.versionNo) || -1) - (toNumber(a.versionNo) || -1)
    })

    const picked = matched[0]
    if (picked) {
      this.updateItem(index, {
        unitPrice: formatUnitPrice(picked.unitPrice),
        unit: picked.unit,
        unitPriceLocked: true,
        priceMatchReason: ''
      })
      this.recalcSummary()
      return
    }

    let reason = '未命中报价'
    if (totalQuoteCount <= 0) {
      reason = '报价列表为空'
    } else if (customerMatchedCount <= 0) {
      reason = '客户不匹配（按客户代码精确匹配）'
    } else if (acceptedMatchedCount <= 0) {
      reason = '该客户无已接受报价'
    } else if (materialMatchedCount <= 0) {
      reason = '已接受报价中无该料号'
    } else if (specMatchedCount <= 0) {
      reason = '规格不匹配（仅m/卷按规格匹配）'
    }

    this.updateItem(index, {
      unitPrice: '',
      unitPriceLocked: false,
      priceMatchReason: reason
    })
    this.recalcSummary()
  },

  addItem() {
    const list = (this.data.items || []).slice()
    list.push(createItem())
    this.setData({ items: list })
  },

  removeItem(e) {
    const index = Number(e.currentTarget.dataset.index)
    const list = (this.data.items || []).slice()
    if (list.length <= 1) {
      this.setData({ items: [createItem()] })
      this.recalcSummary()
      return
    }
    list.splice(index, 1)
    this.setData({ items: list })
    this.recalcSummary()
  },

  recalcSummary() {
    const rows = this.data.items || []
    let areaSum = 0
    let amountSum = 0
    rows.forEach(item => {
      const width = Number(item.width || 0)
      const length = Number(item.length || 0)
      const rolls = Number(item.rolls || 0)
      const unitPrice = Number(item.unitPrice || 0)
      if (width > 0 && length > 0 && rolls > 0) {
        const area = (width * length * rolls) / 1000
        areaSum += area
        if (unitPrice > 0) {
          amountSum += area * unitPrice
        }
      }
    })
    this.setData({
      totalArea: areaSum.toFixed(2),
      totalAmount: amountSum.toFixed(2)
    })
  },

  async onGenerateOrderNo() {
    if (!this.data.customerCode) {
      wx.showToast({ title: '请先填写客户代码', icon: 'none' })
      return
    }
    try {
      const res = await generateSalesOrderNo({
        customerCode: this.data.customerCode,
        orderDate: this.data.orderDate
      })
      const orderNo = (res && res.data) || ''
      this.setData({ orderNo: orderNo || '', generated: true })
      if (orderNo) {
        wx.showToast({ title: '订单号已生成', icon: 'success' })
      }
    } catch (e) {
      wx.showToast({ title: (e && (e.msg || e.message)) || '生成失败', icon: 'none' })
    }
  },

  async onSubmit() {
    if (!this.data.customerCode) {
      wx.showToast({ title: '请先选择客户', icon: 'none' })
      return
    }

    const validItems = (this.data.items || [])
      .map(item => ({
        materialCode: String(item.materialCode || '').trim(),
        materialName: String(item.materialName || '').trim(),
        thickness: toNumber(item.thickness),
        width: toNumber(item.width),
        length: toNumber(item.length),
        rolls: Number(item.rolls || 0),
        unitPrice: toNumber(item.unitPrice),
        unit: item.unit || '㎡',
        remark: String(item.remark || '').trim() || undefined
      }))
      .filter(item => item.materialCode && item.rolls > 0)

    if (!validItems.length) {
      wx.showToast({ title: '请至少添加一条有效明细', icon: 'none' })
      return
    }

    const totalArea = validItems.reduce((sum, it) => {
      if (!it.width || !it.length || !it.rolls) return sum
      return sum + (it.width * it.length * it.rolls) / 1000
    }, 0)
    const totalAmount = validItems.reduce((sum, it) => {
      if (!it.width || !it.length || !it.rolls || !it.unitPrice) return sum
      return sum + ((it.width * it.length * it.rolls) / 1000) * it.unitPrice
    }, 0)

    const payload = {
      orderNo: this.data.orderNo || undefined,
      customer: this.data.customerCode,
      customerCode: this.data.customerCode,
      customerName: this.data.customerName || undefined,
      customerOrderNo: this.data.customerOrderNo || undefined,
      orderDate: this.data.orderDate || todayText(),
      deliveryDate: this.data.deliveryDate || undefined,
      remark: this.data.remark || undefined,
      totalArea: Number(totalArea.toFixed(2)),
      totalAmount: Number(totalAmount.toFixed(2)),
      items: validItems
    }

    this.setData({ submitting: true })
    try {
      const res = await createSalesOrder(payload)
      const data = (res && res.data && res.data.data) || (res && res.data) || {}
      const orderNo = data.orderNo || payload.orderNo || ''
      this.setData({ lastOrderNo: orderNo })
      wx.showToast({ title: '下单成功', icon: 'success' })
      this.setData({ items: [createItem()] })
      this.recalcSummary()
    } catch (e) {
      if (e && (e.code === 50008 || e.code === 50012 || e.code === 50014)) {
        clearToken()
        wx.reLaunch({ url: '/pages/login/index' })
        return
      }
      wx.showToast({ title: (e && (e.msg || e.message)) || '下单失败', icon: 'none' })
    } finally {
      this.setData({ submitting: false })
    }
  }
})
