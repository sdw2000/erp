import request from '@/utils/request'

export function getCustomerLabelQrRule(customerCode, bizType = 'SLITTING_OUTER_LABEL') {
  return request({
    url: '/production/label-qr-rule/get',
    method: 'get',
    params: { customerCode, bizType }
  })
}

export function saveCustomerLabelQrRule(data) {
  return request({
    url: '/production/label-qr-rule/save',
    method: 'post',
    data
  })
}

export function pageCustomerLabelQrRule(params) {
  return request({
    url: '/production/label-qr-rule/page',
    method: 'get',
    params
  })
}

export function deleteCustomerLabelQrRule(customerCode, bizType = 'SLITTING_OUTER_LABEL') {
  return request({
    url: '/production/label-qr-rule/delete',
    method: 'delete',
    params: { customerCode, bizType }
  })
}
