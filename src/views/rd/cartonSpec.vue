<template>
  <div class="app-container carton-spec-page">
    <el-alert
      title="全局纸箱规格维护（非料号绑定，长×宽×高，单位mm）。支持逐行查、改、删；上方保留新增按钮。"
      type="info"
      :closable="false"
      style="margin-bottom: 16px;"
    />

    <el-card shadow="never">
      <div slot="header" class="header-row">
        <span>全局纸箱规格维护（非料号绑定）</span>
        <div>
          <el-button size="mini" @click="fetchData">重新加载</el-button>
          <el-button v-if="$hasRole('admin') || $hasRole('rd')" size="mini" type="primary" @click="handleAdd">新增</el-button>
        </div>
      </div>

      <el-form :inline="true" :model="searchForm" class="search-form" style="margin-bottom: 10px;">
        <el-form-item label="料号">
          <el-input v-model="searchForm.materialCode" clearable placeholder="请输入料号" style="width: 180px" />
        </el-form-item>
        <el-form-item label="规格名称">
          <el-input v-model="searchForm.specName" clearable placeholder="请输入规格名称" style="width: 180px" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" clearable placeholder="全部" style="width: 120px">
            <el-option :value="1" label="启用" />
            <el-option :value="0" label="禁用" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="el-icon-search" @click="handleSearch">查询</el-button>
          <el-button icon="el-icon-refresh-left" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>

      <el-table v-loading="loading" :data="list" border stripe size="small">
        <el-table-column type="index" label="#" width="60" align="center" :index="indexMethod" />
        <el-table-column prop="materialCode" label="料号" min-width="160" />
        <el-table-column prop="specName" label="规格名称" min-width="180" />
        <el-table-column prop="lengthMm" label="长(mm)" width="120" align="center" />
        <el-table-column prop="widthMm" label="宽(mm)" width="120" align="center" />
        <el-table-column prop="heightMm" label="高(mm)" width="120" align="center" />
        <el-table-column prop="status" label="状态" width="90" align="center">
          <template slot-scope="scope">
            <el-tag :type="Number(scope.row.status) === 1 ? 'success' : 'info'" size="small">
              {{ Number(scope.row.status) === 1 ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="160" show-overflow-tooltip />
        <el-table-column v-if="$hasRole('admin') || $hasRole('rd')" label="操作" width="150" fixed="right" align="center">
          <template slot-scope="scope">
            <el-button type="text" size="small" @click="handleEdit(scope.row)">编辑</el-button>
            <el-button type="text" size="small" style="color:#f56c6c" @click="handleDelete(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        style="margin-top: 12px; text-align: right"
        :current-page="pagination.page"
        :page-sizes="[20, 50, 100]"
        :page-size="pagination.size"
        :total="pagination.total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </el-card>

    <el-dialog :title="dialogTitle" :visible.sync="dialogVisible" width="680px" :close-on-click-modal="false">
      <el-form ref="form" :model="form" :rules="rules" label-width="110px" size="small">
        <el-form-item label="料号" prop="materialCode">
          <el-input v-model="form.materialCode" placeholder="请输入料号" />
        </el-form-item>
        <el-form-item label="规格名称" prop="specName">
          <el-input v-model="form.specName" placeholder="如 1号箱" />
        </el-form-item>
        <el-row :gutter="12">
          <el-col :span="8">
            <el-form-item label="长(mm)" prop="lengthMm" label-width="80px">
              <el-input-number v-model="form.lengthMm" :min="1" :step="1" :precision="0" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="宽(mm)" prop="widthMm" label-width="80px">
              <el-input-number v-model="form.widthMm" :min="1" :step="1" :precision="0" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="高(mm)" prop="heightMm" label-width="80px">
              <el-input-number v-model="form.heightMm" :min="1" :step="1" :precision="0" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="状态">
          <el-switch v-model="form.status" :active-value="1" :inactive-value="0" active-text="启用" inactive-text="禁用" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="可选" />
        </el-form-item>
      </el-form>
      <div slot="footer">
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">保存</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import {
  getCartonSpecList,
  createCartonSpec,
  updateCartonSpec,
  deleteCartonSpec
} from '@/api/rdCartonSpec'

function getEmptyForm() {
  return {
    id: null,
    materialCode: '',
    specName: '',
    lengthMm: 430,
    widthMm: 320,
    heightMm: 300,
    status: 1,
    remark: ''
  }
}

export default {
  name: 'CartonSpec',
  data() {
    return {
      loading: false,
      list: [],
      searchForm: {
        materialCode: '',
        specName: '',
        status: null
      },
      pagination: {
        page: 1,
        size: 20,
        total: 0
      },
      dialogVisible: false,
      dialogTitle: '新增纸箱规格',
      submitting: false,
      form: getEmptyForm(),
      rules: {
        materialCode: [{ required: true, message: '请输入料号', trigger: 'blur' }],
        specName: [{ required: true, message: '请输入规格名称', trigger: 'blur' }],
        lengthMm: [{ required: true, message: '请输入长', trigger: 'blur' }],
        widthMm: [{ required: true, message: '请输入宽', trigger: 'blur' }],
        heightMm: [{ required: true, message: '请输入高', trigger: 'blur' }]
      }
    }
  },
  created() {
    this.fetchData()
  },
  methods: {
    async fetchData() {
      this.loading = true
      try {
        const params = {
          page: this.pagination.page,
          size: this.pagination.size,
          materialCode: this.searchForm.materialCode,
          specName: this.searchForm.specName,
          status: this.searchForm.status
        }
        const res = await getCartonSpecList(params)
        if (res && (res.code === 200 || res.code === 20000)) {
          const data = res.data || {}
          this.list = Array.isArray(data.records) ? data.records : []
          this.pagination.total = Number(data.total || 0)
        }
      } finally {
        this.loading = false
      }
    },
    handleSearch() {
      this.pagination.page = 1
      this.fetchData()
    },
    handleReset() {
      this.searchForm = {
        materialCode: '',
        specName: '',
        status: null
      }
      this.handleSearch()
    },
    handleSizeChange(size) {
      this.pagination.size = size
      this.pagination.page = 1
      this.fetchData()
    },
    handleCurrentChange(page) {
      this.pagination.page = page
      this.fetchData()
    },
    indexMethod(index) {
      return (this.pagination.page - 1) * this.pagination.size + index + 1
    },
    handleAdd() {
      this.dialogTitle = '新增纸箱规格'
      this.form = getEmptyForm()
      this.dialogVisible = true
      this.$nextTick(() => this.$refs.form && this.$refs.form.clearValidate())
    },
    handleEdit(row) {
      this.dialogTitle = '编辑纸箱规格'
      this.form = {
        id: row.id,
        materialCode: row.materialCode,
        specName: row.specName,
        lengthMm: Number(row.lengthMm || 0),
        widthMm: Number(row.widthMm || 0),
        heightMm: Number(row.heightMm || 0),
        status: Number(row.status) === 0 ? 0 : 1,
        remark: row.remark || ''
      }
      this.dialogVisible = true
      this.$nextTick(() => this.$refs.form && this.$refs.form.clearValidate())
    },
    async handleSubmit() {
      try {
        await this.$refs.form.validate()
      } catch (e) {
        return
      }

      const payload = {
        ...this.form,
        materialCode: String(this.form.materialCode || '').trim().toUpperCase(),
        specName: String(this.form.specName || '').trim(),
        lengthMm: Math.max(1, Math.trunc(Number(this.form.lengthMm) || 0)),
        widthMm: Math.max(1, Math.trunc(Number(this.form.widthMm) || 0)),
        heightMm: Math.max(1, Math.trunc(Number(this.form.heightMm) || 0))
      }

      this.submitting = true
      try {
        const res = payload.id ? await updateCartonSpec(payload) : await createCartonSpec(payload)
        if (res && (res.code === 200 || res.code === 20000)) {
          this.$message.success(payload.id ? '更新成功' : '新增成功')
          this.dialogVisible = false
          this.fetchData()
        } else {
          this.$message.error((res && (res.msg || res.message)) || '保存失败')
        }
      } finally {
        this.submitting = false
      }
    },
    handleDelete(row) {
      this.$confirm(`确认删除料号 ${row.materialCode} 的规格 ${row.specName} 吗？`, '提示', { type: 'warning' }).then(async() => {
        const res = await deleteCartonSpec(row.id)
        if (res && (res.code === 200 || res.code === 20000)) {
          this.$message.success('删除成功')
          this.fetchData()
        } else {
          this.$message.error((res && (res.msg || res.message)) || '删除失败')
        }
      }).catch(() => {})
    }
  }
}
</script>

<style scoped>
.carton-spec-page {
  padding: 16px;
}

.header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
</style>
