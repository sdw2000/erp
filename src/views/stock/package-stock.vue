<template>
  <div class="package-stock-container">
    <el-card>
      <div slot="header" class="clearfix">
        <span style="font-size: 18px; font-weight: bold">
          <i class="el-icon-box" /> 包材仓库存管理
        </span>
        <div style="float: right">
          <el-button size="small" @click="goHub">返回原材料总仓</el-button>
        </div>
      </div>

      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="料号/名称">
          <el-input v-model.trim="searchForm.materialCode" placeholder="请输入料号或名称" clearable style="width:220px" @keyup.enter.native="handleSearch" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="el-icon-search" @click="handleSearch">搜 索</el-button>
          <el-button icon="el-icon-refresh-left" @click="handleReset">重 置</el-button>
        </el-form-item>
      </el-form>

      <el-row :gutter="20" style="margin-bottom: 20px">
        <el-col :span="6"><el-card shadow="hover" class="stat-card"><div class="stat-label">总品种</div><div class="stat-value">{{ statistics.totalTypes }}</div></el-card></el-col>
        <el-col :span="6"><el-card shadow="hover" class="stat-card"><div class="stat-label">总数量</div><div class="stat-value">{{ statistics.totalQuantity }}</div></el-card></el-col>
        <el-col :span="6"><el-card shadow="hover" class="stat-card"><div class="stat-label">可用数量</div><div class="stat-value" style="color:#67c23a">{{ statistics.availableQuantity }}</div></el-card></el-col>
        <el-col :span="6"><el-card shadow="hover" class="stat-card"><div class="stat-label">锁定数量</div><div class="stat-value" style="color:#e6a23c">{{ statistics.lockedQuantity }}</div></el-card></el-col>
      </el-row>

      <el-table v-loading="loading" :data="stockList" border stripe @sort-change="handleTableSortChange">
        <el-table-column type="index" label="序号" width="60" align="center" :index="indexMethod" />
        <el-table-column prop="materialCode" label="物料编号" min-width="140" sortable="custom" />
        <el-table-column prop="materialName" label="物料名称" min-width="180" sortable="custom" show-overflow-tooltip />
        <el-table-column prop="specDesc" label="规格" min-width="160" show-overflow-tooltip />
        <el-table-column prop="unit" label="单位" width="90" align="center" />
        <el-table-column prop="totalQuantity" label="总数量" width="100" align="center" sortable="custom" />
        <el-table-column prop="availableQuantity" label="可用" width="100" align="center" sortable="custom">
          <template slot-scope="scope"><span style="color:#67c23a;font-weight:bold">{{ scope.row.availableQuantity || 0 }}</span></template>
        </el-table-column>
        <el-table-column prop="lockedQuantity" label="锁定" width="100" align="center" sortable="custom">
          <template slot-scope="scope"><span style="color:#e6a23c">{{ scope.row.lockedQuantity || 0 }}</span></template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100" align="center" sortable="custom">
          <template slot-scope="scope">
            <el-tag :type="statusTagType(scope.row.status)" size="small">{{ statusText(scope.row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" align="center" fixed="right">
          <template slot-scope="scope">
            <el-button type="text" @click="openDetails(scope.row)">查看明细</el-button>
            <el-button type="text" @click="openFlow(scope.row)">查看流水</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        :current-page="pagination.current"
        :page-sizes="[20, 50, 100]"
        :page-size="pagination.size"
        :total="pagination.total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </el-card>

    <el-dialog :visible.sync="detailDialogVisible" :title="`${currentStock.materialName || '-'} - 明细`" width="88%">
      <el-table v-loading="detailLoading" :data="detailList" border stripe max-height="520">
        <el-table-column type="index" label="序号" width="60" align="center" />
        <el-table-column prop="batchNo" label="批次号" width="150" />
        <el-table-column prop="containerNo" label="箱号/管号" width="160" />
        <el-table-column prop="packUom" label="包装单位" width="100" align="center" />
        <el-table-column prop="packCount" label="包装数" width="100" align="center" />
        <el-table-column prop="quantity" label="数量" width="120" align="right" />
        <el-table-column prop="location" label="库位" width="120" />
        <el-table-column prop="supplier" label="供应商" min-width="160" show-overflow-tooltip />
        <el-table-column prop="inboundDate" label="入库日期" width="120" />
        <el-table-column prop="status" label="状态" width="100" align="center">
          <template slot-scope="scope">
            <el-tag :type="scope.row.status === 'available' ? 'success' : scope.row.status === 'locked' ? 'warning' : 'info'" size="small">
              {{ scope.row.status === 'available' ? '可用' : scope.row.status === 'locked' ? '锁定' : '已使用' }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination
        style="margin-top:10px;text-align:right"
        :current-page="detailPagination.current"
        :page-size="detailPagination.size"
        :total="detailPagination.total"
        layout="total, prev, pager, next"
        @current-change="handleDetailPageChange"
      />
    </el-dialog>

    <el-dialog :visible.sync="flowDialogVisible" :title="`${currentStock.materialCode || '-'} - 包材仓流水`" width="88%">
      <el-table v-loading="flowLoading" :data="flowList" border stripe max-height="520">
        <el-table-column type="index" label="序号" width="60" align="center" />
        <el-table-column prop="createTime" label="时间" width="170" />
        <el-table-column prop="type" label="类型" width="80" align="center" />
        <el-table-column prop="materialCode" label="料号" width="130" />
        <el-table-column prop="productName" label="名称" min-width="160" show-overflow-tooltip />
        <el-table-column prop="batchNo" label="批次" width="140" />
        <el-table-column prop="changeQuantity" label="变动数量" width="120" align="right" />
        <el-table-column prop="unit" label="单位" width="90" align="center" />
        <el-table-column prop="refNo" label="关联单号" width="140" />
        <el-table-column prop="remark" label="备注" min-width="180" show-overflow-tooltip />
      </el-table>
      <el-pagination
        style="margin-top:10px;text-align:right"
        :current-page="flowPagination.current"
        :page-size="flowPagination.size"
        :total="flowPagination.total"
        layout="total, prev, pager, next"
        @current-change="handleFlowPageChange"
      />
      <div slot="footer" class="dialog-footer">
        <el-button type="primary" @click="flowDialogVisible = false">关闭</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { getPackageStockPage, getPackageStockStatistics, getPackageStockDetailsPage } from '@/api/rawMaterialStock'
import { getUnifiedStockFlowPage } from '@/api/stockFlow'

export default {
  name: 'PackageStock',
  data() {
    return {
      loading: false,
      stockList: [],
      searchForm: { materialCode: '' },
      pagination: { current: 1, size: 20, total: 0 },
      sortField: '',
      sortOrder: '',
      statistics: { totalTypes: 0, totalQuantity: 0, availableQuantity: 0, lockedQuantity: 0 },

      currentStock: {},
      detailDialogVisible: false,
      detailLoading: false,
      detailList: [],
      detailPagination: { current: 1, size: 20, total: 0 },

      flowDialogVisible: false,
      flowLoading: false,
      flowList: [],
      flowPagination: { current: 1, size: 20, total: 0 }
    }
  },
  created() {
    this.fetchList()
    this.fetchStatistics()
  },
  methods: {
    async fetchList() {
      this.loading = true
      try {
        const res = await getPackageStockPage({
          current: this.pagination.current,
          size: this.pagination.size,
          materialCode: this.searchForm.materialCode,
          sortField: this.sortField,
          sortOrder: this.sortOrder
        })
        if (res && (res.code === 200 || res.code === 20000)) {
          const page = res.data || {}
          this.stockList = page.records || []
          this.pagination.total = Number(page.total || 0)
        } else {
          this.$message.error((res && res.msg) || '加载失败')
        }
      } finally {
        this.loading = false
      }
    },
    async fetchStatistics() {
      const res = await getPackageStockStatistics({ materialCode: this.searchForm.materialCode })
      if (res && (res.code === 200 || res.code === 20000)) {
        this.statistics = res.data || this.statistics
      }
    },
    handleSearch() {
      this.pagination.current = 1
      this.fetchList()
      this.fetchStatistics()
    },
    handleReset() {
      this.searchForm.materialCode = ''
      this.sortField = ''
      this.sortOrder = ''
      this.pagination.current = 1
      this.fetchList()
      this.fetchStatistics()
    },
    handleSizeChange(size) {
      this.pagination.size = Number(size || 20)
      this.pagination.current = 1
      this.fetchList()
    },
    handleCurrentChange(current) {
      this.pagination.current = Number(current || 1)
      this.fetchList()
    },
    handleTableSortChange({ prop, order }) {
      this.sortField = prop || ''
      this.sortOrder = order || ''
      this.fetchList()
    },
    indexMethod(index) {
      return (this.pagination.current - 1) * this.pagination.size + index + 1
    },
    statusText(status) {
      const map = { active: '正常', low_stock: '库存不足', out_of_stock: '缺货' }
      return map[status] || status || '-'
    },
    statusTagType(status) {
      const map = { active: 'success', low_stock: 'warning', out_of_stock: 'danger' }
      return map[status] || 'info'
    },
    goHub() {
      this.$router.push({ path: '/stock/raw-material-hub' })
    },

    openDetails(row) {
      this.currentStock = row || {}
      this.detailPagination.current = 1
      this.detailDialogVisible = true
      this.fetchDetailPage()
    },
    async fetchDetailPage() {
      this.detailLoading = true
      try {
        const res = await getPackageStockDetailsPage(this.currentStock.id, {
          current: this.detailPagination.current,
          size: this.detailPagination.size
        })
        if (res && (res.code === 200 || res.code === 20000)) {
          const page = res.data || {}
          this.detailList = page.records || []
          this.detailPagination.total = Number(page.total || 0)
        }
      } finally {
        this.detailLoading = false
      }
    },
    handleDetailPageChange(page) {
      this.detailPagination.current = Number(page || 1)
      this.fetchDetailPage()
    },

    openFlow(row) {
      this.currentStock = row || {}
      this.flowPagination.current = 1
      this.flowDialogVisible = true
      this.fetchFlowPage()
    },
    async fetchFlowPage() {
      this.flowLoading = true
      try {
        const res = await getUnifiedStockFlowPage({
          current: this.flowPagination.current,
          size: this.flowPagination.size,
          stockType: 'PACKAGE',
          materialCode: this.currentStock.materialCode,
          sortField: 'createTime',
          sortOrder: 'descending'
        })
        if (res && (res.code === 200 || res.code === 20000)) {
          const data = res.data || {}
          this.flowList = data.records || []
          this.flowPagination.total = Number(data.total || 0)
        }
      } finally {
        this.flowLoading = false
      }
    },
    handleFlowPageChange(page) {
      this.flowPagination.current = Number(page || 1)
      this.fetchFlowPage()
    }
  }
}
</script>

<style lang="scss" scoped>
.package-stock-container {
  .stat-card {
    .stat-label { color: #909399; font-size: 13px; margin-bottom: 6px; }
    .stat-value { font-size: 22px; font-weight: 600; color: #303133; }
  }
}
</style>
