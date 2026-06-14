<template>
  <div class="public-delivery-container">
    <div class="header-banner">
      <img src="/logo/finechem-logo.png" alt="logo" class="logo">
      <div class="title">发货记录查询中心</div>
    </div>

    <!-- 侧边栏模式下的 ChatId 复制工具 -->
    <div v-if="currentChatId" class="chat-id-alert">
      <el-alert
        title="检测到群聊 ID (用于配置全自动推送)"
        type="success"
        :description="'当前群ID: ' + currentChatId + ' (请将其填入客户资料的 [企微推送ID] 字段)'"
        show-icon
        :closable="false">
      </el-alert>
    </div>

    <div class="main-content">
      <div v-if="loading" class="loading-state">
        <i class="el-icon-loading"></i> 加载中...
      </div>

      <div v-else-if="notices.length === 0" class="empty-state">
        <el-empty description="未找到相关发货记录"></el-empty>
      </div>

      <div v-else>
        <div v-for="notice in notices" :key="notice.id" class="notice-card">
          <div class="notice-header">
            <span class="notice-no">{{ notice.noticeNo }}</span>
            <el-tag :type="getStatusType(notice.status)" size="small">{{ notice.status }}</el-tag>
          </div>
          
          <div class="notice-info">
            <div class="info-item">
              <span class="label">销售订单：</span>
              <span class="value">{{ notice.orderNo || '-' }}</span>
            </div>
            <div class="info-item">
              <span class="label">发货日期：</span>
              <span class="value">{{ notice.deliveryDate }}</span>
            </div>
            <div class="info-item">
              <span class="label">物流信息：</span>
              <span class="value">{{ notice.carrierName }} {{ notice.carrierNo ? '[' + notice.carrierNo + ']' : '' }}</span>
            </div>
          </div>

          <el-divider content-position="left">发货明细</el-divider>
          
          <el-table :data="notice.items" size="mini" border stripe style="width: 100%">
            <el-table-column prop="materialCode" label="物料代码" min-width="120" />
            <el-table-column prop="spec" label="规格" min-width="150" />
            <el-table-column prop="quantity" label="数量" width="80" align="right">
              <template slot-scope="scope">
                {{ scope.row.quantity ? scope.row.quantity.toFixed(0) : 0 }} 卷
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
    </div>
    
    <div class="footer">
      © {{ new Date().getFullYear() }} 方恩电子材料科技有限公司
    </div>
  </div>
</template>

<script>
import axios from 'axios'

export default {
  name: 'PublicDelivery',
  data() {
    return {
      loading: false,
      notices: [],
      currentChatId: null
    }
  },
  created() {
    this.fetchData()
  },
  methods: {
    async fetchData() {
      let { customer, noticeNo, p } = this.$route.query
      
      // 自动抓取并显示 ChatId (仅在侧边栏模式且未获取过时显示)
      if (window.wx && window.wx.invoke) {
        window.wx.invoke('getCurExternalChat', {}, res => {
          if (res.err_msg === 'getCurExternalChat:ok') {
            this.currentChatId = res.chatId
          }
        })
      }

      // 如果存在混淆参数 p，进行解码
      if (p) {
        try {
          // Base64 解码，支持 URL 安全格式
          const decoded = atob(p.replace(/-/g, '+').replace(/_/g, '/'))
          const pairs = decoded.split('&')
          pairs.forEach(pair => {
            const [k, v] = pair.split('=')
            if (k === 'noticeNo') noticeNo = v
            else if (k === 'customer') customer = v
          })
        } catch (e) {
          console.error('参数解析失败', e)
        }
      }

      if (!customer && !noticeNo) {
        return
      }
      this.loading = true
      try {
        // 使用相对路径或通过环境变量获取后端地址
        const baseURL = process.env.VUE_APP_BASE_API || 'http://localhost:8090'
        const res = await axios.get(`${baseURL}/wecom/public/shipments`, {
          params: { customer, noticeNo, p } // 将 p 也传给后端（后端已支持优先解析 p）
        })
        if (res.data && (res.data.code === 200 || res.data.code === 20000)) {
          this.notices = res.data.data
        }
      } catch (e) {
        console.error('Fetch error:', e)
      } finally {
        this.loading = false
      }
    },
    getStatusType(status) {
      const map = {
        '待发货': 'warning',
        '已发货': 'success',
        '已收货': 'success',
        '已取消': 'danger'
      }
      return map[status] || 'info'
    }
  }
}
</script>

<style scoped>
.public-delivery-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  background-color: #f5f7fa;
  min-height: 100vh;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

.header-banner {
  display: flex;
  align-items: center;
  background-color: #fff;
  padding: 15px 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  box-shadow: 0 2px 12px 0 rgba(0,0,0,0.1);
}

.logo {
  height: 40px;
  margin-right: 15px;
}

.title {
  font-size: 18px;
  font-weight: bold;
  color: #303133;
}

.chat-id-alert {
  margin-bottom: 20px;
}

.notice-card {
  background-color: #fff;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 12px 0 rgba(0,0,0,0.05);
}

.notice-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.notice-no {
  font-size: 16px;
  font-weight: bold;
  color: #409EFF;
}

.notice-info {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 20px;
}

.info-item {
  font-size: 14px;
}

.label {
  color: #909399;
}

.value {
  color: #303133;
}

.loading-state, .empty-state {
  text-align: center;
  padding: 50px 0;
  color: #909399;
}

.footer {
  text-align: center;
  margin-top: 30px;
  color: #909399;
  font-size: 12px;
}

@media (max-width: 600px) {
  .notice-info {
    grid-template-columns: 1fr;
  }
  .public-delivery-container {
    padding: 10px;
  }
}
</style>
