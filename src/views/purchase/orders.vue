<template>
  <div class="purchase-orders">
    <el-card>
      <div slot="header" class="clearfix">
        <span>采购订单</span>
        <div style="float:right">
          <el-button v-if="$canImportExport()" type="success" icon="el-icon-download" size="small" @click="handleDownloadTemplate">下载模板</el-button>
          <el-button v-if="$canImportExport()" type="warning" icon="el-icon-upload2" size="small" @click="triggerImport">导入</el-button>
          <el-button v-if="$canImportExport()" type="info" icon="el-icon-download" size="small" @click="handleExport">导出</el-button>
          <el-button type="primary" icon="el-icon-plus" size="small" @click="openCreate">新增采购单</el-button>
          <input ref="importFile" type="file" accept=".xlsx,.xls" style="display:none" @change="handleImportChange">
        </div>
      </div>

      <div class="search-area">
        <el-row :gutter="16">
          <el-col :span="6">
            <el-input v-model="searchForm.supplier" placeholder="供应商名称/代码/简称" clearable size="small" @keyup.enter.native="handleSearch" @clear="handleSearch" />
          </el-col>
          <el-col :span="6">
            <el-input v-model="searchForm.orderNo" placeholder="采购单号" clearable size="small" @keyup.enter.native="handleSearch" @clear="handleSearch" />
          </el-col>
          <el-col :span="5">
            <el-date-picker v-model="searchForm.startDate" type="date" placeholder="下单日期起" value-format="yyyy-MM-dd" size="small" style="width:100%" @change="handleSearch" />
          </el-col>
          <el-col :span="5">
            <el-date-picker v-model="searchForm.endDate" type="date" placeholder="下单日期止" value-format="yyyy-MM-dd" size="small" style="width:100%" @change="handleSearch" />
          </el-col>
          <el-col :span="2" class="search-actions">
            <el-button type="primary" icon="el-icon-search" size="small" @click="handleSearch">搜索</el-button>
            <el-button icon="el-icon-refresh" size="small" @click="handleReset">重置</el-button>
          </el-col>
        </el-row>
      </div>

      <el-table v-loading="loading" :data="orders" style="width:100%" stripe>
        <el-table-column type="index" label="序号" width="60" align="center" />
        <el-table-column prop="supplier" label="供应商" width="180" />
        <el-table-column prop="orderNo" label="采购单号" width="160" />
        <el-table-column prop="supplierOrderNo" label="供应商单号" width="160" />
        <el-table-column prop="totalAmount" label="总金额" width="120" />
        <el-table-column prop="totalArea" label="总面积(㎡)" width="120" />
        <el-table-column prop="orderDate" label="下单日期" width="140" />
        <el-table-column prop="deliveryDate" label="交货日期" width="140" />
        <el-table-column label="操作" width="260">
          <template slot-scope="scope">
            <el-button size="mini" @click="viewDetail(scope.row)">详情</el-button>
            <el-button size="mini" type="primary" @click="openEdit(scope.row)">编辑</el-button>
            <el-button size="mini" type="danger" @click="confirmDelete(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="orders-pagination-wrapper">
        <el-pagination
          :current-page.sync="pagination.pageNum"
          :page-size="pagination.pageSize"
          :page-sizes="[5,10,20,50]"
          layout="sizes, prev, pager, next, jumper, ->, total"
          :total="Number(pagination.total)"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>

      <el-dialog title="采购单详情" :visible.sync="detailVisible" width="1100px">
        <div v-if="currentOrder">
          <p><strong>供应商：</strong>{{ currentOrder.supplier }} &nbsp;&nbsp; <strong>采购单号：</strong>{{ currentOrder.orderNo }}</p>
          <p><strong>供应商单号：</strong>{{ currentOrder.supplierOrderNo || '-' }} &nbsp;&nbsp; <strong>状态：</strong>{{ currentOrder.status || '-' }}</p>
          <p><strong>总金额：</strong>{{ formatNumber(totalAmount(currentOrder)) }} &nbsp;&nbsp; <strong>总面积：</strong>{{ formatNumber(totalArea(currentOrder)) }}㎡</p>
          <el-table :data="currentOrder.items" stripe style="width:100%; margin-top:10px;">
            <el-table-column type="index" label="序号" width="60" align="center" />
            <el-table-column prop="materialCode" label="物料编码" width="160" />
            <el-table-column prop="materialName" label="物料名称" width="180" />
            <el-table-column label="规格" width="180">
              <template slot-scope="scope">{{ formatSpec(scope.row) }}</template>
            </el-table-column>
            <el-table-column prop="rolls" label="卷数" width="80" />
            <el-table-column label="平米数" width="100">
              <template slot-scope="scope">{{ scope.row.sqm || calcSqm(scope.row) }}</template>
            </el-table-column>
            <el-table-column label="金额" width="120">
              <template slot-scope="scope">{{ scope.row.amount || calcAmount(scope.row) }}</template>
            </el-table-column>
            <el-table-column prop="unitPrice" label="单价" width="100" />
            <el-table-column prop="remark" label="备注" />
          </el-table>
        </div>
        <span slot="footer">
          <el-button @click="detailVisible = false">关闭</el-button>
        </span>
      </el-dialog>

      <el-dialog :title="isEditing ? '编辑采购单' : '新增采购单'" :visible.sync="editVisible" width="1250px">
        <el-form :model="editForm" label-width="100px">
          <el-row :gutter="12">
            <el-col :span="24">
              <el-form-item label="供应商">
                <el-select
                  v-model="editForm.supplierId"
                  filterable
                  :disabled="isEditing"
                  placeholder="请选择供应商"
                  style="width: 100%"
                  @change="onSupplierChange"
                >
                  <el-option v-for="customer in suppliers" :key="customer.id" :label="customer.customerName" :value="customer.id" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="12">
            <el-col :span="12">
              <el-form-item label="采购单号">
                <el-input v-model="editForm.orderNo" :disabled="true" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="供应商单号">
                <el-input v-model="editForm.supplierOrderNo" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="12">
            <el-col :span="12">
              <el-form-item label="联系人">
                <el-input v-model="editForm.contactName" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="联系电话">
                <el-input v-model="editForm.contactPhone" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="12">
            <el-col :span="12">
              <el-form-item label="下单日期">
                <el-date-picker v-model="editForm.orderDate" type="date" placeholder="选择日期" value-format="yyyy-MM-dd" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="交货日期">
                <el-date-picker v-model="editForm.deliveryDate" type="date" placeholder="选择日期" value-format="yyyy-MM-dd" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="12">
            <el-col :span="12">
              <el-form-item label="送货地址">
                <el-input v-model="editForm.deliveryAddress" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="备注">
                <el-input v-model="editForm.remark" />
              </el-form-item>
            </el-col>
          </el-row>

          <div style="margin-top:10px">
            <div style="display:flex; align-items:center; justify-content:space-between">
              <div><strong>物料明细</strong></div>
              <el-button type="primary" size="mini" @click="addItem">新增明细行</el-button>
            </div>
            <el-table :data="editForm.items" stripe style="width:100%; margin-top:10px;">
              <el-table-column label="序号" width="50" align="center">
                <template slot-scope="scope">{{ scope.$index + 1 }}</template>
              </el-table-column>
              <el-table-column label="物料编码" width="200">
                <template slot-scope="scope">
                  <el-select
                    v-model="scope.row.materialCode"
                    filterable
                    allow-create
                    placeholder="选择或输入"
                    size="mini"
                    style="width: 100%"
                    @change="onMaterialCodeChange(scope.row, $event)"
                  >
                    <el-option v-for="spec in specs" :key="spec.materialCode" :label="spec.materialCode" :value="spec.materialCode">
                      <span style="float:left">{{ spec.materialCode }}</span>
                      <span style="float:right; color:#8492a6; font-size:12px">{{ spec.productName }}</span>
                    </el-option>
                  </el-select>
                </template>
              </el-table-column>
              <el-table-column label="物料名称" width="160">
                <template slot-scope="scope"><el-input v-model="scope.row.materialName" class="small-input" placeholder="物料名称" /></template>
              </el-table-column>
              <el-table-column label="颜色" width="90">
                <template slot-scope="scope"><el-input v-model="scope.row.colorCode" class="small-input" placeholder="颜色代码" /></template>
              </el-table-column>
              <el-table-column width="200">
                <template slot="header">
                  <div style="text-align: center; line-height: 1.3;">
                    <div>规格</div>
                    <div style="font-size: 11px; color: #909399;">(厚度μm*宽度mm*长度m)</div>
                  </div>
                </template>
                <template slot-scope="scope">
                  <div style="display:flex; gap:4px;">
                    <el-input v-model="scope.row.thicknessDisplay" class="small-input" type="text" placeholder="厚度" style="width:60px;" />
                    <span style="line-height: 28px;">*</span>
                    <el-input v-model="scope.row.width" class="small-input" type="text" placeholder="宽度" style="width:60px;" />
                    <span style="line-height: 28px;">*</span>
                    <el-input v-model="scope.row.lengthDisplay" class="small-input" type="text" placeholder="长度" style="width:60px;" />
                  </div>
                </template>
              </el-table-column>
              <el-table-column label="卷数" width="70">
                <template slot-scope="scope"><el-input v-model="scope.row.rolls" class="small-input" type="text" placeholder="卷数" /></template>
              </el-table-column>
              <el-table-column label="平米数" width="90">
                <template slot-scope="scope">{{ calcSqm(scope.row) }}</template>
              </el-table-column>
              <el-table-column label="单价" width="90">
                <template slot-scope="scope"><el-input v-model="scope.row.unitPrice" class="small-input" type="text" placeholder="单价" /></template>
              </el-table-column>
              <el-table-column label="金额" width="100">
                <template slot-scope="scope">{{ calcAmount(scope.row) }}</template>
              </el-table-column>
              <el-table-column label="备注" min-width="120">
                <template slot-scope="scope"><el-input v-model="scope.row.remark" class="small-input" placeholder="备注" /></template>
              </el-table-column>
              <el-table-column label="操作" width="70" align="center">
                <template slot-scope="scope">
                  <el-button type="text" size="mini" style="color:#f56c6c" @click="removeItem(scope.$index)">删除</el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-form>
        <span slot="footer">
          <el-button @click="editVisible = false">取消</el-button>
          <el-button type="primary" @click="saveOrder">保存</el-button>
        </span>
      </el-dialog>
    </el-card>
  </div>
