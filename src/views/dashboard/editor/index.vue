<template>
  <div class="dashboard-editor-container">
    <production-panel-group :summary="summary" />

    <el-row :gutter="12" style="margin-top: 4px;">
      <el-col :xs="24" :sm="24" :lg="12">
        <div class="chart-wrapper">
          <div class="chart-title">当年生产报工趋势</div>
          <line-chart :chart-data="yearTrend" :unit-label="'万㎡'" height="290px" />
        </div>
      </el-col>
      <el-col :xs="24" :sm="24" :lg="12">
        <div class="chart-wrapper">
          <div class="chart-title">工序报工排行（当年）</div>
          <bar-chart :categories="topProcesses.categories" :series-data="topProcesses.data" :series-name="'报工面积'" :unit-label="'万㎡'" height="290px" />
        </div>
      </el-col>
    </el-row>

    <el-row :gutter="16" class="stats-row">
      <el-col :xs="24" :sm="12" :lg="4">
        <div class="stat-card">
          <div class="label">当班今日报工卷数</div>
          <div class="value">{{ formatNumber(summary.todayQty, 0) }}</div>
        </div>
      </el-col>
      <el-col :xs="24" :sm="12" :lg="4">
        <div class="stat-card">
          <div class="label">当班本月报工卷数</div>
          <div class="value">{{ formatNumber(summary.monthQty, 0) }}</div>
        </div>
      </el-col>
      <el-col :xs="24" :sm="12" :lg="4">
        <div class="stat-card">
          <div class="label">当班当年报工卷数</div>
          <div class="value">{{ formatNumber(summary.yearQty, 0) }}</div>
        </div>
      </el-col>
      <el-col :xs="24" :sm="12" :lg="4">
        <div class="stat-card">
          <div class="label">当班今日报工(万㎡)</div>
          <div class="value">{{ formatWanArea(summary.todayArea) }}</div>
        </div>
      </el-col>
      <el-col :xs="24" :sm="12" :lg="4">
        <div class="stat-card">
          <div class="label">当班本月报工(万㎡)</div>
          <div class="value">{{ formatWanArea(summary.monthArea) }}</div>
        </div>
      </el-col>
      <el-col :xs="24" :sm="12" :lg="4">
        <div class="stat-card">
          <div class="label">当班当年报工(万㎡)</div>
          <div class="value">{{ formatWanArea(summary.yearArea) }}</div>
        </div>
      </el-col>
    </el-row>

    <el-row :gutter="12" style="margin-top: -40px;">
      <el-col :xs="24" :sm="24" :lg="24">
        <div class="chart-wrapper">
          <div class="chart-title">今日报工明细（按班次时间窗口）</div>
          <el-table v-loading="todayReportsLoading" :data="todayReports" size="mini" stripe style="width:100%">
            <el-table-column prop="reportTime" label="报工时间" width="140" align="center" />
            <el-table-column prop="orderNo" label="订单号" width="120" />
            <el-table-column prop="materialCode" label="料号" width="140" show-overflow-tooltip />
            <el-table-column prop="specDesc" label="规格" min-width="180" show-overflow-tooltip />
            <el-table-column prop="outputQty" label="卷数" width="80" align="right" />
            <el-table-column prop="outputSqm" label="平米数" width="100" align="right" />
            <el-table-column prop="taskType" label="工序" width="90" align="center">
              <template slot-scope="scope">
                {{ getProcessText(scope.row.taskType) }}
              </template>
            </el-table-column>
            <el-table-column prop="staffName" label="报工人" width="100" align="center" />
            <el-table-column prop="shiftCode" label="班次" width="70" align="center" />
          </el-table>
          <pagination
            v-show="pagination.total > 0"
            :total="pagination.total"
            :page.sync="pagination.pageNum"
            :limit.sync="pagination.pageSize"
            style="padding: 10px 0; margin-top: 0;"
            @pagination="fetchTodayReports"
          />
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'
import ProductionPanelGroup from './components/ProductionPanelGroup'
import LineChart from '../admin/components/LineChart'
import BarChart from '../admin/components/BarChart'
import Pagination from '@/components/Pagination'
import { getProductionSummary, getProductionTopProcesses, getProductionYearTrend, getProductionTodayReports } from '@/api/dashboard'

