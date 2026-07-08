<template>
  <div class="purchase-supplier-material-mapping">
    <el-card>
      <div slot="header" class="clearfix">
        <span>供应商物料映射</span>
        <div style="float:right">
          <el-button type="primary" size="mini" @click="openDialog()">新增映射</el-button>
        </div>
      </div>

      <el-row :gutter="12" style="margin-bottom: 10px;">
        <el-col :span="6">
          <el-input
            v-model.trim="query.supplierKeyword"
            size="small"
            clearable
            placeholder="供应商代码/名称/简称"
            @keyup.enter.native="fetchList"
            @clear="fetchList"
          />
        </el-col>
        <el-col :span="5">
          <el-input
            v-model.trim="query.materialCode"
            size="small"
            clearable
            placeholder="我司代码"
            @keyup.enter.native="fetchList"
            @clear="fetchList"
          />
        </el-col>
        <el-col :span="5">
          <el-input
            v-model.trim="query.supplierMaterialCode"
            size="small"
            clearable
            placeholder="供应商物料代码"
            @keyup.enter.native="fetchList"
            @clear="fetchList"
          />
        </el-col>
        <el-col :span="4">
          <el-select v-model="query.isActive" size="small" clearable style="width:100%" placeholder="启用状态" @change="fetchList">
            <el-option label="启用" :value="1" />
            <el-option label="禁用" :value="0" />
          </el-select>
        </el-col>
        <el-col :span="4" style="text-align:right;">
          <el-button type="primary" size="small" icon="el-icon-search" @click="fetchList">搜索</el-button>
          <el-button size="small" icon="el-icon-refresh" @click="resetQuery">重置</el-button>
        </el-col>
      </el-row>

      <el-table v-loading="loading" :data="list" stripe border style="width:100%">
        <el-table-column type="index" width="56" label="#" />
        <el-table-column prop="supplierCode" label="供应商代码" width="140" />
        <el-table-column label="供应商名称" min-width="160">
          <template slot-scope="scope">
            {{ supplierNameMap[scope.row.supplierCode] || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="materialCode" label="我司代码" width="150" />
        <el-table-column prop="materialName" label="我司名称" min-width="160" show-overflow-tooltip />
        <el-table-column prop="supplierMaterialCode" label="供应商物料代码" width="160" />
        <el-table-column prop="supplierMaterialName" label="供应商物料名称" min-width="180" show-overflow-tooltip />
        <el-table-column label="启用" width="80" align="center">
          <template slot-scope="scope">
            <el-tag :type="scope.row.isActive === 1 ? 'success' : 'info'" size="mini">{{ scope.row.isActive === 1 ? '是' : '否' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="180" show-overflow-tooltip />
        <el-table-column label="操作" width="160" fixed="right" align="center">
          <template slot-scope="scope">
            <el-button type="text" size="mini" @click="openDialog(scope.row)">编辑</el-button>
            <el-button type="text" size="mini" style="color:#F56C6C" @click="handleDelete(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div style="margin-top:10px;text-align:right;">
        <el-pagination
          :current-page.sync="page.pageNum"
          :page-size="page.pageSize"
          :page-sizes="pageSizes"
          layout="sizes, prev, pager, next, jumper, ->, total"
          :total="Number(page.total || 0)"
          @current-change="fetchList"
          @size-change="onPageSizeChange"
        />
      </div>

      <el-dialog :title="form.id ? '编辑映射' : '新增映射'" :visible.sync="dialogVisible" width="760px" @close="resetForm">
        <el-form ref="formRef" :model="form" :rules="rules" label-width="120px">
          <el-form-item label="供应商" prop="supplierCode">
            <el-select v-model="form.supplierCode" filterable style="width:100%" placeholder="请选择供应商" @change="onSupplierCodeChange">
              <el-option
                v-for="item in suppliers"
                :key="item.id"
                :label="`${item.supplierCode || '-'} / ${item.supplierName || item.shortName || '-'}`"
                :value="item.supplierCode"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="我司代码" prop="materialCode">
            <el-select
              v-model="form.materialCode"
              filterable
              clearable
              allow-create
              default-first-option
              style="width:100%"
              placeholder="请输入或选择我司代码"
              @change="onMaterialCodeChange"
            >
              <el-option
                v-for="raw in rawMaterials"
                :key="raw.materialCode"
                :label="`${raw.materialCode || ''} ${raw.materialName || ''}`"
                :value="raw.materialCode"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="我司名称">
            <el-input v-model.trim="form.materialName" placeholder="我司名称（可自动带出）" />
          </el-form-item>
          <el-form-item label="供应商物料代码">
            <el-input v-model.trim="form.supplierMaterialCode" placeholder="供应商物料代码" />
          </el-form-item>
          <el-form-item label="供应商物料名称">
            <el-input v-model.trim="form.supplierMaterialName" placeholder="供应商物料名称" />
          </el-form-item>
          <el-form-item label="启用">
            <el-switch v-model="form.isActive" :active-value="1" :inactive-value="0" />
          </el-form-item>
          <el-form-item label="备注">
            <el-input v-model.trim="form.remark" type="textarea" :rows="3" placeholder="备注（可选）" />
          </el-form-item>
        </el-form>
        <span slot="footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="saving" @click="submitForm">保存</el-button>
        </span>
      </el-dialog>
    </el-card>
  </div>
</template>

<script>
import { listSuppliers } from '@/api/purchaseSupplier'
import { getRawMaterialList } from '@/api/tapeRawMaterial'
import {
  getPurchaseSupplierMaterialMappingPage,
  savePurchaseSupplierMaterialMapping,
  deletePurchaseSupplierMaterialMapping
} from '@/api/purchaseSupplierMaterialMapping'
import uiConfig from '@/config/ui'

export default {
  name: 'PurchaseSupplierMaterialMapping',
  data() {
    return {
      loading: false,
      saving: false,
      list: [],
      query: {
        supplierKeyword: '',
        materialCode: '',
        supplierMaterialCode: '',
        isActive: undefined
      },
      page: {
        pageNum: 1,
        pageSize: uiConfig.defaultPageSize,
        total: 0
      },
      pageSizes: uiConfig.pageSizes,
      suppliers: [],
      supplierNameMap: {},
      rawMaterials: [],
      dialogVisible: false,
      form: this.emptyForm(),
      rules: {
        supplierCode: [{ required: true, message: '请选择供应商', trigger: 'change' }],
        materialCode: [{ required: true, message: '请输入我司代码', trigger: 'blur' }]
      }
    }
  },
  created() {
    this.initBaseData()
    this.fetchList()
  },
  methods: {
    emptyForm() {
      return {
        id: null,
        supplierCode: '',
        materialCode: '',
        materialName: '',
        supplierMaterialCode: '',
        supplierMaterialName: '',
        isActive: 1,
        remark: '',
        updateBy: ''
      }
    },
    async initBaseData() {
      try {
        const [supplierRes, rawRes] = await Promise.all([
          listSuppliers({ page: 1, size: 1000 }),
          getRawMaterialList()
        ])
        const suppliers = (supplierRes && (supplierRes.code === 200 || supplierRes.code === 20000)
          ? ((supplierRes.data && (supplierRes.data.records || supplierRes.data.list)) || supplierRes.data || [])
          : []) || []
        this.suppliers = suppliers
        const map = {}
        suppliers.forEach(item => {
          const code = String((item && item.supplierCode) || '').trim()
          if (!code) return
          map[code] = item.supplierName || item.shortName || item.supplierCode
        })
        this.supplierNameMap = map

        if (rawRes && (rawRes.code === 200 || rawRes.code === 20000)) {
          this.rawMaterials = rawRes.data || []
        }
      } catch (e) {
        console.error('初始化基础数据失败', e)
      }
    },
    async fetchList() {
      this.loading = true
      try {
        const res = await getPurchaseSupplierMaterialMappingPage({
          pageNum: this.page.pageNum,
          pageSize: this.page.pageSize,
          supplierKeyword: this.query.supplierKeyword,
          materialCode: this.query.materialCode,
          supplierMaterialCode: this.query.supplierMaterialCode,
          isActive: this.query.isActive
        })
        if (res && (res.code === 200 || res.code === 20000)) {
          const data = res.data || {}
          this.list = data.records || []
          this.page.total = Number(data.total || 0)
        }
      } catch (e) {
        console.error('查询供应商物料映射失败', e)
        this.$message.error('查询失败')
      } finally {
        this.loading = false
      }
    },
    resetQuery() {
      this.query = {
        supplierKeyword: '',
        materialCode: '',
        supplierMaterialCode: '',
        isActive: undefined
      }
      this.page.pageNum = 1
      this.fetchList()
    },
    onPageSizeChange(val) {
      this.page.pageSize = val
      this.page.pageNum = 1
      this.fetchList()
    },
    openDialog(row) {
      this.form = row ? { ...this.emptyForm(), ...row } : this.emptyForm()
      this.dialogVisible = true
      this.$nextTick(() => {
        if (this.$refs.formRef) this.$refs.formRef.clearValidate()
      })
    },
    resetForm() {
      this.form = this.emptyForm()
    },
    onSupplierCodeChange() {
      // 占位：后续可根据供应商默认值自动填充
    },
    onMaterialCodeChange(code) {
      const hit = (this.rawMaterials || []).find(r => String((r && r.materialCode) || '').trim() === String(code || '').trim())
      if (hit && (!this.form.materialName || !String(this.form.materialName).trim())) {
        this.form.materialName = hit.materialName || ''
      }
    },
    async submitForm() {
      if (!this.$refs.formRef) return
      try {
        await this.$refs.formRef.validate()
      } catch (e) {
        return
      }
      this.saving = true
      try {
        const payload = {
          ...this.form,
          supplierCode: String(this.form.supplierCode || '').trim(),
          materialCode: String(this.form.materialCode || '').trim(),
          materialName: String(this.form.materialName || '').trim(),
          supplierMaterialCode: String(this.form.supplierMaterialCode || '').trim(),
          supplierMaterialName: String(this.form.supplierMaterialName || '').trim(),
          remark: String(this.form.remark || '').trim()
        }
        const res = await savePurchaseSupplierMaterialMapping(payload)
        if (res && (res.code === 200 || res.code === 20000)) {
          this.$message.success('保存成功')
          this.dialogVisible = false
          this.fetchList()
        } else {
          this.$message.error((res && res.message) || '保存失败')
        }
      } catch (e) {
        console.error('保存供应商物料映射失败', e)
        this.$message.error('保存失败')
      } finally {
        this.saving = false
      }
    },
    async handleDelete(row) {
      if (!row || !row.id) return
      await this.$confirm('确认删除该映射吗？', '提示', { type: 'warning' })
      const res = await deletePurchaseSupplierMaterialMapping(row.id)
      if (res && (res.code === 200 || res.code === 20000)) {
        this.$message.success('删除成功')
        this.fetchList()
      } else {
        this.$message.error((res && res.message) || '删除失败')
      }
    }
  }
}
</script>

<style scoped>
.purchase-supplier-material-mapping {
  padding: 10px;
}
</style>
