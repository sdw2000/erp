<template>
  <div class="app-container">
    <el-card>
      <div slot="header" class="clearfix">
        <span>对账管理（诊断与缓存）</span>
      </div>

      <el-form :inline="true" size="small" class="mb12">
        <el-form-item>
          <el-button type="warning" @click="clearCache">清理总览缓存</el-button>
        </el-form-item>
        <el-form-item>
          <el-input v-model="ids" placeholder="输入 noticeItemId 列表，逗号分隔" style="width:360px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="diagnose">运行诊断</el-button>
        </el-form-item>
      </el-form>

      <el-table :data="rows" stripe border>
        <el-table-column prop="notice_item_id" label="notice_item_id" width="140" />
        <el-table-column prop="statement_month" label="statement_month" width="120" />
        <el-table-column prop="is_deleted" label="is_deleted" width="100" />
        <el-table-column prop="updated_by" label="updated_by" width="140" />
        <el-table-column prop="updated_at" label="updated_at" width="160" />
      </el-table>
    </el-card>
  </div>
</template>

<script>
import request from '@/utils/request'

export default {
  name: 'FinanceReconciliationAdmin',
  data() {
    return { ids: '', rows: [] }
  },
  methods: {
    async clearCache() {
      const res = await request({ url: '/sales/reconciliation/admin/clear-overview-cache', method: 'post' })
      if (res && (res.code === 200 || res.code === 20000)) this.$message.success('已清理')
    },
    async diagnose() {
      const res = await request({ url: '/sales/reconciliation/admin/diagnose-deleted-confirms', method: 'get', params: { ids: this.ids }})
      if (res && (res.code === 200 || res.code === 20000)) {
        this.rows = res.data.rows || []
      }
    }
  }
}
</script>

<style scoped>
.mb12 { margin-bottom: 12px; }
</style>
