<template>
  <div class="print-config-page app-container">
    <el-alert
      title="这里统一管理标签类打印：前端网关地址、本机 BarTender 配置、标签模板映射、标签业务规则与测试打印。A4/B5 订单单据仍保持原打印方式不变。"
      type="info"
      :closable="false"
      style="margin-bottom: 16px;"
    />

    <el-alert
      v-if="sceneContext.active"
      :title="sceneAlertTitle"
      type="success"
      :closable="false"
      style="margin-bottom: 16px;"
    >
      <div>
        <span>业务类型：{{ sceneContext.bizType || '-' }}；默认模板：{{ sceneContext.defaultTemplate || '-' }}；客户：{{ sceneContext.customerCode || '-' }}</span>
        <el-button v-if="sceneContext.returnTo" size="mini" style="margin-left: 12px;" @click="goBackToSource">返回来源页</el-button>
      </div>
    </el-alert>

    <el-card shadow="never" style="margin-bottom: 16px;">
      <div slot="header" class="card-header">
        <span>客户端一键部署（标签打印网关）</span>
        <div>
          <el-button size="mini" @click="downloadClientDeploy('README-客户端一键部署.txt')">下载说明</el-button>
          <el-button size="mini" @click="downloadClientDeploy('config.latest.generic.json')">下载最新通用配置</el-button>
          <el-button size="mini" @click="downloadClientDeploy('bootstrap-install.ps1')">下载引导脚本(PS1)</el-button>
          <el-button size="mini" @click="downloadClientDeploy('client-oneclick-setup.ps1')">下载一键部署(PS1)</el-button>
          <el-button size="mini" type="primary" @click="copyBootstrapCommand">复制在线安装命令(单行)</el-button>
        </div>
      </div>
      <el-alert
        title="最终一键配置（已验证）：使用“复制在线安装命令(单行)”在管理员 PowerShell 执行。安装会自动清残留重建 + 注册登录自启动 + 启用守护。若出现 manifest 401 会自动跳过模板同步，不影响网关启动与打印。"
        type="warning"
        :closable="false"
      />
    </el-card>

    <el-card shadow="never" style="margin-bottom: 16px;">
      <div slot="header" class="card-header">
        <span>状态看板（本机网关）</span>
        <div>
          <el-button size="mini" :loading="syncTemplateLoading" @click="syncTemplatesFromServer">服务端同步模板</el-button>
          <el-button size="mini" :loading="dashboardLoading" @click="loadGatewayDashboard">刷新状态</el-button>
        </div>
      </div>
      <el-row :gutter="12" style="margin-bottom: 12px;">
        <el-col :span="6">
          <div class="dashboard-metric-card">
            <div class="dashboard-metric-title">网关状态</div>
            <div class="dashboard-metric-value">
              <el-tag :type="dashboardOnline ? 'success' : 'danger'" size="small">{{ dashboardOnline ? '在线' : '离线' }}</el-tag>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="dashboard-metric-card">
            <div class="dashboard-metric-title">运行时长</div>
            <div class="dashboard-metric-value">{{ formatUptime(dashboardUptimeSeconds) }}</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="dashboard-metric-card">
            <div class="dashboard-metric-title">模板同步</div>
            <div class="dashboard-metric-value">{{ dashboardSyncedCount }}/{{ dashboardTemplateCount }}</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="dashboard-metric-card">
            <div class="dashboard-metric-title">打印机数量</div>
            <div class="dashboard-metric-value">{{ dashboardPrinterCount }}</div>
          </div>
        </el-col>
      </el-row>
      <el-input
        v-model="dashboardText"
        type="textarea"
        :rows="10"
        readonly
        placeholder="点击“刷新状态”读取本机网关状态看板"
      />
    </el-card>

    <el-row :gutter="16">
      <el-col :span="12">
        <el-card shadow="never">
          <div slot="header" class="card-header">
            <span>前端网关配置</span>
            <div>
              <el-button size="mini" @click="loadLocalConfig">重新加载</el-button>
              <el-button size="mini" type="primary" @click="saveLocalConfigAction">保存前端配置</el-button>
            </div>
          </div>

          <el-form :model="localConfig" label-width="120px" size="small">
            <el-form-item label="启用打印">
              <el-switch v-model="localConfig.enabled" />
            </el-form-item>
            <el-form-item label="网关地址">
              <el-input v-model="localConfig.endpoint" placeholder="http://127.0.0.1:9123/print" />
            </el-form-item>
            <el-form-item label="API Key">
              <el-input v-model="localConfig.apiKey" placeholder="如未启用可留空" />
            </el-form-item>
            <el-form-item label="超时毫秒">
              <el-input-number v-model="localConfig.timeoutMs" :min="1000" :step="1000" style="width: 100%;" />
            </el-form-item>
            <el-form-item label="允许网页回退">
              <el-switch v-model="localConfig.allowBrowserFallback" />
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>

      <el-col :span="12">
        <el-card shadow="never">
          <div slot="header" class="card-header">
            <span>本机 BarTender 配置</span>
            <div>
              <el-button size="mini" :loading="gatewayLoading" @click="loadGatewayConfig">读取本机配置</el-button>
              <el-button size="mini" :loading="printerLoading" @click="loadPrinters">刷新打印机</el-button>
              <el-button size="mini" type="primary" :loading="gatewaySaving" @click="saveGatewayConfigAction">保存到本机</el-button>
            </div>
          </div>

          <el-form :model="gatewayConfig" label-width="130px" size="small">
            <el-form-item label="监听地址">
              <el-input v-model="gatewayConfig.listenPrefix" placeholder="http://127.0.0.1:9123/" />
            </el-form-item>
            <el-form-item label="BarTender 路径">
              <el-input v-model="gatewayConfig.barTenderExe" placeholder="C:\Program Files (x86)\Seagull\BarTender Suite\bartend.exe" />
            </el-form-item>
            <el-form-item label="默认超时(秒)">
              <el-input-number v-model="gatewayConfig.defaultTimeoutSeconds" :min="5" :step="5" style="width: 100%;" />
            </el-form-item>
            <el-form-item label="已发现打印机">
              <el-select v-model="printerPreview" placeholder="仅用于查看本机打印机" filterable clearable style="width: 100%;">
                <el-option
                  v-for="item in printers"
                  :key="item.Name || item.name"
                  :label="item.Name || item.name"
                  :value="item.Name || item.name"
                />
              </el-select>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" style="margin-top: 16px;">
      <el-col :span="24">
        <el-card shadow="never">
          <div slot="header" class="card-header">
            <span>模板映射</span>
            <div>
              <el-button size="mini" @click="addTemplateRow">新增模板</el-button>
            </div>
          </div>

          <el-table :data="gatewayTemplates" border stripe size="small">
            <el-table-column label="模板键" min-width="160">
              <template slot-scope="scope">
                <el-input v-model="scope.row.templateKey" placeholder="如 coating_label" />
              </template>
            </el-table-column>
            <el-table-column label="模板文件路径" min-width="360">
              <template slot-scope="scope">
                <el-input v-model="scope.row.formatPath" placeholder="D:\\xxx\\template.btw" />
              </template>
            </el-table-column>
            <el-table-column label="打印机" min-width="220">
              <template slot-scope="scope">
                <el-select v-model="scope.row.printer" filterable allow-create default-first-option placeholder="选择或输入打印机" style="width: 100%;">
                  <el-option
                    v-for="item in printers"
                    :key="`${scope.$index}_${item.Name || item.name}`"
                    :label="item.Name || item.name"
                    :value="item.Name || item.name"
                  />
                </el-select>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100" fixed="right">
              <template slot-scope="scope">
                <el-button type="text" size="small" @click="removeTemplateRow(scope.$index)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" style="margin-top: 16px;">
      <el-col :span="12">
        <el-card shadow="never">
          <div slot="header" class="card-header">
            <span>全局标签模板规则</span>
            <el-button size="mini" :loading="ruleLoading" @click="addBizRuleRow">新增规则</el-button>
          </div>
          <el-table :data="bizRuleRows" border stripe size="small">
            <el-table-column label="业务类型" min-width="180">
              <template slot-scope="scope">
                <el-input v-model="scope.row.bizType" placeholder="如 COATING_ROLL_LABEL" />
              </template>
            </el-table-column>
            <el-table-column label="模板键" min-width="180">
              <template slot-scope="scope">
                <el-input v-model="scope.row.templateKey" placeholder="如 coating_label" />
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100">
              <template slot-scope="scope">
                <el-button type="text" size="small" @click="removeBizRuleRow(scope.$index)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>

      <el-col :span="12">
        <el-card shadow="never">
          <div slot="header" class="card-header">
            <span>客户默认标签模板</span>
            <el-button size="mini" :loading="ruleLoading" @click="addCustomerDefaultRow">新增规则</el-button>
          </div>
          <el-table :data="customerDefaultRows" border stripe size="small">
            <el-table-column label="客户编码" min-width="160">
              <template slot-scope="scope">
                <el-input v-model="scope.row.customerCode" placeholder="如 CUST001" />
              </template>
            </el-table-column>
            <el-table-column label="默认模板键" min-width="180">
              <template slot-scope="scope">
                <el-input v-model="scope.row.defaultTemplate" placeholder="如 coating_label" />
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100">
              <template slot-scope="scope">
                <el-button type="text" size="small" @click="removeCustomerDefaultRow(scope.$index)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" style="margin-top: 16px;">
      <el-col :span="24">
        <el-card shadow="never">
          <div slot="header" class="card-header">
            <span>客户 + 业务专用标签模板</span>
            <div>
              <input
                ref="ruleImportInput"
                type="file"
                accept=".json,.csv"
                style="display: none;"
                @change="handleRuleImportChange"
              >
              <el-button size="mini" :loading="ruleLoading" @click="addCustomerBizRuleRow">新增规则</el-button>
              <el-button size="mini" :loading="ruleLoading" @click="downloadRuleImportTemplate">下载导入模板</el-button>
              <el-button size="mini" :loading="ruleLoading" @click="downloadCsvImportTemplate">下载CSV模板</el-button>
              <el-button size="mini" :loading="ruleLoading" @click="triggerRuleImport">导入规则(JSON/CSV)</el-button>
              <el-button size="mini" :loading="ruleLoading" @click="exportRuleConfigAction">导出JSON</el-button>
              <el-button size="mini" :loading="ruleLoading" @click="exportRuleCsvAction">导出CSV</el-button>
              <el-checkbox v-model="autoSaveAfterImport" style="margin: 0 8px;">导入后自动保存</el-checkbox>
              <el-button size="mini" type="primary" :loading="ruleSaving" @click="saveRuleConfigAction">保存规则到数据库</el-button>
            </div>
          </div>
          <el-table :data="customerBizRuleRows" border stripe size="small">
            <el-table-column label="客户编码" min-width="160">
              <template slot-scope="scope">
                <el-input v-model="scope.row.customerCode" placeholder="如 CUST001" />
              </template>
            </el-table-column>
            <el-table-column label="业务类型" min-width="180">
              <template slot-scope="scope">
                <el-input v-model="scope.row.bizType" placeholder="如 COATING_INBOUND" />
              </template>
            </el-table-column>
            <el-table-column label="模板键" min-width="180">
              <template slot-scope="scope">
                <el-input v-model="scope.row.templateKey" placeholder="如 coating_inbound" />
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100">
              <template slot-scope="scope">
                <el-button type="text" size="small" @click="removeCustomerBizRuleRow(scope.$index)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" style="margin-top: 16px; margin-bottom: 24px;">
      <el-col :span="24">
        <el-card shadow="never">
          <div slot="header" class="card-header">
            <span>测试打印</span>
            <div>
              <el-button size="mini" :loading="lastPrintLoading" @click="loadLastPrintRequest">查看最近请求</el-button>
              <el-button size="mini" :loading="previewLoading" @click="handleTemplatePreview">模板预览</el-button>
              <el-button size="mini" type="primary" :loading="testPrinting" @click="handleTestPrint">发送测试打印</el-button>
            </div>
          </div>

          <el-form :model="testForm" label-width="120px" size="small">
            <el-row :gutter="16">
              <el-col :span="8">
                <el-form-item label="模板键">
                  <el-select v-model="testForm.template" filterable allow-create default-first-option placeholder="选择模板键" style="width: 100%;" @change="handleTestTemplateChange">
                    <el-option v-for="item in gatewayTemplates" :key="item.templateKey" :label="item.templateKey" :value="item.templateKey" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="份数">
                  <el-input-number v-model="testForm.copies" :min="1" :step="1" style="width: 100%;" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="任务名称">
                  <el-input v-model="testForm.jobName" placeholder="可留空自动生成" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-form-item label="测试数据(JSON)">
              <el-input v-model="testForm.dataText" type="textarea" :rows="8" />
            </el-form-item>
          </el-form>

          <el-divider content-position="left">最近一次打印请求（字段名与传值）</el-divider>
          <el-input
            v-model="lastPrintText"
            type="textarea"
            :rows="12"
            readonly
            placeholder="点击“查看最近请求”后，这里会显示完整的 payload JSON（含字段名和值）"
          />
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" style="margin-bottom: 24px;">
      <el-col :span="24">
        <el-card shadow="never">
          <div slot="header" class="card-header">
            <span>模板预览示例数据</span>
            <div>
              <el-button size="mini" @click="resetTemplatePreviewConfig">恢复默认示例</el-button>
              <el-button size="mini" type="primary" @click="saveTemplatePreviewConfig">保存示例配置</el-button>
            </div>
          </div>

          <el-alert
            title="这里保存的是模板预览/测试打印使用的示例数据，按模板键维护即可。预览时会优先使用这里的配置。"
            type="info"
            :closable="false"
            style="margin-bottom: 12px;"
          />

          <el-input
            v-model="previewDataText"
            type="textarea"
            :rows="14"
            placeholder='例如：{ "COATING_ROLL_LABEL": { "materialCode": "..." } }'
          />
        </el-card>
      </el-col>
    </el-row>

    <el-dialog :visible.sync="previewDialogVisible" :title="previewDialogTitle" width="80%" top="4vh">
      <div v-if="previewPages.length" style="max-height: 70vh; overflow: auto;">
        <div v-for="page in previewPages" :key="page.fileName" style="margin-bottom: 24px;">
          <div style="margin-bottom: 8px; color: #606266;">第 {{ page.pageNumber }} 页：{{ page.fileName }}</div>
          <el-image
            :src="page.dataUrl"
            fit="contain"
            style="width: 100%; min-height: 320px; border: 1px solid #ebeef5; background: #fafafa;"
            :preview-src-list="previewPages.map(item => item.dataUrl)"
          />
        </div>
      </div>
      <div v-else style="color: #909399; text-align: center; padding: 24px 0;">暂无预览图片</div>
      <span slot="footer" class="dialog-footer">
        <el-button @click="previewDialogVisible = false">关闭</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import {
  batchSaveLabelPrintConfigs,
  getLabelPrintConfigList,
  getTemplatePreviewSamples,
  saveTemplatePreviewSamples
} from '@/api/labelPrintConfig'
import {
  fetchGatewayConfig,
  fetchGatewayDashboard,
  fetchGatewayLastRequest,
  fetchGatewayPrinters,
  fetchGatewayPreview,
  getBarTenderConfig,
  getTemplateRules,
  LABEL_PRINT_DEFAULT_BIZ_TYPE,
  loadTemplateRules,
  printByTemplate,
  saveBarTenderConfig,
  saveGatewayConfig,
  syncGatewayTemplates,
  saveTemplateRules
} from '@/utils/printService'

