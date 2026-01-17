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
        <el-form-item label="二维码/批次号">
          <el-input v-model="searchForm.qrCode" placeholder="扫码或输入" clearable style="width:150px" />
        </el-form-item>
        <el-form-item label="料号">
          <el-input v-model="searchForm.materialCode" placeholder="请输入料号" clearable />
        </el-form-item>
        <el-form-item label="卷类型">
          <el-select v-model="searchForm.rollType" placeholder="全部" clearable style="width:100px">
            <el-option label="母卷" value="母卷" />
            <el-option label="复卷" value="复卷" />
            <el-option label="分切卷" value="分切卷" />
          </el-select>
        </el-form-item>
        <el-form-item label="卡板位">
          <el-input v-model="searchForm.location" placeholder="请输入卡板位" clearable />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="el-icon-search" @click="handleSearch">搜 索</el-button>
          <el-button icon="el-icon-refresh-left" @click="handleReset">重 置</el-button>
        </el-form-item>
      </el-form>

      <!-- 隐藏的文件上传 -->
      <input ref="fileInput" type="file" accept=".xlsx,.xls" style="display:none" @change="onFileChange">

      <!-- 数据表格 -->
      <el-table v-loading="loading" :data="stockList" style="width: 100%; margin-top: 15px" border stripe>
        <el-table-column type="index" label="序号" width="60" align="center" :index="indexMethod" />
        <el-table-column prop="qrCode" label="二维码" width="150">
          <template slot-scope="scope">
            <el-button type="text" icon="el-icon-view" @click="showQrCode(scope.row)">
              {{ scope.row.qrCode || scope.row.batchNo }}
            </el-button>
          </template>
        </el-table-column>
        <el-table-column prop="rollType" label="卷类型" width="80" align="center">
          <template slot-scope="scope">
            <el-tag :type="getRollTypeTag(scope.row.rollType)" size="small">
              {{ scope.row.rollType || '母卷' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="materialCode" label="料号" width="160" />
        <el-table-column prop="productName" label="产品名称" width="150" show-overflow-tooltip />
        <el-table-column prop="batchNo" label="批次号" width="130" />
        <el-table-column prop="thickness" label="厚度(μm)" width="85" align="center" />
        <el-table-column prop="width" label="宽度(mm)" width="85" align="center" />
        <el-table-column label="长度(m)" width="120" align="center">
          <template slot-scope="scope">
            <span v-if="scope.row.currentLength && scope.row.currentLength !== scope.row.originalLength">
              <span style="color:#67c23a">{{ scope.row.currentLength }}</span>
              <span style="color:#909399;font-size:12px"> / {{ scope.row.originalLength || scope.row.length }}</span>
            </span>
            <span v-else>{{ scope.row.currentLength || scope.row.length }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="totalRolls" label="库存卷数" width="90" align="center">
          <template slot-scope="scope">
            <el-tag :type="scope.row.totalRolls > 0 ? 'success' : 'info'">
              {{ scope.row.totalRolls }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="totalSqm" label="总平米数" width="100" align="right" />
        <el-table-column prop="location" label="卡板位" width="80" align="center" />
        <el-table-column prop="prodDate" label="生产日期" width="110" />
      </el-table>

      <!-- 分页 -->
      <el-pagination
        :current-page="pagination.page"
        :page-sizes="[20, 50, 100, 200]"
        :page-size="pagination.size"
        :total="pagination.total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
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
import { getStockList, importStock, exportStock, downloadTemplate } from '@/api/tapeStock'

export default {
  name: 'StockList', data() {
    return {
      searchForm: {
        qrCode: '',
        materialCode: '',
        rollType: '',
        location: ''
      },
      stockList: [],
      loading: false,
      pagination: {
        page: 1,
        size: 20,
        total: 0
      },
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
        const params = {
          page: this.pagination.page,
          size: this.pagination.size,
          ...this.searchForm
        }
        const res = await getStockList(params)
        if (res.code === 20000 || res.code === 200) {
          this.stockList = res.data.records || []
          this.pagination.total = Number(res.data.total) || 0
          this.pagination.page = Number(res.data.current) || 1
          this.pagination.size = Number(res.data.size) || 20
        }
      } catch (error) {
        console.error('获取库存列表失败:', error)
        this.$message.error('获取库存列表失败')
      } finally {
        this.loading = false
      }
    },
    handleSearch() {
      this.pagination.page = 1
      this.fetchData()
    },
    handleReset() {
      this.searchForm = { qrCode: '', materialCode: '', rollType: '', location: '' }
      this.handleSearch()
    },
    handleSizeChange(size) {
      this.pagination.size = size
      this.pagination.page = 1
      this.fetchData()
    },
    handleCurrentChange(page) {
      this.pagination.page = page
      this.fetchData()
    },
    // 序号方法，支持分页
    indexMethod(index) {
      return (this.pagination.page - 1) * this.pagination.size + index + 1
    }, handleDownloadTemplate() {
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
    // 获取卷类型标签颜色
    getRollTypeTag(rollType) {
      const typeMap = {
        '母卷': 'primary',
        '复卷': 'success',
        '分切卷': 'warning'
      }
      return typeMap[rollType] || 'info'
    },
    // 显示二维码
    showQrCode(row) {
      this.$alert(
        `<div style="text-align:center;">
          <p style="font-size:16px;font-weight:bold;margin-bottom:10px;">${row.qrCode || row.batchNo}</p>
          <p>料号：${row.materialCode || '-'}</p>
          <p>规格：${row.thickness || '-'}μm × ${row.width || '-'}mm × ${row.currentLength || row.length || '-'}m</p>
          <p>卷类型：${row.rollType || '母卷'}</p>
        </div>`,
        '二维码信息',
        {
          dangerouslyUseHTMLString: true,
          confirmButtonText: '关闭'
        }
      )
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
