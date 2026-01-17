<template>
  <div class="app-container">
    <!-- 页面标题 -->
    <el-card shadow="never" style="margin-bottom: 15px">
      <div slot="header" class="clearfix">
        <span style="font-weight: bold; font-size: 16px">订单成本核算与全流程追溯</span>
        <el-button
          style="float: right"
          type="success"
          size="small"
          icon="el-icon-download"
          @click="handleExportReport"
        >
          导出报表
        </el-button>
      </div>
    </el-card>

    <!-- 订单搜索 -->
    <el-card shadow="never" style="margin-bottom: 15px">
      <el-form :inline="true" :model="searchForm" size="small">
        <el-form-item label="订单号">
          <el-input
            v-model="searchForm.orderNo"
            placeholder="请输入订单号"
            clearable
            style="width: 180px"
          />
        </el-form-item>
        <el-form-item label="客户名称">
          <el-input
            v-model="searchForm.customerName"
            placeholder="请输入客户名称"
            clearable
            style="width: 180px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="el-icon-search" @click="handleSearch">查询</el-button>
          <el-button icon="el-icon-refresh" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 订单基本信息 -->
    <el-card v-if="orderData" shadow="never" style="margin-bottom: 15px">
      <div slot="header" class="clearfix">
        <span style="font-weight: bold">订单基本信息</span>
        <el-tag type="success" size="small" style="float: right">
          {{ orderData.orderStatus }}
        </el-tag>
      </div>

      <el-descriptions :column="3" border>
        <el-descriptions-item label="订单号">{{ orderData.orderNo }}</el-descriptions-item>
        <el-descriptions-item label="客户名称">{{ orderData.customerName }}</el-descriptions-item>
        <el-descriptions-item label="料号">{{ orderData.materialCode }}</el-descriptions-item>
        <el-descriptions-item label="订单数量">{{ orderData.orderQuantity }}</el-descriptions-item>
        <el-descriptions-item label="订单金额">¥{{ orderData.orderAmount }}</el-descriptions-item>
        <el-descriptions-item label="下单时间">{{ orderData.orderTime }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <!-- 成本汇总 -->
    <el-row v-if="costData" :gutter="15" style="margin-bottom: 15px">
      <el-col :span="6">
        <el-card shadow="hover" class="cost-card">
          <div class="cost-icon" style="background: #409eff">
            <i class="el-icon-box" />
          </div>
          <div class="cost-info">
            <div class="cost-label">物料成本</div>
            <div class="cost-value">¥{{ costData.materialCost || 0 }}</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="cost-card">
          <div class="cost-icon" style="background: #67c23a">
            <i class="el-icon-set-up" />
          </div>
          <div class="cost-info">
            <div class="cost-label">工序成本</div>
            <div class="cost-value">¥{{ costData.processCost || 0 }}</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="cost-card">
          <div class="cost-icon" style="background: #e6a23c">
            <i class="el-icon-money" />
          </div>
          <div class="cost-info">
            <div class="cost-label">总成本</div>
            <div class="cost-value">¥{{ costData.totalCost || 0 }}</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="cost-card">
          <div class="cost-icon" style="background: #f56c6c">
            <i class="el-icon-star-on" />
          </div>
          <div class="cost-info">
            <div class="cost-label">利润率</div>
            <div class="cost-value">{{ costData.profitRate || 0 }}%</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- Tab页签 -->
    <el-card v-if="orderData" shadow="never">
      <el-tabs v-model="activeTab">
        <!-- 物料成本明细 -->
        <el-tab-pane label="物料成本明细" name="material">
          <el-table :data="materialCostList" border stripe>
            <el-table-column type="index" label="序号" width="60" align="center" />
            <el-table-column prop="lockNo" label="锁定单号" width="180" />
            <el-table-column prop="materialQrCode" label="物料二维码" width="150" show-overflow-tooltip />
            <el-table-column prop="materialCode" label="料号" width="120" />
            <el-table-column prop="usedQuantity" label="使用数量" width="100" align="right" />
            <el-table-column prop="unitCost" label="单位成本" width="100" align="right">
              <template slot-scope="{ row }">
                ¥{{ row.unitCost ? row.unitCost.toFixed(2) : '0.00' }}
              </template>
            </el-table-column>
            <el-table-column prop="totalCost" label="总成本" width="120" align="right">
              <template slot-scope="{ row }">
                <span style="font-weight: bold; color: #409eff">
                  ¥{{ row.totalCost ? row.totalCost.toFixed(2) : '0.00' }}
                </span>
              </template>
            </el-table-column>
            <el-table-column prop="lockTime" label="锁定时间" width="160" />
            <el-table-column prop="pickingTime" label="领料时间" width="160" />
            <el-table-column label="操作" width="100" align="center">
              <template slot-scope="{ row }">
                <el-button type="text" size="small" @click="handleViewMaterialDetail(row)">
                  详情
                </el-button>
              </template>
            </el-table-column>
          </el-table>

          <div style="margin-top: 15px; text-align: right; font-size: 14px">
            <span style="color: #606266">物料成本合计：</span>
            <span style="font-weight: bold; color: #409eff; font-size: 16px">
              ¥{{ materialCostTotal }}
            </span>
          </div>
        </el-tab-pane>

        <!-- 工序成本明细 -->
        <el-tab-pane label="工序成本明细" name="process">
          <el-table :data="processCostList" border stripe>
            <el-table-column type="index" label="序号" width="60" align="center" />
            <el-table-column prop="processName" label="工序名称" width="120" />
            <el-table-column prop="taskNo" label="任务编号" width="140" />
            <el-table-column prop="equipmentName" label="设备" width="120" />
            <el-table-column prop="operator" label="操作人" width="100" />
            <el-table-column prop="startTime" label="开始时间" width="160" />
            <el-table-column prop="endTime" label="完成时间" width="160" />
            <el-table-column prop="duration" label="耗时(小时)" width="100" align="right" />
            <el-table-column prop="laborCost" label="人工成本" width="100" align="right">
              <template slot-scope="{ row }">
                ¥{{ row.laborCost ? row.laborCost.toFixed(2) : '0.00' }}
              </template>
            </el-table-column>
            <el-table-column prop="equipmentCost" label="设备折旧" width="100" align="right">
              <template slot-scope="{ row }">
                ¥{{ row.equipmentCost ? row.equipmentCost.toFixed(2) : '0.00' }}
              </template>
            </el-table-column>
            <el-table-column prop="totalCost" label="工序成本" width="120" align="right">
              <template slot-scope="{ row }">
                <span style="font-weight: bold; color: #67c23a">
                  ¥{{ row.totalCost ? row.totalCost.toFixed(2) : '0.00' }}
                </span>
              </template>
            </el-table-column>
          </el-table>

          <div style="margin-top: 15px; text-align: right; font-size: 14px">
            <span style="color: #606266">工序成本合计：</span>
            <span style="font-weight: bold; color: #67c23a; font-size: 16px">
              ¥{{ processCostTotal }}
            </span>
          </div>
        </el-tab-pane>

        <!-- 全流程追溯 -->
        <el-tab-pane label="全流程追溯" name="tracking">
          <el-timeline>
            <el-timeline-item
              v-for="(event, index) in trackingEvents"
              :key="index"
              :timestamp="event.timestamp"
              :type="event.type"
              placement="top"
            >
              <el-card shadow="hover">
                <div style="font-weight: bold; margin-bottom: 10px">
                  <el-tag :type="event.type" size="small">{{ event.stage }}</el-tag>
                  <span style="margin-left: 10px">{{ event.title }}</span>
                </div>
                <div style="font-size: 13px; color: #606266">
                  {{ event.description }}
                </div>
                <div v-if="event.details" style="margin-top: 10px">
                  <el-descriptions :column="2" border size="small">
                    <el-descriptions-item
                      v-for="(value, key) in event.details"
                      :key="key"
                      :label="key"
                    >
                      {{ value }}
                    </el-descriptions-item>
                  </el-descriptions>
                </div>
              </el-card>
            </el-timeline-item>
          </el-timeline>
        </el-tab-pane>

        <!-- 成本分析 -->
        <el-tab-pane label="成本分析" name="analysis">
          <el-row :gutter="20">
            <el-col :span="12">
              <el-card shadow="never">
                <div slot="header">成本构成</div>
                <div id="costPieChart" style="width: 100%; height: 300px" />
              </el-card>
            </el-col>
            <el-col :span="12">
              <el-card shadow="never">
                <div slot="header">成本对比分析</div>
                <div style="padding: 20px">
                  <el-descriptions :column="1" border>
                    <el-descriptions-item label="订单金额">¥{{ orderData.orderAmount }}</el-descriptions-item>
                    <el-descriptions-item label="总成本">¥{{ costData.totalCost }}</el-descriptions-item>
                    <el-descriptions-item label="毛利润">¥{{ costData.grossProfit }}</el-descriptions-item>
                    <el-descriptions-item label="毛利率">{{ costData.profitRate }}%</el-descriptions-item>
                  </el-descriptions>

                  <div style="margin-top: 20px">
                    <el-alert
                      v-if="costData.profitRate >= 20"
                      title="利润率良好"
                      type="success"
                      :closable="false"
                    />
                    <el-alert
                      v-else-if="costData.profitRate >= 10"
                      title="利润率正常"
                      type="warning"
                      :closable="false"
                    />
                    <el-alert
                      v-else
                      title="利润率偏低，请关注成本控制"
                      type="error"
                      :closable="false"
                    />
                  </div>
                </div>
              </el-card>
            </el-col>
          </el-row>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 空状态 -->
    <el-card v-else shadow="never" style="text-align: center; padding: 80px 0">
      <i class="el-icon-search" style="font-size: 64px; color: #909399" />
      <div style="margin-top: 20px; color: #606266; font-size: 14px">
        请输入订单号查询成本核算信息
      </div>
    </el-card>
  </div>
</template>

<script>
import {
  getOrderCostTracking,
  getOrderMaterialCost,
  getOrderProcessCost,
  getOrderFullTracking,
  exportOrderCostReport
} from '@/api/costTracking'

export default {
  name: 'CostTracking',
  data() {
    return {
      searchForm: {
        orderNo: '',
        customerName: ''
      },
      activeTab: 'material',
      orderData: null,
      costData: null,
      materialCostList: [],
      processCostList: [],
      trackingEvents: []
    }
  },
  computed: {
    materialCostTotal() {
      return this.materialCostList.reduce((sum, item) => sum + (item.totalCost || 0), 0).toFixed(2)
    },
    processCostTotal() {
      return this.processCostList.reduce((sum, item) => sum + (item.totalCost || 0), 0).toFixed(2)
    }
  },
  methods: {
    async handleSearch() {
      if (!this.searchForm.orderNo) {
        this.$message.warning('请输入订单号')
        return
      }

      try {
        // 加载订单成本追溯信息
        const costRes = await getOrderCostTracking(this.searchForm.orderNo)
        this.orderData = costRes.data.order
        this.costData = costRes.data.cost

        // 加载物料成本明细
        const materialRes = await getOrderMaterialCost(this.searchForm.orderNo)
        this.materialCostList = materialRes.data || []

        // 加载工序成本明细
        const processRes = await getOrderProcessCost(this.searchForm.orderNo)
        this.processCostList = processRes.data || []

        // 加载全流程追溯
        const trackingRes = await getOrderFullTracking(this.searchForm.orderNo)
        this.trackingEvents = trackingRes.data || []
      } catch (error) {
        this.$message.error('查询失败：' + error.message)
      }
    },
    handleReset() {
      this.searchForm = {
        orderNo: '',
        customerName: ''
      }
      this.orderData = null
      this.costData = null
      this.materialCostList = []
      this.processCostList = []
      this.trackingEvents = []
    },
    async handleExportReport() {
      if (!this.orderData) {
        this.$message.warning('请先查询订单信息')
        return
      }

      try {
        const res = await exportOrderCostReport(this.orderData.orderId)
        const blob = new Blob([res], { type: 'application/vnd.ms-excel' })
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `订单成本报表_${this.orderData.orderNo}_${new Date().getTime()}.xlsx`
        link.click()
        window.URL.revokeObjectURL(url)
        this.$message.success('导出成功')
      } catch (error) {
        this.$message.error('导出失败：' + error.message)
      }
    },
    handleViewMaterialDetail(row) {
      this.$message.info('查看物料详情功能开发中...')
    }
  }
}
</script>

<style scoped>
.cost-card {
  display: flex;
  align-items: center;
  padding: 15px;
}
.cost-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 15px;
}
.cost-icon i {
  font-size: 28px;
  color: #fff;
}
.cost-info {
  flex: 1;
}
.cost-label {
  font-size: 13px;
  color: #909399;
  margin-bottom: 5px;
}
.cost-value {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
}
</style>
