<template>
  <div class="app-container">
    <el-card shadow="never">
      <div slot="header" class="card-header">
        <span>报表统计</span>
      </div>

      <el-row :gutter="16">
        <el-col :span="8" v-for="item in typeStats" :key="item.inspectionType">
          <el-card shadow="hover" class="stat-card">
            <div class="stat-title">{{ typeText(item.inspectionType) }}</div>
            <div class="stat-metric">总数：{{ item.totalCount }}</div>
            <div class="stat-metric success">合格：{{ item.passCount }}</div>
            <div class="stat-metric danger">不合格：{{ item.failCount }}</div>
          </el-card>
        </el-col>
      </el-row>

      <el-card shadow="never" style="margin-top: 16px">
        <div slot="header" class="card-header">
          <span>缺陷类型 TOP</span>
        </div>
        <el-table :data="defectTop" border size="small">
          <el-table-column prop="defectType" label="缺陷类型" />
          <el-table-column prop="totalCount" label="次数" width="120" />
        </el-table>
      </el-card>
    </el-card>
  </div>
</template>

<script>
import { getQualitySummary } from '@/api/quality'

export default {
  name: 'QualityReportPage',
  data() {
    return {
      typeStats: [],
      defectTop: []
    }
  },
  mounted() {
    this.load()
  },
  methods: {
    async load() {
      const res = await getQualitySummary()
      if (res && (res.code === 200 || res.code === 20000)) {
        this.typeStats = res.data.typeStats || []
        this.defectTop = res.data.defectTop || []
      } else {
        this.$message.error(res.message || '加载失败')
      }
    },
    typeText(type) {
      const map = { incoming: '来料检测', process: '过程检测', outbound: '出货检测' }
      return map[type] || type
    }
  }
}
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stat-card {
  margin-bottom: 12px;
}

.stat-title {
  font-size: 16px;
  margin-bottom: 4px;
}

.stat-metric {
  font-size: 13px;
  margin: 2px 0;
}

.stat-metric.success {
  color: #67c23a;
}

.stat-metric.danger {
  color: #f56c6c;
}
</style>
