import store from '@/store'

const { body } = document
const WIDTH = 992 // refer to Bootstrap's responsive design

export default {
  watch: {
    $route(route) {
      // 移除路由变化时自动关闭侧边栏的逻辑
      // if (this.device === 'mobile' && this.sidebar.opened) {
      //   store.dispatch('app/closeSideBar', { withoutAnimation: false })
      // }
    }
  },
  beforeMount() {
    window.addEventListener('resize', this.$_resizeHandler)
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.$_resizeHandler)
  },
  mounted() {
    const isMobile = this.$_isMobile()
    if (isMobile) {
      store.dispatch('app/toggleDevice', 'mobile')
      // 移除自动关闭侧边栏的逻辑，保持侧边栏始终显示
      // store.dispatch('app/closeSideBar', { withoutAnimation: true })
    }
  },
  methods: {
    // use $_ for mixins properties
    // https://vuejs.org/v2/style-guide/index.html#Private-property-names-essential
    $_isMobile() {
      const rect = body.getBoundingClientRect()
      return rect.width - 1 < WIDTH
    },
    $_resizeHandler() {
      if (!document.hidden) {
        const isMobile = this.$_isMobile()
        store.dispatch('app/toggleDevice', isMobile ? 'mobile' : 'desktop')

        // 移除自动关闭侧边栏的逻辑，保持侧边栏始终显示
        // if (isMobile) {
        //   store.dispatch('app/closeSideBar', { withoutAnimation: true })
        // }
      }
    }
  }
}
