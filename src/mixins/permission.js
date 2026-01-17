/**
 * 权限检查混入
 * 在需要按钮级别权限控制的组件中使用
 */
import store from '@/store'

export default {
  methods: {
    /**
     * 检查当前用户是否拥有指定角色
     * @param {string|string[]} roles - 需要检查的角色，可以是字符串或数组
     * @returns {boolean}
     */
    $hasRole(roles) {
      const userRoles = store.getters.roles || []
      if (typeof roles === 'string') {
        return userRoles.includes(roles)
      }
      if (Array.isArray(roles)) {
        return roles.some(role => userRoles.includes(role))
      }
      return false
    },

    /**
     * 检查当前用户是否是管理员
     * @returns {boolean}
     */
    $isAdmin() {
      return this.$hasRole('admin')
    },

    /**
     * 检查当前用户是否有导入导出权限（仅admin有）
     * @returns {boolean}
     */
    $canImportExport() {
      // 允许 admin 和 warehouse 角色进行导入导出操作
      return this.$hasRole('admin') || this.$hasRole('warehouse')
    }
  }
}
