<template>
  <div class="app-container manual-schedule-page" :style="{ minHeight: 'calc(100vh - 100px)', height: pageHeight + 'px' }">
    <el-card shadow="never" class="header-card">
      <div slot="header" class="section-header">
        <div class="header-left"><span class="header-title">涂布排程列表</span></div>
        <div class="header-right">
          <div class="search-input-group">
            <el-select v-model="coatingLineFilter" size="small" clearable placeholder="全线别" style="width:140px" @change="handleCoatingLineFilterChange">
              <el-option label="全部线别" value="" />
              <el-option v-for="eq in equipmentList" :key="String(eq.id)" :label="eq.equipmentName || ('机台' + eq.id)" :value="String(eq.id)" />
            </el-select>
            <el-input v-model.trim="coatingQuery.materialCode" size="small" clearable placeholder="按料号搜索" style="width:200px" @keyup.enter.native="handleCoatingMaterialSearch" @clear="handleCoatingMaterialSearch">
              <el-button slot="append" icon="el-icon-search" @click="handleCoatingMaterialSearch" />
            </el-input>
          </div>
          <el-button-group>
            <el-button type="success" size="small" icon="el-icon-plus" @click="handleAddManualCoating">手工排程</el-button>
            <el-button type="primary" size="small" icon="el-icon-refresh" @click="loadCoatingSchedules(true)">刷新</el-button>
          </el-button-group>
        </div>
      </div>
      <div class="table-main-area">
        <el-table ref="coatingTable" v-loading="coatingLoading" :data="coatingList" class="manual-schedule-table process-schedule-table" size="mini" border stripe :fit="false" style="width:100%" :max-height="tableHeight" :row-class-name="coatingRowClassName" @selection-change="handleCoatingPrintSelectionChange" @sort-change="handleCoatingSortChange">
          <el-table-column type="selection" width="40" align="center" />
          <el-table-column prop="schedule_id" label="排程号" width="98" align="center" sortable="custom" column-key="schedule_id">
            <template slot-scope="scope">{{ scope.row.id || scope.row.schedule_id || '-' }}</template>
          </el-table-column>
          <el-table-column label="关联订单号" width="170" show-overflow-tooltip sortable="custom" column-key="related_order_nos">
            <template slot-scope="scope"><el-button type="text" @click="handleOrderNoClick(scope.row)">{{ scope.row.related_order_nos || scope.row.order_nos || scope.row.order_no || '-' }}</el-button></template>
          </el-table-column>
          <el-table-column prop="material_code" label="产品编码" width="230" show-overflow-tooltip sortable="custom" column-key="material_code">
            <template slot-scope="scope">
              <el-autocomplete v-if="scope.row.__editing && scope.row.__manual" v-model="scope.row.material_code" size="small" :fetch-suggestions="queryTapeSpecByMaterialCode" popper-class="manual-material-autocomplete-popper" placeholder="请输入料号" :trigger-on-focus="false" @input="handleManualCoatingMaterialInput(scope.row, $event)" @select="handleManualCoatingMaterialSelect(scope.row, $event)">
                <template slot-scope="{ item }"><div style="display:flex;flex-direction:column;gap:2px;line-height:1.35;"><span style="font-weight:600;color:#303133;white-space:normal;word-break:break-all;">{{ item.materialCode }}</span><span style="color:#909399;white-space:normal;word-break:break-all;">{{ item.productName || '-' }}</span></div></template>
              </el-autocomplete>
              <span v-else>{{ scope.row.material_code || '-' }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="material_name" label="产品名称" width="130" show-overflow-tooltip sortable="custom" column-key="material_name" />
          <el-table-column label="厚度(μm)" width="92" align="center" sortable="custom" column-key="thickness"><template slot-scope="scope">{{ formatThickness(scope.row) }}</template></el-table-column>
          <el-table-column label="涂布宽度(mm)" width="122" align="center" sortable="custom" column-key="coating_width">
            <template slot-scope="scope"><el-input-number v-if="scope.row.__editing" v-model="scope.row.coating_width" :fit="false" :min="0" :step="1" size="small" controls-position="right" @change="handleCoatingWidthChange(scope.row)" /><span v-else>{{ scope.row.coating_width || '-' }}</span></template>
          </el-table-column>
          <el-table-column label="涂布长度(米)" width="122" align="center" sortable="custom" column-key="coating_length">
            <template slot-scope="scope"><el-input-number v-if="scope.row.__editing" v-model="scope.row.coating_length" :min="0" :step="1" size="small" controls-position="right" @change="handleCoatingLengthChange(scope.row)" /><span v-else>{{ scope.row.coating_length || '-' }}</span></template>
          </el-table-column>
          <el-table-column label="涂布速度(米/分)" width="118" align="center" sortable="custom" column-key="coating_speed">
            <template slot-scope="scope"><el-input-number v-if="scope.row.__editing" v-model="scope.row.manual_coating_speed" :min="0" :step="1" size="mini" controls-position="right" placeholder="可手输" @change="handleCoatingLengthChange(scope.row)" /><span v-else>{{ formatCoatingSpeed(scope.row) }}</span></template>
          </el-table-column>
          <el-table-column label="计划开始" width="172" align="center" sortable="custom" column-key="coating_schedule_date">
            <template slot-scope="scope"><el-date-picker v-if="scope.row.__editing" v-model="scope.row.coating_schedule_date" type="datetime" size="small" placeholder="选择日期时间" format="yyyy-MM-dd HH:mm" value-format="yyyy-MM-dd HH:mm:ss" @change="handleCoatingDateChange(scope.row, { fromUser: true })" /><span v-else>{{ formatDateTime(scope.row.coating_schedule_date) }}</span></template>
          </el-table-column>
          <el-table-column label="插单方式" width="110" align="center">
            <template slot-scope="scope"><el-select v-if="scope.row.__editing" v-model="scope.row.insert_mode" size="small" @change="handleCoatingInsertModeChange(scope.row)"><el-option label="按时间后" value="AFTER_TIME" /><el-option label="按订单后" value="AFTER_ORDER" /></el-select><span v-else>{{ formatInsertMode(scope.row.insert_mode) }}</span></template>
          </el-table-column>
          <el-table-column label="插单锚点" width="220" align="center" show-overflow-tooltip>
            <template slot-scope="scope"><el-select v-if="scope.row.__editing && scope.row.insert_mode === 'AFTER_ORDER'" v-model="scope.row.anchor_schedule_id" size="small" filterable clearable placeholder="选择在哪单后" @change="handleCoatingAnchorChange(scope.row)"><el-option v-for="anchor in getCoatingAnchorOptions(scope.row)" :key="anchor.id" :label="coatingAnchorLabel(anchor)" :value="anchor.id" /></el-select><span v-else>{{ displayCoatingAnchor(scope.row) }}</span></template>
          </el-table-column>
          <el-table-column label="迁移策略" width="110" align="center">
            <template slot-scope="scope"><el-select v-if="scope.row.__editing" v-model="scope.row.rebalance_mode" size="small" @change="handleCoatingDateChange(scope.row)"><el-option label="人工选跨线" value="MANUAL_CROSS_LINE" /><el-option label="同线顺延" value="SAME_LINE" /></el-select><span v-else>{{ formatRebalanceMode(scope.row.rebalance_mode) }}</span></template>
          </el-table-column>
          <el-table-column label="用时" width="92" align="center" sortable="custom" column-key="coating_duration"><template slot-scope="scope">{{ formatCoatingDuration(scope.row) }}</template></el-table-column>
          <el-table-column label="计划米数" width="90" align="right" sortable="custom" column-key="coating_planned_meters"><template slot-scope="scope">{{ Number(getCoatingPlannedMeters(scope.row) || 0).toFixed(2) }}</template></el-table-column>
          <el-table-column label="已报工米数" width="96" align="right" sortable="custom" column-key="coating_report_qty"><template slot-scope="scope">{{ Number(scope.row.coating_report_qty || 0).toFixed(2) }}</template></el-table-column>
          <el-table-column label="完成率" width="84" align="center" sortable="custom" column-key="coating_completion_rate"><template slot-scope="scope">{{ formatProcessCompletionRate(scope.row.coating_report_qty, getCoatingPlannedMeters(scope.row)) }}</template></el-table-column>
          <el-table-column label="机台" width="146" align="center" sortable="custom" column-key="coating_equipment">
            <template slot-scope="scope"><el-select v-if="scope.row.__editing" v-model="scope.row.coating_equipment" size="small" placeholder="选择机台" @change="handleCoatingEquipmentChange(scope.row)" @visible-change="handleCoatingEquipmentDropdownVisible(scope.row, $event)"><el-option v-for="eq in getCoatingEquipmentOptions(scope.row)" :key="eq.id" :label="coatingEquipmentOptionLabel(eq)" :value="String(eq.id)" :disabled="!!eq.unavailableReason" /></el-select><span v-else>{{ equipmentName(scope.row.coating_equipment) }}</span></template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="92" align="center" sortable="custom" column-key="status"><template slot-scope="scope"><el-tag :type="statusType(resolveCoatingDisplayStatus(scope.row))">{{ statusText(resolveCoatingDisplayStatus(scope.row)) }}</el-tag></template></el-table-column>
          <el-table-column label="操作" width="132" align="center">
            <template slot-scope="scope"><div class="op-actions"><el-button class="op-main-btn" :fit="false" size="mini" :disabled="scope.row.__editing && (!scope.row.coating_equipment || (scope.row.insert_mode === 'AFTER_ORDER' && !scope.row.anchor_schedule_id))" @click="handleCoatingEditAction(scope.row)">{{ scope.row.__editing ? '保存' : '修改' }}</el-button><el-dropdown size="mini" trigger="click" :disabled="isRewindingLocked(scope.row)" @command="handleScheduleActionCommand"><el-button class="op-more-btn" size="mini" :disabled="isRewindingLocked(scope.row)">更多<i class="el-icon-arrow-down el-icon--right" /></el-button><el-dropdown-menu slot="dropdown"><el-dropdown-item :command="{ action: 'reduce', row: scope.row }">减量</el-dropdown-item><el-dropdown-item :command="{ action: 'terminate', row: scope.row }" divided>终止</el-dropdown-item><el-dropdown-item v-if="scope.row.status === 'TERMINATED'" :command="{ action: 'resume', row: scope.row }">恢复</el-dropdown-item><el-dropdown-item :command="{ action: 'reset', row: scope.row }" divided>清空单行数据</el-dropdown-item></el-dropdown-menu></el-dropdown></div></template>
          </el-table-column>
        </el-table>
      </div>
      <div class="pagination-container" style="text-align:right;">
        <el-pagination :current-page="coatingPage" :page-size="coatingPageSize" :page-sizes="pageSizes" layout="total, sizes, prev, pager, next, jumper" :total="coatingTotal" @size-change="handleCoatingSizeChange" @current-change="handleCoatingPageChange" />
      </div>
    </el-card>
    <!-- 报工和订单预览（共享mixin提供） -->
    <el-dialog :title="workReportDialogTitle" :visible.sync="workReportDialogVisible" width="860px" @close="handleWorkReportDialogClose">
      <el-form :model="workReportForm" label-width="90px" inline>
        <el-form-item label="扫码明细"><el-input v-model="workReportScanCode" size="small" placeholder="扫码派工明细二维码" style="width:220px" @keyup.enter.native="applyWorkReportScan" /><el-button size="small" style="margin-left:6px" @click="applyWorkReportScan">匹配</el-button></el-form-item>
        <el-form-item label="开始时间"><el-date-picker v-model="workReportForm.startTime" type="datetime" size="small" format="yyyy-MM-dd HH:mm:ss" value-format="yyyy-MM-dd HH:mm:ss" /></el-form-item>
        <el-form-item label="结束时间"><el-date-picker v-model="workReportForm.endTime" type="datetime" size="small" format="yyyy-MM-dd HH:mm:ss" value-format="yyyy-MM-dd HH:mm:ss" /></el-form-item>
        <el-form-item label="生产数量"><el-input-number v-model="workReportForm.producedQty" :min="0.01" :step="1" :precision="2" size="small" controls-position="right" /></el-form-item>
        <el-form-item label="操作人"><el-input v-model="workReportForm.operator" size="small" style="width:140px" /></el-form-item>
        <el-form-item label="下工序"><el-switch v-model="workReportForm.proceedNextProcess" active-text="继续" inactive-text="不继续" /></el-form-item>
      </el-form>
      <el-form :model="workReportForm" label-width="90px"><el-form-item label="备注"><el-input v-model="workReportForm.remark" type="textarea" :rows="2" /></el-form-item></el-form>
      <div style="margin-bottom:8px;font-weight:600;">历史报工</div>
      <el-table v-loading="workReportLoading" :data="workReportList" border size="mini" max-height="280">
        <el-table-column type="index" label="#" width="50" align="center" />
        <el-table-column prop="start_time" label="开始时间" width="140"><template slot-scope="scope">{{ formatDateTime(scope.row.start_time) }}</template></el-table-column>
        <el-table-column prop="end_time" label="结束时间" width="140"><template slot-scope="scope">{{ formatDateTime(scope.row.end_time) }}</template></el-table-column>
        <el-table-column prop="produced_qty" label="生产数量" width="110" align="right" />
        <el-table-column prop="operator_name" label="操作人" width="120" />
        <el-table-column label="下工序" width="90" align="center"><template slot-scope="scope"><el-tag :type="Number(scope.row.proceed_next_process || 0) === 1 ? 'success' : 'warning'" size="mini">{{ Number(scope.row.proceed_next_process || 0) === 1 ? '继续' : '不继续' }}</el-tag></template></el-table-column>
        <el-table-column label="操作" width="120" align="center"><template slot-scope="scope"><el-button type="text" size="mini" @click="editWorkReportRow(scope.row)">修改</el-button><el-button type="text" size="mini" style="color:#F56C6C" @click="deleteWorkReportRow(scope.row)">删除</el-button></template></el-table-column>
        <el-table-column prop="remark" label="备注" min-width="180" show-overflow-tooltip />
        <el-table-column prop="created_at" label="录入时间" width="140"><template slot-scope="scope">{{ formatDateTime(scope.row.created_at) }}</template></el-table-column>
      </el-table>
      <div slot="footer"><el-button @click="workReportDialogVisible = false">取消</el-button><el-button type="primary" :loading="workReportSubmitting" @click="submitWorkReport">提交报工</el-button></div>
    </el-dialog>
    <el-dialog title="订单生产详情" :visible.sync="orderInfoDialogVisible" width="820px" top="5vh" append-to-body custom-class="order-info-preview-dialog">
      <div v-loading="orderDetailLoading" class="order-detail-preview" style="padding:10px;">
        <div v-if="orderDetailInfo">
          <div class="print-header" style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;">
            <div style="flex:1;text-align:center;padding-left:90px;"><div style="font-size:18px;font-weight:bold;color:#000;">东莞市方恩电子材料科技有限公司</div><div style="margin:4px 0;"><span style="font-size:20px;font-weight:bold;letter-spacing:4px;">生 产 指 令 单</span><div style="font-size:12px;font-weight:normal;margin-top:-2px;">(包装)</div></div></div>
            <div class="order-qr-code" style="text-align:center;width:90px;"><div style="border:1px solid #000;padding:1px;width:72px;height:72px;display:flex;align-items:center;justify-content:center;margin:0 auto;"><img v-if="orderQrCode" :src="orderQrCode" style="width:68px;height:68px;" /><div v-else style="font-size:10px;color:#999;">生成中...</div></div><div style="font-size:11px;margin-top:2px;color:#000;font-weight:bold;">{{ orderDetailInfo.orderNo }}</div></div>
          </div>
          <table class="order-meta-table" style="width:100%;border-collapse:collapse;margin-bottom:10px;table-layout:fixed;">
            <tr><td style="border:1px solid #000;padding:4px 8px;font-size:13px;"><strong>订单号：</strong>{{ orderDetailInfo.orderNo }}</td><td style="border:1px solid #000;padding:4px 8px;font-size:13px;"><strong>客户代码：</strong>{{ orderDetailInfo.customerCode || '-' }}</td><td style="border:1px solid #000;padding:4px 8px;font-size:13px;"><strong>制单人：</strong>{{ orderDetailInfo.createBy || '-' }}</td></tr>
            <tr><td style="border:1px solid #000;padding:4px 8px;font-size:13px;"><strong>下单日期：</strong>{{ orderDetailInfo.orderDate || '-' }}</td><td style="border:1px solid #000;padding:4px 8px;font-size:13px;"><strong>交货日期：</strong>{{ orderDetailInfo.deliveryDate || '-' }}</td><td style="border:1px solid #000;padding:4px 8px;font-size:13px;"><strong>打印时间：</strong>{{ parseTime(new Date(), '{y}-{m}-{d} {h}:{i}') }}</td></tr>
          </table>
          <div class="remark-section" style="margin-bottom:10px;border:1px solid #000;padding:6px 8px;min-height:40px;"><div style="font-weight:bold;margin-bottom:3px;font-size:13px;">备注：</div><div style="font-size:13px;white-space:pre-wrap;">{{ orderDetailInfo.remark || '无' }}</div></div>
          <el-table :data="orderDetailInfo.items || []" border size="mini" stripe header-cell-style="background-color:#f5f7fa;color:#333;font-weight:bold;border-color:#000;padding:2px 0;" cell-style="border-color:#000;padding:2px 0;"><el-table-column type="index" label="序号" width="45" align="center" /><el-table-column prop="materialCode" label="产品编码 (含颜色)" min-width="150" show-overflow-tooltip /><el-table-column prop="materialName" label="产品名称" min-width="120" show-overflow-tooltip /><el-table-column label="产品规格" min-width="140" show-overflow-tooltip><template slot-scope="{row}">{{ formatItemSpec(row) }}</template></el-table-column><el-table-column prop="rolls" label="订单数量" width="80" align="center" /><el-table-column prop="sqm" label="平方数/㎡" width="90" align="center"><template slot-scope="{row}">{{ Number(row.sqm || 0).toFixed(2) }}</template></el-table-column><el-table-column label="明细码" width="90" align="center"><template slot-scope="{row}"><div style="font-size:11px;font-weight:bold;">{{ row.id || row.detailId }}</div></template></el-table-column></el-table>
        </div>
        <div v-else-if="!orderDetailLoading" style="text-align:center;padding:60px 0;"><i class="el-icon-document" style="font-size:40px;color:#C0C4CC;margin-bottom:15px;"></i><div style="color:#909399;">未获取到订单详情数据</div></div>
      </div>
      <div slot="footer"><el-button type="primary" @click="orderInfoDialogVisible = false">确 定</el-button></div>
    </el-dialog>
  </div>
</template>

<script>
import manualScheduleMixin from './manualScheduleMixin'
import { getCoatingSchedules, getCoatingAvailability, createSchedule, createCoatingSchedule } from '@/api/manualSchedule'
import { getProcessParams } from '@/api/processParams'
import { getProcessParamsList } from '@/api/processParams'
import uiConfig from '@/config/ui'

export default {
  name: 'CoatingScheduleProcess',
  mixins: [manualScheduleMixin],
  data() {
    return {
      coatingLoading: false,
      coatingList: [],
      coatingPage: 1,
      coatingPageSize: uiConfig.defaultPageSize,
      coatingTotal: 0,
      coatingSort: { prop: null, order: null },
      coatingQuery: { materialCode: '' },
      coatingLineFilter: '',
      highlightCoatingScheduleId: null,
      highlightCoatingTimer: null,
      coatingPrintSelections: []
    }
  },
  computed: {
    workReportRemainingQtyHint() { const planned = Number(this.workReportPlannedQty || 0); if (!(planned > 0)) return -1; const reported = this.sumWorkReportProducedQty(this.workReportList); return Number(Math.max(planned - reported, 0).toFixed(2)) }
  },
  mounted() {
    this.lockOuterScroll(); this.updateTableMaxHeight()
    window.addEventListener('resize', this.updateTableMaxHeight)
    this.loadCoatingSchedules(true); this.loadEquipmentList(); this.loadEquipmentScheduleConfigMap()
    window.addEventListener('schedule:jumpToCoating', this.onExternalJumpToCoating)
  },
  beforeDestroy() {
    this.unlockOuterScroll(); window.removeEventListener('resize', this.updateTableMaxHeight)
    if (this.highlightCoatingTimer) { clearTimeout(this.highlightCoatingTimer); this.highlightCoatingTimer = null }
    window.removeEventListener('schedule:jumpToCoating', this.onExternalJumpToCoating)
  },
  methods: {
    syncActiveTableLayout() { this.doTableLayout('coatingTable') },
    resolveCoatingDisplayStatus(row) { return String((row && row.status) || '').toUpperCase() },
    isRewindingLocked(row) { const s = String((row && row.status) || '').toUpperCase(); return s === 'REWINDING_SCHEDULED' },
    hasCoatingPlan(row) { if (!row) return false; const equipment = String(row.coating_equipment || row.equipment_id || '').trim(); if (!equipment) return false; return !!this.parseDateTimeValue(row.coating_start_time || row.coating_schedule_date || row.coating_date || row.coatingDate || '') },
    getCoatingPlannedMeters(row) { if (!row) return 0; const meters = Number(row.coating_length || 0); if (meters > 0) return meters; const width = Number(row.coating_width || row.width || 0); const area = Number(row.coating_area || 0); if (width > 0 && area > 0) return Number((area / (width / 1000)).toFixed(2)); return 0 },
    formatCoatingSpeed(row) { const speed = this.resolveCoatingSpeed(row); if (speed <= 0) return '-'; return Number.isInteger(speed) ? String(speed) : speed.toFixed(1) },
    formatCoatingDuration(row) { const roundedMinutes = this.calcCoatingMinutes(row); if (roundedMinutes <= 0) return '-'; const hours = Math.floor(roundedMinutes / 60); const minutes = roundedMinutes % 60; return `${hours}小时${minutes}分钟` },
    calcCoatingMinutes(row) { if (!row) return 0; const persistedMinutes = Number(row.coating_duration_minutes || row.coatingDurationMinutes || 0); if (persistedMinutes > 0) return persistedMinutes; let coatingLength = Number(row.coating_length || 0); if (!(coatingLength > 0)) { const area = Number(row.coating_area || 0); const coatingWidthMm = Number(row.coating_width || 1040); const coatingWidthM = coatingWidthMm > 0 ? coatingWidthMm / 1000 : 0; coatingLength = coatingWidthM > 0 ? area / coatingWidthM : Number(row.length || 0) }; const coatingSpeed = this.resolveCoatingSpeed(row); if (coatingLength <= 0 || coatingSpeed <= 0) return 0; return this.getRoundedMinutes(coatingLength, coatingSpeed) },
    formatInsertMode(mode) { return String(mode || 'AFTER_TIME').toUpperCase() === 'AFTER_ORDER' ? '按订单后' : '按时间后' },
    formatRebalanceMode(mode) { return String(mode || 'MANUAL_CROSS_LINE').toUpperCase() === 'SAME_LINE' ? '同线顺延' : '人工选跨线' },
    getCoatingAnchorOptions(currentRow) { const currentId = Number((currentRow && (currentRow.id || currentRow.schedule_id)) || 0); return (this.coatingList || []).map(item => ({ id: Number(item.id || item.schedule_id || 0), orderNo: String(item.related_order_nos || item.order_no || ''), start: String(item.coating_schedule_date || item.coating_start_time || '') })).filter(item => item.id > 0 && item.id !== currentId) },
    coatingAnchorLabel(anchor) { if (!anchor) return '-'; const when = anchor.start ? this.formatDateTime(anchor.start) : '-'; return `${anchor.id}｜${anchor.orderNo || '-'}｜${when}` },
    displayCoatingAnchor(row) { if (!row || String(row.insert_mode || 'AFTER_TIME').toUpperCase() !== 'AFTER_ORDER') return '-'; const anchorId = Number(row.anchor_schedule_id || 0); if (!(anchorId > 0)) return '-'; const anchor = this.getCoatingAnchorOptions(row).find(item => item.id === anchorId); return anchor ? this.coatingAnchorLabel(anchor) : `#${anchorId}` },
    coatingEquipmentOptionLabel(eq) { const name = eq && eq.equipmentName ? eq.equipmentName : '-'; if (eq && eq.unavailableReason) return `${name}（不可用: ${eq.unavailableReason}）`; if (!eq || !eq.suggestedStart) return name; return `${name}（最早:${this.formatDateTime(eq.suggestedStart)}）` },
    getCoatingEquipmentOptions(row) { const key = `${'COATING'}@@${row ? (row.id || row.schedule_id || Math.random()) : Math.random()}`; const cached = this.coatingEquipmentOptionsMap[key]; return (Array.isArray(cached) && cached.length) ? cached : (this.equipmentList || []) },
    getProcessOptionKey(processType, row) { return `${String(processType || '').toUpperCase()}@@${row ? (row.id || row.schedule_id || row.order_detail_id || Math.random()) : Math.random()}` },
    isCoatingMaterialRequiredError(message) { const text = String(message || ''); return text.includes('手工涂布排程请先输入料号') || text.includes('请先输入料号') },
    coatingRowClassName({ row }) { const current = Number(this.highlightCoatingScheduleId || 0); const rowId = this.resolveNumericScheduleId(row); if (current > 0 && rowId === current) return 'coating-highlight-row'; return '' },
    markCoatingHighlight(scheduleId) { const id = Number(scheduleId || 0); if (!id) return; this.highlightCoatingScheduleId = id; if (this.highlightCoatingTimer) clearTimeout(this.highlightCoatingTimer); this.highlightCoatingTimer = setTimeout(() => { this.highlightCoatingScheduleId = null; this.highlightCoatingTimer = null }, 10000); this.$nextTick(() => { const idx = (this.coatingList || []).findIndex(r => this.resolveNumericScheduleId(r) === id); if (idx < 0) return; const table = this.$refs.coatingTable; if (!table || !table.$el) return; const body = table.$el.querySelector('.el-table__body-wrapper'); const rows = table.$el.querySelectorAll('.el-table__body-wrapper tbody tr'); if (!body || !rows || !rows[idx]) return; body.scrollTop = rows[idx].offsetTop - 40 }) },
    handleManualCoatingMaterialInput(row, value) { this.handleManualMaterialInput(row, value) },
    handleManualCoatingMaterialSelect(row, item) { this.handleManualMaterialSelect(row, item, 'coating'); this.updateCoatingAvailability(row).then(() => { this.applyCoatingTimelinePreview() }) },
    triggerWorkReportRefresh() { this.loadWorkReportList(); this.loadCoatingSchedules() },

    async loadCoatingSpeedMap() {
      try { const res = await getProcessParamsList({ processType: 'COATING', current: 1, page: 1, size: 5000 }); const list = res.data?.list || res.data?.records || []; const speedMap = {}; list.forEach(item => { const materialCode = this.normalizeMaterialCode(item.materialCode || item.material_code); const equipmentCode = this.normalizeEquipmentCode(item.equipmentCode || item.equipment_code); const speed = Number(item.coatingSpeed || item.coating_speed || 0); if (materialCode && speed > 0) { speedMap[this.makeSpeedKey(materialCode, equipmentCode)] = speed; if (!speedMap[materialCode]) speedMap[materialCode] = speed } }); this.coatingSpeedMap = speedMap } catch (error) { console.error('加载涂布工艺参数失败', error) }
    },
    async ensureCoatingSpeedForRows(rows) {
      const list = Array.isArray(rows) ? rows : []; const missingPairs = [...new Set(list.map(r => { const code = this.normalizeMaterialCode(r.material_code || r.materialCode); const equipmentCode = this.resolveEquipmentCode(r); return this.makeSpeedKey(code, equipmentCode) }).filter(key => key && !this.coatingSpeedMap[key]))]; if (!missingPairs.length) return
      const tasks = missingPairs.map(async key => { try { const [code, equipmentCode = ''] = String(key || '').split('@@'); if (!code) return; let speed = 0; const candidates = this.getMaterialCodeCandidates(code); for (const candidate of candidates) { const res = await getProcessParams(candidate, 'COATING', equipmentCode); const data = res.data || {}; speed = Number(data.coatingSpeed || data.coating_speed || 0); if (speed > 0) { this.$set(this.coatingSpeedMap, this.makeSpeedKey(candidate, equipmentCode), speed); if (!this.coatingSpeedMap[candidate]) this.$set(this.coatingSpeedMap, candidate, speed); break } }; if (speed > 0) { this.$set(this.coatingSpeedMap, this.makeSpeedKey(code, equipmentCode), speed); if (!this.coatingSpeedMap[code]) this.$set(this.coatingSpeedMap, code, speed) } } catch (e) { /* ignore */ } }); await Promise.all(tasks)
    },
    async updateCoatingAvailability(row, fromLatestEnd = false, options = {}) {
      try { if (!row || !row.coating_equipment) return; const scheduleId = this.resolveNumericScheduleId(row); const keepManualTime = !!(options && options.keepManualTime); const res = await getCoatingAvailability({ scheduleId: scheduleId > 0 ? scheduleId : null, equipmentId: row.coating_equipment, coatingDate: fromLatestEnd ? null : row.coating_schedule_date, coatingLength: row.coating_length, manualCoatingSpeed: Number(row.manual_coating_speed || 0) > 0 ? Number(row.manual_coating_speed) : null, materialCode: row.material_code, insertMode: row.insert_mode || 'AFTER_TIME', anchorScheduleId: row.insert_mode === 'AFTER_ORDER' ? row.anchor_schedule_id : null, anchorAfterTime: row.insert_mode === 'AFTER_ORDER' ? row.coating_schedule_date : null, rebalanceMode: row.rebalance_mode || 'MANUAL_CROSS_LINE' }); if (res.code === 200 || res.code === 20000) { const data = res.data || {}; if (data.suggestedStart) { const roundedSuggestedStart = this.roundToTenMinuteDateTime(data.suggestedStart); if (!keepManualTime || !row.coating_schedule_date) this.$set(row, 'coating_schedule_date', roundedSuggestedStart || data.suggestedStart) } } } catch (e) { const msg = this.parseApiError(e, '未能获取机台空闲时间'); if (!this.isCoatingMaterialRequiredError(msg)) this.$message.warning(msg) }
    },
    applyCoatingTimelinePreview() {
      const rows = this.coatingList || []; if (!rows.length) return; const cursorByEquipment = {}
      const entries = rows.map(row => { const equipmentCode = this.resolveEquipmentCode(row); if (!equipmentCode) return null; const startRaw = row.coating_start_time || row.coating_schedule_date; const start = this.toDateObj(startRaw); if (!start) return null; const durationMinutes = this.calcCoatingMinutes(row); if (durationMinutes <= 0) return null; return { row, equipmentCode, start, durationMinutes, sortTs: start.getTime() } }).filter(Boolean).sort((a, b) => a.sortTs - b.sortTs)
      entries.forEach(item => { const { row, equipmentCode, durationMinutes } = item; let start = this.normalizePreviewStart(item.start, durationMinutes, equipmentCode); const cursor = cursorByEquipment[equipmentCode]; if (cursor && start.getTime() < cursor.getTime()) { if (row.__editing) { start = new Date(cursor.getTime()); start = this.normalizePreviewStart(start, durationMinutes, equipmentCode); this.$set(row, 'coating_schedule_date', this.toDateTimeString(start)) } }; const end = new Date(start.getTime() + durationMinutes * 60000); const existed = cursorByEquipment[equipmentCode]; cursorByEquipment[equipmentCode] = existed && existed.getTime() > end.getTime() ? existed : end })
    },
    parseTimeText(value) { const text = String(value || '08:00:00').trim(); const parts = text.split(':').map(item => Number(item || 0)); return { hours: Number.isNaN(parts[0]) ? 8 : parts[0], minutes: Number.isNaN(parts[1]) ? 0 : parts[1], seconds: Number.isNaN(parts[2]) ? 0 : parts[2] } },
    isInSundayBlockedWindow(date, config, startParts) { if (!(date instanceof Date) || Number.isNaN(date.getTime())) return false; const day = date.getDay(); if (Number(config && config.weekendRest) === 1 && day === 0) return true; if (Number(config && config.sundayDisabled) !== 1) return false; const start = startParts || this.parseTimeText(config && config.nextWeekStartTime); const hour = date.getHours(); const minute = date.getMinutes(); if (day === 0) return hour > start.hours || (hour === start.hours && minute >= start.minutes); if (day === 1) return hour < start.hours || (hour === start.hours && minute < start.minutes); return false },
    nextPreviewWorkingStart(value, config) { const date = value instanceof Date ? new Date(value.getTime()) : this.toDateObj(value); if (!date) return null; const startParts = this.parseTimeText(config && config.nextWeekStartTime); for (let i = 0; i < 8; i++) { const day = date.getDay(); if (Number(config && config.weekendRest) === 1 && day === 6) { date.setDate(date.getDate() + 2); date.setHours(startParts.hours, startParts.minutes, startParts.seconds, 0); continue }; if (this.isInSundayBlockedWindow(date, config, startParts)) { if (day === 0) date.setDate(date.getDate() + 1); date.setHours(startParts.hours, startParts.minutes, startParts.seconds, 0); continue }; if ((Number(config && config.weekendRest) === 1 || Number(config && config.sundayDisabled) === 1) && day === 1 && (date.getHours() < startParts.hours || (date.getHours() === startParts.hours && date.getMinutes() < startParts.minutes))) { date.setHours(startParts.hours, startParts.minutes, startParts.seconds, 0) }; return date }; return date },
    normalizePreviewStart(start, durationMinutes, equipmentCode) { const config = this.equipmentScheduleConfigMap[equipmentCode]; if (!config || Number(config.enabled) === 0) return start; let result = start instanceof Date ? new Date(start.getTime()) : this.toDateObj(start); if (!result) return start; const initialScheduleTime = this.toDateObj(config.initialScheduleTime); if (initialScheduleTime && result.getTime() < initialScheduleTime.getTime()) result = new Date(initialScheduleTime.getTime()); for (let i = 0; i < 5; i++) { const day = result.getDay(); if (Number(config.weekendRest) === 1 && day === 6) { result = this.nextPreviewWorkingStart(result, config); continue }; if (this.isInSundayBlockedWindow(result, config)) { result = this.nextPreviewWorkingStart(result, config); continue }; const cycleEndTime = this.toDateObj(config.cycleEndTime); if (cycleEndTime) { const end = new Date(result.getTime() + Math.max(Number(durationMinutes) || 0, 0) * 60000); if (result.getTime() > cycleEndTime.getTime() || end.getTime() > cycleEndTime.getTime()) { result = this.nextPreviewWorkingStart(new Date(cycleEndTime.getTime() + 1000), config); continue } }; return result }; return result },

    async refreshCoatingEquipmentOptions(row) { const scheduleId = this.resolveNumericScheduleId(row); const optionKey = this.getProcessOptionKey('COATING', row); const loadingKey = `COATING@${optionKey}`; if (this.equipmentOptionLoadingMap[loadingKey]) return; this.$set(this.equipmentOptionLoadingMap, loadingKey, true); try { const tasks = (this.equipmentList || []).map(async eq => { try { const res = await getCoatingAvailability({ scheduleId: scheduleId > 0 ? scheduleId : null, equipmentId: eq.id, coatingDate: null, coatingLength: row.coating_length, manualCoatingSpeed: Number(row.manual_coating_speed || 0) > 0 ? Number(row.manual_coating_speed) : null, materialCode: row.material_code, insertMode: row.insert_mode || 'AFTER_TIME', anchorScheduleId: row.insert_mode === 'AFTER_ORDER' ? row.anchor_schedule_id : null, anchorAfterTime: row.insert_mode === 'AFTER_ORDER' ? row.coating_schedule_date : null, rebalanceMode: row.rebalance_mode || 'MANUAL_CROSS_LINE' }); if (!(res.code === 200 || res.code === 20000)) return null; const data = res.data || {}; if (!data.suggestedStart) return { ...eq, unavailableReason: '机台暂无可排时间', _sortTs: Number.MAX_SAFE_INTEGER, _available: false }; return { ...eq, suggestedStart: data.suggestedStart, _sortTs: this.toDateObj(data.suggestedStart) ? this.toDateObj(data.suggestedStart).getTime() : Number.MAX_SAFE_INTEGER, _available: true } } catch (e) { const msg = this.parseApiError(e, '未维护机台能力参数'); return { ...eq, unavailableReason: this.isCoatingMaterialRequiredError(msg) ? '请先输入料号' : msg, _sortTs: Number.MAX_SAFE_INTEGER, _available: false } } }); const resolved = (await Promise.all(tasks)).filter(Boolean); resolved.sort((a, b) => { const av = Number(!!a._available); const bv = Number(!!b._available); if (av !== bv) return bv - av; const t = Number(a._sortTs || Number.MAX_SAFE_INTEGER) - Number(b._sortTs || Number.MAX_SAFE_INTEGER); if (t !== 0) return t; return String(a.equipmentName || '').localeCompare(String(b.equipmentName || '')) }); if (resolved.length) this.$set(this.coatingEquipmentOptionsMap, optionKey, resolved); else this.$set(this.coatingEquipmentOptionsMap, optionKey, this.equipmentList || []) } finally { this.$set(this.equipmentOptionLoadingMap, loadingKey, false) } },
    handleCoatingEquipmentDropdownVisible(row, visible) { if (visible) this.refreshCoatingEquipmentOptions(row) },
    handleCoatingEquipmentChange(row) { const options = this.getCoatingEquipmentOptions(row) || []; const selected = options.find(eq => String(eq.id) === String(row.coating_equipment || '')); if (selected && selected.suggestedStart) { const rounded = this.roundToTenMinuteDateTime(selected.suggestedStart); if (rounded) this.$set(row, 'coating_schedule_date', rounded) }; this.updateCoatingAvailability(row, false, { keepManualTime: true }).then(() => { if (!row.coating_schedule_date) { const fallback = this.roundToTenMinuteDateTime(new Date()); if (fallback) this.$set(row, 'coating_schedule_date', fallback) }; this.applyCoatingTimelinePreview() }) },
    handleCoatingDateChange(row, options = {}) { const fromUser = !!(options && options.fromUser); if (fromUser && row) { const rounded = this.roundToTenMinuteDateTime(row.coating_schedule_date); if (rounded) this.$set(row, 'coating_schedule_date', rounded) }; this.updateCoatingAvailability(row, false, { keepManualTime: fromUser }).then(() => { this.applyCoatingTimelinePreview() }) },
    handleCoatingWidthChange(row) { if (!row) return; const width = Number(row.coating_width || 0); const finalWidth = width > 0 ? width : 1040; this.$set(row, 'coating_width', finalWidth); const area = Number(row.coating_area || 0); if (area > 0 && finalWidth > 0) { const length = area / (finalWidth / 1000); this.$set(row, 'coating_length', Number(length.toFixed(2))) }; this.updateCoatingAvailability(row).then(() => { this.applyCoatingTimelinePreview() }) },
    handleCoatingLengthChange(row) { this.updateCoatingAvailability(row).then(() => { this.applyCoatingTimelinePreview() }) },
    handleCoatingInsertModeChange(row) { if (!row) return; if (String(row.insert_mode || '').toUpperCase() !== 'AFTER_ORDER') this.$set(row, 'anchor_schedule_id', null); this.updateCoatingAvailability(row).then(() => { this.applyCoatingTimelinePreview() }) },
    handleCoatingAnchorChange(row) { this.updateCoatingAvailability(row).then(() => { this.applyCoatingTimelinePreview() }) },
    handleCoatingEditAction(row) { if (!row.__editing) { this.$set(row, '__editing', true); this.refreshCoatingEquipmentOptions(row); return }; this.handleConfirmCoating(row) },
    recalcManualCoatingArea(row) { if (!row) return 0; const width = Number(row.coating_width || row.width || 0); const length = Number(row.coating_length || row.length || 0); if (!(width > 0) || !(length > 0)) { this.$set(row, 'coating_area', 0); return 0 }; const area = Number(((width / 1000) * length).toFixed(2)); this.$set(row, 'coating_area', area); return area },
    buildManualCoatingOrderNo() { const d = new Date(); const pad = n => String(n).padStart(2, '0'); const stamp = `${String(d.getFullYear()).slice(-2)}${pad(d.getMonth() + 1)}${pad(d.getDate())}`; const prefix = `MT${stamp}-`; const serials = (this.coatingList || []).map(item => String((item && item.order_no) || '').trim().toUpperCase()).map(code => { const m = code.match(/^MT\d{6}-(\d{3})$/); return m ? Number(m[1]) : 0 }).filter(n => n > 0); const next = (serials.length ? Math.max(...serials) : 0) + 1; return `${prefix}${String(Math.min(next, 999)).padStart(3, '0')}` },
    handleAddManualCoating() { const row = { id: null, schedule_id: null, order_no: this.buildManualCoatingOrderNo(), related_order_nos: '手工排程', material_code: '', material_name: '', coating_area: 0, coating_width: 1040, coating_length: 0, coating_schedule_date: '', manual_coating_speed: 0, insert_mode: 'AFTER_TIME', anchor_schedule_id: null, rebalance_mode: 'MANUAL_CROSS_LINE', coating_equipment: '', team_capacity_minutes: null, team_planned_minutes: null, team_after_minutes: null, team_over_capacity: false, schedule_qty: 1, status: 'PENDING', __editing: true, __manual: true }; this.coatingList = [row, ...(this.coatingList || [])]; this.$nextTick(() => { this.refreshCoatingEquipmentOptions(row) }) },
    async loadCoatingSchedules(forceReloadSpeed = false) { this.coatingLoading = true; try { if (forceReloadSpeed || !Object.keys(this.coatingSpeedMap).length) await this.loadCoatingSpeedMap(); const res = await getCoatingSchedules({ current: this.coatingPage, size: this.coatingPageSize, coatingEquipment: this.coatingLineFilter || null, materialCode: this.coatingQuery.materialCode || null }); if (res.code === 200 || res.code === 20000) { const pageData = res.data || {}; const records = pageData.records || pageData.list || []; const mappedCoating = records.map(item => { const hasPlan = this.hasCoatingPlan(item); const width = Number(item.coating_width || 0); const finalWidth = width > 0 ? width : 1040; const inputLength = Number(item.coating_length || 0); const area = Number(item.coating_area || 0); const finalLength = inputLength > 0 ? inputLength : ((area > 0 && finalWidth > 0) ? Number((area / (finalWidth / 1000)).toFixed(2)) : Number(item.length || 0) || null); const finalArea = area > 0 ? area : ((finalWidth > 0 && finalLength > 0) ? Number(((finalWidth / 1000) * finalLength).toFixed(2)) : 0); return { ...item, coating_width: finalWidth, coating_length: finalLength, manual_coating_speed: Number(item.manual_coating_speed || item.manualCoatingSpeed || 0), coating_area: finalArea, insert_mode: item.insert_mode || 'AFTER_TIME', anchor_schedule_id: item.anchor_schedule_id ? Number(item.anchor_schedule_id) : null, rebalance_mode: item.rebalance_mode || 'MANUAL_CROSS_LINE', team_capacity_minutes: null, team_planned_minutes: null, team_after_minutes: null, team_over_capacity: false, status: hasPlan ? item.status : 'PENDING', __editing: !hasPlan, __manual: false } }); this.coatingList = await this.enrichMaterialNamesFromSpec(mappedCoating); await this.ensureCoatingSpeedForRows(this.coatingList); this.applyCoatingTimelinePreview(); this.coatingTotal = Number(pageData.total || 0) } else { this.coatingList = []; this.coatingTotal = 0 } } catch (error) { this.$message.error('加载涂布排程失败') } finally { this.coatingLoading = false; this.relayoutTable('coatingTable') } },
    handleCoatingSizeChange(size) { this.coatingPageSize = size; this.coatingPage = 1; this.loadCoatingSchedules() },
    handleCoatingLineFilterChange() { this.coatingPage = 1; this.loadCoatingSchedules() },
    handleCoatingMaterialSearch() { this.coatingPage = 1; this.loadCoatingSchedules() },
    handleCoatingPageChange(page) { this.coatingPage = page; this.loadCoatingSchedules() },
    getCoatingSortValue(row, key) { if (!row) return ''; if (['schedule_id', 'id', 'coating_report_qty', 'coating_area', 'locked_area', 'unlocked_area', 'coating_width', 'coating_length'].includes(key)) return this.getSortNumericValue(row[key] != null ? row[key] : row.id); if (key === 'coating_planned_meters') return this.getSortNumericValue(this.getCoatingPlannedMeters(row)); if (key === 'coating_completion_rate') return this.getSortNumericValue(this.formatProcessCompletionRate(row.coating_report_qty, this.getCoatingPlannedMeters(row)).replace('%', '')); if (key === 'coating_speed') return this.getSortNumericValue(this.resolveCoatingSpeed(row)); if (key === 'coating_duration') return this.getSortNumericValue(this.calcCoatingMinutes(row)); if (key === 'coating_schedule_date') return this.toDateValue(row.coating_schedule_date || row.coating_start_time); if (key === 'coating_equipment') return this.getSortStringValue(this.equipmentName(row.coating_equipment)); return this.getSortStringValue(row[key]) },
    getSortStringValue(value) { return String(value == null ? '' : value).toUpperCase() },
    getSortNumericValue(value) { return Number(value || 0) },
    toDateValue(value) { if (!value) return 0; const d = new Date(String(value).replace(' ', 'T')); return Number.isNaN(d.getTime()) ? 0 : d.getTime() },
    applyCoatingSort() { const src = Array.isArray(this.coatingList) ? [...this.coatingList] : []; const { prop, order } = this.coatingSort || {}; if (!prop || !order) { this.coatingList = src; return }; const factor = order === 'ascending' ? 1 : -1; src.sort((a, b) => { const av = this.getCoatingSortValue(a, prop); const bv = this.getCoatingSortValue(b, prop); if (av === bv) return 0; return av > bv ? factor : -factor }); this.coatingList = src },
    handleCoatingSortChange({ prop, order, column }) { const key = (column && column.columnKey) || prop; this.coatingSort = { prop: key, order: order || null }; this.applyCoatingSort() },
    handleCoatingPrintSelectionChange(selection) { this.coatingPrintSelections = Array.isArray(selection) ? selection : [] },
    onExternalJumpToCoating(e) { const { scheduleId } = e.detail || {}; if (scheduleId) { this.coatingPage = 1; this.loadCoatingSchedules().then(() => { this.markCoatingHighlight(scheduleId) }) } },

    async handleConfirmCoating(row) {
      try { const materialCode = String(row.material_code || '').trim().toUpperCase(); if (!materialCode) { this.$message.warning('请先输入料号'); return }; await this.ensureRowMaterialNameBySpec(row); const coatingWidth = Number(row.coating_width || 0) > 200 ? Number(row.coating_width) : 1040; const coatingLength = Number(row.coating_length || 0); if (!(coatingLength > 0)) { this.$message.warning('请先输入有效的涂布长度'); return }; if (row.insert_mode === 'AFTER_ORDER' && !row.anchor_schedule_id) { this.$message.warning('请先选择插单锚点订单'); return }; if (!row.coating_equipment) { this.$message.warning('请先选择机台'); return }; const normalizedCoatingStart = this.roundToTenMinuteDateTime(row.coating_schedule_date); if (normalizedCoatingStart) this.$set(row, 'coating_schedule_date', normalizedCoatingStart); await this.updateCoatingAvailability(row); const coatingArea = this.recalcManualCoatingArea(row); if (!(coatingArea > 0)) { this.$message.warning('涂布面积必须大于0'); return }; let scheduleId = this.resolveNumericScheduleId(row); if (!(scheduleId > 0)) { const createRes = await createSchedule({ orderNo: row.order_no || this.buildManualCoatingOrderNo(), orderDetailId: null, materialCode, materialName: row.material_name || '', width: coatingWidth, length: coatingLength, scheduleQty: 1, coatingArea, coatingWidth, coatingLength, coatingDate: row.coating_schedule_date, scheduleType: 'COATING', status: 'PENDING', remark: '手工涂布排程' }); if (!(createRes.code === 200 || createRes.code === 20000)) throw new Error(createRes.msg || createRes.message || '创建手工涂布排程失败'); scheduleId = Number(createRes.data || 0); if (!(scheduleId > 0)) throw new Error('创建手工涂布排程失败，未返回有效排程ID'); this.$set(row, 'id', scheduleId); this.$set(row, 'schedule_id', scheduleId); this.$set(row, '__manual', false) }; const res = await createCoatingSchedule({ scheduleId, coatingArea, coatingDate: row.coating_schedule_date, equipmentId: row.coating_equipment, coatingWidth, coatingLength, manualCoatingSpeed: Number(row.manual_coating_speed || 0) > 0 ? Number(row.manual_coating_speed) : null, materialCode, insertMode: row.insert_mode || 'AFTER_TIME', anchorScheduleId: row.insert_mode === 'AFTER_ORDER' ? row.anchor_schedule_id : null, anchorAfterTime: row.insert_mode === 'AFTER_ORDER' ? row.coating_schedule_date : null, rebalanceMode: row.rebalance_mode || 'MANUAL_CROSS_LINE' }); if (res.code === 200 || res.code === 20000) { this.$message.success('涂布排程确认成功'); this.$set(row, '__editing', false); this.loadCoatingSchedules() } } catch (error) { const msg = (error && error.response && error.response.data && (error.response.data.msg || error.response.data.message)) || error.message || '确认失败'; this.$message.error(msg) }
    }
  }
}
</script>

<style scoped>
@import './manualScheduleShared.scss';
</style>