<template>
  <div class="personnel-schedule-page">
    <el-card>
      <div slot="header" class="clearfix">
        <span>设备人员排单（工序化）</span>
        <div class="header-actions">
          <el-button size="small" icon="el-icon-refresh-left" @click="handleReset">重置</el-button>
          <el-button size="small" icon="el-icon-search" type="primary" @click="handleSearch">查询机台</el-button>
          <el-button size="small" icon="el-icon-check" type="success" :loading="saving" @click="saveAll">保存排单</el-button>
        </div>
      </div>

      <el-alert
        :title="ruleTitle"
        type="info"
        :closable="false"
        style="margin-bottom: 12px;"
      />

      <el-form :inline="true" :model="form" class="search-form">
        <el-form-item label="计划日期">
          <el-date-picker v-model="form.planDate" type="date" value-format="yyyy-MM-dd" />
        </el-form-item>
        <el-form-item label="工序">
          <el-select v-model="form.processType" style="width: 160px" @change="handleProcessChange">
            <el-option label="涂布" value="COATING" />
            <el-option label="复卷" value="REWINDING" />
            <el-option label="分切" value="SLITTING" />
          </el-select>
        </el-form-item>
        <el-form-item label="班次">
          <el-select v-model="form.shiftId" clearable filterable placeholder="请选择班次" style="width: 180px" @change="applyShiftToAll">
            <el-option v-for="item in shiftList" :key="item.id" :label="`${item.shiftName}(${item.shiftCode})`" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="班组">
          <el-select v-model="form.teamId" clearable filterable placeholder="请选择班组" style="width: 220px" @change="applyTeamToAll">
            <el-option v-for="item in teamList" :key="item.id" :label="item.teamName" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="关键字">
          <el-input v-model="form.keyword" clearable placeholder="机台编号/名称" style="width: 220px" @keyup.enter.native="handleSearch" />
        </el-form-item>
      </el-form>

      <div class="machine-select-panel">
        <div class="panel-title">机台开线选择</div>
        <div class="machine-tags">
          <el-tag
            v-for="machine in filteredMachines"
            :key="machine.equipmentId"
            :type="isMachineSelected(machine.equipmentId) ? 'success' : 'info'"
            effect="plain"
            class="machine-tag"
            @click="toggleMachine(machine)"
          >
            {{ machine.equipmentCode }}-{{ machine.equipmentName }}
          </el-tag>
        </div>
      </div>

      <div class="summary-row">
        <el-tag type="primary">已选机台：{{ selectedMachines.length }}</el-tag>
        <el-tag type="warning">规则需人：{{ requiredStaffCount }}</el-tag>
        <el-tag :type="actualStaffCount >= requiredStaffCount ? 'success' : 'danger'">
          实际到岗：{{ actualStaffCount }}
        </el-tag>
        <el-tag v-if="staffGap !== 0" :type="staffGap > 0 ? 'danger' : 'success'">
          {{ staffGap > 0 ? `缺口 ${staffGap}` : `富余 ${Math.abs(staffGap)}` }}
        </el-tag>
      </div>
    </el-card>

    <el-card style="margin-top: 12px;">
      <div slot="header" class="clearfix">
        <span>排单明细（班组-机台-班次-人员）</span>
        <div class="header-actions">
          <el-button size="small" type="primary" icon="el-icon-plus" @click="addRow">新增行</el-button>
          <el-button size="small" icon="el-icon-refresh" @click="loadAssignmentsBySelected">刷新现有排班</el-button>
        </div>
      </div>

      <el-table :data="assignmentRows" border stripe>
        <el-table-column type="index" width="50" label="#" align="center" />
        <el-table-column label="机台" min-width="220">
          <template slot-scope="scope">
            <el-select v-model="scope.row.equipmentId" size="small" filterable style="width: 100%" @change="val => onMachineChange(scope.row, val)">
              <el-option
                v-for="machine in selectedMachines"
                :key="machine.equipmentId"
                :label="`${machine.equipmentCode}-${machine.equipmentName}`"
                :value="machine.equipmentId"
              />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="班次" width="170">
          <template slot-scope="scope">
            <el-select v-model="scope.row.shiftId" size="small" filterable placeholder="班次" style="width: 150px" @change="val => onShiftChange(scope.row, val)">
              <el-option v-for="item in shiftList" :key="item.id" :label="`${item.shiftName}(${item.shiftCode})`" :value="item.id" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="班组" width="170">
          <template slot-scope="scope">
            <el-select v-model="scope.row.teamId" size="small" filterable clearable placeholder="班组" style="width: 150px" @change="val => onTeamChange(scope.row, val)">
              <el-option v-for="item in teamList" :key="item.id" :label="item.teamName" :value="item.id" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="人员" min-width="220">
          <template slot-scope="scope">
            <el-select v-model="scope.row.staffId" size="small" filterable clearable placeholder="人员" style="width: 100%" @change="val => onStaffChange(scope.row, val)">
              <el-option v-for="item in staffList" :key="item.id" :label="`${item.staffCode}-${item.staffName}`" :value="item.id" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="角色" width="120">
          <template slot-scope="scope">
            <el-select v-model="scope.row.roleName" size="small" style="width: 100px">
              <el-option label="主操" value="operator" />
              <el-option label="副操" value="assistant" />
              <el-option label="协助" value="support" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="临时协助" width="100" align="center">
          <template slot-scope="scope">
            <el-switch v-model="scope.row.isTemporarySupport" :active-value="1" :inactive-value="0" />
          </template>
        </el-table-column>
        <el-table-column label="到岗" width="90" align="center">
          <template slot-scope="scope">
            <el-switch v-model="scope.row.onDuty" :active-value="1" :inactive-value="0" />
          </template>
        </el-table-column>
        <el-table-column label="备注" min-width="180">
          <template slot-scope="scope">
            <el-input v-model="scope.row.remark" size="small" maxlength="100" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="90" align="center">
          <template slot-scope="scope">
            <el-button type="text" size="small" @click="removeRow(scope.$index)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="validation-box" v-if="validationMessages.length">
        <el-alert
          v-for="(msg, idx) in validationMessages"
          :key="idx"
          :title="msg"
          type="warning"
          :closable="false"
          show-icon
          style="margin-top: 8px;"
        />
      </div>
    </el-card>
  </div>
