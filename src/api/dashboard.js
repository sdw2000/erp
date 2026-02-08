import request from '@/utils/request'

// 销售部仪表盘 API
export function getSalesSummary() {
  return request({ url: '/api/sales/dashboard/summary', method: 'get' })
}

export function getSalesTopCustomers() {
  return request({ url: '/api/sales/dashboard/top-customers', method: 'get' })
}

export function getSalesYearTrend() {
  return request({ url: '/api/sales/dashboard/year-trend', method: 'get' })
}

export function getSalesShipmentStats() {
  return request({ url: '/api/sales/dashboard/shipment-stats', method: 'get' })
}
