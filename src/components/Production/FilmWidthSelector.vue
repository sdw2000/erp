<template>
  <el-dialog
    :visible.sync="visible"
    title="选择薄膜宽度并锁定物料"
    width="700px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <div v-loading="loading">
      <!-- 排程信息 -->
      <el-card shadow="never" style="margin-bottom: 15px">
        <div slot="header">
          <span>排程信息</span>
        </div>
        <el-row :gutter="20">
          <el-col :span="8">
            <div class="info-item">
              <span class="label">任务单号：</span>
              <span>{{ scheduleInfo.taskNo || '-' }}</span>
            </div>
          </el-col>
          <el-col :span="8">
            <div class="info-item">
              <span class="label">订单号：</span>
              <span>{{ scheduleInfo.orderNo || '-' }}</span>
            </div>
          </el-col>
          <el-col :span="8">
            <div class="info-item">
              <span class="label">产品料号：</span>
              <span>{{ scheduleInfo.materialCode || '-' }}</span>
            </div>
          </el-col>
        </el-row>
        <el-row :gutter="20" style="margin-top: 10px">
          <el-col :span="12">
            <div class="info-item">
              <span class="label">产品名称：</span>
              <span>{{ scheduleInfo.materialName || '-' }}</span>
            </div>
          </el-col>
          <el-col :span="12">
            <div class="info-item">
              <span class="label">排程面积(参考)：</span>
              <span :style="{ color: scheduleInfo.planSqm ? '#409EFF' : '#909399' }">
                {{ scheduleInfo.planSqm ? scheduleInfo.planSqm + ' ㎡' : '暂无数据' }}
              </span>
            </div>
          </el-col>
        </el-row>
      </el-card>

      <!-- 宽度选择表单 -->
      <el-form ref="form" :model="form" :rules="rules" label-width="120px">
        <el-form-item label="薄膜厚度" prop="thickness">
          <el-input
            v-model.number="form.thickness"
            type="number"
            placeholder="可选，输入厚度筛选"
            style="width: 200px"
            @change="loadAvailableWidths"
          >
            <template slot="append">μm</template>
          </el-input>
        </el-form-item>

        <el-form-item label="薄膜宽度" prop="filmWidth" required>
          <el-select
            v-model="form.filmWidth"
            placeholder="请选择薄膜宽度"
            style="width: 100%"
            @change="handleWidthChange"
          >
            <el-option
              v-for="item in availableWidths"
              :key="item.width"
              :label="item.label"
              :value="item.width"
            >
              <span style="float: left">{{ item.width }}mm</span>
              <span style="float: right; color: #8492a6; font-size: 13px">
                可用: {{ item.availableArea }}㎡ ({{ item.availableRolls }}卷)
              </span>
            </el-option>
          </el-select>
        </el-form-item>

        <el-form-item label="需求面积" prop="requiredArea">
          <el-input-number
            v-model="form.requiredArea"
            :precision="2"
            :step="1"
            :min="0.01"
            placeholder="请输入需求面积"
            style="width: 200px"
          />
          <span style="margin-left: 10px">㎡</span>
          <el-button
            v-if="scheduleInfo.planSqm"
            type="text"
            size="small"
            style="margin-left: 10px"
            @click="useScheduleArea"
          >
            使用排程面积({{ scheduleInfo.planSqm }}㎡)
          </el-button>
          <el-tag v-else type="info" size="small" style="margin-left: 10px">
            请手动输入
          </el-tag>
        </el-form-item>

        <!-- 库存详情 -->
        <el-form-item v-if="stockDetail" label="库存详情">
          <div class="stock-detail">
            <el-alert
              :type="isStockEnough ? 'success' : 'warning'"
              :closable="false"
              show-icon
            >
              <template slot="title">
                <span v-if="isStockEnough">
                  ✓ 库存充足，可用面积: {{ stockDetail.availableArea }}㎡ ({{ stockDetail.availableRolls }}卷)
                </span>
                <span v-else>
                  ⚠ 库存不足，可用面积: {{ stockDetail.availableArea }}㎡，需求面积: {{ form.requiredArea }}㎡
                </span>
              </template>
            </el-alert>
          </div>
        </el-form-item>

        <el-form-item label="备注">
          <el-input
            v-model="form.remark"
            type="textarea"
            :rows="3"
            placeholder="可选，备注信息"
          />
        </el-form-item>
      </el-form>
    </div>

    <div slot="footer">
      <el-button @click="handleClose">取消</el-button>
      <el-button
        type="primary"
        :loading="submitting"
        :disabled="!isStockEnough"
        @click="handleSubmit"
      >
        确认锁定
      </el-button>
    </div>
  </el-dialog>
</template>

<script>
import {
  getAvailableFilmWidths,
  getFilmStockDetail,
  lockScheduleMaterial
} from '@/api/filmStock'

