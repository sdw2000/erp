<template>
  <div class="log-container">
    <!-- 查询表单 -->
    <el-card class="search-card">
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="类型">
          <el-select v-model="searchForm.type" placeholder="请选择类型" clearable>
            <el-option label="入库" value="IN" />
            <el-option label="出库" value="OUT" />
            <el-option label="调整" value="ADJUST" />
          </el-select>
        </el-form-item>
        <el-form-item label="料号">
          <el-input v-model="searchForm.materialCode" placeholder="请输入料号" clearable />
        </el-form-item>
        <el-form-item label="批次号">
          <el-input v-model="searchForm.batchNo" placeholder="请输入批次号" clearable />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="el-icon-search" @click="handleSearch">查询</el-button>
          <el-button icon="el-icon-refresh" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>    <!-- 工具栏 -->
    <el-card class="toolbar-card">
      <el-button v-if="$canImportExport()" type="warning" icon="el-icon-download" @click="handleExport">导出流水</el-button>
    </el-card>

    <!-- 数据表格 -->
    <el-card>
      <el-table v-loading="loading" :data="list" style="width: 100%" border stripe>
        <el-table-column prop="createTime" label="时间" width="160" />
        <el-table-column prop="type" label="类型" width="80" align="center">
          <template slot-scope="scope">
            <el-tag :type="getTypeTagType(scope.row.type)">{{ getTypeText(scope.row.type) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="materialCode" label="料号" width="180" />
        <el-table-column prop="productName" label="产品名称" width="160" show-overflow-tooltip />
        <el-table-column prop="batchNo" label="批次号" width="130" />
        <el-table-column prop="changeRolls" label="变动卷数" width="100" align="center">
          <template slot-scope="scope">
            <span :class="scope.row.changeRolls > 0 ? 'text-success' : 'text-danger'">
              {{ scope.row.changeRolls > 0 ? '+' : '' }}{{ scope.row.changeRolls }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="beforeRolls" label="变动前" width="80" align="center" />
        <el-table-column prop="afterRolls" label="变动后" width="80" align="center" />
        <el-table-column prop="refNo" label="关联单号" width="160" />
        <el-table-column prop="operator" label="操作人" width="90" />
        <el-table-column prop="remark" label="备注" min-width="150" show-overflow-tooltip />
      </el-table>

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
  </div>
</template>

<script>
import { getStockLogList, getExportLogUrl } from '@/api/tapeStock'

export default {
  name: 'StockLog',
  data() {
    return {
      searchForm: {
        type: '',
        materialCode: '',
        batchNo: ''
      },
      list: [],
      loading: false,
      pagination: { page: 1, size: 20, total: 0 }
    }
  },
  created() {
    this.fetchData()
  }, methods: {
    async fetchData() {
      this.loading = true
      try {
        const params = { page: this.pagination.page, size: this.pagination.size, ...this.searchForm }
        const res = await getStockLogList(params)
        if (res.code === 20000) {
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
      this.searchForm = { type: '', materialCode: '', batchNo: '' }
      this.handleSearch()
    },
    handleSizeChange(size) {
      this.pagination.size = size
      this.fetchData()
    },
    handleCurrentChange(page) {
      this.pagination.page = page
      this.fetchData()
    },
    handleExport() {
      const url = getExportLogUrl(this.searchForm)
      window.open(url, '_blank')
    },
    getTypeTagType(type) {
      const map = { 'IN': 'success', 'OUT': 'danger', 'ADJUST': 'warning' }
      return map[type] || 'info'
    },
    getTypeText(type) {
      const map = { 'IN': '入库', 'OUT': '出库', 'ADJUST': '调整' }
      return map[type] || type
    }
  }
}
</script>

<style lang="scss" scoped>
.log-container {
  padding: 20px;
  .search-card, .toolbar-card { margin-bottom: 15px; }
  .el-pagination { margin-top: 15px; text-align: right; }
  .text-success { color: #67c23a; font-weight: bold; }
  .text-danger { color: #f56c6c; font-weight: bold; }
}
</style>
