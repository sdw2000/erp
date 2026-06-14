<template>
  <div class="workshop-container">
    <el-card>
      <div slot="header" class="clearfix">
        <span>车间现场 (线边仓) - {{ searchForm.workshopSection || '全厂' }}</span>
        <div style="float: right">
          <el-button type="primary" icon="el-icon-full-screen" size="small" @click="openScanDialog"> PDA/移动端扫码</el-button>
          <el-button type="info" icon="el-icon-refresh" size="small" @click="fetchData">刷新</el-button>
        </div>
      </div>

      <!-- 概览统计 (仅展示当前工段) -->
      <el-row :gutter="12" style="margin-bottom: 20px">
        <el-col :xs="24" :sm="12" :lg="6">
          <div class="stat-box blue">
            <div class="label">现场存料 (卷/件)</div>
            <div class="value">{{ totalRolls }}</div>
          </div>
        </el-col>
        <el-col :xs="24" :sm="12" :lg="6">
          <div class="stat-box green">
            <div class="label">现场现存 (㎡)</div>
            <div class="value">{{ totalArea.toFixed(2) }}</div>
          </div>
        </el-col>
        <el-col :xs="24" :sm="12" :lg="6">
          <div class="stat-box orange">
            <div class="label">本月累计损耗 (㎡)</div>
            <div class="value">{{ totalLoss.toFixed(2) }}</div>
          </div>
        </el-col>
        <el-col :xs="24" :sm="12" :lg="6">
          <div class="stat-box red">
            <div class="label">本月产出损耗率</div>
            <div class="value">{{ lossRate }}%</div>
          </div>
        </el-col>
      </el-row>

      <el-tabs v-model="activeTab" type="border-card" @tab-click="handleTabClick">
        <!-- 标签页1：胶带/在制品 (TapeStock) -->
        <el-tab-pane label="线边在制品 (胶带)" name="tapes">
          <!-- 搜索栏 -->
          <el-form :inline="true" :model="searchForm" size="small" class="search-form">
            <el-form-item label="二维码/批次" label-width="90px">
              <el-input v-model="searchForm.qrCode" placeholder="扫码或输入" clearable />
            </el-form-item>
            <el-form-item label="所属工段" v-if="isAdmin" label-width="80px">
              <el-select v-model="searchForm.workshopSection" placeholder="工段过滤" clearable style="width: 100px" @change="handleSearch">
                <el-option label="涂布" value="涂布" />
                <el-option label="复卷" value="复卷" />
                <el-option label="分切" value="分切" />
                <el-option label="包装" value="包装" />
              </el-select>
            </el-form-item>
            <el-form-item label="料号" label-width="50px">
              <el-input v-model="searchForm.materialCode" placeholder="料号" clearable />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="handleSearch">查询</el-button>
            </el-form-item>
          </el-form>

          <el-table v-loading="loading" :data="list" border stripe size="mini">
            <el-table-column prop="qrCode" label="卷标签号" width="160" />
            <el-table-column prop="materialCode" label="料号" width="140" />
            <el-table-column prop="productName" label="产品名称" min-width="150" show-overflow-tooltip />
            <el-table-column label="当前规格" width="160">
              <template slot-scope="scope">
                {{ scope.row.width }}mm * {{ scope.row.length }}m
              </template>
            </el-table-column>
            <el-table-column label="交接归属" width="120">
              <template slot-scope="scope">
                {{ scope.row.workshopSection || '-' }} / {{ scope.row.shiftCode || '-' }}
              </template>
            </el-table-column>
            <el-table-column prop="totalSqm" label="剩余面积(㎡)" width="110">
              <template slot-scope="scope">
                <span style="font-weight: bold; color: #409EFF">{{ scope.row.totalSqm }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="workshopStatus" label="现场状态" width="100" align="center">
              <template slot-scope="scope">
                <el-tag :type="getWorkshopStatusType(scope.row.workshopStatus)" size="mini">
                  {{ getWorkshopStatusText(scope.row.workshopStatus) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" fixed="right" width="220">
              <template slot-scope="scope">
                <el-button type="text" size="mini" @click="handleAdjust(scope.row)">损耗修正</el-button>
                <el-button type="text" size="mini" style="color: #67C23A" @click="handleTransfer(scope.row)">交接</el-button>
                <el-button type="text" size="mini" style="color: #E6A23C" @click="handleReturn(scope.row)">退料</el-button>
              </template>
            </el-table-column>
          </el-table>
          <pagination v-show="total > 0" :total="total" :page.sync="searchForm.page" :limit.sync="searchForm.size" @pagination="fetchList" />
        </el-tab-pane>

        <!-- 标签页2：原材料库 (FilmStock) - 仅涂布可见 -->
        <el-tab-pane v-if="isAdmin || searchForm.workshopSection === '涂布'" label="线边原材料 (薄膜)" name="films">
          <el-alert title="提示：此处显示的薄膜已办理【领料出库】，目前存放在车间现场等待生产使用。" type="info" show-icon :closable="false" style="margin-bottom: 10px;" />
          <el-table v-loading="loading" :data="filmList" border stripe size="mini">
            <el-table-column prop="rollNo" label="卷号" width="160" />
            <el-table-column prop="materialCode" label="薄膜料号" width="150" />
            <el-table-column label="规格" width="180">
              <template slot-scope="scope">
                {{ scope.row.width }}mm * {{ scope.row.currentLengthM }}m
              </template>
            </el-table-column>
            <el-table-column prop="area" label="剩余面积(㎡)" width="120" />
            <el-table-column prop="location" label="现场位置" width="120" />
            <el-table-column prop="batchNo" label="批次" width="150" />
          </el-table>
        </el-tab-pane>

        <!-- 标签页3：使用历史流水 (TapeStockLog) -->
        <el-tab-pane label="线边使用单/流水" name="logs">
          <el-table v-loading="loading" :data="logList" border stripe size="mini">
            <el-table-column prop="createTime" label="操作时间" width="150" />
            <el-table-column prop="shiftCode" label="班组" width="80" />
            <el-table-column prop="type" label="类型" width="90">
              <template slot-scope="scope">
                <el-tag :type="getLogTypeTag(scope.row.type)" size="mini">{{ scope.row.type }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="materialCode" label="料号" width="140" />
            <el-table-column prop="lossArea" label="损耗(㎡)" width="100">
              <template slot-scope="scope">
                <span v-if="scope.row.lossArea > 0" style="color: #F56C6C">-{{ scope.row.lossArea }}</span>
                <span v-else>0</span>
              </template>
            </el-table-column>
            <el-table-column prop="remark" label="说明" min-width="250" show-overflow-tooltip />
            <el-table-column prop="operator" label="经办人" width="100" />
          </el-table>
          <pagination v-show="logTotal > 0" :total="logTotal" :page.sync="logPagination.page" :limit.sync="logPagination.size" @pagination="fetchUsageRecords" />
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 规格修正对话框 -->    </el-card>

    <!-- 规格修正对话框 -->
    <el-dialog title="物料规格修正 / 损耗记录" :visible.sync="adjustVisible" width="500px">
      <el-form :model="adjustForm" label-width="100px" v-if="adjustRow">
        <el-form-item label="当前物料">
          <div style="font-weight: bold">{{ adjustRow.materialCode }} ({{ adjustRow.qrCode }})</div>
          <div style="color: #909399">原始: {{ adjustRow.width }}mm * {{ adjustRow.length }}m</div>
        </el-form-item>
        <el-divider content-position="left">物理实测数据</el-divider>
        <el-form-item label="剩余宽度(mm)">
          <el-input-number v-model="adjustForm.newWidth" :min="0" :precision="2" style="width: 100%" />
        </el-form-item>
        <el-form-item label="剩余长度(m)">
          <el-input-number v-model="adjustForm.newLength" :min="0" :precision="2" style="width: 100%" />
        </el-form-item>
        <el-form-item label="损耗原因">
          <el-select v-model="adjustForm.reason" placeholder="请选择损耗主因" style="width: 100%">
            <el-option label="表面瑕疵" value="表面瑕疵" />
            <el-option label="厚度不均" value="厚度不均" />
            <el-option label="接头过多" value="接头过多" />
            <el-option label="溢胶/残胶" value="溢胶/残胶" />
            <el-option label="设备调试损耗" value="设备调试损耗" />
            <el-option label="涂布起刀损耗" value="涂布起刀损耗" />
            <el-option label="车间搬运损坏" value="车间搬运损坏" />
            <el-option label="试生产取样" value="试生产取样" />
          </el-select>
        </el-form-item>
        <el-form-item label="详细备注">
          <el-input type="textarea" v-model="adjustForm.reasonDetails" placeholder="具体描述损耗情况..." />
        </el-form-item>
        <div style="background: #fdf6ec; padding: 10px; border-radius: 4px; font-size: 13px; color: #e6a23c">
          ⚠️ 提示：系统将自动对比原始面积，计算并记录流水。若实测长度为0，物料将标记为已消耗。
        </div>
      </el-form>
      <div slot="footer">
        <el-button @click="adjustVisible = false">取消</el-button>
        <el-button type="primary" @click="submitAdjust" :loading="submitting">确定提交</el-button>
      </div>
    </el-dialog>

    <!-- 工段交接对话框 -->
    <el-dialog title="工段/班组交接" :visible.sync="transferVisible" width="450px">
      <el-form :model="transferForm" label-width="100px" size="small">
        <el-form-item label="当前物料">
          <div style="font-weight: bold">{{ transferRow ? (transferRow.materialCode + ' (' + transferRow.batchNo + ')') : '' }}</div>
          <div style="color: #909399">当前归属: {{ transferRow ? ((transferRow.workshopSection || '未分配') + ' / ' + (transferRow.shiftCode || '未指定')) : '' }}</div>
        </el-form-item>
        <el-form-item label="接收工段">
          <el-select v-model="transferForm.targetSection" placeholder="请选择接收工段" style="width: 100%">
            <el-option label="涂布" value="涂布" />
            <el-option label="复卷" value="复卷" />
            <el-option label="分切" value="分切" />
            <el-option label="包装" value="包装" />
          </el-select>
        </el-form-item>
        <el-form-item label="接收班组/班次">
          <el-select v-model="transferForm.targetShift" placeholder="请选择/输入班组" filterable allow-create style="width: 100%">
            <el-option label="甲班" value="甲班" />
            <el-option label="乙班" value="乙班" />
            <el-option label="丙班" value="丙班" />
            <el-option label="A组" value="A组" />
            <el-option label="B组" value="B组" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注/留言">
          <el-input v-model="transferForm.remark" type="textarea" placeholder="交接注意事项..." />
        </el-form-item>
      </el-form>
      <div slot="footer">
        <el-button size="small" @click="transferVisible = false">取消</el-button>
        <el-button size="small" type="primary" @click="submitTransfer" :loading="submitting">确定交接</el-button>
      </div>
    </el-dialog>

    <!-- 退料对话框 -->
    <el-dialog title="车间退料入库" :visible.sync="returnVisible" width="400px">
      <el-form :model="returnForm" label-width="100px">
        <el-form-item label="退回仓库">
          <el-select v-model="returnForm.targetLocation" style="width: 100%">
            <el-option label="成品仓" value="成品仓" />
            <el-option label="原料仓" value="原料仓" />
            <el-option label="半成品区" value="半成品区" />
          </el-select>
        </el-form-item>
        <el-form-item label="退料原因">
          <el-input type="textarea" v-model="returnForm.remark" placeholder="例如: 生产剩余、订单取消等" />
        </el-form-item>
      </el-form>
      <div slot="footer">
        <el-button @click="returnVisible = false">取消</el-button>
        <el-button type="warning" @click="submitReturn" :loading="submitting">确认退库</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import request from '@/utils/request'
import Pagination from '@/components/Pagination'
import { mapGetters } from 'vuex'

export default {
  name: 'WorkshopWarehouse',
  components: { Pagination },
  computed: {
    ...mapGetters(['roles', 'name', 'realName', 'workGroup']),
    isAdmin() {
      return this.roles.includes('admin') || this.roles.includes('warehouse')
    }
  },
  data() {
    return {
      activeTab: 'tapes',
      loading: false,
      list: [],
      total: 0,
      filmList: [],
      logList: [],
      logTotal: 0,
      totalRolls: 0,
      totalArea: 0,
      totalLoss: 0,
      lossRate: 0,
      searchForm: {
        page: 1,
        size: 15,
        qrCode: '',
        materialCode: '',
        workshopSection: '',
        workshopStatus: ''
      },
      logPagination: {
        page: 1,
        size: 15
      },
      adjustVisible: false,
      adjustRow: null,
      adjustForm: {
        newWidth: 0,
        newLength: 0,
        reason: '',
        reasonDetails: ''
      },
      transferVisible: false,
      transferRow: null,
      transferForm: {
        targetSection: '',
        targetShift: '',
        remark: ''
      },
      returnVisible: false,
      returnRow: null,
      returnForm: {
        targetLocation: '成品仓',
        remark: ''
      },
      submitting: false
    }
  },
  created() {
    this.initFilter()
    this.fetchData()
  },
  methods: {
    initFilter() {
      // 如果不是管理员，根据部门自动锁定工段
      if (!this.isAdmin) {
        const dept = this.workGroup || ''
        if (dept.includes('涂布')) {
          this.searchForm.workshopSection = '涂布'
        } else if (dept.includes('分切')) {
          this.searchForm.workshopSection = '分切'
        } else if (dept.includes('包装')) {
          this.searchForm.workshopSection = '包装'
        } else if (dept.includes('复卷')) {
          this.searchForm.workshopSection = '复卷'
        }
      }
    },
    fetchData() {
      this.fetchList()
      this.fetchSummary()
      if (this.activeTab === 'logs') {
        this.fetchUsageRecords()
      }
    },
    async fetchList() {
      this.loading = true
      try {
        const res = await request({
          url: '/api/workshop/stock',
          method: 'get',
          params: { 
            workshopSection: this.searchForm.workshopSection,
            qrCode: this.searchForm.qrCode,
            materialCode: this.searchForm.materialCode,
            workshopStatus: this.searchForm.workshopStatus
          }
        })
        if (res.code === 200 || res.code === 20000) {
          const data = res.data || {}
          this.list = data.tapes || []
          this.filmList = data.films || []
          this.total = this.list.length 
        }
      } finally {
        this.loading = false
      }
    },
    async fetchUsageRecords() {
      this.loading = true
      try {
        const res = await request({
          url: '/api/workshop/usage-records',
          method: 'get',
          params: {
            workshopSection: this.searchForm.workshopSection,
            pageNum: this.logPagination.page,
            pageSize: this.logPagination.size
          }
        })
        if (res.code === 200 || res.code === 20000) {
          this.logList = res.data.records || []
          this.logTotal = Number(res.data.total || 0)
        }
      } finally {
        this.loading = false
      }
    },
    handleTabClick(tab) {
      if (tab.name === 'logs') {
        this.fetchUsageRecords()
      } else {
        this.fetchList()
      }
    },
    getLogTypeTag(type) {
      const map = { 'ADJUST': 'danger', 'MOVE': 'primary', 'TRANSFER': 'warning', 'IN': 'info', 'RETURN': 'info' }
      return map[type] || ''
    },
    handleSearch() {
      this.searchForm.page = 1
      this.fetchList()
      this.fetchSummary()
    },
    fetchSummary() {
      // 调用 WorkshopController 的损耗统计
      request({
        url: '/api/workshop/loss-summary',
        method: 'get',
        params: { workshopSection: this.searchForm.workshopSection }
      }).then(res => {
        if (res.code === 200 || res.code === 20000) {
          const stats = res.data || {}
          this.totalLoss = stats.monthlyTotalLoss || 0
          this.lossRate = stats.lossRate || 0
          this.totalArea = stats.totalFloorArea || 0
          this.totalRolls = stats.totalFloorRolls || 0
        }
      })
    },
    handleSearch() {
      this.searchForm.page = 1
      this.fetchList()
    },
    getWorkshopStatusType(status) {
      const map = {
        'NORMAL': 'info',
        'CONSUMING': 'warning',
        'REMAINING': 'success',
        'CONSUMED': 'danger'
      }
      return map[status] || 'info'
    },
    getWorkshopStatusText(status) {
      const map = {
        'NORMAL': '待使用',
        'CONSUMING': '使用中',
        'REMAINING': '已部分消耗',
        'CONSUMED': '已耗尽'
      }
      return map[status] || '未知'
    },
    handleAdjust(row) {
      this.adjustRow = row
      this.adjustForm.newWidth = row.width
      this.adjustForm.newLength = row.length
      this.adjustForm.reason = ''
      this.adjustForm.reasonDetails = ''
      this.adjustVisible = true
    },
    submitAdjust() {
      this.submitting = true
      request({
        url: '/api/workshop/adjust',
        method: 'post',
        data: {
          id: this.adjustRow.id,
          newWidth: this.adjustForm.newWidth,
          newLength: this.adjustForm.newLength,
          reason: this.adjustForm.reason,
          reasonDetails: this.adjustForm.reasonDetails
        }
      }).then(res => {
        this.$message.success('规格更新成功')
        this.adjustVisible = false
        this.fetchList()
        this.fetchSummary()
      }).finally(() => {
        this.submitting = false
      })
    },
    handleTransfer(row) {
      this.transferRow = row
      this.transferForm.targetSection = row.workshopSection
      this.transferForm.targetShift = row.shiftCode
      this.transferForm.remark = ''
      this.transferVisible = true
    },
    submitTransfer() {
      if (!this.transferForm.targetSection && !this.transferForm.targetShift) {
        this.$message.warning('请选择接收工段或班组')
        return
      }
      this.submitting = true
      request({
        url: '/api/workshop/transfer',
        method: 'post',
        data: {
          id: this.transferRow.id,
          targetSection: this.transferForm.targetSection,
          targetShift: this.transferForm.targetShift,
          remark: this.transferForm.remark,
          operator: this.realName || this.name
        }
      }).then(res => {
        this.$message.success('交接成功')
        this.transferVisible = false
        this.fetchList()
      }).finally(() => {
        this.submitting = false
      })
    },
    handleReturn(row) {
      this.returnRow = row
      this.returnForm.targetLocation = '成品仓'
      this.returnForm.remark = ''
      this.returnVisible = true
    },
    submitReturn() {
      this.submitting = true
      request({
        url: '/api/workshop/return',
        method: 'post',
        data: {
          id: this.returnRow.id,
          targetLocation: this.returnForm.targetLocation,
          remark: this.returnForm.remark,
          operator: this.realName || this.name
        }
      }).then(res => {
        this.$message.success('退料入库成功')
        this.returnVisible = false
        this.fetchList()
      }).finally(() => {
        this.submitting = false
      })
    },
    openScanDialog() {
      this.$message.info('请使用PDA或手机端扫码。PC端请直接在搜索框录入条码。')
    },
    handleLog(row) {
      this.$router.push({ path: '/stock/log', query: { batchNo: row.batchNo }})
    }
  }
}
</script>

<style scoped>
.stat-box {
  padding: 15px;
  border-radius: 4px;
  color: #fff;
  text-align: center;
  margin-bottom: 10px;
}
.stat-box .label { font-size: 13px; opacity: 0.9; margin-bottom: 5px; }
.stat-box .value { font-size: 20px; font-weight: bold; }
.blue { background: #409EFF; }
.green { background: #67C23A; }
.orange { background: #E6A23C; }
.red { background: #F56C6C; }

.search-form {
  background: #f8f9fa;
  padding: 15px 15px 0 15px;
  margin-bottom: 15px;
  border-radius: 4px;
}
</style>
