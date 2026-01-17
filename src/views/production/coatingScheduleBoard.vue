<template>
  <div class="app-container">
    <!-- 页面标题 -->
    <el-card shadow="never" style="margin-bottom: 15px">
      <div slot="header" class="clearfix">
        <span style="font-weight: bold; font-size: 16px">动态涂布排程看板</span>
        <div style="float: right">
          <el-date-picker
            v-model="planDate"
            type="date"
            placeholder="选择日期"
            format="yyyy-MM-dd"
            value-format="yyyy-MM-dd"
            size="small"
            style="width: 150px; margin-right: 10px"
            @change="loadTimeline"
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
      <el-col :span="16">
        <el-card shadow="never" style="margin-bottom: 15px">
          <div slot="header" class="clearfix">
            <span style="font-weight: bold">涂布任务队列</span>
          </div>

          <el-table
            v-loading="loading"
            :data="queueList"
            border
            stripe
            :row-class-name="tableRowClassName"
          >
            <el-table-column type="index" label="队列顺序" width="90" align="center" />
            <el-table-column prop="taskNo" label="任务编号" width="140" />
            <el-table-column prop="materialCode" label="料号" width="120" />
            <el-table-column prop="materialName" label="料号名称" min-width="150" show-overflow-tooltip />
            <el-table-column prop="coatingQuantity" label="涂布量" width="100" align="right" />
            <el-table-column prop="mergedOrderCount" label="合并订单数" width="110" align="center">
              <template slot-scope="{ row }">
                <el-tag v-if="row.mergedOrderCount > 1" type="warning" size="small">
                  {{ row.mergedOrderCount }}个
                </el-tag>
                <span v-else>1</span>
              </template>
            </el-table-column>
            <el-table-column label="计划时间" width="280">
              <template slot-scope="{ row }">
                <div style="font-size: 12px">
                  <div>开始：{{ row.planStartTime }}</div>
                  <div style="color: #909399">结束：{{ row.planEndTime }}</div>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="taskStatus" label="状态" width="100" align="center">
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
              </template>
            </el-table-column>
          </el-table>
        </el-card>

        <!-- 涂布时间轴 -->
        <el-card shadow="never">
          <div slot="header" class="clearfix">
            <span style="font-weight: bold">涂布时间轴</span>
            <span style="float: right; color: #909399; font-size: 13px">
              {{ planDate || '今日' }} 涂布计划
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

      <!-- 涂布原材料锁定 -->
      <el-col :span="8">
        <el-card shadow="never">
          <div slot="header" class="clearfix">
            <span style="font-weight: bold">原材料锁定情况</span>
          </div>

          <div v-if="materialLocks.length === 0" style="text-align: center; padding: 50px 0; color: #909399">
            <i class="el-icon-box" style="font-size: 48px" />
            <div style="margin-top: 15px">暂无原材料锁定记录</div>
          </div>

          <div v-else>
            <el-card
              v-for="lock in materialLocks"
              :key="lock.id"
              shadow="hover"
              style="margin-bottom: 10px"
              :body-style="{ padding: '15px' }"
            >
              <div style="margin-bottom: 10px">
                <el-tag type="primary" size="small">{{ lock.materialType }}</el-tag>
                <span style="margin-left: 10px; font-weight: bold">{{ lock.materialName }}</span>
              </div>
              <div style="font-size: 13px; color: #606266">
                <div>二维码：{{ lock.materialQrCode }}</div>
                <div style="margin-top: 5px">锁定数量：{{ lock.lockedQuantity }}</div>
                <div style="margin-top: 5px">
                  涂布任务：<el-tag type="info" size="mini">{{ lock.coatingTaskNo }}</el-tag>
                </div>
                <div style="margin-top: 5px; color: #909399">
                  锁定时间：{{ lock.lockTime }}
                </div>
              </div>
            </el-card>
          </div>
        </el-card>

        <!-- 涂布合并记录 -->
        <el-card shadow="never" style="margin-top: 15px">
          <div slot="header" class="clearfix">
            <span style="font-weight: bold">涂布合并记录</span>
          </div>

          <el-table :data="mergeRecords" border stripe size="small">
            <el-table-column prop="taskNo" label="任务编号" width="130" />
            <el-table-column prop="materialCode" label="料号" width="100" />
            <el-table-column prop="mergedOrderCount" label="合并订单数" width="100" align="center">
              <template slot-scope="{ row }">
                <el-tag type="warning" size="mini">{{ row.mergedOrderCount }}个</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="80" align="center">
              <template slot-scope="{ row }">
                <el-button type="text" size="small" @click="handleViewMerge(row)">
                  详情
                </el-button>
              </template>
            </el-table-column>
          </el-table>
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
      <el-descriptions :column="2" border v-if="taskDetail">
        <el-descriptions-item label="任务编号" :span="2">{{ taskDetail.taskNo }}</el-descriptions-item>
        <el-descriptions-item label="料号">{{ taskDetail.materialCode }}</el-descriptions-item>
        <el-descriptions-item label="料号名称">{{ taskDetail.materialName }}</el-descriptions-item>
        <el-descriptions-item label="涂布量">{{ taskDetail.coatingQuantity }}</el-descriptions-item>
        <el-descriptions-item label="合并订单数">{{ taskDetail.mergedOrderCount }}个</el-descriptions-item>
        <el-descriptions-item label="计划开始时间">{{ taskDetail.planStartTime }}</el-descriptions-item>
        <el-descriptions-item label="计划结束时间">{{ taskDetail.planEndTime }}</el-descriptions-item>
        <el-descriptions-item label="预计耗时">{{ taskDetail.estimatedDuration }}小时</el-descriptions-item>
        <el-descriptions-item label="任务状态">
          <el-tag :type="getTaskStatusType(taskDetail.taskStatus)" size="small">
            {{ getTaskStatusText(taskDetail.taskStatus) }}
          </el-tag>
        </el-descriptions-item>
      </el-descriptions>

      <el-divider content-position="left">关联订单</el-divider>
      <el-table :data="taskDetail.relatedOrders" border stripe size="small">
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
        <el-form-item label="预计耗时(小时)">
          <el-input-number
            v-model="timeForm.estimatedDuration"
            :min="0.1"
            :step="0.5"
            :precision="1"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>

      <div slot="footer">
        <el-button @click="adjustTimeVisible = false">取消</el-button>
        <el-button type="primary" @click="handleConfirmAdjust">确定</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import {
  getCoatingQueue,
  getCoatingTimeline,
  getCoatingMergeRecords,
  adjustCoatingTaskTime,
  getCoatingStats
} from '@/api/coatingSchedule'
import { getCoatingMaterialLocks } from '@/api/materialLock'

