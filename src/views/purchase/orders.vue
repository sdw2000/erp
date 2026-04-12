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
        <el-table-column prop="supplier" label="供应商" width="180" />
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

      <el-dialog title="采购订单打印预览" :visible.sync="printVisible" width="980px" top="4vh">
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
            <thead>
              <tr>
                <th style="width: 110px;">物料编码</th>
                <th style="width: 170px;">物料名称</th>
                <th style="width: 190px;">{{ getPurchasePrintSpecHeaderLabel() }}</th>
                <th style="width: 50px;">单位</th>
                <th v-if="shouldShowFilmDimensionColumns()" style="width: 44px;">长</th>
                <th v-if="shouldShowFilmDimensionColumns()" style="width: 44px;">宽</th>
                <th v-if="shouldShowFilmDimensionColumns()" style="width: 44px;">卷</th>
                <th style="width: 72px;">数量</th>
                <th style="width: 60px;">单价</th>
                <th style="width: 88px;">金额</th>
                <th style="width: 90px;">到货日期</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, index) in getPurchasePrintRows()" :key="`print-${index}`">
                <td>{{ item.materialCode || '' }}</td>
                <td class="text-left">{{ item.materialName || '' }}</td>
                <td class="text-left">{{ getPurchasePrintSpec(item) }}</td>
                <td>{{ getPurchasePrintUnit(item) }}</td>
                <td v-if="shouldShowFilmDimensionColumns()">{{ isPurchaseFilmItem(item) ? (item.lengthDisplay || item.length || '') : '' }}</td>
                <td v-if="shouldShowFilmDimensionColumns()">{{ isPurchaseFilmItem(item) ? (item.width || '') : '' }}</td>
                <td v-if="shouldShowFilmDimensionColumns()">{{ isPurchaseFilmItem(item) ? (item.rolls || '') : '' }}</td>
                <td>{{ getPurchasePrintQuantity(item) }}</td>
                <td>{{ formatPurchaseMoney(item.unitPrice) }}</td>
                <td>{{ formatPurchaseMoney(getPurchasePrintAmount(item)) }}</td>
                <td>{{ formatPurchasePrintDate(currentPrint.deliveryDate) }}</td>
              </tr>
              <tr class="purchase-print-total-row">
                <template v-if="shouldShowFilmDimensionColumns()">
                  <td colspan="7" class="text-right">数量：</td>
                  <td>{{ formatPurchaseMoney(getPurchasePrintTotalQty()) }}</td>
                  <td class="text-right">金额：</td>
                  <td>{{ formatPurchaseMoney(getPurchasePrintTotalAmount()) }}</td>
                  <td />
                </template>
                <template v-else>
                  <td colspan="4" class="text-right">数量：</td>
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
              <div><strong>物料明细</strong></div>
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
                    placeholder="选择或输入"
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
              <el-table-column width="200">
                <template slot="header">
                  <div style="text-align: center; line-height: 1.3;">
                    <div>规格</div>
                    <div style="font-size: 11px; color: #909399;">(厚度μm*宽度mm*长度m)</div>
                  </div>
                </template>
                <template slot-scope="scope">
                  <div v-if="isRowEditable(scope.row)" style="display:flex; gap:4px;">
                    <el-input v-model="scope.row.thicknessDisplay" class="small-input" type="text" placeholder="厚度" style="width:60px;" />
                    <span style="line-height: 28px;">*</span>
                    <el-input v-model="scope.row.width" class="small-input" type="text" placeholder="宽度" style="width:60px;" />
                    <span style="line-height: 28px;">*</span>
                    <el-input v-model="scope.row.lengthDisplay" class="small-input" type="text" placeholder="长度" style="width:60px;" />
                  </div>
                  <span v-else>{{ [scope.row.thicknessDisplay || scope.row.thickness, scope.row.width, scope.row.lengthDisplay || scope.row.length].filter(v => v !== null && v !== undefined && String(v).trim() !== '').join('*') || '-' }}</span>
                </template>
              </el-table-column>
              <el-table-column label="卷数" width="70">
                <template slot-scope="scope">
                  <el-input v-if="isRowEditable(scope.row)" v-model="scope.row.rolls" class="small-input" type="text" placeholder="卷数" />
                  <span v-else>{{ scope.row.rolls || '-' }}</span>
                </template>
              </el-table-column>
              <el-table-column label="平米数" width="90">
                <template slot-scope="scope">{{ calcSqm(scope.row) }}</template>
              </el-table-column>
              <el-table-column label="单价" width="90">
                <template slot-scope="scope">
                  <el-input v-if="isRowEditable(scope.row)" v-model="scope.row.unitPrice" class="small-input" type="text" placeholder="单价" />
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
                    placeholder="选择或输入"
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
                    @change="onRawSpecChange(scope.row, $event)"
                  >
                    <el-option
                      v-for="opt in rawSpecOptions"
                      :key="opt"
                      :label="opt"
                      :value="opt"
                    />
                  </el-select>
                  <span v-else>{{ scope.row.rawSpec || '-' }}</span>
                </template>
              </el-table-column>
              <el-table-column label="数量" width="90">
                <template slot-scope="scope">
                  <el-input v-if="isRowEditable(scope.row)" v-model="scope.row.quantity" class="small-input" type="text" placeholder="数量" />
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
import { getPurchaseOrders, createPurchaseOrder, updatePurchaseOrder, deletePurchaseOrder, downloadPurchaseTemplate, importPurchaseOrders, exportPurchaseOrders, getPurchaseOrderDetail, getPurchaseOrderReconciliation, generatePurchaseOrderNo } from '@/api/purchase'
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
      rawSpecOptions: ['900Kg/桶', '180Kg/桶', '25Kg/桶', '18Kg/桶'],
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
        orderDate: order.orderDate,
        deliveryDate: order.deliveryDate,
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
          const isFilm = item.width !== null && item.width !== undefined && item.length !== null && item.length !== undefined
          if (isFilm) {
            filmItems.push({
              ...item,
              thicknessDisplay: item.thickness,
              lengthDisplay: item.length,
              unitPrice: item.unitPrice,
              rolls: item.rolls,
              __editing: false
            })
          } else {
            const rawMat = this.rawMaterials.find(r => r.materialCode === item.materialCode)
            const tubeParts = this.splitTubeSpecToParts(item.rawSpec || (rawMat && rawMat.spec) || '')
            rawItems.push({
              ...item,
              quantity: item.rolls,
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
        form.materialMode = filmItems.length > 0 ? 'film' : (rawItems.length > 0 ? 'raw' : '')
      }
      return form
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
        this.syncDetailRowsBySupplier(supplier)
        this.reloadSupplierMaterialContext(supplier)
        this.loadSupplierRemarkOptions(supplier)
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
      const matched = this.filterMaterialsBySupplier(supplier)
      const hasFilm = (matched || []).some(item => this.isFilmMaterial(item))
      const hasRaw = (matched || []).some(item => !this.isFilmMaterial(item))

      let nextMode = this.editForm.materialMode
      if (!nextMode) {
        if (hasRaw && !hasFilm) nextMode = 'raw'
        else if (hasFilm && !hasRaw) nextMode = 'film'
        else nextMode = 'raw'
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
          colorCode: '',
          thicknessDisplay: '',
          width: '',
          lengthDisplay: '',
          rolls: '',
          unitPrice: '',
          remark: ''
        }]
      }
    },
    async reloadSupplierMaterialContext(supplier) {
      this.supplierFilteredMaterials = this.filterMaterialsBySupplier(supplier)
      this.latestQuoteByCode = await this.fetchLatestQuotationMapBySupplier(supplier)
    },
    filterMaterialsBySupplier(supplier) {
      const all = this.rawMaterials || []
      if (!supplier) return all
      const keywords = [supplier.supplierCode, supplier.supplierName, supplier.shortName]
        .map(v => String(v || '').trim())
        .filter(Boolean)
      if (!keywords.length) return all
      const matched = all.filter(item => {
        const spec = String(item.spec || '')
        return keywords.some(k => spec.includes(k))
      })
      return matched.length ? matched : all
    },
    isTubeSupplierName(text) {
      const v = String(text || '').trim()
      if (!v) return false
      return /纸管|纸品|纸筒|纸芯/i.test(v)
    },
    isTubeSupplierActive() {
      if (this.isTubeSupplierName(this.editForm.supplier)) return true
      const supplier = this.suppliers.find(s => s.id === this.editForm.supplierId)
      if (!supplier) return false
      return this.isTubeSupplierName(supplier.supplierName) || this.isTubeSupplierName(supplier.shortName) || this.isTubeSupplierName(supplier.supplierCode)
    },
    isTubeRow(row) {
      if (!row) return this.isTubeSupplierActive()
      const name = String(row.materialName || '').trim()
      const code = String(row.materialCode || '').trim()
      const spec = String(row.rawSpec || '').trim()
      if (/纸管|硬纸管|纸筒|纸芯|管/i.test(name) || /管/i.test(code)) return true
      if (/^\s*\d+(?:\.\d+)?\s*[xX×*]\s*\d+(?:\.\d+)?\s*[xX×*]\s*\d+(?:\.\d+)?\s*(mm|厘米|cm|m)?\s*$/i.test(spec)) return true
      return this.isTubeSupplierActive()
    },
    getRawSpecHeaderLabelForEdit() {
      return this.isTubeSupplierActive() ? '规格(厚度*内径*长度)' : '规格(Kg/桶)'
    },
    getRawTotalHeaderLabelForEdit() {
      return this.isTubeSupplierActive() ? '总数量' : '总重(kg)'
    },
    getRawPriceHeaderLabelForEdit() {
      return this.isTubeSupplierActive() ? '单价(元/支)' : '单价(元/kg)'
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
    isFilmMaterial(item) {
      if (!item) return false
      const unitRaw = String(item.unit || '')
      const unit = unitRaw.toLowerCase()
      const spec = String(item.spec || '')
      if (unit.includes('m') || unit.includes('㎡') || unit.includes('m²') || unit.includes('m2')) return true
      return /薄膜|离型膜|原膜|PET膜|平方|㎡|m²|m2/i.test(spec)
    },
    filmMaterialOptions() {
      return this.getSupplierBaseMaterials().filter(item => this.isFilmMaterial(item))
    },
    nonFilmMaterialOptions() {
      return this.getSupplierBaseMaterials().filter(item => !this.isFilmMaterial(item))
    },
    getSupplierBaseMaterials() {
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
      if (!raw) return this.editForm.materialMode || 'film'
      return this.isFilmMaterial(raw) ? 'film' : 'raw'
    },
    async fetchLatestQuotationMapBySupplier(supplier) {
      try {
        const keywords = [supplier && supplier.supplierName, supplier && supplier.shortName, supplier && supplier.supplierCode]
          .map(v => String(v || '').trim())
          .filter(Boolean)
        if (!keywords.length) return {}

        let listRes = await listPurchaseQuotations({ page: 1, size: 300, status: 'accepted' })
        let records = (listRes && listRes.data && listRes.data.records) ? listRes.data.records : []

        const matchByKeyword = (q) => {
          const supplierText = String((q && q.supplier) || '').toLowerCase()
          return keywords.some(k => supplierText.includes(String(k).toLowerCase()))
        }

        let matched = (records || []).filter(matchByKeyword)
        if (!matched.length) {
          listRes = await listPurchaseQuotations({ page: 1, size: 300 })
          records = (listRes && listRes.data && listRes.data.records) ? listRes.data.records : []
          matched = (records || []).filter(matchByKeyword)
        }
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
              materialName: item.materialName
            }
          })
        })
        return latestMap
      } catch (e) {
        console.error('获取供应商最新报价失败', e)
        return {}
      }
    },
    onMaterialCodeChange(row, code) {
      const mode = this.detectMaterialModeByCode(code)
      if (!this.editForm.materialMode) {
        this.editForm.materialMode = mode
      }
      if (this.editForm.materialMode !== mode) {
        this.editForm.materialMode = mode
        if (mode === 'film') {
          this.editForm.rawItems = []
          this.editForm.filmItems = [{ materialCode: code, materialName: '', colorCode: '', thicknessDisplay: '', width: '', lengthDisplay: '', rolls: '', unitPrice: '', remark: '' }]
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
        }
        if (latestQuote && latestQuote.unitPrice !== null && latestQuote.unitPrice !== undefined) {
          row.unitPrice = latestQuote.unitPrice
        }
      } else {
        row.rawSpec = this.normalizeRawSpecValue((latestQuote && latestQuote.specifications) || (raw && raw.spec) || row.rawSpec || '', row)
        if (this.isTubeRow(row)) {
          const tubeParts = this.splitTubeSpecToParts(row.rawSpec)
          row.tubeThickness = tubeParts.thickness
          row.tubeInnerDiameter = tubeParts.innerDiameter
          row.tubeLength = tubeParts.length
        }
        if (latestQuote && latestQuote.unitPrice !== null && latestQuote.unitPrice !== undefined) {
          row.unitPrice = latestQuote.unitPrice
        }
      }
    },
    addFilmItem(setMode = true) {
      if (setMode) {
        this.editForm.materialMode = 'film'
      }
      this.editForm.filmItems.push({
        materialCode: '',
        materialName: '',
        colorCode: '',
        thicknessDisplay: '',
        width: '',
        lengthDisplay: '',
        rolls: '',
        unitPrice: '',
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
      const firstNum = text.match(/([0-9]+(?:\.[0-9]+)?)/)
      if (!firstNum || firstNum[1] === undefined) return text
      const n = Number(firstNum[1])
      if (!Number.isFinite(n) || n <= 0) return text
      const normalized = Number.isInteger(n) ? String(n) : String(n)
      return `${normalized}Kg/桶`
    },
    onRawSpecChange(row, value) {
      if (!row) return
      row.rawSpec = this.normalizeRawSpecValue(value, row)
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
      // 1) 标准写法: 180Kg/桶、180 kg/桶、180KG/桶
      const withUnit = text.match(/([0-9]+(?:\.[0-9]+)?)\s*(kg|KG|Kg)?\s*(\/|每)?\s*桶?/)
      if (withUnit && withUnit[1] !== undefined) {
        const v = Number(withUnit[1])
        if (Number.isFinite(v) && v > 0) return v
      }
      // 2) 兼容纯数字: 180
      const plain = Number(text)
      if (Number.isFinite(plain) && plain > 0) return plain
      // 3) 兜底: 抽取第一个数字
      const firstNum = text.match(/([0-9]+(?:\.[0-9]+)?)/)
      if (firstNum && firstNum[1] !== undefined) {
        const v = Number(firstNum[1])
        if (Number.isFinite(v) && v > 0) return v
      }
      return null
    },
    calcRawTotalWeight(row) {
      if (this.isTubeRow(row)) {
        const qty = Number(row.quantity)
        if (Number.isFinite(qty) && qty > 0) {
          return qty.toFixed(2)
        }
        return '0'
      }
      const perBucket = this.parseSpecKg(row.rawSpec)
      const qty = Number(row.quantity)
      if (perBucket && Number.isFinite(qty) && qty > 0) {
        return (perBucket * qty).toFixed(2)
      }
      // 兼容历史数据：若规格无法解析，回退显示已存总重
      const explicit = Number(row.totalWeight)
      if (Number.isFinite(explicit) && explicit > 0) {
        return explicit.toFixed(2)
      }
      return '0'
    },
    calcRawAmount(row) {
      const weight = this.isTubeRow(row) ? Number(row.quantity || 0) : Number(this.calcRawTotalWeight(row))
      const price = Number(row.unitPrice || 0)
      if (!weight || !price) return '0'
      return (weight * price).toFixed(2)
    },
    calcSqm(row) {
      // 优先使用后端返回的已计算面积字段（ sqm 或 area ）
      const backendArea = row.sqm || row.area || row.squareMeter
      if (backendArea !== undefined && backendArea !== null && backendArea !== '') {
        const n = Number(backendArea)
        return Number.isFinite(n) ? n.toFixed(2) : '0'
      }
      // 如果后端未提供面积，前端不做单位换算，返回 '0' 以避免错算
      return '0'
    },
    calcAmount(row) {
      const isFilm = row.width !== null && row.width !== undefined && row.length !== null && row.length !== undefined
      if (!isFilm) {
        return this.calcRawAmount({
          rawSpec: row.rawSpec,
          quantity: row.rolls,
          totalWeight: row.sqm,
          unitPrice: row.unitPrice
        })
      }
      const sqm = parseFloat(this.calcSqm(row))
      const price = parseFloat(row.unitPrice || 0)
      if (!sqm || !price) return '0'
      return (sqm * price).toFixed(2)
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
          : Number(this.calcSqm(item))
        return sum + (Number.isFinite(qty) ? qty : 0)
      }, 0).toFixed(2)
    },
    editTotalAmount() {
      const items = this.getEditActiveItems()
      return items.reduce((sum, item) => {
        const isRaw = this.editForm.materialMode === 'raw' || (item.width === null || item.width === undefined || item.length === null || item.length === undefined)
        const amount = isRaw
          ? Number(this.calcRawAmount(item))
          : Number(this.calcAmount(item))
        return sum + (Number.isFinite(amount) ? amount : 0)
      }, 0).toFixed(2)
    },
    formatSpec(item) {
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

      const filmItems = this.editForm.filmItems.map(item => ({
        id: item.id,
        materialCode: item.materialCode,
        materialName: item.materialName,
        colorCode: item.colorCode,
        thickness: item.thicknessDisplay ? Number(item.thicknessDisplay) : null,
        width: item.width ? Number(item.width) : null,
        length: item.lengthDisplay ? Number(item.lengthDisplay) : null,
        rolls: item.rolls ? Number(item.rolls) : null,
        unitPrice: item.unitPrice ? Number(item.unitPrice) : null,
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
    shouldShowFilmDimensionColumns() {
      return this.getPurchasePrintRows().some(item => this.isPurchaseFilmItem(item))
    },
    getPurchasePrintSpecHeaderLabel() {
      const hasTube = this.getPurchasePrintRows().some(item => !this.isPurchaseFilmItem(item) && this.isTubeRow(item))
      if (this.shouldShowFilmDimensionColumns()) return '规格型号'
      return hasTube ? '规格(厚度*内径*长度)' : '规格(Kg/桶)'
    },
    getPurchasePrintColumnCount() {
      return this.shouldShowFilmDimensionColumns() ? 11 : 8
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
    isPurchaseFilmItem(item) {
      return item && item.width !== null && item.width !== undefined && item.length !== null && item.length !== undefined
    },
    getPurchasePrintSpec(item) {
      if (!item) return ''
      const filmSpec = [item.thicknessDisplay || item.thickness || '', item.width || '', item.lengthDisplay || item.length || '']
        .filter(v => v !== null && v !== undefined && String(v).trim() !== '')
        .join('*')
      if (filmSpec) return filmSpec
      const raw = this.rawMaterials.find(r => r.materialCode === item.materialCode)
      return item.rawSpec || (raw && raw.spec) || ''
    },
    getPurchasePrintUnit(item) {
      if (!item) return ''
      if (this.isPurchaseFilmItem(item)) {
        return '㎡'
      }
      const raw = this.rawMaterials.find(r => r.materialCode === item.materialCode)
      return (raw && raw.unit) || item.purchaseUomCode || item.priceUomCode || 'KG'
    },
    getPurchasePrintQuantity(item) {
      if (!item) return ''
      if (this.isPurchaseFilmItem(item)) {
        return this.formatPurchaseMoney(item.sqm !== undefined && item.sqm !== null ? item.sqm : this.calcSqm(item))
      }
      return this.formatPurchaseMoney(item.sqm !== undefined && item.sqm !== null ? item.sqm : this.calcRawTotalWeight(item))
    },
    getPurchasePrintAmount(item) {
      if (!item) return 0
      return item.amount !== undefined && item.amount !== null && item.amount !== ''
        ? Number(item.amount)
        : Number(this.calcAmount(item))
    },
    getPurchasePrintTotalQty() {
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
              body { font-family: 'SimSun', Arial, sans-serif; margin: 0; padding: 10px 14px; color: #000; }
              .purchase-print-sheet { width: 100%; }
              .purchase-print-header-top { display:flex; justify-content:space-between; align-items:flex-start; }
              .purchase-logo-wrap { width: 300px; }
              .purchase-print-logo { width: 280px; height: auto; }
              .purchase-company-info { text-align:right; font-size:12px; line-height:1.6; font-weight:600; }
              .purchase-company-name { font-size: 16pt; font-family: 'Microsoft YaHei', '微软雅黑', sans-serif; font-weight: 700; margin-bottom: 2px; }
              .purchase-print-title { text-align:center; color:#1f3fbf; font-size:24px; font-weight:700; margin: 8px 0 10px; letter-spacing: 2px; }
              .purchase-print-meta { display:flex; justify-content:space-between; font-size:12px; margin-bottom:6px; }
              .purchase-print-supplier-row { font-size:12px; margin-bottom:4px; }
              .purchase-print-table { width:100%; border-collapse:collapse; table-layout:fixed; }
              .purchase-print-table th, .purchase-print-table td { border:1px solid #000; padding:4px 3px; font-size:11px; text-align:center; word-break:break-all; }
              .purchase-print-table th { color:#0b47c1; font-weight:700; background:#fff; }
              .purchase-print-table .text-left { text-align:left; }
              .purchase-print-table .text-right { text-align:right; }
              .purchase-print-total-row td { font-weight:700; }
              .purchase-print-remark-row td { white-space:pre-wrap; line-height:1.5; }
              .purchase-print-terms { margin-top:8px; font-size:11px; line-height:1.8; }
              .purchase-print-signature { margin-top:10px; display:flex; justify-content:space-between; font-size:12px; }
              .purchase-print-footer { text-align:center; margin-top:6px; font-size:11px; }
              @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
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
  padding: 4px 6px;
  color: #000;
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
  line-height: 1.45;
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
  font-size: 22px;
  font-weight: 700;
  margin: 6px 0 8px;
  letter-spacing: 2px;
}
.purchase-print-meta {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  margin-bottom: 4px;
}
.purchase-print-supplier-row {
  font-size: 12px;
  margin-bottom: 4px;
}
.purchase-print-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}
.purchase-print-table th,
.purchase-print-table td {
  border: 1px solid #000;
  padding: 3px 2px;
  font-size: 11px;
  text-align: center;
  word-break: break-all;
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
  font-size: 11px;
  line-height: 1.45;
  white-space: pre-wrap;
}
.purchase-print-terms {
  margin-top: 6px;
  font-size: 11px;
  line-height: 1.7;
}
.purchase-print-signature {
  margin-top: 8px;
  display: flex;
  justify-content: space-between;
  font-size: 12px;
}
.purchase-print-footer {
  text-align: center;
  margin-top: 4px;
  font-size: 11px;
}
</style>
