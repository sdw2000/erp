<template>
  <div class="app-container">
    <el-card shadow="never" class="mb-10">
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

    <el-card shadow="never">
      <div class="mb-10 table-summary">
        <span>
          物料代码 {{ taskMaterialCodeCount }} 个，当班生产报工总平米数 {{ formatAreaNum(taskTotalArea) }}m²；
          {{ currentWorkGroup }}班本月生产总平米数 {{ formatAreaNum(shiftProductionSummary.monthArea) }}m²，
          当年总平米数 {{ formatAreaNum(shiftProductionSummary.yearArea) }}m²
        </span>
        <div class="table-summary-actions">
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
              <th v-if="showTaskNo">任务号</th>
              <th v-if="orderNoVisible">订单号</th>
              <th v-if="!fixedType">类型</th>
              <th>料号</th>
              <th v-if="showMaterialName">品名</th>
              <th v-if="isCoating">颜色</th>
              <th v-if="isCoating">厚度(μm)</th>
              <th v-if="isCoating">宽度(mm)</th>
              <th v-if="isCoating">长度(米)</th>
              <th v-if="isRewinding || isSlitting">规格</th>
              <th v-if="isRewinding">复卷数量</th>
              <th v-if="isSlitting" class="task-grid-center">分切数量</th>
              <th class="task-grid-center">设备</th>
              <th>计划时间</th>
              <th class="task-grid-center">计划耗时</th>
              <th class="task-grid-center">状态</th>
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
                <el-button class="task-op-btn" size="mini" type="success" plain @click="openLabelPrintDialog(row)">标签打印</el-button>
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
      width="860px"
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
          <el-input :value="formatAreaNum(calcProducedRollsArea())" size="small" style="width: 140px" disabled />
        </el-form-item>
        <el-form-item v-else :label="reportForm.processType === 'SLITTING' ? '生产卷数' : '生产数量'">
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
        <el-form-item v-if="reportForm.processType === 'SLITTING'" label="批次号">
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
        <el-table-column label="宽度(mm)" width="120" align="right">
          <template slot-scope="scope">
            <el-input-number v-model="scope.row.widthMm" :min="0" :step="1" :precision="2" size="mini" controls-position="right" />
          </template>
        </el-table-column>
        <el-table-column label="长度(m)" width="120" align="right">
          <template slot-scope="scope">
            <el-input-number v-model="scope.row.lengthM" :min="0" :step="1" :precision="2" size="mini" controls-position="right" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" align="center">
          <template slot-scope="scope">
            <el-button type="text" size="mini" @click="removeProducedRoll(scope.$index)">删除</el-button>
            <el-button v-if="isLabelPrintMode" type="text" size="mini" @click="printRollLabel(scope.row, scope.$index)">打印标签</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-button v-if="reportForm.processType === 'COATING'" size="mini" icon="el-icon-plus" class="mb-10" @click="addProducedRoll">新增母卷</el-button>

      <div v-if="isLabelPrintMode && reportForm.processType === 'REWINDING'" class="section-head">
        <span style="font-weight: 600;">复卷标签</span>
        <div>
          <el-button size="mini" type="primary" plain icon="el-icon-printer" @click="printRewindingLabel">打印标签</el-button>
        </div>
      </div>
      <el-form v-if="isLabelPrintMode && reportForm.processType === 'REWINDING'" :inline="true" label-width="110px" class="mb-10">
        <el-form-item label="母卷号">
          <el-input
            v-model="reportForm.rewindingMotherRollCode"
            size="small"
            clearable
            placeholder="可扫码输入母卷号"
            style="width: 220px"
          />
        </el-form-item>
        <el-form-item label="序列起始号">
          <el-input-number v-model="reportForm.rewindingSerialStart" size="small" :min="1" :step="1" controls-position="right" style="width: 140px" />
        </el-form-item>
        <el-form-item label="打印个数">
          <el-input-number v-model="reportForm.rewindingPrintCount" size="small" :min="1" :step="1" controls-position="right" style="width: 140px" />
        </el-form-item>
      </el-form>

      <div v-if="isLabelPrintMode && reportForm.processType === 'SLITTING'" class="section-head">
        <span style="font-weight: 600;">分切标签打印</span>
        <div />
      </div>
      <el-form v-if="isLabelPrintMode && reportForm.processType === 'SLITTING'" :inline="true" label-width="110px" class="mb-10 slitting-print-form">
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
        <el-form-item label="纸箱规格">
          <el-select
            v-model="reportForm.cartonPreset"
            size="small"
            style="width: 180px"
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
          <el-input :value="calcSlittingTapeOuterDiameterText(reportForm || {})" size="small" disabled style="width: 160px" />
        </el-form-item>
        <el-form-item label="内标张数">
          <el-input-number
            v-model="reportForm.slittingInnerPrintCount"
            :min="0"
            :step="1"
            :precision="0"
            size="small"
            controls-position="right"
            style="width: 140px"
          />
        </el-form-item>
        <el-form-item label="外标张数">
          <el-input-number
            v-model="reportForm.slittingOuterPrintCount"
            :min="0"
            :step="1"
            :precision="0"
            size="small"
            controls-position="right"
            style="width: 140px"
          />
        </el-form-item>
        <el-form-item label="本箱重量(kg)">
          <el-input-number
            v-model="reportForm.boxWeightKg"
            :min="0"
            :step="0.01"
            :precision="2"
            size="small"
            controls-position="right"
            style="width: 140px"
          />
        </el-form-item>
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
          <el-input v-model="reportForm.deliveryNoteNo" size="small" style="width: 160px" placeholder="如 DH-20260416-001" />
        </el-form-item>
        <el-form-item label="保质期(天)">
          <el-input-number
            v-model="reportForm.shelfLifeDays"
            :min="0"
            :step="1"
            :precision="0"
            size="small"
            controls-position="right"
            style="width: 140px"
          />
        </el-form-item>
        <el-form-item label="二维码模板">
          <el-input
            v-model="reportForm.qrTemplate"
            size="small"
            style="width: 420px"
            :placeholder="'支持 {{field}} 或 {field}，例如 {{orderNo}}|{{batchNo}}|{{boxRollCount}}'"
          />
        </el-form-item>
        <el-form-item>
          <el-button
            size="mini"
            type="success"
            plain
            :loading="qrRuleSaving"
            @click="saveCurrentCustomerQrRule"
          >保存当前客户二维码规则</el-button>
        </el-form-item>
        <el-form-item label="二维码预览">
          <el-input :value="buildSlittingQrPreview()" size="small" readonly style="width: 420px" />
        </el-form-item>
        <el-form-item>
          <el-select
            v-model="reportForm.slittingCoreLabelBizType"
            size="mini"
            style="width: 180px; margin-right: 8px"
            :disabled="!isLabelPrintMode || reportForm.processType !== 'SLITTING'"
            placeholder="请选择卷芯标签类型"
          >
            <el-option label="普通管芯标签" value="SLITTING_CORE_LABEL" />
            <el-option label="窄管芯标签" value="SLITTING_CORE_LABEL_NARROW" />
          </el-select>
          <el-button size="mini" type="primary" plain icon="el-icon-printer" @click="printSlittingLabel('slitting-core-label')">打印卷芯标签</el-button>
          <el-button size="mini" type="primary" plain icon="el-icon-printer" @click="printSlittingLabel('slitting-inner-label')">打印内标签</el-button>
          <el-button size="mini" type="primary" plain icon="el-icon-printer" @click="printSlittingLabel('slitting-outer-label')">打印外标签</el-button>
          <el-button size="mini" type="primary" plain icon="el-icon-printer" @click="printSlittingLabel('slitting-pallet-label')">打印栈板标签</el-button>
        </el-form-item>
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
        <div class="packing-preview-meta">
          直径取整：{{ slittingPackingPreview.diameterRoundedMm || 0 }}mm，预览可放：{{ slittingPackingPreview.count || 0 }} 筒
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
        <el-table-column label="操作" width="120" align="center">
          <template slot-scope="scope">
            <el-button type="text" size="mini" @click="editHistoryReport(scope.row)">修改</el-button>
            <el-button type="text" size="mini" style="color:#F56C6C" @click="removeHistoryReport(scope.row)">删除</el-button>
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="160" show-overflow-tooltip />
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
  </div>
