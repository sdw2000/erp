<template>
  <div class="app-container">
    <el-card>
      <div slot="header" class="clearfix">
        <span>库存加权价格</span>
      </div>

      <el-form :inline="true" size="small" class="mb12">
        <el-form-item label="重算日期">
          <el-date-picker
            v-model="inventoryRecalcDate"
            type="date"
            value-format="yyyy-MM-dd"
            placeholder="默认今天"
            style="width: 140px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="success" icon="el-icon-refresh" :loading="inventoryRecalcLoading" @click="handleInventoryRecalc">手动重算</el-button>
        </el-form-item>
        <el-form-item>
          <el-button type="warning" icon="el-icon-magic-stick" :loading="inventoryInitLoading" @click="handleInventoryInitSync">初始化同步</el-button>
        </el-form-item>
      </el-form>

      <el-tabs v-model="activePriceTab" type="border-card">
        <el-tab-pane label="库存信息汇总" name="latest">
          <el-form :inline="true" size="small" class="mb12">
            <el-form-item label="关键字">
              <el-input v-model="inventoryLatestQuery.keyword" clearable placeholder="料号/物料名称" style="width:220px" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" icon="el-icon-search" @click="loadInventoryLatest(true)">查询</el-button>
            </el-form-item>
            <el-form-item>
              <el-button icon="el-icon-upload2" @click="triggerLatestImport">导入</el-button>
            </el-form-item>
            <el-form-item>
              <el-button icon="el-icon-download" @click="handleLatestExport">导出</el-button>
            </el-form-item>
            <el-form-item class="total-amount-item">
              <div class="total-amount-box">
                库存总金额：<span class="total-amount-value">{{ formatMoney(inventoryLatestTotalAmount, 2) }}</span>
              </div>
            </el-form-item>
          </el-form>
          <el-table :data="inventoryLatestList" border stripe @sort-change="handleLatestSortChange">
            <el-table-column prop="materialCode" label="料号" min-width="150" sortable="custom" />
            <el-table-column prop="materialName" label="物料名称" min-width="180" sortable="custom" />
            <el-table-column prop="uom" label="单位" width="80" align="center" sortable="custom" />
            <el-table-column prop="stockQty" label="物料数量" width="120" align="right" sortable="custom">
              <template slot-scope="scope">{{ formatMoney(scope.row.stockQty, 4) }}</template>
            </el-table-column>
            <el-table-column prop="avgUnitPrice" label="单价" width="120" align="right" sortable="custom">
              <template slot-scope="scope">{{ formatMoney(scope.row.avgUnitPrice, 6) }}</template>
            </el-table-column>
            <el-table-column prop="stockAmount" label="库存总金额" width="140" align="right" sortable="custom">
              <template slot-scope="scope">{{ formatMoney(scope.row.stockAmount, 2) }}</template>
            </el-table-column>
            <el-table-column prop="version" label="版本" width="80" align="center" sortable="custom" />
            <el-table-column prop="lastRecalcTime" label="最近重算时间" min-width="160" sortable="custom" />
          </el-table>
          <input ref="latestImportFile" type="file" accept=".csv,text/csv" style="display:none" @change="handleLatestImportChange">
          <div class="mt12" style="text-align:right">
            <el-pagination
              background
              layout="total, prev, pager, next"
              :current-page="inventoryLatestQuery.pageNum"
              :page-size="inventoryLatestQuery.pageSize"
              :total="inventoryLatestTotal"
              @current-change="handleInventoryLatestPageChange"
            />
          </div>
        </el-tab-pane>

        <el-tab-pane label="价格变动表" name="change">
          <el-form :inline="true" size="small" class="mb12">
            <el-form-item label="业务日期">
              <el-date-picker
                v-model="inventoryChangeQuery.bizDate"
                type="date"
                value-format="yyyy-MM-dd"
                placeholder="全部"
                style="width: 140px"
              />
            </el-form-item>
            <el-form-item label="关键字">
              <el-input v-model="inventoryChangeQuery.keyword" clearable placeholder="料号/物料名称" style="width:220px" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" icon="el-icon-search" @click="loadInventoryChange(true)">查询</el-button>
            </el-form-item>
            <el-form-item>
              <el-button icon="el-icon-upload2" @click="triggerChangeImport">导入</el-button>
            </el-form-item>
            <el-form-item>
              <el-button icon="el-icon-download" @click="handleChangeExport">导出</el-button>
            </el-form-item>
          </el-form>
          <el-table :data="inventoryChangeList" border stripe @sort-change="handleChangeSortChange">
            <el-table-column prop="bizDate" label="业务日期" width="110" sortable="custom" />
            <el-table-column prop="materialCode" label="物料代码" min-width="130" sortable="custom" />
            <el-table-column prop="materialName" label="物料名称" min-width="160" sortable="custom" />
            <el-table-column prop="oldStockQty" label="旧库存数量" width="110" align="right" sortable="custom"><template slot-scope="scope">{{ formatMoney(scope.row.oldStockQty, 4) }}</template></el-table-column>
            <el-table-column prop="oldUnitPrice" label="旧库存价格" width="110" align="right" sortable="custom"><template slot-scope="scope">{{ formatMoney(scope.row.oldUnitPrice, 6) }}</template></el-table-column>
            <el-table-column prop="inQty" label="来料数量" width="100" align="right" sortable="custom"><template slot-scope="scope">{{ formatMoney(scope.row.inQty, 4) }}</template></el-table-column>
            <el-table-column prop="inAmount" label="来料金额" width="110" align="right" sortable="custom"><template slot-scope="scope">{{ formatMoney(scope.row.inAmount, 2) }}</template></el-table-column>
            <el-table-column prop="newUnitPrice" label="新价格" width="110" align="right" sortable="custom"><template slot-scope="scope">{{ formatMoney(scope.row.newUnitPrice, 6) }}</template></el-table-column>
            <el-table-column prop="newStockQty" label="新库存数量" width="110" align="right" sortable="custom"><template slot-scope="scope">{{ formatMoney(scope.row.newStockQty, 4) }}</template></el-table-column>
            <el-table-column prop="newStockAmount" label="新库存金额" width="120" align="right" sortable="custom"><template slot-scope="scope">{{ formatMoney(scope.row.newStockAmount, 2) }}</template></el-table-column>
            <el-table-column prop="recalcTime" label="重算时间" min-width="160" sortable="custom" />
          </el-table>
          <input ref="changeImportFile" type="file" accept=".csv,text/csv" style="display:none" @change="handleChangeImportChange">
          <div class="mt12" style="text-align:right">
            <el-pagination
              background
              layout="total, prev, pager, next"
              :current-page="inventoryChangeQuery.pageNum"
              :page-size="inventoryChangeQuery.pageSize"
              :total="inventoryChangeTotal"
              @current-change="handleInventoryChangePageChange"
            />
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script>
import {
  recalcInventoryPrice,
  initInventoryPriceSync,
  getInventoryPriceLatest,
  getInventoryPriceChange,
  exportInventoryPriceLatest,
  exportInventoryPriceChange,
  importInventoryPriceLatest,
  importInventoryPriceChange
} from '@/api/finance'
import { dateStampInShanghai } from '@/utils/time'

