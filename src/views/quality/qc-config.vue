<template>
  <div class="app-container">
    <el-tabs v-model="activeTab" type="border-card">
      <!-- 标签页 1: 检测指标库 -->
      <el-tab-pane name="indicators" label="检测指标库">
        <div class="tab-header">
          <el-button type="primary" size="small" icon="el-icon-plus" @click="handleAddIndicator">新增指标</el-button>
          <span class="tip">管理全公司统一的质量检测项名称、单位和默认分类。</span>
        </div>
        <el-table v-loading="indicatorLoading" :data="indicators" border stripe size="small">
          <el-table-column prop="name" label="指标名称" width="200" />
          <el-table-column prop="defaultUnit" label="默认单位" width="120" />
          <el-table-column prop="category" label="分类" width="120" align="center" />
          <el-table-column prop="description" label="描述" show-overflow-tooltip />
          <el-table-column label="状态" width="100" align="center">
            <template slot-scope="{ row }">
              <el-tag :type="row.status === 1 ? 'success' : 'info'" size="mini">{{ row.status === 1 ? '启用' : '禁用' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="150" align="center">
            <template slot-scope="{ row }">
              <el-button type="text" size="mini" icon="el-icon-edit" @click="handleEditIndicator(row)">编辑</el-button>
              <el-button type="text" size="mini" icon="el-icon-delete" style="color:#f56c6c" @click="handleDeleteIndicator(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- 标签页 2: 缺陷分类库 -->
      <el-tab-pane name="defects" label="缺陷分类库">
        <div class="tab-header">
          <el-button type="primary" size="small" icon="el-icon-plus" @click="handleAddDefect">新增缺陷类型</el-button>
          <span class="tip">维护质检不合格时的原因列表（如：气泡、溢胶等）。</span>
        </div>
        <el-table v-loading="defectLoading" :data="defects" border stripe size="small">
          <el-table-column prop="defectCode" label="缺陷代码" width="140" />
          <el-table-column prop="defectName" label="缺陷名称" width="200" />
          <el-table-column prop="category" label="分类" width="140" align="center" />
          <el-table-column prop="description" label="描述" show-overflow-tooltip />
          <el-table-column label="操作" width="150" align="center">
            <template slot-scope="{ row }">
              <el-button type="text" size="mini" icon="el-icon-edit" @click="handleEditDefect(row)">编辑</el-button>
              <el-button type="text" size="mini" icon="el-icon-delete" style="color:#f56c6c" @click="handleDeleteDefect(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>

    <!-- 指标编辑弹窗 -->
    <el-dialog :title="indicatorForm.id ? '编辑指标' : '新增指标'" :visible.sync="indicatorDialogVisible" width="500px">
      <el-form ref="indicatorForm" :model="indicatorForm" :rules="indicatorRules" label-width="100px" size="small">
        <el-form-item label="指标名称" prop="name">
          <el-input v-model="indicatorForm.name" placeholder="请输入指标名称" />
        </el-form-item>
        <el-form-item label="默认单位" prop="defaultUnit">
          <el-input v-model="indicatorForm.defaultUnit" placeholder="如: μm, N/25mm" />
        </el-form-item>
        <el-form-item label="分类" prop="category">
          <el-select v-model="indicatorForm.category" style="width:100%">
            <el-option label="性能" value="性能" />
            <el-option label="尺寸" value="尺寸" />
            <el-option label="外观" value="外观" />
            <el-option label="其它" value="其它" />
          </el-select>
        </el-form-item>
        <el-form-item label="详细说明" prop="description">
          <el-input v-model="indicatorForm.description" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="indicatorForm.status">
            <el-radio :label="1">启用</el-radio>
            <el-radio :label="0">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <div slot="footer">
        <el-button size="small" @click="indicatorDialogVisible = false">取消</el-button>
        <el-button type="primary" size="small" :loading="submitting" @click="saveIndicator">确认保存</el-button>
      </div>
    </el-dialog>

    <!-- 缺陷编辑弹窗 -->
    <el-dialog :title="defectForm.id ? '编辑缺陷' : '新增缺陷'" :visible.sync="defectDialogVisible" width="500px">
      <el-form ref="defectForm" :model="defectForm" :rules="defectRules" label-width="100px" size="small">
        <el-form-item label="缺陷代码" prop="defectCode">
          <el-input v-model="defectForm.defectCode" placeholder="如: D001" />
        </el-form-item>
        <el-form-item label="缺陷名称" prop="defectName">
          <el-input v-model="defectForm.defectName" placeholder="如: 表面气泡" />
        </el-form-item>
        <el-form-item label="分类" prop="category">
          <el-input v-model="defectForm.category" placeholder="如: 制程缺陷" />
        </el-form-item>
        <el-form-item label="描述说明" prop="description">
          <el-input v-model="defectForm.description" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <div slot="footer">
        <el-button size="small" @click="defectDialogVisible = false">取消</el-button>
        <el-button type="primary" size="small" :loading="submitting" @click="saveDefect">确认保存</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import request from '@/utils/request'

export default {
  name: 'QualityConfig',
  data() {
    return {
      activeTab: 'indicators',
      submitting: false,

      // 指标库
      indicatorLoading: false,
      indicators: [],
      indicatorDialogVisible: false,
      indicatorForm: { id: null, name: '', defaultUnit: '', category: '性能', description: '', status: 1 },
      indicatorRules: {
        name: [{ required: true, message: '请输入指标名称', trigger: 'blur' }]
      },

      // 缺陷库
      defectLoading: false,
      defects: [],
      defectDialogVisible: false,
      defectForm: { id: null, defectCode: '', defectName: '', category: '默认', description: '' },
      defectRules: {
        defectCode: [{ required: true, message: '请输入缺陷代码', trigger: 'blur' }],
        defectName: [{ required: true, message: '请输入缺陷名称', trigger: 'blur' }]
      }
    }
  },
  created() {
    this.fetchIndicators()
    this.fetchDefects()
  },
  methods: {
    // 指标逻辑
    async fetchIndicators() {
      this.indicatorLoading = true
      try {
        const res = await request.get('/api/quality/indicator-dict/list')
        if (res.code === 200 || res.code === 20000) {
          this.indicators = res.data || []
        }
      } finally {
        this.indicatorLoading = false
      }
    },
    handleAddIndicator() {
      this.indicatorForm = { id: null, name: '', defaultUnit: '', category: '性能', description: '', status: 1 }
      this.indicatorDialogVisible = true
      this.$nextTick(() => this.$refs.indicatorForm && this.$refs.indicatorForm.clearValidate())
    },
    handleEditIndicator(row) {
      this.indicatorForm = { ...row }
      this.indicatorDialogVisible = true
    },
    async saveIndicator() {
      try {
        await this.$refs.indicatorForm.validate()
        this.submitting = true
        const res = await request.post('/api/quality/indicator-dict/save', this.indicatorForm)
        if (res.code === 200 || res.code === 20000) {
          this.$message.success('保存成功')
          this.indicatorDialogVisible = false
          this.fetchIndicators()
        }
      } finally {
        this.submitting = false
      }
    },
    async handleDeleteIndicator(row) {
      try {
        await this.$confirm(`确认删除指标 "${row.name}" 吗？`, '提示', { type: 'warning' })
        const res = await request.delete(`/api/quality/indicator-dict/${row.id}`)
        if (res.code === 200 || res.code === 20000) {
          this.$message.success('删除成功')
          this.fetchIndicators()
        }
      } catch (e) {}
    },

    // 缺陷逻辑
    async fetchDefects() {
      this.defectLoading = true
      try {
        const res = await request.get('/api/quality/defect-type/list')
        if (res.code === 200 || res.code === 20000) {
          this.defects = res.data || []
        }
      } finally {
        this.defectLoading = false
      }
    },
    handleAddDefect() {
      this.defectForm = { id: null, defectCode: '', defectName: '', category: '默认', description: '' }
      this.defectDialogVisible = true
      this.$nextTick(() => this.$refs.defectForm && this.$refs.defectForm.clearValidate())
    },
    handleEditDefect(row) {
      this.defectForm = { ...row }
      this.defectDialogVisible = true
    },
    async saveDefect() {
      try {
        await this.$refs.defectForm.validate()
        this.submitting = true
        const res = await request.post('/api/quality/defect-type', this.defectForm)
        if (res.code === 200 || res.code === 20000) {
          this.$message.success('保存成功')
          this.defectDialogVisible = false
          this.fetchDefects()
        }
      } finally {
        this.submitting = false
      }
    },
    async handleDeleteDefect(row) {
      try {
        await this.$confirm(`确认删除缺陷 "${row.defectName}" 吗？`, '提示', { type: 'warning' })
        const res = await request.delete(`/api/quality/defect-type/${row.id}`)
        if (res.code === 200 || res.code === 20000) {
          this.$message.success('删除成功')
          this.fetchDefects()
        }
      } catch (e) {}
    }
  }
}
</script>

<style lang="scss" scoped>
.tab-header {
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  .tip {
    margin-left: 20px;
    color: #909399;
    font-size: 13px;
  }
}
</style>
