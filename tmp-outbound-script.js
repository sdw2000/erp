
import { getOutboundList, createOutboundRequest, createOutboundRequestFIFO, approveOutbound, approveOutboundByRollCodes, cancelOutbound, getStockByMaterial } from '@/api/tapeStock'
import { mapGetters } from 'vuex'

export default {
  name: 'OutboundRequest',
  data() {
    return {
      searchForm: { status: null, materialCode: '' },
      list: [],
      loading: false,
      pagination: { page: 1, size: 20, total: 0 },
      // 鎵嬪姩閫夋嫨
      dialogVisible: false,
      submitLoading: false,
      selectMaterialCode: '',
      stockList: [],
      selectedStock: null,
      form: { stockId: null, batchNo: '', rolls: 1, applyDept: '', remark: '' },
      rules: {
        rolls: [{ required: true, message: '璇疯緭鍏ュ嚭搴撳嵎鏁?, trigger: 'blur' }]
      },
      // FIFO
      fifoDialogVisible: false,
      fifoLoading: false,
      fifoForm: { materialCode: '', totalRolls: 1, applyDept: '', remark: '' },
      fifoRules: {
        materialCode: [{ required: true, message: '璇疯緭鍏ユ枡鍙?, trigger: 'blur' }],
        totalRolls: [{ required: true, message: '璇疯緭鍏ュ嚭搴撳嵎鏁?, trigger: 'blur' }]
      },
      // 瀹℃壒
      approveVisible: false,
      approveLoading: false,
      approveTitle: '',
      approveRow: null,
      approveAction: true,
      auditRemark: '',
      scanRollCode: '',
      batchDialogVisible: false,
      batchApproveLoading: false,
      batchScanRollCodes: '',
      batchAuditRemark: '',
      batchResultVisible: false,
      batchResult: {
        total: 0,
        successCount: 0,
        failCount: 0,
        failed: []
      }
    }
  },
  computed: {
    ...mapGetters(['name'])
  },
  created() {
    this.fetchData()
  },
  methods: {
    async fetchData() {
      this.loading = true
      try {
        const params = {
          page: this.pagination.page,
          size: this.pagination.size,
          status: this.searchForm.status === null || this.searchForm.status === undefined || this.searchForm.status === '' ? undefined : this.searchForm.status,
          materialCode: this.searchForm.materialCode ? this.searchForm.materialCode.trim() : undefined
        }
        const res = await getOutboundList(params)
        if (this.isApiSuccess(res)) {
          this.list = res.data.records
          this.pagination.total = Number(res.data.total) || 0
        }
      } catch (e) {
        console.error(e)
      } finally {
        this.loading = false
      }
    },
    handleSearch() {
      this.pagination.page = 1
      this.fetchData()
    },
    handleReset() {
      this.searchForm = { status: null, materialCode: '' }
      this.handleSearch()
    },
    isApiSuccess(res) {
      return !!res && (res.code === 200 || res.code === 20000)
    },
    handleSizeChange(size) {
      this.pagination.size = size
      this.fetchData()
    },
    handleCurrentChange(page) {
      this.pagination.page = page
      this.fetchData()
    },
  handleAdd() {
    this.selectMaterialCode = ''
    this.stockList = []
    this.selectedStock = null
    this.form = { stockId: null, batchNo: '', rolls: 1, applyDept: '', remark: '' }
    this.dialogVisible = true
  },
  openBatchScanDialog() {
    this.batchScanRollCodes = ''
    this.batchAuditRemark = ''
    this.batchDialogVisible = true
  },
  async loadStockByMaterial() {
    if (!this.selectMaterialCode) {
      this.$message.warning('璇疯緭鍏ユ枡鍙?)
      return
    }
    try {
      const res = await getStockByMaterial(this.selectMaterialCode)
      if (this.isApiSuccess(res)) {
        this.stockList = res.data || []
        if (this.stockList.length === 0) {
          this.$message.info('璇ユ枡鍙锋棤鍙敤搴撳瓨')
        }
      }
    } catch (e) {
      this.$message.error('鏌ヨ澶辫触')
    }
  },
  selectStock(row) {
    this.selectedStock = row
    this.form.stockId = row.id
    this.form.batchNo = row.batchNo
    this.form.rolls = 1
  },
  async handleSubmit() {
    if (!this.form.stockId) {
      this.$message.warning('璇峰厛閫夋嫨涓€涓壒娆?)
      return
    }
    this.$refs.form.validate(async(valid) => {
      if (!valid) return
      this.submitLoading = true
      try {
        this.form.applicant = this.name
        const res = await createOutboundRequest(this.form)
        if (this.isApiSuccess(res)) {
          this.$message.success('鐢宠鎻愪氦鎴愬姛')
          this.dialogVisible = false
          this.fetchData()
        } else {
          this.$message.error(res.msg || '鎻愪氦澶辫触')
        }
      } catch (e) {
        this.$message.error('鎻愪氦澶辫触')
      } finally {
        this.submitLoading = false
      }
    })
  },
  handleAddFIFO() {
    this.fifoForm = { materialCode: '', totalRolls: 1, applyDept: '', remark: '' }
    this.fifoDialogVisible = true
  },
  async handleFIFOSubmit() {
    this.$refs.fifoForm.validate(async(valid) => {
      if (!valid) return
      this.fifoLoading = true
      try {
        const params = {
          materialCode: this.fifoForm.materialCode,
          totalRolls: this.fifoForm.totalRolls,
          applicant: this.name,
          applyDept: this.fifoForm.applyDept,
          remark: this.fifoForm.remark
        }
        const res = await createOutboundRequestFIFO(params)
        if (this.isApiSuccess(res)) {
          this.$message.success(res.msg || '鐢宠鎻愪氦鎴愬姛')
          this.fifoDialogVisible = false
          this.fetchData()
        } else {
          this.$message.error(res.msg || '鎻愪氦澶辫触')
        }
      } catch (e) {
        this.$message.error('鎻愪氦澶辫触')
      } finally {
        this.fifoLoading = false
      }
    })
  },
  handleApprove(row, approved) {
    this.approveRow = row
    this.approveAction = approved
    this.approveTitle = approved ? '瀹℃壒閫氳繃' : '瀹℃壒鎷掔粷'
    this.auditRemark = ''
    this.scanRollCode = ''
    this.approveVisible = true
  },
  parseRollCodes(text) {
    if (!text) return []
    return String(text)
      .split(/[\n,锛?锛沑s]+/g)
      .map(x => x && x.trim())
      .filter(Boolean)
  },
  showBatchResult(data) {
    const result = data || {}
    this.batchResult = {
      total: Number(result.total || 0),
      successCount: Number(result.successCount || 0),
      failCount: Number(result.failCount || 0),
      failed: Array.isArray(result.failed) ? result.failed : []
    }
    this.batchResultVisible = true
  },
  async confirmBatchScanApprove() {
    const multiCodes = this.parseRollCodes(this.batchScanRollCodes)
    if (!multiCodes.length) {
      this.$message.warning('璇峰厛褰曞叆鍗峰彿')
      return
    }
    this.batchApproveLoading = true
    try {
      const res = await approveOutboundByRollCodes({
        rollCodes: multiCodes,
        auditor: this.name,
        auditRemark: this.batchAuditRemark
      })
      if (this.isApiSuccess(res)) {
        const data = res.data || {}
        const successCount = Number(data.successCount || 0)
        const failCount = Number(data.failCount || 0)
        this.$message.success(`鎵归噺瀹屾垚锛氭垚鍔?{successCount}锛屽け璐?{failCount}`)
        this.batchDialogVisible = false
        this.showBatchResult(data)
        this.fetchData()
      } else {
        this.$message.error(res.msg || '鎵归噺瀹℃壒澶辫触')
      }
    } catch (e) {
      this.$message.error('鎵归噺瀹℃壒澶辫触')
    } finally {
      this.batchApproveLoading = false
    }
  },
  async confirmApprove() {
    if (this.approveAction && !this.scanRollCode) {
      this.$message.warning('璇峰厛鎵爜鍗峰彿')
      return
    }
    this.approveLoading = true
    try {
      const res = await approveOutbound(this.approveRow.id, this.approveAction, this.name, this.auditRemark, this.scanRollCode)
      if (this.isApiSuccess(res)) {
        this.$message.success(this.approveAction ? '宸查€氳繃' : '宸叉嫆缁?)
        this.approveVisible = false
        this.fetchData()
      } else {
        this.$message.error(res.msg || '鎿嶄綔澶辫触')
      }
    } catch (e) {
      this.$message.error('鎿嶄綔澶辫触')
    } finally {
      this.approveLoading = false
    }
  },
  handleCancel(row) {
    this.$confirm('纭畾瑕佸彇娑堣鍑哄簱鐢宠鍚?', '鎻愮ず', { type: 'warning' }).then(async() => {
      try {
        const res = await cancelOutbound(row.id)
        if (this.isApiSuccess(res)) {
          this.$message.success('宸插彇娑?)
          this.fetchData()
        } else {
          this.$message.error(res.msg || '鍙栨秷澶辫触')
        }
      } catch (e) {
        this.$message.error('鍙栨秷澶辫触')
      }
    })
  },
  getStatusType(status) {
    const map = { 0: 'warning', 1: 'success', 2: 'danger', 3: 'info' }
    return map[status] || 'info'
  },
  getStatusText(status) {
    const map = { 0: '寰呭鎵?, 1: '宸查€氳繃', 2: '宸叉嫆缁?, 3: '宸插彇娑? }
    return map[status] || '鏈煡'
  },
  // 鑾峰彇鍗风被鍨嬫爣绛鹃鑹?
  getRollTypeTag(rollType) {
    const typeMap = {
      '姣嶅嵎': 'primary',
      '澶嶅嵎': 'success',
      '鍒嗗垏鍗?: 'warning'
    }
    return typeMap[rollType] || 'info'
  }
}
}

