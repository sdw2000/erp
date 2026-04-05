<template>
  <div class="dashboard-container">
    <component :is="currentRole" />
  </div>
</template>

<script>
import { mapGetters } from 'vuex'
import adminDashboard from './admin'
import editorDashboard from './editor'

export default {
  name: 'Dashboard',
  components: { adminDashboard, editorDashboard },
  computed: {
    ...mapGetters([
      'roles'
    ]),
    currentRole() {
      // 销售相关角色统一复用同一套看板页面
      const dashboardRoles = ['admin', 'sales', 'documentation', 'finance']
      const hasDashboardRole = Array.isArray(this.roles) && this.roles.some(role => dashboardRoles.includes(role))
      if (hasDashboardRole) {
        return adminDashboard
      }
      // fallback to editor dashboard
      return editorDashboard
    }
  }
}
</script>
