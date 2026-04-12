<template>  <div class="sales-orders">
  <el-card>
    <div slot="header" class="clearfix orders-card-header">
      <span class="card-title">销售订单</span>
      <div class="header-actions">
        <el-button v-if="$canImportExport()" type="success" icon="el-icon-download" size="small" @click="handleDownloadTemplate">下载模板</el-button>
        <el-button v-if="$canImportExport()" type="warning" icon="el-icon-upload2" size="small" @click="handleImportClick('normal')">导入</el-button>
        <el-button v-if="$canImportExport() && isAdminUser" type="primary" plain icon="el-icon-upload" size="small" @click="handleImportClick('historyInit')">历史初始化</el-button>
        <el-button v-if="$canImportExport()" type="primary" plain icon="el-icon-refresh" size="small" @click="handleImportClick('incrementalSync')">增量同步</el-button>
        <el-button v-if="$canImportExport()" type="info" icon="el-icon-download" size="small" @click="handleExportAll">导出</el-button>
        <el-button type="primary" icon="el-icon-plus" size="small" @click="openCreate">新增订单</el-button>
        <input ref="importFile" type="file" accept=".xlsx,.xls" style="display:none" @change="handleImportChange">
      </div>
    </div>

    <div v-if="isAdminUser" class="sync-status-area">
      <div class="sync-status-left">
        <span class="sync-status-label">历史初始化状态：</span>
        <el-tag size="mini" :type="historyInitState.initialized === 1 ? 'success' : 'info'">
          {{ historyInitState.initialized === 1 ? '已初始化' : '未初始化' }}
        </el-tag>
        <span class="sync-status-text">初始化时间：{{ formatDateTime(historyInitState.initializedAt) }}</span>
        <span class="sync-status-text">最近同步：{{ formatDateTime(historyInitState.lastSyncAt) }}</span>
      </div>
      <div class="sync-status-right">
        <span class="sync-status-text">累计订单：{{ historyInitState.totalOrders || 0 }}</span>
        <span class="sync-status-text">累计明细：{{ historyInitState.totalItems || 0 }}</span>
      </div>
    </div>

    <!-- 搜索区域 -->
    <div class="search-area">
      <el-row :gutter="16">
        <el-col :span="4">
          <el-input v-model="searchForm.customer" placeholder="客户名称/简称/代码" clearable size="small" @keyup.enter.native="handleSearch" @clear="handleSearch" />
        </el-col>
        <el-col :span="4">
          <el-input v-model="searchForm.orderNo" placeholder="订单编号" clearable size="small" @keyup.enter.native="handleSearch" @clear="handleSearch" />
        </el-col>
        <el-col :span="4">
          <el-select v-model="searchForm.lifecycleStatus" placeholder="生命周期状态" clearable size="small" style="width:100%" @change="handleSearch">
            <el-option label="已下单" value="CREATED" />
            <el-option label="已排程" value="SCHEDULED" />
            <el-option label="生产中" value="IN_PRODUCTION" />
            <el-option label="生产完成" value="PRODUCED" />
            <el-option label="部分发货" value="SHIPPED_PARTIAL" />
            <el-option label="全部发货" value="SHIPPED_FULL" />
            <el-option label="部分收货" value="PARTIAL_RECEIVED" />
            <el-option label="已收货" value="RECEIVED" />
            <el-option label="部分回款" value="PAYMENT_PARTIAL" />
            <el-option label="已回款" value="PAID" />
            <el-option label="关闭" value="CLOSED" />
            <el-option label="取消" value="CANCELLED" />
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-date-picker v-model="searchForm.orderDateStart" type="date" placeholder="订单日期起" value-format="yyyy-MM-dd" size="small" style="width:100%" @change="handleSearch" />
        </el-col>
        <el-col :span="4">
          <el-date-picker v-model="searchForm.orderDateEnd" type="date" placeholder="订单日期止" value-format="yyyy-MM-dd" size="small" style="width:100%" @change="handleSearch" />
        </el-col>
        <el-col :span="6">
          <el-switch
            v-model="searchForm.showCompleted"
            active-text="显示已完成"
            style="margin-right: 8px;"
            @change="handleShowCompletedChange"
          />
          <el-button type="primary" icon="el-icon-search" size="small" @click="handleSearch">搜索</el-button>
          <el-button icon="el-icon-refresh" size="small" @click="handleReset">重置</el-button>
        </el-col>
      </el-row>
    </div>
    <div class="orders-table-wrapper">
    <el-table
      ref="ordersTable"
      class="orders-table"
      :data="pagedOrders"
      style="width:100%"
      stripe
      :default-sort="{ prop: 'orderDate', order: 'descending' }"
      @sort-change="handleSortChange"
    >
      <el-table-column type="index" label="序号" width="60" align="center" :index="indexMethod" />
      <el-table-column prop="customerDisplay" label="客户名称" min-width="91" sortable="custom" />
      <el-table-column prop="orderNo" label="订单编号" min-width="120" class-name="order-no-col" sortable="custom" show-overflow-tooltip />
      <el-table-column prop="totalAmount" label="总金额" width="97" class-name="amount-col" sortable="custom" />
      <el-table-column prop="totalArea" label="总面积(㎡)" width="97" class-name="area-col" sortable="custom" />
      <el-table-column label="欠卷总数" width="90" align="center">
        <template slot-scope="scope">{{ formatOrderRemainingRolls(scope.row) }}</template>
      </el-table-column>
      <el-table-column prop="orderDate" label="订单日期" width="98" sortable="custom">
        <template slot-scope="scope">{{ formatMonthDay(scope.row.orderDate) }}</template>
      </el-table-column>
      <el-table-column prop="deliveryDate" label="交货日期" width="98" sortable="custom">
        <template slot-scope="scope">{{ formatMonthDay(scope.row.deliveryDate) }}</template>
      </el-table-column>
      <el-table-column label="生命周期" width="110" align="center">
        <template slot-scope="scope">
          <el-tag size="mini" :type="getLifecycleStatusType(scope.row && scope.row.status)">{{ getLifecycleStatusText(scope.row && scope.row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column v-if="isAdminUser" prop="salesUserName" label="销售" width="72" />
      <el-table-column v-if="isAdminUser" prop="documentationPersonUserName" label="跟单员" width="72" />
      <el-table-column label="操作" width="228" align="center">
        <template slot-scope="scope">
          <div class="op-btns">
            <el-button type="text" size="mini" @click="viewDetail(scope.row)">详情</el-button>
            <el-button type="text" size="mini" class="op-print" @click="handlePrint(scope.row)">打印</el-button>
            <el-button type="text" size="mini" @click="openEdit(scope.row)">编辑</el-button>
            <el-button v-if="!isOrderCancelled(scope.row)" type="text" size="mini" class="op-danger" @click="confirmCancelOrder(scope.row)">取消订单</el-button>
            <el-button type="text" size="mini" class="op-danger" @click="confirmDelete(scope.row)">删除</el-button>
          </div>
        </template>
      </el-table-column>
    </el-table>
    </div>

    <div class="orders-pagination-wrapper">
      <el-pagination
        :current-page.sync="currentPage"
        :page-size="pageSize"
        :page-sizes="[5,10,20,50]"
        layout="sizes, prev, pager, next, jumper, ->, total"
        :total="Number(total)"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>    <!-- 详情对话框 -->    <el-dialog title="订单详情" :visible.sync="detailVisible" width="1200px">
      <div v-if="currentOrder">
        <p>
          <strong>客户全称：</strong>{{ currentOrder.customerName || currentOrder.customerDisplay || currentOrder.customer }}
          &nbsp;&nbsp; <strong>客户简称：</strong>{{ currentOrder.customerShortName || '-' }}
          &nbsp;&nbsp; <strong>订单编号：</strong>{{ currentOrder.orderNo }}
        </p>
        <p>
          <strong>客户订单号：</strong>{{ currentOrder.customerOrderNo || '-' }}
          &nbsp;&nbsp; <strong>订单日期：</strong>{{ currentOrder.orderDate || '-' }}
          &nbsp;&nbsp; <strong>交货日期：</strong>{{ currentOrder.deliveryDate || '-' }}
        </p>
        <p v-if="isAdminUser">
          <strong>销售：</strong>{{ currentOrder.salesUserName || '-' }}
          &nbsp;&nbsp; <strong>跟单员：</strong>{{ currentOrder.documentationPersonUserName || '-' }}
          &nbsp;&nbsp; <strong>状态：</strong>{{ getLifecycleStatusText(currentOrder.status) }}
        </p>
        <p v-else>
          <strong>状态：</strong>{{ getLifecycleStatusText(currentOrder.status) }}
        </p>
        <p>
          <strong>总金额：</strong>{{ totalAmount(currentOrder) }}
          &nbsp;&nbsp; <strong>总面积：</strong>{{ totalArea(currentOrder) }}㎡
          &nbsp;&nbsp; <strong>送货地址：</strong>{{ currentOrder.deliveryAddress || '-' }}
        </p>

        <el-table :data="currentOrder.items" stripe style="width:100%; margin-top:10px;">
          <el-table-column type="index" label="序号" width="60" align="center" />          <el-table-column prop="materialCode" label="产品编码" width="180" />
          <el-table-column prop="materialName" label="产品名称" width="180" />
          <el-table-column label="规格" width="180">
            <template slot-scope="scope">
              {{ formatSpec(scope.row) }}
            </template>
          </el-table-column>
          <el-table-column prop="colorCode" label="颜色" width="100" />
          <el-table-column prop="rolls" label="卷数" width="80" />
          <el-table-column label="完成卷" width="90" align="center">
            <template slot-scope="scope">{{ formatItemCompletedRolls(scope.row) }}</template>
          </el-table-column>
          <el-table-column label="欠卷" width="90" align="center">
            <template slot-scope="scope">{{ formatItemRemainingRolls(scope.row) }}</template>
          </el-table-column>
          <el-table-column label="状态" width="90" align="center">
            <template slot-scope="scope">
              <el-tag size="mini" :type="getItemCompletionStatusType(scope.row)">{{ getItemCompletionStatusText(scope.row) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="平米数" width="100">
            <template slot-scope="scope">{{ scope.row.sqm || calcSqm(scope.row) }}</template>
          </el-table-column>
          <el-table-column label="金额" width="120">
            <template slot-scope="scope">{{ scope.row.amount || calcAmount(scope.row) }}</template>
          </el-table-column>
          <el-table-column label="单价" width="120">
            <template slot-scope="scope">{{ formatUnitPriceWithUnit(scope.row) }}</template>
          </el-table-column>
          <el-table-column label="标准平米价" width="110">
            <template slot-scope="scope">{{ calcStandardSqmUnitPrice(scope.row) || '-' }}</template>
          </el-table-column>
          <el-table-column prop="remark" label="备注" />
        </el-table>
      </div>
      <span slot="footer">
        <el-button @click="detailVisible = false">关闭</el-button>
      </span>
    </el-dialog>

    <!-- 编辑/新增对话框 -->
    <el-dialog :title="isEditing ? '编辑订单' : '新增订单'" :visible.sync="editVisible" width="95vw" custom-class="order-dialog">
      <el-form :model="editForm" label-width="100px">        <!-- 客户名称 单独一行 -->        <el-row :gutter="12">
                                                                                         <el-col :span="24">                                    <el-form-item label="客户名称">
                                                                                           <el-select
                                                                                             v-model="editForm.customerId"
                                                                                             filterable
                                                                                             :disabled="isEditing && !!editForm.customerId"
                                                                                             placeholder="请选择客户"
                                                                                             style="width: 100%"
                                                                                             popper-class="customer-select-popper"
                                                                                             @change="onCustomerChange"
                                                                                           >
                                                                                             <el-option
                                                                                               v-for="customer in customers"
                                                                                               :key="customer.id"
                                                                                               :label="formatCustomerLabel(customer)"
                                                                                               :value="customer.id"
                                                                                             >
                                                                                               <div class="customer-option">
                                                                                                 <span class="customer-name">{{ customer.shortName || '-' }}</span>
                                                                                                 <span class="customer-meta">{{ customer.customerCode || '-' }}</span>
                                                                                               </div>
                                                                                             </el-option>
                                                                                           </el-select>
                                                                                         </el-form-item>
                                                                                         </el-col>
                                                                                       </el-row>

        <!-- 订单编号 与 客户订单号 同一行 -->
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="订单编号">
              <el-input v-model="editForm.orderNo" @input="handleOrderNoInput">
                <template v-if="!isEditing" slot="append">
                  <el-button type="text" @click="handleGenerateOrderNo">自动生成</el-button>
                </template>
                <template v-else slot="append">
                  <el-button type="text" @click="handleIncrementOrderNoSuffix">后缀+1</el-button>
                </template>
                <template v-if="!isEditing" slot="suffix">
                  <i class="el-input__icon el-icon-edit" />
                </template>
              </el-input>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="客户订单号">
              <el-input v-model="editForm.customerOrderNo" @input="customerOrderEdited = true" />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 销售与跟单员 -->
        <el-row v-if="isAdminUser" :gutter="12">
          <el-col :span="12">
            <el-form-item label="销售">
              <el-input v-model="editForm.salesUserName" placeholder="自动填充" :disabled="true" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="跟单员">
              <el-input v-model="editForm.documentationPersonUserName" placeholder="自动填充" :disabled="true" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="订单日期">
              <el-date-picker
                v-model="editForm.orderDate"
                type="date"
                placeholder="选择日期"
                value-format="yyyy-MM-dd"
                format="yyyy-MM-dd"
                @change="onOrderDateChange"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="交货日期">
              <el-date-picker
                v-model="editForm.deliveryDate"
                type="date"
                placeholder="选择日期"
                value-format="yyyy-MM-dd"
                format="yyyy-MM-dd"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="总金额">
              <el-input :value="totalAmount(editForm)" disabled />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="总面积(㎡)">
              <el-input :value="totalArea(editForm)" disabled />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 送货地址 单独一行 -->
        <el-row :gutter="12">
          <el-col :span="24">
            <el-form-item label="送货地址">
              <el-input v-model="editForm.deliveryAddress" placeholder="填写送货地址" />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 订单备注（表头）放在地址下方 -->
        <el-row :gutter="12">
          <el-col :span="24">
            <el-form-item label="订单备注">
              <el-input
                v-model="editForm.remark"
                type="textarea"
                :autosize="{ minRows: 3, maxRows: 8 }"
                placeholder="可输入或选择该客户历史备注"
                class="order-remark-textarea"
                style="width: 100%"
              />
              <div v-if="orderRemarkTagOptions.length" class="order-remark-history">
                <span class="order-remark-history-label">历史备注：</span>
                <el-tag
                  v-for="(opt, idx) in orderRemarkTagOptions"
                  :key="`remark-${idx}`"
                  size="mini"
                  effect="plain"
                  class="order-remark-history-tag"
                  @click="handleOrderRemarkSelect(opt)"
                >{{ opt.value }}</el-tag>
              </div>
            </el-form-item>
          </el-col>
        </el-row>

        <div style="margin-top:10px">
          <div style="display:flex; align-items:center; justify-content:space-between">
            <div><strong>物料明细</strong></div>
          </div>

          <div class="items-action-toolbar">
            <el-button size="mini" @click="duplicateLastItemBasics">复制上一行</el-button>
            <el-button type="primary" size="mini" @click="addItem">新增明细行</el-button>
          </div>
          <div class="items-table-wrapper">
            <el-table class="edit-items-table" :data="editForm.items" stripe style="min-width: 1580px; margin-top:8px;">
              <el-table-column label="序号" width="44" align="center">
                <template slot-scope="scope">{{ scope.$index + 1 }}</template>
              </el-table-column>
              <el-table-column label="产品编码" width="190">
                <template slot-scope="scope">
                  <el-select
                    v-if="scope.row._rowEditing"
                    v-model="scope.row.materialCode"
                    filterable
                    allow-create
                    placeholder="选择或输入"
                    size="mini"
                    style="width: 100%"
                    @change="onMaterialCodeChange(scope.row, $event)"
                  >
                    <el-option
                      v-for="spec in specs"
                      :key="spec.materialCode"
                      :label="spec.materialCode"
                      :value="spec.materialCode"
                    >
                      <span style="float: left">{{ spec.materialCode }}</span>
                      <span style="float: right; color: #8492a6; font-size: 12px">{{ spec.productName }}</span>
                    </el-option>
                  </el-select>
                  <span v-else>{{ scope.row.materialCode || '-' }}</span>
                </template>
              </el-table-column>
              <el-table-column label="产品名称" width="150">
                <template slot-scope="scope">
                  <el-input v-if="scope.row._rowEditing" v-model="scope.row.materialName" class="small-input" placeholder="产品名称" />
                  <span v-else>{{ scope.row.materialName || '-' }}</span>
                </template>
              </el-table-column>
              <el-table-column label="颜色" width="40">
                <template slot-scope="scope">
                  <el-tooltip v-if="scope.row._rowEditing" class="item" effect="dark" :content="scope.row.colorCode" placement="top" :disabled="!scope.row.colorCode">
                    <el-input v-model="scope.row.colorCode" class="small-input" placeholder="颜色代码" />
                  </el-tooltip>
                  <span v-else>{{ scope.row.colorCode || '-' }}</span>
                </template>
              </el-table-column>
              <el-table-column width="128">
                <template slot="header">
                  <div style="text-align: center; line-height: 1.3;">
                    <div>规格</div>
                    <div style="font-size: 11px; color: #909399;">(厚度μm*宽度mm*长度m)</div>
                  </div>
                </template>
                <template slot-scope="scope">
                  <div v-if="scope.row._rowEditing">
                    <el-select
                      v-model="scope.row.historySpecKey"
                      filterable
                      clearable
                      size="mini"
                      placeholder="优先选择历史规格"
                      style="width: 100%; margin-bottom: 4px;"
                      @visible-change="onHistorySpecDropdownVisible(scope.row, $event)"
                      @change="onHistorySpecSelect(scope.row, $event)"
                    >
                      <el-option
                        v-for="spec in (scope.row.historySpecOptions || [])"
                        :key="spec.key"
                        :label="spec.label"
                        :value="spec.key"
                      />
                    </el-select>
                    <div style="display: flex; gap: 2px;">
                      <el-input v-model="scope.row.thicknessDisplay" class="small-input" type="text" inputmode="numeric" pattern="[0-9]*\.?[0-9]*" placeholder="厚度" style="width: 36px;" />
                      <span style="line-height: 28px;">*</span>
                      <el-input v-model="scope.row.width" class="small-input" type="text" inputmode="numeric" pattern="[0-9]*\.?[0-9]*" placeholder="宽度" style="width: 36px;" @input="onWidthInput(scope.row)" @blur="formatWidthOnBlur(scope.row)" />
                      <span style="line-height: 28px;">*</span>
                      <el-input v-model="scope.row.lengthDisplay" class="small-input" type="text" inputmode="numeric" pattern="[0-9]*\.?[0-9]*" placeholder="长度" style="width: 36px;" @input="onItemSpecChanged(scope.row)" />
                    </div>
                  </div>
                  <span v-else>{{ getItemSpecText(scope.row) }}</span>
                </template>
              </el-table-column>
              <el-table-column label="卷数" width="64">
                <template slot-scope="scope">
                  <el-input v-if="scope.row._rowEditing" v-model="scope.row.rolls" class="small-input" type="text" inputmode="numeric" pattern="[0-9]*" placeholder="卷数" @input="onEditRollsChanged(scope.row)" />
                  <span v-else>{{ scope.row.rolls || 0 }}</span>
                </template>
              </el-table-column>
              <el-table-column label="平米数" width="72">
                <template slot-scope="scope">{{ calcSqm(scope.row) }}</template>
              </el-table-column>
              <el-table-column label="单价" width="77">
                <template slot-scope="scope">
                  <div v-if="scope.row._rowEditing" class="unit-price-cell">
                    <el-input v-model="scope.row.unitPrice" :disabled="isUnitPriceLocked(scope.row)" class="small-input" type="text" inputmode="numeric" pattern="[0-9]*\.?[0-9]*" :placeholder="getUnitPricePlaceholder(scope.row)" @blur="formatOrderUnitPriceOnBlur(scope.row)" />
                    <div class="unit-price-text">{{ getPricingUnitText(scope.row) }}</div>
                  </div>
                  <span v-else>{{ formatUnitPriceWithUnit(scope.row) }}</span>
                </template>
              </el-table-column>
              <el-table-column label="标准㎡价" width="84">
                <template slot-scope="scope">{{ calcStandardSqmUnitPrice(scope.row) || '-' }}</template>
              </el-table-column>
              <el-table-column label="金额" width="90">
                <template slot-scope="scope">{{ calcAmount(scope.row) }}</template>
              </el-table-column>
              <el-table-column label="已完成" width="72">
                <template slot-scope="scope">
                  <el-input v-if="scope.row._rowEditing" v-model="scope.row.deliveredQty" class="small-input" type="text" inputmode="numeric" pattern="[0-9]*" placeholder="完成" @input="onEditCompletedQtyChanged(scope.row)" />
                  <span v-else>{{ scope.row.deliveredQty || 0 }}</span>
                </template>
              </el-table-column>
              <el-table-column label="欠卷" width="72">
                <template slot-scope="scope">
                  <el-input v-if="scope.row._rowEditing" v-model="scope.row.remainingQty" class="small-input" type="text" inputmode="numeric" pattern="[0-9]*" placeholder="欠卷" @input="onEditRemainingQtyChanged(scope.row)" />
                  <span v-else>{{ scope.row.remainingQty || 0 }}</span>
                </template>
              </el-table-column>
              <el-table-column label="完成状态" width="110">
                <template slot-scope="scope">
                  <el-select v-if="scope.row._rowEditing" v-model="scope.row.productionStatus" size="mini" placeholder="状态" @change="onEditProductionStatusChanged(scope.row)">
                    <el-option label="未开始" value="not_started" />
                    <el-option label="部分完成" value="partial" />
                    <el-option label="已完成" value="completed" />
                  </el-select>
                  <span v-else>{{ getProductionStatusLabel(scope.row.productionStatus) }}</span>
                </template>
              </el-table-column>
              <el-table-column label="备注" width="160">
                <template slot-scope="scope">
                  <el-input v-if="scope.row._rowEditing" v-model="scope.row.remark" class="small-input" placeholder="备注" />
                  <span v-else>{{ scope.row.remark || '-' }}</span>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="128" align="center">
                <template slot-scope="scope">
                  <el-button type="text" size="mini" @click="toggleItemEdit(scope.row)">{{ scope.row._rowEditing ? '完成' : '编辑' }}</el-button>
                  <el-button type="text" size="mini" @click="duplicateItemBasics(scope.$index)">复制</el-button>
                  <el-button type="text" size="mini" style="color:#f56c6c" @click="removeItem(scope.$index, scope.row)">删除</el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </div>
      </el-form>

      <span slot="footer">
        <el-button @click="editVisible = false">取消</el-button>
        <el-button v-if="!isEditing" type="warning" plain @click="saveOrderDraft">暂存</el-button>
        <el-button type="primary" @click="saveOrder">保存</el-button>
      </span>
    </el-dialog>

    <!-- 单据打印对话框（A4/B5） -->
    <el-dialog title="单据打印预览（A4/B5）" :visible.sync="printVisible" width="900px" top="5vh">
      <el-alert
        title="当前为单据打印（A4/B5），不使用标签模板配置；标签模板仅用于标签类打印场景。"
        type="info"
        :closable="false"
        style="margin-bottom: 10px;"
      />
      <div class="print-template-toolbar">
        <span class="print-template-label">打印模板：</span>
        <el-select v-model="selectedPrintTemplateKey" size="mini" style="width: 220px;" placeholder="请选择模板">
          <el-option v-for="tpl in printTemplateOptions" :key="tpl.value" :label="tpl.label" :value="tpl.value" />
        </el-select>
        <el-button size="mini" type="primary" plain @click="saveCurrentCustomerTemplateLocal">设为当前客户默认模板</el-button>
      </div>
      <div v-if="currentPrint" id="printArea" class="print-content">
        <!-- 顶部抬头（左logo + 右公司信息） -->
        <div class="company-header">
          <div class="company-header-top">
            <div class="logo-wrap">
              <img v-if="printLogoUrl" :src="printLogoUrl" alt="company-logo" class="company-logo">
            </div>
            <div class="company-info-right">
              <h1 class="company-name">{{ companyInfo.companyName }}</h1>
              <div class="company-info">
                <p>地址：{{ companyInfo.address }}</p>
                <p>电话：{{ companyInfo.phone }} &nbsp;&nbsp; 传真：{{ companyInfo.fax }}</p>
                <p>网址：{{ companyInfo.website }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- 合同标题 -->
        <h2 class="contract-title">{{ getPrintTemplateConfig().contractTitle }}</h2>
        <div class="contract-info">
          <span>合同编号 {{ currentPrint.orderNo }}</span>
        </div>

        <!-- 基本信息 -->
        <div class="basic-info">
          <p>
            本合同于 {{ formatChineseDate(currentPrint.orderDate) }}，由
            <strong>{{ getCurrentPrintCustomerName() }}</strong>（以下简称“甲方”）
            和
            <strong>{{ companyInfo.companyName }}</strong>（以下简称“乙方”）
            经过友好协商签订，双方共同遵守执行。
          </p>
        </div>

        <!-- 明细表格 -->
        <h3 class="section-title">{{ getPrintTemplateConfig().clauseOneTitle }}</h3>
        <table class="items-table">
          <thead>
            <tr>
              <th style="width: 180px;">产品名称</th>
              <th style="width: 120px;">型号</th>
              <th style="width: 180px;">规格<br>(厚度μm*宽度mm*长度m)</th>
              <th style="width: 80px;">卷数<br>(卷)</th>
              <th style="width: 100px;">{{ getPrintTemplateConfig().areaHeader }}<br>(平方米)</th>
              <th style="width: 80px;">{{ getPrintTemplateConfig().unitPriceHeader }}<br>(元/平方米)</th>
              <th style="width: 120px;">总金额<br>(元)</th>
              <th style="width: 100px;">备注</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, index) in currentPrint.items" :key="index">
              <td>{{ item.materialName }}</td>
              <td>{{ item.materialCode }}</td>
              <td>{{ formatSpec(item) }}</td>
              <td style="text-align: center;">{{ item.rolls }}</td>
              <td style="text-align: right;">{{ formatNumber(item.sqm || calcSqmNumber(item)) }}</td>
              <td style="text-align: right;">{{ formatNumber(item.unitPrice) }}</td>
              <td style="text-align: right;">{{ formatNumber(item.amount || calcAmount(item)) }}</td>
              <td>{{ item.remark || '' }}</td>
            </tr>
            <!-- 空行 -->
            <tr v-for="n in Math.max(0, 5 - (currentPrint.items ? currentPrint.items.length : 0))" :key="'empty-'+n" class="empty-row">
              <td>&nbsp;</td><td /><td /><td /><td /><td /><td /><td />
            </tr>
            <tr class="total-row">
              <td colspan="3" style="text-align: right; padding-right: 10px;"><strong>合计：</strong></td>
              <td style="text-align: center;"><strong>{{ sumRolls }}</strong></td>
              <td style="text-align: right;"><strong>{{ sumArea }}</strong></td>
              <td />
              <td style="text-align: right;"><strong>{{ sumAmount }}</strong></td>
              <td />
            </tr>
          </tbody>
        </table>

        <!-- 合同条款 -->
        <div class="contract-terms">
          <p><strong>付款方式：</strong>{{ getPaymentMethodDescription() }}</p>
          <p v-if="!isCashPaymentByCustomer()"><strong>第二条 付款期限：</strong>1、双方确认合同后，月底25日前对账，确认当期金额；2、对账后{{ getPaymentDaysByCustomer() }}日内付完合同总金额。</p>
          <p v-else><strong>第二条 付款期限：</strong>款到发货</p>
          <p><strong>第三条 交货期限、地点、方式</strong></p>
          <p style="margin-left: 20px;">1. 乙方必须在 {{ currentPrint.deliveryDate }} 前将货物送达甲方指定地点，并由甲方签收。</p>
          <p style="margin-left: 20px;">2. 如甲方要求送货上门的，运费由乙方承担，如乙方代收取运费的，甲方及时予以支付，乙方不许以欠运费为由不及时交货，未及时交货以及因此造成给甲方或甲方客户的各项损失，全由乙方承担。运费应另外支付给乙方的人员负责。</p>
          <p style="margin-left: 20px;">3. 若甲方在欠乙方前段采购货款的情况下还要求乙方交货，若乙方不交货乙方不须承担任何责任。</p>
          <p><strong>第四条 产品检验和验收</strong></p>
          <p style="margin-left: 20px;">甲方收到货物后，应仔细确认，数量问题请收到货后的3天内提出，质量问题请收到货后的7天内提出。</p>
          <p><strong>第五条 售后服务</strong></p>
          <p style="margin-left: 20px;">任何瑕疵产品请收到货后30天之内寄回我司，经确认后办理以货换货或等值的货款抵扣，逾期则视为无异议。</p>
          <p><strong>第六条 保密条款</strong></p>
          <p style="margin-left: 20px;">1. 双方在交易过程中获悉的商业秘密均应保密，不得泄露或转让第三方，否则应赔偿由此给对方造成的一切损失；本合同终止后，其保密义务仍然有效，直至相关信息成为公开信息为止。</p>
          <p style="margin-left: 20px;">2. 本合同中涉及的商业秘密，未经对方书面同意，任何一方不得使用或披露给第三方。</p>
          <p><strong>第七条 争议解决</strong></p>
          <p style="margin-left: 20px;">本合同在履行过程中发生的争议，由双方当事人协商解决；协商不成的，依法向合同签订地人民法院起诉。</p>
          <p><strong>第八条 本合同一式贰份，甲乙双方各执壹份，自双方签字盖章之日起生效。</strong></p>
        </div>

        <!-- 签字栏 -->
        <div class="signature-section">
          <div class="signature-block">
            <p><strong>甲方（盖章）：</strong>{{ getCurrentPrintCustomerName() }}</p>
            <p><strong>授权代表：</strong>{{ getCurrentPrintCustomerContactName() }}</p>
            <p><strong>联系电话：</strong>{{ getCurrentPrintCustomerPhone() }}</p>
            <p><strong>联系地址：</strong>{{ getCurrentPrintCustomerAddress() }}</p>
          </div>
          <div class="signature-block">
            <p><strong>乙方（盖章）：</strong>{{ companyInfo.companyName }}</p>
            <p><strong>授权代表：</strong>_________________</p>
            <p><strong>联系电话：</strong>{{ companyInfo.phone }}</p>
            <p><strong>联系地址：</strong>{{ companyInfo.address }}</p>
          </div>
        </div>

        <div class="page-footer">
          <p>共 1 页，第 1 页</p>
        </div>
      </div>

      <div slot="footer" class="dialog-footer">
        <el-button @click="printVisible = false">关闭</el-button>
        <el-button type="primary" icon="el-icon-printer" @click="handlePrintBrowser">打印单据 / 导出PDF</el-button>
      </div>
    </el-dialog>
  </el-card>
</div>
</template>

<script>
import { getOrders, createOrder, updateOrder, deleteOrder, deleteOrderItem, cancelOrder, downloadOrderTemplate, importOrders, exportOrders, getOrderDetail, generateOrderNo, getOrderHistorySpecs, getOrderRemarkHistory, getHistoryInitStatus, importHistoryInitOrders, syncIncrementalOrders } from '@/api/sales'
import { getQuotationList } from '@/api/quotation'
import { getCustomerList } from '@/api/customer'
import { getAllEnabledSpecs } from '@/api/tapeSpec'
import { getSalesContractTemplates, getSalesContractCustomerDefaultTemplate, saveSalesContractCustomerDefaultTemplate } from '@/api/labelPrintConfig'
import request from '@/utils/request'
import elTableAutoLayout from '@/mixins/elTableAutoLayout'

// 仅运行期内存草稿（刷新页面后清空）
let inMemoryOrderDraft = null

export default {
  name: 'SalesOrders',
  filters: {
    numberFixed(value, digits) {
      if (value === null || value === undefined) return ''
      return Number(value).toFixed(digits || 0)
    }
  },
  mixins: [elTableAutoLayout],
  tableLayoutRefs: ['ordersTable'],
  data() {
    return {
      orders: [],
      customers: [], // 客户列表
      specs: [], // 料号规格列表
      quotationList: [],
      quotationListLoaded: false,
      quotationListLoading: false,
      currentPage: 1,
      pageSize: 10,
      total: 0,
      detailVisible: false,
      currentOrder: null,
      editVisible: false,
      isEditing: false,
      editForm: this.emptyForm(),
      removedItemIds: [],
      // flag: whether customerOrderNo has been manually edited by user
      customerOrderEdited: false, // 搜索表单
      orderNoEdited: false,
      searchForm: {
        customer: '',
        orderNo: '',
        lifecycleStatus: '',
        showCompleted: false,
        orderDateStart: '',
        orderDateEnd: ''
      },
      // 排序
      sortProp: 'orderDate',
      sortOrder: 'descending',
      importMode: 'normal',
      historyInitState: {
        initialized: 0,
        initializedAt: '',
        lastSyncAt: '',
        totalOrders: 0,
        totalItems: 0
      },

      // 打印
      printVisible: false,
      currentPrint: null,
      selectedPrintTemplateKey: 'contract_standard_v1',
      printTemplateOptions: [
        { value: 'contract_standard_v1', label: '标准合同模板（默认）' },
        { value: 'contract_factory_v1', label: '工厂版合同模板' },
        { value: 'contract_trade_v1', label: '贸易版合同模板' }
      ],
      // Company info for print header (will be fetched from backend)
      companyInfo: {
        companyName: '东莞市方恩电子材料科技有限公司',
        address: '广东省东莞市桥头镇东新路13号2号楼102室',
        phone: '0769-82551118',
        fax: '0769-82551160',
        website: 'www.finechemfr.com'
      },
      printLogoUrl: '/logo/finechem-logo.png',
      orderRemarkHistoryOptions: [],
      ordersTableResizeHandler: null
    }
  },
  computed: {
    isAdminUser() {
      if (typeof this.$hasRole === 'function') {
        return this.$hasRole('admin')
      }
      const roles = (this.$store && this.$store.getters && this.$store.getters.roles) || []
      return Array.isArray(roles) && roles.includes('admin')
    },
    pagedOrders() {
      return this.orders
    },
    // 打印时的合计数据
    sumRolls() {
      if (!this.currentPrint || !this.currentPrint.items) return 0
      return this.currentPrint.items.reduce((sum, item) => sum + (Number(item.rolls) || 0), 0)
    },
    sumArea() {
      if (!this.currentPrint || !this.currentPrint.items) return '0.00'
      const sum = this.currentPrint.items.reduce((s, item) => s + (item.sqm || this.calcSqmNumber(item)), 0)
      return sum.toFixed(2)
    },
    sumAmount() {
      if (!this.currentPrint || !this.currentPrint.items) return '0.00'
      const sum = this.currentPrint.items.reduce((s, item) => {
        const amount = item.amount || this.calcAmountNumber(item)
        return s + amount
      }, 0)
      return sum.toFixed(2)
    },
    orderRemarkTagOptions() {
      const source = Array.isArray(this.orderRemarkHistoryOptions) ? this.orderRemarkHistoryOptions : []
      if (!source.length) return []
      const keyword = String((this.editForm && this.editForm.remark) || '').trim().toLowerCase()
      const list = keyword
        ? source.filter(item => String((item && item.value) || '').toLowerCase().includes(keyword))
        : source
      return list.slice(0, 12)
    }
  },
  watch: {
    'editForm.orderNo'(val) {
      // if user hasn't manually edited customerOrderNo, keep them in sync
      if (!this.customerOrderEdited) {
        this.editForm.customerOrderNo = val
      }
    }
  },
  async created() {
    this.fetchOrders()
    this.fetchHistoryInitStatus()
    this.fetchCompanyInfo()
    this.fetchCustomers()
    this.fetchPrintTemplatesFromServer()
    this.fetchSpecs()
    this.salesOrderRefreshHandler = () => {
      this.fetchOrders()
      this.fetchHistoryInitStatus()
    }
    window.addEventListener('sales:orders:refresh', this.salesOrderRefreshHandler)
    this.ordersTableResizeHandler = () => this.scheduleTableLayout()
    window.addEventListener('resize', this.ordersTableResizeHandler)
  },
  activated() {
    // when navigating to this route (keep-alive) ensure list is fresh
    this.fetchOrders()
    this.fetchHistoryInitStatus()
  },
  deactivated() {
    if (this.salesOrderRefreshHandler) {
      window.removeEventListener('sales:orders:refresh', this.salesOrderRefreshHandler)
    }
    if (this.ordersTableResizeHandler) {
      window.removeEventListener('resize', this.ordersTableResizeHandler)
    }
  },
  beforeDestroy() {
    if (this.salesOrderRefreshHandler) {
      window.removeEventListener('sales:orders:refresh', this.salesOrderRefreshHandler)
    }
    if (this.ordersTableResizeHandler) {
      window.removeEventListener('resize', this.ordersTableResizeHandler)
    }
  },
  methods: {
    scheduleTableLayout() {
      this.$nextTick(() => {
        const table = this.$refs.ordersTable
        if (table && typeof table.doLayout === 'function') {
          table.doLayout()
          setTimeout(() => {
            if (table && typeof table.doLayout === 'function') {
              table.doLayout()
            }
          }, 40)
        }
      })
    },

    async fetchHistoryInitStatus() {
      try {
        const res = await getHistoryInitStatus()
        if (res && (res.code === 200 || res.code === 20000) && res.data) {
          this.historyInitState = Object.assign({
            initialized: 0,
            initializedAt: '',
            lastSyncAt: '',
            totalOrders: 0,
            totalItems: 0
          }, res.data)
        }
      } catch (e) {
        console.error('获取历史初始化状态失败:', e)
      }
    },
    formatDateTime(val) {
      if (!val) return '-'
      const d = new Date(val)
      if (!Number.isNaN(d.getTime())) {
        const yy = d.getFullYear()
        const mm = String(d.getMonth() + 1).padStart(2, '0')
        const dd = String(d.getDate()).padStart(2, '0')
        const hh = String(d.getHours()).padStart(2, '0')
        const mi = String(d.getMinutes()).padStart(2, '0')
        const ss = String(d.getSeconds()).padStart(2, '0')
        return `${yy}-${mm}-${dd} ${hh}:${mi}:${ss}`
      }
      return String(val)
    },
    formatRollProgress(row) {
      const completed = Number((row && (row.shippedRolls ?? row.completedRolls)) || 0)
      const remaining = Number((row && row.remainingRolls) || 0)
      return `${completed}/${remaining}`
    },
    formatOrderRemainingRolls(row) {
      return Number((row && row.remainingRolls) || 0)
    },
    getOrderCompletionStatusText(row) {
      const completed = Number((row && (row.shippedRolls ?? row.completedRolls)) || 0)
      const remaining = Number((row && row.remainingRolls) || 0)
      if (remaining <= 0) return '已完成'
      if (completed <= 0) return '未开始'
      return '部分完成'
    },
    getOrderCompletionStatusType(row) {
      const status = this.getOrderCompletionStatusText(row)
      if (status === '已完成') return 'success'
      if (status === '部分完成') return 'warning'
      return 'info'
    },
    getLifecycleStatusText(status) {
      const raw = String(status || '').trim()
      if (!raw) return '-'
      const upper = raw.toUpperCase()
      const lower = raw.toLowerCase()
      const map = {
        CREATED: '已下单',
        SCHEDULED: '已排程',
        IN_PRODUCTION: '生产中',
        PRODUCED: '生产完成',
        RECEIVED: '已收货',
        PARTIAL_RECEIVED: '部分收货',
        SHIPPED_PARTIAL: '部分发货',
        SHIPPED_FULL: '全部发货',
        PAYMENT_PARTIAL: '部分回款',
        PAID: '已回款',
        CLOSED: '关闭',
        CANCELLED: '取消',
        CANCELED: '取消',
        pending: '待处理',
        processing: '处理中',
        in_production: '生产中',
        produced: '生产完成',
        received: '已收货',
        partial_received: '部分收货',
        shipped_partial: '部分发货',
        shipped_full: '全部发货',
        completed: '已完成',
        cancelled: '取消',
        canceled: '取消',
        closed: '关闭'
      }
      return map[upper] || map[lower] || raw
    },
    getLifecycleStatusType(status) {
      const raw = String(status || '').trim()
      if (!raw) return 'info'
      const upper = raw.toUpperCase()
      if (upper === 'PAID' || upper === 'SHIPPED_FULL' || upper === 'PRODUCED' || upper === 'COMPLETED' || upper === 'RECEIVED') return 'success'
      if (upper === 'CANCELLED' || upper === 'CANCELED' || upper === 'CANCELLED' || upper === 'CLOSED') return 'danger'
      if (upper === 'SHIPPED_PARTIAL' || upper === 'IN_PRODUCTION' || upper === 'PROCESSING' || upper === 'PAYMENT_PARTIAL' || upper === 'PARTIAL_RECEIVED') return 'warning'
      return 'info'
    },
    formatItemCompletedRolls(item) {
      return Number((item && (item.deliveredQty ?? item.completedQty ?? item.shippedRolls)) || 0)
    },
    formatItemRemainingRolls(item) {
      if (!item) return 0
      if (item.remainingQty !== undefined && item.remainingQty !== null && item.remainingQty !== '') {
        return Number(item.remainingQty || 0)
      }
      const rolls = Number(item.rolls || 0)
      const completed = this.formatItemCompletedRolls(item)
      return Math.max(0, rolls - completed)
    },
    getItemCompletionStatusText(item) {
      const completed = this.formatItemCompletedRolls(item)
      const remaining = this.formatItemRemainingRolls(item)
      if (remaining <= 0) return '已完成'
      if (completed <= 0) return '未开始'
      return '部分完成'
    },
    getItemCompletionStatusType(item) {
      const status = this.getItemCompletionStatusText(item)
      if (status === '已完成') return 'success'
      if (status === '部分完成') return 'warning'
      return 'info'
    },
    isOrderCancelled(row) {
      const s = String((row && row.status) || '').trim().toLowerCase()
      return s === 'cancelled' || s === 'canceled' || s === 'closed'
    },
    getPrintTemplateConfig() {
      const current = (this.printTemplateOptions || []).find(t => t.value === this.selectedPrintTemplateKey)
      if (current && current.config) {
        return current.config
      }
      return {
        contractTitle: '销售合同',
        clauseOneTitle: '第一条 乙方所提供的产品及价格如下：',
        areaHeader: '总平方数',
        unitPriceHeader: '单价'
      }
    },
    buildDefaultTemplateOptions() {
      return [
        {
          value: 'contract_standard_v1',
          label: '标准合同模板（默认）',
          config: {
            contractTitle: '销售合同',
            clauseOneTitle: '第一条 乙方所提供的产品及价格如下：',
            areaHeader: '总平方数',
            unitPriceHeader: '单价'
          }
        },
        {
          value: 'contract_factory_v1',
          label: '工厂版合同模板',
          config: {
            contractTitle: '销售合同',
            clauseOneTitle: '第一条 名称规格及价格见下表：',
            areaHeader: '生产方数',
            unitPriceHeader: '单价'
          }
        },
        {
          value: 'contract_trade_v1',
          label: '贸易版合同模板',
          config: {
            contractTitle: '购销合同',
            clauseOneTitle: '第一条 供货明细及价格：',
            areaHeader: '数量面积',
            unitPriceHeader: '含税单价'
          }
        }
      ]
    },
    async fetchPrintTemplatesFromServer() {
      try {
        const res = await getSalesContractTemplates()
        if (res && (res.code === 200 || res.code === 20000) && Array.isArray(res.data) && res.data.length) {
          const serverOptions = res.data
            .filter(item => item && item.templateKey)
            .map(item => {
              let cfg = {}
              try {
                cfg = item.remark ? JSON.parse(item.remark) : {}
              } catch (e) {
                cfg = {}
              }
              return {
                value: item.templateKey,
                label: item.sceneName || item.templateKey,
                config: {
                  contractTitle: cfg.contractTitle || '销售合同',
                  clauseOneTitle: cfg.clauseOneTitle || '第一条 乙方所提供的产品及价格如下：',
                  areaHeader: cfg.areaHeader || '总平方数',
                  unitPriceHeader: cfg.unitPriceHeader || '单价'
                }
              }
            })
          if (serverOptions.length) {
            this.printTemplateOptions = serverOptions
            if (!this.printTemplateOptions.some(t => t.value === this.selectedPrintTemplateKey)) {
              this.selectedPrintTemplateKey = this.printTemplateOptions[0].value
            }
            return
          }
        }
        this.printTemplateOptions = this.buildDefaultTemplateOptions()
      } catch (e) {
        this.printTemplateOptions = this.buildDefaultTemplateOptions()
      }
    },
    getPrintTemplateLocalKey(customerCode) {
      return `sales-print-template:${customerCode || 'global'}`
    },
    getCustomerDefaultTemplateLocal(customerCode) {
      if (!customerCode) return ''
      try {
        return localStorage.getItem(this.getPrintTemplateLocalKey(customerCode)) || ''
      } catch (e) {
        return ''
      }
    },
    async saveCurrentCustomerTemplateLocal() {
      const customerCode = this.currentPrint && this.currentPrint.customer
      if (!customerCode) {
        this.$message.warning('未获取到客户信息，无法保存模板')
        return
      }
      try {
        const operator = (this.$store && this.$store.getters && this.$store.getters.name) || 'system'
        await saveSalesContractCustomerDefaultTemplate({ customerCode, templateKey: this.selectedPrintTemplateKey, operator })
        localStorage.setItem(this.getPrintTemplateLocalKey(customerCode), this.selectedPrintTemplateKey)
        this.$message.success('已设为当前客户默认打印模板')
      } catch (e) {
        try {
          localStorage.setItem(this.getPrintTemplateLocalKey(customerCode), this.selectedPrintTemplateKey)
          this.$message.warning('云端保存失败，已保存到本地模板')
        } catch (e2) {
          this.$message.error('保存模板失败')
        }
      }
    },
    emptyForm() {
      return {
        orderNo: '',
        customerId: null,
        customer: '',
        salesUserId: null,
        salesUserName: '',
        documentationPersonUserId: null,
        documentationPersonUserName: '',
        totalAmount: 0,
        totalArea: 0,
        orderDate: '',
        deliveryDate: '',
        deliveryAddress: '',
        remark: '',
        customerOrderNo: '',
        items: []
      }
    },
    saveOrderDraft() {
      if (this.isEditing) return
      inMemoryOrderDraft = {
        form: JSON.parse(JSON.stringify(this.editForm || this.emptyForm())),
        customerOrderEdited: !!this.customerOrderEdited,
        orderNoEdited: !!this.orderNoEdited,
        savedAt: Date.now()
      }
      this.$message.success('已暂存，稍后进入新增会优先恢复')
    },
    clearOrderDraft() {
      inMemoryOrderDraft = null
    },
    async restoreOrderDraftForCreate() {
      if (!inMemoryOrderDraft || !inMemoryOrderDraft.form) return false

      this.editForm = Object.assign(this.emptyForm(), JSON.parse(JSON.stringify(inMemoryOrderDraft.form)))
      this.editForm.items = Array.isArray(this.editForm.items) && this.editForm.items.length
        ? this.editForm.items
        : [this.createOrderItem()]
      this.customerOrderEdited = !!inMemoryOrderDraft.customerOrderEdited
      this.orderNoEdited = !!inMemoryOrderDraft.orderNoEdited
      this.editVisible = true

      if (this.editForm.customer) {
        await this.loadOrderRemarkHistory(this.editForm.customer)
      } else {
        this.orderRemarkHistoryOptions = []
      }

      this.$nextTick(() => {
        this.syncAllItemUnitPricesByQuotation()
      })
      for (const item of this.editForm.items) {
        this.$set(item, '_rowEditing', true)
        await this.loadHistorySpecsForRow(item)
      }
      return true
    },
    async loadOrderRemarkHistory(customerCode) {
      const normalizedCode = String(customerCode || '').trim()
      if (!normalizedCode) {
        this.orderRemarkHistoryOptions = []
        return
      }
      try {
        const res = await getOrderRemarkHistory({ customerCode: normalizedCode, limit: 30 })
        if (res && (res.code === 200 || res.code === 20000) && Array.isArray(res.data)) {
          this.orderRemarkHistoryOptions = (res.data || [])
            .map(item => {
              const text = String((item && item.remark) || '').trim()
              if (!text) return null
              return {
                value: text,
                useCount: Number(item.useCount || 0)
              }
            })
            .filter(Boolean)
        } else {
          this.orderRemarkHistoryOptions = []
        }
      } catch (e) {
        console.error('加载订单备注历史失败:', e)
        this.orderRemarkHistoryOptions = []
      }
    },
    queryOrderRemarkSuggestions(queryString, cb) {
      const keyword = String(queryString || '').trim().toLowerCase()
      const source = this.orderRemarkHistoryOptions || []
      if (!keyword) {
        cb(source)
        return
      }
      const result = source.filter(item => String(item.value || '').toLowerCase().includes(keyword))
      cb(result)
    },
    handleOrderRemarkSelect(item) {
      this.editForm.remark = (item && item.value) || ''
    },
    formatCustomerLabel(customer) {
      if (!customer) return ''
      const shortName = customer.shortName || '-'
      const code = customer.customerCode || '-'
      return `${shortName} / ${code}`
    },
    // 获取客户列表
    async fetchCustomers() {
      try {
        const res = await getCustomerList({ size: 1000 })
        if (res && (res.code === 20000 || res.code === 200)) {
          const data = res.data
          if (data && data.records) {
            this.customers = data.records
          } else if (Array.isArray(data)) {
            this.customers = data
          }
        }
      } catch (e) {
        console.error('获取客户列表失败:', e)
      }
    },
    createOrderItem() {
      return {
        materialCode: '',
        materialName: '',
        length: '',
        lengthDisplay: '',
        width: '',
        thickness: '',
        thicknessDisplay: '',
        rolls: '',
        deliveredQty: 0,
        remainingQty: 0,
        productionStatus: 'not_started',
        unitPrice: '',
        unit: '㎡',
        remark: '',
        _rowEditing: !this.isEditing,
        _unitPriceLocked: false,
        _quotationUnit: '㎡',
        historySpecOptions: [],
        historySpecKey: ''
      }
    },
    ensureRowEditState(row) {
      if (!row) return
      if (typeof row._rowEditing !== 'boolean') {
        this.$set(row, '_rowEditing', false)
      }
    },
    toggleItemEdit(row) {
      if (!row) return
      this.ensureRowEditState(row)
      this.$set(row, '_rowEditing', !row._rowEditing)
    },
    getItemSpecText(row) {
      if (!row) return '-'
      const t = row.thicknessDisplay || row.thickness || ''
      const w = row.width || ''
      const l = row.lengthDisplay || row.length || ''
      if (!t && !w && !l) return '-'
      return `${t || '-'} * ${w || '-'} * ${l || '-'}`
    },
    getProductionStatusLabel(status) {
      if (status === 'completed') return '已完成'
      if (status === 'partial') return '部分完成'
      return '未开始'
    },
    toNonNegativeInt(value) {
      const n = Number(value)
      if (!Number.isFinite(n)) return 0
      return Math.max(0, Math.floor(n))
    },
    normalizeEditCompletionFields(row) {
      if (!row) return
      const rolls = this.toNonNegativeInt(row.rolls)
      let completed = this.toNonNegativeInt(row.deliveredQty)
      if (completed > rolls) completed = rolls
      const remainingRaw = row.remainingQty
      const hasRemainingInput = !(remainingRaw === null || remainingRaw === undefined || remainingRaw === '')
      let remaining = hasRemainingInput
        ? this.toNonNegativeInt(remainingRaw)
        : Math.max(rolls - completed, 0)

      // 默认“未开始”场景：未完成时欠卷应随卷数自动回填
      if (String(row.productionStatus || '') === 'not_started' && completed <= 0) {
        remaining = Math.max(rolls, 0)
      }

      const maxRemaining = Math.max(rolls - completed, 0)
      if (remaining > maxRemaining) remaining = maxRemaining

      row.deliveredQty = completed
      row.remainingQty = remaining

      if (remaining <= 0) {
        row.productionStatus = 'completed'
      } else if (completed <= 0) {
        row.productionStatus = 'not_started'
      } else {
        row.productionStatus = 'partial'
      }
    },
    onEditRollsChanged(row) {
      this.normalizeEditCompletionFields(row)
    },
    onEditCompletedQtyChanged(row) {
      if (!row) return
      const rolls = this.toNonNegativeInt(row.rolls)
      let completed = this.toNonNegativeInt(row.deliveredQty)
      if (completed > rolls) completed = rolls
      row.deliveredQty = completed
      row.remainingQty = Math.max(rolls - completed, 0)
      this.normalizeEditCompletionFields(row)
    },
    onEditRemainingQtyChanged(row) {
      if (!row) return
      const rolls = this.toNonNegativeInt(row.rolls)
      let remaining = this.toNonNegativeInt(row.remainingQty)
      if (remaining > rolls) remaining = rolls
      row.remainingQty = remaining
      row.deliveredQty = Math.max(rolls - remaining, 0)
      this.normalizeEditCompletionFields(row)
    },
    onEditProductionStatusChanged(row) {
      if (!row) return
      const rolls = this.toNonNegativeInt(row.rolls)
      if (row.productionStatus === 'completed') {
        row.deliveredQty = rolls
        row.remainingQty = 0
      } else if (row.productionStatus === 'not_started') {
        row.deliveredQty = 0
        row.remainingQty = rolls
      } else {
        if (this.toNonNegativeInt(row.deliveredQty) <= 0 && rolls > 0) {
          row.deliveredQty = 1
        }
        if (this.toNonNegativeInt(row.deliveredQty) >= rolls && rolls > 1) {
          row.deliveredQty = rolls - 1
        }
        row.remainingQty = Math.max(rolls - this.toNonNegativeInt(row.deliveredQty), 0)
      }
      this.normalizeEditCompletionFields(row)
    },
    buildHistorySpecKey(item) {
      const t = item && item.thickness != null ? Number(item.thickness) : ''
      const w = item && item.width != null ? Number(item.width) : ''
      const l = item && item.length != null ? Number(item.length) : ''
      return `${t}|${w}|${l}`
    },
    sanitizeOneDecimalInput(value) {
      const raw = String(value == null ? '' : value).replace(/[^\d.]/g, '')
      if (!raw) return ''
      const dotIndex = raw.indexOf('.')
      if (dotIndex < 0) return raw
      const intPart = raw.slice(0, dotIndex).replace(/\./g, '')
      const decimalPart = raw.slice(dotIndex + 1).replace(/\./g, '').slice(0, 1)
      return decimalPart ? `${intPart}.${decimalPart}` : `${intPart}.`
    },
    onWidthInput(row) {
      if (!row) return
      row.width = this.sanitizeOneDecimalInput(row.width)
      this.onItemSpecChanged(row)
    },
    formatWidthOnBlur(row) {
      if (!row) return
      const width = this.toNumber(row.width)
      row.width = width === null ? '' : width.toFixed(1)
      this.onItemSpecChanged(row)
    },
    normalizeWidthOneDecimalNumber(value) {
      const width = this.toNumber(value)
      return width === null ? null : Number(width.toFixed(1))
    },
    formatWidthOneDecimal(value) {
      const width = this.toNumber(value)
      return width === null ? '' : width.toFixed(1)
    },
    async loadHistorySpecsForRow(row) {
      if (!row) return
      const customerCode = this.editForm.customer
      const materialCode = row.materialCode
      if (!customerCode || !materialCode) {
        this.$set(row, 'historySpecOptions', [])
        this.$set(row, 'historySpecKey', '')
        return
      }
      try {
        const res = await getOrderHistorySpecs({ customerCode, materialCode })
        if (res && (res.code === 200 || res.code === 20000) && Array.isArray(res.data)) {
          const list = res.data
            .map(item => {
              const thickness = this.toNumber(item.thickness)
              const width = this.toNumber(item.width)
              const length = this.toNumber(item.length)
              if (thickness === null || width === null || length === null) return null
              const key = this.buildHistorySpecKey({ thickness, width, length })
              const useCount = Number(item.useCount || 0)
              return {
                key,
                thickness,
                width,
                length,
                label: `${thickness}*${this.formatWidthOneDecimal(width)}*${Math.round(length)}${useCount > 0 ? `（历史${useCount}次）` : ''}`
              }
            })
            .filter(Boolean)
          this.$set(row, 'historySpecOptions', list)
          const currentKey = this.buildHistorySpecKey({
            thickness: row.thicknessDisplay,
            width: row.width,
            length: row.lengthDisplay || row.length
          })
          const matched = list.find(item => item.key === currentKey)
          this.$set(row, 'historySpecKey', matched ? matched.key : '')
        } else {
          this.$set(row, 'historySpecOptions', [])
          this.$set(row, 'historySpecKey', '')
        }
      } catch (e) {
        console.error('加载历史规格失败:', e)
        this.$set(row, 'historySpecOptions', [])
        this.$set(row, 'historySpecKey', '')
      }
    },
    async onHistorySpecDropdownVisible(row, visible) {
      if (!visible || !row) return
      const options = row.historySpecOptions || []
      if (options.length > 0) return
      await this.loadHistorySpecsForRow(row)
    },
    onHistorySpecSelect(row, specKey) {
      if (!row) return
      const options = row.historySpecOptions || []
      const selected = options.find(item => item.key === specKey)
      if (!selected) return
      row.thicknessDisplay = selected.thickness
      row.width = this.formatWidthOneDecimal(selected.width)
      row.lengthDisplay = selected.length
      this.onItemSpecChanged(row)
    },
    // 客户选择变更
    async onCustomerChange(customerId) {
      const customer = this.customers.find(c => c.id === customerId)
      if (customer) {
        // 使用客户代码作为customer字段（与数据库存储一致）
        this.editForm.customer = customer.customerCode
        // 自动填充销售和跟单员（使用展示字段显示用户真实姓名）
        this.editForm.salesUserId = customer.salesUserId || null
        this.editForm.salesUserName = customer.salesUserName || ''
        this.editForm.documentationPersonUserId = customer.documentationPersonUserId || null
        this.editForm.documentationPersonUserName = customer.documentationPersonUserName || ''
        // 自动填充收货地址
        if (customer.contactAddress) {
          this.editForm.deliveryAddress = customer.contactAddress
        }
        if (!this.isEditing && !this.orderNoEdited) {
          await this.loadOrderNo(customer.customerCode, this.editForm.orderDate)
        }
        await this.loadOrderRemarkHistory(customer.customerCode)
      } else {
        this.orderRemarkHistoryOptions = []
      }
      const rows = (this.editForm && this.editForm.items) || []
      for (const row of rows) {
        await this.loadHistorySpecsForRow(row)
      }
      if (!this.isEditing) {
        await this.ensureQuotationListLoaded()
        this.syncAllItemUnitPricesByQuotation()
      }
    },
    findCustomerForEdit(order = {}) {
      const candidates = [
        order.customerId,
        order.customer,
        order.customerCode
      ]
        .filter(value => value !== undefined && value !== null && value !== '')
        .map(value => String(value).trim())

      if (!candidates.length) return null

      return this.customers.find((customer) => {
        const customerId = customer.id !== undefined && customer.id !== null ? String(customer.id).trim() : ''
        const customerCode = String(customer.customerCode || '').trim()
        return candidates.includes(customerId) || candidates.includes(customerCode)
      }) || null
    },
    applyResolvedCustomerFields(order = {}) {
      const customer = this.findCustomerForEdit(order)
      const resolved = { ...order }

      if (customer) {
        resolved.customerId = resolved.customerId || customer.id || null
        resolved.customer = customer.customerCode || resolved.customer || ''
        const shortName = customer.shortName || customer.customerShortName || customer.customerName || ''
        resolved.customerDisplay = shortName || '-'
        resolved.customerName = customer.customerName || resolved.customerName || resolved.customerDisplay || resolved.customer || ''
        resolved.customerShortName = customer.shortName || customer.customerShortName || resolved.customerShortName || ''
        resolved.salesUserId = resolved.salesUserId || customer.salesUserId || null
        resolved.salesUserName = resolved.salesUserName || customer.salesUserName || ''
        resolved.documentationPersonUserId = resolved.documentationPersonUserId || customer.documentationPersonUserId || null
        resolved.documentationPersonUserName = resolved.documentationPersonUserName || customer.documentationPersonUserName || ''
        if (!resolved.deliveryAddress && customer.contactAddress) {
          resolved.deliveryAddress = customer.contactAddress
        }
      } else {
        const shortName = resolved.customerShortName || resolved.shortName || ''
        resolved.customerDisplay = shortName || '-'
        resolved.customerName = resolved.customerName || resolved.customerDisplay || resolved.customer || ''
        resolved.customerShortName = resolved.customerShortName || resolved.shortName || ''
      }

      return resolved
    },
    // 获取料号规格列表
    async fetchSpecs() {
      try {
        const res = await getAllEnabledSpecs()
        if (res && (res.code === 200 || res.code === 20000)) {
          this.specs = res.data || []
        }
      } catch (e) {
        console.error('获取料号列表失败:', e)
      }
    },
    async fetchQuotationList() {
      try {
        if (this.quotationListLoading) {
          return this.quotationList
        }
        this.quotationListLoading = true
        const res = await getQuotationList()
        if (res && (res.code === 200 || res.code === 20000)) {
          const list = (res.data && res.data.data) || res.data || []
          this.quotationList = Array.isArray(list) ? list : []
          this.quotationListLoaded = true
        }
      } catch (e) {
        console.error('获取报价单列表失败:', e)
        this.quotationList = []
        this.quotationListLoaded = false
      } finally {
        this.quotationListLoading = false
      }
    },
    async ensureQuotationListLoaded() {
      if (this.quotationListLoaded) return this.quotationList
      return this.fetchQuotationList()
    },
    // 产品编码选择变更 - 自动带出产品名称和厚度
    async onMaterialCodeChange(row, materialCode) {
      if (!materialCode) {
        this.$set(row, 'historySpecOptions', [])
        this.$set(row, 'historySpecKey', '')
        this.$set(row, '_unitPriceLocked', false)
        return
      }
      const normalizedCode = this.normalizeMaterialCode(materialCode)
      const spec = this.specs.find(s => this.normalizeMaterialCode(s.materialCode) === normalizedCode)
      if (spec) {
        row.materialName = spec.productName || row.materialName
        row.colorCode = spec.colorCode || row.colorCode // 自动填充颜色代码
        // Convert thickness from baseThickness(um) to display format if needed
        // Assuming database stores um for display fields in FE
        if (spec.totalThickness) {
          row.thicknessDisplay = spec.totalThickness
        } else if (spec.baseThickness) { // fallback
          row.thicknessDisplay = spec.baseThickness
        }
      }
      await this.loadHistorySpecsForRow(row)
      if (!this.isEditing) {
        await this.ensureQuotationListLoaded()
        this.syncItemUnitPriceFromQuotation(row)
      }
    },
    onItemSpecChanged(row) {
      const key = this.buildHistorySpecKey({
        thickness: row.thicknessDisplay,
        width: row.width,
        length: row.lengthDisplay || row.length
      })
      const options = row.historySpecOptions || []
      const matched = options.find(item => item.key === key)
      this.$set(row, 'historySpecKey', matched ? matched.key : '')
      this.syncItemUnitPriceFromQuotation(row)
    },
    isUnitPriceLocked(row) {
      return !!(row && row._unitPriceLocked)
    },
    normalizePricingUnit(unit) {
      const rawUnit = String(unit || '').trim()
      if (rawUnit === '米' || rawUnit === 'M' || rawUnit === 'm') return 'm'
      if (rawUnit === '平方米' || rawUnit === 'm²' || rawUnit === 'm2' || rawUnit === 'M²' || rawUnit === 'M2' || rawUnit === '㎡') return '㎡'
      if (rawUnit === '卷') return '卷'
      return '㎡'
    },
    getPricingUnit(row) {
      return this.normalizePricingUnit((row && (row._quotationUnit || row.unit)) || '㎡')
    },
    getUnitPricePlaceholder(row) {
      const unit = this.getPricingUnit(row)
      const unitText = unit === '卷' ? '元/卷' : (unit === 'm' ? '元/米' : '元/㎡')
      return this.isUnitPriceLocked(row) ? `报价锁定(${unitText})` : unitText
    },
    getPricingUnitText(row) {
      const unit = this.getPricingUnit(row)
      return unit === '卷' ? '元/卷' : (unit === 'm' ? '元/米' : '元/㎡')
    },
    formatUnitPriceWithUnit(row) {
      if (!row) return '-'
      const price = this.toNumber(row.unitPrice)
      if (price === null) return '-'
      return `${price.toFixed(4)} (${this.getPricingUnitText(row)})`
    },
    formatUnitPrice(value) {
      const number = this.toNumber(value)
      if (number === null) return ''
      return number.toFixed(4)
    },
    formatOrderUnitPriceOnBlur(row) {
      if (!row) return
      const formatted = this.formatUnitPrice(row.unitPrice)
      if (formatted !== '') {
        this.$set(row, 'unitPrice', formatted)
      }
    },
    calcChargeQuantityNumber(item) {
      const unit = this.getPricingUnit(item)
      const rolls = Number(item.rolls) || 0
      const lengthM = Number(item.lengthDisplay || item.length) || 0
      if (unit === '卷') {
        return rolls
      }
      if (unit === 'm') {
        return lengthM * rolls
      }
      return this.calcSqmNumber(item)
    },
    calcStandardSqmUnitPrice(item) {
      if (!item) return ''
      const price = this.toNumber(item.unitPrice)
      if (price === null || price <= 0) return ''

      const unit = this.getPricingUnit(item)
      if (unit === '㎡') {
        return price.toFixed(4)
      }

      const widthMm = Number(item.width) || 0
      const widthM = widthMm / 1000
      if (unit === 'm') {
        if (!Number.isFinite(widthM) || widthM <= 0) return ''
        return (price / widthM).toFixed(4)
      }

      if (unit === '卷') {
        const lengthM = Number(item.lengthDisplay || item.length) || 0
        const sqmPerRoll = (widthMm * lengthM) / 1000
        if (!Number.isFinite(sqmPerRoll) || sqmPerRoll <= 0) return ''
        return (price / sqmPerRoll).toFixed(4)
      }

      return ''
    },
    calcAmountNumber(item) {
      const price = this.toNumber(item && item.unitPrice)
      if (price === null) return 0
      return this.calcChargeQuantityNumber(item) * price
    },
    toNumber(value) {
      if (value === null || value === undefined || value === '') return null
      const n = Number(value)
      return Number.isFinite(n) ? n : null
    },
    normalizeMaterialCode(value) {
      if (value === null || value === undefined) return ''
      return String(value)
        .replace(/\u00A0/g, ' ')
        .replace(/\u3000/g, ' ')
        .replace(/\s+/g, '')
        .replace(/[^0-9A-Za-z\u4e00-\u9fa5_-]/g, '')
        .toUpperCase()
        .trim()
    },
    numberEquals(a, b) {
      if (a === null || b === null) return false
      return Math.abs(a - b) < 0.000001
    },
    syncAllItemUnitPricesByQuotation() {
      if (this.isEditing) return
      const items = (this.editForm && this.editForm.items) || []
      items.forEach(item => this.syncItemUnitPriceFromQuotation(item))
    },
    syncItemUnitPriceFromQuotation(row) {
      if (this.isEditing) return
      if (!row) return
      const customerCode = this.editForm.customer
      const materialCode = this.normalizeMaterialCode(row.materialCode)
      const rowWidth = this.toNumber(row.width)
      const rowLength = this.toNumber(row.lengthDisplay || row.length)

      if (!customerCode || !materialCode) {
        this.$set(row, '_unitPriceLocked', false)
        return
      }

      const allCandidates = []
      ;(this.quotationList || []).forEach(q => {
        if (!q || String(q.customer || '').trim() !== String(customerCode || '').trim()) return
        const qStatus = String(q.status || '').toLowerCase()
        if (qStatus !== 'accepted' && qStatus !== '已接受') return

        ;(q.items || []).forEach(item => {
          if (!item) return
          if (this.normalizeMaterialCode(item.materialCode) !== materialCode) return
          const itemThickness = this.toNumber(item.thickness)
          const itemWidth = this.toNumber(item.width)
          const itemLength = this.toNumber(item.length)
          const itemPrice = this.toNumber(item.unitPrice)
          if (itemPrice === null) return
          const unit = this.normalizePricingUnit(item.unit || q.pricingUnit)
          if (itemPrice <= 0) return

          const payload = {
            unitPrice: itemPrice,
            unit,
            thickness: itemThickness,
            width: itemWidth,
            length: itemLength,
            versionNo: this.toNumber(item.versionNo),
            quotationDate: q.quotationDate || '',
            sortTime: q.updatedAt || q.quotationDate || q.createdAt || ''
          }
          allCandidates.push(payload)
        })
      })

      const pickLatestCandidate = (list) => {
        if (!list.length) return null
        const toTs = (v) => {
          const t = Date.parse(String(v || '').replace(/-/g, '/'))
          return Number.isFinite(t) ? t : 0
        }
        const sorted = list.slice().sort((a, b) => {
          const t2 = toTs(b.quotationDate) - toTs(a.quotationDate)
          if (t2 !== 0) return t2

          const v1 = (Number.isFinite(b.versionNo) ? b.versionNo : -1) - (Number.isFinite(a.versionNo) ? a.versionNo : -1)
          if (v1 !== 0) return v1
          return 0
        })
        return sorted[0]
      }

      const latestOverall = pickLatestCandidate(allCandidates)
      const latestUnit = latestOverall ? latestOverall.unit : '㎡'

      let picked = null
      if (latestUnit === '㎡') {
        const sqmCandidates = allCandidates.filter(c => c.unit === '㎡')
        const exactSpecCandidates = sqmCandidates.filter(c => this.numberEquals(c.width, rowWidth) && this.numberEquals(c.length, rowLength))
        picked = pickLatestCandidate(exactSpecCandidates) || pickLatestCandidate(sqmCandidates)
      } else if (latestUnit === 'm' || latestUnit === '卷') {
        const sameUnitCandidates = allCandidates.filter(c => {
          if (c.unit !== latestUnit) return false
          if (latestUnit === 'm') {
            return this.numberEquals(c.width, rowWidth)
          }
          return this.numberEquals(c.width, rowWidth) && this.numberEquals(c.length, rowLength)
        })
        picked = pickLatestCandidate(sameUnitCandidates)
      }

      if (picked) {
        this.$set(row, 'unitPrice', this.formatUnitPrice(picked.unitPrice))
        this.$set(row, '_quotationUnit', picked.unit || '㎡')
        this.$set(row, 'unit', picked.unit || '㎡')
        this.$set(row, '_unitPriceLocked', true)
      } else {
        this.$set(row, 'unitPrice', '')
        this.$set(row, '_quotationUnit', this.getPricingUnit(row))
        this.$set(row, '_unitPriceLocked', false)
      }
    },
    async onOrderDateChange() {
      if (this.isEditing || this.orderNoEdited) return
      if (this.editForm.customerId) {
        const customer = this.customers.find(c => c.id === this.editForm.customerId)
        if (customer) {
          await this.loadOrderNo(customer.customerCode, this.editForm.orderDate)
        }
      }
    },
    handleOrderNoInput(value) {
      this.orderNoEdited = !!String(value || '').trim()
    },
    handleIncrementOrderNoSuffix() {
      const current = String((this.editForm && this.editForm.orderNo) || '').trim()
      if (!current) {
        this.$message.warning('请先填写订单编号')
        return
      }
      const m = current.match(/^(.*?)(\d+)$/)
      if (!m) {
        this.$message.warning('当前订单编号末尾不是数字，无法后缀自增')
        return
      }
      const prefix = m[1]
      const seqText = m[2]
      const width = Math.max(2, seqText.length)
      const next = Number(seqText) + 1
      this.editForm.orderNo = `${prefix}${String(next).padStart(width, '0')}`
      if (!this.customerOrderEdited) {
        this.editForm.customerOrderNo = this.editForm.orderNo
      }
      this.orderNoEdited = true
    },
    async handleGenerateOrderNo() {
      if (this.isEditing) return
      const customer = this.customers.find(c => c.id === this.editForm.customerId)
      if (!customer || !customer.customerCode) {
        this.$message.warning('请先选择客户，再自动生成订单编号')
        return
      }
      this.orderNoEdited = false
      const ok = await this.loadOrderNo(customer.customerCode, this.editForm.orderDate)
      if (ok) {
        this.$message.success('订单编号已自动生成')
      }
    },
    async loadOrderNo(customerCode, orderDate) {
      if (!customerCode) return
      try {
        const params = { customerCode }
        if (orderDate) params.orderDate = orderDate
        const res = await generateOrderNo(params)
        if (res && (res.code === 200 || res.code === 20000) && res.data) {
          this.editForm.orderNo = res.data.orderNo || ''
          if (!this.customerOrderEdited) {
            this.editForm.customerOrderNo = this.editForm.orderNo
          }
          this.orderNoEdited = false
          return true
        }
        this.$message.error('订单号生成失败：未获取到后端有效结果')
        return false
      } catch (e) {
        console.error('生成订单号失败:', e)
        this.$message.error('订单号生成失败：请检查后端服务后重试')
        return false
      }
    },
    async fetchOrders() {
      try {
        const params = {
          pageNum: this.currentPage,
          pageSize: this.pageSize,
          orderNo: this.searchForm.orderNo || undefined,
          customer: this.searchForm.customer || undefined,
          status: this.searchForm.lifecycleStatus || undefined,
          showCompleted: !!this.searchForm.showCompleted,
          startDate: this.searchForm.orderDateStart || undefined,
          endDate: this.searchForm.orderDateEnd || undefined,
          sortProp: this.sortProp || undefined,
          sortOrder: this.sortOrder || undefined
        }

        console.log('搜索参数:', params)
        const res = await getOrders(params)
        console.log('搜索结果:', res)

        if (res && res.code === 200) {
          const pageInfo = res.data
          const list = pageInfo.list || pageInfo.records || []
          this.total = Number(pageInfo.total || 0)

          if (Array.isArray(list)) {
            this.orders = list.map(order => this.applyResolvedCustomerFields(order))
            console.log('订单列表更新，共', this.orders.length, '条记录')
          } else {
            console.error('订单数据格式错误:', pageInfo)
            this.$message.error('订单数据格式错误')
          }
        } else {
          console.error('获取订单失败，响应码:', res ? res.code : 'undefined')
          this.$message.error('获取订单失败')
        }
      } catch (e) {
        console.error('获取订单异常:', e)
        this.$message.error('获取订单失败: ' + (e.message || '未知错误'))
      } finally {
        this.scheduleTableLayout()
      }
    },
    // 排序变更 - 触发后端全表排序
    handleSortChange({ prop, order }) {
      this.sortProp = prop
      this.sortOrder = order
      this.currentPage = 1
      this.fetchOrders()
    },
    // 搜索
    handleSearch() {
      console.log('执行搜索，搜索条件:', this.searchForm)
      this.currentPage = 1
      this.fetchOrders()
    },
    handleShowCompletedChange() {
      this.handleSearch()
    },
    // 重置搜索
    handleReset() {
      console.log('重置搜索')
      this.searchForm = {
        customer: '',
        orderNo: '',
        lifecycleStatus: '',
        showCompleted: false,
        orderDateStart: '',
        orderDateEnd: ''
      }
      this.handleSearch()
    },
    handleSizeChange(val) {
      this.pageSize = val
      this.fetchOrders()
    },
    handleCurrentChange(val) {
      this.currentPage = val
      this.fetchOrders()
    },
    async viewDetail(row) {
      try {
        const res = await getOrderDetail(row.orderNo)
        if (res && res.code === 200) {
          this.currentOrder = this.applyResolvedCustomerFields(res.data || {})
          this.detailVisible = true
        } else {
          this.$message.error('获取订单详情失败')
        }
      } catch (e) {
        console.error('获取订单详情异常:', e)
        this.$message.error('获取订单详情失败')
      }
    },
    async openCreate() {
      this.isEditing = false
      this.removedItemIds = []
      const restored = await this.restoreOrderDraftForCreate()
      if (restored) {
        this.$message.info('已恢复上次暂存的未完成信息')
        return
      }
      this.editForm = this.emptyForm()
      // default orderDate to today (format yyyy-MM-dd) for new orders
      const d = new Date()
      const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      this.editForm.orderDate = today
      // reset customer order sync flag and ensure customerOrderNo follows orderNo
      this.customerOrderEdited = false
      this.orderNoEdited = false
      this.editForm.customerOrderNo = this.editForm.orderNo
      this.editForm.deliveryAddress = ''
      this.editForm.remark = ''
      this.orderRemarkHistoryOptions = []
      this.editForm.items = [this.createOrderItem()]
      this.editVisible = true
      this.ensureQuotationListLoaded()
    },
    addItem() {
      this.editForm.items.push(this.createOrderItem())
    },
    async duplicateItemBasics(index) {
      const items = (this.editForm && this.editForm.items) || []
      const source = items[index]
      if (!source) {
        return
      }

      const newItem = this.createOrderItem()
      newItem.materialCode = source.materialCode || ''
      newItem.materialName = source.materialName || ''
      newItem.colorCode = source.colorCode || ''
      newItem.thickness = source.thickness || ''
      newItem.thicknessDisplay = source.thicknessDisplay || source.thickness || ''

      this.editForm.items.push(newItem)
      await this.loadHistorySpecsForRow(newItem)
      this.syncItemUnitPriceFromQuotation(newItem)
    },
    async duplicateLastItemBasics() {
      const items = (this.editForm && this.editForm.items) || []
      if (!items.length) {
        this.editForm.items.push(this.createOrderItem())
        return
      }

      const source = items[items.length - 1] || {}
      const newItem = this.createOrderItem()
      newItem.materialCode = source.materialCode || ''
      newItem.materialName = source.materialName || ''
      newItem.colorCode = source.colorCode || ''
      newItem.thickness = source.thickness || ''
      newItem.thicknessDisplay = source.thicknessDisplay || source.thickness || ''

      this.editForm.items.push(newItem)
      await this.loadHistorySpecsForRow(newItem)
      this.syncItemUnitPriceFromQuotation(newItem)
    },
    async removeItem(idx, row) {
      const target = row || this.editForm.items[idx]
      if (!target) return
      const targetId = Number(target.id || target.itemId || target.orderItemId || 0)

      if (this.isEditing && targetId > 0 && this.editForm && this.editForm.orderNo) {
        try {
          await this.$confirm('确认删除该条明细吗？删除后将立即生效。', '提示', {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
          })
        } catch (e) {
          return
        }

        try {
          const res = await deleteOrderItem(this.editForm.orderNo, targetId)
          if (res && (res.code === 200 || res.code === 20000)) {
            this.editForm.items.splice(idx, 1)
            this.removedItemIds = (this.removedItemIds || []).filter(id => Number(id) !== targetId)
            this.$message.success('明细删除成功')
            await this.fetchOrders()
          } else {
            this.$message.error((res && (res.msg || res.message)) || '明细删除失败')
          }
        } catch (e) {
          this.$message.error((e && e.message) || '明细删除失败')
        }
        return
      }

      if (targetId > 0) {
        this.removedItemIds.push(targetId)
      }
      this.editForm.items.splice(idx, 1)
    },
    async openEdit(row) {
      try {
        // 编辑前先获取最新详情
        const res = await getOrderDetail(row.orderNo)
        if (!res || res.code !== 200) {
          this.$message.error('获取订单详情失败')
          return
        }

        const detailOrder = res.data
        this.isEditing = true
        this.removedItemIds = []
        this.editForm = this.applyResolvedCustomerFields(JSON.parse(JSON.stringify(detailOrder)))

        // ensure deliveryAddress and customerOrderNo exist
        this.editForm.deliveryAddress = this.editForm.deliveryAddress || ''
        this.editForm.remark = this.editForm.remark || ''
        this.editForm.customerOrderNo = this.editForm.customerOrderNo || this.editForm.orderNo
        if (!this.editForm.customerId) {
          this.editForm.customerId = null
        }

        await this.loadOrderRemarkHistory(this.editForm.customer)

        if (this.editForm.items) {
          this.editForm.items.forEach(item => {
            const idNum = Number(item.id || item.itemId || item.orderItemId || 0)
            item.id = idNum > 0 ? idNum : null
            item.thicknessDisplay = item.thickness != null ? item.thickness : ''
            item.lengthDisplay = item.length ? Math.round(item.length) : ''
            // normalize numeric fields to strings so inputs show properly
            item.length = item.length != null ? item.length : ''
            item.width = item.width != null ? this.formatWidthOneDecimal(item.width) : ''
            item.rolls = item.rolls != null ? item.rolls : ''
            item.deliveredQty = item.deliveredQty != null ? item.deliveredQty : (item.shippedRolls || 0)
            item.remainingQty = item.remainingQty != null ? item.remainingQty : Math.max((Number(item.rolls) || 0) - (Number(item.deliveredQty) || 0), 0)
            item.productionStatus = item.productionStatus || 'not_started'
            item.unitPrice = item.unitPrice != null ? this.formatUnitPrice(item.unitPrice) : ''
            item.unit = this.normalizePricingUnit(item.unit)
            item._quotationUnit = this.normalizePricingUnit(item.unit)
            item._unitPriceLocked = false
            this.$set(item, '_rowEditing', false)
            this.$set(item, 'historySpecOptions', [])
            this.$set(item, 'historySpecKey', '')
            this.normalizeEditCompletionFields(item)
          })
        } else {
          this.editForm.items = []
        }

        // determine if customerOrderNo was independently set
        this.customerOrderEdited = !!(this.editForm.customerOrderNo && this.editForm.customerOrderNo !== this.editForm.orderNo)
        this.orderNoEdited = true
        this.editVisible = true
        this.$nextTick(() => {
          this.syncAllItemUnitPricesByQuotation()
        })
        for (const item of this.editForm.items) {
          await this.loadHistorySpecsForRow(item)
        }
      } catch (e) {
        console.error('打开编辑异常:', e)
        this.$message.error('打开编辑失败')
      }
    },
    calcSqm(item) {
      return this.calcSqmNumber(item).toFixed(2)
    },
    calcSqmNumber(item) {
      // 处理两种情况：
      // 1. 编辑时：使用lengthDisplay（米），需要转换
      // 2. 显示/保存时：使用length（毫米）
      // 数据库存储：长度(m)、宽度(mm)
      const lengthM = Number(item.lengthDisplay || item.length) || 0
      const widthMm = Number(item.width) || 0
      const rolls = Number(item.rolls) || 0
      // 公式：长度(m) * 宽度(mm) * 卷数 / 1000 = 平方米
      return (lengthM * widthMm * rolls) / 1000
    },
    async saveOrder() {
      try {
        if (!this.editForm.orderNo) {
          this.$message.error('请填写订单编号')
          return
        }
        if (!this.editForm.customerId) {
          this.$message.error('请选择客户')
          return
        }
        if (!this.isEditing) {
          const exists = this.orders.some(order => String(order.orderNo) === String(this.editForm.orderNo))
          if (exists) {
            this.$message.error('订单编号已存在，请更换后再保存')
            return
          }
        }
        // prepare and validate items: skip fully empty rows, require fields for non-empty rows
        const raw = JSON.parse(JSON.stringify(this.editForm))
        const preparedItems = []
        for (let i = 0; i < (raw.items || []).length; i++) {
          const it = raw.items[i]
          // consider row empty if all main fields are empty/falsy
          const isEmptyRow = !it.materialCode && !it.materialName && !it.lengthDisplay && !it.width && !it.rolls && !it.unitPrice && !it.thicknessDisplay
          if (isEmptyRow) continue // skip entirely empty rows

          // validate required fields on non-empty rows
          const missing = []
          if (!it.materialCode) missing.push('产品编码')
          if (!it.materialName) missing.push('产品名称')
          if (!it.lengthDisplay) missing.push('长度')
          if (!it.width) missing.push('宽度')
          if (!it.rolls) missing.push('卷数')
          if (!it.unitPrice && it.unitPrice !== 0) missing.push('单价')
          if (missing.length) {
            this.$message.error(`第 ${i + 1} 行缺少必填项：${missing.join(', ')}`)
            return
          }

          // convert types
          const converted = {
            materialCode: String(it.materialCode),
            materialName: String(it.materialName),
            length: Number(it.lengthDisplay), // 米，直接存储
            width: this.normalizeWidthOneDecimalNumber(it.width), // 毫米（保留1位小数）
            rolls: Number(it.rolls),
            deliveredQty: this.toNonNegativeInt(it.deliveredQty),
            remainingQty: this.toNonNegativeInt(it.remainingQty),
            productionStatus: it.productionStatus || undefined,
            unit: this.getPricingUnit(it),
            unitPrice: Number(this.formatUnitPrice(it.unitPrice)),
            amount: Number(this.calcAmountNumber(it).toFixed(2)),
            remark: it.remark || ''
          }
          if (converted.deliveredQty > converted.rolls) {
            converted.deliveredQty = converted.rolls
          }
          const maxRemaining = Math.max(converted.rolls - converted.deliveredQty, 0)
          if (converted.remainingQty > maxRemaining) {
            converted.remainingQty = maxRemaining
          }
          if (!converted.productionStatus) {
            if (converted.remainingQty <= 0) converted.productionStatus = 'completed'
            else if (converted.deliveredQty <= 0) converted.productionStatus = 'not_started'
            else converted.productionStatus = 'partial'
          }

          // 按状态回填数量，避免“未开始但欠卷=0”被误判成已完成后在列表被过滤
          if (converted.productionStatus === 'completed') {
            converted.deliveredQty = converted.rolls
            converted.remainingQty = 0
          } else if (converted.productionStatus === 'not_started') {
            converted.deliveredQty = 0
            converted.remainingQty = Math.max(converted.rolls, 0)
          } else {
            // partial: 保持数量口径一致
            if (converted.deliveredQty <= 0 && converted.rolls > 0) {
              converted.deliveredQty = 1
            }
            if (converted.deliveredQty >= converted.rolls && converted.rolls > 1) {
              converted.deliveredQty = converted.rolls - 1
            }
            converted.remainingQty = Math.max(converted.rolls - converted.deliveredQty, 0)
          }
          // 保留明细ID（如果存在），转换为数字类型
          const itemId = Number(it.id || it.itemId || it.orderItemId || 0)
          if (itemId > 0) {
            converted.id = itemId
          }
          if (it.thicknessDisplay !== undefined && it.thicknessDisplay !== '') {
            converted.thickness = Number(it.thicknessDisplay)
          } else {
            converted.thickness = 0
          }
          preparedItems.push(converted)
        }

        if (preparedItems.length === 0) {
          this.$message.error('请填写至少一行有效的物料明细后再提交')
          return
        }
        const payload = JSON.parse(JSON.stringify(this.editForm))
        payload.items = preparedItems
        payload.removedItemIds = Array.from(new Set((this.removedItemIds || []).filter(id => !!id)))
        // 调试：打印实际发送的数据
        console.log('=== 准备提交的payload ===')
        console.log('isEditing:', this.isEditing)
        console.log('payload.items:', JSON.stringify(payload.items, null, 2))
        // compute totals from items
        payload.totalArea = payload.items.reduce((sum, it) => sum + this.calcSqmNumber(it), 0)
        payload.totalAmount = payload.items.reduce((sum, it) => sum + this.calcAmountNumber(it), 0)
        payload.totalArea = Number(payload.totalArea.toFixed(2))
        payload.totalAmount = Number(payload.totalAmount.toFixed(2))

        if (this.isEditing) {
          const res = await updateOrder(payload)
          if (res && res.code === 200) {
            await this.fetchOrders()
            window.dispatchEvent(new Event('dashboard:refresh'))
            this.$message.success('更新成功')
            this.editVisible = false
            this.removedItemIds = []
          } else {
            this.$message.error('更新失败')
          }
        } else {
          const res = await createOrder(payload)
          if (res && res.code === 200) {
            // 返回订单列表后刷新一次，并按下单日期降序展示
            this.currentPage = 1
            this.sortProp = 'orderDate'
            this.sortOrder = 'descending'
            await this.fetchOrders()
            this.clearOrderDraft()
            window.dispatchEvent(new Event('dashboard:refresh'))
            window.dispatchEvent(new CustomEvent('dashboard:refresh', {
              detail: { source: 'sales-orders', type: 'created' }
            }))
            this.$message.success('创建成功')
            this.editVisible = false
          } else {
            this.$message.error('创建失败')
          }
        }
      } catch (e) {
        const errMsg = (e && (e.message || (e.response && e.response.data && (e.response.data.message || e.response.data.msg)))) || ''
        if (errMsg.includes('Duplicate entry') && errMsg.includes('uk_order_no')) {
          this.$message.error('订单编号已存在，请更换后再保存')
        } else if (errMsg) {
          this.$message.error(errMsg)
        } else {
          this.$message.error('保存失败')
        }
      }
    },
    confirmDelete(row) {
      // eslint-disable-next-line object-curly-spacing
      this.$confirm(`确认删除订单 ${row.orderNo} 吗？`, '提示', { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning'}).then(() => {
        this.doDeleteOrder(row)
      }).catch(() => {})
    },
    async confirmCancelOrder(row) {
      try {
        const { value } = await this.$prompt(`请输入订单 ${row.orderNo} 的取消原因`, '取消订单', {
          confirmButtonText: '确定取消',
          cancelButtonText: '取消',
          inputType: 'textarea',
          inputPlaceholder: '请填写取消原因（必填）',
          inputValidator: (v) => {
            if (!v || !String(v).trim()) return '取消原因不能为空'
            if (String(v).trim().length < 2) return '取消原因至少2个字'
            return true
          }
        })
        await this.doCancelOrder(row, String(value || '').trim())
      } catch (e) {
        // 用户取消输入
      }
    },
    async doCancelOrder(row, cancelReason) {
      try {
        const res = await cancelOrder({ orderNo: row.orderNo, cancelReason })
        if (res && (res.code === 200 || res.code === 20000)) {
          await this.fetchOrders()
          this.$message.success('订单已取消')
        } else {
          this.$message.error((res && (res.message || res.msg)) || '取消失败')
        }
      } catch (e) {
        const msg = (e && (e.message || (e.response && e.response.data && (e.response.data.message || e.response.data.msg)))) || '取消失败'
        this.$message.error(msg)
      }
    },
    async doDeleteOrder(row) {
      try {
        const res = await deleteOrder(row.orderNo)
        if (res && res.code === 200) {
          await this.fetchOrders()
          this.$message.success('删除成功')
          // adjust page if last item on last page was removed
          const maxPage = Math.max(1, Math.ceil(this.total / this.pageSize))
          if (this.currentPage > maxPage) this.currentPage = maxPage
        } else {
          this.$message.error('删除失败')
        }
      } catch (e) {
        this.$message.error('删除失败')
      }
    },
    calcAmount(item) {
      return this.calcAmountNumber(item).toFixed(2)
    }, totalArea(order) {
      if (!order || !order.items) return '0.00'
      // 调试：打印明细数据
      console.log('totalArea - order.items:', order.items)
      // 优先使用数据库存储的 sqm，否则计算
      const sum = order.items.reduce((s, it) => {
        const sqm = it.sqm || this.calcSqmNumber(it)
        console.log('  item sqm:', sqm, 'current sum:', s)
        return s + sqm
      }, 0)
      console.log('totalArea result:', sum)
      return sum.toFixed(2)
    }, totalAmount(order) {
      if (!order || !order.items) return '0.00'
      // 调试：打印明细数据
      console.log('totalAmount - order.items:', order.items)
      // 优先使用数据库存储的 amount，否则计算
      const sum = order.items.reduce((s, it) => {
        const amt = it.amount || this.calcAmountNumber(it)
        console.log('  item amount:', amt, 'current sum:', s)
        return s + amt
      }, 0)
      console.log('totalAmount result:', sum)
      return sum.toFixed(2)
    },
    indexMethod(index) {
      return (this.currentPage - 1) * this.pageSize + index + 1
    },
    async handleExportAll() {
      // confirm dialog before exporting? optional.
      // pass current search filters to export
      const params = {
        orderNo: this.searchForm.orderNo,
        customer: this.searchForm.customer,
        status: this.searchForm.lifecycleStatus,
        showCompleted: this.searchForm.showCompleted,
        startDate: this.searchForm.orderDateStart,
        endDate: this.searchForm.orderDateEnd
      }
      try {
        const blob = await exportOrders(params)
        this.triggerBlobDownload(blob, '销售订单数据.xlsx')
      } catch (e) {
        console.error('导出失败:', e)
        this.$message.error('导出失败: ' + (e.message || '未知错误'))
      }
    },
    async handleDownloadTemplate() {
      if (this.$canImportExport()) {
        try {
          const blob = await downloadOrderTemplate()
          this.triggerBlobDownload(blob, '销售订单导入模板.xlsx')
        } catch (e) {
          console.error('下载模板失败:', e)
          this.$message.error('下载模板失败: ' + (e.message || '未知错误'))
        }
      } else {
        this.$message.warning('权限不足')
      }
    },
    triggerBlobDownload(blob, fileName) {
      if (!blob) {
        this.$message.error('下载失败: 空文件')
        return
      }
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.style.display = 'none'
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    },
    async handleImportClick(mode = 'normal') {
      if (this.$canImportExport()) {
        if (mode === 'historyInit') {
          if (!this.isAdminUser) {
            this.$message.warning('仅管理员可执行历史初始化')
            return
          }
          try {
            await this.$confirm(
              '历史初始化通常只执行一次，且可能导入大量历史完成订单。确认继续吗？',
              '确认执行历史初始化',
              {
                confirmButtonText: '确认初始化',
                cancelButtonText: '取消',
                type: 'warning'
              }
            )
          } catch (e) {
            return
          }
        }
        if (mode === 'incrementalSync' && this.historyInitState.initialized !== 1) {
          this.$message.warning('请先完成历史初始化，再执行增量同步')
          return
        }
        this.importMode = mode
        this.$refs.importFile.click()
      } else {
        this.$message.warning('权限不足')
      }
    },
    async handleImportChange(e) {
      const file = e.target.files[0]
      if (!file) return
      // reset input
      e.target.value = ''

      try {
        let res
        if (this.importMode === 'historyInit') {
          res = await importHistoryInitOrders(file)
        } else if (this.importMode === 'incrementalSync') {
          res = await syncIncrementalOrders(file)
        } else {
          res = await importOrders(file)
        }

        if (res && (res.code === 200 || res.code === 20000)) {
          const data = res.data || {}
          const successOrders = Number(data.successOrders || 0)
          const successItems = Number(data.successItems || 0)
          const mergedOrders = Number(data.mergedOrders || 0)
          const failCount = Number(data.failCount || 0)
          const duplicateOrderSkipCount = Number(data.duplicateOrderSkipCount || 0)
          const duplicateItemSkipCount = Number(data.duplicateItemSkipCount || 0)
          const conflictOrderSkipCount = Number(data.conflictOrderSkipCount || 0)
          const noNewOrders = !!data.noNewOrders
          const errors = Array.isArray(data.errors) ? data.errors : []
          const missingOrderNos = Array.isArray(data.missingOrderNos) ? data.missingOrderNos : []
          const failedDetails = Array.isArray(data.failedDetails) ? data.failedDetails : []

          const modeText = this.importMode === 'historyInit'
            ? '历史初始化'
            : (this.importMode === 'incrementalSync' ? '增量同步' : '导入')

          if (successOrders > 0 || successItems > 0 || mergedOrders > 0 || (this.importMode === 'incrementalSync' && noNewOrders)) {
            if (this.importMode === 'incrementalSync' && noNewOrders) {
              this.$message.success(`增量同步完成：无新增数据，重复订单${duplicateOrderSkipCount}条，重复明细${duplicateItemSkipCount}条，订单头冲突${conflictOrderSkipCount}条`)
            } else {
              this.$message.success(`${modeText}完成：新增订单${successOrders}条，新增明细${successItems}条，合并订单${mergedOrders}条，失败${failCount}条`)
            }
            if (errors.length > 0) {
              this.$alert(errors.slice(0, 20).join('\n'), `${modeText}部分行失败`, { confirmButtonText: '确定' })
            }
            if (missingOrderNos.length > 0) {
              const orderNoLines = missingOrderNos.slice(0, 200).map((orderNo, idx) => `${idx + 1}. ${orderNo}`)
              this.$alert(orderNoLines.join('\n'), `${modeText}未录入系统的订单号（最多200条）`, { confirmButtonText: '确定' })
            } else if (failedDetails.length > 0) {
              const detailLines = failedDetails.slice(0, 100).map((d, idx) => {
                return `${idx + 1}. 订单:${d.orderNo || '-'} 客户:${d.customer || '-'} 日期:${d.orderDate || '-'} 料号:${d.materialCode || '-'} 规格:${d.thickness || '-'}*${d.width || '-'}*${d.length || '-'} 原因:${d.reason || '-'}`
              })
              this.$alert(detailLines.join('\n'), `${modeText}失败明细列表（最多100条）`, { confirmButtonText: '确定' })
            }
            this.currentPage = 1
            await this.fetchHistoryInitStatus()
            await this.fetchOrders()
          } else {
            const msg = errors.length > 0 ? errors.slice(0, 20).join('\n') : (res.message || '未导入任何数据')
            this.$alert(msg, `${modeText}失败`, { confirmButtonText: '确定' })
          }
        } else {
          this.$message.error((res && (res.msg || res.message)) || '导入失败')
        }
      } catch (e) {
        console.error('导入异常:', e)
        const backendMsg = e && e.response && e.response.data && (e.response.data.message || e.response.data.msg)
        this.$message.error('导入失败: ' + (backendMsg || e.message || '未知错误'))
      } finally {
        this.importMode = 'normal'
      }
    },
    // Simple permission check placeholder
    $canImportExport() {
      // In a real app, check store user roles/permissions
      return true
    },
    // 打印相关方法
    async handlePrint(row) {
      try {
        // 获取订单完整详情
        const res = await getOrderDetail(row.orderNo)
        if (!res || res.code !== 200) {
          this.$message.error('获取订单详情失败')
          return
        }
        this.currentPrint = this.applyResolvedCustomerFields(res.data || {})
        if (this.currentPrint && this.currentPrint.customer) {
          let customerDefaultTemplate = ''
          try {
            const defaultRes = await getSalesContractCustomerDefaultTemplate(this.currentPrint.customer)
            if (defaultRes && (defaultRes.code === 200 || defaultRes.code === 20000) && defaultRes.data) {
              customerDefaultTemplate = defaultRes.data.templateKey || ''
            }
          } catch (e) {
            customerDefaultTemplate = ''
          }
          if (!customerDefaultTemplate) {
            customerDefaultTemplate = this.getCustomerDefaultTemplateLocal(this.currentPrint.customer)
          }
          if (customerDefaultTemplate && this.printTemplateOptions.some(t => t.value === customerDefaultTemplate)) {
            this.selectedPrintTemplateKey = customerDefaultTemplate
          }
        }
        this.printVisible = true
      } catch (e) {
        console.error('打开打印预览异常:', e)
        this.$message.error('打开打印预览失败')
      }
    },

    async fetchCompanyInfo() {
      try {
        const res = await request({ url: '/config/company', method: 'get' })
        if (res && (res.code === 200 || res.code === 20000) && res.data) {
          this.companyInfo = Object.assign({}, this.companyInfo, res.data)
          if (res.data.logoUrl) {
            this.printLogoUrl = res.data.logoUrl
          }
        }
      } catch (e) {
        console.error('加载公司信息失败', e)
      }
    },
    // 格式化规格显示: 厚度μm×宽度mm×长度m
    formatSpec(item) {
      const thickness = item.thickness ? Number(item.thickness) : 0 // μm
      const width = this.formatWidthOneDecimal(item.width || 0) // mm
      const length = item.length ? Math.round(item.length) : 0 // m
      return `${thickness}μm×${width}mm×${length}m`
    },
    getCurrentPrintCustomer() {
      if (!this.currentPrint) return null
      return this.findCustomerForEdit(this.currentPrint)
    },
    getCurrentPrintCustomerName() {
      const customer = this.getCurrentPrintCustomer()
      return (customer && customer.customerName) || this.currentPrint.customerDisplay || this.currentPrint.customer || ''
    },
    getCurrentPrintCustomerAddress() {
      const customer = this.getCurrentPrintCustomer()
      return (customer && customer.contactAddress) || this.currentPrint.deliveryAddress || '_________________'
    },
    getCurrentPrintFirstContact() {
      const customer = this.getCurrentPrintCustomer()
      const contacts = customer && Array.isArray(customer.contacts) ? customer.contacts : []
      if (!contacts.length) return null
      const primary = contacts.find(c => Number(c.isPrimary) === 1)
      return primary || contacts[0]
    },
    getCurrentPrintCustomerContactName() {
      const customer = this.getCurrentPrintCustomer()
      const firstContact = this.getCurrentPrintFirstContact()
      return (customer && customer.primaryContactName) ||
        (firstContact && (firstContact.contactName || firstContact.name)) ||
        this.currentPrint.contactPerson ||
        '_________________'
    },
    getCurrentPrintCustomerPhone() {
      const customer = this.getCurrentPrintCustomer()
      const firstContact = this.getCurrentPrintFirstContact()
      return (customer && customer.primaryContactMobile) ||
        (firstContact && (firstContact.contactPhone || firstContact.contactMobile)) ||
        (customer && customer.companyPhone) ||
        this.currentPrint.contactPhone ||
        '_________________'
    },
    formatChineseDate(dateText) {
      if (!dateText) return '____年__月__日'
      const d = new Date(dateText)
      if (Number.isNaN(d.getTime())) {
        const m = String(dateText).match(/(\d{4})-(\d{1,2})-(\d{1,2})/)
        if (m) return `${m[1]}年${Number(m[2])}月${Number(m[3])}日`
        return String(dateText)
      }
      return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
    },
    formatMonthDay(dateText) {
      if (!dateText) return '-'
      const d = new Date(dateText)
      if (!Number.isNaN(d.getTime())) {
        const yy = String(d.getFullYear()).slice(-2)
        const mm = String(d.getMonth() + 1).padStart(2, '0')
        const dd = String(d.getDate()).padStart(2, '0')
        return `${yy}-${mm}-${dd}`
      }
      const text = String(dateText)
      const m = text.match(/(\d{4})-(\d{1,2})-(\d{1,2})/)
      if (m) {
        return `${String(m[1]).slice(-2)}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`
      }
      return text
    },
    getPaymentDaysByCustomer() {
      const customer = this.getCurrentPrintCustomer()
      const terms = (customer && customer.paymentTerms) || ''
      const m = String(terms).match(/(\d{1,3})/)
      return m ? Number(m[1]) : 30
    },
    isCashPaymentByCustomer() {
      const customer = this.getCurrentPrintCustomer()
      const terms = (customer && customer.paymentTerms) || ''
      if (!terms) return true
      return /现款|现金|款到|预付款|货到付款/.test(String(terms))
    },
    getPaymentMethodDescription() {
      if (this.isCashPaymentByCustomer()) {
        return '款到发货'
      }
      const days = this.getPaymentDaysByCustomer()
      return `1、双方确认合同后，月底25日前对账，确认当期金额；2、对账后${days}日内付完合同总金额。`
    },
    // 格式化数字显示（保留2位小数）
    formatNumber(value) {
      if (value == null || value === '') return '0.00'
      return Number(value).toFixed(2)
    },
    // 浏览器打印
    handlePrintBrowser() {
      const printContent = document.getElementById('printArea').innerHTML
      const iframe = document.createElement('iframe')
      iframe.setAttribute('style', 'position:absolute;width:0px;height:0px;left:-500px;top:-500px;')
      document.body.appendChild(iframe)

      const doc = iframe.contentWindow.document
      doc.write(`
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              * { box-sizing: border-box; }
              body { 
                font-family: "Microsoft YaHei", "SimSun", Arial, sans-serif; 
                padding: 15mm 20mm;
                margin: 0;
                background: white;
                color: black;
                font-size: 13px;
                line-height: 1.6;
              }
              
              .company-header {
                margin-bottom: 15px;
                border-bottom: 2px solid #000;
                padding-bottom: 10px;
              }

              .company-header-top {
                display: flex;
                align-items: flex-start;
                justify-content: space-between;
                gap: 12px;
              }

              .logo-wrap {
                width: 260px;
                min-height: 60px;
                display: flex;
                align-items: flex-start;
              }

              .company-logo {
                width: 250px;
                height: auto;
                object-fit: contain;
              }

              .company-info-right {
                flex: 1;
                text-align: center;
              }
              
              .company-name {
                font-size: 20px;
                font-weight: bold;
                margin: 0 0 8px 0;
              }
              
              .company-info {
                font-size: 11px;
                line-height: 1.8;
              }
              
              .company-info p {
                margin: 2px 0;
              }
              
              .contract-title {
                text-align: center;
                font-size: 18px;
                font-weight: bold;
                margin: 10px 0 8px 0;
                letter-spacing: 6px;
              }
              
              .contract-info {
                text-align: right;
                margin-bottom: 8px;
                font-size: 12px;
              }
              
              .basic-info p {
                margin: 6px 0;
                line-height: 1.8;
              }
              
              .section-title {
                font-size: 13px;
                font-weight: bold;
                margin: 12px 0 8px 0;
              }
              
              .items-table {
                width: 100%;
                border-collapse: collapse;
                margin: 8px 0 15px 0;
                font-size: 11px;
              }
              
              .items-table th,
              .items-table td {
                border: 1px solid #000;
                padding: 6px 4px;
                text-align: left;
              }
              
              .items-table th {
                background-color: #f0f0f0;
                font-weight: bold;
                text-align: center;
              }
              
              .items-table .empty-row td {
                height: 28px;
              }
              
              .items-table .total-row {
                background-color: #f5f5f5;
                font-weight: bold;
              }
              
              .contract-terms {
                margin: 15px 0;
                font-size: 12px;
              }
              
              .contract-terms p {
                margin: 6px 0;
                line-height: 1.8;
              }
              
              .signature-section {
                margin-top: 25px;
                display: flex;
                justify-content: space-between;
              }
              
              .signature-block {
                width: 48%;
              }
              
              .signature-block p {
                margin: 8px 0;
                line-height: 1.8;
              }
              
              .page-footer {
                text-align: center;
                margin-top: 20px;
                font-size: 11px;
                color: #666;
              }
              
              @media print {
                @page { 
                  size: A4;
                  margin: 10mm 15mm;
                }
                body { 
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                }
                .items-table th {
                  background-color: #f0f0f0 !important;
                }
                .items-table .total-row {
                  background-color: #f5f5f5 !important;
                }
              }
            </style>
          </head>
          <body>${printContent}</body>
        </html>
      `)
      doc.close()

      // 等待样式加载
      setTimeout(() => {
        iframe.contentWindow.focus()
        iframe.contentWindow.print()
        // 打印对话框关闭后移除iframe
        setTimeout(() => {
          document.body.removeChild(iframe)
        }, 1000)
      }, 300)
    }
  }
}
</script>

<style scoped>
.sales-orders {
  padding: 20px;
}
.orders-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
}
.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}
.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
  margin-left: auto;
}
.sync-status-area {
  margin: 0 0 12px;
  padding: 10px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background: #f4f8ff;
  border: 1px solid #d9ecff;
  border-radius: 8px;
}
.sync-status-left,
.sync-status-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.sync-status-label {
  color: #606266;
  font-weight: 500;
}
.sync-status-text {
  color: #606266;
  font-size: 12px;
}
/* 搜索区域样式 */
.search-area {
  margin-bottom: 16px;
  padding: 14px;
  background: #f8fafc;
  border: 1px solid #ebeef5;
  border-radius: 8px;
}
/* smaller inputs inside table for compact entry */
.small-input ::v-deep .el-input__inner {
  font-size: 12px;
  padding: 3px 6px;
  height: 28px;
}
.el-table .small-input ::v-deep .el-input__inner {
  height: 26px;
}
.unit-price-cell {
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.unit-price-text {
  font-size: 10px;
  color: #909399;
  line-height: 1;
}
/* 订单备注：支持随窗口宽度自动换行 */
.order-remark-textarea ::v-deep .el-textarea__inner {
  line-height: 1.5;
  resize: vertical;
  white-space: pre-wrap;
  word-break: break-word;
}
.order-remark-history {
  margin-top: 8px;
  display: flex;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 6px;
}
.order-remark-history-label {
  color: #909399;
  line-height: 24px;
}
.order-remark-history-tag {
  cursor: pointer;
  max-width: 100%;
  white-space: normal;
  height: auto;
  line-height: 1.4;
}
/* reduce vertical space between form items */
.sales-orders .el-form-item {
  margin-bottom: 6px;
}
/* reduce table cell padding for compact rows */
.sales-orders .el-table .cell {
  padding: 6px 8px;
}
.sales-orders .orders-table {
  border-radius: 8px;
  overflow: hidden;
}
.sales-orders .orders-table-wrapper {
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
}
.sales-orders .orders-table-wrapper ::v-deep .el-table {
  min-width: 1360px;
}
.sales-orders .orders-table ::v-deep .el-table__header th {
  background: #f5f7fa;
}
.sales-orders .orders-table ::v-deep .el-table__header th .cell,
.sales-orders .orders-table ::v-deep .el-table__body td .cell {
  white-space: normal;
  word-break: break-word;
  line-height: 18px;
  font-size: 12px;
}
.sales-orders .orders-table ::v-deep td.order-no-col .cell {
  word-break: break-all;
}
.op-btns {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  column-gap: 6px;
  row-gap: 2px;
}
.orders-table .op-btns ::v-deep .el-button--text {
  padding: 0 2px;
  font-size: 12px;
  line-height: 16px;
}
.op-print {
  color: #67c23a;
}
.op-danger {
  color: #f56c6c;
}
/* tighter dialog body padding */
.sales-orders .el-dialog__body {
  padding: 8px 12px;
}
/* order dialog responsive width */
.sales-orders ::v-deep .order-dialog .el-dialog {
  max-width: 1100px;
}
/* items table: compact + responsive, enable horizontal scrollbar on small screens */
.sales-orders .items-table-wrapper {
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
}

.sales-orders .items-action-toolbar {
  position: sticky;
  top: 8px;
  z-index: 20;
  margin: 8px 0;
  padding: 6px 8px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid #ebeef5;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  backdrop-filter: saturate(120%) blur(2px);
}
.sales-orders .items-table-wrapper ::v-deep .el-table {
  width: max-content !important;
  min-width: 1580px;
}
.sales-orders .items-table-wrapper ::v-deep .edit-items-table .cell {
  padding: 4px 5px;
  line-height: 16px;
}
.sales-orders .items-table-wrapper ::v-deep .edit-items-table .el-input__inner,
.sales-orders .items-table-wrapper ::v-deep .edit-items-table .el-select .el-input__inner {
  padding-left: 5px;
  padding-right: 5px;
}
/* customer select dropdown layout */
.sales-orders ::v-deep .customer-select-popper .customer-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.sales-orders ::v-deep .customer-select-popper .customer-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sales-orders ::v-deep .customer-select-popper .customer-meta {
  color: #909399;
  font-size: 12px;
  white-space: nowrap;
}
/* hide native number input spinners as a fallback */
.small-input ::v-deep input[type=number]::-webkit-outer-spin-button,
.small-input ::v-deep input[type=number]::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.small-input ::v-deep input[type=number] {
  -moz-appearance: textfield;
  appearance: textfield;
}

/* pagination fixed to bottom */
.orders-pagination-wrapper {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
  padding: 0;
}

/* 打印样式 */
.print-content {
  padding: 20px;
  font-family: 'Microsoft YaHei', Arial, sans-serif;
  font-size: 13px;
  line-height: 1.6;
  color: #000;
}

.print-template-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.print-template-label {
  font-size: 13px;
  color: #606266;
}

.company-header {
  margin-bottom: 20px;
  border-bottom: 2px solid #000;
  padding-bottom: 10px;
}

.company-header-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.logo-wrap {
  width: 280px;
  min-height: 70px;
  display: flex;
  align-items: flex-start;
}

.company-logo {
  width: 270px;
  height: auto;
  object-fit: contain;
}

.company-info-right {
  flex: 1;
  text-align: center;
}

.company-name {
  font-size: 24px;
  font-weight: bold;
  margin: 0 0 10px 0;
  color: #000;
}

.company-info {
  font-size: 12px;
  line-height: 1.8;
}

.company-info p {
  margin: 3px 0;
}

.contract-title {
  text-align: center;
  font-size: 22px;
  font-weight: bold;
  margin: 12px 0 10px;
  letter-spacing: 8px;
}

.contract-info {
  text-align: right;
  margin-bottom: 10px;
  font-size: 13px;
}

.basic-info p {
  margin: 8px 0;
  line-height: 1.8;
}
.basic-info .basic-row {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  margin: 8px 0;
}
.basic-info .basic-row span {
  flex: 1;
  white-space: nowrap;
}

.section-title {
  font-size: 14px;
  font-weight: bold;
  margin: 15px 0 10px 0;
}

.items-table {
  width: 100%;
  border-collapse: collapse;
  margin: 10px 0;
  font-size: 12px;
}

.items-table th,
.items-table td {
  border: 1px solid #000;
  padding: 8px 5px;
  text-align: left;
}

.items-table th {
  background-color: #f0f0f0;
  font-weight: bold;
  text-align: center;
}

.items-table .empty-row td {
  height: 32px;
}

.items-table .total-row {
  background-color: #f5f5f5;
  font-weight: bold;
}

.contract-terms {
  margin: 20px 0;
  font-size: 13px;
}

.contract-terms p {
  margin: 8px 0;
  line-height: 1.8;
}

.signature-section {
  margin-top: 30px;
  display: flex;
  justify-content: space-between;
}

.signature-block {
  width: 48%;
}

.signature-block p {
  margin: 10px 0;
  line-height: 2;
}

.page-footer {
  text-align: center;
  margin-top: 30px;
  font-size: 12px;
  color: #666;
}
</style>
