<template>
  <div class="dashboard-editor-container">

    <panel-group :summary="summary" />

    <el-row :gutter="32" style="margin-top: 12px;">
      <el-col :xs="24" :sm="24" :lg="16">
        <div class="chart-wrapper">
          <div class="chart-title">当年销售额趋势</div>
          <line-chart :chart-data="yearTrend" height="320px" />
        </div>
      </el-col>
      <el-col :xs="24" :sm="24" :lg="8">
        <div class="chart-wrapper">
          <div class="chart-title">前十大客户下单统计</div>
          <bar-chart :categories="topCustomers.categories" :series-data="topCustomers.data" height="320px" series-name="下单金额" />
        </div>
      </el-col>
    </el-row>

    <el-row :gutter="16">
      <el-col :xs="24" :sm="12" :lg="8">
        <div class="stat-card">
          <div class="label">出货量统计（当年）</div>
          <div class="value">{{ shipmentStats.shipped }} 单</div>
          <div class="sub">已出货</div>
        </div>
      </el-col>
      <el-col :xs="24" :sm="12" :lg="8">
        <div class="stat-card">
          <div class="label">未出货统计</div>
          <div class="value">{{ shipmentStats.pending }} 单</div>
          <div class="sub">待出货</div>
        </div>
      </el-col>
      <el-col :xs="24" :sm="12" :lg="8">
        <div class="stat-card">
          <div class="label">逾期客户统计</div>
          <div class="value">{{ shipmentStats.overdue }} 户</div>
          <div class="sub">逾期未出货客户</div>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script>
import PanelGroup from './components/PanelGroup'
import LineChart from './components/LineChart'
import BarChart from './components/BarChart'
import { getSalesSummary, getSalesTopCustomers, getSalesYearTrend, getSalesShipmentStats } from '@/api/dashboard'

export default {
  name: 'DashboardAdmin',
  components: {
    PanelGroup,
    LineChart,
    BarChart
  },
  data() {
    return {
      summary: { customerTotal: 0, todayAmount: 0, monthAmount: 0, yearAmount: 0 },
      yearTrend: { xAxis: [], series: [] },
      topCustomers: { categories: [], data: [] },
      shipmentStats: { shipped: 0, pending: 0, overdue: 0 }
    }
  },
  created() {
    this.loadDashboard()
  },
  methods: {
    async loadDashboard() {
      try {
        const [summaryRes, topRes, trendRes, shipmentRes] = await Promise.all([
          getSalesSummary(),
          getSalesTopCustomers(),
          getSalesYearTrend(),
          getSalesShipmentStats()
        ])
        this.summary = this.normalizeSummary(summaryRes && summaryRes.data)
        this.topCustomers = this.normalizeTop(topRes && topRes.data)
        this.yearTrend = this.normalizeTrend(trendRes && trendRes.data)
        this.shipmentStats = this.normalizeShipment(shipmentRes && shipmentRes.data)
      } catch (e) {
        // 后端未就绪时用兜底数据，避免空白
        this.summary = { customerTotal: 120, todayAmount: 36500, monthAmount: 820000, yearAmount: 9600000 }
        this.topCustomers = { categories: ['客户A', '客户B', '客户C', '客户D', '客户E'], data: [220, 190, 160, 140, 120] }
        this.yearTrend = { xAxis: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'], series: [{ name: '销售额', data: [800, 820, 900, 950, 970, 1100, 1200, 1300, 1280, 1400, 1500, 1600] }] }
        this.shipmentStats = { shipped: 520, pending: 48, overdue: 16 }
      }
    },
    normalizeSummary(data = {}) {
      return {
        customerTotal: Number(data.customerTotal || data.customers || 0),
        todayAmount: Number(data.todayAmount || data.today || 0),
        monthAmount: Number(data.monthAmount || data.month || 0),
        yearAmount: Number(data.yearAmount || data.year || 0)
      }
    },
    normalizeTop(data = []) {
      const categories = []
      const values = []
      (data || []).slice(0, 10).forEach(item => {
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
        shipped: Number(data.shipped || 0),
        pending: Number(data.pending || data.unshipped || 0),
        overdue: Number(data.overdue || data.overdueCustomers || 0)
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.dashboard-editor-container {
  padding: 32px;
  background-color: rgb(240, 242, 245);
  position: relative;

  .github-corner {
    position: absolute;
    top: 0px;
    border: 0;
    right: 0;
  }

  .chart-wrapper {
    background: #fff;
    padding: 16px 16px 0;
    margin-bottom: 32px;
  }

  .chart-title {
    font-size: 15px;
    font-weight: 600;
    margin-bottom: 8px;
  }

  .stat-card {
    background: #fff;
    padding: 16px;
    border-radius: 6px;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
    margin-bottom: 16px;
    .label { color: #888; font-size: 13px; }
    .value { font-size: 24px; font-weight: 700; margin: 6px 0; }
    .sub { color: #aaa; font-size: 12px; }
  }
}

@media (max-width:1024px) {
  .chart-wrapper {
    padding: 8px;
  }
}
</style>
