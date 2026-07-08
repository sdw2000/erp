<template>
  <div class="app-container manual-schedule-page" :style="{ minHeight: 0, height: '100%' }">
    <el-card shadow="never" class="header-card">
      <div slot="header" class="section-header">
        <div class="header-left">
          <span class="header-title">欠料平米数汇总</span>
          <el-checkbox v-model="shortageQuery.isGrouped" size="small" @change="loadShortageAnalysis">按型号前缀汇总</el-checkbox>
        </div>
        <div class="header-right">
          <div class="search-input-group">
            <el-input
              v-model.trim="shortageQuery.materialCode"
              size="small"
              clearable
              placeholder="按料号搜索"
              style="width: 200px"
              @keyup.enter.native="loadShortageAnalysis"
              @clear="loadShortageAnalysis"
            >
              <el-button slot="append" icon="el-icon-search" @click="loadShortageAnalysis" />
            </el-input>
            <el-button type="primary" size="small" icon="el-icon-refresh" @click="loadShortageAnalysis">刷新分析</el-button>
          </div>
        </div>
      </div>

      <div ref="contentWithFooter" class="content-with-footer">
        <div class="table-main-area">
        <el-table
          ref="shortageTable"
          v-loading="shortageLoading"
          :data="shortageList"
          class="manual-schedule-table shortage-table"
          border
          stripe
          :fit="false"
          style="width: 100%"
          :height="resolvedBodyTableHeight"
          @sort-change="handleShortageSortChange"
        >
          <el-table-column type="index" label="序号" width="60" align="center" />
          <el-table-column prop="materialCode" label="物料代码" min-width="180" sortable="custom" />
          <el-table-column prop="materialName" label="产品名称" min-width="180" show-overflow-tooltip />
          <el-table-column prop="plannedArea" label="未生产面积(㎡)" width="150" align="right" sortable="custom">
            <template slot-scope="scope">
              {{ Number(scope.row.plannedArea || 0).toFixed(2) }}
            </template>
          </el-table-column>
          <el-table-column prop="stockArea" label="可用库存面积(㎡)" width="150" align="right" sortable="custom">
            <template slot-scope="scope">
              {{ Number(scope.row.stockArea || 0).toFixed(2) }}
            </template>
          </el-table-column>
          <el-table-column prop="moqArea" label="最小起涂量(㎡)" width="150" align="right" sortable="custom">
            <template slot-scope="scope">
              {{ scope.row.moqArea != null ? Number(scope.row.moqArea).toFixed(2) : '-' }}
            </template>
          </el-table-column>
          <el-table-column prop="shortageArea" label="欠料平米(㎡)" width="150" align="right" sortable="custom">
            <template slot-scope="scope">
              <span :style="{ color: Number(scope.row.shortageArea) > 0 ? '#F56C6C' : '#67C23A', fontWeight: 'bold' }">
                {{ Number(scope.row.shortageArea || 0).toFixed(2) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="建议" min-width="120">
            <template slot-scope="scope">
              <el-tag v-if="Number(scope.row.shortageArea) > 0" type="danger" size="mini">需排产涂布</el-tag>
              <el-tag v-else type="success" size="mini">库存充足</el-tag>
            </template>
          </el-table-column>
        </el-table>
        </div>

        <div ref="paginationContainer" class="pagination-container">
        <el-pagination
          :current-page="shortageQuery.page"
          :page-sizes="pageSizes"
          :page-size="shortageQuery.size"
          layout="total, sizes, prev, pager, next, jumper"
          :total="shortageTotal"
          @size-change="handleShortageSizeChange"
          @current-change="handleShortagePageChange"
        />
        </div>
      </div>
    </el-card>
  </div>
</template>

<script>
import manualScheduleMixin from './manualScheduleMixin'
import { getShortageAnalysis } from '@/api/manualSchedule'

export default {
  name: 'ShortageAnalysis',
  mixins: [manualScheduleMixin],
  props: {
    externalTableHeight: { type: Number, default: 0 },
    heightOffset: { type: Number, default: 0 }
  },
  data() {
    return {
      shortageList: [],
      shortageLoading: false,
      shortageTotal: 0,
      adaptiveTableHeight: 0,
      resizeObserver: null,
      shortageSort: {
        prop: '',
        order: ''
      },
      shortageQuery: {
        materialCode: '',
        page: 1,
        size: 20,
        isGrouped: false
      }
    }
  },
  computed: {
    resolvedTableHeight() {
      const propHeight = Number(this.externalTableHeight || 0)
      if (propHeight > 0) return propHeight
      const mixinHeight = Number(this.$data.tableHeight || 0)
      return mixinHeight > 0 ? mixinHeight : 500
    },
    resolvedBodyTableHeight() {
      if (Number(this.adaptiveTableHeight || 0) > 0) return Number(this.adaptiveTableHeight)
      return Math.max(260, Number(this.resolvedTableHeight || 500) - 72)
    }
  },
  mounted() {
    this.lockOuterScroll()
    if (!(Number(this.externalTableHeight || 0) > 0)) {
      this.updateTableMaxHeight()
      window.addEventListener('resize', this.updateTableMaxHeight)
    }
    window.addEventListener('resize', this.recalcLayoutHeights)
    this.loadShortageAnalysis()
    this.$nextTick(() => {
      this.recalcLayoutHeights()
      if (typeof ResizeObserver !== 'undefined' && this.$refs.contentWithFooter) {
        this.resizeObserver = new ResizeObserver(() => {
          this.recalcLayoutHeights()
        })
        this.resizeObserver.observe(this.$refs.contentWithFooter)
      }
    })
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.recalcLayoutHeights)
    if (this.resizeObserver) {
      this.resizeObserver.disconnect()
      this.resizeObserver = null
    }
  },
  watch: {
    resolvedTableHeight() {
      this.recalcLayoutHeights()
    },
    externalTableHeight() {
      this.recalcLayoutHeights()
    },
    shortageList() {
      this.recalcLayoutHeights()
    }
  },
  methods: {
    recalcLayoutHeights() {
      this.$nextTick(() => {
        const content = this.$refs.contentWithFooter
        const pager = this.$refs.paginationContainer
        if (content) {
          const contentHeight = Number(content.clientHeight || 0)
          const pagerHeight = Number((pager && pager.offsetHeight) || 0)
          const nextHeight = Math.max(220, contentHeight - pagerHeight - 8)
          this.adaptiveTableHeight = nextHeight
        }
        const table = this.$refs.shortageTable
        if (table && typeof table.doLayout === 'function') table.doLayout()
      })
    },
    loadShortageAnalysis() {
      this.shortageLoading = true
      const params = {
        materialCode: this.shortageQuery.materialCode,
        current: this.shortageQuery.page,
        size: this.shortageQuery.size,
        isGrouped: this.shortageQuery.isGrouped,
        sortProp: this.shortageSort.prop || null,
        sortOrder: this.shortageSort.order || null
      }
      getShortageAnalysis(params)
        .then(res => {
          const payload = (res && res.data) || {}
          const pageData = (payload && payload.records)
            ? payload
            : ((payload && payload.data && payload.data.records) ? payload.data : null)

          if (pageData && Array.isArray(pageData.records)) {
            this.shortageList = pageData.records
            const total = Number(pageData.total)
            this.shortageTotal = Number.isFinite(total) ? total : this.shortageList.length
          } else {
            this.shortageList = Array.isArray(payload) ? payload : []
            this.shortageTotal = this.shortageList.length
          }
        })
        .finally(() => {
          this.shortageLoading = false
        })
    },
    handleShortageSizeChange(val) {
      this.shortageQuery.size = val
      this.shortageQuery.page = 1
      this.loadShortageAnalysis()
    },
    handleShortagePageChange(val) {
      this.shortageQuery.page = val
      this.loadShortageAnalysis()
    },
    handleShortageSortChange({ prop, order }) {
      this.shortageSort.prop = prop
      this.shortageSort.order = order
      this.shortageQuery.page = 1
      this.loadShortageAnalysis()
    }
  }
}
</script>

<style scoped>
@import './manualScheduleShared.scss';

.shortage-table {
  min-width: 1200px;
}

.content-with-footer {
  position: relative;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.table-main-area {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding-bottom: 8px;
}

.pagination-container {
  position: relative !important;
  left: auto !important;
  right: auto !important;
  bottom: auto !important;
  width: auto !important;
  z-index: 30;
  flex: 0 0 auto;
  background: #fff;
  border-top: 1px solid #ebeef5;
  padding-top: 8px;
  box-shadow: none !important;
}
</style>