import request from '@/utils/request'

export function applyPayment(data) {
  return request({ url: '/finance/bank/payment/apply', method: 'post', data })
}

export function listBankAccounts(params) {
  return request({ url: '/finance/bank/accounts', method: 'get', params })
}

export function listBankTransactions(accountId, params) {
  return request({ url: `/finance/bank/transactions/${accountId}`, method: 'get', params })
}
