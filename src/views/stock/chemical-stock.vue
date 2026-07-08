<template>
  <div class="chemical-stock-container">
    <el-card>
      <div slot="header" class="clearfix">
        <span style="font-size: 18px; font-weight: bold">
          <i class="el-icon-goods" /> 化工仓库存管理
        </span>
        <div style="float: right">
          <el-button size="small" @click="goHub">返回原材料总仓</el-button>
          <el-button v-if="$hasRole('admin')" type="primary" size="small" icon="el-icon-download" @click="handleExportCurrent">导出当前库存</el-button>
          <el-button v-if="$hasRole('admin')" type="success" size="small" icon="el-icon-download" @click="handleDownloadTemplate">下载模板</el-button>
          <el-button v-if="$hasRole('admin')" type="danger" size="small" icon="el-icon-delete" @click="handleClearForReimport">清空化工仓</el-button>
          <el-button v-if="$hasRole('admin')" type="warning" size="small" icon="el-icon-upload2" @click="handleImport">导入</el-button>
          <el-button v-if="$hasRole('admin')" type="warning" icon="el-icon-warning" size="small" @click="handleCheckExpiring">
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
        <el-form-item label="料号">
          <el-input v-model.trim="searchForm.materialCode" placeholder="请输入物料编号" clearable style="width:180px" @keyup.enter.native="handleSearch" />
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
              <div class="stat-value">{{ statistics.totalQuantity | numberFixed }}</div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="stat-card">
            <div class="stat-content">
              <div class="stat-label">可用数量</div>
              <div class="stat-value" style="color: #67c23a">{{ statistics.availableQuantity | numberFixed }}</div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="stat-card">
            <div class="stat-content">
              <div class="stat-label">锁定数量</div>
              <div class="stat-value" style="color: #e6a23c">{{ statistics.lockedQuantity | numberFixed }}</div>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 数据表格 -->
      <el-table ref="chemicalStockTable" v-loading="loading" :data="chemicalStockList" style="width: 100%" border stripe @sort-change="handleTableSortChange">
        <el-table-column type="index" label="序号" width="60" align="center" :index="indexMethod" />
        <el-table-column prop="materialCode" label="物料编号" width="140" sortable="custom" />
        <el-table-column prop="materialName" label="物料名称" width="200" show-overflow-tooltip sortable="custom" />
        <el-table-column prop="chemicalType" label="类型" width="100" align="center" sortable="custom">
          <template slot-scope="scope">
            <el-tag :type="getChemicalTypeTag(scope.row.chemicalType)" size="small">
              {{ getChemicalTypeText(scope.row.chemicalType) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="unitWeight" label="单位/重量" width="140" align="center" sortable="custom">
          <template slot-scope="scope">
            <span>{{ scope.row.unit }} / {{ scope.row.unitWeight }}kg</span>
          </template>
        </el-table-column>
        <el-table-column prop="totalQuantity" label="总数量" width="100" align="center" sortable="custom">
          <template slot-scope="scope">
            <span style="font-weight: bold">{{ scope.row.totalQuantity | numberFixed }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="availableQuantity" label="可用数量" width="100" align="center" sortable="custom">
          <template slot-scope="scope">
            <span style="color: #67c23a; font-weight: bold">{{ scope.row.availableQuantity | numberFixed }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="bucketCount" label="桶数" width="90" align="center" sortable="custom">
          <template slot-scope="scope">
            <span style="font-weight: bold">{{ scope.row.bucketCount == null ? '-' : (Number(scope.row.bucketCount).toFixed(2)) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="lockedQuantity" label="锁定数量" width="100" align="center" sortable="custom">
          <template slot-scope="scope">
            <span style="color: #e6a23c">{{ scope.row.lockedQuantity | numberFixed }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="safetyStock" label="安全库存" width="100" align="center" sortable="custom">
          <template slot-scope="scope">
            <span style="color: #909399">{{ scope.row.safetyStock }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100" align="center" sortable="custom">
          <template slot-scope="scope">
            <el-tag :type="getStatusType(scope.row.status)" size="small">
              {{ getStatusText(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="260" align="center" fixed="right">
          <template slot-scope="scope">
            <el-button v-if="$hasRole('admin')" type="text" icon="el-icon-edit" @click="openEditStock(scope.row)">编辑</el-button>
            <el-button type="text" icon="el-icon-view" @click="handleViewDetails(scope.row)">查看明细</el-button>
            <el-button type="text" icon="el-icon-document" @click="handleViewOutbound(scope.row)">进出仓记录</el-button>
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
        <el-select v-model="detailStatusFilter" size="mini" style="width: 160px; margin-right: 12px">
          <el-option label="仅可用" value="available" />
          <el-option label="仅锁定" value="locked" />
          <el-option label="仅已用完" value="used" />
          <el-option label="全部" value="all" />
        </el-select>
        <el-button v-if="$hasRole('admin')" type="primary" size="mini" icon="el-icon-plus" @click="openCreateDetail">新增明细</el-button>
      </div>
      <el-table :data="filteredDetailList" border stripe max-height="500">
        <el-table-column type="index" label="序号" width="60" align="center" />
        <el-table-column prop="batchNo" label="批次号" width="140" />
        <el-table-column prop="containerNo" label="桶号/包号" width="120" />
        <el-table-column label="规格" min-width="180" show-overflow-tooltip>
          <template slot-scope="scope">
            {{ formatChemicalDetailSpec(scope.row) }}
          </template>
        </el-table-column>
        <el-table-column prop="packUom" label="包装单位" width="90" align="center" />
        <el-table-column prop="packCount" label="包装数" width="90" align="right" />
        <el-table-column prop="stdQtyPerPack" label="每包标准量" width="120" align="right">
          <template slot-scope="scope">
            <span>{{ scope.row.stdQtyPerPack == null ? '-' : Number(scope.row.stdQtyPerPack).toFixed(3) }}</span>
            <span style="color:#909399; margin-left:4px;">{{ scope.row.stdUom || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="weight" label="重量(kg)" width="100" align="right" />
        <el-table-column prop="location" label="库位" width="100" align="center" />
        <el-table-column prop="supplier" label="供应商" width="150" show-overflow-tooltip />
        <el-table-column prop="purchaseOrderNo" label="采购单号" width="140" show-overflow-tooltip />
        <el-table-column prop="arrivalDate" label="到货日期" width="110" />
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
        <el-table-column v-if="$hasRole('admin')" label="操作" width="140" align="center" fixed="right">
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

    <el-dialog :visible.sync="stockEditDialogVisible" title="编辑化工库存" width="720px">
      <el-form :model="stockEditForm" label-width="100px" size="small">
        <el-row :gutter="12">
          <el-col :span="12"><el-form-item label="物料编号"><el-input v-model="stockEditForm.materialCode" disabled /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="物料名称"><el-input v-model="stockEditForm.materialName" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="类型"><el-select v-model="stockEditForm.chemicalType" style="width:100%"><el-option label="胶水" value="adhesive" /><el-option label="溶剂" value="solvent" /><el-option label="助剂" value="additive" /><el-option label="其他" value="other" /></el-select></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="单位"><el-input v-model="stockEditForm.unit" placeholder="如 PCS / 桶" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="单位重量"><el-input-number v-model="stockEditForm.unitWeight" :min="0" :precision="3" :controls="false" style="width:100%" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="总数量"><el-input-number v-model="stockEditForm.totalQuantity" :min="0" :precision="0" :controls="false" style="width:100%" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="可用数量"><el-input-number v-model="stockEditForm.availableQuantity" :min="0" :precision="0" :controls="false" style="width:100%" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="锁定数量"><el-input-number v-model="stockEditForm.lockedQuantity" :min="0" :precision="0" :controls="false" style="width:100%" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="桶数/件数"><el-input-number v-model="stockEditForm.bucketCount" :min="0" :precision="0" :controls="false" style="width:100%" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="安全库存"><el-input-number v-model="stockEditForm.safetyStock" :min="0" :precision="0" :controls="false" style="width:100%" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="状态"><el-select v-model="stockEditForm.status" style="width:100%"><el-option label="正常" value="active" /><el-option label="库存不足" value="low_stock" /><el-option label="缺货" value="out_of_stock" /></el-select></el-form-item></el-col>
          <el-col :span="24"><el-form-item label="备注"><el-input v-model="stockEditForm.remark" type="textarea" :rows="2" /></el-form-item></el-col>
        </el-row>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="stockEditDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSaveStockEdit">保存</el-button>
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

    <el-dialog :visible.sync="flowDialogVisible" :title="`${flowTarget.materialCode || '-'} - 进出仓记录`" width="88%">
      <el-table v-loading="flowLoading" :data="flowList" border stripe max-height="520">
        <el-table-column type="index" label="序号" width="60" align="center" />
        <el-table-column prop="documentTime" label="时间" width="170">
          <template slot-scope="scope">
            {{ formatFlowTime(scope.row.documentTime || scope.row.createTime) }}
          </template>
        </el-table-column>
        <el-table-column prop="type" label="操作" width="90" align="center">
          <template slot-scope="scope">
            <el-tag :type="getFlowTypeTag(scope.row.type)" size="small">
              {{ getFlowTypeText(scope.row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="materialCode" label="料号" width="150" show-overflow-tooltip />
        <el-table-column prop="productName" label="产品名称" min-width="140" show-overflow-tooltip />
        <el-table-column prop="specDesc" label="规格" min-width="130" show-overflow-tooltip />
        <el-table-column prop="batchNo" label="批次号" width="140" show-overflow-tooltip />
        <el-table-column prop="changeQuantity" label="变动量" width="130" align="right">
          <template slot-scope="scope">
            <span :class="qtyClass(scope.row.changeQuantity)">{{ formatFlowQty(scope.row.changeQuantity) }}</span>
            <span style="color:#909399; margin-left:4px;">{{ scope.row.unit || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="stdChangeQuantity" label="标准量" width="150" align="right">
          <template slot-scope="scope">
            <span>{{ formatFlowQty(scope.row.stdChangeQuantity) }}</span>
            <span style="color:#909399; margin-left:4px;">{{ scope.row.stdUnit || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="beforeQuantity" label="变动前" width="90" align="right" />
        <el-table-column prop="afterQuantity" label="变动后" width="90" align="right" />
        <el-table-column prop="refNo" label="关联单号" width="180" show-overflow-tooltip />
        <el-table-column prop="operator" label="操作人" width="100" align="center" />
        <el-table-column prop="remark" label="备注" min-width="180" show-overflow-tooltip />
      </el-table>
      <div slot="footer" class="dialog-footer">
        <el-button @click="flowDialogVisible = false">关闭</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import {
  getChemicalStockPage,
  getChemicalStockStatistics,
  updateChemicalStock,
  getChemicalStockDetails,
  createChemicalStockDetail,
  updateChemicalStockDetail,
  deleteChemicalStockDetail,
  getExpiringChemicals,
  downloadChemicalTemplate,
  importChemicalStock,
  clearChemicalStockForReimport,
  exportChemicalStockImportFormat
} from '@/api/rawMaterialStock'
import { getUnifiedStockFlowByStock, getUnifiedStockFlowPage } from '@/api/stockFlow'
import elTableAutoLayout from '@/mixins/elTableAutoLayout'

export default {
  name: 'ChemicalStock',
  mixins: [elTableAutoLayout],
  tableLayoutRefs: ['chemicalStockTable'],
  data() {
    return {
      loading: false,
      searchForm: {
        chemicalType: '',
        materialCode: ''
      },
      sortField: 'createTime',
      sortOrder: 'descending',
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
      detailStatusFilter: 'available',
      detailEditDialogVisible: false,
      detailEditMode: 'create',
      stockEditDialogVisible: false,
      stockEditForm: {
        id: null,
        materialCode: '',
        materialName: '',
        chemicalType: 'other',
        unit: '桶',
        unitWeight: 0,
        totalQuantity: 0,
        availableQuantity: 0,
        lockedQuantity: 0,
        bucketCount: 0,
        safetyStock: 0,
        status: 'active',
        remark: ''
      },
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
      expiringList: [],
      flowDialogVisible: false,
      flowLoading: false,
      flowList: [],
      flowTarget: {}
    }
  },
  computed: {
    filteredDetailList() {
      const list = Array.isArray(this.detailList) ? this.detailList : []
      if (this.detailStatusFilter === 'all') {
        return list
      }
      return list.filter(item => String(item && item.status || '').toLowerCase() === this.detailStatusFilter)
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

    handleExportCurrent() {
      const params = {}
      if (this.searchForm.chemicalType) {
        params.chemicalType = this.searchForm.chemicalType
      }
      if (this.searchForm.materialCode) {
        params.materialCode = this.searchForm.materialCode
      }
      exportChemicalStockImportFormat(params).then(blob => {
        this.downloadFile(blob, '化工库存导出-可回导.xlsx')
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
          '该操作会清空化工库存主表与明细（并清空化工出库记录），请确认已备份。是否继续？',
          '清空化工仓',
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
        const res = await clearChemicalStockForReimport({ clearOutbound: true })
        if (res.code === 200 || res.code === 20000) {
          const data = res.data || {}
          this.$message.success(`清空完成：主表${data.stockDeleted || 0}条，明细${data.detailDeleted || 0}条，出库${data.outboundDeleted || 0}条`)
          this.pagination.current = 1
          await this.loadChemicalStock()
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
          '导入前是否先清空化工仓？建议重新盘点后选择“清空后导入”以避免重复数据。',
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
        const res = await importChemicalStock(file, { clearBeforeImport })
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
        const params = this.buildListParams()
        const res = await getChemicalStockPage(params)
        if (res.code === 200 || res.code === 20000) {
          const pageData = res.data || {}
          this.chemicalStockList = pageData.records || []
          this.pagination.total = Number(pageData.total || 0)
          this.pagination.current = Number(pageData.current || this.pagination.current)
          this.pagination.size = Number(pageData.size || this.pagination.size)
          await this.loadStatistics()
        }
      } catch (error) {
        this.$message.error('加载化工库存失败')
      } finally {
        this.loading = false
        this.scheduleTableLayout()
      }
    },

    buildFilterParams() {
      const params = {}
      if (this.searchForm.chemicalType) {
        params.chemicalType = this.searchForm.chemicalType
      }
      if (this.searchForm.materialCode) {
        params.materialCode = this.searchForm.materialCode
      }
      return params
    },

    buildListParams() {
      return {
        current: this.pagination.current,
        size: this.pagination.size,
        sortField: this.sortField,
        sortOrder: this.sortOrder,
        ...this.buildFilterParams()
      }
    },

    // 加载统计数据（后端全表聚合，非当前页）
    async loadStatistics() {
      const res = await getChemicalStockStatistics(this.buildFilterParams())
      if (res.code === 200 || res.code === 20000) {
        const data = res.data || {}
        this.statistics.totalTypes = Number(data.totalTypes || 0)
        this.statistics.totalQuantity = Number(data.totalQuantity || 0)
        this.statistics.availableQuantity = Number(data.availableQuantity || 0)
        this.statistics.lockedQuantity = Number(data.lockedQuantity || 0)
      }
    },

    // 搜索
    async handleSearch() {
      this.pagination.current = 1
      await this.loadChemicalStock()
    },

    // 重置
    handleReset() {
      this.searchForm = {
        chemicalType: '',
        materialCode: ''
      }
      this.sortField = 'createTime'
      this.sortOrder = 'descending'
      if (this.$refs.chemicalStockTable) {
        this.$refs.chemicalStockTable.clearSort()
      }
      this.pagination.current = 1
      this.loadChemicalStock()
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
      this.detailStatusFilter = 'available'
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

    openEditStock(row) {
      this.stockEditForm = {
        id: row.id,
        materialCode: row.materialCode || '',
        materialName: row.materialName || '',
        chemicalType: row.chemicalType || 'other',
        unit: row.unit || '桶',
        unitWeight: Number(row.unitWeight || 0),
        totalQuantity: Number(row.totalQuantity || 0),
        availableQuantity: Number(row.availableQuantity || 0),
        lockedQuantity: Number(row.lockedQuantity || 0),
        bucketCount: Number(row.bucketCount || 0),
        safetyStock: Number(row.safetyStock || 0),
        status: row.status || 'active',
        remark: row.remark || ''
      }
      this.stockEditDialogVisible = true
    },

    async handleSaveStockEdit() {
      if (!this.stockEditForm.id) return
      try {
        const payload = {
          materialName: this.stockEditForm.materialName,
          chemicalType: this.stockEditForm.chemicalType,
          unit: this.stockEditForm.unit,
          unitWeight: Number(this.stockEditForm.unitWeight || 0),
          totalQuantity: Number(this.stockEditForm.totalQuantity || 0),
          availableQuantity: Number(this.stockEditForm.availableQuantity || 0),
          lockedQuantity: Number(this.stockEditForm.lockedQuantity || 0),
          bucketCount: Number(this.stockEditForm.bucketCount || 0),
          safetyStock: Number(this.stockEditForm.safetyStock || 0),
          status: this.stockEditForm.status,
          remark: this.stockEditForm.remark
        }
        const res = await updateChemicalStock(this.stockEditForm.id, payload)
        if (res.code === 200 || res.code === 20000) {
          this.$message.success('更新成功')
          this.stockEditDialogVisible = false
          await this.loadChemicalStock()
        } else {
          this.$message.error(res.msg || '更新失败')
        }
      } catch (e) {
        this.$message.error('更新失败')
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

    // 查看进出仓记录
    async handleViewOutbound(row) {
      this.flowTarget = row || {}
      this.flowDialogVisible = true
      this.flowLoading = true
      this.flowList = []
      try {
        const stockId = row && row.id
        let records = []

        if (stockId) {
          const byStockRes = await getUnifiedStockFlowByStock('CHEMICAL', stockId)
          const ok = byStockRes && (byStockRes.code === 200 || byStockRes.code === 20000)
          if (ok) {
            records = Array.isArray(byStockRes.data) ? byStockRes.data : []
          }
        }

        if (!records.length) {
          const pageRes = await getUnifiedStockFlowPage({
            current: 1,
            size: 500,
            stockType: 'CHEMICAL',
            materialCode: row && row.materialCode ? row.materialCode : undefined,
            sortField: 'createTime',
            sortOrder: 'descending'
          })
          const ok = pageRes && (pageRes.code === 200 || pageRes.code === 20000)
          if (ok) {
            const page = pageRes.data || {}
            records = Array.isArray(page.records) ? page.records : []
          }
        }

        this.flowList = (records || [])
          .filter(item => ['IN', 'OUT'].includes(String(item && item.type)))
          .sort((a, b) => {
            const ta = new Date((a && (a.documentTime || a.createTime)) || 0).getTime() || 0
            const tb = new Date((b && (b.documentTime || b.createTime)) || 0).getTime() || 0
            return tb - ta
          })

        if (!this.flowList.length) {
          this.$message.info('该料号暂无进出仓记录')
        }
      } catch (error) {
        this.$message.error('加载进出仓记录失败')
      } finally {
        this.flowLoading = false
      }
    },

    getFlowTypeText(type) {
      const map = { IN: '入库', OUT: '出库', ADJUST: '调整', CONSUME: '消耗' }
      return map[type] || (type || '-')
    },

    getFlowTypeTag(type) {
      const map = { IN: 'success', OUT: 'danger', ADJUST: 'warning', CONSUME: 'info' }
      return map[type] || 'info'
    },

    formatFlowQty(val) {
      if (val === null || val === undefined || val === '') return '-'
      const n = Number(val)
      if (Number.isNaN(n)) return val
      return n > 0 ? `+${n}` : `${n}`
    },

    qtyClass(val) {
      const n = Number(val || 0)
      if (n > 0) return 'qty-plus'
      if (n < 0) return 'qty-minus'
      return ''
    },

    formatFlowTime(val) {
      if (!val) return '-'
      const s = String(val).trim()
      const normalized = s.includes('T') ? s.replace('T', ' ') : s
      const d = new Date(normalized)
      if (Number.isNaN(d.getTime())) return s
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      const hh = String(d.getHours()).padStart(2, '0')
      const mm = String(d.getMinutes()).padStart(2, '0')
      const ss = String(d.getSeconds()).padStart(2, '0')
      return `${y}-${m}-${day} ${hh}:${mm}:${ss}`
    },

    formatChemicalDetailSpec(row) {
      if (!row) return '-'
      const remark = String(row.remark || '')
      const m = remark.match(/\|spec=([^|]+)\|/)
      if (m && m[1]) {
        try {
          return decodeURIComponent(m[1])
        } catch (e) {
          return m[1]
        }
      }
      const qty = row.stdQtyPerPack == null ? null : Number(row.stdQtyPerPack)
      if (Number.isFinite(qty) && qty > 0) {
        return `${qty.toFixed(3)}${row.stdUom || ''}/${row.packUom || row.unit || ''}`
      }
      return '-'
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

.qty-plus {
  color: #67c23a;
  font-weight: 600;
}

.qty-minus {
  color: #f56c6c;
  font-weight: 600;
}
</style>
