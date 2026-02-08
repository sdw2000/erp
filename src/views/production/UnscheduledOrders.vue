<template>
  <div class="unscheduled-orders-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2>📋 未排程订单管理</h2>
      <p>查询已锁定物料但未进入待排程池的订单，支持直接排程和复卷分切处理</p>
    </div>

    <!-- 统计信息卡片 -->
    <el-row :gutter="20" class="stats-row">
      <el-col :xs="24" :sm="12" :md="6">
        <div class="stat-card total">
          <div class="stat-value">{{ stats.totalUnscheduled || 0 }}</div>
          <div class="stat-label">未排程订单</div>
        </div>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <div class="stat-card direct">
          <div class="stat-value">{{ stats.directScheduleable || 0 }}</div>
          <div class="stat-label">✅ 可直接排程</div>
        </div>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <div class="stat-card slitting">
          <div class="stat-value">{{ stats.needSlitting || 0 }}</div>
          <div class="stat-label">🟡 需要复卷分切</div>
        </div>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <div class="stat-card manual">
          <div class="stat-value">{{ stats.needManual || 0 }}</div>
          <div class="stat-label">🔴 需要手动处理</div>
        </div>
      </el-col>
    </el-row>

    <!-- 筛选条件 -->
    <el-card class="filter-card">
      <div slot="header" class="clearfix">
        <span>📌 筛选条件</span>
        <el-button-group style="float: right;">
          <el-button type="primary" size="small" icon="el-icon-search" @click="handleSearch">查询</el-button>
          <el-button size="small" icon="el-icon-refresh" @click="handleReset">重置</el-button>
          <el-button size="small" icon="el-icon-refresh-right" @click="handleRefresh">刷新</el-button>
        </el-button-group>
      </div>

      <el-form :model="queryForm" label-width="100px" size="small">
        <el-row :gutter="20">
          <el-col :xs="24" :sm="12" :md="6">
            <el-form-item label="订单号">
              <el-input
                v-model="queryForm.orderNo"
                placeholder="输入订单号"
                clearable
              />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="6">
            <el-form-item label="客户名称">
              <el-input
                v-model="queryForm.customerName"
                placeholder="输入客户名称"
                clearable
              />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="6">
            <el-form-item label="物料代码">
              <el-input
                v-model="queryForm.materialCode"
                placeholder="输入物料代码"
                clearable
              />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="6">
            <el-form-item label="操作建议">
              <el-select
                v-model="queryForm.statusBadge"
                placeholder="选择操作建议"
                clearable
              >
                <el-option label="✅ 可直接排程" value="directScheduleable" />
                <el-option label="🟡 需要复卷分切" value="needSlitting" />
                <el-option label="🔴 需要手动处理" value="needManual" />
                <el-option label="🔵 已入池待排程" value="inPool" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </el-card>

    <!-- 订单列表表格 -->
    <el-card class="table-card">
      <div slot="header" class="clearfix">
        <span>📊 未排程订单列表</span>
        <el-button-group style="float: right;">
          <el-button type="success" size="small" :disabled="!selectedOrders.length" @click="handleBatchEnterPool">
            批量进入排程池 ({{ selectedOrders.length }})
          </el-button>
          <el-button size="small" @click="handleExport">导出</el-button>
        </el-button-group>
      </div>

      <el-table
        :data="tableData"
        :loading="loading"
        stripe
        size="small"
        style="width: 100%"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="orderNo" label="订单号" width="120" sortable />
        <el-table-column prop="customerName" label="客户" width="100" />
        <el-table-column prop="priority" label="优先级" width="80" align="center">
          <template slot-scope="scope">
            <el-progress
              :percentage="scope.row.priority || 0"
              :color="scope.row.priority > 70 ? '#f56c6c' : '#e6a23c'"
              show-text
            />
          </template>
        </el-table-column>
        <el-table-column prop="planDate" label="计划日期" width="110" sortable />
        <el-table-column prop="totalQty" label="需求量" width="80" align="right" />
        <el-table-column prop="lockedQty" label="已锁定" width="80" align="right">
          <template slot-scope="scope">
            <span style="color: #67c23a">{{ scope.row.lockedQty }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="shortageQty" label="缺口" width="80" align="right">
          <template slot-scope="scope">
            <span :style="{ color: scope.row.shortageQty > 0 ? '#f56c6c' : '#909399' }">
              {{ scope.row.shortageQty }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="inPoolQty" label="已入池" width="80" align="right" />
        <el-table-column prop="statusBadge" label="操作建议" width="140">
          <template slot-scope="scope">
            <el-tag
              :type="getStatusTagType(scope.row.statusBadge)"
              size="small"
            >
              {{ scope.row.statusBadge }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template slot-scope="scope">
            <el-button
              size="mini"
              type="primary"
              @click="handleViewDetail(scope.row)"
            >
              详情
            </el-button>
            <el-dropdown size="mini" @command="handleAction">
              <el-button type="success" size="mini">
                操作 <i class="el-icon-arrow-down el-icon--right" />
              </el-button>
              <el-dropdown-menu slot="dropdown">
                <el-dropdown-item :command="{ action: 'enterPool', row: scope.row }">
                  📥 进入排程池
                </el-dropdown-item>
                <el-dropdown-item :command="{ action: 'handleShortage', row: scope.row }">
                  🔧 处理缺口
                </el-dropdown-item>
                <el-dropdown-item :command="{ action: 'increasePriority', row: scope.row }">
                  ⬆️ 提高优先级
                </el-dropdown-item>
                <el-dropdown-item :command="{ action: 'refreshStatus', row: scope.row }">
                  🔄 刷新状态
                </el-dropdown-item>
              </el-dropdown-menu>
            </el-dropdown>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <el-pagination
        :current-page="pageNum"
        :page-sizes="[10, 20, 30, 50]"
        :page-size="pageSize"
        layout="total, sizes, prev, pager, next, jumper"
        :total="total"
        style="margin-top: 20px; text-align: right;"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </el-card>

    <!-- 详情面板 (右侧抽屉) -->
    <el-drawer
      title="📋 订单详情"
      :visible.sync="detailDrawerVisible"
      direction="rtl"
      size="600px"
    >
      <div v-if="detailData" class="detail-content">
        <!-- 订单基本信息 -->
        <div class="section">
          <h4>📌 订单信息</h4>
          <el-row :gutter="20">
            <el-col :span="12">
              <p><strong>订单号：</strong> {{ detailData.orderNo }}</p>
              <p><strong>客户：</strong> {{ detailData.customerName }}</p>
              <p><strong>优先级：</strong> {{ detailData.priority }}</p>
            </el-col>
            <el-col :span="12">
              <p><strong>计划日期：</strong> {{ detailData.planDate }}</p>
              <p><strong>交期：</strong> {{ detailData.deliveryDate }}</p>
              <p><strong>状态：</strong> {{ detailData.statusBadge }}</p>
            </el-col>
          </el-row>
        </div>

        <!-- 物料明细 -->
        <div class="section">
          <h4>📦 物料明细</h4>
          <el-table :data="detailData.materials" size="small" border>
            <el-table-column prop="materialCode" label="料号" width="100" />
            <el-table-column prop="qty" label="需求" width="60" align="right" />
            <el-table-column prop="lockedQty" label="已锁定" width="60" align="right" />
            <el-table-column prop="shortageQty" label="缺口" width="60" align="right" />
            <el-table-column prop="inPoolQty" label="已入池" width="60" align="right" />
            <el-table-column prop="status" label="状态" width="80">
              <template slot-scope="scope">
                <el-tag :type="getStatusTagType(scope.row.status)" size="mini">
                  {{ scope.row.status }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <!-- 缺口处理 -->
        <div v-if="detailData.shortages && detailData.shortages.length > 0" class="section">
          <h4>⚠️ 物料缺口</h4>
          <el-table :data="detailData.shortages" size="small" border>
            <el-table-column prop="materialCode" label="料号" width="100" />
            <el-table-column prop="shortageQty" label="缺口数" width="70" align="right" />
            <el-table-column prop="sourceMaterial" label="源物料" width="100" />
            <el-table-column prop="needSlitting" label="分切" width="60">
              <template slot-scope="scope">
                {{ scope.row.needSlitting ? '✅是' : '❌否' }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100" align="center">
              <template slot-scope="scope">
                <el-button
                  v-if="scope.row.needSlitting"
                  type="warning"
                  size="mini"
                  @click="handleCreateSlittingTask(scope.row)"
                >
                  创建分切
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <!-- 操作按钮 -->
        <div class="action-buttons">
          <el-button type="primary" @click="handleEnterPoolFromDetail">进入排程池</el-button>
          <el-button type="warning" @click="handleRefreshStatusFromDetail">刷新状态</el-button>
          <el-button @click="detailDrawerVisible = false">关闭</el-button>
        </div>
      </div>
    </el-drawer>

    <!-- 创建分切任务对话框 -->
    <el-dialog
      title="🔧 创建复卷分切任务"
      :visible.sync="slittingDialogVisible"
      width="500px"
    >
      <el-form :model="slittingForm" label-width="120px" size="small">
        <el-form-item label="缺口料号">
          <el-input v-model="slittingForm.materialCode" disabled />
        </el-form-item>
        <el-form-item label="缺口数量">
          <el-input v-model="slittingForm.shortageQty" disabled />
        </el-form-item>
        <el-form-item label="源物料">
          <el-input v-model="slittingForm.sourceMaterial" disabled />
        </el-form-item>
        <el-form-item label="可用库存">
          <el-input v-model="slittingForm.availableQty" disabled />
        </el-form-item>
        <el-form-item label="分切设备">
          <el-select v-model="slittingForm.equipmentId" placeholder="选择分切设备">
            <el-option
              v-for="eq in equipments"
              :key="eq.id"
              :label="eq.name"
              :value="eq.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="计划分切日期">
          <el-date-picker
            v-model="slittingForm.scheduledDate"
            type="date"
            placeholder="选择日期"
          />
        </el-form-item>
      </el-form>
      <span slot="footer" class="dialog-footer">
        <el-button @click="slittingDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleConfirmSlittingTask">确认</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import {
  getUnscheduledOrdersPage,
  getUnscheduledOrderDetail,
  getUnscheduledOrdersStats,
  enterCoatingPool,
  batchEnterCoatingPool,
  createSlittingTaskForShortage,
  refreshOrderScheduleStatus,
  increaseOrderPriority
} from '@/api/unscheduledOrders'

export default {
  name: 'UnscheduledOrders',
  data() {
    return {
      // 查询参数
      queryForm: {
        orderNo: '',
        customerName: '',
        materialCode: '',
        statusBadge: ''
      },
      // 表格数据
      tableData: [],
      loading: false,
      pageNum: 1,
      pageSize: 10,
      total: 0,
      selectedOrders: [],
      // 统计信息
      stats: {},
      // 详情抽屉
      detailDrawerVisible: false,
      detailData: null,
      // 分切对话框
      slittingDialogVisible: false,
      slittingForm: {
        materialCode: '',
        shortageQty: 0,
        sourceMaterial: '',
        availableQty: 0,
        equipmentId: null,
        scheduledDate: null,
        shortageId: null
      },
      // 设备列表
      equipments: [
        { id: 1, name: '分切机1号' },
        { id: 2, name: '分切机2号' },
        { id: 3, name: '分切机3号' }
      ]
    }
  },
  mounted() {
    this.handleSearch()
    this.loadStats()
  },
  methods: {
    // 查询
    handleSearch() {
      this.loading = true
      getUnscheduledOrdersPage({
        pageNum: this.pageNum,
        pageSize: this.pageSize,
        ...this.queryForm
      }).then(res => {
        this.tableData = res.data.records || []
        this.total = Number(res.data?.total || 0)
        this.loading = false
      }).catch(err => {
        this.$message.error(err.message)
        this.loading = false
      })
    },
    // 重置
    handleReset() {
      this.queryForm = {
        orderNo: '',
        customerName: '',
        materialCode: '',
        statusBadge: ''
      }
      this.pageNum = 1
      this.handleSearch()
    },
    // 刷新
    handleRefresh() {
      this.handleSearch()
      this.loadStats()
    },
    // 加载统计
    loadStats() {
      getUnscheduledOrdersStats().then(res => {
        this.stats = res.data || {}
      })
    },
    // 分页
    handleSizeChange(val) {
      this.pageSize = val
      this.handleSearch()
    },
    handleCurrentChange(val) {
      this.pageNum = val
      this.handleSearch()
    },
    // 多选
    handleSelectionChange(val) {
      this.selectedOrders = val.map(row => row.orderId)
    },
    // 查看详情
    handleViewDetail(row) {
      this.loading = true
      getUnscheduledOrderDetail(row.orderId).then(res => {
        this.detailData = {
          ...row,
          ...res.data
        }
        this.detailDrawerVisible = true
        this.loading = false
      }).catch(err => {
        this.$message.error(err.message)
        this.loading = false
      })
    },
    // 批量进入排程池
    handleBatchEnterPool() {
      this.$confirm('确定批量进入排程池？', '确认操作').then(() => {
        batchEnterCoatingPool(this.selectedOrders, 'admin').then(res => {
          this.$message.success(res.message || '操作成功')
          this.handleSearch()
        })
      }).catch(() => {})
    },
    // 进入排程池
    handleEnterPool(row) {
      this.$confirm(`确定将订单 ${row.orderNo} 进入排程池？`, '确认操作').then(() => {
        enterCoatingPool(row.orderId, 'admin').then(res => {
          this.$message.success('订单已进入待排程池')
          this.handleSearch()
        })
      }).catch(() => {})
    },
    // 处理缺口
    handleShortage(row) {
      this.handleViewDetail(row)
    },
    // 创建分切任务
    handleCreateSlittingTask(shortage) {
      this.slittingForm = {
        materialCode: shortage.materialCode,
        shortageQty: shortage.shortageQty,
        sourceMaterial: shortage.sourceMaterial,
        availableQty: shortage.availableQty,
        equipmentId: null,
        scheduledDate: null,
        shortageId: shortage.id
      }
      this.slittingDialogVisible = true
    },
    // 确认分切任务
    handleConfirmSlittingTask() {
      if (!this.slittingForm.equipmentId || !this.slittingForm.scheduledDate) {
        this.$message.warning('请选择设备和日期')
        return
      }
      const dateStr = this.$moment(this.slittingForm.scheduledDate).format('YYYY-MM-DD')
      createSlittingTaskForShortage(
        this.slittingForm.shortageId,
        this.slittingForm.equipmentId,
        dateStr,
        'admin'
      ).then(res => {
        this.$message.success('分切任务已创建')
        this.slittingDialogVisible = false
        this.handleSearch()
      }).catch(err => {
        this.$message.error(err.message)
      })
    },
    // 提高优先级
    handleIncreasePriority(row) {
      this.$prompt('请输入优先级增加值', '提高优先级', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputValue: 5,
        inputType: 'number'
      }).then(({ value }) => {
        increaseOrderPriority(row.orderId, value, 'admin').then(res => {
          this.$message.success('优先级已提升')
          this.handleSearch()
        })
      }).catch(() => {})
    },
    // 刷新状态
    handleRefreshStatus(row) {
      refreshOrderScheduleStatus(row.orderId).then(res => {
        this.$message.success('状态已刷新')
        this.handleSearch()
      })
    },
    // 从详情页面进入排程池
    handleEnterPoolFromDetail() {
      enterCoatingPool(this.detailData.orderId, 'admin').then(res => {
        this.$message.success('订单已进入待排程池')
        this.detailDrawerVisible = false
        this.handleSearch()
      })
    },
    // 从详情页面刷新状态
    handleRefreshStatusFromDetail() {
      refreshOrderScheduleStatus(this.detailData.orderId).then(res => {
        this.$message.success('状态已刷新')
        this.handleViewDetail(this.detailData)
      })
    },
    // 下拉菜单操作
    handleAction(command) {
      const { action, row } = command
      switch (action) {
        case 'enterPool':
          this.handleEnterPool(row)
          break
        case 'handleShortage':
          this.handleShortage(row)
          break
        case 'increasePriority':
          this.handleIncreasePriority(row)
          break
        case 'refreshStatus':
          this.handleRefreshStatus(row)
          break
      }
    },
    // 导出
    handleExport() {
      this.$message.info('导出功能开发中...')
    },
    // 获取状态标签类型
    getStatusTagType(badge) {
      if (badge.includes('直接排')) return 'success'
      if (badge.includes('复卷分切')) return 'warning'
      if (badge.includes('手动处理')) return 'danger'
      if (badge.includes('已入池')) return 'info'
      return 'info'
    }
  }
}
</script>

<style scoped>
.unscheduled-orders-container {
  padding: 20px;
  background-color: #f5f7fa;
}

.page-header {
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0 0 10px 0;
  color: #333;
}

.page-header p {
  margin: 0;
  color: #666;
  font-size: 14px;
}

.stats-row {
  margin-bottom: 20px;
}

.stat-card {
  padding: 20px;
  border-radius: 4px;
  color: white;
  text-align: center;
}

.stat-card.total {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.stat-card.direct {
  background: linear-gradient(135deg, #67c23a 0%, #85ce61 100%);
}

.stat-card.slitting {
  background: linear-gradient(135deg, #e6a23c 0%, #f7ba2a 100%);
}

.stat-card.manual {
  background: linear-gradient(135deg, #f56c6c 0%, #f78989 100%);
}

.stat-value {
  font-size: 32px;
  font-weight: bold;
  margin-bottom: 5px;
}

.stat-label {
  font-size: 14px;
  opacity: 0.9;
}

.filter-card,
.table-card {
  margin-bottom: 20px;
  background-color: white;
}

.section {
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid #eee;
}

.section h4 {
  margin-bottom: 10px;
  color: #333;
}

.action-buttons {
  text-align: center;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

.action-buttons .el-button {
  margin: 0 5px;
}
</style>
