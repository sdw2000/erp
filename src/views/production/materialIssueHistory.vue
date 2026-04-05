<template>
  <div class="app-container">
    <el-card shadow="never" class="mb-10">
      <div class="card-title">锁定/领退料追溯</div>
      <el-tabs v-model="activeTab" @tab-click="handleTabChange">
        <el-tab-pane label="锁定与退料台账" name="lockHistory" />
        <el-tab-pane label="领料单台账" name="issueOrders" />
      </el-tabs>
    </el-card>

    <el-card v-if="activeTab === 'lockHistory'" shadow="never" class="mb-10">
      <el-form :inline="true" :model="lockQuery" @submit.native.prevent>
        <el-form-item label="计划日期">
          <el-date-picker v-model="lockQuery.planDate" type="date" value-format="yyyy-MM-dd" style="width: 150px" />
        </el-form-item>
        <el-form-item label="订单号">
          <el-input v-model="lockQuery.orderNo" placeholder="可选" style="width: 180px" />
        </el-form-item>
        <el-form-item label="料号">
          <el-input v-model="lockQuery.materialCode" placeholder="可选" style="width: 180px" />
        </el-form-item>
        <el-form-item label="卷代码">
          <el-input v-model="lockQuery.rollCode" placeholder="可选" style="width: 180px" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="lockQuery.lockStatus" clearable style="width: 140px" placeholder="全部">
            <el-option label="锁定中" value="锁定中" />
            <el-option label="LOCKED" value="LOCKED" />
            <el-option label="已领料" value="已领料" />
            <el-option label="ALLOCATED" value="ALLOCATED" />
            <el-option label="PICKED" value="PICKED" />
            <el-option label="已释放(退料)" value="已释放" />
            <el-option label="RELEASED" value="RELEASED" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="el-icon-search" @click="searchLockHistory">查询</el-button>
          <el-button icon="el-icon-refresh" @click="resetLockHistory">重置</el-button>
        </el-form-item>
      </el-form>

      <el-table v-loading="lockLoading" :data="lockList" border stripe>
        <el-table-column prop="id" label="锁定ID" width="90" />
        <el-table-column prop="orderNo" label="订单号" width="160" />
        <el-table-column prop="materialCode" label="料号" width="170" />
        <el-table-column prop="rollCode" label="卷代码" width="170" show-overflow-tooltip />
        <el-table-column prop="location" label="库位" width="120" />
        <el-table-column prop="specDesc" label="规格" min-width="160" show-overflow-tooltip />
        <el-table-column prop="lockedArea" label="锁定面积(㎡)" width="120" align="right" />
        <el-table-column label="状态" width="120" align="center">
          <template slot-scope="{ row }">
            <el-tag size="small" :type="lockStatusType(row.lockStatus)">{{ lockStatusText(row.lockStatus) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="lockedTime" label="锁定时间" width="170" />
        <el-table-column prop="allocatedTime" label="领料时间" width="170" />
        <el-table-column prop="releasedTime" label="退料/释放时间" width="170" />
      </el-table>

      <el-pagination
        class="mt-10 right"
        :current-page="lockQuery.current"
        :page-size="lockQuery.size"
        :total="lockTotal"
        layout="total, prev, pager, next"
        @current-change="handleLockPageChange"
      />
    </el-card>

    <el-card v-else shadow="never" class="mb-10">
      <el-form :inline="true" :model="issueQuery" @submit.native.prevent>
        <el-form-item label="计划日期">
          <el-date-picker v-model="issueQuery.planDate" type="date" value-format="yyyy-MM-dd" style="width: 150px" />
        </el-form-item>
        <el-form-item label="订单号">
          <el-input v-model="issueQuery.orderNo" placeholder="可选" style="width: 180px" />
        </el-form-item>
        <el-form-item label="料号">
          <el-input v-model="issueQuery.materialCode" placeholder="可选" style="width: 180px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="el-icon-search" @click="searchIssueOrders">查询</el-button>
          <el-button icon="el-icon-refresh" @click="resetIssueOrders">重置</el-button>
        </el-form-item>
      </el-form>

      <el-table v-loading="issueLoading" :data="issueList" border stripe>
        <el-table-column prop="issueNo" label="领料单号" width="160" />
        <el-table-column prop="planDate" label="计划日期" width="120" />
        <el-table-column prop="orderNo" label="订单号" width="170" />
        <el-table-column prop="materialCode" label="料号" width="170" />
        <el-table-column prop="totalArea" label="总面积(㎡)" width="120" align="right" />
        <el-table-column prop="itemCount" label="明细数" width="90" align="right" />
        <el-table-column prop="status" label="状态" width="120" />
        <el-table-column prop="createdAt" label="创建时间" width="170" />
        <el-table-column prop="remark" label="备注" min-width="160" show-overflow-tooltip />
      </el-table>

      <el-pagination
        class="mt-10 right"
        :current-page="issueQuery.current"
        :page-size="issueQuery.size"
        :total="issueTotal"
        layout="total, prev, pager, next"
        @current-change="handleIssuePageChange"
      />
    </el-card>
  </div>
</template>

<script>
import { getIssueOrderPage, getLockHistoryPage } from '@/api/scheduleMaterial'

export default {
  name: 'MaterialIssueHistory',
  data() {
    return {
      activeTab: 'lockHistory',
      lockLoading: false,
      lockList: [],
      lockTotal: 0,
      lockQuery: {
        planDate: '',
        orderNo: '',
        materialCode: '',
        rollCode: '',
        lockStatus: '',
        current: 1,
        size: 20
      },
      issueLoading: false,
      issueList: [],
      issueTotal: 0,
      issueQuery: {
        planDate: '',
        orderNo: '',
        materialCode: '',
        current: 1,
        size: 20
      }
    }
  },
  created() {
    const d = this.todayDate()
    this.lockQuery.planDate = d
    this.issueQuery.planDate = d
    this.loadLockHistory()
  },
  methods: {
    todayDate() {
      const d = new Date()
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${y}-${m}-${day}`
    },
    lockStatusText(status) {
      const map = {
        LOCKED: '锁定中',
        '锁定中': '锁定中',
        ALLOCATED: '已领料',
        PICKED: '已领料',
        '已领料': '已领料',
        RELEASED: '已释放/退料',
        '已释放': '已释放/退料',
        CONSUMED: '已消耗',
        '已消耗': '已消耗',
        PENDING_SUPPLY: '待补锁',
        '待补锁': '待补锁',
        FULFILLED: '已补锁',
        '已补锁': '已补锁',
        CANCELLED: '已取消',
        '已取消': '已取消'
      }
      return map[status] || status || '-'
    },
    lockStatusType(status) {
      const map = {
        LOCKED: 'success',
        '锁定中': 'success',
        ALLOCATED: 'warning',
        PICKED: 'warning',
        '已领料': 'warning',
        RELEASED: 'danger',
        '已释放': 'danger',
        CONSUMED: 'info',
        '已消耗': 'info',
        PENDING_SUPPLY: 'info',
        '待补锁': 'info',
        FULFILLED: 'success',
        '已补锁': 'success',
        CANCELLED: 'info',
        '已取消': 'info'
      }
      return map[status] || 'info'
    },
    handleTabChange() {
      if (this.activeTab === 'lockHistory') {
        this.loadLockHistory()
      } else {
        this.loadIssueOrders()
      }
    },
    searchLockHistory() {
      this.lockQuery.current = 1
      this.loadLockHistory()
    },
    resetLockHistory() {
      this.lockQuery = {
        planDate: this.todayDate(),
        orderNo: '',
        materialCode: '',
        rollCode: '',
        lockStatus: '',
        current: 1,
        size: 20
      }
      this.loadLockHistory()
    },
    async loadLockHistory() {
      this.lockLoading = true
      try {
        const res = await getLockHistoryPage(this.lockQuery)
        if (res.code === 200 || res.code === 20000) {
          const data = res.data || {}
          this.lockList = data.records || data.list || []
          this.lockTotal = Number(data.total || 0)
        }
      } catch (e) {
        this.$message.error('加载锁定/退料台账失败')
      } finally {
        this.lockLoading = false
      }
    },
    handleLockPageChange(page) {
      this.lockQuery.current = page
      this.loadLockHistory()
    },
    searchIssueOrders() {
      this.issueQuery.current = 1
      this.loadIssueOrders()
    },
    resetIssueOrders() {
      this.issueQuery = {
        planDate: this.todayDate(),
        orderNo: '',
        materialCode: '',
        current: 1,
        size: 20
      }
      this.loadIssueOrders()
    },
    async loadIssueOrders() {
      this.issueLoading = true
      try {
        const res = await getIssueOrderPage(this.issueQuery)
        if (res.code === 200 || res.code === 20000) {
          const data = res.data || {}
          this.issueList = data.records || data.list || []
          this.issueTotal = Number(data.total || 0)
        }
      } catch (e) {
        this.$message.error('加载领料单台账失败')
      } finally {
        this.issueLoading = false
      }
    },
    handleIssuePageChange(page) {
      this.issueQuery.current = page
      this.loadIssueOrders()
    }
  }
}
</script>

<style scoped>
.mb-10 { margin-bottom: 10px; }
.mt-10 { margin-top: 10px; }
.right { text-align: right; }
.card-title { font-weight: 600; }
</style>