export default {
  name: 'FinanceInventoryPrice',
  data() {
    return {
      activePriceTab: 'latest',
      inventoryRecalcDate: '',
      inventoryRecalcLoading: false,
      inventoryInitLoading: false,
      inventoryLatestQuery: {
        keyword: '',
        sortField: '',
        sortOrder: '',
        pageNum: 1,
        pageSize: 20
      },
      inventoryLatestList: [],
      inventoryLatestTotal: 0,
      inventoryLatestTotalAmount: 0,
      inventoryChangeQuery: {
        bizDate: '',
        keyword: '',
        sortField: '',
        sortOrder: '',
        pageNum: 1,
        pageSize: 20
      },
      inventoryChangeList: [],
      inventoryChangeTotal: 0
    }
  },
  created() {
    this.loadInventoryLatest()
    this.loadInventoryChange()
  },
  methods: {
    formatMoney(v, scale = 2) {
      const n = Number(v || 0)
      return n.toFixed(scale)
    },
    async loadInventoryLatest(resetPage = false) {
      if (resetPage) this.inventoryLatestQuery.pageNum = 1
      const res = await getInventoryPriceLatest({
        keyword: this.inventoryLatestQuery.keyword,
        sortField: this.inventoryLatestQuery.sortField,
        sortOrder: this.inventoryLatestQuery.sortOrder,
        pageNum: this.inventoryLatestQuery.pageNum,
        pageSize: this.inventoryLatestQuery.pageSize
      })
      if (res && (res.code === 200 || res.code === 20000)) {
        const data = res.data || {}
        this.inventoryLatestList = data.records || []
        this.inventoryLatestTotal = Number(data.total || 0)
        this.inventoryLatestTotalAmount = Number(data.totalStockAmount || 0)
      }
    },
    handleInventoryLatestPageChange(page) {
      this.inventoryLatestQuery.pageNum = page
      this.loadInventoryLatest()
    },
    async loadInventoryChange(resetPage = false) {
      if (resetPage) this.inventoryChangeQuery.pageNum = 1
      const res = await getInventoryPriceChange({
        bizDate: this.inventoryChangeQuery.bizDate,
        keyword: this.inventoryChangeQuery.keyword,
        sortField: this.inventoryChangeQuery.sortField,
        sortOrder: this.inventoryChangeQuery.sortOrder,
        pageNum: this.inventoryChangeQuery.pageNum,
        pageSize: this.inventoryChangeQuery.pageSize
      })
      if (res && (res.code === 200 || res.code === 20000)) {
        const data = res.data || {}
        this.inventoryChangeList = data.records || []
        this.inventoryChangeTotal = Number(data.total || 0)
      }
    },
    handleInventoryChangePageChange(page) {
      this.inventoryChangeQuery.pageNum = page
      this.loadInventoryChange()
    },
    handleLatestSortChange({ prop, order }) {
      this.inventoryLatestQuery.sortField = prop || ''
      this.inventoryLatestQuery.sortOrder = order || ''
      this.loadInventoryLatest(true)
    },
    handleChangeSortChange({ prop, order }) {
      this.inventoryChangeQuery.sortField = prop || ''
      this.inventoryChangeQuery.sortOrder = order || ''
      this.loadInventoryChange(true)
    },
    triggerLatestImport() {
      if (this.$refs.latestImportFile) {
        this.$refs.latestImportFile.value = ''
        this.$refs.latestImportFile.click()
      }
    },
    triggerChangeImport() {
      if (this.$refs.changeImportFile) {
        this.$refs.changeImportFile.value = ''
        this.$refs.changeImportFile.click()
      }
    },
    async handleLatestImportChange(event) {
      const file = event && event.target && event.target.files && event.target.files[0]
      if (!file) return
      try {
        const res = await importInventoryPriceLatest(file)
        if (!res || (res.code !== 200 && res.code !== 20000)) {
          return this.$message.error((res && (res.msg || res.message)) || '导入失败')
        }
        const data = res.data || {}
        this.$message.success(`导入完成：成功${data.successCount || 0}，跳过${data.skipCount || 0}`)
        await this.loadInventoryLatest()
      } catch (e) {
        this.$message.error((e && e.message) || '导入失败')
      }
    },
    async handleChangeImportChange(event) {
      const file = event && event.target && event.target.files && event.target.files[0]
      if (!file) return
      try {
        const res = await importInventoryPriceChange(file)
        if (!res || (res.code !== 200 && res.code !== 20000)) {
          return this.$message.error((res && (res.msg || res.message)) || '导入失败')
        }
        const data = res.data || {}
        this.$message.success(`导入完成：成功${data.successCount || 0}，跳过${data.skipCount || 0}`)
        await this.loadInventoryChange()
      } catch (e) {
        this.$message.error((e && e.message) || '导入失败')
      }
    },
    async handleLatestExport() {
      try {
        const blob = await exportInventoryPriceLatest({
          keyword: this.inventoryLatestQuery.keyword,
          sortField: this.inventoryLatestQuery.sortField,
          sortOrder: this.inventoryLatestQuery.sortOrder
        })
        this.downloadCsv(blob, `库存加权价格_最新汇总_${this.formatDateStamp()}.csv`)
      } catch (e) {
        this.$message.error('导出失败')
      }
    },
    async handleChangeExport() {
      try {
        const blob = await exportInventoryPriceChange({
          bizDate: this.inventoryChangeQuery.bizDate,
          keyword: this.inventoryChangeQuery.keyword,
          sortField: this.inventoryChangeQuery.sortField,
          sortOrder: this.inventoryChangeQuery.sortOrder
        })
        this.downloadCsv(blob, `库存加权价格_变动表_${this.formatDateStamp()}.csv`)
      } catch (e) {
        this.$message.error('导出失败')
      }
    },
    downloadCsv(blob, fileName) {
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'text/csv;charset=utf-8;' }))
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    },
    formatDateStamp() {
      return dateStampInShanghai()
    },
    async handleInventoryRecalc() {
      this.inventoryRecalcLoading = true
      try {
        const res = await recalcInventoryPrice({ bizDate: this.inventoryRecalcDate || undefined })
        if (res && (res.code === 200 || res.code === 20000)) {
          this.$message.success('库存加权价重算完成')
          await Promise.all([this.loadInventoryLatest(), this.loadInventoryChange()])
        } else {
          this.$message.error((res && res.msg) || '重算失败')
        }
      } finally {
        this.inventoryRecalcLoading = false
      }
    },
    async handleInventoryInitSync() {
      this.inventoryInitLoading = true
      try {
        const res = await initInventoryPriceSync({ bizDate: this.inventoryRecalcDate || undefined })
        if (res && (res.code === 200 || res.code === 20000)) {
          this.$message.success('初始化同步完成')
          await Promise.all([this.loadInventoryLatest(), this.loadInventoryChange()])
        } else {
          this.$message.error((res && res.msg) || '初始化失败')
        }
      } finally {
        this.inventoryInitLoading = false
      }
    }
  }
}
</script>

<style scoped>
.mb12 { margin-bottom: 12px; }
.mt12 { margin-top: 12px; }
.total-amount-item {
  float: right;
  margin-right: 0;
}
.total-amount-box {
  padding: 6px 12px;
  border-radius: 4px;
  background: #0b3d91;
  color: #ffffff;
  font-weight: 600;
}
.total-amount-value {
  font-size: 16px;
  margin-left: 4px;
}
</style>
