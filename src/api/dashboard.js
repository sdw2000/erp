import request from '@/utils/request'

// 销售部仪表盘 API
export function getSalesSummary(params) {
  return request({ url: '/api/sales/dashboard/summary', method: 'get', params })
}

export function getSalesTopCustomers(params) {
  return request({ url: '/api/sales/dashboard/top-customers', method: 'get', params })
}

export function getSalesYearTrend(params) {
  return request({ url: '/api/sales/dashboard/year-trend', method: 'get', params })
}

export function getSalesShipmentStats(params) {
  return request({ url: '/api/sales/dashboard/shipment-stats', method: 'get', params })
}

export function getSalesTodayOrders(params) {
  return request({ url: '/api/sales/dashboard/today-orders', method: 'get', params })
}

// 生产看板 API
export function getProductionSummary(params) {
  return request({ url: '/api/production/dashboard/summary', method: 'get', params })
}

export function getProductionTopProcesses(params) {
  return request({ url: '/api/production/dashboard/top-processes', method: 'get', params })
}

export function getProductionYearTrend(params) {
  return request({ url: '/api/production/dashboard/year-trend', method: 'get', params })
}

export function getProductionTodayReports(params) {
  return request({ url: '/api/production/dashboard/today-reports', method: 'get', params })
}
