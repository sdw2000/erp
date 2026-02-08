<template>
  <div class="purchase-supplier-priority">
    <el-card>
      <div slot="header" class="clearfix">
        <span>供应商优先级</span>
        <div style="float:right">
          <el-input
            v-model="keyword"
            placeholder="名称/编码"
            size="small"
            clearable
            style="width:200px; margin-right:10px"
            @keyup.enter.native="fetchList"
            @clear="fetchList"
          />
          <el-button type="primary" icon="el-icon-plus" size="small" @click="openCreate">新增规则</el-button>
        </div>
      </div>

      <el-table :data="records" v-loading="loading" stripe style="width:100%">
        <el-table-column type="index" label="序号" width="60" align="center" />
        <el-table-column prop="supplierCode" label="供应商编码" width="150" />
        <el-table-column prop="supplierName" label="供应商名称" width="200" />
        <el-table-column prop="score" label="综合得分" width="120" />
        <el-table-column prop="level" label="等级" width="120">
          <template slot-scope="scope">
            <el-tag :type="levelTag(scope.row.level)" size="small">{{ scope.row.level }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="180" />
        <el-table-column label="操作" width="150" fixed="right">
          <template slot-scope="scope">
            <el-button type="text" size="mini" @click="openEdit(scope.row)">编辑</el-button>
            <el-button type="text" size="mini" style="color:#f56c6c" @click="confirmDelete(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pager">
        <el-pagination
          :current-page.sync="pagination.page"
          :page-size="pagination.size"
          :total="pagination.total"
          layout="sizes, prev, pager, next, jumper, ->, total"
          :page-sizes="[10,20,50,100]"
          @size-change="onSizeChange"
          @current-change="onPageChange"
        />
      </div>

      <el-dialog :title="isEdit ? '编辑优先级' : '新增优先级'" :visible.sync="dialogVisible" width="520px">
        <el-form :model="form" label-width="110px">
          <el-form-item label="供应商编码">
            <el-input v-model="form.supplierCode" />
          </el-form-item>
          <el-form-item label="供应商名称">
            <el-input v-model="form.supplierName" />
          </el-form-item>
          <el-form-item label="综合得分">
            <el-input-number v-model="form.score" :min="-999" :max="999" :step="0.1" style="width:100%" />
          </el-form-item>
          <el-form-item label="等级">
            <el-select v-model="form.level" style="width:100%">
              <el-option label="HIGH" value="HIGH" />
              <el-option label="MEDIUM" value="MEDIUM" />
              <el-option label="LOW" value="LOW" />
            </el-select>
          </el-form-item>
          <el-form-item label="备注">
            <el-input v-model="form.remark" type="textarea" :rows="2" />
          </el-form-item>
        </el-form>
        <span slot="footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="save">保存</el-button>
        </span>
      </el-dialog>
    </el-card>
  </div>
</template>

<script>
import { listSupplierPriority, createSupplierPriority, updateSupplierPriority, deleteSupplierPriority } from '@/api/purchaseSupplierPriority'

export default {
  name: 'PurchaseSupplierPriority',
  data() {
    return {
      loading: false,
      keyword: '',
      records: [],
      pagination: { page: 1, size: 10, total: 0 },
      dialogVisible: false,
      isEdit: false,
      form: this.emptyForm()
    }
  },
  created() {
    this.fetchList()
  },
  methods: {
    emptyForm() {
      return { id: null, supplierCode: '', supplierName: '', score: 0, level: 'MEDIUM', remark: '' }
    },
    levelTag(level) {
      if (level === 'HIGH') return 'success'
      if (level === 'LOW') return 'warning'
      return 'info'
    },
    async fetchList() {
      this.loading = true
      try {
        const res = await listSupplierPriority({ keyword: this.keyword, page: this.pagination.page, size: this.pagination.size })
        if (res && (res.code === 200 || res.code === 20000)) {
          const data = res.data
          if (data && data.records) {
            this.records = data.records
            this.pagination.total = Number(data.total || 0)
          } else if (Array.isArray(data)) {
            this.records = data
            this.pagination.total = Number(data.length)
          } else if (typeof data === 'object' && data.total !== undefined && data.list) {
            // 兼容 total/list 结构
            this.records = data.list
            this.pagination.total = Number(data.total || 0)
          }
        }
      } catch (e) {
        this.$message.error('获取优先级失败')
      } finally {
        this.loading = false
      }
    },
    onSizeChange(val) {
      this.pagination.size = val
      this.pagination.page = 1
      this.fetchList()
    },
    onPageChange(val) {
      this.pagination.page = val
      this.fetchList()
    },
    openCreate() {
      this.isEdit = false
      this.form = this.emptyForm()
      this.dialogVisible = true
    },
    openEdit(row) {
      this.isEdit = true
      this.form = { ...row }
      this.dialogVisible = true
    },
    async save() {
      if (!this.form.supplierName) {
        this.$message.warning('请填写供应商名称')
        return
      }
      const api = this.isEdit ? updateSupplierPriority : createSupplierPriority
      const res = await api(this.form)
      if (res && (res.code === 200 || res.code === 20000)) {
        this.$message.success('保存成功')
        this.dialogVisible = false
        this.fetchList()
      }
    },
    confirmDelete(row) {
      this.$confirm(`确认删除【${row.supplierName}】的优先级记录？`, '提示', { type: 'warning' })
        .then(() => this.remove(row.id))
        .catch(() => {})
    },
    async remove(id) {
      const res = await deleteSupplierPriority(id)
      if (res && (res.code === 200 || res.code === 20000)) {
        this.$message.success('删除成功')
        this.fetchList()
      }
    }
  }
}
</script>

<style scoped>
.pager {
  margin-top: 12px;
  text-align: right;
}
</style>
