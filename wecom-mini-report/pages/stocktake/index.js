const { getToken, getUserInfo, clearToken } = require('../../utils/auth')
const { getTapeStockList, printByGateway } = require('../../api/stock')
const { suggestTapeSpecs } = require('../../api/report')
const request = require('../../utils/request')

Page({
  data: {
    warehouseList: [],
    selectedWarehouse: null,
    palletNo: '',
    loading: false,
    submitting: false,
    scannedList: [], // 当前卡板上的物料列表
    operator: '',
    today: '',
    stocktakeNo: '',
    
    // 手工补齐相关
    showEditModal: false,
    editingIndex: -1,
    editingItem: {},
    specSuggestions: [],
    showSpecSuggest: false,

    // 无码新增-联想建议
    addSpecSuggestions: [],
    showAddSpecSuggest: false,
    addBatchSuggestions: [],
    showAddBatchSuggest: false,

    // 无码新增
    showAddModal: false,
    addItem: {
      materialCode: '',
      productName: '',
      batchNo: '',
      location: '',
      sequenceNo: '',
      thickness: '',
      width: '',
      length: '',
      actualRolls: 1,
      actualSqm: 0
    }
  },

  onLoad() {
    this.refreshStocktakeNo()
    this.fetchWarehouses()
    this.loadCache()
  },

  startNewStocktakeSession() {
    wx.showModal({
      title: '新建盘点单',
      content: '将结束当前盘点单并生成新单号，是否继续？',
      success: (res) => {
        if (!res.confirm) return
        this.refreshStocktakeNo()
        this.saveToCache()
        wx.showToast({ title: '已生成新盘点单', icon: 'success' })
      }
    })
  },

  refreshStocktakeNo() {
    // 如果已有单号且有缓存物料，则不强制刷新单号，保证一次大任务用一个单号
    if (this.data.stocktakeNo && this.data.scannedList.length > 0) return

    const d = new Date()
    const todayYMD = d.getFullYear() + '-' + (d.getMonth() + 1).toString().padStart(2, '0') + '-' + d.getDate().toString().padStart(2, '0')
    const todayStr = d.getFullYear().toString() + (d.getMonth() + 1).toString().padStart(2, '0') + d.getDate().toString().padStart(2, '0')
    const randomSuffix = (Date.now() % 100000).toString().padStart(5, '0')
    const stocktakeNo = `STK${todayStr}${randomSuffix}`
    
    this.setData({
      today: todayYMD,
      stocktakeNo: stocktakeNo
    })
  },

  // 缓存机制：存入本地存储，防止意外退出或网络中断导致数据丢失
  saveToCache() {
    const { scannedList, palletNo, stocktakeNo, selectedWarehouse } = this.data
    const userInfo = getUserInfo() || {}
    wx.setStorageSync('stk_cache', {
      scannedList,
      palletNo,
      stocktakeNo,
      selectedWarehouse,
      timestamp: Date.now(),
      userId: userInfo.id || userInfo.userId || ''
    })
  },

  loadCache() {
    const cache = wx.getStorageSync('stk_cache')
    const userInfo = getUserInfo() || {}
    const currentUserId = userInfo.id || userInfo.userId || ''
    // 校验用户身份，防止切换账号后看到其他人的盘点数据
    if (cache && (Date.now() - cache.timestamp < 3600000 * 2) && cache.userId === currentUserId) {
      this.setData({
        scannedList: cache.scannedList || [],
        palletNo: cache.palletNo || '',
        stocktakeNo: cache.stocktakeNo || this.data.stocktakeNo,
        selectedWarehouse: cache.selectedWarehouse || null
      })
    }
  },

  onShow() {
    const token = getToken()
    if (!token) {
      wx.reLaunch({ url: '/pages/login/index' })
      return
    }
    const userInfo = getUserInfo() || {}
    this.setData({ operator: userInfo.name || userInfo.username || '' })
  },

  async fetchWarehouses() {
    try {
      const res = await request({ url: '/api/warehouse/all' })
      const list = res.data || res.list || (Array.isArray(res) ? res : [])
      this.setData({ warehouseList: list })
      if (!list || list.length === 0) {
        console.warn('仓库列表为空')
      }
    } catch (e) {
      console.error('获取仓库失败:', e)
      wx.showToast({ title: '加载仓库失败', icon: 'none' })
    }
  },

  onWarehouseChange(e) {
    const index = e.detail.value
    this.setData({ selectedWarehouse: this.data.warehouseList[index] })
  },

  onPalletInput(e) { this.setData({ palletNo: e.detail.value }) },

  onScanPallet() {
    wx.scanCode({
      success: (res) => {
        this.setData({ palletNo: res.result || '' }, () => {
          this.queryStocks()
        })
      }
    })
  },

  // 查询卡板上已有的物料
  async queryStocks() {
    const palletNo = this.data.palletNo.trim()
    if (!palletNo) {
      wx.showToast({ title: '请输入卡板号', icon: 'none' })
      return
    }

    this.setData({ loading: true })
    try {
      const warehouseId = this.data.selectedWarehouse ? this.data.selectedWarehouse.id : ''
      const res = await request({ url: `/api/pallet-stocktake/pallet/${palletNo}?warehouseId=${encodeURIComponent(warehouseId)}` })
      const list = (res.data || []).map(item => ({
        ...item,
        qrCode: item.qrCode || (`AUTO_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`),
        systemRolls: item.totalRolls || 0, // 记录系统账面卷数
        systemSqm: item.totalSqm || item.availableArea || 0, // 记录系统账面平米
        // 查询卡板后默认实盘=账面，避免误把实盘卷数重置为1
        actualRolls: Number(item.actualRolls != null ? item.actualRolls : (item.totalRolls || 0)),
        actualSqm: Number(item.actualSqm != null ? item.actualSqm : (item.totalSqm || item.availableArea || 0))
      }))
      this.setData({ scannedList: list }, () => {
        this.saveToCache()
      })
      if (!list.length) {
        wx.showToast({ title: '该卡板暂无库存，请扫码加料', icon: 'none' })
      }
    } catch (e) {
      wx.showToast({ title: '查询失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 连续扫码：扫描物料二维码加入列表（彻底过滤重复扫码）
  onScanContinuous() {
    wx.scanCode({
      scanType: ['barCode', 'qrCode'],
      success: async (res) => {
        const qrCode = res.result
        if (!qrCode) return
        
        // 查找是否已在清单中
        const isDuplicate = this.data.scannedList.some(i => i.qrCode === qrCode)
        if (isDuplicate) {
          wx.showToast({ title: '重复扫码，已忽略', icon: 'none' })
          // 仍然继续下一次扫码，但不添加新行
          setTimeout(() => { this.onScanContinuous() }, 400)
          return
        }

        // 核心提速优化：先创建一个“加载中”的占位项到列表头部
        const placeholder = {
          qrCode,
          materialCode: '正在识别...',
          loading: true,
          actualRolls: 1,
          actualSqm: 0,
          systemRolls: 0
        }

        this.setData({
          scannedList: [placeholder, ...this.data.scannedList]
        })

        wx.vibrateShort()

        // 异步获取详情，不等待其完成后再开启下一次扫码
        this.fetchItemDetail(qrCode)

        // 延迟一小会儿自动开启下一次扫码
        setTimeout(() => {
          this.onScanContinuous()
        }, 400)
      },
      fail: () => {
        wx.showToast({ title: '连续扫码已停止', icon: 'none' })
      }
    })
  },

  // 异步获取物料详情并更新列表
  async fetchItemDetail(qrCode) {
    try {
      const resStock = await getTapeStockList({ page: 1, size: 1, qrCode })
      const records = resStock.data.records
      const list = this.data.scannedList
      const idx = list.findIndex(i => i.qrCode === qrCode && i.loading)

      if (idx > -1) {
        if (records && records.length > 0) {
          const stock = records[0]

          // 连续盘点默认要求“同一卡板”，防止多卡板混扫导致混淆
          const currentPallet = String(this.data.palletNo || '').trim()
          const stockLocation = String(stock.location || '').trim()
          if (!currentPallet && stockLocation) {
            // 首次连续扫码且未填卡板号时，自动带入当前扫码物料的卡板号
            this.setData({ palletNo: stockLocation })
          } else if (currentPallet && stockLocation && currentPallet !== stockLocation) {
            // 不同卡板，移除占位项并提示用户切换/分开提交
            list.splice(idx, 1)
            this.setData({ scannedList: list }, () => {
              this.saveToCache()
            })
            wx.showModal({
              title: '卡板不一致',
              content: `当前卡板: ${currentPallet}\n扫码物料卡板: ${stockLocation}\n已阻止加入，避免混在一起。请先提交当前卡板或切换卡板号后再扫。`,
              showCancel: false
            })
            return
          }

          list[idx] = {
            ...stock,
            loading: false,
            isError: false,
            systemRolls: (stock.status === 1) ? (stock.totalRolls || 0) : 0, 
            systemSqm: (stock.status === 1) ? (stock.availableArea || 0) : 0,
            actualRolls: 1,
            actualSqm: stock.availableArea || 0
          }
        } else {
          // 未找到记录
          list[idx].materialCode = '未找到物料'
          list[idx].productName = '系统中无此二维码信息'
          list[idx].loading = false
          list[idx].isError = true
        }
        
        this.setData({ scannedList: list }, () => {
          this.saveToCache()
        })
      }
    } catch (e) {
      const list = this.data.scannedList
      const idx = list.findIndex(i => i.qrCode === qrCode && i.loading)
      if (idx > -1) {
        list[idx].materialCode = '获取失败'
        list[idx].loading = false
        list[idx].isError = true
        this.setData({ scannedList: list }, () => {
          this.saveToCache()
        })
      }
    }
  },

  onItemRollsInput(e) {
    const { index } = e.currentTarget.dataset
    const list = this.data.scannedList
    const val = e.detail.value
    list[index].actualRolls = val
    
    // 同时也重新计算面积
    const item = list[index]
    const rolls = parseFloat(val) || 0
    const width = parseFloat(item.width) || 0
    const length = parseFloat(item.length) || 0
    if (width > 0 && length > 0) {
      list[index].actualSqm = (rolls * width * length / 1000).toFixed(2)
    }

    this.setData({ scannedList: list }, () => {
      this.saveToCache()
    })
  },

  onItemSqmInput(e) {
    const { index } = e.currentTarget.dataset
    const list = this.data.scannedList
    list[index].actualSqm = e.detail.value
    this.setData({ scannedList: list }, () => {
      this.saveToCache()
    })
  },

  removeItem(e) {
    const { index } = e.currentTarget.dataset
    const list = this.data.scannedList
    list.splice(index, 1)
    this.setData({ scannedList: list }, () => {
      this.saveToCache()
    })
  },

  // 开启手工补齐弹窗
  editItem(e) {
    const { index } = e.currentTarget.dataset
    const item = this.data.scannedList[index]
    
    // 归一化工具：过滤掉所有非法字符串，确保输入框干净
    const cleanStr = (s) => {
      const str = String(s || '').trim()
      const errList = ['undefined', 'null', '未找到物料', '正在识别...', '系统中无此二维码信息', '获取失败', '正在查询...']
      return errList.includes(str) ? '' : str
    }

    const editingItem = {
      id: item.id || null,
      qrCode: cleanStr(item.qrCode),
      materialCode: cleanStr(item.materialCode),
      productName: cleanStr(item.productName) || cleanStr(item.materialName),
      thickness: cleanStr(item.thickness),
      width: cleanStr(item.width),
      length: cleanStr(item.length),
      location: cleanStr(item.location), // 新增：卡板号/库位
      sequenceNo: (item.sequenceNo === null || item.sequenceNo === undefined) ? '' : String(item.sequenceNo),
      actualRolls: item.actualRolls || 1,
      actualSqm: item.actualSqm || 0
    }

    this.setData({
      editingItem, 
      editingIndex: index,
      showEditModal: true,
      showSpecSuggest: false,
      specSuggestions: []
    })
  },

  closeEditModal() {
    this.setData({ showEditModal: false, showSpecSuggest: false, specSuggestions: [] })
  },

  // 料号输入监听
  onEditMaterialInput(e) {
    const value = e.detail.value || ''
    // 1. 同步输入框状态到 data，确保 UI 不会闪烁或显示为 undefined
    this.setData({ 
      'editingItem.materialCode': value,
      showSpecSuggest: false 
    })
    
    // 2. 只有输入达到一定长度才触发建议搜索
    if (value.length >= 1) {
      this.doSpecSuggest(value)
    }
  },

  // 抽离异步搜索，避免阻塞 UI 渲染
  async doSpecSuggest(keyword) {
    try {
      const res = await suggestTapeSpecs(keyword)
      if (res.code === 200 || res.code === 20000) {
        // 只有当用户还没清空输入框时才显示结果
        if (this.data.editingItem.materialCode) {
          this.setData({ 
            specSuggestions: res.data || [],
            showSpecSuggest: (res.data && res.data.length > 0)
          })
        }
      }
    } catch (err) {
      console.error('Spec suggest error:', err)
    }
  },

  selectSpec(e) {
    const spec = e.currentTarget.dataset.spec
    if (!spec) return

    const { editingItem } = this.data
    
    // 强制转换为字符串，防止 null/undefined 渗入
    this.setData({
      'editingItem.materialCode': String(spec.materialCode || ''),
      'editingItem.productName': String(spec.productName || ''),
      'editingItem.thickness': String(spec.totalThickness || spec.baseThickness || ''),
      'editingItem.width': String(spec.defaultWidth || editingItem.width || ''),
      'editingItem.length': String(spec.defaultLength || editingItem.length || ''),
      showSpecSuggest: false
    }, () => {
      this.recalculateEditingSqm()
    })
  },

  onEditParamInput(e) {
    const { field } = e.currentTarget.dataset
    const val = e.detail.value || ''
    
    this.setData({ 
      [`editingItem.${field}`]: val 
    }, () => {
      // 只要修改了影响面积的参数，就重新计算
      if (['width', 'length', 'actualRolls'].includes(field)) {
        this.recalculateEditingSqm()
      }
    })
  },

  // 抽离计算逻辑
  recalculateEditingSqm() {
    const { editingItem } = this.data
    // 极其严谨的数值转换
    const rolls = parseFloat(editingItem.actualRolls) || 1
    const width = parseFloat(editingItem.width) || 0
    const length = parseFloat(editingItem.length) || 0
    
    if (width > 0 && length > 0) {
      const sqm = (rolls * width * length / 1000).toFixed(2)
      this.setData({ 'editingItem.actualSqm': sqm })
    }
  },

  saveEdit() {
    const { editingIndex, editingItem, scannedList } = this.data
    
    if (!editingItem.materialCode || editingItem.materialCode === '') {
      return wx.showToast({ title: '请输入有效料号', icon: 'none' })
    }

    // 深度拷贝一份数据存回列表，防止引用冲突
    const updatedItem = JSON.parse(JSON.stringify(editingItem))
    updatedItem.isError = false 
    
    scannedList[editingIndex] = updatedItem
    
    this.setData({
      scannedList,
      showEditModal: false
    }, () => {
      this.saveToCache()
    })
  },

  openAddModal() {
    this.setData({
      showAddModal: true,
      showAddSpecSuggest: false,
      addSpecSuggestions: [],
      showAddBatchSuggest: false,
      addBatchSuggestions: [],
      addItem: {
        materialCode: '',
        productName: '',
        batchNo: '',
        location: this.data.palletNo || '',
        sequenceNo: '',
        thickness: '',
        width: '',
        length: '',
        actualRolls: 1,
        actualSqm: 0
      }
    })
  },

  closeAddModal() {
    this.setData({ 
      showAddModal: false,
      showAddSpecSuggest: false,
      addSpecSuggestions: [],
      showAddBatchSuggest: false,
      addBatchSuggestions: []
    })
  },

  onAddMaterialInput(e) {
    const keyword = (e.detail.value || '').trim()
    this.setData({
      'addItem.materialCode': keyword,
      showAddSpecSuggest: false,
      addSpecSuggestions: []
    }, () => {
      if (keyword) {
        this.doAddSpecSuggest(keyword)
      }
      // 料号变化后，重新加载该料号历史批次建议
      this.doAddBatchSuggest(keyword, this.data.addItem.batchNo || '')
    })
  },

  async doAddSpecSuggest(keyword) {
    try {
      const res = await suggestTapeSpecs(keyword)
      if (res.code === 200 || res.code === 20000) {
        const list = Array.isArray(res.data) ? res.data : []
        if ((this.data.addItem.materialCode || '').trim()) {
          this.setData({
            addSpecSuggestions: list,
            showAddSpecSuggest: list.length > 0
          })
        }
      }
    } catch (err) {
      console.error('Add spec suggest error:', err)
    }
  },

  selectAddSpec(e) {
    const spec = e.currentTarget.dataset.spec
    if (!spec) return
    this.setData({
      'addItem.materialCode': String(spec.materialCode || ''),
      'addItem.productName': String(spec.productName || ''),
      'addItem.thickness': String(spec.totalThickness || spec.baseThickness || ''),
      'addItem.width': String(spec.defaultWidth || this.data.addItem.width || ''),
      'addItem.length': String(spec.defaultLength || this.data.addItem.length || ''),
      showAddSpecSuggest: false,
      addSpecSuggestions: []
    }, () => {
      this.recalculateAddSqm()
      this.doAddBatchSuggest(this.data.addItem.materialCode, this.data.addItem.batchNo || '')
    })
  },

  onAddBatchInput(e) {
    const keyword = (e.detail.value || '').trim()
    this.setData({
      'addItem.batchNo': keyword,
      showAddBatchSuggest: false,
      addBatchSuggestions: []
    }, () => {
      this.doAddBatchSuggest(this.data.addItem.materialCode, keyword)
    })
  },

  async doAddBatchSuggest(materialCode, keyword) {
    const mc = String(materialCode || '').trim()
    if (!mc) {
      this.setData({ showAddBatchSuggest: false, addBatchSuggestions: [] })
      return
    }
    try {
      // 按料号拉取历史库存，前端提取批次号建议
      const res = await getTapeStockList({ page: 1, size: 80, materialCode: mc })
      const records = (res && res.data && Array.isArray(res.data.records)) ? res.data.records : []
      const mcUpper = mc.toUpperCase()
      const sameMaterialRecords = records.filter(item => String(item.materialCode || '').trim().toUpperCase() === mcUpper)
      const kw = String(keyword || '').trim().toUpperCase()
      const uniq = []
      const seen = {}
      sameMaterialRecords.forEach(item => {
        const b = String(item.batchNo || '').trim()
        if (!b) return
        const up = b.toUpperCase()
        if (kw && !up.includes(kw)) return
        if (seen[up]) return
        seen[up] = true
        uniq.push(b)
      })
      this.setData({
        addBatchSuggestions: uniq.slice(0, 12),
        showAddBatchSuggest: uniq.length > 0
      })
    } catch (err) {
      console.error('Add batch suggest error:', err)
      this.setData({ showAddBatchSuggest: false, addBatchSuggestions: [] })
    }
  },

  selectAddBatch(e) {
    const batchNo = String(e.currentTarget.dataset.batch || '').trim()
    this.setData({
      'addItem.batchNo': batchNo,
      showAddBatchSuggest: false,
      addBatchSuggestions: []
    })
  },

  recalculateAddSqm() {
    const ai = this.data.addItem || {}
    const rolls = parseFloat(ai.actualRolls) || 0
    const width = parseFloat(ai.width) || 0
    const length = parseFloat(ai.length) || 0
    if (rolls > 0 && width > 0 && length > 0) {
      this.setData({ 'addItem.actualSqm': (rolls * width * length / 1000).toFixed(2) })
    }
  },

  async onReprintNoCodeLabel() {
    const ai = this.data.addItem || {}
    const materialCode = String(ai.materialCode || '').trim()
    if (!materialCode) {
      wx.showToast({ title: '请先填写料号', icon: 'none' })
      return
    }
    const productName = String(ai.productName || '').trim()
    const batchNo = String(ai.batchNo || '').trim()
    const location = String(ai.location || this.data.palletNo || '').trim()
    const sequenceNo = String(ai.sequenceNo || '').trim()
    const width = Number(ai.width || 0)
    const length = Number(ai.length || 0)
    const thickness = Number(ai.thickness || 0)
    const actualRolls = Number(ai.actualRolls || 1)
    const actualSqm = Number(ai.actualSqm || 0)
    const qrText = batchNo || `${materialCode}${sequenceNo ? ('-' + sequenceNo) : ''}`

    const payload = {
      payload: {
        bizType: 'STOCKTAKE_NO_CODE_LABEL',
        templateKey: 'STOCKTAKE_NO_CODE_LABEL',
        copies: 1,
        data: {
          materialCode,
          materialName: productName,
          batchNo,
          rollCode: qrText,
          qrText,
          thickness,
          widthMm: width,
          lengthM: length,
          location,
          sequenceNo,
          areaSqm: actualSqm,
          totalRolls: actualRolls,
          source: 'MINI_STOCKTAKE_NO_CODE'
        }
      }
    }

    try {
      wx.showLoading({ title: '发送打印...' })
      const res = await printByGateway(payload)
      wx.hideLoading()
      if (res.code === 200 || res.code === 20000) {
        wx.showToast({ title: '补打已发送', icon: 'success' })
      } else {
        wx.showModal({ title: '补打失败', content: (res && (res.msg || res.message)) || '打印网关调用失败', showCancel: false })
      }
    } catch (e) {
      wx.hideLoading()
      wx.showModal({ title: '补打失败', content: (e && (e.msg || e.message)) || '打印网关不可用', showCancel: false })
    }
  },

  onAddFieldInput(e) {
    const { field } = e.currentTarget.dataset
    const val = e.detail.value || ''
    this.setData({ [`addItem.${field}`]: val }, () => {
      if (['actualRolls', 'width', 'length'].includes(field)) {
        this.recalculateAddSqm()
      }
    })
  },

  saveAddItem() {
    const ai = this.data.addItem || {}
    if (!ai.materialCode || !String(ai.materialCode).trim()) {
      wx.showToast({ title: '料号必填', icon: 'none' })
      return
    }
    const pallet = (this.data.palletNo || '').trim()
    const itemLocation = String(ai.location || '').trim() || pallet
    const row = {
      id: null,
      stockId: null,
      qrCode: `NO_CODE_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      manualNoCode: true,
      materialCode: String(ai.materialCode || '').trim(),
      productName: String(ai.productName || '').trim(),
      batchNo: String(ai.batchNo || '').trim(),
      sequenceNo: ai.sequenceNo === '' ? null : Number(ai.sequenceNo),
      thickness: ai.thickness,
      width: ai.width,
      length: ai.length,
      location: itemLocation,
      systemRolls: 0,
      systemSqm: 0,
      actualRolls: Number(ai.actualRolls || 1),
      actualSqm: Number(ai.actualSqm || 0),
      isError: false
    }
    this.setData({
      scannedList: [row, ...this.data.scannedList],
      showAddModal: false
    }, () => {
      this.saveToCache()
    })
  },

  async submitPalletStocktake() {
    const { palletNo, scannedList, operator, stocktakeNo } = this.data
    
    // 校验卡板号必填
    if (!palletNo || palletNo.trim() === '') {
      return wx.showModal({
        title: '提交校验',
        content: '请先填写或扫描“卡板号/库位号”，否则无法确定物料存放位置。',
        showCancel: false
      })
    }

    if (!scannedList.length) {
      return wx.showToast({ title: '盘点清单不能为空', icon: 'none' })
    }

    const hasLoading = scannedList.some(i => !!i.loading)
    if (hasLoading) {
      return wx.showToast({ title: '有物料仍在识别中，请稍候', icon: 'none' })
    }

    const hasError = scannedList.some(i => !!i.isError)
    if (hasError) {
      return wx.showToast({ title: '存在异常明细，请先修正/删除', icon: 'none' })
    }

    const invalid = scannedList.find(i => !i.loading && (!i.materialCode || String(i.materialCode).trim() === ''))
    if (invalid) {
      return wx.showToast({ title: '存在未填写料号的明细', icon: 'none' })
    }

    const targetPallet = palletNo.trim()
    this.setData({ submitting: true })
    try {
      const warehouseId = this.data.selectedWarehouse ? this.data.selectedWarehouse.id : ''
      const submitRes = await request({
        url: `/api/pallet-stocktake/pallet/${encodeURIComponent(targetPallet)}/submit?operator=${encodeURIComponent(operator)}&stocktakeNo=${encodeURIComponent(stocktakeNo || '')}&warehouseId=${encodeURIComponent(warehouseId)}`,
        method: 'POST',
        data: scannedList
      })
      const usedPlanNo = (submitRes && submitRes.data && submitRes.data.planNo) ? submitRes.data.planNo : stocktakeNo
      wx.showModal({
        title: '提交成功',
        content: `盘点单号: ${usedPlanNo}\n卡板 ${targetPallet} 已提交待确认\n可继续盘点其他卡板并归集到同一单号，最后网页一次确认`,
        showCancel: false,
        success: () => {
          this.setData({ scannedList: [], palletNo: '', stocktakeNo: usedPlanNo })
          // 清除缓存
          wx.removeStorageSync('stk_cache')
          // 保留当前盘点单号，支持多个卡板归集后一次确认
          this.saveToCache()
        }
      })
    } catch (e) {
      const msg = (e && (e.msg || e.message)) || '提交失败'
      wx.showToast({ title: String(msg).slice(0, 30), icon: 'none' })
    } finally {
      this.setData({ submitting: false })
    }
  }
})
