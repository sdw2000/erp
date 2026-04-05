<template>
  <el-row :gutter="20" class="panel-group">
    <el-col :xs="12" :sm="12" :lg="6" class="card-panel-col">
      <div class="card-panel">
        <div class="card-panel-icon-wrapper icon-money">
          <svg-icon icon-class="money" class-name="card-panel-icon" />
        </div>
        <div class="card-panel-description">
          <div class="card-panel-text">当班今日报工(㎡)</div>
          <count-to :start-val="0" :end-val="Number(summary.todayArea || 0)" :duration="1200" :decimals="2" class="card-panel-num" />
        </div>
      </div>
    </el-col>
    <el-col :xs="12" :sm="12" :lg="6" class="card-panel-col">
      <div class="card-panel">
        <div class="card-panel-icon-wrapper icon-message">
          <svg-icon icon-class="message" class-name="card-panel-icon" />
        </div>
        <div class="card-panel-description">
          <div class="card-panel-text">当班本月报工(㎡)</div>
          <count-to :start-val="0" :end-val="Number(summary.monthArea || 0)" :duration="1200" :decimals="2" class="card-panel-num" />
        </div>
      </div>
    </el-col>
    <el-col :xs="12" :sm="12" :lg="6" class="card-panel-col">
      <div class="card-panel">
        <div class="card-panel-icon-wrapper icon-shopping">
          <svg-icon icon-class="shopping" class-name="card-panel-icon" />
        </div>
        <div class="card-panel-description">
          <div class="card-panel-text">当班当年报工(㎡)</div>
          <count-to :start-val="0" :end-val="Number(summary.yearArea || 0)" :duration="1200" :decimals="2" class="card-panel-num" />
        </div>
      </div>
    </el-col>
    <el-col :xs="12" :sm="12" :lg="6" class="card-panel-col">
      <div class="card-panel">
        <div class="card-panel-icon-wrapper icon-people">
          <svg-icon icon-class="peoples" class-name="card-panel-icon" />
        </div>
        <div class="card-panel-description">
          <div class="card-panel-text">今日报工次数</div>
          <count-to :start-val="0" :end-val="Number(summary.todayReportCount || 0)" :duration="1200" class="card-panel-num" />
        </div>
      </div>
    </el-col>
  </el-row>
</template>

<script>
import CountTo from 'vue-count-to'

export default {
  components: { CountTo },
  props: {
    summary: {
      type: Object,
      default: () => ({ todayArea: 0, monthArea: 0, yearArea: 0, todayReportCount: 0 })
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
    font-size: 12px;
    position: relative;
    overflow: hidden;
    color: #666;
    background: #fff;
    box-shadow: 4px 4px 40px rgba(0, 0, 0, .05);
    border-color: rgba(0, 0, 0, .05);

    .icon-people { color: #40c9c6; }
    .icon-message { color: #36a3f7; }
    .icon-money { color: #f4516c; }
    .icon-shopping { color: #34bfa3; }

    .card-panel-icon-wrapper {
      float: left;
      margin: 24px 0 0 8px;
      padding: 8px;
      border-radius: 6px;
    }

    .card-panel-icon {
      float: left;
      font-size: 28px;
    }

    .card-panel-description {
      float: right;
      font-weight: bold;
      margin: 10px 12px;
      margin-left: 0;
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
      }
    }
  }
}
</style>
