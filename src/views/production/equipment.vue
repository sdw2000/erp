<template>
  <div class="equipment-management">    <el-card>
                                          <div slot="header" class="clearfix">
                                            <span>设备管理</span>        <div style="float: right">
                                              <el-button v-if="$canImportExport()" type="success" icon="el-icon-download" size="small" @click="handleDownloadTemplate">下载模板</el-button>
                                              <el-button v-if="$canImportExport()" type="warning" icon="el-icon-upload2" size="small" @click="handleImport">导入</el-button>
                                              <el-button v-if="$canImportExport()" type="info" icon="el-icon-download" size="small" @click="handleExport">导出</el-button>
                                              <el-button type="primary" icon="el-icon-plus" size="small" @click="handleAdd">新增设备</el-button>
                                            </div>
                                          </div>

                                          <!-- 搜索区域 -->
                                          <div class="search-area">
                                            <el-form :inline="true" :model="searchForm" class="search-form">
                                              <el-form-item label="设备类型">
                                                <el-select v-model="searchForm.equipmentType" placeholder="全部类型" clearable style="width: 140px">
                                                  <el-option v-for="item in equipmentTypes" :key="item.typeCode" :label="item.typeName" :value="item.typeCode" />
                                                </el-select>
                                              </el-form-item>
                                              <el-form-item label="所属车间">
                                                <el-select v-model="searchForm.workshopId" placeholder="全部车间" clearable style="width: 140px">
                                                  <el-option v-for="item in workshops" :key="item.id" :label="item.workshopName" :value="item.id" />
                                                </el-select>
                                              </el-form-item>
                                              <el-form-item label="设备状态">
                                                <el-select v-model="searchForm.status" placeholder="全部状态" clearable style="width: 120px">
                                                  <el-option label="正常" value="normal" />
                                                  <el-option label="维护中" value="maintenance" />
                                                  <el-option label="故障" value="fault" />
                                                </el-select>
                                              </el-form-item>
                                              <el-form-item label="关键字">
                                                <el-input v-model="searchForm.keyword" placeholder="设备编号/名称" clearable style="width: 160px" @keyup.enter.native="handleSearch" />
                                              </el-form-item>
                                              <el-form-item>
                                                <el-button type="primary" icon="el-icon-search" @click="handleSearch">搜 索</el-button>
                                                <el-button icon="el-icon-refresh-left" @click="handleReset">重 置</el-button>
                                              </el-form-item>
                                            </el-form>
                                          </div>

                                          <!-- 隐藏的文件上传 -->
                                          <input ref="fileInput" type="file" accept=".xlsx,.xls" style="display:none" @change="onFileChange">

                                          <!-- 数据表格 -->
                                          <el-table :data="equipmentList" stripe border style="width: 100%; margin-top: 15px">
                                            <el-table-column type="index" label="序号" width="60" align="center">
                                              <template slot-scope="scope">
                                                {{ (pagination.pageNum - 1) * pagination.pageSize + scope.$index + 1 }}
                                              </template>
                                            </el-table-column>
                                            <el-table-column prop="equipmentCode" label="设备编号" width="120" />
                                            <el-table-column prop="equipmentName" label="设备名称" width="150" />
                                            <el-table-column prop="equipmentTypeName" label="设备类型" width="100" />
                                            <el-table-column prop="workshopName" label="所属车间" width="120" />
                                            <el-table-column prop="maxWidth" label="最大宽度(mm)" width="120" align="right" />
                                            <el-table-column prop="maxSpeed" label="最大速度(m/min)" width="130" align="right" />
                                            <el-table-column label="状态" width="100" align="center">
                                              <template slot-scope="scope">
                                                <el-tag :type="getStatusType(scope.row.status)">{{ getStatusText(scope.row.status) }}</el-tag>
                                              </template>
                                            </el-table-column>
                                            <el-table-column prop="location" label="位置" min-width="120" />
                                            <el-table-column label="操作" width="240" align="center" fixed="right">
                                              <template slot-scope="scope">
                                                <el-button size="mini" type="primary" @click="handleEdit(scope.row)">编辑</el-button>
                                                <el-dropdown style="margin-left: 8px" @command="(cmd) => handleStatusChange(scope.row, cmd)">
                                                  <el-button size="mini">
                                                    状态<i class="el-icon-arrow-down el-icon--right" />
                                                  </el-button>
                                                  <el-dropdown-menu slot="dropdown">
                                                    <el-dropdown-item command="normal">正常</el-dropdown-item>
                                                    <el-dropdown-item command="maintenance">维护中</el-dropdown-item>
                                                    <el-dropdown-item command="fault">故障</el-dropdown-item>
                                                  </el-dropdown-menu>
                                                </el-dropdown>
                                                <el-button size="mini" type="danger" style="margin-left: 8px" @click="handleDelete(scope.row)">删除</el-button>
                                              </template>
                                            </el-table-column>
                                          </el-table>

                                          <!-- 分页组件 -->
                                          <div class="pagination-container" style="margin-top: 15px; text-align: right;">
                                            <el-pagination
                                              :current-page="pagination.pageNum"
                                              :page-sizes="[10, 20, 50, 100]"
                                              :page-size="pagination.pageSize"
                                              layout="total, sizes, prev, pager, next, jumper"
                                              :total="pagination.total"
                                              @size-change="handleSizeChange"
                                              @current-change="handleCurrentChange"
                                            />
                                          </div>
                                        </el-card>

    <!-- 新增/编辑对话框 -->
    <el-dialog :title="dialogType === 'add' ? '新增设备' : '编辑设备'" :visible.sync="dialogVisible" width="600px">
      <el-form ref="form" :model="form" :rules="rules" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="设备编号" prop="equipmentCode">
              <el-input v-model="form.equipmentCode" placeholder="请输入设备编号" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="设备名称" prop="equipmentName">
              <el-input v-model="form.equipmentName" placeholder="请输入设备名称" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="设备类型" prop="equipmentType">
              <el-select v-model="form.equipmentType" placeholder="请选择设备类型" style="width: 100%">
                <el-option v-for="item in equipmentTypes" :key="item.typeCode" :label="item.typeName" :value="item.typeCode" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="所属车间" prop="workshopId">
              <el-select v-model="form.workshopId" placeholder="请选择所属车间" style="width: 100%">
                <el-option v-for="item in workshops" :key="item.id" :label="item.workshopName" :value="item.id" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="品牌">
              <el-input v-model="form.brand" placeholder="请输入品牌" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="型号">
              <el-input v-model="form.model" placeholder="请输入型号" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="最大宽度(mm)">
              <el-input-number v-model="form.maxWidth" :min="0" :max="9999" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="最大速度">
              <el-input-number v-model="form.maxSpeed" :min="0" :precision="2" style="width: 100%" placeholder="米/分钟" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="日产能(㎡)">
              <el-input-number v-model="form.dailyCapacity" :min="0" :precision="2" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="购买日期">
              <el-date-picker v-model="form.purchaseDate" type="date" placeholder="选择日期" value-format="yyyy-MM-dd" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="设备位置">
          <el-input v-model="form.location" placeholder="请输入设备位置" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="请输入备注" />
        </el-form-item>
      </el-form>
      <div slot="footer">
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { getEquipmentList, getEquipmentTypes, getWorkshops, addEquipment, updateEquipment, deleteEquipment, updateEquipmentStatus, importEquipment, exportEquipment, downloadTemplate } from '@/api/equipment'

