<template>
  <div class="equipment-schedule-config">
    <el-card>
      <div slot="header" class="clearfix">
        <span>设备排程状态管理</span>
        <div class="header-actions">
          <el-button icon="el-icon-refresh-left" size="small" @click="handleReset">重置</el-button>
          <el-button type="primary" icon="el-icon-search" size="small" @click="fetchList">查询</el-button>
          <el-button type="success" icon="el-icon-check" size="small" :loading="saving" @click="handleSave">保存配置</el-button>
        </div>
      </div>

      <div class="tips-box">
        <div>1. 默认排程起点：当前机台没有排程占用时，从这里开始起排。</div>
        <div>2. 当前周期结束时间：若当前机台本轮要做到这个时间之后，新的排程会自动顺延。</div>
        <div>3. 勾选周末休息后，周六/周日排程会自动顺延到下周一；默认从周一 08:00 重新起排。</div>
      </div>

      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="设备类型">
          <el-select v-model="searchForm.equipmentType" clearable placeholder="全部类型" style="width: 180px">
            <el-option
              v-for="item in equipmentTypes"
              :key="item.typeCode"
              :label="item.typeName"
              :value="item.typeCode"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="关键字">
          <el-input
            v-model="searchForm.keyword"
            clearable
            placeholder="设备编号/名称"
            style="width: 220px"
            @keyup.enter.native="fetchList"
          />
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
        <el-table-column label="默认排程起点" min-width="180">
          <template slot-scope="scope">
            <el-date-picker
              v-model="scope.row.initialScheduleTime"
              type="datetime"
              value-format="yyyy-MM-dd HH:mm:ss"
              placeholder="未设置则按当前时间/已占用时间"
              style="width: 100%"
            />
          </template>
        </el-table-column>
        <el-table-column label="周期结束时间" min-width="180">
          <template slot-scope="scope">
            <el-date-picker
              v-model="scope.row.cycleEndTime"
              type="datetime"
              value-format="yyyy-MM-dd HH:mm:ss"
              placeholder="例如本轮生产做到何时"
              style="width: 100%"
            />
          </template>
        </el-table-column>
        <el-table-column label="下周起排时间" width="130" align="center">
          <template slot-scope="scope">
            <el-time-picker
              v-model="scope.row.nextWeekStartTime"
              value-format="HH:mm:ss"
              placeholder="08:00:00"
              style="width: 100%"
            />
          </template>
        </el-table-column>
        <el-table-column label="周末休息" width="90" align="center">
          <template slot-scope="scope">
            <el-switch v-model="scope.row.weekendRest" :active-value="1" :inactive-value="0" />
          </template>
        </el-table-column>
        <el-table-column label="周日不可排" width="100" align="center">
          <template slot-scope="scope">
            <el-switch v-model="scope.row.sundayDisabled" :active-value="1" :inactive-value="0" />
          </template>
        </el-table-column>
        <el-table-column label="启用" width="80" align="center">
          <template slot-scope="scope">
            <el-switch v-model="scope.row.enabled" :active-value="1" :inactive-value="0" />
          </template>
        </el-table-column>
        <el-table-column label="默认最低人数" width="120" align="center">
          <template slot-scope="scope">
            <el-input-number v-model="scope.row.minStaffRequired" :min="1" :max="99" size="mini" controls-position="right" />
          </template>
        </el-table-column>
        <el-table-column label="默认技能要求" width="140" align="center">
          <template slot-scope="scope">
            <el-select v-model="scope.row.requiredSkillLevel" clearable size="small" placeholder="默认不限">
              <el-option label="一般(normal)" value="normal" />
              <el-option label="熟练(skilled)" value="skilled" />
              <el-option label="精通(expert)" value="expert" />
            </el-select>
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

function createSearchForm() {
  return {
    equipmentType: '',
    keyword: ''
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
    weekendRest: Number(row.weekendRest == null ? 1 : row.weekendRest),
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
      searchForm: createSearchForm()
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
        const res = await getEquipmentScheduleConfigList(this.searchForm)
        if (res && (res.code === 200 || res.code === 20000)) {
          this.tableData = (res.data || []).map(item => normalizeRow(item))
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
      this.searchForm = createSearchForm()
      this.fetchList()
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
          weekendRest: Number(row.weekendRest == null ? 1 : row.weekendRest),
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
</style>
