import { getActiveLabelPrintConfigs } from '@/api/labelPrintConfig'
import { getToken } from '@/utils/auth'

const STORAGE_KEY = 'MES_BARTENDER_CONFIG'
const TEMPLATE_RULES_KEY = 'MES_PRINT_TEMPLATE_RULES'
const SLITTING_CARTON_SPECS_KEY = 'MES_SLITTING_CARTON_SPECS'
const SLITTING_MATERIAL_CARTON_SPECS_KEY = 'MES_SLITTING_MATERIAL_CARTON_SPECS'
export const LABEL_PRINT_DEFAULT_BIZ_TYPE = '__DEFAULT__'
let templateRulesCache = null

const DEFAULT_SLITTING_CARTON_SPECS = [
  { value: 'CARTON_430_320_300', label: '430×320×300', lengthMm: 430, widthMm: 320, heightMm: 300 },
  { value: 'CARTON_500_380_350', label: '500×380×350', lengthMm: 500, widthMm: 380, heightMm: 350 },
  { value: 'CARTON_600_400_400', label: '600×400×400', lengthMm: 600, widthMm: 400, heightMm: 400 }
]

const DEFAULT_CONFIG = {
  enabled: true,
  endpoint: 'http://127.0.0.1:9123/print',
  apiKey: '',
  timeoutMs: 30000,
  printConcurrency: 3,
  allowBrowserFallback: false
}

export function getBarTenderConfig(baseConfig = {}) {
  let local = {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    local = raw ? (JSON.parse(raw) || {}) : {}
  } catch (e) {
    local = {}
  }

  const merged = {
    ...DEFAULT_CONFIG,
    ...(baseConfig || {}),
    ...(local || {})
  }

  if (!merged.endpoint) merged.endpoint = DEFAULT_CONFIG.endpoint
  if (typeof merged.enabled !== 'boolean') merged.enabled = true
  const timeoutMs = Number(merged.timeoutMs)
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    merged.timeoutMs = DEFAULT_CONFIG.timeoutMs
  } else {
    // 兼容历史配置的 8s 超时：BarTender 首次加载模板可能超过 8s，统一抬高到 30s
    merged.timeoutMs = Math.max(30000, Math.trunc(timeoutMs))
  }

  const printConcurrency = Number(merged.printConcurrency)
  if (!Number.isFinite(printConcurrency) || printConcurrency <= 0) {
    merged.printConcurrency = DEFAULT_CONFIG.printConcurrency
  } else {
    merged.printConcurrency = Math.max(1, Math.min(8, Math.trunc(printConcurrency)))
  }

  return merged
}

export function saveBarTenderConfig(config = {}) {
  const merged = getBarTenderConfig(config)
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
  return merged
}

export function getTemplateRules(baseRules = {}) {
  let local = {}
  try {
    const raw = window.localStorage.getItem(TEMPLATE_RULES_KEY)
    local = raw ? (JSON.parse(raw) || {}) : {}
  } catch (e) {
    local = {}
  }

  const merged = {
    byBizType: {},
    byCustomer: {},
    ...(baseRules || {}),
    ...(local || {})
  }

  if (!merged.byBizType || typeof merged.byBizType !== 'object') merged.byBizType = {}
  if (!merged.byCustomer || typeof merged.byCustomer !== 'object') merged.byCustomer = {}
  return merged
}

export function saveTemplateRules(rules = {}) {
  window.localStorage.setItem(TEMPLATE_RULES_KEY, JSON.stringify(rules || {}))
  templateRulesCache = getTemplateRules(rules)
  return getTemplateRules(rules)
}

export function getSlittingCartonSpecs(baseSpecs = []) {
  let local = []
  try {
    const raw = window.localStorage.getItem(SLITTING_CARTON_SPECS_KEY)
    local = raw ? (JSON.parse(raw) || []) : []
  } catch (e) {
    local = []
  }

  const src = Array.isArray(local) && local.length
    ? local
    : (Array.isArray(baseSpecs) && baseSpecs.length ? baseSpecs : DEFAULT_SLITTING_CARTON_SPECS)

  return (src || []).map((item, idx) => {
    const lengthMm = Number(item && item.lengthMm)
    const widthMm = Number(item && item.widthMm)
    const heightMm = Number(item && item.heightMm)
    const value = String((item && item.value) || `CARTON_${idx + 1}`).trim()
    const label = String((item && item.label) || `${lengthMm || 0}×${widthMm || 0}×${heightMm || 0}`).trim()
    return {
      value,
      label,
      lengthMm: Number.isFinite(lengthMm) ? lengthMm : 0,
      widthMm: Number.isFinite(widthMm) ? widthMm : 0,
      heightMm: Number.isFinite(heightMm) ? heightMm : 0
    }
  }).filter(x => x.lengthMm > 0 && x.widthMm > 0 && x.heightMm > 0)
}

