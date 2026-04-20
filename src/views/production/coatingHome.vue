<template>
  <div class="app-container coating-home">
    <el-card shadow="never" class="header-card">
      <div class="header-top">
        <div>
          <div class="home-title">涂布车间首页</div>
          <div class="home-subtitle">{{ today }} · {{ currentWorkGroup }}班</div>
        </div>
        <div class="header-actions">
          <el-button type="primary" plain icon="el-icon-tickets" @click="goTaskPage">进入涂布任务</el-button>
          <el-button icon="el-icon-refresh" :loading="loading" @click="loadData">刷新</el-button>
        </div>
      </div>

      <div class="metric-grid">
        <div class="metric-item">
          <div class="metric-label">本班当日任务数</div>
          <div class="metric-value">{{ taskCount }}</div>
        </div>
        <div class="metric-item">
          <div class="metric-label">本班已完工任务</div>
          <div class="metric-value success">{{ completedCount }}</div>
        </div>
        <div class="metric-item">
          <div class="metric-label">本班计划面积(㎡)</div>
          <div class="metric-value">{{ formatNum(totalPlanArea) }}</div>
        </div>
        <div class="metric-item">
          <div class="metric-label">本班报工面积(㎡)</div>
          <div class="metric-value primary">{{ formatNum(totalReportedArea) }}</div>
        </div>
      </div>

      <div class="completion-wrap">
        <div class="completion-title">本班生产完成情况</div>
        <el-progress :percentage="completionPercent" :stroke-width="16" :text-inside="true" />
        <div class="completion-tip">
          本月：{{ formatNum(shiftSummary.monthArea) }}㎡，本年：{{ formatNum(shiftSummary.yearArea) }}㎡
        </div>
      </div>
    </el-card>

    <el-card shadow="never" class="table-card">
      <div slot="header" class="table-title">本班涂布任务明细（按计划日期）</div>
      <el-table v-loading="loading" :data="records" border size="small" empty-text="今日暂无涂布任务">
        <el-table-column prop="order_no" label="订单号" min-width="180" />
        <el-table-column prop="material_code" label="料号" min-width="190" />
        <el-table-column prop="coating_equipment" label="设备" width="80" align="center" />
        <el-table-column prop="coating_area" label="计划面积(㎡)" width="130" align="right">
          <template slot-scope="scope">{{ formatNum(scope.row.coating_area) }}</template>
        </el-table-column>
        <el-table-column prop="coating_report_qty" label="报工面积(㎡)" width="130" align="right">
          <template slot-scope="scope">{{ formatNum(scope.row.coating_report_qty) }}</template>
        </el-table-column>
        <el-table-column label="完成率" width="180">
          <template slot-scope="scope">
            <el-progress :percentage="rowPercent(scope.row)" :stroke-width="12" />
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="110" align="center">
          <template slot-scope="scope">
            <el-tag :type="statusTag(scope.row.status)" size="mini">{{ statusText(scope.row.status) }}</el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script>
import { getCoatingSchedules } from '@/api/manualSchedule'
import { getShiftProductionSummary } from '@/api/schedule'

