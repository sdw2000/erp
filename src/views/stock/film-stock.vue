<template>
  <div class="film-stock-container">
    <el-card>
      <div slot="header" class="clearfix">
        <span style="font-size: 18px; font-weight: bold">
          <i class="el-icon-files" /> 薄膜仓库存管理
        </span>
        <div style="float: right">
          <el-button size="small" @click="goHub">返回原材料总仓</el-button>
          <el-button type="success" size="small" icon="el-icon-download" @click="handleDownloadTemplate">下载模板</el-button>
          <el-button type="warning" size="small" icon="el-icon-upload2" @click="handleImport">导入</el-button>
        </div>
      </div>

      <input ref="fileInput" type="file" accept=".xlsx,.xls" style="display:none" @change="onFileChange">

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
      <el-table ref="filmStockTable" v-loading="loading" :data="filmStockList" style="width: 100%" border stripe>
        <el-table-column type="index" label="序号" width="60" align="center" :index="indexMethod" />
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

      <el-pagination
        :current-page="pagination.current"
        :page-sizes="[20, 50, 100]"
        :page-size="pagination.size"
        :total="pagination.total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </el-card>

    <!-- 明细对话框 -->
    <el-dialog :visible.sync="detailDialogVisible" :title="`${currentFilm.materialName} - 库存明细`" width="80%">
      <div style="margin-bottom: 10px; text-align: right">
        <el-button type="primary" size="mini" icon="el-icon-plus" @click="openCreateDetail">新增明细</el-button>
      </div>
      <el-table :data="detailList" border stripe max-height="500">
        <el-table-column type="index" label="序号" width="60" align="center" />
        <el-table-column prop="batchNo" label="批次号" width="140" />
        <el-table-column prop="rollNo" label="卷号" width="120" />
        <el-table-column prop="width" label="宽度(mm)" width="120" align="center" />
        <el-table-column prop="length" label="长度(m)" width="120" align="center" />
        <el-table-column prop="area" label="面积(㎡)" width="120" align="right" />
        <el-table-column prop="qcStatus" label="质检状态" width="100" align="center">
          <template slot-scope="scope">
            <el-tag :type="qcStatusType(scope.row.qcStatus)" size="small">
              {{ qcStatusText(scope.row.qcStatus) }}
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
        <el-table-column label="操作" width="150" align="center" fixed="right">
          <template slot-scope="scope">
            <el-button type="text" size="mini" @click="openEditDetail(scope.row)">编辑</el-button>
            <el-button type="text" size="mini" style="color:#f56c6c" @click="handleDeleteDetail(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div slot="footer">
        <el-button @click="detailDialogVisible = false">关闭</el-button>
      </div>
    </el-dialog>

    <el-dialog :visible.sync="detailEditDialogVisible" :title="detailEditMode === 'create' ? '新增明细' : '编辑明细'" width="620px">
      <el-form :model="detailForm" label-width="90px" size="small">
        <el-row :gutter="12">
          <el-col :span="12"><el-form-item label="批次号"><el-input v-model="detailForm.batchNo" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="卷号"><el-input v-model="detailForm.rollNo" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="宽度(mm)"><el-input-number v-model="detailForm.width" :min="0" :controls="false" style="width:100%" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="长度(m)"><el-input-number v-model="detailForm.length" :min="0" :controls="false" style="width:100%" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="面积(㎡)"><el-input-number v-model="detailForm.area" :min="0" :precision="2" :controls="false" style="width:100%" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="质检状态">
            <el-select v-model="detailForm.qcStatus" style="width:100%">
              <el-option label="待检" value="pending" />
              <el-option label="合格" value="passed" />
              <el-option label="不合格" value="failed" />
            </el-select>
          </el-form-item></el-col>
          <el-col :span="12"><el-form-item label="库位"><el-input v-model="detailForm.location" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="供应商"><el-input v-model="detailForm.supplier" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="入库日期"><el-date-picker v-model="detailForm.inboundDate" type="date" value-format="yyyy-MM-dd" style="width:100%" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="状态">
            <el-select v-model="detailForm.status" style="width:100%">
              <el-option label="可用" value="available" />
              <el-option label="锁定" value="locked" />
              <el-option label="已使用" value="used" />
            </el-select>
          </el-form-item></el-col>
          <el-col :span="24"><el-form-item label="备注"><el-input v-model="detailForm.remark" type="textarea" :rows="2" /></el-form-item></el-col>
        </el-row>
      </el-form>
      <div slot="footer">
        <el-button @click="detailEditDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSaveDetail">保存</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import {
  getFilmStockPage,
  getFilmStockDetails,
  createFilmStockDetail,
  updateFilmStockDetail,
  deleteFilmStockDetail,
  downloadFilmTemplate,
  importFilmStock
} from '@/api/rawMaterialStock'
import elTableAutoLayout from '@/mixins/elTableAutoLayout'