export function saveSlittingCartonSpecs(specs = []) {
  const normalized = getSlittingCartonSpecs(specs)
  window.localStorage.setItem(SLITTING_CARTON_SPECS_KEY, JSON.stringify(normalized))
  return normalized
}

export function getSlittingMaterialCartonSpecs(baseSpecs = []) {
  let local = []
  try {
    const raw = window.localStorage.getItem(SLITTING_MATERIAL_CARTON_SPECS_KEY)
    local = raw ? (JSON.parse(raw) || []) : []
  } catch (e) {
    local = []
  }

  const src = Array.isArray(local) && local.length
    ? local
    : (Array.isArray(baseSpecs) ? baseSpecs : [])

  return (src || []).map((item, idx) => {
    const materialCode = String((item && item.materialCode) || '').trim().toUpperCase()
    const lengthMm = Number(item && item.lengthMm)
    const widthMm = Number(item && item.widthMm)
    const heightMm = Number(item && item.heightMm)
    const value = String((item && item.value) || `CARTON_${idx + 1}`).trim()
    const label = String((item && item.label) || `${lengthMm || 0}×${widthMm || 0}×${heightMm || 0}`).trim()
    return {
      materialCode,
      value,
      label,
      lengthMm: Number.isFinite(lengthMm) ? lengthMm : 0,
      widthMm: Number.isFinite(widthMm) ? widthMm : 0,
      heightMm: Number.isFinite(heightMm) ? heightMm : 0
    }
  }).filter(x => x.materialCode && x.lengthMm > 0 && x.widthMm > 0 && x.heightMm > 0)
}

export function saveSlittingMaterialCartonSpecs(specs = []) {
  const normalized = getSlittingMaterialCartonSpecs(specs)
  window.localStorage.setItem(SLITTING_MATERIAL_CARTON_SPECS_KEY, JSON.stringify(normalized))
  return normalized
}

export function getSlittingCartonSpecsByMaterial(materialCode = '', fallbackSpecs = []) {
  const code = String(materialCode || '').trim().toUpperCase()
  const mappings = getSlittingMaterialCartonSpecs()
  const rows = code ? mappings.filter(x => x.materialCode === code) : mappings
  const mapped = rows.map(item => ({
    value: String(item.value || '').trim(),
    label: String(item.label || '').trim(),
    lengthMm: Number(item.lengthMm || 0),
    widthMm: Number(item.widthMm || 0),
    heightMm: Number(item.heightMm || 0)
  })).filter(x => x.value && x.lengthMm > 0 && x.widthMm > 0 && x.heightMm > 0)

  if (mapped.length) return mapped
  return getSlittingCartonSpecs(fallbackSpecs)
}

function normalizeLabelPrintConfigs(records = []) {
  const byBizType = {}
  const byCustomer = {}

  ;(records || []).forEach(item => {
    const bizType = String((item && item.bizType) || '').trim().toUpperCase()
    const templateKey = String((item && item.templateKey) || '').trim()
    const customerCode = String((item && item.customerCode) || '').trim().toUpperCase()
    if (!bizType || !templateKey) return

    if (customerCode) {
      if (!byCustomer[customerCode]) byCustomer[customerCode] = { byBizType: {}}
      if (bizType === LABEL_PRINT_DEFAULT_BIZ_TYPE) {
        byCustomer[customerCode].default = templateKey
      } else {
        byCustomer[customerCode].byBizType[bizType] = templateKey
      }
    } else {
      if (bizType !== LABEL_PRINT_DEFAULT_BIZ_TYPE) {
        byBizType[bizType] = templateKey
      }
    }
  })

  return { byBizType, byCustomer }
}

export async function loadTemplateRules(force = false) {
  if (!force && templateRulesCache) return templateRulesCache

  try {
    const res = await getActiveLabelPrintConfigs()
    const records = Array.isArray(res && res.data) ? res.data : []
    const normalized = normalizeLabelPrintConfigs(records)
    return saveTemplateRules(normalized)
  } catch (error) {
    return templateRulesCache || getTemplateRules()
  }
}

