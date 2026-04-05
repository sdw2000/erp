export default {
  mounted() {
    window.addEventListener('resize', this.scheduleTableLayout)
    this.scheduleTableLayout()
  },
  activated() {
    this.scheduleTableLayout()
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.scheduleTableLayout)
    if (this._tableLayoutTimer) {
      clearTimeout(this._tableLayoutTimer)
      this._tableLayoutTimer = null
    }
  },
  methods: {
    scheduleTableLayout() {
      this.$nextTick(() => {
        if (this._tableLayoutTimer) {
          clearTimeout(this._tableLayoutTimer)
        }
        this._tableLayoutTimer = setTimeout(() => {
          const refs = this.$options.tableLayoutRefs || []
          refs.forEach((refName) => {
            const tableRef = this.$refs[refName]
            const tables = Array.isArray(tableRef) ? tableRef : [tableRef]
            tables.forEach((table) => {
              if (table && typeof table.doLayout === 'function') {
                table.doLayout()
              }
            })
          })
        }, 60)
      })
    }
  }
}