<template>
  <div class="app-container">
    <el-card shadow="never">
      <div slot="header" class="clearfix">
        <span>涂布工艺参数管理</span>
        <div style="float: right">
          <el-button type="primary" icon="el-icon-plus" size="small" @click="openAddDialog">新增涂布参数</el-button>
        </div>
      </div>

      <el-form :inline="true" :model="queryParams" class="search-form">
        <el-form-item label="产品料号">
          <el-select
            v-model="queryParams.materialCode"
            filterable
            remote
            clearable
            reserve-keyword
            placeholder="请输入并选择研发表料号"
            :remote-method="searchQueryMaterial"
            :loading="queryMaterialLoading"
            style="width: 260px"
          >
            <el-option
              v-for="item in queryMaterialOptions"
              :key="item.materialCode"
              :label="item.materialCode + ' - ' + (item.productName || item.materialName || '')"
              :value="item.materialCode"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="设备编码">
          <el-input v-model="queryParams.equipmentCode" placeholder="如 TB-01" clearable style="width: 140px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="el-icon-search" @click="loadList">搜 索</el-button>
          <el-button icon="el-icon-refresh-left" @click="resetQuery">重 置</el-button>
        </el-form-item>
      </el-form>

      <el-table v-loading="loading" :data="dataList" border stripe style="margin-top: 15px">
        <el-table-column type="index" label="序号" width="60" align="center" />
        <el-table-column prop="materialCode" label="产品料号" width="160" />
        <el-table-column prop="materialName" label="产品名称" width="220" show-overflow-tooltip />
        <el-table-column prop="equipmentCode" label="设备编码" width="110" />
        <el-table-column label="主要参数" min-width="300">
          <template slot-scope="{ row }">
            <span>速度: {{ row.coatingSpeed }}米/分</span>
            <span style="margin-left: 12px">温度: {{ row.ovenTemp }}℃</span>
            <span style="margin-left: 12px">厚度: {{ row.coatingThickness }}μm</span>
          </template>
        </el-table-column>
        <el-table-column label="换产时间" width="160">
          <template slot-scope="{ row }">
            换色: {{ row.colorChangeTime }}分 / 换厚: {{ row.thicknessChangeTime }}分
          </template>
        </el-table-column>
        <el-table-column prop="setupTime" label="准备时间" width="90">
          <template slot-scope="{ row }">{{ row.setupTime }}分钟</template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" show-overflow-tooltip />
        <el-table-column label="操作" width="140" fixed="right">
          <template slot-scope="{ row }">
            <el-button type="text" size="small" @click="openEditDialog(row)">编辑</el-button>
            <el-button type="text" size="small" style="color: #F56C6C" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        style="margin-top: 15px; text-align: right"
        :current-page="queryParams.page"
        :page-sizes="[10, 20, 50, 100]"
        :page-size="queryParams.size"
        :total="total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handlePageChange"
      />
    </el-card>

    <el-dialog :title="dialogTitle" :visible.sync="dialogVisible" width="700px" @close="resetForm">
      <el-form ref="form" :model="form" :rules="rules" label-width="120px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="产品料号" prop="materialCode">
              <el-select
                v-model="form.materialCode"
                filterable
                remote
                clearable
                reserve-keyword
                placeholder="请输入并选择研发表料号"
                :remote-method="searchMaterial"
                :loading="materialLoading"
                style="width: 100%"
                :disabled="isEditing"
              >
                <el-option
                  v-for="item in materialOptions"
                  :key="item.materialCode"
                  :label="item.materialCode + ' - ' + item.materialName"
                  :value="item.materialCode"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="设备编码">
              <el-input v-model="form.equipmentCode" placeholder="如 TB-01（可选）" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">涂布参数</el-divider>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="涂布速度" prop="coatingSpeed">
              <el-input v-model.number="form.coatingSpeed" type="number" placeholder="米/分" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="烘箱温度" prop="ovenTemp">
              <el-input v-model.number="form.ovenTemp" type="number" placeholder="℃" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="涂布厚度" prop="coatingThickness">
              <el-input v-model.number="form.coatingThickness" type="number" placeholder="μm" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="换色时间" prop="colorChangeTime">
              <el-input v-model.number="form.colorChangeTime" type="number" placeholder="分钟" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="换厚度时间" prop="thicknessChangeTime">
              <el-input v-model.number="form.thicknessChangeTime" type="number" placeholder="分钟" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="准备时间">
              <el-input v-model.number="form.setupTime" type="number" placeholder="分钟" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="请输入备注" />
        </el-form-item>
      </el-form>
      <div slot="footer">
        <el-button @click="dialogVisible = false">取 消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitForm">确 定</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import {
  getProcessParamsList,
  getProcessParamsById,
  addProcessParams,
  updateProcessParams,
  deleteProcessParams
} from '@/api/processParams'
import { getTapeSpecList, getSpecByMaterialCode } from '@/api/tapeSpec'

