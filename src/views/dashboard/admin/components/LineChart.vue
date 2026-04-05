<template>
  <div :class="className" :style="{height:height,width:width}" />
</template>

<script>
import echarts from 'echarts'
require('echarts/theme/macarons') // echarts theme
import resize from './mixins/resize'

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
      default: '350px'
    },
    autoResize: {
      type: Boolean,
      default: true
    },
    chartData: {
      type: Object,
      required: true
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
    chartData: {
      deep: true,
      handler(val) {
        this.setOptions(val)
      }
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
    initChart() {
      this.chart = echarts.init(this.$el, 'macarons')
      this.setOptions(this.chartData)
    },
    setOptions({ xAxis = [], series = [] } = {}) {
      const names = series.map(s => s.name)
      this.chart.setOption({
        xAxis: {
          data: xAxis,
          boundaryGap: false,
          axisLabel: {
            margin: 10
          },
          axisTick: {
            show: false
          }
        },
        grid: {
          left: 56,
          right: 24,
          bottom: 64,
          top: 36,
          containLabel: false
        },
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'cross'
          },
          padding: [5, 10],
          formatter: (params) => {
            const items = Array.isArray(params) ? params : [params]
            if (!items.length) return ''
            const title = items[0].axisValueLabel || items[0].name || ''
            const lines = items.map(item => `${item.marker}${item.seriesName}: ${this.formatWan(item.value)} ${this.unitLabel}`)
            return [title, ...lines].join('<br/>')
          }
        },
        yAxis: {
          type: 'value',
          name: this.unitLabel,
          axisLabel: {
            formatter: (value) => this.formatWan(value)
          },
          axisTick: {
            show: false
          }
        },
        legend: {
          top: 2,
          data: names
        },
        series: series.map((s, idx) => ({
          name: s.name || `系列${idx + 1}`,
          type: 'line',
          smooth: true,
          data: s.data || [],
          itemStyle: {
            normal: {
              color: s.color || '#3888fa',
              lineStyle: {
                color: s.color || '#3888fa',
                width: 2
              },
              areaStyle: s.area !== false ? { color: s.areaColor || '#f3f8ff' } : undefined
            }
          },
          animationDuration: 1200,
          animationEasing: 'quadraticOut'
        }))
      })
    }
  }
}
</script>
