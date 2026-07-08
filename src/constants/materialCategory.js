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

  // 1. 优先使用原材料表里填写的明确分类 (支持同义词模糊匹配)
  const filmTerms = ['薄膜', 'FILM', '原膜', '泡棉', '基材', '膜', 'PE', 'PET', 'OPP', 'BOPP', '衬垫']
  const chemicalTerms = ['化工', 'CHEMICAL', '胶', '胶水', '溶剂', '助剂', '固化剂', '树脂', '油墨', '涂料']
  const packagingTerms = ['包材', 'PACKAGING', '包装', '管芯', '纸管', '胶管', '内盒', '外箱', '标签', '护角', '托盘']

  if (filmTerms.some(t => explicit.includes(t))) return CATEGORY_DICT.FILM
  if (chemicalTerms.some(t => explicit.includes(t))) return CATEGORY_DICT.CHEMICAL
  if (packagingTerms.some(t => explicit.includes(t))) return CATEGORY_DICT.PACKAGING

  // 2. 其次根据数据来源自动归类 (Film表出来的肯定属于薄膜类)
  const source = normalize(sourceType)
  if (source === 'FILM') return CATEGORY_DICT.FILM
  if (source === 'CHEMICAL') return CATEGORY_DICT.CHEMICAL
  if (source === 'PACKAGING') return CATEGORY_DICT.PACKAGING

  // 3. 不再根据物料代码前缀自动猜分类 (容易出错)
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