export default {
  name: 'FilmStock',
  mixins: [elTableAutoLayout],
  tableLayoutRefs: ['filmStockTable'],
  data() {
    return {
      loading: false,
      searchForm: {
        thickness: null
      },
      filmStockList: [],
      pagination: {
        current: 1,
        size: 20,
        total: 0
      },
      statistics: {
        totalTypes: 0,
        totalArea: 0,
        availableArea: 0,
        lockedArea: 0
      },
      detailDialogVisible: false,
      currentFilm: {},
      detailList: [],
      detailEditDialogVisible: false,
      detailEditMode: 'create',
      detailForm: {
        id: null,
        batchNo: '',
        rollNo: '',
        width: null,
        length: null,
        area: null,
        qcStatus: 'passed',
        location: '',
        supplier: '',
        inboundDate: '',
        status: 'available',
        remark: ''
      }
    }
  },
  mounted() {
    this.loadFilmStock()
  },
  methods: {
    goHub() {
      this.$router.push({ path: '/stock/raw-material-hub' })
    },

    handleDownloadTemplate() {
      downloadFilmTemplate().then(blob => {
        this.downloadFile(blob, '薄膜库存导入模板.xlsx')
      }).catch(() => {
        this.$message.error('下载模板失败')
      })
    },

    handleImport() {
      this.$refs.fileInput.click()
    },

    async onFileChange(e) {
      const file = e.target.files[0]
      if (!file) return

      this.loading = true
      try {
        const res = await importFilmStock(file)
        if (res.code === 200 || res.code === 20000) {
          const result = res.data
          let message = `导入完成！成功导入 ${result.successCount || 0} 条数据`
          if (result.skipCount > 0) {
            message += `，跳过 ${result.skipCount} 条数据`
          }
          this.$message.success(message)
          
          // 如果有跳过数据，提供下载选项
          if (result.skipCount > 0 && result.skippedExcel) {
            this.$confirm('有数据被跳过，是否下载跳过数据Excel？', '提示', {
              confirmButtonText: '下载',
              cancelButtonText: '取消',
              type: 'warning'
            }).then(() => {
              // 下载跳过数据
              this.downloadSkippedData(result.skippedExcel)
            }).catch(() => {
              // 用户取消下载
            })
          }
          
          this.pagination.current = 1
          this.loadFilmStock()
        } else {
          this.$message.error(res.msg || '导入失败')
        }
      } catch (error) {
        this.$message.error('导入失败')
      } finally {
        this.loading = false
        this.$refs.fileInput.value = ''
      }
    },

    downloadFile(blob, fileName) {
      const url = window.URL.createObjectURL(new Blob([blob]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', fileName)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    },

    downloadSkippedData(skippedExcelBase64) {
      // 将base64字符串转换为blob
      const byteCharacters = atob(skippedExcelBase64)
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      const byteArray = new Uint8Array(byteNumbers)
      const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      this.downloadFile(blob, 'film_stock_skipped_data.xlsx')
    },

    // 加载薄膜库存
    async loadFilmStock() {
      this.loading = true
      try {
        const params = {
          current: this.pagination.current,
          size: this.pagination.size
        }
        if (this.searchForm.thickness) {
          params.thickness = this.searchForm.thickness
        }
        const res = await getFilmStockPage(params)
        if (res.code === 200 || res.code === 20000) {
          const pageData = res.data || {}
          this.filmStockList = pageData.records || []
          this.pagination.total = Number(pageData.total || 0)
          this.pagination.current = Number(pageData.current || this.pagination.current)
          this.pagination.size = Number(pageData.size || this.pagination.size)
          this.calculateStatistics()
        }
      } catch (error) {
        this.$message.error('加载薄膜库存失败')
      } finally {
        this.loading = false
        this.scheduleTableLayout()
      }
    },

    // 计算统计数据
    calculateStatistics() {
      this.statistics.totalTypes = this.pagination.total
      this.statistics.totalArea = this.filmStockList.reduce((sum, item) => sum + parseFloat(item.totalArea || 0), 0).toFixed(2)
      this.statistics.availableArea = this.filmStockList.reduce((sum, item) => sum + parseFloat(item.availableArea || 0), 0).toFixed(2)
      this.statistics.lockedArea = this.filmStockList.reduce((sum, item) => sum + parseFloat(item.lockedArea || 0), 0).toFixed(2)
    },

    // 搜索
    async handleSearch() {
      this.pagination.current = 1
      await this.loadFilmStock()
    },

    // 重置
    handleReset() {
      this.searchForm = {
        thickness: null
      }
      this.pagination.current = 1
      this.loadFilmStock()
    },

    handleSizeChange(size) {
      this.pagination.size = size
      this.pagination.current = 1
      this.loadFilmStock()
    },

    handleCurrentChange(current) {
      this.pagination.current = current
      this.loadFilmStock()
    },

    indexMethod(index) {
      return (this.pagination.current - 1) * this.pagination.size + index + 1
    },

    // 查看明细
    async handleViewDetails(row) {
      this.currentFilm = row
      this.detailDialogVisible = true

      await this.loadDetailList()
    },

    async loadDetailList() {
      if (!this.currentFilm || !this.currentFilm.id) return

      try {
        const res = await getFilmStockDetails(this.currentFilm.id)
        if (res.code === 20000) {
          this.detailList = res.data || []
        }
      } catch (error) {
        this.$message.error('加载明细失败')
      }
    },

    openCreateDetail() {
      this.detailEditMode = 'create'
      this.detailForm = {
        id: null,
        batchNo: '',
        rollNo: '',
        width: this.currentFilm.width || null,
        length: null,
        area: 0,
        qcStatus: 'passed',
        location: '',
        supplier: '',
        inboundDate: new Date().toISOString().slice(0, 10),
        status: 'available',
        remark: ''
      }
      this.detailEditDialogVisible = true
    },

    openEditDetail(row) {
      this.detailEditMode = 'edit'
      this.detailForm = {
        id: row.id,
        batchNo: row.batchNo || '',
        rollNo: row.rollNo || '',
        width: row.width,
        length: row.length,
        area: Number(row.area || 0),
        qcStatus: row.qcStatus || 'pending',
        location: row.location || '',
        supplier: row.supplier || '',
        inboundDate: row.inboundDate || '',
        status: row.status || 'available',
        remark: row.remark || ''
      }
      this.detailEditDialogVisible = true
    },

    async handleSaveDetail() {
      try {
        const payload = { ...this.detailForm }
        if (this.detailEditMode === 'create') {
          const res = await createFilmStockDetail(this.currentFilm.id, payload)
          if (!(res.code === 200 || res.code === 20000)) {
            this.$message.error(res.msg || '新增失败')
            return
          }
          this.$message.success('新增成功')
        } else {
          const res = await updateFilmStockDetail(this.currentFilm.id, this.detailForm.id, payload)
          if (!(res.code === 200 || res.code === 20000)) {
            this.$message.error(res.msg || '更新失败')
            return
          }
          this.$message.success('更新成功')
        }
        this.detailEditDialogVisible = false
        await this.loadDetailList()
        await this.loadFilmStock()
      } catch (e) {
        this.$message.error('保存失败')
      }
    },

    handleDeleteDetail(row) {
      this.$confirm('确认删除该明细吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(async() => {
        try {
          const res = await deleteFilmStockDetail(this.currentFilm.id, row.id)
          if (res.code === 200 || res.code === 20000) {
            this.$message.success('删除成功')
            await this.loadDetailList()
            await this.loadFilmStock()
          } else {
            this.$message.error(res.msg || '删除失败')
          }
        } catch (e) {
          const msg = (e && e.response && e.response.data && (e.response.data.msg || e.response.data.message)) || '删除失败，请检查权限或后端日志'
          this.$message.error(msg)
        }
      }).catch(() => {})
    },

    qcStatusType(status) {
      const s = (status || '').toLowerCase()
      if (s === 'passed' || s === 'qualified') return 'success'
      if (s === 'pending') return 'warning'
      return 'danger'
    },

    qcStatusText(status) {
      const s = (status || '').toLowerCase()
      if (s === 'passed' || s === 'qualified') return '合格'
      if (s === 'pending') return '待检'
      return '不合格'
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

.el-pagination {
  margin-top: 15px;
  text-align: right;
}
</style>
