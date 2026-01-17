<template>
  <div class="error-page">
    <el-row type="flex" justify="center" align="middle" style="height:100%">
      <el-col :span="12" style="text-align:center">
        <img src="@/assets/401_images/401.gif" alt="401" style="max-width:100%;height:300px">
        <h2>401 - 无权限</h2>
        <el-button type="primary" @click="$router.push('/login')">去登录</el-button>
      </el-col>
    </el-row>
  </div>
</template>

<script>
export default {
  name: 'Error401'
}
</script>

<style scoped>
.error-page { height: 100%; }
</style>
