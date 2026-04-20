<template>
  <div class="navbar">
    <hamburger id="hamburger-container" :is-active="sidebar.opened" class="hamburger-container" @toggleClick="toggleSideBar" />
    <breadcrumb id="breadcrumb-container" class="breadcrumb-container" />
    <div class="right-menu">
      <el-popover
        v-if="showMessageEntry"
        placement="bottom"
        width="360"
        trigger="click"
        popper-class="message-popover"
        @show="onMessagePopoverShow"
      >
        <div class="message-panel">
          <div class="message-panel-header">
            <span>系统消息</span>
            <el-button type="text" size="mini" @click="handleReadAll">全部已读</el-button>
          </div>
          <div v-if="messageLoading" class="message-empty">加载中...</div>
          <template v-else>
            <div v-if="!messageList.length" class="message-empty">暂无消息</div>
            <div v-else class="message-list">
              <div
                v-for="item in messageList"
                :key="item.id"
                :class="['message-item', Number(item.is_read) === 1 ? 'is-read' : 'is-unread']"
                @click="handleMessageClick(item)"
              >
                <div class="message-title-row">
                  <span class="message-title">{{ item.title || '系统消息' }}</span>
                  <span v-if="Number(item.is_read) !== 1" class="message-unread-dot" />
                </div>
                <div class="message-content">{{ formatMessageContent(item) }}</div>
                <div class="message-time">{{ item.created_at || '' }}</div>
              </div>
            </div>
          </template>
        </div>
        <div slot="reference" class="right-menu-item hover-effect message-entry">
          <el-badge :value="unreadCount" :hidden="!unreadCount" :max="99" class="message-badge" type="danger">
            <i class="el-icon-bell" />
          </el-badge>
        </div>
      </el-popover>

      <el-dropdown class="avatar-container right-menu-item hover-effect" trigger="click">
        <div class="avatar-wrapper">
          <span class="login-user-name">{{ displayName }}</span>
          <i class="el-icon-caret-bottom" />
        </div>
        <el-dropdown-menu slot="dropdown">
          <router-link to="/profile/index">
            <el-dropdown-item>个人中心</el-dropdown-item>
          </router-link>
          <el-dropdown-item divided @click.native="logout">
            <span style="display:block;">退出登录</span>
          </el-dropdown-item>
        </el-dropdown-menu>
      </el-dropdown>
    </div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'
import Breadcrumb from '@/components/Breadcrumb'
import Hamburger from '@/components/Hamburger'
import { getUnreadMessageCount, getSystemMessagePage, markSystemMessageRead, markAllSystemMessageRead } from '@/api/systemMessage'

export default {
  components: {
    Breadcrumb,
    Hamburger
  },
  data() {
    return {
      unreadCount: 0,
      messageList: [],
      messageLoading: false,
      messageTimer: null
    }
  },
  computed: {
    ...mapGetters([
      'sidebar',
      'name',
      'realName',
      'roles'
    ]),
    displayName() {
      return this.realName || this.name || '当前用户'
    },
    showMessageEntry() {
      const list = Array.isArray(this.roles) ? this.roles : []
      return list.includes('warehouse') || list.includes('admin')
    }
  },
  created() {
    this.refreshMessageCount()
    this.messageTimer = setInterval(() => {
      this.refreshMessageCount()
    }, 30000)
  },
  beforeDestroy() {
    if (this.messageTimer) {
      clearInterval(this.messageTimer)
      this.messageTimer = null
    }
  },
  methods: {
    toggleSideBar() {
      this.$store.dispatch('app/toggleSideBar')
    },
    async logout() {
      await this.$store.dispatch('user/logout')
      this.$router.push(`/login?redirect=${this.$route.fullPath}`)
    },
    async refreshMessageCount() {
      if (!this.showMessageEntry) {
        this.unreadCount = 0
        return
      }
      try {
        const res = await getUnreadMessageCount()
        if (res && (res.code === 200 || res.code === 20000)) {
          this.unreadCount = Number((res.data && res.data.unreadCount) || 0)
        }
      } catch (e) {
        // 忽略
      }
    },
    async onMessagePopoverShow() {
      if (!this.showMessageEntry) return
      this.messageLoading = true
      try {
        const res = await getSystemMessagePage({ current: 1, size: 10, onlyUnread: true })
        if (res && (res.code === 200 || res.code === 20000)) {
          const data = res.data || {}
          this.messageList = Array.isArray(data.records) ? data.records : []
        }
      } finally {
        this.messageLoading = false
      }
      this.refreshMessageCount()
    },
    async handleReadAll() {
      try {
        const res = await markAllSystemMessageRead()
        if (res && (res.code === 200 || res.code === 20000)) {
          this.$message.success('已全部标记为已读')
          this.onMessagePopoverShow()
        }
      } catch (e) {
        this.$message.error('操作失败')
      }
    },
    parseRouteQuery(queryText) {
      if (!queryText) return {}
      if (typeof queryText === 'object') return queryText
      try {
        return JSON.parse(queryText)
      } catch (e) {
        return {}
      }
    },
    formatMessageContent(item) {
      if (!item) return '-'
      const content = item.content || '-'
      const bizType = String(item.biz_type || '').toUpperCase()
      if (bizType === 'PURCHASE_RECEIPT_ARRIVAL') {
        return `${this.displayName}，您好，${content}`
      }
      return content
    },
    async handleMessageClick(item) {
      if (!item || !item.id) return
      try {
        await markSystemMessageRead(item.id)
      } catch (e) {
        // 忽略
      }
      this.messageList = (this.messageList || []).filter(msg => String(msg.id) !== String(item.id))
      this.refreshMessageCount()

      const path = item.route_path || '/stock/inbound'
      const query = this.parseRouteQuery(item.route_query_json)
      const msgId = String(item.id)
      const nextQuery = { ...query, msgId }
      this.$router.push({ path, query: nextQuery })
    }
  }
}
</script>

