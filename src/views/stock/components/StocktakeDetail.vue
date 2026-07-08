<template>
  <el-dialog :title="'盘点明细 - ' + plan.planNo" :visible.sync="show" width="92%" top="3vh" @opened="load">
    <div style="margin-bottom:8px;display:flex">
      <el-tabs v-model="tab" @tab-click="load" style="flex:1">
        <el-tab-pane label="胶带仓" name="TAPE"/><el-tab-pane label="薄膜仓" name="FILM"/>
        <el-tab-pane label="化工仓" name="CHEMICAL"/><el-tab-pane label="包材仓" name="PACKAGE"/>
      </el-tabs>
      <div style="padding-top:8px">
        <el-button size="small" icon="el-icon-download" @click="dlTpl">下载模板</el-button>
        <el-button size="small" icon="el-icon-upload2" @click="$refs.impFile.click()">导入</el-button>
        <el-button size="small" icon="el-icon-printer" @click="exp">导出</el-button>
        <el-button size="small" icon="el-icon-plus" type="success" @click="av=true">新增行</el-button>
        <input ref="impFile" type="file" accept=".xlsx,.xls" style="display:none" @change="doImport"/>
      </div>
    </div>
    <el-table v-loading="dl" :data="items" border stripe max-height="460" size="small">
      <el-table-column type="index" label="序号" width="55" fixed/>
      <el-table-column prop="materialCode" label="料号" width="170" fixed/>
      <el-table-column prop="materialName" label="物料名称" min-width="130" show-overflow-tooltip/>
      <el-table-column prop="batchNo" label="批次号" width="140"/>
      <el-table-column prop="specDesc" label="规格" width="140"/>
      <el-table-column prop="location" label="卡板号/库位" width="120"/>
      <el-table-column v-if="tab==='TAPE'" label="数字号" width="90" align="center"><template slot-scope="s"><el-input-number v-model="s.row.sequenceNo" :min="0" size="small" controls-position="right" style="width:70px" @change="(v)=>updateSeq(s.row,v)"/></template></el-table-column>
      <el-table-column v-if="tab==='FILM'" prop="rollNo" label="卷号" width="100"/>
      <el-table-column v-if="tab==='CHEMICAL'" prop="containerNo" label="桶号" width="100"/>
      <el-table-column label="账面数量" width="120" align="right"><template slot-scope="s">{{tab==='TAPE'?Math.round(s.row.beforeQty):fmt(s.row.beforeQty)}} {{s.row.unit}}</template></el-table-column>
      <el-table-column label="实盘数量" width="180"><template slot-scope="s"><el-input-number v-model="s.row.afterQty" :min="0" :precision="tab==='TAPE'?0:3" size="small" controls-position="right" style="width:140px" @change="(v)=>update(s.row,v)"/></template></el-table-column>
      <el-table-column label="差异" width="100" align="right"><template slot-scope="s"><span :class="s.row.diffQty>0?'cg':s.row.diffQty<0?'cr':''">{{s.row.diffQty!=null?fmt(s.row.diffQty):'-'}}</span></template></el-table-column>
      <el-table-column label="类型" width="80" align="center"><template slot-scope="s"><el-tag v-if="s.row.diffType==='PROFIT'" type="success" size="mini">盘盈</el-tag><el-tag v-else-if="s.row.diffType==='LOSS'" type="danger" size="mini">盘亏</el-tag><el-tag v-else-if="s.row.diffType==='NONE'" type="info" size="mini">平账</el-tag><span v-else style="color:#c0c4cc">未盘</span></template></el-table-column>
      <el-table-column prop="operator" label="盘点人" width="80"/>
    </el-table>
    <el-pagination style="margin-top:10px" background layout="total,prev,pager,next" :total="dTotal" :page-size="dSize" :current-page="dPg" @current-change="(v)=>{dPg=v;load()}" small/>
    <el-dialog title="新增盘点行" :visible.sync="av" width="450px" append-to-body>
      <el-form label-width="80px">
        <el-form-item label="料号"><el-input v-model="af.materialCode"/></el-form-item>
        <el-form-item label="物料名称"><el-input v-model="af.materialName"/></el-form-item>
        <el-form-item label="批次号"><el-input v-model="af.batchNo"/></el-form-item>
        <el-form-item label="规格"><el-input v-model="af.specDesc"/></el-form-item>
        <el-form-item label="库位"><el-input v-model="af.location"/></el-form-item>
        <el-form-item label="实盘数量"><el-input-number v-model="af.beforeQty" :min="0" :precision="tab==='TAPE'?0:3" style="width:100%"/></el-form-item>
        <el-form-item label="单位"><el-input v-model="af.unit" :placeholder="tab==='TAPE'?'卷':tab==='FILM'?'㎡':tab==='CHEMICAL'?'kg':'个'"/></el-form-item>
      </el-form>
      <span slot="footer"><el-button @click="av=false">取消</el-button><el-button type="primary" @click="addRow">确定新增</el-button></span>
    </el-dialog>
    <span slot="footer"><el-button @click="show=false">关闭</el-button></span>
  </el-dialog>
