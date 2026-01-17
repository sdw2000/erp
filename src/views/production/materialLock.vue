<template>
  <div class="app-container">
    <!-- 统计卡片 -->
    <el-row :gutter="20" style="margin-bottom: 15px">
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" style="background: #67C23A">
              <i class="el-icon-check" />
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.fullyLocked || 0 }}</div>
              <div class="stat-label">完全锁定</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" style="background: #E6A23C">
              <i class="el-icon-warning" />
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.partiallyLocked || 0 }}</div>
              <div class="stat-label">部分锁定</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" style="background: #F56C6C">
              <i class="el-icon-circle-close" />
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.unlocked || 0 }}</div>
              <div class="stat-label">未锁定</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" style="background: #409EFF">
              <i class="el-icon-box" />
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.totalArea || 0 }} m²</div>
              <div class="stat-label">总锁定面积</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 搜索区域 -->
    <el-card class="search-card" shadow="never">
      <el-form :inline="true" :model="queryParams" class="search-form">
        <el-form-item label="排程号">
          <el-input v-model="queryParams.scheduleCode" placeholder="请输入排程号" clearable style="width: 180px" />
        </el-form-item>
        <el-form-item label="订单号">
          <el-input v-model="queryParams.orderNo" placeholder="请输入订单号" clearable style="width: 180px" />
        </el-form-item>
        <el-form-item label="物料卷号">
          <el-input v-model="queryParams.materialCode" placeholder="请输入物料卷号" clearable style="width: 180px" />
        </el-form-item>
        <el-form-item label="锁定状态">
          <el-select v-model="queryParams.lockStatus" placeholder="全部状态" clearable style="width: 120px">
            <el-option label="锁定中" value="锁定中" />
            <el-option label="已领料" value="已领料" />
            <el-option label="已消耗" value="已消耗" />
            <el-option label="已释放" value="已释放" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="el-icon-search" @click="loadList">查询</el-button>
          <el-button icon="el-icon-refresh" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 操作按钮 -->
    <el-card shadow="never" style="margin-top: 10px">
      <div class="table-toolbar">
        <el-button type="primary" icon="el-icon-refresh" @click="refreshData">刷新数据</el-button>
        <el-button type="warning" icon="el-icon-download" @click="exportData">导出数据</el-button>
      </div>

      <!-- 锁定记录表格 -->
      <el-table v-loading="loading" :data="dataList" border stripe>
        <el-table-column prop="scheduleId" label="排程ID" width="80" />
        <el-table-column prop="orderId" label="订单ID" width="80" />
        <el-table-column prop="tapeStockId" label="物料卷ID" width="80" />
        <el-table-column label="物料卷号" width="120">
          <template slot-scope="{ row }">
            <el-tag type="info" size="small">{{ row.tapeCode }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="lockedArea" label="锁定面积(m²)" width="120" align="right">
          <template slot-scope="{ row }">
            <span style="font-weight: bold">{{ row.lockedArea }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="requiredArea" label="需求面积(m²)" width="120" align="right">
          <template slot-scope="{ row }">
            {{ row.requiredArea }}
          </template>
        </el-table-column>
        <el-table-column label="锁定状态" width="100">
          <template slot-scope="{ row }">
            <el-tag :type="getLockStatusType(row.lockStatus)" size="small">
              {{ row.lockStatus }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="lockedTime" label="锁定时间" width="160" />
        <el-table-column prop="allocatedTime" label="领料时间" width="160" />
        <el-table-column prop="remark" label="备注" min-width="150" show-overflow-tooltip />
        <el-table-column v-if="$canEdit()" label="操作" width="150" fixed="right">
          <template slot-scope="{ row }">
            <el-button
              v-if="row.lockStatus === '锁定中'"
              type="text"
              size="small"
              @click="handleAllocate(row)"
            >
              领料
            </el-button>
            <el-button
              type="text"
              size="small"
              style="color: #F56C6C"
              @click="handleRelease(row)"
            >
              释放
            </el-button>
            <el-button type="text" size="small" @click="handleViewDetail(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <el-pagination
        style="margin-top: 15px; text-align: right"
        :current-page="queryParams.page"
        :page-sizes="[10, 20, 50, 100]"
        :page-size="queryParams.size"
        :total="total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handlePageChange"
      />
    </el-card>

    <!-- 详情对话框 -->
    <el-dialog title="锁定详情" :visible.sync="detailDialogVisible" width="700px">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="排程ID">{{ currentLock.scheduleId }}</el-descriptions-item>
        <el-descriptions-item label="订单ID">{{ currentLock.orderId }}</el-descriptions-item>
        <el-descriptions-item label="物料卷ID">{{ currentLock.tapeStockId }}</el-descriptions-item>
        <el-descriptions-item label="物料卷号">{{ currentLock.tapeCode }}</el-descriptions-item>
        <el-descriptions-item label="锁定面积">{{ currentLock.lockedArea }} m²</el-descriptions-item>
        <el-descriptions-item label="需求面积">{{ currentLock.requiredArea }} m²</el-descriptions-item>
        <el-descriptions-item label="锁定状态" :span="2">
          <el-tag :type="getLockStatusType(currentLock.lockStatus)" size="small">
            {{ currentLock.lockStatus }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="锁定时间">{{ currentLock.lockedTime }}</el-descriptions-item>
        <el-descriptions-item label="领料时间">{{ currentLock.allocatedTime }}</el-descriptions-item>
        <el-descriptions-item label="操作人">{{ currentLock.lockedByUserId }}</el-descriptions-item>
        <el-descriptions-item label="版本号">{{ currentLock.version }}</el-descriptions-item>
        <el-descriptions-item label="备注" :span="2">{{ currentLock.remark }}</el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script>
import { queryAllocationBySchedule } from '@/api/scheduleMaterial'

export default {
  name: 'MaterialLock',
  data() {
    return {
      loading: false,
      dataList: [],
      total: 0,
      queryParams: {
        scheduleCode: '',
        orderNo: '',
        materialCode: '',
        lockStatus: '',
        page: 1,
        size: 10
      },
      stats: {
        fullyLocked: 0,
        partiallyLocked: 0,
        unlocked: 0,
        totalArea: 0
      },
      detailDialogVisible: false,
      currentLock: {}
    }
  },
  created() {
    this.loadList()
  },
  methods: {
    $canEdit() {
      return this.$hasRole('admin') || this.$hasRole('production')
    },

    async loadList() {
      this.loading = true
      try {
        // TODO: 调用后端 API 查询锁定记录
        // 这里需要实现前端数据表格的绑定
        // const res = await queryMaterialLocks(this.queryParams)
        // this.dataList = res.data?.list || []
        // this.total = res.data?.total || 0
      } catch (error) {
        this.$message.error('加载数据失败')
      } finally {
        this.loading = false
      }
    },

    resetQuery() {
      this.queryParams = {
        scheduleCode: '',
        orderNo: '',
        materialCode: '',
        lockStatus: '',
        page: 1,
        size: 10
      }
      this.loadList()
    },

    handleSizeChange(size) {
      this.queryParams.size = size
      this.loadList()
    },

    handlePageChange(page) {
      this.queryParams.page = page
      this.loadList()
    },

    getLockStatusType(status) {
      const map = {
        '锁定中': 'success',
        '已领料': 'warning',
        '已消耗': 'info',
        '已释放': 'danger',
        '已取消': 'danger'
      }
      return map[status] || 'info'
    },

    handleAllocate(row) {
      this.$confirm(`确定该物料已领料吗？`, '提示', {
        type: 'warning'
      }).then(async() => {
        // TODO: 调用领料 API
        this.$message.success('领料成功')
        this.loadList()
      }).catch(() => {})
    },

    handleRelease(row) {
      this.$confirm(`确定要释放该物料锁定吗？`, '提示', {
        type: 'warning'
      }).then(async() => {
        // TODO: 调用释放 API
        this.$message.success('释放成功')
        this.loadList()
      }).catch(() => {})
    },

    handleViewDetail(row) {
      this.currentLock = { ...row }
      this.detailDialogVisible = true
    },

    refreshData() {
      this.loadList()
      this.$message.success('数据已刷新')
    },

    exportData() {
      // TODO: 实现导出功能
      this.$message.info('导出功能开发中...')
    }
  }
}
</script>

<style lang="scss" scoped>
.stat-card {
  .stat-content {
    display: flex;
    align-items: center;
  }
  .stat-icon {
    width: 50px;
    height: 50px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    i {
      font-size: 24px;
      color: #fff;
    }
  }
  .stat-info {
    margin-left: 15px;
    .stat-value {
      font-size: 24px;
      font-weight: bold;
      color: #303133;
    }
    .stat-label {
      font-size: 14px;
      color: #909399;
    }
  }
}

.search-card {
  margin-bottom: 10px;
}

.search-form {
  .el-form-item {
    margin-bottom: 0;
  }
}

.table-toolbar {
  margin-bottom: 10px;
}
</style>
