<template>
  <div class="app-container">
    <el-card shadow="never">
      <div slot="header" class="clearfix">
        <span>物料生产配置 (MOQ/速度/时间项)</span>
        <div style="float: right">
          <el-button type="primary" size="small" icon="el-icon-plus" @click="handleAdd">新增配置</el-button>
        </div>
      </div>

      <!-- 搜索栏 -->
      <div class="filter-container" style="margin-bottom: 20px;">
        <el-input
          v-model="listQuery.materialCode"
          placeholder="物料编号"
          style="width: 200px;"
          class="filter-item"
          size="small"
          clearable
          @keyup.enter.native="handleFilter"
        />
        <el-select v-model="listQuery.materialType" placeholder="物料类型" clearable style="width: 130px" class="filter-item" size="small">
          <el-option label="涂布" value="coating" />
          <el-option label="印刷" value="printing" />
        </el-select>
        <el-button class="filter-item" type="primary" icon="el-icon-search" size="small" @click="handleFilter">搜索</el-button>
        <el-button class="filter-item" type="default" icon="el-icon-refresh" size="small" @click="resetQuery">重置</el-button>
      </div>

      <!-- 表格 -->
      <el-table
        v-loading="listLoading"
        :data="list"
        border
        fit
        highlight-current-row
        style="width: 100%;"
      >
        <el-table-column label="物料编号" prop="materialCode" width="200" align="center" fixed="left" />
        <el-table-column label="物料名称" prop="materialName" min-width="150" show-overflow-tooltip />
        <el-table-column label="物料类型" prop="materialType" width="100" align="center">
          <template slot-scope="scope">
            <el-tag :type="scope.row.materialType === 'coating' ? 'success' : 'info'">
              {{ scope.row.materialType === 'coating' ? '涂布' : '印刷' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="最小统计平米(MOQ)" prop="minProductionArea" width="140" align="right">
          <template slot-scope="{row}">
            <span style="font-weight: bold; color: #409EFF">{{ row.minProductionArea || 0 }} ㎡</span>
          </template>
        </el-table-column>
        <el-table-column label="推荐宽度(mm)" prop="recommendedWidth" width="110" align="center" />
        <el-table-column label="推荐厚度(μm)" prop="recommendedThickness" width="110" align="center" />
        <el-table-column label="调机时间(min)" prop="setupTime" width="110" align="center" />
        <el-table-column label="状态" prop="isActive" width="80" align="center">
          <template slot-scope="scope">
            <el-tag :type="scope.row.isActive ? 'success' : 'danger'">
              {{ scope.row.isActive ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" align="center" width="160" class-name="small-padding fixed-width" fixed="right">
          <template slot-scope="{row}">
            <el-button type="primary" size="mini" @click="handleUpdate(row)">编辑</el-button>
            <el-button size="mini" type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <pagination
        v-show="total>0"
        :total="total"
        :page.sync="listQuery.pageNum"
        :limit.sync="listQuery.pageSize"
        @pagination="getList"
      />
    </el-card>

    <!-- 弹窗 -->
    <el-dialog :title="textMap[dialogStatus]" :visible.sync="dialogFormVisible" width="600px">
      <el-form ref="dataForm" :rules="rules" :model="temp" label-position="left" label-width="120px" style="width: 450px; margin-left:50px;">
        <el-form-item label="物料编号" prop="materialCode">
          <el-input v-model="temp.materialCode" placeholder="输入完整料号或前缀" :disabled="dialogStatus==='update'" />
        </el-form-item>
        <el-form-item label="物料名称" prop="materialName">
          <el-input v-model="temp.materialName" />
        </el-form-item>
        <el-form-item label="物料类型" prop="materialType">
          <el-select v-model="temp.materialType" class="filter-item" placeholder="请选择">
            <el-option label="涂布" value="coating" />
            <el-option label="印刷" value="printing" />
          </el-select>
        </el-form-item>
        <el-divider content-position="left">核心排程参数</el-divider>
        <el-form-item label="最小面积(MOQ)" prop="minProductionArea">
          <el-input-number v-model="temp.minProductionArea" :precision="2" :step="100" />
          <span style="margin-left: 10px">㎡</span>
        </el-form-item>
        <el-form-item label="推荐宽度" prop="recommendedWidth">
          <el-input-number v-model="temp.recommendedWidth" :min="0" :step="10" />
          <span style="margin-left: 10px">mm</span>
        </el-form-item>
        <el-form-item label="推荐厚度" prop="recommendedThickness">
          <el-input-number v-model="temp.recommendedThickness" :min="0" />
          <span style="margin-left: 10px">μm</span>
        </el-form-item>
        <el-form-item label="调机时间" prop="setupTime">
          <el-input-number v-model="temp.setupTime" :min="0" />
          <span style="margin-left: 10px">min</span>
        </el-form-item>
        <el-form-item label="是否启用">
          <el-switch v-model="temp.isActive" :active-value="1" :inactive-value="0" />
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="dialogFormVisible = false">取消</el-button>
        <el-button type="primary" @click="dialogStatus==='create'?createData():updateData()">确认</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { getMaterialConfigList, saveMaterialConfig, deleteMaterialConfig } from '@/api/materialConfig'
import Pagination from '@/components/Pagination'

export default {
  name: 'MaterialProductionConfig',
  components: { Pagination },
  data() {
    return {
      list: null,
      total: 0,
      listLoading: true,
      listQuery: {
        pageNum: 1,
        pageSize: 20,
        materialCode: undefined,
        materialType: 'coating',
        isActive: 1
      },
      temp: {
        id: undefined,
        materialCode: '',
        materialName: '',
        materialType: 'coating',
        minProductionArea: 1000,
        recommendedWidth: 0,
        recommendedThickness: 0,
        setupTime: 60,
        isActive: 1
      },
      dialogFormVisible: false,
      dialogStatus: '',
      textMap: {
        update: '编辑配置',
        create: '新增配置'
      },
      rules: {
        materialCode: [{ required: true, message: '请输入物料编号', trigger: 'blur' }],
        materialType: [{ required: true, message: '请选择类型', trigger: 'change' }],
        minProductionArea: [{ required: true, message: '请输入最小面积', trigger: 'blur' }]
      }
    }
  },
  created() {
    this.getList()
  },
  methods: {
    getList() {
      this.listLoading = true
      getMaterialConfigList(this.listQuery).then(response => {
        this.list = response.data.records
        this.total = response.data.total
        this.listLoading = false
      })
    },
    handleFilter() {
      this.listQuery.pageNum = 1
      this.getList()
    },
    resetQuery() {
      this.listQuery = {
        pageNum: 1,
        pageSize: 20,
        materialCode: undefined,
        materialType: 'coating',
        isActive: 1
      }
      this.getList()
    },
    resetTemp() {
      this.temp = {
        id: undefined,
        materialCode: '',
        materialName: '',
        materialType: 'coating',
        minProductionArea: 1000,
        recommendedWidth: 0,
        recommendedThickness: 0,
        setupTime: 60,
        isActive: 1
      }
    },
    handleAdd() {
      this.resetTemp()
      this.dialogStatus = 'create'
      this.dialogFormVisible = true
      this.$nextTick(() => {
        this.$refs['dataForm'].clearValidate()
      })
    },
    createData() {
      this.$refs['dataForm'].validate((valid) => {
        if (valid) {
          saveMaterialConfig(this.temp).then(() => {
            this.dialogFormVisible = false
            this.$notify({
              title: '成功',
              message: '创建成功',
              type: 'success',
              duration: 2000
            })
            this.getList()
          })
        }
      })
    },
    handleUpdate(row) {
      this.temp = Object.assign({}, row)
      this.dialogStatus = 'update'
      this.dialogFormVisible = true
      this.$nextTick(() => {
        this.$refs['dataForm'].clearValidate()
      })
    },
    updateData() {
      this.$refs['dataForm'].validate((valid) => {
        if (valid) {
          saveMaterialConfig(this.temp).then(() => {
            this.dialogFormVisible = false
            this.$notify({
              title: '成功',
              message: '更新成功',
              type: 'success',
              duration: 2000
            })
            this.getList()
          })
        }
      })
    },
    handleDelete(row) {
      this.$confirm('确认删除该配置吗?', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        deleteMaterialConfig(row.id).then(() => {
          this.$notify({
            title: '成功',
            message: '删除成功',
            type: 'success',
            duration: 2000
          })
          this.getList()
        })
      })
    }
  }
}
</script>

<style scoped>
.filter-container {
  padding-bottom: 10px;
}
.filter-item {
  display: inline-block;
  vertical-align: middle;
  margin-bottom: 10px;
  margin-right: 10px;
}
</style>
