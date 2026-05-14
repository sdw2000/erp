<template>
  <div class="stocktake-container">
    <el-card>
      <div slot="header" class="clearfix">
        <span>物料盘点</span>
      </div>

      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="二维码/批次号">
          <el-input v-model="searchForm.qrCode" clearable placeholder="支持模糊查询" />
        </el-form-item>
        <el-form-item label="料号">
          <el-input v-model="searchForm.materialCode" clearable placeholder="支持模糊查询" />
        </el-form-item>
        <el-form-item label="卷类型">
          <el-select v-model="searchForm.rollType" clearable placeholder="全部" style="width: 120px">
            <el-option label="母卷" value="母卷" />
            <el-option label="复卷" value="复卷" />
            <el-option label="分切卷" value="分切卷" />
          </el-select>
        </el-form-item>
        <el-form-item label="库位">
          <el-input v-model="searchForm.location" clearable placeholder="如：成品待出库区" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="el-icon-search" @click="handleSearch">查询</el-button>
          <el-button icon="el-icon-refresh-left" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>

      <el-table v-loading="loading" :data="list" border stripe style="width: 100%">
        <el-table-column type="index" label="序号" width="60" align="center" />
        <el-table-column prop="materialCode" label="料号" min-width="200" />
        <el-table-column prop="productName" label="产品名称" min-width="180" show-overflow-tooltip />
        <el-table-column prop="qrCode" label="二维码" min-width="150" />
        <el-table-column prop="batchNo" label="批次号" min-width="130" />
        <el-table-column prop="rollType" label="卷类型" min-width="80" align="center" />
        <el-table-column prop="totalRolls" label="当前卷数" min-width="90" align="right" />
        <el-table-column prop="totalSqm" label="当前总平米" min-width="110" align="right" />
        <el-table-column prop="availableArea" label="可用平米" min-width="110" align="right" />
        <el-table-column prop="location" label="库位" min-width="110" />
        <el-table-column label="操作" width="100" align="center" fixed="right">
          <template slot-scope="scope">
            <el-button type="text" size="mini" @click="openStocktakeDialog(scope.row)">盘点</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-if="total > 0"
        :current-page="page"
        :page-size="size"
        :total="total"
        layout="total, sizes, prev, pager, next"
        :page-sizes="[10, 20, 50, 100]"
        @size-change="handleSizeChange"
        @current-change="handlePageChange"
      />
    </el-card>

    <el-dialog title="库存盘点" :visible.sync="stocktakeVisible" width="520px">
      <el-form :model="stocktakeForm" label-width="110px" size="small">
        <el-form-item label="料号">
          <el-input :value="stocktakeForm.materialCode" disabled />
        </el-form-item>
        <el-form-item label="批次号">
          <el-input :value="stocktakeForm.batchNo" disabled />
        </el-form-item>
        <el-form-item label="当前卷数">
          <el-input :value="stocktakeForm.beforeRolls" disabled />
        </el-form-item>
        <el-form-item label="当前总平米">
          <el-input :value="stocktakeForm.beforeSqm" disabled />
        </el-form-item>
        <el-form-item label="盘点后卷数" required>
          <el-input-number v-model="stocktakeForm.actualRolls" :min="0" :controls="true" style="width: 100%" />
        </el-form-item>
        <el-form-item label="盘点后总平米">
          <el-input-number v-model="stocktakeForm.actualSqm" :min="0" :precision="2" :controls="true" style="width: 100%" />
          <div style="font-size:12px;color:#909399;">可留空：系统将按卷数比例估算总平米</div>
        </el-form-item>
        <el-form-item label="盘点原因">
          <el-input v-model="stocktakeForm.reason" maxlength="200" placeholder="如：实物复盘、报废、盘盈" />
        </el-form-item>
      </el-form>
      <span slot="footer">
        <el-button @click="stocktakeVisible = false">取消</el-button>
        <el-button type="primary" :loading="stocktakeSubmitting" @click="submitStocktake">确认盘点</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import { getStockList, stocktakeTapeStock } from '@/api/tapeStock'

