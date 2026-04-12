import { getFilmStockList, getChemicalStockList } from '@/api/rawMaterialStock'
import { resolveMaterialCategory } from '@/constants/materialCategory'

function isOk(res) {
  return res && (res.code === 200 || res.code === 20000)
}

function normalizeFilmRows(list = []) {
  return list.map(item => ({
    category: resolveMaterialCategory({
      sourceType: 'film',
      materialCode: item.materialCode,
      explicitCategory: '薄膜'
    }).label,
    sourceType: 'film',
    sourceId: item.id,
    materialCode: item.materialCode || '',
    materialName: item.materialName || '',
    specOrType: item.specDesc || (item.thickness ? `${item.thickness}μm` : '-'),
    total: Number(item.totalArea || 0),
    available: Number(item.availableArea || 0),
    locked: Number(item.lockedArea || 0),
    unit: '㎡',
    status: item.status || ''
  }))
}

function normalizeChemicalRows(list = []) {
  return list.map(item => ({
    category: resolveMaterialCategory({
      sourceType: 'chemical',
      materialCode: item.materialCode,
      explicitCategory: '化工'
    }).label,
    sourceType: 'chemical',
    sourceId: item.id,
    materialCode: item.materialCode || '',
    materialName: item.materialName || '',
    specOrType: item.chemicalType || '-',
    total: Number(item.totalQuantity || 0),
    available: Number(item.availableQuantity || 0),
    locked: Number(item.lockedQuantity || 0),
    unit: item.unit || '桶/包',
    status: item.status || ''
  }))
}

export async function getRawMaterialHubList() {
  const [filmRes, chemicalRes] = await Promise.all([
    getFilmStockList(),
    getChemicalStockList()
  ])

  const filmRows = isOk(filmRes) ? normalizeFilmRows(filmRes.data || []) : []
  const chemicalRows = isOk(chemicalRes) ? normalizeChemicalRows(chemicalRes.data || []) : []
  const records = [...filmRows, ...chemicalRows]
  const packagingCount = records.filter(x => x.category === '包材').length
  const unknownCount = records.filter(x => x.category === '未分类').length

  return {
    code: 20000,
    data: {
      records,
      summary: {
        filmCount: filmRows.length,
        chemicalCount: chemicalRows.length,
        packagingCount,
        unknownCount,
        totalCount: records.length
      }
    }
  }
}
