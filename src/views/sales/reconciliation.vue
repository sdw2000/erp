<template>
  <div class="sales-reconciliation">
    <el-card>
      <div slot="header" class="page-header">
        <span class="card-title">销售对账单</span>
        <div>
          <el-button size="small" icon="el-icon-upload2" @click="triggerImportHistory">导入</el-button>
          <el-button size="small" icon="el-icon-download" :disabled="!queryForm.customerCode || !queryForm.month" @click="handleExport">导出</el-button>
          <el-button size="small" icon="el-icon-plus" :disabled="!queryForm.customerCode" @click="openInitDialog">历史初始化</el-button>
          <el-button size="small" icon="el-icon-refresh" @click="handleReset">重置</el-button>
          <el-button type="primary" size="small" icon="el-icon-search" @click="handleSearch">查询</el-button>
          <el-button type="success" size="small" icon="el-icon-printer" :disabled="!statementLoaded" @click="openPrintPreview">打印预览</el-button>
          <input ref="historyImportFile" type="file" accept=".csv,.txt,.xlsx,.xls" style="display:none" @change="handleImportHistoryChange">
        </div>
      </div>

      <div class="search-area">
        <el-row :gutter="12">
          <el-col v-if="activeTab === 'detail'" :span="10">
            <div class="search-item">
              <span class="search-label">客户</span>
              <el-select v-model="queryForm.customerCode" filterable clearable placeholder="请选择客户" style="width:100%">
                <el-option v-for="item in customers" :key="item.id" :label="`${item.shortName || item.customerName}（${item.customerCode}）`" :value="item.customerCode" />
              </el-select>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="search-item">
              <span class="search-label">月份</span>
              <el-date-picker v-model="queryForm.month" type="month" value-format="yyyy-MM" placeholder="选择月份" style="width:100%" />
            </div>
          </el-col>
          <el-col v-if="activeTab === 'overview'" :span="10">
            <div class="search-item" style="display: flex; gap: 12px; align-items: center;">
              <span class="search-label">客户</span>
              <el-select v-model="queryForm.customerCode" filterable clearable placeholder="请选择客户（可选）" style="width:180px">
                <el-option v-for="item in customers" :key="item.id" :label="`${item.shortName || item.customerName}（${item.customerCode}）`" :value="item.customerCode" />
              </el-select>
              <span class="search-label">是否对账</span>
              <el-select v-model="queryForm.reconciledStatus" clearable placeholder="全部" style="width:120px">
                <el-option label="全部" value="" />
                <el-option label="已对账" value="RECONCILED" />
                <el-option label="未对账" value="UNRECONCILED" />
              </el-select>
            </div>
          </el-col>
          <el-col v-if="activeTab === 'detail' && statementLoaded" :span="8">
            <div class="search-item">
              <span class="search-label status-label">状态</span>
              <el-tag :type="getStatusTagType(statement.reconciliationStatus)" size="small">{{ statement.reconciliationStatusLabel || '未对账' }}</el-tag>
            </div>
          </el-col>
        </el-row>
      </div>

      <el-tabs v-model="activeTab" class="reconciliation-tabs" @tab-click="handleTabChange">
        <el-tab-pane label="对账明细" name="detail">

          <div v-if="statementLoaded" class="summary-grid">
            <div class="summary-card">
              <div class="summary-label">本月卷数</div>
              <div class="summary-value">{{ formatNumber(statement.summary.totalRolls, 0) }}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">本月面积</div>
              <div class="summary-value">{{ formatNumber(statement.summary.totalArea) }} ㎡</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">发货金额</div>
              <div class="summary-value">{{ formatNumber(statement.summary.deliveryAmount) }}</div>
            </div>
            <div class="summary-card warning-card">
              <div class="summary-label">退货影响</div>
              <div class="summary-value">{{ formatNumber(statement.summary.returnAmount) }}</div>
            </div>
            <div class="summary-card primary-card">
              <div class="summary-label">本月对账金额</div>
              <div class="summary-value">{{ formatNumber(statement.summary.totalAmount) }}</div>
            </div>
          </div>

          <div class="section-block">
            <div class="section-head">
              <div class="section-title">当月送货明细</div>
              <div class="section-head-actions">
                <el-button
                  size="small"
                  icon="el-icon-plus"
                  :disabled="!statementLoaded || !queryForm.customerCode || !queryForm.month"
                  @click="openUnreconciledDialog"
                >
                  增加未对账订单
                </el-button>
                <el-button
                  type="success"
                  size="small"
                  icon="el-icon-check"
                  :disabled="!statementLoaded"
                  @click="confirmCurrentStatement"
                >
                  确认对账
                </el-button>
                <el-button
                  v-if="isAdminUser()"
                  type="warning"
                  plain
                  size="small"
                  icon="el-icon-refresh-left"
                  :disabled="!canAdminRollbackCurrentStatement()"
                  @click="rollbackCurrentStatementByAdmin"
                >
                  管理员回退
                </el-button>
              </div>
            </div>
            <el-table class="reconciliation-table" :data="statement.detailRows" border stripe style="width:100%">
              <el-table-column label="类型" width="78" align="center">
                <template slot-scope="scope">
                  <el-tag size="mini" :type="scope.row.bizType === 'return' ? 'warning' : 'success'">
                    {{ scope.row.bizType === 'return' ? '退货' : '发货' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="出货日期" width="100">
                <template slot-scope="scope">{{ formatShortDate(scope.row.bizDate) }}</template>
              </el-table-column>
              <el-table-column prop="orderNo" label="订单号" min-width="130" show-overflow-tooltip />
              <el-table-column label="业务单号" min-width="150" show-overflow-tooltip>
                <template slot-scope="scope">
                  {{ scope.row.bizType === 'return' ? `退货单：${scope.row.documentNo || '-'}` : `送货单：${scope.row.documentNo || '-'}` }}
                </template>
              </el-table-column>
              <el-table-column prop="materialName" label="产品" min-width="154" show-overflow-tooltip />
              <el-table-column prop="spec" label="规格" min-width="150" show-overflow-tooltip />
              <el-table-column label="数量(R)" width="72" align="right">
                <template slot-scope="scope">{{ formatNumber(scope.row.quantity, 0) }}</template>
              </el-table-column>
              <el-table-column label="数量/m²" width="100" align="right">
                <template slot-scope="scope">{{ formatNumber(scope.row.areaSize) }}</template>
              </el-table-column>
              <el-table-column label="单价" width="110" align="right">
                <template slot-scope="scope">{{ formatNumber(scope.row.unitPrice, 4) }} / {{ scope.row.priceUnit || '㎡' }}</template>
              </el-table-column>
              <el-table-column label="总金额" width="120" align="right">
                <template slot-scope="scope">
                  <span :class="{ 'negative-amount': Number(scope.row.amount) < 0 }">{{ formatNumber(scope.row.amount) }}</span>
                </template>
              </el-table-column>
              <el-table-column label="对账月份" width="140" align="center">
                <template slot-scope="scope">
                  <el-select
                    v-if="scope.row.bizType === 'delivery' && !statement.rpNaturalMonthLocked"
                    v-model="scope.row.reconcileTargetMonth"
                    size="mini"
                    style="width: 120px"
                    @change="handleDetailTargetMonthChange(scope.row)"
                  >
                    <el-option :value="queryForm.month" :label="`${queryForm.month}(当月)`" />
                    <el-option :value="getNextMonth(queryForm.month)" :label="`${getNextMonth(queryForm.month)}(下月)`" />
                  </el-select>
                  <span v-else>{{ scope.row.reconcileTargetMonth || queryForm.month }}</span>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="170" align="center">
                <template slot-scope="scope">
                  <div v-if="scope.row.bizType === 'delivery' || scope.row.bizType === 'return'" class="op-btns">
                    <el-button
                      v-if="scope.row.bizType === 'delivery' && !statement.rpNaturalMonthLocked"
                      type="text"
                      size="mini"
                      @click="openSplitDialog(scope.row)"
                    >
                      拆分
                    </el-button>
                    <el-button
                      v-if="scope.row._splitPairId"
                      type="text"
                      size="mini"
                      @click="restoreSplitRow(scope.row)"
                    >
                      还原
                    </el-button>
                    <el-button
                      type="text"
                      size="mini"
                      class="op-danger"
                      :disabled="statement.rpNaturalMonthLocked"
                      @click="removeDetailRow(scope.row)"
                    >
                      删除
                    </el-button>
                  </div>
                  <span v-else>-</span>
                </template>
              </el-table-column>
            </el-table>
          </div>

          <div class="section-block">
            <div class="section-head">
              <div class="section-title">历史欠账 / 开票台账</div>
              <el-button type="primary" plain size="small" icon="el-icon-plus" :disabled="!queryForm.customerCode" @click="addHistoryRow">新增历史记录</el-button>
            </div>
            <el-table class="reconciliation-table" :data="statement.historyRows" border stripe style="width:100%">
              <el-table-column label="对账月份" width="120">
                <template slot-scope="scope">
                  <el-date-picker v-model="scope.row.statementMonth" :disabled="!scope.row._editing" type="month" value-format="yyyy-MM" size="mini" placeholder="月份" style="width:100%" />
                </template>
              </el-table-column>
              <el-table-column label="欠账金额" width="140" align="right">
                <template slot-scope="scope">
                  <el-input-number v-model="scope.row.unpaidAmount" :disabled="!scope.row._editing" :precision="2" :controls="false" size="mini" style="width:100%" />
                </template>
              </el-table-column>
              <el-table-column label="开票金额" width="140" align="right">
                <template slot-scope="scope">
                  <el-input-number v-model="scope.row.invoiceAmount" :disabled="!scope.row._editing" :precision="2" :controls="false" size="mini" style="width:100%" />
                </template>
              </el-table-column>
              <el-table-column label="开票日期" width="140">
                <template slot-scope="scope">
                  <el-date-picker v-model="scope.row.invoiceDate" :disabled="!scope.row._editing" type="date" value-format="yyyy-MM-dd" size="mini" placeholder="开票日期" style="width:100%" />
                </template>
              </el-table-column>
              <el-table-column label="备注" min-width="180">
                <template slot-scope="scope">
                  <el-input v-model="scope.row.remark" :disabled="!scope.row._editing" size="mini" placeholder="备注" />
                </template>
              </el-table-column>
              <el-table-column label="操作" width="150" align="center">
                <template slot-scope="scope">
                  <div class="op-btns">
                    <el-button v-if="scope.row._editing" type="text" size="mini" @click="saveHistoryRow(scope.row)">保存</el-button>
                    <el-button v-else type="text" size="mini" @click="editHistoryRow(scope.row)">修改</el-button>
                    <el-button type="text" size="mini" class="op-danger" @click="deleteHistoryRow(scope.row, scope.$index)">删除</el-button>
                  </div>
                </template>
              </el-table-column>
            </el-table>
            <div class="history-summary">
              <span>历史欠账合计：{{ formatNumber(getHistoryTotalUnpaid()) }}</span>
              <span>历史开票合计：{{ formatNumber(getHistoryTotalInvoice()) }}</span>
              <span class="payable-amount">期末应付金额：{{ formatNumber(getFinalPayableAmount()) }}</span>
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane label="客户对账总情况" name="overview">
          <div class="section-block">
            <div class="section-head">
              <div class="section-title">{{ queryForm.month }} 客户对账总览</div>
            </div>
            <el-table
              v-loading="overviewLoading"
              class="reconciliation-table"
              :data="overviewRows"
              border
              stripe
              style="width:100%"
              @sort-change="handleOverviewSortChange"
            >
              <el-table-column label="序号" width="70" align="center" type="index" :index="calcOverviewIndex" />
              <el-table-column prop="customerName" label="客户" min-width="180" show-overflow-tooltip sortable="custom" />
              <el-table-column prop="statementAmount" label="当月对账金额" width="150" align="right" sortable="custom">
                <template slot-scope="scope">{{ formatNumber(scope.row.statementAmount) }}</template>
              </el-table-column>
              <el-table-column prop="invoiceAmount" label="开票金额" width="140" align="right" sortable="custom">
                <template slot-scope="scope">{{ formatNumber(scope.row.invoiceAmount) }}</template>
              </el-table-column>
              <el-table-column prop="receivedAmount" label="收款金额" width="140" align="right" sortable="custom">
                <template slot-scope="scope">{{ formatNumber(scope.row.receivedAmount) }}</template>
              </el-table-column>
              <el-table-column prop="reconciliationStatus" label="对账状态" width="120" align="center" sortable="custom">
                <template slot-scope="scope">
                  <el-tag :type="getStatusTagType(scope.row.reconciliationStatus)" size="small">
                    {{ scope.row.reconciliationStatusLabel || '未对账' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="110" align="center">
                <template slot-scope="scope">
                  <el-button type="text" size="mini" @click="goToReconciliation(scope.row)">去对账</el-button>
                </template>
              </el-table-column>
            </el-table>
            <div class="overview-pagination">
              <el-pagination
                background
                layout="total, sizes, prev, pager, next, jumper"
                :total="overviewPager.total"
                :current-page="overviewPager.current"
                :page-size="overviewPager.size"
                :page-sizes="[10, 20, 50, 100]"
                @current-change="handleOverviewCurrentChange"
                @size-change="handleOverviewSizeChange"
              />
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <el-dialog title="对账单打印预览" :visible.sync="printVisible" width="1100px" top="4vh">
      <div v-if="statementLoaded" id="reconciliationPrintArea" class="print-sheet">
        <div class="print-company-header">
          <img :src="companyInfo.logoUrl || '/logo/finechem-logo.png'" alt="logo" class="print-logo">
          <div class="print-company-info">
            <div class="company-name">{{ companyInfo.companyName }}</div>
            <div>地址：{{ companyInfo.address }}</div>
            <div>电话：{{ companyInfo.phone }}　传真：{{ companyInfo.fax }}</div>
            <div>{{ companyInfo.website }}</div>
          </div>
        </div>
        <div class="print-title">{{ queryForm.month.replace('-', '年') }}月销售对账单</div>
        <div class="print-meta-line">
          <span><strong>购货单位：</strong>{{ statement.customerName || statement.customerCode }}</span>
        </div>
        <div class="print-subtitle">一、{{ queryForm.month }}期间，贵司货物收发明细如下：</div>
        <table class="print-table">
          <thead>
            <tr>
              <th>类型</th>
              <th>出货日期</th>
              <th>订单号</th>
              <th>业务单号</th>
              <th>产品</th>
              <th>规格</th>
              <th>数量(R)</th>
              <th>数量/m²</th>
              <th>单价</th>
              <th>总金额</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, idx) in statement.detailRows" :key="idx">
              <td>{{ row.bizType === 'return' ? '退货' : '发货' }}</td>
              <td>{{ row.bizDate }}</td>
              <td>{{ row.orderNo }}</td>
              <td>{{ row.bizType === 'return' ? `退货单：${row.documentNo || '-'}` : `送货单：${row.documentNo || '-'}` }}</td>
              <td>{{ row.materialName }}</td>
              <td>{{ row.spec }}</td>
              <td>{{ formatNumber(row.quantity, 0) }}</td>
              <td>{{ formatNumber(row.areaSize) }}</td>
              <td>{{ formatNumber(row.unitPrice, 4) }} / {{ row.priceUnit || '㎡' }}</td>
              <td>{{ formatNumber(row.amount) }}</td>
            </tr>
          </tbody>
        </table>
        <div class="print-total">合计金额：{{ formatNumber(statement.summary.totalAmount) }}</div>
        <div class="print-subtitle">二、应付明细：</div>
        <table class="print-table print-history-table">
          <thead>
            <tr>
              <th>月份</th>
              <th>欠账金额</th>
              <th>开票金额</th>
              <th>开票日期</th>
              <th>备注</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, idx) in getPrintHistoryRows()" :key="`history-${idx}`">
              <td>{{ row.statementMonth }}</td>
              <td>{{ formatNumber(row.unpaidAmount) }}</td>
              <td>{{ formatNumber(row.invoiceAmount) }}</td>
              <td>{{ row.invoiceDate || '-' }}</td>
              <td>{{ row.remark || '-' }}</td>
            </tr>
            <tr v-if="!getPrintHistoryRows().length">
              <td colspan="5">暂无历史记录</td>
            </tr>
          </tbody>
        </table>
        <div class="print-total">
          历史欠账合计：{{ formatNumber(getHistoryTotalUnpaid()) }}
          &nbsp;&nbsp;&nbsp;历史开票合计：{{ formatNumber(getHistoryTotalInvoice()) }}
          &nbsp;&nbsp;&nbsp;期末应付金额：{{ formatNumber(getFinalPayableAmount()) }}
        </div>
        <div class="print-footer-note">
          请核对以上对账明细，如有差异请及时反馈；无误后请据此安排付款与开票确认。
        </div>
        <div class="print-signature">
          <span>供货方确认：________________</span>
          <span>采购方确认：________________</span>
          <span>日期：________________</span>
        </div>
      </div>
      <span slot="footer" class="dialog-footer-actions">
        <el-button @click="printVisible = false">关闭</el-button>
        <el-button type="primary" icon="el-icon-printer" @click="handlePrintBrowser">打印对账单</el-button>
      </span>
    </el-dialog>

    <el-dialog title="历史数据初始化" :visible.sync="initDialogVisible" width="520px">
      <el-form :model="initForm" label-width="95px" size="small">
        <el-form-item label="客户">
          <el-input :value="queryForm.customerCode" disabled />
        </el-form-item>
        <el-form-item label="对账月份">
          <el-date-picker v-model="initForm.statementMonth" type="month" value-format="yyyy-MM" style="width:100%" placeholder="选择月份" />
        </el-form-item>
        <el-form-item label="欠款金额">
          <el-input-number v-model="initForm.unpaidAmount" :precision="2" :controls="false" style="width:100%" />
        </el-form-item>
        <el-form-item label="开票金额">
          <el-input-number v-model="initForm.invoiceAmount" :precision="2" :controls="false" style="width:100%" />
        </el-form-item>
        <el-form-item label="开票日期">
          <el-date-picker v-model="initForm.invoiceDate" type="date" value-format="yyyy-MM-dd" style="width:100%" placeholder="可选" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="initForm.remark" maxlength="200" show-word-limit placeholder="如：历史初始化" />
        </el-form-item>
      </el-form>
      <span slot="footer" class="dialog-footer-actions">
        <el-button @click="initDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitInitHistory">保存</el-button>
      </span>
    </el-dialog>

    <el-dialog title="增加未对账订单" :visible.sync="unreconciledDialogVisible" width="1100px" top="6vh">
      <div v-loading="unreconciledLoading">
        <div class="unreconciled-search-row">
          <span class="search-label">订单号</span>
          <el-input
            v-model="unreconciledOrderNo"
            clearable
            size="small"
            placeholder="请输入订单号（支持模糊查询）"
            style="width: 320px"
            @keyup.enter.native="searchUnreconciledCandidates"
          />
          <el-button type="primary" size="small" icon="el-icon-search" @click="searchUnreconciledCandidates">查询未对账订单</el-button>
        </div>
        <div class="unreconciled-tip">
          可查询该客户截至 {{ unreconciledPeriodEnd || '-' }} 未进入任何对账月的送货明细；输入订单号后可精准筛选“未在 {{ queryForm.month }} 对账”的明细，再勾选插入 {{ queryForm.month }}。
        </div>
        <el-table
          ref="unreconciledTable"
          class="reconciliation-table"
          :data="unreconciledCandidates"
          border
          stripe
          style="width:100%"
          @selection-change="handleUnreconciledSelectionChange"
        >
          <el-table-column type="selection" width="50" />
          <el-table-column label="出货日期" width="110">
            <template slot-scope="scope">{{ formatShortDate(scope.row.bizDate) }}</template>
          </el-table-column>
          <el-table-column prop="orderNo" label="订单号" min-width="130" show-overflow-tooltip />
          <el-table-column prop="documentNo" label="送货单号" min-width="130" show-overflow-tooltip />
          <el-table-column prop="materialName" label="产品" min-width="150" show-overflow-tooltip />
          <el-table-column prop="spec" label="规格" min-width="150" show-overflow-tooltip />
          <el-table-column label="数量(R)" width="90" align="right">
            <template slot-scope="scope">{{ formatNumber(scope.row.quantity, 0) }}</template>
          </el-table-column>
          <el-table-column label="数量/m²" width="110" align="right">
            <template slot-scope="scope">{{ formatNumber(scope.row.areaSize) }}</template>
          </el-table-column>
        </el-table>
      </div>
      <span slot="footer" class="dialog-footer-actions">
        <el-button @click="unreconciledDialogVisible = false">关闭</el-button>
        <el-button
          type="primary"
          :loading="unreconciledSubmitting"
          :disabled="!selectedUnreconciledIds.length"
          @click="insertSelectedUnreconciled"
        >
          插入当月对账
        </el-button>
      </span>
    </el-dialog>

    <el-dialog title="拆分对账明细" :visible.sync="splitDialogVisible" width="460px">
      <el-form :model="splitForm" label-width="110px" size="small">
        <el-form-item label="送货单号">
          <el-input :value="splitSourceRow ? (splitSourceRow.documentNo || '-') : '-'" disabled />
        </el-form-item>
        <el-form-item label="订单号">
          <el-input :value="splitSourceRow ? (splitSourceRow.orderNo || '-') : '-'" disabled />
        </el-form-item>
        <el-form-item label="原始面积(㎡)">
          <el-input :value="formatNumber(splitSourceRow ? splitSourceRow.areaSize : 0)" disabled />
        </el-form-item>
        <el-form-item label="原始卷数(R)">
          <el-input :value="formatNumber(splitSourceRow ? splitSourceRow.quantity : 0, 0)" disabled />
        </el-form-item>
        <el-form-item label="拆分卷数(R)">
          <el-input-number
            v-model="splitForm.splitQuantity"
            :min="1"
            :max="getSplitQuantityMax()"
            :precision="0"
            :step="1"
            style="width:100%"
          />
        </el-form-item>
        <el-form-item label="新行对账月份">
          <el-date-picker
            v-model="splitForm.targetMonth"
            type="month"
            value-format="yyyy-MM"
            placeholder="选择月份"
            style="width:100%"
          />
        </el-form-item>
      </el-form>
      <span slot="footer" class="dialog-footer-actions">
        <el-button @click="splitDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitSplitRow">确认拆分</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import { getCustomerList } from '@/api/customer'
import {
  confirmSalesReconciliationDetails,
  deleteSalesReconciliationHistory,
  exportSalesReconciliationStatement,
  getSalesReconciliationOverview,
  getSalesReconciliationStatement,
  importSalesReconciliationHistory,
  initializeSalesReconciliationHistory,
  queryUnreconciledSalesReconciliationCandidates,
  rollbackSalesReconciliationFinanceConfirm,
  removeSalesReconciliationDetail,
  saveSalesReconciliationHistory
} from '@/api/salesReconciliation'
import request from '@/utils/request'

export default {
  name: 'SalesReconciliation',
  data() {
    return {
      customers: [],
      activeTab: 'detail',
      queryForm: {
        customerCode: '',
        month: this.getCurrentMonth(),
        reconciledStatus: '' // 新增：是否对账筛选
      },
      overviewLoading: false,
      overviewRows: [],
      overviewPager: {
        current: 1,
        size: 20,
        total: 0
      },
      overviewSort: {
        prop: 'reconciliationStatus',
        order: 'ascending'
      },
      statementLoaded: false,
      printVisible: false,
      initDialogVisible: false,
      unreconciledDialogVisible: false,
      unreconciledLoading: false,
      unreconciledSubmitting: false,
      unreconciledCandidates: [],
      unreconciledPeriodEnd: '',
      unreconciledOrderNo: '',
      selectedUnreconciledIds: [],
      splitDialogVisible: false,
      splitSourceRow: null,
      splitForm: {
        splitQuantity: null,
        targetMonth: ''
      },
      initForm: {
        statementMonth: this.getCurrentMonth(),
        unpaidAmount: 0,
        invoiceAmount: 0,
        invoiceDate: '',
        remark: '历史初始化'
      },
      companyInfo: {
        companyName: '东莞市方恩电子材料科技有限公司',
        address: '广东省东莞市桥头镇东新路13号2号楼102室',
        phone: '0769-82551118',
        fax: '0769-82551160',
        website: 'www.finechemfr.com',
        logoUrl: '/logo/finechem-logo.png'
      },
      statement: {
        customerCode: '',
        customerName: '',
        month: '',
        rpNaturalMonthLocked: false,
        reconciliationStatus: 'UNRECONCILED',
        reconciliationStatusLabel: '未对账',
        allDetailRows: [],
        detailRows: [],
        historyRows: [],
        printHistoryRows: [],
        summary: {
          totalRolls: 0,
          totalArea: 0,
          deliveryAmount: 0,
          returnAmount: 0,
          totalAmount: 0
        }
      }
    }
  },
  created() {
    this.fetchCustomers()
    this.fetchCompanyInfo()
  },
  methods: {
    getCurrentMonth() {
      const d = new Date()
      d.setMonth(d.getMonth() - 1)
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    },
    async fetchCustomers() {
      try {
        const res = await getCustomerList({ size: 1000 })
        if (res && (res.code === 200 || res.code === 20000)) {
          const data = res.data
          this.customers = (data && data.records) || (Array.isArray(data) ? data : [])
        }
      } catch (e) {}
    },
    async fetchCompanyInfo() {
      try {
        const res = await request({ url: '/config/company', method: 'get' })
        if (res && (res.code === 200 || res.code === 20000) && res.data) {
          this.companyInfo = Object.assign({}, this.companyInfo, res.data)
        }
      } catch (e) {
        console.error('加载公司信息失败', e)
      }
    },
    formatNumber(value, digits = 2) {
      if (value === null || value === undefined || value === '') return Number(0).toFixed(digits)
      const n = Number(value)
      return Number.isFinite(n) ? n.toFixed(digits) : Number(0).toFixed(digits)
    },
    formatShortDate(value) {
      if (!value) return ''
      const s = String(value).trim()
      const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
      if (m) return `${m[1].slice(2)}-${m[2]}-${m[3]}`
      return s
    },
    getHistoryTotalUnpaid() {
      return (this.statement.historyRows || []).reduce((sum, item) => sum + (Number(item.unpaidAmount) || 0), 0)
    },
    getHistoryTotalInvoice() {
      return (this.statement.historyRows || []).reduce((sum, item) => sum + (Number(item.invoiceAmount) || 0), 0)
    },
    getFinalPayableAmount() {
      const currentAmount = Number((this.statement.summary && this.statement.summary.totalAmount) || 0)
      return currentAmount + this.getHistoryTotalUnpaid() - this.getHistoryTotalInvoice()
    },
    hasMeaningfulHistoryInfo(row) {
      if (!row) return false
      const unpaidAmount = Number(row.unpaidAmount) || 0
      const invoiceAmount = Number(row.invoiceAmount) || 0
      const invoiceDate = String(row.invoiceDate || '').trim()
      const remark = String(row.remark || '').trim()
      return unpaidAmount !== 0 || invoiceAmount !== 0 || !!invoiceDate || !!remark
    },
    getPrintHistoryRows() {
      const printRows = this.statement.printHistoryRows || []
      const sourceRows = printRows.length ? printRows : (this.statement.historyRows || [])
      return sourceRows.filter(row => this.hasMeaningfulHistoryInfo(row))
    },
    async handleSearch() {
      if (!this.queryForm.month) return this.$message.warning('请选择月份')
      if (this.activeTab === 'overview') {
        this.overviewPager.current = 1
        await this.fetchOverview()
        return
      }
      if (!this.queryForm.customerCode) return this.$message.warning('请先选择客户')
      const res = await getSalesReconciliationStatement({ customerCode: this.queryForm.customerCode, month: this.queryForm.month })
      if (!res || (res.code !== 200 && res.code !== 20000)) {
        return this.$message.error((res && (res.msg || res.message)) || '查询失败')
      }
      const data = res.data || {}
      this.statement = Object.assign({}, this.statement, data)
      this.statement.rpNaturalMonthLocked = !!data.rpNaturalMonthLocked
      const allDetailRows = (data.detailRows || []).map(row => {
        const targetMonth = this.statement.rpNaturalMonthLocked
          ? this.queryForm.month
          : (row.reconcileTargetMonth || this.queryForm.month)
        return {
          ...row,
          reconcileTargetMonth: targetMonth,
          includeInCurrentStatement: this.statement.rpNaturalMonthLocked
            ? true
            : (row.includeInCurrentStatement !== false)
        }
      })
      // 仅展示当前对账月应纳入的明细；已调到下月或删除（顺延下月）的数据不再显示在当前月页面
      this.statement.allDetailRows = allDetailRows
      this.statement.detailRows = this.statement.rpNaturalMonthLocked
        ? allDetailRows
        : allDetailRows.filter(row => row.includeInCurrentStatement !== false)
      this.statement.historyRows = (data.historyRows || []).map(item => ({ ...item, _editing: false }))
      this.statement.printHistoryRows = data.printHistoryRows || []
      this.statement.summary = data.summary || this.statement.summary
      this.recomputeCurrentSummaryFromDetailRows()
      this.statement.reconciliationStatus = data.reconciliationStatus || 'UNRECONCILED'
      this.statement.reconciliationStatusLabel = data.reconciliationStatusLabel || '未对账'
      this.statementLoaded = true
    },
    async fetchOverview() {
      this.overviewLoading = true
      try {
        const res = await getSalesReconciliationOverview({
          month: this.queryForm.month,
          customerCode: this.queryForm.customerCode || '',
          reconciledStatus: this.queryForm.reconciledStatus || '',
          current: this.overviewPager.current,
          size: this.overviewPager.size,
          sortProp: this.overviewSort.prop,
          sortOrder: this.overviewSort.order
        })
        if (!res || (res.code !== 200 && res.code !== 20000)) {
          return this.$message.error((res && (res.msg || res.message)) || '查询总览失败')
        }
        const data = res.data || {}
        this.overviewRows = data.rows || data.records || []
        this.overviewPager.total = Number(data.total || 0)
        this.overviewPager.current = Number(data.current || this.overviewPager.current || 1)
        this.overviewPager.size = Number(data.size || this.overviewPager.size || 20)
      } finally {
        this.overviewLoading = false
      }
    },
    async handleTabChange() {
      if (!this.queryForm.month) return
      if (this.activeTab === 'overview') {
        await this.fetchOverview()
      }
    },
    getStatusTagType(status) {
      return status === 'RECONCILED' ? 'success' : 'danger'
    },
    isAdminUser() {
      const roles = (this.$store && this.$store.getters && this.$store.getters.roles) || []
      return Array.isArray(roles) && roles.includes('admin')
    },
    canAdminRollbackCurrentStatement() {
      if (!this.isAdminUser()) return false
      if (!this.statementLoaded) return false
      if (!this.queryForm.customerCode || !this.queryForm.month) return false
      return String(this.statement.reconciliationStatus || '') === 'RECONCILED'
    },
    async handleOverviewSortChange({ prop, order }) {
      this.overviewSort.prop = prop || 'reconciliationStatus'
      this.overviewSort.order = order || 'ascending'
      this.overviewPager.current = 1
      await this.fetchOverview()
    },
    async handleOverviewCurrentChange(page) {
      this.overviewPager.current = page || 1
      await this.fetchOverview()
    },
    calcOverviewIndex(index) {
      const current = Number(this.overviewPager.current || 1)
      const size = Number(this.overviewPager.size || 20)
      return (current - 1) * size + index + 1
    },
    async handleOverviewSizeChange(size) {
      this.overviewPager.size = size || 20
      this.overviewPager.current = 1
      await this.fetchOverview()
    },
    async goToReconciliation(row) {
      if (!row || !row.customerCode) {
        return this.$message.warning('客户信息缺失，无法跳转')
      }
      this.activeTab = 'detail'
      this.queryForm.customerCode = row.customerCode
      this.queryForm.month = row.month || this.queryForm.month
      await this.handleSearch()
    },
    handleReset() {
      this.queryForm = { customerCode: '', month: this.getCurrentMonth() }
      this.overviewRows = []
      this.overviewLoading = false
      this.overviewPager = { current: 1, size: 20, total: 0 }
      this.overviewSort = { prop: 'reconciliationStatus', order: 'ascending' }
      this.statementLoaded = false
      this.initDialogVisible = false
      this.statement = {
        customerCode: '',
        customerName: '',
        month: '',
        rpNaturalMonthLocked: false,
        reconciliationStatus: 'UNRECONCILED',
        reconciliationStatusLabel: '未对账',
        allDetailRows: [],
        detailRows: [],
        historyRows: [],
        printHistoryRows: [],
        summary: {
          totalRolls: 0,
          totalArea: 0,
          deliveryAmount: 0,
          returnAmount: 0,
          totalAmount: 0
        }
      }
      this.initForm = {
        statementMonth: this.getCurrentMonth(),
        unpaidAmount: 0,
        invoiceAmount: 0,
        invoiceDate: '',
        remark: '历史初始化'
      }
    },
    triggerImportHistory() {
      if (this.queryForm.customerCode) {
        this.$message.info('当前为单客户导入：支持CSV与宽表Excel')
      } else {
        this.$message.info('当前为全表导入：请上传原始宽表Excel（不选客户时不支持CSV）')
      }
      if (this.$refs.historyImportFile) {
        this.$refs.historyImportFile.value = ''
        this.$refs.historyImportFile.click()
      }
    },
    async handleImportHistoryChange(event) {
      const file = event && event.target && event.target.files && event.target.files[0]
      if (!file) return
      try {
        const res = await importSalesReconciliationHistory(this.queryForm.customerCode || '', file)
        if (!res || (res.code !== 200 && res.code !== 20000)) {
          return this.$message.error((res && (res.msg || res.message)) || '导入失败')
        }
        const data = res.data || {}
        this.$message.success(`导入完成：成功${data.successCount || 0}，跳过${data.skipCount || 0}`)
        if (this.statementLoaded) {
          await this.handleSearch()
        }
      } catch (e) {
        this.$message.error((e && e.message) || '导入失败')
      }
    },
    async handleExport() {
      if (!this.queryForm.customerCode || !this.queryForm.month) {
        return this.$message.warning('请先选择客户和月份')
      }
      try {
        const blob = await exportSalesReconciliationStatement({
          customerCode: this.queryForm.customerCode,
          month: this.queryForm.month
        })
        const url = window.URL.createObjectURL(new Blob([blob], { type: 'text/csv;charset=utf-8;' }))
        const link = document.createElement('a')
        link.href = url
        link.download = `销售对账单_${this.queryForm.customerCode}_${this.queryForm.month}.csv`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
      } catch (e) {
        this.$message.error('导出失败')
      }
    },
    openInitDialog() {
      if (!this.queryForm.customerCode) {
        return this.$message.warning('请先选择客户')
      }
      this.initForm = {
        statementMonth: this.queryForm.month || this.getCurrentMonth(),
        unpaidAmount: 0,
        invoiceAmount: 0,
        invoiceDate: '',
        remark: '历史初始化'
      }
      this.initDialogVisible = true
    },
    async submitInitHistory() {
      if (!this.queryForm.customerCode) {
        return this.$message.warning('请先选择客户')
      }
      if (!this.initForm.statementMonth) {
        return this.$message.warning('请选择对账月份')
      }
      const payload = {
        customerCode: this.queryForm.customerCode,
        statementMonth: this.initForm.statementMonth,
        unpaidAmount: Number(this.initForm.unpaidAmount) || 0,
        invoiceAmount: Number(this.initForm.invoiceAmount) || 0,
        invoiceDate: this.initForm.invoiceDate || null,
        remark: this.initForm.remark || '历史初始化'
      }
      const res = await initializeSalesReconciliationHistory(payload)
      if (!res || (res.code !== 200 && res.code !== 20000)) {
        return this.$message.error((res && (res.msg || res.message)) || '初始化失败')
      }
      this.$message.success('历史初始化成功')
      this.initDialogVisible = false
      if (this.statementLoaded) {
        await this.handleSearch()
      }
    },
    addHistoryRow() {
      if (!this.queryForm.customerCode) return this.$message.warning('请先选择客户')
      this.statement.historyRows.unshift({
        customerCode: this.queryForm.customerCode,
        statementMonth: this.queryForm.month,
        unpaidAmount: 0,
        invoiceAmount: 0,
        invoiceDate: '',
        remark: '',
        _editing: true
      })
    },
    editHistoryRow(row) {
      this.$set(row, '_editing', true)
    },
    async saveHistoryRow(row) {
      if (!this.queryForm.customerCode) return this.$message.warning('请先选择客户')
      if (!row.statementMonth) return this.$message.warning('请填写对账月份')
      const payload = {
        ...row,
        customerCode: this.queryForm.customerCode,
        unpaidAmount: Number(row.unpaidAmount) || 0,
        invoiceAmount: Number(row.invoiceAmount) || 0
      }
      const res = await saveSalesReconciliationHistory(payload)
      if (!res || (res.code !== 200 && res.code !== 20000)) {
        return this.$message.error((res && (res.msg || res.message)) || '保存失败')
      }
      this.$message.success('保存成功')
      if (res.data && res.data.id) {
        row.id = res.data.id
      }
      this.$set(row, '_editing', false)
      await this.handleSearch()
    },
    async deleteHistoryRow(row, index) {
      if (!row.id) {
        this.statement.historyRows.splice(index, 1)
        return
      }
      await this.$confirm('确认删除该历史记录吗？', '提示', { type: 'warning' }).then(async() => {
        const res = await deleteSalesReconciliationHistory(row.id)
        if (res && (res.code === 200 || res.code === 20000)) {
          this.$message.success('删除成功')
          this.handleSearch()
        }
      }).catch(() => {})
    },
    openPrintPreview() {
      if (!this.statementLoaded) return this.$message.warning('请先查询对账单')
      this.printVisible = true
    },
    getNextMonth(month) {
      if (!month || !/^\d{4}-\d{2}$/.test(month)) return month
      const [y, m] = month.split('-').map(Number)
      const d = new Date(y, m - 1, 1)
      d.setMonth(d.getMonth() + 1)
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    },
    openSplitDialog(row) {
      if (this.statement.rpNaturalMonthLocked) {
        return this.$message.warning('RP客户固定自然月，不支持拆分到下月')
      }
      if (!row || row.bizType !== 'delivery') {
        return this.$message.warning('仅发货明细支持拆分')
      }
      const quantity = Math.abs(Math.round(Number(row.quantity) || 0))
      if (quantity <= 1) {
        return this.$message.warning('该行卷数不足2卷，无法拆分')
      }
      this.splitSourceRow = row
      this.splitForm = {
        splitQuantity: Math.max(1, Math.floor(quantity / 2)),
        targetMonth: this.getNextMonth(this.queryForm.month)
      }
      this.splitDialogVisible = true
    },
    getSplitQuantityMax() {
      const row = this.splitSourceRow
      const quantity = Math.abs(Math.round(Number(row && row.quantity) || 0))
      if (quantity <= 1) return 1
      return quantity - 1
    },
    submitSplitRow() {
      const row = this.splitSourceRow
      if (!row) {
        return this.$message.warning('未找到待拆分行')
      }
      const totalQuantity = Math.abs(Math.round(Number(row.quantity) || 0))
      const splitQuantity = Math.round(Number(this.splitForm.splitQuantity) || 0)
      if (!Number.isFinite(splitQuantity) || splitQuantity <= 0) {
        return this.$message.warning('请输入有效的拆分卷数')
      }
      if (splitQuantity >= totalQuantity) {
        return this.$message.warning('拆分卷数必须小于原始卷数')
      }
      if (!this.splitForm.targetMonth || !/^\d{4}-\d{2}$/.test(this.splitForm.targetMonth)) {
        return this.$message.warning('请选择新行对账月份')
      }
      if (row._splitPairId) {
        this.restoreSplitRow(row, true)
      }

      const originalQuantity = Number(row.quantity) || 0
      const originalArea = Number(row.areaSize) || 0
      const originalAmount = Number(row.amount) || 0
      const ratio = splitQuantity / Math.abs(originalQuantity || totalQuantity)

      const childQuantity = Number((Math.sign(originalQuantity || 1) * splitQuantity).toFixed(0))
      const childArea = Number((originalArea * ratio).toFixed(2))
      const childAmount = Number((originalAmount * ratio).toFixed(2))

      const remainQuantity = Number((originalQuantity - childQuantity).toFixed(0))
      const remainArea = Number((originalArea - childArea).toFixed(2))
      const remainAmount = Number((originalAmount - childAmount).toFixed(2))

      const pairId = `split_${Date.now()}_${Math.floor(Math.random() * 10000)}`
      const targetMonth = this.splitForm.targetMonth
      const includeInCurrent = targetMonth === this.queryForm.month
      const childRow = {
        ...row,
        _splitPairId: pairId,
        _isSplitChild: true,
        _splitFromNoticeItemId: row.noticeItemId || null,
        reconcileTargetMonth: targetMonth,
        includeInCurrentStatement: includeInCurrent,
        quantity: childQuantity,
        areaSize: childArea,
        amount: childAmount
      }

      this.$set(row, '_splitPairId', pairId)
      this.$set(row, '_isSplitChild', false)
      this.$set(row, '_splitFromNoticeItemId', row.noticeItemId || null)
      this.$set(row, 'includeInCurrentStatement', true)
      this.$set(row, 'quantity', remainQuantity)
      this.$set(row, 'areaSize', remainArea)
      this.$set(row, 'amount', remainAmount)

      const allRows = this.statement.allDetailRows || []
      const allIdx = allRows.findIndex(item => item === row)
      if (allIdx >= 0) {
        allRows.splice(allIdx + 1, 0, childRow)
      } else {
        allRows.push(childRow)
      }
      this.refreshCurrentMonthDetailRows()

      this.splitDialogVisible = false
      this.$message.success(includeInCurrent ? '拆分成功，可分别选择两行的对账月份' : '拆分成功，拆分到下月的明细已从本月隐藏')
    },
    restoreSplitRow(row, silent = false) {
      if (!row || !row._splitPairId) return
      const pairId = row._splitPairId
      const pairRows = (this.statement.allDetailRows || []).filter(item => item && item._splitPairId === pairId)
      if (pairRows.length < 2) {
        if (!silent) {
          this.$message.warning('未找到可还原的拆分数据')
        }
        return
      }
      const keepRow = pairRows.find(item => !item._isSplitChild) || pairRows[0]
      const mergedQuantity = pairRows.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)
      const mergedArea = pairRows.reduce((sum, item) => sum + (Number(item.areaSize) || 0), 0)
      const mergedAmount = pairRows.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)

      this.$set(keepRow, 'quantity', Number(mergedQuantity.toFixed(0)))
      this.$set(keepRow, 'areaSize', Number(mergedArea.toFixed(2)))
      this.$set(keepRow, 'amount', Number(mergedAmount.toFixed(2)))
      this.$set(keepRow, 'includeInCurrentStatement', true)
      this.$delete(keepRow, '_splitPairId')
      this.$delete(keepRow, '_isSplitChild')
      this.$delete(keepRow, '_splitFromNoticeItemId')

      this.statement.allDetailRows = (this.statement.allDetailRows || []).filter(item => {
        if (!item || item._splitPairId !== pairId) return true
        return item === keepRow
      })
      this.refreshCurrentMonthDetailRows()

      if (!silent) {
        this.$message.success('已还原拆分行')
      }
    },
    handleDetailTargetMonthChange(row) {
      if (!row || row.bizType !== 'delivery') return
      if (this.statement.rpNaturalMonthLocked) {
        this.$set(row, 'reconcileTargetMonth', this.queryForm.month)
        this.$set(row, 'includeInCurrentStatement', true)
        this.refreshCurrentMonthDetailRows()
        return
      }
      const targetMonth = (row.reconcileTargetMonth || this.queryForm.month || '').trim()
      this.$set(row, 'includeInCurrentStatement', targetMonth === this.queryForm.month)
      this.refreshCurrentMonthDetailRows()
    },
    refreshCurrentMonthDetailRows() {
      this.statement.detailRows = (this.statement.allDetailRows || []).filter(item => item && item.includeInCurrentStatement !== false)
      this.recomputeCurrentSummaryFromDetailRows()
    },
    recomputeCurrentSummaryFromDetailRows() {
      const rows = this.statement.detailRows || []
      let totalRolls = 0
      let totalArea = 0
      let totalAmount = 0
      let deliveryAmount = 0
      let returnAmount = 0

      rows.forEach(row => {
        const rolls = Number(row.quantity) || 0
        const area = Number(row.areaSize) || 0
        const amount = Number(row.amount) || 0
        totalRolls += rolls
        totalArea += area
        totalAmount += amount
        if (row.bizType === 'return') {
          returnAmount += amount
        } else {
          deliveryAmount += amount
        }
      })

      this.statement.summary = Object.assign({}, this.statement.summary || {}, {
        totalRolls: Number(totalRolls.toFixed(2)),
        totalArea: Number(totalArea.toFixed(2)),
        totalAmount: Number(totalAmount.toFixed(2)),
        deliveryAmount: Number(deliveryAmount.toFixed(2)),
        returnAmount: Number(returnAmount.toFixed(2))
      })
    },
    buildDetailConfirmPayload() {
      const detailsMap = new Map()
      ;(this.statement.allDetailRows || [])
        .filter(row => row.bizType === 'delivery' && row.noticeItemId)
        .forEach(row => {
          const targetMonth = this.statement.rpNaturalMonthLocked
            ? this.queryForm.month
            : (row.reconcileTargetMonth || this.queryForm.month)
          const dedupKey = `${row.noticeItemId}_${targetMonth}`
          if (!detailsMap.has(dedupKey)) {
            detailsMap.set(dedupKey, {
              noticeItemId: row.noticeItemId,
              targetMonth,
              splitQuantity: Number(row.quantity) || 0,
              splitArea: Number(row.areaSize) || 0,
              splitAmount: Number(row.amount) || 0
            })
          } else {
            const existing = detailsMap.get(dedupKey)
            existing.splitQuantity = Number(existing.splitQuantity || 0) + (Number(row.quantity) || 0)
            existing.splitArea = Number(existing.splitArea || 0) + (Number(row.areaSize) || 0)
            existing.splitAmount = Number(existing.splitAmount || 0) + (Number(row.amount) || 0)
          }
        })
      const details = Array.from(detailsMap.values())
      return {
        customerCode: this.queryForm.customerCode,
        month: this.queryForm.month,
        details
      }
    },
    async confirmCurrentStatement() {
      if (!this.queryForm.customerCode || !this.queryForm.month) {
        return this.$message.warning('请先选择客户和月份')
      }
      const payload = this.buildDetailConfirmPayload()
      const res = await confirmSalesReconciliationDetails(payload)
      if (!res || (res.code !== 200 && res.code !== 20000)) {
        return this.$message.error((res && (res.msg || res.message)) || '确认失败')
      }
      this.$message.success('对账确认成功')
      await this.handleSearch()
    },
    async rollbackCurrentStatementByAdmin() {
      if (!this.isAdminUser()) {
        return this.$message.warning('仅管理员可执行回退')
      }
      if (!this.queryForm.customerCode || !this.queryForm.month) {
        return this.$message.warning('请先选择客户和月份')
      }
      if (String(this.statement.reconciliationStatus || '') !== 'RECONCILED') {
        return this.$message.warning('当前未处于财务确认状态，无需回退')
      }

      await this.$confirm('回退后将撤销财务确认，销售可重新对账，是否继续？', '管理员回退确认', { type: 'warning' }).then(async() => {
        const res = await rollbackSalesReconciliationFinanceConfirm({
          customerCode: this.queryForm.customerCode,
          month: this.queryForm.month
        })
        if (!res || (res.code !== 200 && res.code !== 20000)) {
          return this.$message.error((res && (res.msg || res.message)) || '回退失败')
        }
        this.$message.success('回退成功，销售可重新对账')
        await this.handleSearch()
      }).catch(() => {})
    },
    async openUnreconciledDialog() {
      if (!this.queryForm.customerCode || !this.queryForm.month) {
        return this.$message.warning('请先选择客户和月份')
      }
      this.unreconciledDialogVisible = true
      this.unreconciledCandidates = []
      this.unreconciledPeriodEnd = ''
      this.unreconciledOrderNo = ''
      this.selectedUnreconciledIds = []
      await this.searchUnreconciledCandidates()
    },
    async searchUnreconciledCandidates() {
      this.unreconciledLoading = true
      try {
        const res = await queryUnreconciledSalesReconciliationCandidates({
          customerCode: this.queryForm.customerCode,
          month: this.queryForm.month,
          orderNo: this.unreconciledOrderNo || ''
        })
        if (!res || (res.code !== 200 && res.code !== 20000)) {
          return this.$message.error((res && (res.msg || res.message)) || '查询失败')
        }
        const data = res.data || {}
        this.unreconciledCandidates = data.rows || []
        this.unreconciledPeriodEnd = data.periodEnd || ''
        this.selectedUnreconciledIds = []
        if (!this.unreconciledCandidates.length && data.hint) {
          this.$message.warning(data.hint)
        }
      } finally {
        this.unreconciledLoading = false
      }
    },
    handleUnreconciledSelectionChange(rows) {
      this.selectedUnreconciledIds = (rows || []).map(item => item.noticeItemId).filter(Boolean)
    },
    async insertSelectedUnreconciled() {
      if (!this.selectedUnreconciledIds.length) {
        return this.$message.warning('请先勾选要插入的明细')
      }
      this.unreconciledSubmitting = true
      try {
        const payload = {
          customerCode: this.queryForm.customerCode,
          month: this.queryForm.month,
          details: this.selectedUnreconciledIds.map(id => ({ noticeItemId: id, targetMonth: this.queryForm.month }))
        }
        const res = await confirmSalesReconciliationDetails(payload)
        if (!res || (res.code !== 200 && res.code !== 20000)) {
          return this.$message.error((res && (res.msg || res.message)) || '插入失败')
        }
        this.$message.success(`已插入 ${this.selectedUnreconciledIds.length} 条到当月对账`)
        this.unreconciledDialogVisible = false
        await this.handleSearch()
      } finally {
        this.unreconciledSubmitting = false
      }
    },
    async removeDetailRow(row) {
      if (this.statement.rpNaturalMonthLocked) {
        return this.$message.warning('RP客户固定自然月，不支持顺延到下月删除')
      }
      const isDelivery = row && row.bizType === 'delivery'
      const isReturn = row && row.bizType === 'return'
      const detailId = isDelivery ? row.noticeItemId : (isReturn ? row.returnItemId : null)
      if (!row || !detailId) {
        return this.$message.warning('该行不支持删除')
      }
      await this.$confirm('删除后该明细将顺延到下月对账，是否继续？', '提示', { type: 'warning' }).then(async() => {
        const res = await removeSalesReconciliationDetail({
          detailId,
          bizType: row.bizType,
          customerCode: this.queryForm.customerCode,
          month: this.queryForm.month
        })
        if (!res || (res.code !== 200 && res.code !== 20000)) {
          return this.$message.error((res && (res.msg || res.message)) || '删除失败')
        }
        this.$message.success('删除成功，已顺延到下月')
        await this.handleSearch()
      }).catch(() => {})
    },
    handlePrintBrowser() {
      const area = document.getElementById('reconciliationPrintArea')
      if (!area) return this.$message.warning('未找到打印内容')
      const iframe = document.createElement('iframe')
      iframe.setAttribute('style', 'position:absolute;width:0;height:0;left:-1000px;top:-1000px;')
      document.body.appendChild(iframe)
      const doc = iframe.contentWindow.document
      doc.write(`
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              * { box-sizing: border-box; }
              body { font-family: "Microsoft YaHei", Arial, sans-serif; margin: 0; padding: 12mm; color: #000; }
              .print-company-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px; }
              .print-logo { width:180px; height:auto; }
              .print-company-info { text-align:right; font-size:12px; line-height:1.6; }
              .company-name { font-weight:700; font-size:18px; }
              .print-title { text-align:center; font-size:22px; font-weight:700; margin:10px 0; }
              .print-meta-line,.print-subtitle,.print-footer-note { font-size:12px; margin-bottom:8px; }
              .print-table { width:100%; border-collapse:collapse; margin-bottom:12px; table-layout:fixed; }
              .print-table th,.print-table td { border:1px solid #000; padding:5px 4px; font-size:11px; text-align:center; word-break:break-all; }
              .print-table th { background:#f1f1f1; }
              .print-total { text-align:right; font-size:12px; font-weight:700; margin-bottom:12px; }
              .print-signature { margin-top:24px; display:flex; justify-content:space-between; font-size:12px; }
              @page { size: A4 portrait; margin: 10mm; }
            </style>
          </head>
          <body>${area.innerHTML}</body>
        </html>
      `)
      doc.close()
      setTimeout(() => {
        iframe.contentWindow.focus()
        iframe.contentWindow.print()
        setTimeout(() => document.body.removeChild(iframe), 1000)
      }, 300)
    }
  }
}
</script>

