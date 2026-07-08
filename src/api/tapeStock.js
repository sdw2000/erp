import request from '@/utils/request'

/**
 * čśĺ¸Śĺşĺ­çŽĄçAPI
 */

// ============= ĺşĺ­çŽĄç =============

// ĺéĄľćĽčŻ˘ĺşĺ­
export function getStockList(params) {
  return request({
    url: '/api/tape-stock/list',
    method: 'get',
    params
  })
}

// ĺ¤ĺˇć ç­žďźćç´˘ćŻĺˇĺˇ
export function searchMotherRolls(params) {
  return request({
    url: '/api/tape-stock/mother-roll/search',
    method: 'get',
    params
  })
}

// ĺ¤ĺˇć ç­žďźč§ŁććŻĺˇĺşçĄäżĄćŻ
export function resolveMotherRollInfo(code) {
  return request({
    url: `/api/tape-stock/mother-roll/resolve/${encodeURIComponent(code)}`,
    method: 'get'
  })
}

// ććĺˇćąćťĺşĺ­
export function getStockSummary() {
  return request({
    url: '/api/tape-stock/summary',
    method: 'get'
  })
}

// ććĺˇćąćťĺşĺ­ďźĺéĄľďź
export function getStockSummaryPage(params) {
  return request({
    url: '/api/tape-stock/summary/page',
    method: 'get',
    params
  })
}

// ć šćŽćĺˇćĽčŻ˘ćććšćŹĄďźFIFOćĺşďź
export function getStockByMaterial(materialCode) {
  return request({
    url: `/api/tape-stock/by-material/${materialCode}`,
    method: 'get'
  })
}

// ć šćŽćĺˇćĽčŻ˘ĺşĺ­ćçťďźĺéĄľďź
export function getStockByMaterialPage(params) {
  return request({
    url: '/api/tape-stock/by-material/page',
    method: 'get',
    params
  })
}

// ć šćŽIDćĽčŻ˘ĺşĺ­čŻŚć
export function getStockById(id) {
  return request({
    url: `/api/tape-stock/${id}`,
    method: 'get'
  })
}

// æ´æ°åºå­å­æ®µï¼åºä½ãæ°å­å·ï¼- ä»ç®¡çå
export function updateTapeStockField(id, data) {
  return request({
    url: `/api/tape-stock/${id}/update-field`,
    method: 'post',
    params: data
  })
}

// ĺşĺ­ççš
export function stocktakeTapeStock(id, data) {
  return request({
    url: `/api/tape-stock/${id}/stocktake`,
    method: 'post',
    data
  })
}

