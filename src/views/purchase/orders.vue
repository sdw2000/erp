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

      <el-table class="orders-table" v-loading="loading" :data="orders" style="width:100%" stripe>
        <el-table-column type="index" label="序号" width="60" align="center" />
        <el-table-column prop="supplier" label="供应商" width="180" />
        <el-table-column prop="orderNo" label="采购单号" width="208" class-name="order-no-col" />
        <el-table-column prop="supplierOrderNo" label="供应商单号" width="160" />
        <el-table-column prop="totalAmount" label="总金额" width="108" class-name="amount-col" />
        <el-table-column prop="totalArea" label="总面积(㎡)" width="108" class-name="area-col" />
        <el-table-column prop="orderDate" label="下单日期" width="140" />
        <el-table-column prop="deliveryDate" label="交货日期" width="140" />
        <el-table-column label="操作" width="320">
          <template slot-scope="scope">
            <el-button size="mini" @click="viewDetail(scope.row)">详情</el-button>
            <el-button size="mini" type="success" @click="printOrder(scope.row)">打印</el-button>
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
                  <el-option
                    v-for="supplier in suppliers"
                    :key="supplier.id"
                    :label="supplier.supplierName || supplier.shortName || supplier.supplierCode"
                    :value="supplier.id"
                  />
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
              <el-form-item label="公司地址">
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
            <el-table v-if="editForm.materialMode !== 'raw'" :data="editForm.filmItems" stripe style="width:100%; margin-top:10px;">
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
                    <el-option v-for="raw in materialOptionsForCurrentMode()" :key="raw.materialCode" :label="raw.materialCode" :value="raw.materialCode">
                      <span style="float:left">{{ raw.materialCode }}</span>
                      <span style="float:right; color:#8492a6; font-size:12px">{{ raw.materialName }}</span>
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

            <el-table v-else :data="editForm.rawItems" stripe style="width:100%; margin-top:10px;">
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
                    <el-option v-for="raw in materialOptionsForCurrentMode()" :key="raw.materialCode" :label="raw.materialCode" :value="raw.materialCode">
                      <span style="float:left">{{ raw.materialCode }}</span>
                      <span style="float:right; color:#8492a6; font-size:12px">{{ raw.materialName }}</span>
                    </el-option>
                  </el-select>
                </template>
              </el-table-column>
              <el-table-column label="物料名称" width="180">
                <template slot-scope="scope"><el-input v-model="scope.row.materialName" class="small-input" placeholder="物料名称" /></template>
              </el-table-column>
              <el-table-column label="规格" width="160">
                <template slot-scope="scope"><el-input v-model="scope.row.rawSpec" class="small-input" placeholder="如: 25kg/桶" /></template>
              </el-table-column>
              <el-table-column label="数量" width="90">
                <template slot-scope="scope"><el-input v-model="scope.row.quantity" class="small-input" type="text" placeholder="数量" /></template>
              </el-table-column>
              <el-table-column label="总重(kg)" width="110">
                <template slot-scope="scope">{{ calcRawTotalWeight(scope.row) }}</template>
              </el-table-column>
              <el-table-column label="单价" width="90">
                <template slot-scope="scope"><el-input v-model="scope.row.unitPrice" class="small-input" type="text" placeholder="单价" /></template>
              </el-table-column>
              <el-table-column label="金额" width="100">
                <template slot-scope="scope">{{ calcRawAmount(scope.row) }}</template>
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
import { getPurchaseOrders, createPurchaseOrder, updatePurchaseOrder, deletePurchaseOrder, downloadPurchaseTemplate, importPurchaseOrders, exportPurchaseOrders, getPurchaseOrderDetail, generatePurchaseOrderNo } from '@/api/purchase'
import { listSuppliers } from '@/api/purchaseSupplier'
import { getAllEnabledSpecs } from '@/api/tapeSpec'
import { getRawMaterialList } from '@/api/tapeFormula'

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
      rawMaterials: [],
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
    this.fetchRawMaterials()
  },
  methods: {
    getDateOffset(days = 0) {
      const d = new Date()
      d.setDate(d.getDate() + Number(days || 0))
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${y}-${m}-${day}`
    },
    emptyForm() {
      return {
        supplierId: null,
        supplier: '',
        supplierOrderNo: '',
        contactName: '',
        contactPhone: '',
        orderNo: '',
        orderDate: this.getDateOffset(0),
        deliveryDate: this.getDateOffset(3),
        deliveryAddress: '',
        status: 'pending',
        remark: '',
        materialMode: '',
        filmItems: [],
        rawItems: []
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
        const res = await listSuppliers({ page: 1, size: 1000, keyword: '' })
        if (res && (res.code === 200 || res.code === 20000)) {
          const data = res.data
          if (data && data.records) {
            this.suppliers = data.records
          } else if (data && data.list) {
            this.suppliers = data.list
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
    async fetchRawMaterials() {
      try {
        const res = await getRawMaterialList()
        if (res && (res.code === 200 || res.code === 20000)) {
          this.rawMaterials = res.data || []
        }
      } catch (e) {
        console.error('获取原材料失败', e)
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
    async openCreate() {
      this.isEditing = false
      this.editForm = this.emptyForm()
      try {
        const res = await generatePurchaseOrderNo()
        if (res && (res.code === 200 || res.code === 20000) && res.data) {
          this.editForm.orderNo = res.data
        }
      } catch (e) {
        console.error('生成采购单号失败', e)
      }
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
        materialMode: '',
        filmItems: [],
        rawItems: []
      }
      if (order.items && order.items.length) {
        const filmItems = []
        const rawItems = []
        order.items.forEach(item => {
          const isFilm = item.width !== null && item.width !== undefined && item.length !== null && item.length !== undefined
          if (isFilm) {
            filmItems.push({
              ...item,
              thicknessDisplay: item.thickness,
              lengthDisplay: item.length,
              unitPrice: item.unitPrice,
              rolls: item.rolls
            })
          } else {
            const rawMat = this.rawMaterials.find(r => r.materialCode === item.materialCode)
            rawItems.push({
              ...item,
              quantity: item.rolls,
              totalWeight: item.sqm,
              rawSpec: (rawMat && rawMat.spec) || '',
              unitPrice: item.unitPrice
            })
          }
        })
        form.filmItems = filmItems
        form.rawItems = rawItems
        form.materialMode = filmItems.length > 0 ? 'film' : (rawItems.length > 0 ? 'raw' : '')
      }
      return form
    },
    onSupplierChange(id) {
      const supplier = this.suppliers.find(s => s.id === id)
      if (supplier) {
        this.editForm.supplier = supplier.supplierName || supplier.shortName || supplier.supplierCode
        if (supplier.primaryContactName) {
          this.editForm.contactName = supplier.primaryContactName
        }
        if (supplier.primaryContactMobile) {
          this.editForm.contactPhone = supplier.primaryContactMobile
        }
        if (supplier.contactAddress) {
          this.editForm.deliveryAddress = supplier.contactAddress
        }
      }
    },
    filmMaterialOptions() {
      return (this.rawMaterials || []).filter(item => String(item.unit || '').toLowerCase().includes('m'))
    },
    nonFilmMaterialOptions() {
      return (this.rawMaterials || []).filter(item => !String(item.unit || '').toLowerCase().includes('m'))
    },
    materialOptionsForCurrentMode() {
      if (this.editForm.materialMode === 'film') return this.filmMaterialOptions()
      if (this.editForm.materialMode === 'raw') return this.nonFilmMaterialOptions()
      return this.rawMaterials || []
    },
    detectMaterialModeByCode(code) {
      const raw = (this.rawMaterials || []).find(r => r.materialCode === code)
      if (!raw) return this.editForm.materialMode || 'film'
      return String(raw.unit || '').toLowerCase().includes('m') ? 'film' : 'raw'
    },
    onMaterialCodeChange(row, code) {
      const mode = this.detectMaterialModeByCode(code)
      if (!this.editForm.materialMode) {
        this.editForm.materialMode = mode
      }
      if (this.editForm.materialMode !== mode) {
        this.editForm.materialMode = mode
        if (mode === 'film') {
          this.editForm.rawItems = []
          this.editForm.filmItems = [{ materialCode: code, materialName: '', colorCode: '', thicknessDisplay: '', width: '', lengthDisplay: '', rolls: '', unitPrice: '', remark: '' }]
          row = this.editForm.filmItems[0]
        } else {
          this.editForm.filmItems = []
          this.editForm.rawItems = [{ materialCode: code, materialName: '', rawSpec: '', quantity: '', totalWeight: '', unitPrice: '', remark: '' }]
          row = this.editForm.rawItems[0]
        }
      }

      const raw = this.rawMaterials.find(r => r.materialCode === code)
      if (raw) {
        row.materialName = raw.materialName
      }
      if (mode === 'film') {
        const spec = this.specs.find(s => s.materialCode === code)
        if (spec) {
          if (!row.materialName) row.materialName = spec.productName
          row.colorCode = spec.colorCode
          row.thicknessDisplay = spec.totalThickness
          row.width = spec.width
          row.lengthDisplay = spec.length
        }
      } else {
        row.rawSpec = (raw && raw.spec) || row.rawSpec || ''
      }
    },
    addFilmItem() {
      this.editForm.materialMode = 'film'
      this.editForm.filmItems.push({
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
    removeFilmItem(index) {
      this.editForm.filmItems.splice(index, 1)
    },
    addRawItem() {
      this.editForm.materialMode = 'raw'
      this.editForm.rawItems.push({
        materialCode: '',
        materialName: '',
        rawSpec: '',
        quantity: '',
        totalWeight: '',
        unitPrice: '',
        remark: ''
      })
    },
    addItem() {
      if (this.editForm.materialMode === 'raw') {
        this.addRawItem()
      } else {
        this.addFilmItem()
      }
    },
    removeItem(index) {
      if (this.editForm.materialMode === 'raw') {
        this.removeRawItem(index)
      } else {
        this.removeFilmItem(index)
      }
    },
    removeRawItem(index) {
      this.editForm.rawItems.splice(index, 1)
    },
    parseSpecKg(spec) {
      if (!spec) return null
      const m = String(spec).match(/([0-9]+(?:\.[0-9]+)?)\s*kg\s*\/\s*桶/i)
      return m ? Number(m[1]) : null
    },
    calcRawTotalWeight(row) {
      const perBucket = this.parseSpecKg(row.rawSpec)
      const qty = Number(row.quantity)
      if (perBucket && Number.isFinite(qty) && qty > 0) {
        return (perBucket * qty).toFixed(2)
      }
      // 兼容历史数据：若规格无法解析，回退显示已存总重
      const explicit = Number(row.totalWeight)
      if (Number.isFinite(explicit) && explicit > 0) {
        return explicit.toFixed(2)
      }
      return '0'
    },
    calcRawAmount(row) {
      const weight = Number(this.calcRawTotalWeight(row))
      const price = Number(row.unitPrice || 0)
      if (!weight || !price) return '0'
      return (weight * price).toFixed(2)
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
      const isFilm = row.width !== null && row.width !== undefined && row.length !== null && row.length !== undefined
      if (!isFilm) {
        return this.calcRawAmount({
          rawSpec: row.rawSpec,
          quantity: row.rolls,
          totalWeight: row.sqm,
          unitPrice: row.unitPrice
        })
      }
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
      const filmSpec = [t, w, l].filter(Boolean).join('*')
      if (filmSpec) return filmSpec
      const raw = this.rawMaterials.find(r => r.materialCode === item.materialCode)
      return (raw && raw.spec) || ''
    },
    formatNumber(val) {
      return val === undefined || val === null ? '-' : Number(val).toFixed(2)
    },
    async saveOrder() {
      if (!this.editForm.supplier) {
        this.$message.warning('请选择供应商')
        return
      }
      const currentMode = this.editForm.materialMode || (this.editForm.rawItems.length ? 'raw' : 'film')
      const activeItems = currentMode === 'raw' ? this.editForm.rawItems : this.editForm.filmItems
      if (!activeItems.length) {
        this.$message.warning('请至少添加一条明细')
        return
      }

      const filmItems = this.editForm.filmItems.map(item => ({
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

      const rawItems = this.editForm.rawItems.map(item => ({
        id: item.id,
        materialCode: item.materialCode,
        materialName: item.materialName,
        colorCode: null,
        thickness: null,
        width: null,
        length: null,
        rolls: item.quantity ? Number(item.quantity) : null,
        sqm: Number(this.calcRawTotalWeight(item)),
        unitPrice: item.unitPrice ? Number(item.unitPrice) : null,
        amount: Number(this.calcRawAmount(item)),
        remark: item.remark
      }))

      const payload = {
        ...this.editForm,
        items: currentMode === 'raw' ? rawItems : filmItems
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
    async printOrder(row) {
      try {
        const res = await getPurchaseOrderDetail(row.orderNo)
        if (!(res && (res.code === 200 || res.code === 20000) && res.data)) {
          this.$message.error('获取打印数据失败')
          return
        }
        const order = res.data
        const items = order.items || []
        const totalAmount = this.totalAmount(order)
        const totalQty = items.reduce((sum, item) => sum + Number(item.rolls || 0), 0)

        const formatDate = (d) => {
          if (!d) return ''
          if (typeof d === 'string') return d.substring(0, 10)
          const dt = new Date(d)
          if (Number.isNaN(dt.getTime())) return ''
          const y = dt.getFullYear()
          const m = String(dt.getMonth() + 1).padStart(2, '0')
          const day = String(dt.getDate()).padStart(2, '0')
          return `${y}-${m}-${day}`
        }

        const specText = (it) => {
          const filmSpec = [it.thickness || '', it.width || '', it.length || ''].filter(Boolean).join('*')
          if (filmSpec) return filmSpec
          const raw = this.rawMaterials.find(r => r.materialCode === it.materialCode)
          return (raw && raw.spec) || ''
        }
        const rowsHtml = items.map((it, idx) => `
          <tr>
            <td>${idx + 1}</td>
            <td>${it.materialCode || ''}</td>
            <td>${it.materialName || ''}</td>
            <td>${specText(it)}</td>
            <td>${it.rolls || ''}</td>
            <td>${it.sqm || ''}</td>
            <td>${it.unitPrice || ''}</td>
            <td>${it.amount || ''}</td>
            <td>${formatDate(order.deliveryDate)}</td>
          </tr>
        `).join('')

        const html = `
          <html>
          <head>
            <meta charset="utf-8" />
            <title>采购订单打印</title>
            <style>
              body { font-family: 'SimSun', Arial, sans-serif; margin: 16px; color: #000; }
              .title { text-align: center; font-size: 32px; font-weight: 700; margin: 12px 0; }
              .meta { font-size: 14px; margin: 6px 0; }
              table { width: 100%; border-collapse: collapse; margin-top: 8px; }
              th, td { border: 1px solid #000; padding: 6px; font-size: 13px; text-align: center; }
              .summary { margin-top: 6px; font-size: 14px; }
              .footer { margin-top: 24px; font-size: 14px; display: flex; justify-content: space-between; }
            </style>
          </head>
          <body>
            <div class="title">采购订单</div>
            <div class="meta">单号：${order.orderNo || ''}</div>
            <div class="meta">订单日期：${formatDate(order.orderDate)}　　　供应商：${order.supplier || ''}</div>
            <div class="meta">联系人：${order.contactName || ''}　　　电话：${order.contactPhone || ''}</div>
            <div class="meta">公司地址：${order.deliveryAddress || ''}</div>

            <table>
              <thead>
                <tr>
                  <th>序号</th>
                  <th>物料编码</th>
                  <th>物料名称</th>
                  <th>规格型号</th>
                  <th>卷数</th>
                  <th>平米数</th>
                  <th>单价</th>
                  <th>金额</th>
                  <th>到货日期</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>

            <div class="summary">数量：${totalQty}　　金额：${totalAmount}</div>
            <div class="footer">
              <span>制单人：${order.createdBy || ''}</span>
              <span>审核人：${order.updatedBy || ''}</span>
              <span>确认：</span>
            </div>
          </body>
          </html>
        `

        const win = window.open('', '_blank')
        if (!win) {
          this.$message.warning('浏览器拦截了打印窗口，请允许弹窗后重试')
          return
        }
        win.document.open()
        win.document.write(html)
        win.document.close()
        win.focus()
        setTimeout(() => {
          win.print()
        }, 300)
      } catch (e) {
        console.error('打印失败', e)
        this.$message.error('打印失败')
      }
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
.orders-table >>> th.el-table__cell .cell,
.orders-table >>> td.el-table__cell .cell {
  white-space: normal;
  word-break: break-word;
  line-height: 18px;
  font-size: 12px;
}
.orders-table >>> td.order-no-col .cell {
  word-break: break-all;
}
.small-input >>> .el-input__inner {
  padding: 0 6px;
}
.orders-pagination-wrapper {
  margin-top: 10px;
  text-align: right;
}
</style>
