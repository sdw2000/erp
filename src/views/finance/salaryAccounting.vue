<template>
  <div class="app-container">
    <el-card>
      <div slot="header" class="clearfix">
        <span>工资核算</span>
      </div>

      <el-form :inline="true" size="small" class="mb12">
        <el-form-item label="月份">
          <el-date-picker v-model="query.month" type="month" value-format="yyyy-MM" style="width:140px" />
        </el-form-item>
        <el-form-item label="员工">
          <el-input v-model="query.employeeName" clearable placeholder="姓名关键字" style="width:160px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="el-icon-search" @click="load">查询</el-button>
          <el-button type="success" icon="el-icon-plus" @click="openDialog">新增</el-button>
        </el-form-item>
      </el-form>

      <el-table :data="list" border stripe>
        <el-table-column prop="employeeName" label="员工" width="120" />
        <el-table-column prop="department" label="部门" width="120" />
        <el-table-column prop="baseSalary" label="基本工资" width="110" align="right" />
        <el-table-column prop="overtimeSalary" label="加班工资" width="110" align="right" />
        <el-table-column prop="bonus" label="奖金" width="90" align="right" />
        <el-table-column prop="socialSecurity" label="社保" width="90" align="right" />
        <el-table-column prop="otherDeduction" label="其他扣款" width="100" align="right" />
        <el-table-column prop="payableSalary" label="应发工资" width="110" align="right" />
        <el-table-column prop="payDate" label="发薪日期" width="110" />
        <el-table-column prop="bankName" label="发薪银行" width="120" />
        <el-table-column prop="bankAccount" label="银行账号" min-width="140" />
        <el-table-column label="操作" width="90" align="center">
          <template slot-scope="scope">
            <el-button type="text" class="danger-text" @click="remove(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="mt12" style="text-align:right">
        <el-pagination
          background
          layout="total, prev, pager, next"
          :current-page="query.pageNum"
          :page-size="query.pageSize"
          :total="total"
          @current-change="changePage"
        />
      </div>
    </el-card>

    <el-dialog title="工资记录" :visible.sync="dialogVisible" width="560px">
      <el-form :model="form" label-width="100px" size="small">
        <el-form-item label="月份">
          <el-date-picker v-model="form.month" type="month" value-format="yyyy-MM" style="width:100%" />
        </el-form-item>
        <el-form-item label="员工姓名">
          <el-input v-model="form.employeeName" />
        </el-form-item>
        <el-form-item label="部门">
          <el-input v-model="form.department" />
        </el-form-item>
        <el-form-item label="基本工资">
          <el-input-number v-model="form.baseSalary" :precision="2" :min="0" style="width:100%" />
        </el-form-item>
        <el-form-item label="加班工资">
          <el-input-number v-model="form.overtimeSalary" :precision="2" :min="0" style="width:100%" />
        </el-form-item>
        <el-form-item label="奖金">
          <el-input-number v-model="form.bonus" :precision="2" :min="0" style="width:100%" />
        </el-form-item>
        <el-form-item label="社保">
          <el-input-number v-model="form.socialSecurity" :precision="2" :min="0" style="width:100%" />
        </el-form-item>
        <el-form-item label="其他扣款">
          <el-input-number v-model="form.otherDeduction" :precision="2" :min="0" style="width:100%" />
        </el-form-item>
        <el-form-item label="发薪日期">
          <el-date-picker v-model="form.payDate" type="date" value-format="yyyy-MM-dd" style="width:100%" />
        </el-form-item>
        <el-form-item label="发薪银行">
          <el-input v-model="form.bankName" />
        </el-form-item>
        <el-form-item label="银行账号">
          <el-input v-model="form.bankAccount" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" />
        </el-form-item>
      </el-form>
      <span slot="footer">
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submit">保存</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import { deleteSalaryRecord, getSalaryPage, saveSalaryRecord } from '@/api/finance'

export default {
  name: 'FinanceSalaryAccounting',
  data() {
    return {
      query: {
        month: this.currentMonth(),
        employeeName: '',
        pageNum: 1,
        pageSize: 20
      },
      list: [],
      total: 0,
      dialogVisible: false,
      form: this.newForm()
    }
  },
  created() {
    this.load()
  },
  methods: {
    currentMonth() {
      const d = new Date()
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    },
    newForm() {
      return {
        month: this.currentMonth(),
        employeeName: '',
        department: '',
        baseSalary: 0,
        overtimeSalary: 0,
        bonus: 0,
        socialSecurity: 0,
        otherDeduction: 0,
        payDate: '',
        bankName: '',
        bankAccount: '',
        remark: ''
      }
    },
    async load() {
      const res = await getSalaryPage(this.query)
      if (res && (res.code === 200 || res.code === 20000)) {
        this.list = (res.data && res.data.records) || []
        this.total = Number((res.data && res.data.total) || 0)
      }
    },
    changePage(page) {
      this.query.pageNum = page
      this.load()
    },
    openDialog() {
      this.dialogVisible = true
      this.form = this.newForm()
      this.form.month = this.query.month
    },
    async submit() {
      if (!this.form.employeeName) {
        return this.$message.warning('请填写员工姓名')
      }
      await saveSalaryRecord(this.form)
      this.$message.success('保存成功')
      this.dialogVisible = false
      this.load()
    },
    async remove(row) {
      await this.$confirm('确定删除该记录？', '提示', { type: 'warning' })
      await deleteSalaryRecord(row.id)
      this.$message.success('删除成功')
      this.load()
    }
  }
}
</script>

<style scoped>
.mb12 { margin-bottom: 12px; }
.mt12 { margin-top: 12px; }
.danger-text { color: #f56c6c; }
</style>
