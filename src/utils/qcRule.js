function safeText(value) {
  return value === null || value === undefined ? '' : String(value).trim()
}

function extractNumber(value) {
  const text = safeText(value)
  if (!text) return null
  const match = text.match(/-?\d+(?:\.\d+)?/)
  return match ? Number(match[0]) : null
}

function parseJsonValue(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value
  }
  const text = safeText(value)
  if (!text) return null
  try {
    const parsed = JSON.parse(text)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch (e) {
    return null
  }
}

function normalizeRule(rule) {
  const parsed = parseJsonValue(rule)
  if (!parsed) {
    const text = safeText(rule)
    return {
      label: text,
      standardValue: text,
      min: '',
      max: '',
      unit: '',
      judgeMode: 'value',
      remark: ''
    }
  }
  return {
    label: safeText(parsed.label || parsed.name || parsed.title || parsed.displayName),
    standardValue: safeText(parsed.standardValue || parsed.value),
    min: safeText(parsed.min || parsed.low),
    max: safeText(parsed.max || parsed.high),
    unit: safeText(parsed.unit),
    judgeMode: safeText(parsed.judgeMode || ((parsed.min !== undefined || parsed.low !== undefined || parsed.max !== undefined || parsed.high !== undefined) ? 'range' : 'value')) || 'value',
    remark: safeText(parsed.remark)
  }
}

function parseActualValue(actual) {
  const parsed = parseJsonValue(actual)
  if (parsed) return parsed
  const number = extractNumber(actual)
  return number === null ? safeText(actual) : number
}

function parseActualValues(actual) {
  if (Array.isArray(actual)) {
    return actual.map(item => parseActualValue(item))
  }
  if (actual === null || actual === undefined) {
    return []
  }
  return [parseActualValue(actual)]
}

function compareByRuleMode(normalized, actualValue, actualNumber) {
  if (actualValue === '' || actualValue === null || actualValue === undefined) {
    return { status: 'pending', passed: false, message: '缺少实测值' }
  }

  const hasRange = normalized.min !== '' || normalized.max !== ''
  const hasStandard = normalized.standardValue !== ''

  if (normalized.judgeMode === 'range' || hasRange) {
    if (actualNumber === null) {
      return { status: 'pending', passed: false, message: '实测值无法解析为数字' }
    }
    const min = normalized.min !== '' ? Number(normalized.min) : null
    const max = normalized.max !== '' ? Number(normalized.max) : null
    const lowerOk = min === null || actualNumber >= min
    const upperOk = max === null || actualNumber <= max
    const passed = lowerOk && upperOk
    return {
      status: passed ? 'pass' : 'fail',
      passed,
      message: passed ? '在允许范围内' : `超出范围(${normalized.min || '-'}~${normalized.max || '-'})`
    }
  }

  if (normalized.judgeMode === 'min') {
    if (actualNumber === null || normalized.min === '') {
      return { status: 'pending', passed: false, message: '最小值判定所需数据不足' }
    }
    const passed = actualNumber >= Number(normalized.min)
    return { status: passed ? 'pass' : 'fail', passed, message: passed ? '达到下限要求' : `低于下限(${normalized.min})` }
  }

  if (normalized.judgeMode === 'max') {
    if (actualNumber === null || normalized.max === '') {
      return { status: 'pending', passed: false, message: '最大值判定所需数据不足' }
    }
    const passed = actualNumber <= Number(normalized.max)
    return { status: passed ? 'pass' : 'fail', passed, message: passed ? '未超过上限' : `超过上限(${normalized.max})` }
  }

  if (normalized.judgeMode === 'value' || hasStandard) {
    if (actualNumber === null || normalized.standardValue === '') {
      return { status: 'pending', passed: false, message: '标准值判定所需数据不足' }
    }
    const passed = actualNumber === Number(normalized.standardValue)
    return { status: passed ? 'pass' : 'fail', passed, message: passed ? '符合标准值' : `不等于标准值(${normalized.standardValue})` }
  }

  return { status: 'pending', passed: false, message: '未配置有效判定规则' }
}

function compareSingleRule(rule, actual) {
  const normalized = normalizeRule(rule)
  const actualValues = parseActualValues(actual)

  const nonEmptyValues = actualValues.filter(v => !(v === '' || v === null || v === undefined))
  if (nonEmptyValues.length !== 5) {
    return {
      passed: false,
      status: 'pending',
      actual: actualValues,
      expected: normalized,
      message: `请录入5个实测值（当前${nonEmptyValues.length}个）`
    }
  }

  let failCount = 0
  let pendingCount = 0
  const messages = []
  nonEmptyValues.forEach((value, index) => {
    const actualNumber = typeof value === 'number' ? value : extractNumber(value)
    const judged = compareByRuleMode(normalized, value, actualNumber)
    if (judged.status === 'fail') {
      failCount += 1
      messages.push(`第${index + 1}次:${judged.message}`)
    } else if (judged.status === 'pending') {
      pendingCount += 1
      messages.push(`第${index + 1}次:${judged.message}`)
    }
  })

  const status = failCount > 0 ? 'fail' : (pendingCount > 0 ? 'pending' : 'pass')
  const result = {
    passed: status === 'pass',
    status,
    actual: actualValues,
    expected: normalized,
    message: status === 'pass' ? '5次检测值均在允许范围内' : messages.join('；')
  }
  return result
}

export function evaluateQcRules(ruleJson, actualJson) {
  const rule = parseJsonValue(ruleJson) || {}
  const actual = parseJsonValue(actualJson) || {}
  const ruleKeys = Object.keys(rule)
  const results = []
  let passCount = 0
  let failCount = 0
  let pendingCount = 0

  ruleKeys.forEach(key => {
    const itemResult = compareSingleRule(rule[key], actual[key])
    results.push({
      key,
      ...itemResult
    })
    if (itemResult.status === 'pass') passCount += 1
    else if (itemResult.status === 'fail') failCount += 1
    else pendingCount += 1
  })

  const overallResult = failCount > 0 ? 'fail' : (ruleKeys.length > 0 && pendingCount === 0 ? 'pass' : 'pending')
  return {
    overallResult,
    passCount,
    failCount,
    pendingCount,
    totalCount: ruleKeys.length,
    results
  }
}

export function summarizeQcRules(ruleJson) {
  const rule = parseJsonValue(ruleJson) || {}
  return Object.keys(rule).map(key => {
    const item = normalizeRule(rule[key])
    const pieces = []
    if (item.standardValue !== '') pieces.push(`标准值:${item.standardValue}`)
    if (item.min !== '') pieces.push(`下限:${item.min}`)
    if (item.max !== '') pieces.push(`上限:${item.max}`)
    if (item.unit) pieces.push(`单位:${item.unit}`)
    if (item.judgeMode) pieces.push(`判定:${item.judgeMode}`)
    return `${key}(${pieces.join('，')})`
  })
}

export function buildQcInspectionRows(ruleJson, actualJson) {
  const rule = parseJsonValue(ruleJson) || {}
  const actual = parseJsonValue(actualJson) || {}
  return Object.keys(rule).map(key => {
    const normalized = normalizeRule(rule[key])
    const rawActual = actual[key]
    const actualValues = Array.isArray(rawActual)
      ? rawActual.slice(0, 5)
      : (rawActual !== undefined && rawActual !== null && rawActual !== '' ? [rawActual] : [])
    while (actualValues.length < 5) actualValues.push('')
    return {
      key,
      label: normalized.label || key,
      actualValue: actualValues[0],
      actualValues,
      ...normalized
    }
  })
}
