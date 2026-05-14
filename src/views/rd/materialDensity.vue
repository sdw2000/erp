<template>
  <div class="material-density-container">
    <el-card>
      <div slot="header" class="clearfix">
        <span>材质密度表</span>
        <div style="float: right">
          <el-button v-if="$canEdit()" type="primary" icon="el-icon-plus" size="small" @click="handleAdd">新增材质</el-button>
        </div>
      </div>

      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="材质英文名">
          <el-input v-model="searchForm.materialEnName" clearable placeholder="如 PET" style="width: 180px" />
        </el-form-item>
        <el-form-item label="材质中文名">
          <el-input v-model="searchForm.materialCnName" clearable placeholder="如 聚酯" style="width: 180px" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.isActive" clearable placeholder="全部" style="width: 120px">
            <el-option label="启用" :value="1" />
            <el-option label="禁用" :value="0" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="el-icon-search" @click="fetchData">搜 索</el-button>
          <el-button icon="el-icon-refresh-left" @click="handleReset">重 置</el-button>
        </el-form-item>
      </el-form>

      <el-table v-loading="loading" :data="tableData" border stripe size="small" style="width:100%;margin-top: 12px;">
        <el-table-column type="index" label="序号" width="60" align="center" />
        <el-table-column prop="materialEnName" label="材质英文名" min-width="140" />
        <el-table-column prop="materialCnName" label="材质中文名" min-width="140" />
        <el-table-column prop="density" label="密度(g/cm³)" width="130" align="center" />
        <el-table-column prop="remark" label="备注" min-width="180" show-overflow-tooltip />
        <el-table-column label="状态" width="90" align="center">
          <template slot-scope="scope">
            <el-tag :type="scope.row.isActive === 1 ? 'success' : 'info'" size="small">{{ scope.row.isActive === 1 ? '启用' : '禁用' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column v-if="$canEdit()" label="操作" width="160" fixed="right" align="center">
          <template slot-scope="scope">
            <el-button type="text" size="small" icon="el-icon-edit" @click="handleEdit(scope.row)">编辑</el-button>
            <el-button type="text" size="small" icon="el-icon-delete" style="color:#f56c6c" @click="handleDelete(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog :title="dialogTitle" :visible.sync="dialogVisible" width="560px" :close-on-click-modal="false">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="110px" size="small">
        <el-form-item label="材质英文名" prop="materialEnName">
          <el-input v-model="form.materialEnName" placeholder="如 PET" />
        </el-form-item>
        <el-form-item label="材质中文名" prop="materialCnName">
          <el-input v-model="form.materialCnName" placeholder="如 聚酯" />
        </el-form-item>
        <el-form-item label="密度(g/cm³)" prop="density">
          <el-input-number v-model="form.density" :min="0" :precision="4" style="width:100%" />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="form.isActive" :active-value="1" :inactive-value="0" active-text="启用" inactive-text="禁用" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <div slot="footer">
        <el-button @click="dialogVisible = false">取 消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">确 定</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import {
  getMaterialDensityList,
  createMaterialDensity,
  updateMaterialDensity,
  deleteMaterialDensity
} from '@/api/materialDensity'

export default {
  name: 'MaterialDensityLibrary',
  data() {
    return {
      loading: false,
      tableData: [],
      searchForm: {
        materialEnName: '',
        materialCnName: '',
        isActive: null
      },
      dialogVisible: false,
      dialogTitle: '新增材质密度',
      submitting: false,
      form: this.getEmptyForm(),
      rules: {
        materialEnName: [{ required: true, message: '请输入材质英文名', trigger: 'blur' }],
        materialCnName: [{ required: true, message: '请输入材质中文名', trigger: 'blur' }],
        density: [{ required: true, message: '请输入密度', trigger: 'change' }]
      }
    }
  },
  created() {
    this.fetchData()
  },
  methods: {
    isSuccess(code) {
      return code === 200 || code === 20000
    },
    $canEdit() {
      return this.$hasRole('admin') || this.$hasRole('rd')
    },
    getEmptyForm() {
      return {
        id: null,
        materialEnName: '',
        materialCnName: '',
        density: null,
        isActive: 1,
        remark: ''
      }
    },
    async fetchData() {
      this.loading = true
      try {
        const params = {}
        if (this.searchForm.isActive !== null && this.searchForm.isActive !== undefined && this.searchForm.isActive !== '') {
          params.isActive = this.searchForm.isActive
        }
        const res = await getMaterialDensityList(params)
        if (!this.isSuccess(res.code)) {
          this.$message.error(res.message || '查询失败')
          return
        }
        const rows = Array.isArray(res.data) ? res.data : []
        const enKw = (this.searchForm.materialEnName || '').trim().toUpperCase()
        const cnKw = (this.searchForm.materialCnName || '').trim()
        this.tableData = rows.filter(r => {
          const hitEn = !enKw || String(r.materialEnName || '').toUpperCase().includes(enKw)
          const hitCn = !cnKw || String(r.materialCnName || '').includes(cnKw)
          return hitEn && hitCn
        })
      } catch (e) {
        this.$message.error(e.message || '查询失败')
      } finally {
        this.loading = false
      }
    },
    handleReset() {
      this.searchForm = { materialEnName: '', materialCnName: '', isActive: null }
      this.fetchData()
    },
    handleAdd() {
      this.dialogTitle = '新增材质密度'
      this.form = this.getEmptyForm()
      this.dialogVisible = true
      this.$nextTick(() => this.$refs.formRef && this.$refs.formRef.clearValidate())
    },
    handleEdit(row) {
      this.dialogTitle = '编辑材质密度'
      this.form = {
        id: row.id,
        materialEnName: row.materialEnName,
        materialCnName: row.materialCnName,
        density: row.density,
        isActive: row.isActive,
        remark: row.remark || ''
      }
      this.dialogVisible = true
      this.$nextTick(() => this.$refs.formRef && this.$refs.formRef.clearValidate())
    },
    async handleSubmit() {
      this.$refs.formRef.validate(async valid => {
        if (!valid) return
        this.submitting = true
        try {
          const payload = {
            ...this.form,
            materialEnName: String(this.form.materialEnName || '').trim(),
            materialCnName: String(this.form.materialCnName || '').trim(),
            remark: this.form.remark ? String(this.form.remark).trim() : ''
          }
          const res = payload.id ? await updateMaterialDensity(payload) : await createMaterialDensity(payload)
          if (!this.isSuccess(res.code)) {
            this.$message.error(res.message || '保存失败')
            return
          }
          this.$message.success(payload.id ? '更新成功' : '新增成功')
          this.dialogVisible = false
          this.fetchData()
        } catch (e) {
          this.$message.error(e.message || '保存失败')
        } finally {
          this.submitting = false
        }
      })
    },
    handleDelete(row) {
      this.$confirm(`确认删除材质【${row.materialEnName}】吗？`, '提示', { type: 'warning' }).then(async () => {
        const res = await deleteMaterialDensity(row.id)
        if (!this.isSuccess(res.code)) {
          this.$message.error(res.message || '删除失败')
          return
        }
        this.$message.success('删除成功')
        this.fetchData()
      }).catch(() => {})
    }
  }
}
</script>

<style scoped>
.material-density-container {
  padding: 15px;
}
</style>