function resolveSceneValue(value, source, runtime = {}) {
  if (typeof value === 'function') {
    return value(source, runtime)
  }
  return value
}

function getGatewayBaseUrl(config = {}) {
  const cfg = getBarTenderConfig(config)
  const endpoint = String(cfg.endpoint || '').trim()
  if (!endpoint) throw new Error('BarTender endpoint 未配置')
  return endpoint.replace(/\/print\/?$/i, '')
}

async function gatewayFetch(path, options = {}, config = {}) {
  const cfg = getBarTenderConfig(config)
  const baseUrl = getGatewayBaseUrl(cfg)
  const controller = new AbortController()
  const timeoutMs = Number(cfg.timeoutMs || 30000)
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const headers = {
      ...(options.headers || {})
    }
    if (cfg.apiKey) headers['X-Api-Key'] = cfg.apiKey

    let resp
    try {
      resp = await fetch(`${baseUrl}${path}`, {
        ...options,
        headers,
        signal: controller.signal
      })
    } catch (error) {
      if (error && error.name === 'AbortError') {
        throw new Error(`请求网关超时（${timeoutMs}ms）`)
      }
      throw error
    }
    const data = await resp.json().catch(() => ({}))
    if (!resp.ok) {
      throw new Error((data && (data.message || data.msg)) || `HTTP ${resp.status}`)
    }
    return data
  } finally {
    clearTimeout(timer)
  }
}

function firstNotBlank(...values) {
  for (let i = 0; i < values.length; i++) {
    const text = String(values[i] == null ? '' : values[i]).trim()
    if (text) return text
  }
  return ''
}

async function reportPrintRecord({ payload = {}, trace = {}, result = null, error = null } = {}) {
  try {
    const data = (payload && payload.data) || {}
    const body = {
      sceneName: firstNotBlank(trace.sceneName),
      bizType: firstNotBlank(trace.bizType),
      templateKey: firstNotBlank(payload.template),
      jobName: firstNotBlank(payload.jobName),
      copies: Number(payload.copies || 1),
      customerCode: firstNotBlank(trace.customerCode, data.customerCode),
      customerOrderNo: firstNotBlank(trace.customerOrderNo, data.customerOrderNo),
      orderNo: firstNotBlank(trace.orderNo, data.orderNo),
      materialCode: firstNotBlank(trace.materialCode, data.materialCode, data.internalMaterialCode),
      materialName: firstNotBlank(trace.materialName, data.materialName, data.internalMaterialName),
      batchNo: firstNotBlank(trace.batchNo, data.batchNo, data.issueBatchNo, data.slittingBatchNo),
      printerName: firstNotBlank(trace.printerName, payload.printer),
      printStatus: error ? 'FAIL' : 'SUCCESS',
      resultMessage: error ? String((error && error.message) || error || '').trim() : firstNotBlank(result && (result.message || result.msg)),
      printData: data,
      printPayload: payload,
      printResult: result || null
    }

    const headers = { 'Content-Type': 'application/json; charset=utf-8' }
    const token = getToken()
    if (token) headers['X-Token'] = token

    const apiBase = String(process.env.VUE_APP_BASE_API || '/dev-api').replace(/\/$/, '')
    await fetch(`${apiBase}/production/label-print-record/save`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    })
  } catch (e) {
    // 忽略日志上报异常，避免影响主打印流程
  }
}

export function resolveTemplateKey({ bizType = '', customerCode = '', defaultTemplate = '' } = {}, rules = {}) {
  const cfg = getTemplateRules(rules)
  const b = String(bizType || '').trim().toUpperCase()
  const c = String(customerCode || '').trim().toUpperCase()

  // 1) 客户+业务优先：byCustomer.CUST001.byBizType.COATING_ROLL_LABEL
  if (c && cfg.byCustomer[c]) {
    const cRule = cfg.byCustomer[c]
    if (cRule && cRule.byBizType && b && cRule.byBizType[b]) {
      return String(cRule.byBizType[b]).trim()
    }
    // 2) 客户默认模板：byCustomer.CUST001.default
    if (cRule && cRule.default) {
      return String(cRule.default).trim()
    }
  }

  // 3) 全局业务模板：byBizType.COATING_ROLL_LABEL
  if (b && cfg.byBizType[b]) {
    return String(cfg.byBizType[b]).trim()
  }

  // 4) 调用方默认模板
  return String(defaultTemplate || '').trim()
}

