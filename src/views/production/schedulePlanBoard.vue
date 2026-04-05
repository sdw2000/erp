<template>
  <div class="app-container">
    <el-card shadow="never" class="mb-10">
      <div slot="header" class="card-header">
        <span>日排程看板</span>
        <div class="header-actions">
          <el-date-picker
            v-model="selectedDate"
            type="date"
            size="small"
            placeholder="选择日期"
            format="yyyy-MM-dd"
            value-format="yyyy-MM-dd"
            @change="loadDailyPlan"
          />
          <el-button type="primary" size="small" icon="el-icon-refresh" @click="loadDailyPlan">刷新</el-button>
          <el-button type="success" size="small" icon="el-icon-printer" @click="handlePrint">打印</el-button>
        </div>
      </div>

      <el-tabs v-model="activeStage" type="border-card" class="print-section">
        <el-tab-pane label="涂布" name="COATING">
          <el-table :data="planByStage.COATING" border stripe>
            <el-table-column prop="plan_date" label="计划时间" width="160">
              <template slot-scope="scope">
                {{ formatDateTime(scope.row.plan_date) }}
              </template>
            </el-table-column>
            <el-table-column prop="equipment" label="机台" width="120" />
            <el-table-column prop="order_no" label="订单号" width="140" />
            <el-table-column prop="material_code" label="产品编码" width="160" />
            <el-table-column label="规格" width="160">
              <template slot-scope="scope">
                {{ formatSpec(scope.row) }}
              </template>
            </el-table-column>
            <el-table-column prop="material_name" label="产品名称" min-width="160" show-overflow-tooltip />
            <el-table-column prop="plan_area" label="计划面积(㎡)" width="120" align="right">
              <template slot-scope="scope">
                {{ formatArea(scope.row.plan_area) }}
              </template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="100" />
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="复卷" name="REWINDING">
          <el-table :data="planByStage.REWINDING" border stripe>
            <el-table-column prop="plan_date" label="计划时间" width="160">
              <template slot-scope="scope">
                {{ formatDateTime(scope.row.plan_date) }}
              </template>
            </el-table-column>
            <el-table-column prop="equipment" label="机台" width="120" />
            <el-table-column prop="order_no" label="订单号" width="140" />
            <el-table-column prop="material_code" label="产品编码" width="160" />
            <el-table-column label="规格" width="160">
              <template slot-scope="scope">
                {{ formatSpec(scope.row) }}
              </template>
            </el-table-column>
            <el-table-column prop="material_name" label="产品名称" min-width="160" show-overflow-tooltip />
            <el-table-column prop="plan_area" label="计划面积(㎡)" width="120" align="right">
              <template slot-scope="scope">
                {{ formatArea(scope.row.plan_area) }}
              </template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="100" />
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="分切" name="SLITTING">
          <el-table :data="planByStage.SLITTING" border stripe>
            <el-table-column prop="plan_date" label="计划时间" width="160">
              <template slot-scope="scope">
                {{ formatDateTime(scope.row.plan_date) }}
              </template>
            </el-table-column>
            <el-table-column prop="equipment" label="机台" width="120" />
            <el-table-column prop="order_no" label="订单号" width="140" />
            <el-table-column prop="material_code" label="产品编码" width="160" />
            <el-table-column label="规格" width="160">
              <template slot-scope="scope">
                {{ formatSpec(scope.row) }}
              </template>
            </el-table-column>
            <el-table-column prop="material_name" label="产品名称" min-width="160" show-overflow-tooltip />
            <el-table-column prop="plan_area" label="计划面积(㎡)" width="120" align="right">
              <template slot-scope="scope">
                {{ formatArea(scope.row.plan_area) }}
              </template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="100" />
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <el-card shadow="never">
      <div slot="header" class="card-header">
        <span>计划领料对应关系（单↔料）</span>
      </div>

      <el-row :gutter="10" class="mb-10">
        <el-col :span="4"><el-tag type="info">订单数：{{ relationSummary.order_count || 0 }}</el-tag></el-col>
        <el-col :span="4"><el-tag type="info">母卷数：{{ relationSummary.roll_count || 0 }}</el-tag></el-col>
        <el-col :span="4"><el-tag type="warning">计划㎡：{{ formatArea(relationSummary.planned_area_total) }}</el-tag></el-col>
        <el-col :span="4"><el-tag type="success">已锁㎡：{{ formatArea(relationSummary.locked_area_total) }}</el-tag></el-col>
        <el-col :span="4"><el-tag type="danger">未锁㎡：{{ formatArea(relationSummary.unlocked_area_total) }}</el-tag></el-col>
        <el-col :span="4"><el-tag>损耗率：{{ formatRate(relationSummary.loss_rate) }}</el-tag></el-col>
      </el-row>

      <el-form :inline="true" :model="relationQuery" class="mb-10" @submit.native.prevent>
        <el-form-item label="订单号">
          <el-input v-model="relationQuery.orderNo" placeholder="订单号" style="width: 160px" />
        </el-form-item>
        <el-form-item label="物料编码">
          <el-input v-model="relationQuery.materialCode" placeholder="物料编码" style="width: 160px" />
        </el-form-item>
        <el-form-item label="母卷号">
          <el-input v-model="relationQuery.rollCode" placeholder="母卷号" style="width: 160px" />
        </el-form-item>
        <el-form-item>
          <el-radio-group v-model="relationMode" size="small" @change="handleRelationModeChange">
            <el-radio-button label="ORDER_TO_MATERIAL">单看料</el-radio-button>
            <el-radio-button label="MATERIAL_TO_ORDER">料看单</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="el-icon-search" @click="handleRelationSearch">查询</el-button>
          <el-button icon="el-icon-refresh" @click="resetRelationQuery">重置</el-button>
        </el-form-item>
      </el-form>

      <el-table v-if="relationMode === 'ORDER_TO_MATERIAL'" v-loading="relationLoading" :data="relationList" border stripe>
        <el-table-column prop="order_no" label="订单号" width="140" />
        <el-table-column prop="material_code" label="物料编码" width="160" />
        <el-table-column prop="roll_count" label="母卷数" width="90" align="right" />
        <el-table-column prop="planned_area_total" label="计划面积㎡" width="120" align="right">
          <template slot-scope="scope">{{ formatArea(scope.row.planned_area_total) }}</template>
        </el-table-column>
        <el-table-column prop="locked_area_total" label="已锁面积㎡" width="120" align="right">
          <template slot-scope="scope">{{ formatArea(scope.row.locked_area_total) }}</template>
        </el-table-column>
        <el-table-column prop="unlocked_area_total" label="未锁面积㎡" width="120" align="right">
          <template slot-scope="scope">{{ formatArea(scope.row.unlocked_area_total) }}</template>
        </el-table-column>
        <el-table-column prop="lock_rate" label="锁定率" width="90" align="right">
          <template slot-scope="scope">{{ formatRate(scope.row.lock_rate) }}</template>
        </el-table-column>
        <el-table-column prop="issue_area_total" label="领料㎡" width="100" align="right">
          <template slot-scope="scope">{{ formatArea(scope.row.issue_area_total) }}</template>
        </el-table-column>
        <el-table-column prop="loss_area_total" label="损耗㎡" width="100" align="right">
          <template slot-scope="scope">{{ formatArea(scope.row.loss_area_total) }}</template>
        </el-table-column>
        <el-table-column prop="loss_rate" label="损耗率" width="90" align="right">
          <template slot-scope="scope">{{ formatRate(scope.row.loss_rate) }}</template>
        </el-table-column>
      </el-table>

      <el-table v-else v-loading="relationLoading" :data="relationList" border stripe>
        <el-table-column prop="roll_code" label="母卷号" width="180" />
        <el-table-column prop="material_code" label="物料编码" width="160" />
        <el-table-column prop="roll_area" label="母卷总㎡" width="110" align="right">
          <template slot-scope="scope">{{ formatArea(scope.row.roll_area) }}</template>
        </el-table-column>
        <el-table-column prop="order_count" label="订单数" width="90" align="right" />
        <el-table-column prop="order_nos" label="订单列表" min-width="200" show-overflow-tooltip />
        <el-table-column prop="locked_area_total" label="已分配㎡" width="110" align="right">
          <template slot-scope="scope">{{ formatArea(scope.row.locked_area_total) }}</template>
        </el-table-column>
        <el-table-column prop="unallocated_area" label="未分配㎡" width="110" align="right">
          <template slot-scope="scope">{{ formatArea(scope.row.unallocated_area) }}</template>
        </el-table-column>
        <el-table-column prop="allocation_rate" label="分配率" width="90" align="right">
          <template slot-scope="scope">{{ formatRate(scope.row.allocation_rate) }}</template>
        </el-table-column>
        <el-table-column prop="issue_area_total" label="领料㎡" width="100" align="right">
          <template slot-scope="scope">{{ formatArea(scope.row.issue_area_total) }}</template>
        </el-table-column>
        <el-table-column prop="loss_area_total" label="损耗㎡" width="100" align="right">
          <template slot-scope="scope">{{ formatArea(scope.row.loss_area_total) }}</template>
        </el-table-column>
      </el-table>

      <el-pagination
        class="mt-10 right"
        :current-page="relationPageNum"
        :page-size="relationPageSize"
        :total="relationTotal"
        layout="total, prev, pager, next"
        @current-change="handleRelationPageChange"
      />
    </el-card>
  </div>
