import request from '@/utils/request'

export function getUnreadMessageCount() {
  return request({
    url: '/system/messages/unread-count',
    method: 'get'
  })
}

export function getSystemMessagePage(params) {
  return request({
    url: '/system/messages/page',
    method: 'get',
    params
  })
}

export function markSystemMessageRead(id) {
  return request({
    url: `/system/messages/${id}/read`,
    method: 'post'
  })
}

export function markAllSystemMessageRead() {
  return request({
    url: '/system/messages/read-all',
    method: 'post'
  })
}
