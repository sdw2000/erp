<template>
  <div class="purchase-receipts">
    <el-card>
      <div slot="header" class="clearfix">
        <span>收货通知</span>
        <div style="float:right">
          <el-input v-model="filters.supplier" placeholder="供应商" size="small" clearable style="width:200px; margin-right:8px" @keyup.enter.native="handleSearch" @clear="handleSearch" />
          <el-select v-model="filters.status" placeholder="状态" clearable size="small" style="width:140px; margin-right:8px" @change="handleSearch">
            <el-option label="计划中" value="planned" />
            <el-option label="收货中" value="receiving" />
            <el-option label="已收货" value="received" />
            <el-option label="部分收货" value="partial" />
          </el-select>
          <el-button type="primary" icon="el-icon-plus" size="small" @click="openCreate">新增收货</el-button>
        </div>
      </div>

      <el-table :data="records" v-loading="loading" stripe style="width:100%">
        <el-table-column type="index" label="序号" width="60" align="center" />
        <el-table-column prop="receiptNo" label="收货单号" width="160" />
        <el-table-column prop="supplier" label="供应商" width="180" />
        <el-table-column prop="expectedDate" label="预计日期" width="120" />
        <el-table-column prop="receivedDate" label="实际日期" width="120" />
        <el-table-column prop="status" label="状态" width="110">
          <template slot-scope="scope">
            <el-tag :type="statusTag(scope.row.status)" size="small">{{ statusText(scope.row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="160" />
        <el-table-column label="操作" width="190" fixed="right">
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

      <el-dialog title="收货详情" :visible.sync="detailVisible" width="880px">
        <div v-if="current">
          <p><strong>收货单号：</strong>{{ current.receiptNo || '-' }} &nbsp;&nbsp; <strong>供应商：</strong>{{ current.supplier || '-' }}</p>
          <p><strong>联系人：</strong>{{ current.contactName || '-' }} / {{ current.contactPhone || '-' }}</p>
          <p><strong>预计日期：</strong>{{ current.expectedDate || '-' }} &nbsp;&nbsp; <strong>实际日期：</strong>{{ current.receivedDate || '-' }}</p>
          <p><strong>状态：</strong>{{ statusText(current.status) }} &nbsp;&nbsp; <strong>备注：</strong>{{ current.remark || '-' }}</p>
          <el-table :data="current.items || []" stripe style="margin-top:8px">
            <el-table-column type="index" width="50" align="center" />
            <el-table-column prop="materialCode" label="物料编码" width="140" />
            <el-table-column prop="materialName" label="物料名称" width="150" />
            <el-table-column prop="specification" label="规格" width="150" />
            <el-table-column prop="expectedQty" label="应收数量" width="100" />
            <el-table-column prop="receivedQty" label="实收数量" width="100" />
            <el-table-column prop="unit" label="单位" width="80" />
            <el-table-column prop="remark" label="备注" />
          </el-table>
        </div>
        <span slot="footer">
          <el-button @click="detailVisible = false">关闭</el-button>
        </span>
      </el-dialog>

      <el-dialog :title="isEdit ? '编辑收货' : '新增收货'" :visible.sync="editVisible" width="980px">
        <el-form :model="form" label-width="110px">
          <el-row :gutter="12">
            <el-col :span="12">
              <el-form-item label="供应商">
                <el-input v-model="form.supplier" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="联系人">
                <el-input v-model="form.contactName" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="12">
            <el-col :span="12">
              <el-form-item label="联系电话">
                <el-input v-model="form.contactPhone" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="收货地址">
                <el-input v-model="form.receiveAddress" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="12">
            <el-col :span="12">
              <el-form-item label="预计日期">
                <el-date-picker v-model="form.expectedDate" type="date" value-format="yyyy-MM-dd" style="width:100%" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="实际日期">
                <el-date-picker v-model="form.receivedDate" type="date" value-format="yyyy-MM-dd" style="width:100%" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="12">
            <el-col :span="12">
              <el-form-item label="状态">
                <el-select v-model="form.status" style="width:100%">
                  <el-option label="计划中" value="planned" />
                  <el-option label="收货中" value="receiving" />
                  <el-option label="已收货" value="received" />
                  <el-option label="部分收货" value="partial" />
                  <el-option label="已取消" value="cancelled" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
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
              <template slot-scope="scope"><el-input v-model="scope.row.specification" size="small" /></template>
            </el-table-column>
            <el-table-column label="应收数量" width="100">
              <template slot-scope="scope"><el-input v-model.number="scope.row.expectedQty" size="small" type="number" /></template>
            </el-table-column>
            <el-table-column label="实收数量" width="100">
              <template slot-scope="scope"><el-input v-model.number="scope.row.receivedQty" size="small" type="number" /></template>
            </el-table-column>
            <el-table-column label="单位" width="90">
              <template slot-scope="scope"><el-input v-model="scope.row.unit" size="small" /></template>
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
import { listPurchaseReceipts, getPurchaseReceiptDetail, createPurchaseReceipt, updatePurchaseReceipt, deletePurchaseReceipt } from '@/api/purchaseReceipt'

export default {
  name: 'PurchaseReceipts',
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
        receiptNo: '',
        supplier: '',
        contactName: '',
        contactPhone: '',
        receiveAddress: '',
        expectedDate: '',
        receivedDate: '',
        status: 'planned',
        remark: '',
        items: [this.emptyItem()]
      }
    },
    emptyItem() {
      return { materialCode: '', materialName: '', specification: '', expectedQty: 0, receivedQty: 0, unit: '', remark: '' }
    },
    statusText(status) {
      const map = { planned: '计划中', receiving: '收货中', received: '已收货', partial: '部分收货', cancelled: '已取消' }
      return map[status] || status || '-'
    },
    statusTag(status) {
      if (status === 'received') return 'success'
      if (status === 'partial') return 'warning'
      if (status === 'receiving') return 'info'
      if (status === 'cancelled') return 'danger'
      return 'default'
    },
    async fetchList() {
      this.loading = true
      try {
        const res = await listPurchaseReceipts({ page: this.pagination.page, size: this.pagination.size, supplier: this.filters.supplier, status: this.filters.status })
        if (res && (res.code === 200 || res.code === 20000)) {
          const data = res.data
          if (data && data.records) {
            this.records = data.records
            this.pagination.total = Number(data.total || 0)
          } else if (Array.isArray(data)) {
            this.records = data
            this.pagination.total = data.length
          }
        }
      } catch (e) {
        this.$message.error('获取收货通知失败')
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
      const res = await getPurchaseReceiptDetail(row.id)
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
      const res = await getPurchaseReceiptDetail(row.id)
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
    removeItem(idx) {
      this.form.items.splice(idx, 1)
      if (!this.form.items.length) this.form.items.push(this.emptyItem())
    },
    async save() {
      if (!this.form.supplier) {
        this.$message.warning('请填写供应商')
        return
      }
      const api = this.isEdit ? updatePurchaseReceipt : createPurchaseReceipt
      const res = await api(this.form)
      if (res && (res.code === 200 || res.code === 20000)) {
        this.$message.success('保存成功')
        this.editVisible = false
        this.fetchList()
      }
    },
    confirmDelete(row) {
      this.$confirm(`确认删除收货单【${row.receiptNo || row.id}】?`, '提示', { type: 'warning' })
        .then(() => this.remove(row.id))
        .catch(() => {})
    },
    async remove(id) {
      const res = await deletePurchaseReceipt(id)
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
