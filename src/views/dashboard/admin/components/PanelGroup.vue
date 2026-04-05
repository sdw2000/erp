<template>
  <el-row :gutter="20" class="panel-group">
    <el-col :xs="12" :sm="12" :lg="6" class="card-panel-col">
      <div class="card-panel">
        <div class="card-panel-icon-wrapper icon-people">
          <svg-icon icon-class="peoples" class-name="card-panel-icon" />
        </div>
        <div class="card-panel-description">
          <div class="card-panel-text">客户总数</div>
          <count-to :start-val="0" :end-val="summary.customerTotal" :duration="1200" class="card-panel-num" />
        </div>
      </div>
    </el-col>
    <el-col :xs="12" :sm="12" :lg="6" class="card-panel-col">
      <div class="card-panel">
        <div class="card-panel-icon-wrapper icon-money is-clickable" @click="handleTodayClick">
          <svg-icon icon-class="money" class-name="card-panel-icon" />
        </div>
        <div class="card-panel-description">
          <div class="card-panel-text">今日下单金额(万元)</div>
          <count-to :start-val="0" :end-val="toWan(summary.todayAmount)" :duration="1200" :decimals="2" class="card-panel-num" />
          <div class="card-panel-sub">下单面积：{{ formatWanArea(summary.todayArea) }} 万㎡</div>
        </div>
      </div>
    </el-col>
    <el-col :xs="12" :sm="12" :lg="6" class="card-panel-col">
      <div class="card-panel">
        <div class="card-panel-icon-wrapper icon-message">
          <svg-icon icon-class="message" class-name="card-panel-icon" />
        </div>
        <div class="card-panel-description">
          <div class="card-panel-text">当月下单金额(万元)</div>
          <count-to :start-val="0" :end-val="toWan(summary.monthAmount)" :duration="1200" :decimals="2" class="card-panel-num" />
          <div class="card-panel-sub">下单面积：{{ formatWanArea(summary.monthArea) }} 万㎡</div>
        </div>
      </div>
    </el-col>
    <el-col :xs="12" :sm="12" :lg="6" class="card-panel-col">
      <div class="card-panel">
        <div class="card-panel-icon-wrapper icon-shopping">
          <svg-icon icon-class="shopping" class-name="card-panel-icon" />
        </div>
        <div class="card-panel-description">
          <div class="card-panel-text">当年下单金额(万元)</div>
          <count-to :start-val="0" :end-val="toWan(summary.yearAmount)" :duration="1200" :decimals="2" class="card-panel-num" />
          <div class="card-panel-sub">下单面积：{{ formatWanArea(summary.yearArea) }} 万㎡</div>
        </div>
      </div>
    </el-col>
  </el-row>
</template>

<script>
import CountTo from 'vue-count-to'

export default {
  components: {
    CountTo
  },
  props: {
    summary: {
      type: Object,
      default: () => ({ customerTotal: 0, todayAmount: 0, monthAmount: 0, yearAmount: 0, todayArea: 0, monthArea: 0, yearArea: 0 })
    }
  },
  methods: {
    handleTodayClick() {
      this.$emit('today-click')
    },
    toWan(value) {
      const n = Number(value || 0)
      return n / 10000
    },
    formatWanArea(value) {
      const n = Number(value || 0) / 10000
      return n.toLocaleString('zh-CN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.panel-group {
  margin-top: 6px;

  .card-panel-col {
    margin-bottom: 8px;
  }

  .card-panel {
    height: 92px;
    cursor: pointer;
    font-size: 12px;
    position: relative;
    overflow: hidden;
    color: #666;
    background: #fff;
    box-shadow: 4px 4px 40px rgba(0, 0, 0, .05);
    border-color: rgba(0, 0, 0, .05);

    &:hover {
      .card-panel-icon-wrapper {
        color: #fff;
      }

      .icon-people {
        background: #40c9c6;
      }

      .icon-message {
        background: #36a3f7;
      }

      .icon-money {
        background: #f4516c;
      }

      .icon-shopping {
        background: #34bfa3
      }
    }

    .icon-people {
      color: #40c9c6;
    }

    .icon-message {
      color: #36a3f7;
    }

    .icon-money {
      color: #f4516c;
    }

    .icon-shopping {
      color: #34bfa3
    }

    .card-panel-icon-wrapper {
      float: left;
      margin: 24px 0 0 8px;
      padding: 8px;
      transition: all 0.38s ease-out;
      border-radius: 6px;
      &.is-clickable {
        cursor: pointer;
      }
    }

    .card-panel-icon {
      float: left;
      font-size: 28px;
    }

    .card-panel-description {
      float: right;
      font-weight: bold;
      margin: 10px 12px;
      margin-left: 0px;
      width: calc(100% - 70px);
      text-align: right;

      .card-panel-text {
        line-height: 14px;
        color: rgba(0, 0, 0, 0.45);
        font-size: 12px;
        margin-bottom: 3px;
      }

      .card-panel-num {
        display: block;
        font-size: 25px;
        line-height: 1.1;
        color: #303133;
        margin-bottom: 2px;
      }

      .card-panel-sub {
        color: #909399;
        font-size: 12px;
        line-height: 1.2;
      }
    }
  }
}

@media (max-width:550px) {
  .card-panel-description {
    display: none;
  }

  .card-panel-icon-wrapper {
    float: none !important;
    width: 100%;
    height: 100%;
    margin: 0 !important;

    .svg-icon {
      display: block;
      margin: 14px auto !important;
      float: none !important;
    }
  }
}
</style>
