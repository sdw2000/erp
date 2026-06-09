<template>
  <div class="app-container">
    <el-card v-if="standaloneLabelOnly" shadow="never" class="mb-10">
      <div class="section-head">
        <span style="font-weight: 600;">复卷标签独立打印（无需排程）</span>
      </div>
      <el-form :inline="true" label-width="100px" class="rewinding-label-form mb-10">
        <el-form-item label="母卷号">
          <el-autocomplete
            v-model.trim="reportForm.rewindingMotherRollCode"
            :fetch-suggestions="queryRewindingMotherRollSuggestions"
            placeholder="输入母卷号/料号/品名搜索"
            clearable
            trigger-on-focus
            style="width: 360px"
            @select="handleRewindingMotherRollSelect"
            @blur="resolveRewindingMotherRollInfo"
          />
        </el-form-item>
        <el-form-item>
          <el-button size="small" @click="resolveRewindingMotherRollInfo()">查询母卷</el-button>
        </el-form-item>
      </el-form>

      <el-row class="mb-10" :gutter="16">
        <el-col :span="8"><strong>料号：</strong>{{ (reportForm.rewindingMotherInfo && reportForm.rewindingMotherInfo.materialCode) || '-' }}</el-col>
        <el-col :span="8"><strong>物料名称：</strong>{{ (reportForm.rewindingMotherInfo && (reportForm.rewindingMotherInfo.materialName || reportForm.rewindingMotherInfo.productName)) || '-' }}</el-col>
        <el-col :span="8"><strong>母卷规格：</strong>{{ formatRewindingMotherRollSpec(reportForm.rewindingMotherInfo) }}</el-col>
      </el-row>

      <el-form :inline="true" label-width="100px" class="rewinding-label-form">
        <el-form-item label="复卷人员">
          <el-select
            v-model="reportForm.operator"
            filterable
            clearable
            placeholder="请选择包装部门复卷人员"
            style="width: 220px"
          >
            <el-option
              v-for="item in packagingStaffOptions"
              :key="item.id"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="复卷长度(m)">
          <el-input-number
            v-model="reportForm.rewindingLabelLengthM"
            size="small"
            :min="1"
            :step="1"
            :precision="0"
            controls-position="right"
            style="width: 140px"
          />
        </el-form-item>
        <el-form-item label="打印标签数量">
          <el-input-number v-model="reportForm.rewindingPrintCount" size="small" :min="1" :step="1" controls-position="right" style="width: 140px" />
        </el-form-item>
        <el-form-item label="起始序号">
          <el-input-number v-model="reportForm.rewindingSerialStart" size="small" :min="1" :step="1" controls-position="right" style="width: 140px" />
        </el-form-item>
        <el-form-item>
          <el-button size="small" type="primary" icon="el-icon-printer" @click="printRewindingLabel">打印复卷标签</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card v-if="!standaloneLabelOnly" shadow="never" class="mb-10">
      <el-form :inline="true" :model="query" @submit.native.prevent>
        <el-form-item v-if="!fixedType" label="类型">
          <el-select v-model="query.type" placeholder="全部" clearable style="width: 140px">
            <el-option label="涂布" value="coating" />
            <el-option label="复卷" value="rewinding" />
            <el-option label="分切" value="slitting" />
          </el-select>
        </el-form-item>
        <el-form-item label="是否完工">
          <el-select v-model="query.finishState" placeholder="请选择" style="width: 120px">
            <el-option label="全部" value="" />
            <el-option label="未完工" value="UNCOMPLETED" />
            <el-option label="已完工" value="COMPLETED" />
          </el-select>
        </el-form-item>
        <el-form-item label="计划日期">
          <el-date-picker v-model="query.dateRange" type="daterange" start-placeholder="开始日期" end-placeholder="结束日期" value-format="yyyy-MM-dd" style="width: 260px" />
        </el-form-item>
        <div class="query-second-row">
          <el-form-item label="订单号">
            <el-autocomplete
              v-model="query.orderNo"
              :fetch-suggestions="queryOrderNoSuggestions"
              placeholder="支持搜索已排/未排订单号"
              clearable
              style="width: 220px"
              trigger-on-focus
              @select="handleQuerySuggestionSelect"
              @keyup.enter.native="loadTasks"
            />
          </el-form-item>
          <el-form-item v-if="isRewinding || isSlitting" label="料号">
            <el-autocomplete
              v-model="query.materialCodeKeyword"
              :fetch-suggestions="queryMaterialCodeSuggestions"
              placeholder="输入料号筛选"
              clearable
              style="width: 180px"
              trigger-on-focus
              @select="handleQuerySuggestionSelect"
              @keyup.enter.native="loadTasks"
            />
          </el-form-item>
          <el-form-item v-if="isRewinding || isSlitting" label="规格">
            <el-autocomplete
              v-model="query.specKeyword"
              :fetch-suggestions="querySpecSuggestions"
              placeholder="输入规格筛选"
              clearable
              style="width: 180px"
              trigger-on-focus
              @select="handleQuerySuggestionSelect"
              @keyup.enter.native="loadTasks"
            />
          </el-form-item>
        </div>
        <el-form-item>
          <el-button type="primary" icon="el-icon-search" @click="loadTasks">查询</el-button>
          <el-button icon="el-icon-refresh" @click="resetQuery">重置</el-button>
          <el-button type="info" plain icon="el-icon-printer" @click="$router.push('/basic-data/print-config')">打印机配置与同步</el-button>
        </el-form-item>
        <el-form-item class="query-scan-item">
          <el-checkbox v-model="detailScanPrintMode" class="scan-mode-checkbox" @change="handleDetailScanPrintModeChange">扫码打印标签</el-checkbox>
          <el-input
            ref="detailQrScanInput"
            v-model="detailQrScanInput"
            :disabled="detailScanBusy"
            clearable
            :placeholder="detailScanPrintMode ? '扫码打印标签（无需回车、无需查询）' : '扫码报工（无需回车、无需查询）'"
            style="width: 320px"
            @input="scheduleAutoHandleDetailQrScan"
            @keyup.enter.native="handleDetailQrScanEnter"
          />
        </el-form-item>
      </el-form>
    </el-card>

    <el-card v-if="!standaloneLabelOnly" shadow="never">
      <div class="mb-10 table-summary">
        <span>
          物料代码 {{ taskMaterialCodeCount }} 个，当班生产报工总平米数 {{ formatAreaNum(taskTotalArea) }}m²；
          {{ currentWorkGroup }}班本月生产总平米数 {{ formatAreaNum(shiftProductionSummary.monthArea) }}m²，
          当年总平米数 {{ formatAreaNum(shiftProductionSummary.yearArea) }}m²
        </span>
        <div class="table-summary-actions">
          <el-switch
            v-model="showCompletedToggle"
            class="taskno-switch"
            active-text="显示已完成"
            inactive-text="隐藏已完成"
            @change="handleShowCompletedToggleChange"
          />
          <el-switch
            v-if="isCoating"
            v-model="showOrderNo"
            class="taskno-switch"
            active-text="显示订单号"
            inactive-text="隐藏订单号"
          />
          <el-switch
            v-model="showTaskNo"
            class="taskno-switch"
            active-text="显示任务号"
            inactive-text="隐藏任务号"
          />
          <el-switch
            v-model="showMaterialName"
            class="taskno-switch"
            active-text="显示品名"
            inactive-text="隐藏品名"
          />
          <el-button v-if="isCoating || isRewinding" size="mini" type="primary" plain icon="el-icon-printer" :disabled="!liveFilteredList.length" @click="printSchedulePlan">
            打印排程
          </el-button>
        </div>
      </div>

      <div v-loading="loading" class="task-grid-wrap">
        <table class="task-grid">
          <colgroup>
            <col v-if="showTaskNo" style="width:118px">
            <col v-if="orderNoVisible" style="width:116px">
            <col v-if="!fixedType" style="width:90px">
            <col style="width:110px">
            <col v-if="showMaterialName" style="width:100px">
            <col v-if="isCoating" style="width:120px">
            <col v-if="isCoating" style="width:100px">
            <col v-if="isCoating" style="width:100px">
            <col v-if="isCoating" style="width:110px">
            <col v-if="isRewinding || isSlitting" style="width:99px">
            <col v-if="isRewinding" style="width:120px">
            <col v-if="isSlitting" style="width:66px">
            <col style="width:56px">
            <col style="width:88px">
            <col style="width:50px">
            <col style="width:60px">
            <col v-if="isCoating && !isPlanMode" style="width:180px">
            <col v-if="isCoating && !isPlanMode" style="width:180px">
            <col style="width:136px">
          </colgroup>
          <thead>
            <tr>
              <th v-if="showTaskNo" :class="taskSortHeaderClass('taskNo')" @click="handleTaskHeaderSort('taskNo')">任务号<span v-if="isCoating" class="task-grid-sort-caret">{{ taskSortMark('taskNo') }}</span></th>
              <th v-if="orderNoVisible" :class="taskSortHeaderClass('orderNo')" @click="handleTaskHeaderSort('orderNo')">订单号<span v-if="isCoating" class="task-grid-sort-caret">{{ taskSortMark('orderNo') }}</span></th>
              <th v-if="!fixedType">类型</th>
              <th :class="taskSortHeaderClass('materialCode')" @click="handleTaskHeaderSort('materialCode')">料号<span v-if="isCoating" class="task-grid-sort-caret">{{ taskSortMark('materialCode') }}</span></th>
              <th v-if="showMaterialName">品名</th>
              <th v-if="isCoating" :class="taskSortHeaderClass('colorName')" @click="handleTaskHeaderSort('colorName')">颜色<span class="task-grid-sort-caret">{{ taskSortMark('colorName') }}</span></th>
              <th v-if="isCoating" :class="taskSortHeaderClass('thickness')" @click="handleTaskHeaderSort('thickness')">厚度(μm)<span class="task-grid-sort-caret">{{ taskSortMark('thickness') }}</span></th>
              <th v-if="isCoating" :class="taskSortHeaderClass('jumboWidth')" @click="handleTaskHeaderSort('jumboWidth')">宽度(mm)<span class="task-grid-sort-caret">{{ taskSortMark('jumboWidth') }}</span></th>
              <th v-if="isCoating" :class="taskSortHeaderClass('planLength')" @click="handleTaskHeaderSort('planLength')">长度(米)<span class="task-grid-sort-caret">{{ taskSortMark('planLength') }}</span></th>
              <th v-if="isRewinding || isSlitting">规格</th>
              <th v-if="isRewinding">复卷数量</th>
              <th v-if="isSlitting" class="task-grid-center">分切数量</th>
              <th class="task-grid-center" :class="taskSortHeaderClass('equipmentCode')" @click="handleTaskHeaderSort('equipmentCode')">设备<span v-if="isCoating" class="task-grid-sort-caret">{{ taskSortMark('equipmentCode') }}</span></th>
              <th :class="taskSortHeaderClass('planStartTime')" @click="handleTaskHeaderSort('planStartTime')">计划时间<span v-if="isCoating" class="task-grid-sort-caret">{{ taskSortMark('planStartTime') }}</span></th>
              <th class="task-grid-center">计划耗时</th>
              <th class="task-grid-center" :class="taskSortHeaderClass('status')" @click="handleTaskHeaderSort('status')">状态<span v-if="isCoating" class="task-grid-sort-caret">{{ taskSortMark('status') }}</span></th>
              <th v-if="isCoating && !isPlanMode">实际开始</th>
              <th v-if="isCoating && !isPlanMode">实际结束</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!liveFilteredList.length">
              <td :colspan="taskGridColspan" class="task-grid-empty">暂无数据</td>
            </tr>
            <tr v-for="row in liveFilteredList" :key="row.id || row.taskNo">
              <td v-if="showTaskNo">{{ row.taskNo || '-' }}</td>
              <td v-if="orderNoVisible" class="task-grid-order">
                <el-button
                  v-if="row.orderNo || row.customerOrderNo || row.customer_order_no"
                  type="text"
                  class="order-print-link"
                  @click="printOrderInstructionByTask(row)"
                >
                  {{ row.customerOrderNo || row.customer_order_no || row.orderNo }}
                </el-button>
                <span v-else>-</span>
              </td>
              <td v-if="!fixedType" class="task-grid-center">
                <el-tag size="small" :type="typeTag(row.type)">{{ typeText(row.type) }}</el-tag>
              </td>
              <td class="task-grid-break">{{ row.materialCode || '-' }}</td>
              <td v-if="showMaterialName" class="task-grid-name">{{ row.materialName || '-' }}</td>
              <td v-if="isCoating">{{ row.colorName || '-' }}</td>
              <td v-if="isCoating" class="task-grid-center">{{ row.thickness || '-' }}</td>
              <td v-if="isCoating" class="task-grid-center">{{ row.jumboWidth || '-' }}</td>
              <td v-if="isCoating" class="task-grid-center">{{ row.planLength || '-' }}</td>
              <td v-if="isRewinding || isSlitting" class="task-grid-spec">{{ isRewinding ? formatRewindingSpec(row) : formatSlittingSpec(row) }}</td>
              <td v-if="isRewinding" class="task-grid-center">{{ row.qty || '-' }}</td>
              <td v-if="isSlitting" class="task-grid-center task-grid-tight">{{ row.qty || '-' }}</td>
              <td class="task-grid-center task-grid-tight">{{ row.equipmentCode || '-' }}</td>
              <td class="task-grid-center">{{ formatRange(row.planStartTime, row.planEndTime) }}</td>
              <td class="task-grid-center task-grid-tight">{{ formatPlanDuration(row) }}</td>
              <td class="task-grid-center task-grid-tight task-grid-status">
                <el-tag size="small" :type="statusTag(row.status)">{{ statusText(row.status) }}</el-tag>
              </td>
              <td v-if="isCoating && !isPlanMode" class="task-grid-center">
                <el-date-picker
                  v-model="row.actualStartTime"
                  type="datetime"
                  value-format="yyyy-MM-dd HH:mm:ss"
                  format="yyyy-MM-dd HH:mm"
                  :picker-options="pickerOpts"
                  placeholder="选择时间"
                  @change="val => handleActualStart(row, val)"
                />
              </td>
              <td v-if="isCoating && !isPlanMode" class="task-grid-center">
                <el-date-picker
                  v-model="row.actualEndTime"
                  type="datetime"
                  value-format="yyyy-MM-dd HH:mm:ss"
                  format="yyyy-MM-dd HH:mm"
                  :picker-options="pickerOpts"
                  placeholder="选择时间"
                  @change="val => handleActualEnd(row, val)"
                />
              </td>
              <td class="task-grid-actions">
                <el-button class="task-op-btn" size="mini" @click="quickLoadLocksByTask(row)">领料</el-button>
                <el-button
                  v-if="String((row && row.type) || fixedType || query.type || '').toLowerCase() !== 'coating'"
                  class="task-op-btn"
                  size="mini"
                  type="success"
                  plain
                  @click="openLabelPrintDialog(row)"
                >标签打印</el-button>
                <el-button class="task-op-btn" size="mini" type="primary" @click="openReportDialog(row)">报工</el-button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <el-pagination
        class="mt-10 right"
        :current-page="query.pageNum"
        :page-size="query.pageSize"
        :page-sizes="[10, 20, 30, 50, 100]"
        :total="total"
        layout="total, sizes, prev, pager, next"
        @size-change="pageSizeChange"
        @current-change="pageChange"
      />
    </el-card>

    <el-dialog
      :title="`${processLabel(reportForm.processType)}${isLabelPrintMode ? '标签打印' : '报工'}`"
      :visible.sync="reportDialogVisible"
      :width="reportDialogWidth"
      :custom-class="reportDialogClass"
      @close="closeReportDialog"
    >
      <template slot="title">
        <span class="report-dialog-title-text">
          {{ `${processLabel(reportForm.processType)}${isLabelPrintMode ? '标签打印' : '报工'}` }}
          <span v-if="!isLabelPrintMode && reportForm.processType === 'SLITTING' && lastScannedQrText" class="report-dialog-scan-text">
            {{ ` ${lastScannedQrText}` }}
          </span>
        </span>
      </template>

      <el-form :model="reportForm" inline label-width="110px" style="margin-bottom: 4px;">
        <el-form-item label="物料代码">
          <el-input :value="reportForm.materialCode || '-'" size="small" disabled style="width: 220px" />
        </el-form-item>
        <el-form-item label="产品名称">
          <el-input :value="reportForm.materialName || '-'" size="small" disabled style="width: 220px" />
        </el-form-item>
        <el-form-item label="物料规格">
          <el-input :value="reportOrderSpecText" size="small" disabled style="width: 240px" />
        </el-form-item>
        <el-form-item label="客户代码">
          <el-input :value="reportForm.customerCode || '-'" size="small" disabled style="width: 160px" />
        </el-form-item>
        <el-form-item label="订单号">
          <el-input :value="reportOrderNoDisplay" size="small" disabled style="width: 220px" />
        </el-form-item>
      </el-form>

      <el-form :model="reportForm" inline label-width="110px">
        <el-form-item label="开始时间">
          <el-date-picker
            v-model="reportForm.startTime"
            type="datetime"
            size="small"
            value-format="yyyy-MM-dd HH:mm"
            format="yyyy-MM-dd HH:mm"
          />
        </el-form-item>
        <el-form-item label="结束时间">
          <el-date-picker
            v-model="reportForm.endTime"
            type="datetime"
            size="small"
            value-format="yyyy-MM-dd HH:mm"
            format="yyyy-MM-dd HH:mm"
          />
        </el-form-item>
        <el-form-item v-if="!isLabelPrintMode" label="跨班分段">
          <el-switch v-model="reportForm.enableSegment" active-text="开启" inactive-text="关闭" />
        </el-form-item>
        <el-form-item v-if="reportForm.processType === 'COATING'" label="计划数量(㎡)">
          <el-input :value="formatAreaNum(reportForm.planQty)" size="small" style="width: 140px" disabled />
        </el-form-item>
        <el-form-item v-if="reportForm.processType === 'COATING'" label="实际数量(㎡)">
          <el-input :value="formatAreaNum(calcCoatingOrderReportedTotalArea())" size="small" style="width: 140px" disabled />
        </el-form-item>
        <el-form-item v-else-if="!(isLabelPrintMode && reportForm.processType === 'SLITTING')" :label="reportForm.processType === 'SLITTING' ? '生产卷数' : '生产数量'">
          <el-input-number
            v-model="reportForm.producedQty"
            :min="reportForm.processType === 'SLITTING' ? 0 : 0.01"
            :step="1"
            :precision="reportForm.processType === 'SLITTING' ? 0 : 2"
            size="small"
            controls-position="right"
            @change="handleSlittingInputChanged"
          />
        </el-form-item>
        <el-form-item v-if="reportForm.processType === 'SLITTING' && !(isLabelPrintMode && reportForm.processType === 'SLITTING')" label="批次号">
          <div style="display:flex; align-items:center; gap:10px;">
            <el-checkbox v-model="reportForm.batchNoRequired">必填</el-checkbox>
            <el-select
              ref="slittingBatchNoSelect"
              v-model="reportForm.batchNo"
              size="small"
              filterable
              allow-create
              default-first-option
              clearable
              style="width: 220px"
              placeholder="可搜索已领料批次号，也可手输"
              @blur="commitSlittingBatchNoInput"
            >
              <el-option
                v-for="item in slittingIssuedBatchOptions"
                :key="item"
                :label="item"
                :value="item"
              />
            </el-select>
          </div>
        </el-form-item>
        <el-form-item label="操作人">
          <el-input v-model="reportForm.operator" size="small" placeholder="系统自动带出" style="width: 200px" :disabled="true" />
        </el-form-item>
      </el-form>
      <div v-if="!isLabelPrintMode && reportForm.enableSegment && reportSegmentCount > 1" style="margin: -6px 0 8px 110px; color: #E6A23C; font-size: 12px;">
        将按班次窗口自动拆分为 {{ reportSegmentCount }} 段报工（跨班次自动分段）
      </div>
      <el-form :model="reportForm" label-width="90px">
        <el-form-item label="备注">
          <el-input v-model="reportForm.remark" type="textarea" :rows="2" placeholder="选填" />
        </el-form-item>
        <el-form-item v-if="isLabelPrintMode" label="打印前预览">
          <el-switch v-model="printPreviewEnabled" active-text="开启" inactive-text="关闭" />
        </el-form-item>
      </el-form>

      <div v-if="reportForm.processType === 'COATING'" class="section-head">
        <span style="font-weight: 600;">涂布母卷明细</span>
        <div>
          <el-button
            v-if="!isLabelPrintMode && !reportOrderStarted"
            size="mini"
            type="primary"
            @click="handleCoatingOrderStart"
          >订单开始</el-button>
          <el-button
            v-if="!isLabelPrintMode && reportOrderStarted && !reportOrderCompleted"
            size="mini"
            type="warning"
            plain
            @click="handleCoatingOrderEnd"
          >订单结束</el-button>
          <el-tag v-if="!isLabelPrintMode && reportOrderCompleted" size="mini" type="success" style="margin-right: 8px;">已确认完成</el-tag>
          <el-button v-if="isLabelPrintMode" size="mini" type="primary" plain icon="el-icon-printer" @click="printCoatingInboundSheet">打印入库单</el-button>
        </div>
      </div>
      <el-table v-if="reportForm.processType === 'COATING'" :data="reportForm.producedRolls" border size="mini" class="mb-10">
        <el-table-column type="index" label="#" width="50" align="center" />
        <el-table-column label="母卷号" width="180">
          <template slot-scope="scope">
            <el-input v-model="scope.row.rollCode" size="mini" placeholder="如 MJ-20260306-001" />
          </template>
        </el-table-column>
        <el-table-column label="数字号" width="110" align="right">
          <template slot-scope="scope">
            <el-input
              v-model.trim="scope.row.sequenceNo"
              size="mini"
              clearable
              placeholder="可留空"
            />
          </template>
        </el-table-column>
        <el-table-column label="宽度(mm)" width="120" align="right">
          <template slot-scope="scope">
            <el-input
              v-model.trim="scope.row.widthMm"
              size="mini"
              clearable
              placeholder="请输入"
              @input="() => handleProducedRollWidthChanged(scope.row)"
            />
          </template>
        </el-table-column>
        <el-table-column label="长度(m)" width="120" align="right">
          <template slot-scope="scope">
            <el-input
              v-model.trim="scope.row.lengthM"
              size="mini"
              clearable
              placeholder="必填"
            />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" align="center">
          <template slot-scope="scope">
            <el-button type="text" size="mini" @click="removeProducedRoll(scope.$index)">删除</el-button>
            <el-button type="text" size="mini" @click="printRollLabel(scope.row, scope.$index)">打印标签</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div
        v-if="reportForm.processType === 'COATING' && (isLabelPrintMode || reportOrderStarted)"
        class="mb-10"
      >
        <el-button
          size="mini"
          icon="el-icon-plus"
          @click="addProducedRoll"
        >新增母卷</el-button>
        <el-button
          size="mini"
          type="primary"
          plain
          icon="el-icon-document-copy"
          @click="addProducedRollWithPrevSize"
        >新增上一行宽度长度</el-button>
      </div>

      <el-form v-if="reportForm.processType === 'COATING'" :inline="true" label-width="120px" class="mb-10">
        <el-form-item label="小支标签模式">
          <el-switch v-model="reportForm.coatingUseRewindingLabel" active-text="复卷模板" inactive-text="母卷模板" />
        </el-form-item>
        <template v-if="reportForm.coatingUseRewindingLabel">
          <el-form-item label="母卷号前缀">
            <el-input v-model="reportForm.rewindingMotherRollCode" size="small" clearable placeholder="可手填，如 MJ-20260502" style="width: 220px" />
          </el-form-item>
          <el-form-item>
            <el-button size="small" @click="fillNextRewindingMotherRollCode">带出下一个母卷号</el-button>
          </el-form-item>
          <el-form-item label="序列起始号">
            <el-input-number v-model="reportForm.rewindingSerialStart" size="small" :min="1" :step="1" controls-position="right" style="width: 140px" />
          </el-form-item>
          <el-form-item label="打印张数">
            <el-input-number v-model="reportForm.rewindingPrintCount" size="small" :min="1" :step="1" controls-position="right" style="width: 140px" />
          </el-form-item>
          <el-form-item>
            <el-button size="small" @click="generateCoatingProducedRollRowsByPrintCount">按张数生成母卷明细</el-button>
          </el-form-item>
          <el-form-item>
            <el-button size="small" type="primary" plain icon="el-icon-printer" @click="printCoatingRewindingLabelBatch">按复卷模板批量打印</el-button>
          </el-form-item>
        </template>
      </el-form>

      <div v-if="isLabelPrintMode && reportForm.processType === 'REWINDING'" class="section-head">
        <span style="font-weight: 600;">复卷标签</span>
        <div>
          <el-button size="mini" type="primary" plain icon="el-icon-printer" @click="printRewindingLabel">打印标签</el-button>
        </div>
      </div>
      <div v-if="isLabelPrintMode && reportForm.processType === 'REWINDING'" class="mb-10 rewinding-label-tabs-wrap">
        <el-tabs v-model="rewindingLabelTab" type="card">
          <el-tab-pane label="打印复卷标签" name="print">
            <el-form :inline="true" label-width="100px" class="rewinding-label-form">
              <el-form-item label="母卷号">
                <el-input
                  v-model.trim="reportForm.rewindingMotherRollCode"
                  size="small"
                  clearable
                  placeholder="输入/扫码母卷号"
                  style="width: 240px"
                  @change="reportForm.rewindingMotherInfo = null"
                  @blur="resolveRewindingMotherRollInfo"
                />
              </el-form-item>
              <el-form-item>
                <el-button size="small" @click="resolveRewindingMotherRollInfo()">查询母卷</el-button>
              </el-form-item>
              <el-form-item label="长度(m)">
                <el-input-number
                  v-model="reportForm.rewindingLabelLengthM"
                  size="small"
                  :min="1"
                  :step="1"
                  :precision="0"
                  controls-position="right"
                  style="width: 140px"
                />
              </el-form-item>
              <el-form-item label="序列起始号">
                <el-input-number v-model="reportForm.rewindingSerialStart" size="small" :min="1" :step="1" controls-position="right" style="width: 140px" />
              </el-form-item>
              <el-form-item label="打印个数">
                <el-input-number v-model="reportForm.rewindingPrintCount" size="small" :min="1" :step="1" controls-position="right" style="width: 140px" />
              </el-form-item>
            </el-form>

            <el-descriptions v-if="reportForm.rewindingMotherInfo" :column="3" size="mini" border class="rewinding-info-desc">
              <el-descriptions-item label="品名">{{ reportForm.rewindingMotherInfo.materialName || reportForm.rewindingMotherInfo.productName || '-' }}</el-descriptions-item>
              <el-descriptions-item label="料号">{{ reportForm.rewindingMotherInfo.materialCode || '-' }}</el-descriptions-item>
              <el-descriptions-item label="厚度(μm)">{{ reportForm.rewindingMotherInfo.thickness || '-' }}</el-descriptions-item>
              <el-descriptions-item label="宽度(mm)">{{ reportForm.rewindingMotherInfo.widthMm || reportForm.rewindingMotherInfo.width || '-' }}</el-descriptions-item>
              <el-descriptions-item label="长度(m)">{{ reportForm.rewindingMotherInfo.lengthM || reportForm.rewindingMotherInfo.length || reportForm.rewindingMotherInfo.currentLength || '-' }}</el-descriptions-item>
              <el-descriptions-item label="母卷号">{{ reportForm.rewindingMotherInfo.value || reportForm.rewindingMotherRollCode || '-' }}</el-descriptions-item>
            </el-descriptions>
          </el-tab-pane>
        </el-tabs>
      </div>

      <div v-if="isLabelPrintMode && reportForm.processType === 'SLITTING'" class="section-head">
        <span style="font-weight: 600;">分切标签打印</span>
        <div />
      </div>
      <el-form v-if="isLabelPrintMode && reportForm.processType === 'SLITTING'" :inline="true" label-width="110px" class="mb-10 slitting-print-form">
        <div class="slitting-print-row">
          <el-form-item label="生产卷数">
            <el-input-number
              v-model="reportForm.producedQty"
              :min="0"
              :step="1"
              :precision="0"
              size="small"
              controls-position="right"
              style="width: 140px"
              @change="handleSlittingInputChanged"
            />
          </el-form-item>
          <el-form-item label="卷/筒" class="pair-field">
            <el-input-number
              v-model="reportForm.slittingRollPerTube"
              :min="1"
              :step="1"
              :precision="0"
              size="small"
              controls-position="right"
              style="width: 140px"
              @change="handleSlittingInputChanged"
            />
          </el-form-item>
          <el-form-item label="筒/箱" class="pair-field">
            <el-input-number
              v-model="reportForm.slittingTubePerBoxCount"
              :min="0"
              :step="1"
              :precision="0"
              size="small"
              controls-position="right"
              style="width: 140px"
              @change="val => (typeof handleSlittingTubePerBoxChanged === 'function' ? handleSlittingTubePerBoxChanged(val) : handleSlittingInputChanged())"
            />
          </el-form-item>
          <el-form-item label="批次号">
            <div class="slitting-required-wrap">
              <el-checkbox v-model="reportForm.batchNoRequired">必填</el-checkbox>
              <el-select
                ref="slittingBatchNoSelect"
                v-model="reportForm.batchNo"
                size="small"
                filterable
                allow-create
                default-first-option
                clearable
                style="width: 220px"
                placeholder="可搜索已领料批次号，也可手输"
                @blur="commitSlittingBatchNoInput"
              >
                <el-option
                  v-for="item in slittingIssuedBatchOptions"
                  :key="item"
                  :label="item"
                  :value="item"
                />
              </el-select>
            </div>
          </el-form-item>
        </div>

        <div class="slitting-print-row">
          <el-form-item label="数字号">
            <div class="slitting-required-wrap">
              <el-checkbox v-model="reportForm.slittingDigitalNoRequired">必填</el-checkbox>
              <el-input
                v-model.trim="reportForm.slittingDigitalNo"
                size="small"
                style="width: 130px"
                placeholder="如 001"
              />
            </div>
          </el-form-item>
        </div>

        <div class="slitting-print-row">
          <el-form-item label="卷芯张数">
            <el-input-number v-model="reportForm.slittingCorePrintCount" :min="0" :step="1" :precision="0" size="small" controls-position="right" style="width: 140px" />
          </el-form-item>
          <el-form-item label="内标张数">
            <el-input-number v-model="reportForm.slittingInnerPrintCount" :min="0" :step="1" :precision="0" size="small" controls-position="right" style="width: 140px" />
          </el-form-item>
          <el-form-item label="外标张数">
            <el-input-number v-model="reportForm.slittingOuterPrintCount" :min="0" :step="1" :precision="0" size="small" controls-position="right" style="width: 140px" />
          </el-form-item>
          <el-form-item label="栈板张数">
            <el-input-number v-model="reportForm.slittingPalletPrintCount" :min="0" :step="1" :precision="0" size="small" controls-position="right" style="width: 140px" />
          </el-form-item>
        </div>

        <div class="slitting-print-row">
          <el-form-item label="生产日期">
            <el-date-picker
              v-model="reportForm.labelProductionDate"
              type="date"
              value-format="yyyy-MM-dd"
              format="yyyy-MM-dd"
              size="small"
              style="width: 140px"
              placeholder="生产日期"
            />
          </el-form-item>
          <el-form-item label="保质期(天)">
            <el-input-number v-model="reportForm.shelfLifeDays" :min="0" :step="1" :precision="0" size="small" controls-position="right" style="width: 140px" />
          </el-form-item>
          <el-form-item label="出货日期">
            <el-date-picker
              v-model="reportForm.labelShipDate"
              type="date"
              value-format="yyyy-MM-dd"
              format="yyyy-MM-dd"
              size="small"
              style="width: 140px"
              placeholder="出货日期"
            />
          </el-form-item>
          <el-form-item label="送货单号">
            <el-input v-model="reportForm.deliveryNoteNo" size="small" style="width: 180px" placeholder="如 DH-20260416-001" />
          </el-form-item>
        </div>

        <div class="slitting-print-row">
          <el-form-item label="纸箱规格">
            <el-select
              v-model="reportForm.cartonPreset"
              size="small"
              style="width: 230px"
              :disabled="!cartonPresetOptions.length"
              placeholder="请先在研发管理维护"
              @change="handleCartonPresetChanged"
            >
              <el-option
                v-for="item in cartonPresetOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="管芯外径(mm)">
            <el-input-number
              v-model="reportForm.coreOuterDiameterMm"
              :min="0"
              :step="0.1"
              :precision="2"
              size="small"
              controls-position="right"
              style="width: 140px"
              @change="handleSlittingInputChanged"
            />
          </el-form-item>
          <el-form-item label="胶带外径(mm)">
            <el-input :value="calcSlittingTapeOuterDiameterText(reportForm || {})" size="small" disabled style="width: 140px" />
          </el-form-item>
          <el-form-item label="本箱重量(kg)">
            <el-input-number v-model="reportForm.boxWeightKg" :min="0" :step="0.01" :precision="2" size="small" controls-position="right" style="width: 140px" />
          </el-form-item>
        </div>

        <div class="slitting-print-row">
          <el-form-item label="规格类型" class="slitting-biz-type-item">
            <el-select
              v-model="reportForm.slittingQrRuleBizType"
              size="small"
              style="width: 120px"
              @change="handleSlittingQrRuleBizTypeChanged"
            >
              <el-option label="管芯标签" value="SLITTING_CORE_LABEL" />
              <el-option label="窄管芯标签" value="SLITTING_CORE_LABEL_NARROW" />
              <el-option label="内标签" value="SLITTING_INNER_LABEL" />
              <el-option label="外标签" value="SLITTING_OUTER_LABEL" />
              <el-option label="栈板标签" value="SLITTING_PALLET_LABEL" />
            </el-select>
          </el-form-item>
          <el-form-item label="二维码模板" class="slitting-qr-template-item">
            <el-input
              v-model="reportForm.qrTemplate"
              :disabled="!reportForm.qrTemplateEditable"
              size="small"
              class="slitting-qr-text"
              style="width: 530px"
              :placeholder="'支持 {{field}} 或 {field}，例如 {{orderNo}}|{{batchNo}}|{{boxRollCount}}'"
            />
          </el-form-item>
          <el-form-item class="slitting-qr-action-item">
            <el-button
              size="mini"
              type="primary"
              @click="enableQrTemplateEdit"
            >编辑</el-button>
            <el-button
              size="mini"
              type="success"
              :disabled="!reportForm.qrTemplateEditable"
              :loading="qrRuleSaving"
              @click="saveCurrentCustomerQrRule(reportForm.slittingQrRuleBizType || 'SLITTING_OUTER_LABEL')"
            >保存</el-button>
          </el-form-item>
        </div>

        <div class="slitting-print-row">
          <el-form-item label="二维码预览" class="slitting-qr-preview-item">
            <el-input :value="buildSlittingQrPreview()" size="small" readonly class="slitting-qr-text slitting-qr-preview" style="width: 530px" />
          </el-form-item>
        </div>

        <div class="slitting-print-row">
          <el-form-item>
            <el-select
              v-model="reportForm.slittingCoreLabelBizType"
              size="mini"
              style="width: 160px; margin-right: 8px"
              :disabled="!isLabelPrintMode || reportForm.processType !== 'SLITTING'"
              placeholder="卷芯类型"
            >
              <el-option label="普通管芯" value="SLITTING_CORE_LABEL" />
              <el-option label="窄管芯" value="SLITTING_CORE_LABEL_NARROW" />
            </el-select>
            <el-button size="mini" type="primary" plain icon="el-icon-printer" @click="printSlittingLabel('slitting-core-label')">打印卷芯标签</el-button>
            <el-button size="mini" type="primary" plain icon="el-icon-printer" @click="printSlittingLabel('slitting-inner-label')">打印内标签</el-button>
            <el-button size="mini" type="primary" plain icon="el-icon-printer" @click="printSlittingLabel('slitting-outer-label')">打印外标签</el-button>
            <el-button size="mini" type="primary" plain icon="el-icon-printer" @click="printSlittingLabel('slitting-pallet-label')">打印栈板标签</el-button>
          </el-form-item>
        </div>
      </el-form>

      <div
        v-if="isLabelPrintMode && reportForm.processType === 'SLITTING'"
        class="packing-preview-wrap"
      >
        <div class="packing-preview-title">纸箱装筒像素预览（按胶带外径向上取整，覆盖常见三种排法）</div>
        <svg
          v-if="slittingPackingPreview && slittingPackingPreview.circles && slittingPackingPreview.circles.length"
          :width="slittingPackingPreview.viewWidth"
          :height="slittingPackingPreview.viewHeight"
          class="packing-preview-svg"
        >
          <rect
            :x="slittingPackingPreview.padding"
            :y="slittingPackingPreview.padding"
            :width="slittingPackingPreview.boxWidthPx"
            :height="slittingPackingPreview.boxHeightPx"
            fill="#f8faff"
            stroke="#8cb3ff"
            stroke-width="1"
          />
          <circle
            v-for="(c, idx) in slittingPackingPreview.circles"
            :key="`pack_${idx}`"
            :cx="c.cx"
            :cy="c.cy"
            :r="c.r"
            fill="rgba(64,158,255,0.16)"
            stroke="#409EFF"
            stroke-width="1"
          />
        </svg>
        <div v-else class="packing-preview-empty">暂无可预览排布（请先选择纸箱并填写有效规格）</div>
        <div class="packing-preview-meta" :class="{ 'packing-preview-meta-danger': slittingPackingPreview && slittingPackingPreview.requestedCount > 0 && !slittingPackingPreview.fitsRequested }">
          直径取整：{{ slittingPackingPreview.diameterRoundedMm || 0 }}mm，预览可放：{{ slittingPackingPreview.count || 0 }} 筒
          ，计划装筒：{{ slittingPackingPreview.requestedCount || 0 }} 筒
          ，本箱卷数：{{ slittingPackingPreview.requestedRollCount || 0 }} 卷
          ，{{ slittingPackingPreview.requestedCount > 0 ? (slittingPackingPreview.fitsRequested ? '可放下' : '放不下') : '未设置' }}
        </div>
      </div>

      <div v-if="!isLabelPrintMode" style="margin-bottom: 8px; font-weight: 600;">工序退料明细</div>
      <el-table v-if="!isLabelPrintMode" :data="reportForm.materialIssues" border size="mini" class="mb-10">
        <el-table-column type="index" label="#" width="50" align="center" />
        <el-table-column label="物料编码" width="180">
          <template slot-scope="scope">
            <el-input v-model="scope.row.materialCode" size="mini" placeholder="物料编码" />
          </template>
        </el-table-column>
        <el-table-column label="卷号/批次" width="140">
          <template slot-scope="scope">
            <el-input v-model="scope.row.rollCode" size="mini" placeholder="卷号" />
          </template>
        </el-table-column>
        <el-table-column label="计划面积(㎡)" width="120" align="right">
          <template slot-scope="scope">
            <el-input-number v-model="scope.row.planArea" :min="0" :step="1" :precision="2" size="mini" controls-position="right" @change="handleIssueAreaChange(scope.row)" />
          </template>
        </el-table-column>
        <el-table-column label="实际退料(㎡)" width="120" align="right">
          <template slot-scope="scope">
            <el-input-number v-model="scope.row.actualArea" :min="0" :step="1" :precision="2" size="mini" controls-position="right" @change="handleIssueAreaChange(scope.row)" />
          </template>
        </el-table-column>
        <el-table-column label="损耗(㎡)" width="110" align="right">
          <template slot-scope="scope">
            <span>{{ formatIssueLoss(scope.row) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="80" align="center">
          <template slot-scope="scope">
            <el-button type="text" size="mini" @click="removeMaterialIssue(scope.$index)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-button v-if="!isLabelPrintMode" size="mini" icon="el-icon-plus" class="mb-10" @click="addMaterialIssue">新增退料</el-button>

      <div v-if="!isLabelPrintMode" style="margin-bottom: 8px; font-weight: 600;">历史报工</div>
      <el-table v-if="!isLabelPrintMode" v-loading="reportLoading" :data="reportList" border size="mini" max-height="260">
        <el-table-column type="index" label="#" width="50" align="center" />
        <el-table-column prop="start_time" label="开始时间" width="170" />
        <el-table-column prop="end_time" label="结束时间" width="170" />
        <el-table-column :label="reportForm.processType === 'SLITTING' ? '生产卷数' : '生产数量'" prop="produced_qty" width="110" align="right" />
        <el-table-column prop="produced_roll_count" label="母卷条数" width="90" align="right" />
        <el-table-column prop="material_issue_count" label="领料条数" width="90" align="right" />
        <el-table-column prop="operator_name" label="操作人" width="120" />
        <el-table-column v-if="reportForm.processType === 'COATING'" label="订单状态" width="96" align="center">
          <template slot-scope="scope">
            <el-tag v-if="getReportOrderStatus(scope.row) === 'COMPLETED'" size="mini" type="success">已完成</el-tag>
            <el-tag v-else-if="getReportOrderStatus(scope.row) === 'UNCOMPLETED'" size="mini" type="info">未完成</el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" align="center">
          <template slot-scope="scope">
            <el-button type="text" size="mini" @click="editHistoryReport(scope.row)">修改</el-button>
            <el-button type="text" size="mini" style="color:#F56C6C" @click="removeHistoryReport(scope.row)">删除</el-button>
          </template>
        </el-table-column>
        <el-table-column label="备注" min-width="160" show-overflow-tooltip>
          <template slot-scope="scope">{{ formatReportRemarkDisplay(scope.row && scope.row.remark) }}</template>
        </el-table-column>
      </el-table>

      <div slot="footer">
        <el-button @click="reportDialogVisible = false">取消</el-button>
        <el-button v-if="!isLabelPrintMode" type="primary" :loading="reportSubmitting" @click="submitReport">提交报工</el-button>
      </div>
    </el-dialog>

    <el-dialog
      title="分切领料"
      :visible.sync="slittingIssueDialogVisible"
      width="920px"
      :close-on-click-modal="false"
    >
      <el-form :inline="true" :model="slittingIssueForm" label-width="90px" class="mb-10">
        <el-form-item label="订单号">
          <el-input v-model="slittingIssueForm.orderNo" size="small" disabled style="width: 180px" />
        </el-form-item>
        <el-form-item label="料号">
          <el-input v-model="slittingIssueForm.materialCode" size="small" disabled style="width: 180px" />
        </el-form-item>
        <el-form-item label="计划机台">
          <el-input v-model="slittingIssueForm.plannedMachineCode" size="small" disabled style="width: 120px" />
        </el-form-item>
        <el-form-item label="领料模式">
          <el-radio-group v-model="slittingIssueForm.mode" size="small">
            <el-radio-button label="BATCH">批次领料</el-radio-button>
            <el-radio-button label="MULTI">多次领料</el-radio-button>
          </el-radio-group>
        </el-form-item>
      </el-form>

      <el-form :inline="true" :model="slittingIssueForm" label-width="90px" class="mb-10">
        <el-form-item label="机台号">
          <el-input
            v-model="slittingIssueForm.machineCode"
            size="small"
            clearable
            placeholder="可扫码录入，默认计划机台"
            style="width: 180px"
          />
        </el-form-item>
        <el-form-item label="生产人员">
          <el-input
            v-model="slittingIssueForm.operator"
            size="small"
            clearable
            placeholder="可扫码工牌录入"
            style="width: 180px"
          />
        </el-form-item>
        <el-form-item label="计划日期">
          <el-date-picker v-model="slittingIssueForm.planDate" type="date" value-format="yyyy-MM-dd" size="small" style="width: 150px" />
        </el-form-item>
      </el-form>

      <div v-if="slittingIssueForm.mode === 'BATCH'" class="mb-10">
        <div style="margin-bottom: 6px; font-weight: 600;">批次扫码（一次可扫多个卷料码）</div>
        <el-input
          v-model="slittingIssueForm.batchScanCodes"
          type="textarea"
          :rows="4"
          placeholder="支持换行、空格、逗号分隔；例如：RL240001,RL240002"
        />
        <div style="margin-top: 8px;">
          <el-button size="mini" type="primary" :loading="slittingIssueLoading" @click="loadSlittingIssueByBatch">解析扫码并匹配锁定</el-button>
          <el-button size="mini" @click="slittingIssueForm.batchScanCodes = ''">清空扫码</el-button>
        </div>
      </div>

      <div class="section-head">
        <span style="font-weight: 600;">领料明细（可多次提交）</span>
        <div>
          <el-button size="mini" icon="el-icon-plus" @click="addSlittingIssueRow">新增一行</el-button>
          <el-button size="mini" :loading="slittingIssueLoading" @click="fillAllSlittingIssueRows">按卷码匹配</el-button>
        </div>
      </div>
      <el-table v-loading="slittingIssueLoading" :data="slittingIssueForm.rows" border size="mini" class="mb-10">
        <el-table-column type="index" label="#" width="50" align="center" />
        <el-table-column label="卷号/批次" width="170">
          <template slot-scope="scope">
            <el-input v-model="scope.row.rollCode" size="mini" placeholder="扫码卷料码" @blur="fillSlittingIssueRow(scope.row)" />
          </template>
        </el-table-column>
        <el-table-column prop="lockId" label="锁定ID" width="90" />
        <el-table-column label="状态" width="100" align="center">
          <template slot-scope="scope">
            <el-tag size="mini" :type="lockStatusTag(scope.row.lockStatus)">{{ lockStatusText(scope.row.lockStatus) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="issuedArea" label="可领面积(㎡)" width="110" align="right" />
        <el-table-column label="机台号" width="140">
          <template slot-scope="scope">
            <el-input v-model="scope.row.machineCode" size="mini" placeholder="机台号" />
          </template>
        </el-table-column>
        <el-table-column label="生产人员" width="150">
          <template slot-scope="scope">
            <el-input v-model="scope.row.operator" size="mini" placeholder="人员/工号" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="80" align="center">
          <template slot-scope="scope">
            <el-button type="text" size="mini" @click="removeSlittingIssueRow(scope.$index)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div slot="footer">
        <el-button @click="slittingIssueDialogVisible = false">关闭</el-button>
        <el-button type="primary" :loading="slittingIssueSubmitting" @click="submitSlittingIssue">提交领料</el-button>
      </div>
    </el-dialog>

    <el-dialog title="领料单" :visible.sync="issueDialogVisible" width="900px">
      <div v-if="issueSheet">
        <p><strong>领料单号：</strong>{{ issueSheet.issueNo }} &nbsp;&nbsp; <strong>料号：</strong>{{ issueSheet.materialCode }}</p>
        <p><strong>计划日期：</strong>{{ issueSheet.planDate }} &nbsp;&nbsp; <strong>生成时间：</strong>{{ issueSheet.createdAt }}</p>
        <p v-if="issueSheet.requestNos && issueSheet.requestNos.length"><strong>关联请购单：</strong>{{ issueSheet.requestNos.join('、') }}</p>
        <el-table :data="issueSheet.rows" border stripe size="mini" style="margin-top: 8px;">
          <el-table-column type="index" label="序号" width="60" align="center" />
          <el-table-column label="锁定ID" width="100">
            <template slot-scope="{row}">{{ row.lockId || row.id }}</template>
          </el-table-column>
          <el-table-column prop="orderNo" label="订单号" width="160" />
          <el-table-column v-if="isCoating" prop="finishedMaterialCode" label="成品料号" width="160" />
          <el-table-column v-if="isCoating" prop="rawMaterialCode" label="原材料代码" width="150" />
          <el-table-column v-if="isCoating" prop="rawMaterialName" label="原材料名称" min-width="160" show-overflow-tooltip />
          <el-table-column v-if="isCoating" prop="sourceType" label="来源" width="80" align="center" />
          <el-table-column v-if="isCoating" prop="specDesc" label="规格" min-width="140" show-overflow-tooltip />
          <el-table-column v-if="isCoating" prop="unit" label="单位" width="70" align="center" />
          <el-table-column v-if="isCoating" prop="issuedQty" label="领料数量" width="120" />
          <el-table-column v-if="!isCoating" prop="materialCode" label="料号" width="160" />
          <el-table-column v-if="!isCoating" prop="filmStockId" :label="isSlitting ? '支料ID' : '母卷ID'" width="100" />
          <el-table-column v-if="!isCoating" label="领料面积(m²)" width="130">
            <template slot-scope="{row}">{{ row.issuedArea || row.lockedArea }}</template>
          </el-table-column>
          <el-table-column label="时间" min-width="160">
            <template slot-scope="{row}">{{ row.createdAt || row.lockedTime }}</template>
          </el-table-column>
        </el-table>
        <p v-if="isCoating" style="margin-top: 8px;"><strong>合计数量：</strong>{{ issueSheet.totalQty }}</p>
        <p v-else style="margin-top: 8px;"><strong>合计面积：</strong>{{ issueSheet.totalArea }} m²</p>
      </div>
      <div slot="footer">
        <el-button type="primary" plain icon="el-icon-printer" @click="printIssueSheet">打印</el-button>
        <el-button @click="issueDialogVisible = false">关闭</el-button>
      </div>
    </el-dialog>

    <el-dialog
      title="涂布领料"
      :visible.sync="coatingIssueDialogVisible"
      width="1100px"
      :close-on-click-modal="false"
      @close="closeCoatingIssueDialog"
    >
      <el-row :gutter="8" style="margin-bottom: 10px; border:1px solid #ebeef5; border-radius:4px; padding:8px 10px;">
        <el-col :span="6"><div><strong>任务号：</strong>{{ coatingIssueForm.taskNo || '-' }}</div></el-col>
        <el-col :span="6"><div><strong>订单号：</strong>{{ coatingIssueForm.orderNo || '-' }}</div></el-col>
        <el-col :span="6"><div><strong>成品料号：</strong>{{ coatingIssueForm.materialCode || '-' }}</div></el-col>
        <el-col :span="6"><div><strong>产品名称：</strong>{{ coatingIssueForm.materialName || '-' }}</div></el-col>
        <el-col :span="6" style="margin-top:6px;"><div><strong>规格：</strong>{{ coatingIssueForm.specText || '-' }}</div></el-col>
        <el-col :span="6" style="margin-top:6px;"><div><strong>计划日期：</strong>{{ coatingIssueForm.planDate || '-' }}</div></el-col>
        <el-col :span="6" style="margin-top:6px;"><div><strong>计划数量：</strong>{{ coatingIssueForm.planQty || '-' }}</div></el-col>
        <el-col :span="6" style="margin-top:6px;"><div><strong>可领总量：</strong>{{ coatingIssueForm.lockTotalQty }}</div></el-col>
      </el-row>

      <el-alert
        v-if="coatingIssueForm.requestNos.length"
        :title="`已自动关联请购单：${coatingIssueForm.requestNos.join('、')}`"
        type="info"
        :closable="false"
        style="margin-bottom: 10px;"
      />

      <el-alert
        v-if="!coatingIssueForm.lockRows.length && coatingIssueForm.missingReason"
        :title="`未生成配方分解明细：${coatingIssueForm.missingReason}`"
        type="warning"
        :closable="false"
        style="margin-bottom: 10px;"
      />

      <div style="margin: 8px 0; font-weight: 600;">配方领料明细</div>
      <div v-if="!coatingLockSections.length" style="padding: 14px 0; color:#909399; text-align:center; border:1px solid #ebeef5; border-radius:4px;">暂无配方分解明细</div>
      <div v-for="sec in coatingLockSections" :key="sec.key" style="margin-bottom: 10px;">
        <div style="margin: 4px 0 6px; font-weight: 600;">{{ sec.label }}</div>
        <el-table v-loading="coatingIssueLoading" :data="sec.rows" border stripe size="mini" max-height="220">
          <el-table-column type="index" label="#" width="50" align="center" />
          <el-table-column prop="rawMaterialCode" label="物料代码" width="150" />
          <el-table-column prop="rawMaterialName" label="物料名称" min-width="180" show-overflow-tooltip />
          <el-table-column prop="specDesc" label="规格" min-width="140" show-overflow-tooltip />
          <el-table-column label="计划用量" width="110" align="right">
            <template slot-scope="scope">
              <span>{{ Number(scope.row.requiredKg || scope.row.plannedUsage || 0).toFixed(3) }}</span>
            </template>
          </el-table-column>
          <el-table-column :label="isAreaSectionKey(sec.key) ? '可用卷数' : '可领桶/包'" width="110" align="right">
            <template slot-scope="scope">{{ formatCoatingLockPackQty(scope.row) }}</template>
          </el-table-column>
          <el-table-column :label="isAreaSectionKey(sec.key) ? '可领长度(m)' : '仓库可用'" width="130" align="right">
            <template slot-scope="scope">{{ formatCoatingLockQty(scope.row) }}</template>
          </el-table-column>
          <el-table-column label="单位" width="70" align="center">
            <template slot-scope="scope">{{ resolveCoatingIssueUnit(scope.row) }}</template>
          </el-table-column>
          <el-table-column label="本次领料" width="130" align="right">
            <template slot-scope="scope">
              <el-input-number
                v-model="scope.row.issueQty"
                size="mini"
                :min="0"
                :max="Number(resolveCoatingLockAvailableQty(scope.row) || 0)"
                :precision="0"
                :step="1"
                :controls="true"
                :disabled="!canAutoIssueLockRow(scope.row)"
              />
            </template>
          </el-table-column>
          <el-table-column label="状态" width="100" align="center">
            <template slot-scope="scope">
              <el-tag size="mini" :type="lockStatusTag(scope.row.lockStatus)">{{ lockStatusText(scope.row.lockStatus) }}</el-tag>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div style="margin: 14px 0 8px; font-weight: 600; display:flex; justify-content:space-between; align-items:center;">
        <span>手动领料（配方缺失时可补录）</span>
        <el-button size="mini" icon="el-icon-plus" @click="addCoatingManualRow">新增一行</el-button>
      </div>
      <el-table :data="coatingIssueForm.manualRows" border stripe size="mini" max-height="220">
        <el-table-column type="index" label="#" width="50" align="center" />
        <el-table-column label="仓库" width="110" align="center">
          <template slot-scope="scope">
            <el-select
              v-model="scope.row.warehouseType"
              size="mini"
              style="width: 90px"
              @change="() => onManualWarehouseTypeChange(scope.row)"
            >
              <el-option label="化工仓" value="chemical" />
              <el-option label="薄膜仓" value="film" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="物料代码" width="200">
          <template slot-scope="scope">
            <el-autocomplete
              v-model="scope.row.rawMaterialCode"
              :fetch-suggestions="queryRawMaterialCode"
              placeholder="输入或选择料号"
              size="mini"
              @select="item => onSelectManualMaterial(scope.row, item)"
              @change="() => onChangeManualMaterial(scope.row)"
            />
          </template>
        </el-table-column>
        <el-table-column label="物料名称" min-width="170">
          <template slot-scope="scope">{{ scope.row.rawMaterialName || '-' }}</template>
        </el-table-column>
        <el-table-column label="规格" min-width="140" show-overflow-tooltip>
          <template slot-scope="scope">{{ scope.row.specDesc || '-' }}</template>
        </el-table-column>
        <el-table-column label="单位" width="80" align="center">
          <template slot-scope="scope">{{ scope.row.unit || '-' }}</template>
        </el-table-column>
        <el-table-column label="批次" min-width="180">
          <template slot-scope="scope">
            <el-select
              v-model="scope.row.detailId"
              size="mini"
              clearable
              filterable
              placeholder="先查库存再选批次"
              style="width: 100%"
              @focus="refreshManualStockQty(scope.row, true)"
              @change="() => onManualBatchChange(scope.row)"
            >
              <el-option
                v-for="opt in (scope.row.batchOptions || [])"
                :key="`${opt.stockId}-${opt.detailId}`"
                :label="opt.label"
                :value="opt.detailId"
              />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="仓库数量" width="120" align="right">
          <template slot-scope="scope">{{ scope.row.warehouseQty }}</template>
        </el-table-column>
        <el-table-column label="本次领料" width="130" align="right">
          <template slot-scope="scope">
            <el-input-number v-model="scope.row.issueQty" size="mini" :min="0" :precision="3" :step="1" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" align="center">
          <template slot-scope="scope">
            <el-button type="text" size="mini" @click="refreshManualStockQty(scope.row)">查库存</el-button>
            <el-button type="text" size="mini" style="color:#F56C6C" @click="removeCoatingManualRow(scope.$index)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div slot="footer">
        <el-button @click="coatingIssueDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="coatingIssueSubmitting" @click="submitCoatingIssueDialog">确认领料</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import request from '@/utils/request'
import { getProductionTasks } from '@/api/productionManagement'
import { getStagePlanTaskPage, getStagePlanTaskSummary } from '@/api/schedulePlan'
import { getShiftProductionSummary } from '@/api/schedule'
import { getCoatingSchedules, getPendingOrders, reportWork, getReportWorkList, getReportWorkDetail, getLatestScheduleId, getNextCoatingRollCode, updateReportWork, deleteReportWork } from '@/api/manualSchedule'
import { queryOrderLockedStocks, allocateMaterials, returnMaterials, createIssueOrder } from '@/api/scheduleMaterial'
import { queryCoatingChemicalLocks, confirmCoatingChemicalIssue } from '@/api/chemicalRequisition'
import { getRawMaterialPage } from '@/api/tapeRawMaterial'
import {
  getFilmStockList,
  getFilmStockDetails,
  getChemicalStockList,
  getChemicalStockDetails,
  createFilmOutbound,
  createChemicalOutbound
} from '@/api/rawMaterialStock'
import { matchCustomerMaterialMapping } from '@/api/customerMaterialMapping'
import { updateCoatingActualTimes } from '@/api/productionManagement'
import { getCartonSpecList } from '@/api/rdCartonSpec'
import { searchMotherRolls, resolveMotherRollInfo } from '@/api/tapeStock'
import { getAllActiveStaff } from '@/api/staff'
import { getWorkshopList } from '@/api/equipment'
import { getSpecByMaterialCode } from '@/api/tapeSpec'
import { getOrderDetailForProduction, resolveOrderItemByDetailId } from '@/api/sales'
import { getCustomerLabelQrRule, saveCustomerLabelQrRule } from '@/api/labelQrRule'
import { getBarTenderConfig, printByScene, printBySceneBatch, sendBarTenderPrint, goToPrintConfig } from '@/utils/printService'
import QRCode from 'qrcode'

export default {
  name: 'ProductionTasks',
  props: {
    fixedType: { type: String, default: '' },
    standaloneLabelOnly: { type: Boolean, default: false }
  },
  data() {
    return {
      loading: false,
      showOrderNo: false,
      showTaskNo: false,
      showMaterialName: true,
      list: [],
      total: 0,
      taskSummary: {
        materialCodeCount: 0,
        totalArea: 0,
        reportedMaterialCodeCount: 0,
        reportedArea: 0
      },
      taskSortField: '',
      taskSortOrder: '',
      query: {
        type: '',
        status: '',
        finishState: 'UNCOMPLETED',
        orderNo: '',
        materialCodeKeyword: '',
        specKeyword: '',
        dateRange: [],
        pageNum: 1,
        pageSize: 10
      },
      // locks
      locksLoading: false,
      lockQuery: { orderNo: '', materialCode: '', rollCode: '', planDate: '', processType: '', requiredLength: null },
      locks: [],
      selected: [],
      coatingIssueDialogVisible: false,
      coatingIssueLoading: false,
      coatingIssueSubmitting: false,
      coatingIssueForm: {
        taskNo: '',
        orderNo: '',
        materialCode: '',
        materialName: '',
        planDate: '',
        planQty: 0,
        specText: '',
        missingReason: '',
        lockRows: [],
        lockTotalQty: 0,
        requestNos: [],
        manualRows: []
      },
      coatingChemicalStockCache: null,
      coatingFilmStockCache: null,
      issueDialogVisible: false,
      issueSheet: null,
      slittingIssueDialogVisible: false,
      slittingIssueLoading: false,
      slittingIssueSubmitting: false,
      slittingIssueForm: {
        mode: 'BATCH',
        orderNo: '',
        materialCode: '',
        planDate: '',
        plannedMachineCode: '',
        machineCode: '',
        operator: '',
        batchScanCodes: '',
        rows: []
      },
      coatingRequestNos: [],
      reportDialogVisible: false,
      reportDialogMode: 'report',
      reportEditingId: null,
      reportOrderStarted: false,
      reportOrderCompleted: false,
      reportLoading: false,
      reportSubmitting: false,
      qrRuleSaving: false,
      reportList: [],
      reportForm: {
        scheduleId: null,
        orderDetailId: null,
        processType: 'COATING',
        taskNo: '',
        orderNo: '',
        customerOrderNo: '',
        customerCode: '',
        customerShortName: '',
        myCompanyName: '东莞市方恩电子材料科技有限公司',
        myCompanyAddress: '广东省东莞市桥头镇东新路13号2号楼102室',
        myCompanyPhone: '0769-82551118',
        orderDetailRemark: '',
        lineNo: '',
        materialCode: '',
        materialName: '',
        batchNo: '',
        batchNoRequired: true,
        thickness: '',
        widthMm: null,
        lengthM: null,
        rewindingSpec: '',
        coatingUseRewindingLabel: false,
        coatingWidthSeedMm: null,
        rewindingMotherRollCode: '',
        rewindingSerialStart: 1,
        rewindingPrintCount: null,
        coreOuterDiameterMm: 87.5,
        cartonPreset: '',
        cartonLengthMm: 0,
        cartonWidthMm: 0,
        cartonHeightMm: 0,
        slittingRollPerTube: 1,
        slittingTubePerBoxCount: 0,
        slittingTubeRollCount: 0,
        slittingCoreLabelBizType: 'SLITTING_CORE_LABEL',
        slittingQrRuleBizType: 'SLITTING_OUTER_LABEL',
        slittingDigitalNoRequired: true,
        slittingDigitalNo: '',
        slittingCorePrintCount: 0,
        slittingInnerPrintCount: 0,
        slittingOuterPrintCount: 0,
        slittingPalletPrintCount: 0,
        boxWeightKg: null,
        labelProductionDate: '',
        labelShipDate: '',
        deliveryNoteNo: '',
        shelfLifeDays: 365,
        qrTemplate: '',
        qrTemplateEditable: true,
        startTime: '',
        endTime: '',
        enableSegment: true,
        planQty: null,
        producedQty: null,
        producedRolls: [],
        materialIssues: [],
        operator: '',
        remark: ''
      },
      pickerOpts: {
        // 10-minute grid显示
        selectableRange: '00:00:00 - 23:59:59'
      },
      barTenderConfig: {
        enabled: true,
        endpoint: 'http://127.0.0.1:9123/print',
        apiKey: '',
        templateRollLabel: 'COATING_ROLL_LABEL',
        templateInboundSheet: 'COATING_INBOUND_SHEET',
        timeoutMs: 30000,
        printConcurrency: 3,
        allowBrowserFallback: false
      },
      printPreviewEnabled: true,
      rewindingLabelTab: 'print',
      packagingStaffOptions: [],
      customerMaterialAliasCache: {},
      materialNameByCodeCache: {},
      colorNameByCodeCache: {},
      detailQrScanInput: '',
      detailScanPrintMode: false,
      detailScanBusy: false,
      detailScanRecords: [],
      detailScanAutoTimer: null,
      lastScannedQrText: '',
      detailOrderItemsCache: {},
      detailOrderCustomerCache: {},
      detailOrderCustomerOrderNoCache: {},
      detailOrderRemarkCache: {},
      deliveryNoticeNoCache: {},
      companyInfoCache: {
        companyName: '',
        address: '',
        phone: ''
      },
      detailResolveCache: {},
      cartonPresetOptions: [],
      slittingPackingPreview: {
        viewWidth: 280,
        viewHeight: 200,
        padding: 8,
        boxWidthPx: 0,
        boxHeightPx: 0,
        circles: [],
        count: 0,
        diameterRoundedMm: 0,
        requestedCount: 0,
        fitsRequested: true,
        requestedRollCount: 0
      },
      slittingTubePerBoxManual: false,
      slittingIssuedBatchOptions: [],
      shiftProductionSummary: {
        shiftCode: '',
        monthArea: 0,
        yearArea: 0
      },
      taskQuerySuggestionPool: {
        orderNos: [],
        materialCodes: [],
        specs: []
      }
    }
  },
  computed: {
    isCoating() { return this.fixedType === 'coating' || this.query.type === 'coating' },
    isRewinding() { return this.fixedType === 'rewinding' || this.query.type === 'rewinding' },
    isSlitting() { return this.fixedType === 'slitting' || this.query.type === 'slitting' },
    showCompletedToggle: {
      get() {
        const finishFilter = String((this.query && this.query.finishState) || '').toUpperCase()
        return finishFilter !== 'UNCOMPLETED'
      },
      set(val) {
        this.query.finishState = val ? '' : 'UNCOMPLETED'
      }
    },
    isLabelPrintMode() { return this.reportDialogMode === 'print' },
    isPlanMode() { return ['coating', 'rewinding', 'slitting'].includes((this.fixedType || '').toLowerCase()) },
    orderNoVisible() { return !this.isCoating || this.showOrderNo },
    hasRealtimeKeywordFilter() {
      return !!(this.normalizeKeywordText(this.query.materialCodeKeyword) || this.normalizeKeywordText(this.query.specKeyword))
    },
    reportDialogWidth() {
      if (this.isLabelPrintMode && this.reportForm && this.reportForm.processType === 'SLITTING') {
        return '1220px'
      }
      return '860px'
    },
    reportDialogClass() {
      return this.isLabelPrintMode && this.reportForm && this.reportForm.processType === 'SLITTING'
        ? 'slitting-print-dialog'
        : ''
    },
    liveFilteredList() {
      const source = Array.isArray(this.list) ? this.list : []
      if (!source.length) return []
      const filtered = this.applyTaskKeywordFilters(source, {
        ft: (this.fixedType || this.query.type || '').toLowerCase(),
        materialCodeKeyword: this.query.materialCodeKeyword,
        specKeyword: this.query.specKeyword
      })
      return this.sortTaskList(filtered)
    },
    taskMaterialCodeCount() {
      if (!this.hasRealtimeKeywordFilter) return Number(this.taskSummary.reportedMaterialCodeCount || 0)
      return Number(this.calcTaskSummary(this.liveFilteredList).reportedMaterialCodeCount || 0)
    },
    taskTotalArea() {
      if (!this.hasRealtimeKeywordFilter) return Number(this.taskSummary.reportedArea || 0)
      return Number(this.calcTaskSummary(this.liveFilteredList).reportedArea || 0)
    },
    taskGridColspan() {
      let count = 6
      if (this.showTaskNo) count += 1
      if (this.orderNoVisible) count += 1
      if (this.showMaterialName) count += 1
      if (!this.fixedType) count += 1
      if (this.isCoating) count += 4
      if (this.isRewinding || this.isSlitting) count += 1
      if (this.isRewinding) count += 1
      if (this.isSlitting) count += 1
      if (this.isCoating && !this.isPlanMode) count += 2
      return count
    },
    currentOperatorName() {
      return this.$store.getters.realName || this.$store.getters.name || 'unknown'
    },
    coatingLockSections() {
      const rows = Array.isArray(this.coatingIssueForm && this.coatingIssueForm.lockRows) ? this.coatingIssueForm.lockRows : []
      if (!rows.length) return []
      const keyOrder = ['GLUE', 'ISOLATOR', 'RELEASE', 'BASE', 'FILM', 'OTHER']
      const labelMap = {
        GLUE: '胶水',
        ISOLATOR: '隔离剂',
        RELEASE: '离型剂',
        BASE: '基材',
        FILM: '基材',
        OTHER: '其他'
      }
      const normalize = (v) => {
        const key = String(v || '').trim().toUpperCase()
        return key || 'OTHER'
      }
      const groups = {}
      rows.forEach(row => {
        if (!row) return
        const key = normalize(row.sectionKey)
        if (!groups[key]) groups[key] = []
        groups[key].push(row)
      })
      return keyOrder
        .filter(k => Array.isArray(groups[k]) && groups[k].length > 0)
        .map(k => ({ key: k, label: labelMap[k] || '其他', rows: groups[k] }))
    },
    reportOrderSpecText() {
      return this.getOrderItemSpec(this.reportForm || {})
    },
    reportOrderNoDisplay() {
      const form = this.reportForm || {}
      const orderNo = String(form.orderNo || '').trim()
      const customerOrderNo = String(form.customerOrderNo || '').trim()
      return customerOrderNo || orderNo || '-'
    },
    isPrintConfigAdmin() {
      const roles = this.$store.getters.roles
      if (Array.isArray(roles)) {
        return roles.includes('admin')
      }
      return false
    },
    currentWorkGroup() {
      const fromGetter = this.$store.getters.workGroup
      const profile = this.$store.getters.userProfile || {}
      const raw = fromGetter || profile.workGroup || profile.groupName || profile.teamName || profile.classGroup || profile.shiftGroup || profile.deptName || 'A'
      const normalized = String(raw).trim().toUpperCase().replace(/班$/g, '').replace(/[^A-Z0-9]/g, '')
      return normalized || 'A'
    },
    currentUserTeamName() {
      const profile = this.$store.getters.userProfile || {}
      const raw = profile.teamName || profile.groupName || profile.workGroup || profile.classGroup || profile.shiftGroup || this.$store.getters.workGroup || ''
      const text = String(raw || '').trim()
      if (text) return text
      return `${this.currentWorkGroup || 'A'}组`
    },
    reportSegmentCount() {
      if (!this.reportForm || !this.reportForm.enableSegment) return 1
      const start = this.parseDateTimeValue(this.reportForm.startTime)
      const end = this.parseDateTimeValue(this.reportForm.endTime)
      if (!start || !end || end.getTime() <= start.getTime()) return 1
      return this.splitByShiftWindows(start, end).length || 1
    },
    pickDisabled() {
      if (this.isCoating) return true
      return !this.selected.some(x => x.lockStatus === 'LOCKED' || x.lockStatus === '锁定中')
    },
    returnDisabled() {
      if (this.isCoating) return true
      return !this.selected.some(x => x.lockStatus === 'ALLOCATED' || x.lockStatus === 'PICKED' || x.lockStatus === '已领料')
    }
  },
  watch: {
    fixedType(val) {
      this.query.type = val || ''
      if (String(val || '').toLowerCase() !== 'coating') {
        this.taskSortField = ''
        this.taskSortOrder = ''
      }
      this.loadTasks()
    },
    reportDialogVisible(val) {
      if (!val) {
        this.focusDetailQrScanInput()
      }
    },
    'reportForm.coatingUseRewindingLabel': {
      async handler(val) {
        if (!val) return
        if (!this.reportForm || this.reportForm.processType !== 'COATING') return
        await this.ensureRewindingMotherRollCodeAuto()
        this.normalizeCoatingFirstRowForRewindingMode()
      }
    },
    'query.dateRange'(val) {
      const date = this.pickDateForLocks(val)
      if (date) {
        this.lockQuery.planDate = date
      }
    }
  },
  created() {
    if (this.fixedType) this.query.type = this.fixedType
    const today = this.todayDate()
    if (!Array.isArray(this.query.dateRange) || this.query.dateRange.length === 0) {
      this.query.dateRange = [today, today]
    }
    this.loadBarTenderConfig()
    if (this.standaloneLabelOnly) {
      this.initStandaloneRewindingLabelForm()
      this.loadPackagingStaffOptions()
      return
    }
    this.lockQuery.planDate = today
    this.loadShiftProductionSummary()
    this.loadTasks()
  },
  mounted() {
    this.focusDetailQrScanInput()
  },
  activated() {
    this.focusDetailQrScanInput()
  },
  methods: {
    initStandaloneRewindingLabelForm() {
      this.reportDialogMode = 'print'
      this.reportDialogVisible = false
      this.reportForm = {
        ...this.reportForm,
        scheduleId: null,
        orderDetailId: null,
        processType: 'REWINDING',
        taskNo: '',
        orderNo: '',
        customerOrderNo: '',
        customerCode: '',
        orderDetailRemark: '',
        lineNo: '',
        materialCode: '',
        materialName: '',
        batchNo: '',
        thickness: '',
        widthMm: null,
        lengthM: null,
        rewindingSpec: '',
        rewindingMotherRollCode: '',
        rewindingLabelLengthM: null,
        rewindingMotherInfo: null,
        rewindingSerialStart: 1,
        rewindingPrintCount: 1,
        producedQty: null,
        producedRolls: [],
        materialIssues: [],
        startTime: this.toDateTimeString(new Date()),
        endTime: this.toDateTimeString(new Date()),
        operator: this.buildOperatorWithGroup(),
        remark: ''
      }
      this.rewindingLabelTab = 'print'
    },
    async loadPackagingStaffOptions() {
      try {
        const [staffRes, workshopRes] = await Promise.all([
          getAllActiveStaff(),
          getWorkshopList({ status: 1, page: 1, size: 200 }).catch(() => null)
        ])

        const rows = (staffRes && (staffRes.code === 200 || staffRes.code === 20000) && Array.isArray(staffRes.data)) ? staffRes.data : []
        const workshopRecords = workshopRes && (workshopRes.code === 200 || workshopRes.code === 20000)
          ? ((workshopRes.data && (workshopRes.data.records || workshopRes.data.list)) || [])
          : []

        const rewindingSlittingWorkshopPattern = /(复卷\s*分切|复卷\s*\/\s*分切|分切\s*复卷|rewinding\s*\/?\s*slitting)/i
        const workshopIdSet = new Set(
          (Array.isArray(workshopRecords) ? workshopRecords : [])
            .filter(item => rewindingSlittingWorkshopPattern.test(String((item && item.workshopName) || '').trim()))
            .map(item => Number(item && item.id))
            .filter(id => Number.isFinite(id) && id > 0)
        )

        const options = rows
          .filter(item => {
            const workshopId = Number(item && item.workshopId)
            const workshop = String((item && item.workshopName) || '').trim()
            const department = String((item && item.department) || '').trim()
            const team = String((item && item.teamName) || '').trim()
            const tags = `${workshop}|${department}|${team}`

            if (workshopIdSet.size > 0) {
              if (Number.isFinite(workshopId) && workshopIdSet.has(workshopId)) return true
            }

            // 兜底：防止车间ID未返回或主数据名称存在细微差异导致过滤为空
            return /(复卷.*分切|分切.*复卷|rewinding|slitting)/i.test(tags)
          })
          .map(item => {
            const id = item && item.id
            const name = String((item && item.staffName) || '').trim()
            const code = String((item && item.staffCode) || '').trim()
            const workshop = String((item && item.workshopName) || '').trim()
            const team = String((item && item.teamName) || '').trim()
            return {
              id,
              value: name,
              label: code
                ? `${name}(${code})${workshop ? ` - ${workshop}` : ''}${team ? `/${team}` : ''}`
                : `${name}${workshop ? ` - ${workshop}` : ''}${team ? `/${team}` : ''}`
            }
          })
          .filter(x => x.id && x.value)

        this.packagingStaffOptions = options
        const current = String((this.reportForm && this.reportForm.operator) || '').trim()
        if (!current && options.length) {
          this.reportForm.operator = options[0].value
        }
      } catch (e) {
        this.packagingStaffOptions = []
      }
    },
    async queryRewindingMotherRollSuggestions(queryString, cb) {
      const keyword = String(queryString || '').trim()
      try {
        const res = await searchMotherRolls({ keyword, size: 20 })
        const rows = (res && (res.code === 200 || res.code === 20000) && Array.isArray(res.data)) ? res.data : []
        const seen = new Set()
        const list = rows
          .map(item => {
            const raw = String((item && (item.value || item.rollCode || item.motherRollCode || item.code)) || '').trim()
            const normalizedCode = this.normalizeRewindingMotherRollCode(raw)
            if (!normalizedCode) return null
            if (seen.has(normalizedCode)) return null
            seen.add(normalizedCode)
            return {
              ...item,
              rawValue: raw,
              value: normalizedCode
            }
          })
          .filter(Boolean)
        cb(list)
      } catch (e) {
        cb([])
      }
    },
    normalizeRewindingMotherRollCode(rawCode) {
      const text = String(rawCode || '').trim()
      if (!text) return ''
      return text.replace(/-\d{3}$/g, '')
    },
    handleRewindingMotherRollSelect(item) {
      if (!item || typeof item !== 'object') return
      const code = this.normalizeRewindingMotherRollCode(item.value)
      if (code) this.reportForm.rewindingMotherRollCode = code
      this.applyResolvedRewindingMotherInfo(item)
      const guard = this.ensureRewindingSerialStartMonotonic(this.reportForm.rewindingMotherRollCode, this.reportForm.rewindingSerialStart)
      this.reportForm.rewindingSerialStart = guard.startNo
    },
    formatRewindingMotherRollSpec(info) {
      const src = info || {}
      const t = Number(src.thickness)
      const w = Number(src.widthMm != null ? src.widthMm : src.width)
      const l = Number(src.lengthM != null ? src.lengthM : (src.length != null ? src.length : src.currentLength))
      const tText = Number.isFinite(t) && t > 0 ? `${t}μm` : '-'
      const wText = Number.isFinite(w) && w > 0 ? `${w}mm` : '-'
      const lText = Number.isFinite(l) && l > 0 ? `${l}m` : '-'
      if (tText === '-' && wText === '-' && lText === '-') return '-'
      return `${tText}*${wText}*${lText}`
    },
    applyResolvedRewindingMotherInfo(info) {
      const src = info || {}
      this.reportForm.rewindingMotherInfo = src

      const materialCode = String(src.materialCode || '').trim()
      const materialName = String((src.materialName || src.productName) || '').trim()
      if (materialCode) this.reportForm.materialCode = materialCode
      if (materialName) this.reportForm.materialName = materialName

      const thickness = Number(src.thickness)
      if (Number.isFinite(thickness) && thickness > 0) {
        this.reportForm.thickness = thickness
      }

      const width = Number(src.widthMm != null ? src.widthMm : src.width)
      if (Number.isFinite(width) && width > 0) {
        this.reportForm.widthMm = width
      }

      const motherLength = Number(src.lengthM != null ? src.lengthM : (src.length != null ? src.length : src.currentLength))
      if (!(Number(this.reportForm.rewindingLabelLengthM) > 0) && Number.isFinite(motherLength) && motherLength > 0) {
        this.reportForm.rewindingLabelLengthM = Math.trunc(motherLength)
      }
    },
    taskSortHeaderClass(field) {
      if (!this.isCoating) return ''
      return {
        'task-grid-sortable': true,
        'is-active': this.taskSortField === field
      }
    },
    taskSortMark(field) {
      if (!this.isCoating || this.taskSortField !== field || !this.taskSortOrder) return '↕'
      return this.taskSortOrder === 'asc' ? '↑' : '↓'
    },
    handleTaskHeaderSort(field) {
      if (!this.isCoating || !field) return
      if (this.taskSortField !== field) {
        this.taskSortField = field
        this.taskSortOrder = 'asc'
        return
      }
      if (this.taskSortOrder === 'asc') {
        this.taskSortOrder = 'desc'
        return
      }
      if (this.taskSortOrder === 'desc') {
        this.taskSortField = ''
        this.taskSortOrder = ''
        return
      }
      this.taskSortOrder = 'asc'
    },
    sortTaskList(rows) {
      const list = Array.isArray(rows) ? rows.slice() : []
      if (!this.isCoating || !this.taskSortField || !this.taskSortOrder) return list
      const direction = this.taskSortOrder === 'asc' ? 1 : -1
      return list.sort((a, b) => {
        const result = this.compareTaskSortRow(a, b, this.taskSortField)
        if (result !== 0) return result * direction
        const fallbackA = this.normalizeCompareText(a && (a.taskNo || a.id || ''))
        const fallbackB = this.normalizeCompareText(b && (b.taskNo || b.id || ''))
        if (fallbackA === fallbackB) return 0
        return fallbackA > fallbackB ? 1 : -1
      })
    },
    compareTaskSortRow(a, b, field) {
      const left = this.resolveTaskSortValue(a, field)
      const right = this.resolveTaskSortValue(b, field)
      const leftNum = Number(left)
      const rightNum = Number(right)
      const leftIsNum = Number.isFinite(leftNum)
      const rightIsNum = Number.isFinite(rightNum)
      if (leftIsNum && rightIsNum) {
        if (leftNum === rightNum) return 0
        return leftNum > rightNum ? 1 : -1
      }
      const leftText = this.normalizeCompareText(left)
      const rightText = this.normalizeCompareText(right)
      if (leftText === rightText) return 0
      return leftText > rightText ? 1 : -1
    },
    resolveTaskSortValue(row, field) {
      const item = row || {}
      if (field === 'orderNo') {
        return item.customerOrderNo || item.customer_order_no || item.orderNo || ''
      }
      if (field === 'planStartTime') {
        return this.resolveTaskSortTimestamp(item.planStartTime, item.planEndTime)
      }
      if (field === 'status') {
        const status = String(item.status || '').trim().toUpperCase()
        const rankMap = { PENDING: 1, SCHEDULED: 2, IN_PROGRESS: 3, PROCESSING: 3, PARTIAL: 4, COMPLETED: 5, DONE: 5 }
        return rankMap[status] || 0
      }
      if (['thickness', 'jumboWidth', 'planLength'].includes(field)) {
        const raw = item[field]
        const num = Number(raw)
        return Number.isFinite(num) ? num : -Infinity
      }
      return item[field] || ''
    },
    resolveTaskSortTimestamp(startTime, endTime) {
      const start = this.parseDateTimeValue(startTime)
      if (start instanceof Date) return start.getTime()
      const end = this.parseDateTimeValue(endTime)
      if (end instanceof Date) return end.getTime()
      return -Infinity
    },
    handleShowCompletedToggleChange() {
      this.query.pageNum = 1
      this.loadTasks()
    },
    resolveSelectedSlittingCoreBizType() {
      const selected = String((this.reportForm && this.reportForm.slittingCoreLabelBizType) || '').trim().toUpperCase()
      return selected === 'SLITTING_CORE_LABEL_NARROW' ? 'SLITTING_CORE_LABEL_NARROW' : 'SLITTING_CORE_LABEL'
    },
    async loadShiftProductionSummary() {
      try {
        const shiftCode = this.currentWorkGroup
        const res = await getShiftProductionSummary({ shiftCode })
        if (res && (res.code === 200 || res.code === 20000)) {
          const data = res.data || {}
          this.shiftProductionSummary = {
            shiftCode: String(data.shiftCode || shiftCode || '').trim().toUpperCase(),
            monthArea: Number(data.monthArea || 0),
            yearArea: Number(data.yearArea || 0)
          }
          return
        }
      } catch (e) {
        // ignore
      }
      this.shiftProductionSummary = {
        shiftCode: String(this.currentWorkGroup || '').trim().toUpperCase(),
        monthArea: 0,
        yearArea: 0
      }
    },
    focusDetailQrScanInput() {
      this.$nextTick(() => {
        setTimeout(() => {
          const ref = this.$refs && this.$refs.detailQrScanInput
          if (!ref) return
          if (typeof ref.focus === 'function') {
            ref.focus()
            return
          }
          if (ref.$refs && ref.$refs.input && typeof ref.$refs.input.focus === 'function') {
            ref.$refs.input.focus()
          }
        }, 120)
      })
    },
    scheduleAutoHandleDetailQrScan() {
      if (this.detailScanBusy) return
      if (this.detailScanAutoTimer) {
        clearTimeout(this.detailScanAutoTimer)
        this.detailScanAutoTimer = null
      }
      const text = String(this.detailQrScanInput || '').trim()
      if (!text) return
      this.detailScanAutoTimer = setTimeout(() => {
        this.detailScanAutoTimer = null
        this.handleDetailQrScanEnter()
      }, 120)
    },
    handleDetailScanPrintModeChange() {
      this.focusDetailQrScanInput()
    },
    resolveErrorMessage(error, fallback = '操作失败') {
      const resp = error && error.response
      const data = resp && resp.data
      return (data && (data.msg || data.message)) || error.message || fallback
    },
    normalizeScanToken(value) {
      return String(value || '').trim().replace(/\s+/g, '').toUpperCase()
    },
    toSafeNumber(value) {
      const n = Number(value)
      return Number.isFinite(n) ? n : NaN
    },
    isLikelyCustomerCode(value) {
      const s = String(value || '').trim()
      if (!s) return false
      if (/[\u4e00-\u9fa5]/.test(s)) return false
      return /^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(s)
    },
    extractCustomerCodeCandidate(source) {
      const row = source || {}
      const direct = String(row.customerCode || row.customer_code || row.customerNo || row.customer_no || '').trim()
      if (direct) return direct

      const customerRaw = String(row.customer || '').trim()
      if (this.isLikelyCustomerCode(customerRaw)) return customerRaw
      return ''
    },
    extractCustomerOrderNoCandidate(source) {
      const row = source || {}
      return String(
        row.customerOrderNo ||
        row.customer_order_no ||
        row.customerOrderNumber ||
        row.customer_order_number ||
        row.customerPo ||
        row.customer_po ||
        ''
      ).trim()
    },
    async resolveCustomerCodeForReportRow(row) {
      const direct = this.extractCustomerCodeCandidate(row)
      if (direct) return direct

      const orderNo = this.resolvePrintableOrderNo((row && (row.orderNo || row.order_no)) || '')
      if (!orderNo) return ''

      if (Object.prototype.hasOwnProperty.call(this.detailOrderCustomerCache, orderNo)) {
        return String(this.detailOrderCustomerCache[orderNo] || '').trim()
      }

      try {
        const res = await getOrderDetailForProduction(orderNo, { silentError: true })
        const order = (res && (res.code === 200 || res.code === 20000)) ? (res.data || {}) : {}
        const code = this.extractCustomerCodeCandidate(order)
        this.$set(this.detailOrderCustomerCache, orderNo, code)
        return code
      } catch (e) {
        this.$set(this.detailOrderCustomerCache, orderNo, '')
        return ''
      }
    },
    async resolveCustomerOrderNoForReportRow(row) {
      const direct = this.extractCustomerOrderNoCandidate(row)
      if (direct) return direct

      const orderNo = this.resolvePrintableOrderNo((row && (row.orderNo || row.order_no)) || '')
      if (!orderNo) return ''

      if (Object.prototype.hasOwnProperty.call(this.detailOrderCustomerOrderNoCache, orderNo)) {
        return String(this.detailOrderCustomerOrderNoCache[orderNo] || '').trim()
      }

      try {
        const res = await getOrderDetailForProduction(orderNo, { silentError: true })
        const order = (res && (res.code === 200 || res.code === 20000)) ? (res.data || {}) : {}
        const customerOrderNo = this.extractCustomerOrderNoCandidate(order)
        this.$set(this.detailOrderCustomerOrderNoCache, orderNo, customerOrderNo)
        return customerOrderNo
      } catch (e) {
        this.$set(this.detailOrderCustomerOrderNoCache, orderNo, '')
        return ''
      }
    },
    normalizeCompareText(value) {
      return String(value || '').trim().replace(/\s+/g, '').toUpperCase()
    },
    async resolveDeliveryNoteNoByCustomerAndOrder(customerCode, orderNo) {
      const c = String(customerCode || '').trim()
      const o = String(orderNo || '').trim()
      if (!c || !o) return ''

      const cacheKey = `${this.normalizeCompareText(c)}|${this.normalizeCompareText(o)}`
      if (Object.prototype.hasOwnProperty.call(this.deliveryNoticeNoCache, cacheKey)) {
        return String(this.deliveryNoticeNoCache[cacheKey] || '').trim()
      }

      try {
        const res = await request({
          url: '/delivery/list',
          method: 'get',
          params: {
            pageNum: 1,
            pageSize: 50,
            orderNo: o,
            customer: c
          }
        })

        const ok = res && (res.code === 200 || res.code === 20000)
        const data = (ok && res.data) || {}
        const rows = Array.isArray(data.records)
          ? data.records
          : Array.isArray(data.list)
            ? data.list
            : Array.isArray(data)
              ? data
              : []

        const oKey = this.normalizeCompareText(o)
        // 关键修复：/delivery/list 的 customer 字段常存“客户名称”，而这里传的是客户代码。
        // 后端已按 customer 参数做过过滤，这里只需按订单号二次择优，避免再次用客户字段误过滤。
        const scoreRow = (item) => {
          const rowOrderNo = this.normalizeCompareText(item && (item.orderNo || item.order_no))
          if (!rowOrderNo) return 0
          if (rowOrderNo === oKey) return 3
          if (rowOrderNo.includes(oKey) || oKey.includes(rowOrderNo)) return 2
          return 0
        }
        const sorted = (rows || []).slice().sort((a, b) => scoreRow(b) - scoreRow(a))
        const hit = sorted.find(item => scoreRow(item) > 0) || sorted[0] || null

        const noticeNo = String((hit && (
          hit.noticeNo ||
          hit.notice_no ||
          hit.documentNo ||
          hit.document_no ||
          hit.deliveryNoteNo ||
          hit.delivery_note_no ||
          hit.deliveryNo ||
          hit.delivery_no
        )) || '').trim()
        this.$set(this.deliveryNoticeNoCache, cacheKey, noticeNo)
        return noticeNo
      } catch (e) {
        this.$set(this.deliveryNoticeNoCache, cacheKey, '')
        return ''
      }
    },
    extractDetailQrCandidates(rawText) {
      const text = String(rawText || '').trim()
      const set = new Set()
      const add = (v) => {
        const s = String(v || '').trim()
        if (!s) return
        set.add(s)
        set.add(this.normalizeScanToken(s))
      }
      add(text)
      try {
        add(decodeURIComponent(text))
      } catch (e) {
        // ignore invalid uri content
      }
      const parts = text.split(/[\s,;|]+/).filter(Boolean)
      parts.forEach(add)
      if (text.includes('/')) {
        add(text.split('/').pop())
      }
      if (text.includes('=')) {
        add(text.split('=').pop())
      }
      const odidMatch = text.match(/ODID\s*[:=]\s*(\d+)/i)
      if (odidMatch && odidMatch[1]) {
        add(odidMatch[1])
      }
      const numericHits = text.match(/\d{3,}/g) || []
      numericHits.forEach(add)
      return Array.from(set).filter(Boolean)
    },
    resolveRowDetailTokens(row) {
      const r = row || {}
      const textFields = [
        r.detailNo,
        r.orderDetailNo,
        r.order_detail_no,
        r.detail_no,
        r.itemNo,
        r.item_no
      ]
      const idFields = [
        r.orderItemId,
        r.order_detail_id,
        r.orderDetailId
      ]
      return {
        textSet: new Set(textFields.map(v => this.normalizeScanToken(v)).filter(Boolean)),
        idSet: new Set(idFields.map(v => this.toSafeNumber(v)).filter(v => Number.isFinite(v) && v > 0))
      }
    },
    findTaskRowByDetailQr(scanText) {
      const candidates = this.extractDetailQrCandidates(scanText)
      if (!candidates.length) return null
      const list = Array.isArray(this.list) ? this.list : []
      for (let i = 0; i < list.length; i++) {
        const row = list[i]
        const tokens = this.resolveRowDetailTokens(row)
        for (let j = 0; j < candidates.length; j++) {
          const candidate = candidates[j]
          const normalized = this.normalizeScanToken(candidate)
          if (normalized && tokens.textSet.has(normalized)) {
            return row
          }
          const n = this.toSafeNumber(candidate)
          if (Number.isFinite(n) && n > 0 && tokens.idSet.has(n)) {
            return row
          }
        }
      }
      return null
    },
    getOrderItemDetailTokens(item) {
      const row = item || {}
      const textFields = [
        row.detailNo,
        row.orderDetailNo,
        row.order_detail_no,
        row.detail_no,
        row.itemNo,
        row.item_no
      ]
      const idFields = [
        row.id,
        row.orderDetailId,
        row.order_detail_id,
        row.orderItemId
      ]
      return {
        textSet: new Set(textFields.map(v => this.normalizeScanToken(v)).filter(Boolean)),
        idSet: new Set(idFields.map(v => this.toSafeNumber(v)).filter(v => Number.isFinite(v) && v > 0))
      }
    },
    matchCandidateByTokens(candidates, tokens) {
      if (!Array.isArray(candidates) || !candidates.length || !tokens) return false
      for (let i = 0; i < candidates.length; i++) {
        const candidate = candidates[i]
        const normalized = this.normalizeScanToken(candidate)
        if (normalized && tokens.textSet && tokens.textSet.has(normalized)) return true
        const n = this.toSafeNumber(candidate)
        if (Number.isFinite(n) && n > 0 && tokens.idSet && tokens.idSet.has(n)) return true
      }
      return false
    },
    async getOrderItemsByOrderNo(orderNo) {
      const no = this.resolvePrintableOrderNo(orderNo)
      if (!no) return []
      if (Object.prototype.hasOwnProperty.call(this.detailOrderItemsCache, no)) {
        return Array.isArray(this.detailOrderItemsCache[no]) ? this.detailOrderItemsCache[no] : []
      }
      try {
        const res = await getOrderDetailForProduction(no, { silentError: true })
        const order = (res && (res.code === 200 || res.code === 20000)) ? (res.data || {}) : {}
        const customerCode = this.extractCustomerCodeCandidate(order)
        const customerOrderNo = this.extractCustomerOrderNoCandidate(order)
        this.$set(this.detailOrderCustomerCache, no, customerCode)
        this.$set(this.detailOrderCustomerOrderNoCache, no, customerOrderNo)
        const items = Array.isArray(order.items) ? order.items : []
        this.$set(this.detailOrderItemsCache, no, items)
        return items
      } catch (e) {
        this.$set(this.detailOrderCustomerCache, no, '')
        this.$set(this.detailOrderCustomerOrderNoCache, no, '')
        this.$set(this.detailOrderItemsCache, no, [])
        return []
      }
    },
    async resolveTaskRowByDetailIdGlobal(scanText) {
      const candidates = this.extractDetailQrCandidates(scanText)
      const numbers = candidates
        .map(x => this.toSafeNumber(x))
        .filter(x => Number.isFinite(x) && x > 0)
      const uniqueIds = Array.from(new Set(numbers))
      for (let i = 0; i < uniqueIds.length; i++) {
        const detailId = uniqueIds[i]
        if (Object.prototype.hasOwnProperty.call(this.detailResolveCache, detailId)) {
          const cached = this.detailResolveCache[detailId]
          if (cached) return cached
          continue
        }
        let row = null
        try {
          const res = await resolveOrderItemByDetailId(detailId)
          if (res && (res.code === 200 || res.code === 20000) && res.data) {
            const d = res.data || {}
            row = {
              orderNo: d.orderNo || d.order_no || '',
              orderDetailId: Number(d.orderDetailId || detailId),
              orderItemId: Number(d.orderDetailId || detailId),
              materialCode: d.materialCode || d.material_code || '',
              materialName: d.materialName || d.material_name || '',
              customerCode: this.extractCustomerCodeCandidate(d),
              thickness: d.thickness || '',
              widthMm: d.width || d.widthMm || null,
              length: d.length || d.lengthM || null,
              rolls: d.rolls,
              sqm: d.sqm,
              type: this.query.type || this.fixedType || 'slitting'
            }
          }
        } catch (e) {
          row = null
        }
        this.$set(this.detailResolveCache, detailId, row)
        if (row) return row
      }
      return null
    },
    resolveTaskRowByOrderItem(orderNo, item) {
      const list = Array.isArray(this.list) ? this.list : []
      const no = String(orderNo || '').trim()
      const idCandidates = [
        this.toSafeNumber(item && item.id),
        this.toSafeNumber(item && item.orderDetailId),
        this.toSafeNumber(item && item.order_detail_id),
        this.toSafeNumber(item && item.orderItemId)
      ].filter(v => Number.isFinite(v) && v > 0)

      const byId = list.find(row => {
        if (String((row && row.orderNo) || '').trim() !== no) return false
        const rowId = this.toSafeNumber((row && (row.orderItemId || row.order_detail_id || row.orderDetailId)))
        return Number.isFinite(rowId) && idCandidates.includes(rowId)
      })
      if (byId) return byId

      const itemMaterialCode = String((item && (item.materialCode || item.material_code)) || '').trim()
      return list.find(row => {
        if (String((row && row.orderNo) || '').trim() !== no) return false
        if (itemMaterialCode && String((row && row.materialCode) || '').trim() !== itemMaterialCode) return false
        return true
      }) || null
    },
    async findTaskRowByDetailQrWithOrderLookup(scanText) {
      const candidates = this.extractDetailQrCandidates(scanText)
      if (!candidates.length) return null
      const orderNos = Array.from(new Set((this.list || []).map(x => String((x && x.orderNo) || '').trim()).filter(Boolean)))
      for (let i = 0; i < orderNos.length; i++) {
        const orderNo = orderNos[i]
        const items = await this.getOrderItemsByOrderNo(orderNo)
        if (!items.length) continue
        for (let j = 0; j < items.length; j++) {
          const item = items[j]
          const tokens = this.getOrderItemDetailTokens(item)
          if (!this.matchCandidateByTokens(candidates, tokens)) continue
          const row = this.resolveTaskRowByOrderItem(orderNo, item)
          if (row) return row
        }
      }
      return null
    },
    pushDetailScanRecord(record) {
      const rows = Array.isArray(this.detailScanRecords) ? this.detailScanRecords.slice() : []
      rows.unshift(record)
      this.detailScanRecords = rows.slice(0, 20)
    },
    async handleDetailQrScanEnter() {
      if (this.detailScanAutoTimer) {
        clearTimeout(this.detailScanAutoTimer)
        this.detailScanAutoTimer = null
      }
      const raw = String(this.detailQrScanInput || '').trim()
      this.detailQrScanInput = ''
      if (!raw || this.detailScanBusy) return
      this.detailScanBusy = true
      try {
        this.lastScannedQrText = raw
        let matched = this.findTaskRowByDetailQr(raw)
        if (!matched) {
          matched = await this.resolveTaskRowByDetailIdGlobal(raw)
        }
        if (!matched) {
          matched = await this.findTaskRowByDetailQrWithOrderLookup(raw)
        }
        const now = this.toDateTimeString(new Date())
        if (!matched) {
          this.lastScannedQrText = ''
          this.pushDetailScanRecord({
            scanText: raw,
            orderNo: '-',
            materialCode: '-',
            spec: '-',
            ok: false,
            time: now
          })
          this.$message.warning('未匹配到任务，请确认任务列表已加载对应订单')
          return
        }

        const spec = this.getOrderItemSpec(matched)
        this.pushDetailScanRecord({
          scanText: raw,
          orderNo: matched.orderNo || '-',
          materialCode: matched.materialCode || '-',
          spec,
          ok: true,
          time: now
        })
        await this.openReportDialog(matched, this.detailScanPrintMode ? 'print' : 'report')
      } finally {
        this.detailScanBusy = false
        this.$nextTick(() => {
          if (this.$refs && this.$refs.detailQrScanInput && typeof this.$refs.detailQrScanInput.focus === 'function') {
            this.$refs.detailQrScanInput.focus()
          }
        })
      }
    },
    getDefaultCartonPreset() {
      const list = Array.isArray(this.cartonPresetOptions) ? this.cartonPresetOptions : []
      const rank13 = (item) => {
        const label = String((item && item.label) || '').trim().toUpperCase()
        const value = String((item && item.value) || '').trim().toUpperCase()
        const text = `${label} ${value}`
        if (/13\s*#/.test(text) || /13\s*号/.test(text)) return 3
        if (/(^|[^0-9])13([^0-9]|$)/.test(text)) return 2
        return 0
      }
      const prefer13 = list
        .map(item => ({ item, score: rank13(item) }))
        .filter(x => x.score > 0)
        .sort((a, b) => b.score - a.score)[0]
      return list.length
        ? ((prefer13 && prefer13.item) || list[0])
        : { value: '', lengthMm: 0, widthMm: 0, heightMm: 0 }
    },
    loadBarTenderConfig() {
      this.barTenderConfig = getBarTenderConfig(this.barTenderConfig)
    },
    async loadCartonPresetOptions() {
      let list = []
      try {
        const res = await getCartonSpecList({ page: 1, size: 200, status: 1 })
        if (res && (res.code === 200 || res.code === 20000)) {
          const rows = Array.isArray(res.data && res.data.records) ? res.data.records : []
          list = rows.map(item => ({
            value: `${item.specName || 'SPEC'}_${item.id || ''}`,
            label: `${item.specName || '未命名纸箱'}（${item.lengthMm || 0}×${item.widthMm || 0}×${item.heightMm || 0}mm）`,
            lengthMm: Number(item.lengthMm || 0),
            widthMm: Number(item.widthMm || 0),
            heightMm: Number(item.heightMm || 0)
          })).filter(x => x.lengthMm > 0 && x.widthMm > 0 && x.heightMm > 0)
        }
      } catch (e) {
        list = []
      }
      this.cartonPresetOptions = Array.isArray(list) ? list : []
      if (this.reportForm) {
        const selected = String((this.reportForm && this.reportForm.cartonPreset) || '').trim()
        const hit = selected ? this.cartonPresetOptions.find(x => x && x.value === selected) : null
        const target = hit || this.getDefaultCartonPreset()
        this.reportForm.cartonPreset = String((target && target.value) || '')
        this.reportForm.cartonLengthMm = Number((target && target.lengthMm) || 0)
        this.reportForm.cartonWidthMm = Number((target && target.widthMm) || 0)
        this.reportForm.cartonHeightMm = Number((target && target.heightMm) || 0)
      }
    },
    buildMaterialAliasCacheKey(customerCode, materialCode, customerOrderNo, thickness, width, length) {
      const c = String(customerCode || '').trim().toUpperCase()
      const m = String(materialCode || '').trim().toUpperCase()
      const t = Number(thickness || 0)
      const w = Number(width || 0)
      const l = Number(length || 0)
      return `${c}|${m}|${Number.isFinite(t) ? t.toFixed(3) : ''}|${Number.isFinite(w) ? w.toFixed(2) : ''}|${Number.isFinite(l) ? l.toFixed(2) : ''}`
    },
    buildMaterialCodeCandidatesForAlias(materialCode) {
      const raw = String(materialCode || '').trim()
      if (!raw) return []
      const set = new Set()
      const add = (v) => {
        const text = String(v || '').trim()
        if (text) set.add(text)
      }

      add(raw)

      // 去掉诸如 "1011-" 之类的前缀编码
      add(raw.replace(/^\d{2,}-/, ''))

      // 去掉 "/" 后附加段（如客户扩展后缀）
      const slashIdx = raw.indexOf('/')
      if (slashIdx > 0) {
        add(raw.slice(0, slashIdx))
      }

      // 去掉末尾短标识（如 -HT、-A）
      add(raw.replace(/-[A-Za-z]{1,4}$/i, ''))

      // 组合回退：先去前缀再去后缀
      const noPrefix = raw.replace(/^\d{2,}-/, '')
      add(noPrefix.replace(/-[A-Za-z]{1,4}$/i, ''))

      return Array.from(set)
    },
    async resolveCustomerMaterialAliasForPrint({ customerCode, materialCode, customerOrderNo, thickness, width, length }) {
      const c = String(customerCode || '').trim()
      const m = String(materialCode || '').trim()
      if (!c || !m) return null

      const key = this.buildMaterialAliasCacheKey(c, m, '', thickness, width, length)
      if (Object.prototype.hasOwnProperty.call(this.customerMaterialAliasCache, key)) {
        return this.customerMaterialAliasCache[key]
      }

      try {
        const materialCandidates = this.buildMaterialCodeCandidatesForAlias(m)
        let alias = null
        for (let i = 0; i < materialCandidates.length; i++) {
          const candidate = materialCandidates[i]
          const res = await matchCustomerMaterialMapping({
            customerCode: c,
            materialCode: candidate,
            thickness: Number(thickness || 0) > 0 ? Number(thickness) : undefined,
            width: Number(width || 0) > 0 ? Number(width) : undefined,
            length: Number(length || 0) > 0 ? Number(length) : undefined
          })
          alias = (res && (res.code === 200 || res.code === 20000)) ? (res.data || null) : null
          if (alias) break
        }
        this.$set(this.customerMaterialAliasCache, key, alias)
        return alias
      } catch (e) {
        this.$set(this.customerMaterialAliasCache, key, null)
        return null
      }
    },
    applyMaterialAlias(payload, alias, internalMaterialCode, internalMaterialName) {
      const customerMaterialCode = String((alias && alias.customerMaterialCode) || '').trim()
      const customerMaterialName = String((alias && alias.customerMaterialName) || '').trim()
      const customerSpec = String((alias && alias.customerSpec) || '').trim()
      const mappedRemark = String((alias && alias.remark) || '').trim()
      const orderNo = String(((payload || {}).orderNo) || '').trim()
      const customerOrderNo = String(((payload || {}).customerOrderNo) || '').trim()
      const materialCode = customerMaterialCode || String(internalMaterialCode || '').trim()
      const materialName = customerMaterialName || String(internalMaterialName || '').trim()
      const nextPayload = {
        ...(payload || {}),
        materialCode,
        materialName,
        ...(customerSpec ? { spec: customerSpec } : {}),
        ...(customerSpec ? { specification: customerSpec } : {}),
        ...(mappedRemark ? { remark: mappedRemark } : {}),
        orderNoDisplay: customerOrderNo || orderNo || '',
        productName: materialName,
        product_name: materialName,
        internalMaterialCode: String(internalMaterialCode || '').trim(),
        internalMaterialName: String(internalMaterialName || '').trim(),
        internalProductName: String(internalMaterialName || '').trim(),
        customerMaterialCode,
        customerMaterialName,
        customerSpec,
        customerSpecText: customerSpec,
        customerProductName: customerMaterialName || materialName
      }
      const specText = String((nextPayload.spec != null ? nextPayload.spec : nextPayload.specification) || '').trim()
      if (specText) {
        nextPayload.spec = specText
        nextPayload.specification = specText
      }
      return nextPayload
    },
    getPrintScene(type) {
      const sceneType = String(type || '').trim()
      if (sceneType === 'roll-label') {
        return {
          sceneName: '母卷标签',
          bizType: 'COATING_ROLL_LABEL',
          defaultTemplate: () => (this.barTenderConfig && this.barTenderConfig.templateRollLabel) || 'COATING_ROLL_LABEL',
          customerCode: () => String((this.reportForm && this.reportForm.customerCode) || '').trim(),
          buildOptions: row => ({
            copies: 1,
            jobName: `ROLL_LABEL_${String((row && row.rollCode) || 'NA').trim() || 'NA'}`
          }),
          buildData: (row, runtime = {}) => {
            const roll = row || {}
            const rollCode = String(roll.rollCode || '').trim()
            const width = Number(roll.widthMm || 0)
            const length = Number(roll.lengthM || 0)
            const area = this.calcRollArea(width, length)
            const materialCode = String((this.reportForm && this.reportForm.materialCode) || '').trim()
            const materialName = this.resolveMaterialNameByCode(materialCode)
            const spec = this.getOrderItemSpec({
              ...(this.reportForm || {}),
              widthMm: Number.isFinite(width) ? width : '-',
              lengthM: Number.isFinite(length) ? length : '-'
            })
            const printTime = this.toDateTimeString(new Date())
            const productionDateText = String((this.reportForm && this.reportForm.labelProductionDate) || '').trim() || this.toDateString((this.reportForm && this.reportForm.startTime) || printTime)
            const productionDate = this.toDateString(productionDateText)
            const productionDate8 = this.toCompactDateStringStrict(productionDateText)
            const productionDate6 = this.toCompactDateYYMMDD(productionDateText)
            const groupNo = this.currentUserTeamName
            const labelOrderNo = this.resolveLabelOrderNo(this.reportForm)

            const payload = {
              rollCode,
              groupNo,
              workGroup: groupNo,
              teamName: groupNo,
              qty: 1,
              spec,
              widthMm: Number.isFinite(width) ? width : 0,
              lengthM: Number.isFinite(length) ? length : 0,
              areaM2: Number(this.formatAreaNum(area)),
              productionDate: productionDate6,
              productionDate8,
              productionDate6,
              productionDateText: productionDate,
              produtionDate: productionDate6,
              scheduleId: this.reportForm.scheduleId || '',
              orderNo: labelOrderNo,
              internalOrderNo: this.reportForm.orderNo || '',
              customerOrderNo: this.reportForm.customerOrderNo || '',
              qrText: rollCode,
              printDate: productionDate,
              operator: this.reportForm.operator || '-',
              printTime
            }
            return this.applyMaterialAlias(payload, runtime.alias, materialCode, materialName)
          }
        }
      }

      if (sceneType === 'rewinding-label') {
        return {
          sceneName: '复卷标签',
          bizType: 'REWINDING_ROLL_LABEL',
          defaultTemplate: () => 'COATING_ROLL_LABEL',
          customerCode: () => String((this.reportForm && this.reportForm.customerCode) || '').trim(),
          buildOptions: source => ({
            copies: 1,
            jobName: `REWINDING_LABEL_${this.buildRewindingRollSerialCode(source && source.serialNo) || 'NA'}`
          }),
          buildData: (source, runtime = {}) => {
            const materialCode = String((this.reportForm && this.reportForm.materialCode) || '').trim()
            const materialName = this.resolveMaterialNameByCode(materialCode)
            const spec = this.resolveRewindingTemplateSpec(source)
            const printTime = this.toDateTimeString(new Date())
            const serialNo = Number(source && source.serialNo)
            const rollSerialCode = this.buildRewindingRollSerialCode(serialNo)
            const productionDateText = String((this.reportForm && this.reportForm.labelProductionDate) || '').trim() ||
              this.toDateString((this.reportForm && this.reportForm.startTime) || printTime)
            const productionDate = this.toDateString(productionDateText)
            const productionDate8 = this.toCompactDateStringStrict(productionDateText)
            const productionDate6 = this.toCompactDateYYMMDD(productionDateText)
            const groupNo = this.currentUserTeamName
            const labelOrderNo = this.resolveLabelOrderNo(this.reportForm)
            const srcWidth = Number(source && source.widthMm)
            const srcLength = Number(source && source.lengthM)
            const formLength = Number((this.reportForm && this.reportForm.rewindingLabelLengthM) || 0)
            const motherWidth = Number((this.reportForm && this.reportForm.rewindingMotherInfo && (this.reportForm.rewindingMotherInfo.widthMm != null ? this.reportForm.rewindingMotherInfo.widthMm : this.reportForm.rewindingMotherInfo.width)) || 0)
            const widthMm = Number.isFinite(srcWidth) && srcWidth > 0
              ? srcWidth
              : (Number.isFinite(motherWidth) && motherWidth > 0
                ? motherWidth
                : Number((this.reportForm && this.reportForm.widthMm) || 0))
            const lengthM = Number.isFinite(srcLength) && srcLength > 0
              ? srcLength
              : (Number.isFinite(formLength) && formLength > 0
                ? formLength
                : Number((this.reportForm && this.reportForm.lengthM) || 0))

            const payload = {
              spec,
              specification: spec,
              rollCode: rollSerialCode,
              qrText: rollSerialCode,
              rollSerialCode,
              serialNo: Number.isFinite(serialNo) ? serialNo : Number(this.reportForm.rewindingSerialStart || 1),
              groupNo,
              workGroup: groupNo,
              teamName: groupNo,
              productionDate: productionDate6,
              productionDate8,
              productionDate6,
              productionDateText: productionDate,
              produtionDate: productionDate6,
              printDate: productionDate6,
              scheduleId: this.reportForm.scheduleId || '',
              orderNo: labelOrderNo,
              internalOrderNo: this.reportForm.orderNo || '',
              customerOrderNo: this.reportForm.customerOrderNo || '',
              widthMm: Number.isFinite(widthMm) ? widthMm : 0,
              lengthM: Number.isFinite(lengthM) ? lengthM : 0,
              processType: 'REWINDING',
              operator: this.reportForm.operator || '-',
              printTime
            }
            const merged = this.applyMaterialAlias(payload, runtime.alias, materialCode, materialName)
            // 复卷标签规格必须使用复卷长度，不能被客户规格映射覆盖
            return {
              ...merged,
              spec,
              specification: spec
            }
          }
        }
      }

      if (sceneType === 'slitting-core-label' || sceneType === 'slitting-inner-label' || sceneType === 'slitting-outer-label' || sceneType === 'slitting-pallet-label') {
        const coreBizType = this.resolveSelectedSlittingCoreBizType()
        const sceneMap = {
          'slitting-core-label': {
            sceneName: coreBizType === 'SLITTING_CORE_LABEL_NARROW' ? '分切窄管芯标签' : '分切卷芯标签',
            bizType: coreBizType,
            defaultTemplate: coreBizType
          },
          'slitting-inner-label': { sceneName: '分切内标签', bizType: 'SLITTING_INNER_LABEL', defaultTemplate: 'SLITTING_INNER_LABEL' },
          'slitting-outer-label': { sceneName: '分切外标签', bizType: 'SLITTING_OUTER_LABEL', defaultTemplate: 'SLITTING_OUTER_LABEL' },
          'slitting-pallet-label': { sceneName: '分切栈板标签', bizType: 'SLITTING_PALLET_LABEL', defaultTemplate: 'SLITTING_PALLET_LABEL' }
        }
        const sceneMeta = sceneMap[sceneType]
        return {
          sceneName: sceneMeta.sceneName,
          bizType: sceneMeta.bizType,
          defaultTemplate: () => sceneMeta.defaultTemplate,
          customerCode: () => String((this.reportForm && this.reportForm.customerCode) || '').trim(),
          buildOptions: source => ({
            copies: Math.max(1, Math.trunc(Number((source && source.copies) || 1) || 1)),
            jobName: `${sceneMeta.bizType}_${String((source && source.serialNo) || 'NA').trim() || 'NA'}`
          }),
          buildData: (source, runtime = {}) => {
            const serialNo = Number(source && source.serialNo)
            const printTime = this.toDateTimeString(new Date())
            const materialCode = String((this.reportForm && this.reportForm.materialCode) || '').trim()
            const materialName = this.resolveMaterialNameByCode(materialCode)
            const producedQty = Math.max(1, Math.trunc(Number((this.reportForm && this.reportForm.producedQty) || 0) || 0))
            const defaultRollPerTube = this.calcSlittingDefaultRollPerTube(this.reportForm && this.reportForm.widthMm)
            const rollPerTube = Math.max(1, Math.trunc(Number((this.reportForm && this.reportForm.slittingRollPerTube) || 0) || defaultRollPerTube))
            const tubeRollCount = Math.max(0, Math.trunc(Number((this.reportForm && this.reportForm.slittingTubeRollCount) || 0) || 0))
            const tubePerBoxCount = Math.max(0, Math.trunc(Number((this.reportForm && this.reportForm.slittingTubePerBoxCount) || 0) || 0))
            const quantityPerLabel = Math.max(1, Math.trunc(Number(source && source.quantityOverride) || 0) || tubeRollCount || rollPerTube)
            const serialStart = Number.isFinite(serialNo) ? serialNo : 1
            const serialNoText = this.formatSerialNoRange(serialStart, 1)
            const serialNoEnd = serialStart
            const perBoxRolls = (tubeRollCount > 0 && tubePerBoxCount > 0) ? (tubeRollCount * tubePerBoxCount) : 0
            const isOuterLabel = sceneType === 'slitting-outer-label'
            const isInnerLabel = sceneType === 'slitting-inner-label' || sceneType === 'slitting-core-label'
            const quantityUnit = isOuterLabel ? '卷/箱' : '卷/筒'
            // 关键修复：当前标签数量应当使用 quantityPerLabel，而不是固定的 perBoxRolls，否则尾卷/尾箱的数量和米数会计算错误
            const currentBoxRollCount = quantityPerLabel
            const packageQty = this.calcPackagingQtyByLength((this.reportForm && this.reportForm.lengthM), currentBoxRollCount)
            const packageQtyValue = this.formatPackagingQtyByLength((this.reportForm && this.reportForm.lengthM), currentBoxRollCount)
            const coreOuterDiameterMm = Number((this.reportForm && this.reportForm.coreOuterDiameterMm) || 0)
            const tapeOuterDiameterMm = this.calcSlittingTapeOuterDiameterMm(this.reportForm || {})
            const batchNo = String(
              (this.reportForm && (
                this.reportForm.batchNo ||
                this.reportForm.issueBatchNo ||
                this.reportForm.slittingBatchNo ||
                this.reportForm.batch_no
              )) || ''
            ).trim()
            const lineNo = String((this.reportForm && (this.reportForm.lineNo || this.reportForm.orderDetailRemark)) || '').trim()
            const batchNo2 = batchNo ? `FN${batchNo}` : ''
            const productionDateText = this.toDateString(String((this.reportForm && this.reportForm.labelProductionDate) || '').trim() || this.toDateString((this.reportForm && this.reportForm.startTime) || printTime))
            const shipDateText = this.toDateString(String((this.reportForm && this.reportForm.labelShipDate) || '').trim() || this.resolveDateTextFromRow(this.reportForm || {}))
            const productionDate = this.toCompactDateYYMMDD(productionDateText)
            const productionDate8 = this.toCompactDateStringStrict(productionDateText)
            const shipDate = this.toCompactDateStringStrict(shipDateText)
            const deliveryNoteNo = String((this.reportForm && this.reportForm.deliveryNoteNo) || '').trim()
            const shelfLifeDays = Math.max(0, Math.trunc(Number((this.reportForm && this.reportForm.shelfLifeDays) || 0) || 0))
            const expiryDate = this.calcExpiryDate(productionDate8 || productionDate, shelfLifeDays)
            const expiryDate8 = expiryDate && expiryDate !== '-' ? expiryDate.replace(/\./g, '') : ''
            const expiryDate6 = expiryDate8.length === 8 ? expiryDate8.slice(2) : ''
            const expiryDateText = expiryDate8.length === 8 ? `${expiryDate8.slice(0, 4)}-${expiryDate8.slice(4, 6)}-${expiryDate8.slice(6, 8)}` : ''

            const customerShortName = String((this.reportForm && this.reportForm.customerShortName) || '').trim()
            const myCompanyName = String((this.reportForm && this.reportForm.myCompanyName) || '东莞市方恩电子材料科技有限公司').trim()
            const myCompanyAddress = String((this.reportForm && this.reportForm.myCompanyAddress) || '广东省东莞市桥头镇东新路13号2号楼102室').trim()
            const myCompanyPhone = String((this.reportForm && this.reportForm.myCompanyPhone) || '0769-82551118').trim()
            const boxWeightKg = Number((this.reportForm && this.reportForm.boxWeightKg) || 0)
            const boxWeightValue = Number.isFinite(boxWeightKg) && boxWeightKg > 0 ? Number(boxWeightKg.toFixed(2)) : null
            const digitalNo = String((this.reportForm && this.reportForm.slittingDigitalNo) || '').trim()
            const labelOrderNo = this.resolveLabelOrderNo(this.reportForm)
            const qtyOrWeight = this.resolveQtyOrWeightText({
              grossWeightKg: boxWeightValue,
              boxRollCount: currentBoxRollCount,
              quantityUnit
            })
            const shelfLifeText = shelfLifeDays > 0 ? String(shelfLifeDays) : ''
            const payload = {
              sceneType,
              processType: 'SLITTING',
              orderNo: labelOrderNo,
              internalOrderNo: (this.reportForm && this.reportForm.orderNo) || '',
              customerOrderNo: (this.reportForm && this.reportForm.customerOrderNo) || '',
              taskNo: (this.reportForm && this.reportForm.taskNo) || '',
              batchNo,
              batchNo2,
              batchchNo2: batchNo2,
              issueBatchNo: batchNo,
              slittingBatchNo: batchNo,
              lineNo,
              line_no: lineNo,
              hanghao: lineNo,
              xinghao: lineNo,
              orderDetailRemark: lineNo,
              spec: this.formatSlittingSpec(this.reportForm || {}),
              scheduleId: (this.reportForm && this.reportForm.scheduleId) || '',
              orderDetailId: (this.reportForm && this.reportForm.orderDetailId) || '',
              producedQty,
              rollPerTube: quantityPerLabel,
              rollPerTubeRaw: quantityPerLabel,
              standardRollPerTube: rollPerTube,
              tubePerBoxCount,
              tubeRollCount: quantityPerLabel,
              tubeRollCountRaw: quantityPerLabel,
              standardTubeRollCount: tubeRollCount,
              boxRollCount: currentBoxRollCount,
              currentBoxRollCount,
              cartonRollCount: currentBoxRollCount,
              rollsPerBox: currentBoxRollCount,
              rollsInBox: currentBoxRollCount,
              slittingQty: currentBoxRollCount,
              standardBoxRollCount: perBoxRolls,
              boxRollCountCapacity: perBoxRolls,
              quantity: quantityPerLabel,
              qty: quantityPerLabel,
              labelQty: quantityPerLabel,
              quantityPerLabel,
              quantityUnit,
              quantityText: `${currentBoxRollCount}${quantityUnit}`,
              boxRollCountText: `${currentBoxRollCount}卷/箱`,
              packageQty,
              packageQtyM: packageQty,
              packageQtyValue,
              packageQtyText: packageQtyValue ? `${packageQtyValue}米` : '',
              packagingQty: packageQtyValue,
              packagingQuantity: packageQtyValue,
              baozhuangshuliang: packageQtyValue,
              shuliangzhongliang: packageQtyValue,
              shuliangzhgongliang: packageQtyValue,
              productionDate: productionDate,
              productionDate8,
              productionDate6: productionDate8.length === 8 ? productionDate8.slice(2) : '',
              productionDateText,
              productionDateCompact: productionDate,
              production_date: productionDate,
              prodDate: productionDate,
              prodDateText: productionDateText,
              shengchanriqi: productionDate,
              shengchanriqiText: productionDateText,
              shipDate: shipDate,
              shipDate8: shipDate,
              shipDate6: shipDate.length === 8 ? shipDate.slice(2) : '',
              shipDateText,
              shipDateCompact: shipDate,
              ship_date: shipDate,
              deliveryDate: shipDate,
              deliveryDateText: shipDateText,
              deliveryDateCompact: shipDate,
              delivery_date: shipDate,
              chuhuoriqi: shipDate,
              chuhuoriqiText: shipDateText,
              shelfLifeDays,
              shelfLifeText,
              expiryDate, // YYYY.MM.DD
              expiryDate8: expiryDate8, // YYYYMMDD
              expiryDate6: expiryDate6, // YYMMDD
              expiryDateText: expiryDateText, // YYYY-MM-DD
              expiryDateCompact: expiryDate8,
              expiry_date: expiryDate,
              youxiaoqi: expiryDate,
              customerShortName,
              customerShort: customerShortName,
              myCompanyName,
              myCompanyAddress,
              myCompanyPhone,
              companyName: myCompanyName,
              companyAddress: myCompanyAddress,
              digitalNo,
              digitalNumber: digitalNo,
              sequenceNo: digitalNo,
              sequence_number: digitalNo,
              deliveryNoteNo,
              boxWeightKg: boxWeightValue,
              currentBoxWeightKg: boxWeightValue,
              grossWeightKg: boxWeightValue,
              netWeightKg: boxWeightValue,
              qtyOrWeight,
              boxWeightText: boxWeightValue != null ? `${boxWeightValue}kg` : '',
              remark: String((this.reportForm && this.reportForm.remark) || '').trim(),
              cartonLengthMm: Number((this.reportForm && this.reportForm.cartonLengthMm) || 0) || null,
              cartonWidthMm: Number((this.reportForm && this.reportForm.cartonWidthMm) || 0) || null,
              cartonHeightMm: Number((this.reportForm && this.reportForm.cartonHeightMm) || 0) || null,
              coreOuterDiameterMm: coreOuterDiameterMm > 0 ? coreOuterDiameterMm : null,
              tapeOuterDiameterMm,
              serialNo: serialNoText,
              serialNoStart: String(serialStart).padStart(3, '0'),
              serialNoEnd: String(serialNoEnd).padStart(3, '0'),
              serialNoNum: serialStart,
              labelCode: `${sceneMeta.bizType}-${serialNoText}`,
              operator: (this.reportForm && this.reportForm.operator) || '-',
              printDate: this.toCompactDateString((this.reportForm && this.reportForm.startTime) || printTime),
              printTime
            }
            const mergedPayload = this.applyMaterialAlias(payload, runtime.alias, materialCode, materialName)
            const qrTemplate = String((this.reportForm && this.reportForm.qrTemplate) || '').trim() || this.getDefaultSlittingQrTemplate()
            const qrContent = this.buildDynamicQrContent(qrTemplate, mergedPayload)
            mergedPayload.qrTemplate = qrTemplate
            mergedPayload.qrContent = qrContent
            mergedPayload.qrCode = qrContent
            return mergedPayload
          }
        }
      }

      return {
        sceneName: '涂布入库单',
        bizType: 'COATING_INBOUND_SHEET',
        defaultTemplate: () => (this.barTenderConfig && this.barTenderConfig.templateInboundSheet) || 'COATING_INBOUND_SHEET',
        customerCode: () => String((this.reportForm && this.reportForm.customerCode) || '').trim(),
        buildOptions: () => ({
          copies: 1,
          jobName: `COATING_INBOUND_${this.reportForm.scheduleId || 'NA'}`
        }),
        buildData: () => {
          const rolls = (this.reportForm && this.reportForm.producedRolls) || []
          const totalArea = rolls.reduce((sum, x) => {
            const w = Number(x && x.widthMm)
            const l = Number(x && x.lengthM)
            return sum + this.calcRollArea(w, l)
          }, 0)

          return {
            scheduleId: this.reportForm.scheduleId || '',
            operator: this.reportForm.operator || '-',
            startTime: this.reportForm.startTime || '-',
            endTime: this.reportForm.endTime || '-',
            totalAreaM2: Number(this.formatAreaNum(totalArea)),
            rows: rolls.map((x, i) => {
              const w = Number(x && x.widthMm)
              const l = Number(x && x.lengthM)
              return {
                seq: i + 1,
                rollCode: (x && x.rollCode) || '',
                widthMm: Number.isFinite(w) ? w : 0,
                lengthM: Number.isFinite(l) ? l : 0,
                areaM2: this.calcRollArea(w, l)
              }
            }),
            printTime: this.toDateTimeString(new Date())
          }
        }
      }
    },
    resolveRewindingSpecText() {
      const fromSpec = String((this.reportForm && this.reportForm.rewindingSpec) || '').trim()
      if (fromSpec && fromSpec !== '-') return this.normalizeSpecTextWithUnits(fromSpec)
      const form = this.reportForm || {}
      const rewindingLength = Number(form.rewindingLabelLengthM)
      const patched = {
        ...form,
        rewindingLength: Number.isFinite(rewindingLength) && rewindingLength > 0 ? rewindingLength : form.rewindingLength,
        lengthM: Number.isFinite(rewindingLength) && rewindingLength > 0 ? rewindingLength : form.lengthM,
        length: Number.isFinite(rewindingLength) && rewindingLength > 0 ? rewindingLength : form.length
      }
      return this.formatRewindingSpec(patched)
    },
    normalizeSpecTextWithUnits(rawSpec) {
      const raw = String(rawSpec || '').trim()
      if (!raw || raw === '-') return '-'
      const normalized = raw.replace(/[×Xx]/g, '*')
      const parts = normalized.split('*').map(s => String(s || '').trim()).filter(Boolean)
      if (parts.length < 3) return raw
      const pickNum = (text) => {
        const m = String(text || '').match(/\d+(?:\.\d+)?/)
        return m ? m[0] : '-'
      }
      const t = pickNum(parts[0])
      const w = pickNum(parts[1])
      const l = pickNum(parts[2])
      return `${t}μm*${w}mm*${l}m`
    },
    resolveRewindingTaskSpec(row) {
      const r = row || {}
      const fromTask = String(r.rewindingSpec || r.rewinding_spec || r.specDesc || r.spec || '').trim()
      if (fromTask) return this.normalizeSpecTextWithUnits(fromTask)
      return this.formatRewindingSpec(r)
    },
    goToPrintConfigByScene(type) {
      this.loadBarTenderConfig()
      const scene = this.getPrintScene(type)
      const sourceTitle = this.reportForm.processType === 'REWINDING'
        ? '复卷任务'
        : this.reportForm.processType === 'SLITTING'
          ? '分切任务'
          : '涂布任务'
      const fallbackPath = this.reportForm.processType === 'REWINDING'
        ? '/production-management/rewinding'
        : this.reportForm.processType === 'SLITTING'
          ? '/production-management/slitting'
          : '/production-management/coating'
      goToPrintConfig(this.$router, {
        bizType: scene.bizType,
        defaultTemplate: typeof scene.defaultTemplate === 'function' ? scene.defaultTemplate() : scene.defaultTemplate,
        customerCode: typeof scene.customerCode === 'function' ? scene.customerCode() : scene.customerCode,
        sourceTitle,
        sceneName: scene.sceneName,
        returnTo: this.$route && this.$route.fullPath ? this.$route.fullPath : fallbackPath
      })
    },
    buildRewindingRollSerialCode(serialNo) {
      const motherRollCode = this.normalizeRewindingMotherRollCode(this.reportForm && this.reportForm.rewindingMotherRollCode)
      const start = Number((this.reportForm && this.reportForm.rewindingSerialStart) || 1)
      const serial = Number.isFinite(Number(serialNo)) ? Number(serialNo) : start
      const serialWidth = Math.max(3, String(Math.trunc(start)).length)
      const serialText = String(Math.trunc(serial)).padStart(serialWidth, '0')
      if (motherRollCode && serialText) return `${motherRollCode}-${serialText}`
      return motherRollCode || serialText || ''
    },
    async resolveRewindingMotherRollInfo() {
      if (!this.reportForm || this.reportForm.processType !== 'REWINDING') return
      const code = this.normalizeRewindingMotherRollCode(this.reportForm && this.reportForm.rewindingMotherRollCode)
      if (!code) {
        this.reportForm.rewindingMotherInfo = null
        return
      }
      this.reportForm.rewindingMotherRollCode = code
      try {
        const res = await resolveMotherRollInfo(code)
        if (res && (res.code === 200 || res.code === 20000) && res.data) {
          this.applyResolvedRewindingMotherInfo(res.data || {})
          const guard = this.ensureRewindingSerialStartMonotonic(this.reportForm.rewindingMotherRollCode, this.reportForm.rewindingSerialStart)
          this.reportForm.rewindingSerialStart = guard.startNo
          return
        }
        this.reportForm.rewindingMotherInfo = null
        this.$message.warning((res && (res.msg || res.message)) || '未找到母卷信息')
      } catch (e) {
        this.reportForm.rewindingMotherInfo = null
        this.$message.error(this.resolveErrorMessage(e, '查询母卷信息失败'))
      }
    },
    resolveCoatingRewindingPrintSpec(source) {
      const src = source || {}
      const widthRaw = src.widthMm != null ? src.widthMm : (this.reportForm && this.reportForm.widthMm)
      const lengthRaw = src.lengthM != null ? src.lengthM : (this.reportForm && this.reportForm.lengthM)
      const thickness = (this.reportForm && this.reportForm.thickness) || '-'
      const width = Number(widthRaw)
      const length = Number(lengthRaw)
      const widthText = Number.isFinite(width) && width > 0 ? width : '-'
      const lengthText = Number.isFinite(length) && length > 0 ? length : '-'
      return `${thickness}μm*${widthText}mm*${lengthText}m`
    },
    resolveRewindingTemplateSpec(source) {
      if (this.reportForm && this.reportForm.processType === 'COATING') {
        return this.resolveCoatingRewindingPrintSpec(source)
      }
      const src = source || {}
      const thickness = Number((this.reportForm && this.reportForm.thickness) || 0)
      const srcWidth = Number(src.widthMm)
      const motherWidth = Number((this.reportForm && this.reportForm.rewindingMotherInfo && (this.reportForm.rewindingMotherInfo.widthMm != null ? this.reportForm.rewindingMotherInfo.widthMm : this.reportForm.rewindingMotherInfo.width)) || 0)
      const formWidth = Number((this.reportForm && this.reportForm.widthMm) || 0)
      const srcLength = Number(src.lengthM)
      const formLabelLength = Number((this.reportForm && this.reportForm.rewindingLabelLengthM) || 0)
      const formLength = Number((this.reportForm && this.reportForm.lengthM) || 0)

      const width = Number.isFinite(srcWidth) && srcWidth > 0
        ? srcWidth
        : (Number.isFinite(motherWidth) && motherWidth > 0 ? motherWidth : formWidth)
      const length = Number.isFinite(srcLength) && srcLength > 0
        ? srcLength
        : (Number.isFinite(formLabelLength) && formLabelLength > 0 ? formLabelLength : formLength)

      return `${this.formatSpecPartWithUnit(thickness, 'μm')}*${this.formatSpecPartWithUnit(width, 'mm')}*${this.formatSpecPartWithUnit(length, 'm')}`
    },
    getRewindingSerialStoreKey() {
      return 'MES_REWINDING_PRINTED_SERIAL_MAX_MAP'
    },
    loadRewindingSerialMaxMap() {
      try {
        if (typeof window === 'undefined' || !window.localStorage) return {}
        const raw = window.localStorage.getItem(this.getRewindingSerialStoreKey())
        if (!raw) return {}
        const parsed = JSON.parse(raw)
        return parsed && typeof parsed === 'object' ? parsed : {}
      } catch (e) {
        return {}
      }
    },
    saveRewindingSerialMaxMap(mapObj) {
      try {
        if (typeof window === 'undefined' || !window.localStorage) return
        const payload = mapObj && typeof mapObj === 'object' ? mapObj : {}
        window.localStorage.setItem(this.getRewindingSerialStoreKey(), JSON.stringify(payload))
      } catch (e) {
        // ignore
      }
    },
    getPrintedMaxSerialByMotherRoll(motherRollCode) {
      const key = this.normalizeRewindingMotherRollCode(motherRollCode)
      if (!key) return 0
      const mapObj = this.loadRewindingSerialMaxMap()
      const n = Number(mapObj[key])
      return Number.isFinite(n) && n > 0 ? Math.trunc(n) : 0
    },
    savePrintedMaxSerialByMotherRoll(motherRollCode, maxSerial) {
      const key = this.normalizeRewindingMotherRollCode(motherRollCode)
      const n = Number(maxSerial)
      if (!key || !Number.isFinite(n) || n < 1) return
      const mapObj = this.loadRewindingSerialMaxMap()
      const old = Number(mapObj[key])
      const oldSafe = Number.isFinite(old) && old > 0 ? Math.trunc(old) : 0
      if (n <= oldSafe) return
      mapObj[key] = Math.trunc(n)
      this.saveRewindingSerialMaxMap(mapObj)
    },
    ensureRewindingSerialStartMonotonic(motherRollCode, requestedStart) {
      const key = this.normalizeRewindingMotherRollCode(motherRollCode)
      const start = Math.max(1, Math.trunc(Number(requestedStart) || 1))
      if (!key) return { startNo: start, adjusted: false, maxPrinted: 0 }
      const maxPrinted = this.getPrintedMaxSerialByMotherRoll(key)
      if (start <= maxPrinted) {
        return {
          startNo: maxPrinted + 1,
          adjusted: true,
          maxPrinted
        }
      }
      return { startNo: start, adjusted: false, maxPrinted }
    },
    async fillNextRewindingMotherRollCode() {
      if (!this.reportForm || this.reportForm.processType !== 'COATING') return
      const scheduleId = this.reportForm.scheduleId
      const productionDateTime = this.reportForm.startTime || this.toDateTimeString(new Date())
      const nextCode = await this.generateNextRollCode(scheduleId, productionDateTime)
      const code = String(nextCode || '').trim()
      if (!code) {
        this.$message.warning('未获取到下一个母卷号，请手工输入')
        return
      }
      const matched = code.match(/^(.*)-(\d{2,})$/)
      this.reportForm.rewindingMotherRollCode = matched ? matched[1] : code
      this.reportForm.rewindingSerialStart = 1
      this.$message.success('已带出母卷号前缀')
    },
    async ensureRewindingMotherRollCodeAuto(force = false) {
      if (!this.reportForm || this.reportForm.processType !== 'COATING') return
      if (!this.reportForm.coatingUseRewindingLabel) return
      const existed = String((this.reportForm && this.reportForm.rewindingMotherRollCode) || '').trim()
      if (existed && !force) return

      const rows = Array.isArray(this.reportForm.producedRolls) ? this.reportForm.producedRolls : []
      const firstCode = String(((rows.find(x => x && x.rollCode) || {}).rollCode) || '').trim()
      if (firstCode) {
        const matched = firstCode.match(/^(.*)-\d{2,}$/)
        this.reportForm.rewindingMotherRollCode = matched ? matched[1] : firstCode
        if (!(Number(this.reportForm.rewindingSerialStart) > 0)) {
          this.reportForm.rewindingSerialStart = 1
        }
        return
      }

      const scheduleId = this.reportForm.scheduleId
      const productionDateTime = this.reportForm.startTime || this.toDateTimeString(new Date())
      const nextCode = await this.generateNextRollCode(scheduleId, productionDateTime)
      const code = String(nextCode || '').trim()
      if (!code) return
      const matched = code.match(/^(.*)-\d{2,}$/)
      this.reportForm.rewindingMotherRollCode = matched ? matched[1] : code
      if (!(Number(this.reportForm.rewindingSerialStart) > 0)) {
        this.reportForm.rewindingSerialStart = 1
      }

      const check = this.ensureRewindingSerialStartMonotonic(this.reportForm.rewindingMotherRollCode, this.reportForm.rewindingSerialStart)
      this.reportForm.rewindingSerialStart = check.startNo
    },
    normalizeCoatingFirstRowForRewindingMode() {
      if (!this.reportForm || this.reportForm.processType !== 'COATING') return
      if (!this.reportForm.coatingUseRewindingLabel) return
      const rows = Array.isArray(this.reportForm.producedRolls) ? this.reportForm.producedRolls : []
      if (!rows.length) return
      const first = rows[0] || {}
      const firstCode = String(first.rollCode || '').trim()
      if (!firstCode || /-\d{2,}$/.test(firstCode)) return

      const startNo = Number((this.reportForm && this.reportForm.rewindingSerialStart) || 1)
      const serialCode = this.buildRewindingRollSerialCode(startNo)
      if (!serialCode) return
      const duplicateIndex = rows.findIndex((x, idx) => idx !== 0 && String((x && x.rollCode) || '').trim() === serialCode)
      if (duplicateIndex >= 0) {
        rows.splice(0, 1)
      } else {
        rows[0].rollCode = serialCode
      }
    },
    generateCoatingProducedRollRowsByPrintCount() {
      if (!this.reportForm || this.reportForm.processType !== 'COATING') return
      const motherRollCode = String((this.reportForm && this.reportForm.rewindingMotherRollCode) || '').trim()
      const startNo = Number((this.reportForm && this.reportForm.rewindingSerialStart) || 1)
      const printCount = Number(this.reportForm && this.reportForm.rewindingPrintCount)
      if (!motherRollCode) {
        this.$message.warning('请先填写母卷号前缀')
        return
      }
      if (!Number.isFinite(startNo) || startNo < 1) {
        this.$message.warning('序列起始号必须大于0')
        return
      }
      if (!Number.isFinite(printCount) || !Number.isInteger(printCount) || printCount < 1) {
        this.$message.warning('请先填写打印张数（必须为大于0的整数）')
        return
      }

      const seedWidth = Number(
        this.reportForm.coatingWidthSeedMm ||
        (this.reportForm.producedRolls && this.reportForm.producedRolls[0] && this.reportForm.producedRolls[0].widthMm) ||
        this.reportForm.widthMm ||
        0
      )
      const existedRows = Array.isArray(this.reportForm.producedRolls) ? this.reportForm.producedRolls : []
      const firstLengthRow = existedRows.find(x => Number(x && x.lengthM) > 0)
      const seedLength = Number((firstLengthRow && firstLengthRow.lengthM) || this.reportForm.lengthM || 0)
      const rows = existedRows.slice()
      const existedCodeSet = new Set(existedRows.map(x => String((x && x.rollCode) || '').trim()).filter(Boolean))

      const plainPrefixIndex = rows.findIndex(x => String((x && x.rollCode) || '').trim() === motherRollCode)
      if (plainPrefixIndex >= 0) {
        const firstSerialCode = this.buildRewindingRollSerialCode(Math.trunc(startNo))
        if (firstSerialCode) {
          const duplicateSerialIndex = rows.findIndex((x, idx) => idx !== plainPrefixIndex && String((x && x.rollCode) || '').trim() === firstSerialCode)
          if (duplicateSerialIndex >= 0) {
            rows.splice(plainPrefixIndex, 1)
          } else {
            rows[plainPrefixIndex].rollCode = firstSerialCode
            if (!(Number(rows[plainPrefixIndex].widthMm) > 0) && Number.isFinite(seedWidth) && seedWidth > 0) {
              rows[plainPrefixIndex].widthMm = seedWidth
            }
            if (!(Number(rows[plainPrefixIndex].lengthM) > 0) && Number.isFinite(seedLength) && seedLength > 0) {
              rows[plainPrefixIndex].lengthM = seedLength
            }
          }
          existedCodeSet.delete(motherRollCode)
          existedCodeSet.add(firstSerialCode)
        }
      }

      let appended = 0
      for (let i = 0; i < printCount; i++) {
        const serialNo = Math.trunc(startNo) + i
        const rollCode = this.buildRewindingRollSerialCode(serialNo)
        if (existedCodeSet.has(rollCode)) continue
        rows.push({
          rollCode,
          sequenceNo: null,
          batchNo: '',
          widthMm: Number.isFinite(seedWidth) && seedWidth > 0 ? seedWidth : null,
          lengthM: Number.isFinite(seedLength) && seedLength > 0 ? seedLength : null,
          weightKg: null,
          remark: ''
        })
        existedCodeSet.add(rollCode)
        appended += 1
      }
      this.reportForm.producedRolls = rows
      if (appended > 0) {
        this.$message.success(`已新增${appended}条母卷明细，原有已填写长度已保留`)
      } else {
        this.$message.info('目标序号范围已存在母卷明细，未新增记录')
      }
    },
    backfillProducedRollsFromPrintCount(startNo, printCount) {
      if (!this.reportForm || this.reportForm.processType !== 'COATING') return
      const normalizedStart = Math.trunc(Number(startNo || this.reportForm.rewindingSerialStart || 1))
      const normalizedCount = Math.trunc(Number(printCount || this.reportForm.rewindingPrintCount || 0))
      if (!(normalizedStart > 0) || !(normalizedCount > 0)) return

      this.reportForm.rewindingSerialStart = normalizedStart
      this.reportForm.rewindingPrintCount = normalizedCount
      this.generateCoatingProducedRollRowsByPrintCount()

      const rows = Array.isArray(this.reportForm.producedRolls) ? this.reportForm.producedRolls : []
      const widthFallback = Number(this.reportForm.widthMm || this.reportForm.coatingWidthSeedMm || 0)
      const lengthFallback = Number(this.reportForm.lengthM || 0)
      for (let i = 0; i < normalizedCount; i++) {
        const serialNo = normalizedStart + i
        const rollCode = this.buildRewindingRollSerialCode(serialNo)
        const row = rows.find(x => String((x && x.rollCode) || '').trim() === rollCode)
        if (!row) continue
        if (!(Number(row.widthMm) > 0) && Number.isFinite(widthFallback) && widthFallback > 0) {
          row.widthMm = widthFallback
        }
        if (!(Number(row.lengthM) > 0) && Number.isFinite(lengthFallback) && lengthFallback > 0) {
          row.lengthM = lengthFallback
        }
      }
    },
    async printCoatingRewindingLabelBatch() {
      if (!this.reportForm || this.reportForm.processType !== 'COATING') return
      const motherRollCode = this.normalizeRewindingMotherRollCode(this.reportForm && this.reportForm.rewindingMotherRollCode)
      this.reportForm.rewindingMotherRollCode = motherRollCode
      const startNo = Number((this.reportForm && this.reportForm.rewindingSerialStart) || 1)
      const printCount = Number(this.reportForm && this.reportForm.rewindingPrintCount)
      if (!motherRollCode) {
        this.$message.warning('请先填写母卷号前缀（可点“带出下一个母卷号”）')
        return
      }
      if (!Number.isFinite(startNo) || startNo < 1) {
        this.$message.warning('序列起始号必须大于0')
        return
      }
      if (!Number.isFinite(printCount) || !Number.isInteger(printCount) || printCount < 1) {
        this.$message.warning('请先填写打印张数（必须为大于0的整数）')
        return
      }
      const serialGuard = this.ensureRewindingSerialStartMonotonic(motherRollCode, startNo)
      if (serialGuard.adjusted) {
        this.reportForm.rewindingSerialStart = serialGuard.startNo
        this.$message.warning(`该母卷已打印到序号 ${serialGuard.maxPrinted}，起始序号已自动调整为 ${serialGuard.startNo}`)
      }
      const safeStartNo = serialGuard.startNo
      // 打印前：按打印张数自动回填报工母卷明细，便于操作员核对后一次性报工
      this.backfillProducedRollsFromPrintCount(safeStartNo, printCount)
      // 同步操作人班组（与母卷模板保持一致）
      this.reportForm.operator = this.buildOperatorWithGroup()
      const materialCode = String((this.reportForm && this.reportForm.materialCode) || '').trim()
      const width = Number((this.reportForm && this.reportForm.widthMm) || 0)
      const length = Number((this.reportForm && this.reportForm.lengthM) || 0)
      const producedRollRows = Array.isArray(this.reportForm.producedRolls) ? this.reportForm.producedRolls : []
      const firstFilled = producedRollRows.find(x => Number(x && x.widthMm) > 0 || Number(x && x.lengthM) > 0) || null
      const previewSpec = this.resolveCoatingRewindingPrintSpec(firstFilled)
      const producedRollCodeMap = new Map()
      producedRollRows.forEach((row) => {
        const code = String((row && row.rollCode) || '').trim()
        if (!code) return
        if (!producedRollCodeMap.has(code)) producedRollCodeMap.set(code, row)
      })
      const producedRollSerialMap = new Map()
      producedRollRows.forEach((row) => {
        const code = String((row && row.rollCode) || '').trim()
        if (!code) return
        const m = code.match(/-(\d+)$/)
        if (!m) return
        const serial = Number(m[1])
        if (Number.isFinite(serial) && !producedRollSerialMap.has(serial)) {
          producedRollSerialMap.set(serial, row)
        }
      })
      const alias = await this.resolveCustomerMaterialAliasForPrint({
        customerCode: this.reportForm.customerCode,
        materialCode,
        customerOrderNo: this.reportForm.customerOrderNo,
        thickness: this.reportForm.thickness,
        width,
        length
      })
      const ok = await this.confirmPrintPreview('涂布小支标签（复卷模板）', [
        { label: '母卷号前缀', value: motherRollCode },
        { label: '起始序号', value: safeStartNo },
        { label: '打印张数', value: printCount },
        { label: '订单号', value: this.composeOrderNoDisplay(this.reportForm.orderNo, this.reportForm.customerOrderNo) },
        { label: '规格', value: previewSpec || '-' }
      ])
      if (!ok) return

      try {
        this.loadBarTenderConfig()
        const sources = []
        for (let i = 0; i < printCount; i++) {
          const serialNo = Math.trunc(safeStartNo) + i
          const rollCode = this.buildRewindingRollSerialCode(serialNo)
          const row = producedRollCodeMap.get(rollCode) || producedRollSerialMap.get(serialNo) || firstFilled || {}
          sources.push({
            serialNo,
            widthMm: row.widthMm,
            lengthM: row.lengthM
          })
        }
        await printBySceneBatch(this.getPrintScene('rewinding-label'), sources, {
          config: this.barTenderConfig,
          vm: this,
          alias
        })

        const nextStart = Math.trunc(safeStartNo) + printCount
        this.reportForm.rewindingSerialStart = nextStart
        this.savePrintedMaxSerialByMotherRoll(motherRollCode, nextStart - 1)
        this.$message.success(`已提交BarTender打印任务（复卷模板）${printCount}张`)
      } catch (e) {
        const msg = (e && e.message) || '未知错误'
        this.$message.error(`BarTender打印失败：${msg}`)
      }
    },
    async callBarTenderPrint(payload) {
      this.barTenderConfig = getBarTenderConfig(this.barTenderConfig)
      return sendBarTenderPrint(payload, this.barTenderConfig)
    },
    todayDate() {
      const d = new Date()
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${y}-${m}-${day}`
    },
    pickDateForLocks(dateRange) {
      if (!dateRange || !dateRange.length) return ''
      if (dateRange.length === 1) return dateRange[0]
      return dateRange[0] || dateRange[1] || ''
    },
    resolveTaskLockDate(row) {
      const candidates = [
        row && row.planStartTime,
        row && row.plan_start_time,
        row && row.coatingScheduleDate,
        row && row.coating_schedule_date,
        row && row.slittingScheduleDate,
        row && row.slitting_schedule_date,
        row && row.packagingDate,
        row && row.packaging_date,
        row && row.rewindingDate,
        row && row.rewinding_date,
        row && row.coatingDate,
        row && row.coating_date
      ]
      for (let i = 0; i < candidates.length; i++) {
        const raw = candidates[i]
        if (!raw) continue
        const text = String(raw).trim()
        if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10)
        const d = new Date(text)
        if (!Number.isNaN(d.getTime())) {
          const y = d.getFullYear()
          const m = String(d.getMonth() + 1).padStart(2, '0')
          const day = String(d.getDate()).padStart(2, '0')
          return `${y}-${m}-${day}`
        }
      }
      return ''
    },
    processLabel(type) {
      const p = String(type || '').toUpperCase()
      if (p === 'COATING') return '涂布'
      if (p === 'REWINDING') return '复卷'
      if (p === 'SLITTING') return '分切'
      return p || '-'
    },
    inferProcessType(row) {
      const raw = (row && (row.type || row.processType || this.fixedType || this.query.type)) || ''
      const v = String(raw).toLowerCase()
      if (v.includes('coat')) return 'COATING'
      if (v.includes('rewind')) return 'REWINDING'
      if (v.includes('slit')) return 'SLITTING'
      if (v === 'coating') return 'COATING'
      if (v === 'rewinding') return 'REWINDING'
      if (v === 'slitting') return 'SLITTING'
      return 'COATING'
    },
    toDateTimeString(value) {
      const d = value instanceof Date ? value : new Date(value)
      if (!d || Number.isNaN(d.getTime())) return ''
      const pad = n => String(n).padStart(2, '0')
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
    },
    toDateString(value) {
      const d = value instanceof Date ? value : new Date(value)
      if (!d || Number.isNaN(d.getTime())) return ''
      const pad = n => String(n).padStart(2, '0')
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    },
    toCompactDateString(value) {
      const raw = String(value == null ? '' : value).trim()
      if (!raw) return ''
      if (/^\d{8}$/.test(raw)) return raw
      const dateText = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : this.toDateString(raw)
      return String(dateText || '').replace(/-/g, '')
    },
    toCompactDateStringStrict(value) {
      const raw = String(value == null ? '' : value).trim()
      if (!raw) return ''
      if (/^\d{8}$/.test(raw)) return raw

      const digits = raw.replace(/\D/g, '')
      if (/^\d{8}$/.test(digits)) {
        const y = digits.slice(0, 4)
        const mm = Number(digits.slice(4, 6))
        const dd = Number(digits.slice(6, 8))
        if (mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) {
          return `${y}${String(mm).padStart(2, '0')}${String(dd).padStart(2, '0')}`
        }
      }

      return this.toCompactDateString(raw)
    },
    toCompactDateYYMMDD(value) {
      const full = this.toCompactDateStringStrict(value)
      if (/^\d{8}$/.test(full)) return full.slice(2)
      if (/^\d{6}$/.test(full)) return full
      return ''
    },
    formatSerialNoRange(startNo, count = 1) {
      const start = Math.max(1, Math.trunc(Number(startNo || 0) || 1))
      const copies = Math.max(1, Math.trunc(Number(count || 0) || 1))
      const end = start + copies - 1
      const pad3 = n => String(Math.max(1, Math.trunc(Number(n || 0) || 1))).padStart(3, '0')
      return copies > 1 ? `${pad3(start)}-${pad3(end)}` : pad3(start)
    },
    composeOrderNoDisplay(orderNo, customerOrderNo) {
      const o = String(orderNo || '').trim()
      const c = String(customerOrderNo || '').trim()
      return c || o || '-'
    },
    resolveLabelOrderNo(form = {}) {
      const customerOrderNo = String((form && form.customerOrderNo) || '').trim()
      const orderNo = String((form && form.orderNo) || '').trim()
      return customerOrderNo || orderNo || ''
    },
    getDefaultSlittingQrTemplate() {
      return '{{materialCode}}-{{batchNo}}-{{orderNo}}-{{qtyOrWeight}}-{{productionDate}}-{{shipDate}}-{{deliveryNoteNo}}-{{shelfLifeText}}'
    },
    resolveQtyOrWeightText({ grossWeightKg, boxRollCount, quantityUnit = '卷/箱' } = {}) {
      const qty = Math.max(0, Math.trunc(Number(boxRollCount || 0) || 0))
      if (qty > 0) {
        return `${qty}PCS`
      }
      return ''
    },
    calcPackagingQtyByLength(lengthM, rollCount) {
      const length = Number(lengthM || 0)
      const rolls = Number(rollCount || 0)
      if (!(length > 0) || !(rolls > 0)) return 0
      return Number((length * rolls).toFixed(2))
    },
    formatPackagingQtyByLength(lengthM, rollCount) {
      const qty = this.calcPackagingQtyByLength(lengthM, rollCount)
      if (!(qty > 0)) return ''
      const rounded = Number(qty.toFixed(2))
      return Number.isInteger(rounded) ? String(rounded) : String(rounded)
    },
    resolveDateTextFromRow(row, keys = []) {
      const target = row || {}
      const list = Array.isArray(keys) && keys.length
        ? keys
        : ['deliveryDate', 'delivery_date', 'shipDate', 'ship_date', 'planDeliveryDate', 'plan_delivery_date']
      for (let i = 0; i < list.length; i++) {
        const key = list[i]
        const raw = target && target[key]
        if (!raw) continue
        const text = this.toDateString(raw)
        if (text) return text
        const fallback = String(raw).trim()
        if (fallback) return fallback.slice(0, 10)
      }
      return ''
    },
    calcExpiryDate(productionDate, shelfLifeDays) {
      const base = String(productionDate || '').trim()
      const days = Math.trunc(Number(shelfLifeDays))
      // 这里的 base 可能是 2024-05-20, 20240520, 或 240520
      if (!base || isNaN(days) || days < 0) return ''
      let d = null
      if (/^\d{8}$/.test(base)) {
        d = new Date(`${base.slice(0, 4)}-${base.slice(4, 6)}-${base.slice(6, 8)}`)
      } else if (/^\d{6}$/.test(base)) {
        const yy = Number(base.slice(0, 2))
        const year = yy >= 70 ? (1900 + yy) : (2000 + yy)
        d = new Date(`${year}-${base.slice(2, 4)}-${base.slice(4, 6)}`)
      } else {
        d = new Date(base)
      }
      if (!d || Number.isNaN(d.getTime())) return ''
      d.setDate(d.getDate() + days)
      const pad = n => String(n).padStart(2, '0')
      return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`
    },
    buildDynamicQrContent(template, data = {}) {
      const source = data || {}
      const defaultTpl = this.getDefaultSlittingQrTemplate()
      const rawTemplate = String(template || '').trim() || defaultTpl

      const readValue = (key) => {
        const k = String(key || '').trim()
        if (!k) return ''
        const val = source[k]
        if (val === null || val === undefined) return ''
        return String(val).trim()
      }

      const hasPlaceholder = /\{\{\s*[^{}\s]+\s*\}\}|\{\s*[^{}\s]+\s*\}/.test(rawTemplate)
      let built = ''
      if (hasPlaceholder) {
        built = rawTemplate
          .replace(/\{\{\s*([^{}\s]+)\s*\}\}/g, (_, key) => readValue(key))
          .replace(/\{\s*([^{}\s]+)\s*\}/g, (_, key) => readValue(key))
      } else {
        const keys = rawTemplate.split('|').map(x => String(x || '').trim()).filter(Boolean)
        built = keys.map(k => readValue(k)).filter(Boolean).join('|')
      }

      return String(built || '')
        .replace(/\|{2,}/g, '|')
        .replace(/^[|\s]+|[|\s]+$/g, '')
    },
    buildSlittingQrPreview(aliasOverride = null) {
      const form = this.reportForm || {}
      if (form.processType !== 'SLITTING') return ''
      let alias = aliasOverride
      if (!alias) {
        const cacheKey = this.buildMaterialAliasCacheKey(
          form.customerCode,
          form.materialCode,
          form.customerOrderNo,
          form.thickness,
          form.widthMm,
          form.lengthM
        )
        alias = this.customerMaterialAliasCache && this.customerMaterialAliasCache[cacheKey]
      }
      const batchNo = String(form.batchNo || '').trim()
      const materialCode = String(((alias && alias.customerMaterialCode) || form.materialCode) || '').trim()
      const orderNo = this.resolveLabelOrderNo(form)
      const customerOrderNo = String(form.customerOrderNo || '').trim()
      const deliveryNoteNo = String(form.deliveryNoteNo || '').trim()
      const producedQty = Math.max(0, Math.trunc(Number(form.producedQty || 0) || 0))
      const rollPerTube = Math.max(1, Math.trunc(Number(form.slittingRollPerTube || 0) || 1))
      const tubePerBoxCount = Math.max(0, Math.trunc(Number(form.slittingTubePerBoxCount || 0) || 0))
      const outerPrintCount = this.calcSlittingOuterLabelCount(producedQty, rollPerTube, tubePerBoxCount)
      const outerQuantities = this.buildSlittingInnerLabelQuantities(producedQty, rollPerTube, tubePerBoxCount, outerPrintCount, 'slitting-outer-label')
      const boxRollCount = Number(outerQuantities[0] || 0) > 0
        ? Number(outerQuantities[0] || 0)
        : (producedQty > 0 ? producedQty : rollPerTube)
      const packageQty = this.calcPackagingQtyByLength(form.lengthM, boxRollCount)
      const packageQtyValue = this.formatPackagingQtyByLength(form.lengthM, boxRollCount)
      const lineNo = String((form && (form.lineNo || form.orderDetailRemark)) || '').trim()
      const productionDateText = this.toDateString(String(form.labelProductionDate || '').trim() || this.toDateString(form.startTime))
      const shipDateText = this.toDateString(String(form.labelShipDate || '').trim())
      const productionDate = this.toCompactDateYYMMDD(productionDateText)
      const productionDate8 = this.toCompactDateStringStrict(productionDateText)
      const shipDate = this.toCompactDateStringStrict(shipDateText)
      const shelfLifeDays = Math.max(0, Math.trunc(Number(form.shelfLifeDays || 0) || 0))
      const expiryDate = this.calcExpiryDate(productionDate8 || productionDate, shelfLifeDays)
      const expiryDate8 = expiryDate && expiryDate !== '-' ? expiryDate.replace(/\./g, '') : ''
      const expiryDate6 = expiryDate8.length === 8 ? expiryDate8.slice(2) : ''
      const expiryDateText = expiryDate8.length === 8 ? `${expiryDate8.slice(0, 4)}-${expiryDate8.slice(4, 6)}-${expiryDate8.slice(6, 8)}` : ''

      const grossWeightKg = Number(form.boxWeightKg || 0)
      const grossWeightValue = Number.isFinite(grossWeightKg) && grossWeightKg > 0 ? Number(grossWeightKg.toFixed(2)) : ''
      const qtyOrWeight = this.resolveQtyOrWeightText({
        grossWeightKg: grossWeightValue,
        boxRollCount,
        quantityUnit: '卷/箱'
      })
      const shelfLifeText = shelfLifeDays > 0 ? String(shelfLifeDays) : ''
      const digitalNo = String(form.slittingDigitalNo || '').trim()
      const serialNo = '001'
      return this.buildDynamicQrContent(form.qrTemplate, {
        orderNo,
        customerOrderNo,
        deliveryNoteNo,
        batchNo,
        materialCode,
        boxRollCount,
        packageQty,
        packageQtyM: packageQty,
        packageQtyValue,
        packageQtyText: packageQtyValue ? `${packageQtyValue}米` : '',
        packagingQty: packageQtyValue,
        packagingQuantity: packageQtyValue,
        baozhuangshuliang: packageQtyValue,
        shuliangzhongliang: packageQtyValue,
        shuliangzhgongliang: packageQtyValue,
        lineNo,
        line_no: lineNo,
        hanghao: lineNo,
        xinghao: lineNo,
        orderDetailRemark: lineNo,
        currentBoxRollCount: boxRollCount,
        slittingQty: boxRollCount,
        grossWeightKg: grossWeightValue,
        boxWeightKg: grossWeightValue,
        qtyOrWeight,
        rollPerTube,
        tubeRollCount: rollPerTube,
        productionDate,
        productionDate8,
        productionDate6: productionDate8.length === 8 ? productionDate8.slice(2) : '',
        productionDateText,
        productionDateCompact: productionDate,
        production_date: productionDate,
        prodDate: productionDate,
        prodDateText: productionDateText,
        serialNo,
        serialNoStart: '001',
        serialNoEnd: '001',
        shipDate,
        shipDate8: shipDate,
        shipDate6: shipDate.length === 8 ? shipDate.slice(2) : '',
        shipDateText,
        shipDateCompact: shipDate,
        ship_date: shipDate,
        deliveryDate: shipDate,
        deliveryDateText: shipDateText,
        deliveryDateCompact: shipDate,
        delivery_date: shipDate,
        shelfLifeDays,
        shelfLifeText,
        expiryDate,
        expiryDate8,
        expiryDate6,
        expiryDateText,
        expiryDateCompact: expiryDate8,
        expiry_date: expiryDate,
        youxiaoqi: expiryDate,
        customerShortName: String((form && form.customerShortName) || '').trim(),
        customerShort: String((form && form.customerShortName) || '').trim(),
        myCompanyName: String((form && form.myCompanyName) || '东莞市方恩电子材料科技有限公司').trim(),
        myCompanyAddress: String((form && form.myCompanyAddress) || '广东省东莞市桥头镇东新路13号2号楼102室').trim(),
        myCompanyPhone: String((form && form.myCompanyPhone) || '0769-82551118').trim(),
        companyName: String((form && form.myCompanyName) || '东莞市方恩电子材料科技有限公司').trim(),
        companyAddress: String((form && form.myCompanyAddress) || '广东省东莞市桥头镇东新路13号2号楼102室').trim(),
        digitalNo,
        digitalNumber: digitalNo,
        sequenceNo: digitalNo,
        sequence_number: digitalNo,
        remark: String(form.remark || '').trim()
      })
    },
    resolveSlittingQrBizTypeByScene(sceneType) {
      if (sceneType === 'slitting-core-label') {
        return this.resolveSelectedSlittingCoreBizType()
      }
      if (sceneType === 'slitting-inner-label') return 'SLITTING_INNER_LABEL'
      if (sceneType === 'slitting-outer-label') return 'SLITTING_OUTER_LABEL'
      if (sceneType === 'slitting-pallet-label') return 'SLITTING_PALLET_LABEL'
      return 'SLITTING_OUTER_LABEL'
    },
    async loadCustomerQrRuleForSlitting(customerCode, bizType = 'SLITTING_OUTER_LABEL') {
      const code = String(customerCode || '').trim()
      if (!code) return
      const safeBizType = this.normalizeQrRuleBizType(bizType)
      try {
        const res = await getCustomerLabelQrRule(code, safeBizType)
        if (res && (res.code === 200 || res.code === 20000) && res.data && res.data.qrTemplate) {
          this.reportForm.qrTemplate = String(res.data.qrTemplate || '').trim() || this.getDefaultSlittingQrTemplate()
          if (this.reportForm) {
            this.reportForm.slittingQrRuleBizType = safeBizType
            this.reportForm.qrTemplateEditable = false
          }
        }
        if (res && (res.code === 200 || res.code === 20000) && res.data && this.reportForm) {
          this.reportForm.customerShortName = String(res.data.customerShortName || this.reportForm.customerShortName || '').trim()
          this.reportForm.myCompanyName = String(res.data.myCompanyName || this.reportForm.myCompanyName || '东莞市方恩电子材料科技有限公司').trim()
          this.reportForm.myCompanyAddress = String(res.data.myCompanyAddress || this.reportForm.myCompanyAddress || '广东省东莞市桥头镇东新路13号2号楼102室').trim()
          this.reportForm.myCompanyPhone = String(res.data.myCompanyPhone || this.reportForm.myCompanyPhone || '0769-82551118').trim()
        }
      } catch (e) {
        // 忽略加载失败，保持本地默认模板
      }
    },
    async loadCompanyInfoForLabel() {
      try {
        const res = await request({ url: '/config/company', method: 'get' })
        if (res && (res.code === 200 || res.code === 20000) && res.data) {
          const companyName = String((res.data && res.data.companyName) || '').trim()
          const address = String((res.data && res.data.address) || '').trim()
          const phone = String((res.data && res.data.phone) || '').trim()
          this.companyInfoCache = { companyName, address, phone }
          if (this.reportForm) {
            if (companyName) this.reportForm.myCompanyName = companyName
            if (address) this.reportForm.myCompanyAddress = address
            if (phone) this.reportForm.myCompanyPhone = phone
          }
        }
      } catch (e) {
        // ignore
      }
    },
    enableQrTemplateEdit() {
      if (!this.reportForm) return
      this.reportForm.qrTemplateEditable = true
    },
    async handleSlittingQrRuleBizTypeChanged(value) {
      if (!this.reportForm || this.reportForm.processType !== 'SLITTING') return
      const bizType = this.normalizeQrRuleBizType(value)
      this.reportForm.slittingQrRuleBizType = bizType
      await this.loadCustomerQrRuleForSlitting(this.reportForm.customerCode, bizType)
    },
    normalizeQrRuleBizType(input) {
      const text = String(input == null ? '' : input).trim()
      const upper = text.toUpperCase()
      if (!text || upper === '[OBJECT POINTEREVENT]' || upper === '[OBJECT MOUSEEVENT]' || upper.indexOf('ISTRUSTED') > -1) {
        return 'SLITTING_OUTER_LABEL'
      }
      const allowed = new Set(['SLITTING_CORE_LABEL', 'SLITTING_CORE_LABEL_NARROW', 'SLITTING_INNER_LABEL', 'SLITTING_OUTER_LABEL', 'SLITTING_PALLET_LABEL'])
      return allowed.has(upper) ? upper : 'SLITTING_OUTER_LABEL'
    },
    async saveCurrentCustomerQrRule(bizType = 'SLITTING_OUTER_LABEL', silent = false) {
      const form = this.reportForm || {}
      const customerCode = String(form.customerCode || '').trim()
      if (!customerCode) {
        if (!silent) this.$message.warning('客户代码为空，无法保存二维码规则')
        return false
      }
      const safeBizType = this.normalizeQrRuleBizType(bizType)
      const qrTemplate = String(form.qrTemplate || '').trim() || this.getDefaultSlittingQrTemplate()
      this.qrRuleSaving = true
      try {
        const res = await saveCustomerLabelQrRule({
          customerCode,
          bizType: safeBizType,
          qrTemplate,
          enabled: 1
        })
        if (res && (res.code === 200 || res.code === 20000)) {
          if (this.reportForm) {
            this.reportForm.qrTemplateEditable = false
          }
          if (!silent) this.$message.success('二维码规则已保存')
          return true
        }
        if (!silent) this.$message.error((res && (res.msg || res.message)) || '保存二维码规则失败')
        return false
      } catch (e) {
        if (!silent) this.$message.error(this.resolveErrorMessage(e, '保存二维码规则失败'))
        return false
      } finally {
        this.qrRuleSaving = false
      }
    },
    async persistQrRuleOnFirstPrint(sceneType) {
      const bizType = this.resolveSlittingQrBizTypeByScene(sceneType)
      await this.saveCurrentCustomerQrRule(bizType, true)
    },
    parseDateTimeValue(value) {
      if (!value) return null
      const text = String(value).trim()
      if (!text) return null
      const d = new Date(text.replace(' ', 'T'))
      if (!Number.isNaN(d.getTime())) return d
      const d2 = new Date(text)
      return Number.isNaN(d2.getTime()) ? null : d2
    },
    inferShiftCodeByTime(dateObj) {
      const d = dateObj instanceof Date ? dateObj : this.parseDateTimeValue(dateObj)
      if (!d) return String(this.currentWorkGroup || 'A').toUpperCase()
      const h = d.getHours()
      // 08:00~19:59 记为A班，其他时段记为B班
      return (h >= 8 && h < 20) ? 'A' : 'B'
    },
    buildSegmentOperator(dateObj) {
      const raw = String(this.reportForm.operator || this.currentOperatorName || '').trim() || 'unknown'
      const base = raw.replace(/-[A-Z0-9]+班$/i, '')
      const shiftCode = this.inferShiftCodeByTime(dateObj)
      return `${base}-${shiftCode}班`
    },
    getNextShiftBoundary(dateObj) {
      const d = new Date(dateObj.getTime())
      const y = d.getFullYear()
      const m = d.getMonth()
      const day = d.getDate()
      const h = d.getHours()
      if (h < 8) return new Date(y, m, day, 8, 0, 0, 0)
      if (h < 20) return new Date(y, m, day, 20, 0, 0, 0)
      return new Date(y, m, day + 1, 8, 0, 0, 0)
    },
    splitByShiftWindows(startDate, endDate) {
      const start = new Date(startDate.getTime())
      const end = new Date(endDate.getTime())
      if (!(end.getTime() > start.getTime())) return []
      const segments = []
      let cursor = start
      while (cursor.getTime() < end.getTime()) {
        const boundary = this.getNextShiftBoundary(cursor)
        const next = boundary.getTime() < end.getTime() ? boundary : end
        segments.push({
          start: new Date(cursor.getTime()),
          end: new Date(next.getTime()),
          minutes: Math.max(1, Math.round((next.getTime() - cursor.getTime()) / 60000))
        })
        cursor = new Date(next.getTime())
      }
      return segments
    },
    allocateSegmentQtys(totalQty, segments, isIntegerQty) {
      const qty = Number(totalQty || 0)
      if (!(qty > 0) || !Array.isArray(segments) || !segments.length) return []
      const totalMinutes = segments.reduce((s, x) => s + Number(x.minutes || 0), 0)
      if (!(totalMinutes > 0)) {
        return segments.map((_, i) => (i === segments.length - 1 ? qty : 0))
      }
      if (isIntegerQty) {
        const raw = segments.map(x => qty * Number(x.minutes || 0) / totalMinutes)
        const floors = raw.map(v => Math.floor(v))
        let remain = Math.max(0, Math.round(qty - floors.reduce((s, x) => s + x, 0)))
        const idxOrder = raw
          .map((v, i) => ({ i, frac: v - Math.floor(v) }))
          .sort((a, b) => b.frac - a.frac)
        idxOrder.forEach(item => {
          if (remain > 0) {
            floors[item.i] += 1
            remain -= 1
          }
        })
        return floors
      }
      const raw = segments.map(x => qty * Number(x.minutes || 0) / totalMinutes)
      const rounded = raw.map(v => Number(v.toFixed(2)))
      const sumRounded = rounded.reduce((s, x) => s + x, 0)
      const diff = Number((qty - sumRounded).toFixed(2))
      rounded[rounded.length - 1] = Number((rounded[rounded.length - 1] + diff).toFixed(2))
      return rounded
    },
    calcRollArea(widthMm, lengthM) {
      const w = Number(widthMm || 0)
      const l = Number(lengthM || 0)
      if (!(w > 0) || !(l > 0)) return 0
      return Number(((w / 1000) * l).toFixed(2))
    },
    resolveRewindingPlannedQty(row) {
      const direct = Number(
        (row && (
          row.rewindingRollCount != null ? row.rewindingRollCount
            : row.rewinding_roll_count != null ? row.rewinding_roll_count
              : row.rewindingQty != null ? row.rewindingQty
                : row.rewinding_qty != null ? row.rewinding_qty
                  : row.planQty != null ? row.planQty
                    : row.plan_qty
        )) || 0
      )
      if (Number.isFinite(direct) && direct > 0) return Math.ceil(direct - 1e-9)

      const area = Number(
        (row && (
          row.remaining_coating_area != null ? row.remaining_coating_area
            : row.remainingCoatingArea != null ? row.remainingCoatingArea
              : row.area != null ? row.area
                : row.planArea != null ? row.planArea
                  : row.coating_area != null ? row.coating_area
                    : row.coatingArea
        )) || 0
      )
      const rewindingWidth = Number(
        (row && (
          row.rewinding_width != null ? row.rewinding_width
            : row.rewindingWidth != null ? row.rewindingWidth
              : row.processWidth != null ? row.processWidth
                : row.process_width != null ? row.process_width
                  : 500
        )) || 0
      )
      const orderLength = Number(
        (row && (
          row.length != null ? row.length
            : row.lengthM != null ? row.lengthM
              : row.processLength != null ? row.processLength
                : row.process_length != null ? row.process_length
                  : row.planLength
        )) || 0
      )
      const singleRollArea = (rewindingWidth / 1000) * orderLength
      if (area > 0 && singleRollArea > 0) {
        return Math.ceil((area / singleRollArea) - 1e-9)
      }

      const fallback = Number((row && (row.qty != null ? row.qty : row.quantity)) || 0)
      return Number.isFinite(fallback) && fallback > 0 ? Math.ceil(fallback - 1e-9) : 0
    },
    resolveSlittingPlannedQty(row) {
      const orderQty = Number(
        (row && (
          row.orderQty != null ? row.orderQty
            : row.order_qty != null ? row.order_qty
              : row.rolls != null ? row.rolls
                : row.orderRolls != null ? row.orderRolls
                  : row.order_rolls
        )) || 0
      )
      if (Number.isFinite(orderQty) && orderQty > 0) return Math.ceil(orderQty - 1e-9)

      const direct = Number(
        (row && (
          row.slittingQty != null ? row.slittingQty
            : row.slitting_qty != null ? row.slitting_qty
              : row.scheduleQty != null ? row.scheduleQty
                : row.schedule_qty != null ? row.schedule_qty
                  : row.qty != null ? row.qty
                    : row.quantity
        )) || 0
      )
      return Number.isFinite(direct) && direct > 0 ? Math.ceil(direct - 1e-9) : 0
    },
    printHtml(title, html) {
      const win = window.open('', '_blank')
      if (!win) {
        this.$message.warning('浏览器拦截了打印窗口，请允许弹窗后重试')
        return
      }
      win.document.write(`
        <html>
          <head>
            <title>${title}</title>
            <meta charset="utf-8" />
            <style>
              body { font-family: Arial, "Microsoft YaHei", sans-serif; padding: 12px; color: #303133; }
              .title { font-size: 18px; font-weight: 700; margin-bottom: 12px; }
              .row { margin: 6px 0; font-size: 14px; }
              table { width: 100%; border-collapse: collapse; margin-top: 10px; }
              th, td { border: 1px solid #dcdfe6; padding: 6px 8px; font-size: 13px; text-align: left; }
              th { background: #f5f7fa; }
            </style>
          </head>
          <body>${html}</body>
        </html>
      `)
      win.document.close()
      win.focus()
      setTimeout(() => {
        win.print()
      }, 120)
    },
    escapeHtml(text) {
      const str = String(text == null ? '' : text)
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
    },
    async confirmPrintPreview(title, pairs = []) {
      if (!this.printPreviewEnabled) return true
      const rows = (pairs || []).map(item => {
        const label = this.escapeHtml(item && item.label)
        const value = this.escapeHtml(item && item.value)
        const field = this.escapeHtml(item && (item.field || item.key || item.payloadKey || ''))
        const fieldText = field
          ? `<span style="margin-left:8px;color:#909399;font-size:12px;">字段: <code style="color:#606266;background:#f5f7fa;padding:1px 4px;border-radius:3px;">${field}</code></span>`
          : ''
        return `<div style="margin:4px 0;"><strong>${label}：</strong>${value || '-'}${fieldText}</div>`
      }).join('')
      const html = `<div style="max-height:420px;overflow:auto;line-height:1.6;">${rows}</div>`
      try {
        await this.$confirm(html, `${title} - 打印预览`, {
          dangerouslyUseHTMLString: true,
          confirmButtonText: '确认打印',
          cancelButtonText: '取消',
          type: 'info'
        })
        return true
      } catch (e) {
        return false
      }
    },
    async printRollLabel(row, index) {
      const roll = row || {}
      const rollCode = String(roll.rollCode || '').trim()
      if (!rollCode) {
        this.$message.warning('请先填写母卷号后再打印标签')
        return
      }
      if (this.reportForm && this.reportForm.processType === 'COATING' && this.reportForm.coatingUseRewindingLabel) {
        const existedPrefix = String((this.reportForm && this.reportForm.rewindingMotherRollCode) || '').trim()
        if (!existedPrefix) {
          const matched = rollCode.match(/^(.*)-(\d{2,})$/)
          this.reportForm.rewindingMotherRollCode = matched ? matched[1] : rollCode
        }
        const serialNo = Number(roll.sequenceNo || (Number(this.reportForm.rewindingSerialStart || 1) + Number(index || 0)))
        const materialCode = String((this.reportForm && this.reportForm.materialCode) || '').trim()
        const width = Number(roll.widthMm || 0)
        const length = Number(roll.lengthM || 0)
        const alias = await this.resolveCustomerMaterialAliasForPrint({
          customerCode: this.reportForm.customerCode,
          materialCode,
          customerOrderNo: this.reportForm.customerOrderNo,
          thickness: this.reportForm.thickness,
          width,
          length
        })
        try {
          this.loadBarTenderConfig()
          await printByScene(this.getPrintScene('rewinding-label'), { serialNo, widthMm: roll.widthMm, lengthM: roll.lengthM }, {
            config: this.barTenderConfig,
            vm: this,
            alias
          })
          this.$message.success('已提交BarTender打印任务（复卷模板）')
          return
        } catch (e) {
          const msg = (e && e.message) || '未知错误'
          this.$message.error(`BarTender打印失败：${msg}`)
          return
        }
      }
      const width = Number(roll.widthMm || 0)
      const length = Number(roll.lengthM || 0)
      const area = this.calcRollArea(width, length)
      const spec = this.getOrderItemSpec({
        ...(this.reportForm || {}),
        widthMm: Number.isFinite(width) ? width : '-',
        lengthM: Number.isFinite(length) ? length : '-'
      })
      const productionDate = this.toDateString(String((this.reportForm && this.reportForm.labelProductionDate) || '').trim() || this.toDateString((this.reportForm && this.reportForm.startTime) || new Date()))
      const groupNo = this.currentUserTeamName
      const materialCode = String((this.reportForm && this.reportForm.materialCode) || '').trim()
      const materialName = this.resolveMaterialNameByCode(materialCode)
      const alias = await this.resolveCustomerMaterialAliasForPrint({
        customerCode: this.reportForm.customerCode,
        materialCode,
        customerOrderNo: this.reportForm.customerOrderNo,
        thickness: this.reportForm.thickness,
        width,
        length
      })
      const ok = await this.confirmPrintPreview('母卷标签', [
        { label: '母卷号', value: rollCode, field: 'rollCode | qrText' },
        { label: '订单号', value: this.composeOrderNoDisplay(this.reportForm.orderNo, this.reportForm.customerOrderNo), field: 'orderNo | orderNoDisplay | internalOrderNo' },
        { label: '客户订单号', value: this.reportForm.customerOrderNo || '-', field: 'customerOrderNo' },
        { label: '生产日期', value: productionDate || '-', field: 'productionDate | produtionDate | printDate' },
        { label: '班组号', value: groupNo, field: 'groupNo | workGroup | teamName' },
        { label: '物料代码', value: (alias && alias.customerMaterialCode) || materialCode || '-', field: 'materialCode | customerMaterialCode | internalMaterialCode' },
        { label: '物料名称', value: (alias && alias.customerMaterialName) || materialName || '-', field: 'materialName | productName | product_name | customerMaterialName | internalMaterialName' },
        { label: '客户规格', value: (alias && alias.customerSpec) || spec || '-', field: 'customerSpec | customerSpecText | spec' },
        { label: '规格', value: spec || '-', field: 'spec | widthMm | lengthM | thickness' },
        { label: '面积(m²)', value: this.formatAreaNum(area), field: 'areaM2' }
      ])
      if (!ok) return

      try {
        this.loadBarTenderConfig()
        await printByScene(this.getPrintScene('roll-label'), row, {
          config: this.barTenderConfig,
          vm: this,
          index,
          alias
        })
        this.$message.success('已提交BarTender打印任务（母卷标签）')
        return
      } catch (e) {
        const msg = (e && e.message) || '未知错误'
        if (this.barTenderConfig && this.barTenderConfig.allowBrowserFallback) {
          this.$message.warning(`BarTender打印失败，已回退浏览器打印：${msg}`)
        } else {
          this.$message.error(`BarTender打印失败：${msg}`)
          return
        }
      }

      const html = `
        <div class="title">母卷标签</div>
        <div class="row"><strong>母卷号：</strong>${rollCode}</div>
        <div class="row"><strong>宽度(mm)：</strong>${Number.isFinite(width) ? width : ''}</div>
        <div class="row"><strong>长度(m)：</strong>${Number.isFinite(length) ? length : ''}</div>
        <div class="row"><strong>面积(m²)：</strong>${this.formatAreaNum(area)}</div>
        <div class="row"><strong>排程ID：</strong>${this.reportForm.scheduleId || '-'}</div>
        <div class="row"><strong>订单号：</strong>${this.composeOrderNoDisplay(this.reportForm.orderNo, this.reportForm.customerOrderNo)}</div>
        <div class="row"><strong>客户订单号：</strong>${this.reportForm.customerOrderNo || '-'}</div>
        <div class="row"><strong>物料代码：</strong>${(alias && alias.customerMaterialCode) || materialCode || '-'}</div>
        <div class="row"><strong>物料名称：</strong>${(alias && alias.customerMaterialName) || materialName || '-'}</div>
        <div class="row"><strong>操作人：</strong>${this.reportForm.operator || '-'}</div>
        <div class="row"><strong>打印时间：</strong>${this.toDateTimeString(new Date())}</div>
      `
      this.printHtml(`母卷标签-${rollCode}-${index + 1}`, html)
    },
    async printCoatingInboundSheet() {
      const rolls = (this.reportForm && this.reportForm.producedRolls) || []
      if (!rolls.length) {
        this.$message.info('暂无涂布入库明细可打印')
        return
      }
      const rowsHtml = rolls.map((x, i) => {
        const width = Number(x && x.widthMm)
        const length = Number(x && x.lengthM)
        const area = this.calcRollArea(width, length)
        return `<tr>
          <td>${i + 1}</td>
          <td>${(x && x.rollCode) || ''}</td>
          <td>${Number.isFinite(width) ? width : ''}</td>
          <td>${Number.isFinite(length) ? length : ''}</td>
          <td>${this.formatAreaNum(area)}</td>
        </tr>`
      }).join('')
      const totalArea = rolls.reduce((sum, x) => {
        const w = Number(x && x.widthMm)
        const l = Number(x && x.lengthM)
        return sum + this.calcRollArea(w, l)
      }, 0)
      const ok = await this.confirmPrintPreview('涂布入库单', [
        { label: '排程ID', value: this.reportForm.scheduleId || '-' },
        { label: '订单号', value: this.reportForm.orderNo || '-' },
        { label: '客户订单号', value: this.reportForm.customerOrderNo || '-' },
        { label: '母卷条数', value: rolls.length },
        { label: '总面积(m²)', value: this.formatAreaNum(totalArea) }
      ])
      if (!ok) return

      try {
        this.loadBarTenderConfig()
        await printByScene(this.getPrintScene('inbound-sheet'), { rows: rolls }, {
          config: this.barTenderConfig,
          vm: this
        })
        this.$message.success('已提交BarTender打印任务（涂布入库单）')
        return
      } catch (e) {
        const msg = (e && e.message) || '未知错误'
        if (this.barTenderConfig && this.barTenderConfig.allowBrowserFallback) {
          this.$message.warning(`BarTender打印失败，已回退浏览器打印：${msg}`)
        } else {
          this.$message.error(`BarTender打印失败：${msg}`)
          return
        }
      }

      const html = `
        <div class="title">涂布入库单</div>
        <div class="row"><strong>排程ID：</strong>${this.reportForm.scheduleId || '-'}</div>
        <div class="row"><strong>操作人：</strong>${this.reportForm.operator || '-'}</div>
        <div class="row"><strong>开始时间：</strong>${this.reportForm.startTime || '-'}</div>
        <div class="row"><strong>结束时间：</strong>${this.reportForm.endTime || '-'}</div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>母卷号</th>
              <th>宽度(mm)</th>
              <th>长度(m)</th>
              <th>面积(m²)</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
        <div class="row" style="margin-top:8px;"><strong>总面积：</strong>${this.formatAreaNum(totalArea)} m²</div>
      `
      this.printHtml(`涂布入库单-${this.reportForm.scheduleId || 'NA'}`, html)
    },
    async printRewindingLabel() {
      const motherRollCode = this.normalizeRewindingMotherRollCode(this.reportForm && this.reportForm.rewindingMotherRollCode)
      this.reportForm.rewindingMotherRollCode = motherRollCode
      const startNo = Number((this.reportForm && this.reportForm.rewindingSerialStart) || 1)
      const printCount = Number(this.reportForm && this.reportForm.rewindingPrintCount)
      const labelLengthM = Number((this.reportForm && this.reportForm.rewindingLabelLengthM) || 0)
      const motherInfo = (this.reportForm && this.reportForm.rewindingMotherInfo) || null

      if (!motherRollCode) {
        this.$message.warning('请先填写母卷号（可扫码）后再打印标签')
        return
      }
      if (!Number.isFinite(startNo) || startNo < 1) {
        this.$message.warning('序列起始号必须大于0')
        return
      }
      if (!Number.isFinite(printCount) || !Number.isInteger(printCount) || printCount < 1) {
        this.$message.warning('请先填写打印张数（必须为大于0的整数）')
        return
      }
      if (!(labelLengthM > 0)) {
        this.$message.warning('请先填写复卷标签长度(m)')
        return
      }
      const serialGuard = this.ensureRewindingSerialStartMonotonic(motherRollCode, startNo)
      if (serialGuard.adjusted) {
        this.reportForm.rewindingSerialStart = serialGuard.startNo
        this.$message.warning(`该母卷已打印到序号 ${serialGuard.maxPrinted}，起始序号已自动调整为 ${serialGuard.startNo}`)
      }
      const safeStartNo = serialGuard.startNo

      const materialCode = String((this.reportForm && this.reportForm.materialCode) || '').trim()
      const width = Number(
        (motherInfo && (motherInfo.widthMm != null ? motherInfo.widthMm : motherInfo.width)) ||
        (this.reportForm && this.reportForm.widthMm) ||
        0
      )
      const length = labelLengthM
      const alias = await this.resolveCustomerMaterialAliasForPrint({
        customerCode: this.reportForm.customerCode,
        materialCode,
        customerOrderNo: this.reportForm.customerOrderNo,
        thickness: this.reportForm.thickness,
        width,
        length
      })
      const materialName = this.resolveMaterialNameByCode(materialCode)
      const previewSpec = this.resolveRewindingTemplateSpec({ widthMm: width, lengthM: labelLengthM })
      const ok = await this.confirmPrintPreview('复卷标签', [
        { label: '母卷号', value: motherRollCode },
        { label: '订单号', value: this.composeOrderNoDisplay(this.reportForm.orderNo, this.reportForm.customerOrderNo) },
        { label: '客户订单号', value: this.reportForm.customerOrderNo || '-' },
        { label: '物料代码', value: (alias && alias.customerMaterialCode) || materialCode || '-' },
        { label: '物料名称', value: (alias && alias.customerMaterialName) || materialName || '-' },
        { label: '客户规格', value: (alias && alias.customerSpec) || previewSpec || '-' },
        { label: '规格', value: previewSpec || '-' },
        { label: '长度(m)', value: labelLengthM },
        { label: '母卷宽度(mm)', value: width > 0 ? width : '-' },
        { label: '起始序号', value: safeStartNo },
        { label: '打印张数', value: printCount }
      ])
      if (!ok) return

      try {
        this.loadBarTenderConfig()
        for (let i = 0; i < printCount; i++) {
          const serialNo = Math.trunc(safeStartNo) + i
          await printByScene(this.getPrintScene('rewinding-label'), { serialNo, widthMm: width, lengthM: labelLengthM }, {
            config: this.barTenderConfig,
            vm: this,
            alias
          })
        }
        const nextStart = Math.trunc(safeStartNo) + printCount
        this.reportForm.rewindingSerialStart = nextStart
        this.savePrintedMaxSerialByMotherRoll(motherRollCode, nextStart - 1)
        this.$message.success(`已提交BarTender打印任务（复卷标签）${printCount}张`)
      } catch (e) {
        const msg = (e && e.message) || '未知错误'
        this.$message.error(`BarTender打印失败：${msg}`)
      }
    },
    async printSlittingLabel(sceneType) {
      const validScenes = ['slitting-core-label', 'slitting-inner-label', 'slitting-outer-label', 'slitting-pallet-label']
      if (!validScenes.includes(sceneType)) return

      const qrBizType = this.resolveSlittingQrBizTypeByScene(sceneType)
      if (this.reportForm) {
        this.reportForm.slittingQrRuleBizType = qrBizType
      }
      await this.loadCustomerQrRuleForSlitting((this.reportForm && this.reportForm.customerCode) || '', qrBizType)

      this.commitSlittingBatchNoInput()
      const batchNoRequired = !!(this.reportForm && this.reportForm.batchNoRequired)
      const batchNo = String((this.reportForm && this.reportForm.batchNo) || '').trim()
      if (batchNoRequired && !batchNo) {
        this.$message.warning('批次号已设置为必填，请先选择或填写批次号后再打印')
        return
      }
      const digitalNoRequired = !!(this.reportForm && this.reportForm.slittingDigitalNoRequired)
      const digitalNoRaw = String((this.reportForm && this.reportForm.slittingDigitalNo) || '').trim()
      if (digitalNoRequired && !digitalNoRaw) {
        this.$message.warning('数字号已设置为必填，请先填写后再打印')
        return
      }

      const defaultRollPerTube = this.calcSlittingDefaultRollPerTube(this.reportForm && this.reportForm.widthMm)
      const producedQty = Math.max(1, Math.trunc(Number((this.reportForm && this.reportForm.producedQty) || 0) || 0))
      const rollPerTube = Math.max(1, Math.trunc(Number((this.reportForm && this.reportForm.slittingRollPerTube) || 0) || defaultRollPerTube))
      const tubeRollCount = rollPerTube
      const tubePerBoxCount = Math.max(0, Math.trunc(Number((this.reportForm && this.reportForm.slittingTubePerBoxCount) || 0) || 0))
      const corePrintCount = Math.max(0, Math.trunc(Number((this.reportForm && this.reportForm.slittingCorePrintCount) || 0) || 0))
      const innerPrintCount = Math.max(0, Math.trunc(Number((this.reportForm && this.reportForm.slittingInnerPrintCount) || 0) || 0))
      const outerPrintCount = Math.max(0, Math.trunc(Number((this.reportForm && this.reportForm.slittingOuterPrintCount) || 0) || 0))
      const palletPrintCount = Math.max(0, Math.trunc(Number((this.reportForm && this.reportForm.slittingPalletPrintCount) || 0) || 0))
      const printCount = sceneType === 'slitting-inner-label'
        ? innerPrintCount
        : sceneType === 'slitting-outer-label'
          ? outerPrintCount
          : sceneType === 'slitting-core-label'
            ? corePrintCount
            : palletPrintCount

      if (!(printCount > 0)) {
        this.$message.warning(
          sceneType === 'slitting-core-label'
            ? '请先填写卷芯张数后再打印'
            : sceneType === 'slitting-inner-label'
              ? '请先填写内标张数后再打印'
              : sceneType === 'slitting-outer-label'
                ? '请先填写外标张数后再打印'
                : '请先填写栈板张数后再打印'
        )
        return
      }
      if (!Array.isArray(this.cartonPresetOptions) || !this.cartonPresetOptions.length || !String((this.reportForm && this.reportForm.cartonPreset) || '').trim()) {
        this.$message.warning('请先在研发管理维护纸箱规格，并选择纸箱规格后再打印')
        return
      }

      const labelNameMap = {
        'slitting-core-label': '卷芯标签',
        'slitting-inner-label': '内标签',
        'slitting-outer-label': '外标签',
        'slitting-pallet-label': '栈板标签'
      }
      const labelName = labelNameMap[sceneType] || '分切标签'
      const materialCode = String((this.reportForm && this.reportForm.materialCode) || '').trim()
      const width = Number((this.reportForm && this.reportForm.widthMm) || 0)
      const length = Number((this.reportForm && this.reportForm.lengthM) || 0)
      const coreOuterDiameterMm = Number((this.reportForm && this.reportForm.coreOuterDiameterMm) || 0)
      const tapeOuterDiameterText = this.calcSlittingTapeOuterDiameterText(this.reportForm || {})
      const alias = await this.resolveCustomerMaterialAliasForPrint({
        customerCode: this.reportForm.customerCode,
        materialCode,
        customerOrderNo: this.reportForm.customerOrderNo,
        thickness: this.reportForm.thickness,
        width,
        length
      })
      const materialName = this.resolveMaterialNameByCode(materialCode)
      const quantities = this.buildSlittingInnerLabelQuantities(producedQty, tubeRollCount, tubePerBoxCount, printCount, sceneType)
      const mergedItems = this.buildMergedSlittingPrintItems(quantities)
      const standardBoxRollCount = (tubeRollCount > 0 && tubePerBoxCount > 0) ? (tubeRollCount * tubePerBoxCount) : 0
      const productionDateText = String((this.reportForm && this.reportForm.labelProductionDate) || '').trim() || this.toDateString((this.reportForm && this.reportForm.startTime) || new Date())
      const productionDate = this.toCompactDateYYMMDD(productionDateText) || '-'
      const productionDate8 = this.toCompactDateStringStrict(productionDateText) || ''
      const shipDate = this.toCompactDateStringStrict(String((this.reportForm && this.reportForm.labelShipDate) || '').trim()) || '-'
      const deliveryNoteNo = String((this.reportForm && this.reportForm.deliveryNoteNo) || '').trim() || '-'
      const shelfLifeDays = Math.max(0, Math.trunc(Number((this.reportForm && this.reportForm.shelfLifeDays) || 0) || 0))
      const expiryDate = this.calcExpiryDate(productionDate8 || productionDate, shelfLifeDays) || '-'
      const customerShortName = String((this.reportForm && this.reportForm.customerShortName) || '').trim() || '-'
      const myCompanyName = String((this.reportForm && this.reportForm.myCompanyName) || '东莞市方恩电子材料科技有限公司').trim() || '-'
      const myCompanyAddress = String((this.reportForm && this.reportForm.myCompanyAddress) || '广东省东莞市桥头镇东新路13号2号楼102室').trim() || '-'
      const boxWeightKg = Number((this.reportForm && this.reportForm.boxWeightKg) || 0)
      const boxWeightText = Number.isFinite(boxWeightKg) && boxWeightKg > 0 ? `${Number(boxWeightKg.toFixed(2))}kg` : '-'
      const packageQtyValue = this.formatPackagingQtyByLength((this.reportForm && this.reportForm.lengthM), Number(quantities && quantities.length ? quantities[0] : 0)) || '-'
      const digitalNo = digitalNoRaw || '-'

      const ok = await this.confirmPrintPreview(labelName, [
        { label: '订单号', value: this.composeOrderNoDisplay(this.reportForm.orderNo, this.reportForm.customerOrderNo), field: 'orderNo | orderNoDisplay' },
        { label: '客户订单号', value: this.reportForm.customerOrderNo || '-', field: 'customerOrderNo' },
        { label: '客户简称', value: customerShortName, field: 'customerShortName | customerShort' },
        { label: '我司名称', value: myCompanyName, field: 'myCompanyName | companyName' },
        { label: '我司地址', value: myCompanyAddress, field: 'myCompanyAddress | companyAddress' },
        { label: '任务号', value: this.reportForm.taskNo || '-', field: 'taskNo' },
        { label: '批次号', value: this.reportForm.batchNo || '-', field: 'batchNo | issueBatchNo | slittingBatchNo' },
        { label: '物料代码', value: (alias && alias.customerMaterialCode) || materialCode || '-', field: 'materialCode' },
        { label: '物料名称', value: (alias && alias.customerMaterialName) || materialName || '-', field: 'materialName | productName' },
        { label: '客户规格', value: (alias && alias.customerSpec) || this.formatSlittingSpec(this.reportForm || {}) || '-', field: 'customerSpec | customerSpecText | spec' },
        { label: '卷/筒', value: tubeRollCount, field: 'rollPerTube | tubeRollCount | quantityPerLabel | quantityText' },
        { label: '本箱卷数', value: (quantities && quantities.length) ? quantities.join(' / ') : '-', field: 'boxRollCount | currentBoxRollCount | cartonRollCount | rollsPerBox | rollsInBox | slittingQty' },
        { label: '包装数量(米)', value: packageQtyValue, field: 'packageQtyValue | packageQty | packageQtyM | baozhuangshuliang | shuliangzhongliang | shuliangzhgongliang' },
        { label: '满箱卷数', value: standardBoxRollCount || '-', field: 'standardBoxRollCount | boxRollCountCapacity' },
        { label: '生产日期', value: productionDate || '-', field: 'productionDate | productionDate8 | productionDate6 | shengchanriqi | printDate' },
        { label: '出货日期', value: shipDate, field: 'shipDate | shipDate8 | shipDate6 | deliveryDate | chuhuoriqi' },
        { label: '送货单号', value: deliveryNoteNo, field: 'deliveryNoteNo' },
        { label: '数字号', value: digitalNo, field: 'digitalNo | digitalNumber | sequenceNo' },
        { label: '本箱重量', value: boxWeightText, field: 'grossWeightKg | boxWeightKg | currentBoxWeightKg | netWeightKg | boxWeightText' },
        { label: '保质期(天)', value: shelfLifeDays || '-', field: 'shelfLifeDays' },
        { label: '保质期至', value: expiryDate, field: 'expiryDate | expiryDate8 | expiryDate6 | expiryDateText | youxiaoqi' },
        { label: '备注', value: String((this.reportForm && this.reportForm.remark) || '').trim() || '-', field: 'remark' },
        { label: '二维码内容', value: this.buildSlittingQrPreview(alias) || '-', field: 'qrContent | qrCode' },
        { label: '每张卷数序列', value: (quantities && quantities.length) ? quantities.join(' / ') : '-', field: 'quantityOverride -> quantityPerLabel' },
        { label: '提交批次', value: `${mergedItems.length} 次请求（共 ${printCount} 张）`, field: '同值合并提交(copies)' },
        { label: '筒/箱', value: tubePerBoxCount, field: 'tubePerBoxCount' },
        { label: '卷芯张数', value: corePrintCount, field: '前端输入值(不入payload)' },
        { label: '内标张数', value: innerPrintCount, field: '前端计算值(不入payload)' },
        { label: '外标张数', value: outerPrintCount, field: '前端计算值(不入payload)' },
        { label: '栈板张数', value: palletPrintCount, field: '前端输入值(不入payload)' },
        { label: '本次打印张数', value: printCount, field: 'copies(提交次数)' },
        { label: '纸箱规格', value: `${Number(this.reportForm.cartonLengthMm || 0) || 0}×${Number(this.reportForm.cartonWidthMm || 0) || 0}×${Number(this.reportForm.cartonHeightMm || 0) || 0}`, field: 'cartonLengthMm | cartonWidthMm | cartonHeightMm' },
        { label: '管芯外径(mm)', value: coreOuterDiameterMm > 0 ? coreOuterDiameterMm : '-', field: 'coreOuterDiameterMm' },
        { label: '胶带外径(mm)', value: tapeOuterDiameterText, field: 'tapeOuterDiameterMm' },
        { label: '规格', value: this.formatSlittingSpec(this.reportForm || {}), field: 'spec' }
      ])
      if (!ok) return

      const batchSaved = await this.persistSlittingBatchNoForDeliveryNote()
      if (!batchSaved) return

      await this.persistQrRuleOnFirstPrint(sceneType)
      try {
        this.loadBarTenderConfig()
        const scene = this.getPrintScene(sceneType)
        const sources = []
        for (let i = 0; i < mergedItems.length; i++) {
          const item = mergedItems[i]
          const serialNo = Number(item && item.serialNo) || (i + 1)
          const quantityOverride = Number(item && item.quantityOverride) || 1
          const copies = Math.max(1, Math.trunc(Number(item && item.copies) || 1))
          sources.push({
            serialNo,
            quantityOverride,
            copies
          })
        }
        // 使用批量打印接口，一次性提交所有标签任务给网关，极大提升打印效率
        await printBySceneBatch(scene, sources, {
          config: this.barTenderConfig,
          vm: this,
          alias
        })
        this.$message.success(`已提交BarTender批量打印任务（${labelName}）${printCount}张`)
      } catch (e) {
        const msg = (e && e.message) || '未知错误'
        this.$message.error(`BarTender打印失败：${msg}`)
      }
    },
    async persistSlittingBatchNoForDeliveryNote() {
      const noticeNo = String((this.reportForm && this.reportForm.deliveryNoteNo) || '').trim()
      const batchNo = String((this.reportForm && this.reportForm.batchNo) || '').trim()
      const materialCode = String((this.reportForm && this.reportForm.materialCode) || '').trim()

      if (!noticeNo || !batchNo) {
        return true
      }

      try {
        const res = await request({
          url: '/delivery/append-batch-no',
          method: 'post',
          data: {
            noticeNo,
            batchNo,
            materialCode
          }
        })
        if (res && (res.code === 200 || res.code === 20000)) {
          return true
        }
        this.$message.warning((res && res.msg) || '保存送货单批次号失败，已跳过该步骤继续打印')
        return true
      } catch (e) {
        const status = e && e.response ? Number(e.response.status) : 0
        // 权限不足或认证问题时，不阻断打印主流程
        if (status === 401 || status === 403) {
          this.$message.warning('当前账号无送货单批次回写权限，已跳过回写继续打印')
          return true
        }
        if (status === 405) {
          try {
            const fallbackRes = await request({
              url: '/delivery/append-batch-no',
              method: 'get',
              params: {
                noticeNo,
                batchNo,
                materialCode
              }
            })
            if (fallbackRes && (fallbackRes.code === 200 || fallbackRes.code === 20000)) {
              return true
            }
          } catch (fallbackError) {
            // ignore and use unified error message below
          }
        }
        const msg = (e && e.message) || '未知错误'
        this.$message.warning(`保存送货单批次号失败，已跳过该步骤继续打印：${msg}`)
        return true
      }
    },
    getAdaptivePrintBatchSize(printCount) {
      const configured = Number(this.barTenderConfig && this.barTenderConfig.printConcurrency)
      if (Number.isFinite(configured) && configured > 0) {
        return Math.max(1, Math.min(8, Math.trunc(configured)))
      }
      const count = Math.max(1, Math.trunc(Number(printCount || 1) || 1))
      if (count <= 4) return 2
      if (count <= 12) return 3
      if (count <= 30) return 4
      return 5
    },
    async runPrintJobsInBatches(jobs = [], batchSize = 3) {
      const queue = Array.isArray(jobs) ? jobs : []
      const size = Math.max(1, Math.trunc(Number(batchSize || 1) || 1))
      for (let i = 0; i < queue.length; i += size) {
        const group = queue.slice(i, i + size).map(fn => fn())
        const results = await Promise.allSettled(group)
        const failed = results.find(x => x.status === 'rejected')
        if (failed) {
          throw failed.reason || new Error('打印任务失败')
        }
      }
    },
    calcProducedRollsArea() {
      const rolls = this.reportForm && this.reportForm.producedRolls ? this.reportForm.producedRolls : []
      let total = 0
      rolls.forEach(x => {
        if (!x) return
        total += this.calcRollArea(x.widthMm, x.lengthM)
      })
      return Number(total.toFixed(2))
    },
    calcCoatingHistoryReportedArea() {
      const rows = Array.isArray(this.reportList) ? this.reportList : []
      const total = rows.reduce((sum, row) => {
        const areaDirect = Number((row && (
          row.produced_area != null ? row.produced_area
            : row.producedArea != null ? row.producedArea
              : row.output_sqm != null ? row.output_sqm
                : row.outputSqm
        )) || 0)
        if (Number.isFinite(areaDirect) && areaDirect > 0) {
          return sum + areaDirect
        }

        const lengthM = Number((row && (row.produced_qty != null ? row.produced_qty : row.producedQty)) || 0)
        const widthMm = Number((row && (
          row.width_mm != null ? row.width_mm
            : row.widthMm != null ? row.widthMm
              : row.width
        )) || (this.reportForm && this.reportForm.widthMm) || 0)
        if (Number.isFinite(lengthM) && lengthM > 0 && Number.isFinite(widthMm) && widthMm > 0) {
          return sum + (widthMm / 1000) * lengthM
        }
        return sum
      }, 0)
      return Number(total.toFixed(2))
    },
    calcCoatingOrderReportedTotalArea() {
      if (!this.reportForm || this.reportForm.processType !== 'COATING') return 0
      const historyArea = this.calcCoatingHistoryReportedArea()
      const currentArea = Number(this.calcProducedRollsArea() || 0)
      // 新增报工：展示“历史累计 + 当前录入”；
      // 修改历史报工时，避免与历史列表重复计入，仅展示历史累计。
      if (this.reportEditingId) {
        return Number(historyArea.toFixed(2))
      }
      return Number((historyArea + (Number.isFinite(currentArea) ? currentArea : 0)).toFixed(2))
    },
    calcSlittingDefaultRollPerTube(widthMm) {
      const width = Number(widthMm || 0)
      if (!(width > 0)) return 1
      const n = Math.floor(320 / width)
      return n > 0 ? n : 1
    },
    handleCartonPresetChanged(value) {
      if (!this.reportForm) return
      const selected = String(value || '').trim()
      if (!selected) return
      const hit = (this.cartonPresetOptions || []).find(x => x && x.value === selected)
      if (hit) {
        this.reportForm.cartonLengthMm = Number(hit.lengthMm || 0)
        this.reportForm.cartonWidthMm = Number(hit.widthMm || 0)
        this.reportForm.cartonHeightMm = Number(hit.heightMm || 0)
      }
      this.slittingTubePerBoxManual = false
      this.handleSlittingInputChanged()
    },
    calcCartonPackingResult(lengthMm, widthMm, diameterMm) {
      const L = Number(lengthMm || 0)
      const W = Number(widthMm || 0)
      const dRaw = Number(diameterMm || 0)
      const D = Math.ceil(dRaw)
      if (!(L > 0) || !(W > 0) || !(D > 0)) {
        return { count: 0, diameterRoundedMm: 0, boxWidthMm: L, boxHeightMm: W, circles: [] }
      }

      const buildRectPoints = (a, b, d) => {
        const r = d / 2
        const pts = []
        for (let y = r; y <= b - r + 1e-6; y += d) {
          for (let x = r; x <= a - r + 1e-6; x += d) {
            pts.push({ x, y })
          }
        }
        return pts
      }

      const buildHexBestPoints = (a, b, d) => {
        const r = d / 2
        if (!(a >= d) || !(b >= d)) return []
        const rowStep = d * Math.sqrt(3) / 2
        if (!(rowStep > 0)) return []

        // 扫描步长：直径越小扫描越细；并控制上限避免卡顿
        const stepX = Math.max(0.5, d / 20)
        const stepY = Math.max(0.5, rowStep / 20)
        const maxOx = d
        const maxOy = rowStep
        const eps = 1e-6

        let bestPoints = []

        for (let oy = 0; oy < maxOy + eps; oy += stepY) {
          for (let ox = 0; ox < maxOx + eps; ox += stepX) {
            const points = []
            let rowIndex = 0

            for (let y = r + oy; y <= b - r + eps; y += rowStep) {
              // 奇偶行错位（蜂窝排布）
              const stagger = rowIndex % 2 === 1 ? d / 2 : 0
              let xStart = r + ox + stagger

              // 归一化到可视区域左侧附近
              while (xStart > r + d) xStart -= d
              while (xStart < r) xStart += d

              for (let x = xStart; x <= a - r + eps; x += d) {
                if (x >= r - eps && y >= r - eps && x <= a - r + eps && y <= b - r + eps) {
                  points.push({ x, y })
                }
              }
              rowIndex += 1
            }

            if (points.length > bestPoints.length) bestPoints = points
          }
        }

        return bestPoints
      }

      const mapSwap = points => points.map(p => ({ x: p.y, y: p.x }))
      const candidates = [
        { points: buildRectPoints(L, W, D), swap: false },
        { points: mapSwap(buildRectPoints(W, L, D)), swap: true },
        { points: buildHexBestPoints(L, W, D), swap: false },
        { points: mapSwap(buildHexBestPoints(W, L, D)), swap: true }
      ]
      const best = candidates.reduce((acc, cur) => (cur.points.length > acc.points.length ? cur : acc), { points: [] })
      return {
        count: best.points.length,
        diameterRoundedMm: D,
        boxWidthMm: L,
        boxHeightMm: W,
        circles: best.points
      }
    },
    calcMaxTubeCountInCarton(lengthMm, widthMm, diameterMm) {
      return this.calcCartonPackingResult(lengthMm, widthMm, diameterMm).count
    },
    updateSlittingPackingPreview(packingResult, requestedTubeCount = 0, rollPerTube = 0) {
      const result = packingResult || {}
      const boxW = Number(result.boxWidthMm || 0)
      const boxH = Number(result.boxHeightMm || 0)
      const circles = Array.isArray(result.circles) ? result.circles : []
      const capacity = Math.max(0, Math.trunc(Number(result.count || 0) || 0))
      const requested = Math.max(0, Math.trunc(Number(requestedTubeCount || 0) || 0))
      const displayCount = requested > 0 ? Math.min(requested, capacity) : capacity
      const safeRollPerTube = Math.max(0, Math.trunc(Number(rollPerTube || 0) || 0))
      const fit = requested <= capacity
      const viewWidth = 280
      const viewHeight = 200
      const padding = 8

      if (!(boxW > 0) || !(boxH > 0) || !circles.length) {
        this.slittingPackingPreview = {
          viewWidth,
          viewHeight,
          padding,
          boxWidthPx: 0,
          boxHeightPx: 0,
          circles: [],
          count: capacity,
          diameterRoundedMm: Number(result.diameterRoundedMm || 0),
          requestedCount: requested,
          fitsRequested: fit,
          requestedRollCount: requested * safeRollPerTube
        }
        return
      }

      const innerW = viewWidth - padding * 2
      const innerH = viewHeight - padding * 2
      const scale = Math.min(innerW / boxW, innerH / boxH)
      const boxWidthPx = boxW * scale
      const boxHeightPx = boxH * scale
      const radiusPx = Math.max(1, (Number(result.diameterRoundedMm || 0) / 2) * scale)

      this.slittingPackingPreview = {
        viewWidth,
        viewHeight,
        padding,
        boxWidthPx,
        boxHeightPx,
        circles: circles.slice(0, displayCount).map(p => ({
          cx: padding + Number(p.x || 0) * scale,
          cy: padding + Number(p.y || 0) * scale,
          r: radiusPx
        })),
        count: capacity,
        diameterRoundedMm: Number(result.diameterRoundedMm || 0),
        requestedCount: requested,
        fitsRequested: fit,
        requestedRollCount: requested * safeRollPerTube
      }
    },
    calcSlittingTapeOuterDiameterMm(row) {
      const thicknessUm = this.resolveOrderSpecNumber(row, ['thickness', 'totalThickness', 'total_thickness', 'order_thickness', 'orderThickness'])
      const lengthM = this.resolveOrderSpecNumber(row, ['lengthM', 'length', 'order_length', 'orderLength', 'planLength', 'processLength', 'process_length'])
      const coreOuterDiameterMm = Number((row && row.coreOuterDiameterMm) || 0)
      if (!(thicknessUm > 0) || !(lengthM > 0) || !(coreOuterDiameterMm > 0)) return null

      const tMm = Number(thicknessUm) / 1000
      const lMm = Number(lengthM) * 1000
      const dMm = Number(coreOuterDiameterMm)
      const outer = Math.sqrt((dMm * dMm) + (4 * tMm * lMm / Math.PI))
      return Number.isFinite(outer) && outer > 0 ? Number(outer.toFixed(2)) : null
    },
    calcSlittingTapeOuterDiameterText(row) {
      const v = this.calcSlittingTapeOuterDiameterMm(row)
      return v != null ? String(v) : '-'
    },
    calcSlittingInnerLabelCount(producedQty, tubeRollCount) {
      const qty = Math.max(0, Math.trunc(Number(producedQty || 0) || 0))
      const perTube = Math.max(0, Math.trunc(Number(tubeRollCount || 0) || 0))
      if (!(qty > 0) || !(perTube > 0)) return 0
      return Math.ceil(qty / perTube)
    },
    calcSlittingOuterLabelCount(producedQty, tubeRollCount, tubePerBoxCount) {
      const qty = Math.max(0, Math.trunc(Number(producedQty || 0) || 0))
      const perTube = Math.max(0, Math.trunc(Number(tubeRollCount || 0) || 0))
      const tubePerBox = Math.max(0, Math.trunc(Number(tubePerBoxCount || 0) || 0))
      if (!(qty > 0) || !(perTube > 0) || !(tubePerBox > 0)) return 0
      const perBoxRolls = perTube * tubePerBox
      if (!(perBoxRolls > 0)) return 0
      return Math.ceil(qty / perBoxRolls)
    },
    buildSlittingInnerLabelQuantities(producedQty, tubeRollCount, tubePerBoxCount, printCount, sceneType) {
      const count = Math.max(0, Math.trunc(Number(printCount || 0) || 0))
      const perTube = Math.max(0, Math.trunc(Number(tubeRollCount || 0) || 0))
      const perBoxTube = Math.max(0, Math.trunc(Number(tubePerBoxCount || 0) || 0))
      const qty = Math.max(0, Math.trunc(Number(producedQty || 0) || 0))
      if (!(count > 0)) return []

      let unitQty = 1
      if (sceneType === 'slitting-inner-label') {
        unitQty = perTube > 0 ? perTube : 1
      } else if (sceneType === 'slitting-core-label') {
        unitQty = 1 // 卷芯标签固定为单卷
      } else if (sceneType === 'slitting-outer-label') {
        const perBoxRolls = perTube * perBoxTube
        unitQty = perBoxRolls > 0 ? perBoxRolls : (perTube > 0 ? perTube : 1)
      } else {
        unitQty = perTube > 0 ? perTube : 1
      }

      if (!(unitQty > 0) || !(qty > 0)) {
        return Array.from({ length: count }, () => 1)
      }

      const result = []
      let remaining = qty
      for (let i = 0; i < count; i++) {
        if (i === count - 1) {
          // 最后一张标签承担所有剩余数量（可能是尾数，也可能是超出的余量）
          result.push(Math.max(0, remaining))
        } else {
          const v = Math.min(remaining, unitQty)
          result.push(Math.max(0, v))
          remaining -= v
        }
      }
      return result
    },
    buildMergedSlittingPrintItems(quantities = []) {
      const list = Array.isArray(quantities) ? quantities : []
      if (!list.length) return []
      // 过滤掉数量为0的任务，并重新生成连续的流水号，解决“跳序号”问题
      const result = []
      let validSerial = 1
      for (let i = 0; i < list.length; i++) {
        const qty = Math.max(0, Math.trunc(Number(list[i]) || 0))
        if (qty <= 0) continue

        result.push({
          serialNo: validSerial++, // 使用独立计数器，确保序号连续
          quantityOverride: qty,
          copies: 1
        })
      }
      return result
    },
    handleSlittingTubePerBoxChanged(value) {
      if (!this.reportForm) return
      this.slittingTubePerBoxManual = true
      const normalized = Math.max(0, Math.trunc(Number(value || 0) || 0))
      this.reportForm.slittingTubePerBoxCount = normalized
      this.handleSlittingInputChanged()
    },
    handleSlittingInputChanged() {
      if (!this.reportForm || this.reportForm.processType !== 'SLITTING') return
      const producedQty = Math.max(0, Math.trunc(Number(this.reportForm.producedQty || 0) || 0))
      const tubeRollCount = Math.max(1, Math.trunc(Number(this.reportForm.slittingRollPerTube || 0) || 1))
      this.reportForm.slittingTubeRollCount = tubeRollCount

      const tapeOuterDiameterMm = this.calcSlittingTapeOuterDiameterMm(this.reportForm || {})
      const packingResult = this.calcCartonPackingResult(
        this.reportForm.cartonLengthMm,
        this.reportForm.cartonWidthMm,
        tapeOuterDiameterMm
      )
      const autoTubePerBox = Number(packingResult.count || 0)
      if (!this.slittingTubePerBoxManual || !(Number(this.reportForm.slittingTubePerBoxCount) > 0)) {
        this.reportForm.slittingTubePerBoxCount = autoTubePerBox
      }
      this.updateSlittingPackingPreview(packingResult, this.reportForm.slittingTubePerBoxCount, tubeRollCount)

      const innerCount = this.calcSlittingInnerLabelCount(producedQty, tubeRollCount)
      const outerCount = this.calcSlittingOuterLabelCount(producedQty, tubeRollCount, this.reportForm.slittingTubePerBoxCount)
      this.reportForm.slittingCorePrintCount = producedQty
      this.reportForm.slittingInnerPrintCount = innerCount
      this.reportForm.slittingOuterPrintCount = outerCount
      this.reportForm.slittingPalletPrintCount = outerCount
    },
    resolveMaterialNameByCode(materialCode) {
      const code = String(materialCode || '').trim()
      if (!code) return ''
      const fromForm = String((this.reportForm && this.reportForm.materialName) || '').trim()
      if (fromForm) return fromForm
      const hit = (this.list || []).find(x => {
        const c = String((x && (x.materialCode || x.material_code)) || '').trim()
        return c === code
      })
      return String((hit && (hit.materialName || hit.material_name || hit.productName || hit.product_name || hit.name)) || '').trim()
    },
    formatAreaNum(value) {
      const n = Number(value || 0)
      return Number.isFinite(n) ? n.toFixed(2) : '0.00'
    },
    extractTaskArea(row) {
      const areaDirect = Number(
        (row && (
          row.area != null ? row.area
            : row.coatingArea != null ? row.coatingArea
              : row.coating_area != null ? row.coating_area
                : row.planArea != null ? row.planArea
                  : row.scheduleArea != null ? row.scheduleArea
                    : row.schedule_area
        )) || 0
      )
      if (Number.isFinite(areaDirect) && areaDirect > 0) return areaDirect

      const widthMm = Number((row && (
        row.widthMm != null ? row.widthMm
          : row.width_mm != null ? row.width_mm
            : row.width != null ? row.width
              : row.order_width != null ? row.order_width
                : row.orderWidth != null ? row.orderWidth
                  : row.processWidth != null ? row.processWidth
                    : row.process_width
      )) || 0)
      const lengthM = Number((row && (
        row.length != null ? row.length
          : row.lengthM != null ? row.lengthM
            : row.order_length != null ? row.order_length
              : row.orderLength != null ? row.orderLength
                : row.processLength != null ? row.processLength
                  : row.process_length != null ? row.process_length
                    : row.planLength != null ? row.planLength
                      : row.coating_length
      )) || 0)
      const qty = Number((row && (
        row.qty != null ? row.qty
          : row.quantity != null ? row.quantity
            : row.scheduleQty != null ? row.scheduleQty
              : row.schedule_qty != null ? row.schedule_qty
                : row.orderQty != null ? row.orderQty
                  : row.order_qty
      )) || 0)

      if (Number.isFinite(widthMm) && widthMm > 0 && Number.isFinite(lengthM) && lengthM > 0 && Number.isFinite(qty) && qty > 0) {
        return Number(((widthMm / 1000) * lengthM * qty).toFixed(2))
      }

      return Number.isFinite(areaDirect) ? areaDirect : 0
    },
    extractTaskQty(row) {
      const qty = Number((row && (
        row.qty != null ? row.qty
          : row.quantity != null ? row.quantity
            : row.scheduleQty != null ? row.scheduleQty
              : row.schedule_qty != null ? row.schedule_qty
                : row.orderQty != null ? row.orderQty
                  : row.order_qty
      )) || 0)
      return Number.isFinite(qty) ? qty : 0
    },
    extractReportedQty(row) {
      const type = String((row && (row._type || row.type || row.processType)) || '').toLowerCase()
      let reported = Number((row && (
        type === 'coating'
          ? (row.coating_report_qty != null ? row.coating_report_qty : row.coatingReportQty)
          : type === 'rewinding'
            ? (row.rewinding_report_qty != null ? row.rewinding_report_qty : row.rewindingReportQty)
            : type === 'slitting'
              ? (row.slitting_report_qty != null ? row.slitting_report_qty : row.slittingReportQty)
              : (row.report_qty != null ? row.report_qty
                : row.reportQty != null ? row.reportQty
                  : row.produced_qty != null ? row.produced_qty
                    : row.producedQty)
      )) || 0)

      if (!Number.isFinite(reported) || reported < 0) reported = 0
      return reported
    },
    extractReportedArea(row) {
      const reportAreaDirect = Number((row && (
        row.reportedArea != null ? row.reportedArea
          : row.reported_area != null ? row.reported_area
            : row.produced_area != null ? row.produced_area
              : row.producedArea != null ? row.producedArea
                : row.output_sqm != null ? row.output_sqm
                  : row.outputSqm
      )) || 0)
      if (Number.isFinite(reportAreaDirect) && reportAreaDirect > 0) {
        return Number(reportAreaDirect.toFixed(2))
      }

      const reportedQty = this.extractReportedQty(row)
      if (!(reportedQty > 0)) return 0

      const type = String((row && (row._type || row.type || row.processType)) || '').toLowerCase()

      const widthMm = Number((row && (
        row.widthMm != null ? row.widthMm
          : row.width_mm != null ? row.width_mm
            : row.width != null ? row.width
              : row.order_width != null ? row.order_width
                : row.orderWidth != null ? row.orderWidth
                  : row.processWidth != null ? row.processWidth
                    : row.process_width
      )) || 0)
      const lengthM = Number((row && (
        row.length != null ? row.length
          : row.lengthM != null ? row.lengthM
            : row.order_length != null ? row.order_length
              : row.orderLength != null ? row.orderLength
                : row.processLength != null ? row.processLength
                  : row.process_length != null ? row.process_length
                    : row.planLength != null ? row.planLength
                      : row.coating_length
      )) || 0)

      // 涂布：reportedQty 语义是“已报工长度(米)”，面积=宽度(m)*长度(m)
      if (type === 'coating') {
        // 涂布报工 producedQty/coating_report_qty 当前口径为“面积(㎡)”，无需再乘宽度
        return Number(reportedQty.toFixed(2))
      }

      if (Number.isFinite(widthMm) && widthMm > 0 && Number.isFinite(lengthM) && lengthM > 0) {
        return Number(((widthMm / 1000) * lengthM * reportedQty).toFixed(2))
      }

      const plannedArea = this.extractTaskArea(row)
      const plannedQty = this.extractTaskQty(row)
      if (plannedArea > 0 && plannedQty > 0) {
        return Number(((plannedArea / plannedQty) * reportedQty).toFixed(2))
      }
      if (plannedArea > 0) {
        return Number(plannedArea.toFixed(2))
      }
      return 0
    },
    calcTaskSummary(rows) {
      const list = rows || []
      const materialCodeSet = new Set(
        list
          .map(x => String((x && x.materialCode) || '').trim())
          .filter(Boolean)
      )
      const reportedRows = list.filter(x => this.extractReportedQty(x) > 0)
      const reportedMaterialCodeSet = new Set(
        reportedRows
          .map(x => String((x && x.materialCode) || '').trim())
          .filter(Boolean)
      )
      const totalArea = list.reduce((sum, row) => sum + this.extractTaskArea(row), 0)
      const reportedArea = reportedRows.reduce((sum, row) => sum + this.extractReportedArea(row), 0)
      return {
        materialCodeCount: materialCodeSet.size,
        totalArea: Number(totalArea.toFixed(2)),
        reportedMaterialCodeCount: reportedMaterialCodeSet.size,
        reportedArea: Number(reportedArea.toFixed(2))
      }
    },
    normalizeTaskList(rawList, ft) {
      let list = rawList || []

      if (ft === 'coating') {
        list = list.map(row => ({
          ...(() => {
            const start = row.coating_schedule_date || row.coating_date
            let end = row.coating_end_time || null
            const duration = Number(row.coating_duration_minutes || 0)
            if (!end && start && duration > 0) {
              const s = new Date(String(start).replace(' ', 'T'))
              if (!Number.isNaN(s.getTime())) {
                end = new Date(s.getTime() + duration * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ')
              }
            }
            return { _planStart: start, _planEnd: end }
          })(),
          id: row.id || row.schedule_id,
          taskNo: row.taskNo || row.task_no || row.batchNo || row.batch_no || (() => {
            const d = row.coating_schedule_date || row.coating_date
            const dt = d ? new Date(String(d).replace(' ', 'T')) : new Date()
            const yy = String(dt.getFullYear()).slice(-2)
            const mm = String(dt.getMonth() + 1).padStart(2, '0')
            const dd = String(dt.getDate()).padStart(2, '0')
            const seq = String((Number(row.id || row.schedule_id) % 100) || 1).padStart(2, '0')
            return `TB-${yy}${mm}${dd}-${seq}`
          })(),
          type: 'coating',
          sourceType: 'MANUAL_COATING',
          orderNo: row.related_order_nos || row.order_nos || row.order_no,
          materialCode: row.material_code,
          materialName: row.material_name || row.product_name || row.productName || row.name || '',
          colorName: row.color_name || '',
          thickness: row.thickness,
          jumboWidth: row.coating_width != null ? row.coating_width : (row.width != null ? row.width : row.jumbo_width),
          planLength: row.coating_length != null ? row.coating_length : (row.length != null ? row.length : row.plan_length),
          equipmentCode: row.coating_equipment || '',
          equipmentId: null,
          planStartTime: (row.coating_schedule_date || row.coating_date),
          planEndTime: (row.coating_end_time || null),
          planDurationMinutes: row.coating_duration_minutes,
          status: row.status || 'COATING_SCHEDULED',
          coatingReportQty: row.coating_report_qty,
          qty: row.schedule_qty,
          area: row.coating_area
        })).map(r => ({
          ...r,
          planStartTime: r._planStart || r.planStartTime,
          planEndTime: r._planEnd || r.planEndTime
        }))
      }

      list = list.sort((a, b) => {
        const ta = a && a.planStartTime ? new Date(a.planStartTime).getTime() : Number.MAX_SAFE_INTEGER
        const tb = b && b.planStartTime ? new Date(b.planStartTime).getTime() : Number.MAX_SAFE_INTEGER
        return ta - tb
      })

      return list.map(row => ({
        ...(row || {}),
        _type: ((row && (row.type || row.processType)) || this.query.type || this.fixedType || '').toString().toLowerCase(),
        _qtyRaw: (row && (row.rewindingQty != null ? row.rewindingQty
          : row.slittingQty != null ? row.slittingQty
            : row.scheduleQty != null ? row.scheduleQty
              : row.schedule_qty != null ? row.schedule_qty
                : null)),
        ...row,
        taskNo: row.taskNo || row.batchNo || (() => {
          if (!row.planId && !row.schedule_id && !row.scheduleId && !row.id) return '-'
          const stage = String((row.processType || row.type || 'PLAN')).toUpperCase()
          const prefix = stage === 'COATING' ? 'TB' : (stage === 'REWINDING' ? 'FJ' : (stage === 'SLITTING' ? 'FQ' : 'PLAN'))
          const width = stage === 'SLITTING' ? 3 : 2
          const d = row.planStartTime || row.plan_start_time || row.planDate || row.plan_date || row.packaging_date || row.slitting_schedule_date || row.slitting_start_time
          const dateObj = d ? new Date(String(d).replace(' ', 'T')) : new Date()
          const yy = String(dateObj.getFullYear()).slice(-2)
          const mm = String(dateObj.getMonth() + 1).padStart(2, '0')
          const dd = String(dateObj.getDate()).padStart(2, '0')
          const seqBase = Number(row.planId || row.schedule_id || row.scheduleId || row.id) || 1
          const mod = Math.pow(10, width)
          const seq = String(((seqBase % mod) || 1)).padStart(width, '0')
          return `${prefix}-${yy}${mm}${dd}-${seq}`
        })(),
        type: row.type || (row.processType ? String(row.processType).toLowerCase() : this.query.type || this.fixedType),
        orderNo: row.orderNo || row.order_no,
        materialCode: row.materialCode || row.material_code,
        materialName: row.materialName || row.material_name || row.productName || row.product_name || row.name || '',
        orderQty: row.orderQty != null ? row.orderQty : (row.order_qty != null ? row.order_qty : (row.rolls != null ? row.rolls : (row.orderRolls != null ? row.orderRolls : row.order_rolls))),
        thickness: row.thickness || row.totalThickness || row.total_thickness || row.order_thickness || row.orderThickness,
        rewindingWidth: row.rewindingWidth || row.rewinding_width || row.processWidth || row.process_width || 500,
        rewindingLength: row.rewindingLength || row.rewinding_length,
        widthMm: row.widthMm || row.width_mm || row.width || row.order_width || row.orderWidth || row.processWidth || row.process_width,
        length: row.length || row.lengthM || row.order_length || row.orderLength || row.processLength || row.process_length,
        planStartTime: row.planStartTime || row.plan_start_time || row.planDate || row.plan_date || row.packaging_date || row.slitting_schedule_date || row.slitting_start_time,
        planEndTime: row.planEndTime || row.plan_end_time || row.slitting_end_time,
        planDurationMinutes: row.planDurationMinutes || row.durationMinutes || row.duration_minutes || row.coating_duration_minutes || row.rewinding_duration_minutes || row.slitting_duration_minutes,
        qty: (() => {
          const t = ((row && (row.type || row.processType)) || this.query.type || this.fixedType || '').toString().toLowerCase()
          if (t === 'rewinding') {
            return this.resolveRewindingPlannedQty(row)
          }
          if (t === 'slitting') {
            const n = this.resolveSlittingPlannedQty(row)
            return Number.isFinite(n) && n > 0 ? Math.round(n) : null
          }
          return row.qty != null ? row.qty : (row.quantity != null ? row.quantity : row.area)
        })(),
        equipmentCode: row.equipmentCode || row.equipmentName || row.equipment || row.slitting_equipment || row.rewinding_equipment || '',
        status: (() => {
          const explicit = row.status
          if (explicit && ['SCHEDULED', 'UNSCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].includes(String(explicit).toUpperCase())) {
            return String(explicit).toUpperCase()
          }
          const t = ((row && (row.type || row.processType)) || this.query.type || this.fixedType || '').toString().toLowerCase()
          if (t !== 'slitting') {
            return explicit || row.taskStatus || row.scheduleStatus || 'SCHEDULED'
          }
          if (row.slitting_end_time || row.actualEndTime) return 'COMPLETED'
          if (row.slitting_start_time || row.actualStartTime) return 'IN_PROGRESS'
          if (row.packaging_date || row.slitting_schedule_date || row.planDate || row.plan_date || row.planStartTime || row.plan_start_time) return 'SCHEDULED'
          return 'UNSCHEDULED'
        })()
      }))
    },
    normalizeMaterialCode(materialCode) {
      return String(materialCode || '').trim().toUpperCase()
    },
    shouldUseMasterMaterialName(materialCode, materialName) {
      const code = String(materialCode || '').trim()
      if (!code) return false
      return true
    },
    async enrichTaskMaterialNamesFromMaster(rows) {
      const list = Array.isArray(rows) ? rows : []
      if (!list.length) return list

      const codeSet = new Set(
        list
          .map(x => String((x && x.materialCode) || '').trim())
          .filter(Boolean)
      )
      const missingCodes = Array.from(codeSet).filter(code => !Object.prototype.hasOwnProperty.call(this.materialNameByCodeCache, code))

      if (missingCodes.length) {
        await Promise.all(missingCodes.map(async(code) => {
          let name = ''
          try {
            const res = await getSpecByMaterialCode(code)
            const spec = (res && (res.code === 200 || res.code === 20000)) ? (res.data || {}) : {}
            name = String(spec.productName || spec.materialName || spec.name || '').trim()
          } catch (e) {
            name = ''
          }
          this.$set(this.materialNameByCodeCache, code, name)
        }))
      }

      return list.map(row => {
        const code = String((row && row.materialCode) || '').trim()
        if (!code) return row
        const currentName = String((row && row.materialName) || '').trim()
        const masterName = String(this.materialNameByCodeCache[code] || '').trim()
        if (!masterName) return row
        if (!this.shouldUseMasterMaterialName(code, currentName)) return row
        return {
          ...row,
          materialName: masterName
        }
      })
    },
    async loadTaskSummary(ft, totalHint) {
      const expectedTotal = Number(totalHint || 0)
      if (!(expectedTotal > 0)) {
        this.taskSummary = { materialCodeCount: 0, totalArea: 0, reportedMaterialCodeCount: 0, reportedArea: 0 }
        return
      }

      let res
      if (ft === 'coating') {
        const size = Math.max(1, Math.min(expectedTotal, 200000))
        res = await getCoatingSchedules({
          current: 1,
          size,
          planDateStart: this.query.dateRange && this.query.dateRange.length ? this.query.dateRange[0] : undefined,
          planDateEnd: this.query.dateRange && this.query.dateRange.length ? this.query.dateRange[1] : undefined,
          status: this.query.status || undefined
        })
      } else if (['rewinding', 'slitting'].includes(ft)) {
        const stageMap = { coating: 'COATING', rewinding: 'REWINDING', slitting: 'SLITTING' }
        res = await getStagePlanTaskSummary({
          stage: stageMap[ft],
          status: this.query.status || undefined,
          finishState: this.query.finishState || undefined,
          orderNo: this.normalizeOrderNoKeyword(this.query.orderNo) || undefined,
          materialCode: this.normalizeKeywordText(this.query.materialCodeKeyword) || undefined,
          specKeyword: this.normalizeKeywordText(this.query.specKeyword) || undefined,
          planDateStart: this.query.dateRange && this.query.dateRange.length ? this.query.dateRange[0] : undefined,
          planDateEnd: this.query.dateRange && this.query.dateRange.length ? this.query.dateRange[1] : undefined
        })
      } else {
        const size = Math.max(1, Math.min(expectedTotal, 200000))
        res = await getProductionTasks({
          type: this.query.type || undefined,
          status: this.query.status || undefined,
          planDateStart: this.query.dateRange && this.query.dateRange.length ? this.query.dateRange[0] : undefined,
          planDateEnd: this.query.dateRange && this.query.dateRange.length ? this.query.dateRange[1] : undefined,
          pageNum: 1,
          pageSize: size
        })
      }

      if (!(res && (res.code === 200 || res.code === 20000))) {
        this.taskSummary = { materialCodeCount: 0, totalArea: 0, reportedMaterialCodeCount: 0, reportedArea: 0 }
        return
      }

      const raw = res.data || {}
      if (['rewinding', 'slitting'].includes(ft)) {
        this.taskSummary = {
          materialCodeCount: Number(raw.materialCodeCount || 0),
          totalArea: Number(raw.totalArea || 0),
          reportedMaterialCodeCount: Number(raw.reportedMaterialCodeCount != null ? raw.reportedMaterialCodeCount : raw.materialCodeCount || 0),
          reportedArea: Number(raw.reportedArea != null ? raw.reportedArea : raw.totalArea || 0)
        }
        return
      }

      const allRows = raw.list || raw.records || []
      const normalized = this.normalizeTaskList(allRows, ft)
      this.taskSummary = this.calcTaskSummary(normalized)
    },
    computeIssueLoss(planArea, actualArea) {
      const plan = Number(planArea || 0)
      const actual = Number(actualArea || 0)
      const diff = actual - plan
      return Number((diff > 0 ? diff : 0).toFixed(2))
    },
    handleIssueAreaChange(row) {
      if (!row) return
      const loss = this.computeIssueLoss(row.planArea, row.actualArea)
      this.$set(row, 'lossArea', loss)
    },
    formatIssueLoss(row) {
      const loss = this.computeIssueLoss(row && row.planArea, row && row.actualArea)
      return Number(loss || 0).toFixed(2)
    },
    buildOperatorWithGroup() {
      return `${this.currentOperatorName}-${this.currentWorkGroup}班`
    },
    async generateNextRollCode(scheduleId, productionDateTime) {
      if (!scheduleId) return ''
      try {
        const res = await getNextCoatingRollCode({
          scheduleId,
          workGroup: this.currentWorkGroup,
          productionDateTime
        })
        if (res && (res.code === 200 || res.code === 20000)) {
          return String(res.data || '').trim()
        }
      } catch (e) {
        // ignore and fallback
      }
      return ''
    },
    buildUniqueRollCode(seedCode) {
      const used = new Set((this.reportForm.producedRolls || [])
        .map(x => String((x && x.rollCode) || '').trim())
        .filter(Boolean))
      const seed = String(seedCode || '').trim()
      if (!seed) return ''

      const matched = seed.match(/^(.*?)(\d+)$/)
      if (!matched) {
        let candidate = seed
        let i = 1
        while (used.has(candidate)) {
          candidate = `${seed}${String(i).padStart(2, '0')}`
          i += 1
        }
        return candidate
      }

      const prefix = matched[1]
      const width = matched[2].length
      let seq = Number(matched[2])
      if (!Number.isFinite(seq) || seq < 0) {
        seq = 0
      }
      let candidate = seed
      while (used.has(candidate)) {
        seq += 1
        candidate = `${prefix}${String(seq).padStart(width, '0')}`
      }
      return candidate
    },
    async resolveScheduleId(row) {
      const direct = Number(row && (row.schedule_id || row.scheduleId || row.id))
      const isManualLike = String((row && row.sourceType) || '').toUpperCase().includes('MANUAL')
      if (Number.isFinite(direct) && direct > 0 && ((row && (row.schedule_id || row.scheduleId)) || (isManualLike && !(row && row.planId)))) {
        return direct
      }
      const orderDetailId = Number(row && (row.orderItemId || row.order_detail_id || row.orderDetailId))
      if (!Number.isFinite(orderDetailId) || orderDetailId <= 0) return null
      const res = await getLatestScheduleId({ orderDetailId })
      if (res.code === 200 || res.code === 20000) {
        const id = Number(res.data || 0)
        return id > 0 ? id : null
      }
      return null
    },
    openLabelPrintDialog(row) {
      return this.openReportDialog(row, 'print')
    },
    ensureSlittingBatchOption(value) {
      const text = String(value || '').trim()
      if (!text) return
      if (!Array.isArray(this.slittingIssuedBatchOptions)) {
        this.slittingIssuedBatchOptions = [text]
        return
      }
      if (!this.slittingIssuedBatchOptions.includes(text)) {
        this.slittingIssuedBatchOptions = [text].concat(this.slittingIssuedBatchOptions)
      }
    },
    commitSlittingBatchNoInput() {
      if (!this.reportForm || this.reportForm.processType !== 'SLITTING') return
      const current = String(this.reportForm.batchNo || '').trim()
      const selectRef = this.$refs && this.$refs.slittingBatchNoSelect
      const query = String((selectRef && selectRef.query) || '').trim()
      const finalValue = current || query
      if (!finalValue) return
      this.reportForm.batchNo = finalValue
      this.ensureSlittingBatchOption(finalValue)
    },
    async loadSlittingIssuedBatchOptions() {
      if (!this.reportForm || this.reportForm.processType !== 'SLITTING') {
        this.slittingIssuedBatchOptions = []
        return
      }
      const orderNo = this.resolvePrintableOrderNo(this.reportForm.orderNo)
      const materialCode = String(this.reportForm.materialCode || '').trim()
      const planDate = this.resolveTaskLockDate(this.reportForm) || this.todayDate()
      if (!orderNo || !materialCode) {
        this.slittingIssuedBatchOptions = []
        return
      }
      try {
        const res = await queryOrderLockedStocks(materialCode, planDate, orderNo, '', 'SLITTING', null)
        const list = (res && (res.code === 200 || res.code === 20000) && Array.isArray(res.data)) ? res.data : []
        const toBatchNo = (row) => {
          const candidates = [row && row.batchNo, row && row.rollCode, row && row.sourceBatchNo, row && row.stockBatchNo, row && row.tapeBatchNo]
          for (let i = 0; i < candidates.length; i++) {
            const text = String(candidates[i] || '').trim()
            if (text) return text
          }
          return ''
        }
        const isIssued = (row) => {
          const status = String((row && row.lockStatus) || '').trim().toUpperCase()
          return status === 'ALLOCATED' || status === 'PICKED' || status === '已领料'
        }

        const issued = list.filter(isIssued).map(toBatchNo).filter(Boolean)
        const fallback = list.map(toBatchNo).filter(Boolean)
        const current = String(this.reportForm.batchNo || '').trim()
        const uniq = Array.from(new Set((issued.length ? issued : fallback)))
        if (current && !uniq.includes(current)) {
          uniq.unshift(current)
        }
        this.slittingIssuedBatchOptions = uniq
        if (!String(this.reportForm.batchNo || '').trim() && uniq.length) {
          this.reportForm.batchNo = uniq[0]
        }
      } catch (e) {
        this.slittingIssuedBatchOptions = []
      }
    },
    async openReportDialog(row, mode = 'report') {
      try {
        this.reportDialogMode = mode === 'print' ? 'print' : 'report'
        this.reportEditingId = null
        await this.loadCartonPresetOptions()
        const materialCode = String((row && (row.materialCode || row.material_code)) || '').trim()
        const rawOrderNo = String((row && (row.orderNo || row.order_no)) || '').trim()
        const normalizedOrderNo = this.resolvePrintableOrderNo(rawOrderNo)
        const scheduleId = await this.resolveScheduleId(row)
        const orderDetailId = Number(row && (row.orderItemId || row.order_detail_id || row.orderDetailId))
        if (!scheduleId && !(Number.isFinite(orderDetailId) && orderDetailId > 0)) {
          this.$message.warning('未找到对应排程ID，暂无法报工')
          return
        }
        const now = this.toDateTimeString(new Date())
        const processType = this.inferProcessType(row)
        const orderDetailRemark = await this.resolveOrderDetailRemarkForReportRow(row)
        const customerCode = await this.resolveCustomerCodeForReportRow(row)
        const customerOrderNo = await this.resolveCustomerOrderNoForReportRow(row)
        if (processType === 'SLITTING' && !this.cartonPresetOptions.length) {
          this.$message.warning('请先到研发管理-纸箱料号维护中新增纸箱规格')
        }
        const planQty = processType === 'COATING'
          ? Number(row.area || row.coating_area || row.planArea || 0)
          : processType === 'REWINDING'
            ? this.resolveRewindingPlannedQty(row)
            : this.resolveSlittingPlannedQty(row)
        const defaultQty = processType === 'COATING' ? null : (Number.isFinite(planQty) && planQty > 0
          ? (processType === 'SLITTING' ? Math.max(1, Math.round(planQty)) : planQty)
          : null)
        const productionDate = this.toDateString(now)
        const shipDate = this.resolveDateTextFromRow(row)
        let deliveryNoteNo = ''
        if (processType === 'SLITTING') {
          deliveryNoteNo = await this.resolveDeliveryNoteNoByCustomerAndOrder(customerCode, normalizedOrderNo || rawOrderNo)
        }
        deliveryNoteNo = String(deliveryNoteNo || '').trim()
        const shelfLifeDays = Math.max(0, Math.trunc(Number((row && (row.shelfLifeDays || row.shelf_life_days)) || 0) || 0)) || 365
        const boxWeightKg = Number((row && (row.boxWeightKg || row.box_weight_kg || row.weightKg || row.weight_kg)) || 0)
        const widthMm = Number(row.widthMm || row.width_mm || row.width || row.order_width || row.orderWidth || row.processWidth || row.process_width || 0) || null
        const defaultSlittingCount = processType === 'SLITTING' ? this.calcSlittingDefaultRollPerTube(widthMm) : 1
        const defaultProducedQty = processType === 'SLITTING' ? (defaultQty || 0) : 0
        const defaultTubeRollCount = processType === 'SLITTING' ? 0 : 0
        const defaultCarton = processType === 'SLITTING'
          ? this.getDefaultCartonPreset()
          : { value: '', lengthMm: 0, widthMm: 0, heightMm: 0 }
        const defaultInnerPrintCount = processType === 'SLITTING'
          ? this.calcSlittingInnerLabelCount(defaultProducedQty, defaultTubeRollCount)
          : 0
        const producedRolls = []
        this.reportForm = {
          scheduleId,
          orderDetailId: Number.isFinite(orderDetailId) && orderDetailId > 0 ? orderDetailId : null,
          processType,
          taskNo: row.taskNo || row.task_no || '',
          orderNo: normalizedOrderNo || rawOrderNo,
          customerOrderNo: customerOrderNo || row.customerOrderNo || row.customer_order_no || row.customerOrderNumber || '',
          customerShortName: String((row && (row.customerShortName || row.shortName || row.customer_name || row.customerName || row.customer || '')) || '').trim(),
          materialCode,
          materialName: row.materialName || row.material_name || row.productName || row.product_name || row.name || '',
          customerCode: customerCode || '',
          orderDetailRemark,
          lineNo: orderDetailRemark,
          batchNo: '',
          batchNoRequired: true,
          thickness: row.thickness || row.totalThickness || row.total_thickness || row.order_thickness || row.orderThickness || '',
          widthMm,
          lengthM: Number(row.length || row.lengthM || row.order_length || row.orderLength || row.processLength || row.process_length || 0) || null,
          rewindingSpec: processType === 'REWINDING' ? this.resolveRewindingTaskSpec(row) : '',
          coatingUseRewindingLabel: false,
          coatingWidthSeedMm: null,
          rewindingMotherRollCode: '',
          rewindingLabelLengthM: null,
          rewindingMotherInfo: null,
          rewindingSerialStart: 1,
          rewindingPrintCount: null,
          coreOuterDiameterMm: Number(row.coreOuterDiameterMm || row.core_outer_diameter || row.coreDiameter || 87.5) || 87.5,
          cartonPreset: processType === 'SLITTING' ? String(defaultCarton.value || '') : '',
          cartonLengthMm: processType === 'SLITTING' ? Number(defaultCarton.lengthMm || 0) : 0,
          cartonWidthMm: processType === 'SLITTING' ? Number(defaultCarton.widthMm || 0) : 0,
          cartonHeightMm: processType === 'SLITTING' ? Number(defaultCarton.heightMm || 0) : 0,
          slittingRollPerTube: defaultSlittingCount,
          slittingTubePerBoxCount: 0,
          slittingTubeRollCount: defaultTubeRollCount,
          slittingCoreLabelBizType: 'SLITTING_CORE_LABEL',
          slittingQrRuleBizType: 'SLITTING_OUTER_LABEL',
          slittingDigitalNoRequired: true,
          slittingDigitalNo: '',
          slittingCorePrintCount: defaultProducedQty,
          slittingInnerPrintCount: defaultInnerPrintCount,
          slittingOuterPrintCount: defaultInnerPrintCount,
          slittingPalletPrintCount: defaultInnerPrintCount,
          boxWeightKg: processType === 'SLITTING' && Number.isFinite(boxWeightKg) && boxWeightKg > 0 ? Number(boxWeightKg.toFixed(2)) : null,
          labelProductionDate: processType === 'SLITTING' ? productionDate : '',
          labelShipDate: processType === 'SLITTING' ? shipDate : '',
          deliveryNoteNo: processType === 'SLITTING' ? deliveryNoteNo : '',
          shelfLifeDays: processType === 'SLITTING' ? shelfLifeDays : 365,
          qrTemplate: processType === 'SLITTING' ? this.getDefaultSlittingQrTemplate() : '',
          qrTemplateEditable: true,
          myCompanyName: '东莞市方恩电子材料科技有限公司',
          myCompanyAddress: '广东省东莞市桥头镇东新路13号2号楼102室',
          myCompanyPhone: '0769-82551118',
          startTime: now,
          endTime: now,
          enableSegment: true,
          planQty: Number.isFinite(planQty) && planQty > 0 ? planQty : 0,
          producedQty: defaultQty,
          producedRolls,
          materialIssues: [this.newMaterialIssue()],
          operator: this.buildOperatorWithGroup(),
          remark: ''
        }
        if (this.reportDialogMode === 'print' && processType === 'SLITTING') {
          await this.resolveCustomerMaterialAliasForPrint({
            customerCode: this.reportForm.customerCode,
            materialCode: this.reportForm.materialCode,
            customerOrderNo: this.reportForm.customerOrderNo,
            thickness: this.reportForm.thickness,
            width: this.reportForm.widthMm,
            length: this.reportForm.lengthM
          })
        }
        if (this.reportDialogMode === 'print' && processType === 'SLITTING') {
          await this.loadCompanyInfoForLabel()
          await this.loadCustomerQrRuleForSlitting(this.reportForm.customerCode, this.reportForm.slittingQrRuleBizType || 'SLITTING_OUTER_LABEL')
        }
        this.slittingTubePerBoxManual = false
        this.reportOrderStarted = this.reportDialogMode === 'print' && processType === 'COATING'
        this.reportOrderCompleted = false
        this.$nextTick(() => this.handleSlittingInputChanged())
        if (this.reportDialogMode === 'print' && processType === 'SLITTING') {
          await this.loadSlittingIssuedBatchOptions()
        } else {
          this.slittingIssuedBatchOptions = []
        }
        this.reportDialogVisible = true
        if (!this.isLabelPrintMode) {
          await this.loadReportList()
        } else {
          this.reportList = []
          this.syncCoatingOrderProgressFromHistory([])
        }
        await this.ensureCoatingRollRowsByState()
      } catch (e) {
        console.error('[openReportDialog] failed:', e)
        this.$message.error(this.resolveErrorMessage(e, '打开报工失败'))
      }
    },
    getSchedulePrintRows() {
      const rows = Array.isArray(this.list) ? this.list.slice() : []
      const range = Array.isArray(this.query.dateRange) ? this.query.dateRange : []
      if (!range.length) return rows

      const startBoundary = new Date(`${range[0]} 00:00:00`).getTime()
      const endSource = range[1] || range[0]
      const endBoundary = new Date(`${endSource} 23:59:59`).getTime()

      return rows.filter(row => {
        const start = row && row.planStartTime ? new Date(row.planStartTime).getTime() : NaN
        if (Number.isNaN(start)) return false
        return start >= startBoundary && start <= endBoundary
      })
    },
    getSchedulePrintSpec(row) {
      if (this.isRewinding) return this.formatRewindingSpec(row)
      if (this.isCoating) {
        const thickness = row && (row.thickness || '-')
        const width = row && (row.jumboWidth || row.widthMm || row.width || '-')
        const length = row && (row.planLength || row.length || '-')
        return `${thickness || '-'}*${width || '-'}*${length || '-'}`
      }
      return this.formatSlittingSpec(row)
    },
    resolvePrintableOrderNo(rawOrderNo) {
      const text = String(rawOrderNo || '').trim()
      if (!text) return ''
      const first = text
        .split(/[、,，;；\s]+/)
        .map(x => String(x || '').trim())
        .find(Boolean)
      return first || text
    },
    normalizeOrderNoKeyword(rawOrderNo) {
      return String(rawOrderNo || '').replace(/\s+/g, '').trim().toUpperCase()
    },
    normalizeKeywordText(value) {
      return String(value || '').replace(/\s+/g, '').trim().toUpperCase()
    },
    buildTaskQuerySuggestionPool(rows = [], ft = '') {
      const list = Array.isArray(rows) ? rows : []
      const orderSet = new Set()
      const materialSet = new Set()
      const specSet = new Set()
      list.forEach(row => {
        const orderText = String((row && (row.customerOrderNo || row.customer_order_no || row.customerOrderNumber || row.orderNo || row.order_no || row.related_order_nos || row.order_nos)) || '').trim()
        const materialText = String((row && (row.materialCode || row.material_code || row.finishedMaterialCode || row.finished_material_code)) || '').trim()
        const specText = String(this.getTaskSpecForFilter(row, ft) || '').trim()
        if (orderText) orderSet.add(orderText)
        if (materialText) materialSet.add(materialText)
        if (specText) specSet.add(specText)
      })
      this.taskQuerySuggestionPool = {
        orderNos: Array.from(orderSet),
        materialCodes: Array.from(materialSet),
        specs: Array.from(specSet)
      }
    },
    buildAutocompleteResults(pool = [], queryString = '') {
      const list = Array.isArray(pool) ? pool : []
      const key = this.normalizeKeywordText(queryString)
      const matched = key
        ? list.filter(item => this.normalizeKeywordText(item).includes(key))
        : list
      return matched.slice(0, 20).map(item => ({ value: item }))
    },
    queryOrderNoSuggestions(queryString, cb) {
      cb(this.buildAutocompleteResults(this.taskQuerySuggestionPool.orderNos, queryString))
    },
    queryMaterialCodeSuggestions(queryString, cb) {
      cb(this.buildAutocompleteResults(this.taskQuerySuggestionPool.materialCodes, queryString))
    },
    querySpecSuggestions(queryString, cb) {
      cb(this.buildAutocompleteResults(this.taskQuerySuggestionPool.specs, queryString))
    },
    handleQuerySuggestionSelect() {
      this.query.pageNum = 1
      this.loadTasks()
    },
    getTaskSpecForFilter(row, ft) {
      if (!row) return ''
      if (ft === 'rewinding') return this.formatRewindingSpec(row)
      if (ft === 'slitting') return this.formatSlittingSpec(row)
      const thickness = row.thickness || row.totalThickness || row.total_thickness || '-'
      const width = row.jumboWidth || row.widthMm || row.width || '-'
      const length = row.planLength || row.length || '-'
      return `${thickness || '-'}*${width || '-'}*${length || '-'}`
    },
    applyTaskKeywordFilters(rows = [], { ft = '', orderNoKeyword = '', materialCodeKeyword = '', specKeyword = '' } = {}) {
      const list = Array.isArray(rows) ? rows : []
      const orderKey = this.normalizeOrderNoKeyword(orderNoKeyword)
      const materialKey = this.normalizeKeywordText(materialCodeKeyword)
      const specKey = this.normalizeKeywordText(specKeyword)

      if (!orderKey && !materialKey && !specKey) return list

      return list.filter(row => {
        const orderText = this.normalizeOrderNoKeyword((row && (row.customerOrderNo || row.customer_order_no || row.customerOrderNumber || row.orderNo || row.order_no || row.related_order_nos || row.order_nos)) || '')
        const materialText = this.normalizeKeywordText((row && (row.materialCode || row.material_code || row.finishedMaterialCode || row.finished_material_code)) || '')
        const specText = this.normalizeKeywordText(this.getTaskSpecForFilter(row, ft))

        if (orderKey && !orderText.includes(orderKey)) return false
        if (materialKey && !materialText.includes(materialKey)) return false
        if (specKey && !specText.includes(specKey)) return false
        return true
      })
    },
    async buildQrDataUrl(content, size = 96) {
      const text = String(content || '').trim()
      if (!text) return ''
      try {
        return await QRCode.toDataURL(text, {
          width: size,
          margin: 1,
          errorCorrectionLevel: 'M'
        })
      } catch (e) {
        return ''
      }
    },
    getOrderItemDetailNo(item, index) {
      const row = item || {}
      const value = row.detailNo || row.orderDetailNo || row.order_detail_no || row.detail_no || row.itemNo || row.item_no || row.id || row.orderDetailId || row.order_detail_id || ''
      const text = String(value || '').trim()
      return text || `ITEM-${index + 1}`
    },
    getOrderItemDetailId(item) {
      const row = item || {}
      const n = Number(row.id || row.orderDetailId || row.order_detail_id || row.orderItemId || 0)
      return Number.isFinite(n) && n > 0 ? Math.floor(n) : null
    },
    buildOrderItemQrText(item, index, orderNo) {
      const detailId = this.getOrderItemDetailId(item)
      if (detailId) {
        return `ODID:${detailId}|ONO:${String(orderNo || '').trim()}`
      }
      return this.getOrderItemDetailNo(item, index)
    },
    getOrderItemSpec(item) {
      const row = item || {}
      const thickness = row.thickness || row.totalThickness || row.total_thickness || '-'
      const width = row.width || row.widthMm || row.width_mm || '-'
      const length = row.length || row.lengthM || row.length_m || '-'
      return `${thickness}μm*${width}mm*${length}m`
    },
    isLikelyColorCode(value) {
      const text = String(value || '').trim()
      if (!text) return false
      return /^[A-Z]{1,3}\d{1,4}$/i.test(text)
    },
    async resolvePrintColorName(item) {
      const row = item || {}
      const directName = String(row.colorName || row.color_name || row.colorDisplay || '').trim()
      if (directName) return directName

      const rawColor = String(row.color || row.colorCode || row.color_code || '').trim()
      if (rawColor && !this.isLikelyColorCode(rawColor)) return rawColor

      const materialCode = String(row.materialCode || row.material_code || '').trim()
      if (!materialCode) return ''
      if (Object.prototype.hasOwnProperty.call(this.colorNameByCodeCache, materialCode)) {
        return String(this.colorNameByCodeCache[materialCode] || '').trim()
      }

      let colorName = ''
      try {
        const res = await getSpecByMaterialCode(materialCode)
        const spec = (res && (res.code === 200 || res.code === 20000)) ? (res.data || {}) : {}
        colorName = String(spec.colorName || spec.color || '').trim()
      } catch (e) {
        colorName = ''
      }
      this.$set(this.colorNameByCodeCache, materialCode, colorName)
      return colorName
    },
    async printOrderInstructionByTask(taskRow) {
      const orderNo = this.resolvePrintableOrderNo(taskRow && taskRow.orderNo)
      if (!orderNo) {
        this.$message.warning('订单号为空，无法打印')
        return
      }
      try {
        const res = await getOrderDetailForProduction(orderNo)
        if (!(res && (res.code === 200 || res.code === 20000) && res.data)) {
          this.$message.error('获取订单详情失败，无法打印')
          return
        }

        const order = res.data || {}
        const items = Array.isArray(order.items) ? order.items : []
        if (!items.length) {
          this.$message.warning('该订单暂无明细，无法生成打印单')
          return
        }

        const printableOrderNo = order.orderNo || orderNo
        const orderQr = await this.buildQrDataUrl(printableOrderNo, 96)
        const enrichedItems = []
        for (let i = 0; i < items.length; i++) {
          const it = items[i] || {}
          const detailNo = this.getOrderItemDetailNo(it, i)
          const detailQrText = this.buildOrderItemQrText(it, i, printableOrderNo)
          const detailQr = await this.buildQrDataUrl(detailQrText, 74)
          const colorName = await this.resolvePrintColorName(it)
          const materialCode = String(it.materialCode || '-').trim() || '-'
          const materialCodeWithColor = colorName ? `${materialCode}（${colorName}）` : materialCode
          enrichedItems.push({
            ...it,
            _detailNo: detailNo,
            _detailQrText: detailQrText,
            _detailQr: detailQr,
            _materialCodeWithColor: materialCodeWithColor
          })
        }

        const rowsHtml = enrichedItems.map((it, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${this.escapeHtml(it._materialCodeWithColor || '-')}</td>
            <td>${this.escapeHtml(it.materialName || '-')}</td>
            <td>${this.escapeHtml(this.getOrderItemSpec(it))}</td>
            <td>${this.escapeHtml(it.rolls != null ? it.rolls : '-')}</td>
            <td>${this.escapeHtml(it.sqm != null ? it.sqm : '-')}</td>
            <td>
              <div class="detail-no">${this.escapeHtml(it._detailNo)}</div>
              ${it._detailQr ? `<img class="qr" src="${it._detailQr}" alt="明细二维码" />` : ''}
            </td>
          </tr>
        `).join('')

        const printTime = this.toDateTimeString(new Date())
        const customerCode = order.customer || order.customerCode || '-'
        const orderRemarkRaw = order.remark || order.orderRemark || order.note || order.notes || order.memo || order.customerRemark || ''
        const orderRemark = String(orderRemarkRaw || '').trim() || '-'
        const itemCount = enrichedItems.length
        const compactScale = itemCount <= 10 ? 1 : itemCount <= 14 ? 0.92 : itemCount <= 18 ? 0.84 : itemCount <= 22 ? 0.76 : 0.70
        const detailQrSize = itemCount <= 14 ? 62 : itemCount <= 18 ? 52 : 46
        const orderQrSize = itemCount <= 14 ? 84 : itemCount <= 18 ? 72 : 64
        const showFooter = itemCount <= 16
        const html = `
          <html>
            <head>
              <meta charset="utf-8" />
              <title>生产指令单-${this.escapeHtml(printableOrderNo)}</title>
              <style>
                * { box-sizing: border-box; }
                body { font-family: "Microsoft YaHei", Arial, sans-serif; margin: 0; padding: 4mm; color: #111; line-height: 1.28; overflow: visible; }
                .print-stage { width: ${`calc(100% / ${compactScale})`}; transform: scale(${compactScale}); transform-origin: top left; }
                .sheet { width: 100%; }
                .head { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; margin-bottom: 5px; padding-bottom: 10px; }
                .head-main { flex: 1; min-width: 0; }
                .company { text-align: center; font-size: 22px; font-weight: 700; letter-spacing: 1px; margin-bottom: 2px; }
                .head h1 { margin: 0; text-align: center; font-size: 28px; letter-spacing: 3px; }
                .sub { text-align: center; font-size: 14px; margin-top: 2px; font-weight: 600; }
                .order-qr { flex: 0 0 auto; text-align: center; font-size: 12px; padding-top: 2px; margin-right: 2px; }
                .order-qr img { width: ${orderQrSize}px; height: ${orderQrSize}px; display: block; margin-bottom: 2px; }
                .meta { width: 100%; border-collapse: collapse; margin-top: 4px; }
                .meta td { border: 1px solid #333; padding: 5px 6px; font-size: 12px; line-height: 1.24; }
                .remark-bar { width: 100%; border-collapse: collapse; margin-top: 4px; margin-bottom: 2px; }
                .remark-bar td { border: 1px solid #333; padding: 6px 8px; text-align: left; }
                .remark-label { font-size: 14pt; font-weight: 700; }
                .remark-content {
                  display: inline-block;
                  min-height: 72px;
                  font-size: 14pt;
                  font-weight: 700;
                  line-height: 1.35;
                  white-space: pre-wrap;
                  word-break: break-all;
                  vertical-align: top;
                }
                .main { width: 100%; border-collapse: collapse; margin-top: 6px; page-break-inside: avoid; table-layout: fixed; }
                .main th, .main td { border: 1px solid #333; padding: 4px 4px; font-size: 11px; text-align: center; vertical-align: middle; line-height: 1.2; }
                .main th { background: #f4f4f4; font-weight: 700; }
                .main tr { page-break-inside: avoid; break-inside: avoid; }
                .detail-no { font-size: 10px; margin-bottom: 1px; }
                .qr { width: ${detailQrSize}px; height: ${detailQrSize}px; display: block; margin: 0 auto; }
                .foot { margin-top: 8px; font-size: 11px; line-height: 1.45; }
                .foot-row {
                  display: flex;
                  align-items: center;
                  justify-content: space-between;
                  gap: 14px;
                  margin-bottom: 4px;
                }
                .foot-row:last-child { margin-bottom: 0; }
                .foot-item {
                  flex: 1;
                  min-width: 0;
                  white-space: nowrap;
                }
                .foot-item .line {
                  display: inline-block;
                  width: 72px;
                  border-bottom: 1px solid #333;
                  transform: translateY(-1px);
                }
                @media print {
                  @page { size: A4 portrait; margin: 3mm; }
                  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                  .print-stage { width: 100% !important; transform: none !important; }
                  .sheet, .main, .main tbody { page-break-inside: auto !important; }
                  .main thead { display: table-header-group; }
                  .main tr { page-break-inside: avoid !important; break-inside: avoid; }
                }
              </style>
            </head>
            <body>
              <div class="print-stage">
              <div class="sheet">
                <div class="head">
                  <div class="head-main">
                    <div class="company">东莞市方恩电子材料科技有限公司</div>
                    <h1>生产指令单</h1>
                    <div class="sub">（包装）</div>
                  </div>
                  <div class="order-qr">
                    ${orderQr ? `<img src="${orderQr}" alt="订单二维码" />` : ''}
                    <div>${this.escapeHtml(printableOrderNo)}</div>
                  </div>
                </div>
                <table class="meta">
                  <tr>
                    <td><strong>订单号：</strong>${this.escapeHtml(printableOrderNo)}</td>
                    <td><strong>客户代码：</strong>${this.escapeHtml(customerCode)}</td>
                    <td><strong>制单人：</strong>${this.escapeHtml(order.operator || order.createBy || '-')}</td>
                  </tr>
                  <tr>
                    <td><strong>下单日期：</strong>${this.escapeHtml(order.orderDate || '-')}</td>
                    <td><strong>交货日期：</strong>${this.escapeHtml(order.deliveryDate || '-')}</td>
                    <td><strong>打印时间：</strong>${this.escapeHtml(printTime)}</td>
                  </tr>
                </table>
                <table class="remark-bar">
                  <tr>
                    <td><span class="remark-label">备注：</span><span class="remark-content">${this.escapeHtml(orderRemark)}</span></td>
                  </tr>
                </table>
                <table class="main">
                  <thead>
                    <tr>
                      <th>序号</th>
                      <th>产品编码（含颜色）</th>
                      <th>产品名称</th>
                      <th>产品规格</th>
                      <th>订单数量</th>
                      <th>平方数/㎡</th>
                      <th>明细号二维码</th>
                    </tr>
                  </thead>
                  <tbody>${rowsHtml}</tbody>
                </table>
                ${showFooter ? `<div class="foot">
                  <div class="foot-row">
                    <div class="foot-item">签收部门/人员：<span class="line"></span></div>
                    <div class="foot-item">签收日期：<span class="line"></span></div>
                    <div class="foot-item">仓库：<span class="line"></span></div>
                  </div>
                  <div class="foot-row">
                    <div class="foot-item">包装车间：<span class="line"></span></div>
                    <div class="foot-item">现场品质：<span class="line"></span></div>
                    <div class="foot-item">订单完成情况：<span class="line"></span></div>
                  </div>
                  <div class="foot-row">
                    <div class="foot-item">订单完成时间：<span class="line"></span></div>
                    <div class="foot-item">订单损耗率：<span class="line"></span></div>
                    <div class="foot-item">备注签字：<span class="line"></span></div>
                  </div>
                </div>` : ''}
              </div>
              </div>
            </body>
          </html>
        `

        const iframe = document.createElement('iframe')
        iframe.setAttribute('style', 'position:absolute;width:0;height:0;left:-1000px;top:-1000px;')
        document.body.appendChild(iframe)
        const doc = iframe.contentWindow.document
        doc.open()
        doc.write(html)
        doc.close()
        setTimeout(() => {
          iframe.contentWindow.focus()
          iframe.contentWindow.print()
          setTimeout(() => {
            document.body.removeChild(iframe)
          }, 1200)
        }, 260)
      } catch (e) {
        this.$message.error(this.resolveErrorMessage(e, '打印订单信息失败'))
      }
    },
    printSchedulePlan() {
      const rows = this.getSchedulePrintRows()
      if (!rows.length) {
        this.$message.warning('当前查询日期下暂无可打印的排程任务')
        return
      }

      const title = `${this.isCoating ? '涂布' : this.isRewinding ? '复卷' : '分切'}排程单`
      const dateText = Array.isArray(this.query.dateRange) && this.query.dateRange.length
        ? `${this.query.dateRange[0]}${this.query.dateRange[1] ? ` ~ ${this.query.dateRange[1]}` : ''}`
        : this.todayDate()
      const rowsHtml = rows.map((row, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${row.taskNo || '-'}</td>
          <td>${row.orderNo || '-'}</td>
          <td>${this.typeText(row.type)}</td>
          <td>${row.materialCode || '-'}</td>
          <td>${row.materialName || '-'}</td>
          <td>${this.getSchedulePrintSpec(row)}</td>
          <td>${row.qty != null ? row.qty : '-'}</td>
          <td>${row.equipmentCode || '-'}</td>
          <td>${this.formatRange(row.planStartTime, row.planEndTime)}</td>
          <td>${this.formatPlanDuration(row)}</td>
        </tr>
      `).join('')

      const html = `
        <div class="title">${title}</div>
        <div class="row"><strong>日期范围：</strong>${dateText}</div>
        <div class="row"><strong>打印时间：</strong>${this.toDateTimeString(new Date())}</div>
        <div class="row"><strong>任务数：</strong>${rows.length}</div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>任务号</th>
              <th>订单号</th>
              <th>类型</th>
              <th>料号</th>
              <th>品名</th>
              <th>规格</th>
              <th>数量</th>
              <th>设备</th>
              <th>计划时间</th>
              <th>计划耗时</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      `
      this.printHtml(`${title}-${dateText}`, html)
    },
    async loadReportList() {
      if (!this.reportForm.scheduleId) {
        this.reportList = []
        this.syncCoatingOrderProgressFromHistory([])
        return
      }
      this.reportLoading = true
      try {
        const res = await getReportWorkList({
          scheduleId: this.reportForm.scheduleId,
          processType: this.reportForm.processType
        })
        if (res.code === 200 || res.code === 20000) {
          this.reportList = res.data || []
          this.applyRemainingProducedQtyFromHistory()
          this.syncCoatingOrderProgressFromHistory(this.reportList)
          await this.syncCoatingWidthSeedFromHistory()
        } else {
          this.reportList = []
          this.syncCoatingOrderProgressFromHistory([])
        }
      } catch (e) {
        this.reportList = []
        this.syncCoatingOrderProgressFromHistory([])
      } finally {
        this.reportLoading = false
      }
    },
    applyRemainingProducedQtyFromHistory() {
      if (!this.reportForm || this.reportForm.processType === 'COATING') return
      if (this.reportEditingId) return

      const planQtyNum = Number(this.reportForm.planQty || 0)
      if (!(Number.isFinite(planQtyNum) && planQtyNum > 0)) return

      const doneQty = (Array.isArray(this.reportList) ? this.reportList : []).reduce((sum, row) => {
        const qty = Number((row && (row.produced_qty != null ? row.produced_qty : row.producedQty)) || 0)
        return sum + (Number.isFinite(qty) && qty > 0 ? qty : 0)
      }, 0)

      const remainingRaw = Math.max(0, planQtyNum - doneQty)
      const remaining = this.reportForm.processType === 'SLITTING'
        ? Math.max(0, Math.floor(remainingRaw + 1e-6))
        : Number(remainingRaw.toFixed(2))

      this.reportForm.producedQty = remaining
      this.handleSlittingInputChanged()
    },
    parseOrderStatusFromRemark(remark) {
      const text = String(remark || '')
      const matched = text.match(/\[ORDER_STATUS:(COMPLETED|UNCOMPLETED)\]/i)
      return matched ? String(matched[1] || '').toUpperCase() : ''
    },
    getReportOrderStatus(row) {
      return this.parseOrderStatusFromRemark(row && row.remark)
    },
    formatReportRemarkDisplay(remark) {
      const text = String(remark || '')
      const cleaned = text
        .replace(/\[ORDER_STATUS:(COMPLETED|UNCOMPLETED)\]/ig, '')
        .replace(/\s{2,}/g, ' ')
        .trim()
      return cleaned || '-'
    },
    buildReportRemarkWithOrderStatus(rawRemark, completed) {
      const base = String(rawRemark || '').trim()
      const marker = `[ORDER_STATUS:${completed ? 'COMPLETED' : 'UNCOMPLETED'}]`
      const existed = base.match(/\[ORDER_STATUS:(COMPLETED|UNCOMPLETED)\]/i)
      if (!base) return marker
      if (existed) {
        return base.replace(/\[ORDER_STATUS:(COMPLETED|UNCOMPLETED)\]/i, marker)
      }
      return `${base} ${marker}`.trim()
    },
    syncCoatingOrderProgressFromHistory(list) {
      if (!this.reportForm || this.reportForm.processType !== 'COATING') return
      const rows = Array.isArray(list) ? list : []
      const hasHistory = rows.length > 0
      let status = ''
      rows.forEach(row => {
        const current = this.parseOrderStatusFromRemark(row && row.remark)
        if (current) status = current
      })
      this.reportOrderStarted = this.reportOrderStarted || hasHistory
      if (status) {
        this.reportOrderCompleted = status === 'COMPLETED'
      } else if (!hasHistory) {
        this.reportOrderCompleted = false
      }
    },
    rememberCoatingWidthSeedFromRows(rows) {
      if (!this.reportForm || this.reportForm.processType !== 'COATING') return
      const list = Array.isArray(rows) ? rows : []
      const last = [...list].reverse().find(x => Number(x && x.widthMm) > 0)
      if (last) {
        this.reportForm.coatingWidthSeedMm = Number(last.widthMm)
      }
    },
    async syncCoatingWidthSeedFromHistory() {
      if (!this.reportForm || this.reportForm.processType !== 'COATING') return
      const fromCurrent = (this.reportForm.producedRolls || []).find(x => Number(x && x.widthMm) > 0)
      if (fromCurrent) {
        this.reportForm.coatingWidthSeedMm = Number(fromCurrent.widthMm)
        return
      }
      const latest = Array.isArray(this.reportList) && this.reportList.length ? this.reportList[0] : null
      const reportId = Number(latest && latest.id)
      if (!(reportId > 0)) return
      try {
        const res = await getReportWorkDetail({ reportId })
        if (!(res && (res.code === 200 || res.code === 20000) && res.data)) return
        const producedRollRows = Array.isArray(res.data.producedRolls) ? res.data.producedRolls : []
        const normalized = producedRollRows.map(item => this.normalizeReportDetailProducedRoll(item))
        this.rememberCoatingWidthSeedFromRows(normalized)
      } catch (e) {
        // ignore
      }
    },
    async ensureCoatingRollRowsByState() {
      if (!this.reportForm || this.reportForm.processType !== 'COATING') return
      const shouldHaveRows = this.isLabelPrintMode || this.reportOrderStarted
      if (!shouldHaveRows) {
        this.reportForm.producedRolls = []
        return
      }
      const rows = Array.isArray(this.reportForm.producedRolls) ? this.reportForm.producedRolls : []
      if (!rows.length) {
        await this.addProducedRoll()
      }
    },
    async handleCoatingOrderStart() {
      if (!this.reportForm || this.reportForm.processType !== 'COATING') return
      this.reportOrderStarted = true
      this.reportOrderCompleted = false
      await this.ensureCoatingRollRowsByState()
      this.$message.success('已开始当前订单报工')
    },
    async handleCoatingOrderEnd() {
      if (!this.reportForm || this.reportForm.processType !== 'COATING') return
      try {
        await this.$confirm('确认将当前订单标记为“本工序已完成”？', '订单结束', {
          type: 'warning',
          confirmButtonText: '确认结束',
          cancelButtonText: '取消'
        })
      } catch (e) {
        return
      }

      // 后端按 start_time DESC 返回，索引 0 才是最新一条
      const latest = Array.isArray(this.reportList) && this.reportList.length
        ? this.reportList[0]
        : null
      const reportId = Number(latest && latest.id)
      const startTime = latest && (latest.start_time || latest.startTime)
      const endTime = latest && (latest.end_time || latest.endTime)
      const producedQty = Number((latest && (latest.produced_qty != null ? latest.produced_qty : latest.producedQty)) || 0)

      if (reportId > 0 && startTime && endTime && producedQty > 0) {
        try {
          const res = await updateReportWork({
            reportId,
            startTime,
            endTime,
            producedQty,
            operator: (latest && (latest.operator_name || latest.operatorName)) || this.reportForm.operator || '',
            remark: this.buildReportRemarkWithOrderStatus(latest && latest.remark, true)
          })
          if (!(res.code === 200 || res.code === 20000)) {
            this.$message.error(res.message || '订单结束状态保存失败')
            return
          }
          await this.loadReportList()
          await this.loadTasks()
          this.loadShiftProductionSummary()
          window.dispatchEvent(new Event('dashboard:refresh'))
          window.dispatchEvent(new CustomEvent('sales:orders:refresh'))
        } catch (e) {
          this.$message.error(this.resolveErrorMessage(e, '订单结束状态保存失败'))
          return
        }
      }

      this.reportOrderStarted = true
      this.reportOrderCompleted = true
      this.$message.success('已确认当前订单本工序完成')
    },
    async confirmCoatingOrderCompletedBeforeSubmit() {
      if (this.reportOrderCompleted) {
        return true
      }
      try {
        await this.$confirm('当前报工后，订单是否已完成本工序？', '订单完成确认', {
          type: 'warning',
          distinguishCancelAndClose: true,
          closeOnClickModal: false,
          closeOnPressEscape: false,
          confirmButtonText: '已完成',
          cancelButtonText: '未完成'
        })
        return true
      } catch (e) {
        if (e === 'cancel') return false
        return null
      }
    },
    normalizeReportDetailProducedRoll(row) {
      const source = row || {}
      return {
        rollCode: source.rollCode || source.roll_code || '',
        sequenceNo: source.sequenceNo != null ? source.sequenceNo : source.sequence_no,
        batchNo: source.batchNo || source.batch_no || '',
        widthMm: Number(source.widthMm != null ? source.widthMm : source.width_mm) || null,
        lengthM: Number(source.lengthM != null ? source.lengthM : source.length_m) || null,
        weightKg: source.weightKg != null ? source.weightKg : source.weight_kg,
        remark: source.remark || ''
      }
    },
    normalizeReportDetailMaterialIssue(row) {
      const source = row || {}
      return {
        materialType: source.materialType || source.material_type || 'MOTHER_ROLL',
        materialCode: source.materialCode || source.material_code || '',
        stockId: source.stockId != null ? source.stockId : source.stock_id,
        rollCode: source.rollCode || source.roll_code || '',
        planArea: source.planArea != null ? source.planArea : source.plan_area,
        actualArea: source.actualArea != null ? source.actualArea : source.actual_area,
        lossArea: source.lossArea != null ? source.lossArea : source.loss_area,
        remark: source.remark || ''
      }
    },
    applyHistoryReportBaseFields(row = {}) {
      this.reportForm.startTime = row.start_time || row.startTime || this.reportForm.startTime
      this.reportForm.endTime = row.end_time || row.endTime || this.reportForm.endTime
      const qty = Number(row.produced_qty != null ? row.produced_qty : row.producedQty)
      if (Number.isFinite(qty) && qty > 0) {
        this.reportForm.producedQty = qty
      }
      this.reportForm.operator = row.operator_name || row.operatorName || this.reportForm.operator
      this.reportForm.remark = row.remark || ''
    },
    async editHistoryReport(row) {
      if (!row || !row.id) {
        this.$message.warning('缺少报工记录ID')
        return
      }
      this.reportEditingId = Number(row.id) > 0 ? Number(row.id) : null
      this.applyHistoryReportBaseFields(row)
      if (!this.reportEditingId) {
        return
      }
      try {
        const res = await getReportWorkDetail({ reportId: this.reportEditingId })
        if (!(res && (res.code === 200 || res.code === 20000) && res.data)) {
          this.$message.warning((res && res.message) || '未获取到完整报工详情，已回填基础字段')
          return
        }

        const detail = res.data || {}
        const report = detail.report || row || {}
        this.applyHistoryReportBaseFields(report)

        const producedRollRows = Array.isArray(detail.producedRolls) ? detail.producedRolls : []
        this.reportForm.producedRolls = producedRollRows.length
          ? producedRollRows.map(item => this.normalizeReportDetailProducedRoll(item))
          : []
        this.rememberCoatingWidthSeedFromRows(this.reportForm.producedRolls)

        const materialIssueRows = Array.isArray(detail.materialIssues) ? detail.materialIssues : []
        this.reportForm.materialIssues = materialIssueRows.length
          ? materialIssueRows.map(item => this.normalizeReportDetailMaterialIssue(item))
          : [this.newMaterialIssue()]

        this.handleSlittingInputChanged()
      } catch (e) {
        this.$message.warning(this.resolveErrorMessage(e, '读取报工详情失败，已回填基础字段'))
      }
    },
    async removeHistoryReport(row) {
      if (!row || !row.id) {
        this.$message.warning('缺少报工记录ID')
        return
      }
      try {
        await this.$confirm('确认删除该条历史报工？', '提示', { type: 'warning' })
      } catch (e) {
        return
      }
      try {
        const res = await deleteReportWork({ reportId: row.id })
        if (res.code === 200 || res.code === 20000) {
          this.$message.success('删除成功')
          await this.loadReportList()
          this.loadTasks()
          this.loadShiftProductionSummary()
          window.dispatchEvent(new Event('dashboard:refresh'))
          window.dispatchEvent(new CustomEvent('sales:orders:refresh'))
        } else {
          this.$message.error(res.message || '删除失败')
        }
      } catch (e) {
        this.$message.error(this.resolveErrorMessage(e, '删除失败'))
      }
    },
    async submitReport() {
      if (!this.reportForm.scheduleId && !this.reportForm.orderDetailId) {
        this.$message.warning('缺少排程ID/订单明细ID')
        return
      }
      if (!this.reportForm.startTime || !this.reportForm.endTime) {
        this.$message.warning('请填写开始/结束时间')
        return
      }
      const startObj = this.parseDateTimeValue(this.reportForm.startTime)
      const endObj = this.parseDateTimeValue(this.reportForm.endTime)
      if (!startObj || !endObj || endObj.getTime() < startObj.getTime()) {
        this.$message.warning('结束时间不能早于开始时间')
        return
      }
      const qty = this.reportForm.processType === 'COATING'
        ? Number(this.calcProducedRollsArea() || 0)
        : Number(this.reportForm.producedQty || 0)
      if (!(qty > 0)) {
        this.$message.warning(this.reportForm.processType === 'COATING' ? '请先填写母卷宽度和长度，生成实际数量(m²)' : '生产数量必须大于0')
        return
      }
      if (this.reportForm.processType === 'COATING' && !this.reportOrderStarted) {
        this.$message.warning('请先点击“订单开始”后再报工')
        return
      }
      if (this.reportForm.processType === 'SLITTING') {
        this.commitSlittingBatchNoInput()
        const batchNoRequired = !!(this.reportForm && this.reportForm.batchNoRequired)
        const batchNo = String((this.reportForm && this.reportForm.batchNo) || '').trim()
        if (batchNoRequired && !batchNo) {
          this.$message.warning('批次号已设置为必填，请先选择或填写批次号后再提交报工')
          return
        }
        if (!Number.isInteger(qty)) {
          this.$message.warning('分切报工请填写整数卷数')
          return
        }
      }
      let producedRolls = (this.reportForm.producedRolls || [])
        .map(x => {
          if (!x) return null
          const area = this.calcRollArea(x.widthMm, x.lengthM)
          return {
            ...x,
            area
          }
        })
        .filter(x => x)
      if (this.reportForm.processType === 'COATING') {
        if (!producedRolls.length) {
          this.$message.warning('请先新增母卷明细')
          this.reportSubmitting = false
          return
        }
        for (let i = 0; i < producedRolls.length; i++) {
          const row = producedRolls[i] || {}
          const rollCode = String(row.rollCode || '').trim()
          const width = Number(row.widthMm || 0)
          const length = Number(row.lengthM || 0)
          if (!rollCode) {
            this.$message.warning(`第${i + 1}行母卷号不能为空`)
            this.reportSubmitting = false
            return
          }
          if (!(width > 0)) {
            this.$message.warning(`第${i + 1}行宽度必须大于0`)
            this.reportSubmitting = false
            return
          }
          if (!(length > 0)) {
            this.$message.warning(`第${i + 1}行长度为必填，且必须大于0`)
            this.reportSubmitting = false
            return
          }
        }
        producedRolls = producedRolls.filter(x => Number(x.area || 0) > 0)
      } else {
        producedRolls = producedRolls.filter(x => x && x.rollCode && Number(x.area || 0) > 0)
      }
      const materialIssues = (this.reportForm.materialIssues || [])
        .map(x => {
          if (!x) return null
          return {
            ...x,
            lossArea: this.computeIssueLoss(x.planArea, x.actualArea)
          }
        })
        .filter(x => x && (x.materialCode || x.rollCode) && (Number(x.actualArea || 0) > 0 || Number(x.planArea || 0) > 0 || Number(x.lossArea || 0) > 0))
      this.reportSubmitting = true
      try {
        let normalizedRemark = this.buildReportRemarkWithSlittingBatchNo(this.reportForm.remark)
        if (!this.reportEditingId && this.reportForm.processType === 'COATING') {
          const completed = await this.confirmCoatingOrderCompletedBeforeSubmit()
          if (completed === null) {
            this.reportSubmitting = false
            return
          }
          this.reportOrderCompleted = !!completed
          normalizedRemark = this.buildReportRemarkWithOrderStatus(normalizedRemark, this.reportOrderCompleted)
        }
        if (this.reportForm.processType === 'SLITTING') {
          const batchSaved = await this.persistSlittingBatchNoForDeliveryNote()
          if (!batchSaved) {
            this.reportSubmitting = false
            return
          }
        }

        const basePayload = {
          scheduleId: this.reportForm.scheduleId,
          orderDetailId: this.reportForm.orderDetailId,
          processType: this.reportForm.processType,
          materialCode: this.reportForm.materialCode,
          materialName: this.reportForm.materialName,
          thickness: this.reportForm.thickness,
          widthMm: this.reportForm.widthMm,
          lengthM: this.reportForm.lengthM,
          startTime: this.reportForm.startTime,
          endTime: this.reportForm.endTime,
          producedQty: qty,
          producedRolls,
          materialIssues,
          operator: this.reportForm.operator,
          remark: normalizedRemark
        }

        let res
        let createdSegments = 1
        const enableSegment = !this.reportEditingId && !!this.reportForm.enableSegment
        const segments = enableSegment ? this.splitByShiftWindows(startObj, endObj) : []
        if (enableSegment && segments.length > 1) {
          const qtyList = this.allocateSegmentQtys(qty, segments, this.reportForm.processType === 'SLITTING')
          createdSegments = segments.length
          for (let i = 0; i < segments.length; i++) {
            const seg = segments[i]
            const segQty = Number(qtyList[i] || 0)
            if (!(segQty > 0)) {
              continue
            }
            const isLast = i === segments.length - 1
            const payload = {
              ...basePayload,
              startTime: this.toDateTimeString(seg.start),
              endTime: this.toDateTimeString(seg.end),
              producedQty: segQty,
              operator: this.buildSegmentOperator(seg.start),
              producedRolls: isLast ? producedRolls : [],
              materialIssues: isLast ? materialIssues : []
            }
            res = await reportWork(payload)
            if (!(res.code === 200 || res.code === 20000)) {
              break
            }
          }
        } else {
          res = this.reportEditingId
            ? await updateReportWork({ ...basePayload, reportId: this.reportEditingId })
            : await reportWork(basePayload)
        }
        if (res.code === 200 || res.code === 20000) {
          const returnedScheduleId = Number((res.data && res.data.scheduleId) || this.reportForm.scheduleId || 0)
          if (returnedScheduleId > 0) {
            this.reportForm.scheduleId = returnedScheduleId
          }
          if (this.reportEditingId) {
            this.$message.success('报工修改成功')
          } else if (createdSegments > 1) {
            this.$message.success(`报工提交成功，已按班次分段生成${createdSegments}条记录`)
          } else {
            this.$message.success('报工提交成功')
          }
          await this.loadReportList()
          this.reportDialogVisible = false
          this.loadTasks()
          this.loadShiftProductionSummary()
          window.dispatchEvent(new Event('dashboard:refresh'))
          window.dispatchEvent(new CustomEvent('sales:orders:refresh'))
        } else {
          this.$message.error(res.message || (this.reportEditingId ? '报工修改失败' : '报工提交失败'))
        }
      } catch (e) {
        console.error('[submitReport] failed:', e)
        this.$message.error(this.resolveErrorMessage(e, this.reportEditingId ? '报工修改失败' : '报工提交失败'))
      } finally {
        this.reportSubmitting = false
      }
    },
    closeReportDialog() {
      const defaultCarton = this.getDefaultCartonPreset()
      this.reportDialogMode = 'report'
      this.reportEditingId = null
      this.reportOrderStarted = false
      this.reportOrderCompleted = false
      this.lastScannedQrText = ''
      this.reportList = []
      this.slittingTubePerBoxManual = false
      this.reportForm = {
        scheduleId: null,
        orderDetailId: null,
        processType: 'COATING',
        taskNo: '',
        orderNo: '',
        customerOrderNo: '',
        customerCode: '',
        orderDetailRemark: '',
        lineNo: '',
        materialCode: '',
        materialName: '',
        batchNo: '',
        batchNoRequired: true,
        thickness: '',
        widthMm: null,
        lengthM: null,
        rewindingSpec: '',
        coatingUseRewindingLabel: false,
        coatingWidthSeedMm: null,
        rewindingMotherRollCode: '',
        rewindingLabelLengthM: null,
        rewindingMotherInfo: null,
        rewindingSerialStart: 1,
        rewindingPrintCount: null,
        coreOuterDiameterMm: 87.5,
        cartonPreset: String(defaultCarton.value || ''),
        cartonLengthMm: Number(defaultCarton.lengthMm || 0),
        cartonWidthMm: Number(defaultCarton.widthMm || 0),
        cartonHeightMm: Number(defaultCarton.heightMm || 0),
        slittingRollPerTube: 1,
        slittingTubePerBoxCount: 0,
        slittingTubeRollCount: 0,
        slittingCoreLabelBizType: 'SLITTING_CORE_LABEL',
        slittingQrRuleBizType: 'SLITTING_OUTER_LABEL',
        slittingDigitalNoRequired: true,
        slittingDigitalNo: '',
        slittingCorePrintCount: 0,
        slittingInnerPrintCount: 0,
        slittingOuterPrintCount: 0,
        slittingPalletPrintCount: 0,
        boxWeightKg: null,
        labelProductionDate: '',
        labelShipDate: '',
        deliveryNoteNo: '',
        shelfLifeDays: 365,
        qrTemplate: this.getDefaultSlittingQrTemplate(),
        qrTemplateEditable: true,
        startTime: '',
        endTime: '',
        enableSegment: true,
        planQty: null,
        producedQty: null,
        producedRolls: [],
        materialIssues: [],
        operator: '',
        remark: ''
      }
    },
    newProducedRoll(rollCode = '') {
      const seedWidth = Number(this.reportForm && this.reportForm.coatingWidthSeedMm)
      return {
        rollCode: rollCode || '',
        sequenceNo: null,
        batchNo: '',
        widthMm: Number.isFinite(seedWidth) && seedWidth > 0 ? seedWidth : null,
        lengthM: null,
        weightKg: null,
        remark: ''
      }
    },
    handleProducedRollWidthChanged(row) {
      if (!this.reportForm || this.reportForm.processType !== 'COATING') return
      const width = Number(row && row.widthMm)
      if (Number.isFinite(width) && width > 0) {
        this.reportForm.coatingWidthSeedMm = width
      }
    },
    buildReportRemarkWithSlittingBatchNo(rawRemark) {
      const baseRemark = String(rawRemark || '').trim()
      if (!this.reportForm || this.reportForm.processType !== 'SLITTING') {
        return baseRemark
      }
      const batchNo = String((this.reportForm && this.reportForm.batchNo) || '').trim()
      if (!batchNo) return baseRemark

      const marker = `[BATCH_NO:${batchNo}]`
      if (!baseRemark) return marker

      const existed = baseRemark.match(/\[BATCH_NO:[^\]]*\]/i)
      if (existed && existed[0] === marker) {
        return baseRemark
      }
      if (existed) {
        return baseRemark.replace(/\[BATCH_NO:[^\]]*\]/i, marker)
      }
      return `${baseRemark} ${marker}`.trim()
    },
    async addProducedRoll() {
      const scheduleId = this.reportForm.scheduleId
      const productionDateTime = this.reportForm.startTime || this.toDateTimeString(new Date())
      let rollCode = await this.generateNextRollCode(scheduleId, productionDateTime)
      if (!rollCode) {
        const firstExisting = (this.reportForm.producedRolls || []).find(x => x && x.rollCode)
        rollCode = firstExisting ? String(firstExisting.rollCode) : ''
      }
      rollCode = this.buildUniqueRollCode(rollCode)
      const rows = Array.isArray(this.reportForm.producedRolls) ? this.reportForm.producedRolls : []
      const prev = rows.length ? rows[rows.length - 1] : null
      const prevWidth = Number(prev && prev.widthMm)
      if (Number.isFinite(prevWidth) && prevWidth > 0) {
        this.reportForm.coatingWidthSeedMm = prevWidth
      }
      this.reportForm.producedRolls.push(this.newProducedRoll(rollCode))
    },
    async addProducedRollWithPrevSize() {
      const rows = Array.isArray(this.reportForm.producedRolls) ? this.reportForm.producedRolls : []
      const prev = rows.length ? rows[rows.length - 1] : null
      await this.addProducedRoll()
      const latestRows = Array.isArray(this.reportForm.producedRolls) ? this.reportForm.producedRolls : []
      const current = latestRows.length ? latestRows[latestRows.length - 1] : null
      if (!current || !prev) return

      const prevWidth = Number(prev.widthMm)
      const prevLength = Number(prev.lengthM)
      if (Number.isFinite(prevWidth) && prevWidth > 0) {
        current.widthMm = prevWidth
      }
      if (Number.isFinite(prevLength) && prevLength > 0) {
        current.lengthM = prevLength
      }
    },
    removeProducedRoll(index) {
      this.reportForm.producedRolls.splice(index, 1)
    },
    newMaterialIssue() {
      return { materialType: 'MOTHER_ROLL', materialCode: '', stockId: null, rollCode: '', planArea: null, actualArea: null, lossArea: null, remark: '' }
    },
    addMaterialIssue() {
      this.reportForm.materialIssues.push(this.newMaterialIssue())
    },
    removeMaterialIssue(index) {
      this.reportForm.materialIssues.splice(index, 1)
    },
    typeText(t) {
      const v = (t || '').toString().toLowerCase()
      return v === 'coating' ? '涂布' : v === 'rewinding' ? '复卷' : v === 'slitting' ? '分切' : t
    },
    typeTag(t) {
      const v = (t || '').toString().toLowerCase()
      return v === 'coating' ? 'success' : v === 'rewinding' ? 'warning' : 'info'
    },
    statusText(s) {
      const m = {
        SCHEDULED: '待生产',
        UNSCHEDULED: '未排程',
        IN_PROGRESS: '进行中',
        COMPLETED: '已完成',
        CANCELLED: '已取消',
        COATING_SCHEDULED: '待生产',
        REWINDING_SCHEDULED: '待生产',
        PENDING: '待生产',
        RUNNING: '进行中',
        DONE: '已完成',
        pending: '待生产',
        in_progress: '进行中',
        completed: '已完成'
      }
      return m[s] || s
    },
    statusTag(s) {
      const m = {
        SCHEDULED: 'info',
        UNSCHEDULED: 'info',
        IN_PROGRESS: 'warning',
        COMPLETED: 'success',
        CANCELLED: 'danger',
        COATING_SCHEDULED: 'info',
        REWINDING_SCHEDULED: 'info',
        PENDING: 'info',
        RUNNING: 'warning',
        DONE: 'success',
        pending: 'info',
        in_progress: 'warning',
        completed: 'success'
      }
      return m[s] || 'info'
    },
    lockStatusText(s) { const m = { LOCKED: '已锁定', PARTIAL: '部分锁定', PENDING: '待请购', ALLOCATED: '已领料', PICKED: '已领料', USED: '已消耗', RELEASED: '已释放', PENDING_SUPPLY: '待补锁', FULFILLED: '已补锁', '待补锁': '待补锁', '已补锁': '已补锁' }; return m[s] || s },
    lockStatusTag(s) { const m = { LOCKED: 'success', PARTIAL: 'warning', PENDING: 'info', ALLOCATED: 'warning', PICKED: 'warning', USED: 'info', RELEASED: 'danger', PENDING_SUPPLY: 'info', FULFILLED: 'success', '待补锁': 'info', '已补锁': 'success' }; return m[s] || 'info' },
    formatRange(start, end) {
      const s = this.formatTime(start)
      const e = this.formatTime(end)
      if (s && e) return `${s}~${e}`
      return s || '-'
    },
    formatTime(val) {
      if (!val) return ''
      const d = new Date(val)
      if (Number.isNaN(d.getTime())) return ''
      const pad = n => (n < 10 ? '0' + n : n)
      return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${d.getHours()}时`
    },
    formatPlanDuration(row) {
      const raw = Number((row && (
        row.planDurationMinutes || row.durationMinutes || row.duration_minutes ||
        row.coating_duration_minutes || row.rewinding_duration_minutes || row.slitting_duration_minutes
      )) || 0)
      if (Number.isFinite(raw) && raw > 0) {
        const mins = Math.max(0, Math.round(raw))
        const h = Math.floor(mins / 60)
        const m = mins % 60
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
      }
      const start = row && row.planStartTime
      const end = row && row.planEndTime
      if (!start || !end) return '-'
      const s = new Date(start)
      const e = new Date(end)
      if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || e <= s) return '-'
      const mins = Math.max(0, Math.ceil((e.getTime() - s.getTime()) / 60000))
      const h = Math.floor(mins / 60)
      const m = mins % 60
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    },
    formatWidthLength(row) {
      const width = row && (row.rewindingWidth || row.rewinding_width || row.widthMm || row.width || row.jumboWidth)
      const length = row && (row.rewindingLength || row.rewinding_length || row.length || row.planLength)
      if ((width === null || width === undefined || width === '') && (length === null || length === undefined || length === '')) {
        return '-'
      }
      return `${width || '-'}*${length || '-'}`
    },
    formatRewindingSpec(row) {
      const thickness = this.resolveOrderSpecNumber(row, ['thickness', 'totalThickness', 'total_thickness', 'order_thickness', 'orderThickness'])
      const width = this.resolveOrderSpecNumber(row, ['rewindingWidth', 'rewinding_width', 'widthMm', 'width_mm', 'width', 'order_width', 'orderWidth', 'processWidth', 'process_width'])
      const length = this.resolveOrderSpecNumber(row, ['rewindingLength', 'rewinding_length', 'lengthM', 'length', 'order_length', 'orderLength', 'planLength', 'processLength', 'process_length'])
      if ((thickness === null || thickness === undefined || thickness === '') &&
          (width === null || width === undefined || width === '') &&
          (length === null || length === undefined || length === '')) {
        return '-'
      }
      return `${this.formatSpecPartWithUnit(thickness, 'μm')}*${this.formatSpecPartWithUnit(width, 'mm')}*${this.formatSpecPartWithUnit(length, 'm')}`
    },
    resolveOrderSpecNumber(row, keys = []) {
      if (!row || !Array.isArray(keys)) return null
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i]
        const v = row[key]
        if (v === null || v === undefined || v === '') continue
        const n = Number(v)
        if (Number.isFinite(n) && n > 0) return n
      }
      return null
    },
    formatSpecPartWithUnit(value, unit) {
      const n = Number(value)
      if (!Number.isFinite(n) || n <= 0) return '-'
      return `${n}${unit}`
    },
    formatSlittingSpec(row) {
      const thickness = this.resolveOrderSpecNumber(row, ['thickness', 'totalThickness', 'total_thickness', 'order_thickness', 'orderThickness'])
      const width = this.resolveOrderSpecNumber(row, ['widthMm', 'width_mm', 'width', 'order_width', 'orderWidth', 'processWidth', 'process_width'])
      const length = this.resolveOrderSpecNumber(row, ['lengthM', 'length', 'order_length', 'orderLength', 'planLength', 'processLength', 'process_length'])
      if ((thickness === null || thickness === undefined || thickness === '') &&
          (width === null || width === undefined || width === '') &&
          (length === null || length === undefined || length === '')) {
        return '-'
      }
      return `${this.formatSpecPartWithUnit(thickness, 'μm')}*${this.formatSpecPartWithUnit(width, 'mm')}*${this.formatSpecPartWithUnit(length, 'm')}`
    },
    resolveOrderDetailRemarkText(row) {
      const r = row || {}
      const val = r.orderDetailRemark != null ? r.orderDetailRemark
        : r.order_detail_remark != null ? r.order_detail_remark
          : r.itemRemark != null ? r.itemRemark
            : r.item_remark != null ? r.item_remark
              : r.detailRemark != null ? r.detailRemark
                : r.detail_remark != null ? r.detail_remark
                  : r.remark
      return String(val || '').trim()
    },
    async resolveOrderDetailRemarkForReportRow(row) {
      const direct = this.resolveOrderDetailRemarkText(row)
      if (direct) return direct

      const detailId = Number(row && (row.orderItemId || row.order_detail_id || row.orderDetailId))
      if (Number.isFinite(detailId) && detailId > 0) {
        if (Object.prototype.hasOwnProperty.call(this.detailOrderRemarkCache, detailId)) {
          return String(this.detailOrderRemarkCache[detailId] || '').trim()
        }
        try {
          const res = await resolveOrderItemByDetailId(detailId)
          const d = (res && (res.code === 200 || res.code === 20000)) ? (res.data || {}) : {}
          const remark = this.resolveOrderDetailRemarkText(d)
          this.$set(this.detailOrderRemarkCache, detailId, remark)
          if (remark) return remark
        } catch (e) {
          this.$set(this.detailOrderRemarkCache, detailId, '')
        }
      }

      const orderNo = this.resolvePrintableOrderNo((row && (row.orderNo || row.order_no)) || '')
      if (orderNo) {
        const items = await this.getOrderItemsByOrderNo(orderNo)
        if (Array.isArray(items) && items.length) {
          let matched = null
          if (Number.isFinite(detailId) && detailId > 0) {
            matched = items.find(it => Number(it && (it.id || it.orderItemId || it.orderDetailId || it.order_detail_id)) === detailId) || null
          }
          if (!matched) {
            const materialCode = String((row && (row.materialCode || row.material_code)) || '').trim()
            if (materialCode) {
              matched = items.find(it => String((it && (it.materialCode || it.material_code)) || '').trim() === materialCode) || null
            }
          }
          const remark = this.resolveOrderDetailRemarkText(matched || {})
          if (Number.isFinite(detailId) && detailId > 0) {
            this.$set(this.detailOrderRemarkCache, detailId, remark)
          }
          return String(remark || '').trim()
        }
      }

      return ''
    },
    isSlittingRowCompleted(row) {
      const status = String((row && row.status) || '').trim().toUpperCase()
      if (['COMPLETED', 'DONE'].includes(status)) return true

      if (['PARTIAL', 'IN_PROGRESS', 'PROCESSING', 'UNSCHEDULED', 'SCHEDULED', 'PENDING'].includes(status)) {
        return false
      }

      const productionStatus = String((row && (row.production_status || row.productionStatus)) || '').trim().toLowerCase()
      if (productionStatus === 'completed') return true

      const orderQty = Number((row && (
        row.orderQty != null ? row.orderQty
          : row.order_qty != null ? row.order_qty
            : row.rolls
      )) || 0)
      const reportedQty = Number((row && (
        row.slitting_report_qty != null ? row.slitting_report_qty
          : row.slittingReportQty != null ? row.slittingReportQty
            : row.producedQty != null ? row.producedQty
              : row.produced_qty
      )) || 0)
      return Number.isFinite(orderQty) && orderQty > 0 && Number.isFinite(reportedQty) && reportedQty >= orderQty
    },
    isTaskCompleted(row, ft = '') {
      const stage = String(ft || '').toLowerCase()
      if (stage === 'slitting') {
        return this.isSlittingRowCompleted(row)
      }
      const status = String((row && row.status) || '').trim().toUpperCase()
      if (['COMPLETED', 'DONE'].includes(status)) return true
      const productionStatus = String((row && (row.production_status || row.productionStatus)) || '').trim().toLowerCase()
      if (productionStatus === 'completed') return true
      const remaining = Number((row && (row.remaining_qty != null ? row.remaining_qty : row.remainingQty)) || NaN)
      if (Number.isFinite(remaining) && remaining <= 0) return true
      return false
    },
    hasPositivePendingDemand(row) {
      const r = row || {}
      const direct = Number(
        r.pending_qty != null ? r.pending_qty
          : r.pendingQty != null ? r.pendingQty
            : r.remaining_qty != null ? r.remaining_qty
              : r.remainingQty != null ? r.remainingQty
                : r.unscheduled_qty != null ? r.unscheduled_qty
                  : r.unscheduledQty
      )
      if (Number.isFinite(direct)) {
        return direct > 0
      }
      const orderQty = Number(
        r.orderQty != null ? r.orderQty
          : r.order_qty != null ? r.order_qty
            : r.rolls
      )
      const scheduledQty = Number(
        r.scheduled_qty != null ? r.scheduled_qty
          : r.scheduledQty != null ? r.scheduledQty
            : r.planned_qty != null ? r.planned_qty
              : r.plannedQty
      )
      if (Number.isFinite(orderQty) && Number.isFinite(scheduledQty)) {
        return (orderQty - scheduledQty) > 0
      }
      return true
    },

    async loadTasks() {
      this.loading = true
      try {
        this.detailOrderItemsCache = {}
        this.detailOrderCustomerOrderNoCache = {}
        this.detailOrderRemarkCache = {}
        this.detailResolveCache = {}
        const ft = (this.fixedType || '').toLowerCase()
        const normalizedOrderNo = this.normalizeOrderNoKeyword(this.query.orderNo)
        const normalizedMaterialCode = this.normalizeKeywordText(this.query.materialCodeKeyword)
        const normalizedSpecKeyword = this.normalizeKeywordText(this.query.specKeyword)
        const finishFilter = (this.query.finishState || '').toUpperCase()
        const useBackendPagingForSlitting = ft === 'slitting'
        const hasTaskKeywordMode = false
        const params = {
          type: this.query.type || undefined,
          status: this.query.status || undefined,
          finishState: useBackendPagingForSlitting ? (finishFilter || undefined) : undefined,
          orderNo: hasTaskKeywordMode ? undefined : (normalizedOrderNo || undefined),
          materialCode: normalizedMaterialCode || undefined,
          specKeyword: normalizedSpecKeyword || undefined,
          planDateStart: this.query.dateRange && this.query.dateRange.length ? this.query.dateRange[0] : undefined,
          planDateEnd: this.query.dateRange && this.query.dateRange.length ? this.query.dateRange[1] : undefined,
          pageNum: this.query.pageNum,
          pageSize: this.query.pageSize
        }

        let res
        // 生产管理固定任务（涂布/复卷/分切）统一按计划取数
        if (ft === 'coating') {
          // 涂布任务必须与“涂布排程”一致：直接复用手动排程涂布列表数据源
          res = await getCoatingSchedules({
            current: this.query.pageNum,
            size: this.query.pageSize,
            includeCompleted: finishFilter !== 'UNCOMPLETED',
            orderNo: normalizedOrderNo || undefined,
            planDateStart: this.query.dateRange && this.query.dateRange.length ? this.query.dateRange[0] : undefined,
            planDateEnd: this.query.dateRange && this.query.dateRange.length ? this.query.dateRange[1] : undefined,
            status: this.query.status || undefined
          })
        } else if (['rewinding', 'slitting'].includes(ft)) {
          if (hasTaskKeywordMode) {
            if (ft === 'slitting') {
              // 分切关键词模式：合并“已排分切 + 未排订单”，交给前端做模糊匹配
              const [scheduledRes, pendingRes] = await Promise.all([
                getStagePlanTaskPage({
                  stage: 'SLITTING',
                  pageNum: 1,
                  pageSize: 5000,
                  orderNo: normalizedOrderNo || undefined,
                  planDateStart: this.query.dateRange && this.query.dateRange.length ? this.query.dateRange[0] : undefined,
                  planDateEnd: this.query.dateRange && this.query.dateRange.length ? this.query.dateRange[1] : undefined
                }),
                getPendingOrders({
                  current: 1,
                  size: 5000,
                  orderNo: normalizedOrderNo || undefined,
                  materialCode: normalizedMaterialCode || undefined,
                  includeCompleted: finishFilter === 'COMPLETED' || !finishFilter
                })
              ])

              const sData = (scheduledRes && (scheduledRes.code === 200 || scheduledRes.code === 20000)) ? (scheduledRes.data || {}) : {}
              const pData = (pendingRes && (pendingRes.code === 200 || pendingRes.code === 20000)) ? (pendingRes.data || {}) : {}

              const scheduledList = sData.records || sData.list || []
              const pendingListRaw = Array.isArray(pData) ? pData : (pData.records || pData.list || [])

              // 同一订单明细可能存在“已排已完工 + 未排剩余缺口”，这种情况未排项必须保留
              const normalizedScheduled = this.normalizeTaskList(scheduledList, 'slitting')
              const detailAllCompletedMap = new Map()
              normalizedScheduled.forEach(x => {
                const odId = Number(x && (x.order_detail_id || x.orderDetailId || x.orderItemId))
                if (!(Number.isFinite(odId) && odId > 0)) return
                const done = this.isTaskCompleted(x, 'slitting')
                if (!detailAllCompletedMap.has(odId)) {
                  detailAllCompletedMap.set(odId, !!done)
                } else {
                  detailAllCompletedMap.set(odId, detailAllCompletedMap.get(odId) && !!done)
                }
              })

              const pendingFiltered = pendingListRaw
                .filter(x => {
                  const deletedFlag = Number(x && (x.is_deleted != null ? x.is_deleted : x.deleted))
                  if (Number.isFinite(deletedFlag) && deletedFlag === 1) return false
                  return this.hasPositivePendingDemand(x)
                })
                .map(x => ({
                  ...x,
                  id: x && x.order_detail_id,
                  processType: 'SLITTING',
                  type: 'slitting',
                  status: 'UNSCHEDULED',
                  sourceType: 'PENDING_ORDER'
                }))

              // pending接口偶发同一order_detail_id返回多条，先去重，避免未排程重复展示
              const pendingUniqueMap = new Map()
              pendingFiltered.forEach(x => {
                const odId = Number(x && (x.order_detail_id || x.orderItemId || x.orderDetailId))
                const key = Number.isFinite(odId) && odId > 0 ? `OD:${odId}` : `ROW:${x && x.id ? x.id : Math.random()}`
                if (!pendingUniqueMap.has(key)) {
                  pendingUniqueMap.set(key, x)
                }
              })
              const pendingUnique = Array.from(pendingUniqueMap.values())

              const merged = [...scheduledList]
              const existingOrderDetailIds = new Set(
                scheduledList
                  .map(x => Number(x && (x.order_detail_id || x.orderItemId || x.orderDetailId)))
                  .filter(v => Number.isFinite(v) && v > 0)
              )
              pendingUnique.forEach(x => {
                const odId = Number(x && (x.order_detail_id || x.orderItemId || x.orderDetailId))
                if (!(Number.isFinite(odId) && odId > 0) || !existingOrderDetailIds.has(odId)) {
                  merged.push(x)
                }
              })

              res = {
                code: 20000,
                data: {
                  list: merged,
                  total: merged.length
                }
              }
            } else {
              // 复卷关键词模式：拉取较大范围后在前端模糊匹配
              const stageMap = { coating: 'COATING', rewinding: 'REWINDING', slitting: 'SLITTING' }
              res = await getStagePlanTaskPage({
                stage: stageMap[ft],
                pageNum: 1,
                pageSize: 5000,
                status: this.query.status || undefined,
                planDateStart: this.query.dateRange && this.query.dateRange.length ? this.query.dateRange[0] : undefined,
                planDateEnd: this.query.dateRange && this.query.dateRange.length ? this.query.dateRange[1] : undefined
              })
            }
          } else {
            const stageMap = { coating: 'COATING', rewinding: 'REWINDING', slitting: 'SLITTING' }
            res = await getStagePlanTaskPage({
              stage: stageMap[ft],
              pageNum: this.query.pageNum,
              pageSize: this.query.pageSize,
              status: this.query.status || undefined,
              finishState: useBackendPagingForSlitting ? (finishFilter || undefined) : undefined,
              orderNo: normalizedOrderNo || undefined,
              materialCode: normalizedMaterialCode || undefined,
              specKeyword: normalizedSpecKeyword || undefined,
              planDateStart: this.query.dateRange && this.query.dateRange.length ? this.query.dateRange[0] : undefined,
              planDateEnd: this.query.dateRange && this.query.dateRange.length ? this.query.dateRange[1] : undefined
            })
          }
        } else {
          res = await getProductionTasks(params)
        }

        if (res.code === 20000 || res.code === 200) {
          const raw = res.data || {}
          const list = raw.list || raw.records || []
          let normalizedList = this.normalizeTaskList(list, ft)
          normalizedList = await this.enrichTaskMaterialNamesFromMaster(normalizedList)
          const statusFilter = (this.query.status || '').toUpperCase()

          if (!useBackendPagingForSlitting) {
            if (finishFilter === 'COMPLETED') {
              normalizedList = normalizedList.filter(x => this.isTaskCompleted(x, ft))
            } else if (finishFilter === 'UNCOMPLETED') {
              normalizedList = normalizedList.filter(x => !this.isTaskCompleted(x, ft))
            }

            normalizedList = this.applyTaskKeywordFilters(normalizedList, {
              ft,
              orderNoKeyword: normalizedOrderNo,
              materialCodeKeyword: normalizedMaterialCode,
              specKeyword: normalizedSpecKeyword
            })
          }
          this.buildTaskQuerySuggestionPool(normalizedList, ft)

          if (hasTaskKeywordMode) {
            if (statusFilter) {
              normalizedList = normalizedList.filter(x => String((x && x.status) || '').toUpperCase() === statusFilter)
            }
            const range = this.query.dateRange || []
            if (Array.isArray(range) && range.length > 0) {
              const startTs = new Date(`${range[0]} 00:00:00`).getTime()
              const endRaw = range[1] || range[0]
              const endTs = new Date(`${endRaw} 23:59:59`).getTime()
              normalizedList = normalizedList.filter(x => {
                const ts = x && x.planStartTime ? new Date(String(x.planStartTime).replace(' ', 'T')).getTime() : NaN
                return !Number.isNaN(ts) && ts >= startTs && ts <= endTs
              })
            }
            this.total = Number(normalizedList.length || 0)
            const from = Math.max(0, (this.query.pageNum - 1) * this.query.pageSize)
            const to = from + this.query.pageSize
            this.list = normalizedList.slice(from, to)
          } else {
            this.list = normalizedList
            this.total = Number(raw.total || 0)
          }

          if (hasTaskKeywordMode) {
            this.taskSummary = this.calcTaskSummary(normalizedList)
          } else {
            await this.loadTaskSummary(ft, this.total)
          }
          const syncDate = this.pickDateForLocks(this.query.dateRange)
          if (syncDate) {
            this.lockQuery.planDate = syncDate
          }
        } else {
          this.taskQuerySuggestionPool = { orderNos: [], materialCodes: [], specs: [] }
          this.taskSummary = { materialCodeCount: 0, totalArea: 0, reportedMaterialCodeCount: 0, reportedArea: 0 }
        }
      } catch (e) {
        this.taskQuerySuggestionPool = { orderNos: [], materialCodes: [], specs: [] }
        this.taskSummary = { materialCodeCount: 0, totalArea: 0, reportedMaterialCodeCount: 0, reportedArea: 0 }
        this.$message.error('加载任务失败')
      } finally {
        this.loading = false
        if (!this.reportDialogVisible) {
          this.focusDetailQrScanInput()
        }
      }
    },

    pageSizeChange(size) {
      this.query.pageSize = Number(size) || 10
      this.query.pageNum = 1
      this.loadTasks()
    },
    pageChange(p) { this.query.pageNum = p; this.loadTasks() },
    resetQuery() {
      const today = this.todayDate()
      this.query = { type: this.fixedType || '', status: '', finishState: 'UNCOMPLETED', orderNo: '', materialCodeKeyword: '', specKeyword: '', dateRange: [today, today], pageNum: 1, pageSize: 10 }
      this.loadTasks()
    },

    async loadOrderLocks() {
      if (!this.lockQuery.planDate) { this.$message.info('请选择计划日期'); return }
      this.locksLoading = true
      try {
        if (this.isCoating) {
          if (!this.lockQuery.materialCode && !this.lockQuery.orderNo) {
            this.locks = []
            this.coatingRequestNos = []
            this.$message.warning('涂布查询请先输入成品料号或订单号，避免查询到其它料号')
            return
          }
          const res = await queryCoatingChemicalLocks({
            planDate: this.lockQuery.planDate || this.todayDate(),
            orderNo: this.lockQuery.orderNo || undefined,
            materialCode: this.lockQuery.materialCode || undefined
          })
          if (res && (res.code === 200 || res.code === 20000)) {
            const summary = (res.data && res.data.summary) || {}
            this.locks = (res.data && res.data.locks) || []
            this.coatingRequestNos = summary.requestNos || []
            this.selected = []
            const missingFormulaCount = Number(summary.missingFormulaCount || 0)
            if (missingFormulaCount > 0 && !this.locks.length) {
              const missingList = Array.isArray(summary.missingFormulaPlans) ? summary.missingFormulaPlans : []
              const topReason = (missingList[0] && missingList[0].reason) || '配胶单缺失'
              this.$message.warning(`不能领料：该料号配胶单不完整（${topReason}），请联系研发解决`)
            } else {
              this.$message.success(`原料分解完成：锁定${summary.lockCount || 0}条，请购${summary.requestItemCount || 0}条`)
            }
          } else {
            this.locks = []
            this.coatingRequestNos = []
          }
        } else {
          if (!this.lockQuery.orderNo) {
            this.locks = []
            this.selected = []
            this.$message.warning('请先输入订单号，再查询该订单已锁定物料')
            return
          }
          const processType = this.lockQuery.processType || (this.isSlitting ? 'SLITTING' : (this.isRewinding ? 'REWINDING' : undefined))
          const res = await queryOrderLockedStocks(
            this.lockQuery.materialCode || '',
            this.lockQuery.planDate || this.todayDate(),
            this.lockQuery.orderNo || '',
            this.lockQuery.rollCode || '',
            processType,
            this.lockQuery.requiredLength
          )
          this.locks = (res && (res.code === 200 || res.code === 20000)) ? (res.data || []) : []
        }
      } catch (e) {
        this.$message.error('加载锁定失败')
      } finally {
        this.locksLoading = false
      }
    },
    resetLocks() {
      this.lockQuery.orderNo = ''
      this.lockQuery.materialCode = ''
      this.lockQuery.rollCode = ''
      this.lockQuery.planDate = this.pickDateForLocks(this.query.dateRange) || this.todayDate()
      this.lockQuery.processType = this.isSlitting ? 'SLITTING' : (this.isRewinding ? 'REWINDING' : '')
      this.lockQuery.requiredLength = null
      this.locks = []
      this.selected = []
      this.coatingRequestNos = []
      if (this.isCoating) {
        this.loadOrderLocks()
      }
    },
    selChange(rows) { this.selected = rows },

    quickLoadLocksByTask(row) {
      if (this.isSlitting) {
        this.openSlittingIssueDialog(row)
        return
      }
      if (this.isCoating) {
        this.openCoatingIssueDialog(row)
        return
      }
      this.lockQuery.materialCode = row.materialCode || ''
      this.lockQuery.orderNo = row.orderNo || ''
      this.lockQuery.rollCode = ''
      this.lockQuery.processType = this.isSlitting ? 'SLITTING' : (this.isRewinding ? 'REWINDING' : '')
      const rowLength = Number(row.length || row.planLength || row.processLength || row.process_length || 0)
      this.lockQuery.requiredLength = Number.isFinite(rowLength) && rowLength > 0 ? Math.round(rowLength) : null
      const taskDate = this.resolveTaskLockDate(row)
      this.lockQuery.planDate = taskDate || this.lockQuery.planDate || this.todayDate()
      this.loadOrderLocks().then(() => {
        this.issueByCurrentQuery()
      })
    },

    resetCoatingIssueForm() {
      this.coatingIssueForm = {
        taskRow: null,
        taskNo: '',
        orderNo: '',
        materialCode: '',
        materialName: '',
        planDate: this.todayDate(),
        planQty: 0,
        specText: '',
        missingReason: '',
        lockRows: [],
        lockTotalQty: 0,
        requestNos: [],
        manualRows: []
      }
    },
    closeCoatingIssueDialog() {
      this.resetCoatingIssueForm()
      this.coatingIssueSubmitting = false
      this.coatingIssueLoading = false
    },
    resolveCoatingTaskNo(row) {
      return String((row && (row.taskNo || row.task_no || row.scheduleNo || row.schedule_no)) || '').trim()
    },
    resolveCoatingPlanQty(row) {
      const n = Number((row && (row.planArea || row.planSqm || row.plan_qty || row.qty || row.planQuantity)) || 0)
      return Number.isFinite(n) ? n : 0
    },
    resolveCoatingSpecText(row) {
      const t = row && (row.thickness != null ? row.thickness : '')
      const w = row && (row.jumboWidth != null ? row.jumboWidth : '')
      const l = row && (row.planLength != null ? row.planLength : '')
      if (t !== '' || w !== '' || l !== '') {
        return `${t || '-'}μm×${w || '-'}mm×${l || '-'}m`
      }
      return String((row && (row.specDesc || row.spec || row.specification)) || '').trim()
    },
    isAreaSectionKey(sectionKey) {
      const key = String(sectionKey || '').trim().toUpperCase()
      return key === 'BASE' || key === 'FILM'
    },
    canAutoIssueLockRow(row) {
      return !!row
    },
    resolveCoatingLockAvailableQty(row) {
      if (!row) return 0
      if (this.isAreaSectionKey(row.sectionKey)) {
        return this.resolveCoatingLockAvailableLength(row)
      }
      return Number(row.lockedQty || 0)
    },
    resolveCoatingLockAvailableLength(row) {
      if (!row) return 0
      const n = Number(row.stockAvailableLengthM || row.availableLengthM || 0)
      return Number.isFinite(n) && n > 0 ? n : 0
    },
    resolveCoatingLockPackQty(row) {
      if (!row) return 0
      if (this.isAreaSectionKey(row.sectionKey)) {
        const n = Number(row.stockAvailableRolls || row.availableRolls || row.stockAvailablePackCount || 0)
        return Number.isFinite(n) && n > 0 ? n : 0
      }
      return Number(row.stockAvailableQty || row.availableQty || row.availableQuantity || 0)
    },
    resolveCoatingLockUnit(row) {
      if (!row) return '-'
      if (this.isAreaSectionKey(row.sectionKey)) return '卷'
      return String(row.unit || 'kg')
    },
    resolveCoatingIssueUnit(row) {
      if (!row) return '-'
      if (this.isAreaSectionKey(row.sectionKey)) return 'm'
      return String(row.unit || 'kg')
    },
    formatCoatingLockQty(row) {
      if (this.isAreaSectionKey(row && row.sectionKey)) {
        const n = this.resolveCoatingLockAvailableLength(row)
        if (!Number.isFinite(n)) return '0'
        return n.toFixed(0)
      }
      const n = Number((row && (row.stockAvailableQty || row.availableQty || row.availableQuantity)) || 0)
      if (!Number.isFinite(n)) return '0'
      return n.toFixed(0)
    },
    formatCoatingLockPackQty(row) {
      const n = this.resolveCoatingLockPackQty(row)
      if (!Number.isFinite(n) || n <= 0) return '-'
      return String(Math.max(0, Math.round(n)))
    },
    newCoatingManualRow(partial = {}) {
      return {
        warehouseType: partial.warehouseType || 'chemical',
        rawMaterialCode: partial.rawMaterialCode || '',
        rawMaterialName: partial.rawMaterialName || '',
        specDesc: partial.specDesc || '',
        unit: partial.unit || '',
        stockId: partial.stockId || null,
        detailId: partial.detailId || null,
        batchNo: partial.batchNo || '',
        batchOptions: Array.isArray(partial.batchOptions) ? partial.batchOptions : [],
        warehouseQty: partial.warehouseQty != null ? Number(partial.warehouseQty) : 0,
        issueQty: partial.issueQty != null ? Number(partial.issueQty) : 0
      }
    },
    addCoatingManualRow() {
      this.coatingIssueForm.manualRows.push(this.newCoatingManualRow())
    },
    removeCoatingManualRow(index) {
      this.coatingIssueForm.manualRows.splice(index, 1)
    },
    normalizeWarehouseType(type) {
      return String(type || '').toLowerCase() === 'film' ? 'film' : 'chemical'
    },
    async ensureCoatingStockCache(type) {
      const t = this.normalizeWarehouseType(type)
      if (t === 'film') {
        if (Array.isArray(this.coatingFilmStockCache)) return this.coatingFilmStockCache
        const res = await getFilmStockList()
        this.coatingFilmStockCache = (res && (res.code === 200 || res.code === 20000) && Array.isArray(res.data)) ? res.data : []
        return this.coatingFilmStockCache
      }
      if (Array.isArray(this.coatingChemicalStockCache)) return this.coatingChemicalStockCache
      const res = await getChemicalStockList()
      this.coatingChemicalStockCache = (res && (res.code === 200 || res.code === 20000) && Array.isArray(res.data)) ? res.data : []
      return this.coatingChemicalStockCache
    },
    findStockByMaterial(materialCode, type = 'chemical') {
      const code = String(materialCode || '').trim().toUpperCase()
      if (!code) return null
      const t = this.normalizeWarehouseType(type)
      const list = t === 'film'
        ? (Array.isArray(this.coatingFilmStockCache) ? this.coatingFilmStockCache : [])
        : (Array.isArray(this.coatingChemicalStockCache) ? this.coatingChemicalStockCache : [])
      const matched = list.filter(item => String((item && item.materialCode) || '').trim().toUpperCase() === code)
      if (!matched.length) return null
      if (t === 'film') {
        return matched.sort((a, b) => Number((b && b.availableArea) || 0) - Number((a && a.availableArea) || 0))[0]
      }
      return matched.sort((a, b) => Number((b && b.availableQuantity) || 0) - Number((a && a.availableQuantity) || 0))[0]
    },
    isFilmLikeRawMaterial(item) {
      if (!item) return false
      const category = String(item.materialCategory || '').toLowerCase()
      const type = String(item.materialType || '').toLowerCase()
      const name = String(item.materialName || '').toLowerCase()
      const text = `${category} ${type} ${name}`
      return text.includes('film') || text.includes('薄膜') || text.includes('离型')
    },
    onManualWarehouseTypeChange(row) {
      if (!row) return
      row.warehouseType = this.normalizeWarehouseType(row.warehouseType)
      row.stockId = null
      row.detailId = null
      row.batchNo = ''
      row.batchOptions = []
      row.specDesc = ''
      row.unit = ''
      row.warehouseQty = 0
      if (row.rawMaterialCode) {
        this.refreshManualStockQty(row)
      }
    },
    onManualBatchChange(row) {
      if (!row) return
      const options = Array.isArray(row.batchOptions) ? row.batchOptions : []
      const hit = options.find(x => String(x.detailId) === String(row.detailId))
      if (!hit) {
        row.stockId = null
        row.batchNo = ''
        row.specDesc = ''
        row.unit = ''
        row.warehouseQty = 0
        return
      }
      row.stockId = hit.stockId
      row.batchNo = hit.batchNo || ''
      row.specDesc = hit.specDesc || ''
      row.unit = hit.unit || row.unit || ''
      row.warehouseQty = Number(hit.availableQty || 0)
      row.rawMaterialName = row.rawMaterialName || hit.materialName || ''
    },
    async refreshManualStockQty(row, silent = false) {
      if (!row) return
      const code = String(row.rawMaterialCode || '').trim()
      const warehouseType = this.normalizeWarehouseType(row.warehouseType)
      if (!code) {
        row.stockId = null
        row.detailId = null
        row.batchNo = ''
        row.batchOptions = []
        row.specDesc = ''
        row.unit = ''
        row.warehouseQty = 0
        return
      }

      await this.ensureCoatingStockCache(warehouseType)
      const stock = this.findStockByMaterial(code, warehouseType)
      row.batchOptions = []
      row.stockId = null
      row.detailId = null
      row.batchNo = ''
      row.specDesc = ''
      row.unit = ''
      row.warehouseQty = 0

      if (!stock) {
        if (!silent) {
          this.$message.warning(`料号 ${code} 在${warehouseType === 'film' ? '薄膜仓' : '化工仓'}未找到库存`)
        }
        return
      }

      row.rawMaterialName = row.rawMaterialName || stock.materialName || ''
      const detailsRes = warehouseType === 'film'
        ? await getFilmStockDetails(stock.id)
        : await getChemicalStockDetails(stock.id)
      const ok = detailsRes && (detailsRes.code === 200 || detailsRes.code === 20000)
      const details = ok ? (detailsRes.data || []) : []

      row.batchOptions = (details || [])
        .map(d => {
          const status = String((d && d.status) || '').toLowerCase()
          const availableQty = warehouseType === 'film'
            ? Number((d && d.area) || 0)
            : Number((d && (d.remainingWeight != null ? d.remainingWeight : d.weight)) || 0)
          const batchNo = String((d && (d.batchNo || d.rollNo || d.barrelNo || d.containerNo)) || '').trim()
          return {
            stockId: stock.id,
            detailId: d.id,
            batchNo,
            materialName: stock.materialName || '',
            specDesc: warehouseType === 'film'
              ? `${stock.thickness || '-'}μm×${d.width || stock.width || '-'}mm×${d.length || '-'}m`
              : String((d && (d.specDesc || d.specification || d.remark)) || '').trim(),
            unit: warehouseType === 'film' ? '㎡' : String((d && d.unit) || (stock && stock.unit) || 'kg'),
            availableQty,
            status,
            label: `${batchNo || '无批次'} / 可用${Number.isFinite(availableQty) ? availableQty : 0}${warehouseType === 'film' ? '㎡' : 'kg'}`
          }
        })
        .filter(x => {
          const status = String(x.status || '').toLowerCase()
          if (status === 'locked') return false
          return Number(x.availableQty || 0) > 0
        })

      if (!row.batchOptions.length) {
        if (!silent) {
          this.$message.warning(`料号 ${code} 在${warehouseType === 'film' ? '薄膜仓' : '化工仓'}无可用批次`)
        }
        return
      }

      row.detailId = row.batchOptions[0].detailId
      this.onManualBatchChange(row)
    },
    onSelectManualMaterial(row, item) {
      if (!row) return
      row.rawMaterialCode = String((item && item.materialCode) || row.rawMaterialCode || '').trim()
      row.rawMaterialName = String((item && item.materialName) || row.rawMaterialName || '').trim()
      const preferFilm = this.isFilmLikeRawMaterial(item)
      row.warehouseType = preferFilm ? 'film' : 'chemical'
      this.refreshManualStockQty(row)
    },
    onChangeManualMaterial(row) {
      if (!row) return
      row.stockId = null
      row.detailId = null
      row.batchNo = ''
      row.batchOptions = []
      row.specDesc = ''
      row.unit = ''
      row.warehouseQty = 0
    },
    async queryRawMaterialCode(queryString, cb) {
      const keyword = String(queryString || '').trim()
      if (!keyword) {
        cb([])
        return
      }
      try {
        const res = await getRawMaterialPage({ page: 1, size: 20, materialCode: keyword, status: 1 })
        const ok = res && (res.code === 200 || res.code === 20000)
        const rows = ok ? ((((res.data || {}).records) || ((res.data || {}).list) || [])) : []
        cb((rows || []).map(item => ({
          value: `${item.materialCode || ''} - ${item.materialName || ''}`,
          materialCode: item.materialCode,
          materialName: item.materialName,
          materialCategory: item.materialCategoryRaw || item.materialCategory,
          materialType: item.materialType
        })))
      } catch (e) {
        cb([])
      }
    },
    normalizeMaterialCodeText(v) {
      return String(v == null ? '' : v).replace(/\s+/g, '').toUpperCase()
    },
    extractEmbeddedFinishedCodes(text) {
      const normalized = this.normalizeMaterialCodeText(text)
      if (!normalized) return []
      const found = normalized.match(/[A-Z0-9]{2,8}-R\d{2}-\d{3,5}-T\d{2}-\d{3,6}/g) || []
      const set = new Set(found)
      found.forEach(code => {
        const parts = String(code || '').split('-')
        if (parts.length >= 5 && /^\d{4,8}$/.test(parts[0])) {
          const t = parts[0].replace(/^0+/, '')
          if (t && t.length >= 3) set.add(`${t}-${parts[1]}-${parts[2]}-${parts[3]}-${parts[4]}`)
          if (parts[0].length > 3) {
            const tail3 = parts[0].slice(-3)
            set.add(`${tail3}-${parts[1]}-${parts[2]}-${parts[3]}-${parts[4]}`)
          }
        }
      })
      return Array.from(set)
    },
    isCompatibleMaterialCode(leftCode, rightCode) {
      const left = this.normalizeMaterialCodeText(leftCode)
      const right = this.normalizeMaterialCodeText(rightCode)
      if (!left || !right) return true
      if (left === right) return true
      if (left.includes(right) || right.includes(left)) return true

      const leftSet = new Set([left, ...this.extractEmbeddedFinishedCodes(left)])
      const rightSet = new Set([right, ...this.extractEmbeddedFinishedCodes(right)])
      for (const a of leftSet) {
        for (const b of rightSet) {
          if (!a || !b) continue
          if (a === b) return true
          if (a.includes(b) || b.includes(a)) return true
        }
      }
      return false
    },
    async openCoatingIssueDialog(row) {
      const planDate = this.resolveTaskLockDate(row) || this.lockQuery.planDate || this.todayDate()
      const orderNo = row.orderNo || row.order_no || ''
      const materialCode = row.materialCode || row.material_code || ''
      const scheduleId = Number(row.id || row.scheduleId || row.schedule_id || 0)
      const norm = v => this.normalizeMaterialCodeText(v)
      const normOrderNo = norm(orderNo)
      const normMaterialCode = norm(materialCode)
      if (!orderNo && !materialCode) {
        this.$message.warning('缺少订单号或料号，无法执行涂布领料')
        return
      }

      this.resetCoatingIssueForm()
      this.coatingIssueForm.taskRow = row
      this.coatingIssueForm.taskNo = this.resolveCoatingTaskNo(row)
      this.coatingIssueForm.orderNo = orderNo
      this.coatingIssueForm.materialCode = materialCode
      this.coatingIssueForm.materialName = row.materialName || row.material_name || ''
      this.coatingIssueForm.planDate = planDate
      this.coatingIssueForm.planQty = this.resolveCoatingPlanQty(row)
      this.coatingIssueForm.specText = this.resolveCoatingSpecText(row)
      this.coatingIssueDialogVisible = true
      this.coatingIssueLoading = true
      try {
        const res = await queryCoatingChemicalLocks({
          planDate,
          scheduleId: scheduleId > 0 ? scheduleId : undefined,
          orderNo,
          materialCode
        })
        if (!(res && (res.code === 200 || res.code === 20000))) {
          this.$message.error((res && (res.message || res.msg)) || '原料分解失败')
          return
        }

        const allLocks = (res.data && res.data.locks) || []
        const summary = (res.data && res.data.summary) || {}
        const missingFormulaPlansAll = Array.isArray(summary.missingFormulaPlans) ? summary.missingFormulaPlans : []
        let filteredLocks = allLocks.filter(x => {
          const sid = Number((x && x.scheduleId) || 0)
          if (scheduleId > 0 && sid > 0) return sid === scheduleId
          if (materialCode && x && x.finishedMaterialCode && !this.isCompatibleMaterialCode(x.finishedMaterialCode, materialCode)) return false
          return true
        })
        let missingFormulaPlans = missingFormulaPlansAll.filter(x => {
          const sid = Number((x && x.scheduleId) || 0)
          if (scheduleId > 0 && sid > 0) return sid === scheduleId
          if (materialCode && x && x.materialCode && !this.isCompatibleMaterialCode(x.materialCode, materialCode)) return false
          return true
        })

        if (!filteredLocks.length) {
          filteredLocks = allLocks.filter(x => {
            const codeOk = !normMaterialCode || this.isCompatibleMaterialCode(x && x.finishedMaterialCode, materialCode)
            const orderOk = !normOrderNo || norm(x && x.orderNo).includes(normOrderNo)
            return codeOk && orderOk
          })
        }
        if (!missingFormulaPlans.length) {
          missingFormulaPlans = missingFormulaPlansAll.filter(x => {
            const codeOk = !normMaterialCode || this.isCompatibleMaterialCode(x && x.materialCode, materialCode)
            const orderOk = !normOrderNo || norm(x && x.orderNo).includes(normOrderNo)
            return codeOk && orderOk
          })
        }

        this.coatingIssueForm.requestNos = summary.requestNos || []
        this.coatingIssueForm.missingReason = ''
        this.coatingRequestNos = this.coatingIssueForm.requestNos
        this.locks = filteredLocks
        this.coatingIssueForm.lockRows = filteredLocks.map(x => ({
          ...x,
          sectionKey: x.sectionKey || 'OTHER',
          sectionLabel: x.sectionLabel || '其他',
          specDesc: x.specDesc || x.rawMaterialSpec || x.spec || '-',
          warehouseQty: Number(x.stockAvailableQty || x.availableQty || x.availableQuantity || 0),
          requiredQty: Number(x.requiredQty || 0),
          requiredKg: Number(x.requiredKg || x.plannedUsage || 0),
          lockedQty: Number(x.lockedQty || 0),
          issueQty: this.isAreaSectionKey(x.sectionKey)
            ? Math.max(0, Math.round(Number(row.planLength || row.processLength || row.length || 0)))
            : Number(x.lockedQty || 0),
          unit: String(x.unit || 'kg')
        }))
        this.coatingIssueForm.lockTotalQty = this.coatingIssueForm.lockRows.reduce((sum, x) => sum + Number(x.issueQty || 0), 0)

        if (!this.coatingIssueForm.lockRows.length) {
          this.addCoatingManualRow()
        }
        if (missingFormulaPlans.length > 0 && !this.coatingIssueForm.lockRows.length) {
          const topReason = (missingFormulaPlans[0] && missingFormulaPlans[0].reason) || '配胶单缺失'
          this.coatingIssueForm.missingReason = topReason
          this.$message.warning(`该任务未找到可领配方：${topReason}。请手动选择料号领料`)
        }
      } catch (e) {
        this.$message.error('加载涂布领料信息失败')
      } finally {
        this.coatingIssueLoading = false
      }
    },
    async submitCoatingIssueDialog() {
      const lockRows = (this.coatingIssueForm.lockRows || []).filter(x => Number(x.issueQty || 0) > 0)
      const chemicalLockRows = lockRows.filter(x => !this.isAreaSectionKey(x.sectionKey))
      const filmLockRows = lockRows.filter(x => this.isAreaSectionKey(x.sectionKey))
      const issueItems = chemicalLockRows
        .map(x => ({
          lockId: Number(x.id || x.lockId),
          issueQty: Math.max(0, Math.round(Number(x.issueQty || 0)))
        }))
        .filter(x => Number.isFinite(x.lockId) && x.lockId > 0 && x.issueQty > 0)
      const manualRows = (this.coatingIssueForm.manualRows || [])
        .map(x => ({ ...x, rawMaterialCode: String((x && x.rawMaterialCode) || '').trim() }))
        .filter(x => x.rawMaterialCode && Number(x.issueQty || 0) > 0)

      if (!issueItems.length && !manualRows.length) {
        this.$message.warning('请至少填写一条领料明细')
        return
      }

      this.coatingIssueSubmitting = true
      try {
        let autoIssuedCount = 0
        let autoTotalOutQty = 0
        let autoFilmIssuedCount = 0
        if (issueItems.length) {
          const issueRes = await confirmCoatingChemicalIssue({ issueItems, operator: this.currentOperatorName || 'production' })
          if (!(issueRes && (issueRes.code === 200 || issueRes.code === 20000))) {
            this.$message.error((issueRes && (issueRes.message || issueRes.msg)) || '配方领料失败')
            return
          }
          const d = issueRes.data || {}
          autoIssuedCount = Number(d.issuedCount || 0)
          autoTotalOutQty = Number(d.totalOutQty || 0)
        }

        for (const row of filmLockRows) {
          const stockId = Number(row.filmStockId || row.stockId || 0)
          const needLength = Math.max(0, Math.round(Number(row.issueQty || 0)))
          if (!stockId || needLength <= 0) continue

          // eslint-disable-next-line no-await-in-loop
          const detailRes = await getFilmStockDetails(stockId)
          if (!(detailRes && (detailRes.code === 200 || detailRes.code === 20000))) {
            continue
          }
          const details = Array.isArray(detailRes.data) ? detailRes.data : []
          const usableDetails = details
            .filter(d => {
              const status = String((d && d.status) || '').toLowerCase()
              const len = Number((d && (d.currentLengthM != null ? d.currentLengthM : d.length)) || 0)
              return status !== 'locked' && len > 0
            })
            .sort((a, b) => Number((a && a.id) || 0) - Number((b && b.id) || 0))
          if (!usableDetails.length) continue

          const picked = []
          let accLength = 0
          for (const d of usableDetails) {
            const oneLen = Number((d && (d.currentLengthM != null ? d.currentLengthM : d.length)) || 0)
            if (!(oneLen > 0)) continue
            picked.push(d)
            accLength += oneLen
            if (accLength >= needLength) break
          }
          if (!picked.length) continue
          const pickedArea = picked
            .reduce((sum, d) => sum + Number((d && d.area) || 0), 0)

          // eslint-disable-next-line no-await-in-loop
          const filmOutRes = await createFilmOutbound({
            filmStockId: stockId,
            outArea: pickedArea,
            outRolls: picked.length,
            detailIds: picked.map(d => d.id),
            outboundBy: this.currentOperatorName || 'production',
            purpose: 'COATING_MATERIAL_ISSUE',
            remark: `涂布任务配方领料-${this.coatingIssueForm.taskNo || ''}`
          })
          if (filmOutRes && (filmOutRes.code === 200 || filmOutRes.code === 20000)) {
            autoFilmIssuedCount += picked.length
          }
        }

        await this.ensureCoatingStockCache('chemical')
        await this.ensureCoatingStockCache('film')
        const manualSuccessRows = []
        for (const row of manualRows) {
          // eslint-disable-next-line no-await-in-loop
          await this.refreshManualStockQty(row)
          const stockId = Number(row.stockId || 0)
          const detailId = Number(row.detailId || 0)
          const issueQty = Number(row.issueQty || 0)
          if (!stockId || !detailId || !(issueQty > 0)) {
            // eslint-disable-next-line no-continue
            continue
          }
          const warehouseType = this.normalizeWarehouseType(row.warehouseType)
          let outRes = null
          if (warehouseType === 'film') {
            // eslint-disable-next-line no-await-in-loop
            outRes = await createFilmOutbound({
              filmStockId: stockId,
              outArea: issueQty,
              outRolls: 1,
              detailIds: [detailId],
              outboundBy: this.currentOperatorName || 'production',
              purpose: 'COATING_MATERIAL_ISSUE_MANUAL',
              remark: `涂布任务手动领料-${this.coatingIssueForm.taskNo || ''}`
            })
          } else {
            const outQuantity = Math.max(1, Math.round(issueQty))
            // eslint-disable-next-line no-await-in-loop
            outRes = await createChemicalOutbound({
              chemicalStockId: stockId,
              outQuantity,
              outWeight: issueQty,
              detailIds: [detailId],
              outboundBy: this.currentOperatorName || 'production',
              purpose: 'COATING_MATERIAL_ISSUE_MANUAL',
              remark: `涂布任务手动领料-${this.coatingIssueForm.taskNo || ''}`
            })
          }
          if (outRes && (outRes.code === 200 || outRes.code === 20000)) {
            manualSuccessRows.push({
              rawMaterialCode: row.rawMaterialCode,
              rawMaterialName: row.rawMaterialName,
              issueQty,
              warehouseType: this.normalizeWarehouseType(row.warehouseType),
              specDesc: row.specDesc || '',
              unit: row.unit || (this.normalizeWarehouseType(row.warehouseType) === 'film' ? '㎡' : 'kg')
            })
          }
        }

        if (!autoIssuedCount && !manualSuccessRows.length) {
          this.$message.warning('未成功提交领料，请检查库存后重试')
          return
        }

        this.buildCoatingIssueSheet(this.coatingIssueForm.taskRow, lockRows, this.coatingIssueForm.requestNos, manualSuccessRows)
        this.$message.success(`领料完成：化工配方出库${autoIssuedCount}条，数量${autoTotalOutQty}${autoFilmIssuedCount ? `；薄膜按卷出库${autoFilmIssuedCount}卷` : ''}${manualSuccessRows.length ? `；手动出库${manualSuccessRows.length}条` : ''}`)
        this.coatingIssueDialogVisible = false
        await this.loadOrderLocks()
      } catch (e) {
        this.$message.error('领料失败')
      } finally {
        this.coatingIssueSubmitting = false
      }
    },

    newSlittingIssueRow(partial = {}) {
      return {
        rollCode: partial.rollCode || '',
        lockId: partial.lockId || null,
        lockStatus: partial.lockStatus || '',
        issuedArea: partial.issuedArea != null ? partial.issuedArea : '',
        machineCode: partial.machineCode || this.slittingIssueForm.machineCode || this.slittingIssueForm.plannedMachineCode || '',
        operator: partial.operator || this.slittingIssueForm.operator || this.currentOperatorName || ''
      }
    },
    openSlittingIssueDialog(row) {
      const planDate = this.resolveTaskLockDate(row) || this.pickDateForLocks(this.query.dateRange) || this.todayDate()
      const orderNo = this.resolvePrintableOrderNo(row && row.orderNo)
      const materialCode = (row && row.materialCode) || ''
      const plannedMachineCode = (row && row.equipmentCode) || ''
      const operator = this.currentOperatorName || this.buildOperatorWithGroup()
      this.slittingIssueForm = {
        mode: 'BATCH',
        orderNo,
        materialCode,
        planDate,
        plannedMachineCode,
        machineCode: plannedMachineCode || '',
        operator,
        batchScanCodes: '',
        rows: []
      }
      this.slittingIssueDialogVisible = true
    },
    parseRollCodes(text) {
      return Array.from(new Set(
        String(text || '')
          .split(/[\n\r,，;；\s]+/)
          .map(x => String(x || '').trim())
          .filter(Boolean)
      ))
    },
    async querySlittingLockByRollCode(rollCode) {
      const res = await queryOrderLockedStocks(
        this.slittingIssueForm.materialCode || '',
        this.slittingIssueForm.planDate || this.todayDate(),
        this.slittingIssueForm.orderNo || '',
        rollCode || '',
        'SLITTING',
        null
      )
      if (!(res && (res.code === 200 || res.code === 20000))) return null
      const list = Array.isArray(res.data) ? res.data : []
      if (!list.length) return null
      const preferred = list.find(x => ['LOCKED', '锁定中', 'PARTIAL'].includes(String(x.lockStatus || '').toUpperCase()) || ['LOCKED', 'PARTIAL'].includes(String(x.lockStatus || '')))
      return preferred || list[0]
    },
    async loadSlittingIssueByBatch() {
      const codes = this.parseRollCodes(this.slittingIssueForm.batchScanCodes)
      if (!codes.length) {
        this.$message.warning('请先扫码或输入卷料码')
        return
      }
      this.slittingIssueLoading = true
      try {
        const rows = []
        for (let i = 0; i < codes.length; i++) {
          const code = codes[i]
          const lock = await this.querySlittingLockByRollCode(code)
          if (!lock) {
            rows.push(this.newSlittingIssueRow({ rollCode: code }))
            continue
          }
          rows.push(this.newSlittingIssueRow({
            rollCode: lock.rollCode || code,
            lockId: lock.id,
            lockStatus: lock.lockStatus,
            issuedArea: lock.lockedArea != null ? lock.lockedArea : lock.issuedArea,
            machineCode: this.slittingIssueForm.machineCode || this.slittingIssueForm.plannedMachineCode || '',
            operator: this.slittingIssueForm.operator || this.currentOperatorName || ''
          }))
        }
        this.slittingIssueForm.rows = rows
      } catch (e) {
        this.$message.error('批次匹配失败')
      } finally {
        this.slittingIssueLoading = false
      }
    },
    addSlittingIssueRow() {
      this.slittingIssueForm.rows.push(this.newSlittingIssueRow())
    },
    removeSlittingIssueRow(index) {
      this.slittingIssueForm.rows.splice(index, 1)
    },
    async fillSlittingIssueRow(row) {
      const rollCode = String((row && row.rollCode) || '').trim()
      if (!rollCode) return
      const currentMachineCode = row && row.machineCode
      const currentOperator = row && row.operator
      const defaultMachineCode = this.slittingIssueForm.machineCode || this.slittingIssueForm.plannedMachineCode || ''
      const defaultOperator = this.slittingIssueForm.operator || this.currentOperatorName || ''
      this.slittingIssueLoading = true
      try {
        const lock = await this.querySlittingLockByRollCode(rollCode)
        if (!lock) return
        const updates = {
          rollCode: lock.rollCode || rollCode,
          lockId: lock.id,
          lockStatus: lock.lockStatus,
          issuedArea: lock.lockedArea != null ? lock.lockedArea : lock.issuedArea,
          machineCode: currentMachineCode || defaultMachineCode,
          operator: currentOperator || defaultOperator
        }
        Object.assign(row, updates)
      } catch (e) {
        this.$message.error('卷码匹配失败')
      } finally {
        this.slittingIssueLoading = false
      }
    },
    async fillAllSlittingIssueRows() {
      const rows = this.slittingIssueForm.rows || []
      if (!rows.length) {
        this.$message.info('请先新增或扫码卷码')
        return
      }
      for (let i = 0; i < rows.length; i++) {
        // eslint-disable-next-line no-await-in-loop
        await this.fillSlittingIssueRow(rows[i])
      }
    },
    async submitSlittingIssue() {
      const rows = (this.slittingIssueForm.rows || []).filter(x => x && x.lockId)
      if (!rows.length) {
        this.$message.warning('没有可提交的锁定记录，请先扫码匹配')
        return
      }
      const normalizedRows = rows.map((x) => {
        const machineCode = String((x && x.machineCode) || this.slittingIssueForm.machineCode || this.slittingIssueForm.plannedMachineCode || '').trim()
        const operator = String((x && x.operator) || this.slittingIssueForm.operator || this.currentOperatorName || '').trim()
        return {
          ...x,
          machineCode,
          operator
        }
      })
      const missingMachineRows = []
      const missingOperatorRows = []
      normalizedRows.forEach((x, idx) => {
        if (!x.machineCode) missingMachineRows.push(idx + 1)
        if (!x.operator) missingOperatorRows.push(idx + 1)
      })
      if (missingMachineRows.length || missingOperatorRows.length) {
        const parts = []
        if (missingMachineRows.length) parts.push(`机台号缺失行：${missingMachineRows.join('、')}`)
        if (missingOperatorRows.length) parts.push(`生产人员缺失行：${missingOperatorRows.join('、')}`)
        this.$message.warning(`提交失败，${parts.join('；')}`)
        return
      }
      normalizedRows.forEach((x, idx) => {
        if (!rows[idx]) return
        rows[idx].machineCode = x.machineCode
        rows[idx].operator = x.operator
      })
      const lockIds = Array.from(new Set(rows
        .map(x => Number(x.lockId))
        .filter(id => Number.isFinite(id) && id > 0)))
      if (!lockIds.length) {
        this.$message.warning('锁定ID无效，无法提交领料')
        return
      }
      this.slittingIssueSubmitting = true
      try {
        const res = await createIssueOrder({
          lockIds,
          planDate: this.slittingIssueForm.planDate || this.todayDate(),
          materialCode: this.slittingIssueForm.materialCode || '',
          orderNo: this.slittingIssueForm.orderNo || '',
          processType: 'SLITTING',
          machineCode: this.slittingIssueForm.machineCode || this.slittingIssueForm.plannedMachineCode || '',
          operator: this.slittingIssueForm.operator || this.currentOperatorName || '',
          issueMode: this.slittingIssueForm.mode || 'BATCH',
          issueRows: normalizedRows.map(x => ({
            lockId: Number(x.lockId),
            rollCode: x.rollCode || '',
            machineCode: x.machineCode || '',
            operator: x.operator || ''
          }))
        })
        if (res && (res.code === 200 || res.code === 20000)) {
          this.$message.success('领料成功，可继续下一次领料')
          this.buildIssueSheet(res.data || {})
          this.slittingIssueForm.batchScanCodes = ''
          this.slittingIssueForm.rows = []
          await this.loadOrderLocks()
          if (this.reportDialogVisible && this.reportDialogMode === 'print' && this.reportForm && this.reportForm.processType === 'SLITTING') {
            await this.loadSlittingIssuedBatchOptions()
          }
        } else {
          this.$message.error((res && (res.msg || res.message)) || '领料失败')
        }
      } catch (e) {
        this.$message.error('领料失败')
      } finally {
        this.slittingIssueSubmitting = false
      }
    },

    async handleCoatingTaskIssue(row) {
      await this.openCoatingIssueDialog(row)
    },

    buildIssueSheet(order) {
      const rows = (order && order.items) || []
      const total = Number((order && order.totalArea) || rows.reduce((sum, r) => sum + Number(r.issuedArea || 0), 0) || 0)
      this.issueSheet = {
        issueNo: (order && order.issueNo) || '',
        materialCode: (order && order.materialCode) || '多项',
        planDate: (order && order.planDate) || this.lockQuery.planDate || this.todayDate(),
        createdAt: (order && order.createdAt) || this.toDateTimeString(new Date()),
        rows: rows,
        totalArea: total.toFixed(2)
      }
      this.issueDialogVisible = true
    },
    buildCoatingIssueSheet(row, locks, requestNos, manualRows = []) {
      const list = Array.isArray(locks) ? locks : []
      const totalQty = list.reduce((sum, x) => sum + Number((x && x.lockedQty) || 0), 0)
      const manualList = (manualRows || []).map(x => ({
        id: null,
        lockId: 'MANUAL',
        orderNo: row && (row.orderNo || row.order_no),
        finishedMaterialCode: row && (row.materialCode || row.material_code),
        rawMaterialCode: x.rawMaterialCode,
        rawMaterialName: x.rawMaterialName,
        sourceType: x.warehouseType === 'film' ? '手动-薄膜仓' : '手动-化工仓',
        specDesc: x.specDesc || '',
        unit: x.unit || '',
        issuedQty: Number(x.issueQty || 0),
        createdAt: this.toDateTimeString(new Date())
      }))
      const manualTotalQty = manualList.reduce((sum, x) => sum + Number(x.issuedQty || 0), 0)
      const planDate = this.lockQuery.planDate || this.todayDate()
      const createdAt = this.toDateTimeString(new Date())
      const scheduleId = row && (row.id || row.scheduleId || row.schedule_id)
      this.issueSheet = {
        issueNo: `CL-${scheduleId || 'NA'}-${createdAt.replace(/[^0-9]/g, '').slice(2, 14)}`,
        materialCode: (row && row.materialCode) || '多项',
        planDate,
        createdAt,
        requestNos: Array.isArray(requestNos) ? requestNos : [],
        rows: list.map(x => ({
          id: x.id,
          lockId: x.id,
          orderNo: x.orderNo,
          finishedMaterialCode: x.finishedMaterialCode,
          rawMaterialCode: x.rawMaterialCode,
          rawMaterialName: x.rawMaterialName,
          sourceType: '配方',
          specDesc: x.specDesc || x.rawMaterialSpec || x.spec || '',
          unit: x.unit || 'kg',
          issuedQty: Number(x.lockedQty || 0),
          createdAt
        })).concat(manualList),
        totalQty: Number((totalQty || 0) + manualTotalQty)
      }
    },
    printIssueSheet() {
      if (!this.issueSheet || !Array.isArray(this.issueSheet.rows) || !this.issueSheet.rows.length) {
        this.$message.info('暂无领料单可打印')
        return
      }
      const sheet = this.issueSheet
      const isCoatingSheet = this.isCoating
      const rowsHtml = sheet.rows.map((r, i) => {
        if (isCoatingSheet) {
          return `<tr>
            <td>${i + 1}</td>
            <td>${(r && (r.lockId || r.id)) || ''}</td>
            <td>${(r && r.orderNo) || ''}</td>
            <td>${(r && r.finishedMaterialCode) || ''}</td>
            <td>${(r && r.rawMaterialCode) || ''}</td>
            <td>${(r && r.rawMaterialName) || ''}</td>
            <td>${(r && r.sourceType) || ''}</td>
            <td>${(r && r.specDesc) || ''}</td>
            <td>${(r && r.unit) || ''}</td>
            <td>${Number((r && r.issuedQty) || 0)}</td>
            <td>${(r && r.createdAt) || ''}</td>
          </tr>`
        }
        return `<tr>
          <td>${i + 1}</td>
          <td>${(r && (r.lockId || r.id)) || ''}</td>
          <td>${(r && r.orderNo) || ''}</td>
          <td>${(r && r.materialCode) || ''}</td>
          <td>${(r && r.filmStockId) || ''}</td>
          <td>${(r && (r.issuedArea || r.lockedArea)) || ''}</td>
          <td>${(r && (r.createdAt || r.lockedTime)) || ''}</td>
        </tr>`
      }).join('')
      const reqNoLine = sheet.requestNos && sheet.requestNos.length
        ? `<div class="row"><strong>关联请购单：</strong>${sheet.requestNos.join('、')}</div>`
        : ''
      const totalLine = isCoatingSheet
        ? `<div class="row" style="margin-top:8px;"><strong>合计数量：</strong>${Number(sheet.totalQty || 0)}</div>`
        : `<div class="row" style="margin-top:8px;"><strong>合计面积：</strong>${sheet.totalArea || '0.00'} m²</div>`
      const header = isCoatingSheet
        ? '<tr><th>#</th><th>锁定ID</th><th>订单号</th><th>成品料号</th><th>原材料代码</th><th>原材料名称</th><th>来源</th><th>规格</th><th>单位</th><th>领料数量</th><th>时间</th></tr>'
        : `<tr><th>#</th><th>锁定ID</th><th>订单号</th><th>料号</th><th>${this.isSlitting ? '支料ID' : '母卷ID'}</th><th>领料面积(m²)</th><th>时间</th></tr>`
      const html = `
        <div class="title">领料单</div>
        <div class="row"><strong>领料单号：</strong>${sheet.issueNo || ''}</div>
        <div class="row"><strong>计划日期：</strong>${sheet.planDate || ''}</div>
        <div class="row"><strong>生成时间：</strong>${sheet.createdAt || ''}</div>
        ${reqNoLine}
        <table>
          <thead>${header}</thead>
          <tbody>${rowsHtml}</tbody>
        </table>
        ${totalLine}
      `
      this.printHtml(`领料单-${sheet.issueNo || 'NA'}`, html)
    },

    async issueByCurrentQuery() {
      const rows = (this.locks || []).filter(x => x.lockStatus === '锁定中' || x.lockStatus === 'LOCKED')
      if (!rows.length) {
        if ((this.lockQuery.processType || '').toUpperCase() === 'SLITTING' && this.lockQuery.orderNo && this.lockQuery.materialCode) {
          try {
            const sameOrderRes = await queryOrderLockedStocks(
              this.lockQuery.materialCode || '',
              this.lockQuery.planDate || this.todayDate(),
              this.lockQuery.orderNo || '',
              this.lockQuery.rollCode || '',
              'SLITTING',
              null
            )
            const sameOrderList = (sameOrderRes && (sameOrderRes.code === 200 || sameOrderRes.code === 20000)) ? (sameOrderRes.data || []) : []
            if (sameOrderList.length > 0 && this.lockQuery.requiredLength) {
              this.$message.warning(`已找到同订单同料号支料，但长度与需求不一致（需求长度：${this.lockQuery.requiredLength}m）`)
              return
            }

            const rewindingRes = await queryOrderLockedStocks(
              this.lockQuery.materialCode || '',
              this.lockQuery.planDate || this.todayDate(),
              this.lockQuery.orderNo || '',
              this.lockQuery.rollCode || '',
              'REWINDING',
              null
            )
            const rewindingList = (rewindingRes && (rewindingRes.code === 200 || rewindingRes.code === 20000)) ? (rewindingRes.data || []) : []
            if (rewindingList.length > 0) {
              this.$message.warning('当前仅命中母卷，未命中可领支料，请先完成复卷入库并锁定支料')
              return
            }
          } catch (e) {
            // 诊断失败时走默认提示
          }
          this.$message.info('未找到该订单可领支料，请先锁定或入库支料')
          return
        }
        this.$message.info('当前查询条件下暂无可领料锁定记录')
        return
      }
      const lockIds = rows
        .map(x => Number(x.id))
        .filter(id => Number.isFinite(id) && id > 0)
      if (!lockIds.length) {
        this.$message.warning('没有有效的锁定记录ID，无法领料')
        return
      }
      try {
        const res = await createIssueOrder({
          lockIds,
          planDate: this.lockQuery.planDate || this.todayDate(),
          materialCode: this.lockQuery.materialCode || '',
          orderNo: this.lockQuery.orderNo || ''
        })
        if (res.code === 200 || res.code === 20000) {
          this.$message.success('领料成功，已生成领料单')
          this.buildIssueSheet(res.data || {})
          this.loadOrderLocks()
        } else {
          this.$message.error(res.msg || res.message || '领料失败')
        }
      } catch (e) {
        this.$message.error('领料失败')
      }
    },

    async batchAllocate() {
      if (this.isCoating) { this.$message.info('涂布原材料已自动锁定/请购，无需手动领料'); return }
      const pickIds = this.selected
        .filter(x => x.lockStatus === 'LOCKED' || x.lockStatus === '锁定中')
        .map(x => Number(x.id))
        .filter(id => Number.isFinite(id) && id > 0)
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
      if (this.isCoating) { this.$message.info('涂布原材料当前无需在此页面退料'); return }
      const returnIds = this.selected
        .filter(x => x.lockStatus === 'ALLOCATED' || x.lockStatus === 'PICKED' || x.lockStatus === '已领料')
        .map(x => Number(x.id))
        .filter(id => Number.isFinite(id) && id > 0)
      if (!returnIds.length) { this.$message.info('请勾选已领料的记录'); return }
      try {
        const res = await returnMaterials(returnIds)
        if (res.code === 200 || res.code === 20000) {
          this.$message.success('退料成功')
          this.loadOrderLocks()
        } else { this.$message.error(res.message || '退料失败') }
      } catch (e) { this.$message.error('退料失败') }
    },
    async handleActualStart(row, val) {
      await this.updateActualTimes(row, { actualStartTime: val, actualEndTime: row.actualEndTime })
    },
    async handleActualEnd(row, val) {
      await this.updateActualTimes(row, { actualStartTime: row.actualStartTime, actualEndTime: val })
    },
    async updateActualTimes(row, payload) {
      if (!row.id) return
      try {
        const res = await updateCoatingActualTimes(row.id, payload)
        if (res.code === 200 || res.code === 20000) {
          this.$message.success('已保存')
          this.loadTasks()
        } else {
          this.$message.error(res.message || '保存失败')
        }
      } catch (e) {
        this.$message.error('保存失败')
      }
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
.table-summary { display: flex; align-items: center; justify-content: space-between; color: #606266; font-weight: 600; }
.table-summary-actions { display: flex; align-items: center; gap: 8px; }
.query-scan-item {
  float: right;
  margin-left: 8px;
}
.query-second-row {
  display: block;
  width: 100%;
  margin-top: 2px;
}
.scan-mode-checkbox {
  margin-right: 8px;
}
.report-dialog-title-text {
  color: #303133;
  font-weight: 600;
}
.report-dialog-scan-text {
  color: #409EFF;
  font-weight: 600;
}
.taskno-switch { font-weight: 400; }
.section-head { margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between; }
.packing-preview-wrap { margin-bottom: 10px; }
.packing-preview-title { font-weight: 600; color: #606266; margin-bottom: 6px; }
.packing-preview-svg { border: 1px solid #dfe6f3; border-radius: 4px; background: #fff; }
.packing-preview-empty { color: #909399; font-size: 12px; margin: 6px 0; }
.packing-preview-meta { margin-top: 6px; color: #606266; font-size: 12px; }
.packing-preview-meta-danger { color: #F56C6C; font-weight: 600; }
.slitting-print-form .pair-field { margin-right: 14px; }
.slitting-digital-no-wrap { display: flex; align-items: center; }
.slitting-print-row { width: 100%; display: block; }
.slitting-required-wrap { display: flex; align-items: center; gap: 8px; }

.slitting-print-form .slitting-qr-template-item,
.slitting-print-form .slitting-qr-preview-item {
  margin-right: 8px;
}

.slitting-print-form .slitting-biz-type-item {
  width: 230px;
}
.slitting-print-form .slitting-qr-template-item {
  width: 630px;
}
.slitting-print-form .slitting-qr-preview-item {
  width: 630px;
  margin-left: 0;
  margin-top: 0;
}
.slitting-print-form .slitting-qr-action-item {
  margin-left: 0;
  margin-right: 0;
}

.slitting-qr-text {
  font-family: Consolas, 'Courier New', monospace;
}

::v-deep .slitting-qr-text .el-input__inner {
  background: #f8fafc;
  border-color: #dbe6f3;
}

::v-deep .slitting-qr-preview .el-input__inner {
  color: #303133;
}

::v-deep .slitting-print-dialog .el-dialog__body {
  padding-top: 8px;
  padding-bottom: 12px;
}

::v-deep .slitting-print-dialog .slitting-print-form .el-form-item {
  margin-bottom: 8px;
  margin-right: 10px;
}

.task-grid-wrap {
  width: 100%;
  overflow-x: hidden;
  border: 1px solid #dfe6ec;
}

.task-grid {
  width: 100%;
  min-width: 0;
  border-collapse: collapse;
  table-layout: fixed;
  background: #fff;
}

.task-grid th,
.task-grid td {
  border: 1px solid #dfe6ec;
  padding: 10px 10px;
  font-size: 14px;
  color: #606266;
  vertical-align: middle;
}

.task-grid th {
  background: #f8fafc;
  font-weight: 600;
  color: #6b7280;
  text-align: left;
  white-space: normal;
  line-height: 1.25;
}

.task-grid-sortable {
  cursor: pointer;
  user-select: none;
}

.task-grid-sortable:hover {
  color: #409EFF;
}

.task-grid-sortable.is-active {
  color: #409EFF;
}

.task-grid-sort-caret {
  margin-left: 4px;
  font-size: 12px;
  opacity: .9;
}

.task-grid-empty {
  text-align: center;
  color: #909399;
  padding: 24px 0;
}

.task-grid-center {
  text-align: center;
}

.task-grid-break {
  word-break: break-all;
  line-height: 1.3;
}

.task-grid-name {
  word-break: break-all;
  line-height: 1.35;
}

.task-grid-spec {
  text-align: center;
  line-height: 1.35;
  word-break: break-word;
}

.task-grid-actions {
  text-align: center;
  white-space: nowrap;
  word-break: keep-all;
}

.order-print-link {
  padding: 0;
  font-size: 13px;
  display: block;
  width: 100%;
  text-align: left;
  white-space: normal;
  word-break: break-all;
  line-height: 1.35;
}

.task-grid-order {
  vertical-align: top;
}

.task-grid-actions ::v-deep .el-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.task-grid-tight {
  padding-left: 4px !important;
  padding-right: 4px !important;
}

.task-grid-status ::v-deep .el-tag {
  padding: 0 6px;
}

::v-deep .task-op-btn.el-button--mini {
  padding: 3px 5px;
  margin: 0 1px;
  min-height: 24px;
  line-height: 1;
}

@media (max-width: 1366px) {
  .task-grid col {
    width: auto !important;
  }

  .task-grid th,
  .task-grid td {
    padding: 6px 4px;
    font-size: 12px;
    line-height: 1.25;
    word-break: break-all;
  }

  .task-grid-actions {
    white-space: normal;
    word-break: break-word;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 2px;
  }

  ::v-deep .task-op-btn.el-button--mini {
    padding: 2px 3px;
    margin: 0;
    font-size: 11px;
    min-height: 18px;
    max-width: 62px;
  }
}

@media (min-width: 1600px) {
  .task-grid th,
  .task-grid td {
    padding: 10px 12px;
  }
}

</style>
