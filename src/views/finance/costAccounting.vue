<template>
  <div class="app-container">
    <el-card>
      <div slot="header" class="clearfix">
        <span>涂布成本核算（理论成本 vs 领料成本）</span>
      </div>

      <el-form :inline="true" size="small" class="mb12">
        <el-form-item label="月份">
          <el-date-picker
            v-model="query.month"
            type="month"
            value-format="yyyy-MM"
            placeholder="选择月份"
            style="width: 140px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="el-icon-search" @click="loadAll">查询</el-button>
        </el-form-item>
      </el-form>

      <el-row :gutter="12" class="mb12">
        <el-col :span="6"><el-alert :closable="false" title="理论成本合计" :description="formatMoney(summary.totalTheoreticalCost)" type="info" /></el-col>
        <el-col :span="6"><el-alert :closable="false" title="领料成本合计" :description="formatMoney(summary.totalIssuedCost)" type="warning" /></el-col>
        <el-col :span="6"><el-alert :closable="false" title="固定费用+工资" :description="formatMoney(Number(summary.totalFixedCost || 0) + Number(summary.salaryTotal || 0))" type="success" /></el-col>
        <el-col :span="6"><el-alert :closable="false" title="差异（领料-理论）" :description="formatMoney(summary.variance)" :type="Number(summary.variance || 0) >= 0 ? 'warning' : 'success'" /></el-col>
      </el-row>

      <el-table :data="list" border stripe>
        <el-table-column prop="orderDate" label="订单日期" width="110" />
        <el-table-column prop="orderNo" label="订单号" min-width="140" />
        <el-table-column prop="orderArea" label="订单面积" width="110" align="right">
          <template slot-scope="scope">{{ formatMoney(scope.row.orderArea) }}</template>
        </el-table-column>
        <el-table-column prop="theoreticalCost" label="涂布理论成本" width="140" align="right">
          <template slot-scope="scope">{{ formatMoney(scope.row.theoreticalCost) }}</template>
        </el-table-column>
        <el-table-column prop="issuedArea" label="领料面积" width="110" align="right">
          <template slot-scope="scope">{{ formatMoney(scope.row.issuedArea) }}</template>
        </el-table-column>
        <el-table-column prop="issuedCost" label="领料成本" width="130" align="right">
          <template slot-scope="scope">{{ formatMoney(scope.row.issuedCost) }}</template>
        </el-table-column>
        <el-table-column prop="variance" label="差异" width="120" align="right">
          <template slot-scope="scope">
            <span :style="{ color: Number(scope.row.variance) >= 0 ? '#e6a23c' : '#67c23a' }">{{ formatMoney(scope.row.variance) }}</span>
          </template>
        </el-table-column>
      </el-table>

      <div class="mt12" style="text-align:right">
        <el-pagination
          background
          layout="total, prev, pager, next"
          :current-page="query.pageNum"
          :page-size="query.pageSize"
          :total="total"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>

    <el-card class="mt12">
      <div slot="header" class="clearfix">
        <span>理论单价配置</span>
      </div>
      <el-form :inline="true" size="small" class="mb12">
        <el-form-item label="关键字">
          <el-input v-model="materialQuery.keyword" placeholder="料号/名称" clearable style="width:200px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="el-icon-search" @click="loadMaterialConfig">查询</el-button>
          <el-button type="success" icon="el-icon-plus" @click="openMaterialDialog">新增配置</el-button>
        </el-form-item>
      </el-form>

      <el-table :data="materialList" border stripe>
        <el-table-column prop="materialCode" label="料号" min-width="160" />
        <el-table-column prop="materialName" label="名称" min-width="140" />
        <el-table-column prop="theoreticalUnitCost" label="理论单价(元/㎡)" width="150" align="right" />
        <el-table-column prop="effectiveMonth" label="生效月份" width="120" />
        <el-table-column prop="updatedAt" label="更新时间" min-width="150" />
      </el-table>
    </el-card>

    <el-dialog title="新增理论单价配置" :visible.sync="materialDialogVisible" width="520px">
      <el-form :model="materialForm" label-width="100px" size="small">
        <el-form-item label="料号">
          <el-input v-model="materialForm.materialCode" />
        </el-form-item>
        <el-form-item label="名称">
          <el-input v-model="materialForm.materialName" />
        </el-form-item>
        <el-form-item label="理论单价">
          <el-input-number v-model="materialForm.theoreticalUnitCost" :precision="4" :step="0.01" :min="0" style="width:100%" />
        </el-form-item>
        <el-form-item label="生效月份">
          <el-date-picker v-model="materialForm.effectiveMonth" type="month" value-format="yyyy-MM" style="width:100%" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="materialForm.remark" />
        </el-form-item>
      </el-form>
      <span slot="footer">
        <el-button @click="materialDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitMaterial">保存</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import {
  getCoatingCostAccounting,
  getCoatingCostSummary,
  getMaterialCostConfigPage,
  saveMaterialCostConfig
} from '@/api/finance'

export default {
  name: 'FinanceCostAccounting',
  data() {
    return {
      query: {
        month: this.currentMonth(),
        pageNum: 1,
        pageSize: 20
      },
      list: [],
      total: 0,
      summary: {},
      materialQuery: {
        keyword: '',
        pageNum: 1,
        pageSize: 20
      },
      materialList: [],
      materialDialogVisible: false,
      materialForm: {
        materialCode: '',
        materialName: '',
        theoreticalUnitCost: 0,
        effectiveMonth: this.currentMonth(),
        remark: ''
      }
    }
  },
  created() {
    this.loadAll()
    this.loadMaterialConfig()
  },
  methods: {
    currentMonth() {
      const d = new Date()
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    },
    formatMoney(v) {
      const n = Number(v || 0)
      return n.toFixed(2)
    },
    async loadAll() {
      await Promise.all([this.loadList(), this.loadSummary()])
    },
    async loadList() {
      const res = await getCoatingCostAccounting(this.query)
      if (res && (res.code === 200 || res.code === 20000)) {
        this.list = (res.data && res.data.records) || []
        this.total = Number((res.data && res.data.total) || 0)
      }
    },
    async loadSummary() {
      const res = await getCoatingCostSummary({ month: this.query.month })
      if (res && (res.code === 200 || res.code === 20000)) {
        this.summary = res.data || {}
      }
    },
    handlePageChange(page) {
      this.query.pageNum = page
      this.loadList()
    },
    async loadMaterialConfig() {
      const res = await getMaterialCostConfigPage({
        month: this.query.month,
        keyword: this.materialQuery.keyword,
        pageNum: this.materialQuery.pageNum,
        pageSize: this.materialQuery.pageSize
      })
      if (res && (res.code === 200 || res.code === 20000)) {
        this.materialList = (res.data && res.data.records) || []
      }
    },
    openMaterialDialog() {
      this.materialDialogVisible = true
      this.materialForm = {
        materialCode: '',
        materialName: '',
        theoreticalUnitCost: 0,
        effectiveMonth: this.query.month,
        remark: ''
      }
    },
    async submitMaterial() {
      if (!this.materialForm.materialCode) {
        return this.$message.warning('请填写料号')
      }
      await saveMaterialCostConfig(this.materialForm)
      this.$message.success('保存成功')
      this.materialDialogVisible = false
      this.loadMaterialConfig()
      this.loadAll()
    }
  }
}
</script>

<style scoped>
.mb12 { margin-bottom: 12px; }
.mt12 { margin-top: 12px; }
</style>
