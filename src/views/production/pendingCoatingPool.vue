<template>
  <div class="app-container">
    <!-- 页面标题 -->
    <el-card shadow="never" style="margin-bottom: 15px">
      <div slot="header" class="clearfix">
        <span style="font-weight: bold; font-size: 16px">待涂布订单池管理</span>
        <div style="float: right">
          <el-button
            type="primary"
            size="small"
            icon="el-icon-plus"
            @click="handleAdd"
          >
            添加订单到池
          </el-button>
          <el-button
            type="success"
            size="small"
            icon="el-icon-s-operation"
            @click="handleGenerateTasks"
          >
            生成涂布任务
          </el-button>
        </div>
      </div>

      <!-- 统计卡片 -->
      <el-row :gutter="20">
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-icon" style="background: #e6a23c">
              <i class="el-icon-time" />
            </div>
            <div class="stat-info">
              <div class="stat-label">等待中</div>
              <div class="stat-value">{{ stats.waiting || 0 }}</div>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-icon" style="background: #409eff">
              <i class="el-icon-s-flag" />
            </div>
            <div class="stat-info">
              <div class="stat-label">已排程</div>
              <div class="stat-value">{{ stats.scheduled || 0 }}</div>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-icon" style="background: #67c23a">
              <i class="el-icon-check" />
            </div>
            <div class="stat-info">
              <div class="stat-label">已完成</div>
              <div class="stat-value">{{ stats.completed || 0 }}</div>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-icon" style="background: #f56c6c">
              <i class="el-icon-warning-outline" />
            </div>
            <div class="stat-info">
              <div class="stat-label">涂布料号数</div>
              <div class="stat-value">{{ stats.materialCount || 0 }}</div>
            </div>
          </div>
        </el-col>
      </el-row>
    </el-card>

    <!-- 按料号分组展示 -->
    <el-card shadow="never">
      <el-tabs v-model="activeTab" @tab-click="handleTabClick">
        <!-- 按料号分组视图 -->
        <el-tab-pane label="按料号分组" name="byMaterial">
          <el-collapse v-model="activeNames" accordion>
            <el-collapse-item
              v-for="material in materialGroups"
              :key="material.materialCode"
              :name="material.materialCode"
            >
              <template slot="title">
                <div class="collapse-title">
                  <el-tag type="primary" size="medium">{{ material.materialCode }}</el-tag>
                  <span style="margin-left: 15px; font-weight: bold">{{ material.materialName }}</span>
                  <el-tag type="warning" size="small" style="margin-left: 15px">
                    {{ material.orderCount }}个订单
                  </el-tag>
                  <el-tag type="danger" size="small" style="margin-left: 10px">
                    缺口：{{ material.totalShortage }}
                  </el-tag>
                  <el-tag type="info" size="small" style="margin-left: 10px">
                    建议涂布量：{{ material.suggestedQuantity }}
                  </el-tag>
                </div>
              </template>

              <!-- 该料号的待涂布订单列表 -->
              <el-table :data="material.orders" border stripe size="small">
                <el-table-column type="index" label="序号" width="60" align="center" />
                <el-table-column prop="orderNo" label="订单号" width="140" />
                <el-table-column prop="customerName" label="客户名称" width="150" show-overflow-tooltip />
                <el-table-column prop="shortageQuantity" label="缺口数量" width="100" align="right" />
                <el-table-column prop="customerPriority" label="客户优先级" width="110" align="center">
                  <template slot-scope="{ row }">
                    <el-tag :type="getPriorityType(row.customerPriority)" size="small">
                      {{ row.customerPriority }}分
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="addedAt" label="加入时间" width="160" />
                <el-table-column prop="poolStatus" label="状态" width="100" align="center">
                  <template slot-scope="{ row }">
                    <el-tag :type="getPoolStatusType(row.poolStatus)" size="small">
                      {{ getPoolStatusText(row.poolStatus) }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="150" align="center">
                  <template slot-scope="{ row }">
                    <el-button type="text" size="small" @click="handleViewOrderDetail(row)">
                      详情
                    </el-button>
                    <el-button
                      v-if="row.poolStatus === 'WAITING'"
                      type="text"
                      size="small"
                      style="color: #f56c6c"
                      @click="handleRemove(row)"
                    >
                      移除
                    </el-button>
                  </template>
                </el-table-column>
              </el-table>

              <!-- 涂布计划建议 -->
              <el-card shadow="never" style="margin-top: 10px; background: #f0f9ff">
                <div style="display: flex; justify-content: space-between; align-items: center">
                  <div>
                    <el-tag type="info">最小涂布量（MOQ）：{{ material.moq }}</el-tag>
                    <el-tag type="warning" style="margin-left: 10px">
                      总缺口数量：{{ material.totalShortage }}
                    </el-tag>
                    <el-tag type="success" style="margin-left: 10px">
                      建议涂布量：{{ material.suggestedQuantity }}
                    </el-tag>
                  </div>
                  <el-button
                    v-if="material.orderCount > 0"
                    type="primary"
                    size="small"
                    @click="handleGenerateCoating(material)"
                  >
                    生成涂布任务
                  </el-button>
                </div>
              </el-card>
            </el-collapse-item>
          </el-collapse>
        </el-tab-pane>

        <!-- 全部订单列表视图 -->
        <el-tab-pane label="全部订单" name="allOrders">
          <el-form :inline="true" :model="queryParams" size="small">
            <el-form-item label="订单号">
              <el-input
                v-model="queryParams.orderNo"
                placeholder="请输入订单号"
                clearable
                style="width: 180px"
              />
            </el-form-item>
            <el-form-item label="料号">
              <el-input
                v-model="queryParams.materialCode"
                placeholder="请输入料号"
                clearable
                style="width: 150px"
              />
            </el-form-item>
            <el-form-item label="状态">
              <el-select v-model="queryParams.poolStatus" placeholder="全部" clearable style="width: 120px">
                <el-option label="等待中" value="WAITING" />
                <el-option label="已排程" value="SCHEDULED" />
                <el-option label="已完成" value="COMPLETED" />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" icon="el-icon-search" @click="handleQuery">查询</el-button>
              <el-button icon="el-icon-refresh" @click="handleReset">重置</el-button>
            </el-form-item>
          </el-form>

          <el-table
            v-loading="loading"
            :data="poolList"
            border
            stripe
            style="margin-top: 15px"
          >
            <el-table-column type="index" label="序号" width="60" align="center" />
            <el-table-column prop="orderNo" label="订单号" width="140" />
            <el-table-column prop="customerName" label="客户名称" width="150" show-overflow-tooltip />
            <el-table-column prop="materialCode" label="料号" width="120" />
            <el-table-column prop="materialName" label="料号名称" min-width="150" show-overflow-tooltip />
            <el-table-column prop="shortageQuantity" label="缺口数量" width="100" align="right" />
            <el-table-column prop="customerPriority" label="客户优先级" width="110" align="center">
              <template slot-scope="{ row }">
                <el-tag :type="getPriorityType(row.customerPriority)" size="small">
                  {{ row.customerPriority }}分
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="addedAt" label="加入时间" width="160" />
            <el-table-column prop="poolStatus" label="状态" width="100" align="center">
              <template slot-scope="{ row }">
                <el-tag :type="getPoolStatusType(row.poolStatus)" size="small">
                  {{ getPoolStatusText(row.poolStatus) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="150" align="center" fixed="right">
              <template slot-scope="{ row }">
                <el-button type="text" size="small" @click="handleViewOrderDetail(row)">
                  详情
                </el-button>
                <el-button
                  v-if="row.poolStatus === 'WAITING'"
                  type="text"
                  size="small"
                  style="color: #f56c6c"
                  @click="handleRemove(row)"
                >
                  移除
                </el-button>
              </template>
            </el-table-column>
          </el-table>

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
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 订单详情对话框 -->
    <el-dialog
      title="订单详情"
      :visible.sync="detailVisible"
      width="800px"
      :close-on-click-modal="false"
    >
      <el-descriptions :column="2" border v-if="detailData">
        <el-descriptions-item label="订单号">{{ detailData.orderNo }}</el-descriptions-item>
        <el-descriptions-item label="客户名称">{{ detailData.customerName }}</el-descriptions-item>
        <el-descriptions-item label="料号">{{ detailData.materialCode }}</el-descriptions-item>
        <el-descriptions-item label="料号名称">{{ detailData.materialName }}</el-descriptions-item>
        <el-descriptions-item label="缺口数量">{{ detailData.shortageQuantity }}</el-descriptions-item>
        <el-descriptions-item label="客户优先级">
          <el-tag :type="getPriorityType(detailData.customerPriority)" size="small">
            {{ detailData.customerPriority }}分
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="加入时间">{{ detailData.addedAt }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="getPoolStatusType(detailData.poolStatus)" size="small">
            {{ getPoolStatusText(detailData.poolStatus) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="操作人">{{ detailData.operator }}</el-descriptions-item>
        <el-descriptions-item label="备注" :span="2">{{ detailData.remark }}</el-descriptions-item>
      </el-descriptions>

      <div slot="footer">
        <el-button @click="detailVisible = false">关闭</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import {
  getPendingCoatingPool,
  getPendingCoatingByMaterial,
  removeFromPendingCoatingPool,
  generateCoatingTasks,
  getCoatingStats
} from '@/api/coatingSchedule'

export default {
  name: 'PendingCoatingPool',
  data() {
    return {
      loading: false,
      activeTab: 'byMaterial',
      activeNames: [],
      materialGroups: [],
      poolList: [],
      total: 0,
      queryParams: {
        pageNum: 1,
        pageSize: 20,
        orderNo: '',
        materialCode: '',
        poolStatus: ''
      },
      stats: {
        waiting: 0,
        scheduled: 0,
        completed: 0,
        materialCount: 0
      },
      detailVisible: false,
      detailData: null
    }
  },
  created() {
    this.loadMaterialGroups()
    this.loadStats()
  },
  methods: {
    async loadMaterialGroups() {
      this.loading = true
      try {
        const res = await getPendingCoatingByMaterial()
        this.materialGroups = res.data || []
      } catch (error) {
        this.$message.error('加载数据失败：' + error.message)
      } finally {
        this.loading = false
      }
    },
    async loadPoolList() {
      this.loading = true
      try {
        const res = await getPendingCoatingPool(this.queryParams)
        this.poolList = res.data.list || []
        this.total = res.data.total || 0
      } catch (error) {
        this.$message.error('加载数据失败：' + error.message)
      } finally {
        this.loading = false
      }
    },
    async loadStats() {
      try {
        const res = await getCoatingStats()
        this.stats = res.data || {}
      } catch (error) {
        console.error('加载统计数据失败：', error)
      }
    },
    handleTabClick(tab) {
      if (tab.name === 'allOrders') {
        this.loadPoolList()
      } else {
        this.loadMaterialGroups()
      }
    },
    getPriorityType(score) {
      if (score >= 25) return 'danger'
      if (score >= 15) return 'warning'
      return 'info'
    },
    getPoolStatusType(status) {
      const statusMap = {
        'WAITING': 'warning',
        'SCHEDULED': 'primary',
        'COMPLETED': 'success'
      }
      return statusMap[status] || 'info'
    },
    getPoolStatusText(status) {
      const statusMap = {
        'WAITING': '等待中',
        'SCHEDULED': '已排程',
        'COMPLETED': '已完成'
      }
      return statusMap[status] || status
    },
    handleQuery() {
      this.queryParams.pageNum = 1
      this.loadPoolList()
    },
    handleReset() {
      this.queryParams = {
        pageNum: 1,
        pageSize: 20,
        orderNo: '',
        materialCode: '',
        poolStatus: ''
      }
      this.loadPoolList()
    },
    handleSizeChange(val) {
      this.queryParams.pageSize = val
      this.loadPoolList()
    },
    handlePageChange(val) {
      this.queryParams.pageNum = val
      this.loadPoolList()
    },
    handleAdd() {
      this.$message.info('添加订单功能开发中...')
    },
    handleGenerateTasks() {
      this.$message.info('批量生成涂布任务功能开发中...')
    },
    async handleGenerateCoating(material) {
      this.$confirm(`确定要为料号 ${material.materialCode} 生成涂布任务吗？<br>建议涂布量：${material.suggestedQuantity}`, '提示', {
        type: 'warning',
        dangerouslyUseHTMLString: true
      }).then(async() => {
        try {
          await generateCoatingTasks({
            materialCode: material.materialCode,
            quantity: material.suggestedQuantity
          })
          this.$message.success('涂布任务生成成功')
          this.loadMaterialGroups()
          this.loadStats()
        } catch (error) {
          this.$message.error('生成涂布任务失败：' + error.message)
        }
      })
    },
    handleViewOrderDetail(row) {
      this.detailData = row
      this.detailVisible = true
    },
    async handleRemove(row) {
      this.$confirm('确定要从待涂布池中移除该订单吗？', '提示', {
        type: 'warning'
      }).then(async() => {
        try {
          await removeFromPendingCoatingPool(row.id, 'admin')
          this.$message.success('移除成功')
          if (this.activeTab === 'byMaterial') {
            this.loadMaterialGroups()
          } else {
            this.loadPoolList()
          }
          this.loadStats()
        } catch (error) {
          this.$message.error('移除失败：' + error.message)
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
.collapse-title {
  display: flex;
  align-items: center;
  width: 100%;
}
</style>