function createTemplateRow() {
  return {
    templateKey: '',
    formatPath: '',
    printer: ''
  }
}

function createBizRuleRow() {
  return {
    bizType: '',
    templateKey: ''
  }
}

function createCustomerDefaultRow() {
  return {
    customerCode: '',
    defaultTemplate: ''
  }
}

function createCustomerBizRuleRow() {
  return {
    customerCode: '',
    bizType: '',
    templateKey: ''
  }
}

function normalizeGatewayConfig(data = {}) {
  return {
    listenPrefix: data.listenPrefix || 'http://127.0.0.1:9123/',
    barTenderExe: data.barTenderExe || '',
    defaultTimeoutSeconds: Number(data.defaultTimeoutSeconds || 30),
    templates: data.templates || {}
  }
}

function mapTemplatesToRows(templates = {}) {
  return Object.keys(templates || {}).map(key => ({
    templateKey: key,
    formatPath: templates[key] && templates[key].formatPath ? templates[key].formatPath : '',
    printer: templates[key] && templates[key].printer ? templates[key].printer : ''
  }))
}

function mapRulesToRows(rules = {}) {
  const byBizType = rules.byBizType || {}
  const byCustomer = rules.byCustomer || {}
  const bizRuleRows = Object.keys(byBizType).map(key => ({ bizType: key, templateKey: byBizType[key] }))
  const customerDefaultRows = []
  const customerBizRuleRows = []

  Object.keys(byCustomer).forEach(customerCode => {
    const customerRule = byCustomer[customerCode] || {}
    customerDefaultRows.push({
      customerCode,
      defaultTemplate: customerRule.default || ''
    })
    const childBizType = customerRule.byBizType || {}
    Object.keys(childBizType).forEach(bizType => {
      customerBizRuleRows.push({
        customerCode,
        bizType,
        templateKey: childBizType[bizType] || ''
      })
    })
  })

  return {
    bizRuleRows: bizRuleRows.length ? bizRuleRows : [createBizRuleRow()],
    customerDefaultRows: customerDefaultRows.length ? customerDefaultRows : [createCustomerDefaultRow()],
    customerBizRuleRows: customerBizRuleRows.length ? customerBizRuleRows : [createCustomerBizRuleRow()]
  }
}

