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
        <el-table-column label="操作" width="220" fixed="right">
          <template slot-scope="{ row }">
            <el-button type="text" size="small" @click="viewDetail(row)">详情</el-button>
            <el-button type="text" size="small" @click="openTestSheet(row)">测试表</el-button>
            <el-button type="text" size="small" @click="printTestReport(row)">打印报告</el-button>
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

    <el-dialog title="来料检测详情" :visible.sync="detailVisible" width="1100px">
      <div v-if="detailRecord">
        <el-descriptions :column="4" border size="small" class="sheet-header-detail">
          <el-descriptions-item label="质检单号">{{ detailRecord.inspectionNo || '-' }}</el-descriptions-item>
          <el-descriptions-item label="批次号">{{ detailRecord.batchNo || '-' }}</el-descriptions-item>
          <el-descriptions-item label="卷码">{{ detailRecord.rollCode || '-' }}</el-descriptions-item>
          <el-descriptions-item label="料号">{{ detailRecord.materialCode || '-' }}</el-descriptions-item>
          <el-descriptions-item label="物料名称">{{ detailRecord.materialName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="规格">{{ detailRecord.specification || '-' }}</el-descriptions-item>
          <el-descriptions-item label="来料数量">{{ detailRecord.quantity || 0 }}</el-descriptions-item>
          <el-descriptions-item label="检验员">{{ detailRecord.inspectorName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="抽样数">{{ detailRecord.sampleQty || 0 }}</el-descriptions-item>
          <el-descriptions-item label="合格数">{{ detailRecord.passQty || 0 }}</el-descriptions-item>
          <el-descriptions-item label="不合格数">{{ detailRecord.failQty || 0 }}</el-descriptions-item>
          <el-descriptions-item label="检验结果">
            <el-tag :type="resultTag(detailRecord.overallResult)" size="mini">{{ resultText(detailRecord.overallResult) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="检验时间">{{ detailRecord.inspectionTime || '-' }}</el-descriptions-item>
          <el-descriptions-item label="缺陷类型">{{ detailRecord.defectType || '-' }}</el-descriptions-item>
          <el-descriptions-item label="备注" :span="2">{{ detailRecord.remark || '-' }}</el-descriptions-item>
        </el-descriptions>

        <div style="margin: 12px 0 8px; font-weight: 600; color: #303133;">检测明细</div>
        <el-table :data="detailSheetRows" border stripe size="mini" max-height="420" empty-text="该记录未保存检测明细">
          <el-table-column type="index" label="序号" width="70" align="center" />
          <el-table-column prop="label" label="测试项目" width="150" />
          <el-table-column prop="unit" label="单位" width="90" align="center" />
          <el-table-column label="标准值" min-width="210">
            <template slot-scope="{ row }">
              <span class="qc-rule-text">{{ row.ruleText }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="actual1" label="实测1" width="95" align="center" />
          <el-table-column prop="actual2" label="实测2" width="95" align="center" />
          <el-table-column prop="actual3" label="实测3" width="95" align="center" />
          <el-table-column prop="actual4" label="实测4" width="95" align="center" />
          <el-table-column prop="actual5" label="实测5" width="95" align="center" />
          <el-table-column label="判定" width="100" align="center">
            <template slot-scope="{ row }">
              <el-tag :type="resultTag(row.status)" size="mini">{{ resultText(row.status) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="message" label="说明" min-width="180" />
        </el-table>
        <div class="sheet-summary" style="margin-top: 8px;">
          合格项：{{ detailSheetSummary.passCount }}，不合格项：{{ detailSheetSummary.failCount }}，待判定：{{ detailSheetSummary.pendingCount }}，总项数：{{ detailSheetSummary.totalCount }}
        </div>
      </div>
      <span slot="footer" class="dialog-footer">
        <el-button @click="detailVisible = false">关闭</el-button>
      </span>
    </el-dialog>

    <el-dialog title="新增来料检测" :visible.sync="createVisible" width="980px" @close="resetForm">
      <el-form ref="form" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="供应商代码" prop="supplierCode">
          <el-input v-model="form.supplierCode" placeholder="请输入供应商代码" />
        </el-form-item>
        <el-form-item label="供应商名称" prop="supplierName">
          <el-input v-model="form.supplierName" placeholder="请输入供应商名称" />
        </el-form-item>
        <el-form-item label="批次号" prop="batchNo">
          <el-input v-model="form.batchNo" />
        </el-form-item>
        <el-form-item label="卷码" prop="rollCode">
          <el-input v-model="form.rollCode" />
        </el-form-item>
        <el-form-item label="料号" prop="materialCode">
          <el-select
            v-model="form.materialCode"
            filterable
            remote
            clearable
            :remote-method="searchMaterialOptions"
            placeholder="输入料号/名称模糊搜索"
            style="width:100%"
            @change="handleMaterialCodeChange"
          >
            <el-option v-for="item in materialOptions" :key="item.materialCode" :label="`${item.materialCode} - ${item.materialName || '-'}`" :value="item.materialCode" />
          </el-select>
        </el-form-item>
        <el-form-item label="来料批次" prop="batchNo">
          <el-select
            v-model="form.batchNo"
            filterable
            clearable
            style="width:100%"
            placeholder="请先选择料号后，从库存中选择批次"
            @change="onBatchChange"
          >
            <el-option
              v-for="item in batchOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="物料名称" prop="materialName">
          <el-input v-model="form.materialName" readonly placeholder="选择料号/批次后自动带出" />
        </el-form-item>
        <el-form-item label="来料规格" prop="materialSpec">
          <el-input v-model="form.materialSpec" readonly placeholder="选择批次后自动带出" />
        </el-form-item>
        <el-form-item label="来料数量" prop="quantity">
          <el-input-number v-model="form.quantity" :min="0" :precision="3" style="width: 240px" />
        </el-form-item>
        <el-form-item label="QC规则">
          <el-input v-model="qcRuleText" type="textarea" :rows="3" readonly placeholder="选择料号后自动加载原材料QC规则" />
        </el-form-item>
        <el-form-item label="检测明细表">
          <div class="muted-tip">测试项目来源：原材料表（仅显示非空检测项）</div>
          <div style="width: 100%;">
            <div v-if="measuredRows.length === 0" class="empty-qc-table">
              请先选择料号，系统会自动生成检测表格模板
            </div>
            <el-table v-else :data="measuredRows" border size="mini" style="width: 100%; margin-top: 4px;">
              <el-table-column type="index" label="序号" width="65" align="center" />
              <el-table-column prop="label" label="测试项目" width="160" />
              <el-table-column prop="unit" label="单位" width="90" align="center">
                <template slot-scope="{ row }">
                  <span>{{ row.unit || '-' }}</span>
                </template>
              </el-table-column>
              <el-table-column label="标准值" min-width="220">
                <template slot-scope="{ row }">
                  <div class="qc-rule-text">{{ buildRuleText(row) }}</div>
                </template>
              </el-table-column>
              <el-table-column label="检测值1~5" width="320">
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

    <el-dialog title="胶带测试记录表" :visible.sync="testSheetVisible" width="1100px">
      <div v-if="sheetRecord" class="sheet-header">
        <div>质检单号：{{ sheetRecord.inspectionNo || '-' }}</div>
        <div>批次号：{{ sheetRecord.batchNo || '-' }}</div>
        <div>卷码：{{ sheetRecord.rollCode || '-' }}</div>
        <div>料号：{{ sheetRecord.materialCode || '-' }}</div>
        <div>物料名称：{{ sheetRecord.materialName || '-' }}</div>
        <div>规格：{{ sheetRecord.specification || '-' }}</div>
        <div>检验员：{{ sheetRecord.inspectorName || '-' }}</div>
        <div>检验时间：{{ sheetRecord.inspectionTime || '-' }}</div>
      </div>
      <el-table :data="sheetRows" border stripe size="mini" max-height="420">
        <el-table-column prop="label" label="检测项目" width="150" />
        <el-table-column label="判定规则" min-width="210">
          <template slot-scope="{ row }">
            <span class="qc-rule-text">{{ row.ruleText }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="actual1" label="实测1" width="95" align="center" />
        <el-table-column prop="actual2" label="实测2" width="95" align="center" />
        <el-table-column prop="actual3" label="实测3" width="95" align="center" />
        <el-table-column prop="actual4" label="实测4" width="95" align="center" />
        <el-table-column prop="actual5" label="实测5" width="95" align="center" />
        <el-table-column label="判定" width="100" align="center">
          <template slot-scope="{ row }">
            <el-tag :type="resultTag(row.status)" size="mini">{{ resultText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="message" label="说明" min-width="180" />
      </el-table>
      <div class="sheet-summary">
        合格项：{{ sheetSummary.passCount }}，不合格项：{{ sheetSummary.failCount }}，待判定：{{ sheetSummary.pendingCount }}，总项数：{{ sheetSummary.totalCount }}
      </div>
      <span slot="footer" class="dialog-footer">
        <el-button @click="testSheetVisible = false">关闭</el-button>
        <el-button type="primary" icon="el-icon-printer" @click="printCurrentSheet">打印报告</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import { listIncomingInspections, deleteIncomingInspection, createIncomingInspection, getDefectTypeList } from '@/api/quality'
import { getRawMaterialList } from '@/api/tapeRawMaterial'
import { getAvailableFilmDetailsPage, getAvailableChemicalDetailsPage } from '@/api/rawMaterialStock'
import { evaluateQcRules, summarizeQcRules, buildQcInspectionRows } from '@/utils/qcRule'
import request from '@/utils/request'

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
      detailRecord: null,
      detailSheetRows: [],
      detailSheetSummary: { passCount: 0, failCount: 0, pendingCount: 0, totalCount: 0 },
      createVisible: false,
      testSheetVisible: false,
      sheetRecord: null,
      sheetRows: [],
      sheetSummary: { passCount: 0, failCount: 0, pendingCount: 0, totalCount: 0 },
      form: {
        supplierCode: '',
        supplierName: '',
        batchNo: '',
        rollCode: '',
        materialCode: '',
        materialName: '',
        materialSpec: '',
        quantity: 0,
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
      materialOptions: [],
      qcRuleText: '',
      measuredRows: [],
      batchOptions: [],
      companyInfo: {
        companyName: '东莞市方恩电子材料科技有限公司',
        address: '广东省东莞市桥头镇东新路13号2号楼102室',
        phone: '0769-82551118',
        fax: '0769-82551160',
        website: 'www.finechemfr.com'
      },
      printLogoUrl: '/logo/finechem-logo.png',
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
    this.fetchCompanyInfo()
  },
  methods: {
    async fetchCompanyInfo() {
      try {
        const res = await request({ url: '/config/company', method: 'get' })
        if (res && (res.code === 200 || res.code === 20000) && res.data) {
          this.companyInfo = Object.assign({}, this.companyInfo, res.data)
          if (res.data.logoUrl) {
            this.printLogoUrl = res.data.logoUrl
          }
        }
      } catch (e) {
        console.error('加载公司信息失败', e)
      }
    },
    async loadRawMaterials() {
      const res = await getRawMaterialList()
      if (res && (res.code === 200 || res.code === 20000)) {
        this.rawMaterials = res.data || []
        this.materialOptions = this.rawMaterials.slice(0, 200)
      }
    },
    searchMaterialOptions(keyword) {
      const q = String(keyword || '').trim().toLowerCase()
      if (!q) {
        this.materialOptions = (this.rawMaterials || []).slice(0, 200)
        return
      }
      this.materialOptions = (this.rawMaterials || []).filter(item => {
        const code = String(item.materialCode || '').toLowerCase()
        const name = String(item.materialName || '').toLowerCase()
        return code.includes(q) || name.includes(q)
      }).slice(0, 200)
    },
    async handleMaterialCodeChange() {
      const material = (this.rawMaterials || []).find(item => item.materialCode === this.form.materialCode)
      if (!material) {
        this.qcRuleText = ''
        this.measuredRows = []
        this.batchOptions = []
        this.form.batchNo = ''
        this.form.rollCode = ''
        this.form.materialSpec = ''
        this.form.quantity = 0
        this.form.materialName = ''
        this.syncMeasuredParamsFromRows()
        return
      }
      this.form.materialName = material.materialName || this.form.materialName
      this.qcRuleText = (summarizeQcRules(material.performanceParams) || []).join('\n') || material.performanceParams || ''
      this.measuredRows = this.filterVisibleRows(buildQcInspectionRows(material.performanceParams, this.form.measuredParams))
      this.syncMeasuredParamsFromRows()
      await this.loadBatchOptionsByMaterial(material)
    },
    filterVisibleRows(rows) {
      return (rows || []).filter(row => {
        if (!row) return false
        const hasRule = String(row.standardValue || '').trim() !== '' || String(row.min || '').trim() !== '' || String(row.max || '').trim() !== ''
        const hasLabel = String(row.label || '').trim() !== ''
        return hasLabel && hasRule
      })
    },
    async loadBatchOptionsByMaterial(material) {
      const code = String(material && material.materialCode ? material.materialCode : '').trim()
      if (!code) {
        this.batchOptions = []
        return
      }

      const requests = []
      const category = String(material.materialCategory || '').trim().toLowerCase()
      if (category === 'film') {
        requests.push(getAvailableFilmDetailsPage({ materialCode: code, current: 1, size: 200 }))
      } else if (category === 'chemical') {
        requests.push(getAvailableChemicalDetailsPage({ materialCode: code, current: 1, size: 200 }))
      } else {
        requests.push(getAvailableFilmDetailsPage({ materialCode: code, current: 1, size: 200 }))
        requests.push(getAvailableChemicalDetailsPage({ materialCode: code, current: 1, size: 200 }))
      }

      const merged = []
      const addRows = (records, sourceType) => {
        ;(records || []).forEach(item => {
          const batchNo = String(item.batchNo || '').trim()
          if (!batchNo) return
          merged.push({ ...item, sourceType })
        })
      }

      for (const req of requests) {
        try {
          const res = await req
          if (!(res && (res.code === 200 || res.code === 20000))) continue
          const data = res.data || {}
          const records = data.records || data.list || []
          const sourceType = req === requests[0] && category === 'chemical' ? 'chemical' : (req === requests[0] && category === 'film' ? 'film' : undefined)
          if (sourceType) {
            addRows(records, sourceType)
          } else {
            const guessedType = records.length && records[0] && records[0].rollNo !== undefined ? 'film' : 'chemical'
            addRows(records, guessedType)
          }
        } catch (e) {
          // ignore
        }
      }

      const batchMap = {}
      merged.forEach(item => {
        const key = item.batchNo
        if (!batchMap[key]) {
          batchMap[key] = {
            value: key,
            sourceType: item.sourceType,
            records: [],
            totalQty: 0,
            specText: ''
          }
        }
        batchMap[key].records.push(item)
        if (item.sourceType === 'film') {
          const qty = Number(item.area || 0)
          if (Number.isFinite(qty)) batchMap[key].totalQty += qty
          const spec = `${item.thickness || '-'}μm×${item.width || '-'}mm×${item.length || '-'}m`
          if (!batchMap[key].specText) batchMap[key].specText = spec
        } else {
          const qty = Number(item.weight || 0)
          if (Number.isFinite(qty)) batchMap[key].totalQty += qty
          const spec = `${item.unit || 'kg'} / ${item.stdQtyPerPack || '-'}每包装`
          if (!batchMap[key].specText) batchMap[key].specText = spec
        }
      })

      this.batchOptions = Object.values(batchMap).map(item => {
        const qtyText = `${item.totalQty.toFixed(3)}${item.sourceType === 'film' ? '㎡' : 'kg'}`
        return {
          ...item,
          label: `${item.value} / ${item.specText || '-'} / 可用:${qtyText}`
        }
      })
      if (!this.batchOptions.length) {
        this.form.batchNo = ''
        this.form.rollCode = ''
        this.form.materialSpec = ''
        this.form.quantity = 0
      }
    },
    onBatchChange(batchNo) {
      const option = (this.batchOptions || []).find(x => x.value === batchNo)
      if (!option) {
        this.form.rollCode = ''
        this.form.materialSpec = ''
        return
      }
      const records = option.records || []
      const rollCodes = records.map(r => r.rollNo || r.containerNo).filter(Boolean)
      this.form.rollCode = rollCodes.slice(0, 5).join(',')
      this.form.materialSpec = option.specText || this.form.materialSpec
      this.form.quantity = Number(option.totalQty || 0)
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
      this.detailRecord = row
      const data = this.composeSheetData(row)
      this.detailSheetRows = data ? data.rows : []
      this.detailSheetSummary = data ? data.summary : { passCount: 0, failCount: 0, pendingCount: 0, totalCount: 0 }
      this.detailVisible = true
    },
    parseJsonSafe(value) {
      if (!value) return null
      if (typeof value === 'object') return value
      try {
        return JSON.parse(value)
      } catch (e) {
        return null
      }
    },
    buildRuleText(row) {
      if (!row) return '-'
      if (row.judgeMode === 'range' || row.min !== '' || row.max !== '') {
        return `范围：${row.min || '-'} ~ ${row.max || '-'}${row.unit ? ` (${row.unit})` : ''}`
      }
      if (row.judgeMode === 'min') {
        return `下限：${row.min || '-'}${row.unit ? ` (${row.unit})` : ''}`
      }
      if (row.judgeMode === 'max') {
        return `上限：${row.max || '-'}${row.unit ? ` (${row.unit})` : ''}`
      }
      return `标准值：${row.standardValue || '-'}${row.unit ? ` (${row.unit})` : ''}`
    },
    composeSheetData(record) {
      const snapshot = this.parseJsonSafe(record.processSnapshot) || {}
      const ruleJson = snapshot.ruleJson || snapshot.performanceParams || ''
      const measuredParams = snapshot.measuredParams || '{}'
      if (!ruleJson) return null
      const summary = evaluateQcRules(ruleJson, measuredParams)
      const rows = buildQcInspectionRows(ruleJson, measuredParams).map(row => {
        const matched = (summary.results || []).find(item => item.key === row.key) || {}
        const values = Array.isArray(row.actualValues) ? row.actualValues : []
        return {
          key: row.key,
          label: row.label || row.key,
          ruleText: this.buildRuleText(row),
          actual1: values[0] === undefined || values[0] === '' ? '-' : values[0],
          actual2: values[1] === undefined || values[1] === '' ? '-' : values[1],
          actual3: values[2] === undefined || values[2] === '' ? '-' : values[2],
          actual4: values[3] === undefined || values[3] === '' ? '-' : values[3],
          actual5: values[4] === undefined || values[4] === '' ? '-' : values[4],
          status: matched.status || 'pending',
          message: matched.message || ''
        }
      })
      return {
        rows,
        summary: {
          passCount: summary.passCount || 0,
          failCount: summary.failCount || 0,
          pendingCount: summary.pendingCount || 0,
          totalCount: summary.totalCount || rows.length
        }
      }
    },
    openTestSheet(row) {
      const data = this.composeSheetData(row)
      if (!data) {
        this.$message.warning('该记录未保存测试明细，无法生成测试表')
        return
      }
      this.sheetRecord = row
      this.sheetRows = data.rows
      this.sheetSummary = data.summary
      this.testSheetVisible = true
    },
    printTestReport(row) {
      const data = this.composeSheetData(row)
      if (!data) {
        this.$message.warning('该记录未保存测试明细，无法打印报告')
        return
      }
      this.doPrintReport(row, data)
    },
    printCurrentSheet() {
      if (!this.sheetRecord) return
      this.doPrintReport(this.sheetRecord, { rows: this.sheetRows, summary: this.sheetSummary })
    },
    escapeHtml(text) {
      return String(text === undefined || text === null ? '' : text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
    },
    doPrintReport(record, data) {
      const rows = data.rows || []
      const rowHtml = rows.map((item, idx) => {
        const values = [item.actual1, item.actual2, item.actual3, item.actual4, item.actual5]
        const allEmpty = values.every(v => v === '-' || v === '' || v === null || v === undefined)
        const valueCells = allEmpty
          ? '<td colspan="5">/</td>'
          : values.map(v => `<td>${this.escapeHtml(v === undefined || v === null || v === '' ? '-' : v)}</td>`).join('')
        return `
          <tr>
            <td>${idx + 1}</td>
            <td>${this.escapeHtml(item.label)}</td>
            <td>${this.escapeHtml(item.ruleText || '-')}</td>
            ${valueCells}
            <td>${this.escapeHtml(this.resultText(item.status))}</td>
            <td>${this.escapeHtml(item.message || '-')}</td>
          </tr>
        `
      }).join('')

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>来料检测报告-${this.escapeHtml(record.inspectionNo || '')}</title>
            <style>
              @page { size: A4 portrait; margin: 10mm; }
              body { font-family: "SimSun", "Microsoft YaHei", Arial, sans-serif; color: #111; font-size: 12px; }
              .report { width: 100%; }
              .top { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid #222; padding-bottom: 6px; }
              .brand { min-height: 36px; display: flex; align-items: center; }
              .company { text-align: right; font-size: 12px; line-height: 1.5; }
              .company-name { font-size: 16pt; font-weight: 700; line-height: 1.3; }
              .title-wrap { text-align: center; margin: 12px 0 8px; position: relative; }
              .title { font-size: 28px; font-weight: 700; letter-spacing: 10px; }
              .form-no { position: absolute; right: 0; top: 8px; font-size: 22px; font-weight: 700; }
              .sec-title { margin: 10px 0 4px; font-weight: 700; font-size: 15px; }
              table { width: 100%; border-collapse: collapse; table-layout: fixed; }
              th, td { border: 1px solid #222; padding: 6px 5px; text-align: center; vertical-align: middle; word-break: break-all; }
              .meta-table td { font-size: 13px; }
              .label { background: #f8f8f8; font-weight: 700; width: 12%; }
              .tiny { font-size: 11px; }
              .summary { margin-top: 10px; font-size: 13px; line-height: 1.8; }
              .note { margin-top: 8px; line-height: 1.7; font-size: 12px; }
              .sign { margin-top: 16px; display: flex; justify-content: space-between; font-size: 16px; font-weight: 700; }
            </style>
          </head>
          <body>
            <div class="report">
              <div class="top">
                <div class="brand">${this.printLogoUrl ? `<img src="${this.escapeHtml(this.printLogoUrl)}" alt="logo" style="height:46px;max-width:264px;object-fit:contain;" />` : 'FINECHEM'}</div>
                <div class="company">
                  <div class="company-name">${this.escapeHtml(this.companyInfo.companyName || '')}</div>
                  <div>地址：${this.escapeHtml(this.companyInfo.address || '')}</div>
                  <div>电话：${this.escapeHtml(this.companyInfo.phone || '')}　传真：${this.escapeHtml(this.companyInfo.fax || '')}</div>
                  <div>网址：${this.escapeHtml(this.companyInfo.website || '')}</div>
                </div>
              </div>

              <div class="title-wrap">
                <div class="title">来料检测报告</div>
                <div class="form-no">FE-FR-GC-01</div>
              </div>

              <div class="sec-title">A. 产品与检测条件</div>
              <table class="meta-table">
                <tr>
                  <td class="label">产品名称</td>
                  <td>${this.escapeHtml(record.materialName || '-')}</td>
                  <td class="label">产品料号</td>
                  <td>${this.escapeHtml(record.materialCode || '-')}</td>
                  <td class="label">来料规格</td>
                  <td>${this.escapeHtml(record.specification || '-')}</td>
                </tr>
                <tr>
                  <td class="label">来料数量</td>
                  <td>${this.escapeHtml(record.quantity || '-')}</td>
                  <td class="label">检测环境</td>
                  <td>23±5℃，50±5%</td>
                  <td class="label">批次号</td>
                  <td>${this.escapeHtml(record.batchNo || '-')}</td>
                </tr>
                <tr>
                  <td class="label">抽样数</td>
                  <td>${this.escapeHtml(record.sampleQty || '-')}</td>
                  <td class="label">卷码</td>
                  <td>${this.escapeHtml(record.rollCode || '-')}</td>
                  <td class="label">质检单号</td>
                  <td>${this.escapeHtml(record.inspectionNo || '-')}</td>
                </tr>
              </table>

              <div class="sec-title">B. 测试项目与测试标准</div>
              <table>
                <thead>
                  <tr>
                    <th style="width:42px;">序号</th>
                    <th style="width:100px;">项目</th>
                    <th>标准值</th>
                    <th style="width:50px;">测试1</th>
                    <th style="width:50px;">测试2</th>
                    <th style="width:50px;">测试3</th>
                    <th style="width:50px;">测试4</th>
                    <th style="width:50px;">测试5</th>
                    <th style="width:56px;">判定</th>
                    <th style="width:98px;">方法参考</th>
                  </tr>
                </thead>
                <tbody>${rowHtml}</tbody>
              </table>

              <div class="summary">
                检验结论：${this.escapeHtml(this.resultText(record.overallResult || 'pending'))}；
                合格项：${data.summary.passCount || 0}，不合格项：${data.summary.failCount || 0}，待判定：${data.summary.pendingCount || 0}，总项数：${data.summary.totalCount || 0}
              </div>

              <div class="note tiny">
                备注：以上结果仅对本批次送检样品负责。检验员：${this.escapeHtml(record.inspectorName || '-')}；检验时间：${this.escapeHtml(record.inspectionTime || '-')}
              </div>

              <div class="sign">
                <span>检测员：</span>
                <span>审核：</span>
                <span>日期：</span>
              </div>
            </div>
          </body>
        </html>
      `
      const iframe = document.createElement('iframe')
      iframe.setAttribute('style', 'position:absolute;width:0;height:0;left:-10000px;top:-10000px;visibility:hidden;')
      document.body.appendChild(iframe)
      const doc = iframe.contentWindow && iframe.contentWindow.document
      if (!doc) {
        document.body.removeChild(iframe)
        this.$message.error('无法创建打印上下文，请稍后重试')
        return
      }
      doc.open()
      doc.write(html)
      doc.close()

      setTimeout(() => {
        try {
          iframe.contentWindow.focus()
          iframe.contentWindow.print()
        } finally {
          setTimeout(() => {
            if (iframe && iframe.parentNode) {
              iframe.parentNode.removeChild(iframe)
            }
          }, 500)
        }
      }, 240)
    },
    buildProcessSnapshot(material, summary) {
      return JSON.stringify({
        materialCode: this.form.materialCode || '',
        materialName: this.form.materialName || '',
        specification: this.form.materialSpec || '',
        qcRuleText: this.qcRuleText || '',
        ruleJson: material && material.performanceParams ? material.performanceParams : '',
        measuredParams: this.form.measuredParams || '{}',
        measuredRows: this.measuredRows || [],
        summary: summary || null,
        generatedAt: new Date().toISOString()
      })
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
        const payload = {
          ...this.form,
          specification: this.form.materialSpec || '',
          processSnapshot: this.buildProcessSnapshot(material, material && material.performanceParams ? evaluateQcRules(material.performanceParams, this.form.measuredParams) : null)
        }
        const res = await createIncomingInspection(payload)
        if (res && (res.code === 200 || res.code === 20000)) {
          this.$message.success('保存成功')
          const savedRecord = res.data || payload
          const data = this.composeSheetData(savedRecord)
          if (data) {
            this.$confirm('保存成功，是否立即打印检测报告？', '提示', { type: 'success' })
              .then(() => {
                this.doPrintReport(savedRecord, data)
              })
              .catch(() => {})
          }
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
      this.form = {
        supplierCode: '',
        supplierName: '',
        batchNo: '',
        rollCode: '',
        materialCode: '',
        materialName: '',
        materialSpec: '',
        quantity: 0,
        sampleQty: 0,
        passQty: 0,
        failQty: 0,
        overallResult: 'pending',
        inspectorName: '',
        defectType: '',
        remark: ''
      }
      this.form.measuredParams = '{}'
      this.qcRuleText = ''
      this.measuredRows = []
      this.batchOptions = []
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

.muted-tip {
  margin-bottom: 6px;
  color: #909399;
  font-size: 12px;
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

.sheet-header {
  margin-bottom: 10px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  font-size: 12px;
  color: #606266;
}

.sheet-summary {
  margin-top: 10px;
  font-size: 13px;
  color: #303133;
}
</style>
