<template>
  <div class="sales-samples">
    <el-card>
      <div slot="header" class="clearfix">
        <span>送样管理</span>
        <el-button type="primary" style="float:right" @click="openCreate">新建送样</el-button>
      </div>

      <!-- 搜索栏 -->
      <div class="filter-container" style="margin-bottom: 20px;">
        <el-input
          v-model="queryParams.customerName"
          placeholder="客户名称"
          style="width: 200px; margin-right: 10px;"
          clearable
          @clear="fetchSamples"
        />
        <el-select
          v-model="queryParams.status"
          placeholder="状态筛选"
          style="width: 150px; margin-right: 10px;"
          clearable
          @clear="fetchSamples"
        >
          <el-option label="待发货" value="待发货" />
          <el-option label="已发货" value="已发货" />
          <el-option label="运输中" value="运输中" />
          <el-option label="已签收" value="已签收" />
          <el-option label="已拒收" value="已拒收" />
          <el-option label="已取消" value="已取消" />
        </el-select>
        <el-input
          v-model="queryParams.trackingNumber"
          placeholder="快递单号"
          style="width: 200px; margin-right: 10px;"
          clearable
          @clear="fetchSamples"
        />
        <el-button type="primary" icon="el-icon-search" @click="fetchSamples">搜索</el-button>
        <el-button icon="el-icon-refresh" @click="resetQuery">重置</el-button>
      </div>      <el-table v-loading="loading" :data="samples" style="width:100%" stripe>
        <el-table-column type="index" label="序号" width="60" align="center" />
        <el-table-column prop="sampleNo" label="送样编号" width="140" />
        <el-table-column prop="customerName" label="客户名称" width="180" />
        <el-table-column prop="contactName" label="联系人" width="100" />
        <el-table-column prop="contactPhone" label="联系电话" width="120" />
        <el-table-column prop="trackingNumber" label="快递单号" width="140">
          <template slot-scope="scope">
            <el-link v-if="scope.row.trackingNumber" type="primary" @click="viewLogistics(scope.row)">
              {{ scope.row.trackingNumber }}
            </el-link>
            <span v-else style="color: #ccc;">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template slot-scope="scope">
            <el-tag :type="getStatusType(scope.row.status)" size="small">
              {{ scope.row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="sendDate" label="送样日期" width="110" />
        <el-table-column label="操作" width="280" fixed="right">
          <template slot-scope="scope">
            <el-button size="mini" @click="viewDetail(scope.row)">详情</el-button>
            <el-button size="mini" type="primary" @click="openEdit(scope.row)">编辑</el-button>
            <el-button size="mini" type="warning" @click="openLogistics(scope.row)">物流</el-button>
            <el-button size="mini" type="danger" @click="confirmDelete(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div style="margin-top: 20px; text-align: right;">
        <el-pagination
          :current-page="pagination.current"
          :page-size="pagination.size"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 详情对话框 -->
    <el-dialog title="送样详情" :visible.sync="detailVisible" width="1200px">
      <div v-if="currentSample">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="送样编号">{{ currentSample.sampleNo }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusType(currentSample.status)">{{ currentSample.status }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="客户名称">{{ currentSample.customerName }}</el-descriptions-item>
          <el-descriptions-item label="送样日期">{{ currentSample.sendDate }}</el-descriptions-item>
          <el-descriptions-item label="联系人">{{ currentSample.contactName }}</el-descriptions-item>
          <el-descriptions-item label="联系电话">{{ currentSample.contactPhone }}</el-descriptions-item>
          <el-descriptions-item label="收货地址" :span="2">{{ currentSample.contactAddress }}</el-descriptions-item>
          <el-descriptions-item label="快递公司">{{ currentSample.expressCompany || '-' }}</el-descriptions-item>
          <el-descriptions-item label="快递单号">
            <el-link v-if="currentSample.trackingNumber" type="primary" @click="viewLogistics(currentSample)">
              {{ currentSample.trackingNumber }}
            </el-link>
            <span v-else>-</span>
          </el-descriptions-item>
          <el-descriptions-item label="发货日期">{{ currentSample.shipDate || '-' }}</el-descriptions-item>
          <el-descriptions-item label="送达日期">{{ currentSample.deliveryDate || '-' }}</el-descriptions-item>
          <el-descriptions-item label="备注" :span="2">{{ currentSample.remark || '-' }}</el-descriptions-item>
        </el-descriptions>        <h4 style="margin-top: 20px;">样品明细</h4>
        <el-table :data="currentSample.items" border style="width:100%">
          <el-table-column type="index" label="序号" width="60" align="center" />
          <el-table-column prop="materialCode" label="物料代码" width="120" />
          <el-table-column prop="materialName" label="物料名称" width="180" />
          <el-table-column prop="model" label="型号" width="120" />
          <el-table-column prop="specification" label="规格" width="150" />
          <el-table-column prop="batchNo" label="批次号" width="120" />
          <el-table-column prop="quantity" label="数量" width="80" />
          <el-table-column prop="unit" label="单位" width="60" />
          <el-table-column prop="remark" label="备注" min-width="150" />
        </el-table>
      </div>
      <span slot="footer">
        <el-button @click="detailVisible = false">关闭</el-button>
      </span>
    </el-dialog>

    <!-- 编辑/新增对话框 -->
    <el-dialog :title="isEditing ? '编辑送样' : '新建送样'" :visible.sync="editVisible" width="1200px">
      <el-form ref="editForm" :model="editForm" label-width="100px" :rules="rules">
        <!-- 基本信息 -->
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="客户" prop="customerName">
              <el-select
                v-model="editForm.customerId"
                filterable
                placeholder="选择客户"
                style="width: 100%"
                @change="onCustomerChange"
              >
                <el-option
                  v-for="customer in customers"
                  :key="customer.id"
                  :label="customer.name"
                  :value="customer.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="送样编号">
              <el-input v-model="editForm.sampleNo" :disabled="true" placeholder="自动生成" />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 联系人信息 -->
        <el-row :gutter="12">
          <el-col :span="8">
            <el-form-item label="联系人" prop="contactName">
              <el-input v-model="editForm.contactName" placeholder="请输入联系人" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="联系电话" prop="contactPhone">
              <el-input v-model="editForm.contactPhone" placeholder="请输入电话" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="送样日期" prop="sendDate">
              <el-date-picker
                v-model="editForm.sendDate"
                type="date"
                placeholder="选择日期"
                value-format="yyyy-MM-dd"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="12">
          <el-col :span="24">
            <el-form-item label="收货地址" prop="contactAddress">
              <el-input v-model="editForm.contactAddress" placeholder="请输入收货地址" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="备注">
              <el-input v-model="editForm.remark" type="textarea" :rows="2" placeholder="备注信息" />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 样品明细 -->
        <div style="border-top: 1px solid #eee; margin-top: 20px; padding-top: 20px;">
          <div style="margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
            <h4 style="margin: 0;">样品明细</h4>
            <el-button type="primary" size="small" @click="addItem">新增明细</el-button>
          </div>

          <el-table :data="editForm.items" border style="width:100%">
            <el-table-column label="物料代码" width="120">
              <template slot-scope="scope">
                <el-input v-model="scope.row.materialCode" size="small" placeholder="物料代码" />
              </template>
            </el-table-column>
            <el-table-column label="物料名称" width="180">
              <template slot-scope="scope">
                <el-input v-model="scope.row.materialName" size="small" placeholder="物料名称" />
              </template>
            </el-table-column>
            <el-table-column label="型号" width="120">
              <template slot-scope="scope">
                <el-input v-model="scope.row.model" size="small" placeholder="型号" />
              </template>
            </el-table-column>
            <el-table-column label="规格" width="150">
              <template slot-scope="scope">
                <el-input v-model="scope.row.specification" size="small" placeholder="规格" />
              </template>
            </el-table-column>
            <el-table-column label="批次号" width="120">
              <template slot-scope="scope">
                <el-input v-model="scope.row.batchNo" size="small" placeholder="批次号" />
              </template>
            </el-table-column>
            <el-table-column label="数量" width="80">
              <template slot-scope="scope">
                <el-input-number v-model="scope.row.quantity" size="small" :min="1" :controls="false" style="width: 100%" />
              </template>
            </el-table-column>
            <el-table-column label="单位" width="80">
              <template slot-scope="scope">
                <el-select v-model="scope.row.unit" size="small" style="width: 100%">
                  <el-option label="卷" value="卷" />
                  <el-option label="个" value="个" />
                  <el-option label="片" value="片" />
                  <el-option label="米" value="米" />
                  <el-option label="kg" value="kg" />
                </el-select>
              </template>
            </el-table-column>
            <el-table-column label="备注" min-width="150">
              <template slot-scope="scope">
                <el-input v-model="scope.row.remark" size="small" placeholder="备注" />
              </template>
            </el-table-column>
            <el-table-column label="操作" width="60" fixed="right">
              <template slot-scope="scope">
                <el-button type="danger" size="mini" icon="el-icon-delete" circle @click="deleteItem(scope.$index)" />
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-form>

      <span slot="footer">
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" @click="saveSample">保存</el-button>
      </span>
    </el-dialog>

    <!-- 物流信息维护对话框 -->
    <el-dialog title="维护物流信息" :visible.sync="logisticsVisible" width="600px">
      <el-form :model="logisticsForm" label-width="100px">
        <el-form-item label="快递公司">
          <el-select v-model="logisticsForm.expressCompany" filterable allow-create placeholder="选择或输入快递公司" style="width: 100%">
            <el-option label="顺丰速运" value="顺丰速运" />
            <el-option label="圆通速递" value="圆通速递" />
            <el-option label="中通快递" value="中通快递" />
            <el-option label="申通快递" value="申通快递" />
            <el-option label="韵达快递" value="韵达快递" />
            <el-option label="邮政EMS" value="邮政EMS" />
            <el-option label="京东物流" value="京东物流" />
            <el-option label="德邦快递" value="德邦快递" />
          </el-select>
        </el-form-item>
        <el-form-item label="快递单号">
          <el-input v-model="logisticsForm.trackingNumber" placeholder="输入快递单号">
            <el-button slot="append" icon="el-icon-search" @click="queryLogisticsNow">查询</el-button>
          </el-input>
        </el-form-item>
        <el-form-item label="发货日期">
          <el-date-picker
            v-model="logisticsForm.shipDate"
            type="date"
            placeholder="选择发货日期"
            value-format="yyyy-MM-dd"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="送达日期">
          <el-date-picker
            v-model="logisticsForm.deliveryDate"
            type="date"
            placeholder="选择送达日期"
            value-format="yyyy-MM-dd"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      <span slot="footer">
        <el-button @click="logisticsVisible = false">取消</el-button>
        <el-button type="primary" @click="saveLogistics">保存</el-button>
      </span>
    </el-dialog>

    <!-- 物流追踪对话框 -->
    <el-dialog title="物流追踪" :visible.sync="trackingVisible" width="700px">
      <div v-if="logisticsInfo">
        <el-descriptions :column="2" border style="margin-bottom: 20px;">
          <el-descriptions-item label="快递公司">{{ logisticsInfo.expressCompany }}</el-descriptions-item>
          <el-descriptions-item label="快递单号">{{ logisticsInfo.trackingNumber }}</el-descriptions-item>
          <el-descriptions-item label="当前状态">
            <el-tag :type="getStatusType(logisticsInfo.status)">{{ logisticsInfo.status }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="最后更新">{{ logisticsInfo.lastUpdate }}</el-descriptions-item>
        </el-descriptions>

        <el-timeline>
          <el-timeline-item
            v-for="(trace, index) in logisticsInfo.traces"
            :key="index"
            :timestamp="trace.time"
            placement="top"
          >
            {{ trace.context }}
          </el-timeline-item>
        </el-timeline>
      </div>
      <div v-else style="text-align: center; padding: 40px; color: #999;">
        <i class="el-icon-warning" style="font-size: 48px;" />
        <p>暂无物流信息</p>
      </div>
      <span slot="footer">
        <el-button type="primary" @click="refreshLogistics">刷新</el-button>
        <el-button @click="trackingVisible = false">关闭</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import axios from 'axios'

export default {
  name: 'SalesSamples',
  data() {
    return {
      loading: false,
      samples: [],
      customers: [],
      queryParams: {
        customerName: '',
        status: '',
        trackingNumber: ''
      },
      pagination: {
        current: 1,
        size: 10,
        total: 0
      },
      editVisible: false,
      detailVisible: false,
      logisticsVisible: false,
      trackingVisible: false,
      isEditing: false,
      currentSample: null,
      logisticsInfo: null,
      editForm: this.emptyForm(),
      logisticsForm: {
        sampleNo: '',
        expressCompany: '',
        trackingNumber: '',
        shipDate: '',
        deliveryDate: ''
      },
      rules: {
        customerName: [{ required: true, message: '请选择客户', trigger: 'change' }],
        contactName: [{ required: true, message: '请输入联系人', trigger: 'blur' }],
        contactPhone: [{ required: true, message: '请输入联系电话', trigger: 'blur' }],
        contactAddress: [{ required: true, message: '请输入收货地址', trigger: 'blur' }],
        sendDate: [{ required: true, message: '请选择送样日期', trigger: 'change' }]
      }
    }
  },
  created() {
    this.fetchSamples()
    this.fetchCustomers()
  },
  methods: { emptyForm() {
    return {
      sampleNo: '',
      customerId: null,
      customerName: '',
      contactName: '',
      contactPhone: '',
      contactAddress: '',
      sendDate: '',
      remark: '',
      items: [
        {
          materialCode: '',
          materialName: '',
          model: '',
          specification: '',
          batchNo: '',
          quantity: 1,
          unit: '卷',
          remark: ''
        }
      ]
    }
  },
  async fetchSamples() {
    this.loading = true
    try {
      const params = {
        current: this.pagination.current,
        size: this.pagination.size,
        ...this.queryParams
      }
      const res = await axios.get('/api/sales/samples', { params })
      if (res.data && res.data.code === 20000) {
        this.samples = res.data.data.records || []
        this.pagination.total = Number(res.data?.data?.total || 0)
      } else {
        this.$message.error(res.data.message || '获取数据失败')
      }
    } catch (e) {
      console.error(e)
      this.$message.error('获取数据失败')
    } finally {
      this.loading = false
    }
  }, async fetchCustomers() {
    try {
      // 获取客户列表
      const res = await axios.get('/api/sales/customers')
      if (res.data && (res.data.code === 20000 || res.data.code === 200)) {
        const data = res.data.data
        if (data && data.records) {
          this.customers = data.records.map(c => ({
            id: c.id,
            name: c.customerName,
            contact: c.primaryContactName,
            phone: c.primaryContactMobile,
            address: c.contactAddress
          }))
        } else if (Array.isArray(data)) {
          this.customers = data.map(c => ({
            id: c.id,
            name: c.customerName,
            contact: c.primaryContactName,
            phone: c.primaryContactMobile,
            address: c.contactAddress
          }))
        }
      }
    } catch (e) {
      console.error('获取客户列表失败:', e)
    }
  },
  resetQuery() {
    this.queryParams = {
      customerName: '',
      status: '',
      trackingNumber: ''
    }
    this.pagination.current = 1
    this.fetchSamples()
  },
  handleSizeChange(size) {
    this.pagination.size = size
    this.fetchSamples()
  },
  handleCurrentChange(current) {
    this.pagination.current = current
    this.fetchSamples()
  },
  async openCreate() {
    this.isEditing = false
    this.editForm = this.emptyForm()

    // 生成送样编号
    try {
      const res = await axios.get('/api/sales/samples/generate-no')
      if (res.data && res.data.code === 20000) {
        this.editForm.sampleNo = res.data.data
      }
    } catch (e) {
      console.error(e)
    }

    this.editVisible = true
  },
  async openEdit(row) {
    this.isEditing = true

    // 获取详情
    try {
      const res = await axios.get(`/api/sales/samples/${row.sampleNo}`)
      if (res.data && res.data.code === 20000) {
        this.editForm = {
          ...res.data.data,
          items: res.data.data.items || []
        }
      }
    } catch (e) {
      console.error(e)
      this.$message.error('获取详情失败')
      return
    }

    this.editVisible = true
  },
  async viewDetail(row) {
    try {
      const res = await axios.get(`/api/sales/samples/${row.sampleNo}`)
      if (res.data && res.data.code === 20000) {
        this.currentSample = res.data.data
        this.detailVisible = true
      }
    } catch (e) {
      console.error(e)
      this.$message.error('获取详情失败')
    }
  },
  onCustomerChange(customerId) {
    const customer = this.customers.find(c => c.id === customerId)
    if (customer) {
      this.editForm.customerName = customer.name
      // 自动填充联系人信息（如果客户表有）
      if (customer.contact) {
        this.editForm.contactName = customer.contact
      }
      if (customer.phone) {
        this.editForm.contactPhone = customer.phone
      }
      if (customer.address) {
        this.editForm.contactAddress = customer.address
      }
    }
  },
  addItem() {
    this.editForm.items.push({
      materialCode: '',
      materialName: '',
      model: '',
      specification: '',
      batchNo: '',
      quantity: 1,
      unit: '卷',
      remark: ''
    })
  },
  deleteItem(index) {
    this.editForm.items.splice(index, 1)
  },
  saveSample() {
    this.$refs.editForm.validate(async(valid) => {
      if (!valid) return

      if (!this.editForm.items || this.editForm.items.length === 0) {
        this.$message.warning('请至少添加一条样品明细')
        return
      }

      try {
        const url = this.isEditing ? '/api/sales/samples' : '/api/sales/samples'
        const method = this.isEditing ? 'put' : 'post'

        const res = await axios[method](url, this.editForm)

        if (res.data && res.data.code === 20000) {
          this.$message.success(this.isEditing ? '更新成功' : '创建成功')
          this.editVisible = false
          this.fetchSamples()
        } else {
          this.$message.error(res.data.message || '保存失败')
        }
      } catch (e) {
        console.error(e)
        this.$message.error('保存失败')
      }
    })
  },
  confirmDelete(row) {
    this.$confirm(`确认删除送样 ${row.sampleNo} 吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }).then(() => this.deleteSample(row))
  },
  async deleteSample(row) {
    try {
      const res = await axios.delete(`/api/sales/samples/${row.sampleNo}`)
      if (res.data && res.data.code === 20000) {
        this.$message.success('删除成功')
        this.fetchSamples()
      } else {
        this.$message.error(res.data.message || '删除失败')
      }
    } catch (e) {
      console.error(e)
      this.$message.error('删除失败')
    }
  },
  openLogistics(row) {
    this.logisticsForm = {
      sampleNo: row.sampleNo,
      expressCompany: row.expressCompany || '',
      trackingNumber: row.trackingNumber || '',
      shipDate: row.shipDate || '',
      deliveryDate: row.deliveryDate || ''
    }
    this.logisticsVisible = true
  },
  async saveLogistics() {
    try {
      const res = await axios.put(
        `/api/sales/samples/${this.logisticsForm.sampleNo}/logistics`,
        this.logisticsForm
      )
      if (res.data && res.data.code === 20000) {
        this.$message.success('物流信息更新成功')
        this.logisticsVisible = false
        this.fetchSamples()
      } else {
        this.$message.error(res.data.message || '更新失败')
      }
    } catch (e) {
      console.error(e)
      this.$message.error('更新失败')
    }
  },
  async viewLogistics(row) {
    try {
      const res = await axios.get(`/api/sales/samples/${row.sampleNo}/logistics`)
      if (res.data && res.data.code === 20000) {
        this.logisticsInfo = {
          expressCompany: row.expressCompany,
          trackingNumber: row.trackingNumber,
          ...res.data.data
        }
        this.trackingVisible = true
      } else {
        this.$message.error(res.data.message || '查询失败')
      }
    } catch (e) {
      console.error(e)
      this.$message.error('查询失败')
    }
  },
  async queryLogisticsNow() {
    if (!this.logisticsForm.trackingNumber) {
      this.$message.warning('请输入快递单号')
      return
    }

    this.$message.info('正在查询物流信息...')

    try {
      const res = await axios.get(`/api/sales/samples/${this.logisticsForm.sampleNo}/logistics`)
      if (res.data && res.data.code === 20000) {
        this.$message.success('查询成功')
        // 可以显示物流信息或更新状态
      }
    } catch (e) {
      console.error(e)
      this.$message.error('查询失败')
    }
  },
  refreshLogistics() {
    if (this.currentSample) {
      this.viewLogistics(this.currentSample)
    }
  },
  getStatusType(status) {
    const statusMap = {
      '待发货': 'info',
      '已发货': 'primary',
      '运输中': 'warning',
      '已签收': 'success',
      '已拒收': 'danger',
      '已取消': 'info'
    }
    return statusMap[status] || 'info'
  }
  }
}
</script>

<style scoped>
.sales-samples {
  padding: 20px;
}
.filter-container {
  display: flex;
  align-items: center;
}
</style>
