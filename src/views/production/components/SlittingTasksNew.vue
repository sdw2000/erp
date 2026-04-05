<template>
  <div class="app-container">
    <!-- 筛选条件 -->
    <el-card shadow="never" class="mb-10">
      <el-form :inline="true" :model="query" @submit.native.prevent>
        <el-form-item label="订单号">
          <el-input v-model="query.orderNo" placeholder="输入订单号" style="width: 150px" clearable />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="query.status" placeholder="全部" clearable style="width: 140px">
            <el-option label="待生产" value="pending" />
            <el-option label="进行中" value="in_progress" />
            <el-option label="已完成" value="completed" />
          </el-select>
        </el-form-item>
        <el-form-item label="计划日期">
          <el-date-picker
            v-model="query.planDate"
            type="date"
            placeholder="选择日期"
            value-format="yyyy-MM-dd"
            style="width: 150px"
          />
        </el-form-item>
        <el-form-item label="机台">
          <el-select v-model="query.equipmentId" placeholder="全部" clearable style="width: 140px">
            <el-option v-for="eq in safeEquipmentList" :key="eq.id" :label="eq.equipmentCode" :value="eq.id" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="el-icon-search" @click="loadData">查询</el-button>
          <el-button icon="el-icon-refresh" @click="resetQuery">重置</el-button>
          <el-button type="success" icon="el-icon-plus" @click="showAddDialog">新增</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 表格 -->
    <el-card shadow="never">
      <el-table v-loading="loading" :data="list" border stripe @selection-change="handleSelectionChange">
        <el-table-column type="selection" width="50" />
        <el-table-column prop="taskNo" label="分切任务号" width="140" />
        <el-table-column prop="orderNo" label="订单号" width="130" />
        <el-table-column prop="orderItemId" label="详情号" width="100" />
        <el-table-column label="规格" min-width="220" show-overflow-tooltip>
          <template slot-scope="{row}">
            <div>{{ formatSpec(row) }}</div>
          </template>
        </el-table-column>
        <el-table-column prop="planRolls" label="数量(卷)" width="100" />
        <el-table-column prop="equipmentCode" label="机台号" width="100" />
        <el-table-column label="计划时间(精确到10min)" min-width="220">
          <template slot-scope="{row}">
            <div class="time-range">
              <span v-if="row.planStartTime">{{ formatTime(row.planStartTime) }}</span>
              <span v-if="row.planEndTime"> ~ {{ formatTime(row.planEndTime) }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="actualStartTime" label="实际开始时间" width="180">
          <template slot-scope="{row}">
            <el-date-picker
              v-model="row.actualStartTime"
              type="datetime"
              value-format="yyyy-MM-dd HH:mm:ss"
              format="yyyy-MM-dd HH:mm"
              placeholder="选择时间"
              style="width: 100%"
              @change="val => updateTask(row, 'actualStartTime', val)"
            />
          </template>
        </el-table-column>
        <el-table-column prop="operatorName" label="操作人" width="100" />
        <el-table-column prop="status" label="状态" width="100">
          <template slot-scope="{row}">
            <el-tag :type="statusTagType(row.status)" size="small">{{ statusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="150" show-overflow-tooltip />
        <el-table-column label="操作" width="200" fixed="right">
          <template slot-scope="{row}">
            <el-button type="text" size="small" @click="editTask(row)">编辑</el-button>
            <el-button type="text" size="small" @click="startTask(row)">开始</el-button>
            <el-button type="text" size="small" @click="completeTask(row)">完成</el-button>
            <el-button type="text" size="small" @click="deleteTask(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <el-pagination
        class="mt-10 right"
        :current-page="query.pageNum"
        :page-size="query.pageSize"
        :total="total"
        layout="total, prev, pager, next"
        @current-change="currentPageChange"
      />
    </el-card>

    <!-- 新增/编辑对话框 -->
    <el-dialog
      :title="isEdit ? '编辑分切任务' : '新增分切任务'"
      :visible.sync="dialogVisible"
      width="70%"
      @close="resetForm"
    >
      <el-form ref="form" :model="form" :rules="rules" label-width="120px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="订单号" prop="orderNo">
              <el-input v-model="form.orderNo" placeholder="输入订单号" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="详情号" prop="orderDetailNo">
              <el-input v-model="form.orderDetailNo" placeholder="输入详情号" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="物料编码" prop="materialCode">
              <el-input v-model="form.materialCode" placeholder="输入物料编码" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="物料名称" prop="materialName">
              <el-input v-model="form.materialName" placeholder="输入物料名称" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="规格(宽度mm)" prop="targetWidth">
              <el-input-number v-model="form.targetWidth" :min="0" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="长度(米)" prop="slitLength">
              <el-input-number v-model="form.slitLength" :min="0" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="数量(卷)" prop="planRolls">
              <el-input-number v-model="form.planRolls" :min="0" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="计划开始时间" prop="planStartTime">
              <el-date-picker
                v-model="form.planStartTime"
                type="datetime"
                value-format="yyyy-MM-dd HH:mm:ss"
                format="yyyy-MM-dd HH:mm"
                placeholder="选择时间"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="计划结束时间" prop="planEndTime">
              <el-date-picker
                v-model="form.planEndTime"
                type="datetime"
                value-format="yyyy-MM-dd HH:mm:ss"
                format="yyyy-MM-dd HH:mm"
                placeholder="选择时间"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="机台" prop="equipmentId">
              <el-select v-model="form.equipmentId" placeholder="选择机台">
                <el-option v-for="eq in safeEquipmentList" :key="eq.id" :label="eq.equipmentCode" :value="eq.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="操作人" prop="operatorName">
              <el-input v-model="form.operatorName" placeholder="输入操作人名称" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="24">
            <el-form-item label="备注" prop="remark">
              <el-input v-model="form.remark" type="textarea" rows="3" placeholder="输入备注信息" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>

      <span slot="footer" class="dialog-footer">
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveTask">保存</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import { getSlittingTasks, addSlittingTask, updateSlittingTask, deleteSlittingTask, startSlittingTask, completeSlittingTask } from '@/api/slittingTasks'
import { getEquipmentList } from '@/api/equipment'

export default {
  name: 'SlittingTasksNew',
  data() {
    return {
      loading: false,
      list: [],
      total: 0,
      equipmentList: [],
      query: {
        orderNo: '',
        status: '',
        planDate: '',
        equipmentId: '',
        pageNum: 1,
        pageSize: 20
      },
      dialogVisible: false,
      isEdit: false,
      form: {
        id: '',
        taskNo: '',
        orderNo: '',
        orderDetailNo: '',
        orderItemId: '',
        materialCode: '',
        materialName: '',
        spec: '',
        targetWidth: 0,
        slitLength: 0,
        thickness: 0,
        planRolls: 0,
        planStartTime: '',
        planEndTime: '',
        actualStartTime: '',
        equipmentId: '',
        operatorName: '',
        status: 'pending',
        remark: ''
      },
      rules: {
        orderNo: [{ required: true, message: '订单号不能为空', trigger: 'blur' }],
        materialCode: [{ required: true, message: '物料编码不能为空', trigger: 'blur' }],
        planRolls: [{ required: true, message: '数量不能为空', trigger: 'blur' }]
      },
      selected: []
    }
  },
  computed: {
    safeEquipmentList() {
      const list = Array.isArray(this.equipmentList)
        ? this.equipmentList
        : (this.equipmentList && Array.isArray(this.equipmentList.records))
          ? this.equipmentList.records
          : []
      return list.filter(e => e && e.id != null)
    }
  },
  created() {
    this.loadEquipment()
    this.loadData()
  },
  methods: {
    // 格式化时间显示 (精确到10分钟)
    formatTime(val) {
      if (!val) return ''
      const d = new Date(val)
      if (Number.isNaN(d.getTime())) return ''
      const pad = n => (n < 10 ? '0' + n : n)
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
    },

    formatSpec(row) {
      // width candidates
      const width = row.targetWidth || row.jumboWidth || row.width || row.planWidth || row.w || null
      const thickness = row.thickness || row.totalThickness || row.specThickness || null
      const length = row.slitLength || row.planLength || row.length || null

      if (!width && !thickness && !length) {
        return row.spec || '-'
      }

      const parts = []
      if (width) parts.push(`${width}mm`)
      if (thickness) parts.push(`× ${thickness}μm`)
      if (length) parts.push(`/ ${length}m`)
      return parts.join(' ')
    },

    statusText(status) {
      const map = {
        pending: '待生产',
        in_progress: '进行中',
        completed: '已完成',
        cancelled: '已取消'
      }
      return map[status] || status
    },

    statusTagType(status) {
      const map = {
        pending: 'info',
        in_progress: 'warning',
        completed: 'success',
        cancelled: 'danger'
      }
      return map[status] || 'info'
    },

    // 加载设备列表
    async loadEquipment() {
      try {
        const res = await getEquipmentList({ type: 'SLITTING' })
        this.equipmentList = res.data || []
      } catch (err) {
        this.$message.error('加载设备列表失败')
      }
    },

    // 加载分切任务列表
    async loadData() {
      this.loading = true
      try {
        const res = await getSlittingTasks(this.query)
        this.list = res.data?.list || res.data || []
        this.total = Number(res.data?.total || 0)
      } catch (err) {
        this.$message.error('加载分切任务失败: ' + (err.message || ''))
      } finally {
        this.loading = false
      }
    },

    // 重置查询
    resetQuery() {
      this.query = {
        orderNo: '',
        status: '',
        planDate: '',
        equipmentId: '',
        pageNum: 1,
        pageSize: 20
      }
      this.loadData()
    },

    // 分页
    currentPageChange(page) {
      this.query.pageNum = page
      this.loadData()
    },

    // 选中行
    handleSelectionChange(selection) {
      this.selected = selection
    },

    // 新增对话框
    showAddDialog() {
      this.isEdit = false
      this.resetForm()
      this.dialogVisible = true
    },

    // 编辑任务
    editTask(row) {
      this.isEdit = true
      this.form = { ...row }
      this.dialogVisible = true
    },

    // 重置表单
    resetForm() {
      if (this.$refs.form) this.$refs.form.clearValidate()
      this.form = {
        id: '',
        taskNo: '',
        orderNo: '',
        orderDetailNo: '',
        orderItemId: '',
        materialCode: '',
        materialName: '',
        spec: '',
        targetWidth: 0,
        slitLength: 0,
        thickness: 0,
        planRolls: 0,
        planStartTime: '',
        planEndTime: '',
        actualStartTime: '',
        equipmentId: '',
        operatorName: '',
        status: 'pending',
        remark: ''
      }
    },

    // 保存任务
    async saveTask() {
      await this.$refs.form.validate()
      try {
        if (this.isEdit) {
          await updateSlittingTask(this.form)
          this.$message.success('更新成功')
        } else {
          await addSlittingTask(this.form)
          this.$message.success('新增成功')
        }
        this.dialogVisible = false
        this.loadData()
      } catch (err) {
        this.$message.error('保存失败: ' + (err.message || ''))
      }
    },

    // 更新任务字段
    async updateTask(row, field, value) {
      try {
        const data = { ...row }
        data[field] = value
        await updateSlittingTask(data)
        this.$message.success('更新成功')
        this.loadData()
      } catch (err) {
        this.$message.error('更新失败: ' + (err.message || ''))
      }
    },

    // 开始任务
    async startTask(row) {
      try {
        await startSlittingTask(row.id)
        this.$message.success('任务已开始')
        this.loadData()
      } catch (err) {
        this.$message.error('操作失败: ' + (err.message || ''))
      }
    },

    // 完成任务
    async completeTask(row) {
      try {
        await completeSlittingTask(row.id)
        this.$message.success('任务已完成')
        this.loadData()
      } catch (err) {
        this.$message.error('操作失败: ' + (err.message || ''))
      }
    },

    // 删除任务
    deleteTask(row) {
      this.$confirm('确定删除该任务?', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(async() => {
        try {
          await deleteSlittingTask(row.id)
          this.$message.success('删除成功')
          this.loadData()
        } catch (err) {
          this.$message.error('删除失败: ' + (err.message || ''))
        }
      }).catch(() => {})
    }
  }
}
</script>

<style scoped>
.time-range {
  white-space: nowrap;
}
</style>