</template>

<script>
import {
  getDailyPlan,
  getOrderMaterialRelationPage,
  getMaterialOrderRelationPage,
  getPlanRelationSummary
} from '@/api/schedulePlan'
import { getSpecByMaterialCode } from '@/api/tapeSpec'

export default {
  name: 'SchedulePlanBoard',
  data() {
    return {
      selectedDate: '',
      activeStage: 'COATING',
      planList: [],
      materialNameByCodeCache: {},
      planByStage: {
        COATING: [],
        REWINDING: [],
        SLITTING: []
      },
      relationQuery: {
        orderNo: '',
        materialCode: '',
        rollCode: ''
      },
      relationMode: 'ORDER_TO_MATERIAL',
      relationSummary: {
        order_count: 0,
        roll_count: 0,
        planned_area_total: 0,
        locked_area_total: 0,
        unlocked_area_total: 0,
        issue_area_total: 0,
        loss_area_total: 0,
        lock_rate: 0,
        issue_rate: 0,
        loss_rate: 0
      },
      relationList: [],
      relationLoading: false,
      relationPageNum: 1,
      relationPageSize: 20,
      relationTotal: 0
    }
  },
  mounted() {
    this.loadDailyPlan()
    this.loadRelationSummary()
    this.loadRelationList()
  },
  methods: {
    normalizeMaterialCode(code) {
      return String(code || '').replace(/\s+/g, '').trim().toUpperCase()
    },
    async enrichMaterialNamesFromSpec(rows) {
      const list = Array.isArray(rows) ? rows : []
      if (!list.length) return list

      const codes = Array.from(new Set(list
        .map(r => String((r && (r.material_code || r.materialCode)) || '').trim())
        .filter(Boolean)))

      const missingCodes = codes.filter(code => {
        const key = this.normalizeMaterialCode(code)
        return key && !Object.prototype.hasOwnProperty.call(this.materialNameByCodeCache, key)
      })

      if (missingCodes.length) {
        await Promise.all(missingCodes.map(async(code) => {
          const key = this.normalizeMaterialCode(code)
          let name = ''
          try {
            const res = await getSpecByMaterialCode(code)
            const spec = (res && (res.code === 200 || res.code === 20000)) ? (res.data || {}) : {}
            name = String(spec.productName || spec.materialName || spec.name || '').trim()
          } catch (e) {
            name = ''
          }
          this.$set(this.materialNameByCodeCache, key, name)
        }))
      }

      return list.map(row => {
        const code = String((row && (row.material_code || row.materialCode)) || '').trim()
        const key = this.normalizeMaterialCode(code)
        const masterName = String((key && this.materialNameByCodeCache[key]) || '').trim()
        if (!masterName) return row
        return {
          ...row,
          material_name: masterName,
          materialName: masterName
        }
      })
    },
    formatDate(date) {
      const d = new Date(date)
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${y}-${m}-${day}`
    },
    formatDateTime(val) {
      if (!val) return '-'
      return String(val).replace('T', ' ').substring(0, 16)
    },
    formatSpec(row) {
      const t = row.thickness != null ? row.thickness : '-'
      const w = row.width != null ? row.width : '-'
      const l = row.length != null ? row.length : '-'
      return `${t}μm*${w}mm*${l}m`
    },
    formatArea(val) {
      if (val == null) return '-'
      return Number(val).toFixed(2)
    },
    formatRate(val) {
      return `${Number(val || 0).toFixed(2)}%`
    },
    async loadDailyPlan() {
      try {
        const res = await getDailyPlan(this.selectedDate)
        if (res.code === 200 || res.code === 20000) {
          this.planList = await this.enrichMaterialNamesFromSpec(res.data || [])
          this.planByStage = {
            COATING: this.planList.filter(p => p.stage === 'COATING'),
            REWINDING: this.planList.filter(p => p.stage === 'REWINDING'),
            SLITTING: this.planList.filter(p => p.stage === 'SLITTING')
          }
        } else {
          this.planList = []
          this.planByStage = { COATING: [], REWINDING: [], SLITTING: [] }
        }
      } catch (e) {
        this.$message.error('加载日排程失败')
      }
    },
    async loadRelationSummary() {
      try {
        const res = await getPlanRelationSummary()
        if (res.code === 200 || res.code === 20000) {
          this.relationSummary = Object.assign({}, this.relationSummary, res.data || {})
        }
      } catch (e) {
        this.$message.error('加载对应关系汇总失败')
      }
    },
    async loadRelationList() {
      this.relationLoading = true
      try {
        const params = {
          pageNum: this.relationPageNum,
          pageSize: this.relationPageSize,
          orderNo: this.relationQuery.orderNo || undefined,
          materialCode: this.relationQuery.materialCode || undefined,
          rollCode: this.relationQuery.rollCode || undefined
        }
        const api = this.relationMode === 'ORDER_TO_MATERIAL'
          ? getOrderMaterialRelationPage
          : getMaterialOrderRelationPage
        const res = await api(params)
        if (res.code === 200 || res.code === 20000) {
          const data = res.data || {}
          this.relationList = data.list || []
          this.relationTotal = Number(data.total || 0)
        } else {
          this.relationList = []
          this.relationTotal = 0
        }
      } catch (e) {
        this.$message.error('加载对应关系明细失败')
        this.relationList = []
        this.relationTotal = 0
      } finally {
        this.relationLoading = false
      }
    },
    handleRelationSearch() {
      this.relationPageNum = 1
      this.loadRelationList()
      this.loadRelationSummary()
    },
    resetRelationQuery() {
      this.relationQuery = { orderNo: '', materialCode: '', rollCode: '' }
      this.relationPageNum = 1
      this.loadRelationList()
      this.loadRelationSummary()
    },
    handleRelationModeChange() {
      this.relationPageNum = 1
      this.loadRelationList()
    },
    handleRelationPageChange(page) {
      this.relationPageNum = page
      this.loadRelationList()
    },
    handlePrint() {
      window.print()
    }
  }
}
</script>

<style scoped>
.mb-10 {
  margin-bottom: 10px;
}
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

@media print {
  .header-actions,
  .el-button,
  .el-tabs__header {
    display: none !important;
  }
  .print-section {
    margin-top: 0 !important;
  }
  .app-container {
    padding: 0 !important;
  }
}
</style>
