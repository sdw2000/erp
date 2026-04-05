<template>
  <div class="logistics-company-container">
    <el-card>
      <div slot="header" class="clearfix">
        <span>物流公司管理</span>
        <div style="float:right">
          <el-input
            v-model="keyword"
            placeholder="公司名称/电话"
            size="small"
            clearable
            style="width:220px; margin-right:12px"
            @keyup.enter.native="fetchList"
            @clear="fetchList"
          />
          <el-button type="primary" icon="el-icon-plus" size="small" @click="openCreate">新增物流公司</el-button>
        </div>
      </div>

      <el-table v-loading="loading" :data="list" stripe style="width:100%">
        <el-table-column type="index" label="序号" width="60" align="center" />
        <el-table-column prop="companyCode" label="公司编码" width="140" />
        <el-table-column prop="companyName" label="公司名称" min-width="200" />
        <el-table-column prop="contactName" label="联系人" width="120" />
        <el-table-column prop="contactPhone" label="联系电话" width="140" />
        <el-table-column prop="contactMobile" label="联系手机" width="140" />
        <el-table-column prop="contactEmail" label="联系邮箱" min-width="180" />
        <el-table-column prop="companyAddress" label="公司地址" min-width="200" />
        <el-table-column prop="status" label="状态" width="100">
          <template slot-scope="scope">
            <el-tag :type="scope.row.status === 'inactive' ? 'info' : 'success'" size="small">
              {{ scope.row.status === 'inactive' ? '停用' : '启用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="200" />
        <el-table-column label="操作" width="160" fixed="right">
          <template slot-scope="scope">
            <el-button type="text" size="mini" @click="openEdit(scope.row)">编辑</el-button>
            <el-button type="text" size="mini" style="color:#f56c6c" @click="confirmDelete(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pager">
        <el-pagination
          :current-page.sync="page.current"
          :page-size="page.size"
          :total="page.total"
          layout="sizes, prev, pager, next, jumper, ->, total"
          :page-sizes="[10,20,50,100]"
          @size-change="onSizeChange"
          @current-change="onPageChange"
        />
      </div>

      <el-dialog :title="dialogTitle" :visible.sync="dialogVisible" width="860px" :close-on-click-modal="false" @close="handleDialogClose">
        <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
          <el-tabs v-model="activeTab">
            <el-tab-pane label="公司信息" name="company">
              <el-row :gutter="16">
                <el-col :span="12">
                  <el-form-item label="公司编码">
                    <el-input v-model="form.companyCode" placeholder="可选" maxlength="50" />
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="公司名称" prop="companyName">
                    <el-input v-model="form.companyName" placeholder="必填" maxlength="100" />
                  </el-form-item>
                </el-col>
              </el-row>
              <el-row :gutter="16">
                <el-col :span="12">
                  <el-form-item label="联系电话">
                    <el-input v-model="form.contactPhone" placeholder="座机/总机" maxlength="50" />
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
              <el-row :gutter="16">
                <el-col :span="24">
                  <el-form-item label="公司地址">
                    <el-input v-model="form.companyAddress" placeholder="公司地址" maxlength="255" />
                  </el-form-item>
                </el-col>
              </el-row>
              <el-row :gutter="16">
                <el-col :span="24">
                  <el-form-item label="备注">
                    <el-input v-model="form.remark" type="textarea" :rows="3" placeholder="备注" />
                  </el-form-item>
                </el-col>
              </el-row>
            </el-tab-pane>

            <el-tab-pane label="联系人" name="contact">
              <el-row :gutter="16">
                <el-col :span="12">
                  <el-form-item label="联系人">
                    <el-input v-model="form.contactName" placeholder="联系人姓名" maxlength="50" />
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="联系手机">
                    <el-input v-model="form.contactMobile" placeholder="手机号" maxlength="50" />
                  </el-form-item>
                </el-col>
              </el-row>
              <el-row :gutter="16">
                <el-col :span="12">
                  <el-form-item label="联系邮箱">
                    <el-input v-model="form.contactEmail" placeholder="邮箱" maxlength="100" />
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                </el-col>
              </el-row>
            </el-tab-pane>
          </el-tabs>
        </el-form>
        <span slot="footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="submitting" @click="save">保存</el-button>
        </span>
      </el-dialog>
    </el-card>
  </div>
</template>

<script>
import { fetchLogisticsCompanies, createLogisticsCompany, updateLogisticsCompany, deleteLogisticsCompany } from '@/api/logisticsCompany'

export default {
  name: 'LogisticsCompanies',
  data() {
    return {
      keyword: '',
      loading: false,
      list: [],
      page: {
        current: 1,
        size: 10,
        total: 0
      },
      dialogVisible: false,
      dialogTitle: '新增物流公司',
      submitting: false,
      activeTab: 'company',
      form: {
        id: null,
        companyCode: '',
        companyName: '',
        companyAddress: '',
        contactPhone: '',
        contactName: '',
        contactMobile: '',
        contactEmail: '',
        status: 'active',
        remark: ''
      },
      rules: {
        companyName: [{ required: true, message: '请输入公司名称', trigger: 'blur' }]
      }
    }
  },
  created() {
    this.fetchList()
  },
  methods: {
    async fetchList() {
      this.loading = true
      try {
        const res = await fetchLogisticsCompanies({
          page: this.page.current,
          size: this.page.size,
          keyword: this.keyword
        })
        if (res && (res.code === 200 || res.code === 20000)) {
          const data = res.data || {}
          this.list = data.records || data.list || []
          this.page.total = data.total || 0
        } else {
          this.$message.error(res.msg || '加载失败')
        }
      } catch (e) {
        console.error(e)
        this.$message.error('加载失败')
      } finally {
        this.loading = false
      }
    },
    onSizeChange(size) {
      this.page.size = size
      this.page.current = 1
      this.fetchList()
    },
    onPageChange(page) {
      this.page.current = page
      this.fetchList()
    },
    openCreate() {
      this.dialogTitle = '新增物流公司'
      this.activeTab = 'company'
      this.form = {
        id: null,
        companyCode: '',
        companyName: '',
        companyAddress: '',
        contactPhone: '',
        contactName: '',
        contactMobile: '',
        contactEmail: '',
        status: 'active',
        remark: ''
      }
      this.dialogVisible = true
    },
    openEdit(row) {
      this.dialogTitle = '编辑物流公司'
      this.activeTab = 'company'
      this.form = {
        id: row.id,
        companyCode: row.companyCode || '',
        companyName: row.companyName,
        companyAddress: row.companyAddress || '',
        contactPhone: row.contactPhone || '',
        contactName: row.contactName || '',
        contactMobile: row.contactMobile || '',
        contactEmail: row.contactEmail || '',
        status: row.status || 'active',
        remark: row.remark || ''
      }
      this.dialogVisible = true
    },
    handleDialogClose() {
      if (this.$refs.formRef) this.$refs.formRef.clearValidate()
    },
    save() {
      this.$refs.formRef.validate(async valid => {
        if (!valid) return
        this.submitting = true
        try {
          const api = this.form.id ? updateLogisticsCompany : createLogisticsCompany
          const res = await api(this.form)
          if (res && (res.code === 200 || res.code === 20000)) {
            this.$message.success('保存成功')
            this.dialogVisible = false
            this.fetchList()
          } else {
            this.$message.error(res.msg || '保存失败')
          }
        } catch (e) {
          console.error(e)
          this.$message.error('保存失败')
        } finally {
          this.submitting = false
        }
      })
    },
    confirmDelete(row) {
      this.$confirm('确认删除该物流公司吗？', '提示', { type: 'warning' })
        .then(async() => {
          const res = await deleteLogisticsCompany(row.id)
          if (res && (res.code === 200 || res.code === 20000)) {
            this.$message.success('删除成功')
            this.fetchList()
          } else {
            this.$message.error(res.msg || '删除失败')
          }
        })
        .catch(() => {})
    }
  }
}
</script>

<style scoped>
.pager {
  margin-top: 16px;
  text-align: right;
}
</style>
