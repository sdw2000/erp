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
          }
        },
        grid: {
          top: 10,
          left: '2%',
          right: '2%',
          bottom: '3%',
          containLabel: true
        },
        xAxis: [{
          type: 'category',
          data: this.categories.length ? this.categories : ['-'],
          axisTick: {
            alignWithLabel: true
          }
        }],
        yAxis: [{
          type: 'value',
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