<style scoped>
.sales-reconciliation { padding: 20px; }
.page-header { display:flex; justify-content:space-between; align-items:center; }
.card-title { font-size:16px; font-weight:600; }
.search-area { margin-bottom: 16px; padding: 14px 16px; background:#f8fafc; border:1px solid #ebeef5; border-radius:10px; }
.search-item { display:flex; align-items:center; gap:10px; }
.search-label { flex: 0 0 40px; color:#606266; font-size:13px; }
.status-label { flex-basis: 52px; }
.reconciliation-tabs { margin-top: 4px; }
.summary-grid { display:grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap:12px; margin-bottom:16px; }
.summary-card { padding:14px 16px; border:1px solid #ebeef5; border-radius:10px; background:#fff; }
.summary-label { color:#909399; font-size:12px; margin-bottom:6px; }
.summary-value { color:#303133; font-size:18px; font-weight:600; }
.primary-card { background:#f4f8ff; border-color:#d9ecff; }
.warning-card { background:#fff7ed; border-color:#fed7aa; }
.section-block { margin-top: 16px; }
.section-head { display:flex; justify-content:space-between; align-items:center; margin-bottom: 10px; }
.section-head-actions { display:flex; align-items:center; gap:8px; }
.section-title { font-size:14px; font-weight:600; color:#303133; margin-bottom:10px; }
.reconciliation-table { border:1px solid #ebeef5; border-radius:8px; overflow:hidden; }
.reconciliation-table /deep/ th.el-table__cell { background:#f5f7fa; color:#606266; font-weight:600; }
.reconciliation-table /deep/ .el-table__row td.el-table__cell { padding-top:10px; padding-bottom:10px; }
.history-summary { margin-top: 10px; display:flex; justify-content:flex-end; gap:24px; color:#606266; font-size:13px; }
.payable-amount { color:#f56c6c; font-weight:600; }
.op-btns { display:flex; justify-content:center; gap:12px; }
.op-danger, .negative-amount { color:#f56c6c; }
.dialog-footer-actions { display:flex; justify-content:flex-end; gap:10px; }
.print-sheet { padding: 8px; color:#000; }
.print-company-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px; }
.print-logo { width: 180px; height:auto; }
.print-company-info { text-align:right; font-size:12px; line-height:1.6; }
.company-name { font-size:18px; font-weight:700; }
.print-title { text-align:center; font-size:22px; font-weight:700; margin:8px 0 10px; }
.print-meta-line,.print-subtitle,.print-footer-note { font-size:12px; margin-bottom:8px; }
.print-table { width:100%; border-collapse:collapse; table-layout:fixed; margin-bottom:12px; }
.print-table th,.print-table td { border:1px solid #000; padding:5px 4px; font-size:11px; text-align:center; word-break:break-all; }
.print-table th { background:#f1f1f1; }
.print-total { text-align:right; font-size:12px; font-weight:700; margin-bottom:12px; }
.print-signature { margin-top:24px; display:flex; justify-content:space-between; font-size:12px; }
.unreconciled-search-row { display:flex; align-items:center; gap:10px; margin-bottom:10px; }
.unreconciled-tip { margin-bottom:10px; color:#606266; font-size:13px; }
.overview-pagination { margin-top: 12px; display: flex; justify-content: flex-end; }
</style>
