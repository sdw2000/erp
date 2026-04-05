<template>
  <div class="company-config-page">
    <el-card>
      <div slot="header" class="header-row">
        <span class="title">公司信息配置</span>
        <div class="header-actions">
          <el-button type="danger" size="small" icon="el-icon-magic-stick" :loading="initializingQuotationBaseline" @click="initializeQuotationBaseline">初始化报价基线（一次性）</el-button>
          <el-button type="warning" size="small" icon="el-icon-upload2" :loading="uploadingStatus" @click="openStatusFile">上传订单状态表</el-button>
          <el-button type="warning" plain size="small" icon="el-icon-upload" :loading="uploadingCompletedOrders" @click="openCompletedOrderFile">导入历史完成订单</el-button>
          <el-button type="warning" plain size="small" icon="el-icon-upload" :loading="uploadingUncompletedOrders" @click="openUncompletedOrderFile">导入历史未完成订单</el-button>
          <el-button type="primary" size="small" icon="el-icon-check" :loading="saving" @click="saveConfig">保存配置</el-button>
          <input ref="statusFile" type="file" accept=".xlsx,.xls" style="display:none" @change="onStatusFileChange">
          <input ref="completedOrderFile" type="file" accept=".xlsx,.xls" style="display:none" @change="onCompletedOrderFileChange">
          <input ref="uncompletedOrderFile" type="file" accept=".xlsx,.xls" style="display:none" @change="onUncompletedOrderFileChange">
        </div>
      </div>

      <el-form :model="form" label-width="110px" class="config-form">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="公司名称">
              <el-input v-model="form.companyName" placeholder="请输入公司名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="公司网址">
              <el-input v-model="form.website" placeholder="如：www.example.com" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="联系电话">
              <el-input v-model="form.phone" placeholder="请输入电话" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="传真">
              <el-input v-model="form.fax" placeholder="请输入传真" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="公司地址">
          <el-input v-model="form.address" placeholder="请输入公司地址" />
        </el-form-item>

        <el-form-item label="Logo路径">
          <el-input v-model="form.logoUrl" placeholder="默认：/logo/finechem-logo.png" />
          <div class="tip">用于销售订单、发货通知、销售对账单等打印抬头。</div>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script>
import request from '@/utils/request'

