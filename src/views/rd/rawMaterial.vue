<template>
  <div class="raw-material-container">
    <el-card>
      <div slot="header" class="clearfix">
        <span>原材料表</span>
        <div style="float: right">
          <el-button v-if="$canImportExport()" type="success" icon="el-icon-download" size="small" @click="handleDownloadTemplate">下载模板</el-button>
          <el-button v-if="$canImportExport()" type="primary" icon="el-icon-refresh" size="small" @click="handleInitialize">初始化</el-button>
          <el-button v-if="$canImportExport()" type="warning" icon="el-icon-upload2" size="small" @click="handleImportClick">导入</el-button>
          <el-button v-if="$canImportExport()" type="info" icon="el-icon-download" size="small" @click="handleExport">导出</el-button>
          <el-button v-if="$canEdit()" type="primary" icon="el-icon-plus" size="small" @click="handleAdd">新增原材料</el-button>
          <input ref="importFile" type="file" accept=".xlsx,.xls" style="display:none" @change="handleImportChange">
        </div>
      </div>

      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="物料编码">
          <el-input v-model="searchForm.materialCode" clearable placeholder="请输入物料编码" style="width:180px"/>
        </el-form-item>
        <el-form-item label="物料名称">
          <el-input v-model="searchForm.materialName" clearable placeholder="请输入物料名称" style="width:180px"/>
        </el-form-item>
        <el-form-item label="物料类别">
          <el-select v-model="searchForm.materialCategory" clearable placeholder="全部" style="width:130px">
            <el-option label="薄膜" value="film"/>
            <el-option label="化工物料" value="chemical"/>
          </el-select>
        </el-form-item>
        <el-form-item label="物料类型">
          <el-select v-model="searchForm.materialType" clearable placeholder="全部" style="width:130px">
            <el-option label="树脂" value="resin"/>
            <el-option label="溶剂" value="solvent"/>
            <el-option label="助剂" value="additive"/>
            <el-option label="固化剂" value="curing"/>
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" clearable placeholder="全部" style="width:110px">
            <el-option label="启用" :value="1"/>
            <el-option label="禁用" :value="0"/>
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="el-icon-search" @click="handleSearch">搜 索</el-button>
          <el-button icon="el-icon-refresh-left" @click="handleReset">重 置</el-button>
        </el-form-item>
      </el-form>

      <el-table v-loading="loading" :data="list" border stripe size="small" style="margin-top: 15px; width: 100%">
        <el-table-column type="index" label="序号" width="60" align="center" :index="indexMethod"/>
        <el-table-column prop="materialCode" label="物料编码" min-width="160" show-overflow-tooltip/>
        <el-table-column prop="materialName" label="物料名称" min-width="170" show-overflow-tooltip/>
        <el-table-column prop="materialCategory" label="物料类别" width="100" align="center">
          <template slot-scope="scope">
            <el-tag :type="scope.row.materialCategory === 'film' ? 'success' : 'warning'" size="small">
              {{ formatCategory(scope.row.materialCategory) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="materialType" label="物料类型" width="90" align="center">
          <template slot-scope="scope">
            <el-tag size="small">{{ formatType(scope.row.materialType) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="unit" label="单位" width="80" align="center"/>
        <el-table-column prop="spec" label="规格说明" min-width="200" show-overflow-tooltip/>
        <el-table-column prop="performanceParams" label="性能参数" min-width="260" show-overflow-tooltip>
          <template slot-scope="scope">
            <span>{{ formatPerformanceSummary(scope.row) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="sortOrder" label="排序" width="70" align="center"/>
        <el-table-column prop="status" label="状态" width="80" align="center">
          <template slot-scope="scope">
            <el-tag :type="scope.row.status === 1 ? 'success' : 'info'" size="small">
              {{ scope.row.status === 1 ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column v-if="$canEdit()" label="操作" width="150" fixed="right" align="center">
          <template slot-scope="scope">
            <el-button type="text" size="small" icon="el-icon-edit" @click="handleEdit(scope.row)">编辑</el-button>
            <el-button type="text" size="small" icon="el-icon-delete" style="color:#f56c6c" @click="handleDelete(scope.row)">删除</el-button>
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

    <el-dialog :title="dialogTitle" :visible.sync="dialogVisible" width="620px" :close-on-click-modal="false">
      <el-form ref="form" :model="form" :rules="rules" label-width="90px" size="small">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="物料编码" prop="materialCode">
              <el-input v-model="form.materialCode" placeholder="如: RM-RESIN-001" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="物料名称" prop="materialName">
              <el-input v-model="form.materialName" placeholder="请输入物料名称" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="物料类别" prop="materialCategory">
              <el-select v-model="form.materialCategory" style="width:100%" placeholder="请选择" @change="onCategoryChange">
                <el-option label="薄膜" value="film"/>
                <el-option label="化工物料" value="chemical"/>
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="物料类型" prop="materialType">
              <el-select v-model="form.materialType" style="width:100%" placeholder="请选择">
                <el-option label="树脂" value="resin"/>
                <el-option label="溶剂" value="solvent"/>
                <el-option label="助剂" value="additive"/>
                <el-option label="固化剂" value="curing"/>
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="单位" prop="unit">
              <el-select v-model="form.unit" placeholder="请选择单位" style="width:100%">
                <el-option v-for="item in unitOptionsForCategory()" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="规格说明">
              <el-input v-model="form.spec" type="textarea" :rows="3" :placeholder="specPlaceholder()"/>
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">性能参数</el-divider>
        <el-alert
          type="info"
          :closable="false"
          show-icon
          style="margin-bottom: 12px;"
          title="支持按最小值/最大值/单位维护性能参数，例如：1200~1203mm、≥0、0~0、15±2。保存后会以 JSON 存储，便于后续品质控制。"
        />
        <template v-if="form.materialCategory === 'film'">
          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item label="宽度标准值">
                <el-input v-model="performanceForm.widthInspection.standardValue" placeholder="标准值" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="宽度下限">
                <el-input v-model="performanceForm.widthInspection.min" placeholder="最小值" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="宽度上限">
                <el-input v-model="performanceForm.widthInspection.max" placeholder="最大值" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item label="单位">
                <el-input v-model="performanceForm.widthInspection.unit" placeholder="mm" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="判定方式">
                <el-select v-model="performanceForm.widthInspection.judgeMode" style="width:100%">
                  <el-option label="区间" value="range" />
                  <el-option label="≥下限" value="min" />
                  <el-option label="≤上限" value="max" />
                  <el-option label="标准值" value="value" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="说明">
                <el-input v-model="performanceForm.widthInspection.remark" placeholder="可选" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item label="厚向抗拉标准值">
                <el-input v-model="performanceForm.thicknessTensile.standardValue" placeholder="标准值" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="厚向抗拉下限">
                <el-input v-model="performanceForm.thicknessTensile.min" placeholder="最小值" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="厚向抗拉上限">
                <el-input v-model="performanceForm.thicknessTensile.max" placeholder="最大值" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item label="单位">
                <el-input v-model="performanceForm.thicknessTensile.unit" placeholder="N/15mm" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="判定方式">
                <el-select v-model="performanceForm.thicknessTensile.judgeMode" style="width:100%">
                  <el-option label="区间" value="range" />
                  <el-option label="≥下限" value="min" />
                  <el-option label="≤上限" value="max" />
                  <el-option label="标准值" value="value" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="说明">
                <el-input v-model="performanceForm.thicknessTensile.remark" placeholder="可选" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item label="横向抗拉标准值">
                <el-input v-model="performanceForm.transverseTensile.standardValue" placeholder="标准值" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="横向抗拉下限">
                <el-input v-model="performanceForm.transverseTensile.min" placeholder="最小值" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="横向抗拉上限">
                <el-input v-model="performanceForm.transverseTensile.max" placeholder="最大值" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item label="单位">
                <el-input v-model="performanceForm.transverseTensile.unit" placeholder="N/15mm" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="判定方式">
                <el-select v-model="performanceForm.transverseTensile.judgeMode" style="width:100%">
                  <el-option label="区间" value="range" />
                  <el-option label="≥下限" value="min" />
                  <el-option label="≤上限" value="max" />
                  <el-option label="标准值" value="value" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="说明">
                <el-input v-model="performanceForm.transverseTensile.remark" placeholder="可选" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item label="厚向伸长标准值">
                <el-input v-model="performanceForm.thicknessElongation.standardValue" placeholder="标准值" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="厚向伸长下限">
                <el-input v-model="performanceForm.thicknessElongation.min" placeholder="最小值" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="厚向伸长上限">
                <el-input v-model="performanceForm.thicknessElongation.max" placeholder="最大值" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item label="单位">
                <el-input v-model="performanceForm.thicknessElongation.unit" placeholder="%" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="判定方式">
                <el-select v-model="performanceForm.thicknessElongation.judgeMode" style="width:100%">
                  <el-option label="区间" value="range" />
                  <el-option label="≥下限" value="min" />
                  <el-option label="≤上限" value="max" />
                  <el-option label="标准值" value="value" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="说明">
                <el-input v-model="performanceForm.thicknessElongation.remark" placeholder="可选" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item label="横向伸长标准值">
                <el-input v-model="performanceForm.transverseElongation.standardValue" placeholder="标准值" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="横向伸长下限">
                <el-input v-model="performanceForm.transverseElongation.min" placeholder="最小值" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="横向伸长上限">
                <el-input v-model="performanceForm.transverseElongation.max" placeholder="最大值" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item label="单位">
                <el-input v-model="performanceForm.transverseElongation.unit" placeholder="%" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="判定方式">
                <el-select v-model="performanceForm.transverseElongation.judgeMode" style="width:100%">
                  <el-option label="区间" value="range" />
                  <el-option label="≥下限" value="min" />
                  <el-option label="≤上限" value="max" />
                  <el-option label="标准值" value="value" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="说明">
                <el-input v-model="performanceForm.transverseElongation.remark" placeholder="可选" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item label="电晕值标准值">
                <el-input v-model="performanceForm.coronaBothSides.standardValue" placeholder="标准值" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="电晕值下限">
                <el-input v-model="performanceForm.coronaBothSides.min" placeholder="最小值" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="电晕值上限">
                <el-input v-model="performanceForm.coronaBothSides.max" placeholder="最大值" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item label="单位">
                <el-input v-model="performanceForm.coronaBothSides.unit" placeholder="dyne" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="判定方式">
                <el-select v-model="performanceForm.coronaBothSides.judgeMode" style="width:100%">
                  <el-option label="区间" value="range" />
                  <el-option label="≥下限" value="min" />
                  <el-option label="≤上限" value="max" />
                  <el-option label="标准值" value="value" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="说明">
                <el-input v-model="performanceForm.coronaBothSides.remark" placeholder="可选" />
              </el-form-item>
            </el-col>
          </el-row>
        </template>
        <template v-else>
          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item label="固含标准值">
                <el-input v-model="performanceForm.solidContent.standardValue" placeholder="标准值" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="固含下限">
                <el-input v-model="performanceForm.solidContent.min" placeholder="最小值" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="固含上限">
                <el-input v-model="performanceForm.solidContent.max" placeholder="最大值" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item label="单位">
                <el-input v-model="performanceForm.solidContent.unit" placeholder="%" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="判定方式">
                <el-select v-model="performanceForm.solidContent.judgeMode" style="width:100%">
                  <el-option label="区间" value="range" />
                  <el-option label="≥下限" value="min" />
                  <el-option label="≤上限" value="max" />
                  <el-option label="标准值" value="value" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="说明">
                <el-input v-model="performanceForm.solidContent.remark" placeholder="可选" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item label="剥离强度标准值">
                <el-input v-model="performanceForm.peelStrength.standardValue" placeholder="标准值" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="剥离强度下限">
                <el-input v-model="performanceForm.peelStrength.min" placeholder="最小值" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="剥离强度上限">
                <el-input v-model="performanceForm.peelStrength.max" placeholder="最大值" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item label="单位">
                <el-input v-model="performanceForm.peelStrength.unit" placeholder="N/25mm" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="判定方式">
                <el-select v-model="performanceForm.peelStrength.judgeMode" style="width:100%">
                  <el-option label="区间" value="range" />
                  <el-option label="≥下限" value="min" />
                  <el-option label="≤上限" value="max" />
                  <el-option label="标准值" value="value" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="说明">
                <el-input v-model="performanceForm.peelStrength.remark" placeholder="可选" />
              </el-form-item>
            </el-col>
          </el-row>
        </template>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="排序">
              <el-input-number v-model="form.sortOrder" :min="0" :precision="0" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="状态">
              <el-switch v-model="form.status" :active-value="1" :inactive-value="0" active-text="启用" inactive-text="禁用"/>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <div slot="footer">
        <el-button @click="dialogVisible = false">取 消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">确 定</el-button>
      </div>
    </el-dialog>

    <el-dialog title="导入结果" :visible.sync="importResultVisible" width="500px">
      <div v-if="importResult">
        <p><strong>成功：</strong><span style="color:#67c23a">{{ importResult.successCount }} 条</span></p>
        <p><strong>失败：</strong><span style="color:#f56c6c">{{ importResult.failCount }} 条</span></p>
        <div v-if="importResult.errors && importResult.errors.length > 0">
          <p><strong>错误详情：</strong></p>
          <ul style="max-height: 200px; overflow-y: auto;">
            <li v-for="(err, idx) in importResult.errors" :key="idx" style="color: #f56c6c">{{ err }}</li>
          </ul>
        </div>
      </div>
      <div slot="footer">
        <el-button type="primary" @click="importResultVisible = false">确定</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import {
  getRawMaterialPage,
  getRawMaterialById,
  createRawMaterial,
  updateRawMaterial,
  deleteRawMaterial,
  exportRawMaterials,
  downloadRawMaterialTemplate,
  importRawMaterials
} from '@/api/tapeRawMaterial'

export default {
  name: 'TapeRawMaterial',
  data() {
    return {
      loading: false,
      searchForm: {
        materialCode: '',
        materialName: '',
        materialCategory: '',
        materialType: '',
        status: null
      },
      list: [],
      pagination: { page: 1, size: 20, total: 0 },
      dialogVisible: false,
      dialogTitle: '新增原材料',
      submitting: false,
      form: this.getEmptyForm(),
      performanceForm: this.getDefaultPerformanceForm('chemical'),
      rules: {
        materialCode: [{ required: true, message: '请输入物料编码', trigger: 'blur' }],
        materialName: [{ required: true, message: '请输入物料名称', trigger: 'blur' }],
        materialCategory: [{ required: true, message: '请选择物料类别', trigger: 'change' }],
        materialType: [{ required: true, message: '请选择物料类型', trigger: 'change' }],
        unit: [{ required: true, message: '请输入单位', trigger: 'blur' }]
      },
      importResultVisible: false,
      importResult: null
    }
  },
  created() {
    this.fetchData()
  },
  methods: {
    $canEdit() {
      return this.$hasRole('admin') || this.$hasRole('rd')
    },
    isSuccess(code) {
      return code === 200 || code === 20000
    },
    getEmptyForm() {
      return {
        id: null,
        materialCode: '',
        materialName: '',
        materialCategory: 'chemical',
        materialType: 'resin',
        unit: 'kg',
        spec: '',
        performanceParams: '',
        sortOrder: 0,
        status: 1
      }
    },
    createRangeField(unit = '') {
      return { label: '', standardValue: '', min: '', max: '', unit, judgeMode: 'range', remark: '' }
    },
    getDefaultPerformanceForm(category) {
      if (category === 'film') {
        return {
          widthInspection: { ...this.createRangeField('mm'), label: '宽度' },
          thicknessTensile: { ...this.createRangeField('N/15mm'), label: '厚向抗拉' },
          transverseTensile: { ...this.createRangeField('N/15mm'), label: '横向抗拉' },
          thicknessElongation: { ...this.createRangeField('%'), label: '厚向伸长' },
          transverseElongation: { ...this.createRangeField('%'), label: '横向伸长' },
          coronaBothSides: { ...this.createRangeField('dyne'), label: '电晕值' }
        }
      }
      return {
        solidContent: { ...this.createRangeField('%'), label: '固含量' },
        peelStrength: { ...this.createRangeField('N/25mm'), label: '剥离强度' }
      }
    },
    parsePerformanceParams(text) {
      if (!text) return {}
      try {
        const parsed = JSON.parse(text)
        return parsed && typeof parsed === 'object' ? parsed : {}
      } catch (e) {
        return {}
      }
    },
    normalizeRangeField(value, defaultUnit = '') {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        return {
          label: value.label !== undefined ? String(value.label) : (value.name !== undefined ? String(value.name) : (value.title !== undefined ? String(value.title) : (value.displayName !== undefined ? String(value.displayName) : ''))),
          standardValue: value.standardValue !== undefined ? String(value.standardValue) : (value.value !== undefined ? String(value.value) : ''),
          min: value.min !== undefined ? String(value.min) : (value.low !== undefined ? String(value.low) : ''),
          max: value.max !== undefined ? String(value.max) : (value.high !== undefined ? String(value.high) : ''),
          unit: value.unit !== undefined ? String(value.unit) : defaultUnit,
          judgeMode: value.judgeMode !== undefined ? String(value.judgeMode) : ((value.min !== undefined || value.max !== undefined || value.low !== undefined || value.high !== undefined) ? 'range' : 'value'),
          remark: value.remark !== undefined ? String(value.remark) : ''
        }
      }

      const text = String(value || '').trim()
      if (!text) return this.createRangeField(defaultUnit)

      const pmMatch = text.match(/^([0-9]+(?:\.[0-9]+)?)\s*±\s*([0-9]+(?:\.[0-9]+)?)\s*(.*)$/)
      if (pmMatch) {
        const center = Number(pmMatch[1])
        const tol = Number(pmMatch[2])
        const unit = pmMatch[3].trim() || defaultUnit
        if (Number.isFinite(center) && Number.isFinite(tol)) {
          return { standardValue: String(center), min: String(center - tol), max: String(center + tol), unit, judgeMode: 'range', remark: '' }
        }
      }

      const rangeMatch = text.match(/^([0-9]+(?:\.[0-9]+)?)\s*[~～-]\s*([0-9]+(?:\.[0-9]+)?)\s*(.*)$/)
      if (rangeMatch) {
        return { standardValue: '', min: rangeMatch[1], max: rangeMatch[2], unit: rangeMatch[3].trim() || defaultUnit, judgeMode: 'range', remark: '' }
      }

      const slashMatch = text.match(/^([0-9]+(?:\.[0-9]+)?)\s*\/\s*([0-9]+(?:\.[0-9]+)?)\s*(.*)$/)
      if (slashMatch) {
        return { standardValue: '', min: slashMatch[1], max: slashMatch[2], unit: slashMatch[3].trim() || defaultUnit, judgeMode: 'range', remark: '' }
      }

      const geMatch = text.match(/^[≥>]=?\s*([0-9]+(?:\.[0-9]+)?)\s*(.*)$/)
      if (geMatch) {
        return { standardValue: '', min: geMatch[1], max: '', unit: geMatch[2].trim() || defaultUnit, judgeMode: 'min', remark: '' }
      }

      const leMatch = text.match(/^[≤<]=?\s*([0-9]+(?:\.[0-9]+)?)\s*(.*)$/)
      if (leMatch) {
        return { standardValue: '', min: '', max: leMatch[1], unit: leMatch[2].trim() || defaultUnit, judgeMode: 'max', remark: '' }
      }

      return { standardValue: text, min: '', max: '', unit: defaultUnit, judgeMode: 'value', remark: '' }
    },
    normalizePerformanceForm(parsed, category) {
      const defaults = this.getDefaultPerformanceForm(category)
      const source = parsed && typeof parsed === 'object' ? parsed : {}
      const normalized = { ...defaults }
      Object.keys(defaults).forEach(key => {
        const normalizedField = this.normalizeRangeField(source[key], defaults[key] && defaults[key].unit)
        normalized[key] = { ...normalizedField, label: (normalizedField.label || (defaults[key] && defaults[key].label) || key) }
      })
      return normalized
    },
    loadPerformanceForm() {
      const parsed = this.parsePerformanceParams(this.form.performanceParams)
      this.performanceForm = this.normalizePerformanceForm(parsed, this.form.materialCategory)
    },
    formatRangeField(value) {
      if (value === null || value === undefined || value === '') return ''
      if (typeof value !== 'object') {
        return String(value)
      }
      const standardValue = value.standardValue !== undefined ? String(value.standardValue).trim() : ''
      const min = value.min !== undefined ? String(value.min).trim() : ''
      const max = value.max !== undefined ? String(value.max).trim() : ''
      const unit = value.unit !== undefined ? String(value.unit).trim() : ''
      const judgeMode = value.judgeMode || ''
      if (judgeMode === 'value' || (standardValue && !min && !max)) return `${standardValue}${unit}`
      if (judgeMode === 'min' || (min && !max)) return `≥${min}${unit}`
      if (judgeMode === 'max' || (max && !min)) return `≤${max}${unit}`
      if (min && max) return `${min}~${max}${unit}`
      if (standardValue) return `${standardValue}${unit}`
      return ''
    },
    formatPerformanceSummary(row) {
      const parsed = this.parsePerformanceParams(row && row.performanceParams)
      if (!parsed || Object.keys(parsed).length === 0) return '-'
      if (row && row.materialCategory === 'film') {
        return [
          parsed.widthInspection ? `宽度:${this.formatRangeField(parsed.widthInspection)}` : '',
          parsed.thicknessTensile ? `厚向抗拉:${this.formatRangeField(parsed.thicknessTensile)}` : '',
          parsed.transverseTensile ? `横向抗拉:${this.formatRangeField(parsed.transverseTensile)}` : '',
          parsed.thicknessElongation ? `厚向伸长:${this.formatRangeField(parsed.thicknessElongation)}` : '',
          parsed.transverseElongation ? `横向伸长:${this.formatRangeField(parsed.transverseElongation)}` : '',
          parsed.coronaBothSides ? `电晕:${this.formatRangeField(parsed.coronaBothSides)}` : ''
        ].filter(Boolean).join('；') || '-'
      }
      return [
        parsed.solidContent ? `固含:${this.formatRangeField(parsed.solidContent)}` : '',
        parsed.peelStrength ? `剥离强度:${this.formatRangeField(parsed.peelStrength)}` : ''
      ].filter(Boolean).join('；') || '-'
    },
    formatType(type) {
      const map = {
        resin: '树脂',
        solvent: '溶剂',
        additive: '助剂',
        curing: '固化剂'
      }
      return map[type] || type || '-'
    },
    formatCategory(category) {
      const map = {
        film: '薄膜',
        chemical: '化工物料'
      }
      return map[category] || category || '-'
    },
    unitOptionsForCategory() {
      if (this.form.materialCategory === 'film') {
        return [
          { label: 'm²', value: 'm²' },
          { label: '卷', value: '卷' }
        ]
      }
      return [
        { label: 'Kg', value: 'kg' },
        { label: '桶', value: '桶' }
      ]
    },
    onCategoryChange(value) {
      if (value === 'film') {
        this.form.unit = 'm²'
      } else if (value === 'chemical') {
        this.form.unit = 'kg'
      }
      this.performanceForm = this.getDefaultPerformanceForm(value)
    },
    specPlaceholder() {
      return this.form.materialCategory === 'film' ? '如：50μm × 1200mm × 3000m' : '如：180kg/桶、900kg/桶'
    },
    indexMethod(index) {
      return (this.pagination.page - 1) * this.pagination.size + index + 1
    },
    async fetchData() {
      this.loading = true
      try {
        const params = {
          page: this.pagination.page,
          size: this.pagination.size,
          ...this.searchForm
        }
        const res = await getRawMaterialPage(params)
        if (this.isSuccess(res.code)) {
          this.list = res.data?.records || []
          this.pagination.total = Number(res.data?.total || 0)
        } else {
          this.$message.error(res.message || '获取数据失败')
        }
      } finally {
        this.loading = false
      }
    },
    handleSearch() {
      this.pagination.page = 1
      this.fetchData()
    },
    handleReset() {
      this.searchForm = { materialCode: '', materialName: '', materialCategory: '', materialType: '', status: null }
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
      this.dialogTitle = '新增原材料'
      this.form = this.getEmptyForm()
      this.performanceForm = this.getDefaultPerformanceForm(this.form.materialCategory)
      this.dialogVisible = true
      this.$nextTick(() => this.$refs.form && this.$refs.form.clearValidate())
    },
    async handleEdit(row) {
      this.dialogTitle = '编辑原材料'
      const res = await getRawMaterialById(row.id)
      if (this.isSuccess(res.code)) {
        this.form = {
          id: res.data.id,
          materialCode: res.data.materialCode,
          materialName: res.data.materialName,
          materialCategory: res.data.materialCategory || 'chemical',
          materialType: res.data.materialType || 'resin',
          unit: res.data.unit || 'kg',
          spec: res.data.spec || '',
          performanceParams: res.data.performanceParams || '',
          sortOrder: res.data.sortOrder || 0,
          status: res.data.status == null ? 1 : res.data.status
        }
        this.loadPerformanceForm()
        this.dialogVisible = true
        this.$nextTick(() => this.$refs.form && this.$refs.form.clearValidate())
      } else {
        this.$message.error(res.message || '获取详情失败')
      }
    },
    handleSubmit() {
      this.$refs.form.validate(async valid => {
        if (!valid) return
        this.submitting = true
        try {
          this.form.performanceParams = JSON.stringify(this.performanceForm || {})
          const api = this.form.id ? updateRawMaterial : createRawMaterial
          const res = await api(this.form)
          if (this.isSuccess(res.code)) {
            this.$message.success(this.form.id ? '更新成功' : '新增成功')
            this.dialogVisible = false
            this.fetchData()
          } else {
            this.$message.error(res.message || '保存失败')
          }
        } finally {
          this.submitting = false
        }
      })
    },
    handleDelete(row) {
      this.$confirm(`确认删除原材料【${row.materialName}】吗？`, '提示', { type: 'warning' })
        .then(async() => {
          const res = await deleteRawMaterial(row.id)
          if (this.isSuccess(res.code)) {
            this.$message.success('删除成功')
            if (this.list.length === 1 && this.pagination.page > 1) {
              this.pagination.page -= 1
            }
            this.fetchData()
          } else {
            this.$message.error(res.message || '删除失败')
          }
        })
        .catch(() => {})
    },
    async handleExport() {
      const res = await exportRawMaterials(this.searchForm)
      const blob = new Blob([res])
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = '研发原材料表.xlsx'
      link.click()
      URL.revokeObjectURL(link.href)
    },
    async handleDownloadTemplate() {
      const res = await downloadRawMaterialTemplate()
      const blob = new Blob([res])
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = '研发原材料导入模板.xlsx'
      link.click()
      URL.revokeObjectURL(link.href)
    },
    handleInitialize() {
      this.$confirm('请上传你的Excel表格进行初始化，系统将按物料编码执行新增/更新，是否现在选择文件？', '提示', { type: 'warning' })
        .then(async() => {
          this.handleImportClick()
        })
        .catch(() => {})
    },
    handleImportClick() {
      this.$refs.importFile && this.$refs.importFile.click()
    },
    async handleImportChange(e) {
      const file = e.target.files[0]
      e.target.value = ''
      if (!file) return
      const res = await importRawMaterials(file)
      if (this.isSuccess(res.code)) {
        this.importResult = res.data
        this.importResultVisible = true
        this.fetchData()
      } else {
        this.$message.error(res.message || '导入失败')
      }
    }
  }
}
</script>
