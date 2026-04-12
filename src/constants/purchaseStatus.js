export const PURCHASE_STATUS = {
  pending: {
    text: '待处理',
    tag: 'info'
  },
  processing: {
    text: '处理中',
    tag: 'warning'
  },
  completed: {
    text: '已完成',
    tag: 'success'
  },
  cancelled: {
    text: '已取消',
    tag: 'danger'
  },
  receiving: {
    text: '收货中',
    tag: 'warning'
  },
  received: {
    text: '已收货',
    tag: 'success'
  },
  partial: {
    text: '部分收货',
    tag: 'warning'
  },
  planned: {
    text: '计划中',
    tag: 'info'
  }
}

export function getPurchaseStatusMeta(status) {
  return PURCHASE_STATUS[status] || {
    text: status || '-',
    tag: 'default'
  }
}

export function getPurchaseStatusOptions() {
  return [
    { label: PURCHASE_STATUS.planned.text, value: 'planned' },
    { label: PURCHASE_STATUS.receiving.text, value: 'receiving' },
    { label: PURCHASE_STATUS.received.text, value: 'received' },
    { label: PURCHASE_STATUS.partial.text, value: 'partial' },
    { label: PURCHASE_STATUS.cancelled.text, value: 'cancelled' }
  ]
}
