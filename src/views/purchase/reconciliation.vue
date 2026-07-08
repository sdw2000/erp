<template>
  <div class="purchase-reconciliation">
    <el-card>
      <div slot="header" class="page-header">
        <span class="card-title">采购对账单</span>
        <div>
          <el-button size="small" icon="el-icon-refresh" @click="handleReset">重置</el-button>
          <el-button type="primary" size="small" icon="el-icon-search" @click="handleSearch">查询</el-button>
        </div>
      </div>

      <div class="search-area">
        <el-row :gutter="12">
          <el-col :span="10">
            <div class="search-item">
              <span class="search-label">供应商</span>
              <el-select v-model="queryForm.supplierCode" filterable clearable :placeholder="activeTab === 'detail' ? '请选择供应商' : '搜索供应商（可选）'" style="width:100%" @change="handleSearch">
                <el-option v-for="item in suppliers" :key="item.id || item.supplierCode" :label="`${item.shortName || item.supplierName}（${item.supplierCode}）`" :value="item.supplierCode" />
              </el-select>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="search-item">
              <span class="search-label">月份</span>
              <el-date-picker v-model="queryForm.month" type="month" value-format="yyyy-MM" placeholder="选择月份" style="width:100%" @change="handleSearch" />
            </div>
          </el-col>
        </el-row>
      </div>

      <el-tabs v-model="activeTab" @tab-click="handleTabChange">
        <el-tab-pane label="对账明细" name="detail">
          <div v-if="statementLoaded" class="summary-grid">
            <div class="summary-card primary-card">
              <div class="summary-label">本月结算净额</div>
              <div class="summary-value">¥ {{ formatNumber(statement.summary.totalAmount) }}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">入库总计</div>
              <div class="summary-value">¥ {{ formatNumber(statement.summary.receiptAmount) }}</div>
            </div>
            <div class="summary-card danger-card">
              <div class="summary-label">退货影响</div>
              <div class="summary-value" style="color: #F56C6C">¥ {{ formatNumber(statement.summary.returnAmount) }}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">状态</div>
              <div class="summary-value">
                 <el-tag :type="statement.status === 'CONFIRMED' ? 'success' : 'info'">
                   {{ statement.status === 'CONFIRMED' ? '已确认' : '未确认' }}
                 </el-tag>
              </div>
            </div>
          </div>

          <div class="section-block">
            <div class="section-head">
              <div class="section-title">当月交易流水 (入库/退货)</div>
              <div class="section-head-actions">
                <span v-if="statementLoaded" class="header-summary">
                  当月对账总金额: <b style="color: #409EFF; font-size: 16px;">¥ {{ formatNumber(statement.summary.totalAmount) }}</b>
                </span>
                <el-button type="success" size="small" icon="el-icon-check" :disabled="!statementLoaded || statement.status === 'CONFIRMED'" @click="confirmStatement">
                  确认对账
                </el-button>
              </div>
            </div>
            <el-table
              :data="statement.detailRows"
              border
              stripe
              style="width:100%"
              :row-class-name="tableRowClassName"
              @sort-change="handleDetailSortChange"
            >
              <el-table-column label="日期" width="110" prop="bizDate" sortable="custom">
                <template slot-scope="scope">{{ scope.row.bizDate }}</template>
              </el-table-column>
              <el-table-column label="业务类型" width="100">
                <template slot-scope="scope">
                  <el-tag :type="scope.row.bizType === 'return' ? 'danger' : 'success'" size="mini">
                    {{ scope.row.bizType === 'return' ? '采购退货' : '采购入库' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="单号" min-width="150" show-overflow-tooltip>
                 <template slot-scope="scope">
                   {{ scope.row.documentNo }}
                 </template>
              </el-table-column>
              <el-table-column prop="orderNo" label="采购订单" min-width="150" show-overflow-tooltip />
              <el-table-column prop="materialName" label="产品名称" min-width="180" show-overflow-tooltip />
              <el-table-column prop="spec" label="规格" min-width="150" show-overflow-tooltip />
              <el-table-column label="数量" width="100" align="right">
                <template slot-scope="scope">{{ scope.row.quantity }} {{ scope.row.unit }}</template>
              </el-table-column>
              <el-table-column label="单价" width="100" align="right">
                <template slot-scope="scope">{{ formatNumber(scope.row.unit_price) }}</template>
              </el-table-column>
              <el-table-column label="总金额" width="120" align="right" prop="amount" sortable="custom">
                <template slot-scope="scope">
                  <span :style="{ color: scope.row.bizType === 'return' ? '#F56C6C' : '' }">
                    {{ formatNumber(scope.row.amount) }}
                  </span>
                </template>
              </el-table-column>
              <el-table-column label="对账月份" width="160" align="center">
                <template slot-scope="scope">
                  <el-select
                    v-if="scope.row.bizType === 'receipt'"
                    v-model="scope.row.reconcileTargetMonth"
                    size="mini"
                    style="width: 140px"
                    @change="handleRowMonthChange(scope.row)"
                  >
                    <el-option :value="getPreviousMonth(queryForm.month)" :label="`${getPreviousMonth(queryForm.month)}(上月)`" />
                    <el-option :value="queryForm.month" :label="`${queryForm.month}(当月)`" />
                    <el-option :value="getNextMonth(queryForm.month)" :label="`${getNextMonth(queryForm.month)}(下月)`" />
                  </el-select>
                  <span v-else>{{ scope.row.reconcileTargetMonth || queryForm.month }}</span>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="120" align="center">
                <template slot-scope="scope">
                  <div v-if="scope.row.bizType === 'receipt'">
                    <el-button type="text" size="mini" @click="openSplitDialog(scope.row)">拆分</el-button>
                    <el-button v-if="scope.row._splitPairId" type="text" size="mini" @click="restoreSplitRow(scope.row)">还原</el-button>
                  </div>
                </template>
              </el-table-column>
            </el-table>
            <div class="pagination-container" style="margin-top: 20px; text-align: right;">
              <el-pagination
                :current-page="detailPagination.current"
                :page-sizes="pageSizes"
                :page-size="detailPagination.size"
                layout="total, sizes, prev, pager, next, jumper"
                :total="detailPagination.total"
                @size-change="handleDetailSizeChange"
                @current-change="handleDetailCurrentChange"
              />
            </div>
          </div>

          <!-- 历史计账部分 -->
          <div class="section-block">
            <div class="section-head">
              <div class="section-title">历史欠账 / 开票台账</div>
              <el-button type="primary" plain size="small" icon="el-icon-plus" :disabled="!queryForm.supplierCode" @click="addHistoryRow">新增历史记录</el-button>
            </div>
            <el-table :data="statement.historyRows" border stripe style="width:100%">
              <el-table-column label="对账月份" width="120">
                <template slot-scope="scope">
                  <el-date-picker v-model="scope.row.statementMonth" :disabled="!scope.row._editing" type="month" value-format="yyyy-MM" size="mini" style="width:100%" />
                </template>
              </el-table-column>
              <el-table-column label="欠账金额" width="140" align="right">
                <template slot-scope="scope">
                  <el-input-number v-model="scope.row.unpaidAmount" :disabled="!scope.row._editing" :precision="2" :controls="false" size="mini" style="width:100%" />
                </template>
              </el-table-column>
              <el-table-column label="开票金额" width="140" align="right">
                <template slot-scope="scope">
                  <el-input-number v-model="scope.row.invoiceAmount" :disabled="!scope.row._editing" :precision="2" :controls="false" size="mini" style="width:100%" />
                </template>
              </el-table-column>
              <el-table-column label="备注" min-width="180">
                <template slot-scope="scope">
                  <el-input v-model="scope.row.remark" :disabled="!scope.row._editing" size="mini" />
                </template>
              </el-table-column>
              <el-table-column label="操作" width="150" align="center">
                <template slot-scope="scope">
                  <el-button v-if="scope.row._editing" type="text" size="mini" @click="saveHistoryRow(scope.row)">保存</el-button>
                  <el-button v-else type="text" size="mini" @click="editHistoryRow(scope.row)">修改</el-button>
                  <el-button type="text" size="mini" style="color:red" @click="deleteHistoryRow(scope.row)">删除</el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-tab-pane>

        <!-- 总览 Tab ... -->
        <el-tab-pane label="供应商对账总览" name="overview">
          <el-table
            :data="overviewRows"
            border
            stripe
            v-loading="overviewLoading"
            @sort-change="handleOverviewSortChange"
            :default-sort="{prop: 'totalAmount', order: 'descending'}"
          >
            <el-table-column type="index" label="序号" width="60" align="center" />
            <el-table-column prop="supplierCode" label="编码" width="100" sortable="custom" />
            <el-table-column prop="supplierName" label="供应商名称" min-width="180" show-overflow-tooltip />
            <el-table-column prop="month" label="对账月份" width="100" align="center" />
            <el-table-column label="入库总计" width="130" align="right" prop="receiptAmount" sortable="custom">
              <template slot-scope="scope">{{ formatNumber(scope.row.receiptAmount) }}</template>
            </el-table-column>
            <el-table-column label="退货影响" width="130" align="right" prop="returnAmount" sortable="custom">
              <template slot-scope="scope">
                <span :style="{ color: scope.row.returnAmount < 0 ? '#F56C6C' : '' }">
                  {{ formatNumber(scope.row.returnAmount) }}
                </span>
              </template>
            </el-table-column>
            <el-table-column label="应结净额" width="130" align="right" prop="totalAmount" sortable="custom">
              <template slot-scope="scope">
                <b style="color: #409EFF">{{ formatNumber(scope.row.totalAmount) }}</b>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="100" align="center" prop="status" sortable="custom">
              <template slot-scope="scope">
                <el-tag :type="scope.row.status === 'CONFIRMED' ? 'success' : 'info'" size="mini">
                  {{ scope.row.status === 'CONFIRMED' ? '已确认' : '未确认' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100" align="center" fixed="right">
              <template slot-scope="scope">
                <el-button type="text" size="mini" @click="goToDetail(scope.row)">详情对账</el-button>
              </template>
            </el-table-column>
          </el-table>
            <div class="pagination-container" style="margin-top: 20px; text-align: right;">
            <el-pagination
              :current-page="overviewPagination.current"
              :page-sizes="pageSizes"
              :page-size="overviewPagination.size"
              layout="total, sizes, prev, pager, next, jumper"
              :total="overviewPagination.total"
              @size-change="handleOverviewSizeChange"
              @current-change="handleOverviewCurrentChange"
            />
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 拆分对话框 -->
    <el-dialog title="拆分对账行" :visible.sync="splitDialogVisible" width="400px">
      <el-form :model="splitForm" label-width="100px">
        <el-form-item label="原始数量">
          {{ splitSourceRow ? `${splitSourceRow.quantity} ${splitSourceRow.unit}` : '' }}
        </el-form-item>
        <el-form-item label="拆分出数量">
          <el-input-number v-model="splitForm.splitQuantity" :min="0" :max="999999" :precision="2" style="width: 100%" />
        </el-form-item>
        <el-form-item label="拆分到月份">
          <el-date-picker v-model="splitForm.targetMonth" type="month" value-format="yyyy-MM" placeholder="选择月份" style="width: 100%" />
        </el-form-item>
      </el-form>
      <div slot="footer">
        <el-button size="small" @click="splitDialogVisible = false">取消</el-button>
        <el-button type="primary" size="small" @click="submitSplitRow">确定</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { listSuppliers } from '@/api/purchaseSupplier'
import {
  getPurchaseStatement,
  getPurchaseStatementOverview,
  savePurchaseReconciliationHistory,
  deletePurchaseReconciliationHistory,
  confirmPurchaseStatementDetails
} from '@/api/purchaseReconciliation'
import uiConfig from '@/config/ui'

export default {
  name: 'PurchaseReconciliation',
  data() {
    return {
      activeTab: 'overview',
      queryForm: {
        supplierCode: '',
        month: new Date().toISOString().slice(0, 7)
      },
      overviewPagination: { current: 1, size: uiConfig.defaultPageSize, total: 0, sortProp: 'totalAmount', sortOrder: 'desc' },
      detailPagination: { current: 1, size: uiConfig.pageSizes && uiConfig.pageSizes.length && uiConfig.pageSizes[0] ? (uiConfig.pageSizes[0] < 50 ? 50 : uiConfig.pageSizes[0]) : 50, total: 0, sortProp: 'bizDate', sortOrder: 'asc' },
      pageSizes: uiConfig.pageSizes,
      suppliers: [],
      overviewRows: [],
      overviewLoading: false,
      statement: {
        detailRows: [],
        allDetailRows: [], // 存储全量用于前端拆分处理
        historyRows: [],
        summary: { totalAmount: 0, receiptAmount: 0, returnAmount: 0 },
        status: 'PENDING'
      },
      statementLoaded: false,
      // 拆分相关
      splitDialogVisible: false,
      splitSourceRow: null,
      splitForm: { splitQuantity: 0, targetMonth: '' }
    }
  },
  created() {
    this.loadSuppliers()
    this.handleSearch()
  },
  methods: {
    async loadSuppliers() {
      const res = await listSuppliers({ size: 1000 })
      this.suppliers = (res.data && res.data.records) ? res.data.records : (res.data || [])
    },
    async handleSearch() {
      if (this.activeTab === 'detail') {
        if (!this.queryForm.supplierCode) return this.$message.warning('请选择供应商')
        const params = {
          ...this.queryForm,
          current: this.detailPagination.current,
          size: this.detailPagination.size,
          sortProp: this.detailPagination.sortProp,
          sortOrder: this.detailPagination.sortOrder
        }
        const res = await getPurchaseStatement(params)
        this.statement = res.data
        this.statement.allDetailRows = JSON.parse(JSON.stringify(res.data.detailRows))
        this.detailPagination.total = res.data.total || 0
        this.statementLoaded = true
      } else {
        this.overviewLoading = true
        const params = { ...this.queryForm, ...this.overviewPagination }
        const res = await getPurchaseStatementOverview(params)
        this.overviewRows = res.data.records
        this.overviewPagination.total = res.data.total
        this.overviewLoading = false
      }
    },
    handleTabChange() { this.handleSearch() },
    handleReset() {
      this.queryForm = { supplierCode: '', month: new Date().toISOString().slice(0, 7) }
      this.handleSearch()
    },
    goToDetail(row) {
      this.queryForm.supplierCode = row.supplierCode
      this.queryForm.month = row.month
      this.activeTab = 'detail'
      this.handleSearch()
    },
    async confirmStatement() {
      const details = []
      // 收集所有修改过的或是拆分的明细
      // 在后端分页模式下，如果用户做了跨页操作会比较麻烦，但通常对账是按页进行的
      // 这里简化逻辑：提交当前展示的所有行
      this.statement.detailRows.forEach(row => {
        if (row.bizType !== 'receipt') return
        details.push({
          receiptItemId: row.detailId,
          targetMonth: row.reconcileTargetMonth,
          splitQuantity: row.quantity,
          splitAmount: row.amount
        })
      })
      
      const payload = {
        supplierCode: this.queryForm.supplierCode,
        month: this.queryForm.month,
        details: details
      }
      const res = await confirmPurchaseStatementDetails(payload)
      if (res.code === 200 || res.code === 20000) {
        this.$message.success('财务确认成功')
        this.handleSearch()
      } else {
        this.$message.error(res.msg || '确认失败')
      }
    },
    getNextMonth(m) {
      const d = new Date(m + '-01'); d.setMonth(d.getMonth() + 1)
      return d.toISOString().slice(0, 7)
    },
    getPreviousMonth(m) {
      const d = new Date(m + '-01'); d.setMonth(d.getMonth() - 1)
      return d.toISOString().slice(0, 7)
    },
    handleRowMonthChange(row) {
      if (row.reconcileTargetMonth !== this.queryForm.month) {
        this.$message.info(`已标记到 ${row.reconcileTargetMonth}，确认对账后将从本月移除`)
      }
    },
    openSplitDialog(row) {
      this.splitSourceRow = row
      this.splitForm = {
        splitQuantity: Math.round((Number(row.quantity) || 0) / 2 * 100) / 100,
        targetMonth: this.getNextMonth(this.queryForm.month)
      }
      this.splitDialogVisible = true
    },
    submitSplitRow() {
      const row = this.splitSourceRow
      const totalQty = Number(row.quantity) || 0
      const splitQty = Number(this.splitForm.splitQuantity) || 0
      if (splitQty <= 0 || splitQty >= totalQty) return this.$message.warning('拆分数量无效')
      
      const ratio = splitQty / totalQty
      const splitAmt = Number((Number(row.amount) * ratio).toFixed(2))
      
      const pairId = `split_${Date.now()}`
      row._splitPairId = pairId
      row.quantity = Number((totalQty - splitQty).toFixed(2))
      row.amount = Number((Number(row.amount) - splitAmt).toFixed(2))
      
      const child = JSON.parse(JSON.stringify(row))
      child.quantity = splitQty
      child.amount = splitAmt
      child.reconcileTargetMonth = this.splitForm.targetMonth
      
      const idx = this.statement.detailRows.indexOf(row)
      this.statement.detailRows.splice(idx + 1, 0, child)
      
      this.splitDialogVisible = false
      this.$message.success('拆分完成')
    },
    restoreSplitRow(row) {
      // 简单还原逻辑：重新加载
      this.handleSearch()
    },
    formatNumber(num, precision = 2) {
      if (num === null || num === undefined) return '0.00'
      return Number(num).toLocaleString('zh-CN', { minimumFractionDigits: precision, maximumFractionDigits: precision })
    },
    tableRowClassName({row}) {
      if (row.reconcileTargetMonth && row.reconcileTargetMonth !== this.queryForm.month) return 'month-diff-row'
      return ''
    },
    // 分页处理
    handleDetailSizeChange(val) { this.detailPagination.size = val; this.handleSearch() },
    handleDetailCurrentChange(val) { this.detailPagination.current = val; this.handleSearch() },
    handleDetailSortChange({ prop, order }) {
      this.detailPagination.sortProp = prop
      this.detailPagination.sortOrder = order === 'descending' ? 'desc' : 'asc'
      this.handleSearch()
    },
    handleOverviewSizeChange(val) { this.overviewPagination.size = val; this.handleSearch() },
    handleOverviewCurrentChange(val) { this.overviewPagination.current = val; this.handleSearch() },
    handleOverviewSortChange({ prop, order }) {
      this.overviewPagination.sortProp = prop
      this.overviewPagination.sortOrder = order === 'descending' ? 'desc' : 'asc'
      this.handleSearch()
    },
    // 历史台账
    addHistoryRow() {
      this.statement.historyRows.unshift({
        supplierCode: this.queryForm.supplierCode,
        statementMonth: this.queryForm.month,
        unpaidAmount: 0,
        invoiceAmount: 0,
        remark: '',
        _editing: true
      })
    },
    editHistoryRow(row) { this.$set(row, '_editing', true) },
    async saveHistoryRow(row) {
      const res = await savePurchaseReconciliationHistory(row)
      if (res.code === 200 || res.code === 20000) {
        this.$message.success('保存成功')
        row._editing = false
        this.handleSearch()
      }
    },
    async deleteHistoryRow(row) {
      await this.$confirm('确认删除吗？')
      const res = await deletePurchaseReconciliationHistory(row.id)
      if (res.code === 200 || res.code === 20000) {
        this.$message.success('删除成功')
        this.handleSearch()
      }
    }
  }
}
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: center; }
.search-area { margin-bottom: 20px; }
.search-item { display: flex; align-items: center; }
.search-label { width: 80px; font-size: 14px; color: #606266; }
.summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 20px; }
.summary-card { background: #f8f9fb; padding: 16px; border-radius: 4px; border: 1px solid #ebeef5; }
.summary-label { font-size: 13px; color: #909399; margin-bottom: 8px; }
.summary-value { font-size: 18px; font-weight: bold; color: #303133; }
.primary-card { border-left: 4px solid #409EFF; }
.danger-card { border-left: 4px solid #F56C6C; }
.section-block { margin-top: 24px; }
.section-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.section-title { font-size: 15px; font-weight: bold; color: #303133; border-left: 3px solid #409EFF; padding-left: 10px; }
.header-summary { margin-right: 20px; font-size: 14px; color: #606266; }
.month-diff-row { opacity: 0.6; background-color: #fafafa !important; }
</style>
