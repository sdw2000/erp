<template>
  <div class="sales-reconciliation">
    <el-card>
      <div slot="header" class="page-header">
        <span class="card-title">销售对账单</span>
        <div>
          <el-button size="small" icon="el-icon-refresh" @click="handleReset">重置</el-button>
          <el-button type="primary" size="small" icon="el-icon-search" @click="handleSearch">查询</el-button>
          <el-button type="success" size="small" icon="el-icon-printer" :disabled="!statementLoaded" @click="openPrintPreview">打印预览</el-button>
        </div>
      </div>

      <div class="search-area">
        <el-row :gutter="12">
          <el-col :span="10">
            <div class="search-item">
              <span class="search-label">客户</span>
              <el-select v-model="queryForm.customerCode" filterable clearable placeholder="请选择客户" style="width:100%">
                <el-option v-for="item in customers" :key="item.id" :label="`${item.shortName || item.customerName}（${item.customerCode}）`" :value="item.customerCode" />
              </el-select>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="search-item">
              <span class="search-label">月份</span>
              <el-date-picker v-model="queryForm.month" type="month" value-format="yyyy-MM" placeholder="选择月份" style="width:100%" />
            </div>
          </el-col>
        </el-row>
      </div>

      <div v-if="statementLoaded" class="summary-grid">
        <div class="summary-card">
          <div class="summary-label">本月卷数</div>
          <div class="summary-value">{{ formatNumber(statement.summary.totalRolls, 0) }}</div>
        </div>
        <div class="summary-card">
          <div class="summary-label">本月面积</div>
          <div class="summary-value">{{ formatNumber(statement.summary.totalArea) }} ㎡</div>
        </div>
        <div class="summary-card">
          <div class="summary-label">发货金额</div>
          <div class="summary-value">{{ formatNumber(statement.summary.deliveryAmount) }}</div>
        </div>
        <div class="summary-card warning-card">
          <div class="summary-label">退货影响</div>
          <div class="summary-value">{{ formatNumber(statement.summary.returnAmount) }}</div>
        </div>
        <div class="summary-card primary-card">
          <div class="summary-label">本月对账金额</div>
          <div class="summary-value">{{ formatNumber(statement.summary.totalAmount) }}</div>
        </div>
      </div>

      <div class="section-block">
        <div class="section-title">当月送货明细</div>
        <el-table class="reconciliation-table" :data="statement.detailRows" border stripe style="width:100%">
          <el-table-column label="出货日期" width="100">
            <template slot-scope="scope">{{ formatShortDate(scope.row.bizDate) }}</template>
          </el-table-column>
          <el-table-column prop="orderNo" label="订单号" min-width="130" show-overflow-tooltip />
          <el-table-column prop="documentNo" label="送货单号" min-width="135" show-overflow-tooltip />
          <el-table-column prop="materialName" label="产品" min-width="154" show-overflow-tooltip />
          <el-table-column prop="spec" label="规格" min-width="150" show-overflow-tooltip />
          <el-table-column label="数量(R)" width="72" align="right">
            <template slot-scope="scope">{{ formatNumber(scope.row.quantity, 0) }}</template>
          </el-table-column>
          <el-table-column label="数量/m²" width="100" align="right">
            <template slot-scope="scope">{{ formatNumber(scope.row.areaSize) }}</template>
          </el-table-column>
          <el-table-column label="单价(元/m²)" width="55" align="right">
            <template slot-scope="scope">{{ formatNumber(scope.row.unitPrice, 2) }}</template>
          </el-table-column>
          <el-table-column label="总金额" width="120" align="right">
            <template slot-scope="scope">
              <span :class="{ 'negative-amount': Number(scope.row.amount) < 0 }">{{ formatNumber(scope.row.amount) }}</span>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div class="section-block">
        <div class="section-head">
          <div class="section-title">历史欠账 / 开票台账</div>
          <el-button type="primary" plain size="small" icon="el-icon-plus" :disabled="!queryForm.customerCode" @click="addHistoryRow">新增历史记录</el-button>
        </div>
        <el-table class="reconciliation-table" :data="statement.historyRows" border stripe style="width:100%">
          <el-table-column label="对账月份" width="120">
            <template slot-scope="scope">
              <el-date-picker v-model="scope.row.statementMonth" :disabled="!scope.row._editing" type="month" value-format="yyyy-MM" size="mini" placeholder="月份" style="width:100%" />
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
          <el-table-column label="开票日期" width="140">
            <template slot-scope="scope">
              <el-date-picker v-model="scope.row.invoiceDate" :disabled="!scope.row._editing" type="date" value-format="yyyy-MM-dd" size="mini" placeholder="开票日期" style="width:100%" />
            </template>
          </el-table-column>
          <el-table-column label="备注" min-width="180">
            <template slot-scope="scope">
              <el-input v-model="scope.row.remark" :disabled="!scope.row._editing" size="mini" placeholder="备注" />
            </template>
          </el-table-column>
          <el-table-column label="操作" width="150" align="center">
            <template slot-scope="scope">
              <div class="op-btns">
                <el-button v-if="scope.row._editing" type="text" size="mini" @click="saveHistoryRow(scope.row)">保存</el-button>
                <el-button v-else type="text" size="mini" @click="editHistoryRow(scope.row)">修改</el-button>
                <el-button type="text" size="mini" class="op-danger" @click="deleteHistoryRow(scope.row, scope.$index)">删除</el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
        <div class="history-summary">
          <span>历史欠账合计：{{ formatNumber(getHistoryTotalUnpaid()) }}</span>
          <span>历史开票合计：{{ formatNumber(getHistoryTotalInvoice()) }}</span>
          <span class="payable-amount">期末应付金额：{{ formatNumber(getFinalPayableAmount()) }}</span>
        </div>
      </div>
    </el-card>

    <el-dialog title="对账单打印预览" :visible.sync="printVisible" width="1100px" top="4vh">
      <div v-if="statementLoaded" id="reconciliationPrintArea" class="print-sheet">
        <div class="print-company-header">
          <img :src="companyInfo.logoUrl || '/logo/finechem-logo.png'" alt="logo" class="print-logo">
          <div class="print-company-info">
            <div class="company-name">{{ companyInfo.companyName }}</div>
            <div>地址：{{ companyInfo.address }}</div>
            <div>电话：{{ companyInfo.phone }}　传真：{{ companyInfo.fax }}</div>
            <div>{{ companyInfo.website }}</div>
          </div>
        </div>
        <div class="print-title">{{ queryForm.month.replace('-', '年') }}月销售对账单</div>
        <div class="print-meta-line">
          <span><strong>购货单位：</strong>{{ statement.customerName || statement.customerCode }}</span>
        </div>
        <div class="print-subtitle">一、{{ queryForm.month }}期间，贵司货物收发明细如下：</div>
        <table class="print-table">
          <thead>
            <tr>
              <th>出货日期</th>
              <th>订单号</th>
              <th>送货单号</th>
              <th>产品</th>
              <th>规格</th>
              <th>数量(R)</th>
              <th>数量/m²</th>
              <th>单价(元/m²)</th>
              <th>总金额</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, idx) in statement.detailRows" :key="idx">
              <td>{{ row.bizDate }}</td>
              <td>{{ row.orderNo }}</td>
              <td>{{ row.documentNo }}</td>
              <td>{{ row.materialName }}</td>
              <td>{{ row.spec }}</td>
              <td>{{ formatNumber(row.quantity, 0) }}</td>
              <td>{{ formatNumber(row.areaSize) }}</td>
              <td>{{ formatNumber(row.unitPrice, 2) }}</td>
              <td>{{ formatNumber(row.amount) }}</td>
            </tr>
          </tbody>
        </table>
        <div class="print-total">合计金额：{{ formatNumber(statement.summary.totalAmount) }}</div>
        <div class="print-subtitle">二、应付明细：</div>
        <table class="print-table print-history-table">
          <thead>
            <tr>
              <th>月份</th>
              <th>欠账金额</th>
              <th>开票金额</th>
              <th>开票日期</th>
              <th>备注</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, idx) in getPrintHistoryRows()" :key="`history-${idx}`">
              <td>{{ row.statementMonth }}</td>
              <td>{{ formatNumber(row.unpaidAmount) }}</td>
              <td>{{ formatNumber(row.invoiceAmount) }}</td>
              <td>{{ row.invoiceDate || '-' }}</td>
              <td>{{ row.remark || '-' }}</td>
            </tr>
            <tr v-if="!getPrintHistoryRows().length">
              <td colspan="5">暂无历史记录</td>
            </tr>
          </tbody>
        </table>
        <div class="print-total">
          历史欠账合计：{{ formatNumber(getHistoryTotalUnpaid()) }}
          &nbsp;&nbsp;&nbsp;历史开票合计：{{ formatNumber(getHistoryTotalInvoice()) }}
          &nbsp;&nbsp;&nbsp;期末应付金额：{{ formatNumber(getFinalPayableAmount()) }}
        </div>
        <div class="print-footer-note">
          请核对以上对账明细，如有差异请及时反馈；无误后请据此安排付款与开票确认。
        </div>
        <div class="print-signature">
          <span>供货方确认：________________</span>
          <span>采购方确认：________________</span>
          <span>日期：________________</span>
        </div>
      </div>
      <span slot="footer" class="dialog-footer-actions">
        <el-button @click="printVisible = false">关闭</el-button>
        <el-button type="primary" icon="el-icon-printer" @click="handlePrintBrowser">打印对账单</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import { getCustomerList } from '@/api/customer'
