<template>
  <div class="dashboard-editor-container">

    <el-row :gutter="12" class="dashboard-filter-row">
      <el-col :xs="24" :sm="12" :lg="6">
        <el-select v-model="filters.salesUserId" filterable clearable size="small" placeholder="筛选业务员" style="width:100%" :disabled="isSalesLocked" @change="handleFilterChange">
          <el-option v-for="user in salesUserOptions" :key="user.id" :label="user.realName || user.username" :value="user.id" />
        </el-select>
      </el-col>
      <el-col :xs="24" :sm="12" :lg="6">
        <el-select v-model="filters.documentationUserId" filterable clearable size="small" placeholder="筛选跟单员" style="width:100%" :disabled="isDocumentationLocked" @change="handleFilterChange">
          <el-option v-for="user in documentationUserOptions" :key="user.id" :label="user.realName || user.username" :value="user.id" />
        </el-select>
      </el-col>
    </el-row>

    <panel-group :summary="summary" @today-click="openTodayOrderDialog" />

    <el-row :gutter="12" style="margin-top: 4px;">
      <el-col :xs="24" :sm="24" :lg="12">
        <div class="chart-wrapper">
          <div class="chart-title">当年销售额趋势</div>
          <line-chart :chart-data="yearTrend" height="290px" />
        </div>
      </el-col>
      <el-col :xs="24" :sm="24" :lg="12">
        <div class="chart-wrapper">
          <div class="chart-title">前十大客户年下单统计</div>
          <bar-chart :categories="topCustomers.categories" :series-data="topCustomers.data" height="290px" series-name="下单金额" />
        </div>
      </el-col>
    </el-row>

    <el-row :gutter="16" class="stats-row">
      <el-col :xs="24" :sm="12" :lg="8">
        <div class="stat-card">
          <div class="label">出货量统计（当月）</div>
          <div class="value">{{ formatWanArea(shipmentStats.monthCompletedArea) }} 万㎡</div>
          <div class="sub">当月已完成订单平米数</div>
        </div>
      </el-col>
      <el-col :xs="24" :sm="12" :lg="8">
        <div class="stat-card">
          <div class="label">订单完成统计（当年）</div>
          <div class="value">{{ formatWanArea(shipmentStats.completedArea) }} 万㎡</div>
          <div class="sub">当年订单完成万平米数</div>
        </div>
      </el-col>
      <el-col :xs="24" :sm="12" :lg="8">
        <div class="stat-card">
          <div class="label">未出货统计（当年）</div>
          <div class="value">{{ formatWanArea(shipmentStats.unshippedArea) }} 万㎡</div>
          <div class="sub">当年订单未出货万平米数</div>
        </div>
      </el-col>
    </el-row>

    <el-dialog title="今日下单明细" :visible.sync="todayOrderDialogVisible" width="980px">
      <el-table v-loading="todayOrderLoading" :data="todayOrderItems" stripe style="width:100%">
        <el-table-column prop="customerName" label="客户简称" width="140" show-overflow-tooltip />
        <el-table-column prop="materialCode" label="物料代码" width="180" show-overflow-tooltip />
        <el-table-column label="规格" width="200">
          <template slot-scope="scope">{{ formatSpec(scope.row) }}</template>
        </el-table-column>
        <el-table-column prop="sqm" label="平米数" width="110" align="right">
          <template slot-scope="scope">{{ formatNumber(scope.row.sqm) }}</template>
        </el-table-column>
        <el-table-column prop="amount" label="金额" width="120" align="right">
          <template slot-scope="scope">{{ formatNumber(scope.row.amount) }}</template>
        </el-table-column>
      </el-table>
      <span slot="footer">
        <el-button @click="todayOrderDialogVisible = false">关闭</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import PanelGroup from './components/PanelGroup'
import LineChart from './components/LineChart'
import BarChart from './components/BarChart'
import { getSalesSummary, getSalesTopCustomers, getSalesYearTrend, getSalesShipmentStats, getSalesTodayOrders } from '@/api/dashboard'
import { getUsersSimple } from '@/api/user'
import { mapGetters } from 'vuex'
import { getToken } from '@/utils/auth'

