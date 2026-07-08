/**
 * manualSchedule 共享混入
 * 提取手动排程各页面共用的工具方法、API 引用、状态映射等
 */
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
  resetScheduleBySchedule,
  reportWork,
  getReportWorkList,
  getProcessMaterialIssues,
  getProcessMaterialIssueTemplate,
  issueProcessMaterial,
  getOrderItemsReadiness,
  updateReportWork,
  deleteReportWork,
  getShortageAnalysis,
  getLatestScheduleId,
  resumeSchedule
} from '@/api/manualSchedule'
import { getEquipmentList, getEquipmentScheduleConfigList } from '@/api/equipment'
import { getProcessParamsList, getProcessParams } from '@/api/processParams'
import { getRewindingProcessParamsList, getRewindingProcessParams } from '@/api/rewindingProcessParams'
import { getSlittingProcessParamsList, getSlittingProcessParams } from '@/api/slittingProcessParams'
import { getSpecByMaterialCode, getSpecSuggestions } from '@/api/tapeSpec'
import { getOrderDetailForProduction } from '@/api/sales'
import { getAllActiveTeams } from '@/api/staff'
import { parseTime } from '@/utils'
import QRCode from 'qrcode'
import uiConfig from '@/config/ui'

export default {
  data() {
    return {
      pageHeight: 800,
      tableHeight: 500,
      pageSizes: uiConfig.pageSizes,
      materialNameByCodeCache: {},
      materialSpecByCodeCache: {},
      materialSuggestionCache: {},
      materialSuggestionTimer: null,
      materialSuggestionQuerySeq: 0,
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
      // 订单预览
      orderInfoDialogVisible: false,
      orderDetailLoading: false,
      orderDetailInfo: null,
      orderQrCode: '',
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
      workReportContext: { width: 0, length: 0, processType: 'COATING' },
      materialIssueDialogVisible: false,
      materialIssueLoading: false,
      materialIssueSubmitting: false,
      materialIssueBOMLoading: false,
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
  methods: {
    // ========== 基础工具 ==========
    formatDateTime(value) {
      if (!value) return '-'
      const s = String(value)
      return s.length >= 16 ? s.substring(0, 16) : s
    },
    parseTime(time, pattern) { return parseTime(time, pattern) },
    normalizeMaterialCode(code) { return String(code || '').replace(/\s+/g, '').trim().toUpperCase() },
    normalizeEquipmentCode(code) { return String(code || '').replace(/\s+/g, '').trim().toUpperCase() },
    normalizeMaterialCodeInput(value) { return String(value || '').replace(/\s+/g, '').trim().toUpperCase() },
    formatArea(value) { return Number(value || 0).toFixed(2) },
    formatDateOnly(value) {
      const d = value instanceof Date ? value : this.parseDateTimeValue(value)
      if (!d) return ''
      const yyyy = d.getFullYear()
      const mm = String(d.getMonth() + 1).padStart(2, '0')
      const dd = String(d.getDate()).padStart(2, '0')
      return `${yyyy}-${mm}-${dd}`
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
    parseDateTimeValue(value) {
      if (!value) return null
      const text = String(value).trim()
      if (!text) return null
      const normalized = text.length === 10 ? `${text} 08:00:00` : text
      const date = new Date(normalized.replace(' ', 'T'))
      if (Number.isNaN(date.getTime())) return null
      return date
    },
    roundToTenMinuteDateTime(value) {
      const d = value instanceof Date ? new Date(value.getTime()) : this.toDateObj(value)
      if (!d) return ''
      d.setSeconds(0, 0)
      const minute = d.getMinutes()
      const roundedMinute = Math.ceil(minute / 10) * 10
      if (roundedMinute >= 60) { d.setHours(d.getHours() + 1, 0, 0, 0) }
      else { d.setMinutes(roundedMinute, 0, 0) }
      return this.toDateTimeString(d)
    },
    getNextDayEightClockString(baseTime = new Date()) {
      const date = baseTime instanceof Date ? new Date(baseTime.getTime()) : new Date()
      const safeDate = Number.isNaN(date.getTime()) ? new Date() : date
      safeDate.setDate(safeDate.getDate() + 1)
      safeDate.setHours(8, 0, 0, 0)
      return this.toDateTimeString(safeDate)
    },
    parseApiError(error, fallback = '操作失败') {
      return (error && error.response && error.response.data && (error.response.data.msg || error.response.data.message)) || error.message || fallback
    },

    // ========== 规格/料号 ==========
    formatOrderSpec(row) {
      if (!row) return '-'
      const t = row.thickness != null && row.thickness !== '' ? `${row.thickness}μm` : '-'
      const w = row.width != null && row.width !== '' ? `${row.width}mm` : '-'
      const l = row.length != null && row.length !== '' ? `${row.length}m` : '-'
      return `${t}*${w}*${l}`
    },
    formatItemSpec(item) {
      if (!item) return '-'
      const thickness = item.thickness || item.materialThickness || item.material_thickness || ''
      const width = item.width || item.materialWidth || item.material_width || ''
      const length = item.length || item.materialLength || item.material_length || ''
      if (thickness && width && length) return `${thickness}μm*${width}mm*${length}m`
      return item.materialSpec || item.specification || item.spec || '-'
    },
    formatThickness(row) {
      const t = Number((row && (row.thickness != null ? row.thickness : row.total_thickness)) || 0)
      if (!Number.isFinite(t) || t <= 0) return '-'
      return Number.isInteger(t) ? String(t) : String(Number(t.toFixed(2)))
    },
    getMaterialCodeCandidates(code) {
      const normalized = this.normalizeMaterialCode(code)
      if (!normalized) return []
      const list = []
      const seen = new Set()
      let current = normalized
      while (current && !seen.has(current)) {
        list.push(current)
        seen.add(current)
        const lastDashIndex = current.lastIndexOf('-')
        if (lastDashIndex < 0) break
        current = current.slice(0, lastDashIndex).replace(/-+$/, '')
        if (!current) break
      }
      return [...new Set(list)]
    },
    toBaseMaterialCode(code) {
      const normalized = this.normalizeMaterialCode(code)
      if (!normalized) return ''
      return normalized.replace(/-\d+-\d+$/, '')
    },
    toFamilyMaterialCode(code) {
      const baseCode = this.toBaseMaterialCode(code)
      if (!baseCode) return ''
      return baseCode.replace(/-[A-Z0-9]+$/, '')
    },
    makeSpeedKey(materialCode, equipmentCode) {
      const material = this.normalizeMaterialCode(materialCode)
      const equipment = this.normalizeEquipmentCode(equipmentCode)
      return `${material}@@${equipment}`
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
          let name = ''; let thickness = null
          try {
            const res = await getSpecByMaterialCode(code)
            const spec = (res && (res.code === 200 || res.code === 20000)) ? (res.data || {}) : {}
            name = String(spec.productName || spec.materialName || spec.name || '').trim()
            const t = Number(spec.totalThickness != null ? spec.totalThickness : spec.total_thickness)
            thickness = Number.isFinite(t) ? t : null
          } catch (e) { name = ''; thickness = null }
          this.$set(this.materialNameByCodeCache, key, name)
          this.$set(this.materialSpecByCodeCache, key, { materialCode: code, productName: name, width: null, thickness })
        }))
      }
      return list.map(row => {
        const code = String((row && (row.material_code || row.materialCode)) || '').trim()
        const key = this.normalizeMaterialCode(code)
        const masterName = String((key && this.materialNameByCodeCache[key]) || '').trim()
        const spec = (key && this.materialSpecByCodeCache[key]) || {}
        const rowThickness = Number(spec.thickness)
        const patch = {}
        if (masterName) { patch.material_name = masterName; patch.materialName = masterName }
        if (Number.isFinite(rowThickness) && rowThickness > 0 && !(Number(row.thickness || 0) > 0)) { patch.thickness = rowThickness }
        if (!Object.keys(patch).length) return row
        return { ...row, ...patch }
      })
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
      if (cachedName && String(row.material_name || '').trim()) return
      if (cachedName) { this.$set(row, 'material_name', cachedName) }
      if (cachedName && Number(row.thickness || 0) > 0) return
      try {
        const specRes = await getSpecByMaterialCode(materialCode)
        const ok = specRes && (specRes.code === 200 || specRes.code === 20000)
        const spec = ok ? (specRes.data || {}) : {}
        const productName = String(spec.productName || spec.materialName || spec.name || '').trim()
        const thickness = Number(spec.totalThickness != null ? spec.totalThickness : spec.total_thickness)
        if (productName) { this.$set(row, 'material_name', productName); this.$set(this.materialNameByCodeCache, key, productName) }
        if (Number.isFinite(thickness) && thickness > 0) { this.$set(row, 'thickness', thickness) }
        this.$set(this.materialSpecByCodeCache, key, {
          materialCode, productName: productName || String(this.materialNameByCodeCache[key] || '').trim(),
          width: specCache ? specCache.width : null,
          thickness: Number.isFinite(thickness) ? thickness : (specCache ? specCache.thickness : null)
        })
      } catch (e) { /* ignore */ }
    },
    queryTapeSpecByMaterialCode(queryString, cb) {
      const keyword = this.normalizeMaterialCodeInput(queryString)
      if (!keyword) { cb([]); return }
      const cached = this.materialSuggestionCache[keyword]
      if (Array.isArray(cached)) { cb(cached); return }
      const prefixHit = this.findMaterialSuggestionsFromCache(keyword)
      if (prefixHit.length) { cb(prefixHit) }
      if (this.materialSuggestionTimer) clearTimeout(this.materialSuggestionTimer)
      const requestSeq = ++this.materialSuggestionQuerySeq
      this.materialSuggestionTimer = setTimeout(async() => {
        const suggestions = await this.fetchMaterialSuggestions(keyword)
        if (requestSeq !== this.materialSuggestionQuerySeq) return
        this.$set(this.materialSuggestionCache, keyword, suggestions)
        cb(suggestions)
      }, 150)
    },
    findMaterialSuggestionsFromCache(keyword) {
      const normalizedKeyword = this.normalizeMaterialCodeInput(keyword)
      if (!normalizedKeyword) return []
      const cacheKeys = Object.keys(this.materialSuggestionCache || {})
        .filter(key => normalizedKeyword.startsWith(key) && key !== normalizedKeyword)
        .sort((a, b) => b.length - a.length)
      if (!cacheKeys.length) return []
      const source = this.materialSuggestionCache[cacheKeys[0]] || []
      return source
        .filter(item => this.normalizeMaterialCodeInput(item.materialCode || item.value).includes(normalizedKeyword))
        .slice(0, 20)
    },
    async fetchMaterialSuggestions(keyword) {
      const normalizedKeyword = this.normalizeMaterialCodeInput(keyword)
      if (!normalizedKeyword) return []
      return this.requestMaterialSuggestionsByKeyword(normalizedKeyword)
    },
    async requestMaterialSuggestionsByKeyword(keyword) {
      try {
        const res = await getSpecSuggestions(keyword, 5)
        const ok = res && (res.code === 200 || res.code === 20000)
        const list = ok ? (res.data || []) : []
        return (list || []).map(item => {
          const materialCode = String(item.materialCode || item.material_code || '').trim().toUpperCase()
          const productName = String(item.productName || item.materialName || item.material_name || '').trim()
          const width = Number(item.width != null ? item.width : item.coatingWidth)
          const thickness = Number(item.totalThickness != null ? item.totalThickness : item.total_thickness)
          const normalizedCode = this.normalizeMaterialCode(materialCode)
          if (normalizedCode) {
            this.$set(this.materialNameByCodeCache, normalizedCode, productName)
            this.$set(this.materialSpecByCodeCache, normalizedCode, {
              materialCode, productName, width: Number.isFinite(width) ? width : null, thickness: Number.isFinite(thickness) ? thickness : null
            })
          }
          return { value: materialCode, materialCode, productName, width: Number.isFinite(width) ? width : null, thickness: Number.isFinite(thickness) ? thickness : null }
        }).filter(item => item.materialCode)
      } catch (e) { return [] }
    },
    handleManualMaterialInput(row, value) {
      if (!row) return
      const code = this.normalizeMaterialCodeInput(value)
      this.$set(row, 'material_code', code)
      const key = this.normalizeMaterialCode(code)
      if (!key) { this.$set(row, 'material_name', ''); return }
      const cachedName = String(this.materialNameByCodeCache[key] || '').trim()
      if (cachedName) { this.$set(row, 'material_name', cachedName) }
      const spec = this.materialSpecByCodeCache[key]
      const thickness = Number(spec && spec.thickness)
      if (Number.isFinite(thickness) && thickness > 0) { this.$set(row, 'thickness', thickness) }
    },
    handleManualMaterialSelect(row, item, mode = 'coating') {
      if (!row || !item) return
      const materialCode = String(item.materialCode || item.value || '').trim().toUpperCase()
      const productName = String(item.productName || '').trim()
      this.$set(row, 'material_code', materialCode)
      this.$set(row, 'material_name', productName)
      const width = Number(item.width)
      if (Number.isFinite(width) && width > 0 && mode === 'coating') this.$set(row, 'coating_width', Math.round(width))
      if (Number.isFinite(width) && width > 0 && mode === 'rewinding') this.$set(row, 'rewinding_width', Math.round(width))
      const thickness = Number(item.thickness)
      if (Number.isFinite(thickness) && thickness > 0) this.$set(row, 'thickness', thickness)
      const key = this.normalizeMaterialCode(materialCode)
      if (key) {
        this.$set(this.materialNameByCodeCache, key, productName)
        const oldSpec = this.materialSpecByCodeCache[key] || {}
        this.$set(this.materialSpecByCodeCache, key, { ...oldSpec, materialCode, productName, width: Number.isFinite(Number(item.width)) ? Number(item.width) : oldSpec.width, thickness: Number.isFinite(Number(item.thickness)) ? Number(item.thickness) : oldSpec.thickness })
      }
    },

    // ========== 路由判定 ==========
    getRouteType(row) {
      const routeType = String((row && row.route_type) || '').toUpperCase()
      if (routeType) return routeType
      const width = Number((row && row.width) || 0)
      const length = Number((row && row.length) || 0)
      if (width > 450 && length < 1500) return 'REWINDING_SHIP'
      if (width > 450 && length > 1500) return 'COATING_SHIP'
      return 'SLITTING_SHIP'
    },
    resolveDefaultReportProcessType(row) {
      const routeType = this.getRouteType(row)
      if (routeType === 'COATING_SHIP') return 'COATING'
      if (routeType === 'REWINDING_SHIP') return 'REWINDING'
      return 'SLITTING'
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
    calcProductionCompleted(row) {
      const orderQty = Number((row && row.order_qty) || 0)
      const completedQty = this.getReportedCompletedQty(row)
      return orderQty > 0 && completedQty >= orderQty
    },

    // ========== 状态映射 ==========
    lockStatusType(status) { const map = { NOT_STARTED: 'danger', UNLOCKED: 'danger', PARTIAL: 'warning', LOCKED: 'success' }; return map[String(status || '').toUpperCase()] || 'info' },
    lockStatusText(status) { const map = { NOT_STARTED: '未锁定', UNLOCKED: '未锁定', PARTIAL: '部分锁定', LOCKED: '已锁定' }; const key = String(status || '').toUpperCase(); return map[key] || (status || '-') },
    readinessStatusType(status) { const map = { READY: 'success', READY_BY_ETA: 'warning', SHORTAGE: 'danger', RISK: 'info', UNKNOWN: 'info' }; return map[String(status || '').toUpperCase()] || 'info' },
    readinessStatusText(status, fallbackText) { const map = { READY: '已齐套', READY_BY_ETA: '预计齐套', SHORTAGE: '缺料', RISK: '风险', UNKNOWN: '待评估' }; const key = String(status || '').toUpperCase(); return map[key] || fallbackText || '待评估' },
    isReadinessBlocked(row) { const code = String((row && row.readiness_status_code) || '').toUpperCase(); return code === 'SHORTAGE' },
    statusType(status) { const map = { PENDING: 'info', COATING_SCHEDULED: 'warning', REWINDING_SCHEDULED: 'primary', COMPLETED: 'success', TERMINATED: 'danger', CANCELLED: 'info' }; return map[status] || 'info' },
    statusText(status) { const map = { PENDING: '待确认', COATING_SCHEDULED: '涂布已排', REWINDING_SCHEDULED: '复卷已排', COMPLETED: '已完成', TERMINATED: '已终止', CANCELLED: '已取消' }; return map[status] || status },
    getProcessTypeLabel(processType) { const p = String(processType || '').toUpperCase(); if (p === 'COATING') return '涂布'; if (p === 'REWINDING') return '复卷'; if (p === 'SLITTING') return '分切'; return p || '-' },
    formatScheduleStatus(status) { const s = String(status || '').toUpperCase(); if (s === 'PENDING') return { label: '待确认', type: 'info' }; if (s === 'REWINDING_SCHEDULED') return { label: '复卷已排', type: 'success' }; if (s === 'COATING_SCHEDULED') return { label: '待复卷', type: 'warning' }; if (s === 'CONFIRMED') return { label: '已确认', type: 'primary' }; if (s === 'TERMINATED') return { label: '已终止', type: 'danger' }; return { label: status || '-', type: 'info' } },
    formatSlittingStatus(status) { const s = String(status || '').toUpperCase(); if (s === 'PENDING') return { label: '待确认', type: 'info' }; if (s === 'REWINDING_SCHEDULED') return { label: '待分切', type: 'warning' }; if (s === 'CONFIRMED') return { label: '分切已排', type: 'success' }; if (s === 'COMPLETED') return { label: '已完成', type: 'success' }; if (s === 'TERMINATED') return { label: '已终止', type: 'danger' }; return { label: status || '-', type: 'info' } },
    formatProcessCompletionRate(reportedQty, plannedQty) { const reported = Number(reportedQty || 0); const planned = Number(plannedQty || 0); if (!(planned > 0)) return '0%'; const ratio = Math.min(100, Math.max(0, (reported / planned) * 100)); return `${ratio.toFixed(1)}%` },
    getUnlockedArea(row) { if (!row) return 0; const n = Number(row.unlocked_area != null ? row.unlocked_area : (row.unlockedArea != null ? row.unlockedArea : 0)); return Number.isFinite(n) && n > 0 ? n : 0 },
    hasLockRisk(row) { return this.getUnlockedArea(row) > 0 },
    isStockScheduleRow(row) { return String((row && row.schedule_type) || '').toUpperCase() === 'STOCK' },
    resolveNumericScheduleId(row) { if (!row) return 0; const candidates = [row.schedule_id, row.id, row.scheduleId]; for (const candidate of candidates) { if (candidate == null) continue; const text = String(candidate).trim(); if (!text) continue; if (/^\d+$/.test(text)) { const id = Number(text); if (Number.isFinite(id) && id > 0) return id } } return 0 },
    equipmentName(equipmentId) { if (!equipmentId) return '-'; const equipment = this.equipmentList.find(eq => String(eq.id) === String(equipmentId)); return equipment ? equipment.equipmentName : equipmentId },
    packagingTeamName(teamName) { const raw = String(teamName || '').trim(); if (!raw) return '-'; const team = (this.packagingTeamList || []).find(item => String(item.teamName || '').trim() === raw); return team ? team.teamName : raw },

    // ========== 设备加载 ==========
    async loadEquipmentList() {
      try {
        const [coatingRes, rewindingRes, slittingRes] = await Promise.all([
          getEquipmentList({ equipmentType: 'coating', pageSize: 100 }),
          getEquipmentList({ equipmentType: 'rewinding', pageSize: 100 }),
          getEquipmentList({ equipmentType: 'slitting', pageSize: 100 })
        ])
        if (coatingRes.code === 200 || coatingRes.code === 20000) this.equipmentList = coatingRes.data.records || coatingRes.data || []
        if (rewindingRes.code === 200 || rewindingRes.code === 20000) this.rewindingEquipmentList = rewindingRes.data.records || rewindingRes.data || []
        if (slittingRes.code === 200 || slittingRes.code === 20000) this.slittingEquipmentList = slittingRes.data.records || slittingRes.data || []
      } catch (error) { console.error('加载设备列表失败', error) }
    },
    async loadCoatingTeamList() {
      try {
        const res = await getAllActiveTeams()
        if (res.code === 200 || res.code === 20000) {
          const list = Array.isArray(res.data) ? res.data : (res.data && res.data.records) || []
          this.packagingTeamList = list
        }
      } catch (error) { console.error('加载班组失败', error) }
    },
    async loadEquipmentScheduleConfigMap() {
      try {
        const res = await getEquipmentScheduleConfigList({})
        if (res && (res.code === 200 || res.code === 20000)) {
          const configMap = {}
          ;(res.data || []).forEach(item => {
            const equipmentCode = this.normalizeEquipmentCode(item.equipmentCode)
            if (!equipmentCode) return
            configMap[equipmentCode] = { initialScheduleTime: item.initialScheduleTime || '', cycleEndTime: item.cycleEndTime || '', nextWeekStartTime: item.nextWeekStartTime || '08:00:00', weekendRest: Number(item.weekendRest == null ? 1 : item.weekendRest), sundayDisabled: Number(item.sundayDisabled == null ? 1 : item.sundayDisabled), enabled: Number(item.enabled == null ? 1 : item.enabled) }
          })
          this.equipmentScheduleConfigMap = configMap
        }
      } catch (error) { console.error('加载设备排程状态配置失败', error) }
    },

    // ========== 速度相关 ==========
    getRoundedMinutes(length, speed) { const l = Number(length || 0); const s = Number(speed || 0); if (l <= 0 || s <= 0) return 0; const rawMinutes = l / s; return Math.ceil(rawMinutes / 10) * 10 },
    resolveCoatingSpeed(row) {
      const manual = Number(row.manual_coating_speed || row.manualCoatingSpeed || 0); if (manual > 0) return manual
      const materialCode = this.normalizeMaterialCode(row.material_code || row.materialCode); if (!materialCode) return 0
      const equipmentCode = this.resolveEquipmentCode(row)
      const candidates = this.getMaterialCodeCandidates(materialCode)
      for (const code of candidates) {
        const exactEquipmentSpeed = Number(this.coatingSpeedMap[this.makeSpeedKey(code, equipmentCode)] || 0); if (exactEquipmentSpeed > 0) return exactEquipmentSpeed
        const exactSpeed = Number(this.coatingSpeedMap[code] || 0); if (exactSpeed > 0) return exactSpeed
      }
      const matchedKey = Object.keys(this.coatingSpeedMap).find(key => { const mapMaterial = this.normalizeMaterialCode(String(key).split('@@')[0]); if (!mapMaterial) return false; return candidates.some(code => code.startsWith(mapMaterial) || mapMaterial.startsWith(code)) })
      return matchedKey ? Number(this.coatingSpeedMap[matchedKey] || 0) : 0
    },
    resolveEquipmentCode(row) {
      const direct = this.normalizeEquipmentCode(row.coating_equipment_code || row.equipment_code); if (direct) return direct
      const equipmentId = String(row.coating_equipment || row.equipment_id || ''); if (!equipmentId) return ''
      const eq = (this.equipmentList || []).find(item => String(item.id) === equipmentId)
      return this.normalizeEquipmentCode(eq && eq.equipmentCode)
    },
    resolveRewindingEquipmentCode(row) {
      const direct = this.normalizeEquipmentCode(row.rewinding_equipment_code || row.rewinding_equipment); if (direct) return direct; return ''
    },
    resolveRewindingSpeed(row) {
      const manual = Number(row.manual_rewinding_speed || row.manualRewindingSpeed || 0); if (manual > 0) return manual
      const materialCode = this.normalizeMaterialCode(row.material_code || row.materialCode); if (!materialCode) return 0
      const equipmentCode = this.resolveRewindingEquipmentCode(row)
      const exactEq = Number(this.rewindingSpeedMap[this.makeSpeedKey(materialCode, equipmentCode)] || 0); if (exactEq > 0) return exactEq
      const exact = Number(this.rewindingSpeedMap[materialCode] || 0); if (exact > 0) return exact
      const baseCode = this.toBaseMaterialCode(materialCode)
      const baseEq = Number(this.rewindingSpeedMap[this.makeSpeedKey(baseCode, equipmentCode)] || 0); if (baseEq > 0) return baseEq
      return Number(this.rewindingSpeedMap[baseCode] || 0)
    },
    calcRewindingMinutes(row) {
      const persistedMinutes = Number(row.rewinding_duration_minutes || row.rewindingDurationMinutes || 0); if (persistedMinutes > 0) return persistedMinutes
      const area = Number(this.getPlannedRewindingArea(row) || 0)
      const rewindingWidthMm = Number(row.rewinding_width || 0); const rewindingWidthM = rewindingWidthMm > 0 ? rewindingWidthMm / 1000 : 0
      const rewindingLength = rewindingWidthM > 0 ? area / rewindingWidthM : 0
      const rewindingSpeed = this.resolveRewindingSpeed(row)
      if (rewindingLength <= 0 || rewindingSpeed <= 0) return 0
      return this.getRoundedMinutes(rewindingLength, rewindingSpeed)
    },
    resolveOrderSpecLength(row) {
      if (!row) return 0
      const direct = Number(row.length || row.order_length || row.orderLength || row.lengthM || 0); if (direct > 0) return direct
      const specText = String(row.spec || row.order_spec || row.orderSpec || this.formatOrderSpec(row) || '')
      const match = specText.match(/(\d+(?:\.\d+)?)\s*m\s*$/i); if (match && Number(match[1]) > 0) return Number(match[1])
      const parts = specText.split('*').map(s => String(s || '').trim())
      if (parts.length >= 3) { const last = parts[parts.length - 1]; const n = Number(String(last).replace(/[^\d.]/g, '')); if (n > 0) return n }
      return 0
    },
    getPlannedRewindingArea(row) {
      if (!row) return 0
      const demandArea = this.getOrderDemandArea(row); if (demandArea > 0) return demandArea
      const rewindingArea = Number(row.rewinding_scheduled_area || row.rewindingScheduledArea || 0); if (rewindingArea > 0) return rewindingArea
      const remainingArea = Number(row.remaining_coating_area || row.remainingCoatingArea || 0); if (remainingArea > 0) return remainingArea
      const area = Number(row.coating_area || 0); if (area > 0) return area
      const width = Number(row.width || 0); const length = Number(row.length || 0); const qty = Number(row.schedule_qty || 0)
      if (width > 0 && length > 0 && qty > 0) return (width / 1000) * length * qty
      return 0
    },
    getOrderDemandArea(row) {
      if (!row) return 0
      const width = Number(row.width || row.order_width || row.orderWidth || 0)
      const length = this.resolveOrderSpecLength(row)
      const qty = Number(row.schedule_qty || row.remaining_qty || row.order_qty || row.qty || 0)
      if (width <= 0 || length <= 0 || qty <= 0) return 0
      return Number(((width / 1000) * length * qty).toFixed(2))
    },
    getRewindingRollCount(row) {
      if (!row) return 0
      const area = Number(this.getPlannedRewindingArea(row) || 0)
      const rewindingWidth = Number(row.rewinding_width || 0); const length = this.resolveOrderSpecLength(row)
      if (area <= 0 || rewindingWidth <= 0 || length <= 0) return 0
      const singleRollArea = (rewindingWidth / 1000) * length; if (singleRollArea <= 0) return 0
      return Math.ceil(area / singleRollArea - 1e-9)
    },
    calcReportedAreaBySpec(row, qtyLike) {
      const qty = Number(qtyLike || 0); if (!(qty > 0)) return 0
      const width = Number((row && row.width) || 0); if (!(width > 0)) return 0
      const length = Number((row && row.length) || 0)
      if (length > 0) return Number(((width / 1000) * length * qty).toFixed(2))
      return Number(((width / 1000) * qty).toFixed(2))
    },
    getScheduleId(row) { return row.id || row.schedule_id },
    formatTimeWindow(startDate, endDate) {
      if (!startDate || !endDate) return '-'
      const fmt = d => d ? `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${d.getHours()}时` : '-'
      return `${fmt(startDate)}~${fmt(endDate)}`
    },
    timeWindowLine(text, lineIndex) { const raw = String(text || '-').trim(); if (!raw || raw === '-') return lineIndex === 0 ? '-' : ''; const parts = raw.split('~'); if (parts.length < 2) return lineIndex === 0 ? raw : ''; return parts[lineIndex] || '' },

    // ========== 共享对话框：订单预览 ==========
    async handleOrderNoClick(row) {
      if (!row || !row.order_no) return
      this.orderInfoDialogVisible = true; this.orderDetailLoading = true; this.orderDetailInfo = null; this.orderQrCode = ''
      try {
        const res = await getOrderDetailForProduction(row.order_no)
        if (res && (res.code === 200 || res.code === 20000)) { this.orderDetailInfo = res.data; this.generateOrderQrCode(row.order_no) }
        else this.$message.error(res.message || res.msg || '获取订单详情失败')
      } catch (e) { console.error('Fetch order detail error:', e); this.$message.error('获取订单详情发生错误') }
      finally { this.orderDetailLoading = false }
    },
    async generateOrderQrCode(text) { if (!text) return; try { this.orderQrCode = await QRCode.toDataURL(text, { width: 80, margin: 1 }) } catch (e) { console.error('QR code error:', e) } },

    // ========== 共享对话框：报工 ==========
    resetWorkReportForm() {
      this.workReportForm = { scheduleId: null, orderDetailId: null, orderNo: '', processType: 'COATING', startTime: '', endTime: '', producedQty: null, proceedNextProcess: true, operator: '', remark: '' }
      this.workReportPlannedQty = 0; this.workReportScanCode = ''; this.workReportEditingId = null
      this.workReportContext = { width: 0, length: 0, processType: 'COATING' }
    },
    computeWorkReportArea(item) {
      const direct = Number((item && (item.produced_area != null ? item.produced_area : item.producedArea != null ? item.producedArea : item.reported_area != null ? item.reported_area : item.reportedArea)) || 0)
      if (Number.isFinite(direct) && direct > 0) return Number(direct.toFixed(2))
      const qty = Number((item && item.produced_qty) || 0); if (!(qty > 0)) return 0
      const processType = String((item && (item.process_type || item.processType)) || (this.workReportContext && this.workReportContext.processType) || (this.workReportForm && this.workReportForm.processType) || '').toUpperCase()
      const width = Number((this.workReportContext && this.workReportContext.width) || 0); if (!(width > 0)) return 0
      const length = Number((this.workReportContext && this.workReportContext.length) || 0)
      if (processType === 'COATING') return Number(((width / 1000) * qty).toFixed(2))
      if (length > 0) return Number(((width / 1000) * length * qty).toFixed(2))
      return 0
    },
    sumWorkReportProducedQty(list) { if (!Array.isArray(list) || !list.length) return 0; return Number(list.reduce((sum, item) => sum + Number((item && item.produced_qty) || 0), 0).toFixed(2)) },
    refreshWorkReportSuggestedQty() { if (this.workReportEditingId) return; const planned = Number(this.workReportPlannedQty || 0); if (!(planned > 0)) return; const remain = Number(Math.max(planned - this.sumWorkReportProducedQty(this.workReportList), 0).toFixed(2)); this.workReportForm.producedQty = remain > 0 ? remain : null },
    async openWorkReportDialog(row, processType) {
      const scheduleId = this.getScheduleId(row); const orderDetailId = Number((row && row.order_detail_id) || 0)
      if (!scheduleId && !orderDetailId) { this.$message.warning('当前记录缺少排程ID和订单明细ID，不能报工'); return }
      const now = this.toDateTimeString(new Date())
      const normalizedProcessType = String(processType || this.resolveDefaultReportProcessType(row)).toUpperCase()
      const plannedQty = normalizedProcessType === 'REWINDING' ? this.getRewindingRollCount(row) : Number(row.schedule_qty || 0)
      this.workReportPlannedQty = Number(plannedQty || 0)
      const detailLabel = orderDetailId > 0 ? ` - 明细号:${orderDetailId}` : ''
      this.workReportDialogTitle = `${this.getProcessTypeLabel(normalizedProcessType)}报工${detailLabel}`
      this.workReportForm = { scheduleId, orderDetailId: orderDetailId > 0 ? orderDetailId : null, orderNo: String((row && row.order_no) || ''), processType: normalizedProcessType, startTime: now, endTime: now, producedQty: Number(plannedQty || 0) > 0 ? Number(plannedQty) : null, proceedNextProcess: true, operator: '', remark: '' }
      this.workReportContext = { width: Number((row && row.width) || 0), length: Number((row && row.length) || 0), processType: normalizedProcessType }
      this.workReportScanCode = ''; this.workReportDialogVisible = true
      if (scheduleId) await this.loadWorkReportList(); else this.workReportList = []
    },
    async loadWorkReportList() {
      if (!this.workReportForm.scheduleId || !this.workReportForm.processType) { this.workReportList = []; return }
      this.workReportLoading = true
      try {
        const res = await getReportWorkList({ scheduleId: this.workReportForm.scheduleId, processType: this.workReportForm.processType })
        if (res.code === 200 || res.code === 20000) { this.workReportList = (res.data && Array.isArray(res.data.records)) ? res.data.records : (Array.isArray(res.data) ? res.data : []); this.refreshWorkReportSuggestedQty() }
        else { this.workReportList = []; this.refreshWorkReportSuggestedQty() }
      } catch (e) { this.workReportList = []; this.refreshWorkReportSuggestedQty(); this.$message.error(this.parseApiError(e, '加载报工历史失败')) }
      finally { this.workReportLoading = false }
    },
    async submitWorkReport() {
      if (!this.workReportForm.scheduleId && !this.workReportForm.orderDetailId) { this.$message.warning('缺少排程ID或订单明细ID'); return }
      if (!this.workReportForm.startTime || !this.workReportForm.endTime) { this.$message.warning('请填写开始/结束时间'); return }
      const qty = Number(this.workReportForm.producedQty || 0); if (!(qty > 0)) { this.$message.warning('生产数量必须大于0'); return }
      if (String(this.workReportForm.processType || '').toUpperCase() === 'SLITTING' && !Number.isInteger(qty)) { this.$message.warning('分切报工请填写整数卷数'); return }
      this.workReportSubmitting = true
      try {
        const payload = { scheduleId: this.workReportForm.scheduleId, orderDetailId: this.workReportForm.orderDetailId, processType: this.workReportForm.processType, startTime: this.workReportForm.startTime, endTime: this.workReportForm.endTime, producedQty: qty, proceedNextProcess: this.workReportForm.proceedNextProcess, operator: this.workReportForm.operator, remark: this.workReportForm.remark }
        const res = this.workReportEditingId ? await updateReportWork({ ...payload, reportId: this.workReportEditingId }) : await reportWork(payload)
        if (res.code === 200 || res.code === 20000) {
          const result = res.data || {}
          const returnedScheduleId = Number(result.scheduleId || this.workReportForm.scheduleId || 0); const returnedOrderDetailId = Number(result.orderDetailId || this.workReportForm.orderDetailId || 0)
          if (returnedScheduleId > 0) { this.workReportForm.scheduleId = returnedScheduleId; this.applyReportedScheduleIdToRows(returnedOrderDetailId, returnedScheduleId) }
          this.$message.success(this.workReportEditingId ? '报工修改成功' : '报工提交成功')
          this.triggerWorkReportRefresh()
          window.dispatchEvent(new CustomEvent('sales:orders:refresh'))
        } else this.$message.error(res.message || (this.workReportEditingId ? '报工修改失败' : '报工提交失败'))
      } catch (e) { this.$message.error(this.parseApiError(e, this.workReportEditingId ? '报工修改失败' : '报工提交失败')) }
      finally { this.workReportSubmitting = false }
    },
    editWorkReportRow(row) {
      if (!row || !row.id) { this.$message.warning('缺少报工记录ID'); return }
      this.workReportEditingId = Number(row.id)
      this.workReportForm = { scheduleId: this.workReportForm.scheduleId, orderDetailId: this.workReportForm.orderDetailId, orderNo: this.workReportForm.orderNo, processType: this.workReportForm.processType, startTime: row.start_time || this.workReportForm.startTime, endTime: row.end_time || this.workReportForm.endTime, producedQty: Number(row.produced_qty || 0) > 0 ? Number(row.produced_qty) : this.workReportForm.producedQty, proceedNextProcess: Number(row.proceed_next_process || 0) === 1, operator: row.operator_name || this.workReportForm.operator, remark: row.remark || '' }
    },
    async deleteWorkReportRow(row) {
      if (!row || !row.id) { this.$message.warning('缺少报工记录ID'); return }
      try { await this.$confirm('确认删除该条报工记录？此操作不可恢复。', '提示', { type: 'warning' }) } catch (e) { return }
      try {
        const res = await deleteReportWork({ reportId: row.id })
        if (res.code === 200 || res.code === 20000) { this.$message.success('报工记录已删除'); this.triggerWorkReportRefresh(); window.dispatchEvent(new CustomEvent('sales:orders:refresh')) }
        else this.$message.error(res.message || '删除失败')
      } catch (e) { this.$message.error(this.parseApiError(e, '删除失败')) }
    },
    applyReportedScheduleIdToRows(orderDetailId, scheduleId) {
      const sid = Number(scheduleId || 0); const did = Number(orderDetailId || 0); if (!(sid > 0) || !(did > 0)) return
      const patch = rows => { if (!Array.isArray(rows)) return; rows.forEach(r => { if (Number((r && r.order_detail_id) || 0) === did) { this.$set(r, 'schedule_id', sid); if (!r.id) this.$set(r, 'id', sid) } }) }
      patch(this.orderList); patch(this.coatingList); patch(this.rewindingList); patch(this.slittingList)
    },
    handleWorkReportDialogClose() { this.workReportList = []; this.resetWorkReportForm() },
    applyWorkReportScan() {
      const raw = String(this.workReportScanCode || '').trim(); if (!raw) { this.$message.warning('请先扫码派工单明细二维码'); return }
      const row = this.findRowByWorkReportScan(raw)
      if (!row) { this.$message.warning('未找到对应明细，请检查二维码内容'); return }
      const processType = this.workReportForm.processType || this.resolveDefaultReportProcessType(row)
      this.openWorkReportDialog(row, processType)
    },
    findRowByWorkReportScan(code) {
      const text = String(code || '').trim(); if (!text) return null; const upper = text.toUpperCase(); const digits = upper.replace(/\D/g, '')
      const lists = []; if (Array.isArray(this.slittingList)) lists.push(...this.slittingList); if (Array.isArray(this.rewindingList)) lists.push(...this.rewindingList); if (Array.isArray(this.coatingList)) lists.push(...this.coatingList); if (Array.isArray(this.orderList)) lists.push(...this.orderList)
      const match = (row) => { const od = String((row && (row.order_detail_id || row.orderDetailId || row.detail_no || row.detailNo)) || '').trim(); const sid = String((row && (row.schedule_id || row.id)) || '').trim(); const orderNo = String((row && row.order_no) || '').trim().toUpperCase(); const material = String((row && row.material_code) || '').trim().toUpperCase(); if (od && (od === upper || od === digits)) return true; if (sid && (sid === upper || sid === digits)) return true; if (orderNo && orderNo === upper) return true; if (material && material === upper) return true; return false }
      return lists.find(match) || null
    },

    // ========== 共享对话框：领料登记 ==========
    resetMaterialIssueForm() { this.materialIssueForm = { scheduleId: null, orderDetailId: null, orderNo: '', processType: 'COATING', operator: '', remark: '', materialIssues: [this.buildDefaultMaterialIssueRow()] } },
    buildDefaultMaterialIssueRow() { const defaultType = '原料'; return { materialType: defaultType, materialCode: '', materialName: '', stockId: null, rollCode: '', planArea: null, actualArea: null, lossArea: 0, unit: this.getMaterialIssueUnitByType(defaultType), batchOptions: [], sourceRef: '', remark: '' } },
    getMaterialIssueUnitByType(materialType) { const type = String(materialType || '').trim(); if (type === '薄膜' || type === '母卷') return '㎡'; if (this.materialIssueForm && this.materialIssueForm.processType === 'COATING') return 'kg'; return '㎡' },
    handleMaterialIssueTypeChange(row, materialType) { if (!row) return; row.unit = this.getMaterialIssueUnitByType(materialType) },
    addMaterialIssueRow() { this.materialIssueForm.materialIssues.push(this.buildDefaultMaterialIssueRow()) },
    removeMaterialIssueRow(index) { if (!Array.isArray(this.materialIssueForm.materialIssues)) return; this.materialIssueForm.materialIssues.splice(index, 1); if (!this.materialIssueForm.materialIssues.length) this.addMaterialIssueRow() },
    formatMaterialIssueBatchLabel(opt) { if (!opt) return ''; const batchNo = String(opt.batchNo || ''); const sourceLabel = String(opt.sourceLabel || ''); const qty = Number(opt.availableQty || 0); const unit = String(opt.unit || ''); const qtyText = qty > 0 ? `${qty}${unit}` : ''; return [batchNo, sourceLabel, qtyText].filter(Boolean).join(' | ') },
    handleMaterialIssueBatchChange(row, batchNo) { if (!row || !batchNo) return; const options = Array.isArray(row.batchOptions) ? row.batchOptions : []; const matched = options.find(opt => String(opt.batchNo || '') === String(batchNo)); if (matched) row.stockId = Number(matched.stockId || 0) > 0 ? Number(matched.stockId) : null },
    async openMaterialIssueDialog(row) {
      const scheduleId = this.getScheduleId(row); const orderDetailId = Number((row && row.order_detail_id) || 0)
      if (!scheduleId && !orderDetailId) { this.$message.warning('当前记录缺少排程ID和订单明细ID，不能领料登记'); return }
      this.resetMaterialIssueForm()
      this.materialIssueForm.scheduleId = scheduleId || null; this.materialIssueForm.orderDetailId = orderDetailId > 0 ? orderDetailId : null
      this.materialIssueForm.orderNo = String((row && row.order_no) || ''); this.materialIssueForm.processType = this.resolveDefaultReportProcessType(row)
      this.materialIssueDialogVisible = true
      if (scheduleId) await this.loadMaterialIssueList(); else this.materialIssueList = []
      if (this.materialIssueForm.processType === 'COATING') this.loadCoatingBomMaterialTemplate(false)
    },
    async loadCoatingBomMaterialTemplate(showToast = true) {
      if (!this.materialIssueForm.scheduleId && !this.materialIssueForm.orderDetailId) { this.$message.warning('缺少排程ID或订单明细ID，无法按BOM带出'); return }
      this.materialIssueBOMLoading = true
      try {
        const res = await getProcessMaterialIssueTemplate({ scheduleId: this.materialIssueForm.scheduleId, orderDetailId: this.materialIssueForm.orderDetailId, processType: this.materialIssueForm.processType })
        if (res.code === 200 || res.code === 20000) {
          const rows = Array.isArray(res.data) ? res.data : []
          if (rows.length) { this.materialIssueForm.materialIssues = rows.map(r => ({ materialType: String((r && r.materialType) || '原料'), materialCode: String((r && r.materialCode) || '').trim(), materialName: String((r && r.materialName) || '').trim(), stockId: Number((r && r.stockId) || 0) > 0 ? Number(r.stockId) : null, rollCode: String((r && r.rollCode) || '').trim(), planArea: Number((r && r.planArea) || 0), actualArea: Number((r && r.actualArea) || 0), lossArea: Number((r && r.lossArea) || 0), unit: String((r && r.unit) || this.getMaterialIssueUnitByType(String((r && r.materialType) || '原料'))), batchOptions: Array.isArray(r && r.batchOptions) ? r.batchOptions : [], sourceRef: String((r && r.sourceRef) || ''), remark: String((r && r.remark) || '') })); if (showToast) this.$message.success('已按BOM自动带出领料项') }
          else { this.materialIssueForm.materialIssues = [this.buildDefaultMaterialIssueRow()]; if (showToast) this.$message.warning('未找到可带出的BOM领料项') }
        } else if (showToast) this.$message.error(res.message || '按BOM带出失败')
      } catch (e) { if (showToast) this.$message.error(this.parseApiError(e, '按BOM带出失败')) } finally { this.materialIssueBOMLoading = false }
    },
    async loadMaterialIssueList() {
      if (!this.materialIssueForm.scheduleId || !this.materialIssueForm.processType) { this.materialIssueList = []; return }
      this.materialIssueLoading = true
      try {
        const res = await getProcessMaterialIssues({ scheduleId: this.materialIssueForm.scheduleId, processType: this.materialIssueForm.processType })
        if (res.code === 200 || res.code === 20000) this.materialIssueList = res.data || []; else this.materialIssueList = []
      } catch (e) { this.materialIssueList = []; this.$message.error(this.parseApiError(e, '加载领料历史失败')) }
      finally { this.materialIssueLoading = false }
    },
    async submitMaterialIssue() {
      if (!this.materialIssueForm.scheduleId && !this.materialIssueForm.orderDetailId) { this.$message.warning('缺少排程ID或订单明细ID'); return }
      const rows = (this.materialIssueForm.materialIssues || []).map(r => ({ materialType: String((r && r.materialType) || '原料'), materialCode: String((r && r.materialCode) || '').trim(), stockId: Number((r && r.stockId) || 0) > 0 ? Number(r.stockId) : null, rollCode: String((r && r.rollCode) || '').trim(), planArea: Number((r && r.planArea) || 0), actualArea: Number((r && r.actualArea) || 0), lossArea: Number((r && r.lossArea) || 0), unit: String((r && r.unit) || this.getMaterialIssueUnitByType(String((r && r.materialType) || '原料'))), remark: [String((r && r.remark) || '').trim(), String((r && r.sourceRef) || '').trim()].filter(Boolean).join('; ') })).filter(r => r.materialCode && (r.actualArea > 0 || r.planArea > 0 || r.lossArea > 0))
      if (!rows.length) { this.$message.warning('请至少填写一条有效领料明细'); return }
      this.materialIssueSubmitting = true
      try {
        const res = await issueProcessMaterial({ scheduleId: this.materialIssueForm.scheduleId, orderDetailId: this.materialIssueForm.orderDetailId, processType: this.materialIssueForm.processType, materialIssues: rows, operator: this.materialIssueForm.operator, remark: this.materialIssueForm.remark })
        if (res.code === 200 || res.code === 20000) { this.$message.success('领料登记成功'); await this.loadMaterialIssueList(); this.loadOrders(); if (this.activeTab === 'coating') this.loadCoatingSchedules(); if (this.activeTab === 'rewinding') this.loadRewindingOrders(); if (this.activeTab === 'slitting') this.loadSlittingSchedules() }
        else this.$message.error(res.message || '领料登记失败')
      } catch (e) { this.$message.error(this.parseApiError(e, '领料登记失败')) } finally { this.materialIssueSubmitting = false }
    },
    handleMaterialIssueDialogClose() { this.materialIssueList = []; this.resetMaterialIssueForm() },
    async handleMaterialIssueProcessTypeChange() {
      await this.loadMaterialIssueList()
      if (this.materialIssueForm.processType === 'COATING') this.loadCoatingBomMaterialTemplate(false); else this.materialIssueForm.materialIssues = [this.buildDefaultMaterialIssueRow()]
    },

    // ========== 操作命令 ==========
    handleScheduleActionCommand(payload) {
      if (!payload || !payload.action) return
      if (payload.action === 'report') this.openWorkReportDialog(payload.row, payload.processType || this.resolveDefaultReportProcessType(payload.row))
      else if (payload.action === 'terminate') this.handleTerminateSchedule(payload.row)
      else if (payload.action === 'reduce') this.handleReduceSchedule(payload.row)
      else if (payload.action === 'resume') this.handleResumeSchedule(payload.row)
      else if (payload.action === 'reset') this.handleResetSchedule(payload.row)
    },

    // ========== 终止/恢复/清空 ==========
    async handleTerminateSchedule(row) {
      const scheduleId = this.getScheduleId(row); if (!scheduleId) { this.$message.warning('未找到排程ID'); return }
      try {
        const reasonPrompt = await this.$prompt('请输入终止原因（必填）', '终止排程', { confirmButtonText: '确定', cancelButtonText: '取消', inputPlaceholder: '如：客户变更、产能调整', inputValidator: (value) => { if (!value || !value.trim()) return '终止原因不能为空'; return true } })
        const reason = reasonPrompt.value
        await this.$confirm('终止后仅保留已开工部分，未开工数量将回滚。是否继续？', '确认终止', { confirmButtonText: '确定终止', cancelButtonText: '取消', type: 'warning' })
        const res = await terminateSchedule({ scheduleId, reason, operator: 'frontend' })
        if (res.code === 200 || res.code === 20000) { this.$message.success('终止成功'); this.loadCoatingSchedules(); this.loadRewindingSchedules(); this.loadOrders() }
        else this.$message.error(res.message || '终止失败')
      } catch (error) { if (error !== 'cancel' && !(error && error.message === 'cancel')) this.$message.error(this.parseApiError(error, '终止失败')) }
    },
    async handleReduceSchedule(row) {
      const scheduleId = this.getScheduleId(row); if (!scheduleId) { this.$message.warning('未找到排程ID'); return }
      const maxReduce = Number(row.schedule_qty || 0); if (maxReduce <= 0) { this.$message.warning('当前排程数量不可减量'); return }
      try {
        const qtyPrompt = await this.$prompt(`请输入减量卷数（1-${maxReduce}）`, '排程减量', { confirmButtonText: '下一步', cancelButtonText: '取消', inputPlaceholder: '请输入正整数', inputPattern: /^\d+$/, inputErrorMessage: '请输入正整数' })
        const reduceQty = Number(qtyPrompt.value || 0); if (!Number.isInteger(reduceQty) || reduceQty <= 0 || reduceQty > maxReduce) { this.$message.warning(`减量范围应为 1-${maxReduce}`); return }
        const reasonPrompt = await this.$prompt('请输入减量原因（必填）', '排程减量', { confirmButtonText: '确定', cancelButtonText: '取消', inputPlaceholder: '如：客户减单、工艺变更', inputValidator: (value) => { if (!value || !value.trim()) return '减量原因不能为空'; return true } })
        const res = await reduceSchedule({ scheduleId, reduceQty, reason: reasonPrompt.value, operator: 'frontend' })
        if (res.code === 200 || res.code === 20000) { this.$message.success('减量成功'); this.loadCoatingSchedules(); this.loadRewindingSchedules(); this.loadOrders() }
        else this.$message.error(res.message || '减量失败')
      } catch (error) { if (error !== 'cancel' && !(error && error.message === 'cancel')) this.$message.error(this.parseApiError(error, '减量失败')) }
    },
    async handleResumeSchedule(row) {
      const scheduleId = this.getScheduleId(row); if (!scheduleId) { this.$message.warning('未找到排程ID'); return }
      try {
        await this.$confirm('确定要恢复该已终止的排程吗？恢复后将重新进入待生产状态。', '恢复确认', { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' })
        const res = await resumeSchedule({ scheduleId, operator: this.$store.getters.name || 'frontend' })
        if (res.code === 200 || res.code === 20000) { this.$message.success('排程已成功恢复'); /* 组件重写 onTabChange */ }
        else this.$message.error(res.message || '恢复失败')
      } catch (e) { if (e !== 'cancel') { console.error('[ResumeError]', e); this.$message.error('操作失败: ' + (e.message || '未知错误')) } }
    },
    async handleResetSchedule(row) {
      const scheduleId = Number(this.getScheduleId(row) || 0); if (!scheduleId) { this.$message.warning('未找到排程ID，无法清空单行数据'); return }
      try {
        const reasonPrompt = await this.$prompt('请输入清空单行原因（必填）', '清空单行数据', { confirmButtonText: '下一步', cancelButtonText: '取消', inputPlaceholder: '如：路线判定变更，重新排程', inputValidator: (value) => { if (!value || !value.trim()) return '原因不能为空'; return true } })
        await this.$confirm('将清空当前这1行排程的排程、报工与占用数据，并回滚该行已排程数量。是否继续？', '确认清空单行数据', { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' })
        const res = await resetScheduleBySchedule({ scheduleId, reason: reasonPrompt.value, operator: 'frontend' })
        if (res.code === 200 || res.code === 20000) { this.$message.success('清空单行数据成功'); await Promise.all([this.loadOrders(), this.loadCoatingSchedules(), this.loadRewindingSchedules(), this.loadSlittingSchedules()]) }
        else this.$message.error(res.message || '清空单行数据失败')
      } catch (error) { if (error !== 'cancel' && !(error && error.message === 'cancel')) this.$message.error(this.parseApiError(error, '清空单行数据失败')) }
    },


    // ========== 更新表高 ==========
    updateTableMaxHeight() {
      this.$nextTick(() => {
        const winHeight = window.innerHeight; const headerHeight = 84
        this.pageHeight = winHeight - headerHeight - 10
        const paginationHeight = 64
        this.tableHeight = Math.max(320, this.pageHeight - 130 - paginationHeight)
        this.$nextTick(() => { this.syncActiveTableLayout() })
      })
    },
    doTableLayout(refName) { const table = this.$refs[refName]; if (table && typeof table.doLayout === 'function') table.doLayout() },
    relayoutTable(refName) { this.$nextTick(() => { this.doTableLayout(refName) }) },
    syncActiveTableLayout() {},
    lockOuterScroll() { const appMain = document.querySelector('.app-main'); if (!appMain) return; this._appMainOverflowY = appMain.style.overflowY; this._appMainOverflowX = appMain.style.overflowX; appMain.style.overflowY = 'hidden'; appMain.style.overflowX = 'auto' },
    unlockOuterScroll() { const appMain = document.querySelector('.app-main'); if (!appMain) return; appMain.style.overflowY = this._appMainOverflowY || ''; appMain.style.overflowX = this._appMainOverflowX || '' },
  },
  beforeDestroy() {
    this.unlockOuterScroll()
    window.removeEventListener('resize', this.updateTableMaxHeight)
    if (this.materialSuggestionTimer) { clearTimeout(this.materialSuggestionTimer); this.materialSuggestionTimer = null }
    ['coatingTable', 'rewindingTable', 'slittingTable', 'pendingTable'].forEach((refName) => {
      const table = this.$refs[refName]; if (!table || !table.$el) return
      const body = table.$el.querySelector('.el-table__body-wrapper')
      if (body && body.__manualHeaderSyncHandler) { body.removeEventListener('scroll', body.__manualHeaderSyncHandler); body.__manualHeaderSyncHandler = null }
    })
  }
}