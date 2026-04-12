<template>
  <div class="customer-container">
    <el-card>
      <div slot="header" class="clearfix">
        <span>客户管理</span>        <div style="float: right">
          <el-button v-if="$canImportExport()" type="success" icon="el-icon-download" size="small" @click="handleDownloadTemplate">下载模板</el-button>
          <el-button v-if="$canImportExport()" type="warning" icon="el-icon-upload2" size="small" @click="handleImport">导入</el-button>
          <el-button v-if="$canImportExport()" type="info" icon="el-icon-download" size="small" @click="handleExport">导出</el-button>
          <el-button type="primary" icon="el-icon-plus" size="small" @click="handleAdd">新增客户</el-button>
        </div>
      </div>

      <!-- 查询表单 -->
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="客户搜索">
          <el-input v-model="searchForm.customerKeyword" placeholder="请输入客户名称/简称/编号" clearable style="width: 220px" @keyup.enter.native="handleSearch" />
        </el-form-item>
        <el-form-item label="客户类型">
          <el-select v-model="searchForm.customerType" placeholder="全部类型" clearable style="width: 120px">
            <el-option label="企业客户" value="企业客户" />
            <el-option label="个人客户" value="个人客户" />
          </el-select>
        </el-form-item>
        <el-form-item label="客户等级">
          <el-select v-model="searchForm.customerLevel" placeholder="全部等级" clearable style="width: 120px">
            <el-option label="A级客户" value="A级客户" />
            <el-option label="B级客户" value="B级客户" />
            <el-option label="C级客户" value="C级客户" />
            <el-option label="潜在客户" value="潜在客户" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="全部状态" clearable style="width: 100px">
            <el-option label="正常" value="正常" />
            <el-option label="冻结" value="冻结" />
            <el-option label="黑名单" value="黑名单" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="el-icon-search" @click="handleSearch">搜 索</el-button>
          <el-button icon="el-icon-refresh-left" @click="handleReset">重 置</el-button>
        </el-form-item>
      </el-form>      <!-- 数据表格 -->
      <el-table
        ref="customerTable"
        v-loading="loading"
        :data="customers"
        class="customer-table"
        size="small"
        style="width: 100%; margin-top: 12px"
        border
        stripe
      >
        <el-table-column type="index" label="序号" width="56" align="center" />
        <el-table-column prop="customerCode" label="客户编号" min-width="120" show-overflow-tooltip />
        <el-table-column prop="shortName" label="客户简称" min-width="120" show-overflow-tooltip />
        <el-table-column prop="customerLevel" label="客户等级" width="88">
          <template slot-scope="scope">
            <el-tag :type="getLevelTagType(scope.row.customerLevel)" size="small">{{ scope.row.customerLevel }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="76">
          <template slot-scope="scope">
            <el-tag :type="getStatusTagType(scope.row.status)" size="small">{{ scope.row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="salesUserName" label="销售" min-width="88" show-overflow-tooltip />
        <el-table-column prop="documentationPersonUserName" label="跟单员" min-width="88" show-overflow-tooltip />
        <el-table-column prop="createTime" label="创建日期" width="90">
          <template slot-scope="scope">
            {{ formatDateCompact(scope.row.createTime) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="210" align="center">
          <template slot-scope="scope">
            <el-button type="text" size="small" icon="el-icon-view" @click="handleView(scope.row)">查看</el-button>
            <el-button type="text" size="small" icon="el-icon-edit" @click="handleEdit(scope.row)">编辑</el-button>
            <el-button type="text" size="small" icon="el-icon-delete" @click="handleDelete(scope.row)">删除</el-button>
            <el-dropdown @command="(cmd) => handleCommand(cmd, scope.row)">
              <el-button type="text" size="small">
                更多<i class="el-icon-arrow-down el-icon--right" />
              </el-button>
              <el-dropdown-menu slot="dropdown">
                <el-dropdown-item v-if="scope.row.status === '正常'" command="freeze">冻结</el-dropdown-item>
                <el-dropdown-item v-if="scope.row.status === '冻结'" command="unfreeze">解冻</el-dropdown-item>
                <el-dropdown-item v-if="scope.row.status !== '黑名单'" command="blacklist">加入黑名单</el-dropdown-item>
              </el-dropdown-menu>
            </el-dropdown>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <el-pagination
        :current-page="pagination.current"
        :page-sizes="[10, 20, 50, 100]"
        :page-size="pagination.size"
        :total="pagination.total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </el-card>

    <!-- 新增/编辑弹窗 -->
    <el-dialog
      :title="dialogTitle"
      :visible.sync="dialogVisible"
      width="80%"
      :close-on-click-modal="false"
      @close="handleDialogClose"
    >
      <el-form ref="customerForm" :model="formData" :rules="formRules" label-width="120px">
        <el-tabs v-model="activeTab">
          <!-- 基本信息 -->
          <el-tab-pane label="基本信息" name="basic">
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="客户名称" prop="customerName">
                  <el-input v-model="formData.customerName" placeholder="请输入客户全称" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="客户简称" prop="shortName">
                  <el-input v-model="formData.shortName" placeholder="请输入客户简称" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item v-if="!isEdit" label="编号前缀" prop="codePrefix">
                  <el-input v-model="formData.codePrefix" placeholder="如ALB（阿里巴巴）" maxlength="5" />
                  <span class="form-tip">2-5个大写字母，系统自动生成完整编号</span>
                </el-form-item>
                <el-form-item v-else label="客户编号">
                  <el-input v-model="formData.customerCode" disabled />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="客户类型" prop="customerType">
                  <el-select v-model="formData.customerType" placeholder="请选择" style="width: 100%">
                    <el-option label="企业客户" value="企业客户" />
                    <el-option label="个人客户" value="个人客户" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="客户等级" prop="customerLevel">
                  <el-select v-model="formData.customerLevel" placeholder="请选择" style="width: 100%">
                    <el-option label="A级客户" value="A级客户" />
                    <el-option label="B级客户" value="B级客户" />
                    <el-option label="C级客户" value="C级客户" />
                    <el-option label="潜在客户" value="潜在客户" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="所属行业">
                  <el-input v-model="formData.industry" placeholder="如：互联网、制造业" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="订单号前缀">
                  <el-input v-model="formData.orderNoPrefix" placeholder="如：DH" maxlength="10" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="订单号后缀">
                  <el-input v-model="formData.orderNoSuffix" placeholder="如：-SZ" maxlength="10" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="销售" prop="salesUserId">
                  <el-select v-model="formData.salesUserId" placeholder="请选择销售" clearable filterable style="width: 100%">
                    <el-option v-for="user in users" :key="user.id" :label="user.realName || user.username" :value="user.id" />
                  </el-select>
                  <span v-if="users.length === 0" class="form-tip" style="color: #f56c6c;">暂无用户数据</span>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="跟单员" prop="documentationPersonUserId">
                  <el-select v-model="formData.documentationPersonUserId" placeholder="请选择跟单员" clearable filterable style="width: 100%">
                    <el-option v-for="user in users" :key="user.id" :label="user.realName || user.username" :value="user.id" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
          </el-tab-pane>

          <!-- 联系信息 -->
          <el-tab-pane label="联系信息" name="contact">
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="公司电话">
                  <el-input v-model="formData.companyPhone" placeholder="请输入公司电话" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="公司邮箱">
                  <el-input v-model="formData.companyEmail" placeholder="请输入公司邮箱" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="公司传真">
                  <el-input v-model="formData.companyFax" placeholder="请输入公司传真" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="公司网站">
                  <el-input v-model="formData.website" placeholder="请输入公司网站" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="联系地址">
                  <el-input v-model="formData.contactAddress" placeholder="请输入联系地址" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="收货地址">
                  <el-input v-model="formData.receiveAddress" placeholder="请输入收货地址（优先用于发货）" />
                </el-form-item>
              </el-col>
            </el-row>
          </el-tab-pane>

          <!-- 财务信息 -->
          <el-tab-pane label="财务信息" name="finance">
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="信用额度">
                  <el-input-number v-model="formData.creditLimit" :min="0" :precision="2" style="width: 100%" />
                  <span class="form-tip">单位：元</span>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="付款条件">
                  <el-select v-model="formData.paymentTerms" placeholder="请选择" style="width: 100%">
                    <el-option label="现款现货" value="现款现货" />
                    <el-option label="货到付款" value="货到付款" />
                    <el-option label="月结30天" value="月结30天" />
                    <el-option label="月结60天" value="月结60天" />
                    <el-option label="预付30%" value="预付30%" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="税率">
                  <el-input-number v-model="formData.taxRate" :min="0" :max="100" :precision="2" style="width: 100%" />
                  <span class="form-tip">单位：%</span>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="默认对账日期">
                  <el-input-number v-model="formData.defaultReconciliationDay" :min="1" :max="31" :precision="0" style="width: 100%" />
                  <span class="form-tip">单位：日（例如 25 表示按每月25日对账）</span>
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="对账依据">
                  <el-select v-model="formData.reconciliationBasis" placeholder="请选择" style="width: 100%">
                    <el-option label="按已发货对账" value="SHIPPED" />
                    <el-option label="按已收货对账" value="RECEIVED" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="税号">
                  <el-input v-model="formData.taxNumber" placeholder="请输入纳税人识别号" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="开户银行">
                  <el-input v-model="formData.bankName" placeholder="请输入开户银行" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="银行账号">
                  <el-input v-model="formData.bankAccount" placeholder="请输入银行账号" />
                </el-form-item>
              </el-col>
            </el-row>
          </el-tab-pane>

          <!-- 联系人 -->
          <el-tab-pane label="联系人" name="contacts">
            <el-button type="primary" size="small" icon="el-icon-plus" style="margin-bottom: 10px" @click="handleAddContact">添加联系人</el-button>
            <el-table :data="formData.contacts" border style="width: 100%">
              <el-table-column label="姓名" width="100">
                <template slot-scope="scope">
                  <el-input v-model="scope.row.contactName" size="small" placeholder="请输入姓名" />
                </template>
              </el-table-column>
              <el-table-column label="职位" width="100">
                <template slot-scope="scope">
                  <el-input v-model="scope.row.contactPosition" size="small" placeholder="请输入职位" />
                </template>
              </el-table-column>
              <el-table-column label="手机" width="130">
                <template slot-scope="scope">
                  <el-input v-model="scope.row.contactPhone" size="small" placeholder="请输入手机号" />
                </template>
              </el-table-column>
              <el-table-column label="邮箱" width="180">
                <template slot-scope="scope">
                  <el-input v-model="scope.row.contactEmail" size="small" placeholder="请输入邮箱" />
                </template>
              </el-table-column>
              <el-table-column label="微信" width="120">
                <template slot-scope="scope">
                  <el-input v-model="scope.row.contactWechat" size="small" placeholder="请输入微信号" />
                </template>
              </el-table-column>
              <el-table-column label="主联系人" width="100" align="center">
                <template slot-scope="scope">
                  <el-checkbox v-model="scope.row.isPrimary" :true-label="1" :false-label="0" @change="handlePrimaryChange(scope.$index)" />
                </template>
              </el-table-column>
              <el-table-column label="决策人" width="80" align="center">
                <template slot-scope="scope">
                  <el-checkbox v-model="scope.row.isDecisionMaker" :true-label="1" :false-label="0" />
                </template>
              </el-table-column>
              <el-table-column label="是否收货人" width="100" align="center">
                <template slot-scope="scope">
                  <el-checkbox v-model="scope.row.isReceiver" :true-label="1" :false-label="0" />
                </template>
              </el-table-column>
              <el-table-column label="操作" width="80" fixed="right">
                <template slot-scope="scope">
                  <el-button type="text" size="small" @click="handleDeleteContact(scope.$index)">删除</el-button>
                </template>
              </el-table-column>
            </el-table>
            <div style="color: #f56c6c; margin-top: 10px;">* 每个客户至少需要一个联系人，至少一个主联系人，至少一个收货人</div>
          </el-tab-pane>
        </el-tabs>
      </el-form>

      <span slot="footer" class="dialog-footer">
        <el-button @click="dialogVisible = false">取 消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="handleSubmit">确 定</el-button>
      </span>
    </el-dialog>    <!-- 查看详情弹窗 -->
    <el-dialog
      title="客户详情"
      :visible.sync="detailVisible"
      width="90%"
      top="5vh"
    >
      <div v-if="detailData" class="detail-content">
        <!-- 客户概况卡片 -->
        <el-row :gutter="20" class="summary-cards">
          <el-col :span="6">
            <el-card shadow="hover" class="summary-card">
              <div class="summary-icon" style="background: #409EFF;"><i class="el-icon-document" /></div>
              <div class="summary-info">
                <div class="summary-value">{{ detailData.quotationCount || 0 }}</div>
                <div class="summary-label">报价单</div>
              </div>
            </el-card>
          </el-col>
          <el-col :span="6">
            <el-card shadow="hover" class="summary-card">
              <div class="summary-icon" style="background: #67C23A;"><i class="el-icon-s-order" /></div>
              <div class="summary-info">
                <div class="summary-value">{{ detailData.salesOrderCount || 0 }}</div>
                <div class="summary-label">销售订单</div>
              </div>
            </el-card>
          </el-col>
          <el-col :span="6">
            <el-card shadow="hover" class="summary-card">
              <div class="summary-icon" style="background: #E6A23C;"><i class="el-icon-box" /></div>
              <div class="summary-info">
                <div class="summary-value">{{ detailData.sampleOrderCount || 0 }}</div>
                <div class="summary-label">送样单</div>
              </div>
            </el-card>
          </el-col>
          <el-col :span="6">
            <el-card shadow="hover" class="summary-card">
              <div class="summary-icon" style="background: #F56C6C;"><i class="el-icon-coin" /></div>
              <div class="summary-info">
                <div class="summary-value">¥{{ formatMoney(detailData.totalOrderAmount) }}</div>
                <div class="summary-label">累计订单金额</div>
              </div>
            </el-card>
          </el-col>
        </el-row>

        <el-tabs v-model="detailActiveTab" type="border-card">
          <!-- 基本信息 -->
          <el-tab-pane label="基本信息" name="basic">
            <el-table :data="[detailData]" border size="small" style="width: 100%" empty-text="暂无数据">
              <el-table-column prop="customerCode" label="客户编号" width="150">
                <template slot-scope="scope">
                  <el-tag type="primary" size="medium">{{ scope.row.customerCode || '-' }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="customerName" label="客户名称" min-width="200" />
              <el-table-column prop="shortName" label="客户简称" width="140" />
              <el-table-column prop="orderNoPrefix" label="订单号前缀" width="120" />
              <el-table-column prop="orderNoSuffix" label="订单号后缀" width="120" />
              <el-table-column prop="customerType" label="客户类型" width="120">
                <template slot-scope="scope">
                  <el-tag :type="scope.row.customerType === '企业客户' ? 'primary' : 'success'" size="small">
                    {{ scope.row.customerType || '-' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="customerLevel" label="客户等级" width="120">
                <template slot-scope="scope">
                  <el-tag :type="getLevelTagType(scope.row.customerLevel)" size="small">
                    {{ scope.row.customerLevel || '-' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="status" label="状态" width="100">
                <template slot-scope="scope">
                  <el-tag :type="getStatusTagType(scope.row.status)" size="small">
                    {{ scope.row.status || '-' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="industry" label="所属行业" min-width="140" />
              <el-table-column prop="source" label="客户来源" min-width="140" />
              <el-table-column prop="createTime" label="创建时间" width="180">
                <template slot-scope="scope">
                  {{ scope.row.createTime || '-' }}
                </template>
              </el-table-column>
            </el-table>
          </el-tab-pane>

          <!-- 企业信息 -->
          <el-tab-pane label="企业信息" name="enterprise">
            <el-table :data="[detailData]" border size="small" style="width: 100%" empty-text="暂无数据">
              <el-table-column prop="creditCode" label="统一社会信用代码" min-width="180" />
              <el-table-column prop="taxNumber" label="税号" min-width="140" />
              <el-table-column prop="legalPerson" label="法定代表人" width="120" />
              <el-table-column prop="registeredCapital" label="注册资本(万元)" width="140">
                <template slot-scope="scope">
                  {{ scope.row.registeredCapital || '-' }}
                </template>
              </el-table-column>
              <el-table-column prop="registeredAddress" label="注册地址" min-width="200" />
              <el-table-column prop="businessAddress" label="经营地址" min-width="200" />
              <el-table-column prop="businessScope" label="经营范围" min-width="200" />
            </el-table>
          </el-tab-pane>

          <!-- 联系信息 -->
          <el-tab-pane label="联系信息" name="contact">
            <el-table :data="[detailData]" border size="small" style="width: 100%" empty-text="暂无数据">
              <el-table-column prop="companyPhone" label="公司电话" width="140" />
              <el-table-column prop="companyFax" label="公司传真" width="140" />
              <el-table-column prop="companyEmail" label="公司邮箱" min-width="180" />
              <el-table-column prop="website" label="公司网站" min-width="200">
                <template slot-scope="scope">
                  <a v-if="scope.row.website" :href="scope.row.website" target="_blank" class="link">{{ scope.row.website }}</a>
                  <span v-else>-</span>
                </template>
              </el-table-column>
              <el-table-column prop="contactAddress" label="联系地址" min-width="220" />
              <el-table-column prop="receiveAddress" label="收货地址" min-width="220" />
            </el-table>
          </el-tab-pane>

          <!-- 财务信息 -->
          <el-tab-pane label="财务信息" name="finance">
            <el-table :data="[detailData]" border size="small" style="width: 100%" empty-text="暂无数据">
              <el-table-column prop="creditLimit" label="信用额度" width="140">
                <template slot-scope="scope">
                  <span class="money">¥{{ formatMoney(scope.row.creditLimit) }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="paymentTerms" label="付款条件" width="140">
                <template slot-scope="scope">
                  <el-tag type="info" size="small">{{ scope.row.paymentTerms || '-' }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="taxRate" label="税率" width="100">
                <template slot-scope="scope">
                  {{ scope.row.taxRate ? scope.row.taxRate + '%' : '-' }}
                </template>
              </el-table-column>
              <el-table-column prop="reconciliationBasis" label="对账依据" width="140">
                <template slot-scope="scope">
                  {{ scope.row.reconciliationBasis === 'RECEIVED' ? '按已收货' : '按已发货' }}
                </template>
              </el-table-column>
              <el-table-column prop="taxNumber" label="税号" min-width="140" />
              <el-table-column prop="bankName" label="开户银行" min-width="160" />
              <el-table-column prop="bankAccount" label="银行账号" min-width="180" />
            </el-table>
          </el-tab-pane>

          <!-- 销售信息 -->
          <el-tab-pane label="销售信息" name="sales">
            <el-table :data="[detailData]" border size="small" style="width: 100%" empty-text="暂无数据">
              <el-table-column prop="salesUserName" label="销售" width="120" />
              <el-table-column prop="documentationPersonUserName" label="跟单员" width="120" />
              <el-table-column prop="primaryContactName" label="主联系人" width="120" />
              <el-table-column prop="primaryContactMobile" label="联系电话" width="140" />
              <el-table-column prop="primaryContactEmail" label="联系邮箱" min-width="180" />
              <el-table-column prop="remark" label="备注" min-width="200" />
            </el-table>
          </el-tab-pane>

          <!-- 联系人列表 -->
          <el-tab-pane label="联系人" name="contacts">
            <el-table :data="detailData.contacts || []" border style="width: 100%" size="small">
              <el-table-column prop="contactName" label="姓名" width="100" />
              <el-table-column prop="contactPosition" label="职位" width="120" />
              <el-table-column prop="contactPhone" label="手机" width="130" />
              <el-table-column prop="contactEmail" label="邮箱" width="200" />
              <el-table-column prop="contactWechat" label="微信" width="120" />
              <el-table-column label="主联系人" width="90" align="center">
                <template slot-scope="scope">
                  <el-tag v-if="scope.row.isPrimary === 1" type="success" size="mini">是</el-tag>
                  <span v-else class="text-muted">否</span>
                </template>
              </el-table-column>
              <el-table-column label="决策人" width="80" align="center">
                <template slot-scope="scope">
                  <el-tag v-if="scope.row.isDecisionMaker === 1" type="warning" size="mini">是</el-tag>
                  <span v-else class="text-muted">否</span>
                </template>
              </el-table-column>
              <el-table-column label="收货人" width="80" align="center">
                <template slot-scope="scope">
                  <el-tag v-if="scope.row.isReceiver === 1" type="primary" size="mini">是</el-tag>
                  <span v-else class="text-muted">否</span>
                </template>
              </el-table-column>
            </el-table>
          </el-tab-pane>

          <!-- 相关报价单 -->
          <el-tab-pane label="报价单记录" name="quotations">
            <el-table :data="detailData.quotations || []" border style="width: 100%" size="small" empty-text="暂无报价单记录">
              <el-table-column prop="quotationNo" label="报价单号" width="160" />
              <el-table-column prop="quotationDate" label="报价日期" width="120" />
              <el-table-column prop="totalAmount" label="报价金额" width="120" align="right">
                <template slot-scope="scope">
                  <span class="money">¥{{ formatMoney(scope.row.totalAmount) }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="status" label="状态" width="100">
                <template slot-scope="scope">
                  <el-tag :type="getQuotationStatusType(scope.row.status)" size="mini">{{ scope.row.status }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="100">
                <template slot-scope="scope">
                  <el-button type="text" size="mini" @click="goToQuotation(scope.row.id)">查看</el-button>
                </template>
              </el-table-column>
            </el-table>
          </el-tab-pane>

          <!-- 相关订单 -->
          <el-tab-pane label="订单记录" name="orders">
            <el-table :data="detailData.salesOrders || []" border style="width: 100%" size="small" empty-text="暂无订单记录">
              <el-table-column prop="orderNo" label="订单号" width="160" />
              <el-table-column prop="orderDate" label="订单日期" width="120" />
              <el-table-column prop="totalAmount" label="订单金额" width="120" align="right">
                <template slot-scope="scope">
                  <span class="money">¥{{ formatMoney(scope.row.totalAmount) }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="status" label="状态" width="100">
                <template slot-scope="scope">
                  <el-tag :type="getOrderStatusType(scope.row.status)" size="mini">{{ scope.row.status }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="100">
                <template slot-scope="scope">
                  <el-button type="text" size="mini" @click="goToOrder(scope.row.id)">查看</el-button>
                </template>
              </el-table-column>
            </el-table>
          </el-tab-pane>

          <!-- 相关送样单 -->
          <el-tab-pane label="送样记录" name="samples">
            <el-table :data="detailData.sampleOrders || []" border style="width: 100%" size="small" empty-text="暂无送样记录">
              <el-table-column prop="sampleNo" label="送样单号" width="160" />
              <el-table-column prop="sendDate" label="送样日期" width="120" />
              <el-table-column prop="trackingNumber" label="快递单号" width="180" />
              <el-table-column prop="status" label="状态" width="100">
                <template slot-scope="scope">
                  <el-tag :type="getSampleStatusType(scope.row.status)" size="mini">{{ scope.row.status }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="100">
                <template slot-scope="scope">
                  <el-button type="text" size="mini" @click="goToSample(scope.row.id)">查看</el-button>
                </template>
              </el-table-column>
            </el-table>
          </el-tab-pane>
        </el-tabs>
      </div>
      <span slot="footer" class="dialog-footer">
        <el-button @click="detailVisible = false">关 闭</el-button>
        <el-button type="primary" @click="handleEditFromDetail">编 辑</el-button>
      </span>
    </el-dialog>

    <!-- 导入弹窗 -->
    <el-dialog
      title="导入客户数据"
      :visible.sync="importDialogVisible"
      width="640px"
      :close-on-click-modal="false"
    >
      <div class="import-tip-box">
        <div>请使用“下载模板”生成的Excel，字段与导出保持一致，重点包含：</div>
        <div class="import-tip-fields">客户编码、客户简称、客户全称、订单号前后缀、客户来源、销售、跟单员、状态、备注</div>
      </div>

      <el-upload
        ref="importUpload"
        class="upload-block"
        drag
        action=""
        :auto-upload="false"
        :limit="1"
        :on-change="handleFileChange"
        :on-exceed="handleExceed"
        accept=".xlsx,.xls"
      >
        <i class="el-icon-upload" />
        <div class="el-upload__text">将文件拖到此处，或<em>点击上传</em></div>
        <div slot="tip" class="el-upload__tip">仅支持 .xlsx / .xls，建议单次不超过5000行</div>
      </el-upload>

      <span slot="footer" class="dialog-footer">
        <el-button @click="importDialogVisible = false">取 消</el-button>
        <el-button type="primary" :loading="importLoading" @click="submitImport">开始导入</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import {
  getCustomerList,
  getCustomerDetail,
  addCustomer,
  updateCustomer,
  deleteCustomer,
  updateCustomerStatus,
  downloadCustomerTemplate,
  importCustomers,
  exportCustomers
} from '@/api/customer'
import { getUsersSimple } from '@/api/user'

export default {
  name: 'CustomerManagement',
  data() {
    return {
      // 搜索表单
      searchForm: {
        customerKeyword: '',
        customerType: '',
        customerLevel: '', status: ''
      },
      // 表格数据
      customers: [],
      loading: false,
      // 分页
      pagination: {
        current: 1,
        size: 10,
        total: 0
      },
      // 弹窗
      dialogVisible: false,
      detailVisible: false,
      dialogTitle: '新增客户',
      isEdit: false,
      activeTab: 'basic',
      submitLoading: false,
      // 表单数据
      formData: {
        id: null,
        customerCode: '',
        customerName: '',
        shortName: '',
        customerType: '企业客户',
        customerLevel: 'C级客户',
        industry: '',
        codePrefix: '',
        orderNoPrefix: '',
        orderNoSuffix: '',
        companyPhone: '',
        companyEmail: '',
        companyFax: '',
        website: '',
        contactAddress: '',
        receiveAddress: '',
        creditLimit: 0,
        paymentTerms: '现款现货',
        taxRate: 13,
        defaultReconciliationDay: 25,
        reconciliationBasis: 'SHIPPED',
        taxNumber: '',
        bankName: '',
        bankAccount: '',
        salesUserId: null,
        documentationPersonUserId: null,
        status: '正常',
        contacts: []
      },
      // 用户列表（销售和跟单员选择）
      users: [],
      formRules: {
        customerName: [{ required: true, message: '请输入客户名称', trigger: 'blur' }],
        codePrefix: [
          { required: true, message: '请输入编号前缀', trigger: 'blur' },
          { pattern: /^[A-Z]{2,5}$/, message: '请输入2-5个大写字母', trigger: 'blur' }
        ],
        customerType: [{ required: true, message: '请选择客户类型', trigger: 'change' }],
        customerLevel: [{ required: true, message: '请选择客户等级', trigger: 'change' }],
        salesUserId: [{ required: true, message: '请选择业务人员', trigger: 'change' }],
        documentationPersonUserId: [{ required: true, message: '请选择跟单员', trigger: 'change' }]
      },
      detailData: {
        contacts: []
      },
      detailActiveTab: 'basic',
      // 导入相关
      importDialogVisible: false,
      importLoading: false,
      importFile: null,
      tableLayoutTimer: null,
      tableLayoutRaf: null
    }
  },
  mounted() {
    this.fetchCustomers()
    this.fetchUsers()
    window.addEventListener('resize', this.handleTableLayout)
    this.handleTableLayout()
  },
  activated() {
    this.handleTableLayout()
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.handleTableLayout)
    if (this.tableLayoutTimer) {
      clearTimeout(this.tableLayoutTimer)
      this.tableLayoutTimer = null
    }
    if (this.tableLayoutRaf) {
      cancelAnimationFrame(this.tableLayoutRaf)
      this.tableLayoutRaf = null
    }
  },
  methods: {
    handleTableLayout() {
      this.$nextTick(() => {
        if (this.tableLayoutTimer) {
          clearTimeout(this.tableLayoutTimer)
        }
        this.tableLayoutTimer = setTimeout(() => {
          const table = this.$refs.customerTable
          if (table && typeof table.doLayout === 'function') {
            table.doLayout()
            this.tableLayoutRaf = requestAnimationFrame(() => {
              table.doLayout()
            })
          }
        }, 60)
      })
    },
    // 查询用户列表
    async fetchUsers() {
      try {
        const res = await getUsersSimple({ page: 1, size: 1000 })
        console.log('用户API响应:', res)
        if (res.code === 200 || res.code === 20000) {
          this.users = res.data.records || res.data.list || []
          console.log('用户列表加载成功:', this.users.length, this.users)
        } else {
          console.error('用户API返回错误:', res)
        }
      } catch (error) {
        console.error('查询用户列表失败：', error)
      }
    },
    // 查询客户列表
    async fetchCustomers() {
      this.loading = true
      try {
        const params = {
          current: this.pagination.current,
          size: this.pagination.size,
          ...this.searchForm
        }
        const res = await getCustomerList(params)
        if (res.code === 20000 || res.code === 200) {
          this.customers = res.data.records
          this.pagination.total = Number(res.data.total) || 0
        }
      } catch (error) {
        this.$message.error('查询失败：' + error.message)
      } finally {
        this.loading = false
        this.handleTableLayout()
      }
    },
    // 搜索
    handleSearch() {
      this.pagination.current = 1
      this.fetchCustomers()
    },
    // 重置
    handleReset() {
      this.searchForm = {
        customerKeyword: '',
        customerType: '',
        customerLevel: '',
        status: ''
      }
      this.handleSearch()
    },
    // 新增
    handleAdd() {
      this.isEdit = false
      this.dialogTitle = '新增客户'
      this.resetForm()
      this.dialogVisible = true
    },
    // 编辑
    async handleEdit(row) {
      this.isEdit = true
      this.dialogTitle = '编辑客户'
      this.loading = true
      try {
        const res = await getCustomerDetail(row.id)
        if (res.code === 20000 || res.code === 200) {
          this.formData = { ...res.data }
          this.formData.reconciliationBasis = this.normalizeReconciliationBasis(this.formData.reconciliationBasis)
          if (!this.formData.contacts || this.formData.contacts.length === 0) {
            this.formData.contacts = [this.createEmptyContact()]
          } else {
            this.normalizeContacts(this.formData.contacts)
          }
          this.dialogVisible = true
        }
      } catch (error) {
        this.$message.error('查询失败：' + error.message)
      } finally {
        this.loading = false
      }
    },
    // 查看
    async handleView(row) {
      this.loading = true
      try {
        const res = await getCustomerDetail(row.id)
        if (res.code === 20000 || res.code === 200) {
          this.detailData = res.data
          if (Array.isArray(this.detailData.contacts)) {
            this.normalizeContacts(this.detailData.contacts)
          }
          this.detailActiveTab = 'basic'
          this.detailVisible = true
        }
      } catch (error) {
        this.$message.error('查询失败：' + error.message)
      } finally {
        this.loading = false
      }
    },
    // 删除
    handleDelete(row) {
      this.$confirm('确定要删除该客户吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(async() => {
        try {
          const res = await deleteCustomer(row.id)
          if (res.code === 20000 || res.code === 200) {
            this.$message.success('删除成功')
            this.fetchCustomers()
          } else {
            this.$message.error(res.message)
          }
        } catch (error) {
          this.$message.error('删除失败：' + error.message)
        }
      })
    },
    // 更多操作
    handleCommand(command, row) {
      const statusMap = {
        'freeze': '冻结',
        'unfreeze': '正常',
        'blacklist': '黑名单'
      }
      const status = statusMap[command]
      this.$confirm(`确定要将该客户设置为【${status}】状态吗？`, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(async() => {
        try {
          const res = await updateCustomerStatus(row.id, status)
          if (res.code === 20000 || res.code === 200) {
            this.$message.success('操作成功')
            this.fetchCustomers()
          } else {
            this.$message.error(res.message)
          }
        } catch (error) {
          this.$message.error('操作失败：' + error.message)
        }
      })
    },
    // 提交表单
    handleSubmit() {
      this.$refs.customerForm.validate(async(valid) => {
        if (!valid) {
          return false
        }
        if (!this.formData.contacts || this.formData.contacts.length === 0) {
          this.$message.error('请至少添加一个联系人')
          this.activeTab = 'contacts'
          return false
        }
        // 检查是否有主联系人
        const hasPrimary = this.formData.contacts.some(c => c.isPrimary === 1)
        if (!hasPrimary) {
          this.$message.error('请至少设置一个主联系人')
          this.activeTab = 'contacts'
          return false
        }
        const hasReceiver = this.formData.contacts.some(c => c.isReceiver === 1)
        if (!hasReceiver) {
          this.$message.error('请至少设置一个收货人')
          this.activeTab = 'contacts'
          return false
        }
        // 验证联系人姓名和手机
        for (const contact of this.formData.contacts) {
          if (!contact.contactName) {
            this.$message.error('请填写联系人姓名')
            this.activeTab = 'contacts'
            return false
          }
          if (!contact.contactPhone) {
            this.$message.error('请填写联系人手机号')
            this.activeTab = 'contacts'
            return false
          }
        }

        this.submitLoading = true
        try {
          const res = this.isEdit
            ? await updateCustomer(this.formData.id, this.formData)
            : await addCustomer(this.formData)
          if (res.code === 20000 || res.code === 200) {
            if (!this.isEdit) {
              window.dispatchEvent(new CustomEvent('dashboard:refresh', {
                detail: { source: 'sales-customers', type: 'created' }
              }))
            }
            this.$message.success(this.isEdit ? '更新成功' : '新增成功')
            this.dialogVisible = false
            this.fetchCustomers()
          } else {
            this.$message.error(res.message)
          }
        } catch (error) {
          this.$message.error('操作失败：' + error.message)
        } finally {
          this.submitLoading = false
        }
      })
    },
    // 添加联系人
    handleAddContact() {
      this.formData.contacts.push(this.createEmptyContact())
    },
    // 删除联系人
    handleDeleteContact(index) {
      if (this.formData.contacts.length === 1) {
        this.$message.warning('至少保留一个联系人')
        return
      }
      this.formData.contacts.splice(index, 1)
      this.normalizeContacts(this.formData.contacts)
    },
    // 主联系人变更
    handlePrimaryChange(index) {
      // 确保只有一个主联系人
      this.formData.contacts.forEach((contact, i) => {
        if (i !== index) {
          contact.isPrimary = 0
        }
      })
    },
    // 创建空联系人
    createEmptyContact() {
      const isFirstContact = !this.formData.contacts || this.formData.contacts.length === 0
      return {
        contactName: '',
        contactPosition: '',
        contactPhone: '',
        contactEmail: '',
        contactWechat: '',
        isPrimary: isFirstContact ? 1 : 0,
        isDecisionMaker: 0,
        isReceiver: isFirstContact ? 1 : 0,
        sortOrder: this.formData.contacts.length + 1
      }
    },
    normalizeContacts(contacts) {
      if (!Array.isArray(contacts) || contacts.length === 0) return
      let hasPrimary = false
      let hasReceiver = false
      contacts.forEach((c, idx) => {
        c.isPrimary = Number(c.isPrimary) === 1 ? 1 : 0
        c.isDecisionMaker = Number(c.isDecisionMaker) === 1 ? 1 : 0
        c.isReceiver = Number(c.isReceiver) === 1 ? 1 : 0
        c.sortOrder = c.sortOrder || idx + 1
        if (c.isPrimary === 1) hasPrimary = true
        if (c.isReceiver === 1) hasReceiver = true
      })
      if (!hasPrimary) contacts[0].isPrimary = 1
      if (!hasReceiver) contacts[0].isReceiver = 1
    },
    normalizeReconciliationBasis(value) {
      const basis = String(value || '').trim().toUpperCase()
      return basis === 'RECEIVED' ? 'RECEIVED' : 'SHIPPED'
    },
    // 重置表单
    resetForm() {
      this.formData = {
        id: null,
        customerCode: '',
        customerName: '',
        shortName: '',
        customerType: '企业客户',
        customerLevel: 'C级客户',
        industry: '',
        codePrefix: '',
        orderNoPrefix: '',
        orderNoSuffix: '',
        companyPhone: '',
        companyEmail: '',
        companyFax: '',
        website: '',
        contactAddress: '',
        receiveAddress: '',
        creditLimit: 0,
        paymentTerms: '现款现货',
        taxRate: 13,
        defaultReconciliationDay: 25,
        reconciliationBasis: 'SHIPPED',
        taxNumber: '',
        bankName: '',
        bankAccount: '',
        salesUserId: null,
        documentationPersonUserId: null,
        status: '正常',
        contacts: [this.createEmptyContact()]
      }
      this.activeTab = 'basic'
      this.$nextTick(() => {
        if (this.$refs.customerForm) {
          this.$refs.customerForm.clearValidate()
        }
      })
    }, // 弹窗关闭
    handleDialogClose() {
      this.resetForm()
    },
    // 分页大小变更
    handleSizeChange(size) {
      this.pagination.size = size
      this.fetchCustomers()
    },
    // 当前页变更
    handleCurrentChange(current) {
      this.pagination.current = current
      this.fetchCustomers()
    },
    // 等级标签类型
    getLevelTagType(level) {
      const typeMap = {
        'A级客户': 'danger',
        'B级客户': 'warning',
        'C级客户': 'info',
        '潜在客户': ''
      }
      return typeMap[level] || ''
    }, // 状态标签类型
    getStatusTagType(status) {
      const typeMap = {
        '正常': 'success',
        '冻结': 'warning',
        '黑名单': 'danger'
      }
      return typeMap[status] || ''
    },
    // 格式化金额
    formatMoney(value) {
      if (!value && value !== 0) return '0.00'
      return Number(value).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    },
    // 格式化日期时间
    formatDateTime(value) {
      if (!value) return '-'
      const date = new Date(value)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')
      const seconds = String(date.getSeconds()).padStart(2, '0')
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
    },
    // 紧凑日期格式：26-03-12
    formatDateCompact(value) {
      if (!value) return '-'
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) {
        const text = String(value)
        const m = text.match(/(\d{4})-(\d{1,2})-(\d{1,2})/)
        if (m) {
          return `${String(m[1]).slice(-2)}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`
        }
        return text
      }
      const yy = String(date.getFullYear()).slice(-2)
      const mm = String(date.getMonth() + 1).padStart(2, '0')
      const dd = String(date.getDate()).padStart(2, '0')
      return `${yy}-${mm}-${dd}`
    },
    // 报价单状态类型
    getQuotationStatusType(status) {
      const typeMap = {
        '待审核': 'warning',
        '已审核': 'success',
        '已作废': 'info',
        '已转订单': 'primary'
      }
      return typeMap[status] || ''
    },
    // 订单状态类型
    getOrderStatusType(status) {
      const typeMap = {
        '待确认': 'warning',
        '已确认': 'primary',
        '生产中': 'success',
        '已完成': 'success',
        '已取消': 'info'
      }
      return typeMap[status] || ''
    },
    // 送样状态类型
    getSampleStatusType(status) {
      const typeMap = {
        '待发送': 'warning',
        '已发送': 'primary',
        '已签收': 'success',
        '已反馈': 'success'
      }
      return typeMap[status] || ''
    },
    // 从详情编辑
    handleEditFromDetail() {
      this.detailVisible = false
      this.handleEdit(this.detailData)
    },
    // 跳转到报价单
    goToQuotation(id) {
      this.$router.push({ path: '/sales/quotations', query: { id }})
    },
    // 跳转到订单
    goToOrder(id) {
      this.$router.push({ path: '/sales/orders', query: { id }})
    },
    // 跳转到送样单
    goToSample(id) {
      this.$router.push({ path: '/sales/samples', query: { id }})
    },

    // ============== 导入导出功能 ==============

    // 下载导入模板
    async handleDownloadTemplate() {
      try {
        const res = await downloadCustomerTemplate()
        const blob = new Blob([res], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = '客户导入模板.xlsx'
        link.click()
        window.URL.revokeObjectURL(url)
        this.$message.success('模板下载成功')
      } catch (error) {
        this.$message.error('下载失败：' + error.message)
      }
    },

    // 打开导入对话框
    handleImport() {
      this.importDialogVisible = true
      this.importFile = null
      this.$nextTick(() => {
        if (this.$refs.importUpload) {
          this.$refs.importUpload.clearFiles()
        }
      })
    },

    // 文件选择变化
    handleFileChange(file) {
      this.importFile = file.raw
    },

    // 超出文件限制
    handleExceed() {
      this.$message.warning('只能上传一个文件，请先删除已选文件')
    },

    // 提交导入
    async submitImport() {
      if (!this.importFile) {
        this.$message.warning('请选择要导入的文件')
        return
      }

      this.importLoading = true
      try {
        const res = await importCustomers(this.importFile)
        if (res.code === 20000 || res.code === 200) {
          const data = res.data
          let message = `导入完成：新增${data.insertCount || 0}个客户，更新${data.updateCount || 0}个客户`
          const errors = Array.isArray(data.errors) ? data.errors : []
          if (errors.length > 0) {
            message += `，${errors.length}条错误`
            // 显示错误详情
            this.$notify({
              title: '导入提示',
              message: errors.slice(0, 5).join('\n') + (errors.length > 5 ? '\n...' : ''),
              type: 'warning',
              duration: 10000
            })
            this.downloadImportErrors(errors)
          }
          this.$message.success(message)
          this.importDialogVisible = false
          await this.fetchCustomers()
        } else {
          this.$message.error((res && (res.msg || res.message)) || '导入失败')
        }
      } catch (error) {
        this.$message.error('导入失败：' + ((error && error.message) || '未知错误'))
      } finally {
        this.importLoading = false
      }
    },

    // 下载导入错误明细（txt）
    downloadImportErrors(errors) {
      if (!Array.isArray(errors) || errors.length === 0) return
      const now = new Date()
      const fileTime = `${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`
      const content = [`客户导入错误明细（共${errors.length}条）`, `导出时间：${now.toLocaleString()}`, '', ...errors].join('\r\n')
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `客户导入错误明细_${fileTime}.txt`
      link.click()
      window.URL.revokeObjectURL(url)
    },

    // 导出数据
    async handleExport() {
      try {
        this.$message.info('正在导出，请稍候...')
        const res = await exportCustomers()
        const blob = new Blob([res], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        const date = new Date()
        const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`
        link.download = `客户数据_${dateStr}.xlsx`
        link.click()
        window.URL.revokeObjectURL(url)
        this.$message.success('导出成功')
      } catch (error) {
        this.$message.error('导出失败：' + error.message)
      }
    }
  }
}
</script>

<style scoped>
.customer-container {
  padding: 14px;
  overflow-x: hidden;
}

.search-card,
.toolbar-card {
  margin-bottom: 20px;
}

.form-tip {
  color: #909399;
  font-size: 12px;
  margin-left: 10px;
}

.el-pagination {
  margin-top: 12px;
  text-align: right;
}

.import-tip-box {
  margin-bottom: 12px;
  padding: 10px 12px;
  border: 1px solid #e6f7ff;
  background: #f4faff;
  border-radius: 6px;
  color: #606266;
  line-height: 1.6;
  font-size: 13px;
}

.import-tip-fields {
  margin-top: 4px;
  color: #409eff;
}

.upload-block {
  width: 100%;
}

.customer-container ::v-deep .search-form .el-form-item {
  margin-bottom: 10px;
  margin-right: 10px;
}

.customer-container ::v-deep .search-form .el-input__inner,
.customer-container ::v-deep .search-form .el-select .el-input__inner {
  height: 32px;
  line-height: 32px;
}

.customer-container .customer-table ::v-deep .el-table__header th .cell,
.customer-container .customer-table ::v-deep .el-table__body td .cell {
  font-size: 13px;
  padding: 4px 6px;
  line-height: 18px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 详情页面样式 */
.detail-content {
  max-height: 70vh;
  overflow-y: auto;
}

.summary-cards {
  margin-bottom: 20px;
}

.summary-card {
  display: flex;
  align-items: center;
  padding: 10px;
}

.summary-card .el-card__body {
  display: flex;
  align-items: center;
  width: 100%;
}

.summary-icon {
  width: 50px;
  height: 50px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 15px;
}

.summary-icon i {
  font-size: 24px;
  color: #fff;
}

.summary-info {
  flex: 1;
}

.summary-value {
  font-size: 20px;
  font-weight: bold;
  color: #303133;
  line-height: 1.2;
}

.summary-label {
  font-size: 13px;
  color: #909399;
  margin-top: 5px;
}

.money {
  color: #F56C6C;
  font-weight: 500;
}

.link {
  color: #409EFF;
  text-decoration: none;
}

.link:hover {
  text-decoration: underline;
}

.text-muted {
  color: #C0C4CC;
}

/* 修复 summary-card 内部布局 */
.summary-card >>> .el-card__body {
  display: flex;
  align-items: center;
  padding: 15px;
}
</style>
