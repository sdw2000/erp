<template>
  <div class="quotations">
    <el-card>
      <div slot="header" class="clearfix">
        <span>报价管理</span>        <div style="float:right">
          <el-button v-if="$canImportExport()" type="success" icon="el-icon-download" size="small" @click="handleDownloadTemplate">下载模板</el-button>
          <el-button v-if="$canImportExport()" type="warning" icon="el-icon-upload2" size="small" @click="handleImport">导入</el-button>
          <el-button v-if="$canImportExport()" type="info" icon="el-icon-download" size="small" @click="handleExport">导出</el-button>
          <el-button type="primary" icon="el-icon-plus" size="small" @click="openCreate">新增报价单</el-button>
          <input ref="fileInput" type="file" accept=".xlsx,.xls" style="display:none" @change="onFileChange">
        </div>
      </div>      <el-table :data="pagedQuotations" style="width:100%" stripe>
        <el-table-column type="index" label="序号" width="60" align="center" />
        <el-table-column prop="customer" label="客户" width="180" />
        <el-table-column prop="quotationNo" label="报价单号" width="160" />
        <el-table-column prop="contactPerson" label="联系人" width="120" />
        <el-table-column prop="contactPhone" label="联系电话" width="130" />
        <el-table-column prop="totalAmount" label="总金额" width="120" />
        <el-table-column prop="totalArea" label="总面积(㎡)" width="120" />
        <el-table-column prop="quotationDate" label="报价日期" width="120" />
        <el-table-column prop="validUntil" label="有效期至" width="120" />
        <el-table-column label="状态" width="100">
          <template slot-scope="scope">
            <el-tag :type="getStatusType(scope.row.status)" size="small">
              {{ getStatusText(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220">
          <template slot-scope="scope">
            <el-button size="mini" @click="viewDetail(scope.row)">详情</el-button>
            <el-button size="mini" type="primary" @click="openEdit(scope.row)">编辑</el-button>
            <el-button size="mini" type="danger" @click="confirmDelete(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination
          :current-page.sync="currentPage"
          :page-size="pageSize"
          :page-sizes="[5,10,20,50]"
          layout="sizes, prev, pager, next, jumper, ->, total"
          :total="total"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>

      <!-- 详情对话框 -->
      <el-dialog title="报价单详情" :visible.sync="detailVisible" width="1200px">
        <div v-if="currentQuotation">
          <el-row :gutter="20">
            <el-col :span="12">
              <p><strong>客户：</strong>{{ currentQuotation.customer }}</p>
              <p><strong>联系人：</strong>{{ currentQuotation.contactPerson }}</p>
              <p><strong>联系电话：</strong>{{ currentQuotation.contactPhone }}</p>
            </el-col>
            <el-col :span="12">
              <p><strong>报价单号：</strong>{{ currentQuotation.quotationNo }}</p>
              <p><strong>报价日期：</strong>{{ currentQuotation.quotationDate }}</p>
              <p><strong>有效期至：</strong>{{ currentQuotation.validUntil }}</p>
            </el-col>
          </el-row>
          <el-divider />
          <p><strong>总金额：</strong>{{ currentQuotation.totalAmount }} 元 &nbsp;&nbsp; <strong>总面积：</strong>{{ currentQuotation.totalArea }} ㎡</p>
          <p><strong>状态：</strong><el-tag :type="getStatusType(currentQuotation.status)">{{ getStatusText(currentQuotation.status) }}</el-tag></p>
          <p v-if="currentQuotation.remark"><strong>备注：</strong>{{ currentQuotation.remark }}</p>

          <el-table :data="currentQuotation.items" stripe style="width:100%; margin-top:10px;">
            <el-table-column prop="materialCode" label="物料代码" width="120" />
            <el-table-column prop="materialName" label="物料名称" width="150" />
            <el-table-column prop="specifications" label="规格型号" width="120" />
            <el-table-column prop="length" label="长度(mm)" width="100" />
            <el-table-column prop="width" label="宽度(mm)" width="100" />
            <el-table-column prop="thickness" label="厚度(μm)" width="100" />
            <el-table-column prop="quantity" label="数量" width="80" />
            <el-table-column prop="unit" label="单位" width="80" />
            <el-table-column prop="sqm" label="平米数" width="100" />
            <el-table-column prop="unitPrice" label="单价" width="100" />
            <el-table-column prop="amount" label="金额" width="120" />
          </el-table>
        </div>
        <span slot="footer">
          <el-button @click="detailVisible = false">关闭</el-button>
        </span>
      </el-dialog>

      <!-- 编辑/新增对话框 -->
      <el-dialog :title="isEditing ? '编辑报价单' : '新增报价单'" :visible.sync="editVisible" width="1350px">
        <el-form :model="editForm" label-width="100px">
          <el-row :gutter="12">
            <el-col :span="8">
              <el-form-item label="客户">
                <el-select
                  v-model="editForm.customerId"
                  filterable
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
            <el-col :span="8">
              <el-form-item label="联系人">
                <el-input v-model="editForm.contactPerson" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="联系电话">
                <el-input v-model="editForm.contactPhone" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="12">
            <el-col :span="8">
              <el-form-item label="报价日期">
                <el-date-picker
                  v-model="editForm.quotationDate"
                  type="date"
                  placeholder="选择日期"
                  value-format="yyyy-MM-dd"
                  style="width:100%"
                />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="有效期至">
                <el-date-picker
                  v-model="editForm.validUntil"
                  type="date"
                  placeholder="选择日期"
                  value-format="yyyy-MM-dd"
                  style="width:100%"
                />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="状态">
                <el-select v-model="editForm.status" style="width:100%">
                  <el-option label="草稿" value="draft" />
                  <el-option label="已提交" value="submitted" />
                  <el-option label="已接受" value="accepted" />
                  <el-option label="已拒绝" value="rejected" />
                  <el-option label="已过期" value="expired" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>

          <el-row>
            <el-col :span="24">
              <el-form-item label="备注">
                <el-input v-model="editForm.remark" type="textarea" :rows="2" />
              </el-form-item>
            </el-col>
          </el-row>          <el-divider>报价明细</el-divider>

          <div style="margin-bottom:10px; text-align:right">
            <el-button type="primary" size="small" @click="addItem">
              <i class="el-icon-plus" /> 新增明细行
            </el-button>
          </div>          <el-table :data="editForm.items" stripe border style="width:100%">
            <el-table-column label="物料代码" width="130">
              <template slot-scope="scope">
                <el-input v-model="scope.row.materialCode" size="small" placeholder="物料代码" />
              </template>
            </el-table-column>
            <el-table-column label="物料名称" width="160">
              <template slot-scope="scope">
                <el-input v-model="scope.row.materialName" size="small" placeholder="物料名称" />
              </template>
            </el-table-column>
            <el-table-column label="规格型号" width="140">
              <template slot-scope="scope">
                <el-input v-model="scope.row.specifications" size="small" placeholder="规格型号" />
              </template>
            </el-table-column>
            <el-table-column label="长度(mm)" width="110">
              <template slot-scope="scope">
                <el-input v-model.number="scope.row.length" size="small" type="number" placeholder="长度" @input="calculateItem(scope.row)" />
              </template>
            </el-table-column>
            <el-table-column label="宽度(mm)" width="110">
              <template slot-scope="scope">
                <el-input v-model.number="scope.row.width" size="small" type="number" placeholder="宽度" @input="calculateItem(scope.row)" />
              </template>
            </el-table-column>
            <el-table-column label="厚度(μm)" width="110">
              <template slot-scope="scope">
                <el-input v-model.number="scope.row.thickness" size="small" type="number" placeholder="厚度" />
              </template>
            </el-table-column>
            <el-table-column label="单位" width="90">
              <template slot-scope="scope">
                <el-input v-model="scope.row.unit" size="small" placeholder="单位" />
              </template>
            </el-table-column>
            <el-table-column label="单价" width="110">
              <template slot-scope="scope">
                <el-input v-model.number="scope.row.unitPrice" size="small" type="number" placeholder="单价" @input="calculateItem(scope.row)" />
              </template>
            </el-table-column>
            <el-table-column label="备注" min-width="150">
              <template slot-scope="scope">
                <el-input v-model="scope.row.remark" size="small" placeholder="备注" />
              </template>
            </el-table-column>
            <el-table-column label="操作" width="80" fixed="right">
              <template slot-scope="scope">
                <el-button size="mini" type="danger" @click="removeItem(scope.$index)">删除</el-button>
              </template>
            </el-table-column>          </el-table>
        </el-form>

        <span slot="footer">
          <el-button @click="editVisible = false">取消</el-button>
          <el-button type="primary" @click="saveQuotation">保存</el-button>
        </span>
      </el-dialog>
    </el-card>
  </div>
</template>

<script>
import { getQuotationList, createQuotation, updateQuotation, deleteQuotation, importQuotation } from '@/api/quotation'
import { getCustomerList } from '@/api/customer'

export default {
  name: 'Quotations',
  data() {
    return {
      quotations: [],
      customers: [], // 客户列表
      currentPage: 1,
      pageSize: 10,
      detailVisible: false,
      editVisible: false,
      isEditing: false,
      currentQuotation: null,
      editForm: {
        customerId: null,
        customer: '',
        contactPerson: '',
        contactPhone: '',
        quotationDate: '',
        validUntil: '',
        status: 'draft',
        remark: '',
        items: []
      }
    }
  }, computed: {
    total() {
      return this.quotations.length
    },
    pagedQuotations() {
      const start = (this.currentPage - 1) * this.pageSize
      const end = start + this.pageSize
      return this.quotations.slice(start, end)
    } },
  mounted() {
    this.fetchQuotations()
    this.fetchCustomers()
  },
  methods: {
    fetchQuotations() {
      getQuotationList().then(res => {
        if (res && res.code === 200) {
          const quotationsData = res.data.data
          if (Array.isArray(quotationsData)) {
            this.quotations = quotationsData
          } else {
            this.$message.error('数据格式错误')
          }
        }
      }).catch(err => {
        console.error('获取报价单列表失败', err)
        this.$message.error('获取报价单列表失败')
      })
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
        this.editForm.customer = customer.customerName
        // 自动填充主联系人信息
        if (customer.primaryContactName) {
          this.editForm.contactPerson = customer.primaryContactName
        }
        if (customer.primaryContactMobile) {
          this.editForm.contactPhone = customer.primaryContactMobile
        }
      }
    },
    handleSizeChange(val) {
      this.pageSize = val
      this.currentPage = 1
    },
    handleCurrentChange(val) {
      this.currentPage = val
    },
    viewDetail(row) {
      this.currentQuotation = row
      this.detailVisible = true
    }, openCreate() {
      this.isEditing = false
      this.editForm = {
        customerId: null,
        customer: '',
        contactPerson: '',
        contactPhone: '',
        quotationDate: '',
        validUntil: '',
        status: 'draft',
        remark: '',
        items: [
          {
            materialCode: '',
            materialName: '',
            specifications: '',
            length: null,
            width: null,
            thickness: null,
            unit: '卷',
            unitPrice: null,
            remark: ''
          }
        ]
      }
      this.editVisible = true
    },
    openEdit(row) {
      this.isEditing = true
      this.editForm = JSON.parse(JSON.stringify(row))
      if (!this.editForm.items) {
        this.editForm.items = []
      }
      this.editVisible = true
    }, addItem() {
      this.editForm.items.push({
        materialCode: '',
        materialName: '',
        specifications: '',
        length: null,
        width: null,
        thickness: null,
        unit: '卷',
        unitPrice: null,
        remark: ''
      })
    },
    removeItem(index) {
      this.editForm.items.splice(index, 1)
    }, calculateItem(item) {
      // 简化版：不再自动计算，只保留方法以避免错误
      // 后端会根据其他字段进行必要的计算
    },
    saveQuotation() {
      if (!this.editForm.customer) {
        this.$message.warning('请填写客户名称')
        return
      }
      if (this.editForm.items.length === 0) {
        this.$message.warning('请至少添加一条报价明细')
        return
      }

      const apiCall = this.isEditing ? updateQuotation(this.editForm) : createQuotation(this.editForm)

      apiCall.then(res => {
        if (res && res.code === 200) {
          this.$message.success(this.isEditing ? '更新成功' : '创建成功')
          this.editVisible = false
          this.fetchQuotations()
        } else {
          this.$message.error(res.msg || '操作失败')
        }
      }).catch(err => {
        console.error('保存报价单失败', err)
        this.$message.error('保存失败')
      })
    },
    confirmDelete(row) {
      this.$confirm('确定删除该报价单吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        deleteQuotation(row.id).then(res => {
          if (res && res.code === 200) {
            this.$message.success('删除成功')
            this.fetchQuotations()
          } else {
            this.$message.error('删除失败')
          }
        })
      }).catch(() => {
        this.$message.info('已取消删除')
      })
    },
    getStatusType(status) {
      const typeMap = {
        draft: 'info',
        submitted: 'warning',
        accepted: 'success',
        rejected: 'danger',
        expired: 'info'
      }
      return typeMap[status] || 'info'
    }, getStatusText(status) {
      const textMap = {
        draft: '草稿',
        submitted: '已提交',
        accepted: '已接受',
        rejected: '已拒绝',
        expired: '已过期'
      }
      return textMap[status] || status
    },
    // 下载导入模板
    handleDownloadTemplate() {
      import('@/vendor/Export2Excel').then(excel => {
        const header = ['客户名称', '联系人', '联系电话', '报价日期', '有效期至', '状态', '备注']
        const data = [['示例客户', '张三', '13800138000', '2026-01-09', '2026-02-09', '草稿', '']]
        excel.export_json_to_excel({
          header,
          data,
          filename: '报价单导入模板',
          bookType: 'xlsx'
        })
      })
    },
    // 导入
    handleImport() {
      this.$refs.fileInput.click()
    },
    async onFileChange(e) {
      const file = e.target.files[0]
      if (!file) return

      const formData = new FormData()
      formData.append('file', file)

      try {
        const res = await importQuotation(formData)
        if (res && res.code === 200) {
          this.$message.success(`导入成功：${res.data.successCount || 0}条，失败：${res.data.failCount || 0}条`)
          this.fetchQuotations()
        } else {
          this.$message.error(res.message || '导入失败')
        }
      } catch (e) {
        console.error('导入失败:', e)
        this.$message.error('导入失败')
      } finally {
        this.$refs.fileInput.value = ''
      }
    },
    // 导出
    handleExport() {
      import('@/vendor/Export2Excel').then(excel => {
        const header = ['报价单号', '客户名称', '联系人', '联系电话', '报价日期', '有效期至', '总金额', '总面积(㎡)', '状态', '备注']
        const data = this.quotations.map(item => [
          item.quotationNo,
          item.customer,
          item.contactPerson,
          item.contactPhone,
          item.quotationDate,
          item.validUntil,
          item.totalAmount,
          item.totalArea,
          this.getStatusText(item.status),
          item.remark
        ])
        excel.export_json_to_excel({
          header,
          data,
          filename: `报价单数据_${new Date().toLocaleDateString().replace(/\//g, '-')}`,
          bookType: 'xlsx'
        })
      })
    }
  }
}
</script>

<style scoped>
.quotations {
  padding: 20px;
}

.pagination-wrapper {
  margin-top: 20px;
  text-align: center;
}
</style>
