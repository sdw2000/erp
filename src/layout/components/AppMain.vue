<template>
  <section class="app-main">
    <transition name="fade-transform" mode="out-in">
      <keep-alive :include="cachedViews">
        <router-view :key="key" />
      </keep-alive>
    </transition>
  </section>
</template>

<script>
export default {
  name: 'AppMain',
  data() {
    return {
      layoutRefreshTimer: null
    }
  },
  computed: {
    cachedViews() {
      return this.$store.state.tagsView.cachedViews
    },
    key() {
      return this.$route.path
    }
  },
  watch: {
    key() {
      this.triggerLayoutRefresh()
    }
  },
  mounted() {
    this.triggerLayoutRefresh()
  },
  beforeDestroy() {
    if (this.layoutRefreshTimer) {
      clearTimeout(this.layoutRefreshTimer)
      this.layoutRefreshTimer = null
    }
  },
  methods: {
    triggerLayoutRefresh() {
      this.$nextTick(() => {
        if (this.layoutRefreshTimer) {
          clearTimeout(this.layoutRefreshTimer)
        }
        this.layoutRefreshTimer = setTimeout(() => {
          window.dispatchEvent(new Event('resize'))
        }, 80)
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.app-main {
  /* 50= navbar  50  */
  min-height: calc(100vh - 50px);
  width: 100%;
  position: relative;
  overflow-x: hidden;
  overflow-y: auto;
}

.fixed-header+.app-main {
  padding-top: 50px;
}

.hasTagsView {
  .app-main {
    /* 84 = navbar + tags-view = 50 + 34 */
    min-height: calc(100vh - 84px);
  }

  .fixed-header+.app-main {
    padding-top: 84px;
  }
}
</style>

<style lang="scss">
// fix css style bug in open el-dialog
.el-popup-parent--hidden {
  .fixed-header {
    padding-right: 15px;
  }
}
</style>
