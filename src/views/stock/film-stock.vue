<template>
  <div class="film-stock-container">
    <el-card>
      <div slot="header" class="clearfix">
        <span style="font-size: 18px; font-weight: bold">
          <i class="el-icon-files" /> 薄膜仓库存管理
        </span>
        <div style="float: right">
          <el-button size="small" @click="goHub">返回原材料总仓</el-button>
          <el-button v-if="$hasRole('admin')" type="primary" size="small" icon="el-icon-download" @click="handleExportCurrent">导出当前库存</el-button>
          <el-button v-if="$hasRole('admin')" type="success" size="small" icon="el-icon-download" @click="handleDownloadTemplate">下载模板</el-button>
          <el-button v-if="$hasRole('admin')" type="danger" size="small" icon="el-icon-delete" @click="handleClearForReimport">清空薄膜仓</el-button>
          <el-button v-if="$hasRole('admin')" type="warning" size="small" icon="el-icon-upload2" @click="handleImport">导入</el-button>
        </div>
      </div>

      <input ref="fileInput" type="file" accept=".xlsx,.xls" style="display:none" @change="onFileChange">

      <!-- 查询表单 -->
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="料号">
          <el-input v-model.trim="searchForm.materialCode" placeholder="如: PM1510B" clearable style="width:160px" />
        </el-form-item>
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
        <el-col :span="8">
          <el-card shadow="hover" class="stat-card">
            <div class="stat-content">
              <div class="stat-label">总库存品种</div>
              <div class="stat-value">{{ statistics.totalTypes }}</div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="8">
          <el-card shadow="hover" class="stat-card">
            <div class="stat-content">
              <div class="stat-label">可用面积(㎡)</div>
              <div class="stat-value" style="color: #67c23a">{{ statistics.availableArea }}</div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="8">
          <el-card shadow="hover" class="stat-card">
            <div class="stat-content">
              <div class="stat-label">锁定面积(㎡)</div>
              <div class="stat-value" style="color: #e6a23c">{{ statistics.lockedArea }}</div>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 数据表格 -->
      <el-table
        ref="filmStockTable"
        v-loading="loading"
        :data="filmStockList"
        style="width: 100%"
        border
        stripe
        @sort-change="handleTableSortChange"
      >
        <el-table-column type="index" label="序号" width="60" align="center" :index="indexMethod" />
        <el-table-column prop="materialCode" label="物料编号" width="140" sortable="custom" />
        <el-table-column prop="materialName" label="物料名称" width="180" show-overflow-tooltip sortable="custom" />
        <el-table-column prop="specDesc" label="规格" width="160" show-overflow-tooltip>
          <template slot-scope="scope">
            <span>{{ formatSpecWithoutUnit(scope.row.specDesc) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="availableArea" label="可用面积(㎡)" width="130" align="right" sortable="custom">
          <template slot-scope="scope">
            <span style="color: #67c23a; font-weight: bold">{{ getAreaDisplay(scope.row, scope.row.availableArea) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="lockedArea" label="锁定面积(㎡)" width="130" align="right" sortable="custom">
          <template slot-scope="scope">
            <span style="color: #e6a23c">{{ getAreaDisplay(scope.row, scope.row.lockedArea) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="totalRolls" label="总卷数/支数" width="110" align="center" sortable="custom">
          <template slot-scope="scope">
            <el-tag :type="scope.row.totalRolls > 0 ? 'success' : 'info'">
              {{ getPackCountDisplay(scope.row, scope.row.totalRolls) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="availableRolls" label="可用/锁定(卷/支)" width="140" align="center" sortable="custom">
          <template slot-scope="scope">
            <span style="color: #67c23a">{{ scope.row.availableRolls }}</span>
            <span style="color: #909399"> / </span>
            <span style="color: #e6a23c">{{ scope.row.lockedRolls }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="safetyStock" label="安全库存(㎡)" width="130" align="right" sortable="custom">
          <template slot-scope="scope">
            <span>{{ scope.row.safetyStock || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100" align="center" sortable="custom">
          <template slot-scope="scope">
            <el-tag :type="getStatusType(scope.row.status, scope.row)" size="small">
              {{ getStatusText(scope.row.status, scope.row) }}
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
      <div style="margin-bottom: 10px; display: flex; align-items: center; justify-content: space-between;">
        <div>
          <el-switch
            v-model="showUsedDetails"
            active-text="显示已使用"
            inactive-text="隐藏已使用"
            @change="handleDetailFilterChange"
          />
        </div>
        <div>
          <el-button v-if="$hasRole('admin')" type="primary" size="mini" icon="el-icon-plus" @click="openCreateDetail">新增明细</el-button>
        </div>
      </div>
      <el-table
        v-loading="detailLoading"
        :data="detailList"
        border
        stripe
        max-height="500"
        @sort-change="handleDetailSortChange"
      >
        <el-table-column type="index" label="序号" width="60" align="center" :index="detailIndexMethod" />
        <el-table-column prop="batchNo" label="批次号" width="140" sortable="custom" />
        <el-table-column prop="rollNo" label="卷号" width="120" sortable="custom" />
        <el-table-column prop="width" label="宽度(mm)" width="120" align="center" sortable="custom" />
        <el-table-column prop="length" label="长度(m)" width="120" align="center" sortable="custom" />
        <el-table-column prop="area" label="面积(㎡)" width="120" align="right" sortable="custom" />
        <el-table-column prop="qcStatus" label="质检状态" width="100" align="center" sortable="custom">
          <template slot-scope="scope">
            <el-tag :type="qcStatusType(scope.row.qcStatus)" size="small">
              {{ qcStatusText(scope.row.qcStatus) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="location" label="库位" width="100" align="center" sortable="custom" />
        <el-table-column prop="supplier" label="供应商" width="150" show-overflow-tooltip sortable="custom" />
        <el-table-column prop="inboundDate" label="入库日期" width="110" sortable="custom" />
        <el-table-column prop="status" label="状态" width="100" align="center" sortable="custom">
          <template slot-scope="scope">
            <el-tag :type="scope.row.status === 'available' ? 'success' : scope.row.status === 'locked' ? 'warning' : 'info'" size="small">
              {{ scope.row.status === 'available' ? '可用' : scope.row.status === 'locked' ? '锁定' : '已使用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="150" show-overflow-tooltip />
        <el-table-column v-if="$hasRole('admin')" label="操作" width="150" align="center" fixed="right">
          <template slot-scope="scope">
            <el-button type="text" size="mini" @click="openEditDetail(scope.row)">编辑</el-button>
            <el-button type="text" size="mini" style="color:#f56c6c" @click="handleDeleteDetail(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination
        style="margin-top: 12px; text-align: right"
        :current-page="detailPagination.current"
        :page-sizes="[20, 50, 100]"
        :page-size="detailPagination.size"
        :total="detailPagination.total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleDetailSizeChange"
        @current-change="handleDetailCurrentChange"
      />
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

    <el-dialog :visible.sync="outboundDialogVisible" :title="`${currentFilm.materialName || ''} - 出库记录`" width="88%">
      <el-form :inline="true" :model="outboundQuery" style="margin-bottom: 10px">
        <el-form-item label="记录号">
          <el-input v-model="outboundQuery.outboundNo" placeholder="输入记录号/出库单号" clearable style="width: 240px" @keyup.enter.native="handleOutboundSearch" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="el-icon-search" @click="handleOutboundSearch">搜索</el-button>
          <el-button icon="el-icon-refresh-left" @click="handleOutboundReset">重置</el-button>
        </el-form-item>
      </el-form>

      <el-table v-loading="outboundLoading" :data="outboundList" border stripe max-height="500">
        <el-table-column type="index" label="序号" width="60" align="center" :index="outboundIndexMethod" />
        <el-table-column prop="outboundNo" label="记录号" min-width="190" show-overflow-tooltip />
        <el-table-column prop="outboundTime" label="出库时间" width="170" />
        <el-table-column prop="materialCode" label="物料编号" width="140" />
        <el-table-column prop="batchNo" label="批次号" width="150" show-overflow-tooltip />
        <el-table-column prop="rollNo" label="卷号" width="120" show-overflow-tooltip />
        <el-table-column prop="outArea" label="出库面积(㎡)" width="130" align="right" />
        <el-table-column prop="purpose" label="用途" width="120" show-overflow-tooltip />
        <el-table-column prop="outboundBy" label="出库人" width="120" />
        <el-table-column prop="remark" label="备注" min-width="180" show-overflow-tooltip />
      </el-table>

      <el-pagination
        style="margin-top: 12px; text-align: right"
        :current-page="outboundPagination.current"
        :page-sizes="[20, 50, 100]"
        :page-size="outboundPagination.size"
        :total="outboundPagination.total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleOutboundSizeChange"
        @current-change="handleOutboundCurrentChange"
      />

      <div slot="footer">
        <el-button @click="outboundDialogVisible = false">关闭</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import {
  getFilmStockPage,
  getFilmStockStatistics,
  getFilmStockDetailsPage,
  getFilmOutboundList,
  createFilmStockDetail,
  updateFilmStockDetail,
  deleteFilmStockDetail,
  downloadFilmTemplate,
  importFilmStock,
  clearFilmStockForReimport,
  exportFilmStockImportFormat
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
        materialCode: '',
        thickness: null
      },
      sortField: 'createTime',
      sortOrder: 'descending',
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
      detailLoading: false,
      detailList: [],
      showUsedDetails: false,
      detailSortField: 'inboundDate',
      detailSortOrder: 'ascending',
      detailPagination: {
        current: 1,
        size: 20,
        total: 0
      },
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
      },
      outboundDialogVisible: false,
      outboundLoading: false,
      outboundList: [],
      outboundQuery: {
        outboundNo: ''
      },
      outboundPagination: {
        current: 1,
        size: 20,
        total: 0
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

    handleExportCurrent() {
      const params = {}
      if (this.searchForm.materialCode) {
        params.materialCode = this.searchForm.materialCode
      }
      if (this.searchForm.thickness) {
        params.thickness = this.searchForm.thickness
      }
      exportFilmStockImportFormat(params).then(blob => {
        this.downloadFile(blob, '薄膜库存导出-可回导.xlsx')
      }).catch(() => {
        this.$message.error('导出失败')
      })
    },

    handleImport() {
      this.$refs.fileInput.click()
    },

    async handleClearForReimport() {
      try {
        await this.$confirm(
          '该操作会清空薄膜库存主表与明细（并清空薄膜出库记录），请确认已备份。是否继续？',
          '清空薄膜仓',
          {
            confirmButtonText: '确认清空',
            cancelButtonText: '取消',
            type: 'warning'
          }
        )
      } catch (e) {
        return
      }

      this.loading = true
      try {
        const res = await clearFilmStockForReimport({ clearOutbound: true })
        if (res.code === 200 || res.code === 20000) {
          const data = res.data || {}
          this.$message.success(`清空完成：主表${data.stockDeleted || 0}条，明细${data.detailDeleted || 0}条，出库${data.outboundDeleted || 0}条`)
          this.pagination.current = 1
          await this.loadFilmStock()
        } else {
          this.$message.error(res.msg || '清空失败')
        }
      } catch (e) {
        this.$message.error('清空失败')
      } finally {
        this.loading = false
      }
    },

    async onFileChange(e) {
      const file = e.target.files[0]
      if (!file) return

      let clearBeforeImport = false
      try {
        await this.$confirm(
          '导入前是否先清空薄膜仓？建议重新盘点后选择“清空后导入”以避免重复数据。',
          '导入方式',
          {
            confirmButtonText: '清空后导入',
            cancelButtonText: '直接导入',
            distinguishCancelAndClose: true,
            closeOnClickModal: false,
            closeOnPressEscape: false,
            type: 'warning'
          }
        )
        clearBeforeImport = true
      } catch (action) {
        if (action === 'cancel') {
          clearBeforeImport = false
        } else {
          this.$refs.fileInput.value = ''
          return
        }
      }

      this.loading = true
      try {
        const res = await importFilmStock(file, { clearBeforeImport })
        if (res.code === 200 || res.code === 20000) {
          const result = res.data
          let message = `导入完成！成功导入 ${result.successCount || 0} 条数据`
          if (result.skipCount > 0) {
            message += `，跳过 ${result.skipCount} 条数据`
          }
          if ((result.successCount || 0) === 0) {
            this.$message.warning(message)
          } else {
            this.$message.success(message)
          }

          if (Array.isArray(result.errors) && result.errors.length > 0) {
            this.$alert(result.errors.slice(0, 10).join('\n'), '导入提示', {
              confirmButtonText: '知道了',
              type: 'warning'
            })
          }

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
          size: this.pagination.size,
          sortField: this.sortField,
          sortOrder: this.sortOrder
        }
        if (this.searchForm.materialCode) {
          params.materialCode = this.searchForm.materialCode
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
          await this.loadFilmStatistics()
        }
      } catch (error) {
        this.$message.error('加载薄膜库存失败')
      } finally {
        this.loading = false
        this.scheduleTableLayout()
      }
    },

    // 计算统计数据
    async loadFilmStatistics() {
      const params = {}
      if (this.searchForm.materialCode) {
        params.materialCode = this.searchForm.materialCode
      }
      if (this.searchForm.thickness) {
        params.thickness = this.searchForm.thickness
      }
      const res = await getFilmStockStatistics(params)
      if (res && (res.code === 200 || res.code === 20000)) {
        const data = res.data || {}
        this.statistics.totalTypes = Number(data.totalTypes || 0)
        this.statistics.totalArea = Number(data.totalArea || 0).toFixed(2)
        this.statistics.availableArea = Number(data.availableArea || 0).toFixed(2)
        this.statistics.lockedArea = Number(data.lockedArea || 0).toFixed(2)
      }
    },

    isPipeLikeRow(row) {
      const code = String((row && row.materialCode) || '').toUpperCase()
      const name = String((row && row.materialName) || '').toUpperCase()
      const spec = String((row && row.specDesc) || '').toUpperCase()
      return code.startsWith('PEG') || name.includes('管') || spec.includes('管')
    },

    formatSpecWithoutUnit(spec) {
      const raw = String(spec || '').trim()
      if (!raw) return '-'
      return raw
        .replace(/μm|um|mm|cm|m²|㎡|m|kg|g|支|卷|桶/gi, '')
        .replace(/\s+/g, '')
        .replace(/[*×xX]{2,}/g, '*')
        .replace(/^[*×xX]+|[*×xX]+$/g, '') || '-'
    },

    getAreaDisplay(row, value) {
      if (this.isPipeLikeRow(row)) {
        return '-'
      }
      if (value === null || value === undefined || value === '') {
        return '-'
      }
      return value
    },

    getPackCountDisplay(row, value) {
      const n = Number(value || 0)
      if (this.isPipeLikeRow(row)) {
        return `${n}支`
      }
      return n
    },

    // 搜索
    async handleSearch() {
      this.pagination.current = 1
      await this.loadFilmStock()
    },

    // 重置
    handleReset() {
      this.searchForm = {
        materialCode: '',
        thickness: null
      }
      this.sortField = 'createTime'
      this.sortOrder = 'descending'
      if (this.$refs.filmStockTable) {
        this.$refs.filmStockTable.clearSort()
      }
      this.pagination.current = 1
      this.loadFilmStock()
    },

    handleTableSortChange({ prop, order }) {
      if (!prop || !order) {
        this.sortField = 'createTime'
        this.sortOrder = 'descending'
      } else {
        this.sortField = prop
        this.sortOrder = order
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
      this.detailSortField = 'inboundDate'
      this.detailSortOrder = 'ascending'
      this.detailPagination.current = 1
      this.detailPagination.size = 20
      this.detailDialogVisible = true

      await this.loadDetailList()
    },

    async loadDetailList() {
      if (!this.currentFilm || !this.currentFilm.id) return

      this.detailLoading = true
      try {
        const params = {
          current: this.detailPagination.current,
          size: this.detailPagination.size,
          includeUsed: this.showUsedDetails,
          sortField: this.detailSortField,
          sortOrder: this.detailSortOrder
        }
        const res = await getFilmStockDetailsPage(this.currentFilm.id, params)
        if (res.code === 200 || res.code === 20000) {
          const data = res.data || {}
          this.detailList = data.records || []
          this.detailPagination.total = Number(data.total || 0)
          this.detailPagination.current = Number(data.current || this.detailPagination.current)
          this.detailPagination.size = Number(data.size || this.detailPagination.size)
        }
      } catch (error) {
        this.$message.error('加载明细失败')
      } finally {
        this.detailLoading = false
      }
    },

    handleDetailFilterChange() {
      this.detailPagination.current = 1
      this.loadDetailList()
    },

    handleDetailSortChange({ prop, order }) {
      if (!prop || !order) {
        this.detailSortField = 'inboundDate'
        this.detailSortOrder = 'ascending'
      } else {
        this.detailSortField = prop
        this.detailSortOrder = order
      }
      this.detailPagination.current = 1
      this.loadDetailList()
    },

    handleDetailSizeChange(size) {
      this.detailPagination.size = size
      this.detailPagination.current = 1
      this.loadDetailList()
    },

    handleDetailCurrentChange(current) {
      this.detailPagination.current = current
      this.loadDetailList()
    },

    detailIndexMethod(index) {
      return (this.detailPagination.current - 1) * this.detailPagination.size + index + 1
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
    async handleViewOutbound(row) {
      this.currentFilm = row || {}
      this.outboundDialogVisible = true
      this.outboundQuery = { outboundNo: '' }
      this.outboundPagination.current = 1
      await this.loadOutboundList()
    },

    async loadOutboundList() {
      if (!this.currentFilm || !this.currentFilm.id) return
      this.outboundLoading = true
      try {
        const params = {
          page: this.outboundPagination.current,
          size: this.outboundPagination.size,
          filmStockId: this.currentFilm.id,
          materialCode: this.currentFilm.materialCode || undefined,
          outboundNo: this.outboundQuery.outboundNo || undefined
        }
        const res = await getFilmOutboundList(params)
        if (res && (res.code === 200 || res.code === 20000)) {
          const data = res.data || {}
          this.outboundList = data.records || []
          this.outboundPagination.total = Number(data.total || 0)
          this.outboundPagination.current = Number(data.current || this.outboundPagination.current)
          this.outboundPagination.size = Number(data.size || this.outboundPagination.size)
        } else {
          this.$message.error((res && (res.msg || res.message)) || '加载出库记录失败')
        }
      } catch (error) {
        this.$message.error('加载出库记录失败')
      } finally {
        this.outboundLoading = false
      }
    },

    handleOutboundSearch() {
      this.outboundPagination.current = 1
      this.loadOutboundList()
    },

    handleOutboundReset() {
      this.outboundQuery = { outboundNo: '' }
      this.outboundPagination.current = 1
      this.loadOutboundList()
    },

    handleOutboundSizeChange(size) {
      this.outboundPagination.size = size
      this.outboundPagination.current = 1
      this.loadOutboundList()
    },

    handleOutboundCurrentChange(current) {
      this.outboundPagination.current = current
      this.loadOutboundList()
    },

    outboundIndexMethod(index) {
      return (this.outboundPagination.current - 1) * this.outboundPagination.size + index + 1
    },

    // 状态类型
    getStatusType(status, row) {
      if (this.isPipeLikeRow(row)) {
        const available = Number((row && row.availableRolls) || 0)
        return available > 0 ? 'success' : 'danger'
      }
      const typeMap = {
        'active': 'success',
        'low_stock': 'warning',
        'out_of_stock': 'danger'
      }
      return typeMap[status] || 'info'
    },

    // 状态文本
    getStatusText(status, row) {
      if (this.isPipeLikeRow(row)) {
        const available = Number((row && row.availableRolls) || 0)
        return available > 0 ? '正常' : '缺货'
      }
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
