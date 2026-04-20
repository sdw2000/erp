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
        <el-form-item>
          <el-button type="primary" icon="el-icon-search" @click="handleSearch">搜 索</el-button>
          <el-button icon="el-icon-refresh-left" @click="handleReset">重 置</el-button>
        </el-form-item>
      </el-form>

      <!-- 数据表格 -->
      <el-table ref="outboundTable" v-loading="loading" :data="list" style="width: 100%; margin-top: 15px" border stripe>
        <el-table-column prop="requestNo" label="申请单号" width="160" />
        <el-table-column prop="materialCode" label="料号" width="180" />
        <el-table-column prop="productName" label="产品名称" width="160" show-overflow-tooltip />
        <el-table-column prop="batchNo" label="生产批次号" width="130" />
        <el-table-column prop="specDesc" label="规格" width="160" />
        <el-table-column prop="rolls" label="出库卷数" width="90" align="center">
          <template slot-scope="scope">
            <el-tag type="danger">{{ scope.row.rolls }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="availableRolls" label="申请时可用" width="100" align="center" />
        <el-table-column prop="applicant" label="申请人" width="90" />
        <el-table-column prop="applyDept" label="申请部门" width="100" />
        <el-table-column prop="status" label="状态" width="90" align="center">
          <template slot-scope="scope">
            <el-tag :type="getStatusType(scope.row.status)">{{ getStatusText(scope.row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="applyTime" label="申请时间" width="160" />
        <el-table-column label="操作" width="180" fixed="right">
          <template slot-scope="scope">
            <template v-if="scope.row.status === 0">
              <el-button type="text" size="small" icon="el-icon-check" @click="handleApprove(scope.row, true)">通过</el-button>
              <el-button type="text" size="small" icon="el-icon-close" @click="handleApprove(scope.row, false)">拒绝</el-button>
              <el-button type="text" size="small" icon="el-icon-delete" @click="handleCancel(scope.row)">取消</el-button>
            </template>
            <span v-else class="text-muted">已处理</span>
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
      >
        <el-table-column type="selection" width="46" reserve-selection />
        <el-table-column type="index" width="50" />
        <el-table-column prop="qrCode" label="二维码" width="130" />
        <el-table-column prop="batchNo" label="批次号" width="120" />
        <el-table-column prop="rollType" label="卷类型" width="70" align="center">
          <template slot-scope="scope">
            <el-tag :type="getRollTypeTag(scope.row.rollType)" size="mini">{{ scope.row.rollType || '母卷' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="规格" width="160">
          <template slot-scope="scope">
            {{ scope.row.thickness }}μm×{{ scope.row.width }}mm×{{ scope.row.currentLength || scope.row.length }}m
          </template>
        </el-table-column>
        <el-table-column prop="totalRolls" label="可用卷数" width="90" align="center">
          <template slot-scope="scope">
            <el-tag type="success">{{ scope.row.totalRolls }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="location" label="卡板位" width="80" />
        <el-table-column prop="prodDate" label="生产日期" width="110" />
        <el-table-column label="操作" width="80">
          <template slot-scope="scope">
            <el-button type="text" size="small" @click.stop="selectStock(scope.row)">选择</el-button>
          </template>
        </el-table-column>
      </el-table>

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
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-alert
          v-if="selectedStocks.length"
          :title="`已选总卷数：${selectedTotalRolls}，目标出库卷数：${form.rolls || 0}，总面积：${selectedTotalAreaText}㎡${(form.rolls && selectedTotalRolls < form.rolls) ? '（不足）' : ''}`"
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
          </el-select>
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
        <el-form-item v-if="approveAction" label="扫码卷号">
          <el-input v-model="scanRollCode" placeholder="请扫码卷号/二维码" clearable />
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
import { getOutboundList, createOutboundRequest, createOutboundRequestFIFO, approveOutbound, approveOutboundByRollCodes, cancelOutbound, getStockByMaterial } from '@/api/tapeStock'
import { getSpecList } from '@/api/tapeSpec'
import { getRawMaterialPage } from '@/api/tapeRawMaterial'
import { mapGetters } from 'vuex'
import elTableAutoLayout from '@/mixins/elTableAutoLayout'

export default {
  name: 'OutboundRequest',
  mixins: [elTableAutoLayout],
  tableLayoutRefs: ['outboundTable'],
  data() {
    return {
      searchForm: { status: null, materialCode: '' },
      list: [],
      loading: false,
      pagination: { page: 1, size: 20, total: 0 },
      // 手动选择
      dialogVisible: false,
      submitLoading: false,
      selectMaterialCode: '',
      selectedMaterialCode: '',
      stockList: [],
      selectedStock: null,
      selectedStocks: [],
      form: { stockId: null, batchNo: '', rolls: 1, applyDept: '', remark: '订单生产' },
      rules: {
        rolls: [{ required: true, message: '请输入出库卷数', trigger: 'blur' }]
      },
      // FIFO
      fifoDialogVisible: false,
      fifoLoading: false,
      fifoForm: { materialCode: '', totalRolls: 1, applyDept: '', remark: '订单生产' },
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
        const [specRes, rawRes] = await Promise.all([
          getSpecList({ page: 1, size: 20, materialCode: keyword }),
          getRawMaterialPage({ page: 1, size: 20, materialCode: keyword, status: 1 })
        ])

        const list = []
        const pushUnique = (materialCode, productName, sourceType) => {
          const code = materialCode ? String(materialCode).trim() : ''
          if (!code) return
          if (list.some(x => x.materialCode === code)) return
          const name = productName ? String(productName).trim() : ''
          list.push({
            value: name ? `${code} - ${name}` : code,
            materialCode: code,
            productName: name,
            sourceType
          })
        }

        const specRecords = (((specRes || {}).data || {}).records) || (((specRes || {}).data || {}).list) || []
        specRecords.forEach(item => pushUnique(item && item.materialCode, item && (item.productName || item.materialName), '胶带规格'))

        const rawRecords = (((rawRes || {}).data || {}).records) || (((rawRes || {}).data || {}).list) || []
        rawRecords.forEach(item => pushUnique(item && item.materialCode, item && item.materialName, '原材料'))

        cb(list)
      } catch (e) {
        cb([])
      }
    },
    handleMaterialInputChange(val) {
      const input = val ? String(val).trim() : ''
      if (input !== this.selectedMaterialCode) {
        this.selectedMaterialCode = ''
        this.stockList = []
        this.selectedStock = null
        this.selectedStocks = []
      }
    },
    async handleMaterialSelect(item) {
      const code = item && item.materialCode ? String(item.materialCode).trim() : ''
      if (!code) return
      this.selectedMaterialCode = code
      this.selectMaterialCode = code
      await this.loadStockByMaterial()
    },
    async fetchData() {
      this.loading = true
      try {
        const params = {
          page: this.pagination.page,
          size: this.pagination.size,
          status: this.searchForm.status === null || this.searchForm.status === undefined || this.searchForm.status === '' ? undefined : this.searchForm.status,
          materialCode: this.searchForm.materialCode ? this.searchForm.materialCode.trim() : undefined
        }
        const res = await getOutboundList(params)
        if (this.isApiSuccess(res)) {
          this.list = res.data.records
          this.pagination.total = Number(res.data.total) || 0
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
    handleReset() {
      this.searchForm = { status: null, materialCode: '' }
      this.handleSearch()
    },
    isApiSuccess(res) {
      return !!res && (res.code === 200 || res.code === 20000)
    },
    handleSizeChange(size) {
      this.pagination.size = size
      this.fetchData()
    },
    handleCurrentChange(page) {
      this.pagination.page = page
      this.fetchData()
    },
    handleAdd() {
      this.selectMaterialCode = ''
      this.selectedMaterialCode = ''
      this.stockList = []
      this.selectedStock = null
      this.selectedStocks = []
      this.form = { stockId: null, batchNo: '', rolls: 1, applyDept: '', remark: '订单生产' }
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
        this.selectedStock = null
        this.$message.warning('请先从研发料号列表中选择料号')
        return
      }
      try {
        const res = await getStockByMaterial(selectedCode)
        if (this.isApiSuccess(res)) {
          this.stockList = res.data || []
          this.selectedStocks = []
          this.selectedStock = null
          this.$nextTick(() => {
            if (this.$refs.stockTable) {
              this.$refs.stockTable.clearSelection()
            }
          })
          if (this.stockList.length === 0) {
            this.selectedStock = null
            this.$message.info('该料号在仓库无可用库存批次')
          }
        }
      } catch (e) {
        this.$message.error('查询失败')
      }
    },
    handleStockSelectionChange(rows) {
      const previous = Array.isArray(this.selectedStocks) ? this.selectedStocks : []
      const next = (rows || []).map(row => {
        const existed = previous.find(one => one.id === row.id)
        const max = Math.max(1, Number(row.totalRolls || 1))
        const outboundRolls = existed && existed.outboundRolls ? Number(existed.outboundRolls) : 1
        return {
          ...row,
          outboundRolls: Math.min(Math.max(1, outboundRolls), max)
        }
      })
      this.selectedStocks = next
      this.selectedStock = next.length ? next[0] : null
      this.form.batchNo = next.map(item => item.batchNo).filter(Boolean).join(',')
      this.form.rolls = this.selectedTotalRolls || (next.length ? next.length : 1)
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
      this.form.rolls = this.selectedTotalRolls || 1
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
    getSpecText(row) {
      if (!row) return '-'
      const t = row.thickness != null ? row.thickness : ''
      const w = row.width != null ? row.width : ''
      const l = row.currentLength != null ? row.currentLength : row.length
      if (t !== '' || w !== '' || l !== '') {
        return `${t}μm×${w}mm×${l}m`
      }
      return row.specDesc || '-'
    },
    async submitSingleOutboundRequest(stockRow) {
      const payload = {
        stockId: stockRow.id,
        rolls: 1,
        applyDept: this.form.applyDept,
        remark: this.form.remark,
        applicant: this.name
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

        for (const row of this.selectedStocks) {
          const qty = Math.max(1, Number(row.outboundRolls || 1))
          for (let i = 0; i < qty; i++) {
            try {
              const res = await this.submitSingleOutboundRequest(row)
              if (this.isApiSuccess(res)) {
                successCount++
              } else {
                failures.push(`${row.batchNo || row.id}: ${res.msg || '提交失败'}`)
              }
            } catch (e) {
              failures.push(`${row.batchNo || row.id}: 提交失败`)
            }
          }
        }

        if (successCount > 0) {
          this.$message.success(`提交成功 ${successCount} 条`)
          this.dialogVisible = false
          this.fetchData()
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
      this.fifoForm = { materialCode: '', totalRolls: 1, applyDept: '', remark: '订单生产' }
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
            remark: this.fifoForm.remark
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
      this.approveTitle = approved ? '审批通过' : '审批拒绝'
      this.auditRemark = ''
      this.scanRollCode = ''
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
    getStatusType(status) {
      const map = { 0: 'warning', 1: 'success', 2: 'danger', 3: 'info' }
      return map[status] || 'info'
    },
    getStatusText(status) {
      const map = { 0: '待审批', 1: '已通过', 2: '已拒绝', 3: '已取消' }
      return map[status] || '未知'
    },
    getRollTypeTag(rollType) {
      const typeMap = {
        '母卷': 'primary',
        '复卷': 'success',
        '分切卷': 'warning'
      }
      return typeMap[rollType] || 'info'
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
