<template>
  <div class="app-container">
    <el-card shadow="never" class="mb-12">
      <div slot="header" class="card-header">
        <span>生产报表统计</span>
      </div>
      <el-form :inline="true" :model="filters" @submit.native.prevent>
        <el-form-item label="统计月份">
          <el-date-picker
            v-model="filters.month"
            type="month"
            value-format="yyyy-MM"
            placeholder="选择月份"
            style="width: 150px"
          />
        </el-form-item>
        <el-form-item label="预警阈值(%)">
          <el-input-number
            v-model="filters.yieldWarnPercent"
            :min="0"
            :max="100"
            :step="0.1"
            :precision="1"
            style="width: 130px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="el-icon-search" :loading="loading" @click="load">刷新统计</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never" class="mb-12" v-loading="loading">
      <div slot="header" class="card-header">
        <span>班组产量总览（当日 / 当月 / 当年）</span>
      </div>
      <el-row :gutter="12">
        <el-col v-for="item in shiftKpis" :key="item.shiftCode" :xs="24" :sm="12" :lg="8" class="mb-12">
          <div class="kpi-card">
            <div class="kpi-title">{{ item.shiftName }}</div>
            <div class="kpi-row">
              <span class="kpi-label">当日产量</span>
              <span class="kpi-value">{{ formatInt(item.dayTotal) }}</span>
            </div>
            <div class="kpi-sub">人均产量：{{ formatFloat(item.dayPerCapita) }}</div>
            <div class="kpi-row">
              <span class="kpi-label">当月产量</span>
              <span class="kpi-value">{{ formatInt(item.monthTotal) }}</span>
            </div>
            <div class="kpi-sub">人均产量：{{ formatFloat(item.monthPerCapita) }}</div>
            <div class="kpi-row">
              <span class="kpi-label">当年累计</span>
              <span class="kpi-value">{{ formatInt(item.yearTotal) }}</span>
            </div>
            <div class="kpi-sub">人均产量：{{ formatFloat(item.yearPerCapita) }}</div>
          </div>
        </el-col>
      </el-row>
    </el-card>

    <el-row :gutter="12" class="mb-12" v-loading="loading">
      <el-col :xs="24" :lg="12">
        <el-card shadow="never" class="h-300">
          <div slot="header" class="card-header">
            <span>当月目标达成率（补充）</span>
          </div>
          <div class="target-line">
            <div class="target-title">全厂当月目标：{{ formatInt(targetConfig.monthlyTotalTarget) }}</div>
            <el-progress :percentage="toPercentNumber(totalTargetRate)" :stroke-width="16" :text-inside="true" />
            <div class="target-sub">实际：{{ formatInt(monthSummary.total) }}，人均：{{ formatFloat(monthSummary.perCapita) }}</div>
          </div>
          <el-table :data="shiftTargetRows" border size="mini" height="170">
            <el-table-column prop="shiftName" label="班组" width="110" />
            <el-table-column prop="target" label="月目标" align="right">
              <template slot-scope="scope">{{ formatInt(scope.row.target) }}</template>
            </el-table-column>
            <el-table-column prop="actual" label="实际" align="right">
              <template slot-scope="scope">{{ formatInt(scope.row.actual) }}</template>
            </el-table-column>
            <el-table-column prop="rate" label="达成率" align="right">
              <template slot-scope="scope">{{ formatPercent(scope.row.rate) }}</template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
      <el-col :xs="24" :lg="12">
        <el-card shadow="never" class="h-300">
          <div slot="header" class="card-header">
            <span>班组当月排行（补充）</span>
          </div>
          <el-table :data="shiftRankRows" border size="mini" height="250">
            <el-table-column prop="rank" label="排名" width="70" align="center" />
            <el-table-column prop="shiftName" label="班组" width="120" />
            <el-table-column prop="monthTotal" label="月总产量" align="right">
              <template slot-scope="scope">{{ formatInt(scope.row.monthTotal) }}</template>
            </el-table-column>
            <el-table-column prop="monthPerCapita" label="月人均" align="right">
              <template slot-scope="scope">{{ formatFloat(scope.row.monthPerCapita) }}</template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="12" class="mb-12" v-loading="loading">
      <el-col :xs="24" :lg="14">
        <el-card shadow="never" class="h-420">
          <div slot="header" class="card-header">
            <span>当月每日产量趋势 & 人均产量趋势</span>
          </div>
          <div ref="monthTrendChart" class="chart-box" />
        </el-card>
      </el-col>
      <el-col :xs="24" :lg="10">
        <el-card shadow="never" class="h-420">
          <div slot="header" class="card-header">
            <span>年度趋势表（每月总量 / 人均）</span>
          </div>
          <el-table :data="yearMonthlyRows" border size="mini" height="340">
            <el-table-column prop="month" label="月份" width="80" align="center" />
            <el-table-column prop="total" label="总产量" align="right">
              <template slot-scope="scope">{{ formatInt(scope.row.total) }}</template>
            </el-table-column>
            <el-table-column prop="perCapita" label="人均产量" align="right">
              <template slot-scope="scope">{{ formatFloat(scope.row.perCapita) }}</template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>

    <el-card shadow="never" class="mb-12" v-loading="loading">
      <div slot="header" class="card-header">
        <span>异常预警（良率低于 {{ formatFloat(filters.yieldWarnPercent) }}%）</span>
        <span class="warn-count">共 {{ warningRows.length }} 天</span>
      </div>
      <el-table :data="warningRows" border size="mini" max-height="220">
        <el-table-column prop="date" label="日期" width="120" align="center" />
        <el-table-column prop="output" label="日产量" align="right">
          <template slot-scope="scope">{{ formatInt(scope.row.output) }}</template>
        </el-table-column>
        <el-table-column prop="scrap" label="报废数量" align="right">
          <template slot-scope="scope">{{ formatInt(scope.row.scrap) }}</template>
        </el-table-column>
        <el-table-column prop="yieldRate" label="良率" align="right">
          <template slot-scope="scope">
            <span class="warn-text">{{ formatPercent(scope.row.yieldRate) }}</span>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card shadow="never" v-loading="loading">
      <div slot="header" class="card-header">
        <span>当月每日报废数量与良率</span>
      </div>
      <el-table :data="dailyQualityRows" border size="small">
        <el-table-column prop="date" label="日期" width="120" align="center" />
        <el-table-column prop="output" label="日产量" align="right">
          <template slot-scope="scope">{{ formatInt(scope.row.output) }}</template>
        </el-table-column>
        <el-table-column prop="scrap" label="报废数量" align="right">
          <template slot-scope="scope">{{ formatInt(scope.row.scrap) }}</template>
        </el-table-column>
        <el-table-column prop="yieldRate" label="良率" align="right">
          <template slot-scope="scope">{{ formatPercent(scope.row.yieldRate) }}</template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script>
