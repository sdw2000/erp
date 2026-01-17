<template>  <div class="sales-orders">
  <el-card>
    <div slot="header" class="clearfix">
      <span>销售订单</span>      <div style="float:right">
        <el-button v-if="$canImportExport()" type="success" icon="el-icon-download" size="small" @click="handleDownloadTemplate">下载模板</el-button>
        <el-button v-if="$canImportExport()" type="warning" icon="el-icon-upload2" size="small" @click="handleImportClick">导入</el-button>
        <el-button v-if="$canImportExport()" type="info" icon="el-icon-download" size="small" @click="handleExportAll">导出</el-button>
        <el-button type="primary" icon="el-icon-plus" size="small" @click="openCreate">新增订单</el-button>
        <input ref="importFile" type="file" accept=".xlsx,.xls" style="display:none" @change="handleImportChange">
      </div>
    </div>

    <!-- 搜索区域 -->
    <div class="search-area">
      <el-row :gutter="16">
        <el-col :span="5">
          <el-input v-model="searchForm.customer" placeholder="客户名称/简称/代码" clearable size="small" @keyup.enter.native="handleSearch" @clear="handleSearch" />
        </el-col>
        <el-col :span="5">
          <el-input v-model="searchForm.orderNo" placeholder="订单编号" clearable size="small" @keyup.enter.native="handleSearch" @clear="handleSearch" />
        </el-col>
        <el-col :span="4">
          <el-date-picker v-model="searchForm.orderDateStart" type="date" placeholder="订单日期起" value-format="yyyy-MM-dd" size="small" style="width:100%" @change="handleSearch" />
        </el-col>
        <el-col :span="4">
          <el-date-picker v-model="searchForm.orderDateEnd" type="date" placeholder="订单日期止" value-format="yyyy-MM-dd" size="small" style="width:100%" @change="handleSearch" />
        </el-col>
        <el-col :span="6">
          <el-button type="primary" icon="el-icon-search" size="small" @click="handleSearch">搜索</el-button>
          <el-button icon="el-icon-refresh" size="small" @click="handleReset">重置</el-button>
        </el-col>
      </el-row>
    </div>    <el-table :data="pagedOrders" style="width:100%" stripe @sort-change="handleSortChange">
      <el-table-column type="index" label="序号" width="60" align="center" :index="indexMethod" />
      <el-table-column prop="customerDisplay" label="客户名称" width="150" sortable="custom" />
      <el-table-column prop="orderNo" label="订单编号" width="160" sortable="custom" />
      <el-table-column prop="salesUserName" label="销售" width="100" />
      <el-table-column prop="documentationPersonUserName" label="跟单员" width="100" />
      <el-table-column prop="totalAmount" label="总金额" width="120" sortable="custom" />
      <el-table-column prop="totalArea" label="总面积(㎡)" width="120" sortable="custom" />
      <el-table-column prop="orderDate" label="订单日期" width="140" sortable="custom" />
      <el-table-column prop="deliveryDate" label="交货日期" width="140" sortable="custom" />
      <el-table-column label="操作" width="280">
        <template slot-scope="scope">
          <el-button size="mini" @click="viewDetail(scope.row)">详情</el-button>
          <el-button size="mini" type="success" @click="handlePrint(scope.row)">打印</el-button>
          <el-button size="mini" type="primary" @click="openEdit(scope.row)">编辑</el-button>
          <el-button size="mini" type="danger" @click="confirmDelete(scope.row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="orders-pagination-wrapper">
      <el-pagination
        :current-page.sync="currentPage"
        :page-size="pageSize"
        :page-sizes="[5,10,20,50]"
        layout="sizes, prev, pager, next, jumper, ->, total"
        :total="Number(total)"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>    <!-- 详情对话框 -->    <el-dialog title="订单详情" :visible.sync="detailVisible" width="1200px">
      <div v-if="currentOrder">
        <p><strong>客户名称：</strong>{{ currentOrder.customerDisplay || currentOrder.customer }} &nbsp;&nbsp; <strong>订单编号：</strong>{{ currentOrder.orderNo }}</p>
        <p><strong>销售：</strong>{{ currentOrder.salesUserName }} &nbsp;&nbsp; <strong>跟单员：</strong>{{ currentOrder.documentationPersonUserName }}</p>
        <p><strong>总金额：</strong>{{ totalAmount(currentOrder) }} &nbsp;&nbsp; <strong>总面积：</strong>{{ totalArea(currentOrder) }}㎡</p>

        <el-table :data="currentOrder.items" stripe style="width:100%; margin-top:10px;">
          <el-table-column type="index" label="序号" width="60" align="center" />          <el-table-column prop="materialCode" label="产品编码" width="180" />
          <el-table-column prop="materialName" label="产品名称" width="180" />
          <el-table-column label="规格" width="180">
            <template slot-scope="scope">
              {{ formatSpec(scope.row) }}
            </template>
          </el-table-column>
          <el-table-column prop="colorCode" label="颜色" width="100" />
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

    <!-- 编辑/新增对话框 -->
    <el-dialog :title="isEditing ? '编辑订单' : '新增订单'" :visible.sync="editVisible" width="1350px">
      <el-form :model="editForm" label-width="100px">        <!-- 客户名称 单独一行 -->        <el-row :gutter="12">
                                                                                         <el-col :span="24">                                    <el-form-item label="客户名称">
                                                                                           <el-select
                                                                                             v-model="editForm.customerId"
                                                                                             filterable
                                                                                             :disabled="isEditing"
                                                                                             placeholder="请选择客户"
                                                                                             style="width: 100%"
                                                                                             @change="onCustomerChange"
                                                                                           >
                                                                                             <el-option
                                                                                               v-for="customer in customers"
                                                                                               :key="customer.id"
                                                                                               :label="customer.customerName"
                                                                                               :value="customer.id"
                                                                                             />
                                                                                           </el-select>
                                                                                         </el-form-item>
                                                                                         </el-col>
                                                                                       </el-row>

        <!-- 订单编号 与 客户订单号 同一行 -->
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="订单编号">
              <el-input v-model="editForm.orderNo" :disabled="isEditing" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="客户订单号">
              <el-input v-model="editForm.customerOrderNo" @input="customerOrderEdited = true" />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 销售与跟单员 -->
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="销售">
              <el-input v-model="editForm.salesUserName" placeholder="自动填充" :disabled="true" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="跟单员">
              <el-input v-model="editForm.documentationPersonUserName" placeholder="自动填充" :disabled="true" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="订单日期">
              <el-date-picker
                v-model="editForm.orderDate"
                type="date"
                placeholder="选择日期"
                value-format="yyyy-MM-dd"
                format="yyyy-MM-dd"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="交货日期">
              <el-date-picker
                v-model="editForm.deliveryDate"
                type="date"
                placeholder="选择日期"
                value-format="yyyy-MM-dd"
                format="yyyy-MM-dd"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="总金额">
              <el-input :value="totalAmount(editForm)" disabled />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="总面积(㎡)">
              <el-input :value="totalArea(editForm)" disabled />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 送货地址 单独一行 -->
        <el-row :gutter="12">
          <el-col :span="24">
            <el-form-item label="送货地址">
              <el-input v-model="editForm.deliveryAddress" placeholder="填写送货地址" />
            </el-form-item>
          </el-col>
        </el-row>

        <div style="margin-top:10px">
          <div style="display:flex; align-items:center; justify-content:space-between">
            <div><strong>物料明细</strong></div>
          </div>

          <div style="margin:8px 0; display:flex; justify-content:flex-end;">
            <el-button type="primary" size="mini" @click="addItem">新增明细行</el-button>
          </div>          <el-table :data="editForm.items" stripe style="width:100%; margin-top:10px;">
            <el-table-column label="序号" width="50" align="center">
              <template slot-scope="scope">{{ scope.$index + 1 }}</template>
            </el-table-column>
            <el-table-column label="产品编码" width="220">
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
                  <el-option
                    v-for="spec in specs"
                    :key="spec.materialCode"
                    :label="spec.materialCode"
                    :value="spec.materialCode"
                  >
                    <span style="float: left">{{ spec.materialCode }}</span>
                    <span style="float: right; color: #8492a6; font-size: 12px">{{ spec.productName }}</span>
                  </el-option>
                </el-select>
              </template>
            </el-table-column>            <el-table-column label="产品名称" width="180">
              <template slot-scope="scope"><el-input v-model="scope.row.materialName" class="small-input" placeholder="产品名称" /></template>
            </el-table-column>
            <el-table-column label="颜色" width="100">
              <template slot-scope="scope">
                <el-tooltip class="item" effect="dark" :content="scope.row.colorCode" placement="top" :disabled="!scope.row.colorCode">
                  <el-input v-model="scope.row.colorCode" class="small-input" placeholder="颜色代码" />
                </el-tooltip>
              </template>
            </el-table-column>
            <el-table-column width="200">
              <template slot="header">
                <div style="text-align: center; line-height: 1.3;">
                  <div>规格</div>
                  <div style="font-size: 11px; color: #909399;">(厚度μm*宽度mm*长度m)</div>
                </div>
              </template>
              <template slot-scope="scope">
                <div style="display: flex; gap: 4px;">
                  <el-input v-model="scope.row.thicknessDisplay" class="small-input" type="text" inputmode="numeric" pattern="[0-9]*\.?[0-9]*" placeholder="厚度" style="width: 60px;" />
                  <span style="line-height: 28px;">*</span>
                  <el-input v-model="scope.row.width" class="small-input" type="text" inputmode="numeric" pattern="[0-9]*\.?[0-9]*" placeholder="宽度" style="width: 60px;" />
                  <span style="line-height: 28px;">*</span>
                  <el-input v-model="scope.row.lengthDisplay" class="small-input" type="text" inputmode="numeric" pattern="[0-9]*\.?[0-9]*" placeholder="长度" style="width: 60px;" />
                </div>
              </template>
            </el-table-column>
            <el-table-column label="卷数" width="70">
              <template slot-scope="scope"><el-input v-model="scope.row.rolls" class="small-input" type="text" inputmode="numeric" pattern="[0-9]*" placeholder="卷数" /></template>
            </el-table-column>            <el-table-column label="平米数" width="90">
              <template slot-scope="scope">{{ calcSqm(scope.row) }}</template>
            </el-table-column>
            <el-table-column label="单价" width="90">
              <template slot-scope="scope"><el-input v-model="scope.row.unitPrice" class="small-input" type="text" inputmode="numeric" pattern="[0-9]*\.?[0-9]*" placeholder="单价" /></template>
            </el-table-column>
            <el-table-column label="金额" width="100">
              <template slot-scope="scope">{{ calcAmount(scope.row) }}</template>
            </el-table-column>
            <el-table-column label="备注" min-width="120">
              <template slot-scope="scope"><el-input v-model="scope.row.remark" class="small-input" placeholder="备注" /></template>
            </el-table-column>
            <el-table-column label="操作" width="60" align="center">
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

    <!-- 打印对话框 -->
    <el-dialog title="打印预览" :visible.sync="printVisible" width="900px" top="5vh">
      <div v-if="currentPrint" id="printArea" class="print-content">
        <!-- 公司抬头 -->
        <div class="company-header">
          <h1 class="company-name">东莞市方恩电子材料科技有限公司</h1>
          <div class="company-info">
            <p>地址：东莞市东城区主山乌石岗工业区</p>
            <p>电话：0769-82551118 &nbsp;&nbsp; 传真：0769-82551160 &nbsp;&nbsp; www.finechemfr.com</p>
          </div>
        </div>

        <!-- 合同标题 -->
        <h2 class="contract-title">销售合同</h2>
        <div class="contract-info">
          <span style="float: right">合同编号：{{ currentPrint.orderNo }}</span>
        </div>

        <!-- 基本信息 -->
        <div class="basic-info">
          <p><strong>签定时间：</strong>{{ currentPrint.orderDate }} &nbsp;&nbsp;&nbsp;&nbsp; <strong>签订地点：</strong>东莞市东城区主山乌石岗工业区</p>
          <p><strong>甲  方：</strong>{{ currentPrint.customer }} （以下简称"甲方"）</p>
          <p><strong>乙  方：</strong>方恩电子材料科技有限公司（以下简称"乙方"）</p>
        </div>

        <!-- 明细表格 -->
        <h3 class="section-title">第一条 名称规格及价格见下表：</h3>
        <table class="items-table">
          <thead>
            <tr>
              <th style="width: 180px;">产品名称</th>
              <th style="width: 120px;">型号</th>
              <th style="width: 180px;">规格<br>(宽度*厚度*长度)</th>
              <th style="width: 80px;">卷数<br>(卷)</th>
              <th style="width: 100px;">生产方数<br>(平方米)</th>
              <th style="width: 80px;">单价<br>(元/㎡)</th>
              <th style="width: 120px;">总金额<br>(元)</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, index) in currentPrint.items" :key="index">
              <td>{{ item.materialName }}</td>
              <td>{{ item.materialCode }}</td>
              <td>{{ formatSpec(item) }}</td>
              <td style="text-align: center;">{{ item.rolls }}</td>
              <td style="text-align: right;">{{ formatNumber(item.sqm || calcSqmNumber(item)) }}</td>
              <td style="text-align: right;">{{ formatNumber(item.unitPrice) }}</td>
              <td style="text-align: right;">{{ formatNumber(item.amount || calcAmount(item)) }}</td>
            </tr>
            <!-- 空行 -->
            <tr v-for="n in Math.max(0, 5 - (currentPrint.items ? currentPrint.items.length : 0))" :key="'empty-'+n" class="empty-row">
              <td>&nbsp;</td><td /><td /><td /><td /><td /><td />
            </tr>
            <tr class="total-row">
              <td colspan="3" style="text-align: right; padding-right: 10px;"><strong>合计：</strong></td>
              <td style="text-align: center;"><strong>{{ sumRolls }}</strong></td>
              <td style="text-align: right;"><strong>{{ sumArea }}</strong></td>
              <td />
              <td style="text-align: right;"><strong>{{ sumAmount }}</strong></td>
            </tr>
          </tbody>
        </table>

        <!-- 合同条款 -->
        <div class="contract-terms">
          <p><strong>付款方式：</strong>{{ currentPrint.paymentTerms || '款到发货' }}</p>
          <p><strong>第二条 付款期限：</strong>当月 {{ currentPrint.paymentDays || 0 }} 日</p>
          <p><strong>第三条 交货期限、地点、方式</strong></p>
          <p style="margin-left: 20px;">1. 乙方必须在 {{ currentPrint.deliveryDate }} 前将货物送达甲方指定地点，并由甲方签收。</p>
          <p style="margin-left: 20px;">2. 如甲方要求送货上门的，运费由乙方承担，如乙方代收取运费的，甲方及时予以支付，乙方不许以欠运费为由不及时交货，未及时交货以及因此造成给甲方或甲方客户的各项损失，全由乙方承担。运费应另外支付给乙方的人员负责。</p>
          <p style="margin-left: 20px;">3. 若甲方在欠乙方前段采购货款的情况下还要求乙方交货，若乙方不交货乙方不须承担任何责任。</p>
          <p><strong>第四条 产品检验和验收</strong></p>
          <p style="margin-left: 20px;">甲方收到货物后，应仔细确认，数量问题请收到货后的3天内提出，质量问题请收到货后的7天内提出。</p>
          <p><strong>第五条 售后服务</strong></p>
          <p style="margin-left: 20px;">任何瑕疵产品请收到货后30天之内寄回我司，经确认后办理以货换货或等值的货款抵扣，逾期则视为无异议。</p>
          <p><strong>第六条 保密条款</strong></p>
          <p style="margin-left: 20px;">1. 双方在交易过程中获悉的商业秘密均应保密，不得泄露或转让第三方，否则应赔偿由此给对方造成的一切损失；本合同终止后，其保密义务仍然有效，直至相关信息成为公开信息为止。</p>
          <p style="margin-left: 20px;">2. 本合同中涉及的商业秘密，未经对方书面同意，任何一方不得使用或披露给第三方。</p>
          <p><strong>第七条 争议解决</strong></p>
          <p style="margin-left: 20px;">本合同在履行过程中发生的争议，由双方当事人协商解决；协商不成的，依法向合同签订地人民法院起诉。</p>
          <p><strong>第八条 本合同一式贰份，甲乙双方各执壹份，自双方签字盖章之日起生效。</strong></p>
        </div>

        <!-- 签字栏 -->
        <div class="signature-section">
          <div class="signature-block">
            <p><strong>甲方（盖章）：</strong>{{ currentPrint.customer }}</p>
            <p><strong>授权代表：</strong>_________________</p>
            <p><strong>联系电话：</strong>{{ currentPrint.contactPhone || '_________________' }}</p>
            <p><strong>联系地址：</strong>{{ currentPrint.deliveryAddress || '_________________' }}</p>
          </div>
          <div class="signature-block">
            <p><strong>乙方（盖章）：</strong>方恩电子材料科技有限公司</p>
            <p><strong>授权代表：</strong>_________________</p>
            <p><strong>联系电话：</strong>0769-82551118</p>
            <p><strong>联系地址：</strong>东莞市东城区主山乌石岗工业区</p>
          </div>
        </div>

        <div class="page-footer">
          <p>共 1 页，第 1 页</p>
        </div>
      </div>

      <div slot="footer" class="dialog-footer">
        <el-button @click="printVisible = false">关闭</el-button>
        <el-button type="primary" icon="el-icon-printer" @click="handlePrintBrowser">打印 / 导出PDF</el-button>
      </div>
    </el-dialog>
  </el-card>
