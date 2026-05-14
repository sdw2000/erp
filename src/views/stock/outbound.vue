<template>
  <div class="outbound-container">
    <el-card>
      <div slot="header" class="clearfix">
        <span>出库申请</span>
        <div style="float: right">
          <el-button type="success" icon="el-icon-s-order" size="small" @click="openBatchScanDialog">批量扫码出库</el-button>
          <el-button type="success" icon="el-icon-s-operation" size="small" @click="handleAddFIFO">FIFO自动分配</el-button>
          <el-button type="primary" icon="el-icon-plus" size="small" @click="handleAdd">新增出库申请</el-button>
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
        <el-form-item label="订单号">
          <el-input v-model="searchForm.orderNo" placeholder="请输入订单号" clearable style="width: 180px" />
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="searchForm.bizType" placeholder="全部类型" clearable style="width: 140px">
            <el-option label="胶带产品" value="TAPE_PRODUCT" />
            <el-option label="原材料" value="RAW_MATERIAL" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="el-icon-search" @click="handleSearch">搜 索</el-button>
          <el-button icon="el-icon-refresh-left" @click="handleReset">重 置</el-button>
        </el-form-item>
      </el-form>

      <!-- 数据表格 -->
      <el-table ref="outboundTable" v-loading="loading" :data="list" style="width: 100%; margin-top: 15px" border stripe @sort-change="handleTableSortChange">
        <el-table-column prop="requestNo" label="申请单号" width="160" sortable="custom" />
        <el-table-column prop="orderNo" label="订单号" width="150" sortable="custom" />
        <el-table-column prop="bizTypeLabel" label="类型" width="100" align="center" sortable="custom" />
        <el-table-column prop="materialCode" label="料号" width="180" sortable="custom" />
        <el-table-column prop="productName" label="产品名称" width="160" show-overflow-tooltip sortable="custom" />
        <el-table-column prop="batchNo" label="生产批次号" width="130" sortable="custom" />
        <el-table-column prop="sequenceNo" label="数字号" width="100" align="center" sortable="custom">
          <template slot-scope="scope">
            {{ getSequenceNoText(scope.row) }}
          </template>
        </el-table-column>
        <el-table-column prop="specDesc" label="规格" width="160" sortable="custom">
          <template slot-scope="scope">
            {{ getDisplaySpec(scope.row) }}
          </template>
        </el-table-column>
        <el-table-column prop="__qty" label="出库数量" width="120" align="center" sortable="custom">
          <template slot-scope="scope">
            <el-tag type="danger">{{ getOutboundQtyText(scope.row) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="availableRolls" label="申请时可用" width="100" align="center" sortable="custom" />
        <el-table-column prop="applicant" label="申请人" width="90" sortable="custom" />
        <el-table-column prop="applyDept" label="申请部门" width="100" sortable="custom" />
        <el-table-column prop="remark" label="备注" min-width="180" show-overflow-tooltip sortable="custom" />
        <el-table-column prop="status" label="状态" width="90" align="center" sortable="custom">
          <template slot-scope="scope">
            <el-tag :type="getStatusType(scope.row.status)">{{ getStatusText(scope.row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="applyTime" label="申请时间" width="160" sortable="custom" />
        <el-table-column label="操作" width="280" fixed="right">
          <template slot-scope="scope">
            <template v-if="isPendingTapeRow(scope.row)">
              <el-button type="text" size="small" icon="el-icon-check" @click="handleApprove(scope.row, true)">通过</el-button>
              <el-button type="text" size="small" icon="el-icon-refresh-left" @click="handleApprove(scope.row, false)">退回</el-button>
              <el-button type="text" size="small" icon="el-icon-edit" @click="handleEdit(scope.row)">修改</el-button>
              <el-button type="text" size="small" icon="el-icon-view" @click="handleViewStatus(scope.row)">查看状态</el-button>
            </template>
            <el-button v-else type="text" size="small" icon="el-icon-view" @click="handleViewStatus(scope.row)">查看状态</el-button>
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

    <!-- 手动选择批次出库弹窗 -->
    <el-dialog title="新增出库申请（手动选择批次）" :visible.sync="dialogVisible" width="900px" :close-on-click-modal="false">
      <el-form :inline="true" style="margin-bottom: 15px;">
        <el-form-item label="选择料号">
          <el-autocomplete
            v-model="selectMaterialCode"
            clearable
            :fetch-suggestions="querySearchMaterial"
            placeholder="先搜索并选择研发料号"
            style="width: 300px"
            popper-class="material-code-suggest-popper"
            value-key="value"
            @select="handleMaterialSelect"
            @input="handleMaterialInputChange"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadStockByMaterial">查询可用批次</el-button>
        </el-form-item>
      </el-form>
      <el-table
        ref="stockTable"
        :data="stockList"
        border
        stripe
        max-height="300"
        row-key="id"
        @selection-change="handleStockSelectionChange"
        @row-click="selectStock"
        @sort-change="handleStockTableSortChange"
      >
        <el-table-column type="selection" width="46" reserve-selection />
        <el-table-column type="index" width="50" />
        <el-table-column prop="qrCode" label="二维码" width="130" sortable="custom" />
        <el-table-column prop="batchNo" label="批次号" width="120" sortable="custom" />
        <el-table-column prop="sequenceNo" label="数字号" width="80" align="center" sortable="custom">
          <template slot-scope="scope">
            {{ getSequenceNoText(scope.row) }}
          </template>
        </el-table-column>
        <el-table-column prop="rollType" label="卷类型" width="80" align="center" sortable="custom">
          <template slot-scope="scope">
            <el-tag :type="getRollTypeTag(scope.row.rollType)" size="mini">{{ scope.row.rollType || '母卷' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="specDesc" label="规格" width="160" sortable="custom">
          <template slot-scope="scope">
            {{ getSpecText(scope.row) }}
          </template>
        </el-table-column>
        <el-table-column prop="totalRolls" label="可用卷数" width="90" align="center" sortable="custom">
          <template slot-scope="scope">
            <el-tag type="success">{{ scope.row.totalRolls }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="location" label="卡板位" width="80" sortable="custom" />
        <el-table-column prop="prodDate" label="生产日期" width="110" sortable="custom" />
        <el-table-column label="操作" width="80">
          <template slot-scope="scope">
            <el-button type="text" size="small" @click.stop="selectStock(scope.row)">选择</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination
        style="margin-top: 8px; text-align: right"
        :current-page="stockQuery.page"
        :page-sizes="[20, 50, 100]"
        :page-size="stockQuery.size"
        :total="stockQuery.total"
        layout="total, sizes, prev, pager, next"
        @size-change="handleStockSizeChange"
        @current-change="handleStockCurrentChange"
      />

      <el-divider />

      <div v-if="selectedStocks.length" style="margin-bottom: 12px;">
        <div style="margin-bottom: 8px; font-weight: 600;">已选发料明细</div>
        <el-table :data="selectedStocks" border stripe size="mini" max-height="220">
          <el-table-column prop="materialCode" label="料号" min-width="150" show-overflow-tooltip />
          <el-table-column label="规格" min-width="170" show-overflow-tooltip>
            <template slot-scope="scope">{{ getSpecText(scope.row) }}</template>
          </el-table-column>
          <el-table-column prop="batchNo" label="批次号" min-width="130" />
          <el-table-column prop="totalRolls" label="可用卷数" width="90" align="center" />
          <el-table-column label="本次出库" width="130" align="center">
            <template slot-scope="scope">
              <el-input-number
                v-model="scope.row.outboundRolls"
                :min="1"
                :max="Math.max(1, Number(scope.row.totalRolls || 1))"
                size="mini"
                @change="onSelectedRollsChange(scope.row)"
              />
            </template>
          </el-table-column>
        </el-table>
      </div>

      <el-form ref="form" :model="form" :rules="rules" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="已选批次">
              <el-input :value="selectedStocks.length ? ('已选' + selectedStocks.length + '条') : ''" disabled />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="可用卷数">
              <el-input :value="selectedTotalRolls || '-'" disabled />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="出库卷数" prop="rolls">
              <el-input-number v-model="form.rolls" :min="1" style="width: 100%" :disabled="selectedStocks.length > 0" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="申请部门">
              <el-select v-model="form.applyDept" placeholder="请选择申请部门" style="width: 100%">
                <el-option label="包装部" value="包装部" />
                <el-option label="涂布车间" value="涂布车间" />
                <el-option label="销售发货" value="销售发货" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="订单号">
              <el-input v-model="form.orderNo" placeholder="可选：关联订单号" clearable />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="订单明细ID">
              <el-input-number v-model="form.orderItemId" :min="1" :step="1" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-alert
          v-if="selectedStocks.length"
          :title="`已选总卷数：${selectedTotalRolls}，目标出库卷数：${form.rolls || 0}，总量：${selectedTotalAreaText}${(form.rolls && selectedTotalRolls < form.rolls) ? '（不足）' : ''}`"
          :type="(form.rolls && selectedTotalRolls < form.rolls) ? 'warning' : 'success'"
          :closable="false"
          show-icon
          style="margin-bottom: 12px"
        />
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="用途/去向等" />
        </el-form-item>
      </el-form>
      <div slot="footer">
        <el-button @click="dialogVisible = false">取 消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="handleSubmit">提交申请</el-button>
      </div>
    </el-dialog>

    <!-- FIFO自动分配出库弹窗 -->
    <el-dialog title="FIFO自动分配出库" :visible.sync="fifoDialogVisible" width="500px" :close-on-click-modal="false">
      <el-form ref="fifoForm" :model="fifoForm" :rules="fifoRules" label-width="100px">
        <el-form-item label="料号" prop="materialCode">
          <el-input v-model="fifoForm.materialCode" placeholder="输入料号" />
        </el-form-item>
        <el-form-item label="出库卷数" prop="totalRolls">
          <el-input-number v-model="fifoForm.totalRolls" :min="1" style="width: 100%" />
        </el-form-item>
        <el-form-item label="申请部门">
          <el-select v-model="fifoForm.applyDept" placeholder="请选择申请部门" style="width: 100%">
            <el-option label="包装部" value="包装部" />
            <el-option label="涂布车间" value="涂布车间" />
            <el-option label="销售发货" value="销售发货" />
          </el-select>
        </el-form-item>
        <el-form-item label="订单号">
          <el-input v-model="fifoForm.orderNo" placeholder="可选：关联订单号" clearable />
        </el-form-item>
        <el-form-item label="订单明细ID">
          <el-input-number v-model="fifoForm.orderItemId" :min="1" :step="1" style="width: 100%" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="fifoForm.remark" type="textarea" :rows="2" placeholder="用途/去向等" />
        </el-form-item>
      </el-form>
      <div slot="footer">
        <el-button @click="fifoDialogVisible = false">取 消</el-button>
        <el-button type="primary" :loading="fifoLoading" @click="handleFIFOSubmit">提交申请</el-button>
      </div>
    </el-dialog>

    <!-- 审批弹窗 -->
    <el-dialog :title="approveTitle" :visible.sync="approveVisible" width="420px">
      <el-form label-width="90px">
        <el-form-item v-if="approveAction" label="卷号(选填)">
          <el-input v-model="scanRollCode" placeholder="可选：扫码卷号/二维码用于校验" clearable />
        </el-form-item>
        <el-form-item label="审批备注">
          <el-input v-model="auditRemark" type="textarea" :rows="3" placeholder="请输入审批备注（可选）" />
        </el-form-item>
      </el-form>
      <div slot="footer">
        <el-button @click="approveVisible = false">取 消</el-button>
        <el-button type="primary" :loading="approveLoading" @click="confirmApprove">确 定</el-button>
      </div>
    </el-dialog>

    <!-- 修改出库申请弹窗 -->
    <el-dialog title="修改出库申请" :visible.sync="editVisible" width="460px" :close-on-click-modal="false">
      <el-form label-width="90px">
        <el-form-item label="申请单号">
          <el-input :value="editForm.requestNo" disabled />
        </el-form-item>
        <el-form-item label="料号">
          <el-input :value="editForm.materialCode" disabled />
        </el-form-item>
        <el-form-item label="出库卷数">
          <el-input-number v-model="editForm.rolls" :min="1" style="width: 100%" />
        </el-form-item>
        <el-form-item label="申请部门">
          <el-select v-model="editForm.applyDept" placeholder="请选择申请部门" style="width: 100%">
            <el-option label="包装部" value="包装部" />
            <el-option label="涂布车间" value="涂布车间" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="editForm.remark" type="textarea" :rows="2" placeholder="用途/去向等" />
        </el-form-item>
      </el-form>
      <div slot="footer">
        <el-button @click="editVisible = false">取 消</el-button>
        <el-button type="primary" :loading="editLoading" @click="confirmEdit">保 存</el-button>
      </div>
    </el-dialog>

    <!-- 批量扫码出库弹窗 -->
    <el-dialog title="批量扫码出库" :visible.sync="batchDialogVisible" width="560px">
      <el-form label-width="90px">
        <el-form-item label="批量卷号">
          <el-input
            v-model="batchScanRollCodes"
            type="textarea"
            :rows="6"
            placeholder="连续扫码卷号（支持换行/逗号/空格分隔）"
          />
        </el-form-item>
        <el-form-item label="出库备注">
          <el-input v-model="batchAuditRemark" type="textarea" :rows="2" placeholder="可选" />
        </el-form-item>
      </el-form>
      <div slot="footer">
        <el-button @click="batchDialogVisible = false">取 消</el-button>
        <el-button type="primary" :loading="batchApproveLoading" @click="confirmBatchScanApprove">确 定</el-button>
      </div>
    </el-dialog>

    <!-- 批量出库结果明细 -->
    <el-dialog title="批量出库结果" :visible.sync="batchResultVisible" width="760px">
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
          <el-table-column prop="rollCode" label="卷号" min-width="180" />
          <el-table-column prop="reason" label="失败原因" min-width="260" show-overflow-tooltip />
        </el-table>
      </div>
      <div v-else class="text-muted">全部匹配并出库成功。</div>
      <div slot="footer">
        <el-button type="primary" @click="batchResultVisible = false">我知道了</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { getOutboundList, getUnifiedOutboundList, createOutboundRequest, createOutboundRequestFIFO, updateOutboundRequest, approveOutbound, approveOutboundByRollCodes, cancelOutbound, getStockByMaterialPage, getStockSummaryPage } from '@/api/tapeStock'
import { getSpecList, getSpecSuggestions } from '@/api/tapeSpec'
import { getRawMaterialPage } from '@/api/tapeRawMaterial'
import {
  getAvailableFilmDetailsPage,
  createFilmOutbound,
  getFilmOutboundList,
  getAvailableChemicalDetailsPage,
  createChemicalOutbound,
  getChemicalOutboundList
} from '@/api/rawMaterialStock'
import { mapGetters } from 'vuex'
import elTableAutoLayout from '@/mixins/elTableAutoLayout'

export default {
  name: 'OutboundRequest',
  mixins: [elTableAutoLayout],
  tableLayoutRefs: ['outboundTable'],
  data() {
    return {
      searchForm: { status: 0, materialCode: '', bizType: '', orderNo: '' },
      sortState: { prop: '', order: '' },
      list: [],
      allRows: [],
      loading: false,
      pagination: { page: 1, size: 20, total: 0 },
      // 手动选择
      dialogVisible: false,
      submitLoading: false,
      selectMaterialCode: '',
      selectedMaterialCode: '',
      selectedMaterialSourceType: '',
      selectedMaterialMeta: null,
      stockList: [],
      stockQuery: { page: 1, size: 20, total: 0, sortProp: '', sortOrder: '' },
      stockSelectionMap: {},
      selectedStock: null,
      selectedStocks: [],
      form: { stockId: null, batchNo: '', rolls: 1, applyDept: '', remark: '订单生产', orderNo: '', orderItemId: null },
      rules: {
        rolls: [{ required: true, message: '请输入出库卷数', trigger: 'blur' }]
      },
      // FIFO
      fifoDialogVisible: false,
      fifoLoading: false,
      fifoForm: { materialCode: '', totalRolls: 1, applyDept: '', remark: '订单生产', orderNo: '', orderItemId: null },
      fifoRules: {
        materialCode: [{ required: true, message: '请输入料号', trigger: 'blur' }],
        totalRolls: [{ required: true, message: '请输入出库卷数', trigger: 'blur' }]
      },
      // 审批
      approveVisible: false,
      approveLoading: false,
      approveTitle: '',
      approveRow: null,
      approveAction: true,
      auditRemark: '',
      scanRollCode: '',
      // 修改
      editVisible: false,
      editLoading: false,
      editForm: {
        id: null,
        requestNo: '',
        materialCode: '',
        rolls: 1,
        applyDept: '',
        remark: ''
      },
      batchDialogVisible: false,
      batchApproveLoading: false,
      batchScanRollCodes: '',
      batchAuditRemark: '',
      batchResultVisible: false,
      batchResult: {
        total: 0,
        successCount: 0,
        failCount: 0,
        failed: []
      }
    }
  },
  computed: {
    ...mapGetters(['name']),
    selectedTotalRolls() {
      return (this.selectedStocks || []).reduce((sum, item) => {
        const v = Number(item && item.outboundRolls)
        return sum + (Number.isFinite(v) && v > 0 ? v : 0)
      }, 0)
    },
    selectedTotalArea() {
      return (this.selectedStocks || []).reduce((sum, item) => {
        const qty = Math.max(1, Number(item && item.outboundRolls) || 1)
        const perRollArea = this.getPerRollArea(item)
        return sum + (perRollArea * qty)
      }, 0)
    },
    selectedTotalAreaText() {
      return (Math.round(this.selectedTotalArea * 100) / 100).toFixed(2)
    }
  },
  created() {
    this.fetchData()
  },
  methods: {
    async querySearchMaterial(queryString, cb) {
      const keyword = queryString ? String(queryString).trim() : ''
      if (!keyword) {
        cb([])
        return
      }
      try {
        const [suggestRes, specRes, rawRes, stockRes] = await Promise.all([
          getSpecSuggestions(keyword, 10),
          getSpecList({ page: 1, size: 30, materialCode: keyword }),
          getRawMaterialPage({ page: 1, size: 30, materialCode: keyword, status: 1 }),
          getStockSummaryPage({ page: 1, size: 50, materialCode: keyword })
        ])

        const candidates = []
        const pushUnique = (materialCode, productName, sourceType, extra = {}) => {
          const code = materialCode ? String(materialCode).trim() : ''
          if (!code) return
          if (candidates.some(x => x.materialCode === code)) return
          const name = productName ? String(productName).trim() : ''
          candidates.push({
            value: name ? `${code} - ${name}` : code,
            materialCode: code,
            productName: name,
            sourceType,
            ...extra
          })
        }

        const suggestRecords = (((suggestRes || {}).data || {}).records) || (((suggestRes || {}).data || {}).list) || ((suggestRes || {}).data) || []
        ;(Array.isArray(suggestRecords) ? suggestRecords : []).forEach(item => {
          pushUnique(item && item.materialCode, item && (item.productName || item.materialName), 'tape')
        })

        const specRecords = (((specRes || {}).data || {}).records) || (((specRes || {}).data || {}).list) || []
        specRecords.forEach(item => {
          pushUnique(item && item.materialCode, item && (item.productName || item.materialName), 'tape')
        })

        const rawRecords = (((rawRes || {}).data || {}).records) || (((rawRes || {}).data || {}).list) || []
        rawRecords.forEach(item => pushUnique(
          item && item.materialCode,
          item && item.materialName,
          'raw',
          {
            materialCategory: item && (item.materialCategoryRaw || item.materialCategory),
            materialType: item && item.materialType,
            spec: item && item.spec
          }
        ))

        const stockRecords = (((stockRes || {}).data || {}).records) || (((stockRes || {}).data || {}).list) || []
        stockRecords.forEach(item => {
          pushUnique(item && item.materialCode, item && item.productName, 'tape')
        })

        // 候选过少时，回退到更宽查询，再在前端做模糊排序
        if (candidates.length < 5) {
          try {
            const [specAllRes, rawAllRes, stockAllRes] = await Promise.all([
              getSpecList({ page: 1, size: 200 }),
              getRawMaterialPage({ page: 1, size: 200, status: 1 }),
              getStockSummaryPage({ page: 1, size: 200 })
            ])

            const specAllRecords = (((specAllRes || {}).data || {}).records) || (((specAllRes || {}).data || {}).list) || []
            specAllRecords.forEach(item => {
              pushUnique(item && item.materialCode, item && (item.productName || item.materialName), 'tape')
            })

            const rawAllRecords = (((rawAllRes || {}).data || {}).records) || (((rawAllRes || {}).data || {}).list) || []
            rawAllRecords.forEach(item => pushUnique(
              item && item.materialCode,
              item && item.materialName,
              'raw',
              {
                materialCategory: item && (item.materialCategoryRaw || item.materialCategory),
                materialType: item && item.materialType,
                spec: item && item.spec
              }
            ))

            const stockAllRecords = (((stockAllRes || {}).data || {}).records) || (((stockAllRes || {}).data || {}).list) || []
            stockAllRecords.forEach(item => {
              pushUnique(item && item.materialCode, item && item.productName, 'tape')
            })
          } catch (ignore) {
            // 回退失败不影响主流程
          }
        }

        const list = candidates
          .map(item => ({
            ...item,
            _score: this.getMaterialMatchScore(keyword, item)
          }))
          .filter(item => Number.isFinite(item._score) && item._score < 100000)
          .sort((a, b) => {
            if (a._score !== b._score) return a._score - b._score
            return String(a.materialCode || '').localeCompare(String(b.materialCode || ''), 'zh-CN')
          })
          .slice(0, 5)
          .map(({ _score, ...item }) => item)

        cb(list)
      } catch (e) {
        cb([])
      }
    },
    getMaterialMatchScore(keyword, item) {
      const kw = String(keyword || '').trim().toLowerCase()
      if (!kw) return Number.MAX_SAFE_INTEGER

      const code = String((item && item.materialCode) || '').toLowerCase()
      const name = String((item && (item.productName || item.materialName)) || '').toLowerCase()
      const text = `${code} ${name}`.trim()

      if (code === kw) return 0
      if (code.startsWith(kw)) return 5 + Math.abs(code.length - kw.length)
      const codePos = code.indexOf(kw)
      if (codePos >= 0) return 20 + codePos

      if (name === kw) return 30
      if (name.startsWith(kw)) return 35 + Math.abs(name.length - kw.length)
      const namePos = name.indexOf(kw)
      if (namePos >= 0) return 50 + namePos

      const textPos = text.indexOf(kw)
      if (textPos >= 0) return 70 + textPos

      return this.getMaterialFuzzyScore(kw, code, name, text)
    },
    getMaterialFuzzyScore(kw, code, name, text) {
      const source = text || `${code} ${name}`
      if (!source) return 999999

      const kwChars = Array.from(new Set(String(kw || '').replace(/\s+/g, '').split('')))
      if (!kwChars.length) return 999999

      // 任意字符命中：只要有一个字符命中即可参与排序
      let hitCount = 0
      kwChars.forEach(ch => {
        if (source.includes(ch)) hitCount++
      })
      if (hitCount <= 0) return 999999

      // 子序列匹配越完整、位置越靠前，得分越低
      let lastIdx = -1
      let seqHit = 0
      let gapPenalty = 0
      for (const ch of kwChars) {
        const idx = source.indexOf(ch, lastIdx + 1)
        if (idx >= 0) {
          seqHit++
          if (lastIdx >= 0) gapPenalty += Math.max(0, idx - lastIdx - 1)
          lastIdx = idx
        }
      }

      const firstPos = source.indexOf(kwChars[0])
      const miss = kwChars.length - hitCount
      return 200 + miss * 25 + (kwChars.length - seqHit) * 10 + gapPenalty + (firstPos >= 0 ? firstPos : 50)
    },
    handleMaterialInputChange(val) {
      const input = val ? String(val).trim() : ''
      if (input !== this.selectedMaterialCode) {
        this.selectedMaterialCode = ''
        this.selectedMaterialSourceType = ''
        this.selectedMaterialMeta = null
        this.stockList = []
        this.stockQuery.page = 1
        this.stockQuery.total = 0
        this.stockSelectionMap = {}
        this.selectedStock = null
        this.selectedStocks = []
      }
    },
    async handleMaterialSelect(item) {
      const code = item && item.materialCode ? String(item.materialCode).trim() : ''
      if (!code) return
      this.selectedMaterialCode = code
      this.selectMaterialCode = code
      this.selectedMaterialSourceType = item && item.sourceType ? item.sourceType : 'tape'
      this.selectedMaterialMeta = item || null
      await this.loadStockByMaterial()
    },
    async fetchData() {
      this.loading = true
      try {
        const params = {
          page: this.pagination.page,
          size: this.pagination.size,
          status: this.searchForm.status === null || this.searchForm.status === undefined || this.searchForm.status === '' ? undefined : this.searchForm.status,
          materialCode: this.searchForm.materialCode ? this.searchForm.materialCode.trim() : undefined,
          bizType: this.searchForm.bizType || undefined,
          orderNo: this.searchForm.orderNo ? this.searchForm.orderNo.trim() : undefined
        }
        const res = await getUnifiedOutboundList(params)
        if (this.isApiSuccess(res)) {
          const data = res.data || {}
          const records = Array.isArray(data.records) ? data.records : []
          this.list = this.applySortOnRows(records)
          this.allRows = []
          this.pagination.total = Number(data.total || 0)
          this.pagination.page = Number(data.current || this.pagination.page || 1)
          this.pagination.size = Number(data.size || this.pagination.size || 20)
        } else {
          this.list = []
          this.allRows = []
          this.pagination.total = 0
        }
      } catch (e) {
        console.error(e)
        this.allRows = []
        this.list = []
        this.pagination.total = 0
      } finally {
        this.loading = false
        this.scheduleTableLayout()
      }
    },
    aggregateTapeOutboundRows(rows) {
      const src = Array.isArray(rows) ? rows : []
      const pendingRows = src.filter(r => Number((r && r.status) || 0) === 0)
      const doneRows = src.filter(r => Number((r && r.status) || 0) !== 0)

      const groupMap = new Map()
      doneRows.forEach(row => {
        const key = [
          row.materialCode || '',
          row.productName || '',
          row.specDesc || '',
          row.sequenceNo || '',
          (row.remark || '').trim(),
          row.applyDept || '',
          row.status || ''
        ].join('|')
        if (!groupMap.has(key)) {
          groupMap.set(key, {
            ...row,
            isAggregated: false,
            sourceRows: [row]
          })
          return
        }
        const agg = groupMap.get(key)
        agg.sourceRows.push(row)
        agg.rolls = Number(agg.rolls || 0) + Number(row.rolls || 0)
        const a1 = Number(agg.availableRolls)
        const a2 = Number(row.availableRolls)
        agg.availableRolls = (Number.isFinite(a1) ? a1 : 0) + (Number.isFinite(a2) ? a2 : 0)
        const t1 = new Date(agg.applyTime || agg.sortTime || 0).getTime() || 0
        const t2 = new Date(row.applyTime || row.sortTime || 0).getTime() || 0
        if (t2 > t1) {
          agg.applyTime = row.applyTime
          agg.sortTime = row.sortTime
        }
      })

      const aggregatedDone = Array.from(groupMap.values()).map(item => {
        if (!item.sourceRows || item.sourceRows.length <= 1) {
          item.isAggregated = false
          item.qtyText = `${Number(item.rolls || 0)}卷`
          return item
        }
        const size = item.sourceRows.length
        const uniqueBatch = new Set(item.sourceRows.map(x => x.batchNo).filter(Boolean))
        const uniqueApplicant = new Set(item.sourceRows.map(x => x.applicant).filter(Boolean))
        return {
          ...item,
          isAggregated: true,
          id: `AGG-${item.materialCode || ''}-${item.specDesc || ''}-${item.status || ''}-${size}`,
          requestNo: `聚合${size}条`,
          batchNo: uniqueBatch.size <= 1 ? (item.batchNo || '-') : `多批次(${uniqueBatch.size})`,
          applicant: uniqueApplicant.size <= 1 ? (item.applicant || '-') : `多人(${uniqueApplicant.size})`,
          qtyText: `${Number(item.rolls || 0)}卷`
        }
      })

      return [...pendingRows, ...aggregatedDone]
    },
    async loadTapeOutboundPage(params) {
      const query = {
        page: 1,
        size: 1000,
        status: params.status,
        materialCode: params.materialCode,
        orderNo: params.orderNo
      }
      const res = await getOutboundList(query)
      if (this.isApiSuccess(res)) {
        const rows = ((res.data && res.data.records) || []).map(this.normalizeTapeOutboundRow)
        this.allRows = this.aggregateTapeOutboundRows(rows)
        this.paginateClientRows(this.allRows)
      } else {
        this.allRows = []
        this.paginateClientRows(this.allRows)
      }
    },
    normalizeTapeOutboundRow(row) {
      const sequenceNo = row && (row.sequenceNo || row.sequence_no)
      return {
        ...(row || {}),
        bizType: 'TAPE_PRODUCT',
        bizTypeLabel: '胶带产品',
        sequenceNo: sequenceNo ? Number(sequenceNo) : null,
        remark: (row && row.remark) || '',
        qtyText: `${Number((row && row.rolls) || 0)}卷`,
        sortTime: (row && (row.applyTime || row.createTime)) || ''
      }
    },
    normalizeFilmOutboundRow(row) {
      const area = Number((row && row.outArea) || 0)
      const beforeAreaText = this.extractOutboundTokenFromRemark(row && row.remark, 'beforeAvailableArea')
      const beforeRollsText = this.extractOutboundTokenFromRemark(row && row.remark, 'beforeAvailableRolls')
      const availableText = beforeAreaText
        ? `${beforeAreaText}㎡`
        : (beforeRollsText ? `${beforeRollsText}卷` : `>=${(Math.round(area * 100) / 100).toFixed(2)}㎡`)
      return {
        ...(row || {}),
        requestNo: (row && row.outboundNo) || '',
        productName: (row && row.productName) || ((row && row.materialCode) || ''),
        specDesc: (row && row.specDesc) || '薄膜原材料',
        applicant: (row && row.outboundBy) || '',
        applyDept: '原材料仓',
        applyTime: (row && (row.outboundTime || row.createTime)) || '',
        status: 1,
        availableRolls: availableText,
        bizType: 'RAW_MATERIAL',
        bizTypeLabel: '原材料',
        sourceKind: 'FILM',
        qtyText: `${(Math.round(area * 100) / 100).toFixed(2)}㎡`,
        sortTime: (row && (row.outboundTime || row.createTime)) || ''
      }
    },
    normalizeChemicalOutboundRow(row) {
      const weight = Number((row && row.outWeight) || 0)
      const beforeWeightText = this.extractOutboundTokenFromRemark(row && row.remark, 'beforeAvailableWeight')
      const stockSpecSnapshot = this.extractOutboundTokenFromRemark(row && row.remark, 'stockSpec')
      const availableText = beforeWeightText
        ? `${beforeWeightText}kg`
        : `>=${(Math.round(weight * 1000) / 1000).toFixed(3)}kg`
      return {
        ...(row || {}),
        requestNo: (row && row.outboundNo) || '',
        productName: (row && row.productName) || ((row && row.materialCode) || ''),
        specDesc: stockSpecSnapshot || ((row && row.specDesc) || '化工原材料'),
        applicant: (row && row.outboundBy) || '',
        applyDept: '原材料仓',
        applyTime: (row && (row.outboundTime || row.createTime)) || '',
        status: 1,
        availableRolls: availableText,
        bizType: 'RAW_MATERIAL',
        bizTypeLabel: '原材料',
        sourceKind: 'CHEMICAL',
        qtyText: `${(Math.round(weight * 1000) / 1000).toFixed(3)}kg`,
        sortTime: (row && (row.outboundTime || row.createTime)) || ''
      }
    },
    sortByTimeDesc(list) {
      return (list || []).slice().sort((a, b) => {
        const ta = new Date(a && a.sortTime ? a.sortTime : 0).getTime() || 0
        const tb = new Date(b && b.sortTime ? b.sortTime : 0).getTime() || 0
        return tb - ta
      })
    },
    handleTableSortChange({ prop, order }) {
      this.sortState = {
        prop: prop || '',
        order: order || ''
      }
      this.applyLocalSort()
    },
    getOutboundQtyNumber(row) {
      if (!row) return 0
      if (row.bizType === 'TAPE_PRODUCT') {
        const rolls = Number(row.rolls)
        return Number.isFinite(rolls) ? rolls : 0
      }
      if (row.sourceKind === 'FILM') {
        const area = Number(row.outArea)
        return Number.isFinite(area) ? area : 0
      }
      if (row.sourceKind === 'CHEMICAL') {
        const weight = Number(row.outWeight)
        return Number.isFinite(weight) ? weight : 0
      }
      return 0
    },
    getSequenceNoText(row) {
      if (!row) return '-'
      const direct = row.digitalNo || row.numberNo || row.printNumber || row.printNo
      if (direct !== null && direct !== undefined && String(direct).trim() !== '') {
        return String(direct).trim()
      }
      const text = String((row && row.remark) || '')
      const m = text.match(/数字号\s*[:：=]\s*([^；;,\s|]+)/)
      return m && m[1] ? String(m[1]).trim() : '-'
    },
    getSortValue(row, prop) {
      if (!row) return ''
      if (prop === '__qty') return this.getOutboundQtyNumber(row)
      if (prop === 'status') return Number(row.status || 0)
      if (prop === 'applyTime') {
        const t = new Date(row.applyTime || row.sortTime || 0).getTime()
        return Number.isFinite(t) ? t : 0
      }
      if (prop === 'availableRolls') {
        const v = Number(row.availableRolls)
        return Number.isFinite(v) ? v : -1
      }
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
        if (naOk && nbOk) {
          return (na - nb) * factor
        }

        const sa = va === null || va === undefined ? '' : String(va)
        const sb = vb === null || vb === undefined ? '' : String(vb)
        return sa.localeCompare(sb, 'zh-CN') * factor
      })
      return arr
    },
    applyLocalSort() {
      this.list = this.applySortOnRows(this.list)
    },
    paginateClientRows(rows) {
      const all = this.applySortOnRows(rows || [])
      const total = all.length
      const current = Number(this.pagination.page || 1)
      const size = Number(this.pagination.size || 20)
      const start = (current - 1) * size
      const end = start + size
      this.list = all.slice(start, end)
      this.pagination.total = total
    },
    async loadRawOutboundPage(params) {
      const query = {
        page: 1,
        size: 1000,
        materialCode: params.materialCode
      }
      const [filmRes, chemicalRes] = await Promise.all([
        getFilmOutboundList(query),
        getChemicalOutboundList(query)
      ])
      const filmRows = this.isApiSuccess(filmRes)
        ? ((filmRes.data && filmRes.data.records) || []).map(this.normalizeFilmOutboundRow)
        : []
      const chemicalRows = this.isApiSuccess(chemicalRes)
        ? ((chemicalRes.data && chemicalRes.data.records) || []).map(this.normalizeChemicalOutboundRow)
        : []
      this.allRows = this.sortByTimeDesc([...(filmRows || []), ...(chemicalRows || [])])
      this.paginateClientRows(this.allRows)
    },
    async loadAllOutboundPage(params) {
      const tapeQuery = {
        page: 1,
        size: 1000,
        status: params.status,
        materialCode: params.materialCode,
        orderNo: params.orderNo
      }
      const rawQuery = {
        page: 1,
        size: 1000,
        materialCode: params.materialCode
      }
      const [tapeRes, filmRes, chemicalRes] = await Promise.all([
        getOutboundList(tapeQuery),
        getFilmOutboundList(rawQuery),
        getChemicalOutboundList(rawQuery)
      ])
      const tapeRows = this.isApiSuccess(tapeRes)
        ? ((tapeRes.data && tapeRes.data.records) || []).map(this.normalizeTapeOutboundRow)
        : []
      const aggregatedTapeRows = this.aggregateTapeOutboundRows(tapeRows)
      const filmRows = this.isApiSuccess(filmRes)
        ? ((filmRes.data && filmRes.data.records) || []).map(this.normalizeFilmOutboundRow)
        : []
      const chemicalRows = this.isApiSuccess(chemicalRes)
        ? ((chemicalRes.data && chemicalRes.data.records) || []).map(this.normalizeChemicalOutboundRow)
        : []
      this.allRows = this.sortByTimeDesc([...(aggregatedTapeRows || []), ...(filmRows || []), ...(chemicalRows || [])])
      this.paginateClientRows(this.allRows)
    },
    handleSearch() {
      this.pagination.page = 1
      this.fetchData()
    },
    handleReset() {
      this.searchForm = { status: 0, materialCode: '', bizType: '', orderNo: '' }
      this.handleSearch()
    },
    isApiSuccess(res) {
      return !!res && (res.code === 200 || res.code === 20000)
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
      this.selectMaterialCode = ''
      this.selectedMaterialCode = ''
      this.selectedMaterialSourceType = ''
      this.selectedMaterialMeta = null
      this.stockList = []
      this.stockQuery = { page: 1, size: 20, total: 0, sortProp: '', sortOrder: '' }
      this.stockSelectionMap = {}
      this.selectedStock = null
      this.selectedStocks = []
      this.form = { stockId: null, batchNo: '', rolls: 1, applyDept: '', remark: '订单生产', orderNo: '', orderItemId: null }
      this.dialogVisible = true
    },
    openBatchScanDialog() {
      this.batchScanRollCodes = ''
      this.batchAuditRemark = ''
      this.batchDialogVisible = true
    },
    async loadStockByMaterial() {
      const selectedCode = this.selectedMaterialCode ? String(this.selectedMaterialCode).trim() : ''
      if (!selectedCode) {
        this.stockList = []
        this.stockQuery.total = 0
        this.selectedStock = null
        this.$message.warning('请先从研发料号列表中选择料号')
        return
      }

      this.stockQuery.page = 1
      this.stockSelectionMap = {}
      this.selectedStocks = []
      this.selectedStock = null
      this.form.batchNo = ''
      this.form.rolls = 1
      await this.reloadStockPage(true)
    },
    async reloadStockPage(showEmptyMessage = false) {
      const selectedCode = this.selectedMaterialCode ? String(this.selectedMaterialCode).trim() : ''
      if (!selectedCode) {
        this.stockList = []
        this.stockQuery.total = 0
        return
      }

      if (this.selectedMaterialSourceType === 'raw') {
        const preferFilm = this.isFilmLikeRawMaterial(this.selectedMaterialMeta)
        if (preferFilm) {
          const loaded = await this.loadFilmStockByMaterial(selectedCode)
          if (loaded) {
            return
          }
          const loadedChemical = await this.loadChemicalStockByMaterial(selectedCode)
          if (!loadedChemical && showEmptyMessage) {
            this.$message.info('该料号在薄膜仓和化工原材料仓均无可用库存批次')
          }
          return
        }
        const loaded = await this.loadChemicalStockByMaterial(selectedCode)
        if (loaded) {
          return
        }
        const loadedFilm = await this.loadFilmStockByMaterial(selectedCode)
        if (!loadedFilm && showEmptyMessage) {
          this.$message.info('该料号在化工原材料仓和薄膜仓均无可用库存批次')
        }
        return
      }

      try {
        const res = await getStockByMaterialPage({
          materialCode: selectedCode,
          current: this.stockQuery.page,
          size: this.stockQuery.size,
          sortField: this.stockQuery.sortProp || undefined,
          sortOrder: this.stockQuery.sortOrder || undefined
        })
        if (this.isApiSuccess(res)) {
          const data = res.data || {}
          const records = Array.isArray(data.records) ? data.records : []
          if (records.length > 0 || Number(data.total || 0) > 0) {
            this.stockList = records.map(this.mapTapeStockRow)
            this.stockQuery.total = Number(data.total || 0)
            this.stockQuery.page = Number(data.current || this.stockQuery.page || 1)
            this.stockQuery.size = Number(data.size || this.stockQuery.size || 20)
            this.restoreStockSelectionOnPage()
            return
          }

          // 兜底：部分料号可能被维护在原材料仓（薄膜/化工）
          const loadedFilm = await this.loadFilmStockByMaterial(selectedCode)
          if (loadedFilm) {
            this.selectedMaterialSourceType = 'raw'
            if (showEmptyMessage) this.$message.info('胶带仓无可用批次，已自动切换到薄膜仓库存')
            return
          }

          const loadedChemical = await this.loadChemicalStockByMaterial(selectedCode)
          if (loadedChemical) {
            this.selectedMaterialSourceType = 'raw'
            if (showEmptyMessage) this.$message.info('胶带仓无可用批次，已自动切换到化工原材料仓库存')
            return
          }

          this.stockList = []
          this.stockQuery.total = 0
          this.selectedStock = null
          if (showEmptyMessage) {
            this.$message.info('该料号在胶带仓、薄膜仓、化工原材料仓均无可用库存批次')
          }
        }
      } catch (e) {
        this.$message.error('查询失败')
      }
    },
    isFilmLikeRawMaterial(raw) {
      if (!raw) return false
      const category = String(raw.materialCategory || '').toLowerCase()
      const type = String(raw.materialType || '').toLowerCase()
      const name = String(raw.productName || raw.materialName || '').toLowerCase()
      const text = `${category} ${type} ${name}`
      return text.includes('film') || text.includes('薄膜') || text.includes('离型')
    },
    async loadFilmStockByMaterial(materialCode) {
      try {
        const res = await getAvailableFilmDetailsPage({
          materialCode,
          current: this.stockQuery.page,
          size: this.stockQuery.size,
          sortField: this.stockQuery.sortProp || undefined,
          sortOrder: this.stockQuery.sortOrder || undefined
        })
        if (!this.isApiSuccess(res)) {
          this.$message.error((res && res.msg) || '查询失败')
          return false
        }

        const data = res.data || {}
        const records = Array.isArray(data.records) ? data.records : []
        this.stockList = records.map(this.mapFilmDetailRow)
        this.stockQuery.total = Number(data.total || 0)
        this.stockQuery.page = Number(data.current || this.stockQuery.page || 1)
        this.stockQuery.size = Number(data.size || this.stockQuery.size || 20)
        this.restoreStockSelectionOnPage()
        if (this.stockQuery.total <= 0) {
          return false
        }
        return true
      } catch (e) {
        this.$message.error('查询失败')
        return false
      }
    },
    async loadChemicalStockByMaterial(materialCode) {
      try {
        const res = await getAvailableChemicalDetailsPage({
          materialCode,
          current: this.stockQuery.page,
          size: this.stockQuery.size,
          sortField: this.stockQuery.sortProp || undefined,
          sortOrder: this.stockQuery.sortOrder || undefined
        })
        if (!this.isApiSuccess(res)) {
          this.$message.error((res && res.msg) || '查询失败')
          return false
        }

        const data = res.data || {}
        const records = Array.isArray(data.records) ? data.records : []
        this.stockList = records.map(this.mapChemicalDetailRow)
        this.stockQuery.total = Number(data.total || 0)
        this.stockQuery.page = Number(data.current || this.stockQuery.page || 1)
        this.stockQuery.size = Number(data.size || this.stockQuery.size || 20)
        this.restoreStockSelectionOnPage()
        if (this.stockQuery.total <= 0) {
          return false
        }
        return true
      } catch (e) {
        this.$message.error('查询失败')
        return false
      }
    },
    mapTapeStockRow(row) {
      return {
        ...(row || {}),
        sourceStockType: 'tape',
        sequenceNo: row && row.sequenceNo != null ? Number(row.sequenceNo) : null,
        totalRolls: Number((row && row.totalRolls) || 0),
        availableArea: Number((row && row.availableArea) || 0),
        outboundRolls: 1
      }
    },
    mapFilmDetailRow(detail) {
      const area = Number(detail && detail.area)
      return {
        id: `film-${detail.id}`,
        sourceStockType: 'film',
        sourceStockId: detail.filmStockId,
        sourceDetailId: detail.id,
        materialCode: detail.materialCode,
        productName: detail.materialCode,
        rawSpec: (detail && (detail.specDesc || detail.materialSpec || detail.remark)) || '',
        specDesc: (detail && (detail.specDesc || detail.materialSpec || detail.remark)) || '',
        qrCode: detail.rollNo || detail.batchNo || '-',
        batchNo: detail.batchNo,
        sequenceNo: null,
        rollType: '薄膜',
        thickness: detail.thickness,
        width: detail.width,
        currentLength: detail.length,
        length: detail.length,
        totalRolls: 1,
        availableArea: Number.isFinite(area) ? area : 0,
        location: detail.location || '',
        prodDate: detail.inboundDate || '',
        outboundRolls: 1
      }
    },
    mapChemicalDetailRow(detail) {
      const weight = Number(detail && detail.weight)
      return {
        id: `chemical-${detail.id}`,
        sourceStockType: 'chemical',
        sourceStockId: detail.chemicalStockId,
        sourceDetailId: detail.id,
        materialCode: detail.materialCode,
        productName: detail.materialCode,
        rawSpec: (detail && (detail.specDesc || detail.materialSpec || detail.remark)) || '',
        specDesc: (detail && (detail.specDesc || detail.materialSpec || detail.remark)) || '',
        stdQtyPerPack: Number(detail && detail.stdQtyPerPack),
        stdUom: detail && detail.stdUom,
        packUom: detail && detail.packUom,
        qrCode: detail.containerNo || detail.batchNo || '-',
        batchNo: detail.batchNo,
        sequenceNo: null,
        rollType: '原料',
        thickness: '-',
        width: '-',
        currentLength: '-',
        length: '-',
        totalRolls: 1,
        availableArea: Number.isFinite(weight) ? weight : 0,
        bucketWeight: Number.isFinite(weight) ? weight : null,
        location: detail.location || '',
        prodDate: detail.inboundDate || '',
        outboundRolls: 1
      }
    },
    restoreStockSelectionOnPage() {
      const selectedMap = this.stockSelectionMap || {}
      this.stockList = (this.stockList || []).map(row => {
        const key = String(row.id)
        const existed = selectedMap[key]
        if (!existed) return row
        const max = Math.max(1, Number(row.totalRolls || 1))
        const outboundRolls = Math.min(Math.max(1, Number(existed.outboundRolls || 1)), max)
        return { ...row, outboundRolls }
      })
      this.$nextTick(() => {
        if (!this.$refs.stockTable) return
        this.$refs.stockTable.clearSelection()
        this.stockList.forEach(row => {
          if (selectedMap[String(row.id)]) {
            this.$refs.stockTable.toggleRowSelection(row, true)
          }
        })
      })
    },
    rebuildSelectedStocksFromMap() {
      const list = Object.values(this.stockSelectionMap || {})
      this.selectedStocks = list
      this.selectedStock = list.length ? list[0] : null
      this.form.batchNo = list.map(item => item.batchNo).filter(Boolean).join(',')
      this.form.rolls = this.selectedTotalRolls || (list.length ? list.length : 1)
    },
    handleStockTableSortChange({ prop, order }) {
      this.stockQuery.sortProp = prop || ''
      this.stockQuery.sortOrder = order || ''
      this.stockQuery.page = 1
      this.reloadStockPage(false)
    },
    handleStockSizeChange(size) {
      this.stockQuery.size = size
      this.stockQuery.page = 1
      this.reloadStockPage(false)
    },
    handleStockCurrentChange(page) {
      this.stockQuery.page = page
      this.reloadStockPage(false)
    },
    handleStockSelectionChange(rows) {
      const map = { ...(this.stockSelectionMap || {}) }
      const currentPageIds = (this.stockList || []).map(item => String(item.id))
      currentPageIds.forEach(id => {
        delete map[id]
      })
      ;(rows || []).forEach(row => {
        const key = String(row.id)
        const existed = map[key]
        const max = Math.max(1, Number(row.totalRolls || 1))
        const outboundRolls = existed && existed.outboundRolls ? Number(existed.outboundRolls) : 1
        map[key] = {
          ...row,
          outboundRolls: Math.min(Math.max(1, outboundRolls), max)
        }
      })
      this.stockSelectionMap = map
      this.rebuildSelectedStocksFromMap()
    },
    selectStock(row) {
      if (!this.$refs.stockTable) return
      this.$refs.stockTable.toggleRowSelection(row)
    },
    onSelectedRollsChange(row) {
      if (!row) return
      const max = Math.max(1, Number(row.totalRolls || 1))
      const val = Number(row.outboundRolls || 1)
      row.outboundRolls = Math.min(Math.max(1, val), max)
      const key = String(row.id)
      if (this.stockSelectionMap && this.stockSelectionMap[key]) {
        this.stockSelectionMap[key] = {
          ...this.stockSelectionMap[key],
          outboundRolls: row.outboundRolls
        }
      }
      this.rebuildSelectedStocksFromMap()
    },
    getPerRollArea(row) {
      if (!row) return 0
      const availableArea = Number(row.availableArea)
      const totalRolls = Number(row.totalRolls)
      if (Number.isFinite(availableArea) && availableArea > 0 && Number.isFinite(totalRolls) && totalRolls > 0) {
        return availableArea / totalRolls
      }

      const width = Number(row.width)
      const length = Number(row.currentLength != null ? row.currentLength : row.length)
      if (Number.isFinite(width) && width > 0 && Number.isFinite(length) && length > 0) {
        return (width * length) / 1000
      }
      return 0
    },
    appendRemarkToken(baseRemark, key, value) {
      const base = baseRemark ? String(baseRemark).trim() : ''
      const v = value === null || value === undefined ? '' : String(value)
      const token = `${key}=${v}`
      if (!base) return token
      if (base.includes(token)) return base
      return `${base};${token}`
    },
    extractOutboundTokenFromRemark(remark, key) {
      const text = String(remark || '')
      if (!text || !key) return ''
      const escapedKey = String(key).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const reg = new RegExp(`(?:^|[|,;\\s])${escapedKey}=([^|,;]+)`, 'i')
      const m = text.match(reg)
      return m && m[1] ? String(m[1]).trim() : ''
    },
    splitSpecSegments(specText) {
      const text = String(specText || '').trim()
      if (!text) return []
      return text
        .split(/[，,;；\n\r]+/g)
        .map(s => String(s || '').trim())
        .filter(Boolean)
    },
    extractSpecNumbers(text) {
      const nums = []
      const reg = /(\d+(?:\.\d+)?)/g
      const src = String(text || '')
      let m
      while ((m = reg.exec(src)) && nums.length < 4) {
        const n = Number(m[1])
        if (Number.isFinite(n) && n > 0) nums.push(n)
      }
      return nums
    },
    pickBestSpecSegment(specText, row) {
      const segments = this.splitSpecSegments(specText)
      if (!segments.length) return ''
      if (segments.length === 1) return segments[0]

      const targetW = Number(row && row.width)
      const targetL = Number(row && (row.currentLength != null ? row.currentLength : row.length))
      const targetT = Number(row && row.thickness)

      let best = segments[0]
      let bestScore = -1
      segments.forEach(seg => {
        const nums = this.extractSpecNumbers(seg)
        let score = 0
        if (Number.isFinite(targetW) && targetW > 0 && nums.some(n => Math.abs(n - targetW) < 0.0001)) score += 50
        if (Number.isFinite(targetL) && targetL > 0 && nums.some(n => Math.abs(n - targetL) < 0.0001)) score += 40
        if (Number.isFinite(targetT) && targetT > 0 && nums.some(n => Math.abs(n - targetT) < 0.0001)) score += 30
        if (score > bestScore) {
          best = seg
          bestScore = score
        }
      })
      return best
    },
    buildSpecFromDimensions(row) {
      const t = Number(row && row.thickness)
      const w = Number(row && row.width)
      const l = Number(row && (row.currentLength != null ? row.currentLength : row.length))
      const hasT = Number.isFinite(t) && t > 0
      const hasW = Number.isFinite(w) && w > 0
      const hasL = Number.isFinite(l) && l > 0
      if (hasT && hasW && hasL) return `${t}μm×${w}mm×${l}m`
      if (hasW && hasL) return `${w}mm×${l}m`
      if (hasT && hasW) return `${t}μm×${w}mm`
      if (hasW) return `${w}mm`
      if (hasL) return `${l}m`
      return ''
    },
    getSpecText(row) {
      if (!row) return '-'
      if (row.sourceStockType === 'film') {
        const dimSpec = this.buildSpecFromDimensions(row)
        if (dimSpec) return dimSpec
        const rawSpec = this.sanitizeSpecText(row.rawSpec)
        if (rawSpec) {
          const singleSpec = this.pickBestSpecSegment(rawSpec, row)
          if (singleSpec) return singleSpec
          return rawSpec
        }
        return '-'
      }
      if (row.sourceStockType === 'chemical') {
        const stdQtyPerPack = Number(row.stdQtyPerPack)
        if (Number.isFinite(stdQtyPerPack) && stdQtyPerPack > 0) {
          const unit = String(row.stdUom || 'kg').trim() || 'kg'
          const pack = String(row.packUom || '桶').trim() || '桶'
          return `${(Math.round(stdQtyPerPack * 1000) / 1000).toFixed(3)}${unit}/${pack}`
        }
        const bucketWeight = Number(row.bucketWeight)
        if (Number.isFinite(bucketWeight) && bucketWeight > 0) {
          return `${(Math.round(bucketWeight * 100) / 100).toFixed(2)}kg/桶`
        }
        const rawSpec = this.sanitizeSpecText(row.rawSpec)
        if (rawSpec.includes('，')) return rawSpec.split('，')[0].trim()
        if (rawSpec.includes(',')) return rawSpec.split(',')[0].trim()
        return rawSpec || '化工原料'
      }
      const dimSpec = this.buildSpecFromDimensions(row)
      if (dimSpec) return dimSpec
      const cleaned = this.sanitizeSpecText(row.specDesc)
      return cleaned || row.specDesc || '-'
    },
    getDisplaySpec(row) {
      if (!row) return '-'
      const cleaned = this.sanitizeSpecText(row.specDesc)
      if (cleaned) return cleaned
      if (row.sourceKind === 'CHEMICAL') return '化工原料'
      if (row.sourceKind === 'FILM') return '-'
      return row.specDesc || '-'
    },
    sanitizeSpecText(text) {
      const raw = String(text || '').trim()
      if (!raw) return ''
      if (this.isLikelySpecText(raw)) return raw

      const segments = raw
        .split(/[|；;\n\r]+/g)
        .map(s => String(s || '').trim())
        .filter(Boolean)

      for (const seg of segments) {
        if (this.isLikelySpecText(seg)) return seg
      }
      return ''
    },
    isLikelySpecText(text) {
      const t = String(text || '').trim()
      if (!t) return false
      if (/[\[\]{}]/.test(t)) return false
      if (/\b(receipt|supplier|purchaseOrder|inbound|itemId|receiptId|outbound)\b/i.test(t)) return false
      if (/=/.test(t)) return false
      return /(μm|um|mm|cm|m|kg|g|桶|卷|×|x|X|\/)/i.test(t)
    },
    async submitSingleOutboundRequest(stockRow, outboundQty) {
      const qty = Math.max(1, Number(outboundQty || 1))
      if (stockRow && stockRow.sourceStockType === 'film') {
        const beforeArea = Number(stockRow.availableArea || 0)
        const beforeRolls = Number(stockRow.totalRolls || 0)
        const remarkWithSnapshot = this.appendRemarkToken(
          this.appendRemarkToken(this.form.remark, 'beforeAvailableArea', (Math.round(beforeArea * 100) / 100).toFixed(2)),
          'beforeAvailableRolls', beforeRolls
        )
        const payload = {
          filmStockId: stockRow.sourceStockId,
          outArea: Number(stockRow.availableArea || 0),
          outRolls: qty,
          outboundBy: this.name,
          remark: remarkWithSnapshot,
          batchNo: stockRow.batchNo,
          detailIds: [stockRow.sourceDetailId]
        }
        return createFilmOutbound(payload)
      }
      if (stockRow && stockRow.sourceStockType === 'chemical') {
        const beforeWeight = Number(stockRow.availableArea || 0)
        const stockSpec = this.getSpecText(stockRow)
        const remarkWithSnapshot = this.appendRemarkToken(
          this.appendRemarkToken(this.form.remark, 'stockSpec', stockSpec),
          'beforeAvailableWeight',
          (Math.round(beforeWeight * 1000) / 1000).toFixed(3)
        )
        const payload = {
          chemicalStockId: stockRow.sourceStockId,
          outQuantity: qty,
          outWeight: Number(stockRow.availableArea || 0),
          outboundBy: this.name,
          remark: remarkWithSnapshot,
          batchNo: stockRow.batchNo,
          detailIds: [stockRow.sourceDetailId]
        }
        return createChemicalOutbound(payload)
      }
      const payload = {
        stockId: stockRow.id,
        rolls: qty,
        applyDept: this.form.applyDept,
        remark: this.form.remark,
        applicant: this.name,
        orderNo: this.form.orderNo ? String(this.form.orderNo).trim() : undefined,
        orderItemId: this.form.orderItemId || undefined,
        bizType: 'MANUAL'
      }
      return createOutboundRequest(payload)
    },
    async handleSubmit() {
      if (!this.selectedStocks.length) {
        this.$message.warning('请先选择至少一个批次')
        return
      }
      const target = Number(this.form.rolls || 0)
      if (target > 0 && this.selectedTotalRolls < target) {
        this.$message.warning(`当前已选${this.selectedTotalRolls}卷，小于目标${target}卷`)
        return
      }

      this.submitLoading = true
      try {
        const failures = []
        let successCount = 0
        const totalRolls = (this.selectedStocks || []).reduce((sum, row) => {
          const qty = Math.max(1, Number((row && row.outboundRolls) || 1))
          return sum + qty
        }, 0)

        for (const row of this.selectedStocks) {
          const qty = Math.max(1, Number(row.outboundRolls || 1))
          try {
            const res = await this.submitSingleOutboundRequest(row, qty)
            if (this.isApiSuccess(res)) {
              successCount++
            } else {
              failures.push(`${row.batchNo || row.id}: ${res.msg || '提交失败'}`)
            }
          } catch (e) {
            failures.push(`${row.batchNo || row.id}: 提交失败`)
          }
        }

        if (successCount > 0) {
          this.$message.success(`提交成功：${successCount} 个批次，合计 ${totalRolls} 卷`)
          this.dialogVisible = false
          this.fetchData()
        }
        if (successCount === 0 && failures.length === 0) {
          this.$message.info('该料号在对应仓库无可用库存批次')
        }
        if (failures.length > 0) {
          this.$message.error(`失败 ${failures.length} 条，请重试`)
          console.error('批量提交出库申请失败明细:', failures)
        }
      } finally {
        this.submitLoading = false
      }
    },
    handleAddFIFO() {
      this.fifoForm = { materialCode: '', totalRolls: 1, applyDept: '', remark: '订单生产', orderNo: '', orderItemId: null }
      this.fifoDialogVisible = true
    },
    async handleFIFOSubmit() {
      this.$refs.fifoForm.validate(async(valid) => {
        if (!valid) return
        this.fifoLoading = true
        try {
          const params = {
            materialCode: this.fifoForm.materialCode,
            totalRolls: this.fifoForm.totalRolls,
            applicant: this.name,
            applyDept: this.fifoForm.applyDept,
            remark: this.fifoForm.remark,
            orderNo: this.fifoForm.orderNo ? String(this.fifoForm.orderNo).trim() : undefined,
            orderItemId: this.fifoForm.orderItemId || undefined,
            bizType: 'MANUAL'
          }
          const res = await createOutboundRequestFIFO(params)
          if (this.isApiSuccess(res)) {
            this.$message.success(res.msg || '申请提交成功')
            this.fifoDialogVisible = false
            this.fetchData()
          } else {
            this.$message.error(res.msg || '提交失败')
          }
        } catch (e) {
          this.$message.error('提交失败')
        } finally {
          this.fifoLoading = false
        }
      })
    },
    handleApprove(row, approved) {
      this.approveRow = row
      this.approveAction = approved
      this.approveTitle = approved ? '审批通过' : '退回申请'
      this.auditRemark = ''
      this.scanRollCode = ''
      this.approveVisible = true
    },
    handleEdit(row) {
      if (!this.isPendingTapeRow(row)) {
        this.$message.warning('仅待审批的胶带产品申请可修改')
        return
      }
      this.editForm = {
        id: row.id,
        requestNo: row.requestNo || '',
        materialCode: row.materialCode || '',
        rolls: Number(row.rolls || 1),
        applyDept: row.applyDept || '',
        remark: row.remark || ''
      }
      this.editVisible = true
    },
    async confirmEdit() {
      if (!this.editForm || !this.editForm.id) return
      if (!this.editForm.rolls || Number(this.editForm.rolls) <= 0) {
        this.$message.warning('出库卷数必须大于0')
        return
      }
      this.editLoading = true
      try {
        const res = await updateOutboundRequest(this.editForm.id, {
          rolls: Number(this.editForm.rolls),
          applyDept: this.editForm.applyDept,
          remark: this.editForm.remark
        })
        if (this.isApiSuccess(res)) {
          this.$message.success('修改成功')
          this.editVisible = false
          this.fetchData()
        } else {
          this.$message.error(res.msg || '修改失败')
        }
      } catch (e) {
        this.$message.error('修改失败')
      } finally {
        this.editLoading = false
      }
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
      if (!multiCodes.length) {
        this.$message.warning('请先录入卷号')
        return
      }
      this.batchApproveLoading = true
      try {
        const res = await approveOutboundByRollCodes({
          rollCodes: multiCodes,
          auditor: this.name,
          auditRemark: this.batchAuditRemark
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
      this.approveLoading = true
      try {
        const res = await approveOutbound(this.approveRow.id, this.approveAction, this.name, this.auditRemark, this.scanRollCode)
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
      this.$confirm('确定要取消该出库申请吗?', '提示', { type: 'warning' }).then(async() => {
        try {
          const res = await cancelOutbound(row.id)
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
    handleViewStatus(row) {
      if (!row) return
      const statusText = this.getStatusText(row.status)
      const isPassed = Number(row.status) === 1
      const passText = isPassed ? '是' : '否'
      const lines = [
        `申请单号：${row.requestNo || '-'}`,
        `状态：${statusText}`,
        `是否通过：${passText}`
      ]
      if (row.auditor) lines.push(`审批人：${row.auditor}`)
      if (row.auditTime) lines.push(`审批时间：${row.auditTime}`)
      if (row.auditRemark) lines.push(`审批备注：${row.auditRemark}`)
      this.$alert(lines.join('<br/>'), '审批状态', {
        dangerouslyUseHTMLString: true,
        confirmButtonText: '确定'
      })
    },
    getStatusType(status) {
      const map = { 0: 'warning', 1: 'success', 2: 'danger', 3: 'info' }
      return map[Number(status)] || 'info'
    },
    getStatusText(status) {
      const map = { 0: '待审批', 1: '已通过', 2: '已拒绝', 3: '已取消' }
      return map[Number(status)] || '未知'
    },
    isPendingTapeRow(row) {
      if (!row) return false
      const bizType = String(row.bizType || '').trim().toUpperCase()
      const status = Number(row.status)
      return bizType === 'TAPE_PRODUCT' && status === 0
    },
    getRollTypeTag(rollType) {
      const typeMap = {
        '母卷': 'primary',
        '复卷': 'success',
        '分切卷': 'warning'
      }
      return typeMap[rollType] || 'info'
    },
    getOutboundQtyText(row) {
      if (!row) return '-'
      if (row.qtyText) return row.qtyText
      const rolls = Number(row.rolls)
      if (Number.isFinite(rolls)) return `${rolls}卷`
      return '-'
    }
  }
}
</script>

<style lang="scss" scoped>
.outbound-container {
  padding: 20px;
  .search-card, .toolbar-card { margin-bottom: 15px; }
  .el-pagination { margin-top: 15px; text-align: right; }
  .text-muted { color: #909399; }
}
</style>

<style lang="scss">
.material-code-suggest-popper {
  width: 600px !important;
}
</style>
