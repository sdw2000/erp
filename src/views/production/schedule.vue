<template>
  <div class="app-container">
    <el-tabs v-model="activeTab" @tab-click="handleTabChange">
      <!-- 待排程订单 -->
      <el-tab-pane label="待排程订单" name="pending">
        <el-card shadow="never">
          <div slot="header" class="board-header">
            <span>待排程订单明细</span>
            <el-button
              type="primary"
              size="small"
              :disabled="selectedOrders.length === 0"
              @click="batchSchedule"
            >
              批量排程 ({{ selectedOrders.length }})
            </el-button>
          </div>

          <!-- 筛选 -->
          <el-form :inline="true" style="margin-bottom: 15px">
            <el-form-item label="客户等级">
              <el-select
                v-model="pendingParams.customerLevel"
                placeholder="全部"
                clearable
                style="width: 120px"
                @change="handlePendingSearch"
              >
                <el-option label="VIP" value="VIP" />
                <el-option label="A级" value="A" />
                <el-option label="B级" value="B" />
                <el-option label="C级" value="C" />
              </el-select>
            </el-form-item>
            <el-form-item label="产品料号">
              <el-input
                v-model="pendingParams.materialCode"
                placeholder="料号"
                clearable
                style="width: 150px"
                @keyup.enter.native="loadPendingOrders"
              />
            </el-form-item>
            <el-form-item>
              <el-button
                type="primary"
                icon="el-icon-search"
                @click="handlePendingSearch"
              >查询</el-button>
            </el-form-item>
          </el-form>

          <!-- 待排程订单表格 -->
          <el-table
            v-loading="pendingLoading"
            :data="pendingOrders"
            border
            stripe
            :row-key="row => row.order_item_id"
            @selection-change="handleSelectionChange"
          >
            <el-table-column type="selection" width="50" />
            <el-table-column prop="order_no" label="订单号" width="140" />
            <el-table-column
              prop="customer"
              label="客户"
              width="150"
              show-overflow-tooltip
            />
            <el-table-column
              prop="customer_level"
              label="客户等级"
              width="90"
              align="center"
            >
              <template slot-scope="{ row }">
                <el-tag :type="getLevelType(row.customer_level)" size="small">{{
                  row.customer_level
                }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column
              prop="material_code"
              label="产品料号"
              width="130"
            />
            <el-table-column
              prop="material_name"
              label="产品名称"
              show-overflow-tooltip
            />
            <el-table-column prop="color_code" label="颜色" width="80" />
            <el-table-column label="厚度(μm)" width="90" align="right">
              <template slot-scope="{ row }">{{
                row.thickness ? row.thickness.toFixed(0) : ""
              }}</template>
            </el-table-column>
            <el-table-column
              prop="width"
              label="宽度(mm)"
              width="90"
              align="right"
            />
            <el-table-column label="长度(m)" width="90" align="right">
              <template slot-scope="{ row }">{{
                row.length ? row.length.toFixed(0) : ""
              }}</template>
            </el-table-column>
            <el-table-column
              prop="order_qty"
              label="订单数量"
              width="90"
              align="center"
            />
            <el-table-column
              prop="pending_qty"
              label="待排数量"
              width="100"
              align="center"
            >
              <template slot-scope="{ row }">
                <el-tag
                  :type="row.pending_qty > 0 ? 'warning' : 'success'"
                  size="medium"
                >
                  {{ row.pending_qty }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="本次排程数" width="130" align="center">
              <template slot-scope="{ row }">
                <el-input
                  v-model.number="row.schedule_qty"
                  type="number"
                  size="small"
                  placeholder="0"
                  style="
                    width: 90px;
                    text-align: center;
                    font-weight: bold;
                    font-size: 14px;
                  "
                  @input="validateScheduleQty(row)"
                  @blur="validateScheduleQty(row)"
                />
              </template>
            </el-table-column>
            <el-table-column prop="delivery_date" label="交货日期" width="110">
              <template slot-scope="{ row }">
                <span
                  :style="{
                    color: isOverdue(row.delivery_date) ? '#F56C6C' : '',
                  }"
                >
                  {{ row.delivery_date }}
                </span>
              </template>
            </el-table-column>
          </el-table>

          <!-- 分页 -->
          <el-pagination
            style="margin-top: 15px; text-align: right"
            :current-page="pendingParams.pageNum"
            :page-sizes="[20, 50, 100]"
            :page-size="pendingParams.pageSize"
            :total="Number(pendingTotal)"
            layout="total, sizes, prev, pager, next"
            @size-change="handlePendingSizeChange"
            @current-change="handlePendingPageChange"
          />
        </el-card>
      </el-tab-pane>

      <!-- 计划列表 -->
      <el-tab-pane label="计划管理" name="list">
        <!-- 搜索区域 -->
        <el-card class="search-card" shadow="never">
          <el-form :inline="true" :model="queryParams" class="search-form">
            <el-form-item label="排程单号">
              <el-input
                v-model="queryParams.scheduleNo"
                placeholder="请输入排程单号"
                clearable
                style="width: 160px"
              />
            </el-form-item>
            <el-form-item label="排程日期">
              <el-date-picker
                v-model="queryParams.dateRange"
                type="daterange"
                range-separator="至"
                start-placeholder="开始日期"
                end-placeholder="结束日期"
                value-format="yyyy-MM-dd"
                style="width: 240px"
              />
            </el-form-item>
            <el-form-item label="状态">
              <el-select
                v-model="queryParams.status"
                placeholder="全部状态"
                clearable
                style="width: 120px"
              >
                <el-option label="草稿" value="draft" />
                <el-option label="待审批" value="pending_approval" />
                <el-option label="已确认" value="confirmed" />
                <el-option label="执行中" value="in_progress" />
                <el-option label="已完成" value="completed" />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-button
                type="primary"
                icon="el-icon-search"
                @click="loadScheduleList"
              >查询</el-button>
              <el-button
                icon="el-icon-refresh"
                @click="resetQuery"
              >重置</el-button>
            </el-form-item>
          </el-form>
        </el-card>

        <!-- 操作按钮 -->
        <el-card shadow="never" style="margin-top: 10px">
          <div class="table-toolbar">
            <el-button
              type="primary"
              icon="el-icon-plus"
              @click="openCreateSchedule"
            >创建排程</el-button>
            <el-button
              type="success"
              icon="el-icon-magic-stick"
              @click="openAutoSchedule"
            >智能排程</el-button>
            <el-button
              type="warning"
              icon="el-icon-bell"
              @click="openUrgentInsert"
            >紧急插单</el-button>
          </div>

          <!-- 排程列表表格 -->
          <el-table v-loading="loading" :data="scheduleList" border stripe>
            <el-table-column prop="scheduleNo" label="排程单号" width="160" />
            <el-table-column prop="scheduleDate" label="排程日期" width="110" />
            <el-table-column prop="scheduleType" label="排程类型" width="100">
              <template slot-scope="{ row }">
                <el-tag
                  :type="row.scheduleType === 'order' ? 'primary' : 'warning'"
                  size="small"
                >
                  {{ row.scheduleType === "order" ? "订单排程" : "备货排程" }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column
              prop="totalOrders"
              label="订单数"
              width="80"
              align="center"
            />
            <el-table-column
              prop="totalItems"
              label="明细数"
              width="80"
              align="center"
            />
            <el-table-column
              prop="totalSqm"
              label="总面积(㎡)"
              width="110"
              align="right"
            >
              <template slot-scope="{ row }">{{
                formatNumber(row.totalSqm)
              }}</template>
            </el-table-column>
            <el-table-column
              prop="status"
              label="状态"
              width="100"
              align="center"
            >
              <template slot-scope="{ row }">
                <el-tag :type="getStatusType(row.status)" size="small">{{
                  getStatusText(row.status)
                }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="confirmedBy" label="确认人" width="100" />
            <el-table-column
              prop="confirmedTime"
              label="确认时间"
              width="150"
            />
            <el-table-column prop="remark" label="备注" show-overflow-tooltip />
            <el-table-column label="操作" width="240" fixed="right">
              <template slot-scope="{ row }">
                <el-button
                  type="text"
                  size="small"
                  @click="viewScheduleDetail(row)"
                >查看</el-button>
                <el-button
                  v-if="row.status === 'draft'"
                  type="text"
                  size="small"
                  @click="editSchedule(row)"
                >编辑</el-button>
                <el-button
                  v-if="row.status === 'draft'"
                  type="text"
                  size="small"
                  style="color: #e6a23c"
                  @click="handleSubmitApproval(row)"
                >提审</el-button>
                <el-button
                  v-if="row.status === 'pending_approval'"
                  type="text"
                  size="small"
                  style="color: #67c23a"
                  @click="handleApproveSchedule(row)"
                >审批</el-button>
                <el-button
                  v-if="row.status === 'draft'"
                  type="text"
                  size="small"
                  style="color: #67c23a"
                  @click="handleConfirmSchedule(row)"
                >确认</el-button>
                <el-button
                  v-if="row.status === 'draft'"
                  type="text"
                  size="small"
                  style="color: #f56c6c"
                  @click="handleDeleteSchedule(row)"
                >删除</el-button>
              </template>
            </el-table-column>
          </el-table>

          <!-- 分页 -->
          <el-pagination
            style="margin-top: 15px; text-align: right"
            :current-page="queryParams.pageNum"
            :page-sizes="[10, 20, 50]"
            :page-size="queryParams.pageSize"
            :total="Number(total)"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="handlePageChange"
          />
        </el-card>
      </el-tab-pane>

      <!-- 生产看板 -->
      <el-tab-pane label="生产看板" name="board">
        <el-card shadow="never">
          <div slot="header" class="board-header">
            <span>今日生产进度</span>
            <div>
              <el-date-picker
                v-model="boardDate"
                type="date"
                placeholder="选择日期"
                value-format="yyyy-MM-dd"
                style="width: 150px; margin-right: 10px"
                @change="loadBoardData"
              />
              <el-button
                type="text"
                icon="el-icon-refresh"
                @click="loadBoardData"
              >刷新</el-button>
            </div>
          </div>

          <!-- 统计卡片 -->
          <el-row :gutter="20" style="margin-bottom: 20px">
            <el-col :span="6">
              <div
                class="stat-box"
                style="
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                "
              >
                <div class="stat-icon"><i class="el-icon-tickets" /></div>
                <div class="stat-info">
                  <div class="stat-value">{{ boardStats.totalTasks || 0 }}</div>
                  <div class="stat-label">总任务数</div>
                </div>
              </div>
            </el-col>
            <el-col :span="6">
              <div
                class="stat-box"
                style="
                  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
                "
              >
                <div class="stat-icon"><i class="el-icon-loading" /></div>
                <div class="stat-info">
                  <div class="stat-value">
                    {{ boardStats.inProgressTasks || 0 }}
                  </div>
                  <div class="stat-label">进行中</div>
                </div>
              </div>
            </el-col>
            <el-col :span="6">
              <div
                class="stat-box"
                style="
                  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
                "
              >
                <div class="stat-icon"><i class="el-icon-circle-check" /></div>
                <div class="stat-info">
                  <div class="stat-value">
                    {{ boardStats.completedTasks || 0 }}
                  </div>
                  <div class="stat-label">已完成</div>
                </div>
              </div>
            </el-col>
            <el-col :span="6">
              <div
                class="stat-box"
                style="
                  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
                "
              >
                <div class="stat-icon"><i class="el-icon-data-analysis" /></div>
                <div class="stat-info">
                  <div class="stat-value">
                    {{ boardStats.completionRate || 0 }}%
                  </div>
                  <div class="stat-label">完成率</div>
                </div>
              </div>
            </el-col>
          </el-row>

          <!-- 各工序进度 -->
          <el-row :gutter="20">
            <el-col :span="6">
              <el-card class="process-card">
                <div slot="header"><i class="el-icon-brush" /> 涂布</div>
                <div class="process-stats">
                  <div class="stat-item">
                    <span>待生产</span>
                    <el-tag type="info" size="small">{{
                      (processStats.coating && processStats.coating.pending) ||
                        0
                    }}</el-tag>
                  </div>
                  <div class="stat-item">
                    <span>生产中</span>
                    <el-tag type="warning" size="small">{{
                      (processStats.coating &&
                        processStats.coating.inProgress) ||
                        0
                    }}</el-tag>
                  </div>
                  <div class="stat-item">
                    <span>已完成</span>
                    <el-tag type="success" size="small">{{
                      (processStats.coating &&
                        processStats.coating.completed) ||
                        0
                    }}</el-tag>
                  </div>
                </div>
              </el-card>
            </el-col>
            <el-col :span="6">
              <el-card class="process-card">
                <div slot="header">
                  <i class="el-icon-refresh-right" /> 复卷
                </div>
                <div class="process-stats">
                  <div class="stat-item">
                    <span>待生产</span>
                    <el-tag type="info" size="small">{{
                      (processStats.rewinding &&
                        processStats.rewinding.pending) ||
                        0
                    }}</el-tag>
                  </div>
                  <div class="stat-item">
                    <span>生产中</span>
                    <el-tag type="warning" size="small">{{
                      (processStats.rewinding &&
                        processStats.rewinding.inProgress) ||
                        0
                    }}</el-tag>
                  </div>
                  <div class="stat-item">
                    <span>已完成</span>
                    <el-tag type="success" size="small">{{
                      (processStats.rewinding &&
                        processStats.rewinding.completed) ||
                        0
                    }}</el-tag>
                  </div>
                </div>
              </el-card>
            </el-col>
            <el-col :span="6">
              <el-card class="process-card">
                <div slot="header"><i class="el-icon-scissors" /> 分切</div>
                <div class="process-stats">
                  <div class="stat-item">
                    <span>待生产</span>
                    <el-tag type="info" size="small">{{
                      (processStats.slitting &&
                        processStats.slitting.pending) ||
                        0
                    }}</el-tag>
                  </div>
                  <div class="stat-item">
                    <span>生产中</span>
                    <el-tag type="warning" size="small">{{
                      (processStats.slitting &&
                        processStats.slitting.inProgress) ||
                        0
                    }}</el-tag>
                  </div>
                  <div class="stat-item">
                    <span>已完成</span>
                    <el-tag type="success" size="small">{{
                      (processStats.slitting &&
                        processStats.slitting.completed) ||
                        0
                    }}</el-tag>
                  </div>
                </div>
              </el-card>
            </el-col>
            <el-col :span="6">
              <el-card class="process-card">
                <div slot="header">
                  <i class="el-icon-c-scale-to-original" /> 分条
                </div>
                <div class="process-stats">
                  <div class="stat-item">
                    <span>待生产</span>
                    <el-tag type="info" size="small">{{
                      (processStats.stripping &&
                        processStats.stripping.pending) ||
                        0
                    }}</el-tag>
                  </div>
                  <div class="stat-item">
                    <span>生产中</span>
                    <el-tag type="warning" size="small">{{
                      (processStats.stripping &&
                        processStats.stripping.inProgress) ||
                        0
                    }}</el-tag>
                  </div>
                  <div class="stat-item">
                    <span>已完成</span>
                    <el-tag type="success" size="small">{{
                      (processStats.stripping &&
                        processStats.stripping.completed) ||
                        0
                    }}</el-tag>
                  </div>
                </div>
              </el-card>
            </el-col>
          </el-row>
          <!-- 设备状态 -->
          <el-card style="margin-top: 20px">
            <div slot="header">设备运行状态</div>
            <el-row :gutter="15">
              <el-col
                v-for="eq in equipmentBoard"
                :key="eq.equipmentId"
                :span="6"
                style="margin-bottom: 15px"
              >
                <div class="equipment-card" :class="{ running: eq.isRunning }">
                  <div class="eq-header">
                    <span class="eq-name">{{ eq.equipmentName }}</span>
                    <el-tag
                      :type="eq.isRunning ? 'success' : 'info'"
                      size="mini"
                    >
                      {{ eq.isRunning ? "运行中" : "空闲" }}
                    </el-tag>
                  </div>
                  <div class="eq-body">
                    <div class="eq-info">设备编号: {{ eq.equipmentCode }}</div>
                    <div class="eq-info">今日任务: {{ eq.taskCount }} 个</div>
                  </div>
                </div>
              </el-col>
            </el-row>
          </el-card>
        </el-card>
      </el-tab-pane>

      <!-- 甘特图视图 -->
      <el-tab-pane label="甘特图" name="gantt">
        <el-card shadow="never">
          <div slot="header" class="board-header">
            <span>生产甘特图</span>
            <div>
              <el-date-picker
                v-model="ganttDateRange"
                type="daterange"
                range-separator="至"
                start-placeholder="开始日期"
                end-placeholder="结束日期"
                value-format="yyyy-MM-dd"
                style="width: 260px; margin-right: 10px"
                @change="loadGanttData"
              />
              <el-select
                v-model="ganttProcessType"
                placeholder="工序"
                clearable
                style="width: 120px; margin-right: 10px"
                @change="loadGanttData"
              >
                <el-option label="全部工序" value="" />
                <el-option label="印刷" value="printing" />
                <el-option label="涂布" value="coating" />
                <el-option label="复卷" value="rewinding" />
                <el-option label="分切" value="slitting" />
                <el-option label="分条" value="stripping" />
              </el-select>
              <el-button
                type="text"
                icon="el-icon-refresh"
                @click="loadGanttData"
              >刷新</el-button>
            </div>
          </div>

          <!-- 甘特图区域 -->
          <div class="gantt-container">
            <!-- 时间刻度 -->
            <div class="gantt-header">
              <div class="gantt-task-col">任务/设备</div>
              <div class="gantt-timeline">
                <div v-for="hour in ganttHours" :key="hour" class="gantt-hour">
                  {{ hour }}:00
                </div>
              </div>
            </div>

            <!-- 任务行 -->
            <div class="gantt-body">
              <div v-for="task in ganttTasks" :key="task.id" class="gantt-row">
                <div class="gantt-task-info">
                  <div class="task-name">{{ task.taskNo }}</div>
                  <div class="task-equipment">{{ task.equipmentCode }}</div>
                </div>
                <div class="gantt-timeline-row">
                  <div
                    class="gantt-bar"
                    :class="getGanttBarClass(task.status, task.processType)"
                    :style="getGanttBarStyle(task)"
                  >
                    <span
                      class="bar-text"
                    >{{ task.materialCode }} -
                      {{ formatGanttDuration(task) }}</span>
                  </div>
                </div>
              </div>
              <div v-if="ganttTasks.length === 0" class="gantt-empty">
                <i
                  class="el-icon-document"
                  style="font-size: 40px; color: #ccc"
                />
                <p>暂无生产任务</p>
              </div>
            </div>

            <!-- 图例 -->
            <div class="gantt-legend">
              <span class="legend-item"><i class="dot printing" />印刷</span>
              <span class="legend-item"><i class="dot coating" />涂布</span>
              <span class="legend-item"><i class="dot rewinding" />复卷</span>
              <span class="legend-item"><i class="dot slitting" />分切</span>
              <span class="legend-item"><i class="dot stripping" />分条</span>
              <span class="legend-item"><i class="dot completed" />已完成</span>
              <span
                class="legend-item"
              ><i class="dot in-progress" />进行中</span>
            </div>
          </div>
        </el-card>
      </el-tab-pane>
    </el-tabs>

    <!-- 智能排程对话框 -->
    <el-dialog
      title="智能排程"
      :visible.sync="autoScheduleVisible"
      width="700px"
    >
      <el-form :model="autoScheduleForm" label-width="100px">
        <el-form-item label="排程日期">
          <el-date-picker
            v-model="autoScheduleForm.scheduleDate"
            type="date"
            placeholder="选择排程日期"
            value-format="yyyy-MM-dd"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="排程类型">
          <el-radio-group v-model="autoScheduleForm.scheduleType">
            <el-radio label="order">订单排程</el-radio>
            <el-radio label="safety">安全库存补货</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="筛选条件">
          <el-checkbox
            v-model="autoScheduleForm.urgentOnly"
          >仅VIP/紧急订单</el-checkbox>
          <el-checkbox
            v-model="autoScheduleForm.overdueOnly"
          >仅逾期/即将逾期</el-checkbox>
        </el-form-item>
      </el-form>

      <div style="margin-top: 20px">
        <h4>
          预览待排程订单 ({{
            selectedOrders.length > 0
              ? selectedOrders.length
              : previewOrders.length
          }}
          项)
        </h4>
        <el-table
          :data="selectedOrders.length > 0 ? selectedOrders : previewOrders"
          max-height="300"
          border
          size="small"
        >
          <el-table-column prop="order_no" label="订单号" width="130" />
          <el-table-column
            prop="customer"
            label="客户"
            width="120"
            show-overflow-tooltip
          />
          <el-table-column prop="material_code" label="料号" width="120" />
          <el-table-column
            prop="pending_qty"
            label="待排数量"
            width="90"
            align="center"
          />
          <el-table-column prop="delivery_date" label="交货日期" width="100" />
        </el-table>
      </div>

      <div slot="footer">
        <el-button @click="autoScheduleVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="scheduling"
          @click="executeAutoSchedule"
        >
          {{ scheduling ? "排程中..." : "开始排程" }}
        </el-button>
      </div>
    </el-dialog>

    <!-- 排程详情对话框 -->
    <el-dialog
      title="排程详情"
      :visible.sync="detailVisible"
      width="90%"
      top="5vh"
    >
      <div v-if="currentSchedule">
        <!-- 基本信息 -->
        <div
          class="schedule-info"
          style="
            margin-bottom: 20px;
            background: #f5f7fa;
            padding: 15px;
            border-radius: 4px;
          "
        >
          <el-row :gutter="20">
            <el-col :span="6">
              <div class="info-item">
                <span class="label">排程单号：</span>{{ currentSchedule.scheduleNo }}
              </div>
            </el-col>
            <el-col :span="6">
              <div class="info-item">
                <span class="label">排程日期：</span>{{ currentSchedule.scheduleDate }}
              </div>
            </el-col>
            <el-col :span="6">
              <div class="info-item">
                <span class="label">排程类型：</span>
                <el-tag
                  :type="
                    currentSchedule.scheduleType === 'order'
                      ? 'primary'
                      : 'warning'
                  "
                  size="small"
                >
                  {{
                    currentSchedule.scheduleType === "order"
                      ? "订单排程"
                      : "备货排程"
                  }}
                </el-tag>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="info-item">
                <span class="label">状态：</span>
                <el-tag
                  :type="getStatusType(currentSchedule.status)"
                  size="small"
                >
                  {{ getStatusText(currentSchedule.status) }}
                </el-tag>
              </div>
            </el-col>
          </el-row>
          <el-row :gutter="20" style="margin-top: 10px">
            <el-col :span="6">
              <div class="info-item">
                <span class="label">订单数：</span>{{ currentSchedule.totalOrders }}
              </div>
            </el-col>
            <el-col :span="6">
              <div class="info-item">
                <span class="label">明细数：</span>{{ currentSchedule.totalItems }}
              </div>
            </el-col>
            <el-col :span="6">
              <div class="info-item">
                <span class="label">总面积：</span>{{ formatNumber(currentSchedule.totalSqm) }} ㎡
              </div>
            </el-col>
            <el-col :span="6">
              <div class="info-item">
                <span class="label">确认人：</span>{{ currentSchedule.confirmedBy || "-" }}
              </div>
            </el-col>
          </el-row>
        </div>

        <!-- 工序任务标签页 -->
        <el-tabs v-model="detailTab">
          <el-tab-pane label="涂布计划" name="coating">
            <el-table
              :data="currentSchedule.coatingTasks || []"
              border
              size="small"
              style="font-size: 12px"
            >
              <el-table-column prop="taskNo" label="任务单号" width="130" />
              <el-table-column prop="orderNo" label="订单号" width="120" show-overflow-tooltip />
              <el-table-column prop="materialCode" label="料号" width="110" show-overflow-tooltip />
              <el-table-column prop="materialName" label="产品名称" width="150" show-overflow-tooltip />
              <el-table-column prop="equipmentCode" label="设备" width="80" />
              <el-table-column prop="colorName" label="颜色" width="70" />
              <el-table-column label="厚度(μm)" width="80">
                <template slot-scope="{ row }">{{
                  row.thickness ? (row.thickness * 1000).toFixed(0) : "-"
                }}</template>
              </el-table-column>
              <el-table-column label="未排程面积(㎡)" width="110" align="right">
                <template slot-scope="{ row }">
                  <el-tag v-if="row.pendingSqm != null && row.pendingSqm > 0" type="warning" size="small">
                    {{ formatNumber(row.pendingSqm) }}
                  </el-tag>
                  <el-tag v-else-if="row.pendingSqm != null && row.pendingSqm <= 0" type="success" size="small">
                    已完成
                  </el-tag>
                  <span v-else>-</span>
                </template>
              </el-table-column>
              <el-table-column label="涂布长度(m)" width="100" align="right">
                <template slot-scope="{ row }">{{
                  row.planLength ? row.planLength.toFixed(0) : ""
                }}</template>
              </el-table-column>
              <el-table-column label="涂布总面积(㎡)" width="120" align="right">
                <template slot-scope="{ row }">
                  <el-input
                    v-model.number="row.planSqm"
                    type="number"
                    size="mini"
                    placeholder="请输入"
                    style="width: 100px"
                    @change="updateCoatingPlanSqm(row)"
                  />
                </template>
              </el-table-column>
              <el-table-column label="膜宽(mm)" width="100" align="right">
                <template slot-scope="{ row }">
                  <span v-if="row.filmWidth" style="color: #67C23A; font-weight: bold">
                    {{ row.filmWidth }}
                  </span>
                  <span v-else style="color: #E6A23C">未选择</span>
                </template>
              </el-table-column>
              <el-table-column label="基材厚度(μm)" width="100">
                <template slot-scope="{ row }">{{
                  row.baseThickness || "-"
                }}</template>
              </el-table-column>
              <el-table-column label="涂胶厚度(g/m²)" width="120">
                <template slot-scope="{ row }">{{
                  row.coatingThickness || "-"
                }}</template>
              </el-table-column>
              <el-table-column label="胶水编码" width="110" show-overflow-tooltip>
                <template slot-scope="{ row }">{{
                  row.adhesiveCode || "-"
                }}</template>
              </el-table-column>
              <el-table-column label="离型层" width="80">
                <template slot-scope="{ row }">{{
                  row.releaseLayer || "-"
                }}</template>
              </el-table-column>
              <el-table-column label="工时(min)" width="80" align="right">
                <template slot-scope="{ row }">{{
                  row.workHours || row.planDuration || "-"
                }}</template>
              </el-table-column>
              <el-table-column prop="planStartTime" label="开始时间" width="140">
                <template slot-scope="{ row }">
                  {{ row.planStartTime ? formatDateTime(row.planStartTime) : "-" }}
                </template>
              </el-table-column>
              <el-table-column prop="planEndTime" label="结束时间" width="140">
                <template slot-scope="{ row }">
                  {{ row.planEndTime ? formatDateTime(row.planEndTime) : "-" }}
                </template>
              </el-table-column>
              <el-table-column prop="status" label="状态" width="80">
                <template slot-scope="{ row }">
                  <el-tag :type="getTaskStatusType(row.status)" size="small">{{
                    getTaskStatusText(row.status)
                  }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="staffName" label="操作人" width="80" />
              <el-table-column label="物料锁定" width="140" fixed="right">
                <template slot-scope="{ row }">
                  <el-button
                    v-if="!row.filmWidth"
                    type="warning"
                    size="mini"
                    icon="el-icon-lock"
                    @click="openFilmWidthSelector(row)"
                  >
                    选择宽度
                  </el-button>
                  <div v-else>
                    <el-tag type="success" size="small">已锁定</el-tag>
                    <el-button
                      type="text"
                      size="mini"
                      icon="el-icon-unlock"
                      @click="unlockMaterial(row)"
                    >
                      解锁
                    </el-button>
                  </div>
                </template>
              </el-table-column>
            </el-table>
          </el-tab-pane>
          <el-tab-pane label="复卷计划" name="rewinding">
            <el-table
              :data="currentSchedule.rewindingTasks || []"
              border
              size="small"
            >
              <el-table-column prop="taskNo" label="任务单号" width="140" />
              <el-table-column prop="equipmentCode" label="设备" width="100" />
              <el-table-column
                prop="sourceBatchNo"
                label="来源批次"
                width="130"
              />
              <el-table-column prop="planRolls" label="计划卷数" width="90" />
              <el-table-column label="支料长度(m)" width="100">
                <template slot-scope="{ row }">{{
                  row.slitLength ? (row.slitLength / 1000).toFixed(0) : ""
                }}</template>
              </el-table-column>
              <el-table-column label="工时(min)" width="90" align="right">
                <template slot-scope="{ row }">{{ row.planDuration || "-" }}</template>
              </el-table-column>
              <el-table-column prop="planStartTime" label="开始时间" width="140">
                <template slot-scope="{ row }">
                  {{ row.planStartTime ? formatDateTime(row.planStartTime) : "-" }}
                </template>
              </el-table-column>
              <el-table-column prop="planEndTime" label="结束时间" width="140">
                <template slot-scope="{ row }">
                  {{ row.planEndTime ? formatDateTime(row.planEndTime) : "-" }}
                </template>
              </el-table-column>
              <el-table-column prop="status" label="状态" width="100">
                <template slot-scope="{ row }">
                  <el-tag :type="getTaskStatusType(row.status)" size="small">{{
                    getTaskStatusText(row.status)
                  }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="staffName" label="操作人" width="100" />
            </el-table>
          </el-tab-pane>
          <el-tab-pane label="分切计划" name="slitting">
            <el-table
              :data="currentSchedule.slittingTasks || []"
              border
              size="small"
            >
              <el-table-column prop="taskNo" label="任务单号" width="140" />
              <el-table-column prop="equipmentCode" label="设备" width="100" />
              <el-table-column
                prop="sourceBatchNo"
                label="来源批次"
                width="130"
              />
              <el-table-column
                prop="targetWidth"
                label="目标宽度(mm)"
                width="110"
              />
              <el-table-column prop="planRolls" label="计划卷数" width="90" />
              <el-table-column label="工时(min)" width="90" align="right">
                <template slot-scope="{ row }">{{ row.planDuration || "-" }}</template>
              </el-table-column>
              <el-table-column prop="planStartTime" label="开始时间" width="140">
                <template slot-scope="{ row }">
                  {{ row.planStartTime ? formatDateTime(row.planStartTime) : "-" }}
                </template>
              </el-table-column>
              <el-table-column prop="planEndTime" label="结束时间" width="140">
                <template slot-scope="{ row }">
                  {{ row.planEndTime ? formatDateTime(row.planEndTime) : "-" }}
                </template>
              </el-table-column>
              <el-table-column prop="status" label="状态" width="100">
                <template slot-scope="{ row }">
                  <el-tag :type="getTaskStatusType(row.status)" size="small">{{
                    getTaskStatusText(row.status)
                  }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="staffName" label="操作人" width="100" />
            </el-table>
          </el-tab-pane>
          <el-tab-pane label="分条计划" name="stripping">
            <el-table
              :data="currentSchedule.strippingTasks || []"
              border
              size="small"
            >
              <el-table-column prop="taskNo" label="任务单号" width="140" />
              <el-table-column prop="equipmentCode" label="设备" width="100" />
              <el-table-column
                prop="sourceBatchNo"
                label="来源批次"
                width="130"
              />
              <el-table-column
                prop="targetWidth"
                label="目标宽度(mm)"
                width="100"
              />
              <el-table-column label="目标长度(m)" width="100">
                <template slot-scope="{ row }">{{
                  row.targetLength ? (row.targetLength / 1000).toFixed(0) : ""
                }}</template>
              </el-table-column>
              <el-table-column prop="planRolls" label="计划卷数" width="90" />
              <el-table-column prop="status" label="状态" width="100">
                <template slot-scope="{ row }">
                  <el-tag :type="getTaskStatusType(row.status)" size="small">{{
                    getTaskStatusText(row.status)
                  }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="staffName" label="操作人" width="100" />
            </el-table>
          </el-tab-pane>
          <el-tab-pane label="关联订单" name="orders">
            <el-table
              :data="currentSchedule.orderItems || []"
              border
              size="small"
            >
              <el-table-column prop="orderNo" label="订单号" width="140" />
              <el-table-column
                prop="customer"
                label="客户"
                width="120"
                show-overflow-tooltip
              />
              <el-table-column prop="materialCode" label="料号" width="120" />
              <el-table-column
                prop="materialName"
                label="产品名称"
                show-overflow-tooltip
              />
              <el-table-column
                prop="scheduleQty"
                label="排程数量"
                width="90"
                align="center"
              />
              <el-table-column label="来源" width="100" align="center">
                <template slot-scope="{ row }">
                  <el-tag
                    :type="row.sourceType === 'stock' ? 'success' : 'primary'"
                    size="small"
                  >
                    {{ row.sourceType === "stock" ? "库存" : "生产" }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column
                prop="deliveryDate"
                label="交货日期"
                width="110"
              />
              <el-table-column prop="status" label="状态" width="100">
                <template slot-scope="{ row }">
                  <el-tag :type="getTaskStatusType(row.status)" size="small">{{
                    getTaskStatusText(row.status)
                  }}</el-tag>
                </template>
              </el-table-column>
            </el-table>
          </el-tab-pane>
        </el-tabs>
      </div>
      <div slot="footer">
        <el-button @click="detailVisible = false">关闭</el-button>
      </div>
    </el-dialog>

    <!-- 薄膜宽度选择器 -->
    <film-width-selector
      :visible.sync="filmWidthSelectorVisible"
      :schedule-info="currentScheduleInfo"
      @success="handleFilmWidthLockSuccess"
    />
  </div>
</template>

<script>
import {
  getScheduleList,
  getScheduleById,
  confirmSchedule,
  deleteSchedule,
  autoSchedule,
  getPendingOrderItems,
  getEquipmentBoard,
  getProgressBoard,
  getInspectionList,
  submitScheduleApproval,
  approveSchedule,
  getGanttData
} from '@/api/schedule'
import { unlockScheduleMaterial } from '@/api/filmStock'
import { getSpecByMaterialCode } from '@/api/tapeSpec'
import FilmWidthSelector from '@/components/Production/FilmWidthSelector'

export default {
  name: 'ProductionSchedule',
  components: {
    FilmWidthSelector
  },
  data() {
    return {
      activeTab: 'list',
      loading: false,
      scheduleList: [],
      materialNameByCodeCache: {},
      total: 0,
      queryParams: {
        pageNum: 1,
        pageSize: 10,
        scheduleNo: '',
        status: '',
        dateRange: []
      },
      boardDate: this.formatDate(new Date()),
      boardStats: {},
      processStats: {},
      equipmentBoard: [],
      // 甘特图
      ganttDateRange: [
        this.formatDate(new Date()),
        this.formatDate(new Date())
      ],
      ganttProcessType: '',
      ganttTasks: [],
      ganttHours: [
        6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22
      ],
      // 质检      // 待排程
      pendingLoading: false,
      pendingOrders: [],
      pendingTotal: 0,
      pendingParams: {
        pageNum: 1,
        pageSize: 20,
        customerLevel: '',
        materialCode: ''
      },
      selectedOrders: [],
      autoScheduleVisible: false,
      scheduling: false,
      autoScheduleForm: {
        scheduleDate: '',
        scheduleType: 'order',
        urgentOnly: false,
        overdueOnly: false
      },
      previewOrders: [],
      detailVisible: false,
      currentSchedule: null,
      detailTab: 'coating',
      // 薄膜宽度选择器
      filmWidthSelectorVisible: false,
      currentScheduleInfo: {
        taskNo: '',
        orderNo: '',
        materialCode: '',
        materialName: '',
        planSqm: null,
        baseThickness: null,
        scheduleId: null,
        id: null,
        orderId: null
      }
    }
  },
  mounted() {
    this.loadScheduleList()
    this.loadPendingOrders()
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
    async loadScheduleList() {
      this.loading = true
      try {
        const params = {
          pageNum: this.queryParams.pageNum,
          pageSize: this.queryParams.pageSize,
          scheduleNo: this.queryParams.scheduleNo,
          status: this.queryParams.status
        }
        if (
          this.queryParams.dateRange &&
          this.queryParams.dateRange.length === 2
        ) {
          params.startDate = this.queryParams.dateRange[0]
          params.endDate = this.queryParams.dateRange[1]
        }
        const res = await getScheduleList(params)
        if (res.code === 200) {
          const rawList = res.data.list || []
          this.scheduleList = await this.enrichMaterialNamesFromSpec(rawList)
          // 确保total字段为数字类型
          this.total = Number(res.data.total) || 0
          this.queryParams.pageNum = Number(res.data.pageNum) || this.queryParams.pageNum
          this.queryParams.pageSize = Number(res.data.pageSize) || this.queryParams.pageSize
        }
      } catch (error) {
        console.error('加载排程列表失败:', error)
      } finally {
        this.loading = false
      }
    },
    async loadBoardData() {
      try {
        const [progressRes, equipmentRes] = await Promise.all([
          getProgressBoard(this.boardDate),
          getEquipmentBoard(this.boardDate)
        ])
        if (progressRes.code === 200) {
          const data = progressRes.data
          this.boardStats = {
            totalTasks: data.totalTasks || 0,
            completedTasks: data.completedTasks || 0,
            inProgressTasks:
              ((data.coating && data.coating.inProgress) || 0) +
              ((data.rewinding && data.rewinding.inProgress) || 0) +
              ((data.slitting && data.slitting.inProgress) || 0) +
              ((data.stripping && data.stripping.inProgress) || 0),
            completionRate: Math.round(data.completionRate || 0)
          }
          this.processStats = {
            coating: data.coating || {},
            rewinding: data.rewinding || {},
            slitting: data.slitting || {},
            stripping: data.stripping || {}
          }
        }
        if (equipmentRes.code === 200) {
          this.equipmentBoard = equipmentRes.data || []
        }
      } catch (error) {
        console.error('加载看板数据失败:', error)
      }
    },
    async loadPendingOrders() {
      this.pendingLoading = true
      try {
        const res = await getPendingOrderItems(this.pendingParams)
        if (res.code === 200) {
          // 为每个订单初始化响应式属性
          const processedList = (res.data.list || []).map((order) => {
            // 确保每个order对象都有schedule_qty属性，初始化为待排数量
            return {
              ...order,
              schedule_qty: order.schedule_qty || order.pending_qty || 0
            }
          })
          this.pendingOrders = processedList
          // 关键修复：确保分页字段为数字类型
          this.pendingTotal = Number(res.data.total) || 0
          this.pendingParams.pageNum = Number(res.data.pageNum) || this.pendingParams.pageNum
          this.pendingParams.pageSize = Number(res.data.pageSize) || this.pendingParams.pageSize
        }
      } catch (error) {
        console.error('加载待排程订单失败:', error)
      } finally {
        this.pendingLoading = false
      }
    },
    handleTabChange(tab) {
      if (tab.name === 'board') {
        this.loadBoardData()
      } else if (tab.name === 'pending') {
        this.loadPendingOrders()
      } else if (tab.name === 'gantt') {
        this.loadGanttData()
      }
    },
    resetQuery() {
      this.queryParams = {
        pageNum: 1,
        pageSize: 10,
        scheduleNo: '',
        status: '',
        dateRange: []
      }
      this.loadScheduleList()
    },
    handleSizeChange(size) {
      this.queryParams.pageSize = size
      this.loadScheduleList()
    },
    handlePageChange(page) {
      this.queryParams.pageNum = page
      this.loadScheduleList()
    },
    handlePendingSizeChange(size) {
      this.pendingParams.pageSize = size
      this.pendingParams.pageNum = 1 // 改变分页大小时回到第1页
      this.loadPendingOrders()
    },
    handlePendingPageChange(page) {
      this.pendingParams.pageNum = page
      this.loadPendingOrders()
    },
    handlePendingSearch() {
      // 搜索时重置分页
      this.pendingParams.pageNum = 1
      this.loadPendingOrders()
    },
    handleSelectionChange(selection) {
      this.selectedOrders = selection
    },
    openCreateSchedule() {
      this.$message.info('创建排程功能开发中...')
    },
    openAutoSchedule() {
      // 默认排程日期为明天
      this.autoScheduleForm = {
        scheduleDate: this.getTomorrowDate(),
        scheduleType: 'order',
        urgentOnly: false,
        overdueOnly: false
      }
      if (this.selectedOrders.length > 0) {
        this.previewOrders = this.selectedOrders
      } else {
        this.previewOrders = this.pendingOrders.slice(0, 5)
      }
      this.autoScheduleVisible = true
    },
    async executeAutoSchedule() {
      this.scheduling = true
      try {
        const orderItemIds =
          this.selectedOrders.length > 0
            ? this.selectedOrders.map((o) => o.order_item_id)
            : null
        const res = await autoSchedule({
          orderItemIds,
          scheduleDate: this.autoScheduleForm.scheduleDate,
          operator: 'admin'
        })
        if (res.code === 200) {
          this.$message.success('排程完成！')
          this.autoScheduleVisible = false
          this.selectedOrders = []
          this.loadScheduleList()
        } else {
          this.$message.error(res.message || '排程失败')
        }
      } catch (error) {
        this.$message.error('排程失败: ' + error.message)
      } finally {
        this.scheduling = false
      }
    },
    batchSchedule() {
      // 检查是否有选中的订单，以及排程数量是否大于0
      const validOrders = this.selectedOrders.filter((o) => o.schedule_qty > 0)
      if (validOrders.length === 0) {
        this.$message.warning('请选择订单并设置排程数量（>0）')
        return
      }

      // 默认排程日期为明天（给出准备时间）
      const defaultScheduleDate = this.getTomorrowDate()

      // 显示确认对话框
      const totalQty = validOrders.reduce((sum, o) => sum + o.schedule_qty, 0)
      this.$confirm(
        `确认排程 ${validOrders.length} 个订单，总计 ${totalQty} 卷？<br/>排程日期：<strong>${defaultScheduleDate}</strong>`,
        '批量排程',
        {
          type: 'warning',
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          dangerouslyUseHTMLString: true
        }
      )
        .then(async() => {
          this.scheduling = true
          try {
            // 准备排程数据，使用 schedule_qty 替代 pending_qty
            const scheduleDetails = validOrders.map((o) => ({
              order_item_id: o.order_item_id,
              schedule_qty: o.schedule_qty
            }))

            const res = await autoSchedule({
              scheduleDate: defaultScheduleDate,
              scheduleType: 'order',
              details: scheduleDetails,
              operator: 'admin'
            })

            if (res.code === 200) {
              this.$message.success(
                `排程成功！已排程 ${validOrders.length} 个订单`
              )

              // 清空选中
              this.selectedOrders = []

              // 刷新排程列表
              this.loadScheduleList()

              // 重新加载待排程订单（从数据库重新查询，确保数据最新）
              // 这样可以避免Vue响应式的问题
              setTimeout(() => {
                this.loadPendingOrders()
              }, 500)
            } else {
              this.$message.error(res.message || '排程失败')
            }
          } catch (error) {
            this.$message.error('排程失败: ' + error.message)
          } finally {
            this.scheduling = false
          }
        })
        .catch(() => {})
    },
    async viewScheduleDetail(row) {
      try {
        const res = await getScheduleById(row.id)
        if (res.code === 200) {
          this.currentSchedule = res.data
          this.detailTab = 'coating'
          this.detailVisible = true
        }
      } catch (error) {
        this.$message.error('加载排程详情失败')
      }
    },
    editSchedule(row) {
      this.$message.info('编辑排程功能开发中...')
    },
    handleConfirmSchedule(row) {
      this.$confirm('确认后将开始执行生产任务，是否继续？', '确认排程', {
        type: 'warning'
      })
        .then(async() => {
          try {
            const res = await confirmSchedule(row.id)
            if (res.code === 200) {
              this.$message.success('排程已确认')
              this.loadScheduleList()
            } else {
              this.$message.error(res.message || '确认失败')
            }
          } catch (error) {
            this.$message.error('确认失败')
          }
        })
        .catch(() => {})
    },
    handleDeleteSchedule(row) {
      this.$confirm('确定删除该排程吗？', '提示', {
        type: 'warning'
      })
        .then(async() => {
          try {
            const res = await deleteSchedule(row.id)
            if (res.code === 200) {
              this.$message.success('删除成功')
              this.loadScheduleList()
            } else {
              this.$message.error(res.message || '删除失败')
            }
          } catch (error) {
            this.$message.error('删除失败')
          }
        })
        .catch(() => {})
    },
    // ========== 薄膜宽度选择和物料锁定 ==========
    openFilmWidthSelector(row) {
      console.log('打开薄膜宽度选择器，行数据:', row)

      // 确保 planSqm 是数字类型（仅作为参考值）
      let planSqm = row.planSqm
      if (planSqm && typeof planSqm === 'string') {
        planSqm = parseFloat(planSqm)
      }

      this.currentScheduleInfo = {
        scheduleId: row.scheduleId || row.id,
        taskNo: row.taskNo,
        orderNo: row.orderNo || row.order_no, // 兼容不同的字段名
        orderId: row.orderId || row.orderItemId || row.order_item_id,
        materialCode: row.materialCode || row.material_code,
        materialName: row.materialName || row.material_name,
        planSqm: planSqm, // 仅作为参考，不自动填充
        planLength: row.planLength || row.plan_length || 0,
        baseThickness: row.baseThickness || row.filmThickness || row.base_thickness
      }

      console.log('传递给选择器的数据:', this.currentScheduleInfo)
      this.filmWidthSelectorVisible = true
    },
    async unlockMaterial(row) {
      console.log('=== 解锁物料调试信息 ===')
      console.log('row对象:', row)
      console.log('row.scheduleId:', row.scheduleId)
      console.log('row.id:', row.id)
      console.log('currentSchedule.id:', this.currentSchedule?.id)

      this.$confirm('确定要解除物料锁定吗？', '提示', {
        type: 'warning'
      })
        .then(async() => {
          try {
            // 使用涂布任务的scheduleId，而不是任务本身的id
            const scheduleId = row.scheduleId || this.currentSchedule.id
            console.log('最终使用的scheduleId:', scheduleId)

            const res = await unlockScheduleMaterial(scheduleId)
            console.log('解锁API响应:', res)

            if (res.code === 200) {
              this.$message.success('物料解锁成功')
              // 立即清空filmWidth - 前端清除锁定状态
              if (row && row.filmWidth !== undefined) {
                this.$set(row, 'filmWidth', null)
              }
              // 注意：不调用viewScheduleDetail()刷新，以避免后端返回的filmWidth覆盖前端的清空状态
              // 锁定状态已在前端清空，用户可以继续操作或手动刷新页面
            } else {
              this.$message.error(res.message || '解锁失败')
            }
          } catch (error) {
            console.error('解锁失败:', error)
            this.$message.error('解锁失败: ' + error.message)
          }
        })
        .catch(() => {
          console.log('用户取消解锁')
        })
    },
    handleFilmWidthLockSuccess(data) {
      this.$message.success('物料锁定成功')
      // 刷新当前排程详情
      if (this.currentSchedule && this.currentSchedule.id) {
        this.viewScheduleDetail({ id: this.currentSchedule.id })
      }
    },
    async updateCoatingPlanSqm(row) {
      try {
        // 调用后端API更新涂布计划面积
        const res = await this.$axios.put(`/api/production/schedule/coating/${row.id}`, {
          planSqm: row.planSqm
        })
        if (res.data.code === 200) {
          this.$message.success('涂布总面积更新成功')
        } else {
          this.$message.error(res.data.message || '更新失败')
        }
      } catch (error) {
        this.$message.error('更新失败: ' + error.message)
      }
    },
    formatNumber(num) {
      if (num == null || num === undefined || isNaN(num)) return '0.00'
      return Number(num).toLocaleString('zh-CN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
    },
    formatDate(date) {
      const d = new Date(date)
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    },
    getTomorrowDate() {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      return this.formatDate(tomorrow)
    },
    getTodayDate() {
      return this.formatDate(new Date())
    },
    formatDateTime(dateTime) {
      if (!dateTime) return '-'
      const d = new Date(dateTime)
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      const hour = String(d.getHours()).padStart(2, '0')
      const minute = String(d.getMinutes()).padStart(2, '0')
      return `${month}-${day} ${hour}:${minute}`
    },
    isOverdue(dateStr) {
      if (!dateStr) return false
      const deliveryDate = new Date(dateStr)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return deliveryDate < today
    },
    getStatusType(status) {
      const map = {
        draft: 'info',
        confirmed: 'primary',
        in_progress: 'warning',
        completed: 'success',
        cancelled: 'danger'
      }
      return map[status] || 'info'
    },
    getStatusText(status) {
      const map = {
        draft: '草稿',
        confirmed: '已确认',
        in_progress: '执行中',
        completed: '已完成',
        cancelled: '已取消'
      }
      return map[status] || status
    },
    getTaskStatusType(status) {
      const map = {
        pending: 'info',
        in_progress: 'warning',
        completed: 'success',
        cancelled: 'danger'
      }
      return map[status] || 'info'
    },
    getTaskStatusText(status) {
      const map = {
        pending: '待生产',
        processing: '处理中',
        in_progress: '生产中',
        completed: '已完成',
        cancelled: '已取消'
      }
      return map[status] || status
    },
    getLevelType(level) {
      const map = {
        VIP: 'danger',
        A: 'warning',
        B: 'primary',
        C: 'info'
      }
      return map[level] || 'info'
    },
    validateScheduleQty(row) {
      // 处理空值和非数字
      if (!row.schedule_qty || row.schedule_qty === '') {
        row.schedule_qty = 0
        return
      }

      // 转换为数字
      row.schedule_qty = Number(row.schedule_qty)

      // 不能为负数
      if (row.schedule_qty < 0) {
        row.schedule_qty = 0
        this.$message.warning('排程数量不能为负数')
      }

      // 不能超过待排数量
      if (row.schedule_qty > row.pending_qty) {
        row.schedule_qty = row.pending_qty
        this.$message.warning(`排程数量不能超过待排数量 ${row.pending_qty}`)
      }

      // 整数处理
      row.schedule_qty = Math.floor(row.schedule_qty)
    },

    // ========== 甘特图相关方法 ==========
    async loadGanttData() {
      try {
        const params = {
          processType: this.ganttProcessType
        }
        if (this.ganttDateRange && this.ganttDateRange.length === 2) {
          params.startDate = this.ganttDateRange[0]
          params.endDate = this.ganttDateRange[1]
        }
        const res = await getGanttData(params)
        if (res.code === 200) {
          this.ganttTasks = res.data || []
        } else {
          // 使用模拟数据
          this.ganttTasks = this.getMockGanttData()
        }
      } catch (error) {
        console.error('加载甘特图数据失败:', error)
        // 使用模拟数据
        this.ganttTasks = this.getMockGanttData()
      }
    },
    getMockGanttData() {
      return [
        {
          id: 1,
          taskNo: 'TB-20260110-001',
          equipmentCode: 'TB-01',
          materialCode: 'MT001',
          processType: 'coating',
          status: 'completed',
          planStartTime: '2026-01-10 08:00',
          planEndTime: '2026-01-10 12:00'
        },
        {
          id: 2,
          taskNo: 'TB-20260110-002',
          equipmentCode: 'TB-02',
          materialCode: 'MT002',
          processType: 'coating',
          status: 'in_progress',
          planStartTime: '2026-01-10 09:00',
          planEndTime: '2026-01-10 15:00'
        },
        {
          id: 3,
          taskNo: 'FJ-20260110-001',
          equipmentCode: 'FJ-01',
          materialCode: 'MT001',
          processType: 'rewinding',
          status: 'pending',
          planStartTime: '2026-01-10 13:00',
          planEndTime: '2026-01-10 16:00'
        },
        {
          id: 4,
          taskNo: 'FQ-20260110-001',
          equipmentCode: 'FQ-01',
          materialCode: 'MT001',
          processType: 'slitting',
          status: 'pending',
          planStartTime: '2026-01-10 16:30',
          planEndTime: '2026-01-10 19:00'
        }
      ]
    },
    getGanttBarClass(status, processType) {
      const classes = [processType]
      if (status === 'completed') classes.push('completed')
      else if (status === 'in_progress') classes.push('in-progress')
      return classes.join(' ')
    },
    getGanttBarStyle(task) {
      // 计算位置和宽度
      const startHour = task.planStartTime
        ? parseInt(task.planStartTime.split(' ')[1].split(':')[0])
        : 8
      const endHour = task.planEndTime
        ? parseInt(task.planEndTime.split(' ')[1].split(':')[0])
        : 12
      const startMinute = task.planStartTime
        ? parseInt(task.planStartTime.split(' ')[1].split(':')[1])
        : 0
      const endMinute = task.planEndTime
        ? parseInt(task.planEndTime.split(' ')[1].split(':')[1])
        : 0

      const baseHour = 6 // 从6点开始
      const hourWidth = 60 // 每小时60px

      const left =
        (startHour - baseHour) * hourWidth + (startMinute / 60) * hourWidth
      const width =
        (endHour - startHour) * hourWidth +
        ((endMinute - startMinute) / 60) * hourWidth

      return {
        left: `${left}px`,
        width: `${Math.max(width, 40)}px`
      }
    },
    formatGanttDuration(task) {
      if (!task.planStartTime || !task.planEndTime) return ''
      const start = task.planStartTime.split(' ')[1]
      const end = task.planEndTime.split(' ')[1]
      return `${start}-${end}`
    },

    // ========== 质检相关方法 ==========
    async loadInspectionList() {
      this.inspectionLoading = true
      try {
        const res = await getInspectionList(this.inspectionParams)
        if (res.code === 200) {
          this.inspectionList = res.data.list || []
          this.inspectionTotal = res.data.total || 0
        } else {
          // 使用模拟数据
          this.inspectionList = this.getMockInspectionData()
          this.inspectionTotal = this.inspectionList.length
        }
      } catch (error) {
        console.error('加载质检列表失败:', error)
        this.inspectionList = this.getMockInspectionData()
        this.inspectionTotal = this.inspectionList.length
      } finally {
        this.inspectionLoading = false
      }
    },
    getMockInspectionData() {
      return [
        {
          id: 1,
          inspectionNo: 'QC-20260110-001',
          taskNo: 'TB-001',
          batchNo: 'BT20260110001',
          materialCode: 'MT001',
          inspectionType: 'process',
          sampleQty: 5,
          passQty: 5,
          failQty: 0,
          result: 'pass',
          inspectorName: '张三',
          inspectionTime: '2026-01-10 10:30',
          defectType: ''
        },
        {
          id: 2,
          inspectionNo: 'QC-20260110-002',
          taskNo: 'TB-002',
          batchNo: 'BT20260110002',
          materialCode: 'MT002',
          inspectionType: 'final',
          sampleQty: 10,
          passQty: 8,
          failQty: 2,
          result: 'fail',
          inspectorName: '李四',
          inspectionTime: '2026-01-10 14:00',
          defectType: '划痕,气泡'
        }
      ]
    },
    handleInspectionSizeChange(size) {
      this.inspectionParams.pageSize = size
      this.loadInspectionList()
    },
    handleInspectionPageChange(page) {
      this.inspectionParams.pageNum = page
      this.loadInspectionList()
    },
    getInspectionTypeText(type) {
      const map = {
        incoming: '来料检',
        process: '过程检',
        final: '成品检',
        patrol: '巡检'
      }
      return map[type] || type
    },
    getInspectionResultType(result) {
      const map = {
        pass: 'success',
        fail: 'danger',
        pending: 'warning'
      }
      return map[result] || 'info'
    },
    getInspectionResultText(result) {
      const map = {
        pass: '合格',
        fail: '不合格',
        pending: '待复检'
      }
      return map[result] || result
    },
    openAddInspection() {
      this.$message.info('添加质检功能开发中...')
    },
    viewInspectionDetail(row) {
      this.$message.info(`查看质检详情: ${row.inspectionNo}`)
    },
    handleDisposition(row) {
      this.$message.info(`处置不合格品: ${row.inspectionNo}`)
    },

    // ========== 审批相关方法 ==========
    handleSubmitApproval(row) {
      this.$confirm('确定提交该排程进行审批？', '提交审批', {
        type: 'warning'
      })
        .then(async() => {
          try {
            const res = await submitScheduleApproval(row.id)
            if (res.code === 200) {
              this.$message.success('已提交审批')
              this.loadScheduleList()
            } else {
              this.$message.error(res.msg || '提交失败')
            }
          } catch (error) {
            this.$message.error('提交失败')
          }
        })
        .catch(() => {})
    },
    handleApproveSchedule(row) {
      this.$prompt('请输入审批意见', '审批排程', {
        confirmButtonText: '批准',
        cancelButtonText: '驳回',
        inputPlaceholder: '请输入审批意见（可选）',
        distinguishCancelAndClose: true
      })
        .then(async({ value }) => {
          try {
            const res = await approveSchedule(row.id, true, value || '')
            if (res.code === 200) {
              this.$message.success('审批通过')
              this.loadScheduleList()
            } else {
              this.$message.error(res.msg || '审批失败')
            }
          } catch (error) {
            this.$message.error('审批失败')
          }
        })
        .catch(async(action) => {
          if (action === 'cancel') {
            try {
              const res = await approveSchedule(row.id, false, '驳回')
              if (res.code === 200) {
                this.$message.warning('已驳回')
                this.loadScheduleList()
              }
            } catch (error) {
              this.$message.error('操作失败')
            }
          }
        })
    },

    // ========== 紧急插单 ==========
    openUrgentInsert() {
      this.$message.info('紧急插单功能开发中...')
    }
  }
}
</script>

<style lang="scss" scoped>
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
.board-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.stat-box {
  display: flex;
  align-items: center;
  padding: 20px;
  border-radius: 8px;
  color: #fff;
  .stat-icon {
    width: 50px;
    height: 50px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 50%;
    i {
      font-size: 24px;
    }
  }
  .stat-info {
    margin-left: 15px;
    .stat-value {
      font-size: 28px;
      font-weight: bold;
    }
    .stat-label {
      font-size: 14px;
      opacity: 0.9;
    }
  }
}
.process-card {
  .process-stats {
    .stat-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px dashed #eee;
      &:last-child {
        border-bottom: none;
      }
    }
  }
}
.equipment-card {
  padding: 15px;
  border: 1px solid #eee;
  border-radius: 8px;
  transition: all 0.3s;
  &.running {
    border-color: #67c23a;
    background: #f0f9eb;
  }
  .eq-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
    .eq-name {
      font-weight: bold;
    }
  }
  .eq-body {
    .eq-info {
      font-size: 13px;
      color: #666;
      margin-bottom: 5px;
    }
  }
}

.schedule-info {
  .info-item {
    font-size: 14px;
    line-height: 32px;
    .label {
      color: #606266;
      font-weight: 500;
    }
  }
}

// 甘特图样式
.gantt-container {
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  overflow-x: auto;
}

.gantt-header {
  display: flex;
  background: #f5f7fa;
  border-bottom: 1px solid #ebeef5;
  font-weight: bold;
  font-size: 13px;
}

.gantt-task-col {
  width: 150px;
  min-width: 150px;
  padding: 10px;
  border-right: 1px solid #ebeef5;
}

.gantt-timeline {
  display: flex;
  flex: 1;
}

.gantt-hour {
  width: 60px;
  min-width: 60px;
  text-align: center;
  padding: 10px 0;
  border-right: 1px solid #ebeef5;
  font-size: 12px;
  color: #606266;
}

.gantt-body {
  min-height: 200px;
}

.gantt-row {
  display: flex;
  border-bottom: 1px solid #ebeef5;
  &:hover {
    background: #f5f7fa;
  }
}

.gantt-task-info {
  width: 150px;
  min-width: 150px;
  padding: 8px 10px;
  border-right: 1px solid #ebeef5;
  .task-name {
    font-weight: 500;
    font-size: 13px;
    color: #303133;
  }
  .task-equipment {
    font-size: 12px;
    color: #909399;
    margin-top: 2px;
  }
}

.gantt-timeline-row {
  flex: 1;
  position: relative;
  height: 50px;
  background: repeating-linear-gradient(
    90deg,
    transparent,
    transparent 59px,
    #ebeef5 59px,
    #ebeef5 60px
  );
}

.gantt-bar {
  position: absolute;
  top: 8px;
  height: 34px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  padding: 0 8px;
  color: #fff;
  font-size: 12px;
  overflow: hidden;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    transform: scaleY(1.1);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }

  // 工序颜色
  &.printing {
    background: linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%);
  }
  &.coating {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  }
  &.rewinding {
    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  }
  &.slitting {
    background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  }
  &.stripping {
    background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
  }

  // 状态样式
  &.completed {
    opacity: 0.7;
    background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
    color: #606266;
  }
  &.in-progress {
    animation: pulse 2s infinite;
  }

  .bar-text {
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

@keyframes pulse {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
  100% {
    opacity: 1;
  }
}

.gantt-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: #909399;
  p {
    margin-top: 10px;
  }
}

.gantt-legend {
  display: flex;
  gap: 20px;
  padding: 15px;
  border-top: 1px solid #ebeef5;
  background: #fafafa;

  .legend-item {
    display: flex;
    align-items: center;
    font-size: 12px;
    color: #606266;

    .dot {
      width: 12px;
      height: 12px;
      border-radius: 3px;
      margin-right: 5px;

      &.printing {
        background: linear-gradient(135deg, #a18cd1, #fbc2eb);
      }
      &.coating {
        background: linear-gradient(135deg, #667eea, #764ba2);
      }
      &.rewinding {
        background: linear-gradient(135deg, #f093fb, #f5576c);
      }
      &.slitting {
        background: linear-gradient(135deg, #4facfe, #00f2fe);
      }
      &.stripping {
        background: linear-gradient(135deg, #43e97b, #38f9d7);
      }
      &.completed {
        background: linear-gradient(135deg, #a8edea, #fed6e3);
      }
      &.in-progress {
        background: #e6a23c;
      }
    }
  }
}
</style>
