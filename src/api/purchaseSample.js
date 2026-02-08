import request from '@/utils/request'

export function listPurchaseSamples(params) {
  return request({
    url: '/purchase/samples',
    method: 'get',
    params
  })
}

export function getPurchaseSampleDetail(sampleNo) {
  return request({
    url: `/purchase/samples/${sampleNo}`,
    method: 'get'
  })
}

export function createPurchaseSample(data) {
  return request({
    url: '/purchase/samples',
    method: 'post',
    data
  })
}

export function updatePurchaseSample(data) {
  return request({
    url: '/purchase/samples',
    method: 'put',
    data
  })
}

export function deletePurchaseSample(sampleNo) {
  return request({
    url: `/purchase/samples/${sampleNo}`,
    method: 'delete'
  })
}
