import request from '@/utils/request'

export function listGlEntries(params) {
  return request({ url: '/finance/gl/entries', method: 'get', params })
}
