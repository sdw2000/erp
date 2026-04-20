import request from '@/utils/request'

// 统一库存流水分页查询
export function getUnifiedStockFlowPage(params) {
  return request({
    url: '/api/stock/flow/page',
    method: 'get',
    params
  })
}

// 查询指定库存对象流水
export function getUnifiedStockFlowByStock(stockType, stockId) {
  return request({
    url: `/api/stock/flow/by-stock/${stockType}/${stockId}`,
    method: 'get'
  })
}
