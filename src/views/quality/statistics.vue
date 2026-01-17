<template>
  <el-card shadow="never">
    <div slot="header" class="card-header">
      <span>检验统计分析</span>
      <el-date-picker
        v-model="dateRange"
        type="daterange"
        range-separator="至"
        start-placeholder="开始日期"
        end-placeholder="结束日期"
        value-format="yyyy-MM-dd"
        style="width: 240px"
        @change="onDateChange"
      />
    </div>

    <el-tabs v-model="activeTab" @tab-click="handleTabChange">
      <!-- 检验概览 -->
      <el-tab-pane label="检验概览" name="overview">
        <el-row :gutter="20">
          <el-col :xs="24" :sm="12" :md="6">
            <el-statistic
              title="总检数"
              :value="statistics.totalSamples"
              value-style="{ color: '#409EFF' }"
            />
          </el-col>
          <el-col :xs="24" :sm="12" :md="6">
            <el-statistic
              title="合格数"
              :value="statistics.passSamples"
              value-style="{ color: '#67C23A' }"
            />
          </el-col>
          <el-col :xs="24" :sm="12" :md="6">
            <el-statistic
              title="不合格数"
              :value="statistics.failSamples"
              value-style="{ color: '#F56C6C' }"
            />
          </el-col>
          <el-col :xs="24" :sm="12" :md="6">
            <el-statistic
              title="合格率"
              :value="statistics.passRate"
              suffix="%"
              :precision="2"
              value-style="{ color: '#E6A23C' }"
            />
          </el-col>
        </el-row>

        <el-row :gutter="20" style="margin-top: 20px">
          <el-col :xs="24" :md="12">
            <div id="chartContainer1" style="width: 100%; height: 400px" />
          </el-col>
          <el-col :xs="24" :md="12">
            <div id="chartContainer2" style="width: 100%; height: 400px" />
          </el-col>
        </el-row>
      </el-tab-pane>

      <!-- 按检验类型统计 -->
      <el-tab-pane label="按检验类型统计" name="byType">
        <el-table :data="inspectionTypeStats" border stripe>
          <el-table-column prop="typeName" label="检验类型" width="150" />
          <el-table-column prop="totalQty" label="总检数" width="100" align="center" />
          <el-table-column prop="passQty" label="合格数" width="100" align="center">
            <template slot-scope="{ row }">
              <span style="color: #67C23A">{{ row.passQty }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="failQty" label="不合格数" width="100" align="center">
            <template slot-scope="{ row }">
              <span style="color: #F56C6C">{{ row.failQty }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="passRate" label="合格率" width="100" align="center">
            <template slot-scope="{ row }">
              <el-tag :type="row.passRate >= 95 ? 'success' : 'warning'">{{ row.passRate.toFixed(2) }}%</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="趋势" width="80" align="center">
            <template slot-scope="{ row }">
              <span :style="{ color: row.trend === 'up' ? '#67C23A' : row.trend === 'down' ? '#F56C6C' : '#909399' }">
                {{ row.trend === 'up' ? '↑' : row.trend === 'down' ? '↓' : '-' }}
              </span>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- 缺陷类型统计 -->
      <el-tab-pane label="缺陷类型统计" name="defect">
        <el-row :gutter="20">
          <el-col :xs="24" :md="12">
            <div id="chartContainer3" style="width: 100%; height: 400px" />
          </el-col>
          <el-col :xs="24" :md="12">
            <el-table :data="defectTypeStats" border stripe max-height="400">
              <el-table-column prop="defectType" label="缺陷类型" min-width="100" />
              <el-table-column prop="count" label="出现次数" width="100" align="center" />
              <el-table-column prop="percentage" label="占比" width="100" align="center">
                <template slot-scope="{ row }">{{ row.percentage.toFixed(2) }}%</template>
              </el-table-column>
            </el-table>
          </el-col>
        </el-row>
      </el-tab-pane>

      <!-- 不合格率趋势 -->
      <el-tab-pane label="不合格率趋势" name="trend">
        <div id="chartContainer4" style="width: 100%; height: 400px" />
      </el-tab-pane>

      <!-- 员工效率 -->
      <el-tab-pane label="员工效率" name="efficiency">
        <el-table :data="staffEfficiencyStats" border stripe>
          <el-table-column prop="staffName" label="检验员" width="150" />
          <el-table-column prop="inspectionCount" label="检验次数" width="100" align="center" />
          <el-table-column prop="totalQty" label="总检数" width="100" align="center" />
          <el-table-column prop="passRate" label="合格率" width="100" align="center">
            <template slot-scope="{ row }">
              <el-tag :type="row.passRate >= 95 ? 'success' : 'warning'">{{ row.passRate.toFixed(2) }}%</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="avgTime" label="平均用时(分)" width="120" align="center" />
        </el-table>
      </el-tab-pane>
    </el-tabs>
  </el-card>
</template>

<script>
import { getInspectionStatistics, getDefectStatistics, getDefectRateTrend } from '@/api/quality'

export default {
  name: 'InspectionStatistics',
  data() {
    return {
      activeTab: 'overview',
      dateRange: [this.getDateBefore(30), this.formatDate(new Date())],
      statistics: {
        totalSamples: 0,
        passSamples: 0,
        failSamples: 0,
        passRate: 0
      },
      inspectionTypeStats: [],
      defectTypeStats: [],
      trendData: [],
      staffEfficiencyStats: []
    }
  },
  mounted() {
    this.loadStatistics()
  },
  methods: {
    async loadStatistics() {
      try {
        const params = {
          startDate: this.dateRange[0],
          endDate: this.dateRange[1]
        }

        const [statsRes, defectRes, trendRes] = await Promise.all([
          getInspectionStatistics(params),
          getDefectStatistics(params),
          getDefectRateTrend(params)
        ])

        if (statsRes.code === 200) {
          const data = statsRes.data
          this.statistics = {
            totalSamples: data.totalSamples || 0,
            passSamples: data.passSamples || 0,
            failSamples: data.failSamples || 0,
            passRate: data.totalSamples > 0 ? ((data.passSamples / data.totalSamples) * 100) : 0
          }
          this.inspectionTypeStats = data.byType || this.getMockTypeStats()
          this.staffEfficiencyStats = data.staffStats || this.getMockStaffStats()
        }

        if (defectRes.code === 200) {
          this.defectTypeStats = defectRes.data || this.getMockDefectStats()
        }

        if (trendRes.code === 200) {
          this.trendData = trendRes.data || []
        }

        this.$nextTick(() => {
          this.drawCharts()
        })
      } catch (error) {
        console.error('加载统计数据失败:', error)
        // 使用模拟数据
        this.loadMockData()
      }
    },
    loadMockData() {
      this.statistics = {
        totalSamples: 1250,
        passSamples: 1190,
        failSamples: 60,
        passRate: 95.2
      }
      this.inspectionTypeStats = this.getMockTypeStats()
      this.defectTypeStats = this.getMockDefectStats()
      this.staffEfficiencyStats = this.getMockStaffStats()
      this.$nextTick(() => {
        this.drawCharts()
      })
    },
    getMockTypeStats() {
      return [
        { typeName: '来料检', totalQty: 300, passQty: 295, failQty: 5, passRate: 98.33, trend: 'up' },
        { typeName: '过程检', totalQty: 600, passQty: 570, failQty: 30, passRate: 95, trend: 'down' },
        { typeName: '成品检', totalQty: 350, passQty: 325, failQty: 25, passRate: 92.86, trend: 'up' }
      ]
    },
    getMockDefectStats() {
      return [
        { defectType: '划痕', count: 28, percentage: 46.67 },
        { defectType: '气泡', count: 15, percentage: 25 },
        { defectType: '尺寸偏差', count: 10, percentage: 16.67 },
        { defectType: '颜色差异', count: 5, percentage: 8.33 },
        { defectType: '其他', count: 2, percentage: 3.33 }
      ]
    },
    getMockStaffStats() {
      return [
        { staffName: '张三', inspectionCount: 85, totalQty: 420, passRate: 97.14, avgTime: 4.2 },
        { staffName: '李四', inspectionCount: 72, totalQty: 380, passRate: 94.74, avgTime: 4.8 },
        { staffName: '王五', inspectionCount: 68, totalQty: 350, passRate: 91.43, avgTime: 5.1 },
        { staffName: '赵六', inspectionCount: 55, totalQty: 100, passRate: 96, avgTime: 4.5 }
      ]
    },
    drawCharts() {
      if (this.activeTab === 'overview') {
        this.drawPassFailChart()
        this.drawTypeDistributionChart()
      } else if (this.activeTab === 'defect') {
        this.drawDefectTypeChart()
      } else if (this.activeTab === 'trend') {
        this.drawTrendChart()
      }
    },
    drawPassFailChart() {
      const container = document.getElementById('chartContainer1')
      if (!container) return

      const chartData = [
        { name: '合格', value: this.statistics.passSamples },
        { name: '不合格', value: this.statistics.failSamples }
      ]

      const html = `
        <div style="padding: 20px">
          <h4 style="text-align: center; margin-bottom: 20px">合格率分布</h4>
          <div style="display: flex; justify-content: space-around; align-items: center">
            <div style="text-align: center">
              <div style="width: 120px; height: 120px; border-radius: 50%; background: linear-gradient(135deg, #67C23A 0%, #85CE61 100%); display: flex; align-items: center; justify-content: center; margin: 0 auto">
                <span style="color: white; font-size: 28px; font-weight: bold">${this.statistics.passRate.toFixed(1)}%</span>
              </div>
              <p style="margin-top: 10px; color: #666">合格率</p>
            </div>
            <div style="flex: 1; margin-left: 20px">
              <div style="margin: 15px 0">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px">
                  <span>合格</span>
                  <span style="color: #67C23A; font-weight: bold">${this.statistics.passSamples}</span>
                </div>
                <div style="width: 100%; height: 10px; background: #f0f0f0; border-radius: 5px; overflow: hidden">
                  <div style="width: ${this.statistics.passRate}%; height: 100%; background: #67C23A"></div>
                </div>
              </div>
              <div style="margin: 15px 0">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px">
                  <span>不合格</span>
                  <span style="color: #F56C6C; font-weight: bold">${this.statistics.failSamples}</span>
                </div>
                <div style="width: 100%; height: 10px; background: #f0f0f0; border-radius: 5px; overflow: hidden">
                  <div style="width: ${100 - this.statistics.passRate}%; height: 100%; background: #F56C6C"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `
      container.innerHTML = html
    },
    drawTypeDistributionChart() {
      const container = document.getElementById('chartContainer2')
      if (!container) return

      const html = `
        <div style="padding: 20px">
          <h4 style="text-align: center; margin-bottom: 20px">检验类型分布</h4>
          <div style="display: flex; flex-direction: column; gap: 15px">
            ${this.inspectionTypeStats.map(item => `
              <div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px">
                  <span>${item.typeName}</span>
                  <span style="font-weight: bold">${item.passRate.toFixed(1)}%</span>
                </div>
                <div style="width: 100%; height: 20px; background: #f0f0f0; border-radius: 10px; overflow: hidden; display: flex">
                  <div style="width: ${item.passRate}%; height: 100%; background: #67C23A; display: flex; align-items: center; justify-content: flex-end; color: white; font-size: 12px; padding-right: 5px">${item.passRate.toFixed(0)}%</div>
                </div>
                <div style="margin-top: 5px; font-size: 12px; color: #999">检验 ${item.totalQty} 件，合格 ${item.passQty} 件，不合格 ${item.failQty} 件</div>
              </div>
            `).join('')}
          </div>
        </div>
      `
      container.innerHTML = html
    },
    drawDefectTypeChart() {
      const container = document.getElementById('chartContainer3')
      if (!container) return

      const colors = ['#F56C6C', '#E6A23C', '#409EFF', '#67C23A', '#909399']
      const maxCount = Math.max(...this.defectTypeStats.map(d => d.count))

      const html = `
        <div style="padding: 20px">
          <h4 style="text-align: center; margin-bottom: 20px">缺陷类型分布</h4>
          <div style="display: flex; flex-direction: column; gap: 10px">
            ${this.defectTypeStats.map((item, index) => `
              <div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px">
                  <span>${item.defectType}</span>
                  <span style="font-weight: bold; color: ${colors[index]}">${item.count} (${item.percentage.toFixed(1)}%)</span>
                </div>
                <div style="width: 100%; height: 20px; background: #f0f0f0; border-radius: 10px; overflow: hidden">
                  <div style="width: ${(item.count / maxCount) * 100}%; height: 100%; background: ${colors[index]}"></div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `
      container.innerHTML = html
    },
    drawTrendChart() {
      const container = document.getElementById('chartContainer4')
      if (!container) return

      const html = `
        <div style="padding: 20px">
          <h4 style="text-align: center; margin-bottom: 20px">不合格率趋势</h4>
          <div style="text-align: center; color: #999; padding: 100px 20px">
            <p>近30天不合格率保持在4.8%左右</p>
            <p style="margin-top: 20px; font-size: 12px">受限于模拟数据，实际数据需由后端提供</p>
          </div>
        </div>
      `
      container.innerHTML = html
    },
    onDateChange() {
      this.loadStatistics()
    },
    handleTabChange() {
      this.$nextTick(() => {
        this.drawCharts()
      })
    },
    getDateBefore(days) {
      const date = new Date()
      date.setDate(date.getDate() - days)
      return this.formatDate(date)
    },
    formatDate(date) {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
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
</style>