</template>
<script>
import request from '@/utils/request'
export default {
  props:{visible:Boolean,plan:Object},
  data(){return{tab:'TAPE',dl:false,items:[],dPg:1,dSize:30,dTotal:0,av:false,af:{materialCode:'',materialName:'',batchNo:'',specDesc:'',location:'',beforeQty:0,unit:''}}},
  computed:{show:{get(){return this.visible},set(v){this.$emit('update:visible',v)}}},
  methods:{
    api(p){return '/api/warehouse-stocktake'+p},
    fmt(v){return v!=null?parseFloat(v).toFixed(3):'0'},
    async load(){if(!this.plan.id)return;this.dl=true;try{const r=await request({url:this.api('/plan/'+this.plan.id+'/items'),method:'get',params:{page:this.dPg,size:this.dSize,warehouseType:this.tab}});this.items=(r.data.records||[]).map(x=>({...x,afterQty:x.afterQty||0}));this.dTotal=Number(r.data.total)||0}finally{this.dl=false}},
    async update(row,v){try{const b={afterQty:v,sequenceNo:row.sequenceNo,operator:this.$store.state.user?.name||'system'};if(this.tab==='TAPE'){b.afterRolls=Number(v||0);b.afterSqm=row.sqm||row.afterSqm||row.beforeQty||0};await request({url:this.api('/plan/'+this.plan.id+'/item/'+row.id),method:'put',data:b});row.diffQty=(v||0)-(row.beforeQty||0);row.diffType=row.diffQty>0?'PROFIT':row.diffQty<0?'LOSS':'NONE'}catch(e){this.$message.error('失败')}},
    async updateSeq(row,v){try{await request({url:this.api('/plan/'+this.plan.id+'/item/'+row.id),method:'put',data:{afterQty:row.afterQty||0,sequenceNo:v,operator:this.$store.state.user?.name||'system'}})}catch(e){this.$message.error('失败')}},
    async dlTpl(){try{const r=await request({url:this.api('/plan/'+this.plan.id+'/template?warehouseType='+this.tab),method:'get',responseType:'blob'});const url=URL.createObjectURL(r);const a=document.createElement('a');a.href=url;a.download='模板-'+this.plan.planNo+'.xlsx';a.click();URL.revokeObjectURL(url)}catch(e){this.$message.error('下载失败')}},
    async exp(){try{const r=await request({url:this.api('/plan/'+this.plan.id+'/export'),method:'get',responseType:'blob'});const url=URL.createObjectURL(r);const a=document.createElement('a');a.href=url;a.download='盘点表-'+this.plan.planNo+'.xlsx';a.click();URL.revokeObjectURL(url)}catch(e){this.$message.error('导出失败')}},
    async doImport(e){const f=e.target.files[0];if(!f)return;const fd=new FormData();fd.append('file',f);try{const r=await request({url:this.api('/plan/'+this.plan.id+'/import?warehouseType='+this.tab),method:'post',data:fd,headers:{'Content-Type':'multipart/form-data'}});this.$message.success('导入成功'+r.data.successCount+'失败'+r.data.errorCount);if(r.data.errors)this.$message.warning(r.data.errors);this.load();this.$emit('refresh')}catch(e){this.$message.error('失败')};e.target.value=''},
    async addRow(){const d=this.af;if(!d.materialCode)return this.$message.warning('请输入料号');try{await request({url:this.api('/plan/'+this.plan.id+'/item'),method:'post',data:{warehouseType:this.tab,materialCode:d.materialCode,materialName:d.materialName,batchNo:d.batchNo,specDesc:d.specDesc,location:d.location,beforeQty:d.beforeQty,unit:d.unit||'个',operator:this.$store.state.user?.name||'system'}});this.av=false;this.af={materialCode:'',materialName:'',batchNo:'',specDesc:'',location:'',beforeQty:0,unit:''};this.$message.success('新增成功');this.load();this.$emit('refresh')}catch(e){this.$message.error('失败')}}
  }
}
</script>
<style scoped>.cg{color:#67c23a}.cr{color:#f56c6c}</style>