import { deleteSalesReconciliationHistory, getSalesReconciliationStatement, saveSalesReconciliationHistory } from '@/api/salesReconciliation'
import request from '@/utils/request'

export default {
  name: 'SalesReconciliation',
  data() {
    return {
      customers: [],
      queryForm: {
        customerCode: '',
        month: this.getCurrentMonth()
      },
      statementLoaded: false,
      printVisible: false,
      companyInfo: {
        companyName: '东莞市方恩电子材料科技有限公司',
        address: '广东省东莞市桥头镇东新路13号2号楼102室',
        phone: '0769-82551118',
        fax: '0769-82551160',
        website: 'www.finechemfr.com',
        logoUrl: '/logo/finechem-logo.png'
      },
      statement: {
        customerCode: '',
        customerName: '',
        month: '',
        detailRows: [],
        historyRows: [],
        printHistoryRows: [],
        summary: {
          totalRolls: 0,
          totalArea: 0,
          deliveryAmount: 0,
          returnAmount: 0,
          totalAmount: 0
        }
      }
    }
  },
  created() {
    this.fetchCustomers()
    this.fetchCompanyInfo()
  },
  methods: {
    getCurrentMonth() {
      const d = new Date()
      d.setMonth(d.getMonth() - 1)
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    },
    async fetchCustomers() {
      try {
        const res = await getCustomerList({ size: 1000 })
        if (res && (res.code === 200 || res.code === 20000)) {
          const data = res.data
          this.customers = (data && data.records) || (Array.isArray(data) ? data : [])
        }
      } catch (e) {}
    },
    async fetchCompanyInfo() {
      try {
        const res = await request({ url: '/config/company', method: 'get' })
        if (res && (res.code === 200 || res.code === 20000) && res.data) {
          this.companyInfo = Object.assign({}, this.companyInfo, res.data)
        }
      } catch (e) {
        console.error('加载公司信息失败', e)
      }
    },
    formatNumber(value, digits = 2) {
      if (value === null || value === undefined || value === '') return Number(0).toFixed(digits)
      const n = Number(value)
      return Number.isFinite(n) ? n.toFixed(digits) : Number(0).toFixed(digits)
    },
    formatShortDate(value) {
      if (!value) return ''
      const s = String(value).trim()
      const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
      if (m) return `${m[1].slice(2)}-${m[2]}-${m[3]}`
      return s
    },
    getHistoryTotalUnpaid() {
      return (this.statement.historyRows || []).reduce((sum, item) => sum + (Number(item.unpaidAmount) || 0), 0)
    },
    getHistoryTotalInvoice() {
      return (this.statement.historyRows || []).reduce((sum, item) => sum + (Number(item.invoiceAmount) || 0), 0)
    },
    getFinalPayableAmount() {
      const currentAmount = Number((this.statement.summary && this.statement.summary.totalAmount) || 0)
      return currentAmount + this.getHistoryTotalUnpaid() - this.getHistoryTotalInvoice()
    },
    getPrintHistoryRows() {
      const printRows = this.statement.printHistoryRows || []
      if (printRows.length) return printRows
      return this.statement.historyRows || []
    },
    async handleSearch() {
      if (!this.queryForm.customerCode) return this.$message.warning('请先选择客户')
      if (!this.queryForm.month) return this.$message.warning('请选择月份')
      const res = await getSalesReconciliationStatement({ customerCode: this.queryForm.customerCode, month: this.queryForm.month })
      if (!res || res.code !== 200) {
        return this.$message.error((res && (res.msg || res.message)) || '查询失败')
      }
      const data = res.data || {}
      this.statement = Object.assign({}, this.statement, data)
      this.statement.detailRows = data.detailRows || []
      this.statement.historyRows = (data.historyRows || []).map(item => ({ ...item, _editing: false }))
      this.statement.printHistoryRows = data.printHistoryRows || []
      this.statement.summary = data.summary || this.statement.summary
      this.statementLoaded = true
    },
    handleReset() {
      this.queryForm = { customerCode: '', month: this.getCurrentMonth() }
      this.statementLoaded = false
      this.statement = {
        customerCode: '',
        customerName: '',
        month: '',
        detailRows: [],
        historyRows: [],
        printHistoryRows: [],
        summary: {
          totalRolls: 0,
          totalArea: 0,
          deliveryAmount: 0,
          returnAmount: 0,
          totalAmount: 0
        }
      }
    },
    addHistoryRow() {
      if (!this.queryForm.customerCode) return this.$message.warning('请先选择客户')
      this.statement.historyRows.unshift({
        customerCode: this.queryForm.customerCode,
        statementMonth: this.queryForm.month,
        unpaidAmount: 0,
        invoiceAmount: 0,
        invoiceDate: '',
        remark: '',
        _editing: true
      })
    },
    editHistoryRow(row) {
      this.$set(row, '_editing', true)
    },
    async saveHistoryRow(row) {
      if (!this.queryForm.customerCode) return this.$message.warning('请先选择客户')
      if (!row.statementMonth) return this.$message.warning('请填写对账月份')
      const payload = {
        ...row,
        customerCode: this.queryForm.customerCode,
        unpaidAmount: Number(row.unpaidAmount) || 0,
        invoiceAmount: Number(row.invoiceAmount) || 0
      }
      const res = await saveSalesReconciliationHistory(payload)
      if (!res || res.code !== 200) {
        return this.$message.error((res && (res.msg || res.message)) || '保存失败')
      }
      this.$message.success('保存成功')
      if (res.data && res.data.id) {
        row.id = res.data.id
      }
      this.$set(row, '_editing', false)
      await this.handleSearch()
    },
    async deleteHistoryRow(row, index) {
      if (!row.id) {
        this.statement.historyRows.splice(index, 1)
        return
      }
      await this.$confirm('确认删除该历史记录吗？', '提示', { type: 'warning' }).then(async() => {
        const res = await deleteSalesReconciliationHistory(row.id)
        if (res && res.code === 200) {
          this.$message.success('删除成功')
          this.handleSearch()
        }
      }).catch(() => {})
    },
    openPrintPreview() {
      if (!this.statementLoaded) return this.$message.warning('请先查询对账单')
      this.printVisible = true
    },
    handlePrintBrowser() {
      const area = document.getElementById('reconciliationPrintArea')
      if (!area) return this.$message.warning('未找到打印内容')
      const iframe = document.createElement('iframe')
      iframe.setAttribute('style', 'position:absolute;width:0;height:0;left:-1000px;top:-1000px;')
      document.body.appendChild(iframe)
      const doc = iframe.contentWindow.document
      doc.write(`
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              * { box-sizing: border-box; }
              body { font-family: "Microsoft YaHei", Arial, sans-serif; margin: 0; padding: 12mm; color: #000; }
              .print-company-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px; }
              .print-logo { width:180px; height:auto; }
              .print-company-info { text-align:right; font-size:12px; line-height:1.6; }
              .company-name { font-weight:700; font-size:18px; }
              .print-title { text-align:center; font-size:22px; font-weight:700; margin:10px 0; }
              .print-meta-line,.print-subtitle,.print-footer-note { font-size:12px; margin-bottom:8px; }
              .print-table { width:100%; border-collapse:collapse; margin-bottom:12px; table-layout:fixed; }
              .print-table th,.print-table td { border:1px solid #000; padding:5px 4px; font-size:11px; text-align:center; word-break:break-all; }
              .print-table th { background:#f1f1f1; }
              .print-total { text-align:right; font-size:12px; font-weight:700; margin-bottom:12px; }
              .print-signature { margin-top:24px; display:flex; justify-content:space-between; font-size:12px; }
              @page { size: A4 portrait; margin: 10mm; }
            </style>
          </head>
          <body>${area.innerHTML}</body>
        </html>
      `)
      doc.close()
      setTimeout(() => {
        iframe.contentWindow.focus()
        iframe.contentWindow.print()
        setTimeout(() => document.body.removeChild(iframe), 1000)
      }, 300)
    }
  }
}
</script>

