<template>
  <div class="app-container">
    <el-card shadow="never">
      <div slot="header" class="clearfix">
        <span>复卷工艺参数管理</span>
        <div style="float: right">
          <el-button type="primary" icon="el-icon-plus" size="small" @click="openAddDialog">新增复卷参数</el-button>
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
          <el-select
            v-model="queryParams.equipmentCode"
            filterable
            clearable
            placeholder="请选择设备"
            style="width: 180px"
          >
            <el-option
              v-for="eq in rewindingEquipmentOptions"
              :key="eq.equipmentCode"
              :label="(eq.equipmentCode || '') + (eq.equipmentName ? ' - ' + eq.equipmentName : '')"
              :value="eq.equipmentCode"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="el-icon-search" @click="loadList">搜 索</el-button>
          <el-button icon="el-icon-refresh-left" @click="resetQuery">重 置</el-button>
        </el-form-item>
      </el-form>

      <el-table v-loading="loading" :data="dataList" border stripe style="margin-top: 15px">
        <el-table-column type="index" label="序号" width="60" align="center" />
        <el-table-column prop="materialCode" label="产品料号" width="170" />
        <el-table-column prop="materialName" label="产品名称" width="240" show-overflow-tooltip />
        <el-table-column prop="equipmentCode" label="设备编码" width="110" />
        <el-table-column prop="rewindingSpeed" label="复卷速度(米/分)" width="140" />
        <el-table-column prop="rollChangeTime" label="换卷时间(分钟)" width="130" />
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

    <el-dialog :title="dialogTitle" :visible.sync="dialogVisible" width="640px" @close="resetForm">
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
              <el-select
                v-model="form.equipmentCode"
                filterable
                clearable
                placeholder="请选择复卷设备（可选）"
                style="width: 100%"
              >
                <el-option
                  v-for="eq in rewindingEquipmentOptions"
                  :key="eq.equipmentCode"
                  :label="(eq.equipmentCode || '') + (eq.equipmentName ? ' - ' + eq.equipmentName : '')"
                  :value="eq.equipmentCode"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="复卷速度" prop="rewindingSpeed">
              <el-input v-model.number="form.rewindingSpeed" type="number" placeholder="米/分" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="换卷时间" prop="rollChangeTime">
              <el-input v-model.number="form.rollChangeTime" type="number" placeholder="分钟" />
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
  getRewindingProcessParamsList,
  getRewindingProcessParamsById,
  addRewindingProcessParams,
  updateRewindingProcessParams,
  deleteRewindingProcessParams
} from '@/api/rewindingProcessParams'
import { getTapeSpecList, getSpecByMaterialCode } from '@/api/tapeSpec'
import { getEquipmentList } from '@/api/equipment'

export default {
  name: 'RewindingProcessParamsPage',
  data() {
    return {
      loading: false,
      dataList: [],
      total: 0,
      queryParams: {
        materialCode: '',
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
        rewindingSpeed: [{ required: true, message: '请输入复卷速度', trigger: 'blur' }],
        rollChangeTime: [{ required: true, message: '请输入换卷时间', trigger: 'blur' }]
      },
      queryMaterialLoading: false,
      queryMaterialOptions: [],
      materialLoading: false,
      materialOptions: [],
      rewindingEquipmentOptions: []
    }
  },
  created() {
    this.loadRewindingEquipmentOptions()
    this.loadList()
  },
  methods: {
    getEmptyForm() {
      return {
        materialCode: '',
        equipmentCode: '',
        rewindingSpeed: 60,
        rollChangeTime: 8,
        tensionSetting: 10,
        setupTime: 15,
        firstCheckTime: 10,
        lastCheckTime: 5,
        remark: ''
      }
    },
    async loadRewindingEquipmentOptions() {
      try {
        const res = await getEquipmentList({ equipmentType: 'rewinding', pageSize: 200 })
        if (res && (res.code === 200 || res.code === 20000)) {
          const records = res.data?.records || res.data?.list || res.data || []
          this.rewindingEquipmentOptions = (records || [])
            .map(item => ({
              equipmentCode: item.equipmentCode || item.equipment_code || '',
              equipmentName: item.equipmentName || item.equipment_name || ''
            }))
            .filter(item => item.equipmentCode)
        }
      } catch (e) {
        this.rewindingEquipmentOptions = []
      }
    },
    async loadList() {
      this.loading = true
      try {
        const res = await getRewindingProcessParamsList(this.queryParams)
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
      this.dialogTitle = '新增复卷工艺参数'
      this.isEditing = false
      this.form = this.getEmptyForm()
      this.materialOptions = []
      this.dialogVisible = true
    },
    async openEditDialog(row) {
      this.dialogTitle = '编辑复卷工艺参数'
      this.isEditing = true
      const res = await getRewindingProcessParamsById(row.id)
      this.form = { ...this.getEmptyForm(), ...res.data }
      this.materialOptions = [{ materialCode: row.materialCode, materialName: row.materialName || '' }]
      this.dialogVisible = true
    },
    async submitForm() {
      this.$refs.form.validate(async valid => {
        if (!valid) return
        this.submitting = true
        try {
          const specRes = await getSpecByMaterialCode(this.form.materialCode)
          if (!(specRes && (specRes.code === 20000 || specRes.code === 200) && specRes.data)) {
            this.$message.error('料号不在研发表中，请先在研发表维护')
            return
          }

          if (this.isEditing) {
            await updateRewindingProcessParams(this.form.id, this.form)
          } else {
            await addRewindingProcessParams(this.form)
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
        await deleteRewindingProcessParams(row.id)
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
