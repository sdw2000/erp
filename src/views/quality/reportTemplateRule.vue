<template>
  <div class="app-container">
    <el-card shadow="never">
      <div slot="header" class="card-header">
        <span>检测报告模板配置</span>
        <el-button type="primary" size="small" icon="el-icon-plus" @click="openCreate">新增配置</el-button>
      </div>

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
  mounted() {
    this.loadData()
  },
  methods: {
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
