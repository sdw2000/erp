<template>
  <div class="app-container">
    <el-card>
      <div slot="header" class="clearfix">
        <span>化工请购管理</span>
        <el-button size="small" style="float: right" @click="goHub">返回原材料总仓</el-button>
      </div>
      <el-form :inline="true" size="small">
        <el-form-item label="计划日期">
          <el-date-picker v-model="query.planDate" type="date" value-format="yyyy-MM-dd" placeholder="选择日期" />
        </el-form-item>
        <el-form-item label="订单号">
          <el-input v-model="query.orderNo" placeholder="可选" style="width: 180px" />
        </el-form-item>
        <el-form-item label="成品料号">
          <el-input v-model="query.materialCode" placeholder="可选" style="width: 180px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleGenerate">按配方生成锁定/请购</el-button>
          <el-button @click="fetchPage">刷新</el-button>
        </el-form-item>
      </el-form>

      <el-table ref="chemicalRequisitionTable" :data="tableData" border size="small" style="margin-top: 8px;" @row-click="handleRowClick">
        <el-table-column prop="requestNo" label="请购单号" width="180" />
        <el-table-column prop="planDate" label="计划日期" width="120" />
        <el-table-column prop="orderNo" label="订单号" width="150" />
        <el-table-column prop="finishedMaterialCode" label="成品料号" width="180" />
        <el-table-column label="状态" width="120">
          <template slot-scope="scope">
            <el-tag size="mini" :type="statusTagType(scope.row.status)">{{ formatStatus(scope.row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="purchaseOrderNo" label="采购单号" width="150" />
        <el-table-column prop="source" label="来源" width="120" />
        <el-table-column prop="remark" label="备注" />
        <el-table-column label="操作" width="400" align="center">
          <template slot-scope="scope">
            <el-button size="mini" @click.stop="handleOpenDetail(scope.row)">明细</el-button>
            <el-button size="mini" type="success" :disabled="!canSubmit(scope.row)" @click.stop="handleSubmit(scope.row)">提交</el-button>
            <el-button size="mini" type="warning" :disabled="!canApprove(scope.row)" @click.stop="handleApprove(scope.row)">审核</el-button>
            <el-button size="mini" type="primary" :disabled="!canCreatePo(scope.row)" @click.stop="handleCreatePo(scope.row)">转采购</el-button>
            <el-button size="mini" :disabled="!canReceive(scope.row)" @click.stop="handleReceive(scope.row)">收货</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        style="margin-top: 12px; text-align: right;"
        layout="total, prev, pager, next"
        :total="total"
        :current-page="current"
        :page-size="size"
        @current-change="handlePageChange"
      />
    </el-card>

    <el-dialog
      :title="`请购单明细 - ${currentDetailRequestNo || ''}`"
      :visible.sync="detailVisible"
      :show-close="true"
      :close-on-click-modal="true"
      :close-on-press-escape="true"
      width="1080px"
      custom-class="chemical-detail-dialog"
      @close="handleCloseDetail"
    >
      <div class="chemical-detail-toolbar">
        <div>
          <span style="margin-right: 8px; color:#606266;">当前状态</span>
          <el-tag size="mini" :type="statusTagType(currentDetailStatus)">{{ formatStatus(currentDetailStatus) }}</el-tag>
        </div>
        <el-button size="mini" @click="refreshCurrentDetail">刷新明细</el-button>
      </div>
      <el-table :data="detailItems" border size="small" class="chemical-detail-table">
        <el-table-column prop="rawMaterialCode" label="物料代码" width="150" header-align="center" />
        <el-table-column prop="rawMaterialName" label="物料名称" width="145" header-align="center" />
        <el-table-column prop="requiredKg" label="需求kg" width="95" align="center" header-align="center" />
        <el-table-column prop="suggestedQty" label="建议请购" width="100" align="center" header-align="center" />
        <el-table-column prop="receivedQty" label="累计已收" width="95" align="center" header-align="center" />
        <el-table-column prop="remainingQty" label="剩余待收" width="95" align="center" header-align="center" />
        <el-table-column label="请购数量" width="150" align="center" header-align="center">
          <template slot-scope="scope">
            <el-input-number
              v-model="scope.row.requestedQty"
              class="qty-stepper"
              style="width: 128px"
              :min="0"
              :disabled="!canEditQty"
              size="mini"
              @change="val => handleUpdateQty(scope.row, val)"
            />
          </template>
        </el-table-column>
        <el-table-column label="本次实收" width="150" align="center" header-align="center">
          <template slot-scope="scope">
            <el-input-number
              v-if="canReceiveCurrent"
              v-model="scope.row.receiveQty"
              class="qty-stepper"
              style="width: 128px"
              :min="0"
              :max="scope.row.remainingQty || 0"
              :disabled="!canReceiveCurrent"
              size="mini"
            />
            <span v-else style="color:#909399;">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="unit" label="单位" width="75" align="center" header-align="center" />
        <el-table-column prop="purchaseOrderItemId" label="采购明细ID" width="110" align="center" header-align="center" />
        <el-table-column prop="remark" label="备注" min-width="120" show-overflow-tooltip />
      </el-table>

      <div class="chemical-detail-footer">
        <div style="flex:1;">
          <div style="margin-bottom: 8px; font-weight: 600;">操作日志</div>
          <el-timeline>
            <el-timeline-item
              v-for="(log, index) in detailLogs"
              :key="index"
              :timestamp="log.createTime"
              placement="top"
            >
              {{ log.actionType }} - {{ log.content }}
            </el-timeline-item>
          </el-timeline>
        </div>
        <div>
          <el-button v-if="canReceiveCurrent" type="primary" size="small" @click="handleReceiveCurrent">提交本次到货</el-button>
        </div>
      </div>

      <span slot="footer" class="dialog-footer">
        <el-button size="small" @click="detailVisible = false">关闭</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import {
  generateChemicalRequisition,
  getChemicalRequisitionPage,
  getChemicalRequisitionDetail,
  updateChemicalRequestedQty,
  submitChemicalRequisition,
  approveChemicalRequisition,
  createChemicalPurchaseOrder,
  receiveChemicalRequisition
} from '@/api/chemicalRequisition'
import elTableAutoLayout from '@/mixins/elTableAutoLayout'

export default {
  name: 'ChemicalRequisition',
  mixins: [elTableAutoLayout],
  tableLayoutRefs: ['chemicalRequisitionTable'],
  data() {
    return {
      query: {
        planDate: '',
        orderNo: '',
        materialCode: ''
      },
      tableData: [],
      total: 0,
      current: 1,
      size: 20,
      detailVisible: false,
      detailItems: [],
      detailLogs: [],
      currentDetailRequestNo: '',
      currentDetailStatus: ''
    }
  },
  computed: {
    canEditQty() {
      return ['DRAFT', 'SUBMITTED'].includes(this.currentDetailStatus)
    },
    canReceiveCurrent() {
      return ['PO_CREATED', 'PARTIAL_RECEIVED'].includes(this.currentDetailStatus)
    }
  },
  created() {
    this.fetchPage()
  },
  methods: {
    goHub() {
      this.$router.push({ path: '/stock/raw-material-hub' })
    },

    formatStatus(status) {
      const map = {
        DRAFT: '草稿',
        SUBMITTED: '已提交',
        APPROVED: '已审核',
        PO_CREATED: '已转采购',
        PARTIAL_RECEIVED: '部分到货',
        RECEIVED: '已收货'
      }
      return map[status] || status || '-'
    },
    statusTagType(status) {
      const map = {
        DRAFT: 'info',
        SUBMITTED: 'warning',
        APPROVED: '',
        PO_CREATED: 'primary',
        PARTIAL_RECEIVED: 'warning',
        RECEIVED: 'success'
      }
      return map[status] || 'info'
    },
    canSubmit(row) {
      return row && row.status === 'DRAFT'
    },
    canApprove(row) {
      return row && ['DRAFT', 'SUBMITTED'].includes(row.status)
    },
    canCreatePo(row) {
      return row && row.status === 'APPROVED' && !row.purchaseOrderNo
    },
    canReceive(row) {
      return row && ['PO_CREATED', 'PARTIAL_RECEIVED'].includes(row.status)
    },
    fetchPage() {
      getChemicalRequisitionPage({ current: this.current, size: this.size }).then(res => {
        const ok = res && (res.code === 200 || res.code === 20000)
        if (!ok) return
        const page = res.data || {}
        this.tableData = page.records || []
        this.total = page.total || 0
      }).finally(() => {
        this.scheduleTableLayout()
      })
    },
    handleGenerate() {
      if (!this.query.planDate) {
        this.$message.warning('请先选择计划日期')
        return
      }
      generateChemicalRequisition(this.query).then(res => {
        const ok = res && (res.code === 200 || res.code === 20000)
        if (!ok) {
          this.$message.error((res && res.message) || '生成失败')
          return
        }
        this.$message.success('生成完成')
        this.fetchPage()
      })
    },
    handleRowClick(row) {
      this.handleOpenDetail(row)
    },
    handleOpenDetail(row) {
      if (!row || !row.requestNo) return
      getChemicalRequisitionDetail(row.requestNo).then(res => {
        const ok = res && (res.code === 200 || res.code === 20000)
        if (!ok) return
        const detail = res.data || {}
        this.currentDetailRequestNo = row.requestNo
        this.currentDetailStatus = detail.status || row.status || ''
        this.detailItems = (detail.items || []).map(item => ({
          ...item,
          remainingQty: Math.max((item.requestedQty || 0) - (item.receivedQty || 0), 0),
          receiveQty: 0
        }))
        this.detailLogs = detail.logs || []
        this.detailVisible = true
      })
    },
    refreshCurrentDetail() {
      if (!this.currentDetailRequestNo) return
      this.handleOpenDetail({ requestNo: this.currentDetailRequestNo, status: this.currentDetailStatus })
    },
    handleUpdateQty(row, val) {
      if (!this.canEditQty) {
        this.$message.warning('当前状态不允许修改请购数量')
        return
      }
      updateChemicalRequestedQty(row.id, val).then(res => {
        const ok = res && (res.code === 200 || res.code === 20000)
        if (ok) {
          row.remainingQty = Math.max((row.requestedQty || 0) - (row.receivedQty || 0), 0)
          this.$message.success('已更新')
        }
      })
    },
    handleSubmit(row) {
      submitChemicalRequisition(row.requestNo).then(res => {
        const ok = res && (res.code === 200 || res.code === 20000)
        if (ok) {
          this.$message.success('提交成功')
          this.fetchPage()
          if (this.currentDetailRequestNo === row.requestNo) {
            this.refreshCurrentDetail()
          }
        }
      })
    },
    handleApprove(row) {
      approveChemicalRequisition(row.requestNo).then(res => {
        const ok = res && (res.code === 200 || res.code === 20000)
        if (ok) {
          this.$message.success('审核成功')
          this.fetchPage()
          if (this.currentDetailRequestNo === row.requestNo) {
            this.refreshCurrentDetail()
          }
        }
      })
    },
    handleCreatePo(row) {
      createChemicalPurchaseOrder(row.requestNo).then(res => {
        const ok = res && (res.code === 200 || res.code === 20000)
        if (ok) {
          const poNo = res.data && res.data.purchaseOrderNo
          this.$message.success(poNo ? `已生成采购单: ${poNo}` : '已生成采购单')
          this.fetchPage()
          if (this.currentDetailRequestNo === row.requestNo) {
            this.refreshCurrentDetail()
          }
        }
      })
    },
    handleReceive(row) {
      this.handleOpenDetail(row)
    },
    handleReceiveCurrent() {
      if (!this.currentDetailRequestNo) {
        this.$message.warning('请先选择请购单')
        return
      }
      if (!this.canReceiveCurrent) {
        this.$message.warning('当前状态不允许收货')
        return
      }
      const positiveItems = (this.detailItems || []).filter(item => (item.receiveQty || 0) > 0)
      if (!positiveItems.length) {
        this.$message.warning('请填写本次实收数量')
        return
      }
      const invalidItem = positiveItems.find(item => (item.receiveQty || 0) > (item.remainingQty || 0))
      if (invalidItem) {
        this.$message.warning(`物料 ${invalidItem.rawMaterialCode} 本次实收不能大于剩余待收`)
        return
      }
      const payload = {
        items: positiveItems.map(item => ({
          id: item.id,
          receiveQty: item.receiveQty || 0
        }))
      }
      receiveChemicalRequisition(this.currentDetailRequestNo, payload).then(res => {
        const ok = res && (res.code === 200 || res.code === 20000)
        if (ok) {
          this.$message.success('本次到货已处理')
          this.fetchPage()
          this.refreshCurrentDetail()
        }
      })
    },
    handlePageChange(page) {
      this.current = page
      this.fetchPage()
    },
    handleCloseDetail() {
      this.detailVisible = false
    }
  }
}
</script>

<style scoped>
.chemical-detail-toolbar {
  margin-bottom: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chemical-detail-footer {
  margin-top: 12px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.qty-stepper {
  width: 128px;
}

.chemical-detail-table .el-input-number--mini .el-input__inner {
  text-align: center;
}
</style>
