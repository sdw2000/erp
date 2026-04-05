<template>
  <div class="delivery-notice-container">
    <el-card>
      <div slot="header" class="page-header">
        <span class="card-title">发货通知管理</span>
        <div class="header-actions">
          <el-button type="primary" size="small" icon="el-icon-plus" @click="handleCreateNotice">新增发货通知</el-button>
        </div>
      </div>

      <!-- Search Area -->
      <div class="search-area">
        <el-row :gutter="16">
          <el-col :span="6">
            <el-input v-model="searchQuery.noticeNo" placeholder="发货单号" size="small" clearable @clear="fetchNotices" />
          </el-col>
          <el-col :span="6">
            <el-input v-model="searchQuery.orderNo" placeholder="销售订单号" size="small" clearable @clear="fetchNotices" />
          </el-col>
          <el-col :span="6">
            <el-input v-model="searchQuery.customer" placeholder="客户" size="small" clearable @clear="fetchNotices" />
          </el-col>
          <el-col :span="6">
            <el-button type="primary" icon="el-icon-search" size="small" @click="fetchNotices">搜索</el-button>
            <el-button type="success" icon="el-icon-search" size="small" @click="searchUnshippedOrders">搜索未发货订单</el-button>
            <el-button icon="el-icon-refresh" size="small" @click="resetSearch">重置</el-button>
          </el-col>
        </el-row>
      </div>

      <!-- Data Table -->
      <el-table
        ref="deliveryTable"
        v-loading="loading"
        :data="tableData"
        :fit="false"
        class="delivery-table"
        style="width: 100%;"
        stripe
        @sort-change="handleSortChange"
      >
        <el-table-column type="index" label="序号" width="60" align="center" />
        <el-table-column prop="customerShortName" label="客户名称" width="80" show-overflow-tooltip sortable="custom" column-key="customer">
          <template slot-scope="scope">
            <span>{{ scope.row.customerShortName || scope.row.customer || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="noticeNo" label="发货单号" width="135" show-overflow-tooltip sortable="custom" column-key="noticeNo" />
        <el-table-column prop="orderNo" label="销售订单号" min-width="140" show-overflow-tooltip sortable="custom" column-key="orderNo" />
        <el-table-column label="明细(规格)" width="143" show-overflow-tooltip sortable="custom" column-key="specText">
          <template slot-scope="scope">
            <div v-if="scope.row.items && scope.row.items.length">
              <div v-for="(it, idx) in scope.row.items" :key="idx" class="item-multi-line">
                <div>{{ formatSpecDisplay(it) }}</div>
              </div>
            </div>
            <div v-else>-</div>
          </template>
        </el-table-column>
        <el-table-column label="数量/卷" width="87" align="right" sortable="custom" column-key="totalQty">
          <template slot-scope="scope">
            <div v-if="scope.row.items && scope.row.items.length">
              <div v-for="(it, idx) in scope.row.items" :key="idx" class="item-multi-line">
                <span>{{ it.quantity != null ? it.quantity : '-' }}</span>
              </div>
            </div>
            <div v-else>-</div>
          </template>
        </el-table-column>
        <el-table-column label="发货日期" width="97" sortable="custom" column-key="deliveryDate">
          <template slot-scope="scope">{{ formatShortDate(scope.row.deliveryDate) }}</template>
        </el-table-column>
        <el-table-column label="状态/确认人" width="95" sortable="custom" column-key="status">
          <template slot-scope="scope">
            <el-tag :type="getStatusType(scope.row.status)" size="small">{{ scope.row.status || '无状态' }}</el-tag>
            <div class="confirm-user">{{ getConfirmOperator(scope.row) }}</div>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="185" align="left">
          <template slot-scope="scope">
            <div class="op-btns">
              <el-button size="mini" type="text" @click="viewDetail(scope.row)">详情</el-button>
              <el-button size="mini" type="text" class="op-logistics" :disabled="!scope.row.carrierNo" @click="openTracking(scope.row)">物流</el-button>
              <el-button size="mini" type="text" class="op-print" @click="handlePrint(scope.row)">打印</el-button>
              <el-button size="mini" type="text" :disabled="scope.row.status === '已收货' || scope.row.status === 'received'" @click="saveRow(scope.row)">保存</el-button>
              <el-button v-if="scope.row.status !== '已收货' && scope.row.status !== 'received'" size="mini" type="text" @click="handleEdit(scope.row)">编辑</el-button>
              <el-button v-if="scope.row.status === '待发货' || scope.row.status === 'pending' || !scope.row.status" size="mini" type="text" style="color: #67C23A;" @click="confirmShip(scope.row)">确认发货</el-button>
              <el-button v-if="scope.row.status === '已发货' || scope.row.status === 'shipped'" size="mini" type="text" style="color: #E6A23C;" @click="confirmReceive(scope.row)">确认收货</el-button>
              <el-button v-if="scope.row.status !== '已发货' && scope.row.status !== 'shipped' && scope.row.status !== '已收货' && scope.row.status !== 'received'" size="mini" type="text" class="op-danger" @click="handleDelete(scope.row)">删除</el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <!-- Pagination -->
      <el-pagination
        class="delivery-pagination"
        :current-page="page.current"
        :page-sizes="[10, 20, 50, 100]"
        :page-size="page.size"
        layout="total, sizes, prev, pager, next, jumper"
        :total="page.total"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </el-card>

    <!-- Create/Edit Dialog -->
    <el-dialog :title="dialogTitle" :visible.sync="dialogVisible" width="1000px" @close="handleDialogClose">
      <el-form ref="noticeForm" :model="currentNotice" label-width="120px" :rules="rules">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="销售订单" prop="orderNo">
              <el-select
                v-model="currentNotice.orderNo"
                filterable
                remote
                reserve-keyword
                placeholder="请输入订单号搜索"
                :remote-method="searchOrders"
                :loading="orderSearchLoading"
                :disabled="isEdit"
                class="order-select"
                style="width: 100%;"
                clearable
                suffix-icon="el-icon-arrow-down"
                @change="handleOrderSelect"
                @focus="handleOrderFocus"
                @visible-change="handleOrderDropdown"
              >
                <el-option
                  v-for="order in orderOptions"
                  :key="order.orderNo"
                  :label="order.orderNo + ' - ' + order.customer + (order.remainingRolls != null ? ('（剩余' + order.remainingRolls + '卷）') : '')"
                  :value="order.orderNo"
                >
                  <span style="float: left">{{ order.orderNo }}</span>
                  <span style="float: right; color: #8492a6; font-size: 13px">
                    {{ order.customer }}<span v-if="order.remainingRolls != null">（剩余{{ order.remainingRolls }}卷）</span>
                  </span>
                </el-option>
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="客户名称" prop="customer">
              <el-input v-model="currentNotice.customer" disabled />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="发货日期" prop="deliveryDate">
              <el-date-picker v-model="currentNotice.deliveryDate" type="date" placeholder="选择发货日期" value-format="yyyy-MM-dd" style="width: 100%;" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="客户订单号" prop="customerOrderNo">
              <el-input v-model="currentNotice.customerOrderNo" placeholder="客户订单号" @input="handleCustomerOrderNoInput" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="承运公司" prop="carrierName">
              <el-select
                v-model="currentNotice.carrierName"
                filterable
                clearable
                placeholder="选择承运公司"
                style="width: 100%;"
                @change="onCarrierChange"
              >
                <el-option
                  v-for="c in carrierOptions"
                  :key="c.id"
                  :label="c.companyName"
                  :value="c.companyName"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="物流单号" prop="carrierNo">
              <el-input v-model="currentNotice.carrierNo" placeholder="物流单号" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="运输电话" prop="carrierPhone">
              <el-input v-model="currentNotice.carrierPhone" placeholder="运输公司电话" />
            </el-form-item>
          </el-col>
          <el-col :span="12" />
        </el-row>

        <el-row :gutter="20">
          <el-col :span="24">
            <el-form-item label="收货地址" prop="deliveryAddress">
              <el-input v-model="currentNotice.deliveryAddress" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="联系人" prop="contactPerson">
              <el-input v-model="currentNotice.contactPerson" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="联系电话" prop="contactPhone">
              <el-input v-model="currentNotice.contactPhone" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="24">
            <el-form-item label="备注">
              <el-input v-model="currentNotice.remark" type="textarea" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">发货明细</el-divider>
        <el-table :data="currentNotice.items" border style="width: 100%">
          <el-table-column prop="materialCode" label="物料代码" width="180">
            <template slot-scope="scope">
              <el-input v-if="!scope.row.orderItemId" v-model="scope.row.materialCode" size="small" placeholder="输入物料代码" />
              <span v-else>{{ scope.row.materialCode }}</span>
            </template>
          </el-table-column>
          <el-table-column label="物料名称" width="180">
            <template slot-scope="scope">
              <el-input v-if="!scope.row.orderItemId" v-model="scope.row.materialName" size="small" placeholder="输入物料名称" />
              <span v-else>{{ scope.row.materialName }}</span>
            </template>
          </el-table-column>
          <el-table-column label="规格" width="150">
            <template slot-scope="scope">
              <el-input v-if="!scope.row.orderItemId" v-model="scope.row.spec" size="small" placeholder="输入规格" />
              <span v-else>{{ formatSpecDisplay(scope.row) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="发货数量(卷)" width="140">
            <template slot-scope="scope">
              <el-input v-model.number="scope.row.quantity" size="small" type="number" min="0" style="width: 100px;" @input="updateAreaSizeByQuantity(scope.row)" />
            </template>
          </el-table-column>
          <el-table-column label="平方米" width="120">
            <template slot-scope="scope">
              <el-input v-model="scope.row.areaSize" size="small" disabled />
            </template>
          </el-table-column>
          <el-table-column label="箱数" width="100">
            <template slot-scope="scope">
              <el-input v-model="scope.row.boxCount" size="small" />
            </template>
          </el-table-column>
          <el-table-column label="每箱毛重" width="100">
            <template slot-scope="scope">
              <el-input v-model="scope.row.grossWeight" size="small" />
            </template>
          </el-table-column>
          <el-table-column label="总毛重" width="100">
            <template slot-scope="scope">
              <el-input v-model="scope.row.totalWeight" size="small" />
            </template>
          </el-table-column>
          <el-table-column label="备注" width="150">
            <template slot-scope="scope">
              <el-input v-model="scope.row.remark" size="small" placeholder="备注信息" />
            </template>
          </el-table-column>
          <el-table-column label="操作" width="80" align="center">
            <template slot-scope="scope">
              <el-button type="text" style="color: #F56C6C;" @click="handleRemoveItem(scope.$index)">移除</el-button>
            </template>
          </el-table-column>
        </el-table>
        <div style="margin-top: 10px;" />
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="saveNotice">保存</el-button>
      </div>
    </el-dialog>

    <el-dialog title="填写物流信息并确认收货" :visible.sync="receiveConfirmVisible" width="560px" custom-class="receive-logistics-dialog">
      <el-form :model="receiveConfirmForm" label-width="100px">
        <el-form-item label="承运公司" required>
          <el-select
            v-model="receiveConfirmForm.carrierName"
            filterable
            clearable
            allow-create
            default-first-option
            placeholder="请选择或输入承运公司"
            style="width: 100%;"
            @change="onReceiveCarrierChange"
          >
            <el-option
              v-for="c in carrierOptions"
              :key="`receive-${c.id}`"
              :label="c.companyName"
              :value="c.companyName"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="快递单号" required>
          <el-input v-model="receiveConfirmForm.carrierNo" placeholder="请输入快递单号">
            <el-button slot="append" icon="el-icon-search" :loading="receiveLogisticsLoading" @click="queryReceiveLogisticsNow">查询</el-button>
          </el-input>
        </el-form-item>
        <el-form-item label="运输电话">
          <el-input v-model="receiveConfirmForm.carrierPhone" placeholder="自动带出，可手动修改" />
        </el-form-item>
        <el-form-item label="送达日期">
          <el-input v-model="receiveConfirmForm.deliveryDatePreview" readonly placeholder="物流签收后自动识别" />
        </el-form-item>
      </el-form>

      <div v-if="receiveLogisticsInfo" class="receive-logistics-preview">
        <div class="receive-logistics-head">
          <span>物流状态：</span>
          <el-tag :type="getStatusType(receiveLogisticsInfo.status)" size="small">{{ receiveLogisticsInfo.status || '-' }}</el-tag>
          <span class="receive-logistics-update">最后更新：{{ receiveLogisticsInfo.lastUpdate || '-' }}</span>
        </div>
        <el-timeline>
          <el-timeline-item
            v-for="(trace, index) in (receiveLogisticsInfo.traces || [])"
            :key="index"
            :timestamp="trace.time"
            placement="top"
          >
            {{ trace.context }}
          </el-timeline-item>
        </el-timeline>
      </div>
      <span slot="footer" class="dialog-footer">
        <el-button @click="receiveConfirmVisible = false">取消</el-button>
        <el-button type="primary" :loading="receiveSubmitting" @click="submitReceiveConfirm">保存并确认收货</el-button>
      </span>
    </el-dialog>

    <el-dialog title="物流追踪" :visible.sync="trackingVisible" width="700px" :show-close="true">
      <div v-loading="trackingLoading">
        <div v-if="trackingInfo">
          <el-descriptions :column="2" border size="small" class="tracking-descriptions">
            <el-descriptions-item label="快递公司">{{ trackingInfo.carrierName || '-' }}</el-descriptions-item>
            <el-descriptions-item label="快递单号">{{ trackingInfo.carrierNo || '-' }}</el-descriptions-item>
            <el-descriptions-item label="物流状态">
              <el-tag :type="getStatusType(trackingInfo.status)" size="small">{{ trackingInfo.status || '-' }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="最后更新">{{ trackingInfo.lastUpdate || '-' }}</el-descriptions-item>
          </el-descriptions>

          <el-divider content-position="left">物流轨迹</el-divider>
          <el-empty v-if="!trackingInfo.traces || trackingInfo.traces.length === 0" description="暂无物流轨迹" :image-size="90" />
          <el-timeline v-else>
            <el-timeline-item
              v-for="(trace, index) in trackingInfo.traces"
              :key="index"
              :timestamp="trace.time"
              placement="top"
            >
              {{ trace.context }}
            </el-timeline-item>
          </el-timeline>
        </div>
      </div>
    </el-dialog>

    <el-dialog title="搜索未发货订单" :visible.sync="unshippedDialogVisible" width="760px">
      <el-table v-loading="unshippedOrderLoading" :data="unshippedOrders" stripe style="width: 100%">
        <el-table-column label="客户简称" min-width="200" show-overflow-tooltip>
          <template slot-scope="scope">
            {{ formatOrderCustomerDisplay(scope.row) }}
          </template>
        </el-table-column>
        <el-table-column prop="orderNo" label="订单号" min-width="220" show-overflow-tooltip />
        <el-table-column label="操作" width="120" align="center">
          <template slot-scope="scope">
            <el-button type="text" @click="goDeliveryByOrder(scope.row)">去发货</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!unshippedOrderLoading && unshippedOrders.length === 0" description="未找到未发货订单" :image-size="90" />
      <span slot="footer" class="dialog-footer">
        <el-button @click="unshippedDialogVisible = false">关闭</el-button>
      </span>
    </el-dialog>

    <!-- 单据打印对话框 -->
    <el-dialog title="单据打印预览" :visible.sync="printVisible" width="900px" top="5vh">
      <el-alert
        title="请在浏览器打印设置中自行选择横向/纵向、纸张大小和边距。"
        type="info"
        :closable="false"
        style="margin-bottom: 10px;"
      />
      <div id="printArea" class="print-content" :style="printAreaInlineStyle">
        <div class="copy-label-vertical">
          <div>白联:跟单</div>
          <div>绿联:客户</div>
          <div>红联:财务</div>
          <div>黄联:业务</div>
        </div>

        <div class="print-header-top">
          <div class="company-logo-wrap">
            <img :src="companyInfo.logoUrl || '/logo/finechem-logo.png'" alt="logo" class="company-logo">
          </div>
          <div class="company-info company-info-right">
            <div class="company-name">{{ companyInfo.companyName }}</div>
            <div>地址：{{ companyInfo.address }}</div>
            <div>电话：{{ companyInfo.phone }} &nbsp;&nbsp; 传真：{{ companyInfo.fax }}</div>
            <div>{{ companyInfo.website }}</div>
          </div>
        </div>

        <h2 class="form-title">发 货 单</h2>
        <div class="form-id">FE-FR-YW-07</div>

        <div class="print-main-up-30">
          <!-- 头部信息表格 -->
          <table class="header-table">
            <tr>
              <td class="label">收货单位：</td>
              <td class="value">{{ getPrintCustomerFullName() }}</td>
              <td class="label">送货单号：</td>
              <td class="value">{{ currentPrint.noticeNo }}</td>
            </tr>
            <tr>
              <td class="label">收货地址：</td>
              <td :class="['value', 'address-value', getPrintDeliveryAddressClass()]">{{ currentPrint.deliveryAddress }}</td>
              <td class="label">客户/订单号：</td>
              <td class="value">{{ currentPrint.customerOrderNo || currentPrint.orderNo }}</td>
            </tr>
            <tr>
              <td class="label">收货人/电话：</td>
              <td class="value">{{ getPrintReceiverText() }}</td>
              <td class="label">送货日期：</td>
              <td class="value">{{ getPrintDeliveryDate() }}</td>
            </tr>
            <tr>
              <td class="label">承运公司：</td>
              <td class="value">{{ formatCarrierWithNo(currentPrint) }}</td>
              <td class="label carrier-phone-label">运输公司电话：</td>
              <td class="value carrier-phone-value">{{ currentPrint.carrierPhone || '-' }}</td>
            </tr>
          </table>

          <!-- 明细表格 -->
          <table class="items-table">
            <thead>
              <tr>
                <th>产品代码</th>
                <th>产品名称</th>
                <th>产品规格<br>(厚度*宽度*长度)</th>
                <th>数量<br>(卷)</th>
                <th v-if="currentPrintTemplateConfig.showItemArea">平方<br>(m²)</th>
                <th v-if="currentPrintTemplateConfig.showItemBox">箱数</th>
                <th v-if="currentPrintTemplateConfig.showItemRemark">备注</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, index) in currentPrint.items" :key="index">
                <td>{{ item.materialCode }}</td>
                <td>{{ item.materialName }}</td>
                <td>{{ formatSpecDisplay(item) }}</td>
                <td>{{ item.quantity }}</td>
                <td v-if="currentPrintTemplateConfig.showItemArea">{{ item.areaSize }}</td>
                <td v-if="currentPrintTemplateConfig.showItemBox">{{ item.boxCount }}</td>
                <td v-if="currentPrintTemplateConfig.showItemRemark">{{ item.remark || '-' }}</td>
              </tr>
              <tr class="total-row">
                <td colspan="3" style="text-align: right; padding-right: 10px;">合计：</td>
                <td>{{ sumQuantity }}</td>
                <td v-if="currentPrintTemplateConfig.showItemArea">{{ sumArea }}</td>
                <td v-if="currentPrintTemplateConfig.showItemBox">{{ sumBox }}</td>
                <td v-if="currentPrintTemplateConfig.showItemRemark" />
              </tr>
            </tbody>
          </table>

          <!-- 底部说明 -->
          <div v-if="currentPrintTemplateConfig.showFooterNotes" class="footer-notes">
            备注：收到货物后请仔细确认，数量问题请收到货后的3天内提出， 质量问题请收到货后的7天内提出。任何瑕疵产品请收到货后30天之内寄回我司，经确认后办理以货换货或等值的货款减扣，逾期则视为无异议。
          </div>

          <!-- 签字栏 -->
          <div class="signatures">
            <div class="sig-item">制单：<span class="sig-line">{{ currentPrint.createdBy || '' }}</span></div>
            <div class="sig-item">财务：________________</div>
            <div class="sig-item">客户签收：________________</div>
          </div>
        </div>
      </div>

      <div slot="footer" class="dialog-footer">
        <div class="print-template-toolbar">
          <span class="print-template-label">打印模板：</span>
          <el-select v-model="selectedPrintTemplateKey" size="small" placeholder="请选择模板" style="width: 260px; margin-right: 8px;">
            <el-option
              v-for="item in printTemplateOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
          <el-button
            size="small"
            type="success"
            icon="el-icon-star-on"
            :loading="savingCustomerTemplate"
            @click="saveCurrentDeliveryCustomerTemplate"
          >
            设为当前客户默认模板
          </el-button>
          <el-button size="small" icon="el-icon-setting" @click="openDeliveryTemplateManager">模板管理</el-button>
          <span v-if="selectedPrintTemplateLabel" class="print-template-current">
            当前模板：{{ selectedPrintTemplateLabel }}
          </span>
        </div>
        <el-button @click="printVisible = false">关闭</el-button>
        <el-button type="primary" icon="el-icon-printer" @click="handlePrintBrowser">打印单据 / 导出PDF</el-button>
      </div>
    </el-dialog>

    <el-dialog title="发货通知模板管理" :visible.sync="templateManageVisible" width="1160px">
      <div style="margin-bottom: 10px; color: #909399;">说明：这里维护发货通知模板定义，保存后会同步到打印模板下拉。</div>
      <div style="margin-bottom: 10px; display: flex; gap: 8px;">
        <el-button size="small" type="primary" icon="el-icon-plus" @click="addDeliveryTemplateRow">新增模板</el-button>
        <el-button size="small" type="warning" icon="el-icon-magic-stick" :loading="templateBuiltinFilling" @click="fillBuiltinDeliveryTemplates">补齐内置模板</el-button>
        <el-button size="small" icon="el-icon-refresh" :loading="templateManageLoading" @click="loadDeliveryTemplateRows">刷新</el-button>
      </div>
      <el-table v-loading="templateManageLoading" :data="templateManageRows" border size="small" max-height="420">
        <el-table-column label="模板键" width="220">
          <template slot-scope="scope">
            <el-input v-model="scope.row.templateKey" placeholder="如 delivery_notice_custom_v1" />
          </template>
        </el-table-column>
        <el-table-column label="模板名称" min-width="180">
          <template slot-scope="scope">
            <el-input v-model="scope.row.sceneName" placeholder="前端显示名称" />
          </template>
        </el-table-column>
        <el-table-column label="排序" width="90">
          <template slot-scope="scope">
            <el-input-number v-model="scope.row.sortNo" :min="1" :step="1" controls-position="right" style="width: 100%;" />
          </template>
        </el-table-column>
        <el-table-column label="简版" width="80" align="center">
          <template slot-scope="scope">
            <el-switch v-model="scope.row.compact" />
          </template>
        </el-table-column>
        <el-table-column label="客户/订单号" width="100" align="center">
          <template slot-scope="scope">
            <el-switch v-model="scope.row.showCustomerOrderNo" />
          </template>
        </el-table-column>
        <el-table-column label="运输电话" width="90" align="center">
          <template slot-scope="scope">
            <el-switch v-model="scope.row.showCarrierPhone" />
          </template>
        </el-table-column>
        <el-table-column label="平方" width="80" align="center">
          <template slot-scope="scope">
            <el-switch v-model="scope.row.showItemArea" />
          </template>
        </el-table-column>
        <el-table-column label="箱数" width="80" align="center">
          <template slot-scope="scope">
            <el-switch v-model="scope.row.showItemBox" />
          </template>
        </el-table-column>
        <el-table-column label="明细备注" width="90" align="center">
          <template slot-scope="scope">
            <el-switch v-model="scope.row.showItemRemark" />
          </template>
        </el-table-column>
        <el-table-column label="底部说明" width="90" align="center">
          <template slot-scope="scope">
            <el-switch v-model="scope.row.showFooterNotes" />
          </template>
        </el-table-column>
        <el-table-column label="启用" width="80" align="center">
          <template slot-scope="scope">
            <el-switch v-model="scope.row.isActive" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="170" align="center" fixed="right">
          <template slot-scope="scope">
            <el-button size="mini" type="text" :loading="templateRowSavingMap[scope.row.templateKey] === true" @click="saveDeliveryTemplateRow(scope.row)">保存</el-button>
            <el-button size="mini" type="text" style="color:#F56C6C;" @click="removeDeliveryTemplateRow(scope.row, scope.$index)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <span slot="footer" class="dialog-footer">
        <el-button @click="templateManageVisible = false">关闭</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import request from '@/utils/request'
import { fetchLogisticsCompanies } from '@/api/logisticsCompany'
import { getCustomerList, getContactsByCustomerId } from '@/api/customer'
import {
  getDeliveryNoticeTemplates,
  getDeliveryNoticeCustomerDefaultTemplate,
  saveDeliveryNoticeCustomerDefaultTemplate,
  getAllDeliveryNoticeTemplates,
  saveDeliveryNoticeTemplate,
  deleteDeliveryNoticeTemplate
} from '@/api/labelPrintConfig'
import elTableAutoLayout from '@/mixins/elTableAutoLayout'

export default {
  name: 'DeliveryNotice',
  mixins: [elTableAutoLayout],
  tableLayoutRefs: ['deliveryTable'],
  data() {
    return {
      searchQuery: {
        noticeNo: '',
        orderNo: '',
        customer: ''
      },
      page: {
        current: 1,
        size: 10,
        total: 0
      },
      sortState: {
        prop: '',
        order: ''
      },
      tableData: [],
      loading: false,

      // 订单搜索
      orderOptions: [],
      orderSearchLoading: false,

      carrierOptions: [],
      customerMap: {},
      customerContactsCache: {},

      // Create/Edit
      dialogVisible: false,
      dialogTitle: '新增发货通知',
      isEdit: false,
      submitting: false,
      receiveConfirmVisible: false,
      receiveSubmitting: false,
      receiveLogisticsLoading: false,
      receiveLogisticsInfo: null,
      trackingVisible: false,
      trackingLoading: false,
      trackingInfo: null,
      unshippedDialogVisible: false,
      unshippedOrderLoading: false,
      unshippedOrders: [],
      receiveConfirmForm: {
        id: null,
        carrierName: '',
        carrierNo: '',
        carrierPhone: '',
        deliveryDatePreview: ''
      },
      receiveConfirmNotice: null,

      // The main object for the form
      currentNotice: {
        id: null,
        orderId: null,
        orderNo: '',
        customer: '',
        customerOrderNo: '',
        deliveryDate: '',
        deliveryAddress: '',
        contactPerson: '',
        contactPhone: '',
        carrierName: '',
        carrierNo: '',
        carrierPhone: '',
        remark: '',
        items: []
      },

      rules: {
        orderNo: [{ required: true, message: '请输入销售订单号', trigger: 'blur' }],
        deliveryDate: [{ required: true, message: '请选择发货日期', trigger: 'change' }],
        carrierName: [{ required: true, message: '请选择承运公司', trigger: 'change' }],
        carrierNo: [{ required: true, message: '请输入物流单号', trigger: 'blur' }]
      },

      // Print
      printVisible: false,
      currentPrint: {},
      selectedPrintTemplateKey: 'delivery_notice_standard_v1',
      savingCustomerTemplate: false,
      templateManageVisible: false,
      templateManageLoading: false,
      templateBuiltinFilling: false,
      templateManageRows: [],
      templateRowSavingMap: {},
      printTemplateOptions: [
        {
          value: 'delivery_notice_standard_v1',
          label: '标准发货通知模板（默认）',
          config: { compact: false }
        },
        {
          value: 'delivery_notice_simple_v1',
          label: '简版发货通知模板',
          config: { compact: true }
        }
      ],
      printLayout: {
        paperWidthMm: 280,
        paperHeightMm: 140,
        top: 21,
        right: 94,
        bottom: 8,
        left: 9,
        copyRight: 5
      },
      // Company info for print header (fetched from backend)
      companyInfo: {
        companyName: '东莞市方恩电子材料科技有限公司',
        address: '广东省东莞市桥头镇东新路13号2号楼102室',
        phone: '0769-82551118',
        fax: '0769-82551160',
        website: 'www.finechemfr.com',
        logoUrl: '/logo/finechem-logo.png'
      }
    }
  },
  computed: {
    // 自动计算合计
    sumQuantity() {
      if (!this.currentPrint.items) return 0
      return this.currentPrint.items.reduce((acc, cur) => acc + Number(cur.quantity || 0), 0)
    },
    sumArea() {
      if (!this.currentPrint.items) return 0
      return this.currentPrint.items.reduce((acc, cur) => acc + Number(cur.areaSize || 0), 0).toFixed(2)
    },
    sumBox() {
      if (!this.currentPrint.items) return 0
      return this.currentPrint.items.reduce((acc, cur) => acc + Number(cur.boxCount || 0), 0)
    },
    sumWeight() {
      if (!this.currentPrint.items) return 0
      return this.currentPrint.items.reduce((acc, cur) => acc + Number(cur.totalWeight || 0), 0).toFixed(2)
    },
    printAreaInlineStyle() {
      const p = this.printLayout || {}
      const top = Number(p.top || 0)
      const right = Number(p.right || 0)
      const bottom = Number(p.bottom || 0)
      const left = Number(p.left || 0)
      return {
        width: '100%',
        boxSizing: 'border-box',
        overflow: 'hidden',
        margin: '0 auto',
        padding: `${top}px ${right}px ${bottom}px ${left}px`
      }
    },
    selectedPrintTemplateLabel() {
      const current = (this.printTemplateOptions || []).find(t => t.value === this.selectedPrintTemplateKey)
      return (current && current.label) || ''
    },
    currentPrintTemplateConfig() {
      return this.getPrintTemplateConfig()
    }
  },
  created() {
    this.fetchDeliveryTemplatesFromServer()
    this.fetchNotices()
    this.fetchCompanyInfo()
    this.fetchCarriers()
    this.fetchCustomers()
  },
  methods: {
    getPrintTemplateConfig() {
      const current = (this.printTemplateOptions || []).find(t => t.value === this.selectedPrintTemplateKey)
      return this.normalizeTemplateConfig((current && current.config) || { compact: false })
    },
    normalizeTemplateConfig(cfg) {
      const raw = cfg || {}
      const compact = !!raw.compact
      const pick = (v, fallback) => (v === undefined || v === null ? fallback : !!v)
      return {
        compact,
        showCarrierPhone: pick(raw.showCarrierPhone, true),
        showCustomerOrderNo: pick(raw.showCustomerOrderNo, true),
        showItemArea: pick(raw.showItemArea, true),
        showItemBox: pick(raw.showItemBox, true),
        showItemRemark: pick(raw.showItemRemark, true),
        showFooterNotes: pick(raw.showFooterNotes, !compact)
      }
    },
    buildDefaultDeliveryTemplateOptions() {
      return [
        {
          value: 'delivery_notice_standard_v1',
          label: '标准发货通知模板（默认）',
          config: {
            compact: false,
            showCarrierPhone: true,
            showCustomerOrderNo: true,
            showItemArea: true,
            showItemBox: true,
            showItemRemark: true,
            showFooterNotes: true
          }
        },
        {
          value: 'delivery_notice_simple_v1',
          label: '简版发货通知模板',
          config: {
            compact: true,
            showCarrierPhone: true,
            showCustomerOrderNo: true,
            showItemArea: true,
            showItemBox: true,
            showItemRemark: false,
            showFooterNotes: false
          }
        }
      ]
    },
    async fetchDeliveryTemplatesFromServer() {
      try {
        const res = await getDeliveryNoticeTemplates()
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
                config: this.normalizeTemplateConfig(cfg)
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
        this.printTemplateOptions = this.buildDefaultDeliveryTemplateOptions()
      } catch (e) {
        this.printTemplateOptions = this.buildDefaultDeliveryTemplateOptions()
      }
    },
    async loadDeliveryCustomerDefaultTemplate(customerCode) {
      const code = String(customerCode || '').trim()
      if (!code) return
      try {
        const res = await getDeliveryNoticeCustomerDefaultTemplate(code)
        if (res && (res.code === 200 || res.code === 20000) && res.data && res.data.templateKey) {
          const key = String(res.data.templateKey).trim()
          if (this.printTemplateOptions.some(t => t.value === key)) {
            this.selectedPrintTemplateKey = key
          }
        }
      } catch (e) {
        // ignore
      }
    },
    async saveCurrentDeliveryCustomerTemplate() {
      const customerCode = String(this.currentPrint.customerCode || this.currentPrint.customer || '').trim()
      const templateKey = String(this.selectedPrintTemplateKey || '').trim()
      if (!customerCode) {
        this.$message.warning('当前客户编码为空，无法保存默认模板')
        return
      }
      if (!templateKey) {
        this.$message.warning('请先选择打印模板')
        return
      }
      this.savingCustomerTemplate = true
      try {
        const res = await saveDeliveryNoticeCustomerDefaultTemplate({ customerCode, templateKey })
        if (res && (res.code === 200 || res.code === 20000)) {
          this.$message.success('已保存为该客户默认发货通知模板')
        } else {
          this.$message.error((res && res.message) || '保存失败')
        }
      } catch (e) {
        this.$message.error('保存失败，请稍后重试')
      } finally {
        this.savingCustomerTemplate = false
      }
    },
    openDeliveryTemplateManager() {
      this.templateManageVisible = true
      this.loadDeliveryTemplateRows()
    },
    parseTemplateCompact(remark) {
      try {
        const cfg = remark ? JSON.parse(remark) : {}
        return !!cfg.compact
      } catch (e) {
        return false
      }
    },
    parseTemplateConfig(remark) {
      try {
        const cfg = remark ? JSON.parse(remark) : {}
        return this.normalizeTemplateConfig(cfg)
      } catch (e) {
        return this.normalizeTemplateConfig({ compact: false })
      }
    },
    async loadDeliveryTemplateRows() {
      this.templateManageLoading = true
      try {
        const res = await getAllDeliveryNoticeTemplates()
        if (res && (res.code === 200 || res.code === 20000) && Array.isArray(res.data)) {
          this.templateManageRows = res.data.map(item => ({
            ...this.parseTemplateConfig(item.remark),
            id: item.id,
            templateKey: item.templateKey || '',
            sceneName: item.sceneName || '',
            sortNo: Number(item.sortNo || 1),
            isActive: Number(item.isActive) !== 0,
            remark: item.remark || ''
          }))
        } else {
          this.templateManageRows = []
        }
      } catch (e) {
        this.templateManageRows = []
        this.$message.error('加载模板列表失败')
      } finally {
        this.templateManageLoading = false
      }
    },
    async fillBuiltinDeliveryTemplates() {
      this.templateBuiltinFilling = true
      try {
        const defaults = this.buildDefaultDeliveryTemplateOptions()
        const existingKeys = new Set((this.templateManageRows || []).map(r => String(r.templateKey || '').trim()).filter(Boolean))
        const missing = defaults.filter(d => !existingKeys.has(String(d.value || '').trim()))

        if (!missing.length) {
          this.$message.info('内置模板已齐全，无需补齐')
          return
        }

        for (let i = 0; i < missing.length; i++) {
          const item = missing[i]
          const cfg = this.normalizeTemplateConfig(item.config || {})
          await saveDeliveryNoticeTemplate({
            templateKey: item.value,
            sceneName: item.label,
            sortNo: i + 1,
            isActive: 1,
            compact: !!cfg.compact,
            showCarrierPhone: !!cfg.showCarrierPhone,
            showCustomerOrderNo: !!cfg.showCustomerOrderNo,
            showItemArea: !!cfg.showItemArea,
            showItemBox: !!cfg.showItemBox,
            showItemRemark: !!cfg.showItemRemark,
            showFooterNotes: !!cfg.showFooterNotes
          })
        }

        await this.loadDeliveryTemplateRows()
        await this.fetchDeliveryTemplatesFromServer()
        this.$message.success('内置模板已补齐')
      } catch (e) {
        this.$message.error('补齐内置模板失败，请稍后重试')
      } finally {
        this.templateBuiltinFilling = false
      }
    },
    addDeliveryTemplateRow() {
      this.templateManageRows.unshift({
        id: null,
        templateKey: '',
        sceneName: '',
        sortNo: 99,
        isActive: true,
        compact: false,
        showCarrierPhone: true,
        showCustomerOrderNo: true,
        showItemArea: true,
        showItemBox: true,
        showItemRemark: true,
        showFooterNotes: true,
        remark: '{"compact":false}'
      })
    },
    async saveDeliveryTemplateRow(row) {
      const templateKey = String((row && row.templateKey) || '').trim()
      const sceneName = String((row && row.sceneName) || '').trim()
      if (!templateKey) {
        this.$message.warning('模板键不能为空')
        return
      }

      const savePayload = {
        templateKey,
        sceneName: sceneName || templateKey,
        sortNo: Number(row.sortNo || 99),
        isActive: row.isActive ? 1 : 0,
        compact: !!row.compact,
        showCarrierPhone: !!row.showCarrierPhone,
        showCustomerOrderNo: !!row.showCustomerOrderNo,
        showItemArea: !!row.showItemArea,
        showItemBox: !!row.showItemBox,
        showItemRemark: !!row.showItemRemark,
        showFooterNotes: !!row.showFooterNotes
      }

      this.$set(this.templateRowSavingMap, templateKey, true)
      try {
        const res = await saveDeliveryNoticeTemplate(savePayload)
        if (res && (res.code === 200 || res.code === 20000)) {
          this.$message.success('模板保存成功')
          await this.loadDeliveryTemplateRows()
          await this.fetchDeliveryTemplatesFromServer()
        } else {
          this.$message.error((res && res.message) || '模板保存失败')
        }
      } catch (e) {
        this.$message.error('模板保存失败，请稍后重试')
      } finally {
        this.$set(this.templateRowSavingMap, templateKey, false)
      }
    },
    async removeDeliveryTemplateRow(row, index) {
      const templateKey = String((row && row.templateKey) || '').trim()
      if (!templateKey) {
        this.templateManageRows.splice(index, 1)
        return
      }

      try {
        await this.$confirm(`确认删除模板【${templateKey}】吗？`, '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        })
      } catch (e) {
        return
      }

      try {
        const res = await deleteDeliveryNoticeTemplate(templateKey)
        if (res && (res.code === 200 || res.code === 20000)) {
          this.$message.success('模板删除成功')
          await this.loadDeliveryTemplateRows()
          await this.fetchDeliveryTemplatesFromServer()
        } else {
          this.$message.error((res && res.message) || '模板删除失败')
        }
      } catch (e) {
        this.$message.error('模板删除失败，请稍后重试')
      }
    },
    async fetchCustomers() {
      try {
        const res = await getCustomerList({ current: 1, size: 2000 })
        if (res && (res.code === 200 || res.code === 20000) && res.data && res.data.records) {
          const map = {}
          res.data.records.forEach(c => {
            if (c.customerCode) map[c.customerCode] = c
            if (c.customerName) map[c.customerName] = c
            if (c.shortName) map[c.shortName] = c
          })
          this.customerMap = map
        }
      } catch (e) {
        console.error('加载客户映射失败', e)
      }
    },
    async fetchCarriers() {
      try {
        const res = await fetchLogisticsCompanies({ page: 1, size: 1000 })
        if (res && (res.code === 200 || res.code === 20000)) {
          const data = res.data || {}
          this.carrierOptions = (data.records || data.list || []).filter(c => c.status !== 'inactive')
        }
      } catch (e) {
        console.error('加载物流公司失败', e)
      }
    },
    // --- Query Methods ---
    async fetchNotices() {
      this.loading = true
      try {
        const res = await request({
          url: '/delivery/list',
          method: 'get',
          params: {
            pageNum: this.page.current,
            pageSize: this.page.size,
            sortProp: this.sortState.prop || undefined,
            sortOrder: this.sortState.order || undefined,
            ...this.searchQuery
          }
        })
        if (res.code === 200 || res.code === 20000) {
          let rows = []
          if (res.data.records) {
            rows = res.data.records
            this.page.total = Number(res.data.total) || 0
          } else if (res.data.list) {
            rows = res.data.list
            this.page.total = Number(res.data.total) || 0
          } else {
            rows = Array.isArray(res.data) ? res.data : []
            this.page.total = rows.length || 0
          }

          this.tableData = rows

          // 映射客户简称与客户代码
          if (!this.customerMap || Object.keys(this.customerMap).length === 0) {
            await this.fetchCustomers()
          }
          this.tableData = this.tableData.map(row => {
            const key = row.customer
            const customer = (key && this.customerMap[key]) || (row.customerCode && this.customerMap[row.customerCode]) || null
            return Object.assign({}, row, {
              deliveryDate: this.normalizeNoticeDeliveryDate(row.deliveryDate),
              customerShortName: customer ? (customer.shortName || customer.customerName || row.customer) : (row.customerShortName || row.customer),
              customerCode: customer ? (customer.customerCode || row.customerCode || row.customer) : (row.customerCode || row.customer)
            })
          })

          // 并行请求当前页每条发货单详情以填充 items（仅在列表中未包含明细时）
          try {
            const detailPromises = this.tableData.map((row, idx) => {
              if (!row.items || row.items.length === 0) {
                return request({ url: `/delivery/${row.id}`, method: 'get' })
                  .then(det => ({ idx, data: det && (det.code === 200 || det.code === 20000) ? det.data : null }))
                  .catch(() => ({ idx, data: null }))
              }
              return Promise.resolve({ idx, data: { items: row.items }})
            })

            const details = await Promise.all(detailPromises)
            // 统一写回，避免并发赋值导致的 race-condition 警告
            details.forEach(resItem => {
              if (resItem && resItem.data) {
                const items = resItem.data.items || []
                // 可能 tableData 已经被翻页或更新，先检查索引有效性
                if (this.tableData[resItem.idx]) this.tableData[resItem.idx].items = items
              }
            })

            // 根据订单明细补齐/纠正规格顺序：厚度*宽度*长度
            const orderNoSet = new Set((this.tableData || []).map(r => r.orderNo).filter(Boolean))
            const orderList = Array.from(orderNoSet)
            const orderRes = await Promise.all(orderList.map(orderNo => request({ url: `/sales/orders/${orderNo}`, method: 'get' }).catch(() => null)))
            const orderMap = {}
            orderList.forEach((orderNo, idx) => {
              const r = orderRes[idx]
              const ok = r && (r.code === 200 || r.code === 20000) && r.data
              if (ok) orderMap[orderNo] = r.data
            })

            this.tableData = this.tableData.map(row => {
              const order = orderMap[row.orderNo]
              if (!order || !Array.isArray(order.items) || !Array.isArray(row.items)) return row

              const byId = {}
              const byMaterial = {}
              order.items.forEach(oi => {
                if (oi && oi.id != null) byId[String(oi.id)] = oi
                if (oi && oi.materialCode) byMaterial[String(oi.materialCode)] = oi
              })

              const mergedItems = row.items.map(it => {
                const matched = (it && it.orderItemId != null && byId[String(it.orderItemId)]) || (it && it.materialCode && byMaterial[String(it.materialCode)])
                if (!matched) return it
                return {
                  ...it,
                  _orderThickness: matched.thickness,
                  _orderWidth: matched.width,
                  _orderLength: matched.length
                }
              })

              return { ...row, items: mergedItems }
            })
          } catch (e) {
            // 忽略整体详情请求错误，保持页面可用
          }
        }
      } catch (error) {
        console.error(error)
      } finally {
        this.loading = false
        this.scheduleTableLayout()
      }
    },
    resetSearch() {
      this.searchQuery = {
        noticeNo: '',
        orderNo: '',
        customer: ''
      }
      this.page.current = 1
      this.fetchNotices()
    },
    handleSizeChange(val) {
      this.page.size = val
      this.fetchNotices()
    },
    handleCurrentChange(val) {
      this.page.current = val
      this.fetchNotices()
    },

    handleSortChange({ prop, order, column }) {
      const key = (column && column.columnKey) || prop || ''
      this.sortState = {
        prop: key,
        order: order || ''
      }
      this.page.current = 1
      this.fetchNotices()
    },

    // --- Helpers ---
    getStatusType(status) {
      const map = {
        '待发货': 'warning',
        'pending': 'warning',
        '草稿': 'info',
        'draft': 'info',
        '已发货': 'success',
        'shipped': 'success',
        '已送达': 'success',
        '已收货': 'success',
        'received': 'success',
        '已作废': 'danger',
        'cancelled': 'danger'
      }
      return map[status] || 'info'
    },

    getConfirmOperator(row) {
      if (!row) return '-'
      const status = row.status || ''
      const confirmed = status === '已发货' || status === 'shipped' || status === '已收货' || status === 'received'
      return confirmed ? (row.updatedBy || '-') : '-'
    },

    // --- Create / Edit Logic ---
    handleCreateNotice() {
      this.isEdit = false
      this.dialogTitle = '新增发货通知'
      this.currentNotice = {
        orderId: null,
        orderNo: '',
        customer: '',
        customerOrderNo: '',
        deliveryDate: this.normalizeNoticeDeliveryDate(new Date()),
        deliveryAddress: '',
        contactPerson: '',
        contactPhone: '',
        carrierName: '',
        carrierNo: '',
        carrierPhone: '',
        remark: '',
        items: []
      }
      this.orderOptions = []
      this.dialogVisible = true
    },

    // --- 订单搜索功能 ---
    async searchOrders(query) {
      this.orderSearchLoading = true
      try {
        const res = await request({
          url: '/sales/orders/search',
          method: 'get',
          params: {
            keyword: query || ''
          }
        })
        if (res.code === 200 || res.code === 20000) {
          this.orderOptions = res.data || []
        }
      } catch (e) {
        console.error('搜索订单失败', e)
      } finally {
        this.orderSearchLoading = false
      }
    },

    async searchUnshippedOrders() {
      this.unshippedDialogVisible = true
      this.unshippedOrderLoading = true
      this.unshippedOrders = []
      try {
        const orderNoKeyword = String(this.searchQuery.orderNo || '').trim()
        const customerKeyword = String(this.searchQuery.customer || '').trim()
        const res = await request({
          url: '/sales/orders/search',
          method: 'get',
          params: {
            keyword: orderNoKeyword || undefined,
            customer: customerKeyword || undefined
          }
        })
        if (res && (res.code === 200 || res.code === 20000)) {
          this.unshippedOrders = Array.isArray(res.data) ? res.data : []
        } else {
          this.$message.error((res && res.msg) || '查询未发货订单失败')
        }
      } catch (e) {
        console.error('查询未发货订单失败', e)
        this.$message.error('查询未发货订单失败')
      } finally {
        this.unshippedOrderLoading = false
      }
    },

    formatOrderCustomerDisplay(order) {
      if (!order) return '-'
      return order.customerShortName || order.shortName || order.customerName || order.customer || '-'
    },

    async goDeliveryByOrder(order) {
      if (!order || !order.orderNo) {
        this.$message.warning('订单号无效')
        return
      }
      this.unshippedDialogVisible = false
      this.handleCreateNotice()
      this.currentNotice.orderNo = order.orderNo
      if (!this.orderOptions.some(o => o.orderNo === order.orderNo)) {
        this.orderOptions = [order, ...this.orderOptions]
      }
      await this.fetchOrderDetails()
    },

    async handleOrderSelect(orderNo) {
      if (orderNo) {
        await this.fetchOrderDetails()
      }
      this.$nextTick(() => {
        if (this.$refs.noticeForm) this.$refs.noticeForm.clearValidate()
      })
    },

    async handleEdit(row) {
      this.isEdit = true
      this.dialogTitle = '编辑发货通知'
      if (!this.carrierOptions || this.carrierOptions.length === 0) {
        await this.fetchCarriers()
      }
      // Create a copy
      this.currentNotice = JSON.parse(JSON.stringify(row))
      this.currentNotice.deliveryDate = this.normalizeNoticeDeliveryDate(this.currentNotice.deliveryDate)
      this.currentNotice.carrierNo = this.currentNotice.carrierNo || ''
      this.fillCarrierPhoneFromCompany(this.currentNotice)
      // Fetch detailed items if not present
      if (!this.currentNotice.items || this.currentNotice.items.length === 0) {
        const detail = await this.viewDetail(row, false)
        if (detail) {
          this.currentNotice = detail
          this.currentNotice.deliveryDate = this.normalizeNoticeDeliveryDate(this.currentNotice.deliveryDate)
          this.fillCarrierPhoneFromCompany(this.currentNotice)
        }
        await this.fillNoticeReceiverFromCustomer(this.currentNotice)
        this.dialogVisible = true
      } else {
        await this.fillNoticeReceiverFromCustomer(this.currentNotice)
        this.dialogVisible = true
      }
    },

    async fillNoticeReceiverFromCustomer(notice) {
      if (!notice) return
      const customer = await this.resolveCustomerByOrderContext(notice)
      let contacts = customer && Array.isArray(customer.contacts) ? customer.contacts : []
      if ((!contacts || !contacts.length) && customer) {
        const cid = Number(customer.id || customer.customerId || 0)
        contacts = await this.fetchCustomerContactsById(cid)
      }
      const receiver = this.pickMarkedReceiverContact(contacts)
      notice.deliveryAddress = this.resolveCustomerDeliveryAddress(customer) || ''
      notice.contactPerson = this.resolveContactNameValue(receiver) || ''
      notice.contactPhone = this.resolveContactPhoneValue(receiver) || ''
    },

    async fetchOrderDetails() {
      if (!this.currentNotice.orderNo) return

      try {
        // 调用订单详情接口，直接获取订单及其明细信息
        const res = await request({
          url: `/sales/orders/${this.currentNotice.orderNo}`,
          method: 'get'
        })

        if (res.code === 200 && res.data) {
          const order = res.data

          // 填充订单基本信息
          this.currentNotice.orderId = order.id
          this.currentNotice.customer = order.customer
          this.currentNotice.customerOrderNo = order.customerOrderNo || ''

          // 联系人/电话/地址优先从客户表带出，订单字段兜底
          await this.applyCustomerInfoToNotice(order)

          // 填充发货明细（将订单明细映射到发货明细）
          // 用户可以修改卷数（quantity），其他字段如面积、重量等可以根据需要计算
          if (order.items && order.items.length > 0) {
            this.currentNotice.items = order.items.map(oItem => {
              // 计算未发货数量（订单数量 - 已发货数量）
              const remainingRolls = (oItem.rolls || 0) - (oItem.shippedRolls || 0)
              const unitArea = this.calcUnitArea(oItem)
              const qty = remainingRolls > 0 ? remainingRolls : 0

              return {
                orderItemId: oItem.id,
                materialCode: oItem.materialCode,
                materialName: oItem.materialName,
                spec: `${oItem.thickness || 0}μm*${oItem.width || 0}mm*${oItem.length || 0}m`,
                quantity: qty, // 默认填充未发货数量，用户可修改
                _maxQty: qty,
                areaSize: unitArea ? Number((unitArea * qty).toFixed(2)) : 0,
                unitArea: unitArea,
                boxCount: 0,
                grossWeight: 0,
                totalWeight: 0,
                remark: ''
              }
            })

            this.$message.success('已加载订单信息和明细')
          } else {
            this.$message.warning('该订单没有明细数据')
          }
        } else {
          this.$message.warning('未找到该销售订单')
        }
      } catch (e) {
        console.error('加载订单详情失败：', e)
        this.$message.error('加载订单详情失败，请检查订单号是否正确')
      }
    },

    async applyCustomerInfoToNotice(order) {
      const customer = await this.resolveCustomerByOrderContext(order)
      let contacts = customer && Array.isArray(customer.contacts) ? customer.contacts : []
      if ((!contacts || !contacts.length) && customer) {
        const cid = Number(customer.id || customer.customerId || 0)
        contacts = await this.fetchCustomerContactsById(cid)
      }

      const customerAddress = this.resolveCustomerDeliveryAddress(customer)
      const receiver = this.pickMarkedReceiverContact(contacts)
      const customerContact = this.resolveContactNameValue(receiver)
      const customerPhone = this.resolveContactPhoneValue(receiver)

      this.currentNotice.deliveryAddress = customerAddress || ''
      this.currentNotice.contactPerson = customerContact || ''
      this.currentNotice.contactPhone = customerPhone || ''
    },

    getMatchedCustomer(order) {
      if (!order) return null
      const code = order.customerCode || ''
      const name = order.customer || ''
      return (code && this.customerMap[code]) || (name && this.customerMap[name]) || null
    },

    async resolveCustomerByOrderContext(order) {
      if (!order) return null
      let customer = this.getMatchedCustomer(order)
      if (customer) return customer

      const orderNo = String(order.orderNo || '').trim()
      let code = String(order.customerCode || '').trim()
      let name = String(order.customer || '').trim()

      if (orderNo) {
        try {
          const ordRes = await request({ url: `/sales/orders/${orderNo}`, method: 'get' })
          if (ordRes && (ordRes.code === 200 || ordRes.code === 20000) && ordRes.data) {
            code = code || String(ordRes.data.customerCode || '').trim()
            name = name || String(ordRes.data.customer || '').trim()
          }
        } catch (e) {
          // ignore
        }
      }

      customer = (code && this.customerMap[code]) || (name && this.customerMap[name]) || null
      if (customer) return customer

      const keyword = name || code
      if (!keyword) return null
      try {
        const res = await getCustomerList({ current: 1, size: 20, customerKeyword: keyword })
        if (res && (res.code === 200 || res.code === 20000) && res.data && Array.isArray(res.data.records)) {
          const rows = res.data.records
          customer = rows.find(c => c.customerCode === code || c.customerName === name || c.shortName === name) || rows[0] || null
          if (customer) {
            if (customer.customerCode) this.$set(this.customerMap, customer.customerCode, customer)
            if (customer.customerName) this.$set(this.customerMap, customer.customerName, customer)
            if (customer.shortName) this.$set(this.customerMap, customer.shortName, customer)
          }
        }
      } catch (e) {
        // ignore
      }
      return customer
    },

    getFirstCustomerContactName(customer) {
      const contacts = customer && Array.isArray(customer.contacts) ? customer.contacts : []
      if (!contacts.length) return ''
      const pick = this.pickReceiverContact(contacts)
      return this.resolveContactNameValue(pick)
    },

    getFirstCustomerContactPhone(customer) {
      const contacts = customer && Array.isArray(customer.contacts) ? customer.contacts : []
      if (!contacts.length) return ''
      const pick = this.pickReceiverContact(contacts)
      return this.resolveContactPhoneValue(pick)
    },

    onCarrierChange(val) {
      const selected = this.carrierOptions.find(c => c.companyName === val)
      if (selected) {
        this.currentNotice.carrierPhone = selected.contactPhone || ''
      } else {
        this.currentNotice.carrierPhone = ''
      }
    },

    fillCarrierPhoneFromCompany(notice) {
      if (!notice) return
      const name = String(notice.carrierName || '').trim()
      if (!name) {
        notice.carrierPhone = ''
        return
      }
      const selected = (this.carrierOptions || []).find(c => String(c.companyName || '').trim() === name)
      notice.carrierPhone = selected ? (selected.contactPhone || '') : ''
    },

    onReceiveCarrierChange(val) {
      const selected = this.carrierOptions.find(c => c.companyName === val)
      if (selected) {
        this.receiveConfirmForm.carrierPhone = selected.contactPhone || this.receiveConfirmForm.carrierPhone || ''
      }
    },

    handleOrderFocus() {
      if (!this.orderOptions || this.orderOptions.length === 0) {
        this.searchOrders('')
      }
    },

    handleOrderDropdown(visible) {
      if (visible && (!this.orderOptions || this.orderOptions.length === 0)) {
        this.searchOrders('')
      }
    },

    handleAddItem() {
      this.currentNotice.items.push({
        materialCode: '',
        materialName: '',
        spec: '',
        quantity: 0,
        areaSize: 0,
        boxCount: 0,
        grossWeight: 0,
        totalWeight: 0,
        remark: ''
      })
    },

    handleRemoveItem(index) {
      this.currentNotice.items.splice(index, 1)
    },

    onQuantityChange(rowIdx, itemIdx, val) {
      // 确保更新为数字并保持响应式
      const v = Number(val || 0)
      if (this.tableData && this.tableData[rowIdx] && this.tableData[rowIdx].items && this.tableData[rowIdx].items[itemIdx]) {
        const old = this.tableData[rowIdx].items[itemIdx]
        this.$set(this.tableData[rowIdx].items, itemIdx, Object.assign({}, old, { quantity: v }))
      }
    },

    calcUnitArea(orderItem) {
      const length = Number(orderItem.length || 0)
      const width = Number(orderItem.width || 0)
      const rolls = Number(orderItem.rolls || 0)
      const sqm = Number(orderItem.sqm || 0)
      if (sqm > 0 && rolls > 0) return sqm / rolls
      if (length > 0 && width > 0) return (length * width) / 1000
      return 0
    },

    formatSpecDisplay(item) {
      if (!item) return '-'
      const toText = v => (v === null || v === undefined ? '' : String(v).trim())

      const ot = toText(item._orderThickness)
      const ow = toText(item._orderWidth)
      const ol = toText(item._orderLength)
      if (ot && ow && ol) {
        return `${ot}μm*${ow}mm*${ol}m`
      }

      const t = toText(item.thickness)
      const w = toText(item.width)
      const l = toText(item.length)
      if (t && w && l) {
        return `${t}μm*${w}mm*${l}m`
      }

      const raw = toText(item.spec)
      if (!raw) return '-'
      if (raw.includes('μm') || raw.includes('mm') || raw.includes('m')) return raw

      const parts = raw.split('*').map(s => s.trim()).filter(Boolean)
      if (parts.length === 3) {
        return `${parts[0]}μm*${parts[1]}mm*${parts[2]}m`
      }
      return raw
    },

    updateAreaSizeByQuantity(item) {
      const qty = Number(item.quantity || 0)
      const unit = Number(item.unitArea || 0)
      item.areaSize = unit ? Number((unit * qty).toFixed(2)) : 0
    },

    handleDialogClose() {
      this.dialogVisible = false
    },

    keepOnlyAlphaNumeric(value) {
      return String(value || '').replace(/[^0-9a-zA-Z]/g, '')
    },

    handleCustomerOrderNoInput(value) {
      this.currentNotice.customerOrderNo = this.keepOnlyAlphaNumeric(value)
    },

    async saveNotice() {
      this.$refs.noticeForm.validate(async valid => {
        if (valid) {
          const filteredItems = (this.currentNotice.items || []).filter(it => Number(it.quantity || 0) > 0)
          if (filteredItems.length === 0) {
            this.$message.warning('请至少添加一项发货明细')
            return
          }

          const overItem = filteredItems.find(it => {
            const maxQty = Number(it && it._maxQty)
            const qty = Number(it && it.quantity)
            return Number.isFinite(maxQty) && maxQty >= 0 && qty > maxQty
          })
          if (overItem) {
            this.$message.warning(`发货数量不能多过欠货数量：${overItem.materialCode || ''}`)
            return
          }

          const sanitizedItems = filteredItems.map(it => {
            const copy = { ...it }
            delete copy.materialName
            return copy
          })

          this.submitting = true
          try {
            const normalizedCustomerOrderNo = this.keepOnlyAlphaNumeric(this.currentNotice.customerOrderNo)
            if (normalizedCustomerOrderNo !== this.currentNotice.customerOrderNo) {
              this.currentNotice.customerOrderNo = normalizedCustomerOrderNo
            }
            const payload = { ...this.currentNotice, items: sanitizedItems }
            payload.deliveryDate = this.normalizeNoticeDeliveryDate(payload.deliveryDate)
            payload.customerOrderNo = normalizedCustomerOrderNo
            const isUpdate = !!(this.isEdit || payload.id)
            if (!isUpdate) {
              payload.id = null
            }
            const res = await request({
              url: isUpdate ? '/delivery/update' : '/delivery/create',
              method: 'post',
              data: payload
            })

            if (res.code === 200 || res.code === 20000) {
              this.$message.success('保存成功')
              this.dialogVisible = false
              this.fetchNotices()
            } else {
              this.$message.error(res.msg || '保存失败')
            }
          } catch (e) {
            console.error(e)
            this.$message.error('系统错误')
          } finally {
            this.submitting = false
          }
        }
      })
    },

    async handleDelete(row) {
      this.$confirm('确认删除该发货单吗？', '提示', { type: 'warning' }).then(async() => {
        try {
          const res = await request({ url: `/delivery/${row.id}`, method: 'delete' })
          if (res.code === 200 || res.code === 20000) {
            this.$message.success('删除成功')
            this.fetchNotices()
          } else {
            this.$message.error(res.msg || '删除失败')
          }
        } catch (e) {
          console.error(e)
          this.$message.error('删除失败')
        }
      }).catch(() => {})
    },

    // --- 确认发货 ---
    async confirmShip(row) {
      this.$confirm('确认发货后将无法再修改，是否确认发货？', '确认发货', {
        type: 'warning',
        confirmButtonText: '确认发货',
        cancelButtonText: '取消'
      }).then(async() => {
        try {
          const res = await request({
            url: `/delivery/confirm/${row.id}`,
            method: 'post'
          })
          if (res.code === 200 || res.code === 20000) {
            this.$message.success('发货确认成功')
            this.fetchNotices()
          } else {
            this.$message.error(res.msg || '确认发货失败')
          }
        } catch (e) {
          console.error(e)
          this.$message.error('确认发货失败')
        }
      }).catch(() => {})
    },

    // --- 确认收货 ---
    async confirmReceive(row) {
      try {
        const detail = await this.viewDetail(row, false)
        const source = detail || row || {}
        this.receiveConfirmNotice = JSON.parse(JSON.stringify(source))
        this.receiveLogisticsInfo = null
        this.receiveConfirmForm = {
          id: source.id,
          carrierName: source.carrierName || '',
          carrierNo: source.carrierNo || '',
          carrierPhone: source.carrierPhone || '',
          deliveryDatePreview: (source.status === '已收货' || source.status === 'received') ? this.extractDateFromDateTime(source.updatedAt) : ''
        }
        this.receiveConfirmVisible = true
      } catch (e) {
        console.error(e)
        this.$message.error('加载发货单信息失败')
      }
    },

    async queryReceiveLogisticsNow() {
      if (!this.receiveConfirmNotice || !this.receiveConfirmNotice.id) {
        this.$message.warning('未找到发货单信息')
        return
      }
      if (!this.receiveConfirmForm.carrierNo || !this.receiveConfirmForm.carrierNo.trim()) {
        this.$message.warning('请先输入快递单号')
        return
      }

      this.receiveLogisticsLoading = true
      try {
        // 先保存当前物流信息，确保后端用最新运单号查询
        const payload = {
          ...this.receiveConfirmNotice,
          carrierName: (this.receiveConfirmForm.carrierName || '').trim(),
          carrierNo: (this.receiveConfirmForm.carrierNo || '').trim(),
          carrierPhone: (this.receiveConfirmForm.carrierPhone || '').trim()
        }
        const updateRes = await request({
          url: '/delivery/update',
          method: 'post',
          data: payload
        })
        if (!updateRes || (updateRes.code !== 200 && updateRes.code !== 20000)) {
          this.$message.error((updateRes && updateRes.msg) || '保存物流信息失败')
          return
        }

        const res = await request({
          url: `/delivery/${this.receiveConfirmNotice.id}/logistics`,
          method: 'get'
        })
        if (res && (res.code === 200 || res.code === 20000) && res.data) {
          this.receiveLogisticsInfo = res.data
          const hasTrace = Array.isArray(res.data.traces) && res.data.traces.length > 0
          const status = res.data.status
          if (status === '已送达' || status === '已签收') {
            this.receiveConfirmForm.deliveryDatePreview = this.extractDateFromDateTime(res.data.lastUpdate)
          }
          if (hasTrace) {
            this.$message.success('物流查询成功')
          } else {
            this.$message.warning(res.msg || res.message || '查询无结果，请隔段时间再查')
          }
          // 如果物流显示已送达，提示可直接确认收货
          if (status === '已送达' || status === '已签收') {
            this.$message.info('物流显示已送达，可直接点击“保存并确认收货”')
          }
          this.fetchNotices()
        } else {
          this.$message.error((res && (res.msg || res.message)) || '物流查询失败')
        }
      } catch (e) {
        console.error(e)
        this.$message.error('物流查询失败')
      } finally {
        this.receiveLogisticsLoading = false
      }
    },

    async openTracking(row) {
      const carrierNo = row && row.carrierNo ? String(row.carrierNo).trim() : ''
      if (!carrierNo) {
        this.$message.warning('该单据暂无快递单号')
        return
      }

      this.trackingVisible = true
      this.trackingLoading = true
      this.trackingInfo = {
        carrierName: row.carrierName || '-',
        carrierNo: carrierNo,
        status: row.status || '-',
        lastUpdate: '-',
        traces: []
      }

      try {
        const res = await request({
          url: `/delivery/${row.id}/logistics`,
          method: 'get'
        })
        if (res && (res.code === 200 || res.code === 20000) && res.data) {
          this.trackingInfo = {
            carrierName: row.carrierName || '-',
            carrierNo: carrierNo,
            ...(res.data || {})
          }
          const hasTrace = Array.isArray(res.data.traces) && res.data.traces.length > 0
          if (hasTrace) {
            this.$message.success('物流查询成功')
          } else {
            this.$message.warning((res && (res.msg || res.message)) || '暂无物流轨迹')
          }
        } else {
          this.$message.error((res && (res.msg || res.message)) || '物流查询失败')
        }
      } catch (e) {
        console.error(e)
        this.$message.error('物流查询失败')
      } finally {
        this.trackingLoading = false
      }
    },

    async submitReceiveConfirm() {
      if (!this.receiveConfirmNotice || !this.receiveConfirmNotice.id) {
        return this.$message.error('未找到待确认的发货单')
      }
      if (!this.receiveConfirmForm.carrierName || !this.receiveConfirmForm.carrierName.trim()) {
        return this.$message.warning('请填写物流公司')
      }
      if (!this.receiveConfirmForm.carrierNo || !this.receiveConfirmForm.carrierNo.trim()) {
        return this.$message.warning('请填写快递单号')
      }

      this.receiveSubmitting = true
      try {
        const payload = {
          ...this.receiveConfirmNotice,
          carrierName: this.receiveConfirmForm.carrierName.trim(),
          carrierNo: this.receiveConfirmForm.carrierNo.trim(),
          carrierPhone: (this.receiveConfirmForm.carrierPhone || '').trim()
        }

        const updateRes = await request({
          url: '/delivery/update',
          method: 'post',
          data: payload
        })
        if (!updateRes || (updateRes.code !== 200 && updateRes.code !== 20000)) {
          return this.$message.error((updateRes && updateRes.msg) || '保存物流信息失败')
        }

        const receiveRes = await request({
          url: `/delivery/receive/${this.receiveConfirmNotice.id}`,
          method: 'post'
        })
        if (receiveRes && (receiveRes.code === 200 || receiveRes.code === 20000)) {
          const idx = (this.tableData || []).findIndex(r => Number(r.id) === Number(this.receiveConfirmNotice.id))
          if (idx > -1) {
            const row = this.tableData[idx] || {}
            this.$set(this.tableData, idx, { ...row, status: '已收货' })
          }
          this.$message.success(receiveRes.msg || '收货确认成功')
          this.receiveConfirmVisible = false
          this.receiveConfirmNotice = null
          this.fetchNotices()
        } else {
          this.$message.error((receiveRes && receiveRes.msg) || '确认收货失败')
        }
      } catch (e) {
        console.error(e)
        this.$message.error('确认收货失败')
      } finally {
        this.receiveSubmitting = false
      }
    },

    // --- Details & Print ---
    async viewDetail(row, openDialog = true) {
      try {
        const res = await request({
          url: `/delivery/${row.id}`,
          method: 'get'
        })
        if (res.code === 200 || res.code === 20000) {
          if (openDialog) {
            this.currentNotice = res.data
            // Make sure details dialog exists if separate, or use create dialog in readonly?
            // The template doesn't have a separate detail dialog,
            // but the table action has viewDetail.
            // Let's just open the edit dialog in "view" mode or use print preview for details
            this.handlePrint(res.data)
          }
          return res.data
        }
      } catch (e) {
        console.error(e)
        this.$message.error('获取详情失败')
      }
      return null
    },

    async fetchCompanyInfo() {
      try {
        const res = await request({ url: '/config/company', method: 'get' })
        if (res && (res.code === 200 || res.code === 20000) && res.data) {
          this.companyInfo = Object.assign({}, this.companyInfo, res.data)
        }
      } catch (e) {
        // ignore, keep defaults
        console.error('加载公司信息失败', e)
      }
    },

    async saveRow(row) {
      // 保存单行修改（包括 items 中的数量变更）
      try {
        if (row.status === '已收货' || row.status === 'received') {
          this.$message.warning('已收货的单据不可修改')
          return
        }
        const payload = JSON.parse(JSON.stringify(row))
        payload.deliveryDate = this.normalizeNoticeDeliveryDate(payload.deliveryDate)
        // 尝试使用常见的 update 接口路径
        const res = await request({ url: `/delivery/update`, method: 'post', data: payload })
        if (res && (res.code === 200 || res.code === 20000)) {
          this.$message.success('保存成功')
          // 重新拉取该条详情以同步最新数据
          const fresh = await request({ url: `/delivery/${row.id}`, method: 'get' })
          if (fresh && (fresh.code === 200 || fresh.code === 20000) && fresh.data) {
            // 在 tableData 中找到并替换
            const idx = this.tableData.findIndex(r => r.id === row.id)
            if (idx !== -1) this.$set(this.tableData, idx, fresh.data)
          }
        } else {
          this.$message.error(res.msg || '保存失败')
        }
      } catch (e) {
        console.error('保存失败', e)
        this.$message.error('保存失败')
      }
    },

    getPrintCustomerFullName() {
      const raw = (this.currentPrint && this.currentPrint.customer) ? String(this.currentPrint.customer).trim() : ''
      if (!raw) return '-'
      const customer = this.customerMap && this.customerMap[raw]
      if (customer && customer.customerName) return customer.customerName
      return raw
    },

    getPrintDeliveryDate() {
      if (this.currentPrint && this.currentPrint.deliveryDate) return this.currentPrint.deliveryDate
      if (this.currentPrint && this.currentPrint.createdAt) return this.extractDateFromDateTime(this.currentPrint.createdAt)
      return this.extractDateFromDateTime(new Date().toISOString())
    },

    getPrintDeliveryAddressClass() {
      const text = String((this.currentPrint && this.currentPrint.deliveryAddress) || '').trim()
      const len = text.length
      if (len > 78) return 'addr-super-long'
      if (len > 56) return 'addr-very-long'
      if (len > 34) return 'addr-long'
      return ''
    },

    formatCarrierWithNo(row) {
      const carrierName = row && row.carrierName ? String(row.carrierName).trim() : ''
      const carrierNo = row && row.carrierNo ? String(row.carrierNo).trim() : ''
      if (carrierName && carrierNo) return `${carrierName}：${carrierNo}`
      return carrierName || carrierNo || '-'
    },

    getPrintReceiverText() {
      const person = this.currentPrint && this.currentPrint.contactPerson ? String(this.currentPrint.contactPerson).trim() : ''
      const phone = this.currentPrint && this.currentPrint.contactPhone ? String(this.currentPrint.contactPhone).trim() : ''
      if (person && phone) return `${person} ${phone}`
      return person || phone || '-'
    },

    pickPrimaryContact(contacts) {
      const list = Array.isArray(contacts) ? contacts : []
      if (!list.length) return null
      return list.find(c => Number(c && c.isPrimary) === 1 || c.isPrimary === true || String(c.isPrimary) === '1') || list[0]
    },

    pickReceiverContact(contacts) {
      const list = Array.isArray(contacts) ? contacts : []
      if (!list.length) return null
      const receiver = list.find(c => Number(c && c.isReceiver) === 1 || c.isReceiver === true || String(c.isReceiver) === '1')
      if (receiver) return receiver
      return this.pickPrimaryContact(list) || list[0]
    },

    pickMarkedReceiverContact(contacts) {
      const list = Array.isArray(contacts) ? contacts : []
      if (!list.length) return null
      return list.find(c => Number(c && c.isReceiver) === 1 || c.isReceiver === true || String(c.isReceiver) === '1') || null
    },

    resolveCustomerDeliveryAddress(customer) {
      if (!customer) return ''
      return String(
        customer.receiveAddress ||
        customer.contactAddress ||
        customer.businessAddress ||
        customer.registeredAddress ||
        customer.address ||
        ''
      ).trim()
    },

    resolveContactPhoneValue(source) {
      if (!source) return ''
      const value = source.contactPhone || ''
      return String(value || '').trim()
    },

    resolveContactNameValue(source) {
      if (!source) return ''
      const value = source.contactName || source.name || source.contactPerson || ''
      return String(value || '').trim()
    },

    async fetchCustomerContactsById(customerId) {
      const idNum = Number(customerId || 0)
      if (!(Number.isFinite(idNum) && idNum > 0)) return []
      const cacheKey = String(idNum)
      if (Object.prototype.hasOwnProperty.call(this.customerContactsCache, cacheKey)) {
        return Array.isArray(this.customerContactsCache[cacheKey]) ? this.customerContactsCache[cacheKey] : []
      }
      try {
        const res = await getContactsByCustomerId(idNum)
        const data = res && (res.code === 200 || res.code === 20000) ? (res.data || []) : []
        const rows = Array.isArray(data) ? data : (Array.isArray(data.records) ? data.records : (Array.isArray(data.list) ? data.list : []))
        this.$set(this.customerContactsCache, cacheKey, rows)
        return rows
      } catch (e) {
        this.$set(this.customerContactsCache, cacheKey, [])
        return []
      }
    },

    async ensurePrintReceiverContact(printData) {
      const data = printData ? { ...printData } : {}
      const hasAddress = String(data.deliveryAddress || data.delivery_address || '').trim()

      let customer = await this.resolveCustomerByOrderContext(data)
      if (!customer && data.customer) {
        await this.fetchCustomers()
        customer = await this.resolveCustomerByOrderContext(data)
      }

      let contacts = customer && Array.isArray(customer.contacts) ? customer.contacts : []
      if ((!contacts || !contacts.length) && customer) {
        const cid = Number(customer.id || customer.customerId || 0)
        contacts = await this.fetchCustomerContactsById(cid)
      }

      const receiver = this.pickMarkedReceiverContact(contacts)

      const customerName = this.resolveContactNameValue(customer)
      const contactName = this.resolveContactNameValue(receiver)
      const person = contactName || customerName || ''

      const customerPhone = this.resolveContactPhoneValue(customer)
      const contactPhone = this.resolveContactPhoneValue(receiver)
      const phone = contactPhone || customerPhone || ''
      const customerAddress = this.resolveCustomerDeliveryAddress(customer)
      const orderAddress = String(data.deliveryAddress || data.delivery_address || '').trim()

      data.deliveryAddress = customerAddress || hasAddress || orderAddress || ''
      data.contactPerson = person
      data.contactPhone = phone
      return data
    },

    async handlePrint(row) {
      // 打印前优先拉取详情，确保地址/联系人等字段齐全
      const fullData = await this.viewDetail(row, false)
      const baseData = fullData || JSON.parse(JSON.stringify(row || {}))
      if (!baseData || !baseData.id) return

      // 兜底合并列表数据（防止部分接口字段缺失）
      if (row && row.items && (!baseData.items || baseData.items.length === 0)) {
        baseData.items = row.items
      }
      if (!baseData.deliveryAddress && row && row.deliveryAddress) {
        baseData.deliveryAddress = row.deliveryAddress
      }
      if (!baseData.contactPerson && row && row.contactPerson) {
        baseData.contactPerson = row.contactPerson
      }
      if (!baseData.contactPhone && row && row.contactPhone) {
        baseData.contactPhone = row.contactPhone
      }

      this.currentPrint = await this.ensurePrintReceiverContact(baseData)

      // 按客户默认模板自动选择（未配置时走当前默认模板，不影响现有行为）
      await this.loadDeliveryCustomerDefaultTemplate(this.currentPrint.customerCode || this.currentPrint.customer)

      // 打开打印预览弹窗，由用户点击“打印单据 / 导出PDF”后再触发系统打印
      this.printVisible = true
    },

    buildPrintContentHtml() {
      const templateConfig = this.getPrintTemplateConfig()
      const compactFooter = templateConfig && templateConfig.compact
      const showCustomerOrderNo = templateConfig.showCustomerOrderNo !== false
      const showCarrierPhone = templateConfig.showCarrierPhone !== false
      const showItemArea = templateConfig.showItemArea !== false
      const showItemBox = templateConfig.showItemBox !== false
      const showItemRemark = templateConfig.showItemRemark !== false
      const showFooterNotes = templateConfig.showFooterNotes !== false

      const items = Array.isArray(this.currentPrint.items) ? this.currentPrint.items : []
      const rowsHtml = items.map((item) => `
        <tr>
          <td>${item.materialCode || '-'}</td>
          <td>${item.materialName || '-'}</td>
          <td>${this.formatSpecDisplay(item) || '-'}</td>
          <td>${item.quantity != null ? item.quantity : '-'}</td>
          ${showItemArea ? `<td>${item.areaSize != null ? item.areaSize : '-'}</td>` : ''}
          ${showItemBox ? `<td>${item.boxCount != null ? item.boxCount : '-'}</td>` : ''}
          ${showItemRemark ? `<td>${item.remark || '-'}</td>` : ''}
        </tr>
      `).join('')
      return `
        <div id="printArea" class="print-content" style="${this.objectToInlineStyle(this.printAreaInlineStyle)}">
          <div class="copy-label-vertical" style="${compactFooter ? 'display:none;' : ''}">
            <div>白联:跟单</div>
            <div>绿联:客户</div>
            <div>红联:财务</div>
            <div>黄联:业务</div>
          </div>

          <div class="print-header-top">
            <div class="company-logo-wrap">
              <img src="${this.companyInfo.logoUrl || '/logo/finechem-logo.png'}" alt="logo" class="company-logo">
            </div>
            <div class="company-info company-info-right">
              <div class="company-name">${this.companyInfo.companyName || ''}</div>
              <div>地址：${this.companyInfo.address || ''}</div>
              <div>电话：${this.companyInfo.phone || ''} &nbsp;&nbsp; 传真：${this.companyInfo.fax || ''}</div>
              <div>${this.companyInfo.website || ''}</div>
            </div>
          </div>

          <h2 class="form-title">发 货 单</h2>
          <div class="form-id">FE-FR-YW-07</div>

          <div class="print-main-up-30">
            <table class="header-table">
              <tr>
                <td class="label">收货单位：</td>
                <td class="value">${this.getPrintCustomerFullName()}</td>
                <td class="label">送货单号：</td>
                <td class="value">${this.currentPrint.noticeNo || '-'}</td>
              </tr>
              <tr>
                <td class="label">收货地址：</td>
                <td class="value address-value ${this.getPrintDeliveryAddressClass()}">${this.currentPrint.deliveryAddress || '-'}</td>
                <td class="label">客户/订单号：</td>
                <td class="value">${showCustomerOrderNo ? (this.currentPrint.customerOrderNo || this.currentPrint.orderNo || '-') : '-'}</td>
              </tr>
              <tr>
                <td class="label">收货人/电话：</td>
                <td class="value">${this.getPrintReceiverText()}</td>
                <td class="label">送货日期：</td>
                <td class="value">${this.getPrintDeliveryDate()}</td>
              </tr>
              <tr>
                <td class="label">承运公司：</td>
                <td class="value">${this.formatCarrierWithNo(this.currentPrint)}</td>
                <td class="label carrier-phone-label">运输公司电话：</td>
                <td class="value carrier-phone-value">${showCarrierPhone ? (this.currentPrint.carrierPhone || '-') : '-'}</td>
              </tr>
            </table>

            <table class="items-table">
              <thead>
                <tr>
                  <th>产品代码</th>
                  <th>产品名称</th>
                  <th>产品规格<br>(厚度*宽度*长度)</th>
                  <th>数量<br>(卷)</th>
                  ${showItemArea ? '<th>平方<br>(m²)</th>' : ''}
                  ${showItemBox ? '<th>箱数</th>' : ''}
                  ${showItemRemark ? '<th>备注</th>' : ''}
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
                <tr class="total-row">
                  <td colspan="3" style="text-align: right; padding-right: 10px;">合计：</td>
                  <td>${this.sumQuantity}</td>
                  ${showItemArea ? `<td>${this.sumArea}</td>` : ''}
                  ${showItemBox ? `<td>${this.sumBox}</td>` : ''}
                  ${showItemRemark ? '<td></td>' : ''}
                </tr>
              </tbody>
            </table>

            ${compactFooter || !showFooterNotes ? '' : `<div class="footer-notes">
              备注：收到货物后请仔细确认，数量问题请收到货后的3天内提出， 质量问题请收到货后的7天内提出。任何瑕疵产品请收到货后30天之内寄回我司，经确认后办理以货换货或等值的货款减扣，逾期则视为无异议。
            </div>`}

            <div class="signatures">
              <div class="sig-item">制单：<span class="sig-line">${this.currentPrint.createdBy || ''}</span></div>
              <div class="sig-item">财务：________________</div>
              <div class="sig-item">客户签收：________________</div>
            </div>
          </div>
        </div>
      `
    },

    objectToInlineStyle(styleObj) {
      if (!styleObj) return ''
      return Object.keys(styleObj)
        .map((k) => `${k.replace(/[A-Z]/g, m => '-' + m.toLowerCase())}:${styleObj[k]}`)
        .join(';')
    },

    handlePrintBrowser() {
      const printContent = this.buildPrintContentHtml()
      const p = this.printLayout || {}
      const top = Number(p.top || 0)
      const right = Number(p.right || 0)
      const bottom = Number(p.bottom || 0)
      const left = Number(p.left || 0)
      const copyRight = Number(p.copyRight || 0)
      const iframe = document.createElement('iframe')
      iframe.setAttribute('style', 'position:absolute;width:0px;height:0px;left:-500px;top:-500px;')
      document.body.appendChild(iframe)

      const doc = iframe.contentWindow.document
      doc.write(`
        <html>
          <head>
            <title></title>
            <style>
              html, body { margin: 0; padding: 0; }
              body { font-family: "Microsoft YaHei", "PingFang SC", Arial, sans-serif; font-size: 13pt; }
              .print-content {
                position: relative;
                box-sizing: border-box;
                width: 100%;
                overflow: hidden;
                padding: ${top}px ${right}px ${bottom}px ${left}px;
              }
              .copy-label-vertical {
                position: absolute;
                right: ${copyRight}px;
                top: 12px;
                transform: translate(2mm, 10mm);
                height: 385px;
                width: 26px;
                display: flex;
                flex-direction: column;
                border: 1px solid #cfd3dc;
                background: #fff;
                font-family: "Microsoft YaHei", "PingFang SC", Arial, sans-serif;
              }
              .copy-label-vertical > div {
                flex: 1;
                display: flex;
                align-items: center;
                justify-content: center;
                writing-mode: vertical-rl;
                text-orientation: mixed;
                font-size: 13pt;
                font-weight: 700;
                color: #444;
                border-bottom: 1px solid #e4e7ed;
                line-height: 1;
                padding: 1px 0;
                font-family: "Microsoft YaHei", "PingFang SC", Arial, sans-serif;
              }
              .copy-label-vertical > div:last-child { border-bottom: none; }
              .print-header-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0; width: calc(100% + 65px); }
              .print-main-up-30 { margin-top: 15px; }
              .company-logo-wrap { width: 224px; min-height: 112px; display: flex; align-items: flex-start; transform: translateY(-5px); }
              .company-logo { max-width: 210px; max-height: 105px; object-fit: contain; transform: none; }
              .company-info { font-size: 13pt; line-height: 1.2; margin-bottom: 0; }
              .company-info > div { margin: 0; padding: 0; }
              .company-info-right { text-align: right; position: relative; left: 0; transform: translate(0, -8px); }
              .company-name { font-size: 22pt; font-weight: 700; margin-bottom: 2px; transform: translateY(3px); }
              .form-title { text-align: center; font-size: 26pt; font-weight: bold; letter-spacing: 5px; margin: -72px 0 -2px 0; line-height: 1.05; }
              .form-id { width: calc(100% + 65px); text-align: right; font-size: 13pt; margin-bottom: 0; transform: translate(0, 15px); }
              
              table { width: 100%; border-collapse: collapse; }
              
              .header-table { width: calc(100% + 65px); margin-bottom: 10px; table-layout: fixed; font-family: "Microsoft YaHei", "PingFang SC", Arial, sans-serif; }
              .header-table td { padding: 2px 4px; line-height: 1.15; vertical-align: middle; font-size: 13pt; }
              .header-table .label { width: 90px; text-align: left; white-space: nowrap; }
              .header-table td:nth-child(3).label { width: 88px; padding-left: 4px; }
              .header-table td:nth-child(3) { position: relative; left: 0; transform: none; }
              .header-table td:nth-child(4) { position: relative; left: 0; transform: translateX(30px); }
              .header-table .value { border-bottom: 1px solid #ccc; padding: 0 5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
              .header-table td:nth-child(2).value { border-bottom: none; position: relative; }
              .header-table td:nth-child(2).value::after { content: ''; position: absolute; left: 0; right: 26px; bottom: 0; border-bottom: 1px solid #ccc; }
              .header-table .value.address-value { white-space: normal; overflow: visible; text-overflow: clip; word-break: break-all; overflow-wrap: anywhere; line-height: 1.3; font-size: 13pt; }
              .header-table .value.address-value.addr-long { font-size: 13pt; line-height: 1.28; }
              .header-table .value.address-value.addr-very-long { font-size: 13pt; line-height: 1.22; }
              .header-table .value.address-value.addr-super-long { font-size: 13pt; line-height: 1.16; }
              .header-table td:nth-child(4).value { width: 200px; max-width: 200px; padding-left: 6px; }
              .header-table td.carrier-phone-value { position: relative; left: 0; transform: translateX(15px); }
              
              .items-table { border: 1px solid #333; margin-bottom: 10px; width: calc(100% + 65px); margin-right: 0; table-layout: fixed; font-family: "Microsoft YaHei", "PingFang SC", Arial, sans-serif; }
              .items-table th, .items-table td { border: 1px solid #333; padding: 5px 4px; text-align: center; font-size: 13pt; line-height: 1.65; }
              .items-table th:nth-child(1), .items-table td:nth-child(1) { width: calc((100% - 425px) / 2 - 35px); min-width: calc((100% - 425px) / 2 - 35px); max-width: calc((100% - 425px) / 2 - 35px); padding-left: 9px; border-left: 1px solid #333 !important; box-sizing: border-box; }
              .items-table th:nth-child(2), .items-table td:nth-child(2) { width: calc((100% - 425px) / 2 + 58px); min-width: calc((100% - 425px) / 2 + 58px); max-width: calc((100% - 425px) / 2 + 58px); }
              .items-table th:nth-child(3), .items-table td:nth-child(3) { width: 167px; }
              .items-table th:nth-child(4), .items-table td:nth-child(4) { width: 60px; min-width: 60px; max-width: 60px; white-space: nowrap; }
              .items-table th:nth-child(5), .items-table td:nth-child(5) { width: 80px; min-width: 80px; max-width: 80px; white-space: nowrap; }
              .items-table th:nth-child(6), .items-table td:nth-child(6) { width: 50px; min-width: 50px; max-width: 50px; white-space: nowrap; }
              .items-table th:nth-child(7), .items-table td:nth-child(7) { width: 118px; min-width: 118px; max-width: 118px; }
              .items-table tr > th:first-child, .items-table tr > td:first-child { border-left: 1px solid #333 !important; }
              .items-table { border-left: 1px solid #333 !important; }
              .items-table th { background: #eee; font-weight: 700; }
              
              .footer-notes { width: calc(100% + 65px); margin-right: 0; box-sizing: border-box; padding-right: 20px; padding-left: 5px; padding-bottom: 30px; font-size: 13pt; line-height: 1.35; }
              .signatures {
                position: absolute;
                left: 20px;
                right: 52px;
                bottom: 8px;
                display: flex;
                justify-content: space-between;
                margin-top: 0;
                padding: 0;
                font-size: 13pt;
              }
              .sig-line { display: inline-block; min-width: 120px; border-bottom: 1px solid #333; line-height: 1; padding-bottom: 2px; }
              
              /* Print Specifics */
              @media print {
                  html, body { margin: 0 !important; padding: 0 !important; }
                  .print-content {
                    width: 100%;
                    overflow: hidden;
                    page-break-inside: avoid;
                    break-inside: avoid;
                  }
                  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              }
            </style>
          </head>
          <body>${printContent}</body>
        </html>
      `)
      doc.close()

      // Use a timeout to ensure styles are loaded
      setTimeout(() => {
        iframe.contentWindow.focus()
        iframe.contentWindow.print()
        // Remove after print dialog closes (approximate)
        setTimeout(() => {
          document.body.removeChild(iframe)
        }, 3000)
      }, 500)
    },

    extractDateFromDateTime(val) {
      if (!val) return ''
      if (val instanceof Date && !Number.isNaN(val.getTime())) {
        const y = val.getFullYear()
        const m = String(val.getMonth() + 1).padStart(2, '0')
        const d = String(val.getDate()).padStart(2, '0')
        return `${y}-${m}-${d}`
      }
      const s = String(val).trim()
      if (!s) return ''

      // 优先处理带时区/ISO的时间字符串，按本地时区转 yyyy-MM-dd，避免出现 -1 天
      const normalizedText = s.includes(' ') && !s.includes('T') ? s.replace(' ', 'T') : s
      const parsed = new Date(normalizedText)
      if (!Number.isNaN(parsed.getTime())) {
        const y = parsed.getFullYear()
        const m = String(parsed.getMonth() + 1).padStart(2, '0')
        const d = String(parsed.getDate()).padStart(2, '0')
        return `${y}-${m}-${d}`
      }

      const m1 = s.match(/^(\d{4}-\d{2}-\d{2})[ T]\d{2}:\d{2}:\d{2}/)
      if (m1) return m1[1]
      const m2 = s.match(/^(\d{4}-\d{2}-\d{2})$/)
      if (m2) return m2[1]
      return s
    },

    normalizeNoticeDeliveryDate(val) {
      if (!val) return ''
      if (val instanceof Date && !Number.isNaN(val.getTime())) {
        const y = val.getFullYear()
        const m = String(val.getMonth() + 1).padStart(2, '0')
        const d = String(val.getDate()).padStart(2, '0')
        return `${y}-${m}-${d}`
      }
      const text = this.extractDateFromDateTime(val)
      const m = String(text || '').match(/^(\d{4}-\d{2}-\d{2})/)
      return m ? m[1] : String(text || '')
    },

    formatShortDate(val) {
      if (!val) return '-'
      const s = String(val).trim()
      const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
      if (!m) return s
      return `${m[1].slice(2)}-${m[2]}-${m[3]}`
    }
  }
}
</script>

<style scoped>
.delivery-notice-container {
  padding: 20px;
  overflow-x: hidden;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.header-actions {
  display: flex;
  align-items: center;
}

.search-area {
  margin-bottom: 16px;
  padding: 14px 16px;
  background: #f8fafc;
  border: 1px solid #ebeef5;
  border-radius: 10px;
}

.clearfix:before,
.clearfix:after {
  display: table;
  content: "";
}
.clearfix:after {
  clear: both
}

.delivery-table {
  border: 1px solid #ebeef5;
  border-radius: 8px;
  overflow: hidden;
}

.delivery-table ::v-deep th.el-table__cell {
  background: #f5f7fa;
  color: #606266;
  font-weight: 600;
}

.delivery-table ::v-deep .el-table__row td.el-table__cell {
  padding-top: 10px;
  padding-bottom: 10px;
}

.customer-code-inline {
  color: #909399;
  font-size: 12px;
  margin-left: 4px;
}

.item-multi-line {
  margin-bottom: 6px;
  line-height: 1.35;
}

.item-multi-line:last-child {
  margin-bottom: 0;
}

.confirm-user {
  color: #909399;
  font-size: 12px;
  margin-top: 4px;
  line-height: 1.2;
}

.op-btns {
  display: flex;
  justify-content: flex-start;
  flex-wrap: wrap;
  gap: 8px;
  line-height: 1.2;
}

.op-print {
  color: #409eff;
}

.op-logistics {
  color: #67c23a;
}

.op-danger {
  color: #f56c6c;
}

.delivery-pagination {
  margin-top: 16px;
  text-align: right;
}

.print-template-toolbar {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-right: 12px;
}

.print-template-label {
  color: #606266;
  font-size: 13px;
}

.print-template-current {
  color: #67c23a;
  font-size: 13px;
  margin-left: 2px;
}

.order-select ::v-deep .el-input {
  position: relative;
}
.order-select ::v-deep .el-input__inner {
  padding-right: 30px;
}
.order-select ::v-deep .el-input::after {
  content: "▼";
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: #c0c4cc;
  font-size: 12px;
  pointer-events: none;
}

.receive-logistics-preview {
  margin-top: 8px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 10px 12px;
  background: #fafcff;
}

.receive-logistics-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.receive-logistics-update {
  color: #909399;
  font-size: 12px;
}

.receive-logistics-dialog ::v-deep .el-form-item {
  margin-bottom: 33px; /* 原约22px，提升50% */
}

.receive-logistics-dialog ::v-deep .el-form-item__label,
.receive-logistics-dialog ::v-deep .el-input__inner {
  line-height: 54px; /* 原36px，提升50% */
  height: 54px;
}

.receive-logistics-dialog ::v-deep .el-form-item__error {
  line-height: 1.8;
}

.tracking-descriptions {
  margin-bottom: 8px;
}

.print-content {
  position: relative;
  width: 100%;
  padding: 21px 64px 8px 9px;
  background: white;
  color: black;
  font-family: "Microsoft YaHei", "PingFang SC", Arial, sans-serif;
  font-size: 13pt;

  .copy-label-vertical {
    position: absolute;
    right: 5px;
    top: 12px;
    transform: translate(2mm, 10mm);
    height: 385px;
    width: 26px;
    display: flex;
    flex-direction: column;
    border: 1px solid #cfd3dc;
    border-radius: 2px;
    background: #fff;
    font-family: "Microsoft YaHei", "PingFang SC", Arial, sans-serif;
  }

  .copy-label-vertical > div {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    writing-mode: vertical-rl;
    text-orientation: mixed;
    font-size: 13pt;
    font-weight: 700;
    color: #444;
    border-bottom: 1px solid #e4e7ed;
    line-height: 1;
    padding: 1px 0;
    font-family: "Microsoft YaHei", "PingFang SC", Arial, sans-serif;
  }

  .copy-label-vertical > div:last-child {
    border-bottom: none;
  }

  .print-header-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 0;
    width: calc(100% + 65px);
  }

  .print-main-up-30 {
    margin-top: 15px;
  }

  .company-logo-wrap {
    width: 224px;
    min-height: 112px;
    display: flex;
    align-items: flex-start;
    transform: translateY(-5px);
  }

  .company-logo {
    max-width: 210px;
    max-height: 105px;
    object-fit: contain;
    transform: none;
  }

  .company-name { font-size: 22pt; font-weight: 700; margin-bottom: 2px; transform: translateY(3px); }
  .company-info { font-size: 13pt; margin-bottom: 0; line-height: 1.2; }
  .company-info > div { margin: 0; padding: 0; }
  .company-info-right { text-align: right; position: relative; left: 0; transform: translate(0, -8px); }
  .form-title { text-align: center; font-size: 26pt; font-weight: bold; letter-spacing: 5px; margin: -72px 0 -2px 0; line-height: 1.05; }
  .form-id { width: calc(100% + 65px); text-align: right; font-size: 13pt; margin-bottom: 0; transform: translate(0, 15px); }

  table { width: 100%; border-collapse: collapse; }

  .header-table {
    width: calc(100% + 65px);
    margin-bottom: 10px;
    table-layout: fixed;
    font-family: "Microsoft YaHei", "PingFang SC", Arial, sans-serif;
    td { padding: 2px 4px; line-height: 1.15; vertical-align: middle; font-size: 13pt; }
    .label { width: 90px; white-space: nowrap; }
    td:nth-child(3).label { width: 88px; padding-left: 4px; }
    td:nth-child(3) { position: relative; left: 0; transform: none; }
    td:nth-child(4) { position: relative; left: 0; transform: translateX(30px); }
    .value { border-bottom: 1px solid #ccc; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    td:nth-child(2).value { border-bottom: none; position: relative; }
    td:nth-child(2).value::after { content: ''; position: absolute; left: 0; right: 26px; bottom: 0; border-bottom: 1px solid #ccc; }
    .value.address-value { white-space: normal; overflow: visible; text-overflow: clip; word-break: break-all; overflow-wrap: anywhere; line-height: 1.3; font-size: 13pt; }
    .value.address-value.addr-long { font-size: 13pt; line-height: 1.28; }
    .value.address-value.addr-very-long { font-size: 13pt; line-height: 1.22; }
    .value.address-value.addr-super-long { font-size: 13pt; line-height: 1.16; }
    td:nth-child(4).value { width: 200px; max-width: 200px; padding-left: 6px; }
    td.carrier-phone-value { position: relative; left: 0; transform: translateX(15px); }
  }

  .items-table {
    border: 1px solid #333;
    width: calc(100% + 65px);
    margin-right: 0;
    table-layout: fixed;
    font-family: "Microsoft YaHei", "PingFang SC", Arial, sans-serif;
    th, td { border: 1px solid #333; padding: 5px 4px; text-align: center; font-size: 13pt; line-height: 1.65; }
    th:nth-child(1), td:nth-child(1) { width: calc((100% - 425px) / 2 - 35px); min-width: calc((100% - 425px) / 2 - 35px); max-width: calc((100% - 425px) / 2 - 35px); padding-left: 9px; border-left: 1px solid #333 !important; box-sizing: border-box; }
    th:nth-child(2), td:nth-child(2) { width: calc((100% - 425px) / 2 + 58px); min-width: calc((100% - 425px) / 2 + 58px); max-width: calc((100% - 425px) / 2 + 58px); }
    th:nth-child(3), td:nth-child(3) { width: 167px; }
    th:nth-child(4), td:nth-child(4) { width: 60px; min-width: 60px; max-width: 60px; white-space: nowrap; }
    th:nth-child(5), td:nth-child(5) { width: 80px; min-width: 80px; max-width: 80px; white-space: nowrap; }
    th:nth-child(6), td:nth-child(6) { width: 50px; min-width: 50px; max-width: 50px; white-space: nowrap; }
    th:nth-child(7), td:nth-child(7) { width: 118px; min-width: 118px; max-width: 118px; }
    tr > th:first-child, tr > td:first-child { border-left: 1px solid #333 !important; }
    border-left: 1px solid #333 !important;
    th { background: #eee; font-weight: 700; }
  }

  .footer-notes {
    width: calc(100% + 65px);
    margin-right: 0;
    box-sizing: border-box;
    padding-right: 20px;
    padding-left: 5px;
    font-size: 13pt;
    line-height: 1.35;
    padding-bottom: 30px;
  }

  .signatures {
    position: absolute;
    left: 20px;
    right: 52px;
    bottom: 8px;
    display: flex;
    justify-content: space-between;
    margin-top: 0;
    padding: 0;
    font-size: 13pt;
  }

  .sig-line {
    display: inline-block;
    min-width: 120px;
    border-bottom: 1px solid #333;
    line-height: 1;
    padding-bottom: 2px;
  }
}
</style>
