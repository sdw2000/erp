<template>
  <div class="dashboard-container">
    <el-row :gutter="20">
      <el-col :span="6">
        <el-card>
          <div class="card-title">本月跟单数</div>
          <div class="card-value">{{ data.monthOrderCount }}</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card>
          <div class="card-title">本月销售额</div>
          <div class="card-value">￥{{ data.monthSalesAmount | money }}</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card>
          <div class="card-title">本月新客户</div>
          <div class="card-value">{{ data.monthNewCustomers }}</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card>
          <div class="card-title">本月回款</div>
          <div class="card-value">￥{{ data.monthReceivables | money }}</div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px;">
      <el-col :span="6">
        <el-card>
          <div class="card-title">待处理订单</div>
          <div class="card-value">{{ data.todoOrders }}</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card>
          <div class="card-title">待收款订单</div>
          <div class="card-value">{{ data.todoReceivables }}</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card>
          <div class="card-title">逾期订单</div>
          <div class="card-value">{{ data.overdueOrders }}</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card>
          <div class="card-title">库存预警</div>
          <div class="card-value">{{ data.stockWarning }}</div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px;">
      <el-col :span="12">
        <el-card>
          <div class="card-title">本月销售目标完成进度</div>
          <el-progress :percentage="progress" status="success" />
          <div style="margin-top: 10px;">目标：￥{{ data.salesTarget | money }}，已完成：￥{{ data.salesFinished | money }}</div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card>
          <div class="card-title">公告与提醒</div>
          <ul>
            <li v-for="notice in data.notices" :key="notice.id">{{ notice.title }}</li>
          </ul>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script>
import axios from 'axios'
export default {
  name: 'Dashboard',
  filters: {
    money(val) {
      return val ? val.toLocaleString() : 0
    }
  },
  data() {
    return {
      data: {
        monthOrderCount: 0,
        monthSalesAmount: 0,
        monthNewCustomers: 0,
        monthReceivables: 0,
        todoOrders: 0,
        todoReceivables: 0,
        overdueOrders: 0,
        stockWarning: 0,
        salesTarget: 0,
        salesFinished: 0,
        notices: []
      }
    }
  },
  computed: {
    progress() {
      if (!this.data.salesTarget) return 0
      return Math.round((this.data.salesFinished / this.data.salesTarget) * 100)
    }
  },
  created() {
    axios.get('/vue-element-admin/dashboard/personal').then(res => {
      if (res.data.code === 20000) {
        this.data = res.data.data
      }
    })
  }
}
</script>

<style scoped>
.dashboard-container {
  padding: 30px;
}
.card-title {
  font-size: 16px;
  color: #888;
  margin-bottom: 8px;
}
.card-value {
  font-size: 28px;
  font-weight: bold;
  color: #409EFF;
}
</style>