export async function sendBarTenderPrint(payload, config = {}, trace = {}) {
  const cfg = getBarTenderConfig(config)
  if (!cfg.enabled) {
    throw new Error('BarTender is disabled in MES_BARTENDER_CONFIG')
  }

  const endpoint = String(cfg.endpoint || '').trim()
  if (!endpoint) {
    throw new Error('BarTender endpoint 未配置')
  }

  const controller = new AbortController()
  const timeoutMs = Number(cfg.timeoutMs || 30000)
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  let failureReported = false

  try {
    const headers = { 'Content-Type': 'application/json; charset=utf-8' }
    if (cfg.apiKey) headers['X-Api-Key'] = cfg.apiKey

    let resp
    try {
      resp = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal
      })
    } catch (error) {
      if (error && error.name === 'AbortError') {
        throw new Error(`打印请求超时（${timeoutMs}ms）`)
      }
      throw error
    }

    const data = await resp.json().catch(() => ({}))
    if (!resp.ok) {
      const err = new Error((data && (data.message || data.msg)) || `HTTP ${resp.status}`)
      reportPrintRecord({ payload, trace, result: data || null, error: err }).catch(() => {})
      failureReported = true
      throw err
    }
    reportPrintRecord({ payload, trace, result: data || null, error: null }).catch(() => {})
    return data || {}
  } catch (error) {
    if (!failureReported) {
      reportPrintRecord({ payload, trace, result: null, error }).catch(() => {})
    }
    throw error
  } finally {
    clearTimeout(timer)
  }
}

export async function fetchGatewayConfig(config = {}) {
  const data = await gatewayFetch('/config', { method: 'GET' }, config)
  return data && data.data ? data.data : {}
}

export async function saveGatewayConfig(payload, config = {}) {
  const data = await gatewayFetch('/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(payload || {})
  }, config)
  return data && data.data ? data.data : {}
}

export async function fetchGatewayPrinters(config = {}) {
  const data = await gatewayFetch('/printers', { method: 'GET' }, config)
  return Array.isArray(data && data.data) ? data.data : []
}

export async function fetchGatewayLastRequest(config = {}) {
  const data = await gatewayFetch('/last', { method: 'GET' }, config)
  return data || {}
}

export async function fetchGatewayPreview(payload = {}, config = {}) {
  const data = await gatewayFetch('/preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(payload || {})
  }, config)
  return data && data.data ? data.data : {}
}

export async function fetchGatewayDashboard(config = {}) {
  try {
    const data = await gatewayFetch('/dashboard', { method: 'GET' }, config)
    return (data && data.data) ? data.data : {}
  } catch (error) {
    const msg = String((error && error.message) || '')
    if (!/404/i.test(msg)) throw error

    const [healthRaw, cfg, printers, lastRaw] = await Promise.all([
      gatewayFetch('/health', { method: 'GET' }, config).catch(() => ({})),
      fetchGatewayConfig(config).catch(() => ({})),
      fetchGatewayPrinters(config).catch(() => ([])),
      fetchGatewayLastRequest(config).catch(() => ({}))
    ])

    const templates = (cfg && cfg.templates) || {}
    const templateKeys = Object.keys(templates)

    const healthOk = !!(healthRaw && healthRaw.ok)

    return {
      service: {
        // 兼容模式下已能访问到网关（/dashboard 返回 404），因此至少网关进程在线
        status: 'online',
        healthOk,
        startedAt: '',
        now: (healthRaw && healthRaw.ts) || '',
        uptimeSeconds: 0,
        listenPrefix: String((cfg && cfg.listenPrefix) || '').trim(),
        configPath: ''
      },
      templates: {
        configuredCount: templateKeys.length,
        configuredKeys: templateKeys
      },
      sync: {
        manifestUrl: '',
        templateDir: '',
        localManifestPath: '',
        syncedCount: templateKeys.length,
        localManifestCount: templateKeys.length,
        latestSyncAt: ''
      },
      printers: {
        count: Array.isArray(printers) ? printers.length : 0,
        names: Array.isArray(printers) ? printers.map(x => String((x && (x.Name || x.name)) || '').trim()).filter(Boolean) : []
      },
      lastPrint: {
        payload: (lastRaw && lastRaw.payload) || null,
        result: (lastRaw && lastRaw.result) || null
      },
      compatibility: {
        fallback: true,
        reason: 'gateway_dashboard_endpoint_not_found'
      }
    }
  }
}

