<template>
  <div id="app">
    <div class="global-watermark" aria-hidden="true">
      <div
        class="global-watermark-canvas"
        :style="{ gridTemplateColumns: `repeat(${watermarkCols}, 80mm)` }"
      >
        <span
          v-for="n in watermarkCount"
          :key="`wm-${n}`"
          class="global-watermark-text"
        >FINECHEM 方恩电子</span>
      </div>
    </div>
    <router-view />
    <!-- dev-only debug badge showing current roles -->
    <div v-if="showDebugBadge" class="debug-roles-badge">roles: {{ currentRolesDisplay }}</div>
  </div>
</template>

<script>
export default {
  name: 'App',
  data() {
    return {
      watermarkCols: 12,
      watermarkRows: 10
    }
  },

  created() {
    // placeholder to allow `this.$store` usage after store is ready
    try {
      // 如果 store 中没有角色但存在 token，则尝试在 App 启动时强制拉取用户信息（有助于小程序/内嵌 webview）
      const hasRoles = this.$store && this.$store.getters && Array.isArray(this.$store.getters.roles) && this.$store.getters.roles.length > 0
      const canDispatch = this.$store && typeof this.$store.dispatch === 'function'
      if (!hasRoles && canDispatch) {
        // 尝试触发获取用户信息（user/getInfo）以填充 roles
        try {
          this.$store.dispatch('user/getInfo').then(() => {
            try { console.debug('[App] user/getInfo completed, roles=', (this.$store.getters && this.$store.getters.roles)) } catch (e) { /* ignored */ }
          }).catch(() => {
            // ignore
          })
        } catch (e) {
          // ignore
        }
      }
    } catch (e) {
      // ignore
    }
  },
  computed: {
    watermarkCount() {
      return this.watermarkCols * this.watermarkRows
    },
    showDebugBadge() {
      try {
        if (process.env.NODE_ENV === 'development') return true
        // allow forcing debug badge via URL query ?debug_roles=1 or localStorage MES_DEBUG_ROLES=1
        if (typeof window !== 'undefined') {
          try {
            const q = window.location && window.location.search ? window.location.search : ''
            if (q && q.indexOf('debug_roles=1') !== -1) return true
            const flag = window.localStorage && window.localStorage.getItem && window.localStorage.getItem('MES_DEBUG_ROLES')
            if (flag === '1') return true
          } catch (e) {
            // ignore
          }
        }
        return false
      } catch (e) {
        return false
      }
    },
    currentRolesDisplay() {
      try {
        const roles = (this.$store && this.$store.getters && this.$store.getters.roles) || []
        return Array.isArray(roles) ? roles.join(',') || 'none' : String(roles || '')
      } catch (e) {
        return 'unknown'
      }
    }
  },
  mounted() {
    this.updateWatermarkGrid()
    window.addEventListener('resize', this.updateWatermarkGrid)
    this.initRemotePrintAgent()
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.updateWatermarkGrid)
    if (this.remotePrintTimer) {
      clearInterval(this.remotePrintTimer)
    }
  },
  methods: {
    initRemotePrintAgent() {
      // 开启远程打印代理，监听来自移动端的打印任务
      this.remotePrintTimer = setInterval(() => {
        this.checkRemotePrintJobs()
      }, 5000)
    },
    async checkRemotePrintJobs() {
      // 如果没有登录，不执行
      const token = this.$store.getters.token
      if (!token) return
      
      const roles = this.$store.getters.roles
      const isProduction = roles.includes('production') || roles.includes('admin') || roles.includes('packaging')
      if (!isProduction) return

      try {
        const { getLabelPrintRecordPage, saveLabelPrintRecord } = await import('@/api/manualSchedule')
        const { printByScene } = await import('@/utils/printService')

        // 查询当前用户 PENDING 的任务
        // 注意：由于后端查询接口可能不支持按 operator 过滤，我们先查最近的 PENDING
        const res = await getLabelPrintRecordPage({
          current: 1,
          size: 5,
          printStatus: 'PENDING'
        })

        if (res.code === 200 || res.code === 20000) {
          const records = res.data.records || []
          for (const record of records) {
            // 只处理当前用户的（如果开启了多端同步）
            if (record.operator !== this.$store.getters.name) continue

            console.log('[RemotePrintAgent] 发现待打印任务:', record.jobName, record.id)
            
            // 标记为正在打印，防止重复
            record.printStatus = 'PRINTING'
            await saveLabelPrintRecord(record)

            try {
              const printData = JSON.parse(record.printDataJson || '{}')
              const bizType = record.bizType || 'COATING_MOTHER_ROLL'
              
              // 构造场景对象 (这里假定了一些常用场景)
              const scene = {
                templateKey: record.templateKey || 'coating_mother_roll',
                bizType: bizType
              }

              // 调用本地打印逻辑
              await printByScene(scene, printData, {
                vm: this,
                config: {
                  enabled: true,
                  endpoint: 'http://127.0.0.1:9123/print',
                  timeoutMs: 30000
                }
              })

              // 打印成功，更新状态
              record.printStatus = 'SUCCESS'
              record.resultMessage = '远程打印成功'
              await saveLabelPrintRecord(record)
              this.$message.success(`远程打印成功: ${record.jobName}`)
            } catch (err) {
              console.error('[RemotePrintAgent] 打印失败:', err)
              record.printStatus = 'FAILED'
              record.resultMessage = '远程打印失败: ' + (err.message || '未知错误')
              await saveLabelPrintRecord(record)
            }
          }
        }
      } catch (e) {
        // ignore errors during silent polling
      }
    },
    updateWatermarkGrid() {
      const pxToMm = 0.264583
      const canvasWidthMm = window.innerWidth * 1.8 * pxToMm
      const canvasHeightMm = window.innerHeight * 1.8 * pxToMm
      this.watermarkCols = Math.max(10, Math.ceil(canvasWidthMm / 80) + 3)
      this.watermarkRows = Math.max(14, Math.ceil(canvasHeightMm / 40) + 3)
    }
  }
}
</script>

<style>
.global-watermark {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9999;
  overflow: hidden;
}

.global-watermark-canvas {
  position: absolute;
  left: -40vw;
  top: -40vh;
  width: 180vw;
  height: 180vh;
  display: grid;
  grid-auto-rows: 40mm;
  justify-content: start;
  align-content: start;
  transform: rotate(-30deg);
  transform-origin: center;
  opacity: 0.12;
}

.global-watermark-text {
  align-self: center;
  justify-self: center;
  font-family: 'Microsoft YaHei', '微软雅黑', sans-serif;
  font-size: 5mm;
  font-weight: 700;
  letter-spacing: 0.4mm;
  color: #9c9c9c;
  line-height: 1;
  opacity: 0.5;
  white-space: nowrap;
  border: none;
  user-select: none;
}

@media print {
  .global-watermark {
    display: none !important;
  }
}
</style>
