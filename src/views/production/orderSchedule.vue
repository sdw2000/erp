<template>
  <div class="app-container manual-schedule-page" :style="{ minHeight: 'calc(100vh - 100px)', height: pageHeight + 'px' }">
    <el-card shadow="never" class="header-card">
      <div slot="header" class="section-header">
        <div class="header-left">
          <span class="header-title">待排程订单列表</span>
          <span class="pending-summary-text">
            已选 <strong>{{ pendingSelectedStats.rolls }}</strong> 卷 / <strong>{{ pendingSelectedStats.area.toFixed(2) }}</strong> ㎡
            <el-divider direction="vertical" />
            默认目标 <strong>{{ pendingDailyAreaTarget }}</strong> ㎡
          </span>
        </div>
        <div class="header-right">
          <div class="search-input-group">
            <el-input v-model.trim="pendingQuery.materialCode" style="width: 240px" size="small" clearable placeholder="输入料号搜索欠单" @keyup.enter.native="handlePendingMaterialSearch" @clear="handlePendingMaterialClear">
              <el-button slot="append" icon="el-icon-search" @click="handlePendingMaterialSearch" />
            </el-input>
            <el-tag v-if="pendingQuery.materialCode" size="small" type="info" effect="plain" style="margin-left: 0">
              当前料号欠料：<strong>{{ Number(pendingMaterialOweArea || 0).toFixed(2) }} ㎡</strong>
            </el-tag>
          </div>
          <el-button-group>
            <el-button type="success" size="small" icon="el-icon-search" @click="handleBatchScanStock">库存锁定</el-button>
            <el-button type="warning" size="small" plain @click="toggleShowCompletedRows">{{ showCompletedRows ? '隐藏已排' : '查看全部' }}</el-button>
            <el-button type="primary" size="small" icon="el-icon-refresh" @click="loadOrders">刷新</el-button>
          </el-button-group>
        </div>
      </div>

      <el-alert v-if="pendingLockRiskSummary.riskRows > 0" type="warning" show-icon :closable="false" class="mb-10"
        :title="`锁料风险提醒：当前有 ${pendingLockRiskSummary.riskRows} 条待排订单存在未锁定面积，共 ${pendingLockRiskSummary.riskArea} ㎡。建议优先锁料后再确认排程。`" />

      <div class="table-main-area">
        <el-table ref="pendingTable" v-loading="loading" :data="orderList" :row-key="pendingRowKey" :span-method="orderListSpanMethod" border stripe style="width: 100%" :max-height="tableHeight" class="manual-schedule-table manual-schedule-orders-table" :row-class-name="tableRowClassName" @selection-change="handlePendingSelectionChange">
          <el-table-column type="selection" :reserve-selection="true" width="40" align="center" />
          <el-table-column type="index" label="序号" width="54" align="center" />
          <el-table-column prop="order_no" label="订单编号" min-width="132" column-key="order_no" show-overflow-tooltip>
            <template slot-scope="scope">
              <el-button type="text" @click="handleOrderNoClick(scope.row)">{{ scope.row.order_no || '-' }}</el-button>
            </template>
          </el-table-column>
          <el-table-column label="订单信息" align="center" header-align="center" class-name="group-col" header-class-name="group-header">
            <el-table-column label="客户 / 产品 / 规格" min-width="250" class-name="order-card-col" header-class-name="order-card-header" column-key="material_code">
              <template slot-scope="scope">
                <div class="order-info-card">
                  <div class="order-info-line order-info-customer"><span class="order-info-label">客户</span><span class="order-info-value">{{ scope.row.customer_name || '-' }}</span></div>
                  <div class="order-info-line"><span class="order-info-label">产品</span><span class="order-info-value code">{{ scope.row.material_code || '-' }}</span></div>
                  <div class="order-info-line"><span class="order-info-label">规格</span><span class="order-info-value">{{ formatOrderSpec(scope.row) || '-' }}</span></div>
                </div>
              </template>
            </el-table-column>
          </el-table-column>
          <el-table-column label="排程信息" align="center" header-align="center" class-name="group-col" header-class-name="group-header">
            <el-table-column label="本次排程" width="98" align="center" sortable="custom" column-key="schedule_qty">
              <template slot-scope="scope">
                <el-input v-model.number="scope.row.schedule_qty" min="0" :max="Number(scope.row.remaining_qty)" size="mini" inputmode="numeric" />
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
              <template slot-scope="scope"><el-tag :type="scope.row.is_completed === 'Y' ? 'success' : 'info'">{{ scope.row.is_completed }}</el-tag></template>
            </el-table-column>
            <el-table-column label="锁" width="92" align="center" class-name="narrow-col" header-class-name="narrow-col">
              <template slot-scope="scope"><el-tag :type="lockStatusType(scope.row.lock_status)">{{ lockStatusText(scope.row.lock_status) }}</el-tag></template>
            </el-table-column>
            <el-table-column label="齐套" width="92" align="center" class-name="narrow-col" header-class-name="narrow-col">
              <template slot-scope="scope"><el-tag :type="readinessStatusType(scope.row.readiness_status_code)">{{ readinessStatusText(scope.row.readiness_status_code, scope.row.readiness_status_text) }}</el-tag></template>
            </el-table-column>
            <el-table-column label="风险" width="88" align="center" class-name="narrow-col" header-class-name="narrow-col">
              <template slot-scope="scope">
                <el-badge v-if="hasLockRisk(scope.row)" is-dot type="danger"><span style="font-size:12px;color:#F56C6C;">风险</span></el-badge>
                <span v-else style="font-size:12px;color:#67C23A;">正常</span>
              </template>
            </el-table-column>
          </el-table-column>
          <el-table-column label="操作" width="118" align="center">
            <template slot-scope="scope">
              <div class="op-actions">
                <el-button class="op-main-btn" size="mini" :disabled="isReadinessBlocked(scope.row)" @click="handleConfirmSchedule(scope.row)">确认</el-button>
                <el-dropdown size="mini" trigger="click" @command="handleOrderActionCommand">
                  <el-button class="op-more-btn" size="mini" :disabled="Number(scope.row.remaining_qty) <= 0">更多<i class="el-icon-arrow-down el-icon--right" /></el-button>
                  <el-dropdown-menu slot="dropdown">
                    <el-dropdown-item :command="{ action: 'stock', row: scope.row }">选库存</el-dropdown-item>
                    <el-dropdown-item :command="{ action: 'coating', row: scope.row }">计算涂布</el-dropdown-item>
                    <el-dropdown-item :command="{ action: 'directReport', row: scope.row }">直接报工</el-dropdown-item>
                    <el-dropdown-item :command="{ action: 'materialIssue', row: scope.row }">领料登记</el-dropdown-item>
                    <el-dropdown-item :command="{ action: 'urgentPreempt', row: scope.row }">急单插单抢料</el-dropdown-item>
                    <el-dropdown-item :command="{ action: 'reset', row: scope.row }" divided>清空单行数据</el-dropdown-item>
                  </el-dropdown-menu>
                </el-dropdown>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>
      <div class="pagination-container" style="text-align: right;">
        <el-pagination :current-page="pendingPage" :page-size="pendingPageSize" :page-sizes="pageSizes" layout="total, sizes, prev, pager, next, jumper" :total="pendingTotal" @size-change="handlePendingSizeChange" @current-change="handlePendingPageChange" />
      </div>
    </el-card>

    <!-- 库存选择对话框 -->
    <el-dialog title="选择库存（先进先出）" :visible.sync="stockDialogVisible" width="80%" @close="handleStockDialogClose">
      <div v-if="stockMatchResult">
        <el-alert :type="stockMatchResult.isSufficient ? 'success' : 'warning'" :closable="false" show-icon style="margin-bottom:15px">
          <span slot="title">需求数量: <strong>{{ stockMatchResult.requiredQty }}</strong> 卷 | 需求面积: <strong>{{ stockMatchResult.requiredArea }}</strong> ㎡ | 库存可用: <strong>{{ stockMatchResult.totalAvailableArea }}</strong> ㎡ | {{ stockMatchResult.isSufficient ? '✓ 库存充足' : `⚠ 缺口 ${stockMatchResult.shortage} 卷，需要涂布` }}</span>
        </el-alert>
        <div class="stock-spec-tip">需求规格：{{ stockMatchResult.specText }} ｜ 卷数：{{ stockMatchResult.requiredQty }} ｜ 平米数：{{ stockMatchResult.requiredArea }}㎡</div>
        <div style="margin-bottom:15px;"><el-switch v-model="includeReturnWarehouse" /><span style="margin-left:8px;">是否含退货专仓库存</span></div>
        <el-form :inline="true" class="stock-scan-form">
          <el-form-item label="批量扫码"><el-input v-model="stockScanCodes" type="textarea" :rows="2" placeholder="扫码批次号/二维码（换行、逗号或空格分隔）" style="width:420px" /></el-form-item>
          <el-form-item><el-button type="primary" size="mini" @click="applyStockScanSelection">匹配并分配</el-button><el-button size="mini" @click="clearStockScan">清空</el-button></el-form-item>
        </el-form>
        <el-table ref="stockTable" :data="stockMatchResult.stockList" border @selection-change="handleStockSelection">
          <el-table-column type="selection" width="50" />
          <el-table-column prop="batch_no" label="批次号" width="140" />
          <el-table-column prop="location" label="库位" width="100" />
          <el-table-column prop="prod_date" label="生产日期" width="110" />
          <el-table-column prop="spec_desc" label="规格" width="140" />
          <el-table-column prop="available_rolls" label="可用卷数" width="100" align="right" />
          <el-table-column prop="available_area" label="可用面积(㎡)" width="120" align="right"><template slot-scope="scope">{{ parseFloat(scope.row.available_area).toFixed(2) }}</template></el-table-column>
          <el-table-column label="分配面积(㎡)" width="140" align="center"><template slot-scope="scope"><el-input-number v-model="scope.row.allocate_area" :min="0" :max="Number(scope.row.available_area)" :step="0.01" :precision="2" size="small" controls-position="right" /></template></el-table-column>
        </el-table>
      </div>
      <div slot="footer"><el-button @click="stockDialogVisible = false">取消</el-button><el-button type="primary" @click="handleConfirmStockAllocation">确认分配并创建复卷排程</el-button></div>
    </el-dialog>

    <!-- 涂布需求计算对话框 -->
    <el-dialog title="涂布需求计算" :visible.sync="coatingDialogVisible" width="60%">
      <div v-if="coatingRequirement">
        <div style="margin-bottom:10px;color:#303133;font-weight:600;">当前排程料号：{{ (currentOrder && currentOrder.material_code) || coatingRequirement.material_code || '-' }}</div>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="匹配前缀">{{ coatingRequirement.material_prefix }}</el-descriptions-item>
          <el-descriptions-item label="厚度">{{ coatingRequirement.thickness }} μm</el-descriptions-item>
          <el-descriptions-item label="聚合订单总需求">{{ coatingRequirement.total_required_qty }} 卷</el-descriptions-item>
          <el-descriptions-item label="计算涂布面积"><el-tag type="success" size="medium">{{ parseFloat(coatingRequirement.total_required_area).toFixed(2) }} ㎡</el-tag></el-descriptions-item>
        </el-descriptions>
        <el-divider />
        <el-form :model="coatingForm" label-width="120px">
          <el-form-item label="涂布面积(㎡)"><el-input-number v-model="coatingForm.coatingArea" :min="0" :max="999999" :step="100" controls-position="right" @change="handlePlannedAreaChange" /><span style="margin-left:10px;color:#909399">（可手动调整）</span></el-form-item>
          <el-form-item label="备注"><el-input v-model="coatingForm.remark" type="textarea" :rows="2" placeholder="输入备注信息" /></el-form-item>
        </el-form>
        <el-divider />
        <div style="margin-bottom:8px;color:#606266;font-weight:500;">计划面积覆盖明细（按优先级）</div>
        <el-table :data="coatingRequirement.details || []" border size="mini" max-height="260">
          <el-table-column prop="sort_no" label="#" width="50" align="center" />
          <el-table-column label="订单号" width="140"><template slot-scope="scope"><el-button type="text" @click="handleOrderNoClick(scope.row)">{{ scope.row.order_no || '-' }}</el-button></template></el-table-column>
          <el-table-column prop="priority_score" label="优先级" width="80" align="right" />
          <el-table-column prop="remaining_area" label="订单待涂布(㎡)" width="130" align="right"><template slot-scope="scope">{{ Number(scope.row.remaining_area || 0).toFixed(2) }}</template></el-table-column>
          <el-table-column prop="included_area" label="纳入面积(㎡)" width="130" align="right"><template slot-scope="scope">{{ Number(scope.row.included_area || 0).toFixed(2) }}</template></el-table-column>
          <el-table-column label="是否纳入" width="90" align="center"><template slot-scope="scope"><el-switch v-model="scope.row._selected" active-color="#13ce66" inactive-color="#dcdfe6" @change="handleCoatingIncludeToggle" /></template></el-table-column>
        </el-table>
      </div>
      <div slot="footer"><el-button @click="coatingDialogVisible = false">取消</el-button><el-button type="primary" @click="handleSaveCoatingRequirement">保存到涂布排程</el-button></div>
    </el-dialog>

    <!-- 备注编辑对话框 -->
    <el-dialog title="编辑备注" :visible.sync="remarkDialogVisible" width="600px" @close="handleRemarkDialogClose">
      <div v-if="selectedRow">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="订单号">{{ selectedRow.order_no }}</el-descriptions-item>
          <el-descriptions-item label="产品">{{ selectedRow.material_name }} ({{ selectedRow.material_code }})</el-descriptions-item>
          <el-descriptions-item label="排程数量">{{ selectedRow.schedule_qty }} 卷</el-descriptions-item>
        </el-descriptions>
        <el-divider />
        <el-form :model="selectedRow" label-width="80px"><el-form-item label="备注"><el-input v-model="selectedRow.remark" type="textarea" :rows="4" placeholder="输入备注信息" /></el-form-item></el-form>
      </div>
      <div slot="footer"><el-button @click="remarkDialogVisible = false">取消</el-button><el-button type="primary" @click="handleSaveRemark">保存备注</el-button></div>
    </el-dialog>

    <!-- 报工/领料/订单预览等共享对话框 -->
    <el-dialog :title="workReportDialogTitle" :visible.sync="workReportDialogVisible" width="860px" @close="handleWorkReportDialogClose">
      <el-form :model="workReportForm" label-width="90px" inline>
        <el-form-item label="扫码明细"><el-input v-model="workReportScanCode" size="small" placeholder="扫码派工明细二维码" style="width:220px" @keyup.enter.native="applyWorkReportScan" /><el-button size="small" style="margin-left:6px" @click="applyWorkReportScan">匹配</el-button></el-form-item>
        <el-form-item label="明细号"><el-input v-model="workReportForm.orderDetailId" size="small" style="width:140px" disabled /></el-form-item>
        <el-form-item label="开始时间"><el-date-picker v-model="workReportForm.startTime" type="datetime" size="small" format="yyyy-MM-dd HH:mm:ss" value-format="yyyy-MM-dd HH:mm:ss" placeholder="选择开始时间" /></el-form-item>
        <el-form-item label="结束时间"><el-date-picker v-model="workReportForm.endTime" type="datetime" size="small" format="yyyy-MM-dd HH:mm:ss" value-format="yyyy-MM-dd HH:mm:ss" placeholder="选择结束时间" /></el-form-item>
        <el-form-item label="生产数量"><el-input-number v-model="workReportForm.producedQty" :min="0.01" :step="1" :precision="2" size="small" controls-position="right" /><span v-if="workReportRemainingQtyHint >= 0" style="margin-left:8px;color:#909399;">剩余可报：{{ workReportRemainingQtyHint }}</span></el-form-item>
        <el-form-item label="操作人"><el-input v-model="workReportForm.operator" size="small" placeholder="请输入操作人" style="width:140px" /></el-form-item>
        <el-form-item label="下工序"><el-switch v-model="workReportForm.proceedNextProcess" active-text="继续" inactive-text="不继续" /></el-form-item>
      </el-form>
      <el-form :model="workReportForm" label-width="90px"><el-form-item label="备注"><el-input v-model="workReportForm.remark" type="textarea" :rows="2" placeholder="选填" /></el-form-item></el-form>
      <div style="margin-bottom:8px;font-weight:600;">历史报工</div>
      <el-table v-loading="workReportLoading" :data="workReportList" border size="mini" max-height="280">
        <el-table-column type="index" label="#" width="50" align="center" />
        <el-table-column prop="start_time" label="开始时间" width="140"><template slot-scope="scope">{{ formatDateTime(scope.row.start_time) }}</template></el-table-column>
        <el-table-column prop="end_time" label="结束时间" width="140"><template slot-scope="scope">{{ formatDateTime(scope.row.end_time) }}</template></el-table-column>
        <el-table-column prop="produced_qty" label="生产数量" width="110" align="right" />
        <el-table-column prop="produced_roll_count" label="母卷条数" width="90" align="right" />
        <el-table-column prop="material_issue_count" label="领料条数" width="90" align="right" />
        <el-table-column label="生产面积(㎡)" width="120" align="right"><template slot-scope="scope">{{ formatArea(computeWorkReportArea(scope.row)) }}</template></el-table-column>
        <el-table-column prop="operator_name" label="操作人" width="120" />
        <el-table-column label="下工序" width="90" align="center"><template slot-scope="scope"><el-tag :type="Number(scope.row.proceed_next_process || 0) === 1 ? 'success' : 'warning'" size="mini">{{ Number(scope.row.proceed_next_process || 0) === 1 ? '继续' : '不继续' }}</el-tag></template></el-table-column>
        <el-table-column label="操作" width="120" align="center"><template slot-scope="scope"><el-button type="text" size="mini" @click="editWorkReportRow(scope.row)">修改</el-button><el-button type="text" size="mini" style="color:#F56C6C" @click="deleteWorkReportRow(scope.row)">删除</el-button></template></el-table-column>
        <el-table-column prop="remark" label="备注" min-width="180" show-overflow-tooltip />
        <el-table-column prop="created_at" label="录入时间" width="140"><template slot-scope="scope">{{ formatDateTime(scope.row.created_at) }}</template></el-table-column>
      </el-table>
      <div slot="footer"><el-button @click="workReportDialogVisible = false">取消</el-button><el-button type="primary" :loading="workReportSubmitting" @click="submitWorkReport">提交报工</el-button></div>
    </el-dialog>

    <!-- 领料登记对话框 -->
    <el-dialog title="工序领料登记" :visible.sync="materialIssueDialogVisible" width="900px" @close="handleMaterialIssueDialogClose">
      <el-form :model="materialIssueForm" label-width="90px" inline>
        <el-form-item label="工序"><el-select v-model="materialIssueForm.processType" size="small" style="width:140px" @change="handleMaterialIssueProcessTypeChange"><el-option label="涂布" value="COATING" /><el-option label="复卷" value="REWINDING" /><el-option label="分切" value="SLITTING" /></el-select></el-form-item>
        <el-form-item label="操作人"><el-input v-model="materialIssueForm.operator" size="small" placeholder="请输入操作人" style="width:160px" /></el-form-item>
      </el-form>
      <el-form :model="materialIssueForm" label-width="90px"><el-form-item label="备注"><el-input v-model="materialIssueForm.remark" type="textarea" :rows="2" placeholder="选填" /></el-form-item></el-form>
      <div style="margin-bottom:8px;"><el-button v-if="materialIssueForm.processType === 'COATING'" size="mini" type="success" plain :loading="materialIssueBOMLoading" @click="loadCoatingBomMaterialTemplate">按BOM带出</el-button><el-button size="mini" type="primary" plain @click="addMaterialIssueRow">新增一行</el-button></div>
      <el-table :data="materialIssueForm.materialIssues" border size="mini" max-height="220">
        <el-table-column label="物料类型" width="110"><template slot-scope="scope"><el-select v-model="scope.row.materialType" size="mini" style="width:96px" @change="val => handleMaterialIssueTypeChange(scope.row, val)"><el-option label="原料" value="原料" /><el-option label="薄膜" value="薄膜" /><el-option label="母卷" value="母卷" /></el-select></template></el-table-column>
        <el-table-column label="物料编码" min-width="150"><template slot-scope="scope"><el-input v-model="scope.row.materialCode" size="mini" placeholder="必填" /><div v-if="scope.row.materialName" style="font-size:12px;color:#909399;margin-top:2px;">{{ scope.row.materialName }}</div></template></el-table-column>
        <el-table-column label="库存ID" width="88"><template slot-scope="scope"><el-input-number v-model="scope.row.stockId" size="mini" :min="1" :controls="false" /></template></el-table-column>
        <el-table-column label="卷码/批次" min-width="120"><template slot-scope="scope"><el-select v-model="scope.row.rollCode" size="mini" filterable clearable allow-create default-first-option placeholder="可输入或选择" @change="val => handleMaterialIssueBatchChange(scope.row, val)"><el-option v-for="(opt, idx) in (scope.row.batchOptions || [])" :key="`${idx}-${opt.batchNo || ''}`" :label="formatMaterialIssueBatchLabel(opt)" :value="opt.batchNo" /></el-select></template></el-table-column>
        <el-table-column label="计划数量" width="110"><template slot-scope="scope"><el-input-number v-model="scope.row.planArea" size="mini" :min="0" :step="0.01" :precision="2" :controls="false" /></template></el-table-column>
        <el-table-column label="实际数量" width="110"><template slot-scope="scope"><el-input-number v-model="scope.row.actualArea" size="mini" :min="0" :step="0.01" :precision="2" :controls="false" /></template></el-table-column>
        <el-table-column label="损耗数量" width="110"><template slot-scope="scope"><el-input-number v-model="scope.row.lossArea" size="mini" :min="0" :step="0.01" :precision="2" :controls="false" /></template></el-table-column>
        <el-table-column label="单位" width="70" align="center"><template slot-scope="scope"><span>{{ scope.row.unit || (materialIssueForm.processType === 'COATING' ? 'kg' : '㎡') }}</span></template></el-table-column>
        <el-table-column label="操作" width="70" align="center"><template slot-scope="scope"><el-button type="text" style="color:#F56C6C" @click="removeMaterialIssueRow(scope.$index)">删除</el-button></template></el-table-column>
      </el-table>
      <div style="margin:10px 0 8px;font-weight:600;">历史领料</div>
      <el-table v-loading="materialIssueLoading" :data="materialIssueList" border size="mini" max-height="220">
        <el-table-column prop="material_type" label="物料类型" width="96" />
        <el-table-column prop="material_code" label="物料编码" min-width="130" />
        <el-table-column prop="stock_id" label="库存ID" width="88" />
        <el-table-column prop="roll_code" label="卷码" width="120" />
        <el-table-column prop="plan_area" label="计划数量" width="88" align="right" />
        <el-table-column prop="actual_area" label="实际数量" width="88" align="right" />
        <el-table-column prop="loss_area" label="损耗数量" width="88" align="right" />
        <el-table-column prop="operator_name" label="操作人" width="88" />
        <el-table-column prop="issue_time" label="领料时间" width="170" />
      </el-table>
      <div slot="footer"><el-button @click="materialIssueDialogVisible = false">取消</el-button><el-button type="primary" :loading="materialIssueSubmitting" @click="submitMaterialIssue">提交领料</el-button></div>
    </el-dialog>

    <!-- 订单生产详情对话框 -->
    <el-dialog title="订单生产详情" :visible.sync="orderInfoDialogVisible" width="820px" top="5vh" append-to-body custom-class="order-info-preview-dialog">
      <div v-loading="orderDetailLoading" class="order-detail-preview" style="padding:10px;">
        <div v-if="orderDetailInfo">
          <div class="print-header" style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;">
            <div style="flex:1;text-align:center;padding-left:90px;">
              <div style="font-size:18px;font-weight:bold;color:#000;">东莞市方恩电子材料科技有限公司</div>
              <div style="margin:4px 0;"><span style="font-size:20px;font-weight:bold;letter-spacing:4px;">生 产 指 令 单</span><div style="font-size:12px;font-weight:normal;margin-top:-2px;">(包装)</div></div>
            </div>
            <div class="order-qr-code" style="text-align:center;width:90px;">
              <div style="border:1px solid #000;padding:1px;width:72px;height:72px;display:flex;align-items:center;justify-content:center;margin:0 auto;"><img v-if="orderQrCode" :src="orderQrCode" style="width:68px;height:68px;" /><div v-else style="font-size:10px;color:#999;">生成中...</div></div>
              <div style="font-size:11px;margin-top:2px;color:#000;font-weight:bold;">{{ orderDetailInfo.orderNo }}</div>
            </div>
          </div>
          <table class="order-meta-table" style="width:100%;border-collapse:collapse;margin-bottom:10px;table-layout:fixed;">
            <tr><td style="border:1px solid #000;padding:4px 8px;font-size:13px;"><strong>订单号：</strong>{{ orderDetailInfo.orderNo }}</td><td style="border:1px solid #000;padding:4px 8px;font-size:13px;"><strong>客户代码：</strong>{{ orderDetailInfo.customerCode || '-' }}</td><td style="border:1px solid #000;padding:4px 8px;font-size:13px;"><strong>制单人：</strong>{{ orderDetailInfo.createBy || '-' }}</td></tr>
            <tr><td style="border:1px solid #000;padding:4px 8px;font-size:13px;"><strong>下单日期：</strong>{{ orderDetailInfo.orderDate || '-' }}</td><td style="border:1px solid #000;padding:4px 8px;font-size:13px;"><strong>交货日期：</strong>{{ orderDetailInfo.deliveryDate || '-' }}</td><td style="border:1px solid #000;padding:4px 8px;font-size:13px;"><strong>打印时间：</strong>{{ parseTime(new Date(), '{y}-{m}-{d} {h}:{i}') }}</td></tr>
          </table>
          <div class="remark-section" style="margin-bottom:10px;border:1px solid #000;padding:6px 8px;min-height:40px;"><div style="font-weight:bold;margin-bottom:3px;font-size:13px;">备注：</div><div style="font-size:13px;white-space:pre-wrap;">{{ orderDetailInfo.remark || '无' }}</div></div>
          <el-table :data="orderDetailInfo.items || []" border size="mini" stripe header-cell-style="background-color:#f5f7fa;color:#333;font-weight:bold;border-color:#000;padding:2px 0;" cell-style="border-color:#000;padding:2px 0;">
            <el-table-column type="index" label="序号" width="45" align="center" />
            <el-table-column prop="materialCode" label="产品编码 (含颜色)" min-width="150" show-overflow-tooltip />
            <el-table-column prop="materialName" label="产品名称" min-width="120" show-overflow-tooltip />
            <el-table-column label="产品规格" min-width="140" show-overflow-tooltip><template slot-scope="{row}">{{ formatItemSpec(row) }}</template></el-table-column>
            <el-table-column prop="rolls" label="订单数量" width="80" align="center" />
            <el-table-column prop="sqm" label="平方数/㎡" width="90" align="center"><template slot-scope="{row}">{{ Number(row.sqm || 0).toFixed(2) }}</template></el-table-column>
            <el-table-column label="明细码" width="90" align="center"><template slot-scope="{row}"><div style="font-size:11px;font-weight:bold;">{{ row.id || row.detailId }}</div></template></el-table-column>
          </el-table>
        </div>
        <div v-else-if="!orderDetailLoading" style="text-align:center;padding:60px 0;"><i class="el-icon-document" style="font-size:40px;color:#C0C4CC;margin-bottom:15px;"></i><div style="color:#909399;">未获取到订单详情数据</div></div>
      </div>
      <div slot="footer"><el-button type="primary" @click="orderInfoDialogVisible = false">确 定</el-button></div>
    </el-dialog>
  </div>