function normalizeRulesFromRecords(records = []) {
  const normalized = {
    byBizType: {},
    byCustomer: {}
  }

  records.forEach(item => {
    const bizType = normalizeBizTypeValue((item && item.bizType) || '')
    const templateKey = String((item && item.templateKey) || '').trim()
    const customerCode = String((item && item.customerCode) || '').trim()
    if (!bizType || !templateKey) return

    if (customerCode) {
      if (!normalized.byCustomer[customerCode]) normalized.byCustomer[customerCode] = { byBizType: {} }
      if (bizType === LABEL_PRINT_DEFAULT_BIZ_TYPE) {
        normalized.byCustomer[customerCode].default = templateKey
      } else {
        normalized.byCustomer[customerCode].byBizType[bizType] = templateKey
      }
    } else if (bizType !== LABEL_PRINT_DEFAULT_BIZ_TYPE) {
      normalized.byBizType[bizType] = templateKey
    }
  })

  return normalized
}

function normalizeBizTypeValue(value) {
  const raw = String(value || '').trim()
  const upper = raw.toUpperCase()
  if (!raw) return ''
  if (upper === 'DEFAULT' || upper === '__DEFAULT__' || raw === '客户默认') {
    return LABEL_PRINT_DEFAULT_BIZ_TYPE
  }
  return raw
}

const SLITTING_GLOBAL_BIZ_TYPES = [
  'SLITTING_CORE_LABEL',
  'SLITTING_INNER_LABEL',
  'SLITTING_OUTER_LABEL',
  'SLITTING_PALLET_LABEL'
]

const SLITTING_DEFAULT_TEMPLATE_BY_BIZ_TYPE = {
  SLITTING_CORE_LABEL: 'SLITTING_CORE_LABEL',
  SLITTING_INNER_LABEL: 'SLITTING_INNER_LABEL',
  SLITTING_OUTER_LABEL: 'SLITTING_OUTER_LABEL',
  SLITTING_PALLET_LABEL: 'SLITTING_PALLET_LABEL'
}

const DEFAULT_TEMPLATE_PATH_HINT = {
  COATING_ROLL_LABEL: 'D:\\MES\\BarTender\\Templates\\coating.btw',
  COATING_INBOUND_SHEET: 'D:\\MES\\BarTender\\Templates\\coating.btw',
  REWINDING_ROLL_LABEL: 'D:\\MES\\BarTender\\Templates\\rolling.btw',
  SLITTING_CORE_LABEL: 'D:\\MES\\BarTender\\Templates\\rolling.btw',
  SLITTING_INNER_LABEL: 'D:\\MES\\BarTender\\Templates\\rolling.btw',
  SLITTING_OUTER_LABEL: 'D:\\MES\\BarTender\\Templates\\rolling.btw',
  SLITTING_PALLET_LABEL: 'D:\\MES\\BarTender\\Templates\\rolling.btw'
}

const TEMPLATE_PREVIEW_DATA_STORAGE_KEY = 'MES_PRINT_TEMPLATE_PREVIEW_DATA'

