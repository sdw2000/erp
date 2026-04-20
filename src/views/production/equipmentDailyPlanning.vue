<template>
  <div class="equipment-daily-planning">
    <el-card>
      <div slot="header" class="clearfix">
        <span>设备日历与排班维护</span>
        <div class="header-actions">
          <el-button icon="el-icon-refresh-left" size="small" @click="handleReset">重置</el-button>
          <el-button type="primary" icon="el-icon-search" size="small" @click="fetchDailyStatusList">查询</el-button>
          <el-button type="success" icon="el-icon-check" size="small" :loading="savingStatus" @click="saveDailyStatus">保存日状态</el-button>
        </div>
      </div>

      <el-alert
        title="规则：设备状态=normal 且 日状态=OPEN，才允许进入手动排程机台候选（当前不启用人员到岗门槛）"
        type="info"
        :closable="false"
        style="margin-bottom: 12px;"
      />
      <el-alert
        title="周期规则：默认按周一~周日；选择2周时自动覆盖连续两周（含两个周日，周日可排班）。"
        type="success"
        :closable="false"
        style="margin-bottom: 12px;"
      />
        <div class="summary-grid">
          <el-card shadow="hover" class="summary-card total-card">
            <div class="summary-label">设备总数</div>
            <div class="summary-value">{{ summary.total }}</div>
          </el-card>
          <el-card shadow="hover" class="summary-card ok-card">
            <div class="summary-label">可排设备</div>
            <div class="summary-value">{{ summary.schedulable }}</div>
          </el-card>
          <el-card shadow="hover" class="summary-card danger-card">
            <div class="summary-label">不可排设备</div>
            <div class="summary-value">{{ summary.unschedulable }}</div>
          </el-card>
          <el-card shadow="hover" class="summary-card breakdown-card">
            <div class="summary-label">不可排分布</div>
            <div class="summary-tags">
              <el-tag
                v-for="item in summary.breakdown.filter(x => !x.canSchedule)"
                :key="item.code"
                type="danger"
                effect="plain"
              >
                {{ item.code }}：{{ item.count }}
              </el-tag>
              <span v-if="!summary.breakdown.some(x => !x.canSchedule)" class="summary-empty">暂无</span>
            </div>
          </el-card>
        </div>

      <el-form :inline="true" :model="query" class="search-form">
        <el-form-item label="计划周数">
          <el-radio-group v-model="query.planWeeks" size="small" @change="handleQueryWeeksChange">
            <el-radio-button :label="1">1周</el-radio-button>
            <el-radio-button :label="2">2周</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="计划周期">
          <el-date-picker
            v-model="query.planDateRange"
            type="datetimerange"
            value-format="yyyy-MM-dd HH:mm:ss"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            :default-time="['08:00:00', '08:00:00']"
            @change="handleQueryRangeChange"
          />
        </el-form-item>
        <el-form-item label="设备类型">
          <el-select v-model="query.equipmentType" clearable placeholder="全部类型" style="width: 180px">
            <el-option v-for="item in equipmentTypes" :key="item.typeCode" :label="item.typeName" :value="item.typeCode" />
          </el-select>
        </el-form-item>
        <el-form-item label="关键字">
          <el-input v-model="query.keyword" clearable placeholder="设备编号/名称" style="width: 220px" @keyup.enter.native="fetchDailyStatusList" />
        </el-form-item>
      </el-form>

      <el-table v-loading="loadingStatus" :data="dailyStatusList" stripe border style="width: 100%">
        <el-table-column prop="equipmentCode" label="设备编号" width="110" />
        <el-table-column prop="equipmentName" label="设备名称" width="150" />
        <el-table-column prop="equipmentTypeName" label="设备类型" width="120" />
        <el-table-column prop="workshopName" label="车间" width="120" />
        <el-table-column label="设备基础状态" width="110" align="center">
          <template slot-scope="scope">
            <el-tag :type="equipmentStatusTag(scope.row.equipmentStatus)">{{ equipmentStatusText(scope.row.equipmentStatus) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="日状态" width="140" align="center">
          <template slot-scope="scope">
            <el-select v-model="scope.row.dailyStatus" size="small" style="width: 120px">
              <el-option label="开放" value="OPEN" />
              <el-option label="未安排" value="CLOSED" />
              <el-option label="维护" value="MAINTENANCE" />
              <el-option label="故障" value="FAULT" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="最低在岗人数" width="120" align="center">
          <template slot-scope="scope">
            <el-input-number v-model="scope.row.minStaffRequired" :min="1" :max="99" size="mini" controls-position="right" />
          </template>
        </el-table-column>
        <el-table-column label="技能要求" width="140" align="center">
          <template slot-scope="scope">
            <el-select v-model="scope.row.requiredSkillLevel" clearable size="small" placeholder="默认不限">
              <el-option label="一般(normal)" value="normal" />
              <el-option label="熟练(skilled)" value="skilled" />
              <el-option label="精通(expert)" value="expert" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="计划起" width="130" align="center">
          <template slot-scope="scope">
            <el-date-picker v-model="scope.row.effectiveStartDate" type="datetime" value-format="yyyy-MM-dd HH:mm:ss" size="small" style="width: 170px" />
          </template>
        </el-table-column>
        <el-table-column label="计划止" width="130" align="center">
          <template slot-scope="scope">
            <el-date-picker v-model="scope.row.effectiveEndDate" type="datetime" value-format="yyyy-MM-dd HH:mm:ss" size="small" style="width: 170px" />
          </template>
        </el-table-column>
        <el-table-column label="在岗人数" width="100" align="center">
          <template slot-scope="scope">
            <el-tag type="info">{{ formatStaffCount(scope.row) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="可排判定" width="200" align="center">
          <template slot-scope="scope">
            <el-tag :type="canScheduleTagType(scope.row)">{{ canScheduleText(scope.row) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="判定编码" width="220" align="center">
          <template slot-scope="scope">
            <el-tag type="info">{{ canScheduleCodeText(scope.row) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="原因" min-width="180">
          <template slot-scope="scope">
            <el-input v-model="scope.row.reason" maxlength="100" placeholder="未安排/缺料/检修/人员不足" />
          </template>
        </el-table-column>
        <el-table-column label="排班" width="100" align="center">
          <template slot-scope="scope">
            <el-button type="text" size="small" @click="openAssignmentPanel(scope.row)">维护排班</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card v-if="staffPlanningEnabled" style="margin-top: 14px;">
      <div slot="header" class="clearfix">
        <span>设备人员排班（{{ assignmentTitle }}）</span>
        <div class="header-actions">
          <el-button type="primary" size="small" icon="el-icon-plus" @click="addAssignmentRow" :disabled="!assignment.equipmentId">新增</el-button>
          <el-button type="success" size="small" icon="el-icon-check" :loading="savingAssignment" @click="saveAssignments" :disabled="!assignment.equipmentId">保存排班</el-button>
        </div>
      </div>

      <el-form :inline="true" class="search-form" :model="assignment">
        <el-form-item label="计划周数">
          <el-radio-group v-model="assignment.planWeeks" size="small" @change="handleAssignmentWeeksChange">
            <el-radio-button :label="1">1周</el-radio-button>
            <el-radio-button :label="2">2周</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="计划周期">
          <el-date-picker
            v-model="assignment.planDateRange"
            type="datetimerange"
            value-format="yyyy-MM-dd HH:mm:ss"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            :default-time="['08:00:00', '08:00:00']"
            @change="handleAssignmentRangeChange"
          />
        </el-form-item>
        <el-form-item label="设备">
          <el-select v-model="assignment.equipmentId" filterable placeholder="请选择设备" style="width: 280px" @change="handleAssignmentEquipmentChange">
            <el-option
              v-for="eq in dailyStatusList"
              :key="eq.equipmentId"
              :label="`${eq.equipmentCode}-${eq.equipmentName}`"
              :value="eq.equipmentId"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button icon="el-icon-refresh" size="small" @click="loadAssignments" :disabled="!assignment.equipmentId">刷新排班</el-button>
        </el-form-item>
      </el-form>

      <el-table v-loading="loadingAssignment" :data="assignment.list" stripe border style="width: 100%">
        <el-table-column type="index" label="#" width="50" align="center" />
        <el-table-column label="班次" width="180">
          <template slot-scope="scope">
            <el-select v-model="scope.row.shiftId" size="small" placeholder="班次" style="width: 160px" @change="val => onShiftChange(scope.row, val)">
              <el-option v-for="s in shiftList" :key="s.id" :label="`${s.shiftName}(${s.shiftCode})`" :value="s.id" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="人员" min-width="220">
          <template slot-scope="scope">
            <el-select v-model="scope.row.staffId" filterable size="small" placeholder="人员" style="width: 100%" @change="val => onStaffChange(scope.row, val)">
              <el-option v-for="s in staffOptions" :key="s.id" :label="`${s.staffCode}-${s.staffName}`" :value="s.id" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="角色" width="140">
          <template slot-scope="scope">
            <el-select v-model="scope.row.roleName" size="small" placeholder="角色">
              <el-option label="主操" value="operator" />
              <el-option label="副操" value="assistant" />
              <el-option label="班长" value="captain" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="生效起" width="130" align="center">
          <template slot-scope="scope">
            <el-date-picker
              v-model="scope.row.effectiveStartDate"
              type="datetime"
              value-format="yyyy-MM-dd HH:mm:ss"
              size="small"
              style="width: 170px"
            />
          </template>
        </el-table-column>
        <el-table-column label="生效止" width="130" align="center">
          <template slot-scope="scope">
            <el-date-picker
              v-model="scope.row.effectiveEndDate"
              type="datetime"
              value-format="yyyy-MM-dd HH:mm:ss"
              size="small"
              style="width: 170px"
            />
          </template>
        </el-table-column>
        <el-table-column label="到岗" width="90" align="center">
          <template slot-scope="scope">
            <el-switch v-model="scope.row.onDuty" :active-value="1" :inactive-value="0" />
          </template>
        </el-table-column>
        <el-table-column label="备注" min-width="160">
          <template slot-scope="scope">
            <el-input v-model="scope.row.remark" size="small" maxlength="100" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="80" align="center">
          <template slot-scope="scope">
            <el-button type="text" size="small" @click="removeAssignmentRow(scope.$index)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script>
import {
  getEquipmentTypes,
  getEquipmentScheduleConfigList,
  getEquipmentDailyStatusList,
  getEquipmentDailyStatusSummary,
  saveEquipmentDailyStatusBatch,
  getEquipmentStaffAssignmentList,
  saveEquipmentStaffAssignments
} from '@/api/equipment'
import { getAllShifts, getStaffByEquipmentType } from '@/api/staff'

function todayString() {
  const d = new Date()
  const p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function formatDateTime(d) {
  const p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

function parseDateTime(text, fallbackTime = '08:00:00') {
  const raw = String(text || '').trim()
  if (!raw) return null
  const normalized = raw.length <= 10 ? `${raw} ${fallbackTime}` : raw
  const d = new Date(normalized.replace(' ', 'T'))
  return Number.isNaN(d.getTime()) ? null : d
}

function addDays(dateTimeStr, days) {
  const d = parseDateTime(dateTimeStr)
  if (!d) return ''
  d.setDate(d.getDate() + Number(days || 0))
  return formatDateTime(d)
}

function getWeekMonday(dateTimeStr = `${todayString()} 08:00:00`) {
  const d = parseDateTime(dateTimeStr)
  if (!d) return `${todayString()} 08:00:00`
  const day = d.getDay()
  const delta = day === 0 ? -6 : (1 - day)
  d.setDate(d.getDate() + delta)
  d.setHours(8, 0, 0, 0)
  return formatDateTime(d)
}

function buildWeekRange(weeks = 1, anchorDateTime = `${todayString()} 08:00:00`) {
  const safeWeeks = Math.max(1, Number(weeks || 1))
  const monday = getWeekMonday(anchorDateTime)
  const sunday = addDays(monday, safeWeeks * 7 - 1)
  return [monday, sunday]
}

function defaultWeekRange() {
  return buildWeekRange(1)
}

function rangeDaySpan(range = []) {
  if (!Array.isArray(range) || range.length !== 2 || !range[0] || !range[1]) return 6
  const start = parseDateTime(range[0])
  const end = parseDateTime(range[1])
  const diff = Math.round((end - start) / (24 * 60 * 60 * 1000))
  return diff >= 0 ? diff : 6
}

function weeksFromRange(range = []) {
  const span = rangeDaySpan(range) + 1
  return Math.max(1, Math.ceil(span / 7))
}

function expandDateRange(range = []) {
  if (!Array.isArray(range) || range.length !== 2 || !range[0] || !range[1]) {
    return []
  }
  const result = []
  const start = parseDateTime(range[0])
  const end = parseDateTime(range[1])
  if (!start || !end || start > end) return []
  const cursor = new Date(start.getTime())
  while (cursor <= end) {
    result.push(formatDateTime(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return result
}

function inRange(target, range = []) {
  if (!target) return false
  if (!Array.isArray(range) || range.length !== 2 || !range[0] || !range[1]) return false
  const t = parseDateTime(target)
  const s = parseDateTime(range[0])
  const e = parseDateTime(range[1])
  if (!t || !s || !e) return false
  return t >= s && t <= e
}

function normalizeStatusRow(row = {}, planDate) {
  return {
    id: row.id || null,
    equipmentId: row.equipmentId || null,
    equipmentCode: row.equipmentCode || '',
    equipmentName: row.equipmentName || '',
    equipmentType: row.equipmentType || '',
    equipmentTypeName: row.equipmentTypeName || '',
    workshopName: row.workshopName || '',
    equipmentStatus: row.equipmentStatus || 'normal',
    planDate: row.planDate || planDate,
    dailyStatus: (row.dailyStatus || 'OPEN').toUpperCase(),
    reason: row.reason || '',
    minStaffRequired: Number(row.minStaffRequired || 1),
    requiredSkillLevel: row.requiredSkillLevel || '',
    availableStaffCount: Number(row.availableStaffCount || 0),
    canSchedule: Number(row.canSchedule || 0),
    canScheduleReason: row.canScheduleReason || '',
    canScheduleCode: row.canScheduleCode || '',
    effectiveStartDate: row.effectiveStartDate || planDate,
    effectiveEndDate: row.effectiveEndDate || planDate
  }
}

export default {
  name: 'EquipmentDailyPlanning',
  data() {
    return {
      query: {
        planWeeks: 1,
        planDateRange: defaultWeekRange(),
        planDate: defaultWeekRange()[0],
        equipmentType: '',
        keyword: ''
      },
      loadingStatus: false,
      savingStatus: false,
      dailyStatusList: [],
        summary: {
          total: 0,
          schedulable: 0,
          unschedulable: 0,
          breakdown: []
        },
      equipmentTypes: [],

      assignment: {
        planWeeks: 1,
        planDateRange: defaultWeekRange(),
        planDate: defaultWeekRange()[0],
        equipmentId: null,
        equipmentType: '',
        equipmentLabel: '',
        list: []
      },
      loadingAssignment: false,
      savingAssignment: false,
      staffPlanningEnabled: false,
      shiftList: [],
      staffOptions: [],
      scheduleConfigMap: {}
    }
  },
  computed: {
    assignmentTitle() {
      if (!this.assignment.equipmentId) return '未选择设备'
      return `${this.assignment.planDate || '-'} / ${this.assignment.equipmentLabel || this.assignment.equipmentId}`
    }
  },
  created() {
    this.fetchEquipmentTypes()
    this.fetchScheduleConfigs()
    this.fetchDailyStatusList()
    this.loadShifts()
  },
  methods: {
    syncQueryPlanDate() {
      const range = this.query.planDateRange || []
      this.query.planDate = Array.isArray(range) && range.length === 2 && range[0] ? range[0] : `${todayString()} 08:00:00`
    },
    syncAssignmentPlanDate() {
      const range = this.assignment.planDateRange || []
      this.assignment.planDate = Array.isArray(range) && range.length === 2 && range[0] ? range[0] : `${todayString()} 08:00:00`
    },
    handleQueryWeeksChange(weeks) {
      this.query.planDateRange = buildWeekRange(weeks, this.query.planDate || `${todayString()} 08:00:00`)
      this.syncQueryPlanDate()
      if (!this.assignment.equipmentId) {
        this.assignment.planWeeks = Number(weeks || 1)
        this.assignment.planDateRange = [...this.query.planDateRange]
        this.syncAssignmentPlanDate()
      }
    },
    handleQueryRangeChange() {
      this.syncQueryPlanDate()
      this.query.planWeeks = weeksFromRange(this.query.planDateRange)
    },
    handleAssignmentWeeksChange(weeks) {
      this.assignment.planDateRange = buildWeekRange(weeks, this.assignment.planDate || this.query.planDate || `${todayString()} 08:00:00`)
      this.syncAssignmentPlanDate()
      this.loadAssignments()
    },
    handleAssignmentRangeChange() {
      this.syncAssignmentPlanDate()
      this.assignment.planWeeks = weeksFromRange(this.assignment.planDateRange)
      this.loadAssignments()
    },
    async fetchEquipmentTypes() {
      try {
        const res = await getEquipmentTypes()
        if (res.code === 200 || res.code === 20000) {
          this.equipmentTypes = res.data || []
        }
      } catch (e) {
        this.$message.error('加载设备类型失败')
      }
    },
    async fetchDailyStatusList() {
      this.syncQueryPlanDate()
      this.loadingStatus = true
      try {
          const [listRes, summaryRes] = await Promise.all([
            getEquipmentDailyStatusList(this.query),
            getEquipmentDailyStatusSummary(this.query)
          ])
          const res = listRes
        if (res.code === 200 || res.code === 20000) {
          this.dailyStatusList = (res.data || []).map(item => normalizeStatusRow(item, this.query.planDate))
          const range = this.query.planDateRange || []
          if (Array.isArray(range) && range.length === 2 && range[0] && range[1]) {
            this.dailyStatusList = this.dailyStatusList.map(row => ({
              ...row,
              effectiveStartDate: row.effectiveStartDate || range[0],
              effectiveEndDate: row.effectiveEndDate || range[1]
            }))
          }
          if (this.staffPlanningEnabled) {
            await this.refreshAvailableStaffCountByAssignments()
          }
          if (this.assignment.equipmentId) {
            const row = this.dailyStatusList.find(r => Number(r.equipmentId) === Number(this.assignment.equipmentId))
            if (row) {
              this.assignment.equipmentType = row.equipmentType || ''
              this.assignment.equipmentLabel = `${row.equipmentCode}-${row.equipmentName}`
            }
          }
        } else {
          this.$message.error(res.msg || res.message || '加载设备日状态失败')
        }

        if (summaryRes.code === 200 || summaryRes.code === 20000) {
          const data = summaryRes.data || {}
          this.summary = {
            total: Number(data.total || 0),
            schedulable: Number(data.schedulable || 0),
            unschedulable: Number(data.unschedulable || 0),
            breakdown: Array.isArray(data.breakdown) ? data.breakdown : []
          }
        } else {
          this.resetSummary()
        }
      } catch (e) {
        this.resetSummary()
        this.$message.error('加载设备日状态失败')
      } finally {
        this.loadingStatus = false
      }
    },
    async saveDailyStatus() {
      this.syncQueryPlanDate()
      const dateList = expandDateRange(this.query.planDateRange)
      if (!dateList.length) {
        this.$message.warning('请先选择有效计划周期')
        return
      }

      const invalidRow = (this.dailyStatusList || []).find(row => {
        const s = row.effectiveStartDate || this.query.planDateRange[0]
        const e = row.effectiveEndDate || this.query.planDateRange[1]
        return !s || !e || s > e || !inRange(s, this.query.planDateRange) || !inRange(e, this.query.planDateRange)
      })
      if (invalidRow) {
        this.$message.warning('存在设备计划起止超出周期或起止非法，请先修正')
        return
      }
      this.savingStatus = true
      try {
        const tasks = dateList.map(date => {
          const dateObj = parseDateTime(date)
          const list = (this.dailyStatusList || [])
            .filter(row => {
              const s = row.effectiveStartDate || this.query.planDateRange[0]
              const e = row.effectiveEndDate || this.query.planDateRange[1]
              const sObj = parseDateTime(s)
              const eObj = parseDateTime(e)
              return dateObj && sObj && eObj && dateObj >= sObj && dateObj <= eObj
            })
            .map(row => ({
              id: null,
              equipmentId: row.equipmentId,
              equipmentCode: row.equipmentCode,
              planDate: date,
              dailyStatus: row.dailyStatus || 'OPEN',
              reason: row.reason || '',
              minStaffRequired: Number(row.minStaffRequired || 1),
              requiredSkillLevel: row.requiredSkillLevel || null
            }))
          const payload = {
            operator: 'system',
            list
          }
          return saveEquipmentDailyStatusBatch(payload)
        })
        const results = await Promise.all(tasks)
        const failed = results.filter(res => !(res.code === 200 || res.code === 20000))
        if (!failed.length) {
          this.$message.success(`保存成功，已写入 ${dateList.length} 天`) 
          this.fetchDailyStatusList()
        } else {
          this.$message.error(`保存完成，但有 ${failed.length} 天失败`)
        }
      } catch (e) {
        this.$message.error('保存设备日状态失败')
      } finally {
        this.savingStatus = false
      }
    },
    handleReset() {
      const weekRange = buildWeekRange(1)
      this.query = { planWeeks: 1, planDateRange: weekRange, planDate: weekRange[0], equipmentType: '', keyword: '' }
      this.assignment.planWeeks = 1
      this.assignment.planDateRange = [...weekRange]
      this.assignment.planDate = weekRange[0]
      this.assignment.equipmentId = null
      this.assignment.equipmentType = ''
      this.assignment.equipmentLabel = ''
      this.assignment.list = []
      this.staffOptions = []
        this.resetSummary()
      this.fetchDailyStatusList()
    },
      resetSummary() {
        this.summary = {
          total: 0,
          schedulable: 0,
          unschedulable: 0,
          breakdown: []
        }
      },

    openAssignmentPanel(row) {
      const config = this.scheduleConfigMap[String(row.equipmentId)] || {}
      const globalRange = this.query.planDateRange || defaultWeekRange()
      const globalSpan = rangeDaySpan(globalRange)
      const cfgStartObj = config.initialScheduleTime ? parseDateTime(config.initialScheduleTime, '08:00:00') : null
      const cfgEndObj = config.cycleEndTime ? parseDateTime(config.cycleEndTime, '08:00:00') : null
      const cfgStart = cfgStartObj ? formatDateTime(cfgStartObj) : ''
      const cfgEnd = cfgEndObj ? formatDateTime(cfgEndObj) : ''
      let resolvedRange = cfgStart && cfgEnd && cfgStart <= cfgEnd ? [cfgStart, cfgEnd] : [...globalRange]

      // 上一周期未完成顺延：设备周期结束晚于当前周期起点，则当前周期整体后移
      if (cfgEnd && globalRange[0] && cfgEnd > globalRange[0]) {
        const delayedStart = cfgEnd
        const delayedEnd = addDays(delayedStart, globalSpan)
        resolvedRange = [delayedStart, delayedEnd]
        this.$message.info(`检测到${row.equipmentCode}上周期未结束，已顺延到 ${delayedStart} ~ ${delayedEnd}`)
      }

      this.assignment.planDateRange = resolvedRange
      this.assignment.planWeeks = weeksFromRange(resolvedRange)
      this.syncAssignmentPlanDate()
      this.assignment.equipmentId = row.equipmentId
      this.assignment.equipmentType = row.equipmentType || ''
      this.assignment.equipmentLabel = `${row.equipmentCode}-${row.equipmentName}`
      this.loadStaffOptions()
      this.loadAssignments()
    },
    async fetchScheduleConfigs() {
      try {
        const res = await getEquipmentScheduleConfigList({})
        if (res.code === 200 || res.code === 20000) {
          const map = {}
          ;(res.data || []).forEach(item => {
            map[String(item.equipmentId)] = item
          })
          this.scheduleConfigMap = map
        }
      } catch (e) {
        this.scheduleConfigMap = {}
      }
    },
    async loadShifts() {
      try {
        const res = await getAllShifts()
        if (res.code === 200 || res.code === 20000) {
          this.shiftList = res.data || []
        }
      } catch (e) {
        this.$message.error('加载班次失败')
      }
    },
    async loadStaffOptions() {
      try {
        if (!this.assignment.equipmentType) {
          this.staffOptions = []
          return
        }
        const res = await getStaffByEquipmentType(this.assignment.equipmentType)
        if (res.code === 200 || res.code === 20000) {
          this.staffOptions = res.data || []
        } else {
          this.staffOptions = []
        }
      } catch (e) {
        this.staffOptions = []
      }
    },
    async loadAssignments() {
      this.syncAssignmentPlanDate()
      if (!this.assignment.equipmentId || !this.assignment.planDate) {
        this.assignment.list = []
        return
      }
      this.loadingAssignment = true
      try {
        const res = await getEquipmentStaffAssignmentList({
          planDate: this.assignment.planDate,
          equipmentId: this.assignment.equipmentId
        })
        if (res.code === 200 || res.code === 20000) {
          this.assignment.list = (res.data || []).map(item => ({
            id: item.id || null,
            shiftId: item.shiftId || null,
            shiftCode: item.shiftCode || '',
            shiftName: item.shiftName || '',
            staffId: item.staffId || null,
            staffCode: item.staffCode || '',
            staffName: item.staffName || '',
            roleName: item.roleName || 'operator',
            onDuty: Number(item.onDuty == null ? 1 : item.onDuty),
            effectiveStartDate: (this.assignment.planDateRange && this.assignment.planDateRange[0]) || this.assignment.planDate,
            effectiveEndDate: (this.assignment.planDateRange && this.assignment.planDateRange[1]) || this.assignment.planDate,
            remark: item.remark || ''
          }))
        } else {
          this.assignment.list = []
        }
      } catch (e) {
        this.$message.error('加载排班失败')
      } finally {
        this.loadingAssignment = false
      }
    },
    async refreshAvailableStaffCountByAssignments() {
      if (!this.query.planDate || !Array.isArray(this.dailyStatusList) || !this.dailyStatusList.length) {
        return
      }
      try {
        const reqList = this.dailyStatusList
          .filter(row => row && row.equipmentId)
          .map(row => getEquipmentStaffAssignmentList({
            planDate: this.query.planDate,
            equipmentId: row.equipmentId
          }))

        const results = await Promise.all(reqList)
        this.dailyStatusList = this.dailyStatusList.map((row, index) => {
          const res = results[index]
          if (!(res && (res.code === 200 || res.code === 20000))) {
            return row
          }
          const onDutyStaffSet = new Set(
            (res.data || [])
              .filter(item => Number(item.onDuty == null ? 1 : item.onDuty) === 1 && item.staffId)
              .map(item => Number(item.staffId))
          )
          return {
            ...row,
            availableStaffCount: onDutyStaffSet.size
          }
        })
      } catch (e) {
        // 静默失败：保持后端汇总值，避免影响主流程
      }
    },
    handleAssignmentEquipmentChange(val) {
      const row = this.dailyStatusList.find(r => Number(r.equipmentId) === Number(val))
      this.assignment.equipmentType = row ? (row.equipmentType || '') : ''
      this.assignment.equipmentLabel = row ? `${row.equipmentCode}-${row.equipmentName}` : ''
      this.loadStaffOptions()
      this.loadAssignments()
    },
    addAssignmentRow() {
      this.syncAssignmentPlanDate()
      this.assignment.list.push({
        id: null,
        shiftId: null,
        shiftCode: '',
        shiftName: '',
        staffId: null,
        staffCode: '',
        staffName: '',
        roleName: 'operator',
        onDuty: 1,
        effectiveStartDate: (this.assignment.planDateRange && this.assignment.planDateRange[0]) || this.assignment.planDate,
        effectiveEndDate: (this.assignment.planDateRange && this.assignment.planDateRange[1]) || this.assignment.planDate,
        remark: ''
      })
    },
    removeAssignmentRow(idx) {
      this.assignment.list.splice(idx, 1)
    },
    onShiftChange(row, shiftId) {
      const shift = (this.shiftList || []).find(s => Number(s.id) === Number(shiftId))
      row.shiftCode = shift ? shift.shiftCode : ''
      row.shiftName = shift ? shift.shiftName : ''
    },
    onStaffChange(row, staffId) {
      const staff = (this.staffOptions || []).find(s => Number(s.id) === Number(staffId))
      row.staffCode = staff ? staff.staffCode : ''
      row.staffName = staff ? staff.staffName : ''
    },
    async saveAssignments() {
      this.syncAssignmentPlanDate()
      if (!this.assignment.equipmentId || !this.assignment.planDateRange || this.assignment.planDateRange.length !== 2) {
        this.$message.warning('请先选择设备和有效周期')
        return
      }
      const periodDates = expandDateRange(this.assignment.planDateRange)
      if (!periodDates.length) {
        this.$message.warning('计划周期无效')
        return
      }

      const invalidRow = (this.assignment.list || []).find(item => {
        const s = item.effectiveStartDate || this.assignment.planDateRange[0]
        const e = item.effectiveEndDate || this.assignment.planDateRange[1]
        return !s || !e || s > e || !inRange(s, this.assignment.planDateRange) || !inRange(e, this.assignment.planDateRange)
      })
      if (invalidRow) {
        this.$message.warning('存在排班生效日期超出计划周期或起止非法，请先修正')
        return
      }

      this.savingAssignment = true
      try {
        const tasks = periodDates.map(date => {
          const dateObj = parseDateTime(date)
          const dayAssignments = (this.assignment.list || [])
            .filter(item => {
              const s = item.effectiveStartDate || this.assignment.planDateRange[0]
              const e = item.effectiveEndDate || this.assignment.planDateRange[1]
              const sObj = parseDateTime(s)
              const eObj = parseDateTime(e)
              return dateObj && sObj && eObj && dateObj >= sObj && dateObj <= eObj
            })
            .map(item => ({
              id: null,
              shiftId: item.shiftId,
              shiftCode: item.shiftCode,
              shiftName: item.shiftName,
              staffId: item.staffId,
              staffCode: item.staffCode,
              staffName: item.staffName,
              roleName: item.roleName,
              onDuty: Number(item.onDuty == null ? 1 : item.onDuty),
              remark: item.remark || ''
            }))

          return saveEquipmentStaffAssignments({
            planDate: date,
            equipmentId: this.assignment.equipmentId,
            operator: 'system',
            assignments: dayAssignments
          })
        })

        const results = await Promise.all(tasks)
        const failed = results.filter(res => !(res.code === 200 || res.code === 20000))
        if (!failed.length) {
          this.$message.success(`保存成功，已写入 ${periodDates.length} 天`) 
          this.loadAssignments()
          this.fetchDailyStatusList()
        } else {
          this.$message.error(`保存完成，但有 ${failed.length} 天失败`)
        }
      } catch (e) {
        this.$message.error('保存排班失败')
      } finally {
        this.savingAssignment = false
      }
    },
    equipmentStatusTag(status) {
      const map = { normal: 'success', maintenance: 'warning', fault: 'danger' }
      return map[status] || 'info'
    },
    equipmentStatusText(status) {
      const map = { normal: '正常', maintenance: '维护中', fault: '故障' }
      return map[status] || status || '-'
    },
    formatStaffCount(row) {
      const available = Number((row && row.availableStaffCount) || 0)
      const required = Number((row && row.minStaffRequired) || 1)
      return `${available}/${required}`
    },
    canScheduleTagType(row) {
      const available = Number((row && row.availableStaffCount) || 0)
      const required = Number((row && row.minStaffRequired) || 1)
      const equipmentStatus = String((row && row.equipmentStatus) || '').toLowerCase()
      const dailyStatus = String((row && row.dailyStatus) || '').toUpperCase()
      if (equipmentStatus === 'normal' && dailyStatus === 'OPEN' && available >= required) {
        return 'success'
      }
      return 'danger'
    },
    canScheduleText(row) {
      const available = Number((row && row.availableStaffCount) || 0)
      const required = Number((row && row.minStaffRequired) || 1)
      const equipmentStatus = String((row && row.equipmentStatus) || '').toLowerCase()
      const dailyStatus = String((row && row.dailyStatus) || '').toUpperCase()
      if (equipmentStatus === 'normal' && dailyStatus === 'OPEN' && available >= required) {
        return '可排'
      }
      const reason = String((row && row.canScheduleReason) || '').trim()
      return reason || '不可排'
    },
    canScheduleCodeText(row) {
      const code = String((row && row.canScheduleCode) || '').trim().toUpperCase()
      if (code) return code

      const available = Number((row && row.availableStaffCount) || 0)
      const required = Number((row && row.minStaffRequired) || 1)
      const equipmentStatus = String((row && row.equipmentStatus) || '').toLowerCase()
      const dailyStatus = String((row && row.dailyStatus) || '').toUpperCase()
      if (equipmentStatus !== 'normal') return 'EQUIPMENT_NOT_NORMAL'
      if (dailyStatus !== 'OPEN') return 'DAILY_STATUS_NOT_OPEN'
      if (available < required) return 'STAFF_NOT_ENOUGH'
      return 'OK'
    }
  }
}
</script>

<style scoped>
.equipment-daily-planning {
  padding: 20px;
}
.header-actions {
  float: right;
  display: flex;
  gap: 8px;
}
.search-form {
  margin-bottom: 12px;
}
.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 12px;
}
.summary-card {
  min-height: 96px;
}
.summary-label {
  color: #606266;
  font-size: 13px;
  margin-bottom: 10px;
}
.summary-value {
  font-size: 28px;
  font-weight: 600;
  line-height: 1;
}
.summary-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.summary-empty {
  color: #909399;
  font-size: 13px;
}
.ok-card .summary-value {
  color: #67c23a;
}
.danger-card .summary-value {
  color: #f56c6c;
}
.total-card .summary-value {
  color: #409eff;
}
@media (max-width: 1400px) {
  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 768px) {
  .summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>
