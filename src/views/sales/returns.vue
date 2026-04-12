<template>
  <div class="sales-returns">
    <el-card>
      <div slot="header" class="returns-header">
        <span class="card-title">销售退货</span>
        <el-button type="primary" size="small" icon="el-icon-plus" @click="openCreate">新增退货单</el-button>
      </div>

      <div class="search-area">
        <el-row :gutter="12">
          <el-col :span="5">
            <el-input v-model="searchForm.returnNo" clearable size="small" placeholder="退货单号" />
          </el-col>
          <el-col :span="5">
            <el-input v-model="searchForm.customer" clearable size="small" placeholder="客户代码/名称" />
          </el-col>
          <el-col :span="4">
            <el-date-picker v-model="searchForm.startDate" type="date" value-format="yyyy-MM-dd" size="small" placeholder="退货日期起" style="width:100%" />
          </el-col>
          <el-col :span="4">
            <el-date-picker v-model="searchForm.endDate" type="date" value-format="yyyy-MM-dd" size="small" placeholder="退货日期止" style="width:100%" />
          </el-col>
          <el-col :span="3">
            <el-select v-model="searchForm.status" clearable size="small" placeholder="状态" style="width:100%">
              <el-option label="草稿" value="draft" />
              <el-option label="已确认" value="confirmed" />
              <el-option label="已取消" value="cancelled" />
            </el-select>
          </el-col>
          <el-col :span="3">
            <el-button type="primary" icon="el-icon-search" size="small" @click="handleSearch">搜索</el-button>
            <el-button icon="el-icon-refresh" size="small" @click="handleReset">重置</el-button>
          </el-col>
        </el-row>
      </div>

      <el-table ref="returnsTable" class="returns-table" :data="list" stripe style="width:100%">
        <el-table-column type="index" label="序号" width="60" align="center" :index="indexMethod" />
        <el-table-column prop="returnNo" label="退货单号" min-width="123" class-name="return-no-col" />
        <el-table-column label="客户" min-width="96" class-name="customer-col">
          <template slot-scope="scope">{{ getCustomerDisplay(scope.row.customer) }}</template>
        </el-table-column>
        <el-table-column prop="reason" label="退货原因" min-width="150" show-overflow-tooltip>
          <template slot-scope="scope">{{ scope.row.reason || '-' }}</template>
        </el-table-column>
        <el-table-column prop="returnDate" label="退货日期" width="120">
          <template slot-scope="scope">{{ formatReturnDateShort(scope.row.returnDate) }}</template>
        </el-table-column>
        <el-table-column label="总面积(㎡)" width="108" class-name="area-col" align="right">
          <template slot-scope="scope">{{ formatNumber(scope.row.totalArea) }}</template>
        </el-table-column>
        <el-table-column label="总金额" width="108" class-name="amount-col" align="right">
          <template slot-scope="scope">{{ formatNumber(scope.row.totalAmount) }}</template>
        </el-table-column>
        <el-table-column label="对账金额" width="120" align="right">
          <template slot-scope="scope">
            <span :class="{ 'negative-amount': Number(scope.row.statementAmount) < 0 }">{{ formatNumber(scope.row.statementAmount) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="56">
          <template slot-scope="scope">
            <el-tag :type="getStatusTagType(scope.row.status)" size="small">
              {{ getStatusText(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="242" align="center">
          <template slot-scope="scope">
            <div class="op-btns">
              <el-button type="text" size="mini" @click="viewDetail(scope.row)">详情</el-button>
              <el-button type="text" size="mini" @click="openEdit(scope.row)">编辑</el-button>
              <el-button type="text" size="mini" @click="openAudit(scope.row)">审计</el-button>
              <el-button type="text" size="mini" class="op-print" @click="printReturn(scope.row)">打印</el-button>
              <el-button type="text" size="mini" class="op-danger" @click="confirmDelete(scope.row)">删除</el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrap">
        <el-pagination
          :current-page.sync="currentPage"
          :page-size="pageSize"
          :page-sizes="[10,20,50]"
          layout="sizes, prev, pager, next, jumper, ->, total"
          :total="Number(total)"
          @size-change="onSizeChange"
          @current-change="onCurrentChange"
        />
      </div>
    </el-card>

    <el-dialog title="退货单详情" :visible.sync="detailVisible" width="1000px" custom-class="returns-detail-dialog">
      <div v-if="current">
        <div class="detail-summary-grid">
          <div class="summary-card">
            <div class="summary-label">退货单号</div>
            <div class="summary-value">{{ current.returnNo || '-' }}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">客户</div>
            <div class="summary-value">{{ getCustomerDisplay(current.customer) }}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">退货日期</div>
            <div class="summary-value">{{ current.returnDate || '-' }}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">总面积</div>
            <div class="summary-value">{{ formatNumber(current.totalArea) }}㎡</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">总金额</div>
            <div class="summary-value">{{ formatNumber(current.totalAmount) }}</div>
          </div>
          <div class="summary-card negative-card">
            <div class="summary-label">对账金额</div>
            <div class="summary-value">{{ formatNumber(current.statementAmount) }}</div>
          </div>
        </div>
        <el-table class="returns-table" :data="current.items || []" stripe style="width:100%">
          <el-table-column prop="orderNo" label="订单号" min-width="110" />
          <el-table-column prop="materialCode" label="料号" min-width="110" />
          <el-table-column label="规格（厚度*宽度*长度）" min-width="130" show-overflow-tooltip>
            <template slot-scope="scope">{{ formatSpecWithUnit(scope.row) }}</template>
          </el-table-column>
          <el-table-column prop="rolls" label="退货数量（R）" min-width="92" />
          <el-table-column label="退货数量/m²" min-width="90" align="right">
            <template slot-scope="scope">{{ formatNumber(scope.row.sqm) }}</template>
          </el-table-column>
          <el-table-column label="单价/元/m²" min-width="95" align="right">
            <template slot-scope="scope">{{ formatNumber(scope.row.unitPrice) }}</template>
          </el-table-column>
          <el-table-column label="金额/元" min-width="88" align="right">
            <template slot-scope="scope">{{ formatNumber(scope.row.amount) }}</template>
          </el-table-column>
        </el-table>
      </div>
      <span slot="footer" class="dialog-footer-actions">
        <el-button @click="detailVisible = false">关闭</el-button>
      </span>
    </el-dialog>

    <el-dialog title="退货单打印预览" :visible.sync="printVisible" width="980px" top="5vh">
      <div v-if="printCurrent" id="returnPrintArea" class="return-print-content">
        <div class="return-print-title">销售退货单</div>
        <div class="return-print-meta">
          <span><strong>退货单号：</strong>{{ printCurrent.returnNo || '-' }}</span>
          <span><strong>客户：</strong>{{ getCustomerDisplay(printCurrent.customer) }}</span>
          <span><strong>退货日期：</strong>{{ printCurrent.returnDate || '-' }}</span>
          <span><strong>状态：</strong>{{ getStatusText(printCurrent.status) }}</span>
          <span><strong>退货原因：</strong>{{ printCurrent.reason || '-' }}</span>
        </div>
        <el-table class="returns-table return-print-table" :data="printCurrent.items || []" border stripe style="width:100%">
          <el-table-column type="index" label="序号" min-width="46" align="center" />
          <el-table-column prop="orderNo" label="订单号" min-width="86" />
          <el-table-column prop="materialCode" label="料号" min-width="126" />
          <el-table-column label="规格（厚度*宽度*长度）" min-width="99" show-overflow-tooltip>
            <template slot-scope="scope">{{ formatSpecWithUnit(scope.row) }}</template>
          </el-table-column>
          <el-table-column prop="rolls" label="退货数量（R）" min-width="44" align="right" />
          <el-table-column label="退货数量/m²" min-width="68" align="right">
            <template slot-scope="scope">{{ formatNumber(scope.row.sqm) }}</template>
          </el-table-column>
          <el-table-column prop="remark" label="备注" min-width="80" show-overflow-tooltip>
            <template slot-scope="scope">{{ scope.row.remark || '-' }}</template>
          </el-table-column>
        </el-table>
        <div class="return-print-total">
          退货总面积：{{ formatNumber(printCurrent.totalArea) }}㎡
        </div>
        <div class="return-print-signature">
          <span>制单：________________</span>
          <span>审核：________________</span>
          <span>批准：________________</span>
        </div>
      </div>
      <span slot="footer" class="dialog-footer-actions">
        <el-button @click="printVisible = false">关闭</el-button>
        <el-button type="primary" icon="el-icon-printer" @click="handleReturnPrintBrowser">直接打印</el-button>
      </span>
    </el-dialog>

    <el-dialog title="退货审计日志" :visible.sync="auditVisible" width="980px" custom-class="returns-audit-dialog">
      <div class="select-order-tip">
        退货单号：{{ auditReturnNo || '-' }}
      </div>
      <el-table v-loading="auditLoading" class="returns-table" :data="auditList" stripe style="width:100%">
        <el-table-column type="index" label="序号" width="60" align="center" :index="auditIndexMethod" />
        <el-table-column prop="actionType" label="动作" width="100" align="center">
          <template slot-scope="scope">
            <el-tag size="mini" :type="getAuditTagType(scope.row.actionType)">{{ getAuditActionText(scope.row.actionType) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态变化" min-width="150" align="center">
          <template slot-scope="scope">
            {{ (scope.row.beforeStatus || '-') + ' → ' + (scope.row.afterStatus || '-') }}
          </template>
        </el-table-column>
        <el-table-column prop="reason" label="退货原因" min-width="140" show-overflow-tooltip>
          <template slot-scope="scope">{{ scope.row.reason || '-' }}</template>
        </el-table-column>
        <el-table-column prop="detail" label="描述" min-width="140" show-overflow-tooltip>
          <template slot-scope="scope">{{ scope.row.detail || '-' }}</template>
        </el-table-column>
        <el-table-column prop="operator" label="操作人" width="100" />
        <el-table-column prop="createdAt" label="时间" width="160">
          <template slot-scope="scope">{{ formatDateTime(scope.row.createdAt) }}</template>
        </el-table-column>
      </el-table>
      <div class="pagination-wrap">
        <el-pagination
          :current-page.sync="auditPageNum"
          :page-size="auditPageSize"
          :page-sizes="[10,20,50]"
          layout="sizes, prev, pager, next, jumper, ->, total"
          :total="Number(auditTotal)"
          @size-change="onAuditSizeChange"
          @current-change="onAuditCurrentChange"
        />
      </div>
      <span slot="footer" class="dialog-footer-actions">
        <el-button @click="auditVisible = false">关闭</el-button>
      </span>
    </el-dialog>

    <el-dialog :title="isEditing ? '编辑退货单' : '新增退货单'" :visible.sync="editVisible" width="1200px" custom-class="returns-edit-dialog">
      <el-form :model="form" label-width="100px" class="returns-edit-form">
        <div class="edit-section">
          <div class="section-title">基础信息</div>
          <el-row :gutter="12">
            <el-col :span="8">
              <el-form-item label="退货单号">
                <el-input v-model="form.returnNo" :disabled="isEditing" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="客户">
                <el-select v-model="form.customerId" filterable placeholder="选择客户" style="width:100%" @change="onCustomerChange">
                  <el-option v-for="c in customers" :key="c.id" :label="`${c.customerName}（${c.customerCode}）`" :value="c.id" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="退货日期">
                <el-date-picker v-model="form.returnDate" type="date" value-format="yyyy-MM-dd" style="width:100%" @change="onReturnDateChange" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="12">
            <el-col :span="8">
              <el-form-item label="状态">
                <el-select v-model="form.status" style="width:100%">
                  <el-option label="草稿" value="draft" />
                  <el-option label="已确认" value="confirmed" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="16">
              <el-form-item label="退货原因">
                <el-input v-model="form.reason" placeholder="如：品质异常/客户退回/发货差异" />
              </el-form-item>
            </el-col>
          </el-row>
        </div>

        <div class="edit-section">
          <div class="section-title section-title-inline">
            <span>退货明细</span>
            <div class="inline-summary">
              <span class="summary-chip">明细 {{ form.items.length }} 行</span>
              <span class="summary-chip">预计面积 {{ getDraftTotalArea() }} ㎡</span>
              <span class="summary-chip summary-chip-amount">预计金额 {{ getDraftTotalAmount() }}</span>
            </div>
          </div>
          <div class="toolbar toolbar-panel">
            <el-select
              v-model="pickOrderNo"
              filterable
              remote
              reserve-keyword
              clearable
              size="small"
              style="width:260px"
              :disabled="!form.customer"
              :placeholder="form.customer ? '搜索订单号后带入明细' : '请先选择客户'"
              :remote-method="searchOrderOptions"
              :loading="orderSearchLoading"
            >
              <el-option
                v-for="item in orderOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
            <el-button size="small" type="primary" :disabled="!form.customer" @click="appendItemsFromOrder">按订单带入明细</el-button>
            <el-button size="small" :disabled="!form.items.length" @click="copyLastRow">复制上一行</el-button>
            <el-button size="small" @click="addRow">新增行</el-button>
          </div>

          <el-table class="returns-table returns-edit-table" :data="form.items" border stripe style="width:100%">
            <el-table-column label="料号" min-width="170">
              <template slot-scope="scope"><el-input v-model="scope.row.materialCode" size="mini" /></template>
            </el-table-column>
            <el-table-column label="规格（厚度*宽度*长度）" min-width="240" show-overflow-tooltip>
              <template slot-scope="scope">
                <div class="spec-cell-scroll">
                  <div class="spec-edit-row">
                    <el-input
                      :value="scope.row.thickness === null || scope.row.thickness === undefined ? '' : String(scope.row.thickness)"
                      size="mini"
                      class="spec-input"
                      placeholder="厚度"
                      @input="val => { scope.row.thickness = val }"
                    />
                    <span class="spec-unit">μm *</span>
                    <el-input
                      :value="scope.row.width === null || scope.row.width === undefined ? '' : String(scope.row.width)"
                      size="mini"
                      class="spec-input"
                      placeholder="宽度"
                      @input="val => { scope.row.width = val }"
                    />
                    <span class="spec-unit">mm *</span>
                    <el-input
                      :value="scope.row.length === null || scope.row.length === undefined ? '' : String(scope.row.length)"
                      size="mini"
                      class="spec-input"
                      placeholder="长度"
                      @input="val => { scope.row.length = val }"
                    />
                    <span class="spec-unit">m</span>
                  </div>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="退货数量（R）" min-width="82">
              <template slot-scope="scope"><el-input v-model="scope.row.rolls" size="mini" @input="validateRowRolls(scope.row)" /></template>
            </el-table-column>
            <el-table-column label="已退卷数（R）" min-width="86">
              <template slot-scope="scope">{{ scope.row.returnedRolls || 0 }}</template>
            </el-table-column>
            <el-table-column label="可退卷数（R）" min-width="86">
              <template slot-scope="scope">{{ scope.row.availableReturnRolls == null ? '-' : scope.row.availableReturnRolls }}</template>
            </el-table-column>
            <el-table-column label="退货数量/m²" min-width="90">
              <template slot-scope="scope">{{ calcSqm(scope.row) }}</template>
            </el-table-column>
            <el-table-column label="单价/元/m²" min-width="95">
              <template slot-scope="scope"><el-input v-model="scope.row.unitPrice" size="mini" /></template>
            </el-table-column>
            <el-table-column label="金额/元" min-width="88">
              <template slot-scope="scope">{{ calcAmount(scope.row) }}</template>
            </el-table-column>
            <el-table-column label="备注" min-width="90">
              <template slot-scope="scope"><el-input v-model="scope.row.remark" size="mini" /></template>
            </el-table-column>
            <el-table-column label="操作" width="58" align="center">
              <template slot-scope="scope">
                <el-button type="text" size="mini" class="op-danger" @click="removeRow(scope.$index)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-form>

      <span slot="footer" class="dialog-footer-actions">
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" @click="save">保存</el-button>
      </span>
    </el-dialog>

    <el-dialog title="选择订单明细" :visible.sync="selectItemsVisible" width="1100px" custom-class="returns-select-dialog">
      <div class="select-order-tip">订单号：{{ pickOrderNo }}</div>
      <div class="select-summary-bar">
        <span class="summary-chip">可选明细 {{ getSelectableAvailableCount() }} 条</span>
        <span class="summary-chip">已选明细 {{ selectedOrderItems.length }} 条</span>
        <span class="summary-chip summary-chip-amount">本次退货卷数 {{ getSelectedRollsTotal() }}</span>
      </div>
      <el-table ref="selectItemsTable" class="returns-table" :data="selectableOrderItems" stripe border style="width:100%" @selection-change="handleSelectableItemsChange">
        <el-table-column type="selection" width="55" :selectable="isSelectableOrderItem" />
        <el-table-column prop="materialCode" label="料号" min-width="140" />
        <el-table-column label="规格（厚度*宽度*长度）" min-width="150" show-overflow-tooltip>
          <template slot-scope="scope">{{ formatSpecWithUnit(scope.row) }}</template>
        </el-table-column>
        <el-table-column prop="rolls" label="订单卷数" width="90" />
        <el-table-column label="已退卷数（R）" width="96" align="center">
          <template slot-scope="scope">
            <span class="returned-rolls">{{ scope.row.returnedRolls || 0 }}</span>
          </template>
        </el-table-column>
        <el-table-column label="可退卷数（R）" width="96" align="center">
          <template slot-scope="scope">
            <span :class="['available-rolls', { 'available-rolls-empty': !(Number(scope.row.availableReturnRolls) > 0) }]">
              {{ scope.row.availableReturnRolls == null ? '-' : scope.row.availableReturnRolls }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="本次退货数量（R）" width="130">
          <template slot-scope="scope">
            <el-input-number v-model="scope.row.selectedRolls" :min="0" :max="scope.row.availableReturnRolls || 0" size="mini" controls-position="right" @change="handleSelectableRollsChange(scope.row)" />
          </template>
        </el-table-column>
        <el-table-column prop="unitPrice" label="单价/元/m²" width="110" />
      </el-table>
      <span slot="footer" class="dialog-footer-actions">
        <el-button @click="selectItemsVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmSelectableItems">带入选中明细（{{ selectedOrderItems.length }}）</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import { getSalesReturns, createSalesReturn, updateSalesReturn, deleteSalesReturn, getSalesReturnDetail, generateSalesReturnNo, getReturnableOrderItems, getSalesReturnAuditLogs } from '@/api/salesReturn'
import { getCustomerList } from '@/api/customer'
import { searchSalesOrders } from '@/api/sales'
import { getSpecByMaterialCode } from '@/api/tapeSpec'
import elTableAutoLayout from '@/mixins/elTableAutoLayout'

export default {
  name: 'SalesReturns',
  mixins: [elTableAutoLayout],
  tableLayoutRefs: ['returnsTable'],
  data() {
    return {
      list: [],
      total: 0,
      currentPage: 1,
      pageSize: 10,
      searchForm: { returnNo: '', customer: '', startDate: '', endDate: '', status: '' },
      detailVisible: false,
      current: null,
      printVisible: false,
      printCurrent: null,
      auditVisible: false,
      auditLoading: false,
      auditReturnNo: '',
      auditList: [],
      auditTotal: 0,
      auditPageNum: 1,
      auditPageSize: 10,
      editVisible: false,
      isEditing: false,
      form: this.emptyForm(),
      customers: [],
      pickOrderNo: '',
      orderOptions: [],
      orderSearchLoading: false,
      selectItemsVisible: false,
      selectableOrderItems: [],
      selectedOrderItems: []
    }
  },
  created() {
    this.fetchCustomers()
    this.fetchList()
  },
  methods: {
    emptyForm() {
      return {
        returnNo: '',
        customer: '',
        customerId: null,
        returnDate: '',
        status: 'confirmed',
        reason: '',
        remark: '',
        items: []
      }
    },
    async fetchCustomers() {
      try {
        const res = await getCustomerList({ size: 1000 })
        if (res && (res.code === 200 || res.code === 20000)) {
          const data = res.data
          this.customers = (data && data.records) || (Array.isArray(data) ? data : [])
        }
      } catch (e) {
        return
      }
    },
    async fetchList() {
      try {
        const params = {
          pageNum: this.currentPage,
          pageSize: this.pageSize,
          returnNo: this.searchForm.returnNo || undefined,
          customer: this.searchForm.customer || undefined,
          startDate: this.searchForm.startDate || undefined,
          endDate: this.searchForm.endDate || undefined,
          status: this.searchForm.status || undefined
        }
        const res = await getSalesReturns(params)
        if (res && res.code === 200) {
          const data = res.data || {}
          this.list = data.list || []
          this.total = Number(data.total || 0)
        }
      } finally {
        this.scheduleTableLayout()
      }
    },
    handleSearch() {
      this.currentPage = 1
      this.fetchList()
    },
    handleReset() {
      this.searchForm = { returnNo: '', customer: '', startDate: '', endDate: '', status: '' }
      this.handleSearch()
    },
    onSizeChange(v) {
      this.pageSize = v
      this.fetchList()
    },
    onCurrentChange(v) {
      this.currentPage = v
      this.fetchList()
    },
    indexMethod(i) {
      return (this.currentPage - 1) * this.pageSize + i + 1
    },
    getStatusText(status) {
      const map = {
        draft: '草稿',
        confirmed: '已确认',
        cancelled: '已取消'
      }
      return map[status] || status || '-'
    },
    getStatusTagType(status) {
      const map = {
        draft: 'info',
        confirmed: 'success',
        cancelled: 'danger'
      }
      return map[status] || ''
    },
    getCustomerDisplay(customerCode) {
      if (!customerCode) return '-'
      const customer = (this.customers || []).find(item => item.customerCode === customerCode)
      return (customer && (customer.shortName || customer.customerName)) || customerCode
    },
    formatNumber(value) {
      if (value === null || value === undefined || value === '') return '0.00'
      const n = Number(value)
      return Number.isFinite(n) ? n.toFixed(2) : '0.00'
    },
    formatReturnDateShort(dateText) {
      if (!dateText) return '-'
      const d = new Date(dateText)
      if (!Number.isNaN(d.getTime())) {
        const yy = String(d.getFullYear()).slice(-2)
        const mm = String(d.getMonth() + 1).padStart(2, '0')
        const dd = String(d.getDate()).padStart(2, '0')
        return `${yy}-${mm}-${dd}`
      }
      const text = String(dateText)
      const m = text.match(/(\d{4})-(\d{1,2})-(\d{1,2})/)
      if (m) {
        return `${String(m[1]).slice(-2)}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`
      }
      return text
    },
    formatDateTime(dateText) {
      if (!dateText) return '-'
      const d = new Date(dateText)
      if (!Number.isNaN(d.getTime())) {
        const yyyy = d.getFullYear()
        const mm = String(d.getMonth() + 1).padStart(2, '0')
        const dd = String(d.getDate()).padStart(2, '0')
        const hh = String(d.getHours()).padStart(2, '0')
        const mi = String(d.getMinutes()).padStart(2, '0')
        const ss = String(d.getSeconds()).padStart(2, '0')
        return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`
      }
      return String(dateText)
    },
    formatSpecWithUnit(row) {
      if (!row) return '-'
      const t = row.thickness === null || row.thickness === undefined || row.thickness === '' ? '0' : String(row.thickness).trim()
      const w = row.width === null || row.width === undefined || row.width === '' ? '0' : String(row.width).trim()
      const l = row.length === null || row.length === undefined || row.length === '' ? '0' : String(row.length).trim()
      return `${t}μm*${w}mm*${l}m`
    },
    getDraftTotalArea() {
      const total = (this.form.items || []).reduce((sum, item) => {
        return sum + Number(this.calcSqm(item) || 0)
      }, 0)
      return this.formatNumber(total)
    },
    getDraftTotalAmount() {
      const total = (this.form.items || []).reduce((sum, item) => {
        return sum + Number(this.calcAmount(item) || 0)
      }, 0)
      return this.formatNumber(total)
    },
    async openCreate() {
      this.isEditing = false
      this.form = this.emptyForm()
      const d = new Date()
      this.form.returnDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      await this.loadReturnNo()
      this.editVisible = true
    },
    async openEdit(row) {
      try {
        const res = await getSalesReturnDetail(row.returnNo)
        if (!res || res.code !== 200) return this.$message.error('获取详情失败')
        this.isEditing = true
        this.form = Object.assign(this.emptyForm(), res.data)
        if (this.form.customer) {
          const c = this.customers.find(x => x.customerCode === this.form.customer)
          if (c) this.form.customerId = c.id
        }
        this.form.items = (this.form.items || []).map(item => this.normalizeReturnItem(item))
        await this.fillItemSpecsFromOrderDefaults(this.form.items)
        await this.fillItemSpecsFromMaterialCode(this.form.items)
        this.form.items.forEach(item => this.coerceItemSpecNumber(item))
        this.editVisible = true
      } catch (e) {
        console.error('打开退货单编辑失败', e)
        this.$message.error('打开编辑失败，请检查网络或稍后重试')
      }
    },
    async viewDetail(row) {
      try {
        const res = await getSalesReturnDetail(row.returnNo)
        if (!res || res.code !== 200) return this.$message.error('获取详情失败')
        this.current = res.data
        this.detailVisible = true
      } catch (e) {
        console.error('查看退货单详情失败', e)
        this.$message.error('获取详情失败，请检查网络或稍后重试')
      }
    },
    async printReturn(row) {
      try {
        const res = await getSalesReturnDetail(row.returnNo)
        if (!res || res.code !== 200 || !res.data) {
          return this.$message.error('获取退货单详情失败，无法预览打印')
        }
        this.printCurrent = res.data
        this.printVisible = true
      } catch (e) {
        console.error('加载打印数据失败', e)
        this.$message.error('获取退货单详情失败，无法预览打印')
      }
    },
    getAuditActionText(actionType) {
      const map = {
        CREATE: '创建',
        UPDATE: '更新',
        DELETE: '删除'
      }
      return map[actionType] || actionType || '-'
    },
    getAuditTagType(actionType) {
      const map = {
        CREATE: 'success',
        UPDATE: 'warning',
        DELETE: 'danger'
      }
      return map[actionType] || 'info'
    },
    auditIndexMethod(i) {
      return (this.auditPageNum - 1) * this.auditPageSize + i + 1
    },
    async openAudit(row) {
      this.auditReturnNo = (row && row.returnNo) || ''
      this.auditPageNum = 1
      this.auditVisible = true
      await this.fetchAuditLogs()
    },
    async fetchAuditLogs() {
      if (!this.auditReturnNo) {
        this.auditList = []
        this.auditTotal = 0
        return
      }
      this.auditLoading = true
      try {
        const res = await getSalesReturnAuditLogs({
          returnNo: this.auditReturnNo,
          pageNum: this.auditPageNum,
          pageSize: this.auditPageSize
        })
        if (res && (res.code === 200 || res.code === 20000)) {
          const data = res.data || {}
          this.auditList = data.list || []
          this.auditTotal = Number(data.total || 0)
        } else {
          this.auditList = []
          this.auditTotal = 0
          this.$message.error((res && (res.msg || res.message)) || '获取审计日志失败')
        }
      } catch (e) {
        this.auditList = []
        this.auditTotal = 0
        console.error('获取退货审计日志失败', e)
        this.$message.error('获取审计日志失败，请稍后重试')
      } finally {
        this.auditLoading = false
      }
    },
    onAuditSizeChange(v) {
      this.auditPageSize = v
      this.auditPageNum = 1
      this.fetchAuditLogs()
    },
    onAuditCurrentChange(v) {
      this.auditPageNum = v
      this.fetchAuditLogs()
    },
    handleReturnPrintBrowser() {
      const area = document.getElementById('returnPrintArea')
      if (!area) {
        return this.$message.warning('未找到打印内容')
      }
      const printContent = area.innerHTML
      const iframe = document.createElement('iframe')
      iframe.setAttribute('style', 'position:absolute;width:0px;height:0px;left:-500px;top:-500px;')
      document.body.appendChild(iframe)

      const doc = iframe.contentWindow.document
      doc.write(`
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              * { box-sizing: border-box; }
              body {
                font-family: "Microsoft YaHei", "SimSun", Arial, sans-serif;
                padding: 10mm 10mm;
                margin: 0;
                background: white;
                color: black;
                font-size: 11px;
                line-height: 1.4;
              }
              .return-print-title { text-align:center; font-size:18px; font-weight:700; margin-bottom:10px; }
              .return-print-meta { display:grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap:6px 10px; margin-bottom:8px; font-size:11px; }
              .return-print-meta span { display:block; }
              .el-table table, table { width:100% !important; border-collapse: collapse; table-layout: fixed; }
              th, td { border:1px solid #000; padding:4px 2px; text-align:center; font-size:10px; }
              th { background:#f0f0f0; font-weight:700; }
              .el-table .cell { padding:0 3px !important; white-space: normal !important; word-break: break-all !important; line-height: 1.25 !important; }
              .return-print-total { margin-top:8px; text-align:right; font-size:11px; font-weight:600; }
              .return-print-signature { margin-top: 22px; display:flex; justify-content:space-between; font-size:11px; }
              @media print {
                @page { size: A4; margin: 8mm 8mm; }
                body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              }
            </style>
          </head>
          <body>${printContent}</body>
        </html>
      `)
      doc.close()

      setTimeout(() => {
        iframe.contentWindow.focus()
        iframe.contentWindow.print()
        setTimeout(() => {
          document.body.removeChild(iframe)
        }, 1000)
      }, 300)
    },
    confirmDelete(row) {
      this.$confirm(`确认删除退货单 ${row.returnNo} 吗？`, '提示', { type: 'warning' }).then(async() => {
        const res = await deleteSalesReturn(row.returnNo)
        if (res && res.code === 200) {
          this.$message.success('删除成功')
          this.fetchList()
        }
      }).catch(() => {})
    },
    onCustomerChange(customerId) {
      const c = this.customers.find(x => x.id === customerId)
      if (!c) return
      this.form.customer = c.customerCode
      this.pickOrderNo = ''
      this.orderOptions = []
      if (!this.isEditing) {
        this.loadReturnNo()
      }
    },
    onReturnDateChange() {
      if (!this.isEditing) this.loadReturnNo()
    },
    async loadReturnNo() {
      try {
        const res = await generateSalesReturnNo({ returnDate: this.form.returnDate })
        if (res && (res.code === 200 || res.code === 20000) && res.data) {
          this.form.returnNo = res.data.returnNo || this.form.returnNo
        }
      } catch (e) {
        console.error('生成退货单号失败', e)
      }
    },
    addRow() {
      this.form.items.push({ orderNo: '', materialCode: '', thickness: '', width: '', length: '', rolls: '', unitPrice: '', remark: '', returnedRolls: 0, availableReturnRolls: null })
    },
    copyLastRow() {
      const items = this.form.items || []
      if (!items.length) return
      const last = items[items.length - 1]
      const copied = {
        orderNo: last.orderNo || '',
        sourceOrderItemId: last.sourceOrderItemId || null,
        materialCode: last.materialCode || '',
        colorCode: last.colorCode || '',
        thickness: last.thickness || '',
        width: last.width || '',
        length: last.length || '',
        rolls: '',
        unitPrice: last.unitPrice || '',
        remark: last.remark || '',
        returnedRolls: 0,
        availableReturnRolls: null
      }
      this.form.items.push(copied)
    },
    removeRow(i) {
      this.form.items.splice(i, 1)
    },
    async appendItemsFromOrder() {
      if (!this.form.customer) return this.$message.warning('请先选择客户')
      if (!this.pickOrderNo) return this.$message.warning('请输入订单号')
      try {
        const res = await getReturnableOrderItems({ orderNo: this.pickOrderNo, excludeReturnNo: this.isEditing ? this.form.returnNo : undefined })
        if (!res || res.code !== 200 || !Array.isArray(res.data)) return this.$message.error('订单明细查询失败')
        this.selectableOrderItems = res.data.map(item => ({ ...item, selectedRolls: item.availableReturnRolls || 0 }))
        this.selectedOrderItems = []
        this.selectItemsVisible = true
      } catch (e) {
        console.error('按订单带入明细失败', e)
        this.$message.error('订单明细查询失败，请检查网络或稍后重试')
      }
    },
    handleSelectableItemsChange(rows) {
      this.selectedOrderItems = rows || []
    },
    isSelectableOrderItem(row) {
      return Number(row && row.availableReturnRolls) > 0
    },
    handleSelectableRollsChange(row) {
      if (!row) return
      const max = Number(row.availableReturnRolls) || 0
      let value = Number(row.selectedRolls) || 0
      if (value < 0) value = 0
      if (max >= 0 && value > max) value = max
      row.selectedRolls = value
      this.$nextTick(() => {
        if (this.$refs.selectItemsTable && this.isSelectableOrderItem(row)) {
          this.$refs.selectItemsTable.toggleRowSelection(row, value > 0)
        }
      })
    },
    getSelectableAvailableCount() {
      return (this.selectableOrderItems || []).filter(item => Number(item.availableReturnRolls) > 0).length
    },
    getSelectedRollsTotal() {
      const total = (this.selectedOrderItems || []).reduce((sum, item) => sum + (Number(item.selectedRolls) || 0), 0)
      return this.formatNumber(total)
    },
    confirmSelectableItems() {
      if (!this.selectedOrderItems.length) {
        return this.$message.warning('请至少选择一条明细')
      }
      const items = this.selectedOrderItems
        .filter(item => Number(item.selectedRolls) > 0)
        .map(item => ({
          orderNo: this.pickOrderNo,
          sourceOrderItemId: item.sourceOrderItemId || item.id,
          materialCode: item.materialCode || '',
          colorCode: item.colorCode || '',
          thickness: item.thickness || item.totalThickness || item.baseThickness || '',
          width: item.width || item.specWidth || item.widthMm || '',
          length: item.length || item.specLength || item.lengthM || '',
          rolls: Number(item.selectedRolls) || 0,
          unitPrice: item.unitPrice || '',
          remark: '',
          returnedRolls: item.returnedRolls || 0,
          availableReturnRolls: item.availableReturnRolls || 0
        }))
        .map(item => this.normalizeReturnItem(item))
      if (!items.length) {
        return this.$message.warning('请填写本次退货卷数')
      }
      this.form.items = this.form.items.concat(items)
      this.selectItemsVisible = false
      this.$message.success(`已带入 ${items.length} 行`)
    },
    async searchOrderOptions(keyword) {
      if (!this.form.customer) {
        this.orderOptions = []
        return
      }
      const query = (keyword || '').trim()
      this.orderSearchLoading = true
      try {
        const res = await searchSalesOrders({ keyword: query || undefined, customer: this.form.customer, status: 'completed' })
        const data = (res && (res.data || [])) || []
        const list = Array.isArray(data) ? data : (Array.isArray(data.list) ? data.list : [])
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
    async handleRowOrderChange(row) {
      if (!row || !row.orderNo) return
      const current = {
        sourceOrderItemId: row.sourceOrderItemId,
        materialCode: row.materialCode,
        colorCode: row.colorCode,
        thickness: row.thickness,
        width: row.width,
        length: row.length,
        unitPrice: row.unitPrice
      }
      try {
        const res = await getReturnableOrderItems({ orderNo: row.orderNo, excludeReturnNo: this.isEditing ? this.form.returnNo : undefined })
        if (!res || res.code !== 200 || !Array.isArray(res.data)) return
        const first = res.data[0]
        if (!first) return
        const patch = {
          sourceOrderItemId: current.sourceOrderItemId || first.sourceOrderItemId || first.id,
          materialCode: current.materialCode || first.materialCode || '',
          colorCode: current.colorCode || first.colorCode || '',
          thickness: current.thickness || first.thickness || first.totalThickness || first.baseThickness || '',
          width: current.width || first.width || first.specWidth || first.widthMm || '',
          length: current.length || first.length || first.specLength || first.lengthM || '',
          unitPrice: current.unitPrice || first.unitPrice || '',
          returnedRolls: first.returnedRolls || 0,
          availableReturnRolls: first.availableReturnRolls == null ? null : first.availableReturnRolls
        }
        const normalized = this.normalizeReturnItem({ ...row, ...patch })
        Object.assign(row, patch, normalized)
      } catch (e) {
        return
      }
    },
    normalizeReturnItem(item = {}) {
      const pick = (...vals) => {
        for (let i = 0; i < vals.length; i++) {
          const v = vals[i]
          if (v !== null && v !== undefined && String(v).trim() !== '') return v
        }
        return ''
      }
      const numOrNull = (v) => {
        if (v === null || v === undefined || String(v).trim() === '') return null
        const n = Number(v)
        return Number.isFinite(n) ? n : null
      }
      return {
        ...item,
        thickness: numOrNull(pick(item.thickness, item.totalThickness, item.baseThickness)),
        width: numOrNull(pick(item.width, item.specWidth, item.widthMm)),
        length: numOrNull(pick(item.length, item.specLength, item.lengthM))
      }
    },
    coerceSpecNumber(value) {
      if (value === null || value === undefined || String(value).trim() === '') return null
      const n = Number(value)
      return Number.isFinite(n) ? n : null
    },
    coerceItemSpecNumber(item) {
      if (!item) return
      this.$set(item, 'thickness', this.coerceSpecNumber(item.thickness))
      this.$set(item, 'width', this.coerceSpecNumber(item.width))
      this.$set(item, 'length', this.coerceSpecNumber(item.length))
    },
    async fillItemSpecsFromOrderDefaults(items = []) {
      if (!Array.isArray(items) || !items.length) return
      const orderNos = Array.from(new Set(items.map(it => String(it.orderNo || '').trim()).filter(Boolean)))
      if (!orderNos.length) return

      const orderItemMap = {}
      for (const orderNo of orderNos) {
        try {
          const res = await getReturnableOrderItems({ orderNo, excludeReturnNo: this.isEditing ? this.form.returnNo : undefined })
          const rows = (res && res.code === 200 && Array.isArray(res.data)) ? res.data : []
          orderItemMap[orderNo] = rows
        } catch (e) {
          orderItemMap[orderNo] = []
        }
      }

      items.forEach(item => {
        const orderNo = String(item.orderNo || '').trim()
        if (!orderNo) return
        const rows = orderItemMap[orderNo] || []
        if (!rows.length) return

        let matched = null
        if (item.sourceOrderItemId != null) {
          matched = rows.find(r => String(r.sourceOrderItemId || r.id || '') === String(item.sourceOrderItemId))
        }
        if (!matched && item.materialCode) {
          matched = rows.find(r => String(r.materialCode || '').trim() === String(item.materialCode || '').trim())
        }
        if (!matched) return

        if (item.thickness === null || item.thickness === undefined) {
          const t = Number(matched.thickness || matched.totalThickness || matched.baseThickness)
          item.thickness = Number.isFinite(t) ? t : null
        }
        if (item.width === null || item.width === undefined) {
          const w = Number(matched.width || matched.specWidth || matched.widthMm)
          item.width = Number.isFinite(w) ? w : null
        }
        if (item.length === null || item.length === undefined) {
          const l = Number(matched.length || matched.specLength || matched.lengthM)
          item.length = Number.isFinite(l) ? l : null
        }

        if (item.availableReturnRolls == null && matched.availableReturnRolls != null) {
          item.availableReturnRolls = matched.availableReturnRolls
        }
        if ((item.returnedRolls == null || item.returnedRolls === '') && matched.returnedRolls != null) {
          item.returnedRolls = matched.returnedRolls
        }
      })
    },
    async fillItemSpecsFromMaterialCode(items = []) {
      if (!Array.isArray(items) || !items.length) return
      const needFill = items.filter(item => {
        const hasSpec = String(item.thickness || '').trim() !== '' && String(item.width || '').trim() !== '' && String(item.length || '').trim() !== ''
        return !hasSpec && String(item.materialCode || '').trim() !== ''
      })
      if (!needFill.length) return

      const cache = {}
      for (const item of needFill) {
        const code = String(item.materialCode || '').trim()
        if (!code) continue
        if (!cache[code]) {
          try {
            const res = await getSpecByMaterialCode(code)
            cache[code] = (res && (res.code === 200 || res.code === 20000)) ? (res.data || null) : null
          } catch (e) {
            cache[code] = null
          }
        }
        const spec = cache[code]
        if (!spec) continue

        if (item.thickness === null || item.thickness === undefined) {
          const t = Number(spec.totalThickness || spec.baseThickness || spec.thickness)
          item.thickness = Number.isFinite(t) ? t : null
        }
        if (item.width === null || item.width === undefined) {
          const w = Number(spec.width || spec.specWidth)
          item.width = Number.isFinite(w) ? w : null
        }
        if (item.length === null || item.length === undefined) {
          const l = Number(spec.length || spec.specLength)
          item.length = Number.isFinite(l) ? l : null
        }
      }
    },
    validateRowRolls(row) {
      if (!row || row.availableReturnRolls == null) return
      const rolls = Number(row.rolls) || 0
      if (rolls > Number(row.availableReturnRolls)) {
        row.rolls = row.availableReturnRolls
        this.$message.warning('退货卷数不能超过可退卷数')
      }
    },
    calcSqm(row) {
      const len = Number(row.length) || 0
      const wid = Number(row.width) || 0
      const rolls = Number(row.rolls) || 0
      return ((len * wid * rolls) / 1000).toFixed(2)
    },
    calcAmount(row) {
      const sqm = Number(this.calcSqm(row))
      const unit = Number(row.unitPrice) || 0
      return (sqm * unit).toFixed(2)
    },
    async save() {
      if (!this.form.returnNo) return this.$message.error('请填写退货单号')
      if (!this.form.customer) return this.$message.error('请选择客户')
      const payload = JSON.parse(JSON.stringify(this.form))
      payload.items = (payload.items || []).filter(x => x && (x.orderNo || x.materialCode))
      if (!payload.items.length) return this.$message.error('请至少填写一行明细')
      payload.items = payload.items.map(x => ({
        ...x,
        materialName: null,
        length: Number(x.length) || 0,
        width: Number(x.width) || 0,
        thickness: Number(x.thickness) || 0,
        rolls: Number(x.rolls) || 0,
        unitPrice: Number(x.unitPrice) || 0,
        sqm: Number(this.calcSqm(x)),
        amount: Number(this.calcAmount(x))
      }))
      const invalidRow = payload.items.find(x => x.availableReturnRolls != null && Number(x.rolls) > Number(x.availableReturnRolls))
      if (invalidRow) return this.$message.error(`订单 ${invalidRow.orderNo} 存在超退卷数，请检查`)
      const res = this.isEditing ? await updateSalesReturn(payload) : await createSalesReturn(payload)
      if (res && res.code === 200) {
        this.$message.success(this.isEditing ? '更新成功' : '创建成功')
        this.editVisible = false
        this.fetchList()
      } else {
        this.$message.error((res && (res.msg || res.message)) || '保存失败')
      }
    }
  }
}
</script>

<style scoped>
.sales-returns { padding: 20px; }
.returns-header { display:flex; justify-content:space-between; align-items:center; }
.card-title { font-size:16px; font-weight:600; }
.search-area { margin-bottom: 16px; padding: 14px 16px; background:#f8fafc; border:1px solid #ebeef5; border-radius:10px; box-shadow: inset 0 1px 0 rgba(255,255,255,0.7); }
.search-area .el-row { display:flex; flex-wrap:wrap; align-items:center; }
.search-area .el-button + .el-button { margin-left: 8px; }
.returns-table { border: 1px solid #ebeef5; border-radius: 8px; overflow: hidden; }
.returns-table /deep/ th.el-table__cell { background: #f5f7fa; color: #606266; font-weight: 600; }
.returns-table /deep/ .el-table__row td.el-table__cell { padding-top: 10px; padding-bottom: 10px; }
.returns-table /deep/ th.el-table__cell .cell,
.returns-table /deep/ td.el-table__cell .cell {
  white-space: normal;
  word-break: break-word;
  line-height: 18px;
  font-size: 12px;
}
.returns-table /deep/ td.return-no-col .cell {
  word-break: break-all;
}
.op-btns { display:flex; justify-content:center; gap:1px; white-space:nowrap; }
.op-btns /deep/ .el-button--text { padding: 0 1px; font-size: 12px; }
.op-btns /deep/ .el-button + .el-button { margin-left: 0 !important; }
.op-print { color:#409eff; }
.op-danger { color:#f56c6c; }
.pagination-wrap { margin-top: 16px; display:flex; justify-content:flex-end; }
.toolbar { margin: 8px 0 10px; display:flex; gap:8px; align-items:center; }
.toolbar-panel { margin: 0 0 14px; padding: 12px 14px; background:#f8fafc; border:1px solid #ebeef5; border-radius:8px; }
.returns-edit-form { padding-top: 4px; }
.edit-section { margin-bottom: 16px; padding: 16px; background:#fff; border:1px solid #ebeef5; border-radius:10px; }
.section-title { margin-bottom: 14px; font-size: 14px; font-weight: 600; color:#303133; }
.section-title-inline { display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; }
.inline-summary { display:flex; gap:8px; flex-wrap:wrap; }
.summary-chip { display:inline-flex; align-items:center; height:28px; padding:0 12px; background:#f4f8ff; border:1px solid #d9ecff; border-radius:14px; color:#409eff; font-size:12px; }
.summary-chip-amount { background:#fff7ed; border-color:#fed7aa; color:#dd6b20; }
.detail-summary-grid { display:grid; grid-template-columns:repeat(3, minmax(0, 1fr)); gap:12px; margin-bottom:16px; }
.summary-card { padding:14px 16px; background:#f8fafc; border:1px solid #ebeef5; border-radius:10px; }
.summary-label { margin-bottom:6px; color:#909399; font-size:12px; }
.summary-value { color:#303133; font-size:15px; font-weight:600; }
.negative-card .summary-value { color:#f56c6c; }
.returns-edit-table /deep/ .el-input__inner,
.returns-edit-table /deep/ .el-select .el-input__inner,
.returns-edit-table /deep/ .el-input-number { border-radius: 6px; }
.spec-cell-scroll {
  width: 250px;
  max-width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  padding-bottom: 2px;
}
.spec-cell-scroll::-webkit-scrollbar { height: 6px; }
.spec-edit-row { display:inline-flex; align-items:center; gap:4px; min-width:250px; white-space:nowrap; }
.spec-input { width: 58px; min-width: 58px; }
.returns-edit-table /deep/ .spec-input .el-input__inner {
  text-align: center;
  padding: 0 4px;
}
.spec-unit { color:#909399; font-size:11px; white-space:nowrap; }
.returns-edit-table /deep/ th.el-table__cell .cell,
.returns-edit-table /deep/ td.el-table__cell .cell,
.returns-detail-dialog .returns-table /deep/ th.el-table__cell .cell,
.returns-detail-dialog .returns-table /deep/ td.el-table__cell .cell,
.return-print-table /deep/ th.el-table__cell .cell,
.return-print-table /deep/ td.el-table__cell .cell {
  white-space: normal !important;
  word-break: break-word !important;
  line-height: 1.25;
}
.dialog-footer-actions { display:flex; justify-content:flex-end; gap:10px; }
.select-order-tip { margin-bottom: 12px; padding:10px 12px; background:#f8fafc; border:1px solid #ebeef5; border-radius:8px; color:#606266; }
.select-summary-bar { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:12px; }
.available-rolls { color:#67c23a; font-weight:600; }
.available-rolls-empty { color:#c0c4cc; font-weight:500; }
.returned-rolls { color:#e6a23c; font-weight:600; }
.negative-amount { color: #f56c6c; font-weight: 600; }
.return-print-content { padding: 4px; }
.return-print-title { text-align:center; font-size: 18px; font-weight: 700; margin-bottom: 10px; }
.return-print-meta { display:grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap:6px 10px; margin-bottom:8px; color:#303133; font-size:12px; }
.return-print-total { margin-top: 8px; text-align: right; font-weight: 600; font-size: 12px; }
.return-print-signature { margin-top: 28px; display:flex; justify-content:space-between; color:#606266; }
.return-print-table /deep/ .el-table__header,
.return-print-table /deep/ .el-table__body { width: 100% !important; table-layout: fixed; }
.return-print-table /deep/ th.el-table__cell,
.return-print-table /deep/ td.el-table__cell { padding: 4px 0; }
.return-print-table /deep/ .cell { padding: 0 3px; line-height: 1.25; white-space: normal !important; word-break: break-all; }
</style>
