<template>
  <div class="app-container">
    <!-- 页面标题和操作 -->
    <el-card shadow="never" style="margin-bottom: 15px">
      <div slot="header" class="clearfix">
        <span style="font-weight: bold; font-size: 16px">客户优先级管理</span>
        <el-button
          style="float: right"
          type="primary"
          size="small"
          icon="el-icon-refresh"
          @click="handleRecalculateAll"
        >
          重新计算所有优先级
        </el-button>
      </div>

      <!-- 统计卡片 -->
      <el-row :gutter="20">
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-icon" style="background: #f56c6c">
              <i class="el-icon-star-on" />
            </div>
            <div class="stat-info">
              <div class="stat-label">高优先级（≥25分）</div>
              <div class="stat-value">{{ stats.high || 0 }}</div>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-icon" style="background: #e6a23c">
              <i class="el-icon-star-off" />
            </div>
            <div class="stat-info">
              <div class="stat-label">中优先级（15-25分）</div>
              <div class="stat-value">{{ stats.medium || 0 }}</div>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-icon" style="background: #909399">
              <i class="el-icon-minus" />
            </div>
            <div class="stat-info">
              <div class="stat-label">低优先级（<15分）</div>
              <div class="stat-value">{{ stats.low || 0 }}</div>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-icon" style="background: #409eff">
              <i class="el-icon-document" />
            </div>
            <div class="stat-info">
              <div class="stat-label">总订单数</div>
              <div class="stat-value">{{ stats.total || 0 }}</div>
            </div>
          </div>
        </el-col>
      </el-row>
    </el-card>

    <!-- 筛选表单 -->
    <el-card shadow="never">
      <el-form :inline="true" :model="queryParams" size="small">
        <el-form-item label="订单号">
          <el-input
            v-model="queryParams.orderNo"
            placeholder="请输入订单号"
            clearable
            style="width: 180px"
          />
        </el-form-item>
        <el-form-item label="客户名称">
          <el-input
            v-model="queryParams.customerName"
            placeholder="请输入客户名称"
            clearable
            style="width: 180px"
          />
        </el-form-item>
        <el-form-item label="优先级范围">
          <el-select v-model="queryParams.priorityRange" placeholder="全部" clearable style="width: 150px">
            <el-option label="高优先级（≥25分）" value="high" />
            <el-option label="中优先级（15-25分）" value="medium" />
            <el-option label="低优先级（<15分）" value="low" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="el-icon-search" @click="handleQuery">查询</el-button>
          <el-button icon="el-icon-refresh" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>

      <!-- 数据表格 -->
      <el-table
        v-loading="loading"
        :data="priorityList"
        border
        stripe
        style="margin-top: 15px"
      >
        <el-table-column type="index" label="排名" width="60" align="center" />
        <el-table-column prop="orderNo" label="订单号" width="140" />
        <el-table-column prop="customerName" label="客户名称" width="150" show-overflow-tooltip />
        <el-table-column prop="materialCode" label="料号" width="120" />
        <el-table-column prop="totalScore" label="总分" width="80" align="center" sortable>
          <template slot-scope="{ row }">
            <el-tag :type="getPriorityType(row.totalScore)" size="small">
              {{ row.totalScore ? row.totalScore.toFixed(2) : '0.00' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="得分明细" align="center">
          <el-table-column prop="paymentTermScore" label="账期得分" width="100" align="center">
            <template slot-scope="{ row }">
              <span style="color: #409eff">{{ row.paymentTermScore || 0 }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="avgAmountScore" label="月均金额得分" width="130" align="center">
            <template slot-scope="{ row }">
              <span style="color: #67c23a">{{ row.avgAmountScore ? row.avgAmountScore.toFixed(2) : '0.00' }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="priceScore" label="单价得分" width="100" align="center">
            <template slot-scope="{ row }">
              <span style="color: #e6a23c">{{ row.priceScore || 0 }}</span>
            </template>
          </el-table-column>
        </el-table-column>
        <el-table-column prop="orderTime" label="下单时间" width="160" />
        <el-table-column label="操作" width="180" align="center" fixed="right">
          <template slot-scope="{ row }">
            <el-button type="text" size="small" @click="handleViewDetail(row)">
              查看详情
            </el-button>
            <el-button type="text" size="small" @click="handleRecalculate(row)">
              重新计算
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <el-pagination
        :current-page="queryParams.pageNum"
        :page-sizes="[10, 20, 50, 100]"
        :page-size="queryParams.pageSize"
        :total="total"
        layout="total, sizes, prev, pager, next, jumper"
        style="margin-top: 15px; text-align: right"
        @size-change="handleSizeChange"
        @current-change="handlePageChange"
      />
    </el-card>

    <!-- 优先级详情对话框 -->
    <el-dialog
      title="优先级详情"
      :visible.sync="detailVisible"
      width="800px"
      :close-on-click-modal="false"
    >
      <div v-if="detailData">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="订单号">{{ detailData.orderNo }}</el-descriptions-item>
          <el-descriptions-item label="客户名称">{{ detailData.customerName }}</el-descriptions-item>
          <el-descriptions-item label="料号">{{ detailData.materialCode }}</el-descriptions-item>
          <el-descriptions-item label="订单单价">¥{{ detailData.orderPrice }}</el-descriptions-item>
          <el-descriptions-item label="下单时间">{{ detailData.orderTime }}</el-descriptions-item>
          <el-descriptions-item label="优先级总分">
            <el-tag :type="getPriorityType(detailData.totalScore)" size="medium">
              {{ detailData.totalScore ? detailData.totalScore.toFixed(2) : '0.00' }} 分
            </el-tag>
          </el-descriptions-item>
        </el-descriptions>

        <el-divider content-position="left">得分计算详情</el-divider>

        <el-card shadow="never" style="margin-bottom: 15px">
          <div slot="header">账期得分：{{ detailData.paymentTermScore || 0 }} 分</div>
          <p>客户账期：{{ detailData.paymentTermMonths || 0 }} 个月</p>
          <p>计算公式：max[10 - 1×(账期月数-3), 0]</p>
          <p v-if="detailData.paymentTermMonths <= 3">
            计算：max[10 - 1×({{ detailData.paymentTermMonths }}-3), 0] = {{ detailData.paymentTermScore }}
          </p>
        </el-card>

        <el-card shadow="never" style="margin-bottom: 15px">
          <div slot="header">月均成交金额得分：{{ detailData.avgAmountScore ? detailData.avgAmountScore.toFixed(2) : '0.00' }} 分</div>
          <p>近3个月总成交金额：¥{{ detailData.totalAmount3Months || 0 }}</p>
          <p>计算公式：近3个月总成交金额 ÷ 30</p>
          <p>计算：{{ detailData.totalAmount3Months }} ÷ 30 = {{ detailData.avgAmountScore ? detailData.avgAmountScore.toFixed(2) : '0.00' }}</p>
        </el-card>

        <el-card shadow="never">
          <div slot="header">单价得分：{{ detailData.priceScore || 0 }} 分</div>
          <p>订单单价：¥{{ detailData.orderPrice }}</p>
          <p>料号平均单价：¥{{ detailData.avgMaterialPrice }}</p>
          <p>单价偏差率：{{ detailData.priceDeviation ? (detailData.priceDeviation * 100).toFixed(2) : '0.00' }}%</p>
          <p>得分规则：
            <span v-if="detailData.priceDeviation >= 0.2">≥20% → 10分</span>
            <span v-else-if="detailData.priceDeviation >= 0.1">10%-20% → 8分</span>
            <span v-else-if="detailData.priceDeviation >= 0">0%-10% → 5分</span>
            <span v-else-if="detailData.priceDeviation >= -0.1">-10%-0% → 3分</span>
            <span v-else><-10% → 0分</span>
          </p>
        </el-card>
      </div>
      <div v-else style="text-align: center; padding: 50px 0; color: #909399">
        <i class="el-icon-loading" style="font-size: 28px; animation: rotating 2s linear infinite" />
        <div style="margin-top: 10px">加载中...</div>
      </div>

      <div slot="footer">
        <el-button @click="detailVisible = false">关闭</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import {
  getCustomerPriorityList,
  calculatePriority,
  getPriorityDetail,
  recalculateAllPriorities
} from '@/api/customerPriority'

export default {
  name: 'CustomerPriority',
  data() {
    return {
      loading: false,
      priorityList: [],
      total: 0,
      queryParams: {
        pageNum: 1,
        pageSize: 20,
        orderNo: '',
        customerName: '',
        priorityRange: ''
      },
      stats: {
        high: 0,
        medium: 0,
        low: 0,
        total: 0
      },
      detailVisible: false,
      detailData: null
    }
  },
  created() {
    this.loadData()
  },
  methods: {
    async loadData() {
      this.loading = true
      try {
        const res = await getCustomerPriorityList(this.queryParams)
        this.priorityList = res.data.list || []
        this.total = res.data.total || 0
        this.calculateStats()
      } catch (error) {
        this.$message.error('加载数据失败：' + error.message)
      } finally {
        this.loading = false
      }
    },
    calculateStats() {
      this.stats = {
        high: this.priorityList.filter(item => item.totalScore >= 25).length,
        medium: this.priorityList.filter(item => item.totalScore >= 15 && item.totalScore < 25).length,
        low: this.priorityList.filter(item => item.totalScore < 15).length,
        total: this.priorityList.length
      }
    },
    getPriorityType(score) {
      if (score >= 25) return 'danger'
      if (score >= 15) return 'warning'
      return 'info'
    },
    handleQuery() {
      this.queryParams.pageNum = 1
      this.loadData()
    },
    handleReset() {
      this.queryParams = {
        pageNum: 1,
        pageSize: 20,
        orderNo: '',
        customerName: '',
        priorityRange: ''
      }
      this.loadData()
    },
    handleSizeChange(val) {
      this.queryParams.pageSize = val
      this.loadData()
    },
    handlePageChange(val) {
      this.queryParams.pageNum = val
      this.loadData()
    },
    async handleViewDetail(row) {
      try {
        const res = await getPriorityDetail(row.orderId)
        this.detailData = res.data
        this.detailVisible = true
      } catch (error) {
        this.$message.error('获取详情失败：' + error.message)
      }
    },
    async handleRecalculate(row) {
      try {
        await calculatePriority([row.orderId])
        this.$message.success('重新计算成功')
        this.loadData()
      } catch (error) {
        this.$message.error('重新计算失败：' + error.message)
      }
    },
    async handleRecalculateAll() {
      this.$confirm('确定要重新计算所有待排程订单的优先级吗？', '提示', {
        type: 'warning'
      }).then(async() => {
        try {
          await recalculateAllPriorities()
          this.$message.success('重新计算成功')
          this.loadData()
        } catch (error) {
          this.$message.error('重新计算失败：' + error.message)
        }
      })
    }
  }
}
</script>

<style scoped>
.stat-card {
  display: flex;
  align-items: center;
  padding: 15px;
  background: #fff;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 15px;
}
.stat-icon i {
  font-size: 28px;
  color: #fff;
}
.stat-info {
  flex: 1;
}
.stat-label {
  font-size: 13px;
  color: #909399;
  margin-bottom: 5px;
}
.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
}
</style>
