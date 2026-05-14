<template>
  <div class="formula-container">
    <el-card>
      <div slot="header" class="clearfix">
        <span>配方管理</span>        <div style="float: right">
          <el-button v-if="$canEdit()" type="danger" plain icon="el-icon-refresh" size="small" @click="handleResequence">重编流水号</el-button>
          <el-button v-if="$canImportExport()" type="success" icon="el-icon-download" size="small" @click="handleDownloadTemplate">下载模板</el-button>
          <el-button v-if="$canImportExport()" type="warning" icon="el-icon-upload2" size="small" @click="handleImportClick">导入</el-button>
          <el-button v-if="$canImportExport()" type="info" icon="el-icon-download" size="small" @click="handleExportAll">导出</el-button>
          <el-button v-if="$canEdit()" type="primary" icon="el-icon-plus" size="small" @click="handleAdd">新增配方</el-button>
          <input ref="importFile" type="file" accept=".xlsx,.xls" style="display:none" @change="handleImportChange">
        </div>
      </div>

      <!-- 查询表单 -->
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="产品料号">
          <el-input v-model="searchForm.materialCode" placeholder="请输入料号" clearable style="width: 180px" />
        </el-form-item>
        <el-form-item label="产品名称">
          <el-input v-model="searchForm.productName" placeholder="请输入名称" clearable style="width: 160px" />
        </el-form-item>
        <el-form-item label="胶水型号">
          <el-input v-model="searchForm.glueModel" placeholder="请输入胶水型号" clearable style="width: 160px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="el-icon-search" @click="handleSearch">搜 索</el-button>
          <el-button icon="el-icon-refresh-left" @click="handleReset">重 置</el-button>
        </el-form-item>
      </el-form>

      <!-- 数据表格 -->
      <el-table v-loading="loading" :data="list" style="width: 100%; margin-top: 15px" border stripe size="small">
        <el-table-column type="index" label="序号" width="55" align="center" :index="indexMethod" />
        <el-table-column prop="formulaNo" label="文件编号" width="90" align="center" />
        <el-table-column prop="productName" label="产品名称" min-width="180" show-overflow-tooltip />
        <el-table-column prop="materialCode" label="产品料号" width="200" show-overflow-tooltip />
        <el-table-column prop="glueModel" label="胶水型号" width="180" show-overflow-tooltip />
        <el-table-column prop="glueType" label="胶水类型" width="90" align="center" />
        <el-table-column prop="colorCode" label="颜色" width="70" align="center">
          <template slot-scope="scope">
            <el-tag size="small">{{ scope.row.colorCode }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="coatingThickness" label="涂胶厚度/μm" width="100" align="center" />
        <el-table-column prop="solidContent" label="固含量" width="80" align="center" />
        <el-table-column prop="totalWeight" label="总重量/kg" width="100" align="right" />
        <el-table-column prop="version" label="版次" width="70" align="center" />
        <el-table-column prop="status" label="状态" width="70" align="center">
          <template slot-scope="scope">
            <el-tag :type="scope.row.status === 1 ? 'success' : 'info'" size="small">
              {{ scope.row.status === 1 ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>        <el-table-column label="操作" width="200" fixed="right" align="center">
          <template slot-scope="scope">
            <el-button type="text" size="small" icon="el-icon-view" @click="handleView(scope.row)">查看</el-button>
            <el-button v-if="$canEdit()" type="text" size="small" icon="el-icon-edit" @click="handleEdit(scope.row)">编辑</el-button>
            <el-button v-if="$canImportExport()" type="text" size="small" icon="el-icon-download" @click="handleExport(scope.row)">导出</el-button>
            <el-button v-if="$canEdit()" type="text" size="small" icon="el-icon-delete" style="color:#f56c6c" @click="handleDelete(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        :current-page="pagination.page"
        :page-sizes="[20, 50, 100]"
        :page-size="pagination.size"
        :total="pagination.total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </el-card>

    <!-- 新增/编辑弹窗 -->
    <el-dialog :title="dialogTitle" :visible.sync="dialogVisible" width="1000px" :close-on-click-modal="false" top="5vh">
      <el-form ref="form" :model="form" :rules="rules" label-width="110px" size="small">
        <!-- 基本信息 -->
        <el-divider content-position="left">基本信息</el-divider>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="文件编号">
              <el-input v-model="form.formulaNo" placeholder="系统自动生成，如 F00001" disabled />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="版次">
              <el-input v-model="form.version" placeholder="系统自动维护" disabled />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="制定日期">
              <el-date-picker v-model="form.createDate" type="datetime" placeholder="选择日期时间" style="width:100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="产品料号" prop="materialCode">
              <el-autocomplete
                v-model="form.materialCode"
                :fetch-suggestions="queryMaterialCodeSuggestions"
                placeholder="输入关键字搜索研发料号/原料料号"
                style="width:100%"
                @select="handleMaterialCodeSelect"
                @blur="handleMaterialCodeInputChange"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="产品名称" prop="productName">
              <el-input v-model="form.productName" placeholder="根据料号自动带出" disabled />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 胶水信息 -->
        <el-divider content-position="left">胶水信息</el-divider>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="胶水型号">
              <el-input v-model="form.glueModel" placeholder="系统自动生成，如 GLU-00001" disabled />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="胶水类型">
              <el-select v-model="form.glueType" placeholder="请选择" style="width:100%" @change="handleGlueTypeChange">
                <el-option v-for="it in glueTypeOptions" :key="it.value" :label="it.label" :value="it.value" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="颜色代码">
              <el-input v-model="form.colorCode" placeholder="如: G01" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row>
          <el-col :span="24">
            <el-form-item label="状态">
              <el-switch v-model="form.status" :active-value="1" :inactive-value="0" active-text="启用" inactive-text="禁用" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="6">
            <el-form-item label="涂胶厚度(μm)">
              <el-input-number v-model="form.coatingThickness" :min="0" :precision="2" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="胶水密度">
              <el-input-number v-model="form.glueDensity" :min="0" :precision="3" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="固含量(%)">
              <el-input v-model="form.solidContent" placeholder="如: 15±2" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="涂布数量(㎡)">
              <el-input-number v-model="form.coatingArea" :min="0" :precision="0" style="width:100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row>
          <el-col :span="24">
            <el-form-item label="工艺温度">
              <el-input v-model="form.processTemperature" placeholder="如: 70/80/120/120/120/90/80/70" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row>
          <el-col :span="24">
            <el-form-item label="工艺车速">
              <el-input v-model="form.processSpeed" placeholder="如: 40m/min" />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 胶水配比 -->
        <el-divider content-position="left">胶水配比（化工）</el-divider>
        <el-table :data="form.glueItems" border size="small" style="margin-bottom: 10px">
          <el-table-column label="物料代码" width="220">
            <template slot-scope="scope">
              <el-select
                v-model="scope.row.materialCode"
                filterable
                placeholder="请选择（原材料表）"
                size="small"
                style="width:100%"
                @focus="ensureRawMaterialsLoaded"
                @change="onRawMaterialChange(scope.row, $event)"
              >
                <el-option
                  v-for="item in getSectionMaterialOptions('glue')"
                  :key="item.id"
                  :label="item.materialCode"
                  :value="item.materialCode"
                >
                  <span style="float:left">{{ item.materialCode }}</span>
                  <span style="float:right; color:#8492a6; font-size:12px">{{ item.materialName }}</span>
                </el-option>
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="重量(Kg/桶)" width="150">
            <template slot-scope="scope">
              <el-input-number v-model="scope.row.weight" :min="0" :precision="4" size="small" style="width:100%" />
            </template>
          </el-table-column>
          <el-table-column label="比例(%)" width="140">
            <template slot-scope="scope">
              <el-input-number v-model="scope.row.ratio" :min="0" :precision="4" size="small" style="width:100%" />
            </template>
          </el-table-column>
          <el-table-column label="备注" min-width="260">
            <template slot-scope="scope">
              <el-input v-model="scope.row.remark" size="small" placeholder="稀释说明等" />
            </template>
          </el-table-column>
          <el-table-column label="操作" width="70" align="center">
            <template slot-scope="scope">
              <el-button type="text" size="small" style="color:#f56c6c" @click="removeSectionItem('glueItems', scope.$index)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-button type="primary" size="small" icon="el-icon-plus" @click="addSectionItem('glueItems')">添加胶水配比</el-button>
        <el-button
          type="success"
          size="small"
          icon="el-icon-camera"
          style="margin-left: 8px"
          :loading="ocrLoading"
          @click="handleOcrPageClick"
        >单页识别录入胶水BOM</el-button>
        <el-select v-model="selectedCompoundMaterialCode" filterable clearable size="small" style="width:260px; margin-left: 8px;" placeholder="选择复配料(如AJSZ0101(20%))">
          <el-option
            v-for="item in getCompoundMaterialOptions()"
            :key="item.id"
            :label="item.materialCode"
            :value="item.materialCode"
          >
            <span style="float:left">{{ item.materialCode }}</span>
            <span style="float:right; color:#8492a6; font-size:12px">{{ item.materialName }}</span>
          </el-option>
        </el-select>
        <el-button type="warning" size="small" icon="el-icon-plus" style="margin-left: 6px" @click="addCompoundMaterialToGlue">添加复配料</el-button>
        <span style="margin-left: 12px; color: #909399; font-size: 12px;">支持录入类似 AJSZ0101(20%)，系统会按基础料号匹配并建议备注。</span>
        <input
          ref="ocrPageFile"
          type="file"
          accept="image/*,.xlsx,.xls"
          style="display:none"
          @change="handleOcrPageChange"
        >

        <!-- 隔离剂配比 -->
        <el-divider content-position="left">隔离剂配比（化工）</el-divider>
        <el-table :data="form.isolatorItems" border size="small" style="margin-bottom: 10px">
          <el-table-column label="物料代码" width="220">
            <template slot-scope="scope">
              <el-select
                v-model="scope.row.materialCode"
                filterable
                placeholder="请选择（原材料表）"
                size="small"
                style="width:100%"
                @focus="ensureRawMaterialsLoaded"
                @change="onRawMaterialChange(scope.row, $event)"
              >
                <el-option
                  v-for="item in getSectionMaterialOptions('isolator')"
                  :key="item.id"
                  :label="item.materialCode"
                  :value="item.materialCode"
                >
                  <span style="float:left">{{ item.materialCode }}</span>
                  <span style="float:right; color:#8492a6; font-size:12px">{{ item.materialName }}</span>
                </el-option>
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="重量(Kg/桶)" width="150">
            <template slot-scope="scope">
              <el-input-number v-model="scope.row.weight" :min="0" :precision="4" size="small" style="width:100%" />
            </template>
          </el-table-column>
          <el-table-column label="比例(%)" width="140">
            <template slot-scope="scope">
              <el-input-number v-model="scope.row.ratio" :min="0" :precision="4" size="small" style="width:100%" />
            </template>
          </el-table-column>
          <el-table-column label="备注" min-width="260">
            <template slot-scope="scope">
              <el-input v-model="scope.row.remark" size="small" placeholder="稀释说明等" />
            </template>
          </el-table-column>
          <el-table-column label="操作" width="70" align="center">
            <template slot-scope="scope">
              <el-button type="text" size="small" style="color:#f56c6c" @click="removeSectionItem('isolatorItems', scope.$index)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-button type="primary" size="small" icon="el-icon-plus" @click="addSectionItem('isolatorItems')">添加隔离剂配比</el-button>

        <!-- 离型材料 -->
        <el-divider content-position="left">离型材料用量</el-divider>
        <el-table :data="form.releaseItems" border size="small" style="margin-bottom: 10px">
          <el-table-column label="物料代码" width="260">
            <template slot-scope="scope">
              <el-select
                v-model="scope.row.materialCode"
                filterable
                placeholder="请选择（原材料表）"
                size="small"
                style="width:100%"
                @focus="ensureRawMaterialsLoaded"
                @change="onRawMaterialChange(scope.row, $event)"
              >
                <el-option
                  v-for="item in getSectionMaterialOptions('release')"
                  :key="item.id"
                  :label="item.materialCode"
                  :value="item.materialCode"
                >
                  <span style="float:left">{{ item.materialCode }}</span>
                  <span style="float:right; color:#8492a6; font-size:12px">{{ item.materialName }}</span>
                </el-option>
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="平米数(㎡)" width="160">
            <template slot-scope="scope">
              <el-input-number v-model="scope.row.weight" :min="0" :precision="2" size="small" style="width:100%" />
            </template>
          </el-table-column>
          <el-table-column label="备注" min-width="320">
            <template slot-scope="scope">
              <el-input v-model="scope.row.remark" size="small" placeholder="备注" />
            </template>
          </el-table-column>
          <el-table-column label="操作" width="70" align="center">
            <template slot-scope="scope">
              <el-button type="text" size="small" style="color:#f56c6c" @click="removeSectionItem('releaseItems', scope.$index)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-button type="primary" size="small" icon="el-icon-plus" @click="addSectionItem('releaseItems', true)">添加离型材料</el-button>

        <!-- 基材 -->
        <el-divider content-position="left">基材用量</el-divider>
        <el-table :data="form.baseItems" border size="small" style="margin-bottom: 10px">
          <el-table-column label="物料代码" width="260">
            <template slot-scope="scope">
              <el-select
                v-model="scope.row.materialCode"
                filterable
                placeholder="请选择（原材料表）"
                size="small"
                style="width:100%"
                @focus="ensureRawMaterialsLoaded"
                @change="onRawMaterialChange(scope.row, $event)"
              >
                <el-option
                  v-for="item in getSectionMaterialOptions('base')"
                  :key="item.id"
                  :label="item.materialCode"
                  :value="item.materialCode"
                >
                  <span style="float:left">{{ item.materialCode }}</span>
                  <span style="float:right; color:#8492a6; font-size:12px">{{ item.materialName }}</span>
                </el-option>
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="平米数(㎡)" width="160">
            <template slot-scope="scope">
              <el-input-number v-model="scope.row.weight" :min="0" :precision="2" size="small" style="width:100%" />
            </template>
          </el-table-column>
          <el-table-column label="备注" min-width="320">
            <template slot-scope="scope">
              <el-input v-model="scope.row.remark" size="small" placeholder="备注" />
            </template>
          </el-table-column>
          <el-table-column label="操作" width="70" align="center">
            <template slot-scope="scope">
              <el-button type="text" size="small" style="color:#f56c6c" @click="removeSectionItem('baseItems', scope.$index)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-button type="primary" size="small" icon="el-icon-plus" @click="addSectionItem('baseItems', true)">添加基材</el-button>

        <span style="margin-left: 20px; font-weight: bold;">
          总重量: {{ calculateTotalWeight() }} kg
        </span>

        <!-- 审批信息 -->
        <el-divider content-position="left">审批信息</el-divider>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="编制">
              <el-input v-model="form.preparedBy" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="审核">
              <el-input v-model="form.reviewedBy" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="批准">
              <el-input v-model="form.approvedBy" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>

      <div slot="footer">
        <el-button @click="dialogVisible = false">取 消</el-button>
        <el-button :loading="submitting" @click="handleTempSave">临时保存</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">确 定</el-button>
      </div>
    </el-dialog>

    <!-- 查看详情弹窗 -->
    <el-dialog title="配胶标准单详情" :visible.sync="viewDialogVisible" width="900px" top="5vh">
      <div v-if="viewData" class="formula-detail">
        <!-- 头部信息 -->
        <div class="header-info">
          <table class="info-table">
            <tr>
              <td class="label">文件编号</td><td>{{ viewData.formulaNo }}</td>
              <td class="label">版次</td><td>{{ viewData.version }}</td>
              <td class="label">制定日期</td><td>{{ formatDate(viewData.createDate) }}</td>
            </tr>
          </table>
        </div>

        <div class="company-title">东莞方恩电子材料科技有限公司</div>
        <div class="form-title">配胶标准单</div>

        <table class="detail-table">
          <tr>
            <td class="label">产品名称</td>
            <td colspan="2">{{ viewData.productName }}</td>
            <td class="label">产品型号</td>
            <td colspan="2">{{ viewData.materialCode }}</td>
          </tr>
          <tr>
            <td class="label">胶水型号</td>
            <td colspan="2">{{ viewData.glueModel }}</td>
            <td class="label">胶水类型</td>
            <td colspan="2">{{ viewData.glueType || '-' }}</td>
          </tr>
          <tr>
            <td class="label">颜色</td>
            <td colspan="2">{{ viewData.colorCode }}</td>
            <td class="label">工艺车速</td>
            <td colspan="2">{{ viewData.processSpeed || '-' }}</td>
          </tr>
          <tr>
            <td class="label">涂胶厚度(μm)</td>
            <td>{{ viewData.coatingThickness }}</td>
            <td class="label">胶水密度(g/cm³)</td>
            <td>{{ viewData.glueDensity }}</td>
            <td class="label">固含量(%)</td>
            <td>{{ viewData.solidContent }}</td>
          </tr>
          <tr>
            <td class="label">涂布数量(㎡)</td>
            <td colspan="5">{{ viewData.coatingArea }}</td>
          </tr>
          <tr>
            <td class="label">工艺温度</td>
            <td colspan="5" class="remark-cell">{{ viewData.processTemperature || '-' }}</td>
          </tr>
        </table>

        <!-- 原料明细 -->
        <table class="item-table">
          <thead>
            <tr>
              <th>分组</th>
              <th>物料代码</th>
              <th>数值</th>
              <th>比例</th>
              <th>备注</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, idx) in viewData.items" :key="idx">
              <td>{{ getSectionLabel(getItemSection(item)) }}</td>
              <td>{{ item.materialCode }}</td>
              <td class="number">{{ formatItemValue(item) }}</td>
              <td class="number">{{ isAreaSection(getItemSection(item)) ? '/' : (item.ratio ? item.ratio + '%' : '/') }}</td>
              <td>{{ stripStoredRemark(item.remark) }}</td>
            </tr>
            <tr class="total-row">
              <td colspan="2"><strong>总重量(kg)</strong></td>
              <td class="number"><strong>{{ viewData.totalWeight }}</strong></td>
              <td colspan="2">/</td>
            </tr>
          </tbody>
        </table>

        <!-- 审批 -->
        <table class="approve-table">
          <tr>
            <td class="label">编制</td>
            <td>{{ viewData.preparedBy }}</td>
            <td class="label">审核</td>
            <td>{{ viewData.reviewedBy }}</td>
            <td class="label">批准</td>
            <td>{{ viewData.approvedBy }}</td>
          </tr>
        </table>
      </div>      <div slot="footer">
        <el-button v-if="$canImportExport()" type="primary" icon="el-icon-download" @click="handleExport(viewData)">导出Excel</el-button>
        <el-button @click="viewDialogVisible = false">关 闭</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import {
  getFormulaList, getFormulaById, createFormula, updateFormula, deleteFormula, exportFormula,
  resequenceFormula,
  downloadTemplate, importFormula, exportAllFormula
} from '@/api/tapeFormula'
import { getRawMaterialList } from '@/api/tapeRawMaterial'
import { getSpecByMaterialCode, getSpecSuggestions } from '@/api/tapeSpec'
import * as XLSX from 'xlsx'

export default {
  name: 'TapeFormulaManagement',
  data() {
    return {
      searchForm: {
        materialCode: '',
        productName: '',
        glueModel: ''
      },
      rawMaterials: [],
      glueTypeOptions: [
        { label: '亚克力', value: '亚克力' },
        { label: '橡胶', value: '橡胶' },
        { label: '硅胶', value: '硅胶' },
        { label: 'PU胶', value: 'PU胶' },
        { label: '固化剂', value: '固化剂' },
        { label: '催化剂', value: '催化剂' },
        { label: '离型剂', value: '离型剂' },
        { label: '静电剂', value: '静电剂' },
        { label: '光油', value: '光油' },
        { label: '油墨', value: '油墨' }
      ],
      glueDensityMap: {
        亚克力: 1.05,
        橡胶: 0.98,
        硅胶: 1.1,
        PU胶: 1.12
      },
      selectedCompoundMaterialCode: '',
      list: [],
      loading: false,
      pagination: { page: 1, size: 20, total: 0 },

      // 编辑弹窗
      dialogVisible: false,
      dialogTitle: '新增配方',
      submitting: false,
      ocrLoading: false,
      tesseractReady: false,
      form: this.getEmptyForm(),
      rules: {
        materialCode: [{ required: true, message: '请输入产品料号', trigger: 'blur' }],
        productName: [{ required: true, message: '请输入产品名称', trigger: 'blur' }]
      },

      // 查看弹窗
      viewDialogVisible: false,
      viewData: null
    }
  },
  created() {
    this.fetchData()
    this.fetchRawMaterials()
  },
  methods: {
    getTempDraftStorageKey() {
      if (this.form && this.form.id) return `tape_formula_temp_draft_${this.form.id}`
      return 'tape_formula_temp_draft_new'
    },
    buildTempDraftPayload() {
      this.syncFlatItemsFromSections()
      return {
        form: {
          ...this.form,
          createDate: this.form && this.form.createDate ? this.form.createDate : null
        },
        savedAt: Date.now()
      }
    },
    readTempDraft() {
      try {
        const key = this.getTempDraftStorageKey()
        const raw = window.localStorage.getItem(key)
        if (!raw) return null
        const data = JSON.parse(raw)
        if (!data || !data.form) return null
        return data
      } catch (e) {
        return null
      }
    },
    clearTempDraft(key) {
      try {
        const targetKey = key || this.getTempDraftStorageKey()
        window.localStorage.removeItem(targetKey)
      } catch (e) {
        // ignore
      }
    },
    async tryRestoreTempDraft() {
      const data = this.readTempDraft()
      if (!data || !data.form) return
      try {
        await this.$confirm('检测到上次临时保存的草稿，是否恢复继续编辑？', '提示', { type: 'info' })
        this.form = { ...this.getEmptyForm(), ...data.form }
        this.form.createDate = this.form.createDate ? new Date(this.form.createDate) : new Date()
        if (!this.form.items) this.form.items = []
        this.initializeSectionItemsFromFlat()
        this.$nextTick(() => this.$refs.form && this.$refs.form.clearValidate())
      } catch (e) {
        // 用户取消恢复，不处理
      }
    },
    $canEdit() {
      // 只有 admin 和 rd 角色可以进行增删改操作
      return this.$hasRole('admin') || this.$hasRole('rd')
    },
    indexMethod(index) {
      return (this.pagination.page - 1) * this.pagination.size + index + 1
    },
    async fetchRawMaterials() {
      try {
        const res = await getRawMaterialList()
        if (res.code === 20000) {
          this.rawMaterials = res.data || []
        }
      } catch (e) {
        console.error('获取原料字典失败', e)
      }
    },
    ensureRawMaterialsLoaded() {
      if (!Array.isArray(this.rawMaterials) || this.rawMaterials.length === 0) {
        this.fetchRawMaterials()
      }
    },
    formatMaterialCategory(category) {
      const map = { film: '薄膜', chemical: '化工物料' }
      return map[category] || category || '-'
    },
    normalizeMaterialCategory(category) {
      const text = String(category || '').trim().toLowerCase()
      if (!text) return ''
      if (text === 'chemical' || text.includes('化工')) return 'chemical'
      if (text === 'film' || text.includes('薄膜')) return 'film'
      return text
    },
    isChemicalLikeMaterial(item) {
      const cat = this.normalizeMaterialCategory(item && item.materialCategory)
      if (cat === 'chemical') return true
      const text = [
        item && item.materialType,
        item && item.materialMajor,
        item && item.materialCategoryRaw,
        item && item.materialName,
        item && item.materialCode
      ].filter(Boolean).join(' ').toLowerCase()
      return /化工|树脂|固化剂|催化剂|离型剂|静电剂|油墨|光油|胶/.test(text)
    },
    isAreaLikeMaterial(item) {
      const cat = this.normalizeMaterialCategory(item && item.materialCategory)
      if (cat === 'film') return true
      const text = [
        item && item.materialType,
        item && item.materialMajor,
        item && item.materialCategoryRaw,
        item && item.materialCategory,
        item && item.materialName,
        item && item.materialCode
      ].filter(Boolean).join(' ').toLowerCase()
      return /薄膜|原膜|基材|离型|保护膜|pet|bopp|opp|ops|cpp|pi|pvc|tpu|tissue|pefoam|fiberglass/.test(text)
    },
    filteredRawMaterialOptions(category = '') {
      const list = this.rawMaterials || []
      if (!category) return list
      return list.filter(item => this.normalizeMaterialCategory(item.materialCategory) === category)
    },
    getSectionMaterialOptions(section) {
      const list = this.rawMaterials || []
      if (!list.length) return []
      if (section === 'glue' || section === 'isolator') {
        const chemicalList = list.filter(item => this.isChemicalLikeMaterial(item))
        return chemicalList.length ? chemicalList : list
      }
      if (section === 'base' || section === 'release') {
        const areaList = list.filter(item => this.isAreaLikeMaterial(item))
        return areaList.length ? areaList : list
      }
      return list
    },
    getCompoundMaterialOptions() {
      return (this.rawMaterials || []).filter((item) => {
        if (this.normalizeMaterialCategory(item.materialCategory) !== 'chemical') return false
        const code = String(item.materialCode || '')
        return /[（(]\s*\d+(?:\.\d+)?\s*%\s*[）)]/.test(code)
      })
    },
    addCompoundMaterialToGlue() {
      const code = String(this.selectedCompoundMaterialCode || '').trim()
      if (!code) {
        this.$message.warning('请先选择复配料')
        return
      }
      const row = this.newMixItem()
      row.materialCode = code
      this.onRawMaterialChange(row, code)
      if (!Array.isArray(this.form.glueItems)) this.$set(this.form, 'glueItems', [])
      this.form.glueItems.push(row)
      this.selectedCompoundMaterialCode = ''
    },
    getEmptyForm() {
      return {
        id: null,
        materialCode: '',
        productName: '',
        formulaNo: '',
        version: 'A/00',
        createDate: new Date(),
        glueModel: '',
        glueType: '',
        colorCode: '',
        coatingThickness: null,
        glueDensity: null,
        solidContent: '',
        coatingArea: null,
        processTemperature: '',
        processSpeed: '',
        processRemark: '',
        totalWeight: null,
        preparedBy: '',
        reviewedBy: '',
        approvedBy: '',
        status: 1,
        items: [],
        glueItems: [],
        isolatorItems: [],
        releaseItems: [],
        baseItems: []
      }
    },
    async fetchData() {
      this.loading = true
      try {
        const params = {
          page: this.pagination.page,
          size: this.pagination.size,
          ...this.searchForm
        }
        const res = await getFormulaList(params)
        if (res.code === 20000) {
          this.list = res.data.records
          this.pagination.total = Number(res.data?.total || 0)
        }
      } catch (e) {
        console.error('获取列表失败', e)
      } finally {
        this.loading = false
      }
    },
    handleSearch() {
      this.pagination.page = 1
      this.fetchData()
    },
    handleReset() {
      this.searchForm = { materialCode: '', productName: '', glueModel: '' }
      this.handleSearch()
    },
    handleSizeChange(size) {
      this.pagination.size = size
      this.fetchData()
    },
    handleCurrentChange(page) {
      this.pagination.page = page
      this.fetchData()
    },
    handleAdd() {
      this.dialogTitle = '新增配方'
      this.form = this.getEmptyForm()
      this.initializeSectionItemsFromFlat()
      this.dialogVisible = true
      this.$nextTick(() => this.$refs.form && this.$refs.form.clearValidate())
      this.tryRestoreTempDraft()
    },
    async handleEdit(row) {
      this.dialogTitle = '编辑配方'
      this.loading = true
      try {
        const res = await getFormulaById(row.id)
        if (res.code === 20000) {
          this.form = { ...res.data }
          this.form.createDate = this.form.createDate ? new Date(this.form.createDate) : new Date()
          if (!this.form.version) {
            this.form.version = 'A/00'
          }
          if (!this.form.items) this.form.items = []
          this.initializeSectionItemsFromFlat()
          this.dialogVisible = true
          this.$nextTick(() => this.$refs.form && this.$refs.form.clearValidate())
          this.tryRestoreTempDraft()
        }
      } catch (e) {
        this.$message.error('获取详情失败')
      } finally {
        this.loading = false
      }
    },
    async handleView(row) {
      this.loading = true
      try {
        const res = await getFormulaById(row.id)
        if (res.code === 20000) {
          this.viewData = res.data
          this.viewDialogVisible = true
        }
      } catch (e) {
        this.$message.error('获取详情失败')
      } finally {
        this.loading = false
      }
    },
    async handleSubmit() {
      try {
        await this.$refs.form.validate()
      } catch (e) {
        return
      }

      this.syncFlatItemsFromSections()
      // 总重量仅统计化工配比（胶水+隔离剂）
      this.form.totalWeight = this.calculateTotalWeight()

      this.submitting = true
      try {
        const res = this.form.id ? await updateFormula(this.form) : await createFormula(this.form)
        if (res.code === 20000) {
          this.$message.success(this.form.id ? '更新成功' : '创建成功')
          this.clearTempDraft()
          this.dialogVisible = false
          this.fetchData()
        } else {
          this.$message.error(res.msg || '操作失败')
        }
      } catch (e) {
        this.$message.error('操作失败')
      } finally {
        this.submitting = false
      }
    },
    async handleTempSave() {
      this.submitting = true
      try {
        const key = this.getTempDraftStorageKey()
        const payload = this.buildTempDraftPayload()
        window.localStorage.setItem(key, JSON.stringify(payload))
        this.$message.success('已临时保存，下次可继续编辑')
      } catch (e) {
        this.$message.error('临时保存失败')
      } finally {
        this.submitting = false
      }
    },
    async handleResequence() {
      this.$confirm('将重编全部历史文件编号与胶水型号，并将版次重置为A/00，是否继续？', '提示', { type: 'warning' })
        .then(async() => {
          const res = await resequenceFormula()
          if (res && (res.code === 20000 || res.code === 200)) {
            this.$message.success(`重编完成，更新 ${res.data && res.data.updated ? res.data.updated : 0} 条`)
            this.fetchData()
            return
          }
          this.$message.error((res && res.msg) || '重编失败')
        })
        .catch(() => {})
    },
    handleGlueTypeChange(type) {
      const v = this.glueDensityMap[type]
      if (v !== undefined && v !== null) {
        this.form.glueDensity = Number(v)
      }
    },
    async queryMaterialCodeSuggestions(queryString, cb) {
      const keyword = String(queryString || '').trim()
      if (!keyword) {
        cb([])
        return
      }
      try {
        const [specRes] = await Promise.all([
          getSpecSuggestions(keyword, 20)
        ])

        const rows = (specRes && (specRes.code === 20000 || specRes.code === 200) && Array.isArray(specRes.data)) ? specRes.data : []
        const specList = rows.map(it => ({
          value: it.materialCode || '',
          materialCode: it.materialCode || '',
          productName: it.productName || '',
          colorCode: it.colorCode || '',
          coatingThickness: it.glueThickness != null ? it.glueThickness : null,
          source: 'spec'
        }))

        const rawList = (this.rawMaterials || [])
          .filter((it) => {
            const code = String(it.materialCode || '').toLowerCase()
            const name = String(it.materialName || '').toLowerCase()
            const kw = keyword.toLowerCase()
            return code.includes(kw) || name.includes(kw)
          })
          .slice(0, 20)
          .map((it) => ({
            value: it.materialCode || '',
            materialCode: it.materialCode || '',
            productName: it.materialName || '',
            colorCode: '',
            coatingThickness: null,
            source: 'raw'
          }))

        const mergedMap = new Map()
        ;[...specList, ...rawList].forEach((it) => {
          const key = String(it.materialCode || '').trim().toUpperCase()
          if (!key) return
          if (!mergedMap.has(key)) {
            mergedMap.set(key, it)
          }
        })
        const list = Array.from(mergedMap.values())
        cb(list)
      } catch (e) {
        cb([])
      }
    },
    handleMaterialCodeSelect(item) {
      if (!item) return
      this.form.materialCode = item.materialCode || item.value || this.form.materialCode
      if (item.productName) this.form.productName = item.productName
      if (item.colorCode && !this.form.colorCode) this.form.colorCode = item.colorCode
      if (item.coatingThickness != null) this.form.coatingThickness = Number(item.coatingThickness)
    },
    async handleMaterialCodeInputChange() {
      const code = String(this.form.materialCode || '').trim()
      if (!code) {
        this.form.productName = ''
        return
      }
      if (code.length < 4) return

      const raw = (this.rawMaterials || []).find((it) => String(it.materialCode || '').trim().toUpperCase() === code.toUpperCase())
      if (raw) {
        this.form.productName = raw.materialName || this.form.productName
      }

      try {
        const res = await getSpecByMaterialCode(code)
        if (!(res && (res.code === 20000 || res.code === 200) && res.data)) return
        const data = res.data || {}
        if (data.productName) this.form.productName = data.productName
        if (data.colorCode && !this.form.colorCode) this.form.colorCode = data.colorCode
        if (data.glueThickness != null) this.form.coatingThickness = Number(data.glueThickness)
      } catch (e) {
        // 忽略
      }
    },
    handleDelete(row) {
      this.$confirm(`确认删除配方 "${row.productName}" 吗?`, '提示', { type: 'warning' })
        .then(async() => {
          try {
            const res = await deleteFormula(row.id)
            if (res.code === 20000) {
              this.$message.success('删除成功')
              this.fetchData()
            }
          } catch (e) {
            this.$message.error('删除失败')
          }
        }).catch(() => {})
    },
    async handleExport(row) {
      if (!row || !row.id) return
      try {
        const blob = await exportFormula(row.id)
        const url = window.URL.createObjectURL(new Blob([blob]))
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', `配胶标准单_${row.materialCode || 'export'}.xlsx`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
      } catch (e) {
        this.$message.error('导出失败')
      }
    },
    // 原料操作
    getSectionKey(sectionName) {
      const mapping = {
        glueItems: 'GLUE',
        isolatorItems: 'ISOLATOR',
        releaseItems: 'RELEASE',
        baseItems: 'BASE'
      }
      return mapping[sectionName] || 'GLUE'
    },
    getSectionLabel(sectionKey) {
      const mapping = {
        GLUE: '胶水配比',
        ISOLATOR: '隔离剂配比',
        FILM: '基材',
        RELEASE: '离型材料',
        BASE: '基材'
      }
      return mapping[sectionKey] || '胶水配比'
    },
    isAreaSection(sectionKey) {
      return ['RELEASE', 'BASE', 'FILM'].includes(sectionKey)
    },
    newMixItem() {
      return {
        materialCode: '',
        materialName: '',
        weight: null,
        ratio: null,
        remark: ''
      }
    },
    newAreaItem() {
      return {
        materialCode: '',
        materialName: '',
        weight: null,
        ratio: null,
        remark: ''
      }
    },
    addSectionItem(sectionName, isArea = false) {
      if (!Array.isArray(this.form[sectionName])) {
        this.$set(this.form, sectionName, [])
      }
      this.form[sectionName].push(isArea ? this.newAreaItem() : this.newMixItem())
    },
    onRawMaterialChange(row, code) {
      const norm = (v) => String(v || '').trim().toUpperCase()
      const codeText = String(code || '').trim()
      const codeUpper = norm(codeText)
      const baseUpper = codeUpper.replace(/\s*[（(]\s*\d+(?:\.\d+)?\s*%\s*[）)]\s*$/, '')
      const matched = (this.rawMaterials || []).find((item) => {
        const itemCode = norm(item.materialCode)
        return itemCode === codeUpper || itemCode === baseUpper
      })
      if (matched) {
        row.materialName = matched.materialName || row.materialName
      }
      const pct = codeText.match(/[（(]\s*(\d+(?:\.\d+)?)\s*%\s*[）)]/)
      if (pct && !row.remark) {
        row.remark = `按${pct[1]}%浓度稀释后使用`
      }
    },
    removeSectionItem(sectionName, index) {
      if (!Array.isArray(this.form[sectionName])) return
      this.form[sectionName].splice(index, 1)
    },
    toStoredRemark(sectionKey, userRemark) {
      const remark = String(userRemark || '').trim()
      return `【分组:${sectionKey}】${remark}`
    },
    stripStoredRemark(remark) {
      return String(remark || '').replace(/^【分组:(GLUE|ISOLATOR|FILM|RELEASE|BASE)】/, '').trim()
    },
    getItemSection(item) {
      const remark = String(item && item.remark ? item.remark : '')
      const match = remark.match(/^【分组:(GLUE|ISOLATOR|FILM|RELEASE|BASE)】/)
      if (match && match[1]) return match[1]

      const category = (this.rawMaterials || []).find(r => String(r.materialCode || '').trim().toUpperCase() === String(item.materialCode || '').trim().toUpperCase())
      const matCategory = category ? this.normalizeMaterialCategory(category.materialCategory) : ''
      const codeText = String(item.materialCode || '').toUpperCase()
      if (matCategory === 'chemical') return 'GLUE'
      if (/离型|RELEASE/.test(codeText)) return 'RELEASE'
      if (/PET|BOPP|CPP|PI|PVC|OPP|TPU|TISSUE|PEFOAM|FIBERGLASS/.test(codeText)) return 'BASE'
      return matCategory === 'film' ? 'FILM' : 'GLUE'
    },
    initializeSectionItemsFromFlat() {
      const items = Array.isArray(this.form.items) ? this.form.items : []
      const groups = {
        glueItems: [],
        isolatorItems: [],
        releaseItems: [],
        baseItems: []
      }
      items.forEach((it) => {
        const section = this.getItemSection(it)
        const row = {
          materialCode: it.materialCode || '',
          materialName: it.materialName || '',
          weight: it.weight,
          ratio: it.ratio,
          remark: this.stripStoredRemark(it.remark)
        }
        if (section === 'ISOLATOR') groups.isolatorItems.push(row)
        else if (section === 'FILM') groups.baseItems.push(row)
        else if (section === 'RELEASE') groups.releaseItems.push(row)
        else if (section === 'BASE') groups.baseItems.push(row)
        else groups.glueItems.push(row)
      })
      this.form.glueItems = groups.glueItems
      this.form.isolatorItems = groups.isolatorItems
      this.form.releaseItems = groups.releaseItems
      this.form.baseItems = groups.baseItems
    },
    normalizeSectionList(list) {
      return (Array.isArray(list) ? list : [])
        .map(row => ({
          materialCode: String(row.materialCode || '').trim(),
          materialName: String(row.materialName || '').trim(),
          weight: row.weight,
          ratio: row.ratio,
          remark: String(row.remark || '').trim()
        }))
        .filter(row => row.materialCode)
    },
    makeFlatItems(sectionName, list) {
      const sectionKey = this.getSectionKey(sectionName)
      return this.normalizeSectionList(list).map(row => ({
        materialCode: row.materialCode,
        materialName: row.materialName || '',
        weight: row.weight,
        ratio: this.isAreaSection(sectionKey) ? null : row.ratio,
        remark: this.toStoredRemark(sectionKey, row.remark)
      }))
    },
    syncFlatItemsFromSections() {
      const flat = []
      flat.push(...this.makeFlatItems('glueItems', this.form.glueItems))
      flat.push(...this.makeFlatItems('isolatorItems', this.form.isolatorItems))
      flat.push(...this.makeFlatItems('releaseItems', this.form.releaseItems))
      flat.push(...this.makeFlatItems('baseItems', this.form.baseItems))
      this.form.items = flat
    },
    formatItemValue(item) {
      const section = this.getItemSection(item)
      const value = item && item.weight !== undefined && item.weight !== null ? item.weight : ''
      return this.isAreaSection(section) ? `${value} ㎡` : `${value} Kg/桶`
    },
    calculateTotalWeight() {
      const glue = this.normalizeSectionList(this.form.glueItems)
      const isolator = this.normalizeSectionList(this.form.isolatorItems)
      const mixRows = [...glue, ...isolator]
      if (!mixRows.length) return 0
      let total = 0
      mixRows.forEach(item => {
        if (item.weight) total += parseFloat(item.weight) || 0
      })
      return total.toFixed(4)
    },
    async ensureTesseractLoaded() {
      if (window.Tesseract) {
        this.tesseractReady = true
        return
      }
      await new Promise((resolve, reject) => {
        const existing = document.getElementById('tesseract-cdn-script')
        if (existing) {
          existing.addEventListener('load', () => resolve())
          existing.addEventListener('error', () => reject(new Error('加载OCR脚本失败')))
          return
        }
        const script = document.createElement('script')
        script.id = 'tesseract-cdn-script'
        script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js'
        script.async = true
        script.onload = () => resolve()
        script.onerror = () => reject(new Error('加载OCR脚本失败'))
        document.body.appendChild(script)
      })
      if (!window.Tesseract) {
        throw new Error('OCR引擎不可用')
      }
      this.tesseractReady = true
    },
    handleOcrPageClick() {
      this.$refs.ocrPageFile && this.$refs.ocrPageFile.click()
    },
    extractField(text, labels = []) {
      const escaped = labels.map(v => String(v).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      if (!escaped.length) return ''
      const reg = new RegExp(`(?:${escaped.join('|')})[：:\\s]*([^\\n\\r]{1,120})`, 'i')
      const m = text.match(reg)
      return m && m[1] ? m[1].trim() : ''
    },
    parseOcrItems(text) {
      const lines = String(text || '')
        .split(/\r?\n/)
        .map(v => String(v || '').trim())
        .filter(Boolean)
      const result = []
      for (const line of lines) {
        if (/总重量|编制|审核|批准|备注|物料代码|kg\/桶|比例/i.test(line)) continue
        const codeMatch = line.match(/^([A-Za-z0-9\-]{4,}(?:\s*\([^\)]*\))?)/)
        if (!codeMatch || !codeMatch[1]) continue
        const materialCode = codeMatch[1].replace(/\s+/g, ' ').trim()
        const raw = (this.rawMaterials || []).find(r => String(r.materialCode || '').trim().toUpperCase() === materialCode.toUpperCase())

        const ratioMatch = line.match(/([0-9]+(?:\.[0-9]+)?)\s*%/)
        const nums = line.match(/\d+(?:\.\d+)?/g) || []
        const weight = nums.length ? Number(nums[0]) : null
        const ratio = ratioMatch && ratioMatch[1] ? Number(ratioMatch[1]) : (nums.length > 1 ? Number(nums[1]) : null)

        if (!Number.isFinite(weight)) continue
        result.push({
          materialCode,
          materialName: raw ? raw.materialName : '',
          weight,
          ratio: Number.isFinite(ratio) ? ratio : null,
          remark: ''
        })
      }
      return result
    },
    parseOcrToForm(text) {
      const all = String(text || '')
      const main = {
        productName: this.extractField(all, ['产品名称']),
        materialCode: this.extractField(all, ['产品型号', '产品料号']),
        glueModel: this.extractField(all, ['胶水型号']),
        colorCode: this.extractField(all, ['颜色', '色']),
        solidContent: this.extractField(all, ['固含量']),
        processRemark: this.extractField(all, ['备注'])
      }
      const coatingThickness = this.extractField(all, ['涂胶厚度', '涂布厚度'])
      const glueDensity = this.extractField(all, ['胶水密度'])
      const coatingArea = this.extractField(all, ['涂布数量'])
      const toNum = (v) => {
        const m = String(v || '').match(/\d+(?:\.\d+)?/)
        return m ? Number(m[0]) : null
      }
      main.coatingThickness = toNum(coatingThickness)
      main.glueDensity = toNum(glueDensity)
      main.coatingArea = toNum(coatingArea)

      const items = this.parseOcrItems(all)
      return { main, items }
    },
    async parseExcelPage(file) {
      const buf = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = () => reject(new Error('读取Excel失败'))
        reader.readAsArrayBuffer(file)
      })
      const workbook = XLSX.read(buf, { type: 'array' })
      const sheetName = workbook.SheetNames && workbook.SheetNames.length ? workbook.SheetNames[0] : null
      if (!sheetName) return { main: {}, items: [] }
      const sheet = workbook.Sheets[sheetName]
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })

      const findRightValue = (labels = []) => {
        for (const r of rows) {
          for (let i = 0; i < r.length; i++) {
            const cell = String(r[i] || '').trim()
            if (!cell) continue
            if (labels.some(l => cell.includes(l))) {
              for (let j = i + 1; j < r.length; j++) {
                const v = String(r[j] || '').trim()
                if (v) return v
              }
            }
          }
        }
        return ''
      }
      const toNum = (v) => {
        const m = String(v || '').match(/\d+(?:\.\d+)?/)
        return m ? Number(m[0]) : null
      }

      const main = {
        productName: findRightValue(['产品名称']),
        materialCode: findRightValue(['产品型号', '产品料号']),
        glueModel: findRightValue(['胶水型号']),
        colorCode: findRightValue(['颜色', '色']),
        solidContent: findRightValue(['固含量']),
        processRemark: findRightValue(['备注']),
        coatingThickness: toNum(findRightValue(['涂胶厚度', '涂布厚度'])),
        glueDensity: toNum(findRightValue(['胶水密度'])),
        coatingArea: toNum(findRightValue(['涂布数量']))
      }

      const items = []
      const norm = (v) => String(v || '').replace(/\s+/g, '').replace(/[（(]/g, '(').replace(/[）)]/g, ')').toUpperCase()
      const toPercent = (v) => {
        if (v === null || v === undefined || v === '') return null
        const s = String(v).trim()
        if (!s) return null
        if (s.includes('%')) {
          const m = s.match(/\d+(?:\.\d+)?/)
          return m ? Number(m[0]) : null
        }
        const n = Number(s)
        if (!Number.isFinite(n)) {
          const m = s.match(/\d+(?:\.\d+)?/)
          if (!m) return null
          const x = Number(m[0])
          return Number.isFinite(x) ? (x <= 1 ? x * 100 : x) : null
        }
        return n <= 1 ? n * 100 : n
      }

      let headerRow = -1
      for (let i = 0; i < rows.length; i++) {
        const rowText = norm((rows[i] || []).join(' '))
        const hasCode = rowText.includes('物料代码') || rowText.includes('物料编码')
        const hasWeight = rowText.includes('KG/桶') || rowText.includes('KG桶') || rowText.includes('重量')
        if (hasCode && hasWeight) {
          headerRow = i
          break
        }
      }

      if (headerRow >= 0) {
        const header = rows[headerRow] || []
        const findCol = (keys = []) => {
          for (let i = 0; i < header.length; i++) {
            const t = norm(header[i])
            if (!t) continue
            if (keys.some(k => t.includes(norm(k)))) return i
          }
          return -1
        }

        let codeCol = findCol(['物料代码', '物料编码', '原料代码'])
        let weightCol = findCol(['KG/桶', '重量', 'KG'])
        let ratioCol = findCol(['比例'])
        let remarkCol = findCol(['备注'])

        if (codeCol < 0) codeCol = 0
        if (weightCol < 0) weightCol = codeCol + 1
        if (ratioCol < 0) ratioCol = weightCol + 1
        if (remarkCol < 0) remarkCol = ratioCol + 1

        for (let i = headerRow + 1; i < rows.length; i++) {
          const r = rows[i] || []
          const rowTextRaw = (r || []).map(v => String(v || '')).join(' ').trim()
          const rowText = norm(rowTextRaw)
          if (!rowText) continue
          if (rowText.includes('总重量') || rowText.includes('编制') || rowText.includes('审核') || rowText.includes('批准')) break

          let code = String(r[codeCol] || '').trim()
          if (!code) {
            for (const cell of r) {
              const t = String(cell || '').trim()
              if (!t) continue
              if (/^\d+(?:\.\d+)?%?$/.test(t)) continue
              if (/^(\/|-|—)$/.test(t)) continue
              if (/物料|重量|比例|备注/.test(t)) continue
              if (/^[A-Za-z0-9\-\/]+(?:\s*\([^\)]*\))?$/.test(t)) {
                code = t
                break
              }
            }
          }
          if (!code) continue

          let weight = toNum(r[weightCol])
          if (!Number.isFinite(weight)) {
            const nums = r
              .map(v => toNum(v))
              .filter(v => Number.isFinite(v) && v > 0)
            weight = nums.length ? nums[0] : null
          }
          if (!Number.isFinite(weight)) continue

          let ratio = toPercent(r[ratioCol])
          if (!Number.isFinite(ratio)) {
            const ratioCell = r.find(v => /%/.test(String(v || '')))
            ratio = toPercent(ratioCell)
          }

          const remark = String(r[remarkCol] || '').trim()
          const raw = (this.rawMaterials || []).find(x => String(x.materialCode || '').trim().toUpperCase() === code.toUpperCase())
          items.push({
            materialCode: code,
            materialName: raw ? raw.materialName : '',
            weight,
            ratio: Number.isFinite(ratio) ? ratio : null,
            remark
          })
        }
      }
      return { main, items }
    },
    async handleOcrPageChange(e) {
      const file = e.target.files[0]
      if (!file) return
      this.ocrLoading = true
      try {
        const isExcel = /\.(xlsx|xls)$/i.test(String(file.name || ''))
        let parsed
        if (isExcel) {
          parsed = await this.parseExcelPage(file)
        } else {
          await this.ensureTesseractLoaded()
          const result = await window.Tesseract.recognize(file, 'chi_sim+eng')
          const text = result && result.data ? result.data.text : ''
          if (!text || !text.trim()) {
            this.$message.warning('未识别到有效内容，请上传更清晰的单页图片')
            return
          }
          parsed = this.parseOcrToForm(text)
        }
        Object.keys(parsed.main).forEach(k => {
          const val = parsed.main[k]
          if (val !== null && val !== undefined && String(val).trim() !== '') {
            this.$set(this.form, k, val)
          }
        })
        if (parsed.items && parsed.items.length) {
          this.form.glueItems = parsed.items
          this.form.totalWeight = this.calculateTotalWeight()
          this.$message.success(`识别完成，已填充胶水配比 ${parsed.items.length} 条，请核对后保存`)
        } else {
          this.$message.warning('主信息已尝试填充，但未识别到胶水配比明细，请手工补充')
        }
      } catch (err) {
        console.error('OCR识别失败', err)
        this.$message.error('OCR识别失败，请检查网络或图片清晰度')
      } finally {
        this.ocrLoading = false
        if (this.$refs.ocrPageFile) this.$refs.ocrPageFile.value = ''
      }
    },
    formatDate(date) {
      if (!date) return ''
      const d = new Date(date)
      return d.toLocaleDateString()
    },
    // ============ 导入导出方法 ============
    async handleDownloadTemplate() {
      try {
        const blob = await downloadTemplate()
        const url = window.URL.createObjectURL(new Blob([blob]))
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', '配胶标准单导入模板.xlsx')
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
        this.$message.success('模板下载成功')
      } catch (e) {
        this.$message.error('模板下载失败')
      }
    },
    handleImportClick() {
      this.$refs.importFile.click()
    },
    async handleImportChange(e) {
      const file = e.target.files[0]
      if (!file) return

      this.loading = true
      try {
        const res = await importFormula(file)
        if (res.code === 20000) {
          this.$message.success(res.msg || '导入成功')
          this.fetchData()
          // 如果有错误信息，显示详情
          if (res.data && res.data.errors && res.data.errors.length > 0) {
            this.$alert(res.data.errors.join('<br>'), '导入提示', {
              dangerouslyUseHTMLString: true,
              type: 'warning'
            })
          }
        } else {
          this.$message.error(res.msg || '导入失败')
        }
      } catch (e) {
        this.$message.error('导入失败：' + (e.message || '未知错误'))
      } finally {
        this.loading = false
        this.$refs.importFile.value = '' // 清空文件选择
      }
    },
    async handleExportAll() {
      try {
        this.loading = true
        const blob = await exportAllFormula()
        const url = window.URL.createObjectURL(new Blob([blob]))
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', '配胶标准单数据.xlsx')
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
        this.$message.success('导出成功')
      } catch (e) {
        this.$message.error('导出失败')
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.formula-container {
  padding: 20px;

  .search-card, .toolbar-card {
    margin-bottom: 15px;
  }

  .el-pagination {
    margin-top: 15px;
    text-align: right;
  }
}

.formula-detail {
  .header-info {
    margin-bottom: 10px;
  }

  .company-title {
    text-align: center;
    font-size: 20px;
    font-weight: bold;
    color: #409eff;
    margin-bottom: 5px;
  }

  .form-title {
    text-align: center;
    font-size: 18px;
    font-weight: bold;
    margin-bottom: 15px;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 15px;

    td, th {
      border: 1px solid #ddd;
      padding: 8px;
    }

    .label {
      background: #f5f7fa;
      font-weight: bold;
      width: 100px;
    }

    .number {
      text-align: right;
    }

    .remark-cell {
      font-size: 12px;
      line-height: 1.5;
    }
  }

  .item-table {
    th {
      background: #f5f7fa;
      text-align: center;
    }

    .total-row {
      background: #fef0f0;
    }
  }

  .approve-table {
    td {
      width: 16.66%;
    }
  }
}
</style>
