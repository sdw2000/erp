<template>
  <div class="app-container label-qr-rule-page">
    <el-card shadow="never">
      <div slot="header" class="header-row">
        <span class="title">客户二维码规则管理</span>
        <div class="header-actions">
          <el-button size="small" icon="el-icon-refresh" @click="loadList">刷新</el-button>
          <el-button type="primary" size="small" icon="el-icon-plus" @click="openCreateDialog">新增规则</el-button>
        </div>
      </div>

      <el-form :inline="true" :model="query" size="small" class="filter-form">
        <el-form-item label="客户编码">
          <el-input v-model="query.customerCode" placeholder="支持模糊查询" clearable style="width: 180px;" @keyup.enter.native="handleSearch" />
        </el-form-item>
        <el-form-item label="业务类型">
          <el-select v-model="query.bizType" clearable filterable placeholder="全部" style="width: 220px;">
            <el-option v-for="item in bizTypeOptions" :key="item" :label="item" :value="item" />
          </el-select>
        </el-form-item>
        <el-form-item label="启用状态">
          <el-select v-model="query.enabled" clearable placeholder="全部" style="width: 120px;">
            <el-option label="启用" :value="1" />
            <el-option label="禁用" :value="0" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>

      <el-table :data="list" border stripe size="small" v-loading="loading">
        <el-table-column prop="customerCode" label="客户编码" min-width="140" />
        <el-table-column prop="bizType" label="业务类型" min-width="190" />
        <el-table-column label="启用" width="90" align="center">
          <template slot-scope="scope">
            <el-tag :type="Number(scope.row.enabled) === 1 ? 'success' : 'info'" size="mini">
              {{ Number(scope.row.enabled) === 1 ? '是' : '否' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="二维码模板" min-width="460" show-overflow-tooltip>
          <template slot-scope="scope">
            <span>{{ scope.row.qrTemplate }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="updatedBy" label="更新人" width="120" />
        <el-table-column prop="updatedAt" label="更新时间" width="180" />
        <el-table-column label="操作" width="170" fixed="right">
          <template slot-scope="scope">
            <el-button type="text" size="small" @click="openEditDialog(scope.row)">编辑</el-button>
            <el-button type="text" size="small" style="color: #f56c6c;" @click="handleDelete(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pager-row">
        <el-pagination
          background
          layout="total, sizes, prev, pager, next, jumper"
          :total="total"
          :current-page="query.current"
          :page-size="query.size"
          :page-sizes="[10, 20, 50, 100]"
          @current-change="handleCurrentChange"
          @size-change="handleSizeChange"
        />
      </div>
    </el-card>

    <el-dialog :title="dialogTitle" :visible.sync="dialogVisible" width="760px" :close-on-click-modal="false">
      <el-form ref="editForm" :model="editForm" :rules="rules" label-width="110px" size="small">
        <el-form-item label="客户编码" prop="customerCode">
          <el-input v-model="editForm.customerCode" :disabled="isEdit" placeholder="如 CUST001" />
        </el-form-item>
        <el-form-item label="业务类型" prop="bizType">
          <el-select v-model="editForm.bizType" filterable allow-create default-first-option :disabled="isEdit" placeholder="请选择或输入业务类型" style="width: 100%;">
            <el-option v-for="item in bizTypeOptions" :key="item" :label="item" :value="item" />
          </el-select>
        </el-form-item>
        <el-form-item label="启用状态" prop="enabled">
          <el-switch v-model="editForm.enabled" :active-value="1" :inactive-value="0" />
        </el-form-item>
        <el-form-item label="二维码模板" prop="qrTemplate">
          <el-input
            v-model="editForm.qrTemplate"
            type="textarea"
            :rows="6"
            placeholder="例如：{orderNo}|{customerCode}|{spec}|{qty}PCS"
          />
        </el-form-item>
      </el-form>
      <span slot="footer" class="dialog-footer">
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveRule">保存</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import { pageCustomerLabelQrRule, saveCustomerLabelQrRule, deleteCustomerLabelQrRule } from '@/api/labelQrRule'

const DEFAULT_BIZ_TYPE = 'SLITTING_OUTER_LABEL'

export default {
  name: 'LabelQrRuleConfig',
  data() {
    return {
      loading: false,
      saving: false,
      list: [],
      total: 0,
      query: {
        customerCode: '',
        bizType: '',
        enabled: null,
        current: 1,
        size: 20
      },
      dialogVisible: false,
      isEdit: false,
      editForm: {
        customerCode: '',
        bizType: DEFAULT_BIZ_TYPE,
        qrTemplate: '',
        enabled: 1
      },
      rules: {
        customerCode: [{ required: true, message: '请输入客户编码', trigger: 'blur' }],
        bizType: [{ required: true, message: '请输入业务类型', trigger: 'change' }],
        qrTemplate: [{ required: true, message: '请输入二维码模板', trigger: 'blur' }]
      },
      bizTypeOptions: [
        'SLITTING_CORE_LABEL',
        'SLITTING_CORE_LABEL_NARROW',
        'SLITTING_INNER_LABEL',
        'SLITTING_OUTER_LABEL',
        'SLITTING_PALLET_LABEL',
        'COATING_ROLL_LABEL',
        'COATING_INBOUND_SHEET',
        'REWINDING_ROLL_LABEL'
      ]
    }
  },
  computed: {
    dialogTitle() {
      return this.isEdit ? '编辑二维码规则' : '新增二维码规则'
    }
  },
  created() {
    this.loadList()
  },
  methods: {
    async loadList() {
      this.loading = true
      try {
        const params = {
          customerCode: this.query.customerCode || undefined,
          bizType: this.query.bizType || undefined,
          enabled: this.query.enabled,
          current: this.query.current,
          size: this.query.size
        }
        const res = await pageCustomerLabelQrRule(params)
        if (res && (res.code === 200 || res.code === 20000)) {
          const data = res.data || {}
          this.list = Array.isArray(data.records) ? data.records : []
          this.total = Number(data.total || 0)
        } else {
          this.$message.error((res && (res.msg || res.message)) || '加载失败')
        }
      } catch (e) {
        this.$message.error('加载失败')
      } finally {
        this.loading = false
      }
    },
    handleSearch() {
      this.query.current = 1
      this.loadList()
    },
    handleReset() {
      this.query = {
        customerCode: '',
        bizType: '',
        enabled: null,
        current: 1,
        size: this.query.size
      }
      this.loadList()
    },
    handleCurrentChange(page) {
      this.query.current = page
      this.loadList()
    },
    handleSizeChange(size) {
      this.query.size = size
      this.query.current = 1
      this.loadList()
    },
    openCreateDialog() {
      this.isEdit = false
      this.editForm = {
        customerCode: '',
        bizType: DEFAULT_BIZ_TYPE,
        qrTemplate: '',
        enabled: 1
      }
      this.dialogVisible = true
      this.$nextTick(() => {
        if (this.$refs.editForm) this.$refs.editForm.clearValidate()
      })
    },
    openEditDialog(row) {
      this.isEdit = true
      this.editForm = {
        customerCode: row.customerCode || '',
        bizType: row.bizType || DEFAULT_BIZ_TYPE,
        qrTemplate: row.qrTemplate || '',
        enabled: Number(row.enabled) === 1 ? 1 : 0
      }
      this.dialogVisible = true
      this.$nextTick(() => {
        if (this.$refs.editForm) this.$refs.editForm.clearValidate()
      })
    },
    async saveRule() {
      if (!this.$refs.editForm) return
      this.$refs.editForm.validate(async valid => {
        if (!valid) return
        this.saving = true
        try {
          const payload = {
            customerCode: (this.editForm.customerCode || '').trim(),
            bizType: (this.editForm.bizType || '').trim(),
            qrTemplate: this.editForm.qrTemplate,
            enabled: Number(this.editForm.enabled) === 1 ? 1 : 0
          }
          const res = await saveCustomerLabelQrRule(payload)
          if (res && (res.code === 200 || res.code === 20000)) {
            this.$message.success('保存成功')
            this.dialogVisible = false
            this.loadList()
          } else {
            this.$message.error((res && (res.msg || res.message)) || '保存失败')
          }
        } catch (e) {
          this.$message.error('保存失败')
        } finally {
          this.saving = false
        }
      })
    },
    async handleDelete(row) {
      try {
        await this.$confirm(`确认删除客户【${row.customerCode || '-'}】业务【${row.bizType || '-'}】的二维码规则吗？`, '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        })
      } catch (e) {
        return
      }

      try {
        const res = await deleteCustomerLabelQrRule(row.customerCode, row.bizType || DEFAULT_BIZ_TYPE)
        if (res && (res.code === 200 || res.code === 20000)) {
          this.$message.success('删除成功')
          if (this.list.length === 1 && this.query.current > 1) {
            this.query.current = this.query.current - 1
          }
          this.loadList()
        } else {
          this.$message.error((res && (res.msg || res.message)) || '删除失败')
        }
      } catch (e) {
        this.$message.error('删除失败')
      }
    }
  }
}
</script>

<style scoped>
.label-qr-rule-page {
  padding: 20px;
}
.header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.header-actions {
  display: flex;
  gap: 8px;
}
.title {
  font-size: 16px;
  font-weight: 600;
}
.filter-form {
  margin-bottom: 12px;
}
.pager-row {
  margin-top: 16px;
  text-align: right;
}
</style>
