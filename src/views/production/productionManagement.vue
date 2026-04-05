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
      <el-table v-loading="loading" :data="list" border stripe>
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
        <el-form-item label="订单号">
          <el-input v-model="lockQuery.orderNo" placeholder="可选，输入订单号" style="width: 180px" />
        </el-form-item>
        <el-form-item :label="isCoatingType ? '成品料号' : '卷代码'">
          <el-input v-model="lockQuery.materialCode" :placeholder="isCoatingType ? '可选，输入成品料号' : '可选，输入母卷/复卷代码'" style="width: 200px" />
        </el-form-item>
        <el-form-item label="计划日期">
          <el-date-picker v-model="lockQuery.planDate" type="date" value-format="yyyy-MM-dd" style="width: 150px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="el-icon-search" @click="loadOrderLocks">查询锁定</el-button>
          <el-button icon="el-icon-refresh" @click="resetLocks">重置</el-button>
        </el-form-item>
      </el-form>
      <el-alert
        type="info"
        :closable="false"
        :title="isCoatingType
          ? '提示：涂布按配胶单自动计算原材料需求，库存足够自动锁定，不足自动生成请购。'
          : '提示：按当天排程自动查询需领料母卷，可按订单号过滤；结果按料号和订单号排序。'"
        class="mb-10"
      />
      <div class="mb-10">
        <el-button v-if="!isCoatingType" type="primary" size="mini" :disabled="pickDisabled" @click="batchAllocate">批量领料</el-button>
        <el-button v-if="!isCoatingType" type="warning" size="mini" :disabled="returnDisabled" @click="batchReturn">批量退料</el-button>
      </div>
      <el-table v-loading="locksLoading" :data="locks" border stripe @selection-change="selChange">
        <el-table-column v-if="!isCoatingType" type="selection" width="45" />
        <el-table-column prop="id" label="锁定ID" width="90" />
        <el-table-column prop="orderNo" label="订单号" width="160" />
        <template v-if="isCoatingType">
          <el-table-column prop="finishedMaterialCode" label="成品料号" width="180" />
          <el-table-column prop="rawMaterialCode" label="原材料代码" width="150" />
          <el-table-column prop="rawMaterialName" label="原材料名称" min-width="160" show-overflow-tooltip />
          <el-table-column prop="requiredKg" label="需求(kg)" width="120" />
          <el-table-column prop="requiredQty" label="需求数量" width="100" />
          <el-table-column prop="lockedQty" label="已锁定" width="100" />
          <el-table-column prop="shortageQty" label="缺口" width="90" />
          <el-table-column prop="unit" label="单位" width="80" />
          <el-table-column prop="chemicalStockId" label="库存ID" width="90" />
        </template>
        <template v-else>
          <el-table-column prop="materialCode" label="料号" width="180" />
          <el-table-column prop="location" label="库位" width="120" />
          <el-table-column prop="specDesc" label="规格" min-width="180" show-overflow-tooltip />
          <el-table-column prop="filmStockId" label="物料ID" width="90" />
          <el-table-column prop="lockedArea" label="面积(m²)" width="120" />
        </template>
        <el-table-column prop="lockStatus" label="状态" width="110">
          <template slot-scope="{ row }">
            <el-tag size="small" :type="lockStatusTag(row.lockStatus)">{{ lockStatusText(row.lockStatus) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column :prop="isCoatingType ? 'updateTime' : 'lockedTime'" label="锁定时间" width="170" />
      </el-table>
    </el-card>
  </div>
</template>

<script>
import { getProductionTasks } from '@/api/productionManagement'
import { queryOrderLockedStocks, allocateMaterials, returnMaterials } from '@/api/scheduleMaterial'
import { queryCoatingChemicalLocks } from '@/api/chemicalRequisition'

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
        orderNo: '',
        materialCode: '',
        planDate: ''
      },
      locks: [],
      selected: []
    }
  },
  computed: {
    isCoatingType() {
      return this.query.type === 'coating'
    },
    pickDisabled() {
      if (this.isCoatingType) return true
      return !this.selected.some(x => x.lockStatus === 'LOCKED' || x.lockStatus === '锁定中')
    },
    returnDisabled() {
      if (this.isCoatingType) return true
      return !this.selected.some(x => x.lockStatus === 'ALLOCATED' || x.lockStatus === 'PICKED' || x.lockStatus === '已领料')
    }
  },
  created() {
    this.lockQuery.planDate = this.todayDate()
    this.loadTasks()
  },
  methods: {
    todayDate() {
      const d = new Date()
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${y}-${m}-${day}`
    },
    typeText(t) { return t === 'coating' ? '涂布' : t === 'rewinding' ? '复卷' : t === 'slitting' ? '分切' : t },
    typeTag(t) { return t === 'coating' ? 'success' : t === 'rewinding' ? 'warning' : 'info' },
    statusText(s) { const m = { PENDING: '待生产', RUNNING: '进行中', DONE: '已完成' }; return m[s] || s },
    statusTag(s) { const m = { PENDING: 'info', RUNNING: 'warning', DONE: 'success' }; return m[s] || 'info' },
    lockStatusText(s) { const m = { LOCKED: '已锁定', '锁定中': '已锁定', PARTIAL: '部分锁定', PENDING: '待请购', ALLOCATED: '已领料', PICKED: '已领料', '已领料': '已领料', USED: '已消耗', '已消耗': '已消耗', RELEASED: '已释放', '已释放': '已释放', PENDING_SUPPLY: '待补锁', FULFILLED: '已补锁', '待补锁': '待补锁', '已补锁': '已补锁' }; return m[s] || s },
    lockStatusTag(s) { const m = { LOCKED: 'success', '锁定中': 'success', PARTIAL: 'warning', PENDING: 'info', ALLOCATED: 'warning', PICKED: 'warning', '已领料': 'warning', USED: 'info', '已消耗': 'info', RELEASED: 'danger', '已释放': 'danger', PENDING_SUPPLY: 'info', FULFILLED: 'success', '待补锁': 'info', '已补锁': 'success' }; return m[s] || 'info' },

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
      if (!this.lockQuery.planDate) { this.$message.info('请选择计划日期'); return }
      this.locksLoading = true
      try {
        if (this.isCoatingType) {
          const res = await queryCoatingChemicalLocks({
            planDate: this.lockQuery.planDate || this.todayDate(),
            orderNo: this.lockQuery.orderNo || undefined,
            materialCode: this.lockQuery.materialCode || undefined
          })
          if (res.code === 200 || res.code === 20000) {
            const summary = (res.data && res.data.summary) || {}
            this.locks = (res.data && res.data.locks) || []
            this.selected = []
            this.$message.success(`已按配胶单完成计算：锁定${summary.lockCount || 0}条，请购${summary.requestItemCount || 0}条`)
          }
        } else {
          const res = await queryOrderLockedStocks(this.lockQuery.materialCode || '', this.lockQuery.planDate || this.todayDate(), this.lockQuery.orderNo || '')
          if (res.code === 200 || res.code === 20000) {
            this.locks = res.data || []
          }
        }
      } catch (e) {
        this.$message.error('加载锁定失败')
      } finally {
        this.locksLoading = false
      }
    },
    resetLocks() { this.lockQuery.orderNo = ''; this.lockQuery.materialCode = ''; this.lockQuery.planDate = this.todayDate(); this.locks = []; this.selected = [] },
    selChange(rows) { this.selected = rows },

    async batchAllocate() {
      if (this.isCoatingType) { this.$message.info('涂布原材料已在查询时自动锁定/请购，无需手动领料'); return }
      const pickIds = this.selected.filter(x => x.lockStatus === 'LOCKED' || x.lockStatus === '锁定中').map(x => x.id)
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
      if (this.isCoatingType) { this.$message.info('涂布原材料当前无需在此页面执行退料'); return }
      const returnIds = this.selected.filter(x => x.lockStatus === 'ALLOCATED' || x.lockStatus === 'PICKED' || x.lockStatus === '已领料').map(x => x.id)
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