</template>

<script>
import { getEquipmentList, getEquipmentStaffAssignmentList, saveEquipmentStaffAssignments } from '@/api/equipment'
import { getAllShifts, getAllActiveTeams, getAllActiveStaff } from '@/api/staff'

function todayString() {
  const d = new Date()
  const p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export default {
  name: 'PersonnelSchedule',
  data() {
    return {
      form: {
        planDate: todayString(),
        processType: 'COATING',
        shiftId: null,
        teamId: null,
        keyword: ''
      },
      saving: false,
      allMachines: [],
      selectedMachineIds: [],
      assignmentRows: [],
      shiftList: [],
      teamList: [],
      staffList: []
    }
  },
  computed: {
    ruleTitle() {
      const map = {
        COATING: '涂布：班组对应机台班次；支持临时协助；一个班组可开多条线。',
        REWINDING: '复卷：每台机台至少1名主操到岗。',
        SLITTING: '分切：1人可负责2台机台（同班次）。'
      }
      return map[this.form.processType] || ''
    },
    filteredMachines() {
      return (this.allMachines || []).filter(item => this.matchProcess(item, this.form.processType))
    },
    selectedMachines() {
      const idSet = new Set(this.selectedMachineIds.map(x => Number(x)))
      return this.filteredMachines.filter(item => idSet.has(Number(item.equipmentId)))
    },
    requiredStaffCount() {
      const machineCount = this.selectedMachines.length
      if (this.form.processType === 'SLITTING') {
        return Math.ceil(machineCount / 2)
      }
      return machineCount
    },
    actualStaffCount() {
      const set = new Set(
        (this.assignmentRows || [])
          .filter(x => Number(x.onDuty) === 1 && x.staffId)
          .map(x => Number(x.staffId))
      )
      return set.size
    },
    staffGap() {
      return this.requiredStaffCount - this.actualStaffCount
    },
    validationMessages() {
      const msgs = []
      if (!this.selectedMachines.length) {
        msgs.push('请先选择开线机台。')
      }
      if (this.staffGap > 0) {
        msgs.push(`当前人员缺口 ${this.staffGap} 人。`)
      }

      if (this.form.processType === 'REWINDING') {
        const missingMachines = this.selectedMachines.filter(machine => {
          const count = this.assignmentRows.filter(r => Number(r.equipmentId) === Number(machine.equipmentId) && r.staffId && Number(r.onDuty) === 1).length
          return count < 1
        })
        if (missingMachines.length) {
          msgs.push('复卷规则校验：存在机台未分配到岗主操。')
        }
      }

      if (this.form.processType === 'SLITTING') {
        const group = {}
        this.assignmentRows.forEach(row => {
          if (!row.staffId || Number(row.onDuty) !== 1) return
          const key = Number(row.staffId)
          group[key] = group[key] || new Set()
          if (row.equipmentId) group[key].add(Number(row.equipmentId))
        })
        const over = Object.keys(group).some(k => (group[k] && group[k].size > 2))
        if (over) {
          msgs.push('分切规则校验：存在人员负责超过2台机台。')
        }
      }

      if (this.form.processType === 'COATING') {
        const hasOperatorPerMachine = this.selectedMachines.every(machine => {
          return this.assignmentRows.some(r => Number(r.equipmentId) === Number(machine.equipmentId) && r.roleName === 'operator' && r.staffId && Number(r.onDuty) === 1)
        })
        if (!hasOperatorPerMachine) {
          msgs.push('涂布规则校验：每台开线机台至少应有1名主操。')
        }
      }
      return msgs
    }
  },
  created() {
    this.init()
  },
  methods: {
    async init() {
      await Promise.all([this.loadShifts(), this.loadTeams(), this.loadStaff(), this.loadMachines()])
    },
    async loadShifts() {
      const res = await getAllShifts()
      if (res.code === 200 || res.code === 20000) {
        this.shiftList = res.data || []
      }
    },
    async loadTeams() {
      const res = await getAllActiveTeams()
      if (res.code === 200 || res.code === 20000) {
        this.teamList = res.data || []
      }
    },
    async loadStaff() {
      const res = await getAllActiveStaff()
      if (res.code === 200 || res.code === 20000) {
        this.staffList = res.data || []
      }
    },
    async loadMachines() {
      const res = await getEquipmentList({ current: 1, size: 1000, keyword: this.form.keyword || undefined })
      if (res.code === 200 || res.code === 20000) {
        const data = res.data || {}
        this.allMachines = Array.isArray(data) ? data : (data.records || [])
      }
    },
    matchProcess(machine, processType) {
      const text = `${machine.equipmentType || ''} ${machine.equipmentTypeName || ''} ${machine.equipmentCode || ''} ${machine.equipmentName || ''}`.toLowerCase()
      if (processType === 'COATING') return /涂布|coating|tb/.test(text)
      if (processType === 'REWINDING') return /复卷|rewinding|rw|fj/.test(text)
      if (processType === 'SLITTING') return /分切|slitting|sl|fq/.test(text)
      return true
    },
    handleProcessChange() {
      this.selectedMachineIds = []
      this.assignmentRows = []
    },
    async handleSearch() {
      await this.loadMachines()
      this.selectedMachineIds = this.selectedMachineIds.filter(id => this.filteredMachines.some(m => Number(m.equipmentId) === Number(id)))
      if (this.selectedMachineIds.length) {
        this.syncRowsWithSelectedMachines()
      }
    },
    isMachineSelected(id) {
      return this.selectedMachineIds.some(x => Number(x) === Number(id))
    },
    toggleMachine(machine) {
      const id = Number(machine.equipmentId)
      if (this.isMachineSelected(id)) {
        this.selectedMachineIds = this.selectedMachineIds.filter(x => Number(x) !== id)
      } else {
        this.selectedMachineIds.push(id)
      }
      this.syncRowsWithSelectedMachines()
    },
    syncRowsWithSelectedMachines() {
      const selectedSet = new Set(this.selectedMachineIds.map(x => Number(x)))
      this.assignmentRows = (this.assignmentRows || []).filter(row => selectedSet.has(Number(row.equipmentId)))

      this.selectedMachines.forEach(machine => {
        const exists = this.assignmentRows.some(row => Number(row.equipmentId) === Number(machine.equipmentId))
        if (!exists) {
          this.assignmentRows.push(this.createDefaultRow(machine))
        }
      })
    },
    createDefaultRow(machine) {
      const shift = this.shiftList.find(x => Number(x.id) === Number(this.form.shiftId)) || {}
      const team = this.teamList.find(x => Number(x.id) === Number(this.form.teamId)) || {}
      return {
        id: null,
        equipmentId: machine.equipmentId,
        equipmentCode: machine.equipmentCode || '',
        equipmentName: machine.equipmentName || '',
        shiftId: this.form.shiftId || null,
        shiftCode: shift.shiftCode || '',
        shiftName: shift.shiftName || '',
        teamId: this.form.teamId || null,
        teamName: team.teamName || '',
        staffId: null,
        staffCode: '',
        staffName: '',
        roleName: 'operator',
        isTemporarySupport: 0,
        onDuty: 1,
        remark: ''
      }
    },
    onMachineChange(row, equipmentId) {
      const machine = this.selectedMachines.find(x => Number(x.equipmentId) === Number(equipmentId))
      row.equipmentCode = machine ? machine.equipmentCode : ''
      row.equipmentName = machine ? machine.equipmentName : ''
    },
    onShiftChange(row, shiftId) {
      const shift = this.shiftList.find(x => Number(x.id) === Number(shiftId)) || {}
      row.shiftCode = shift.shiftCode || ''
      row.shiftName = shift.shiftName || ''
    },
    onTeamChange(row, teamId) {
      const team = this.teamList.find(x => Number(x.id) === Number(teamId)) || {}
      row.teamName = team.teamName || ''
    },
    onStaffChange(row, staffId) {
      const staff = this.staffList.find(x => Number(x.id) === Number(staffId)) || {}
      row.staffCode = staff.staffCode || ''
      row.staffName = staff.staffName || ''
    },
    applyShiftToAll() {
      this.assignmentRows.forEach(row => {
        row.shiftId = this.form.shiftId || null
        this.onShiftChange(row, row.shiftId)
      })
    },
    applyTeamToAll() {
      this.assignmentRows.forEach(row => {
        row.teamId = this.form.teamId || null
        this.onTeamChange(row, row.teamId)
      })
    },
    addRow() {
      const machine = this.selectedMachines[0]
      this.assignmentRows.push(this.createDefaultRow(machine || {}))
    },
    removeRow(index) {
      this.assignmentRows.splice(index, 1)
    },
    async loadAssignmentsBySelected() {
      if (!this.selectedMachineIds.length || !this.form.planDate) {
        this.$message.warning('请先选择计划日期和机台')
        return
      }
      const reqList = this.selectedMachineIds.map(id => {
        return getEquipmentStaffAssignmentList({ planDate: this.form.planDate, equipmentId: id })
      })
      const resList = await Promise.all(reqList)
      const rows = []
      resList.forEach((res, idx) => {
        const machine = this.selectedMachines.find(x => Number(x.equipmentId) === Number(this.selectedMachineIds[idx])) || {}
        if (!(res.code === 200 || res.code === 20000)) return
        ;(res.data || []).forEach(item => {
          rows.push({
            id: item.id || null,
            equipmentId: machine.equipmentId || this.selectedMachineIds[idx],
            equipmentCode: machine.equipmentCode || '',
            equipmentName: machine.equipmentName || '',
            shiftId: item.shiftId || null,
            shiftCode: item.shiftCode || '',
            shiftName: item.shiftName || '',
            teamId: this.form.teamId || null,
            teamName: '',
            staffId: item.staffId || null,
            staffCode: item.staffCode || '',
            staffName: item.staffName || '',
            roleName: item.roleName || 'operator',
            isTemporarySupport: Number(item.isTemporarySupport || 0),
            onDuty: Number(item.onDuty == null ? 1 : item.onDuty),
            remark: item.remark || ''
          })
        })
      })

      this.assignmentRows = rows.length ? rows : this.selectedMachines.map(machine => this.createDefaultRow(machine))
    },
    async saveAll() {
      if (!this.form.planDate) {
        this.$message.warning('计划日期不能为空')
        return
      }
      if (!this.assignmentRows.length) {
        this.$message.warning('没有可保存的排单数据')
        return
      }
      if (this.validationMessages.length) {
        this.$message.warning('请先处理排单规则告警后再保存')
        return
      }

      const grouped = {}
      this.assignmentRows.forEach(row => {
        const key = Number(row.equipmentId)
        if (!key) return
        grouped[key] = grouped[key] || []
        grouped[key].push(row)
      })

      const tasks = Object.keys(grouped).map(equipmentId => {
        return saveEquipmentStaffAssignments({
          planDate: this.form.planDate,
          equipmentId: Number(equipmentId),
          operator: 'system',
          assignments: grouped[equipmentId].map(row => ({
            id: row.id || null,
            shiftId: row.shiftId,
            shiftCode: row.shiftCode,
            shiftName: row.shiftName,
            staffId: row.staffId,
            staffCode: row.staffCode,
            staffName: row.staffName,
            roleName: row.roleName,
            onDuty: Number(row.onDuty == null ? 1 : row.onDuty),
            remark: row.remark || ''
          }))
        })
      })

      this.saving = true
      try {
        const results = await Promise.all(tasks)
        const failed = results.filter(x => !(x.code === 200 || x.code === 20000))
        if (failed.length) {
          this.$message.error(`保存完成，但有 ${failed.length} 台机台失败`) 
          return
        }
        this.$message.success('保存成功')
      } catch (e) {
        this.$message.error('保存失败')
      } finally {
        this.saving = false
      }
    },
    handleReset() {
      this.form = {
        planDate: todayString(),
        processType: 'COATING',
        shiftId: null,
        teamId: null,
        keyword: ''
      }
      this.selectedMachineIds = []
      this.assignmentRows = []
    }
  }
}
</script>

<style scoped>
.personnel-schedule-page {
  padding: 20px;
}
.header-actions {
  float: right;
  display: flex;
  gap: 8px;
}
.search-form {
  margin-bottom: 10px;
}
.machine-select-panel {
  border: 1px solid #ebeef5;
  border-radius: 4px;
  padding: 10px;
  margin-bottom: 10px;
}
.panel-title {
  font-size: 13px;
  color: #606266;
  margin-bottom: 8px;
}
.machine-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.machine-tag {
  cursor: pointer;
}
.summary-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
</style>
