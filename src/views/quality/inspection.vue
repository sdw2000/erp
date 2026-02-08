<template>
  <div class="app-container">
    <el-tabs v-model="activeTab" @tab-click="handleTabChange">
      <!-- 质检记录列表 -->
      <el-tab-pane label="质检记录" name="list">
        <el-card shadow="never">
          <div slot="header" class="card-header">
            <span>质检记录管理</span>
            <el-button type="primary" size="small" icon="el-icon-plus" @click="openAddInspection">添加质检</el-button>
          </div>

          <!-- 搜索筛选 -->
          <el-form :inline="true" :model="queryParams" class="search-form" style="margin-bottom: 15px">
            <el-form-item label="质检单号">
              <el-input v-model="queryParams.inspectionNo" placeholder="质检单号" clearable style="width: 150px" />
            </el-form-item>
            <el-form-item label="检验类型">
              <el-select v-model="queryParams.inspectionType" placeholder="全部" clearable style="width: 120px">
                <el-option label="来料检" value="incoming" />
                <el-option label="过程检" value="process" />
                <el-option label="成品检" value="final" />
                <el-option label="巡检" value="patrol" />
              </el-select>
            </el-form-item>
            <el-form-item label="检验结果">
              <el-select v-model="queryParams.result" placeholder="全部" clearable style="width: 120px">
                <el-option label="合格" value="pass" />
                <el-option label="不合格" value="fail" />
                <el-option label="待复检" value="pending" />
              </el-select>
            </el-form-item>
            <el-form-item label="批次号">
              <el-input v-model="queryParams.batchNo" placeholder="批次号" clearable style="width: 150px" />
            </el-form-item>
            <el-form-item label="检验日期">
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
              <el-button type="primary" icon="el-icon-search" @click="loadInspectionList">查询</el-button>
              <el-button icon="el-icon-refresh" @click="resetQuery">重置</el-button>
            </el-form-item>
          </el-form>

          <!-- 质检记录表格 -->
          <el-table v-loading="loading" :data="inspectionList" border stripe>
            <el-table-column prop="inspectionNo" label="质检单号" width="150" />
            <el-table-column prop="taskNo" label="关联任务" width="150" />
            <el-table-column prop="batchNo" label="批次号" width="130" />
            <el-table-column prop="materialCode" label="产品料号" width="120" />
            <el-table-column prop="inspectionType" label="检验类型" width="100">
              <template slot-scope="{ row }">
                <el-tag size="small">{{ getInspectionTypeText(row.inspectionType) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="sampleQty" label="抽样数" width="80" align="center" />
            <el-table-column prop="passQty" label="合格数" width="80" align="center" />
            <el-table-column prop="failQty" label="不合格数" width="90" align="center">
              <template slot-scope="{ row }">
                <span :style="{ color: row.failQty > 0 ? '#F56C6C' : '' }">{{ row.failQty }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="result" label="检验结果" width="100" align="center">
              <template slot-scope="{ row }">
                <el-tag :type="getInspectionResultType(row.result)" size="small">{{ getInspectionResultText(row.result) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="inspectorName" label="检验员" width="100" />
            <el-table-column prop="inspectionTime" label="检验时间" width="160" />
            <el-table-column prop="defectType" label="缺陷类型" show-overflow-tooltip />
            <el-table-column label="操作" width="140" fixed="right">
              <template slot-scope="{ row }">
                <el-button type="text" size="small" @click="viewInspectionDetail(row)">详情</el-button>
                <el-button v-if="row.result === 'fail'" type="text" size="small" style="color: #E6A23C" @click="handleDisposition(row)">处置</el-button>
                <el-button v-if="row.result === 'fail'" type="text" size="small" style="color: #F56C6C" @click="handleDelete(row)">删除</el-button>
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
        </el-card>
      </el-tab-pane>

      <!-- 不合格品处置 -->
      <el-tab-pane label="不合格品处置" name="disposition">
        <disposition-list @refresh="loadInspectionList" />
      </el-tab-pane>

      <!-- 检验统计 -->
      <el-tab-pane label="检验统计" name="statistics">
        <inspection-statistics />
      </el-tab-pane>
    </el-tabs>

    <!-- 质检详情对话框 -->
    <el-dialog
      title="质检详情"
      :visible.sync="detailDialogVisible"
      width="700px"
      @close="handleDetailClose"
    >
      <el-form v-if="currentInspection" label-width="120px">
        <el-form-item label="质检单号">
          <span>{{ currentInspection.inspectionNo }}</span>
        </el-form-item>
        <el-form-item label="关联任务">
          <span>{{ currentInspection.taskNo }}</span>
        </el-form-item>
        <el-form-item label="批次号">
          <span>{{ currentInspection.batchNo }}</span>
        </el-form-item>
        <el-form-item label="产品料号">
          <span>{{ currentInspection.materialCode }}</span>
        </el-form-item>
        <el-form-item label="检验类型">
          <el-tag>{{ getInspectionTypeText(currentInspection.inspectionType) }}</el-tag>
        </el-form-item>
        <el-row>
          <el-col :span="12">
            <el-form-item label="抽样数" label-width="120px">
              <span>{{ currentInspection.sampleQty }}</span>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="合格数" label-width="120px">
              <span>{{ currentInspection.passQty }}</span>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row>
          <el-col :span="12">
            <el-form-item label="不合格数" label-width="120px">
              <span :style="{ color: currentInspection.failQty > 0 ? '#F56C6C' : '' }">{{ currentInspection.failQty }}</span>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="检验结果" label-width="120px">
              <el-tag :type="getInspectionResultType(currentInspection.result)">{{ getInspectionResultText(currentInspection.result) }}</el-tag>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="检验员">
          <span>{{ currentInspection.inspectorName }}</span>
        </el-form-item>
        <el-form-item label="检验时间">
          <span>{{ currentInspection.inspectionTime }}</span>
        </el-form-item>
        <el-form-item v-if="currentInspection.defectType" label="缺陷类型">
          <span>{{ currentInspection.defectType }}</span>
        </el-form-item>
        <el-form-item v-if="currentInspection.remark" label="备注">
          <span>{{ currentInspection.remark }}</span>
        </el-form-item>
      </el-form>
      <span slot="footer" class="dialog-footer">
        <el-button @click="detailDialogVisible = false">关闭</el-button>
      </span>
    </el-dialog>

    <!-- 添加质检对话框 -->
    <el-dialog
      title="添加质检记录"
      :visible.sync="addDialogVisible"
      width="700px"
      @close="handleAddClose"
    >
      <el-form ref="addForm" :model="addForm" label-width="120px" :rules="addFormRules">
        <el-form-item label="关联任务" prop="taskNo">
          <el-input v-model="addForm.taskNo" placeholder="请输入任务号" />
        </el-form-item>
        <el-form-item label="批次号" prop="batchNo">
          <el-input v-model="addForm.batchNo" placeholder="请输入批次号" />
        </el-form-item>
        <el-form-item label="产品料号" prop="materialCode">
          <el-input v-model="addForm.materialCode" placeholder="请输入产品料号" />
        </el-form-item>
        <el-form-item label="检验类型" prop="inspectionType">
          <el-select v-model="addForm.inspectionType" placeholder="请选择检验类型">
            <el-option label="来料检" value="incoming" />
            <el-option label="过程检" value="process" />
            <el-option label="成品检" value="final" />
            <el-option label="巡检" value="patrol" />
          </el-select>
        </el-form-item>
        <el-row>
          <el-col :span="12">
            <el-form-item label="抽样数" prop="sampleQty" label-width="120px">
              <el-input-number v-model="addForm.sampleQty" :min="0" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="合格数" prop="passQty" label-width="120px">
              <el-input-number v-model="addForm.passQty" :min="0" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row>
          <el-col :span="12">
            <el-form-item label="不合格数" prop="failQty" label-width="120px">
              <el-input-number v-model="addForm.failQty" :min="0" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="检验员" prop="inspectorName" label-width="120px">
              <el-input v-model="addForm.inspectorName" placeholder="检验员名字" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="缺陷类型">
          <el-input v-model="addForm.defectType" type="textarea" placeholder="多个缺陷类型用逗号分隔" :rows="3" />
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
  </div>
</template>

<script>
import { getInspectionList, addInspection, deleteInspection } from '@/api/quality'
import DispositionList from './disposition.vue'
import InspectionStatistics from './statistics.vue'

export default {
  name: 'InspectionManagement',
  components: {
    DispositionList,
    InspectionStatistics
  },
  data() {
    return {
      activeTab: 'list',
      loading: false,
      inspectionList: [],
      total: 0,
      queryParams: {
        pageNum: 1,
        pageSize: 10,
        inspectionNo: '',
        inspectionType: '',
        result: '',
        batchNo: '',
        dateRange: []
      },
      detailDialogVisible: false,
      currentInspection: null,
      addDialogVisible: false,
      addForm: {
        taskNo: '',
        batchNo: '',
        materialCode: '',
        inspectionType: '',
        sampleQty: 0,
        passQty: 0,
        failQty: 0,
        inspectorName: '',
        defectType: '',
        remark: ''
      },
      addFormRules: {
        taskNo: [{ required: true, message: '请输入任务号', trigger: 'blur' }],
        batchNo: [{ required: true, message: '请输入批次号', trigger: 'blur' }],
        materialCode: [{ required: true, message: '请输入产品料号', trigger: 'blur' }],
        inspectionType: [{ required: true, message: '请选择检验类型', trigger: 'change' }],
        sampleQty: [{ required: true, message: '请输入抽样数', trigger: 'blur' }],
        passQty: [{ required: true, message: '请输入合格数', trigger: 'blur' }],
        failQty: [{ required: true, message: '请输入不合格数', trigger: 'blur' }],
        inspectorName: [{ required: true, message: '请输入检验员', trigger: 'blur' }]
      }
    }
  },
  mounted() {
    this.loadInspectionList()
  },
  methods: {
    async loadInspectionList() {
      this.loading = true
      try {
        const params = {
          pageNum: this.queryParams.pageNum,
          pageSize: this.queryParams.pageSize,
          inspectionNo: this.queryParams.inspectionNo,
          inspectionType: this.queryParams.inspectionType,
          result: this.queryParams.result,
          batchNo: this.queryParams.batchNo
        }
        if (this.queryParams.dateRange && this.queryParams.dateRange.length === 2) {
          params.startDate = this.queryParams.dateRange[0]
          params.endDate = this.queryParams.dateRange[1]
        }
        const res = await getInspectionList(params)
        if (res.code === 200) {
          this.inspectionList = res.data.list || []
          this.total = Number(res.data?.total || 0)
        } else {
          this.$message.error(res.message || '加载失败')
        }
      } catch (error) {
        console.error('加载质检列表失败:', error)
        this.$message.error('加载失败，请重试')
      } finally {
        this.loading = false
      }
    },
    resetQuery() {
      this.queryParams = {
        pageNum: 1,
        pageSize: 10,
        inspectionNo: '',
        inspectionType: '',
        result: '',
        batchNo: '',
        dateRange: []
      }
      this.loadInspectionList()
    },
    handleSizeChange(size) {
      this.queryParams.pageSize = size
      this.loadInspectionList()
    },
    handlePageChange(page) {
      this.queryParams.pageNum = page
      this.loadInspectionList()
    },
    handleTabChange(tab) {
      this.activeTab = tab.name
    },
    getInspectionTypeText(type) {
      const map = {
        'incoming': '来料检',
        'process': '过程检',
        'final': '成品检',
        'patrol': '巡检'
      }
      return map[type] || type
    },
    getInspectionResultType(result) {
      const map = {
        'pass': 'success',
        'fail': 'danger',
        'pending': 'warning'
      }
      return map[result] || 'info'
    },
    getInspectionResultText(result) {
      const map = {
        'pass': '合格',
        'fail': '不合格',
        'pending': '待复检'
      }
      return map[result] || result
    },
    viewInspectionDetail(row) {
      this.currentInspection = row
      this.detailDialogVisible = true
    },
    handleDetailClose() {
      this.currentInspection = null
      this.detailDialogVisible = false
    },
    handleDisposition(row) {
      this.$router.push({
        path: '/quality/inspection',
        query: { activeTab: 'disposition', inspectionNo: row.inspectionNo }
      })
    },
    async handleDelete(row) {
      this.$confirm('确定删除该质检记录吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(async() => {
        try {
          const res = await deleteInspection(row.id)
          if (res.code === 200) {
            this.$message.success('删除成功')
            this.loadInspectionList()
          } else {
            this.$message.error(res.message || '删除失败')
          }
        } catch (error) {
          this.$message.error('删除失败，请重试')
        }
      }).catch(() => {})
    },
    openAddInspection() {
      this.addForm = {
        taskNo: '',
        batchNo: '',
        materialCode: '',
        inspectionType: '',
        sampleQty: 0,
        passQty: 0,
        failQty: 0,
        inspectorName: '',
        defectType: '',
        remark: ''
      }
      this.addDialogVisible = true
    },
    async submitAddForm() {
      this.$refs.addForm.validate(async(valid) => {
        if (valid) {
          try {
            const res = await addInspection(this.addForm)
            if (res.code === 200) {
              this.$message.success('添加成功')
              this.addDialogVisible = false
              this.loadInspectionList()
            } else {
              this.$message.error(res.message || '添加失败')
            }
          } catch (error) {
            this.$message.error('添加失败，请重试')
          }
        }
      })
    },
    handleAddClose() {
      this.$refs.addForm.clearValidate()
      this.addForm = {
        taskNo: '',
        batchNo: '',
        materialCode: '',
        inspectionType: '',
        sampleQty: 0,
        passQty: 0,
        failQty: 0,
        inspectorName: '',
        defectType: '',
        remark: ''
      }
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
