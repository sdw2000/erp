<template>
  <div class="app-container">
    <el-card shadow="never">
      <div slot="header" class="card-header">
        <span>检测报告模板配置</span>
        <el-button type="primary" size="small" icon="el-icon-plus" @click="openCreate">新增配置</el-button>
      </div>

      <el-tabs v-model="activeTab">
        <el-tab-pane label="规则配置" name="rules">

          <el-form :inline="true" :model="query" class="search-form">
            <el-form-item label="客户代码">
              <el-input v-model="query.customerCode" placeholder="客户代码" clearable />
            </el-form-item>
            <el-form-item label="检验类型">
              <el-select v-model="query.inspectionType" placeholder="全部" clearable>
                <el-option label="来料" value="incoming" />
                <el-option label="过程" value="process" />
                <el-option label="出货" value="outbound" />
              </el-select>
            </el-form-item>
            <el-form-item label="模板编码">
              <el-input v-model="query.templateCode" placeholder="例如 OUTBOUND_RP01_A" clearable />
            </el-form-item>
            <el-form-item label="料号条件">
              <el-input v-model="query.materialCode" placeholder="料号/前缀" clearable />
            </el-form-item>
            <el-form-item label="状态">
              <el-select v-model="query.enabled" placeholder="全部" clearable>
                <el-option label="启用" :value="1" />
                <el-option label="停用" :value="0" />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" icon="el-icon-search" @click="loadData">查询</el-button>
              <el-button icon="el-icon-refresh" @click="resetQuery">重置</el-button>
            </el-form-item>
          </el-form>

          <el-table v-loading="loading" :data="rows" border stripe>
            <el-table-column prop="customerCode" label="客户代码" width="140" />
            <el-table-column prop="inspectionType" label="检验类型" width="120">
              <template slot-scope="{ row }">
                <span>{{ inspectionTypeText(row.inspectionType) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="materialCode" label="料号精确" width="170" />
            <el-table-column prop="materialPrefix" label="料号前缀" width="170" />
            <el-table-column prop="priority" label="优先级" width="90" align="center" />
            <el-table-column prop="templateCode" label="模板编码" min-width="220" />
            <el-table-column prop="remark" label="备注" min-width="160" show-overflow-tooltip />
            <el-table-column prop="enabled" label="状态" width="100" align="center">
              <template slot-scope="{ row }">
                <el-tag :type="Number(row.enabled) === 1 ? 'success' : 'info'" size="small">
                  {{ Number(row.enabled) === 1 ? '启用' : '停用' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="updatedBy" label="更新人" width="120" />
            <el-table-column prop="updatedAt" label="更新时间" width="180" />
            <el-table-column label="操作" width="210" fixed="right">
              <template slot-scope="{ row }">
                <el-button type="text" size="small" @click="openEdit(row)">编辑</el-button>
                <el-button type="text" size="small" @click="quickToggle(row)">
                  {{ Number(row.enabled) === 1 ? '停用' : '启用' }}
                </el-button>
                <el-button type="text" size="small" style="color:#F56C6C" @click="removeRow(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>

          <el-pagination
            style="margin-top: 12px; text-align: right"
            :current-page="query.current"
            :page-size="query.size"
            :page-sizes="[10, 20, 50]"
            :total="total"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="sizeChange"
            @current-change="pageChange"
          />
        </el-tab-pane>

        <el-tab-pane label="模板字段值" name="fields">
          <el-alert
            title="说明：这里展示出货报告Excel模板可用占位符。格式为 ${字段名}。"
            type="info"
            :closable="false"
            show-icon
            style="margin-bottom: 10px"
          />
          <el-form :inline="true" class="search-form">
            <el-form-item label="关键字">
              <el-input v-model="templateFieldKeyword" placeholder="字段名/说明/示例" clearable />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" icon="el-icon-document-copy" @click="copyTemplateFieldList">复制字段清单</el-button>
              <el-button icon="el-icon-brush" @click="copyTemplateFieldJson">复制JSON</el-button>
            </el-form-item>
          </el-form>

          <el-table :data="filteredTemplateFieldRows" border stripe max-height="560">
            <el-table-column prop="field" label="字段名" min-width="200" />
            <el-table-column label="占位符" min-width="220">
              <template slot-scope="{ row }">
                <span>{{ '${' + row.field + '}' }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="description" label="说明" min-width="260" />
            <el-table-column prop="example" label="示例值" min-width="220" show-overflow-tooltip />
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <el-dialog :title="editing ? '编辑模板配置' : '新增模板配置'" :visible.sync="dialogVisible" width="560px" @close="resetForm">
      <el-form ref="form" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="客户代码" prop="customerCode">
          <el-input v-model="form.customerCode" placeholder="例如：RP01" />
        </el-form-item>
        <el-form-item label="检验类型" prop="inspectionType">
          <el-select v-model="form.inspectionType" style="width:100%">
            <el-option label="来料" value="incoming" />
            <el-option label="过程" value="process" />
            <el-option label="出货" value="outbound" />
          </el-select>
        </el-form-item>
        <el-form-item label="模板编码" prop="templateCode">
          <el-select v-model="form.templateCode" style="width:100%" allow-create filterable default-first-option placeholder="例如：OUTBOUND_RP01">
            <el-option label="OUTBOUND_DEFAULT" value="OUTBOUND_DEFAULT" />
            <el-option label="OUTBOUND_RP01" value="OUTBOUND_RP01" />
          </el-select>
        </el-form-item>
        <el-form-item label="料号精确">
          <el-input v-model="form.materialCode" placeholder="如 A01100096（可空）" />
        </el-form-item>
        <el-form-item label="料号前缀">
          <el-input v-model="form.materialPrefix" placeholder="如 A01 或 205-R04（可空）" />
        </el-form-item>
        <el-form-item label="优先级">
          <el-input-number v-model="form.priority" :min="-999" :max="999" :step="1" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" placeholder="可选" />
        </el-form-item>
        <el-form-item label="状态" prop="enabled">
          <el-switch v-model="enabledSwitch" active-text="启用" inactive-text="停用" />
        </el-form-item>
      </el-form>
      <span slot="footer" class="dialog-footer">
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">保存</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import { pageQualityReportTemplateRule, saveQualityReportTemplateRule, deleteQualityReportTemplateRule } from '@/api/quality'

export default {
  name: 'QualityReportTemplateRulePage',
  data() {
    return {
      activeTab: 'rules',
      loading: false,
      rows: [],
      total: 0,
      query: {
        customerCode: '',
        inspectionType: '',
        materialCode: '',
        templateCode: '',
        enabled: null,
        current: 1,
        size: 10
      },
      templateFieldKeyword: '',
      templateFieldRows: [],
      dialogVisible: false,
      editing: false,
      enabledSwitch: true,
      form: {
        id: null,
        customerCode: '',
        inspectionType: 'outbound',
        materialCode: '',
        materialPrefix: '',
        priority: 0,
        templateCode: 'OUTBOUND_DEFAULT',
        remark: '',
        enabled: 1
      },
      rules: {
        customerCode: [{ required: false, message: '请输入客户代码', trigger: 'blur' }],
        inspectionType: [{ required: true, message: '请选择检验类型', trigger: 'change' }],
        templateCode: [{ required: true, message: '请输入模板编码', trigger: 'change' }]
      }
    }
  },
  computed: {
    filteredTemplateFieldRows() {
      const keyword = String(this.templateFieldKeyword || '').trim().toLowerCase()
      if (!keyword) return this.templateFieldRows
      return (this.templateFieldRows || []).filter(item => {
        const text = [item.field, item.description, item.example].join(' ').toLowerCase()
        return text.indexOf(keyword) !== -1
      })
    }
  },
  mounted() {
    this.loadData()
    this.initTemplateFieldRows()
  },
  methods: {
    initTemplateFieldRows() {
      this.templateFieldRows = [
        { field: 'templateCode', description: '模板编码', example: 'OUTBOUND_DEFAULT' },
        { field: 'formNo', description: '表单编号', example: 'FE-FR-GC-01' },
        { field: 'customerCode', description: '客户代码', example: 'RP01' },
        { field: 'customerName', description: '客户名称', example: '某某客户' },
        { field: 'customerPartNo', description: '客户料号', example: 'CP-001' },
        { field: 'customerMaterialCode', description: '客户物料编码', example: 'CM-001' },
        { field: 'customerMaterialName', description: '客户物料名称', example: 'PET双面胶带' },
        { field: 'inspectionNo', description: '检验单号', example: 'QC20260704001' },
        { field: 'sourceOrderNo', description: '来源订单号', example: 'SO20260704001' },
        { field: 'orderNo', description: '订单号别名', example: 'SO20260704001' },
        { field: 'batchNo', description: '批次号', example: 'B20260704001' },
        { field: 'lotNo', description: '批次号别名', example: 'B20260704001' },
        { field: 'rollCode', description: '卷号', example: 'R001' },
        { field: 'materialCode', description: '料号', example: 'A01100096' },
        { field: 'productCode', description: '料号别名', example: 'A01100096' },
        { field: 'materialName', description: '物料名称', example: 'PETM T15' },
        { field: 'productName', description: '物料名称别名', example: 'PETM T15' },
        { field: 'specification', description: '规格', example: '38mm*100m' },
        { field: 'inspectionEnvironment', description: '检测条件', example: '23±5℃、50±5%' },
        { field: 'inspectionCondition', description: '检测条件别名', example: '23±5℃、50±5%' },
        { field: 'inspectionDate', description: '检测日期', example: '2026-07-04' },
        { field: 'inspectionTime', description: '检测时间', example: '2026-07-04 10:15:00' },
        { field: 'netWeight', description: '净重', example: '25.36' },
        { field: 'sampleQty', description: '抽样数', example: '5' },
        { field: 'qtyRoll', description: '抽样数别名', example: '5' },
        { field: 'inspectorName', description: '检验员', example: '张三' },
        { field: 'reviewerName', description: '复核人', example: '李四' },
        { field: 'overallResult', description: '总体判定', example: '合格' },
        { field: 'resultText', description: '总体判定别名', example: '合格' },
        { field: 'passCount', description: '合格项数', example: '12' },
        { field: 'failCount', description: '不合格项数', example: '0' },
        { field: 'pendingCount', description: '待判定项数', example: '0' },
        { field: 'totalCount', description: '总项目数', example: '12' },
        { field: 'qcItemNames', description: '检测项目名称（多行）', example: '外观\n宽度\n剥离力' },
        { field: 'qcStandards', description: '标准值（多行）', example: '无异物\n38±0.5\n≥8N' },
        { field: 'qcActualValues', description: '测试值（多行）', example: '良好\n38.1\n8.6/8.4/8.7' },
        { field: 'qcMethods', description: '测试方法（多行）', example: '目测\n卡尺\n180°剥离' },
        { field: 'qcResults', description: '判定结果（多行）', example: '合格\n合格\n合格' },
        { field: 'item1_name', description: '第1项检测项目名称（itemN）', example: '剥离力' },
        { field: 'item1_standard', description: '第1项标准值（itemN）', example: '≥8N' },
        { field: 'item1_actual_all', description: '第1项测试值汇总（itemN）', example: '8.6 / 8.4 / 8.7' },
        { field: 'appearance_standard', description: '语义字段：外观标准值', example: '无明显异物、褶皱' },
        { field: 'appearance_actual_all', description: '语义字段：外观测试值', example: '良好' },
        { field: 'appearance_result', description: '语义字段：外观判定', example: '合格' },
        { field: 'color_standard', description: '语义字段：颜色标准值', example: 'Pantone 透明' },
        { field: 'color_actual_all', description: '语义字段：颜色测试值', example: '透明' },
        { field: 'color_result', description: '语义字段：颜色判定', example: '合格' },
        { field: 'width_standard', description: '语义字段：宽度标准值', example: '38±0.5mm' },
        { field: 'width_actual_all', description: '语义字段：宽度测试值', example: '38.1 / 38.0 / 38.2' },
        { field: 'width_result', description: '语义字段：宽度判定', example: '合格' },
        { field: 'peelStrength_standard', description: '语义字段：剥离力标准值', example: '≥8N' },
        { field: 'peelStrength_actual_all', description: '语义字段：剥离力测试值', example: '8.6 / 8.4 / 8.7' },
        { field: 'peelStrength_method', description: '语义字段：剥离力测试方法', example: '180°剥离' },
        { field: 'peelStrength_result', description: '语义字段：剥离力判定', example: '合格' },
        { field: 'heatResistance_standard', description: '语义字段：耐温标准值', example: '80℃/30min 无异常' },
        { field: 'heatResistance_actual_all', description: '语义字段：耐温测试值', example: '通过' },
        { field: 'heatResistance_result', description: '语义字段：耐温判定', example: '合格' },
        { field: 'item1_method', description: '第1项测试方法（itemN）', example: '180°剥离' },
        { field: 'item1_result', description: '第1项判定结果（itemN）', example: '合格' },
        { field: 'companyName', description: '公司名称', example: '万利兴电子' },
        { field: 'companyAddress', description: '公司地址', example: '广东省...' },
        { field: 'companyPhone', description: '公司电话', example: '0755-xxxxxxx' },
        { field: 'companyFax', description: '公司传真', example: '0755-xxxxxxx' },
        { field: 'companyWebsite', description: '公司网址', example: 'www.example.com' },
        { field: 'signDate', description: '签发日期', example: '2026-07-04' },
        { field: 'printDate', description: '打印日期', example: '2026-07-04' },
        { field: 'productDate', description: '生产日期', example: '2026-07-03' }
      ]
    },
    copyTextToClipboard(text, successMsg) {
      const content = String(text || '')
      if (!content) {
        this.$message.warning('没有可复制内容')
        return
      }
      const done = () => this.$message.success(successMsg || '复制成功')
      if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(content).then(done).catch(() => {
          const ta = document.createElement('textarea')
          ta.value = content
          document.body.appendChild(ta)
          ta.select()
          document.execCommand('copy')
          document.body.removeChild(ta)
          done()
        })
      } else {
        const ta = document.createElement('textarea')
        ta.value = content
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
        done()
      }
    },
    copyTemplateFieldList() {
      const text = (this.filteredTemplateFieldRows || [])
        .map(item => `\${${item.field}}\t${item.description}\t${item.example || ''}`)
        .join('\n')
      this.copyTextToClipboard(text, '模板字段清单已复制')
    },
    copyTemplateFieldJson() {
      const payload = {}
      ;(this.filteredTemplateFieldRows || []).forEach(item => {
        payload[item.field] = item.example || ''
      })
      this.copyTextToClipboard(JSON.stringify(payload, null, 2), '模板字段JSON已复制')
    },
    inspectionTypeText(val) {
      const map = { incoming: '来料', process: '过程', outbound: '出货' }
      return map[val] || (val || '-')
    },
    buildQueryParams() {
      const params = {
        current: this.query.current,
        size: this.query.size
      }
      if (this.query.customerCode) params.customerCode = String(this.query.customerCode).trim().toUpperCase()
      if (this.query.inspectionType) params.inspectionType = this.query.inspectionType
      if (this.query.materialCode) params.materialCode = String(this.query.materialCode).trim().toUpperCase()
      if (this.query.templateCode) params.templateCode = this.query.templateCode
      if (this.query.enabled === 0 || this.query.enabled === 1) params.enabled = this.query.enabled
      return params
    },
    async loadData() {
      this.loading = true
      try {
        const res = await pageQualityReportTemplateRule(this.buildQueryParams())
        if (res && (res.code === 200 || res.code === 20000)) {
          this.rows = (res.data && res.data.records) || []
          this.total = Number((res.data && res.data.total) || 0)
        } else {
          this.$message.error((res && res.message) || '加载失败')
        }
      } catch (e) {
        this.$message.error('加载失败')
      } finally {
        this.loading = false
      }
    },
    resetQuery() {
      this.query = {
        customerCode: '',
        inspectionType: '',
        materialCode: '',
        templateCode: '',
        enabled: null,
        current: 1,
        size: 10
      }
      this.loadData()
    },
    sizeChange(size) {
      this.query.size = size
      this.loadData()
    },
    pageChange(page) {
      this.query.current = Number(page)
      this.loadData()
    },
    openCreate() {
      this.editing = false
      this.dialogVisible = true
      this.form = {
        id: null,
        customerCode: '',
        inspectionType: 'outbound',
        materialCode: '',
        materialPrefix: '',
        priority: 0,
        templateCode: 'OUTBOUND_DEFAULT',
        remark: '',
        enabled: 1
      }
      this.enabledSwitch = true
      this.$nextTick(() => {
        this.$refs.form && this.$refs.form.clearValidate()
      })
    },
    openEdit(row) {
      this.editing = true
      this.dialogVisible = true
      this.form = {
        id: row.id || null,
        customerCode: String(row.customerCode || '').trim(),
        inspectionType: row.inspectionType || 'outbound',
        materialCode: String(row.materialCode || '').trim(),
        materialPrefix: String(row.materialPrefix || '').trim(),
        priority: Number(row.priority || 0),
        templateCode: row.templateCode || 'OUTBOUND_DEFAULT',
        remark: String(row.remark || '').trim(),
        enabled: Number(row.enabled) === 1 ? 1 : 0
      }
      this.enabledSwitch = Number(this.form.enabled) === 1
      this.$nextTick(() => {
        this.$refs.form && this.$refs.form.clearValidate()
      })
    },
    resetForm() {
      this.$nextTick(() => {
        this.$refs.form && this.$refs.form.clearValidate()
      })
    },
    async submitForm() {
      this.$refs.form.validate(async valid => {
        if (!valid) return
        const payload = {
          id: this.form.id,
          customerCode: String(this.form.customerCode || '').trim().toUpperCase(),
          inspectionType: this.form.inspectionType || 'outbound',
          materialCode: String(this.form.materialCode || '').trim().toUpperCase(),
          materialPrefix: String(this.form.materialPrefix || '').trim().toUpperCase(),
          priority: Number(this.form.priority || 0),
          templateCode: String(this.form.templateCode || '').trim().toUpperCase(),
          remark: String(this.form.remark || '').trim(),
          enabled: this.enabledSwitch ? 1 : 0
        }
        const res = await saveQualityReportTemplateRule(payload)
        if (res && (res.code === 200 || res.code === 20000)) {
          this.$message.success('保存成功')
          this.dialogVisible = false
          this.loadData()
        } else {
          this.$message.error((res && res.message) || '保存失败')
        }
      })
    },
    async quickToggle(row) {
      const enabled = Number(row.enabled) === 1 ? 0 : 1
      const payload = {
        id: row.id,
        customerCode: row.customerCode,
        inspectionType: row.inspectionType,
        materialCode: row.materialCode,
        materialPrefix: row.materialPrefix,
        priority: row.priority,
        templateCode: row.templateCode,
        remark: row.remark,
        enabled
      }
      const res = await saveQualityReportTemplateRule(payload)
      if (res && (res.code === 200 || res.code === 20000)) {
        this.$message.success(enabled === 1 ? '已启用' : '已停用')
        this.loadData()
      } else {
        this.$message.error((res && res.message) || '操作失败')
      }
    },
    removeRow(row) {
      this.$confirm('确认删除该配置？', '提示', { type: 'warning' }).then(async() => {
        const res = await deleteQualityReportTemplateRule({
          id: row.id
        })
        if (res && (res.code === 200 || res.code === 20000)) {
          this.$message.success('删除成功')
          this.loadData()
        } else {
          this.$message.error((res && res.message) || '删除失败')
        }
      }).catch(() => {})
    }
  }
}
</script>