</template>

<script>
import { getPurchaseOrders, createPurchaseOrder, updatePurchaseOrder, deletePurchaseOrder, downloadPurchaseTemplate, importPurchaseOrders, exportPurchaseOrders, getPurchaseOrderDetail } from '@/api/purchase'
import { getCustomerList } from '@/api/customer'
import { getAllEnabledSpecs } from '@/api/tapeSpec'

export default {
  name: 'PurchaseOrders',
  data() {
    return {
      loading: false,
      orders: [],
      pagination: {
        pageNum: 1,
        pageSize: 10,
        total: 0
      },
      searchForm: {
        supplier: '',
        orderNo: '',
        startDate: '',
        endDate: ''
      },
      suppliers: [],
      specs: [],
      detailVisible: false,
      editVisible: false,
      isEditing: false,
      currentOrder: null,
      editForm: this.emptyForm()
    }
  },
  created() {
    this.fetchOrders()
    this.fetchSuppliers()
    this.fetchSpecs()
  },
  methods: {
    emptyForm() {
      return {
        supplierId: null,
        supplier: '',
        supplierOrderNo: '',
        contactName: '',
        contactPhone: '',
        orderNo: '',
        orderDate: '',
        deliveryDate: '',
        deliveryAddress: '',
        status: 'pending',
        remark: '',
        items: []
      }
    },
    async fetchOrders() {
      this.loading = true
      try {
        const res = await getPurchaseOrders({
          pageNum: this.pagination.pageNum,
          pageSize: this.pagination.pageSize,
          orderNo: this.searchForm.orderNo,
          supplier: this.searchForm.supplier,
          startDate: this.searchForm.startDate,
          endDate: this.searchForm.endDate
        })
        if (res && (res.code === 200 || res.code === 20000)) {
          const pageData = res.data
          if (pageData && pageData.records) {
            this.orders = pageData.records
            this.pagination.total = Number(pageData.total || 0)
          } else if (Array.isArray(pageData)) {
            this.orders = pageData
            this.pagination.total = pageData.length
          }
        }
      } catch (e) {
        console.error('获取采购订单失败', e)
        this.$message.error('获取采购订单失败')
      } finally {
        this.loading = false
      }
    },
    async fetchSuppliers() {
      try {
        const res = await getCustomerList({ size: 1000 })
        if (res && (res.code === 200 || res.code === 20000)) {
          const data = res.data
          if (data && data.records) {
            this.suppliers = data.records
          } else if (Array.isArray(data)) {
            this.suppliers = data
          }
        }
      } catch (e) {
        console.error('获取供应商失败', e)
      }
    },
    async fetchSpecs() {
      try {
        const res = await getAllEnabledSpecs()
        if (res && (res.code === 200 || res.code === 20000)) {
          this.specs = res.data || []
        }
      } catch (e) {
        console.error('获取料号失败', e)
      }
    },
    handleSearch() {
      this.pagination.pageNum = 1
      this.fetchOrders()
    },
    handleReset() {
      this.searchForm = { supplier: '', orderNo: '', startDate: '', endDate: '' }
      this.handleSearch()
    },
    handleSizeChange(val) {
      this.pagination.pageSize = val
      this.pagination.pageNum = 1
      this.fetchOrders()
    },
    handleCurrentChange(val) {
      this.pagination.pageNum = val
      this.fetchOrders()
    },
    openCreate() {
      this.isEditing = false
      this.editForm = this.emptyForm()
      this.editVisible = true
    },
    async openEdit(row) {
      this.isEditing = true
      const res = await getPurchaseOrderDetail(row.orderNo)
      if (res && (res.code === 200 || res.code === 20000)) {
        this.editForm = this.normalizeEditForm(res.data || row)
        this.editVisible = true
      }
    },
    normalizeEditForm(order) {
      const form = {
        supplierId: order.supplierId || null,
        supplier: order.supplier,
        supplierOrderNo: order.supplierOrderNo,
        contactName: order.contactName,
        contactPhone: order.contactPhone,
        orderNo: order.orderNo,
        orderDate: order.orderDate,
        deliveryDate: order.deliveryDate,
        deliveryAddress: order.deliveryAddress,
        status: order.status || 'pending',
        remark: order.remark,
        items: []
      }
      if (order.items && order.items.length) {
        form.items = order.items.map(item => ({
          ...item,
          thicknessDisplay: item.thickness,
          lengthDisplay: item.length,
          unitPrice: item.unitPrice,
          rolls: item.rolls
        }))
      }
      return form
    },
    onSupplierChange(id) {
      const supplier = this.suppliers.find(c => c.id === id)
      if (supplier) {
        this.editForm.supplier = supplier.customerName || supplier.shortName || supplier.customerCode
        if (supplier.primaryContactName) {
          this.editForm.contactName = supplier.primaryContactName
        }
        if (supplier.primaryContactMobile) {
          this.editForm.contactPhone = supplier.primaryContactMobile
        }
      }
    },
    onMaterialCodeChange(row, code) {
      const spec = this.specs.find(s => s.materialCode === code)
      if (spec) {
        row.materialName = spec.productName
        row.colorCode = spec.colorCode
        row.thicknessDisplay = spec.totalThickness
        row.width = spec.width
        row.lengthDisplay = spec.length
      }
    },
    addItem() {
      this.editForm.items.push({
        materialCode: '',
        materialName: '',
        colorCode: '',
        thicknessDisplay: '',
        width: '',
        lengthDisplay: '',
        rolls: '',
        unitPrice: '',
        remark: ''
      })
    },
    removeItem(index) {
      this.editForm.items.splice(index, 1)
    },
    calcSqm(row) {
      // 优先使用后端返回的已计算面积字段（ sqm 或 area ）
      const backendArea = row.sqm || row.area || row.squareMeter
      if (backendArea !== undefined && backendArea !== null && backendArea !== '') {
        const n = Number(backendArea)
        return Number.isFinite(n) ? n.toFixed(2) : '0'
      }
      // 如果后端未提供面积，前端不做单位换算，返回 '0' 以避免错算
      return '0'
    },
    calcAmount(row) {
      const sqm = parseFloat(this.calcSqm(row))
      const price = parseFloat(row.unitPrice || 0)
      if (!sqm || !price) return '0'
      return (sqm * price).toFixed(2)
    },
    totalAmount(order) {
      if (!order || !order.items) return 0
      return order.items.reduce((sum, item) => sum + Number(this.calcAmount(item)), 0).toFixed(2)
    },
    totalArea(order) {
      if (!order || !order.items) return 0
      return order.items.reduce((sum, item) => sum + Number(this.calcSqm(item)), 0).toFixed(2)
    },
    formatSpec(item) {
      const t = item.thicknessDisplay || item.thickness || ''
      const w = item.width || ''
      const l = item.lengthDisplay || item.length || ''
      return [t, w, l].filter(Boolean).join('*')
    },
    formatNumber(val) {
      return val === undefined || val === null ? '-' : Number(val).toFixed(2)
    },
    async saveOrder() {
      if (!this.editForm.supplier) {
        this.$message.warning('请选择供应商')
        return
      }
      if (!this.editForm.items.length) {
        this.$message.warning('请至少添加一条明细')
        return
      }

      const payload = {
        ...this.editForm,
        items: this.editForm.items.map(item => ({
          id: item.id,
          materialCode: item.materialCode,
          materialName: item.materialName,
          colorCode: item.colorCode,
          thickness: item.thicknessDisplay ? Number(item.thicknessDisplay) : null,
          width: item.width ? Number(item.width) : null,
          length: item.lengthDisplay ? Number(item.lengthDisplay) : null,
          rolls: item.rolls ? Number(item.rolls) : null,
          unitPrice: item.unitPrice ? Number(item.unitPrice) : null,
          remark: item.remark
        }))
      }

      const apiCall = this.isEditing ? updatePurchaseOrder(payload) : createPurchaseOrder(payload)
      try {
        const res = await apiCall
        if (res && (res.code === 200 || res.code === 20000)) {
          this.$message.success(this.isEditing ? '更新成功' : '创建成功')
          this.editVisible = false
          this.fetchOrders()
        } else {
          this.$message.error('保存失败')
        }
      } catch (e) {
        console.error('保存采购订单失败', e)
        this.$message.error('保存采购订单失败')
      }
    },
    confirmDelete(row) {
      this.$confirm(`确认删除采购单 ${row.orderNo} 吗？`, '提示', { type: 'warning' })
        .then(() => deletePurchaseOrder(row.orderNo))
        .then(res => {
          if (res && (res.code === 200 || res.code === 20000)) {
            this.$message.success('删除成功')
            this.fetchOrders()
          } else {
            this.$message.error(res.message || '删除失败')
          }
        })
        .catch(() => {})
    },
    viewDetail(row) {
      this.currentOrder = row
      this.detailVisible = true
    },
    handleDownloadTemplate() {
      downloadPurchaseTemplate()
    },
    triggerImport() {
      this.$refs.importFile && this.$refs.importFile.click()
    },
    handleImportChange(e) {
      const file = e.target.files[0]
      if (!file) return
      importPurchaseOrders(file).then(res => {
        if (res && (res.code === 200 || res.code === 20000)) {
          this.$message.success('导入完成')
          this.fetchOrders()
        } else {
          this.$message.error('导入失败')
        }
        this.$refs.importFile.value = ''
      })
    },
    handleExport() {
      exportPurchaseOrders()
    }
  }
}
</script>

<style scoped>
.purchase-orders {
  padding: 10px;
}
.search-area {
  margin-bottom: 12px;
}
.search-actions {
  display: flex;
  gap: 8px;
}
.small-input >>> .el-input__inner {
  padding: 0 6px;
}
.orders-pagination-wrapper {
  margin-top: 10px;
  text-align: right;
}
</style>
