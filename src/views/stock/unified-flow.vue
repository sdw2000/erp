<template>
  <div class="app-container">
    <el-card>
      <div slot="header" class="clearfix">
        <span>统一库存流水</span>
        <div style="float: right;">
          <el-button type="warning" size="small" icon="el-icon-download" @click="handleExportCsv">导出CSV</el-button>
        </div>
      </div>

      <el-form :inline="true" :model="query" size="small">
        <el-form-item label="库存类型">
          <el-select v-model="query.stockType" placeholder="全部" clearable style="width: 130px">
            <el-option label="胶带" value="TAPE" />
            <el-option label="化工" value="CHEMICAL" />
            <el-option label="薄膜" value="FILM" />
          </el-select>
        </el-form-item>

        <el-form-item label="操作类型">
          <el-select v-model="query.type" placeholder="全部" clearable style="width: 130px">
            <el-option label="入库" value="IN" />
            <el-option label="出库" value="OUT" />
            <el-option label="调整" value="ADJUST" />
            <el-option label="消耗" value="CONSUME" />
          </el-select>
        </el-form-item>

        <el-form-item label="料号">
          <el-input v-model="query.materialCode" placeholder="请输入料号" clearable style="width: 180px" />
        </el-form-item>

        <el-form-item label="批次号">
          <el-input v-model="query.batchNo" placeholder="请输入批次号" clearable style="width: 160px" />
        </el-form-item>

        <el-form-item label="关联单号">
          <el-input v-model="query.refNo" placeholder="请输入关联单号" clearable style="width: 180px" />
        </el-form-item>

        <el-form-item label="时间区间">
          <el-date-picker
            v-model="query.timeRange"
            type="datetimerange"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            value-format="yyyy-MM-dd HH:mm:ss"
            range-separator="至"
            style="width: 340px"
            clearable
          />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" icon="el-icon-search" @click="handleSearch">查询</el-button>
          <el-button icon="el-icon-refresh" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>

      <el-table ref="unifiedFlowTable" v-loading="loading" :data="list" border stripe style="margin-top: 10px">
        <el-table-column prop="createTime" label="时间" width="170" />
        <el-table-column prop="stockType" label="库存类型" width="100" align="center">
          <template slot-scope="scope">
            <el-tag size="mini" :type="stockTypeTag(scope.row.stockType)">{{ stockTypeText(scope.row.stockType) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="type" label="操作" width="90" align="center">
          <template slot-scope="scope">
            <el-tag size="mini" :type="opTag(scope.row.type)">{{ opText(scope.row.type) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="materialCode" label="料号" width="170" />
        <el-table-column prop="productName" label="产品名称" min-width="150" show-overflow-tooltip />
        <el-table-column prop="batchNo" label="批次号" width="140" />
        <el-table-column label="变动量" width="170" align="right">
          <template slot-scope="scope">
            <span :class="qtyClass(scope.row.changeQuantity)">{{ formatQty(scope.row.changeQuantity) }}</span>
            <span style="color:#909399; margin-left: 4px;">{{ scope.row.unit || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="标准量" width="190" align="right">
          <template slot-scope="scope">
            <span>{{ formatQty(scope.row.stdChangeQuantity) }}</span>
            <span style="color:#909399; margin-left: 4px;">{{ scope.row.stdUnit || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="beforeQuantity" label="变动前" width="110" align="right" />
        <el-table-column prop="afterQuantity" label="变动后" width="110" align="right" />
        <el-table-column prop="refNo" label="关联单号" width="180" show-overflow-tooltip />
        <el-table-column prop="operator" label="操作人" width="110" align="center" />
        <el-table-column prop="remark" label="备注" min-width="160" show-overflow-tooltip />
      </el-table>

      <el-pagination
        style="margin-top: 12px; text-align: right;"
        layout="total, sizes, prev, pager, next, jumper"
        :current-page="pager.current"
        :page-size="pager.size"
        :page-sizes="[20, 50, 100, 200]"
        :total="pager.total"
        @current-change="handlePageChange"
        @size-change="handleSizeChange"
      />
    </el-card>
  </div>
</template>

<script>
import { getUnifiedStockFlowPage } from '@/api/stockFlow'
import elTableAutoLayout from '@/mixins/elTableAutoLayout'

export default {
  name: 'UnifiedStockFlow',
  mixins: [elTableAutoLayout],
  tableLayoutRefs: ['unifiedFlowTable'],
  data() {
    return {
      loading: false,
      exporting: false,
      list: [],
      query: {
        stockType: '',
        materialCode: '',
        batchNo: '',
        type: '',
        refNo: '',
        timeRange: []
      },
      pager: {
        current: 1,
        size: 20,
        total: 0
      }
    }
  },
  created() {
    this.fetchPage()
  },
  methods: {
    buildParams(extra = {}) {
      const params = {
        current: this.pager.current,
        size: this.pager.size,
        stockType: this.query.stockType,
        materialCode: this.query.materialCode,
        batchNo: this.query.batchNo,
        type: this.query.type,
        refNo: this.query.refNo,
        ...extra
      }
      if (this.query.timeRange && this.query.timeRange.length === 2) {
        params.beginTime = this.query.timeRange[0]
        params.endTime = this.query.timeRange[1]
      }
      return params
    },

    async fetchPage() {
      this.loading = true
      try {
        const res = await getUnifiedStockFlowPage(this.buildParams())
        const ok = res && (res.code === 200 || res.code === 20000)
        if (!ok) return
        const page = res.data || {}
        this.list = page.records || []
        this.pager.total = Number(page.total) || 0
      } finally {
        this.loading = false
        this.scheduleTableLayout()
      }
    },

    handleSearch() {
      this.pager.current = 1
      this.fetchPage()
    },

    handleReset() {
      this.query = {
        stockType: '',
        materialCode: '',
        batchNo: '',
        type: '',
        refNo: '',
        timeRange: []
      }
      this.handleSearch()
    },

    handlePageChange(current) {
      this.pager.current = current
      this.fetchPage()
    },

    handleSizeChange(size) {
      this.pager.size = size
      this.pager.current = 1
      this.fetchPage()
    },

    stockTypeText(v) {
      const map = { TAPE: '胶带', CHEMICAL: '化工', FILM: '薄膜' }
      return map[v] || v || '-'
    },

    stockTypeTag(v) {
      const map = { TAPE: 'primary', CHEMICAL: 'warning', FILM: 'success' }
      return map[v] || 'info'
    },

    opText(v) {
      const map = { IN: '入库', OUT: '出库', ADJUST: '调整', CONSUME: '消耗' }
      return map[v] || v || '-'
    },

    opTag(v) {
      const map = { IN: 'success', OUT: 'danger', ADJUST: 'warning', CONSUME: 'info' }
      return map[v] || 'info'
    },

    qtyClass(val) {
      const n = Number(val || 0)
      if (n > 0) return 'qty-plus'
      if (n < 0) return 'qty-minus'
      return ''
    },

    formatQty(val) {
      if (val === null || val === undefined || val === '') return '-'
      const n = Number(val)
      if (Number.isNaN(n)) return val
      return n > 0 ? `+${n}` : `${n}`
    },

    async handleExportCsv() {
      if (this.exporting) return
      this.exporting = true
      try {
        const pageSize = 500
        let current = 1
        let pages = 1
        let all = []

        do {
          const res = await getUnifiedStockFlowPage(this.buildParams({ current, size: pageSize }))
          const ok = res && (res.code === 200 || res.code === 20000)
          if (!ok) break
          const data = res.data || {}
          const records = data.records || []
          all = all.concat(records)
          pages = Number(data.pages) || 1
          current += 1
        } while (current <= pages && current <= 200)

        if (!all.length) {
          this.$message.warning('没有可导出的数据')
          return
        }

        const headers = [
          '时间', '库存类型', '操作类型', '料号', '产品名称', '批次号',
          '变动数量', '单位', '标准变动数量', '标准单位', '变动前', '变动后',
          '关联单号', '操作人', '备注'
        ]

        const rows = all.map(r => [
          r.createTime || '',
          this.stockTypeText(r.stockType),
          this.opText(r.type),
          r.materialCode || '',
          r.productName || '',
          r.batchNo || '',
          r.changeQuantity == null ? '' : r.changeQuantity,
          r.unit || '',
          r.stdChangeQuantity == null ? '' : r.stdChangeQuantity,
          r.stdUnit || '',
          r.beforeQuantity == null ? '' : r.beforeQuantity,
          r.afterQuantity == null ? '' : r.afterQuantity,
          r.refNo || '',
          r.operator || '',
          (r.remark || '').replace(/\r?\n/g, ' ')
        ])

        const escape = (v) => {
          const s = String(v == null ? '' : v)
          if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
          return s
        }
        const csv = [headers, ...rows].map(row => row.map(escape).join(',')).join('\n')
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        const ts = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19)
        a.download = `统一库存流水-${ts}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      } finally {
        this.exporting = false
      }
    }
  }
}
</script>

<style scoped>
.qty-plus {
  color: #67c23a;
  font-weight: 600;
}

.qty-minus {
  color: #f56c6c;
  font-weight: 600;
}
</style>
