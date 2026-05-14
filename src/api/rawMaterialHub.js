import { getFilmStockList, getChemicalStockList } from '@/api/rawMaterialStock'
import { getRawMaterialPage } from '@/api/tapeRawMaterial'
import { resolveMaterialCategory } from '@/constants/materialCategory'

function isOk(res) {
  return res && (res.code === 200 || res.code === 20000)
}

function normalizeMaterialCode(code) {
  return String(code || '').trim().toUpperCase()
}

function formatSpecNumber(num) {
  const n = Number(num)
  if (!Number.isFinite(n)) return ''
  if (Math.abs(n - Math.round(n)) < 0.000001) {
    return String(Math.round(n))
  }
  return String(Number(n.toFixed(3)))
}

function normalizeFilmSpec(specDesc, thickness, width) {
  const raw = String(specDesc || '').trim()
  const tNum = Number(thickness)
  const wNum = Number(width)
  const t = Number.isFinite(tNum) && tNum > 0 ? formatSpecNumber(tNum) : ''
  const w = Number.isFinite(wNum) && wNum > 0 ? formatSpecNumber(wNum) : ''

  // 规格已经带单位时，原样展示（仅统一乘号）
  if (/(μm|um|mm|\bm\b)/i.test(raw)) {
    return raw.replace(/[xX×]/g, '*')
  }

  // 无单位规格：按“厚度*宽度*长度”补充单位
  if (raw) {
    const numbers = raw.match(/\d+(?:\.\d+)?/g) || []
    if (numbers.length >= 3) {
      const n1 = formatSpecNumber(numbers[0])
      const n2 = formatSpecNumber(numbers[1])
      const n3 = formatSpecNumber(numbers[2])
      return `${n1}μm*${n2}mm*${n3}m`
    }
    if (numbers.length === 2) {
      const n1 = formatSpecNumber(numbers[0])
      const n2 = formatSpecNumber(numbers[1])
      return `${n1}μm*${n2}mm`
    }
    if (numbers.length === 1 && t && w) {
      return `${t}μm*${w}mm*${formatSpecNumber(numbers[0])}m`
    }
  }

  if (t && w) {
    return `${t}μm*${w}mm`
  }
  if (t) {
    return `${t}μm`
  }
  return raw || '-'
}

function formatMaterialType(rawType) {
  const text = String(rawType || '').trim()
  if (!text) return ''
  const key = text.toLowerCase()
  const map = {
    resin: '树脂',
    solvent: '溶剂',
    additive: '助剂',
    curing: '固化剂'
  }
  return map[key] || text
}

async function fetchRawMaterialTypeMap() {
  try {
    const metaMap = {}
    let page = 1
    const size = 500
    let total = 0
    do {
      const res = await getRawMaterialPage({ page, size })
      if (!isOk(res)) break
      const data = (res && res.data) || {}
      const records = data.records || []
      records.forEach(item => {
        const code = normalizeMaterialCode(item && item.materialCode)
        if (!code) return
        if (!metaMap[code]) {
          metaMap[code] = {
            materialType: formatMaterialType(item && item.materialType),
            materialCategory: item && (item.materialCategoryRaw || item.materialCategory)
          }
        }
      })
      total = Number(data.total || 0)
      page += 1
    } while ((page - 1) * size < total)
    return metaMap
  } catch (e) {
    return {}
  }
}

function normalizeFilmRows(list = [], rawMetaMap = {}) {
  return list.map(item => ({
    ...(rawMetaMap[normalizeMaterialCode(item.materialCode)] || {}),
    category: resolveMaterialCategory({
      materialCode: item.materialCode,
      explicitCategory: (rawMetaMap[normalizeMaterialCode(item.materialCode)] || {}).materialCategory
    }).label,
    sourceType: 'film',
    sourceId: item.id,
    materialCode: item.materialCode || '',
    materialName: item.materialName || '',
    specOrType: normalizeFilmSpec(item.specDesc, item.thickness, item.width),
    total: Number(item.totalArea || 0),
    available: Number(item.availableArea || 0),
    locked: Number(item.lockedArea || 0),
    unit: '㎡',
    status: item.status || ''
  }))
}

  function normalizeChemicalRows(list = [], rawMetaMap = {}) {
  return list.map(item => ({
      ...(rawMetaMap[normalizeMaterialCode(item.materialCode)] || {}),
    category: resolveMaterialCategory({
      materialCode: item.materialCode,
        explicitCategory: (rawMetaMap[normalizeMaterialCode(item.materialCode)] || {}).materialCategory
    }).label,
    sourceType: 'chemical',
    sourceId: item.id,
    materialCode: item.materialCode || '',
    materialName: item.materialName || '',
    specOrType: ((rawMetaMap[normalizeMaterialCode(item.materialCode)] || {}).materialType) || item.chemicalType || '-',
    total: Number(item.totalQuantity || 0),
    available: Number(item.availableQuantity || 0),
    locked: Number(item.lockedQuantity || 0),
    unit: item.unit || '桶/包',
    status: item.status || ''
  }))
}

export async function getRawMaterialHubList() {
  const [filmRes, chemicalRes, rawMetaMap] = await Promise.all([
    getFilmStockList(),
    getChemicalStockList(),
    fetchRawMaterialTypeMap()
  ])

  const filmRows = isOk(filmRes) ? normalizeFilmRows(filmRes.data || [], rawMetaMap || {}) : []
  const chemicalRows = isOk(chemicalRes) ? normalizeChemicalRows(chemicalRes.data || [], rawMetaMap || {}) : []
  const records = [...filmRows, ...chemicalRows]
  const filmCount = records.filter(x => x.category === '薄膜').length
  const chemicalCount = records.filter(x => x.category === '化工').length
  const packagingCount = records.filter(x => x.category === '包材').length
  const unknownCount = records.filter(x => x.category === '未分类').length

  return {
    code: 20000,
    data: {
      records,
      summary: {
        filmCount,
        chemicalCount,
        packagingCount,
        unknownCount,
        totalCount: records.length
      }
    }
  }
}
