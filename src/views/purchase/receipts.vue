<template>
  <div class="purchase-receipts">
    <el-card>
      <div slot="header" class="clearfix">
        <span>收货通知</span>
        <div style="float:right">
          <el-input v-model="filters.supplier" placeholder="供应商" size="small" clearable style="width:200px; margin-right:8px" @keyup.enter.native="handleSearch" @clear="handleSearch" />
          <el-select v-model="filters.status" placeholder="状态" clearable size="small" style="width:140px; margin-right:8px" @change="handleSearch">
            <el-option
              v-for="item in statusOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
          <el-select v-model="filters.reconciliationStatus" placeholder="对账状态" clearable size="small" style="width:140px; margin-right:8px" @change="handleSearch">
            <el-option
              v-for="item in reconciliationOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
          <el-button size="small" style="margin-right:8px" @click="handleSeedTestData">生成测试数据</el-button>
          <el-button size="small" type="warning" style="margin-right:8px" @click="handleCleanupTestData">清理测试数据</el-button>
          <el-button type="primary" icon="el-icon-plus" size="small" @click="openCreate">新增收货</el-button>
        </div>
      </div>

      <el-table v-loading="loading" :data="records" stripe style="width:100%">
        <el-table-column type="index" label="序号" width="60" align="center" />
        <el-table-column prop="receiptNo" label="收货单号" width="160" />
        <el-table-column prop="supplier" label="供应商" width="180" />
        <el-table-column label="对账状态" width="110">
          <template slot-scope="scope">
            <el-tag :type="reconciliationTag(scope.row.reconciliationStatus)" size="small">
              {{ reconciliationText(scope.row.reconciliationStatus) }}
            </el-tag>
          </template>
        </el-table-column>
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
          <p><strong>采购订单号：</strong>{{ current.purchaseOrderNo || '-' }}</p>
          <p><strong>联系人：</strong>{{ current.contactName || '-' }} / {{ current.contactPhone || '-' }}</p>
          <p><strong>预计日期：</strong>{{ current.expectedDate || '-' }} &nbsp;&nbsp; <strong>实际日期：</strong>{{ current.receivedDate || '-' }}</p>
          <p><strong>状态：</strong><PurchaseStatusTag kind="purchase" :status="current.status" /> &nbsp;&nbsp; <strong>对账状态：</strong><PurchaseStatusTag kind="reconciliation" :status="current.reconciliationStatus" /> &nbsp;&nbsp; <strong>备注：</strong>{{ current.remark || '-' }}</p>
          <el-table :data="current.items || []" stripe style="margin-top:8px">
            <el-table-column type="index" width="50" align="center" />
            <el-table-column prop="materialCode" label="物料编码" width="140" />
            <el-table-column prop="materialName" label="物料名称" width="150" />
            <el-table-column prop="specification" label="规格" width="150" />
            <el-table-column prop="purchaseQty" label="采购数量" width="90" />
            <el-table-column label="采购单位" width="90">
              <template slot-scope="scope">{{ normalizeUomLabel(scope.row.purchaseUomCode) || '-' }}</template>
            </el-table-column>
            <el-table-column prop="receivedQty" label="应到数量(本次)" width="120" />
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
              <el-form-item label="采购订单号">
                <el-select v-model="form.purchaseOrderNo" filterable clearable placeholder="选择采购订单" style="width:100%" @change="onPurchaseOrderChange">
                  <el-option v-for="order in purchaseOrderOptions" :key="order.orderNo" :label="`${order.orderNo} / ${order.supplier || '-'}`" :value="order.orderNo" />
                </el-select>
              </el-form-item>
            </el-col>
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
          <el-alert
            title="说明：仅保留“应到数量”，表示本次到货数量；提交时会同步到兼容字段。"
            type="info"
            :closable="false"
            style="margin-bottom:8px"
          />
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
            <el-table-column label="应到数量(本次)" width="120">
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
          <el-button type="primary" @click="save">提交</el-button>
        </span>
      </el-dialog>
    </el-card>
  </div>
</template>

<script>
import {
  listPurchaseReceipts,
  getPurchaseReceiptDetail,
  createPurchaseReceipt,
  updatePurchaseReceipt,
  deletePurchaseReceipt,
  seedPurchaseReceiptTestData,
  cleanupPurchaseReceiptTestData
} from '@/api/purchaseReceipt'
import { getPurchaseOrders, getPurchaseOrderDetail } from '@/api/purchase'
import { getRawMaterialList } from '@/api/tapeRawMaterial'
import { getPurchaseReconciliationMeta, getPurchaseReconciliationOptions } from '@/constants/purchaseReconciliation'
import { getPurchaseStatusMeta, getPurchaseStatusOptions } from '@/constants/purchaseStatus'
import PurchaseStatusTag from '@/components/PurchaseStatusTag'

