<template>
  <div class="app-container">
    <!-- 页面标题 -->
    <el-card shadow="never" style="margin-bottom: 15px">
      <div slot="header" class="clearfix">
        <span style="font-weight: bold; font-size: 16px">订单物料锁定管理</span>
        <el-button
          style="float: right"
          type="primary"
          size="small"
          icon="el-icon-refresh"
          @click="loadData"
        >
          刷新数据
        </el-button>
      </div>

      <!-- 统计卡片 -->
      <el-row :gutter="20">
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-icon" style="background: #67c23a">
              <i class="el-icon-lock" />
            </div>
            <div class="stat-info">
              <div class="stat-label">已锁定</div>
              <div class="stat-value">{{ stats.locked || 0 }}</div>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-icon" style="background: #e6a23c">
              <i class="el-icon-sell" />
            </div>
            <div class="stat-info">
              <div class="stat-label">已触发领料</div>
              <div class="stat-value">{{ stats.picked || 0 }}</div>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-icon" style="background: #909399">
              <i class="el-icon-unlock" />
            </div>
            <div class="stat-info">
              <div class="stat-label">已释放</div>
              <div class="stat-value">{{ stats.released || 0 }}</div>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-icon" style="background: #409eff">
              <i class="el-icon-goods" />
            </div>
            <div class="stat-info">
              <div class="stat-label">多单共用物料</div>
              <div class="stat-value">{{ stats.shared || 0 }}</div>
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
        <el-form-item label="物料二维码">
          <el-input
            v-model="queryParams.qrCode"
            placeholder="请输入二维码"
            clearable
            style="width: 200px"
          />
        </el-form-item>
        <el-form-item label="锁定状态">
          <el-select v-model="queryParams.lockStatus" placeholder="全部" clearable style="width: 130px">
            <el-option label="已锁定" value="LOCKED" />
            <el-option label="已领料" value="PICKED" />
            <el-option label="已释放" value="RELEASED" />
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
        :data="lockList"
        border
        stripe
        style="margin-top: 15px"
        :row-class-name="tableRowClassName"
      >
        <el-table-column type="expand">
          <template slot-scope="{ row }">
            <el-card v-if="row.sharedOrders && row.sharedOrders.length > 1" shadow="never">
              <div slot="header">多单共用详情（共{{ row.sharedOrders.length }}个订单）</div>
              <el-table :data="row.sharedOrders" border size="small">
                <el-table-column prop="orderNo" label="订单号" width="140" />
                <el-table-column prop="customerName" label="客户" width="150" />
                <el-table-column prop="occupyQuantity" label="占用数量" width="100" align="right" />
                <el-table-column prop="customerPriority" label="客户优先级" width="120" align="center">
                  <template slot-scope="scope">
                    <el-tag :type="getPriorityType(scope.row.customerPriority)" size="small">
                      {{ scope.row.customerPriority }}分
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="lockTime" label="锁定时间" width="160" />
              </el-table>
            </el-card>
          </template>
        </el-table-column>
        <el-table-column prop="lockNo" label="锁定单号" width="180" />
        <el-table-column prop="orderNo" label="订单号" width="140" />
        <el-table-column prop="customerName" label="客户名称" width="150" show-overflow-tooltip />
        <el-table-column prop="materialCode" label="料号" width="120" />
        <el-table-column prop="stockQrCode" label="物料二维码" width="150" show-overflow-tooltip />
        <el-table-column prop="lockedQuantity" label="锁定数量" width="100" align="right" />
        <el-table-column prop="sharedOrderCount" label="占用订单数" width="110" align="center">
          <template slot-scope="{ row }">
            <el-tag v-if="row.sharedOrderCount > 1" type="warning" size="small">
              {{ row.sharedOrderCount }}个订单
            </el-tag>
            <span v-else>1</span>
          </template>
        </el-table-column>
        <el-table-column prop="customerPriority" label="客户优先级" width="110" align="center">
          <template slot-scope="{ row }">
            <el-tag :type="getPriorityType(row.customerPriority)" size="small">
              {{ row.customerPriority }}分
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="lockStatus" label="锁定状态" width="100" align="center">
          <template slot-scope="{ row }">
            <el-tag :type="getLockStatusType(row.lockStatus)" size="small">
              {{ getLockStatusText(row.lockStatus) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="pickingStatus" label="领料状态" width="100" align="center">
          <template slot-scope="{ row }">
            <el-tag :type="getPickingStatusType(row.pickingStatus)" size="small">
              {{ getPickingStatusText(row.pickingStatus) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="lockTime" label="锁定时间" width="160" />
        <el-table-column label="操作" width="200" align="center" fixed="right">
          <template slot-scope="{ row }">
            <el-button
              v-if="row.lockStatus === 'LOCKED' && row.pickingStatus === 'NOT_TRIGGERED'"
              type="text"
              size="small"
              @click="handleTriggerPicking(row)"
            >
              触发领料
            </el-button>
            <el-button
              v-if="row.lockStatus === 'LOCKED'"
              type="text"
              size="small"
              style="color: #f56c6c"
              @click="handleRelease(row)"
            >
              释放锁定
            </el-button>
            <el-button
              type="text"
              size="small"
              @click="handleViewDetail(row)"
            >
              查看详情
            </el-button>
            <el-button
              v-if="row.sharedOrderCount > 1"
              type="text"
              size="small"
              @click="handleViewShared(row)"
            >
              共用明细
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

    <!-- 锁定详情对话框 -->
    <el-dialog
      title="锁定详情"
      :visible.sync="detailVisible"
      width="900px"
      :close-on-click-modal="false"
    >
      <el-descriptions v-if="detailData" :column="2" border>
        <el-descriptions-item label="锁定单号" :span="2">{{ detailData.lockNo }}</el-descriptions-item>
        <el-descriptions-item label="订单号">{{ detailData.orderNo }}</el-descriptions-item>
        <el-descriptions-item label="客户名称">{{ detailData.customerName }}</el-descriptions-item>
        <el-descriptions-item label="料号">{{ detailData.materialCode }}</el-descriptions-item>
        <el-descriptions-item label="规格">{{ detailData.specification }}</el-descriptions-item>
        <el-descriptions-item label="物料二维码" :span="2">{{ detailData.stockQrCode }}</el-descriptions-item>
        <el-descriptions-item label="锁定数量">{{ detailData.lockedQuantity }}</el-descriptions-item>
        <el-descriptions-item label="客户优先级">
          <el-tag :type="getPriorityType(detailData.customerPriority)" size="small">
            {{ detailData.customerPriority }}分
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="锁定状态">
          <el-tag :type="getLockStatusType(detailData.lockStatus)" size="small">
            {{ getLockStatusText(detailData.lockStatus) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="领料状态">
          <el-tag :type="getPickingStatusType(detailData.pickingStatus)" size="small">
            {{ getPickingStatusText(detailData.pickingStatus) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="锁定时间">{{ detailData.lockTime }}</el-descriptions-item>
        <el-descriptions-item label="领料触发时间">{{ detailData.pickingTriggeredAt }}</el-descriptions-item>
        <el-descriptions-item label="操作人">{{ detailData.operator }}</el-descriptions-item>
        <el-descriptions-item label="备注" :span="2">{{ detailData.remark }}</el-descriptions-item>
      </el-descriptions>

      <div slot="footer">
        <el-button @click="detailVisible = false">关闭</el-button>
      </div>
    </el-dialog>

    <!-- 多单共用详情对话框 -->
    <el-dialog
      title="多单共用物料详情"
      :visible.sync="sharedVisible"
      width="1000px"
      :close-on-click-modal="false"
    >
      <div v-if="sharedData">
        <el-alert
          :title="`物料二维码：${sharedData.qrCode}`"
          type="info"
          :closable="false"
          style="margin-bottom: 15px"
        />
        <el-table :data="sharedData.orders" border stripe>
          <el-table-column type="index" label="序号" width="60" align="center" />
          <el-table-column prop="orderNo" label="订单号" width="140" />
          <el-table-column prop="customerName" label="客户名称" width="150" show-overflow-tooltip />
          <el-table-column prop="occupyQuantity" label="占用数量" width="100" align="right" />
          <el-table-column prop="customerPriority" label="客户优先级" width="120" align="center">
            <template slot-scope="{ row }">
              <el-tag :type="getPriorityType(row.customerPriority)" size="small">
                {{ row.customerPriority }}分
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="lockTime" label="锁定时间" width="160" />
          <el-table-column prop="lockStatus" label="状态" width="100" align="center">
            <template slot-scope="{ row }">
              <el-tag :type="getLockStatusType(row.lockStatus)" size="small">
                {{ getLockStatusText(row.lockStatus) }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>
      </div>
      <div slot="footer">
        <el-button @click="sharedVisible = false">关闭</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import {
  getOrderMaterialLocks,
  releaseOrderMaterialLock,
  triggerMaterialPicking,
  getMaterialSharedLocks,
  getMaterialLockStats
} from '@/api/materialLock'

export default {
  name: 'OrderMaterialLock',
  data() {
    return {
      loading: false,
      lockList: [],
      total: 0,
      queryParams: {
        pageNum: 1,
        pageSize: 20,
        orderNo: '',
        customerName: '',
        qrCode: '',
        lockStatus: ''
      },
      stats: {
        locked: 0,
        picked: 0,
        released: 0,
        shared: 0
      },
      detailVisible: false,
      detailData: null,
      sharedVisible: false,
      sharedData: null
    }
  },
  created() {
    this.loadData()
    this.loadStats()
  },
  methods: {
    async loadData() {
      this.loading = true
      try {
        const res = await getOrderMaterialLocks(this.queryParams)
        this.lockList = res.data.list || []
        this.total = Number(res.data.total) || 0
      } catch (error) {
        this.$message.error('加载数据失败：' + error.message)
      } finally {
        this.loading = false
      }
    },
    async loadStats() {
      try {
        const res = await getMaterialLockStats()
        this.stats = res.data || {}
      } catch (error) {
        console.error('加载统计数据失败：', error)
      }
    },
    tableRowClassName({ row }) {
      if (row.sharedOrderCount > 1) {
        return 'shared-row'
      }
      return ''
    },
    getPriorityType(score) {
      if (score >= 25) return 'danger'
      if (score >= 15) return 'warning'
      return 'info'
    },
    getLockStatusType(status) {
      const statusMap = {
        'LOCKED': 'success',
        'PICKED': 'warning',
        'RELEASED': 'info'
      }
      return statusMap[status] || 'info'
    },
    getLockStatusText(status) {
      const statusMap = {
        'LOCKED': '已锁定',
        'PICKED': '已领料',
        'RELEASED': '已释放'
      }
      return statusMap[status] || status
    },
    getPickingStatusType(status) {
      const statusMap = {
        'NOT_TRIGGERED': 'info',
        'TRIGGERED': 'success',
        'PICKED': 'warning'
      }
      return statusMap[status] || 'info'
    },
    getPickingStatusText(status) {
      const statusMap = {
        'NOT_TRIGGERED': '未触发',
        'TRIGGERED': '已触发',
        'PICKED': '已领料'
      }
      return statusMap[status] || status
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
        qrCode: '',
        lockStatus: ''
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
    async handleTriggerPicking(row) {
      this.$confirm('确定要触发该物料的领料操作吗？', '提示', {
        type: 'warning'
      }).then(async() => {
        try {
          await triggerMaterialPicking(row.id, 'admin')
          this.$message.success('领料触发成功')
          this.loadData()
          this.loadStats()
        } catch (error) {
          this.$message.error('领料触发失败：' + error.message)
        }
      })
    },
    async handleRelease(row) {
      this.$confirm('确定要释放该物料锁定吗？释放后其他订单可以使用该物料。', '提示', {
        type: 'warning'
      }).then(async() => {
        try {
          await releaseOrderMaterialLock(row.id, 'admin')
          this.$message.success('释放成功')
          this.loadData()
          this.loadStats()
        } catch (error) {
          this.$message.error('释放失败：' + error.message)
        }
      })
    },
    handleViewDetail(row) {
      this.detailData = row
      this.detailVisible = true
    },
    async handleViewShared(row) {
      try {
        const res = await getMaterialSharedLocks(row.stockQrCode)
        this.sharedData = {
          qrCode: row.stockQrCode,
          orders: res.data || []
        }
        this.sharedVisible = true
      } catch (error) {
        this.$message.error('获取共用详情失败：' + error.message)
      }
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

<style>
.el-table .shared-row {
  background: #fdf6ec !important;
}
</style>
