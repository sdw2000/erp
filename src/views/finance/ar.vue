<template>
  <div class="app-container">
    <el-card>
      <div slot="header" class="clearfix">
        <span>应收管理（AR）</span>
      </div>

      <el-tabs v-model="activeTab" type="border-card" @tab-click="handleTabChange">
        <el-tab-pane label="收款页面" name="receipts">
          <el-form :inline="true" size="small" class="mb12">
            <el-form-item label="关键词">
              <el-input v-model.trim="receiptQuery.keyword" clearable placeholder="客户编码/客户名称" style="width: 220px" @keyup.enter.native="loadReceipts(true)" />
            </el-form-item>
            <el-form-item label="收款日期">
              <el-date-picker
                v-model="receiptQuery.dateRange"
                type="daterange"
                value-format="yyyy-MM-dd"
                start-placeholder="开始日期"
                end-placeholder="结束日期"
                style="width: 260px"
              />
            </el-form-item>
            <el-form-item>
              <el-checkbox v-model="receiptQuery.onlyFull">仅看已扣账完成</el-checkbox>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" icon="el-icon-search" @click="loadReceipts(true)">查询</el-button>
              <el-button icon="el-icon-refresh" @click="resetReceiptQuery">重置</el-button>
              <el-button type="success" icon="el-icon-plus" @click="openReceiptDialog">新增收款</el-button>
            </el-form-item>
          </el-form>

          <el-table :data="receiptList" stripe border>
            <el-table-column prop="id" label="ID" width="80" />
            <el-table-column prop="customerCode" label="客户编码" width="140" />
            <el-table-column prop="customerName" label="客户名称" min-width="180" show-overflow-tooltip />
            <el-table-column prop="receiptAmount" label="收款金额" width="120" align="right">
              <template slot-scope="scope">{{ formatMoney(scope.row.receiptAmount) }}</template>
            </el-table-column>
            <el-table-column prop="allocatedAmount" label="已扣金额" width="120" align="right">
              <template slot-scope="scope">{{ formatMoney(scope.row.allocatedAmount) }}</template>
            </el-table-column>
            <el-table-column prop="unallocatedAmount" label="未扣金额" width="120" align="right">
              <template slot-scope="scope">{{ formatMoney(scope.row.unallocatedAmount) }}</template>
            </el-table-column>
            <el-table-column prop="payDate" label="收款日期" width="110" />
            <el-table-column prop="paymentAccount" label="收款账户" min-width="200" show-overflow-tooltip />
            <el-table-column prop="reconcileStatus" label="扣账状态" width="110">
              <template slot-scope="scope">
                <el-tag :type="receiptStatusTag(scope.row.reconcileStatus)">{{ receiptStatusLabel(scope.row.reconcileStatus) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="280" fixed="right">
              <template slot-scope="scope">
                <el-button size="mini" type="primary" plain :disabled="Number(scope.row.unallocatedAmount || 0) <= 0" @click="handleReconcile(scope.row)">扣账</el-button>
                <el-button size="mini" type="danger" plain :disabled="!canReverse(scope.row)" @click="handleReverse(scope.row)">冲销</el-button>
                <template v-if="isAdmin">
                  <el-button size="mini" type="text" icon="el-icon-edit" @click="handleEditReceipt(scope.row)">编辑</el-button>
                  <el-button size="mini" type="text" icon="el-icon-delete" style="color: #F56C6C" @click="handleDeleteReceipt(scope.row)">删除</el-button>
                </template>
              </template>
            </el-table-column>
          </el-table>

          <el-pagination
            class="mt12"
            layout="total, sizes, prev, pager, next"
            :total="receiptTotal"
            :page-size="receiptQuery.size"
            :current-page="receiptQuery.current"
            :page-sizes="[20, 50, 100, 200]"
            @size-change="handleReceiptSizeChange"
            @current-change="handleReceiptPageChange"
          />
        </el-tab-pane>

        <el-tab-pane label="应收明细" name="details">
          <el-form :inline="true" size="small" class="mb12">
            <el-form-item label="关键词">
              <el-input v-model.trim="detailQuery.keyword" clearable placeholder="订单号/客户编码" style="width: 220px" @keyup.enter.native="loadDetails(true)" />
            </el-form-item>
            <el-form-item label="客户编码">
              <el-input v-model.trim="detailQuery.customerCode" clearable placeholder="如 CUST001" style="width: 140px" @keyup.enter.native="loadDetails(true)" />
            </el-form-item>
            <el-form-item label="回款状态">
              <el-select v-model="detailQuery.payStatus" clearable style="width: 130px">
                <el-option label="未回款" value="UNPAID" />
                <el-option label="已回款" value="PAID" />
              </el-select>
            </el-form-item>
            <el-form-item label="匹配状态">
              <el-select v-model="detailQuery.matchStatus" clearable style="width: 130px">
                <el-option label="已匹配" value="MATCHED" />
                <el-option label="未匹配" value="UNMATCHED" />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" icon="el-icon-search" @click="loadDetails(true)">查询</el-button>
              <el-button icon="el-icon-refresh" @click="resetDetailQuery">重置</el-button>
            </el-form-item>
          </el-form>

          <el-alert :closable="false" type="info" style="margin-bottom: 10px;" :title="`当前未回款合计：${formatMoney(unpaidAmountTotal)}`" />

          <el-table :data="detailList" stripe border>
            <el-table-column prop="customerCode" label="客户编码" width="130" />
            <el-table-column prop="customerName" label="客户名称" min-width="150" show-overflow-tooltip />
            <el-table-column prop="orderNo" label="订单号" width="150" />
            <el-table-column prop="orderDate" label="订单日期" width="110" />
            <el-table-column prop="shipmentDate" label="出货日期" width="110" />
            <el-table-column prop="productName" label="产品名称" min-width="160" show-overflow-tooltip />
            <el-table-column prop="orderSpec" label="规格" min-width="180" show-overflow-tooltip />
            <el-table-column prop="shipmentAmount" label="出货金额" width="120" align="right">
              <template slot-scope="scope">{{ formatMoney(scope.row.shipmentAmount) }}</template>
            </el-table-column>
            <el-table-column prop="paidAmount" label="已扣金额" width="120" align="right">
              <template slot-scope="scope">{{ formatMoney(scope.row.paidAmount || scope.row.receiptAmount) }}</template>
            </el-table-column>
            <el-table-column prop="unpaidAmount" label="未回款" width="120" align="right">
              <template slot-scope="scope">{{ formatMoney(scope.row.unpaidAmount) }}</template>
            </el-table-column>
            <el-table-column prop="detailStatus" label="状态" width="100">
              <template slot-scope="scope">
                <el-tag :type="scope.row.detailStatus === 'PAID' ? 'success' : 'danger'" size="mini">
                  {{ scope.row.detailStatus === 'PAID' ? '已回款' : '未回款' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="matchStatus" label="匹配" width="100">
              <template slot-scope="scope">
                <el-tag :type="scope.row.matchStatus === 'MATCHED' ? 'success' : 'info'" size="mini">
                  {{ scope.row.matchStatus === 'MATCHED' ? '已匹配' : '未匹配' }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>

          <el-pagination
            class="mt12"
            layout="total, sizes, prev, pager, next"
            :total="detailTotal"
            :page-size="detailQuery.size"
            :current-page="detailQuery.current"
            :page-sizes="[20, 50, 100, 200]"
            @size-change="handleDetailSizeChange"
            @current-change="handleDetailPageChange"
          />
        </el-tab-pane>

        <el-tab-pane label="发票过账" name="invoice">
          <el-form :inline="true" size="small" class="mb12">
            <el-form-item>
              <el-button type="primary" @click="openNew">新建并过账发票</el-button>
            </el-form-item>
          </el-form>

          <el-table :data="invoices" stripe border>
            <el-table-column prop="id" label="ID" width="80" />
            <el-table-column prop="invoice_no" label="发票号" width="150" />
            <el-table-column prop="customerCode" label="客户编码" width="130" />
            <el-table-column prop="customerName" label="客户名称" min-width="180" show-overflow-tooltip />
            <el-table-column prop="invoiceDate" label="开票日期" width="120" />
            <el-table-column prop="totalAmount" label="金额" width="120" align="right">
              <template slot-scope="scope">{{ formatMoney(scope.row.totalAmount) }}</template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="100" />
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <el-dialog :title="isEditMode ? '编辑收款' : '新增收款'" :visible.sync="receiptDialogVisible" width="640px">
      <el-form :model="receiptForm" label-width="120px" size="small">
        <el-form-item v-if="isEditMode" label="ID">
          <span>{{ receiptForm.id }}</span>
        </el-form-item>
        <el-form-item label="客户">
          <el-select
            v-model="receiptForm.customerCode"
            filterable
            remote
            reserve-keyword
            clearable
            placeholder="输入客户编码/客户名称"
            :remote-method="searchCustomers"
            style="width: 100%"
          >
            <el-option v-for="item in customerOptions" :key="item.customerCode" :label="`${item.customerCode} - ${item.customerName || '-'}`" :value="item.customerCode" />
          </el-select>
        </el-form-item>
        <el-form-item label="收款金额">
          <el-input-number v-model="receiptForm.amount" :precision="2" :min="0.01" :step="100" style="width: 220px" />
        </el-form-item>
        <el-form-item label="收款日期">
          <el-date-picker v-model="receiptForm.payDate" type="date" value-format="yyyy-MM-dd" style="width: 220px" />
        </el-form-item>
      </el-form>
      <span slot="footer">
        <el-button @click="receiptDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitReceipt">保存</el-button>
      </span>
    </el-dialog>

    <el-dialog title="新建并过账发票" :visible.sync="dialogVisible" width="640px">
      <el-form :model="form" label-width="120px" size="small">
        <el-form-item label="发票号"><el-input v-model="form.invoice_no" /></el-form-item>
        <el-form-item label="客户代码"><el-input v-model="form.customer_code" /></el-form-item>
        <el-form-item label="开票日期"><el-date-picker v-model="form.invoice_date" type="date" value-format="yyyy-MM-dd" /></el-form-item>
        <el-form-item label="金额"><el-input-number v-model="form.total_amount" :precision="2" :min="0" style="width:180px" /></el-form-item>
        <el-form-item label="借方科目ID"><el-input v-model="form.debit_account_id" /></el-form-item>
        <el-form-item label="贷方科目ID"><el-input v-model="form.credit_account_id" /></el-form-item>
      </el-form>
      <span slot="footer">
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submit">保存并过账</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'
import {
  listInvoices,
  createAndPostInvoice,
  listReceipts,
  createReceipt,
  updateReceipt,
  deleteReceipt,
  reconcileReceipt,
  reconcileReceiptHistory,
  reverseReceipt,
  listUnpaidDetails,
  searchArCustomers
} from '@/api/ar'

export default {
  name: 'FinanceAR',
  data() {
    return {
      activeTab: 'receipts',
      invoices: [],
      receiptList: [],
      receiptTotal: 0,
      receiptDialogVisible: false,
      isEditMode: false,
      receiptQuery: {
        keyword: '',
        dateRange: [],
        onlyFull: false,
        current: 1,
        size: 20
      },
      receiptForm: {
        id: null,
        customerCode: '',
        amount: null,
        payDate: ''
      },
      customerOptions: [],
      detailList: [],
      detailTotal: 0,
      unpaidAmountTotal: 0,
      detailQuery: {
        keyword: '',
        customerCode: '',
        payStatus: '',
        matchStatus: '',
        current: 1,
        size: 20
      },
      dialogVisible: false,
      form: {
        invoice_no: '',
        customer_code: '',
        invoice_date: '',
        total_amount: 0,
        debit_account_id: null,
        credit_account_id: null
      }
    }
  },
  computed: {
    ...mapGetters(['roles']),
    isAdmin() {
      return this.roles && this.roles.includes('admin')
    }
  },
  created() {
    this.loadReceipts(true)
    this.loadDetails(true)
  },
  methods: {
    isSuccess(res) {
      return !!(res && (res.code === 200 || res.code === 20000))
    },
    formatMoney(val) {
      const n = Number(val)
      return Number.isFinite(n) ? n.toFixed(2) : '0.00'
    },
    receiptStatusTag(status) {
      const s = String(status || '').toUpperCase()
      if (s === 'FULL') return 'success'
      if (s === 'PARTIAL') return 'warning'
      if (s === 'REVERSED') return 'info'
      return ''
    },
    receiptStatusLabel(status) {
      const s = String(status || '').toUpperCase()
      if (s === 'FULL') return '已结清'
      if (s === 'PARTIAL') return '部分结清'
      if (s === 'REVERSED') return '已冲销'
      if (s === 'UNRECONCILED') return '未扣账'
      return s || '未扣账'
    },
    canReverse(row) {
      const status = String((row && row.reconcileStatus) || '').toUpperCase()
      return status === 'FULL' || status === 'PARTIAL'
    },
    handleTabChange() {
      if (this.activeTab === 'invoice' && !this.invoices.length) {
        this.loadInvoices()
      }
      if (this.activeTab === 'receipts' && !this.receiptList.length) {
        this.loadReceipts(true)
      }
      if (this.activeTab === 'details' && !this.detailList.length) {
        this.loadDetails(true)
      }
    },
    async loadInvoices() {
      const res = await listInvoices({})
      if (this.isSuccess(res)) {
        this.invoices = res.data || []
      }
    },
    buildReceiptParams() {
      const dateRange = Array.isArray(this.receiptQuery.dateRange) ? this.receiptQuery.dateRange : []
      return {
        keyword: this.receiptQuery.keyword || '',
        startDate: dateRange[0] || '',
        endDate: dateRange[1] || '',
        onlyFull: this.receiptQuery.onlyFull,
        current: this.receiptQuery.current,
        size: this.receiptQuery.size
      }
    },
    async loadReceipts(resetPage = false) {
      if (resetPage) this.receiptQuery.current = 1
      const res = await listReceipts(this.buildReceiptParams())
      if (!this.isSuccess(res)) return
      const data = res.data || {}
      this.receiptList = data.records || []
      this.receiptTotal = Number(data.total || 0)
    },
    resetReceiptQuery() {
      this.receiptQuery = {
        keyword: '',
        dateRange: [],
        onlyFull: false,
        current: 1,
        size: 20
      }
      this.loadReceipts(true)
    },
    handleReceiptPageChange(page) {
      this.receiptQuery.current = page
      this.loadReceipts(false)
    },
    handleReceiptSizeChange(size) {
      this.receiptQuery.size = size
      this.receiptQuery.current = 1
      this.loadReceipts(false)
    },
    openReceiptDialog() {
      this.isEditMode = false
      this.receiptDialogVisible = true
      this.receiptForm = {
        id: null,
        customerCode: '',
        amount: null,
        payDate: ''
      }
      this.customerOptions = []
      this.searchCustomers('')
    },
    handleEditReceipt(row) {
      this.isEditMode = true
      this.receiptDialogVisible = true
      this.receiptForm = {
        id: row.id,
        customerCode: row.customerCode,
        amount: row.receiptAmount,
        payDate: row.payDate
      }
      this.customerOptions = [{ customerCode: row.customerCode, customerName: row.customerName }]
    },
    async handleDeleteReceipt(row) {
      if (!row || !row.id) return
      try {
        await this.$confirm(`确认删除该收款记录(ID: ${row.id})吗？如果已扣账，请先冲销。`, '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        })
        const res = await deleteReceipt(row.id)
        if (this.isSuccess(res)) {
          this.$message.success('删除成功')
          this.loadReceipts()
        } else {
          this.$message.error(res.msg || res.message || '删除失败')
        }
      } catch (e) {
        // user cancel
      }
    },
    async searchCustomers(keyword) {
      const res = await searchArCustomers({ keyword: keyword || '' })
      if (!this.isSuccess(res)) {
        this.customerOptions = []
        return
      }
      this.customerOptions = Array.isArray(res.data) ? res.data : []
    },
    async submitReceipt() {
      if (!this.receiptForm.customerCode || !(Number(this.receiptForm.amount) > 0)) {
        return this.$message.warning('请填写客户和收款金额')
      }
      const payload = {
        id: this.receiptForm.id,
        customerCode: this.receiptForm.customerCode,
        amount: Number(this.receiptForm.amount),
        payDate: this.receiptForm.payDate || ''
      }

      let res
      if (this.isEditMode) {
        res = await updateReceipt(payload)
      } else {
        res = await createReceipt(payload)
      }

      if (!this.isSuccess(res)) {
        return this.$message.error((res && (res.msg || res.message)) || '操作失败')
      }
      this.$message.success(this.isEditMode ? '修改收款成功' : '新增收款成功')
      this.receiptDialogVisible = false
      this.loadReceipts(true)
      this.loadDetails(false)
    },
    async handleReconcile(row) {
      const id = row && row.id
      if (!id) return
      await this.$confirm('确认按出货时间先后顺序执行扣账？', '提示', { type: 'warning' })
      const res = await reconcileReceipt(id)
      if (!this.isSuccess(res)) {
        return this.$message.error((res && (res.msg || res.message)) || '扣账失败')
      }
      this.$message.success('扣账成功')
      this.loadReceipts(false)
      this.loadDetails(false)
    },
    async handleReverse(row) {
      const id = row && row.id
      if (!id) return
      await this.$confirm('确认冲销该收款单的已扣账记录？', '提示', { type: 'warning' })
      const res = await reverseReceipt(id)
      if (!this.isSuccess(res)) {
        return this.$message.error((res && (res.msg || res.message)) || '冲销失败')
      }
      this.$message.success('冲销成功')
      this.loadReceipts(false)
      this.loadDetails(false)
    },
    buildDetailParams() {
      return {
        keyword: this.detailQuery.keyword || '',
        customerCode: this.detailQuery.customerCode || '',
        payStatus: this.detailQuery.payStatus || '',
        matchStatus: this.detailQuery.matchStatus || '',
        current: this.detailQuery.current,
        size: this.detailQuery.size
      }
    },
    async loadDetails(resetPage = false) {
      if (resetPage) this.detailQuery.current = 1
      const res = await listUnpaidDetails(this.buildDetailParams())
      if (!this.isSuccess(res)) return
      const data = res.data || {}
      this.detailList = data.records || []
      this.detailTotal = Number(data.total || 0)
      this.unpaidAmountTotal = Number(data.unpaidAmountTotal || 0)
    },
    resetDetailQuery() {
      this.detailQuery = {
        keyword: '',
        customerCode: '',
        payStatus: '',
        matchStatus: '',
        current: 1,
        size: 20
      }
      this.loadDetails(true)
    },
    handleDetailPageChange(page) {
      this.detailQuery.current = page
      this.loadDetails(false)
    },
    handleDetailSizeChange(size) {
      this.detailQuery.size = size
      this.detailQuery.current = 1
      this.loadDetails(false)
    },
    openNew() {
      this.dialogVisible = true
      this.form = { invoice_no: '', customer_code: '', invoice_date: '', total_amount: 0, debit_account_id: null, credit_account_id: null }
    },
    async submit() {
      if (!this.form.invoice_no || !this.form.customer_code || !this.form.invoice_date) {
        return this.$message.warning('请填写发票号、客户和开票日期')
      }
      const res = await createAndPostInvoice(this.form)
      if (this.isSuccess(res)) {
        this.$message.success('创建并过账成功')
        this.dialogVisible = false
        this.loadInvoices()
      } else {
        this.$message.error((res && res.message) || '操作失败')
      }
    }
  }
}
</script>

<style scoped>
.mb12 { margin-bottom: 12px; }
</style>
