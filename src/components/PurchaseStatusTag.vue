<template>
  <el-tag :type="meta.tag" :size="size">
    {{ meta.text }}
  </el-tag>
</template>

<script>
import { getPurchaseReconciliationMeta } from '@/constants/purchaseReconciliation'
import { getPurchaseStatusMeta } from '@/constants/purchaseStatus'

export default {
  name: 'PurchaseStatusTag',
  props: {
    kind: {
      type: String,
      default: 'purchase'
    },
    status: {
      type: String,
      default: ''
    },
    size: {
      type: String,
      default: 'small'
    }
  },
  computed: {
    meta() {
      if (this.kind === 'reconciliation') {
        return getPurchaseReconciliationMeta(this.status)
      }
      if (this.kind === 'purchase') {
        return getPurchaseStatusMeta(this.status)
      }
      return {
        text: this.status || '-',
        tag: 'default'
      }
    }
  }
}
</script>
