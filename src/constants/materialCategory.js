const CATEGORY_DICT = {
  FILM: { code: 'FILM', label: '薄膜' },
  CHEMICAL: { code: 'CHEMICAL', label: '化工' },
  PACKAGING: { code: 'PACKAGING', label: '包材' },
  UNKNOWN: { code: 'UNKNOWN', label: '未分类' }
}

const PACKAGING_PREFIXES = ['BZ', 'PK', 'BOX', 'CARTON', 'LABEL', 'CORE', 'TUBE']
const FILM_PREFIXES = ['FM', 'FILM']
const CHEMICAL_PREFIXES = ['CH', 'CHEM', 'ADH', 'SOLV', 'ADD']

function normalize(value) {
  return String(value || '').trim().toUpperCase()
}

function startsWithAny(target, prefixes = []) {
  return prefixes.some(prefix => target.startsWith(prefix))
}

export function resolveMaterialCategory({ materialCode, sourceType, explicitCategory } = {}) {
  const explicit = normalize(explicitCategory)
  if (explicit === '薄膜' || explicit === 'FILM') return CATEGORY_DICT.FILM
  if (explicit === '化工' || explicit === 'CHEMICAL') return CATEGORY_DICT.CHEMICAL
  if (explicit === '包材' || explicit === 'PACKAGING') return CATEGORY_DICT.PACKAGING

  const source = normalize(sourceType)
  if (source === 'FILM') return CATEGORY_DICT.FILM
  if (source === 'CHEMICAL') return CATEGORY_DICT.CHEMICAL

  const code = normalize(materialCode)
  if (!code) return CATEGORY_DICT.UNKNOWN

  if (startsWithAny(code, FILM_PREFIXES)) return CATEGORY_DICT.FILM
  if (startsWithAny(code, CHEMICAL_PREFIXES)) return CATEGORY_DICT.CHEMICAL
  if (startsWithAny(code, PACKAGING_PREFIXES)) return CATEGORY_DICT.PACKAGING

  // 常见格式兜底（如 1011-R02-... 默认按薄膜/胶带体系）
  if (/^\d{3,4}-/.test(code)) return CATEGORY_DICT.FILM

  return CATEGORY_DICT.UNKNOWN
}

export function getMaterialCategoryOptions() {
  return [
    CATEGORY_DICT.FILM,
    CATEGORY_DICT.CHEMICAL,
    CATEGORY_DICT.PACKAGING,
    CATEGORY_DICT.UNKNOWN
  ]
}

export default CATEGORY_DICT
