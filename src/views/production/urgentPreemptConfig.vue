<template>
  <div class="urgent-preempt-config">
    <el-card>
      <div slot="header" class="clearfix">
        <span>急单抢占参数</span>
        <div class="header-actions">
          <el-button icon="el-icon-refresh-left" size="small" :loading="loading" @click="fetchConfig">刷新</el-button>
          <el-button type="primary" icon="el-icon-check" size="small" :loading="saving" @click="handleSave">保存</el-button>
        </div>
      </div>

      <div class="tips-box">
        <div>1. 临近开工保护窗口：若订单预计开工时间在该窗口内，则不参与被抢占。</div>
        <div>2. 最小保底面积：每个“订单+料号”至少保留的面积下限。</div>
        <div>3. 最小保底比例：每个“订单+料号”至少保留总锁定面积的比例，系统按 max(面积下限, 比例值) 保护。</div>
      </div>

      <el-form ref="form" :model="form" :rules="rules" label-width="180px" style="max-width: 680px;">
        <el-form-item label="临近开工保护窗口(分钟)" prop="startProtectWindowMinutes">
          <el-input-number
            v-model="form.startProtectWindowMinutes"
            :min="1"
            :max="10080"
            :step="10"
            controls-position="right"
            style="width: 260px"
          />
        </el-form-item>

        <el-form-item label="最小保底面积(㎡)" prop="minProtectArea">
          <el-input-number
            v-model="form.minProtectArea"
            :min="0"
            :max="999999"
            :step="10"
            :precision="2"
            controls-position="right"
            style="width: 260px"
          />
        </el-form-item>

        <el-form-item label="最小保底比例(0~1)" prop="minProtectRatio">
          <el-input-number
            v-model="form.minProtectRatio"
            :min="0"
            :max="1"
            :step="0.01"
            :precision="4"
            controls-position="right"
            style="width: 260px"
          />
        </el-form-item>

        <el-form-item label="当前生效来源">
          <el-tag :type="form.source === 'redis' ? 'success' : 'info'">{{ form.source === 'redis' ? '在线参数(Redis)' : '应用默认(application)' }}</el-tag>
        </el-form-item>

        <el-form-item v-if="form.updatedAt" label="最后更新">
          <span>{{ form.updatedAt }}{{ form.updatedBy ? ` / ${form.updatedBy}` : '' }}</span>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script>
import { getUrgentPreemptConfig, saveUrgentPreemptConfig } from '@/api/manualSchedule'

function defaultForm() {
  return {
    startProtectWindowMinutes: 240,
    minProtectArea: 300,
    minProtectRatio: 0.2,
    source: 'application',
    updatedAt: '',
    updatedBy: ''
  }
}

export default {
  name: 'UrgentPreemptConfig',
  data() {
    return {
      loading: false,
      saving: false,
      form: defaultForm(),
      rules: {
        startProtectWindowMinutes: [{ required: true, message: '请输入保护窗口', trigger: 'blur' }],
        minProtectArea: [{ required: true, message: '请输入最小保底面积', trigger: 'blur' }],
        minProtectRatio: [{ required: true, message: '请输入最小保底比例', trigger: 'blur' }]
      }
    }
  },
  created() {
    this.fetchConfig()
  },
  methods: {
    async fetchConfig() {
      this.loading = true
      try {
        const res = await getUrgentPreemptConfig()
        if (res && (res.code === 200 || res.code === 20000)) {
          const data = res.data || {}
          this.form = {
            ...defaultForm(),
            startProtectWindowMinutes: Number(data.startProtectWindowMinutes || 240),
            minProtectArea: Number(data.minProtectArea || 300),
            minProtectRatio: Number(data.minProtectRatio || 0.2),
            source: data.source || 'application',
            updatedAt: data.updatedAt || '',
            updatedBy: data.updatedBy || ''
          }
        } else {
          this.$message.error(res.msg || res.message || '获取参数失败')
        }
      } catch (e) {
        console.error('获取急单抢占参数失败', e)
        this.$message.error('获取急单抢占参数失败')
      } finally {
        this.loading = false
      }
    },
    handleSave() {
      this.$refs.form.validate(async valid => {
        if (!valid) return
        if (this.form.minProtectRatio < 0 || this.form.minProtectRatio > 1) {
          this.$message.error('最小保底比例必须在0到1之间')
          return
        }

        this.saving = true
        try {
          const payload = {
            startProtectWindowMinutes: Number(this.form.startProtectWindowMinutes),
            minProtectArea: Number(this.form.minProtectArea),
            minProtectRatio: Number(this.form.minProtectRatio),
            operator: this.$store.getters.name || 'frontend'
          }
          const res = await saveUrgentPreemptConfig(payload)
          if (res && (res.code === 200 || res.code === 20000)) {
            this.$message.success(res.msg || res.message || '保存成功')
            const data = res.data || {}
            this.form = {
              ...this.form,
              startProtectWindowMinutes: Number(data.startProtectWindowMinutes || this.form.startProtectWindowMinutes),
              minProtectArea: Number(data.minProtectArea || this.form.minProtectArea),
              minProtectRatio: Number(data.minProtectRatio || this.form.minProtectRatio),
              source: data.source || this.form.source,
              updatedAt: data.updatedAt || this.form.updatedAt,
              updatedBy: data.updatedBy || this.form.updatedBy
            }
          } else {
            this.$message.error(res.msg || res.message || '保存失败')
          }
        } catch (e) {
          console.error('保存急单抢占参数失败', e)
          this.$message.error('保存急单抢占参数失败')
        } finally {
          this.saving = false
        }
      })
    }
  }
}
</script>

<style scoped>
.urgent-preempt-config {
  padding: 20px;
}

.header-actions {
  float: right;
  display: flex;
  gap: 8px;
}

.tips-box {
  margin-bottom: 16px;
  padding: 12px 14px;
  line-height: 1.8;
  color: #606266;
  background: #f4f8ff;
  border: 1px solid #d9ecff;
  border-radius: 4px;
}
</style>