</div>
</template>

<script>
import { getOrders, createOrder, updateOrder, deleteOrder, downloadOrderTemplate, importOrders, exportOrders, getOrderDetail } from '@/api/sales'
import { getCustomerList } from '@/api/customer'
import { getAllEnabledSpecs } from '@/api/tapeSpec'

export default {
  name: 'SalesOrders',
  filters: {
    numberFixed(value, digits) {
      if (value === null || value === undefined) return ''
      return Number(value).toFixed(digits || 0)
    }
  },
  data() {
    return {
      orders: [],
      customers: [], // 客户列表
      specs: [], // 料号规格列表
      currentPage: 1,
      pageSize: 10,
      total: 0,
      detailVisible: false,
      currentOrder: null,
      editVisible: false,
      isEditing: false,
      editForm: this.emptyForm(),
      // flag: whether customerOrderNo has been manually edited by user
      customerOrderEdited: false, // 搜索表单
      searchForm: {
        customer: '',
        orderNo: '',
        orderDateStart: '',
        orderDateEnd: ''
      },
      // 排序
      sortProp: '',
      sortOrder: '',

      // 打印
      printVisible: false,
      currentPrint: null
    }
  },
  computed: {
    pagedOrders() {
      return this.orders
    },
    // 打印时的合计数据
    sumRolls() {
      if (!this.currentPrint || !this.currentPrint.items) return 0
      return this.currentPrint.items.reduce((sum, item) => sum + (Number(item.rolls) || 0), 0)
    },
    sumArea() {
      if (!this.currentPrint || !this.currentPrint.items) return '0.00'
      const sum = this.currentPrint.items.reduce((s, item) => s + (item.sqm || this.calcSqmNumber(item)), 0)
      return sum.toFixed(2)
    },
    sumAmount() {
      if (!this.currentPrint || !this.currentPrint.items) return '0.00'
      const sum = this.currentPrint.items.reduce((s, item) => {
        const amount = item.amount || (this.calcSqmNumber(item) * (Number(item.unitPrice) || 0))
        return s + amount
      }, 0)
      return sum.toFixed(2)
    }
  },
  watch: {
    'editForm.orderNo'(val) {
      // if user hasn't manually edited customerOrderNo, keep them in sync
      if (!this.customerOrderEdited) {
        this.editForm.customerOrderNo = val
      }
    }
  },
  async created() {
    await this.fetchCustomers()
    await this.fetchSpecs()
    this.fetchOrders()
  },
  activated() {
    // when navigating to this route (keep-alive) ensure list is fresh
    this.fetchOrders()
  },
  methods: {
    emptyForm() {
      return {
        orderNo: '',
        customerId: null,
        customer: '',
        salesUserId: null,
        salesUserName: '',
        documentationPersonUserId: null,
        documentationPersonUserName: '',
        totalAmount: 0,
        totalArea: 0,
        orderDate: '',
        deliveryDate: '',
        deliveryAddress: '',
        customerOrderNo: '',
        items: []
      }
    },
    // 获取客户列表
    async fetchCustomers() {
      try {
        const res = await getCustomerList({ size: 1000 })
        if (res && (res.code === 20000 || res.code === 200)) {
          const data = res.data
          if (data && data.records) {
            this.customers = data.records
          } else if (Array.isArray(data)) {
            this.customers = data
          }
        }
      } catch (e) {
        console.error('获取客户列表失败:', e)
      }
    },
    // 客户选择变更
    onCustomerChange(customerId) {
      const customer = this.customers.find(c => c.id === customerId)
      if (customer) {
        // 使用客户代码作为customer字段（与数据库存储一致）
        this.editForm.customer = customer.customerCode
        // 自动填充销售和跟单员（使用展示字段显示用户真实姓名）
        this.editForm.salesUserId = customer.salesUserId || null
        this.editForm.salesUserName = customer.salesUserName || ''
        this.editForm.documentationPersonUserId = customer.documentationPersonUserId || null
        this.editForm.documentationPersonUserName = customer.documentationPersonUserName || ''
        // 自动填充收货地址
        if (customer.contactAddress) {
          this.editForm.deliveryAddress = customer.contactAddress
        }
      }
    },
    // 获取料号规格列表
    async fetchSpecs() {
      try {
        const res = await getAllEnabledSpecs()
        if (res && (res.code === 200 || res.code === 20000)) {
          this.specs = res.data || []
        }
      } catch (e) {
        console.error('获取料号列表失败:', e)
      }
    },
    // 产品编码选择变更 - 自动带出产品名称和厚度
    onMaterialCodeChange(row, materialCode) {
      if (!materialCode) return
      const spec = this.specs.find(s => s.materialCode === materialCode)
      if (spec) {
        row.materialName = spec.productName || row.materialName
        row.colorCode = spec.colorCode || row.colorCode // 自动填充颜色代码
        // Convert thickness from baseThickness(um) to display format if needed
        // Assuming database stores um for display fields in FE
        if (spec.totalThickness) {
          row.thicknessDisplay = spec.totalThickness
        } else if (spec.baseThickness) { // fallback
          row.thicknessDisplay = spec.baseThickness
        }
      }
    },
    async fetchOrders() {
      try {
        const params = {
          pageNum: this.currentPage,
          pageSize: this.pageSize,
          orderNo: this.searchForm.orderNo || undefined,
          customer: this.searchForm.customer || undefined,
          startDate: this.searchForm.orderDateStart || undefined,
          endDate: this.searchForm.orderDateEnd || undefined
        }

        console.log('搜索参数:', params)
        const res = await getOrders(params)
        console.log('搜索结果:', res)

        if (res && res.code === 200) {
          const pageInfo = res.data
          const list = pageInfo.list || pageInfo.records || []
          this.total = pageInfo.total || 0

          if (Array.isArray(list)) {
            // 为每个订单添加customerDisplay字段（客户简称）
            this.orders = list.map(order => {
              // 通过客户代码查找客户简称
              const customer = this.customers.find(c => c.customerCode === order.customer)
              return {
                ...order,
                customerDisplay: customer ? customer.shortName : order.customer
              }
            })
            console.log('订单列表更新，共', this.orders.length, '条记录')
          } else {
            console.error('订单数据格式错误:', pageInfo)
            this.$message.error('订单数据格式错误')
          }
        } else {
          console.error('获取订单失败，响应码:', res ? res.code : 'undefined')
          this.$message.error('获取订单失败')
        }
      } catch (e) {
        console.error('获取订单异常:', e)
        this.$message.error('获取订单失败: ' + (e.message || '未知错误'))
      }
    },
    // 排序变更 - currently only sorts current page
    handleSortChange({ prop, order }) {
      this.sortProp = prop
      this.sortOrder = order
      // Local check
    },
    // 搜索
    handleSearch() {
      console.log('执行搜索，搜索条件:', this.searchForm)
      this.currentPage = 1
      this.fetchOrders()
    },
    // 重置搜索
    handleReset() {
      console.log('重置搜索')
      this.searchForm = {
        customer: '',
        orderNo: '',
        orderDateStart: '',
        orderDateEnd: ''
      }
      this.handleSearch()
    },
    handleSizeChange(val) {
      this.pageSize = val
      this.fetchOrders()
    },
    handleCurrentChange(val) {
      this.currentPage = val
      this.fetchOrders()
    },
    async viewDetail(row) {
      try {
        const res = await getOrderDetail(row.orderNo)
        if (res && res.code === 200) {
          this.currentOrder = res.data
          // 确保customerDisplay存在
          const customer = this.customers.find(c => c.customerCode === this.currentOrder.customer)
          this.$set(this.currentOrder, 'customerDisplay', customer ? customer.shortName : this.currentOrder.customer)
          this.detailVisible = true
        } else {
          this.$message.error('获取订单详情失败')
        }
      } catch (e) {
        console.error('获取订单详情异常:', e)
        this.$message.error('获取订单详情失败')
      }
    },
    openCreate() {
      this.isEditing = false
      this.editForm = this.emptyForm()
      // default orderDate to today (format yyyy-MM-dd) for new orders
      const d = new Date()
      const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      this.editForm.orderDate = today
      // reset customer order sync flag and ensure customerOrderNo follows orderNo
      this.customerOrderEdited = false
      this.editForm.customerOrderNo = this.editForm.orderNo
      this.editForm.deliveryAddress = ''
      this.editForm.items = [{ materialCode: '', materialName: '', length: '', lengthDisplay: '', width: '', thickness: '', thicknessDisplay: '', rolls: '', unitPrice: '', remark: '' }]
      this.editVisible = true
    },
    addItem() {
      this.editForm.items.push({ materialCode: '', materialName: '', length: '', lengthDisplay: '', width: '', thickness: '', thicknessDisplay: '', rolls: '', unitPrice: '', remark: '' })
    },
    removeItem(idx) {
      this.editForm.items.splice(idx, 1)
    },
    async openEdit(row) {
      try {
        // 编辑前先获取最新详情
        const res = await getOrderDetail(row.orderNo)
        if (!res || res.code !== 200) {
          this.$message.error('获取订单详情失败')
          return
        }

        const detailOrder = res.data
        this.isEditing = true
        this.editForm = JSON.parse(JSON.stringify(detailOrder))

        // ensure deliveryAddress and customerOrderNo exist
        this.editForm.deliveryAddress = this.editForm.deliveryAddress || ''
        this.editForm.customerOrderNo = this.editForm.customerOrderNo || this.editForm.orderNo
        // 根据customer字段(customerCode)找到对应的customerId
        if (this.editForm.customer) {
          const customer = this.customers.find(c => c.customerCode === this.editForm.customer)
          if (customer) {
            this.editForm.customerId = customer.id
          }
        }

        if (this.editForm.items) {
          this.editForm.items.forEach(item => {
            item.thicknessDisplay = item.thickness ? Math.round(item.thickness) : ''
            item.lengthDisplay = item.length ? Math.round(item.length) : ''
            // normalize numeric fields to strings so inputs show properly
            item.length = item.length != null ? item.length : ''
            item.width = item.width != null ? item.width : ''
            item.rolls = item.rolls != null ? item.rolls : ''
            item.unitPrice = item.unitPrice != null ? item.unitPrice : ''
          })
        } else {
          this.editForm.items = []
        }

        // determine if customerOrderNo was independently set
        this.customerOrderEdited = !!(this.editForm.customerOrderNo && this.editForm.customerOrderNo !== this.editForm.orderNo)
        this.editVisible = true
      } catch (e) {
        console.error('打开编辑异常:', e)
        this.$message.error('打开编辑失败')
      }
    },
    calcSqm(item) {
      return this.calcSqmNumber(item).toFixed(2)
    },
    calcSqmNumber(item) {
      // 处理两种情况：
      // 1. 编辑时：使用lengthDisplay（米），需要转换
      // 2. 显示/保存时：使用length（毫米）
      // 数据库存储：长度(m)、宽度(mm)
      const lengthM = Number(item.lengthDisplay || item.length) || 0
      const widthMm = Number(item.width) || 0
      const rolls = Number(item.rolls) || 0
      // 公式：长度(m) * 宽度(mm) * 卷数 / 1000 = 平方米
      return (lengthM * widthMm * rolls) / 1000
    },
    async saveOrder() {
      try {
        // prepare and validate items: skip fully empty rows, require fields for non-empty rows
        const raw = JSON.parse(JSON.stringify(this.editForm))
        const preparedItems = []
        for (let i = 0; i < (raw.items || []).length; i++) {
          const it = raw.items[i]
          // consider row empty if all main fields are empty/falsy
          const isEmptyRow = !it.materialCode && !it.materialName && !it.lengthDisplay && !it.width && !it.rolls && !it.unitPrice && !it.thicknessDisplay
          if (isEmptyRow) continue // skip entirely empty rows

          // validate required fields on non-empty rows
          const missing = []
          if (!it.materialCode) missing.push('产品编码')
          if (!it.materialName) missing.push('产品名称')
          if (!it.lengthDisplay) missing.push('长度')
          if (!it.width) missing.push('宽度')
          if (!it.rolls) missing.push('卷数')
          if (!it.unitPrice && it.unitPrice !== 0) missing.push('单价')
          if (missing.length) {
            this.$message.error(`第 ${i + 1} 行缺少必填项：${missing.join(', ')}`)
            return
          }

          // convert types
          const converted = {
            materialCode: String(it.materialCode),
            materialName: String(it.materialName),
            length: Number(it.lengthDisplay), // 米，直接存储
            width: Number(it.width), // 毫米
            rolls: Number(it.rolls),
            unitPrice: Number(it.unitPrice),
            remark: it.remark || ''
          }
          // 保留明细ID（如果存在），转换为数字类型
          if (it.id !== undefined && it.id !== null && it.id !== '') {
            converted.id = Number(it.id)
          }
          if (it.thicknessDisplay !== undefined && it.thicknessDisplay !== '') {
            converted.thickness = Number(it.thicknessDisplay) // 直接存储为μm
          } else {
            converted.thickness = 0
          }
          preparedItems.push(converted)
        }

        if (preparedItems.length === 0) {
          this.$message.error('请填写至少一行有效的物料明细后再提交')
          return
        }
        const payload = JSON.parse(JSON.stringify(this.editForm))
        payload.items = preparedItems
        // 调试：打印实际发送的数据
        console.log('=== 准备提交的payload ===')
        console.log('isEditing:', this.isEditing)
        console.log('payload.items:', JSON.stringify(payload.items, null, 2))
        // compute totals from items
        payload.totalArea = payload.items.reduce((sum, it) => sum + this.calcSqmNumber(it), 0)
        payload.totalAmount = payload.items.reduce((sum, it) => sum + (this.calcSqmNumber(it) * (it.unitPrice || 0)), 0) // round to 2 decimals
        payload.totalArea = Number(payload.totalArea.toFixed(2))
        payload.totalAmount = Number(payload.totalAmount.toFixed(2))

        if (this.isEditing) {
          const res = await updateOrder(payload)
          if (res && res.code === 200) {
            await this.fetchOrders()
            this.$message.success('更新成功')
            this.editVisible = false
          } else {
            this.$message.error('更新失败')
          }
        } else {
          const res = await createOrder(payload)
          if (res && res.code === 200) {
            // refresh from server to reflect authoritative data
            await this.fetchOrders()
            this.$message.success('创建成功')
            this.editVisible = false
            // go to first page to show newly created entry
            this.currentPage = 1
          } else {
            this.$message.error('创建失败')
          }
        }
      } catch (e) {
        this.$message.error('保存失败')
      }
    },
    confirmDelete(row) {
      // eslint-disable-next-line object-curly-spacing
      this.$confirm(`确认删除订单 ${row.orderNo} 吗？`, '提示', { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning'}).then(() => {
        this.doDeleteOrder(row)
      }).catch(() => {})
    }, async doDeleteOrder(row) {
      try {
        const res = await deleteOrder(row.orderNo)
        if (res && res.code === 200) {
          await this.fetchOrders()
          this.$message.success('删除成功')
          // adjust page if last item on last page was removed
          const maxPage = Math.max(1, Math.ceil(this.total / this.pageSize))
          if (this.currentPage > maxPage) this.currentPage = maxPage
        } else {
          this.$message.error('删除失败')
        }
      } catch (e) {
        this.$message.error('删除失败')
      }
    },
    calcAmount(item) {
      const price = Number(item.unitPrice) || 0
      return (this.calcSqmNumber(item) * price).toFixed(2)
    }, totalArea(order) {
      if (!order || !order.items) return '0.00'
      // 调试：打印明细数据
      console.log('totalArea - order.items:', order.items)
      // 优先使用数据库存储的 sqm，否则计算
      const sum = order.items.reduce((s, it) => {
        const sqm = it.sqm || this.calcSqmNumber(it)
        console.log('  item sqm:', sqm, 'current sum:', s)
        return s + sqm
      }, 0)
      console.log('totalArea result:', sum)
      return sum.toFixed(2)
    }, totalAmount(order) {
      if (!order || !order.items) return '0.00'
      // 调试：打印明细数据
      console.log('totalAmount - order.items:', order.items)
      // 优先使用数据库存储的 amount，否则计算
      const sum = order.items.reduce((s, it) => {
        const amt = it.amount || (this.calcSqmNumber(it) * (it.unitPrice || 0))
        console.log('  item amount:', amt, 'current sum:', s)
        return s + amt
      }, 0)
      console.log('totalAmount result:', sum)
      return sum.toFixed(2)
    },
    indexMethod(index) {
      return (this.currentPage - 1) * this.pageSize + index + 1
    },
    handleExportAll() {
      // confirm dialog before exporting? optional.
      // pass current search filters to export
      const params = {
        orderNo: this.searchForm.orderNo,
        customer: this.searchForm.customer,
        startDate: this.searchForm.orderDateStart,
        endDate: this.searchForm.orderDateEnd
      }
      exportOrders(params)
    },
    handleDownloadTemplate() {
      if (this.$canImportExport()) {
        downloadOrderTemplate()
      } else {
        this.$message.warning('权限不足')
      }
    },
    handleImportClick() {
      if (this.$canImportExport()) {
        this.$refs.importFile.click()
      } else {
        this.$message.warning('权限不足')
      }
    },
    async handleImportChange(e) {
      const file = e.target.files[0]
      if (!file) return
      // reset input
      e.target.value = ''

      const formData = new FormData()
      formData.append('file', file)

      try {
        const res = await importOrders(formData)
        if (res && res.code === 200) {
          this.$message.success('导入成功')
          this.fetchOrders()
        } else {
          this.$message.error('导入失败: ' + (res.message || '未知错误'))
        }
      } catch (e) {
        console.error('导入异常:', e)
        this.$message.error('导入失败')
      }
    },
    // Simple permission check placeholder
    $canImportExport() {
      // In a real app, check store user roles/permissions
      return true
    },
    // 打印相关方法
    async handlePrint(row) {
      try {
        // 获取订单完整详情
        const res = await getOrderDetail(row.orderNo)
        if (!res || res.code !== 200) {
          this.$message.error('获取订单详情失败')
          return
        }
        this.currentPrint = res.data
        this.printVisible = true
      } catch (e) {
        console.error('打开打印预览异常:', e)
        this.$message.error('打开打印预览失败')
      }
    },
    // 格式化规格显示: 厚度μm×宽度mm×长度m
    formatSpec(item) {
      const thickness = item.thickness ? Math.round(item.thickness) : 0 // μm
      const width = item.width ? Math.round(item.width) : 0 // mm
      const length = item.length ? Math.round(item.length) : 0 // m
      return `${thickness}μm×${width}mm×${length}m`
    },
    // 格式化数字显示（保留2位小数）
    formatNumber(value) {
      if (value == null || value === '') return '0.00'
      return Number(value).toFixed(2)
    },
    // 浏览器打印
    handlePrintBrowser() {
      const printContent = document.getElementById('printArea').innerHTML
      const iframe = document.createElement('iframe')
      iframe.setAttribute('style', 'position:absolute;width:0px;height:0px;left:-500px;top:-500px;')
      document.body.appendChild(iframe)

      const doc = iframe.contentWindow.document
      doc.write(`
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              * { box-sizing: border-box; }
              body { 
                font-family: "Microsoft YaHei", "SimSun", Arial, sans-serif; 
                padding: 15mm 20mm;
                margin: 0;
                background: white;
                color: black;
                font-size: 13px;
                line-height: 1.6;
              }
              
              .company-header {
                text-align: center;
                margin-bottom: 15px;
                border-bottom: 2px solid #000;
                padding-bottom: 10px;
              }
              
              .company-name {
                font-size: 20px;
                font-weight: bold;
                margin: 0 0 8px 0;
              }
              
              .company-info {
                font-size: 11px;
                line-height: 1.8;
              }
              
              .company-info p {
                margin: 2px 0;
              }
              
              .contract-title {
                text-align: center;
                font-size: 18px;
                font-weight: bold;
                margin: 15px 0 10px 0;
              }
              
              .contract-info {
                text-align: right;
                margin-bottom: 12px;
                font-size: 12px;
              }
              
              .basic-info p {
                margin: 6px 0;
                line-height: 1.8;
              }
              
              .section-title {
                font-size: 13px;
                font-weight: bold;
                margin: 12px 0 8px 0;
              }
              
              .items-table {
                width: 100%;
                border-collapse: collapse;
                margin: 8px 0 15px 0;
                font-size: 11px;
              }
              
              .items-table th,
              .items-table td {
                border: 1px solid #000;
                padding: 6px 4px;
                text-align: left;
              }
              
              .items-table th {
                background-color: #f0f0f0;
                font-weight: bold;
                text-align: center;
              }
              
              .items-table .empty-row td {
                height: 28px;
              }
              
              .items-table .total-row {
                background-color: #f5f5f5;
                font-weight: bold;
              }
              
              .contract-terms {
                margin: 15px 0;
                font-size: 12px;
              }
              
              .contract-terms p {
                margin: 6px 0;
                line-height: 1.8;
              }
              
              .signature-section {
                margin-top: 25px;
                display: flex;
                justify-content: space-between;
              }
              
              .signature-block {
                width: 48%;
              }
              
              .signature-block p {
                margin: 8px 0;
                line-height: 1.8;
              }
              
              .page-footer {
                text-align: center;
                margin-top: 20px;
                font-size: 11px;
                color: #666;
              }
              
              @media print {
                @page { 
                  size: A4;
                  margin: 10mm 15mm;
                }
                body { 
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                }
                .items-table th {
                  background-color: #f0f0f0 !important;
                }
                .items-table .total-row {
                  background-color: #f5f5f5 !important;
                }
              }
            </style>
          </head>
          <body>${printContent}</body>
        </html>
      `)
      doc.close()

      // 等待样式加载
      setTimeout(() => {
        iframe.contentWindow.focus()
        iframe.contentWindow.print()
        // 打印对话框关闭后移除iframe
        setTimeout(() => {
          document.body.removeChild(iframe)
        }, 1000)
      }, 300)
    }
  }
}
</script>

