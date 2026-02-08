<template>
  <div class="app-container">
    <el-card shadow="never">
      <div slot="header" class="clearfix">
        <span>工艺参数管理</span>        <div style="float: right">
          <el-button v-if="$canImportExport()" type="success" icon="el-icon-download" size="small" @click="handleDownloadTemplate">下载模板</el-button>
          <el-button v-if="$canImportExport()" type="warning" icon="el-icon-upload2" size="small" @click="handleImport">导入</el-button>
          <el-button v-if="$canImportExport()" type="info" icon="el-icon-download" size="small" @click="handleExport">导出</el-button>
          <el-button type="primary" icon="el-icon-plus" size="small" @click="openAddDialog">新增参数</el-button>
        </div>
      </div>

      <!-- 搜索区域 -->
      <el-form :inline="true" :model="queryParams" class="search-form">
        <el-form-item label="产品料号">
          <el-input v-model="queryParams.materialCode" placeholder="请输入料号" clearable style="width: 160px" />
        </el-form-item>
        <el-form-item label="工序类型">
          <el-select v-model="queryParams.processType" placeholder="全部工序" clearable style="width: 120px">
            <el-option label="涂布" value="COATING" />
            <el-option label="复卷" value="REWINDING" />
            <el-option label="分切" value="SLITTING" />
            <el-option label="分条" value="STRIPPING" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="el-icon-search" @click="loadList">搜 索</el-button>
          <el-button icon="el-icon-refresh-left" @click="resetQuery">重 置</el-button>
        </el-form-item>
      </el-form>

      <!-- 隐藏的文件上传 -->
      <input ref="fileInput" type="file" accept=".xlsx,.xls" style="display:none" @change="onFileChange">

      <!-- 参数表格 -->
      <el-table v-loading="loading" :data="dataList" border stripe style="margin-top: 15px">
        <el-table-column type="index" label="序号" width="60" align="center" />
        <el-table-column prop="materialCode" label="产品料号" width="140" />
        <el-table-column prop="materialName" label="产品名称" width="180" show-overflow-tooltip />
        <el-table-column prop="processTypeName" label="工序类型" width="100">
          <template slot-scope="{ row }">
            <el-tag :type="getProcessTypeTag(row.processType)">{{ row.processTypeName }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="主要参数" min-width="280">
          <template slot-scope="{ row }">
            <div v-if="row.processType === 'COATING'">
              <span>速度: {{ row.coatingSpeed }}米/分</span>
              <span style="margin-left: 10px">温度: {{ row.ovenTemp }}℃</span>
              <span style="margin-left: 10px">厚度: {{ row.coatingThickness }}μm</span>
            </div>
            <div v-else-if="row.processType === 'REWINDING'">
              <span>速度: {{ row.rewindingSpeed }}米/分</span>
              <span style="margin-left: 10px">张力: {{ row.tensionSetting }}</span>
            </div>
            <div v-else-if="row.processType === 'SLITTING'">
              <span>速度: {{ row.slittingSpeed }}米/分</span>
              <span style="margin-left: 10px">最小宽度: {{ row.minSlitWidth }}mm</span>
              <span style="margin-left: 10px">最大刀数: {{ row.maxBlades }}</span>
            </div>
            <div v-else-if="row.processType === 'STRIPPING'">
              <span>速度: {{ row.strippingSpeed }}米/分</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="换产时间" width="150">
          <template slot-scope="{ row }">
            <div v-if="row.processType === 'COATING'">
              换色: {{ row.colorChangeTime }}分 / 换厚: {{ row.thicknessChangeTime }}分
            </div>
            <div v-else-if="row.processType === 'REWINDING'">
              换卷: {{ row.rollChangeTime }}分
            </div>
            <div v-else-if="row.processType === 'SLITTING'">
              换刀: {{ row.bladeChangeTime }}分
            </div>
            <div v-else>
              -
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="setupTime" label="准备时间" width="90">
          <template slot-scope="{ row }">{{ row.setupTime }}分钟</template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" show-overflow-tooltip />
        <el-table-column label="操作" width="150" fixed="right">
          <template slot-scope="{ row }">
            <el-button type="text" size="small" @click="openEditDialog(row)">编辑</el-button>
            <el-button type="text" size="small" style="color: #F56C6C" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
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

    <!-- 新增/编辑对话框 -->
    <el-dialog :title="dialogTitle" :visible.sync="dialogVisible" width="700px" @close="resetForm">
      <el-form ref="form" :model="form" :rules="rules" label-width="120px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="产品料号" prop="materialCode">
              <el-select
                v-model="form.materialCode"
                filterable
                remote
                reserve-keyword
                placeholder="输入料号搜索"
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
            <el-form-item label="工序类型" prop="processType">
              <el-select v-model="form.processType" placeholder="请选择工序类型" style="width: 100%" :disabled="isEditing" @change="handleProcessTypeChange">
                <el-option label="涂布" value="COATING" />
                <el-option label="复卷" value="REWINDING" />
                <el-option label="分切" value="SLITTING" />
                <el-option label="分条" value="STRIPPING" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 涂布参数 -->
        <template v-if="form.processType === 'COATING'">
          <el-divider content-position="left">涂布参数</el-divider>
          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item label="涂布速度">
                <el-input-number v-model="form.coatingSpeed" :min="0" :precision="1" style="width: 100%" />
                <span class="unit">米/分</span>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="烘箱温度">
                <el-input-number v-model="form.ovenTemp" :min="0" :precision="1" style="width: 100%" />
                <span class="unit">℃</span>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="涂布厚度">
                <el-input-number v-model="form.coatingThickness" :min="0" :precision="3" style="width: 100%" />
                <span class="unit">μm</span>
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item label="换色时间">
                <el-input-number v-model="form.colorChangeTime" :min="0" style="width: 100%" />
                <span class="unit">分钟</span>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="换厚度时间">
                <el-input-number v-model="form.thicknessChangeTime" :min="0" style="width: 100%" />
                <span class="unit">分钟</span>
              </el-form-item>
            </el-col>
          </el-row>
        </template>

        <!-- 复卷参数 -->
        <template v-if="form.processType === 'REWINDING'">
          <el-divider content-position="left">复卷参数</el-divider>
          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item label="复卷速度">
                <el-input-number v-model="form.rewindingSpeed" :min="0" :precision="1" style="width: 100%" />
                <span class="unit">米/分</span>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="张力设定">
                <el-input-number v-model="form.tensionSetting" :min="0" :precision="2" style="width: 100%" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="换卷时间">
                <el-input-number v-model="form.rollChangeTime" :min="0" style="width: 100%" />
                <span class="unit">分钟</span>
              </el-form-item>
            </el-col>
          </el-row>
        </template>

        <!-- 分切参数 -->
        <template v-if="form.processType === 'SLITTING'">
          <el-divider content-position="left">分切参数</el-divider>
          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item label="分切速度">
                <el-input-number v-model="form.slittingSpeed" :min="0" :precision="1" style="width: 100%" />
                <span class="unit">米/分</span>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="刀片类型">
                <el-input v-model="form.bladeType" placeholder="刀片类型" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="换刀时间">
                <el-input-number v-model="form.bladeChangeTime" :min="0" style="width: 100%" />
                <span class="unit">分钟</span>
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item label="最小分切宽度">
                <el-input-number v-model="form.minSlitWidth" :min="0" style="width: 100%" />
                <span class="unit">mm</span>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="最大刀数">
                <el-input-number v-model="form.maxBlades" :min="1" style="width: 100%" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="首尾损耗">
                <el-input-number v-model="form.edgeLoss" :min="0" style="width: 100%" />
                <span class="unit">mm</span>
              </el-form-item>
            </el-col>
          </el-row>
        </template>

        <!-- 分条参数 -->
        <template v-if="form.processType === 'STRIPPING'">
          <el-divider content-position="left">分条参数</el-divider>
          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item label="分条速度">
                <el-input-number v-model="form.strippingSpeed" :min="0" :precision="1" style="width: 100%" />
                <span class="unit">米/分</span>
              </el-form-item>
            </el-col>
          </el-row>
        </template>

        <!-- 通用参数 -->
        <el-divider content-position="left">通用参数</el-divider>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="准备时间">
              <el-input-number v-model="form.setupTime" :min="0" style="width: 100%" />
              <span class="unit">分钟</span>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="首检时间">
              <el-input-number v-model="form.firstCheckTime" :min="0" style="width: 100%" />
              <span class="unit">分钟</span>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="末检时间">
              <el-input-number v-model="form.lastCheckTime" :min="0" style="width: 100%" />
              <span class="unit">分钟</span>
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
  deleteProcessParams,
  importProcessParams
} from '@/api/processParams'
import { getTapeSpecList } from '@/api/tapeSpec'

