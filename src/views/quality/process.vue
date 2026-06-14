<template>
  <div class="app-container">
    <el-card shadow="never">
      <div slot="header" class="card-header">
        <span>过程检测</span>
        <el-button type="primary" size="small" icon="el-icon-plus" @click="handleCreate">新增</el-button>
      </div>

      <el-form :inline="true" :model="query" class="search-form">
        <el-form-item label="质检单号">
          <el-input v-model="query.inspectionNo" placeholder="质检单号" clearable />
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
        <el-table-column prop="processNode" label="工序" width="100" />
        <el-table-column prop="rollCode" label="母卷号/卷码" width="160" />
        <el-table-column prop="materialCode" label="料号" width="120" />
        <el-table-column prop="sampleQty" label="抽样数" width="90" align="center" />
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
        <el-table-column label="操作" width="160" fixed="right">
          <template slot-scope="{ row }">
            <el-button type="text" size="small" @click="viewDetail(row)">详情</el-button>
            <el-button type="text" size="small" @click="handleEdit(row)">修改</el-button>
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

    <el-dialog title="过程检测详情报告" :visible.sync="detailVisible" width="750px" custom-class="inspection-detail-dialog">
      <div v-if="current" class="detail-container">
        <div class="report-header">
          <div class="report-title">过程检验报告单</div>
          <div class="report-no">NO: {{ current.inspectionNo }}</div>
        </div>

        <el-descriptions :column="3" border size="medium" class="mb-20">
          <el-descriptions-item label="工序节点">{{ current.processNode }}</el-descriptions-item>
          <el-descriptions-item label="母卷编号" :span="2">{{ current.rollCode }}</el-descriptions-item>
          <el-descriptions-item label="物料料号">{{ current.materialCode }}</el-descriptions-item>
          <el-descriptions-item label="品名" v-if="parsedSnapshot && parsedSnapshot.materialName">{{ parsedSnapshot.materialName }}</el-descriptions-item>
          <el-descriptions-item label="规格" v-if="parsedSnapshot && parsedSnapshot.materialSpec">{{ parsedSnapshot.materialSpec }}</el-descriptions-item>
          <el-descriptions-item label="涂布班组" v-if="parsedSnapshot && parsedSnapshot.shiftName">{{ parsedSnapshot.shiftName }}</el-descriptions-item>
          <el-descriptions-item label="生产日期" v-if="parsedSnapshot && parsedSnapshot.productionDate">{{ parsedSnapshot.productionDate }}</el-descriptions-item>
          <el-descriptions-item label="检验结果">
            <el-tag :type="resultTag(current.overallResult)" effect="dark">{{ resultText(current.overallResult) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="抽样数量">{{ current.sampleQty }}</el-descriptions-item>
          <el-descriptions-item label="检验员">{{ current.inspectorName }}</el-descriptions-item>
          <el-descriptions-item label="检验时间">{{ current.inspectionTime }}</el-descriptions-item>
        </el-descriptions>

        <div v-if="parsedSnapshot" class="snapshot-detail">
          <div class="detail-group-title">检测项目明细</div>
          <el-table :data="snapshotTableData" border style="width: 100%">
            <el-table-column prop="item" label="检测项目" width="150" align="center" />
            <el-table-column prop="standard" label="标准要求" align="center" />
            <el-table-column prop="actual" label="实测数据" align="center" />
            <el-table-column prop="result" label="单项判定" width="120" align="center">
              <template slot-scope="{ row }">
                <span :class="row.result === 'pass' ? 'text-success' : 'text-danger'" style="font-weight: bold;">
                  {{ row.result === 'pass' ? 'OK 合格' : 'NG 不合格' }}
                </span>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <div v-if="current.defectType" class="defect-section mt-20">
          <div class="detail-group-title">缺陷主要分类</div>
          <div class="defect-content">{{ current.defectType }}</div>
        </div>

        <div v-if="current.remark" class="remark-section mt-10">
          <div class="detail-group-title">备注说明</div>
          <div class="remark-content">{{ current.remark }}</div>
        </div>

        <div class="report-footer">
          <div class="footer-item">审核人：<span class="line"></span></div>
          <div class="footer-item">日期：<span class="line"></span></div>
        </div>
      </div>
      <span slot="footer" class="dialog-footer">
        <el-button type="primary" plain icon="el-icon-printer" @click="$message.info('打印功能开发中...')">打 印</el-button>
        <el-button @click="detailVisible = false">关 闭</el-button>
      </span>
    </el-dialog>

    <el-dialog :title="isEdit ? '修改过程检测' : '新增过程检测'" :visible.sync="dialogVisible" width="680px" @close="resetForm">
      <el-form ref="form" :model="form" :rules="rules" label-width="120px" size="small">
        <el-form-item label="工序节点" prop="processNode">
          <el-select v-model="form.processNode" placeholder="请选择" style="width: 100%">
            <el-option label="coating" value="coating" />
            <el-option label="rewinding" value="rewinding" />
            <el-option label="slitting" value="slitting" />
          </el-select>
        </el-form-item>
        <el-form-item label="母卷号" prop="rollCode">
          <el-autocomplete
            v-model="form.rollCode"
            :fetch-suggestions="queryRollCode"
            placeholder="输入母卷号搜索 (仅涂布生成母卷)"
            style="width: 100%"
            @select="handleRollSelect"
          >
            <template slot-scope="{ item }">
              <div style="display:flex; justify-content: space-between;">
                <span>{{ item.rollCode }}</span>
                <span style="color: #999; font-size: 12px;">{{ item.materialCode }}</span>
              </div>
            </template>
          </el-autocomplete>
        </el-form-item>
        <el-form-item label="料号" prop="materialCode">
          <el-input v-model="form.materialCode" placeholder="系统自动带出或手动输入" />
        </el-form-item>
        <el-form-item label="抽样数" prop="sampleQty">
          <el-input-number v-model="form.sampleQty" :min="1" />
        </el-form-item>

        <div class="inspection-section">
          <div class="section-title">检测项 (每个母卷必检)</div>
          
          <el-form-item label="厚度" required>
            <div class="inspection-row">
              <span class="sub-label">实测值</span>
              <el-input v-model="form.processSnapshot.thickness.actual" style="width: 100px" />
              <span class="sub-label">标准值</span>
              <el-input v-model="form.processSnapshot.thickness.standard" style="width: 100px" />
              <span class="sub-label">判定</span>
              <el-select v-model="form.processSnapshot.thickness.result" style="width: 100px" @change="autoOverallResult">
                <el-option label="合格" value="pass" />
                <el-option label="不合格" value="fail" />
              </el-select>
            </div>
          </el-form-item>

          <el-form-item label="颜色" required>
            <div class="inspection-row">
              <span class="sub-label">实测值</span>
              <el-input v-model="form.processSnapshot.color.actual" style="width: 100px" />
              <span class="sub-label">标准值</span>
              <el-input v-model="form.processSnapshot.color.standard" style="width: 100px" />
              <span class="sub-label">判定</span>
              <el-select v-model="form.processSnapshot.color.result" style="width: 100px" @change="autoOverallResult">
                <el-option label="合格" value="pass" />
                <el-option label="不合格" value="fail" />
              </el-select>
            </div>
          </el-form-item>

          <el-form-item label="剥离力" required>
            <div class="inspection-row">
              <span class="sub-label">实测值</span>
              <el-input v-model="form.processSnapshot.peelingForce.actual" style="width: 100px" />
              <span class="unit">N/25mm</span>
              <span class="sub-label">标准值</span>
              <el-input v-model="form.processSnapshot.peelingForce.standard" style="width: 100px" />
              <span class="sub-label">判定</span>
              <el-select v-model="form.processSnapshot.peelingForce.result" style="width: 100px" @change="autoOverallResult">
                <el-option label="合格" value="pass" />
                <el-option label="不合格" value="fail" />
              </el-select>
            </div>
          </el-form-item>
        </div>

        <el-form-item label="结果" prop="overallResult">
          <el-select v-model="form.overallResult" placeholder="请选择">
            <el-option label="合格" value="pass" />
            <el-option label="不合格" value="fail" />
            <el-option label="待判定" value="pending" />
          </el-select>
        </el-form-item>
        <el-form-item label="缺陷类型">
          <el-select v-model="form.defectType" placeholder="可选" filterable clearable style="width: 100%">
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
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">保存</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import { 
  listProcessInspections, 
  deleteProcessInspection, 
  createProcessInspection, 
  updateProcessInspection, 
  getCoatingRollCandidates,
  getDefectTypeList
} from '@/api/quality'

export default {
  name: 'ProcessInspectionPage',
  data() {
    return {
      loading: false,
      rows: [],
      total: 0,
      query: {
        pageNum: 1,
        pageSize: 10,
        inspectionNo: '',
        rollCode: '',
        result: ''
      },
      detailVisible: false,
      current: null,
      dialogVisible: false,
      isEdit: false,
      form: {
        id: null,
        processNode: 'coating',
        rollCode: '',
        materialCode: '',
        sampleQty: 1,
        failQty: 0,
        overallResult: 'pending',
        inspectorName: '',
        defectType: '',
        remark: '',
        processSnapshot: {
          thickness: { actual: '', standard: '', result: 'pass' },
          color: { actual: '', standard: '', result: 'pass' },
          peelingForce: { actual: '', standard: '', result: 'pass' }
        }
      },
      defectTypes: [],
      rules: {
        processNode: [{ required: true, message: '请选择工序节点', trigger: 'change' }],
        rollCode: [{ required: true, message: '请输入母卷号', trigger: 'blur' }],
        sampleQty: [{ required: true, message: '请输入抽样数', trigger: 'blur' }],
        overallResult: [{ required: true, message: '请选择结果', trigger: 'change' }]
      }
    }
  },
  computed: {
    parsedSnapshot() {
      if (!this.current || !this.current.processSnapshot) return null
      try {
        if (typeof this.current.processSnapshot === 'string') {
          return JSON.parse(this.current.processSnapshot)
        }
        return this.current.processSnapshot
      } catch (e) {
        return null
      }
    },
    snapshotTableData() {
      const s = this.parsedSnapshot
      if (!s) return []
      return [
        { item: '厚度 (Thickness)', standard: s.thickness?.standard || '/', actual: s.thickness?.actual || '/', result: s.thickness?.result },
        { item: '颜色 (Color)', standard: s.color?.standard || '/', actual: s.color?.actual || '/', result: s.color?.result },
        { item: '剥离力 (Peeling Force)', standard: s.peelingForce?.standard || '/', actual: s.peelingForce?.actual ? s.peelingForce.actual + ' N/25mm' : '/', result: s.peelingForce?.result }
      ]
    }
  },
  mounted() {
    this.loadData()
    this.loadDefectTypes()
  },
  methods: {
    async queryRollCode(queryString, cb) {
      if (!queryString) return cb([])
      try {
        const res = await getCoatingRollCandidates({ keyword: queryString })
        if (res && (res.code === 200 || res.code === 20000)) {
          cb(res.data || [])
        } else {
          cb([])
        }
      } catch (e) {
        cb([])
      }
    },
    handleRollSelect(item) {
      this.form.rollCode = item.rollCode
      this.form.materialCode = item.materialCode
      // 自动从母卷信息中带入其他属性到快照中（如果后端返回了这些信息）
      if (item.materialName) this.form.processSnapshot.materialName = item.materialName
      if (item.materialSpec) this.form.processSnapshot.materialSpec = item.materialSpec
      if (item.productionDate) this.form.processSnapshot.productionDate = item.productionDate
      if (item.shiftName) this.form.processSnapshot.shiftName = item.shiftName
    },
    autoOverallResult() {
      const { thickness, color, peelingForce } = this.form.processSnapshot
      if (thickness.result === 'fail' || color.result === 'fail' || peelingForce.result === 'fail') {
        this.form.overallResult = 'fail'
        this.form.failQty = 1
      } else {
        this.form.overallResult = 'pass'
        this.form.failQty = 0
      }
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
        const res = await listProcessInspections(this.query)
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
      this.query = { pageNum: 1, pageSize: 10, inspectionNo: '', rollCode: '', result: '' }
      this.loadData()
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
      this.current = row
      this.detailVisible = true
    },
    handleCreate() {
      this.isEdit = false
      this.resetForm()
      this.dialogVisible = true
    },
    handleEdit(row) {
      this.isEdit = true
      let snapshot = {
        thickness: { actual: '', standard: '', result: 'pass' },
        color: { actual: '', standard: '', result: 'pass' },
        peelingForce: { actual: '', standard: '', result: 'pass' }
      }
      
      if (row.processSnapshot) {
        try {
          snapshot = typeof row.processSnapshot === 'string' ? JSON.parse(row.processSnapshot) : row.processSnapshot
        } catch (e) {
          console.error('Parse snapshot error', e)
        }
      }

      this.form = {
        id: row.id,
        processNode: row.processNode || 'coating',
        rollCode: row.rollCode,
        materialCode: row.materialCode,
        sampleQty: row.sampleQty || 1,
        failQty: row.failQty || 0,
        overallResult: row.overallResult || 'pending',
        inspectorName: row.inspectorName,
        defectType: row.defectType,
        remark: row.remark,
        processSnapshot: snapshot
      }
      this.dialogVisible = true
    },
    submitForm() {
      this.$refs.form.validate(async valid => {
        if (!valid) return
        const submitData = JSON.parse(JSON.stringify(this.form))
        if (submitData.processSnapshot) {
          submitData.processSnapshot = JSON.stringify(submitData.processSnapshot)
        }
        
        let res
        if (this.isEdit) {
          res = await updateProcessInspection(submitData)
        } else {
          res = await createProcessInspection(submitData)
        }

        if (res && (res.code === 200 || res.code === 20000)) {
          this.$message.success('保存成功')
          this.dialogVisible = false
          this.loadData()
        } else {
          this.$message.error(res.message || '保存失败')
        }
      })
    },
    resetForm() {
      if (this.$refs.form) {
        this.$refs.form.resetFields()
        this.$refs.form.clearValidate()
      }
      this.form = {
        id: null,
        processNode: 'coating',
        rollCode: '',
        materialCode: '',
        sampleQty: 1,
        failQty: 0,
        overallResult: 'pending',
        inspectorName: '',
        defectType: '',
        remark: '',
        processSnapshot: {
          thickness: { actual: '', standard: '', result: 'pass' },
          color: { actual: '', standard: '', result: 'pass' },
          peelingForce: { actual: '', standard: '', result: 'pass' }
        }
      }
    },
    async handleDelete(row) {
      this.$confirm('确认删除该记录？', '提示', { type: 'warning' }).then(async() => {
        const res = await deleteProcessInspection(row.id)
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

.inspection-section {
  border-top: 1px solid #ebeef5;
  margin-top: 20px;
  padding-top: 15px;
}

.section-title {
  font-weight: bold;
  margin-bottom: 15px;
  color: #303133;
}

.inspection-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.sub-label {
  color: #606266;
  font-size: 13px;
  white-space: nowrap;
}

.unit {
  color: #909399;
  font-size: 12px;
}

/* 详情报告样式 */
.report-header {
  text-align: center;
  margin-bottom: 25px;
  position: relative;
}

.report-title {
  font-size: 24px;
  font-weight: bold;
  letter-spacing: 4px;
  text-decoration: underline;
  color: #333;
}

.report-no {
  position: absolute;
  right: 0;
  top: 30px;
  font-size: 12px;
  color: #999;
}

.detail-group-title {
  font-size: 15px;
  font-weight: bold;
  margin: 20px 0 12px;
  padding-left: 10px;
  border-left: 4px solid #409eff;
  color: #303133;
  background: #f8f9fb;
  line-height: 30px;
}

.text-success { color: #67C23A; }
.text-danger { color: #F56C6C; }

.mb-20 { margin-bottom: 20px; }
.mt-20 { margin-top: 20px; }
.mt-10 { margin-top: 10px; }

.defect-content, .remark-content {
  padding: 12px;
  background: #fafafa;
  border: 1px solid #ebeef5;
  min-height: 50px;
  font-size: 14px;
  color: #606266;
  line-height: 1.6;
}

.report-footer {
  margin-top: 40px;
  padding-top: 20px;
  display: flex;
  justify-content: space-around;
  border-top: 1px dashed #eee;
}

.footer-item {
  font-size: 14px;
  color: #333;
}

.footer-item .line {
  display: inline-block;
  width: 140px;
  border-bottom: 1px solid #333;
  margin-left: 8px;
  vertical-align: bottom;
}

.inspection-detail-dialog ::v-deep .el-dialog__body {
  padding: 30px 50px;
}
</style>
