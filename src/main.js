import Vue from 'vue'

import Cookies from 'js-cookie'

import 'normalize.css/normalize.css' // a modern alternative to CSS resets

import Element from 'element-ui'
import { Dialog } from 'element-ui'
import './styles/element-variables.scss'
import zhLocale from 'element-ui/lib/locale/lang/zh-CN'
import locale from 'element-ui/lib/locale'

import '@/styles/index.scss' // global css

import App from './App'
import store from './store'
import router from './router'

import './icons' // icon
import './permission' // permission control
import './utils/error-log' // error log
import * as shanghaiTime from '@/utils/time'

import * as filters from './filters' // global filters
import permissionMixin from './mixins/permission' // 权限检查混入
import globalElTableLayoutMixin from './mixins/globalElTableLayout' // 全局表格自动重排

/**
 * If you don't want to use mock-server
 * you want to use MockJs for mock api
 * you can execute: mockXHR()
 *
 * Currently MockJs will be used in the production environment,
 * please remove it before going online ! ! !
 */
if (process.env.NODE_ENV === 'production') {
  const { mockXHR } = require('../mock')
  mockXHR()
}

Vue.use(Element, {
  size: Cookies.get('size') || 'medium' // set element-ui default size
})

// 统一弹窗行为：只能通过“确认/取消”等按钮关闭
if (Dialog && Dialog.props) {
  Dialog.props.closeOnClickModal.default = false
  Dialog.props.closeOnPressEscape.default = false
  Dialog.props.showClose.default = false
}

// set Element UI language to Chinese
locale.use(zhLocale)

// register global utility filters
Object.keys(filters).forEach(key => {
  Vue.filter(key, filters[key])
})

// 全局时间工具（强制上海时区）
Vue.prototype.$time = shanghaiTime

// 全局注册权限检查混入
Vue.mixin(permissionMixin)
// 全局注册 el-table 自动重排（统一修复表头/表体错位）
Vue.mixin(globalElTableLayoutMixin)

// 屏蔽 ResizeObserver 的无害告警（开发态常见噪声）
const isResizeObserverNoise = msg => {
  if (!msg || typeof msg !== 'string') return false
  return msg.includes('ResizeObserver loop') || msg.includes('undelivered notifications')
}

const ignoreResizeObserverErr = e => {
  const msg = e?.message || e?.reason?.message || (typeof e?.reason === 'string' ? e.reason : '')
  if (isResizeObserverNoise(msg)) {
    if (typeof e.preventDefault === 'function') e.preventDefault()
    if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation()
  }
}
window.addEventListener('error', ignoreResizeObserverErr)
window.addEventListener('unhandledrejection', ignoreResizeObserverErr)

// 全局搜索体验：表头搜索框支持回车触发搜索（等效点击搜索按钮）
const SEARCH_CONTAINER_SELECTORS = [
  '.search-form',
  '.search-area',
  '.filter-container',
  '.query-bar',
  '.search-bar',
  '.table-search',
  '.toolbar',
  '.header-left'
]

const SEARCH_BUTTON_TEXT_REGEXP = /(搜索|查询|筛选)/

const findSearchContainer = (startEl) => {
  if (!startEl || !startEl.closest) return null
  return startEl.closest(SEARCH_CONTAINER_SELECTORS.join(','))
}

const findSearchButton = (container) => {
  if (!container || !container.querySelectorAll) return null
  const buttons = Array.from(container.querySelectorAll('button.el-button'))
  if (!buttons.length) return null

  const iconButton = buttons.find(btn => btn.querySelector('.el-icon-search'))
  if (iconButton) return iconButton

  return buttons.find(btn => {
    const text = (btn.textContent || '').replace(/\s+/g, '')
    return SEARCH_BUTTON_TEXT_REGEXP.test(text)
  }) || null
}

window.addEventListener('keydown', (event) => {
  if (!event || event.key !== 'Enter') return
  if (event.isComposing) return
  if (event.ctrlKey || event.shiftKey || event.altKey || event.metaKey) return

  const target = event.target
  if (!target) return
  const tagName = String(target.tagName || '').toLowerCase()
  if (tagName === 'textarea') return
  if (target.isContentEditable) return

  const container = findSearchContainer(target)
  if (!container) return

  const btn = findSearchButton(container)
  if (!btn || btn.disabled) return

  event.preventDefault()
  btn.click()
}, true)

// 额外兜底：过滤控制台输出的 ResizeObserver 噪声
const rawConsoleError = window.console.error
window.console.error = (...args) => {
  if (args && typeof args[0] === 'string' && isResizeObserverNoise(args[0])) {
    return
  }
  if (rawConsoleError) rawConsoleError.apply(window.console, args)
}

Vue.config.productionTip = false

new Vue({
  el: '#app',
  router,
  store,
  render: h => h(App)
})