export default {
  name: 'ProcessParams',
  data() {
    return {
      loading: false,
      dataList: [],
      total: 0,
      queryParams: {
        materialCode: '',
        processType: '',
        page: 1,
        size: 10
      },

      // 对话框
      dialogVisible: false,
      dialogTitle: '',
      isEditing: false,
      submitting: false,
      form: this.getEmptyForm(),
      rules: {
        materialCode: [{ required: true, message: '请选择产品料号', trigger: 'change' }],
        processType: [{ required: true, message: '请选择工序类型', trigger: 'change' }]
      },

      // 料号搜索
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
        processType: '',
        coatingSpeed: 20,
        ovenTemp: 80,
        coatingThickness: 50,
        colorChangeTime: 30,
        thicknessChangeTime: 20,
        rewindingSpeed: 50,
        tensionSetting: 10,
        rollChangeTime: 5,
        slittingSpeed: 80,
        bladeType: '',
        bladeChangeTime: 15,
        minSlitWidth: 10,
        maxBlades: 20,
        edgeLoss: 10,
        strippingSpeed: 60, setupTime: 15,
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
        // 确保total字段为数字类型
        this.total = Number(res.data?.total) || 0
        this.queryParams.page = Number(res.data?.page) || this.queryParams.page
        this.queryParams.size = Number(res.data?.size) || this.queryParams.size
      } catch (error) {
        this.$message.error('加载数据失败')
      } finally {
        this.loading = false
      }
    },

    resetQuery() {
      this.queryParams = {
        materialCode: '',
        processType: '',
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

    // 搜索料号
    async searchMaterial(query) {
      if (query.length < 1) {
        this.materialOptions = []
        return
      }
      this.materialLoading = true
      try {
        const res = await getTapeSpecList({ keyword: query, page: 1, size: 20 })
        this.materialOptions = res.data?.list || []
      } catch (error) {
        console.error('搜索料号失败', error)
      } finally {
        this.materialLoading = false
      }
    },

    getProcessTypeTag(type) {
      const map = {
        COATING: 'danger',
        REWINDING: 'warning',
        SLITTING: 'success',
        STRIPPING: ''
      }
      return map[type] || 'info'
    },

    handleProcessTypeChange() {
      // 切换工序类型时可以设置默认值
    },

    openAddDialog() {
      this.dialogTitle = '新增工艺参数'
      this.isEditing = false
      this.form = this.getEmptyForm()
      this.materialOptions = []
      this.dialogVisible = true
    },

    async openEditDialog(row) {
      this.dialogTitle = '编辑工艺参数'
      this.isEditing = true
      const res = await getProcessParamsById(row.id)
      this.form = { ...res.data }
      // 预设料号选项
      this.materialOptions = [{ materialCode: row.materialCode, materialName: row.materialName || '' }]
      this.dialogVisible = true
    },

    async submitForm() {
      this.$refs.form.validate(async valid => {
        if (!valid) return
        this.submitting = true
        try {
          if (this.isEditing) {
            await updateProcessParams(this.form.id, this.form)
            this.$message.success('更新成功')
          } else {
            await addProcessParams(this.form)
            this.$message.success('新增成功')
          }
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
    }, handleDelete(row) {
      this.$confirm(`确定删除该工艺参数吗？`, '提示', {
        type: 'warning'
      }).then(async() => {
        await deleteProcessParams(row.id)
        this.$message.success('删除成功')
        this.loadList()
      }).catch(() => {})
    },

    // ==================== 导入导出 ====================
    handleDownloadTemplate() {
      import('@/vendor/Export2Excel').then(excel => {
        const header = ['产品料号', '产品名称', '工序类型(COATING/REWINDING/SLITTING/STRIPPING)', '涂布速度', '烘箱温度', '涂布厚度', '复卷速度', '张力设置', '分切速度', '最小宽度', '最大刀数', '准备时间(分)', '备注']
        const data = [['1011-R02-2307', '30u无机翠绿PET胶带', 'COATING', 50, 120, 30, '', '', '', '', '', 15, '']]
        excel.export_json_to_excel({
          header,
          data,
          filename: '工艺参数导入模板',
          bookType: 'xlsx'
        })
      })
    },
    handleImport() {
      this.$refs.fileInput.click()
    },
    async onFileChange(e) {
      const file = e.target.files[0]
      if (!file) return

      const formData = new FormData()
      formData.append('file', file)

      try {
        const res = await importProcessParams(formData)
        if (res && res.code === 200) {
          this.$message.success(`导入成功：${res.data?.successCount || 0}条，失败：${res.data?.failCount || 0}条`)
          this.loadList()
        } else {
          this.$message.error(res.message || '导入失败')
        }
      } catch (e) {
        this.$message.error('导入失败')
      } finally {
        this.$refs.fileInput.value = ''
      }
    },
    handleExport() {
      import('@/vendor/Export2Excel').then(excel => {
        const header = ['产品料号', '产品名称', '工序类型', '涂布速度', '烘箱温度', '涂布厚度', '复卷速度', '张力设置', '分切速度', '最小宽度', '准备时间(分)', '备注']
        const data = this.dataList.map(item => [
          item.materialCode,
          item.materialName,
          item.processTypeName,
          item.coatingSpeed,
          item.ovenTemp,
          item.coatingThickness,
          item.rewindingSpeed,
          item.tensionSetting,
          item.slittingSpeed,
          item.minSlitWidth,
          item.setupTime,
          item.remark
        ])
        excel.export_json_to_excel({
          header,
          data,
          filename: `工艺参数_${new Date().toLocaleDateString().replace(/\//g, '-')}`,
          bookType: 'xlsx'
        })
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.search-card {
  margin-bottom: 10px;
}
.search-form {
  .el-form-item {
    margin-bottom: 0;
  }
}
.table-toolbar {
  margin-bottom: 10px;
}
.unit {
  margin-left: 5px;
  color: #909399;
  font-size: 12px;
}
</style>