</template>

<script>
import request from '@/utils/request'
import { getProductionTasks } from '@/api/productionManagement'
import { getStagePlanTaskPage } from '@/api/schedulePlan'
import { getShiftProductionSummary } from '@/api/schedule'
import { getCoatingSchedules, getPendingOrders, reportWork, getReportWorkList, getLatestScheduleId, getNextCoatingRollCode, updateReportWork, deleteReportWork } from '@/api/manualSchedule'
import { queryOrderLockedStocks, allocateMaterials, returnMaterials, createIssueOrder } from '@/api/scheduleMaterial'
import { queryCoatingChemicalLocks, confirmCoatingChemicalIssue } from '@/api/chemicalRequisition'
import { matchCustomerMaterialMapping } from '@/api/customerMaterialMapping'
import { updateCoatingActualTimes } from '@/api/productionManagement'
import { getCartonSpecList } from '@/api/rdCartonSpec'
import { getSpecByMaterialCode } from '@/api/tapeSpec'
import { getOrderDetailForProduction, resolveOrderItemByDetailId } from '@/api/sales'
import { getCustomerLabelQrRule, saveCustomerLabelQrRule } from '@/api/labelQrRule'
import { getBarTenderConfig, printByScene, sendBarTenderPrint, goToPrintConfig } from '@/utils/printService'
import QRCode from 'qrcode'

