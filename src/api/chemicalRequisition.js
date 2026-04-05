import request from '@/utils/request'

export function generateChemicalRequisition(params) {
  return request({
    url: '/api/stock/chemical-requisition/generate',
    method: 'post',
    params
  })
}

export function queryCoatingChemicalLocks(params) {
  return request({
    url: '/api/stock/chemical-requisition/lock-query',
    method: 'post',
    params
  })
}

export function confirmCoatingChemicalIssue(data) {
  return request({
    url: '/api/stock/chemical-requisition/issue-confirm',
    method: 'post',
    data
  })
}

export function getChemicalRequisitionPage(params) {
  return request({
    url: '/api/stock/chemical-requisition/page',
    method: 'get',
    params
  })
}

export function getChemicalRequisitionDetail(requestNo) {
  return request({
    url: `/api/stock/chemical-requisition/${requestNo}`,
    method: 'get'
  })
}

export function updateChemicalRequestedQty(itemId, requestedQty) {
  return request({
    url: `/api/stock/chemical-requisition/item/${itemId}/requested-qty`,
    method: 'put',
    params: { requestedQty }
  })
}

export function submitChemicalRequisition(requestNo) {
  return request({
    url: `/api/stock/chemical-requisition/${requestNo}/submit`,
    method: 'post'
  })
}

export function approveChemicalRequisition(requestNo) {
  return request({
    url: `/api/stock/chemical-requisition/${requestNo}/approve`,
    method: 'post'
  })
}

export function createChemicalPurchaseOrder(requestNo) {
  return request({
    url: `/api/stock/chemical-requisition/${requestNo}/create-purchase-order`,
    method: 'post'
  })
}

export function receiveChemicalRequisition(requestNo, data) {
  return request({
    url: `/api/stock/chemical-requisition/${requestNo}/receive`,
    method: 'post',
    data
  })
}