const TEMPLATE_PREVIEW_DATA_MAP = {
  COATING_ROLL_LABEL: {
    materialCode: 'COAT-TEST-001',
    materialName: '涂布标签示例',
    productName: '涂布卷标签',
    customerName: '示例客户A',
    batchNo: 'BAT-20260408-A',
    width: 1000,
    length: 500,
    rollNo: 'COAT-R001',
    spec: '100*500*1000'
  },
  COATING_INBOUND_SHEET: {
    materialCode: 'COAT-IN-001',
    materialName: '涂布入库单',
    productName: '涂布入库标签',
    customerName: '示例客户A',
    batchNo: 'IN-20260408-A',
    rollNo: 'IN-R001',
    spec: '入库/待检',
    warehouse: '成品仓'
  },
  REWINDING_ROLL_LABEL: {
    materialCode: 'REW-TEST-001',
    materialName: '复卷标签示例',
    productName: '复卷卷标签',
    batchNo: 'RW-20260408-A',
    rollCount: 8,
    innerDiameter: 76,
    outerDiameter: 508,
    rollNo: 'RW-R001',
    spec: '76/508'
  },
  SLITTING_CORE_LABEL: {
    materialCode: 'SLIT-CORE-001',
    materialName: '分切芯标签',
    cartonSpec: '430×320×300',
    cartonNo: 'CT-CORE-001',
    slittingQty: 18,
    palletNo: 'PLT-CORE-001',
    spec: '芯卷'
  },
  SLITTING_INNER_LABEL: {
    materialCode: 'SLIT-INNER-001',
    materialName: '分切内标签',
    cartonSpec: '500×380×350',
    cartonNo: 'CT-INNER-001',
    slittingQty: 12,
    palletNo: 'PLT-INNER-001',
    spec: '内标签'
  },
  SLITTING_OUTER_LABEL: {
    materialCode: 'SLIT-OUTER-001',
    materialName: '分切外标签',
    cartonSpec: '600×400×400',
    cartonNo: 'CT-OUTER-001',
    slittingQty: 10,
    palletNo: 'PLT-OUTER-001',
    spec: '外标签'
  },
  SLITTING_PALLET_LABEL: {
    materialCode: 'SLIT-PLT-001',
    materialName: '分切托盘标签',
    cartonSpec: '600×400×400',
    cartonNo: 'CT-PLT-001',
    slittingQty: 1,
    palletNo: 'PLT-001',
    spec: '托盘'
  }
}