export default {
  name: 'EquipmentManagement',
  data() {
    return {
      equipmentList: [],
      equipmentTypes: [],
      workshops: [],
      // 分页参数
      pagination: {
        pageNum: 1,
        pageSize: 10,
        total: 0
      },
      searchForm: {
        equipmentType: '',
        workshopId: null,
        status: '',
        keyword: ''
      },
      dialogVisible: false,
      dialogType: 'add',
      form: {
        id: null,
        equipmentCode: '',
        equipmentName: '',
        equipmentType: '',
        workshopId: null,
        brand: '',
        model: '',
        maxWidth: null,
        maxSpeed: null,
        dailyCapacity: null,
        purchaseDate: '',
        location: '',
        remark: ''
      },
      rules: {
        equipmentCode: [{ required: true, message: '请输入设备编号', trigger: 'blur' }],
        equipmentName: [{ required: true, message: '请输入设备名称', trigger: 'blur' }],
        equipmentType: [{ required: true, message: '请选择设备类型', trigger: 'change' }],
        workshopId: [{ required: true, message: '请选择所属车间', trigger: 'change' }]
      }
    }
  },
  created() {
    this.fetchEquipmentTypes()
    this.fetchWorkshops()
    this.fetchList()
  },
  methods: {
    async fetchEquipmentTypes() {
      try {
        const res = await getEquipmentTypes()
        if (res && res.code === 200) {
          this.equipmentTypes = res.data || []
        }
      } catch (e) {
        console.error('获取设备类型失败:', e)
      }
    },
    async fetchWorkshops() {
      try {
        const res = await getWorkshops()
        if (res && res.code === 200) {
          this.workshops = res.data || []
        }
      } catch (e) {
        console.error('获取车间列表失败:', e)
      }
    },
    async fetchList() {
      try {
        const params = {
          ...this.searchForm,
          pageNum: this.pagination.pageNum,
          pageSize: this.pagination.pageSize
        }
        const res = await getEquipmentList(params)
        if (res && res.code === 200) {
          // 适配 MyBatis-Plus IPage 分页结构
          if (res.data && res.data.records) {
            this.equipmentList = res.data.records
            this.pagination.total = res.data.total
          } else {
            // 兼容旧的 List 结构
            this.equipmentList = res.data || []
            this.pagination.total = this.equipmentList.length
          }
        }
      } catch (e) {
        console.error('获取设备列表失败:', e)
        this.$message.error('获取设备列表失败')
      }
    },
    handleSizeChange(val) {
      this.pagination.pageSize = val
      this.fetchList()
    },
    handleCurrentChange(val) {
      this.pagination.pageNum = val
      this.fetchList()
    },
    handleSearch() {
      this.pagination.pageNum = 1
      this.fetchList()
    },
    handleReset() {
      this.searchForm = {
        equipmentType: '',
        workshopId: null,
        status: '',
        keyword: ''
      }
      this.pagination.pageNum = 1
      this.fetchList()
    },
    handleAdd() {
      this.dialogType = 'add'
      this.form = {
        id: null,
        equipmentCode: '',
        equipmentName: '',
        equipmentType: '',
        workshopId: null,
        brand: '',
        model: '',
        maxWidth: null,
        maxSpeed: null,
        dailyCapacity: null,
        purchaseDate: '',
        location: '',
        remark: ''
      }
      this.dialogVisible = true
      this.$nextTick(() => {
        this.$refs.form && this.$refs.form.clearValidate()
      })
    },
    handleEdit(row) {
      this.dialogType = 'edit'
      this.form = { ...row }
      this.dialogVisible = true
      this.$nextTick(() => {
        this.$refs.form && this.$refs.form.clearValidate()
      })
    },
    async handleSubmit() {
      this.$refs.form.validate(async(valid) => {
        if (!valid) return

        try {
          let res
          if (this.dialogType === 'add') {
            res = await addEquipment(this.form)
          } else {
            res = await updateEquipment(this.form)
          }

          if (res && res.code === 200) {
            this.$message.success(this.dialogType === 'add' ? '添加成功' : '修改成功')
            this.dialogVisible = false
            this.fetchList()
          } else {
            this.$message.error(res.message || '操作失败')
          }
        } catch (e) {
          console.error('操作失败:', e)
          this.$message.error('操作失败')
        }
      })
    },
    handleDelete(row) {
      this.$confirm(`确认删除设备"${row.equipmentName}"吗？`, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(async() => {
        try {
          const res = await deleteEquipment(row.id)
          if (res && res.code === 200) {
            this.$message.success('删除成功')
            this.fetchList()
          } else {
            this.$message.error(res.message || '删除失败')
          }
        } catch (e) {
          console.error('删除失败:', e)
          this.$message.error('删除失败')
        }
      }).catch(() => {})
    },
    async handleStatusChange(row, status) {
      try {
        const res = await updateEquipmentStatus(row.id, status)
        if (res && res.code === 200) {
          this.$message.success('状态更新成功')
          this.fetchList()
        } else {
          this.$message.error(res.message || '状态更新失败')
        }
      } catch (e) {
        console.error('状态更新失败:', e)
        this.$message.error('状态更新失败')
      }
    }, getStatusType(status) {
      const map = {
        'normal': 'success',
        'maintenance': 'warning',
        'fault': 'danger'
      }
      return map[status] || 'info'
    },
    getStatusText(status) {
      const map = {
        'normal': '正常',
        'maintenance': '维护中',
        'fault': '故障'
      }
      return map[status] || status
    }, // 下载导入模板
    async handleDownloadTemplate() {
      try {
        const response = await downloadTemplate()
        const blob = new Blob([response], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = '设备导入模板.xlsx'
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        this.$message.success('模板下载成功')
      } catch (e) {
        console.error('模板下载失败:', e)
        this.$message.error('模板下载失败')
      }
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
        const res = await importEquipment(formData)
        if (res && res.code === 200) {
          this.$message.success(`导入成功：${res.data.successCount}条，失败：${res.data.failCount}条`)
          this.fetchList()
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
    async handleExport() {
      try {
        const response = await exportEquipment(this.searchForm)
        const blob = new Blob([response], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        const dateStr = new Date().toLocaleDateString().replace(/\//g, '-')
        a.download = `设备数据_${dateStr}.xlsx`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        this.$message.success('导出成功')
      } catch (e) {
        console.error('导出失败:', e)
        this.$message.error('导出失败')
      }
    }
  }
}
</script>

<style scoped>
.equipment-management {
  padding: 20px;
}
.search-area {
  margin-bottom: 15px;
}
.search-area .el-select,
.search-area .el-input {
  width: 100%;
}
</style>
