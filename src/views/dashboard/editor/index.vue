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
import { getSalesSummary } from '@/api/dashboard'

const fallbackData = {
  monthOrderCount: 18,
  monthSalesAmount: 235000,
  monthNewCustomers: 3,
  monthReceivables: 180000,
  todoOrders: 5,
  todoReceivables: 2,
  overdueOrders: 1,
  stockWarning: 2,
  salesTarget: 300000,
  salesFinished: 235000,
  notices: [
    { id: 1, title: '本月销售目标为30万，请及时跟进客户！' },
    { id: 2, title: '有2个产品库存低于安全线，请关注补货。' }
  ]
}

export default {
  name: 'Dashboard',
  filters: {
    money(val) {
      return val ? val.toLocaleString() : 0
    }
  },
  data() {
    return {
      data: { ...fallbackData }
    }
  },
  computed: {
    progress() {
      if (!this.data.salesTarget) return 0
      return Math.round((this.data.salesFinished / this.data.salesTarget) * 100)
    }
  },
  async created() {
    await this.loadData()
  },
  methods: {
    async loadData() {
      try {
        const res = await getSalesSummary()
        const summary = (res && res.data) || {}
        // Map available summary fields; fall back to static data for the rest
        this.data = {
          ...fallbackData,
          monthSalesAmount: Number(summary.monthAmount || fallbackData.monthSalesAmount),
          monthReceivables: Number(summary.monthAmount || fallbackData.monthReceivables),
          monthOrderCount: Number(summary.orderCount || fallbackData.monthOrderCount),
          monthNewCustomers: Number(summary.customerTotal || fallbackData.monthNewCustomers),
          salesFinished: Number(summary.monthAmount || fallbackData.salesFinished),
          salesTarget: Number(summary.yearAmount || fallbackData.salesTarget)
        }
      } catch (e) {
        this.data = { ...fallbackData }
      }
    }
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
