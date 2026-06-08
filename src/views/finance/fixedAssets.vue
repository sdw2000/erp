<template>
  <div class="app-container">
    <el-card>
      <div slot="header" class="clearfix">
        <span>固定资产管理</span>
      </div>

      <el-form :inline="true" size="small" class="mb12">
        <el-form-item label="关键字">
          <el-input v-model="query.keyword" placeholder="资产编码/名称/分类" clearable style="width: 240px" @keyup.enter.native="load" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="query.status" clearable placeholder="全部" style="width: 120px">
            <el-option label="ACTIVE" value="ACTIVE" />
            <el-option label="DISPOSED" value="DISPOSED" />
          </el-select>
        </el-form-item>
        <el-form-item label="报表月份">
          <el-date-picker v-model="query.month" type="month" value-format="yyyy-MM" placeholder="默认当月" style="width: 130px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="load">查询</el-button>
          <el-button @click="resetQuery">重置</el-button>
          <el-button type="success" @click="openCreate">新增资产</el-button>
          <el-button type="primary" plain @click="openBatchDepreciate">按月批量计提</el-button>
          <el-button type="warning" plain @click="exportReport">导出报表</el-button>
        </el-form-item>
      </el-form>

      <el-row :gutter="12" class="mb12">
        <el-col :span="6"><el-card shadow="never"><div class="mini">资产总数</div><div class="val">{{ summary.totalAssets || 0 }}</div></el-card></el-col>
        <el-col :span="6"><el-card shadow="never"><div class="mini">在用资产</div><div class="val">{{ summary.activeAssets || 0 }}</div></el-card></el-col>
        <el-col :span="6"><el-card shadow="never"><div class="mini">累计折旧</div><div class="val">{{ summary.totalAccumulatedDepreciation || 0 }}</div></el-card></el-col>
        <el-col :span="6"><el-card shadow="never"><div class="mini">当月折旧</div><div class="val">{{ summary.monthDepreciationAmount || 0 }}</div></el-card></el-col>
      </el-row>

      <el-table v-loading="loading" :data="assets" stripe border size="small">
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="assetCode" label="资产编码" min-width="150" />
        <el-table-column prop="assetName" label="资产名称" min-width="180" />
        <el-table-column prop="category" label="分类" width="120" />
        <el-table-column prop="purchaseDate" label="购置日期" width="120" />
        <el-table-column prop="originalValue" label="原值" width="120" align="right" />
        <el-table-column prop="accumulatedDepreciation" label="累计折旧" width="120" align="right" />
        <el-table-column prop="netValue" label="净值" width="120" align="right" />
        <el-table-column prop="usefulLifeMonths" label="寿命(月)" width="90" />
        <el-table-column prop="status" label="状态" width="110">
          <template slot-scope="scope">
            <el-tag :type="scope.row.status === 'ACTIVE' ? 'success' : 'info'">{{ scope.row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="330" fixed="right">
          <template slot-scope="scope">
            <el-button size="mini" @click="openEdit(scope.row)">编辑</el-button>
            <el-button size="mini" type="primary" :disabled="scope.row.status !== 'ACTIVE'" @click="openDepreciate(scope.row)">计提折旧</el-button>
            <el-button size="mini" type="warning" @click="showDepreciations(scope.row)">折旧记录</el-button>
            <el-button size="mini" type="danger" :disabled="scope.row.status !== 'ACTIVE'" @click="openDispose(scope.row)">处置</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog :title="assetDialogTitle" :visible.sync="assetDialogVisible" width="760px">
      <el-form :model="assetForm" label-width="120px" size="small">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="资产编码">
              <el-input v-model="assetForm.asset_code" :disabled="assetMode === 'edit'" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="资产名称">
              <el-input v-model="assetForm.asset_name" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="分类">
              <el-input v-model="assetForm.category" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="购置日期">
              <el-date-picker v-model="assetForm.purchase_date" type="date" value-format="yyyy-MM-dd" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="原值">
              <el-input-number v-model="assetForm.original_value" :precision="2" :min="0" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="残值">
              <el-input-number v-model="assetForm.salvage_value" :precision="2" :min="0" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="寿命(月)">
              <el-input-number v-model="assetForm.useful_life_months" :min="1" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="存放地点">
              <el-input v-model="assetForm.location" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="责任人">
              <el-input v-model="assetForm.responsible_person" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="备注">
          <el-input v-model="assetForm.remark" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <span slot="footer">
        <el-button @click="assetDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitAsset">保存</el-button>
      </span>
    </el-dialog>

    <el-dialog title="计提折旧" :visible.sync="depDialogVisible" width="480px">
      <el-form :model="depForm" label-width="110px" size="small">
        <el-form-item label="资产">
          <span>{{ currentAsset ? (currentAsset.assetCode + ' / ' + currentAsset.assetName) : '-' }}</span>
        </el-form-item>
        <el-form-item label="期间月份">
          <el-date-picker v-model="depForm.period_month" type="month" value-format="yyyy-MM" style="width: 100%" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="depForm.note" />
        </el-form-item>
      </el-form>
      <span slot="footer">
        <el-button @click="depDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitDepreciate">确认计提</el-button>
      </span>
    </el-dialog>

    <el-dialog title="按月批量计提" :visible.sync="batchDepDialogVisible" width="480px">
      <el-form :model="batchDepForm" label-width="110px" size="small">
        <el-form-item label="期间月份">
          <el-date-picker v-model="batchDepForm.period_month" type="month" value-format="yyyy-MM" style="width: 100%" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="batchDepForm.note" />
        </el-form-item>
      </el-form>
      <span slot="footer">
        <el-button @click="batchDepDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitBatchDepreciate">确认计提</el-button>
      </span>
    </el-dialog>

    <el-dialog title="资产处置" :visible.sync="disposeDialogVisible" width="520px">
      <el-form :model="disposeForm" label-width="110px" size="small">
        <el-form-item label="处置日期">
          <el-date-picker v-model="disposeForm.dispose_date" type="date" value-format="yyyy-MM-dd" style="width: 100%" />
        </el-form-item>
        <el-form-item label="处置金额">
          <el-input-number v-model="disposeForm.dispose_amount" :precision="2" :min="0" style="width: 100%" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="disposeForm.remark" />
        </el-form-item>
      </el-form>
      <span slot="footer">
        <el-button @click="disposeDialogVisible = false">取消</el-button>
        <el-button type="danger" @click="submitDispose">确认处置</el-button>
      </span>
    </el-dialog>

    <el-dialog title="折旧记录" :visible.sync="depListDialogVisible" width="760px">
      <el-table :data="depRows" border size="small" max-height="420">
        <el-table-column prop="periodMonth" label="期间" width="120" />
        <el-table-column prop="depreciationAmount" label="本期折旧" width="120" align="right" />
        <el-table-column prop="accumulatedAfter" label="累计折旧" width="120" align="right" />
        <el-table-column prop="netValueAfter" label="净值" width="120" align="right" />
        <el-table-column prop="voucherNo" label="凭证号" width="180" />
        <el-table-column prop="note" label="备注" min-width="150" />
        <el-table-column prop="createdAt" label="创建时间" min-width="160" />
      </el-table>
    </el-dialog>
  </div>
</template>

<script>
import {
  listFixedAssets,
  createFixedAsset,
  updateFixedAsset,
  depreciateFixedAsset,
  batchDepreciateFixedAssets,
  disposeFixedAsset,
  listDepreciations,
  getFixedAssetReportSummary,
  exportFixedAssetReport
} from '@/api/fixedAssets'

export default {
  name: 'FinanceFixedAssets',
  data() {
    return {
      loading: false,
      assets: [],
      query: {
        keyword: '',
        status: '',
        month: ''
      },
      summary: {},

      assetDialogVisible: false,
      assetDialogTitle: '新增资产',
      assetMode: 'create',
      assetForm: this.newAssetForm(),

      depDialogVisible: false,
      depForm: {
        period_month: '',
        note: ''
      },

      batchDepDialogVisible: false,
      batchDepForm: {
        period_month: '',
        note: ''
      },

      disposeDialogVisible: false,
      disposeForm: {
        dispose_date: '',
        dispose_amount: 0,
        remark: ''
      },

      depListDialogVisible: false,
      depRows: [],

      currentAsset: null
    }
  },
  created() {
    this.load()
  },
  methods: {
    newAssetForm() {
      return {
        id: null,
        asset_code: '',
        asset_name: '',
        category: '',
        purchase_date: '',
        original_value: 0,
        salvage_value: 0,
        useful_life_months: 60,
        location: '',
        responsible_person: '',
        remark: ''
      }
    },
    async load() {
      this.loading = true
      try {
        const [res, summaryRes] = await Promise.all([
          listFixedAssets(this.query),
          getFixedAssetReportSummary({ month: this.query.month || this.currentMonth() })
        ])
        if (res && (res.code === 200 || res.code === 20000)) {
          this.assets = res.data || []
        }
        if (summaryRes && (summaryRes.code === 200 || summaryRes.code === 20000)) {
          this.summary = summaryRes.data || {}
        }
      } finally {
        this.loading = false
      }
    },
    currentMonth() {
      const d = new Date()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      return `${d.getFullYear()}-${m}`
    },
    resetQuery() {
      this.query = { keyword: '', status: '', month: '' }
      this.load()
    },
    buildExportFileName(defaultMonth) {
      const month = this.query.month || defaultMonth
      const status = this.query.status || 'ALL'
      const keyword = (this.query.keyword || '').trim().replace(/[\\/:*?"<>|\s]+/g, '_')
      const keywordPart = keyword ? `-${keyword}` : ''
      return `fixed-assets-report-${month.replace('-', '')}-${status}${keywordPart}.xlsx`
    },
    parseHeaderFileName(contentDisposition) {
      if (!contentDisposition) return ''
      const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(contentDisposition)
      if (utf8Match && utf8Match[1]) {
        return decodeURIComponent(utf8Match[1])
      }
      const basicMatch = /filename="?([^";]+)"?/i.exec(contentDisposition)
      return basicMatch && basicMatch[1] ? basicMatch[1] : ''
    },
    openCreate() {
      this.assetMode = 'create'
      this.assetDialogTitle = '新增资产'
      this.assetForm = this.newAssetForm()
      this.assetDialogVisible = true
    },
    openEdit(row) {
      this.assetMode = 'edit'
      this.assetDialogTitle = '编辑资产'
      this.assetForm = {
        id: row.id,
        asset_code: row.assetCode,
        asset_name: row.assetName,
        category: row.category,
        purchase_date: row.purchaseDate,
        original_value: Number(row.originalValue || 0),
        salvage_value: Number(row.salvageValue || 0),
        useful_life_months: row.usefulLifeMonths,
        location: row.location,
        responsible_person: row.responsiblePerson,
        remark: row.remark
      }
      this.assetDialogVisible = true
    },
    async submitAsset() {
      const f = this.assetForm
      if (!f.asset_code || !f.asset_name || !f.purchase_date) {
        return this.$message.warning('请填写资产编码、资产名称、购置日期')
      }
      if (Number(f.original_value) <= 0) {
        return this.$message.warning('原值必须大于0')
      }
      if (Number(f.salvage_value) < 0) {
        return this.$message.warning('残值不能小于0')
      }
      if (Number(f.salvage_value) > Number(f.original_value)) {
        return this.$message.warning('残值不能大于原值')
      }
      if (Number(f.useful_life_months) <= 0) {
        return this.$message.warning('寿命(月)必须大于0')
      }

      try {
        let res
        if (this.assetMode === 'create') {
          res = await createFixedAsset(f)
        } else {
          res = await updateFixedAsset(f.id, f)
        }
        if (res && (res.code === 200 || res.code === 20000)) {
          this.$message.success(this.assetMode === 'create' ? '新增成功' : '更新成功')
          this.assetDialogVisible = false
          this.load()
        }
      } catch (e) {
        // 全局拦截器会提示，这里保底避免静默
        this.$message.error('保存失败，请检查输入或稍后重试')
      }
    },
    openDepreciate(row) {
      this.currentAsset = row
      this.depForm = {
        period_month: '',
        note: ''
      }
      this.depDialogVisible = true
    },
    openBatchDepreciate() {
      this.batchDepForm = {
        period_month: this.currentMonth(),
        note: ''
      }
      this.batchDepDialogVisible = true
    },
    async submitDepreciate() {
      if (!this.currentAsset || !this.depForm.period_month) {
        return this.$message.warning('请选择期间月份')
      }
      try {
        const res = await depreciateFixedAsset({
          asset_id: this.currentAsset.id,
          period_month: this.depForm.period_month,
          note: this.depForm.note
        })
        if (res && (res.code === 200 || res.code === 20000)) {
          this.$message.success('计提成功')
          this.depDialogVisible = false
          this.load()
        }
      } catch (e) {
        this.$message.error('计提失败，请检查期间是否重复')
      }
    },
    async submitBatchDepreciate() {
      if (!this.batchDepForm.period_month) {
        return this.$message.warning('请选择期间月份')
      }
      try {
        const res = await batchDepreciateFixedAssets(this.batchDepForm)
        if (res && (res.code === 200 || res.code === 20000)) {
          const d = res.data || {}
          this.$message.success(`批量计提完成：成功${d.successCount || 0}，跳过${d.skippedCount || 0}`)
          this.batchDepDialogVisible = false
          this.load()
        }
      } catch (e) {
        this.$message.error('批量计提失败，请稍后重试')
      }
    },
    openDispose(row) {
      this.currentAsset = row
      this.disposeForm = {
        dispose_date: '',
        dispose_amount: Number(row.netValue || 0),
        remark: ''
      }
      this.disposeDialogVisible = true
    },
    async submitDispose() {
      if (!this.currentAsset) return
      if (Number(this.disposeForm.dispose_amount) < 0) {
        return this.$message.warning('处置金额不能小于0')
      }
      try {
        const res = await disposeFixedAsset(this.currentAsset.id, this.disposeForm)
        if (res && (res.code === 200 || res.code === 20000)) {
          this.$message.success('处置成功')
          this.disposeDialogVisible = false
          this.load()
        }
      } catch (e) {
        this.$message.error('处置失败，请稍后重试')
      }
    },
    async showDepreciations(row) {
      this.currentAsset = row
      const res = await listDepreciations(row.id)
      if (res && (res.code === 200 || res.code === 20000)) {
        this.depRows = res.data || []
        this.depListDialogVisible = true
      }
    },
    async exportReport() {
      const month = this.query.month || this.currentMonth()
      try {
        const resp = await exportFixedAssetReport({ month })
        const file = resp.data instanceof Blob ? resp.data : new Blob([resp.data])
        const contentDisposition = resp.headers ? (resp.headers['content-disposition'] || resp.headers['Content-Disposition']) : ''
        const headerName = this.parseHeaderFileName(contentDisposition)
        const fileName = headerName || this.buildExportFileName(month)

        const url = window.URL.createObjectURL(file)
        const a = document.createElement('a')
        a.href = url
        a.download = fileName
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      } catch (e) {
        window.open(`/api-proxy/finance/fixed-assets/report/export?month=${month}`, '_blank')
      }
    }
  }
}
</script>

<style scoped>
.mb12 { margin-bottom: 12px; }
.mini { color: #909399; font-size: 12px; }
.val { font-size: 20px; font-weight: 600; margin-top: 4px; }
</style>
