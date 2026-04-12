<template>
  <div class="purchase-suppliers">
    <el-card>
      <div slot="header" class="clearfix">
        <div class="header-title-row">
          <span>采购管理</span>
        </div>
        <div class="header-action-row">
          <div class="header-search-left">
            <el-input
              v-model="keyword"
              placeholder="名称/编码/简称"
              size="small"
              clearable
              style="width:220px"
              @keyup.enter.native="fetchList"
              @clear="fetchList"
            />
          </div>
          <div class="header-buttons-right">
            <el-button type="success" icon="el-icon-download" size="small" @click="handleDownloadTemplate">下载模板</el-button>
            <el-button type="warning" icon="el-icon-upload2" size="small" @click="triggerImport">导入</el-button>
            <el-button type="info" icon="el-icon-download" size="small" @click="handleExport">导出</el-button>
            <el-button type="primary" icon="el-icon-plus" size="small" @click="openCreate">新增供应商</el-button>
            <input ref="importFile" type="file" accept=".xlsx,.xls" style="display:none" @change="handleImportChange">
          </div>
        </div>
      </div>

      <el-table v-loading="loading" :data="suppliers" stripe style="width:100%">
        <el-table-column type="index" label="序号" width="60" align="center" />
        <el-table-column prop="supplierCode" label="供应商编码" width="140" />
        <el-table-column prop="supplierName" label="供应商名称" width="180" />
        <el-table-column prop="shortName" label="简称" width="120" />
        <el-table-column prop="primaryContactName" label="联系人" width="120" />
        <el-table-column prop="primaryContactMobile" label="联系电话" width="140" />
        <el-table-column prop="status" label="状态" width="100">
          <template slot-scope="scope">
            <el-tag :type="scope.row.status === 'active' ? 'success' : 'info'" size="small">
              {{ scope.row.status === 'inactive' ? '停用' : '启用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="150" />
        <el-table-column label="操作" width="180" fixed="right">
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

      <el-dialog :title="dialogTitle" :visible.sync="dialogVisible" width="860px" :close-on-click-modal="false" @close="handleDialogClose">
        <el-form ref="formRef" :model="form" :rules="formRules" label-width="120px">
          <el-tabs v-model="activeTab">
            <el-tab-pane label="基本信息" name="basic">
              <el-row :gutter="16">
                <el-col :span="12">
                  <el-form-item label="供应商编码" prop="supplierCode">
                    <el-input v-model="form.supplierCode" placeholder="必填，唯一编码" maxlength="32" />
                    <span class="form-tip">建议2-10位，保持唯一</span>
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="供应商名称" prop="supplierName">
                    <el-input v-model="form.supplierName" placeholder="必填，供应商全称" maxlength="128" />
                  </el-form-item>
                </el-col>
              </el-row>
              <el-row :gutter="16">
                <el-col :span="12">
                  <el-form-item label="简称">
                    <el-input v-model="form.shortName" placeholder="方便识别的简称" />
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="状态">
                    <el-select v-model="form.status" style="width:100%">
                      <el-option label="启用" value="active" />
                      <el-option label="停用" value="inactive" />
                    </el-select>
                  </el-form-item>
                </el-col>
              </el-row>
            </el-tab-pane>

            <el-tab-pane label="联系信息" name="contact">
              <el-row :gutter="16">
                <el-col :span="12">
                  <el-form-item label="联系人">
                    <el-input v-model="form.primaryContactName" placeholder="联系人姓名" maxlength="64" />
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="联系电话">
                    <el-input v-model="form.primaryContactMobile" placeholder="手机号/座机" maxlength="32" />
                  </el-form-item>
                </el-col>
              </el-row>
              <el-row :gutter="16">
                <el-col :span="12">
                  <el-form-item label="邮箱">
                    <el-input v-model="form.contactEmail" placeholder="邮箱" maxlength="128" />
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="地址">
                    <el-input v-model="form.contactAddress" placeholder="联系/收货地址" />
                  </el-form-item>
                </el-col>
              </el-row>
            </el-tab-pane>

            <el-tab-pane label="财务信息" name="finance">
              <el-row :gutter="16">
                <el-col :span="12">
                  <el-form-item label="税号">
                    <el-input v-model="form.taxNo" placeholder="纳税人识别号" maxlength="64" />
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="开户行">
                    <el-input v-model="form.bankName" placeholder="开户行名称" maxlength="128" />
                  </el-form-item>
                </el-col>
              </el-row>
              <el-row :gutter="16">
                <el-col :span="12">
                  <el-form-item label="账号">
                    <el-input v-model="form.bankAccount" placeholder="银行账号" maxlength="64" />
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="备注">
                    <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="补充说明" />
                  </el-form-item>
                </el-col>
              </el-row>
            </el-tab-pane>

            <el-tab-pane label="联系人" name="contacts">
              <div class="contact-pane">
                <div class="contact-actions">
                  <el-button type="primary" size="mini" icon="el-icon-plus" @click="addContact">添加联系人</el-button>
                </div>
                <el-table :data="form.contacts" border stripe size="small" style="width: 100%" empty-text="请添加联系人">
                  <el-table-column label="姓名" width="120">
                    <template slot-scope="scope">
                      <el-input v-model="scope.row.contactName" size="small" placeholder="姓名" />
                    </template>
                  </el-table-column>
                  <el-table-column label="职位" width="120">
                    <template slot-scope="scope">
                      <el-input v-model="scope.row.contactPosition" size="small" placeholder="职位" />
                    </template>
                  </el-table-column>
                  <el-table-column label="电话" width="140">
                    <template slot-scope="scope">
                      <el-input v-model="scope.row.contactPhone" size="small" placeholder="手机/座机" />
                    </template>
                  </el-table-column>
                  <el-table-column label="邮箱" width="180">
                    <template slot-scope="scope">
                      <el-input v-model="scope.row.contactEmail" size="small" placeholder="邮箱" />
                    </template>
                  </el-table-column>
                  <el-table-column label="微信" width="140">
                    <template slot-scope="scope">
                      <el-input v-model="scope.row.contactWechat" size="small" placeholder="微信号" />
                    </template>
                  </el-table-column>
                  <el-table-column label="主联系人" width="90" align="center">
                    <template slot-scope="scope">
                      <el-checkbox v-model="scope.row.isPrimary" :true-label="1" :false-label="0" @change="onPrimaryChange(scope.$index)" />
                    </template>
                  </el-table-column>
                  <el-table-column label="决策人" width="90" align="center">
                    <template slot-scope="scope">
                      <el-checkbox v-model="scope.row.isDecisionMaker" :true-label="1" :false-label="0" />
                    </template>
                  </el-table-column>
                  <el-table-column label="操作" width="80" fixed="right">
                    <template slot-scope="scope">
                      <el-button type="text" size="mini" @click="removeContact(scope.$index)">删除</el-button>
                    </template>
                  </el-table-column>
                </el-table>
                <div class="contact-tip">* 建议至少维护一个联系人，设置主联系人便于沟通</div>
              </div>
            </el-tab-pane>
          </el-tabs>
        </el-form>
        <span slot="footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="save">保存</el-button>
        </span>
      </el-dialog>

      <el-dialog title="导入结果" :visible.sync="importResultVisible" width="500px">
        <div v-if="importResult">
          <p><strong>成功：</strong><span style="color:#67c23a">{{ importResult.successCount }} 条</span></p>
          <p><strong>失败：</strong><span style="color:#f56c6c">{{ importResult.failCount }} 条</span></p>
          <div v-if="importResult.errors && importResult.errors.length > 0">
            <p><strong>错误详情：</strong></p>
            <ul style="max-height: 200px; overflow-y: auto;">
              <li v-for="(err, idx) in importResult.errors" :key="idx" style="color: #f56c6c">{{ err }}</li>
            </ul>
          </div>
        </div>
        <div slot="footer">
          <el-button type="primary" @click="importResultVisible = false">确定</el-button>
        </div>
      </el-dialog>
    </el-card>
  </div>
</template>

<script>
import { listSuppliers, createSupplier, updateSupplier, deleteSupplier, getSupplierDetail, downloadSupplierTemplate, importSuppliers, exportSuppliers } from '@/api/purchaseSupplier'

export default {
  name: 'PurchaseSuppliers',
  data() {
    return {
      loading: false,
      suppliers: [],
      keyword: '',
      pagination: { page: 1, size: 10, total: 0 },
      dialogVisible: false,
      isEdit: false,
      form: this.emptyForm(),
      activeTab: 'basic',
      importResultVisible: false,
      importResult: null,
      formRules: {
        supplierCode: [{ required: true, message: '请输入供应商编码', trigger: 'blur' }],
        supplierName: [{ required: true, message: '请输入供应商名称', trigger: 'blur' }]
      }
    }
  },
  computed: {
    dialogTitle() {
      return this.isEdit ? '编辑供应商' : '新增供应商'
    }
  },
  created() {
    this.fetchList()
  },
  methods: {
    triggerImport() {
      this.$refs.importFile && this.$refs.importFile.click()
    },
    handleDownloadTemplate() {
      downloadSupplierTemplate().then(res => {
        const blob = new Blob([res])
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = '供应商导入模板.xlsx'
        link.click()
        URL.revokeObjectURL(link.href)
      })
    },
    async handleImportChange(e) {
      const file = e.target.files && e.target.files[0]
      if (!file) return
      try {
        const res = await importSuppliers(file)
        if (res && (res.code === 200 || res.code === 20000)) {
          this.importResult = res.data
          this.importResultVisible = true
          this.$message.success(`导入完成：成功${res.data?.successCount || 0}条，失败${res.data?.failCount || 0}条`)
        } else {
          this.$message.error(res?.message || '导入失败')
        }
        this.fetchList()
      } catch (err) {
        this.$message.error('导入失败，请检查模板格式')
      } finally {
        if (this.$refs.importFile) this.$refs.importFile.value = ''
      }
    },
    async handleExport() {
      try {
        const res = await exportSuppliers({ keyword: this.keyword })
        const blob = new Blob([res])
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = `供应商数据_${new Date().toLocaleDateString().replace(/\//g, '-')}.xlsx`
        link.click()
        URL.revokeObjectURL(link.href)
      } catch (e) {
        this.$message.error('导出失败')
      }
    },
    emptyForm() {
      return {
        id: null,
        supplierCode: '',
        supplierName: '',
        shortName: '',
        primaryContactName: '',
        primaryContactMobile: '',
        contactEmail: '',
        contactAddress: '',
        taxNo: '',
        bankName: '',
        bankAccount: '',
        status: 'active',
        remark: '',
        contacts: [this.emptyContact()]
      }
    },
    emptyContact() {
      return { contactName: '', contactPosition: '', contactPhone: '', contactEmail: '', contactWechat: '', isPrimary: 0, isDecisionMaker: 0 }
    },
    async fetchList() {
      this.loading = true
      try {
        const res = await listSuppliers({ keyword: this.keyword, page: this.pagination.page, size: this.pagination.size })
        if (res && (res.code === 200 || res.code === 20000)) {
          const data = res.data
          if (data && data.records) {
            this.suppliers = data.records
            this.pagination.total = Number(data.total || 0)
          } else if (Array.isArray(data)) {
            this.suppliers = data
            this.pagination.total = Number(data.length)
          } else if (typeof data === 'object' && data.total !== undefined && data.list) {
            // 兼容 total/list 结构
            this.suppliers = data.list
            this.pagination.total = Number(data.total || 0)
          }
        }
      } catch (e) {
        this.$message.error('获取供应商失败')
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
      this.activeTab = 'basic'
      this.dialogVisible = true
    },
    async openEdit(row) {
      this.isEdit = true
      this.activeTab = 'basic'
      await this.loadDetail(row.id)
      this.dialogVisible = true
    },
    handleDialogClose() {
      if (this.$refs.formRef) {
        this.$refs.formRef.resetFields()
      }
      this.form = this.emptyForm()
      this.activeTab = 'basic'
    },
    async loadDetail(id) {
      try {
        const res = await getSupplierDetail(id)
        if (res && (res.code === 200 || res.code === 20000)) {
          const data = res.data || {}
          const contacts = (data.contacts && data.contacts.length ? data.contacts : [this.emptyContact()]).map(c => ({
            contactName: c.contactName || '',
            contactPosition: c.contactPosition || '',
            contactPhone: c.contactPhone || '',
            contactEmail: c.contactEmail || '',
            contactWechat: c.contactWechat || '',
            isPrimary: c.isPrimary || 0,
            isDecisionMaker: c.isDecisionMaker || 0
          }))
          // 保证至少一个联系人
          this.form = { ...this.emptyForm(), ...data, contacts }
          // 兜底主联系人
          if (!contacts.some(c => c.isPrimary === 1)) {
            this.onPrimaryChange(0)
          }
        }
      } catch (e) {
        this.$message.error('获取供应商详情失败')
        this.form = this.emptyForm()
      }
    },
    addContact() {
      this.form.contacts.push(this.emptyContact())
      if (this.form.contacts.length === 1) {
        this.onPrimaryChange(0)
      }
    },
    removeContact(index) {
      if (this.form.contacts.length === 1) {
        this.$message.warning('至少保留一个联系人')
        return
      }
      this.form.contacts.splice(index, 1)
      if (!this.form.contacts.some(c => c.isPrimary === 1)) {
        this.onPrimaryChange(0)
      }
    },
    onPrimaryChange(index) {
      this.form.contacts = this.form.contacts.map((c, idx) => ({ ...c, isPrimary: idx === index ? 1 : 0 }))
      const primary = this.form.contacts[index]
      // 同步主联系人到简要字段，便于列表展示
      this.form.primaryContactName = primary.contactName
      this.form.primaryContactMobile = primary.contactPhone
      this.form.contactEmail = primary.contactEmail
    },
    async save() {
      const valid = await this.$refs.formRef.validate().catch(() => false)
      if (!valid) return
      // 过滤掉完全空的联系人行
      const contacts = this.form.contacts
        .map(c => ({
          contactName: c.contactName || '',
          contactPosition: c.contactPosition || '',
          contactPhone: c.contactPhone || '',
          contactEmail: c.contactEmail || '',
          contactWechat: c.contactWechat || '',
          isPrimary: c.isPrimary || 0,
          isDecisionMaker: c.isDecisionMaker || 0
        }))
        .filter(c => c.contactName || c.contactPhone || c.contactEmail || c.contactWechat)

      if (contacts.length === 0) {
        this.$message.warning('请至少填写一个联系人')
        return
      }
      if (!contacts.some(c => c.isPrimary === 1)) {
        contacts[0].isPrimary = 1
      }

      const primary = contacts.find(c => c.isPrimary === 1) || contacts[0]
      const payload = {
        ...this.form,
        primaryContactName: primary.contactName,
        primaryContactMobile: primary.contactPhone,
        contactEmail: primary.contactEmail,
        contacts
      }
      const api = this.isEdit ? updateSupplier : createSupplier
      const res = await api(payload)
      if (res && (res.code === 200 || res.code === 20000)) {
        this.$message.success('保存成功')
        this.dialogVisible = false
        this.fetchList()
      }
    },
    confirmDelete(row) {
      this.$confirm(`确认删除供应商【${row.supplierName}】?`, '提示', { type: 'warning' })
        .then(() => this.remove(row.id))
        .catch(() => {})
    },
    async remove(id) {
      try {
        const res = await deleteSupplier(id)
        if (res && (res.code === 200 || res.code === 20000)) {
          this.$message.success('删除成功')
          this.fetchList()
        } else {
          this.$message.error(res?.message || '删除失败')
        }
      } catch (err) {
        this.$message.error((err && err.message) || '删除失败')
      }
    }
  }
}
</script>

<style scoped>
.header-title-row {
  margin-bottom: 10px;
  font-weight: 600;
}

.header-action-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.header-search-left {
  display: flex;
  align-items: center;
}

.header-buttons-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pager {
  margin-top: 12px;
  text-align: right;
}
</style>
