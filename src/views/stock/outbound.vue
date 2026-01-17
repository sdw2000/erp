<template>
  <div class="outbound-container">
    <el-card>
      <div slot="header" class="clearfix">
        <span>出库申请</span>
        <div style="float: right">
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
      <el-table v-loading="loading" :data="list" style="width: 100%; margin-top: 15px" border stripe>
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
          <el-input v-model="selectMaterialCode" placeholder="输入料号查询" style="width: 250px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadStockByMaterial">查询可用批次</el-button>
        </el-form-item>
      </el-form>      <el-table :data="stockList" border stripe max-height="300" @row-click="selectStock">
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
            <el-button type="text" size="small" @click="selectStock(scope.row)">选择</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-divider />

      <el-form ref="form" :model="form" :rules="rules" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="已选批次">
              <el-input :value="form.batchNo" disabled />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="可用卷数">
              <el-input :value="selectedStock ? selectedStock.totalRolls : '-'" disabled />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="出库卷数" prop="rolls">
              <el-input-number v-model="form.rolls" :min="1" :max="selectedStock ? selectedStock.totalRolls : 9999" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="申请部门">
              <el-input v-model="form.applyDept" placeholder="如: 销售部" />
            </el-form-item>
          </el-col>
        </el-row>
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
          <el-input v-model="fifoForm.applyDept" placeholder="如: 销售部" />
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
    <el-dialog :title="approveTitle" :visible.sync="approveVisible" width="400px">
      <el-form label-width="80px">
        <el-form-item label="审批备注">
          <el-input v-model="auditRemark" type="textarea" :rows="3" placeholder="请输入审批备注（可选）" />
        </el-form-item>
      </el-form>
      <div slot="footer">
        <el-button @click="approveVisible = false">取 消</el-button>
        <el-button type="primary" :loading="approveLoading" @click="confirmApprove">确 定</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { getOutboundList, createOutboundRequest, createOutboundRequestFIFO, approveOutbound, cancelOutbound, getStockByMaterial } from '@/api/tapeStock'
import { mapGetters } from 'vuex'

export default {
  name: 'OutboundRequest',
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
      stockList: [],
      selectedStock: null,
      form: { stockId: null, batchNo: '', rolls: 1, applyDept: '', remark: '' },
      rules: {
        rolls: [{ required: true, message: '请输入出库卷数', trigger: 'blur' }]
      },
      // FIFO
      fifoDialogVisible: false,
      fifoLoading: false,
      fifoForm: { materialCode: '', totalRolls: 1, applyDept: '', remark: '' },
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
      auditRemark: ''
    }
  },
  computed: {
    ...mapGetters(['name'])
  },
  created() {
    this.fetchData()
  },
  methods: { async fetchData() {
    this.loading = true
    try {
      const params = { page: this.pagination.page, size: this.pagination.size, ...this.searchForm }
      const res = await getOutboundList(params)
      if (res.code === 20000) {
        this.list = res.data.records
        this.pagination.total = Number(res.data.total) || 0
      }
    } catch (e) {
      console.error(e)
    } finally {
      this.loading = false
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
    this.selectMaterialCode = ''
    this.stockList = []
    this.selectedStock = null
    this.form = { stockId: null, batchNo: '', rolls: 1, applyDept: '', remark: '' }
    this.dialogVisible = true
  },
  async loadStockByMaterial() {
    if (!this.selectMaterialCode) {
      this.$message.warning('请输入料号')
      return
    }
    try {
      const res = await getStockByMaterial(this.selectMaterialCode)
      if (res.code === 20000) {
        this.stockList = res.data || []
        if (this.stockList.length === 0) {
          this.$message.info('该料号无可用库存')
        }
      }
    } catch (e) {
      this.$message.error('查询失败')
    }
  },
  selectStock(row) {
    this.selectedStock = row
    this.form.stockId = row.id
    this.form.batchNo = row.batchNo
    this.form.rolls = 1
  },
  async handleSubmit() {
    if (!this.form.stockId) {
      this.$message.warning('请先选择一个批次')
      return
    }
    this.$refs.form.validate(async(valid) => {
      if (!valid) return
      this.submitLoading = true
      try {
        this.form.applicant = this.name
        const res = await createOutboundRequest(this.form)
        if (res.code === 20000) {
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
  handleAddFIFO() {
    this.fifoForm = { materialCode: '', totalRolls: 1, applyDept: '', remark: '' }
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
        if (res.code === 20000) {
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
    this.approveVisible = true
  },
  async confirmApprove() {
    this.approveLoading = true
    try {
      const res = await approveOutbound(this.approveRow.id, this.approveAction, this.name, this.auditRemark)
      if (res.code === 20000) {
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
        if (res.code === 20000) {
          this.$message.success('已取消')
          this.fetchData()
        } else {
          this.$message.error(res.msg || '取消失败')
        }
      } catch (e) {
        this.$message.error('取消失败')
      }
    })
  }, getStatusType(status) {
    const map = { 0: 'warning', 1: 'success', 2: 'danger', 3: 'info' }
    return map[status] || 'info'
  },
  getStatusText(status) {
    const map = { 0: '待审批', 1: '已通过', 2: '已拒绝', 3: '已取消' }
    return map[status] || '未知'
  },
  // 获取卷类型标签颜色
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