export default {
  name: 'CompanyConfig',
  data() {
    return {
      saving: false,
      uploadingStatus: false,
      uploadingCompletedOrders: false,
      uploadingUncompletedOrders: false,
      initializingQuotationBaseline: false,
      form: {
        companyName: '',
        address: '',
        phone: '',
        fax: '',
        website: '',
        logoUrl: '/logo/finechem-logo.png'
      }
    }
  },
  created() {
    this.fetchConfig()
  },
  methods: {
    async fetchConfig() {
      try {
        const res = await request({ url: '/config/company', method: 'get' })
        if (res && (res.code === 200 || res.code === 20000) && res.data) {
          this.form = Object.assign({}, this.form, res.data)
        }
      } catch (e) {
        this.$message.error('加载公司配置失败')
      }
    },
    async saveConfig() {
      this.saving = true
      try {
        const operator = (this.$store && this.$store.getters && this.$store.getters.name) || 'system'
        const res = await request({
          url: '/config/company',
          method: 'post',
          data: {
            ...this.form,
            operator
          }
        })
        if (res && (res.code === 200 || res.code === 20000)) {
          this.$message.success('保存成功')
          this.fetchConfig()
        } else {
          this.$message.error((res && (res.msg || res.message)) || '保存失败')
        }
      } catch (e) {
        this.$message.error('保存失败')
      } finally {
        this.saving = false
      }
    },
    async initializeQuotationBaseline() {
      try {
        await this.$confirm(
          '将按“客户+料号+厚度+宽度+长度”从销售订单最新下单时间价格重建初始化报价基线。该操作会覆盖旧基线，是否继续？',
          '确认初始化报价基线',
          {
            confirmButtonText: '确认执行',
            cancelButtonText: '取消',
            type: 'warning'
          }
        )
      } catch (e) {
        return
      }

      this.initializingQuotationBaseline = true
      try {
        const operator = (this.$store && this.$store.getters && this.$store.getters.name) || 'system'
        const res = await request({
          url: '/quotation/initialize-from-orders',
          method: 'post',
          params: { operator },
          timeout: 180000
        })
        if (res && (res.code === 200 || res.code === 20000)) {
          const data = res.data || {}
          this.$message.success(
            `初始化完成：新建报价单${data.createdQuotations || 0}条，新建明细${data.createdItems || 0}条，清理旧基线报价单${data.deletedBaselineQuotations || 0}条`
          )
        } else {
          this.$message.error((res && (res.msg || res.message)) || '初始化失败')
        }
      } catch (err) {
        const backendMsg = (err && err.response && err.response.data && (err.response.data.msg || err.response.data.message)) || ''
        this.$message.error(backendMsg ? `初始化失败：${backendMsg}` : '初始化失败')
      } finally {
        this.initializingQuotationBaseline = false
      }
    },
    openStatusFile() {
      if (this.$refs.statusFile) {
        this.$refs.statusFile.click()
      }
    },
    openCompletedOrderFile() {
      if (this.$refs.completedOrderFile) {
        this.$refs.completedOrderFile.click()
      }
    },
    openUncompletedOrderFile() {
      if (this.$refs.uncompletedOrderFile) {
        this.$refs.uncompletedOrderFile.click()
      }
    },
    async onStatusFileChange(e) {
      const file = e.target.files && e.target.files[0]
      if (!file) return
      this.uploadingStatus = true
      try {
        const formData = new FormData()
        formData.append('file', file)
        const operator = (this.$store && this.$store.getters && this.$store.getters.name) || 'system'
        formData.append('operator', operator)
        const res = await request({
          url: '/config/order-status/upload',
          method: 'post',
          data: formData,
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 600000
        })
        if (res && (res.code === 200 || res.code === 20000)) {
          const data = res.data || {}
          const msg = `更新完成：上传订单${data.uploadedOrderCount || 0}，更新订单${data.updatedOrders || 0}，更新明细${data.updatedItems || 0}，默认完成订单${data.completedByDefaultOrders || 0}`
          this.$message.success(msg)
          const missing = Array.isArray(data.missingOrderNos) ? data.missingOrderNos : []
          if (missing.length > 0) {
            const lines = missing.slice(0, 200).map((x, idx) => `${idx + 1}. ${x}`)
            this.$alert(lines.join('\n'), '状态表中未匹配到系统订单号（最多200条）', { confirmButtonText: '确定' })
          }
        } else {
          this.$message.error((res && (res.msg || res.message)) || '上传失败')
        }
      } catch (err) {
        const backendMsg = (err && err.response && err.response.data && (err.response.data.msg || err.response.data.message)) || ''
        const status = err && err.response && err.response.status
        if (backendMsg) {
          this.$message.error(`上传失败：${backendMsg}`)
        } else if (status === 401) {
          this.$message.error('上传失败：未登录或登录已过期，请重新登录')
        } else if (status === 403) {
          this.$message.error('上传失败：当前账号无权限（仅管理员/生产可上传）')
        } else if (status === 413) {
          this.$message.error('上传失败：文件过大（当前限制20MB）')
        } else {
          this.$message.error('上传失败')
        }
      } finally {
        this.uploadingStatus = false
        if (this.$refs.statusFile) {
          this.$refs.statusFile.value = ''
        }
      }
    },
    async onCompletedOrderFileChange(e) {
      const file = e.target.files && e.target.files[0]
      if (!file) return
      this.uploadingCompletedOrders = true
      try {
        const formData = new FormData()
        formData.append('file', file)
        const operator = (this.$store && this.$store.getters && this.$store.getters.name) || 'system'
        formData.append('operator', operator)
        const res = await request({
          url: '/config/order-completed/upload',
          method: 'post',
          data: formData,
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 600000
        })
        if (res && (res.code === 200 || res.code === 20000)) {
          const data = res.data || {}
          const msg = `完成导入：上传${data.uploadedRows || 0}，匹配${data.matchedRows || 0}，更新明细${data.updatedItems || 0}，跳过报工明细${data.skippedReportedItems || 0}，更新订单${data.updatedOrders || 0}`
          this.$message.success(msg)
          const unmatched = Array.isArray(data.unmatchedKeys) ? data.unmatchedKeys : []
          if (unmatched.length > 0) {
            const lines = unmatched.slice(0, 200).map((x, idx) => `${idx + 1}. ${x}`)
            this.$alert(lines.join('\n'), '未匹配到系统明细（最多200条）', { confirmButtonText: '确定' })
          }
        } else {
          this.$message.error((res && (res.msg || res.message)) || '导入失败')
        }
      } catch (err) {
        const backendMsg = (err && err.response && err.response.data && (err.response.data.msg || err.response.data.message)) || ''
        this.$message.error(backendMsg ? `导入失败：${backendMsg}` : '导入失败')
      } finally {
        this.uploadingCompletedOrders = false
        if (this.$refs.completedOrderFile) {
          this.$refs.completedOrderFile.value = ''
        }
      }
    },
    async onUncompletedOrderFileChange(e) {
      const file = e.target.files && e.target.files[0]
      if (!file) return
      this.uploadingUncompletedOrders = true
      try {
        const formData = new FormData()
        formData.append('file', file)
        const operator = (this.$store && this.$store.getters && this.$store.getters.name) || 'system'
        formData.append('operator', operator)
        const res = await request({
          url: '/config/order-uncompleted/upload',
          method: 'post',
          data: formData,
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 600000
        })
        if (res && (res.code === 200 || res.code === 20000)) {
          const data = res.data || {}
          const msg = `未完成导入：上传${data.uploadedRows || 0}，匹配${data.matchedRows || 0}，自动置完成明细${data.autoCompletedItems || 0}，更新明细${data.updatedItems || 0}，跳过报工明细${data.skippedReportedItems || 0}，超订单数量跳过${data.skippedOverLimitRows || 0}，更新订单${data.updatedOrders || 0}`
          this.$message.success(msg)
          const unmatched = Array.isArray(data.unmatchedKeys) ? data.unmatchedKeys : []
          if (unmatched.length > 0) {
            const lines = unmatched.slice(0, 200).map((x, idx) => `${idx + 1}. ${x}`)
            this.$alert(lines.join('\n'), '未匹配到系统明细（最多200条）', { confirmButtonText: '确定' })
          }
          const overLimit = Array.isArray(data.overLimitKeys) ? data.overLimitKeys : []
          if (overLimit.length > 0) {
            const lines = overLimit.slice(0, 200).map((x, idx) => `${idx + 1}. ${x}`)
            this.$alert(lines.join('\n'), '已完成数量大于订单数量，已跳过（最多200条）', { confirmButtonText: '确定' })
          }
        } else {
          this.$message.error((res && (res.msg || res.message)) || '导入失败')
        }
      } catch (err) {
        const backendMsg = (err && err.response && err.response.data && (err.response.data.msg || err.response.data.message)) || ''
        this.$message.error(backendMsg ? `导入失败：${backendMsg}` : '导入失败')
      } finally {
        this.uploadingUncompletedOrders = false
        if (this.$refs.uncompletedOrderFile) {
          this.$refs.uncompletedOrderFile.value = ''
        }
      }
    }
  }
}
</script>

<style scoped>
.company-config-page { padding: 20px; }
.header-row { display:flex; justify-content:space-between; align-items:center; }
.header-actions { display:flex; gap:8px; align-items:center; }
.title { font-size:16px; font-weight:600; }
.config-form { max-width: 1000px; }
.tip { margin-top: 6px; color:#909399; font-size:12px; }
</style>
