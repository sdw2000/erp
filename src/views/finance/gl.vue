<template>
  <div class="app-container">
    <el-card>
      <div slot="header" class="clearfix">
        <span>总账（GL）分录</span>
      </div>

      <el-table :data="entries" stripe border>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="voucher_no" label="凭证号" width="160" />
        <el-table-column prop="entry_date" label="日期" width="120" />
        <el-table-column prop="gl_account_id" label="科目ID" width="120" />
        <el-table-column prop="debit" label="借方" width="120" align="right" />
        <el-table-column prop="credit" label="贷方" width="120" align="right" />
        <el-table-column prop="description" label="说明" />
      </el-table>
    </el-card>
  </div>
</template>

<script>
import { listGlEntries } from '@/api/gl'

export default {
  name: 'FinanceGL',
  data() {
    return { entries: [] }
  },
  created() { this.load() },
  methods: {
    async load() {
      const res = await listGlEntries({ pageSize: 200 })
      if (res && (res.code === 200 || res.code === 20000)) this.entries = res.data || []
    }
  }
}
</script>

<style scoped></style>
