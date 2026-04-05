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
        <el-table-column label="操作" width="120" fixed="right">
          <template slot-scope="{ row }">
            <el-button type="text" size="small" @click="viewDetail(row)">详情</el-button>
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

    <el-dialog title="来料检测详情" :visible.sync="detailVisible" width="600px">
      <pre v-if="current" class="detail-block">{{ current }}</pre>
      <span slot="footer" class="dialog-footer">
        <el-button @click="detailVisible = false">关闭</el-button>
      </span>
    </el-dialog>

    <el-dialog title="新增来料检测" :visible.sync="createVisible" width="520px" @close="resetForm">
      <el-form ref="form" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="批次号" prop="batchNo">
          <el-input v-model="form.batchNo" />
        </el-form-item>
        <el-form-item label="卷码" prop="rollCode">
          <el-input v-model="form.rollCode" />
        </el-form-item>
        <el-form-item label="料号" prop="materialCode">
          <el-input v-model="form.materialCode" />
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
  </div>
</template>

<script>
import { listIncomingInspections, deleteIncomingInspection, createIncomingInspection, getDefectTypeList } from '@/api/quality'

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
      createVisible: false,
      form: {
        batchNo: '',
        rollCode: '',
        materialCode: '',
        sampleQty: 0,
        passQty: 0,
        failQty: 0,
        overallResult: 'pending',
        inspectorName: '',
        defectType: '',
        remark: ''
      },
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
  },
  methods: {
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
      this.current = row
      this.detailVisible = true
    },
    handleCreate() {
      this.createVisible = true
    },
    submitForm() {
      this.$refs.form.validate(async valid => {
        if (!valid) return
        const res = await createIncomingInspection(this.form)
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
      this.form = { batchNo: '', rollCode: '', materialCode: '', sampleQty: 0, passQty: 0, failQty: 0, overallResult: 'pending', inspectorName: '', defectType: '', remark: '' }
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
</style>
