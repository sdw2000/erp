<template>
  <div class="raw-material-hub-container">
    <el-card>
      <div slot="header" class="clearfix">
        <span style="font-size: 18px; font-weight: bold">
          <i class="el-icon-box" /> 原材料总仓
        </span>
        <div style="float: right">
          <el-button size="small" @click="goLegacy('film')">薄膜旧页面</el-button>
          <el-button size="small" @click="goLegacy('chemical')">化工旧页面</el-button>
          <el-button size="small" @click="goLegacy('chemical-requisition')">化工请购</el-button>
        </div>
      </div>

      <el-alert
        title="当前为聚合查询入口，不改动原有业务流程；明细处理仍可进入旧页面。"
        type="info"
        :closable="false"
        style="margin-bottom: 16px"
      />

      <el-row :gutter="16" style="margin-bottom: 10px">
        <el-col :span="6">
          <el-card shadow="never" class="stat-card">
            <div class="stat-label">总物料数</div>
            <div class="stat-value">{{ summary.totalCount }}</div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="never" class="stat-card">
            <div class="stat-label">薄膜品种</div>
            <div class="stat-value">{{ summary.filmCount }}</div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="never" class="stat-card">
            <div class="stat-label">化工品种</div>
            <div class="stat-value">{{ summary.chemicalCount }}</div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="never" class="stat-card">
            <div class="stat-label">包材/未分类</div>
            <div class="stat-value">{{ summary.packagingCount }}/{{ summary.unknownCount }}</div>
          </el-card>
        </el-col>
      </el-row>

      <el-alert
        v-if="showPackagingPlaceholder"
        title="包材库存接口暂未独立接入，当前为分类占位。可先通过料号规则识别并在此筛选查看。"
        type="warning"
        :closable="false"
        style="margin-bottom: 12px"
      />

      <el-form :inline="true" :model="filterForm" class="search-form">
        <el-form-item label="物料代码/名称">
          <el-input v-model="filterForm.keyword" placeholder="支持模糊查询" clearable style="width: 260px" />
        </el-form-item>
        <el-form-item label="分类">
          <el-select v-model="filterForm.category" placeholder="全部" clearable style="width: 140px">
            <el-option label="薄膜" value="薄膜" />
            <el-option label="化工" value="化工" />
            <el-option label="包材" value="包材" />
            <el-option label="未分类" value="未分类" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="el-icon-search" @click="handleSearch">搜索</el-button>
          <el-button icon="el-icon-refresh-left" @click="handleReset">重置</el-button>
          <el-button :loading="loading" icon="el-icon-refresh" @click="fetchData">刷新数据</el-button>
        </el-form-item>
      </el-form>

      <el-table
        ref="rawMaterialHubTable"
        v-loading="loading"
        :data="tableData"
        border
        stripe
        style="width: 100%; margin-top: 8px"
      >
        <el-table-column type="index" label="序号" width="60" align="center" />
        <el-table-column prop="category" label="分类" width="90" align="center">
          <template slot-scope="scope">
            <el-tag :type="categoryTagType(scope.row.category)" size="small">
              {{ scope.row.category }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="materialCode" label="物料编号" min-width="160" />
        <el-table-column prop="materialName" label="物料名称" min-width="180" show-overflow-tooltip />
        <el-table-column prop="specOrType" label="规格/类型" min-width="130" />
        <el-table-column prop="total" label="总量" width="120" align="right">
          <template slot-scope="scope">{{ formatNumber(scope.row.total) }}</template>
        </el-table-column>
        <el-table-column prop="available" label="可用" width="120" align="right">
          <template slot-scope="scope">
            <span :style="{ color: Number(scope.row.available || 0) > 0 ? '#67c23a' : '#f56c6c' }">
              {{ formatNumber(scope.row.available) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="locked" label="锁定" width="120" align="right">
          <template slot-scope="scope">{{ formatNumber(scope.row.locked) }}</template>
        </el-table-column>
        <el-table-column prop="unit" label="单位" width="80" align="center" />
        <el-table-column prop="status" label="状态" width="120" align="center">
          <template slot-scope="scope">
            <el-tag :type="statusTagType(scope.row.status)" size="small">{{ statusText(scope.row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="140" align="center" fixed="right">
          <template slot-scope="scope">
            <el-button type="text" @click="goLegacy(scope.row.sourceType)">进入原页面</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script>
import { getRawMaterialHubList } from '@/api/rawMaterialHub'
import elTableAutoLayout from '@/mixins/elTableAutoLayout'

export default {
  name: 'RawMaterialHub',
  mixins: [elTableAutoLayout],
  tableLayoutRefs: ['rawMaterialHubTable'],
  data() {
    return {
      loading: false,
      allRows: [],
      tableData: [],
      summary: {
        totalCount: 0,
        filmCount: 0,
        chemicalCount: 0,
        packagingCount: 0,
        unknownCount: 0
      },
      filterForm: {
        keyword: '',
        category: ''
      }
    }
  },
  created() {
    this.fetchData()
  },
  computed: {
    showPackagingPlaceholder() {
      return this.filterForm.category === '包材' && this.tableData.length === 0
    }
  },
  methods: {
    async fetchData() {
      this.loading = true
      try {
        const res = await getRawMaterialHubList()
        const ok = res && (res.code === 200 || res.code === 20000)
        if (!ok) {
          this.$message.error((res && res.msg) || '加载失败')
          return
        }
        const data = res.data || {}
        this.allRows = data.records || []
        this.summary = {
          totalCount: Number(((data.summary || {}).totalCount) || 0),
          filmCount: Number(((data.summary || {}).filmCount) || 0),
          chemicalCount: Number(((data.summary || {}).chemicalCount) || 0),
          packagingCount: Number(((data.summary || {}).packagingCount) || 0),
          unknownCount: Number(((data.summary || {}).unknownCount) || 0)
        }
        this.applyFilter()
      } catch (error) {
        this.$message.error('加载原材料总仓失败')
      } finally {
        this.loading = false
        this.scheduleTableLayout()
      }
    },
    handleSearch() {
      this.applyFilter()
    },
    handleReset() {
      this.filterForm = {
        keyword: '',
        category: ''
      }
      this.applyFilter()
    },
    applyFilter() {
      const keyword = String(this.filterForm.keyword || '').trim().toLowerCase()
      const category = this.filterForm.category
      this.tableData = this.allRows.filter(row => {
        if (category && row.category !== category) {
          return false
        }
        if (!keyword) {
          return true
        }
        const code = String(row.materialCode || '').toLowerCase()
        const name = String(row.materialName || '').toLowerCase()
        return code.includes(keyword) || name.includes(keyword)
      })
    },
    goLegacy(type) {
      if (type === 'film') {
        this.$router.push({ path: '/stock/film-stock' })
        return
      }
      if (type === 'chemical') {
        this.$router.push({ path: '/stock/chemical-stock' })
        return
      }
      if (type === 'chemical-requisition') {
        this.$router.push({ path: '/stock/chemical-requisition' })
        return
      }
      this.$message.info('该分类暂无独立旧页面')
    },
    formatNumber(value) {
      const num = Number(value || 0)
      return Number.isNaN(num) ? '0' : num.toFixed(2)
    },
    statusText(status) {
      const map = {
        active: '正常',
        low_stock: '库存不足',
        out_of_stock: '缺货'
      }
      return map[status] || status || '-'
    },
    statusTagType(status) {
      const map = {
        active: 'success',
        low_stock: 'warning',
        out_of_stock: 'danger'
      }
      return map[status] || 'info'
    },
    categoryTagType(category) {
      const map = {
        '薄膜': 'success',
        '化工': 'warning',
        '包材': 'primary',
        '未分类': 'info'
      }
      return map[category] || 'info'
    }
  }
}
</script>

<style lang="scss" scoped>
.raw-material-hub-container {
  .stat-card {
    .stat-label {
      color: #909399;
      font-size: 13px;
      margin-bottom: 6px;
    }

    .stat-value {
      font-size: 22px;
      font-weight: 600;
      color: #303133;
    }
  }
}
</style>
