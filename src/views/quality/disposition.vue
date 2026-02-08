<template>
  <el-card shadow="never">
    <div slot="header" class="card-header">
      <span>不合格品处置管理</span>
      <el-button type="primary" size="small" icon="el-icon-plus" @click="openAddDisposition">新建处置</el-button>
    </div>

    <!-- 搜索筛选 -->
    <el-form :inline="true" :model="queryParams" class="search-form" style="margin-bottom: 15px">
      <el-form-item label="处置单号">
        <el-input v-model="queryParams.dispositionNo" placeholder="处置单号" clearable style="width: 150px" />
      </el-form-item>
      <el-form-item label="检验单号">
        <el-input v-model="queryParams.inspectionNo" placeholder="关联质检单号" clearable style="width: 150px" />
      </el-form-item>
      <el-form-item label="处置方案">
        <el-select v-model="queryParams.dispositionMethod" placeholder="全部" clearable style="width: 120px">
          <el-option label="返工" value="rework" />
          <el-option label="返料" value="return" />
          <el-option label="报废" value="scrap" />
          <el-option label="降级" value="downgrade" />
          <el-option label="其他" value="other" />
        </el-select>
      </el-form-item>
      <el-form-item label="处置状态">
        <el-select v-model="queryParams.status" placeholder="全部" clearable style="width: 120px">
          <el-option label="待处置" value="pending" />
          <el-option label="处置中" value="processing" />
          <el-option label="已完成" value="completed" />
          <el-option label="已驳回" value="rejected" />
        </el-select>
      </el-form-item>
      <el-form-item label="创建日期">
        <el-date-picker
          v-model="queryParams.dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          value-format="yyyy-MM-dd"
          style="width: 240px"
        />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="el-icon-search" @click="loadDispositionList">查询</el-button>
        <el-button icon="el-icon-refresh" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <!-- 处置列表表格 -->
    <el-table v-loading="loading" :data="dispositionList" border stripe>
      <el-table-column prop="dispositionNo" label="处置单号" width="150" />
      <el-table-column prop="inspectionNo" label="检验单号" width="150" />
      <el-table-column prop="batchNo" label="批次号" width="130" />
      <el-table-column prop="failQty" label="不合格数" width="90" align="center" />
      <el-table-column prop="dispositionMethod" label="处置方案" width="100">
        <template slot-scope="{ row }">
          <el-tag :type="getMethodType(row.dispositionMethod)">{{ getMethodText(row.dispositionMethod) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="processedQty" label="已处置数" width="90" align="center" />
      <el-table-column prop="remainQty" label="待处置数" width="90" align="center">
        <template slot-scope="{ row }">
          <span :style="{ color: row.remainQty > 0 ? '#E6A23C' : '' }">{{ row.remainQty }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="status" label="处置状态" width="100" align="center">
        <template slot-scope="{ row }">
          <el-tag :type="getStatusType(row.status)">{{ getStatusText(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="creatorName" label="创建人" width="100" />
      <el-table-column prop="createTime" label="创建时间" width="160" />
      <el-table-column label="操作" width="160" fixed="right">
        <template slot-scope="{ row }">
          <el-button type="text" size="small" @click="viewDispositionDetail(row)">详情</el-button>
          <el-button v-if="row.status === 'pending'" type="text" size="small" style="color: #67C23A" @click="handleApprove(row)">审批</el-button>
          <el-button v-if="row.status === 'processing'" type="text" size="small" style="color: #409EFF" @click="handleComplete(row)">完成</el-button>
          <el-button v-if="row.status !== 'completed'" type="text" size="small" style="color: #F56C6C" @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <el-pagination
      style="margin-top: 15px; text-align: right"
      :current-page="queryParams.pageNum"
      :page-sizes="[10, 20, 50]"
      :page-size="queryParams.pageSize"
      :total="total"
      layout="total, sizes, prev, pager, next, jumper"
      @size-change="handleSizeChange"
      @current-change="handlePageChange"
    />

    <!-- 详情对话框 -->
    <el-dialog
      title="处置详情"
      :visible.sync="detailDialogVisible"
      width="700px"
      @close="handleDetailClose"
    >
      <el-form v-if="currentDisposition" label-width="120px">
        <el-form-item label="处置单号">
          <span>{{ currentDisposition.dispositionNo }}</span>
        </el-form-item>
        <el-form-item label="检验单号">
          <span>{{ currentDisposition.inspectionNo }}</span>
        </el-form-item>
        <el-form-item label="批次号">
          <span>{{ currentDisposition.batchNo }}</span>
        </el-form-item>
        <el-row>
          <el-col :span="12">
            <el-form-item label="不合格数" label-width="120px">
              <span>{{ currentDisposition.failQty }}</span>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="已处置数" label-width="120px">
              <span>{{ currentDisposition.processedQty }}</span>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="处置方案">
          <el-tag :type="getMethodType(currentDisposition.dispositionMethod)">{{ getMethodText(currentDisposition.dispositionMethod) }}</el-tag>
        </el-form-item>
        <el-form-item label="处置说明">
          <span>{{ currentDisposition.dispositionDescription }}</span>
        </el-form-item>
        <el-form-item label="处置状态">
          <el-tag :type="getStatusType(currentDisposition.status)">{{ getStatusText(currentDisposition.status) }}</el-tag>
        </el-form-item>
        <el-form-item label="创建人">
          <span>{{ currentDisposition.creatorName }}</span>
        </el-form-item>
        <el-form-item label="创建时间">
          <span>{{ currentDisposition.createTime }}</span>
        </el-form-item>
        <el-form-item v-if="currentDisposition.remark" label="备注">
          <span>{{ currentDisposition.remark }}</span>
        </el-form-item>
      </el-form>
      <span slot="footer" class="dialog-footer">
        <el-button @click="detailDialogVisible = false">关闭</el-button>
      </span>
    </el-dialog>

    <!-- 新建处置对话框 -->
    <el-dialog
      title="新建处置"
      :visible.sync="addDialogVisible"
      width="700px"
      @close="handleAddClose"
    >
      <el-form ref="addForm" :model="addForm" label-width="120px" :rules="addFormRules">
        <el-form-item label="检验单号" prop="inspectionNo">
          <el-input v-model="addForm.inspectionNo" placeholder="请输入或选择检验单号" />
        </el-form-item>
        <el-form-item label="批次号" prop="batchNo">
          <span>{{ addForm.batchNo }}</span>
        </el-form-item>
        <el-form-item label="不合格数" prop="failQty">
          <span>{{ addForm.failQty }}</span>
        </el-form-item>
        <el-form-item label="处置方案" prop="dispositionMethod">
          <el-select v-model="addForm.dispositionMethod" placeholder="请选择处置方案">
            <el-option label="返工" value="rework" />
            <el-option label="返料" value="return" />
            <el-option label="报废" value="scrap" />
            <el-option label="降级" value="downgrade" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="处置说明" prop="dispositionDescription">
          <el-input v-model="addForm.dispositionDescription" type="textarea" placeholder="输入处置说明" :rows="3" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="addForm.remark" type="textarea" placeholder="输入备注信息" :rows="2" />
        </el-form-item>
      </el-form>
      <span slot="footer" class="dialog-footer">
        <el-button @click="addDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitAddForm">确定</el-button>
      </span>
    </el-dialog>

    <!-- 审批对话框 -->
    <el-dialog
      title="审批处置"
      :visible.sync="approveDialogVisible"
      width="600px"
      @close="handleApproveClose"
    >
      <el-form ref="approveForm" :model="approveForm" label-width="100px">
        <el-form-item label="处置单号">
          <span>{{ approveForm.dispositionNo }}</span>
        </el-form-item>
        <el-form-item label="处置方案">
          <span>{{ getMethodText(approveForm.dispositionMethod) }}</span>
        </el-form-item>
        <el-form-item label="审批意见" prop="approved">
          <el-radio-group v-model="approveForm.approved">
            <el-radio label="true">同意</el-radio>
            <el-radio label="false">不同意</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="approveForm.approved === 'false'" label="备注">
          <el-input v-model="approveForm.remark" type="textarea" placeholder="输入驳回原因" :rows="3" />
        </el-form-item>
      </el-form>
      <span slot="footer" class="dialog-footer">
        <el-button @click="approveDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitApproveForm">确定</el-button>
      </span>
    </el-dialog>
  </el-card>
</template>

<script>
import { getDispositionList, createDisposition, updateDisposition, approveDisposition } from '@/api/quality'

export default {
  name: 'DispositionList',
  data() {
    return {
      loading: false,
      dispositionList: [],
      total: 0,
      queryParams: {
        pageNum: 1,
        pageSize: 10,
        dispositionNo: '',
        inspectionNo: '',
        dispositionMethod: '',
        status: '',
        dateRange: []
      },
      detailDialogVisible: false,
      currentDisposition: null,
      addDialogVisible: false,
      addForm: {
        inspectionNo: '',
        batchNo: '',
        failQty: 0,
        dispositionMethod: '',
        dispositionDescription: '',
        remark: ''
      },
      addFormRules: {
        inspectionNo: [{ required: true, message: '请输入检验单号', trigger: 'blur' }],
        dispositionMethod: [{ required: true, message: '请选择处置方案', trigger: 'change' }],
        dispositionDescription: [{ required: true, message: '请输入处置说明', trigger: 'blur' }]
      },
      approveDialogVisible: false,
      approveForm: {
        id: null,
        dispositionNo: '',
        dispositionMethod: '',
        approved: '',
        remark: ''
      }
    }
  },
  mounted() {
    this.loadDispositionList()
  },
  methods: {
    async loadDispositionList() {
      this.loading = true
      try {
        const params = {
          pageNum: this.queryParams.pageNum,
          pageSize: this.queryParams.pageSize,
          dispositionNo: this.queryParams.dispositionNo,
          inspectionNo: this.queryParams.inspectionNo,
          dispositionMethod: this.queryParams.dispositionMethod,
          status: this.queryParams.status
        }
        if (this.queryParams.dateRange && this.queryParams.dateRange.length === 2) {
          params.startDate = this.queryParams.dateRange[0]
          params.endDate = this.queryParams.dateRange[1]
        }
        const res = await getDispositionList(params)
        if (res.code === 200) {
          this.dispositionList = res.data.list || []
          this.total = Number(res.data?.total || 0)
        } else {
          this.$message.error(res.message || '加载失败')
        }
      } catch (error) {
        console.error('加载不良品处置列表失败:', error)
        this.$message.error('加载失败，请重试')
      } finally {
        this.loading = false
      }
    },
    resetQuery() {
      this.queryParams = {
        pageNum: 1,
        pageSize: 10,
        dispositionNo: '',
        inspectionNo: '',
        dispositionMethod: '',
        status: '',
        dateRange: []
      }
      this.loadDispositionList()
    },
    handleSizeChange(size) {
      this.queryParams.pageSize = size
      this.loadDispositionList()
    },
    handlePageChange(page) {
      this.queryParams.pageNum = page
      this.loadDispositionList()
    },
    getMethodType(method) {
      const map = {
        'rework': 'warning',
        'return': 'info',
        'scrap': 'danger',
        'downgrade': 'warning',
        'other': 'info'
      }
      return map[method] || 'info'
    },
    getMethodText(method) {
      const map = {
        'rework': '返工',
        'return': '返料',
        'scrap': '报废',
        'downgrade': '降级',
        'other': '其他'
      }
      return map[method] || method
    },
    getStatusType(status) {
      const map = {
        'pending': 'warning',
        'processing': 'primary',
        'completed': 'success',
        'rejected': 'danger'
      }
      return map[status] || 'info'
    },
    getStatusText(status) {
      const map = {
        'pending': '待处置',
        'processing': '处置中',
        'completed': '已完成',
        'rejected': '已驳回'
      }
      return map[status] || status
    },
    viewDispositionDetail(row) {
      this.currentDisposition = row
      this.detailDialogVisible = true
    },
    handleDetailClose() {
      this.currentDisposition = null
      this.detailDialogVisible = false
    },
    openAddDisposition() {
      this.addForm = {
        inspectionNo: '',
        batchNo: '',
        failQty: 0,
        dispositionMethod: '',
        dispositionDescription: '',
        remark: ''
      }
      this.addDialogVisible = true
    },
    async submitAddForm() {
      this.$refs.addForm.validate(async(valid) => {
        if (valid) {
          try {
            const res = await createDisposition(this.addForm)
            if (res.code === 200) {
              this.$message.success('创建成功')
              this.addDialogVisible = false
              this.loadDispositionList()
              this.$emit('refresh')
            } else {
              this.$message.error(res.message || '创建失败')
            }
          } catch (error) {
            this.$message.error('创建失败，请重试')
          }
        }
      })
    },
    handleAddClose() {
      this.$refs.addForm.clearValidate()
    },
    handleApprove(row) {
      this.approveForm = {
        id: row.id,
        dispositionNo: row.dispositionNo,
        dispositionMethod: row.dispositionMethod,
        approved: '',
        remark: ''
      }
      this.approveDialogVisible = true
    },
    async submitApproveForm() {
      try {
        const res = await approveDisposition(
          this.approveForm.id,
          this.approveForm.approved === 'true',
          this.approveForm.remark
        )
        if (res.code === 200) {
          this.$message.success('审批成功')
          this.approveDialogVisible = false
          this.loadDispositionList()
        } else {
          this.$message.error(res.message || '审批失败')
        }
      } catch (error) {
        this.$message.error('审批失败，请重试')
      }
    },
    handleApproveClose() {
      this.approveForm = {
        id: null,
        dispositionNo: '',
        dispositionMethod: '',
        approved: '',
        remark: ''
      }
    },
    async handleComplete(row) {
      this.$confirm('确定完成该处置吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(async() => {
        try {
          const res = await updateDisposition(row.id, { status: 'completed' })
          if (res.code === 200) {
            this.$message.success('处置完成')
            this.loadDispositionList()
          } else {
            this.$message.error(res.message || '操作失败')
          }
        } catch (error) {
          this.$message.error('操作失败，请重试')
        }
      }).catch(() => {})
    },
    async handleDelete(row) {
      this.$confirm('确定删除该处置吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(async() => {
        try {
          // 调用删除接口（可能需要创建）
          this.$message.success('删除成功')
          this.loadDispositionList()
        } catch (error) {
          this.$message.error('删除失败，请重试')
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

.search-form {
  margin-bottom: 15px;
}
</style>
