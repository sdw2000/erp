<template>
  <div class="app-container">
    <el-card class="box-card" shadow="hover">
      <div slot="header" class="clearfix">
        <span>订单预处理</span>
      </div>

      <el-form :model="searchForm" inline label-width="90px">
        <el-form-item label="订单号">
          <el-input v-model="searchForm.orderNo" placeholder="输入订单号" clearable />
        </el-form-item>
        <el-form-item label="物料代码">
          <el-input v-model="searchForm.materialCode" placeholder="输入物料代码" clearable />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="el-icon-search" @click="handleSearch">查询</el-button>
          <el-button icon="el-icon-refresh" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <div class="table-toolbar" style="margin: 10px 0; display: flex; align-items: center; gap: 10px;">
      <el-button type="primary" icon="el-icon-refresh" :loading="syncing" @click="syncPreprocessing">同步待处理订单</el-button>
      <el-checkbox v-model="showDispatched" @change="loadData">显示已排程订单</el-checkbox>
      <el-checkbox-group v-model="processFilters" size="mini" :disabled="!showDispatched" @change="applyFilters">
        <el-checkbox-button label="COATING">涂布</el-checkbox-button>
        <el-checkbox-button label="REWINDING">复卷</el-checkbox-button>
        <el-checkbox-button label="SLITTING">分切</el-checkbox-button>
      </el-checkbox-group>
    </div>

    <el-table
      v-loading="loading"
      :data="tableData"
      stripe
      border
      style="width: 100%; margin-top: 20px"
      :default-sort="{ prop: 'createdAt', order: 'descending' }"
    >
      <el-table-column prop="orderNo" label="订单号" width="140" sortable />
      <el-table-column prop="orderItemCode" label="明细码" width="120" />
      <el-table-column prop="materialCode" label="物料代码" width="140" />
      <el-table-column prop="materialName" label="物料名称" width="160" />
      <el-table-column prop="specDesc" label="规格" width="180" />
      <el-table-column prop="lockedQty" label="已锁定(㎡)" width="120" align="right" />
      <el-table-column label="剩余需求(㎡)" width="140" align="right">
        <template slot-scope="{ row }">
          {{ remainingValue(row).toFixed(2) }}
        </template>
      </el-table-column>
      <el-table-column label="锁定状态" width="110">
        <template slot-scope="{ row }">
          <el-tag :type="lockStatusType(row.lockStatus)" size="small">{{ row.lockStatus || '未锁定' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="460" align="left" header-align="left">
        <template slot-scope="{ row }">
          <div class="action-stack">
            <el-button
              v-if="remainingValue(row) > 0"
              type="primary"
              size="mini"
              icon="el-icon-box"
              class="action-btn"
              @click="openLockDialog(row)"
            >选择库存/锁定</el-button>
            <el-button v-else size="mini" type="info" plain disabled class="action-btn">需求已满足</el-button>
            <el-button
              v-if="Number(row.lockedQty || 0) > 0"
              type="warning"
              size="mini"
              icon="el-icon-unlock"
              class="action-btn"
              @click="handleUnlock(row)"
            >{{ row.status === 'dispatched' ? '撤销锁定' : '解除锁定' }}</el-button>
            <el-button
              v-if="row.status !== 'dispatched'"
              type="success"
              size="mini"
              icon="el-icon-check"
              class="action-btn"
              @click="handleSubmit(row)"
            >提交预处理</el-button>
            <el-button v-else size="mini" type="info" plain disabled class="action-btn">已提交</el-button>
            <el-button size="mini" class="action-btn" @click="openLocksDialog(row)">查看锁定记录</el-button>
          </div>
        </template>
      </el-table-column>
    </el-table>

    <div style="margin-top: 16px; text-align: right">
      <el-pagination
        :current-page="currentPage"
        :page-sizes="[10, 20, 50, 100]"
        :page-size="pageSize"
        layout="total, sizes, prev, pager, next, jumper"
        :total="total"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>

    <!-- 锁定弹窗 -->
    <el-dialog title="选择库存并锁定" :visible.sync="lockDialogVisible" width="900px">
      <div style="margin-bottom: 10px">物料：<strong>{{ currentRow.materialCode }}</strong> - {{ currentRow.specDesc }}</div>
      <el-table v-loading="materialsLoading" :data="materialOptions" border stripe height="400">
        <el-table-column label="二维码" width="160">
          <template slot-scope="{ row }">
            <el-tag type="info" size="mini">{{ row.qrCode }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="materialCode" label="物料代码" width="140" />
        <el-table-column prop="specDesc" label="规格" width="180" />
        <el-table-column prop="batchNo" label="批次号" width="120" />
        <el-table-column prop="availableRolls" label="可用卷数" width="100" align="right" />
        <el-table-column prop="availableArea" label="可用面积(㎡)" width="130" align="right" />
        <el-table-column label="锁定面积(㎡)" width="160" align="right">
          <template slot-scope="{ row }">
            <el-input-number
              v-model="lockInputs[row.tapeStockId]"
              :min="0"
              :max="Number(row.availableArea || 0)"
              :step="0.01"
              :precision="2"
              size="mini"
              controls-position="right"
              style="width: 140px"
            />
          </template>
        </el-table-column>
      </el-table>
      <span slot="footer" class="dialog-footer">
        <el-button @click="lockDialogVisible=false">取 消</el-button>
        <el-button type="primary" @click="confirmLock">确 定</el-button>
      </span>
    </el-dialog>

    <!-- 锁定记录弹窗 -->
    <el-dialog title="锁定记录" :visible.sync="locksDialogVisible" width="700px">
      <el-table v-loading="locksLoading" :data="locksList" border stripe>
        <el-table-column label="二维码" width="160">
          <template slot-scope="{ row }">
            <el-tag type="info" size="mini">{{ row.qrCode }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="materialCode" label="物料代码" width="140" />
        <el-table-column prop="materialSpec" label="规格" width="180" />
        <el-table-column prop="batchNo" label="批次号" width="120" />
        <el-table-column prop="stockType" label="卷类型" width="100" />
        <el-table-column prop="lockArea" label="锁定面积(㎡)" width="140" align="right" />
        <el-table-column label="状态" width="100">
          <template slot-scope="{ row }">
            <el-tag size="small" :type="lockStatusTag(row.lockStatus)">{{ mapLockStatus(row.lockStatus) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="lockedAt" label="锁定时间" width="180" />
      </el-table>
    </el-dialog>
  </div>
</template>

<script>
import { getPreprocessingList, getAvailableMaterials, lockMaterials, unlockMaterials, submitPreprocessing, bootstrapPreprocessing, getLocks } from '@/api/orderPreprocessing'

export default {
  name: 'OrderPreprocessing',
  data() {
    return {
      loading: false,
      tableData: [],
      rawRecords: [],
      currentPage: 1,
      pageSize: 20,
      total: 0,
      showDispatched: false,
      processFilters: ['COATING', 'REWINDING', 'SLITTING'],
      // 进入页面自动执行一次“同步待处理订单”的防重标记
      hasAutoSynced: false,
      searchForm: {
        orderNo: '',
        materialCode: ''
      },
      // 防止重复并发同步
      syncing: false,
      // 锁定弹窗
      lockDialogVisible: false,
      materialsLoading: false,
      materialOptions: [],
      currentRow: {},
      lockInputs: {},
      // 锁定记录
      locksDialogVisible: false,
      locksLoading: false,
      locksList: []
    }
  },
  // 进入页面即刷新数据（含菜单点击返回场景）
  beforeRouteEnter(to, from, next) {
    next(vm => {
      if (vm && typeof vm.resetAndReload === 'function') {
        vm.resetAndReload()
        // 确保是一次新的进入，允许自动同步执行一次
        vm.hasAutoSynced = false
        if (typeof vm.autoSyncOnEnter === 'function') {
          vm.autoSyncOnEnter()
        }
      }
    })
  },
  mounted() {
    this.loadData()
  },
  // 若启用 keep-alive，激活时也刷新
  activated() {
    this.resetAndReload()
    this.autoSyncOnEnter()
  },
  methods: {
    // 重置查询并重新加载，达到“直接刷新页面”的效果
    resetAndReload() {
      this.searchForm = { orderNo: '', materialCode: '' }
      this.currentPage = 1
      this.showDispatched = false
      this.processFilters = ['COATING', 'REWINDING', 'SLITTING']
      // 注意：不要在 reset 时重置 hasAutoSynced，避免 activated 导致重复自动同步
      this.loadData()
    },
    // 进入页面后自动执行一次“同步待处理订单”
    autoSyncOnEnter() {
      if (this.hasAutoSynced) return
      this.hasAutoSynced = true
      // 使用现有查询条件触发一次同步
      this.syncPreprocessing()
    },
    async loadData() {
      this.loading = true
      try {
        const response = await getPreprocessingList({
          current: this.currentPage,
          size: this.pageSize,
          orderNo: this.searchForm.orderNo || undefined,
          materialCode: this.searchForm.materialCode || undefined,
          showDispatched: this.showDispatched
        })
        if (response.code === 20000 || response.code === 200) {
          this.rawRecords = response.data.records || []
          this.applyFilters()
          this.total = Number(response.data.total || 0)
        }
      } catch (error) {
        this.$message.error('加载数据失败')
      } finally {
        this.loading = false
      }
    },
    applyFilters() {
      const records = this.rawRecords || []
      if (!this.showDispatched) {
        this.tableData = records.filter(r => r.status !== 'dispatched')
        return
      }
      const selected = new Set((this.processFilters && this.processFilters.length) ? this.processFilters : ['COATING', 'REWINDING', 'SLITTING'])
      const nonDispatched = records.filter(r => r.status !== 'dispatched')
      const dispatched = records
        .filter(r => r.status === 'dispatched')
        .filter(r => selected.has(this.getProcessType(r)))
      this.tableData = nonDispatched.concat(dispatched)
    },
    getProcessType(row) {
      const val = row.scheduleStage || row.scheduleType || row.processType || row.stage || ''
      if (val === '涂布') return 'COATING'
      if (val === '复卷') return 'REWINDING'
      if (val === '分切') return 'SLITTING'
      const up = String(val || '').toUpperCase()
      if (['COATING', 'REWINDING', 'SLITTING'].includes(up)) return up
      return 'COATING'
    },
    handleSearch() {
      this.currentPage = 1
      this.loadData()
    },
    handleReset() {
      this.searchForm = { orderNo: '', materialCode: '' }
      this.currentPage = 1
      this.loadData()
    },
    handleSizeChange(val) {
      this.pageSize = val
      this.currentPage = 1
      this.loadData()
    },
    handleCurrentChange(val) {
      this.currentPage = val
      this.loadData()
    },
    async syncPreprocessing() {
      if (this.syncing) return
      this.syncing = true
      try {
        const res = await bootstrapPreprocessing({
          orderNo: this.searchForm.orderNo || undefined,
          materialCode: this.searchForm.materialCode || undefined
        })
        if (res.code === 20000 || res.code === 200) {
          this.$message.success(`同步完成，新增 ${res.data.created || 0} 条`)
          this.loadData()
        } else {
          this.$message.error(res.message || '同步失败')
        }
      } catch (e) {
        this.$message.error('同步失败')
      } finally {
        this.syncing = false
      }
    },
    lockStatusType(status) {
      const map = { '未锁定': 'info', '部分锁定': 'warning', '全部锁定': 'success' }
      return map[status] || 'info'
    },
    lockStatusTag(code) {
      const map = { 'locked': 'success', 'used': 'info', 'released': 'danger', 'cancelled': 'warning' }
      return map[code] || 'info'
    },
    mapLockStatus(code) {
      const map = { 'locked': '锁定', 'used': '已消耗', 'released': '已释放', 'cancelled': '已取消' }
      return map[code] || code
    },
    remainingValue(row) {
      const req = Number(row.requiredQty || 0)
      const locked = Number(row.lockedQty || 0)
      return Math.max(0, req - locked)
    },
    async openLockDialog(row) {
      this.currentRow = { ...row }
      this.lockInputs = {}
      this.lockDialogVisible = true
      this.materialsLoading = true
      try {
        const res = await getAvailableMaterials(row.materialCode, 100, row.orderItemId)
        if (res.code === 20000 || res.code === 200) {
          this.materialOptions = res.data || []
          this.prefillLockInputs()
        }
      } catch (e) {
        this.$message.error('加载可用物料失败')
      } finally {
        this.materialsLoading = false
      }
    },
    async confirmLock() {
      // 组装锁定项
      const locks = []
      // 面积校验：每卷不超过可用面积，总和不超过剩余需求
      const remaining = this.remainingValue(this.currentRow)
      let total = 0
      this.materialOptions.forEach(m => {
        const area = this.lockInputs[m.tapeStockId]
        if (area && area > 0) {
          if (Number(area) > Number(m.availableArea)) {
            this.$message.error(`卷(${m.qrCode})锁定面积超过可用面积`)
            return
          }
          locks.push({ tapeStockId: m.tapeStockId, lockArea: area, lockQty: null, fifoOrder: m.fifoOrder, stockTableName: m.stockTableName })
          total += Number(area)
        }
      })
      // 若未填写锁定面积，自动按剩余需求进行分配，避免空锁导致“锁定成功但未锁定”
      if (locks.length === 0 && remaining > 0) {
        let need = Number(remaining || 0)
        this.materialOptions.forEach(m => {
          if (need <= 0) return
          const available = Number(m.availableArea || 0)
          if (available <= 0) return
          const area = Math.min(need, available)
          if (area > 0) {
            locks.push({ tapeStockId: m.tapeStockId, lockArea: Number(area.toFixed(2)), lockQty: null, fifoOrder: m.fifoOrder, stockTableName: m.stockTableName })
            total += Number(area)
            need = Number((need - area).toFixed(2))
          }
        })
      }
      if (locks.length === 0) {
        this.$message.warning('未填写锁定面积，且无可用库存')
        return
      }
      // 允许无库存直接提交，后端将按涂布链路处理
      if (total > remaining) {
        this.$message.error('锁定面积总和超过剩余需求，请调整')
        return
      }
      try {
        const payload = {
          orderId: this.currentRow.orderId,
          orderItemId: this.currentRow.orderItemId,
          materialCode: this.currentRow.materialCode,
          locks
        }
        const res = await lockMaterials(payload)
        if (res.code === 20000 || res.code === 200) {
          this.$message.success(locks.length === 0 ? '无库存，已按涂布提交' : '锁定成功')
          this.lockDialogVisible = false
          this.loadData()
        } else {
          this.$message.error(res.message || '锁定失败')
        }
      } catch (e) {
        this.$message.error('锁定失败')
      }
    },
    async handleSubmit(row) {
      try {
        // 若未达需求面积，提示确认
        const locked = Number(row.lockedQty || 0)
        const required = Number(row.requiredQty || 0)
        if (locked < required) {
          const ok = await this.$confirm('当前已锁定面积小于需求面积，是否仍然提交？', '提示', { type: 'warning' }).catch(() => false)
          if (!ok) return
        }
        const res = await submitPreprocessing({
          requiredQty: row.requiredQty,
          scheduleType: null,
          scheduleSelections: [],
          remark: row.remark,
          orderItemId: row.orderItemId
        })
        if (res.code === 20000 || res.code === 200) {
          this.$message.success('已提交至待排池')
          this.loadData()
        } else {
          this.$message.error(res.message || '提交失败')
        }
      } catch (e) {
        this.$message.error('提交失败')
      }
    },
    async openLocksDialog(row) {
      this.locksDialogVisible = true
      this.locksLoading = true
      try {
        const res = await getLocks(row.orderItemId)
        if (res.code === 20000 || res.code === 200) {
          // 后端已过滤仅返回 lock_status=locked，这里仍做一次健壮性过滤
          const list = Array.isArray(res.data) ? res.data : []
          this.locksList = list.filter(item => item && item.lockStatus === 'locked')
        }
      } catch (e) {
        this.$message.error('加载锁定记录失败')
      } finally {
        this.locksLoading = false
      }
    },
    async handleUnlock(row) {
      const ok = await this.$confirm('确认解除锁定并释放库存？', '提示', { type: 'warning' }).catch(() => false)
      if (!ok) return
      try {
        const res = await unlockMaterials({ orderItemId: row.orderItemId })
        if (res.code === 20000 || res.code === 200) {
          this.$message.success('已释放锁定')
          this.loadData()
        } else {
          this.$message.error(res.message || '解除锁定失败')
        }
      } catch (e) {
        this.$message.error('解除锁定失败')
      }
    },
    // 将剩余需求自动填入弹窗锁定面积栏，按可用面积顺序分配
    prefillLockInputs() {
      const remaining = this.remainingValue(this.currentRow)
      if (!this.materialOptions || !this.materialOptions.length) {
        this.lockInputs = {}
        return
      }
      let need = Number(remaining || 0)
      const inputs = {}
      this.materialOptions.forEach(opt => {
        if (need <= 0) return
        const available = Number(opt.availableArea || 0)
        const lock = Math.min(need, available)
        if (lock > 0) {
          inputs[opt.tapeStockId] = Number(lock.toFixed(2))
          need = Number((need - lock).toFixed(2))
        }
      })
      this.lockInputs = inputs
    }
  }
}
</script>

<style scoped lang="scss">
.app-container {
  padding: 20px;

  .box-card {
    margin-bottom: 20px;
  }

  .el-table {
    font-size: 13px;
  }

  .action-stack {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    align-items: center;
    justify-content: flex-start;
  }

  .action-btn {
    flex: 0 0 auto;
    padding: 4px 6px;
    min-width: 74px;
  }
}
</style>
