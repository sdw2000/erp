import { getActiveLabelPrintConfigs } from '@/api/labelPrintConfig'
import { getToken } from '@/utils/auth'

const STORAGE_KEY = 'MES_BARTENDER_CONFIG'
const TEMPLATE_RULES_KEY = 'MES_PRINT_TEMPLATE_RULES'
const SLITTING_CARTON_SPECS_KEY = 'MES_SLITTING_CARTON_SPECS'
const SLITTING_MATERIAL_CARTON_SPECS_KEY = 'MES_SLITTING_MATERIAL_CARTON_SPECS'
const PENDING_PRINT_BATCHES_KEY = 'MES_BARTENDER_PENDING_BATCHES'
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
  // 将默认超时显式提高到 60s
  timeoutMs: 60000,
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
    // 兼容历史配置：由于 BarTender 首次开模板可能极慢，最低改为 60s
    merged.timeoutMs = Math.max(60000, Math.trunc(timeoutMs))
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

function loadPendingPrintBatches() {
  try {
    const raw = window.localStorage.getItem(PENDING_PRINT_BATCHES_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch (e) {
    return []
  }
}

function savePendingPrintBatches(items = []) {
  const rows = Array.isArray(items) ? items : []
  window.localStorage.setItem(PENDING_PRINT_BATCHES_KEY, JSON.stringify(rows))
  return rows
}

function upsertPendingPrintBatch(item = {}) {
  const batchId = String(item.batchId || '').trim()
  if (!batchId) return
  const rows = loadPendingPrintBatches()
  const idx = rows.findIndex(x => String((x && x.batchId) || '').trim() === batchId)
  if (idx >= 0) {
    rows[idx] = {
      ...(rows[idx] || {}),
      ...(item || {}),
      updatedAt: new Date().toISOString()
    }
  } else {
    rows.unshift({
      ...(item || {}),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
  }
  // 仅保留最近200个批次，避免本地无限增长
  savePendingPrintBatches(rows.slice(0, 200))
}

function removePendingPrintBatchById(batchId = '') {
  const id = String(batchId || '').trim()
  if (!id) return
  const rows = loadPendingPrintBatches().filter(x => String((x && x.batchId) || '').trim() !== id)
  savePendingPrintBatches(rows)
}

export function getPendingPrintBatches() {
  return loadPendingPrintBatches()
}

export function clearPendingPrintBatch(batchId = '') {
  removePendingPrintBatchById(batchId)
}

async function reportPrintRecord({ payload = {}, trace = {}, result = null, error = null } = {}) {
  try {
    const isBatchPayload = Array.isArray(payload)
    const firstPayload = isBatchPayload ? (payload[0] || {}) : (payload || {})
    const data = (firstPayload && firstPayload.data) || {}
    const body = {
      sceneName: firstNotBlank(trace.sceneName),
      bizType: firstNotBlank(trace.bizType),
      templateKey: firstNotBlank(firstPayload.template),
      jobName: firstNotBlank(firstPayload.jobName),
      copies: Number(firstPayload.copies || 1),
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
      printResult: result || null,
      batchId: firstNotBlank(trace.batchId),
      batchCount: Number(trace.batchCount || (isBatchPayload ? payload.length : 1) || 1)
    }

    const headers = { 'Content-Type': 'application/json; charset=utf-8' }
    const token = getToken()
    if (token) headers['X-Token'] = token

    // 修正：使用相对路径通过 webpack proxy 转发，解决客户端访问 localhost:8090 连接被拒绝的问题
    // 开发模式下必须添加 /api-proxy 前缀，以便 vue.config.js 中的代理能正确识别并转发到后端
    const apiBase = process.env.NODE_ENV === 'development'
      ? '/api-proxy'
      : String(process.env.VUE_APP_BASE_API || '').replace(/\/$/, '')

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

  // 如果 payload 是数组，说明是批量任务
  const isBatch = Array.isArray(payload)
  const batchId = String((trace && trace.batchId) || '').trim()

  const controller = new AbortController()
  // 批量打印的任务可能需要更长时间处理，将超时时间进一步抬高
  const configuredTimeoutMs = Number(cfg.timeoutMs || 60000)
  const batchSize = isBatch ? payload.length : 1
  const batchTimeoutBySize = isBatch
    ? Math.min(600000, Math.max(120000, batchSize * 4000))
    : 0
  const timeoutMs = isBatch
    ? Math.max(configuredTimeoutMs, batchTimeoutBySize)
    : Math.max(60000, configuredTimeoutMs)
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  let failureReported = false

  try {
    const headers = { 'Content-Type': 'application/json; charset=utf-8' }
    if (cfg.apiKey) headers['X-Api-Key'] = cfg.apiKey

    // 批量任务先落本地“待确认队列”，防止页面异常导致任务丢失
    if (isBatch && batchId) {
      upsertPendingPrintBatch({
        batchId,
        status: 'pending',
        endpoint,
        batchCount: payload.length,
        trace: {
          sceneName: trace.sceneName || '',
          orderNo: trace.orderNo || '',
          batchCount: trace.batchCount || payload.length
        },
        payload
      })
    }

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
      if (isBatch && batchId) {
        upsertPendingPrintBatch({
          batchId,
          status: 'failed',
          lastError: String((err && err.message) || err || '').trim()
        })
      }
      reportPrintRecord({ payload, trace, result: data || null, error: err }).catch(() => {})
      failureReported = true
      throw err
    }
    if (isBatch && batchId) {
      removePendingPrintBatchById(batchId)
    }
    reportPrintRecord({ payload, trace, result: data || null, error: null }).catch(() => {})
    return data || {}
  } catch (error) {
    if (isBatch && batchId) {
      upsertPendingPrintBatch({
        batchId,
        status: 'failed',
        lastError: String((error && error.message) || error || '').trim()
      })
    }
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
  // 处理数组形式的批量数据
  if (Array.isArray(data)) {
    const payload = data.map((item, idx) => {
      const normalizedData = normalizePrintDataKeys(item || {})
      const itemOptions = Array.isArray(options) ? (options[idx] || {}) : (options || {})
      return {
        template: template,
        jobName: itemOptions.jobName || `${template}_${Date.now()}_${idx}`,
        copies: Number(itemOptions.copies || 1),
        data: normalizedData
      }
    })
    return sendBarTenderPrint(payload, config, trace)
  }

  const normalizedData = normalizePrintDataKeys(data || {})
  const payload = {
    template,
    jobName: options.jobName || `${template}_${Date.now()}`,
    copies: Number(options.copies || 1),
    data: normalizedData
  }
  return sendBarTenderPrint(payload, config, trace)
}

export async function printBySceneBatch(scene = {}, sources = [], runtime = {}) {
  if (!Array.isArray(sources) || !sources.length) return []
  
  const config = runtime.config || scene.config || {}
  const rules = runtime.rules || scene.rules || {}
  const resolvedRules = Object.keys(rules || {}).length ? getTemplateRules(rules) : await loadTemplateRules()
  const batchStamp = Date.now()
  const batchId = `BT_BATCH_${batchStamp}`
  const orderedSources = sources.map((source, idx) => ({ source, __idx: idx }))

  const serialCandidates = orderedSources.map(x => Number(x && x.source && x.source.serialNo))
  const allHaveSerial = serialCandidates.every(x => Number.isFinite(x) && x > 0)
  if (allHaveSerial) {
    const seen = new Set()
    for (let i = 0; i < serialCandidates.length; i++) {
      const n = Math.trunc(serialCandidates[i])
      if (seen.has(n)) {
        throw new Error(`批量打印序号重复：${n}`)
      }
      seen.add(n)
    }
  }
  
  const payloadBatch = orderedSources.map(({ source, __idx }) => {
    const idx = __idx
    const bizType = String(resolveSceneValue(scene.bizType, source, runtime) || '').trim()
    const customerCode = String(resolveSceneValue(scene.customerCode, source, runtime) || '').trim()
    const defaultTemplate = String(resolveSceneValue(scene.defaultTemplate, source, runtime) || '').trim()
    
    const template = resolveTemplateKey({ bizType, customerCode, defaultTemplate }, resolvedRules)
    if (!template) {
      throw new Error(`第 ${idx + 1} 个任务未找到可用模板`)
    }
    
    const data = resolveSceneValue(scene.data || scene.buildData, source, runtime) || {}
    const options = resolveSceneValue(scene.options || scene.buildOptions, source, runtime) || {}
    
    return {
      template,
      jobName: options.jobName || `${template}_${batchStamp}_${String(idx + 1).padStart(4, '0')}`,
      copies: Number(options.copies || 1),
      data: normalizePrintDataKeys(data),
      sequence: idx + 1,
      batchId
    }
  })

  // 这里的 trace 只取第一个作为记录参考（记录服务通常只存一个摘要）
  const firstSource = sources[0]
  const firstData = resolveSceneValue(scene.data || scene.buildData, firstSource, runtime) || {}
  const trace = {
    sceneName: String(resolveSceneValue(scene.sceneName, firstSource, runtime) || '').trim(),
    isBatch: true,
    batchId,
    batchCount: sources.length,
    orderNo: (firstData && firstData.orderNo) || ''
  }

  return sendBarTenderPrint(payloadBatch, config, trace)
}

function normalizePrintDataKeys(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return raw || {}
  }
  const src = { ...raw }

  // 优先保留 QRCode，移除大小写冲突的 qrCode
  if (Object.prototype.hasOwnProperty.call(src, 'QRCode') && Object.prototype.hasOwnProperty.call(src, 'qrCode')) {
    delete src.qrCode
  }

  const result = {}
  const seen = new Set()
  Object.keys(src).forEach((key) => {
    const lower = String(key || '').toLowerCase()
    if (!lower) return
    if (seen.has(lower)) return
    seen.add(lower)
    result[key] = src[key]
  })
  return result
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
