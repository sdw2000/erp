<template>
  <div class="profile-view">
    <el-card>
      <div slot="header"><span>个人中心</span></div>
      <p>用户名：{{ user.name }}</p>
      <p>岗位：{{ (user.roles && user.roles[0]) || '-' }}</p>
      <el-button type="primary" @click="changePassword">修改密码</el-button>
    </el-card>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'
export default {
  name: 'Profile',
  data() {
    return {
      user: {
        name: this.name,
        roles: this.roles
      }
    }
  },
  computed: {
    ...mapGetters(['name', 'roles'])
  },
  methods: {
    changePassword() {
      this.$router.push('/profile/change-password')
    }
  }
}
</script>

<style scoped>
.profile-view { padding: 20px }
</style>