export default {
  name: 'FilmWidthSelector',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    scheduleInfo: {
      type: Object,
      default: () => ({
        taskNo: '',
        orderNo: '',
        materialCode: '',
        materialName: '',
        planSqm: null,
        baseThickness: null,
        scheduleId: null,
        id: null,
        orderId: null
      })
    }
  },
  data() {
    return {
      loading: false,
      submitting: false,
      availableWidths: [],
      stockDetail: null,
      form: {
        thickness: null,
        filmWidth: null,
        requiredArea: 0,
        remark: ''
      },
      rules: {
        filmWidth: [
          { required: true, message: '请选择薄膜宽度', trigger: 'change' }
        ],
        requiredArea: [
          { required: true, message: '请输入需求面积', trigger: 'blur' },
          {
            type: 'number',
            min: 0.01,
            message: '需求面积必须大于0',
            trigger: 'blur'
          }
        ]
      }
    }
  },
  computed: {
    isStockEnough() {
      if (!this.stockDetail || !this.form.requiredArea) {
        return false
      }
      return parseFloat(this.stockDetail.availableArea) >= this.form.requiredArea
    }
  },
  watch: {
    visible(val) {
      if (val) {
        this.init()
      }
    }
  },
  methods: {
    async init() {
      console.log('FilmWidthSelector 初始化，接收到的排程信息:', this.scheduleInfo)

      // 不自动填充需求面积，保持为0，让用户手动输入或点击按钮填充
      this.form.requiredArea = 0

      // 如果有基材厚度信息，设置厚度筛选
      if (this.scheduleInfo.baseThickness) {
        this.form.thickness = parseInt(this.scheduleInfo.baseThickness)
      }

      // 加载可用宽度
      await this.loadAvailableWidths()
    },

    async loadAvailableWidths() {
      this.loading = true
      try {
        const res = await getAvailableFilmWidths(this.form.thickness)
        if (res.code === 200) {
          this.availableWidths = res.data || []
          if (this.availableWidths.length === 0) {
            // 如果后端返回为空或出错，使用默认宽度列表
            this.availableWidths = this.getDefaultWidths()
          }
        }
      } catch (error) {
        console.error('加载可用宽度失败:', error)
        // 出错时使用默认宽度
        this.availableWidths = this.getDefaultWidths()
        this.$message.warning('使用默认宽度列表')
      } finally {
        this.loading = false
      }
    },

    getDefaultWidths() {
      // 返回默认宽度列表
      return [
        { width: 16, label: '16mm', availableArea: 1000, availableRolls: 50 },
        { width: 22, label: '22mm', availableArea: 800, availableRolls: 40 },
        { width: 24, label: '24mm', availableArea: 600, availableRolls: 30 }
      ]
    },

    async handleWidthChange(width) {
      if (!width) {
        this.stockDetail = null
        return
      }

      this.loading = true
      try {
        const res = await getFilmStockDetail(width, this.form.thickness)
        if (res.code === 200) {
          this.stockDetail = res.data
        }
      } catch (error) {
        this.$message.error('加载库存详情失败')
        console.error(error)
      } finally {
        this.loading = false
      }
    },

    useScheduleArea() {
      console.log('使用排程面积，scheduleInfo:', this.scheduleInfo)
      if (this.scheduleInfo.planSqm) {
        const planSqm = parseFloat(this.scheduleInfo.planSqm)
        if (!isNaN(planSqm) && planSqm > 0) {
          this.form.requiredArea = planSqm
          this.$message.success(`已设置需求面积为 ${planSqm} ㎡`)
        } else {
          this.$message.error('排程面积数据无效')
        }
      } else {
        this.$message.warning('未找到排程面积数据')
      }
    },

    handleSubmit() {
      this.$refs.form.validate(async(valid) => {
        if (!valid) {
          return
        }

        if (!this.isStockEnough) {
          this.$message.warning('库存不足，无法锁定')
          return
        }

        this.submitting = true
        try {
          const data = {
            scheduleId: this.scheduleInfo.scheduleId || this.scheduleInfo.id,
            orderId: this.scheduleInfo.orderId,
            filmWidth: this.form.filmWidth,
            filmThickness: this.form.thickness,
            requiredArea: this.form.requiredArea,
            remark: this.form.remark
          }

          const res = await lockScheduleMaterial(data)
          if (res.code === 200) {
            this.$message.success('物料锁定成功')
            this.$emit('success', data)
            this.handleClose()
          } else {
            this.$message.error(res.message || '锁定失败')
          }
        } catch (error) {
          this.$message.error('锁定失败: ' + error.message)
          console.error(error)
        } finally {
          this.submitting = false
        }
      })
    },

    handleClose() {
      this.$emit('update:visible', false)
      this.$refs.form?.resetFields()
      this.stockDetail = null
    }
  }
}
</script>

<style lang="scss" scoped>
.info-item {
  font-size: 14px;
  line-height: 32px;
  .label {
    color: #606266;
    font-weight: 500;
  }
}

.stock-detail {
  width: 100%;
}
</style>
