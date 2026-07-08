<template>
  <div class="stocktake-container">
    <el-card>
      <div slot="header"><span>全库盘点</span><el-button type="primary" icon="el-icon-plus" size="small" style="float:right" @click="cv=true">新建盘点计划</el-button></div>
      <el-form :inline="true" :model="query" style="margin-bottom:10px">
        <el-form-item label="盘点单号">
          <el-input v-model="query.planNo" clearable placeholder="输入STK/单号" style="width:220px" @keyup.enter.native="handleSearch" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="query.planStatus" clearable placeholder="全部状态" style="width:150px">
            <el-option label="草稿" value="DRAFT" />
            <el-option label="待确认" value="SUBMITTED" />
            <el-option label="已确认" value="CONFIRMED" />
            <el-option label="已驳回" value="REJECTED" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="el-icon-search" @click="handleSearch">查询</el-button>
          <el-button icon="el-icon-refresh-left" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
      <el-table v-loading="loading" :data="list" border stripe>
        <el-table-column prop="planNo" label="盘点单号" width="200"/><el-table-column prop="planDate" label="日期" width="110"/>
        <el-table-column label="状态" width="100"><template slot-scope="s"><el-tag :type="st(s.row.planStatus)">{{s.row.planStatus}}</el-tag></template></el-table-column>
        <el-table-column label="进度" width="180"><template slot-scope="s">{{s.row.checkedItems||0}}/{{s.row.totalItems||0}}<span v-if="s.row.profitItems" style="color:#67c23a;margin-left:4px">盈{{s.row.profitItems}}</span><span v-if="s.row.lossItems" style="color:#f56c6c;margin-left:4px">亏{{s.row.lossItems}}</span></template></el-table-column>
        <el-table-column prop="warehouseTypes" label="仓库" width="180"/><el-table-column prop="operator" label="负责人" width="100"/><el-table-column prop="remark" label="备注" min-width="120"/>
        <el-table-column label="操作" width="420"><template slot-scope="s"><el-button size="mini" @click="openDetail(s.row)">盘点明细</el-button><el-button size="mini" type="success" @click="exportPlan(s.row)">导出</el-button><el-button v-if="['DRAFT','IN_PROGRESS','CREATED','REJECTED'].includes((s.row.planStatus||'').toUpperCase())" size="mini" type="primary" @click="submitPlan(s.row)">提交确认</el-button><el-button v-if="(s.row.planStatus||'').toUpperCase()==='SUBMITTED'" size="mini" type="warning" @click="confirmPlan(s.row)">确认回写</el-button><el-button v-if="(s.row.planStatus||'').toUpperCase()==='SUBMITTED'" size="mini" @click="rejectPlan(s.row)">驳回</el-button><el-button v-if="(s.row.planStatus||'').toUpperCase()!=='CONFIRMED'" size="mini" type="danger" @click="deletePlan(s.row)">删除</el-button></template></el-table-column>
      </el-table>
      <el-pagination style="margin-top:15px" background layout="total,sizes,prev,pager,next" :total="total" :page-sizes="[10,20,50]" :page-size="ps" :current-page="pg" @size-change="(v)=>{ps=v;pg=1;fetch()}" @current-change="(v)=>{pg=v;fetch()}"/>
    </el-card>
    <CreatePlanDialog :visible.sync="cv" @created="fetch"/>
    <StocktakeDetail :visible.sync="dv" :plan="cp" @refresh="fetch"/>
  </div>
</template>
<script>
import request from '@/utils/request'
import CreatePlanDialog from './components/CreatePlanDialog'
import StocktakeDetail from './components/StocktakeDetail'
export default{components:{CreatePlanDialog,StocktakeDetail},data(){return{loading:false,pg:1,ps:20,total:0,list:[],cv:false,dv:false,cp:{},query:{planNo:'',planStatus:''}}},created(){this.fetch()},methods:{st(s){return {CREATED:'info',DRAFT:'info',IN_PROGRESS:'warning',SUBMITTED:'warning',REJECTED:'danger',COMPLETED:'success',CONFIRMED:'success'}[(s||'').toUpperCase()]||'info'},api(p){return '/api/warehouse-stocktake'+p},handleSearch(){this.pg=1;this.fetch()},handleReset(){this.query={planNo:'',planStatus:''};this.pg=1;this.fetch()},async fetch(){this.loading=true;try{const r=await request({url:this.api('/plan/list'),method:'get',params:{page:this.pg,size:this.ps,planNo:this.query.planNo||undefined,planStatus:this.query.planStatus||undefined}});this.list=r.data.records||[];this.total=Number(r.data.total)||0}finally{this.loading=false}},openDetail(p){this.cp=p;this.dv=true},async exportPlan(p){try{const r=await request({url:this.api('/plan/'+p.id+'/export'),method:'get',responseType:'blob'});const url=URL.createObjectURL(r);const a=document.createElement('a');a.href=url;a.download='盘点表-'+p.planNo+'.xlsx';a.click();URL.revokeObjectURL(url)}catch(e){this.$message.error('导出失败')}},submitPlan(p){this.$confirm('提交后将进入待确认队列，确认前不会改库存。是否继续？','提交确认',{type:'warning'}).then(async()=>{try{await request({url:this.api('/plan/'+p.id+'/submit'),method:'post',params:{operator:this.$store.state.user?.name}});this.$message.success('已提交待确认');this.fetch()}catch(e){this.$message.error((e&&e.msg)||'提交失败')}}).catch(()=>{})},confirmPlan(p){this.$confirm('确认后将按实盘数据回写库存，不可撤销。','确认回写',{type:'warning'}).then(async()=>{try{await request({url:this.api('/plan/'+p.id+'/confirm'),method:'post',params:{operator:this.$store.state.user?.name}});this.$message.success('确认完成');this.fetch()}catch(e){this.$message.error((e&&e.msg)||'确认失败')}}).catch(()=>{})},rejectPlan(p){this.$prompt('请输入驳回原因（可选）','驳回盘点',{confirmButtonText:'驳回',cancelButtonText:'取消',inputPattern:/.*/,inputErrorMessage:'请输入有效内容'}).then(async({value})=>{try{await request({url:this.api('/plan/'+p.id+'/reject'),method:'post',params:{operator:this.$store.state.user?.name,reason:value||''}});this.$message.success('已驳回');this.fetch()}catch(e){this.$message.error((e&&e.msg)||'驳回失败')}}).catch(()=>{})},deletePlan(p){this.$confirm('删除盘点计划及所有盈亏明细?','确认',{type:'warning'}).then(async()=>{try{await request({url:this.api('/plan/'+p.id),method:'delete'});this.$message.success('已删除');this.fetch()}catch(e){this.$message.error('失败')}}).catch(()=>{})}}}
</script>
<style scoped>.stocktake-container{padding:10px}</style>
