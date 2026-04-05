<template>
  <div class="app-container">
    <el-card shadow="never">
      <div slot="header" class="clearfix">
        <span>分切工艺参数管理</span>
        <div style="float: right">
          <el-button type="primary" icon="el-icon-plus" size="small" @click="openAddDialog">新增分切参数</el-button>
        </div>
      </div>

      <el-form :inline="true" :model="queryParams" class="search-form">
        <el-form-item label="总厚度(μm)">
          <el-input v-model.number="queryParams.totalThickness" type="number" placeholder="请输入总厚度" clearable style="width: 150px" />
        </el-form-item>
        <el-form-item label="长度(m)">
          <el-input v-model.number="queryParams.processLength" type="number" placeholder="请输入长度" clearable style="width: 150px" />
        </el-form-item>
        <el-form-item label="宽度(mm)">
          <el-input v-model.number="queryParams.processWidth" type="number" placeholder="请输入宽度" clearable style="width: 150px" />
        </el-form-item>
        <el-form-item label="设备编码">
          <el-input v-model="queryParams.equipmentCode" placeholder="如 SL-01" clearable style="width: 140px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="el-icon-search" @click="loadList">搜 索</el-button>
          <el-button icon="el-icon-refresh-left" @click="resetQuery">重 置</el-button>
        </el-form-item>
      </el-form>

      <el-table v-loading="loading" :data="dataList" border stripe style="margin-top: 15px">
        <el-table-column type="index" label="序号" width="60" align="center" />
        <el-table-column prop="equipmentCode" label="设备编码" width="110" />
        <el-table-column prop="totalThickness" label="总厚度(μm)" width="120" />
        <el-table-column prop="processLength" label="长度(m)" width="110" />
        <el-table-column prop="processWidth" label="宽度(mm)" width="110" />
        <el-table-column label="生产速度(卷/分)" width="130">
          <template slot-scope="{ row }">{{ row.productionSpeed || row.slittingSpeed }}</template>
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
      <el-form ref="form" :model="form" :rules="rules" label-width="130px">
        <el-row :gutter="20">
          <el-col :span="24">
            <el-form-item label="设备编码">
              <el-input v-model="form.equipmentCode" placeholder="如 SL-01（可选）" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="总厚度" prop="totalThickness">
              <el-input v-model.number="form.totalThickness" type="number" placeholder="μm" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="长度" prop="processLength">
              <el-input v-model.number="form.processLength" type="number" placeholder="m" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="宽度" prop="processWidth">
              <el-input v-model.number="form.processWidth" type="number" placeholder="mm" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="生产速度(卷/分)" prop="productionSpeed">
              <el-input v-model.number="form.productionSpeed" type="number" placeholder="卷/分" />
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
  getSlittingProcessParamsList,
  getSlittingProcessParamsById,
  addSlittingProcessParams,
  updateSlittingProcessParams,
  deleteSlittingProcessParams
} from '@/api/slittingProcessParams'

export default {
  name: 'SlittingProcessParamsPage',
  data() {
    return {
      loading: false,
      dataList: [],
      total: 0,
      queryParams: {
        totalThickness: null,
        processLength: null,
        processWidth: null,
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
        totalThickness: [{ required: true, message: '请输入总厚度', trigger: 'blur' }],
        processLength: [{ required: true, message: '请输入长度', trigger: 'blur' }],
        processWidth: [{ required: true, message: '请输入宽度', trigger: 'blur' }],
        productionSpeed: [{ required: true, message: '请输入生产速度', trigger: 'blur' }]
      }
    }
  },
  created() {
    this.loadList()
  },
  methods: {
    getEmptyForm() {
      return {
        equipmentCode: '',
        totalThickness: 50,
        processLength: 1000,
        processWidth: 100,
        productionSpeed: 90,
        slittingSpeed: 90,
        setupTime: 15,
        firstCheckTime: 10,
        lastCheckTime: 5,
        remark: ''
      }
    },
    async loadList() {
      this.loading = true
      try {
        const res = await getSlittingProcessParamsList(this.queryParams)
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
        totalThickness: null,
        processLength: null,
        processWidth: null,
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
    openAddDialog() {
      this.dialogTitle = '新增分切工艺参数'
      this.isEditing = false
      this.form = this.getEmptyForm()
      this.dialogVisible = true
    },
    async openEditDialog(row) {
      this.dialogTitle = '编辑分切工艺参数'
      this.isEditing = true
      const res = await getSlittingProcessParamsById(row.id)
      this.form = {
        ...this.getEmptyForm(),
        ...res.data,
        productionSpeed: res.data?.productionSpeed || res.data?.slittingSpeed || res.data?.slitting_speed,
        slittingSpeed: res.data?.slittingSpeed || res.data?.productionSpeed || res.data?.production_speed
      }
      this.dialogVisible = true
    },
    async submitForm() {
      this.$refs.form.validate(async valid => {
        if (!valid) return
        this.submitting = true
        try {
          const payload = {
            ...this.form,
            slittingSpeed: this.form.productionSpeed
          }
          if (this.isEditing) {
            await updateSlittingProcessParams(this.form.id, payload)
          } else {
            await addSlittingProcessParams(payload)
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
        await deleteSlittingProcessParams(row.id)
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
