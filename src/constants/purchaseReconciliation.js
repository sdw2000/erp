export const PURCHASE_RECONCILIATION_STATUS = {
  UNRECONCILED: {
    text: '未对账',
    tag: 'info'
  },
  PARTIAL: {
    text: '部分对账',
    tag: 'warning'
  },
  MATCHED: {
    text: '已对账',
    tag: 'success'
  }
}

export function getPurchaseReconciliationMeta(status) {
  return PURCHASE_RECONCILIATION_STATUS[status] || {
    text: status || '-',
    tag: 'default'
  }
}

export function getPurchaseReconciliationOptions() {
  return [
    { label: PURCHASE_RECONCILIATION_STATUS.UNRECONCILED.text, value: 'UNRECONCILED' },
    { label: PURCHASE_RECONCILIATION_STATUS.PARTIAL.text, value: 'PARTIAL' },
    { label: PURCHASE_RECONCILIATION_STATUS.MATCHED.text, value: 'MATCHED' }
  ]
}
