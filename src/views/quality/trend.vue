<template>
  <div class="app-container">
    <div class="filter-container">
      <el-form :inline="true" :model="query" size="small">
        <el-form-item label="物料">
          <el-select
            v-model="query.materialCode"
            placeholder="请选择或搜索物料"
            filterable
            clearable
            style="width: 250px"
            @change="handleMaterialChange"
          >
            <el-option
              v-for="item in materialOptions"
              :key="item.materialCode"
              :label="`${item.materialCode} (${item.materialName})`"
              :value="item.materialCode"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="指标">
          <el-select
            v-model="query.itemName"
            placeholder="请选择指标项"
            clearable
            filterable
            style="width: 180px"
          >
            <el-option
              v-for="item in indicatorOptions"
              :key="item"
              :label="item"
              :value="item"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="日期范围">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="yyyy-MM-dd"
            style="width: 240px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="el-icon-search" @click="fetchTrendData">查询趋势</el-button>
          <el-button icon="el-icon-refresh" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <el-row :gutter="20">
      <el-col :span="24">
        <el-card shadow="never">
          <div slot="header" class="clearfix">
            <span>数据趋势图表 (基于数据库明细记录)</span>
            <div style="float: right; color: #909399; font-size: 13px;">
              当前分析: {{ query.materialCode || '-' }} / {{ query.itemName || '-' }}
            </div>
          </div>
          <div v-loading="loading" style="height: 500px">
            <div v-if="!chartData.length && !loading" class="empty-tip" style="padding-top: 100px;">
              <div style="text-align: center; color: #909399;">
                <i class="el-icon-data-analysis" style="font-size: 40px; margin-bottom: 10px;"></i>
                <p>暂无历史检测数据，请确保已在“来料/出货检验”中保存过该物料的记录</p>
              </div>
            </div>
            <div ref="trendChart" style="height: 100%; width: 100%" />
          </div>
        </el-card>
      </el-col>
    </el-row>

    <div style="margin-top: 20px">
      <el-table :data="chartData" border stripe size="small" max-height="400">
        <el-table-column type="index" label="序号" width="60" align="center" />
        <el-table-column prop="inspectionNo" label="质检单号" width="160" />
        <el-table-column prop="batchNo" label="批次/卷号" width="180" />
        <el-table-column prop="measuredValue" label="检测值" width="120" align="center">
          <template slot-scope="{row}">
            <b :style="{color: row.result === 'fail' ? '#F56C6C' : '#67C23A'}">{{ row.measuredValue }}</b>
          </template>
        </el-table-column>
        <el-table-column prop="result" label="判定" width="100" align="center">
          <template slot-scope="{row}">
            <el-tag :type="row.result === 'pass' ? 'success' : (row.result === 'fail' ? 'danger' : 'info')" size="mini">
              {{ row.result === 'pass' ? '合格' : (row.result === 'fail' ? '不合格' : row.result) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="inspectionTime" label="检验时间" min-width="160" />
      </el-table>
    </div>
  </div>
</template>

<script>
import echarts from 'echarts'
import request from '@/utils/request'
import { getTapeSpecList } from '@/api/tapeSpec'

export default {
  name: 'QualityTrendDashboard',
  data() {
    return {
      loading: false,
      query: {
        materialCode: '',
        itemName: '',
        startDate: '',
        endDate: ''
      },
      dateRange: [],
      materialOptions: [],
      indicatorOptions: [],
      chartData: [],
      myChart: null
    }
  },
  mounted() {
    this.initChart()
    this.loadMaterials()
    this.initDateRange()
    
    window.addEventListener('resize', this.handleResize)
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.handleResize)
    if (this.myChart) {
      this.myChart.dispose()
    }
  },
  methods: {
    initChart() {
      this.myChart = echarts.init(this.$refs.trendChart)
    },
    handleResize() {
      this.myChart && this.myChart.resize()
    },
    initDateRange() {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 1000 * 24 * 30) // 最近30天
      this.dateRange = [
        this.formatDate(start),
        this.formatDate(end)
      ]
    },
    formatDate(date) {
      const y = date.getFullYear()
      let m = date.getMonth() + 1
      m = m < 10 ? '0' + m : m
      let d = date.getDate()
      d = d < 10 ? '0' + d : d
      return `${y}-${m}-${d}`
    },
    async loadMaterials() {
      try {
        const res = await getTapeSpecList({ page: 1, size: 500, status: 1 })
        if (res && (res.code === 200 || res.code === 20000)) {
          this.materialOptions = res.data.records || res.data || []
        }
      } catch (e) {
        this.$message.error('加载物料列表失败')
      }
    },
    handleMaterialChange(val) {
      this.query.itemName = ''
      this.indicatorOptions = []
      if (!val) return
      
      // 从选中的物料中寻找已配置的指标
      const material = this.materialOptions.find(m => m.materialCode === val)
      if (material && material.performanceParams) {
        try {
          const params = JSON.parse(material.performanceParams)
          this.indicatorOptions = Object.keys(params).map(key => {
            return params[key].label || key
          })
          // 默认选中第一个
          if (this.indicatorOptions.length > 0) {
            this.query.itemName = this.indicatorOptions[0]
          }
        } catch (e) {
          console.error('解析物料参数失败', e)
        }
      }
    },
    async fetchTrendData() {
      if (!this.query.materialCode || !this.query.itemName) {
        this.$message.warning('请选择物料和指标项')
        return
      }
      
      this.loading = true
      this.query.startDate = this.dateRange ? this.dateRange[0] : ''
      this.query.endDate = this.dateRange ? this.dateRange[1] : ''
      
      try {
        const res = await request.get('/api/quality/trend', { params: this.query })
        if (res && (res.code === 200 || res.code === 20000)) {
          this.chartData = res.data || []
          this.renderChart()
        } else {
          this.$message.error(res.message || '查询趋势失败')
        }
      } catch (e) {
        console.error(e)
        this.$message.error('请求失败')
      } finally {
        this.loading = false
      }
    },
    renderChart() {
      if (!this.myChart) return
      
      const xAxisData = this.chartData.map(item => {
        // 使用时间或批次号作为轴
        const time = (item.inspectionTime || '').split(' ')[0]
        const batch = item.batchNo ? `(${item.batchNo})` : ''
        return `${time}\n${batch}`
      })
      
      const seriesData = this.chartData.map(item => {
        const val = parseFloat(item.measuredValue)
        return isNaN(val) ? null : val
      })

      const option = {
        title: {
          text: this.query.itemName + ' 历史波动趋势',
          left: 'center'
        },
        tooltip: {
          trigger: 'axis',
          formatter: (params) => {
            const dataIndex = params[0].dataIndex
            const row = this.chartData[dataIndex]
            return `检验单: ${row.inspectionNo}<br/>
                    时间: ${row.inspectionTime}<br/>
                    批次: ${row.batchNo || '-'}<br/>
                    <b>值: ${row.measuredValue}</b><br/>
                    状态: ${row.result === 'pass' ? '合格' : '不合格'}`
          }
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '15%',
          containLabel: true
        },
        toolbox: {
          feature: {
            saveAsImage: {},
            dataZoom: {}
          }
        },
        xAxis: {
          type: 'category',
          data: xAxisData,
          axisLabel: {
            interval: 0,
            rotate: 30
          }
        },
        yAxis: {
          type: 'value',
          name: '检测值',
          scale: true // 自动缩放自适应
        },
        series: [
          {
            name: this.query.itemName,
            type: 'line',
            data: seriesData,
            smooth: true,
            symbolSize: 8,
            markLine: {
              data: [
                { type: 'average', name: '平均值' }
              ]
            },
            lineStyle: {
              width: 3
            },
            itemStyle: {
              color: '#409EFF'
            }
          }
        ]
      }
      
      this.myChart.setOption(option, true)
    },
    resetQuery() {
      this.query = {
        materialCode: '',
        itemName: '',
        startDate: '',
        endDate: ''
      }
      this.initDateRange()
      this.chartData = []
      this.indicatorOptions = []
      if (this.myChart) {
        this.myChart.clear()
      }
    }
  }
}
</script>

<style scoped>
.empty-tip {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
}
.clearfix:before,
.clearfix:after {
  display: table;
  content: "";
}
.clearfix:after {
  clear: both
}
</style>
