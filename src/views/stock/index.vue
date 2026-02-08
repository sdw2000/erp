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
        v-loading="loading"
        :data="summaryList"
        style="width: 100%; margin-top: 15px"
        border
        stripe
        row-key="materialCode"
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
              style="width: 100%"
            >
              <el-table-column prop="qrCode" label="二维码" width="150" />
              <el-table-column prop="batchNo" label="批次号" width="140" />
              <el-table-column prop="rollType" label="卷类型" width="90" />
              <el-table-column prop="thickness" label="厚度(μm)" width="90" align="center" />
              <el-table-column prop="width" label="宽度(mm)" width="90" align="center" />
              <el-table-column prop="currentLength" label="长度(m)" width="90" align="right" />
              <el-table-column prop="totalSqm" label="总平米" width="100" align="right" />
              <el-table-column prop="availableArea" label="可用平米" width="110" align="right" />
              <el-table-column prop="reservedArea" label="已锁定平米" width="110" align="right" />
              <el-table-column prop="consumedArea" label="已消耗平米" width="110" align="right" />
              <el-table-column prop="prodDate" label="生产日期" width="120" />
              <el-table-column prop="location" label="卡板位" width="90" />
            </el-table>
          </template>
        </el-table-column>
        <el-table-column type="index" label="序号" width="60" align="center" />
        <el-table-column prop="materialCode" label="料号" width="200" />
        <el-table-column prop="productName" label="产品名称" width="200" show-overflow-tooltip />
        <el-table-column prop="totalRolls" label="库存卷数" width="100" align="center" />
        <el-table-column prop="totalSqm" label="总平米" width="120" align="right" />
        <el-table-column prop="availableArea" label="可用平米" width="120" align="right" />
        <el-table-column prop="reservedArea" label="已锁定平米" width="120" align="right" />
        <el-table-column prop="consumedArea" label="已消耗平米" width="120" align="right" />
      </el-table>
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
import { getStockSummary, getStockByMaterial, importStock, exportStock, downloadTemplate } from '@/api/tapeStock'

export default {
  name: 'StockList', data() {
    return {
      searchForm: {
        materialCode: ''
      },
      summaryList: [],
      detailMap: {},
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
        const res = await getStockSummary()
        if (res.code === 20000 || res.code === 200) {
          const list = (res.data || []).map(x => ({
            ...x,
            availableArea: Number(x.availableArea || 0),
            reservedArea: Number(x.reservedArea || 0),
            consumedArea: Number(x.consumedArea || 0)
          }))
          if (this.searchForm.materialCode) {
            const key = this.searchForm.materialCode.toLowerCase()
            this.summaryList = list.filter(item => (item.materialCode || '').toLowerCase().includes(key))
          } else {
            this.summaryList = list
          }
        }
      } catch (error) {
        console.error('获取库存列表失败:', error)
        this.$message.error('获取库存列表失败')
      } finally {
        this.loading = false
      }
    },
    handleSearch() {
      this.fetchData()
    },
    handleReset() {
      this.searchForm = { materialCode: '' }
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
      // 只在首次展开时加载明细
      if (this.detailMap[code]) return
      this.$set(this.detailLoading, code, true)
      try {
        const res = await getStockByMaterial(code)
        if (res.code === 20000 || res.code === 200) {
          const details = (res.data || []).map(x => ({
            ...x,
            availableArea: Number(x.availableArea || 0),
            reservedArea: Number(x.reservedArea || 0),
            consumedArea: Number(x.consumedArea || 0)
          }))
          this.$set(this.detailMap, code, details)
        }
      } finally {
        this.$set(this.detailLoading, code, false)
      }
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
}
</style>
