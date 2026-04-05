<template>
  <div class="app-container">
    <el-tabs v-model="activeTab" @tab-click="handleTabChange">
      <el-tab-pane label="待排订单" name="pending">
        <el-card shadow="never">
          <div slot="header" class="board-header">
            <span>待排订单明细</span>
            <div class="header-actions">
              <span class="summary">已选 {{ selectedArea.toFixed(2) }} ㎡ / {{ selectedRolls }} 卷</span>
            </div>
          </div>

          <el-form :inline="true" class="mb-10">
            <el-form-item label="客户等级">
              <el-select v-model="pendingParams.customerLevel" placeholder="全部" clearable style="width: 120px" @change="loadPending">
                <el-option label="VIP" value="VIP" />
                <el-option label="A" value="A" />
                <el-option label="B" value="B" />
                <el-option label="C" value="C" />
              </el-select>
            </el-form-item>
            <el-form-item label="料号">
              <el-input v-model="pendingParams.materialCode" placeholder="输入料号" clearable style="width: 180px" @keyup.enter.native="loadPending" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" icon="el-icon-search" @click="loadPending">查询</el-button>
              <el-button icon="el-icon-refresh" @click="resetPending">重置</el-button>
            </el-form-item>
          </el-form>

          <el-table
            v-loading="pendingLoading"
            :data="pendingList"
            border
            stripe
            :row-key="row => row.order_item_id"
            @selection-change="handleSelectionChange"
          >
            <el-table-column type="selection" width="50" />
            <el-table-column prop="order_no" label="订单号" width="140" />
            <el-table-column prop="customer" label="客户" width="140" />
            <el-table-column prop="customer_level" label="等级" width="80" align="center">
              <template slot-scope="{ row }">
                <el-tag size="small" :type="levelTag(row.customer_level)">{{ row.customer_level || '-' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="priorityScore" label="优先级" width="90" align="right" />
            <el-table-column prop="material_code" label="料号" width="140" />
            <el-table-column prop="material_name" label="品名" min-width="160" show-overflow-tooltip />
            <el-table-column prop="thickness" label="厚度(μm)" width="100" align="right" />
            <el-table-column prop="width" label="宽度(mm)" width="100" align="right" />
            <el-table-column prop="length" label="长度(m)" width="100" align="right" />
            <el-table-column label="待排数量" width="90" align="right">
              <template slot-scope="{ row }">
                {{ row._pending_remain != null ? row._pending_remain : row.pending_qty }}
              </template>
            </el-table-column>
            <el-table-column prop="schedule_qty" label="已选卷数" width="90" align="right" />
            <el-table-column label="本次排程" width="120" align="center">
              <template slot-scope="{ row }">
                <el-input-number
                  v-model.number="row.schedule_qty"
                  :min="0"
                  :max="Number(row.pending_qty || 0)"
                  :step="1"
                  size="mini"
                  controls-position="right"
                  @change="() => updateSelectedArea(row)"
                />
              </template>
            </el-table-column>
            <el-table-column prop="delivery_date" label="交期" width="120" />
            <el-table-column label="操作" width="130" align="center">
              <template slot-scope="{ row }">
                <el-button size="mini" type="primary" :disabled="Number(row.schedule_qty || 0) <= 0" @click="openLockDialogFromPending(row)">选库存排程</el-button>
              </template>
            </el-table-column>
          </el-table>

          <el-pagination
            class="mt-10 right"
            :current-page="pendingParams.pageNum"
            :page-size="pendingParams.pageSize"
            :total="pendingTotal"
            layout="total, prev, pager, next"
            @current-change="handlePendingPageChange"
            @size-change="handlePendingSizeChange"
          />
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="排程任务" name="tasks">
        <el-card shadow="never">
          <div slot="header" class="board-header">
            <span>排程任务</span>
            <div class="header-actions">
              <el-button size="small" icon="el-icon-printer" @click="printTasks">打印工单</el-button>
            </div>
          </div>

          <el-form :inline="true" class="mb-10">
            <el-form-item label="工序">
              <el-select v-model="taskQuery.processType" clearable placeholder="全部" style="width: 140px">
                <el-option label="涂布" value="COATING" />
                <el-option label="复卷" value="REWINDING" />
                <el-option label="分切" value="SLITTING" />
              </el-select>
            </el-form-item>
            <el-form-item label="状态">
              <el-select v-model="taskQuery.status" clearable placeholder="全部" style="width: 160px">
                <el-option label="已排程" value="SCHEDULED" />
                <el-option label="未排程" value="UNSCHEDULED" />
                <el-option label="执行中" value="IN_PROGRESS" />
                <el-option label="已完成" value="COMPLETED" />
                <el-option label="已取消" value="CANCELLED" />
              </el-select>
            </el-form-item>
            <el-form-item label="订单号">
              <el-input v-model="taskQuery.orderNo" placeholder="订单号" clearable style="width: 160px" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" icon="el-icon-search" @click="loadTasks">查询</el-button>
              <el-button icon="el-icon-refresh" @click="resetTasks">重置</el-button>
            </el-form-item>
          </el-form>

          <el-table v-loading="taskLoading" :data="taskList" border stripe>
            <el-table-column prop="batchNo" label="排程单号" width="160">
              <template slot-scope="{ row }">
                {{ row.batchNo || '-' }}
              </template>
            </el-table-column>
            <el-table-column label="订单" width="120" align="center">
              <template slot-scope="{ row }">
                <span v-if="!row.batchId">{{ row.orderNo || '-' }}</span>
                <el-button v-else size="mini" type="text" @click="openBatchDetail(row)">查看明细</el-button>
              </template>
            </el-table-column>
            <el-table-column prop="materialCode" label="料号" width="140" />
            <el-table-column prop="processType" label="工序" width="100" align="center">
              <template slot-scope="{ row }">
                <el-tag size="small" :type="processTag(row.processType)">{{ processText(row.processType) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="priorityScore" label="优先级" width="90" align="right" />
            <el-table-column prop="quantity" label="数量" width="90" align="right" />
            <el-table-column prop="area" label="面积(㎡)" width="110" align="right" />
            <el-table-column label="机台" width="180" align="center">
              <template slot-scope="{ row }">
                <el-select
                  v-model="row.equipmentId"
                  placeholder="选择机台"
                  size="mini"
                  clearable
                  style="width: 160px"
                  @change="() => updatePlan(row)"
                >
                  <el-option
                    v-for="eq in (equipmentOptions[row.processType] || [])"
                    :key="eq.id"
                    :label="(eq.equipmentCode || '') + (eq.equipmentName ? '-' + eq.equipmentName : '')"
                    :value="eq.id"
                  />
                </el-select>
              </template>
            </el-table-column>
            <el-table-column label="开始时间" width="200">
              <template slot-scope="{ row }">
                <el-date-picker
                  v-model="row.planStartTime"
                  type="datetime"
                  value-format="yyyy-MM-dd HH:mm:ss"
                  size="mini"
                  placeholder="选择开始时间"
                  style="width: 180px"
                  @change="() => updatePlan(row)"
                />
              </template>
            </el-table-column>
            <el-table-column prop="planEndTime" label="结束时间" width="170">
              <template slot-scope="{ row }">{{ formatDateTime(row.planEndTime) }}</template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="120" align="center">
              <template slot-scope="{ row }">
                <el-tag size="small" :type="statusTag(row.status)">{{ statusText(row.status) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="canShipBy48h" label="48h" width="70" align="center">
              <template slot-scope="{ row }">
                <el-tag size="mini" :type="row.canShipBy48h ? 'success' : 'info'">{{ row.canShipBy48h ? '是' : '否' }}</el-tag>
              </template>
            </el-table-column>
          </el-table>

          <el-pagination
            class="mt-10 right"
            :current-page="taskQuery.pageNum"
            :page-size="taskQuery.pageSize"
            :total="taskTotal"
            layout="total, prev, pager, next"
            @current-change="handleTaskPageChange"
          />
        </el-card>
      </el-tab-pane>
    </el-tabs>

    <el-dialog title="选择库存并锁定" :visible.sync="lockDialogVisible" width="900px">
      <div style="margin-bottom: 10px; color: #606266;">
        订单号：{{ lockTarget.orderNo || '-' }} ｜ 料号：{{ lockTarget.materialCode || '-' }} ｜ 工序：{{ processText(lockTarget.processType) || '-' }}
        ｜ 需求数量：{{ lockTarget.quantity || 0 }} ｜ 需求面积：{{ lockTarget.area || 0 }} ㎡
      </div>
      <el-table
        ref="materialTable"
        v-loading="lockLoading"
        :data="availableMaterials"
        border
        stripe
        @selection-change="handleMaterialSelection"
      >
        <el-table-column type="selection" width="50" />
        <el-table-column prop="qrCode" label="二维码" width="140" />
        <el-table-column prop="materialCode" label="物料代码" width="160" />
        <el-table-column prop="specDesc" label="规格" min-width="180" show-overflow-tooltip />
        <el-table-column prop="batchNo" label="批次号" width="140" />
        <el-table-column prop="availableRolls" label="可用卷数" width="110" align="right" />
        <el-table-column prop="availableArea" label="可用面积(㎡)" width="130" align="right" />
        <el-table-column label="锁定卷数" width="120" align="right">
          <template slot-scope="{ row }">
            <el-input-number
              v-model.number="row._lockQty"
              :min="0"
              :max="Number(row.availableRolls || 0)"
              :step="1"
              size="mini"
              controls-position="right"
            />
          </template>
        </el-table-column>
        <el-table-column label="锁定面积(㎡)" width="140" align="right">
          <template slot-scope="{ row }">
            <el-input-number
              v-model.number="row._lockArea"
              :min="0"
              :max="Number(row.availableArea || 0)"
              :step="1"
              size="mini"
              controls-position="right"
            />
          </template>
        </el-table-column>
      </el-table>
      <span slot="footer" class="dialog-footer">
        <el-button @click="lockDialogVisible = false">取消</el-button>
        <el-button @click="autoAllocateLocksFromAll">重新按FIFO分配</el-button>
        <el-button type="primary" :loading="lockSubmitLoading" @click="confirmLockMaterials">确定</el-button>
      </span>
    </el-dialog>

    <el-dialog title="设置排程" :visible.sync="planDialogVisible" width="520px">
      <el-form label-width="90px">
        <el-form-item label="机台">
          <el-select v-model="planForm.equipmentId" placeholder="选择机台" style="width: 100%">
            <el-option
              v-for="eq in planEquipments"
              :key="eq.id"
              :label="(eq.equipmentCode || '') + (eq.equipmentName ? ' - ' + eq.equipmentName : '')"
              :value="eq.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="开始时间">
          <el-date-picker
            v-model="planForm.startTime"
            type="datetime"
            value-format="yyyy-MM-dd HH:mm:ss"
            placeholder="选择开始时间"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      <span slot="footer" class="dialog-footer">
        <el-button @click="planDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="planSubmitLoading" @click="submitPlan">确定</el-button>
      </span>
    </el-dialog>

    <el-dialog title="排程单明细" :visible.sync="batchDetailVisible" width="720px">
      <div v-loading="batchDetailLoading">
        <div style="margin-bottom: 10px; color: #606266;">
          排程单号：{{ batchDetail.batchNo || '-' }} ｜ 工序：{{ processText(batchDetail.processType) || '-' }} ｜ 计划日期：{{ batchDetail.planDate || '-' }}
          ｜ 料号：{{ batchDetail.materialCode || '-' }} ｜ 合计卷数：{{ batchDetail.totalQty || 0 }} ｜ 合计面积：{{ batchDetail.totalArea || 0 }} ㎡
        </div>
        <el-table :data="batchDetailOrders" border stripe>
          <el-table-column prop="orderNo" label="订单号" width="140" />
          <el-table-column prop="quantity" label="卷数" width="90" align="right" />
          <el-table-column prop="area" label="面积(㎡)" width="120" align="right" />
        </el-table>
      </div>
      <span slot="footer" class="dialog-footer">
        <el-button @click="batchDetailVisible = false">关闭</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import { getPendingOrderItems } from '@/api/schedule'
import { planScheduleTasks, getScheduleTaskPage, updateScheduleTaskStatus, updateScheduleTaskStatusByOrderItem, getAvailableMaterials, lockMaterials, getScheduleEquipments, updateScheduleTaskPlan, getScheduleBatchDetail } from '@/api/scheduleTask'
import { getCoatingPlanTaskPage, upsertPlan } from '@/api/schedulePlan'
import { getSpecByMaterialCode } from '@/api/tapeSpec'

export default {
  name: 'ScheduleTask',
  data() {
    return {
      activeTab: 'pending',
      pendingLoading: false,
      pendingList: [],
      pendingTotal: 0,
      pendingParams: {
        pageNum: 1,
        pageSize: 20,
        customerLevel: '',
        materialCode: ''
      },
      selectedRows: [],
      gapMinutes: 10,
      lockStock: false,
      planLoading: false,
      taskLoading: false,
      taskList: [],
      taskTotal: 0,
      taskQuery: {
        pageNum: 1,
        pageSize: 20,
        processType: 'COATING',
        status: '',
        orderNo: ''
      },
      lockDialogVisible: false,
      lockLoading: false,
      lockSubmitLoading: false,
      allMaterials: [],
      availableMaterials: [],
      selectedMaterials: [],
      lockTarget: {},
      planDialogVisible: false,
      planSubmitLoading: false,
      planForm: {
        taskId: null,
        equipmentId: null,
        startTime: ''
      },
      planEquipments: [],
      equipmentOptions: {},
      batchDetailVisible: false,
      batchDetailLoading: false,
      batchDetail: {},
      batchDetailOrders: [],
      materialNameByCodeCache: {}
    }
  },
  computed: {
    selectedArea() {
      return this.selectedRows.reduce((sum, row) => sum + this.calcRowArea(row, row.schedule_qty || 0), 0)
    },
    selectedRolls() {
      return this.selectedRows.reduce((sum, row) => sum + Number(row.schedule_qty || 0), 0)
    }
  },
  mounted() {
    this.loadPending()
    this.loadTasks()
  },
  methods: {
    normalizeMaterialCode(code) {
      return String(code || '').replace(/\s+/g, '').trim().toUpperCase()
    },
    async enrichMaterialNamesFromSpec(rows) {
      const list = Array.isArray(rows) ? rows : []
      if (!list.length) return list

      const codes = Array.from(new Set(list
        .map(r => String((r && (r.material_code || r.materialCode)) || '').trim())
        .filter(Boolean)))

      const missingCodes = codes.filter(code => {
        const key = this.normalizeMaterialCode(code)
        return key && !Object.prototype.hasOwnProperty.call(this.materialNameByCodeCache, key)
      })

      if (missingCodes.length) {
        await Promise.all(missingCodes.map(async(code) => {
          const key = this.normalizeMaterialCode(code)
          let name = ''
          try {
            const res = await getSpecByMaterialCode(code)
            const spec = (res && (res.code === 200 || res.code === 20000)) ? (res.data || {}) : {}
            name = String(spec.productName || spec.materialName || spec.name || '').trim()
          } catch (e) {
            name = ''
          }
          this.$set(this.materialNameByCodeCache, key, name)
        }))
      }

      return list.map(row => {
        const code = String((row && (row.material_code || row.materialCode)) || '').trim()
        const key = this.normalizeMaterialCode(code)
        const masterName = String((key && this.materialNameByCodeCache[key]) || '').trim()
        if (!masterName) return row
        return {
          ...row,
          material_name: masterName,
          materialName: masterName
        }
      })
    },
    handleTabChange() {
      if (this.activeTab === 'tasks') {
        this.loadTasks()
      }
    },
    levelTag(level) {
      const map = { VIP: 'danger', A: 'warning', B: 'info', C: 'success' }
      return map[level] || 'info'
    },
    processText(type) {
      const map = { COATING: '涂布', REWINDING: '复卷', SLITTING: '分切' }
      return map[type] || type
    },
    processTag(type) {
      const map = { COATING: 'success', REWINDING: 'warning', SLITTING: 'info' }
      return map[type] || 'info'
    },
    statusText(status) {
      const map = { SCHEDULED: '已排程', UNSCHEDULED: '未排程', IN_PROGRESS: '执行中', COMPLETED: '已完成', CANCELLED: '已取消' }
      return map[status] || status
    },
    statusTag(status) {
      const map = { SCHEDULED: 'success', UNSCHEDULED: 'info', IN_PROGRESS: 'warning', COMPLETED: 'success', CANCELLED: 'danger' }
      return map[status] || 'info'
    },
    formatDateTime(val) {
      if (!val) return '-'
      const d = new Date(val)
      if (Number.isNaN(d.getTime())) return val
      const pad = n => (n < 10 ? '0' + n : n)
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
    },
    openBatchDetail(row) {
      if (!row || !row.batchId) {
        this.$message.warning('未找到排程单信息')
        return
      }
      this.batchDetailVisible = true
      this.batchDetailLoading = true
      this.batchDetail = {}
      this.batchDetailOrders = []
      getScheduleBatchDetail(row.batchId)
        .then(res => {
          const data = res.data || {}
          this.batchDetail = data.batch || {}
          this.batchDetailOrders = data.orders || []
        })
        .finally(() => {
          this.batchDetailLoading = false
        })
    },
    printTasks() {
      if (!this.taskList || this.taskList.length === 0) {
        this.$message.warning('当前没有可打印的工单')
        return
      }
      const rowsHtml = this.taskList.map((row, index) => {
        const equipmentLabel = (row.equipmentCode || '') + (row.equipmentName ? '-' + row.equipmentName : '')
        const canShip = row.canShipBy48h ? '是' : '否'
        return `
          <tr>
            <td>${index + 1}</td>
            <td>${row.orderNo || ''}</td>
            <td>${row.materialCode || ''}</td>
            <td>${this.processText(row.processType) || ''}</td>
            <td style="text-align:right;">${row.priorityScore ?? ''}</td>
            <td style="text-align:right;">${row.quantity ?? ''}</td>
            <td style="text-align:right;">${row.area ?? ''}</td>
            <td>${equipmentLabel || ''}</td>
            <td>${this.formatDateTime(row.planStartTime)}</td>
            <td>${this.formatDateTime(row.planEndTime)}</td>
            <td>${this.statusText(row.status) || ''}</td>
            <td>${canShip}</td>
          </tr>
        `
      }).join('')

      const now = this.formatDateTime(new Date())
      const title = '排程工单'
      const html = `
        <!doctype html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>${title}</title>
            <style>
              body { font-family: "Microsoft YaHei", Arial, sans-serif; padding: 16px; }
              h2 { margin: 0 0 8px; }
              .meta { margin-bottom: 12px; color: #666; font-size: 12px; }
              table { width: 100%; border-collapse: collapse; }
              th, td { border: 1px solid #999; padding: 6px 8px; font-size: 12px; }
              th { background: #f5f5f5; }
            </style>
          </head>
          <body>
            <h2>${title}</h2>
            <div class="meta">打印时间：${now}</div>
            <table>
              <thead>
                <tr>
                  <th>序号</th>
                  <th>订单号</th>
                  <th>料号</th>
                  <th>工序</th>
                  <th>优先级</th>
                  <th>数量</th>
                  <th>面积(㎡)</th>
                  <th>机台</th>
                  <th>开始时间</th>
                  <th>结束时间</th>
                  <th>状态</th>
                  <th>48h</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>
          </body>
        </html>
      `

      let iframe = document.getElementById('print-iframe')
      if (!iframe) {
        iframe = document.createElement('iframe')
        iframe.id = 'print-iframe'
        iframe.style.position = 'fixed'
        iframe.style.right = '0'
        iframe.style.bottom = '0'
        iframe.style.width = '0'
        iframe.style.height = '0'
        iframe.style.border = '0'
        document.body.appendChild(iframe)
      }

      if (!iframe.contentWindow) {
        this.$message.error('打印失败：无法打开打印窗口')
        return
      }

      const doc = iframe.contentWindow.document
      doc.open()
      doc.write(html)
      doc.close()

      setTimeout(() => {
        try {
          iframe.contentWindow.focus()
          iframe.contentWindow.print()
        } catch (e) {
          this.$message.error('打印失败，请检查浏览器设置')
        }
      }, 100)
    },
    resetPending() {
      this.pendingParams = { pageNum: 1, pageSize: 20, customerLevel: '', materialCode: '' }
      this.loadPending()
    },
    async loadPending() {
      this.pendingLoading = true
      getPendingOrderItems(this.pendingParams)
        .then(async res => {
          const data = res.data || {}
          const rawRows = (data.list || []).map(r => ({
            ...r,
            schedule_qty: typeof r.schedule_qty === 'number' ? r.schedule_qty : Number(r.pending_qty || 0),
            _pending_remain: Number(r.pending_qty || 0),
            priorityScore: r.priorityScore != null ? Number(r.priorityScore) : (r.priority_score != null ? Number(r.priority_score) : 0)
          }))
          this.pendingList = await this.enrichMaterialNamesFromSpec(rawRows)
          this.pendingTotal = Number(data.total || 0)
        })
        .finally(() => {
          this.pendingLoading = false
        })
    },
    handlePendingPageChange(p) {
      this.pendingParams.pageNum = p
      this.loadPending()
    },
    handlePendingSizeChange(s) {
      this.pendingParams.pageSize = s
      this.pendingParams.pageNum = 1
      this.loadPending()
    },
    handleSelectionChange(rows) {
      this.selectedRows = rows || []
    },
    updateSelectedArea(row) {
      if (!row) return
      const max = Number(row.pending_qty || 0)
      if (row.schedule_qty > max) row.schedule_qty = max
      if (row.schedule_qty < 0) row.schedule_qty = 0
      row._pending_remain = Math.max(0, max - Number(row.schedule_qty || 0))
    },
    calcRowArea(row, qty) {
      const width = Number(row.width || 0)
      const length = Number(row.length || 0)
      if (!width || !length || !qty) return 0
      return (width / 1000) * length * qty
    },
    calcPriority(row) {
      if (row.priority_score != null) return Number(row.priority_score)
      const map = { VIP: 100, A: 80, B: 60, C: 40 }
      return map[row.customer_level] || 20
    },
    async planSelected() {
      if (this.planLoading) return
      const items = this.selectedRows
        .filter(r => Number(r.schedule_qty || 0) > 0)
        .map(r => ({
          orderItemId: r.order_item_id,
          quantity: Number(r.schedule_qty || 0),
          area: this.calcRowArea(r, Number(r.schedule_qty || 0)),
          priorityScore: this.calcPriority(r)
        }))
      if (!items.length) {
        this.$message.info('请选择需要排程的数量')
        return
      }
      this.planLoading = true
      try {
        await planScheduleTasks({
          items,
          gapMinutes: this.gapMinutes,
          lockStock: this.lockStock ? 1 : 0
        })
        this.$message.success('排程已写入')
        this.loadPending()
        this.loadTasks()
        this.activeTab = 'tasks'
      } catch (e) {
        this.$message.error('排程失败')
      } finally {
        this.planLoading = false
      }
    },
    async updateStatus(row, status) {
      if (!row || !row.id) return
      try {
        await updateScheduleTaskStatus(row.id, status)
        this.$message.success('状态已更新')
        this.loadTasks()
      } catch (e) {
        this.$message.error('更新失败')
      }
    },
    async openLockDialog(row) {
      const orderItemId = row ? (row.orderItemId || row.order_item_id) : null
      if (!row || !orderItemId) {
        this.$message.info('缺少订单明细ID，无法查询锁定库存')
        return
      }
      const target = {
        ...row,
        orderItemId,
        orderNo: row.orderNo || row.order_no,
        materialCode: row.materialCode || row.material_code,
        processType: row.processType || row.process_type
      }
      this.showLockDialog(target)
    },
    openLockDialogFromPending(row) {
      const orderItemId = row ? (row.order_item_id || row.orderItemId) : null
      if (!row || !orderItemId) {
        this.$message.info('缺少订单明细ID，无法查询锁定库存')
        return
      }
      const quantity = Number(row.schedule_qty || 0)
      const area = this.calcRowArea(row, quantity)
      if (quantity <= 0) {
        this.$message.info('请选择排程数量')
        return
      }
      const target = {
        ...row,
        orderItemId,
        orderNo: row.order_no,
        materialCode: row.material_code,
        processType: 'COATING',
        quantity,
        area,
        fromPending: true
      }
      this.showLockDialog(target)
    },
    async showLockDialog(target) {
      this.lockTarget = target
      this.lockDialogVisible = true
      this.lockLoading = true
      this.allMaterials = []
      this.availableMaterials = []
      this.selectedMaterials = []
      try {
        const res = await getAvailableMaterials({
          materialCode: this.lockTarget.materialCode,
          orderItemId: this.lockTarget.orderItemId,
          requiredRolls: Number(this.lockTarget.quantity || 0),
          requiredArea: Number(this.lockTarget.area || 0),
          limit: 200
        })
        this.allMaterials = res.data || []
        this.availableMaterials = this.pickFifoMaterials(this.allMaterials)
        if (this.lockTarget.fromPending && this.availableMaterials.length === 0) {
          await this.autoPlanWithoutStock()
          return
        }
        this.$nextTick(() => {
          this.autoAllocateLocks()
        })
      } catch (e) {
        this.$message.error('获取库存失败')
        this.allMaterials = []
        this.availableMaterials = []
      } finally {
        this.lockLoading = false
      }
    },
    async autoPlanWithoutStock() {
      this.lockDialogVisible = false
      this.lockLoading = false
      try {
        await planScheduleTasks({
          items: [
            {
              orderItemId: this.lockTarget.orderItemId,
              quantity: Number(this.lockTarget.quantity || 0),
              area: Number(this.lockTarget.area || 0),
              priorityScore: this.calcPriority(this.lockTarget)
            }
          ],
          gapMinutes: this.gapMinutes,
          lockStock: 0
        })
        await updateScheduleTaskStatusByOrderItem(this.lockTarget.orderItemId, 'SCHEDULED')
        this.loadPending()
        this.loadTasks()
        this.activeTab = 'tasks'
        this.$message.info('无可锁定库存，已转入涂布排程')
      } catch (e) {
        this.$message.error('转入涂布排程失败')
      }
    },
    pickFifoMaterials(list) {
      const perRollArea = this.calcPerRollArea(this.lockTarget)
      let remainingQty = Number(this.lockTarget.quantity || 0)
      let remainingArea = Number(this.lockTarget.area || 0)
      const sorted = [...(list || [])].sort((a, b) => Number(a.fifoOrder || 0) - Number(b.fifoOrder || 0))
      const picked = []
      for (const item of sorted) {
        if (remainingQty <= 0 && remainingArea <= 0) break
        const availableRolls = Number(item.availableRolls || 0)
        const availableArea = Number(item.availableArea || 0)
        if (availableRolls <= 0 || availableArea <= 0) continue

        let useQty = 0
        let useArea = 0
        if (remainingQty > 0) {
          useQty = Math.min(availableRolls, remainingQty)
          if (perRollArea > 0) {
            useArea = Math.min(availableArea, useQty * perRollArea)
          }
        }
        if (remainingArea > 0 && useArea === 0) {
          useArea = Math.min(availableArea, remainingArea)
        }
        if (useQty <= 0 && useArea <= 0) continue

        picked.push(item)
        if (remainingQty > 0) remainingQty -= useQty
        if (remainingArea > 0) remainingArea -= useArea
      }
      return picked
    },
    autoAllocateLocks() {
      const table = this.$refs.materialTable
      if (!table || !this.availableMaterials.length) return

      const perRollArea = this.calcPerRollArea(this.lockTarget)
      let remainingQty = Number(this.lockTarget.quantity || 0)
      let remainingArea = Number(this.lockTarget.area || 0)

      const sorted = [...this.availableMaterials].sort((a, b) => Number(a.fifoOrder || 0) - Number(b.fifoOrder || 0))

      const selected = []
      for (const item of sorted) {
        if (remainingQty <= 0 && remainingArea <= 0) break
        const availableRolls = Number(item.availableRolls || 0)
        const availableArea = Number(item.availableArea || 0)
        let useQty = 0
        let useArea = 0

        if (remainingQty > 0 && availableRolls > 0) {
          useQty = Math.min(availableRolls, remainingQty)
          if (perRollArea > 0) {
            useArea = Math.min(availableArea, useQty * perRollArea)
          }
        }
        if (remainingArea > 0 && useArea === 0) {
          useArea = Math.min(availableArea, remainingArea)
        }

        if (useQty <= 0 && useArea <= 0) continue

        item._lockQty = useQty > 0 ? useQty : 0
        item._lockArea = useArea > 0 ? useArea : 0
        selected.push(item)

        if (remainingQty > 0) remainingQty -= useQty
        if (remainingArea > 0) remainingArea -= useArea
      }

      this.selectedMaterials = selected
      table.clearSelection()
      selected.forEach(row => table.toggleRowSelection(row, true))
    },
    autoAllocateLocksFromAll() {
      this.availableMaterials = this.pickFifoMaterials(this.allMaterials)
      this.$nextTick(() => {
        this.autoAllocateLocks()
      })
    },
    handleMaterialSelection(rows) {
      this.selectedMaterials = rows || []
    },
    calcPerRollArea(task) {
      const widthMm = Number(task.width_mm || task.widthMm || 0)
      const lengthM = Number(task.length || task.length_m || task.lengthM || 0)
      if (!widthMm || !lengthM) return 0
      return (widthMm / 1000) * lengthM
    },
    async confirmLockMaterials() {
      if (!this.lockTarget || !this.lockTarget.orderItemId) {
        this.$message.info('缺少订单明细ID')
        return
      }
      if (!this.selectedMaterials.length) {
        this.$message.info('请选择要锁定的库存')
        return
      }
      if (this.lockSubmitLoading) return

      const locks = []
      for (const item of this.selectedMaterials) {
        const useQty = Number(item._lockQty || 0)
        const useArea = Number(item._lockArea || 0)
        if (useQty <= 0 && useArea <= 0) continue
        locks.push({
          tapeStockId: item.tapeStockId,
          lockQty: useQty > 0 ? useQty : null,
          lockArea: useArea > 0 ? useArea : null,
          fifoOrder: item.fifoOrder,
          stockTableName: item.stockTableName
        })
      }

      if (!locks.length) {
        this.$message.info('可锁定库存不足')
        return
      }

      this.lockSubmitLoading = true
      try {
        await lockMaterials({
          orderId: this.lockTarget.orderId || this.lockTarget.order_id,
          orderItemId: this.lockTarget.orderItemId,
          materialCode: this.lockTarget.materialCode,
          locks
        })
        this.$message.success('锁定成功')
        this.lockDialogVisible = false
        if (this.lockTarget.fromPending) {
          await planScheduleTasks({
            items: [
              {
                orderItemId: this.lockTarget.orderItemId,
                quantity: Number(this.lockTarget.quantity || 0),
                area: Number(this.lockTarget.area || 0),
                priorityScore: this.calcPriority(this.lockTarget)
              }
            ],
            gapMinutes: this.gapMinutes,
            lockStock: 1
          })
          await updateScheduleTaskStatusByOrderItem(this.lockTarget.orderItemId, 'SCHEDULED')
          this.loadPending()
          this.loadTasks()
          this.activeTab = 'tasks'
        }
      } catch (e) {
        this.$message.error('锁定失败')
      } finally {
        this.lockSubmitLoading = false
      }
    },
    async openPlanDialog(row) {
      if (!row || !row.id) return
      this.planForm = {
        taskId: row.id,
        equipmentId: row.equipmentId || null,
        startTime: row.planStartTime || ''
      }
      this.planDialogVisible = true
      this.planEquipments = []
      try {
        const res = await getScheduleEquipments(row.processType)
        this.planEquipments = res.data || []
      } catch (e) {
        this.$message.error('获取机台失败')
      }
    },
    async submitPlan() {
      if (!this.planForm.taskId || !this.planForm.equipmentId) {
        this.$message.info('请选择机台')
        return
      }
      if (this.planSubmitLoading) return
      this.planSubmitLoading = true
      try {
        await updateScheduleTaskPlan(this.planForm.taskId, {
          equipmentId: this.planForm.equipmentId,
          startTime: this.planForm.startTime
        })
        this.$message.success('排程已更新')
        this.planDialogVisible = false
        this.loadTasks()
      } catch (e) {
        this.$message.error('排程更新失败')
      } finally {
        this.planSubmitLoading = false
      }
    },
    async updatePlan(row) {
      if (!row) return

      // 涂布计划来源任务：直接回写 schedule_plan
      if (row.sourceType === 'PLAN') {
        if (!row.planId || !row.orderItemId) return
        try {
          await upsertPlan({
            id: row.planId,
            orderDetailId: row.orderItemId,
            orderNo: row.orderNo,
            materialCode: row.materialCode,
            materialName: row.materialName,
            stage: 'COATING',
            planDate: row.planStartTime,
            equipment: row.equipmentId != null ? String(row.equipmentId) : '',
            planArea: row.area,
            planRolls: row.quantity,
            status: 'CONFIRMED'
          })
        } catch (e) {
          this.$message.error('涂布计划更新失败')
        }
        return
      }

      if (!row.id) return
      if (!row.equipmentId) return
      try {
        const res = await updateScheduleTaskPlan(row.id, {
          equipmentId: row.equipmentId,
          startTime: row.planStartTime
        })
        const updated = res.data
        if (updated) {
          row.planStartTime = updated.planStartTime
          row.planEndTime = updated.planEndTime
          row.planDurationMin = updated.planDurationMin
          row.status = updated.status || row.status
          row.canShipBy48h = updated.canShipBy48h
        }
      } catch (e) {
        this.$message.error('排程更新失败')
      }
    },
    resetTasks() {
      this.taskQuery = { pageNum: 1, pageSize: 20, processType: 'COATING', status: '', orderNo: '' }
      this.loadTasks()
    },
    loadTasks() {
      this.taskLoading = true
      const query = { ...this.taskQuery }

      // 涂布任务改为按涂布计划拉取，按计划时间升序展示
      const request = query.processType === 'COATING'
        ? getCoatingPlanTaskPage(query)
        : getScheduleTaskPage(query)

      request
        .then(res => {
          const data = res.data || {}
          this.taskList = data.list || []
          this.taskTotal = Number(data.total || 0)
          const types = Array.from(new Set(this.taskList.map(item => item.processType).filter(Boolean)))
          types.forEach(type => {
            if (!this.equipmentOptions[type]) {
              this.fetchEquipments(type)
            }
          })
        })
        .finally(() => {
          this.taskLoading = false
        })
    },
    async fetchEquipments(processType) {
      try {
        const res = await getScheduleEquipments(processType)
        this.$set(this.equipmentOptions, processType, res.data || [])
      } catch (e) {
        this.$set(this.equipmentOptions, processType, [])
      }
    },
    handleTaskPageChange(p) {
      this.taskQuery.pageNum = p
      this.loadTasks()
    }
  }
}
</script>

<style scoped>
.board-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}
.summary {
  font-weight: 600;
  color: #409eff;
}
</style>
