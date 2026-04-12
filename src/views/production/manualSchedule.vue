<template>
  <div class="app-container manual-schedule-page" :style="{ height: pageHeight + 'px' }">
    <el-tabs v-model="activeTab" type="border-card" @tab-click="onTabChange">
      <!-- Tab 1: 订单排程主页 -->
      <el-tab-pane label="订单排程" name="orders">
        <el-card shadow="never">
          <div slot="header">
            <span>待排程订单列表</span>
            <span class="pending-summary-text">
              （已选{{ pendingSelectedStats.rolls }}卷 / {{ pendingSelectedStats.area.toFixed(2) }}㎡，默认目标{{ pendingDailyAreaTarget }}㎡）
            </span>
            <el-button
              style="float: right; margin-left: 8px"
              type="success"
              size="small"
              icon="el-icon-search"
              @click="handleBatchScanStock"
            >查找库存并锁定</el-button>
            <el-button
              style="float: right; margin-left: 8px"
              type="warning"
              size="small"
              plain
              @click="toggleShowCompletedRows"
            >{{ showCompletedRows ? '隐藏已拍完' : '显示已拍完' }}</el-button>
            <div style="float: right; display: inline-flex; align-items: center; margin-left: 8px;">
              <el-input
                v-model.trim="pendingQuery.materialCode"
                style="width: 220px"
                size="small"
                clearable
                placeholder="输入料号搜索欠单"
                @keyup.enter.native="handlePendingMaterialSearch"
                @clear="handlePendingMaterialClear"
              >
                <el-button slot="append" icon="el-icon-search" @click="handlePendingMaterialSearch" />
              </el-input>
              <span
                v-if="pendingQuery.materialCode"
                style="line-height: 32px; color: #409EFF; margin-left: 8px; white-space: nowrap;"
              >欠料总平米数（当前料号）：{{ Number(pendingMaterialOweArea || 0).toFixed(2) }}㎡</span>
            </div>
            <el-button style="float: right" type="primary" size="small" icon="el-icon-refresh" @click="loadOrders">刷新</el-button>
          </div>

          <el-alert
            v-if="pendingLockRiskSummary.riskRows > 0"
            type="warning"
            :closable="false"
            style="margin-bottom: 10px"
            :title="`锁料风险提醒：当前有 ${pendingLockRiskSummary.riskRows} 条待排订单存在未锁定面积，共 ${pendingLockRiskSummary.riskArea} ㎡。建议优先锁料后再确认排程。`"
          />

          <el-table
            ref="pendingTable"
            v-loading="loading"
            :data="orderList"
            :row-key="pendingRowKey"
            border
            stripe
            style="width: 100%"
            :max-height="tableMaxHeight"
            class="manual-schedule-table manual-schedule-orders-table"
            :row-class-name="tableRowClassName"
            @selection-change="handlePendingSelectionChange"
          >
            <el-table-column type="selection" :reserve-selection="true" width="40" align="center" />
            <el-table-column type="index" label="序号" width="54" align="center" />
            <el-table-column prop="order_no" label="订单编号" min-width="132" column-key="order_no" show-overflow-tooltip />
            <el-table-column label="订单信息" align="center" header-align="center" class-name="group-col" header-class-name="group-header">
              <el-table-column label="客户 / 产品 / 规格" min-width="250" class-name="order-card-col" header-class-name="order-card-header" column-key="material_code">
                <template slot-scope="scope">
                  <div class="order-info-card">
                    <div class="order-info-line order-info-customer">
                      <span class="order-info-label">客户</span>
                      <span class="order-info-value">{{ scope.row.customer_name || '-' }}</span>
                    </div>
                    <div class="order-info-line">
                      <span class="order-info-label">产品</span>
                      <span class="order-info-value code">{{ scope.row.material_code || '-' }}</span>
                    </div>
                    <div class="order-info-line">
                      <span class="order-info-label">规格</span>
                      <span class="order-info-value">{{ formatOrderSpec(scope.row) || '-' }}</span>
                    </div>
                  </div>
                </template>
              </el-table-column>
            </el-table-column>
            <el-table-column label="排程信息" align="center" header-align="center" class-name="group-col" header-class-name="group-header">
              <el-table-column label="本次排程" width="98" align="center" sortable="custom" column-key="schedule_qty">
                <template slot-scope="scope">
                  <el-input
                    v-model.number="scope.row.schedule_qty"
                    min="0"
                    :max="Number(scope.row.remaining_qty)"
                    size="mini"
                    inputmode="numeric"
                  />
                </template>
              </el-table-column>
              <el-table-column label="工序时间" min-width="176" align="left" column-key="process_schedule">
                <template slot-scope="scope">
                  <div class="process-time-card">
                    <div class="process-time-line">
                      <span class="process-time-label">涂布</span>
                      <span class="process-time-value">
                        <el-tag v-if="scope.row.schedule_type === 'STOCK'" type="success" size="mini">够料</el-tag>
                        <el-tag v-else-if="isRowTerminated(scope.row)" type="danger" size="mini">已终止</el-tag>
                        <el-tag v-else-if="scope.row.coating_date" type="success" size="mini">{{ scope.row.coating_date | formatDate }}</el-tag>
                        <el-button v-else type="text" class="process-time-action" @click="handleCoatingDateFocus(scope.row)">算涂布</el-button>
                      </span>
                    </div>
                    <div class="process-time-line">
                      <span class="process-time-label">复卷</span>
                      <span class="process-time-value">
                        <el-tag v-if="isRowTerminated(scope.row)" type="danger" size="mini">已终止</el-tag>
                        <el-tag v-else-if="scope.row.rewinding_date" type="primary" size="mini">{{ scope.row.rewinding_date | formatDate }}</el-tag>
                        <el-button v-else-if="canJumpToRewinding(scope.row)" type="text" class="process-time-action" @click="handleRewindingDateFocus(scope.row)">去复卷排程</el-button>
                        <span v-else class="process-time-empty">-</span>
                      </span>
                    </div>
                    <div class="process-time-line">
                      <span class="process-time-label">分切</span>
                      <span class="process-time-value">
                        <el-tag v-if="isRowTerminated(scope.row)" type="danger" size="mini">已终止</el-tag>
                        <el-tag v-else-if="scope.row.packaging_date" type="warning" size="mini">{{ scope.row.packaging_date | formatDate }}</el-tag>
                        <el-button v-else-if="canJumpToSlitting(scope.row)" type="text" class="process-time-action" @click="handlePackagingDateFocus(scope.row)">去分切排程</el-button>
                        <span v-else class="process-time-empty">-</span>
                      </span>
                    </div>
                  </div>
                </template>
              </el-table-column>
            </el-table-column>
            <el-table-column label="数量信息" align="center" header-align="center" class-name="group-col" header-class-name="group-header">
              <el-table-column label="卷数概览" width="112" align="center" column-key="order_qty">
                <template slot-scope="scope">
                  <div class="summary-cell summary-cell-compact">
                    <div><span>订单</span><strong>{{ scope.row.order_qty }}</strong></div>
                    <div><span>未排</span><strong>{{ scope.row.remaining_qty }}</strong></div>
                    <div><span>已完</span><strong>{{ scope.row.completed_qty }}</strong></div>
                  </div>
                </template>
              </el-table-column>
              <el-table-column label="面积概览(㎡)" width="138" align="center" column-key="owe_area">
                <template slot-scope="scope">
                  <div class="summary-cell">
                    <div><span>欠平</span><strong>{{ scope.row.owe_area }}</strong></div>
                    <div><span>已锁</span><strong>{{ Number(scope.row.locked_area_total || 0).toFixed(2) }}</strong></div>
                    <div><span>未锁</span><strong>{{ Number(scope.row.unlocked_area || 0).toFixed(2) }}</strong></div>
                    <div><span>建议</span><strong :class="Number(scope.row.unlocked_area || 0) > 0 ? 'text-warning' : 'text-success'">{{ Number(scope.row.unlocked_area || 0).toFixed(2) }}</strong></div>
                  </div>
                </template>
              </el-table-column>
            </el-table-column>
            <el-table-column label="状态信息" align="center" header-align="center" class-name="group-col" header-class-name="group-header">
              <el-table-column prop="priority_score" label="优先级" width="72" align="right" class-name="narrow-col" header-class-name="narrow-col" column-key="priority_score" />
              <el-table-column label="完成" width="64" align="center" class-name="narrow-col" header-class-name="narrow-col" column-key="is_completed">
                <template slot-scope="scope">
                  <el-tag :type="scope.row.is_completed === 'Y' ? 'success' : 'info'">
                    {{ scope.row.is_completed }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="锁定状态" width="92" align="center" class-name="narrow-col" header-class-name="narrow-col">
                <template slot-scope="scope">
                  <el-tag :type="lockStatusType(scope.row.lock_status)">{{ lockStatusText(scope.row.lock_status) }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="齐套状态" width="92" align="center" class-name="narrow-col" header-class-name="narrow-col">
                <template slot-scope="scope">
                  <el-tag :type="readinessStatusType(scope.row.readiness_status_code)">{{ readinessStatusText(scope.row.readiness_status_code, scope.row.readiness_status_text) }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="锁料风险" width="88" align="center" class-name="narrow-col" header-class-name="narrow-col">
                <template slot-scope="scope">
                  <el-badge v-if="hasLockRisk(scope.row)" is-dot type="danger">
                    <span style="font-size: 12px; color: #F56C6C;">风险</span>
                  </el-badge>
                  <span v-else style="font-size: 12px; color: #67C23A;">正常</span>
                </template>
              </el-table-column>
            </el-table-column>
            <el-table-column label="操作" width="118" align="center">
              <template slot-scope="scope">
                <div class="op-actions">
                  <el-button
                    class="op-main-btn"
                    size="mini"
                    :disabled="isReadinessBlocked(scope.row)"
                    @click="handleConfirmSchedule(scope.row)"
                  >
                    确认
                  </el-button>
                  <el-dropdown size="mini" trigger="click" @command="handleOrderActionCommand">
                    <el-button class="op-more-btn" size="mini" :disabled="Number(scope.row.remaining_qty) <= 0">更多<i class="el-icon-arrow-down el-icon--right" /></el-button>
                    <el-dropdown-menu slot="dropdown">
                      <el-dropdown-item :command="{ action: 'stock', row: scope.row }">选库存</el-dropdown-item>
                      <el-dropdown-item :command="{ action: 'coating', row: scope.row }">计算涂布</el-dropdown-item>
                      <el-dropdown-item :command="{ action: 'directReport', row: scope.row }">直接报工</el-dropdown-item>
                      <el-dropdown-item :command="{ action: 'materialIssue', row: scope.row }">领料登记</el-dropdown-item>
                      <el-dropdown-item :command="{ action: 'urgentPreempt', row: scope.row }">急单插单抢料</el-dropdown-item>
                      <el-dropdown-item :command="{ action: 'reset', row: scope.row }" divided>清空重排</el-dropdown-item>
                    </el-dropdown-menu>
                  </el-dropdown>
                </div>
              </template>
            </el-table-column>
          </el-table>

          <div style="margin-top: 12px; text-align: right;">
            <el-pagination
              :current-page="pendingPage"
              :page-size="pendingPageSize"
              :page-sizes="[20, 50, 100, 200]"
              layout="total, sizes, prev, pager, next, jumper"
              :total="pendingTotal"
              @size-change="handlePendingSizeChange"
              @current-change="handlePendingPageChange"
            />
          </div>
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
                需求面积: <strong>{{ stockMatchResult.requiredArea }}</strong> ㎡ |
                库存可用: <strong>{{ stockMatchResult.totalAvailableArea }}</strong> ㎡ |
                {{ stockMatchResult.isSufficient ? '✓ 库存充足' : `⚠ 缺口 ${stockMatchResult.shortage} 卷，需要涂布` }}
              </span>
            </el-alert>
            <div class="stock-spec-tip">
              需求规格：{{ stockMatchResult.specText }} ｜ 卷数：{{ stockMatchResult.requiredQty }} ｜ 平米数：{{ stockMatchResult.requiredArea }}㎡
            </div>

            <el-form :inline="true" class="stock-scan-form">
              <el-form-item label="批量扫码">
                <el-input
                  v-model="stockScanCodes"
                  type="textarea"
                  :rows="2"
                  placeholder="扫码批次号/二维码（换行、逗号或空格分隔）"
                  style="width: 420px"
                />
              </el-form-item>
              <el-form-item>
                <el-button type="primary" size="mini" @click="applyStockScanSelection">匹配并分配</el-button>
                <el-button size="mini" @click="clearStockScan">清空</el-button>
              </el-form-item>
            </el-form>

            <el-table
              ref="stockTable"
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
              <el-table-column label="分配面积(㎡)" width="140" align="center">
                <template slot-scope="scope">
                  <el-input-number
                    v-model="scope.row.allocate_area"
                    :min="0"
                    :max="Number(scope.row.available_area)"
                    :step="0.01"
                    :precision="2"
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
            <div style="margin-bottom: 10px; color: #303133; font-weight: 600;">
              当前排程料号：{{ (currentOrder && currentOrder.material_code) || coatingRequirement.material_code || coatingRequirement.material_prefix || '-' }}
            </div>
            <el-descriptions :column="2" border>
              <el-descriptions-item label="匹配前缀">
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
                  @change="handlePlannedAreaChange"
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

            <el-divider />
            <div style="margin-bottom: 8px; color: #606266; font-weight: 500;">计划面积覆盖明细（按优先级）</div>
            <el-table :data="coatingRequirement.details || []" border size="mini" max-height="260">
              <el-table-column prop="sort_no" label="#" width="50" align="center" />
              <el-table-column prop="order_no" label="订单号" width="140" />
              <el-table-column prop="priority_score" label="优先级" width="80" align="right" />
              <el-table-column prop="remaining_area" label="订单待涂布(㎡)" width="130" align="right">
                <template slot-scope="scope">{{ Number(scope.row.remaining_area || 0).toFixed(2) }}</template>
              </el-table-column>
              <el-table-column prop="included_area" label="纳入面积(㎡)" width="130" align="right">
                <template slot-scope="scope">{{ Number(scope.row.included_area || 0).toFixed(2) }}</template>
              </el-table-column>
              <el-table-column label="是否纳入" width="90" align="center">
                <template slot-scope="scope">
                  <el-switch
                    v-model="scope.row._selected"
                    active-color="#13ce66"
                    inactive-color="#dcdfe6"
                    @change="handleCoatingIncludeToggle"
                  />
                </template>
              </el-table-column>
            </el-table>
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
            <el-button style="float: right; margin-left: 8px" type="success" size="small" icon="el-icon-plus" @click="handleAddManualCoating">新增手工排程</el-button>
            <el-button style="float: right" type="primary" size="small" icon="el-icon-refresh" @click="loadCoatingSchedules(true)">刷新</el-button>
          </div>

          <el-table
            ref="coatingTable"
            v-loading="coatingLoading"
            :data="coatingList"
            class="manual-schedule-table process-schedule-table"
            size="mini"
            border
            stripe
            :fit="false"
            style="width: 100%"
            :max-height="tableMaxHeight"
            :row-class-name="coatingRowClassName"
            @sort-change="handleCoatingSortChange"
          >
            <el-table-column prop="schedule_id" label="排程号" width="98" align="center" sortable="custom" column-key="schedule_id">
              <template slot-scope="scope">
                {{ scope.row.id || scope.row.schedule_id || '-' }}
              </template>
            </el-table-column>
            <el-table-column prop="related_order_nos" label="关联订单号" width="170" show-overflow-tooltip sortable="custom" column-key="related_order_nos">
              <template slot-scope="scope">
                {{ scope.row.related_order_nos || scope.row.order_nos || scope.row.order_no }}
              </template>
            </el-table-column>
            <el-table-column prop="material_code" label="产品编码" width="230" show-overflow-tooltip sortable="custom" column-key="material_code">
              <template slot-scope="scope">
                <el-autocomplete
                  v-if="scope.row.__editing && scope.row.__manual"
                  v-model="scope.row.material_code"
                  size="small"
                  :fetch-suggestions="queryTapeSpecByMaterialCode"
                  popper-class="manual-material-autocomplete-popper"
                  placeholder="请输入料号"
                  :trigger-on-focus="false"
                  @input="handleManualCoatingMaterialInput(scope.row, $event)"
                  @select="handleManualCoatingMaterialSelect(scope.row, $event)"
                >
                  <template slot-scope="{ item }">
                    <div style="display:flex;flex-direction:column;gap:2px;line-height:1.35;">
                      <span style="font-weight:600;color:#303133;white-space:normal;word-break:break-all;">{{ item.materialCode }}</span>
                      <span style="color:#909399;white-space:normal;word-break:break-all;">{{ item.productName || '-' }}</span>
                    </div>
                  </template>
                </el-autocomplete>
                <span v-else>{{ scope.row.material_code || '-' }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="material_name" label="产品名称" width="130" show-overflow-tooltip sortable="custom" column-key="material_name" />
            <el-table-column label="厚度(μm)" width="92" align="center" sortable="custom" column-key="thickness">
              <template slot-scope="scope">
                {{ formatThickness(scope.row) }}
              </template>
            </el-table-column>
            <el-table-column label="涂布宽度(mm)" width="122" align="center" sortable="custom" column-key="coating_width">
              <template slot-scope="scope">
                <el-input-number
                  v-if="scope.row.__editing"
                  v-model="scope.row.coating_width"
                  :fit="false"
                  :min="0"
                  :step="1"
                  size="small"
                  controls-position="right"
                  @change="handleCoatingWidthChange(scope.row)"
                />
                <span v-else>{{ scope.row.coating_width || '-' }}</span>
              </template>
            </el-table-column>
            <el-table-column label="涂布长度(米)" width="122" align="center" sortable="custom" column-key="coating_length">
              <template slot-scope="scope">
                <el-input-number
                  v-if="scope.row.__editing"
                  v-model="scope.row.coating_length"
                  :min="0"
                  :step="1"
                  size="small"
                  controls-position="right"
                  @change="handleCoatingLengthChange(scope.row)"
                />
                <span v-else>{{ scope.row.coating_length || '-' }}</span>
              </template>
            </el-table-column>
            <el-table-column label="涂布速度(米/分)" width="118" align="center" sortable="custom" column-key="coating_speed">
              <template slot-scope="scope">
                {{ formatCoatingSpeed(scope.row) }}
              </template>
            </el-table-column>
            <el-table-column label="计划开始" width="172" align="center" sortable="custom" column-key="coating_schedule_date">
              <template slot-scope="scope">
                <el-date-picker
                  v-if="scope.row.__editing"
                  v-model="scope.row.coating_schedule_date"
                  type="datetime"
                  size="small"
                  placeholder="选择日期时间"
                  format="yyyy-MM-dd HH:mm"
                  value-format="yyyy-MM-dd HH:mm:ss"
                  @change="handleCoatingDateChange(scope.row, { fromUser: true })"
                />
                <span v-else>{{ formatDateTime(scope.row.coating_schedule_date) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="插单方式" width="110" align="center">
              <template slot-scope="scope">
                <el-select
                  v-if="scope.row.__editing"
                  v-model="scope.row.insert_mode"
                  size="small"
                  @change="handleCoatingInsertModeChange(scope.row)"
                >
                  <el-option label="按时间后" value="AFTER_TIME" />
                  <el-option label="按订单后" value="AFTER_ORDER" />
                </el-select>
                <span v-else>{{ formatInsertMode(scope.row.insert_mode) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="插单锚点" width="220" align="center" show-overflow-tooltip>
              <template slot-scope="scope">
                <el-select
                  v-if="scope.row.__editing && scope.row.insert_mode === 'AFTER_ORDER'"
                  v-model="scope.row.anchor_schedule_id"
                  size="small"
                  filterable
                  clearable
                  placeholder="选择在哪单后"
                  @change="handleCoatingAnchorChange(scope.row)"
                >
                  <el-option
                    v-for="anchor in getCoatingAnchorOptions(scope.row)"
                    :key="anchor.id"
                    :label="coatingAnchorLabel(anchor)"
                    :value="anchor.id"
                  />
                </el-select>
                <span v-else>{{ displayCoatingAnchor(scope.row) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="迁移策略" width="110" align="center">
              <template slot-scope="scope">
                <el-select
                  v-if="scope.row.__editing"
                  v-model="scope.row.rebalance_mode"
                  size="small"
                  @change="handleCoatingDateChange(scope.row)"
                >
                  <el-option label="人工选跨线" value="MANUAL_CROSS_LINE" />
                  <el-option label="同线顺延" value="SAME_LINE" />
                </el-select>
                <span v-else>{{ formatRebalanceMode(scope.row.rebalance_mode) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="用时" width="92" align="center" sortable="custom" column-key="coating_duration">
              <template slot-scope="scope">
                {{ formatCoatingDuration(scope.row) }}
              </template>
            </el-table-column>
            <el-table-column label="机台" width="146" align="center" sortable="custom" column-key="coating_equipment">
              <template slot-scope="scope">
                <el-select
                  v-if="scope.row.__editing"
                  v-model="scope.row.coating_equipment"
                  size="small"
                  placeholder="选择机台"
                  @change="handleCoatingEquipmentChange(scope.row)"
                  @visible-change="handleCoatingEquipmentDropdownVisible(scope.row, $event)"
                >
                  <el-option
                    v-for="eq in getCoatingEquipmentOptions(scope.row)"
                    :key="eq.id"
                    :label="coatingEquipmentOptionLabel(eq)"
                    :value="String(eq.id)"
                    :disabled="!!eq.unavailableReason"
                  />
                </el-select>
                <span v-else>{{ equipmentName(scope.row.coating_equipment) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="92" align="center" sortable="custom" column-key="status">
              <template slot-scope="scope">
                <el-tag :type="statusType(scope.row.status)">
                  {{ statusText(scope.row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="132" align="center">
              <template slot-scope="scope">
                <div class="op-actions">
                  <el-button
                    class="op-main-btn"
                  :fit="false"
                    size="mini"
                    :disabled="scope.row.__editing && (!scope.row.coating_equipment || (scope.row.insert_mode === 'AFTER_ORDER' && !scope.row.anchor_schedule_id))"
                    @click="handleCoatingEditAction(scope.row)"
                  >
                    {{ scope.row.__editing ? '保存' : '修改' }}
                  </el-button>
                  <el-dropdown size="mini" trigger="click" :disabled="isRewindingLocked(scope.row)" @command="handleScheduleActionCommand">
                    <el-button class="op-more-btn" size="mini" :disabled="isRewindingLocked(scope.row)">更多<i class="el-icon-arrow-down el-icon--right" /></el-button>
                    <el-dropdown-menu slot="dropdown">
                      <el-dropdown-item :command="{ action: 'reduce', row: scope.row }">减量</el-dropdown-item>
                      <el-dropdown-item :command="{ action: 'terminate', row: scope.row }" divided>终止</el-dropdown-item>
                      <el-dropdown-item :command="{ action: 'reset', row: scope.row }" divided>清空重排</el-dropdown-item>
                    </el-dropdown-menu>
                  </el-dropdown>
                </div>
              </template>
            </el-table-column>
          </el-table>
          <div style="margin-top: 12px; text-align: right;">
            <el-pagination
              :current-page="coatingPage"
              :page-size="coatingPageSize"
              :page-sizes="[20, 50, 100, 200]"
              layout="total, sizes, prev, pager, next, jumper"
              :total="coatingTotal"
              @size-change="handleCoatingSizeChange"
              @current-change="handleCoatingPageChange"
            />
          </div>
        </el-card>
      </el-tab-pane>

      <!-- Tab 3: 复卷排程 -->
      <el-tab-pane label="复卷排程" name="rewinding">
        <el-card shadow="never">
          <div slot="header">
            <span>待复卷订单列表（按涂布日期排序）</span>
            <el-button style="float: right; margin-left: 8px" type="success" size="small" icon="el-icon-plus" @click="handleAddManualRewinding">手动添加</el-button>
            <el-button style="float: right" type="primary" size="small" icon="el-icon-refresh" @click="loadRewindingOrders">刷新</el-button>
          </div>
          <el-alert
            v-if="rewindingLockSummary.unlockedRows > 0"
            type="warning"
            :closable="false"
            style="margin-bottom: 10px"
            :title="`锁料提醒：当前有 ${rewindingLockSummary.unlockedRows} 条待复卷订单存在未锁定面积，共 ${rewindingLockSummary.unlockedArea} ㎡。请优先处理锁料后再确认排程。`"
          />

          <el-table
            ref="rewindingTable"
            v-loading="rewindingLoading"
            :data="rewindingList"
            class="manual-schedule-table process-schedule-table"
            size="mini"
            border
            stripe
            style="width: 100%"
            :max-height="tableMaxHeight"
            :row-class-name="rewindingRowClassName"
            @sort-change="handleRewindingSortChange"
          >
            <el-table-column type="index" label="序号" width="52" align="center" />
            <el-table-column label="排程号" width="102" align="center">
              <template slot-scope="scope">
                <el-input-number
                  v-if="scope.row.__editing && scope.row.__manual"
                  v-model="scope.row.schedule_id"
                  :min="1"
                  :step="1"
                  size="mini"
                  controls-position="right"
                />
                <span v-else>{{ scope.row.schedule_id || '-' }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="coating_date" label="涂布时间" width="124" sortable="custom" column-key="coating_date">
              <template slot-scope="scope">
                <el-tag v-if="scope.row.schedule_type === 'STOCK'" type="success">有料</el-tag>
                <el-tag v-else type="success" class="two-line-time-tag">
                  <span class="two-line-time-text">{{ timeWindowLine(formatCoatingTimeWindow(scope.row), 0) }}</span>
                  <span class="two-line-time-text">{{ timeWindowLine(formatCoatingTimeWindow(scope.row), 1) }}</span>
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="order_no" label="订单号" width="112" sortable="custom" column-key="order_no" />
            <el-table-column prop="customer_name" label="客户" width="86" sortable="custom" column-key="customer_name" show-overflow-tooltip />
            <el-table-column prop="material_code" label="产品编码" width="230" class-name="wrap-col" header-class-name="wrap-col" show-overflow-tooltip sortable="custom" column-key="material_code">
              <template slot-scope="scope">
                <el-autocomplete
                  v-if="scope.row.__editing && scope.row.__manual"
                  v-model="scope.row.material_code"
                  size="small"
                  :fetch-suggestions="queryTapeSpecByMaterialCode"
                  popper-class="manual-material-autocomplete-popper"
                  placeholder="请输入料号"
                  :trigger-on-focus="false"
                  @input="handleManualRewindingMaterialInput(scope.row, $event)"
                  @select="handleManualRewindingMaterialSelect(scope.row, $event)"
                >
                  <template slot-scope="{ item }">
                    <div style="display:flex;flex-direction:column;gap:2px;line-height:1.35;">
                      <span style="font-weight:600;color:#303133;white-space:normal;word-break:break-all;">{{ item.materialCode }}</span>
                      <span style="color:#909399;white-space:normal;word-break:break-all;">{{ item.productName || '-' }}</span>
                    </div>
                  </template>
                </el-autocomplete>
                <span v-else>{{ scope.row.material_code || '-' }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="material_name" label="产品名称" width="132" class-name="wrap-col" header-class-name="wrap-col" show-overflow-tooltip sortable="custom" column-key="material_name" />
            <el-table-column label="规格(厚*宽*长)" width="132" align="right" class-name="wrap-col" header-class-name="wrap-col" sortable="custom" column-key="spec">
              <template slot-scope="scope">
                {{ formatOrderSpec(scope.row) }}
              </template>
            </el-table-column>
            <el-table-column prop="schedule_qty" label="卷数" width="72" align="right" sortable="custom" column-key="schedule_qty">
              <template slot-scope="scope">
                {{ Number(scope.row.schedule_qty || 0) }}
              </template>
            </el-table-column>
            <el-table-column label="已排复卷(㎡)" width="108" align="right" sortable="custom" column-key="rewinding_area">
              <template slot-scope="scope">
                {{ formatArea(getPlannedRewindingArea(scope.row)) }}
              </template>
            </el-table-column>
            <el-table-column label="复卷宽度" width="112" align="center" sortable="custom" column-key="rewinding_width">
              <template slot-scope="scope">
                <el-input-number
                  v-if="scope.row.__editing"
                  v-model="scope.row.rewinding_width"
                  :min="1"
                  :step="1"
                  size="mini"
                  controls-position="right"
                />
                <span v-else>{{ scope.row.rewinding_width || '-' }}</span>
              </template>
            </el-table-column>
            <el-table-column label="复卷数量" width="86" align="right" sortable="custom" column-key="rewinding_roll_count">
              <template slot-scope="scope">
                {{ getRewindingRollCount(scope.row) }}
              </template>
            </el-table-column>
            <el-table-column label="复卷速度(米/分)" width="118" align="center" sortable="custom" column-key="rewinding_speed">
              <template slot-scope="scope">
                {{ formatRewindingSpeed(scope.row) }}
              </template>
            </el-table-column>
            <el-table-column label="计划开始" width="170" sortable="custom" column-key="rewinding_date">
              <template slot-scope="scope">
                <el-date-picker
                  v-if="scope.row.__editing"
                  v-model="scope.row.rewinding_date"
                  type="datetime"
                  size="small"
                  placeholder="选择日期"
                  format="yyyy-MM-dd HH:mm"
                  value-format="yyyy-MM-dd HH:mm:ss"
                  @change="handleRewindingDateChange(scope.row)"
                />
                <span v-else>{{ formatDateTime(scope.row.rewinding_date) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="复卷用时" width="92" align="center" sortable="custom" column-key="rewinding_duration">
              <template slot-scope="scope">
                {{ formatRewindingDuration(scope.row) }}
              </template>
            </el-table-column>
            <el-table-column label="锁料提醒" width="108" align="center">
              <template slot-scope="scope">
                <el-tag v-if="getUnlockedArea(scope.row) > 0" type="warning">未锁{{ getUnlockedArea(scope.row).toFixed(0) }}㎡</el-tag>
                <el-tag v-else type="success">已锁定</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="rewinding_equipment" label="复卷机台" width="124" sortable="custom" column-key="rewinding_equipment">
              <template slot-scope="scope">
                <el-select
                  v-if="scope.row.__editing"
                  v-model="scope.row.rewinding_equipment"
                  size="small"
                  placeholder="机台号"
                  @change="handleRewindingEquipmentChange(scope.row)"
                  @visible-change="handleRewindingEquipmentDropdownVisible(scope.row, $event)"
                >
                  <el-option
                    v-for="eq in getRewindingEquipmentOptions(scope.row)"
                    :key="eq.id"
                    :label="rewindingEquipmentOptionLabel(eq)"
                    :value="eq.equipmentCode"
                    :disabled="!!eq.unavailableReason"
                  />
                </el-select>
                <span v-else>{{ scope.row.rewinding_equipment || '-' }}</span>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="84" align="center" sortable="custom" column-key="status">
              <template slot-scope="scope">
                <el-tag :type="formatSlittingStatus(scope.row.status).type">{{ formatSlittingStatus(scope.row.status).label }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="132" align="center">
              <template slot-scope="scope">
                <div class="op-actions">
                  <el-button
                    class="op-main-btn"
                    size="mini"
                    :disabled="scope.row.__editing && (!scope.row.rewinding_date || !scope.row.rewinding_equipment)"
                    @click="handleRewindingEditAction(scope.row)"
                  >
                    {{ scope.row.__editing ? '确认' : '修改' }}
                  </el-button>
                  <el-dropdown size="mini" trigger="click" @command="handleScheduleActionCommand">
                    <el-button class="op-more-btn" size="mini">更多<i class="el-icon-arrow-down el-icon--right" /></el-button>
                    <el-dropdown-menu slot="dropdown">
                      <el-dropdown-item :command="{ action: 'report', row: scope.row, processType: 'REWINDING' }">报工</el-dropdown-item>
                      <el-dropdown-item :command="{ action: 'reduce', row: scope.row }">减量</el-dropdown-item>
                      <el-dropdown-item :command="{ action: 'terminate', row: scope.row }" divided>终止</el-dropdown-item>
                      <el-dropdown-item :command="{ action: 'reset', row: scope.row }" divided>清空重排</el-dropdown-item>
                    </el-dropdown-menu>
                  </el-dropdown>
                </div>
              </template>
            </el-table-column>
          </el-table>
          <div style="margin-top: 12px; text-align: right;">
            <el-pagination
              :current-page="rewindingPage"
              :page-size="rewindingPageSize"
              :page-sizes="[20, 50, 100, 200]"
              layout="total, sizes, prev, pager, next, jumper"
              :total="rewindingTotal"
              @size-change="handleRewindingSizeChange"
              @current-change="handleRewindingPageChange"
            />
          </div>
        </el-card>
      </el-tab-pane>

      <!-- Tab 4: 分切排程 -->
      <el-tab-pane label="分切排程" name="slitting">
        <el-card shadow="never">
          <div slot="header">
            <span>分切已排列表</span>
            <el-button style="float:right;margin-right:8px" type="success" size="small" icon="el-icon-plus" @click="openManualSlittingDialog">手动添加</el-button>
            <el-input
              v-model="slittingQuery.orderNo"
              size="small"
              clearable
              placeholder="按订单号搜索"
              style="float:right;width:180px;margin-right:8px"
              @keyup.enter.native="handleSlittingSearch"
            />
            <el-button style="float:right;margin-right:8px" size="small" @click="resetSlittingSearch">重置</el-button>
            <el-button style="float:right;margin-right:8px" type="primary" size="small" icon="el-icon-search" @click="handleSlittingSearch">查询</el-button>
            <el-button style="float: right" type="primary" size="small" icon="el-icon-refresh" @click="loadSlittingSchedules">刷新</el-button>
          </div>
          <el-alert
            v-if="slittingLockSummary.unlockedRows > 0"
            type="warning"
            :closable="false"
            style="margin-bottom: 10px"
            :title="`锁料提醒：当前有 ${slittingLockSummary.unlockedRows} 条待分切订单存在未锁定面积，共 ${slittingLockSummary.unlockedArea} ㎡。建议先处理锁料风险。`"
          />
          <el-table
            ref="slittingTable"
            v-loading="slittingLoading"
            :data="slittingList"
            class="manual-schedule-table process-schedule-table"
            size="mini"
            border
            stripe
            style="width: 100%"
            :max-height="tableMaxHeight"
            :row-class-name="slittingRowClassName"
            @sort-change="handleSlittingSortChange"
          >
            <el-table-column type="index" label="序号" width="52" align="center" />
            <el-table-column label="排程号" width="102" align="center">
              <template slot-scope="scope">
                <el-input-number
                  v-if="scope.row.__editing && scope.row.__manual"
                  v-model="scope.row.schedule_id"
                  :min="1"
                  :step="1"
                  size="mini"
                  controls-position="right"
                />
                <span v-else>{{ scope.row.schedule_id || '-' }}</span>
              </template>
            </el-table-column>
            <el-table-column label="复卷时间" width="124" sortable="custom" column-key="rewinding_time">
              <template slot-scope="scope">
                <el-tag type="success" class="two-line-time-tag">
                  <span class="two-line-time-text">{{ timeWindowLine(formatRewindingTimeWindow(scope.row), 0) }}</span>
                  <span class="two-line-time-text">{{ timeWindowLine(formatRewindingTimeWindow(scope.row), 1) }}</span>
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="order_no" label="订单号" width="112" sortable="custom" column-key="order_no" />
            <el-table-column prop="material_code" label="料号" width="230" class-name="wrap-col" header-class-name="wrap-col" show-overflow-tooltip sortable="custom" column-key="material_code">
              <template slot-scope="scope">
                <el-autocomplete
                  v-if="scope.row.__editing && scope.row.__manual"
                  v-model="scope.row.material_code"
                  size="small"
                  :fetch-suggestions="queryTapeSpecByMaterialCode"
                  popper-class="manual-material-autocomplete-popper"
                  placeholder="请输入料号"
                  :trigger-on-focus="false"
                  @input="handleManualSlittingMaterialInput(scope.row, $event)"
                  @select="handleManualSlittingMaterialSelect(scope.row, $event)"
                >
                  <template slot-scope="{ item }">
                    <div style="display:flex;flex-direction:column;gap:2px;line-height:1.35;">
                      <span style="font-weight:600;color:#303133;white-space:normal;word-break:break-all;">{{ item.materialCode }}</span>
                      <span style="color:#909399;white-space:normal;word-break:break-all;">{{ item.productName || '-' }}</span>
                    </div>
                  </template>
                </el-autocomplete>
                <span v-else>{{ scope.row.material_code || '-' }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="material_name" label="产品名称" width="132" class-name="wrap-col" header-class-name="wrap-col" show-overflow-tooltip sortable="custom" column-key="material_name" />
            <el-table-column label="产品规格" width="132" align="right" sortable="custom" column-key="spec">
              <template slot-scope="scope">
                {{ formatOrderSpec(scope.row) }}
              </template>
            </el-table-column>
            <el-table-column label="分切卷数" width="84" align="right" sortable="custom" column-key="schedule_qty">
              <template slot-scope="scope">
                {{ Number(scope.row.schedule_qty || 0) }}
              </template>
            </el-table-column>
            <el-table-column label="分切速度(卷/分)" width="118" align="center" sortable="custom" column-key="slitting_speed">
              <template slot-scope="scope">
                {{ formatSlittingSpeed(scope.row) }}
              </template>
            </el-table-column>
            <el-table-column label="计划时间" width="170" align="center" sortable="custom" column-key="packaging_date">
              <template slot-scope="scope">
                <el-date-picker
                  v-if="scope.row.__editing"
                  v-model="scope.row.packaging_date"
                  type="datetime"
                  size="small"
                  placeholder=""
                  format="yyyy-MM-dd HH:mm"
                  value-format="yyyy-MM-dd HH:mm:ss"
                  @change="handleSlittingDateChange(scope.row)"
                />
                <span v-else>{{ formatDateTime(scope.row.packaging_date) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="耗时" width="92" align="center" sortable="custom" column-key="slitting_duration">
              <template slot-scope="scope">
                {{ formatSlittingDuration(scope.row) }}
              </template>
            </el-table-column>
            <el-table-column label="锁料提醒" width="108" align="center">
              <template slot-scope="scope">
                <el-tag v-if="getUnlockedArea(scope.row) > 0" type="warning">未锁{{ getUnlockedArea(scope.row).toFixed(0) }}㎡</el-tag>
                <el-tag v-else type="success">已锁定</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="机台号" width="124" align="center" sortable="custom" column-key="slitting_equipment">
              <template slot-scope="scope">
                <el-select
                  v-if="scope.row.__editing"
                  v-model="scope.row.slitting_equipment"
                  size="small"
                  placeholder="机台号"
                  @change="handleSlittingEquipmentChange(scope.row)"
                  @visible-change="handleSlittingEquipmentDropdownVisible(scope.row, $event)"
                >
                  <el-option
                    v-for="eq in getSlittingEquipmentOptions(scope.row)"
                    :key="eq.id"
                    :label="slittingEquipmentOptionLabel(eq)"
                    :value="eq.equipmentCode"
                    :disabled="!!eq.unavailableReason"
                  />
                </el-select>
                <span v-else>{{ scope.row.slitting_equipment || '-' }}</span>
              </template>
            </el-table-column>
            <el-table-column label="包装班组" width="140" align="center" sortable="custom" column-key="packaging_team">
              <template slot-scope="scope">
                <el-select
                  v-if="scope.row.__editing"
                  v-model="scope.row.packaging_team"
                  size="small"
                  clearable
                  filterable
                  placeholder="选择班组"
                >
                  <el-option
                    v-for="team in packagingTeamList"
                    :key="team.id"
                    :label="team.teamName"
                    :value="team.teamName"
                  />
                </el-select>
                <span v-else>{{ packagingTeamName(scope.row.packaging_team) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="84" align="center" sortable="custom" column-key="status">
              <template slot-scope="scope">
                <el-tag :type="formatSlittingStatus(scope.row.status).type">{{ formatSlittingStatus(scope.row.status).label }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="132" align="center">
              <template slot-scope="scope">
                <div class="op-actions">
                  <el-button
                    class="op-main-btn"
                    size="mini"
                    :disabled="scope.row.__editing && (!scope.row.packaging_date || !scope.row.slitting_equipment || !scope.row.packaging_team)"
                    @click="handleSlittingEditAction(scope.row)"
                  >
                    {{ scope.row.__editing ? '确认' : '修改' }}
                  </el-button>
                  <el-dropdown size="mini" trigger="click" @command="handleScheduleActionCommand">
                    <el-button class="op-more-btn" size="mini">更多<i class="el-icon-arrow-down el-icon--right" /></el-button>
                    <el-dropdown-menu slot="dropdown">
                      <el-dropdown-item :command="{ action: 'report', row: scope.row, processType: 'SLITTING' }">报工</el-dropdown-item>
                      <el-dropdown-item :command="{ action: 'reduce', row: scope.row }">减量</el-dropdown-item>
                      <el-dropdown-item :command="{ action: 'terminate', row: scope.row }" divided>终止</el-dropdown-item>
                      <el-dropdown-item :command="{ action: 'reset', row: scope.row }" divided>清空重排</el-dropdown-item>
                    </el-dropdown-menu>
                  </el-dropdown>
                </div>
              </template>
            </el-table-column>
          </el-table>
          <div style="margin-top: 12px; text-align: right;">
            <el-pagination
              :current-page="slittingPage"
              :page-size="slittingPageSize"
              :page-sizes="[20, 50, 100, 200]"
              layout="total, sizes, prev, pager, next, jumper"
              :total="slittingTotal"
              @size-change="handleSlittingSizeChange"
              @current-change="handleSlittingPageChange"
            />
          </div>
        </el-card>
      </el-tab-pane>
    </el-tabs>

    <el-dialog
      :title="workReportDialogTitle"
      :visible.sync="workReportDialogVisible"
      width="860px"
      @close="handleWorkReportDialogClose"
    >
      <el-form :model="workReportForm" label-width="90px" inline>
        <el-form-item label="扫码明细">
          <el-input
            v-model="workReportScanCode"
            size="small"
            placeholder="扫码派工明细二维码"
            style="width: 220px"
            @keyup.enter.native="applyWorkReportScan"
          />
          <el-button size="small" style="margin-left: 6px" @click="applyWorkReportScan">匹配</el-button>
        </el-form-item>
        <el-form-item label="明细号">
          <el-input v-model="workReportForm.orderDetailId" size="small" style="width: 140px" disabled />
        </el-form-item>
        <el-form-item label="开始时间">
          <el-date-picker
            v-model="workReportForm.startTime"
            type="datetime"
            size="small"
            format="yyyy-MM-dd HH:mm:ss"
            value-format="yyyy-MM-dd HH:mm:ss"
            placeholder="选择开始时间"
          />
        </el-form-item>
        <el-form-item label="结束时间">
          <el-date-picker
            v-model="workReportForm.endTime"
            type="datetime"
            size="small"
            format="yyyy-MM-dd HH:mm:ss"
            value-format="yyyy-MM-dd HH:mm:ss"
            placeholder="选择结束时间"
          />
        </el-form-item>
        <el-form-item label="生产数量">
          <el-input-number v-model="workReportForm.producedQty" :min="0.01" :step="1" :precision="2" size="small" controls-position="right" />
          <span v-if="workReportRemainingQtyHint >= 0" style="margin-left:8px;color:#909399;">剩余可报：{{ workReportRemainingQtyHint }}</span>
        </el-form-item>
        <el-form-item label="操作人">
          <el-input v-model="workReportForm.operator" size="small" placeholder="请输入操作人" style="width: 140px" />
        </el-form-item>
        <el-form-item label="下工序">
          <el-switch
            v-model="workReportForm.proceedNextProcess"
            active-text="继续"
            inactive-text="不继续"
          />
        </el-form-item>
      </el-form>
      <el-form :model="workReportForm" label-width="90px">
        <el-form-item label="备注">
          <el-input v-model="workReportForm.remark" type="textarea" :rows="2" placeholder="选填" />
        </el-form-item>
      </el-form>

      <div style="margin-bottom: 8px; font-weight: 600;">历史报工</div>
      <el-table v-loading="workReportLoading" :data="workReportList" border size="mini" max-height="280">
        <el-table-column type="index" label="#" width="50" align="center" />
        <el-table-column prop="start_time" label="开始时间" width="140">
          <template slot-scope="scope">{{ formatDateTime(scope.row.start_time) }}</template>
        </el-table-column>
        <el-table-column prop="end_time" label="结束时间" width="140">
          <template slot-scope="scope">{{ formatDateTime(scope.row.end_time) }}</template>
        </el-table-column>
        <el-table-column prop="produced_qty" label="生产数量" width="110" align="right" />
        <el-table-column prop="operator_name" label="操作人" width="120" />
        <el-table-column label="下工序" width="90" align="center">
          <template slot-scope="scope">
            <el-tag :type="Number(scope.row.proceed_next_process || 0) === 1 ? 'success' : 'warning'" size="mini">
              {{ Number(scope.row.proceed_next_process || 0) === 1 ? '继续' : '不继续' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" align="center">
          <template slot-scope="scope">
            <el-button type="text" size="mini" @click="editWorkReportRow(scope.row)">修改</el-button>
            <el-button type="text" size="mini" style="color:#F56C6C" @click="deleteWorkReportRow(scope.row)">删除</el-button>
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="180" show-overflow-tooltip />
        <el-table-column prop="created_at" label="录入时间" width="140">
          <template slot-scope="scope">{{ formatDateTime(scope.row.created_at) }}</template>
        </el-table-column>
      </el-table>

      <div slot="footer">
        <el-button @click="workReportDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="workReportSubmitting" @click="submitWorkReport">提交报工</el-button>
      </div>
    </el-dialog>

    <el-dialog
      title="工序领料登记"
      :visible.sync="materialIssueDialogVisible"
      width="900px"
      @close="handleMaterialIssueDialogClose"
    >
      <el-form :model="materialIssueForm" label-width="90px" inline>
        <el-form-item label="工序">
          <el-select v-model="materialIssueForm.processType" size="small" style="width: 140px">
            <el-option label="涂布" value="COATING" />
            <el-option label="复卷" value="REWINDING" />
            <el-option label="分切" value="SLITTING" />
          </el-select>
        </el-form-item>
        <el-form-item label="操作人">
          <el-input v-model="materialIssueForm.operator" size="small" placeholder="请输入操作人" style="width: 160px" />
        </el-form-item>
      </el-form>

      <el-form :model="materialIssueForm" label-width="90px">
        <el-form-item label="备注">
          <el-input v-model="materialIssueForm.remark" type="textarea" :rows="2" placeholder="选填" />
        </el-form-item>
      </el-form>

      <div style="margin-bottom: 8px;">
        <el-button size="mini" type="primary" plain @click="addMaterialIssueRow">新增一行</el-button>
      </div>
      <el-table :data="materialIssueForm.materialIssues" border size="mini" max-height="220">
        <el-table-column label="物料类型" width="110">
          <template slot-scope="scope">
            <el-select v-model="scope.row.materialType" size="mini" style="width: 96px">
              <el-option label="原料" value="原料" />
              <el-option label="薄膜" value="薄膜" />
              <el-option label="母卷" value="母卷" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="物料编码" min-width="150">
          <template slot-scope="scope">
            <el-input v-model="scope.row.materialCode" size="mini" placeholder="必填" />
          </template>
        </el-table-column>
        <el-table-column label="库存ID" width="88">
          <template slot-scope="scope">
            <el-input-number v-model="scope.row.stockId" size="mini" :min="1" :controls="false" />
          </template>
        </el-table-column>
        <el-table-column label="卷码/批次" min-width="120">
          <template slot-scope="scope">
            <el-input v-model="scope.row.rollCode" size="mini" />
          </template>
        </el-table-column>
        <el-table-column label="计划㎡" width="100">
          <template slot-scope="scope">
            <el-input-number v-model="scope.row.planArea" size="mini" :min="0" :step="0.01" :precision="2" :controls="false" />
          </template>
        </el-table-column>
        <el-table-column label="实际㎡" width="100">
          <template slot-scope="scope">
            <el-input-number v-model="scope.row.actualArea" size="mini" :min="0" :step="0.01" :precision="2" :controls="false" />
          </template>
        </el-table-column>
        <el-table-column label="损耗㎡" width="100">
          <template slot-scope="scope">
            <el-input-number v-model="scope.row.lossArea" size="mini" :min="0" :step="0.01" :precision="2" :controls="false" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="70" align="center">
          <template slot-scope="scope">
            <el-button type="text" style="color:#F56C6C" @click="removeMaterialIssueRow(scope.$index)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div style="margin: 10px 0 8px; font-weight: 600;">历史领料</div>
      <el-table v-loading="materialIssueLoading" :data="materialIssueList" border size="mini" max-height="220">
        <el-table-column prop="material_type" label="物料类型" width="96" />
        <el-table-column prop="material_code" label="物料编码" min-width="130" />
        <el-table-column prop="stock_id" label="库存ID" width="88" />
        <el-table-column prop="roll_code" label="卷码" width="120" />
        <el-table-column prop="plan_area" label="计划㎡" width="88" align="right" />
        <el-table-column prop="actual_area" label="实际㎡" width="88" align="right" />
        <el-table-column prop="loss_area" label="损耗㎡" width="88" align="right" />
        <el-table-column prop="operator_name" label="操作人" width="88" />
        <el-table-column prop="issue_time" label="领料时间" width="170" />
      </el-table>

      <div slot="footer">
        <el-button @click="materialIssueDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="materialIssueSubmitting" @click="submitMaterialIssue">提交领料</el-button>
      </div>
    </el-dialog>

    <el-dialog
      title="手动添加分切排程（按订单选择）"
      :visible.sync="manualSlittingDialogVisible"
      width="920px"
      :close-on-click-modal="false"
    >
      <el-form :inline="true" style="margin-bottom: 10px;">
        <el-form-item label="订单号">
          <el-input
            v-model="manualSlittingQuery.orderNo"
            size="small"
            clearable
            placeholder="输入订单号搜索"
            style="width: 220px"
            @keyup.enter.native="loadManualSlittingCandidates"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" size="small" icon="el-icon-search" @click="loadManualSlittingCandidates">查询</el-button>
        </el-form-item>
      </el-form>

      <el-table
        ref="manualSlittingOrderTable"
        v-loading="manualSlittingLoading"
        :data="manualSlittingCandidates"
        class="manual-schedule-table"
        border
        stripe
        style="width: 100%"
        max-height="320"
        @selection-change="handleManualSlittingSelectionChange"
        @row-click="handleManualSlittingRowClick"
      >
        <el-table-column type="selection" width="48" align="center" />
        <el-table-column type="index" label="#" width="50" align="center" />
        <el-table-column label="客户代码" width="130" show-overflow-tooltip>
          <template slot-scope="scope">
            {{ scope.row.customer_code || scope.row.customer || scope.row.customer_name || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="order_no" label="订单号" width="150" show-overflow-tooltip />
        <el-table-column prop="material_code" label="料号" width="220" show-overflow-tooltip />
        <el-table-column label="规格" width="190" show-overflow-tooltip>
          <template slot-scope="scope">
            {{ formatOrderSpec(scope.row) }}
          </template>
        </el-table-column>
        <el-table-column prop="remaining_qty" label="可排卷数" width="96" align="right" />
        <el-table-column label="本次排程卷数" width="150" align="center">
          <template slot-scope="scope">
            <el-input-number
              v-model="scope.row._manual_qty"
              :min="1"
              :max="Math.max(1, Number(scope.row.remaining_qty || 0))"
              :disabled="!scope.row._selected"
              size="mini"
              controls-position="right"
            />
          </template>
        </el-table-column>
      </el-table>

      <div style="margin-top: 10px; color: #606266;">
        已选明细：{{ manualSlittingSelectedRows.length }} 条
      </div>

      <div slot="footer">
        <el-button @click="manualSlittingDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="manualSlittingSubmitting" @click="confirmManualSlittingSelection">确定</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import {
  getPendingOrders,
  getPendingOrdersOweArea,
  getCoatingCompletedOrders,
  matchStock,
  calculateCoating,
  saveCoatingAllocation,
  createSchedule,
  createRewindingSchedule,
  createCoatingSchedule,
  getCoatingAvailability,
  getRewindingAvailability,
  getSlittingAvailability,
  getCoatingSchedules,
  getRewindingSchedules,
  getSlittingSchedules,
  updateSlittingSchedule,
  confirmSchedule,
  terminateSchedule,
  reduceSchedule,
  urgentLock,
  resetScheduleByOrderDetail,
  reportWork,
  getReportWorkList,
  getProcessMaterialIssues,
  issueProcessMaterial,
  getOrderItemsReadiness,
  updateReportWork,
  deleteReportWork
} from '@/api/manualSchedule'
import { getEquipmentList, getEquipmentScheduleConfigList } from '@/api/equipment'
import { getProcessParamsList, getProcessParams } from '@/api/processParams'
import { getRewindingProcessParamsList, getRewindingProcessParams } from '@/api/rewindingProcessParams'
import { getSlittingProcessParamsList, getSlittingProcessParams } from '@/api/slittingProcessParams'
import { getSpecByMaterialCode, getSpecList } from '@/api/tapeSpec'
import { getAllActiveTeams } from '@/api/staff'

export default {
  name: 'ManualSchedule',
  filters: {
    formatDate(val) {
      if (!val) return '-'
      const text = String(val).trim().replace(/\//g, '-')
      const datePart = text.length >= 10 ? text.substring(0, 10) : text
      const parts = datePart.split('-')
      if (parts.length >= 3) {
        const mm = String(parts[1] || '').padStart(2, '0')
        const dd = String(parts[2] || '').padStart(2, '0')
        return `${mm}-${dd}`
      }
      return datePart
    }
  },
  data() {
    return {
      activeTab: 'orders',
      loading: false,
      coatingLoading: false,
      rewindingLoading: false,
      slittingLoading: false,
      orderList: [],
      pageHeight: 700,
      tableMaxHeight: 560,
      pendingPage: 1,
      pendingPageSize: 20,
      pendingTotal: 0,
      pendingRawList: [],
      pendingMaterialOweArea: 0,
      pendingQuery: {
        materialCode: ''
      },
      pendingSelectionMap: {},
      pendingManualOffMap: {},
      pendingRowCache: {},
      pendingSelectionSyncing: false,
      pendingDailyAreaTarget: 70000,
      pendingDefaultSelectionInited: false,
      materialNameByCodeCache: {},
      materialSpecByCodeCache: {},
      showCompletedRows: false,
      pendingSort: {
        prop: 'priority_score',
        order: 'descending'
      },
      coatingList: [],
      highlightCoatingScheduleId: null,
      highlightCoatingTimer: null,
      coatingPage: 1,
      coatingPageSize: 20,
      coatingTotal: 0,
      coatingSort: {
        prop: null,
        order: null
      },
      rewindingList: [],
      highlightRewindingDetailId: null,
      highlightRewindingScheduleId: null,
      highlightRewindingTimer: null,
      highlightSlittingDetailId: null,
      highlightSlittingTimer: null,
      rewindingPage: 1,
      rewindingPageSize: 20,
      rewindingTotal: 0,
      rewindingSort: {
        prop: null,
        order: null
      },
      rewindingLockSummary: {
        unlockedRows: 0,
        unlockedArea: 0
      },
      rewindingScheduledList: [],
      rewindingScheduledPage: 1,
      rewindingScheduledPageSize: 20,
      rewindingScheduledTotal: 0,
      slittingList: [],
      slittingPage: 1,
      slittingPageSize: 20,
      slittingTotal: 0,
      slittingQuery: {
        orderNo: ''
      },
      slittingSort: {
        prop: null,
        order: null
      },
      slittingLockSummary: {
        unlockedRows: 0,
        unlockedArea: 0
      },
      manualSlittingDialogVisible: false,
      manualSlittingLoading: false,
      manualSlittingSubmitting: false,
      manualSlittingCandidates: [],
      manualSlittingSelectedRows: [],
      manualSlittingQuery: {
        orderNo: ''
      },
      equipmentList: [],
      rewindingEquipmentList: [],
      slittingEquipmentList: [],
      packagingTeamList: [],
      coatingEquipmentOptionsMap: {},
      rewindingEquipmentOptionsMap: {},
      slittingEquipmentOptionsMap: {},
      equipmentOptionLoadingMap: {},
      equipmentScheduleConfigMap: {},
      coatingSpeedMap: {},
      rewindingSpeedMap: {},
      slittingSpeedMap: {},

      // 库存选择对话框
      stockDialogVisible: false,
      stockMatchResult: null,
      selectedStocks: [],
      stockScanCodes: '',
      currentOrder: null,

      // 涂布计算对话框
      coatingDialogVisible: false,
      coatingRequirement: null,
      coatingForm: {
        coatingArea: 24000,
        remark: ''
      },

      // 备注编辑对话框
      remarkDialogVisible: false,
      selectedRow: null,

      // 工序报工
      workReportDialogVisible: false,
      workReportDialogTitle: '工序报工',
      workReportLoading: false,
      workReportSubmitting: false,
      workReportScanCode: '',
      workReportEditingId: null,
      workReportPlannedQty: 0,
      workReportForm: {
        scheduleId: null,
        orderDetailId: null,
        orderNo: '',
        processType: 'COATING',
        startTime: '',
        endTime: '',
        producedQty: null,
        proceedNextProcess: true,
        operator: '',
        remark: ''
      },
      workReportList: [],

      materialIssueDialogVisible: false,
      materialIssueLoading: false,
      materialIssueSubmitting: false,
      materialIssueForm: {
        scheduleId: null,
        orderDetailId: null,
        orderNo: '',
        processType: 'COATING',
        operator: '',
        remark: '',
        materialIssues: []
      },
      materialIssueList: []
    }
  },
  computed: {
    pendingSelectedStats() {
      let rolls = 0
      let area = 0
      const map = this.pendingSelectionMap || {}
      const cache = this.pendingRowCache || {}
      Object.keys(map).forEach(id => {
        if (!map[id]) return
        const row = cache[id]
        if (!row) return
        const qty = this.getPlannedQtyByRow(row)
        const sqm = this.getPlannedAreaByRow(row)
        if (qty > 0) {
          rolls += qty
        }
        if (sqm > 0) {
          area += sqm
        }
      })
      return {
        rolls,
        area: Number(area.toFixed(2))
      }
    },
    pendingLockRiskSummary() {
      const list = this.orderList || []
      let riskRows = 0
      let riskArea = 0
      list.forEach(row => {
        const unlocked = Number(row.unlocked_area || 0)
        if (unlocked > 0) {
          riskRows += 1
          riskArea += unlocked
        }
      })
      return {
        riskRows,
        riskArea: Number(riskArea.toFixed(2))
      }
    },
    workReportRemainingQtyHint() {
      const planned = Number(this.workReportPlannedQty || 0)
      if (!(planned > 0)) return -1
      const reported = this.sumWorkReportProducedQty(this.workReportList)
      return Number(Math.max(planned - reported, 0).toFixed(2))
    }
  },
  mounted() {
    this.lockOuterScroll()
    this.updateTableMaxHeight()
    window.addEventListener('resize', this.updateTableMaxHeight)
    this.loadOrders()
    this.loadEquipmentList()
    this.loadCoatingTeamList()
    this.loadEquipmentScheduleConfigMap()
    this.loadCoatingSpeedMap()
  },
  beforeDestroy() {
    this.unlockOuterScroll()
    window.removeEventListener('resize', this.updateTableMaxHeight)
    if (this.highlightCoatingTimer) {
      clearTimeout(this.highlightCoatingTimer)
      this.highlightCoatingTimer = null
    }
    if (this.highlightRewindingTimer) {
      clearTimeout(this.highlightRewindingTimer)
      this.highlightRewindingTimer = null
    }
    if (this.highlightSlittingTimer) {
      clearTimeout(this.highlightSlittingTimer)
      this.highlightSlittingTimer = null
    }

    ;['coatingTable', 'rewindingTable', 'slittingTable', 'manualSlittingOrderTable', 'pendingTable'].forEach((refName) => {
      const table = this.$refs[refName]
      if (!table || !table.$el) return
      const body = table.$el.querySelector('.el-table__body-wrapper')
      if (body && body.__manualHeaderSyncHandler) {
        body.removeEventListener('scroll', body.__manualHeaderSyncHandler)
        body.__manualHeaderSyncHandler = null
      }
    })
  },
  methods: {
    lockOuterScroll() {
      const appMain = document.querySelector('.app-main')
      if (!appMain) return
      this._appMainOverflowY = appMain.style.overflowY
      this._appMainOverflow = appMain.style.overflow
      appMain.style.overflowY = 'hidden'
      appMain.style.overflow = 'hidden'
    },
    unlockOuterScroll() {
      const appMain = document.querySelector('.app-main')
      if (!appMain) return
      appMain.style.overflowY = this._appMainOverflowY || ''
      appMain.style.overflow = this._appMainOverflow || ''
    },
    updateTableMaxHeight() {
      this.$nextTick(() => {
        const rootRect = this.$el.getBoundingClientRect()
        this.pageHeight = Math.max(520, Math.floor(window.innerHeight - rootRect.top - 4))

        const activePane = this.$el.querySelector('.el-tab-pane.is-active')
        if (!activePane) {
          this.tableMaxHeight = Math.max(320, this.pageHeight - 180)
          return
        }

        const paneRect = activePane.getBoundingClientRect()
        const pager = activePane.querySelector('.el-pagination')
        const pagerHeight = pager ? pager.offsetHeight : 0
        // 预留：分页高度 + 卡片内边距 + 安全间距
        const reserve = pagerHeight + 72
        this.tableMaxHeight = Math.max(300, Math.floor(window.innerHeight - paneRect.top - reserve))

        this.$nextTick(() => {
          this.syncActiveTableLayout()
        })
      })
    },
    doTableLayout(refName) {
      const table = this.$refs[refName]
      if (table && typeof table.doLayout === 'function') {
        table.doLayout()
        this.syncTableScroll(refName)
      }
    },
    relayoutTable(refName) {
      this.$nextTick(() => {
        this.doTableLayout(refName)
        setTimeout(() => this.doTableLayout(refName), 80)
        setTimeout(() => this.doTableLayout(refName), 220)
      })
    },
    syncTableScroll(refName) {
      const table = this.$refs[refName]
      if (!table || !table.$el) return
      const body = table.$el.querySelector('.el-table__body-wrapper')
      const header = table.$el.querySelector('.el-table__header-wrapper')
      if (!body || !header) return

      if (!body.__manualHeaderSyncHandler) {
        body.__manualHeaderSyncHandler = () => {
          header.scrollLeft = body.scrollLeft
        }
        body.addEventListener('scroll', body.__manualHeaderSyncHandler, { passive: true })
      }
      header.scrollLeft = body.scrollLeft
    },
    syncActiveTableLayout() {
      if (this.activeTab === 'orders') {
        this.doTableLayout('pendingTable')
      } else if (this.activeTab === 'coating') {
        this.doTableLayout('coatingTable')
      } else if (this.activeTab === 'rewinding') {
        this.doTableLayout('rewindingTable')
      } else if (this.activeTab === 'slitting') {
        this.doTableLayout('slittingTable')
      }
    },
    formatStockAllocations(value) {
      if (!value) return ''
      try {
        const list = typeof value === 'string' ? JSON.parse(value) : value
        if (!Array.isArray(list)) return ''
        return list
          .map(item => {
            const batchNo = item.qrCode || item.batchNo || item.stockId || ''
            const area = item.area != null ? Number(item.area).toFixed(2) : ''
            return area ? `${batchNo}(${area}㎡)` : `${batchNo}`
          })
          .filter(Boolean)
          .join('，')
      } catch (e) {
        return value
      }
    },
    formatDateTime(value) {
      if (!value) return '-'
      const s = String(value)
      return s.length >= 16 ? s.substring(0, 16) : s
    },
    formatArea(value) {
      return Number(value || 0).toFixed(2)
    },
    pendingRowKey(row) {
      return String(row.order_detail_id || row.id || '')
    },
    getPlannedQtyByRow(row) {
      if (!row) return 0
      const maxQty = Number(row.remaining_qty || 0)
      let qty = Number(row.schedule_qty || 0)
      if (!Number.isFinite(qty) || qty < 0) qty = 0
      if (Number.isFinite(maxQty)) {
        qty = Math.min(qty, Math.max(0, maxQty))
      }
      return Math.round(qty)
    },
    getPlannedAreaByRow(row) {
      if (!row) return 0
      const qty = this.getPlannedQtyByRow(row)
      const width = Number(row.width || 0)
      const length = Number(row.length || 0)
      if (qty <= 0 || width <= 0 || length <= 0) return 0
      return (width / 1000) * length * qty
    },
    getCurrentSelectedArea() {
      return Number((this.pendingSelectedStats && this.pendingSelectedStats.area) || 0)
    },
    syncPendingSelectionToTable() {
      this.$nextTick(() => {
        const table = this.$refs.pendingTable
        if (!table || !Array.isArray(this.orderList)) return
        this.pendingSelectionSyncing = true
        table.clearSelection()
        this.orderList.forEach(row => {
          const id = this.pendingRowKey(row)
          if (this.pendingSelectionMap[id]) {
            table.toggleRowSelection(row, true)
          }
        })
        this.$nextTick(() => {
          this.pendingSelectionSyncing = false
        })
      })
    },
    autoSelectPendingRowsByDailyTarget() {
      let remain = Number(this.pendingDailyAreaTarget || 70000) - this.getCurrentSelectedArea()
      if (remain <= 0) {
        this.syncPendingSelectionToTable()
        return
      }
      (this.orderList || []).forEach(row => {
        if (remain <= 0) return
        const id = this.pendingRowKey(row)
        if (!id) return
        if (this.pendingSelectionMap[id]) return
        if (this.pendingManualOffMap[id]) return
        const area = this.getPlannedAreaByRow(row)
        const qty = this.getPlannedQtyByRow(row)
        if (qty <= 0 || area <= 0) return
        this.$set(this.pendingSelectionMap, id, true)
        remain -= area
      })
      this.syncPendingSelectionToTable()
    },
    handlePendingSelectionChange(selection) {
      if (this.pendingSelectionSyncing) {
        return
      }
      const selectedIds = new Set((selection || []).map(row => this.pendingRowKey(row)))
      ;(this.orderList || []).forEach(row => {
        const id = this.pendingRowKey(row)
        if (!id) return
        const checked = selectedIds.has(id)
        this.$set(this.pendingSelectionMap, id, checked)
        if (checked) {
          if (this.pendingManualOffMap[id]) {
            this.$delete(this.pendingManualOffMap, id)
          }
        } else {
          this.$set(this.pendingManualOffMap, id, true)
        }
      })
    },
    getSelectedPendingRows() {
      const map = this.pendingSelectionMap || {}
      const cache = this.pendingRowCache || {}
      return Object.keys(map)
        .filter(id => !!map[id])
        .map(id => cache[id])
        .filter(Boolean)
    },
    buildAutoStockAllocations(stockList, requiredArea) {
      let remain = Number(requiredArea || 0)
      const allocations = []
      ;(stockList || []).forEach(stock => {
        if (remain <= 0) return
        const available = Number(stock.available_area || 0)
        if (available <= 0) return
        const lockArea = Math.min(available, remain)
        if (lockArea <= 0) return
        allocations.push({
          stockId: stock.stock_id,
          area: Number(lockArea.toFixed(2))
        })
        remain -= lockArea
      })
      return {
        allocations,
        shortageArea: Math.max(0, Number(remain.toFixed(2)))
      }
    },
    async processStockLockForRow(row) {
      const scheduleQty = this.getPlannedQtyByRow(row)
      if (!row || scheduleQty <= 0) {
        return { ok: false, reason: '排程数量无效' }
      }

      const matchRes = await matchStock({
        materialCode: row.material_code,
        width: row.width,
        thickness: row.thickness,
        requiredQty: scheduleQty
      })
      if (!(matchRes.code === 200 || matchRes.code === 20000)) {
        return { ok: false, reason: '库存匹配失败' }
      }

      const singleArea = (Number(row.width || 0) / 1000) * Number(row.length || 0)
      const requiredArea = Number((singleArea * scheduleQty).toFixed(2))
      const stockList = (matchRes.data && matchRes.data.stockList) || []
      const { allocations, shortageArea } = this.buildAutoStockAllocations(stockList, requiredArea)
      if (requiredArea <= 0 || shortageArea > 0 || allocations.length === 0) {
        return { ok: false, reason: '库存不足' }
      }

      const scheduleRes = await createSchedule({
        orderNo: row.order_no,
        orderDetailId: row.order_detail_id,
        materialCode: row.material_code,
        materialName: row.material_name,
        width: row.width,
        length: row.length,
        thickness: row.thickness,
        orderQty: row.order_qty,
        scheduleQty: scheduleQty,
        coatingDate: row.coating_date,
        rewindingDate: row.rewinding_date,
        packagingDate: row.packaging_date,
        scheduleType: 'STOCK'
      })
      if (!(scheduleRes.code === 200 || scheduleRes.code === 20000)) {
        return { ok: false, reason: '创建库存排程失败' }
      }

      const lockRes = await createRewindingSchedule({
        scheduleId: scheduleRes.data,
        stockAllocations: allocations
      })
      if (!(lockRes.code === 200 || lockRes.code === 20000)) {
        return { ok: false, reason: '库存锁定失败' }
      }

      return { ok: true }
    },
    async handleBatchScanStock() {
      const selectedRows = this.getSelectedPendingRows()
      if (!selectedRows.length) {
        this.$message.warning('请先勾选要参与本次排程的订单')
        return
      }

      this.loading = true
      let locked = 0
      let insufficient = 0
      try {
        for (const row of selectedRows) {
          if (String(row.schedule_type || '').toUpperCase() === 'STOCK') {
            locked += 1
            continue
          }
          try {
            const r = await this.processStockLockForRow(row)
            if (r.ok) locked += 1
            else insufficient += 1
          } catch (e) {
            insufficient += 1
          }
        }

        this.$message.success(`库存扫描完成：够料并锁定 ${locked} 条，不够料 ${insufficient} 条`)
        await this.loadOrders()
        await this.loadRewindingOrders()
      } finally {
        this.loading = false
      }
    },
    handleCoatingDateFocus(row) {
      if (!row || String(row.schedule_type || '').toUpperCase() === 'STOCK') {
        return
      }
      this.handleCalculateCoating(row)
    },
    canJumpToRewinding(row) {
      const routeType = this.getRouteType(row)
      if (routeType === 'COATING_SHIP') return false
      const scheduleId = Number((row && row.schedule_id) || 0)
      const coveredByActiveCoating = Number((row && row.covered_by_active_coating) || 0) > 0
      if (scheduleId <= 0 && !coveredByActiveCoating) return false
      const s = String((row && (row.schedule_status || row.status)) || '').toUpperCase()
      if (s === 'TERMINATED' || s === 'CANCELLED') return false
      if (s === 'COATING_SCHEDULED' || s === 'REWINDING_SCHEDULED') return true
      return !!(row && row.coating_date)
    },
    canJumpToSlitting(row) {
      const routeType = this.getRouteType(row)
      if (routeType !== 'SLITTING_SHIP') return false
      const scheduleId = Number((row && row.schedule_id) || 0)
      if (scheduleId <= 0) return false
      const s = String((row && (row.schedule_status || row.status)) || '').toUpperCase()
      if (s === 'TERMINATED' || s === 'CANCELLED') return false
      if (s === 'REWINDING_SCHEDULED' || s === 'CONFIRMED') return true
      return !!(row && row.rewinding_date)
    },
    isRowTerminated(row) {
      const s = String((row && (row.schedule_status || row.status)) || '').toUpperCase()
      return s === 'TERMINATED' || s === 'CANCELLED'
    },
    getReportedCompletedQty(row) {
      if (!row) return 0
      const coatingQty = Number(row.coating_report_qty || 0)
      const rewindingQty = Number(row.rewinding_report_qty || 0)
      const slittingQty = Number(row.slitting_report_qty || 0)
      const routeType = this.getRouteType(row)
      if (routeType === 'COATING_SHIP') return coatingQty
      if (routeType === 'REWINDING_SHIP') return rewindingQty
      return slittingQty
    },
    getRouteType(row) {
      const routeType = String((row && row.route_type) || '').toUpperCase()
      if (routeType) return routeType
      const width = Number((row && row.width) || 0)
      const length = Number((row && row.length) || 0)
      if (width > 450 && length < 1500) return 'REWINDING_SHIP'
      if (width > 450 && length > 1500) return 'COATING_SHIP'
      return 'SLITTING_SHIP'
    },
    calcProductionCompleted(row) {
      const orderQty = Number((row && row.order_qty) || 0)
      const completedQty = this.getReportedCompletedQty(row)
      return orderQty > 0 && completedQty >= orderQty
    },
    isRowScheduledComplete(row) {
      return this.calcProductionCompleted(row)
    },
    resetWorkReportForm() {
      this.workReportForm = {
        scheduleId: null,
        orderDetailId: null,
        orderNo: '',
        processType: 'COATING',
        startTime: '',
        endTime: '',
        producedQty: null,
        proceedNextProcess: true,
        operator: '',
        remark: ''
      }
      this.workReportPlannedQty = 0
      this.workReportScanCode = ''
      this.workReportEditingId = null
    },
    sumWorkReportProducedQty(list) {
      if (!Array.isArray(list) || !list.length) return 0
      return Number(
        list.reduce((sum, item) => sum + Number((item && item.produced_qty) || 0), 0).toFixed(2)
      )
    },
    refreshWorkReportSuggestedQty() {
      if (this.workReportEditingId) return
      const planned = Number(this.workReportPlannedQty || 0)
      if (!(planned > 0)) return
      const remain = Number(Math.max(planned - this.sumWorkReportProducedQty(this.workReportList), 0).toFixed(2))
      this.workReportForm.producedQty = remain > 0 ? remain : null
    },
    getProcessTypeLabel(processType) {
      const p = String(processType || '').toUpperCase()
      if (p === 'COATING') return '涂布'
      if (p === 'REWINDING') return '复卷'
      if (p === 'SLITTING') return '分切'
      return p || '-'
    },
    async openWorkReportDialog(row, processType) {
      const scheduleId = this.getScheduleId(row)
      const orderDetailId = Number((row && row.order_detail_id) || 0)
      if (!scheduleId && !orderDetailId) {
        this.$message.warning('当前记录缺少排程ID和订单明细ID，不能报工')
        return
      }
      const now = this.toDateTimeString(new Date())
      const normalizedProcessType = String(processType || this.resolveDefaultReportProcessType(row)).toUpperCase()
      const plannedQty = normalizedProcessType === 'REWINDING'
        ? this.getRewindingRollCount(row)
        : Number(row.schedule_qty || 0)
      this.workReportPlannedQty = Number(plannedQty || 0)
      const detailLabel = orderDetailId > 0 ? ` - 明细号:${orderDetailId}` : ''
      this.workReportDialogTitle = `${this.getProcessTypeLabel(normalizedProcessType)}报工${detailLabel}`
      this.workReportForm = {
        scheduleId,
        orderDetailId: orderDetailId > 0 ? orderDetailId : null,
        orderNo: String((row && row.order_no) || ''),
        processType: normalizedProcessType,
        startTime: now,
        endTime: now,
        producedQty: Number(plannedQty || 0) > 0 ? Number(plannedQty) : null,
        proceedNextProcess: true,
        operator: '',
        remark: ''
      }
      this.workReportScanCode = ''
      this.workReportDialogVisible = true
      if (scheduleId) {
        await this.loadWorkReportList()
      } else {
        this.workReportList = []
      }
    },
    async loadWorkReportList() {
      if (!this.workReportForm.scheduleId || !this.workReportForm.processType) {
        this.workReportList = []
        return
      }
      this.workReportLoading = true
      try {
        const res = await getReportWorkList({
          scheduleId: this.workReportForm.scheduleId,
          processType: this.workReportForm.processType
        })
        if (res.code === 200 || res.code === 20000) {
          this.workReportList = res.data || []
          this.refreshWorkReportSuggestedQty()
        } else {
          this.workReportList = []
          this.refreshWorkReportSuggestedQty()
        }
      } catch (e) {
        this.workReportList = []
        this.refreshWorkReportSuggestedQty()
        this.$message.error(this.parseApiError(e, '加载报工历史失败'))
      } finally {
        this.workReportLoading = false
      }
    },
    async submitWorkReport() {
      if (!this.workReportForm.scheduleId && !this.workReportForm.orderDetailId) {
        this.$message.warning('缺少排程ID或订单明细ID')
        return
      }
      if (!this.workReportForm.startTime || !this.workReportForm.endTime) {
        this.$message.warning('请填写开始/结束时间')
        return
      }
      const qty = Number(this.workReportForm.producedQty || 0)
      if (!(qty > 0)) {
        this.$message.warning('生产数量必须大于0')
        return
      }
      this.workReportSubmitting = true
      try {
        const payload = {
          scheduleId: this.workReportForm.scheduleId,
          orderDetailId: this.workReportForm.orderDetailId,
          processType: this.workReportForm.processType,
          startTime: this.workReportForm.startTime,
          endTime: this.workReportForm.endTime,
          producedQty: qty,
          proceedNextProcess: this.workReportForm.proceedNextProcess,
          operator: this.workReportForm.operator,
          remark: this.workReportForm.remark
        }
        const res = this.workReportEditingId
          ? await updateReportWork({ ...payload, reportId: this.workReportEditingId })
          : await reportWork(payload)
        if (res.code === 200 || res.code === 20000) {
          const result = res.data || {}
          const returnedScheduleId = Number(result.scheduleId || this.workReportForm.scheduleId || 0)
          const returnedOrderDetailId = Number(result.orderDetailId || this.workReportForm.orderDetailId || 0)
          if (returnedScheduleId > 0) {
            this.workReportForm.scheduleId = returnedScheduleId
            this.applyReportedScheduleIdToRows(returnedOrderDetailId, returnedScheduleId)
          }
          this.$message.success(this.workReportEditingId ? '报工修改成功' : '报工提交成功')
          this.triggerWorkReportRefresh()
          window.dispatchEvent(new CustomEvent('sales:orders:refresh'))
        } else {
          this.$message.error(res.message || (this.workReportEditingId ? '报工修改失败' : '报工提交失败'))
        }
      } catch (e) {
        this.$message.error(this.parseApiError(e, this.workReportEditingId ? '报工修改失败' : '报工提交失败'))
      } finally {
        this.workReportSubmitting = false
      }
    },
    triggerWorkReportRefresh() {
      // 报工成功后刷新采用“异步并行”，避免点击按钮后长时间等待
      this.loadWorkReportList()
      this.loadOrders()
      if (this.activeTab === 'coating') this.loadCoatingSchedules()
      if (this.activeTab === 'rewinding') this.loadRewindingOrders()
      if (this.activeTab === 'slitting') this.loadSlittingSchedules()
    },
    handleWorkReportDialogClose() {
      this.workReportList = []
      this.resetWorkReportForm()
    },
    editWorkReportRow(row) {
      if (!row || !row.id) {
        this.$message.warning('缺少报工记录ID')
        return
      }
      this.workReportEditingId = Number(row.id)
      this.workReportForm = {
        scheduleId: this.workReportForm.scheduleId,
        orderDetailId: this.workReportForm.orderDetailId,
        orderNo: this.workReportForm.orderNo,
        processType: this.workReportForm.processType,
        startTime: row.start_time || this.workReportForm.startTime,
        endTime: row.end_time || this.workReportForm.endTime,
        producedQty: Number(row.produced_qty || 0) > 0 ? Number(row.produced_qty) : this.workReportForm.producedQty,
        proceedNextProcess: Number(row.proceed_next_process || 0) === 1,
        operator: row.operator_name || this.workReportForm.operator,
        remark: row.remark || ''
      }
    },
    async deleteWorkReportRow(row) {
      if (!row || !row.id) {
        this.$message.warning('缺少报工记录ID')
        return
      }
      try {
        await this.$confirm('确认删除该条报工记录？此操作不可恢复。', '提示', { type: 'warning' })
      } catch (e) {
        return
      }
      try {
        const res = await deleteReportWork({ reportId: row.id })
        if (res.code === 200 || res.code === 20000) {
          this.$message.success('报工记录已删除')
          this.triggerWorkReportRefresh()
          window.dispatchEvent(new CustomEvent('sales:orders:refresh'))
        } else {
          this.$message.error(res.message || '删除失败')
        }
      } catch (e) {
        this.$message.error(this.parseApiError(e, '删除失败'))
      }
    },
    applyWorkReportScan() {
      const raw = String(this.workReportScanCode || '').trim()
      if (!raw) {
        this.$message.warning('请先扫码派工单明细二维码')
        return
      }
      const row = this.findRowByWorkReportScan(raw)
      if (!row) {
        this.$message.warning('未找到对应明细，请检查二维码内容')
        return
      }
      const processType = this.workReportForm.processType || this.resolveDefaultReportProcessType(row)
      this.openWorkReportDialog(row, processType)
    },
    findRowByWorkReportScan(code) {
      const text = String(code || '').trim()
      if (!text) return null
      const upper = text.toUpperCase()
      const digits = upper.replace(/\D/g, '')
      const lists = []
      if (Array.isArray(this.slittingList)) lists.push(...this.slittingList)
      if (Array.isArray(this.rewindingList)) lists.push(...this.rewindingList)
      if (Array.isArray(this.coatingList)) lists.push(...this.coatingList)
      if (Array.isArray(this.orderList)) lists.push(...this.orderList)

      const match = (row) => {
        const od = String((row && (row.order_detail_id || row.orderDetailId || row.detail_no || row.detailNo)) || '').trim()
        const sid = String((row && (row.schedule_id || row.id)) || '').trim()
        const orderNo = String((row && row.order_no) || '').trim().toUpperCase()
        const material = String((row && row.material_code) || '').trim().toUpperCase()
        if (od && (od === upper || od === digits)) return true
        if (sid && (sid === upper || sid === digits)) return true
        if (orderNo && orderNo === upper) return true
        if (material && material === upper) return true
        return false
      }

      return lists.find(match) || null
    },
    applyReportedScheduleIdToRows(orderDetailId, scheduleId) {
      const sid = Number(scheduleId || 0)
      const did = Number(orderDetailId || 0)
      if (!(sid > 0) || !(did > 0)) return
      const patch = rows => {
        if (!Array.isArray(rows)) return
        rows.forEach(r => {
          if (Number((r && r.order_detail_id) || 0) === did) {
            this.$set(r, 'schedule_id', sid)
            if (!r.id) this.$set(r, 'id', sid)
          }
        })
      }
      patch(this.orderList)
      patch(this.coatingList)
      patch(this.rewindingList)
      patch(this.slittingList)
    },
    resetMaterialIssueForm() {
      this.materialIssueForm = {
        scheduleId: null,
        orderDetailId: null,
        orderNo: '',
        processType: 'COATING',
        operator: '',
        remark: '',
        materialIssues: [
          {
            materialType: '原料',
            materialCode: '',
            stockId: null,
            rollCode: '',
            planArea: null,
            actualArea: null,
            lossArea: 0
          }
        ]
      }
    },
    addMaterialIssueRow() {
      this.materialIssueForm.materialIssues.push({
        materialType: '原料',
        materialCode: '',
        stockId: null,
        rollCode: '',
        planArea: null,
        actualArea: null,
        lossArea: 0
      })
    },
    removeMaterialIssueRow(index) {
      if (!Array.isArray(this.materialIssueForm.materialIssues)) return
      this.materialIssueForm.materialIssues.splice(index, 1)
      if (!this.materialIssueForm.materialIssues.length) {
        this.addMaterialIssueRow()
      }
    },
    async openMaterialIssueDialog(row) {
      const scheduleId = this.getScheduleId(row)
      const orderDetailId = Number((row && row.order_detail_id) || 0)
      if (!scheduleId && !orderDetailId) {
        this.$message.warning('当前记录缺少排程ID和订单明细ID，不能领料登记')
        return
      }
      this.resetMaterialIssueForm()
      this.materialIssueForm.scheduleId = scheduleId || null
      this.materialIssueForm.orderDetailId = orderDetailId > 0 ? orderDetailId : null
      this.materialIssueForm.orderNo = String((row && row.order_no) || '')
      this.materialIssueForm.processType = this.resolveDefaultReportProcessType(row)
      this.materialIssueDialogVisible = true
      if (scheduleId) {
        await this.loadMaterialIssueList()
      } else {
        this.materialIssueList = []
      }
    },
    async loadMaterialIssueList() {
      if (!this.materialIssueForm.scheduleId || !this.materialIssueForm.processType) {
        this.materialIssueList = []
        return
      }
      this.materialIssueLoading = true
      try {
        const res = await getProcessMaterialIssues({
          scheduleId: this.materialIssueForm.scheduleId,
          processType: this.materialIssueForm.processType
        })
        if (res.code === 200 || res.code === 20000) {
          this.materialIssueList = res.data || []
        } else {
          this.materialIssueList = []
        }
      } catch (e) {
        this.materialIssueList = []
        this.$message.error(this.parseApiError(e, '加载领料历史失败'))
      } finally {
        this.materialIssueLoading = false
      }
    },
    async submitMaterialIssue() {
      if (!this.materialIssueForm.scheduleId && !this.materialIssueForm.orderDetailId) {
        this.$message.warning('缺少排程ID或订单明细ID')
        return
      }
      const rows = (this.materialIssueForm.materialIssues || []).map(r => ({
        materialType: String((r && r.materialType) || '原料'),
        materialCode: String((r && r.materialCode) || '').trim(),
        stockId: Number((r && r.stockId) || 0) > 0 ? Number(r.stockId) : null,
        rollCode: String((r && r.rollCode) || '').trim(),
        planArea: Number((r && r.planArea) || 0),
        actualArea: Number((r && r.actualArea) || 0),
        lossArea: Number((r && r.lossArea) || 0)
      })).filter(r => r.materialCode && (r.actualArea > 0 || r.planArea > 0 || r.lossArea > 0))

      if (!rows.length) {
        this.$message.warning('请至少填写一条有效领料明细')
        return
      }

      this.materialIssueSubmitting = true
      try {
        const res = await issueProcessMaterial({
          scheduleId: this.materialIssueForm.scheduleId,
          orderDetailId: this.materialIssueForm.orderDetailId,
          processType: this.materialIssueForm.processType,
          materialIssues: rows,
          operator: this.materialIssueForm.operator,
          remark: this.materialIssueForm.remark
        })
        if (res.code === 200 || res.code === 20000) {
          this.$message.success('领料登记成功')
          await this.loadMaterialIssueList()
          this.loadOrders()
          if (this.activeTab === 'coating') this.loadCoatingSchedules()
          if (this.activeTab === 'rewinding') this.loadRewindingOrders()
          if (this.activeTab === 'slitting') this.loadSlittingSchedules()
        } else {
          this.$message.error(res.message || '领料登记失败')
        }
      } catch (e) {
        this.$message.error(this.parseApiError(e, '领料登记失败'))
      } finally {
        this.materialIssueSubmitting = false
      }
    },
    handleMaterialIssueDialogClose() {
      this.materialIssueList = []
      this.resetMaterialIssueForm()
    },
    handleRewindingDateFocus(row) {
      if (!row) return
      if (!this.canJumpToRewinding(row)) {
        this.$message.warning('当前订单尚未进入可复卷阶段，请先完成有效涂布排程')
        return
      }
      const detailId = Number(row.order_detail_id || 0)
      if (!detailId) return
      this.activeTab = 'rewinding'
      this.$nextTick(async() => {
        const targetPage = await this.findRewindingPageByDetailId(detailId, row)
        this.rewindingPage = targetPage
        await this.loadRewindingOrders()
        const ok = this.markRewindingHighlight(detailId, row)
        if (!ok) {
          this.$message.warning('未在复卷排程列表定位到该订单，请先确认该订单已进入复卷阶段')
        }
      })
    },

    isRewindingRowCoveredByOrder(row, sourceRow) {
      if (!row || !sourceRow) return false
      const sourceOrderNo = String(sourceRow.order_no || '').trim()
      if (!sourceOrderNo) return false
      const related = String(row.related_order_nos || '').split(',').map(s => s.trim()).filter(Boolean)
      const inRelated = related.includes(sourceOrderNo)
      if (!inRelated) return false

      const sourceMaterial = this.normalizeMaterialCode(sourceRow.material_code || '')
      const rowMaterial = this.normalizeMaterialCode(row.material_code || '')
      if (!sourceMaterial || !rowMaterial) return true
      return sourceMaterial === rowMaterial
    },

    async findRewindingPageByDetailId(orderDetailId, sourceRow) {
      const id = Number(orderDetailId || 0)
      if (!id) return 1
      try {
        const pageSize = Number(this.rewindingPageSize || 20)
        const first = await getCoatingCompletedOrders({ current: 1, size: pageSize })
        if (!(first.code === 200 || first.code === 20000)) return 1
        const firstPage = first.data || {}
        const firstRecords = firstPage.records || firstPage.list || []
        if (firstRecords.some(r => Number(r.order_detail_id || 0) === id || this.isRewindingRowCoveredByOrder(r, sourceRow))) {
          return 1
        }

        const total = Number(firstPage.total || 0)
        const pages = Math.max(1, Math.ceil(total / pageSize))
        for (let p = 2; p <= pages; p++) {
          const res = await getCoatingCompletedOrders({ current: p, size: pageSize })
          if (!(res.code === 200 || res.code === 20000)) continue
          const pageData = res.data || {}
          const records = pageData.records || pageData.list || []
          if (records.some(r => Number(r.order_detail_id || 0) === id || this.isRewindingRowCoveredByOrder(r, sourceRow))) {
            return p
          }
        }
        return 1
      } catch (e) {
        return 1
      }
    },

    rewindingRowClassName({ row }) {
      const current = Number(this.highlightRewindingDetailId || 0)
      const currentScheduleId = Number(this.highlightRewindingScheduleId || 0)
      const rowDetailId = Number((row && row.order_detail_id) || 0)
      const rowScheduleId = Number((row && (row.schedule_id || row.id)) || 0)
      if ((current > 0 && rowDetailId === current) || (currentScheduleId > 0 && rowScheduleId === currentScheduleId)) {
        return 'rewinding-highlight-row'
      }
      return ''
    },

    markRewindingHighlight(orderDetailId, sourceRow) {
      const id = Number(orderDetailId || 0)
      const rows = this.rewindingList || []
      if (!id && !sourceRow) return false

      let targetIdx = rows.findIndex(r => Number(r.order_detail_id || 0) === id)
      if (targetIdx < 0 && sourceRow) {
        targetIdx = rows.findIndex(r => this.isRewindingRowCoveredByOrder(r, sourceRow))
      }
      if (targetIdx < 0) return false

      const targetRow = rows[targetIdx] || {}
      this.highlightRewindingDetailId = Number(targetRow.order_detail_id || id || 0) || null
      this.highlightRewindingScheduleId = Number(targetRow.schedule_id || targetRow.id || 0) || null
      if (this.highlightRewindingTimer) {
        clearTimeout(this.highlightRewindingTimer)
      }
      this.highlightRewindingTimer = setTimeout(() => {
        this.highlightRewindingDetailId = null
        this.highlightRewindingScheduleId = null
        this.highlightRewindingTimer = null
      }, 10000)

      this.$nextTick(() => {
        const idx = targetIdx
        if (idx < 0) return
        const table = this.$refs.rewindingTable
        if (!table || !table.$el) return
        const body = table.$el.querySelector('.el-table__body-wrapper')
        const rows = table.$el.querySelectorAll('.el-table__body-wrapper tbody tr')
        if (!body || !rows || !rows[idx]) return
        body.scrollTop = rows[idx].offsetTop - 40
      })
      return true
    },
    handlePackagingDateFocus(row) {
      if (!row) return
      if (!this.canJumpToSlitting(row)) {
        this.$message.warning('当前订单尚未进入可分切阶段，请先完成复卷排程')
        return
      }
      const detailId = Number(row.order_detail_id || 0)
      if (!detailId) return
      this.activeTab = 'slitting'
      this.$nextTick(async() => {
        const targetPage = await this.findSlittingPageByDetailId(detailId)
        this.slittingPage = targetPage
        await this.loadSlittingSchedules()
        const ok = this.markSlittingHighlight(detailId)
        if (!ok) {
          this.$message.warning('未在分切排程列表定位到该订单，请先确认该订单已进入分切阶段')
        }
      })
    },

    async findSlittingPageByDetailId(orderDetailId) {
      const id = Number(orderDetailId || 0)
      if (!id) return 1
      try {
        const pageSize = Number(this.slittingPageSize || 20)
        const first = await getSlittingSchedules({ current: 1, size: pageSize })
        if (!(first.code === 200 || first.code === 20000)) return 1

        const firstPage = first.data || {}
        const firstRecords = firstPage.records || firstPage.list || []
        if (firstRecords.some(r => Number(r.order_detail_id || 0) === id)) {
          return 1
        }

        const total = Number(firstPage.total || 0)
        const pages = Math.max(1, Math.ceil(total / pageSize))
        for (let p = 2; p <= pages; p++) {
          const res = await getSlittingSchedules({ current: p, size: pageSize })
          if (!(res.code === 200 || res.code === 20000)) continue
          const pageData = res.data || {}
          const records = pageData.records || pageData.list || []
          if (records.some(r => Number(r.order_detail_id || 0) === id)) {
            return p
          }
        }
        return 1
      } catch (e) {
        return 1
      }
    },

    slittingRowClassName({ row }) {
      const current = Number(this.highlightSlittingDetailId || 0)
      const rowDetailId = Number((row && row.order_detail_id) || 0)
      if (current > 0 && rowDetailId === current) {
        return 'slitting-highlight-row'
      }
      return ''
    },

    markSlittingHighlight(orderDetailId) {
      const id = Number(orderDetailId || 0)
      if (!id) return false
      const exists = (this.slittingList || []).some(r => Number(r.order_detail_id || 0) === id)
      if (!exists) return false
      this.highlightSlittingDetailId = id
      if (this.highlightSlittingTimer) {
        clearTimeout(this.highlightSlittingTimer)
      }
      this.highlightSlittingTimer = setTimeout(() => {
        this.highlightSlittingDetailId = null
        this.highlightSlittingTimer = null
      }, 10000)

      this.$nextTick(() => {
        const idx = (this.slittingList || []).findIndex(r => Number(r.order_detail_id || 0) === id)
        if (idx < 0) return
        const table = this.$refs.slittingTable
        if (!table || !table.$el) return
        const body = table.$el.querySelector('.el-table__body-wrapper')
        const rows = table.$el.querySelectorAll('.el-table__body-wrapper tbody tr')
        if (!body || !rows || !rows[idx]) return
        body.scrollTop = rows[idx].offsetTop - 40
      })
      return true
    },
    formatOrderSpec(row) {
      if (!row) return '-'
      const t = row.thickness != null && row.thickness !== '' ? `${row.thickness}μm` : '-'
      const w = row.width != null && row.width !== '' ? `${row.width}mm` : '-'
      const l = row.length != null && row.length !== '' ? `${row.length}m` : '-'
      return `${t}*${w}*${l}`
    },
    formatInsertMode(mode) {
      return String(mode || 'AFTER_TIME').toUpperCase() === 'AFTER_ORDER' ? '按订单后' : '按时间后'
    },
    formatRebalanceMode(mode) {
      return String(mode || 'MANUAL_CROSS_LINE').toUpperCase() === 'SAME_LINE' ? '同线顺延' : '人工选跨线'
    },
    getCoatingAnchorOptions(currentRow) {
      const currentId = Number((currentRow && (currentRow.id || currentRow.schedule_id)) || 0)
      return (this.coatingList || [])
        .map(item => ({
          id: Number(item.id || item.schedule_id || 0),
          orderNo: String(item.related_order_nos || item.order_no || ''),
          start: String(item.coating_schedule_date || item.coating_start_time || '')
        }))
        .filter(item => item.id > 0 && item.id !== currentId)
    },
    coatingAnchorLabel(anchor) {
      if (!anchor) return '-'
      const when = anchor.start ? this.formatDateTime(anchor.start) : '-'
      return `${anchor.id}｜${anchor.orderNo || '-'}｜${when}`
    },
    displayCoatingAnchor(row) {
      if (!row || String(row.insert_mode || 'AFTER_TIME').toUpperCase() !== 'AFTER_ORDER') {
        return '-'
      }
      const anchorId = Number(row.anchor_schedule_id || 0)
      if (!(anchorId > 0)) return '-'
      const anchor = this.getCoatingAnchorOptions(row).find(item => item.id === anchorId)
      return anchor ? this.coatingAnchorLabel(anchor) : `#${anchorId}`
    },
    handleCoatingInsertModeChange(row) {
      if (!row) return
      if (String(row.insert_mode || '').toUpperCase() !== 'AFTER_ORDER') {
        this.$set(row, 'anchor_schedule_id', null)
      }
      this.updateCoatingAvailability(row).then(() => {
        this.applyCoatingTimelinePreview()
      })
    },
    handleCoatingAnchorChange(row) {
      this.updateCoatingAvailability(row).then(() => {
        this.applyCoatingTimelinePreview()
      })
    },
    formatThickness(row) {
      const t = Number((row && (row.thickness != null ? row.thickness : row.total_thickness)) || 0)
      if (!Number.isFinite(t) || t <= 0) return '-'
      return Number.isInteger(t) ? String(t) : String(Number(t.toFixed(2)))
    },
    toDateValue(value) {
      if (!value) return 0
      const d = new Date(String(value).replace(' ', 'T'))
      return Number.isNaN(d.getTime()) ? 0 : d.getTime()
    },
    getPendingSortValue(row, key) {
      if (!row) return ''
      if (key === 'spec') {
        const t = Number(row.thickness || 0)
        const w = Number(row.width || 0)
        const l = Number(row.length || 0)
        return t * 100000000 + w * 10000 + l
      }
      if (key === 'coating_date' || key === 'rewinding_date' || key === 'packaging_date') {
        return this.toDateValue(row[key])
      }
      if (key === 'is_completed') {
        return row.is_completed === 'Y' ? 1 : 0
      }
      if (key === 'suggested_coating_area') {
        return Number(row.unlocked_area || 0)
      }
      if (['priority_score', 'order_qty', 'schedule_qty', 'remaining_qty', 'owe_area', 'completed_qty', 'locked_area_total', 'unlocked_area'].includes(key)) {
        return Number(row[key] || 0)
      }
      return String(row[key] == null ? '' : row[key]).toUpperCase()
    },
    applyPendingSort() {
      const src = Array.isArray(this.pendingRawList) ? [...this.pendingRawList] : []
      const { prop, order } = this.pendingSort || {}
      if (!prop || !order) {
        this.orderList = src
        return
      }
      const factor = order === 'ascending' ? 1 : -1
      src.sort((a, b) => {
        const av = this.getPendingSortValue(a, prop)
        const bv = this.getPendingSortValue(b, prop)
        if (av === bv) return 0
        return av > bv ? factor : -factor
      })
      this.orderList = src
    },
    handlePendingSortChange({ prop, order, column }) {
      this.$message.info('待排程列表已固定按优先级从高到低排序')
    },
    getSortStringValue(value) {
      return String(value == null ? '' : value).toUpperCase()
    },
    getSortNumericValue(value) {
      return Number(value || 0)
    },
    sortByState(list, sortState, valueGetter) {
      const src = Array.isArray(list) ? [...list] : []
      const { prop, order } = sortState || {}
      if (!prop || !order) return src
      const factor = order === 'ascending' ? 1 : -1
      src.sort((a, b) => {
        const av = valueGetter(a, prop)
        const bv = valueGetter(b, prop)
        if (av === bv) return 0
        return av > bv ? factor : -factor
      })
      return src
    },
    getCoatingSortValue(row, key) {
      if (!row) return ''
      if (['schedule_id', 'id', 'coating_area', 'locked_area', 'unlocked_area', 'coating_width', 'coating_length'].includes(key)) {
        return this.getSortNumericValue(row[key] != null ? row[key] : row.id)
      }
      if (key === 'coating_speed') {
        return this.getSortNumericValue(this.resolveCoatingSpeed(row))
      }
      if (key === 'coating_duration') {
        return this.getSortNumericValue(this.calcCoatingMinutes(row))
      }
      if (key === 'coating_schedule_date') {
        return this.toDateValue(row.coating_schedule_date || row.coating_start_time)
      }
      if (key === 'coating_equipment') {
        return this.getSortStringValue(this.equipmentName(row.coating_equipment))
      }
      return this.getSortStringValue(row[key])
    },
    applyCoatingSort() {
      this.coatingList = this.sortByState(this.coatingList, this.coatingSort, (row, key) => this.getCoatingSortValue(row, key))
    },
    handleCoatingSortChange({ prop, order, column }) {
      const key = (column && column.columnKey) || prop
      this.coatingSort = {
        prop: key,
        order: order || null
      }
      this.applyCoatingSort()
    },
    getRewindingSortValue(row, key) {
      if (!row) return ''
      if (key === 'spec') {
        const t = Number(row.thickness || 0)
        const w = Number(row.width || 0)
        const l = Number(row.length || 0)
        return t * 100000000 + w * 10000 + l
      }
      if (['schedule_qty', 'rewinding_width'].includes(key)) {
        return this.getSortNumericValue(row[key])
      }
      if (key === 'rewinding_area') {
        return this.getSortNumericValue(this.getPlannedRewindingArea(row))
      }
      if (key === 'rewinding_roll_count') {
        return this.getSortNumericValue(this.getRewindingRollCount(row))
      }
      if (key === 'rewinding_speed') {
        return this.getSortNumericValue(this.resolveRewindingSpeed(row))
      }
      if (key === 'rewinding_duration') {
        return this.getSortNumericValue(this.calcRewindingMinutes(row))
      }
      if (key === 'coating_date') {
        return this.toDateValue(row.coating_start_time || row.coating_date)
      }
      if (key === 'rewinding_date') {
        return this.toDateValue(row.rewinding_date || row.rewinding_start_time)
      }
      return this.getSortStringValue(row[key])
    },
    applyRewindingSort() {
      this.rewindingList = this.sortByState(this.rewindingList, this.rewindingSort, (row, key) => this.getRewindingSortValue(row, key))
    },
    handleRewindingSortChange({ prop, order, column }) {
      const key = (column && column.columnKey) || prop
      this.rewindingSort = {
        prop: key,
        order: order || null
      }
      this.applyRewindingSort()
    },
    getSlittingSortValue(row, key) {
      if (!row) return ''
      if (key === 'spec') {
        const t = Number(row.thickness || 0)
        const w = Number(row.width || 0)
        const l = Number(row.length || 0)
        return t * 100000000 + w * 10000 + l
      }
      if (key === 'schedule_qty') {
        return this.getSortNumericValue(row.schedule_qty)
      }
      if (key === 'slitting_speed') {
        return this.getSortNumericValue(this.resolveSlittingSpeed(row))
      }
      if (key === 'slitting_duration') {
        return this.getSortNumericValue(this.calcSlittingMinutes(row))
      }
      if (key === 'packaging_date') {
        return this.toDateValue(row.packaging_date || row.slitting_start_time)
      }
      if (key === 'rewinding_time') {
        return this.toDateValue(row.rewinding_end_time || row.rewinding_end_date || row.rewinding_date)
      }
      return this.getSortStringValue(row[key])
    },
    applySlittingSort() {
      this.slittingList = this.sortByState(this.slittingList, this.slittingSort, (row, key) => this.getSlittingSortValue(row, key))
    },
    handleSlittingSortChange({ prop, order, column }) {
      const key = (column && column.columnKey) || prop
      this.slittingSort = {
        prop: key,
        order: order || null
      }
      this.applySlittingSort()
    },
    getPlannedRewindingArea(row) {
      if (!row) return 0
      const demandArea = this.getOrderDemandArea(row)
      if (demandArea > 0) return demandArea

      const rewindingArea = Number(row.rewinding_scheduled_area || row.rewindingScheduledArea || 0)
      if (rewindingArea > 0) return rewindingArea

      const remainingArea = Number(row.remaining_coating_area || row.remainingCoatingArea || 0)
      if (remainingArea > 0) return remainingArea

      const area = Number(row.coating_area || 0)
      if (area > 0) return area
      const width = Number(row.width || 0)
      const length = Number(row.length || 0)
      const qty = Number(row.schedule_qty || 0)
      if (width > 0 && length > 0 && qty > 0) {
        return (width / 1000) * length * qty
      }
      return 0
    },
    getOrderDemandArea(row) {
      if (!row) return 0
      const width = Number(row.width || row.order_width || row.orderWidth || 0)
      const length = this.resolveOrderSpecLength(row)
      const qty = Number(
        row.schedule_qty ||
        row.remaining_qty ||
        row.order_qty ||
        row.qty ||
        0
      )
      if (width <= 0 || length <= 0 || qty <= 0) return 0
      return Number(((width / 1000) * length * qty).toFixed(2))
    },
    getRewindingRollCount(row) {
      if (!row) return 0
      const area = Number(this.getPlannedRewindingArea(row) || 0)
      const rewindingWidth = Number(row.rewinding_width || 0)
      const length = this.resolveOrderSpecLength(row)
      if (area <= 0 || rewindingWidth <= 0 || length <= 0) return 0
      const singleRollArea = (rewindingWidth / 1000) * length
      if (singleRollArea <= 0) return 0
      const ratio = area / singleRollArea
      return Math.ceil(ratio - 1e-9)
    },
    resolveOrderSpecLength(row) {
      if (!row) return 0
      const direct = Number(
        row.length ||
        row.order_length ||
        row.orderLength ||
        row.lengthM ||
        0
      )
      if (direct > 0) return direct

      const specText = String(
        row.spec ||
        row.order_spec ||
        row.orderSpec ||
        this.formatOrderSpec(row) ||
        ''
      )
      const match = specText.match(/(\d+(?:\.\d+)?)\s*m\s*$/i)
      if (match && Number(match[1]) > 0) return Number(match[1])

      const parts = specText.split('*').map(s => String(s || '').trim())
      if (parts.length >= 3) {
        const last = parts[parts.length - 1]
        const n = Number(String(last).replace(/[^\d.]/g, ''))
        if (n > 0) return n
      }
      return 0
    },
    formatScheduleStatus(status) {
      const s = String(status || '').toUpperCase()
      if (s === 'PENDING') return { label: '待确认', type: 'info' }
      if (s === 'REWINDING_SCHEDULED') return { label: '复卷已排', type: 'success' }
      if (s === 'COATING_SCHEDULED') return { label: '待复卷', type: 'warning' }
      if (s === 'CONFIRMED') return { label: '已确认', type: 'primary' }
      if (s === 'TERMINATED') return { label: '已终止', type: 'danger' }
      return { label: status || '-', type: 'info' }
    },

    formatSlittingStatus(status) {
      const s = String(status || '').toUpperCase()
      if (s === 'PENDING') return { label: '待确认', type: 'info' }
      if (s === 'REWINDING_SCHEDULED') return { label: '待分切', type: 'warning' }
      if (s === 'CONFIRMED') return { label: '分切已排', type: 'success' }
      if (s === 'TERMINATED') return { label: '已终止', type: 'danger' }
      return { label: status || '-', type: 'info' }
    },
    isRewindingLocked(row) {
      const s = String((row && row.status) || '').toUpperCase()
      return s === 'REWINDING_SCHEDULED'
    },
    hasRewindingPlan(row) {
      if (!row) return false
      const equipment = String(row.rewinding_equipment || '').trim()
      if (!equipment) return false
      const startRaw = row.rewinding_start_time || row.rewinding_date || row.rewindingDate || ''
      const start = this.parseDateTimeValue(startRaw)
      return !!start
    },
    hasCoatingPlan(row) {
      if (!row) return false
      const equipment = String(row.coating_equipment || row.equipment_id || '').trim()
      if (!equipment) return false
      const startRaw = row.coating_start_time || row.coating_schedule_date || row.coating_date || row.coatingDate || ''
      return !!this.parseDateTimeValue(startRaw)
    },
    hasSlittingPlan(row) {
      if (!row) return false
      const equipment = String(row.slitting_equipment || row.rewinding_equipment || '').trim()
      if (!equipment) return false
      const startRaw = row.slitting_start_time || row.packaging_date || row.slitting_schedule_date || ''
      return !!this.parseDateTimeValue(startRaw)
    },
    getUnlockedArea(row) {
      if (!row) return 0
      const n = Number(
        row.unlocked_area != null
          ? row.unlocked_area
          : (row.unlockedArea != null ? row.unlockedArea : 0)
      )
      return Number.isFinite(n) && n > 0 ? n : 0
    },
    hasLockRisk(row) {
      return this.getUnlockedArea(row) > 0
    },
    refreshRewindingLockSummary() {
      const rows = this.rewindingList || []
      let unlockedRows = 0
      let unlockedArea = 0
      rows.forEach(r => {
        const ua = this.getUnlockedArea(r)
        if (ua > 0) {
          unlockedRows += 1
          unlockedArea += ua
        }
      })
      this.rewindingLockSummary = {
        unlockedRows,
        unlockedArea: Number(unlockedArea.toFixed(2))
      }
    },
    refreshSlittingLockSummary() {
      const rows = this.slittingList || []
      let unlockedRows = 0
      let unlockedArea = 0
      rows.forEach(r => {
        const ua = this.getUnlockedArea(r)
        if (ua > 0) {
          unlockedRows += 1
          unlockedArea += ua
        }
      })
      this.slittingLockSummary = {
        unlockedRows,
        unlockedArea: Number(unlockedArea.toFixed(2))
      }
    },
    parseDateTimeValue(value) {
      if (!value) return null
      const text = String(value).trim()
      if (!text) return null
      const normalized = text.length === 10 ? `${text} 08:00:00` : text
      const date = new Date(normalized.replace(' ', 'T'))
      if (Number.isNaN(date.getTime())) return null
      return date
    },
    getNextDayEightClockString(baseTime = new Date()) {
      const date = baseTime instanceof Date ? new Date(baseTime.getTime()) : new Date()
      const safeDate = Number.isNaN(date.getTime()) ? new Date() : date
      safeDate.setDate(safeDate.getDate() + 1)
      safeDate.setHours(8, 0, 0, 0)
      return this.toDateTimeString(safeDate)
    },
    isStockScheduleRow(row) {
      return String((row && row.schedule_type) || '').toUpperCase() === 'STOCK'
    },
    getRoundedMinutes(length, speed) {
      const l = Number(length || 0)
      const s = Number(speed || 0)
      if (l <= 0 || s <= 0) return 0
      const rawMinutes = l / s
      return Math.ceil(rawMinutes / 10) * 10
    },

    calcCoatingMinutes(row) {
      if (!row) return 0
      const persistedMinutes = Number(row.coating_duration_minutes || row.coatingDurationMinutes || 0)
      if (persistedMinutes > 0) return persistedMinutes

      let coatingLength = Number(row.coating_length || 0)
      if (!(coatingLength > 0)) {
        const area = Number(row.coating_area || 0)
        const coatingWidthMm = Number(row.coating_width || 1040)
        const coatingWidthM = coatingWidthMm > 0 ? coatingWidthMm / 1000 : 0
        coatingLength = coatingWidthM > 0 ? area / coatingWidthM : Number(row.length || 0)
      }
      const coatingSpeed = this.resolveCoatingSpeed(row)
      if (coatingLength <= 0 || coatingSpeed <= 0) return 0
      return this.getRoundedMinutes(coatingLength, coatingSpeed)
    },
    formatMonthDayHour(date) {
      if (!date) return '-'
      const mm = String(date.getMonth() + 1).padStart(2, '0')
      const dd = String(date.getDate()).padStart(2, '0')
      const hh = date.getHours()
      return `${mm}-${dd} ${hh}时`
    },
    formatTimeWindow(startDate, endDate) {
      if (!startDate || !endDate) return '-'
      return `${this.formatMonthDayHour(startDate)}~${this.formatMonthDayHour(endDate)}`
    },
    timeWindowLine(text, lineIndex) {
      const raw = String(text || '-').trim()
      if (!raw || raw === '-') {
        return lineIndex === 0 ? '-' : ''
      }
      const parts = raw.split('~')
      if (parts.length < 2) {
        return lineIndex === 0 ? raw : ''
      }
      return parts[lineIndex] || ''
    },
    formatCoatingTimeWindow(row) {
      if (!row) return '-'
      const start = row.coating_start_time || row.coatingStartTime || row.coating_schedule_date || row.coatingScheduleDate
      const end = row.coating_end_time || row.coatingEndTime

      const startDate = this.parseDateTimeValue(start)
      if (startDate) {
        const area = Number(row.coating_area || 0)
        const coatingWidthMm = Number(row.coating_width || row.width || 0)
        const coatingWidthM = coatingWidthMm > 0 ? coatingWidthMm / 1000 : 0
        const coatingLength = coatingWidthM > 0 ? area / coatingWidthM : Number(row.coating_length || row.length || 0)
        const coatingSpeed = this.resolveCoatingSpeed(row) || 40
        const roundedMinutes = this.getRoundedMinutes(coatingLength, coatingSpeed)
        if (roundedMinutes > 0) {
          const calcEnd = new Date(startDate.getTime() + roundedMinutes * 60 * 1000)
          return this.formatTimeWindow(startDate, calcEnd)
        }
      }

      const endDate = this.parseDateTimeValue(end)
      if (startDate && endDate) {
        return this.formatTimeWindow(startDate, endDate)
      }
      return row.coating_date ? this.formatDateTime(row.coating_date) : '-'
    },
    formatRewindingTimeWindow(row) {
      if (!row) return '-'
      const start = row.rewinding_start_time || row.rewindingStartTime || row.rewinding_date || row.rewindingDate
      const end = row.rewinding_end_time || row.rewindingEndTime

      const startDate = this.parseDateTimeValue(start)
      const endDate = this.parseDateTimeValue(end)
      if (startDate && endDate) {
        return this.formatTimeWindow(startDate, endDate)
      }

      if (startDate) {
        const roundedMinutes = this.calcRewindingMinutes(row)
        if (roundedMinutes > 0) {
          const calcEnd = new Date(startDate.getTime() + roundedMinutes * 60 * 1000)
          return this.formatTimeWindow(startDate, calcEnd)
        }
      }
      return start ? this.formatDateTime(start) : '-'
    },
    async loadCoatingSpeedMap() {
      try {
        const res = await getProcessParamsList({
          processType: 'COATING',
          current: 1,
          page: 1,
          size: 5000
        })
        const list = res.data?.list || res.data?.records || []
        const speedMap = {}

        list.forEach(item => {
          const materialCode = this.normalizeMaterialCode(item.materialCode || item.material_code)
          const equipmentCode = this.normalizeEquipmentCode(item.equipmentCode || item.equipment_code)
          const speed = Number(item.coatingSpeed || item.coating_speed || 0)
          if (materialCode && speed > 0) {
            speedMap[this.makeSpeedKey(materialCode, equipmentCode)] = speed
            if (!equipmentCode) {
              speedMap[materialCode] = speed
            }
          }
        })

        this.coatingSpeedMap = speedMap
      } catch (error) {
        console.error('加载涂布工艺参数失败', error)
      }
    },

    async loadRewindingSpeedMap() {
      try {
        const res = await getRewindingProcessParamsList({
          current: 1,
          page: 1,
          size: 5000
        })
        const list = res.data?.list || res.data?.records || []
        const speedMap = {}

        list.forEach(item => {
          const materialCode = this.normalizeMaterialCode(item.materialCode || item.material_code)
          const equipmentCode = this.normalizeEquipmentCode(item.equipmentCode || item.equipment_code)
          const speed = Number(item.rewindingSpeed || item.rewinding_speed || 0)
          if (materialCode && speed > 0) {
            speedMap[this.makeSpeedKey(materialCode, equipmentCode)] = speed
            if (!equipmentCode) {
              speedMap[materialCode] = speed
            }
          }
        })

        this.rewindingSpeedMap = speedMap
      } catch (error) {
        console.error('加载复卷工艺参数失败', error)
      }
    },

    async loadSlittingSpeedMap() {
      try {
        const res = await getSlittingProcessParamsList({
          current: 1,
          page: 1,
          size: 5000
        })
        const list = res.data?.list || res.data?.records || []
        const speedMap = {}

        list.forEach(item => {
          const totalThickness = item.totalThickness != null ? item.totalThickness : item.total_thickness
          const processLength = item.processLength != null ? item.processLength : item.process_length
          const processWidth = item.processWidth != null ? item.processWidth : item.process_width
          const equipmentCode = this.normalizeEquipmentCode(item.equipmentCode || item.equipment_code)
          const speed = Number(item.productionSpeed || item.production_speed || item.slittingSpeed || item.slitting_speed || 0)
          const dimKey = this.makeSlittingDimensionKey(totalThickness, processLength, processWidth, equipmentCode)
          if (dimKey && speed > 0) {
            speedMap[dimKey] = speed
            if (!equipmentCode) {
              const commonKey = this.makeSlittingDimensionKey(totalThickness, processLength, processWidth)
              speedMap[commonKey] = speed
            }
          }
        })

        this.slittingSpeedMap = speedMap
      } catch (error) {
        console.error('加载分切工艺参数失败', error)
      }
    },

    queryTapeSpecByMaterialCode(queryString, cb) {
      const keyword = String(queryString || '').trim()
      if (!keyword) {
        cb([])
        return
      }
      getSpecList({
        page: 1,
        size: 20,
        materialCode: keyword,
        status: 1
      }).then((res) => {
        const ok = res && (res.code === 200 || res.code === 20000)
        const data = ok ? (res.data || {}) : {}
        const list = data.list || data.records || []
        const suggestions = (list || []).map(item => {
          const materialCode = String(item.materialCode || item.material_code || '').trim().toUpperCase()
          const productName = String(item.productName || item.materialName || item.material_name || '').trim()
          const width = Number(item.width != null ? item.width : item.coatingWidth)
          const thickness = Number(item.totalThickness != null ? item.totalThickness : item.total_thickness)
          const normalizedCode = this.normalizeMaterialCode(materialCode)
          if (normalizedCode) {
            this.$set(this.materialNameByCodeCache, normalizedCode, productName)
            this.$set(this.materialSpecByCodeCache, normalizedCode, {
              materialCode,
              productName,
              width: Number.isFinite(width) ? width : null,
              thickness: Number.isFinite(thickness) ? thickness : null
            })
          }
          return {
            value: materialCode,
            materialCode,
            productName,
            width: Number.isFinite(width) ? width : null,
            thickness: Number.isFinite(thickness) ? thickness : null
          }
        }).filter(item => item.materialCode)
        cb(suggestions)
      }).catch(() => cb([]))
    },

    handleManualMaterialInput(row, value) {
      if (!row) return
      const code = String(value || '').toUpperCase()
      this.$set(row, 'material_code', code)
      const key = this.normalizeMaterialCode(code)
      if (!key) {
        this.$set(row, 'material_name', '')
        return
      }
      const cachedName = String(this.materialNameByCodeCache[key] || '').trim()
      if (cachedName) {
        this.$set(row, 'material_name', cachedName)
      }
      const spec = this.materialSpecByCodeCache[key]
      const thickness = Number(spec && spec.thickness)
      if (Number.isFinite(thickness) && thickness > 0) {
        this.$set(row, 'thickness', thickness)
      }
    },

    handleManualMaterialSelect(row, item, mode = 'coating') {
      if (!row || !item) return
      const materialCode = String(item.materialCode || item.value || '').trim().toUpperCase()
      const productName = String(item.productName || '').trim()
      this.$set(row, 'material_code', materialCode)
      this.$set(row, 'material_name', productName)

      const width = Number(item.width)
      if (Number.isFinite(width) && width > 0) {
        if (mode === 'coating') {
          this.$set(row, 'coating_width', Math.round(width))
        } else if (mode === 'rewinding') {
          this.$set(row, 'rewinding_width', Math.round(width))
        }
      }

      const thickness = Number(item.thickness)
      if (Number.isFinite(thickness) && thickness > 0) {
        this.$set(row, 'thickness', thickness)
      }

      const key = this.normalizeMaterialCode(materialCode)
      if (key) {
        this.$set(this.materialNameByCodeCache, key, productName)
        const oldSpec = this.materialSpecByCodeCache[key] || {}
        this.$set(this.materialSpecByCodeCache, key, {
          ...oldSpec,
          materialCode,
          productName,
          width: Number.isFinite(Number(item.width)) ? Number(item.width) : oldSpec.width,
          thickness: Number.isFinite(Number(item.thickness)) ? Number(item.thickness) : oldSpec.thickness
        })
      }

      if (mode === 'coating') {
        this.updateCoatingAvailability(row).then(() => {
          this.applyCoatingTimelinePreview()
        })
      }
    },

    handleManualCoatingMaterialInput(row, value) {
      this.handleManualMaterialInput(row, value)
    },

    handleManualCoatingMaterialSelect(row, item) {
      this.handleManualMaterialSelect(row, item, 'coating')
    },

    handleManualRewindingMaterialInput(row, value) {
      this.handleManualMaterialInput(row, value)
    },

    handleManualRewindingMaterialSelect(row, item) {
      this.handleManualMaterialSelect(row, item, 'rewinding')
    },

    handleManualSlittingMaterialInput(row, value) {
      this.handleManualMaterialInput(row, value)
    },

    handleManualSlittingMaterialSelect(row, item) {
      this.handleManualMaterialSelect(row, item, 'slitting')
    },

    async ensureRowMaterialNameBySpec(row) {
      if (!row) return
      const materialCode = String(row.material_code || '').trim().toUpperCase()
      if (!materialCode) return

      const key = this.normalizeMaterialCode(materialCode)
      const specCache = this.materialSpecByCodeCache[key]
      const cacheThickness = Number(specCache && specCache.thickness)
      if (Number.isFinite(cacheThickness) && cacheThickness > 0 && !(Number(row.thickness) > 0)) {
        this.$set(row, 'thickness', cacheThickness)
      }

      const cachedName = String(this.materialNameByCodeCache[key] || '').trim()
      if (cachedName && String(row.material_name || '').trim()) {
        return
      }
      if (cachedName) {
        this.$set(row, 'material_name', cachedName)
      }

      if (cachedName && Number(row.thickness || 0) > 0) return

      try {
        const specRes = await getSpecByMaterialCode(materialCode)
        const ok = specRes && (specRes.code === 200 || specRes.code === 20000)
        const spec = ok ? (specRes.data || {}) : {}
        const productName = String(spec.productName || spec.materialName || spec.name || '').trim()
        const thickness = Number(spec.totalThickness != null ? spec.totalThickness : spec.total_thickness)
        if (productName) {
          this.$set(row, 'material_name', productName)
          this.$set(this.materialNameByCodeCache, key, productName)
        }
        if (Number.isFinite(thickness) && thickness > 0) {
          this.$set(row, 'thickness', thickness)
        }
        this.$set(this.materialSpecByCodeCache, key, {
          materialCode,
          productName: productName || String(this.materialNameByCodeCache[key] || '').trim(),
          width: specCache ? specCache.width : null,
          thickness: Number.isFinite(thickness) ? thickness : (specCache ? specCache.thickness : null)
        })
      } catch (e) {
        // ignore
      }
    },

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
        const hasName = key && Object.prototype.hasOwnProperty.call(this.materialNameByCodeCache, key)
        const hasSpec = key && Object.prototype.hasOwnProperty.call(this.materialSpecByCodeCache, key)
        return key && (!hasName || !hasSpec)
      })

      if (missingCodes.length) {
        await Promise.all(missingCodes.map(async(code) => {
          const key = this.normalizeMaterialCode(code)
          let name = ''
          let thickness = null
          try {
            const res = await getSpecByMaterialCode(code)
            const spec = (res && (res.code === 200 || res.code === 20000)) ? (res.data || {}) : {}
            name = String(spec.productName || spec.materialName || spec.name || '').trim()
            const t = Number(spec.totalThickness != null ? spec.totalThickness : spec.total_thickness)
            thickness = Number.isFinite(t) ? t : null
          } catch (e) {
            name = ''
            thickness = null
          }
          this.$set(this.materialNameByCodeCache, key, name)
          this.$set(this.materialSpecByCodeCache, key, {
            materialCode: code,
            productName: name,
            width: null,
            thickness
          })
        }))
      }

      return list.map(row => {
        const code = String((row && (row.material_code || row.materialCode)) || '').trim()
        const key = this.normalizeMaterialCode(code)
        const masterName = String((key && this.materialNameByCodeCache[key]) || '').trim()
        const spec = (key && this.materialSpecByCodeCache[key]) || {}
        const rowThickness = Number(spec.thickness)
        const patch = {}
        if (masterName) {
          patch.material_name = masterName
          patch.materialName = masterName
        }
        if (Number.isFinite(rowThickness) && rowThickness > 0 && !(Number(row.thickness || 0) > 0)) {
          patch.thickness = rowThickness
        }
        if (!Object.keys(patch).length) return row
        return {
          ...row,
          ...patch
        }
      })
    },

    normalizeEquipmentCode(code) {
      return String(code || '').replace(/\s+/g, '').trim().toUpperCase()
    },

    makeSpeedKey(materialCode, equipmentCode) {
      const material = this.normalizeMaterialCode(materialCode)
      const equipment = this.normalizeEquipmentCode(equipmentCode)
      return `${material}@@${equipment}`
    },

    normalizeDimensionValue(value) {
      const num = Number(value)
      if (!Number.isFinite(num) || num <= 0) return ''
      return Number.isInteger(num) ? String(num) : String(Number(num.toFixed(4)))
    },

    resolveNumericScheduleId(row) {
      if (!row) return 0
      const candidates = [row.schedule_id, row.id, row.scheduleId]
      for (const candidate of candidates) {
        if (candidate == null) continue
        const text = String(candidate).trim()
        if (!text) continue
        if (/^\d+$/.test(text)) {
          const id = Number(text)
          if (Number.isFinite(id) && id > 0) return id
        }
      }
      return 0
    },

    makeSlittingDimensionKey(totalThickness, processLength, processWidth, equipmentCode) {
      const t = this.normalizeDimensionValue(totalThickness)
      const l = this.normalizeDimensionValue(processLength)
      const w = this.normalizeDimensionValue(processWidth)
      if (!t || !l || !w) return ''
      const eq = this.normalizeEquipmentCode(equipmentCode)
      return `${t}|${l}|${w}@@${eq}`
    },

    resolveSlittingDimensions(row) {
      const totalThickness = Number(row.total_thickness || row.totalThickness || row.thickness || 0)
      const processLength = Number(row.process_length || row.processLength || row.length || 0)
      const processWidth = Number(row.process_width || row.processWidth || row.width || 0)
      const equipmentCode = this.normalizeEquipmentCode(row.equipment_code || row.equipmentCode || row.slitting_equipment || row.slittingEquipment)
      return {
        totalThickness,
        processLength,
        processWidth,
        equipmentCode
      }
    },

    resolveEquipmentCode(row) {
      const direct = this.normalizeEquipmentCode(row.coating_equipment_code || row.equipment_code)
      if (direct) return direct
      const equipmentId = String(row.coating_equipment || row.equipment_id || '')
      if (!equipmentId) return ''
      const eq = (this.equipmentList || []).find(item => String(item.id) === equipmentId)
      return this.normalizeEquipmentCode(eq && eq.equipmentCode)
    },

    resolveRewindingEquipmentCode(row) {
      const direct = this.normalizeEquipmentCode(row.rewinding_equipment_code || row.rewinding_equipment)
      if (direct) return direct
      return ''
    },

    toBaseMaterialCode(code) {
      const normalized = this.normalizeMaterialCode(code)
      if (!normalized) return ''
      // 例如: 1011-R02-2307-B0-1-0400 -> 1011-R02-2307-B0
      return normalized.replace(/-\d+-\d+$/, '')
    },

    toFamilyMaterialCode(code) {
      const baseCode = this.toBaseMaterialCode(code)
      if (!baseCode) return ''
      // 例如: 1011-R02-0903-G0 -> 1011-R02-0903
      return baseCode.replace(/-[A-Z0-9]+$/, '')
    },

    getProcessOptionKey(processType, row) {
      const process = String(processType || '').toUpperCase()
      const id = row ? (row.id || row.schedule_id || row.order_detail_id || row.order_no || Math.random()) : Math.random()
      return `${process}@@${id}`
    },

    getCoatingEquipmentOptions(row) {
      const key = this.getProcessOptionKey('COATING', row)
      const cached = this.coatingEquipmentOptionsMap[key]
      if (Array.isArray(cached) && cached.length) {
        return cached
      }
      return this.equipmentList || []
    },

    getRewindingEquipmentOptions(row) {
      const key = this.getProcessOptionKey('REWINDING', row)
      const cached = this.rewindingEquipmentOptionsMap[key]
      if (Array.isArray(cached) && cached.length) {
        return cached
      }
      return this.rewindingEquipmentList || []
    },

    getSlittingEquipmentOptions(row) {
      const key = this.getProcessOptionKey('SLITTING', row)
      const cached = this.slittingEquipmentOptionsMap[key]
      if (Array.isArray(cached) && cached.length) {
        return cached
      }
      return this.slittingEquipmentList || []
    },

    coatingEquipmentOptionLabel(eq) {
      const name = eq && eq.equipmentName ? eq.equipmentName : '-'
      if (eq && eq.unavailableReason) {
        return `${name}（不可用: ${eq.unavailableReason}）`
      }
      if (!eq || !eq.suggestedStart) return name
      return `${name}（最早:${this.formatDateTime(eq.suggestedStart)}）`
    },

    rewindingEquipmentOptionLabel(eq) {
      const base = `${(eq && eq.equipmentCode) || ''}${eq && eq.equipmentName ? '-' + eq.equipmentName : ''}`
      if (eq && eq.unavailableReason) {
        return `${base}（不可用: ${eq.unavailableReason}）`
      }
      if (!eq || !eq.suggestedStart) return base
      return `${base}（最早:${this.formatDateTime(eq.suggestedStart)}）`
    },

    slittingEquipmentOptionLabel(eq) {
      const base = `${(eq && eq.equipmentCode) || ''}${eq && eq.equipmentName ? '-' + eq.equipmentName : ''}`
      if (eq && eq.unavailableReason) {
        return `${base}（不可用: ${eq.unavailableReason}）`
      }
      if (!eq || !eq.suggestedStart) return base
      return `${base}（最早:${this.formatDateTime(eq.suggestedStart)}）`
    },

    async refreshCoatingEquipmentOptions(row) {
      const scheduleId = this.resolveNumericScheduleId(row)
      const optionKey = this.getProcessOptionKey('COATING', row)
      const loadingKey = `COATING@${optionKey}`
      if (this.equipmentOptionLoadingMap[loadingKey]) return
      this.$set(this.equipmentOptionLoadingMap, loadingKey, true)
      try {
        const tasks = (this.equipmentList || []).map(async eq => {
          try {
            const res = await getCoatingAvailability({
              scheduleId: scheduleId > 0 ? scheduleId : null,
              equipmentId: eq.id,
              coatingDate: row.coating_schedule_date,
              coatingLength: row.coating_length,
              materialCode: row.material_code,
              insertMode: row.insert_mode || 'AFTER_TIME',
              anchorScheduleId: row.insert_mode === 'AFTER_ORDER' ? row.anchor_schedule_id : null,
              anchorAfterTime: row.insert_mode === 'AFTER_ORDER' ? row.coating_schedule_date : null,
              rebalanceMode: row.rebalance_mode || 'MANUAL_CROSS_LINE'
            })
            if (!(res.code === 200 || res.code === 20000)) return null
            const data = res.data || {}
            if (!data.suggestedStart) {
              return {
                ...eq,
                unavailableReason: '机台暂无可排时间',
                _sortTs: Number.MAX_SAFE_INTEGER,
                _available: false
              }
            }
            return {
              ...eq,
              suggestedStart: data.suggestedStart,
              _sortTs: this.toDateObj(data.suggestedStart) ? this.toDateObj(data.suggestedStart).getTime() : Number.MAX_SAFE_INTEGER,
              _available: true
            }
          } catch (e) {
            const msg = this.parseApiError(e, '未维护机台能力参数')
            return {
              ...eq,
              unavailableReason: this.isCoatingMaterialRequiredError(msg) ? '请先输入料号' : msg,
              _sortTs: Number.MAX_SAFE_INTEGER,
              _available: false
            }
          }
        })
        const resolved = (await Promise.all(tasks)).filter(Boolean)
        resolved.sort((a, b) => {
          const av = Number(!!a._available)
          const bv = Number(!!b._available)
          if (av !== bv) return bv - av
          const t = Number(a._sortTs || Number.MAX_SAFE_INTEGER) - Number(b._sortTs || Number.MAX_SAFE_INTEGER)
          if (t !== 0) return t
          return String(a.equipmentName || '').localeCompare(String(b.equipmentName || ''))
        })
        if (resolved.length) {
          this.$set(this.coatingEquipmentOptionsMap, optionKey, resolved)
        } else {
          this.$set(this.coatingEquipmentOptionsMap, optionKey, this.equipmentList || [])
        }
      } finally {
        this.$set(this.equipmentOptionLoadingMap, loadingKey, false)
      }
    },

    async refreshRewindingEquipmentOptions(row) {
      if (!row || !row.schedule_id) return
      const optionKey = this.getProcessOptionKey('REWINDING', row)
      const loadingKey = `REWINDING@${optionKey}`
      if (this.equipmentOptionLoadingMap[loadingKey]) return
      this.$set(this.equipmentOptionLoadingMap, loadingKey, true)
      try {
        const tasks = (this.rewindingEquipmentList || []).map(async eq => {
          const equipmentCode = eq && eq.equipmentCode
          if (!equipmentCode) return null
          try {
            const res = await getRewindingAvailability({
              scheduleId: row.schedule_id,
              rewindingEquipment: equipmentCode,
              rewindingDate: row.rewinding_date
            })
            if (!(res.code === 200 || res.code === 20000)) return null
            const data = res.data || {}
            if (!data.suggestedStart) {
              return {
                ...eq,
                unavailableReason: '机台暂无可排时间',
                _sortTs: Number.MAX_SAFE_INTEGER,
                _available: false
              }
            }
            return {
              ...eq,
              suggestedStart: data.suggestedStart,
              _sortTs: this.toDateObj(data.suggestedStart) ? this.toDateObj(data.suggestedStart).getTime() : Number.MAX_SAFE_INTEGER,
              _available: true
            }
          } catch (e) {
            return {
              ...eq,
              unavailableReason: this.parseApiError(e, '未维护机台能力参数'),
              _sortTs: Number.MAX_SAFE_INTEGER,
              _available: false
            }
          }
        })
        const resolved = (await Promise.all(tasks)).filter(Boolean)
        resolved.sort((a, b) => {
          const av = Number(!!a._available)
          const bv = Number(!!b._available)
          if (av !== bv) return bv - av
          const t = Number(a._sortTs || Number.MAX_SAFE_INTEGER) - Number(b._sortTs || Number.MAX_SAFE_INTEGER)
          if (t !== 0) return t
          return String(a.equipmentCode || '').localeCompare(String(b.equipmentCode || ''))
        })
        if (resolved.length) {
          this.$set(this.rewindingEquipmentOptionsMap, optionKey, resolved)
        } else {
          this.$set(this.rewindingEquipmentOptionsMap, optionKey, this.rewindingEquipmentList || [])
        }
      } finally {
        this.$set(this.equipmentOptionLoadingMap, loadingKey, false)
      }
    },

    async refreshSlittingEquipmentOptions(row) {
      if (!row || !row.schedule_id) return
      const optionKey = this.getProcessOptionKey('SLITTING', row)
      const loadingKey = `SLITTING@${optionKey}`
      if (this.equipmentOptionLoadingMap[loadingKey]) return
      this.$set(this.equipmentOptionLoadingMap, loadingKey, true)
      try {
        const tasks = (this.slittingEquipmentList || []).map(async eq => {
          const equipmentCode = eq && eq.equipmentCode
          if (!equipmentCode) return null
          try {
            const res = await getSlittingAvailability({
              scheduleId: row.schedule_id,
              slittingEquipment: equipmentCode,
              packagingDate: row.packaging_date
            })
            if (!(res.code === 200 || res.code === 20000)) return null
            const data = res.data || {}
            if (!data.suggestedStart) {
              return {
                ...eq,
                unavailableReason: '机台暂无可排时间',
                _sortTs: Number.MAX_SAFE_INTEGER,
                _available: false
              }
            }
            return {
              ...eq,
              suggestedStart: data.suggestedStart,
              _sortTs: this.toDateObj(data.suggestedStart) ? this.toDateObj(data.suggestedStart).getTime() : Number.MAX_SAFE_INTEGER,
              _available: true
            }
          } catch (e) {
            return {
              ...eq,
              unavailableReason: this.parseApiError(e, '未维护机台能力参数'),
              _sortTs: Number.MAX_SAFE_INTEGER,
              _available: false
            }
          }
        })
        const resolved = (await Promise.all(tasks)).filter(Boolean)
        resolved.sort((a, b) => {
          const av = Number(!!a._available)
          const bv = Number(!!b._available)
          if (av !== bv) return bv - av
          const t = Number(a._sortTs || Number.MAX_SAFE_INTEGER) - Number(b._sortTs || Number.MAX_SAFE_INTEGER)
          if (t !== 0) return t
          return String(a.equipmentCode || '').localeCompare(String(b.equipmentCode || ''))
        })
        if (resolved.length) {
          this.$set(this.slittingEquipmentOptionsMap, optionKey, resolved)
        } else {
          this.$set(this.slittingEquipmentOptionsMap, optionKey, this.slittingEquipmentList || [])
        }
      } finally {
        this.$set(this.equipmentOptionLoadingMap, loadingKey, false)
      }
    },

    handleCoatingEquipmentDropdownVisible(row, visible) {
      if (visible) {
        this.refreshCoatingEquipmentOptions(row)
      }
    },

    handleRewindingEquipmentDropdownVisible(row, visible) {
      if (visible) {
        this.refreshRewindingEquipmentOptions(row)
      }
    },

    handleSlittingEquipmentDropdownVisible(row, visible) {
      if (visible) {
        this.refreshSlittingEquipmentOptions(row)
      }
    },

    async ensureCoatingSpeedForRows(rows) {
      const list = Array.isArray(rows) ? rows : []
      const missingPairs = [...new Set(list
        .map(r => {
          const code = this.normalizeMaterialCode(r.material_code || r.materialCode)
          const equipmentCode = this.resolveEquipmentCode(r)
          return this.makeSpeedKey(code, equipmentCode)
        })
        .filter(key => key && !this.coatingSpeedMap[key]))]

      if (!missingPairs.length) return

      const tasks = missingPairs.map(async key => {
        try {
          const [code, equipmentCode = ''] = String(key || '').split('@@')
          if (!code) return
          let speed = 0

          const res = await getProcessParams(code, 'COATING', equipmentCode)
          const data = res.data || {}
          speed = Number(data.coatingSpeed || data.coating_speed || 0)

          if (speed <= 0) {
            const baseCode = this.toBaseMaterialCode(code)
            if (baseCode && baseCode !== code) {
              const baseRes = await getProcessParams(baseCode, 'COATING', equipmentCode)
              const baseData = baseRes.data || {}
              speed = Number(baseData.coatingSpeed || baseData.coating_speed || 0)
              if (speed > 0) {
                this.$set(this.coatingSpeedMap, this.makeSpeedKey(baseCode, equipmentCode), speed)
                this.$set(this.coatingSpeedMap, baseCode, speed)
              }
            }
          }

          if (speed > 0) {
            this.$set(this.coatingSpeedMap, this.makeSpeedKey(code, equipmentCode), speed)
            if (!equipmentCode) {
              this.$set(this.coatingSpeedMap, code, speed)
            }
          }
        } catch (e) {
          // 逐条兜底查询失败不阻塞页面
        }
      })

      await Promise.all(tasks)
    },

    async ensureRewindingSpeedForRows(rows) {
      const list = Array.isArray(rows) ? rows : []
      const missingPairs = [...new Set(list
        .map(r => {
          const code = this.normalizeMaterialCode(r.material_code || r.materialCode)
          const equipmentCode = this.resolveRewindingEquipmentCode(r)
          return this.makeSpeedKey(code, equipmentCode)
        })
        .filter(key => key && !this.rewindingSpeedMap[key]))]

      if (!missingPairs.length) return

      const tasks = missingPairs.map(async key => {
        try {
          const [code, equipmentCode = ''] = String(key || '').split('@@')
          if (!code) return
          let speed = 0

          const res = await getRewindingProcessParams(code, equipmentCode)
          const data = res.data || {}
          speed = Number(data.rewindingSpeed || data.rewinding_speed || 0)

          if (speed <= 0) {
            const baseCode = this.toBaseMaterialCode(code)
            if (baseCode && baseCode !== code) {
              const baseRes = await getRewindingProcessParams(baseCode, equipmentCode)
              const baseData = baseRes.data || {}
              speed = Number(baseData.rewindingSpeed || baseData.rewinding_speed || 0)
              if (speed > 0) {
                this.$set(this.rewindingSpeedMap, this.makeSpeedKey(baseCode, equipmentCode), speed)
                this.$set(this.rewindingSpeedMap, baseCode, speed)
              }
            }
          }

          if (speed > 0) {
            this.$set(this.rewindingSpeedMap, this.makeSpeedKey(code, equipmentCode), speed)
            if (!equipmentCode) {
              this.$set(this.rewindingSpeedMap, code, speed)
            }
          }
        } catch (e) {
          // ignore
        }
      })

      await Promise.all(tasks)
    },

    async ensureSlittingSpeedForRows(rows) {
      const list = Array.isArray(rows) ? rows : []
      if (!list.length) return

      const tasks = list.map(async row => {
        const { totalThickness, processLength, processWidth, equipmentCode } = this.resolveSlittingDimensions(row)
        const exactKey = this.makeSlittingDimensionKey(totalThickness, processLength, processWidth, equipmentCode)
        const commonKey = this.makeSlittingDimensionKey(totalThickness, processLength, processWidth)
        if (!commonKey) return
        if (Number(this.slittingSpeedMap[exactKey] || 0) > 0 || Number(this.slittingSpeedMap[commonKey] || 0) > 0) return

        try {
          let speed = 0

          // 先按机台+维度查询
          if (equipmentCode) {
            const exactRes = await getSlittingProcessParams(totalThickness, processLength, processWidth, equipmentCode)
            const exactData = exactRes.data || {}
            speed = Number(exactData.productionSpeed || exactData.production_speed || exactData.slittingSpeed || exactData.slitting_speed || 0)
            if (speed > 0) {
              this.$set(this.slittingSpeedMap, exactKey, speed)
            }
          }

          // 再按公共维度查询
          if (speed <= 0) {
            const commonRes = await getSlittingProcessParams(totalThickness, processLength, processWidth)
            const commonData = commonRes.data || {}
            speed = Number(commonData.productionSpeed || commonData.production_speed || commonData.slittingSpeed || commonData.slitting_speed || 0)
          }

          if (speed > 0) {
            this.$set(this.slittingSpeedMap, commonKey, speed)
            if (equipmentCode) {
              this.$set(this.slittingSpeedMap, exactKey, speed)
            }
          }
        } catch (e) {
          // ignore
        }
      })

      await Promise.all(tasks)
    },

    resolveCoatingSpeed(row) {
      const materialCode = this.normalizeMaterialCode(row.material_code || row.materialCode)
      if (!materialCode) return 0
      const equipmentCode = this.resolveEquipmentCode(row)

      const exactEquipmentSpeed = Number(this.coatingSpeedMap[this.makeSpeedKey(materialCode, equipmentCode)] || 0)
      if (exactEquipmentSpeed > 0) return exactEquipmentSpeed

      const exactSpeed = Number(this.coatingSpeedMap[materialCode] || 0)
      if (exactSpeed > 0) return exactSpeed

      const baseCode = this.toBaseMaterialCode(materialCode)
      const baseEquipmentSpeed = Number(this.coatingSpeedMap[this.makeSpeedKey(baseCode, equipmentCode)] || 0)
      if (baseEquipmentSpeed > 0) return baseEquipmentSpeed

      const baseSpeed = Number(this.coatingSpeedMap[baseCode] || 0)
      if (baseSpeed > 0) return baseSpeed

      const matchedKey = Object.keys(this.coatingSpeedMap).find(
        key => materialCode.startsWith(key) || key.startsWith(materialCode) || (baseCode && (baseCode.startsWith(key) || key.startsWith(baseCode)))
      )
      return matchedKey ? Number(this.coatingSpeedMap[matchedKey] || 0) : 0
    },

    formatCoatingSpeed(row) {
      const speed = this.resolveCoatingSpeed(row)
      if (speed <= 0) return '-'
      const n = Number(speed)
      return Number.isInteger(n) ? String(n) : n.toFixed(1)
    },

    formatCoatingDuration(row) {
      const roundedMinutes = this.calcCoatingMinutes(row)
      if (roundedMinutes <= 0) return '-'
      const hours = Math.floor(roundedMinutes / 60)
      const minutes = roundedMinutes % 60
      return `${hours}小时${minutes}分钟`
    },

    resolveRewindingSpeed(row) {
      const materialCode = this.normalizeMaterialCode(row.material_code || row.materialCode)
      if (!materialCode) return 0
      const equipmentCode = this.resolveRewindingEquipmentCode(row)

      const exactEq = Number(this.rewindingSpeedMap[this.makeSpeedKey(materialCode, equipmentCode)] || 0)
      if (exactEq > 0) return exactEq

      const exact = Number(this.rewindingSpeedMap[materialCode] || 0)
      if (exact > 0) return exact

      const baseCode = this.toBaseMaterialCode(materialCode)
      const baseEq = Number(this.rewindingSpeedMap[this.makeSpeedKey(baseCode, equipmentCode)] || 0)
      if (baseEq > 0) return baseEq

      return Number(this.rewindingSpeedMap[baseCode] || 0)
    },

    formatRewindingSpeed(row) {
      const speed = this.resolveRewindingSpeed(row)
      if (speed <= 0) return '-'
      return Number.isInteger(speed) ? String(speed) : Number(speed).toFixed(1)
    },

    formatRewindingDuration(row) {
      const persistedMinutes = Number(row.rewinding_duration_minutes || row.rewindingDurationMinutes || 0)
      if (persistedMinutes > 0) {
        const hours = Math.floor(persistedMinutes / 60)
        const minutes = persistedMinutes % 60
        return `${hours}小时${minutes}分钟`
      }
      const area = Number(this.getPlannedRewindingArea(row) || 0)
      const rewindingWidthMm = Number(row.rewinding_width || 0)
      const rewindingWidthM = rewindingWidthMm > 0 ? rewindingWidthMm / 1000 : 0
      const rewindingLength = rewindingWidthM > 0 ? area / rewindingWidthM : 0
      const rewindingSpeed = this.resolveRewindingSpeed(row)
      if (rewindingLength <= 0 || rewindingSpeed <= 0) return '-'
      const roundedMinutes = this.getRoundedMinutes(rewindingLength, rewindingSpeed)
      const hours = Math.floor(roundedMinutes / 60)
      const minutes = roundedMinutes % 60
      return `${hours}小时${minutes}分钟`
    },

    resolveSlittingSpeed(row) {
      const direct = Number(row.slitting_speed || row.slittingSpeed || 0)
      if (direct > 0) return direct

      const { totalThickness, processLength, processWidth, equipmentCode } = this.resolveSlittingDimensions(row)
      const exactKey = this.makeSlittingDimensionKey(totalThickness, processLength, processWidth, equipmentCode)
      const exact = Number(this.slittingSpeedMap[exactKey] || 0)
      if (exact > 0) return exact

      const commonKey = this.makeSlittingDimensionKey(totalThickness, processLength, processWidth)
      return Number(this.slittingSpeedMap[commonKey] || 0)
    },

    formatSlittingSpeed(row) {
      const speed = this.resolveSlittingSpeed(row)
      if (speed <= 0) return '-'
      return Number.isInteger(speed) ? String(speed) : Number(speed).toFixed(1)
    },

    formatSlittingDuration(row) {
      const qty = Number(row.schedule_qty || 0)
      const speed = this.resolveSlittingSpeed(row)
      if (qty <= 0 || speed <= 0) {
        const persistedMinutes = Number(row.slitting_duration_minutes || row.slittingDurationMinutes || 0)
        if (persistedMinutes <= 0) return '-'
        const persistedHours = Math.floor(persistedMinutes / 60)
        const persistedRemainMinutes = persistedMinutes % 60
        return `${persistedHours}小时${persistedRemainMinutes}分钟`
      }

      const roundedMinutes = Math.ceil(qty / speed)
      const hours = Math.floor(roundedMinutes / 60)
      const minutes = roundedMinutes % 60
      return `${hours}小时${minutes}分钟`
    },

    calcSlittingMinutes(row) {
      const qty = Number(row.schedule_qty || 0)
      const speed = this.resolveSlittingSpeed(row)
      if (qty > 0 && speed > 0) {
        return Math.ceil(qty / speed)
      }
      return Number(row.slitting_duration_minutes || row.slittingDurationMinutes || 0)
    },

    handleRewindingEquipmentChange(row) {
      this.ensureRewindingSpeedForRows([row])
      this.updateRewindingAvailability(row).then(() => {
        this.applyRewindingTimelinePreview()
      })
    },

    handleRewindingDateChange(row) {
      this.updateRewindingAvailability(row).then(() => {
        this.applyRewindingTimelinePreview()
      })
    },

    async updateRewindingAvailability(row) {
      try {
        if (!row || !row.schedule_id || !row.rewinding_equipment) return
        const res = await getRewindingAvailability({
          scheduleId: row.schedule_id,
          rewindingEquipment: row.rewinding_equipment,
          rewindingDate: row.rewinding_date
        })
        if (res.code === 200 || res.code === 20000) {
          const data = res.data || {}
          if (data.suggestedStart) {
            this.$set(row, 'rewinding_date', data.suggestedStart)
          }
          if (data.warning) {
            this.$message.warning(data.warning)
          }
        }
      } catch (e) {
        this.$message.warning(this.parseApiError(e, '未能获取复卷机台空闲时间'))
      }
    },

    async updateSlittingAvailability(row) {
      try {
        if (!row || !row.schedule_id || !row.slitting_equipment) return
        const res = await getSlittingAvailability({
          scheduleId: row.schedule_id,
          slittingEquipment: row.slitting_equipment,
          packagingDate: row.packaging_date
        })
        if (res.code === 200 || res.code === 20000) {
          const data = res.data || {}
          if (data.suggestedStart) {
            this.$set(row, 'packaging_date', data.suggestedStart)
          }
          if (data.warning) {
            this.$message.warning(data.warning)
          }
        }
      } catch (e) {
        this.$message.warning(this.parseApiError(e, '未能获取分切机台空闲时间'))
      }
    },

    handleSlittingEquipmentChange(row) {
      this.updateSlittingAvailability(row)
    },

    handleSlittingDateChange(row) {
      this.updateSlittingAvailability(row)
    },

    toDateObj(value) {
      if (!value) return null
      const d = new Date(String(value).replace(' ', 'T'))
      return Number.isNaN(d.getTime()) ? null : d
    },

    toDateTimeString(value) {
      const d = value instanceof Date ? value : this.toDateObj(value)
      if (!d) return ''
      const pad = n => String(n).padStart(2, '0')
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
    },

    roundToTenMinuteDateTime(value) {
      const d = value instanceof Date ? new Date(value.getTime()) : this.toDateObj(value)
      if (!d) return ''
      d.setSeconds(0, 0)
      const minute = d.getMinutes()
      const roundedMinute = Math.ceil(minute / 10) * 10
      if (roundedMinute >= 60) {
        d.setHours(d.getHours() + 1, 0, 0, 0)
      } else {
        d.setMinutes(roundedMinute, 0, 0)
      }
      return this.toDateTimeString(d)
    },

    async loadEquipmentScheduleConfigMap() {
      try {
        const res = await getEquipmentScheduleConfigList({})
        if (res && (res.code === 200 || res.code === 20000)) {
          const configMap = {}
          ;(res.data || []).forEach(item => {
            const equipmentCode = this.normalizeEquipmentCode(item.equipmentCode)
            if (!equipmentCode) return
            configMap[equipmentCode] = {
              initialScheduleTime: item.initialScheduleTime || '',
              cycleEndTime: item.cycleEndTime || '',
              nextWeekStartTime: item.nextWeekStartTime || '08:00:00',
              weekendRest: Number(item.weekendRest == null ? 1 : item.weekendRest),
              sundayDisabled: Number(item.sundayDisabled == null ? 1 : item.sundayDisabled),
              enabled: Number(item.enabled == null ? 1 : item.enabled)
            }
          })
          this.equipmentScheduleConfigMap = configMap
        }
      } catch (error) {
        console.error('加载设备排程状态配置失败', error)
      }
    },

    parseTimeText(value) {
      const text = String(value || '08:00:00').trim()
      const parts = text.split(':').map(item => Number(item || 0))
      return {
        hours: Number.isNaN(parts[0]) ? 8 : parts[0],
        minutes: Number.isNaN(parts[1]) ? 0 : parts[1],
        seconds: Number.isNaN(parts[2]) ? 0 : parts[2]
      }
    },

    nextPreviewWorkingStart(value, config) {
      const date = value instanceof Date ? new Date(value.getTime()) : this.toDateObj(value)
      if (!date) return null
      const startParts = this.parseTimeText(config && config.nextWeekStartTime)
      for (let i = 0; i < 8; i++) {
        const day = date.getDay()
        if (Number(config && config.weekendRest) === 1 && day === 6) {
          date.setDate(date.getDate() + 2)
          date.setHours(startParts.hours, startParts.minutes, startParts.seconds, 0)
          continue
        }
        if ((Number(config && config.weekendRest) === 1 || Number(config && config.sundayDisabled) === 1) && day === 0) {
          date.setDate(date.getDate() + 1)
          date.setHours(startParts.hours, startParts.minutes, startParts.seconds, 0)
          continue
        }
        if (day === 1 && (date.getHours() < startParts.hours || (date.getHours() === startParts.hours && date.getMinutes() < startParts.minutes))) {
          date.setHours(startParts.hours, startParts.minutes, startParts.seconds, 0)
        }
        return date
      }
      return date
    },

    normalizePreviewStart(start, durationMinutes, equipmentCode) {
      const config = this.equipmentScheduleConfigMap[equipmentCode]
      if (!config || Number(config.enabled) === 0) return start
      let result = start instanceof Date ? new Date(start.getTime()) : this.toDateObj(start)
      if (!result) return start

      const initialScheduleTime = this.toDateObj(config.initialScheduleTime)
      if (initialScheduleTime && result.getTime() < initialScheduleTime.getTime()) {
        result = new Date(initialScheduleTime.getTime())
      }

      for (let i = 0; i < 5; i++) {
        const day = result.getDay()
        if (Number(config.weekendRest) === 1 && day === 6) {
          result = this.nextPreviewWorkingStart(result, config)
          continue
        }
        if ((Number(config.weekendRest) === 1 || Number(config.sundayDisabled) === 1) && day === 0) {
          result = this.nextPreviewWorkingStart(result, config)
          continue
        }
        const cycleEndTime = this.toDateObj(config.cycleEndTime)
        if (cycleEndTime) {
          const end = new Date(result.getTime() + Math.max(Number(durationMinutes) || 0, 0) * 60000)
          if (result.getTime() > cycleEndTime.getTime() || end.getTime() > cycleEndTime.getTime()) {
            result = this.nextPreviewWorkingStart(new Date(cycleEndTime.getTime() + 1000), config)
            continue
          }
        }
        return result
      }
      return result
    },

    calcRewindingMinutes(row) {
      const persistedMinutes = Number(row.rewinding_duration_minutes || row.rewindingDurationMinutes || 0)
      if (persistedMinutes > 0) return persistedMinutes
      const area = Number(this.getPlannedRewindingArea(row) || 0)
      const rewindingWidthMm = Number(row.rewinding_width || 0)
      const rewindingWidthM = rewindingWidthMm > 0 ? rewindingWidthMm / 1000 : 0
      const rewindingLength = rewindingWidthM > 0 ? area / rewindingWidthM : 0
      const rewindingSpeed = this.resolveRewindingSpeed(row)
      if (rewindingLength <= 0 || rewindingSpeed <= 0) return 0
      return this.getRoundedMinutes(rewindingLength, rewindingSpeed)
    },

    applyRewindingTimelinePreview() {
      const rows = this.rewindingList || []
      if (!rows.length) return
      const cursorByEquipment = {}

      rows.forEach(row => {
        const equipmentCode = this.resolveRewindingEquipmentCode(row)
        if (!equipmentCode) return

        const startRaw = row.rewinding_start_time || row.rewinding_date
        let start = this.toDateObj(startRaw)
        if (!start) return

        const durationMinutes = this.calcRewindingMinutes(row)
        if (durationMinutes <= 0) return

        start = this.normalizePreviewStart(start, durationMinutes, equipmentCode)

        const cursor = cursorByEquipment[equipmentCode]
        if (cursor && start.getTime() < cursor.getTime()) {
          start = new Date(cursor.getTime())
          start = this.normalizePreviewStart(start, durationMinutes, equipmentCode)
          if (row.__editing) {
            this.$set(row, 'rewinding_date', this.toDateTimeString(start))
          }
        }

        const end = new Date(start.getTime() + durationMinutes * 60000)
        cursorByEquipment[equipmentCode] = end
      })
    },

    applyCoatingTimelinePreview() {
      const rows = this.coatingList || []
      if (!rows.length) return
      const cursorByEquipment = {}

      rows.forEach(row => {
        const equipmentCode = this.resolveEquipmentCode(row)
        if (!equipmentCode) return

        const startRaw = row.coating_start_time || row.coating_schedule_date
        let start = this.toDateObj(startRaw)
        if (!start) return

        const durationMinutes = this.calcCoatingMinutes(row)
        if (durationMinutes <= 0) return

        start = this.normalizePreviewStart(start, durationMinutes, equipmentCode)

        const cursor = cursorByEquipment[equipmentCode]
        if (cursor && start.getTime() < cursor.getTime()) {
          start = new Date(cursor.getTime())
          start = this.normalizePreviewStart(start, durationMinutes, equipmentCode)
          if (row.__editing) {
            this.$set(row, 'coating_schedule_date', this.toDateTimeString(start))
          }
        }

        const end = new Date(start.getTime() + durationMinutes * 60000)
        cursorByEquipment[equipmentCode] = end
      })
    },

    async updateCoatingAvailability(row, fromLatestEnd = false, options = {}) {
      try {
        if (!row || !row.coating_equipment) return
        const scheduleId = this.resolveNumericScheduleId(row)
        const keepManualTime = !!(options && options.keepManualTime)
        const res = await getCoatingAvailability({
          scheduleId: scheduleId > 0 ? scheduleId : null,
          equipmentId: row.coating_equipment,
          coatingDate: fromLatestEnd ? null : row.coating_schedule_date,
          coatingLength: row.coating_length,
          materialCode: row.material_code,
          insertMode: row.insert_mode || 'AFTER_TIME',
          anchorScheduleId: row.insert_mode === 'AFTER_ORDER' ? row.anchor_schedule_id : null,
          anchorAfterTime: row.insert_mode === 'AFTER_ORDER' ? row.coating_schedule_date : null,
          rebalanceMode: row.rebalance_mode || 'MANUAL_CROSS_LINE'
        })
        if (res.code === 200 || res.code === 20000) {
          const data = res.data || {}
          if (data.suggestedStart) {
            const roundedSuggestedStart = this.roundToTenMinuteDateTime(data.suggestedStart)
            if (!keepManualTime || !row.coating_schedule_date) {
              this.$set(row, 'coating_schedule_date', roundedSuggestedStart || data.suggestedStart)
            }
          }
          this.$set(row, 'team_capacity_minutes', data.teamCapacityMinutes || null)
          this.$set(row, 'team_planned_minutes', data.teamPlannedMinutes || null)
          this.$set(row, 'team_after_minutes', data.teamAfterMinutes || null)
          this.$set(row, 'team_over_capacity', !!data.teamOverCapacity)
        }
      } catch (e) {
        const msg = this.parseApiError(e, '未能获取机台空闲时间')
        if (this.isCoatingMaterialRequiredError(msg)) {
          return
        }
        this.$message.warning(msg)
      }
    },

    handleCoatingEquipmentChange(row) {
      const options = this.getCoatingEquipmentOptions(row) || []
      const selected = options.find(eq => String(eq.id) === String(row.coating_equipment || ''))
      if (selected && selected.suggestedStart) {
        const rounded = this.roundToTenMinuteDateTime(selected.suggestedStart)
        if (rounded) {
          this.$set(row, 'coating_schedule_date', rounded)
        }
      }
      this.updateCoatingAvailability(row, true).then(() => {
        if (!row.coating_schedule_date) {
          const fallback = this.roundToTenMinuteDateTime(new Date())
          if (fallback) {
            this.$set(row, 'coating_schedule_date', fallback)
          }
        }
        this.applyCoatingTimelinePreview()
      })
    },

    handleCoatingDateChange(row, options = {}) {
      const fromUser = !!(options && options.fromUser)
      if (fromUser && row) {
        const rounded = this.roundToTenMinuteDateTime(row.coating_schedule_date)
        if (rounded) {
          this.$set(row, 'coating_schedule_date', rounded)
        }
      }
      this.updateCoatingAvailability(row, false, { keepManualTime: fromUser }).then(() => {
        this.applyCoatingTimelinePreview()
      })
    },

    handleCoatingWidthChange(row) {
      if (!row) return
      const width = Number(row.coating_width || 0)
      const finalWidth = width > 0 ? width : 1040
      this.$set(row, 'coating_width', finalWidth)

      const area = Number(row.coating_area || 0)
      if (area > 0 && finalWidth > 0) {
        const length = area / (finalWidth / 1000)
        this.$set(row, 'coating_length', Number(length.toFixed(2)))
      }

      this.updateCoatingAvailability(row).then(() => {
        this.applyCoatingTimelinePreview()
      })
    },

    handleCoatingLengthChange(row) {
      this.updateCoatingAvailability(row).then(() => {
        this.applyCoatingTimelinePreview()
      })
    },

    handleCoatingEditAction(row) {
      if (!row.__editing) {
        this.$set(row, '__editing', true)
        this.refreshCoatingEquipmentOptions(row)
        return
      }
      this.handleConfirmCoating(row)
    },

    buildManualCoatingOrderNo() {
      const d = new Date()
      const pad = n => String(n).padStart(2, '0')
      const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
      const rand = String(Math.floor(Math.random() * 900) + 100)
      return `MANUAL-COATING-${stamp}-${rand}`
    },

    recalcManualCoatingArea(row) {
      if (!row) return 0
      const width = Number(row.coating_width || row.width || 0)
      const length = Number(row.coating_length || row.length || 0)
      if (!(width > 0) || !(length > 0)) {
        this.$set(row, 'coating_area', 0)
        return 0
      }
      const area = Number(((width / 1000) * length).toFixed(2))
      this.$set(row, 'coating_area', area)
      return area
    },

    handleAddManualCoating() {
      const row = {
        id: null,
        schedule_id: null,
        order_no: this.buildManualCoatingOrderNo(),
        related_order_nos: '手工排程',
        material_code: '',
        material_name: '',
        coating_area: 0,
        coating_width: 1040,
        coating_length: 0,
        coating_schedule_date: '',
        insert_mode: 'AFTER_TIME',
        anchor_schedule_id: null,
        rebalance_mode: 'MANUAL_CROSS_LINE',
        coating_equipment: '',
        team_capacity_minutes: null,
        team_planned_minutes: null,
        team_after_minutes: null,
        team_over_capacity: false,
        schedule_qty: 1,
        status: 'PENDING',
        __editing: true,
        __manual: true
      }
      this.coatingList = [row, ...(this.coatingList || [])]
      this.$nextTick(() => {
        this.refreshCoatingEquipmentOptions(row)
      })
    },

    handleAddManualRewinding() {
      const row = {
        schedule_id: null,
        status: 'COATING_SCHEDULED',
        order_no: '手工补录',
        related_order_nos: '手工补录',
        customer_name: '-',
        material_code: '',
        material_name: '',
        schedule_qty: 1,
        coating_area: 0,
        rewinding_width: 500,
        rewinding_date: '',
        rewinding_equipment: '',
        __editing: true,
        __manual: true
      }
      this.rewindingList = [row, ...(this.rewindingList || [])]
      this.$nextTick(() => {
        this.refreshRewindingEquipmentOptions(row)
      })
    },

    async openManualSlittingDialog() {
      this.manualSlittingDialogVisible = true
      this.manualSlittingSelectedRows = []
      await this.loadManualSlittingCandidates()
    },

    async loadManualSlittingCandidates() {
      this.manualSlittingLoading = true
      try {
        const res = await getPendingOrders({
          current: 1,
          size: 50,
          includeCompleted: false,
          orderNo: (this.manualSlittingQuery.orderNo || '').trim()
        })
        if (!(res.code === 200 || res.code === 20000)) {
          this.manualSlittingCandidates = []
          this.manualSlittingSelectedRows = []
          return
        }
        const pageData = res.data || {}
        const records = pageData.records || pageData.list || []
        this.manualSlittingCandidates = records
          .filter(item => Number(item.remaining_qty || 0) > 0)
          .map(item => {
            const maxQty = Math.max(1, Math.floor(Number(item.remaining_qty || 0)))
            return {
              ...item,
              _selected: false,
              _manual_qty: maxQty
            }
          })
        this.manualSlittingSelectedRows = []
      } catch (e) {
        this.$message.error('查询订单失败')
        this.manualSlittingCandidates = []
        this.manualSlittingSelectedRows = []
      } finally {
        this.manualSlittingLoading = false
      }
    },

    handleManualSlittingSelectionChange(selection) {
      this.manualSlittingSelectedRows = selection || []
      const selectedSet = new Set((selection || []).map(item => Number(item.order_detail_id || 0)))
      ;(this.manualSlittingCandidates || []).forEach(item => {
        const picked = selectedSet.has(Number(item.order_detail_id || 0))
        this.$set(item, '_selected', picked)
        if (picked) {
          const maxQty = Math.max(1, Math.floor(Number(item.remaining_qty || 0)))
          const currentQty = Math.floor(Number(item._manual_qty || 0))
          if (!(currentQty > 0) || currentQty > maxQty) {
            this.$set(item, '_manual_qty', maxQty)
          }
        }
      })
    },

    handleManualSlittingRowClick(row) {
      const table = this.$refs.manualSlittingOrderTable
      if (table && row) {
        table.toggleRowSelection(row, !row._selected)
      }
    },

    async confirmManualSlittingSelection() {
      const selected = this.manualSlittingSelectedRows || []
      if (!selected.length) {
        this.$message.warning('请至少选择一条订单明细')
        return
      }

      this.manualSlittingSubmitting = true
      try {
        const createdRows = []
        let failCount = 0
        for (const row of selected) {
          try {
            if (!row || !row.order_detail_id) {
              failCount += 1
              continue
            }
            const maxQty = Math.floor(Number(row.remaining_qty || 0))
            const pickQty = Math.floor(Number(row._manual_qty || 0))
            if (!(pickQty > 0) || pickQty > maxQty) {
              failCount += 1
              continue
            }

            const createRes = await createSchedule({
              orderNo: row.order_no,
              orderDetailId: row.order_detail_id,
              materialCode: row.material_code,
              materialName: row.material_name,
              width: row.width,
              length: row.length,
              thickness: row.thickness,
              orderQty: row.order_qty,
              scheduleQty: pickQty,
              scheduleType: 'SLITTING_MANUAL',
              status: 'PENDING',
              remark: '手动分切排程'
            })
            if (!(createRes.code === 200 || createRes.code === 20000)) {
              throw new Error(createRes.message || createRes.msg || '创建排程失败')
            }
            const scheduleId = Number(createRes.data || 0)
            if (!(scheduleId > 0)) {
              throw new Error('创建排程失败，未返回排程ID')
            }

            createdRows.push({
              schedule_id: scheduleId,
              order_detail_id: row.order_detail_id,
              status: 'REWINDING_SCHEDULED',
              order_no: row.order_no,
              customer_name: row.customer_name,
              material_code: row.material_code,
              material_name: row.material_name,
              width: row.width,
              length: row.length,
              thickness: row.thickness,
              schedule_qty: pickQty,
              packaging_date: '',
              slitting_equipment: '',
              packaging_team: '',
              rewinding_equipment: '',
              __editing: true,
              __manual: true
            })
          } catch (err) {
            failCount += 1
          }
        }

        if (createdRows.length) {
          this.slittingList = [...createdRows, ...(this.slittingList || [])]
          this.$nextTick(() => {
            createdRows.forEach(item => this.refreshSlittingEquipmentOptions(item))
          })
        }

        this.manualSlittingDialogVisible = false
        if (createdRows.length && failCount === 0) {
          this.$message.success(`已创建 ${createdRows.length} 条分切手动排程，请继续选择机台与时间后确认`)
        } else if (createdRows.length && failCount > 0) {
          this.$message.warning(`已创建 ${createdRows.length} 条，失败 ${failCount} 条（请检查数量是否超过可排卷数）`)
        } else {
          this.$message.warning('未创建任何排程，请检查选择与数量')
        }
      } catch (e) {
        this.$message.error((e && e.message) || '创建手动分切排程失败')
      } finally {
        this.manualSlittingSubmitting = false
      }
    },

    coatingRowClassName({ row }) {
      const current = Number(this.highlightCoatingScheduleId || 0)
      const rowId = this.resolveNumericScheduleId(row)
      if (current > 0 && rowId === current) {
        return 'coating-highlight-row'
      }
      return ''
    },

    markCoatingHighlight(scheduleId) {
      const id = Number(scheduleId || 0)
      if (!id) return
      this.highlightCoatingScheduleId = id
      if (this.highlightCoatingTimer) {
        clearTimeout(this.highlightCoatingTimer)
      }
      this.highlightCoatingTimer = setTimeout(() => {
        this.highlightCoatingScheduleId = null
        this.highlightCoatingTimer = null
      }, 10000)

      this.$nextTick(() => {
        const idx = (this.coatingList || []).findIndex(r => this.resolveNumericScheduleId(r) === id)
        if (idx < 0) return
        const table = this.$refs.coatingTable
        if (!table || !table.$el) return
        const body = table.$el.querySelector('.el-table__body-wrapper')
        const rows = table.$el.querySelectorAll('.el-table__body-wrapper tbody tr')
        if (!body || !rows || !rows[idx]) return
        const target = rows[idx]
        body.scrollTop = target.offsetTop - 40
      })
    },

    // 加载待排程订单
    async loadOrders() {
      this.loading = true
      try {
        await this.loadPendingOweAreaSummary()
        const res = await getPendingOrders({
          current: this.pendingPage,
          size: this.pendingPageSize,
          includeCompleted: this.showCompletedRows,
          materialCode: (this.pendingQuery.materialCode || '').trim()
        })
        if (res.code === 200 || res.code === 20000) {
          const pageData = res.data || {}
          const records = pageData.records || pageData.list || []
          this.pendingTotal = Number(pageData.total || 0)
          const mapped = records.map(item => {
            const width = Number(item.width || 0)
            const length = Number(item.length || 0)
            const singleArea = width > 0 && length > 0 ? (width / 1000) * length : 0
            const orderQty = Number(item.order_qty || 0)
            const remainingQty = Number(item.remaining_qty || 0)
            const plannedQty = Math.max(0, Math.min(orderQty, remainingQty))
            const completedQty = this.getReportedCompletedQty(item)
            const routeType = this.getRouteType(item)

            const row = {
              ...item,
              schedule_id: item.schedule_id,
              schedule_type: item.schedule_type,
              route_type: routeType,
              schedule_qty: plannedQty,
              coating_date: item.coating_date || '',
              rewinding_date: item.rewinding_date || '',
              packaging_date: item.packaging_date || '',
              remark: item.remark || '',
              single_area: singleArea.toFixed(2),
              production_area: (singleArea * plannedQty).toFixed(2),
              owe_area: (singleArea * remainingQty).toFixed(2),
              locked_area_total: Number(item.locked_area_total || 0),
              unlocked_area: Number(item.unlocked_area || 0),
              lock_status: item.lock_status || 'UNLOCKED',
              readiness_status_code: String(item.readiness_status_code || '').toUpperCase() || 'UNKNOWN',
              readiness_status_text: item.readiness_status_text || '',
              completed_qty: Number(completedQty.toFixed(2)),
              priority_score: Number(item.priority_score || 0).toFixed(1)
            }
            row.is_completed = this.calcProductionCompleted(row) ? 'Y' : 'N'
            return row
          })
          mapped.forEach(row => {
            const id = this.pendingRowKey(row)
            if (id) {
              this.$set(this.pendingRowCache, id, row)
            }
          })
          const enrichedMapped = await this.enrichMaterialNamesFromSpec(mapped)
          this.pendingRawList = enrichedMapped
          this.orderList = enrichedMapped
          if (!this.pendingDefaultSelectionInited) {
            this.pendingDefaultSelectionInited = true
            this.autoSelectPendingRowsByDailyTarget()
          } else {
            this.syncPendingSelectionToTable()
          }
        }
      } catch (error) {
        this.$message.error('加载订单失败')
      } finally {
        this.loading = false
      }
    },

    async fillPendingReadiness(rows) {
      if (!Array.isArray(rows) || rows.length === 0) return
      const ids = Array.from(new Set(rows
        .map(r => Number((r && r.order_detail_id) || 0))
        .filter(id => id > 0)))
      if (ids.length === 0) return

      try {
        const res = await getOrderItemsReadiness({ orderItemIds: ids })
        if (!(res.code === 200 || res.code === 20000)) return
        const dataMap = res.data || {}
        rows.forEach(row => {
          const id = Number((row && row.order_detail_id) || 0)
          const readiness = dataMap[id] || dataMap[String(id)]
          if (!readiness) return
          row.readiness_status_code = String(readiness.statusCode || row.readiness_status_code || '').toUpperCase() || 'UNKNOWN'
          row.readiness_status_text = readiness.statusText || row.readiness_status_text || ''
        })
      } catch (error) {
        rows.forEach(row => {
          if (!row.readiness_status_code) {
            row.readiness_status_code = 'UNKNOWN'
          }
          if (!row.readiness_status_text) {
            row.readiness_status_text = '待评估'
          }
        })
      }
    },

    handlePendingSizeChange(size) {
      this.pendingPageSize = size
      this.pendingPage = 1
      this.loadOrders()
    },

    handlePendingMaterialSearch() {
      this.pendingPage = 1
      this.loadOrders()
    },

    handlePendingMaterialClear() {
      this.pendingQuery.materialCode = ''
      this.pendingMaterialOweArea = 0
      this.pendingPage = 1
      this.loadOrders()
    },

    async loadPendingOweAreaSummary() {
      const materialCode = String((this.pendingQuery && this.pendingQuery.materialCode) || '').trim()
      if (!materialCode) {
        this.pendingMaterialOweArea = 0
        return
      }
      try {
        const res = await getPendingOrdersOweArea({ materialCode })
        if (res.code === 200 || res.code === 20000) {
          this.pendingMaterialOweArea = Number(res.data || 0)
        } else {
          this.pendingMaterialOweArea = 0
        }
      } catch (e) {
        this.pendingMaterialOweArea = 0
      }
    },

    handlePendingPageChange(page) {
      this.pendingPage = page
      this.loadOrders()
    },

    toggleShowCompletedRows() {
      this.showCompletedRows = !this.showCompletedRows
      this.pendingPage = 1
      this.loadOrders()
    },

    // 加载设备列表
    async loadEquipmentList() {
      try {
        const [coatingRes, rewindingRes, slittingRes] = await Promise.all([
          getEquipmentList({ equipmentType: 'coating', pageSize: 100 }),
          getEquipmentList({ equipmentType: 'rewinding', pageSize: 100 }),
          getEquipmentList({ equipmentType: 'slitting', pageSize: 100 })
        ])
        if (coatingRes.code === 200 || coatingRes.code === 20000) {
          this.equipmentList = coatingRes.data.records || coatingRes.data || []
        }
        if (rewindingRes.code === 200 || rewindingRes.code === 20000) {
          this.rewindingEquipmentList = rewindingRes.data.records || rewindingRes.data || []
        }
        if (slittingRes.code === 200 || slittingRes.code === 20000) {
          this.slittingEquipmentList = slittingRes.data.records || slittingRes.data || []
        }
      } catch (error) {
        console.error('加载设备列表失败', error)
      }
    },

    async loadCoatingTeamList() {
      try {
        const res = await getAllActiveTeams()
        if (res.code === 200 || res.code === 20000) {
          const list = Array.isArray(res.data) ? res.data : (res.data && res.data.records) || []
          this.packagingTeamList = list
        }
      } catch (error) {
        console.error('加载涂布班组失败', error)
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
          const singleArea = (Number(row.width || 0) / 1000) * Number(row.length || 0)
          const requiredArea = singleArea * Number(row.schedule_qty || 0)
          this.$set(this.stockMatchResult, 'requiredArea', Number(requiredArea.toFixed(2)))
          this.$set(this.stockMatchResult, 'totalAvailableArea', Number((this.stockMatchResult.totalAvailableArea || 0).toFixed(2)))
          this.$set(this.stockMatchResult, 'specText', `${row.thickness || ''}μm*${row.width || ''}mm*${row.length || ''}m`)
          this.stockScanCodes = ''
          // 初始化分配数量
          this.stockMatchResult.stockList.forEach(stock => {
            this.$set(stock, 'allocate_area', 0)
          })
          this.autoAllocateStock(this.stockMatchResult.stockList, requiredArea)
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

    parseRollCodes(text) {
      if (!text) return []
      return String(text)
        .split(/[\n,，;；\s]+/g)
        .map(s => s && s.trim())
        .filter(Boolean)
    },

    syncStockTableSelection(rows) {
      this.$nextTick(() => {
        const table = this.$refs.stockTable
        if (!table) return
        table.clearSelection()
        ;(rows || []).forEach(row => {
          table.toggleRowSelection(row, true)
        })
      })
    },

    clearStockScan() {
      this.stockScanCodes = ''
      this.selectedStocks = []
      this.syncStockTableSelection([])
    },

    applyStockScanSelection() {
      const codes = this.parseRollCodes(this.stockScanCodes)
      if (!codes.length) {
        this.$message.warning('请先扫码批次号/二维码')
        return
      }
      if (!this.stockMatchResult || !Array.isArray(this.stockMatchResult.stockList)) {
        this.$message.warning('库存列表为空，无法匹配')
        return
      }

      const normalized = codes.map(c => String(c).trim().toUpperCase())
      const unique = Array.from(new Set(normalized))
      const list = this.stockMatchResult.stockList
      const matched = []

      unique.forEach(code => {
        const found = list.find(item => {
          const qr = item.qr_code || item.qrCode
          const batch = item.batch_no || item.batchNo
          const qrText = qr ? String(qr).trim().toUpperCase() : ''
          const batchText = batch ? String(batch).trim().toUpperCase() : ''
          return (qrText && qrText === code) || (batchText && batchText === code)
        })
        if (found) matched.push(found)
      })

      list.forEach(stock => {
        this.$set(stock, 'allocate_area', 0)
      })

      let remain = Number(this.stockMatchResult.requiredArea || 0)
      matched.forEach(stock => {
        if (remain <= 0) return
        const available = Number(stock.available_area || 0)
        const lockArea = Math.min(available, remain)
        if (lockArea > 0) {
          this.$set(stock, 'allocate_area', Number(lockArea.toFixed(2)))
          remain = Math.max(0, remain - lockArea)
        }
      })

      this.selectedStocks = matched
      this.syncStockTableSelection(matched)
      if (!matched.length) {
        this.$message.warning('未匹配到库存，请检查扫码内容')
      } else if (remain > 0) {
        this.$message.warning(`库存匹配成功，但仍有${remain.toFixed(2)}㎡未覆盖`)
      } else {
        this.$message.success('批量扫码匹配完成')
      }
    },

    // 关闭库存对话框
    handleStockDialogClose() {
      this.stockMatchResult = null
      this.selectedStocks = []
      this.stockScanCodes = ''
      this.currentOrder = null
    },

    // 按先进先出自动分配库存
    autoAllocateStock(stockList, requiredQty) {
      let remaining = Number(requiredQty) || 0
      stockList.forEach(stock => {
        const available = Number(stock.available_area || 0)
        const allocate = remaining > 0 ? Math.min(available, remaining) : 0
        this.$set(stock, 'allocate_area', Number(allocate.toFixed(2)))
        remaining -= allocate
      })
    },

    // 确认库存分配并创建复卷排程
    async handleConfirmStockAllocation() {
      const allocations = this.stockMatchResult.stockList
        .filter(s => s.allocate_area > 0)
        .map(s => ({
          stockId: s.stock_id,
          area: s.allocate_area
        }))

      const singleArea = (Number(this.currentOrder.width || 0) / 1000) * Number(this.currentOrder.length || 0)
      const requiredQty = Number(this.currentOrder.schedule_qty || 0)
      const requiredArea = singleArea * requiredQty
      const totalAllocatedArea = allocations.reduce((sum, a) => sum + a.area, 0)
      if (totalAllocatedArea > requiredArea) {
        this.$message.warning(`分配面积(${totalAllocatedArea.toFixed(2)})大于需求面积(${requiredArea.toFixed(2)})`)
        return
      }
      const shortageArea = Math.max(0, requiredArea - totalAllocatedArea)
      const shortageQty = singleArea > 0 ? Math.max(0, Math.ceil(shortageArea / singleArea)) : 0

      try {
        // 1. 有库存分配则创建复卷排程
        if (totalAllocatedArea > 0) {
          const allocatedQty = singleArea > 0 ? Math.max(1, Math.round(totalAllocatedArea / singleArea)) : 0
          const scheduleRes = await createSchedule({
            orderNo: this.currentOrder.order_no,
            orderDetailId: this.currentOrder.order_detail_id,
            materialCode: this.currentOrder.material_code,
            materialName: this.currentOrder.material_name,
            width: this.currentOrder.width,
            length: this.currentOrder.length,
            thickness: this.currentOrder.thickness,
            orderQty: this.currentOrder.order_qty,
            scheduleQty: allocatedQty,
            coatingDate: this.currentOrder.coating_date,
            rewindingDate: this.currentOrder.rewinding_date,
            packagingDate: this.currentOrder.packaging_date,
            scheduleType: 'STOCK'
          })

          if (scheduleRes.code !== 200 && scheduleRes.code !== 20000) {
            throw new Error('创建排程失败')
          }

          const rewindingRes = await createRewindingSchedule({
            scheduleId: scheduleRes.data,
            stockAllocations: allocations
          })

          if (rewindingRes.code !== 200 && rewindingRes.code !== 20000) {
            throw new Error('复卷排程创建失败')
          }
        }

        // 2. 不足数量自动转涂布排程
        if (shortageArea > 0) {
          const coatingRes = await createSchedule({
            orderNo: this.currentOrder.order_no,
            orderDetailId: this.currentOrder.order_detail_id,
            materialCode: this.currentOrder.material_code,
            materialName: this.currentOrder.material_name,
            width: this.currentOrder.width,
            length: this.currentOrder.length,
            thickness: this.currentOrder.thickness,
            orderQty: this.currentOrder.order_qty,
            scheduleQty: shortageQty,
            coatingArea: Number(shortageArea.toFixed(2)),
            coatingDate: this.currentOrder.coating_date,
            rewindingDate: this.currentOrder.rewinding_date,
            packagingDate: this.currentOrder.packaging_date,
            scheduleType: 'COATING',
            remark: `库存不足${shortageQty}卷，自动转涂布`
          })

          if (coatingRes.code !== 200 && coatingRes.code !== 20000) {
            throw new Error('涂布排程创建失败')
          }
        }

        this.$message.success('分配完成')
        this.stockDialogVisible = false
        this.loadOrders()
        if (shortageArea > 0) {
          this.loadCoatingSchedules()
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
        const plannedArea = ((Number(row.width || 0) / 1000) * Number(row.length || 0) * Number(row.schedule_qty || 0))
        const res = await calculateCoating({
          orderNo: row.order_no,
          materialCode: row.material_code,
          plannedArea: Number(plannedArea.toFixed(2))
        })

        if (res.code === 200 || res.code === 20000) {
          this.coatingRequirement = res.data
          this.coatingForm.coatingArea = Number(plannedArea.toFixed(2))
          this.initCoatingSelection(this.coatingRequirement.details)
          this.syncCoatingSelectionByArea()
          this.rebalanceCoatingInclusion()
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
        const details = (this.coatingRequirement && this.coatingRequirement.details) || []
        const selectedDetails = details.filter(d => Number(d.included_area || 0) > 0)
        if (selectedDetails.length === 0) {
          this.$message.warning('请至少选择一条要纳入涂布的订单')
          return
        }

        const includedAreaTotal = selectedDetails
          .reduce((sum, d) => sum + Number(d.included_area || 0), 0)

        const finalCoatingWidth = 1040
        const coatingLength = finalCoatingWidth > 0
          ? Number((includedAreaTotal / (finalCoatingWidth / 1000)).toFixed(2))
          : 0

        const singleArea = (Number(this.currentOrder.width || 0) / 1000) * Number(this.currentOrder.length || 0)
        const currentPlanQty = Number(this.getPlannedQtyByRow(this.currentOrder) || 0)
        const scheduleQty = currentPlanQty > 0
          ? currentPlanQty
          : (singleArea > 0
            ? Math.max(1, Math.ceil(includedAreaTotal / singleArea))
            : Math.max(1, Number(this.currentOrder.schedule_qty || 1)))

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
          coatingArea: Number(includedAreaTotal.toFixed(2)),
          coatingDate: this.currentOrder.coating_date,
          rewindingDate: this.currentOrder.rewinding_date,
          packagingDate: this.currentOrder.packaging_date,
          coatingWidth: finalCoatingWidth,
          coatingLength: coatingLength,
          scheduleType: 'COATING',
          status: 'PENDING',
          remark: this.coatingForm.remark
        })

        if (scheduleRes.code === 200 || scheduleRes.code === 20000) {
          await saveCoatingAllocation({
            scheduleId: scheduleRes.data,
            details: details
          })
          this.$message.success('已保存到涂布排程')
          this.coatingDialogVisible = false
          this.activeTab = 'coating'
          this.coatingPage = 1
          await this.loadOrders()
          await this.loadCoatingSchedules()
          this.markCoatingHighlight(scheduleRes.data)
        }
      } catch (error) {
        const msg = (error && error.response && error.response.data && (error.response.data.msg || error.response.data.message)) || error.message || '保存失败'
        this.$message.error(msg)
      }
    },

    buildCoatingRemark(requirementData, currentRow) {
      const details = (requirementData && requirementData.details) || []
      if (!Array.isArray(details) || details.length === 0) {
        return `订单${currentRow.order_no}涂布需求`
      }
      const text = details.map(item => {
        if (Number(item.included_flag || 0) !== 1) return null
        const orderNo = item.order_no || '-'
        const area = Number(item.included_area || 0).toFixed(2)
        return `${orderNo}(${area}㎡)`
      }).filter(Boolean).join('，')
      return text ? `本次计划覆盖：${text}` : `订单${currentRow.order_no}涂布需求`
    },

    initCoatingSelection(details) {
      if (!Array.isArray(details)) return
      details.forEach(item => {
        this.$set(item, '_selected', Number(item.included_flag || 0) === 1)
      })
    },

    rebalanceCoatingInclusion() {
      const details = (this.coatingRequirement && this.coatingRequirement.details) || []
      if (!Array.isArray(details)) return

      let remain = Number(this.coatingForm.coatingArea || 0)
      if (!Number.isFinite(remain) || remain < 0) remain = 0

      details.forEach(item => {
        const selected = !!item._selected
        const remainingArea = Number(item.remaining_area || 0)
        if (!selected || remain <= 0 || remainingArea <= 0) {
          this.$set(item, 'included_area', 0)
          this.$set(item, 'included_flag', 0)
          if (remain <= 0 || remainingArea <= 0) {
            this.$set(item, '_selected', false)
          }
          return
        }
        // 仅允许整单纳入：剩余计划面积不足以覆盖该订单时，不纳入且开关关闭
        if (remain < remainingArea) {
          this.$set(item, 'included_area', 0)
          this.$set(item, 'included_flag', 0)
          this.$set(item, '_selected', false)
          return
        }

        const includedArea = remainingArea
        this.$set(item, 'included_area', Number(includedArea.toFixed(2)))
        this.$set(item, 'included_flag', 1)
        this.$set(item, '_selected', true)
        remain = Math.max(0, remain - includedArea)
      })

      this.coatingForm.remark = this.buildCoatingRemark(this.coatingRequirement, this.currentOrder || {})
    },

    syncCoatingSelectionByArea() {
      const details = (this.coatingRequirement && this.coatingRequirement.details) || []
      if (!Array.isArray(details)) return

      let remain = Number(this.coatingForm.coatingArea || 0)
      if (!Number.isFinite(remain) || remain < 0) remain = 0

      details.forEach(item => {
        const remainingArea = Number(item.remaining_area || 0)
        // 仅允许整单纳入
        const shouldSelect = remain >= remainingArea && remainingArea > 0
        this.$set(item, '_selected', shouldSelect)
        if (shouldSelect) {
          remain = Math.max(0, remain - remainingArea)
        }
      })
    },

    handleCoatingIncludeToggle() {
      this.rebalanceCoatingInclusion()
    },

    async handlePlannedAreaChange() {
      if (!this.currentOrder) {
        return
      }
      this.syncCoatingSelectionByArea()
      this.rebalanceCoatingInclusion()
    },

    // 加载涂布排程列表
    async loadCoatingSchedules(forceReloadSpeed = false) {
      this.coatingLoading = true
      try {
        if (forceReloadSpeed || !Object.keys(this.coatingSpeedMap).length) {
          await this.loadCoatingSpeedMap()
        }
        const res = await getCoatingSchedules({
          current: this.coatingPage,
          size: this.coatingPageSize
        })
        if (res.code === 200 || res.code === 20000) {
          const pageData = res.data || {}
          const records = pageData.records || pageData.list || []
          const mappedCoating = records.map(item => {
            const hasPlan = this.hasCoatingPlan(item)
            const width = Number(item.coating_width || 0)
            const finalWidth = width > 0 ? width : 1040
            const inputLength = Number(item.coating_length || 0)
            const area = Number(item.coating_area || 0)
            const finalLength = inputLength > 0
              ? inputLength
              : ((area > 0 && finalWidth > 0)
                ? Number((area / (finalWidth / 1000)).toFixed(2))
                : Number(item.length || 0) || null)
            const finalArea = area > 0
              ? area
              : ((finalWidth > 0 && finalLength > 0) ? Number(((finalWidth / 1000) * finalLength).toFixed(2)) : 0)
            return {
              ...item,
              coating_width: finalWidth,
              coating_length: finalLength,
              coating_area: finalArea,
              insert_mode: item.insert_mode || 'AFTER_TIME',
              anchor_schedule_id: item.anchor_schedule_id ? Number(item.anchor_schedule_id) : null,
              rebalance_mode: item.rebalance_mode || 'MANUAL_CROSS_LINE',
              team_capacity_minutes: null,
              team_planned_minutes: null,
              team_after_minutes: null,
              team_over_capacity: false,
              status: hasPlan ? item.status : 'PENDING',
              __editing: !hasPlan,
              __manual: false
            }
          })
          this.coatingList = await this.enrichMaterialNamesFromSpec(mappedCoating)
          this.applyCoatingSort()
          await this.ensureCoatingSpeedForRows(this.coatingList)
          this.applyCoatingTimelinePreview()
          this.coatingTotal = Number(pageData.total || 0)
        } else {
          this.coatingList = []
          this.coatingTotal = 0
        }
      } catch (error) {
        this.$message.error('加载涂布排程失败')
      } finally {
        this.coatingLoading = false
        this.relayoutTable('coatingTable')
      }
    },

    handleCoatingSizeChange(size) {
      this.coatingPageSize = size
      this.coatingPage = 1
      this.loadCoatingSchedules()
    },

    handleCoatingPageChange(page) {
      this.coatingPage = page
      this.loadCoatingSchedules()
    },

    // 加载待复卷订单列表
    async loadRewindingOrders() {
      this.rewindingLoading = true
      try {
        if (!Object.keys(this.rewindingSpeedMap).length) {
          await this.loadRewindingSpeedMap()
        }
        const res = await getCoatingCompletedOrders({
          current: this.rewindingPage,
          size: this.rewindingPageSize
        })
        if (res.code === 200 || res.code === 20000) {
          const pageData = res.data || {}
          const records = pageData.records || pageData.list || []
          const mappedRewinding = records.map(item => {
            const statusText = String(item.status || '').trim().toUpperCase()
            const hasPlan = this.hasRewindingPlan(item)
            const isScheduled = hasPlan
            const isStock = String(item.schedule_type || '').toUpperCase() === 'STOCK'
            const defaultStockStart = this.getNextDayEightClockString()
            const planStart = (!isScheduled && isStock)
              ? defaultStockStart
              : (item.rewinding_start_time || item.rewinding_date || '')
            const normalizedPlanStart = planStart && String(planStart).length === 10 ? `${planStart} 08:00:00` : planStart
            const displayStatus = hasPlan ? statusText : 'COATING_SCHEDULED'
            return {
              ...item,
              status: displayStatus,
              rewinding_date: normalizedPlanStart,
              rewinding_width: Number(item.rewinding_width || 0) > 0 ? Number(item.rewinding_width) : 500,
              __editing: !isScheduled,
              __manual: false
            }
          })
          this.rewindingList = await this.enrichMaterialNamesFromSpec(mappedRewinding)
          this.refreshRewindingLockSummary()
          this.applyRewindingSort()
          await this.ensureRewindingSpeedForRows(this.rewindingList)
          this.applyRewindingTimelinePreview()
          this.rewindingTotal = Number(pageData.total || 0)
        } else {
          this.rewindingList = []
          this.rewindingLockSummary = { unlockedRows: 0, unlockedArea: 0 }
          this.rewindingTotal = 0
        }
      } catch (error) {
        this.$message.error('加载待复卷订单失败')
        this.rewindingLockSummary = { unlockedRows: 0, unlockedArea: 0 }
      } finally {
        this.rewindingLoading = false
        this.relayoutTable('rewindingTable')
      }
    },

    handleRewindingSizeChange(size) {
      this.rewindingPageSize = size
      this.rewindingPage = 1
      this.loadRewindingOrders()
    },

    handleRewindingPageChange(page) {
      this.rewindingPage = page
      this.loadRewindingOrders()
    },

    handleRewindingEditAction(row) {
      if (!row) {
        return
      }
      if (!row.__editing) {
        this.$set(row, '__editing', true)
        this.refreshRewindingEquipmentOptions(row)
        return
      }
      this.handleUpdateRewindingSchedule(row)
    },

    handleSlittingSearch() {
      this.slittingPage = 1
      this.loadSlittingSchedules()
    },

    resetSlittingSearch() {
      this.slittingQuery.orderNo = ''
      this.slittingPage = 1
      this.loadSlittingSchedules()
    },

    // 加载分切已排列表
    async loadSlittingSchedules() {
      this.slittingLoading = true
      try {
        if (!Object.keys(this.rewindingSpeedMap).length) {
          await this.loadRewindingSpeedMap()
        }
        if (!Object.keys(this.slittingSpeedMap).length) {
          await this.loadSlittingSpeedMap()
        }
        const res = await getSlittingSchedules({
          current: this.slittingPage,
          size: this.slittingPageSize,
          orderNo: (this.slittingQuery.orderNo || '').trim()
        })
        if (res.code === 200 || res.code === 20000) {
          const pageData = res.data || {}
          const records = pageData.records || pageData.list || []
          const mappedSlitting = records.map(item => {
            const statusText = String(item.status || '').trim().toUpperCase()
            const hasPlan = this.hasSlittingPlan(item)
            const isScheduled = hasPlan
            const planTimeRaw = item.slitting_start_time || item.rewinding_end_time || item.packaging_date || item.slitting_schedule_date || ''
            let planTime = planTimeRaw
            if (planTime && String(planTime).length === 10) {
              planTime = `${planTime} 08:00:00`
            }
            return {
              ...item,
              status: hasPlan ? statusText : 'REWINDING_SCHEDULED',
              packaging_date: planTime,
              slitting_equipment: item.slitting_equipment || '',
              __editing: !isScheduled,
              __manual: false
            }
          })
          this.slittingList = await this.enrichMaterialNamesFromSpec(mappedSlitting)
          this.refreshSlittingLockSummary()
          this.applySlittingSort()
          await this.ensureRewindingSpeedForRows(this.slittingList)
          await this.ensureSlittingSpeedForRows(this.slittingList)
          this.slittingTotal = Number(pageData.total || 0)
        } else {
          this.slittingList = []
          this.slittingLockSummary = { unlockedRows: 0, unlockedArea: 0 }
          this.slittingTotal = 0
        }
      } catch (error) {
        this.$message.error('加载分切已排失败')
        this.slittingLockSummary = { unlockedRows: 0, unlockedArea: 0 }
      } finally {
        this.slittingLoading = false
        this.relayoutTable('slittingTable')
      }
    },

    handleSlittingSizeChange(size) {
      this.slittingPageSize = size
      this.slittingPage = 1
      this.loadSlittingSchedules()
    },

    handleSlittingPageChange(page) {
      this.slittingPage = page
      this.loadSlittingSchedules()
    },

    handleSlittingEditAction(row) {
      if (!row.__editing) {
        this.$set(row, '__editing', true)
        this.refreshSlittingEquipmentOptions(row)
        return
      }
      this.handleUpdateSlittingSchedule(row)
    },

    // 加载复卷已排列表
    async loadRewindingSchedules() {
      try {
        if (!Object.keys(this.rewindingSpeedMap).length) {
          await this.loadRewindingSpeedMap()
        }
        const res = await getRewindingSchedules({
          current: this.rewindingScheduledPage,
          size: this.rewindingScheduledPageSize
        })
        if (res.code === 200 || res.code === 20000) {
          const pageData = res.data || {}
          this.rewindingScheduledList = pageData.records || pageData.list || []
          await this.ensureRewindingSpeedForRows(this.rewindingScheduledList)
          this.rewindingScheduledTotal = Number(pageData.total || 0)
        } else {
          this.rewindingScheduledList = []
          this.rewindingScheduledTotal = 0
        }
      } catch (error) {
        this.$message.error('加载复卷已排失败')
      }
    },

    handleRewindingScheduledSizeChange(size) {
      this.rewindingScheduledPageSize = size
      this.rewindingScheduledPage = 1
      this.loadRewindingSchedules()
    },

    handleRewindingScheduledPageChange(page) {
      this.rewindingScheduledPage = page
      this.loadRewindingSchedules()
    },

    // 确认涂布排程
    async handleConfirmCoating(row) {
      try {
        const materialCode = String(row.material_code || '').trim().toUpperCase()
        if (!materialCode) {
          this.$message.warning('请先输入料号')
          return
        }
        await this.ensureRowMaterialNameBySpec(row)

        const coatingWidth = Number(row.coating_width || 0) > 200 ? Number(row.coating_width) : 1040
        const coatingLength = Number(row.coating_length || 0)
        if (!(coatingLength > 0)) {
          this.$message.warning('请先输入有效的涂布长度')
          return
        }
        if (row.insert_mode === 'AFTER_ORDER' && !row.anchor_schedule_id) {
          this.$message.warning('请先选择插单锚点订单')
          return
        }
        if (!row.coating_equipment) {
          this.$message.warning('请先选择机台')
          return
        }
        const normalizedCoatingStart = this.roundToTenMinuteDateTime(row.coating_schedule_date)
        if (normalizedCoatingStart) {
          this.$set(row, 'coating_schedule_date', normalizedCoatingStart)
        }
        await this.updateCoatingAvailability(row)
        const coatingArea = this.recalcManualCoatingArea(row)
        if (!(coatingArea > 0)) {
          this.$message.warning('涂布面积必须大于0')
          return
        }

        let scheduleId = this.resolveNumericScheduleId(row)
        if (!(scheduleId > 0)) {
          const createRes = await createSchedule({
            orderNo: row.order_no || this.buildManualCoatingOrderNo(),
            orderDetailId: null,
            materialCode,
            materialName: row.material_name || '',
            width: coatingWidth,
            length: coatingLength,
            scheduleQty: 1,
            coatingArea,
            coatingWidth,
            coatingLength,
            coatingDate: row.coating_schedule_date,
            scheduleType: 'COATING',
            status: 'PENDING',
            remark: '手工涂布排程'
          })
          if (!(createRes.code === 200 || createRes.code === 20000)) {
            throw new Error(createRes.msg || createRes.message || '创建手工涂布排程失败')
          }
          scheduleId = Number(createRes.data || 0)
          if (!(scheduleId > 0)) {
            throw new Error('创建手工涂布排程失败，未返回有效排程ID')
          }
          this.$set(row, 'id', scheduleId)
          this.$set(row, 'schedule_id', scheduleId)
          this.$set(row, '__manual', false)
        }

        const res = await createCoatingSchedule({
          scheduleId,
          coatingArea,
          coatingDate: row.coating_schedule_date,
          equipmentId: row.coating_equipment,
          coatingWidth,
          coatingLength,
          materialCode,
          insertMode: row.insert_mode || 'AFTER_TIME',
          anchorScheduleId: row.insert_mode === 'AFTER_ORDER' ? row.anchor_schedule_id : null,
          anchorAfterTime: row.insert_mode === 'AFTER_ORDER' ? row.coating_schedule_date : null,
          rebalanceMode: row.rebalance_mode || 'MANUAL_CROSS_LINE'
        })

        if (res.code === 200 || res.code === 20000) {
          this.$message.success('涂布排程确认成功')
          this.$set(row, '__editing', false)
          this.loadCoatingSchedules()
          this.loadOrders()
        }
      } catch (error) {
        const msg = (error && error.response && error.response.data && (error.response.data.msg || error.response.data.message)) || error.message || '确认失败'
        this.$message.error(msg)
      }
    },

    parseApiError(error, fallback = '操作失败') {
      return (error && error.response && error.response.data && (error.response.data.msg || error.response.data.message)) || error.message || fallback
    },

    isCoatingMaterialRequiredError(message) {
      const text = String(message || '')
      return text.includes('手工涂布排程请先输入料号') || text.includes('请先输入料号')
    },

    getScheduleId(row) {
      return row.id || row.schedule_id
    },

    handleScheduleActionCommand(payload) {
      if (!payload || !payload.action) return
      if (payload.action === 'report') {
        this.openWorkReportDialog(payload.row, payload.processType || this.resolveDefaultReportProcessType(payload.row))
      } else if (payload.action === 'terminate') {
        this.handleTerminateSchedule(payload.row)
      } else if (payload.action === 'reduce') {
        this.handleReduceSchedule(payload.row)
      } else if (payload.action === 'reset') {
        this.handleResetSchedule(payload.row)
      }
    },

    handleOrderActionCommand(payload) {
      if (!payload || !payload.action) return
      if (payload.action === 'stock') {
        this.handleSelectStock(payload.row)
      } else if (payload.action === 'coating') {
        this.handleCalculateCoating(payload.row)
      } else if (payload.action === 'directReport') {
        this.openWorkReportDialog(payload.row, this.resolveDefaultReportProcessType(payload.row))
      } else if (payload.action === 'materialIssue') {
        this.openMaterialIssueDialog(payload.row)
      } else if (payload.action === 'urgentPreempt') {
        this.handleUrgentPreempt(payload.row)
      } else if (payload.action === 'reset') {
        this.handleResetSchedule(payload.row)
      }
    },

    resolveDefaultReportProcessType(row) {
      const routeType = this.getRouteType(row)
      if (routeType === 'COATING_SHIP') return 'COATING'
      if (routeType === 'REWINDING_SHIP') return 'REWINDING'
      return 'SLITTING'
    },

    async handleUrgentPreempt(row) {
      const orderNo = String((row && row.order_no) || '').trim()
      const materialCode = String((row && row.material_code) || '').trim()
      if (!orderNo || !materialCode) {
        this.$message.warning('缺少订单号或产品编码，无法执行急单抢料')
        return
      }

      let suggestedArea = Number((row && row.unlocked_area) || 0)
      if (!(suggestedArea > 0)) {
        suggestedArea = Number((row && row.owe_area) || 0)
      }
      if (!(suggestedArea > 0)) {
        suggestedArea = Number(this.getPlannedAreaByRow(row) || 0)
      }
      if (!(suggestedArea > 0)) {
        suggestedArea = 1
      }

      try {
        const prompt = await this.$prompt('请输入急单目标锁定面积（㎡）', '急单插单抢料', {
          confirmButtonText: '下一步',
          cancelButtonText: '取消',
          inputValue: Number(suggestedArea.toFixed(2)),
          inputPlaceholder: '例如：1200.50',
          inputPattern: /^\d+(\.\d{1,2})?$/,
          inputErrorMessage: '请输入大于0的数字（最多2位小数）'
        })

        const requiredArea = Number(prompt.value || 0)
        if (!(requiredArea > 0)) {
          this.$message.warning('抢料面积必须大于0')
          return
        }

        await this.$confirm(
          `将优先锁定可用库存，不足部分会从低优先级且未消耗锁定中释放并转给急单。\n订单：${orderNo}\n料号：${materialCode}\n目标面积：${requiredArea.toFixed(2)}㎡`,
          '确认执行急单抢料',
          {
            confirmButtonText: '执行',
            cancelButtonText: '取消',
            type: 'warning'
          }
        )

        const res = await urgentLock({
          orderNo,
          materialCode,
          requiredArea,
          operator: 'frontend'
        })

        if (res.code === 200 || res.code === 20000) {
          const result = (res && res.data) || {}
          const directLockedArea = Number(result.directLockedArea || 0)
          const preemptLockedArea = Number(result.preemptLockedArea || 0)
          const remainArea = Number(result.remainArea || 0)
          const releasedOrders = Array.isArray(result.releasedOrders) ? result.releasedOrders.filter(Boolean) : []
          const releasedText = releasedOrders.length ? releasedOrders.join('、') : '无'

          this.$alert(
            `直锁面积：${directLockedArea.toFixed(2)}㎡\n抢占面积：${preemptLockedArea.toFixed(2)}㎡\n剩余缺口：${remainArea.toFixed(2)}㎡\n被释放订单：${releasedText}`,
            '急单抢料执行结果',
            { confirmButtonText: '知道了' }
          )

          await Promise.all([
            this.loadOrders(),
            this.loadCoatingSchedules(),
            this.loadRewindingOrders(),
            this.loadSlittingSchedules()
          ])
        } else {
          this.$message.error(res.message || '急单抢料失败')
        }
      } catch (error) {
        if (error === 'cancel' || (error && error.message === 'cancel')) {
          return
        }
        this.$message.error(this.parseApiError(error, '急单抢料失败'))
      }
    },

    async handleResetSchedule(row) {
      const orderDetailId = Number((row && row.order_detail_id) || 0)
      if (!orderDetailId) {
        this.$message.warning('未找到订单明细ID，无法清空重排')
        return
      }
      try {
        const reasonPrompt = await this.$prompt('请输入清空重排原因（必填）', '清空重排', {
          confirmButtonText: '下一步',
          cancelButtonText: '取消',
          inputPlaceholder: '如：路线判定变更，重新排程',
          inputValidator: (value) => {
            if (!value || !value.trim()) return '原因不能为空'
            return true
          }
        })

        await this.$confirm('将清空该订单明细的排程、报工与占用数据，并重置已排程数量。是否继续？', '确认清空重排', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        })

        const res = await resetScheduleByOrderDetail({
          orderDetailId,
          reason: reasonPrompt.value,
          operator: 'frontend'
        })

        if (res.code === 200 || res.code === 20000) {
          this.$message.success('清空重排成功')
          await Promise.all([
            this.loadOrders(),
            this.loadCoatingSchedules(),
            this.loadRewindingSchedules(),
            this.loadSlittingSchedules()
          ])
        } else {
          this.$message.error(res.message || '清空重排失败')
        }
      } catch (error) {
        if (error === 'cancel' || (error && error.message === 'cancel')) {
          return
        }
        this.$message.error(this.parseApiError(error, '清空重排失败'))
      }
    },

    async handleTerminateSchedule(row) {
      const scheduleId = this.getScheduleId(row)
      if (!scheduleId) {
        this.$message.warning('未找到排程ID')
        return
      }

      try {
        const reasonPrompt = await this.$prompt('请输入终止原因（必填）', '终止排程', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          inputPlaceholder: '如：客户变更、产能调整',
          inputValidator: (value) => {
            if (!value || !value.trim()) return '终止原因不能为空'
            return true
          }
        })

        const reason = reasonPrompt.value
        await this.$confirm('终止后仅保留已开工部分，未开工数量将回滚。是否继续？', '确认终止', {
          confirmButtonText: '确定终止',
          cancelButtonText: '取消',
          type: 'warning'
        })

        const res = await terminateSchedule({
          scheduleId,
          reason,
          operator: 'frontend'
        })

        if (res.code === 200 || res.code === 20000) {
          this.$message.success('终止成功')
          this.loadCoatingSchedules()
          this.loadRewindingSchedules()
          this.loadOrders()
        } else {
          this.$message.error(res.message || '终止失败')
        }
      } catch (error) {
        if (error === 'cancel' || (error && error.message === 'cancel')) {
          return
        }
        this.$message.error(this.parseApiError(error, '终止失败'))
      }
    },

    async handleReduceSchedule(row) {
      const scheduleId = this.getScheduleId(row)
      if (!scheduleId) {
        this.$message.warning('未找到排程ID')
        return
      }

      const maxReduce = Number(row.schedule_qty || 0)
      if (maxReduce <= 0) {
        this.$message.warning('当前排程数量不可减量')
        return
      }

      try {
        const qtyPrompt = await this.$prompt(`请输入减量卷数（1-${maxReduce}）`, '排程减量', {
          confirmButtonText: '下一步',
          cancelButtonText: '取消',
          inputPlaceholder: '请输入正整数',
          inputPattern: /^\d+$/,
          inputErrorMessage: '请输入正整数'
        })
        const reduceQty = Number(qtyPrompt.value || 0)
        if (!Number.isInteger(reduceQty) || reduceQty <= 0 || reduceQty > maxReduce) {
          this.$message.warning(`减量范围应为 1-${maxReduce}`)
          return
        }

        const reasonPrompt = await this.$prompt('请输入减量原因（必填）', '排程减量', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          inputPlaceholder: '如：客户减单、工艺变更',
          inputValidator: (value) => {
            if (!value || !value.trim()) return '减量原因不能为空'
            return true
          }
        })

        const res = await reduceSchedule({
          scheduleId,
          reduceQty,
          reason: reasonPrompt.value,
          operator: 'frontend'
        })

        if (res.code === 200 || res.code === 20000) {
          this.$message.success('减量成功')
          this.loadCoatingSchedules()
          this.loadRewindingSchedules()
          this.loadOrders()
        } else {
          this.$message.error(res.message || '减量失败')
        }
      } catch (error) {
        if (error === 'cancel' || (error && error.message === 'cancel')) {
          return
        }
        this.$message.error(this.parseApiError(error, '减量失败'))
      }
    },

    lockStatusType(status) {
      const map = {
        'NOT_STARTED': 'danger',
        'UNLOCKED': 'danger',
        'PARTIAL': 'warning',
        'LOCKED': 'success'
      }
      return map[String(status || '').toUpperCase()] || 'info'
    },

    lockStatusText(status) {
      const map = {
        'NOT_STARTED': '未锁定',
        'UNLOCKED': '未锁定',
        'PARTIAL': '部分锁定',
        'LOCKED': '已锁定'
      }
      const key = String(status || '').toUpperCase()
      return map[key] || (status || '-')
    },

    readinessStatusType(status) {
      const map = {
        'READY': 'success',
        'READY_BY_ETA': 'warning',
        'SHORTAGE': 'danger',
        'RISK': 'info',
        'UNKNOWN': 'info'
      }
      return map[String(status || '').toUpperCase()] || 'info'
    },

    readinessStatusText(status, fallbackText) {
      const map = {
        'READY': '已齐套',
        'READY_BY_ETA': '预计齐套',
        'SHORTAGE': '缺料',
        'RISK': '风险',
        'UNKNOWN': '待评估'
      }
      const key = String(status || '').toUpperCase()
      return map[key] || fallbackText || '待评估'
    },

    isReadinessBlocked(row) {
      const code = String((row && row.readiness_status_code) || '').toUpperCase()
      return code === 'SHORTAGE'
    },

    statusType(status) {
      const map = {
        'PENDING': 'info',
        'COATING_SCHEDULED': 'warning',
        'REWINDING_SCHEDULED': 'primary',
        'COMPLETED': 'success',
        'TERMINATED': 'danger',
        'CANCELLED': 'info'
      }
      return map[status] || 'info'
    },

    statusText(status) {
      const map = {
        'PENDING': '待确认',
        'COATING_SCHEDULED': '涂布已排',
        'REWINDING_SCHEDULED': '复卷已排',
        'COMPLETED': '已完成',
        'TERMINATED': '已终止',
        'CANCELLED': '已取消'
      }
      return map[status] || status
    },

    equipmentName(equipmentId) {
      if (!equipmentId) return '-'
      const equipment = this.equipmentList.find(eq => String(eq.id) === String(equipmentId))
      return equipment ? equipment.equipmentName : equipmentId
    },

    packagingTeamName(teamName) {
      const raw = String(teamName || '').trim()
      if (!raw) return '-'
      const team = (this.packagingTeamList || []).find(item => String(item.teamName || '').trim() === raw)
      return team ? team.teamName : raw
    },

    handleTabClick(tab) {
      if (tab && tab.name === 'coating') {
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
      if (this.isReadinessBlocked(row)) {
        this.$message.warning('当前订单明细处于缺料状态，不能确认排程')
        return
      }
      const unlockedArea = this.getUnlockedArea(row)
      const message = unlockedArea > 0
        ? `当前订单仍有 ${unlockedArea.toFixed(2)} ㎡ 未锁定，继续确认后将进入排程流程。是否继续？`
        : '确认要对该订单进行排程吗？'
      this.$confirm(message, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: unlockedArea > 0 ? 'warning' : 'info'
      }).then(() => {
        // 调用后端接口确认排程，传递本次排程数量
        confirmSchedule({
          orderNo: row.order_no,
          materialCode: row.material_code,
          scheduleQty: row.schedule_qty,
          scheduleId: row.schedule_id,
          orderDetailId: row.order_detail_id,
          coatingDate: row.coating_date,
          rewindingDate: row.rewinding_date,
          packagingDate: row.packaging_date
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

    // 复卷已排修改
    async handleUpdateRewindingSchedule(row) {
      if (!row.schedule_id || Number(row.schedule_id) <= 0) {
        this.$message.warning('手动添加行请先填写有效排程号')
        return
      }
      if (!String(row.material_code || '').trim()) {
        this.$message.warning('请先填写料号')
        return
      }
      if (!row.rewinding_date) {
        this.$message.warning('请选择复卷日期')
        return
      }
      if (!row.rewinding_equipment) {
        this.$message.warning('请填写复卷机台号')
        return
      }

      try {
        await this.ensureRowMaterialNameBySpec(row)
        const plannedArea = this.getPlannedRewindingArea(row)
        const res = await createRewindingSchedule({
          scheduleId: row.schedule_id,
          rewindingArea: plannedArea,
          rewindingDate: row.rewinding_date,
          rewindingEquipment: row.rewinding_equipment,
          rewindingWidth: Number(row.rewinding_width || 500)
        })

        if (res.code === 200 || res.code === 20000) {
          this.$message.success('复卷排程修改成功')
          this.$set(row, '__editing', false)
          this.$set(row, 'status', 'REWINDING_SCHEDULED')
          this.loadRewindingOrders()
          this.loadOrders()
        } else {
          this.$message.error(res.message || '修改失败')
        }
      } catch (err) {
        this.$message.error('修改失败: ' + (err.message || '未知错误'))
      }
    },

    // 分切已排修改
    async handleUpdateSlittingSchedule(row) {
      if (!row.schedule_id || Number(row.schedule_id) <= 0) {
        this.$message.warning('手动添加行请先填写有效排程号')
        return
      }
      if (!String(row.material_code || '').trim()) {
        this.$message.warning('请先填写料号')
        return
      }
      if (!row.packaging_date) {
        this.$message.warning('请选择包装日期')
        return
      }
      if (!row.slitting_equipment && !row.rewinding_equipment) {
        this.$message.warning('请选择分切机台')
        return
      }
      if (!row.packaging_team) {
        this.$message.warning('请选择包装班组')
        return
      }

      const rewindingEnd = this.parseDateTimeValue(row.rewinding_end_time || row.rewindingEndTime)
      const selectedStart = this.parseDateTimeValue(row.packaging_date)
      if (rewindingEnd && selectedStart && selectedStart.getTime() < rewindingEnd.getTime()) {
        const adjusted = this.toDateTimeString(rewindingEnd)
        this.$set(row, 'packaging_date', adjusted)
        this.$message.warning(`分切开始已自动调整为复卷结束后：${this.formatDateTime(adjusted)}`)
      }

      try {
        await this.ensureRowMaterialNameBySpec(row)
        const res = await updateSlittingSchedule({
          scheduleId: row.schedule_id,
          packagingDate: row.packaging_date,
          slittingEquipment: row.slitting_equipment || row.rewinding_equipment,
          packagingTeam: row.packaging_team
        })

        if (res.code === 200 || res.code === 20000) {
          this.$message.success('分切排程修改成功')
          this.$set(row, '__editing', false)
          this.$set(row, 'status', 'CONFIRMED')
          this.loadSlittingSchedules()
          this.loadOrders()
        } else {
          this.$message.error(res.message || '修改失败')
        }
      } catch (err) {
        this.$message.error('修改失败: ' + (err.message || '未知错误'))
      }
    },

    // Tab 切换时加载数据
    onTabChange(tab) {
      if (tab.name === 'coating') {
        this.loadCoatingSchedules()
        this.relayoutTable('coatingTable')
      } else if (tab.name === 'rewinding') {
        this.loadRewindingOrders()
        this.relayoutTable('rewindingTable')
      } else if (tab.name === 'slitting') {
        this.loadSlittingSchedules()
        this.relayoutTable('slittingTable')
      }
      this.updateTableMaxHeight()
      this.$nextTick(() => {
        this.syncActiveTableLayout()
      })
    },

    // 订单表格行样式
    tableRowClassName({ row }) {
      if (this.calcProductionCompleted(row)) {
        return 'row-scheduled-complete'
      }
      return ''
    }
  }
}</script>

<style scoped>
.app-container ::v-deep .el-table__cell {
  padding: 5px 4px;
}
.app-container ::v-deep .el-input__inner {
  padding: 0 5px;
  height: 24px;
  line-height: 24px;
  font-size: 12px;
}
.app-container ::v-deep .el-date-editor.el-input,
.app-container ::v-deep .el-date-editor.el-input__inner {
  width: 100%;
}
.app-container ::v-deep .el-input-number--mini {
  width: 100%;
}
.app-container ::v-deep .el-input-number--mini .el-input__inner {
  height: 24px;
  line-height: 24px;
}
.app-container ::v-deep .el-input-number--mini .el-input-number__decrease,
.app-container ::v-deep .el-input-number--mini .el-input-number__increase {
  width: 18px;
}
.app-container ::v-deep .spec-header .cell {
  font-size: 12px;
}
.manual-schedule-table ::v-deep .el-table__cell .cell {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  word-break: normal;
  font-size: 12px;
  line-height: 18px;
}

.manual-schedule-orders-table ::v-deep .el-table__cell .cell {
  white-space: normal !important;
  overflow: visible !important;
  text-overflow: clip !important;
  word-break: break-word;
  font-size: 12px;
  line-height: 18px;
}

.manual-schedule-table ::v-deep .el-table__cell .cell.el-tooltip {
  display: block;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  word-break: normal;
  font-size: 12px;
  line-height: 18px;
}

.manual-schedule-orders-table ::v-deep .el-table__cell .cell.el-tooltip {
  white-space: normal !important;
  overflow: visible !important;
  text-overflow: clip !important;
  word-break: break-word;
}

.manual-schedule-table ::v-deep .el-table th > .cell {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  word-break: keep-all;
  line-height: 18px;
  font-weight: 600;
}

.manual-schedule-orders-table ::v-deep .el-table th > .cell {
  white-space: normal !important;
  overflow: visible !important;
  text-overflow: clip !important;
  word-break: keep-all;
  line-height: 18px;
  text-align: center;
}
.manual-schedule-table ::v-deep .el-table__cell.wrap-col .cell,
.manual-schedule-table ::v-deep .el-table__cell.is-leaf.wrap-col .cell {
  white-space: normal !important;
  overflow: visible !important;
  text-overflow: clip !important;
  line-height: 18px;
  word-break: break-word;
}
.manual-schedule-table ::v-deep .el-table__cell.narrow-col .cell,
.manual-schedule-table ::v-deep .el-table__cell.is-leaf.narrow-col .cell {
  font-size: 12px;
}

.manual-schedule-orders-table ::v-deep .group-header {
  background: #f7f9fc;
}

.manual-schedule-orders-table ::v-deep .group-header .cell {
  font-size: 13px;
  font-weight: 600;
  color: #303133;
  text-align: center;
  letter-spacing: 0.5px;
}

.manual-schedule-orders-table ::v-deep .el-table__header tr:first-child th {
  padding-top: 8px;
  padding-bottom: 8px;
}

.manual-schedule-orders-table ::v-deep .el-table__header tr:nth-child(2) th {
  background: #fff;
}

.manual-schedule-orders-table ::v-deep .el-table__header .cell {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 34px;
}

.manual-schedule-orders-table ::v-deep .el-table__body td {
  vertical-align: middle;
}

.manual-schedule-orders-table ::v-deep .el-table__fixed-right {
  box-shadow: -6px 0 8px -6px rgba(0, 0, 0, 0.08);
}

.app-container {
  padding: 8px;
}

.manual-schedule-page {
  box-sizing: border-box;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.manual-schedule-page ::v-deep .el-tabs {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.manual-schedule-page ::v-deep .el-tabs__content {
  flex: 1;
  min-height: 0;
  padding-bottom: 0;
}

.manual-schedule-page ::v-deep .el-tab-pane {
  height: 100%;
  overflow: auto;
  padding-bottom: 4px;
}

.manual-schedule-page ::v-deep .el-card {
  margin-bottom: 6px;
}

.manual-schedule-page ::v-deep .el-card__header {
  padding: 10px 12px;
}

.manual-schedule-page ::v-deep .el-card__body {
  padding: 10px 12px;
}

.manual-schedule-page ::v-deep .el-pagination {
  margin-top: 6px;
}

.manual-schedule-page ::v-deep .el-tag {
  padding: 0 6px;
  height: 22px;
  line-height: 20px;
}

.manual-schedule-page ::v-deep .el-tag.two-line-time-tag {
  height: auto;
  line-height: 1.2;
  padding: 2px 6px;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
}

.two-line-time-text {
  display: block;
  white-space: nowrap;
  line-height: 14px;
}

.manual-schedule-page ::v-deep .date-only-clean .el-input__prefix,
.manual-schedule-page ::v-deep .date-only-clean .el-input__suffix {
  display: none;
}

.manual-schedule-page ::v-deep .date-only-clean .el-input__inner {
  padding-left: 6px !important;
  padding-right: 6px !important;
  text-align: center;
}

.op-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  white-space: nowrap;
}

.op-actions ::v-deep .el-button {
  height: 22px;
  padding: 0 6px;
  border-radius: 2px;
  border-color: #dcdfe6;
  background: #fff;
  color: #606266;
  font-weight: 400;
  font-size: 12px;
}

.op-actions ::v-deep .el-button:hover,
.op-actions ::v-deep .el-button:focus {
  border-color: #c0c4cc;
  background: #f7f8fa;
  color: #303133;
}

.op-actions ::v-deep .el-button.is-disabled,
.op-actions ::v-deep .el-button.is-disabled:hover,
.op-actions ::v-deep .el-button.is-disabled:focus {
  background: #fafafa;
  border-color: #ebeef5;
  color: #c0c4cc;
}

.op-actions ::v-deep .op-main-btn {
  min-width: 40px;
}

.op-actions ::v-deep .op-more-btn {
  min-width: 44px;
}

.manual-schedule-page ::v-deep .el-dropdown-menu__item {
  font-size: 12px;
  line-height: 30px;
}

.summary-cell {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 2px;
  font-size: 12px;
  line-height: 16px;
}

.summary-cell > div {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.summary-cell span {
  color: #909399;
  white-space: nowrap;
}

.summary-cell strong {
  color: #303133;
  font-weight: 600;
}

.summary-cell-compact {
  padding: 2px 0;
}

.order-info-card {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 4px 6px;
  border-radius: 4px;
  background: #fafbfc;
}

.order-info-line {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  line-height: 16px;
}

.order-info-label {
  flex: 0 0 28px;
  color: #909399;
  font-size: 12px;
}

.order-info-value {
  flex: 1;
  color: #303133;
  word-break: break-word;
}

.order-info-value.code {
  font-weight: 600;
  color: #1f2d3d;
}

.order-info-customer .order-info-value {
  color: #606266;
}

.process-time-card {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 4px 2px;
}

.process-time-line {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 20px;
}

.process-time-label {
  width: 30px;
  color: #909399;
  font-size: 12px;
  flex-shrink: 0;
}

.process-time-value {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
}

.process-time-action {
  padding: 0;
  font-size: 12px;
}

.process-time-empty {
  color: #c0c4cc;
}

.text-warning {
  color: #e6a23c !important;
}

.text-success {
  color: #67c23a !important;
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

.pending-summary-text {
  margin-left: 8px;
  color: #409EFF;
}

.stock-scan-form {
  margin: 8px 0 12px;
}

/* 已排程完成的订单行样式 */
::v-deep .row-scheduled-complete {
  background-color: #f0f9ff !important;
  color: #909399;
}

::v-deep .row-scheduled-complete:hover > td {
  background-color: #e6f4ff !important;
}

::v-deep .coating-highlight-row > td {
  background-color: #fff7e6 !important;
}

::v-deep .coating-highlight-row:hover > td {
  background-color: #ffe7ba !important;
}

::v-deep .rewinding-highlight-row > td {
  background-color: #e6f7ff !important;
}

::v-deep .rewinding-highlight-row:hover > td {
  background-color: #bae7ff !important;
}

::v-deep .slitting-highlight-row > td {
  background-color: #f6ffed !important;
}

::v-deep .slitting-highlight-row:hover > td {
  background-color: #d9f7be !important;
}

</style>

<style lang="scss">
.manual-material-autocomplete-popper {
  min-width: 620px !important;
  max-width: 880px;
}

.manual-material-autocomplete-popper .el-autocomplete-suggestion__wrap {
  max-height: 360px;
}

.manual-material-autocomplete-popper .el-autocomplete-suggestion__list li {
  white-space: normal;
  line-height: 1.45;
  padding-top: 8px;
  padding-bottom: 8px;
}
</style>