</template>

<script>
import manualScheduleMixin from './manualScheduleMixin'
import { getPendingOrders, getCoatingCompletedOrders, getCoatingSchedules, getSlittingSchedules } from '@/api/manualSchedule'
import uiConfig from '@/config/ui'

export default {
  name: 'OrderSchedule',
  mixins: [manualScheduleMixin],
  filters: {
    formatDate(val) {
      if (!val) return '-'
      const text = String(val).trim().replace(/\//g, '-')
      const datePart = text.length >= 10 ? text.substring(0, 10) : text
      const parts = datePart.split('-')
      if (parts.length >= 3) { const mm = String(parts[1] || '').padStart(2, '0'); const dd = String(parts[2] || '').padStart(2, '0'); return `${mm}-${dd}` }
      return datePart
    }
  },
  data() {
    return {
      loading: false,
      orderList: [],
      pendingPage: 1,
      pendingPageSize: uiConfig.defaultPageSize,
      pendingTotal: 0,
      pendingRawList: [],
      pendingMaterialOweArea: 0,
      pendingQuery: { materialCode: '' },
      pendingSelectionMap: {},
      pendingManualOffMap: {},
      pendingRowCache: {},
      pendingSelectionSyncing: false,
      pendingDailyAreaTarget: 70000,
      pendingDefaultSelectionInited: false,
      showCompletedRows: false,
      pendingSort: { prop: 'priority_score', order: 'descending' },
      orderSpanData: [],
      // 库存选择
      stockDialogVisible: false,
      stockMatchResult: null,
      selectedStocks: [],
      stockScanCodes: '',
      currentOrder: null,
      includeReturnWarehouse: false,
      // 涂布计算
      coatingDialogVisible: false,
      coatingRequirement: null,
      coatingForm: { coatingArea: 24000, remark: '' },
      // 备注
      remarkDialogVisible: false,
      selectedRow: null,
      // 高亮
      highlightCoatingScheduleId: null,
      highlightCoatingTimer: null,
      highlightRewindingDetailId: null,
      highlightRewindingScheduleId: null,
      highlightRewindingTimer: null,
      highlightSlittingDetailId: null,
      highlightSlittingTimer: null
    }
  },
  computed: {
    pendingSelectedStats() {
      let rolls = 0; let area = 0
      const map = this.pendingSelectionMap || {}
      const cache = this.pendingRowCache || {}
      Object.keys(map).forEach(id => {
        if (!map[id]) return
        const row = cache[id]; if (!row) return
        const qty = this.getPlannedQtyByRow(row); const sqm = this.getPlannedAreaByRow(row)
        if (qty > 0) rolls += qty
        if (sqm > 0) area += sqm
      })
      return { rolls, area: Number(area.toFixed(2)) }
    },
    pendingLockRiskSummary() {
      const list = this.orderList || []; let riskRows = 0; let riskArea = 0
      list.forEach(row => { const unlocked = Number(row.unlocked_area || 0); if (unlocked > 0) { riskRows += 1; riskArea += unlocked } })
      return { riskRows, riskArea: Number(riskArea.toFixed(2)) }
    },
    workReportRemainingQtyHint() {
      const planned = Number(this.workReportPlannedQty || 0); if (!(planned > 0)) return -1
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
  },
  methods: {
    syncActiveTableLayout() { this.doTableLayout('pendingTable') },
    pendingRowKey(row) { return String(row.order_detail_id || row.id || '') },
    getPlannedQtyByRow(row) {
      if (!row) return 0
      const maxQty = Number(row.remaining_qty || 0)
      let qty = Number(row.schedule_qty || 0)
      if (!Number.isFinite(qty) || qty < 0) qty = 0
      if (Number.isFinite(maxQty)) qty = Math.min(qty, Math.max(0, maxQty))
      return Math.round(qty)
    },
    getPlannedAreaByRow(row) {
      if (!row) return 0
      const qty = this.getPlannedQtyByRow(row)
      const width = Number(row.width || 0); const length = Number(row.length || 0)
      if (qty <= 0 || width <= 0 || length <= 0) return 0
      return (width / 1000) * length * qty
    },
    getCurrentSelectedArea() { return Number((this.pendingSelectedStats && this.pendingSelectedStats.area) || 0) },
    syncPendingSelectionToTable() {
      this.$nextTick(() => {
        const table = this.$refs.pendingTable; if (!table || !Array.isArray(this.orderList)) return
        this.pendingSelectionSyncing = true; table.clearSelection()
        this.orderList.forEach(row => { const id = this.pendingRowKey(row); if (this.pendingSelectionMap[id]) table.toggleRowSelection(row, true) })
        this.$nextTick(() => { this.pendingSelectionSyncing = false })
      })
    },
    autoSelectPendingRowsByDailyTarget() {
      let remain = Number(this.pendingDailyAreaTarget || 70000) - this.getCurrentSelectedArea()
      if (remain <= 0) { this.syncPendingSelectionToTable(); return }
      (this.orderList || []).forEach(row => {
        if (remain <= 0) return
        const id = this.pendingRowKey(row); if (!id) return
        if (this.pendingSelectionMap[id]) return
        if (this.pendingManualOffMap[id]) return
        const area = this.getPlannedAreaByRow(row); const qty = this.getPlannedQtyByRow(row)
        if (qty <= 0 || area <= 0) return
        this.$set(this.pendingSelectionMap, id, true)
        remain -= area
      })
      this.syncPendingSelectionToTable()
    },
    handlePendingSelectionChange(selection) {
      if (this.pendingSelectionSyncing) return
      const selectedIds = new Set((selection || []).map(row => this.pendingRowKey(row)))
      ;(this.orderList || []).forEach(row => {
        const id = this.pendingRowKey(row); if (!id) return
        const checked = selectedIds.has(id); this.$set(this.pendingSelectionMap, id, checked)
        if (checked) { if (this.pendingManualOffMap[id]) this.$delete(this.pendingManualOffMap, id) }
        else this.$set(this.pendingManualOffMap, id, true)
      })
    },
    getSelectedPendingRows() {
      const map = this.pendingSelectionMap || {}; const cache = this.pendingRowCache || {}
      return Object.keys(map).filter(id => !!map[id]).map(id => cache[id]).filter(Boolean)
    },
    calculateOrderSpans() {
      const spans = []; let currentOrderNo = null; let count = 0; let startIndex = 0
      this.orderList.forEach((row, index) => {
        const orderNo = row.order_no || ''
        if (orderNo !== currentOrderNo) { if (currentOrderNo !== null) { spans[startIndex] = count; for (let i = startIndex + 1; i < index; i++) spans[i] = 0 }; currentOrderNo = orderNo; count = 1; startIndex = index }
        else count++
      })
      if (currentOrderNo !== null) { spans[startIndex] = count; for (let i = startIndex + 1; i < this.orderList.length; i++) spans[i] = 0 }
      this.orderSpanData = spans
    },
    orderListSpanMethod({ row, column, rowIndex, columnIndex }) { if (columnIndex === 1 || columnIndex === 2) { const span = this.orderSpanData[rowIndex]; if (span !== undefined) return { rowspan: span, colspan: span > 0 ? 1 : 0 } } },
    triggerWorkReportRefresh() { this.loadWorkReportList(); this.loadOrders() },

    // ========== 工序跳转 ==========
    canJumpToRewinding(row) {
      const routeType = this.getRouteType(row); if (routeType === 'COATING_SHIP') return false
      const scheduleId = Number((row && row.schedule_id) || 0); const coveredByActiveCoating = Number((row && row.covered_by_active_coating) || 0) > 0
      if (scheduleId <= 0 && !coveredByActiveCoating) return false
      const s = String((row && (row.schedule_status || row.status)) || '').toUpperCase(); if (s === 'TERMINATED' || s === 'CANCELLED') return false
      if (s === 'COATING_SCHEDULED' || s === 'REWINDING_SCHEDULED') return true
      return !!(row && row.coating_date)
    },
    canJumpToSlitting(row) {
      const routeType = this.getRouteType(row); if (routeType !== 'SLITTING_SHIP') return false
      const scheduleId = Number((row && row.schedule_id) || 0); if (scheduleId <= 0) return false
      const s = String((row && (row.schedule_status || row.status)) || '').toUpperCase(); if (s === 'TERMINATED' || s === 'CANCELLED') return false
      if (s === 'REWINDING_SCHEDULED' || s === 'CONFIRMED') return true
      return !!(row && row.rewinding_date)
    },
    isRowTerminated(row) { const s = String((row && (row.schedule_status || row.status)) || '').toUpperCase(); return s === 'TERMINATED' || s === 'CANCELLED' },
    handleCoatingDateFocus(row) { if (!row || String(row.schedule_type || '').toUpperCase() === 'STOCK') return; this.handleCalculateCoating(row) },

    handleRewindingDateFocus(row) {
      if (!row) return
      if (!this.canJumpToRewinding(row)) { this.$message.warning('当前订单尚未进入可复卷阶段，请先完成有效涂布排程'); return }
      const detailId = Number(row.order_detail_id || 0); if (!detailId) return
      this.$message.info('请切换到复卷排程页面查看该订单')
      // 触发跳转事件
      window.dispatchEvent(new CustomEvent('schedule:jumpToRewinding', { detail: { orderDetailId: detailId, sourceRow: row } }))
    },
    handlePackagingDateFocus(row) {
      if (!row) return
      if (!this.canJumpToSlitting(row)) { this.$message.warning('当前订单尚未进入可分切阶段，请先完成复卷排程'); return }
      const detailId = Number(row.order_detail_id || 0); if (!detailId) return
      this.$message.info('请切换到分切排程页面查看该订单')
      window.dispatchEvent(new CustomEvent('schedule:jumpToSlitting', { detail: { orderDetailId: detailId } }))
    },

    // ========== 加载订单 ==========
    async loadOrders() {
      this.loading = true
      try {
        await this.loadPendingOweAreaSummary()
        const res = await getPendingOrders({ current: this.pendingPage, size: this.pendingPageSize, includeCompleted: this.showCompletedRows, materialCode: (this.pendingQuery.materialCode || '').trim() })
        if (res.code === 200 || res.code === 20000) {
          const pageData = res.data || {}; const records = pageData.records || pageData.list || []
          this.pendingTotal = Number(pageData.total || 0)
          const mapped = records.map(item => {
            const width = Number(item.width || 0); const length = Number(item.length || 0)
            const singleArea = width > 0 && length > 0 ? (width / 1000) * length : 0
            const orderQty = Number(item.order_qty || 0); const remainingQty = Number(item.remaining_qty || 0)
            const plannedQty = Math.max(0, Math.min(orderQty, remainingQty))
            const completedQty = this.getReportedCompletedQty(item); const routeType = this.getRouteType(item)
            const row = { ...item, schedule_id: item.schedule_id, schedule_type: item.schedule_type, route_type: routeType, schedule_qty: plannedQty, coating_date: item.coating_date || '', rewinding_date: item.rewinding_date || '', packaging_date: item.packaging_date || '', remark: item.remark || item.order_remark || '', order_remark: item.order_remark || '', single_area: singleArea.toFixed(2), production_area: (singleArea * plannedQty).toFixed(2), owe_area: (singleArea * remainingQty).toFixed(2), locked_area_total: Number(item.locked_area_total || 0), unlocked_area: Number(item.unlocked_area || 0), lock_status: item.lock_status || 'UNLOCKED', readiness_status_code: String(item.readiness_status_code || '').toUpperCase() || 'UNKNOWN', readiness_status_text: item.readiness_status_text || '', completed_qty: Number(completedQty.toFixed(2)), priority_score: Number(item.priority_score || 0).toFixed(1) }
            row.is_completed = this.calcProductionCompleted(row) ? 'Y' : 'N'
            return row
          })
          const enrichedMapped = await this.enrichMaterialNamesFromSpec(mapped)
          const visibleMapped = this.showCompletedRows ? enrichedMapped : enrichedMapped.filter(row => !this.calcProductionCompleted(row))
          const visibleIdSet = new Set()
          visibleMapped.forEach(row => { const id = this.pendingRowKey(row); if (!id) return; visibleIdSet.add(id); this.$set(this.pendingRowCache, id, row) })
          if (!this.showCompletedRows) { Object.keys(this.pendingSelectionMap || {}).forEach(id => { if (!visibleIdSet.has(id)) this.$delete(this.pendingSelectionMap, id) }) }
          this.pendingRawList = visibleMapped; this.orderList = visibleMapped; this.calculateOrderSpans()
          if (!this.pendingDefaultSelectionInited) { this.pendingDefaultSelectionInited = true; this.autoSelectPendingRowsByDailyTarget() }
          else this.syncPendingSelectionToTable()
        }
      } catch (error) { this.$message.error('加载订单失败') }
      finally { this.loading = false }
    },
    async loadPendingOweAreaSummary() {
      const materialCode = String((this.pendingQuery && this.pendingQuery.materialCode) || '').trim(); if (!materialCode) { this.pendingMaterialOweArea = 0; return }
      try { const res = await getPendingOrdersOweArea({ materialCode }); if (res.code === 200 || res.code === 20000) this.pendingMaterialOweArea = Number(res.data || 0); else this.pendingMaterialOweArea = 0 }
      catch (e) { this.pendingMaterialOweArea = 0 }
    },
    handlePendingSizeChange(size) { this.pendingPageSize = size; this.pendingPage = 1; this.loadOrders() },
    handlePendingPageChange(page) { this.pendingPage = page; this.loadOrders() },
    handlePendingMaterialSearch() { this.pendingPage = 1; this.loadOrders() },
    handlePendingMaterialClear() { this.pendingQuery.materialCode = ''; this.pendingMaterialOweArea = 0; this.pendingPage = 1; this.loadOrders() },
    toggleShowCompletedRows() { this.showCompletedRows = !this.showCompletedRows; this.pendingPage = 1; this.loadOrders() },
    tableRowClassName({ row }) { if (this.calcProductionCompleted(row)) return 'row-scheduled-complete'; return '' },

    // ========== 批量锁料 ==========
    buildAutoStockAllocations(stockList, requiredArea) { let remain = Number(requiredArea || 0); const allocations = []; (stockList || []).forEach(stock => { if (remain <= 0) return; const available = Number(stock.available_area || 0); if (available <= 0) return; const lockArea = Math.min(available, remain); if (lockArea <= 0) return; allocations.push({ stockId: stock.stock_id, area: Number(lockArea.toFixed(2)) }); remain -= lockArea }); return { allocations, shortageArea: Math.max(0, Number(remain.toFixed(2))) } },
    async processStockLockForRow(row) { const scheduleQty = this.getPlannedQtyByRow(row); if (!row || scheduleQty <= 0) return { ok: false, reason: '排程数量无效' }; const matchRes = await matchStock({ materialCode: row.material_code, width: row.width, thickness: row.thickness, requiredQty: scheduleQty, includeReturnWarehouse: false }); if (!(matchRes.code === 200 || matchRes.code === 20000)) return { ok: false, reason: '库存匹配失败' }; const singleArea = (Number(row.width || 0) / 1000) * Number(row.length || 0); const requiredArea = Number((singleArea * scheduleQty).toFixed(2)); const stockList = (matchRes.data && matchRes.data.stockList) || []; const { allocations, shortageArea } = this.buildAutoStockAllocations(stockList, requiredArea); if (requiredArea <= 0 || shortageArea > 0 || allocations.length === 0) return { ok: false, reason: '库存不足' }; const scheduleRes = await createSchedule({ orderNo: row.order_no, orderDetailId: row.order_detail_id, materialCode: row.material_code, materialName: row.material_name, width: row.width, length: row.length, thickness: row.thickness, orderQty: row.order_qty, scheduleQty: scheduleQty, coatingDate: row.coating_date, rewindingDate: row.rewinding_date, packagingDate: row.packaging_date, scheduleType: 'STOCK' }); if (!(scheduleRes.code === 200 || scheduleRes.code === 20000)) return { ok: false, reason: '创建库存排程失败' }; const lockRes = await createRewindingSchedule({ scheduleId: scheduleRes.data, stockAllocations: allocations }); if (!(lockRes.code === 200 || lockRes.code === 20000)) return { ok: false, reason: '库存锁定失败' }; return { ok: true } },
    async handleBatchScanStock() {
      const selectedRows = this.getSelectedPendingRows(); if (!selectedRows.length) { this.$message.warning('请先勾选要参与本次排程的订单'); return }
      this.loading = true; let locked = 0; let insufficient = 0
      try { for (const row of selectedRows) { if (String(row.schedule_type || '').toUpperCase() === 'STOCK') { locked += 1; continue }; try { const r = await this.processStockLockForRow(row); if (r.ok) locked += 1; else insufficient += 1 } catch (e) { insufficient += 1 } }; this.$message.success(`库存扫描完成：够料并锁定 ${locked} 条，不够料 ${insufficient} 条`); await this.loadOrders() }
      finally { this.loading = false }
    },

    // ========== 选库存 ==========
    async handleSelectStock(row) { if (!row.schedule_qty || row.schedule_qty <= 0) row.schedule_qty = Number(row.remaining_qty) || 0; if (row.schedule_qty <= 0) { this.$message.warning('请先输入排程数量'); return }; this.currentOrder = row; this.loading = true; try { const res = await matchStock({ materialCode: row.material_code, width: row.width, thickness: row.thickness, requiredQty: row.schedule_qty, includeReturnWarehouse: this.includeReturnWarehouse }); if (res.code === 200 || res.code === 20000) { this.stockMatchResult = res.data; const singleArea = (Number(row.width || 0) / 1000) * Number(row.length || 0); const requiredArea = singleArea * Number(row.schedule_qty || 0); this.$set(this.stockMatchResult, 'requiredArea', Number(requiredArea.toFixed(2))); this.$set(this.stockMatchResult, 'totalAvailableArea', Number((this.stockMatchResult.totalAvailableArea || 0).toFixed(2))); this.$set(this.stockMatchResult, 'specText', `${row.thickness || ''}μm*${row.width || ''}mm*${row.length || ''}m`); this.stockScanCodes = ''; this.stockMatchResult.stockList.forEach(stock => this.$set(stock, 'allocate_area', 0)); this.autoAllocateStock(this.stockMatchResult.stockList, requiredArea); this.stockDialogVisible = true } } catch (error) { this.$message.error('匹配库存失败') } finally { this.loading = false } },
    handleStockSelection(selection) { this.selectedStocks = selection },
    handleStockDialogClose() { this.stockMatchResult = null; this.selectedStocks = []; this.stockScanCodes = ''; this.currentOrder = null },
    autoAllocateStock(stockList, requiredQty) { let remaining = Number(requiredQty) || 0; stockList.forEach(stock => { const available = Number(stock.available_area || 0); const allocate = remaining > 0 ? Math.min(available, remaining) : 0; this.$set(stock, 'allocate_area', Number(allocate.toFixed(2))); remaining -= allocate }) },
    parseRollCodes(text) { if (!text) return []; return String(text).split(/[\n,，;；\s]+/g).map(s => s && s.trim()).filter(Boolean) },
    syncStockTableSelection(rows) { this.$nextTick(() => { const table = this.$refs.stockTable; if (!table) return; table.clearSelection(); (rows || []).forEach(row => table.toggleRowSelection(row, true)) }) },
    clearStockScan() { this.stockScanCodes = ''; this.selectedStocks = []; this.syncStockTableSelection([]) },
    applyStockScanSelection() {
      const codes = this.parseRollCodes(this.stockScanCodes); if (!codes.length) { this.$message.warning('请先扫码批次号/二维码'); return }
      if (!this.stockMatchResult || !Array.isArray(this.stockMatchResult.stockList)) { this.$message.warning('库存列表为空，无法匹配'); return }
      const normalized = codes.map(c => String(c).trim().toUpperCase()); const unique = Array.from(new Set(normalized)); const list = this.stockMatchResult.stockList; const matched = []
      unique.forEach(code => { const found = list.find(item => { const qr = item.qr_code || item.qrCode; const batch = item.batch_no || item.batchNo; const qrText = qr ? String(qr).trim().toUpperCase() : ''; const batchText = batch ? String(batch).trim().toUpperCase() : ''; return (qrText && qrText === code) || (batchText && batchText === code) }); if (found) matched.push(found) })
      list.forEach(stock => this.$set(stock, 'allocate_area', 0)); let remain = Number(this.stockMatchResult.requiredArea || 0)
      matched.forEach(stock => { if (remain <= 0) return; const available = Number(stock.available_area || 0); const lockArea = Math.min(available, remain); if (lockArea > 0) { this.$set(stock, 'allocate_area', Number(lockArea.toFixed(2))); remain = Math.max(0, remain - lockArea) } })
      this.selectedStocks = matched; this.syncStockTableSelection(matched)
      if (!matched.length) this.$message.warning('未匹配到库存，请检查扫码内容')
      else if (remain > 0) this.$message.warning(`库存匹配成功，但仍有${remain.toFixed(2)}㎡未覆盖`)
      else this.$message.success('批量扫码匹配完成')
    },
    async handleConfirmStockAllocation() {
      const allocations = this.stockMatchResult.stockList.filter(s => s.allocate_area > 0).map(s => ({ stockId: s.stock_id, area: s.allocate_area }))
      const singleArea = (Number(this.currentOrder.width || 0) / 1000) * Number(this.currentOrder.length || 0); const requiredQty = Number(this.currentOrder.schedule_qty || 0); const requiredArea = singleArea * requiredQty
      const totalAllocatedArea = allocations.reduce((sum, a) => sum + a.area, 0)
      if (totalAllocatedArea > requiredArea) { this.$message.warning(`分配面积(${totalAllocatedArea.toFixed(2)})大于需求面积(${requiredArea.toFixed(2)})`); return }
      const shortageArea = Math.max(0, requiredArea - totalAllocatedArea); const shortageQty = singleArea > 0 ? Math.max(0, Math.ceil(shortageArea / singleArea)) : 0
      try {
        if (totalAllocatedArea > 0) { const allocatedQty = singleArea > 0 ? Math.max(1, Math.round(totalAllocatedArea / singleArea)) : 0; const scheduleRes = await createSchedule({ orderNo: this.currentOrder.order_no, orderDetailId: this.currentOrder.order_detail_id, materialCode: this.currentOrder.material_code, materialName: this.currentOrder.material_name, width: this.currentOrder.width, length: this.currentOrder.length, thickness: this.currentOrder.thickness, orderQty: this.currentOrder.order_qty, scheduleQty: allocatedQty, coatingDate: this.currentOrder.coating_date, rewindingDate: this.currentOrder.rewinding_date, packagingDate: this.currentOrder.packaging_date, scheduleType: 'STOCK' }); if (scheduleRes.code !== 200 && scheduleRes.code !== 20000) throw new Error('创建排程失败'); const rewindingRes = await createRewindingSchedule({ scheduleId: scheduleRes.data, stockAllocations: allocations }); if (rewindingRes.code !== 200 && rewindingRes.code !== 20000) throw new Error('复卷排程创建失败') }
        if (shortageArea > 0) { const coatingRes = await createSchedule({ orderNo: this.currentOrder.order_no, orderDetailId: this.currentOrder.order_detail_id, materialCode: this.currentOrder.material_code, materialName: this.currentOrder.material_name, width: this.currentOrder.width, length: this.currentOrder.length, thickness: this.currentOrder.thickness, orderQty: this.currentOrder.order_qty, scheduleQty: shortageQty, coatingArea: Number(shortageArea.toFixed(2)), coatingDate: this.currentOrder.coating_date, rewindingDate: this.currentOrder.rewinding_date, packagingDate: this.currentOrder.packaging_date, scheduleType: 'COATING', remark: `库存不足${shortageQty}卷，自动转涂布` }); if (coatingRes.code !== 200 && coatingRes.code !== 20000) throw new Error('涂布排程创建失败') }
        this.$message.success('分配完成'); this.stockDialogVisible = false; this.loadOrders(); if (shortageArea > 0) this.loadCoatingSchedules()
      } catch (error) { this.$message.error(error.message || '操作失败') }
    },

    // ========== 涂布计算 ==========
    async handleCalculateCoating(row) { if (!row.schedule_qty || row.schedule_qty <= 0) row.schedule_qty = Number(row.remaining_qty) || 0; if (row.schedule_qty <= 0) { this.$message.warning('请先输入排程数量'); return }; this.currentOrder = row; this.loading = true; try { const plannedArea = ((Number(row.width || 0) / 1000) * Number(row.length || 0) * Number(row.schedule_qty || 0)); const res = await calculateCoating({ orderNo: row.order_no, materialCode: row.material_code, plannedArea: Number(plannedArea.toFixed(2)) }); if (res.code === 200 || res.code === 20000) { this.coatingRequirement = res.data; this.coatingForm.coatingArea = Number(plannedArea.toFixed(2)); this.initCoatingSelection(this.coatingRequirement.details); this.syncCoatingSelectionByArea(); this.rebalanceCoatingInclusion(); this.coatingDialogVisible = true } } catch (error) { this.$message.error('计算涂布需求失败') } finally { this.loading = false } },
    initCoatingSelection(details) { if (!Array.isArray(details)) return; details.forEach(item => this.$set(item, '_selected', Number(item.included_flag || 0) === 1)) },
    syncCoatingSelectionByArea() { const details = (this.coatingRequirement && this.coatingRequirement.details) || []; if (!Array.isArray(details)) return; let remain = Number(this.coatingForm.coatingArea || 0); if (!Number.isFinite(remain) || remain < 0) remain = 0; details.forEach(item => { const remainingArea = Number(item.remaining_area || 0); const shouldSelect = remain >= remainingArea && remainingArea > 0; this.$set(item, '_selected', shouldSelect); if (shouldSelect) remain = Math.max(0, remain - remainingArea) }) },
    handleCoatingIncludeToggle() { this.rebalanceCoatingInclusion() },
    rebalanceCoatingInclusion() {
      const details = (this.coatingRequirement && this.coatingRequirement.details) || []; if (!Array.isArray(details)) return
      let remain = Number(this.coatingForm.coatingArea || 0); if (!Number.isFinite(remain) || remain < 0) remain = 0
      details.forEach(item => { const selected = !!item._selected; const remainingArea = Number(item.remaining_area || 0); if (!selected || remain <= 0 || remainingArea <= 0) { this.$set(item, 'included_area', 0); this.$set(item, 'included_flag', 0); if (remain <= 0 || remainingArea <= 0) this.$set(item, '_selected', false); return }; if (remain < remainingArea) { this.$set(item, 'included_area', 0); this.$set(item, 'included_flag', 0); this.$set(item, '_selected', false); return }; const includedArea = remainingArea; this.$set(item, 'included_area', Number(includedArea.toFixed(2))); this.$set(item, 'included_flag', 1); this.$set(item, '_selected', true); remain = Math.max(0, remain - includedArea) })
      this.coatingForm.remark = this.buildCoatingRemark(this.coatingRequirement, this.currentOrder || {})
    },
    buildCoatingRemark(requirementData, currentRow) { const details = (requirementData && requirementData.details) || []; if (!Array.isArray(details) || details.length === 0) return `订单${currentRow.order_no}涂布需求`; const text = details.map(item => { if (Number(item.included_flag || 0) !== 1) return null; const orderNo = item.order_no || '-'; const area = Number(item.included_area || 0).toFixed(2); return `${orderNo}(${area}㎡)` }).filter(Boolean).join('，'); return text ? `本次计划覆盖：${text}` : `订单${currentRow.order_no}涂布需求` },
    async handlePlannedAreaChange() { if (!this.currentOrder) return; this.syncCoatingSelectionByArea(); this.rebalanceCoatingInclusion() },
    async handleSaveCoatingRequirement() {
      try {
        const details = (this.coatingRequirement && this.coatingRequirement.details) || []; const selectedDetails = details.filter(d => Number(d.included_area || 0) > 0)
        if (selectedDetails.length === 0) { this.$message.warning('请至少选择一条要纳入涂布的订单'); return }
        const includedAreaTotal = selectedDetails.reduce((sum, d) => sum + Number(d.included_area || 0), 0)
        const finalCoatingWidth = 1040; const coatingLength = finalCoatingWidth > 0 ? Number((includedAreaTotal / (finalCoatingWidth / 1000)).toFixed(2)) : 0
        const singleArea = (Number(this.currentOrder.width || 0) / 1000) * Number(this.currentOrder.length || 0)
        const currentPlanQty = Number(this.getPlannedQtyByRow(this.currentOrder) || 0)
        const scheduleQty = currentPlanQty > 0 ? currentPlanQty : (singleArea > 0 ? Math.max(1, Math.ceil(includedAreaTotal / singleArea)) : Math.max(1, Number(this.currentOrder.schedule_qty || 1)))
        const scheduleRes = await createSchedule({ orderNo: this.currentOrder.order_no, orderDetailId: this.currentOrder.order_detail_id, materialCode: this.currentOrder.material_code, materialName: this.currentOrder.material_name, width: this.currentOrder.width, length: this.currentOrder.length, thickness: this.currentOrder.thickness, orderQty: this.currentOrder.order_qty, scheduleQty: scheduleQty, coatingArea: Number(includedAreaTotal.toFixed(2)), coatingDate: this.currentOrder.coating_date, rewindingDate: this.currentOrder.rewinding_date, packagingDate: this.currentOrder.packaging_date, coatingWidth: finalCoatingWidth, coatingLength: coatingLength, scheduleType: 'COATING', status: 'PENDING', remark: this.coatingForm.remark })
        if (scheduleRes.code === 200 || scheduleRes.code === 20000) { await saveCoatingAllocation({ scheduleId: scheduleRes.data, details }); this.$message.success('已保存到涂布排程'); this.coatingDialogVisible = false; window.dispatchEvent(new CustomEvent('schedule:jumpToCoating', { detail: { scheduleId: scheduleRes.data } })); await this.loadOrders() }
      } catch (error) { const msg = (error && error.response && error.response.data && (error.response.data.msg || error.response.data.message)) || error.message || '保存失败'; this.$message.error(msg) }
    },

    // ========== 备注 ==========
    handleEditRemark(row) { this.selectedRow = JSON.parse(JSON.stringify(row)); this.remarkDialogVisible = true },
    handleSaveRemark() { if (!this.selectedRow.remark) { this.$message.warning('请输入备注内容'); return }; const index = this.orderList.findIndex(item => item.order_detail_id === this.selectedRow.order_detail_id); if (index > -1) this.orderList[index].remark = this.selectedRow.remark; this.$message.success('备注已保存'); this.remarkDialogVisible = false },
    handleRemarkDialogClose() { this.selectedRow = null },

    // ========== 确认排程 ==========
    handleConfirmSchedule(row) {
      if (this.isReadinessBlocked(row)) { this.$message.warning('当前订单明细处于缺料状态，不能确认排程'); return }
      const unlockedArea = this.getUnlockedArea(row)
      const message = unlockedArea > 0 ? `当前订单仍有 ${unlockedArea.toFixed(2)} ㎡ 未锁定，继续确认后将进入排程流程。是否继续？` : '确认要对该订单进行排程吗？'
      this.$confirm(message, '提示', { confirmButtonText: '确定', cancelButtonText: '取消', type: unlockedArea > 0 ? 'warning' : 'info' }).then(() => {
        confirmSchedule({ orderNo: row.order_no, materialCode: row.material_code, scheduleQty: row.schedule_qty, scheduleId: row.schedule_id, orderDetailId: row.order_detail_id, coatingDate: row.coating_date, rewindingDate: row.rewinding_date, packagingDate: row.packaging_date }).then(res => {
          if (res.code === 200 || res.code === 20000) { this.$message.success('排程确认成功'); this.loadOrders() }
          else this.$message.error(res.message || '排程确认失败')
        }).catch(err => this.$message.error('排程确认失败: ' + (err.message || '未知错误')))
      }).catch(() => this.$message.info('已取消'))
    },

    // ========== 操作命令 ==========
    handleOrderActionCommand(payload) {
      if (!payload || !payload.action) return
      if (payload.action === 'stock') this.handleSelectStock(payload.row)
      else if (payload.action === 'coating') this.handleCalculateCoating(payload.row)
      else if (payload.action === 'directReport') this.openWorkReportDialog(payload.row, this.resolveDefaultReportProcessType(payload.row))
      else if (payload.action === 'materialIssue') this.openMaterialIssueDialog(payload.row)
      else if (payload.action === 'urgentPreempt') this.handleUrgentPreempt(payload.row)
      else if (payload.action === 'reset') this.handleResetSchedule(payload.row)
    },
    async handleUrgentPreempt(row) {
      const orderNo = String((row && row.order_no) || '').trim(); const materialCode = String((row && row.material_code) || '').trim()
      if (!orderNo || !materialCode) { this.$message.warning('缺少订单号或产品编码，无法执行急单抢料'); return }
      let suggestedArea = Number((row && row.unlocked_area) || 0); if (!(suggestedArea > 0)) suggestedArea = Number((row && row.owe_area) || 0); if (!(suggestedArea > 0)) suggestedArea = Number(this.getPlannedAreaByRow(row) || 0); if (!(suggestedArea > 0)) suggestedArea = 1
      try { const prompt = await this.$prompt('请输入急单目标锁定面积（㎡）', '急单插单抢料', { confirmButtonText: '下一步', cancelButtonText: '取消', inputValue: Number(suggestedArea.toFixed(2)), inputPlaceholder: '例如：1200.50', inputPattern: /^\d+(\.\d{1,2})?$/, inputErrorMessage: '请输入大于0的数字（最多2位小数）' }); const requiredArea = Number(prompt.value || 0); if (!(requiredArea > 0)) { this.$message.warning('抢料面积必须大于0'); return }; await this.$confirm(`将优先锁定可用库存，不足部分会从低优先级且未消耗锁定中释放并转给急单。\n订单：${orderNo}\n料号：${materialCode}\n目标面积：${requiredArea.toFixed(2)}㎡`, '确认执行急单抢料', { confirmButtonText: '执行', cancelButtonText: '取消', type: 'warning' }); const res = await urgentLock({ orderNo, materialCode, requiredArea, operator: 'frontend' }); if (res.code === 200 || res.code === 20000) { const result = (res && res.data) || {}; const directLockedArea = Number(result.directLockedArea || 0); const preemptLockedArea = Number(result.preemptLockedArea || 0); const remainArea = Number(result.remainArea || 0); const releasedOrders = Array.isArray(result.releasedOrders) ? result.releasedOrders.filter(Boolean) : []; const releasedText = releasedOrders.length ? releasedOrders.join('、') : '无'; this.$alert(`直锁面积：${directLockedArea.toFixed(2)}㎡\n抢占面积：${preemptLockedArea.toFixed(2)}㎡\n剩余缺口：${remainArea.toFixed(2)}㎡\n被释放订单：${releasedText}`, '急单抢料执行结果', { confirmButtonText: '知道了' }); await this.loadOrders() } else this.$message.error(res.message || '急单抢料失败') }
      catch (error) { if (error !== 'cancel' && !(error && error.message === 'cancel')) this.$message.error(this.parseApiError(error, '急单抢料失败')) }
    },
  }
}
</script>

<style scoped>
@import './manualScheduleShared.scss';
</style>