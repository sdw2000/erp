<template>
  <div class="quotations">
    <el-card>
      <div slot="header" class="clearfix">
        <span>报价管理</span>        <div style="float:right">
          <el-button v-if="$canImportExport()" type="success" icon="el-icon-download" size="small" @click="handleDownloadTemplate">下载模板</el-button>
          <el-button v-if="$canImportExport()" type="warning" icon="el-icon-upload2" size="small" @click="handleImport">导入</el-button>
          <el-button v-if="$canImportExport()" type="info" icon="el-icon-download" size="small" @click="handleExport">导出</el-button>
          <el-button type="primary" icon="el-icon-plus" size="small" @click="openCreate">新增报价单</el-button>
          <input ref="fileInput" type="file" accept=".xlsx,.xls" style="display:none" @change="onFileChange">
        </div>
      </div>

      <el-alert
        v-if="reminderSummary.expiredCount || reminderSummary.expiringCount"
        class="reminder-alert"
        type="warning"
        :closable="false"
        show-icon
      >
        <template slot="title">
          已过期 {{ reminderSummary.expiredCount }} 条，即将到期 {{ reminderSummary.expiringCount }} 条，请业务及时更新报价时效。
        </template>
      </el-alert>

      <div class="search-area" style="margin-bottom: 10px;">
        <el-row :gutter="12">
          <el-col :span="8">
            <el-input
              v-model="searchForm.customerKeyword"
              placeholder="客户 / 客户代码"
              clearable
              size="small"
              @keyup.enter.native="handleSearch"
              @clear="handleSearch"
            />
          </el-col>
          <el-col :span="8">
            <el-button type="primary" size="small" icon="el-icon-search" @click="handleSearch">搜索</el-button>
            <el-button size="small" icon="el-icon-refresh" @click="handleReset">重置</el-button>
          </el-col>
        </el-row>
      </div>

      <el-table ref="quotationsTable" :data="quotations" :row-class-name="getRowClassName" style="width:100%" stripe>
        <el-table-column type="index" label="序号" width="60" align="center" />
        <el-table-column label="客户" width="90" show-overflow-tooltip>
          <template slot-scope="scope">{{ getCustomerShortDisplay(scope.row.customer) }}</template>
        </el-table-column>
        <el-table-column prop="quotationNo" label="报价单号" width="144" />
        <el-table-column prop="pricingUnit" label="报价单位" width="90" />
        <el-table-column prop="contactPerson" label="联系人" width="120" />
        <el-table-column label="报价日期" width="96">
          <template slot-scope="scope">{{ formatShortDate(scope.row.quotationDate) }}</template>
        </el-table-column>
        <el-table-column label="有效期至" width="96">
          <template slot-scope="scope">{{ formatValidUntilShort(scope.row.validUntil) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="84">
          <template slot-scope="scope">
            <el-tag :type="getDisplayStatusType(scope.row)" size="small">
              {{ getDisplayStatusText(scope.row) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="updatedBy" label="修改人" width="96" show-overflow-tooltip />
        <el-table-column label="修改时间" width="136">
          <template slot-scope="scope">{{ formatDateTimeShort(scope.row.updatedAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="210">
          <template slot-scope="scope">
            <div class="quotation-op-btns">
              <el-button size="mini" @click="viewDetail(scope.row)">详情</el-button>
              <el-button size="mini" type="success" @click="printQuotation(scope.row)">打印</el-button>
              <el-button size="mini" type="primary" @click="openEdit(scope.row)">编辑</el-button>
              <el-button size="mini" type="danger" @click="confirmDelete(scope.row)">删除</el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
      <!-- 报价定价状态显示列（表格右上方） -->

      <div class="pagination-wrapper">
        <el-pagination
          :current-page.sync="currentPage"
          :page-size="pageSize"
          :page-sizes="[5,10,20,50]"
          layout="sizes, prev, pager, next, jumper, ->, total"
          :total="total"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>

      <!-- 详情对话框 -->
      <el-dialog title="报价单详情" :visible.sync="detailVisible" width="1200px">
        <div v-if="currentQuotation">
          <el-row :gutter="20">
            <el-col :span="12">
              <p><strong>客户：</strong>{{ currentQuotation.customer || currentQuotation.customerName || '-' }}</p>
              <p><strong>联系人：</strong>{{ currentQuotation.contactPerson }}</p>
              <p><strong>联系电话：</strong>{{ currentQuotation.contactPhone }}</p>
              <p><strong>来源送样单：</strong>{{ currentQuotation.sourceSampleNo || '-' }}</p>
            </el-col>
            <el-col :span="12">
              <p><strong>报价单号：</strong>{{ currentQuotation.quotationNo }}</p>
              <p><strong>报价日期：</strong>{{ currentQuotation.quotationDate }}</p>
              <p><strong>报价单位：</strong>{{ currentQuotation.pricingUnit || '-' }}</p>
              <p><strong>有效期至：</strong>{{ formatValidUntilText(currentQuotation.validUntil) }}</p>
            </el-col>
          </el-row>
          <el-divider />
          <p><strong>状态：</strong><el-tag :type="getDisplayStatusType(currentQuotation)">{{ getDisplayStatusText(currentQuotation) }}</el-tag></p>
          <p v-if="currentQuotation.remark"><strong>备注：</strong>{{ currentQuotation.remark }}</p>

          <el-table :data="currentQuotation.items" stripe style="width:100%; margin-top:10px;">
            <el-table-column prop="materialCode" label="物料代码" width="120" />
            <el-table-column prop="materialName" label="物料名称" width="150" />
            <el-table-column prop="colorCode" label="颜色" width="100" />
            <el-table-column label="规格(厚度*宽度*长度m)" width="220">
              <template slot-scope="scope">
                {{ `${scope.row.thickness || '-'}*${scope.row.width || '-'}*${scope.row.length || '-'}` }}
              </template>
            </el-table-column>
            <el-table-column prop="unit" label="单位" width="80" />
            <el-table-column prop="unitPrice" label="单价" width="100" />
            <el-table-column prop="sampleNo" label="送样单号" width="120" />
            <el-table-column label="版本" width="150">
              <template slot-scope="scope">
                <span class="version-label">V{{ scope.row.versionNo || '-' }}</span>
                <el-button type="text" @click="openVersionHistory(scope.row, currentQuotation.customer)">查看</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
        <span slot="footer">
          <el-button @click="detailVisible = false">关闭</el-button>
        </span>
      </el-dialog>

      <el-dialog title="报价单打印预览" :visible.sync="printVisible" width="1080px" top="5vh">
        <div v-if="printCurrent" id="quotationPrintArea" class="quotation-print-content">
          <div class="quotation-company-header">
            <div class="quotation-company-top">
              <div class="quotation-logo-wrap">
                <img v-if="printLogoUrl" :src="printLogoUrl" alt="company-logo" class="quotation-logo">
              </div>
              <div class="quotation-company-main">
                <div class="quotation-company-name">{{ companyInfo.companyName }}</div>
                <div class="quotation-company-lines">地址：{{ companyInfo.address }}</div>
                <div class="quotation-company-lines">电话：{{ companyInfo.phone }}  传真：{{ companyInfo.fax }}</div>
                <div class="quotation-company-lines">网址：{{ companyInfo.website }}</div>
              </div>
            </div>
          </div>
          <div class="quotation-doc-title-wrap">
            <div class="quotation-print-title">报价单</div>
            <div class="quotation-doc-no">报价单号 {{ printCurrent.quotationNo || '-' }}</div>
          </div>
          <div class="quotation-party-section">
            <div class="quotation-party-block">
              <div class="quotation-party-row"><strong>甲方（盖章）：</strong>{{ getPrintCustomerName() }}</div>
              <div class="quotation-party-row"><strong>授权代表：</strong>{{ printCurrent.contactPerson || '________________' }}</div>
              <div class="quotation-party-row"><strong>联系电话：</strong>{{ getPrintCustomerPhone() }}</div>
              <div class="quotation-party-row"><strong>联系地址：</strong>{{ getPrintCustomerAddress() }}</div>
            </div>
            <div class="quotation-party-block">
              <div class="quotation-party-row"><strong>乙方（盖章）：</strong>{{ companyInfo.companyName }}</div>
              <div class="quotation-party-row"><strong>授权代表：</strong>________________</div>
              <div class="quotation-party-row"><strong>联系电话：</strong>{{ companyInfo.phone || '-' }}</div>
              <div class="quotation-party-row"><strong>联系地址：</strong>{{ companyInfo.address || '-' }}</div>
            </div>
          </div>
          <div v-if="printCurrent.remark" class="quotation-print-remark">
            <strong>备注：</strong>{{ printCurrent.remark }}
          </div>
          <div class="quotation-date-bar">
            <span><strong>报价日期：</strong>{{ printCurrent.quotationDate || '-' }}</span>
            <span><strong>报价单位：</strong>{{ printCurrent.pricingUnit || '-' }}</span>
            <span><strong>有效期至：</strong>{{ formatValidUntilText(printCurrent.validUntil) }}</span>
          </div>
          <el-table class="quotation-print-table" :data="printCurrent.items || []" border stripe style="width:100%">
            <el-table-column type="index" label="序号" width="58" align="center" />
            <el-table-column prop="materialCode" label="料号" width="140" />
            <el-table-column prop="materialName" label="物料名称" width="150" />
            <el-table-column prop="colorCode" label="颜色" width="78" />
            <el-table-column width="220" align="center" header-align="center">
              <template slot="header">
                <span>规格</span><br>
                <span>（厚度μm*宽度mm*长度m）</span>
              </template>
              <template slot-scope="scope">{{ formatQuotationSpec(scope.row) }}</template>
            </el-table-column>
            <el-table-column prop="unit" label="单位" width="68" align="center" />
            <el-table-column width="90" align="center" header-align="center">
              <template slot="header">
                <span>单价</span><br>
                <span>/元</span>
              </template>
              <template slot-scope="scope">{{ formatPrintNumber(scope.row.unitPrice) }}</template>
            </el-table-column>
            <el-table-column width="100" align="center" header-align="center">
              <template slot="header">
                <span>平米单价</span><br>
                <span>元/m²</span>
              </template>
              <template slot-scope="scope">{{ calcSqmUnitPrice(scope.row) || '-' }}</template>
            </el-table-column>
            <el-table-column prop="remark" label="备注" min-width="120" />
          </el-table>
          <div class="quotation-print-note">以上报价请客户确认，如有调整请联系业务人员。</div>
          <div class="quotation-print-signature">
            <span>客户确认签字：_______________</span>
            <span>确认日期：_______________</span>
          </div>
        </div>
        <span slot="footer">
          <el-button @click="printVisible = false">关闭</el-button>
          <el-button type="primary" icon="el-icon-printer" @click="handleQuotationPrintBrowser">直接打印</el-button>
        </span>
      </el-dialog>

      <!-- 编辑/新增对话框 -->
      <el-dialog :title="isEditing ? '编辑报价单' : '新增报价单'" :visible.sync="editVisible" width="1150px">
        <el-form v-loading="editLoading" element-loading-text="加载中..." :model="editForm" label-width="100px">
          <el-row :gutter="12">
            <el-col :span="8">
              <el-form-item label="客户">
                <el-select
                  v-model="editForm.customerId"
                  filterable
                  remote
                  :remote-method="onCustomerRemote"
                  placeholder="请选择客户（输入代码或名称搜索）"
                  style="width: 100%"
                  @change="onCustomerChange"
                >
                  <el-option
                    v-for="customer in customerOptions"
                    :key="customer.id"
                    :label="customer.customerName"
                    :value="customer.id"
                  />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="联系人">
                <el-select
                  v-model="editForm.contactPerson"
                  filterable
                  clearable
                  placeholder="请选择联系人"
                  style="width:100%"
                  @change="onContactChange"
                >
                  <el-option
                    v-for="contact in customerContacts"
                    :key="contact.id || contact.contactName"
                    :label="contact.contactName + (contact.contactPhone ? '（' + contact.contactPhone + '）' : '')"
                    :value="contact.contactName"
                  />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="联系电话">
                <el-input v-model="editForm.contactPhone" readonly placeholder="从客户信息自动带出" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="12">
            <el-col :span="8">
              <el-form-item label="报价日期">
                <el-date-picker
                  v-model="editForm.quotationDate"
                  type="date"
                  placeholder="选择日期"
                  value-format="yyyy-MM-dd"
                  style="width:100%"
                  @change="handleQuotationDateChange"
                />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="报价单位">
                <el-select v-model="editForm.pricingUnit" style="width:100%">
                  <el-option label="按面积(㎡)" value="㎡" />
                  <el-option label="按长度(m)" value="m" />
                  <el-option label="按卷" value="卷" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="有效期至">
                <el-date-picker
                  v-model="editForm.validUntil"
                  type="date"
                  placeholder="选择日期"
                  value-format="yyyy-MM-dd"
                  style="width:100%"
                />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="状态">
                <el-select v-model="editForm.status" style="width:100%">
                  <el-option label="草稿" value="draft" />
                  <el-option label="已提交" value="submitted" />
                  <el-option label="已接受" value="accepted" />
                  <el-option label="已拒绝" value="rejected" />
                  <el-option label="已过期" value="expired" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="12">
            <el-col :span="16">
              <el-form-item label="送样导入">
                <el-select
                  v-model="selectedSampleNo"
                  filterable
                  clearable
                  placeholder="选择送样单导入物料"
                  style="width:100%"
                >
                  <el-option
                    v-for="sample in availableSampleOptions"
                    :key="sample.sampleNo"
                    :label="`${sample.sampleNo} / ${sample.customerName || ''}`"
                    :value="sample.sampleNo"
                  />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="来源送样单">
                <div class="sample-import-actions">
                  <el-input v-model="editForm.sourceSampleNo" readonly />
                  <el-button type="primary" @click="importSelectedSample">导入送样物料</el-button>
                </div>
              </el-form-item>
            </el-col>
          </el-row>

          <el-row>
            <el-col :span="24">
              <el-form-item label="备注">
                <el-input v-model="editForm.remark" type="textarea" :rows="2" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-divider>报价明细</el-divider>

          <div style="margin-bottom:10px; text-align:right">
            <el-button size="small" @click="duplicateLastItem">复制上一行</el-button>
            <el-button type="primary" size="small" @click="addItem">
              <i class="el-icon-plus" /> 新增明细行
            </el-button>
          </div>
          <div class="detail-table-toolbar">
            <el-input
              v-model="detailMaterialKeyword"
              size="small"
              clearable
              placeholder="搜索料号（支持模糊）"
              prefix-icon="el-icon-search"
              style="width: 260px"
            />
          </div>
          <div class="quotation-edit-native-wrapper">
            <table class="quotation-edit-native-table">
              <colgroup>
                <col style="width:185px">
                <col style="width:55px">
                <col style="width:200px">
                <col style="width:80px">
                <col style="width:90px">
                <col style="width:90px">
                <col style="width:50px">
                <col style="width:130px">
                <col style="width:120px">
              </colgroup>
              <thead>
                <tr>
                  <th class="sortable-th" @click="toggleDetailSort('materialCode')">
                    物料代码
                    <span class="sort-indicator">{{ getDetailSortIndicator('materialCode') }}</span>
                  </th>
                  <th class="sortable-th" @click="toggleDetailSort('colorCode')">
                    颜色
                    <span class="sort-indicator">{{ getDetailSortIndicator('colorCode') }}</span>
                  </th>
                  <th class="th-spec sortable-th" @click="toggleDetailSort('spec')">
                    <span>规格</span>
                    <span>（厚度μm*宽度mm*长度m）</span>
                    <span class="sort-indicator">{{ getDetailSortIndicator('spec') }}</span>
                  </th>
                  <th class="sortable-th" @click="toggleDetailSort('unit')">
                    单位
                    <span class="sort-indicator">{{ getDetailSortIndicator('unit') }}</span>
                  </th>
                  <th class="sortable-th" @click="toggleDetailSort('unitPrice')">
                    单价
                    <span class="sort-indicator">{{ getDetailSortIndicator('unitPrice') }}</span>
                  </th>
                  <th class="th-sqm-price sortable-th" @click="toggleDetailSort('sqmPrice')">
                    <span>平米单价</span>
                    <span>元/m²</span>
                    <span class="sort-indicator">{{ getDetailSortIndicator('sqmPrice') }}</span>
                  </th>
                  <th class="sortable-th" @click="toggleDetailSort('versionNo')">
                    版本
                    <span class="sort-indicator">{{ getDetailSortIndicator('versionNo') }}</span>
                  </th>
                  <th>备注</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, index) in filteredSortedEditRows" :key="`q-item-${row.id || row.materialCode || 'new'}-${index}`">
                  <td>
                    <template v-if="row._editing">
                      <el-select
                        v-model="row.materialCode"
                        filterable
                        remote
                        :remote-method="onSpecRemote"
                        allow-create
                        placeholder="选择或输入"
                        size="small"
                        style="width: 100%"
                        @change="onMaterialCodeChange(row, $event)"
                      >
                        <el-option
                          v-for="spec in specOptions"
                          :key="spec.materialCode"
                          :label="spec.materialCode"
                          :value="spec.materialCode"
                        >
                          <span style="float: left">{{ spec.materialCode }}</span>
                          <span style="float: right; color: #8492a6; font-size: 12px">{{ spec.productName }}</span>
                        </el-option>
                      </el-select>
                    </template>
                    <span v-else>{{ row.materialCode || '-' }}</span>
                  </td>
                  <td>
                    <template v-if="row._editing">
                      <el-input v-model="row.colorCode" size="small" placeholder="颜色" />
                    </template>
                    <span v-else>{{ row.colorCode || '-' }}</span>
                  </td>
                  <td>
                    <template v-if="row._editing">
                      <div class="native-spec-inputs">
                        <el-input v-model.number="row.thickness" size="small" type="text" inputmode="decimal" placeholder="厚度" style="width:64px;" />
                        <span>*</span>
                        <el-input v-model="row.width" size="small" type="text" inputmode="decimal" placeholder="宽度" style="width:64px;" @input="onWidthInput(row)" @blur="formatWidthOnBlur(row)" />
                        <span>*</span>
                        <el-input v-model.number="row.length" size="small" type="text" inputmode="decimal" placeholder="长度" style="width:72px;" />
                      </div>
                    </template>
                    <span v-else>{{ formatQuotationSpec(row) }}</span>
                  </td>
                  <td>
                    <template v-if="row._editing">
                      <el-select v-model="row.unit" size="small" style="width:100%" @change="handleUnitChange(row)">
                        <el-option label="m²" value="㎡" />
                        <el-option label="m" value="m" />
                        <el-option label="卷" value="卷" />
                      </el-select>
                    </template>
                    <span v-else>{{ row.unit || '-' }}</span>
                  </td>
                  <td class="td-unit-price">
                    <template v-if="row._editing">
                      <el-input v-model="row.unitPrice" size="small" type="text" inputmode="decimal" placeholder="单价" @blur="formatUnitPriceOnBlur(row)" />
                    </template>
                    <span v-else>{{ row.unitPrice === null || row.unitPrice === '' ? '-' : row.unitPrice }}</span>
                  </td>
                  <td class="td-sqm-price">
                    <template v-if="row._editing">
                      <el-input :value="calcSqmUnitPrice(row)" size="small" readonly class="sqm-price-input" />
                    </template>
                    <span v-else>{{ calcSqmUnitPrice(row) || '-' }}</span>
                  </td>
                  <td class="native-version-cell"><span class="version-label">V{{ row.versionNo || '-' }}</span></td>
                  <td>
                    <template v-if="row._editing">
                      <el-input v-model="row.remark" size="small" placeholder="备注" />
                    </template>
                    <span v-else>{{ row.remark || '-' }}</span>
                  </td>
                  <td class="native-op-cell">
                    <el-button v-if="!row._editing" size="mini" type="text" @click="toggleRowEdit(row, true)">编辑</el-button>
                    <el-button v-else size="mini" type="text" @click="toggleRowEdit(row, false)">完成</el-button>
                    <el-button size="mini" type="text" @click="duplicateItem(row)">复制</el-button>
                    <el-button size="mini" type="text" @click="openVersionHistory(row, editForm.customer)">版本</el-button>
                    <el-button size="mini" type="danger" @click="removeItem(row)">删除</el-button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </el-form>

        <span slot="footer">
          <el-button @click="editVisible = false">取消</el-button>
          <el-button v-if="!isEditing" type="warning" plain @click="saveQuotationDraft">暂存</el-button>
          <el-button type="primary" @click="saveQuotation">保存</el-button>
        </span>
      </el-dialog>

      <el-dialog title="报价版本记录" :visible.sync="versionDialogVisible" width="980px">
        <el-table v-loading="versionLoading" :data="versionHistory" stripe style="width:100%">
          <el-table-column prop="versionNo" label="版本号" width="90">
            <template slot-scope="scope">V{{ scope.row.versionNo }}</template>
          </el-table-column>
          <el-table-column prop="quotationNo" label="报价单号" width="160" />
          <el-table-column prop="quotationDate" label="报价日期" width="120" />
          <el-table-column prop="validUntil" label="有效期至" width="120" />
          <el-table-column prop="materialCode" label="物料代码" width="130" />
          <el-table-column label="规格" width="180">
            <template slot-scope="scope">
              <span>{{ (scope.row.thickness || '') + '*' + (scope.row.width || '') + '*' + (scope.row.length || '') }}m</span>
            </template>
          </el-table-column>
          <el-table-column prop="unitPrice" label="单价" width="100" />
          <el-table-column prop="sourceSampleNo" label="来源送样单" width="120" />
          <el-table-column prop="createdBy" label="报价人" width="100" />
          <el-table-column prop="createdAt" label="记录时间" min-width="160" />
        </el-table>
        <span slot="footer">
          <el-button @click="versionDialogVisible = false">关闭</el-button>
        </span>
      </el-dialog>
    </el-card>
  </div>
</template>

<script>
import request from '@/utils/request'
import { createQuotation, deleteQuotation, getQuotationDetail, getQuotationPage, getQuotationVersionHistory, importQuotation, updateQuotation } from '@/api/quotation'
import { getSampleDetail, getSampleList } from '@/api/sample'
import { getAllEnabledSpecs, getSpecByMaterialCode } from '@/api/tapeSpec'
import { getCustomerList, getContactsByCustomerId } from '@/api/customer'
import elTableAutoLayout from '@/mixins/elTableAutoLayout'

const DEFAULT_QUOTATION_UNIT = '㎡'
let inMemoryQuotationDraft = null
const specCacheByCode = new Map()
const specInflightByCode = new Map()

function normalizeMaterialCode(value) {
  return String(value || '').trim()
}

function cacheSpec(spec) {
  if (!spec) return
  const code = normalizeMaterialCode(spec.materialCode)
  if (!code) return
  specCacheByCode.set(code, spec)
}

function normalizeQuotationUnit(item = {}) {
  const rawUnit = String(item.unit || '').trim()
  const normalizedUnit = (rawUnit === '米' || rawUnit === 'M' || rawUnit === 'm')
    ? 'm'
    : ((rawUnit === '平方米' || rawUnit === 'm²' || rawUnit === 'm2' || rawUnit === 'M²' || rawUnit === 'M2') ? '㎡' : rawUnit)
  return {
    ...item,
    unit: normalizedUnit || DEFAULT_QUOTATION_UNIT
  }
}

function createEmptyItem() {
  return {
    materialCode: '',
    materialName: '',
    specification: '',
    model: '',
    length: null,
    width: null,
    thickness: null,
    colorCode: '',
    unit: DEFAULT_QUOTATION_UNIT,
    unitPrice: null,
    sampleNo: '',
    versionNo: null,
    remark: '',
    _editing: true
  }
}

function cloneQuotationForEdit(row = {}) {
  const cloned = { ...row }
  if (Array.isArray(row.items)) {
    cloned.items = row.items.map(item => {
      const copied = { ...item }
      delete copied.versionHistory
      return copied
    })
  }
  return cloned
}

export default {
  name: 'Quotations',
  mixins: [elTableAutoLayout],
  tableLayoutRefs: ['quotationsTable'],
  data() {
    return {
      quotations: [],
      serverTotal: 0,
      customers: [],
      customerOptions: [],
      customerContacts: [],
      specs: [],
      specOptions: [],
      sampleOptions: [],
      customerSampleSpecs: [],
      reminderSummary: {
        expiredCount: 0,
        expiringCount: 0,
        items: []
      },
      selectedSampleNo: '',
      versionDialogVisible: false,
      versionHistory: [],
      versionLoading: false,
      currentPage: 1,
      pageSize: 10,
      searchForm: {
        customerKeyword: ''
      },
      detailVisible: false,
      printVisible: false,
      editVisible: false,
      isEditing: false,
      editLoading: false,
      currentQuotation: null,
      printCurrent: null,
      companyInfo: {
        companyName: '东莞市方恩电子材料科技有限公司',
        address: '广东省东莞市桥头镇东新路13号2号楼102室',
        phone: '0769-82551118',
        fax: '0769-82551160',
        website: 'www.finechemfr.com'
      },
      printLogoUrl: '/logo/finechem-logo.png',
      editForm: {
        customerId: null,
        customer: '',
        contactPerson: '',
        contactPhone: '',
        sourceSampleNo: '',
        quotationDate: '',
        pricingUnit: '㎡',
        validUntil: '',
        status: 'draft',
        remark: '',
        items: [createEmptyItem()]
      },
      detailMaterialKeyword: '',
      detailSortKey: '',
      detailSortOrder: ''
    }
  },
  computed: {
    total() {
      return this.serverTotal
    },
    availableSampleOptions() {
      if (!this.editForm.customer) {
        return this.sampleOptions
      }
      return this.sampleOptions.filter(item => this.resolveCustomerCode(item) === this.editForm.customer)
    },
    filteredSortedEditRows() {
      const items = Array.isArray(this.editForm.items) ? this.editForm.items : []
      const keyword = String(this.detailMaterialKeyword || '').trim().toLowerCase()
      let rows = items

      if (keyword) {
        rows = rows.filter(item => String((item && item.materialCode) || '').toLowerCase().includes(keyword))
      }

      const sortKey = this.detailSortKey
      const sortOrder = this.detailSortOrder
      if (!sortKey || !sortOrder) {
        return rows
      }

      const direction = sortOrder === 'asc' ? 1 : -1
      return rows.slice().sort((a, b) => direction * this.compareDetailRow(a, b, sortKey))
    }
  },
  mounted() {
    this.fetchCompanyInfo()
    this.fetchQuotations()
    this.fetchCustomers()
    this.fetchSpecs()
    this.fetchSamples()
  },
  methods: {
    getDateString(dateObj) {
      const yyyy = dateObj.getFullYear()
      const mm = String(dateObj.getMonth() + 1).padStart(2, '0')
      const dd = String(dateObj.getDate()).padStart(2, '0')
      return `${yyyy}-${mm}-${dd}`
    },
    getTodayDateString() {
      return this.getDateString(new Date())
    },
    getDateAfterMonths(months) {
      const date = new Date()
      date.setMonth(date.getMonth() + months)
      return this.getDateString(date)
    },
    toggleDetailSort(sortKey) {
      if (this.detailSortKey !== sortKey) {
        this.detailSortKey = sortKey
        this.detailSortOrder = 'asc'
        return
      }
      if (this.detailSortOrder === 'asc') {
        this.detailSortOrder = 'desc'
      } else if (this.detailSortOrder === 'desc') {
        this.detailSortOrder = ''
        this.detailSortKey = ''
      } else {
        this.detailSortOrder = 'asc'
      }
    },
    getDetailSortIndicator(sortKey) {
      if (this.detailSortKey !== sortKey) return '↕'
      if (this.detailSortOrder === 'asc') return '↑'
      if (this.detailSortOrder === 'desc') return '↓'
      return '↕'
    },
    compareDetailRow(a, b, sortKey) {
      const av = this.getDetailSortValue(a, sortKey)
      const bv = this.getDetailSortValue(b, sortKey)
      const aEmpty = av === null || av === undefined || av === ''
      const bEmpty = bv === null || bv === undefined || bv === ''
      if (aEmpty && bEmpty) return 0
      if (aEmpty) return 1
      if (bEmpty) return -1
      const aNum = Number(av)
      const bNum = Number(bv)
      if (Number.isFinite(aNum) && Number.isFinite(bNum)) {
        return aNum - bNum
      }
      return String(av).localeCompare(String(bv), 'zh-CN', { numeric: true, sensitivity: 'base' })
    },
    getDetailSortValue(row, sortKey) {
      if (!row) return ''
      if (sortKey === 'materialCode') return row.materialCode
      if (sortKey === 'colorCode') return row.colorCode
      if (sortKey === 'spec') {
        const t = Number(row.thickness || 0)
        const w = Number(row.width || 0)
        const l = Number(row.length || 0)
        return t * 100000000 + w * 10000 + l
      }
      if (sortKey === 'unit') return row.unit
      if (sortKey === 'unitPrice') return row.unitPrice
      if (sortKey === 'sqmPrice') return this.calcSqmUnitPrice(row)
      if (sortKey === 'versionNo') return row.versionNo
      return ''
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
      } catch (error) {
        console.error('加载公司信息失败', error)
      }
    },
    async fetchQuotations() {
      try {
        const res = await getQuotationPage({
          current: this.currentPage,
          size: this.pageSize,
          customerKeyword: (this.searchForm.customerKeyword || '').trim() || undefined
        })
        if (res && res.code === 200) {
          const payload = res.data || {}
          const rows = Array.isArray(payload.records) ? payload.records : []
          this.quotations = rows.map(row => ({
            ...row,
            customer: row.customer || '',
            items: Array.isArray(row.items) ? row.items.map(item => normalizeQuotationUnit(item)) : []
          }))
          this.serverTotal = Number(payload.total || 0)
          this.reminderSummary = payload.reminders || { expiredCount: 0, expiringCount: 0, items: [] }
        } else {
          this.$message.error(res.msg || '获取报价单列表失败')
        }
      } catch (error) {
        console.error('获取报价单列表失败', error)
        this.$message.error('获取报价单列表失败')
        this.quotations = []
        this.serverTotal = 0
      } finally {
        this.scheduleTableLayout()
      }
    },
    async fetchCustomers() {
      try {
        const res = await getCustomerList({ size: 1000 })
        if (res && (res.code === 20000 || res.code === 200)) {
          const data = res.data
          const list = data && data.records ? data.records : (Array.isArray(data) ? data : [])
          this.customers = list.map(customer => ({
            ...customer,
            customerName: customer.customerName || customer.name || '',
            shortName: customer.shortName || customer.customerShortName || '',
            customerCode: customer.customerCode || '',
            primaryContactName: customer.primaryContactName || customer.contactName || '',
            customerPhone: this.resolveCustomerPhone(customer)
          }))
          // 初始化下拉的候选项，避免一次性渲染全部
          this.customerOptions = this.customers.slice(0, 80)
        }
      } catch (error) {
        console.error('获取客户列表失败:', error)
      }
    },
    getCustomerShortDisplay(customerValue) {
      const key = String(customerValue || '').trim()
      if (!key) return '-'
      const match = (this.customers || []).find(c => {
        const code = String(c.customerCode || '').trim()
        return key === code
      })
      if (!match) return key
      return match.shortName || match.customerName || key
    },
    resolveCustomerCode(sampleOrCustomer) {
      if (!sampleOrCustomer) return ''
      const directCode = String(sampleOrCustomer.customerCode || '').trim()
      if (directCode) return directCode
      const customerName = String(sampleOrCustomer.customerName || sampleOrCustomer.name || '').trim()
      if (!customerName) return ''
      const matched = (this.customers || []).find(item => String(item.customerName || '').trim() === customerName)
      return matched ? String(matched.customerCode || '').trim() : ''
    },
    formatShortDate(value) {
      const text = String(value || '').trim()
      if (!text) return '-'
      const m = text.match(/^(\d{4})-(\d{2})-(\d{2})/)
      if (m) {
        return `${m[1].slice(2)}-${m[2]}-${m[3]}`
      }
      return text
    },
    formatValidUntilShort(value) {
      const text = String(value || '').trim()
      if (!text) return '长期'
      return this.formatShortDate(text)
    },
    formatValidUntilText(value) {
      const text = String(value || '').trim()
      if (!text) return '长期'
      return text
    },
    formatDateTimeShort(value) {
      if (!value) return '-'
      const text = String(value)
      const m = text.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/)
      if (m) {
        return `${m[1].slice(2)}-${m[2]}-${m[3]} ${m[4]}:${m[5]}`
      }
      return text
    },
    resolveCustomerPhone(customer) {
      if (!customer) return ''
      const direct = customer.primaryContactMobile || customer.primaryContactPhone || customer.contactPhone || customer.phone || customer.mobile || customer.companyPhone || ''
      if (direct) return direct
      const contacts = Array.isArray(customer.contacts) ? customer.contacts : []
      if (!contacts.length) return ''
      const primary = contacts.find(c => Number(c.isPrimary) === 1)
      const picked = primary || contacts[0]
      return picked.mobile || picked.phone || picked.contactPhone || ''
    },
    normalizeContact(raw = {}) {
      return {
        id: raw.id,
        contactName: raw.contactName || raw.name || '',
        contactPhone: raw.contactPhone || raw.mobile || raw.phone || '',
        isPrimary: Number(raw.isPrimary || 0)
      }
    },
    pickPrimaryContact(contacts = []) {
      if (!contacts.length) return null
      return contacts.find(c => Number(c.isPrimary) === 1) || contacts[0]
    },
    fillContactFields(contact) {
      if (!contact) {
        this.editForm.contactPerson = ''
        this.editForm.contactPhone = ''
        return
      }
      this.editForm.contactPerson = contact.contactName || ''
      this.editForm.contactPhone = contact.contactPhone || ''
    },
    async loadCustomerContacts(customerId, preferredContactName) {
      this.customerContacts = []
      if (!customerId) return
      try {
        const res = await getContactsByCustomerId(customerId)
        if (res && (res.code === 20000 || res.code === 200)) {
          const contacts = Array.isArray(res.data) ? res.data : []
          this.customerContacts = contacts.map(item => this.normalizeContact(item)).filter(item => item.contactName)
        }
      } catch (error) {
        console.error('获取客户联系人失败:', error)
      }

      if (!this.customerContacts.length) return

      if (preferredContactName) {
        const matched = this.customerContacts.find(c => c.contactName === preferredContactName)
        if (matched) {
          this.fillContactFields(matched)
          return
        }
      }
      this.fillContactFields(this.pickPrimaryContact(this.customerContacts))
    },
    async fetchSpecs() {
      try {
        const res = await getAllEnabledSpecs()
        if (res && (res.code === 200 || res.code === 20000)) {
          this.specs = res.data || []
          if (Array.isArray(this.specs) && this.specs.length) {
            this.specs.forEach(spec => cacheSpec(spec))
            this.specOptions = this.specs.slice(0, 80)
          }
        }
      } catch (error) {
        console.error('获取料号列表失败:', error)
      }
    },

    onCustomerRemote(query) {
      const q = String(query || '').trim().toLowerCase()
      if (!q) {
        this.customerOptions = this.customers.slice(0, 80)
        return
      }
      this.customerOptions = (this.customers || []).filter(c => {
        const code = String(c.customerCode || '').toLowerCase()
        const name = String(c.customerName || '').toLowerCase()
        return code.includes(q) || name.includes(q)
      }).slice(0, 80)
    },

    async onSpecRemote(query) {
      const q = String(query || '').trim()
      if (!q) {
        this.specOptions = this.specs.slice(0, 80)
        return
      }
      const ql = q.toLowerCase()
      const matched = (this.specs || []).filter(s => {
        const code = String(s.materialCode || '').toLowerCase()
        const name = String(s.productName || s.materialName || '').toLowerCase()
        return code.includes(ql) || name.includes(ql)
      }).slice(0, 100)
      if (matched.length) {
        this.specOptions = matched
        return
      }
      // fallback: try fetch by exact code
      try {
        const res = await getSpecByMaterialCode(q)
        if (res && (res.code === 200 || res.code === 20000) && res.data) {
          cacheSpec(res.data)
          this.specOptions = [res.data]
          return
        }
      } catch (e) {
        // ignore
      }
      this.specOptions = []
    },
    async fetchSamples() {
      try {
        const res = await getSampleList({ current: 1, size: 200 })
        if (res && (res.code === 200 || res.code === 20000)) {
          const pageData = res.data || {}
          this.sampleOptions = pageData.records || []
        }
      } catch (error) {
        console.error('获取送样列表失败:', error)
      }
    },
    async onCustomerChange(customerId) {
      const customer = this.customers.find(item => item.id === customerId)
      if (!customer) return
      this.editForm.customer = customer.customerCode || ''
      this.editForm.contactPerson = ''
      this.editForm.contactPhone = ''
      await this.loadCustomerContacts(customerId)
      if (!this.customerContacts.length) {
        this.editForm.contactPerson = customer.primaryContactName || ''
        this.editForm.contactPhone = customer.customerPhone || ''
      }
      if (this.selectedSampleNo) {
        const sample = this.sampleOptions.find(item => item.sampleNo === this.selectedSampleNo)
        if (sample && sample.customerName !== customer.customerName) {
          this.selectedSampleNo = ''
        }
      }
    },

    handleUnitChange(row) {
      if (!row) return
      const sqmPrice = this.getSqmUnitPriceValue(row)
      if (!Number.isFinite(sqmPrice) || sqmPrice <= 0) return
      const nextPrice = this.calcUnitPriceFromSqm(row, String(row.unit || '').trim(), sqmPrice)
      if (Number.isFinite(nextPrice) && nextPrice > 0) {
        row.unitPrice = nextPrice.toFixed(4)
      }
    },

    getSqmUnitPriceValue(row) {
      if (!row) return NaN
      const unit = String(row.unit || '').trim()
      const unitPrice = Number(row.unitPrice)
      if (!Number.isFinite(unitPrice) || unitPrice <= 0) return NaN

      if (unit === '㎡' || unit === '平米' || unit === 'm²' || unit === 'm2') {
        return unitPrice
      }

      if (unit === 'm' || unit === '米') {
        const width = Number(row.width)
        const widthInMeter = Number.isFinite(width) ? width / 1000 : 0
        if (!Number.isFinite(widthInMeter) || widthInMeter <= 0) return NaN
        return unitPrice / widthInMeter
      }

      if (unit === '卷') {
        const width = Number(row.width)
        const length = Number(row.length)
        const sqmPerRoll = (Number.isFinite(width) ? width : 0) * (Number.isFinite(length) ? length : 0) / 1000
        if (!Number.isFinite(sqmPerRoll) || sqmPerRoll <= 0) return NaN
        return unitPrice / sqmPerRoll
      }

      return NaN
    },

    calcUnitPriceFromSqm(row, targetUnit, sqmPrice) {
      if (!Number.isFinite(sqmPrice) || sqmPrice <= 0) return NaN
      if (targetUnit === '㎡' || targetUnit === '平米' || targetUnit === 'm²' || targetUnit === 'm2') {
        return sqmPrice
      }
      if (targetUnit === 'm' || targetUnit === '米') {
        const width = Number(row.width)
        const widthInMeter = Number.isFinite(width) ? width / 1000 : 0
        if (!Number.isFinite(widthInMeter) || widthInMeter <= 0) return NaN
        return sqmPrice * widthInMeter
      }
      if (targetUnit === '卷') {
        const width = Number(row.width)
        const length = Number(row.length)
        const sqmPerRoll = (Number.isFinite(width) ? width : 0) * (Number.isFinite(length) ? length : 0) / 1000
        if (!Number.isFinite(sqmPerRoll) || sqmPerRoll <= 0) return NaN
        return sqmPrice * sqmPerRoll
      }
      return NaN
    },
    onContactChange(contactName) {
      const contact = this.customerContacts.find(c => c.contactName === contactName)
      if (contact) {
        this.fillContactFields(contact)
      }
    },
    async loadCustomerSampleSpecs(customerName) {
      this.customerSampleSpecs = []
      if (!customerName) return
      try {
        const listRes = await getSampleList({ current: 1, size: 300, customerName })
        if (!listRes || (listRes.code !== 200 && listRes.code !== 20000)) return
        const pageData = listRes.data || {}
        const rows = pageData.records || []
        const exactRows = rows.filter(item => item.customerName === customerName)
        if (exactRows.length === 0) return

        const merged = []
        for (const sample of exactRows) {
          const detailRes = await getSampleDetail(sample.sampleNo)
          if (!detailRes || (detailRes.code !== 200 && detailRes.code !== 20000)) continue
          const detail = detailRes.data || {}
          const items = Array.isArray(detail.items) ? detail.items : []
          items.forEach(it => {
            merged.push({
              materialCode: it.materialCode || '',
              materialName: it.materialName || '',
              specification: '',
              model: '',
              length: it.length,
              width: it.width,
              thickness: it.thickness,
              colorCode: it.colorCode || '',
              unit: DEFAULT_QUOTATION_UNIT,
              unitPrice: null,
              sampleNo: detail.sampleNo || sample.sampleNo || '',
              versionNo: null,
              remark: it.remark || ''
            })
          })
        }

        const dedupMap = new Map()
        merged.forEach(item => {
          const key = [item.materialCode, item.colorCode, item.thickness, item.width, item.length].join('|')
          if (!dedupMap.has(key)) {
            dedupMap.set(key, item)
          }
        })
        this.customerSampleSpecs = Array.from(dedupMap.values())
      } catch (error) {
        console.error('查询客户送样规格失败:', error)
      }
    },
    async hydrateRowByMaterialSpec(row, materialCode) {
      const code = normalizeMaterialCode(materialCode || (row && row.materialCode))
      if (!code) return

      let spec = specCacheByCode.get(code)
      if (!spec) {
        spec = (this.specs || []).find(item => normalizeMaterialCode(item && item.materialCode) === code)
        if (spec) {
          cacheSpec(spec)
        }
      }

      if (!spec) {
        try {
          if (!specInflightByCode.has(code)) {
            const promise = Promise.resolve(getSpecByMaterialCode(code))
              .then(res => {
                if (res && (res.code === 200 || res.code === 20000)) {
                  return res.data || null
                }
                return null
              })
              .catch(error => {
                console.error('根据料号获取规格失败:', error)
                return null
              })
              .finally(() => {
                specInflightByCode.delete(code)
              })
            specInflightByCode.set(code, promise)
          }
          spec = await specInflightByCode.get(code)
          if (spec) {
            cacheSpec(spec)
          }
        } catch (error) {
          console.error('根据料号获取规格失败:', error)
        }
      }
      if (!spec) return

      const prevMaterialName = row.materialName
      const prevColorCode = row.colorCode
      const prevUnit = row.unit
      const prevThickness = row.thickness

      const updates = {
        materialCode: code,
        materialName: prevMaterialName || spec.productName || spec.materialName || '',
        colorCode: spec.colorCode || spec.colorName || prevColorCode || '',
        unit: prevUnit || DEFAULT_QUOTATION_UNIT
      }

      if (prevThickness === null || prevThickness === undefined || prevThickness === '') {
        updates.thickness = spec.totalThickness || spec.baseThickness || prevThickness
      }

      Object.assign(row, updates)
    },
    async fillItemsFromMaterialSpec(items = []) {
      const list = Array.isArray(items) ? items : []
      for (const row of list) {
        if (row && row.materialCode) {
          await this.hydrateRowByMaterialSpec(row, row.materialCode)
        } else if (row) {
          row.unit = row.unit || DEFAULT_QUOTATION_UNIT
        }
      }
    },
    calcSqmUnitPrice(row) {
      if (!row) return ''
      const unit = String(row.unit || '').trim()
      const unitPrice = Number(row.unitPrice)
      if (!Number.isFinite(unitPrice) || unitPrice <= 0) return ''

      if (unit === '㎡' || unit === '平米' || unit === 'm²' || unit === 'm2') {
        return unitPrice.toFixed(4)
      }

      if (unit === 'm' || unit === '米') {
        const width = Number(row.width)
        const widthInMeter = Number.isFinite(width) ? width / 1000 : 0
        if (!Number.isFinite(widthInMeter) || widthInMeter <= 0) return ''
        return (unitPrice / widthInMeter).toFixed(4)
      }

      if (unit === '卷') {
        const width = Number(row.width)
        const length = Number(row.length)
        const sqmPerRoll = (Number.isFinite(width) ? width : 0) * (Number.isFinite(length) ? length : 0) / 1000
        if (!Number.isFinite(sqmPerRoll) || sqmPerRoll <= 0) return ''
        return (unitPrice / sqmPerRoll).toFixed(4)
      }

      return ''
    },
    handleSizeChange(val) {
      this.pageSize = val
      this.currentPage = 1
      this.fetchQuotations()
    },
    handleCurrentChange(val) {
      this.currentPage = val
      this.fetchQuotations()
    },
    handleSearch() {
      this.currentPage = 1
      this.fetchQuotations()
    },
    handleReset() {
      this.searchForm.customerKeyword = ''
      this.currentPage = 1
      this.fetchQuotations()
    },
    formatQuotationSpec(row) {
      return `${row && row.thickness !== undefined && row.thickness !== null && row.thickness !== '' ? row.thickness : '-'}*${this.formatWidthOneDecimalText(row && row.width)}*${row && row.length !== undefined && row.length !== null && row.length !== '' ? row.length : '-'}`
    },
    formatPrintNumber(value) {
      const num = Number(value)
      if (!Number.isFinite(num)) return '-'
      return num.toFixed(2)
    },
    getPrintCustomerRecord() {
      const keyList = [
        this.printCurrent && this.printCurrent.customer,
        this.printCurrent && this.printCurrent.customerName,
        this.printCurrent && this.printCurrent.customerCode
      ].map(item => String(item || '').trim()).filter(Boolean)
      if (!keyList.length) return null
      return (this.customers || []).find(customer => {
        const values = [customer.customerName, customer.shortName, customer.customerCode]
          .map(item => String(item || '').trim())
          .filter(Boolean)
        return keyList.some(key => values.includes(key))
      }) || null
    },
    getPrintCustomerName() {
      const customer = this.getPrintCustomerRecord()
      return (customer && customer.customerName) || (this.printCurrent && (this.printCurrent.customerName || this.printCurrent.customer)) || '-'
    },
    getPrintCustomerPhone() {
      const customer = this.getPrintCustomerRecord()
      return (customer && (customer.primaryContactMobile || customer.primaryContactPhone || customer.contactPhone || customer.phone || customer.mobile || customer.companyPhone)) ||
        (this.printCurrent && this.printCurrent.contactPhone) ||
        '________________'
    },
    getPrintCustomerAddress() {
      const customer = this.getPrintCustomerRecord()
      return (customer && (customer.contactAddress || customer.address || customer.customerAddress || customer.companyAddress)) || '________________'
    },
    viewDetail(row) {
      this.currentQuotation = {
        ...JSON.parse(JSON.stringify(row)),
        items: Array.isArray(row.items) ? row.items.map(item => normalizeQuotationUnit(item)) : []
      }
      this.detailVisible = true
    },
    async printQuotation(row) {
      if (!row || !row.id) {
        return this.$message.warning('缺少报价单ID，无法打印')
      }
      try {
        const res = await getQuotationDetail(row.id)
        if (!res || (res.code !== 200 && res.code !== 20000) || !res.data) {
          return this.$message.error(res.msg || '获取报价单详情失败，无法预览打印')
        }
        this.printCurrent = {
          ...res.data,
          items: Array.isArray(res.data.items) ? res.data.items.map(item => normalizeQuotationUnit(item)) : []
        }
        this.printVisible = true
      } catch (error) {
        console.error('获取报价单打印详情失败', error)
        this.$message.error('获取报价单详情失败，无法预览打印')
      }
    },
    handleQuotationPrintBrowser() {
      const area = document.getElementById('quotationPrintArea')
      if (!area) {
        return this.$message.warning('未找到打印内容')
      }
      const printContent = area.innerHTML
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
                padding: 10mm;
                margin: 0;
                background: white;
                color: black;
                font-size: 11px;
                line-height: 1.45;
              }
              .quotation-company-header { border-bottom: 2px solid #222; padding-bottom: 10px; margin-bottom: 14px; }
              .quotation-company-top { display:flex; align-items:center; justify-content:space-between; gap:16px; }
              .quotation-logo-wrap { width: 312px; display:flex; align-items:center; justify-content:flex-start; }
              .quotation-logo { max-width: 280px; max-height: 96px; object-fit: contain; }
              .quotation-company-main { flex: 1; }
              .quotation-company-name { font-size:20px; font-weight:700; text-align:right; margin-bottom:4px; }
              .quotation-company-lines { text-align:right; font-size:11px; line-height:1.5; }
              .quotation-doc-title-wrap { position: relative; margin-bottom: 6px; }
              .quotation-print-title { text-align:center; font-size:18px; font-weight:700; letter-spacing: 6px; margin-bottom:4px; }
              .quotation-doc-no { text-align:right; font-size:11px; }
              .quotation-date-bar { display:flex; justify-content:space-between; margin: 4px 0 10px; padding: 0 20px; font-size:11px; }
              .quotation-party-section { display:grid; grid-template-columns: 1fr 1fr; gap: 36px; margin-bottom: 12px; }
              .quotation-party-block { min-height: 96px; }
              .quotation-party-row { font-size:11px; line-height:1.9; word-break: break-all; }
              .quotation-print-remark { margin: 6px 0 10px; font-size: 11px; }
              .el-table table, table { width:100% !important; border-collapse: collapse; table-layout: fixed; }
              th, td { border:1px solid #000; padding:4px 2px; text-align:center; font-size:10px; }
              th { background:#f0f0f0; font-weight:700; }
              .el-table .cell { padding:0 3px !important; white-space: normal !important; word-break: break-all !important; line-height: 1.25 !important; }
              .quotation-print-note { margin-top:10px; font-size:11px; }
              .quotation-print-signature { margin-top: 26px; padding: 0 20px; display:flex; justify-content:space-between; font-size:11px; }
              @media print {
                @page { size: A4; margin: 8mm 8mm; }
                body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              }
            </style>
          </head>
          <body>${printContent}</body>
        </html>
      `)
      doc.close()

      setTimeout(() => {
        iframe.contentWindow.focus()
        iframe.contentWindow.print()
        setTimeout(() => {
          document.body.removeChild(iframe)
        }, 1000)
      }, 300)
    },
    openCreate() {
      this.isEditing = false
      this.detailMaterialKeyword = ''
      this.detailSortKey = ''
      this.detailSortOrder = ''
      const restored = this.restoreQuotationDraftForCreate()
      if (restored) {
        this.$message.info('已恢复上次暂存的报价草稿')
        return
      }
      this.selectedSampleNo = ''
      this.customerContacts = []
      this.editForm = {
        customerId: null,
        customer: '',
        contactPerson: '',
        contactPhone: '',
        sourceSampleNo: '',
        quotationDate: this.getTodayDateString(),
        pricingUnit: '㎡',
        validUntil: '',
        status: 'draft',
        remark: '',
        items: [createEmptyItem()]
      }
      this.editVisible = true
    },
    saveQuotationDraft() {
      if (this.isEditing) return
      inMemoryQuotationDraft = {
        selectedSampleNo: this.selectedSampleNo || '',
        customerContacts: JSON.parse(JSON.stringify(this.customerContacts || [])),
        form: JSON.parse(JSON.stringify(this.editForm || {})),
        savedAt: Date.now()
      }
      this.$message.success('报价草稿已暂存')
    },
    clearQuotationDraft() {
      inMemoryQuotationDraft = null
    },
    restoreQuotationDraftForCreate() {
      if (!inMemoryQuotationDraft || !inMemoryQuotationDraft.form) return false
      this.selectedSampleNo = inMemoryQuotationDraft.selectedSampleNo || ''
      this.customerContacts = JSON.parse(JSON.stringify(inMemoryQuotationDraft.customerContacts || []))
      this.editForm = JSON.parse(JSON.stringify(inMemoryQuotationDraft.form || {}))
      if (!Array.isArray(this.editForm.items) || this.editForm.items.length === 0) {
        this.editForm.items = [createEmptyItem()]
      }
      this.editVisible = true
      return true
    },
    async openEdit(row) {
      this.isEditing = true
      this.editLoading = true
      this.detailMaterialKeyword = ''
      this.detailSortKey = ''
      this.detailSortOrder = ''
      this.editForm = cloneQuotationForEdit(row)
      this.editForm.customer = this.editForm.customer || ''
      this.editForm.pricingUnit = this.editForm.pricingUnit || '㎡'
      if (!this.editForm.customerId && this.editForm.customer) {
        const matched = this.customers.find(item => item.customerCode === this.editForm.customer)
        if (matched) {
          this.editForm.customerId = matched.id
        }
      }
      this.editForm.items = Array.isArray(this.editForm.items) && this.editForm.items.length > 0
        ? this.editForm.items
        : [createEmptyItem()]
      ;(this.editForm.items || []).forEach(item => {
        this.$set(item, '_editing', false)
      })
      // 预填部分下拉候选，避免打开时立即渲染大量 option
      if (this.editForm.customerId) {
        const cust = (this.customers || []).find(c => c.id === this.editForm.customerId)
        if (cust) {
          this.customerOptions = [cust].concat(this.customerOptions.filter(c => c.id !== cust.id)).slice(0, 80)
        }
      }
      try {
        const codes = new Set((this.editForm.items || []).map(it => normalizeMaterialCode(it && it.materialCode)).filter(Boolean))
        if (codes.size) {
          const pref = []
          for (const code of codes) {
            const s = specCacheByCode.get(code)
            pref.push(s || { materialCode: code, productName: '' })
          }
          this.specOptions = pref.concat((this.specOptions || []).filter(s => !codes.has(normalizeMaterialCode(s && s.materialCode)))).slice(0, 120)
        }
      } catch (e) {
        // ignore
      }
      this.selectedSampleNo = this.editForm.sourceSampleNo || ''
      this.editVisible = true
      await this.$nextTick()

      const tasks = [
        this.fillItemsFromMaterialSpec(this.editForm.items)
          .then(() => {
            (this.editForm.items || []).forEach(item => {
              this.formatWidthOnBlur(item)
              this.formatUnitPriceOnBlur(item)
            })
          })
      ]

      if (this.editForm.customerId) {
        tasks.push(
          this.loadCustomerContacts(this.editForm.customerId, this.editForm.contactPerson)
            .then(() => {
              if (!this.editForm.contactPhone) {
                const customer = this.customers.find(item => item.id === this.editForm.customerId)
                if (customer) {
                  this.editForm.contactPhone = customer.customerPhone || ''
                }
              }
            })
        )
      }

      try {
        await Promise.allSettled(tasks)
      } finally {
        this.editLoading = false
      }
    },
    addItem() {
      this.editForm.items.push(createEmptyItem())
    },
    duplicateItem(indexOrRow) {
      const items = this.editForm.items || []
      const index = typeof indexOrRow === 'number'
        ? indexOrRow
        : items.findIndex(item => item === indexOrRow)
      const source = items[index]
      if (!source) return
      const copied = JSON.parse(JSON.stringify(source))
      delete copied.id
      copied.versionNo = null
      copied.versionHistory = null
      copied._editing = true
      this.formatWidthOnBlur(copied)
      this.formatUnitPriceOnBlur(copied)
      this.editForm.items.push(copied)
    },
    toggleRowEdit(row, editing) {
      if (!row) return
      this.$set(row, '_editing', !!editing)
    },
    duplicateLastItem() {
      const items = this.editForm.items || []
      if (!items.length) {
        this.editForm.items.push(createEmptyItem())
        return
      }
      this.duplicateItem(items.length - 1)
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
    normalizeWidthOneDecimalValue(value) {
      if (value === null || value === undefined || value === '') return null
      const num = Number(value)
      if (!Number.isFinite(num)) return null
      return Number(num.toFixed(1))
    },
    formatWidthOneDecimalText(value) {
      if (value === null || value === undefined || value === '') return '-'
      const num = Number(value)
      if (!Number.isFinite(num)) return '-'
      return num.toFixed(1)
    },
    onWidthInput(row) {
      if (!row) return
      row.width = this.sanitizeOneDecimalInput(row.width)
    },
    formatWidthOnBlur(row) {
      if (!row) return
      const value = this.normalizeWidthOneDecimalValue(row.width)
      row.width = value === null ? '' : value.toFixed(1)
    },
    removeItem(indexOrRow) {
      const index = typeof indexOrRow === 'number'
        ? indexOrRow
        : (this.editForm.items || []).findIndex(item => item === indexOrRow)
      if (index < 0) return
      this.editForm.items.splice(index, 1)
      if (this.editForm.items.length === 0) {
        this.editForm.items.push(createEmptyItem())
      }
    },
    handleQuotationDateChange(val) {
      if (!val) return
    },
    formatUnitPriceOnBlur(row) {
      if (!row) return
      const text = String(row.unitPrice == null ? '' : row.unitPrice).trim()
      if (!text) {
        row.unitPrice = ''
        return
      }
      const num = Number(text)
      if (!Number.isFinite(num)) {
        row.unitPrice = ''
        return
      }
      row.unitPrice = num.toFixed(4)
    },
    async onMaterialCodeChange(row, materialCode) {
      if (!materialCode) return
      await this.hydrateRowByMaterialSpec(row, materialCode)
    },
    async importSelectedSample() {
      if (!this.selectedSampleNo) {
        this.$message.warning('请先选择送样单')
        return
      }
      try {
        const res = await getSampleDetail(this.selectedSampleNo)
        if (!res || (res.code !== 200 && res.code !== 20000)) {
          this.$message.error(res.msg || '获取送样详情失败')
          return
        }
        const sample = res.data || {}
        const mappedItems = Array.isArray(sample.items)
          ? sample.items.map(item => ({
            materialCode: item.materialCode || '',
            materialName: item.materialName || '',
            specification: item.specification || '',
            model: item.model || '',
            length: item.length,
            width: this.normalizeWidthOneDecimalValue(item.width),
            thickness: item.thickness,
            colorCode: item.colorCode || '',
            unit: DEFAULT_QUOTATION_UNIT,
            unitPrice: null,
            sampleNo: sample.sampleNo || '',
            versionNo: null,
            remark: item.remark || ''
          }))
          : []
        if (mappedItems.length === 0) {
          this.$message.warning('该送样单没有可导入的物料明细')
          return
        }
        this.editForm.sourceSampleNo = sample.sampleNo || ''
        this.selectedSampleNo = sample.sampleNo || ''
        const sampleCustomerCode = this.resolveCustomerCode(sample)
        if (!this.editForm.customer) {
          this.editForm.customer = sampleCustomerCode || ''
        }
        const matchedCustomer = this.customers.find(item => item.customerCode === sampleCustomerCode)
        if (matchedCustomer) {
          this.editForm.customerId = matchedCustomer.id
          this.onCustomerChange(matchedCustomer.id)
        } else {
          if (!this.editForm.contactPerson) {
            this.editForm.contactPerson = sample.contactName || ''
          }
          if (!this.editForm.contactPhone) {
            this.editForm.contactPhone = sample.contactPhone || ''
          }
        }
        const onlyEmptyRow = this.editForm.items.length === 1 && !this.editForm.items[0].materialCode && !this.editForm.items[0].materialName
        this.editForm.items = onlyEmptyRow ? mappedItems : this.editForm.items.concat(mappedItems)
        await this.fillItemsFromMaterialSpec(this.editForm.items)
        this.$message.success(`已导入送样单 ${sample.sampleNo} 的 ${mappedItems.length} 条物料`)
      } catch (error) {
        console.error('导入送样物料失败:', error)
        this.$message.error('导入送样物料失败')
      }
    },
    async openVersionHistory(row, customerName) {
      const customer = customerName || this.editForm.customer || (this.currentQuotation && this.currentQuotation.customer)
      if (!customer || !row.materialCode) {
        this.$message.warning('缺少客户或物料信息，无法查询版本记录')
        return
      }
      this.versionLoading = true
      this.versionDialogVisible = true
      this.versionHistory = []
      try {
        const res = await getQuotationVersionHistory({
          customer,
          materialCode: row.materialCode,
          specification: row.specification,
          model: row.model,
          colorCode: row.colorCode,
          length: row.length,
          width: row.width,
          thickness: row.thickness
        })
        if (res && res.code === 200) {
          this.versionHistory = Array.isArray(res.data) ? res.data.map(item => normalizeQuotationUnit(item)) : []
        } else {
          this.$message.error(res.msg || '获取版本记录失败')
        }
      } catch (error) {
        console.error('获取版本记录失败:', error)
        this.$message.error('获取版本记录失败')
      } finally {
        this.versionLoading = false
      }
    },
    getDisplayStatusText(row) {
      if (row.expiryStatus === 'expired') {
        return '已过期'
      }
      if (row.expiryStatus === 'expiring') {
        const days = typeof row.daysToExpire === 'number' ? row.daysToExpire : ''
        return days === '' ? '即将到期' : `即将到期(${days}天)`
      }
      return this.getStatusText(row.status)
    },
    getDisplayStatusType(row) {
      if (row.expiryStatus === 'expired') {
        return 'danger'
      }
      if (row.expiryStatus === 'expiring') {
        return 'warning'
      }
      return this.getStatusType(row.status)
    },
    getRowClassName({ row }) {
      if (row.expiryStatus === 'expired') return 'quotation-row-expired'
      if (row.expiryStatus === 'expiring') return 'quotation-row-expiring'
      return ''
    },
    saveQuotation() {
      if (!this.editForm.customer) {
        this.$message.warning('请填写客户名称')
        return
      }
      const validItems = this.editForm.items.filter(item => item.materialCode)
      if (validItems.length === 0) {
        this.$message.warning('请至少添加一条报价明细')
        return
      }
      const normalizedItems = validItems.map(item => {
        const normalizedWidth = this.normalizeWidthOneDecimalValue(item.width)
        return {
          ...item,
          width: normalizedWidth,
          unitPrice: item.unitPrice
        }
      })
      // determine if any item lacks price -> mark as PENDING
      const needsPricing = normalizedItems.some(it => it.unitPrice === null || it.unitPrice === '' || it.unitPrice === undefined)
      const payload = {
        ...this.editForm,
        sourceSampleNo: this.editForm.sourceSampleNo || this.selectedSampleNo || '',
        items: normalizedItems.map(it => ({
          ...it,
          appliedRuleId: it.appliedRuleId || null,
          matchPath: it.matchPath || null
        })),
        priceStatus: needsPricing ? 'PENDING' : 'PRICED',
        needsPricing: needsPricing
      }
      const apiCall = this.isEditing ? updateQuotation(payload) : createQuotation(payload)
      apiCall.then(res => {
        if (res && res.code === 200) {
          this.$message.success(this.isEditing ? '更新成功' : '创建成功')
          if (!this.isEditing) {
            this.clearQuotationDraft()
          }
          this.editVisible = false
          this.fetchQuotations()
        } else {
          this.$message.error(res.msg || '操作失败')
        }
      }).catch(error => {
        console.error('保存报价单失败', error)
        this.$message.error('保存失败')
      })
    },
    confirmDelete(row) {
      this.$confirm('确定删除该报价单吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        deleteQuotation(row.id).then(res => {
          if (res && res.code === 200) {
            this.$message.success('删除成功')
            this.fetchQuotations()
          } else {
            this.$message.error('删除失败')
          }
        })
      }).catch(() => {
        this.$message.info('已取消删除')
      })
    },
    getStatusType(status) {
      const typeMap = {
        draft: 'info',
        submitted: 'warning',
        accepted: 'success',
        rejected: 'danger',
        expired: 'danger'
      }
      return typeMap[status] || 'info'
    },
    getStatusText(status) {
      const textMap = {
        draft: '草稿',
        submitted: '已提交',
        accepted: '已接受',
        rejected: '已拒绝',
        expired: '已过期'
      }
      return textMap[status] || status
    },
    handleDownloadTemplate() {
      import('@/vendor/Export2Excel').then(excel => {
        const header = [
          '报价单号(可选)', '客户名称(必填)', '联系人', '联系电话', '报价日期(yyyy-MM-dd)', '有效期至(yyyy-MM-dd)',
          '报价单位(㎡/m/卷)', '状态(草稿/已提交/已接受/已拒绝/已过期)', '报价备注', '物料代码', '物料名称', '长度(mm)', '宽度(mm)', '厚度(μm)', '单位', '单价', '明细备注'
        ]
        const data = [
          ['QT-260304-001', '示例客户A', '张三', '13800138000', '2026-03-04', '2026-09-04', '㎡', '草稿', '主单备注', 'FT-001-38', '示例物料1', 1000, 38, 100, '㎡', 12.5, '第一条明细'],
          ['QT-260304-001', '示例客户A', '张三', '13800138000', '2026-03-04', '2026-09-04', 'm', '草稿', '主单备注', 'FT-002-50', '示例物料2', 800, 50, 120, 'm', 15.8, '按米报价示例']
        ]
        excel.export_json_to_excel({ header, data, filename: '报价单导入模板', bookType: 'xlsx' })
      })
    },
    handleImport() {
      this.$refs.fileInput.click()
    },
    async onFileChange(e) {
      const file = e.target.files[0]
      if (!file) return
      const formData = new FormData()
      formData.append('file', file)
      try {
        const res = await importQuotation(formData)
        if (res && res.code === 200) {
          const data = res.data || {}
          if (data.mode === 'history-order') {
            this.$message.success(`历史导入完成：报价单${data.successCount || 0}条，明细${data.itemCount || 0}条，重复跳过${data.duplicateSkipCount || 0}条，失败${data.failCount || 0}条`)
          } else {
            this.$message.success(`导入成功：${data.successCount || 0}条，失败：${data.failCount || 0}条`)
          }
          this.fetchQuotations()
        } else {
          this.$message.error(res.msg || '导入失败')
        }
      } catch (error) {
        console.error('导入失败:', error)
        this.$message.error('导入失败')
      } finally {
        this.$refs.fileInput.value = ''
      }
    },
    handleExport() {
      import('@/vendor/Export2Excel').then(excel => {
        const header = [
          '报价单号', '客户名称', '联系人', '联系电话', '来源送样单', '报价日期', '有效期至', '报价单位', '状态', '报价备注',
          '物料代码', '物料名称', '颜色', '规格(厚度*宽度*长度m)', '单位', '单价', '版本号', '明细备注'
        ]
        const data = []
        this.quotations.forEach(item => {
          const rows = Array.isArray(item.items) && item.items.length > 0 ? item.items : [createEmptyItem()]
          rows.forEach(detail => {
            data.push([
              item.quotationNo,
              item.customer,
              item.contactPerson,
              item.contactPhone,
              item.sourceSampleNo,
              item.quotationDate,
              item.validUntil,
              item.pricingUnit,
              this.getDisplayStatusText(item),
              item.remark,
              detail.materialCode,
              detail.materialName,
              detail.colorCode,
              `${detail.thickness || '-'}*${detail.width || '-'}*${detail.length || '-'}`,
              detail.unit,
              detail.unitPrice,
              detail.versionNo,
              detail.remark
            ])
          })
        })
        excel.export_json_to_excel({
          header,
          data,
          filename: `报价单数据_${new Date().toLocaleDateString().replace(/\//g, '-')}`,
          bookType: 'xlsx'
        })
      })
    }
  }
}
</script>

<style scoped>
.quotations {
  padding: 20px;
}

.reminder-alert {
  margin-bottom: 16px;
}

.pagination-wrapper {
  margin-top: 20px;
  text-align: center;
}

.sample-import-actions {
  display: flex;
  gap: 8px;
}

.sample-import-actions .el-input {
  flex: 1;
}

.quotation-op-btns {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  flex-wrap: wrap;
}

.quotation-op-btns /deep/ .el-button {
  padding: 4px 7px;
  margin-left: 0 !important;
}

.quotation-edit-native-wrapper {
  width: 100%;
  overflow-x: auto;
  border: 1px solid #ebeef5;
}

.detail-table-toolbar {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  margin-bottom: 8px;
  padding: 8px 10px;
  background: #f8fafc;
  border: 1px solid #ebeef5;
  border-bottom: 0;
  border-radius: 6px 6px 0 0;
}

.quotation-edit-native-table {
  width: 100%;
  min-width: 1000px;
  border-collapse: collapse;
  table-layout: fixed;
}

.quotation-edit-native-table th,
.quotation-edit-native-table td {
  border: 1px solid #ebeef5;
  padding: 6px;
  vertical-align: middle;
}

.quotation-edit-native-table th {
  background: #f5f7fa;
  color: #606266;
  font-weight: 600;
  text-align: left;
  line-height: 1.25;
}

.quotation-edit-native-table th.sortable-th {
  cursor: pointer;
  user-select: none;
}

.quotation-edit-native-table .sort-indicator {
  color: #909399;
  font-size: 12px;
  margin-left: 4px;
}

.quotation-edit-native-table th.th-spec,
.quotation-edit-native-table th.th-sqm-price {
  text-align: center;
}

.quotation-edit-native-table th.th-spec span,
.quotation-edit-native-table th.th-sqm-price span {
  display: block;
  text-align: center;
  line-height: 1.25;
}

.quotation-edit-native-table /deep/ .el-input__inner,
.quotation-edit-native-table /deep/ .el-select .el-input__inner {
  height: 30px;
  line-height: 30px;
  padding-left: 6px;
  padding-right: 6px;
}

.quotation-edit-native-table /deep/ .sqm-price-input .el-input__inner {
  text-align: center;
}

.quotation-edit-native-table td.td-unit-price,
.quotation-edit-native-table td.td-sqm-price {
  text-align: center;
  vertical-align: middle;
}

.native-spec-inputs {
  display: flex;
  align-items: center;
  gap: 4px;
}

.native-version-cell {
  text-align: center;
}

.native-op-cell {
  white-space: nowrap;
}

.version-label {
  color: #606266;
  margin-right: 0;
}

.quotation-print-content {
  padding: 4px;
}

.quotation-company-header {
  border-bottom: 2px solid #222;
  padding-bottom: 10px;
  margin-bottom: 14px;
}

.quotation-company-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.quotation-logo-wrap {
  width: 312px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
}

.quotation-logo {
  max-width: 280px;
  max-height: 96px;
  object-fit: contain;
}

.quotation-company-main {
  flex: 1;
}

.quotation-company-name {
  font-size: 20px;
  font-weight: 700;
  text-align: right;
  margin-bottom: 4px;
}

.quotation-company-lines {
  text-align: right;
  font-size: 12px;
  line-height: 1.5;
}

.quotation-print-title {
  text-align: center;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 6px;
  margin-bottom: 4px;
}

.quotation-doc-title-wrap {
  position: relative;
  margin-bottom: 6px;
}

.quotation-doc-no {
  text-align: right;
  font-size: 12px;
}

.quotation-date-bar {
  display: flex;
  justify-content: space-between;
  margin: 4px 0 10px;
  padding: 0 20px;
  font-size: 12px;
}

.quotation-party-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 36px;
  margin-bottom: 12px;
}

.quotation-party-block {
  min-height: 96px;
}

.quotation-party-row {
  font-size: 12px;
  line-height: 1.9;
  word-break: break-all;
}

.quotation-print-meta span,
.quotation-print-remark,
.quotation-print-note {
  display: block;
}

.quotation-print-remark {
  margin: 6px 0 10px;
  font-size: 12px;
}

.quotation-print-signature {
  margin-top: 26px;
  padding: 0 20px;
  display: flex;
  justify-content: space-between;
  font-size: 12px;
}

.quotation-print-table /deep/ .el-table__header-wrapper,
.quotation-print-table /deep/ .el-table__body-wrapper {
  overflow: hidden;
}

.quotation-print-table /deep/ th.el-table__cell .cell,
.quotation-print-table /deep/ td.el-table__cell .cell {
  padding: 0 3px;
  white-space: normal;
  line-height: 1.25;
}

/deep/ .quotation-row-expired {
  background: #fff1f0;
}

/deep/ .quotation-row-expiring {
  background: #fff7e6;
}
</style>
