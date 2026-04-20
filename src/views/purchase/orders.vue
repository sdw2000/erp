<template>
  <div class="purchase-orders">
    <el-card>
      <div slot="header" class="clearfix">
        <span>采购订单</span>
        <div style="float:right">
          <el-button v-if="$canImportExport()" type="success" icon="el-icon-download" size="small" @click="handleDownloadTemplate">下载模板</el-button>
          <el-button v-if="$canImportExport()" type="warning" icon="el-icon-upload2" size="small" @click="triggerImport">导入</el-button>
          <el-button v-if="$canImportExport()" type="info" icon="el-icon-download" size="small" @click="handleExport">导出</el-button>
          <el-button type="primary" icon="el-icon-plus" size="small" @click="openCreate">新增采购单</el-button>
          <input ref="importFile" type="file" accept=".xlsx,.xls" style="display:none" @change="handleImportChange">
        </div>
      </div>

      <div class="search-area">
        <el-row :gutter="16">
          <el-col :span="6">
            <el-input v-model="searchForm.supplier" placeholder="供应商名称/代码/简称" clearable size="small" @keyup.enter.native="handleSearch" @clear="handleSearch" />
          </el-col>
          <el-col :span="6">
            <el-input v-model="searchForm.orderNo" placeholder="采购单号" clearable size="small" @keyup.enter.native="handleSearch" @clear="handleSearch" />
          </el-col>
          <el-col :span="4">
            <el-select v-model="searchForm.reconciliationStatus" placeholder="对账状态" clearable size="small" style="width:100%" @change="handleSearch">
              <el-option
                v-for="item in reconciliationOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-col>
          <el-col :span="5">
            <el-date-picker v-model="searchForm.startDate" type="date" placeholder="下单日期起" value-format="yyyy-MM-dd" size="small" style="width:100%" @change="handleSearch" />
          </el-col>
          <el-col :span="5">
            <el-date-picker v-model="searchForm.endDate" type="date" placeholder="下单日期止" value-format="yyyy-MM-dd" size="small" style="width:100%" @change="handleSearch" />
          </el-col>
          <el-col :span="2" class="search-actions">
            <el-button type="primary" icon="el-icon-search" size="small" @click="handleSearch">搜索</el-button>
            <el-button icon="el-icon-refresh" size="small" @click="handleReset">重置</el-button>
          </el-col>
        </el-row>
      </div>

      <el-table v-loading="loading" class="orders-table" :data="orders" style="width:100%" stripe>
        <el-table-column type="index" label="序号" width="60" align="center" />
        <el-table-column label="供应商" width="180">
          <template slot-scope="scope">
            {{ getOrderSupplierShortName(scope.row) }}
          </template>
        </el-table-column>
        <el-table-column prop="orderNo" label="采购单号" width="208" class-name="order-no-col" />
        <el-table-column prop="supplierOrderNo" label="供应商单号" width="160" />
        <el-table-column label="对账状态" width="110">
          <template slot-scope="scope">
            <el-tag :type="reconciliationTag(scope.row.reconciliationStatus)" size="small">
              {{ reconciliationText(scope.row.reconciliationStatus) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="totalAmount" label="总金额" width="108" class-name="amount-col" />
        <el-table-column prop="totalArea" label="总数量" width="108" class-name="area-col" />
        <el-table-column prop="orderDate" label="下单日期" width="140" />
        <el-table-column prop="deliveryDate" label="交货日期" width="140" />
        <el-table-column label="操作" width="320">
          <template slot-scope="scope">
            <el-button size="mini" @click="viewDetail(scope.row)">详情</el-button>
            <el-button size="mini" type="warning" @click="openReconciliation(scope.row)">对账</el-button>
            <el-button size="mini" type="success" @click="printOrder(scope.row)">打印</el-button>
            <el-button size="mini" type="primary" @click="openEdit(scope.row)">编辑</el-button>
            <el-button size="mini" type="danger" @click="confirmDelete(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="orders-pagination-wrapper">
        <el-pagination
          :current-page.sync="pagination.pageNum"
          :page-size="pagination.pageSize"
          :page-sizes="[5,10,20,50]"
          layout="sizes, prev, pager, next, jumper, ->, total"
          :total="Number(pagination.total)"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>

      <el-dialog title="采购订单打印预览" :visible.sync="printVisible" width="auto" top="1vh" custom-class="purchase-print-dialog">
        <div class="purchase-print-preview-wrap">
          <div v-if="currentPrint" id="purchasePrintArea" class="purchase-print-sheet">
          <div class="purchase-print-header">
            <div class="purchase-print-header-top">
              <div class="purchase-logo-wrap">
                <img v-if="printLogoUrl" :src="printLogoUrl" alt="company-logo" class="purchase-print-logo">
              </div>
              <div class="purchase-company-info">
                <div class="purchase-company-name">{{ companyInfo.companyName }}</div>
                <div>地址：{{ companyInfo.address }}</div>
                <div>电话：{{ companyInfo.phone }}  传真：{{ companyInfo.fax }}</div>
                <div>{{ companyInfo.website }}</div>
              </div>
            </div>
          </div>

          <div class="purchase-print-title">采购订单</div>

          <div class="purchase-print-meta">
            <div>单号：{{ currentPrint.orderNo || '' }}</div>
            <div>订单日期：{{ formatPurchasePrintDate(currentPrint.orderDate) }}</div>
          </div>
          <div class="purchase-print-supplier-row">
            <span>供应商：{{ getPurchasePrintSupplierName() }}</span>
          </div>

          <table class="purchase-print-table">
            <colgroup>
              <col :style="printColStyle('code')">
              <col :style="printColStyle('name')">
              <col :style="printColStyle('spec')">
              <col :style="printColStyle('unit')">
              <col v-if="shouldShowFilmDimensionColumns()" :style="printFilmDimensionColStyle()">
              <col v-if="shouldShowFilmDimensionColumns()" :style="printFilmDimensionColStyle()">
              <col v-if="shouldShowPrintRollColumn()" :style="printColStyle('roll')">
              <col v-if="shouldShowPurchasePrintQuantityColumn()" :style="printColStyle('qty')">
              <col :style="printColStyle('price')">
              <col :style="printColStyle('amount')">
              <col :style="printColStyle('date')">
            </colgroup>
            <thead>
              <tr>
                <th :style="printColStyle('code')">物料编码</th>
                <th :style="printColStyle('name')">物料名称</th>
                <th :style="printColStyle('spec')">{{ getPurchasePrintSpecHeaderLabel() }}</th>
                <th :style="printColStyle('unit')">单位</th>
                <th v-if="shouldShowFilmDimensionColumns()" :style="printFilmDimensionColStyle()">宽/mm</th>
                <th v-if="shouldShowFilmDimensionColumns()" :style="printFilmDimensionColStyle()">长/m</th>
                <th v-if="shouldShowPrintRollColumn()" :style="printColStyle('roll')">{{ getPurchasePrintRollHeaderLabel() }}</th>
                <th v-if="shouldShowPurchasePrintQuantityColumn()" :style="printColStyle('qty')">数量/㎡</th>
                <th :style="printColStyle('price')">{{ getPurchasePrintPriceHeaderLabel() }}</th>
                <th :style="printColStyle('amount')">{{ getPurchasePrintAmountHeaderLabel() }}</th>
                <th :style="printColStyle('date')">到货日期</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, index) in getPurchasePrintRows()" :key="`print-${index}`">
                <td>{{ item.materialCode || '' }}</td>
                <td class="text-left">{{ item.materialName || '' }}</td>
                <td class="text-left">{{ getPurchasePrintSpec(item) }}</td>
                <td>{{ getPurchasePrintUnit(item) }}</td>
                <td v-if="shouldShowFilmDimensionColumns()">{{ isPurchaseFilmItem(item) ? (item.width || '') : '' }}</td>
                <td v-if="shouldShowFilmDimensionColumns()">{{ isPurchaseFilmItem(item) ? (item.lengthDisplay || item.length || '') : '' }}</td>
                <td v-if="shouldShowPrintRollColumn()">{{ getPurchasePrintRollValue(item) }}</td>
                <td v-if="shouldShowPurchasePrintQuantityColumn()">{{ getPurchasePrintQuantity(item) }}</td>
                <td>{{ formatPurchaseMoney(item.unitPrice) }}</td>
                <td>{{ formatPurchaseMoney(getPurchasePrintAmount(item)) }}</td>
                <td>{{ formatPurchasePrintDate(currentPrint.deliveryDate) }}</td>
              </tr>
              <tr class="purchase-print-total-row">
                <template v-if="shouldShowFilmDimensionColumns() && shouldShowPurchasePrintQuantityColumn()">
                  <td colspan="7" class="text-right">{{ getPurchasePrintTotalQtyLabel() }}</td>
                  <td>{{ formatPurchaseMoney(getPurchasePrintTotalQty()) }}</td>
                  <td class="text-right">金额：</td>
                  <td>{{ formatPurchaseMoney(getPurchasePrintTotalAmount()) }}</td>
                  <td />
                </template>
                <template v-else-if="isCountPrintTemplate()">
                  <td colspan="4" class="text-right">{{ getPurchasePrintTotalQtyLabel() }}</td>
                  <td>{{ formatPurchaseMoney(getPurchasePrintTotalQty()) }}</td>
                  <td class="text-right">金额：</td>
                  <td>{{ formatPurchaseMoney(getPurchasePrintTotalAmount()) }}</td>
                  <td />
                </template>
                <template v-else-if="isChemicalPrintTemplate()">
                  <td colspan="5" class="text-right">{{ getPurchasePrintTotalQtyLabel() }}</td>
                  <td>{{ formatPurchaseMoney(getPurchasePrintTotalQty()) }}</td>
                  <td class="text-right">金额：</td>
                  <td>{{ formatPurchaseMoney(getPurchasePrintTotalAmount()) }}</td>
                  <td />
                </template>
                <template v-else>
                  <td colspan="4" class="text-right">{{ getPurchasePrintTotalQtyLabel() }}</td>
                  <td>{{ formatPurchaseMoney(getPurchasePrintTotalQty()) }}</td>
                  <td class="text-right">金额：</td>
                  <td>{{ formatPurchaseMoney(getPurchasePrintTotalAmount()) }}</td>
                  <td />
                </template>
              </tr>
              <tr class="purchase-print-remark-row">
                <td :colspan="getPurchasePrintColumnCount()" class="text-left">备注：{{ getPurchasePrintHeaderRemark() || purchasePrintDefaultRemark }}</td>
              </tr>
            </tbody>
          </table>

          <div class="purchase-print-terms">
            <div>一.质量标准：按供方提供的样品和参数。</div>
            <div>二.问题处理：供方产品如有品质问题，应在需方提出后的三天内补发合格货物，并作出相应补偿，具体以双方协商的处理方式为准。</div>
            <div>三.运输方式及费用负担：由供方负责运输及相关费用。</div>
            <div>四.结算方式：{{ getPurchaseSettlementText(currentPrint) }}。</div>
            <div>五.本合同一式两份，双方各执一份。订单请于下达后的24小时内盖章回传。</div>
            <div>六.争议解决：对于本合同执行过程中产生的争议，由双方友好协商解决。</div>
          </div>

          <div class="purchase-print-signature">
            <div>制单人：{{ currentPrint.createdBy || '' }}</div>
            <div>审批人：{{ currentPrint.updatedBy || currentPrint.approvedBy || '' }}</div>
            <div>确认人：</div>
          </div>
          <div class="purchase-print-footer">第1页 共1页</div>
          </div>
        </div>
        <span slot="footer">
          <el-button @click="printVisible = false">关闭</el-button>
          <el-button type="primary" icon="el-icon-printer" @click="handlePrintBrowser">打印单据 / 导出PDF</el-button>
        </span>
      </el-dialog>

      <el-dialog title="采购单详情" :visible.sync="detailVisible" width="1100px">
        <div v-if="currentOrder">
          <p><strong>供应商：</strong>{{ getOrderSupplierFullName(currentOrder) }} &nbsp;&nbsp; <strong>采购单号：</strong>{{ currentOrder.orderNo }}</p>
          <p><strong>供应商单号：</strong>{{ currentOrder.supplierOrderNo || '-' }} &nbsp;&nbsp; <strong>状态：</strong><PurchaseStatusTag kind="purchase" :status="currentOrder.status" /></p>
          <p><strong>对账状态：</strong><PurchaseStatusTag kind="reconciliation" :status="currentOrder.reconciliationStatus" /></p>
          <p><strong>总金额：</strong>{{ formatNumber(totalAmount(currentOrder)) }} &nbsp;&nbsp; <strong>总数量：</strong>{{ formatNumber(totalQuantity(currentOrder)) }}</p>
          <el-table :data="currentOrder.items" stripe style="width:100%; margin-top:10px;">
            <el-table-column type="index" label="序号" width="60" align="center" />
            <el-table-column prop="materialCode" label="物料编码" width="160" />
            <el-table-column prop="materialName" label="物料名称" width="180" />
            <el-table-column :label="getDetailSpecHeaderLabel()" width="180">
              <template slot-scope="scope">{{ formatSpec(scope.row) }}</template>
            </el-table-column>
            <el-table-column :label="getDetailQtyHeaderLabel()" width="80">
              <template slot-scope="scope">{{ getDetailQtyValue(scope.row) }}</template>
            </el-table-column>
            <el-table-column :label="getDetailTotalHeaderLabel()" width="100">
              <template slot-scope="scope">{{ getDetailTotalValue(scope.row) }}</template>
            </el-table-column>
            <el-table-column label="金额" width="120">
              <template slot-scope="scope">{{ scope.row.amount || calcAmount(scope.row) }}</template>
            </el-table-column>
            <el-table-column prop="unitPrice" label="单价" width="100" />
            <el-table-column prop="remark" label="备注" />
          </el-table>
        </div>
        <span slot="footer">
          <el-button @click="detailVisible = false">关闭</el-button>
        </span>
      </el-dialog>

      <el-dialog title="采购对账" :visible.sync="reconciliationVisible" width="1100px">
        <div v-loading="reconciliationLoading">
          <div v-if="reconciliationSummary">
            <p><strong>采购单号：</strong>{{ reconciliationSummary.orderNo }}</p>
            <p><strong>对账状态：</strong>{{ reconciliationSummary.reconciliationStatus || '-' }} &nbsp;&nbsp; <strong>数量差：</strong>{{ formatNumber(reconciliationSummary.qtyDiff) }} &nbsp;&nbsp; <strong>金额差：</strong>{{ formatNumber(reconciliationSummary.amountDiff) }}</p>
            <el-table :data="reconciliationSummary.lineItems || []" stripe style="width:100%; margin-top:10px;">
              <el-table-column prop="materialCode" label="物料编码" width="150" />
              <el-table-column prop="materialName" label="物料名称" width="180" />
              <el-table-column prop="purchaseUomCode" label="采购单位" width="100" />
              <el-table-column prop="priceUomCode" label="计价单位" width="100" />
              <el-table-column prop="orderQty" label="订单数量" width="100" />
              <el-table-column prop="receiptQty" label="收货数量" width="100" />
              <el-table-column prop="qtyDiff" label="差异数量" width="100" />
              <el-table-column prop="orderAmount" label="订单金额" width="100" />
              <el-table-column prop="receiptAmount" label="收货金额" width="100" />
              <el-table-column prop="amountDiff" label="金额差" width="100" />
              <el-table-column prop="reconciliationStatus" label="状态" width="110" />
            </el-table>
          </div>
        </div>
        <span slot="footer">
          <el-button @click="reconciliationVisible = false">关闭</el-button>
        </span>
      </el-dialog>

      <el-dialog :title="isEditing ? '编辑采购单' : '新增采购单'" :visible.sync="editVisible" width="1250px">
        <el-form :model="editForm" label-width="100px">
          <el-row :gutter="12">
            <el-col :span="24">
              <el-form-item label="供应商">
                <el-select
                  v-model="editForm.supplierId"
                  filterable
                  :disabled="isEditing"
                  placeholder="请选择供应商"
                  style="width: 100%"
                  @change="onSupplierChange"
                >
                  <el-option
                    v-for="supplier in suppliers"
                    :key="supplier.id"
                    :label="supplier.supplierName || supplier.shortName || supplier.supplierCode"
                    :value="supplier.id"
                  />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="12">
            <el-col :span="12">
              <el-form-item label="采购单号">
                <el-input v-model="editForm.orderNo" :disabled="true" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="供应商单号">
                <el-input v-model="editForm.supplierOrderNo" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="12">
            <el-col :span="12">
              <el-form-item label="联系人">
                <el-input v-model="editForm.contactName" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="联系电话">
                <el-input v-model="editForm.contactPhone" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="12">
            <el-col :span="12">
              <el-form-item label="下单日期">
                <el-date-picker v-model="editForm.orderDate" type="date" placeholder="选择日期" value-format="yyyy-MM-dd" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="交货日期">
                <el-date-picker v-model="editForm.deliveryDate" type="date" placeholder="选择日期" value-format="yyyy-MM-dd" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="12">
            <el-col :span="24">
              <el-form-item label="公司地址">
                <el-input v-model="editForm.deliveryAddress" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="12">
            <el-col :span="24">
              <el-form-item label="备注" class="header-remark-item">
                <el-input
                  v-model="editForm.remark"
                  type="textarea"
                  :rows="4"
                  resize="vertical"
                  placeholder="请输入备注（长文本）"
                />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row v-if="supplierRemarkOptions.length" :gutter="12">
            <el-col :span="24">
              <el-form-item label="历史备注">
                <el-select
                  v-model="selectedRemarkTemplate"
                  filterable
                  clearable
                  style="width:100%"
                  placeholder="选择历史备注（可覆盖/追加）"
                  @change="onSelectRemarkTemplate"
                >
                  <el-option
                    v-for="item in supplierRemarkOptions"
                    :key="item"
                    :label="item"
                    :value="item"
                  />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="12">
            <el-col :span="12">
              <el-form-item label="总数量">
                <el-input :value="editTotalQuantity()" :disabled="true" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="总金额">
                <el-input :value="editTotalAmount()" :disabled="true" />
              </el-form-item>
            </el-col>
          </el-row>

          <div style="margin-top:10px">
            <div style="display:flex; align-items:center; justify-content:space-between">
              <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                <strong>物料明细</strong>
                <el-tag
                  v-for="tag in currentRecognitionTags()"
                  :key="tag.value"
                  size="mini"
                  :type="tag.type"
                >{{ tag.label }}</el-tag>
              </div>
              <el-button type="primary" size="mini" @click="addItem">新增明细行</el-button>
            </div>
            <el-table v-if="editForm.materialMode !== 'raw'" :data="editForm.filmItems" stripe style="width:100%; margin-top:10px;">
              <el-table-column label="序号" width="50" align="center">
                <template slot-scope="scope">{{ scope.$index + 1 }}</template>
              </el-table-column>
              <el-table-column label="物料编码" width="200">
                <template slot-scope="scope">
                  <el-select
                    v-if="isRowEditable(scope.row)"
                    v-model="scope.row.materialCode"
                    filterable
                    allow-create
                    :disabled="!editForm.supplierId"
                    :placeholder="materialCodePlaceholder()"
                    size="mini"
                    style="width: 100%"
                    @change="onMaterialCodeChange(scope.row, $event)"
                  >
                    <el-option v-for="raw in materialOptionsForCurrentMode()" :key="raw.materialCode" :label="`${raw.materialCode} ${raw.materialName || ''}`" :value="raw.materialCode">
                      <span style="float:left">{{ raw.materialCode }}</span>
                      <span style="float:right; color:#8492a6; font-size:12px">{{ raw.materialName }}</span>
                    </el-option>
                  </el-select>
                  <span v-else>{{ scope.row.materialCode || '-' }}</span>
                </template>
              </el-table-column>
              <el-table-column label="物料名称" width="160">
                <template slot-scope="scope">
                  <el-input v-if="isRowEditable(scope.row)" v-model="scope.row.materialName" class="small-input" placeholder="物料名称" />
                  <span v-else>{{ scope.row.materialName || '-' }}</span>
                </template>
              </el-table-column>
              <el-table-column label="颜色" width="90">
                <template slot-scope="scope">
                  <el-input v-if="isRowEditable(scope.row)" v-model="scope.row.colorCode" class="small-input" placeholder="颜色代码" />
                  <span v-else>{{ scope.row.colorCode || '-' }}</span>
                </template>
              </el-table-column>
              <el-table-column v-if="!isCountPricingFilmMode()" width="200">
                <template slot="header">
                  <div style="text-align: center; line-height: 1.3;">
                    <div>厚度*宽度*长度</div>
                    <div style="font-size: 11px; color: #909399;">(厚度μm*宽度mm*长度m)</div>
                  </div>
                </template>
                <template slot-scope="scope">
                  <div v-if="isRowEditable(scope.row)" style="display:flex; gap:4px;">
                    <el-input v-model="scope.row.thicknessDisplay" class="small-input" type="text" placeholder="厚度" style="width:60px;" @input="onFilmEstimatedFieldInput(scope.row)" />
                    <span style="line-height: 28px;">*</span>
                    <el-input v-model="scope.row.width" class="small-input" type="text" placeholder="宽度" style="width:60px;" @input="onFilmEstimatedFieldInput(scope.row)" />
                    <span style="line-height: 28px;">*</span>
                    <el-input v-model="scope.row.lengthDisplay" class="small-input" type="text" placeholder="长度" style="width:60px;" @input="onFilmEstimatedFieldInput(scope.row)" />
                  </div>
                  <span v-else>{{ [scope.row.thicknessDisplay || scope.row.thickness, scope.row.width, scope.row.lengthDisplay || scope.row.length].filter(v => v !== null && v !== undefined && String(v).trim() !== '').join('*') || '-' }}</span>
                </template>
              </el-table-column>
              <el-table-column :label="filmRollLabel()" width="70">
                <template slot-scope="scope">
                  <el-input v-if="isRowEditable(scope.row)" v-model="scope.row.rolls" class="small-input" type="text" :placeholder="filmRollLabel()" @input="onFilmEstimatedFieldInput(scope.row)" />
                  <span v-else>{{ scope.row.rolls || '-' }}</span>
                </template>
              </el-table-column>
              <el-table-column v-if="!isCountPricingFilmMode()" label="平米数" width="90">
                <template slot-scope="scope">{{ calcSqm(scope.row) }}</template>
              </el-table-column>
              <el-table-column v-if="!isCountPricingFilmMode() && shouldShowFilmChargeQtyColumn()" label="预估数量(Kg)" width="110">
                <template slot-scope="scope">{{ calcFilmChargeQtyForDisplay(scope.row) }}</template>
              </el-table-column>
              <el-table-column v-if="!isCountPricingFilmMode() && shouldShowFilmOrderKgColumn()" label="实际数量(Kg)" width="120">
                <template slot-scope="scope">
                  <el-input v-if="isRowEditable(scope.row) && isFilmWeightPricedRow(scope.row)" v-model="scope.row.actualQty" class="small-input" type="text" placeholder="按kg填写实际数量" @input="onFilmActualQtyInput(scope.row)" />
                  <span v-else>{{ isFilmWeightPricedRow(scope.row) ? (scope.row.actualQty || scope.row.priceQty || '-') : '-' }}</span>
                </template>
              </el-table-column>
              <el-table-column label="单价" width="90">
                <template slot-scope="scope">
                  <el-input v-if="isRowEditable(scope.row)" v-model="scope.row.unitPrice" class="small-input" type="text" placeholder="单价" :disabled="isUnitPriceLocked(scope.row)" />
                  <span v-else>{{ scope.row.unitPrice || '-' }}</span>
                </template>
              </el-table-column>
              <el-table-column label="金额" width="100">
                <template slot-scope="scope">{{ calcAmount(scope.row) }}</template>
              </el-table-column>
              <el-table-column label="备注" min-width="120">
                <template slot-scope="scope">
                  <el-input v-if="isRowEditable(scope.row)" v-model="scope.row.remark" class="small-input" placeholder="备注" />
                  <span v-else>{{ scope.row.remark || '-' }}</span>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="120" align="center">
                <template slot-scope="scope">
                  <el-button
                    v-if="isEditing && !isRowEditable(scope.row)"
                    type="text"
                    size="mini"
                    @click="enableRowEdit(scope.row)"
                  >编辑</el-button>
                  <el-button
                    v-if="isEditing && isRowEditable(scope.row)"
                    type="text"
                    size="mini"
                    @click="disableRowEdit('film', scope.row)"
                  >完成</el-button>
                  <el-button type="text" size="mini" style="color:#f56c6c" @click="removeItem('film', scope.row, scope.$index)">删除</el-button>
                </template>
              </el-table-column>
            </el-table>

            <el-table v-else :data="editForm.rawItems" stripe style="width:100%; margin-top:10px;">
              <el-table-column label="序号" width="50" align="center">
                <template slot-scope="scope">{{ scope.$index + 1 }}</template>
              </el-table-column>
              <el-table-column label="物料编码" width="200">
                <template slot-scope="scope">
                  <el-select
                    v-if="isRowEditable(scope.row)"
                    v-model="scope.row.materialCode"
                    filterable
                    allow-create
                    :disabled="!editForm.supplierId"
                    :placeholder="materialCodePlaceholder()"
                    size="mini"
                    style="width: 100%"
                    @change="onMaterialCodeChange(scope.row, $event)"
                  >
                    <el-option v-for="raw in materialOptionsForCurrentMode()" :key="raw.materialCode" :label="`${raw.materialCode} ${raw.materialName || ''}`" :value="raw.materialCode">
                      <span style="float:left">{{ raw.materialCode }}</span>
                      <span style="float:right; color:#8492a6; font-size:12px">{{ raw.materialName }}</span>
                    </el-option>
                  </el-select>
                  <span v-else>{{ scope.row.materialCode || '-' }}</span>
                </template>
              </el-table-column>
              <el-table-column label="物料名称" width="180">
                <template slot-scope="scope">
                  <el-input v-if="isRowEditable(scope.row)" v-model="scope.row.materialName" class="small-input" placeholder="物料名称" />
                  <span v-else>{{ scope.row.materialName || '-' }}</span>
                </template>
              </el-table-column>
              <el-table-column :label="getRawSpecHeaderLabelForEdit()" width="210">
                <template slot-scope="scope">
                  <div v-if="isRowEditable(scope.row) && isTubeRow(scope.row)" style="display:flex; gap:4px; align-items:center;">
                    <el-input v-model="scope.row.tubeThickness" class="small-input" type="text" placeholder="厚度" style="width:58px;" @input="onTubeSpecPartChange(scope.row)" />
                    <span style="line-height: 28px;">*</span>
                    <el-input v-model="scope.row.tubeInnerDiameter" class="small-input" type="text" placeholder="内径" style="width:58px;" @input="onTubeSpecPartChange(scope.row)" />
                    <span style="line-height: 28px;">*</span>
                    <el-input v-model="scope.row.tubeLength" class="small-input" type="text" placeholder="长度" style="width:58px;" @input="onTubeSpecPartChange(scope.row)" />
                  </div>
                  <el-select
                    v-else-if="isRowEditable(scope.row)"
                    v-model="scope.row.rawSpec"
                    filterable
                    allow-create
                    default-first-option
                    clearable
                    class="small-input"
                    placeholder="选择或输入数字"
                    @visible-change="onRawSpecDropdownVisibleChange(scope.row, $event)"
                    @change="onRawSpecChange(scope.row, $event)"
                  >
                    <el-option
                      v-for="opt in getRawSpecOptionsForRow(scope.row)"
                      :key="opt"
                      :label="opt"
                      :value="opt"
                    />
                  </el-select>
                  <span v-else>{{ scope.row.rawSpec || '-' }}</span>
                </template>
              </el-table-column>
              <el-table-column :label="getRawQtyHeaderLabelForEdit()" width="90">
                <template slot-scope="scope">
                  <el-input v-if="isRowEditable(scope.row)" v-model="scope.row.quantity" class="small-input" type="text" :placeholder="getRawQtyHeaderLabelForEdit()" />
                  <span v-else>{{ scope.row.quantity || '-' }}</span>
                </template>
              </el-table-column>
              <el-table-column :label="getRawTotalHeaderLabelForEdit()" width="110">
                <template slot-scope="scope">{{ calcRawTotalWeight(scope.row) }}</template>
              </el-table-column>
              <el-table-column :label="getRawPriceHeaderLabelForEdit()" width="110">
                <template slot-scope="scope">
                  <el-input v-if="isRowEditable(scope.row)" v-model="scope.row.unitPrice" class="small-input" type="text" placeholder="如: 16.50" />
                  <span v-else>{{ scope.row.unitPrice || '-' }}</span>
                </template>
              </el-table-column>
              <el-table-column label="金额" width="100">
                <template slot-scope="scope">{{ calcRawAmount(scope.row) }}</template>
              </el-table-column>
              <el-table-column label="备注" min-width="120">
                <template slot-scope="scope">
                  <el-input v-if="isRowEditable(scope.row)" v-model="scope.row.remark" class="small-input" placeholder="备注" />
                  <span v-else>{{ scope.row.remark || '-' }}</span>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="120" align="center">
                <template slot-scope="scope">
                  <el-button
                    v-if="isEditing && !isRowEditable(scope.row)"
                    type="text"
                    size="mini"
                    @click="enableRowEdit(scope.row)"
                  >编辑</el-button>
                  <el-button
                    v-if="isEditing && isRowEditable(scope.row)"
                    type="text"
                    size="mini"
                    @click="disableRowEdit('raw', scope.row)"
                  >完成</el-button>
                  <el-button type="text" size="mini" style="color:#f56c6c" @click="removeItem('raw', scope.row, scope.$index)">删除</el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-form>
        <span slot="footer">
          <el-button @click="editVisible = false">取消</el-button>
          <el-button type="primary" @click="saveOrder">保存</el-button>
        </span>
      </el-dialog>
    </el-card>
  </div>
</template>

<script>
import { getPurchaseOrders, createPurchaseOrder, updatePurchaseOrder, deletePurchaseOrder, downloadPurchaseTemplate, importPurchaseOrders, exportPurchaseOrders, getPurchaseOrderDetail, getPurchaseOrderReconciliation, getPurchaseOrderRawSpecHistory, generatePurchaseOrderNo } from '@/api/purchase'
import { listPurchaseQuotations, getPurchaseQuotationDetail } from '@/api/purchaseQuotation'
import { listSuppliers } from '@/api/purchaseSupplier'
import { getAllEnabledSpecs } from '@/api/tapeSpec'
import { getRawMaterialList } from '@/api/tapeRawMaterial'
import { getPurchaseReconciliationMeta, getPurchaseReconciliationOptions } from '@/constants/purchaseReconciliation'
import { getPurchaseStatusMeta } from '@/constants/purchaseStatus'
import PurchaseStatusTag from '@/components/PurchaseStatusTag'

export default {
  name: 'PurchaseOrders',
  components: { PurchaseStatusTag },
  data() {
    return {
      loading: false,
      orders: [],
      pagination: {
        pageNum: 1,
        pageSize: 10,
        total: 0
      },
      searchForm: {
        supplier: '',
        orderNo: '',
        reconciliationStatus: '',
        startDate: '',
        endDate: ''
      },
      suppliers: [],
      specs: [],
      rawMaterials: [],
      supplierFilteredMaterials: [],
      latestQuoteByCode: {},
      rawSpecOptions: ['900', '180', '175', '165', '160', '25', '20', '18', '1'],
      rawSpecHistoryCache: {},
      rawSpecHistoryLoadingMap: {},
      supplierRemarkOptions: [],
      selectedRemarkTemplate: '',
      materialSearchKeyword: '',
      detailVisible: false,
      reconciliationVisible: false,
      reconciliationLoading: false,
      reconciliationSummary: null,
      reconciliationOptions: getPurchaseReconciliationOptions(),
      editVisible: false,
      isEditing: false,
      currentOrder: null,
      editForm: this.emptyForm(),
      printVisible: false,
      currentPrint: null,
      companyInfo: {
        companyName: '东莞市方恩电子材料科技有限公司',
        address: '广东省东莞市桥头镇桥新东路13号2号楼102室',
        phone: '0769-82551118',
        fax: '0769-82551160',
        website: 'www.finechemfr.com'
      },
      printLogoUrl: '/logo/finechem-logo.png',
      purchasePrintDefaultRemark: '随货提供检验报告，要有保质期；中性标签至：每一桶都要贴标签，标签上需写批次号、保质期、出货日期、我司物料编码；送货单上要有我司物料编码；每次送货都拉走空桶；贴ROHS+HF标签'
    }
  },
  created() {
    this.fetchOrders()
    this.fetchSuppliers()
    this.fetchSpecs()
    this.fetchRawMaterials()
  },
  methods: {
    getDateOffset(days = 0) {
      const d = new Date()
      d.setDate(d.getDate() + Number(days || 0))
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${y}-${m}-${day}`
    },
    normalizeDateOnly(value) {
      if (!value) return ''
      const text = String(value).trim()
      const match = text.match(/^(\d{4}-\d{2}-\d{2})/)
      if (match && match[1]) return match[1]
      const dt = new Date(value)
      if (Number.isNaN(dt.getTime())) return text
      const y = dt.getFullYear()
      const m = String(dt.getMonth() + 1).padStart(2, '0')
      const d = String(dt.getDate()).padStart(2, '0')
      return `${y}-${m}-${d}`
    },
    emptyForm() {
      return {
        supplierId: null,
        supplier: '',
        supplierOrderNo: '',
        contactName: '',
        contactPhone: '',
        orderNo: '',
        orderDate: this.getDateOffset(0),
        deliveryDate: this.getDateOffset(3),
        deliveryAddress: '',
        status: 'pending',
        remark: '',
        materialMode: '',
        filmItems: [],
        rawItems: []
      }
    },
    async fetchOrders() {
      this.loading = true
      try {
        const res = await getPurchaseOrders({
          pageNum: this.pagination.pageNum,
          pageSize: this.pagination.pageSize,
          orderNo: this.searchForm.orderNo,
          supplier: this.searchForm.supplier,
          reconciliationStatus: this.searchForm.reconciliationStatus,
          startDate: this.searchForm.startDate,
          endDate: this.searchForm.endDate
        })
        if (res && (res.code === 200 || res.code === 20000)) {
          const pageData = res.data
          if (pageData && pageData.records) {
            this.orders = pageData.records
            this.pagination.total = Number(pageData.total || 0)
          } else if (Array.isArray(pageData)) {
            this.orders = pageData
            this.pagination.total = pageData.length
          }
        }
      } catch (e) {
        console.error('获取采购订单失败', e)
        this.$message.error('获取采购订单失败')
      } finally {
        this.loading = false
      }
    },
    async fetchSuppliers() {
      try {
        const res = await listSuppliers({ page: 1, size: 1000, keyword: '' })
        if (res && (res.code === 200 || res.code === 20000)) {
          const data = res.data
          if (data && data.records) {
            this.suppliers = data.records
          } else if (data && data.list) {
            this.suppliers = data.list
          } else if (Array.isArray(data)) {
            this.suppliers = data
          }
        }
      } catch (e) {
        console.error('获取供应商失败', e)
      }
    },
    async fetchSpecs() {
      try {
        const res = await getAllEnabledSpecs()
        if (res && (res.code === 200 || res.code === 20000)) {
          this.specs = res.data || []
        }
      } catch (e) {
        console.error('获取料号失败', e)
      }
    },
    async fetchRawMaterials() {
      try {
        const res = await getRawMaterialList()
        if (res && (res.code === 200 || res.code === 20000)) {
          this.rawMaterials = res.data || []
        }
      } catch (e) {
        console.error('获取原材料失败', e)
      }
    },
    handleSearch() {
      this.pagination.pageNum = 1
      this.fetchOrders()
    },
    handleReset() {
      this.searchForm = { supplier: '', orderNo: '', reconciliationStatus: '', startDate: '', endDate: '' }
      this.handleSearch()
    },
    handleSizeChange(val) {
      this.pagination.pageSize = val
      this.pagination.pageNum = 1
      this.fetchOrders()
    },
    handleCurrentChange(val) {
      this.pagination.pageNum = val
      this.fetchOrders()
    },
    async openCreate() {
      this.isEditing = false
      this.editForm = this.emptyForm()
      this.supplierFilteredMaterials = []
      this.latestQuoteByCode = {}
      this.rawSpecHistoryCache = {}
      this.rawSpecHistoryLoadingMap = {}
      this.supplierRemarkOptions = []
      this.selectedRemarkTemplate = ''
      this.materialSearchKeyword = ''
      this.addFilmItem(false)
      try {
        const res = await generatePurchaseOrderNo()
        if (res && (res.code === 200 || res.code === 20000) && res.data) {
          this.editForm.orderNo = res.data
        }
      } catch (e) {
        console.error('生成采购单号失败', e)
      }
      this.editVisible = true
    },
    async openEdit(row) {
      if (!this.suppliers || !this.suppliers.length) {
        await this.fetchSuppliers()
      }
      this.isEditing = true
      const res = await getPurchaseOrderDetail(row.orderNo)
      if (res && (res.code === 200 || res.code === 20000)) {
        this.editForm = this.normalizeEditForm(res.data || row)
        this.rawSpecHistoryCache = {}
        this.rawSpecHistoryLoadingMap = {}
        await this.syncSupplierContextByForm()
        this.selectedRemarkTemplate = ''
        this.editVisible = true
      }
    },
    async syncSupplierContextByForm() {
      const supplier = this.suppliers.find(s => s.id === this.editForm.supplierId) ||
        this.suppliers.find(s => {
          const target = String(this.editForm.supplier || '').trim()
          if (!target) return false
          const values = [s.supplierName, s.shortName, s.supplierCode].map(v => String(v || '').trim())
          return values.some(v => v && (v === target || target.includes(v) || v.includes(target)))
        })
      if (supplier) {
        this.editForm.supplierId = supplier.id
        this.editForm.supplier = supplier.supplierName || supplier.shortName || supplier.supplierCode
        await this.reloadSupplierMaterialContext(supplier)
        await this.loadSupplierRemarkOptions(supplier)
      } else {
        this.supplierFilteredMaterials = this.rawMaterials || []
        this.latestQuoteByCode = {}
        this.supplierRemarkOptions = []
        this.selectedRemarkTemplate = ''
      }
    },
    async loadOrderDetail(orderNo) {
      const res = await getPurchaseOrderDetail(orderNo)
      if (res && (res.code === 200 || res.code === 20000)) {
        return res.data || null
      }
      return null
    },
    normalizeEditForm(order) {
      const form = {
        supplierId: order.supplierId || null,
        supplier: order.supplier,
        supplierOrderNo: order.supplierOrderNo,
        contactName: order.contactName,
        contactPhone: order.contactPhone,
        orderNo: order.orderNo,
        orderDate: this.normalizeDateOnly(order.orderDate),
        deliveryDate: this.normalizeDateOnly(order.deliveryDate),
        deliveryAddress: order.deliveryAddress,
        status: order.status || 'pending',
        remark: order.remark,
        materialMode: '',
        filmItems: [],
        rawItems: []
      }
      if (order.items && order.items.length) {
        const filmItems = []
        const rawItems = []
        order.items.forEach(item => {
          const rawMat = this.getRawMaterialByCode(item.materialCode)
          const filmSpecText = item.filmSpecRaw || item.rawSpec || item.specifications || (rawMat && rawMat.spec) || ''
          const rowForDetect = {
            materialCode: item.materialCode,
            materialName: item.materialName,
            rawSpec: filmSpecText,
            filmSpecRaw: filmSpecText,
            width: item.width,
            length: item.length,
            pricingMode: item.pricingMode,
            priceUomCode: item.priceUomCode,
            purchaseUomCode: item.purchaseUomCode,
            materialCategory: rawMat && (rawMat.materialCategory || rawMat.materialCategoryRaw || rawMat.materialMajor),
            materialType: rawMat && rawMat.materialType
          }
          const byMetaFilm = this.isFilmByMeta(this.getRawMaterialMetaByRow(rowForDetect))
          const countPriced = this.isCountPricedRow(rowForDetect)
          const hasFilmDimension = item.width !== null && item.width !== undefined && item.length !== null && item.length !== undefined
          const isFilm = !countPriced && (byMetaFilm || hasFilmDimension || this.isLikelyFilmRow(rowForDetect))
          if (isFilm) {
            const specParts = this.splitFilmSpecToParts(filmSpecText)
            const thicknessFromText = this.inferFilmThicknessFromText({
              ...rowForDetect,
              filmSpecRaw: filmSpecText,
              rawSpec: filmSpecText
            })
            filmItems.push({
              ...item,
              filmSpecRaw: filmSpecText || [item.thickness, item.width, item.length].filter(v => v !== null && v !== undefined && String(v).trim() !== '').join('*'),
              thicknessDisplay: item.thickness || specParts.thickness || thicknessFromText || '',
              width: item.width || specParts.width || '',
              lengthDisplay: item.length || specParts.length || '',
              pricingMode: this.normalizeFilmPricingMode(item.pricingMode || item.priceUomCode || item.purchaseUomCode) || '',
              actualQty: this.normalizeFilmPricingMode(item.pricingMode || item.priceUomCode || item.purchaseUomCode) === 'kg'
                ? (item.priceQty || item.sqm || '')
                : '',
              __actualQtyManual: this.normalizeFilmPricingMode(item.pricingMode || item.priceUomCode || item.purchaseUomCode) === 'kg'
                ? (this.toDecimalNumber(item.priceQty || item.sqm) > 0)
                : false,
              unitPrice: item.unitPrice,
              unitPriceLocked: false,
              rolls: item.rolls,
              __editing: false
            })
          } else {
            const rawMat = this.rawMaterials.find(r => r.materialCode === item.materialCode)
            const tubeParts = this.splitTubeSpecToParts(item.rawSpec || (rawMat && rawMat.spec) || '')
            rawItems.push({
              ...item,
              quantity: item.rolls || item.quantity,
              totalWeight: item.sqm,
              rawSpec: item.rawSpec || (rawMat && rawMat.spec) || '',
              tubeThickness: tubeParts.thickness,
              tubeInnerDiameter: tubeParts.innerDiameter,
              tubeLength: tubeParts.length,
              unitPrice: item.unitPrice,
              __editing: false
            })
          }
        })
        form.filmItems = filmItems
        form.rawItems = rawItems
        form.filmItems.forEach(row => {
          if (!row) return
          if ((row.thicknessDisplay === null || row.thicknessDisplay === undefined || String(row.thicknessDisplay).trim() === '') && row.filmSpecRaw) {
            this.applyFilmSpecParts(row, row.filmSpecRaw)
          }
        })
        form.materialMode = filmItems.length > 0 ? 'film' : (rawItems.length > 0 ? 'raw' : '')
      }
      return form
    },
    isCountPricingFilmMode() {
      const rows = (this.editForm && this.editForm.filmItems) || []
      return rows.some(row => this.isCountPricedRow(row))
    },
    filmRollLabel() {
      return this.isCountPricingFilmMode() ? '个数' : '卷数'
    },
    async onSupplierChange(id) {
      const supplier = this.suppliers.find(s => s.id === id)
      if (supplier) {
        this.editForm.supplier = supplier.supplierName || supplier.shortName || supplier.supplierCode
        if (supplier.primaryContactName) {
          this.editForm.contactName = supplier.primaryContactName
        }
        if (supplier.primaryContactMobile) {
          this.editForm.contactPhone = supplier.primaryContactMobile
        }
        if (supplier.contactAddress) {
          this.editForm.deliveryAddress = supplier.contactAddress
        }
        this.materialSearchKeyword = ''
        this.rawSpecHistoryCache = {}
        this.rawSpecHistoryLoadingMap = {}
        await this.reloadSupplierMaterialContext(supplier)
        this.syncDetailRowsBySupplier(supplier)
        await this.loadSupplierRemarkOptions(supplier)
      }
    },
    onSelectRemarkTemplate(value) {
      if (!value) return
      const current = String(this.editForm.remark || '').trim()
      if (!current) {
        this.editForm.remark = value
        return
      }
      if (current === value || current.includes(value)) {
        return
      }
      this.editForm.remark = `${current}\n${value}`
    },
    async loadSupplierRemarkOptions(supplier) {
      try {
        const keyword = String((supplier && (supplier.supplierName || supplier.shortName || supplier.supplierCode)) || this.editForm.supplier || '').trim()
        if (!keyword) {
          this.supplierRemarkOptions = []
          return
        }
        const pageSize = 200
        let pageNum = 1
        let total = 0
        let loaded = 0
        const set = new Set()
        while (pageNum <= 5) {
          const res = await getPurchaseOrders({ pageNum, pageSize, supplier: keyword })
          if (!(res && (res.code === 200 || res.code === 20000) && res.data)) break
          const pageData = res.data
          const records = pageData.records || []
          total = Number(pageData.total || records.length)
          records.forEach(item => {
            const text = String((item && item.remark) || '').trim()
            if (text) set.add(text)
          })
          loaded += records.length
          if (!records.length || loaded >= total) break
          pageNum += 1
        }
        this.supplierRemarkOptions = Array.from(set)
      } catch (e) {
        console.error('加载供应商历史备注失败', e)
        this.supplierRemarkOptions = []
      }
    },
    syncDetailRowsBySupplier(supplier) {
      const matched = this.supplierFilteredMaterials || []
      const hasFilm = (matched || []).some(item => this.isFilmMaterial(item))
      const hasRaw = (matched || []).some(item => !this.isFilmMaterial(item))

      let nextMode = this.editForm.materialMode
      if (!nextMode) {
        if (hasRaw && !hasFilm) nextMode = 'raw'
        else if (hasFilm && !hasRaw) nextMode = 'film'
        else nextMode = 'film'
      }

      this.editForm.materialMode = nextMode

      if (nextMode === 'raw') {
        this.editForm.filmItems = []
        this.editForm.rawItems = [{
          materialCode: '',
          materialName: '',
          rawSpec: '',
          quantity: '',
          totalWeight: '',
          unitPrice: '',
          remark: ''
        }]
      } else {
        this.editForm.rawItems = []
        this.editForm.filmItems = [{
          materialCode: '',
          materialName: '',
          filmSpecRaw: '',
          colorCode: '',
          thicknessDisplay: '',
          width: '',
          lengthDisplay: '',
          rolls: '',
          pricingMode: '',
          actualQty: '',
          __actualQtyManual: false,
          unitPrice: '',
          unitPriceLocked: false,
          remark: ''
        }]
      }
    },
    async reloadSupplierMaterialContext(supplier) {
      this.latestQuoteByCode = await this.fetchLatestQuotationMapBySupplier(supplier)
      this.supplierFilteredMaterials = this.buildSupplierMaterialsFromQuotations(this.latestQuoteByCode)
      this.applyQuotePricingModeToFilmRows()
      if (this.editForm && this.editForm.supplierId && (!this.supplierFilteredMaterials || !this.supplierFilteredMaterials.length)) {
        this.$message.warning('该供应商在报价单中暂无可用物料，请先维护供应商报价单')
      }
    },
    applyQuotePricingModeToFilmRows() {
      const rows = (this.editForm && this.editForm.filmItems) || []
      rows.forEach(row => {
        if (!row || this.isCountPricedRow(row)) return
        row.pricingMode = this.resolveFilmPricingMode(row)
        const code = String(row.materialCode || '').trim()
        const latestQuote = code ? this.latestQuoteByCode[code] : null
        if (latestQuote && latestQuote.unitPrice !== null && latestQuote.unitPrice !== undefined) {
          row.unitPrice = latestQuote.unitPrice
          row.unitPriceLocked = true
        }
        if (row.pricingMode === 'kg') {
          this.syncFilmActualQtyWithEstimated(row)
        } else {
          row.actualQty = ''
          row.__actualQtyManual = false
        }
      })
    },
    buildSupplierMaterialsFromQuotations(quoteMap) {
      const map = quoteMap || {}
      const codes = Object.keys(map)
      if (!codes.length) return []
      return codes.map(code => {
        const quote = map[code] || {}
        const raw = (this.rawMaterials || []).find(r => r.materialCode === code) || {}
        return {
          ...raw,
          materialCode: code,
          materialName: raw.materialName || quote.materialName || '',
          spec: raw.spec || quote.specifications || '',
          quotedUnitPrice: quote.unitPrice,
          quotedPricingMode: quote.pricingMode || quote.priceUomCode || quote.purchaseUomCode
        }
      })
    },
    materialCodePlaceholder() {
      return this.editForm && this.editForm.supplierId ? '选择或输入' : '请先选择供应商'
    },
    getRawSpecHistoryCacheKey(materialCode) {
      const code = String(materialCode || '').trim()
      if (!code) return ''
      const supplierKey = String(this.editForm.supplierId || this.editForm.supplier || '').trim()
      if (!supplierKey) return ''
      return `${supplierKey}__${code}`
    },
    getRawSpecOptionsForRow(row) {
      const code = String((row && row.materialCode) || '').trim()
      const key = this.getRawSpecHistoryCacheKey(code)
      const historyOptions = key ? (this.rawSpecHistoryCache[key] || []) : []
      const current = String((row && row.rawSpec) || '').trim()
      const merged = []
      ;[...historyOptions, ...this.rawSpecOptions, current].forEach(v => {
        const text = String(v || '').trim()
        if (!text) return
        if (!merged.includes(text)) merged.push(text)
      })
      return merged
    },
    pushRawSpecHistoryOption(materialCode, specValue, row = null) {
      const cacheKey = this.getRawSpecHistoryCacheKey(materialCode)
      if (!cacheKey) return
      const normalized = this.normalizeRawSpecValue(specValue, row)
      const text = String(normalized || '').trim()
      if (!text) return
      const exists = Array.isArray(this.rawSpecHistoryCache[cacheKey]) ? this.rawSpecHistoryCache[cacheKey] : []
      if (!exists.includes(text)) {
        this.$set(this.rawSpecHistoryCache, cacheKey, [text, ...exists])
      }
    },
    async onRawSpecDropdownVisibleChange(row, visible) {
      if (!visible) return
      await this.loadRawSpecHistoryForRow(row)
    },
    async loadRawSpecHistoryForRow(row) {
      const code = String((row && row.materialCode) || '').trim()
      const supplierKeyword = String(this.editForm.supplier || '').trim()
      const cacheKey = this.getRawSpecHistoryCacheKey(code)
      if (!code || !supplierKeyword || !cacheKey) return
      if (Array.isArray(this.rawSpecHistoryCache[cacheKey])) return

      const loadingTask = this.rawSpecHistoryLoadingMap[cacheKey]
      if (loadingTask) {
        await loadingTask
        return
      }

      const task = (async() => {
        const specList = []
        const appendSpec = (specValue) => {
          const normalized = this.normalizeRawSpecValue(specValue, row)
          const text = String(normalized || '').trim()
          if (!text) return
          if (!specList.includes(text)) specList.push(text)
        }

        try {
          const quote = this.latestQuoteByCode[code]
          if (quote && quote.specifications) {
            appendSpec(quote.specifications)
          }

          const historyRes = await getPurchaseOrderRawSpecHistory({ supplier: supplierKeyword, materialCode: code })
          if (historyRes && (historyRes.code === 200 || historyRes.code === 20000)) {
            const historyList = Array.isArray(historyRes.data) ? historyRes.data : []
            historyList.forEach(appendSpec)
          }

          // 后端接口为空时，兜底走前端聚合（兼容未重启后端的场景）
          if (specList.length > 0) {
            this.$set(this.rawSpecHistoryCache, cacheKey, specList)
            return
          }

          const pageSize = 100
          let pageNum = 1
          let loaded = 0
          let total = 0
          const orderNos = []

          while (pageNum <= 5) {
            const res = await getPurchaseOrders({ pageNum, pageSize, supplier: supplierKeyword })
            if (!(res && (res.code === 200 || res.code === 20000) && res.data)) break
            const pageData = res.data
            const records = pageData.records || []
            total = Number(pageData.total || records.length)

            records.forEach(order => {
              if (order && order.orderNo) orderNos.push(order.orderNo)
              const orderItems = (order && order.items) || []
              orderItems.forEach(item => {
                if (String(item.materialCode || '').trim() === code) {
                  appendSpec(item.rawSpec || item.specifications || item.filmSpecRaw)
                }
              })
            })

            loaded += records.length
            if (!records.length || loaded >= total) break
            pageNum += 1
          }

          if (orderNos.length) {
            const detailOrderNos = Array.from(new Set(orderNos)).slice(0, 80)
            const detailList = await Promise.all(detailOrderNos.map(async(orderNo) => {
              const detailRes = await getPurchaseOrderDetail(orderNo)
              return detailRes && (detailRes.code === 200 || detailRes.code === 20000) ? (detailRes.data || null) : null
            }))

            detailList.forEach(detail => {
              const items = (detail && detail.items) || []
              items.forEach(item => {
                if (String(item.materialCode || '').trim() === code) {
                  appendSpec(item.rawSpec || item.specifications || item.filmSpecRaw)
                }
              })
            })
          }
        } catch (e) {
          console.error('加载历史规格失败', e)
        }

        this.$set(this.rawSpecHistoryCache, cacheKey, specList)
      })()

      this.$set(this.rawSpecHistoryLoadingMap, cacheKey, task)
      await task
      this.$delete(this.rawSpecHistoryLoadingMap, cacheKey)
    },
    filterMaterialsBySupplier(supplier) {
      const all = this.rawMaterials || []
      if (!supplier) return all
      const keywords = [supplier.supplierCode, supplier.supplierName, supplier.shortName]
        .map(v => String(v || '').trim())
        .filter(Boolean)
      if (!keywords.length) return []
      const matched = all.filter(item => {
        const supplierCode = String(item.supplierCode || '').trim()
        const supplierNameInSpec = String(item.spec || '')
        return keywords.some(k => {
          if (!k) return false
          if (supplierCode && (supplierCode === k || supplierCode.includes(k) || k.includes(supplierCode))) {
            return true
          }
          return supplierNameInSpec.includes(k)
        })
      })
      return matched
    },
    isTubeSupplierName(text) {
      const v = String(text || '').trim()
      if (!v) return false
      return /纸管|纸品|纸筒|纸芯/i.test(v)
    },
    getRawMaterialByCode(materialCode) {
      const code = String(materialCode || '').trim()
      if (!code) return null
      return (this.rawMaterials || []).find(r => String(r.materialCode || '').trim() === code) || null
    },
    getRawMaterialMetaByRow(row) {
      if (!row) return { category: '', type: '' }
      const raw = this.getRawMaterialByCode(row.materialCode)
      const category = String((row.materialCategory || row.materialCategoryRaw || row.materialMajor || (raw && (raw.materialCategory || raw.materialCategoryRaw || raw.materialMajor))) || '').trim()
      const type = String((row.materialType || (raw && raw.materialType)) || '').trim()
      return { category, type }
    },
    isFilmByMeta(meta) {
      const category = String((meta && meta.category) || '').toLowerCase()
      const categoryText = String((meta && meta.category) || '')
      const typeText = String((meta && meta.type) || '')
      if (!category && !typeText) return false
      if (category === 'film') return true
      return /原膜|离型材料|薄膜|泡棉|film/i.test(categoryText) || /膜|离型|foam|泡棉/i.test(typeText)
    },
    isPackagingByMeta(meta) {
      const categoryText = String((meta && meta.category) || '')
      return /包辅材/i.test(categoryText)
    },
    isChemicalByMeta(meta) {
      const categoryText = String((meta && meta.category) || '')
      const typeText = String((meta && meta.type) || '')
      return /化工料|chemical/i.test(categoryText) || /胶水|固化剂|溶剂|色浆|树脂|助剂|离型剂|阻燃剂|导电剂|电解液|硅油/i.test(typeText)
    },
    isTubeByMeta(meta) {
      const typeText = String((meta && meta.type) || '')
      return /纸管|纸筒|纸芯|胶管|管材|pe管/i.test(typeText)
    },
    isCartonByMeta(meta) {
      const typeText = String((meta && meta.type) || '')
      return /纸箱|纸盒|carton|ctn/i.test(typeText)
    },
    hasCountPricedRawItems() {
      const rows = (this.editForm && this.editForm.rawItems) || []
      return rows.some(row => this.isCountPricedRow(row))
    },
    hasTubeRawItems() {
      const rows = (this.editForm && this.editForm.rawItems) || []
      return rows.some(row => this.isTubeRow(row))
    },
    isChemicalRow(row) {
      if (!row) return false
      const meta = this.getRawMaterialMetaByRow(row)
      if (this.isChemicalByMeta(meta)) return true
      const name = String(row.materialName || '').trim()
      const code = String(row.materialCode || '').trim()
      return /胶水|固化剂|溶剂|色浆|树脂|助剂|离型剂|阻燃剂|导电剂|电解液|硅油/i.test(`${name} ${code}`)
    },
    classifyRowKind(row) {
      if (!row) return 'unknown'
      const meta = this.getRawMaterialMetaByRow(row)
      if (this.isCartonByMeta(meta) || this.isCartonRow(row)) return 'carton'
      if (this.isTubeByMeta(meta) || this.isTubeRow(row) || this.isPeTubeRow(row)) return 'tube'
      if (this.isChemicalByMeta(meta) || this.isChemicalRow(row)) return 'chemical'
      if (this.isFilmByMeta(meta) || this.isLikelyFilmRow(row)) return 'film'
      return 'raw'
    },
    currentRecognitionTags() {
      const mode = this.editForm && this.editForm.materialMode
      const rows = mode === 'raw' ? ((this.editForm && this.editForm.rawItems) || []) : ((this.editForm && this.editForm.filmItems) || [])
      if (!rows.length) return [{ value: 'empty', label: '识别: 未选择物料', type: 'info' }]
      const set = new Set(rows.map(row => this.classifyRowKind(row)))
      const tags = []
      if (set.has('film')) tags.push({ value: 'film', label: '识别: 薄膜', type: 'success' })
      if (set.has('chemical')) tags.push({ value: 'chemical', label: '识别: 化工料(胶水逻辑)', type: 'warning' })
      if (set.has('carton')) tags.push({ value: 'carton', label: '识别: 纸箱', type: '' })
      if (set.has('tube')) tags.push({ value: 'tube', label: '识别: 纸管/胶管', type: '' })
      if (set.has('raw')) tags.push({ value: 'raw', label: '识别: 其他原料', type: 'info' })
      return tags.length ? tags : [{ value: 'unknown', label: '识别: 未知', type: 'info' }]
    },
    isCountPriceSupplierName(text) {
      const v = String(text || '').trim()
      if (!v) return false
      return /纸管|纸品|纸筒|纸芯|纸箱|纸盒|pe管|管材|胶管|carton|ctn/i.test(v)
    },
    isTubeSupplierActive() {
      if (this.isTubeSupplierName(this.editForm.supplier)) return true
      const supplier = this.suppliers.find(s => s.id === this.editForm.supplierId)
      if (!supplier) return false
      return this.isTubeSupplierName(supplier.supplierName) || this.isTubeSupplierName(supplier.shortName) || this.isTubeSupplierName(supplier.supplierCode)
    },
    isCountPriceSupplierActive() {
      if (this.isCountPriceSupplierName(this.editForm.supplier)) return true
      const supplier = this.suppliers.find(s => s.id === this.editForm.supplierId)
      if (!supplier) return false
      return this.isCountPriceSupplierName(supplier.supplierName) || this.isCountPriceSupplierName(supplier.shortName) || this.isCountPriceSupplierName(supplier.supplierCode)
    },
    isTubeRow(row) {
      if (!row) return this.isTubeSupplierActive()
      const meta = this.getRawMaterialMetaByRow(row)
      if (this.isTubeByMeta(meta)) return true
      if (this.isCartonByMeta(meta) || this.isFilmByMeta(meta)) return false
      const name = String(row.materialName || '').trim()
      const code = String(row.materialCode || '').trim()
      const spec = String(row.rawSpec || '').trim()
      if (/纸管|硬纸管|纸筒|纸芯|管/i.test(name) || /管/i.test(code)) return true
      if (/^\s*\d+(?:\.\d+)?\s*[xX×*]\s*\d+(?:\.\d+)?\s*[xX×*]\s*\d+(?:\.\d+)?\s*(mm|厘米|cm|m)?\s*$/i.test(spec)) return true
      return this.isTubeSupplierActive()
    },
    isCartonRow(row) {
      if (!row) return this.isCountPriceSupplierActive()
      const meta = this.getRawMaterialMetaByRow(row)
      if (this.isCartonByMeta(meta)) return true
      if (this.isTubeByMeta(meta) || this.isFilmByMeta(meta)) return false
      const name = String(row.materialName || '').trim()
      const code = String(row.materialCode || '').trim()
      const spec = String(row.rawSpec || '').trim()
      if (/纸箱|纸盒|carton|ctn|箱规/i.test(name)) return true
      if (/^ZX/i.test(code) || /箱/.test(code)) return true
      if (/纸箱|纸盒|箱规/i.test(spec)) return true
      return this.isCountPriceSupplierActive() && !this.isTubeRow(row)
    },
    isPeTubeRow(row) {
      if (!row) return false
      const meta = this.getRawMaterialMetaByRow(row)
      if (this.isTubeByMeta(meta) && /胶管|pe管|管材/i.test(String(meta.type || ''))) return true
      if (this.isCartonByMeta(meta) || this.isFilmByMeta(meta)) return false
      const name = String(row.materialName || '').trim()
      const code = String(row.materialCode || '').trim()
      const spec = String(row.rawSpec || row.filmSpecRaw || '').trim()
      return /pe管|管材|胶管/i.test(name) || /^PEG/i.test(code) || /pe管/i.test(spec)
    },
    isCountPricedRow(row) {
      return this.isTubeRow(row) || this.isCartonRow(row) || this.isPeTubeRow(row)
    },
    normalizeFilmPricingMode(value) {
      const text = String(value || '').trim().toLowerCase()
      if (!text) return ''
      if (text === 'kg' || text.includes('kg') || text.includes('重量')) return 'kg'
      if (text === 'sqm' || text.includes('㎡') || text.includes('平米') || text.includes('m2') || text.includes('m²') || text.includes('面积')) return 'sqm'
      return ''
    },
    formatUnitDisplay(unit) {
      if (!unit && unit !== 0) return ''
      const text = String(unit || '').trim()
      if (!text) return ''
      const lower = text.toLowerCase()
      // 平米统一显示为 ㎡
      if (lower === '平米' || lower === 'm2' || lower === '㎡' || lower === 'm²' || lower === 'sqm' || lower === 'm²/m2') return '㎡'
      if (lower === 'pcs' || lower === 'pc' || lower === '件') return 'pcs'
      if (lower === 'kg' || lower === 'kilogram' || lower === '公斤') return 'kg'
      // keep original if unknown
      return text
    },
    resolveFilmPricingMode(row) {
      if (!row) return 'kg'
      const code = String(row.materialCode || '').trim()
      const latestQuote = code ? this.latestQuoteByCode[code] : null
      const fromQuote = this.normalizeFilmPricingMode(latestQuote && (latestQuote.pricingMode || latestQuote.priceUomCode || latestQuote.purchaseUomCode))
      if (fromQuote) return fromQuote
      const raw = code ? (this.rawMaterials || []).find(r => r.materialCode === code) : null
      const fromRawUnit = this.normalizeFilmPricingMode(raw && raw.unit)
      if (fromRawUnit) return fromRawUnit
      const fromRow = this.normalizeFilmPricingMode(row.pricingMode)
      if (fromRow) return fromRow
      return this.isPeFoamMaterial(row) ? 'sqm' : 'kg'
    },
    isFilmWeightPricedRow(row) {
      return this.resolveFilmPricingMode(row) === 'kg'
    },
    shouldShowFilmChargeQtyColumn() {
      const rows = (this.editForm && this.editForm.filmItems) || []
      return rows.some(row => !this.isCountPricedRow(row) && this.isFilmWeightPricedRow(row))
    },
    shouldShowFilmOrderKgColumn() {
      const rows = (this.editForm && this.editForm.filmItems) || []
      return rows.some(row => !this.isCountPricedRow(row) && this.isFilmWeightPricedRow(row))
    },
    syncFilmActualQtyWithEstimated(row, force = false) {
      if (!row) return
      if (!this.isFilmWeightPricedRow(row)) return
      const manual = !!row.__actualQtyManual
      if (manual && !force) return
      const estimatedKg = this.calcFilmWeightKg(row)
      row.actualQty = estimatedKg && estimatedKg !== '0' ? estimatedKg : ''
      if (force) {
        row.__actualQtyManual = false
      }
    },
    onFilmEstimatedFieldInput(row) {
      this.syncFilmActualQtyWithEstimated(row)
    },
    onFilmActualQtyInput(row) {
      if (!row) return
      const actual = this.toDecimalNumber(row.actualQty)
      if (actual && actual > 0) {
        row.__actualQtyManual = true
        return
      }
      row.__actualQtyManual = false
      this.syncFilmActualQtyWithEstimated(row)
    },
    calcFilmActualQtyKg(row) {
      const qty = this.toDecimalNumber((row && (row.actualQty !== undefined && row.actualQty !== null && row.actualQty !== '' ? row.actualQty : row.priceQty)) || null)
      return qty && qty > 0 ? qty.toFixed(2) : '0'
    },
    calcFilmAmountQty(row) {
      if (this.isFilmWeightPricedRow(row)) {
        return Number(this.calcFilmActualQtyKg(row))
      }
      return Number(this.calcSqm(row))
    },
    isUnitPriceLocked(row) {
      return !!(row && row.unitPriceLocked)
    },
    getRawSpecHeaderLabelForEdit() {
      if (this.hasTubeRawItems()) return '规格(厚度*内径*长度)'
      if (this.hasCountPricedRawItems()) return '规格(箱规/型号)'
      return '规格'
    },
    getRawTotalHeaderLabelForEdit() {
      return this.hasCountPricedRawItems() ? '总数量' : '总数量(kg)'
    },
    getRawQtyHeaderLabelForEdit() {
      return this.hasCountPricedRawItems() ? '数量' : '数量(桶)'
    },
    getRawPriceHeaderLabelForEdit() {
      return this.hasCountPricedRawItems() ? '单价(元/个)' : '单价'
    },
    splitTubeSpecToParts(specText) {
      const text = String(specText || '').trim().replace(/[×xX]/g, '*')
      if (!text) return { thickness: '', innerDiameter: '', length: '' }
      const nums = text.match(/\d+(?:\.\d+)?/g) || []
      if (nums.length < 3) return { thickness: '', innerDiameter: '', length: '' }
      return {
        thickness: nums[0] || '',
        innerDiameter: nums[1] || '',
        length: nums[2] || ''
      }
    },
    buildTubeSpecValue(row) {
      if (!row) return ''
      const t = String(row.tubeThickness || '').trim()
      const d = String(row.tubeInnerDiameter || '').trim()
      const l = String(row.tubeLength || '').trim()
      const vals = [t, d, l]
      if (!vals.some(Boolean)) return ''
      if (vals.some(v => !v)) return String(row.rawSpec || '').trim()
      return `${t}*${d}*${l}`
    },
    onTubeSpecPartChange(row) {
      if (!row) return
      row.rawSpec = this.buildTubeSpecValue(row)
    },
    splitFilmSpecToParts(specText) {
      const text = String(specText || '').trim().replace(/[×xX]/g, '*')
      if (!text) return { thickness: '', width: '', length: '' }
      const parts = text.split('*').map(v => String(v || '').trim()).filter(Boolean)
      if (parts.length >= 3) {
        return {
          thickness: parts[0] || '',
          width: parts[1] || '',
          length: parts[2] || ''
        }
      }
      if (parts.length === 2) {
        return {
          thickness: '',
          width: parts[0] || '',
          length: parts[1] || ''
        }
      }
      const nums = text.match(/\d+(?:\.\d+)?/g) || []
      if (nums.length >= 2 && nums.length < 3) {
        return {
          thickness: '',
          width: nums[0] || '',
          length: nums[1] || ''
        }
      }
      if (nums.length < 3) return { thickness: '', width: '', length: '' }
      return {
        thickness: nums[0] || '',
        width: nums[1] || '',
        length: nums[2] || ''
      }
    },
    applyFilmSpecParts(row, specText) {
      if (!row) return
      const parts = this.splitFilmSpecToParts(specText)
      if (parts.thickness) row.thicknessDisplay = parts.thickness
      if (parts.width) row.width = parts.width
      if (parts.length) row.lengthDisplay = parts.length
    },
    buildFilmSpecRaw(row) {
      if (!row) return ''
      const t = String(row.thicknessDisplay || row.thickness || '').trim()
      const w = String(row.width || '').trim()
      const l = String(row.lengthDisplay || row.length || '').trim()
      const vals = [t, w, l]
      if (vals.some(Boolean) && vals.every(Boolean)) {
        return `${t}*${w}*${l}`
      }
      return String(row.filmSpecRaw || '').trim()
    },
    onFilmSpecRawChange(row) {
      if (!row) return
      this.applyFilmSpecParts(row, row.filmSpecRaw)
    },
    toDecimalNumber(value) {
      if (value === null || value === undefined) return null
      if (typeof value === 'number') {
        return Number.isFinite(value) ? value : null
      }
      const text = String(value).trim()
      if (!text) return null
      const matched = text.match(/-?\d+(?:\.\d+)?/)
      if (!matched || matched[0] === undefined) return null
      const n = Number(matched[0])
      return Number.isFinite(n) ? n : null
    },
    inferFilmDensity(row) {
      const text = `${(row && row.materialCode) || ''} ${(row && row.materialName) || ''} ${(row && row.filmSpecRaw) || ''}`.toUpperCase()
      if (text.includes('BOPP')) return 0.9
      if (text.includes('PS')) return 1.05
      if (text.includes('PET') || text.includes('PI')) return 1.4
      return 1.4
    },
    inferFilmThicknessFromText(row) {
      const text = `${(row && row.materialName) || ''} ${(row && row.filmSpecRaw) || ''} ${(row && row.rawSpec) || ''}`
      const code = String((row && row.materialCode) || '')
      const umMatched = text.match(/(\d+(?:\.\d+)?)\s*(?:μm|um|µm)/i)
      if (umMatched && umMatched[1] !== undefined) return umMatched[1]
      const codeT = code.match(/(?:^|[^0-9])T(\d+(?:\.\d+)?)(?:[^0-9]|$)/i)
      if (codeT && codeT[1] !== undefined) return codeT[1]
      return ''
    },
    isPeFoamMaterial(row) {
      const text = `${(row && row.materialCode) || ''} ${(row && row.materialName) || ''} ${(row && row.filmSpecRaw) || ''}`.toLowerCase()
      return /泡棉|foam|epe/.test(text)
    },
    calcFilmChargeQty(row) {
      if (this.isPeTubeRow(row)) {
        const qty = Number((row && row.rolls) || 0)
        return Number.isFinite(qty) && qty > 0 ? qty.toFixed(2) : '0'
      }
      const mode = this.resolveFilmPricingMode(row)
      if (mode === 'sqm') return this.calcSqm(row)
      return this.calcFilmWeightKg(row)
    },
    calcFilmChargeQtyForDisplay(row) {
      if (!this.isFilmWeightPricedRow(row)) return ''
      return this.calcFilmWeightKg(row)
    },
    calcFilmWeightKg(row) {
      const specParts = this.splitFilmSpecToParts((row && (row.filmSpecRaw || row.rawSpec)) || '')
      const inferredThickness = this.inferFilmThicknessFromText(row)
      const thickness = this.toDecimalNumber((row && (row.thicknessDisplay || row.thickness || specParts.thickness || inferredThickness)) || null)
      const width = this.toDecimalNumber((row && (row.width || specParts.width)) || null)
      const length = this.toDecimalNumber((row && (row.lengthDisplay || row.length || specParts.length)) || null)
      const rolls = this.toDecimalNumber((row && row.rolls) || null)
      if (!(thickness > 0) || !(width > 0) || !(length > 0) || !(rolls > 0)) return '0'
      const density = this.inferFilmDensity(row)
      // Kg = 厚度(μm) * 宽度(mm) * 长度(m) * 卷数 * 密度 / 1,000,000
      const kg = thickness * width * length * rolls * density / 1000000
      return Number.isFinite(kg) ? kg.toFixed(2) : '0'
    },
    isFilmMaterial(item) {
      if (!item) return false
      const meta = this.getRawMaterialMetaByRow(item)
      if (this.isFilmByMeta(meta)) return true
      if (this.isPackagingByMeta(meta)) return false
      const code = String(item.materialCode || '')
      const unitRaw = String(item.unit || '')
      const unit = unitRaw.toLowerCase()
      const spec = String(item.spec || '')
      const rawText = `${code} ${String(item.materialName || '')} ${spec}`.toLowerCase()
      if (/pe管|管材|胶管|纸管|纸筒|纸芯|纸箱|纸盒|carton|ctn/.test(rawText)) return false
      if ((this.specs || []).some(s => s.materialCode === code)) return true
      if (unit.includes('m') || unit.includes('㎡') || unit.includes('m²') || unit.includes('m2')) return true
      if (/^PET/i.test(code) || /膜/i.test(code)) return true
      return /薄膜|离型膜|离型纸|原膜|PET膜|平方|㎡|m²|m2/i.test(spec)
    },
    filmMaterialOptions() {
      return this.getSupplierBaseMaterials().filter(item => this.isFilmMaterial(item))
    },
    nonFilmMaterialOptions() {
      return this.getSupplierBaseMaterials().filter(item => !this.isFilmMaterial(item))
    },
    getSupplierBaseMaterials() {
      if (this.editForm && this.editForm.supplierId) {
        return this.supplierFilteredMaterials || []
      }
      if (this.supplierFilteredMaterials && this.supplierFilteredMaterials.length) {
        return this.supplierFilteredMaterials
      }
      return this.rawMaterials || []
    },
    materialOptionsForCurrentMode() {
      let list = []
      if (this.editForm.materialMode === 'film') list = this.filmMaterialOptions()
      else if (this.editForm.materialMode === 'raw') list = this.nonFilmMaterialOptions()
      else list = this.getSupplierBaseMaterials()

      const keyword = String(this.materialSearchKeyword || '').trim().toLowerCase()
      if (!keyword) return list
      return list.filter(item => {
        const code = String(item.materialCode || '').toLowerCase()
        const name = String(item.materialName || '').toLowerCase()
        return code.includes(keyword) || name.includes(keyword)
      })
    },
    handleMaterialFilter(query) {
      this.materialSearchKeyword = query || ''
    },
    detectMaterialModeByCode(code) {
      const raw = (this.rawMaterials || []).find(r => r.materialCode === code)
      if ((this.specs || []).some(s => s.materialCode === code)) {
        if (!raw) return 'film'
      }
      if (!raw) return this.editForm.materialMode || 'film'
      const rawText = `${raw.materialCode || ''} ${raw.materialName || ''} ${raw.spec || ''}`.toLowerCase()
      if (/pe管|管材|胶管/.test(rawText) || /^peg/i.test(String(raw.materialCode || ''))) {
        return 'raw'
      }
      return this.isFilmMaterial(raw) ? 'film' : 'raw'
    },
    buildSupplierMatchTokens(supplier) {
      const base = [supplier && supplier.supplierName, supplier && supplier.shortName, supplier && supplier.supplierCode]
        .map(v => String(v || '').trim())
        .filter(Boolean)
      const set = new Set(base)
      base.forEach(text => {
        const normalized = text
          .replace(/有限公司|有限责任公司|股份有限公司|新材料科技|新材料|科技|材料/g, '')
          .replace(/[()（）\-\s]/g, '')
          .trim()
        if (normalized.length >= 2) {
          set.add(normalized)
          set.add(normalized.substring(0, 2))
        }
        if (normalized.length >= 3) {
          set.add(normalized.substring(0, 3))
        }
      })
      return Array.from(set).filter(v => v && v.length >= 2)
    },
    async fetchLatestQuotationMapBySupplier(supplier) {
      try {
        const tokens = this.buildSupplierMatchTokens(supplier)
        if (!tokens.length) return {}

        const normalizeRecords = (res) => {
          const data = res && res.data
          if (!data) return []
          if (Array.isArray(data)) return data
          if (Array.isArray(data.records)) return data.records
          if (Array.isArray(data.list)) return data.list
          return []
        }

        const fetchBySupplierKeyword = async(keyword, status) => {
          if (!keyword) return []
          const res = await listPurchaseQuotations({ page: 1, size: 500, supplier: keyword, status })
          return normalizeRecords(res)
        }

        const uniqMap = new Map()
        for (const keyword of tokens) {
          const accepted = await fetchBySupplierKeyword(keyword, 'accepted')
          accepted.forEach(q => {
            const key = q && (q.id || q.quotationNo)
            if (key !== undefined && key !== null && !uniqMap.has(String(key))) {
              uniqMap.set(String(key), q)
            }
          })
        }
        if (!uniqMap.size) {
          for (const keyword of tokens) {
            const allStatus = await fetchBySupplierKeyword(keyword, '')
            allStatus.forEach(q => {
              const key = q && (q.id || q.quotationNo)
              if (key !== undefined && key !== null && !uniqMap.has(String(key))) {
                uniqMap.set(String(key), q)
              }
            })
          }
        }

        const matched = Array.from(uniqMap.values()).filter(q => {
          const supplierText = String((q && q.supplier) || '').toLowerCase()
          if (!supplierText) return false
          return tokens.some(k => {
            const text = String(k || '').toLowerCase()
            return supplierText.includes(text) || text.includes(supplierText)
          })
        })
        if (!matched.length) return {}

        const sorted = matched.sort((a, b) => {
          const ta = new Date(a.quotationDate || a.createdAt || 0).getTime()
          const tb = new Date(b.quotationDate || b.createdAt || 0).getTime()
          return tb - ta
        })

        const detailTargets = sorted.slice(0, 80)
        const detailList = await Promise.all(detailTargets.map(async q => {
          const detailRes = await getPurchaseQuotationDetail(q.id)
          return detailRes && (detailRes.code === 200 || detailRes.code === 20000) ? detailRes.data : null
        }))

        const latestMap = {}
        detailList.forEach(detail => {
          const items = (detail && detail.items) || []
          items.forEach(item => {
            const code = String(item.materialCode || '').trim()
            if (!code || latestMap[code]) return
            latestMap[code] = {
              unitPrice: item.unitPrice,
              specifications: item.specifications,
              materialName: item.materialName,
              pricingMode: item.pricingMode,
              priceUomCode: item.priceUomCode,
              purchaseUomCode: item.purchaseUomCode
            }
          })
        })
        return latestMap
      } catch (e) {
        console.error('获取供应商最新报价失败', e)
        return {}
      }
    },
    async onMaterialCodeChange(row, code) {
      const mode = this.detectMaterialModeByCode(code)
      if (!this.editForm.materialMode) {
        this.editForm.materialMode = mode
      }
      if (this.editForm.materialMode !== mode) {
        this.editForm.materialMode = mode
        if (mode === 'film') {
          this.editForm.rawItems = []
          this.editForm.filmItems = [{ materialCode: code, materialName: '', filmSpecRaw: '', colorCode: '', thicknessDisplay: '', width: '', lengthDisplay: '', rolls: '', pricingMode: '', actualQty: '', __actualQtyManual: false, unitPrice: '', unitPriceLocked: false, remark: '' }]
          row = this.editForm.filmItems[0]
        } else {
          this.editForm.filmItems = []
          this.editForm.rawItems = [{ materialCode: code, materialName: '', rawSpec: '', quantity: '', totalWeight: '', unitPrice: '', remark: '' }]
          row = this.editForm.rawItems[0]
        }
      }

      const raw = this.rawMaterials.find(r => r.materialCode === code)
      const latestQuote = this.latestQuoteByCode[code]
      if (raw) {
        row.materialName = raw.materialName
      }
      if (mode === 'film') {
        const spec = this.specs.find(s => s.materialCode === code)
        if (spec) {
          if (!row.materialName) row.materialName = spec.productName
          row.colorCode = spec.colorCode
          row.thicknessDisplay = spec.totalThickness
          row.width = spec.width
          row.lengthDisplay = spec.length
          row.filmSpecRaw = this.buildFilmSpecRaw(row)
        } else if (latestQuote && latestQuote.specifications) {
          row.filmSpecRaw = String(latestQuote.specifications || '').trim()
          this.applyFilmSpecParts(row, row.filmSpecRaw)
        } else if (raw && raw.spec) {
          row.filmSpecRaw = String(raw.spec || '').trim()
          this.applyFilmSpecParts(row, row.filmSpecRaw)
        }
        if (latestQuote && latestQuote.unitPrice !== null && latestQuote.unitPrice !== undefined) {
          row.unitPrice = latestQuote.unitPrice
          row.unitPriceLocked = true
        } else {
          row.unitPriceLocked = false
        }
        row.pricingMode = this.resolveFilmPricingMode({ ...row, materialCode: code })
        if (row.pricingMode !== 'kg') {
          row.actualQty = ''
          row.__actualQtyManual = false
        } else {
          this.syncFilmActualQtyWithEstimated(row)
        }
      } else {
        row.rawSpec = this.normalizeRawSpecValue((latestQuote && latestQuote.specifications) || (raw && raw.spec) || row.rawSpec || '', row)
        this.pushRawSpecHistoryOption(code, row.rawSpec, row)
        if (latestQuote && latestQuote.specifications) {
          this.pushRawSpecHistoryOption(code, latestQuote.specifications, row)
        }
        if (this.isTubeRow(row)) {
          const tubeParts = this.splitTubeSpecToParts(row.rawSpec)
          row.tubeThickness = tubeParts.thickness
          row.tubeInnerDiameter = tubeParts.innerDiameter
          row.tubeLength = tubeParts.length
        }
        if (latestQuote && latestQuote.unitPrice !== null && latestQuote.unitPrice !== undefined) {
          row.unitPrice = latestQuote.unitPrice
        }
        await this.loadRawSpecHistoryForRow(row)
      }
    },
    addFilmItem(setMode = true) {
      if (setMode) {
        this.editForm.materialMode = 'film'
      }
      this.editForm.filmItems.push({
        materialCode: '',
        materialName: '',
        filmSpecRaw: '',
        colorCode: '',
        thicknessDisplay: '',
        width: '',
        lengthDisplay: '',
        rolls: '',
        pricingMode: '',
        actualQty: '',
        __actualQtyManual: false,
        unitPrice: '',
        unitPriceLocked: false,
        remark: '',
        __editing: true
      })
    },
    removeFilmItem(row, index) {
      const list = this.editForm.filmItems || []
      const next = list.filter((item, i) => {
        if (row && row.id !== undefined && row.id !== null && item && item.id !== undefined && item.id !== null) {
          return item.id !== row.id
        }
        if (item === row) return false
        return i !== index
      })
      this.editForm.filmItems = next
      this.$forceUpdate()
    },
    addRawItem() {
      this.editForm.materialMode = 'raw'
      this.editForm.rawItems.push({
        materialCode: '',
        materialName: '',
        rawSpec: '',
        tubeThickness: '',
        tubeInnerDiameter: '',
        tubeLength: '',
        quantity: '',
        totalWeight: '',
        unitPrice: '',
        remark: '',
        __editing: true
      })
    },
    isRowEditable(row) {
      if (!this.isEditing) return true
      return !!(row && row.__editing)
    },
    enableRowEdit(row) {
      if (!row) return
      this.$set(row, '__editing', true)
    },
    disableRowEdit(mode, row) {
      if (!row) return
      if (mode === 'raw') {
        row.rawSpec = this.normalizeRawSpecValue(row.rawSpec, row)
      }
      this.$set(row, '__editing', false)
    },
    addItem() {
      if (this.editForm.materialMode === 'raw') {
        this.addRawItem()
      } else {
        this.addFilmItem()
      }
    },
    removeItem(mode, row, index) {
      if (mode === 'raw') {
        this.removeRawItem(row, index)
      } else {
        this.removeFilmItem(row, index)
      }
    },
    removeRawItem(row, index) {
      const list = this.editForm.rawItems || []
      const next = list.filter((item, i) => {
        if (row && row.id !== undefined && row.id !== null && item && item.id !== undefined && item.id !== null) {
          return item.id !== row.id
        }
        if (item === row) return false
        return i !== index
      })
      this.editForm.rawItems = next
      this.$forceUpdate()
    },
    normalizeRawSpecValue(value, row = null) {
      const text = String(value || '').trim()
      if (!text) return ''
      if (this.isTubeRow(row)) {
        const parts = this.splitTubeSpecToParts(text)
        if (parts.thickness && parts.innerDiameter && parts.length) {
          return `${parts.thickness}*${parts.innerDiameter}*${parts.length}`
        }
        return text
      }
      if (this.isCartonRow(row)) {
        return text
      }
      const hasKgBucketText = /(kg|公斤|千克|桶)/i.test(text)
      if (hasKgBucketText) {
        const kg = this.parseSpecKg(text)
        if (kg && kg > 0) {
          return `${this.formatPurchaseSpecNumber(kg)}Kg/桶`
        }
      }
      const firstNum = text.match(/([0-9]+(?:\.[0-9]+)?)/)
      if (!firstNum || firstNum[1] === undefined) return text
      const n = Number(firstNum[1])
      if (!Number.isFinite(n) || n <= 0) return text
      const normalized = Number.isInteger(n) ? String(n) : String(n)
      return normalized
    },
    onRawSpecChange(row, value) {
      if (!row) return
      row.rawSpec = this.normalizeRawSpecValue(value, row)
      this.pushRawSpecHistoryOption(row.materialCode, row.rawSpec, row)
      if (this.isTubeRow(row)) {
        const tubeParts = this.splitTubeSpecToParts(row.rawSpec)
        row.tubeThickness = tubeParts.thickness
        row.tubeInnerDiameter = tubeParts.innerDiameter
        row.tubeLength = tubeParts.length
      }
    },
    parseSpecKg(spec) {
      if (!spec) return null
      const text = String(spec).trim()
      // 1) 严格匹配: 180Kg/桶、180 kg/桶、180公斤/桶、180千克/桶
      const kgPerBucket = text.match(/([0-9]+(?:\.[0-9]+)?)\s*(kg|KG|Kg|公斤|千克)\s*(\/|每)\s*桶/i)
      if (kgPerBucket && kgPerBucket[1] !== undefined) {
        const v = Number(kgPerBucket[1])
        if (Number.isFinite(v) && v > 0) return v
      }
      // 2) 次级匹配: 180Kg、180公斤、180千克
      const kgOnly = text.match(/([0-9]+(?:\.[0-9]+)?)\s*(kg|KG|Kg|公斤|千克)/i)
      if (kgOnly && kgOnly[1] !== undefined) {
        const v = Number(kgOnly[1])
        if (Number.isFinite(v) && v > 0) return v
      }
      // 3) 兼容纯数字: 180
      const plain = Number(text)
      if (Number.isFinite(plain) && plain > 0) return plain
      return null
    },
    formatPurchaseSpecNumber(value) {
      const n = Number(value)
      if (!Number.isFinite(n) || n <= 0) return ''
      if (Number.isInteger(n)) return String(n)
      return String(Number(n.toFixed(3))).replace(/\.0+$/, '')
    },
    isPurchasePrintChemicalItem(item) {
      if (!item || this.isPurchaseFilmItem(item) || this.isCountPricedRow(item)) return false
      const raw = (this.rawMaterials || []).find(r => r.materialCode === item.materialCode)
      const text = [
        item.materialCode,
        item.materialName,
        item.rawSpec,
        raw && raw.materialName,
        raw && raw.spec
      ].map(v => String(v || '').trim()).join(' ').toLowerCase()
      return /胶水|固化剂|树脂|色浆|溶剂|阻燃剂/.test(text)
    },
    isPurchasePrintKgPricedItem(item) {
      if (!item || this.isPurchaseFilmItem(item) || this.isCountPricedRow(item)) return false
      const raw = (this.rawMaterials || []).find(r => r.materialCode === item.materialCode)
      const mode = this.normalizeFilmPricingMode(item.pricingMode || item.priceUomCode || item.purchaseUomCode || item.quotedPricingMode || (raw && raw.unit))
      if (mode === 'kg') return true
      const unitText = [item.priceUomCode, item.purchaseUomCode, item.pricingMode, raw && raw.unit]
        .map(v => String(v || '').trim().toLowerCase())
        .join(' ')
      return unitText.includes('kg') || unitText.includes('公斤') || unitText.includes('千克')
    },
    calcRawTotalWeight(row) {
      const qty = this.toDecimalNumber(row && row.quantity)
      if (!(qty > 0)) return '0'
      if (this.isCountPricedRow(row)) {
        return qty.toFixed(2)
      }
      if (this.isChemicalRow(row)) {
        const kgPerBucket = this.parseSpecKg(row && row.rawSpec)
        if (kgPerBucket && kgPerBucket > 0) {
          return (qty * kgPerBucket).toFixed(2)
        }
      }
      const kgPerBucket = this.parseSpecKg(row && row.rawSpec)
      if (kgPerBucket && kgPerBucket > 0) {
        return (qty * kgPerBucket).toFixed(2)
      }
      return qty.toFixed(2)
    },
    calcRawAmount(row) {
      const weight = Number(this.calcRawTotalWeight(row) || 0)
      const price = Number(row.unitPrice || 0)
      if (!weight || !price) return '0'
      return (weight * price).toFixed(2)
    },
    calcSqm(row) {
      if (!row) return '0'
      const width = this.toDecimalNumber(row.width)
      const length = this.toDecimalNumber(row.lengthDisplay || row.length)
      const rolls = this.toDecimalNumber(row.rolls)
      if (width > 0 && length > 0 && rolls > 0) {
        const sqm = (width / 1000) * length * rolls
        return Number.isFinite(sqm) ? sqm.toFixed(2) : '0'
      }
      const backendArea = row.sqm || row.area || row.squareMeter
      if (backendArea !== undefined && backendArea !== null && backendArea !== '') {
        const n = Number(backendArea)
        return Number.isFinite(n) ? n.toFixed(2) : '0'
      }
      return '0'
    },
    isLikelyFilmRow(row) {
      if (!row) return false
      if (this.isCountPricedRow(row)) return false
      const meta = this.getRawMaterialMetaByRow(row)
      if (this.isChemicalByMeta(meta) || this.isPackagingByMeta(meta)) return false
      if (this.isFilmByMeta(meta)) return true
      const mode = this.normalizeFilmPricingMode(row.pricingMode || row.priceUomCode || row.purchaseUomCode)
      if (mode === 'sqm') return true
      const width = this.toDecimalNumber(row.width)
      const length = this.toDecimalNumber(row.lengthDisplay || row.length)
      if (width > 0 && length > 0) return true
      const filmSpecText = String(row.filmSpecRaw || '').trim()
      if (filmSpecText) {
        const parts = this.splitFilmSpecToParts(filmSpecText)
        if ((this.toDecimalNumber(parts.width) > 0 && this.toDecimalNumber(parts.length) > 0) || /mm|μm|um|m\b/i.test(filmSpecText)) {
          return true
        }
      }
      const code = String(row.materialCode || '').trim()
      const raw = code ? (this.rawMaterials || []).find(r => r.materialCode === code) : null
      return !!(raw && this.isFilmMaterial(raw))
    },
    calcAmount(row) {
      const isFilm = this.isLikelyFilmRow(row)
      if (!isFilm) {
        return this.calcRawAmount({
          rawSpec: row.rawSpec,
          quantity: row.rolls,
          totalWeight: row.sqm,
          unitPrice: row.unitPrice
        })
      }
      const filmQty = this.calcFilmAmountQty(row)
      const price = parseFloat(row.unitPrice || 0)
      if (!filmQty || !price) return '0'
      return (filmQty * price).toFixed(2)
    },
    totalAmount(order) {
      if (!order || !order.items) return 0
      return order.items.reduce((sum, item) => sum + Number(this.calcAmount(item)), 0).toFixed(2)
    },
    totalArea(order) {
      if (!order || !order.items) return 0
      return order.items.reduce((sum, item) => sum + Number(this.calcSqm(item)), 0).toFixed(2)
    },
    totalQuantity(order) {
      if (!order || !order.items) return 0
      return order.items.reduce((sum, item) => {
        const qty = Number(item.sqm !== undefined && item.sqm !== null ? item.sqm : this.calcSqm(item))
        return sum + (Number.isFinite(qty) ? qty : 0)
      }, 0).toFixed(2)
    },
    detailHasFilmDimensions() {
      const items = (this.currentOrder && this.currentOrder.items) || []
      return items.some(item => this.isPurchaseFilmItem(item))
    },
    getDetailSpecHeaderLabel() {
      const items = (this.currentOrder && this.currentOrder.items) || []
      const hasTube = items.some(item => !this.isPurchaseFilmItem(item) && this.isTubeRow(item))
      if (this.detailHasFilmDimensions()) return '规格'
      return hasTube ? '规格(厚度*内径*长度)' : '规格(Kg/桶)'
    },
    getDetailQtyHeaderLabel() {
      return this.detailHasFilmDimensions() ? '卷数' : '数量'
    },
    getDetailTotalHeaderLabel() {
      const items = (this.currentOrder && this.currentOrder.items) || []
      const hasTube = items.some(item => !this.isPurchaseFilmItem(item) && this.isTubeRow(item))
      if (this.detailHasFilmDimensions()) return '平米数'
      return hasTube ? '总数量' : '总重(kg)'
    },
    getDetailQtyValue(row) {
      if (!row) return ''
      return row.rolls !== undefined && row.rolls !== null && row.rolls !== '' ? row.rolls : ''
    },
    getDetailTotalValue(row) {
      if (!row) return ''
      return row.sqm !== undefined && row.sqm !== null && row.sqm !== ''
        ? row.sqm
        : this.calcSqm(row)
    },
    getEditActiveItems() {
      const mode = this.editForm.materialMode || (this.editForm.rawItems.length ? 'raw' : 'film')
      return mode === 'raw' ? (this.editForm.rawItems || []) : (this.editForm.filmItems || [])
    },
    editTotalQuantity() {
      const items = this.getEditActiveItems()
      const mode = this.editForm.materialMode || (this.editForm.rawItems.length ? 'raw' : 'film')
      return items.reduce((sum, item) => {
        const qty = mode === 'raw'
          ? Number(this.calcRawTotalWeight(item))
          : Number(this.calcFilmAmountQty(item))
        return sum + (Number.isFinite(qty) ? qty : 0)
      }, 0).toFixed(2)
    },
    editTotalAmount() {
      const items = this.getEditActiveItems()
      return items.reduce((sum, item) => {
        const isRaw = this.editForm.materialMode === 'raw' || !this.isLikelyFilmRow(item)
        const amount = isRaw
          ? Number(this.calcRawAmount(item))
          : Number(this.calcAmount(item))
        return sum + (Number.isFinite(amount) ? amount : 0)
      }, 0).toFixed(2)
    },
    formatSpec(item) {
      if (item && item.filmSpecRaw) return item.filmSpecRaw
      const t = item.thicknessDisplay || item.thickness || ''
      const w = item.width || ''
      const l = item.lengthDisplay || item.length || ''
      const filmSpec = [t, w, l].filter(Boolean).join('*')
      if (filmSpec) return filmSpec
      if (item && item.rawSpec) return item.rawSpec
      const raw = this.rawMaterials.find(r => r.materialCode === item.materialCode)
      return (raw && raw.spec) || ''
    },
    formatNumber(val) {
      return val === undefined || val === null ? '-' : Number(val).toFixed(2)
    },
    reconciliationText(status) {
      return getPurchaseReconciliationMeta(status).text
    },
    reconciliationTag(status) {
      return getPurchaseReconciliationMeta(status).tag
    },
    purchaseStatusText(status) {
      return getPurchaseStatusMeta(status).text
    },
    purchaseStatusTag(status) {
      return getPurchaseStatusMeta(status).tag
    },
    async saveOrder() {
      if (!this.editForm.supplier) {
        this.$message.warning('请选择供应商')
        return
      }
      const currentMode = this.editForm.materialMode || (this.editForm.rawItems.length ? 'raw' : 'film')
      const activeItems = currentMode === 'raw' ? this.editForm.rawItems : this.editForm.filmItems
      if (!activeItems.length) {
        this.$message.warning('请至少添加一条明细')
        return
      }
      if (currentMode === 'film') {
        const invalidKgRow = (this.editForm.filmItems || []).find(item => {
          if (this.isCountPricedRow(item) || !this.isFilmWeightPricedRow(item)) return false
          const actual = this.toDecimalNumber(item.actualQty)
          return !(actual && actual > 0)
        })
        if (invalidKgRow) {
          this.$message.warning('公斤计价物料请填写实际数量(Kg)')
          return
        }
      }

      const filmItems = this.editForm.filmItems.map(item => ({
        id: item.id,
        materialCode: item.materialCode,
        materialName: item.materialName,
        filmSpecRaw: this.buildFilmSpecRaw(item),
        colorCode: item.colorCode,
        thickness: this.toDecimalNumber(item.thicknessDisplay),
        width: this.toDecimalNumber(item.width),
        length: this.toDecimalNumber(item.lengthDisplay),
        rolls: this.toDecimalNumber(item.rolls),
        sqm: this.toDecimalNumber(this.calcSqm(item)),
        purchaseQty: this.isFilmWeightPricedRow(item)
          ? this.toDecimalNumber(item.actualQty)
          : this.toDecimalNumber(item.rolls),
        purchaseUomCode: this.isFilmWeightPricedRow(item) ? 'KG' : 'ROLL',
        stockQty: this.isFilmWeightPricedRow(item)
          ? this.toDecimalNumber(item.actualQty)
          : this.toDecimalNumber(this.calcSqm(item)),
        stockUomCode: this.isFilmWeightPricedRow(item) ? 'KG' : 'M2',
        priceQty: this.isFilmWeightPricedRow(item)
          ? this.toDecimalNumber(item.actualQty)
          : this.toDecimalNumber(this.calcSqm(item)),
        priceUomCode: this.isFilmWeightPricedRow(item) ? 'KG' : 'M2',
        unitPrice: this.toDecimalNumber(item.unitPrice),
        amount: Number(this.calcAmount(item)),
        remark: item.remark
      }))

      const rawItems = this.editForm.rawItems.map(item => ({
        id: item.id,
        materialCode: item.materialCode,
        materialName: item.materialName,
        rawSpec: this.normalizeRawSpecValue(this.isTubeRow(item) ? this.buildTubeSpecValue(item) : item.rawSpec, item),
        colorCode: null,
        thickness: null,
        width: null,
        length: null,
        rolls: item.quantity ? Number(item.quantity) : null,
        sqm: Number(this.calcRawTotalWeight(item)),
        unitPrice: item.unitPrice ? Number(item.unitPrice) : null,
        amount: Number(this.calcRawAmount(item)),
        remark: item.remark
      }))

      const payload = {
        ...this.editForm,
        orderDate: this.normalizeDateOnly(this.editForm.orderDate),
        deliveryDate: this.normalizeDateOnly(this.editForm.deliveryDate),
        items: currentMode === 'raw' ? rawItems : filmItems
      }

      const apiCall = this.isEditing ? updatePurchaseOrder(payload) : createPurchaseOrder(payload)
      try {
        const res = await apiCall
        if (res && (res.code === 200 || res.code === 20000)) {
          this.$message.success(this.isEditing ? '更新成功' : '创建成功')
          this.editVisible = false
          this.fetchOrders()
        } else {
          this.$message.error('保存失败')
        }
      } catch (e) {
        console.error('保存采购订单失败', e)
        this.$message.error('保存采购订单失败')
      }
    },
    confirmDelete(row) {
      this.$confirm(`确认删除采购单 ${row.orderNo} 吗？`, '提示', { type: 'warning' })
        .then(() => deletePurchaseOrder(row.orderNo))
        .then(res => {
          if (res && (res.code === 200 || res.code === 20000)) {
            this.$message.success('删除成功')
            this.fetchOrders()
          } else {
            this.$message.error(res.message || '删除失败')
          }
        })
        .catch(() => {})
    },
    async viewDetail(row) {
      const detail = await this.loadOrderDetail(row.orderNo)
      this.currentOrder = detail || row
      this.detailVisible = true
    },
    async openReconciliation(row) {
      this.reconciliationVisible = true
      this.reconciliationLoading = true
      this.reconciliationSummary = null
      try {
        const res = await getPurchaseOrderReconciliation(row.orderNo)
        if (res && (res.code === 200 || res.code === 20000)) {
          this.reconciliationSummary = res.data || null
        } else {
          this.$message.error((res && res.message) || '获取对账信息失败')
        }
      } finally {
        this.reconciliationLoading = false
      }
    },
    async printOrder(row) {
      try {
        if (!this.suppliers || !this.suppliers.length) {
          await this.fetchSuppliers()
        }
        const res = await getPurchaseOrderDetail(row.orderNo)
        if (!(res && (res.code === 200 || res.code === 20000) && res.data)) {
          this.$message.error('获取打印数据失败')
          return
        }
        const order = res.data || {}
        const fullSupplierName = this.resolveSupplierFullName(order.supplier, order.supplierId)
        this.currentPrint = {
          ...order,
          supplierFullName: fullSupplierName,
          items: (order.items || []).map(item => ({
            ...item,
            thicknessDisplay: item.thicknessDisplay || item.thickness,
            lengthDisplay: item.lengthDisplay || item.length
          }))
        }
        this.printVisible = true
      } catch (e) {
        console.error('打印失败', e)
        this.$message.error('打印失败')
      }
    },
    formatPurchasePrintDate(value) {
      if (!value) return ''
      if (typeof value === 'string') {
        return value.replace(/-/g, '/').substring(0, 10)
      }
      const dt = new Date(value)
      if (Number.isNaN(dt.getTime())) return ''
      const y = dt.getFullYear()
      const m = String(dt.getMonth() + 1).padStart(2, '0')
      const d = String(dt.getDate()).padStart(2, '0')
      return `${y}/${m}/${d}`
    },
    formatPurchasePrintDateTime(value) {
      if (!value) return ''
      if (typeof value === 'string') {
        const text = String(value).trim()
        if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
          return `${text} 00:00:00`
        }
        return text.replace('T', ' ')
      }
      const dt = new Date(value)
      if (Number.isNaN(dt.getTime())) return ''
      const y = dt.getFullYear()
      const m = String(dt.getMonth() + 1).padStart(2, '0')
      const d = String(dt.getDate()).padStart(2, '0')
      const hh = String(dt.getHours()).padStart(2, '0')
      const mm = String(dt.getMinutes()).padStart(2, '0')
      const ss = String(dt.getSeconds()).padStart(2, '0')
      return `${y}-${m}-${d} ${hh}:${mm}:${ss}`
    },
    getPurchasePrintRows() {
      const rows = (this.currentPrint && this.currentPrint.items) || []
      return rows.filter(item => !this.isPurchasePrintRowEmpty(item))
    },
    isCountPrintTemplate() {
      const rows = this.getPurchasePrintRows()
      return rows.length > 0 && rows.every(item => this.isCountPricedRow(item))
    },
    isChemicalPrintTemplate() {
      const rows = this.getPurchasePrintRows()
      return rows.length > 0 && rows.every(item => !this.isPurchaseFilmItem(item) && !this.isCountPricedRow(item))
    },
    isPurchaseFilmWeightPriced(item) {
      if (!this.isPurchaseFilmItem(item)) return false
      const mode = this.normalizeFilmPricingMode(item && (item.pricingMode || item.priceUomCode || item.purchaseUomCode))
      return mode === 'kg'
    },
    isFilmWeightPrintTemplate() {
      const rows = this.getPurchasePrintRows()
      return rows.length > 0 && rows.every(item => this.isPurchaseFilmItem(item) && this.isPurchaseFilmWeightPriced(item))
    },
    shouldShowFilmDimensionColumns() {
      if (this.isCountPrintTemplate()) return false
      return this.getPurchasePrintRows().some(item => this.isPurchaseFilmItem(item))
    },
    shouldShowPrintRollColumn() {
      return this.shouldShowFilmDimensionColumns() || this.isCountPrintTemplate() || this.isChemicalPrintTemplate()
    },
    shouldShowPurchasePrintQuantityColumn() {
      return !this.isCountPrintTemplate()
    },
    getPurchasePrintRollHeaderLabel() {
      if (this.isChemicalPrintTemplate()) return '桶数'
      return this.isCountPrintTemplate() ? '个数' : '数量/R'
    },
    getPurchasePrintRollValue(item) {
      if (!item) return ''
      if (this.isCountPrintTemplate()) {
        const qty = item.rolls !== undefined && item.rolls !== null && item.rolls !== '' ? item.rolls : item.quantity
        return qty === undefined || qty === null || qty === '' ? '' : this.formatPurchaseMoney(qty)
      }
      if (this.isPurchaseFilmItem(item)) {
        return item.rolls || ''
      }
      if (this.isChemicalPrintTemplate()) {
        const raw = this.rawMaterials.find(r => r.materialCode === item.materialCode)
        const kgPerBucket = this.parseSpecKg(item.rawSpec || (raw && raw.spec))
        const totalQty = Number(item.sqm !== undefined && item.sqm !== null ? item.sqm : this.calcRawTotalWeight(item))
        const bucketQty = (kgPerBucket > 0 && totalQty > 0) ? (totalQty / kgPerBucket) : NaN
        return Number.isFinite(bucketQty) ? this.formatPurchaseMoney(bucketQty) : ''
      }
      return ''
    },
    getPurchasePrintQuantityHeaderLabel() {
      if (this.isFilmWeightPrintTemplate()) return '下单重量/Kg'
      return this.isChemicalPrintTemplate() ? '总数量' : '数量'
    },
    isTubeLikePrintRow(item) {
      return this.isTubeRow(item) || this.isPeTubeRow(item)
    },
    formatDimensionSpecWithMm(specText, labels = []) {
      const text = String(specText || '').trim().replace(/[×xX]/g, '*')
      if (!text) return ''
      const nums = text.match(/\d+(?:\.\d+)?/g) || []
      if (nums.length >= 3) {
        const [a, b, c] = nums
        const [la, lb, lc] = labels
        return `${la || ''}${a}mm*${lb || ''}${b}mm*${lc || ''}${c}mm`
      }
      return text
    },
    getPurchasePrintSpecHeaderLabel() {
      const rows = this.getPurchasePrintRows()
      const hasTube = rows.some(item => !this.isPurchaseFilmItem(item) && this.isTubeLikePrintRow(item))
      const allTube = rows.length > 0 && rows.every(item => !this.isPurchaseFilmItem(item) && this.isTubeLikePrintRow(item))
      const allCarton = rows.length > 0 && rows.every(item => !this.isPurchaseFilmItem(item) && this.isCartonRow(item))
      if (this.shouldShowFilmDimensionColumns()) return '规格型号'
      if (this.isCountPrintTemplate()) {
        if (allTube) return '规格(厚度mm*内径mm*长mm)'
        if (allCarton) return '规格(长mm*宽mm*高mm)'
        return hasTube ? '规格(厚度mm*内径mm*长mm)' : '规格(长mm*宽mm*高mm)'
      }
      return hasTube ? '规格(厚度mm*内径mm*长mm)' : '规格'
    },
    getPurchasePrintColumnCount() {
      if (this.isChemicalPrintTemplate()) return 9
      if (this.isCountPrintTemplate()) return 8
      return this.shouldShowFilmDimensionColumns() ? 11 : 8
    },
    getPurchasePrintPriceHeaderLabel() {
      if (this.isCountPrintTemplate()) return '单价/元/pcs'
      if (this.isFilmWeightPrintTemplate()) return '单价/元/Kg'
      if (this.isChemicalPrintTemplate()) return '单价/元/kg'
      return '单价/元/㎡'
    },
    getPurchasePrintAmountHeaderLabel() {
      return '金额/元'
    },
    printFilmDimensionColStyle() {
      return 'width: 52px;'
    },
    printColStyle(col) {
      if (this.isCountPrintTemplate()) {
        const map = {
          code: 'width: 90px;',
          name: 'width: 165px;',
          spec: 'width: 105px;',
          unit: 'width: 58px;',
          roll: 'width: 74px;',
          qty: 'width: 72px;',
          price: 'width: 74px;',
          amount: 'width: 109px;',
          date: 'width: 114px;'
        }
        return map[col] || ''
      }
      const map = {
        code: 'width: 118px;',
        name: 'width: 136px;',
        spec: 'width: 152px;',
        unit: 'width: 58px;',
        roll: 'width: 60px;',
        qty: 'width: 80px;',
        price: 'width: 68px;',
        amount: 'width: 96px;',
        date: 'width: 98px;'
      }
      return map[col] || ''
    },
    isPurchasePrintRowEmpty(item) {
      if (!item) return true
      const code = String(item.materialCode || '').trim()
      const name = String(item.materialName || '').trim()
      const qty = Number(this.isPurchaseFilmItem(item)
        ? (item.sqm !== undefined && item.sqm !== null ? item.sqm : this.calcSqm(item))
        : (item.sqm !== undefined && item.sqm !== null ? item.sqm : this.calcRawTotalWeight(item)))
      return !code && !name && (!Number.isFinite(qty) || qty <= 0)
    },
    getPurchasePrintSupplierName() {
      if (!this.currentPrint) return ''
      return this.currentPrint.supplierFullName || this.currentPrint.supplier || ''
    },
    getPurchasePrintHeaderRemark() {
      if (!this.currentPrint) return ''
      return String(this.currentPrint.remark || '').trim()
    },
    resolveSupplierFullName(supplierText, supplierId) {
      if (supplierId) {
        const byId = this.suppliers.find(s => s.id === supplierId)
        if (byId && byId.supplierName) return byId.supplierName
      }
      const text = String(supplierText || '').trim()
      if (!text) return ''
      const matched = this.suppliers.find(s => {
        const values = [s.supplierName, s.shortName, s.supplierCode].map(v => String(v || '').trim())
        return values.some(v => v && (v === text || text.includes(v) || v.includes(text)))
      })
      return (matched && matched.supplierName) || text
    },
    getOrderSupplierFullName(order) {
      if (!order) return ''
      return this.resolveSupplierFullName(order.supplier, order.supplierId)
    },
    resolveSupplierShortName(supplierText, supplierId) {
      if (supplierId) {
        const byId = this.suppliers.find(s => s.id === supplierId)
        if (byId) {
          return byId.shortName || byId.supplierName || byId.supplierCode || ''
        }
      }
      const text = String(supplierText || '').trim()
      if (!text) return ''
      const matched = this.suppliers.find(s => {
        const values = [s.supplierName, s.shortName, s.supplierCode].map(v => String(v || '').trim())
        return values.some(v => v && (v === text || text.includes(v) || v.includes(text)))
      })
      return (matched && (matched.shortName || matched.supplierName || matched.supplierCode)) || text
    },
    getOrderSupplierShortName(order) {
      if (!order) return ''
      return this.resolveSupplierShortName(order.supplier, order.supplierId)
    },
    isPurchaseFilmItem(item) {
      if (!item) return false
      if (this.isCountPricedRow(item)) return false
      if (item.width !== null && item.width !== undefined && item.length !== null && item.length !== undefined) return true
      return !!String(item.filmSpecRaw || '').trim()
    },
    ensurePurchaseFilmDimUnit(value, unit) {
      const text = String(value == null ? '' : value).trim()
      if (!text) return ''
      if (/[a-zA-Zμ㎡㎜]/.test(text)) return text
      return `${text}${unit}`
    },
    normalizePurchaseFilmSpecWithUnit(specText) {
      const raw = String(specText || '').trim()
      if (!raw) return ''
      const normalized = raw.replace(/[×xX]/g, '*')
      const parts = normalized.split('*').map(s => String(s || '').trim()).filter(Boolean)
      if (parts.length < 3) return raw
      const p0 = this.ensurePurchaseFilmDimUnit(parts[0], 'μm')
      const p1 = this.ensurePurchaseFilmDimUnit(parts[1], 'mm')
      const p2 = this.ensurePurchaseFilmDimUnit(parts[2], 'm')
      return `${p0}*${p1}*${p2}`
    },
    getPurchasePrintSpec(item) {
      if (!item) return ''
      const raw = this.rawMaterials.find(r => r.materialCode === item.materialCode)
      if (this.isCountPricedRow(item)) {
        return item.rawSpec || (raw && raw.spec) || ''
      }
      if (item.filmSpecRaw) return this.normalizePurchaseFilmSpecWithUnit(item.filmSpecRaw)
      const filmSpec = [item.thicknessDisplay || item.thickness || '', item.width || '', item.lengthDisplay || item.length || '']
        .filter(v => v !== null && v !== undefined && String(v).trim() !== '')
        .join('*')
      if (filmSpec) return this.normalizePurchaseFilmSpecWithUnit(filmSpec)
      const baseSpec = item.rawSpec || (raw && raw.spec) || ''
      if (this.isPurchasePrintChemicalItem(item) || this.isPurchasePrintKgPricedItem(item)) {
        const kg = this.parseSpecKg(baseSpec)
        if (kg && kg > 0) {
          return `${this.formatPurchaseSpecNumber(kg)}Kg/桶`
        }
      }
      return baseSpec
    },
    getPurchasePrintUnit(item) {
      if (!item) return ''
      if (this.isCountPricedRow(item)) return this.formatUnitDisplay('pcs')
      if (this.isPurchaseFilmItem(item)) {
        if (this.isPurchaseFilmWeightPriced(item)) return this.formatUnitDisplay('kg')
        return this.formatUnitDisplay('㎡')
      }
      const raw = this.rawMaterials.find(r => r.materialCode === item.materialCode)
      const unit = (raw && raw.unit) || item.purchaseUomCode || item.priceUomCode || 'KG'
      return this.formatUnitDisplay(unit)
    },
    getPurchasePrintQuantity(item) {
      if (!item) return ''
      if (this.isCountPrintTemplate()) return ''
      if (this.isPurchaseFilmItem(item)) {
        if (this.isPurchaseFilmWeightPriced(item)) {
          const qty = item.priceQty !== undefined && item.priceQty !== null && item.priceQty !== ''
            ? item.priceQty
            : (item.purchaseQty !== undefined && item.purchaseQty !== null && item.purchaseQty !== ''
                ? item.purchaseQty
                : item.sqm)
          return this.formatPurchaseMoney(qty)
        }
        return this.formatPurchaseMoney(item.sqm !== undefined && item.sqm !== null ? item.sqm : this.calcSqm(item))
      }
      return this.formatPurchaseMoney(item.sqm !== undefined && item.sqm !== null ? item.sqm : this.calcRawTotalWeight(item))
    },
    getPurchasePrintTotalQtyLabel() {
      if (this.isFilmWeightPrintTemplate()) return '下单重量(Kg)：'
      if (this.isChemicalPrintTemplate()) return '总数量：'
      return this.isCountPrintTemplate() ? '个数：' : '数量：'
    },
    getPurchasePrintAmount(item) {
      if (!item) return 0
      return item.amount !== undefined && item.amount !== null && item.amount !== ''
        ? Number(item.amount)
        : Number(this.calcAmount(item))
    },
    getPurchasePrintTotalQty() {
      if (this.isCountPrintTemplate()) {
        return this.getPurchasePrintRows().reduce((sum, item) => {
          const qty = Number(item.rolls !== undefined && item.rolls !== null && item.rolls !== '' ? item.rolls : item.quantity)
          return sum + (Number.isFinite(qty) ? qty : 0)
        }, 0)
      }
      if (this.isFilmWeightPrintTemplate()) {
        return this.getPurchasePrintRows().reduce((sum, item) => {
          const qty = Number(item.priceQty !== undefined && item.priceQty !== null && item.priceQty !== ''
            ? item.priceQty
            : (item.purchaseQty !== undefined && item.purchaseQty !== null && item.purchaseQty !== ''
                ? item.purchaseQty
                : item.sqm))
          return sum + (Number.isFinite(qty) ? qty : 0)
        }, 0)
      }
      return this.getPurchasePrintRows().reduce((sum, item) => {
        const qty = Number(this.isPurchaseFilmItem(item)
          ? (item.sqm !== undefined && item.sqm !== null ? item.sqm : this.calcSqm(item))
          : (item.sqm !== undefined && item.sqm !== null ? item.sqm : this.calcRawTotalWeight(item)))
        return sum + (Number.isFinite(qty) ? qty : 0)
      }, 0)
    },
    getPurchasePrintTotalAmount() {
      return this.getPurchasePrintRows().reduce((sum, item) => sum + Number(this.getPurchasePrintAmount(item) || 0), 0)
    },
    formatPurchaseMoney(val) {
      const num = Number(val)
      return Number.isFinite(num) ? num.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''
    },
    getPurchaseSettlementText(order) {
      return (order && order.paymentTerms) || '月结'
    },
    handlePrintBrowser() {
      const printEl = document.getElementById('purchasePrintArea')
      if (!printEl) {
        this.$message.warning('未找到打印内容')
        return
      }
      const printContent = printEl.innerHTML
      const iframe = document.createElement('iframe')
      iframe.style.position = 'fixed'
      iframe.style.right = '0'
      iframe.style.bottom = '0'
      iframe.style.width = '0'
      iframe.style.height = '0'
      iframe.style.border = '0'
      document.body.appendChild(iframe)
      const doc = iframe.contentWindow.document
      doc.open()
      doc.write(`
        <html>
          <head>
            <meta charset="utf-8" />
            <title>采购订单打印</title>
            <style>
              body { font-family: 'SimSun', Arial, sans-serif; margin: 0; padding: 4px 6px; color: #000; }
              .purchase-print-sheet { width: 100%; margin: 0 auto; box-sizing: border-box; }
              .purchase-print-header-top { display:flex; justify-content:space-between; align-items:flex-start; }
              .purchase-logo-wrap { width: 300px; }
              .purchase-print-logo { width: 280px; height: auto; }
              .purchase-company-info { text-align:right; font-size:12px; line-height:1.6; font-weight:600; }
              .purchase-company-name { font-size: 16pt; font-family: 'Microsoft YaHei', '微软雅黑', sans-serif; font-weight: 700; margin-bottom: 2px; }
              .purchase-print-title { text-align:center; color:#1f3fbf; font-size:24px; font-weight:700; margin: 8px 0 10px; letter-spacing: 2px; }
              .purchase-print-meta { display:flex; justify-content:space-between; font-size:16px; margin-bottom:6px; }
              .purchase-print-supplier-row { font-size:16px; margin-bottom:4px; }
              .purchase-print-table { width:100%; max-width:100%; border-collapse:collapse; table-layout:fixed; }
              .purchase-print-table th, .purchase-print-table td { border:1px solid #000; padding:5px 4px; font-size:15px; line-height:1.5; text-align:center; word-break:break-word; overflow-wrap:anywhere; }
              .purchase-print-table th { color:#0b47c1; font-weight:700; background:#fff; }
              .purchase-print-table .text-left { text-align:left; }
              .purchase-print-table .text-right { text-align:right; }
              .purchase-print-total-row td { font-weight:700; }
              .purchase-print-remark-row td { white-space:pre-wrap; line-height:1.7; font-size:15px; word-break:break-word; overflow-wrap:anywhere; }
              .purchase-print-terms { margin-top:8px; font-size:15px; line-height:1.95; white-space:normal; word-break:break-word; overflow-wrap:anywhere; }
              .purchase-print-signature { margin-top:10px; display:flex; justify-content:space-between; font-size:16px; gap: 12px; flex-wrap: wrap; padding-right: 64px; box-sizing: border-box; }
              .purchase-print-signature > div { white-space:normal; word-break:break-word; overflow-wrap:anywhere; }
              .purchase-print-footer { text-align:center; margin-top:6px; font-size:15px; white-space:normal; word-break:break-word; overflow-wrap:anywhere; }
              @media print {
                @page { size: auto; margin: 4mm; }
                body { padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                .purchase-print-sheet { width: 100%; margin: 0; }
              }
            </style>
          </head>
          <body>
            <div class="purchase-print-sheet">${printContent}</div>
          </body>
        </html>
      `)
      doc.close()
      setTimeout(() => {
        iframe.contentWindow.focus()
        iframe.contentWindow.print()
        setTimeout(() => document.body.removeChild(iframe), 1000)
      }, 300)
    },
    handleDownloadTemplate() {
      downloadPurchaseTemplate()
    },
    triggerImport() {
      this.$refs.importFile && this.$refs.importFile.click()
    },
    handleImportChange(e) {
      const file = e.target.files[0]
      if (!file) return
      importPurchaseOrders(file).then(res => {
        if (res && (res.code === 200 || res.code === 20000)) {
          this.$message.success('导入完成')
          this.fetchOrders()
        } else {
          this.$message.error('导入失败')
        }
        this.$refs.importFile.value = ''
      })
    },
    handleExport() {
      exportPurchaseOrders()
    }
  }
}
</script>

<style scoped>
.purchase-orders {
  padding: 10px;
}
.purchase-orders >>> .purchase-print-dialog {
  width: fit-content !important;
  max-width: 98vw;
}
.purchase-orders >>> .purchase-print-dialog .el-dialog__header {
  padding: 12px 14px 8px;
}
.purchase-orders >>> .purchase-print-dialog .el-dialog__body {
  padding: 4px 10px 6px;
  max-height: none;
  overflow: visible;
}
.purchase-orders >>> .purchase-print-dialog .el-dialog__footer {
  padding: 10px 14px 14px;
}
.search-area {
  margin-bottom: 12px;
}
.search-actions {
  display: flex;
  gap: 8px;
}
.orders-table >>> th.el-table__cell .cell,
.orders-table >>> td.el-table__cell .cell {
  white-space: normal;
  word-break: break-word;
  line-height: 18px;
  font-size: 12px;
}
.orders-table >>> td.order-no-col .cell {
  word-break: break-all;
}
.small-input >>> .el-input__inner {
  padding: 0 6px;
}
.orders-pagination-wrapper {
  margin-top: 10px;
  text-align: right;
}
.header-remark-item {
  width: 100%;
  margin-bottom: 8px;
}
.header-remark-item >>> .el-textarea,
.header-remark-item >>> .el-textarea__inner {
  width: 100%;
}
.purchase-print-sheet {
  padding: 6px 8px;
  color: #000;
  box-sizing: border-box;
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
}
.purchase-print-preview-wrap {
  display: inline-block;
  width: max-content;
  max-width: none;
  max-height: none;
  overflow: visible;
  padding: 6px;
  background: #f5f7fa;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  text-align: left;
  zoom: 0.96;
}
.purchase-print-preview-wrap .purchase-print-sheet {
  display: block;
  width: max-content;
  min-width: 0;
  max-width: none;
  margin: 0;
}
.purchase-print-preview-wrap .purchase-print-table {
  width: auto;
  max-width: none;
}
.purchase-print-header-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}
.purchase-logo-wrap {
  width: 300px;
}
.purchase-print-logo {
  width: 280px;
  height: auto;
}
.purchase-company-info {
  text-align: right;
  font-size: 12px;
  line-height: 1.6;
  font-weight: 600;
}
.purchase-company-name {
  font-size: 16pt;
  font-family: 'Microsoft YaHei', '微软雅黑', sans-serif;
  font-weight: 700;
  margin-bottom: 2px;
}
.purchase-print-title {
  text-align: center;
  color: #1f3fbf;
  font-size: 24px;
  font-weight: 700;
  margin: 8px 0 10px;
  letter-spacing: 2px;
}
.purchase-print-meta {
  display: flex;
  justify-content: space-between;
  font-size: 16px;
  margin-bottom: 6px;
}
.purchase-print-supplier-row {
  font-size: 16px;
  margin-bottom: 4px;
}
.purchase-print-table {
  width: 100%;
  max-width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}
.purchase-print-table th,
.purchase-print-table td {
  border: 1px solid #000;
  padding: 5px 4px;
  font-size: 15px;
  line-height: 1.5;
  text-align: center;
  word-break: break-word;
  overflow-wrap: anywhere;
}
.purchase-print-table th {
  color: #0b47c1;
  font-weight: 700;
  background: #fff;
}
.purchase-print-table .text-left {
  text-align: left;
}
.purchase-print-table .text-right {
  text-align: right;
}
.purchase-print-total-row td {
  font-weight: 700;
}
.purchase-print-remark-row td {
  padding: 3px 6px;
  font-size: 15px;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: anywhere;
}
.purchase-print-terms {
  margin-top: 8px;
  font-size: 15px;
  line-height: 1.95;
  white-space: normal;
  word-break: break-word;
  overflow-wrap: anywhere;
}
.purchase-print-signature {
  margin-top: 10px;
  display: flex;
  justify-content: space-between;
  font-size: 16px;
  gap: 12px;
  flex-wrap: wrap;
  padding-right: 64px;
  box-sizing: border-box;
}
.purchase-print-signature > div {
  white-space: normal;
  word-break: break-word;
  overflow-wrap: anywhere;
}
.purchase-print-footer {
  text-align: center;
  margin-top: 6px;
  font-size: 15px;
  white-space: normal;
  word-break: break-word;
  overflow-wrap: anywhere;
}
</style>