<style scoped>
.sales-reconciliation { padding: 20px; }
.page-header { display:flex; justify-content:space-between; align-items:center; }
.card-title { font-size:16px; font-weight:600; }
.search-area { margin-bottom: 16px; padding: 14px 16px; background:#f8fafc; border:1px solid #ebeef5; border-radius:10px; }
.search-item { display:flex; align-items:center; gap:10px; }
.search-label { flex: 0 0 40px; color:#606266; font-size:13px; }
.summary-grid { display:grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap:12px; margin-bottom:16px; }
.summary-card { padding:14px 16px; border:1px solid #ebeef5; border-radius:10px; background:#fff; }
.summary-label { color:#909399; font-size:12px; margin-bottom:6px; }
.summary-value { color:#303133; font-size:18px; font-weight:600; }
.primary-card { background:#f4f8ff; border-color:#d9ecff; }
.warning-card { background:#fff7ed; border-color:#fed7aa; }
.section-block { margin-top: 16px; }
.section-head { display:flex; justify-content:space-between; align-items:center; margin-bottom: 10px; }
.section-title { font-size:14px; font-weight:600; color:#303133; margin-bottom:10px; }
.reconciliation-table { border:1px solid #ebeef5; border-radius:8px; overflow:hidden; }
.reconciliation-table /deep/ th.el-table__cell { background:#f5f7fa; color:#606266; font-weight:600; }
.reconciliation-table /deep/ .el-table__row td.el-table__cell { padding-top:10px; padding-bottom:10px; }
.history-summary { margin-top: 10px; display:flex; justify-content:flex-end; gap:24px; color:#606266; font-size:13px; }
.payable-amount { color:#f56c6c; font-weight:600; }
.op-btns { display:flex; justify-content:center; gap:12px; }
.op-danger, .negative-amount { color:#f56c6c; }
.dialog-footer-actions { display:flex; justify-content:flex-end; gap:10px; }
.print-sheet { padding: 8px; color:#000; }
.print-company-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px; }
.print-logo { width: 180px; height:auto; }
.print-company-info { text-align:right; font-size:12px; line-height:1.6; }
.company-name { font-size:18px; font-weight:700; }
.print-title { text-align:center; font-size:22px; font-weight:700; margin:8px 0 10px; }
.print-meta-line,.print-subtitle,.print-footer-note { font-size:12px; margin-bottom:8px; }
.print-table { width:100%; border-collapse:collapse; table-layout:fixed; margin-bottom:12px; }
.print-table th,.print-table td { border:1px solid #000; padding:5px 4px; font-size:11px; text-align:center; word-break:break-all; }
.print-table th { background:#f1f1f1; }
.print-total { text-align:right; font-size:12px; font-weight:700; margin-bottom:12px; }
.print-signature { margin-top:24px; display:flex; justify-content:space-between; font-size:12px; }
</style>
