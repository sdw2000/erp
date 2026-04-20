<template>
  <div class="app-container">
    <el-card shadow="never">
      <div slot="header" class="flex-between">
        <span>客户物料映射（客户料号/客户品名）</span>
        <div>
          <input ref="importInput" type="file" accept=".csv,.xls,.xlsx,.et" style="display:none" @change="handleImportChange">
          <el-button size="mini" @click="downloadCsvTemplate">下载模板</el-button>
          <el-button size="mini" @click="triggerImport">导入</el-button>
          <el-button size="mini" @click="exportCsv">导出</el-button>
          <el-button size="mini" type="warning" :loading="initLoading" @click="initFromHistory">历史初始化</el-button>
          <el-button type="primary" size="mini" @click="openDialog()">新增映射</el-button>
        </div>
      </div>

      <el-form :inline="true" size="small" class="mb-10">
        <el-form-item label="客户代码">
          <el-input v-model.trim="query.customerCode" placeholder="如 DGFN001" clearable style="width: 160px" />
        </el-form-item>
        <el-form-item label="客户名称">
          <el-input v-model.trim="query.customerName" placeholder="支持模糊搜索" clearable style="width: 180px" />
        </el-form-item>
        <el-form-item label="我司料号">
          <el-input v-model.trim="query.materialCode" placeholder="如 FT-001" clearable style="width: 180px" />
        </el-form-item>
        <el-form-item label="厚度(μm)">
          <el-input-number v-model="query.thickness" :min="0" :precision="3" :controls="false" style="width: 120px" />
        </el-form-item>
        <el-form-item label="宽度(mm)">
          <el-input-number v-model="query.width" :min="0" :precision="2" :controls="false" style="width: 120px" />
        </el-form-item>
        <el-form-item label="长度(m)">
          <el-input-number v-model="query.length" :min="0" :precision="2" :controls="false" style="width: 120px" />
        </el-form-item>
        <el-form-item label="客户厚度(μm)">
          <el-input-number v-model="query.customerThickness" :min="0" :precision="3" :controls="false" style="width: 140px" />
        </el-form-item>
        <el-form-item label="客户宽度(mm)">
          <el-input-number v-model="query.customerWidth" :min="0" :precision="2" :controls="false" style="width: 140px" />
        </el-form-item>
        <el-form-item label="客户长度(m)">
          <el-input-number v-model="query.customerLength" :min="0" :precision="2" :controls="false" style="width: 140px" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="query.isActive" clearable style="width: 100px">
            <el-option label="启用" :value="1" />
            <el-option label="禁用" :value="0" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="fetchList">查询</el-button>
          <el-button @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>

      <el-table v-loading="loading" :data="list" border stripe size="small">
        <el-table-column prop="customerCode" label="客户代码" width="120" />
        <el-table-column prop="materialCode" label="物料代码" min-width="170" />
        <el-table-column prop="thickness" label="厚度(μm)" width="110" align="right" />
        <el-table-column prop="width" label="宽度(mm)" width="100" align="right" />
        <el-table-column prop="length" label="长度(m)" width="100" align="right" />
        <el-table-column prop="customerThickness" label="客户厚度(μm)" width="130" align="right" />
        <el-table-column prop="customerWidth" label="客户宽度(mm)" width="130" align="right" />
        <el-table-column prop="customerLength" label="客户长度(m)" width="130" align="right" />
        <el-table-column prop="customerMaterialCode" label="客户料号" min-width="170" />
        <el-table-column prop="customerMaterialName" label="客户物料名称" min-width="180" show-overflow-tooltip />
        <el-table-column prop="customerSpec" label="客户规格" min-width="180" show-overflow-tooltip />
        <el-table-column label="状态" width="90" align="center">
          <template slot-scope="scope">
            <el-tag :type="Number(scope.row.isActive) === 1 ? 'success' : 'info'">
              {{ Number(scope.row.isActive) === 1 ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="150" show-overflow-tooltip />
        <el-table-column label="操作" width="150" align="center">
          <template slot-scope="scope">
            <el-button type="text" size="mini" @click="openDialog(scope.row)">编辑</el-button>
            <el-button type="text" size="mini" style="color:#f56c6c" @click="handleDelete(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="mt-10 right">
        <el-pagination
          :current-page="query.pageNum"
          :page-size="query.pageSize"
          :total="total"
          layout="total, prev, pager, next, sizes"
          :page-sizes="[10,20,50,100]"
          @current-change="handlePageChange"
          @size-change="handleSizeChange"
        />
      </div>
    </el-card>

    <el-dialog :title="form.id ? '编辑映射' : '新增映射'" :visible.sync="dialogVisible" width="860px" @close="resetForm">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="120px" size="small">
        <el-form-item label="客户代码" prop="customerCode">
          <el-select
            v-model="form.customerCode"
            filterable
            :filter-method="handleCustomerFilter"
            clearable
            placeholder="搜索客户代码"
            style="width:100%"
          >
            <el-option
              v-for="item in filteredCustomerOptions"
              :key="item.id || item.customerCode"
              :label="formatCustomerLabel(item)"
              :value="item.customerCode"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="物料代码" prop="materialCode">
          <el-select
            v-model="form.materialCode"
            filterable
            :filter-method="handleMaterialFilter"
            clearable
            allow-create
            default-first-option
            placeholder="搜索物料代码"
            style="width:100%"
            @change="onMaterialCodeSelected"
          >
            <el-option
              v-for="item in filteredSpecOptions"
              :key="item.id || item.materialCode"
              :label="`${item.materialCode || '-'}${item.productName ? ' / ' + item.productName : ''}`"
              :value="item.materialCode"
            />
          </el-select>
        </el-form-item>
        <el-row :gutter="12">
          <el-col :span="8">
            <el-form-item label="厚度(μm)" prop="thickness">
              <el-input-number v-model="form.thickness" :min="0" :precision="3" :controls="false" style="width:100%" @change="onMainSpecChange('thickness')" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="宽度(mm)" prop="width">
              <el-input-number v-model="form.width" :min="0" :precision="2" :controls="false" style="width:100%" @change="onMainSpecChange('width')" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="长度(m)" prop="length">
              <el-input-number v-model="form.length" :min="0" :precision="2" :controls="false" style="width:100%" @change="onMainSpecChange('length')" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="12">
          <el-col :span="8">
            <el-form-item label="客户厚度(μm)">
              <el-input-number v-model="form.customerThickness" :min="0" :precision="3" :controls="false" style="width:100%" @change="onCustomerSpecChange('customerThickness')" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="客户宽度(mm)">
              <el-input-number v-model="form.customerWidth" :min="0" :precision="2" :controls="false" style="width:100%" @change="onCustomerSpecChange('customerWidth')" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="客户长度(m)">
              <el-input-number v-model="form.customerLength" :min="0" :precision="2" :controls="false" style="width:100%" @change="onCustomerSpecChange('customerLength')" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="客户料号">
          <el-input v-model.trim="form.customerMaterialCode" placeholder="可为空，空则回退物料代码" />
        </el-form-item>
        <el-form-item label="客户物料名称">
          <el-input v-model.trim="form.customerMaterialName" placeholder="可为空，空则回退我司品名" />
        </el-form-item>
        <el-form-item label="客户规格">
          <el-input v-model.trim="form.customerSpec" placeholder="可为空，建议手工填写客户标签规格" />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="form.isActive" :active-value="1" :inactive-value="0" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <span slot="footer">
        <el-button size="small" @click="dialogVisible = false">取消</el-button>
        <el-button size="small" type="primary" :loading="saving" @click="handleSave">保存</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import {
  getCustomerMaterialMappingPage,
  getAllCustomerMaterialMappings,
  saveCustomerMaterialMapping,
  batchImportStructuredCustomerMaterialMappingsByFile,
  deleteCustomerMaterialMapping,
  initCustomerMaterialMappingsFromHistory,
  getCustomerMaterialMappingImportTemplate
} from '@/api/customerMaterialMapping'
import { getCustomerList } from '@/api/customer'
import { getAllEnabledSpecs } from '@/api/tapeSpec'

function defaultForm() {
  return {
    id: null,
    customerCode: '',
    materialCode: '',
    thickness: null,
    width: null,
    length: null,
    customerThickness: null,
    customerWidth: null,
    customerLength: null,
    customerMaterialCode: '',
    customerMaterialName: '',
    customerSpec: '',
    isActive: 1,
    remark: ''
  }
}

export default {
  name: 'SalesCustomerMaterialMapping',
  data() {
    return {
      loading: false,
      initLoading: false,
      saving: false,
      dialogVisible: false,
      customerOptions: [],
      specOptions: [],
      customerSearchKeyword: '',
      materialSearchKeyword: '',
      list: [],
      total: 0,
      query: {
        pageNum: 1,
        pageSize: 20,
        customerCode: '',
        customerName: '',
        materialCode: '',
        thickness: null,
        width: null,
        length: null,
        customerThickness: null,
        customerWidth: null,
        customerLength: null,
        isActive: null
      },
      form: defaultForm(),
      rules: {
        customerCode: [{ required: true, message: '请输入客户代码', trigger: 'blur' }],
        materialCode: [{ required: true, message: '请输入物料代码', trigger: 'blur' }],
        thickness: [{ required: true, message: '请输入厚度', trigger: 'blur' }],
        width: [{ required: true, message: '请输入宽度', trigger: 'blur' }],
        length: [{ required: true, message: '请输入长度', trigger: 'blur' }]
      },
      customerSpecManual: {
        customerThickness: false,
        customerWidth: false,
        customerLength: false
      }
    }
  },
  computed: {
    filteredCustomerOptions() {
      const keyword = this.customerSearchKeyword
      if (!keyword) return this.customerOptions
      return (this.customerOptions || []).filter(item => this.matchCustomerOption(item, keyword))
    },
    filteredSpecOptions() {
      const keyword = this.materialSearchKeyword
      if (!keyword) return this.specOptions
      return (this.specOptions || []).filter(item => this.matchSpecOption(item, keyword))
    }
  },
  created() {
    this.loadCustomerOptions()
    this.loadSpecOptions()
    this.fetchList()
  },
  methods: {
    normalizeSearchText(value) {
      if (value === null || value === undefined) return ''
      return String(value)
        .replace(/\u00A0/g, ' ')
        .replace(/\u3000/g, ' ')
        .trim()
        .toLowerCase()
    },
    normalizeMaterialCode(value) {
      if (value === null || value === undefined) return ''
      return String(value)
        .replace(/\u00A0/g, ' ')
        .replace(/\u3000/g, ' ')
        .replace(/\s+/g, '')
        .replace(/[^0-9A-Za-z\u4e00-\u9fa5_-]/g, '')
        .toUpperCase()
        .trim()
    },
    handleCustomerFilter(query) {
      this.customerSearchKeyword = this.normalizeSearchText(query)
    },
    handleMaterialFilter(query) {
      this.materialSearchKeyword = this.normalizeSearchText(query)
    },
    matchCustomerOption(customer, keyword) {
      if (!customer) return false
      const key = this.normalizeSearchText(keyword)
      if (!key) return true

      const shortName = this.normalizeSearchText(customer.shortName || customer.customerShortName)
      const customerName = this.normalizeSearchText(customer.customerName)
      const codeRaw = this.normalizeSearchText(customer.customerCode)
      const codeNormalized = this.normalizeMaterialCode(customer.customerCode).toLowerCase()
      const keywordCodeNormalized = this.normalizeMaterialCode(keyword).toLowerCase()

      return shortName.includes(key) ||
        customerName.includes(key) ||
        codeRaw.includes(key) ||
        (!!keywordCodeNormalized && codeNormalized.includes(keywordCodeNormalized))
    },
    matchSpecOption(spec, keyword) {
      if (!spec) return false
      const key = this.normalizeSearchText(keyword)
      if (!key) return true

      const codeRaw = this.normalizeSearchText(spec.materialCode)
      const codeNormalized = this.normalizeMaterialCode(spec.materialCode).toLowerCase()
      const keywordCodeNormalized = this.normalizeMaterialCode(keyword).toLowerCase()
      const productName = this.normalizeSearchText(spec.productName)

      return codeRaw.includes(key) ||
        productName.includes(key) ||
        (!!keywordCodeNormalized && codeNormalized.includes(keywordCodeNormalized))
    },
    formatCustomerLabel(customer) {
      if (!customer) return ''
      const shortName = customer.shortName || customer.customerName || '-'
      const code = customer.customerCode || '-'
      return `${shortName} / ${code}`
    },
    async loadCustomerOptions() {
      try {
        const res = await getCustomerList({ size: 1000 })
        if (res && (res.code === 200 || res.code === 20000)) {
          const data = res.data
          const rows = Array.isArray(data && data.records) ? data.records : (Array.isArray(data) ? data : [])
          this.customerOptions = rows
        } else {
          this.customerOptions = []
        }
      } catch (e) {
        this.customerOptions = []
      }
    },
    async loadSpecOptions() {
      try {
        const res = await getAllEnabledSpecs()
        if (res && (res.code === 200 || res.code === 20000)) {
          this.specOptions = Array.isArray(res.data) ? res.data : []
        } else {
          this.specOptions = []
        }
      } catch (e) {
        this.specOptions = []
      }
    },
    onMaterialCodeSelected(materialCode) {
      const code = String(materialCode || '').trim()
      if (!code) return
      const hit = (this.specOptions || []).find(item => String(item.materialCode || '').trim() === code)
      if (!hit) return
      const t = Number(hit.totalThickness || hit.baseThickness || hit.thickness)
      const w = Number(hit.width)
      const l = Number(hit.length)
      if (Number.isFinite(t) && t > 0) {
        this.$set(this.form, 'thickness', t)
        this.syncCustomerSpecIfAuto('thickness')
      }
      if (Number.isFinite(w) && w > 0) {
        this.$set(this.form, 'width', w)
        this.syncCustomerSpecIfAuto('width')
      }
      if (Number.isFinite(l) && l > 0) {
        this.$set(this.form, 'length', l)
        this.syncCustomerSpecIfAuto('length')
      }
    },
    mainToCustomerField(mainField) {
      if (mainField === 'thickness') return 'customerThickness'
      if (mainField === 'width') return 'customerWidth'
      if (mainField === 'length') return 'customerLength'
      return ''
    },
    customerToMainField(customerField) {
      if (customerField === 'customerThickness') return 'thickness'
      if (customerField === 'customerWidth') return 'width'
      if (customerField === 'customerLength') return 'length'
      return ''
    },
    isEmptyNumber(val) {
      return val === null || val === undefined || val === ''
    },
    sameNumber(a, b) {
      if (this.isEmptyNumber(a) && this.isEmptyNumber(b)) return true
      const n1 = Number(a)
      const n2 = Number(b)
      if (!Number.isFinite(n1) || !Number.isFinite(n2)) return false
      return Math.abs(n1 - n2) < 0.000001
    },
    syncCustomerSpecIfAuto(mainField) {
      const customerField = this.mainToCustomerField(mainField)
      if (!customerField) return
      if (this.customerSpecManual[customerField]) return
      this.$set(this.form, customerField, this.form[mainField])
    },
    onMainSpecChange(mainField) {
      this.syncCustomerSpecIfAuto(mainField)
    },
    onCustomerSpecChange(customerField) {
      const mainField = this.customerToMainField(customerField)
      if (!mainField) return
      const customerVal = this.form[customerField]
      if (this.isEmptyNumber(customerVal)) {
        this.customerSpecManual[customerField] = false
        this.$set(this.form, customerField, this.form[mainField])
        return
      }
      this.customerSpecManual[customerField] = !this.sameNumber(customerVal, this.form[mainField])
    },
    initCustomerSpecManualState() {
      this.customerSpecManual.customerThickness = !this.isEmptyNumber(this.form.customerThickness) && !this.sameNumber(this.form.customerThickness, this.form.thickness)
      this.customerSpecManual.customerWidth = !this.isEmptyNumber(this.form.customerWidth) && !this.sameNumber(this.form.customerWidth, this.form.width)
      this.customerSpecManual.customerLength = !this.isEmptyNumber(this.form.customerLength) && !this.sameNumber(this.form.customerLength, this.form.length)

      this.syncCustomerSpecIfAuto('thickness')
      this.syncCustomerSpecIfAuto('width')
      this.syncCustomerSpecIfAuto('length')
    },
    async fetchList() {
      this.loading = true
      try {
        const params = {
          ...this.query,
          customerCode: this.query.customerCode || undefined,
          customerName: this.query.customerName || undefined,
          materialCode: this.query.materialCode || undefined,
          thickness: this.query.thickness || undefined,
          width: this.query.width || undefined,
          length: this.query.length || undefined,
          customerThickness: this.query.customerThickness || undefined,
          customerWidth: this.query.customerWidth || undefined,
          customerLength: this.query.customerLength || undefined,
          isActive: this.query.isActive == null ? undefined : this.query.isActive
        }
        const res = await getCustomerMaterialMappingPage(params)
        if (res && (res.code === 200 || res.code === 20000)) {
          const data = res.data || {}
          this.list = data.records || data.list || []
          this.total = Number(data.total || this.list.length || 0)
        } else {
          this.list = []
          this.total = 0
          this.$message.error((res && (res.msg || res.message)) || '查询失败')
        }
      } finally {
        this.loading = false
      }
    },
    resetQuery() {
      this.query = {
        pageNum: 1,
        pageSize: 20,
        customerCode: '',
        customerName: '',
        materialCode: '',
        thickness: null,
        width: null,
        length: null,
        customerThickness: null,
        customerWidth: null,
        customerLength: null,
        isActive: null
      }
      this.fetchList()
    },
    handlePageChange(page) {
      this.query.pageNum = page
      this.fetchList()
    },
    handleSizeChange(size) {
      this.query.pageSize = size
      this.query.pageNum = 1
      this.fetchList()
    },
    openDialog(row) {
      this.form = row ? { ...defaultForm(), ...row } : defaultForm()
      this.initCustomerSpecManualState()
      if (this.form.materialCode && (!this.form.thickness || !this.form.width || !this.form.length)) {
        this.onMaterialCodeSelected(this.form.materialCode)
      }
      this.dialogVisible = true
      this.$nextTick(() => this.$refs.formRef && this.$refs.formRef.clearValidate())
    },
    resetForm() {
      this.form = defaultForm()
      this.customerSpecManual = {
        customerThickness: false,
        customerWidth: false,
        customerLength: false
      }
    },
    async handleSave() {
      this.$refs.formRef.validate(async valid => {
        if (!valid) return
        this.saving = true
        try {
          const customerThicknessNum = Number(this.form.customerThickness)
          const customerWidthNum = Number(this.form.customerWidth)
          const customerLengthNum = Number(this.form.customerLength)
          const payload = {
            ...this.form,
            customerCode: String(this.form.customerCode || '').trim(),
            materialCode: String(this.form.materialCode || '').trim(),
            customerThickness: Number.isFinite(customerThicknessNum) && customerThicknessNum > 0 ? customerThicknessNum : null,
            customerWidth: Number.isFinite(customerWidthNum) && customerWidthNum > 0 ? customerWidthNum : null,
            customerLength: Number.isFinite(customerLengthNum) && customerLengthNum > 0 ? customerLengthNum : null,
            customerMaterialCode: String(this.form.customerMaterialCode || '').trim() || null,
            customerMaterialName: String(this.form.customerMaterialName || '').trim() || null,
            customerSpec: String(this.form.customerSpec || '').trim() || null
          }
          const res = await saveCustomerMaterialMapping(payload)
          if (res && (res.code === 200 || res.code === 20000)) {
            this.$message.success('保存成功')
            this.dialogVisible = false
            this.fetchList()
          } else {
            this.$message.error((res && (res.msg || res.message)) || '保存失败')
          }
        } finally {
          this.saving = false
        }
      })
    },
    async handleDelete(row) {
      await this.$confirm('确认删除该映射吗？', '提示', { type: 'warning' })
      const res = await deleteCustomerMaterialMapping(row.id)
      if (res && (res.code === 200 || res.code === 20000)) {
        this.$message.success('删除成功')
        this.fetchList()
      } else {
        this.$message.error((res && (res.msg || res.message)) || '删除失败')
      }
    },
    async initFromHistory() {
      try {
        await this.$confirm('将按历史订单一键初始化映射，已人工维护的值仅在为空时补全，是否继续？', '提示', { type: 'warning' })
      } catch (e) {
        return
      }
      this.initLoading = true
      try {
        const res = await initCustomerMaterialMappingsFromHistory({
          customerCode: this.query.customerCode || undefined,
          operator: (this.$store.getters.name || 'system')
        })
        if (res && (res.code === 200 || res.code === 20000)) {
          const d = res.data || {}
          const completed = d.completed ? '完成' : '未完成'
          this.$message.success(`初始化${completed}：总${d.total || 0}，新增${d.inserted || 0}，补全${d.updated || 0}，跳过${d.skipped || 0}`)
          this.fetchList()
        } else {
          this.$message.error((res && (res.msg || res.message)) || '历史初始化失败')
        }
      } finally {
        this.initLoading = false
      }
    },
    triggerImport() {
      const input = this.$refs.importInput
      if (!input) return
      input.value = ''
      input.click()
    },
    escapeCsvCell(value) {
      const text = String(value == null ? '' : value)
      if (/[",\r\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`
      return text
    },
    parseCsvLine(line) {
      const result = []
      let current = ''
      let inQuotes = false
      for (let i = 0; i < line.length; i += 1) {
        const ch = line[i]
        if (ch === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"'
            i += 1
          } else {
            inQuotes = !inQuotes
          }
        } else if (ch === ',' && !inQuotes) {
          result.push(current)
          current = ''
        } else {
          current += ch
        }
      }
      result.push(current)
      return result
    },
    downloadCsvFile(lines, fileName) {
      const content = `\uFEFF${(lines || []).join('\r\n')}`
      const blob = new Blob([content], { type: 'text/csv;charset=utf-8' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    },
    async downloadCsvTemplate() {
      try {
        const res = await getCustomerMaterialMappingImportTemplate()
        if (res && (res.code === 200 || res.code === 20000) && res.data) {
          const headers = Array.isArray(res.data.headers) ? res.data.headers : []
          const sample = res.data.sample || {}
          if (headers.length) {
            const lines = [
              headers.map(h => this.escapeCsvCell(h)).join(','),
              headers.map(h => this.escapeCsvCell(sample[h] == null ? '' : sample[h])).join(',')
            ]
            this.downloadCsvFile(lines, 'customer-material-mapping-template.csv')
            this.$message.success('CSV模板已下载（已按后端最新规则同步）')
            return
          }
        }
      } catch (e) {
        // fallback below
      }

      const lines = [
        '客户代码,客户物料代码,我司料号,客户规格,我司规格,客户物料名称,客户标签规格,备注',
        'ZZWB1001,58.01.01.1154,S201-2525-C03-0600,50μm*5mm*33m,50μm*5mm*33m,示例客户品名,50μm*5mm*33m,示例数据'
      ]
      this.downloadCsvFile(lines, 'customer-material-mapping-template.csv')
      this.$message.success('CSV模板已下载')
    },
    async exportCsv() {
      const res = await getAllCustomerMaterialMappings({ isActive: undefined })
      if (!(res && (res.code === 200 || res.code === 20000))) {
        this.$message.error((res && (res.msg || res.message)) || '导出失败')
        return
      }
      const list = Array.isArray(res.data) ? res.data : []
      const lines = ['customerCode,materialCode,thickness,width,length,customerThickness,customerWidth,customerLength,customerMaterialCode,customerMaterialName,customerSpec,isActive,remark']
      list.forEach(item => {
        lines.push([
          this.escapeCsvCell(item.customerCode),
          this.escapeCsvCell(item.materialCode),
          this.escapeCsvCell(item.thickness),
          this.escapeCsvCell(item.width),
          this.escapeCsvCell(item.length),
          this.escapeCsvCell(item.customerThickness),
          this.escapeCsvCell(item.customerWidth),
          this.escapeCsvCell(item.customerLength),
          this.escapeCsvCell(item.customerMaterialCode),
          this.escapeCsvCell(item.customerMaterialName),
          this.escapeCsvCell(item.customerSpec),
          this.escapeCsvCell(item.isActive == null ? 1 : item.isActive),
          this.escapeCsvCell(item.remark)
        ].join(','))
      })
      this.downloadCsvFile(lines, `customer-material-mapping-${new Date().toISOString().slice(0, 10)}.csv`)
      this.$message.success('CSV导出成功')
    },
    parseImportRows(csvText) {
      const text = String(csvText || '').replace(/^\uFEFF/, '')
      const lines = text.split(/\r?\n/).map(x => x.trim()).filter(Boolean)
      if (!lines.length) return []
      const headers = this.parseCsvLine(lines[0]).map(h => String(h || '').trim())
      const headerMap = headers.map(h => String(h || '').trim())

      return lines.slice(1).map(line => {
        const cols = this.parseCsvLine(line)
        const row = {}
        headerMap.forEach((h, idx) => {
          row[h] = String(cols[idx] || '').trim()
        })
        return row
      }).filter(row => {
        const customerCode = row.customerCode || row['客户代码'] || row['客户编码'] || ''
        const materialCode = row.materialCode || row['我司料号'] || row['物料代码'] || row['料号'] || ''
        return String(customerCode).trim() && String(materialCode).trim()
      })
    },
    async handleImportChange(event) {
      const files = event && event.target && event.target.files
      const file = files && files[0]
      if (!file) return
      try {
        await this.$confirm(`将导入文件 ${file.name}（支持Excel/WPS/CSV，同键自动更新），是否继续？`, '提示', {
          type: 'warning'
        })
        const operator = this.$store.getters.name || 'system'
        const res = await batchImportStructuredCustomerMaterialMappingsByFile(file, operator)
        if (res && (res.code === 200 || res.code === 20000)) {
          const d = res.data || {}
          this.$message.success(`导入完成：新增${d.inserted || 0}，更新${d.updated || 0}，跳过${d.skipped || 0}`)
          this.fetchList()
        } else {
          this.$message.error((res && (res.msg || res.message)) || '导入失败')
        }
      } catch (e) {
        if (e !== 'cancel') {
          this.$message.error(e.message || '导入失败，请检查CSV格式')
        }
      } finally {
        const input = this.$refs.importInput
        if (input) input.value = ''
      }
    }
  }
}
</script>

<style scoped>
.mb-10 { margin-bottom: 10px; }
.mt-10 { margin-top: 10px; }
.right { text-align: right; }
.flex-between { display: flex; align-items: center; justify-content: space-between; }
</style>
