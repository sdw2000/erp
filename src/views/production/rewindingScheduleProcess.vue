<template>
  <div class="app-container manual-schedule-page" :style="{ minHeight: 'calc(100vh - 100px)', height: pageHeight + 'px' }">
    <el-card shadow="never" class="header-card">
      <div slot="header" class="section-header">
        <div class="header-left"><span class="header-title">复卷订单排程</span><span class="pending-summary-text">按涂布日期排序</span></div>
        <div class="header-right">
          <el-button-group>
            <el-button type="success" size="small" icon="el-icon-plus" @click="handleAddManualRewinding">手动添加</el-button>
            <el-button type="primary" size="small" icon="el-icon-refresh" @click="loadRewindingOrders">刷新</el-button>
          </el-button-group>
        </div>
      </div>
      <el-alert v-if="rewindingLockSummary.unlockedRows > 0" type="warning" show-icon :closable="false" class="mb-10" :title="`锁料提醒：当前有 ${rewindingLockSummary.unlockedRows} 条待复卷订单存在未锁定面积，共 ${rewindingLockSummary.unlockedArea} ㎡。请优先处理锁料后再确认排程。`" />
      <div class="table-main-area">
        <el-table ref="rewindingTable" v-loading="rewindingLoading" :data="rewindingList" class="manual-schedule-table process-schedule-table" size="mini" border stripe style="width:100%" :max-height="tableHeight" :row-class-name="rewindingRowClassName" @selection-change="handleRewindingPrintSelectionChange" @sort-change="handleRewindingSortChange">
          <el-table-column type="selection" width="40" align="center" />
          <el-table-column type="index" label="序号" width="52" align="center" />
          <el-table-column prop="schedule_id" label="排程号" width="102" align="center" sortable="custom" column-key="schedule_id">
            <template slot-scope="scope"><el-input-number v-if="scope.row.__editing && scope.row.__manual" v-model="scope.row.schedule_id" :min="1" :step="1" size="mini" controls-position="right" /><span v-else>{{ scope.row.schedule_id || '-' }}</span></template>
          </el-table-column>
          <el-table-column prop="coating_date" label="涂布时间" width="124" sortable="custom" column-key="coating_date">
            <template slot-scope="scope">
              <el-tag v-if="scope.row.schedule_type === 'STOCK'" type="success">有料</el-tag>
              <el-tag v-else type="success" class="two-line-time-tag"><span class="two-line-time-text">{{ timeWindowLine(formatCoatingTimeWindow(scope.row), 0) }}</span><span class="two-line-time-text">{{ timeWindowLine(formatCoatingTimeWindow(scope.row), 1) }}</span></el-tag>
            </template>
          </el-table-column>
          <el-table-column label="订单号" width="112" sortable="custom" column-key="order_no"><template slot-scope="scope"><el-button type="text" @click="handleOrderNoClick(scope.row)">{{ scope.row.order_no || '-' }}</el-button></template></el-table-column>
          <el-table-column prop="customer_name" label="客户" width="86" sortable="custom" column-key="customer_name" show-overflow-tooltip />
          <el-table-column prop="material_code" label="产品编码" width="230" class-name="wrap-col" show-overflow-tooltip sortable="custom" column-key="material_code">
            <template slot-scope="scope">
              <el-autocomplete v-if="scope.row.__editing && scope.row.__manual" v-model="scope.row.material_code" size="small" :fetch-suggestions="queryTapeSpecByMaterialCode" popper-class="manual-material-autocomplete-popper" placeholder="请输入料号" :trigger-on-focus="false" @input="handleManualRewindingMaterialInput(scope.row, $event)" @select="handleManualRewindingMaterialSelect(scope.row, $event)">
                <template slot-scope="{ item }"><div style="display:flex;flex-direction:column;gap:2px;line-height:1.35;"><span style="font-weight:600;color:#303133;white-space:normal;word-break:break-all;">{{ item.materialCode }}</span><span style="color:#909399;white-space:normal;word-break:break-all;">{{ item.productName || '-' }}</span></div></template>
              </el-autocomplete>
              <span v-else>{{ scope.row.material_code || '-' }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="material_name" label="产品名称" width="132" class-name="wrap-col" show-overflow-tooltip sortable="custom" column-key="material_name" />
          <el-table-column label="规格(厚*宽*长)" width="132" align="right" class-name="wrap-col" sortable="custom" column-key="spec"><template slot-scope="scope">{{ formatOrderSpec(scope.row) }}</template></el-table-column>
          <el-table-column prop="schedule_qty" label="卷数" width="72" align="right" sortable="custom" column-key="schedule_qty"><template slot-scope="scope">{{ Number(scope.row.schedule_qty || 0) }}</template></el-table-column>
          <el-table-column label="已排复卷(㎡)" width="108" align="right" sortable="custom" column-key="rewinding_area"><template slot-scope="scope">{{ formatArea(getPlannedRewindingArea(scope.row)) }}</template></el-table-column>
          <el-table-column label="复卷宽度" width="112" align="center" sortable="custom" column-key="rewinding_width"><template slot-scope="scope"><el-input-number v-if="scope.row.__editing" v-model="scope.row.rewinding_width" :min="1" :step="1" size="mini" controls-position="right" /><span v-else>{{ scope.row.rewinding_width || '-' }}</span></template></el-table-column>
          <el-table-column label="复卷数量" width="86" align="right" sortable="custom" column-key="rewinding_roll_count"><template slot-scope="scope">{{ getRewindingRollCount(scope.row) }}</template></el-table-column>
          <el-table-column label="复卷速度(米/分)" width="118" align="center" sortable="custom" column-key="rewinding_speed">
            <template slot-scope="scope"><el-input-number v-if="scope.row.__editing" v-model="scope.row.manual_rewinding_speed" :min="0" :step="1" size="mini" controls-position="right" placeholder="可手输" @change="handleRewindingDateChange(scope.row)" /><span v-else>{{ formatRewindingSpeed(scope.row) }}</span></template>
          </el-table-column>
          <el-table-column label="计划开始" width="170" sortable="custom" column-key="rewinding_date">
            <template slot-scope="scope"><el-date-picker v-if="scope.row.__editing" v-model="scope.row.rewinding_date" type="datetime" size="small" placeholder="选择日期" format="yyyy-MM-dd HH:mm" value-format="yyyy-MM-dd HH:mm:ss" @change="handleRewindingDateChange(scope.row)" /><span v-else>{{ formatDateTime(scope.row.rewinding_date) }}</span></template>
          </el-table-column>
          <el-table-column label="复卷用时" width="92" align="center" sortable="custom" column-key="rewinding_duration"><template slot-scope="scope">{{ formatRewindingDuration(scope.row) }}</template></el-table-column>
          <el-table-column label="锁料提醒" width="108" align="center"><template slot-scope="scope"><el-tag v-if="getUnlockedArea(scope.row) > 0" type="warning">未锁{{ getUnlockedArea(scope.row).toFixed(0) }}㎡</el-tag><el-tag v-else type="success">已锁定</el-tag></template></el-table-column>
          <el-table-column prop="rewinding_equipment" label="复卷机台" width="124" sortable="custom" column-key="rewinding_equipment">
            <template slot-scope="scope"><el-select v-if="scope.row.__editing" v-model="scope.row.rewinding_equipment" size="small" placeholder="机台号" @change="handleRewindingEquipmentChange(scope.row)" @visible-change="handleRewindingEquipmentDropdownVisible(scope.row, $event)"><el-option v-for="eq in getRewindingEquipmentOptions(scope.row)" :key="eq.id" :label="rewindingEquipmentOptionLabel(eq)" :value="eq.equipmentCode" :disabled="!!eq.unavailableReason" /></el-select><span v-else>{{ scope.row.rewinding_equipment || '-' }}</span></template>
          </el-table-column>
          <el-table-column label="状态" width="84" align="center" sortable="custom" column-key="status"><template slot-scope="scope"><el-tag :type="formatSlittingStatus(scope.row.status).type">{{ formatSlittingStatus(scope.row.status).label }}</el-tag></template></el-table-column>
          <el-table-column label="操作" width="132" align="center">
            <template slot-scope="scope"><div class="op-actions"><el-button class="op-main-btn" size="mini" :disabled="scope.row.__editing && (!scope.row.rewinding_date || !scope.row.rewinding_equipment)" @click="handleRewindingEditAction(scope.row)">{{ scope.row.__editing ? '确认' : '修改' }}</el-button><el-dropdown size="mini" trigger="click" @command="handleScheduleActionCommand"><el-button class="op-more-btn" size="mini">更多<i class="el-icon-arrow-down el-icon--right" /></el-button><el-dropdown-menu slot="dropdown"><el-dropdown-item :command="{ action: 'report', row: scope.row, processType: 'REWINDING' }">报工</el-dropdown-item><el-dropdown-item :command="{ action: 'reduce', row: scope.row }">减量</el-dropdown-item><el-dropdown-item :command="{ action: 'terminate', row: scope.row }" divided>终止</el-dropdown-item><el-dropdown-item v-if="scope.row.status === 'TERMINATED'" :command="{ action: 'resume', row: scope.row }">恢复</el-dropdown-item><el-dropdown-item :command="{ action: 'reset', row: scope.row }" divided>清空单行数据</el-dropdown-item></el-dropdown-menu></el-dropdown></div></template>
          </el-table-column>
        </el-table>
      </div>
      <div class="pagination-container" style="text-align:right;">
        <el-pagination :current-page="rewindingPage" :page-size="rewindingPageSize" :page-sizes="pageSizes" layout="total, sizes, prev, pager, next, jumper" :total="rewindingTotal" @size-change="handleRewindingSizeChange" @current-change="handleRewindingPageChange" />
      </div>
    </el-card>
    <!-- 报工和订单预览共享对话框 -->
    <el-dialog :title="workReportDialogTitle" :visible.sync="workReportDialogVisible" width="860px" @close="handleWorkReportDialogClose">
      <el-form :model="workReportForm" label-width="90px" inline>
        <el-form-item label="扫码明细"><el-input v-model="workReportScanCode" size="small" style="width:220px" @keyup.enter.native="applyWorkReportScan" /><el-button size="small" style="margin-left:6px" @click="applyWorkReportScan">匹配</el-button></el-form-item>
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
        <el-table-column label="操作" width="120" align="center"><template slot-scope="scope"><el-button type="text" size="mini" @click="editWorkReportRow(scope.row)">修改</el-button><el-button type="text" size="mini" style="color:#F56C6C" @click="deleteWorkReportRow(scope.row)">删除</el-button></template></el-table-column>
        <el-table-column prop="created_at" label="录入时间" width="140"><template slot-scope="scope">{{ formatDateTime(scope.row.created_at) }}</template></el-table-column>
      </el-table>
      <div slot="footer"><el-button @click="workReportDialogVisible = false">取消</el-button><el-button type="primary" :loading="workReportSubmitting" @click="submitWorkReport">提交报工</el-button></div>
    </el-dialog>
    <el-dialog title="订单生产详情" :visible.sync="orderInfoDialogVisible" width="820px" top="5vh" append-to-body custom-class="order-info-preview-dialog">
      <div v-loading="orderDetailLoading" class="order-detail-preview" style="padding:10px;">
        <div v-if="orderDetailInfo">
          <div class="print-header" style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;">
            <div style="flex:1;text-align:center;padding-left:90px;"><div style="font-size:18px;font-weight:bold;color:#000;">东莞市方恩电子材料科技有限公司</div><div style="margin:4px 0;"><span style="font-size:20px;font-weight:bold;letter-spacing:4px;">生 产 指 令 单</span></div></div>
            <div class="order-qr-code" style="text-align:center;width:90px;"><div style="border:1px solid #000;padding:1px;width:72px;height:72px;"><img v-if="orderQrCode" :src="orderQrCode" style="width:68px;height:68px;" /></div><div style="font-size:11px;margin-top:2px;">{{ orderDetailInfo.orderNo }}</div></div>
          </div>
          <el-table :data="orderDetailInfo.items || []" border size="mini" stripe><el-table-column type="index" label="#" width="45" /><el-table-column prop="materialCode" label="产品编码" min-width="150" /><el-table-column prop="materialName" label="产品名称" min-width="120" /><el-table-column prop="rolls" label="订单数量" width="80" align="center" /></el-table>
        </div>
        <div v-else-if="!orderDetailLoading" style="text-align:center;padding:60px 0;"><div style="color:#909399;">未获取到订单详情</div></div>
      </div>
      <div slot="footer"><el-button type="primary" @click="orderInfoDialogVisible = false">确 定</el-button></div>
    </el-dialog>
  </div>
</template>

<script>
import manualScheduleMixin from './manualScheduleMixin'
import { getCoatingCompletedOrders, getRewindingAvailability, createRewindingSchedule } from '@/api/manualSchedule'
import { getRewindingProcessParamsList, getRewindingProcessParams } from '@/api/rewindingProcessParams'
import uiConfig from '@/config/ui'

export default {
  name: 'RewindingScheduleProcess',
  mixins: [manualScheduleMixin],
  data() {
    return {
      rewindingLoading: false,
      rewindingList: [],
      rewindingPage: 1,
      rewindingPageSize: uiConfig.defaultPageSize,
      rewindingTotal: 0,
      rewindingSort: { prop: null, order: null },
      rewindingLockSummary: { unlockedRows: 0, unlockedArea: 0 },
      highlightRewindingDetailId: null,
      highlightRewindingScheduleId: null,
      highlightRewindingTimer: null,
      rewindingPrintSelections: []
    }
  },
  computed: {
    workReportRemainingQtyHint() { const planned = Number(this.workReportPlannedQty || 0); if (!(planned > 0)) return -1; const reported = this.sumWorkReportProducedQty(this.workReportList); return Number(Math.max(planned - reported, 0).toFixed(2)) }
  },
  mounted() {
    this.lockOuterScroll(); this.updateTableMaxHeight()
    window.addEventListener('resize', this.updateTableMaxHeight)
    this.loadRewindingOrders(); this.loadEquipmentList(); this.loadEquipmentScheduleConfigMap()
    window.addEventListener('schedule:jumpToRewinding', this.onExternalJumpToRewinding)
  },
  beforeDestroy() {
    this.unlockOuterScroll(); window.removeEventListener('resize', this.updateTableMaxHeight)
    if (this.highlightRewindingTimer) { clearTimeout(this.highlightRewindingTimer); this.highlightRewindingTimer = null }
    window.removeEventListener('schedule:jumpToRewinding', this.onExternalJumpToRewinding)
  },
  methods: {
    syncActiveTableLayout() { this.doTableLayout('rewindingTable') },
    hasRewindingPlan(row) { if (!row) return false; const equipment = String(row.rewinding_equipment || '').trim(); if (!equipment) return false; return !!this.parseDateTimeValue(row.rewinding_start_time || row.rewinding_date || '') },
    handleManualRewindingMaterialInput(row, value) { this.handleManualMaterialInput(row, value) },
    handleManualRewindingMaterialSelect(row, item) { this.handleManualMaterialSelect(row, item, 'rewinding') },
    triggerWorkReportRefresh() { this.loadWorkReportList(); this.loadRewindingOrders() },
    formatRewindingSpeed(row) { const speed = this.resolveRewindingSpeed(row); if (speed <= 0) return '-'; return Number.isInteger(speed) ? String(speed) : Number(speed).toFixed(1) },
    formatRewindingDuration(row) {
      const persistedMinutes = Number(row.rewinding_duration_minutes || row.rewindingDurationMinutes || 0)
      if (persistedMinutes > 0) { const hours = Math.floor(persistedMinutes / 60); const minutes = persistedMinutes % 60; return `${hours}小时${minutes}分钟` }
      const area = Number(this.getPlannedRewindingArea(row) || 0); const rewindingWidthMm = Number(row.rewinding_width || 0); const rewindingWidthM = rewindingWidthMm > 0 ? rewindingWidthMm / 1000 : 0
      const rewindingLength = rewindingWidthM > 0 ? area / rewindingWidthM : 0; const rewindingSpeed = this.resolveRewindingSpeed(row)
      if (rewindingLength <= 0 || rewindingSpeed <= 0) return '-'
      const roundedMinutes = this.getRoundedMinutes(rewindingLength, rewindingSpeed); const hours = Math.floor(roundedMinutes / 60); const minutes = roundedMinutes % 60
      return `${hours}小时${minutes}分钟`
    },
    formatCoatingTimeWindow(row) {
      if (!row) return '-'
      const start = row.coating_start_time || row.coatingStartTime || row.coating_schedule_date || row.coatingScheduleDate
      const end = row.coating_end_time || row.coatingEndTime
      const startDate = this.parseDateTimeValue(start)
      if (startDate) { const area = Number(row.coating_area || 0); const coatingWidthMm = Number(row.coating_width || row.width || 0); const coatingWidthM = coatingWidthMm > 0 ? coatingWidthMm / 1000 : 0; const coatingLength = coatingWidthM > 0 ? area / coatingWidthM : Number(row.coating_length || row.length || 0); const coatingSpeed = this.resolveCoatingSpeed(row) || 40; const roundedMinutes = this.getRoundedMinutes(coatingLength, coatingSpeed); if (roundedMinutes > 0) { const calcEnd = new Date(startDate.getTime() + roundedMinutes * 60 * 1000); return this.formatTimeWindow(startDate, calcEnd) } }
      const endDate = this.parseDateTimeValue(end); if (startDate && endDate) return this.formatTimeWindow(startDate, endDate)
      return row.coating_date ? this.formatDateTime(row.coating_date) : '-'
    },
    rewindingEquipmentOptionLabel(eq) { const base = `${(eq && eq.equipmentCode) || ''}${eq && eq.equipmentName ? '-' + eq.equipmentName : ''}`; if (eq && eq.unavailableReason) return `${base}（不可用: ${eq.unavailableReason}）`; if (!eq || !eq.suggestedStart) return base; return `${base}（最早:${this.formatDateTime(eq.suggestedStart)}）` },
    getRewindingEquipmentOptions(row) { const key = `${'REWINDING'}@@${row ? (row.id || row.schedule_id || Math.random()) : Math.random()}`; const cached = this.rewindingEquipmentOptionsMap[key]; return (Array.isArray(cached) && cached.length) ? cached : (this.rewindingEquipmentList || []) },
    refreshRewindingLockSummary() { const rows = this.rewindingList || []; let unlockedRows = 0; let unlockedArea = 0; rows.forEach(r => { const ua = this.getUnlockedArea(r); if (ua > 0) { unlockedRows += 1; unlockedArea += ua } }); this.rewindingLockSummary = { unlockedRows, unlockedArea: Number(unlockedArea.toFixed(2)) } },
    rewindingRowClassName({ row }) { const currentD = Number(this.highlightRewindingDetailId || 0); const currentS = Number(this.highlightRewindingScheduleId || 0); if ((currentD > 0 && Number((row && row.order_detail_id) || 0) === currentD) || (currentS > 0 && Number((row && (row.schedule_id || row.id)) || 0) === currentS)) return 'rewinding-highlight-row'; return '' },
    handleRewindingEquipmentChange(row) { this.ensureRewindingSpeedForRows([row]); this.updateRewindingAvailability(row).then(() => { this.applyRewindingTimelinePreview() }) },
    handleRewindingDateChange(row) { this.updateRewindingAvailability(row).then(() => { this.applyRewindingTimelinePreview() }) },
    handleRewindingEditAction(row) { if (!row) return; if (!row.__editing) { this.$set(row, '__editing', true); this.refreshRewindingEquipmentOptions(row); return }; this.handleUpdateRewindingSchedule(row) },
    handleAddManualRewinding() {
      const row = { schedule_id: null, status: 'COATING_SCHEDULED', order_no: '手工补录', related_order_nos: '手工补录', customer_name: '-', material_code: '', material_name: '', schedule_qty: 1, coating_area: 0, rewinding_width: 500, rewinding_date: '', rewinding_equipment: '', manual_rewinding_speed: 0, __editing: true, __manual: true }
      this.rewindingList = [row, ...(this.rewindingList || [])]; this.$nextTick(() => { this.refreshRewindingEquipmentOptions(row) })
    },

    async loadRewindingSpeedMap() {
      try { const res = await getRewindingProcessParamsList({ current: 1, page: 1, size: 5000 }); const list = res.data?.list || res.data?.records || []; const speedMap = {}; list.forEach(item => { const materialCode = this.normalizeMaterialCode(item.materialCode || item.material_code); const equipmentCode = this.normalizeEquipmentCode(item.equipmentCode || item.equipment_code); const speed = Number(item.rewindingSpeed || item.rewinding_speed || 0); if (materialCode && speed > 0) { speedMap[this.makeSpeedKey(materialCode, equipmentCode)] = speed; if (!equipmentCode) speedMap[materialCode] = speed } }); this.rewindingSpeedMap = speedMap } catch (error) { console.error('加载复卷工艺参数失败', error) }
    },
    async ensureRewindingSpeedForRows(rows) {
      const list = Array.isArray(rows) ? rows : []; const missingPairs = [...new Set(list.map(r => { const code = this.normalizeMaterialCode(r.material_code || r.materialCode); const equipmentCode = this.resolveRewindingEquipmentCode(r); return this.makeSpeedKey(code, equipmentCode) }).filter(key => key && !this.rewindingSpeedMap[key]))]; if (!missingPairs.length) return
      const tasks = missingPairs.map(async key => { try { const [code, equipmentCode = ''] = String(key || '').split('@@'); if (!code) return; let speed = 0; const res = await getRewindingProcessParams(code, equipmentCode); const data = res.data || {}; speed = Number(data.rewindingSpeed || data.rewinding_speed || 0); if (speed <= 0) { const baseCode = this.toBaseMaterialCode(code); if (baseCode && baseCode !== code) { const baseRes = await getRewindingProcessParams(baseCode, equipmentCode); const baseData = baseRes.data || {}; speed = Number(baseData.rewindingSpeed || baseData.rewinding_speed || 0); if (speed > 0) { this.$set(this.rewindingSpeedMap, this.makeSpeedKey(baseCode, equipmentCode), speed); this.$set(this.rewindingSpeedMap, baseCode, speed) } } }; if (speed > 0) { this.$set(this.rewindingSpeedMap, this.makeSpeedKey(code, equipmentCode), speed); if (!equipmentCode) this.$set(this.rewindingSpeedMap, code, speed) } } catch (e) { /* ignore */ } }); await Promise.all(tasks)
    },
    async updateRewindingAvailability(row) { try { if (!row || !row.schedule_id || !row.rewinding_equipment) return; const res = await getRewindingAvailability({ scheduleId: row.schedule_id, rewindingEquipment: row.rewinding_equipment, rewindingDate: row.rewinding_date, manualRewindingSpeed: Number(row.manual_rewinding_speed || 0) > 0 ? Number(row.manual_rewinding_speed) : null, looseDurationMode: true }); if (res.code === 200 || res.code === 20000) { const data = res.data || {}; if (data.suggestedStart) this.$set(row, 'rewinding_date', data.suggestedStart); if (data.warning) this.$message.warning(data.warning) } } catch (e) { this.$message.warning(this.parseApiError(e, '未能获取复卷机台空闲时间')) } },
    applyRewindingTimelinePreview() { const rows = this.rewindingList || []; if (!rows.length) return; const cursorByEquipment = {}; rows.forEach(row => { const equipmentCode = this.resolveRewindingEquipmentCode(row); if (!equipmentCode) return; const startRaw = row.rewinding_start_time || row.rewinding_date; let start = this.toDateObj(startRaw); if (!start) return; const durationMinutes = this.calcRewindingMinutes(row); if (durationMinutes <= 0) return; start = this.normalizePreviewStart(start, durationMinutes, equipmentCode); const cursor = cursorByEquipment[equipmentCode]; if (cursor && start.getTime() < cursor.getTime()) { start = new Date(cursor.getTime()); start = this.normalizePreviewStart(start, durationMinutes, equipmentCode); if (row.__editing) this.$set(row, 'rewinding_date', this.toDateTimeString(start)) }; const end = new Date(start.getTime() + durationMinutes * 60000); cursorByEquipment[equipmentCode] = end }) },
    async refreshRewindingEquipmentOptions(row) { if (!row || !row.schedule_id) return; const optionKey = `${'REWINDING'}@@${row ? (row.id || row.schedule_id || Math.random()) : Math.random()}`; const loadingKey = `REWINDING@${optionKey}`; if (this.equipmentOptionLoadingMap[loadingKey]) return; this.$set(this.equipmentOptionLoadingMap, loadingKey, true); try { const tasks = (this.rewindingEquipmentList || []).map(async eq => { const equipmentCode = eq && eq.equipmentCode; if (!equipmentCode) return null; try { const res = await getRewindingAvailability({ scheduleId: row.schedule_id, rewindingEquipment: equipmentCode, rewindingDate: row.rewinding_date, manualRewindingSpeed: Number(row.manual_rewinding_speed || 0) > 0 ? Number(row.manual_rewinding_speed) : null, looseDurationMode: true }); if (!(res.code === 200 || res.code === 20000)) return null; const data = res.data || {}; if (!data.suggestedStart) return { ...eq, unavailableReason: '机台暂无可排时间', _sortTs: Number.MAX_SAFE_INTEGER, _available: false }; return { ...eq, suggestedStart: data.suggestedStart, _sortTs: this.toDateObj(data.suggestedStart) ? this.toDateObj(data.suggestedStart).getTime() : Number.MAX_SAFE_INTEGER, _available: true } } catch (e) { return { ...eq, unavailableReason: this.parseApiError(e, '未维护机台能力参数'), _sortTs: Number.MAX_SAFE_INTEGER, _available: false } } }); const resolved = (await Promise.all(tasks)).filter(Boolean); resolved.sort((a, b) => { const av = Number(!!a._available); const bv = Number(!!b._available); if (av !== bv) return bv - av; const t = Number(a._sortTs || Number.MAX_SAFE_INTEGER) - Number(b._sortTs || Number.MAX_SAFE_INTEGER); if (t !== 0) return t; return String(a.equipmentCode || '').localeCompare(String(b.equipmentCode || '')) }); if (resolved.length) this.$set(this.rewindingEquipmentOptionsMap, optionKey, resolved); else this.$set(this.rewindingEquipmentOptionsMap, optionKey, this.rewindingEquipmentList || []) } finally { this.$set(this.equipmentOptionLoadingMap, loadingKey, false) } },
    handleRewindingEquipmentDropdownVisible(row, visible) { if (visible) this.refreshRewindingEquipmentOptions(row) },

    async loadRewindingOrders() { this.rewindingLoading = true; try { if (!Object.keys(this.rewindingSpeedMap).length) await this.loadRewindingSpeedMap(); const res = await getCoatingCompletedOrders({ current: this.rewindingPage, size: this.rewindingPageSize }); if (res.code === 200 || res.code === 20000) { const pageData = res.data || {}; const records = pageData.records || pageData.list || []; const mappedRewinding = records.map(item => { const statusText = String(item.status || '').trim().toUpperCase(); const hasPlan = this.hasRewindingPlan(item); const isScheduled = hasPlan; const isStock = String(item.schedule_type || '').toUpperCase() === 'STOCK'; const defaultStockStart = this.getNextDayEightClockString(); const planStart = (!isScheduled && isStock) ? defaultStockStart : (item.rewinding_start_time || item.rewinding_date || ''); const normalizedPlanStart = planStart && String(planStart).length === 10 ? `${planStart} 08:00:00` : planStart; const displayStatus = hasPlan ? statusText : 'COATING_SCHEDULED'; return { ...item, status: displayStatus, rewinding_date: normalizedPlanStart, rewinding_width: Number(item.rewinding_width || 0) > 0 ? Number(item.rewinding_width) : 500, __editing: !isScheduled, __manual: false } }); this.rewindingList = await this.enrichMaterialNamesFromSpec(mappedRewinding); this.refreshRewindingLockSummary(); await this.ensureRewindingSpeedForRows(this.rewindingList); this.applyRewindingTimelinePreview(); this.rewindingTotal = Number(pageData.total || 0) } else { this.rewindingList = []; this.rewindingLockSummary = { unlockedRows: 0, unlockedArea: 0 }; this.rewindingTotal = 0 } } catch (error) { this.$message.error('加载待复卷订单失败'); this.rewindingLockSummary = { unlockedRows: 0, unlockedArea: 0 } } finally { this.rewindingLoading = false; this.relayoutTable('rewindingTable') } },
    handleRewindingSizeChange(size) { this.rewindingPageSize = size; this.rewindingPage = 1; this.loadRewindingOrders() },
    handleRewindingPageChange(page) { this.rewindingPage = page; this.loadRewindingOrders() },
    getRewindingSortValue(row, key) { if (!row) return ''; if (key === 'spec') { const t = Number(row.thickness || 0); const w = Number(row.width || 0); const l = Number(row.length || 0); return t * 100000000 + w * 10000 + l }; if (['schedule_qty', 'rewinding_width'].includes(key)) return this.getSortNumericValue(row[key]); if (key === 'rewinding_area') return this.getSortNumericValue(this.getPlannedRewindingArea(row)); if (key === 'rewinding_roll_count') return this.getSortNumericValue(this.getRewindingRollCount(row)); if (key === 'rewinding_speed') return this.getSortNumericValue(this.resolveRewindingSpeed(row)); if (key === 'rewinding_duration') return this.getSortNumericValue(this.calcRewindingMinutes(row)); if (key === 'coating_date') return this.toDateValue(row.coating_start_time || row.coating_date); if (key === 'rewinding_date') return this.toDateValue(row.rewinding_date || row.rewinding_start_time); return this.getSortStringValue(row[key]) },
    getSortStringValue(value) { return String(value == null ? '' : value).toUpperCase() },
    getSortNumericValue(value) { return Number(value || 0) },
    toDateValue(value) { if (!value) return 0; const d = new Date(String(value).replace(' ', 'T')); return Number.isNaN(d.getTime()) ? 0 : d.getTime() },
    applyRewindingSort() { const src = Array.isArray(this.rewindingList) ? [...this.rewindingList] : []; const { prop, order } = this.rewindingSort || {}; if (!prop || !order) { this.rewindingList = src; return }; const factor = order === 'ascending' ? 1 : -1; src.sort((a, b) => { const av = this.getRewindingSortValue(a, prop); const bv = this.getRewindingSortValue(b, prop); if (av === bv) return 0; return av > bv ? factor : -factor }); this.rewindingList = src },
    handleRewindingSortChange({ prop, order, column }) { const key = (column && column.columnKey) || prop; this.rewindingSort = { prop: key, order: order || null }; this.applyRewindingSort() },
    handleRewindingPrintSelectionChange(selection) { this.rewindingPrintSelections = Array.isArray(selection) ? selection : [] },
    onExternalJumpToRewinding(e) { const { orderDetailId } = e.detail || {}; if (orderDetailId) { this.rewindingPage = 1; this.loadRewindingOrders().then(() => { const found = (this.rewindingList || []).find(r => Number(r.order_detail_id || 0) === Number(orderDetailId)); if (found) { this.highlightRewindingDetailId = Number(orderDetailId); this.highlightRewindingScheduleId = Number(found.schedule_id || found.id || 0); if (this.highlightRewindingTimer) clearTimeout(this.highlightRewindingTimer); this.highlightRewindingTimer = setTimeout(() => { this.highlightRewindingDetailId = null; this.highlightRewindingScheduleId = null }, 10000) } }) } },

    async handleUpdateRewindingSchedule(row) {
      if (!row.schedule_id || Number(row.schedule_id) <= 0) { this.$message.warning('手动添加行请先填写有效排程号'); return }
      if (!String(row.material_code || '').trim()) { this.$message.warning('请先填写料号'); return }
      if (!row.rewinding_date) { this.$message.warning('请选择复卷日期'); return }
      if (!row.rewinding_equipment) { this.$message.warning('请填写复卷机台号'); return }
      try { await this.ensureRowMaterialNameBySpec(row); const plannedArea = this.getPlannedRewindingArea(row); const res = await createRewindingSchedule({ scheduleId: row.schedule_id, rewindingArea: plannedArea, rewindingDate: row.rewinding_date, rewindingEquipment: row.rewinding_equipment, rewindingWidth: Number(row.rewinding_width || 500), manualRewindingSpeed: Number(row.manual_rewinding_speed || 0) > 0 ? Number(row.manual_rewinding_speed) : null, looseDurationMode: true }); if (res.code === 200 || res.code === 20000) { this.$message.success('复卷排程修改成功'); this.$set(row, '__editing', false); this.$set(row, 'status', 'REWINDING_SCHEDULED'); this.loadRewindingOrders() } else this.$message.error(res.message || '修改失败') } catch (err) { this.$message.error('修改失败: ' + (err.message || '未知错误')) }
    }
  }
}
</script>

<style scoped>
@import './manualScheduleShared.scss';
</style>