export default {
  name: 'CoatingProcessParams',
  data() {
    return {
      loading: false,
      dataList: [],
      total: 0,
      queryParams: {
        materialCode: '',
        processType: 'COATING',
        equipmentCode: '',
        page: 1,
        size: 10
      },
      dialogVisible: false,
      dialogTitle: '',
      isEditing: false,
      submitting: false,
      form: this.getEmptyForm(),
      rules: {
        materialCode: [{ required: true, message: '请选择研发表中的产品料号', trigger: 'change' }],
        coatingSpeed: [{ required: true, message: '请输入涂布速度', trigger: 'blur' }],
        coatingThickness: [{ required: true, message: '请输入涂布厚度', trigger: 'blur' }]
      },
      queryMaterialLoading: false,
      queryMaterialOptions: [],
      materialLoading: false,
      materialOptions: []
    }
  },
  created() {
    this.loadList()
  },
  methods: {
    getEmptyForm() {
      return {
        materialCode: '',
        processType: 'COATING',
        equipmentCode: '',
        coatingSpeed: 40,
        ovenTemp: 120,
        coatingThickness: 30,
        colorChangeTime: 30,
        thicknessChangeTime: 20,
        setupTime: 15,
        firstCheckTime: 10,
        lastCheckTime: 5,
        remark: ''
      }
    },
    async loadList() {
      this.loading = true
      try {
        const res = await getProcessParamsList(this.queryParams)
        this.dataList = res.data?.list || []
        this.total = Number(res.data?.total) || 0
        this.queryParams.page = Number(res.data?.page) || this.queryParams.page
        this.queryParams.size = Number(res.data?.size) || this.queryParams.size
      } finally {
        this.loading = false
      }
    },
    resetQuery() {
      this.queryParams = {
        materialCode: '',
        processType: 'COATING',
        equipmentCode: '',
        page: 1,
        size: 10
      }
      this.loadList()
    },
    handleSizeChange(size) {
      this.queryParams.size = size
      this.loadList()
    },
    handlePageChange(page) {
      this.queryParams.page = page
      this.loadList()
    },
    async searchQueryMaterial(query) {
      if (!query || query.length < 1) {
        this.queryMaterialOptions = []
        return
      }
      this.queryMaterialLoading = true
      try {
        const res = await getTapeSpecList({ materialCode: query, status: 1, page: 1, size: 20 })
        this.queryMaterialOptions = res.data?.records || res.data?.list || []
      } finally {
        this.queryMaterialLoading = false
      }
    },
    async searchMaterial(query) {
      if (!query || query.length < 1) {
        this.materialOptions = []
        return
      }
      this.materialLoading = true
      try {
        const res = await getTapeSpecList({ materialCode: query, status: 1, page: 1, size: 20 })
        this.materialOptions = res.data?.records || res.data?.list || []
      } finally {
        this.materialLoading = false
      }
    },
    openAddDialog() {
      this.dialogTitle = '新增涂布工艺参数'
      this.isEditing = false
      this.form = this.getEmptyForm()
      this.materialOptions = []
      this.dialogVisible = true
    },
    async openEditDialog(row) {
      this.dialogTitle = '编辑涂布工艺参数'
      this.isEditing = true
      const res = await getProcessParamsById(row.id)
      this.form = {
        ...this.getEmptyForm(),
        ...res.data,
        processType: 'COATING'
      }
      this.materialOptions = [{ materialCode: row.materialCode, materialName: row.materialName || '' }]
      this.dialogVisible = true
    },
    async submitForm() {
      this.$refs.form.validate(async valid => {
        if (!valid) return
        this.submitting = true
        try {
          const specRes = await getSpecByMaterialCode(this.form.materialCode)
          if (!(specRes && (specRes.code === 20000 || specRes.code === 200) && specRes.data && specRes.data.status === 1)) {
            this.$message.error('料号不在研发表中或未启用，请先在研发表维护')
            return
          }

          const payload = { ...this.form, processType: 'COATING' }
          if (this.isEditing) {
            await updateProcessParams(this.form.id, payload)
          } else {
            await addProcessParams(payload)
          }
          this.$message.success(this.isEditing ? '更新成功' : '新增成功')
          this.dialogVisible = false
          this.loadList()
        } catch (error) {
          this.$message.error(error.message || '操作失败')
        } finally {
          this.submitting = false
        }
      })
    },
    resetForm() {
      this.$refs.form?.resetFields()
    },
    handleDelete(row) {
      this.$confirm('确定删除该工艺参数吗？', '提示', { type: 'warning' }).then(async() => {
        await deleteProcessParams(row.id)
        this.$message.success('删除成功')
        this.loadList()
      }).catch(() => {})
    }
  }
}
</script>

<style lang="scss" scoped>
.search-form {
  .el-form-item {
    margin-bottom: 0;
  }
}
</style>