export default {
  name: 'CoatingScheduleBoard',
  data() {
    return {
      loading: false,
      planDate: '',
      queueList: [],
      timeline: [],
      materialLocks: [],
      mergeRecords: [],
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
        planStartTime: '',
        estimatedDuration: 0
      }
    }
  },
  created() {
    // 默认加载今天的数据
    const today = new Date()
    this.planDate = today.toISOString().split('T')[0]
    this.loadData()
  },
  methods: {
    async loadData() {
      await Promise.all([
        this.loadQueue(),
        this.loadTimeline(),
        this.loadMaterialLocks(),
        this.loadMergeRecords(),
        this.loadStats()
      ])
    },
    async loadQueue() {
      this.loading = true
      try {
        const res = await getCoatingQueue({ planDate: this.planDate })
        this.queueList = res.data || []
      } catch (error) {
        this.$message.error('加载队列失败：' + error.message)
      } finally {
        this.loading = false
      }
    },
    async loadTimeline() {
      try {
        const res = await getCoatingTimeline(this.planDate)
        this.timeline = res.data || []
      } catch (error) {
        console.error('加载时间轴失败：', error)
      }
    },
    async loadMaterialLocks() {
      try {
        const res = await getCoatingMaterialLocks({ planDate: this.planDate })
        this.materialLocks = res.data || []
      } catch (error) {
        console.error('加载原材料锁定失败：', error)
      }
    },
    async loadMergeRecords() {
      try {
        const res = await getCoatingMergeRecords({ planDate: this.planDate })
        this.mergeRecords = res.data || []
      } catch (error) {
        console.error('加载合并记录失败：', error)
      }
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
        planStartTime: row.planStartTime,
        estimatedDuration: row.estimatedDuration || 0
      }
      this.adjustTimeVisible = true
    },
    async handleConfirmAdjust() {
      try {
        await adjustCoatingTaskTime(this.timeForm.taskId, {
          planStartTime: this.timeForm.planStartTime,
          estimatedDuration: this.timeForm.estimatedDuration
        })
        this.$message.success('时间调整成功')
        this.adjustTimeVisible = false
        this.loadData()
      } catch (error) {
        this.$message.error('时间调整失败：' + error.message)
      }
    },
    handleViewMerge(row) {
      this.$message.info('查看合并详情功能开发中...')
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
</style>

<style>
.el-table .warning-row {
  background: #fef0f0 !important;
}
.el-table .progress-row {
  background: #ecf5ff !important;
}
</style>
