<template>
  <div class="purchase-quotations">
    <el-card>
      <div slot="header" class="clearfix">
        <span>采购报价</span>
        <div style="float:right">
          <el-select v-model="filters.status" placeholder="状态" clearable size="small" style="width:120px; margin-right:8px" @change="handleSearch">
            <el-option label="草稿" value="draft" />
            <el-option label="已提交" value="submitted" />
            <el-option label="已接受" value="accepted" />
            <el-option label="已拒绝" value="rejected" />
            <el-option label="已过期" value="expired" />
          </el-select>
          <el-input v-model="filters.supplier" placeholder="供应商" size="small" clearable style="width:200px; margin-right:8px" @keyup.enter.native="handleSearch" @clear="handleSearch" />
          <el-button type="primary" icon="el-icon-plus" size="small" @click="openCreate">新增报价</el-button>
        </div>
      </div>

      <el-table :data="records" v-loading="loading" stripe style="width:100%">
        <el-table-column type="index" label="序号" width="60" align="center" />
        <el-table-column prop="quotationNo" label="报价单号" width="160" />
        <el-table-column prop="supplier" label="供应商" width="180" />
        <el-table-column prop="contactPerson" label="联系人" width="120" />
        <el-table-column prop="contactPhone" label="联系电话" width="140" />
        <el-table-column prop="quotationDate" label="报价日期" width="120" />
        <el-table-column prop="validUntil" label="有效期至" width="120" />
        <el-table-column prop="totalAmount" label="总金额" width="120">
          <template slot-scope="scope">{{ formatNumber(scope.row.totalAmount) }}</template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template slot-scope="scope">
            <el-tag :type="statusTag(scope.row.status)" size="small">{{ statusText(scope.row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template slot-scope="scope">
            <el-button type="text" size="mini" @click="openDetail(scope.row)">详情</el-button>
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
          :page-sizes="[10,20,50]"
          layout="sizes, prev, pager, next, jumper, ->, total"
          @size-change="onSizeChange"
          @current-change="onPageChange"
        />
      </div>

      <el-dialog title="报价详情" :visible.sync="detailVisible" width="900px">
        <div v-if="current">
          <p><strong>报价单号：</strong>{{ current.quotationNo || '-' }} &nbsp;&nbsp; <strong>供应商：</strong>{{ current.supplier || '-' }}</p>
          <p><strong>联系人：</strong>{{ current.contactPerson || '-' }} / {{ current.contactPhone || '-' }}</p>
          <p><strong>报价日期：</strong>{{ current.quotationDate || '-' }} &nbsp;&nbsp; <strong>有效期至：</strong>{{ current.validUntil || '-' }}</p>
          <p><strong>状态：</strong>{{ statusText(current.status) }} &nbsp;&nbsp; <strong>总金额：</strong>{{ formatNumber(current.totalAmount) }}</p>
          <el-table :data="current.items || []" stripe style="margin-top:10px">
            <el-table-column type="index" width="50" align="center" />
            <el-table-column prop="materialCode" label="物料编码" width="140" />
            <el-table-column prop="materialName" label="物料名称" width="160" />
            <el-table-column prop="specifications" label="规格" width="160" />
            <el-table-column prop="quantity" label="数量" width="80" />
            <el-table-column prop="unit" label="单位" width="80" />
            <el-table-column prop="unitPrice" label="单价" width="90" />
            <el-table-column prop="amount" label="金额" width="100" />
          </el-table>
        </div>
        <span slot="footer">
          <el-button @click="detailVisible = false">关闭</el-button>
        </span>
      </el-dialog>

      <el-dialog :title="isEdit ? '编辑报价' : '新增报价'" :visible.sync="editVisible" width="1100px">
        <el-form :model="form" label-width="100px">
          <el-row :gutter="12">
            <el-col :span="12">
              <el-form-item label="供应商">
                <el-input v-model="form.supplier" placeholder="供应商名称" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="联系人">
                <el-input v-model="form.contactPerson" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="12">
            <el-col :span="12">
              <el-form-item label="联系电话">
                <el-input v-model="form.contactPhone" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="报价日期">
                <el-date-picker v-model="form.quotationDate" type="date" value-format="yyyy-MM-dd" style="width:100%" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="有效期至">
                <el-date-picker v-model="form.validUntil" type="date" value-format="yyyy-MM-dd" style="width:100%" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="12">
            <el-col :span="8">
              <el-form-item label="状态">
                <el-select v-model="form.status" style="width:100%">
                  <el-option label="草稿" value="draft" />
                  <el-option label="已提交" value="submitted" />
                  <el-option label="已接受" value="accepted" />
                  <el-option label="已拒绝" value="rejected" />
                  <el-option label="已过期" value="expired" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="16">
              <el-form-item label="备注">
                <el-input v-model="form.remark" type="textarea" :rows="2" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-divider>明细</el-divider>
          <div style="text-align:right; margin-bottom:8px">
            <el-button type="primary" size="mini" @click="addItem">新增明细</el-button>
          </div>
          <el-table :data="form.items" stripe border size="mini">
            <el-table-column label="#" width="40" align="center">
              <template slot-scope="scope">{{ scope.$index + 1 }}</template>
            </el-table-column>
            <el-table-column label="物料编码" width="140">
              <template slot-scope="scope"><el-input v-model="scope.row.materialCode" size="small" /></template>
            </el-table-column>
            <el-table-column label="物料名称" width="150">
              <template slot-scope="scope"><el-input v-model="scope.row.materialName" size="small" /></template>
            </el-table-column>
            <el-table-column label="规格" width="150">
              <template slot-scope="scope"><el-input v-model="scope.row.specifications" size="small" /></template>
            </el-table-column>
            <el-table-column label="数量" width="90">
              <template slot-scope="scope"><el-input v-model.number="scope.row.quantity" size="small" type="number" /></template>
            </el-table-column>
            <el-table-column label="单位" width="80">
              <template slot-scope="scope"><el-input v-model="scope.row.unit" size="small" /></template>
            </el-table-column>
            <el-table-column label="单价" width="90">
              <template slot-scope="scope"><el-input v-model.number="scope.row.unitPrice" size="small" type="number" @input="calcItem(scope.row)" /></template>
            </el-table-column>
            <el-table-column label="面积(㎡)" width="100">
              <template slot-scope="scope"><el-input v-model.number="scope.row.sqm" size="small" type="number" @input="calcItem(scope.row)" /></template>
            </el-table-column>
            <el-table-column label="金额" width="100">
              <template slot-scope="scope">{{ scope.row.amount }}</template>
            </el-table-column>
            <el-table-column label="备注" min-width="140">
              <template slot-scope="scope"><el-input v-model="scope.row.remark" size="small" /></template>
            </el-table-column>
            <el-table-column label="操作" width="70" align="center">
              <template slot-scope="scope">
                <el-button type="text" size="mini" style="color:#f56c6c" @click="removeItem(scope.$index)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-form>
        <span slot="footer">
          <el-button @click="editVisible = false">取消</el-button>
          <el-button type="primary" @click="save">保存</el-button>
        </span>
      </el-dialog>
    </el-card>
  </div>
</template>

<script>
import { listPurchaseQuotations, getPurchaseQuotationDetail, createPurchaseQuotation, updatePurchaseQuotation, deletePurchaseQuotation } from '@/api/purchaseQuotation'

export default {
  name: 'PurchaseQuotations',
  data() {
    return {
      loading: false,
      records: [],
      filters: { supplier: '', status: '' },
      pagination: { page: 1, size: 10, total: 0 },
      detailVisible: false,
      editVisible: false,
      isEdit: false,
      current: null,
      form: this.emptyForm()
    }
  },
  created() {
    this.fetchList()
  },
  methods: {
    emptyForm() {
      return {
        id: null,
        quotationNo: '',
        supplier: '',
        contactPerson: '',
        contactPhone: '',
        quotationDate: '',
        validUntil: '',
        status: 'draft',
        remark: '',
        items: [this.emptyItem()]
      }
    },
    emptyItem() {
      return { materialCode: '', materialName: '', specifications: '', quantity: 1, unit: '', unitPrice: null, sqm: null, amount: null, remark: '' }
    },
    statusTag(status) {
      if (status === 'accepted') return 'success'
      if (status === 'rejected') return 'danger'
      if (status === 'submitted') return 'info'
      return 'warning'
    },
    statusText(status) {
      const map = { draft: '草稿', submitted: '已提交', accepted: '已接受', rejected: '已拒绝', expired: '已过期' }
      return map[status] || status || '-'
    },
    formatNumber(val) {
      if (val === null || val === undefined) return '-'
      return Number(val).toFixed(2)
    },
    async fetchList() {
      this.loading = true
      try {
        const res = await listPurchaseQuotations({ page: this.pagination.page, size: this.pagination.size, supplier: this.filters.supplier, status: this.filters.status })
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
        this.$message.error('获取报价失败')
      } finally {
        this.loading = false
      }
    },
    handleSearch() {
      this.pagination.page = 1
      this.fetchList()
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
    async openDetail(row) {
      const res = await getPurchaseQuotationDetail(row.id)
      if (res && (res.code === 200 || res.code === 20000)) {
        this.current = res.data
        this.detailVisible = true
      }
    },
    openCreate() {
      this.isEdit = false
      this.form = this.emptyForm()
      this.editVisible = true
    },
    async openEdit(row) {
      const res = await getPurchaseQuotationDetail(row.id)
      if (res && (res.code === 200 || res.code === 20000)) {
        this.isEdit = true
        this.form = { ...res.data, items: (res.data.items || []).map(item => ({ ...item })) }
        if (!this.form.items.length) this.form.items.push(this.emptyItem())
        this.editVisible = true
      }
    },
    addItem() {
      this.form.items.push(this.emptyItem())
    },
    removeItem(index) {
      this.form.items.splice(index, 1)
      if (!this.form.items.length) this.form.items.push(this.emptyItem())
    },
    calcItem(item) {
      if (item.sqm && item.unitPrice) {
        item.amount = Number(item.sqm) * Number(item.unitPrice)
      }
    },
    async save() {
      if (!this.form.supplier) {
        this.$message.warning('请填写供应商')
        return
      }
      const api = this.isEdit ? updatePurchaseQuotation : createPurchaseQuotation
      const res = await api(this.form)
      if (res && (res.code === 200 || res.code === 20000)) {
        this.$message.success('保存成功')
        this.editVisible = false
        this.fetchList()
      }
    },
    confirmDelete(row) {
      this.$confirm(`确认删除报价单【${row.quotationNo || row.id}】?`, '提示', { type: 'warning' })
        .then(() => this.remove(row.id))
        .catch(() => {})
    },
    async remove(id) {
      const res = await deletePurchaseQuotation(id)
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