export default {
  name: 'PurchaseReceipts',
  components: { PurchaseStatusTag },
  data() {
    return {
      loading: false,
      records: [],
      filters: { supplier: '', status: '', reconciliationStatus: '' },
      pagination: { page: 1, size: 10, total: 0 },
      purchaseOrderOptions: [],
      rawMaterials: [],
      reconciliationOptions: getPurchaseReconciliationOptions(),
      statusOptions: getPurchaseStatusOptions(),
      detailVisible: false,
      editVisible: false,
      isEdit: false,
      current: null,
      form: this.emptyForm()
    }
  },
  created() {
    this.fetchList()
    this.fetchPurchaseOrders()
    this.fetchRawMaterials()
  },
  methods: {
    async fetchRawMaterials() {
      try {
        const res = await getRawMaterialList()
        if (res && (res.code === 200 || res.code === 20000)) {
          this.rawMaterials = res.data || []
        }
      } catch (e) {
        console.error('获取原料字典失败', e)
      }
    },
    normalizeUomLabel(uom) {
      const code = String(uom || '').trim().toUpperCase()
      if (!code) return ''
      const map = {
        DRUM: '桶',
        DRUN: '桶',
        KG: 'kg',
        M2: '㎡',
        ROLL: '卷',
        PCS: 'pcs'
      }
      return map[code] || uom
    },
    findRawMaterialByCode(materialCode) {
      const code = String(materialCode || '').trim()
      if (!code) return null
      return (this.rawMaterials || []).find(item => String(item.materialCode || '').trim() === code) || null
    },
    async fetchPurchaseOrders() {
      try {
        const res = await getPurchaseOrders({ pageNum: 1, pageSize: 200 })
        if (res && (res.code === 200 || res.code === 20000)) {
          const data = res.data
          if (data && data.records) {
            this.purchaseOrderOptions = data.records
          } else if (Array.isArray(data)) {
            this.purchaseOrderOptions = data
          }
        }
      } catch (e) {
        console.error('获取采购订单失败', e)
      }
    },
    async handleSeedTestData() {
      try {
        const res = await seedPurchaseReceiptTestData(3)
        if (res && (res.code === 200 || res.code === 20000)) {
          const count = (res.data && res.data.count) || 0
          this.$message.success(`已生成测试数据 ${count} 条`)
          this.fetchList()
        } else {
          this.$message.error((res && (res.msg || res.message)) || '生成测试数据失败')
        }
      } catch (e) {
        this.$message.error('生成测试数据失败')
      }
    },
    async handleCleanupTestData() {
      try {
        await this.$confirm('确认清理收货通知测试数据吗？仅会删除带测试标记的数据。', '提示', { type: 'warning' })
      } catch (e) {
        return
      }
      try {
        const res = await cleanupPurchaseReceiptTestData()
        if (res && (res.code === 200 || res.code === 20000)) {
          const receiptCount = (res.data && res.data.receiptCount) || 0
          this.$message.success(`已清理测试收货单 ${receiptCount} 条`)
          this.fetchList()
        } else {
          this.$message.error((res && (res.msg || res.message)) || '清理测试数据失败')
        }
      } catch (e) {
        this.$message.error('清理测试数据失败')
      }
    },
    mapOrderItemToReceiptItem(item, orderNo) {
      const raw = this.findRawMaterialByCode(item.materialCode)
      const specification = item.specification || item.spec || (raw && raw.spec) || [item.thickness, item.width, item.length].filter(v => v !== null && v !== undefined && v !== '').join('*') || ''
      const unitCode = item.purchaseUomCode || item.priceUomCode || item.stockUomCode || item.unit || (raw && raw.unit) || ''
      return {
        materialCode: item.materialCode || '',
        materialName: item.materialName || '',
        specification,
        purchaseOrderNo: orderNo || '',
        purchaseQty: item.purchaseQty !== undefined && item.purchaseQty !== null ? item.purchaseQty : (item.rolls !== undefined && item.rolls !== null ? item.rolls : 0),
        purchaseUomCode: item.purchaseUomCode || '',
        priceQty: item.priceQty !== undefined && item.priceQty !== null ? item.priceQty : (item.stockQty !== undefined && item.stockQty !== null ? item.stockQty : (item.sqm !== undefined && item.sqm !== null ? item.sqm : 0)),
        priceUomCode: item.priceUomCode || '',
        stockQty: item.stockQty !== undefined && item.stockQty !== null ? item.stockQty : (item.sqm !== undefined && item.sqm !== null ? item.sqm : 0),
        stockUomCode: item.stockUomCode || '',
        conversionRate: item.conversionRate || null,
        expectedQty: item.purchaseQty !== undefined && item.purchaseQty !== null ? item.purchaseQty : (item.rolls !== undefined && item.rolls !== null ? item.rolls : 0),
        receivedQty: item.receivedQty !== undefined && item.receivedQty !== null
          ? item.receivedQty
          : (item.purchaseQty !== undefined && item.purchaseQty !== null
            ? item.purchaseQty
            : (item.rolls !== undefined && item.rolls !== null ? item.rolls : 0)),
        unit: this.normalizeUomLabel(unitCode),
        remark: item.remark || ''
      }
    },
    applyOrderToForm(order) {
      if (!order) return
      this.form.purchaseOrderNo = order.orderNo || ''
      this.form.supplier = order.supplier || ''
      this.form.contactName = order.contactName || ''
      this.form.contactPhone = order.contactPhone || ''
      this.form.receiveAddress = order.deliveryAddress || ''
      this.form.expectedDate = order.deliveryDate || order.orderDate || ''
      if (Array.isArray(order.items) && order.items.length) {
        this.form.items = order.items.map(item => this.mapOrderItemToReceiptItem(item, order.orderNo))
      }
      if (!this.form.items.length) {
        this.form.items = [this.emptyItem()]
      }
    },
    async onPurchaseOrderChange(orderNo) {
      if (!orderNo) return
      const cached = this.purchaseOrderOptions.find(order => order.orderNo === orderNo)
      if (cached && Array.isArray(cached.items) && cached.items.length) {
        this.applyOrderToForm(cached)
        return
      }
      const res = await getPurchaseOrderDetail(orderNo)
      if (res && (res.code === 200 || res.code === 20000) && res.data) {
        this.applyOrderToForm(res.data)
      }
    },
    emptyForm() {
      return {
        id: null,
        receiptNo: '',
        purchaseOrderNo: '',
        supplier: '',
        contactName: '',
        contactPhone: '',
        receiveAddress: '',
        expectedDate: '',
        receivedDate: this.today(),
        status: 'planned',
        remark: '',
        items: [this.emptyItem()]
      }
    },
    today() {
      const d = new Date()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${d.getFullYear()}-${m}-${day}`
    },
    emptyItem() {
      return {
        materialCode: '',
        materialName: '',
        specification: '',
        purchaseOrderNo: '',
        purchaseQty: 0,
        purchaseUomCode: '',
        priceQty: 0,
        priceUomCode: '',
        stockQty: 0,
        stockUomCode: '',
        conversionRate: null,
        expectedQty: 0,
        receivedQty: 0,
        unit: '',
        remark: ''
      }
    },
    statusText(status) {
      return getPurchaseStatusMeta(status).text
    },
    statusTag(status) {
      return getPurchaseStatusMeta(status).tag
    },
    reconciliationText(status) {
      return getPurchaseReconciliationMeta(status).text
    },
    reconciliationTag(status) {
      return getPurchaseReconciliationMeta(status).tag
    },
    async fetchList() {
      this.loading = true
      try {
        const res = await listPurchaseReceipts({
          page: this.pagination.page,
          size: this.pagination.size,
          supplier: this.filters.supplier,
          status: this.filters.status,
          reconciliationStatus: this.filters.reconciliationStatus
        })
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
      this.fetchPurchaseOrders()
      this.editVisible = true
    },
    async openEdit(row) {
      const res = await getPurchaseReceiptDetail(row.id)
      if (res && (res.code === 200 || res.code === 20000)) {
        this.isEdit = true
        this.form = { ...res.data, items: (res.data.items || []).map(item => ({ ...item })) }
        if (!this.form.items.length) this.form.items.push(this.emptyItem())
        this.fetchPurchaseOrders()
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
      this.form.items = (this.form.items || []).map(item => {
        const qty = Number(item.receivedQty || 0)
        return {
          ...item,
          purchaseOrderNo: this.form.purchaseOrderNo || item.purchaseOrderNo || '',
          receivedQty: qty,
          expectedQty: qty
        }
      })
      const api = this.isEdit ? updatePurchaseReceipt : createPurchaseReceipt
      const res = await api(this.form)
      if (res && (res.code === 200 || res.code === 20000)) {
        this.$message.success('提交成功')
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
      try {
        const res = await deletePurchaseReceipt(id)
        if (res && (res.code === 200 || res.code === 20000)) {
          this.$message.success('删除成功')
          if (this.records.length === 1 && this.pagination.page > 1) {
            this.pagination.page -= 1
          }
          this.fetchList()
        } else {
          this.$message.error((res && (res.msg || res.message)) || '删除失败')
        }
      } catch (e) {
        this.$message.error((e && e.message) || '删除失败')
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
