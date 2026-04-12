<template>
  <div class="app-container">
    <el-card shadow="never">
      <div slot="header" class="card-header">
        <span>来料检测</span>
        <el-button type="primary" size="small" icon="el-icon-plus" @click="handleCreate">新增</el-button>
      </div>

      <el-form :inline="true" :model="query" class="search-form">
        <el-form-item label="质检单号">
          <el-input v-model="query.inspectionNo" placeholder="质检单号" clearable />
        </el-form-item>
        <el-form-item label="批次号">
          <el-input v-model="query.batchNo" placeholder="批次号" clearable />
        </el-form-item>
        <el-form-item label="卷码">
          <el-input v-model="query.rollCode" placeholder="母卷/复卷/分切卷" clearable />
        </el-form-item>
        <el-form-item label="结果">
          <el-select v-model="query.result" placeholder="全部" clearable>
            <el-option label="合格" value="pass" />
            <el-option label="不合格" value="fail" />
            <el-option label="待判定" value="pending" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="el-icon-search" @click="loadData">查询</el-button>
          <el-button icon="el-icon-refresh" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>

      <el-table v-loading="loading" :data="rows" border stripe>
        <el-table-column prop="inspectionNo" label="质检单号" width="160" />
        <el-table-column prop="batchNo" label="批次号" width="140" />
        <el-table-column prop="rollCode" label="卷码" width="140" />
        <el-table-column prop="materialCode" label="料号" width="120" />
        <el-table-column prop="sampleQty" label="抽样数" width="90" align="center" />
        <el-table-column prop="passQty" label="合格数" width="90" align="center" />
        <el-table-column prop="failQty" label="不合格数" width="100" align="center">
          <template slot-scope="{ row }">
            <span :style="{ color: row.failQty > 0 ? '#F56C6C' : '' }">{{ row.failQty }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="overallResult" label="检验结果" width="110" align="center">
          <template slot-scope="{ row }">
            <el-tag :type="resultTag(row.overallResult)" size="small">{{ resultText(row.overallResult) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="inspectionTime" label="检验时间" width="170" />
        <el-table-column label="操作" width="120" fixed="right">
          <template slot-scope="{ row }">
            <el-button type="text" size="small" @click="viewDetail(row)">详情</el-button>
            <el-button type="text" size="small" style="color: #F56C6C" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        style="margin-top: 12px; text-align: right"
        :current-page="query.pageNum"
        :page-size="query.pageSize"
        :page-sizes="[10, 20, 50]"
        :total="total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="sizeChange"
        @current-change="pageChange"
      />
    </el-card>

    <el-dialog title="来料检测详情" :visible.sync="detailVisible" width="600px">
      <pre v-if="current" class="detail-block">{{ current }}</pre>
      <span slot="footer" class="dialog-footer">
        <el-button @click="detailVisible = false">关闭</el-button>
      </span>
    </el-dialog>

    <el-dialog title="新增来料检测" :visible.sync="createVisible" width="980px" @close="resetForm">
      <el-form ref="form" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="批次号" prop="batchNo">
          <el-input v-model="form.batchNo" />
        </el-form-item>
        <el-form-item label="卷码" prop="rollCode">
          <el-input v-model="form.rollCode" />
        </el-form-item>
        <el-form-item label="料号" prop="materialCode">
          <el-select v-model="form.materialCode" filterable clearable placeholder="选择原材料料号" style="width:100%" @change="syncQcRuleByMaterialCode">
            <el-option v-for="item in rawMaterials" :key="item.materialCode" :label="`${item.materialCode} - ${item.materialName}`" :value="item.materialCode" />
          </el-select>
        </el-form-item>
        <el-form-item label="QC规则">
          <el-input v-model="qcRuleText" type="textarea" :rows="3" readonly placeholder="选择料号后自动加载原材料QC规则" />
        </el-form-item>
        <el-form-item label="实测参数">
          <div style="width: 100%;">
            <div v-if="measuredRows.length === 0" class="empty-qc-table">
              请先选择料号，系统会自动生成检测表格模板
            </div>
            <el-table v-else :data="measuredRows" border size="mini" style="width: 100%; margin-top: 4px;">
              <el-table-column prop="label" label="检测项目" width="140" />
              <el-table-column label="判定规则" min-width="220">
                <template slot-scope="{ row }">
                  <div class="qc-rule-text">
                    <span v-if="row.judgeMode === 'range' || row.min !== '' || row.max !== ''">范围：{{ row.min || '-' }} ~ {{ row.max || '-' }}</span>
                    <span v-else-if="row.judgeMode === 'min'">下限：{{ row.min || '-' }}</span>
                    <span v-else-if="row.judgeMode === 'max'">上限：{{ row.max || '-' }}</span>
                    <span v-else>标准值：{{ row.standardValue || '-' }}</span>
                    <span v-if="row.unit">（{{ row.unit }}）</span>
                  </div>
                </template>
              </el-table-column>
              <el-table-column label="实测值(5次)" width="280">
                <template slot-scope="{ row }">
                  <div class="qc-actual-inputs">
                    <el-input
                      v-for="idx in 5"
                      :key="`${row.key}-${idx}`"
                      v-model="row.actualValues[idx - 1]"
                      size="mini"
                      :placeholder="`${idx}`"
                      @input="syncMeasuredParamsFromRows"
                    />
                  </div>
                </template>
              </el-table-column>
              <el-table-column label="判定结果" width="120" align="center">
                <template slot-scope="{ row }">
                  <el-tag :type="row.resultType || 'info'" size="mini">{{ row.resultText || '待判定' }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="说明" min-width="160">
                <template slot-scope="{ row }">
                  <span class="qc-rule-text">{{ row.message || '—' }}</span>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-form-item>
        <el-form-item>
          <el-button type="success" icon="el-icon-magic-stick" @click="autoJudge">自动判定</el-button>
          <span style="margin-left: 12px; color: #606266">当前结果：<strong>{{ resultText(form.overallResult) }}</strong></span>
        </el-form-item>
        <el-form-item label="抽样数" prop="sampleQty">
          <el-input-number v-model="form.sampleQty" :min="0" />
        </el-form-item>
        <el-form-item label="合格数" prop="passQty">
          <el-input-number v-model="form.passQty" :min="0" />
        </el-form-item>
        <el-form-item label="不合格数" prop="failQty">
          <el-input-number v-model="form.failQty" :min="0" />
        </el-form-item>
        <el-form-item label="结果" prop="overallResult">
          <el-select v-model="form.overallResult" placeholder="请选择">
            <el-option label="合格" value="pass" />
            <el-option label="不合格" value="fail" />
            <el-option label="待判定" value="pending" />
          </el-select>
        </el-form-item>
        <el-form-item label="缺陷类型">
          <el-select v-model="form.defectType" placeholder="可选" filterable clearable>
            <el-option v-for="d in defectTypes" :key="d.id" :label="d.defectName" :value="d.defectName" />
          </el-select>
        </el-form-item>
        <el-form-item label="检验员" prop="inspectorName">
          <el-input v-model="form.inspectorName" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" />
        </el-form-item>
      </el-form>
      <span slot="footer" class="dialog-footer">
        <el-button @click="createVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">保存</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import { listIncomingInspections, deleteIncomingInspection, createIncomingInspection, getDefectTypeList } from '@/api/quality'
import { getRawMaterialList } from '@/api/tapeRawMaterial'
import { evaluateQcRules, summarizeQcRules, buildQcInspectionRows } from '@/utils/qcRule'

export default {
  name: 'IncomingInspectionPage',
  data() {
    return {
      loading: false,
      rows: [],
      total: 0,
      query: {
        pageNum: 1,
        pageSize: 10,
        inspectionNo: '',
        batchNo: '',
        rollCode: '',
        result: ''
      },
      detailVisible: false,
      current: null,
      createVisible: false,
      form: {
        batchNo: '',
        rollCode: '',
        materialCode: '',
        measuredParams: '{}',
        sampleQty: 0,
        passQty: 0,
        failQty: 0,
        overallResult: 'pending',
        inspectorName: '',
        defectType: '',
        remark: ''
      },
      rawMaterials: [],
      qcRuleText: '',
      measuredRows: [],
      defectTypes: [],
      rules: {
        batchNo: [{ required: true, message: '请输入批次号', trigger: 'blur' }],
        sampleQty: [{ required: true, message: '请输入抽样数', trigger: 'blur' }],
        overallResult: [{ required: true, message: '请选择结果', trigger: 'change' }]
      }
    }
  },
  mounted() {
    this.loadData()
    this.loadDefectTypes()
    this.loadRawMaterials()
  },
  methods: {
    async loadRawMaterials() {
      const res = await getRawMaterialList()
      if (res && (res.code === 200 || res.code === 20000)) {
        this.rawMaterials = res.data || []
      }
    },
    syncQcRuleByMaterialCode() {
      const material = (this.rawMaterials || []).find(item => item.materialCode === this.form.materialCode)
      if (!material) {
        this.qcRuleText = ''
        this.measuredRows = []
        this.syncMeasuredParamsFromRows()
        return
      }
      this.qcRuleText = (summarizeQcRules(material.performanceParams) || []).join('\n') || material.performanceParams || ''
      this.measuredRows = buildQcInspectionRows(material.performanceParams, this.form.measuredParams)
      this.syncMeasuredParamsFromRows()
    },
    autoJudge() {
      const material = (this.rawMaterials || []).find(item => item.materialCode === this.form.materialCode)
      if (!material || !material.performanceParams) {
        this.$message.warning('请先选择有QC规则的原材料料号')
        return
      }
      this.syncMeasuredParamsFromRows()
      let measured = {}
      try {
        measured = this.form.measuredParams ? JSON.parse(this.form.measuredParams) : {}
      } catch (e) {
        this.$message.warning('实测参数格式不正确')
        return
      }
      const summary = evaluateQcRules(material.performanceParams, measured)
      this.form.overallResult = summary.overallResult
      this.applyJudgeResultToRows(summary.results)
      this.fillSamplingStatsByMeasuredRows()
      if (summary.overallResult === 'fail') {
        this.form.defectType = summary.results.filter(item => item.status === 'fail').map(item => item.key).join(',') || 'QC判定不合格'
      } else if (summary.overallResult === 'pass') {
        this.form.defectType = ''
      }
      this.$message.success(`自动判定完成：${this.resultText(summary.overallResult)}（合格${summary.passCount} / 不合格${summary.failCount} / 待判定${summary.pendingCount}）`)
    },
    async loadDefectTypes() {
      const res = await getDefectTypeList()
      if (res && (res.code === 200 || res.code === 20000)) {
        this.defectTypes = res.data || []
      }
    },
    async loadData() {
      this.loading = true
      try {
        const res = await listIncomingInspections(this.query)
        if (res && (res.code === 200 || res.code === 20000)) {
          this.rows = res.data.records || res.data.list || []
          this.total = Number(res.data?.total || 0)
        } else {
          this.$message.error(res.message || '加载失败')
        }
      } catch (e) {
        this.$message.error('加载失败')
      } finally {
        this.loading = false
      }
    },
    resetQuery() {
      this.query = { pageNum: 1, pageSize: 10, inspectionNo: '', batchNo: '', rollCode: '', result: '' }
      this.loadData()
    },
    syncMeasuredParamsFromRows() {
      const payload = {}
      ;(this.measuredRows || []).forEach(row => {
        const values = Array.isArray(row.actualValues) ? row.actualValues.slice(0, 5) : []
        while (values.length < 5) values.push('')
        payload[row.key] = values
      })
      this.form.measuredParams = JSON.stringify(payload)
      this.fillSamplingStatsByMeasuredRows()
    },
    applyJudgeResultToRows(results) {
      const resultMap = {}
      ;(results || []).forEach(item => {
        resultMap[item.key] = item
      })
      this.measuredRows = (this.measuredRows || []).map(row => {
        const matched = resultMap[row.key] || {}
        return {
          ...row,
          label: row.label || row.key,
          resultType: matched.status === 'pass' ? 'success' : (matched.status === 'fail' ? 'danger' : 'info'),
          resultText: matched.status === 'pass' ? '合格' : (matched.status === 'fail' ? '不合格' : '待判定'),
          message: matched.message || ''
        }
      })
    },
    isEmptyMeasuredValue(val) {
      return val === null || val === undefined || String(val).trim() === ''
    },
    parseMeasuredNumber(val) {
      if (this.isEmptyMeasuredValue(val)) return null
      const text = String(val).trim()
      const matched = text.match(/-?\d+(?:\.\d+)?/)
      return matched ? Number(matched[0]) : null
    },
    judgeSingleValueByRow(row, val) {
      if (this.isEmptyMeasuredValue(val)) return 'pending'
      const mode = (row.judgeMode || '').trim()
      const min = this.parseMeasuredNumber(row.min)
      const max = this.parseMeasuredNumber(row.max)
      const std = this.parseMeasuredNumber(row.standardValue)
      const actual = this.parseMeasuredNumber(val)
      const hasRange = !this.isEmptyMeasuredValue(row.min) || !this.isEmptyMeasuredValue(row.max)

      if (actual === null) return 'pending'

      if (mode === 'range' || hasRange) {
        if (min !== null && actual < min) return 'fail'
        if (max !== null && actual > max) return 'fail'
        return 'pass'
      }
      if (mode === 'min') {
        if (min === null) return 'pending'
        return actual >= min ? 'pass' : 'fail'
      }
      if (mode === 'max') {
        if (max === null) return 'pending'
        return actual <= max ? 'pass' : 'fail'
      }
      if (mode === 'value' || !this.isEmptyMeasuredValue(row.standardValue)) {
        if (std === null) return 'pending'
        return actual === std ? 'pass' : 'fail'
      }
      return 'pending'
    },
    fillSamplingStatsByMeasuredRows() {
      const rows = this.measuredRows || []
      if (rows.length === 0) {
        this.form.sampleQty = 0
        this.form.passQty = 0
        this.form.failQty = 0
        this.form.overallResult = 'pending'
        return
      }

      const sampleStatuses = []
      for (let i = 0; i < 5; i++) {
        let hasPending = false
        let hasFail = false
        for (const row of rows) {
          const values = Array.isArray(row.actualValues) ? row.actualValues : []
          const status = this.judgeSingleValueByRow(row, values[i])
          if (status === 'pending') {
            hasPending = true
            break
          }
          if (status === 'fail') {
            hasFail = true
          }
        }
        if (hasPending) {
          sampleStatuses.push('pending')
        } else {
          sampleStatuses.push(hasFail ? 'fail' : 'pass')
        }
      }

      const sampleQty = sampleStatuses.filter(s => s !== 'pending').length
      const passQty = sampleStatuses.filter(s => s === 'pass').length
      const failQty = sampleStatuses.filter(s => s === 'fail').length

      this.form.sampleQty = sampleQty
      this.form.passQty = passQty
      this.form.failQty = failQty

      if (sampleQty === 0) {
        this.form.overallResult = 'pending'
      } else if (failQty > 0) {
        this.form.overallResult = 'fail'
      } else if (passQty === sampleQty) {
        this.form.overallResult = 'pass'
      } else {
        this.form.overallResult = 'pending'
      }
    },
    sizeChange(size) {
      this.query.pageSize = size
      this.loadData()
    },
    pageChange(page) {
      this.query.pageNum = page
      this.loadData()
    },
    resultTag(val) {
      const map = { pass: 'success', fail: 'danger', pending: 'warning' }
      return map[val] || 'info'
    },
    resultText(val) {
      const map = { pass: '合格', fail: '不合格', pending: '待判定' }
      return map[val] || val
    },
    viewDetail(row) {
      this.current = row
      this.detailVisible = true
    },
    handleCreate() {
      this.createVisible = true
      this.qcRuleText = ''
      this.measuredRows = []
    },
    submitForm() {
      this.$refs.form.validate(async valid => {
        if (!valid) return
        this.syncMeasuredParamsFromRows()
        const material = (this.rawMaterials || []).find(item => item.materialCode === this.form.materialCode)
        if (material && material.performanceParams) {
          const summary = evaluateQcRules(material.performanceParams, this.form.measuredParams)
          this.form.overallResult = summary.overallResult
          this.applyJudgeResultToRows(summary.results)
          if (summary.pendingCount > 0) {
            this.$message.error('每个检测项目必须录入5个有效实测值')
            return
          }
          if (summary.failCount > 0) {
            this.$message.error('存在超限检测值，不能保存')
            return
          }
        }
        const res = await createIncomingInspection(this.form)
        if (res && (res.code === 200 || res.code === 20000)) {
          this.$message.success('保存成功')
          this.createVisible = false
          this.loadData()
        } else {
          this.$message.error(res.message || '保存失败')
        }
      })
    },
    resetForm() {
      this.$nextTick(() => {
        this.$refs.form && this.$refs.form.clearValidate()
      })
      this.form = { batchNo: '', rollCode: '', materialCode: '', sampleQty: 0, passQty: 0, failQty: 0, overallResult: 'pending', inspectorName: '', defectType: '', remark: '' }
      this.form.measuredParams = '{}'
      this.qcRuleText = ''
      this.measuredRows = []
    },
    async handleDelete(row) {
      this.$confirm('确认删除该记录？', '提示', { type: 'warning' }).then(async() => {
        const res = await deleteIncomingInspection(row.id)
        if (res && (res.code === 200 || res.code === 20000)) {
          this.$message.success('删除成功')
          this.loadData()
        } else {
          this.$message.error(res.message || '删除失败')
        }
      }).catch(() => {})
    }
  }
}
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.detail-block {
  background: #f6f8fa;
  padding: 12px;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  font-size: 12px;
  white-space: pre-wrap;
}

.search-form {
  margin-bottom: 12px;
}

.empty-qc-table {
  padding: 12px;
  border: 1px dashed #dcdfe6;
  border-radius: 4px;
  color: #909399;
  text-align: center;
  background: #fafafa;
}

.qc-rule-text {
  color: #606266;
  line-height: 1.4;
  white-space: normal;
  word-break: break-all;
}

.qc-actual-inputs {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 6px;
}
</style>
