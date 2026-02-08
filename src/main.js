import Vue from 'vue'

import Cookies from 'js-cookie'

import 'normalize.css/normalize.css' // a modern alternative to CSS resets

import Element from 'element-ui'
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

// set Element UI language to Chinese
locale.use(zhLocale)

// register global utility filters
Object.keys(filters).forEach(key => {
  Vue.filter(key, filters[key])
})

// 全局注册权限检查混入
Vue.mixin(permissionMixin)

// 屏蔽 ResizeObserver 的无害告警（开发态常见噪声）
const ignoreResizeObserverErr = e => {
  const msg = e?.message || e?.reason?.message
  if (msg === 'ResizeObserver loop completed with undelivered notifications.') {
    e.stopImmediatePropagation()
  }
}
window.addEventListener('error', ignoreResizeObserverErr)
window.addEventListener('unhandledrejection', ignoreResizeObserverErr)

// 额外兜底：过滤控制台输出的 ResizeObserver 噪声
const rawConsoleError = window.console.error
window.console.error = (...args) => {
  if (args && typeof args[0] === 'string' && args[0].includes('ResizeObserver loop completed with undelivered notifications.')) {
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
