<template>
  <div class="stock-container">
    <el-card>
      <div slot="header" class="clearfix">
        <span>库存管理</span>
        <div style="float: right">
          <span class="header-summary">库存总卷数：{{ headerTotalRolls }}</span>
          <span class="header-summary" style="margin-left: 16px;">库存总平米数：{{ headerTotalSqm }}</span>
          <el-button v-if="$hasRole('admin')" type="success" icon="el-icon-download" size="small" @click="handleDownloadTemplate">下载模板</el-button>
          <el-button v-if="$hasRole('admin')" type="warning" icon="el-icon-upload2" size="small" @click="handleImport">导入</el-button>
          <el-button v-if="$hasRole('admin')" type="info" icon="el-icon-download" size="small" @click="handleExport">导出</el-button>
        </div>
      </div>

      <!-- 查询表单 -->
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="料号">
          <el-input v-model="searchForm.materialCode" placeholder="支持模糊查询" clearable />
        </el-form-item>
        <el-form-item label="是否含退货专仓库存">
          <el-switch v-model="searchForm.includeReturnWarehouse" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="el-icon-search" @click="handleSearch">搜 索</el-button>
          <el-button icon="el-icon-refresh-left" @click="handleReset">重 置</el-button>
        </el-form-item>
      </el-form>

      <!-- 隐藏的文件上传 -->
      <input ref="fileInput" type="file" accept=".xlsx,.xls" style="display:none" @change="onFileChange">

      <!-- 数据表格 -->
      <el-table
        ref="summaryTable"
        v-loading="loading"
        :data="summaryList"
        style="width: 100%; margin-top: 15px"
        border
        stripe
        row-key="materialCode"
        :expand-row-keys="expandedRowKeys"
        :row-class-name="summaryRowClassName"
        @expand-change="handleExpandChange"
      >
        <el-table-column type="expand">
          <template slot-scope="scope">
            <el-table
              v-loading="detailLoading[scope.row.materialCode]"
              :data="detailMap[scope.row.materialCode] || []"
              size="mini"
              border
              stripe
              :row-class-name="detailRowClassName"
              style="width: 100%"
            >
              <el-table-column prop="qrCode" label="二维码" min-width="150" />
              <el-table-column prop="batchNo" label="批次号" min-width="140" />
              <el-table-column label="数字号" min-width="90" align="center">
                <template slot-scope="detailScope">
                  {{ getDigitalNumberText(detailScope.row) }}
                </template>
              </el-table-column>
              <el-table-column prop="rollType" label="卷类型" min-width="90" />
              <el-table-column prop="thickness" label="厚度(μm)" min-width="90" align="center" />
              <el-table-column prop="width" label="宽度(mm)" min-width="90" align="center" />
              <el-table-column prop="currentLength" label="长度(m)" min-width="90" align="right" />
              <el-table-column prop="totalRolls" label="库存卷数" min-width="90" align="center" />
              <el-table-column prop="totalSqm" label="总平米" min-width="100" align="right" />
              <el-table-column prop="availableArea" label="可用平米" min-width="110" align="right">
                <template slot-scope="detailScope">
                  <span :class="{ 'available-zero': Number(detailScope.row.availableArea || 0) <= 0 }">
                    {{ detailScope.row.availableArea }}
                  </span>
                </template>
              </el-table-column>
              <el-table-column prop="reservedArea" label="已锁定平米" min-width="110" align="right" />
              <el-table-column prop="consumedArea" label="已消耗平米" min-width="110" align="right" />
              <el-table-column prop="prodDate" label="生产日期" min-width="120" />
              <el-table-column prop="location" label="卡板位" min-width="90" />
              <el-table-column prop="remark" label="备注信息" min-width="220" show-overflow-tooltip />
              <el-table-column v-if="$hasRole('admin')" label="操作" min-width="120" align="center" fixed="right">
                <template slot-scope="detailScope">
                  <template v-if="!detailScope.row.isAggregated">
                    <el-button type="text" size="mini" @click="openStocktakeDialog(detailScope.row)">盘点</el-button>
                  </template>
                  <span v-else class="text-muted">-</span>
                </template>
              </el-table-column>
            </el-table>
            <el-pagination
              v-if="detailTotalMap[scope.row.materialCode] > 0"
              :current-page="detailPageMap[scope.row.materialCode] || 1"
              :page-size="detailPageSizeMap[scope.row.materialCode] || 20"
              :total="detailTotalMap[scope.row.materialCode] || 0"
              layout="total, sizes, prev, pager, next"
              :page-sizes="[10, 20, 50, 100]"
              @size-change="size => handleDetailSizeChange(scope.row.materialCode, size)"
              @current-change="page => handleDetailPageChange(scope.row.materialCode, page)"
            />
          </template>
        </el-table-column>
        <el-table-column type="index" label="序号" width="60" align="center" />
        <el-table-column prop="materialCode" label="料号" min-width="200" />
        <el-table-column prop="productName" label="产品名称" min-width="220" show-overflow-tooltip />
        <el-table-column prop="totalRolls" label="库存卷数" min-width="100" align="center" />
        <el-table-column prop="totalSqm" label="总平米" min-width="120" align="right" />
        <el-table-column prop="availableArea" label="可用平米" min-width="120" align="right">
          <template slot-scope="scope">
            <span :class="{ 'available-zero': Number(scope.row.availableArea || 0) <= 0 }">
              {{ scope.row.availableArea }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="reservedArea" label="已锁定平米" min-width="120" align="right" />
        <el-table-column prop="consumedArea" label="已消耗平米" min-width="120" align="right" />
      </el-table>
      <el-pagination
        v-if="totalSummary > 0"
        :current-page="summaryPage"
        :page-size="summaryPageSize"
        :total="totalSummary"
        layout="total, sizes, prev, pager, next"
        :page-sizes="[10, 20, 50, 100]"
        @size-change="handleSummarySizeChange"
        @current-change="handleSummaryPageChange"
      />
    </el-card>

    <!-- 导入结果弹窗 -->
    <el-dialog title="导入结果" :visible.sync="importResultVisible" width="500px">
      <div v-if="importResult">
        <p><strong>任务状态：</strong>{{ importResult.status || '-' }}</p>
        <p><strong>处理进度：</strong>{{ importResult.processedRows || 0 }} / {{ importResult.totalRows || 0 }}</p>
        <p><strong>成功：</strong>{{ importResult.successCount }} 条</p>
        <p><strong>失败/跳过：</strong>{{ importResult.failCount }} 条</p>
        <p v-if="Number(importResult.failCount || 0) > 0" style="color:#e6a23c; margin-top: 6px;">
          检测到失败行，可点击下方“下载失败行Excel”获取明细。
        </p>
        <div v-if="importResult.errors && importResult.errors.length > 0">
          <p><strong>错误详情：</strong></p>
          <ul>
            <li v-for="(err, idx) in importResult.errors" :key="idx" style="color: #f56c6c">{{ err }}</li>
          </ul>
        </div>
      </div>
      <div slot="footer">
        <el-button
          v-if="importResult && Number(importResult.failCount || 0) > 0"
          type="warning"
          @click="downloadSkippedData(importResult.skippedExcel)"
        >下载失败行Excel</el-button>
        <el-button type="primary" @click="importResultVisible = false">确定</el-button>
      </div>
    </el-dialog>

    <el-dialog title="库存盘点" :visible.sync="stocktakeVisible" width="520px">
      <el-form :model="stocktakeForm" label-width="110px" size="small">
        <el-form-item label="料号">
          <el-input :value="stocktakeForm.materialCode" disabled />
        </el-form-item>
        <el-form-item label="批次号">
          <el-input :value="stocktakeForm.batchNo" disabled />
        </el-form-item>
        <el-form-item label="当前卷数">
          <el-input :value="stocktakeForm.beforeRolls" disabled />
        </el-form-item>
        <el-form-item label="当前总平米">
          <el-input :value="stocktakeForm.beforeSqm" disabled />
        </el-form-item>
        <el-form-item label="盘点后卷数" required>
          <el-input-number v-model="stocktakeForm.actualRolls" :min="0" :controls="true" style="width: 100%" />
        </el-form-item>
        <el-form-item label="盘点后总平米">
          <el-input-number v-model="stocktakeForm.actualSqm" :min="0" :precision="2" :controls="true" style="width: 100%" />
          <div style="font-size:12px;color:#909399;">可留空：系统将按卷数比例估算总平米</div>
        </el-form-item>
        <el-form-item label="盘点原因">
          <el-input v-model="stocktakeForm.reason" maxlength="200" placeholder="如：实物复盘、报废、盘盈" />
        </el-form-item>
      </el-form>
      <span slot="footer">
        <el-button @click="stocktakeVisible = false">取消</el-button>
        <el-button type="primary" :loading="stocktakeSubmitting" @click="submitStocktake">确认盘点</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import { getStockSummary, getStockSummaryPage, getStockByMaterialPage, importStockAsync, getImportTaskStatus, downloadImportFailedFile, exportStock, downloadTemplate, stocktakeTapeStock } from '@/api/tapeStock'
import elTableAutoLayout from '@/mixins/elTableAutoLayout'

export default {
  name: 'StockList',
  mixins: [elTableAutoLayout],
  tableLayoutRefs: ['summaryTable'],
  data() {
    return {
      searchForm: {
        materialCode: '',
        includeReturnWarehouse: false
      },
      summaryList: [],
      summaryPage: 1,
      summaryPageSize: 20,
      totalSummary: 0,
      expandedRowKeys: [],
      detailMap: {},
      detailPageMap: {},
      detailPageSizeMap: {},
      detailTotalMap: {},
      detailLoading: {},
      loading: false,
      importResultVisible: false,
      importResult: null,
      importTaskId: '',
      importPollingTimer: null,
      headerTotalRolls: 0,
      headerTotalSqm: 0,
      stocktakeVisible: false,
      stocktakeSubmitting: false,
      stocktakeForm: {
        stockId: null,
        materialCode: '',
        batchNo: '',
        beforeRolls: 0,
        beforeSqm: 0,
        actualRolls: 0,
        actualSqm: null,
        reason: '月度盘点'
      }
    }
  }, created() {
    this.fetchData()
    this.fetchHeaderTotals()
  },
  methods: {
    getDigitalNumberText(row) {
      if (!row) return '-'
      const direct = row.sequenceNo ?? row.sequence_no ?? row.digitalNo ?? row.numberNo ?? row.printNumber ?? row.printNo
      if (direct !== null && direct !== undefined && String(direct).trim() !== '') {
        return String(direct).trim()
      }
      const text = String((row && row.remark) || '')
      const m = text.match(/数字号\s*[:：=]\s*([^；;,\s|]+)/)
      if (m && m[1]) return String(m[1]).trim()
      const qr = String((row && row.qrCode) || '')
      const q = qr.match(/-(\d{1,3})$/)
      if (q && q[1]) return String(Number(q[1]))
      return '-'
    },
    async fetchHeaderTotals() {
      try {
        const res = await getStockSummary()
        if (res.code === 20000 || res.code === 200) {
          const list = res.data || []
          this.headerTotalRolls = list.reduce((sum, item) => sum + Number(item.totalRolls || 0), 0)
          const sqm = list.reduce((sum, item) => sum + Number(item.totalSqm || 0), 0)
          this.headerTotalSqm = Number(sqm.toFixed(2))
        }
      } catch (e) {
        this.headerTotalRolls = 0
        this.headerTotalSqm = 0
      }
    },
    async fetchData() {
      this.loading = true
      try {
        const res = await getStockSummaryPage({
          current: this.summaryPage,
          size: this.summaryPageSize,
          materialCode: this.searchForm.materialCode || undefined,
          includeReturnWarehouse: this.searchForm.includeReturnWarehouse
        })
        if (res.code === 20000 || res.code === 200) {
          const list = ((res.data && res.data.records) || []).map(x => ({
            ...x,
            availableArea: Number(x.availableArea || 0),
            reservedArea: Number(x.reservedArea || 0),
            consumedArea: Number(x.consumedArea || 0)
          }))
          this.summaryList = list
          this.totalSummary = Number((res.data && res.data.total) || 0)
          this.summaryPage = Number((res.data && res.data.current) || this.summaryPage)
          this.summaryPageSize = Number((res.data && res.data.size) || this.summaryPageSize)
        }
      } catch (error) {
        console.error('获取库存列表失败:', error)
        this.$message.error('获取库存列表失败')
      } finally {
        this.loading = false
        this.scheduleTableLayout()
      }
    },
    handleSummaryPageChange(page) {
      this.summaryPage = page
      this.fetchData()
    },
    handleSummarySizeChange(size) {
      this.summaryPageSize = size
      this.summaryPage = 1
      this.fetchData()
    },
    handleSearch() {
      this.summaryPage = 1
      this.fetchData()
      this.fetchHeaderTotals()
    },
    handleReset() {
      this.searchForm = { materialCode: '' }
      this.summaryPage = 1
      this.fetchData()
      this.fetchHeaderTotals()
    },
    handleDownloadTemplate() {
      downloadTemplate().then(res => {
        this.downloadFile(res, '库存导入模板.xlsx')
      }).catch(() => {
        this.$message.error('下载模板失败')
      })
    },
    handleImport() {
      this.$refs.fileInput.click()
    }, async onFileChange(e) {
      const file = e.target.files[0]
      if (!file) return

      this.loading = true
      try {
        const res = await importStockAsync(file)
        if (res.code === 20000 || res.code === 200) {
          this.importTaskId = (res.data && res.data.taskId) || ''
          this.importResult = {
            status: 'PENDING',
            successCount: 0,
            failCount: 0,
            totalRows: 0,
            processedRows: 0,
            message: '任务已创建，等待执行',
            errors: [],
            hasFailedFile: false
          }
          this.importResultVisible = true
          this.$message.success('导入任务已创建，正在后台执行')
          this.startImportPolling()
        } else {
          this.$message.error(res.msg || '导入失败')
        }
      } catch (error) {
        this.$message.error('导入失败')
      } finally {
        this.loading = false
        this.$refs.fileInput.value = ''
      }
    },
    startImportPolling() {
      this.stopImportPolling()
      this.pollImportTask()
      this.importPollingTimer = setInterval(() => {
        this.pollImportTask()
      }, 2000)
    },
    stopImportPolling() {
      if (this.importPollingTimer) {
        clearInterval(this.importPollingTimer)
        this.importPollingTimer = null
      }
    },
    async pollImportTask() {
      if (!this.importTaskId) return
      try {
        const res = await getImportTaskStatus(this.importTaskId)
        if (res.code !== 200 && res.code !== 20000) return
        const d = res.data || {}
        this.importResult = {
          status: d.status,
          successCount: Number(d.successCount || 0),
          failCount: Number(d.failCount || 0),
          totalRows: Number(d.totalRows || 0),
          processedRows: Number(d.processedRows || 0),
          message: d.message || '',
          errors: d.errors || [],
          hasFailedFile: !!d.hasFailedFile
        }
        if (d.status === 'SUCCESS' || d.status === 'FAILED') {
          this.stopImportPolling()
          await this.fetchData()
          await this.fetchHeaderTotals()
          const msg = d.message || `导入完成：成功 ${d.successCount || 0} 条，失败/跳过 ${d.failCount || 0} 条`
          if (d.status === 'SUCCESS') {
            this.$message.success(msg)
          } else {
            this.$message.error(msg)
          }
        }
      } catch (e) {
        // 轮询失败不打断，等待下一次
      }
    },
    downloadSkippedData(skippedExcelBase64) {
      try {
        if (!this.importTaskId) {
          this.$message.warning('未找到导入任务ID，无法下载失败文件')
          return
        }
        downloadImportFailedFile(this.importTaskId).then(blob => {
          this.downloadFile(blob, 'tape_stock_import_failed.xlsx')
        }).catch(() => {
          this.$message.error('下载失败行文件失败')
        })
      } catch (e) {
        this.$message.error('下载失败行文件失败')
      }
    }, handleExport() {
      this.loading = true
      exportStock(this.searchForm).then(res => {
        const fileName = `库存数据_${new Date().toLocaleDateString().replace(/\//g, '-')}.xlsx`
        this.downloadFile(res, fileName)
      }).catch(() => {
        this.$message.error('导出数据失败')
      }).finally(() => {
        this.loading = false
      })
    }, // 下载blob文件
    downloadFile(blob, fileName) {
      const url = window.URL.createObjectURL(new Blob([blob]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', fileName)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    },
    async handleExpandChange(row, expandedRows) {
      const code = row.materialCode
      if (!code) return
      const isExpanded = expandedRows && expandedRows.find(r => r.materialCode === code)
      this.expandedRowKeys = isExpanded ? [code] : []
      if (!this.detailPageMap[code]) {
        this.$set(this.detailPageMap, code, 1)
      }
      if (!this.detailPageSizeMap[code]) {
        this.$set(this.detailPageSizeMap, code, 20)
      }
      if (isExpanded) {
        await this.fetchDetailPage(code)
      }
    },
    async fetchDetailPage(code) {
      this.$set(this.detailLoading, code, true)
      try {
        const current = this.detailPageMap[code] || 1
        const size = this.detailPageSizeMap[code] || 20
        const res = await getStockByMaterialPage({
          materialCode: code,
          current,
          size,
          includeReturnWarehouse: this.searchForm.includeReturnWarehouse
        })
        if (res.code === 20000 || res.code === 200) {
          const details = ((res.data && res.data.records) || []).map(x => ({
            ...x,
            availableArea: Number(x.availableArea || 0),
            reservedArea: Number(x.reservedArea || 0),
            consumedArea: Number(x.consumedArea || 0)
          }))
          this.$set(this.detailMap, code, details)
          this.$set(this.detailTotalMap, code, Number((res.data && res.data.total) || details.length || 0))
        }
      } finally {
        this.$set(this.detailLoading, code, false)
      }
    },
    aggregateDetailRowsBySpec(rows) {
      const src = Array.isArray(rows) ? rows : []
      const groupMap = new Map()
      src.forEach(row => {
        const key = [
          row.materialCode || '',
          row.rollType || '',
          row.thickness || '',
          row.width || '',
          row.currentLength || row.length || ''
        ].join('|')
        if (!groupMap.has(key)) {
          groupMap.set(key, {
            ...row,
            isAggregated: false,
            sourceRows: [row]
          })
          return
        }
        const agg = groupMap.get(key)
        agg.sourceRows.push(row)
        agg.totalRolls = Number(agg.totalRolls || 0) + Number(row.totalRolls || 0)
        agg.totalSqm = Number(agg.totalSqm || 0) + Number(row.totalSqm || 0)
        agg.availableArea = Number(agg.availableArea || 0) + Number(row.availableArea || 0)
        agg.reservedArea = Number(agg.reservedArea || 0) + Number(row.reservedArea || 0)
        agg.consumedArea = Number(agg.consumedArea || 0) + Number(row.consumedArea || 0)
      })

      return Array.from(groupMap.values()).map(item => {
        if (!item.sourceRows || item.sourceRows.length <= 1) {
          item.isAggregated = false
          return item
        }
        const size = item.sourceRows.length
        const batchSet = new Set(item.sourceRows.map(x => x.batchNo).filter(Boolean))
        const qrSet = new Set(item.sourceRows.map(x => x.qrCode).filter(Boolean))
        const locSet = new Set(item.sourceRows.map(x => x.location).filter(Boolean))
        return {
          ...item,
          isAggregated: true,
          id: `STOCK-AGG-${item.materialCode || ''}-${item.rollType || ''}-${item.thickness || ''}-${item.width || ''}-${item.currentLength || item.length || ''}`,
          batchNo: batchSet.size <= 1 ? (item.batchNo || '-') : `多批次(${batchSet.size})`,
          qrCode: qrSet.size <= 1 ? (item.qrCode || '-') : `多卷(${size})`,
          location: locSet.size <= 1 ? (item.location || '-') : `多库位(${locSet.size})`,
          sequenceNo: '-'
        }
      })
    },
    handleDetailPageChange(code, page) {
      this.$set(this.detailPageMap, code, page)
      this.fetchDetailPage(code)
    },
    handleDetailSizeChange(code, size) {
      this.$set(this.detailPageSizeMap, code, size)
      this.$set(this.detailPageMap, code, 1)
      this.fetchDetailPage(code)
    },
    toTimeValue(dateStr) {
      if (!dateStr) return 0
      const t = new Date(dateStr).getTime()
      return Number.isNaN(t) ? 0 : t
    },
    isAvailableZero(row) {
      return Number(row.availableArea || 0) <= 0
    },
    summaryRowClassName({ row }) {
      return this.isAvailableZero(row) ? 'row-zero' : ''
    },
    detailRowClassName({ row }) {
      return this.isAvailableZero(row) ? 'row-zero' : ''
    },
    openStocktakeDialog(row) {
      if (!row || !row.id) {
        this.$message.warning('库存记录异常，无法盘点')
        return
      }
      this.stocktakeForm = {
        stockId: row.id,
        materialCode: row.materialCode || '',
        batchNo: row.batchNo || '',
        beforeRolls: Number(row.totalRolls || 0),
        beforeSqm: Number(row.totalSqm || 0),
        actualRolls: Number(row.totalRolls || 0),
        actualSqm: Number(row.totalSqm || 0),
        reason: '月度盘点'
      }
      this.stocktakeVisible = true
    },
    async submitStocktake() {
      if (!this.stocktakeForm.stockId) return
      if (this.stocktakeForm.actualRolls === null || this.stocktakeForm.actualRolls < 0) {
        this.$message.warning('请填写有效的盘点后卷数')
        return
      }
      this.stocktakeSubmitting = true
      try {
        const payload = {
          actualRolls: Number(this.stocktakeForm.actualRolls),
          actualSqm: this.stocktakeForm.actualSqm === null || this.stocktakeForm.actualSqm === ''
            ? null
            : Number(this.stocktakeForm.actualSqm),
          operator: (this.$store && this.$store.getters && (this.$store.getters.name || this.$store.getters.username)) || '',
          reason: this.stocktakeForm.reason || ''
        }
        const res = await stocktakeTapeStock(this.stocktakeForm.stockId, payload)
        if (res.code !== 200 && res.code !== 20000) {
          return this.$message.error((res && (res.msg || res.message)) || '盘点失败')
        }
        this.$message.success('盘点成功')
        this.stocktakeVisible = false
        await this.fetchData()
        await this.fetchHeaderTotals()
        const expandedCode = this.expandedRowKeys && this.expandedRowKeys[0]
        if (expandedCode) {
          await this.fetchDetailPage(expandedCode)
        }
      } catch (e) {
        this.$message.error((e && e.message) || '盘点失败')
      } finally {
        this.stocktakeSubmitting = false
      }
    }
  },
  beforeDestroy() {
    this.stopImportPolling()
  }
}
</script>

<style lang="scss" scoped>
.stock-container {
  padding: 20px;
  .header-summary {
    color: #409EFF;
    font-weight: 600;
    margin-right: 12px;
  }
  .search-card, .toolbar-card {
    margin-bottom: 15px;
  }
  .el-pagination {
    margin-top: 15px;
    text-align: right;
  }
  .available-zero {
    color: #f56c6c;
    font-weight: bold;
  }
  .row-zero td {
    color: #f56c6c;
  }
}
</style>
