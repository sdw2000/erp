<template>
  <div class="sales-samples">
    <el-card>      <div slot="header" class="clearfix">
                     <span>送样管理</span>        <div style="float:right">
                       <el-button v-if="$canImportExport()" type="success" icon="el-icon-download" size="small" @click="handleDownloadTemplate">下载模板</el-button>
                       <el-button v-if="$canImportExport()" type="warning" icon="el-icon-upload2" size="small" @click="handleImport">导入</el-button>
                       <el-button v-if="$canImportExport()" type="info" icon="el-icon-download" size="small" @click="handleExport">导出</el-button>
                       <el-button type="primary" icon="el-icon-plus" size="small" @click="openCreate">新建送样</el-button>
                       <input ref="fileInput" type="file" accept=".xlsx,.xls" style="display:none" @change="onFileChange">
                     </div>
                   </div>

      <!-- 搜索栏 -->
      <el-form :inline="true" :model="queryParams" class="search-form">
        <el-form-item label="客户名称">
          <el-input
            v-model="queryParams.customerName"
            placeholder="客户名称"
            style="width: 160px"
            clearable
            @clear="fetchSamples"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-select
            v-model="queryParams.status"
            placeholder="全部状态"
            style="width: 120px"
            clearable
            @clear="fetchSamples"
          >
            <el-option label="待发货" value="待发货" />
            <el-option label="已发货" value="已发货" />
            <el-option label="运输中" value="运输中" />
            <el-option label="已送达" value="已送达" />
            <el-option label="已签收" value="已签收" />
            <el-option label="已拒收" value="已拒收" />
            <el-option label="已取消" value="已取消" />
          </el-select>
        </el-form-item>
        <el-form-item label="快递单号">
          <el-input
            v-model="queryParams.trackingNumber"
            placeholder="快递单号"
            style="width: 160px"
            clearable
            @clear="fetchSamples"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="el-icon-search" @click="fetchSamples">搜 索</el-button>
          <el-button icon="el-icon-refresh-left" @click="resetQuery">重 置</el-button>
        </el-form-item>
      </el-form>

      <el-table ref="samplesTable" v-loading="loading" :data="samples" class="sample-list-table" style="width:100%; margin-top: 15px" stripe>
        <el-table-column type="index" label="序号" width="60" align="center" />
        <el-table-column label="送样编号" width="126">
          <template slot-scope="scope">{{ formatSampleNo(scope.row.sampleNo) }}</template>
        </el-table-column>
        <el-table-column label="客户名称" width="97" show-overflow-tooltip>
          <template slot-scope="scope">{{ getCustomerDisplayName(scope.row) }}</template>
        </el-table-column>
        <el-table-column prop="contactName" label="联系人" width="90" show-overflow-tooltip />
        <el-table-column prop="trackingNumber" label="快递单号" width="154" show-overflow-tooltip>
          <template slot-scope="scope">
            <el-link v-if="scope.row.trackingNumber" type="primary" @click="viewLogistics(scope.row)">
              {{ scope.row.trackingNumber }}
            </el-link>
            <span v-else style="color: #ccc;">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="90">
          <template slot-scope="scope">
            <el-tag :type="getStatusType(scope.row.status)" size="small">
              {{ scope.row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="送样日期" width="89">
          <template slot-scope="scope">{{ formatShortDate(scope.row.sendDate) }}</template>
        </el-table-column>
        <el-table-column label="送达日期" width="89">
          <template slot-scope="scope">{{ formatShortDate(scope.row.deliveryDate) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="184" align="center">
          <template slot-scope="scope">
            <div class="sample-op-btns">
              <el-button size="mini" type="text" class="op-action-btn" @click="viewDetail(scope.row)">详情</el-button>
              <el-button size="mini" type="text" class="op-action-btn" @click="openEdit(scope.row)">编辑</el-button>
              <el-button size="mini" type="text" class="op-action-btn" @click="handleSamplePrint(scope.row)">打印</el-button>
              <el-button size="mini" type="text" class="op-action-btn" @click="openLogistics(scope.row)">物流</el-button>
              <el-button size="mini" type="text" class="op-action-btn" style="color:#f56c6c" @click="confirmDelete(scope.row)">删除</el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper" style="text-align: right;">
        <el-pagination
          :current-page="pagination.current"
          :page-size="pagination.size"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>    <!-- 详情对话框 -->
    <el-dialog title="送样详情" :visible.sync="detailVisible" width="1200px">
      <div v-if="currentSample && currentSample.sampleNo">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="送样编号">{{ formatSampleNo(currentSample.sampleNo) }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusType(currentSample.status)">{{ currentSample.status }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="客户名称">{{ getCustomerDisplayName(currentSample) }}</el-descriptions-item>
          <el-descriptions-item label="送样日期">{{ currentSample.sendDate || '-' }}</el-descriptions-item>
          <el-descriptions-item label="联系人">{{ currentSample.contactName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="收货地址" :span="2">{{ currentSample.contactAddress || '-' }}</el-descriptions-item>
          <el-descriptions-item label="快递公司">{{ currentSample.expressCompany || '-' }}</el-descriptions-item>
          <el-descriptions-item label="快递单号">
            <el-link v-if="currentSample.trackingNumber" type="primary" @click="viewLogistics(currentSample)">
              {{ currentSample.trackingNumber }}
            </el-link>
            <span v-else>-</span>
          </el-descriptions-item>
          <el-descriptions-item label="发货日期">{{ currentSample.shipDate || '-' }}</el-descriptions-item>
          <el-descriptions-item label="送达日期">{{ currentSample.deliveryDate || '-' }}</el-descriptions-item>
          <el-descriptions-item label="备注" :span="2">{{ currentSample.remark || '-' }}</el-descriptions-item>
        </el-descriptions>        <h4 style="margin-top: 20px;">样品明细</h4>
        <el-table :data="currentSample.items" border style="width:100%">
          <el-table-column type="index" label="序号" width="60" align="center" />
          <el-table-column prop="materialCode" label="物料代码" width="281" />
          <el-table-column prop="materialName" label="物料名称" width="180" />
          <el-table-column width="192" align="center" header-align="center">
            <template slot="header">
              <span class="sample-spec-header">规格</span>
              <span class="sample-spec-header">（厚度μm*宽度mm*长度m）</span>
            </template>
            <template slot-scope="scope">{{ getSpecText(scope.row) }}</template>
          </el-table-column>
          <el-table-column prop="quantity" label="数量" width="80" />
          <el-table-column prop="unit" label="单位" width="60" />
          <el-table-column prop="remark" label="备注" />
        </el-table>
      </div>
      <span slot="footer">
        <el-button @click="detailVisible = false">关闭</el-button>
      </span>
    </el-dialog>

    <!-- 编辑/新增对话框 -->
    <el-dialog :title="isEditing ? '编辑送样' : '新建送样'" :visible.sync="editVisible" width="1200px">
      <el-form ref="editForm" :model="editForm" label-width="100px" :rules="rules">
        <!-- 基本信息 -->
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="客户" prop="customerName">
              <el-select
                v-model="editForm.customerId"
                filterable
                placeholder="选择客户"
                style="width: 100%"
                @change="onCustomerChange"
              >
                <el-option
                  v-for="customer in customers"
                  :key="customer.id"
                  :label="customer.name"
                  :value="customer.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="送样编号">
              <el-input v-model="editForm.sampleNo" :disabled="true" placeholder="自动生成" />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 联系人信息 -->
        <el-row :gutter="12">
          <el-col :span="8">
            <el-form-item label="联系人" prop="contactName">
              <el-select
                v-model="editForm.contactName"
                filterable
                clearable
                placeholder="请选择联系人"
                style="width: 100%"
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
            <el-form-item label="联系电话" prop="contactPhone">
              <el-input v-model="editForm.contactPhone" placeholder="从客户联系人自动带出" :readonly="true" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="送样日期" prop="sendDate">
              <el-date-picker
                v-model="editForm.sendDate"
                type="date"
                placeholder="选择日期"
                value-format="yyyy-MM-dd"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="12">
          <el-col :span="24">
            <el-form-item label="收货地址" prop="contactAddress">
              <el-input v-model="editForm.contactAddress" placeholder="请输入收货地址" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="备注">
              <el-input v-model="editForm.remark" type="textarea" :rows="2" placeholder="备注信息" />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 样品明细 -->
        <div style="border-top: 1px solid #eee; margin-top: 20px; padding-top: 20px;">
          <div style="margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
            <h4 style="margin: 0;">样品明细</h4>
            <el-button type="primary" size="small" @click="addItem">新增明细</el-button>
          </div>          <el-table :data="editForm.items" border style="width:100%">
            <el-table-column type="index" label="序号" width="60" align="center" />            <el-table-column label="物料代码" width="281">
              <template slot-scope="scope">
                <el-select
                  v-model="scope.row.materialCode"
                  filterable
                  allow-create
                  size="small"
                  placeholder="选择或输入"
                  style="width: 100%"
                  aria-label="物料代码"
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
              </template>
            </el-table-column>
            <el-table-column label="物料名称" width="180">
              <template slot-scope="scope">
                <el-input v-model="scope.row.materialName" size="small" placeholder="物料名称" aria-label="物料名称" />
              </template>
            </el-table-column>
            <el-table-column width="208" align="center" header-align="center">
              <template slot="header">
                <span class="sample-spec-header">规格</span>
                <span class="sample-spec-header">（厚度μm*宽度mm*长度m）</span>
              </template>
              <template slot-scope="scope">
                <div class="sample-spec-inputs">
                  <el-input v-model.number="scope.row.thickness" size="small" type="number" placeholder="厚度" aria-label="厚度" />
                  <span>*</span>
                  <el-input v-model.number="scope.row.width" size="small" type="number" placeholder="宽度" aria-label="宽度" />
                  <span>*</span>
                  <el-input v-model.number="scope.row.length" size="small" type="number" placeholder="长度" aria-label="长度" />
                </div>
              </template>
            </el-table-column>
            <el-table-column label="数量" width="80">
              <template slot-scope="scope">
                <el-input-number v-model="scope.row.quantity" size="small" :min="1" :controls="false" style="width: 100%" aria-label="数量" />
              </template>
            </el-table-column>
            <el-table-column label="单位" width="80">
              <template slot-scope="scope">
                <el-select v-model="scope.row.unit" size="small" style="width: 100%" aria-label="单位">
                  <el-option label="卷" value="卷" />
                  <el-option label="个" value="个" />
                  <el-option label="片" value="片" />
                  <el-option label="米" value="米" />
                  <el-option label="kg" value="kg" />
                </el-select>
              </template>
            </el-table-column>
            <el-table-column label="备注" min-width="150">
              <template slot-scope="scope">
                <el-input v-model="scope.row.remark" size="small" placeholder="备注" aria-label="备注" />
              </template>
            </el-table-column>
            <el-table-column label="操作" width="60" fixed="right">
              <template slot-scope="scope">
                <el-button type="danger" size="mini" icon="el-icon-delete" circle @click="deleteItem(scope.$index)" />
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-form>

      <span slot="footer">
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" @click="saveSample">保存</el-button>
      </span>
    </el-dialog>

    <!-- 送样打印预览 -->
    <el-dialog title="送样单打印预览" :visible.sync="printVisible" width="980px" top="5vh">
      <div v-if="currentPrintSample" id="samplePrintArea" class="sample-print-content">
        <div class="sample-company-header">
          <div class="sample-company-left">
            <img v-if="samplePrintLogoUrl" :src="samplePrintLogoUrl" alt="logo" class="sample-company-logo">
            <div class="sample-company-name">{{ samplePrintCompanyInfo.companyName }}</div>
          </div>
          <div class="sample-company-right">
            <div>地址：{{ samplePrintCompanyInfo.address }}</div>
            <div>电话：{{ samplePrintCompanyInfo.phone }}　传真：{{ samplePrintCompanyInfo.fax }}</div>
            <div>{{ samplePrintCompanyInfo.website }}</div>
          </div>
        </div>

        <h2 class="sample-print-title">样品申请单</h2>
        <div class="sample-form-top">
          <div class="sample-customer-code-line">客户代码：{{ getCustomerCodeDisplay(currentPrintSample) }}</div>
          <div class="sample-apply-meta">
            <div>申请单号：{{ formatSampleNo(currentPrintSample.sampleNo) }}</div>
            <div>申请人：{{ getSampleApplicantName(currentPrintSample) }}</div>
            <div>申请日期：{{ formatSlashDate(currentPrintSample.sendDate) }}</div>
          </div>
        </div>

        <table class="sample-print-form">
          <thead>
            <tr>
              <th rowspan="2" style="width: 150px;">工厂代码</th>
              <th rowspan="2" style="width: 150px;">产品名称</th>
              <th rowspan="2" style="width: 64px;">厚度</th>
              <th colspan="2">产品尺寸</th>
              <th rowspan="2" style="width: 92px;">管芯(mm)</th>
              <th rowspan="2" style="width: 70px;">胶水</th>
              <th rowspan="2" style="width: 70px;">数量</th>
              <th rowspan="2" style="width: 90px;">寄送日期</th>
              <th rowspan="2" style="width: 140px;">备注</th>
            </tr>
            <tr>
              <th style="width: 84px;">宽度</th>
              <th style="width: 84px;">长度</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, index) in (currentPrintSample.items || [])" :key="index">
              <td>{{ item.materialCode || '' }}</td>
              <td>{{ item.materialName || '' }}</td>
              <td style="text-align: center;">{{ formatPrintNumber(item.thickness) }}</td>
              <td style="text-align: center;">{{ formatPrintNumber(item.width) }}</td>
              <td style="text-align: center;">{{ formatPrintNumber(item.length) }}</td>
              <td style="text-align: center;">{{ item.coreSize || '' }}</td>
              <td style="text-align: center;">{{ item.glueType || '' }}</td>
              <td style="text-align: center;">{{ item.quantity ? `${item.quantity}${item.unit || ''}` : '' }}</td>
              <td style="text-align: center;">{{ formatSlashDate(currentPrintSample.sendDate) }}</td>
              <td>{{ item.remark || '' }}</td>
            </tr>
            <tr v-if="!(currentPrintSample.items && currentPrintSample.items.length)">
              <td colspan="10" style="text-align:center;color:#999;">暂无明细</td>
            </tr>
          </tbody>
        </table>
        <div class="sample-print-sign-row">
          <div class="sample-sign-maker">制单：{{ getSampleMakerName(currentPrintSample) }}</div>
          <div class="sample-sign-auditor">审核：</div>
        </div>
      </div>
      <span slot="footer">
        <el-button @click="printVisible = false">关闭</el-button>
        <el-button type="primary" icon="el-icon-printer" @click="handleSamplePrintBrowser">打印单据 / 导出PDF</el-button>
      </span>
    </el-dialog>

    <!-- 物流信息维护对话框 -->
    <el-dialog title="维护物流信息" :visible.sync="logisticsVisible" width="600px" custom-class="sample-logistics-dialog">
      <el-form ref="logisticsFormRef" :model="logisticsForm" :rules="logisticsRules" label-width="100px">
        <el-form-item label="快递公司">
          <el-select v-model="logisticsForm.expressCompany" filterable allow-create placeholder="选择或输入快递公司" style="width: 100%">
            <el-option label="顺丰速运" value="顺丰速运" />
            <el-option label="圆通速递" value="圆通速递" />
            <el-option label="中通快递" value="中通快递" />
            <el-option label="申通快递" value="申通快递" />
            <el-option label="韵达快递" value="韵达快递" />
            <el-option label="邮政EMS" value="邮政EMS" />
            <el-option label="京东物流" value="京东物流" />
            <el-option label="德邦快递" value="德邦快递" />
          </el-select>
        </el-form-item>
        <el-form-item label="快递单号" prop="trackingNumber">
          <el-input v-model="logisticsForm.trackingNumber" placeholder="输入快递单号">
            <el-button slot="append" icon="el-icon-search" @click="queryLogisticsNow">查询</el-button>
          </el-input>
        </el-form-item>
        <el-form-item label="送样日期">
          <el-input v-model="logisticsForm.sendDate" readonly placeholder="自动同步送样日期" />
        </el-form-item>
        <el-form-item label="送达日期">
          <el-date-picker
            v-model="logisticsForm.deliveryDate"
            type="date"
            placeholder="选择送达日期"
            value-format="yyyy-MM-dd"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      <span slot="footer">
        <el-button @click="logisticsVisible = false">取消</el-button>
        <el-button type="primary" @click="saveLogistics">保存</el-button>
      </span>
    </el-dialog>

    <!-- 物流追踪对话框 -->
    <el-dialog title="物流追踪" :visible.sync="trackingVisible" width="700px">
      <div v-if="logisticsInfo">
        <el-descriptions :column="2" border style="margin-bottom: 20px;">
          <el-descriptions-item label="快递公司">{{ logisticsInfo.expressCompany }}</el-descriptions-item>
          <el-descriptions-item label="快递单号">{{ logisticsInfo.trackingNumber }}</el-descriptions-item>
          <el-descriptions-item label="当前状态">
            <el-tag :type="getStatusType(logisticsInfo.status)">{{ logisticsInfo.status }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="最后更新">{{ logisticsInfo.lastUpdate }}</el-descriptions-item>
        </el-descriptions>

        <el-timeline>
          <el-timeline-item
            v-for="(trace, index) in logisticsInfo.traces"
            :key="index"
            :timestamp="trace.time"
            placement="top"
          >
            {{ trace.context }}
          </el-timeline-item>
        </el-timeline>
      </div>
      <div v-else style="text-align: center; padding: 40px; color: #999;">
        <i class="el-icon-warning" style="font-size: 48px;" />
        <p>暂无物流信息</p>
      </div>
      <span slot="footer">
        <el-button type="primary" @click="refreshLogistics">刷新</el-button>
        <el-button @click="trackingVisible = false">关闭</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import {
  getSampleList,
  getSampleDetail,
  generateSampleNo,
  addSample,
  updateSample,
  deleteSample as deleteSampleApi,
  updateSampleLogistics,
  getSampleLogistics,
  importSample
} from '@/api/sample'
import { getCustomerList, getContactsByCustomerId } from '@/api/customer'
import { getAllEnabledSpecs, getSpecByMaterialCode } from '@/api/tapeSpec'
import elTableAutoLayout from '@/mixins/elTableAutoLayout'

export default {
  name: 'SalesSamples',
  mixins: [elTableAutoLayout],
  tableLayoutRefs: ['samplesTable'],
  data() {
    return {
      loading: false,
      samples: [],
      customers: [],
      customerContacts: [],
      specs: [],
      queryParams: {
        customerName: '',
        status: '',
        trackingNumber: ''
      },
      pagination: {
        current: 1,
        size: 10,
        total: 0
      },
      editVisible: false,
      detailVisible: false,
      logisticsVisible: false,
      trackingVisible: false,
      printVisible: false,
      isEditing: false,
      currentSample: null,
      currentPrintSample: null,
      samplePrintLogoUrl: '/logo/finechem-logo.png',
      samplePrintCompanyInfo: {
        companyName: '东莞市方恩电子材料科技有限公司',
        address: '东莞市桥头镇东新路13号',
        phone: '0769-82551118',
        fax: '0769-82551160',
        website: 'www.finechemfr.com'
      },
      logisticsInfo: null,
      editForm: {},
      logisticsForm: {
        sampleNo: '',
        expressCompany: '',
        trackingNumber: '',
        sendDate: '',
        shipDate: '',
        deliveryDate: ''
      },
      logisticsRules: {
        trackingNumber: [{ required: true, message: '请输入快递单号', trigger: 'blur' }]
      },
      rules: {
        customerName: [{ required: true, message: '请选择客户', trigger: 'change' }],
        contactName: [{ required: true, message: '请选择联系人', trigger: 'change' }],
        contactPhone: [{ required: true, message: '请输入联系电话', trigger: 'blur' }],
        contactAddress: [{ required: true, message: '请输入收货地址', trigger: 'blur' }],
        sendDate: [{ required: true, message: '请选择送样日期', trigger: 'change' }]
      }
    }
  },
  created() {
    this.editForm = this.emptyForm()
    this.fetchSamples()
    this.fetchCustomers()
    this.fetchSpecs()
  },
  methods: {
    // 获取当前日期，格式 yyyy-MM-dd
    getCurrentDate() {
      const now = new Date()
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const day = String(now.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    },
    makeEmptyItem() {
      return {
        materialCode: '',
        materialName: '',
        thickness: null,
        width: null,
        length: null,
        quantity: 1,
        unit: '卷',
        remark: ''
      }
    },
    toNullableNumber(value) {
      if (value === null || value === undefined || value === '') return null
      const n = Number(value)
      return Number.isFinite(n) ? n : null
    },
    normalizeSampleItem(raw = {}) {
      return {
        materialCode: raw.materialCode || '',
        materialName: raw.materialName || '',
        thickness: this.toNullableNumber(raw.thickness),
        width: this.toNullableNumber(raw.width),
        length: this.toNullableNumber(raw.length),
        quantity: Number(raw.quantity || 0) > 0 ? Number(raw.quantity) : 1,
        unit: raw.unit || '卷',
        remark: raw.remark || '',
        // 旧字段统一清空，避免继续沿用历史逻辑
        model: null,
        specification: null,
        batchNo: null
      }
    }, emptyForm() {
      return {
        sampleNo: '',
        customerId: null,
        customerName: '',
        contactName: '',
        contactPhone: '',
        contactAddress: '',
        sendDate: this.getCurrentDate(),
        remark: '',
        items: [this.makeEmptyItem()]
      }
    },
    getSpecText(item = {}) {
      const thickness = item.thickness === null || item.thickness === undefined || item.thickness === '' ? '-' : item.thickness
      const width = item.width === null || item.width === undefined || item.width === '' ? '-' : item.width
      const length = item.length === null || item.length === undefined || item.length === '' ? '-' : item.length
      return `${thickness}*${width}*${length}`
    },
    formatSampleNo(sampleNo) {
      const raw = String(sampleNo || '').trim()
      if (!raw) return '-'

      const normalized = raw.toUpperCase()
      let match = normalized.match(/^SP-?(\d{6})-(\d{3})$/)
      if (match) {
        return `SP${match[1]}-${match[2]}`
      }

      match = normalized.match(/^SP(\d{8})(\d{3})$/)
      if (match) {
        return `SP${match[1].slice(2)}-${match[2]}`
      }

      match = normalized.match(/^SP-?(\d{8})-(\d{3})$/)
      if (match) {
        return `SP${match[1].slice(2)}-${match[2]}`
      }

      match = normalized.match(/^SP(\d{6})(\d{3})$/)
      if (match) {
        return `SP${match[1]}-${match[2]}`
      }

      return raw
    },
    getCustomerDisplayName(row = {}) {
      const rowShort = String(row.customerShortName || row.shortName || '').trim()
      if (rowShort) return rowShort

      const rowCustomerId = row.customerId
      if (rowCustomerId) {
        const byId = this.customers.find(c => c.id === rowCustomerId)
        if (byId) {
          return byId.shortName || byId.name || row.customerName || '-'
        }
      }

      const rowName = String(row.customerName || '').trim()
      if (rowName) {
        const byName = this.customers.find(c => c.name === rowName || c.customerName === rowName)
        if (byName) {
          return byName.shortName || byName.name || rowName
        }
      }

      return rowName || '-'
    },
    getCustomerCodeDisplay(row = {}) {
      const directCode = String(row.customerCode || '').trim()
      if (directCode) return directCode

      const rowCustomerId = row.customerId
      if (rowCustomerId) {
        const byId = this.customers.find(c => c.id === rowCustomerId)
        if (byId && byId.customerCode) return byId.customerCode
      }

      const rowName = String(row.customerName || '').trim()
      if (rowName) {
        const byName = this.customers.find(c => c.name === rowName || c.customerName === rowName)
        if (byName && byName.customerCode) return byName.customerCode
      }

      return '-'
    },
    getSampleApplicantName(row = {}) {
      // 申请人=客户销售负责人（后端从数据库回填 applicantName）
      const direct = String(row.applicantName || row.salesUserName || '').trim()
      if (direct) return direct

      const rowCustomerId = row.customerId
      if (rowCustomerId) {
        const byId = this.customers.find(c => c.id === rowCustomerId)
        if (byId && byId.salesUserName) return byId.salesUserName
      }

      return '-'
    },
    getSampleMakerName(row = {}) {
      // 制单=当前登录账号创建该单据时的账号（后端写入 createBy）
      const direct = String(row.createByName || row.createBy || '').trim()
      if (direct) return direct
      return '-'
    },
    formatSlashDate(dateValue) {
      if (!dateValue) return '-'
      const str = String(dateValue)
      const m = str.match(/^(\d{4})-(\d{2})-(\d{2})$/)
      if (!m) return str
      const month = String(Number(m[2]))
      const day = String(Number(m[3]))
      return `${month}/${day}`
    },
    formatShortDate(dateValue) {
      if (!dateValue) return '-'
      const str = String(dateValue).trim()
      const m = str.match(/^(\d{4})-(\d{2})-(\d{2})$/)
      if (!m) return str
      return `${m[1].slice(2)}-${m[2]}-${m[3]}`
    },
    formatPrintNumber(value) {
      if (value === null || value === undefined || value === '') return ''
      const n = Number(value)
      if (!Number.isFinite(n)) return String(value)
      return Number.isInteger(n) ? String(n) : String(n)
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
        this.editForm.contactName = ''
        this.editForm.contactPhone = ''
        return
      }
      this.editForm.contactName = contact.contactName || ''
      this.editForm.contactPhone = contact.contactPhone || ''
    },
    async loadCustomerContacts(customerId, preferredContactName) {
      this.customerContacts = []
      if (!customerId) {
        return
      }
      try {
        const res = await getContactsByCustomerId(customerId)
        if (res && (res.code === 20000 || res.code === 200)) {
          const contacts = Array.isArray(res.data) ? res.data : []
          this.customerContacts = contacts.map(item => this.normalizeContact(item)).filter(item => item.contactName)
        }
      } catch (e) {
        console.error('获取客户联系人失败:', e)
      }

      if (!this.customerContacts.length) {
        return
      }

      if (preferredContactName) {
        const matched = this.customerContacts.find(c => c.contactName === preferredContactName)
        if (matched) {
          this.fillContactFields(matched)
          return
        }
      }

      const primary = this.pickPrimaryContact(this.customerContacts)
      this.fillContactFields(primary)
    },
    async fetchSamples() {
      this.loading = true
      try {
        const params = {
          current: this.pagination.current,
          size: this.pagination.size,
          ...this.queryParams
        }
        console.log('📤 发送请求参数:', params)
        const res = await getSampleList(params)
        console.log('📥 收到响应:', res)

        // 同时支持 code: 200 和 code: 20000
        if (res && (res.code === 20000 || res.code === 200)) {
          // 确保数据结构正确
          const data = res.data || {}
          console.log('✅ 解析后的data:', data) // 支持两种数据格式：分页格式和数组格式
          if (data.records) {
            this.samples = data.records
            this.pagination.total = parseInt(data.total) || 0
          } else if (Array.isArray(data)) {
            this.samples = data
            this.pagination.total = data.length
          } else {
            this.samples = []
            this.pagination.total = 0
          }

          console.log('🎯 最终赋值 this.samples:', this.samples)
          console.log('🎯 最终赋值 this.pagination.total:', this.pagination.total)
        } else {
          console.warn('❌ 响应码不是20000/200:', res)
          this.$message.error(res?.msg || res?.message || '获取数据失败')
          this.samples = []
          this.pagination.total = 0
        }
      } catch (e) {
        console.error('❌ 获取数据失败:', e)
        this.$message.error('获取数据失败: ' + (e.message || '网络错误'))
        this.samples = []
        this.pagination.total = 0
      } finally {
        this.loading = false
        this.scheduleTableLayout()
      }
    },
    async fetchCustomers() {
      try {
        // 获取客户列表
        const res = await getCustomerList({})
        if (res && (res.code === 20000 || res.code === 200)) {
          // 处理分页数据或直接数组
          const data = res.data
          if (data && data.records) {
            this.customers = data.records.map(c => ({
              id: c.id,
              name: c.customerName,
              customerName: c.customerName,
              shortName: c.shortName || c.customerShortName || '',
              customerCode: c.customerCode || '',
              salesUserName: c.salesUserName || '',
              contact: c.primaryContactName,
              phone: this.resolveCustomerPhone(c),
              address: c.contactAddress
            }))
          } else if (Array.isArray(data)) {
            this.customers = data.map(c => ({
              id: c.id,
              name: c.customerName,
              customerName: c.customerName,
              shortName: c.shortName || c.customerShortName || '',
              customerCode: c.customerCode || '',
              salesUserName: c.salesUserName || '',
              contact: c.primaryContactName,
              phone: this.resolveCustomerPhone(c),
              address: c.contactAddress
            }))
          }
        }
      } catch (e) {
        console.error('获取客户列表失败:', e)
      }
    },
    resolveCustomerPhone(customer) {
      if (!customer) return ''
      const direct = customer.primaryContactMobile || customer.primaryContactPhone || customer.contactPhone || customer.phone || customer.mobile || customer.companyPhone || ''
      if (direct) return direct
      const contacts = Array.isArray(customer.contacts) ? customer.contacts : []
      if (!contacts.length) return ''
      const primary = contacts.find(c => Number(c.isPrimary) === 1)
      const p = primary || contacts[0]
      return p.mobile || p.phone || p.contactPhone || ''
    },
    async fetchSpecs() {
      try {
        const res = await getAllEnabledSpecs()
        if (res && (res.code === 20000 || res.code === 200)) {
          this.specs = res.data || []
        }
      } catch (e) {
        console.error('获取料号列表失败:', e)
      }
    },
    resetQuery() {
      this.queryParams = {
        customerName: '',
        status: '',
        trackingNumber: ''
      }
      this.pagination.current = 1
      this.fetchSamples()
    },
    handleSizeChange(size) {
      this.pagination.size = size
      this.fetchSamples()
    },
    handleCurrentChange(current) {
      this.pagination.current = current
      this.fetchSamples()
    }, async openCreate() {
      this.isEditing = false
      this.editForm = this.emptyForm()
      this.customerContacts = []

      // 生成送样编号
      try {
        const res = await generateSampleNo()
        if (res && res.code === 20000) {
          this.editForm.sampleNo = res.data
        }
      } catch (e) {
        console.error(e)
      }

      this.editVisible = true
    }, async openEdit(row) {
      this.isEditing = true
      this.customerContacts = []

      // 获取详情
      try {
        const res = await getSampleDetail(row.sampleNo)
        if (res && res.code === 20000) {
          this.editForm = {
            ...res.data,
            items: (res.data.items || []).map(item => this.normalizeSampleItem(item))
          }
          await this.loadCustomerContacts(this.editForm.customerId, this.editForm.contactName)
        }
      } catch (e) {
        console.error(e)
        this.$message.error('获取详情失败')
        return
      }

      this.editVisible = true
    },
    async viewDetail(row) {
      try {
        const res = await getSampleDetail(row.sampleNo)
        if (res && res.code === 20000) {
          this.currentSample = res.data
          this.detailVisible = true
        }
      } catch (e) {
        console.error(e)
        this.$message.error('获取详情失败')
      }
    },
    async handleSamplePrint(row) {
      try {
        const res = await getSampleDetail(row.sampleNo)
        if (!res || (res.code !== 20000 && res.code !== 200)) {
          this.$message.error(res?.message || '获取送样详情失败')
          return
        }

        this.currentPrintSample = res.data || {}
        this.printVisible = true
      } catch (e) {
        console.error(e)
        this.$message.error('打印失败')
      }
    },
    handleSamplePrintBrowser() {
      const printEl = document.getElementById('samplePrintArea')
      if (!printEl) {
        this.$message.error('未找到打印内容')
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
            <title>送样单打印</title>
            <style>
              * { box-sizing: border-box; }
              body { font-family: "Microsoft YaHei", Arial, sans-serif; margin: 0; padding: 16px; color: #222; }
              .sample-print-content { width: 100%; }
              .sample-company-header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 2px; margin-bottom: 4px; }
              .sample-company-left { display: flex; align-items: center; gap: 10px; }
              .sample-company-logo { width: 112px; height: auto; }
              .sample-company-name { font-size: 25px; font-weight: 600; line-height: 1.15; letter-spacing: 1px; }
              .sample-company-right { min-width: 310px; text-align: right; font-size: 12px; line-height: 1.8; color: #555; padding-top: 3px; }
              .sample-print-title { text-align: center; font-size: 19px; margin: 6px 0 8px; letter-spacing: 2px; }
              .sample-form-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px; }
              .sample-customer-code-line { font-size: 13px; margin-bottom: 0; font-weight: 500; }
              .sample-apply-meta { text-align: right; font-size: 12px; line-height: 1.7; color: #333; }
              .sample-print-form { width: 100%; border-collapse: collapse; }
              .sample-print-form th, .sample-print-form td { border: 1px solid #333; padding: 5px 6px; font-size: 12px; }
              .sample-print-form th { text-align: center; font-weight: 600; }
              .sample-print-sign-row { margin-top: 10px; display: flex; justify-content: space-between; font-size: 12px; }
              .sample-sign-maker { margin-left: 30px; }
              .sample-sign-auditor { margin-right: 80px; }
              @media print { body { padding: 8px; } }
            </style>
          </head>
          <body>
            <div class="sample-print-content">${printContent}</div>
          </body>
        </html>
      `)
      doc.close()

      iframe.onload = () => {
        iframe.contentWindow.focus()
        iframe.contentWindow.print()
        setTimeout(() => {
          document.body.removeChild(iframe)
        }, 1000)
      }
    }, async onCustomerChange(customerId) {
      const customer = this.customers.find(c => c.id === customerId)
      if (customer) {
        this.editForm.customerName = customer.name
        this.editForm.contactName = ''
        this.editForm.contactPhone = ''
        if (customer.address) {
          this.editForm.contactAddress = customer.address
        }
      }
      await this.loadCustomerContacts(customerId)
      if (!this.customerContacts.length && customer && customer.contact) {
        this.editForm.contactName = customer.contact
      }
      if (!this.editForm.contactPhone && customer && customer.phone) {
        this.editForm.contactPhone = customer.phone
      }
    },
    onContactChange(contactName) {
      const contact = this.customerContacts.find(c => c.contactName === contactName)
      if (contact) {
        this.fillContactFields(contact)
      }
    },
    // 物料代码变化时自动带出产品信息（统一规格逻辑）
    async onMaterialCodeChange(item, materialCode) {
      const code = materialCode || item.materialCode
      if (!code) {
        item.materialName = ''
        item.thickness = null
        item.width = null
        item.length = null
        return
      }
      try {
        let spec = this.specs.find(s => s.materialCode === code)
        if (!spec) {
          const res = await getSpecByMaterialCode(code)
          if (res && (res.code === 20000 || res.code === 200)) {
            spec = res.data
          }
        }
        if (spec) {
          this.$set(item, 'materialName', spec.productName || spec.materialName || item.materialName)
          this.$set(item, 'thickness', this.toNullableNumber(spec.totalThickness || spec.baseThickness || item.thickness))
          this.$set(item, 'width', this.toNullableNumber(spec.width || item.width))
          this.$set(item, 'length', this.toNullableNumber(spec.length || item.length))
        }
      } catch (e) {
        console.error('获取物料信息失败:', e)
      }
    }, addItem() {
      this.editForm.items.push(this.makeEmptyItem())
    },
    deleteItem(index) {
      this.editForm.items.splice(index, 1)
    }, saveSample() {
      this.$refs.editForm.validate(async(valid) => {
        if (!valid) return

        if (!this.editForm.items || this.editForm.items.length === 0) {
          this.$message.warning('请至少添加一条样品明细')
          return
        }

        try {
          const payload = {
            ...this.editForm,
            items: (this.editForm.items || []).map(item => this.normalizeSampleItem(item))
          }
          const res = this.isEditing
            ? await updateSample(payload)
            : await addSample(payload)

          if (res && res.code === 20000) {
            this.$message.success(this.isEditing ? '更新成功' : '创建成功')
            this.editVisible = false
            this.fetchSamples()
          } else {
            this.$message.error(res.message || '保存失败')
          }
        } catch (e) {
          console.error(e)
          this.$message.error('保存失败')
        }
      })
    },
    confirmDelete(row) {
      this.$confirm(`确认删除送样 ${row.sampleNo} 吗？`, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => this.deleteSample(row)).catch(() => {})
    }, async deleteSample(row) {
      try {
        const sampleNo = row && row.sampleNo
        if (!sampleNo) {
          this.$message.error('删除失败：送样编号为空')
          return
        }

        const res = await deleteSampleApi(sampleNo)
        if (res && (res.code === 20000 || res.code === 200)) {
          this.$message.success('删除成功')
          this.fetchSamples()
        } else {
          this.$message.error((res && (res.message || res.msg)) || '删除失败')
        }
      } catch (e) {
        console.error(e)
        const errMsg = (e && e.response && e.response.data && (e.response.data.message || e.response.data.msg)) || e.message || '删除失败'
        this.$message.error(errMsg)
      }
    },
    openLogistics(row) {
      this.logisticsForm = {
        sampleNo: row.sampleNo,
        expressCompany: row.expressCompany || '',
        trackingNumber: row.trackingNumber || '',
        sendDate: row.sendDate || '',
        shipDate: row.sendDate || row.shipDate || '',
        deliveryDate: row.deliveryDate || ''
      }
      this.logisticsVisible = true
      this.$nextTick(() => {
        if (this.$refs.logisticsFormRef) {
          this.$refs.logisticsFormRef.clearValidate()
        }
      })
    }, async saveLogistics() {
      if (!this.$refs.logisticsFormRef) return
      this.$refs.logisticsFormRef.validate(async(valid) => {
        if (!valid) return
      try {
        const payload = {
          ...this.logisticsForm,
          // 发货日期默认使用送样日期
          shipDate: this.logisticsForm.sendDate || this.logisticsForm.shipDate || ''
        }
        const res = await updateSampleLogistics(
          this.logisticsForm.sampleNo,
          payload
        )
        if (res && (res.code === 20000 || res.code === 200)) {
          this.$message.success('物流信息更新成功')
          this.logisticsVisible = false
          this.fetchSamples()
        } else {
          this.$message.error(res.message || '更新失败')
        }
      } catch (e) {
        console.error(e)
        this.$message.error('更新失败')
      }
      })
    },
    async viewLogistics(row) {
      try {
        const res = await getSampleLogistics(row.sampleNo)
        if (res && res.code === 20000) {
          this.logisticsInfo = {
            expressCompany: row.expressCompany,
            trackingNumber: row.trackingNumber,
            ...res.data
          }
          this.trackingVisible = true
        } else {
          this.$message.error(res.message || '查询失败')
        }
      } catch (e) {
        console.error(e)
        this.$message.error('查询失败')
      }
    },
    async queryLogisticsNow() {
      if (!this.logisticsForm.trackingNumber) {
        this.$message.warning('请输入快递单号')
        return
      }

      if (!this.logisticsForm.expressCompany) {
        this.$message.warning('请选择快递公司')
        return
      }

      this.$message.info('正在查询物流信息...')

      try {
        // 先保存物流信息，确保后端查询时能拿到最新快递单号/快递公司
        const savePayload = {
          ...this.logisticsForm,
          shipDate: this.logisticsForm.sendDate || this.logisticsForm.shipDate || ''
        }
        const saveRes = await updateSampleLogistics(this.logisticsForm.sampleNo, savePayload)
        if (!saveRes || (saveRes.code !== 20000 && saveRes.code !== 200)) {
          this.$message.error(saveRes?.message || '保存物流信息失败，无法查询')
          return
        }

        const res = await getSampleLogistics(this.logisticsForm.sampleNo, {
          trackingNumber: this.logisticsForm.trackingNumber,
          expressCompany: this.logisticsForm.expressCompany
        })
        if (res && res.code === 20000) {
          this.logisticsInfo = {
            expressCompany: this.logisticsForm.expressCompany,
            trackingNumber: this.logisticsForm.trackingNumber,
            ...(res.data || {})
          }
          this.trackingVisible = true

          const hasTrace = res.data && Array.isArray(res.data.traces) && res.data.traces.length > 0
          if (hasTrace) {
            this.$message.success('查询成功')
          } else {
            this.$message.warning(res.msg || res.message || '查询无结果，请隔段时间再查')
          }
          if (res.data && (res.data.status === '已送达' || res.data.status === '已签收')) {
            this.logisticsForm.deliveryDate = this.logisticsForm.deliveryDate || this.extractDateFromDateTime(res.data.lastUpdate)
          }
          this.fetchSamples()
        } else {
          this.$message.error(res?.message || '查询失败')
        }
      } catch (e) {
        console.error(e)
        this.$message.error('查询失败')
      }
    },
    extractDateFromDateTime(val) {
      if (!val) return ''
      const s = String(val).trim()
      if (!s) return ''
      const m1 = s.match(/^(\d{4}-\d{2}-\d{2})[ T]\d{2}:\d{2}:\d{2}/)
      if (m1) return m1[1]
      const m2 = s.match(/^(\d{4}-\d{2}-\d{2})$/)
      if (m2) return m2[1]
      return s
    },
    refreshLogistics() {
      if (this.currentSample) {
        this.viewLogistics(this.currentSample)
      }
    }, getStatusType(status) {
      const statusMap = {
        '待发货': 'info',
        '已发货': 'primary',
        '运输中': 'warning',
        '已送达': 'success',
        '已签收': 'success',
        '已拒收': 'danger',
        '已取消': 'info'
      }
      return statusMap[status] || 'info'
    },
    // 下载导入模板
    handleDownloadTemplate() {
      import('@/vendor/Export2Excel').then(excel => {
        const header = ['送样编号', '客户名称', '联系人', '联系电话', '收货地址', '送样日期', '快递公司', '快递单号', '状态', '备注']
        const data = [['SMP-20260109-001', '示例客户', '张三', '13800138000', '广东省深圳市', '2026-01-09', '顺丰速运', 'SF1234567890', '待发货', '']]
        excel.export_json_to_excel({
          header,
          data,
          filename: '送样导入模板',
          bookType: 'xlsx'
        })
      })
    },
    // 导入
    handleImport() {
      this.$refs.fileInput.click()
    },
    async onFileChange(e) {
      const file = e.target.files[0]
      if (!file) return

      const formData = new FormData()
      formData.append('file', file)

      try {
        const res = await importSample(formData)
        if (res && (res.code === 200 || res.code === 20000)) {
          this.$message.success(`导入成功：${res.data.successCount || 0}条，失败：${res.data.failCount || 0}条`)
          this.fetchSamples()
        } else {
          this.$message.error(res.message || '导入失败')
        }
      } catch (e) {
        console.error('导入失败:', e)
        this.$message.error('导入失败')
      } finally {
        this.$refs.fileInput.value = ''
      }
    },
    // 导出
    handleExport() {
      import('@/vendor/Export2Excel').then(excel => {
        const header = ['送样编号', '客户名称', '联系人', '联系电话', '收货地址', '送样日期', '快递公司', '快递单号', '状态', '备注']
        const data = this.samples.map(item => [
          item.sampleNo,
          item.customerName,
          item.contactName,
          item.contactPhone,
          item.contactAddress,
          item.sendDate,
          item.expressCompany,
          item.trackingNumber,
          item.status,
          item.remark
        ])
        excel.export_json_to_excel({
          header,
          data,
          filename: `送样数据_${new Date().toLocaleDateString().replace(/\//g, '-')}`,
          bookType: 'xlsx'
        })
      })
    }
  }
}
</script>

<style scoped>
.sales-samples {
  padding: 20px;
  overflow-x: hidden;
}

.sample-list-table /deep/ .el-table__body-wrapper {
  overflow-x: hidden !important;
}

.sample-op-btns {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0;
  line-height: 1;
}

.sample-op-btns .op-action-btn {
  margin: 0 1px;
  padding: 1px 0;
  min-height: 16px;
  font-size: 12px;
}

.sample-op-btns .op-action-btn:last-child {
  margin-right: 1px;
}
.filter-container {
  display: flex;
  align-items: center;
}

.pagination-wrapper {
  margin-top: 32px;
}

.sample-spec-inputs {
  display: flex;
  align-items: center;
  gap: 2px;
}

.sample-spec-inputs .el-input {
  flex: 1;
}

.sample-spec-inputs /deep/ .el-input__inner {
  padding-left: 4px;
  padding-right: 4px;
}

.sample-spec-header {
  display: block;
  text-align: center;
  line-height: 1.2;
}

.sample-print-content {
  color: #222;
}

.sample-company-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding-bottom: 2px;
  margin-bottom: 4px;
}

.sample-company-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.sample-company-logo {
  width: 112px;
  height: auto;
}

.sample-company-name {
  font-size: 25px;
  font-weight: 600;
  line-height: 1.15;
  letter-spacing: 1px;
}

.sample-company-right {
  min-width: 310px;
  text-align: right;
  font-size: 12px;
  line-height: 1.8;
  color: #555;
  padding-top: 3px;
}

.sample-print-title {
  text-align: center;
  font-size: 19px;
  margin: 6px 0 8px;
  letter-spacing: 2px;
}

.sample-form-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 6px;
}

.sample-customer-code-line {
  font-size: 13px;
  margin-bottom: 0;
  font-weight: 500;
}

.sample-apply-meta {
  text-align: right;
  font-size: 12px;
  line-height: 1.7;
  color: #333;
}

.sample-print-form {
  width: 100%;
  border-collapse: collapse;
}

.sample-print-form th,
.sample-print-form td {
  border: 1px solid #333;
  padding: 5px 6px;
  font-size: 12px;
}

.sample-print-form th {
  text-align: center;
  font-weight: 600;
}

.sample-print-sign-row {
  margin-top: 10px;
  display: flex;
  justify-content: space-between;
  font-size: 12px;
}

.sample-sign-maker {
  margin-left: 30px;
}

.sample-sign-auditor {
  margin-right: 80px;
}

.sample-logistics-dialog /deep/ .el-form-item {
  margin-bottom: 33px; /* 提升约50% */
}

.sample-logistics-dialog /deep/ .el-form-item__label,
.sample-logistics-dialog /deep/ .el-input__inner {
  line-height: 54px; /* 原36px，提升50% */
  height: 54px;
}

.sample-logistics-dialog /deep/ .el-form-item__error {
  line-height: 1.8;
}
</style>
