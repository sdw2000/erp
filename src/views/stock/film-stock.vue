<template>
  <div class="film-stock-container">
    <el-card>
      <div slot="header" class="clearfix">
        <span style="font-size: 18px; font-weight: bold">
          <i class="el-icon-files" /> 薄膜仓库存管理
        </span>
      </div>

      <!-- 查询表单 -->
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="厚度(μm)">
          <el-input v-model.number="searchForm.thickness" placeholder="如: 25" clearable style="width:120px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="el-icon-search" @click="handleSearch">搜 索</el-button>
          <el-button icon="el-icon-refresh-left" @click="handleReset">重 置</el-button>
        </el-form-item>
      </el-form>

      <!-- 统计卡片 -->
      <el-row :gutter="20" style="margin-bottom: 20px">
        <el-col :span="6">
          <el-card shadow="hover" class="stat-card">
            <div class="stat-content">
              <div class="stat-label">总库存品种</div>
              <div class="stat-value">{{ statistics.totalTypes }}</div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="stat-card">
            <div class="stat-content">
              <div class="stat-label">总面积(㎡)</div>
              <div class="stat-value">{{ statistics.totalArea }}</div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="stat-card">
            <div class="stat-content">
              <div class="stat-label">可用面积(㎡)</div>
              <div class="stat-value" style="color: #67c23a">{{ statistics.availableArea }}</div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="stat-card">
            <div class="stat-content">
              <div class="stat-label">锁定面积(㎡)</div>
              <div class="stat-value" style="color: #e6a23c">{{ statistics.lockedArea }}</div>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 数据表格 -->
      <el-table v-loading="loading" :data="filmStockList" style="width: 100%" border stripe>
        <el-table-column type="index" label="序号" width="60" align="center" />
        <el-table-column prop="materialCode" label="物料编号" width="140" />
        <el-table-column prop="materialName" label="物料名称" width="180" show-overflow-tooltip />
        <el-table-column prop="thickness" label="厚度(μm)" width="100" align="center" />
        <el-table-column label="总面积(㎡)" width="120" align="right">
          <template slot-scope="scope">
            <span style="font-weight: bold">{{ scope.row.totalArea }}</span>
          </template>
        </el-table-column>
        <el-table-column label="可用面积(㎡)" width="130" align="right">
          <template slot-scope="scope">
            <span style="color: #67c23a; font-weight: bold">{{ scope.row.availableArea }}</span>
          </template>
        </el-table-column>
        <el-table-column label="锁定面积(㎡)" width="130" align="right">
          <template slot-scope="scope">
            <span style="color: #e6a23c">{{ scope.row.lockedArea }}</span>
          </template>
        </el-table-column>
        <el-table-column label="总卷数" width="100" align="center">
          <template slot-scope="scope">
            <el-tag :type="scope.row.totalRolls > 0 ? 'success' : 'info'">
              {{ scope.row.totalRolls }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="可用/锁定" width="120" align="center">
          <template slot-scope="scope">
            <span style="color: #67c23a">{{ scope.row.availableRolls }}</span>
            <span style="color: #909399"> / </span>
            <span style="color: #e6a23c">{{ scope.row.lockedRolls }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="safetyStock" label="安全库存(㎡)" width="130" align="right">
          <template slot-scope="scope">
            <span>{{ scope.row.safetyStock || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100" align="center">
          <template slot-scope="scope">
            <el-tag :type="getStatusType(scope.row.status)" size="small">
              {{ getStatusText(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" align="center" fixed="right">
          <template slot-scope="scope">
            <el-button type="text" icon="el-icon-view" @click="handleViewDetails(scope.row)">查看明细</el-button>
            <el-button type="text" icon="el-icon-document" @click="handleViewOutbound(scope.row)">出库记录</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 明细对话框 -->
    <el-dialog :visible.sync="detailDialogVisible" :title="`${currentFilm.materialName} - 库存明细`" width="80%">
      <el-table :data="detailList" border stripe max-height="500">
        <el-table-column type="index" label="序号" width="60" align="center" />
        <el-table-column prop="batchNo" label="批次号" width="140" />
        <el-table-column prop="rollNo" label="卷号" width="120" />
        <el-table-column prop="width" label="宽度(mm)" width="120" align="center" />
        <el-table-column prop="length" label="长度(m)" width="120" align="center" />
        <el-table-column prop="area" label="面积(㎡)" width="120" align="right" />
        <el-table-column prop="qcStatus" label="质检状态" width="100" align="center">
          <template slot-scope="scope">
            <el-tag :type="scope.row.qcStatus === 'passed' ? 'success' : scope.row.qcStatus === 'pending' ? 'warning' : 'danger'" size="small">
              {{ scope.row.qcStatus === 'passed' ? '合格' : scope.row.qcStatus === 'pending' ? '待检' : '不合格' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="location" label="库位" width="100" align="center" />
        <el-table-column prop="supplier" label="供应商" width="150" show-overflow-tooltip />
        <el-table-column prop="inboundDate" label="入库日期" width="110" />
        <el-table-column prop="status" label="状态" width="100" align="center">
          <template slot-scope="scope">
            <el-tag :type="scope.row.status === 'available' ? 'success' : scope.row.status === 'locked' ? 'warning' : 'info'" size="small">
              {{ scope.row.status === 'available' ? '可用' : scope.row.status === 'locked' ? '锁定' : '已使用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="150" show-overflow-tooltip />
      </el-table>
    </el-dialog>
  </div>
</template>

<script>
import { getFilmStockList, getFilmStockBySpec, getFilmStockDetails } from '@/api/rawMaterialStock'

export default {
  name: 'FilmStock',
  data() {
    return {
      loading: false,
      searchForm: {
        thickness: null
      },
      filmStockList: [],
      statistics: {
        totalTypes: 0,
        totalArea: 0,
        availableArea: 0,
        lockedArea: 0
      },
      detailDialogVisible: false,
      currentFilm: {},
      detailList: []
    }
  },
  mounted() {
    this.loadFilmStock()
  },
  methods: {
    // 加载薄膜库存
    async loadFilmStock() {
      this.loading = true
      try {
        const res = await getFilmStockList()
        if (res.code === 20000) {
          this.filmStockList = res.data || []
          this.calculateStatistics()
        }
      } catch (error) {
        this.$message.error('加载薄膜库存失败')
      } finally {
        this.loading = false
      }
    },

    // 计算统计数据
    calculateStatistics() {
      this.statistics.totalTypes = this.filmStockList.length
      this.statistics.totalArea = this.filmStockList.reduce((sum, item) => sum + parseFloat(item.totalArea || 0), 0).toFixed(2)
      this.statistics.availableArea = this.filmStockList.reduce((sum, item) => sum + parseFloat(item.availableArea || 0), 0).toFixed(2)
      this.statistics.lockedArea = this.filmStockList.reduce((sum, item) => sum + parseFloat(item.lockedArea || 0), 0).toFixed(2)
    },

    // 搜索
    async handleSearch() {
      if (!this.searchForm.thickness) {
        this.$message.warning('请输入厚度进行筛选')
        return
      }
      this.loading = true
      try {
        const res = await getFilmStockBySpec(this.searchForm)
        if (res.code === 20000) {
          this.filmStockList = res.data || []
          this.calculateStatistics()
        }
      } catch (error) {
        this.$message.error('查询失败')
      } finally {
        this.loading = false
      }
    },

    // 重置
    handleReset() {
      this.searchForm = {
        thickness: null
      }
      this.loadFilmStock()
    },

    // 查看明细
    async handleViewDetails(row) {
      this.currentFilm = row
      this.detailDialogVisible = true

      try {
        const res = await getFilmStockDetails(row.id)
        if (res.code === 20000) {
          this.detailList = res.data || []
        }
      } catch (error) {
        this.$message.error('加载明细失败')
      }
    },

    // 查看出库记录
    handleViewOutbound(row) {
      this.$message.info('出库记录功能开发中...')
    },

    // 状态类型
    getStatusType(status) {
      const typeMap = {
        'active': 'success',
        'low_stock': 'warning',
        'out_of_stock': 'danger'
      }
      return typeMap[status] || 'info'
    },

    // 状态文本
    getStatusText(status) {
      const textMap = {
        'active': '正常',
        'low_stock': '库存不足',
        'out_of_stock': '缺货'
      }
      return textMap[status] || status
    }
  }
}
</script>

<style scoped>
.film-stock-container {
  padding: 20px;
}

.search-form {
  margin-bottom: 15px;
}

.stat-card {
  border-left: 4px solid #409EFF;
}

.stat-content {
  text-align: center;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
}
</style>