// ĺŻźĺĽExcelĺşĺ­ć°ćŽ
export function importStock(file) {
  const formData = new FormData()
  formData.append('file', file)
  return request({
    url: '/api/tape-stock/import',
    method: 'post',
    data: formData,
    timeout: 600000,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

// ĺźć­ĽĺŻźĺĽExcelĺşĺ­ć°ćŽďźć¨čďźĺ¤§ćäťś/ĺ¤§éć°ćŽďź
export function importStockAsync(file) {
  const formData = new FormData()
  formData.append('file', file)
  return request({
    url: '/api/tape-stock/import/async',
    method: 'post',
    data: formData,
    timeout: 60000,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

// ćĽčŻ˘ĺźć­ĽĺŻźĺĽäťťĺĄçść
export function getImportTaskStatus(taskId) {
  return request({
    url: `/api/tape-stock/import/task/${taskId}`,
    method: 'get',
    timeout: 60000
  })
}

// ä¸č˝˝ĺźć­ĽĺŻźĺĽĺ¤ąč´Ľćçťćäťś
export function downloadImportFailedFile(taskId) {
  return request({
    url: `/api/tape-stock/import/task/${taskId}/failed.xlsx`,
    method: 'get',
    responseType: 'blob'
  })
}

// ĺŻźĺşĺşĺ­ć°ćŽďźĺ¸Śtokenä¸č˝˝ďź
export function exportStock(params = {}) {
  return request({
    url: '/api/tape-stock/export',
    method: 'get',
    params,
    responseType: 'blob'
  })
}

// ä¸č˝˝ĺŻźĺĽć¨Ąćżďźĺ¸Śtokenä¸č˝˝ďź
export function downloadTemplate() {
  return request({
    url: '/api/tape-stock/template',
    method: 'get',
    responseType: 'blob'
  })
}

// ============= ĺĽĺşçłčŻˇ =============

// ĺéĄľćĽčŻ˘ĺĽĺşçłčŻˇ
export function getInboundList(params) {
  return request({
    url: '/api/tape-stock/inbound/list',
    method: 'get',
    params
  })
}

// ĺĺťşĺĽĺşçłčŻˇ
export function createInboundRequest(data) {
  return request({
    url: '/api/tape-stock/inbound',
    method: 'post',
    data
  })
}

// ĺŽĄćšĺĽĺşçłčŻˇ
export function approveInbound(id, approved, auditor, auditRemark, scannedRollCode, scannedLocation) {
  return request({
    url: `/api/tape-stock/inbound/${id}/approve`,
    method: 'post',
    params: { approved, auditor, auditRemark, scannedRollCode, scannedLocation }
  })
}

// ććŻĺˇĺˇćšéĺŽĄćšĺĽĺşďźĺä¸ĺĄćżďź
export function approveInboundByRollCodes(data) {
  return request({
    url: '/api/tape-stock/inbound/approve-by-roll-codes',
    method: 'post',
    data
  })
}

// ĺćśĺĽĺşçłčŻˇ
export function cancelInbound(id) {
  return request({
    url: `/api/tape-stock/inbound/${id}/cancel`,
    method: 'post'
  })
}

// éč´­ćśč´§ć ç­žćĺ°ĺç˝Žďźçćäşçť´ç ä¸ć ç­žć°ćŽďź
export function preparePurchaseInboundLabel(id, data) {
  return request({
    url: `/api/tape-stock/inbound/${id}/purchase-label/prepare`,
    method: 'post',
    data
  })
}

// ĺžĺŽĄćšĺĽĺşć°é
export function countPendingInbound() {
  return request({
    url: '/api/tape-stock/inbound/pending-count',
    method: 'get'
  })
}

// ĺĺ˛ĺĺćĺĺşĺ­čĺ
export function mergeHistoricalSlittingInboundStock() {
  return request({
    url: '/api/tape-stock/inbound/merge-historical-slitting',
    method: 'post'
  })
}

// ============= ĺşĺşçłčŻˇ =============

// ĺéĄľćĽčŻ˘ĺşĺşçłčŻˇ
export function getOutboundList(params) {
  return request({
    url: '/api/tape-stock/outbound/list',
    method: 'get',
    params
  })
}

// çťä¸ĺéĄľćĽčŻ˘ĺşĺşĺčĄ¨ďźčśĺ¸Śäş§ĺ + ĺććďź
export function getUnifiedOutboundList(params) {
  return request({
    url: '/api/tape-stock/outbound/unified-list',
    method: 'get',
    params
  })
}

// ĺĺťşĺşĺşçłčŻˇďźćĺ¨éćŠćšćŹĄďź
export function createOutboundRequest(data) {
  return request({
    url: '/api/tape-stock/outbound',
    method: 'post',
    data
  })
}

// äżŽćšĺşĺşçłčŻˇďźäťĺžĺŽĄćšďź
export function updateOutboundRequest(id, data) {
  return request({
    url: `/api/tape-stock/outbound/${id}`,
    method: 'put',
    data
  })
}

// ĺĺťşĺşĺşçłčŻˇďźFIFOčŞĺ¨ĺéďź
export function createOutboundRequestFIFO(params) {
  return request({
    url: '/api/tape-stock/outbound/fifo',
    method: 'post',
    params
  })
}

// ĺŽĄćšĺşĺşçłčŻˇ
export function approveOutbound(id, approved, auditor, auditRemark, scannedRollCode) {
  return request({
    url: `/api/tape-stock/outbound/${id}/approve`,
    method: 'post',
    params: { approved, auditor, auditRemark, scannedRollCode }
  })
}

// ćšéćŤç ĺŽĄćšĺşĺş
export function approveOutboundByRollCodes(data) {
  return request({
    url: '/api/tape-stock/outbound/approve-by-roll-codes',
    method: 'post',
    data
  })
}

// ĺćśĺşĺşçłčŻˇ
export function cancelOutbound(id) {
  return request({
    url: `/api/tape-stock/outbound/${id}/cancel`,
    method: 'post'
  })
}

// ĺžĺŽĄćšĺşĺşć°é
export function countPendingOutbound() {
  return request({
    url: '/api/tape-stock/outbound/pending-count',
    method: 'get'
  })
}

// ============= ĺşĺ­ćľć°´ =============

// ĺéĄľćĽčŻ˘ĺşĺ­ćľć°´
export function getStockLogList(params) {
  return request({
    url: '/api/tape-stock/log/list',
    method: 'get',
    params
  })
}

// ĺéĄľćĽčŻ˘ĺşĺşćľć°´ćąćťďźćĺłčĺĺˇ+ćĺˇ+ćšćŹĄčĺďź
export function getOutboundSummaryLogList(params) {
  return request({
    url: '/api/tape-stock/log/outbound-summary/list',
    method: 'get',
    params
  })
}

// ĺŻźĺşĺşĺ­ćľć°´URL
export function getExportLogUrl(params = {}) {
  const query = new URLSearchParams(params).toString()
  return `/api/tape-stock/log/export${query ? '?' + query : ''}`
}

// ˛éŃŻĹĚľăźÇÂź
export function getStocktakeRecordList(params) {
  return request({
    url: '/api/stocktake-record/list',
    method: 'get',
    params
  })
}

// ĹúÁżČˇČĎ/šŘąŐĹĚľăľĽ
export function confirmStocktakeBatch(stocktakeNo) {
  return request({
    url: '/api/stocktake-record/batch-confirm',
    method: 'post',
    params: { stocktakeNo }
  })
}
