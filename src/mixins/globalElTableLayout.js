const registeredInstances = new Set()
let globalListenerBound = false

function isElementTableVm(vm) {
  return vm && vm.$options && vm.$options.name === 'ElTable' && typeof vm.doLayout === 'function'
}

function collectElementTables(vm, bucket) {
  if (!vm || !bucket) return
  if (isElementTableVm(vm)) {
    bucket.push(vm)
  }
  const children = vm.$children || []
  children.forEach((child) => collectElementTables(child, bucket))
}

function scheduleLayout(instance, delay = 40) {
  if (!instance || instance._isBeingDestroyed || instance._isDestroyed) return

  if (instance.__globalTableLayoutTimer) {
    clearTimeout(instance.__globalTableLayoutTimer)
  }

  instance.__globalTableLayoutTimer = setTimeout(() => {
    if (!instance || instance._isBeingDestroyed || instance._isDestroyed) return

    instance.$nextTick(() => {
      const tables = []
      collectElementTables(instance, tables)

      if (!tables.length) return

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          tables.forEach((tableVm) => {
            if (!tableVm || tableVm._isBeingDestroyed || tableVm._isDestroyed) return
            const el = tableVm.$el
            if (!el) return
            // display:none 容器下 doLayout 无效，跳过等待下次可见时重排
            if (el.offsetParent === null && window.getComputedStyle(el).position !== 'fixed') return
            if (typeof tableVm.doLayout === 'function') {
              tableVm.doLayout()
            }
            ensureHeaderBodyScrollSync(tableVm)
          })
        })
      })
    })
  }, delay)
}

function ensureHeaderBodyScrollSync(tableVm) {
  if (!tableVm || !tableVm.$el) return
  const body = tableVm.$el.querySelector('.el-table__body-wrapper')
  const header = tableVm.$el.querySelector('.el-table__header-wrapper')
  if (!body || !header) return

  if (!body.__headerSyncHandler) {
    body.__headerSyncHandler = () => {
      header.scrollLeft = body.scrollLeft
    }
    body.addEventListener('scroll', body.__headerSyncHandler, { passive: true })
  }

  header.scrollLeft = body.scrollLeft
}

function scheduleAllLayouts() {
  registeredInstances.forEach((vm) => scheduleLayout(vm, 0))
}

function bindGlobalListeners() {
  if (globalListenerBound || typeof window === 'undefined') return
  globalListenerBound = true

  const handler = () => scheduleAllLayouts()
  window.addEventListener('resize', handler, { passive: true })
  window.addEventListener('orientationchange', handler, { passive: true })
  window.addEventListener('visibilitychange', handler, { passive: true })
  window.addEventListener('transitionend', handler, true)
  window.addEventListener('animationend', handler, true)
}

function bindResizeObserver(instance) {
  if (!instance || typeof ResizeObserver === 'undefined') return
  if (instance.__globalTableResizeObserver) return

  instance.__globalTableResizeObserver = new ResizeObserver(() => {
    scheduleLayout(instance, 0)
  })

  if (instance.$el) {
    instance.__globalTableResizeObserver.observe(instance.$el)
  }
}

function unbindResizeObserver(instance) {
  if (!instance || !instance.__globalTableResizeObserver) return
  try {
    instance.__globalTableResizeObserver.disconnect()
  } catch (e) {
    // noop
  }
  instance.__globalTableResizeObserver = null
}

export default {
  mounted() {
    if (!this || !this.$el || !this.$el.querySelector) return
    if (!this.$el.querySelector('.el-table')) return

    registeredInstances.add(this)
    bindGlobalListeners()
    bindResizeObserver(this)
    scheduleLayout(this)

    if (document && document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        scheduleLayout(this, 0)
      }).catch(() => {})
    }
  },
  activated() {
    if (registeredInstances.has(this)) {
      scheduleLayout(this)
    }
  },
  updated() {
    if (registeredInstances.has(this)) {
      scheduleLayout(this)
    }
  },
  beforeDestroy() {
    if (this.__globalTableLayoutTimer) {
      clearTimeout(this.__globalTableLayoutTimer)
      this.__globalTableLayoutTimer = null
    }
    if (this.$el && this.$el.querySelectorAll) {
      const bodies = this.$el.querySelectorAll('.el-table__body-wrapper')
      bodies.forEach((body) => {
        if (body && body.__headerSyncHandler) {
          body.removeEventListener('scroll', body.__headerSyncHandler)
          body.__headerSyncHandler = null
        }
      })
    }
    unbindResizeObserver(this)
    registeredInstances.delete(this)
  }
}
