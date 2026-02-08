<template>
  <div class="app-container">
    <el-tabs v-model="activeTab" type="border-card" @tab-click="onTabChange">
      <!-- Tab 1: 订单排程主页 -->
      <el-tab-pane label="订单排程" name="orders">
        <el-card shadow="never">
          <div slot="header">
            <span>待排程订单列表</span>
            <el-button style="float: right" type="primary" size="small" icon="el-icon-refresh" @click="loadOrders">刷新</el-button>
          </div>

          <el-table
            v-loading="loading"
            :data="orderList"
            border
            stripe
            style="width: 100%"
            max-height="550"
            :row-class-name="tableRowClassName"
          >
            <el-table-column type="selection" width="60" align="center" />
            <el-table-column type="index" label="序号" width="60" align="center" />
            <el-table-column prop="order_no" label="订单编号" width="120" />
            <el-table-column prop="customer_name" label="客户代码" width="100" show-overflow-tooltip />
            <el-table-column prop="order_date" label="订单日期" width="110">
              <template slot-scope="scope">
                {{ scope.row.order_date | formatDate }}
              </template>
            </el-table-column>
            <el-table-column prop="material_name" label="产品名称" min-width="140" show-overflow-tooltip />
            <el-table-column prop="material_code" label="产品编码" width="130" />
            <el-table-column prop="thickness" label="厚度/μ" width="80" align="right" />
            <el-table-column prop="width" label="宽度" width="80" align="right" />
            <el-table-column prop="length" label="长度" width="80" align="right" />
            <el-table-column prop="order_qty" label="生产数量" width="90" align="right" />
            <el-table-column label="生产面积(㎡)" width="120" align="right">
              <template slot-scope="scope">
                {{ scope.row.production_area }}
              </template>
            </el-table-column>
            <el-table-column label="单平方数(㎡)" width="120" align="right">
              <template slot-scope="scope">
                {{ scope.row.single_area }}
              </template>
            </el-table-column>
            <el-table-column label="本次排程数量" width="140" align="center">
              <template slot-scope="scope">
                <el-input-number
                  v-model="scope.row.schedule_qty"
                  :min="0"
                  :max="Number(scope.row.remaining_qty)"
                  size="small"
                  controls-position="right"
                />
              </template>
            </el-table-column>
            <el-table-column prop="coating_date" label="涂布日期" width="120">
              <template slot-scope="scope">
                <el-tag v-if="scope.row.coating_date" type="success">
                  {{ scope.row.coating_date | formatDate }}
                </el-tag>
                <el-date-picker
                  v-else
                  v-model="scope.row.coating_date"
                  type="date"
                  size="small"
                  placeholder="选择日期"
                  format="yyyy-MM-dd"
                  value-format="yyyy-MM-dd"
                />
              </template>
            </el-table-column>
            <el-table-column prop="rewinding_date" label="复卷日期" width="120">
              <template slot-scope="scope">
                <el-tag v-if="scope.row.rewinding_date" type="primary">
                  {{ scope.row.rewinding_date | formatDate }}
                </el-tag>
                <el-date-picker
                  v-else
                  v-model="scope.row.rewinding_date"
                  type="date"
                  size="small"
                  placeholder="选择日期"
                  format="yyyy-MM-dd"
                  value-format="yyyy-MM-dd"
                />
              </template>
            </el-table-column>
            <el-table-column prop="packaging_date" label="包装日期" width="120">
              <template slot-scope="scope">
                <el-tag v-if="scope.row.packaging_date" type="warning">
                  {{ scope.row.packaging_date | formatDate }}
                </el-tag>
                <el-date-picker
                  v-else
                  v-model="scope.row.packaging_date"
                  type="date"
                  size="small"
                  placeholder="选择日期"
                  format="yyyy-MM-dd"
                  value-format="yyyy-MM-dd"
                />
              </template>
            </el-table-column>
            <el-table-column prop="priority_score" label="优先级" width="80" align="right" />
            <el-table-column label="是否完成" width="80" align="center">
              <template slot-scope="scope">
                <el-tag :type="scope.row.is_completed === 'Y' ? 'success' : 'info'">
                  {{ scope.row.is_completed }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="remaining_qty" label="尚欠/卷" width="90" align="right" />
            <el-table-column label="欠平方米/㎡" width="120" align="right">
              <template slot-scope="scope">
                {{ scope.row.owe_area }}
              </template>
            </el-table-column>
            <el-table-column prop="completed_qty" label="已完成数量" width="100" align="right" />
            <el-table-column prop="remark" label="备注" min-width="140" show-overflow-tooltip />
            <el-table-column label="操作" width="300" align="center" fixed="right">
              <template slot-scope="scope">
                <el-button
                  type="primary"
                  size="mini"
                  :disabled="Number(scope.row.remaining_qty) <= 0"
                  @click="handleSelectStock(scope.row)"
                >
                  选库存
                </el-button>
                <el-button
                  type="warning"
                  size="mini"
                  :disabled="Number(scope.row.remaining_qty) <= 0"
                  @click="handleCalculateCoating(scope.row)"
                >
                  计算涂布
                </el-button>
                <el-button
                  type="success"
                  size="mini"
                  @click="handleConfirmSchedule(scope.row)"
                >
                  确认排程
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>

        <!-- 库存选择对话框 -->
        <el-dialog
          title="选择库存（先进先出）"
          :visible.sync="stockDialogVisible"
          width="80%"
          @close="handleStockDialogClose"
        >
          <div v-if="stockMatchResult">
            <el-alert
              :type="stockMatchResult.isSufficient ? 'success' : 'warning'"
              :closable="false"
              show-icon
              style="margin-bottom: 15px"
            >
              <span slot="title">
                需求数量: <strong>{{ stockMatchResult.requiredQty }}</strong> 卷 |
                库存可用: <strong>{{ stockMatchResult.totalAvailable }}</strong> 卷 |
                {{ stockMatchResult.isSufficient ? '✓ 库存充足' : `⚠ 缺口 ${stockMatchResult.shortage} 卷，需要涂布` }}
              </span>
            </el-alert>

            <el-table
              :data="stockMatchResult.stockList"
              border
              @selection-change="handleStockSelection"
            >
              <el-table-column type="selection" width="50" />
              <el-table-column prop="batch_no" label="批次号" width="140" />
              <el-table-column prop="location" label="库位" width="100" />
              <el-table-column prop="prod_date" label="生产日期" width="110" />
              <el-table-column prop="spec_desc" label="规格" width="140" />
              <el-table-column prop="available_rolls" label="可用卷数" width="100" align="right" />
              <el-table-column prop="available_area" label="可用面积(㎡)" width="120" align="right">
                <template slot-scope="scope">
                  {{ parseFloat(scope.row.available_area).toFixed(2) }}
                </template>
              </el-table-column>
              <el-table-column label="分配数量" width="140" align="center">
                <template slot-scope="scope">
                  <el-input-number
                    v-model="scope.row.allocate_qty"
                    :min="0"
                    :max="Number(scope.row.available_rolls)"
                    size="small"
                    controls-position="right"
                  />
                </template>
              </el-table-column>
            </el-table>
          </div>

          <div slot="footer">
            <el-button @click="stockDialogVisible = false">取消</el-button>
            <el-button type="primary" @click="handleConfirmStockAllocation">确认分配并创建复卷排程</el-button>
          </div>
        </el-dialog>

        <!-- 涂布需求计算对话框 -->
        <el-dialog
          title="涂布需求计算"
          :visible.sync="coatingDialogVisible"
          width="60%"
        >
          <div v-if="coatingRequirement">
            <el-descriptions :column="2" border>
              <el-descriptions-item label="料号前缀">
                {{ coatingRequirement.material_prefix }}
              </el-descriptions-item>
              <el-descriptions-item label="厚度">
                {{ coatingRequirement.thickness }} μm
              </el-descriptions-item>
              <el-descriptions-item label="聚合订单总需求">
                {{ coatingRequirement.total_required_qty }} 卷
              </el-descriptions-item>
              <el-descriptions-item label="计算涂布面积">
                <el-tag type="success" size="medium">
                  {{ parseFloat(coatingRequirement.total_required_area).toFixed(2) }} ㎡
                </el-tag>
              </el-descriptions-item>
            </el-descriptions>

            <el-divider />

            <el-form :model="coatingForm" label-width="120px">
              <el-form-item label="涂布面积(㎡)">
                <el-input-number
                  v-model="coatingForm.coatingArea"
                  :min="0"
                  :max="999999"
                  :step="100"
                  controls-position="right"
                />
                <span style="margin-left: 10px; color: #909399">（可手动调整）</span>
              </el-form-item>
              <el-form-item label="备注">
                <el-input
                  v-model="coatingForm.remark"
                  type="textarea"
                  :rows="2"
                  placeholder="输入备注信息"
                />
              </el-form-item>
            </el-form>
          </div>

          <div slot="footer">
            <el-button @click="coatingDialogVisible = false">取消</el-button>
            <el-button type="primary" @click="handleSaveCoatingRequirement">保存到涂布排程</el-button>
          </div>
        </el-dialog>

        <!-- 备注编辑对话框 -->
        <el-dialog
          title="编辑备注"
          :visible.sync="remarkDialogVisible"
          width="600px"
          @close="handleRemarkDialogClose"
        >
          <div v-if="selectedRow">
            <el-descriptions :column="1" border>
              <el-descriptions-item label="订单号">
                {{ selectedRow.order_no }}
              </el-descriptions-item>
              <el-descriptions-item label="产品">
                {{ selectedRow.material_name }} ({{ selectedRow.material_code }})
              </el-descriptions-item>
              <el-descriptions-item label="排程数量">
                {{ selectedRow.schedule_qty }} 卷
              </el-descriptions-item>
            </el-descriptions>

            <el-divider />

            <el-form :model="selectedRow" label-width="80px">
              <el-form-item label="备注">
                <el-input
                  v-model="selectedRow.remark"
                  type="textarea"
                  :rows="4"
                  placeholder="输入备注信息"
                />
              </el-form-item>
            </el-form>
          </div>

          <div slot="footer">
            <el-button @click="remarkDialogVisible = false">取消</el-button>
            <el-button type="primary" @click="handleSaveRemark">保存备注</el-button>
          </div>
        </el-dialog>
      </el-tab-pane>

      <!-- Tab 2: 涂布排程 -->
      <el-tab-pane label="涂布排程" name="coating">
        <el-card shadow="never">
          <div slot="header">
            <span>涂布排程列表</span>
            <el-button style="float: right" type="primary" size="small" icon="el-icon-refresh" @click="loadCoatingSchedules">刷新</el-button>
          </div>

          <el-table
            v-loading="coatingLoading"
            :data="coatingList"
            border
            stripe
          >
            <el-table-column prop="schedule_id" label="排程号" width="120" align="center">
              <template slot-scope="scope">
                {{ scope.row.id }}
              </template>
            </el-table-column>
            <el-table-column prop="order_nos" label="订单号" width="180" show-overflow-tooltip>
              <template slot-scope="scope">
                {{ scope.row.order_nos || scope.row.order_no }}
              </template>
            </el-table-column>
            <el-table-column prop="material_code" label="产品编码" width="140" />
            <el-table-column prop="material_name" label="产品名称" min-width="160" show-overflow-tooltip />
            <el-table-column prop="coating_area" label="涂布面积(㎡)" width="120" align="right">
              <template slot-scope="scope">
                <el-tag type="success">{{ parseFloat(scope.row.coating_area).toFixed(2) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="计划时间" width="180" align="center">
              <template slot-scope="scope">
                <span v-if="scope.row.status === 'COATING_SCHEDULED'">
                  {{ scope.row.coating_schedule_date | formatDate }}
                </span>
                <el-date-picker
                  v-else
                  v-model="scope.row.coating_schedule_date"
                  type="datetime"
                  size="small"
                  placeholder="选择日期时间"
                  format="yyyy-MM-dd HH:mm"
                  value-format="yyyy-MM-dd HH:mm:ss"
                />
              </template>
            </el-table-column>
            <el-table-column label="机台" width="180" align="center">
              <template slot-scope="scope">
                <span v-if="scope.row.status === 'COATING_SCHEDULED'">
                  {{ equipmentName(scope.row.coating_equipment) }}
                </span>
                <el-select v-else v-model="scope.row.coating_equipment" size="small" placeholder="选择机台">
                  <el-option
                    v-for="eq in equipmentList"
                    :key="eq.id"
                    :label="eq.equipmentName"
                    :value="String(eq.id)"
                  />
                </el-select>
              </template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="120" align="center">
              <template slot-scope="scope">
                <el-tag :type="statusType(scope.row.status)">
                  {{ statusText(scope.row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="120" align="center" fixed="right">
              <template slot-scope="scope">
                <el-button
                  type="primary"
                  size="mini"
                  :disabled="scope.row.status === 'COATING_SCHEDULED' || !scope.row.coating_schedule_date || !scope.row.coating_equipment"
                  @click="handleConfirmCoating(scope.row)"
                >
                  确认排程
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>

      <!-- Tab 3: 复卷排程 -->
      <el-tab-pane label="复卷排程" name="rewinding">
        <el-card shadow="never">
          <div slot="header">
            <span>待复卷订单列表（按涂布日期排序）</span>
            <el-button style="float: right" type="primary" size="small" icon="el-icon-refresh" @click="loadRewindingOrders">刷新</el-button>
          </div>

          <el-table
            v-loading="rewindingLoading"
            :data="rewindingList"
            border
            stripe
          >
            <el-table-column type="index" label="序号" width="60" align="center" />
            <el-table-column prop="coating_date" label="涂布日期" width="120">
              <template slot-scope="scope">
                <el-tag type="success">{{ scope.row.coating_date | formatDate }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="order_no" label="订单号" width="120" />
            <el-table-column prop="customer_name" label="客户" width="100" show-overflow-tooltip />
            <el-table-column prop="material_code" label="产品编码" width="130" />
            <el-table-column prop="material_name" label="产品名称" min-width="140" show-overflow-tooltip />
            <el-table-column prop="thickness" label="厚度/μ" width="80" align="right" />
            <el-table-column prop="width" label="宽度" width="80" align="right" />
            <el-table-column prop="length" label="长度" width="80" align="right" />
            <el-table-column prop="coating_area" label="涂布面积(㎡)" width="120" align="right">
              <template slot-scope="scope">
                {{ parseFloat(scope.row.coating_area || 0).toFixed(2) }}
              </template>
            </el-table-column>
            <el-table-column prop="rewinding_scheduled_area" label="已排复卷(㎡)" width="120" align="right">
              <template slot-scope="scope">
                {{ parseFloat(scope.row.rewinding_scheduled_area || 0).toFixed(2) }}
              </template>
            </el-table-column>
            <el-table-column prop="remaining_coating_area" label="待复卷(㎡)" width="120" align="right">
              <template slot-scope="scope">
                <el-tag type="warning">{{ parseFloat(scope.row.remaining_coating_area || 0).toFixed(2) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="equipment_name" label="涂布机台" width="120" />
            <el-table-column label="复卷日期" width="120">
              <template slot-scope="scope">
                <el-date-picker
                  v-model="scope.row.rewinding_date"
                  type="date"
                  size="small"
                  placeholder="选择日期"
                  format="yyyy-MM-dd"
                  value-format="yyyy-MM-dd"
                />
              </template>
            </el-table-column>
            <el-table-column label="操作" width="140" align="center" fixed="right">
              <template slot-scope="scope">
                <el-button
                  type="success"
                  size="mini"
                  @click="handleConfirmRewinding(scope.row)"
                >
                  确认复卷
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script>
import {
  getPendingOrders,
  getCoatingCompletedOrders,
  matchStock,
  calculateCoating,
  createSchedule,
  createRewindingSchedule,
  createCoatingSchedule,
  getCoatingSchedules,
  confirmSchedule
} from '@/api/manualSchedule'
import { getEquipmentList } from '@/api/equipment'

export default {
  name: 'ManualSchedule',
  filters: {
    formatDate(val) {
      if (!val) return '-'
      return val.substring(0, 10)
    }
  },
  data() {
    return {
      activeTab: 'orders',
      loading: false,
      coatingLoading: false,
      rewindingLoading: false,
      orderList: [],
      coatingList: [],
      rewindingList: [],
      equipmentList: [],

      // 库存选择对话框
      stockDialogVisible: false,
      stockMatchResult: null,
      selectedStocks: [],
      currentOrder: null,

      // 涂布计算对话框
      coatingDialogVisible: false,
      coatingRequirement: null,
      coatingForm: {
        coatingArea: 0,
        remark: ''
      },

      // 备注编辑对话框
      remarkDialogVisible: false,
      selectedRow: null
    }
  },
  mounted() {
    this.loadOrders()
    this.loadEquipmentList()
  },
  methods: {
    // 加载待排程订单
    async loadOrders() {
      this.loading = true
      try {
        const res = await getPendingOrders()
        if (res.code === 200 || res.code === 20000) {
          this.orderList = (res.data || []).map(item => {
            const width = Number(item.width || 0)
            const length = Number(item.length || 0)
            const singleArea = width > 0 && length > 0 ? (width / 1000) * length : 0
            const orderQty = Number(item.order_qty || 0)
            const remainingQty = Number(item.remaining_qty || 0)
            const completedQty = Math.max(orderQty - remainingQty, 0)

            return {
              ...item,
              schedule_qty: orderQty,
              coating_date: item.coating_date || '',
              rewinding_date: item.rewinding_date || '',
              packaging_date: item.packaging_date || '',
              remark: item.remark || '',
              single_area: singleArea.toFixed(2),
              production_area: (singleArea * orderQty).toFixed(2),
              owe_area: (singleArea * remainingQty).toFixed(2),
              completed_qty: completedQty,
              is_completed: remainingQty <= 0 ? 'Y' : 'N'
            }
          })
        }
      } catch (error) {
        this.$message.error('加载订单失败')
      } finally {
        this.loading = false
      }
    },

    // 加载设备列表
    async loadEquipmentList() {
      try {
        const res = await getEquipmentList({ equipmentType: 'coating', pageSize: 100 })
        if (res.code === 200 || res.code === 20000) {
          this.equipmentList = res.data.records || res.data || []
        }
      } catch (error) {
        console.error('加载设备列表失败', error)
      }
    },

    // 选择库存
    async handleSelectStock(row) {
      if (!row.schedule_qty || row.schedule_qty <= 0) {
        row.schedule_qty = Number(row.remaining_qty) || 0
      }
      if (row.schedule_qty <= 0) {
        this.$message.warning('请先输入排程数量')
        return
      }

      this.currentOrder = row
      this.loading = true

      try {
        const res = await matchStock({
          materialCode: row.material_code,
          width: row.width,
          thickness: row.thickness,
          requiredQty: row.schedule_qty
        })

        if (res.code === 200 || res.code === 20000) {
          this.stockMatchResult = res.data
          // 初始化分配数量
          this.stockMatchResult.stockList.forEach(stock => {
            this.$set(stock, 'allocate_qty', 0)
          })
          this.stockDialogVisible = true
        }
      } catch (error) {
        this.$message.error('匹配库存失败')
      } finally {
        this.loading = false
      }
    },

    // 库存选择变化
    handleStockSelection(selection) {
      this.selectedStocks = selection
    },

    // 关闭库存对话框
    handleStockDialogClose() {
      this.stockMatchResult = null
      this.selectedStocks = []
      this.currentOrder = null
    },

    // 确认库存分配并创建复卷排程
    async handleConfirmStockAllocation() {
      const allocations = this.stockMatchResult.stockList
        .filter(s => s.allocate_qty > 0)
        .map(s => ({
          stockId: s.stock_id,
          qty: s.allocate_qty
        }))

      if (allocations.length === 0) {
        this.$message.warning('请至少分配一条库存')
        return
      }

      const totalAllocated = allocations.reduce((sum, a) => sum + a.qty, 0)
      if (totalAllocated !== this.currentOrder.schedule_qty) {
        this.$message.warning(`分配总数(${totalAllocated})与排程数量(${this.currentOrder.schedule_qty})不一致`)
        return
      }

      try {
        // 1. 创建手动排程记录
        const scheduleRes = await createSchedule({
          orderNo: this.currentOrder.order_no,
          orderDetailId: this.currentOrder.order_detail_id,
          materialCode: this.currentOrder.material_code,
          materialName: this.currentOrder.material_name,
          width: this.currentOrder.width,
          length: this.currentOrder.length,
          thickness: this.currentOrder.thickness,
          orderQty: this.currentOrder.order_qty,
           scheduleQty: this.currentOrder.schedule_qty,
           coatingDate: this.currentOrder.coating_date,
           rewindingDate: this.currentOrder.rewinding_date,
           packagingDate: this.currentOrder.packaging_date,
          scheduleType: 'STOCK'
        })

        if (scheduleRes.code !== 200 && scheduleRes.code !== 20000) {
          throw new Error('创建排程失败')
        }

        // 2. 创建复卷排程并锁定库存
        const rewindingRes = await createRewindingSchedule({
          scheduleId: scheduleRes.data,
          stockAllocations: allocations
        })

        if (rewindingRes.code === 200 || rewindingRes.code === 20000) {
          this.$message.success('复卷排程创建成功')
          this.stockDialogVisible = false
          this.loadOrders()
        }
      } catch (error) {
        this.$message.error(error.message || '操作失败')
      }
    },

    // 计算涂布需求
    async handleCalculateCoating(row) {
      if (!row.schedule_qty || row.schedule_qty <= 0) {
        row.schedule_qty = Number(row.remaining_qty) || 0
      }
      if (row.schedule_qty <= 0) {
        this.$message.warning('请先输入排程数量')
        return
      }

      this.currentOrder = row
      this.loading = true

      try {
        const res = await calculateCoating({
          orderNo: row.order_no,
          materialCode: row.material_code
        })

        if (res.code === 200 || res.code === 20000) {
          this.coatingRequirement = res.data
          this.coatingForm.coatingArea = parseFloat(res.data.total_required_area || 0)
          this.coatingForm.remark = `订单${row.order_no}涂布需求`
          this.coatingDialogVisible = true
        }
      } catch (error) {
        this.$message.error('计算涂布需求失败')
      } finally {
        this.loading = false
      }
    },

    // 保存涂布需求到排程
    async handleSaveCoatingRequirement() {
      try {
        const totalRequiredQty = Number(this.coatingRequirement?.total_required_qty || 0)
        const scheduleQty = totalRequiredQty > 0 ? totalRequiredQty : Number(this.currentOrder.schedule_qty || 0)
        // 1. 创建手动排程记录
        const scheduleRes = await createSchedule({
          orderNo: this.currentOrder.order_no,
          orderDetailId: this.currentOrder.order_detail_id,
          materialCode: this.currentOrder.material_code,
          materialName: this.currentOrder.material_name,
          width: this.currentOrder.width,
          length: this.currentOrder.length,
          thickness: this.currentOrder.thickness,
          orderQty: this.currentOrder.order_qty,
          scheduleQty: scheduleQty,
           coatingArea: this.coatingForm.coatingArea,
           coatingDate: this.currentOrder.coating_date,
           rewindingDate: this.currentOrder.rewinding_date,
           packagingDate: this.currentOrder.packaging_date,
          scheduleType: 'COATING',
          remark: this.coatingForm.remark
        })

        if (scheduleRes.code === 200 || scheduleRes.code === 20000) {
          this.$message.success('已保存到涂布排程')
          this.coatingDialogVisible = false
          this.loadOrders()
          this.loadCoatingSchedules()
          this.activeTab = 'coating'
        }
      } catch (error) {
        this.$message.error('保存失败')
      }
    },

    // 加载涂布排程列表
    async loadCoatingSchedules() {
      this.coatingLoading = true
      try {
        const res = await getCoatingSchedules()
        if (res.code === 200 || res.code === 20000) {
          this.coatingList = res.data || []
        } else {
          this.coatingList = []
        }
      } catch (error) {
        this.$message.error('加载涂布排程失败')
      } finally {
        this.coatingLoading = false
      }
    },

    // 加载待复卷订单列表
    async loadRewindingOrders() {
      this.rewindingLoading = true
      try {
        const res = await getCoatingCompletedOrders()
        if (res.code === 200 || res.code === 20000) {
          this.rewindingList = res.data || []
        } else {
          this.rewindingList = []
        }
      } catch (error) {
        this.$message.error('加载待复卷订单失败')
      } finally {
        this.rewindingLoading = false
      }
    },

    // 确认涂布排程
    async handleConfirmCoating(row) {
      try {
        const res = await createCoatingSchedule({
          scheduleId: row.id,
          coatingArea: row.coating_area,
          coatingDate: row.coating_schedule_date,
          equipmentId: row.coating_equipment
        })

        if (res.code === 200 || res.code === 20000) {
          this.$message.success('涂布排程确认成功')
          this.loadCoatingSchedules()
          this.loadOrders()
        }
      } catch (error) {
        this.$message.error('确认失败')
      }
    },

    statusType(status) {
      const map = {
        'PENDING': 'info',
        'COATING_SCHEDULED': 'warning',
        'REWINDING_SCHEDULED': 'primary',
        'COMPLETED': 'success'
      }
      return map[status] || 'info'
    },

    statusText(status) {
      const map = {
        'PENDING': '待排程',
        'COATING_SCHEDULED': '涂布已排',
        'REWINDING_SCHEDULED': '复卷已排',
        'COMPLETED': '已完成'
      }
      return map[status] || status
    },

    equipmentName(equipmentId) {
      if (!equipmentId) return '-'
      const equipment = this.equipmentList.find(eq => String(eq.id) === String(equipmentId))
      return equipment ? equipment.equipmentName : equipmentId
    },

    handleTabClick(tab) {
      if (tab && tab.name === 'coating') {
        this.loadCoatingSchedules()
      }
    },

    onTabChange(tab) {
      if (tab.name === 'coating') {
        this.loadCoatingSchedules()
      }
    },

    // 编辑备注
    handleEditRemark(row) {
      this.selectedRow = JSON.parse(JSON.stringify(row))
      this.remarkDialogVisible = true
    },

    // 保存备注
    handleSaveRemark() {
      if (!this.selectedRow.remark) {
        this.$message.warning('请输入备注内容')
        return
      }
      // 更新原始数据
      const index = this.orderList.findIndex(item => item.order_detail_id === this.selectedRow.order_detail_id)
      if (index > -1) {
        this.orderList[index].remark = this.selectedRow.remark
      }
      this.$message.success('备注已保存')
      this.remarkDialogVisible = false
    },

    handleRemarkDialogClose() {
      this.selectedRow = null
    },

    // 确认排程
    handleConfirmSchedule(row) {
      this.$confirm('确认要对该订单进行排程吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        // 调用后端接口确认排程，传递本次排程数量
        confirmSchedule({
          orderNo: row.order_no,
          materialCode: row.material_code,
          scheduleQty: row.schedule_qty
        }).then(res => {
          if (res.code === 200 || res.code === 20000) {
            this.$message.success('排程确认成功')
            // 刷新订单列表
            this.loadOrders()
          } else {
            this.$message.error(res.message || '排程确认失败')
          }
        }).catch(err => {
          this.$message.error('排程确认失败: ' + (err.message || '未知错误'))
        })
      }).catch(() => {
        this.$message.info('已取消')
      })
    },

    // 确认复卷排程
    async handleConfirmRewinding(row) {
      if (!row.rewinding_date) {
        this.$message.warning('请选择复卷日期')
        return
      }

      this.$confirm(`确认将涂布面积 ${parseFloat(row.remaining_coating_area).toFixed(2)}㎡ 排入复卷？`, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'info'
      }).then(async() => {
        try {
          const res = await createRewindingSchedule({
            scheduleId: row.schedule_id,
            rewindingArea: row.remaining_coating_area,
            rewindingDate: row.rewinding_date
          })

          if (res.code === 200 || res.code === 20000) {
            this.$message.success('复卷排程确认成功')
            this.loadRewindingOrders()
          } else {
            this.$message.error(res.message || '排程确认失败')
          }
        } catch (err) {
          this.$message.error('排程确认失败: ' + (err.message || '未知错误'))
        }
      }).catch(() => {
        this.$message.info('已取消')
      })
    },

    // Tab 切换时加载数据
    onTabChange(tab) {
      if (tab.name === 'coating') {
        this.loadCoatingSchedules()
      } else if (tab.name === 'rewinding') {
        this.loadRewindingOrders()
      }
    },

    // 订单表格行样式
    tableRowClassName({ row }) {
      if (Number(row.remaining_qty) <= 0) {
        return 'row-scheduled-complete'
      }
      return ''
    }
  }
}</script>

<style scoped>
.app-container {
  padding: 20px;
}
.mb-10 {
  margin-bottom: 10px;
}
.mt-10 {
  margin-top: 10px;
}
.right {
  text-align: right;
}

/* 已排程完成的订单行样式 */
::v-deep .row-scheduled-complete {
  background-color: #f0f9ff !important;
  color: #909399;
}

::v-deep .row-scheduled-complete:hover > td {
  background-color: #e6f4ff !important;
}
</style>
