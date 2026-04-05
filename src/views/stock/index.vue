<template>
  <div class="stock-container">
    <el-card>
      <div slot="header" class="clearfix">
        <span>库存管理</span>        <div style="float: right">
          <!-- 只有 admin 和 warehouse 有权进行导入导出 -->
          <el-button v-if="$canImportExport()" type="success" icon="el-icon-download" size="small" @click="handleDownloadTemplate">下载模板</el-button>
          <el-button v-if="$canImportExport()" type="warning" icon="el-icon-upload2" size="small" @click="handleImport">导入</el-button>
          <el-button v-if="$canImportExport()" type="info" icon="el-icon-download" size="small" @click="handleExport">导出</el-button>
        </div>
      </div>

      <!-- 查询表单 -->
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="料号">
          <el-input v-model="searchForm.materialCode" placeholder="支持模糊查询" clearable />
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
              <el-table-column prop="rollType" label="卷类型" min-width="90" />
              <el-table-column prop="thickness" label="厚度(μm)" min-width="90" align="center" />
              <el-table-column prop="width" label="宽度(mm)" min-width="90" align="center" />
              <el-table-column prop="currentLength" label="长度(m)" min-width="90" align="right" />
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
        <p><strong>成功：</strong>{{ importResult.successCount }} 条</p>
        <p><strong>失败：</strong>{{ importResult.failCount }} 条</p>
        <div v-if="importResult.errors && importResult.errors.length > 0">
          <p><strong>错误详情：</strong></p>
          <ul>
            <li v-for="(err, idx) in importResult.errors" :key="idx" style="color: #f56c6c">{{ err }}</li>
          </ul>
        </div>
      </div>
      <div slot="footer">
        <el-button type="primary" @click="importResultVisible = false">确定</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { getStockSummaryPage, getStockByMaterialPage, importStock, exportStock, downloadTemplate } from '@/api/tapeStock'
import elTableAutoLayout from '@/mixins/elTableAutoLayout'

export default {
  name: 'StockList',
  mixins: [elTableAutoLayout],
  tableLayoutRefs: ['summaryTable'],
  data() {
    return {
      searchForm: {
        materialCode: ''
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
      importResult: null
    }
  }, created() {
    this.fetchData()
  },
  methods: {
    async fetchData() {
      this.loading = true
      try {
        const res = await getStockSummaryPage({
          current: this.summaryPage,
          size: this.summaryPageSize,
          materialCode: this.searchForm.materialCode || undefined
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
    },
    handleReset() {
      this.searchForm = { materialCode: '' }
      this.summaryPage = 1
      this.fetchData()
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
        const res = await importStock(file)
        if (res.code === 20000 || res.code === 200) {
          this.$message.success('导入完成')
          this.importResult = res.data
          this.importResultVisible = true
          this.fetchData()
        } else {
          this.$message.error(res.msg || '导入失败')
        }
      } catch (error) {
        this.$message.error('导入失败')
      } finally {
        this.loading = false
        this.$refs.fileInput.value = ''
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
        const res = await getStockByMaterialPage({
          materialCode: code,
          current: this.detailPageMap[code] || 1,
          size: this.detailPageSizeMap[code] || 20
        })
        if (res.code === 20000 || res.code === 200) {
          const details = ((res.data && res.data.records) || []).map(x => ({
            ...x,
            availableArea: Number(x.availableArea || 0),
            reservedArea: Number(x.reservedArea || 0),
            consumedArea: Number(x.consumedArea || 0)
          }))
          this.$set(this.detailMap, code, details)
          this.$set(this.detailTotalMap, code, Number((res.data && res.data.total) || 0))
        }
      } finally {
        this.$set(this.detailLoading, code, false)
      }
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
    }
  }
}
</script>

<style lang="scss" scoped>
.stock-container {
  padding: 20px;
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
