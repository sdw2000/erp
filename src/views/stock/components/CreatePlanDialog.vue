<template>
  <el-dialog title="新建盘点计划" :visible.sync="show" width="500px" @close="reset" @open="loadStaff">
    <el-form label-width="100px">
      <el-form-item label="涵盖仓库">
        <el-checkbox-group v-model="form.wh">
          <el-checkbox label="TAPE">胶带仓</el-checkbox>
          <el-checkbox label="FILM">薄膜仓</el-checkbox>
          <el-checkbox label="CHEMICAL">化工仓</el-checkbox>
          <el-checkbox label="PACKAGE">包材仓</el-checkbox>
        </el-checkbox-group>
      </el-form-item>
      <el-form-item label="负责人">
        <el-select v-model="form.op" placeholder="请选择负责人" filterable clearable style="width:100%">
          <el-option v-for="u in staffList" :key="u.id" :label="u.realName||u.username" :value="u.realName||u.username"/>
        </el-select>
      </el-form-item>
      <el-form-item label="备注"><el-input v-model="form.rm" type="textarea" :rows="2"/></el-form-item>
    </el-form>
    <span slot="footer"><el-button @click="show=false">取消</el-button><el-button type="primary" @click="submit">创建并快照库存</el-button></span>
  </el-dialog>
</template>
<script>
import request from '@/utils/request'
export default {
  props:{visible:Boolean},
  data(){return{form:{wh:['TAPE','FILM','CHEMICAL','PACKAGE'],op:'',rm:''},staffList:[]}},
  computed:{show:{get(){return this.visible},set(v){this.$emit('update:visible',v)}}},
  methods:{
    reset(){this.form={wh:['TAPE','FILM','CHEMICAL','PACKAGE'],op:'',rm:''}},
    async loadStaff(){if(this.staffList.length)return;try{const r=await request({url:'/api/warehouse-stocktake/staff',method:'get'});this.staffList=r.data||[]}catch(e){}},
    async submit(){
      const w=this.form.wh.join(',');if(!w)return this.$message.warning('请选择仓库')
      try{await request({url:'/api/warehouse-stocktake/plan/create',method:'post',data:{warehouseTypes:w,operator:this.form.op,remark:this.form.rm}});this.show=false;this.$emit('created');this.$message.success('创建成功')}catch(e){this.$message.error('失败')}
    }
  }
}
</script>