export default {
  name: 'PrintConfig',
  data() {
    return {
      localConfig: getBarTenderConfig(),
      gatewayConfig: normalizeGatewayConfig(),
      gatewayTemplates: [createTemplateRow()],
      printers: [],
      printerPreview: '',
      bizRuleRows: [createBizRuleRow()],
      customerDefaultRows: [createCustomerDefaultRow()],
      customerBizRuleRows: [createCustomerBizRuleRow()],
      sceneContext: {
        active: false,
        bizType: '',
        defaultTemplate: '',
        customerCode: '',
        sourceTitle: '',
        sceneName: '',
        returnTo: ''
      },
      gatewayLoading: false,
      gatewaySaving: false,
      ruleLoading: false,
      ruleSaving: false,
      dashboardLoading: false,
      syncTemplateLoading: false,
      dashboardText: '',
      dashboardData: {},
      autoSaveAfterImport: false,
      printerLoading: false,
      testPrinting: false,
      previewLoading: false,
      previewDialogVisible: false,
      previewDialogTitle: '模板打印预览',
      previewPages: [],
      previewDataText: JSON.stringify(TEMPLATE_PREVIEW_DATA_MAP, null, 2),
      lastPrintLoading: false,
      lastPrintText: '',
      testForm: {
        template: '',
        copies: 1,
        jobName: '',
        dataText: JSON.stringify({
          materialCode: 'TEST-001',
          materialName: '测试标签',
          spec: '100*500*1000',
          rollNo: 'ROLL-TEST-001'
        }, null, 2)
      }
    }
  },
  computed: {
    sceneAlertTitle() {
      const sourceTitle = this.sceneContext.sourceTitle || '来源页面'
      const sceneName = this.sceneContext.sceneName || '打印场景'
      return `当前来自 ${sourceTitle} 的 ${sceneName} 配置跳转`
    },
    dashboardOnline() {
      const service = (this.dashboardData && this.dashboardData.service) || {}
      const status = String(service.status || '').toLowerCase()
      const compatibility = (this.dashboardData && this.dashboardData.compatibility) || {}
      if (compatibility.fallback === true) return true
      return status === 'online'
    },
    dashboardUptimeSeconds() {
      const service = (this.dashboardData && this.dashboardData.service) || {}
      const n = Number(service.uptimeSeconds || 0)
      return Number.isFinite(n) && n > 0 ? Math.trunc(n) : 0
    },
    dashboardTemplateCount() {
      const templates = (this.dashboardData && this.dashboardData.templates) || {}
      const cfg = Number(templates.configuredCount || 0)
      if (Number.isFinite(cfg) && cfg > 0) return Math.trunc(cfg)
      const fallback = Array.isArray(templates.configuredKeys) ? templates.configuredKeys.length : 0
      return fallback
    },
    dashboardSyncedCount() {
      const sync = (this.dashboardData && this.dashboardData.sync) || {}
      const n = Number(sync.syncedCount)
      if (Number.isFinite(n) && n >= 0) return Math.trunc(n)
      return this.dashboardTemplateCount
    },
    dashboardPrinterCount() {
      const printers = (this.dashboardData && this.dashboardData.printers) || {}
      const n = Number(printers.count || 0)
      return Number.isFinite(n) && n >= 0 ? Math.trunc(n) : 0
    }
  },
  created() {
    this.applyRouteSceneContext()
    this.loadTemplatePreviewConfig()
    this.loadInitialData()
  },
  methods: {
    async loadTemplatePreviewConfig() {
      try {
        const res = await getTemplatePreviewSamples()
        const payload = res && res.data && typeof res.data === 'object' ? res.data : {}
        if (payload && Object.keys(payload).length) {
          this.previewDataText = JSON.stringify(payload, null, 2)
          window.localStorage.setItem(TEMPLATE_PREVIEW_DATA_STORAGE_KEY, JSON.stringify(payload))
          return
        }
      } catch (error) {
        // fallback below
      }
      try {
        const raw = window.localStorage.getItem(TEMPLATE_PREVIEW_DATA_STORAGE_KEY)
        if (raw) {
          const parsed = JSON.parse(raw)
          this.previewDataText = JSON.stringify(parsed, null, 2)
          try {
            await saveTemplatePreviewSamples(parsed || {})
          } catch (syncError) {
            // keep local cache only
          }
          return
        }
      } catch (error) {
        // fallback to default below
      }
      this.previewDataText = JSON.stringify(TEMPLATE_PREVIEW_DATA_MAP, null, 2)
    },
    async saveTemplatePreviewConfig() {
      try {
        const parsed = this.previewDataText ? JSON.parse(this.previewDataText) : {}
        try {
          await saveTemplatePreviewSamples(parsed || {})
        } catch (syncError) {
          this.$message.warning('已保存本地示例配置，但同步到服务器失败')
        }
        window.localStorage.setItem(TEMPLATE_PREVIEW_DATA_STORAGE_KEY, JSON.stringify(parsed || {}))
        this.previewDataText = JSON.stringify(parsed || {}, null, 2)
        this.$message.success('模板预览示例数据已保存')
      } catch (error) {
        this.$message.error('示例配置不是合法 JSON')
      }
    },
    async resetTemplatePreviewConfig() {
      this.previewDataText = JSON.stringify(TEMPLATE_PREVIEW_DATA_MAP, null, 2)
      try {
        await saveTemplatePreviewSamples(TEMPLATE_PREVIEW_DATA_MAP)
      } catch (error) {
        this.$message.warning('已恢复默认示例配置，但同步到服务器失败')
      }
      window.localStorage.removeItem(TEMPLATE_PREVIEW_DATA_STORAGE_KEY)
      this.$message.success('已恢复默认示例配置')
    },
    getTemplatePreviewOverrides() {
      try {
        const parsed = this.previewDataText ? JSON.parse(this.previewDataText) : {}
        return parsed && typeof parsed === 'object' ? parsed : {}
      } catch (error) {
        return {}
      }
    },
    async downloadClientDeploy(fileName) {
      const name = String(fileName || '').trim()
      if (!name) return
      const url = `${window.location.origin}/downloads/bartender/${encodeURIComponent(name)}`
      try {
        const resp = await fetch(url, { method: 'GET', credentials: 'include' })
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
        const blob = await resp.blob()
        const objectUrl = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = objectUrl
        link.download = name
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(objectUrl)
      } catch (e) {
        // 回退：至少可打开链接手工另存为
        window.open(url, '_blank')
        this.$message.warning('浏览器未能直接下载，已为你打开文件链接，可右键“另存为”')
      }
    },
    async copyBootstrapCommand() {
      const origin = window.location.origin
      const cmd = `$base='${origin}'; $tmp=Join-Path $env:TEMP 'mes-bt-bootstrap.ps1'; $wc=New-Object System.Net.WebClient; try { $wc.DownloadFile($base + '/downloads/bartender/bootstrap-install.ps1', $tmp) } finally { $wc.Dispose() }; powershell -NoProfile -ExecutionPolicy Bypass -File $tmp -BaseUrl $base`
      try {
        if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(cmd)
          this.$message.success('最终在线安装脚本（单行）已复制，请在“管理员 PowerShell”直接粘贴执行')
          return
        }
      } catch (e) {
        // fallback below
      }
      this.$alert(cmd, '请复制以下单行脚本到 PowerShell 执行', { confirmButtonText: '我知道了' })
    },
    applyRouteSceneContext() {
      const query = (this.$route && this.$route.query) || {}
      const bizType = String(query.bizType || '').trim()
      const defaultTemplate = String(query.defaultTemplate || '').trim()
      const customerCode = String(query.customerCode || '').trim()
      const sourceTitle = String(query.sourceTitle || '').trim()
      const sceneName = String(query.sceneName || '').trim()
      const returnTo = String(query.returnTo || '').trim()
      const active = !!(bizType || defaultTemplate || customerCode || sourceTitle || sceneName || returnTo)

      this.sceneContext = {
        active,
        bizType,
        defaultTemplate,
        customerCode,
        sourceTitle,
        sceneName,
        returnTo
      }

      if (defaultTemplate && !this.testForm.template) {
        this.testForm.template = defaultTemplate
      }
    },
    async loadInitialData() {
      this.loadLocalConfig()
      await this.loadRuleConfig()
      await this.loadGatewayDashboard()
      await this.loadGatewayConfig()
      this.ensureGatewayTemplateMappingsForGlobalRules()
      await this.loadPrinters()
      await this.loadLastPrintRequest()
    },
    async loadGatewayDashboard() {
      this.dashboardLoading = true
      try {
        const data = await fetchGatewayDashboard(this.localConfig)
        this.dashboardData = data || {}
        this.dashboardText = JSON.stringify(data || {}, null, 2)
      } catch (error) {
        this.dashboardData = {}
        this.dashboardText = ''
        this.$message.error(error.message || '读取状态看板失败')
      } finally {
        this.dashboardLoading = false
      }
    },
    async syncTemplatesFromServer() {
      this.syncTemplateLoading = true
      try {
        const defaultPrinter = String(this.printerPreview || this.gatewayConfig.defaultPrinter || '').trim()
        const res = await syncGatewayTemplates(this.localConfig, { defaultPrinter })
        if (res && (res.code === 200 || res.message)) {
          this.$message.success('模板已从服务端同步到本机')
        } else {
          this.$message.success('模板同步完成')
        }
        await this.loadGatewayConfig()
        await this.loadGatewayDashboard()

        const detailText = this.buildTemplateSyncDetailText(res)
        if (detailText) {
          this.$alert(detailText, '模板同步结果明细', {
            confirmButtonText: '我知道了',
            dangerouslyUseHTMLString: false
          })
        }
      } catch (error) {
        const msg = String((error && error.message) || '')
        if (/404/i.test(msg)) {
          this.$message.error('本机网关版本较旧，不支持模板同步接口，请重新执行在线一键安装')
        } else {
          this.$message.error(error.message || '模板同步失败')
        }
      } finally {
        this.syncTemplateLoading = false
      }
    },
    buildTemplateSyncDetailText(res) {
      const config = (res && res.config) || {}
      const templates = (config && config.templates) || {}
      const keys = Object.keys(templates || {}).sort()
      if (!keys.length) return ''

      const lines = []
      lines.push('以下为同步后本机模板映射：')
      lines.push('')
      keys.forEach(key => {
        const row = templates[key] || {}
        const formatPath = String(row.formatPath || '').trim()
        const printer = String(row.printer || '').trim()
        lines.push(`${key} => ${formatPath || '-'}${printer ? `  | 打印机: ${printer}` : ''}`)
      })
      return lines.join('\n')
    },
    formatUptime(totalSeconds) {
      const sec = Math.max(0, Number(totalSeconds || 0))
      const h = Math.floor(sec / 3600)
      const m = Math.floor((sec % 3600) / 60)
      const s = Math.floor(sec % 60)
      const pad = n => String(n).padStart(2, '0')
      return `${pad(h)}:${pad(m)}:${pad(s)}`
    },
    loadLocalConfig() {
      this.localConfig = getBarTenderConfig()
    },
    saveLocalConfigAction() {
      this.localConfig = saveBarTenderConfig(this.localConfig)
      this.$message.success('前端网关配置已保存')
    },
    async loadRuleConfig() {
      this.ruleLoading = true
      try {
        const res = await getLabelPrintConfigList({ isActive: 1, scope: 'label-rule' })
        const list = Array.isArray(res && res.data) ? res.data : []
        const normalized = normalizeRulesFromRecords(list)

        saveTemplateRules(normalized)
        const rows = mapRulesToRows(normalized)
        this.bizRuleRows = rows.bizRuleRows
        this.customerDefaultRows = rows.customerDefaultRows
        this.customerBizRuleRows = rows.customerBizRuleRows
      } catch (error) {
        const rows = mapRulesToRows(getTemplateRules())
        this.bizRuleRows = rows.bizRuleRows
        this.customerDefaultRows = rows.customerDefaultRows
        this.customerBizRuleRows = rows.customerBizRuleRows
        this.$message.warning(error.message || '数据库标签规则读取失败，已回退本地缓存')
      } finally {
        this.applyScenePresetToRules()
        this.ensureSlittingGlobalUnifiedRules()
        this.ruleLoading = false
      }
    },
    ensureSlittingGlobalUnifiedRules() {
      const existingRows = Array.isArray(this.bizRuleRows) ? this.bizRuleRows : []

      const mergedRows = [...existingRows]
      SLITTING_GLOBAL_BIZ_TYPES.forEach(bizType => {
        const idx = mergedRows.findIndex(row => normalizeBizTypeValue(row && row.bizType) === bizType)
        if (idx === -1) {
          mergedRows.push({
            bizType,
            templateKey: SLITTING_DEFAULT_TEMPLATE_BY_BIZ_TYPE[bizType] || bizType
          })
        }
      })

      this.bizRuleRows = mergedRows.length ? mergedRows : [createBizRuleRow()]
    },
    ensureGatewayTemplateMappingsForGlobalRules() {
      const rows = Array.isArray(this.gatewayTemplates) ? [...this.gatewayTemplates] : []
      const existing = {}
      rows.forEach(row => {
        const key = String((row && row.templateKey) || '').trim()
        if (key) existing[key] = row
      })

      const requiredTemplateKeys = []
      ;(this.bizRuleRows || []).forEach(row => {
        const templateKey = String((row && row.templateKey) || '').trim()
        if (templateKey) requiredTemplateKeys.push(templateKey)
      })

      // 去重
      const uniqRequired = Array.from(new Set(requiredTemplateKeys))
      if (!uniqRequired.length) return

      const coatingSeed = existing.COATING_ROLL_LABEL || existing.COATING_INBOUND_SHEET || null
      const rollingSeed = existing.REWINDING_ROLL_LABEL || existing.SLITTING_CORE_LABEL || existing.SLITTING_INNER_LABEL || existing.SLITTING_OUTER_LABEL || existing.SLITTING_PALLET_LABEL || null

      let appendedCount = 0
      uniqRequired.forEach(templateKey => {
        if (existing[templateKey]) return

        const isSlitting = templateKey.indexOf('SLITTING_') === 0
        const seed = isSlitting ? rollingSeed : coatingSeed
        const formatPath = String((seed && seed.formatPath) || DEFAULT_TEMPLATE_PATH_HINT[templateKey] || '').trim()
        const printer = String((seed && seed.printer) || '').trim()

        const newRow = {
          templateKey,
          formatPath,
          printer
        }
        rows.push(newRow)
        existing[templateKey] = newRow
        appendedCount++
      })

      if (appendedCount > 0) {
        this.gatewayTemplates = rows
        this.$nextTick(() => {
          this.$message.success(`已自动补齐 ${appendedCount} 条模板映射，请点击“保存到本机”生效`)
        })
      }
    },
    applyScenePresetToRules() {
      if (!this.sceneContext.active) return

      const bizType = this.sceneContext.bizType
      const defaultTemplate = this.sceneContext.defaultTemplate
      const customerCode = this.sceneContext.customerCode

      if (bizType && defaultTemplate) {
        const exists = this.bizRuleRows.some(row => String(row.bizType || '').trim() === bizType)
        if (!exists) {
          this.bizRuleRows.unshift({ bizType, templateKey: defaultTemplate })
        }
      }

      if (customerCode && defaultTemplate) {
        const exists = this.customerDefaultRows.some(row => String(row.customerCode || '').trim() === customerCode)
        if (!exists) {
          this.customerDefaultRows.unshift({ customerCode, defaultTemplate })
        }
      }
    },
    goBackToSource() {
      if (!this.sceneContext.returnTo) return
      this.$router.push(this.sceneContext.returnTo)
    },
    buildRuleConfigPayload() {
      const byBizType = {}
      const byCustomer = {}
      const records = []

      this.bizRuleRows.forEach(row => {
        const bizType = normalizeBizTypeValue(row.bizType || '')
        const templateKey = String(row.templateKey || '').trim()
        if (bizType && templateKey) {
          byBizType[bizType] = templateKey
          records.push({
            bizType,
            sceneName: bizType,
            templateKey,
            customerCode: null,
            sortNo: records.length + 1,
            isActive: 1,
            remark: '全局标签模板规则'
          })
        }
      })

      this.customerDefaultRows.forEach(row => {
        const customerCode = String(row.customerCode || '').trim()
        const defaultTemplate = String(row.defaultTemplate || '').trim()
        if (!customerCode) return
        if (!byCustomer[customerCode]) byCustomer[customerCode] = { byBizType: {} }
        if (defaultTemplate) {
          byCustomer[customerCode].default = defaultTemplate
          records.push({
            bizType: LABEL_PRINT_DEFAULT_BIZ_TYPE,
            sceneName: '客户默认标签模板',
            templateKey: defaultTemplate,
            customerCode,
            sortNo: records.length + 1,
            isActive: 1,
            remark: '客户默认标签模板'
          })
        }
      })

      this.customerBizRuleRows.forEach(row => {
        const customerCode = String(row.customerCode || '').trim()
        const bizType = normalizeBizTypeValue(row.bizType || '')
        const templateKey = String(row.templateKey || '').trim()
        if (!customerCode || !bizType || !templateKey) return
        if (!byCustomer[customerCode]) byCustomer[customerCode] = { byBizType: {} }
        if (!byCustomer[customerCode].byBizType) byCustomer[customerCode].byBizType = {}
        byCustomer[customerCode].byBizType[bizType] = templateKey
        records.push({
          bizType,
          sceneName: bizType,
          templateKey,
          customerCode,
          sortNo: records.length + 1,
          isActive: 1,
          remark: '客户专用标签模板'
        })
      })

      return { byBizType, byCustomer, records }
    },
    downloadJsonFile(data, fileName) {
      const content = JSON.stringify(data || {}, null, 2)
      const blob = new Blob([content], { type: 'application/json;charset=utf-8' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    },
    exportRuleConfigAction() {
      const payload = this.buildRuleConfigPayload()
      const exportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        byBizType: payload.byBizType,
        byCustomer: payload.byCustomer,
        records: payload.records
      }
      const datePart = new Date().toISOString().slice(0, 10)
      this.downloadJsonFile(exportData, `label-print-rules-${datePart}.json`)
      this.$message.success('规则导出成功')
    },
    escapeCsvCell(value) {
      const text = String(value == null ? '' : value)
      if (/[",\r\n]/.test(text)) {
        return `"${text.replace(/"/g, '""')}"`
      }
      return text
    },
    downloadCsvFile(lines, fileName) {
      const content = `\uFEFF${(lines || []).join('\r\n')}`
      const blob = new Blob([content], { type: 'text/csv;charset=utf-8' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    },
    exportRuleCsvAction() {
      const payload = this.buildRuleConfigPayload()
      const headers = ['bizType', 'customerCode', 'templateKey', 'sceneName']
      const lines = [headers.join(',')]
      payload.records.forEach(item => {
        lines.push([
          this.escapeCsvCell(item.bizType),
          this.escapeCsvCell(item.customerCode),
          this.escapeCsvCell(item.templateKey),
          this.escapeCsvCell(item.sceneName)
        ].join(','))
      })
      const datePart = new Date().toISOString().slice(0, 10)
      this.downloadCsvFile(lines, `label-print-rules-${datePart}.csv`)
      this.$message.success('CSV导出成功')
    },
    downloadRuleImportTemplate() {
      const template = {
        version: '1.0',
        note: '请按 records 数组填写；bizType 与 templateKey 必填；customerCode 为空表示全局规则',
        records: [
          {
            bizType: 'COATING_INNER_LABEL',
            templateKey: 'coating_inner_default',
            customerCode: null,
            sceneName: '示例全局规则'
          },
          {
            bizType: LABEL_PRINT_DEFAULT_BIZ_TYPE,
            templateKey: 'slitting_default_customer',
            customerCode: 'DGFN001',
            sceneName: '示例客户默认模板'
          },
          {
            bizType: 'SLITTING_OUTER_LABEL',
            templateKey: 'slitting_outer_dgfn001',
            customerCode: 'DGFN001',
            sceneName: '示例客户+业务规则'
          }
        ]
      }
      this.downloadJsonFile(template, 'label-print-rules-template.json')
      this.$message.success('导入模板已下载')
    },
    downloadCsvImportTemplate() {
      const lines = [
        'bizType,customerCode,templateKey,sceneName',
        'COATING_INNER_LABEL,,coating_inner_default,示例全局规则',
        'DEFAULT,DGFN001,slitting_default_customer,示例客户默认模板',
        'SLITTING_OUTER_LABEL,DGFN001,slitting_outer_dgfn001,示例客户+业务规则'
      ]
      this.downloadCsvFile(lines, 'label-print-rules-template.csv')
      this.$message.success('CSV模板已下载')
    },
    triggerRuleImport() {
      const input = this.$refs.ruleImportInput
      if (!input) return
      input.value = ''
      input.click()
    },
    parseCsvLine(line) {
      const result = []
      let current = ''
      let inQuotes = false
      for (let i = 0; i < line.length; i += 1) {
        const ch = line[i]
        if (ch === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"'
            i += 1
          } else {
            inQuotes = !inQuotes
          }
        } else if (ch === ',' && !inQuotes) {
          result.push(current)
          current = ''
        } else {
          current += ch
        }
      }
      result.push(current)
      return result
    },
    parseCsvRuleData(csvText) {
      const text = String(csvText || '').replace(/^\uFEFF/, '')
      const lines = text.split(/\r?\n/).map(item => item.trim()).filter(Boolean)
      if (!lines.length) return []

      const headers = this.parseCsvLine(lines[0]).map(item => String(item || '').trim())
      const getIndex = (...names) => {
        const candidates = names.map(name => String(name || '').toLowerCase())
        return headers.findIndex(h => candidates.includes(String(h || '').toLowerCase()))
      }
      const idxBizType = getIndex('bizType', '业务类型', '业务场景', 'biz_type', 'biztype')
      const idxCustomerCode = getIndex('customerCode', '客户编码', '客户代码', 'customer_code', 'customercode')
      const idxTemplateKey = getIndex('templateKey', '模板键', '模板key', '模板', 'template_key', 'template')
      const idxSceneName = getIndex('sceneName', '场景名称', '场景', 'scene_name', 'scenename')

      if (idxBizType < 0 || idxTemplateKey < 0) {
        throw new Error('CSV缺少必需列：bizType(业务类型)/templateKey(模板键)')
      }

      return lines.slice(1).map(line => {
        const cols = this.parseCsvLine(line)
        return {
          bizType: normalizeBizTypeValue(cols[idxBizType] || ''),
          customerCode: idxCustomerCode >= 0 ? String(cols[idxCustomerCode] || '').trim() : '',
          templateKey: String(cols[idxTemplateKey] || '').trim(),
          sceneName: idxSceneName >= 0 ? String(cols[idxSceneName] || '').trim() : ''
        }
      })
    },
    parseImportedRuleData(rawData) {
      if (Array.isArray(rawData)) return rawData
      if (rawData && Array.isArray(rawData.records)) return rawData.records

      if (rawData && (rawData.byBizType || rawData.byCustomer)) {
        const records = []
        const byBizType = rawData.byBizType || {}
        Object.keys(byBizType).forEach(bizType => {
          const templateKey = String(byBizType[bizType] || '').trim()
          if (!templateKey) return
          records.push({
            bizType,
            templateKey,
            customerCode: null,
            sceneName: bizType
          })
        })

        const byCustomer = rawData.byCustomer || {}
        Object.keys(byCustomer).forEach(customerCode => {
          const customerRule = byCustomer[customerCode] || {}
          const defaultTemplate = String(customerRule.default || '').trim()
          if (defaultTemplate) {
            records.push({
              bizType: LABEL_PRINT_DEFAULT_BIZ_TYPE,
              templateKey: defaultTemplate,
              customerCode,
              sceneName: '客户默认标签模板'
            })
          }

          const childBizType = customerRule.byBizType || {}
          Object.keys(childBizType).forEach(bizType => {
            const templateKey = String(childBizType[bizType] || '').trim()
            if (!templateKey) return
            records.push({
              bizType,
              templateKey,
              customerCode,
              sceneName: bizType
            })
          })
        })
        return records
      }

      return []
    },
    async handleRuleImportChange(event) {
      const files = event && event.target && event.target.files
      const file = files && files[0]
      if (!file) return

      try {
        const text = await file.text()
        const name = String(file.name || '').toLowerCase()
        let records = []
        if (name.endsWith('.csv')) {
          records = this.parseCsvRuleData(text)
        } else {
          const rawData = JSON.parse(text)
          records = this.parseImportedRuleData(rawData)
        }
        const normalized = normalizeRulesFromRecords(records)
        const rows = mapRulesToRows(normalized)

        const hasValid = rows.bizRuleRows.some(row => row.bizType && row.templateKey) ||
          rows.customerDefaultRows.some(row => row.customerCode && row.defaultTemplate) ||
          rows.customerBizRuleRows.some(row => row.customerCode && row.bizType && row.templateKey)

        if (!hasValid) {
          this.$message.warning('导入文件中没有可用规则，请检查内容')
          return
        }

        await this.$confirm('导入将覆盖当前页面规则，是否继续？', '提示', {
          type: 'warning',
          confirmButtonText: '继续导入',
          cancelButtonText: '取消'
        })

        this.bizRuleRows = rows.bizRuleRows
        this.customerDefaultRows = rows.customerDefaultRows
        this.customerBizRuleRows = rows.customerBizRuleRows
        saveTemplateRules(normalized)
        if (this.autoSaveAfterImport) {
          await this.saveRuleConfigAction()
          this.$message.success('规则已导入并自动保存到数据库')
        } else {
          this.$message.success('规则已导入到页面，请点击“保存规则到数据库”完成落库')
        }
      } catch (error) {
        if (error !== 'cancel') {
          this.$message.error(error.message || '导入失败，请检查 JSON/CSV 文件格式')
        }
      } finally {
        const input = this.$refs.ruleImportInput
        if (input) input.value = ''
      }
    },
    async saveRuleConfigAction() {
      const payload = this.buildRuleConfigPayload()

      this.ruleSaving = true
      try {
        await batchSaveLabelPrintConfigs(payload.records, { scope: 'label-rule' })
        saveTemplateRules({ byBizType: payload.byBizType, byCustomer: payload.byCustomer })
        await loadTemplateRules(true)
        this.$message.success('标签打印规则已保存到数据库')
      } catch (error) {
        this.$message.error(error.message || '标签打印规则保存失败')
      } finally {
        this.ruleSaving = false
      }
    },
    async loadGatewayConfig() {
      this.gatewayLoading = true
      try {
        const data = await fetchGatewayConfig(this.localConfig)
        this.gatewayConfig = normalizeGatewayConfig(data)
        this.gatewayTemplates = mapTemplatesToRows(this.gatewayConfig.templates)
        if (!this.gatewayTemplates.length) this.gatewayTemplates = [createTemplateRow()]
      } catch (error) {
        this.$message.error(error.message || '读取本机配置失败')
      } finally {
        this.gatewayLoading = false
      }
    },
    async saveGatewayConfigAction() {
      this.gatewaySaving = true
      try {
        const templates = {}
        this.gatewayTemplates.forEach(row => {
          const templateKey = String(row.templateKey || '').trim()
          if (!templateKey) return
          templates[templateKey] = {
            formatPath: String(row.formatPath || '').trim(),
            printer: String(row.printer || '').trim()
          }
        })

        const payload = {
          listenPrefix: String(this.gatewayConfig.listenPrefix || '').trim(),
          barTenderExe: String(this.gatewayConfig.barTenderExe || '').trim(),
          defaultTimeoutSeconds: Number(this.gatewayConfig.defaultTimeoutSeconds || 30),
          templates
        }

        const saved = await saveGatewayConfig(payload, this.localConfig)
        this.gatewayConfig = normalizeGatewayConfig(saved)
        this.gatewayTemplates = mapTemplatesToRows(this.gatewayConfig.templates)
        if (!this.gatewayTemplates.length) this.gatewayTemplates = [createTemplateRow()]
        this.$message.success('本机 BarTender 配置已保存')
      } catch (error) {
        this.$message.error(error.message || '保存本机配置失败')
      } finally {
        this.gatewaySaving = false
      }
    },
    async loadPrinters() {
      this.printerLoading = true
      try {
        this.printers = await fetchGatewayPrinters(this.localConfig)
      } catch (error) {
        this.$message.error(error.message || '读取打印机列表失败')
      } finally {
        this.printerLoading = false
      }
    },
    addTemplateRow() {
      this.gatewayTemplates.push(createTemplateRow())
    },
    removeTemplateRow(index) {
      this.gatewayTemplates.splice(index, 1)
      if (!this.gatewayTemplates.length) this.gatewayTemplates.push(createTemplateRow())
    },
    addBizRuleRow() {
      this.bizRuleRows.push(createBizRuleRow())
    },
    removeBizRuleRow(index) {
      this.bizRuleRows.splice(index, 1)
      if (!this.bizRuleRows.length) this.bizRuleRows.push(createBizRuleRow())
    },
    addCustomerDefaultRow() {
      this.customerDefaultRows.push(createCustomerDefaultRow())
    },
    removeCustomerDefaultRow(index) {
      this.customerDefaultRows.splice(index, 1)
      if (!this.customerDefaultRows.length) this.customerDefaultRows.push(createCustomerDefaultRow())
    },
    addCustomerBizRuleRow() {
      this.customerBizRuleRows.push(createCustomerBizRuleRow())
    },
    removeCustomerBizRuleRow(index) {
      this.customerBizRuleRows.splice(index, 1)
      if (!this.customerBizRuleRows.length) this.customerBizRuleRows.push(createCustomerBizRuleRow())
    },
    buildPreviewDataForTemplate(template, baseData = {}) {
      const code = String(template || '').trim().toUpperCase()
      const defaultData = {
        materialCode: 'TEST-001',
        materialName: '测试标签',
        spec: '100*500*1000',
        rollNo: 'ROLL-TEST-001'
      }

      const previewOverrides = this.getTemplatePreviewOverrides()
      if (previewOverrides[code]) {
        return {
          ...defaultData,
          ...TEMPLATE_PREVIEW_DATA_MAP[code],
          ...previewOverrides[code],
          ...baseData
        }
      }

      if (TEMPLATE_PREVIEW_DATA_MAP[code]) {
        return {
          ...defaultData,
          ...TEMPLATE_PREVIEW_DATA_MAP[code],
          ...baseData
        }
      }

      if (code.startsWith('COATING_')) {
        return {
          ...defaultData,
          productName: '涂布标签示例',
          customerName: '示例客户',
          width: 1000,
          length: 500,
          batchNo: 'BAT-20260408',
          ...baseData
        }
      }

      if (code.startsWith('REWINDING_')) {
        return {
          ...defaultData,
          productName: '复卷标签示例',
          rollCount: 8,
          innerDiameter: 76,
          outerDiameter: 508,
          batchNo: 'RW-20260408',
          ...baseData
        }
      }

      if (code.startsWith('SLITTING_')) {
        return {
          ...defaultData,
          cartonSpec: '430×320×300',
          cartonNo: 'CT-20260408',
          slittingQty: 18,
          palletNo: 'PLT-001',
          ...baseData
        }
      }

      return {
        ...defaultData,
        ...baseData
      }
    },
    async handleTestPrint() {
      const template = String(this.testForm.template || '').trim()
      if (!template) {
        this.$message.warning('请先选择模板键')
        return
      }

      let data = {}
      try {
        data = this.testForm.dataText ? JSON.parse(this.testForm.dataText) : {}
      } catch (error) {
        this.$message.error('测试数据不是合法 JSON')
        return
      }

      this.testPrinting = true
      try {
        data = this.buildPreviewDataForTemplate(template, data)
        await printByTemplate(template, data, {
          copies: Number(this.testForm.copies || 1),
          jobName: this.testForm.jobName || `${template}_${Date.now()}`
        }, this.localConfig)
        this.$message.success('测试打印请求已发送')
      } catch (error) {
        this.$message.error(error.message || '测试打印失败')
      } finally {
        this.testPrinting = false
      }
    },
    async handleTemplatePreview() {
      const template = String(this.testForm.template || '').trim()
      if (!template) {
        this.$message.warning('请先选择模板键')
        return
      }

      let data = {}
      try {
        data = this.testForm.dataText ? JSON.parse(this.testForm.dataText) : {}
      } catch (error) {
        this.$message.error('测试数据不是合法 JSON')
        return
      }

      this.previewLoading = true
      try {
        data = this.buildPreviewDataForTemplate(template, data)
        const res = await fetchGatewayPreview({
          template,
          data,
          copies: Number(this.testForm.copies || 1),
          jobName: this.testForm.jobName || `${template}_${Date.now()}`
        }, this.localConfig)

        const pages = Array.isArray(res.pages) ? res.pages : []
        if (!pages.length) {
          this.$message.warning('未生成预览图片')
          return
        }

        this.previewPages = pages
        this.previewDialogTitle = `模板打印预览 - ${template}`
        this.previewDialogVisible = true
      } catch (error) {
        this.$message.error(error.message || '模板预览失败')
      } finally {
        this.previewLoading = false
      }
    },
    handleTestTemplateChange(template) {
      const normalized = String(template || '').trim()
      if (!normalized) return
      const currentData = this.testForm.dataText ? (() => {
        try {
          return JSON.parse(this.testForm.dataText)
        } catch (error) {
          return {}
        }
      })() : {}
      const nextData = this.buildPreviewDataForTemplate(normalized, currentData)
      this.testForm.dataText = JSON.stringify(nextData, null, 2)
    },
    async loadLastPrintRequest() {
      this.lastPrintLoading = true
      try {
        const data = await fetchGatewayLastRequest(this.localConfig)
        let payload = data && data.payload
        try {
          payload = typeof payload === 'string' ? JSON.parse(payload) : payload
        } catch (e) {
          // ignore parse error
        }

        const display = {
          ts: (data && data.ts) || '',
          result: (data && data.result) || {},
          payload: payload || {}
        }
        this.lastPrintText = JSON.stringify(display, null, 2)
      } catch (error) {
        this.lastPrintText = ''
        this.$message.error(error.message || '读取最近打印请求失败')
      } finally {
        this.lastPrintLoading = false
      }
    }
  }
}
</script>

<style scoped>
.print-config-page {
  padding: 16px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.dashboard-metric-card {
  border: 1px solid #ebeef5;
  border-radius: 6px;
  padding: 10px 12px;
  min-height: 72px;
  background: #fff;
}

.dashboard-metric-title {
  color: #909399;
  font-size: 12px;
  margin-bottom: 8px;
}

.dashboard-metric-value {
  color: #303133;
  font-size: 18px;
  font-weight: 600;
}
</style>
