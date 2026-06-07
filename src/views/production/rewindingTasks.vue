<template>
  <div class="rewinding-tasks-page">
    <el-tabs v-model="activeTab" type="card">
      <el-tab-pane label="复卷任务" name="task" lazy>
        <production-tasks fixed-type="rewinding" />
      </el-tab-pane>
      <el-tab-pane label="复卷标签打印（独立）" name="label" lazy>
        <production-tasks fixed-type="rewinding" :standalone-label-only="true" />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>
<script>
import ProductionTasks from './components/ProductionTasks.vue'
export default {
  name: 'RewindingTasks',
  components: { ProductionTasks },
  data() {
    return {
      activeTab: 'task'
    }
  }
}
</script>