export default {
  name: 'StocktakePage',
  data() {
    return {
      loading: false,
      list: [],
      page: 1,
      size: 20,
      total: 0,
      searchForm: {
        qrCode: '',
        materialCode: '',
        rollType: '',
        location: ''
      },
      stocktakeVisible: false,
      stocktakeSubmitting: false,
      stocktakeForm: {
        stockId: null,
        materialCode: '',
        batchNo: '',
        beforeRolls: 0,
        beforeSqm: 0,
        actualRolls: 0,
        actualSqm: null,
        reason: '月度盘点'
      }
    }
  },
  created() {
    this.fetchData()
  },
  methods: {
    async fetchData() {
      this.loading = true
      try {
        const res = await getStockList({
          page: this.page,
          size: this.size,
          qrCode: this.searchForm.qrCode || undefined,
          materialCode: this.searchForm.materialCode || undefined,
          rollType: this.searchForm.rollType || undefined,
          location: this.searchForm.location || undefined
        })
        if (res.code === 200 || res.code === 20000) {
          const data = res.data || {}
          this.list = data.records || []
          this.total = Number(data.total || 0)
          this.page = Number(data.current || this.page)
          this.size = Number(data.size || this.size)
        }
      } catch (e) {
        this.$message.error('获取库存列表失败')
      } finally {
        this.loading = false
      }
    },
    handleSearch() {
      this.page = 1
      this.fetchData()
    },
    handleReset() {
      this.searchForm = {
        qrCode: '',
        materialCode: '',
        rollType: '',
        location: ''
      }
      this.page = 1
      this.fetchData()
    },
    handlePageChange(page) {
      this.page = page
      this.fetchData()
    },
    handleSizeChange(size) {
      this.size = size
      this.page = 1
      this.fetchData()
    },
    openStocktakeDialog(row) {
      if (!row || !row.id) {
        this.$message.warning('库存记录异常，无法盘点')
        return
      }
      this.stocktakeForm = {
        stockId: row.id,
        materialCode: row.materialCode || '',
        batchNo: row.batchNo || '',
        beforeRolls: Number(row.totalRolls || 0),
        beforeSqm: Number(row.totalSqm || 0),
        actualRolls: Number(row.totalRolls || 0),
        actualSqm: Number(row.totalSqm || 0),
        reason: '月度盘点'
      }
      this.stocktakeVisible = true
    },
    async submitStocktake() {
      if (!this.stocktakeForm.stockId) return
      if (this.stocktakeForm.actualRolls === null || this.stocktakeForm.actualRolls < 0) {
        this.$message.warning('请填写有效的盘点后卷数')
        return
      }
      this.stocktakeSubmitting = true
      try {
        const payload = {
          actualRolls: Number(this.stocktakeForm.actualRolls),
          actualSqm: this.stocktakeForm.actualSqm === null || this.stocktakeForm.actualSqm === ''
            ? null
            : Number(this.stocktakeForm.actualSqm),
          operator: (this.$store && this.$store.getters && (this.$store.getters.name || this.$store.getters.username)) || '',
          reason: this.stocktakeForm.reason || ''
        }
        const res = await stocktakeTapeStock(this.stocktakeForm.stockId, payload)
        if (res.code !== 200 && res.code !== 20000) {
          return this.$message.error((res && (res.msg || res.message)) || '盘点失败')
        }
        this.$message.success('盘点成功')
        this.stocktakeVisible = false
        await this.fetchData()
      } catch (e) {
        this.$message.error((e && e.message) || '盘点失败')
      } finally {
        this.stocktakeSubmitting = false
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.stocktake-container {
  padding: 20px;
  .el-pagination {
    margin-top: 15px;
    text-align: right;
  }
}
</style>
