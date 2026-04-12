<template>
  <div class="rd-container">
    <el-card>
      <div slot="header" class="clearfix">
        <span>产品规格管理</span>        <div style="float: right">
          <el-button v-if="$canEdit()" type="primary" plain icon="el-icon-collection-tag" size="small" @click="openColorDictDialog">颜色字典维护</el-button>
          <el-button v-if="$canImportExport()" type="success" icon="el-icon-download" size="small" @click="handleDownloadTemplate">下载模板</el-button>
          <el-button v-if="$canImportExport()" type="warning" icon="el-icon-upload2" size="small" @click="handleImport">导入</el-button>
          <el-button v-if="$canImportExport()" type="info" icon="el-icon-download" size="small" @click="handleExport">导出</el-button>
          <el-button v-if="$canEdit()" type="primary" icon="el-icon-plus" size="small" @click="handleAdd">新增规格</el-button>
          <input ref="fileInput" type="file" accept=".xlsx,.xls" style="display:none" @change="onFileChange">
        </div>
      </div>

      <!-- 查询表单 -->
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="料号">
          <el-input v-model="searchForm.materialCode" placeholder="请输入料号" clearable style="width: 200px" />
        </el-form-item>
        <el-form-item label="产品名称">
          <el-input v-model="searchForm.productName" placeholder="请输入产品名称" clearable style="width: 160px" />
        </el-form-item>
        <el-form-item label="颜色">
          <el-select v-model="searchForm.colorCode" placeholder="全部" clearable style="width: 120px">
            <el-option v-for="item in colorOptions" :key="item.code" :label="getColorOptionLabel(item, false)" :value="item.code" />
          </el-select>
        </el-form-item>
        <el-form-item label="基材">
          <el-select v-model="searchForm.baseMaterial" placeholder="全部" clearable style="width: 120px">
            <el-option v-for="item in baseMaterialOptions" :key="item.code" :label="item.name" :value="item.code" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="el-icon-search" @click="handleSearch">搜 索</el-button>
          <el-button icon="el-icon-refresh-left" @click="handleReset">重 置</el-button>
        </el-form-item>
      </el-form>

      <!-- 数据表格 -->
      <el-table ref="specTable" v-loading="loading" :data="list" style="width: 100%; margin-top: 15px" border stripe size="small">
        <el-table-column type="index" label="序号" width="55" align="center" :index="indexMethod" />
        <el-table-column prop="productName" label="产品名称" width="250" show-overflow-tooltip />
        <el-table-column prop="materialCode" label="胶带料号" width="200" show-overflow-tooltip />
        <el-table-column prop="colorCode" label="颜色" width="70" align="center">
          <template slot-scope="scope">
            <el-tag size="small">{{ scope.row.colorCode }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="baseThickness" label="基材厚度/μm" width="100" align="center" />
        <el-table-column prop="baseMaterial" label="基材材质" width="80" align="center" />
        <el-table-column prop="glueMaterial" label="胶水材质" width="80" align="center" />
        <el-table-column prop="glueThickness" label="胶水厚度/μm" width="100" align="center" />
        <el-table-column label="初粘/#" width="80" align="center">
          <template slot-scope="scope">{{ formatRange(scope.row, 'initialTack') }}</template>
        </el-table-column>
        <el-table-column prop="totalThickness" label="总厚度/μm" width="90" align="center" />
        <el-table-column label="厚度波动/μm" width="100" align="center">
          <template slot-scope="scope">
            <span v-if="scope.row.totalThicknessMin && scope.row.totalThicknessMax">
              {{ scope.row.totalThicknessMin }}~{{ scope.row.totalThicknessMax }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="剥离力" width="90" align="center">
          <template slot-scope="scope">{{ formatRange(scope.row, 'peelStrength') }}</template>
        </el-table-column>
        <el-table-column label="解卷力" width="80" align="center">
          <template slot-scope="scope">{{ formatRange(scope.row, 'unwindForce') }}</template>
        </el-table-column>
        <el-table-column label="耐温/℃" width="80" align="center">
          <template slot-scope="scope">{{ formatRange(scope.row, 'heatResistance') }}</template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="70" align="center">
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

      <!-- 分页 -->
      <el-pagination
        :current-page="pagination.page"
        :page-sizes="[20, 50, 100, 200]"
        :page-size="pagination.size"
        :total="pagination.total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </el-card>

    <!-- 新增/编辑弹窗 -->
    <el-dialog :title="dialogTitle" :visible.sync="dialogVisible" width="900px" :close-on-click-modal="false">
      <el-form ref="form" :model="form" :rules="rules" label-width="110px" size="small">
        <!-- 基本信息 -->
        <el-divider content-position="left">基本信息</el-divider>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="胶带料号" prop="materialCode">
              <el-input v-model="form.materialCode" placeholder="如: 1011-R02-0903-G03-0300" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="产品名称" prop="productName">
              <el-input v-model="form.productName" placeholder="如: 12μ无机翠绿PET胶带" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="颜色代码" prop="colorCode">
              <el-select v-model="form.colorCode" placeholder="请选择" style="width:100%" @change="onColorChange">
                <el-option v-for="item in colorOptions" :key="item.code" :label="getColorOptionLabel(item, true)" :value="item.code" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="基材材质" prop="baseMaterial">
              <el-select v-model="form.baseMaterial" placeholder="请选择" style="width:100%">
                <el-option v-for="item in baseMaterialOptions" :key="item.code" :label="item.name" :value="item.code" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="胶水材质" prop="glueMaterial">
              <el-select v-model="form.glueMaterial" placeholder="请选择" style="width:100%">
                <el-option v-for="item in glueMaterialOptions" :key="item.code" :label="item.name" :value="item.code" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="基材厚度(μm)">
              <el-input-number v-model="form.baseThickness" :min="0" :precision="2" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="胶水厚度(μm)">
              <el-input-number v-model="form.glueThickness" :min="0" :precision="2" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="状态">
              <el-switch v-model="form.status" :active-value="1" :inactive-value="0" active-text="启用" inactive-text="禁用" />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 性能参数 -->
        <el-divider content-position="left">性能参数（支持范围值，用于品质判定）</el-divider>

        <!-- 初粘 -->
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="初粘类型">
              <el-select v-model="form.initialTackType" style="width:100%">
                <el-option label="范围值 (X~Y)" value="range" />
                <el-option label="≥ 大于等于" value="gte" />
                <el-option label="≤ 小于等于" value="lte" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item :label="form.initialTackType === 'lte' ? '初粘上限(#)' : '初粘下限(#)'">
              <el-input-number v-model="form.initialTackMin" :min="0" :precision="2" style="width:100%" :disabled="form.initialTackType === 'lte'" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item v-if="form.initialTackType !== 'gte'" label="初粘上限(#)">
              <el-input-number v-model="form.initialTackMax" :min="0" :precision="2" style="width:100%" />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 总厚度 -->
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="总厚度(μm)">
              <el-input-number v-model="form.totalThickness" :min="0" :precision="2" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="厚度下限(μm)">
              <el-input-number v-model="form.totalThicknessMin" :min="0" :precision="2" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="厚度上限(μm)">
              <el-input-number v-model="form.totalThicknessMax" :min="0" :precision="2" style="width:100%" />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 剥离力 -->
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="剥离力类型">
              <el-select v-model="form.peelStrengthType" style="width:100%">
                <el-option label="范围值 (X~Y)" value="range" />
                <el-option label="≥ 大于等于" value="gte" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="剥离力下限">
              <el-input-number v-model="form.peelStrengthMin" :min="0" :precision="2" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col v-if="form.peelStrengthType === 'range'" :span="8">
            <el-form-item label="剥离力上限">
              <el-input-number v-model="form.peelStrengthMax" :min="0" :precision="2" style="width:100%" />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 解卷力 -->
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="解卷力类型">
              <el-select v-model="form.unwindForceType" style="width:100%">
                <el-option label="范围值 (X~Y)" value="range" />
                <el-option label="≤ 小于等于" value="lte" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="解卷力下限">
              <el-input-number v-model="form.unwindForceMin" :min="0" :precision="2" style="width:100%" :disabled="form.unwindForceType === 'lte'" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="解卷力上限">
              <el-input-number v-model="form.unwindForceMax" :min="0" :precision="2" style="width:100%" />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 耐温 -->
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="耐温类型">
              <el-select v-model="form.heatResistanceType" style="width:100%">
                <el-option label="≥ 大于等于" value="gte" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="耐温值(℃)">
              <el-input-number v-model="form.heatResistance" :min="0" :precision="0" style="width:100%" />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 备注 -->
        <el-row>
          <el-col :span="24">
            <el-form-item label="备注">
              <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="备注信息" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>

      <div slot="footer">
        <el-button @click="dialogVisible = false">取 消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">确 定</el-button>
      </div>
    </el-dialog>

    <!-- 导入结果弹窗 -->
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

    <!-- 颜色字典维护 -->
    <el-dialog title="颜色字典维护" :visible.sync="colorDictDialogVisible" width="900px" :close-on-click-modal="false">
      <el-form :inline="true" :model="colorDictSearch" class="search-form" style="margin-bottom: 10px;">
        <el-form-item label="关键字">
          <el-input v-model="colorDictSearch.keyword" clearable placeholder="颜色代码/颜色名称" style="width: 220px" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="colorDictSearch.status" clearable placeholder="全部" style="width: 120px">
            <el-option label="启用" :value="1" />
            <el-option label="禁用" :value="0" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="el-icon-search" @click="fetchColorDictList">查询</el-button>
          <el-button icon="el-icon-refresh-left" @click="resetColorDictSearch">重置</el-button>
        </el-form-item>
      </el-form>

      <el-form ref="colorDictForm" :model="colorDictForm" :rules="colorDictRules" label-width="90px" size="small" style="padding: 10px; background: #fafafa; border-radius: 4px; margin-bottom: 12px;">
        <el-row :gutter="12">
          <el-col :span="6">
            <el-form-item label="颜色代码" prop="code">
              <el-input v-model="colorDictForm.code" :disabled="!!colorDictForm.id" placeholder="如 R01" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="颜色名称" prop="name">
              <el-input v-model="colorDictForm.name" placeholder="如 透明" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="备注">
              <el-input v-model="colorDictForm.remark" placeholder="备注信息" />
            </el-form-item>
          </el-col>
          <el-col :span="4">
            <el-form-item label="状态">
              <el-switch v-model="colorDictForm.status" :active-value="1" :inactive-value="0" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row>
          <el-col :span="24" style="text-align: right;">
            <el-button size="small" @click="resetColorDictForm">清空</el-button>
            <el-button type="primary" size="small" :loading="colorDictSubmitting" @click="submitColorDict">{{ colorDictForm.id ? '更新' : '新增' }}</el-button>
          </el-col>
        </el-row>
      </el-form>

      <el-table ref="colorDictTable" v-loading="colorDictLoading" :data="colorDictList" border stripe size="small" style="width: 100%">
        <el-table-column type="index" label="序号" width="55" align="center" />
        <el-table-column prop="code" label="颜色代码" width="120" align="center" />
        <el-table-column prop="name" label="颜色名称" width="180" />
        <el-table-column prop="remark" label="备注" width="260" show-overflow-tooltip />
        <el-table-column prop="status" label="状态" width="80" align="center">
          <template slot-scope="scope">
            <el-tag :type="scope.row.status === 1 ? 'success' : 'info'" size="small">
              {{ scope.row.status === 1 ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="140" align="center">
          <template slot-scope="scope">
            <el-button type="text" size="small" icon="el-icon-edit" @click.stop="editColorDict(scope.row)">编辑</el-button>
            <el-button type="text" size="small" icon="el-icon-delete" style="color:#f56c6c" @click.stop="deleteColorDictRow(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div slot="footer">
        <el-button @click="colorDictDialogVisible = false">关 闭</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import {
  getSpecList, createSpec, updateSpec, deleteSpec,
  getColorDict, getBaseMaterialDict, getGlueMaterialDict,
  exportSpec, importSpec, downloadTemplate,
  getColorDictList, createColorDict, updateColorDict, deleteColorDict
} from '@/api/tapeSpec'
import elTableAutoLayout from '@/mixins/elTableAutoLayout'

export default {
  name: 'TapeSpecManagement',
  mixins: [elTableAutoLayout],
  tableLayoutRefs: ['specTable', 'colorDictTable'],
  data() {
    return {
      searchForm: {
        materialCode: '',
        productName: '',
        colorCode: '',
        baseMaterial: ''
      },
      list: [],
      loading: false,
      pagination: { page: 1, size: 20, total: 0 },

      // 字典选项
      colorOptions: [],
      baseMaterialOptions: [],
      glueMaterialOptions: [],

      // 弹窗
      dialogVisible: false,
      dialogTitle: '新增规格',
      submitting: false,
      form: this.getEmptyForm(),
      rules: {
        materialCode: [{ required: true, message: '请输入料号', trigger: 'blur' }],
        productName: [{ required: true, message: '请输入产品名称', trigger: 'blur' }]
      },

      // 导入结果
      importResultVisible: false,
      importResult: null,

      // 颜色字典管理
      colorDictDialogVisible: false,
      colorDictLoading: false,
      colorDictSubmitting: false,
      colorDictSearch: {
        keyword: '',
        status: null
      },
      colorDictList: [],
      colorDictForm: {
        id: null,
        code: '',
        name: '',
        remark: '',
        status: 1
      },
      colorDictRules: {
        code: [{ required: true, message: '请输入颜色代码', trigger: 'blur' }],
        name: [{ required: true, message: '请输入颜色名称', trigger: 'blur' }]
      }
    }
  },
  created() {
    this.loadDicts()
    this.fetchData()
  },
  methods: {
    $canEdit() {
      // 只有 admin 和 rd 角色可以进行增删改操作
      return this.$hasRole('admin') || this.$hasRole('rd')
    },
    isSuccess(res) {
      return res && (res.code === 20000 || res.code === 200)
    },
    getEmptyForm() {
      return {
        id: null,
        materialCode: '',
        productName: '',
        colorCode: '',
        colorName: '',
        baseThickness: null,
        baseMaterial: '',
        glueMaterial: '',
        glueThickness: null,
        initialTackMin: null,
        initialTackMax: null,
        initialTackType: 'range',
        totalThickness: null,
        totalThicknessMin: null,
        totalThicknessMax: null,
        peelStrengthMin: null,
        peelStrengthMax: null,
        peelStrengthType: 'range',
        unwindForceMin: null,
        unwindForceMax: null,
        unwindForceType: 'range',
        heatResistance: null,
        heatResistanceType: 'gte',
        remark: '',
        status: 1
      }
    },
    async loadDicts() {
      try {
        const [colorRes, baseRes, glueRes] = await Promise.all([
          getColorDict(),
          getBaseMaterialDict(),
          getGlueMaterialDict()
        ])
        if (this.isSuccess(colorRes)) {
          const rawList = Array.isArray(colorRes.data) ? colorRes.data : []
          this.colorOptions = rawList
            .map(item => {
              const code = String(item.code || '').trim().toUpperCase()
              const name = String(item.name || '').trim()
              const isPlaceholder = !!code && !!name && code === name.toUpperCase()
              return {
                ...item,
                code,
                name,
                isPlaceholder
              }
            })
            .filter(item => item.code)
            .sort((a, b) => {
              if (a.isPlaceholder !== b.isPlaceholder) {
                return a.isPlaceholder ? 1 : -1
              }
              return String(a.code).localeCompare(String(b.code), 'zh-CN')
            })
        }
        if (this.isSuccess(baseRes)) this.baseMaterialOptions = baseRes.data || []
        if (this.isSuccess(glueRes)) this.glueMaterialOptions = glueRes.data || []
      } catch (e) {
        console.error('加载字典失败', e)
      }
    },
    getColorOptionLabel(item, withCode = true) {
      const code = String(item && item.code ? item.code : '').trim().toUpperCase()
      const name = String(item && item.name ? item.name : '').trim()
      const isPlaceholder = !!code && !!name && code === name.toUpperCase()
      const finalName = name || code
      if (withCode) {
        return isPlaceholder ? `${code} - ${finalName}（待维护）` : `${code} - ${finalName}`
      }
      return isPlaceholder ? `${finalName}（待维护）` : finalName
    },
    async fetchData() {
      this.loading = true
      try {
        const params = {
          page: this.pagination.page,
          size: this.pagination.size,
          ...this.searchForm
        }
        const res = await getSpecList(params)
        if (this.isSuccess(res)) {
          this.list = (res.data && res.data.records) || []
          this.pagination.total = Number(res.data?.total || 0)
          this.scheduleTableLayout()
        }
      } catch (e) {
        console.error('获取列表失败', e)
      } finally {
        this.loading = false
      }
    },
    handleSearch() {
      this.pagination.page = 1
      this.fetchData()
    },
    handleReset() {
      this.searchForm = { materialCode: '', productName: '', colorCode: '', baseMaterial: '' }
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
    indexMethod(index) {
      return (this.pagination.page - 1) * this.pagination.size + index + 1
    },
    async handleAdd() {
      await this.loadDicts()
      this.dialogTitle = '新增规格'
      this.form = this.getEmptyForm()
      this.dialogVisible = true
      this.$nextTick(() => this.$refs.form && this.$refs.form.clearValidate())
    },
    async handleEdit(row) {
      await this.loadDicts()
      this.dialogTitle = '编辑规格'
      this.form = { ...row }
      this.dialogVisible = true
      this.$nextTick(() => this.$refs.form && this.$refs.form.clearValidate())
    },
    async handleSubmit() {
      try {
        await this.$refs.form.validate()
      } catch (e) {
        return
      }

      // 根据颜色代码设置颜色名称
      const colorItem = this.colorOptions.find(c => c.code === this.form.colorCode)
      if (colorItem) this.form.colorName = colorItem.name

      this.submitting = true
      try {
        const res = this.form.id ? await updateSpec(this.form) : await createSpec(this.form)
        if (this.isSuccess(res)) {
          this.$message.success(this.form.id ? '更新成功' : '创建成功')
          this.dialogVisible = false
          this.fetchData()
        } else {
          this.$message.error(res.msg || '操作失败')
        }
      } catch (e) {
        this.$message.error('操作失败')
      } finally {
        this.submitting = false
      }
    },
    handleDelete(row) {
      this.$confirm(`确认删除料号 "${row.materialCode}" 吗?`, '提示', {
        type: 'warning'
      }).then(async() => {
        try {
          const res = await deleteSpec(row.id)
          if (this.isSuccess(res)) {
            this.$message.success('删除成功')
            this.fetchData()
          } else {
            this.$message.error(res.msg || '删除失败')
          }
        } catch (e) {
          this.$message.error('删除失败')
        }
      }).catch(() => {})
    },
    onColorChange(code) {
      const item = this.colorOptions.find(c => c.code === code)
      if (item) this.form.colorName = item.name
    },
    // 格式化范围显示
    formatRange(row, field) {
      let min, max, type
      switch (field) {
        case 'initialTack':
          min = row.initialTackMin
          max = row.initialTackMax
          type = row.initialTackType
          break
        case 'peelStrength':
          min = row.peelStrengthMin
          max = row.peelStrengthMax
          type = row.peelStrengthType
          break
        case 'unwindForce':
          min = row.unwindForceMin
          max = row.unwindForceMax
          type = row.unwindForceType
          break
        case 'heatResistance':
          min = row.heatResistance
          type = row.heatResistanceType
          if (type === 'gte' && min != null) return `≥${min}`
          return min || ''
        default:
          return ''
      }
      if (!type) type = 'range'
      if (type === 'lte' && max != null) return `≤${max}`
      if (type === 'gte' && min != null) return `≥${min}`
      if (min != null && max != null) return `${min}~${max}`
      if (min != null) return `≥${min}`
      if (max != null) return `≤${max}`
      return ''
    },
    handleDownloadTemplate() {
      downloadTemplate().then(blob => {
        this.downloadFile(blob, '胶带规格导入模板.xlsx')
      }).catch(() => {
        this.$message.error('下载模板失败')
      })
    },
    handleExport() {
      this.loading = true
      exportSpec(this.searchForm).then(blob => {
        const fileName = `胶带规格数据_${new Date().toLocaleDateString().replace(/\//g, '-')}.xlsx`
        this.downloadFile(blob, fileName)
      }).catch(() => {
        this.$message.error('导出失败')
      }).finally(() => {
        this.loading = false
      })
    },
    handleImport() {
      this.$refs.fileInput.click()
    },
    async onFileChange(e) {
      const file = e.target.files[0]
      if (!file) return

      this.loading = true
      try {
        const res = await importSpec(file)
        if (this.isSuccess(res)) {
          const result = res.data || {}
          const successCount = Number(result.successCount || 0)
          const failCount = Number(result.failCount || 0)
          const errors = Array.isArray(result.errors) ? result.errors : []

          this.importResult = {
            successCount,
            failCount,
            errors
          }
          this.importResultVisible = true

          if (failCount > 0) {
            const summary = errors.slice(0, 3).join('；')
            this.$message.warning(`导入完成：成功${successCount}条，失败${failCount}条${summary ? `，失败原因：${summary}` : ''}`)
          } else {
            this.$message.success(`导入完成：成功${successCount}条，失败${failCount}条`)
          }

          this.fetchData()
        } else {
          this.$message.error(res.msg || res.message || '导入失败')
        }
      } catch (e) {
        this.$message.error((e && e.message) || (e && e.response && e.response.data && (e.response.data.msg || e.response.data.message)) || '导入失败')
      } finally {
        this.loading = false
        this.$refs.fileInput.value = ''
      }
    },
    downloadFile(blob, fileName) {
      const url = window.URL.createObjectURL(new Blob([blob]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', fileName)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    },
    openColorDictDialog() {
      this.colorDictDialogVisible = true
      this.fetchColorDictList()
      this.resetColorDictForm()
    },
    async fetchColorDictList() {
      this.colorDictLoading = true
      try {
        const params = {
          keyword: this.colorDictSearch.keyword || undefined,
          status: this.colorDictSearch.status
        }
        const res = await getColorDictList(params)
        if (this.isSuccess(res)) {
          this.colorDictList = Array.isArray(res.data) ? res.data : []
          this.scheduleTableLayout()
        }
      } catch (e) {
        this.$message.error('获取颜色字典失败')
      } finally {
        this.colorDictLoading = false
      }
    },
    resetColorDictSearch() {
      this.colorDictSearch = { keyword: '', status: null }
      this.fetchColorDictList()
    },
    resetColorDictForm() {
      this.colorDictForm = {
        id: null,
        code: '',
        name: '',
        remark: '',
        status: 1
      }
      this.$nextTick(() => this.$refs.colorDictForm && this.$refs.colorDictForm.clearValidate())
    },
    editColorDict(row) {
      if (!row || !row.id) {
        this.$message.warning('该颜色记录无效，无法编辑')
        return
      }
      this.colorDictForm = {
        id: row.id,
        code: row.code,
        name: row.name,
        remark: row.remark || '',
        status: row.status
      }
      this.$message.info('已加载到上方编辑区，可直接修改后点击“更新”')
      this.$nextTick(() => this.$refs.colorDictForm && this.$refs.colorDictForm.clearValidate())
    },
    async submitColorDict() {
      try {
        await this.$refs.colorDictForm.validate()
      } catch (e) {
        return
      }

      this.colorDictSubmitting = true
      try {
        const payload = { ...this.colorDictForm }
        const res = payload.id ? await updateColorDict(payload) : await createColorDict(payload)
        if (this.isSuccess(res)) {
          this.$message.success(payload.id ? '更新成功' : '新增成功')
          this.resetColorDictForm()
          await this.fetchColorDictList()
          await this.loadDicts()
        } else {
          this.$message.error(res.msg || '操作失败')
        }
      } catch (e) {
        this.$message.error('操作失败')
      } finally {
        this.colorDictSubmitting = false
      }
    },
    deleteColorDictRow(row) {
      this.$confirm(`确认删除颜色代码 "${row.code}" 吗?`, '提示', {
        type: 'warning'
      }).then(async() => {
        try {
          const res = await deleteColorDict(row.id)
          if (this.isSuccess(res)) {
            this.$message.success('删除成功')
            await this.fetchColorDictList()
            await this.loadDicts()
            if (this.colorDictForm.id === row.id) {
              this.resetColorDictForm()
            }
          } else {
            this.$message.error(res.msg || '删除失败')
          }
        } catch (e) {
          this.$message.error('删除失败')
        }
      }).catch(() => {})
    }
  }
}
</script>

<style lang="scss" scoped>
.rd-container {
  padding: 20px;

  .search-card, .toolbar-card {
    margin-bottom: 15px;
  }

  .el-pagination {
    margin-top: 15px;
    text-align: right;
  }

  .el-divider {
    margin: 15px 0;
  }
}
</style>
```