export default {
  name: 'DashboardAdmin',
  components: {
    PanelGroup,
    LineChart,
    BarChart
  },
  computed: {
    ...mapGetters(['roles', 'userProfile', 'name', 'realName']),
    isSalesLocked() {
      if (this.userIdentityByCustomer === 'sales') return true
      if (this.userIdentityByCustomer === 'documentation') return false
      return !this.isAdminRole() && this.hasSalesRole && !this.hasDocumentationRole
    },
    isDocumentationLocked() {
      if (this.userIdentityByCustomer === 'documentation') return true
      if (this.userIdentityByCustomer === 'sales') return false
      return !this.isAdminRole() && this.hasDocumentationRole && !this.hasSalesRole
    },
    hasSalesRole() {
      return this.isSalesRole()
    },
    hasDocumentationRole() {
      return this.isDocumentationRole()
    }
  },
  data() {
    return {
      summary: { customerTotal: 0, todayAmount: 0, monthAmount: 0, yearAmount: 0, todayArea: 0, monthArea: 0, yearArea: 0 },
      yearTrend: { xAxis: [], series: [] },
      topCustomers: { categories: [], data: [] },
      shipmentStats: { shippedArea: 0, completedArea: 0, unshippedArea: 0, monthCompletedArea: 0 },
      todayOrderDialogVisible: false,
      todayOrderItems: [],
      todayOrderLoading: false,
      salesUserOptions: [],
      documentationUserOptions: [],
      userIdentityByCustomer: '',
      filters: {
        salesUserId: null,
        documentationUserId: null
      },
      appMainOriginOverflowX: '',
      appMainOriginOverflowY: '',
      refreshTimer: null,
      refreshIntervalMs: 30000
    }
  },
  created() {
    this.applyRoleDefaults()
    this.loadUserOptions()
    this.loadDashboard()
  },
  activated() {
    this.lockDashboardViewport()
    this.loadDashboard()
    this.startAutoRefresh()
  },
  deactivated() {
    this.stopAutoRefresh()
    this.restoreDashboardViewport()
  },
  mounted() {
    this.lockDashboardViewport()
    this.startAutoRefresh()
    document.addEventListener('visibilitychange', this.handleVisibilityChange)
    window.addEventListener('focus', this.handleWindowFocus)
    window.addEventListener('dashboard:refresh', this.handleDashboardRefresh)
  },
  beforeDestroy() {
    this.stopAutoRefresh()
    document.removeEventListener('visibilitychange', this.handleVisibilityChange)
    window.removeEventListener('focus', this.handleWindowFocus)
    window.removeEventListener('dashboard:refresh', this.handleDashboardRefresh)
    this.restoreDashboardViewport()
  },
  methods: {
    startAutoRefresh() {
      this.stopAutoRefresh()
      this.refreshTimer = setInterval(() => {
        this.loadDashboard()
      }, this.refreshIntervalMs)
    },
    stopAutoRefresh() {
      if (this.refreshTimer) {
        clearInterval(this.refreshTimer)
        this.refreshTimer = null
      }
    },
    handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        this.loadDashboard()
      }
    },
    handleWindowFocus() {
      this.loadDashboard()
    },
    handleDashboardRefresh() {
      this.loadDashboard()
    },
    lockDashboardViewport() {
      const appMain = document.querySelector('.app-main')
      if (!appMain) return
      this.appMainOriginOverflowX = appMain.style.overflowX
      this.appMainOriginOverflowY = appMain.style.overflowY
      appMain.style.overflowX = 'hidden'
      appMain.style.overflowY = 'hidden'
    },
    restoreDashboardViewport() {
      const appMain = document.querySelector('.app-main')
      if (!appMain) return
      appMain.style.overflowX = this.appMainOriginOverflowX || ''
      appMain.style.overflowY = this.appMainOriginOverflowY || ''
    },
    async loadDashboard() {
      if (!getToken()) {
        this.useFallbackData()
        return
      }
      try {
        const params = this.buildFilterParams()
        const [summaryRes, topRes, trendRes, shipmentRes] = await Promise.all([
          getSalesSummary(params),
          getSalesTopCustomers(params),
          getSalesYearTrend(params),
          getSalesShipmentStats(params)
        ])
        this.summary = this.normalizeSummary(summaryRes && summaryRes.data)
        this.topCustomers = this.normalizeTop(topRes && topRes.data)
        this.yearTrend = this.normalizeTrend(trendRes && trendRes.data)
        this.shipmentStats = this.normalizeShipment(shipmentRes && shipmentRes.data)
      } catch (e) {
        this.useFallbackData()
      }
    },
    async loadUserOptions() {
      try {
        const isAdmin = this.isAdminRole()
        const currentUserOption = this.getCurrentUserOption()
        const currentUserId = this.getCurrentUserId()

        if (isAdmin) {
          const [salesRes, docRes] = await Promise.all([
            getUsersSimple({ size: 1000, source: 'customer', roleType: 'sales' }),
            getUsersSimple({ size: 1000, source: 'customer', roleType: 'documentation' })
          ])
          this.salesUserOptions = this.extractSimpleUserList(salesRes)
          this.documentationUserOptions = this.extractSimpleUserList(docRes)
          this.userIdentityByCustomer = ''
          return
        }

        const [selfSalesRes, selfDocRes] = await Promise.all([
          getUsersSimple({ size: 1000, source: 'customer', roleType: 'sales', ownerScope: 'self' }),
          getUsersSimple({ size: 1000, source: 'customer', roleType: 'documentation', ownerScope: 'self' })
        ])

        const relatedSalesList = this.extractSimpleUserList(selfSalesRes) // 跟单账号可选的业务员
        const relatedDocList = this.extractSimpleUserList(selfDocRes) // 销售账号可选的跟单员
        const hasRelatedSales = relatedSalesList.length > 0
        const hasRelatedDocs = relatedDocList.length > 0

        if (hasRelatedDocs && !hasRelatedSales) {
          this.userIdentityByCustomer = 'sales'
          this.salesUserOptions = currentUserOption ? [currentUserOption] : []
          this.documentationUserOptions = relatedDocList
          this.filters.salesUserId = currentUserId || null
          if (this.filters.documentationUserId && !relatedDocList.some(u => String(u.id) === String(this.filters.documentationUserId))) {
            this.filters.documentationUserId = null
          }
        } else if (hasRelatedSales && !hasRelatedDocs) {
          this.userIdentityByCustomer = 'documentation'
          this.documentationUserOptions = currentUserOption ? [currentUserOption] : []
          this.salesUserOptions = relatedSalesList
          this.filters.documentationUserId = currentUserId || null
          if (this.filters.salesUserId && !relatedSalesList.some(u => String(u.id) === String(this.filters.salesUserId))) {
            this.filters.salesUserId = null
          }
        } else {
          // 兜底：按角色判断，避免身份识别失败时筛选逻辑混乱
          if (this.hasDocumentationRole && !this.hasSalesRole) {
            this.userIdentityByCustomer = 'documentation'
            this.documentationUserOptions = currentUserOption ? [currentUserOption] : []
            this.salesUserOptions = relatedSalesList
            this.filters.documentationUserId = currentUserId || null
          } else if (this.hasSalesRole && !this.hasDocumentationRole) {
            this.userIdentityByCustomer = 'sales'
            this.salesUserOptions = currentUserOption ? [currentUserOption] : []
            this.documentationUserOptions = relatedDocList
            this.filters.salesUserId = currentUserId || null
          } else {
            this.userIdentityByCustomer = ''
            this.salesUserOptions = relatedSalesList
            this.documentationUserOptions = relatedDocList
          }
        }

        this.loadDashboard()
      } catch (e) {
        this.salesUserOptions = []
        this.documentationUserOptions = []
        this.userIdentityByCustomer = ''
      }
    },
    extractSimpleUserList(res) {
      const data = res && res.data ? res.data : {}
      return Array.isArray(data.records) ? data.records : (Array.isArray(data.list) ? data.list : [])
    },
    applyRoleDefaults() {
      const currentUserId = this.getCurrentUserId()
      if (this.isSalesLocked && currentUserId) {
        this.filters.salesUserId = currentUserId
      }
      if (this.isDocumentationLocked && currentUserId) {
        this.filters.documentationUserId = currentUserId
      }
    },
    getCurrentUserId() {
      const profile = this.userProfile || {}
      return profile.id || null
    },
    getCurrentUserOption() {
      const profile = this.userProfile || {}
      const id = profile.id
      if (!id) return null
      return {
        id,
        username: profile.name || profile.username || this.name || '',
        realName: profile.realName || this.realName || ''
      }
    },
    isAdminRole() {
      const roles = (this.roles || []).map(r => String(r).toLowerCase())
      return roles.includes('admin')
    },
    isSalesRole() {
      const roles = (this.roles || []).map(r => String(r).toLowerCase())
      return roles.some(r => r.includes('sales') || r.includes('sale') || r.includes('业务') || r.includes('销售'))
    },
    isDocumentationRole() {
      const roles = (this.roles || []).map(r => String(r).toLowerCase())
      return roles.some(r => r.includes('documentation') || r.includes('doc') || r.includes('跟单'))
    },
    handleFilterChange() {
      this.loadDashboard()
    },
    buildFilterParams() {
      const params = {}
      if (this.filters.salesUserId) params.salesUserId = this.filters.salesUserId
      if (this.filters.documentationUserId) params.documentationUserId = this.filters.documentationUserId
      return params
    },
    async openTodayOrderDialog() {
      this.todayOrderDialogVisible = true
      this.todayOrderLoading = true
      try {
        const res = await getSalesTodayOrders(this.buildFilterParams())
        const data = (res && (res.data || res)) || []
        this.todayOrderItems = Array.isArray(data) ? data : []
      } catch (e) {
        this.todayOrderItems = []
      } finally {
        this.todayOrderLoading = false
      }
    },
    useFallbackData() {
      // 后端未就绪时用兜底数据，避免空白
      this.summary = { customerTotal: 120, todayAmount: 36500, monthAmount: 820000, yearAmount: 9600000, todayArea: 0, monthArea: 0, yearArea: 0 }
      this.topCustomers = { categories: ['客户A', '客户B', '客户C', '客户D', '客户E'], data: [220, 190, 160, 140, 120] }
      this.yearTrend = { xAxis: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'], series: [{ name: '销售额', data: [800, 820, 900, 950, 970, 1100, 1200, 1300, 1280, 1400, 1500, 1600] }] }
      this.shipmentStats = { shippedArea: 0, completedArea: 0, unshippedArea: 0, monthCompletedArea: 0 }
    },
    normalizeSummary(data = {}) {
      const source = (data && data.data && data.todayAmount === undefined) ? data.data : data
      const toNumber = (value) => {
        const num = Number(value)
        return Number.isFinite(num) ? num : 0
      }
      return {
        customerTotal: toNumber(source && (source.customerTotal ?? source.customers)),
        todayAmount: toNumber(source && (source.todayAmount ?? source.today)),
        monthAmount: toNumber(source && (source.monthAmount ?? source.month)),
        yearAmount: toNumber(source && (source.yearAmount ?? source.year)),
        todayArea: toNumber(source && (source.todayArea ?? source.todayOrderArea ?? source.todaySqm)),
        monthArea: toNumber(source && (source.monthArea ?? source.monthOrderArea ?? source.monthSqm)),
        yearArea: toNumber(source && (source.yearArea ?? source.yearOrderArea ?? source.yearSqm))
      }
    },
    normalizeTop(data = []) {
      const categories = []
      const values = []
      ;(data || []).slice(0, 10).forEach(item => {
        categories.push(item.customerName || item.name || '-')
        values.push(Number(item.amount || item.value || 0))
      })
      return { categories, data: values }
    },
    normalizeTrend(data = {}) {
      const xAxis = data.months || data.labels || []
      const series = [{ name: '销售额', data: data.amounts || data.values || [] }]
      return { xAxis, series }
    },
    normalizeShipment(data = {}) {
      return {
        shippedArea: Number(data.shippedArea || data.shipped || 0),
        completedArea: Number(data.completedArea || 0),
        unshippedArea: Number(data.unshippedArea || data.pending || data.unshipped || 0),
        monthCompletedArea: Number(data.monthCompletedArea || 0)
      }
    },
    formatSpec(row = {}) {
      const t = row.thickness !== undefined && row.thickness !== null && row.thickness !== '' ? row.thickness : '-'
      const w = row.width !== undefined && row.width !== null && row.width !== '' ? row.width : '-'
      const l = row.length !== undefined && row.length !== null && row.length !== '' ? row.length : '-'
      return `${t}*${w}*${l}`
    },
    formatNumber(value) {
      const num = Number(value)
      if (!Number.isFinite(num)) return '0.00'
      return num.toFixed(2)
    },
    formatWanArea(value) {
      return (Number(value || 0) / 10000).toLocaleString('zh-CN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
    },
    formatArea(value) {
      return Number(value || 0).toLocaleString('zh-CN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.dashboard-editor-container {
  padding: 10px 12px;
  background-color: rgb(240, 242, 245);
  position: relative;
  height: calc(100vh - 96px);
  overflow-x: hidden;
  overflow-y: auto;

  .dashboard-filter-row {
    margin-bottom: 8px;
  }

  .github-corner {
    position: absolute;
    top: 0px;
    border: 0;
    right: 0;
  }

  .chart-wrapper {
    background: #fff;
    padding: 8px 10px 6px;
    margin-bottom: 12px;
  }

  .chart-title {
    font-size: 14px;
    font-weight: 600;
    line-height: 1.2;
    margin-bottom: 4px;
  }

  .stats-row {
    margin-top: 14px;
    position: relative;
    top: -60px;
  }

  .stat-card {
    background: #fff;
    padding: 10px 12px;
    border-radius: 6px;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
    margin-bottom: 8px;
    .label { color: #888; font-size: 13px; }
    .value { font-size: 18px; font-weight: 700; margin: 4px 0; }
    .sub { color: #aaa; font-size: 12px; }
  }
}

@media (max-width:1024px) {
  .chart-wrapper {
    padding: 8px;
  }
}
</style>