export default {
  name: 'CoatingHome',
  data() {
    return {
      loading: false,
      today: '',
      records: [],
      shiftSummary: {
        monthArea: 0,
        yearArea: 0
      }
    }
  },
  computed: {
    currentWorkGroup() {
      const fromGetter = this.$store.getters.workGroup
      const profile = this.$store.getters.userProfile || {}
      const raw = fromGetter || profile.workGroup || profile.groupName || profile.teamName || profile.classGroup || profile.shiftGroup || profile.deptName || 'A'
      const normalized = String(raw).trim().toUpperCase().replace(/班$/g, '').replace(/[^A-Z0-9]/g, '')
      return normalized || 'A'
    },
    taskCount() {
      return this.records.length
    },
    completedCount() {
      return this.records.filter(row => this.isCompleted(row)).length
    },
    totalPlanArea() {
      return this.records.reduce((sum, row) => sum + Number(row.coating_area || 0), 0)
    },
    totalReportedArea() {
      return this.records.reduce((sum, row) => sum + Number(row.coating_report_qty || 0), 0)
    },
    completionPercent() {
      if (this.totalPlanArea <= 0) {
        return this.taskCount > 0 ? Math.round((this.completedCount / this.taskCount) * 100) : 0
      }
      const p = (this.totalReportedArea / this.totalPlanArea) * 100
      return Math.max(0, Math.min(100, Math.round(p)))
    }
  },
  created() {
    this.today = this.formatDate(new Date())
    this.loadData()
  },
  methods: {
    async loadData() {
      this.loading = true
      try {
        const [taskRes, shiftRes] = await Promise.all([
          getCoatingSchedules({
            current: 1,
            size: 200,
            planDateStart: this.today,
            planDateEnd: this.today
          }),
          getShiftProductionSummary({ shiftCode: this.currentWorkGroup })
        ])

        if (taskRes && (taskRes.code === 200 || taskRes.code === 20000)) {
          const data = taskRes.data || {}
          this.records = data.records || data.list || []
        } else {
          this.records = []
        }

        if (shiftRes && (shiftRes.code === 200 || shiftRes.code === 20000)) {
          const data = shiftRes.data || {}
          this.shiftSummary = {
            monthArea: Number(data.monthArea || 0),
            yearArea: Number(data.yearArea || 0)
          }
        } else {
          this.shiftSummary = { monthArea: 0, yearArea: 0 }
        }
      } finally {
        this.loading = false
      }
    },
    goTaskPage() {
      this.$router.push('/production-management/coating')
    },
    formatDate(date) {
      const y = date.getFullYear()
      const m = String(date.getMonth() + 1).padStart(2, '0')
      const d = String(date.getDate()).padStart(2, '0')
      return `${y}-${m}-${d}`
    },
    formatNum(val) {
      const n = Number(val || 0)
      if (!Number.isFinite(n)) return '0'
      return n.toFixed(2)
    },
    rowPercent(row) {
      const plan = Number((row && row.coating_area) || 0)
      const done = Number((row && row.coating_report_qty) || 0)
      if (plan <= 0) return this.isCompleted(row) ? 100 : 0
      return Math.max(0, Math.min(100, Math.round((done / plan) * 100)))
    },
    isCompleted(row) {
      const status = String((row && row.status) || '').toUpperCase()
      if (status.includes('COMPLETED') || status === 'DONE') return true
      const plan = Number((row && row.coating_area) || 0)
      const done = Number((row && row.coating_report_qty) || 0)
      return plan > 0 && done >= plan
    },
    statusText(status) {
      const v = String(status || '').toUpperCase()
      if (v.includes('COMPLETED') || v === 'DONE') return '已完成'
      if (v.includes('IN_PROGRESS')) return '进行中'
      if (v.includes('SCHEDULED')) return '已排程'
      return status || '-'
    },
    statusTag(status) {
      const v = String(status || '').toUpperCase()
      if (v.includes('COMPLETED') || v === 'DONE') return 'success'
      if (v.includes('IN_PROGRESS')) return 'warning'
      return 'info'
    }
  }
}
</script>

<style lang="scss" scoped>
.coating-home {
  .header-card {
    margin-bottom: 12px;
  }

  .header-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 14px;
  }

  .home-title {
    font-size: 20px;
    font-weight: 600;
    color: #303133;
  }

  .home-subtitle {
    margin-top: 6px;
    color: #909399;
    font-size: 13px;
  }

  .header-actions {
    display: flex;
    gap: 8px;
  }

  .metric-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 10px;
    margin-bottom: 12px;
  }

  .metric-item {
    border: 1px solid #ebeef5;
    border-radius: 8px;
    padding: 12px;
    background: #fafafa;
  }

  .metric-label {
    font-size: 12px;
    color: #909399;
  }

  .metric-value {
    margin-top: 6px;
    font-size: 24px;
    line-height: 1;
    color: #303133;
    font-weight: 600;
  }

  .metric-value.success {
    color: #67c23a;
  }

  .metric-value.primary {
    color: #409eff;
  }

  .completion-wrap {
    margin-top: 8px;
  }

  .completion-title {
    font-size: 13px;
    margin-bottom: 8px;
    color: #606266;
  }

  .completion-tip {
    margin-top: 8px;
    font-size: 12px;
    color: #909399;
  }

  .table-title {
    font-weight: 600;
    color: #303133;
  }
}
</style>