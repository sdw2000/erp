<template>
  <div class="raw-material-container">
    <el-card>
      <div slot="header" class="clearfix">
        <span>原材料表</span>
        <div style="float: right">
          <el-button v-if="$canImportExport()" type="success" icon="el-icon-download" size="small" @click="handleDownloadTemplate">下载模板</el-button>
          <el-button v-if="$canImportExport()" type="primary" icon="el-icon-refresh" size="small" @click="handleInitialize">初始化</el-button>
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
        <el-form-item label="物料类别">
          <el-select v-model="searchForm.materialCategory" clearable placeholder="全部" style="width:130px">
            <el-option label="薄膜" value="film"/>
            <el-option label="化工物料" value="chemical"/>
          </el-select>
        </el-form-item>
        <el-form-item label="物料类型">
          <el-select v-model="searchForm.materialType" clearable placeholder="全部" style="width:130px">
            <el-option v-for="item in materialTypeSearchOptions()" :key="item.value" :label="item.label" :value="item.value"/>
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" clearable placeholder="全部" style="width:110px">
            <el-option label="启用" :value="1"/>
            <el-option label="禁用" :value="0"/>
          </el-select>
        </el-form-item>
        <el-form-item label="离型力A">
          <el-input v-model="searchForm.releaseForceA" clearable placeholder="请输入离型力A" style="width:150px"/>
        </el-form-item>
        <el-form-item label="离型力B">
          <el-input v-model="searchForm.releaseForceB" clearable placeholder="请输入离型力B" style="width:150px"/>
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
        <el-table-column prop="materialCategory" label="物料类别" width="100" align="center">
          <template slot-scope="scope">
            <el-tag :type="scope.row.materialCategory === 'film' ? 'success' : 'warning'" size="small">
              {{ formatCategory(scope.row.materialCategory, scope.row) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="materialType" label="物料类型" width="90" align="center">
          <template slot-scope="scope">
            <el-tag size="small">{{ formatType(scope.row.materialType) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="unit" label="单位" width="80" align="center"/>
        <el-table-column prop="spec" label="规格说明" min-width="180" show-overflow-tooltip/>
        <el-table-column label="厚度" min-width="110" show-overflow-tooltip>
          <template slot-scope="scope">{{ getPerfCell(scope.row, 'thickness') }}</template>
        </el-table-column>
        <el-table-column label="电晕值" min-width="110" show-overflow-tooltip>
          <template slot-scope="scope">{{ getPerfCell(scope.row, 'coronaValue') }}</template>
        </el-table-column>
        <el-table-column label="抗拉强度" min-width="120" show-overflow-tooltip>
          <template slot-scope="scope">{{ getPerfCell(scope.row, 'tensileStrength') }}</template>
        </el-table-column>
        <el-table-column label="伸长率" min-width="100" show-overflow-tooltip>
          <template slot-scope="scope">{{ getPerfCell(scope.row, 'elongation') }}</template>
        </el-table-column>
        <el-table-column label="颜色" min-width="100" show-overflow-tooltip>
          <template slot-scope="scope">{{ getPerfCell(scope.row, 'color') }}</template>
        </el-table-column>
        <el-table-column label="外观" min-width="120" show-overflow-tooltip>
          <template slot-scope="scope">{{ getPerfCell(scope.row, 'appearance') }}</template>
        </el-table-column>
        <el-table-column label="固含量" min-width="110" show-overflow-tooltip>
          <template slot-scope="scope">{{ getPerfCell(scope.row, 'solidContent') }}</template>
        </el-table-column>
        <el-table-column label="粘度" min-width="110" show-overflow-tooltip>
          <template slot-scope="scope">{{ getPerfCell(scope.row, 'viscosity') }}</template>
        </el-table-column>
        <el-table-column label="剥离强度" min-width="120" show-overflow-tooltip>
          <template slot-scope="scope">{{ getPerfCell(scope.row, 'peelStrength') }}</template>
        </el-table-column>
        <el-table-column label="离型力A" min-width="120" show-overflow-tooltip>
          <template slot-scope="scope">{{ getPerfCell(scope.row, 'releaseForceA') }}</template>
        </el-table-column>
        <el-table-column label="离型力B" min-width="120" show-overflow-tooltip>
          <template slot-scope="scope">{{ getPerfCell(scope.row, 'releaseForceB') }}</template>
        </el-table-column>
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
            <el-form-item label="物料类别" prop="materialCategory">
              <el-select v-model="form.materialCategory" style="width:100%" placeholder="请选择/可输入" filterable allow-create default-first-option @change="onCategoryChange">
                <el-option label="原膜" value="原膜"/>
                <el-option label="离型材料" value="离型材料"/>
                <el-option label="管芯" value="管芯"/>
                <el-option label="化工料" value="化工料"/>
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="物料类型" prop="materialType">
              <el-select v-model="form.materialType" style="width:100%" placeholder="请选择/可输入" filterable allow-create default-first-option>
                <el-option v-for="item in materialTypeOptionsForCategory()" :key="item.value" :label="item.label" :value="item.value"/>
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="单位" prop="unit">
              <el-select v-model="form.unit" placeholder="请选择单位" style="width:100%">
                <el-option v-for="item in unitOptionsForCategory()" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="规格说明">
              <el-input v-model="form.spec" type="textarea" :rows="3" :placeholder="specPlaceholder()"/>
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">性能参数（分列维护）</el-divider>
        <el-alert
          type="info"
          :closable="false"
          show-icon
          style="margin-bottom: 12px;"
          title="按字段分别维护：厚度、电晕值、抗拉强度、伸长率、颜色、外观、固含量、粘度、剥离强度、离型力A、离型力B（后台仍以JSON兼容存储）。"
        />
        <el-row :gutter="20">
          <el-col :span="8" v-for="item in getCurrentInspectionFields()" :key="item.key">
            <el-form-item :label="item.label">
              <el-input
                v-model="performanceForm[item.key]"
                :placeholder="item.unit ? `示例：${item.unit}` : '请输入'"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="状态">
              <el-switch v-model="form.status" :active-value="1" :inactive-value="0" active-text="启用" inactive-text="禁用"/>
            </el-form-item>
          </el-col>
        </el-row>
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
        materialCategory: '',
        materialType: '',
        status: null,
        releaseForceA: '',
        releaseForceB: ''
      },
      list: [],
      pagination: { page: 1, size: 20, total: 0 },
      dialogVisible: false,
      dialogTitle: '新增原材料',
      submitting: false,
      form: this.getEmptyForm(),
      performanceForm: this.getDefaultPerformanceForm(),
      rules: {
        materialCode: [{ required: true, message: '请输入物料编码', trigger: 'blur' }],
        materialName: [{ required: true, message: '请输入物料名称', trigger: 'blur' }],
        materialCategory: [{ required: true, message: '请选择物料类别', trigger: 'change' }],
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
      const defaultCategory = '化工料'
      return {
        id: null,
        materialCode: '',
        materialName: '',
        materialCategory: defaultCategory,
        materialCategoryRaw: defaultCategory,
        materialType: this.defaultMaterialTypeByCategory(defaultCategory),
        unit: 'kg',
        spec: '',
        performanceParams: '',
        status: 1
      }
    },
    getCategoryMode(category) {
      const text = String(category || '').trim().toLowerCase()
      if (!text) return 'chemical'
      if (text === 'film' || text.includes('原膜') || text.includes('pet膜') || text.includes('bopp膜') || text.includes('薄膜')) {
        return 'baseFilm'
      }
      if (text.includes('离型')) {
        return 'release'
      }
      if (text.includes('管芯')) {
        return 'core'
      }
      if (text === 'chemical' || text.includes('化工')) {
        return 'chemical'
      }
      return 'chemical'
    },
    getInspectionSchema() {
      return [
        { key: 'thickness', label: '厚度', unit: 'μm' },
        { key: 'coronaValue', label: '电晕值', unit: 'dyne' },
        { key: 'tensileStrength', label: '抗拉强度', unit: 'N/15mm' },
        { key: 'elongation', label: '伸长率', unit: '%' },
        { key: 'color', label: '颜色', unit: '' },
        { key: 'appearance', label: '外观', unit: '' },
        { key: 'solidContent', label: '固含量', unit: '%' },
        { key: 'viscosity', label: '粘度', unit: 'cps' },
        { key: 'peelStrength', label: '剥离强度', unit: 'N/25mm' },
        { key: 'releaseForceA', label: '离型力A', unit: 'gf/in' },
        { key: 'releaseForceB', label: '离型力B', unit: 'gf/in' }
      ]
    },
    createRangeField(unit = '') {
      return { label: '', standardValue: '', min: '', max: '', unit, judgeMode: 'range', remark: '' }
    },
    getDefaultPerformanceForm() {
      const schema = this.getInspectionSchema()
      const result = {}
      schema.forEach(item => {
        result[item.key] = ''
      })
      return result
    },
    getCurrentInspectionFields() {
      return this.getInspectionSchema()
    },
    parsePerformanceParams(text) {
      if (!text) return {}
      try {
        const parsed = JSON.parse(text)
        return parsed && typeof parsed === 'object' ? parsed : {}
      } catch (e) {
        return {}
      }
    },
    normalizeRangeField(value, defaultUnit = '') {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        return {
          label: value.label !== undefined ? String(value.label) : (value.name !== undefined ? String(value.name) : (value.title !== undefined ? String(value.title) : (value.displayName !== undefined ? String(value.displayName) : ''))),
          standardValue: value.standardValue !== undefined ? String(value.standardValue) : (value.value !== undefined ? String(value.value) : ''),
          min: value.min !== undefined ? String(value.min) : (value.low !== undefined ? String(value.low) : ''),
          max: value.max !== undefined ? String(value.max) : (value.high !== undefined ? String(value.high) : ''),
          unit: value.unit !== undefined ? String(value.unit) : defaultUnit,
          judgeMode: value.judgeMode !== undefined ? String(value.judgeMode) : ((value.min !== undefined || value.max !== undefined || value.low !== undefined || value.high !== undefined) ? 'range' : 'value'),
          remark: value.remark !== undefined ? String(value.remark) : ''
        }
      }

      const text = String(value || '').trim()
      if (!text) return this.createRangeField(defaultUnit)

      const pmMatch = text.match(/^([0-9]+(?:\.[0-9]+)?)\s*±\s*([0-9]+(?:\.[0-9]+)?)\s*(.*)$/)
      if (pmMatch) {
        const center = Number(pmMatch[1])
        const tol = Number(pmMatch[2])
        const unit = pmMatch[3].trim() || defaultUnit
        if (Number.isFinite(center) && Number.isFinite(tol)) {
          return { standardValue: String(center), min: String(center - tol), max: String(center + tol), unit, judgeMode: 'range', remark: '' }
        }
      }

      const rangeMatch = text.match(/^([0-9]+(?:\.[0-9]+)?)\s*[~～-]\s*([0-9]+(?:\.[0-9]+)?)\s*(.*)$/)
      if (rangeMatch) {
        return { standardValue: '', min: rangeMatch[1], max: rangeMatch[2], unit: rangeMatch[3].trim() || defaultUnit, judgeMode: 'range', remark: '' }
      }

      const slashMatch = text.match(/^([0-9]+(?:\.[0-9]+)?)\s*\/\s*([0-9]+(?:\.[0-9]+)?)\s*(.*)$/)
      if (slashMatch) {
        return { standardValue: '', min: slashMatch[1], max: slashMatch[2], unit: slashMatch[3].trim() || defaultUnit, judgeMode: 'range', remark: '' }
      }

      const geMatch = text.match(/^[≥>]=?\s*([0-9]+(?:\.[0-9]+)?)\s*(.*)$/)
      if (geMatch) {
        return { standardValue: '', min: geMatch[1], max: '', unit: geMatch[2].trim() || defaultUnit, judgeMode: 'min', remark: '' }
      }

      const leMatch = text.match(/^[≤<]=?\s*([0-9]+(?:\.[0-9]+)?)\s*(.*)$/)
      if (leMatch) {
        return { standardValue: '', min: '', max: leMatch[1], unit: leMatch[2].trim() || defaultUnit, judgeMode: 'max', remark: '' }
      }

      return { standardValue: text, min: '', max: '', unit: defaultUnit, judgeMode: 'value', remark: '' }
    },
    normalizePerformanceForm(parsed) {
      const defaults = this.getDefaultPerformanceForm()
      const source = parsed && typeof parsed === 'object' ? parsed : {}
      const normalized = { ...defaults }
      Object.keys(defaults).forEach(key => {
        normalized[key] = this.formatRangeField(source[key])
      })
      // 兼容历史别名
      if (!normalized.appearance && source.surface) normalized.appearance = this.formatRangeField(source.surface)
      if (!normalized.viscosity && source.viscosityValue) normalized.viscosity = this.formatRangeField(source.viscosityValue)
      return normalized
    },
    loadPerformanceForm() {
      const parsed = this.parsePerformanceParams(this.form.performanceParams)
      this.performanceForm = this.normalizePerformanceForm(parsed)
    },
    formatRangeField(value) {
      if (value === null || value === undefined || value === '') return ''
      if (typeof value !== 'object') {
        return String(value)
      }
      const standardValue = value.standardValue !== undefined ? String(value.standardValue).trim() : ''
      const min = value.min !== undefined ? String(value.min).trim() : ''
      const max = value.max !== undefined ? String(value.max).trim() : ''
      const unit = value.unit !== undefined ? String(value.unit).trim() : ''
      const judgeMode = value.judgeMode || ''
      if (judgeMode === 'value' || (standardValue && !min && !max)) return `${standardValue}${unit}`
      if (judgeMode === 'min' || (min && !max)) return `≥${min}${unit}`
      if (judgeMode === 'max' || (max && !min)) return `≤${max}${unit}`
      if (min && max) return `${min}~${max}${unit}`
      if (standardValue) return `${standardValue}${unit}`
      return ''
    },
    formatPerformanceSummary(row) {
      const parsed = this.parsePerformanceParams(row && row.performanceParams)
      if (!parsed || Object.keys(parsed).length === 0) return '-'
      const schema = this.getInspectionSchema()
      return schema.map(item => {
        const val = parsed[item.key]
        return val ? `${item.label}:${this.formatRangeField(val)}` : ''
      }).filter(Boolean).join('；') || '-'
    },
    getPerfCell(row, key) {
      const parsed = this.parsePerformanceParams(row && row.performanceParams)
      if (!parsed || typeof parsed !== 'object') return '-'
      const direct = this.formatRangeField(parsed[key])
      if (direct) return direct
      // 历史兼容
      if (key === 'appearance') return this.formatRangeField(parsed.surface) || '-'
      if (key === 'viscosity') return this.formatRangeField(parsed.viscosityValue) || '-'
      if (key === 'releaseForceA') return this.formatRangeField(parsed.releaseForcea) || '-'
      if (key === 'releaseForceB') return this.formatRangeField(parsed.releaseForceb) || '-'
      return '-'
    },
    buildPerformanceParamsPayload() {
      const payload = {}
      this.getInspectionSchema().forEach(item => {
        const raw = String(this.performanceForm[item.key] || '').trim()
        if (!raw) return
        const normalizedField = this.normalizeRangeField(raw, item.unit || '')
        payload[item.key] = {
          ...normalizedField,
          label: item.label,
          unit: normalizedField.unit || item.unit || ''
        }
      })
      return payload
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
    formatCategory(category, row) {
      if (row && row.materialCategoryRaw) {
        return row.materialCategoryRaw
      }
      const map = {
        film: '薄膜',
        chemical: '化工物料'
      }
      return map[category] || category || '-'
    },
    defaultMaterialTypeByCategory(category) {
      const mode = this.getCategoryMode(category)
      if (mode === 'baseFilm') return 'PET膜'
      if (mode === 'release') return 'PE离型膜'
      if (mode === 'core') return '纸管'
      return 'resin'
    },
    getMaterialTypeOptionsByMode(mode) {
      if (mode === 'baseFilm') {
        return [
          { label: 'PET膜', value: 'PET膜' },
          { label: 'BOPP膜', value: 'BOPP膜' },
          { label: 'PE离型膜', value: 'PE离型膜' }
        ]
      }
      if (mode === 'release') {
        return [
          { label: 'PE离型膜', value: 'PE离型膜' },
          { label: '离型膜', value: '离型膜' },
          { label: '离型纸', value: '离型纸' }
        ]
      }
      if (mode === 'core') {
        return [
          { label: '纸管', value: '纸管' },
          { label: '胶管', value: '胶管' }
        ]
      }
      return [
        { label: '树脂', value: 'resin' },
        { label: '溶剂', value: 'solvent' },
        { label: '助剂', value: 'additive' },
        { label: '固化剂', value: 'curing' }
      ]
    },
    getUnitOptionsByMode(mode) {
      if (mode === 'baseFilm') {
        return [
          { label: '㎡', value: '㎡' },
          { label: 'pcs', value: 'pcs' },
          { label: 'Kg', value: 'kg' },
          { label: '卷', value: '卷' }
        ]
      }
      if (mode === 'core') {
        return [
          { label: 'pcs', value: 'pcs' },
          { label: '支', value: '支' },
          { label: '个', value: '个' },
          { label: 'Kg', value: 'kg' }
        ]
      }
      return [
        { label: '㎡', value: '㎡' },
        { label: 'pcs', value: 'pcs' },
        { label: 'Kg', value: 'kg' },
        { label: '桶', value: '桶' }
      ]
    },
    normalizeUnitValue(unit) {
      const v = String(unit || '').trim().toLowerCase()
      if (v === 'cps' || v === 'pcs') return 'pcs'
      return unit
    },
    materialTypeSearchOptions() {
      const all = [
        ...this.getMaterialTypeOptionsByMode('chemical'),
        ...this.getMaterialTypeOptionsByMode('baseFilm'),
        ...this.getMaterialTypeOptionsByMode('release'),
        ...this.getMaterialTypeOptionsByMode('core')
      ]
      const map = new Map()
      all.forEach(item => {
        if (!map.has(item.value)) map.set(item.value, item)
      })
      return Array.from(map.values())
    },
    materialTypeOptionsForCategory(category) {
      const mode = this.getCategoryMode(category || this.form.materialCategory)
      return this.getMaterialTypeOptionsByMode(mode)
    },
    unitOptionsForCategory() {
      const mode = this.getCategoryMode(this.form.materialCategory)
      return this.getUnitOptionsByMode(mode)
    },
    onCategoryChange(value) {
      this.form.materialCategoryRaw = value
      this.form.unit = this.normalizeUnitValue(this.form.unit)
      const mode = this.getCategoryMode(value)
      const options = this.materialTypeOptionsForCategory(value)
      const hasCurrentType = options.some(x => x.value === this.form.materialType)
      if (!hasCurrentType) {
        this.form.materialType = options.length ? options[0].value : this.defaultMaterialTypeByCategory(value)
      }
      const unitOptions = this.getUnitOptionsByMode(mode)
      const hasCurrentUnit = unitOptions.some(x => x.value === this.form.unit)
      if (!hasCurrentUnit) {
        this.form.unit = unitOptions.length ? unitOptions[0].value : 'kg'
      }
      this.performanceForm = this.getDefaultPerformanceForm()
    },
    specPlaceholder() {
      const mode = this.getCategoryMode(this.form.materialCategory)
      if (mode === 'baseFilm') return '如：50μm × 1200mm × 3000m'
      if (mode === 'core') return '如：3英寸管芯、长度1200mm'
      if (mode === 'release') return '如：单硅离型纸/双硅离型膜'
      return '如：180kg/桶、900kg/桶'
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
      this.searchForm = {
        materialCode: '',
        materialName: '',
        materialCategory: '',
        materialType: '',
        status: null,
        releaseForceA: '',
        releaseForceB: ''
      }
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
      this.form.unit = this.normalizeUnitValue(this.form.unit)
      this.performanceForm = this.getDefaultPerformanceForm()
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
          materialCategory: res.data.materialCategoryRaw || res.data.materialCategory || '化工料',
          materialCategoryRaw: res.data.materialCategoryRaw || res.data.materialCategory || '化工料',
          materialType: res.data.materialType || this.defaultMaterialTypeByCategory(res.data.materialCategoryRaw || res.data.materialCategory || '化工料'),
          unit: this.normalizeUnitValue(res.data.unit || 'kg'),
          spec: res.data.spec || '',
          performanceParams: res.data.performanceParams || '',
          status: res.data.status == null ? 1 : res.data.status
        }
        this.loadPerformanceForm()
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
          this.form.materialCategoryRaw = this.form.materialCategory
          this.form.unit = this.normalizeUnitValue(this.form.unit)
          this.form.performanceParams = JSON.stringify(this.buildPerformanceParamsPayload())
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
    handleInitialize() {
      this.$confirm('请上传你的Excel表格进行初始化，系统将按物料编码执行新增/更新，是否现在选择文件？', '提示', { type: 'warning' })
        .then(async() => {
          this.handleImportClick()
        })
        .catch(() => {})
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
