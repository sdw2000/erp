<template>
  <div class="app-container">
    <el-card>
      <div slot="header" class="clearfix">
        <span>银行账目流水（按银行记账）</span>
      </div>

      <el-form :inline="true" size="small" class="mb12">
        <el-form-item label="月份">
          <el-date-picker v-model="query.month" type="month" value-format="yyyy-MM" style="width:140px" />
        </el-form-item>
        <el-form-item label="银行">
          <el-select v-model="query.bankCode" clearable placeholder="全部银行" style="width:180px">
            <el-option v-for="b in banks" :key="b.bankCode" :label="`${b.bankName}(${b.bankCode})`" :value="b.bankCode" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="el-icon-search" @click="load">查询</el-button>
          <el-button type="success" icon="el-icon-plus" @click="openDialog">新增流水</el-button>
          <el-button icon="el-icon-connection" @click="showKingdeeTemplate">金蝶接口模板</el-button>
        </el-form-item>
      </el-form>

      <el-table :data="list" border stripe>
        <el-table-column prop="txnDate" label="交易日期" width="110" />
        <el-table-column prop="bankName" label="银行" width="120" />
        <el-table-column prop="bankCode" label="银行编码" width="100" />
        <el-table-column prop="accountNo" label="账号" min-width="140" />
        <el-table-column prop="direction" label="方向" width="90">
          <template slot-scope="scope">
            <el-tag size="mini" :type="directionTag(scope.row.direction)">{{ directionText(scope.row.direction) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="amount" label="金额" width="110" align="right" />
        <el-table-column prop="balanceAfter" label="余额" width="110" align="right" />
        <el-table-column prop="category" label="分类" width="100" />
        <el-table-column prop="bizNo" label="业务单号" width="140" />
        <el-table-column prop="counterparty" label="对方户名" min-width="130" />
        <el-table-column prop="syncStatus" label="同步状态" width="100">
          <template slot-scope="scope">
            <el-tag size="mini" :type="syncStatusTag(scope.row.syncStatus)">{{ syncStatusText(scope.row.syncStatus) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="kingdeeBillNo" label="金蝶单号" width="140" />
        <el-table-column label="操作" width="100" align="center">
          <template slot-scope="scope">
            <el-button type="text" @click="pushKingdee(scope.row)">推送金蝶</el-button>
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

    <el-dialog title="新增银行流水" :visible.sync="dialogVisible" width="560px">
      <el-form :model="form" label-width="100px" size="small">
        <el-form-item label="银行编码"><el-input v-model="form.bankCode" placeholder="如 ICBC" /></el-form-item>
        <el-form-item label="银行名称"><el-input v-model="form.bankName" placeholder="如 工商银行" /></el-form-item>
        <el-form-item label="账号"><el-input v-model="form.accountNo" /></el-form-item>
        <el-form-item label="交易日期"><el-date-picker v-model="form.txnDate" type="date" value-format="yyyy-MM-dd" style="width:100%" /></el-form-item>
        <el-form-item label="方向">
          <el-select v-model="form.direction" style="width:100%">
            <el-option label="收入" value="IN" />
            <el-option label="支出" value="OUT" />
          </el-select>
        </el-form-item>
        <el-form-item label="金额"><el-input-number v-model="form.amount" :precision="2" :min="0" style="width:100%" /></el-form-item>
        <el-form-item label="分类"><el-input v-model="form.category" /></el-form-item>
        <el-form-item label="业务单号"><el-input v-model="form.bizNo" /></el-form-item>
        <el-form-item label="对方户名"><el-input v-model="form.counterparty" /></el-form-item>
        <el-form-item label="来源系统"><el-input v-model="form.sourceSystem" placeholder="MES/ERP/Kingdee" /></el-form-item>
        <el-form-item label="备注"><el-input v-model="form.remark" /></el-form-item>
      </el-form>
      <span slot="footer">
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submit">保存</el-button>
      </span>
    </el-dialog>

    <el-dialog title="金蝶接口调用模板" :visible.sync="templateVisible" width="700px">
      <el-alert :title="`Mock模式: ${template.mockEnabled ? '开启' : '关闭'}，Endpoint: ${template.endpoint || '-'}`" type="info" :closable="false" class="mb12" />
      <el-input type="textarea" :rows="12" :value="prettyTemplate" readonly />
    </el-dialog>
  </div>
</template>

<script>
import {
  getBankLedgerPage,
  getKingdeeTemplate,
  pushBankLedgerToKingdee,
  saveBankLedger
} from '@/api/finance'

export default {
  name: 'FinanceBankLedger',
  data() {
    return {
      query: {
        month: this.currentMonth(),
        bankCode: '',
        pageNum: 1,
        pageSize: 20
      },
      list: [],
      banks: [],
      total: 0,
      dialogVisible: false,
      templateVisible: false,
      template: {},
      form: {
        bankCode: '',
        bankName: '',
        accountNo: '',
        txnDate: '',
        direction: 'IN',
        amount: 0,
        category: '',
        bizNo: '',
        counterparty: '',
        sourceSystem: 'MES',
        remark: ''
      }
    }
  },
  computed: {
    prettyTemplate() {
      return JSON.stringify(this.template.payloadTemplate || {}, null, 2)
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
    async load() {
      const res = await getBankLedgerPage(this.query)
      if (res && (res.code === 200 || res.code === 20000)) {
        const raw = ((res.data && res.data.records) || [])[0] || {}
        this.list = raw.records || []
        this.banks = raw.banks || []
        this.total = Number((res.data && res.data.total) || 0)
      }
    },
    changePage(page) {
      this.query.pageNum = page
      this.load()
    },
    openDialog() {
      this.dialogVisible = true
      this.form = {
        bankCode: '',
        bankName: '',
        accountNo: '',
        txnDate: '',
        direction: 'IN',
        amount: 0,
        category: '',
        bizNo: '',
        counterparty: '',
        sourceSystem: 'MES',
        remark: ''
      }
    },
    async submit() {
      if (!this.form.bankCode || !this.form.bankName) {
        return this.$message.warning('请填写银行编码和名称')
      }
      if (!this.form.amount || Number(this.form.amount) <= 0) {
        return this.$message.warning('金额必须大于0')
      }
      await saveBankLedger(this.form)
      this.$message.success('保存成功')
      this.dialogVisible = false
      this.load()
    },
    async pushKingdee(row) {
      const res = await pushBankLedgerToKingdee(row.id)
      if (res && (res.code === 200 || res.code === 20000)) {
        this.$message.success((res.data && res.data.message) || '推送成功')
        this.load()
      }
    },
    async showKingdeeTemplate() {
      const res = await getKingdeeTemplate()
      if (res && (res.code === 200 || res.code === 20000)) {
        this.template = res.data || {}
        this.templateVisible = true
      }
    },
    directionText(val) {
      const code = String(val || '').trim().toUpperCase()
      if (code === 'IN' || val === '收入') return '收入'
      if (code === 'OUT' || val === '支出') return '支出'
      return val || '-'
    },
    directionTag(val) {
      const code = String(val || '').trim().toUpperCase()
      if (code === 'IN' || val === '收入') return 'success'
      if (code === 'OUT' || val === '支出') return 'danger'
      return 'info'
    },
    syncStatusText(val) {
      const code = String(val || '').trim().toUpperCase()
      const map = {
        PENDING: '待同步',
        SYNCING: '同步中',
        SYNCED: '已同步',
        FAILED: '同步失败'
      }
      return map[code] || val || '-'
    },
    syncStatusTag(val) {
      const code = String(val || '').trim().toUpperCase()
      const map = {
        PENDING: 'warning',
        SYNCING: 'info',
        SYNCED: 'success',
        FAILED: 'danger'
      }
      return map[code] || 'info'
    }
  }
}
</script>

<style scoped>
.mb12 { margin-bottom: 12px; }
.mt12 { margin-top: 12px; }
</style>
