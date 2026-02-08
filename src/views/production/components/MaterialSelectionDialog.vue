<template>
  <el-dialog title="选择库存物料 (FIFO顺序)" :visible.sync="visible" width="85%" @close="handleClose">
    <!-- 可用物料列表 -->
    <el-table
      v-loading="loading"
      :data="materialList"
      stripe
      border
      height="400px"
      @selection-change="handleSelectionChange"
    >
      <el-table-column type="selection" width="50" />

      <el-table-column prop="qrCode" label="二维码" width="140">
        <template slot-scope="scope">
          <el-tag type="info">{{ scope.row.qrCode }}</el-tag>
        </template>
      </el-table-column>

      <el-table-column prop="batchNo" label="批次号" width="120" />

      <el-table-column prop="materialCode" label="物料代码" width="120" />

      <el-table-column prop="specDesc" label="规格" width="100" />

      <!-- 卷数统计 -->
      <el-table-column label="卷数统计" width="130" align="center">
        <template slot-scope="scope">
          <span style="color: #409EFF; font-weight: bold">{{ scope.row.totalRolls }}</span>
          <span style="color: #909399"> / </span>
          <span style="color: #E6A23C">{{ scope.row.lockedRolls }}</span>
          <span style="color: #909399"> = </span>
          <span style="color: #67C23A; font-weight: bold">{{ scope.row.availableRolls }}</span>
        </template>
      </el-table-column>

      <el-table-column label="可用面积(㎡)" width="120" align="right">
        <template slot-scope="scope">
          <span style="color: #67C23A; font-weight: bold">{{ formatArea(scope.row.availableArea) }}</span>
        </template>
      </el-table-column>

      <el-table-column prop="prodDate" label="生产日期" width="120" />

      <el-table-column label="FIFO" width="80" align="center">
        <template slot-scope="scope">
          <el-tag type="primary">{{ scope.row.fifoOrder }}</el-tag>
        </template>
      </el-table-column>
    </el-table>

    <!-- 选择统计 -->
    <div style="margin-top: 20px">
      <el-row :gutter="20">
        <el-col :span="12">
          <el-alert
            :title="`已选择 ${selectedMaterials.length} 卷物料`"
            type="info"
            :closable="false"
            show-icon
          />
        </el-col>
        <el-col :span="12">
          <el-alert
            :title="`总锁定面积: ${totalSelectedArea.toFixed(2)} m²`"
            :type="totalSelectedArea >= requiredQty ? 'success' : 'warning'"
            :closable="false"
            show-icon
          />
        </el-col>
      </el-row>
    </div>

    <span slot="footer" class="dialog-footer">
      <el-button @click="handleClose">取消</el-button>
      <el-button
        type="primary"
        :disabled="selectedMaterials.length === 0"
        @click="handleConfirm"
      >
        确认锁定
      </el-button>
    </span>
  </el-dialog>
</template>

<script>
import { getAvailableMaterials, lockMaterials } from '@/api/orderPreprocessing'

export default {
  name: 'MaterialSelectionDialog',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    materialCode: {
      type: String,
      default: ''
    },
    orderItemId: {
      type: Number,
      default: 0
    },
    preprocessingId: {
      type: Number,
      default: 0
    },
    requiredQty: {
      type: Number,
      default: 0
    }
  },

  data() {
    return {
      loading: false,
      materialList: [],
      selectedMaterials: [],
      totalSelectedArea: 0,
      orderId: 0
    }
  },

  watch: {
    visible(val) {
      if (val) {
        this.loadAvailableMaterials()
      }
    }
  },

  methods: {
    /**
     * 加载可锁定的物料列表
     */
    async loadAvailableMaterials() {
      this.loading = true
      this.selectedMaterials = []
      this.totalSelectedArea = 0

      try {
        const response = await getAvailableMaterials(this.materialCode, 50, this.orderItemId)

        if (response.code === 20000) {
          this.materialList = response.data || []
        }
      } catch (error) {
        this.$message.error('加载物料列表失败')
      } finally {
        this.loading = false
      }
    },

    /**
     * 表格选择变化
     */
    handleSelectionChange(selection) {
      this.selectedMaterials = selection
      this.totalSelectedArea = selection.reduce((sum, item) => {
        return sum + (item.availableArea ? parseFloat(item.availableArea) : 0)
      }, 0)
    },

    /**
     * 确认锁定
     */
    async handleConfirm() {
      if (this.selectedMaterials.length === 0) {
        this.$message.warning('请选择至少一条物料')
        return
      }

      try {
        // 构建锁定数据
        const lockData = {
          preprocessingId: this.preprocessingId,
          orderId: this.orderId,
          orderItemId: this.orderItemId,
          materialCode: this.materialCode,
          locks: this.selectedMaterials.map((item, index) => ({
            tapeStockId: item.tapeStockId,
            lockQty: item.availableRolls,
            lockArea: item.availableArea,
            fifoOrder: item.fifoOrder
          }))
        }

        this.loading = true
        const response = await lockMaterials(lockData)

        if (response.code === 20000) {
          this.$message.success('物料锁定成功')
          this.$emit('confirm', response.data)
          this.$emit('update:visible', false)
        } else {
          this.$message.error(response.msg || '锁定失败')
        }
      } catch (error) {
        this.$message.error('锁定出错: ' + error.message)
      } finally {
        this.loading = false
      }
    },

    /**
     * 关闭弹窗
     */
    handleClose() {
      this.$emit('update:visible', false)
      this.selectedMaterials = []
      this.totalSelectedArea = 0
    },

    /**
     * 格式化面积显示
     */
    formatArea(area) {
      if (!area) return '0'
      return parseFloat(area).toFixed(2)
    }
  }
}
</script>

<style scoped lang="scss">
.el-table {
  font-size: 13px;
}

.dialog-footer {
  text-align: right;
}
</style>
