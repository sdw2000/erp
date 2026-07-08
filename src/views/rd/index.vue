<template>
  <div class="rd-container">
    <el-card>
      <div slot="header" class="clearfix">
        <span>产品规格管理</span>
        <div style="float: right">
          <el-button v-if="$canEdit()" type="primary" plain icon="el-icon-collection-tag" size="small" @click="openColorDictDialog">颜色字典维护</el-button>
          <el-button v-if="$canImportExport()" type="success" icon="el-icon-download" size="small" @click="handleDownloadTemplate">下载模板</el-button>
          <el-button v-if="$canImportExport()" type="warning" icon="el-icon-upload2" size="small" @click="handleImport">导入</el-button>
          <el-button v-if="$canImportExport()" type="info" icon="el-icon-download" size="small" @click="handleExport">导出</el-button>
          <el-button v-if="$canEdit()" type="primary" icon="el-icon-plus" size="small" @click="handleAdd">新增规格</el-button>
          <input ref="fileInput" type="file" accept=".xlsx,.xls" style="display:none" @change="onFileChange">
        </div>
      </div>

      <!-- 查询表单 -->
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="料号">
          <el-input v-model="searchForm.materialCode" placeholder="请输入料号" clearable style="width: 200px" @keyup.enter.native="handleSearch" />
        </el-form-item>
        <el-form-item label="产品名称">
          <el-input v-model="searchForm.productName" placeholder="请输入产品名称" clearable style="width: 160px" @keyup.enter.native="handleSearch" />
        </el-form-item>
        <el-form-item label="颜色">
          <el-select v-model="searchForm.colorCode" placeholder="全部" clearable style="width: 120px">
            <el-option v-for="item in colorOptions" :key="item.code" :label="getColorOptionLabel(item, false)" :value="item.code" />
          </el-select>
        </el-form-item>
        <el-form-item label="基材">
          <el-select v-model="searchForm.baseMaterial" placeholder="全部" clearable style="width: 120px">
            <el-option v-for="item in baseMaterialOptions" :key="item.code" :label="item.name" :value="item.code" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="el-icon-search" @click="handleSearch">搜 索</el-button>
          <el-button icon="el-icon-refresh-left" @click="handleReset">重 置</el-button>
        </el-form-item>
      </el-form>

      <!-- 数据表格 -->
      <el-table ref="specTable" v-loading="loading" :data="list" style="width: 100%; margin-top: 15px" border stripe size="small">
        <el-table-column type="index" label="序号" width="55" align="center" :index="indexMethod" />
        <el-table-column prop="productName" label="产品名称" width="250" show-overflow-tooltip />
        <el-table-column prop="materialCode" label="胶带料号" width="200" show-overflow-tooltip />
        <el-table-column prop="targetWarehouse" label="目标仓库" width="100" align="center">
          <template slot-scope="scope">
            <el-tag :type="getWarehouseTagType(scope.row.targetWarehouse)" size="small">
              {{ scope.row.targetWarehouse || 'TAPE' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="colorCode" label="颜色" width="70" align="center">
          <template slot-scope="scope">
            <el-tag size="small">{{ scope.row.colorCode }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="baseThickness" label="基材厚度/μm" width="100" align="center" />
        <el-table-column prop="baseMaterial" label="基材材质" width="80" align="center" />
        <el-table-column prop="glueMaterial" label="胶水材质" width="80" align="center" />
        <el-table-column prop="glueThickness" label="胶水厚度/μm" width="100" align="center" />
        <el-table-column label="初粘/#" width="80" align="center">
          <template slot-scope="scope">{{ formatRange(scope.row, 'initialTack') }}</template>
        </el-table-column>
        <el-table-column prop="totalThickness" label="总厚度/μm" width="90" align="center" />
        <el-table-column label="厚度波动/μm" width="100" align="center">
          <template slot-scope="scope">
            <span v-if="scope.row.totalThicknessMin && scope.row.totalThicknessMax">
              {{ scope.row.totalThicknessMin }}~{{ scope.row.totalThicknessMax }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="剥离力" width="90" align="center">
          <template slot-scope="scope">{{ formatRange(scope.row, 'peelStrength') }}</template>
        </el-table-column>
        <el-table-column label="解卷力" width="80" align="center">
          <template slot-scope="scope">{{ formatRange(scope.row, 'unwindForce') }}</template>
        </el-table-column>
        <el-table-column label="耐温/℃" width="80" align="center">
          <template slot-scope="scope">{{ formatRange(scope.row, 'heatResistance') }}</template>
        </el-table-column>
        <el-table-column label="扩展检测项目" min-width="220" show-overflow-tooltip>
          <template slot-scope="scope">{{ formatExtraQcList(scope.row, 'name') }}</template>
        </el-table-column>
        <el-table-column label="扩展标准值" min-width="220" show-overflow-tooltip>
          <template slot-scope="scope">{{ formatExtraQcList(scope.row, 'standard') }}</template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="70" align="center">
          <template slot-scope="scope">
            <el-tag :type="scope.row.status === 1 ? 'success' : 'info'" size="small">
              {{ scope.row.status === 1 ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column v-if="$canEdit()" label="操作" width="220" align="center">
          <template slot-scope="scope">
            <el-button type="text" size="small" icon="el-icon-setting" @click="handleManageQcItems(scope.row)">质检标准</el-button>
            <el-button type="text" size="small" icon="el-icon-edit" @click="handleEdit(scope.row)">编辑</el-button>
            <el-button type="text" size="small" icon="el-icon-delete" style="color:#f56c6c" @click="handleDelete(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <el-pagination
        :current-page="pagination.page"
        :page-sizes="[20, 50, 100, 200]"
        :page-size="pagination.size"
        :total="pagination.total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </el-card>

    <!-- 新增/编辑弹窗 -->
    <el-dialog :title="dialogTitle" :visible.sync="dialogVisible" width="900px" :close-on-click-modal="false">
      <el-form ref="form" :model="form" :rules="rules" label-width="110px" size="small">
        <!-- 基本信息 -->
        <el-divider content-position="left">基本信息</el-divider>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="胶带料号" prop="materialCode">
              <el-input v-model="form.materialCode" placeholder="如: 1011-R02-0903-G03-0300" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="产品名称" prop="productName">
              <el-input v-model="form.productName" placeholder="如: 12μ无机翠绿PET胶带" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="颜色代码" prop="colorCode">
              <el-select v-model="form.colorCode" placeholder="请选择" style="width:100%" @change="onColorChange">
                <el-option v-for="item in colorOptions" :key="item.code" :label="getColorOptionLabel(item, true)" :value="item.code" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="基材材质" prop="baseMaterial">
              <el-select v-model="form.baseMaterial" placeholder="请选择" style="width:100%">
                <el-option v-for="item in baseMaterialOptions" :key="item.code" :label="item.name" :value="item.code" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="胶水材质" prop="glueMaterial">
              <el-select v-model="form.glueMaterial" placeholder="请选择" style="width:100%">
                <el-option v-for="item in glueMaterialOptions" :key="item.code" :label="item.name" :value="item.code" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="基材厚度(μm)">
              <el-input-number v-model="form.baseThickness" :min="0" :precision="2" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="胶水厚度(μm)">
              <el-input-number v-model="form.glueThickness" :min="0" :precision="2" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="状态">
              <el-switch v-model="form.status" :active-value="1" :inactive-value="0" active-text="启用" inactive-text="禁用" />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 性能参数 -->
        <el-divider content-position="left">性能参数（支持范围值，用于品质判定）</el-divider>

        <!-- 初粘 -->
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="初粘类型">
              <el-select v-model="form.initialTackType" style="width:100%">
                <el-option label="范围值 (X~Y)" value="range" />
                <el-option label="≥ 大于等于" value="gte" />
                <el-option label="≤ 小于等于" value="lte" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item :label="form.initialTackType === 'lte' ? '初粘上限(#)' : '初粘下限(#)'">
              <el-input-number v-model="form.initialTackMin" :min="0" :precision="2" style="width:100%" :disabled="form.initialTackType === 'lte'" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item v-if="form.initialTackType !== 'gte'" label="初粘上限(#)">
              <el-input-number v-model="form.initialTackMax" :min="0" :precision="2" style="width:100%" />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 总厚度 -->
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="总厚度(μm)">
              <el-input-number v-model="form.totalThickness" :min="0" :precision="2" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="厚度下限(μm)">
              <el-input-number v-model="form.totalThicknessMin" :min="0" :precision="2" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="厚度上限(μm)">
              <el-input-number v-model="form.totalThicknessMax" :min="0" :precision="2" style="width:100%" />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 剥离力 -->
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="剥离力类型">
              <el-select v-model="form.peelStrengthType" style="width:100%">
                <el-option label="范围值 (X~Y)" value="range" />
                <el-option label="≥ 大于等于" value="gte" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="剥离力下限">
              <el-input-number v-model="form.peelStrengthMin" :min="0" :precision="2" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col v-if="form.peelStrengthType === 'range'" :span="8">
            <el-form-item label="剥离力上限">
              <el-input-number v-model="form.peelStrengthMax" :min="0" :precision="2" style="width:100%" />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 解卷力 -->
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="解卷力类型">
              <el-select v-model="form.unwindForceType" style="width:100%">
                <el-option label="范围值 (X~Y)" value="range" />
                <el-option label="≤ 小于等于" value="lte" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="解卷力下限">
              <el-input-number v-model="form.unwindForceMin" :min="0" :precision="2" style="width:100%" :disabled="form.unwindForceType === 'lte'" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="解卷力上限">
              <el-input-number v-model="form.unwindForceMax" :min="0" :precision="2" style="width:100%" />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 耐温 -->
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="耐温类型">
              <el-select v-model="form.heatResistanceType" style="width:100%">
                <el-option label="≥ 大于等于" value="gte" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="耐温值(℃)">
              <el-input-number v-model="form.heatResistance" :min="0" :precision="0" style="width:100%" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">扩展检测项目（可维护报告额外项目）</el-divider>
        <el-row v-for="idx in [1, 2, 3, 4]" :key="'extra-qc-' + idx" :gutter="20">
          <el-col :span="8">
            <el-form-item :label="`项目${idx}名称`">
              <el-input v-model="form[`extraQcItem${idx}Name`]" :placeholder="`如：附着力/外观`" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item :label="`项目${idx}单位`">
              <el-input v-model="form[`extraQcItem${idx}Unit`]" :placeholder="`如：N、-`" />
            </el-form-item>
          </el-col>
          <el-col :span="10">
            <el-form-item :label="`项目${idx}标准值`">
              <el-input v-model="form[`extraQcItem${idx}Standard`]" :placeholder="`如：≥3.5、无气泡`" />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 备注 -->
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="目标仓库" prop="targetWarehouse">
              <el-select v-model="form.targetWarehouse" style="width:100%" placeholder="请选择目标仓库">
                <el-option label="胶带成品仓 (TAPE)" value="TAPE" />
                <el-option label="薄膜仓 (FILM)" value="FILM" />
                <el-option label="化工仓 (CHEMICAL)" value="CHEMICAL" />
                <el-option label="包材辅料仓 (PACKAGE)" value="PACKAGE" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row>
          <el-col :span="24">
            <el-form-item label="备注">
              <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="备注信息" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>

      <div slot="footer">
        <el-button @click="dialogVisible = false">取 消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">确 定</el-button>
      </div>
    </el-dialog>

    <!-- 导入结果弹窗 -->
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

    <!-- 指标管理对话框 -->
    <el-dialog
      :title="`质检标准管理 - ${currentManagingMaterial}`"
      :visible.sync="qcItemManagerVisible"
      width="1000px"
      append-to-body
      custom-class="qc-manager-dialog"
    >
      <div class="qc-manager-single-header">
        <el-radio-group v-model="currentQcType" size="mini" class="qc-type-selector" @change="handleQcTypeChange">
          <el-radio-button label="incoming" class="type-incoming">内控</el-radio-button>
          <el-radio-button label="process" class="type-process">过程</el-radio-button>
          <el-radio-button label="outbound" class="type-outbound">出货</el-radio-button>
        </el-radio-group>

        <el-select
          v-if="currentQcType === 'outbound'"
          v-model="currentCustomerCode"
          size="mini"
          filterable
          clearable
          placeholder="选择客户 (通用可不选)"
          style="width: 180px"
          @change="handleQcTypeChange"
        >
          <el-option
            v-for="c in customerOptions"
            :key="c.customerCode"
            :label="c.customerName ? `${c.customerCode} | ${c.customerName}` : c.customerCode"
            :value="c.customerCode"
          />
        </el-select>

        <el-divider direction="vertical" />
        
        <el-button-group>
          <el-button type="primary" size="mini" icon="el-icon-plus" @click="handleAddQcItem">指标</el-button>
          <el-button type="success" size="mini" icon="el-icon-refresh" @click="handleSyncFromSpec">同步</el-button>
        </el-button-group>

        <div class="qc-header-hint">
          <i class="el-icon-info" style="color: #909399" />
          决定检测表内容
        </div>
      </div>

      <el-table :data="qcItems" border size="small" stripe class="qc-table" highlight-current-row>
        <el-table-column label="排序" width="70" align="center">
          <template slot-scope="{ row }">
            <el-input-number v-model="row.orderNo" :controls="false" size="mini" style="width: 100%" />
          </template>
        </el-table-column>
        <el-table-column label="检测项名称" min-width="180">
          <template slot-scope="{ row }">
            <el-select
              v-model="row.itemName"
              size="mini"
              filterable
              allow-create
              default-first-option
              placeholder="请选择或输入"
              style="width: 100%"
              @change="(val) => handleIndicatorChange(val, row)"
            >
              <el-option
                v-for="dict in indicatorDict"
                v-if="!qcItems.some(item => item.itemName === dict.name && item.itemName !== row.itemName)"
                :key="dict.id"
                :label="dict.name"
                :value="dict.name"
              />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="单位" width="90" align="center">
          <template slot-scope="{ row }">
            <el-input v-model="row.itemUnit" size="mini" placeholder="μm" style="text-align: center" />
          </template>
        </el-table-column>
        <el-table-column label="判定模式" width="130" align="center">
          <template slot-scope="{ row }">
            <el-select v-model="row.judgeMode" size="mini">
              <el-option label="数值范围" value="range" />
              <el-option label="大于等于" value="gte" />
              <el-option label="小于等于" value="lte" />
              <el-option label="文本匹配" value="value" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="标准值配置" min-width="220">
          <template slot-scope="{ row }">
            <div v-if="row.judgeMode === 'range'" class="std-value-box">
              <el-input v-model="row.minValue" size="mini" placeholder="最小值" />
              <span class="std-value-between">~</span>
              <el-input v-model="row.maxValue" size="mini" placeholder="最大值" />
            </div>
            <div v-else-if="row.judgeMode === 'gte'" class="std-value-box">
              <span style="font-weight: bold; color: #409EFF">≥</span>
              <el-input v-model="row.minValue" size="mini" placeholder="最小值" />
            </div>
            <div v-else-if="row.judgeMode === 'lte'" class="std-value-box">
              <span style="font-weight: bold; color: #409EFF">≤</span>
              <el-input v-model="row.maxValue" size="mini" placeholder="最大值" />
            </div>
            <div v-else>
              <el-input v-model="row.stdValue" size="mini" placeholder="标准文本(如: 合格)" />
            </div>
          </template>
        </el-table-column>
        <el-table-column label="必填" width="70" align="center">
          <template slot-scope="{ row }">
            <el-checkbox v-model="row.isRequired" :true-label="1" :false-label="0" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="70" align="center">
          <template slot-scope="{ row, $index }">
            <el-button type="text" style="color:#f56c6c" icon="el-icon-delete" @click="qcItems.splice($index, 1)" />
          </template>
        </el-table-column>
      </el-table>

      <span slot="footer" class="dialog-footer">
        <el-button size="small" @click="qcItemManagerVisible = false">取消</el-button>
        <el-button type="primary" size="small" :loading="qcItemSaving" @click="saveQcItems">保存配置</el-button>
      </span>
    </el-dialog>

    <!-- 颜色字典维护 -->
    <el-dialog title="颜色字典维护" :visible.sync="colorDictDialogVisible" width="900px" :close-on-click-modal="false">
      <el-form :inline="true" :model="colorDictSearch" class="search-form" style="margin-bottom: 10px;">
        <el-form-item label="关键字">
          <el-input v-model="colorDictSearch.keyword" clearable placeholder="颜色代码/颜色名称" style="width: 220px" @keyup.enter.native="handleColorDictSearch" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="colorDictSearch.status" clearable placeholder="全部" style="width: 120px">
            <el-option label="启用" :value="1" />
            <el-option label="禁用" :value="0" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="el-icon-search" @click="handleColorDictSearch">查询</el-button>
          <el-button icon="el-icon-refresh-left" @click="resetColorDictSearch">重置</el-button>
        </el-form-item>
      </el-form>

      <el-form ref="colorDictForm" :model="colorDictForm" :rules="colorDictRules" label-width="90px" size="small" style="padding: 10px; background: #fafafa; border-radius: 4px; margin-bottom: 12px;">
        <el-row :gutter="12">
          <el-col :span="6">
            <el-form-item label="颜色代码" prop="code">
              <el-input v-model="colorDictForm.code" :disabled="!!colorDictForm.id" placeholder="如 R01" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="颜色名称" prop="name">
              <el-input v-model="colorDictForm.name" placeholder="如 透明" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="备注">
              <el-input v-model="colorDictForm.remark" placeholder="备注信息" />
            </el-form-item>
          </el-col>
          <el-col :span="4">
            <el-form-item label="状态">
              <el-switch v-model="colorDictForm.status" :active-value="1" :inactive-value="0" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row>
          <el-col :span="24" style="text-align: right;">
            <el-button size="small" @click="resetColorDictForm">清空</el-button>
            <el-button type="primary" size="small" :loading="colorDictSubmitting" @click="submitColorDict">{{ colorDictForm.id ? '更新' : '新增' }}</el-button>
          </el-col>
        </el-row>
      </el-form>

      <el-table ref="colorDictTable" v-loading="colorDictLoading" :data="colorDictList" border stripe size="small" style="width: 100%">
        <el-table-column type="index" label="序号" width="55" align="center" />
        <el-table-column prop="code" label="颜色代码" width="120" align="center" />
        <el-table-column prop="name" label="颜色名称" width="180" />
        <el-table-column prop="remark" label="备注" width="260" show-overflow-tooltip />
        <el-table-column prop="status" label="状态" width="80" align="center">
          <template slot-scope="scope">
            <el-tag :type="scope.row.status === 1 ? 'success' : 'info'" size="small">
              {{ scope.row.status === 1 ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="140" align="center">
          <template slot-scope="scope">
            <el-button type="text" size="small" icon="el-icon-edit" @click.stop="editColorDict(scope.row)">编辑</el-button>
            <el-button type="text" size="small" icon="el-icon-delete" style="color:#f56c6c" @click.stop="deleteColorDictRow(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        style="margin-top: 10px; text-align: right"
        :current-page="colorDictPagination.page"
        :page-sizes="[10, 20, 50, 100]"
        :page-size="colorDictPagination.size"
        :total="colorDictPagination.total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleColorDictSizeChange"
        @current-change="handleColorDictCurrentChange"
      />

      <div slot="footer">
        <el-button @click="colorDictDialogVisible = false">关 闭</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import {
  getSpecList, createSpec, updateSpec, deleteSpec,
  getColorDict, getBaseMaterialDict, getGlueMaterialDict,
  exportSpec, importSpec, downloadTemplate,
  getColorDictList, createColorDict, updateColorDict, deleteColorDict
} from '@/api/tapeSpec'
import { getCustomerList } from '@/api/customer'
import request from '@/utils/request'
import elTableAutoLayout from '@/mixins/elTableAutoLayout'

export default {
  name: 'TapeSpecManagement',
  mixins: [elTableAutoLayout],
  tableLayoutRefs: ['specTable', 'colorDictTable'],
  data() {
    return {
      searchForm: {
        materialCode: '',
        productName: '',
        colorCode: '',
        baseMaterial: ''
      },
      list: [],
      loading: false,
      pagination: { page: 1, size: 20, total: 0 },

      // 质检指标管理
      qcItemManagerVisible: false,
      qcItemSaving: false,
      currentManagingMaterial: '',
      currentQcType: 'outbound',
      currentCustomerCode: '', // 当前选中的客户代码
      qcItems: [],
      indicatorDict: [], // 指标字典
      customerOptions: [], // 客户列表

      // 字典选项
      colorOptions: [],
      baseMaterialOptions: [],
      glueMaterialOptions: [],

      // 弹窗
      dialogVisible: false,
      dialogTitle: '新增规格',
      submitting: false,
      form: this.getEmptyForm(),
      rules: {
        materialCode: [{ required: true, message: '请输入料号', trigger: 'blur' }],
        productName: [{ required: true, message: '请输入产品名称', trigger: 'blur' }]
      },

      // 导入结果
      importResultVisible: false,
      importResult: null,

      // 颜色字典管理
      colorDictDialogVisible: false,
      colorDictLoading: false,
      colorDictSubmitting: false,
      colorDictSearch: {
        keyword: '',
        status: null
      },
      colorDictList: [],
      colorDictPagination: {
        page: 1,
        size: 20,
        total: 0
      },
      colorDictForm: {
        id: null,
        code: '',
        name: '',
        remark: '',
        status: 1
      },
      colorDictRules: {
        code: [{ required: true, message: '请输入颜色代码', trigger: 'blur' }],
        name: [{ required: true, message: '请输入颜色名称', trigger: 'blur' }]
      }
    }
  },
  created() {
    this.loadDicts()
    this.fetchData()
  },
  methods: {
    $canEdit() {
      // 只有 admin 和 rd 角色可以进行增删改操作
      return this.$hasRole('admin') || this.$hasRole('rd')
    },
    isSuccess(res) {
      return res && (res.code === 20000 || res.code === 200)
    },
    getEmptyForm() {
      return {
        id: null,
        materialCode: '',
        productName: '',
        colorCode: '',
        colorName: '',
        baseThickness: null,
        baseMaterial: '',
        glueMaterial: '',
        glueThickness: null,
        initialTackMin: null,
        initialTackMax: null,
        initialTackType: 'range',
        totalThickness: null,
        totalThicknessMin: null,
        totalThicknessMax: null,
        peelStrengthMin: null,
        peelStrengthMax: null,
        peelStrengthType: 'range',
        unwindForceMin: null,
        unwindForceMax: null,
        unwindForceType: 'range',
        heatResistance: null,
        heatResistanceType: 'gte',
        extraQcItem1Name: '',
        extraQcItem1Unit: '',
        extraQcItem1Standard: '',
        extraQcItem2Name: '',
        extraQcItem2Unit: '',
        extraQcItem2Standard: '',
        extraQcItem3Name: '',
        extraQcItem3Unit: '',
        extraQcItem3Standard: '',
        extraQcItem4Name: '',
        extraQcItem4Unit: '',
        extraQcItem4Standard: '',
        targetWarehouse: 'TAPE',
        remark: '',
        status: 1
      }
    },
    async loadDicts() {
      // 分解 Promise.all，防止其中一个请求失败导致所有字典加载失败
      // 颜色字典
      getColorDict().then(res => {
        if (this.isSuccess(res)) {
          const rawList = Array.isArray(res.data) ? res.data : []
          this.colorOptions = rawList
            .map(item => {
              const code = String(item.code || '').trim().toUpperCase()
              const name = String(item.name || '').trim()
              const isPlaceholder = !!code && !!name && code === name.toUpperCase()
              return { ...item, code, name, isPlaceholder }
            })
            .filter(item => item.code)
            .sort((a, b) => {
              if (a.isPlaceholder !== b.isPlaceholder) return a.isPlaceholder ? 1 : -1
              return String(a.code).localeCompare(String(b.code), 'zh-CN')
            })
        }
      }).catch(e => console.error('加载颜色字典失败', e))

      // 基材材质字典
      getBaseMaterialDict().then(res => {
        if (this.isSuccess(res)) {
          this.baseMaterialOptions = Array.isArray(res.data) ? res.data : []
        }
      }).catch(e => console.error('加载基材字典失败', e))

      // 胶水材质字典
      getGlueMaterialDict().then(res => {
        if (this.isSuccess(res)) {
          this.glueMaterialOptions = Array.isArray(res.data) ? res.data : []
        }
      }).catch(e => console.error('加载胶水字典失败', e))

      // 客户列表 (仅用于质检标准管理，失败不影响基础字典)
      getCustomerList({ page: 1, size: 1000 }).then(res => {
        if (this.isSuccess(res)) {
          this.customerOptions = (res.data && res.data.records) || []
        }
      }).catch(e => console.error('加载客户列表失败', e))
    },
    getColorOptionLabel(item, withCode = true) {
      const code = String(item && item.code ? item.code : '').trim().toUpperCase()
      const name = String(item && item.name ? item.name : '').trim()
      const isPlaceholder = !!code && !!name && code === name.toUpperCase()
      const finalName = name || code
      if (withCode) {
        return isPlaceholder ? `${code} - ${finalName}（待维护）` : `${code} - ${finalName}`
      }
      return isPlaceholder ? `${finalName}（待维护）` : finalName
    },
    async fetchData() {
      this.loading = true
      try {
        const params = {
          page: this.pagination.page,
          size: this.pagination.size,
          ...this.searchForm
        }
        const res = await getSpecList(params)
        if (this.isSuccess(res)) {
          this.list = (res.data && res.data.records) || []
          this.pagination.total = Number(res.data?.total || 0)
          this.scheduleTableLayout()
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
      this.searchForm = { materialCode: '', productName: '', colorCode: '', baseMaterial: '' }
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
    indexMethod(index) {
      return (this.pagination.page - 1) * this.pagination.size + index + 1
    },
    async handleAdd() {
      await this.loadDicts()
      this.dialogTitle = '新增规格'
      this.form = this.getEmptyForm()
      this.dialogVisible = true
      this.$nextTick(() => this.$refs.form && this.$refs.form.clearValidate())
    },
    async handleEdit(row) {
      await this.loadDicts()
      this.dialogTitle = '编辑规格'
      this.form = { ...row }
      this.dialogVisible = true
      this.$nextTick(() => this.$refs.form && this.$refs.form.clearValidate())
    },
    async handleSubmit() {
      try {
        await this.$refs.form.validate()
      } catch (e) {
        return
      }

      // 根据颜色代码设置颜色名称
      const colorItem = this.colorOptions.find(c => c.code === this.form.colorCode)
      if (colorItem) this.form.colorName = colorItem.name

      this.submitting = true
      try {
        const res = this.form.id ? await updateSpec(this.form) : await createSpec(this.form)
        if (this.isSuccess(res)) {
          this.$message.success(this.form.id ? '更新成功' : '创建成功')
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
    handleDelete(row) {
      this.$confirm(`确认删除料号 "${row.materialCode}" 吗?`, '提示', {
        type: 'warning'
      }).then(async() => {
        try {
          const res = await deleteSpec(row.id)
          if (this.isSuccess(res)) {
            this.$message.success('删除成功')
            this.fetchData()
          } else {
            this.$message.error(res.msg || '删除失败')
          }
        } catch (e) {
          this.$message.error('删除失败')
        }
      }).catch(() => {})
    },

    // --- 质检指标管理开始 ---
    async handleManageQcItems(row) {
      if (!row || !row.materialCode) return
      this.currentManagingMaterial = row.materialCode
      this.currentQcType = 'outbound' // 默认打开出货标准
      this.currentCustomerCode = '' // 重置客户选择
      this.qcItems = []
      this.qcItemManagerVisible = true
      
      this.fetchQcItems()
    },
    async fetchQcItems() {
      try {
        const [dictRes, itemsRes] = await Promise.all([
          request.get('/api/quality/indicator-dict/list'),
          request.get('/api/quality/tape-qc-item/by-material', { 
            params: { 
              materialCode: this.currentManagingMaterial,
              qcType: this.currentQcType,
              customerCode: this.currentQcType === 'outbound' ? this.currentCustomerCode : null
            } 
          })
        ])
        
        if (this.isSuccess(dictRes)) {
          this.indicatorDict = dictRes.data || []
        }
        if (this.isSuccess(itemsRes)) {
          const items = itemsRes.data || []
          this.qcItems = items.map(it => {
            if (!it.itemUnit) {
              const dict = this.indicatorDict.find(d => d.name === it.itemName)
              if (dict && dict.defaultUnit) {
                it.itemUnit = dict.defaultUnit
              }
            }
            return it
          })
        }
      } catch (e) {
        this.$message.error('加载指标信息失败')
      }
    },
    handleQcTypeChange() {
      this.fetchQcItems()
    },
    // 选择指标后自动填充单位
    handleIndicatorChange(name, row) {
      const item = this.indicatorDict.find(d => d.name === name)
      if (item) {
        row.itemUnit = item.defaultUnit || ''
      }
    },
    handleAddQcItem() {
      this.qcItems.push({
        materialCode: this.currentManagingMaterial,
        qcType: this.currentQcType,
        customerCode: this.currentQcType === 'outbound' ? this.currentCustomerCode : null,
        itemName: '',
        itemUnit: '',
        judgeMode: 'range',
        minValue: null,
        maxValue: null,
        stdValue: '',
        orderNo: this.qcItems.length + 1,
        isRequired: 1
      })
    },
    async handleSyncFromSpec() {
      if (this.qcItems.length > 0) {
        try {
          await this.$confirm('同步将清空当前已配置的指标并从规格表重新导入，是否继续？', '提示', { type: 'warning' })
        } catch (e) { return }
      }
      
      try {
        const res = await request.post('/api/quality/tape-qc-item/sync-from-spec', null, {
          params: { 
            materialCode: this.currentManagingMaterial,
            qcType: this.currentQcType
          }
        })
        if (this.isSuccess(res)) {
          this.$message.success('同步成功')
          this.qcItems = res.data || []
        } else {
          this.$message.error(res.msg || '同步失败')
        }
      } catch (e) {
        this.$message.error('同步失败')
      }
    },
    async saveQcItems() {
      if (!this.currentManagingMaterial) return
      
      // 简单校验
      for (const item of this.qcItems) {
        if (!item.itemName) {
          this.$message.warning('检测项名称不能为空')
          return
        }
      }
      
      this.qcItemSaving = true
      try {
        const customerCode = this.currentQcType === 'outbound' ? this.currentCustomerCode : null
        const itemsToSave = this.qcItems.map(it => ({
          ...it,
          customerCode: customerCode
        }))
        const res = await request.post('/api/quality/tape-qc-item/save-batch', itemsToSave, {
          params: { 
            materialCode: this.currentManagingMaterial,
            qcType: this.currentQcType,
            customerCode: customerCode
          }
        })
        if (this.isSuccess(res)) {
          this.$message.success('保存成功')
          // 不再自动关闭弹窗，方便维护多个标准
          this.$message.info('标准已保存，您可以切换其它页签继续维护')
        } else {
          this.$message.error(res.msg || '保存失败')
        }
      } catch (e) {
        this.$message.error('保存失败')
      } finally {
        this.qcItemSaving = false
      }
    },
    // --- 质检指标管理结束 ---
    onColorChange(code) {
      const item = this.colorOptions.find(c => c.code === code)
      if (item) this.form.colorName = item.name
    },
    // 格式化范围显示
    formatRange(row, field) {
      let min, max, type
      switch (field) {
        case 'initialTack':
          min = row.initialTackMin
          max = row.initialTackMax
          type = row.initialTackType
          break
        case 'peelStrength':
          min = row.peelStrengthMin
          max = row.peelStrengthMax
          type = row.peelStrengthType
          break
        case 'unwindForce':
          min = row.unwindForceMin
          max = row.unwindForceMax
          type = row.unwindForceType
          break
        case 'heatResistance':
          min = row.heatResistance
          type = row.heatResistanceType
          if (type === 'gte' && min != null) return `≥${min}`
          return min || ''
        default:
          return ''
      }
      if (!type) type = 'range'
      if (type === 'lte' && max != null) return `≤${max}`
      if (type === 'gte' && min != null) return `≥${min}`
      if (min != null && max != null) return `${min}~${max}`
      if (min != null) return `≥${min}`
      if (max != null) return `≤${max}`
      return ''
    },
    getExtraQcList(row) {
      const result = []
      if (!row || typeof row !== 'object') return result
      for (let i = 1; i <= 4; i++) {
        const name = String(row[`extraQcItem${i}Name`] || '').trim()
        const unit = String(row[`extraQcItem${i}Unit`] || '').trim()
        const standard = String(row[`extraQcItem${i}Standard`] || '').trim()
        if (!name && !standard) continue
        result.push({ name, unit, standard })
      }
      return result
    },
    formatExtraQcList(row, mode) {
      const list = this.getExtraQcList(row)
      if (!list.length) return '-'
      if (mode === 'name') {
        return list.map(item => `${item.name || '(未命名)'}${item.unit ? `(${item.unit})` : ''}`).join('；')
      }
      return list.map(item => item.standard || '-').join('；')
    },
    handleDownloadTemplate() {
      downloadTemplate().then(blob => {
        this.downloadFile(blob, '胶带规格导入模板.xlsx')
      }).catch(() => {
        this.$message.error('下载模板失败')
      })
    },
    handleExport() {
      this.loading = true
      exportSpec(this.searchForm).then(blob => {
        const fileName = `胶带规格数据_${new Date().toLocaleDateString().replace(/\//g, '-')}.xlsx`
        this.downloadFile(blob, fileName)
      }).catch(() => {
        this.$message.error('导出失败')
      }).finally(() => {
        this.loading = false
      })
    },
    handleImport() {
      this.$refs.fileInput.click()
    },
    async onFileChange(e) {
      const file = e.target.files[0]
      if (!file) return

      this.loading = true
      try {
        const res = await importSpec(file)
        if (this.isSuccess(res)) {
          const result = res.data || {}
          const successCount = Number(result.successCount || 0)
          const failCount = Number(result.failCount || 0)
          const errors = Array.isArray(result.errors) ? result.errors : []

          this.importResult = {
            successCount,
            failCount,
            errors
          }
          this.importResultVisible = true

          if (failCount > 0) {
            const summary = errors.slice(0, 3).join('；')
            this.$message.warning(`导入完成：成功${successCount}条，失败${failCount}条${summary ? `，失败原因：${summary}` : ''}`)
          } else {
            this.$message.success(`导入完成：成功${successCount}条，失败${failCount}条`)
          }

          this.fetchData()
        } else {
          this.$message.error(res.msg || res.message || '导入失败')
        }
      } catch (e) {
        this.$message.error((e && e.message) || (e && e.response && e.response.data && (e.response.data.msg || e.response.data.message)) || '导入失败')
      } finally {
        this.loading = false
        this.$refs.fileInput.value = ''
      }
    },
    downloadFile(blob, fileName) {
      const url = window.URL.createObjectURL(new Blob([blob]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', fileName)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    },
    openColorDictDialog() {
      this.colorDictDialogVisible = true
      this.colorDictPagination.page = 1
      this.fetchColorDictList()
      this.resetColorDictForm()
    },
    async fetchColorDictList() {
      this.colorDictLoading = true
      try {
        const params = {
          keyword: this.colorDictSearch.keyword || undefined,
          status: this.colorDictSearch.status,
          page: this.colorDictPagination.page,
          size: this.colorDictPagination.size
        }
        const res = await getColorDictList(params)
        if (this.isSuccess(res)) {
          const data = res.data || {}
          if (Array.isArray(data)) {
            this.colorDictList = data
            this.colorDictPagination.total = data.length
          } else {
            this.colorDictList = Array.isArray(data.records) ? data.records : []
            this.colorDictPagination.total = Number(data.total || 0)
          }
          this.scheduleTableLayout()
        }
      } catch (e) {
        this.$message.error('获取颜色字典失败')
      } finally {
        this.colorDictLoading = false
      }
    },
    resetColorDictSearch() {
      this.colorDictSearch = { keyword: '', status: null }
      this.colorDictPagination.page = 1
      this.fetchColorDictList()
    },
    handleColorDictSearch() {
      this.colorDictPagination.page = 1
      this.fetchColorDictList()
    },
    handleColorDictSizeChange(size) {
      this.colorDictPagination.size = size
      this.colorDictPagination.page = 1
      this.fetchColorDictList()
    },
    handleColorDictCurrentChange(page) {
      this.colorDictPagination.page = page
      this.fetchColorDictList()
    },
    resetColorDictForm() {
      this.colorDictForm = {
        id: null,
        code: '',
        name: '',
        remark: '',
        status: 1
      }
      this.$nextTick(() => this.$refs.colorDictForm && this.$refs.colorDictForm.clearValidate())
    },
    editColorDict(row) {
      if (!row || !row.id) {
        this.$message.warning('该颜色记录无效，无法编辑')
        return
      }
      this.colorDictForm = {
        id: row.id,
        code: row.code,
        name: row.name,
        remark: row.remark || '',
        status: row.status
      }
      this.$message.info('已加载到上方编辑区，可直接修改后点击“更新”')
      this.$nextTick(() => this.$refs.colorDictForm && this.$refs.colorDictForm.clearValidate())
    },
    async submitColorDict() {
      try {
        await this.$refs.colorDictForm.validate()
      } catch (e) {
        return
      }

      this.colorDictSubmitting = true
      try {
        const payload = { ...this.colorDictForm }
        const res = payload.id ? await updateColorDict(payload) : await createColorDict(payload)
        if (this.isSuccess(res)) {
          this.$message.success(payload.id ? '更新成功' : '新增成功')
          this.resetColorDictForm()
          await this.fetchColorDictList()
          await this.loadDicts()
        } else {
          this.$message.error(res.msg || '操作失败')
        }
      } catch (e) {
        this.$message.error('操作失败')
      } finally {
        this.colorDictSubmitting = false
      }
    },
    deleteColorDictRow(row) {
      this.$confirm(`确认删除颜色代码 "${row.code}" 吗?`, '提示', {
        type: 'warning'
      }).then(async() => {
        try {
          const res = await deleteColorDict(row.id)
          if (this.isSuccess(res)) {
            this.$message.success('删除成功')
            await this.fetchColorDictList()
            await this.loadDicts()
            if (this.colorDictForm.id === row.id) {
              this.resetColorDictForm()
            }
          } else {
            this.$message.error(res.msg || '删除失败')
          }
        } catch (e) {
          this.$message.error('删除失败')
        }
      }).catch(() => {})
    },
    getWarehouseTagType(warehouse) {
      if (!warehouse) return 'primary' // 成品默认胶带仓
      switch (warehouse) {
        case 'TAPE': return 'primary'
        case 'FILM': return 'success'
        case 'CHEMICAL': return 'warning'
        case 'PACKAGE': return 'info'
        default: return 'info'
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.rd-container {
  padding: 20px;

  .search-card, .toolbar-card {
    margin-bottom: 15px;
  }

  .el-pagination {
    margin-top: 15px;
    text-align: right;
  }

  .el-divider {
    margin: 15px 0;
  }
}

/* 紧凑型质检标准管理头部 */
.qc-manager-single-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 12px;
  background-color: #f8f9fb;
  border-radius: 4px;
  margin-bottom: 12px;
  border: 1px solid #ebeef5;
}

.qc-type-selector {
  ::v-deep .el-radio-button__inner {
    padding: 7px 15px;
  }
}

/* 不同类型颜色区分 */
::v-deep .type-incoming.is-active .el-radio-button__inner {
  background-color: #67c23a !important;
  border-color: #67c23a !important;
  box-shadow: -1px 0 0 0 #67c23a !important;
}
::v-deep .type-process.is-active .el-radio-button__inner {
  background-color: #e6a23c !important;
  border-color: #e6a23c !important;
  box-shadow: -1px 0 0 0 #e6a23c !important;
}
::v-deep .type-outbound.is-active .el-radio-button__inner {
  background-color: #409eff !important;
  border-color: #409eff !important;
}

.qc-header-hint {
  margin-left: auto;
  color: #909399;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
}

.qc-table {
  ::v-deep .el-table__header th {
    background-color: #f5f7fa !important;
    color: #606266;
    font-weight: 600;
  }
}

.std-value-box {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.std-value-between {
  color: #909399;
  font-size: 12px;
}
</style>
```
