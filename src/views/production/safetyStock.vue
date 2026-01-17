<template>
  <div class="app-container">
    <!-- 统计卡片 -->
    <el-row :gutter="20" style="margin-bottom: 15px">
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" style="background: #67C23A">
              <i class="el-icon-check" />
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.normal || 0 }}</div>
              <div class="stat-label">库存正常</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" style="background: #E6A23C">
              <i class="el-icon-warning" />
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.low || 0 }}</div>
              <div class="stat-label">库存偏低</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" style="background: #F56C6C">
              <i class="el-icon-circle-close" />
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.critical || 0 }}</div>
              <div class="stat-label">严重不足</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" style="background: #909399">
              <i class="el-icon-box" />
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.over || 0 }}</div>
              <div class="stat-label">库存超储</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 搜索区域 -->
    <el-card class="search-card" shadow="never">
      <el-form :inline="true" :model="queryParams" class="search-form">
        <el-form-item label="产品料号">
          <el-input v-model="queryParams.materialCode" placeholder="请输入料号" clearable style="width: 180px" />
        </el-form-item>
        <el-form-item label="库存类型">
          <el-select v-model="queryParams.stockType" placeholder="全部类型" clearable style="width: 120px">
            <el-option label="半成品" value="semi" />
            <el-option label="成品" value="finished" />
          </el-select>
        </el-form-item>
        <el-form-item label="">
          <el-checkbox v-model="queryParams.lowStockOnly">仅显示库存不足</el-checkbox>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="el-icon-search" @click="loadList">查询</el-button>
          <el-button icon="el-icon-refresh" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 操作按钮 -->
    <el-card shadow="never" style="margin-top: 10px">
      <div class="table-toolbar">
        <el-button v-if="$canEdit()" type="primary" icon="el-icon-plus" @click="openAddDialog">新增安全库存配置</el-button>
        <el-button type="warning" icon="el-icon-bell" @click="viewNeedRestock">查看待补货</el-button>
      </div>

      <!-- 表格 -->
      <el-table v-loading="loading" :data="dataList" border stripe>
        <el-table-column prop="materialCode" label="产品料号" width="140" />
        <el-table-column prop="materialName" label="产品名称" width="180" show-overflow-tooltip />
        <el-table-column prop="stockType" label="库存类型" width="90">
          <template slot-scope="{ row }">
            <el-tag :type="row.stockType === 'finished' ? 'success' : 'warning'" size="small">
              {{ row.stockType === 'finished' ? '成品' : '半成品' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="当前库存" width="100">
          <template slot-scope="{ row }">
            <span :class="getStockClass(row.stockStatus)">{{ row.currentQty || 0 }} 卷</span>
          </template>
        </el-table-column>

        <!-- 新增：显示可用面积和已锁定面积 -->
        <el-table-column label="可用面积(m²)" width="120" align="right">
          <template slot-scope="{ row }">
            <span style="color: #67C23A; font-weight: bold">{{ row.availableArea || 0 }}</span>
          </template>
        </el-table-column>
        <el-table-column label="已锁定面积(m²)" width="120" align="right">
          <template slot-scope="{ row }">
            <span style="color: #E6A23C; font-weight: bold">{{ row.reservedArea || 0 }}</span>
          </template>
        </el-table-column>

        <!-- 原有字段 -->
        <el-table-column prop="safetyQty" label="安全库存" width="100">
          <template slot-scope="{ row }">{{ row.safetyQty }} 卷</template>
        </el-table-column>
        <el-table-column prop="reorderPoint" label="补货点" width="90">
          <template slot-scope="{ row }">{{ row.reorderPoint }} 卷</template>
        </el-table-column>
        <el-table-column prop="maxQty" label="最大库存" width="90">
          <template slot-scope="{ row }">{{ row.maxQty || '-' }} 卷</template>
        </el-table-column>
        <el-table-column prop="stockStatus" label="库存状态" width="100">
          <template slot-scope="{ row }">
            <el-tag :type="getStatusType(row.stockStatus)" size="small">{{ getStatusText(row.stockStatus) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="economicLot" label="经济批量" width="90">
          <template slot-scope="{ row }">{{ row.economicLot || '-' }}</template>
        </el-table-column>
        <el-table-column prop="leadTime" label="提前期" width="80">
          <template slot-scope="{ row }">{{ row.leadTime || '-' }} 天</template>
        </el-table-column>
        <el-table-column prop="priority" label="优先级" width="80">
          <template slot-scope="{ row }">
            <el-rate v-model="row.priority" disabled :max="5" style="display: inline-block" />
          </template>
        </el-table-column>
        <el-table-column prop="autoRestock" label="自动备货" width="90">
          <template slot-scope="{ row }">
            <el-tag :type="row.autoRestock === 1 ? 'success' : 'info'" size="small">
              {{ row.autoRestock === 1 ? '是' : '否' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column v-if="$canEdit()" label="操作" width="120" fixed="right">
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
    <el-dialog :title="dialogTitle" :visible.sync="dialogVisible" width="600px" @close="resetForm">
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
            <el-form-item label="库存类型" prop="stockType">
              <el-select v-model="form.stockType" placeholder="请选择" style="width: 100%" :disabled="isEditing">
                <el-option label="半成品" value="semi" />
                <el-option label="成品" value="finished" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="安全库存" prop="safetyQty">
              <el-input-number v-model="form.safetyQty" :min="0" style="width: 100%" />
              <span class="unit">卷</span>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="补货触发点" prop="reorderPoint">
              <el-input-number v-model="form.reorderPoint" :min="0" style="width: 100%" />
              <span class="unit">卷</span>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="最大库存">
              <el-input-number v-model="form.maxQty" :min="0" style="width: 100%" />
              <span class="unit">卷</span>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="经济批量">
              <el-input-number v-model="form.economicLot" :min="1" style="width: 100%" />
              <span class="unit">卷</span>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="提前期">
              <el-input-number v-model="form.leadTime" :min="0" style="width: 100%" />
              <span class="unit">天</span>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="优先级" prop="priority">
              <el-rate v-model="form.priority" :max="5" show-text :texts="['最低', '低', '中', '高', '最高']" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="自动备货">
              <el-switch v-model="form.autoRestock" :active-value="1" :inactive-value="0" />
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

    <!-- 待补货列表对话框 -->
    <el-dialog title="待补货产品列表" :visible.sync="restockDialogVisible" width="900px">
      <el-table :data="needRestockList" border size="small">
        <el-table-column prop="materialCode" label="产品料号" width="140" />
        <el-table-column prop="materialName" label="产品名称" width="180" show-overflow-tooltip />
        <el-table-column prop="stockType" label="库存类型" width="90">
          <template slot-scope="{ row }">{{ row.stockType === 'finished' ? '成品' : '半成品' }}</template>
        </el-table-column>
        <el-table-column prop="currentQty" label="当前库存" width="100">
          <template slot-scope="{ row }">
            <span style="color: #F56C6C; font-weight: bold">{{ row.currentQty || 0 }} 卷</span>
          </template>
        </el-table-column>
        <el-table-column prop="reorderPoint" label="补货点" width="90">
          <template slot-scope="{ row }">{{ row.reorderPoint }} 卷</template>
        </el-table-column>
        <el-table-column prop="safetyQty" label="安全库存" width="100">
          <template slot-scope="{ row }">{{ row.safetyQty }} 卷</template>
        </el-table-column>
        <el-table-column label="建议补货量" width="110">
          <template slot-scope="{ row }">
            <span style="color: #409EFF; font-weight: bold">{{ row.economicLot || (row.safetyQty - (row.currentQty || 0)) }} 卷</span>
          </template>
        </el-table-column>
        <el-table-column prop="priority" label="优先级" width="100">
          <template slot-scope="{ row }">
            <el-rate v-model="row.priority" disabled :max="5" />
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>

<script>
import {
  getSafetyStockList,
  getSafetyStockById,
  addSafetyStock,
  updateSafetyStock,
  deleteSafetyStock,
  getNeedRestockList,
  getStockWarningStats
} from '@/api/safetyStock'
import { getTapeSpecList } from '@/api/tapeSpec'

export default {
  name: 'SafetyStock',
  data() {
    return {
      loading: false,
      dataList: [],
      total: 0,
      queryParams: {
        materialCode: '',
        stockType: '',
        lowStockOnly: false,
        page: 1,
        size: 10
      },

      // 统计数据
      stats: {},

      // 对话框
      dialogVisible: false,
      dialogTitle: '',
      isEditing: false,
      submitting: false,
      form: this.getEmptyForm(),
      rules: {
        materialCode: [{ required: true, message: '请选择产品料号', trigger: 'change' }],
        stockType: [{ required: true, message: '请选择库存类型', trigger: 'change' }],
        safetyQty: [{ required: true, message: '请输入安全库存', trigger: 'blur' }],
        reorderPoint: [{ required: true, message: '请输入补货触发点', trigger: 'blur' }],
        priority: [{ required: true, message: '请选择优先级', trigger: 'change' }]
      },

      // 料号搜索
      materialLoading: false,
      materialOptions: [],

      // 待补货列表
      restockDialogVisible: false,
      needRestockList: []
    }
  },
  created() {
    this.loadList()
    this.loadStats()
  },
  methods: {
    $canEdit() {
      // 只有 admin 和 production 角色可以进行增删改操作
      return this.$hasRole('admin') || this.$hasRole('production')
    },

    getEmptyForm() {
      return {
        materialCode: '',
        stockType: 'finished',
        safetyQty: 100,
        reorderPoint: 50,
        maxQty: null,
        economicLot: 50,
        leadTime: 3,
        priority: 3,
        autoRestock: 1,
        remark: ''
      }
    },

    async loadList() {
      this.loading = true
      try {
        const res = await getSafetyStockList(this.queryParams)
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

    async loadStats() {
      try {
        const res = await getStockWarningStats()
        this.stats = res.data || {}
      } catch (error) {
        console.error('加载统计失败', error)
      }
    },

    resetQuery() {
      this.queryParams = {
        materialCode: '',
        stockType: '',
        lowStockOnly: false,
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

    getStockClass(status) {
      const map = {
        normal: 'stock-normal',
        low: 'stock-low',
        critical: 'stock-critical',
        over: 'stock-over'
      }
      return map[status] || ''
    },

    getStatusType(status) {
      const map = {
        normal: 'success',
        low: 'warning',
        critical: 'danger',
        over: 'info'
      }
      return map[status] || 'info'
    },

    getStatusText(status) {
      const map = {
        normal: '正常',
        low: '偏低',
        critical: '严重不足',
        over: '超储'
      }
      return map[status] || status
    },

    openAddDialog() {
      this.dialogTitle = '新增安全库存配置'
      this.isEditing = false
      this.form = this.getEmptyForm()
      this.materialOptions = []
      this.dialogVisible = true
    },

    async openEditDialog(row) {
      this.dialogTitle = '编辑安全库存配置'
      this.isEditing = true
      const res = await getSafetyStockById(row.id)
      this.form = { ...res.data }
      this.materialOptions = [{ materialCode: row.materialCode, materialName: row.materialName || '' }]
      this.dialogVisible = true
    },

    async submitForm() {
      this.$refs.form.validate(async valid => {
        if (!valid) return
        this.submitting = true
        try {
          if (this.isEditing) {
            await updateSafetyStock(this.form.id, this.form)
            this.$message.success('更新成功')
          } else {
            await addSafetyStock(this.form)
            this.$message.success('新增成功')
          }
          this.dialogVisible = false
          this.loadList()
          this.loadStats()
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
      this.$confirm(`确定删除该安全库存配置吗？`, '提示', {
        type: 'warning'
      }).then(async() => {
        await deleteSafetyStock(row.id)
        this.$message.success('删除成功')
        this.loadList()
        this.loadStats()
      }).catch(() => {})
    },

    async viewNeedRestock() {
      try {
        const res = await getNeedRestockList()
        this.needRestockList = res.data || []
        this.restockDialogVisible = true
      } catch (error) {
        this.$message.error('加载数据失败')
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.stat-card {
  .stat-content {
    display: flex;
    align-items: center;
  }
  .stat-icon {
    width: 50px;
    height: 50px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    i {
      font-size: 24px;
      color: #fff;
    }
  }
  .stat-info {
    margin-left: 15px;
    .stat-value {
      font-size: 24px;
      font-weight: bold;
      color: #303133;
    }
    .stat-label {
      font-size: 14px;
      color: #909399;
    }
  }
}

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

.stock-normal { color: #67C23A; font-weight: bold; }
.stock-low { color: #E6A23C; font-weight: bold; }
.stock-critical { color: #F56C6C; font-weight: bold; }
.stock-over { color: #909399; font-weight: bold; }
</style>
