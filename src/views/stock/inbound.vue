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
        <el-form-item>
          <el-button type="primary" icon="el-icon-search" @click="handleSearch">搜 索</el-button>
          <el-button icon="el-icon-refresh-left" @click="handleReset">重 置</el-button>
        </el-form-item>
      </el-form>

      <!-- 数据表格 -->
      <el-table ref="inboundTable" v-loading="loading" :data="list" style="width: 100%; margin-top: 15px" border stripe>
        <el-table-column prop="requestNo" label="申请单号" width="150" />
        <el-table-column prop="materialCode" label="料号" width="180" />
        <el-table-column prop="productName" label="产品名称" width="160" show-overflow-tooltip />
        <el-table-column prop="batchNo" label="生产批次号" width="130" />
        <el-table-column label="规格" width="160">
          <template slot-scope="scope">
            {{ formatSpecDesc(scope.row) }}
          </template>
        </el-table-column>
        <el-table-column prop="rolls" label="入库卷数" width="90" align="center">
          <template slot-scope="scope">
            <el-tag type="success">{{ scope.row.rolls }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="location" label="卡板位" width="80" align="center" />
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
            <el-form-item label="入库卷数" prop="rolls">
              <el-input-number v-model="form.rolls" :min="1" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="厚度μm" prop="thickness">
              <el-input-number v-model="form.thickness" :min="1" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="宽度mm" prop="width">
              <el-input-number v-model="form.width" :min="1" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="长度M" prop="length">
              <el-input-number v-model="form.length" :min="1" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="生产年份">
              <el-input-number v-model="form.prodYear" :min="20" :max="99" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="生产月份">
              <el-input-number v-model="form.prodMonth" :min="1" :max="12" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="生产日期">
              <el-input-number v-model="form.prodDay" :min="1" :max="31" style="width: 100%" />
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
        <template v-if="approveAction">
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
  </div>
</template>

<script>
import { getInboundList, createInboundRequest, approveInbound, approveInboundByRollCodes, cancelInbound } from '@/api/tapeStock'
import { mapGetters } from 'vuex'
import elTableAutoLayout from '@/mixins/elTableAutoLayout'

export default {
  name: 'InboundRequest',
  mixins: [elTableAutoLayout],
  tableLayoutRefs: ['inboundTable'],
  data() {
    return {
      searchForm: {
        status: null,
        materialCode: ''
      },
      list: [],
      loading: false,
      pagination: { page: 1, size: 20, total: 0 },
      dialogVisible: false,
      submitLoading: false,
      form: this.getEmptyForm(),
      rules: {
        materialCode: [{ required: true, message: '请输入料号', trigger: 'blur' }],
        productName: [{ required: true, message: '请输入产品名称', trigger: 'blur' }],
        batchNo: [{ required: true, message: '请输入生产批次号', trigger: 'blur' }],
        rolls: [{ required: true, message: '请输入入库卷数', trigger: 'blur' }],
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
      }
    }
  },
  computed: {
    ...mapGetters(['name'])
  },
  created() {
    this.fetchData()
  },
  methods: {
    isApiSuccess(res) {
      return !!res && (res.code === 200 || res.code === 20000)
    },
    formatSpecDesc(row) {
      if (!row) return '-'
      const t = row.thickness != null ? row.thickness : ''
      const w = row.width != null ? row.width : ''
      const l = row.length != null ? row.length : ''
      if (t !== '' || w !== '' || l !== '') {
        return `${t}μm*${w}mm*${l}m`
      }
      return row.specDesc || '-'
    },
    getEmptyForm() {
      return {
        materialCode: '',
        productName: '',
        batchNo: '',
        rolls: 1,
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
    }, async fetchData() {
      this.loading = true
      try {
        const params = {
          page: this.pagination.page,
          size: this.pagination.size,
          status: this.searchForm.status === null || this.searchForm.status === undefined || this.searchForm.status === '' ? undefined : this.searchForm.status,
          materialCode: this.searchForm.materialCode ? this.searchForm.materialCode.trim() : undefined
        }
        const res = await getInboundList(params)
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
    handleSizeChange(size) {
      this.pagination.size = size
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
      this.scanLocation = (row && row.location && row.location !== '待上架') ? row.location : ''
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
        const expected = this.approveRow && this.approveRow.batchNo ? String(this.approveRow.batchNo).trim() : ''
        const multiCodes = this.parseRollCodes(this.scanRollCodes)
        const scanned = this.scanRollCode ? String(this.scanRollCode).trim() : (multiCodes.length === 1 ? multiCodes[0] : '')
        const location = this.scanLocation ? String(this.scanLocation).trim() : ''
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

        if (multiCodes.length > 1) {
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
          this.scanRollCode,
          this.scanLocation
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
