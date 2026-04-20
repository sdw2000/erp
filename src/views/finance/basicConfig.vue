<template>
  <div class="app-container">
    <el-card>
      <div slot="header"><span>基本信息配置（月度固定费用）</span></div>
      <el-form :inline="true" size="small" class="mb12">
        <el-form-item label="月份">
          <el-date-picker v-model="query.month" type="month" value-format="yyyy-MM" style="width:140px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="el-icon-search" @click="load">读取</el-button>
        </el-form-item>
      </el-form>

      <el-form :model="form" label-width="120px" style="max-width:700px" size="small">
        <el-form-item label="房租(元)">
          <el-input-number v-model="form.rentAmount" :precision="2" :min="0" style="width:100%" />
        </el-form-item>
        <el-form-item label="水电(元)">
          <el-input-number v-model="form.utilitiesAmount" :precision="2" :min="0" style="width:100%" />
        </el-form-item>
        <el-form-item label="其他固定费用(元)">
          <el-input-number v-model="form.otherFixedAmount" :precision="2" :min="0" style="width:100%" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" maxlength="500" show-word-limit />
        </el-form-item>
        <el-form-item label="固定费用合计">
          <el-tag type="success">{{ totalFixed }}</el-tag>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="save">保存</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script>
import { getMonthlyBasicConfig, saveMonthlyBasicConfig } from '@/api/finance'

export default {
  name: 'FinanceBasicConfig',
  data() {
    return {
      query: { month: this.currentMonth() },
      form: {
        month: this.currentMonth(),
        rentAmount: 0,
        utilitiesAmount: 0,
        otherFixedAmount: 0,
        remark: ''
      }
    }
  },
  computed: {
    totalFixed() {
      const total = Number(this.form.rentAmount || 0) + Number(this.form.utilitiesAmount || 0) + Number(this.form.otherFixedAmount || 0)
      return total.toFixed(2)
    }
  },
  created() {
    this.load()
  },
  methods: {
    currentMonth() {
      const d = new Date()
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    },
    async load() {
      const res = await getMonthlyBasicConfig({ month: this.query.month })
      if (res && (res.code === 200 || res.code === 20000)) {
        this.form = Object.assign({}, this.form, res.data || {}, { month: this.query.month })
      }
    },
    async save() {
      const payload = Object.assign({}, this.form, { month: this.query.month })
      await saveMonthlyBasicConfig(payload)
      this.$message.success('保存成功')
      this.load()
    }
  }
}
</script>

<style scoped>
.mb12 { margin-bottom: 12px; }
</style>
