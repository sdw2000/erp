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
  '.search-area',
  '.filter-container',
  '.query-bar',
  '.search-bar',
  '.table-search',
  '.toolbar'
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