<style scoped>
.sales-orders {
  padding: 20px;
}
/* 搜索区域样式 */
.search-area {
  margin-bottom: 16px;
  padding: 12px 0;
  border-bottom: 1px solid #ebeef5;
}
/* smaller inputs inside table for compact entry */
.small-input ::v-deep .el-input__inner {
  font-size: 12px;
  padding: 3px 6px;
  height: 28px;
}
.el-table .small-input ::v-deep .el-input__inner {
  height: 26px;
}
/* reduce vertical space between form items */
.sales-orders .el-form-item {
  margin-bottom: 6px;
}
/* reduce table cell padding for compact rows */
.sales-orders .el-table .cell {
  padding: 6px 8px;
}
/* tighter dialog body padding */
.sales-orders .el-dialog__body {
  padding: 8px 12px;
}
/* hide native number input spinners as a fallback */
.small-input ::v-deep input[type=number]::-webkit-outer-spin-button,
.small-input ::v-deep input[type=number]::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.small-input ::v-deep input[type=number] {
  -moz-appearance: textfield;
  appearance: textfield;
}

/* pagination fixed to bottom */
.orders-pagination-wrapper {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 12px;
  display: flex;
  justify-content: center;
  z-index: 999;
  background: transparent;
  padding: 4px 8px;
}

