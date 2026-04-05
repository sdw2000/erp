<template>
  <div class="app-container">
    <!-- 页面标题 -->
    <el-card shadow="never" style="margin-bottom: 15px">
      <div slot="header" class="clearfix">
        <span style="font-weight: bold; font-size: 16px">排程看板</span>
        <div style="float: right">
          <el-date-picker
            v-model="planDateRange"
            type="daterange"
            unlink-panels
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            format="yyyy-MM-dd"
            value-format="yyyy-MM-dd"
            size="small"
            style="width: 260px; margin-right: 10px"
            @change="handleDateChange"
          />
          <el-button
            type="primary"
            size="small"
            icon="el-icon-refresh"
            @click="loadData"
          >
            刷新
          </el-button>
        </div>
      </div>

      <!-- 统计卡片 -->
      <el-row :gutter="20">
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-icon" style="background: #e6a23c">
              <i class="el-icon-time" />
            </div>
            <div class="stat-info">
              <div class="stat-label">待涂布</div>
              <div class="stat-value">{{ stats.pending || 0 }}</div>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-icon" style="background: #409eff">
              <i class="el-icon-loading" />
            </div>
            <div class="stat-info">
              <div class="stat-label">进行中</div>
              <div class="stat-value">{{ stats.inProgress || 0 }}</div>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-icon" style="background: #67c23a">
              <i class="el-icon-check" />
            </div>
            <div class="stat-info">
              <div class="stat-label">已完成</div>
              <div class="stat-value">{{ stats.completed || 0 }}</div>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-icon" style="background: #f56c6c">
              <i class="el-icon-warning-outline" />
            </div>
            <div class="stat-info">
              <div class="stat-label">超时任务</div>
              <div class="stat-value">{{ stats.overtime || 0 }}</div>
            </div>
          </div>
        </el-col>
      </el-row>
    </el-card>

    <!-- 涂布队列 -->
    <el-row :gutter="15">
      <el-col :span="24">
        <el-card shadow="never" style="margin-bottom: 15px">
          <div slot="header" class="clearfix">
            <span style="font-weight: bold">任务列表</span>
          </div>

          <el-tabs v-model="activeTaskTab" @tab-click="handleTaskTabChange">
            <el-tab-pane label="涂布任务" name="coating" />
            <el-tab-pane label="复卷任务" name="rewinding" />
            <el-tab-pane label="分切任务" name="slitting" />
          </el-tabs>

          <el-table
            v-loading="loading"
            :data="queueList"
            border
            stripe
            :row-class-name="tableRowClassName"
          >
            <template v-if="activeTaskTab === 'coating'">
              <el-table-column type="index" label="队列顺序" width="90" align="center" />
              <el-table-column prop="taskNo" label="任务编号" width="140" sortable />
              <el-table-column prop="materialCode" label="料号" width="120" sortable />
              <el-table-column prop="materialName" label="料号名称" min-width="150" show-overflow-tooltip sortable />
              <el-table-column prop="coatingWidth" label="涂布宽度(mm)" width="120" align="right" sortable>
                <template slot-scope="{ row }">
                  {{ row.coatingWidth || '—' }}
                </template>
              </el-table-column>
              <el-table-column prop="coatingQuantity" label="涂布量" width="100" align="right" sortable />
              <el-table-column prop="mergedOrderCount" label="合并订单数" width="110" align="center" sortable>
                <template slot-scope="{ row }">
                  <el-tag v-if="row.mergedOrderCount > 1" type="warning" size="small">
                    {{ row.mergedOrderCount }}个
                  </el-tag>
                  <span v-else>1</span>
                </template>
              </el-table-column>
              <el-table-column prop="equipmentId" label="涂布机序号" width="130" align="center" sortable>
                <template slot-scope="{ row }">
                  <el-select
                    v-model="row.equipmentId"
                    placeholder="选择设备"
                    size="mini"
                    style="width: 110px"
                    @change="val => handleEquipmentChange(row, val)"
                  >
                    <el-option
                      v-for="opt in equipmentOptions"
                      :key="opt.value"
                      :label="opt.label"
                      :value="opt.value"
                    />
                  </el-select>
                </template>
              </el-table-column>
              <el-table-column prop="coatingSpeed" label="涂布速度(m/min)" width="130" align="right" sortable>
                <template slot-scope="{ row }">
                  {{ row.coatingSpeed || 40 }}
                </template>
              </el-table-column>
              <el-table-column prop="orderDuration" label="订单耗时(小时)" width="140" align="right" sortable>
                <template slot-scope="{ row }">
                  {{ row.orderDuration ? (row.orderDuration / 60).toFixed(1) : '—' }}
                </template>
              </el-table-column>
              <el-table-column prop="planStartTime" label="计划时间" width="280" sortable>
                <template slot-scope="{ row }">
                  <div style="font-size: 12px">
                    <div>
                      开始：
                      <el-link type="primary" :underline="false" @click="handleAdjustTime(row)">
                        {{ formatDateTime(row.planStartTime) }}
                      </el-link>
                    </div>
                    <div style="color: #909399">结束：{{ formatDateTime(row.planEndTime) }}</div>
                  </div>
                </template>
              </el-table-column>
              <el-table-column prop="taskStatus" label="状态" width="100" align="center" sortable>
                <template slot-scope="{ row }">
                  <el-tag :type="getTaskStatusType(row.taskStatus)" size="small">
                    {{ getTaskStatusText(row.taskStatus) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="150" align="center" fixed="right">
                <template slot-scope="{ row }">
                  <el-button type="text" size="small" @click="handleViewTask(row)">
                    详情
                  </el-button>
                  <el-button type="text" size="small" @click="handleAdjustTime(row)">
                    调整时间
                  </el-button>
                  <el-button type="text" size="small" @click="handleAdjustQuantity(row)">
                    调整涂布量
                  </el-button>
                </template>
              </el-table-column>
            </template>

            <template v-else-if="activeTaskTab === 'rewinding'">
              <el-table-column type="index" label="序号" width="80" align="center" />
              <el-table-column prop="taskNo" label="任务单号" width="150" sortable>
                <template slot-scope="{ row }">
                  {{ row.taskNo || '—' }}
                </template>
              </el-table-column>
              <el-table-column prop="materialCode" label="产品料号" width="150" sortable />
              <el-table-column prop="materialName" label="产品名称" min-width="160" show-overflow-tooltip sortable />
              <el-table-column prop="thickness" label="厚度(μm)" width="110" align="right" sortable>
                <template slot-scope="{ row }">{{ row.thickness || '—' }}</template>
              </el-table-column>
              <el-table-column prop="width" label="宽度(mm)" width="110" align="right" sortable>
                <template slot-scope="{ row }">{{ row.width || '—' }}</template>
              </el-table-column>
              <el-table-column prop="length" label="长度(m)" width="110" align="right" sortable>
                <template slot-scope="{ row }">{{ row.length || '—' }}</template>
              </el-table-column>
              <el-table-column prop="equipmentId" label="机台" width="150" align="center">
                <template slot-scope="{ row }">
                  <el-select
                    v-model="row.equipmentId"
                    placeholder="选择机台"
                    size="mini"
                    style="width: 130px"
                    @change="val => onRewindingEquipmentChange(row, val)"
                  >
                    <el-option
                      v-for="opt in rewindingEquipmentOptions"
                      :key="opt.value"
                      :label="opt.label"
                      :value="opt.value"
                    />
                  </el-select>
                </template>
              </el-table-column>
              <el-table-column prop="rewindingQty" label="复卷数量" width="120" align="right" sortable>
                <template slot-scope="{ row }">{{ row.rewindingQty || 0 }}</template>
              </el-table-column>
              <el-table-column prop="planDuration" label="工时(小时)" width="120" align="right" sortable>
                <template slot-scope="{ row }">
                  {{ row.planDuration ? (row.planDuration / 60).toFixed(1) : '0.0' }}
                </template>
              </el-table-column>
              <el-table-column prop="planTime" label="计划时间" min-width="200" sortable>
                <template slot-scope="{ row }">
                  <div>
                    开始：
                    <el-link type="primary" :underline="false" @click="handleAdjustRewindingTime(row)">
                      {{ formatDateTime(row.planStartTime) || '未设置' }}
                    </el-link>
                  </div>
                  <div style="color: #909399">结束：{{ formatDateTime(row.planEndTime) || '未设置' }}</div>
                </template>
              </el-table-column>
              <el-table-column prop="orderNos" label="关联订单号" min-width="220" show-overflow-tooltip>
                <template slot-scope="{ row }">
                  <div style="display: flex; flex-wrap: wrap; gap: 6px">
                    <el-tag v-for="no in (row.orderNos || [])" :key="no" type="info" size="mini">{{ no }}</el-tag>
                  </div>
                </template>
              </el-table-column>
              <el-table-column prop="plannedToday" label="当天排程" width="110" align="center" sortable>
                <template slot-scope="{ row }">
                  <el-tag :type="row.plannedToday ? 'success' : 'info'" size="small">
                    {{ row.plannedToday ? '是' : '否' }}
                  </el-tag>
                </template>
              </el-table-column>
            </template>
          </el-table>

          <div style="text-align: right; margin-top: 10px">
            <el-pagination
              background
              layout="prev, pager, next, sizes, jumper, total"
              :total="queueTotal"
              :page-size="queuePageSize"
              :current-page="queuePageNum"
              :page-sizes="[10, 20, 50, 100]"
              @current-change="handleQueuePageChange"
              @size-change="handleQueueSizeChange"
            />
          </div>
        </el-card>

        <!-- 涂布时间轴，仅在涂布任务下显示 -->
        <el-card v-if="activeTaskTab === 'coating'" shadow="never">
          <div slot="header" class="clearfix">
            <span style="font-weight: bold">涂布时间轴</span>
            <span style="float: right; color: #909399; font-size: 13px">
              {{ planDateDisplay }} 涂布计划
            </span>
          </div>

          <el-timeline>
            <el-timeline-item
              v-for="task in timeline"
              :key="task.taskNo"
              :timestamp="task.planStartTime"
              :type="getTimelineType(task.taskStatus)"
              :color="getTimelineColor(task.taskStatus)"
              placement="top"
            >
              <el-card shadow="hover" class="timeline-card">
                <div style="display: flex; justify-content: space-between; align-items: center">
                  <div>
                    <div style="font-weight: bold; margin-bottom: 5px">
                      <el-tag :type="getTaskStatusType(task.taskStatus)" size="small">
                        {{ getTaskStatusText(task.taskStatus) }}
                      </el-tag>
                      <span style="margin-left: 10px">{{ task.materialCode }}</span>
                    </div>
                    <div style="font-size: 13px; color: #606266">
                      {{ task.materialName }} - 涂布量：{{ task.coatingQuantity }}
                    </div>
                    <div style="font-size: 12px; color: #909399; margin-top: 5px">
                      预计耗时：{{ task.estimatedDuration }}小时
                      | 完成时间：{{ task.planEndTime }}
                    </div>
                    <div v-if="task.mergedOrderCount > 1" style="margin-top: 5px">
                      <el-tag type="warning" size="mini">
                        合并{{ task.mergedOrderCount }}个订单
                      </el-tag>
                    </div>
                  </div>
                  <div>
                    <el-button size="mini" @click="handleViewTask(task)">查看详情</el-button>
                  </div>
                </div>
              </el-card>
            </el-timeline-item>
          </el-timeline>
        </el-card>
      </el-col>
    </el-row>

    <!-- 任务详情对话框 -->
    <el-dialog
      title="涂布任务详情"
      :visible.sync="taskDetailVisible"
      width="900px"
      :close-on-click-modal="false"
    >
      <div v-if="taskDetail" class="detail-grid">
        <div class="detail-item span-2">
          <span class="detail-label">任务编号</span>
          <span class="detail-value">{{ taskDetail.taskNo }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">料号</span>
          <span class="detail-value">{{ taskDetail.materialCode }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">料号名称</span>
          <span class="detail-value">{{ taskDetail.materialName }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">涂布量</span>
          <span class="detail-value">{{ taskDetail.coatingQuantity }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">合并订单数</span>
          <span class="detail-value">{{ taskDetail.mergedOrderCount }}个</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">计划开始时间</span>
          <span class="detail-value">{{ taskDetail.planStartTime }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">计划结束时间</span>
          <span class="detail-value">{{ taskDetail.planEndTime }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">预计耗时</span>
          <span class="detail-value">{{ taskDetail.estimatedDuration }}小时</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">任务状态</span>
          <span class="detail-value">
            <el-tag :type="getTaskStatusType(taskDetail.taskStatus)" size="small">
              {{ getTaskStatusText(taskDetail.taskStatus) }}
            </el-tag>
          </span>
        </div>
      </div>

      <el-divider content-position="left">关联订单</el-divider>
      <el-table :data="taskDetail ? (taskDetail.relatedOrders || []) : []" border stripe size="small">
        <el-table-column type="index" label="序号" width="60" align="center" />
        <el-table-column prop="orderNo" label="订单号" width="140" />
        <el-table-column prop="customerName" label="客户名称" width="150" show-overflow-tooltip />
        <el-table-column prop="shortageQuantity" label="缺口数量" width="100" align="right" />
        <el-table-column prop="customerPriority" label="优先级" width="100" align="center">
          <template slot-scope="{ row }">
            <el-tag :type="getPriorityType(row.customerPriority)" size="small">
              {{ row.customerPriority }}分
            </el-tag>
          </template>
        </el-table-column>
      </el-table>

      <div slot="footer">
        <el-button @click="taskDetailVisible = false">关闭</el-button>
      </div>
    </el-dialog>

    <!-- 调整复卷时间对话框 -->
    <el-dialog
      title="调整复卷时间"
      :visible.sync="rewindingAdjustVisible"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form :model="rewindingTimeForm" label-width="120px">
        <el-form-item label="任务编号">
          <span>{{ rewindingTimeForm.taskNo }}</span>
        </el-form-item>
        <el-form-item label="料号">
          <span>{{ rewindingTimeForm.materialCode }}</span>
        </el-form-item>
        <el-form-item label="计划开始时间">
          <el-date-picker
            v-model="rewindingTimeForm.planStartTime"
            type="datetime"
            placeholder="选择开始时间"
            format="yyyy-MM-dd HH:mm:ss"
            value-format="yyyy-MM-dd HH:mm:ss"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="任务间隔(分钟)">
          <el-input-number v-model="rewindingTimeForm.gapMinutes" :min="0" :max="120" :step="1" />
        </el-form-item>
      </el-form>

      <div slot="footer">
        <el-button @click="rewindingAdjustVisible = false">取消</el-button>
        <el-button type="primary" @click="handleConfirmAdjustRewinding">确定</el-button>
      </div>
    </el-dialog>

    <!-- 调整时间对话框 -->
    <el-dialog
      title="调整涂布时间"
      :visible.sync="adjustTimeVisible"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form :model="timeForm" label-width="120px">
        <el-form-item label="任务编号">
          <span>{{ timeForm.taskNo }}</span>
        </el-form-item>
        <el-form-item label="料号">
          <span>{{ timeForm.materialCode }}</span>
        </el-form-item>
        <el-form-item label="计划开始时间">
          <el-date-picker
            v-model="timeForm.planStartTime"
            type="datetime"
            placeholder="选择开始时间"
            format="yyyy-MM-dd HH:mm:ss"
            value-format="yyyy-MM-dd HH:mm:ss"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>

      <div slot="footer">
        <el-button @click="adjustTimeVisible = false">取消</el-button>
        <el-button type="primary" @click="handleConfirmAdjust">确定</el-button>
      </div>
    </el-dialog>

    <!-- 调整涂布量对话框 -->
    <el-dialog
      title="调整涂布量"
      :visible.sync="adjustQtyVisible"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form :model="qtyForm" label-width="120px">
        <el-form-item label="任务编号">
          <span>{{ qtyForm.taskNo }}</span>
        </el-form-item>
        <el-form-item label="料号">
          <span>{{ qtyForm.materialCode }}</span>
        </el-form-item>
        <el-form-item label="涂布量(㎡)">
          <el-input-number
            v-model="qtyForm.planSqm"
            :min="0.1"
            :step="0.5"
            :precision="2"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>

      <div slot="footer">
        <el-button @click="adjustQtyVisible = false">取消</el-button>
        <el-button type="primary" @click="handleConfirmAdjustQuantity">确定</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import {
  getCoatingQueue,
  getCoatingTimeline,
  adjustCoatingTaskTime,
  getCoatingStats,
  updateCoatingEquipment
} from '@/api/coatingSchedule'
import { getUnscheduledOrdersPage } from '@/api/unscheduledOrders'
import { getRewindingTasks, updateRewindingEquipment, adjustRewindingTaskTime } from '@/api/schedule'
import { getOrderDetailForProduction } from '@/api/sales'
import { getAvailableByType } from '@/api/equipment'

export default {
  name: 'CoatingScheduleBoard',
  data() {
    return {
      loading: false,
      planDateRange: [],
      queueList: [],
      queueTotal: 0,
      queuePageNum: 1,
      queuePageSize: 10,
      activeTaskTab: 'coating',
      // 复卷汇总列表（从待排程池聚合）
      rewindingList: [],
      rewindingEquipmentOptions: [],
      equipmentOptions: [
        { label: '涂布机1', value: 1 },
        { label: '涂布机2', value: 2 },
        { label: '涂布机3', value: 3 }
      ],
      timeline: [],
      stats: {
        pending: 0,
        inProgress: 0,
        completed: 0,
        overtime: 0
      },
      taskDetailVisible: false,
      taskDetail: null,
      adjustTimeVisible: false,
      timeForm: {
        taskNo: '',
        materialCode: '',
        planStartTime: ''
      },
      rewindingAdjustVisible: false,
      rewindingTimeForm: {
        taskId: '',
        taskNo: '',
        materialCode: '',
        planStartTime: '',
        gapMinutes: 10
      },
      adjustQtyVisible: false,
      qtyForm: {
        taskId: '',
        taskNo: '',
        materialCode: '',
        planSqm: 0
      }
    }
  },
  computed: {
    planDateDisplay() {
      const val = this.getPlanDateParam()
      if (!val) return '今日'
      if (val.includes('~')) return val.replace('~', ' 至 ')
      return val
    }
  },
  created() {
    // 默认加载今天的数据
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    this.planDateRange = [todayStr, todayStr]
    this.loadData()
  },
  methods: {
    handleDateChange(val) {
      this.planDateRange = val || []
      this.queuePageNum = 1
      this.loadData()
    },
    async loadData() {
      await Promise.all([
        this.loadQueue(),
        this.loadTimeline(),
        this.loadStats()
      ])
    },
    async loadQueue() {
      this.loading = true
      try {
        // 涂布任务
        if (this.activeTaskTab === 'coating') {
          const res = await getCoatingQueue({ planDate: this.getPlanDateParam(), pageNum: this.queuePageNum, pageSize: this.queuePageSize })
          const data = res.data || {}
          this.queueList = data.list || []
          this.queueTotal = data.total || 0
        } else if (this.activeTaskTab === 'rewinding') {
          await this.loadRewindingEquipmentOptions()
          const planDate = Array.isArray(this.planDateRange) && this.planDateRange.length ? this.planDateRange[0] : ''
          const res = await getRewindingTasks({
            pageNum: this.queuePageNum,
            pageSize: this.queuePageSize,
            planDate,
            status: 'pending'
          })
          const data = res.data || {}
          const records = data.list || data.records || []
          this.queueList = records.map(r => {
            const thicknessCandidates = [
              r.thickness,
              r.productThickness,
              r.materialThickness,
              r.jumboThickness,
              r.coatingThickness
            ]
            let thickness = thicknessCandidates.find(v => v !== undefined && v !== null && v !== '')
            if (!thickness && r.materialName) {
              const m = String(r.materialName).match(/(\d+(?:\.\d+)?)\s*μ/i)
              if (m && m[1]) thickness = Number(m[1])
            }

            return {
              ...r,
              thickness,
              width: r.jumboWidth,
              length: r.slitLength,
              rewindingQty: r.planRolls,
              orderNos: r.orderNos || []
            }
          })
          this.queueTotal = Number(data.total || data.pages || 0)
        } else {
          this.queueList = []
          this.queueTotal = 0
        }
      } catch (error) {
        // 交由Axios拦截器统一提示，避免重复弹窗
        console.error('加载队列失败：', error)
      } finally {
        this.loading = false
      }
    },

    async loadRewindingSummaryFromPool() {
      // 从未排程订单服务中拉取“已入池”订单并进行复卷维度聚合：同料号+同长度
      try {
        const planParam = this.getPlanDateParam()
        const selectedDay = Array.isArray(this.planDateRange) && this.planDateRange.length ? this.planDateRange[0] : ''
        const res = await getUnscheduledOrdersPage({ pageNum: 1, pageSize: 200, statusBadge: 'inPool' })
        const rows = (res.data && (res.data.records || res.data.list)) ? (res.data.records || res.data.list) : []

        const groups = {}
        for (const row of rows) {
          const orderNo = row.orderNo
          const materialCode = row.materialCode
          const inPoolQty = Number(row.inPoolQty || row.lockedQty || row.totalQty || 0)
          let thickness = null; let width = null; let length = null; let materialName = row.materialName || ''

          // 获取订单详情以解析该料号的规格（厚度/宽度/长度）
          try {
            const od = await getOrderDetailForProduction(orderNo)
            const items = (od && od.data && od.data.items) ? od.data.items : []
            const match = items.find(i => String(i.materialCode) === String(materialCode))
            if (match) {
              thickness = match.thickness || null
              width = match.width || null
              length = match.length || null
              materialName = match.materialName || materialName
            }
          } catch (e) {
            // 忽略单条失败，继续聚合
          }

          const key = `${materialCode}#${length || 0}`
          if (!groups[key]) {
            groups[key] = {
              materialCode,
              materialName,
              thickness,
              width,
              length,
              rewindingQty: 0,
              orderNos: [],
              plannedToday: false
            }
          }
          groups[key].rewindingQty += inPoolQty
          if (orderNo && !groups[key].orderNos.includes(orderNo)) groups[key].orderNos.push(orderNo)
          // 当天排程标记：使用未排程列表中的计划日期对齐所选日期（如有）
          const rowPlan = row.planDate ? String(row.planDate).substr(0, 10) : ''
          const targetDay = selectedDay || (planParam && planParam.split('~')[0]) || ''
          if (rowPlan && targetDay && rowPlan === targetDay) groups[key].plannedToday = true
        }

        // 输出列表
        this.rewindingList = Object.values(groups).sort((a, b) => {
          if (a.materialCode === b.materialCode) {
            return (Number(a.length || 0) - Number(b.length || 0))
          }
          return String(a.materialCode).localeCompare(String(b.materialCode))
        })
      } catch (err) {
        // 交由Axios拦截器统一提示，避免重复弹窗
        console.error('加载复卷汇总失败：', err)
        this.rewindingList = []
      }
    },

    async loadTimeline() {
      try {
        const res = await getCoatingTimeline(this.getPlanDateParam())
        this.timeline = res.data || []
      } catch (error) {
        console.error('加载时间轴失败：', error)
      }
    },

    getPlanDateParam() {
      if (!this.planDateRange || this.planDateRange.length === 0) return ''
      if (Array.isArray(this.planDateRange) && this.planDateRange.length >= 2) {
        const [start, end] = this.planDateRange
        if (start && end) {
          return `${start}~${end}`
        }
        return start || end || ''
      }
      return this.planDateRange
    },
    async loadStats() {
      try {
        const res = await getCoatingStats()
        this.stats = res.data || {}
      } catch (error) {
        console.error('加载统计数据失败：', error)
      }
    },
    tableRowClassName({ row }) {
      if (row.taskStatus === 'OVERTIME') {
        return 'warning-row'
      }
      if (row.taskStatus === 'IN_PROGRESS') {
        return 'progress-row'
      }
      return ''
    },
    async handleEquipmentChange(row, val) {
      if (!row || !row.id || !val) return
      try {
        await updateCoatingEquipment({ taskId: row.id, equipmentId: val })
        // 更新设备后，将该任务自动追加到所选涂布机时间线的尾部
        await this.appendTaskToEquipmentTail(row.id, val)
        this.$message.success('已更新并追加到该涂布机尾部')
        await this.loadData()
      } catch (error) {
        // 交由Axios拦截器统一提示，避免重复弹窗
        console.error('更新设备失败：', error)
      }
    },
    async appendTaskToEquipmentTail(taskId, equipmentId) {
      try {
        const res = await getCoatingTimeline(this.getPlanDateParam())
        const tasks = (res && res.data) ? res.data : []
        const equipTasks = tasks.filter(t => Number(t.equipmentId) === Number(equipmentId))

        let startAt
        if (equipTasks.length > 0) {
          // 找到该设备的最晚结束时间
          const tailEnd = equipTasks
            .map(t => new Date(t.planEndTime))
            .filter(d => !Number.isNaN(d.getTime()))
            .sort((a, b) => a.getTime() - b.getTime())
            .pop()
          // 结束时间后顺延30分钟作为开始（与后端固定准备间隔保持一致）
          startAt = new Date((tailEnd ? tailEnd.getTime() : Date.now()) + 30 * 60 * 1000)
        } else {
          // 无该设备任务：从选定计划日期的08:00开始
          const plan = this.getPlanDateParam()
          if (plan && plan.includes('~')) {
            const startDay = plan.split('~')[0]
            startAt = new Date(`${startDay} 08:00:00`.replace(/-/g, '/'))
          } else if (plan) {
            startAt = new Date(`${plan} 08:00:00`.replace(/-/g, '/'))
          } else {
            // 未选日期则使用今天08:00
            const d = new Date()
            startAt = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 8, 0, 0)
          }
        }

        // 调用后端仅重算该设备链路，从当前任务开始顺推
        await adjustCoatingTaskTime(taskId, { planStartTime: this.formatDateTimeFull(startAt) })
      } catch (err) {
        // 交由Axios拦截器统一提示，避免重复弹窗
        console.error('追加到涂布机尾部失败：', err)
      }
    },
    getPriorityType(score) {
      if (score >= 25) return 'danger'
      if (score >= 15) return 'warning'
      return 'info'
    },
    getTaskStatusType(status) {
      const statusMap = {
        'PENDING': 'warning',
        'IN_PROGRESS': 'primary',
        'COMPLETED': 'success',
        'OVERTIME': 'danger'
      }
      return statusMap[status] || 'info'
    },
    getTaskStatusText(status) {
      const statusMap = {
        'PENDING': '待涂布',
        'IN_PROGRESS': '进行中',
        'COMPLETED': '已完成',
        'OVERTIME': '超时'
      }
      return statusMap[status] || status
    },
    getTimelineType(status) {
      const typeMap = {
        'PENDING': 'warning',
        'IN_PROGRESS': 'primary',
        'COMPLETED': 'success',
        'OVERTIME': 'danger'
      }
      return typeMap[status] || 'info'
    },
    getTimelineColor(status) {
      const colorMap = {
        'PENDING': '#e6a23c',
        'IN_PROGRESS': '#409eff',
        'COMPLETED': '#67c23a',
        'OVERTIME': '#f56c6c'
      }
      return colorMap[status]
    },
    handleViewTask(row) {
      this.taskDetail = {
        ...row,
        relatedOrders: row.relatedOrders || []
      }
      this.taskDetailVisible = true
    },
    handleAdjustTime(row) {
      this.timeForm = {
        taskId: row.id,
        taskNo: row.taskNo,
        materialCode: row.materialCode,
        planStartTime: this.formatDateTimeFull(row.planStartTime)
      }
      this.adjustTimeVisible = true
    },
    async handleConfirmAdjust() {
      try {
        if (!this.timeForm.taskId) {
          this.$message.error('任务ID缺失，无法调整')
          return
        }
        let planStart = this.timeForm.planStartTime
        if (!planStart) {
          const day = (Array.isArray(this.planDateRange) && this.planDateRange[0]) ||
            (this.getPlanDateParam() && this.getPlanDateParam().split('~')[0]) ||
            new Date().toISOString().slice(0, 10)
          planStart = `${day} 08:00:00`
        }
        await adjustCoatingTaskTime(this.timeForm.taskId, { planStartTime: planStart })
        this.$message.success('时间调整成功')
        this.adjustTimeVisible = false
        await this.loadData()
      } catch (error) {
        const msg = (error && error.response && error.response.data && error.response.data.msg) || error.message || '请稍后重试'
        console.error('时间调整失败：', error)
        this.$message.error(`时间调整失败：${msg}`)
      }
    },
    handleAdjustQuantity(row) {
      this.qtyForm = {
        taskId: row.id,
        taskNo: row.taskNo,
        materialCode: row.materialCode,
        planSqm: Number(row.coatingQuantity || 0)
      }
      this.adjustQtyVisible = true
    },
    handleAdjustRewindingTime(row) {
      if (!row || !row.id) {
        this.$message.error('未找到任务，无法调整')
        return
      }
      this.rewindingTimeForm = {
        taskId: row.id,
        taskNo: row.taskNo,
        materialCode: row.materialCode,
        planStartTime: this.formatDateTimeFull(row.planStartTime),
        gapMinutes: 10
      }
      this.rewindingAdjustVisible = true
    },
    async handleConfirmAdjustRewinding() {
      try {
        let planStart = this.rewindingTimeForm.planStartTime
        if (!planStart) {
          const day = (Array.isArray(this.planDateRange) && this.planDateRange[0]) ||
            (this.getPlanDateParam() && this.getPlanDateParam().split('~')[0]) ||
            new Date().toISOString().slice(0, 10)
          planStart = `${day} 08:00:00`
        }
        const gap = Number.isFinite(Number(this.rewindingTimeForm.gapMinutes))
          ? Number(this.rewindingTimeForm.gapMinutes)
          : 10

        await adjustRewindingTaskTime(this.rewindingTimeForm.taskId, {
          planStartTime: planStart,
          gapMinutes: gap
        })
        this.$message.success('复卷时间已调整')
        this.rewindingAdjustVisible = false
        await this.loadQueue()
      } catch (error) {
        const msg = (error && error.response && error.response.data && error.response.data.msg) || error.message || '请稍后重试'
        console.error('调整复卷时间失败：', error)
        this.$message.error(`调整失败：${msg}`)
      }
    },
    handleQueuePageChange(page) {
      this.queuePageNum = page
      this.loadQueue()
    },
    handleQueueSizeChange(size) {
      this.queuePageSize = size
      this.queuePageNum = 1
      this.loadQueue()
    },
    handleTaskTabChange() {
      this.queuePageNum = 1
      this.queueTotal = 0
      this.queueList = []
      this.loadQueue()
    },
    async loadRewindingEquipmentOptions() {
      if (this.rewindingEquipmentOptions && this.rewindingEquipmentOptions.length) return
      try {
        const res = await getAvailableByType('REWINDING')
        const list = res.data || []
        this.rewindingEquipmentOptions = list.map(item => ({
          label: item.equipmentName || item.equipmentCode || `复卷机${item.id}`,
          value: item.id
        }))
        if (!this.rewindingEquipmentOptions.length) {
          this.rewindingEquipmentOptions = [
            { label: '复卷机1', value: 1 },
            { label: '复卷机2', value: 2 },
            { label: '复卷机3', value: 3 }
          ]
        }
      } catch (err) {
        console.error('加载复卷机台失败：', err)
        if (!this.rewindingEquipmentOptions.length) {
          this.rewindingEquipmentOptions = [
            { label: '复卷机1', value: 1 },
            { label: '复卷机2', value: 2 },
            { label: '复卷机3', value: 3 }
          ]
        }
      }
    },
    async onRewindingEquipmentChange(row, val) {
      if (!row || !row.id || !val) return
      try {
        await updateRewindingEquipment({ taskId: row.id, equipmentId: val })
        this.$message.success('复卷机台已更新并重新排程')
        await this.loadQueue()
      } catch (error) {
        console.error('更新复卷机台失败：', error)
      }
    },
    async handleConfirmAdjustQuantity() {
      try {
        // 动态引入API以避免顶部改动过多
        const { adjustCoatingTaskQuantity } = await import('@/api/coatingSchedule')
        await adjustCoatingTaskQuantity(this.qtyForm.taskId, { planSqm: this.qtyForm.planSqm })
        this.$message.success('涂布量已调整')
        this.adjustQtyVisible = false
        this.loadData()
      } catch (error) {
        // 交由Axios拦截器统一提示，避免重复弹窗
        console.error('涂布量调整失败：', error)
      }
    },
    formatDateTimeFull(val) {
      if (!val) return ''
      const d = val instanceof Date ? val : new Date(val)
      if (Number.isNaN(d.getTime())) return ''
      const pad = (n) => (n < 10 ? `0${n}` : `${n}`)
      const y = d.getFullYear()
      const m = pad(d.getMonth() + 1)
      const day = pad(d.getDate())
      const h = pad(d.getHours())
      const mi = pad(d.getMinutes())
      const s = pad(d.getSeconds())
      return `${y}-${m}-${day} ${h}:${mi}:${s}`
    },

    formatDateTime(val) {
      if (!val) return '—'
      const d = new Date(val)
      if (Number.isNaN(d.getTime())) return val
      const pad = (n) => (n < 10 ? `0${n}` : `${n}`)
      const y = d.getFullYear()
      const m = pad(d.getMonth() + 1)
      const day = pad(d.getDate())
      const h = pad(d.getHours())
      const mi = pad(d.getMinutes())
      return `${y}-${m}-${day} ${h}:${mi}`
    }
  }
}
</script>

<style scoped>
.stat-card {
  display: flex;
  align-items: center;
  padding: 15px;
  background: #fff;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 15px;
}
.stat-icon i {
  font-size: 28px;
  color: #fff;
}
.stat-info {
  flex: 1;
}
.stat-label {
  font-size: 13px;
  color: #909399;
  margin-bottom: 5px;
}
.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
}
.timeline-card {
  margin-bottom: 15px;
}
.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 12px;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  padding: 12px;
  background: #fff;
}
.detail-item {
  display: flex;
  align-items: center;
  border-bottom: 1px dashed #ebeef5;
  padding: 6px 0;
}
.detail-item.span-2 {
  grid-column: span 2;
}
.detail-label {
  width: 120px;
  color: #909399;
  font-size: 13px;
}
.detail-value {
  color: #303133;
  font-size: 13px;
  word-break: break-all;
}
</style>

<style>
.el-table .warning-row {
  background: #fef0f0 !important;
}
.el-table .progress-row {
  background: #ecf5ff !important;
}
</style>
