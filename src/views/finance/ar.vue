<template>
  <div class="app-container">
    <el-card>
      <div slot="header" class="clearfix">
        <span>应收管理（AR）</span>
      </div>

      <el-form :inline="true" size="small" class="mb12">
        <el-form-item>
          <el-button type="primary" @click="openNew">新建并过账发票</el-button>
        </el-form-item>
      </el-form>

      <el-table :data="invoices" stripe border>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="invoice_no" label="发票号" />
        <el-table-column prop="customer_code" label="客户" width="160" />
        <el-table-column prop="invoice_date" label="开票日期" width="120" />
        <el-table-column prop="total_amount" label="金额" width="120" align="right" />
        <el-table-column prop="status" label="状态" width="100" />
      </el-table>
    </el-card>

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
import { listInvoices, createAndPostInvoice } from '@/api/ar'

export default {
  name: 'FinanceAR',
  data() {
    return {
      invoices: [],
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
  created() {
    this.load()
  },
  methods: {
    async load() {
      const res = await listInvoices({})
      if (res && (res.code === 200 || res.code === 20000)) {
        this.invoices = res.data || []
      }
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
      if (res && (res.code === 200 || res.code === 20000)) {
        this.$message.success('创建并过账成功')
        this.dialogVisible = false
        this.load()
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
