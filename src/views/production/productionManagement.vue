<template>
  <div class="app-container">
    <el-card shadow="never" class="mb-10">
      <el-form :inline="true" :model="query" @submit.native.prevent>
        <el-form-item label="类型">
          <el-select v-model="query.type" placeholder="全部" clearable style="width: 140px">
            <el-option label="涂布" value="coating" />
            <el-option label="复卷" value="rewinding" />
            <el-option label="分切" value="slitting" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="query.status" placeholder="全部" clearable style="width: 140px">
            <el-option label="待生产" value="PENDING" />
            <el-option label="进行中" value="RUNNING" />
            <el-option label="已完成" value="DONE" />
          </el-select>
        </el-form-item>
        <el-form-item label="计划日期">
          <el-date-picker v-model="query.dateRange" type="daterange" start-placeholder="开始日期" end-placeholder="结束日期" value-format="yyyy-MM-dd" style="width: 260px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="el-icon-search" @click="loadTasks">查询</el-button>
          <el-button icon="el-icon-refresh" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never">
      <el-table :data="list" v-loading="loading" border stripe>
        <el-table-column prop="taskNo" label="任务号" width="140" />
        <el-table-column label="类型" width="90">
          <template slot-scope="{ row }">
            <el-tag size="small" :type="typeTag(row.type)">{{ typeText(row.type) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="materialCode" label="料号" width="160" />
        <el-table-column prop="materialName" label="品名" min-width="160" show-overflow-tooltip />
        <el-table-column prop="equipmentCode" label="设备" width="120" />
        <el-table-column prop="planStartTime" label="计划开始" width="170" />
        <el-table-column prop="planEndTime" label="计划结束" width="170" />
        <el-table-column label="状态" width="100">
          <template slot-scope="{ row }">
            <el-tag size="small" :type="statusTag(row.status)">{{ statusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="qty" label="计划量" width="120" />
      </el-table>
      <el-pagination
        class="mt-10 right"
        :current-page="query.pageNum"
        :page-size="query.pageSize"
        :total="total"
        layout="total, prev, pager, next"
        @current-change="pageChange"
      />
    </el-card>

    <el-card shadow="never" class="mt-15">
      <div class="card-title">物料领/退料</div>
      <el-form :inline="true" :model="lockQuery" class="mb-10">
        <el-form-item label="订单ID">
          <el-input v-model="lockQuery.orderId" placeholder="输入订单ID" style="width: 180px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="el-icon-search" @click="loadOrderLocks">查询锁定</el-button>
          <el-button icon="el-icon-refresh" @click="resetLocks">重置</el-button>
        </el-form-item>
      </el-form>
      <el-alert type="info" :closable="false" title="提示：仅对已锁定(领料)或已领料(退料)的记录操作。" class="mb-10" />
      <div class="mb-10">
        <el-button type="primary" size="mini" :disabled="pickDisabled" @click="batchAllocate">批量领料</el-button>
        <el-button type="warning" size="mini" :disabled="returnDisabled" @click="batchReturn">批量退料</el-button>
      </div>
      <el-table :data="locks" v-loading="locksLoading" border stripe @selection-change="selChange">
        <el-table-column type="selection" width="45" />
        <el-table-column prop="id" label="锁定ID" width="90" />
        <el-table-column prop="filmStockId" label="物料ID" width="90" />
        <el-table-column prop="lockedArea" label="面积(m²)" width="120" />
        <el-table-column prop="lockStatus" label="状态" width="110">
          <template slot-scope="{ row }">
            <el-tag size="small" :type="lockStatusTag(row.lockStatus)">{{ lockStatusText(row.lockStatus) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="lockedTime" label="锁定时间" width="170" />
      </el-table>
    </el-card>
  </div>
</template>

<script>
import { getProductionTasks } from '@/api/productionManagement'
import { queryOrderLocks, allocateMaterials, returnMaterials } from '@/api/scheduleMaterial'

export default {
  name: 'ProductionManagement',
  data() {
    return {
      loading: false,
      list: [],
      total: 0,
      query: {
        type: '',
        status: '',
        dateRange: [],
        pageNum: 1,
        pageSize: 20
      },
      // locks
      locksLoading: false,
      lockQuery: {
        orderId: ''
      },
      locks: [],
      selected: []
    }
  },
  created() {
    this.loadTasks()
  },
  computed: {
    pickDisabled() {
      return !this.selected.some(x => x.lockStatus === 'LOCKED')
    },
    returnDisabled() {
      return !this.selected.some(x => x.lockStatus === 'ALLOCATED' || x.lockStatus === 'PICKED')
    }
  },
  methods: {
    typeText(t) { return t === 'coating' ? '涂布' : t === 'rewinding' ? '复卷' : t === 'slitting' ? '分切' : t },
    typeTag(t) { return t === 'coating' ? 'success' : t === 'rewinding' ? 'warning' : 'info' },
    statusText(s) { const m = { PENDING: '待生产', RUNNING: '进行中', DONE: '已完成' }; return m[s] || s },
    statusTag(s) { const m = { PENDING: 'info', RUNNING: 'warning', DONE: 'success' }; return m[s] || 'info' },
    lockStatusText(s) { const m = { LOCKED: '锁定', ALLOCATED: '已领料', PICKED: '已领料', USED: '已消耗', RELEASED: '已释放' }; return m[s] || s },
    lockStatusTag(s) { const m = { LOCKED: 'success', ALLOCATED: 'warning', PICKED: 'warning', USED: 'info', RELEASED: 'danger' }; return m[s] || 'info' },

    async loadTasks() {
      this.loading = true
      try {
        const params = {
          type: this.query.type || undefined,
          status: this.query.status || undefined,
          planDateStart: this.query.dateRange && this.query.dateRange.length ? this.query.dateRange[0] : undefined,
          planDateEnd: this.query.dateRange && this.query.dateRange.length ? this.query.dateRange[1] : undefined,
          pageNum: this.query.pageNum,
          pageSize: this.query.pageSize
        }
        const res = await getProductionTasks(params)
        if (res.code === 20000 || res.code === 200) {
          this.list = res.data?.list || []
          this.total = Number(res.data?.total || 0)
        }
      } catch (e) {
        this.$message.error('加载任务失败')
      } finally {
        this.loading = false
      }
    },
    pageChange(p) { this.query.pageNum = p; this.loadTasks() },
    resetQuery() {
      this.query = { type: '', status: '', dateRange: [], pageNum: 1, pageSize: 20 }
      this.loadTasks()
    },

    async loadOrderLocks() {
      if (!this.lockQuery.orderId) { this.$message.info('请输入订单ID'); return }
      this.locksLoading = true
      try {
        const res = await queryOrderLocks(this.lockQuery.orderId)
        if (res.code === 200 || res.code === 20000) {
          this.locks = res.data || []
        }
      } catch (e) {
        this.$message.error('加载锁定失败')
      } finally {
        this.locksLoading = false
      }
    },
    resetLocks() { this.lockQuery.orderId = ''; this.locks = []; this.selected = [] },
    selChange(rows) { this.selected = rows },

    async batchAllocate() {
      const pickIds = this.selected.filter(x => x.lockStatus === 'LOCKED').map(x => x.id)
      if (!pickIds.length) { this.$message.info('请勾选锁定中的记录'); return }
      try {
        const res = await allocateMaterials(pickIds)
        if (res.code === 200 || res.code === 20000) {
          this.$message.success('领料成功')
          this.loadOrderLocks()
        } else { this.$message.error(res.message || '领料失败') }
      } catch (e) { this.$message.error('领料失败') }
    },
    async batchReturn() {
      const returnIds = this.selected.filter(x => x.lockStatus === 'ALLOCATED' || x.lockStatus === 'PICKED').map(x => x.id)
      if (!returnIds.length) { this.$message.info('请勾选已领料的记录'); return }
      try {
        const res = await returnMaterials(returnIds)
        if (res.code === 200 || res.code === 20000) {
          this.$message.success('退料成功')
          this.loadOrderLocks()
        } else { this.$message.error(res.message || '退料失败') }
      } catch (e) { this.$message.error('退料失败') }
    }
  }
}
</script>

<style scoped>
.mb-10 { margin-bottom: 10px; }
.mt-10 { margin-top: 10px; }
.mt-15 { margin-top: 15px; }
.right { text-align: right; }
.card-title { font-weight: 600; margin-bottom: 10px; }
</style>
