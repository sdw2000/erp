<template>
  <div class="chemical-stock-container">
    <el-card>
      <div slot="header" class="clearfix">
        <span style="font-size: 18px; font-weight: bold">
          <i class="el-icon-goods" /> 化工仓库存管理
        </span>
        <div style="float: right">
          <el-button size="small" @click="goHub">返回原材料总仓</el-button>
          <el-button type="success" size="small" icon="el-icon-download" @click="handleDownloadTemplate">下载模板</el-button>
          <el-button type="warning" size="small" icon="el-icon-upload2" @click="handleImport">导入</el-button>
          <el-button type="warning" icon="el-icon-warning" size="small" @click="handleCheckExpiring">
            查看即将过期
          </el-button>
        </div>
      </div>

      <input ref="fileInput" type="file" accept=".xlsx,.xls" style="display:none" @change="onFileChange">

      <!-- 查询表单 -->
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="化工类型">
          <el-select v-model="searchForm.chemicalType" placeholder="全部" clearable style="width:150px">
            <el-option label="胶水" value="adhesive" />
            <el-option label="溶剂" value="solvent" />
            <el-option label="助剂" value="additive" />
            <el-option label="其他" value="other" />
          </el-select>
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
              <div class="stat-label">总数量</div>
              <div class="stat-value">{{ statistics.totalQuantity }}</div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="stat-card">
            <div class="stat-content">
              <div class="stat-label">可用数量</div>
              <div class="stat-value" style="color: #67c23a">{{ statistics.availableQuantity }}</div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="stat-card">
            <div class="stat-content">
              <div class="stat-label">锁定数量</div>
              <div class="stat-value" style="color: #e6a23c">{{ statistics.lockedQuantity }}</div>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 数据表格 -->
      <el-table ref="chemicalStockTable" v-loading="loading" :data="chemicalStockList" style="width: 100%" border stripe>
        <el-table-column type="index" label="序号" width="60" align="center" :index="indexMethod" />
        <el-table-column prop="materialCode" label="物料编号" width="140" />
        <el-table-column prop="materialName" label="物料名称" width="200" show-overflow-tooltip />
        <el-table-column prop="chemicalType" label="类型" width="100" align="center">
          <template slot-scope="scope">
            <el-tag :type="getChemicalTypeTag(scope.row.chemicalType)" size="small">
              {{ getChemicalTypeText(scope.row.chemicalType) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="单位/重量" width="140" align="center">
          <template slot-scope="scope">
            <span>{{ scope.row.unit }} / {{ scope.row.unitWeight }}kg</span>
          </template>
        </el-table-column>
        <el-table-column label="总数量" width="100" align="center">
          <template slot-scope="scope">
            <span style="font-weight: bold">{{ scope.row.totalQuantity }}</span>
          </template>
        </el-table-column>
        <el-table-column label="可用数量" width="100" align="center">
          <template slot-scope="scope">
            <span style="color: #67c23a; font-weight: bold">{{ scope.row.availableQuantity }}</span>
          </template>
        </el-table-column>
        <el-table-column label="桶数" width="90" align="center">
          <template slot-scope="scope">
            <span style="font-weight: bold">{{ scope.row.bucketCount == null ? '-' : scope.row.bucketCount }}</span>
          </template>
        </el-table-column>
        <el-table-column label="锁定数量" width="100" align="center">
          <template slot-scope="scope">
            <span style="color: #e6a23c">{{ scope.row.lockedQuantity }}</span>
          </template>
        </el-table-column>
        <el-table-column label="安全库存" width="100" align="center">
          <template slot-scope="scope">
            <span style="color: #909399">{{ scope.row.safetyStock }}</span>
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
    <el-dialog :visible.sync="detailDialogVisible" :title="`${currentChemical.materialName} - 库存明细`" width="90%">
      <div style="margin-bottom: 10px; text-align: right">
        <el-button type="primary" size="mini" icon="el-icon-plus" @click="openCreateDetail">新增明细</el-button>
      </div>
      <el-table :data="detailList" border stripe max-height="500">
        <el-table-column type="index" label="序号" width="60" align="center" />
        <el-table-column prop="batchNo" label="批次号" width="140" />
        <el-table-column prop="containerNo" label="桶号/包号" width="120" />
        <el-table-column prop="weight" label="重量(kg)" width="100" align="right" />
        <el-table-column prop="location" label="库位" width="100" align="center" />
        <el-table-column prop="supplier" label="供应商" width="150" show-overflow-tooltip />
        <el-table-column prop="inboundDate" label="入库日期" width="110" />
        <el-table-column prop="expiryDate" label="有效期至" width="110">
          <template slot-scope="scope">
            <span :style="getExpiryDateStyle(scope.row.expiryDate)">
              {{ scope.row.expiryDate || '-' }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="isOpened" label="是否开封" width="90" align="center">
          <template slot-scope="scope">
            <el-tag :type="scope.row.isOpened ? 'warning' : 'success'" size="small">
              {{ scope.row.isOpened ? '已开封' : '未开封' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="dangerLevel" label="危险等级" width="90" align="center">
          <template slot-scope="scope">
            <el-tag :type="getDangerLevelType(scope.row.dangerLevel)" size="small">
              {{ scope.row.dangerLevel }}级
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="90" align="center">
          <template slot-scope="scope">
            <el-tag :type="scope.row.status === 'available' ? 'success' : scope.row.status === 'locked' ? 'warning' : 'info'" size="small">
              {{ scope.row.status === 'available' ? '可用' : scope.row.status === 'locked' ? '锁定' : '已使用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="150" show-overflow-tooltip />
        <el-table-column label="操作" width="140" align="center" fixed="right">
          <template slot-scope="scope">
            <el-button type="text" size="mini" @click="openEditDetail(scope.row)">编辑</el-button>
            <el-button type="text" size="mini" style="color:#f56c6c" @click="handleDeleteDetail(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div slot="footer" class="dialog-footer">
        <el-button @click="detailDialogVisible = false">关闭</el-button>
      </div>
    </el-dialog>

    <el-dialog :visible.sync="detailEditDialogVisible" :title="detailEditMode === 'create' ? '新增明细' : '编辑明细'" width="700px">
      <el-form :model="detailForm" label-width="95px" size="small">
        <el-row :gutter="12">
          <el-col :span="12"><el-form-item label="批次号"><el-input v-model="detailForm.batchNo" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="桶号/包号"><el-input v-model="detailForm.containerNo" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="单位"><el-input v-model="detailForm.unit" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="重量(kg)"><el-input-number v-model="detailForm.weight" :min="0" :precision="2" :controls="false" style="width:100%" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="库位"><el-input v-model="detailForm.location" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="供应商"><el-input v-model="detailForm.supplier" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="入库日期"><el-date-picker v-model="detailForm.inboundDate" type="date" value-format="yyyy-MM-dd" style="width:100%" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="有效期至"><el-date-picker v-model="detailForm.expiryDate" type="date" value-format="yyyy-MM-dd" style="width:100%" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="是否开封"><el-switch v-model="detailForm.isOpened" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="危险等级"><el-select v-model="detailForm.dangerLevel" style="width:100%"><el-option :value="1" label="1级" /><el-option :value="2" label="2级" /><el-option :value="3" label="3级" /></el-select></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="状态"><el-select v-model="detailForm.status" style="width:100%"><el-option label="可用" value="available" /><el-option label="锁定" value="locked" /><el-option label="已使用" value="used" /></el-select></el-form-item></el-col>
          <el-col :span="24"><el-form-item label="备注"><el-input v-model="detailForm.remark" type="textarea" :rows="2" /></el-form-item></el-col>
        </el-row>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="detailEditDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSaveDetail">保存</el-button>
      </div>
    </el-dialog>

    <!-- 即将过期对话框 -->
    <el-dialog :visible.sync="expiringDialogVisible" title="即将过期的化工原料（30天内）" width="80%">
      <el-table :data="expiringList" border stripe max-height="500">
        <el-table-column type="index" label="序号" width="60" align="center" />
        <el-table-column prop="materialCode" label="物料编号" width="140" />
        <el-table-column prop="batchNo" label="批次号" width="140" />
        <el-table-column prop="containerNo" label="桶号/包号" width="120" />
        <el-table-column prop="weight" label="重量(kg)" width="100" align="right" />
        <el-table-column prop="expiryDate" label="有效期至" width="110">
          <template slot-scope="scope">
            <span style="color: #f56c6c; font-weight: bold">{{ scope.row.expiryDate }}</span>
          </template>
        </el-table-column>
        <el-table-column label="剩余天数" width="100" align="center">
          <template slot-scope="scope">
            <el-tag :type="getRemainingDaysType(scope.row.expiryDate)" size="small">
              {{ calculateRemainingDays(scope.row.expiryDate) }}天
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="location" label="库位" width="100" align="center" />
        <el-table-column prop="supplier" label="供应商" width="150" show-overflow-tooltip />
      </el-table>
      <div slot="footer" class="dialog-footer">
        <el-button type="primary" @click="expiringDialogVisible = false">关闭</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import {
  getChemicalStockPage,
  getChemicalStockDetails,
  createChemicalStockDetail,
  updateChemicalStockDetail,
  deleteChemicalStockDetail,
  getExpiringChemicals,
  downloadChemicalTemplate,
  importChemicalStock
} from '@/api/rawMaterialStock'
import elTableAutoLayout from '@/mixins/elTableAutoLayout'

export default {
  name: 'ChemicalStock',
  mixins: [elTableAutoLayout],
  tableLayoutRefs: ['chemicalStockTable'],
  data() {
    return {
      loading: false,
      searchForm: {
        chemicalType: ''
      },
      chemicalStockList: [],
      pagination: {
        current: 1,
        size: 20,
        total: 0
      },
      statistics: {
        totalTypes: 0,
        totalQuantity: 0,
        availableQuantity: 0,
        lockedQuantity: 0
      },
      detailDialogVisible: false,
      currentChemical: {},
      detailList: [],
      detailEditDialogVisible: false,
      detailEditMode: 'create',
      detailForm: {
        id: null,
        batchNo: '',
        containerNo: '',
        unit: '桶',
        weight: 0,
        location: '',
        supplier: '',
        inboundDate: '',
        expiryDate: '',
        isOpened: false,
        dangerLevel: 1,
        status: 'available',
        remark: ''
      },
      expiringDialogVisible: false,
      expiringList: []
    }
  },
  mounted() {
    this.loadChemicalStock()
  },
  methods: {
    goHub() {
      this.$router.push({ path: '/stock/raw-material-hub' })
    },

    handleDownloadTemplate() {
      downloadChemicalTemplate().then(blob => {
        this.downloadFile(blob, '化工库存导入模板.xlsx')
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
        const res = await importChemicalStock(file)
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
          this.loadChemicalStock()
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
      this.downloadFile(blob, 'chemical_stock_skipped_data.xlsx')
    },

    // 加载化工库存
    async loadChemicalStock() {
      this.loading = true
      try {
        const params = {
          current: this.pagination.current,
          size: this.pagination.size
        }
        if (this.searchForm.chemicalType) {
          params.chemicalType = this.searchForm.chemicalType
        }
        const res = await getChemicalStockPage(params)
        if (res.code === 200 || res.code === 20000) {
          const pageData = res.data || {}
          this.chemicalStockList = pageData.records || []
          this.pagination.total = Number(pageData.total || 0)
          this.pagination.current = Number(pageData.current || this.pagination.current)
          this.pagination.size = Number(pageData.size || this.pagination.size)
          this.calculateStatistics()
        }
      } catch (error) {
        this.$message.error('加载化工库存失败')
      } finally {
        this.loading = false
        this.scheduleTableLayout()
      }
    },

    // 计算统计数据
    calculateStatistics() {
      this.statistics.totalTypes = this.pagination.total
      this.statistics.totalQuantity = this.chemicalStockList.reduce((sum, item) => sum + parseInt(item.totalQuantity || 0), 0)
      this.statistics.availableQuantity = this.chemicalStockList.reduce((sum, item) => sum + parseInt(item.availableQuantity || 0), 0)
      this.statistics.lockedQuantity = this.chemicalStockList.reduce((sum, item) => sum + parseInt(item.lockedQuantity || 0), 0)
    },

    // 搜索
    async handleSearch() {
      this.pagination.current = 1
      await this.loadChemicalStock()
    },

    // 重置
    handleReset() {
      this.searchForm = { chemicalType: '' }
      this.pagination.current = 1
      this.loadChemicalStock()
    },

    handleSizeChange(size) {
      this.pagination.size = size
      this.pagination.current = 1
      this.loadChemicalStock()
    },

    handleCurrentChange(current) {
      this.pagination.current = current
      this.loadChemicalStock()
    },

    indexMethod(index) {
      return (this.pagination.current - 1) * this.pagination.size + index + 1
    },

    // 查看明细
    async handleViewDetails(row) {
      this.currentChemical = row
      this.detailDialogVisible = true

      await this.loadDetailList()
    },

    async loadDetailList() {
      if (!this.currentChemical || !this.currentChemical.id) return

      try {
        const res = await getChemicalStockDetails(this.currentChemical.id)
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
        containerNo: '',
        unit: this.currentChemical.unit || '桶',
        weight: Number(this.currentChemical.unitWeight || 0),
        location: '',
        supplier: '',
        inboundDate: new Date().toISOString().slice(0, 10),
        expiryDate: '',
        isOpened: false,
        dangerLevel: 1,
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
        containerNo: row.containerNo || '',
        unit: row.unit || this.currentChemical.unit || '桶',
        weight: Number(row.weight || 0),
        location: row.location || '',
        supplier: row.supplier || '',
        inboundDate: row.inboundDate || '',
        expiryDate: row.expiryDate || '',
        isOpened: !!row.isOpened,
        dangerLevel: row.dangerLevel || 1,
        status: row.status || 'available',
        remark: row.remark || ''
      }
      this.detailEditDialogVisible = true
    },

    async handleSaveDetail() {
      try {
        const payload = { ...this.detailForm }
        if (this.detailEditMode === 'create') {
          const res = await createChemicalStockDetail(this.currentChemical.id, payload)
          if (!(res.code === 200 || res.code === 20000)) {
            this.$message.error(res.msg || '新增失败')
            return
          }
          this.$message.success('新增成功')
        } else {
          const res = await updateChemicalStockDetail(this.currentChemical.id, this.detailForm.id, payload)
          if (!(res.code === 200 || res.code === 20000)) {
            this.$message.error(res.msg || '更新失败')
            return
          }
          this.$message.success('更新成功')
        }
        this.detailEditDialogVisible = false
        await this.loadDetailList()
        await this.loadChemicalStock()
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
          const res = await deleteChemicalStockDetail(this.currentChemical.id, row.id)
          if (res.code === 200 || res.code === 20000) {
            this.$message.success('删除成功')
            await this.loadDetailList()
            await this.loadChemicalStock()
          } else {
            this.$message.error(res.msg || '删除失败')
          }
        } catch (e) {
          const msg = (e && e.response && e.response.data && (e.response.data.msg || e.response.data.message)) || '删除失败，请检查权限或后端日志'
          this.$message.error(msg)
        }
      }).catch(() => {})
    },

    // 查看出库记录
    handleViewOutbound(row) {
      this.$message.info('出库记录功能开发中...')
    },

    // 查看即将过期
    async handleCheckExpiring() {
      this.expiringDialogVisible = true

      try {
        const res = await getExpiringChemicals(30)
        if (res.code === 20000) {
          this.expiringList = res.data || []
          if (this.expiringList.length === 0) {
            this.$message.success('暂无即将过期的化工原料')
          }
        }
      } catch (error) {
        this.$message.error('加载即将过期数据失败')
      }
    },

    // 化工类型标签
    getChemicalTypeTag(type) {
      const tagMap = {
        'adhesive': '',
        'solvent': 'success',
        'additive': 'warning',
        'other': 'info'
      }
      return tagMap[type] || 'info'
    },

    // 化工类型文本
    getChemicalTypeText(type) {
      const textMap = {
        'adhesive': '胶水',
        'solvent': '溶剂',
        'additive': '助剂',
        'other': '其他'
      }
      return textMap[type] || type
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
    },

    // 危险等级类型
    getDangerLevelType(level) {
      if (level === 1) return 'success'
      if (level === 2) return 'warning'
      if (level === 3) return 'danger'
      return 'info'
    },

    // 有效期样式
    getExpiryDateStyle(expiryDate) {
      if (!expiryDate) return {}
      const days = this.calculateRemainingDays(expiryDate)
      if (days <= 0) return { color: '#f56c6c', fontWeight: 'bold' }
      if (days <= 30) return { color: '#e6a23c', fontWeight: 'bold' }
      return {}
    },

    // 计算剩余天数
    calculateRemainingDays(expiryDate) {
      if (!expiryDate) return 0
      const today = new Date()
      const expiry = new Date(expiryDate)
      const diff = expiry - today
      return Math.ceil(diff / (1000 * 60 * 60 * 24))
    },

    // 剩余天数类型
    getRemainingDaysType(expiryDate) {
      const days = this.calculateRemainingDays(expiryDate)
      if (days <= 0) return 'danger'
      if (days <= 7) return 'danger'
      if (days <= 15) return 'warning'
      return 'success'
    }
  }
}
</script>

<style scoped>
.chemical-stock-container {
  padding: 20px;
}

.search-form {
  margin-bottom: 15px;
}

.stat-card {
  border-left: 4px solid #67c23a;
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
