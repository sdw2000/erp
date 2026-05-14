<template>
  <div class="app-container">
    <el-card shadow="never">
      <div slot="header" class="card-header">
        <span>出货检测</span>
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
        <el-table-column label="客户代码" width="120">
          <template slot-scope="{ row }">
            <span>{{ getRowCustomerCode(row) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="订单号" width="150">
          <template slot-scope="{ row }">
            <span>{{ getRowSourceOrderNo(row) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="materialCode" label="料号" width="120" />
        <el-table-column label="规格" min-width="150">
          <template slot-scope="{ row }">
            <span>{{ getRowSpecification(row) }}</span>
          </template>
        </el-table-column>
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
        <el-table-column label="操作" width="290" fixed="right">
          <template slot-scope="{ row }">
            <el-button type="text" size="small" @click="viewDetail(row)">详情</el-button>
            <el-button type="text" size="small" @click="openTestSheet(row)">修改</el-button>
            <el-button type="text" size="small" @click="previewTestReport(row)">预览打印</el-button>
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

    <el-dialog title="出货检测详情" :visible.sync="detailVisible" width="1100px">
      <div v-if="detailRecord">
        <el-descriptions :column="4" border size="small" class="sheet-header-detail">
          <el-descriptions-item label="质检单号">{{ detailRecord.inspectionNo || '-' }}</el-descriptions-item>
          <el-descriptions-item label="订单号">{{ detailRecord.sourceOrderNo || '-' }}</el-descriptions-item>
          <el-descriptions-item label="批次号">{{ detailRecord.batchNo || '-' }}</el-descriptions-item>
          <el-descriptions-item label="卷码">{{ detailRecord.rollCode || '-' }}</el-descriptions-item>
          <el-descriptions-item label="料号">{{ getSheetDisplayMaterialCode(detailRecord) }}</el-descriptions-item>
          <el-descriptions-item label="物料名称">{{ getSheetDisplayMaterialName(detailRecord) }}</el-descriptions-item>
          <el-descriptions-item label="规格">{{ detailRecord.specification || '-' }}</el-descriptions-item>
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

    <el-dialog title="新增出货检测" :visible.sync="createVisible" width="980px" @close="resetForm">
      <el-form ref="form" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="订单号" prop="sourceOrderNo">
          <el-select
            v-model="form.sourceOrderNo"
            filterable
            remote
            clearable
            style="width:100%"
            :remote-method="searchOrderOptions"
            :loading="orderSearchLoading"
            placeholder="请输入订单号搜索"
            @change="handleOrderChange"
          >
            <el-option v-for="item in orderOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="明细料号" prop="materialCode">
          <el-select
            v-model="form.materialCode"
            filterable
            clearable
            placeholder="请选择订单明细料号"
            style="width:100%"
            @change="onOrderMaterialChange"
          >
            <el-option
              v-for="item in orderMaterialOptions"
              :key="item.materialCode"
              :label="`${item.materialCode} - ${item.materialName || '-'}`"
              :value="item.materialCode"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="规格/数量" prop="selectedOrderItemId">
          <el-select
            v-model="selectedOrderItemId"
            filterable
            clearable
            placeholder="请先选择明细料号"
            style="width:100%"
            @change="onOrderSpecChange"
          >
            <el-option
              v-for="item in orderSpecOptions"
              :key="item.id"
              :label="`${item.materialSpec || '-'} / ${item.rolls || 0}卷`"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="订单数量">
          <el-input :value="selectedOrderQty ? `${selectedOrderQty}卷` : ''" readonly placeholder="选择规格后自动带出" />
        </el-form-item>
        <el-form-item label="宽度判定(mm)">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <span style="color:#909399;">目标</span>
            <el-input-number v-model="widthTarget" :min="0" :step="0.01" :precision="2" style="width:120px" @change="handleWidthControlChange" />
            <span style="color:#909399;">公差 ±</span>
            <el-input-number v-model="widthTolerance" :min="0" :step="0.01" :precision="2" style="width:120px" @change="handleWidthControlChange" />
            <el-button size="mini" @click="applyWidthRuleFromControl(true)">应用到宽度判定</el-button>
            <span style="color:#909399;">规格自动读取宽度后可手动改公差</span>
          </div>
        </el-form-item>
        <el-form-item label="客户映射">
          <el-input
            :value="customerMaterialMapping ? formatCustomerMappingText(customerMaterialMapping) : '未命中客户映射，使用我司料号/名称'"
            readonly
          />
        </el-form-item>
        <el-form-item label="批次号" prop="batchNo">
          <el-select
            v-model="selectedBatchNos"
            multiple
            filterable
            clearable
            style="width:100%"
            placeholder="请先选择料号后，从仓库批次多选母卷"
            @change="onBatchSelectionChange"
          >
            <el-option
              v-for="item in batchOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
          <el-button
            type="text"
            style="padding-left:0"
            :disabled="!selectedBatchNos.length"
            @click="openBatchHistory"
          >查看历史检测记录</el-button>
        </el-form-item>
        <el-form-item label="卷码" prop="rollCode">
          <el-input v-model="form.rollCode" placeholder="自动带出所选母卷批次号" />
        </el-form-item>
        <el-form-item label="QC规则">
          <el-input v-model="qcRuleText" type="textarea" :rows="3" readonly placeholder="选择料号后自动加载QC规则" />
        </el-form-item>
        <el-form-item label="检测明细表">
          <div class="muted-tip">测试项目来源：料号表（胶带特性参数）</div>
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

    <el-dialog title="出货测试记录表" :visible.sync="testSheetVisible" width="1100px">
      <div v-if="sheetRecord" class="sheet-header">
        <div>质检单号：{{ sheetRecord.inspectionNo || '-' }}</div>
        <div>订单号：{{ sheetRecord.sourceOrderNo || '-' }}</div>
        <div>批次号：{{ sheetRecord.batchNo || '-' }}</div>
        <div>卷码：{{ sheetRecord.rollCode || '-' }}</div>
        <div>料号：{{ getSheetDisplayMaterialCode(sheetRecord) }}</div>
        <div>物料名称：{{ getSheetDisplayMaterialName(sheetRecord) }}</div>
        <div>规格：{{ sheetRecord.specification || '-' }}</div>
        <div>检验员：{{ sheetRecord.inspectorName || '-' }}</div>
      </div>
      <el-table :data="sheetRows" border stripe size="mini" max-height="420">
        <el-table-column type="index" label="序号" width="70" align="center" />
        <el-table-column prop="label" label="测试项目" width="150" />
        <el-table-column prop="unit" label="单位" width="90" align="center" />
        <el-table-column label="标准值" min-width="210">
          <template slot-scope="{ row }">
            <span class="qc-rule-text">{{ row.ruleText }}</span>
          </template>
        </el-table-column>
        <el-table-column label="实测1" width="95" align="center">
          <template slot-scope="{ row }">
            <el-input v-model="row.actual1" size="mini" @input="onSheetActualInput" />
          </template>
        </el-table-column>
        <el-table-column label="实测2" width="95" align="center">
          <template slot-scope="{ row }">
            <el-input v-model="row.actual2" size="mini" @input="onSheetActualInput" />
          </template>
        </el-table-column>
        <el-table-column label="实测3" width="95" align="center">
          <template slot-scope="{ row }">
            <el-input v-model="row.actual3" size="mini" @input="onSheetActualInput" />
          </template>
        </el-table-column>
        <el-table-column label="实测4" width="95" align="center">
          <template slot-scope="{ row }">
            <el-input v-model="row.actual4" size="mini" @input="onSheetActualInput" />
          </template>
        </el-table-column>
        <el-table-column label="实测5" width="95" align="center">
          <template slot-scope="{ row }">
            <el-input v-model="row.actual5" size="mini" @input="onSheetActualInput" />
          </template>
        </el-table-column>
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
        <el-button type="primary" :loading="sheetSaving" @click="saveCurrentSheet">保存修改</el-button>
        <el-button icon="el-icon-view" @click="previewCurrentSheet">预览打印</el-button>
        <el-button type="primary" icon="el-icon-printer" @click="printCurrentSheet">打印报告</el-button>
      </span>
    </el-dialog>

    <el-dialog title="批次历史检测记录" :visible.sync="batchHistoryVisible" width="980px">
      <el-table :data="batchHistoryRows" border stripe size="mini" max-height="420">
        <el-table-column prop="inspectionNo" label="质检单号" width="150" />
        <el-table-column prop="sourceOrderNo" label="订单号" width="140" />
        <el-table-column prop="materialCode" label="料号" width="130" />
        <el-table-column prop="materialName" label="物料名称" min-width="160" />
        <el-table-column prop="specification" label="规格" min-width="140" />
        <el-table-column prop="overallResult" label="结果" width="100" align="center">
          <template slot-scope="{ row }">
            <el-tag :type="resultTag(row.overallResult)" size="mini">{{ resultText(row.overallResult) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="inspectionTime" label="检验时间" width="170" />
        <el-table-column label="操作" width="90" align="center">
          <template slot-scope="{ row }">
            <el-button type="text" size="mini" @click="openTestSheet(row)">查看</el-button>
            <el-button type="text" size="mini" @click="applyHistoryToCurrent(row)">回填</el-button>
          </template>
        </el-table-column>
      </el-table>
      <span slot="footer" class="dialog-footer">
        <el-button @click="batchHistoryVisible = false">关闭</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import { listOutboundInspections, deleteOutboundInspection, createOutboundInspection, updateOutboundInspection, getDefectTypeList, getQualityReportTemplateRule } from '@/api/quality'
import { getTapeSpecList, getSpecByMaterialCode } from '@/api/tapeSpec'
import { searchSalesOrders, getOrderDetailForProduction, getOrders } from '@/api/sales'
import { matchCustomerMaterialMapping } from '@/api/customerMaterialMapping'
import { getStockByMaterial } from '@/api/tapeStock'
import { evaluateQcRules, summarizeQcRules, buildQcInspectionRows } from '@/utils/qcRule'
import request from '@/utils/request'
import JSZip from 'jszip'

export default {
  name: 'OutboundInspectionPage',
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
      batchHistoryVisible: false,
      sheetRecord: null,
      sheetRuleJson: '',
      sheetSaving: false,
      sheetRows: [],
      sheetSummary: { passCount: 0, failCount: 0, pendingCount: 0, totalCount: 0 },
      orderOptions: [],
      orderSearchLoading: false,
      orderItems: [],
      orderMaterialOptions: [],
      orderSpecOptions: [],
      selectedOrderItemId: null,
      selectedOrderQty: 0,
      currentOrderCustomerCode: '',
      currentOrderCustomerName: '',
      customerMaterialMapping: null,
      selectedBatchNos: [],
      batchOptions: [],
      batchHistoryRows: [],
      widthTarget: null,
      widthTolerance: 0.5,
      form: {
        sourceOrderNo: '',
        batchNo: '',
        rollCode: '',
        materialCode: '',
        materialName: '',
        materialSpec: '',
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
      companyInfo: {
        companyName: '东莞市方恩电子材料科技有限公司',
        address: '广东省东莞市桥头镇东新路13号2号楼102室',
        phone: '0769-82551118',
        fax: '0769-82551160',
        website: 'www.finechemfr.com'
      },
      printLogoUrl: '/logo/finechem-logo.png',
      reportTemplateRuleCache: {},
      excelTemplateUrlMap: {
        OUTBOUND_DEFAULT: '/downloads/normal.xlsx',
        OUTBOUND_RP01: '/downloads/quality-report-template-rp01.full.xlsx'
      },
      defectTypes: [],
      rules: {
        sourceOrderNo: [{ required: true, message: '请输入订单号', trigger: 'blur' }],
        batchNo: [{ required: true, message: '请输入批次号', trigger: 'blur' }],
        materialCode: [{ required: true, message: '请选择明细料号', trigger: 'change' }],
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
      const pageSize = 200
      const merged = []
      let page = 1
      let total = 0

      do {
        const res = await getTapeSpecList({ page, size: pageSize, status: 1 })
        if (!(res && (res.code === 200 || res.code === 20000))) break
        const data = res.data || {}
        const records = data.records || data.list || []
        ;(Array.isArray(records) ? records : []).forEach(item => {
          const materialCode = item && item.materialCode ? String(item.materialCode).trim() : ''
          if (!materialCode) return
          if (merged.some(x => x.materialCode === materialCode)) return
          merged.push({
            materialCode,
            materialName: String(item.productName || item.materialName || '').trim(),
            performanceParams: this.buildRuleJsonFromSpec(item)
          })
        })
        total = Number(data.total || 0)
        page += 1
      } while ((page - 1) * pageSize < total)

      this.rawMaterials = merged
      this.materialOptions = merged.slice()
    },
    async searchOrderOptions(keyword) {
      const query = String(keyword || '').trim()
      this.orderSearchLoading = true
      try {
        const res = await searchSalesOrders({ keyword: query || undefined, status: 'all' })
        const data = (res && res.data) || []
        let list = []
        if (Array.isArray(data)) {
          list = data
        } else if (Array.isArray(data.records)) {
          list = data.records
        } else if (Array.isArray(data.list)) {
          list = data.list
        }

        // 兜底：部分账号/环境下 search 接口可能返回空，回退到订单分页接口
        if (!list.length && query) {
          const fallback = await getOrders({
            pageNum: 1,
            pageSize: 30,
            orderNo: query,
            showCompleted: true
          })
          const fData = (fallback && fallback.data) || {}
          if (Array.isArray(fData.records)) {
            list = fData.records
          } else if (Array.isArray(fData.list)) {
            list = fData.list
          }
        }

        this.orderOptions = list.map(item => ({
          value: item.orderNo,
          label: `${item.orderNo}${item.customer ? ' / ' + item.customer : ''}`
        }))
      } catch (e) {
        this.orderOptions = []
      } finally {
        this.orderSearchLoading = false
      }
    },
    buildItemSpecText(item) {
      if (!item) return ''
      const thickness = item.thickness !== undefined && item.thickness !== null && item.thickness !== '' ? `${item.thickness}μm` : ''
      const width = item.width !== undefined && item.width !== null && item.width !== '' ? `${item.width}mm` : ''
      const length = item.length !== undefined && item.length !== null && item.length !== '' ? `${item.length}m` : ''
      return [thickness, width, length].filter(Boolean).join(' × ')
    },
    parseWidthFromSpec(specText) {
      const text = String(specText || '').trim()
      if (!text) return null
      const match = text.match(/(\d+(?:\.\d+)?)\s*mm/i)
      if (!match) return null
      const num = Number(match[1])
      return Number.isFinite(num) ? num : null
    },
    refreshWidthTargetFromSpec() {
      const parsed = this.parseWidthFromSpec(this.form.materialSpec)
      if (parsed === null) return
      this.widthTarget = parsed
    },
    isWidthJudgeRow(row) {
      const label = String((row && row.label) || '').toLowerCase()
      const key = String((row && row.key) || '').toLowerCase()
      return label.includes('宽度') || label.includes('width') || key.includes('width')
    },
    applyWidthRuleFromControl(showMsg = false) {
      const target = Number(this.widthTarget)
      const tol = Number(this.widthTolerance)
      if (!Number.isFinite(target) || target <= 0 || !Number.isFinite(tol) || tol < 0) {
        if (showMsg) this.$message.warning('请先设置有效的宽度目标和公差')
        return false
      }
      if (!Array.isArray(this.measuredRows) || this.measuredRows.length === 0) return false

      let changed = false
      const minVal = (target - tol).toFixed(2)
      const maxVal = (target + tol).toFixed(2)
      this.measuredRows = this.measuredRows.map(row => {
        if (!this.isWidthJudgeRow(row)) return row
        changed = true
        return {
          ...row,
          judgeMode: 'range',
          min: minVal,
          max: maxVal,
          standardValue: String(target)
        }
      })
      if (changed) {
        this.syncMeasuredParamsFromRows()
        if (showMsg) this.$message.success(`已按宽度 ${target}±${tol} 应用判定`) 
      } else if (showMsg) {
        this.$message.warning('当前检测项目中未找到“宽度”项')
      }
      return changed
    },
    handleWidthControlChange() {
      this.applyWidthRuleFromControl(false)
    },
    formatCustomerMappingText(mapping) {
      if (!mapping) return ''
      const code = mapping.customerMaterialCode || '-'
      const name = mapping.customerMaterialName || '-'
      const tol = Number(mapping.widthTolerance)
      if (Number.isFinite(tol) && tol >= 0) {
        return `${code} / ${name} / 宽度公差±${tol}mm`
      }
      return `${code} / ${name}`
    },
    normalizeMaterialCodeText(code) {
      return String(code || '').trim().replace(/\s+/g, '').toUpperCase()
    },
    buildMaterialCodeCandidates(code) {
      const source = String(code || '').trim()
      const arr = []
      const push = (v) => {
        const s = String(v || '').trim()
        if (!s) return
        if (!arr.includes(s)) arr.push(s)
      }
      push(source)
      push(source.split(/\s+/)[0])
      push(source.split(' - ')[0])
      push(source.split('- ')[0])
      return arr.filter(Boolean)
    },
    resolveRuleMaterialByCode(code) {
      const list = this.rawMaterials || []
      const candidates = this.buildMaterialCodeCandidates(code)
      if (!candidates.length) return null
      for (const c of candidates) {
        const exact = list.find(item => String(item.materialCode || '').trim() === c)
        if (exact) return exact
      }

      const norm = this.normalizeMaterialCodeText(candidates[0])
      const includeHit = list.find(item => {
        const itemNorm = this.normalizeMaterialCodeText(item.materialCode)
        return itemNorm && (norm.includes(itemNorm) || itemNorm.includes(norm))
      })
      return includeHit || null
    },
    buildRuleJsonFromSpec(spec) {
      if (!spec || typeof spec !== 'object') return ''
      const ruleObj = {}
      const pushRange = (key, label, unit, min, max, mode = 'range') => {
        const hasMin = min !== null && min !== undefined && String(min) !== ''
        const hasMax = max !== null && max !== undefined && String(max) !== ''
        if (!hasMin && !hasMax) return
        ruleObj[key] = {
          label,
          unit,
          judgeMode: mode,
          min: hasMin ? String(min) : '',
          max: hasMax ? String(max) : '',
          standardValue: '',
          remark: ''
        }
      }
      const pushValue = (key, label, unit, value) => {
        if (value === null || value === undefined || String(value) === '') return
        ruleObj[key] = {
          label,
          unit,
          judgeMode: 'value',
          min: '',
          max: '',
          standardValue: String(value),
          remark: ''
        }
      }
      const pushTextValue = (key, label, unit, standardValue) => {
        const itemLabel = String(label || '').trim()
        const itemStd = String(standardValue || '').trim()
        if (!itemLabel || !itemStd) return
        ruleObj[key] = {
          label: itemLabel,
          unit: String(unit || '').trim(),
          judgeMode: 'value',
          min: '',
          max: '',
          standardValue: itemStd,
          remark: ''
        }
      }

      pushRange('totalThickness', '总厚度', 'μm', spec.totalThicknessMin, spec.totalThicknessMax, 'range')
      pushRange('initialTack', '初粘', '', spec.initialTackMin, spec.initialTackMax, 'range')
      pushRange('peelStrength', '剥离力', '', spec.peelStrengthMin, spec.peelStrengthMax, 'range')
      pushRange('unwindForce', '解卷力', '', spec.unwindForceMin, spec.unwindForceMax, 'range')
      pushValue('heatResistance', '耐温', '℃', spec.heatResistance)
      for (let i = 1; i <= 4; i++) {
        pushTextValue(
          `extraQcItem${i}`,
          spec[`extraQcItem${i}Name`],
          spec[`extraQcItem${i}Unit`],
          spec[`extraQcItem${i}Standard`]
        )
      }

      return Object.keys(ruleObj).length ? JSON.stringify(ruleObj) : ''
    },
    async ensureRuleMaterialLoaded(code) {
      const hit = this.resolveRuleMaterialByCode(code)
      if (hit && hit.performanceParams) return hit

      const candidates = this.buildMaterialCodeCandidates(code)
      for (const c of candidates) {
        try {
          const res = await getSpecByMaterialCode(c)
          if (!(res && (res.code === 200 || res.code === 20000))) continue
          const item = res.data || {}
          const performanceParams = this.buildRuleJsonFromSpec(item)

          const materialCode = String(item.materialCode || c || '').trim()
          if (!materialCode) continue

          const normalized = {
            materialCode,
            materialName: String(item.productName || item.materialName || '').trim(),
            performanceParams
          }

          const idx = (this.rawMaterials || []).findIndex(x => String(x.materialCode || '').trim() === materialCode)
          if (idx > -1) {
            this.$set(this.rawMaterials, idx, { ...this.rawMaterials[idx], ...normalized })
          } else {
            this.rawMaterials.push(normalized)
          }
          return normalized
        } catch (e) {
        }
      }
      return null
    },
    async handleOrderChange(orderNo) {
      this.selectedOrderItemId = null
      this.currentOrderCustomerCode = ''
      this.currentOrderCustomerName = ''
      this.customerMaterialMapping = null
      this.selectedBatchNos = []
      this.form.materialCode = ''
      this.form.materialName = ''
      this.form.materialSpec = ''
      this.selectedOrderQty = 0
      this.form.batchNo = ''
      this.form.rollCode = ''
      this.batchOptions = []
      this.qcRuleText = ''
      this.measuredRows = []
      this.syncMeasuredParamsFromRows()

      this.orderItems = []
      this.orderMaterialOptions = []
      this.orderSpecOptions = []
      if (!orderNo) {
        this.materialOptions = this.rawMaterials.slice()
        this.customerMaterialMapping = null
        return
      }
      try {
        const res = await getOrderDetailForProduction(orderNo, { silentError: true })
        if (!(res && (res.code === 200 || res.code === 20000))) {
          this.materialOptions = this.rawMaterials.slice()
          return
        }
        const order = res.data || {}
        this.currentOrderCustomerCode = String(order.customerCode || '').trim()
        this.currentOrderCustomerName = String(order.customerName || order.customer || '').trim()
        const items = Array.isArray(order.items) ? order.items : []
        const mapped = []
        items.forEach((item, idx) => {
          const materialCode = String(item.materialCode || '').trim()
          if (!materialCode) return
          mapped.push({
            id: item.id || idx + 1,
            materialCode,
            materialName: String(item.materialName || '').trim(),
            materialSpec: this.buildItemSpecText(item),
            rolls: Number(item.rolls || 0),
            thickness: item.thickness,
            width: item.width,
            length: item.length
          })
        })
        this.orderItems = mapped
        const materialMap = {}
        mapped.forEach(item => {
          if (!materialMap[item.materialCode]) {
            materialMap[item.materialCode] = {
              materialCode: item.materialCode,
              materialName: item.materialName
            }
          }
        })
        this.orderMaterialOptions = Object.keys(materialMap).map(key => materialMap[key])
        this.materialOptions = this.orderMaterialOptions.length > 0
          ? this.orderMaterialOptions.map(item => ({ ...item }))
          : this.rawMaterials.slice()
        if (this.orderMaterialOptions.length === 1) {
          this.form.materialCode = this.orderMaterialOptions[0].materialCode
          await this.onOrderMaterialChange(this.form.materialCode)
        }
      } catch (e) {
        this.materialOptions = this.rawMaterials.slice()
      }
    },
    async onOrderMaterialChange(materialCode) {
      const code = String(materialCode || '').trim()
      this.selectedOrderItemId = null
      this.customerMaterialMapping = null
      this.orderSpecOptions = (this.orderItems || []).filter(item => String(item.materialCode || '').trim() === code)
      this.selectedBatchNos = []
      this.form.batchNo = ''
      this.form.rollCode = ''
      this.selectedOrderQty = 0
      if (!code) {
        await this.handleMaterialCodeChange()
        return
      }
      this.form.materialCode = code
      const first = this.orderSpecOptions[0]
      if (first) {
        this.form.materialName = first.materialName || this.form.materialName
      }
      await this.handleMaterialCodeChange()
      if (this.orderSpecOptions.length === 1) {
        this.selectedOrderItemId = this.orderSpecOptions[0].id
        this.onOrderSpecChange(this.selectedOrderItemId)
      }
    },
    onOrderSpecChange(orderItemId) {
      const id = Number(orderItemId || 0)
      const selected = (this.orderSpecOptions || []).find(item => Number(item.id) === id)
      if (!selected) {
        this.form.materialSpec = ''
        this.selectedOrderQty = 0
        this.customerMaterialMapping = null
        return
      }
      this.form.materialCode = selected.materialCode || this.form.materialCode
      this.form.materialName = selected.materialName || this.form.materialName
      this.form.materialSpec = selected.materialSpec || this.form.materialSpec
      this.refreshWidthTargetFromSpec()
      this.selectedOrderQty = Number(selected.rolls || 0)
      this.syncCustomerMaterialMapping(selected)
      this.applyWidthRuleFromControl(false)
    },
    async syncCustomerMaterialMapping(orderItem) {
      const customerCode = String(this.currentOrderCustomerCode || '').trim()
      const materialCode = String((orderItem && orderItem.materialCode) || this.form.materialCode || '').trim()
      if (!customerCode || !materialCode) {
        this.customerMaterialMapping = null
        return
      }
      const toNum = (v) => {
        const n = Number(v)
        return Number.isFinite(n) ? n : undefined
      }
      const thickness = toNum(orderItem && orderItem.thickness)
      const width = toNum(orderItem && orderItem.width)
      const length = toNum(orderItem && orderItem.length)
      try {
        const res = await matchCustomerMaterialMapping({ customerCode, materialCode, thickness, width, length })
        const ok = res && (res.code === 200 || res.code === 20000)
        this.customerMaterialMapping = ok && res.data ? res.data : null
        const toleranceFromMapping = Number(this.customerMaterialMapping && this.customerMaterialMapping.widthTolerance)
        if (Number.isFinite(toleranceFromMapping) && toleranceFromMapping >= 0) {
          this.widthTolerance = toleranceFromMapping
          this.applyWidthRuleFromControl(false)
        }
      } catch (e) {
        this.customerMaterialMapping = null
      }
    },
    onBatchSelectionChange(values) {
      const list = Array.isArray(values) ? values : []
      this.selectedBatchNos = list
      this.form.batchNo = list.join(',')
      this.form.rollCode = list.join(',')
    },
    async handleMaterialCodeChange() {
      const code = String(this.form.materialCode || '').trim()
      if (!code) {
        this.form.materialName = ''
        this.form.materialSpec = ''
        this.selectedOrderQty = 0
        this.form.batchNo = ''
        this.selectedBatchNos = []
        this.form.rollCode = ''
        this.batchOptions = []
        this.qcRuleText = ''
        this.measuredRows = []
        this.syncMeasuredParamsFromRows()
        return
      }

      const orderItem = (this.orderItems || []).find(item => Number(item.id) === Number(this.selectedOrderItemId))
        || (this.orderItems || []).find(item => item.materialCode === code)
      if (orderItem) {
        this.form.materialName = orderItem.materialName || this.form.materialName
        this.form.materialSpec = orderItem.materialSpec || this.form.materialSpec
        this.refreshWidthTargetFromSpec()
        this.selectedOrderQty = Number(orderItem.rolls || this.selectedOrderQty || 0)
      }

      await this.ensureRuleMaterialLoaded(code)
      this.syncQcRuleByMaterialCode()
      await this.loadBatchOptionsByMaterial(code)
    },
    async loadBatchOptionsByMaterial(materialCode) {
      this.batchOptions = []
      this.form.batchNo = ''
      this.selectedBatchNos = []
      this.form.rollCode = ''
      if (!materialCode) return
      try {
        const res = await getStockByMaterial(materialCode)
        if (!(res && (res.code === 200 || res.code === 20000))) return
        const rows = Array.isArray(res.data) ? res.data : []
        this.batchOptions = rows
          .map(item => {
            const batchNo = String(item.batchNo || '').trim()
            if (!batchNo) return null
            const area = Number(item.availableArea || 0)
            return {
              value: batchNo,
              label: `${batchNo}${Number.isFinite(area) ? `（可用${area}㎡）` : ''}`
            }
          })
          .filter(Boolean)
      } catch (e) {
        this.batchOptions = []
      }
    },
    async openBatchHistory() {
      const firstBatch = (this.selectedBatchNos && this.selectedBatchNos[0]) || String(this.form.batchNo || '').split(',')[0]
      const batchNo = String(firstBatch || '').trim()
      if (!batchNo) {
        this.$message.warning('请先选择批次号')
        return
      }
      try {
        const res = await listOutboundInspections({ pageNum: 1, pageSize: 100, batchNo })
        if (!(res && (res.code === 200 || res.code === 20000))) {
          this.$message.error(res.message || '加载历史记录失败')
          return
        }
        const rows = res.data.records || res.data.list || []
        this.batchHistoryRows = (Array.isArray(rows) ? rows : []).filter(item => String(item.batchNo || '').trim() === batchNo)
        if (!this.batchHistoryRows.length) {
          this.$message.warning('该批次暂无历史检测记录')
          return
        }
        this.batchHistoryVisible = true
      } catch (e) {
        this.$message.error('加载历史记录失败')
      }
    },
    setMeasuredRowsByPayload(payload) {
      const source = payload && typeof payload === 'object' ? payload : {}
      this.measuredRows = (this.measuredRows || []).map(row => {
        const arr = Array.isArray(source[row.key]) ? source[row.key].slice(0, 5) : []
        while (arr.length < 5) arr.push('')
        return {
          ...row,
          actualValues: arr
        }
      })
      this.syncMeasuredParamsFromRows()
    },
    parseMeasuredPayloadFromRecord(record) {
      const snapshot = this.parseJsonSafe(record && record.processSnapshot)
      const fromSnapshot = snapshot && snapshot.measuredParams
      const fromRecord = record && record.measuredParams
      const candidate = fromSnapshot || fromRecord || '{}'
      if (typeof candidate === 'string') {
        try {
          return JSON.parse(candidate)
        } catch (e) {
          return {}
        }
      }
      if (candidate && typeof candidate === 'object') return candidate
      return {}
    },
    async applyHistoryToCurrent(row) {
      if (!row) return
      const materialCode = String(row.materialCode || '').trim()
      if (!materialCode) {
        this.$message.warning('历史记录缺少料号，无法回填')
        return
      }

      if (this.form.materialCode && this.form.materialCode !== materialCode) {
        try {
          await this.$confirm('历史记录料号与当前不一致，是否覆盖当前料号与检测值？', '提示', { type: 'warning' })
        } catch (e) {
          return
        }
      }

      if (!(this.materialOptions || []).some(item => String(item.materialCode || '').trim() === materialCode)) {
        this.materialOptions.unshift({
          materialCode,
          materialName: row.materialName || ''
        })
      }

      this.form.materialCode = materialCode
      this.form.materialName = row.materialName || this.form.materialName
      this.form.materialSpec = row.specification || row.materialSpec || this.form.materialSpec
      await this.handleMaterialCodeChange()

      const measuredPayload = this.parseMeasuredPayloadFromRecord(row)
      this.setMeasuredRowsByPayload(measuredPayload)

      const targetBatch = String(row.batchNo || '').trim()
      if (targetBatch) {
        if (!(this.batchOptions || []).some(item => String(item.value || '').trim() === targetBatch)) {
          this.batchOptions.unshift({ value: targetBatch, label: targetBatch })
        }
        this.form.batchNo = targetBatch
      }

      this.autoJudge()
      this.batchHistoryVisible = false
      this.$message.success('已回填历史检测值到当前单据')
    },
    syncQcRuleByMaterialCode() {
      const material = this.resolveRuleMaterialByCode(this.form.materialCode)
      if (!material) {
        this.qcRuleText = ''
        this.measuredRows = []
        this.syncMeasuredParamsFromRows()
        return
      }
      if (!material.performanceParams) {
        this.qcRuleText = '当前料号未维护测试项目，请先维护料号性能参数或QC项目'
        this.measuredRows = []
        this.syncMeasuredParamsFromRows()
        return
      }
      this.form.materialName = material.materialName || this.form.materialName
      if (!this.form.materialSpec) {
        const orderItem = (this.orderItems || []).find(item => item.materialCode === this.form.materialCode)
        this.form.materialSpec = (orderItem && orderItem.materialSpec) || this.form.materialSpec
      }
      this.qcRuleText = (summarizeQcRules(material.performanceParams) || []).join('\n') || material.performanceParams || ''
      this.measuredRows = buildQcInspectionRows(material.performanceParams, this.form.measuredParams)
      this.applyWidthRuleFromControl(false)
      this.syncMeasuredParamsFromRows()
    },
    autoJudge() {
      const material = this.resolveRuleMaterialByCode(this.form.materialCode)
      if (!material || !material.performanceParams) {
        this.$message.warning('请先选择有QC规则的料号')
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
        const res = await listOutboundInspections(this.query)
        if (res && (res.code === 200 || res.code === 20000)) {
          this.rows = res.data.records || res.data.list || []
          this.total = Number(res.data.total || 0)
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
      this.query.pageNum = Number(page)
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
      const normalized = this.normalizeDetailRow(row)
      const sheetData = this.composeSheetData(normalized)
      this.detailRecord = normalized
      this.detailSheetRows = sheetData ? sheetData.rows : []
      this.detailSheetSummary = sheetData
        ? sheetData.summary
        : { passCount: 0, failCount: 0, pendingCount: 0, totalCount: 0 }
      this.current = JSON.stringify(normalized, null, 2)
      this.detailVisible = true
    },
    parseJsonDeepSafe(value, maxDepth = 4) {
      let current = value
      for (let i = 0; i < maxDepth; i++) {
        if (current === null || current === undefined) return current
        if (typeof current === 'object') return current
        if (typeof current !== 'string') return current
        const text = current.trim()
        if (!text) return text
        // 仅在可能是 JSON 的场景下尝试解析，避免误伤普通字符串
        const looksLikeJson =
          (text.startsWith('{') && text.endsWith('}')) ||
          (text.startsWith('[') && text.endsWith(']')) ||
          (text.startsWith('"') && text.endsWith('"'))
        if (!looksLikeJson) return current
        try {
          current = JSON.parse(text)
        } catch (e) {
          return current
        }
      }
      return current
    },
    normalizeDetailRow(row) {
      const normalized = row ? JSON.parse(JSON.stringify(row)) : {}

      normalized.processSnapshot = this.parseJsonDeepSafe(normalized.processSnapshot)
      normalized.measuredParams = this.parseJsonDeepSafe(normalized.measuredParams)

      if (normalized.processSnapshot && typeof normalized.processSnapshot === 'object') {
        normalized.processSnapshot.measuredParams = this.parseJsonDeepSafe(normalized.processSnapshot.measuredParams)
        normalized.processSnapshot.summary = this.parseJsonDeepSafe(normalized.processSnapshot.summary)
        normalized.processSnapshot.results = this.parseJsonDeepSafe(normalized.processSnapshot.results)
        normalized.processSnapshot.ruleJson = this.parseJsonDeepSafe(normalized.processSnapshot.ruleJson)
      }

      return normalized
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
    getMappedDisplayInfo(record) {
      const snapshot = this.parseJsonSafe(record && record.processSnapshot) || {}
      const mappedCode = String(snapshot.customerMaterialCode || '').trim()
      const mappedName = String(snapshot.customerMaterialName || '').trim()
      return {
        materialCode: mappedCode || String((record && record.materialCode) || '').trim() || '-',
        materialName: mappedName || String((record && record.materialName) || '').trim() || '-'
      }
    },
    getSheetDisplayMaterialCode(record) {
      return this.getMappedDisplayInfo(record).materialCode
    },
    getSheetDisplayMaterialName(record) {
      return this.getMappedDisplayInfo(record).materialName
    },
    getRowSnapshot(row) {
      return this.parseJsonSafe(row && row.processSnapshot) || {}
    },
    getRowCustomerCode(row) {
      const snapshot = this.getRowSnapshot(row)
      const code = this.normalizeCustomerCode(snapshot.customerCode || row.customerCode || '')
      return code || '-'
    },
    getRowSourceOrderNo(row) {
      const snapshot = this.getRowSnapshot(row)
      return String((row && row.sourceOrderNo) || snapshot.sourceOrderNo || '').trim() || '-'
    },
    getRowSpecification(row) {
      const snapshot = this.getRowSnapshot(row)
      return String((row && row.specification) || snapshot.specification || '').trim() || '-'
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
          unit: row.unit || '-',
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
    buildSheetMeasuredParams(rows) {
      const payload = {}
      ;(rows || []).forEach(row => {
        payload[row.key] = [row.actual1, row.actual2, row.actual3, row.actual4, row.actual5].map(v => {
          if (v === undefined || v === null) return ''
          const text = String(v).trim()
          return text === '-' ? '' : text
        })
      })
      return payload
    },
    applySheetSummary(summary) {
      const resultMap = {}
      ;((summary && summary.results) || []).forEach(item => {
        resultMap[item.key] = item
      })
      ;(this.sheetRows || []).forEach(row => {
        const matched = resultMap[row.key] || {}
        row.status = matched.status || 'pending'
        row.message = matched.message || ''
      })
      this.sheetSummary = {
        passCount: (summary && summary.passCount) || 0,
        failCount: (summary && summary.failCount) || 0,
        pendingCount: (summary && summary.pendingCount) || 0,
        totalCount: (summary && summary.totalCount) || (this.sheetRows || []).length
      }
    },
    onSheetActualInput() {
      if (!this.sheetRuleJson) return
      const measured = this.buildSheetMeasuredParams(this.sheetRows)
      const summary = evaluateQcRules(this.sheetRuleJson, measured)
      this.applySheetSummary(summary)
    },
    openTestSheet(row) {
      const normalized = this.normalizeDetailRow(row)
      const snapshot = this.parseJsonSafe(normalized && normalized.processSnapshot) || {}
      const ruleJson = snapshot.ruleJson || snapshot.performanceParams || ''
      if (!ruleJson) {
        this.$message.warning('该记录未保存检测规则，无法修改测试表')
        return
      }
      const data = this.composeSheetData(normalized)
      if (!data) {
        this.$message.warning('该记录未保存测试明细，无法生成测试表')
        return
      }
      this.sheetRecord = normalized
      this.sheetRuleJson = ruleJson
      this.sheetRows = data.rows
      this.sheetSummary = data.summary
      this.testSheetVisible = true
    },
    async saveCurrentSheet() {
      if (!this.sheetRecord || !this.sheetRecord.id) {
        this.$message.warning('缺少记录ID，无法保存修改')
        return
      }
      if (!this.sheetRuleJson) {
        this.$message.warning('缺少检测规则，无法保存修改')
        return
      }

      const measured = this.buildSheetMeasuredParams(this.sheetRows)
      const summary = evaluateQcRules(this.sheetRuleJson, measured)
      this.applySheetSummary(summary)

      const snapshot = this.parseJsonSafe(this.sheetRecord.processSnapshot) || {}
      snapshot.ruleJson = snapshot.ruleJson || this.sheetRuleJson
      snapshot.measuredParams = measured
      snapshot.measuredRows = (this.sheetRows || []).map(row => ({
        key: row.key,
        label: row.label,
        unit: row.unit,
        actualValues: [row.actual1, row.actual2, row.actual3, row.actual4, row.actual5],
        status: row.status,
        message: row.message
      }))
      snapshot.summary = summary
      snapshot.generatedAt = new Date().toISOString()

      const payload = {
        ...this.sheetRecord,
        overallResult: summary.overallResult,
        processSnapshot: JSON.stringify(snapshot)
      }

      this.sheetSaving = true
      try {
        const res = await updateOutboundInspection(payload)
        if (res && (res.code === 200 || res.code === 20000)) {
          this.sheetRecord = { ...this.sheetRecord, overallResult: summary.overallResult, processSnapshot: payload.processSnapshot }
          const idx = (this.rows || []).findIndex(item => item && item.id === this.sheetRecord.id)
          if (idx >= 0) {
            this.$set(this.rows, idx, { ...this.rows[idx], overallResult: summary.overallResult, processSnapshot: payload.processSnapshot })
          }
          this.$message.success('测试表修改已保存')
        } else {
          this.$message.error((res && res.message) || '保存失败')
        }
      } catch (e) {
        this.$message.error('保存失败，请稍后重试')
      } finally {
        this.sheetSaving = false
      }
    },
    printTestReport(row) {
      this.printTestReportAsync(row)
    },
    previewTestReport(row) {
      this.previewTestReportAsync(row)
    },
    async previewTestReportAsync(row) {
      const data = this.composeSheetData(row)
      if (!data) {
        this.$message.warning('该记录未保存测试明细，无法预览打印')
        return
      }
      const templateCode = await this.resolveReportTemplateCode(row)
      this.doPrintReport(row, data, templateCode)
    },
    async printTestReportAsync(row) {
      const data = this.composeSheetData(row)
      if (!data) {
        this.$message.warning('该记录未保存测试明细，无法打印报告')
        return
      }
      const templateCode = await this.resolveReportTemplateCode(row)
      const excelPrinted = await this.tryPrintByExcelTemplate(row, data, templateCode)
      if (excelPrinted === true || excelPrinted === 'hard-fail') return
      this.doPrintReport(row, data, templateCode)
    },
    printCurrentSheet() {
      this.printCurrentSheetAsync()
    },
    previewCurrentSheet() {
      this.previewCurrentSheetAsync()
    },
    async previewCurrentSheetAsync() {
      if (!this.sheetRecord) return
      const templateCode = await this.resolveReportTemplateCode(this.sheetRecord)
      this.doPrintReport(this.sheetRecord, { rows: this.sheetRows, summary: this.sheetSummary }, templateCode)
    },
    async printCurrentSheetAsync() {
      if (!this.sheetRecord) return
      const templateCode = await this.resolveReportTemplateCode(this.sheetRecord)
      const excelPrinted = await this.tryPrintByExcelTemplate(this.sheetRecord, { rows: this.sheetRows, summary: this.sheetSummary }, templateCode)
      if (excelPrinted === true || excelPrinted === 'hard-fail') return
      this.doPrintReport(this.sheetRecord, { rows: this.sheetRows, summary: this.sheetSummary }, templateCode)
    },
    escapeHtml(text) {
      return String(text === undefined || text === null ? '' : text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
    },
    normalizeCustomerCode(value) {
      return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
    },
    normalizeTemplateCode(value) {
      const v = String(value || '').trim().toUpperCase().replace(/[^A-Z0-9_]/g, '')
      if (!v) return 'OUTBOUND_DEFAULT'
      return v
    },
    getRecordCustomerInfo(record) {
      const snapshot = this.parseJsonSafe(record && record.processSnapshot) || {}
      const customerCode = this.normalizeCustomerCode(
        snapshot.customerCode ||
        (record && (record.customerCode || record.customer_code)) ||
        this.currentOrderCustomerCode ||
        ''
      )
      const customerName = String(
        snapshot.customerName ||
        (record && (record.customerName || record.customer_name)) ||
        this.currentOrderCustomerName ||
        ''
      ).trim()
      return { customerCode, customerName }
    },
    async resolveReportTemplateCode(record) {
      const customer = this.getRecordCustomerInfo(record)
      const mapped = this.getMappedDisplayInfo(record)
      const materialCode = String(mapped.materialCode || (record && record.materialCode) || '').trim().toUpperCase()
      if (!customer.customerCode) {
        return 'OUTBOUND_DEFAULT'
      }
      const cacheKey = `outbound:${customer.customerCode}:${materialCode}`
      const cached = this.reportTemplateRuleCache[cacheKey]
      if (cached) {
        return cached
      }

      let templateCode = 'OUTBOUND_DEFAULT'
      try {
        const res = await getQualityReportTemplateRule({
          customerCode: customer.customerCode,
          inspectionType: 'outbound',
          materialCode
        })
        if (res && (res.code === 200 || res.code === 20000) && res.data && Number(res.data.enabled) !== 0) {
          templateCode = this.normalizeTemplateCode(res.data.templateCode)
        }
      } catch (e) {
        // ignore and fallback
      }

      // 兜底：RP01 未配置规则时，默认切换到 RP01 报告模板
      if (templateCode === 'OUTBOUND_DEFAULT' && customer.customerCode === 'RP01') {
        templateCode = 'OUTBOUND_RP01'
      }

      this.$set(this.reportTemplateRuleCache, cacheKey, templateCode)
      return templateCode
    },
    getExcelTemplateUrl(templateCode) {
      const code = this.normalizeTemplateCode(templateCode)
      if (this.excelTemplateUrlMap[code]) {
        return this.excelTemplateUrlMap[code]
      }
      if (code === 'OUTBOUND_DEFAULT') {
        return ''
      }
      const suffix = code.replace(/^OUTBOUND_/, '').toLowerCase()
      if (!suffix) {
        return ''
      }
      return `/downloads/quality-report-template-${suffix}.xlsx`
    },
    replacePlaceholders(text, valueMap) {
      const source = String(text === undefined || text === null ? '' : text)
      return source.replace(/\$\{\s*([a-zA-Z0-9_]+)\s*\}/g, (all, key) => {
        const raw = valueMap[key]
        if (raw === undefined || raw === null) return ''
        return String(raw)
      })
    },
    escapeXmlText(text) {
      return String(text === undefined || text === null ? '' : text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;')
    },
    replaceXmlPlaceholders(xml, valueMap) {
      const source = String(xml === undefined || xml === null ? '' : xml)
      return source.replace(/\$\{\s*([a-zA-Z0-9_]+)\s*\}/g, (all, key) => {
        const raw = valueMap[key]
        if (raw === undefined || raw === null) return ''
        return this.escapeXmlText(raw)
      })
    },
    buildExcelValueMap(record, data, templateCode) {
      const rows = Array.isArray(data && data.rows) ? data.rows : []
      const summary = (data && data.summary) || {}
      const customer = this.getRecordCustomerInfo(record)
      const mapped = this.getMappedDisplayInfo(record)
      const now = new Date()
      const pad = n => String(n).padStart(2, '0')
      const nowText = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
      const values = {
        templateCode: this.normalizeTemplateCode(templateCode),
        formNo: this.normalizeTemplateCode(templateCode) === 'OUTBOUND_RP01' ? 'RP01-QC-01' : 'FE-FR-GC-01',
        customerCode: customer.customerCode || '-',
        customerName: customer.customerName || '-',
        inspectionNo: record.inspectionNo || '-',
        sourceOrderNo: record.sourceOrderNo || '-',
        batchNo: record.batchNo || '-',
        rollCode: record.rollCode || '-',
        materialCode: mapped.materialCode || '-',
        materialName: mapped.materialName || '-',
        specification: record.specification || '-',
        inspectionEnvironment: '23±5℃、50±5%',
        netWeight: record.netWeight || '-',
        sampleQty: record.sampleQty || '-',
        inspectorName: record.inspectorName || '-',
        reviewerName: record.reviewerName || '',
        signDate: nowText,
        inspectionTime: record.inspectionTime || '-',
        overallResult: this.resultText(record.overallResult || 'pending'),
        passCount: summary.passCount || 0,
        failCount: summary.failCount || 0,
        pendingCount: summary.pendingCount || 0,
        totalCount: summary.totalCount || 0,
        printDate: nowText
      }

      // 常用语义别名（便于模板按业务字段命名占位符）
      values.productName = values.materialName
      values.productCode = values.materialCode
      values.orderNo = values.sourceOrderNo
      values.lotNo = values.batchNo
      values.qtyRoll = values.sampleQty
      values.resultText = values.overallResult
      values.companyName = this.companyInfo.companyName || ''
      values.companyAddress = this.companyInfo.address || ''
      values.companyPhone = this.companyInfo.phone || ''
      values.companyFax = this.companyInfo.fax || ''
      values.companyWebsite = this.companyInfo.website || ''

      const usedNameSet = new Set()
      const toSafeKey = (value, fallback) => {
        const base = String(value || '').trim().replace(/[^a-zA-Z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '')
        const safe = base || fallback
        if (!usedNameSet.has(safe)) {
          usedNameSet.add(safe)
          return safe
        }
        let seq = 2
        let next = `${safe}_${seq}`
        while (usedNameSet.has(next)) {
          seq += 1
          next = `${safe}_${seq}`
        }
        usedNameSet.add(next)
        return next
      }
      const normalizeLabelForMatch = value => String(value || '')
        .toLowerCase()
        .replace(/\s+/g, '')
        .replace(/[()（）\-—:：·、，,。\.]/g, '')

      const resolveLabelAliasKey = (key, label, index) => {
        const normalizedLabel = normalizeLabelForMatch(label)
        const normalizedKey = String(key || '').trim()
        if (normalizedKey) {
          if (/totalthickness/i.test(normalizedKey)) return 'totalThickness'
          if (/initialtack/i.test(normalizedKey)) return 'initialTack'
          if (/peelstrength/i.test(normalizedKey)) return 'peelStrength'
          if (/unwindforce/i.test(normalizedKey)) return 'unwindForce'
          if (/heatresistance/i.test(normalizedKey)) return 'heatResistance'
          if (/extraqcitem/i.test(normalizedKey)) return normalizedKey
        }

        if (normalizedLabel.includes('外观')) return 'appearance'
        if (normalizedLabel.includes('颜色') || normalizedLabel.includes('pantone')) return 'color'
        if (normalizedLabel.includes('宽度')) return 'width'
        if (normalizedLabel.includes('平均厚度')) return 'totalThickness'
        if (normalizedLabel.includes('基材厚度')) return 'baseThickness'
        if (normalizedLabel.includes('长度')) return 'length'
        if (normalizedLabel.includes('整卷错位')) return 'misalignment'
        if (normalizedLabel.includes('剥离力')) return 'peelStrength'
        if (normalizedLabel.includes('耐电压') || normalizedLabel.includes('漏电电流')) return 'withstandVoltage'
        if (normalizedLabel.includes('绝缘电阻')) return 'insulationResistance'
        if (normalizedLabel.includes('耐温')) return 'heatResistance'
        if (normalizedLabel.includes('耐电解液')) return 'electrolyteResistance'
        if (normalizedLabel.includes('抗拉强度')) return 'extraQcItem1'
        if (normalizedLabel.includes('断裂伸长率')) return 'extraQcItem2'
        return `item${index}`
      }

      rows.forEach((item, index) => {
        const i = index + 1
        const actualValues = [item.actual1, item.actual2, item.actual3, item.actual4, item.actual5].map(v => {
          if (v === undefined || v === null || v === '' || v === '-') return ''
          return v
        })
        values[`item${i}_label`] = item.label || ''
        values[`item${i}_rule`] = item.ruleText || ''
        values[`item${i}_actual1`] = actualValues[0] || ''
        values[`item${i}_actual2`] = actualValues[1] || ''
        values[`item${i}_actual3`] = actualValues[2] || ''
        values[`item${i}_actual4`] = actualValues[3] || ''
        values[`item${i}_actual5`] = actualValues[4] || ''
        values[`item${i}_actual6`] = actualValues[5] || actualValues[4] || ''
        values[`item${i}_status`] = this.resultText(item.status || 'pending')
        values[`item${i}_message`] = item.message || ''

        // 行级语义别名
        values[`item${i}_name`] = values[`item${i}_label`]
        values[`item${i}_standard`] = values[`item${i}_rule`]
        values[`item${i}_result`] = values[`item${i}_status`]
        values[`item${i}_remark`] = values[`item${i}_message`]
        values[`item${i}_actual_all`] = actualValues.filter(Boolean).join(' / ')

        // 按“项目名/项目key”生成占位符别名，避免模板只靠 item1、item2 编号
        const itemNamedKey = toSafeKey(item.key || item.label, `item${i}`)
        values[`${itemNamedKey}_label`] = values[`item${i}_label`]
        values[`${itemNamedKey}_rule`] = values[`item${i}_rule`]
        values[`${itemNamedKey}_standard`] = values[`item${i}_standard`]
        values[`${itemNamedKey}_actual1`] = values[`item${i}_actual1`]
        values[`${itemNamedKey}_actual2`] = values[`item${i}_actual2`]
        values[`${itemNamedKey}_actual3`] = values[`item${i}_actual3`]
        values[`${itemNamedKey}_actual4`] = values[`item${i}_actual4`]
        values[`${itemNamedKey}_actual5`] = values[`item${i}_actual5`]
        values[`${itemNamedKey}_actual6`] = values[`item${i}_actual6`]
        values[`${itemNamedKey}_result`] = values[`item${i}_result`]
        values[`${itemNamedKey}_status`] = values[`item${i}_status`]
        values[`${itemNamedKey}_remark`] = values[`item${i}_remark`]
        values[`${itemNamedKey}_message`] = values[`item${i}_message`]
        values[`${itemNamedKey}_actual_all`] = values[`item${i}_actual_all`]

        // 业务语义别名（按检测项目名称命名）
        const labelAliasKey = resolveLabelAliasKey(item.key, item.label, i)
        values[`${labelAliasKey}_label`] = values[`item${i}_label`]
        values[`${labelAliasKey}_rule`] = values[`item${i}_rule`]
        values[`${labelAliasKey}_standard`] = values[`item${i}_standard`]
        values[`${labelAliasKey}_actual1`] = values[`item${i}_actual1`]
        values[`${labelAliasKey}_actual2`] = values[`item${i}_actual2`]
        values[`${labelAliasKey}_actual3`] = values[`item${i}_actual3`]
        values[`${labelAliasKey}_actual4`] = values[`item${i}_actual4`]
        values[`${labelAliasKey}_actual5`] = values[`item${i}_actual5`]
        values[`${labelAliasKey}_actual6`] = values[`item${i}_actual6`]
        values[`${labelAliasKey}_status`] = values[`item${i}_status`]
        values[`${labelAliasKey}_result`] = values[`item${i}_result`]
        values[`${labelAliasKey}_message`] = values[`item${i}_message`]
        values[`${labelAliasKey}_remark`] = values[`item${i}_remark`]
        values[`${labelAliasKey}_actual_all`] = values[`item${i}_actual_all`]
      })

      return values
    },
    async tryPrintByExcelTemplate(record, data, templateCode) {
      const normalizedCode = this.normalizeTemplateCode(templateCode)
      const url = this.getExcelTemplateUrl(templateCode)
      if (!url) return false

      try {
        const response = await fetch(url, { cache: 'no-store' })
        if (!response.ok) {
          this.$message.error(`未找到Excel报告模板：${normalizedCode}（${url}）`) 
          return 'hard-fail'
        }
        const buffer = await response.arrayBuffer()
        const valueMap = this.buildExcelValueMap(record, data, templateCode)
        const zip = await JSZip.loadAsync(buffer)
        const xmlFileNames = Object.keys(zip.files).filter(name => /^xl\/(sharedStrings\.xml|worksheets\/sheet\d+\.xml)$/i.test(name))
        for (const fileName of xmlFileNames) {
          const file = zip.file(fileName)
          if (!file) continue
          const xml = await file.async('string')
          const replaced = this.replaceXmlPlaceholders(xml, valueMap)
          if (replaced !== xml) {
            zip.file(fileName, replaced)
          }
        }

        const blob = await zip.generateAsync({
          type: 'blob',
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        })
        const link = document.createElement('a')
        const inspectionNo = String(record.inspectionNo || '').trim() || 'report'
        const customerCode = this.getRecordCustomerInfo(record).customerCode || 'customer'
        link.href = URL.createObjectURL(blob)
        link.download = `检测报告_${customerCode}_${inspectionNo}.xlsx`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(link.href)
        this.$message.success('已按Excel模板生成报告文件')
        return true
      } catch (e) {
        this.$message.error('Excel模板生成失败，请检查模板结构或占位符设置')
        return 'hard-fail'
      }
    },
    doPrintReport(record, data, templateCode) {
      const rows = data.rows || []
      const customer = this.getRecordCustomerInfo(record)
      const activeTemplateCode = this.normalizeTemplateCode(templateCode)
      const isRp01Template = activeTemplateCode === 'OUTBOUND_RP01'
      const titleText = isRp01Template ? '出货检测报告（RP01）' : '出货检测报告'
      const formNoText = isRp01Template ? 'RP01-QC-01' : 'FE-FR-GC-01'
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
            <title>${this.escapeHtml(titleText)}-${this.escapeHtml(record.inspectionNo || '')}</title>
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
              .left { text-align: left; }
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
                <div class="title">${this.escapeHtml(titleText)}</div>
                <div class="form-no">${this.escapeHtml(formNoText)}</div>
              </div>

              <div class="sec-title">A. 产品与检测条件</div>
              <table class="meta-table">
                <tr>
                  <td class="label">产品名称</td>
                  <td>${this.escapeHtml(this.getMappedDisplayInfo(record).materialName)}</td>
                  <td class="label">产品料号</td>
                  <td>${this.escapeHtml(this.getMappedDisplayInfo(record).materialCode)}</td>
                  <td class="label">出货规格</td>
                  <td>${this.escapeHtml(record.specification || '-')}</td>
                </tr>
                <tr>
                  <td class="label">净重</td>
                  <td>${this.escapeHtml(record.netWeight || '-')}</td>
                  <td class="label">检测环境</td>
                  <td>23±5℃，50±5%</td>
                  <td class="label">批次号</td>
                  <td>${this.escapeHtml(record.batchNo || '-')}</td>
                </tr>
                <tr>
                  <td class="label">数量（卷）</td>
                  <td>${this.escapeHtml(record.sampleQty || '-')}</td>
                  <td class="label">订单号</td>
                  <td>${this.escapeHtml(record.sourceOrderNo || '-')}</td>
                  <td class="label">质检单号</td>
                  <td>${this.escapeHtml(record.inspectionNo || '-')}</td>
                </tr>
                ${isRp01Template ? `
                <tr>
                  <td class="label">客户代码</td>
                  <td>${this.escapeHtml(customer.customerCode || '-')}</td>
                  <td class="label">客户名称</td>
                  <td>${this.escapeHtml(customer.customerName || '-')}</td>
                  <td class="label">模板编码</td>
                  <td>${this.escapeHtml(activeTemplateCode)}</td>
                </tr>
                ` : ''}
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
            if (iframe.parentNode) {
              iframe.parentNode.removeChild(iframe)
            }
          }, 1000)
        }
      }, 200)
    },
    buildProcessSnapshot(material, summary) {
      return JSON.stringify({
        sourceOrderNo: this.form.sourceOrderNo || '',
        customerCode: this.currentOrderCustomerCode || '',
        customerName: this.currentOrderCustomerName || '',
        materialCode: this.form.materialCode || '',
        materialName: this.form.materialName || '',
        customerMaterialCode: this.customerMaterialMapping ? (this.customerMaterialMapping.customerMaterialCode || '') : '',
        customerMaterialName: this.customerMaterialMapping ? (this.customerMaterialMapping.customerMaterialName || '') : '',
        widthTarget: this.widthTarget,
        widthTolerance: this.widthTolerance,
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
      this.materialOptions = this.rawMaterials.slice()
      this.orderItems = []
      this.orderMaterialOptions = []
      this.orderSpecOptions = []
      this.selectedOrderItemId = null
      this.currentOrderCustomerCode = ''
      this.currentOrderCustomerName = ''
      this.customerMaterialMapping = null
      this.selectedBatchNos = []
      this.batchOptions = []
    },
    submitForm() {
      this.$refs.form.validate(async valid => {
        if (!valid) return
        this.syncMeasuredParamsFromRows()
        const material = (this.rawMaterials || []).find(item => item.materialCode === this.form.materialCode)
        let summary = null
        if (material && material.performanceParams) {
          summary = evaluateQcRules(material.performanceParams, this.form.measuredParams)
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
          processSnapshot: this.buildProcessSnapshot(material, summary)
        }
        const res = await createOutboundInspection(payload)
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
      this.form = {
        sourceOrderNo: '',
        batchNo: '',
        rollCode: '',
        materialCode: '',
        materialName: '',
        materialSpec: '',
        sampleQty: 0,
        passQty: 0,
        failQty: 0,
        overallResult: 'pending',
        inspectorName: '',
        defectType: '',
        remark: ''
      }
      this.widthTarget = null
      this.widthTolerance = 0.5
      this.form.measuredParams = '{}'
      this.qcRuleText = ''
      this.measuredRows = []
      this.orderItems = []
      this.orderMaterialOptions = []
      this.orderSpecOptions = []
      this.selectedOrderItemId = null
      this.selectedOrderQty = 0
      this.currentOrderCustomerCode = ''
      this.currentOrderCustomerName = ''
      this.customerMaterialMapping = null
      this.selectedBatchNos = []
      this.materialOptions = this.rawMaterials.slice()
      this.batchOptions = []
      this.batchHistoryRows = []
      this.batchHistoryVisible = false
    },
    async handleDelete(row) {
      this.$confirm('确认删除该记录？', '提示', { type: 'warning' }).then(async() => {
        const res = await deleteOutboundInspection(row.id)
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

.muted-tip {
  margin-bottom: 6px;
  color: #909399;
  font-size: 12px;
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
