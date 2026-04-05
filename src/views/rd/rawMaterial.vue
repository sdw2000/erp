<template>
  <div class="raw-material-container">
    <el-card>
      <div slot="header" class="clearfix">
        <span>原材料表</span>
        <div style="float: right">
          <el-button v-if="$canImportExport()" type="success" icon="el-icon-download" size="small" @click="handleDownloadTemplate">下载模板</el-button>
          <el-button v-if="$canImportExport()" type="warning" icon="el-icon-upload2" size="small" @click="handleImportClick">导入</el-button>
          <el-button v-if="$canImportExport()" type="info" icon="el-icon-download" size="small" @click="handleExport">导出</el-button>
          <el-button v-if="$canEdit()" type="primary" icon="el-icon-plus" size="small" @click="handleAdd">新增原材料</el-button>
          <input ref="importFile" type="file" accept=".xlsx,.xls" style="display:none" @change="handleImportChange">
        </div>
      </div>

      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="物料编码">
          <el-input v-model="searchForm.materialCode" clearable placeholder="请输入物料编码" style="width:180px"/>
        </el-form-item>
        <el-form-item label="物料名称">
          <el-input v-model="searchForm.materialName" clearable placeholder="请输入物料名称" style="width:180px"/>
        </el-form-item>
        <el-form-item label="物料类型">
          <el-select v-model="searchForm.materialType" clearable placeholder="全部" style="width:130px">
            <el-option label="树脂" value="resin"/>
            <el-option label="溶剂" value="solvent"/>
            <el-option label="助剂" value="additive"/>
            <el-option label="固化剂" value="curing"/>
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" clearable placeholder="全部" style="width:110px">
            <el-option label="启用" :value="1"/>
            <el-option label="禁用" :value="0"/>
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="el-icon-search" @click="handleSearch">搜 索</el-button>
          <el-button icon="el-icon-refresh-left" @click="handleReset">重 置</el-button>
        </el-form-item>
      </el-form>

      <el-table v-loading="loading" :data="list" border stripe size="small" style="margin-top: 15px; width: 100%">
        <el-table-column type="index" label="序号" width="60" align="center" :index="indexMethod"/>
        <el-table-column prop="materialCode" label="物料编码" min-width="160" show-overflow-tooltip/>
        <el-table-column prop="materialName" label="物料名称" min-width="170" show-overflow-tooltip/>
        <el-table-column prop="materialType" label="物料类型" width="90" align="center">
          <template slot-scope="scope">
            <el-tag size="small">{{ formatType(scope.row.materialType) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="unit" label="单位" width="80" align="center"/>
        <el-table-column prop="spec" label="规格说明" min-width="200" show-overflow-tooltip/>
        <el-table-column prop="sortOrder" label="排序" width="70" align="center"/>
        <el-table-column prop="status" label="状态" width="80" align="center">
          <template slot-scope="scope">
            <el-tag :type="scope.row.status === 1 ? 'success' : 'info'" size="small">
              {{ scope.row.status === 1 ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column v-if="$canEdit()" label="操作" width="150" fixed="right" align="center">
          <template slot-scope="scope">
            <el-button type="text" size="small" icon="el-icon-edit" @click="handleEdit(scope.row)">编辑</el-button>
            <el-button type="text" size="small" icon="el-icon-delete" style="color:#f56c6c" @click="handleDelete(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        :current-page="pagination.page"
        :page-sizes="[20, 50, 100]"
        :page-size="pagination.size"
        :total="pagination.total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </el-card>

    <el-dialog :title="dialogTitle" :visible.sync="dialogVisible" width="620px" :close-on-click-modal="false">
      <el-form ref="form" :model="form" :rules="rules" label-width="90px" size="small">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="物料编码" prop="materialCode">
              <el-input v-model="form.materialCode" placeholder="如: RM-RESIN-001" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="物料名称" prop="materialName">
              <el-input v-model="form.materialName" placeholder="请输入物料名称" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="物料类型" prop="materialType">
              <el-select v-model="form.materialType" style="width:100%" placeholder="请选择">
                <el-option label="树脂" value="resin"/>
                <el-option label="溶剂" value="solvent"/>
                <el-option label="助剂" value="additive"/>
                <el-option label="固化剂" value="curing"/>
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="单位" prop="unit">
              <el-select v-model="form.unit" placeholder="请选择单位" style="width:100%">
                <el-option label="Kg" value="kg" />
                <el-option label="m²" value="m²" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="排序">
              <el-input-number v-model="form.sortOrder" :min="0" :precision="0" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="状态">
              <el-switch v-model="form.status" :active-value="1" :inactive-value="0" active-text="启用" inactive-text="禁用"/>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="规格说明">
          <el-input v-model="form.spec" type="textarea" :rows="3" placeholder="请输入规格/备注说明"/>
        </el-form-item>
      </el-form>
      <div slot="footer">
        <el-button @click="dialogVisible = false">取 消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">确 定</el-button>
      </div>
    </el-dialog>

    <el-dialog title="导入结果" :visible.sync="importResultVisible" width="500px">
      <div v-if="importResult">
        <p><strong>成功：</strong><span style="color:#67c23a">{{ importResult.successCount }} 条</span></p>
        <p><strong>失败：</strong><span style="color:#f56c6c">{{ importResult.failCount }} 条</span></p>
        <div v-if="importResult.errors && importResult.errors.length > 0">
          <p><strong>错误详情：</strong></p>
          <ul style="max-height: 200px; overflow-y: auto;">
            <li v-for="(err, idx) in importResult.errors" :key="idx" style="color: #f56c6c">{{ err }}</li>
          </ul>
        </div>
      </div>
      <div slot="footer">
        <el-button type="primary" @click="importResultVisible = false">确定</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import {
  getRawMaterialPage,
  getRawMaterialById,
  createRawMaterial,
  updateRawMaterial,
  deleteRawMaterial,
  exportRawMaterials,
  downloadRawMaterialTemplate,
  importRawMaterials
} from '@/api/tapeRawMaterial'

export default {
  name: 'TapeRawMaterial',
  data() {
    return {
      loading: false,
      searchForm: {
        materialCode: '',
        materialName: '',
        materialType: '',
        status: null
      },
      list: [],
      pagination: { page: 1, size: 20, total: 0 },
      dialogVisible: false,
      dialogTitle: '新增原材料',
      submitting: false,
      form: this.getEmptyForm(),
      rules: {
        materialCode: [{ required: true, message: '请输入物料编码', trigger: 'blur' }],
        materialName: [{ required: true, message: '请输入物料名称', trigger: 'blur' }],
        materialType: [{ required: true, message: '请选择物料类型', trigger: 'change' }],
        unit: [{ required: true, message: '请输入单位', trigger: 'blur' }]
      },
      importResultVisible: false,
      importResult: null
    }
  },
  created() {
    this.fetchData()
  },
  methods: {
    $canEdit() {
      return this.$hasRole('admin') || this.$hasRole('rd')
    },
    isSuccess(code) {
      return code === 200 || code === 20000
    },
    getEmptyForm() {
      return {
        id: null,
        materialCode: '',
        materialName: '',
        materialType: 'resin',
        unit: 'kg',
        spec: '',
        sortOrder: 0,
        status: 1
      }
    },
    formatType(type) {
      const map = {
        resin: '树脂',
        solvent: '溶剂',
        additive: '助剂',
        curing: '固化剂'
      }
      return map[type] || type || '-'
    },
    indexMethod(index) {
      return (this.pagination.page - 1) * this.pagination.size + index + 1
    },
    async fetchData() {
      this.loading = true
      try {
        const params = {
          page: this.pagination.page,
          size: this.pagination.size,
          ...this.searchForm
        }
        const res = await getRawMaterialPage(params)
        if (this.isSuccess(res.code)) {
          this.list = res.data?.records || []
          this.pagination.total = Number(res.data?.total || 0)
        } else {
          this.$message.error(res.message || '获取数据失败')
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
      this.searchForm = { materialCode: '', materialName: '', materialType: '', status: null }
      this.handleSearch()
    },
    handleSizeChange(size) {
      this.pagination.size = size
      this.fetchData()
    },
    handleCurrentChange(page) {
      this.pagination.page = page
      this.fetchData()
    },
    handleAdd() {
      this.dialogTitle = '新增原材料'
      this.form = this.getEmptyForm()
      this.dialogVisible = true
      this.$nextTick(() => this.$refs.form && this.$refs.form.clearValidate())
    },
    async handleEdit(row) {
      this.dialogTitle = '编辑原材料'
      const res = await getRawMaterialById(row.id)
      if (this.isSuccess(res.code)) {
        this.form = {
          id: res.data.id,
          materialCode: res.data.materialCode,
          materialName: res.data.materialName,
          materialType: res.data.materialType || 'resin',
          unit: res.data.unit || 'kg',
          spec: res.data.spec || '',
          sortOrder: res.data.sortOrder || 0,
          status: res.data.status == null ? 1 : res.data.status
        }
        this.dialogVisible = true
        this.$nextTick(() => this.$refs.form && this.$refs.form.clearValidate())
      } else {
        this.$message.error(res.message || '获取详情失败')
      }
    },
    handleSubmit() {
      this.$refs.form.validate(async valid => {
        if (!valid) return
        this.submitting = true
        try {
          const api = this.form.id ? updateRawMaterial : createRawMaterial
          const res = await api(this.form)
          if (this.isSuccess(res.code)) {
            this.$message.success(this.form.id ? '更新成功' : '新增成功')
            this.dialogVisible = false
            this.fetchData()
          } else {
            this.$message.error(res.message || '保存失败')
          }
        } finally {
          this.submitting = false
        }
      })
    },
    handleDelete(row) {
      this.$confirm(`确认删除原材料【${row.materialName}】吗？`, '提示', { type: 'warning' })
        .then(async() => {
          const res = await deleteRawMaterial(row.id)
          if (this.isSuccess(res.code)) {
            this.$message.success('删除成功')
            if (this.list.length === 1 && this.pagination.page > 1) {
              this.pagination.page -= 1
            }
            this.fetchData()
          } else {
            this.$message.error(res.message || '删除失败')
          }
        })
        .catch(() => {})
    },
    async handleExport() {
      const res = await exportRawMaterials(this.searchForm)
      const blob = new Blob([res])
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = '研发原材料表.xlsx'
      link.click()
      URL.revokeObjectURL(link.href)
    },
    async handleDownloadTemplate() {
      const res = await downloadRawMaterialTemplate()
      const blob = new Blob([res])
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = '研发原材料导入模板.xlsx'
      link.click()
      URL.revokeObjectURL(link.href)
    },
    handleImportClick() {
      this.$refs.importFile && this.$refs.importFile.click()
    },
    async handleImportChange(e) {
      const file = e.target.files[0]
      e.target.value = ''
      if (!file) return
      const res = await importRawMaterials(file)
      if (this.isSuccess(res.code)) {
        this.importResult = res.data
        this.importResultVisible = true
        this.fetchData()
      } else {
        this.$message.error(res.message || '导入失败')
      }
    }
  }
}
</script>
