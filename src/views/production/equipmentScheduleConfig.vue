<template>
  <div class="equipment-schedule-config">
    <el-card>
      <div slot="header" class="clearfix">
        <span>设备排程状态管理</span>
        <div class="header-actions">
          <el-button icon="el-icon-refresh-left" size="small" @click="handleReset">重置</el-button>
          <el-button type="primary" icon="el-icon-search" size="small" @click="fetchList">刷新</el-button>
          <el-button type="success" icon="el-icon-check" size="small" :loading="saving" @click="handleSave">保存配置</el-button>
        </div>
      </div>

      <div class="tips-box">
        <div>1. 默认排程起点：当前机台没有排程占用时，从这里开始起排。</div>
        <div>2. 当前周期结束时间：若当前机台本轮要做到这个时间之后，新的排程会自动顺延。</div>
        <div>3. 周日不可排：开启后周日自动顺延到下周起排时间。</div>
        <div>4. 表头全局设置会对当前列表内设备统一生效（建议先按设备类型筛选后再应用）。</div>
      </div>

      <el-form :inline="true" :model="globalConfig" class="global-config-form">
        <el-form-item label="排程起点">
          <el-date-picker
            v-model="globalConfig.initialScheduleTime"
            type="datetime"
            value-format="yyyy-MM-dd HH:mm:ss"
            placeholder="统一设置排程起点"
            style="width: 200px"
          />
        </el-form-item>
        <el-form-item label="周期结束时间">
          <el-date-picker
            v-model="globalConfig.cycleEndTime"
            type="datetime"
            value-format="yyyy-MM-dd HH:mm:ss"
            placeholder="统一设置周期结束"
            style="width: 200px"
          />
        </el-form-item>
        <el-form-item label="下周起排时间">
          <el-time-picker
            v-model="globalConfig.nextWeekStartTime"
            value-format="HH:mm:ss"
            placeholder="08:00:00"
            style="width: 120px"
          />
        </el-form-item>
        <el-form-item label="周日不可排">
          <el-switch v-model="globalConfig.sundayDisabled" :active-value="1" :inactive-value="0" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" plain @click="applyGlobalConfig">应用到全部设备</el-button>
        </el-form-item>
      </el-form>

      <el-table v-loading="loading" :data="tableData" stripe border style="width: 100%">
        <el-table-column prop="equipmentCode" label="设备编号" width="110" />
        <el-table-column prop="equipmentName" label="设备名称" width="150" />
        <el-table-column prop="equipmentTypeName" label="设备类型" width="110" />
        <el-table-column prop="workshopName" label="所属车间" width="120" />
        <el-table-column label="设备状态" width="100" align="center">
          <template slot-scope="scope">
            <el-tag :type="equipmentStatusTag(scope.row.equipmentStatus)">{{ equipmentStatusText(scope.row.equipmentStatus) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="启用" width="80" align="center">
          <template slot-scope="scope">
            <el-switch v-model="scope.row.enabled" :active-value="1" :inactive-value="0" />
          </template>
        </el-table-column>
        <el-table-column label="备注" min-width="180">
          <template slot-scope="scope">
            <el-input v-model="scope.row.remark" maxlength="100" placeholder="停机、切线、交接班说明" />
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
  saveEquipmentScheduleConfigBatch
} from '@/api/equipment'

function createGlobalConfig() {
  return {
    initialScheduleTime: '',
    cycleEndTime: '',
    nextWeekStartTime: '08:00:00',
    sundayDisabled: 1
  }
}

function normalizeRow(row = {}) {
  return {
    id: row.id || null,
    equipmentId: row.equipmentId || null,
    equipmentCode: row.equipmentCode || '',
    equipmentName: row.equipmentName || '',
    equipmentType: row.equipmentType || '',
    equipmentTypeName: row.equipmentTypeName || '',
    workshopName: row.workshopName || '',
    equipmentStatus: row.equipmentStatus || 'normal',
    initialScheduleTime: row.initialScheduleTime || '',
    cycleEndTime: row.cycleEndTime || '',
    nextWeekStartTime: row.nextWeekStartTime || '08:00:00',
    weekendRest: 0,
    sundayDisabled: Number(row.sundayDisabled == null ? 1 : row.sundayDisabled),
    enabled: Number(row.enabled == null ? 1 : row.enabled),
    minStaffRequired: Number(row.minStaffRequired == null ? 1 : row.minStaffRequired),
    requiredSkillLevel: row.requiredSkillLevel || '',
    remark: row.remark || ''
  }
}

export default {
  name: 'EquipmentScheduleConfig',
  data() {
    return {
      loading: false,
      saving: false,
      tableData: [],
      equipmentTypes: [],
      globalConfig: createGlobalConfig()
    }
  },
  created() {
    this.fetchEquipmentTypes()
    this.fetchList()
  },
  methods: {
    async fetchEquipmentTypes() {
      try {
        const res = await getEquipmentTypes()
        if (res && (res.code === 200 || res.code === 20000)) {
          this.equipmentTypes = res.data || []
        }
      } catch (error) {
        console.error('获取设备类型失败', error)
      }
    },
    async fetchList() {
      this.loading = true
      try {
        const res = await getEquipmentScheduleConfigList({})
        if (res && (res.code === 200 || res.code === 20000)) {
          this.tableData = (res.data || []).map(item => normalizeRow(item))
          this.syncGlobalConfigFromRows()
        } else {
          this.$message.error(res.msg || res.message || '获取设备排程状态失败')
        }
      } catch (error) {
        console.error('获取设备排程状态失败', error)
        this.$message.error('获取设备排程状态失败')
      } finally {
        this.loading = false
      }
    },
    handleReset() {
      this.globalConfig = createGlobalConfig()
      this.fetchList()
    },
    syncGlobalConfigFromRows() {
      const first = (this.tableData || [])[0]
      if (!first) {
        this.globalConfig = createGlobalConfig()
        return
      }
      this.globalConfig = {
        initialScheduleTime: first.initialScheduleTime || '',
        cycleEndTime: first.cycleEndTime || '',
        nextWeekStartTime: first.nextWeekStartTime || '08:00:00',
        sundayDisabled: Number(first.sundayDisabled == null ? 1 : first.sundayDisabled)
      }
    },
    async applyGlobalConfig() {
      if (!this.tableData.length) {
        await this.fetchList()
      }
      const config = this.globalConfig || {}
      this.tableData = this.tableData.map(row => ({
        ...row,
        initialScheduleTime: config.initialScheduleTime || '',
        cycleEndTime: config.cycleEndTime || '',
        nextWeekStartTime: config.nextWeekStartTime || '08:00:00',
        weekendRest: 0,
        sundayDisabled: Number(config.sundayDisabled == null ? 1 : config.sundayDisabled),
        enabled: 1
      }))
      this.$message.success('已应用到全部设备')
    },
    async handleSave() {
      this.saving = true
      try {
        const payload = (this.tableData || []).map(row => ({
          id: row.id || null,
          equipmentId: row.equipmentId,
          equipmentCode: row.equipmentCode,
          initialScheduleTime: row.initialScheduleTime || null,
          cycleEndTime: row.cycleEndTime || null,
          nextWeekStartTime: row.nextWeekStartTime || '08:00:00',
          weekendRest: 0,
          sundayDisabled: Number(row.sundayDisabled == null ? 1 : row.sundayDisabled),
          enabled: Number(row.enabled == null ? 1 : row.enabled),
          minStaffRequired: Number(row.minStaffRequired == null ? 1 : row.minStaffRequired),
          requiredSkillLevel: row.requiredSkillLevel || null,
          remark: row.remark || ''
        }))
        const res = await saveEquipmentScheduleConfigBatch(payload)
        if (res && (res.code === 200 || res.code === 20000)) {
          this.$message.success(res.msg || res.message || '保存成功')
          this.fetchList()
        } else {
          this.$message.error(res.msg || res.message || '保存失败')
        }
      } catch (error) {
        console.error('保存设备排程状态失败', error)
        this.$message.error('保存设备排程状态失败')
      } finally {
        this.saving = false
      }
    },
    equipmentStatusTag(status) {
      const map = {
        normal: 'success',
        maintenance: 'warning',
        fault: 'danger'
      }
      return map[status] || 'info'
    },
    equipmentStatusText(status) {
      const map = {
        normal: '正常',
        maintenance: '维护中',
        fault: '故障'
      }
      return map[status] || status || '-'
    }
  }
}
</script>

<style scoped>
.equipment-schedule-config {
  padding: 20px;
}

.header-actions {
  float: right;
  display: flex;
  gap: 8px;
}

.tips-box {
  margin-bottom: 16px;
  padding: 12px 14px;
  line-height: 1.8;
  color: #606266;
  background: #f4f8ff;
  border: 1px solid #d9ecff;
  border-radius: 4px;
}

.search-form {
  margin-bottom: 16px;
}

.global-config-form {
  margin-bottom: 16px;
  padding: 10px 12px 0;
  border: 1px dashed #dcdfe6;
  border-radius: 4px;
  background: #fafafa;
}
</style>
