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
          axisTick: {
            show: false
          }
        },
        grid: {
          left: 10,
          right: 10,
          bottom: 20,
          top: 30,
          containLabel: true
        },
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'cross'
          },
          padding: [5, 10]
        },
        yAxis: {
          axisTick: {
            show: false
          }
        },
        legend: {
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
