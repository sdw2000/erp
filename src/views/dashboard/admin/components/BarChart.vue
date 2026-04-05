<template>
  <div :class="className" :style="{height:height,width:width}" />
</template>

<script>
import echarts from 'echarts'
require('echarts/theme/macarons') // echarts theme
import resize from './mixins/resize'

const animationDuration = 6000

export default {
  mixins: [resize],
  props: {
    className: {
      type: String,
      default: 'chart'
    },
    width: {
      type: String,
      default: '100%'
    },
    height: {
      type: String,
      default: '300px'
    },
    categories: {
      type: Array,
      default: () => []
    },
    seriesData: {
      type: Array,
      default: () => []
    },
    seriesName: {
      type: String,
      default: '金额'
    },
    unitLabel: {
      type: String,
      default: '万元'
    }
  },
  data() {
    return {
      chart: null
    }
  },
  watch: {
    categories() {
      this.setChartOptions()
    },
    seriesData() {
      this.setChartOptions()
    }
  },
  mounted() {
    this.$nextTick(() => {
      this.initChart()
    })
  },
  beforeDestroy() {
    if (!this.chart) {
      return
    }
    this.chart.dispose()
    this.chart = null
  },
  methods: {
    formatWan(value) {
      const num = Number(value) || 0
      return (num / 10000).toFixed(2)
    },
    formatCategoryLabel(value) {
      const text = String(value || '')
      if (!text) return '-'
      const chunkSize = 4
      const lines = []
      for (let index = 0; index < text.length; index += chunkSize) {
        lines.push(text.slice(index, index + chunkSize))
      }
      return lines.join('\n')
    },
    getAdaptiveInterval() {
      const values = (this.seriesData || []).map(v => Number(v) || 0)
      const maxValue = values.length ? Math.max(...values) : 0
      const maxTicks = 6
      const candidates = [500000, 1000000, 2000000]

      for (const step of candidates) {
        if (Math.ceil(maxValue / step) <= maxTicks) {
          return step
        }
      }
      return 2000000
    },
    initChart() {
      this.chart = echarts.init(this.$el, 'macarons')
      this.setChartOptions()
    },
    setChartOptions() {
      if (!this.chart) return
      this.chart.setOption({
        tooltip: {
          trigger: 'axis',
          axisPointer: { // 坐标轴指示器，坐标轴触发有效
            type: 'shadow' // 默认为直线，可选为：'line' | 'shadow'
          },
          formatter: (params) => {
            const items = Array.isArray(params) ? params : [params]
            if (!items.length) return ''
            const title = items[0].axisValueLabel || items[0].name || ''
            const lines = items.map(item => `${item.marker}${item.seriesName}: ${this.formatWan(item.value)} ${this.unitLabel}`)
            return [title, ...lines].join('<br/>')
          }
        },
        grid: {
          top: 36,
          left: 56,
          right: 24,
          bottom: 64,
          containLabel: false
        },
        legend: {
          top: 2,
          data: [this.seriesName]
        },
        xAxis: [{
          type: 'category',
          data: this.categories.length ? this.categories : ['-'],
          axisLabel: {
            interval: 0,
            rotate: 0,
            margin: 10,
            lineHeight: 12,
            fontSize: 10,
            formatter: (value) => this.formatCategoryLabel(value)
          },
          axisTick: {
            alignWithLabel: true
          }
        }],
        yAxis: [{
          type: 'value',
          name: this.unitLabel,
          min: 0,
          interval: this.getAdaptiveInterval(),
          axisLabel: {
            formatter: (value) => this.formatWan(value)
          },
          axisTick: {
            show: false
          }
        }],
        series: [{
          name: this.seriesName,
          type: 'bar',
          barWidth: '50%',
          data: this.seriesData.length ? this.seriesData : [0],
          animationDuration
        }]
      })
    }
  }
}
</script>
