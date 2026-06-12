<template>
  <div class="inbound-container">
    <el-card>
      <div slot="header" class="clearfix">
        <span>入库申请</span>
        <div style="float: right">
          <el-button type="success" icon="el-icon-s-order" size="small" @click="openBatchScanDialog">批量扫码入库</el-button>
          <el-button type="primary" icon="el-icon-plus" size="small" @click="handleAdd">新增入库申请</el-button>
        </div>
      </div>

      <!-- 查询表单 -->
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="全部状态" clearable style="width: 120px">
            <el-option label="待审批" :value="0" />
            <el-option label="已通过" :value="1" />
            <el-option label="已拒绝" :value="2" />
            <el-option label="已取消" :value="3" />
          </el-select>
        </el-form-item>
        <el-form-item label="料号">
          <el-input v-model="searchForm.materialCode" placeholder="请输入料号" clearable style="width: 160px" />
        </el-form-item>
        <el-form-item label="来源">
          <el-select v-model="searchForm.sourceType" placeholder="全部来源" clearable style="width: 180px">
            <el-option label="采购收货" value="PURCHASE_RECEIVING" />
            <el-option label="销售退货" value="SALES_RETURN" />
            <el-option label="生产部-涂布车间" value="PROD_COATING" />
            <el-option label="生产部-包装车间" value="PROD_PACKAGING" />
            <el-option label="生产部(全部)" value="PRODUCTION" />
            <el-option label="其他" value="OTHER" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="el-icon-search" @click="handleSearch">搜 索</el-button>
          <el-button icon="el-icon-refresh-left" @click="handleReset">重 置</el-button>
        </el-form-item>
      </el-form>

      <!-- 数据表格 -->
      <el-table ref="inboundTable" v-loading="loading" :data="list" style="width: 100%; margin-top: 15px" border stripe @sort-change="handleTableSortChange">
        <el-table-column label="序号" type="index" width="70" align="center" :index="computeRowIndex" />
        <el-table-column prop="__orderNo" label="订单号" width="170" show-overflow-tooltip sortable="custom">
          <template slot-scope="scope">
            {{ displayOrderNo(scope.row) }}
          </template>
        </el-table-column>
        <el-table-column prop="materialCode" label="料号" width="180" sortable="custom" />
        <el-table-column prop="__productName" label="产品名称" width="160" show-overflow-tooltip sortable="custom">
          <template slot-scope="scope">
            {{ displayProductName(scope.row) }}
          </template>
        </el-table-column>
        <el-table-column prop="batchNo" label="生产批次号" width="130" sortable="custom">
          <template slot-scope="scope">
            {{ displayProductionBatchNo(scope.row) }}
          </template>
        </el-table-column>
        <el-table-column prop="customerBatchNo" label="供商批次号" width="150" show-overflow-tooltip sortable="custom">
          <template slot-scope="scope">
            {{ displayCustomerBatchNo(scope.row) }}
          </template>
        </el-table-column>
        <el-table-column prop="__sequenceNo" label="数字号" width="90" align="center" sortable="custom">
          <template slot-scope="scope">
            {{ displaySequenceNo(scope.row) }}
          </template>
        </el-table-column>
        <el-table-column prop="__specDesc" label="规格" width="160" sortable="custom">
          <template slot-scope="scope">
            {{ formatSpecDesc(scope.row) }}
          </template>
        </el-table-column>
        <el-table-column prop="rolls" label="入库数量" width="110" align="center" sortable="custom">
          <template slot-scope="scope">
            <el-tag type="success">{{ formatInboundQty(scope.row) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="location" label="卡板位" width="80" align="center" sortable="custom" />
        <el-table-column prop="applicant" label="申请人" width="90" sortable="custom" />
        <el-table-column prop="applyDept" label="申请部门" width="100" sortable="custom" />
        <el-table-column prop="status" label="状态" width="90" align="center" sortable="custom">
          <template slot-scope="scope">
            <el-tag :type="getStatusType(scope.row.status)">{{ getStatusText(scope.row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="applyTime" label="计划时间" width="140" sortable="custom">
          <template slot-scope="scope">
            {{ formatPlanTime(scope.row) }}
          </template>
        </el-table-column>
        <el-table-column prop="__actualArrivalTime" label="实际到货时间" width="140" sortable="custom">
          <template slot-scope="scope">
            {{ formatActualArrivalTime(scope.row) }}
          </template>
        </el-table-column>
        <el-table-column prop="__source" label="来源" min-width="160" show-overflow-tooltip sortable="custom">
          <template slot-scope="scope">
            <span>{{ parseInboundSource(scope.row) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="260" fixed="right">
          <template slot-scope="scope">
            <template v-if="scope.row.status === 0">
              <el-button type="text" size="small" icon="el-icon-check" @click="handleApprove(scope.row, true)">通过</el-button>
              <el-button type="text" size="small" icon="el-icon-close" @click="handleApprove(scope.row, false)">拒绝</el-button>
              <el-button type="text" size="small" icon="el-icon-delete" @click="handleCancel(scope.row)">取消</el-button>
            </template>
            <el-button
              v-if="canPrintPurchaseLabel(scope.row)"
              type="text"
              size="small"
              icon="el-icon-printer"
              @click="openPurchasePrintDialog(scope.row)"
            >打印标签</el-button>
            <span v-if="scope.row.status !== 0 && !canPrintPurchaseLabel(scope.row)" class="text-muted">已处理</span>
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

    <!-- 新增入库申请弹窗 -->
    <el-dialog title="新增入库申请" :visible.sync="dialogVisible" width="650px" :close-on-click-modal="false">
      <el-form ref="form" :model="form" :rules="rules" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="料号" prop="materialCode">
              <el-input v-model="form.materialCode" placeholder="如: 1011-R02-2307-G03-0350" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="产品名称" prop="productName">
              <el-input v-model="form.productName" placeholder="如: 30u无机翠绿PET胶带" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="生产批次号" prop="batchNo">
              <el-input v-model="form.batchNo" placeholder="如: 2601032B01" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="供商批次号" prop="customerBatchNo">
              <el-input v-model="form.customerBatchNo" placeholder="请填写供商批次号（供方追踪用）" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="入库数量" prop="rolls">
              <el-input v-model.number="form.rolls" placeholder="请输入数量" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="数量单位" prop="qtyUnit">
              <el-select v-model="form.qtyUnit" placeholder="请选择单位" style="width: 100%">
                <el-option label="支" value="支" />
                <el-option label="卷" value="卷" />
                <el-option label="㎡" value="㎡" />
                <el-option label="箱" value="箱" />
                <el-option label="个" value="个" />
                <el-option label="kg" value="kg" />
                <el-option label="桶" value="桶" />
                <el-option label="数量" value="数量" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="厚度μm" prop="thickness">
              <el-input v-model.number="form.thickness" placeholder="μm" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="宽度mm" prop="width">
              <el-input v-model.number="form.width" placeholder="mm" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="长度M" prop="length">
              <el-input v-model.number="form.length" placeholder="M" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="生产年份">
              <el-input v-model.number="form.prodYear" placeholder="年" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="生产月份">
              <el-input v-model.number="form.prodMonth" placeholder="月" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="生产日期">
              <el-input v-model.number="form.prodDay" placeholder="日" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="卡板位">
              <el-input v-model="form.location" placeholder="如: 18" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="申请部门">
              <el-input v-model="form.applyDept" placeholder="如: 生产部" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="备注信息" />
        </el-form-item>
      </el-form>
      <div slot="footer">
        <el-button @click="dialogVisible = false">取 消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="handleSubmit">提交申请</el-button>
      </div>
    </el-dialog>

    <!-- 审批弹窗 -->
    <el-dialog :title="approveTitle" :visible.sync="approveVisible" width="520px">
      <el-form label-width="80px">
        <template v-if="approveAction && !isSlittingInbound(approveRow)">
          <el-form-item label="申请母卷号">
            <el-input :value="approveRow ? approveRow.batchNo : ''" disabled />
          </el-form-item>
          <el-form-item label="扫码母卷号">
            <el-input v-model="scanRollCode" placeholder="请扫码母卷标签" clearable />
          </el-form-item>
          <el-form-item label="批量母卷号">
            <el-input
              v-model="scanRollCodes"
              type="textarea"
              :rows="2"
              placeholder="支持一次录入多个母卷号（换行/逗号/空格分隔）"
            />
          </el-form-item>
          <el-form-item label="扫码卡板位">
            <el-input v-model="scanLocation" placeholder="请扫码卡板位" clearable />
          </el-form-item>
        </template>
        <el-form-item label="审批备注">
          <el-input v-model="auditRemark" type="textarea" :rows="3" placeholder="请输入审批备注（可选）" />
        </el-form-item>
      </el-form>
      <div slot="footer">
        <el-button @click="approveVisible = false">取 消</el-button>
        <el-button type="primary" :loading="approveLoading" @click="confirmApprove">确 定</el-button>
      </div>
    </el-dialog>

    <!-- 独立批量扫码入库弹窗 -->
    <el-dialog title="批量扫码入库" :visible.sync="batchDialogVisible" width="560px">
      <el-form label-width="90px">
        <el-form-item label="扫码卡板位">
          <el-input v-model="batchScanLocation" placeholder="请扫码卡板位" clearable />
        </el-form-item>
        <el-form-item label="批量母卷号">
          <el-input
            v-model="batchScanRollCodes"
            type="textarea"
            :rows="6"
            placeholder="连续扫码母卷号（支持换行/逗号/空格分隔）"
          />
        </el-form-item>
        <el-form-item label="入库备注">
          <el-input v-model="batchAuditRemark" type="textarea" :rows="2" placeholder="可选" />
        </el-form-item>
      </el-form>
      <div slot="footer">
        <el-button @click="batchDialogVisible = false">取 消</el-button>
        <el-button type="primary" :loading="batchApproveLoading" @click="confirmBatchScanApprove">确 定</el-button>
      </div>
    </el-dialog>

    <!-- 批量入库结果明细 -->
    <el-dialog title="批量入库结果" :visible.sync="batchResultVisible" width="760px">
      <el-alert
        :title="`总计${batchResult.total}条，成功${batchResult.successCount}条，失败${batchResult.failCount}条`"
        :type="batchResult.failCount > 0 ? 'warning' : 'success'"
        :closable="false"
        show-icon
        style="margin-bottom: 12px"
      />
      <div v-if="batchResult.failCount > 0">
        <div style="margin-bottom: 8px; font-weight: 600;">失败明细</div>
        <el-table :data="batchResult.failed" border stripe size="mini" max-height="320">
          <el-table-column type="index" label="#" width="60" align="center" />
          <el-table-column prop="rollCode" label="母卷号" min-width="180" />
          <el-table-column prop="reason" label="失败原因" min-width="260" show-overflow-tooltip />
        </el-table>
      </div>
      <div v-else class="text-muted">全部匹配并入库成功。</div>
      <div slot="footer">
        <el-button type="primary" @click="batchResultVisible = false">我知道了</el-button>
      </div>
    </el-dialog>

    <el-dialog title="采购收货标签打印" :visible.sync="purchasePrintVisible" width="520px" :close-on-click-modal="false">
      <el-form label-width="110px">
        <el-form-item label="料号">
          <el-input :value="purchasePrintRow ? purchasePrintRow.materialCode : ''" disabled />
        </el-form-item>
        <el-form-item label="产品名称">
          <el-input :value="purchasePrintRow ? displayProductName(purchasePrintRow) : ''" disabled />
        </el-form-item>
        <el-form-item label="生产日期" required>
          <el-date-picker
            v-model="purchasePrintForm.productionDate"
            type="date"
            value-format="yyyy-MM-dd"
            placeholder="请选择生产日期"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="供商批次" required>
          <el-input v-model="purchasePrintForm.incomingBatchNo" placeholder="请输入供商批次" />
        </el-form-item>
        <el-form-item label="数量" required>
          <el-input-number v-model="purchasePrintForm.quantity" :min="1" :precision="0" style="width: 100%" />
        </el-form-item>
        <el-form-item label="打印张数" required>
          <el-input-number
            v-model="purchasePrintForm.copies"
            :min="1"
            :max="200"
            :precision="0"
            :disabled="!purchasePrintMeta.allowManualCopies"
            style="width: 100%"
          />
          <div class="text-muted" style="margin-top: 4px;">
            {{ purchaseCopiesHintText() }}
          </div>
        </el-form-item>
      </el-form>
      <div slot="footer">
        <el-button @click="purchasePrintVisible = false">取 消</el-button>
        <el-button type="primary" :loading="purchasePrintLoading" @click="confirmPurchasePrint">打 印</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import {
  getInboundList,
  createInboundRequest,
  approveInbound,
  approveInboundByRollCodes,
  cancelInbound,
  preparePurchaseInboundLabel
} from '@/api/tapeStock'
import { mapGetters } from 'vuex'
import elTableAutoLayout from '@/mixins/elTableAutoLayout'
import { printByScene } from '@/utils/printService'

export default {
  name: 'InboundRequest',
  mixins: [elTableAutoLayout],
  tableLayoutRefs: ['inboundTable'],
  data() {
    return {
      searchForm: {
        status: 0,
        materialCode: '',
        sourceType: ''
      },
      arrivalFocus: {
        active: false,
        receiptId: '',
        itemId: ''
      },
      list: [],
      sortState: { prop: '', order: '' },
      loading: false,
      pagination: { page: 1, size: 20, total: 0 },
      dialogVisible: false,
      submitLoading: false,
      form: this.getEmptyForm(),
      rules: {
        materialCode: [{ required: true, message: '请输入料号', trigger: 'blur' }],
        productName: [{ required: true, message: '请输入产品名称', trigger: 'blur' }],
        batchNo: [{ required: true, message: '请输入生产批次号', trigger: 'blur' }],
        customerBatchNo: [{ required: true, message: '请填写供商批次号', trigger: 'blur' }],
        rolls: [{ required: true, message: '请输入入库数量', trigger: 'blur' }],
        qtyUnit: [{ required: true, message: '请选择数量单位', trigger: 'change' }],
        thickness: [{ required: true, message: '请输入厚度', trigger: 'blur' }],
        width: [{ required: true, message: '请输入宽度', trigger: 'blur' }],
        length: [{ required: true, message: '请输入长度', trigger: 'blur' }]
      },
      approveVisible: false,
      approveLoading: false,
      approveTitle: '',
      approveRow: null,
      approveAction: true,
      auditRemark: '',
      scanRollCode: '',
      scanRollCodes: '',
      scanLocation: '',
      batchDialogVisible: false,
      batchApproveLoading: false,
      batchScanRollCodes: '',
      batchScanLocation: '',
      batchAuditRemark: '',
      batchResultVisible: false,
      batchResult: {
        total: 0,
        successCount: 0,
        failCount: 0,
        failed: []
      },
      purchasePrintVisible: false,
      purchasePrintLoading: false,
      purchasePrintRow: null,
      purchasePrintForm: {
        productionDate: '',
        incomingBatchNo: '',
        quantity: 1,
        copies: 1
      },
      purchasePrintMeta: {
        allowManualCopies: false,
        materialCategory: ''
      }
    }
  },
  computed: {
    ...mapGetters(['name'])
  },
  watch: {
    '$route.query.msgId'() {
      this.applyArrivalQueryFilterFromRoute()
      this.fetchData()
      this.handleArrivalMessageHint()
    }
  },
  created() {
    this.applyArrivalQueryFilterFromRoute()
    this.fetchData()
    this.handleArrivalMessageHint()
  },
  methods: {
    handleTableSortChange({ prop, order }) {
      this.sortState = { prop: prop || '', order: order || '' }
      this.list = this.applySortOnRows(this.list)
    },
    getSortValue(row, prop) {
      if (!row) return ''
      if (prop === '__orderNo') return this.displayOrderNo(row)
      if (prop === '__productName') return this.displayProductName(row)
      if (prop === '__sequenceNo') {
        const seq = Number(this.displaySequenceNo(row))
        return Number.isFinite(seq) ? seq : -1
      }
      if (prop === '__specDesc') return this.formatSpecDesc(row)
      if (prop === '__source') return this.parseInboundSource(row)
      if (prop === '__actualArrivalTime') {
        const t = this.toTimeValue(row && row.auditTime)
        return Number.isFinite(t) ? t : 0
      }
      if (prop === 'applyTime') {
        const t = new Date(row.applyTime || 0).getTime()
        return Number.isFinite(t) ? t : 0
      }
      if (prop === 'rolls') {
        const qty = Number(row.rolls)
        return Number.isFinite(qty) ? qty : 0
      }
      if (prop === 'status') return Number(row.status || 0)
      return row[prop]
    },
    applySortOnRows(rows) {
      const arr = (rows || []).slice()
      const prop = this.sortState && this.sortState.prop
      const order = this.sortState && this.sortState.order
      if (!prop || !order) return arr
      const factor = order === 'ascending' ? 1 : -1
      arr.sort((a, b) => {
        const va = this.getSortValue(a, prop)
        const vb = this.getSortValue(b, prop)
        const na = Number(va)
        const nb = Number(vb)
        const naOk = Number.isFinite(na)
        const nbOk = Number.isFinite(nb)
        if (naOk && nbOk) return (na - nb) * factor
        const sa = va === null || va === undefined ? '' : String(va)
        const sb = vb === null || vb === undefined ? '' : String(vb)
        return sa.localeCompare(sb, 'zh-CN') * factor
      })
      return arr
    },
    isApiSuccess(res) {
      return !!res && (res.code === 200 || res.code === 20000)
    },
    formatSpecDesc(row) {
      if (!row) return '-'
      const sourceType = this.resolveInboundSourceType(row)
      const specDesc = row.specDesc ? String(row.specDesc).trim() : ''

      // 采购来料规格必须以采购端原文为准（如 6mm*77mm*1080m），
      // 不能按系统默认 μm 模板“重写显示”。
      if (sourceType === 'PURCHASE_RECEIVING' && specDesc) {
        return specDesc
      }

      const t = Number(row.thickness)
      const w = Number(row.width)
      const l = Number(row.length)
      const hasFullDims = Number.isFinite(t) && t > 0 && Number.isFinite(w) && w > 0 && Number.isFinite(l) && l > 0
      if (hasFullDims) {
        return `${t}μm*${w}mm*${l}m`
      }
      return specDesc || '-'
    },
    displayProductName(row) {
      if (!row) return '-'
      const name = row.productName ? String(row.productName).trim() : ''
      if (name) return name
      const code = row.materialCode ? String(row.materialCode).trim() : ''
      return code || '-'
    },
    displayOrderNo(row) {
      if (!row) return '-'
      const orderNo = this.extractInboundTokenFromRemark(row.remark, 'orderNo')
      if (orderNo) return orderNo
      const purchaseOrderNo = this.extractInboundTokenFromRemark(row.remark, 'purchaseOrderNo')
      if (purchaseOrderNo) return purchaseOrderNo
      const receiptNo = this.extractInboundTokenFromRemark(row.remark, 'receiptNo')
      if (receiptNo) return receiptNo
      return '-'
    },
    displaySequenceNo(row) {
      if (!row) return '-'
      const direct = row.sequenceNo ?? row.sequence_no ?? row.digitalNo ?? row.numberNo ?? row.printNumber ?? row.printNo
      if (direct !== null && direct !== undefined && String(direct).trim() !== '') {
        return String(direct).trim()
      }

      const text = String((row && row.remark) || '')
      const m = text.match(/数字号\s*[:：=]\s*([^；;,\s|]+)/)
      if (m && m[1]) return String(m[1]).trim()
      return '-'
    },
    formatPlanTime(row) {
      if (!row || !row.applyTime) return '-'
      const d = this.toValidDate(row.applyTime)
      if (!d) return '-'
      const yy = String(d.getFullYear()).slice(-2)
      const mm = String(d.getMonth() + 1).padStart(2, '0')
      const dd = String(d.getDate()).padStart(2, '0')
      const hh = String(d.getHours()).padStart(2, '0')
      return `${yy}-${mm}-${dd} ${hh}`
    },
    formatActualArrivalTime(row) {
      if (!row) return '-'
      if (Number(row.status) !== 1) return '-'
      const d = this.toValidDate(row.auditTime)
      if (!d) return '-'
      const yy = String(d.getFullYear()).slice(-2)
      const mm = String(d.getMonth() + 1).padStart(2, '0')
      const dd = String(d.getDate()).padStart(2, '0')
      const hh = String(d.getHours()).padStart(2, '0')
      return `${yy}-${mm}-${dd} ${hh}`
    },
    toValidDate(value) {
      if (!value) return null
      const d = new Date(value)
      return Number.isFinite(d.getTime()) ? d : null
    },
    toTimeValue(value) {
      const d = this.toValidDate(value)
      return d ? d.getTime() : NaN
    },
    displayProductionBatchNo(row) {
      if (!row) return '-'
      const sourceType = this.resolveInboundSourceType(row)
      if (sourceType === 'PURCHASE_RECEIVING') {
        return '-'
      }
      const text = String((row && row.batchNo) || '').trim()
      return text || '-'
    },
    displayCustomerBatchNo(row) {
      if (!row) return '-'
      const sourceType = this.resolveInboundSourceType(row)
      // 生产入库不展示供商批次号
      if (sourceType === 'PROD_COATING' || sourceType === 'PROD_PACKAGING' || sourceType === 'PRODUCTION') {
        return '-'
      }

      // 来料场景：以打印标签时填写的来料批次号（回写customerBatchNo）为准
      if (sourceType === 'PURCHASE_RECEIVING') {
        const purchaseBatch = String((row && row.customerBatchNo) || '').trim() ||
          this.extractInboundTokenFromRemark(row && row.remark, 'customerBatchNo') ||
          this.extractInboundTokenFromRemark(row && row.remark, 'incomingBatchNo')
        return purchaseBatch || '-'
      }

      const text = String((row && row.customerBatchNo) || '').trim()
      return text || '-'
    },
    formatInboundQty(row) {
      if (!row) return '-'
      const qtyNum = Number(row.rolls)
      const qtyText = Number.isFinite(qtyNum) ? String(qtyNum) : (row.rolls === null || row.rolls === undefined ? '-' : String(row.rolls))
      if (qtyText === '-') return qtyText
      const unit = this.resolveInboundQtyUnit(row)
      return unit ? `${qtyText}${unit}` : qtyText
    },
    resolveInboundQtyUnit(row) {
      const unit = row && row.qtyUnit ? String(row.qtyUnit).trim() : ''
      const code = String((row && row.materialCode) || '').trim()
      const name = String((row && (row.productName || row.materialName)) || '').trim()
      const spec = String((row && row.specDesc) || '').trim()
      // PE管强制显示为支
      if (/PEG/i.test(code) || /PE管/i.test(name) || /PE管/i.test(spec)) {
        return '支'
      }
      if (unit) return unit
      const unitFromToken = this.extractInboundTokenFromRemark(row && row.remark, 'qtyUnit')
      if (unitFromToken) return unitFromToken
      const sourceType = this.resolveInboundSourceType(row)
      return sourceType === 'SALES_RETURN' || sourceType === 'PROD_COATING' || sourceType === 'PROD_PACKAGING' || sourceType === 'PRODUCTION'
        ? '卷'
        : (sourceType === 'PURCHASE_RECEIVING' ? '卷' : '数量')
    },
    parseInboundSource(row) {
      if (!row) return '-'
      const sourceType = this.resolveInboundSourceType(row)
      if (sourceType === 'SALES_RETURN') {
        const remark = String(row.remark || '')
        const m = remark.match(/returnNo=([^|]+)/)
        const returnNo = m && m[1] ? m[1] : ''
        return returnNo ? `销售退货：${returnNo}` : '销售退货'
      }
      const map = {
        PURCHASE_RECEIVING: '采购收货',
        PROD_COATING: '生产部-涂布车间',
        PROD_PACKAGING: '生产部-包装车间',
        PRODUCTION: '生产部',
        OTHER: '其他'
      }
      return map[sourceType] || row.applyDept || row.remark || '-'
    },
    resolveInboundSourceType(row) {
      if (!row) return 'OTHER'
      const remark = String((row && row.remark) || '').toUpperCase()
      const batchNo = String((row && row.batchNo) || '').toUpperCase()
      const requestNo = String((row && row.requestNo) || '').toUpperCase()
      const applyDept = String((row && row.applyDept) || '').toUpperCase()

      if (remark.includes('[SALES_RETURN]')) return 'SALES_RETURN'
      if (remark.includes('[PURCHASE_RECEIPT]') || applyDept.includes('采购')) return 'PURCHASE_RECEIVING'
      if (applyDept.includes('生产')) {
        if (
          remark.includes('PROCESS=SLITTING') ||
          remark.includes('PROCESS=SLIT') ||
          remark.includes('PROCESS=REWINDING') ||
          remark.includes('PROCESS=PACKAGING') ||
          batchNo.includes('-SLITTING-') ||
          batchNo.includes('-SLIT-')
        ) {
          return 'PROD_PACKAGING'
        }
        if (
          remark.includes('PROCESS=COATING') ||
          requestNo.includes('MANUAL-COATING-') ||
          remark.includes('MANUAL-COATING')
        ) {
          return 'PROD_COATING'
        }
        return 'PROD_COATING'
      }
      return 'OTHER'
    },
    isSlittingInbound(row) {
      if (!row) return false
      const remark = String(row.remark || '').toUpperCase()
      const batchNo = String(row.batchNo || '').toUpperCase()
      return remark.includes('PROCESS=SLITTING') ||
        remark.includes('PROCESS=SLIT') ||
        batchNo.includes('-SLITTING-') ||
        batchNo.includes('-SLIT-')
    },
    canPrintPurchaseLabel(row) {
      if (!row || row.isAggregated) return false
      return this.resolveInboundSourceType(row) === 'PURCHASE_RECEIVING' && !!row.id
    },
    todayDateString() {
      const d = new Date()
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${y}-${m}-${day}`
    },
    openPurchasePrintDialog(row) {
      if (!this.canPrintPurchaseLabel(row)) return
      const isPaperBoxTube = this.isPaperBoxOrTubeLike(row)
      this.purchasePrintRow = row
      this.purchasePrintMeta = {
        allowManualCopies: !isPaperBoxTube,
        materialCategory: ''
      }
      const qty = Math.max(1, Number((row && row.rolls) || 1) || 1)
      this.purchasePrintForm = {
        productionDate: this.resolveRowProductionDate(row) || this.todayDateString(),
        incomingBatchNo: '',
        quantity: qty,
        copies: isPaperBoxTube ? 1 : qty
      }
      this.purchasePrintVisible = true
    },
    purchaseCopiesHintText() {
      return this.purchasePrintMeta && this.purchasePrintMeta.allowManualCopies
        ? '默认按数量自动带出，可手工修改。'
        : '纸箱/纸管类每个入仓规格固定打印1张。'
    },
    isPaperBoxOrTubeLike(row) {
      const code = String((row && row.materialCode) || '').trim().toUpperCase()
      const name = String((row && row.productName) || '').trim()
      const spec = String((row && row.specDesc) || '').trim()
      const unit = String(this.resolveInboundQtyUnit(row) || '').trim()
      return code.startsWith('ZX') || code.includes('PEG') || name.includes('纸箱') || name.includes('纸管') || name.includes('管') || spec.includes('纸箱') || spec.includes('纸管') || spec.includes('管') || unit === '箱' || unit === '支' || unit === '个'
    },
    resolveRowProductionDate(row) {
      const prodDate = String((row && row.prodDate) || '').trim()
      if (/^\d{4}-\d{2}-\d{2}$/.test(prodDate)) return prodDate
      const y = Number(row && row.prodYear)
      const m = Number(row && row.prodMonth)
      const d = Number(row && row.prodDay)
      if (Number.isFinite(y) && Number.isFinite(m) && Number.isFinite(d) && y > 0 && m > 0 && d > 0) {
        const fullYear = y < 100 ? 2000 + y : y
        return `${String(fullYear).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      }
      return ''
    },
    getPurchasePrintScene() {
      return {
        sceneName: '采购收货标签',
        bizType: 'PURCHASE_RECEIPT_LABEL',
        defaultTemplate: 'INCOMINGLABEL',
        customerCode: '',
        buildOptions: (source) => ({
          copies: 1,
          jobName: `PURCHASE_RECEIPT_LABEL_${String((source && (source.QRcode || source.QRCode || source.qrCode || source.qrContent)) || Date.now())}`
        }),
        buildData: source => ({ ...(source || {}) })
      }
    },
    async confirmPurchasePrint() {
      const row = this.purchasePrintRow
      if (!row || !row.id) {
        this.$message.warning('请选择有效的采购收货入库申请')
        return
      }
      if (!this.purchasePrintForm.productionDate) {
        this.$message.warning('请选择生产日期')
        return
      }
      if (!String(this.purchasePrintForm.incomingBatchNo || '').trim()) {
        this.$message.warning('请填写供商批次号（来料批次）')
        return
      }
      const quantity = Number(this.purchasePrintForm.quantity)
      if (!Number.isFinite(quantity) || quantity <= 0) {
        this.$message.warning('数量必须大于0')
        return
      }

      this.purchasePrintLoading = true
      try {
        const payload = {
          productionDate: this.purchasePrintForm.productionDate,
          incomingBatchNo: String(this.purchasePrintForm.incomingBatchNo || '').trim(),
          manualBatchNo: true,
          quantity: Math.trunc(quantity),
          copies: Math.max(1, Math.trunc(Number(this.purchasePrintForm.copies) || 1)),
          operator: this.name
        }
        const res = await preparePurchaseInboundLabel(row.id, payload)
        if (!this.isApiSuccess(res)) {
          this.$message.error((res && res.msg) || '标签数据生成失败')
          return
        }

        const data = (res && res.data) || {}
        const labels = Array.isArray(data.labels) ? data.labels : []
        if (!labels.length) {
          this.$message.warning('未生成可打印标签数据')
          return
        }

        this.purchasePrintMeta.allowManualCopies = !!data.allowManualCopies
        this.purchasePrintMeta.materialCategory = String(data.materialCategory || '')
        if (!this.purchasePrintMeta.allowManualCopies) {
          this.purchasePrintForm.copies = 1
        }

        const scene = this.getPurchasePrintScene()
        for (let i = 0; i < labels.length; i++) {
          const label = labels[i]
          await printByScene(scene, label, {})
        }

        this.$message.success(`标签打印完成，共${labels.length}张`)
        this.purchasePrintVisible = false
      } catch (e) {
        this.$message.error((e && e.message) || '标签打印失败')
      } finally {
        this.purchasePrintLoading = false
      }
    },
    getEmptyForm() {
      return {
        materialCode: '',
        productName: '',
        batchNo: '',
        customerBatchNo: '',
        rolls: 1,
        qtyUnit: '卷',
        thickness: null,
        width: null,
        length: null,
        prodYear: 26,
        prodMonth: 1,
        prodDay: 1,
        location: '',
        applyDept: '',
        remark: ''
      }
    },
    extractInboundTokenFromRemark(remark, key) {
      const text = String(remark || '')
      if (!text || !key) return ''
      const escapedKey = String(key).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const reg = new RegExp(`(?:^|[|,;\\s])${escapedKey}=([^|,;]+)`, 'i')
      const m = text.match(reg)
      return m && m[1] ? String(m[1]).trim() : ''
    },
    aggregateInboundRows(rows) {
      const src = Array.isArray(rows) ? rows : []
      const pending = src.filter(r => Number((r && r.status) || 0) === 0)
      const done = src.filter(r => Number((r && r.status) || 0) !== 0)
      const groupMap = new Map()

      done.forEach(row => {
        const key = [
          row.materialCode || '',
          row.customerBatchNo || '',
          this.formatSpecDesc(row),
          this.resolveInboundQtyUnit(row),
          row.applyDept || '',
          row.location || '',
          row.status || ''
        ].join('|')
        if (!groupMap.has(key)) {
          groupMap.set(key, {
            ...row,
            sourceRows: [row],
            specDesc: this.formatSpecDesc(row)
          })
          return
        }
        const agg = groupMap.get(key)
        agg.sourceRows.push(row)
        agg.rolls = Number(agg.rolls || 0) + Number(row.rolls || 0)
        const t1 = new Date(agg.applyTime || 0).getTime() || 0
        const t2 = new Date(row.applyTime || 0).getTime() || 0
        if (t2 > t1) {
          agg.applyTime = row.applyTime
        }
      })

      const aggregated = Array.from(groupMap.values()).map(item => {
        if (!item.sourceRows || item.sourceRows.length <= 1) {
          item.isAggregated = false
          return item
        }
        const size = item.sourceRows.length
        const batchSet = new Set(item.sourceRows.map(x => x.batchNo).filter(Boolean))
        const applicantSet = new Set(item.sourceRows.map(x => x.applicant).filter(Boolean))
        return {
          ...item,
          isAggregated: true,
          id: `IN-AGG-${item.materialCode || ''}-${item.specDesc || ''}-${item.status || ''}-${size}`,
          requestNo: `聚合${size}条`,
          batchNo: batchSet.size <= 1 ? (item.batchNo || '-') : `多批次(${batchSet.size})`,
          applicant: applicantSet.size <= 1 ? (item.applicant || '-') : `多人(${applicantSet.size})`
        }
      })

      return [...pending, ...aggregated]
    },
    applyArrivalQueryFilterFromRoute() {
      const query = (this.$route && this.$route.query) || {}
      const source = String(query.source || '')
      if (source !== 'purchase-receipt') {
        this.arrivalFocus = { active: false, receiptId: '', itemId: '' }
        return
      }

      const receiptId = String(query.receiptId || '').trim()
      const itemId = String(query.itemId || '').trim()
      const materialCode = String(query.materialCode || '').trim()
      this.arrivalFocus = {
        active: !!(receiptId || itemId),
        receiptId,
        itemId
      }

      // 到货提醒默认聚焦待审批，便于仓库直接处理
      this.searchForm.status = 0
      if (materialCode) {
        this.searchForm.materialCode = materialCode
      }
      this.pagination.page = 1
    },
    toPositiveNumberOrUndefined(value) {
      const n = Number(value)
      return Number.isFinite(n) && n > 0 ? n : undefined
    },
    computeRowIndex(index) {
      const page = Number(this.pagination.page) || 1
      const size = Number(this.pagination.size) || 20
      return (page - 1) * size + index + 1
    }, async fetchData() {
      this.loading = true
      try {
        const receiptId = this.arrivalFocus.active ? this.toPositiveNumberOrUndefined(this.arrivalFocus.receiptId) : undefined
        const itemId = this.arrivalFocus.active ? this.toPositiveNumberOrUndefined(this.arrivalFocus.itemId) : undefined
        const params = {
          page: this.pagination.page,
          size: this.pagination.size,
          status: this.searchForm.status === null || this.searchForm.status === undefined || this.searchForm.status === '' ? undefined : this.searchForm.status,
          materialCode: this.searchForm.materialCode ? this.searchForm.materialCode.trim() : undefined,
          sourceType: this.searchForm.sourceType || undefined,
          receiptId,
          itemId
        }
        const res = await getInboundList(params)
        if (this.isApiSuccess(res)) {
          const records = Array.isArray(res.data.records) ? res.data.records : []
          const total = Number(res.data.total) || 0
          this.list = this.applySortOnRows(records)
          this.pagination.total = total
        }
      } catch (e) {
        console.error(e)
      } finally {
        this.loading = false
        this.scheduleTableLayout()
      }
    },
    handleSearch() {
      this.pagination.page = 1
      this.fetchData()
    },
    handleArrivalMessageHint() {
      const query = (this.$route && this.$route.query) || {}
      const source = query.source || ''
      const receiptNo = query.receiptNo || ''
      const materialName = query.materialName || ''
      if (source !== 'purchase-receipt') {
        return
      }
      const msgId = query.msgId ? String(query.msgId) : ''
      if (msgId && this._lastMessageHintId === msgId) {
        return
      }
      this._lastMessageHintId = msgId
      if (receiptNo && materialName) {
        this.$message.info(`到货提醒：${receiptNo} / ${materialName}，已为你定位到待审批入库申请。`)
      } else if (receiptNo) {
        this.$message.info(`到货提醒：${receiptNo}，已为你定位到待审批入库申请。`)
      } else {
        this.$message.info('有新的到货信息，已为你定位到待审批入库申请。')
      }
    },
    handleReset() {
      this.searchForm = { status: 0, materialCode: '', sourceType: '' }
      this.arrivalFocus = { active: false, receiptId: '', itemId: '' }
      this.handleSearch()
    },
    handleSizeChange(size) {
      this.pagination.size = size
      this.pagination.page = 1
      this.fetchData()
    },
    handleCurrentChange(page) {
      this.pagination.page = page
      this.fetchData()
    },
    handleAdd() {
      this.form = this.getEmptyForm()
      this.form.applicant = this.name
      this.dialogVisible = true
    },
    openBatchScanDialog() {
      this.batchScanRollCodes = ''
      this.batchScanLocation = ''
      this.batchAuditRemark = ''
      this.batchDialogVisible = true
    },
    async handleSubmit() {
      this.$refs.form.validate(async(valid) => {
        if (!valid) return
        this.submitLoading = true
        try {
          this.form.applicant = this.name
          this.form.customerBatchNo = String(this.form.customerBatchNo || '').trim()
          this.form.qtyUnit = this.form.qtyUnit || '卷'
          const res = await createInboundRequest(this.form)
          if (this.isApiSuccess(res)) {
            this.$message.success('申请提交成功')
            this.dialogVisible = false
            this.fetchData()
          } else {
            this.$message.error(res.msg || '提交失败')
          }
        } catch (e) {
          this.$message.error('提交失败')
        } finally {
          this.submitLoading = false
        }
      })
    },
    handleApprove(row, approved) {
      this.approveRow = row
      this.approveAction = approved
      this.approveTitle = approved ? '审批通过' : '审批拒绝'
      this.auditRemark = ''
      this.scanRollCode = ''
      this.scanRollCodes = ''
      const isSlitting = this.isSlittingInbound(row)
      this.scanLocation = isSlitting ? '' : ((row && row.location && row.location !== '待上架') ? row.location : '')
      this.approveVisible = true
    },
    parseRollCodes(text) {
      if (!text) return []
      return String(text)
        .split(/[\n,，;；\s]+/g)
        .map(x => x && x.trim())
        .filter(Boolean)
    },
    showBatchResult(data) {
      const result = data || {}
      this.batchResult = {
        total: Number(result.total || 0),
        successCount: Number(result.successCount || 0),
        failCount: Number(result.failCount || 0),
        failed: Array.isArray(result.failed) ? result.failed : []
      }
      this.batchResultVisible = true
    },
    async confirmBatchScanApprove() {
      const multiCodes = this.parseRollCodes(this.batchScanRollCodes)
      const location = this.batchScanLocation ? String(this.batchScanLocation).trim() : ''
      if (!multiCodes.length) {
        this.$message.warning('请先录入母卷号')
        return
      }
      if (!location) {
        this.$message.warning('请扫码卡板位')
        return
      }
      this.batchApproveLoading = true
      try {
        const res = await approveInboundByRollCodes({
          rollCodes: multiCodes,
          auditor: this.name,
          auditRemark: this.batchAuditRemark,
          scannedLocation: location
        })
        if (this.isApiSuccess(res)) {
          const data = res.data || {}
          const successCount = Number(data.successCount || 0)
          const failCount = Number(data.failCount || 0)
          this.$message.success(`批量完成：成功${successCount}，失败${failCount}`)
          this.batchDialogVisible = false
          this.showBatchResult(data)
          this.fetchData()
        } else {
          this.$message.error(res.msg || '批量审批失败')
        }
      } catch (e) {
        this.$message.error('批量审批失败')
      } finally {
        this.batchApproveLoading = false
      }
    },
    async confirmApprove() {
      if (this.approveAction) {
        const isSlitting = this.isSlittingInbound(this.approveRow)
        const expected = this.approveRow && this.approveRow.batchNo ? String(this.approveRow.batchNo).trim() : ''
        const multiCodes = this.parseRollCodes(this.scanRollCodes)
        const scanned = this.scanRollCode ? String(this.scanRollCode).trim() : (multiCodes.length === 1 ? multiCodes[0] : '')
        const location = this.scanLocation ? String(this.scanLocation).trim() : ''
        if (!isSlitting) {
          if (!scanned && multiCodes.length === 0) {
            this.$message.warning('请扫码母卷号')
            return
          }
          if (multiCodes.length <= 1 && expected && scanned && expected.toUpperCase() !== scanned.toUpperCase()) {
            this.$message.error('扫码母卷号与申请批次不一致')
            return
          }
          if (!location) {
            this.$message.warning('请扫码卡板位')
            return
          }
        }

        if (!isSlitting && multiCodes.length > 1) {
          this.approveLoading = true
          try {
            const res = await approveInboundByRollCodes({
              rollCodes: multiCodes,
              auditor: this.name,
              auditRemark: this.auditRemark,
              scannedLocation: location
            })
            if (this.isApiSuccess(res)) {
              const data = res.data || {}
              const successCount = Number(data.successCount || 0)
              const failCount = Number(data.failCount || 0)
              this.$message.success(`批量完成：成功${successCount}，失败${failCount}`)
              this.approveVisible = false
              this.showBatchResult(data)
              this.fetchData()
            } else {
              this.$message.error(res.msg || '批量审批失败')
            }
          } catch (e) {
            this.$message.error('批量审批失败')
          } finally {
            this.approveLoading = false
          }
          return
        }
      }

      this.approveLoading = true
      try {
        const res = await approveInbound(
          this.approveRow.id,
          this.approveAction,
          this.name,
          this.auditRemark,
          this.isSlittingInbound(this.approveRow) ? '' : this.scanRollCode,
          this.isSlittingInbound(this.approveRow) ? '' : this.scanLocation
        )
        if (this.isApiSuccess(res)) {
          this.$message.success(this.approveAction ? '已通过' : '已拒绝')
          this.approveVisible = false
          this.fetchData()
        } else {
          this.$message.error(res.msg || '操作失败')
        }
      } catch (e) {
        this.$message.error('操作失败')
      } finally {
        this.approveLoading = false
      }
    },
    handleCancel(row) {
      this.$confirm('确定要取消该入库申请吗?', '提示', { type: 'warning' }).then(async() => {
        try {
          const res = await cancelInbound(row.id)
          if (this.isApiSuccess(res)) {
            this.$message.success('已取消')
            this.fetchData()
          } else {
            this.$message.error(res.msg || '取消失败')
          }
        } catch (e) {
          this.$message.error('取消失败')
        }
      })
    },
    getStatusType(status) {
      const map = { 0: 'warning', 1: 'success', 2: 'danger', 3: 'info' }
      return map[status] || 'info'
    },
    getStatusText(status) {
      const map = { 0: '待审批', 1: '已通过', 2: '已拒绝', 3: '已取消' }
      return map[status] || '未知'
    }
  }
}
</script>

<style lang="scss" scoped>
.inbound-container {
  padding: 20px;
  .search-card, .toolbar-card { margin-bottom: 15px; }
  .el-pagination { margin-top: 15px; text-align: right; }
  .text-muted { color: #909399; }
}
</style>