/* add spacing at bottom of page content so fixed pagination doesn't overlap table rows */
.sales-orders .el-card {
  padding-bottom: 70px; /* space for fixed pagination */
}

/* 打印样式 */
.print-content {
  padding: 20px;
  font-family: 'Microsoft YaHei', Arial, sans-serif;
  font-size: 13px;
  line-height: 1.6;
  color: #000;
}

.company-header {
  text-align: center;
  margin-bottom: 20px;
  border-bottom: 2px solid #000;
  padding-bottom: 10px;
}

.company-name {
  font-size: 24px;
  font-weight: bold;
  margin: 0 0 10px 0;
  color: #000;
}

.company-info {
  font-size: 12px;
  line-height: 1.8;
}

.company-info p {
  margin: 3px 0;
}

.contract-title {
  text-align: center;
  font-size: 22px;
  font-weight: bold;
  margin: 20px 0;
}

.contract-info {
  text-align: right;
  margin-bottom: 15px;
  font-size: 13px;
}

.basic-info p {
  margin: 8px 0;
  line-height: 1.8;
}

.section-title {
  font-size: 14px;
  font-weight: bold;
  margin: 15px 0 10px 0;
}

.items-table {
  width: 100%;
  border-collapse: collapse;
  margin: 10px 0;
  font-size: 12px;
}

.items-table th,
.items-table td {
  border: 1px solid #000;
  padding: 8px 5px;
  text-align: left;
}

.items-table th {
  background-color: #f0f0f0;
  font-weight: bold;
  text-align: center;
}

.items-table .empty-row td {
  height: 32px;
}

.items-table .total-row {
  background-color: #f5f5f5;
  font-weight: bold;
}

.contract-terms {
  margin: 20px 0;
  font-size: 13px;
}

.contract-terms p {
  margin: 8px 0;
  line-height: 1.8;
}

.signature-section {
  margin-top: 30px;
  display: flex;
  justify-content: space-between;
}

.signature-block {
  width: 48%;
}

.signature-block p {
  margin: 10px 0;
  line-height: 2;
}

.page-footer {
  text-align: center;
  margin-top: 30px;
  font-size: 12px;
  color: #666;
}
</style>