export default {
  name: 'DashboardEditor',
  components: {
    ProductionPanelGroup,
    LineChart,
    BarChart,
    Pagination
  },
  computed: {
    ...mapGetters(['workGroup']),
    currentGroupCode() {
      const raw = String(this.workGroup || '').trim().toUpperCase().replace(/班$/g, '')
      return raw || ''
    }
  },
  data() {
    return {
      summary: {
        shiftCode: '',
        todayArea: 0,
        monthArea: 0,
        yearArea: 0,
        todayQty: 0,
        monthQty: 0,
        yearQty: 0,
        todayReportCount: 0
      },
      topProcesses: { categories: [], data: [] },
      yearTrend: { xAxis: [], series: [] },
      todayReports: [],
      todayReportsLoading: false,
      pagination: {
        pageNum: 1,
        pageSize: 15,
        total: 0
      },
      dashboardLoading: false,
      refreshTimer: null,
      refreshIntervalMs: 30000
    }
  },
  created() {
    this.loadDashboard()
  },
  mounted() {
    this.startAutoRefresh()
    window.addEventListener('dashboard:refresh', this.handleDashboardRefresh)
    window.addEventListener('focus', this.handleDashboardRefresh)
  },
  beforeDestroy() {
    this.stopAutoRefresh()
    window.removeEventListener('dashboard:refresh', this.handleDashboardRefresh)
    window.removeEventListener('focus', this.handleDashboardRefresh)
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
    handleDashboardRefresh() {
      this.loadDashboard()
    },
    async loadDashboard() {
      if (this.dashboardLoading) return
      this.dashboardLoading = true
      try {
        const params = this.currentGroupCode ? { shiftCode: this.currentGroupCode } : {}
        const [summaryRes, topRes, trendRes] = await Promise.allSettled([
          getProductionSummary(params, { timeout: 20000 }),
          getProductionTopProcesses(params, { timeout: 20000 }),
          getProductionYearTrend(params, { timeout: 20000 })
        ])

        this.summary = summaryRes.status === 'fulfilled'
          ? this.normalizeSummary(summaryRes.value && summaryRes.value.data)
          : this.normalizeSummary()
        this.topProcesses = topRes.status === 'fulfilled'
          ? this.normalizeTop(topRes.value && topRes.value.data)
          : { categories: [], data: [] }
        this.yearTrend = trendRes.status === 'fulfilled'
          ? this.normalizeTrend(trendRes.value && trendRes.value.data)
          : { xAxis: [], series: [] }

        // 独立拉取报工明细
        this.fetchTodayReports()
      } catch (e) {
        this.useFallbackData()
      } finally {
        this.dashboardLoading = false
      }
    },
    async fetchTodayReports() {
      this.todayReportsLoading = true
      try {
        const params = {
          pageNum: this.pagination.pageNum,
          pageSize: this.pagination.pageSize
        }
        if (this.currentGroupCode) {
          params.shiftCode = this.currentGroupCode
        }
        const res = await getProductionTodayReports(params)
        if (res.code === 200 || res.code === 20000) {
          const data = res.data || {}
          this.pagination.total = Number(data.total || 0)
          this.todayReports = this.normalizeTodayReports(data.records || [])
        }
      } catch (e) {
        console.error('fetchTodayReports error:', e)
        this.todayReports = []
      } finally {
        this.todayReportsLoading = false
      }
    },
    handleSizeChange(val) {
      this.pagination.pageSize = val
      this.pagination.pageNum = 1
      this.fetchTodayReports()
    },
    handleCurrentChange(val) {
      this.pagination.pageNum = val
      this.fetchTodayReports()
    },
    normalizeSummary(data = {}) {
      const source = (data && data.data && data.todayArea === undefined) ? data.data : data
      return {
        shiftCode: String(source.shiftCode || this.currentGroupCode || '').toUpperCase(),
        todayArea: Number(source.todayArea || 0),
        monthArea: Number(source.monthArea || 0),
        yearArea: Number(source.yearArea || 0),
        todayQty: Number(source.todayQty || 0),
        monthQty: Number(source.monthQty || 0),
        yearQty: Number(source.yearQty || 0),
        todayReportCount: Number(source.todayReportCount || 0)
      }
    },
    getProcessText(type) {
      if (!type) return '-'
      const map = {
        'COATING': '涂布',
        'REWINDING': '复卷',
        'SLITTING': '分切',
        'PACKAGING': '包装',
        'FINISHING': '完工'
      }
      return map[type] || type
    },
    normalizeTop(data = []) {
      const categories = []
      const values = []
      ;(Array.isArray(data) ? data : []).slice(0, 10).forEach(item => {
        const rawName = item.processName || item.name || '-'
        categories.push(this.getProcessText(rawName))
        values.push(Number(item.totalArea || item.value || 0))
      })
      return { categories, data: values }
    },
    normalizeTrend(data = {}) {
      const xAxis = data.months || []
      const areas = data.areas || []
      return {
        xAxis,
        series: [{ name: '报工面积', data: areas }]
      }
    },
    normalizeTodayReports(data = []) {
      return (Array.isArray(data) ? data : []).map(item => ({
        ...item,
        reportTime: this.formatReportTimeToMinute(item.reportTime),
        outputQty: this.formatNumber(item.outputQty, 0),
        outputSqm: this.formatNumber(item.outputSqm, 2)
      }))
    },
    formatReportTimeToMinute(value) {
      if (!value) return ''
      const text = String(value).trim().replace('T', ' ')
      if (text.length >= 16) return text.slice(0, 16)
      return text
    },
    useFallbackData() {
      this.summary = {
        shiftCode: this.currentGroupCode || '',
        todayArea: 0,
        monthArea: 0,
        yearArea: 0,
        todayQty: 0,
        monthQty: 0,
        yearQty: 0,
        todayReportCount: 0
      }
      this.topProcesses = { categories: ['涂布', '复卷', '分切'], data: [0, 0, 0] }
      this.yearTrend = { xAxis: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'], series: [{ name: '报工面积', data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }] }
      this.todayReports = []
    },
    formatWanArea(value) {
      const n = Number(value || 0) / 10000
      return n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    },
    formatNumber(value, decimals = 2) {
      const num = Number(value)
      if (!Number.isFinite(num)) return decimals === 0 ? '0' : '0.00'
      return num.toFixed(decimals)
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
  }
}

@media (max-width:1024px) {
  .chart-wrapper {
    padding: 8px;
  }
}
</style>