import echarts from 'echarts'
import { getReportList } from '@/api/schedule'

export default {
  name: 'QualityReportPage',
  data() {
    return {
      loading: false,
      filters: {
        month: '',
        yieldWarnPercent: 95
      },
      records: [],
      shiftKpis: [],
      yearMonthlyRows: [],
      dailyQualityRows: [],
      monthTrend: {
        labels: [],
        totalSeries: [],
        perCapitaSeries: []
      },
      monthTrendChart: null,
      monthSummary: {
        total: 0,
        perCapita: 0
      },
      targetConfig: {
        monthlyTotalTarget: 30000,
        shiftMonthlyTargets: {
          A: 10000,
          B: 10000,
          C: 10000
        }
      },
      totalTargetRate: 0,
      shiftTargetRows: [],
      shiftRankRows: [],
      warningRows: []
    }
  },
  mounted() {
    this.filters.month = this.currentMonthText()
    this.load()
    window.addEventListener('resize', this.handleResize)
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.handleResize)
    if (this.monthTrendChart) {
      this.monthTrendChart.dispose()
      this.monthTrendChart = null
    }
  },
  methods: {
    currentMonthText() {
      const d = new Date()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      return `${d.getFullYear()}-${m}`
    },
    toDateText(v) {
      if (!v) return ''
      const text = String(v).replace(/\//g, '-').trim()
      return text.length >= 10 ? text.substring(0, 10) : text
    },
    normalizeShiftCode(code) {
      const v = String(code || '').trim().toUpperCase()
      return v || 'UNKNOWN'
    },
    shiftName(code) {
      const map = {
        A: 'A班',
        B: 'B班',
        C: 'C班',
        D: 'D班',
        DAY: '白班',
        NIGHT: '夜班',
        UNKNOWN: '未分班组'
      }
      return map[code] || `${code}班组`
    },
    toNumber(v) {
      const n = Number(v)
      return Number.isFinite(n) ? n : 0
    },
    async fetchAllReportsByYear(year) {
      const all = []
      const pageSize = 500
      let pageNum = 1
      let totalPages = 1

      while (pageNum <= totalPages) {
        const res = await getReportList({ pageNum, pageSize })
        if (!(res && (res.code === 200 || res.code === 20000))) break
        const data = res.data || {}
        const list = Array.isArray(data.list) ? data.list : []
        list.forEach(item => {
          const dateText = this.toDateText(item.reportDate)
          if (dateText.startsWith(String(year))) {
            all.push(item)
          }
        })
        totalPages = Number(data.pages || 1)
        pageNum += 1
      }

      return all
    },
    collectTotalsByShift(list, datePrefix) {
      const map = {}
      ;(list || []).forEach(item => {
        const reportDate = this.toDateText(item.reportDate)
        if (!reportDate.startsWith(datePrefix)) return
        const shiftCode = this.normalizeShiftCode(item.shiftCode)
        if (!map[shiftCode]) {
          map[shiftCode] = {
            total: 0,
            staffSet: new Set()
          }
        }
        map[shiftCode].total += this.toNumber(item.outputQty)
        const staffKey = String(item.staffId || item.staffName || '').trim()
        if (staffKey) map[shiftCode].staffSet.add(staffKey)
      })
      return map
    },
    buildShiftKpis(allRecords) {
      const month = this.filters.month || this.currentMonthText()
      const year = String(month).slice(0, 4)
      const today = new Date()
      const todayText = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

      const dayMap = this.collectTotalsByShift(allRecords, todayText)
      const monthMap = this.collectTotalsByShift(allRecords, month)
      const yearMap = this.collectTotalsByShift(allRecords, year)

      const shiftCodes = Array.from(new Set([
        ...Object.keys(dayMap),
        ...Object.keys(monthMap),
        ...Object.keys(yearMap)
      ])).sort()

      this.shiftKpis = shiftCodes.map(code => {
        const day = dayMap[code] || { total: 0, staffSet: new Set() }
        const mon = monthMap[code] || { total: 0, staffSet: new Set() }
        const yr = yearMap[code] || { total: 0, staffSet: new Set() }
        const dayStaff = Math.max(1, day.staffSet.size)
        const monStaff = Math.max(1, mon.staffSet.size)
        const yrStaff = Math.max(1, yr.staffSet.size)
        return {
          shiftCode: code,
          shiftName: this.shiftName(code),
          dayTotal: day.total,
          dayPerCapita: day.total / dayStaff,
          monthTotal: mon.total,
          monthPerCapita: mon.total / monStaff,
          yearTotal: yr.total,
          yearPerCapita: yr.total / yrStaff
        }
      })
    },
    buildMonthTrend(allRecords) {
      const month = this.filters.month || this.currentMonthText()
      const [y, m] = month.split('-')
      const year = Number(y)
      const mon = Number(m)
      const daysInMonth = new Date(year, mon, 0).getDate()
      const labels = []
      const totals = []
      const perCapitas = []

      for (let day = 1; day <= daysInMonth; day++) {
        const dateText = `${year}-${String(mon).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        labels.push(String(day))
        let total = 0
        const staffSet = new Set()
        allRecords.forEach(item => {
          if (this.toDateText(item.reportDate) !== dateText) return
          total += this.toNumber(item.outputQty)
          const staffKey = String(item.staffId || item.staffName || '').trim()
          if (staffKey) staffSet.add(staffKey)
        })
        totals.push(total)
        perCapitas.push(staffSet.size > 0 ? total / staffSet.size : 0)
      }

      this.monthTrend = {
        labels,
        totalSeries: totals,
        perCapitaSeries: perCapitas
      }
    },
    buildYearMonthlyRows(allRecords) {
      const month = this.filters.month || this.currentMonthText()
      const year = Number(String(month).slice(0, 4))
      const rows = []
      for (let i = 1; i <= 12; i++) {
        const monthPrefix = `${year}-${String(i).padStart(2, '0')}`
        let total = 0
        const staffSet = new Set()
        allRecords.forEach(item => {
          if (!this.toDateText(item.reportDate).startsWith(monthPrefix)) return
          total += this.toNumber(item.outputQty)
          const staffKey = String(item.staffId || item.staffName || '').trim()
          if (staffKey) staffSet.add(staffKey)
        })
        rows.push({
          month: `${i}月`,
          total,
          perCapita: staffSet.size > 0 ? total / staffSet.size : 0
        })
      }
      this.yearMonthlyRows = rows
    },
    buildDailyQualityRows(allRecords) {
      const month = this.filters.month || this.currentMonthText()
      const [y, m] = month.split('-')
      const year = Number(y)
      const mon = Number(m)
      const daysInMonth = new Date(year, mon, 0).getDate()
      const rows = []
      for (let day = 1; day <= daysInMonth; day++) {
        const dateText = `${year}-${String(mon).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        let output = 0
        let scrap = 0
        allRecords.forEach(item => {
          if (this.toDateText(item.reportDate) !== dateText) return
          output += this.toNumber(item.outputQty)
          scrap += this.toNumber(item.defectQty)
        })
        const good = Math.max(0, output - scrap)
        const yieldRate = output > 0 ? (good / output) : 0
        rows.push({ date: dateText, output, scrap, yieldRate })
      }
      this.dailyQualityRows = rows
      const threshold = this.toNumber(this.filters.yieldWarnPercent) / 100
      this.warningRows = rows.filter(x => this.toNumber(x.yieldRate) < threshold)
    },
    refreshExtraPanels(allRecords) {
      const month = this.filters.month || this.currentMonthText()
      const monthRecords = (allRecords || []).filter(x => this.toDateText(x.reportDate).startsWith(month))
      const monthTotal = monthRecords.reduce((sum, x) => sum + this.toNumber(x.outputQty), 0)
      const monthStaffSet = new Set(monthRecords.map(x => String(x.staffId || x.staffName || '').trim()).filter(Boolean))
      const monthPerCapita = monthStaffSet.size > 0 ? (monthTotal / monthStaffSet.size) : 0
      this.monthSummary = {
        total: monthTotal,
        perCapita: monthPerCapita
      }

      const totalTarget = this.toNumber(this.targetConfig.monthlyTotalTarget)
      this.totalTargetRate = totalTarget > 0 ? monthTotal / totalTarget : 0

      this.shiftTargetRows = (this.shiftKpis || []).map(k => {
        const shiftCode = this.normalizeShiftCode(k.shiftCode)
        const target = this.toNumber((this.targetConfig.shiftMonthlyTargets || {})[shiftCode])
        const actual = this.toNumber(k.monthTotal)
        const rate = target > 0 ? actual / target : 0
        return {
          shiftCode,
          shiftName: k.shiftName,
          target,
          actual,
          rate
        }
      })

      this.shiftRankRows = (this.shiftKpis || [])
        .slice()
        .sort((a, b) => this.toNumber(b.monthTotal) - this.toNumber(a.monthTotal))
        .map((k, idx) => ({
          rank: idx + 1,
          shiftCode: k.shiftCode,
          shiftName: k.shiftName,
          monthTotal: this.toNumber(k.monthTotal),
          monthPerCapita: this.toNumber(k.monthPerCapita)
        }))
    },
    initMonthTrendChart() {
      if (!this.$refs.monthTrendChart) return
      if (!this.monthTrendChart) {
        this.monthTrendChart = echarts.init(this.$refs.monthTrendChart)
      }
      const { labels, totalSeries, perCapitaSeries } = this.monthTrend
      this.monthTrendChart.setOption({
        tooltip: { trigger: 'axis' },
        legend: { data: ['日产量', '人均产量'] },
        grid: { left: 52, right: 20, top: 36, bottom: 36 },
        xAxis: { type: 'category', data: labels },
        yAxis: { type: 'value', name: '产量(卷)' },
        series: [
          { name: '日产量', type: 'line', smooth: true, data: totalSeries },
          { name: '人均产量', type: 'line', smooth: true, data: perCapitaSeries }
        ]
      })
    },
    handleResize() {
      if (this.monthTrendChart) {
        this.monthTrendChart.resize()
      }
    },
    async load() {
      this.loading = true
      try {
        const month = this.filters.month || this.currentMonthText()
        const year = Number(String(month).slice(0, 4))
        const all = await this.fetchAllReportsByYear(year)
        this.records = all

        this.buildShiftKpis(all)
        this.buildMonthTrend(all)
        this.buildYearMonthlyRows(all)
        this.buildDailyQualityRows(all)
        this.refreshExtraPanels(all)

        this.$nextTick(() => {
          this.initMonthTrendChart()
        })
      } catch (e) {
        this.$message.error('加载生产报表失败')
      } finally {
        this.loading = false
      }
    },
    formatInt(v) {
      return Number(v || 0).toLocaleString('zh-CN', { maximumFractionDigits: 0 })
    },
    formatFloat(v) {
      return Number(v || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    },
    formatPercent(v) {
      const n = Number(v || 0) * 100
      return `${n.toFixed(2)}%`
    },
    toPercentNumber(v) {
      const num = Number(v || 0) * 100
      if (!Number.isFinite(num) || num <= 0) return 0
      if (num >= 100) return 100
      return Number(num.toFixed(2))
    }
  }
}
</script>

<style scoped>
.mb-12 {
  margin-bottom: 12px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.kpi-card {
  border: 1px solid #ebeef5;
  border-radius: 6px;
  padding: 10px 12px;
  background: #fff;
}

.kpi-title {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 8px;
}

.kpi-row {
  display: flex;
  justify-content: space-between;
  margin-top: 6px;
  font-size: 13px;
}

.kpi-label {
  color: #606266;
}

.kpi-value {
  color: #303133;
  font-weight: 600;
}

.kpi-sub {
  margin-top: 4px;
  font-size: 12px;
  color: #909399;
}

.chart-box {
  width: 100%;
  height: 340px;
}

.h-420 {
  min-height: 420px;
}

.h-300 {
  min-height: 300px;
}

.target-line {
  margin-bottom: 10px;
}

.target-title {
  font-size: 13px;
  color: #303133;
  margin-bottom: 6px;
}

.target-sub {
  margin-top: 6px;
  font-size: 12px;
  color: #909399;
}

.warn-text {
  color: #f56c6c;
  font-weight: 600;
}

.warn-count {
  color: #909399;
  font-size: 12px;
}
</style>
