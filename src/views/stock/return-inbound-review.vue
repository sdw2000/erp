<template>
  <div class="return-inbound-review app-container">
    <el-card>
      <div slot="header" class="clearfix">
        <span>退货入库审核</span>
        <div style="float:right">
          <el-button type="primary" size="small" icon="el-icon-s-check" @click="goInboundPage">去入库申请审核</el-button>
        </div>
      </div>

      <el-form :inline="true" :model="searchForm" size="small" class="mb12">
        <el-form-item label="退货单号">
          <el-input v-model="searchForm.returnNo" clearable placeholder="请输入退货单号" style="width:180px" />
        </el-form-item>
        <el-form-item label="客户">
          <el-input v-model="searchForm.customer" clearable placeholder="客户代码/名称" style="width:180px" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" clearable placeholder="全部状态" style="width:120px">
            <el-option label="草稿" value="draft" />
            <el-option label="已确认" value="confirmed" />
            <el-option label="已取消" value="cancelled" />
          </el-select>
        </el-form-item>
        <el-form-item label="日期">
          <el-date-picker v-model="searchForm.startDate" type="date" value-format="yyyy-MM-dd" placeholder="开始" style="width:130px" />
        </el-form-item>
        <el-form-item>
          <el-date-picker v-model="searchForm.endDate" type="date" value-format="yyyy-MM-dd" placeholder="结束" style="width:130px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="el-icon-search" @click="handleSearch">查询</el-button>
          <el-button icon="el-icon-refresh-left" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>

      <el-table v-loading="loading" :data="list" border stripe>
        <el-table-column type="index" label="序号" width="60" align="center" :index="indexMethod" />
        <el-table-column prop="returnNo" label="退货单号" min-width="140" />
        <el-table-column label="客户" min-width="130">
          <template slot-scope="scope">{{ getCustomerDisplay(scope.row.customer) }}</template>
        </el-table-column>
        <el-table-column prop="reason" label="退货原因" min-width="150" show-overflow-tooltip />
        <el-table-column prop="returnDate" label="退货日期" width="120" />
        <el-table-column label="总面积(㎡)" width="110" align="right">
          <template slot-scope="scope">{{ formatNumber(scope.row.totalArea) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="90" align="center">
          <template slot-scope="scope">
            <el-tag :type="getStatusTagType(scope.row.status)" size="small">{{ getStatusText(scope.row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="260" align="center" fixed="right">
          <template slot-scope="scope">
            <el-button
              v-if="canCreateInbound(scope.row)"
              type="text"
              size="mini"
              style="color:#67c23a"
              @click="createInboundFromReturn(scope.row)"
            >生成入库申请</el-button>
            <el-button type="text" size="mini" @click="viewDetail(scope.row)">详情</el-button>
            <el-button type="text" size="mini" @click="openAudit(scope.row)">审计</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="mt12" style="text-align:right">
        <el-pagination
          background
          :current-page="currentPage"
          :page-size="pageSize"
          :page-sizes="[10,20,50]"
          layout="sizes, prev, pager, next, jumper, ->, total"
          :total="Number(total)"
          @size-change="onSizeChange"
          @current-change="onCurrentChange"
        />
      </div>
    </el-card>

    <el-dialog title="退货单详情" :visible.sync="detailVisible" width="980px">
      <div v-if="current">
        <p><strong>退货单号：</strong>{{ current.returnNo || '-' }} &nbsp; <strong>客户：</strong>{{ getCustomerDisplay(current.customer) }}</p>
        <p><strong>退货日期：</strong>{{ current.returnDate || '-' }} &nbsp; <strong>状态：</strong>{{ getStatusText(current.status) }}</p>
        <p><strong>退货原因：</strong>{{ current.reason || '-' }}</p>
        <el-table :data="current.items || []" border stripe>
          <el-table-column type="index" width="55" align="center" />
          <el-table-column prop="orderNo" label="订单号" min-width="120" />
          <el-table-column prop="materialCode" label="料号" min-width="130" />
          <el-table-column label="规格" min-width="150">
            <template slot-scope="scope">{{ formatSpecWithUnit(scope.row) }}</template>
          </el-table-column>
          <el-table-column prop="rolls" label="退货卷数" width="90" align="right" />
          <el-table-column label="退货面积(m²)" width="110" align="right">
            <template slot-scope="scope">{{ formatNumber(scope.row.sqm) }}</template>
          </el-table-column>
          <el-table-column label="金额" width="100" align="right">
            <template slot-scope="scope">{{ formatNumber(scope.row.amount) }}</template>
          </el-table-column>
          <el-table-column prop="remark" label="备注" min-width="120" show-overflow-tooltip />
        </el-table>
      </div>
      <span slot="footer">
        <el-button @click="detailVisible = false">关闭</el-button>
      </span>
    </el-dialog>

    <el-dialog title="退货审计日志" :visible.sync="auditVisible" width="960px">
      <div style="margin-bottom:8px">退货单号：{{ auditReturnNo || '-' }}</div>
      <el-table v-loading="auditLoading" :data="auditList" border stripe>
        <el-table-column type="index" label="序号" width="60" align="center" :index="auditIndexMethod" />
        <el-table-column prop="actionType" label="动作" width="100" align="center">
          <template slot-scope="scope">
            <el-tag size="mini" :type="getAuditTagType(scope.row.actionType)">{{ getAuditActionText(scope.row.actionType) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态变化" min-width="150" align="center">
          <template slot-scope="scope">{{ (scope.row.beforeStatus || '-') + ' → ' + (scope.row.afterStatus || '-') }}</template>
        </el-table-column>
        <el-table-column prop="operator" label="操作人" width="100" />
        <el-table-column prop="detail" label="描述" min-width="220" show-overflow-tooltip />
        <el-table-column prop="createdAt" label="时间" width="170">
          <template slot-scope="scope">{{ formatDateTime(scope.row.createdAt) }}</template>
        </el-table-column>
      </el-table>
      <div class="mt12" style="text-align:right">
        <el-pagination
          :current-page="auditPageNum"
          :page-size="auditPageSize"
          :page-sizes="[10,20,50]"
          layout="sizes, prev, pager, next, jumper, ->, total"
          :total="Number(auditTotal)"
          @size-change="onAuditSizeChange"
          @current-change="onAuditCurrentChange"
        />
      </div>
      <span slot="footer">
        <el-button @click="auditVisible = false">关闭</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import { getSalesReturns, getSalesReturnDetail, getSalesReturnAuditLogs, createInboundRequestsFromReturn } from '@/api/salesReturn'
import { getCustomerList } from '@/api/customer'

export default {
  name: 'ReturnInboundReview',
  data() {
    return {
      loading: false,
      list: [],
      total: 0,
      currentPage: 1,
      pageSize: 10,
      searchForm: {
        returnNo: '',
        customer: '',
        status: '',
        startDate: '',
        endDate: ''
      },
      customers: [],
      detailVisible: false,
      current: null,
      auditVisible: false,
      auditLoading: false,
      auditReturnNo: '',
      auditList: [],
      auditTotal: 0,
      auditPageNum: 1,
      auditPageSize: 10
    }
  },
  created() {
    this.fetchCustomers()
    this.fetchList()
  },
  methods: {
    async fetchCustomers() {
      try {
        const res = await getCustomerList({ size: 1000 })
        if (res && (res.code === 200 || res.code === 20000)) {
          const data = res.data
          this.customers = (data && data.records) || (Array.isArray(data) ? data : [])
        }
      } catch (e) {
        this.customers = []
      }
    },
    async fetchList() {
      this.loading = true
      try {
        const res = await getSalesReturns({
          pageNum: this.currentPage,
          pageSize: this.pageSize,
          returnNo: this.searchForm.returnNo || undefined,
          customer: this.searchForm.customer || undefined,
          status: this.searchForm.status || undefined,
          startDate: this.searchForm.startDate || undefined,
          endDate: this.searchForm.endDate || undefined
        })
        if (res && (res.code === 200 || res.code === 20000)) {
          const data = res.data || {}
          this.list = data.list || []
          this.total = Number(data.total || 0)
        }
      } finally {
        this.loading = false
      }
    },
    handleSearch() {
      this.currentPage = 1
      this.fetchList()
    },
    handleReset() {
      this.searchForm = { returnNo: '', customer: '', status: '', startDate: '', endDate: '' }
      this.handleSearch()
    },
    onSizeChange(v) {
      this.pageSize = v
      this.fetchList()
    },
    onCurrentChange(v) {
      this.currentPage = v
      this.fetchList()
    },
    indexMethod(i) {
      return (this.currentPage - 1) * this.pageSize + i + 1
    },
    getStatusText(status) {
      const map = { draft: '草稿', confirmed: '已确认', cancelled: '已取消' }
      return map[status] || status || '-'
    },
    getStatusTagType(status) {
      const map = { draft: 'info', confirmed: 'success', cancelled: 'danger' }
      return map[status] || 'info'
    },
    getCustomerDisplay(customerCode) {
      if (!customerCode) return '-'
      const customer = (this.customers || []).find(item => item.customerCode === customerCode)
      return (customer && (customer.shortName || customer.customerName)) || customerCode
    },
    formatNumber(value) {
      if (value === null || value === undefined || value === '') return '0.00'
      const n = Number(value)
      return Number.isFinite(n) ? n.toFixed(2) : '0.00'
    },
    formatDateTime(dateText) {
      if (!dateText) return '-'
      const d = new Date(dateText)
      if (!Number.isNaN(d.getTime())) {
        const yyyy = d.getFullYear()
        const mm = String(d.getMonth() + 1).padStart(2, '0')
        const dd = String(d.getDate()).padStart(2, '0')
        const hh = String(d.getHours()).padStart(2, '0')
        const mi = String(d.getMinutes()).padStart(2, '0')
        const ss = String(d.getSeconds()).padStart(2, '0')
        return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`
      }
      return String(dateText)
    },
    formatSpecWithUnit(row) {
      if (!row) return '-'
      const t = row.thickness === null || row.thickness === undefined || row.thickness === '' ? '0' : String(row.thickness).trim()
      const w = row.width === null || row.width === undefined || row.width === '' ? '0' : String(row.width).trim()
      const l = row.length === null || row.length === undefined || row.length === '' ? '0' : String(row.length).trim()
      return `${t}μm*${w}mm*${l}m`
    },
    canCreateInbound(row) {
      return !!row && String(row.status || '').toLowerCase() === 'confirmed'
    },
    async viewDetail(row) {
      if (!row || !row.returnNo) return
      const res = await getSalesReturnDetail(row.returnNo)
      if (res && (res.code === 200 || res.code === 20000)) {
        this.current = res.data || null
        this.detailVisible = true
      } else {
        this.$message.error((res && (res.msg || res.message)) || '获取详情失败')
      }
    },
    async createInboundFromReturn(row) {
      if (!row || !row.returnNo) return
      try {
        await this.$confirm(`确认将退货单 ${row.returnNo} 生成入库申请吗？`, '提示', { type: 'warning' })
      } catch (e) {
        return
      }
      const res = await createInboundRequestsFromReturn(row.returnNo)
      if (res && (res.code === 200 || res.code === 20000)) {
        const data = res.data || {}
        const created = Number(data.createdCount || 0)
        const skipped = Number(data.skippedCount || 0)
        this.$message.success(`处理完成：新增${created}条，跳过${skipped}条`)
      } else {
        this.$message.error((res && (res.msg || res.message)) || '生成入库申请失败')
      }
    },
    getAuditActionText(actionType) {
      const map = { CREATE: '创建', UPDATE: '更新', DELETE: '删除' }
      return map[actionType] || actionType || '-'
    },
    getAuditTagType(actionType) {
      const map = { CREATE: 'success', UPDATE: 'warning', DELETE: 'danger' }
      return map[actionType] || 'info'
    },
    auditIndexMethod(i) {
      return (this.auditPageNum - 1) * this.auditPageSize + i + 1
    },
    async openAudit(row) {
      this.auditReturnNo = (row && row.returnNo) || ''
      this.auditPageNum = 1
      this.auditVisible = true
      await this.fetchAuditLogs()
    },
    async fetchAuditLogs() {
      if (!this.auditReturnNo) {
        this.auditList = []
        this.auditTotal = 0
        return
      }
      this.auditLoading = true
      try {
        const res = await getSalesReturnAuditLogs({
          returnNo: this.auditReturnNo,
          pageNum: this.auditPageNum,
          pageSize: this.auditPageSize
        })
        if (res && (res.code === 200 || res.code === 20000)) {
          const data = res.data || {}
          this.auditList = data.list || []
          this.auditTotal = Number(data.total || 0)
        } else {
          this.auditList = []
          this.auditTotal = 0
          this.$message.error((res && (res.msg || res.message)) || '获取审计日志失败')
        }
      } catch (e) {
        this.auditList = []
        this.auditTotal = 0
        this.$message.error('获取审计日志失败，请稍后重试')
      } finally {
        this.auditLoading = false
      }
    },
    onAuditSizeChange(v) {
      this.auditPageSize = v
      this.auditPageNum = 1
      this.fetchAuditLogs()
    },
    onAuditCurrentChange(v) {
      this.auditPageNum = v
      this.fetchAuditLogs()
    },
    goInboundPage() {
      this.$router.push({ path: '/stock/inbound' })
    }
  }
}
</script>

<style scoped>
.mb12 { margin-bottom: 12px; }
.mt12 { margin-top: 12px; }
</style>