<style lang="scss" scoped>
.navbar {
  height: 50px;
  overflow: hidden;
  position: relative;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0,21,41,.08);

  .hamburger-container {
    line-height: 46px;
    height: 100%;
    float: left;
    cursor: pointer;
    transition: background .3s;
    -webkit-tap-highlight-color:transparent;

    &:hover {
      background: rgba(0, 0, 0, .025)
    }
  }

  .breadcrumb-container {
    float: left;
  }

  .right-menu {
    float: right;
    height: 100%;
    line-height: 50px;

    &:focus {
      outline: none;
    }

    .right-menu-item {
      display: inline-block;
      padding: 0 8px;
      height: 100%;
      font-size: 18px;
      color: #5a5e66;
      vertical-align: text-bottom;

      &.hover-effect {
        cursor: pointer;
        transition: background .3s;

        &:hover {
          background: rgba(0, 0, 0, .025)
        }
      }
    }

    .message-entry {
      font-size: 20px;
      line-height: 50px;

      .message-badge {
        line-height: 1;
      }

      .el-icon-bell {
        font-size: 20px;
        color: #606266;
      }
    }

    .avatar-container {
      margin-right: 30px;

      .avatar-wrapper {
        margin-top: 0;
        position: relative;

        .login-user-name {
          cursor: pointer;
          font-family: "Microsoft YaHei", "微软雅黑", sans-serif;
          font-size: 18px;
          font-weight: 700;
          color: #303133;
          line-height: 50px;
        }

        .el-icon-caret-bottom {
          cursor: pointer;
          position: absolute;
          right: -18px;
          top: 18px;
          font-size: 12px;
        }
      }
    }
  }

  .message-panel {
    max-height: 420px;
    overflow: hidden;

    .message-panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 8px;
      border-bottom: 1px solid #ebeef5;
      margin-bottom: 8px;
      font-weight: 600;
    }

    .message-empty {
      color: #909399;
      text-align: center;
      padding: 20px 0;
    }

    .message-list {
      max-height: 340px;
      overflow-y: auto;
    }

    .message-item {
      padding: 10px 8px;
      border-radius: 4px;
      cursor: pointer;
      margin-bottom: 6px;

      &:hover {
        background: #f5f7fa;
      }

      &.is-unread {
        background: #fdf6ec;
        border-left: 3px solid #e6a23c;
      }

      &.is-read {
        background: #f5f7fa;
        opacity: 0.7;
      }

      .message-title-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 4px;
      }

      .message-title {
        font-size: 13px;
        font-weight: 600;
        color: #303133;
      }

      &.is-unread .message-title,
      &.is-unread .message-content {
        text-decoration: underline;
      }

      &.is-read .message-title,
      &.is-read .message-content {
        text-decoration: none;
      }

      .message-unread-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #f56c6c;
      }

      .message-content {
        color: #606266;
        font-size: 12px;
        margin-bottom: 4px;
      }

      .message-time {
        font-size: 12px;
        color: #909399;
      }
    }
  }
}
</style>
