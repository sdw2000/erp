<template>
  <div class="app-container">
    <!-- 统计卡片 -->
    <el-row :gutter="20" style="margin-bottom: 15px">
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" style="background: #67C23A">
              <i class="el-icon-lock" />
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.locked || 0 }}</div>
              <div class="stat-label">锁定</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" style="background: #E6A23C">
              <i class="el-icon-truck" />
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.picked || 0 }}</div>
              <div class="stat-label">已领料</div>
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
              <div class="stat-value">{{ stats.released || 0 }}</div>
              <div class="stat-label">已释放</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" style="background: #409EFF">
              <i class="el-icon-share" />
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.shared || 0 }}</div>
              <div class="stat-label">多单共用卷</div>
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
        <el-button type="success" icon="el-icon-upload" @click="openImportDialog">导入锁定</el-button>
        <el-button type="primary" icon="el-icon-truck" @click="handleBatchPicking">批量领料</el-button>
        <el-button type="danger" icon="el-icon-delete" @click="handleBatchRelease">批量释放</el-button>
        <el-button type="info" icon="el-icon-document" @click="exportSelected">导出选中</el-button>
        <el-button type="warning" icon="el-icon-download" @click="exportData">导出数据</el-button>
      </div>

      <!-- 锁定记录表格 -->
      <el-table v-loading="loading" :data="dataList" border stripe @selection-change="handleSelectionChange">
        <el-table-column type="selection" width="45" />
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
        <el-table-column label="锁定状态" width="120">
          <template slot-scope="{ row }">
            <el-tag :type="lockStatusTag(row.lockStatus)" size="small">
              {{ mapLockStatus(row.lockStatus) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="lockedTime" label="锁定时间" width="160" />
        <el-table-column prop="allocatedTime" label="领料时间" width="160" />
        <el-table-column prop="remark" label="备注" min-width="150" show-overflow-tooltip />
        <el-table-column v-if="$canEdit()" label="操作" width="240" fixed="right">
          <template slot-scope="{ row }">
            <el-button type="text" size="small" :disabled="!canPick(row)" @click="handleAllocate(row)">领料</el-button>
            <el-button
              type="text"
              size="small"
              style="color: #F56C6C"
              :disabled="!canRelease(row)"
              @click="handleRelease(row)"
            >
              释放
            </el-button>
            <el-button type="text" size="small" @click="handleViewDetail(row)">详情</el-button>
            <el-button type="text" size="small" @click="openSharedLocks(row)">共用情况</el-button>
          </template>
        </el-table-column>
        <!-- 导入锁定对话框 -->
        <el-dialog title="导入锁定记录（CSV）" :visible.sync="importDialogVisible" width="600px">
          <p>模板列：preprocessingId,orderId,orderItemId,tapeStockId,lockArea,fifoOrder</p>
          <el-upload
            class="upload-demo"
            drag
            action=""
            :show-file-list="false"
            :auto-upload="false"
            :on-change="handleImportFile"
          >
            <i class="el-icon-upload" />
            <div class="el-upload__text">将文件拖到此处，或<em>点击上传</em></div>
            <div slot="tip" class="el-upload__tip">仅支持 CSV 文本文件</div>
          </el-upload>
          <span slot="footer" class="dialog-footer">
            <el-button @click="importDialogVisible=false">取 消</el-button>
          </span>
        </el-dialog>
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
import { getOrderMaterialLocks, releaseOrderMaterialLock, batchReleaseOrderMaterialLocks, triggerMaterialPicking, getMaterialLockStats, lockOrderMaterial, getMaterialSharedLocks } from '@/api/materialLock'

export default {
  name: 'MaterialLock',
  data() {
    return {
      loading: false,
      dataList: [],
      selectedRows: [],
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
        locked: 0,
        picked: 0,
        released: 0,
        shared: 0
      },
      detailDialogVisible: false,
      currentLock: {},
      importDialogVisible: false,
      // 共用情况
      sharedDrawerVisible: false,
      sharedLoading: false,
      sharedQrCode: '',
      sharedStats: {}
    }
  },
  created() {
    this.refreshData()
  },
  methods: {
    $canEdit() {
      return this.$hasRole('admin') || this.$hasRole('production')
    },
    handleSelectionChange(rows) {
      this.selectedRows = rows
    },

    async loadList() {
      this.loading = true
      try {
        const statusCode = this.mapQueryStatus(this.queryParams.lockStatus)
        const res = await getOrderMaterialLocks({
          pageNum: this.queryParams.page,
          pageSize: this.queryParams.size,
          orderNo: this.queryParams.orderNo || undefined,
          qrCode: this.queryParams.materialCode || undefined,
          lockStatus: statusCode || undefined
        })
        if (res.code === 20000 || res.code === 200) {
          this.dataList = res.data?.list || []
          this.total = Number(res.data?.total || 0)
        }
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

    lockStatusTag(status) {
      const map = { LOCKED: 'success', PICKED: 'warning', USED: 'info', RELEASED: 'danger', CANCELLED: 'danger' }
      return map[status] || 'info'
    },
    mapLockStatus(status) {
      const map = { LOCKED: '锁定', PICKED: '已领料', USED: '已消耗', RELEASED: '已释放', CANCELLED: '已取消' }
      return map[status] || status
    },
    mapQueryStatus(label) {
      const map = { '锁定中': 'LOCKED', '已领料': 'PICKED', '已消耗': 'USED', '已释放': 'RELEASED', '已取消': 'CANCELLED' }
      return map[label] || label
    },

    canPick(row) {
      return row && row.lockStatus === 'LOCKED'
    },
    canRelease(row) {
      return row && row.lockStatus !== 'RELEASED' && row.lockStatus !== 'CANCELLED'
    },

    handleAllocate(row) {
      this.$confirm(`确定该物料已领料吗？`, '提示', {
        type: 'warning'
      }).then(async() => {
        const operator = (this.$store && this.$store.getters && this.$store.getters.name) ? this.$store.getters.name : 'frontend'
        const res = await triggerMaterialPicking(row.id, operator)
        if (res.code === 20000 || res.code === 200) {
          this.$message.success('领料成功')
          this.loadList()
        } else {
          this.$message.error(res.message || '领料失败')
        }
      }).catch(() => {})
    },

    handleRelease(row) {
      this.$confirm(`确定要释放该物料锁定吗？`, '提示', {
        type: 'warning'
      }).then(async() => {
        const operator = (this.$store && this.$store.getters && this.$store.getters.name) ? this.$store.getters.name : 'frontend'
        const res = await releaseOrderMaterialLock(row.id, operator)
        if (res.code === 20000 || res.code === 200) {
          this.$message.success('释放成功')
          this.loadList()
        } else {
          this.$message.error(res.message || '释放失败')
        }
      }).catch(() => {})
    },

    handleViewDetail(row) {
      this.currentLock = { ...row }
      this.detailDialogVisible = true
    },

    refreshData() {
      this.loadList()
      this.loadStats()
      this.$message.success('数据已刷新')
    },

    exportData() {
      // 导出当前筛选结果为CSV
      const headers = ['orderId', 'tapeStockId', 'tapeCode', 'lockedArea', 'requiredArea', 'lockStatus', 'lockedTime', 'allocatedTime']
      const rows = this.dataList.map(r => [r.orderId, r.tapeStockId, r.tapeCode, r.lockedArea, r.requiredArea, r.lockStatus, r.lockedTime, r.allocatedTime])
      const csv = [headers.join(','), ...rows.map(cols => cols.join(','))].join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `material-locks-${Date.now()}.csv`
      a.click()
      URL.revokeObjectURL(url)
    },
    exportSelected() {
      if (!this.selectedRows || this.selectedRows.length === 0) {
        this.$message.info('请先选择需要导出的记录')
        return
      }
      const headers = ['orderId', 'tapeStockId', 'tapeCode', 'lockedArea', 'requiredArea', 'lockStatus', 'lockedTime', 'allocatedTime']
      const rows = this.selectedRows.map(r => [r.orderId, r.tapeStockId, r.tapeCode, r.lockedArea, r.requiredArea, r.lockStatus, r.lockedTime, r.allocatedTime])
      const csv = [headers.join(','), ...rows.map(cols => cols.join(','))].join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `material-locks-selected-${Date.now()}.csv`
      a.click()
      URL.revokeObjectURL(url)
    },

    async loadStats() {
      try {
        const res = await getMaterialLockStats()
        if (res.code === 20000 || res.code === 200) {
          this.stats = res.data || {}
        }
      } catch (e) {
        console.error('加载锁定统计失败', e)
      }
    },

    openImportDialog() {
      this.importDialogVisible = true
    },

    async handleImportFile(file) {
      // 读取CSV并逐条调用锁定接口
      const reader = new FileReader()
      reader.onload = async(e) => {
        const text = e.target.result
        const lines = text.split(/\r?\n/).filter(l => l.trim().length)
        if (lines.length <= 1) {
          this.$message.error('CSV内容为空或缺少表头')
          return
        }
        const headers = lines[0].split(',').map(h => h.trim())
        const required = ['preprocessingId', 'orderId', 'orderItemId', 'tapeStockId', 'lockArea', 'fifoOrder']
        const missing = required.filter(k => !headers.includes(k))
        if (missing.length) {
          this.$message.error('缺少列: ' + missing.join(','))
          return
        }
        let success = 0; let fail = 0
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',')
          if (cols.length !== headers.length) continue
          const row = {}
          headers.forEach((h, idx) => { row[h] = cols[idx] })
          const payload = {
            orderId: Number(row.orderId),
            orderItemId: Number(row.orderItemId),
            preprocessingId: Number(row.preprocessingId),
            tapeStockId: Number(row.tapeStockId),
            lockArea: Number(row.lockArea),
            fifoOrder: Number(row.fifoOrder)
          }
          try {
            const res = await lockOrderMaterial(payload)
            if (res.code === 20000 || res.code === 200) success++
            else fail++
          } catch (err) { fail++ }
        }
        this.$message.success(`导入完成：成功 ${success} 条，失败 ${fail} 条`)
        this.importDialogVisible = false
        this.refreshData()
      }
      reader.readAsText(file.raw, 'utf-8')
    },

    async openSharedLocks(row) {
      this.sharedDrawerVisible = true
      this.sharedLoading = true
      this.sharedQrCode = row.tapeCode
      try {
        const res = await getMaterialSharedLocks(row.tapeCode)
        if (res.code === 20000 || res.code === 200) {
          this.sharedStats = res.data || {}
        }
      } catch (e) {
        this.$message.error('加载共用情况失败')
      } finally {
        this.sharedLoading = false
      }
    },
    async handleBatchRelease() {
      if (!this.selectedRows || this.selectedRows.length === 0) {
        this.$message.info('请先选择需要释放的记录')
        return
      }
      const lockIds = this.selectedRows.map(r => r.id).filter(Boolean)
      if (lockIds.length === 0) {
        this.$message.error('选中记录缺少ID，无法批量释放')
        return
      }
      const operator = (this.$store && this.$store.getters && this.$store.getters.name) ? this.$store.getters.name : 'frontend'
      try {
        const res = await batchReleaseOrderMaterialLocks(lockIds, operator)
        if (res.code === 20000 || res.code === 200) {
          this.$message.success('批量释放成功')
          this.loadList()
        } else {
          this.$message.error(res.message || '批量释放失败')
        }
      } catch (e) {
        this.$message.error('批量释放失败')
      }
    },
    async handleBatchPicking() {
      if (!this.selectedRows || this.selectedRows.length === 0) {
        this.$message.info('请先选择需要领料的记录')
        return
      }
      const operator = (this.$store && this.$store.getters && this.$store.getters.name) ? this.$store.getters.name : 'frontend'
      let success = 0; let fail = 0
      for (const r of this.selectedRows) {
        if (!this.canPick(r)) continue
        try {
          const res = await triggerMaterialPicking(r.id, operator)
          if (res.code === 20000 || res.code === 200) success++
          else fail++
        } catch (e) { fail++ }
      }
      this.$message.success(`批量领料完成：成功 ${success} 条，失败 ${fail} 条`)
      this.loadList()
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
