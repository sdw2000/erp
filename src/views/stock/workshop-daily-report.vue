<template>
  <div class="app-container">
    <el-card>
      <div slot="header" class="clearfix">
        <span>线边仓每日物料进出明细</span>
        <div style="float: right">
          <el-date-picker
            v-model="queryDate"
            type="date"
            placeholder="选择日期"
            value-format="yyyy-MM-dd"
            size="small"
            @change="fetchData"
          />
          <el-button type="primary" icon="el-icon-download" size="small" style="margin-left: 10px;" @click="handleExport">导出明细</el-button>
        </div>
      </div>

      <el-form :inline="true" size="small">
        <el-form-item label="所属工段">
          <el-select v-model="workshopSection" placeholder="全厂" clearable @change="fetchData">
            <el-option label="涂布" value="涂布" />
            <el-option label="复卷" value="复卷" />
            <el-option label="分切" value="分切" />
            <el-option label="包装" value="包装" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="fetchData">刷新</el-button>
        </el-form-item>
      </el-form>

      <el-table
        v-loading="loading"
        :data="list"
        border
        stripe
        size="small"
        style="width: 100%"
        show-summary
        :summary-method="getSummary"
      >
        <el-table-column type="index" width="50" align="center" />
        <el-table-column prop="createTime" label="发生时间" width="160">
          <template slot-scope="scope">
            {{ formatTime(scope.row.createTime) }}
          </template>
        </el-table-column>
        <el-table-column prop="workshopSection" label="工段" width="80" />
        <el-table-column prop="shiftCode" label="班组" width="80" />
        <el-table-column prop="materialCode" label="料号" width="120" />
        <el-table-column prop="productName" label="产品名称" min-width="150" show-overflow-tooltip />
        <el-table-column prop="batchNo" label="批次/券号" width="160" />
        <el-table-column prop="type" label="类型" width="100" align="center">
          <template slot-scope="scope">
            <el-tag :type="getTypeStyle(scope.row.type)" size="mini">
              {{ getTypeText(scope.row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="changeArea" label="变动面积(㎡)" width="110" align="right">
          <template slot-scope="scope">
            <span :class="scope.row.changeArea < 0 ? 'text-danger' : 'text-success'">
              {{ scope.row.changeArea > 0 ? '+' : '' }}{{ scope.row.changeArea || 0 }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="lossArea" label="其中损耗(㎡)" width="110" align="right">
           <template slot-scope="scope">
            <span v-if="scope.row.lossArea > 0" class="text-danger">
              {{ scope.row.lossArea }}
            </span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="beforeSpec" label="变动前规格" width="140" />
        <el-table-column prop="afterSpec" label="变动后规格" width="140" />
        <el-table-column prop="operator" label="操作人" width="100">
          <template slot-scope="scope">
            {{ getOperatorText(scope.row) }}
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="详情说明" min-width="200" show-overflow-tooltip />
      </el-table>
    </el-card>
  </div>
</template>

<script>
import request from '@/utils/request'
import { parseTime } from '@/utils'

export default {
  name: 'WorkshopDailyReport',
  data() {
    return {
      queryDate: new Date().toISOString().split('T')[0],
      workshopSection: '',
      list: [],
      loading: false
    }
  },
  created() {
    this.fetchData()
  },
  methods: {
    formatTime(time) {
      return parseTime(time)
    },
    fetchData() {
      this.loading = true
      request({
        url: '/api/workshop/daily-summary',
        method: 'get',
        params: {
          date: this.queryDate,
          workshopSection: this.workshopSection
        }
      }).then(res => {
        if (res.code === 200 || res.code === 20000) {
          this.list = res.data || []
        }
      }).finally(() => {
        this.loading = false
      })
    },
    getTypeStyle(type) {
      const map = {
        'IN': 'success',
        'OUT': 'danger',
        'ADJUST': 'warning',
        'TRANSFER': 'info',
        'MOVE': ''
      }
      return map[type] || ''
    },
    getTypeText(type) {
      const map = {
        'IN': '退料/入库',
        'OUT': '领料出库',
        'ADJUST': '规格修正',
        'TRANSFER': '班组交接',
        'MOVE': '领料入场'
      }
      return map[type] || type
    },
    getOperatorText(row) {
      if (row.realName) return row.realName
      const operator = row.operator
      if (!operator) return '-'
      const map = {
        'admin': '管理员',
        'yinhuanzhong': '尹焕中'
      }
      return map[operator] || operator
    },
    getSummary(param) {
      const { columns, data } = param
      const sums = []
      columns.forEach((column, index) => {
        if (index === 0) {
          sums[index] = '当日合计'
          return
        }
        if (column.property === 'changeArea' || column.property === 'lossArea') {
          const values = data.map(item => Number(item[column.property]))
          if (!values.every(value => isNaN(value))) {
            sums[index] = values.reduce((prev, curr) => {
              const value = Number(curr)
              if (!isNaN(value)) {
                return prev + curr
              } else {
                return prev
              }
            }, 0).toFixed(2)
          } else {
            sums[index] = 'N/A'
          }
        } else {
          sums[index] = ''
        }
      })
      return sums
    },
    handleExport() {
      this.$message.info('导出功能开发中...')
    }
  }
}
</script>

<style scoped>
.text-danger { color: #F56C6C; }
.text-success { color: #67C23A; }
</style>
