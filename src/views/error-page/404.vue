<template>
  <div class="error-page">
    <el-row type="flex" justify="center" align="middle" style="height:100%">
      <el-col :span="12" style="text-align:center">
        <img src="@/assets/404_images/404.png" alt="404" style="max-width:100%;height:300px">
        <h2>404 - 页面未找到</h2>
        <el-button type="primary" @click="$router.push('/')">返回首页</el-button>
      </el-col>
    </el-row>
  </div>
</template>

<script>
export default {
  name: 'Error404'
}
</script>

<style scoped>
.error-page { height: 100%; }
</style>
