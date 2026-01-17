<template>
  <div class="sales-quote">
    <el-card>
      <div slot="header" class="clearfix">
        <span>报价管理</span>
        <el-button type="primary" style="float:right" @click="createQuote">新建报价</el-button>
      </div>

      <el-table :data="quotes" style="width:100%" stripe>
        <el-table-column prop="quoteNo" label="报价单号" width="160" />
        <el-table-column prop="customer" label="客户" width="200" />
        <el-table-column prop="validUntil" label="有效期" width="140" />
        <el-table-column prop="totalAmount" label="金额" width="120" />
        <el-table-column label="操作" width="160">
          <template slot-scope="scope">
            <el-button size="mini" @click="viewQuote(scope.row)">详情</el-button>
            <el-button size="mini" type="primary" @click="convertOrder(scope.row)">转订单</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script>
import axios from 'axios'
export default {
  name: 'SalesQuote',
  data() {
    return {
      quotes: []
    }
  },
  created() {
    this.fetchQuotes()
  },
  methods: {
    createQuote() {
      this.$message.info('新建报价（mock）')
    },
    async fetchQuotes() {
      try {
        const res = await axios.get('/api/sales/quotes')
        if (res.data && res.data.code === 200) {
          this.quotes = res.data.data
        }
      } catch (e) {
        this.$message.error('获取报价失败')
      }
    },
    viewQuote(row) {
      this.$message.info('查看报价（mock）: ' + row.quoteNo)
    },
    convertOrder(row) {
      this.$message.success('已转为订单（mock）')
    }
  }
}
</script>

<style scoped>
.sales-quote { padding: 20px }
</style>