export async function syncGatewayTemplates(config = {}, options = {}) {
  const manifestUrl = String(options.manifestUrl || `${window.location.origin}/api/print-template/manifest`).trim()
  if (!manifestUrl) {
    throw new Error('manifestUrl 未配置')
  }

  const payload = {
    manifestUrl,
    templateDir: String(options.templateDir || '').trim(),
    localManifestPath: String(options.localManifestPath || '').trim(),
    configPath: String(options.configPath || '').trim(),
    defaultPrinter: String(options.defaultPrinter || '').trim(),
    apiKey: String(options.apiKey || '').trim(),
    authToken: String(options.authToken || getToken() || '').trim()
  }

  const data = await gatewayFetch('/sync-templates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(payload)
  }, config)
  return data || {}
}

export async function printByTemplate(template, data, options = {}, config = {}, trace = {}) {
  const payload = {
    template,
    jobName: options.jobName || `${template}_${Date.now()}`,
    copies: Number(options.copies || 1),
    data: data || {}
  }
  return sendBarTenderPrint(payload, config, trace)
}

export async function printByRule({ bizType = '', customerCode = '', defaultTemplate = '', data = {}, options = {}, config = {}, rules = {}, trace = {}} = {}) {
  const resolvedRules = Object.keys(rules || {}).length ? getTemplateRules(rules) : await loadTemplateRules()
  const template = resolveTemplateKey({ bizType, customerCode, defaultTemplate }, resolvedRules)
  if (!template) {
    throw new Error('未找到可用模板，请检查 MES_PRINT_TEMPLATE_RULES 配置')
  }
  return printByTemplate(template, data, options, config, {
    ...(trace || {}),
    bizType,
    customerCode,
    customerOrderNo: (data && data.customerOrderNo) || '',
    orderNo: (data && data.orderNo) || '',
    materialCode: (data && (data.materialCode || data.internalMaterialCode)) || '',
    materialName: (data && (data.materialName || data.internalMaterialName)) || '',
    batchNo: (data && (data.batchNo || data.issueBatchNo || data.slittingBatchNo)) || ''
  })
}

export async function printByScene(scene = {}, source = {}, runtime = {}) {
  const bizType = String(resolveSceneValue(scene.bizType, source, runtime) || '').trim()
  const customerCode = String(resolveSceneValue(scene.customerCode, source, runtime) || '').trim()
  const sceneName = String(resolveSceneValue(scene.sceneName, source, runtime) || '').trim()
  const defaultTemplate = String(resolveSceneValue(scene.defaultTemplate, source, runtime) || '').trim()
  const data = resolveSceneValue(scene.data || scene.buildData, source, runtime) || {}
  const options = resolveSceneValue(scene.options || scene.buildOptions, source, runtime) || {}
  const config = runtime.config || scene.config || {}
  const rules = runtime.rules || scene.rules || {}

  return printByRule({
    bizType,
    customerCode,
    defaultTemplate,
    data,
    options,
    config,
    rules,
    trace: {
      sceneName,
      customerOrderNo: (data && data.customerOrderNo) || '',
      orderNo: (data && data.orderNo) || '',
      materialCode: (data && (data.materialCode || data.internalMaterialCode)) || '',
      materialName: (data && (data.materialName || data.internalMaterialName)) || '',
      batchNo: (data && (data.batchNo || data.issueBatchNo || data.slittingBatchNo)) || ''
    }
  })
}

export function buildPrintConfigRoute({
  bizType = '',
  defaultTemplate = '',
  customerCode = '',
  sourceTitle = '',
  sceneName = '',
  returnTo = ''
} = {}) {
  const query = {}
  if (bizType) query.bizType = String(bizType).trim()
  if (defaultTemplate) query.defaultTemplate = String(defaultTemplate).trim()
  if (customerCode) query.customerCode = String(customerCode).trim()
  if (sourceTitle) query.sourceTitle = String(sourceTitle).trim()
  if (sceneName) query.sceneName = String(sceneName).trim()
  if (returnTo) query.returnTo = String(returnTo).trim()

  return {
    name: 'PrintConfig',
    query
  }
}

export function goToPrintConfig(router, options = {}) {
  const route = buildPrintConfigRoute(options)
  if (router && typeof router.push === 'function') {
    router.push(route)
  }
  return route
}
