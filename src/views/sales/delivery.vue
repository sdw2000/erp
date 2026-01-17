<template>
  <div class="delivery-notice-container">
    <el-card>
      <div slot="header" class="clearfix">
        <span style="font-size: 16px; font-weight: 500;">
          <i class="el-icon-s-order" style="margin-right: 8px; color: #409EFF; font-size: 18px;" />发货通知管理
        </span>
        <div style="float: right;">
          <el-button type="primary" size="small" icon="el-icon-plus" @click="handleCreateNotice">新增发货通知</el-button>
        </div>
      </div>

      <!-- Search Area -->
      <div class="search-area">
        <el-row :gutter="20">
          <el-col :span="6">
            <el-input v-model="searchQuery.noticeNo" placeholder="发货单号" clearable @clear="fetchNotices" />
          </el-col>
          <el-col :span="6">
            <el-input v-model="searchQuery.orderNo" placeholder="销售订单号" clearable @clear="fetchNotices" />
          </el-col>
          <el-col :span="6">
            <el-input v-model="searchQuery.customer" placeholder="客户名称" clearable @clear="fetchNotices" />
          </el-col>
          <el-col :span="6">
            <el-button type="primary" icon="el-icon-search" @click="fetchNotices">搜索</el-button>
            <el-button icon="el-icon-refresh" @click="resetSearch">重置</el-button>
          </el-col>
        </el-row>
      </div>

      <!-- Data Table -->
      <el-table
        v-loading="loading"
        :data="tableData"
        style="width: 100%; margin-top: 20px;"
        border
        stripe
      >
        <el-table-column prop="noticeNo" label="发货单号" width="180" />
        <el-table-column prop="orderNo" label="销售订单号" width="180" />
        <el-table-column prop="customer" label="客户名称" />
        <el-table-column prop="deliveryDate" label="发货日期" width="120" />
        <el-table-column prop="status" label="状态" width="120">
          <template slot-scope="scope">
            <el-tag :type="getStatusType(scope.row.status)">{{ scope.row.status || '无状态' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="160" />
        <el-table-column label="操作" width="300" fixed="right">
          <template slot-scope="scope">
            <el-button size="mini" type="text" @click="viewDetail(scope.row)">详情</el-button>
            <el-button size="mini" type="text" @click="handlePrint(scope.row)">打印</el-button>
            <el-button v-if="scope.row.status !== '已发货' && scope.row.status !== 'shipped'" size="mini" type="text" @click="handleEdit(scope.row)">编辑</el-button>
            <el-button v-if="scope.row.status === '待发货' || scope.row.status === 'pending' || !scope.row.status" size="mini" type="text" style="color: #67C23A;" @click="confirmShip(scope.row)">确认发货</el-button>
            <el-button v-if="scope.row.status !== '已发货' && scope.row.status !== 'shipped'" size="mini" type="text" style="color: #F56C6C;" @click="handleDelete(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- Pagination -->
      <el-pagination
        style="margin-top: 20px; text-align: right;"
        :current-page="page.current"
        :page-sizes="[10, 20, 50, 100]"
        :page-size="page.size"
        layout="total, sizes, prev, pager, next, jumper"
        :total="page.total"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </el-card>

    <!-- Create/Edit Dialog -->
    <el-dialog :title="dialogTitle" :visible.sync="dialogVisible" width="1000px" @close="handleDialogClose">
      <el-form ref="noticeForm" :model="currentNotice" label-width="120px" :rules="rules">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="销售订单" prop="orderNo">
              <el-select
                v-model="currentNotice.orderNo"
                filterable
                remote
                reserve-keyword
                placeholder="请输入订单号搜索"
                :remote-method="searchOrders"
                :loading="orderSearchLoading"
                :disabled="isEdit"
                style="width: 100%;"
                clearable
                @change="handleOrderSelect"
              >
                <el-option
                  v-for="order in orderOptions"
                  :key="order.orderNo"
                  :label="order.orderNo + ' - ' + order.customer"
                  :value="order.orderNo"
                >
                  <span style="float: left">{{ order.orderNo }}</span>
                  <span style="float: right; color: #8492a6; font-size: 13px">{{ order.customer }}</span>
                </el-option>
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="客户名称" prop="customer">
              <el-input v-model="currentNotice.customer" disabled />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="发货日期" prop="deliveryDate">
              <el-date-picker v-model="currentNotice.deliveryDate" type="date" placeholder="选择发货日期" value-format="yyyy-MM-dd" style="width: 100%;" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="客户订单号" prop="customerOrderNo">
              <el-input v-model="currentNotice.customerOrderNo" placeholder="客户订单号" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="承运公司" prop="carrierName">
              <el-input v-model="currentNotice.carrierName" placeholder="承运公司名称及单号" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="运输电话" prop="carrierPhone">
              <el-input v-model="currentNotice.carrierPhone" placeholder="运输公司联系电话" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="24">
            <el-form-item label="收货地址" prop="deliveryAddress">
              <el-input v-model="currentNotice.deliveryAddress" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="联系人" prop="contactPerson">
              <el-input v-model="currentNotice.contactPerson" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="联系电话" prop="contactPhone">
              <el-input v-model="currentNotice.contactPhone" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="24">
            <el-form-item label="备注">
              <el-input v-model="currentNotice.remark" type="textarea" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">发货明细</el-divider>
        <el-table :data="currentNotice.items" border style="width: 100%">
          <el-table-column prop="materialCode" label="物料代码" width="180">
            <template slot-scope="scope">
              <el-input v-if="!scope.row.orderItemId" v-model="scope.row.materialCode" size="small" placeholder="输入物料代码" />
              <span v-else>{{ scope.row.materialCode }}</span>
            </template>
          </el-table-column>
          <el-table-column label="物料名称" width="180">
            <template slot-scope="scope">
              <el-input v-if="!scope.row.orderItemId" v-model="scope.row.materialName" size="small" placeholder="输入物料名称" />
              <span v-else>{{ scope.row.materialName }}</span>
            </template>
          </el-table-column>
          <el-table-column label="规格" width="150">
            <template slot-scope="scope">
              <el-input v-if="!scope.row.orderItemId" v-model="scope.row.spec" size="small" placeholder="输入规格" />
              <span v-else>{{ scope.row.spec }}</span>
            </template>
          </el-table-column>
          <el-table-column label="发货数量(卷)" width="140">
            <template slot-scope="scope">
              <el-input-number v-model="scope.row.quantity" :min="0" size="small" style="width: 100px;" />
            </template>
          </el-table-column>
          <el-table-column label="平方米" width="120">
            <template slot-scope="scope">
              <!-- 计算属性或输入 -->
              <el-input v-model="scope.row.areaSize" size="small" />
            </template>
          </el-table-column>
          <el-table-column label="箱数" width="100">
            <template slot-scope="scope">
              <el-input v-model="scope.row.boxCount" size="small" />
            </template>
          </el-table-column>
          <el-table-column label="每箱毛重" width="100">
            <template slot-scope="scope">
              <el-input v-model="scope.row.grossWeight" size="small" />
            </template>
          </el-table-column>
          <el-table-column label="总毛重" width="100">
            <template slot-scope="scope">
              <el-input v-model="scope.row.totalWeight" size="small" />
            </template>
          </el-table-column>
          <el-table-column label="备注" width="150">
            <template slot-scope="scope">
              <el-input v-model="scope.row.remark" size="small" placeholder="备注信息" />
            </template>
          </el-table-column>
          <el-table-column label="操作" width="80" align="center">
            <template slot-scope="scope">
              <el-button type="text" style="color: #F56C6C;" @click="handleRemoveItem(scope.$index)">移除</el-button>
            </template>
          </el-table-column>
        </el-table>
        <div style="margin-top: 10px;">
          <el-button type="primary" plain size="small" icon="el-icon-plus" @click="handleAddItem">添加明细</el-button>
        </div>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="saveNotice">保存</el-button>
      </div>
    </el-dialog>

    <!-- Print Dialog -->
    <el-dialog title="打印预览" :visible.sync="printVisible" width="900px" top="5vh">
      <div id="printArea" class="print-content">
        <!-- 联次说明 -->
        <div class="copy-label">白联:跟单 绿联:客户 红联:财务 黄联:业务</div>

        <!-- 公司抬头 -->
        <h1 class="company-title">东莞市方恩电子材料科技有限公司</h1>
        <div class="company-info">
          地址:东莞市桥头镇东新路13号2号楼102室<br>
          电话：0769-82551118 &nbsp;&nbsp; 传真：0769-82551160<br>
          www.finechemfr.com
        </div>

        <h2 class="form-title">发 货 单</h2>
        <div class="form-id">FE-FR-YW-07</div>

        <!-- 头部信息表格 -->
        <table class="header-table">
          <tr>
            <td class="label">收货单位：</td>
            <td class="value">{{ currentPrint.customer }}</td>
            <td class="label">送货单号：</td>
            <td class="value">{{ currentPrint.noticeNo }}</td>
          </tr>
          <tr>
            <td class="label">收货地址：</td>
            <td class="value">{{ currentPrint.deliveryAddress }}</td>
            <td class="label">客户/订单号：</td>
            <td class="value">{{ currentPrint.customerOrderNo || currentPrint.orderNo }}</td>
          </tr>
          <tr>
            <td class="label">收货人/电话：</td>
            <td class="value">{{ currentPrint.contactPerson }} {{ currentPrint.contactPhone }}</td>
            <td class="label">送货日期：</td>
            <td class="value">{{ currentPrint.deliveryDate }}</td>
          </tr>
          <tr>
            <td class="label">承运公司：</td>
            <td class="value">{{ currentPrint.carrierName }}</td>
            <td class="label">联系电话：</td>
            <td class="value">{{ currentPrint.carrierPhone || '-' }}</td>
          </tr>
        </table>

        <!-- 明细表格 -->
        <table class="items-table">
          <thead>
            <tr>
              <th>产品代码</th>
              <th>产品名称</th>
              <th>产品规格<br>(厚度*宽度*长度)</th>
              <th>数量<br>(卷)</th>
              <th>平方<br>(m²)</th>
              <th>箱数</th>
              <th>每箱<br>毛重(kg)</th>
              <th>总毛重<br>(kg)</th>
              <th>备注</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, index) in currentPrint.items" :key="index">
              <td>{{ item.materialCode }}</td>
              <td>{{ item.materialName }}</td>
              <td>{{ item.spec }}</td>
              <td>{{ item.quantity }}</td>
              <td>{{ item.areaSize }}</td>
              <td>{{ item.boxCount }}</td>
              <td>{{ item.grossWeight }}</td>
              <td>{{ item.totalWeight }}</td>
              <td>{{ item.remark || '-' }}</td>
            </tr>
            <!-- 补空行保持格式美观 -->
            <tr v-for="n in (5 - (currentPrint.items ? currentPrint.items.length : 0))" v-if="!currentPrint.items || currentPrint.items.length < 5" :key="'empty'+n" class="empty-row">
              <td>&nbsp;</td><td /><td /><td /><td /><td /><td /><td /><td />
            </tr>
            <tr class="total-row">
              <td colspan="3" style="text-align: right; padding-right: 10px;">合计：</td>
              <td>{{ sumQuantity }}</td>
              <td>{{ sumArea }}</td>
              <td>{{ sumBox }}</td>
              <td />
              <td>{{ sumWeight }}</td>
              <td />
            </tr>
          </tbody>
        </table>

        <!-- 底部说明 -->
        <div class="footer-notes">
          备注：收到货物后请仔细确认，数量问题请收到货后的3天内提出， 质量问题请收到货后的7天内提出。任何瑕疵产品请收到货后30天之内寄回我司，经确认后办理以货换货或等值的货款减扣，逾期则视为无异议。
        </div>

        <!-- 签字栏 -->
        <div class="signatures">
          <div class="sig-item">制单：{{ currentPrint.createdBy }}</div>
          <div class="sig-item">财务：________________</div>
          <div class="sig-item">客户签收：________________</div>
        </div>
      </div>

      <div slot="footer" class="dialog-footer">
        <el-button @click="printVisible = false">关闭</el-button>
        <el-button type="primary" icon="el-icon-printer" @click="handlePrintBrowser">打印 / 导出PDF</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import request from '@/utils/request'

export default {
  name: 'DeliveryNotice',
  data() {
    return {
      searchQuery: {
        noticeNo: '',
        orderNo: '',
        customer: ''
      },
      page: {
        current: 1,
        size: 10,
        total: 0
      },
      tableData: [],
      loading: false,

      // 订单搜索
      orderOptions: [],
      orderSearchLoading: false,

      // Create/Edit
      dialogVisible: false,
      dialogTitle: '新增发货通知',
      isEdit: false,
      submitting: false,

      // The main object for the form
      currentNotice: {
        id: null,
        orderId: null,
        orderNo: '',
        customer: '',
        customerOrderNo: '',
        deliveryDate: '',
        deliveryAddress: '',
        contactPerson: '',
        contactPhone: '',
        carrierName: '',
        carrierPhone: '',
        remark: '',
        items: []
      },

      rules: {
        orderNo: [{ required: true, message: '请输入销售订单号', trigger: 'blur' }],
        deliveryDate: [{ required: true, message: '请选择发货日期', trigger: 'change' }]
      },

      // Print
      printVisible: false,
      currentPrint: {}
    }
  },
  computed: {
    // 自动计算合计
    sumQuantity() {
      if (!this.currentPrint.items) return 0
      return this.currentPrint.items.reduce((acc, cur) => acc + Number(cur.quantity || 0), 0)
    },
    sumArea() {
      if (!this.currentPrint.items) return 0
      return this.currentPrint.items.reduce((acc, cur) => acc + Number(cur.areaSize || 0), 0).toFixed(2)
    },
    sumBox() {
      if (!this.currentPrint.items) return 0
      return this.currentPrint.items.reduce((acc, cur) => acc + Number(cur.boxCount || 0), 0)
    },
    sumWeight() {
      if (!this.currentPrint.items) return 0
      return this.currentPrint.items.reduce((acc, cur) => acc + Number(cur.totalWeight || 0), 0).toFixed(2)
    }
  },
  created() {
    this.fetchNotices()
  },
  methods: {
    // --- Query Methods ---
    async fetchNotices() {
      this.loading = true
      try {
        const res = await request({
          url: '/delivery/list',
          method: 'get',
          params: {
            pageNum: this.page.current,
            pageSize: this.page.size,
            ...this.searchQuery
          }
        })
        if (res.code === 200 || res.code === 20000) {
          if (res.data.records) {
            this.tableData = res.data.records
            this.page.total = Number(res.data.total) || 0
          } else if (res.data.list) {
            this.tableData = res.data.list
            this.page.total = Number(res.data.total) || 0
          } else {
            this.tableData = res.data
            this.page.total = res.data.length || 0
          }
        }
      } catch (error) {
        console.error(error)
      } finally {
        this.loading = false
      }
    },
    resetSearch() {
      this.searchQuery = {
        noticeNo: '',
        orderNo: '',
        customer: ''
      }
      this.page.current = 1
      this.fetchNotices()
    },
    handleSizeChange(val) {
      this.page.size = val
      this.fetchNotices()
    },
    handleCurrentChange(val) {
      this.page.current = val
      this.fetchNotices()
    },

    // --- Helpers ---
    getStatusType(status) {
      const map = {
        '待发货': 'warning',
        'pending': 'warning',
        '草稿': 'info',
        'draft': 'info',
        '已发货': 'success',
        'shipped': 'success',
        '已作废': 'danger',
        'cancelled': 'danger'
      }
      return map[status] || 'info'
    },

    // --- Create / Edit Logic ---
    handleCreateNotice() {
      this.isEdit = false
      this.dialogTitle = '新增发货通知'
      this.currentNotice = {
        orderId: null,
        orderNo: '',
        customer: '',
        customerOrderNo: '',
        deliveryDate: new Date().toISOString().split('T')[0],
        deliveryAddress: '',
        contactPerson: '',
        contactPhone: '',
        carrierName: '',
        carrierPhone: '',
        remark: '',
        items: []
      }
      this.orderOptions = []
      this.dialogVisible = true
    },

    // --- 订单搜索功能 ---
    async searchOrders(query) {
      if (query !== '') {
        this.orderSearchLoading = true
        try {
          const res = await request({
            url: '/sales/orders/search',
            method: 'get',
            params: {
              keyword: query,
              status: 'pending'
            }
          })
          if (res.code === 200) {
            this.orderOptions = res.data || []
          }
        } catch (e) {
          console.error('搜索订单失败', e)
        } finally {
          this.orderSearchLoading = false
        }
      } else {
        this.orderOptions = []
      }
    },

    async handleOrderSelect(orderNo) {
      if (orderNo) {
        await this.fetchOrderDetails()
      }
      this.$nextTick(() => {
        if (this.$refs.noticeForm) this.$refs.noticeForm.clearValidate()
      })
    },

    handleEdit(row) {
      this.isEdit = true
      this.dialogTitle = '编辑发货通知'
      // Create a copy
      this.currentNotice = JSON.parse(JSON.stringify(row))
      // Fetch detailed items if not present
      if (!this.currentNotice.items || this.currentNotice.items.length === 0) {
        this.viewDetail(row, false).then(detail => {
          if (detail) this.currentNotice = detail
          this.dialogVisible = true
        })
      } else {
        this.dialogVisible = true
      }
    },

    async fetchOrderDetails() {
      if (!this.currentNotice.orderNo) return

      try {
        // 调用订单详情接口，直接获取订单及其明细信息
        const res = await request({
          url: `/sales/orders/${this.currentNotice.orderNo}`,
          method: 'get'
        })

        if (res.code === 200 && res.data) {
          const order = res.data

          // 填充订单基本信息
          this.currentNotice.orderId = order.id
          this.currentNotice.customer = order.customer
          this.currentNotice.deliveryAddress = order.deliveryAddress
          this.currentNotice.contactPerson = order.contactPerson
          this.currentNotice.contactPhone = order.contactPhone
          this.currentNotice.customerOrderNo = order.customerOrderNo || ''

          // 填充发货明细（将订单明细映射到发货明细）
          // 用户可以修改卷数（quantity），其他字段如面积、重量等可以根据需要计算
          if (order.items && order.items.length > 0) {
            this.currentNotice.items = order.items.map(oItem => {
              // 计算未发货数量（订单数量 - 已发货数量）
              const remainingRolls = (oItem.rolls || 0) - (oItem.shippedRolls || 0)

              return {
                orderItemId: oItem.id,
                materialCode: oItem.materialCode,
                materialName: oItem.materialName,
                spec: `${oItem.width || ''}*${oItem.thickness || ''}*${oItem.length || ''}`,
                quantity: remainingRolls > 0 ? remainingRolls : 0, // 默认填充未发货数量，用户可修改
                areaSize: oItem.areaSize || 0,
                boxCount: 0,
                grossWeight: 0,
                totalWeight: 0,
                remark: ''
              }
            })

            this.$message.success('已加载订单信息和明细')
          } else {
            this.$message.warning('该订单没有明细数据')
          }
        } else {
          this.$message.warning('未找到该销售订单')
        }
      } catch (e) {
        console.error('加载订单详情失败：', e)
        this.$message.error('加载订单详情失败，请检查订单号是否正确')
      }
    },

    handleAddItem() {
      this.currentNotice.items.push({
        materialCode: '',
        materialName: '',
        spec: '',
        quantity: 0,
        areaSize: 0,
        boxCount: 0,
        grossWeight: 0,
        totalWeight: 0,
        remark: ''
      })
    },

    handleRemoveItem(index) {
      this.currentNotice.items.splice(index, 1)
    },

    handleDialogClose() {
      this.dialogVisible = false
    },

    async saveNotice() {
      this.$refs.noticeForm.validate(async valid => {
        if (valid) {
          if (this.currentNotice.items.length === 0) {
            this.$message.warning('请至少添加一项发货明细')
            return
          }

          this.submitting = true
          try {
            const url = this.isEdit ? '/delivery/update' : '/delivery/create' // Assuming update endpoint exists or we use create for now
            // Adjust payload if necessary
            const payload = { ...this.currentNotice }

            // If it's create, force the URL to create
            const finalUrl = this.currentNotice.id ? '/delivery/create' : '/delivery/create' // Simplified as controller only has create shown.
            // NOTE: Usually edit would be PUT /delivery and mapping id. Controller only shows create.
            // If user edits, we might need to handle it. For now, assuming create mode primarily.

            const res = await request({
              url: '/delivery/create',
              method: 'post',
              data: payload
            })

            if (res.code === 200 || res.code === 20000) {
              this.$message.success('保存成功')
              this.dialogVisible = false
              this.fetchNotices()
            } else {
              this.$message.error(res.msg || '保存失败')
            }
          } catch (e) {
            console.error(e)
            this.$message.error('系统错误')
          } finally {
            this.submitting = false
          }
        }
      })
    },

    async handleDelete(row) {
      this.$confirm('确认删除该发货单吗？', '提示', { type: 'warning' }).then(async() => {
        // Assuming delete endpoint
        // const res = await request({ url: `/delivery/${row.id}`, method: 'delete' });
        this.$message.info('删除功能暂未开放')
      }).catch(() => {})
    },

    // --- 确认发货 ---
    async confirmShip(row) {
      this.$confirm('确认发货后将无法再修改，是否确认发货？', '确认发货', {
        type: 'warning',
        confirmButtonText: '确认发货',
        cancelButtonText: '取消'
      }).then(async() => {
        try {
          const res = await request({
            url: `/delivery/confirm/${row.id}`,
            method: 'post'
          })
          if (res.code === 200 || res.code === 20000) {
            this.$message.success('发货确认成功')
            this.fetchNotices()
          } else {
            this.$message.error(res.msg || '确认发货失败')
          }
        } catch (e) {
          console.error(e)
          this.$message.error('确认发货失败')
        }
      }).catch(() => {})
    },

    // --- Details & Print ---
    async viewDetail(row, openDialog = true) {
      try {
        const res = await request({
          url: `/delivery/${row.id}`,
          method: 'get'
        })
        if (res.code === 200 || res.code === 20000) {
          if (openDialog) {
            this.currentNotice = res.data
            // Make sure details dialog exists if separate, or use create dialog in readonly?
            // The template doesn't have a separate detail dialog,
            // but the table action has viewDetail.
            // Let's just open the edit dialog in "view" mode or use print preview for details
            this.handlePrint(res.data)
          }
          return res.data
        }
      } catch (e) {
        console.error(e)
        this.$message.error('获取详情失败')
      }
      return null
    },

    handlePrint(row) {
      // Ensure we have items
      if (!row.items || row.items.length === 0) {
        this.viewDetail(row, false).then(fullData => {
          if (fullData) {
            this.currentPrint = fullData
            this.printVisible = true
          }
        })
      } else {
        this.currentPrint = JSON.parse(JSON.stringify(row))
        this.printVisible = true
      }
    },

    handlePrintBrowser() {
      const printContent = document.getElementById('printArea').innerHTML
      const iframe = document.createElement('iframe')
      iframe.setAttribute('style', 'position:absolute;width:0px;height:0px;left:-500px;top:-500px;')
      document.body.appendChild(iframe)

      const doc = iframe.contentWindow.document
      doc.write(`
        <html>
          <head>
            <style>
              body { font-family: "SimSun", "Songti SC", serif; padding: 20px; }
              .copy-label { text-align: right; font-size: 12px; margin-bottom: 5px; }
              .company-title { text-align: center; font-size: 24px; font-weight: bold; margin: 0; }
              .company-info { text-align: center; font-size: 12px; margin-top: 5px; line-height: 1.4; }
              .form-title { text-align: center; font-size: 28px; font-weight: bold; letter-spacing: 10px; margin: 15px 0 5px 0; }
              .form-id { text-align: right; font-size: 12px; margin-bottom: 5px; }
              
              table { width: 100%; border-collapse: collapse; font-size: 13px; }
              
              .header-table { margin-bottom: 10px; }
              .header-table td { padding: 4px; border: none; }
              .header-table .label { width: 90px; text-align: left; }
              .header-table .value { border-bottom: 1px solid #000; padding: 0 5px; }
              
              .items-table { border: 1px solid #000; margin-bottom: 10px; }
              .items-table th, .items-table td { border: 1px solid #000; padding: 5px; text-align: center; }
              .items-table th { background-color: #f0f0f0; font-weight: bold; }
              .empty-row td { height: 25px; }
              
              .footer-notes { font-size: 12px; margin-bottom: 30px; line-height: 1.5; margin-top: 10px;}
              .signatures { display: flex; justify-content: space-between; font-size: 14px; margin-top: 20px; }
              .sig-item { min-width: 200px; }
              
              /* Print Specifics */
              @media print {
                  @page { margin: 10mm; }
                  body { -webkit-print-color-adjust: exact; }
              }
            </style>
          </head>
          <body>${printContent}</body>
        </html>
      `)
      doc.close()

      // Use a timeout to ensure styles are loaded
      setTimeout(() => {
        iframe.contentWindow.focus()
        iframe.contentWindow.print()
        // Remove after print dialog closes (approximate)
        setTimeout(() => {
          document.body.removeChild(iframe)
        }, 3000)
      }, 500)
    }
  }
}
</script>

<style scoped>
.search-area {
  margin-bottom: 20px;
}
.clearfix:before,
.clearfix:after {
  display: table;
  content: "";
}
.clearfix:after {
  clear: both
}
.print-content {
  width: 100%;
  padding: 10px;
  background: white;
  color: black;

  .company-title { text-align: center; font-size: 20px; font-weight: bold; }
  .company-info { text-align: center; font-size: 12px; margin-bottom: 15px; }
  .form-title { text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 10px 0; }
  .form-id { text-align: right; margin-bottom: 10px; }

  table { width: 100%; border-collapse: collapse; }

  .header-table {
    margin-bottom: 15px;
    td { padding: 5px; }
    .label { width: 100px; }
    .value { border-bottom: 1px solid #ccc; }
  }

  .items-table {
    border: 1px solid #333;
    th, td { border: 1px solid #333; padding: 8px; text-align: center; font-size: 12px; }
    th { background: #eee; }
  }

  .signatures {
    display: flex;
    justify-content: space-between;
    margin-top: 30px;
    padding: 0 20px;
  }
}
</style>