// ===== 横向滚动检测：当页面上任意 el-table 出现横向滚动时，给 body 添加 class
// 目的是当表格有横向滚动时，上移 sticky 分页以避免遮挡。
;(function(){
  if (typeof window === 'undefined') return

  let rafId = null
  function checkTablesForHScroll() {
    if (rafId) cancelAnimationFrame(rafId)
    rafId = requestAnimationFrame(() => {
      rafId = null
      try {
        const wrappers = Array.from(document.querySelectorAll('.el-table__body-wrapper'))
        let anyH = false
        const SPACER_CLASS = 'h-scroll-spacer'
        wrappers.forEach(w => {
          if (!w) return
          // 计算更稳健的宽度：优先使用 scrollWidth/clientWidth，其次退回到 getBoundingClientRect
          let scrollW = 0
          try { scrollW = w.scrollWidth || 0 } catch (e) { scrollW = 0 }
          let clientW = 0
          try { clientW = w.clientWidth || 0 } catch (e) { clientW = 0 }
          if (!clientW && w.getBoundingClientRect) {
            const r = w.getBoundingClientRect()
            clientW = Math.round(r.width || r.right - r.left || 0)
          }
          const table = w.closest && w.closest('.el-table')
          if ((!scrollW || !clientW) && table) {
            try {
              const innerTable = table.querySelector('table')
              if (innerTable) {
                scrollW = scrollW || innerTable.scrollWidth || 0
                clientW = clientW || (innerTable.getBoundingClientRect && Math.round(innerTable.getBoundingClientRect().width)) || clientW
              }
            } catch (e) {}
          }

          const isH = scrollW > (clientW || 0)
          if (isH) {
            anyH = true
            w.classList.add('h-scroll')
            if (table) table.classList.add('h-scroll')
            // 确保在表格后插入一个占位 spacer，避免 sticky 分页或下方元素遮挡横向滚动条
            try {
              if (table && table.parentNode) {
                const next = table.nextElementSibling
                if (!(next && next.classList && next.classList.contains(SPACER_CLASS))) {
                  const spacer = document.createElement('div')
                  spacer.className = SPACER_CLASS
                  spacer.style.height = '24px'
                  spacer.style.width = '100%'
                  spacer.style.pointerEvents = 'none'
                  table.parentNode.insertBefore(spacer, table.nextSibling)
                }
              }
            } catch (e) {}
          } else {
            w.classList.remove('h-scroll')
            if (table) table.classList.remove('h-scroll')
            try {
              if (table && table.parentNode) {
                const next = table.nextElementSibling
                if (next && next.classList && next.classList.contains(SPACER_CLASS)) {
                  next.parentNode.removeChild(next)
                }
              }
            } catch (e) {}
          }
        })
        // 异步渲染场景下，稍后再跑一次检测以捕获后续变化
        try {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              const laterWrappers = Array.from(document.querySelectorAll('.el-table__body-wrapper'))
              laterWrappers.forEach(lw => {
                if (!lw) return
                const lt = lw.closest && lw.closest('.el-table')
                let lscroll = 0
                try { lscroll = lw.scrollWidth || 0 } catch (e) { lscroll = 0 }
                let lclient = 0
                try { lclient = lw.clientWidth || 0 } catch (e) { lclient = 0 }
                if (!lclient && lw.getBoundingClientRect) lclient = Math.round(lw.getBoundingClientRect().width || 0)
                if ((!lscroll || !lclient) && lt) {
                  try {
                    const innerTable = lt.querySelector('table')
                    if (innerTable) {
                      lscroll = lscroll || innerTable.scrollWidth || 0
                      lclient = lclient || (innerTable.getBoundingClientRect && Math.round(innerTable.getBoundingClientRect().width)) || lclient
                    }
                  } catch (e) {}
                }
                if (lscroll > (lclient || 0)) {
                  lw.classList.add('h-scroll')
                  if (lt) lt.classList.add('h-scroll')
                  try {
                    if (lt && lt.parentNode) {
                      const next = lt.nextElementSibling
                      if (!(next && next.classList && next.classList.contains(SPACER_CLASS))) {
                        const spacer = document.createElement('div')
                        spacer.className = SPACER_CLASS
                        spacer.style.height = '24px'
                        spacer.style.width = '100%'
                        spacer.style.pointerEvents = 'none'
                        lt.parentNode.insertBefore(spacer, lt.nextSibling)
                      }
                    }
                  } catch (e) {}
                }
              })
            })
          })
        } catch (e) {}
        if (anyH) document.body.classList.add('has-h-scroll')
        else document.body.classList.remove('has-h-scroll')
      } catch (e) {
        // ignore
      }
    })
  }

  // 对外暴露检测函数，供其他 mixin/组件在表格布局完成后主动触发
  try {
    if (typeof window !== 'undefined') window.__checkHScrollTables = checkTablesForHScroll
  } catch (e) {
    // ignore
  }

  // 初次检测与窗口尺寸变化
  window.addEventListener('resize', checkTablesForHScroll, { passive: true })
  window.addEventListener('load', () => setTimeout(checkTablesForHScroll, 50))

  // 在每次路由切换后检测（延迟以等待 DOM 渲染完成）
  if (router && typeof router.afterEach === 'function') {
    router.afterEach(() => {
      setTimeout(checkTablesForHScroll, 80)
    })
  }
})()