export default {
  name: 'ProductionTasks',
  props: { fixedType: { type: String, default: '' }},
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
        materialCode: '',
        materialName: '',
        batchNo: '',
        batchNoRequired: true,
        thickness: '',
        widthMm: null,
        lengthM: null,
        rewindingSpec: '',
        rewindingMotherRollCode: '',
        rewindingSerialStart: 1,
        rewindingPrintCount: 1,
        coreOuterDiameterMm: 87.5,
        cartonPreset: '',
        cartonLengthMm: 0,
        cartonWidthMm: 0,
        cartonHeightMm: 0,
        slittingRollPerTube: 1,
        slittingTubePerBoxCount: 0,
        slittingTubeRollCount: 0,
        slittingCoreLabelBizType: 'SLITTING_CORE_LABEL',
        slittingInnerPrintCount: 0,
        slittingOuterPrintCount: 0,
        boxWeightKg: null,
        labelProductionDate: '',
        labelShipDate: '',
        deliveryNoteNo: '',
        shelfLifeDays: 365,
        qrTemplate: '',
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
      deliveryNoticeNoCache: {},
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
        diameterRoundedMm: 0
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
    isLabelPrintMode() { return this.reportDialogMode === 'print' },
    isPlanMode() { return ['coating', 'rewinding', 'slitting'].includes((this.fixedType || '').toLowerCase()) },
    orderNoVisible() { return !this.isCoating || this.showOrderNo },
    hasRealtimeKeywordFilter() {
      return !!(this.normalizeKeywordText(this.query.materialCodeKeyword) || this.normalizeKeywordText(this.query.specKeyword))
    },
    liveFilteredList() {
      const source = Array.isArray(this.list) ? this.list : []
      if (!source.length) return []
      return this.applyTaskKeywordFilters(source, {
        ft: (this.fixedType || this.query.type || '').toLowerCase(),
        materialCodeKeyword: this.query.materialCodeKeyword,
        specKeyword: this.query.specKeyword
      })
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
    fixedType(val) { this.query.type = val || ''; this.loadTasks() },
    reportDialogVisible(val) {
      if (!val) {
        this.focusDetailQrScanInput()
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
    this.loadBarTenderConfig()
    this.lockQuery.planDate = this.todayDate()
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
      return list.length
        ? list[0]
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
      return {
        ...(payload || {}),
        materialCode,
        materialName,
        ...(customerSpec ? { spec: customerSpec } : {}),
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
            const thickness = String((this.reportForm && this.reportForm.thickness) || '').trim()
            const spec = `${thickness || ''}*${Number.isFinite(width) ? width : ''}*${Number.isFinite(length) ? length : ''}`
            const printTime = this.toDateTimeString(new Date())
            const labelOrderNo = this.resolveLabelOrderNo(this.reportForm)

            const payload = {
              rollCode,
              qty: 1,
              spec,
              widthMm: Number.isFinite(width) ? width : 0,
              lengthM: Number.isFinite(length) ? length : 0,
              areaM2: Number(this.formatAreaNum(area)),
              scheduleId: this.reportForm.scheduleId || '',
              orderNo: labelOrderNo,
              internalOrderNo: this.reportForm.orderNo || '',
              customerOrderNo: this.reportForm.customerOrderNo || '',
              qrText: rollCode,
              printDate: String(printTime || '').slice(0, 10),
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
            const spec = this.resolveRewindingSpecText()
            const printTime = this.toDateTimeString(new Date())
            const serialNo = Number(source && source.serialNo)
            const rollSerialCode = this.buildRewindingRollSerialCode(serialNo)
            const productionDate = String((this.reportForm && this.reportForm.startTime) || printTime || '').slice(0, 10)
            const labelOrderNo = this.resolveLabelOrderNo(this.reportForm)

            const payload = {
              spec,
              rollCode: rollSerialCode,
              rollSerialCode,
              serialNo: Number.isFinite(serialNo) ? serialNo : Number(this.reportForm.rewindingSerialStart || 1),
              productionDate,
              printDate: productionDate,
              scheduleId: this.reportForm.scheduleId || '',
              orderNo: labelOrderNo,
              internalOrderNo: this.reportForm.orderNo || '',
              customerOrderNo: this.reportForm.customerOrderNo || '',
              processType: 'REWINDING',
              operator: this.reportForm.operator || '-',
              printTime
            }
            return this.applyMaterialAlias(payload, runtime.alias, materialCode, materialName)
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
            const perBoxRolls = (tubeRollCount > 0 && tubePerBoxCount > 0) ? (tubeRollCount * tubePerBoxCount) : 0
            const isOuterLabel = sceneType === 'slitting-outer-label'
            const quantityUnit = isOuterLabel ? '卷/箱' : '卷/筒'
            const currentBoxRollCount = isOuterLabel ? quantityPerLabel : perBoxRolls
            const coreOuterDiameterMm = Number((this.reportForm && this.reportForm.coreOuterDiameterMm) || 0)
            const tapeOuterDiameterMm = this.calcSlittingTapeOuterDiameterMm(this.reportForm || {})
            const batchNo = String((this.reportForm && this.reportForm.batchNo) || '').trim()
            const productionDateText = this.toDateString(String((this.reportForm && this.reportForm.labelProductionDate) || '').trim() || this.toDateString((this.reportForm && this.reportForm.startTime) || printTime))
            const shipDateText = this.toDateString(String((this.reportForm && this.reportForm.labelShipDate) || '').trim() || this.resolveDateTextFromRow(this.reportForm || {}))
            const productionDate = this.toCompactDateStringStrict(productionDateText)
            const shipDate = this.toCompactDateStringStrict(shipDateText)
            const deliveryNoteNo = String((this.reportForm && this.reportForm.deliveryNoteNo) || '').trim()
            const shelfLifeDays = Math.max(0, Math.trunc(Number((this.reportForm && this.reportForm.shelfLifeDays) || 0) || 0))
            const expiryDate = this.calcExpiryDate(productionDate, shelfLifeDays)
            const boxWeightKg = Number((this.reportForm && this.reportForm.boxWeightKg) || 0)
            const boxWeightValue = Number.isFinite(boxWeightKg) && boxWeightKg > 0 ? Number(boxWeightKg.toFixed(2)) : null
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
              issueBatchNo: batchNo,
              slittingBatchNo: batchNo,
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
              productionDate: productionDate,
              productionDateText,
              productionDateCompact: productionDate,
              production_date: productionDate,
              prodDate: productionDate,
              prodDateText: productionDateText,
              shengchanriqi: productionDate,
              shengchanriqiText: productionDateText,
              shipDate: shipDate,
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
              expiryDate,
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
              serialNo: Number.isFinite(serialNo) ? serialNo : 1,
              labelCode: `${sceneMeta.bizType}-${Number.isFinite(serialNo) ? serialNo : 1}`,
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
      return this.formatRewindingSpec(this.reportForm || {})
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
      const motherRollCode = String((this.reportForm && this.reportForm.rewindingMotherRollCode) || '').trim()
      const start = Number((this.reportForm && this.reportForm.rewindingSerialStart) || 1)
      const serial = Number.isFinite(Number(serialNo)) ? Number(serialNo) : start
      const serialWidth = Math.max(1, String(Math.trunc(start)).length)
      const serialText = String(Math.trunc(serial)).padStart(serialWidth, '0')
      if (motherRollCode && serialText) return `${motherRollCode}-${serialText}`
      return motherRollCode || serialText || ''
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
      const days = Math.max(0, Math.trunc(Number(shelfLifeDays || 0) || 0))
      if (!base || !(days > 0)) return ''
      let d = null
      if (/^\d{8}$/.test(base)) {
        d = new Date(`${base.slice(0, 4)}-${base.slice(4, 6)}-${base.slice(6, 8)}`)
      } else {
        d = new Date(base)
      }
      if (!d || Number.isNaN(d.getTime())) return ''
      d.setDate(d.getDate() + days)
      return this.toCompactDateString(d)
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
      const productionDateText = this.toDateString(String(form.labelProductionDate || '').trim() || this.toDateString(form.startTime))
      const shipDateText = this.toDateString(String(form.labelShipDate || '').trim())
      const productionDate = this.toCompactDateStringStrict(productionDateText)
      const shipDate = this.toCompactDateStringStrict(shipDateText)
      const shelfLifeDays = Math.max(0, Math.trunc(Number(form.shelfLifeDays || 0) || 0))
      const expiryDate = this.calcExpiryDate(productionDate, shelfLifeDays)
      const grossWeightKg = Number(form.boxWeightKg || 0)
      const grossWeightValue = Number.isFinite(grossWeightKg) && grossWeightKg > 0 ? Number(grossWeightKg.toFixed(2)) : ''
      const qtyOrWeight = this.resolveQtyOrWeightText({
        grossWeightKg: grossWeightValue,
        boxRollCount,
        quantityUnit: '卷/箱'
      })
      const shelfLifeText = shelfLifeDays > 0 ? String(shelfLifeDays) : ''
      return this.buildDynamicQrContent(form.qrTemplate, {
        orderNo,
        customerOrderNo,
        deliveryNoteNo,
        batchNo,
        materialCode,
        boxRollCount,
        currentBoxRollCount: boxRollCount,
        slittingQty: boxRollCount,
        grossWeightKg: grossWeightValue,
        boxWeightKg: grossWeightValue,
        qtyOrWeight,
        productionDate,
        productionDateText,
        productionDateCompact: productionDate,
        production_date: productionDate,
        prodDate: productionDate,
        prodDateText: productionDateText,
        shipDate,
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
        remark: String(form.remark || '').trim()
      })
    },
    async loadCustomerQrRuleForSlitting(customerCode, bizType = 'SLITTING_OUTER_LABEL') {
      const code = String(customerCode || '').trim()
      if (!code) return
      try {
        const res = await getCustomerLabelQrRule(code, bizType)
        if (res && (res.code === 200 || res.code === 20000) && res.data && res.data.qrTemplate) {
          this.reportForm.qrTemplate = String(res.data.qrTemplate || '').trim() || this.getDefaultSlittingQrTemplate()
        }
      } catch (e) {
        // 忽略加载失败，保持本地默认模板
      }
    },
    async saveCurrentCustomerQrRule(bizType = 'SLITTING_OUTER_LABEL', silent = false) {
      const form = this.reportForm || {}
      const customerCode = String(form.customerCode || '').trim()
      if (!customerCode) {
        if (!silent) this.$message.warning('客户代码为空，无法保存二维码规则')
        return false
      }
      const qrTemplate = String(form.qrTemplate || '').trim() || this.getDefaultSlittingQrTemplate()
      this.qrRuleSaving = true
      try {
        const res = await saveCustomerLabelQrRule({
          customerCode,
          bizType,
          qrTemplate,
          enabled: 1
        })
        if (res && (res.code === 200 || res.code === 20000)) {
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
      if (sceneType !== 'slitting-outer-label') return
      await this.saveCurrentCustomerQrRule('SLITTING_OUTER_LABEL', true)
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
      const width = Number(roll.widthMm || 0)
      const length = Number(roll.lengthM || 0)
      const area = this.calcRollArea(width, length)
      const spec = `${Number.isFinite(width) ? width : '-'} * ${Number.isFinite(length) ? length : '-'}`
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
        { label: '母卷号', value: rollCode },
        { label: '订单号', value: this.composeOrderNoDisplay(this.reportForm.orderNo, this.reportForm.customerOrderNo) },
        { label: '客户订单号', value: this.reportForm.customerOrderNo || '-' },
        { label: '物料代码', value: (alias && alias.customerMaterialCode) || materialCode || '-' },
        { label: '物料名称', value: (alias && alias.customerMaterialName) || materialName || '-' },
        { label: '客户规格', value: (alias && alias.customerSpec) || spec || '-' },
        { label: '规格(mm*m)', value: `${Number.isFinite(width) ? width : '-'} * ${Number.isFinite(length) ? length : '-'}` },
        { label: '面积(m²)', value: this.formatAreaNum(area) }
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
      const motherRollCode = String((this.reportForm && this.reportForm.rewindingMotherRollCode) || '').trim()
      const startNo = Number((this.reportForm && this.reportForm.rewindingSerialStart) || 1)
      const printCount = Number((this.reportForm && this.reportForm.rewindingPrintCount) || 1)

      if (!motherRollCode) {
        this.$message.warning('请先填写母卷号（可扫码）后再打印标签')
        return
      }
      if (!Number.isFinite(startNo) || startNo < 1) {
        this.$message.warning('序列起始号必须大于0')
        return
      }
      if (!Number.isFinite(printCount) || printCount < 1) {
        this.$message.warning('打印个数必须大于0')
        return
      }

      const materialCode = String((this.reportForm && this.reportForm.materialCode) || '').trim()
      const width = Number((this.reportForm && this.reportForm.widthMm) || 0)
      const length = Number((this.reportForm && this.reportForm.lengthM) || 0)
      const alias = await this.resolveCustomerMaterialAliasForPrint({
        customerCode: this.reportForm.customerCode,
        materialCode,
        customerOrderNo: this.reportForm.customerOrderNo,
        thickness: this.reportForm.thickness,
        width,
        length
      })
      const materialName = this.resolveMaterialNameByCode(materialCode)
      const ok = await this.confirmPrintPreview('复卷标签', [
        { label: '母卷号', value: motherRollCode },
        { label: '订单号', value: this.composeOrderNoDisplay(this.reportForm.orderNo, this.reportForm.customerOrderNo) },
        { label: '客户订单号', value: this.reportForm.customerOrderNo || '-' },
        { label: '物料代码', value: (alias && alias.customerMaterialCode) || materialCode || '-' },
        { label: '物料名称', value: (alias && alias.customerMaterialName) || materialName || '-' },
        { label: '客户规格', value: (alias && alias.customerSpec) || this.resolveRewindingSpecText() || '-' },
        { label: '规格', value: this.resolveRewindingSpecText() || '-' },
        { label: '起始序号', value: startNo },
        { label: '打印张数', value: printCount }
      ])
      if (!ok) return

      try {
        this.loadBarTenderConfig()
        for (let i = 0; i < printCount; i++) {
          const serialNo = Math.trunc(startNo) + i
          await printByScene(this.getPrintScene('rewinding-label'), { serialNo }, {
            config: this.barTenderConfig,
            vm: this,
            alias
          })
        }
        this.$message.success(`已提交BarTender打印任务（复卷标签）${printCount}张`)
      } catch (e) {
        const msg = (e && e.message) || '未知错误'
        this.$message.error(`BarTender打印失败：${msg}`)
      }
    },
    async printSlittingLabel(sceneType) {
      const validScenes = ['slitting-core-label', 'slitting-inner-label', 'slitting-outer-label', 'slitting-pallet-label']
      if (!validScenes.includes(sceneType)) return

      this.commitSlittingBatchNoInput()
      const batchNoRequired = !!(this.reportForm && this.reportForm.batchNoRequired)
      const batchNo = String((this.reportForm && this.reportForm.batchNo) || '').trim()
      if (batchNoRequired && !batchNo) {
        this.$message.warning('批次号已设置为必填，请先选择或填写批次号后再打印')
        return
      }

      const defaultRollPerTube = this.calcSlittingDefaultRollPerTube(this.reportForm && this.reportForm.widthMm)
      const producedQty = Math.max(1, Math.trunc(Number((this.reportForm && this.reportForm.producedQty) || 0) || 0))
      const rollPerTube = Math.max(1, Math.trunc(Number((this.reportForm && this.reportForm.slittingRollPerTube) || 0) || defaultRollPerTube))
      const tubeRollCount = rollPerTube
      const tubePerBoxCount = Math.max(0, Math.trunc(Number((this.reportForm && this.reportForm.slittingTubePerBoxCount) || 0) || 0))
      const innerPrintCount = Math.max(0, Math.trunc(Number((this.reportForm && this.reportForm.slittingInnerPrintCount) || 0) || 0))
      const outerPrintCount = Math.max(0, Math.trunc(Number((this.reportForm && this.reportForm.slittingOuterPrintCount) || 0) || 0))
      const defaultPrintCount = producedQty
      const printCount = sceneType === 'slitting-inner-label'
        ? innerPrintCount
        : sceneType === 'slitting-outer-label'
          ? outerPrintCount
          : defaultPrintCount

      if (!(printCount > 0)) {
        this.$message.warning(sceneType === 'slitting-inner-label' ? '请先填写内标张数后再打印' : (sceneType === 'slitting-outer-label' ? '请先填写外标张数后再打印' : '打印张数必须大于0'))
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
      const productionDate = this.toCompactDateStringStrict(String((this.reportForm && this.reportForm.labelProductionDate) || '').trim() || this.toDateString((this.reportForm && this.reportForm.startTime) || new Date())) || '-'
      const shipDate = this.toCompactDateStringStrict(String((this.reportForm && this.reportForm.labelShipDate) || '').trim()) || '-'
      const deliveryNoteNo = String((this.reportForm && this.reportForm.deliveryNoteNo) || '').trim() || '-'
      const shelfLifeDays = Math.max(0, Math.trunc(Number((this.reportForm && this.reportForm.shelfLifeDays) || 0) || 0))
      const expiryDate = this.calcExpiryDate(productionDate, shelfLifeDays) || '-'
      const boxWeightKg = Number((this.reportForm && this.reportForm.boxWeightKg) || 0)
      const boxWeightText = Number.isFinite(boxWeightKg) && boxWeightKg > 0 ? `${Number(boxWeightKg.toFixed(2))}kg` : '-'
      const ok = await this.confirmPrintPreview(labelName, [
        { label: '订单号', value: this.composeOrderNoDisplay(this.reportForm.orderNo, this.reportForm.customerOrderNo), field: 'orderNo | orderNoDisplay' },
        { label: '客户订单号', value: this.reportForm.customerOrderNo || '-', field: 'customerOrderNo' },
        { label: '任务号', value: this.reportForm.taskNo || '-', field: 'taskNo' },
        { label: '批次号', value: this.reportForm.batchNo || '-', field: 'batchNo | issueBatchNo | slittingBatchNo' },
        { label: '物料代码', value: (alias && alias.customerMaterialCode) || materialCode || '-', field: 'materialCode' },
        { label: '物料名称', value: (alias && alias.customerMaterialName) || materialName || '-', field: 'materialName | productName' },
        { label: '客户规格', value: (alias && alias.customerSpec) || this.formatSlittingSpec(this.reportForm || {}) || '-', field: 'customerSpec | customerSpecText | spec' },
        { label: '卷/筒', value: tubeRollCount, field: 'rollPerTube | tubeRollCount | quantityPerLabel | quantityText' },
        { label: '本箱卷数', value: (quantities && quantities.length) ? quantities.join(' / ') : '-', field: 'boxRollCount | currentBoxRollCount | cartonRollCount | rollsPerBox | rollsInBox | slittingQty' },
        { label: '满箱卷数', value: standardBoxRollCount || '-', field: 'standardBoxRollCount | boxRollCountCapacity' },
        { label: '生产日期', value: productionDate || '-', field: 'productionDate | shengchanriqi | printDate' },
        { label: '出货日期', value: shipDate, field: 'shipDate | deliveryDate | chuhuoriqi' },
        { label: '送货单号', value: deliveryNoteNo, field: 'deliveryNoteNo' },
        { label: '本箱重量', value: boxWeightText, field: 'grossWeightKg | boxWeightKg | currentBoxWeightKg | netWeightKg | boxWeightText' },
        { label: '保质期(天)', value: shelfLifeDays || '-', field: 'shelfLifeDays' },
        { label: '保质期至', value: expiryDate, field: 'expiryDate' },
        { label: '备注', value: String((this.reportForm && this.reportForm.remark) || '').trim() || '-', field: 'remark' },
        { label: '二维码内容', value: this.buildSlittingQrPreview(alias) || '-', field: 'qrContent | qrCode' },
        { label: '每张卷数序列', value: (quantities && quantities.length) ? quantities.join(' / ') : '-', field: 'quantityOverride -> quantityPerLabel' },
        { label: '提交批次', value: `${mergedItems.length} 次请求（共 ${printCount} 张）`, field: '同值合并提交(copies)' },
        { label: '筒/箱', value: tubePerBoxCount, field: 'tubePerBoxCount' },
        { label: '内标张数', value: innerPrintCount, field: '前端计算值(不入payload)' },
        { label: '外标张数', value: outerPrintCount, field: '前端计算值(不入payload)' },
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
        const jobs = []
        for (let i = 0; i < mergedItems.length; i++) {
          const item = mergedItems[i]
          const serialNo = Number(item && item.serialNo) || (i + 1)
          const quantityOverride = Number(item && item.quantityOverride) || 1
          const copies = Math.max(1, Math.trunc(Number(item && item.copies) || 1))
          jobs.push(() => printByScene(scene, {
            serialNo,
            quantityOverride,
            copies
          }, {
            config: this.barTenderConfig,
            vm: this,
            alias
          }))
        }
        const batchSize = this.getAdaptivePrintBatchSize(mergedItems.length)
        await this.runPrintJobsInBatches(jobs, batchSize)
        this.$message.success(`已提交BarTender打印任务（${labelName}）${printCount}张`)
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
        this.$message.error((res && res.msg) || '保存送货单批次号失败，已取消打印')
        return false
      } catch (e) {
        const status = e && e.response ? Number(e.response.status) : 0
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
        this.$message.error(`保存送货单批次号失败，已取消打印：${msg}`)
        return false
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
    updateSlittingPackingPreview(packingResult) {
      const result = packingResult || {}
      const boxW = Number(result.boxWidthMm || 0)
      const boxH = Number(result.boxHeightMm || 0)
      const circles = Array.isArray(result.circles) ? result.circles : []
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
          count: Number(result.count || 0),
          diameterRoundedMm: Number(result.diameterRoundedMm || 0)
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
        circles: circles.map(p => ({
          cx: padding + Number(p.x || 0) * scale,
          cy: padding + Number(p.y || 0) * scale,
          r: radiusPx
        })),
        count: Number(result.count || 0),
        diameterRoundedMm: Number(result.diameterRoundedMm || 0)
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
      if (sceneType === 'slitting-inner-label' || sceneType === 'slitting-core-label') {
        unitQty = perTube > 0 ? perTube : 1
      } else if (sceneType === 'slitting-outer-label') {
        const perBoxRolls = perTube * perBoxTube
        unitQty = perBoxRolls > 0 ? perBoxRolls : (perTube > 0 ? perTube : 1)
      } else {
        unitQty = perTube > 0 ? perTube : 1
      }

      if (!(unitQty > 0) || !(qty > 0)) {
        return Array.from({ length: count }, () => 1)
      }

      const remainder = qty % unitQty
      return Array.from({ length: count }, (_, idx) => {
        if (idx === count - 1 && remainder > 0) return remainder
        return unitQty
      })
    },
    buildMergedSlittingPrintItems(quantities = []) {
      const list = Array.isArray(quantities) ? quantities : []
      if (!list.length) return []
      const result = []
      let startSerial = 1
      let currentQty = Math.max(1, Math.trunc(Number(list[0]) || 1))
      let copies = 1
      for (let i = 1; i < list.length; i++) {
        const qty = Math.max(1, Math.trunc(Number(list[i]) || 1))
        if (qty === currentQty) {
          copies += 1
          continue
        }
        result.push({ serialNo: startSerial, quantityOverride: currentQty, copies })
        startSerial = i + 1
        currentQty = qty
        copies = 1
      }
      result.push({ serialNo: startSerial, quantityOverride: currentQty, copies })
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
      this.updateSlittingPackingPreview(packingResult)

      const innerCount = this.calcSlittingInnerLabelCount(producedQty, tubeRollCount)
      const outerCount = this.calcSlittingOuterLabelCount(producedQty, tubeRollCount, this.reportForm.slittingTubePerBoxCount)
      this.reportForm.slittingInnerPrintCount = innerCount
      this.reportForm.slittingOuterPrintCount = outerCount
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
            : row.output_sqm != null ? row.output_sqm
              : row.outputSqm
      )) || 0)
      if (Number.isFinite(reportAreaDirect) && reportAreaDirect > 0) {
        return Number(reportAreaDirect.toFixed(2))
      }

      const reportedQty = this.extractReportedQty(row)
      if (!(reportedQty > 0)) return 0

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

      const size = Math.max(1, Math.min(expectedTotal, 200000))
      let res
      if (ft === 'coating') {
        res = await getCoatingSchedules({
          current: 1,
          size,
          planDateStart: this.query.dateRange && this.query.dateRange.length ? this.query.dateRange[0] : undefined,
          planDateEnd: this.query.dateRange && this.query.dateRange.length ? this.query.dateRange[1] : undefined,
          status: this.query.status || undefined
        })
      } else if (['rewinding', 'slitting'].includes(ft)) {
        const stageMap = { coating: 'COATING', rewinding: 'REWINDING', slitting: 'SLITTING' }
        res = await getStagePlanTaskPage({
          stage: stageMap[ft],
          pageNum: 1,
          pageSize: size,
          status: this.query.status || undefined,
          planDateStart: this.query.dateRange && this.query.dateRange.length ? this.query.dateRange[0] : undefined,
          planDateEnd: this.query.dateRange && this.query.dateRange.length ? this.query.dateRange[1] : undefined
        })
      } else {
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
        let producedRolls = []
        if (processType === 'COATING') {
          const rollCode = await this.generateNextRollCode(scheduleId, now)
          producedRolls = [this.newProducedRoll(rollCode)]
        }
        this.reportForm = {
          scheduleId,
          orderDetailId: Number.isFinite(orderDetailId) && orderDetailId > 0 ? orderDetailId : null,
          processType,
          taskNo: row.taskNo || row.task_no || '',
          orderNo: normalizedOrderNo || rawOrderNo,
          customerOrderNo: customerOrderNo || row.customerOrderNo || row.customer_order_no || row.customerOrderNumber || '',
          materialCode,
          materialName: row.materialName || row.material_name || row.productName || row.product_name || row.name || '',
          customerCode: customerCode || '',
          batchNo: '',
          batchNoRequired: true,
          thickness: row.thickness || row.totalThickness || row.total_thickness || row.order_thickness || row.orderThickness || '',
          widthMm,
          lengthM: Number(row.length || row.lengthM || row.order_length || row.orderLength || row.processLength || row.process_length || 0) || null,
          rewindingSpec: processType === 'REWINDING' ? this.resolveRewindingTaskSpec(row) : '',
          rewindingMotherRollCode: '',
          rewindingSerialStart: 1,
          rewindingPrintCount: Math.max(1, Math.round(defaultQty || planQty || 1)),
          coreOuterDiameterMm: Number(row.coreOuterDiameterMm || row.core_outer_diameter || row.coreDiameter || 87.5) || 87.5,
          cartonPreset: processType === 'SLITTING' ? String(defaultCarton.value || '') : '',
          cartonLengthMm: processType === 'SLITTING' ? Number(defaultCarton.lengthMm || 0) : 0,
          cartonWidthMm: processType === 'SLITTING' ? Number(defaultCarton.widthMm || 0) : 0,
          cartonHeightMm: processType === 'SLITTING' ? Number(defaultCarton.heightMm || 0) : 0,
          slittingRollPerTube: defaultSlittingCount,
          slittingTubePerBoxCount: 0,
          slittingTubeRollCount: defaultTubeRollCount,
          slittingCoreLabelBizType: 'SLITTING_CORE_LABEL',
          slittingInnerPrintCount: defaultInnerPrintCount,
          slittingOuterPrintCount: defaultInnerPrintCount,
          boxWeightKg: processType === 'SLITTING' && Number.isFinite(boxWeightKg) && boxWeightKg > 0 ? Number(boxWeightKg.toFixed(2)) : null,
          labelProductionDate: processType === 'SLITTING' ? productionDate : '',
          labelShipDate: processType === 'SLITTING' ? shipDate : '',
          deliveryNoteNo: processType === 'SLITTING' ? deliveryNoteNo : '',
          shelfLifeDays: processType === 'SLITTING' ? shelfLifeDays : 365,
          qrTemplate: processType === 'SLITTING' ? this.getDefaultSlittingQrTemplate() : '',
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
          await this.loadCustomerQrRuleForSlitting(this.reportForm.customerCode, 'SLITTING_OUTER_LABEL')
        }
        this.slittingTubePerBoxManual = false
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
        }
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
        } else {
          this.reportList = []
        }
      } catch (e) {
        this.reportList = []
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
    editHistoryReport(row) {
      if (!row || !row.id) {
        this.$message.warning('缺少报工记录ID')
        return
      }
      this.reportEditingId = Number(row.id)
      this.reportForm.startTime = row.start_time || this.reportForm.startTime
      this.reportForm.endTime = row.end_time || this.reportForm.endTime
      this.reportForm.producedQty = Number(row.produced_qty || 0) > 0 ? Number(row.produced_qty) : this.reportForm.producedQty
      this.reportForm.operator = row.operator_name || this.reportForm.operator
      this.reportForm.remark = row.remark || ''
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
      const producedRolls = (this.reportForm.producedRolls || [])
        .map(x => {
          if (!x) return null
          const area = this.calcRollArea(x.widthMm, x.lengthM)
          return {
            ...x,
            area
          }
        })
        .filter(x => x && x.rollCode && Number(x.area || 0) > 0)
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
        const normalizedRemark = this.buildReportRemarkWithSlittingBatchNo(this.reportForm.remark)
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
        materialCode: '',
        materialName: '',
        batchNo: '',
        batchNoRequired: true,
        thickness: '',
        widthMm: null,
        lengthM: null,
        rewindingSpec: '',
        rewindingMotherRollCode: '',
        rewindingSerialStart: 1,
        rewindingPrintCount: 1,
        coreOuterDiameterMm: 87.5,
        cartonPreset: String(defaultCarton.value || ''),
        cartonLengthMm: Number(defaultCarton.lengthMm || 0),
        cartonWidthMm: Number(defaultCarton.widthMm || 0),
        cartonHeightMm: Number(defaultCarton.heightMm || 0),
        slittingRollPerTube: 1,
        slittingTubePerBoxCount: 0,
        slittingTubeRollCount: 0,
        slittingCoreLabelBizType: 'SLITTING_CORE_LABEL',
        slittingInnerPrintCount: 0,
        slittingOuterPrintCount: 0,
        boxWeightKg: null,
        labelProductionDate: '',
        labelShipDate: '',
        deliveryNoteNo: '',
        shelfLifeDays: 365,
        qrTemplate: this.getDefaultSlittingQrTemplate(),
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
      return { rollCode: rollCode || '', batchNo: '', widthMm: 500, lengthM: 4000, weightKg: null, remark: '' }
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
      this.reportForm.producedRolls.push(this.newProducedRoll(rollCode))
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

    async loadTasks() {
      this.loading = true
      try {
        this.detailOrderItemsCache = {}
        this.detailOrderCustomerOrderNoCache = {}
        this.detailResolveCache = {}
        const ft = (this.fixedType || '').toLowerCase()
        const normalizedOrderNo = this.normalizeOrderNoKeyword(this.query.orderNo)
        const normalizedMaterialCode = this.normalizeKeywordText(this.query.materialCodeKeyword)
        const normalizedSpecKeyword = this.normalizeKeywordText(this.query.specKeyword)
        const finishFilter = (this.query.finishState || '').toUpperCase()
        const hasTaskKeywordMode = ['rewinding', 'slitting'].includes(ft) && (normalizedOrderNo || normalizedMaterialCode || normalizedSpecKeyword)
        const params = {
          type: this.query.type || undefined,
          status: this.query.status || undefined,
          orderNo: hasTaskKeywordMode ? undefined : (normalizedOrderNo || undefined),
          materialCode: normalizedMaterialCode || undefined,
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
                  return !(Number.isFinite(deletedFlag) && deletedFlag === 1)
                })
                .map(x => ({
                  ...x,
                  id: x && x.order_detail_id,
                  processType: 'SLITTING',
                  type: 'slitting',
                  status: 'UNSCHEDULED',
                  sourceType: 'PENDING_ORDER'
                }))

              const merged = [...scheduledList]
              const existingOrderDetailIds = new Set(
                scheduledList
                  .map(x => Number(x && (x.order_detail_id || x.orderItemId || x.orderDetailId)))
                  .filter(v => Number.isFinite(v) && v > 0)
              )
              pendingFiltered.forEach(x => {
                const odId = Number(x && (x.order_detail_id || x.orderItemId || x.orderDetailId))
                if (!(Number.isFinite(odId) && odId > 0) || !existingOrderDetailIds.has(odId)) {
                  merged.push(x)
                  return
                }
                const allCompleted = detailAllCompletedMap.get(odId)
                if (allCompleted === true) {
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
              orderNo: normalizedOrderNo || undefined,
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
      this.query = { type: this.fixedType || '', status: '', finishState: 'UNCOMPLETED', orderNo: '', materialCodeKeyword: '', specKeyword: '', dateRange: [], pageNum: 1, pageSize: 10 }
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
        this.handleCoatingTaskIssue(row)
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
      const planDate = this.lockQuery.planDate || this.todayDate()
      const orderNo = row.orderNo || row.order_no || ''
      const materialCode = row.materialCode || row.material_code || ''
      const scheduleId = Number(row.id || row.scheduleId || row.schedule_id || 0)
      const norm = v => String(v == null ? '' : v).replace(/\s+/g, '').toUpperCase()
      const normOrderNo = norm(orderNo)
      const normMaterialCode = norm(materialCode)
      if (!orderNo && !materialCode) {
        this.$message.warning('缺少订单号或料号，无法执行涂布领料')
        return
      }

      try {
        const res = await queryCoatingChemicalLocks({ planDate, orderNo, materialCode })
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
          if (materialCode && x && x.finishedMaterialCode && x.finishedMaterialCode !== materialCode) return false
          return true
        })
        let missingFormulaPlans = missingFormulaPlansAll.filter(x => {
          const sid = Number((x && x.scheduleId) || 0)
          if (scheduleId > 0 && sid > 0) return sid === scheduleId
          if (materialCode && x && x.materialCode && x.materialCode !== materialCode) return false
          return true
        })

        // 回退策略：若按scheduleId筛空，则按料号+订单号匹配，避免因历史排程ID差异导致“有锁定却显示无数据”
        if (!filteredLocks.length) {
          filteredLocks = allLocks.filter(x => {
            const codeOk = !normMaterialCode || norm(x && x.finishedMaterialCode) === normMaterialCode
            const orderOk = !normOrderNo || norm(x && x.orderNo).includes(normOrderNo)
            return codeOk && orderOk
          })
        }
        if (!missingFormulaPlans.length) {
          missingFormulaPlans = missingFormulaPlansAll.filter(x => {
            const codeOk = !normMaterialCode || norm(x && x.materialCode) === normMaterialCode
            const orderOk = !normOrderNo || norm(x && x.orderNo).includes(normOrderNo)
            return codeOk && orderOk
          })
        }

        this.coatingRequestNos = summary.requestNos || []
        this.locks = filteredLocks
        const missingFormulaCount = missingFormulaPlans.length

        if (missingFormulaCount > 0 && !filteredLocks.length) {
          const topReason = (missingFormulaPlans[0] && missingFormulaPlans[0].reason) || '配胶单缺失'
          this.$message.warning(`不能领料：该料号配胶单不完整（${topReason}），请联系研发解决`)
          return
        }

        const canIssueLocks = filteredLocks.filter(x => (x.lockStatus === 'LOCKED' || x.lockStatus === 'PARTIAL') && Number(x.lockedQty || 0) > 0)
        const shortageCount = filteredLocks.filter(x => Number(x.shortageQty || 0) > 0).length
        if (!canIssueLocks.length) {
          this.$message.info('当前任务无可领用原材料（库存不足的已自动生成请购）')
          return
        }

        const lockIds = canIssueLocks.map(x => x.id)
        const totalQty = canIssueLocks.reduce((s, x) => s + Number(x.lockedQty || 0), 0)
        await this.$confirm(
          `任务【${orderNo || '-'}】可领用原材料 ${canIssueLocks.length} 条，合计数量 ${totalQty}` +
          `${shortageCount > 0 ? `，缺口 ${shortageCount} 条已自动请购` : ''}。\n是否确认领料并同步仓库出库申请？`,
          '涂布领料确认',
          { type: 'warning', confirmButtonText: '确认领料', cancelButtonText: '取消' }
        )

        const issueRes = await confirmCoatingChemicalIssue({ lockIds, operator: this.currentOperatorName || 'production' })
        if (issueRes && (issueRes.code === 200 || issueRes.code === 20000)) {
          const d = issueRes.data || {}
          this.buildCoatingIssueSheet(row, canIssueLocks, this.coatingRequestNos)
          this.$message.success(`领料完成：出库${d.issuedCount || 0}条，数量${d.totalOutQty || 0}`)
          await this.loadOrderLocks()
        } else {
          this.$message.error((issueRes && (issueRes.message || issueRes.msg)) || '领料失败')
        }
      } catch (e) {
        if (e !== 'cancel') this.$message.error('领料失败')
      }
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
    buildCoatingIssueSheet(row, locks, requestNos) {
      const list = Array.isArray(locks) ? locks : []
      const totalQty = list.reduce((sum, x) => sum + Number((x && x.lockedQty) || 0), 0)
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
          issuedQty: Number(x.lockedQty || 0),
          createdAt
        })),
        totalQty: Number(totalQty || 0)
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
        ? '<tr><th>#</th><th>锁定ID</th><th>订单号</th><th>成品料号</th><th>原材料代码</th><th>原材料名称</th><th>领料数量</th><th>时间</th></tr>'
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
.slitting-print-form .pair-field { margin-right: 14px; }

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
