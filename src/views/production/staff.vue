<template>
  <div class="app-container">
    <!-- 标签页切换 -->
    <el-tabs v-model="activeTab" @tab-click="handleTabChange">      <!-- 人员管理标签 -->
      <el-tab-pane label="人员管理" name="staff">
        <el-card shadow="never">
          <div slot="header" class="clearfix">
            <span>人员列表</span>            <div style="float: right">
              <el-button v-if="$canImportExport()" type="success" icon="el-icon-download" size="small" @click="handleDownloadStaffTemplate">下载模板</el-button>
              <el-button v-if="$canImportExport()" type="warning" icon="el-icon-upload2" size="small" @click="handleImportStaff">导入</el-button>
              <el-button v-if="$canImportExport()" type="info" icon="el-icon-download" size="small" @click="handleExportStaff">导出</el-button>
              <el-button type="primary" icon="el-icon-plus" size="small" @click="openAddStaffDialog">新增人员</el-button>
            </div>
          </div>

          <!-- 搜索区域 -->
          <el-form :inline="true" :model="staffQuery" class="search-form">
            <el-form-item label="工号">
              <el-input v-model="staffQuery.staffCode" placeholder="请输入工号" clearable style="width: 140px" />
            </el-form-item>
            <el-form-item label="姓名">
              <el-input v-model="staffQuery.staffName" placeholder="请输入姓名" clearable style="width: 140px" />
            </el-form-item>
            <el-form-item label="部门">
              <el-input v-model="staffQuery.department" placeholder="请输入部门" clearable style="width: 140px" />
            </el-form-item>
            <el-form-item label="岗位">
              <el-input v-model="staffQuery.positionName" placeholder="请输入岗位" clearable style="width: 140px" />
            </el-form-item>
            <el-form-item label="车间">
              <el-select v-model="staffQuery.workshopId" placeholder="全部车间" clearable style="width: 140px" @change="handleWorkshopChange">
                <el-option v-for="item in workshopList" :key="item.id" :label="item.workshopName" :value="item.id" />
              </el-select>
            </el-form-item>
            <el-form-item label="班组">
              <el-select v-model="staffQuery.teamId" placeholder="全部班组" clearable style="width: 140px">
                <el-option v-for="item in filteredTeamList" :key="item.id" :label="item.teamName" :value="item.id" />
              </el-select>
            </el-form-item>
            <el-form-item label="状态">
              <el-select v-model="staffQuery.status" placeholder="全部状态" clearable style="width: 100px">
                <el-option label="在职" value="active" />
                <el-option label="休假" value="leave" />
                <el-option label="离职" value="resigned" />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" icon="el-icon-search" @click="loadStaffList">搜 索</el-button>
              <el-button icon="el-icon-refresh-left" @click="resetStaffQuery">重 置</el-button>
            </el-form-item>
          </el-form>

          <!-- 隐藏的文件上传 -->
          <input ref="staffFileInput" type="file" accept=".xlsx,.xls" style="display:none" @change="onStaffFileChange">

          <!-- 人员表格 -->
          <el-table v-loading="staffLoading" :data="staffList" border stripe style="margin-top: 15px" @selection-change="handleStaffSelectionChange">
            <el-table-column type="selection" width="50" />
            <el-table-column type="index" label="序号" width="60" align="center" />
            <el-table-column prop="staffCode" label="工号" width="100" />
            <el-table-column prop="staffName" label="姓名" width="100" />
            <el-table-column prop="department" label="部门" width="100" />
            <el-table-column prop="positionName" label="岗位" width="100" />
            <el-table-column prop="gender" label="性别" width="60">
              <template slot-scope="{ row }">
                <span>{{ row.gender === 'M' ? '男' : '女' }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="education" label="学历" width="90" />
            <el-table-column prop="age" label="年龄" width="70" />
            <el-table-column prop="phone" label="联系电话" width="120" />
            <el-table-column prop="workshopName" label="所属车间" width="120" />
            <el-table-column prop="teamName" label="所属班组" width="120" />
            <el-table-column prop="idCardNo" label="身份证号" width="180" show-overflow-tooltip />
            <el-table-column prop="skillLevel" label="技能等级" width="100">
              <template slot-scope="{ row }">
                <el-tag :type="getSkillLevelType(row.skillLevel)">{{ getSkillLevelText(row.skillLevel) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="entryDate" label="入职日期" width="110" />
            <el-table-column prop="status" label="状态" width="80">
              <template slot-scope="{ row }">
                <el-tag :type="getStatusType(row.status)">{{ getStatusText(row.status) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="220" fixed="right">
              <template slot-scope="{ row }">
                <el-button type="text" size="small" @click="openEditStaffDialog(row)">编辑</el-button>
                <el-button type="text" size="small" @click="openSkillDialog(row)">技能</el-button>
                <el-button type="text" size="small" style="color: #E6A23C" @click="viewStaffDetail(row)">详情</el-button>
                <el-button type="text" size="small" style="color: #F56C6C" @click="handleDeleteStaff(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>

          <!-- 分页 -->
          <el-pagination
            style="margin-top: 15px; text-align: right"
            :current-page="staffQuery.page"
            :page-sizes="[10, 20, 50, 100]"
            :page-size="staffQuery.size"
            :total="staffTotal"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleStaffSizeChange"
            @current-change="handleStaffPageChange"
          />
        </el-card>
      </el-tab-pane>

      <!-- 班组管理标签 -->
      <el-tab-pane label="班组管理" name="team">
        <!-- 搜索区域 -->
        <el-card class="search-card" shadow="never">
          <el-form :inline="true" :model="teamQuery" class="search-form">
            <el-form-item label="班组编号">
              <el-input v-model="teamQuery.teamCode" placeholder="请输入班组编号" clearable style="width: 150px" />
            </el-form-item>
            <el-form-item label="班组名称">
              <el-input v-model="teamQuery.teamName" placeholder="请输入班组名称" clearable style="width: 150px" />
            </el-form-item>
            <el-form-item label="车间">
              <el-select v-model="teamQuery.workshopId" placeholder="全部车间" clearable style="width: 150px">
                <el-option v-for="item in workshopList" :key="item.id" :label="item.workshopName" :value="item.id" />
              </el-select>
            </el-form-item>
            <el-form-item label="状态">
              <el-select v-model="teamQuery.status" placeholder="全部状态" clearable style="width: 100px">
                <el-option label="启用" :value="1" />
                <el-option label="停用" :value="0" />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" icon="el-icon-search" @click="loadTeamList">查询</el-button>
              <el-button icon="el-icon-refresh" @click="resetTeamQuery">重置</el-button>
            </el-form-item>
          </el-form>
        </el-card>

        <!-- 操作按钮 -->
        <el-card shadow="never" style="margin-top: 10px">
          <div class="table-toolbar">
            <el-button type="primary" icon="el-icon-plus" @click="openAddTeamDialog">新增班组</el-button>
          </div>

          <!-- 班组表格 -->
          <el-table v-loading="teamLoading" :data="teamList" border stripe>
            <el-table-column prop="teamCode" label="班组编号" width="120" />
            <el-table-column prop="teamName" label="班组名称" width="150" />
            <el-table-column prop="workshopName" label="所属车间" width="120" />
            <el-table-column prop="leaderName" label="班组长" width="100" />
            <el-table-column prop="shiftName" label="默认班次" width="100" />
            <el-table-column prop="memberCount" label="组员数" width="80">
              <template slot-scope="{ row }">
                <el-tag>{{ row.memberCount || 0 }} 人</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="80">
              <template slot-scope="{ row }">
                <el-tag :type="row.status === 1 ? 'success' : 'info'">{{ row.status === 1 ? '启用' : '停用' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="remark" label="备注" show-overflow-tooltip />
            <el-table-column label="操作" width="180" fixed="right">
              <template slot-scope="{ row }">
                <el-button type="text" size="small" @click="openEditTeamDialog(row)">编辑</el-button>
                <el-button type="text" size="small" style="color: #E6A23C" @click="viewTeamMembers(row)">组员</el-button>
                <el-button type="text" size="small" style="color: #F56C6C" @click="handleDeleteTeam(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>

          <!-- 分页 -->
          <el-pagination
            style="margin-top: 15px; text-align: right"
            :current-page="teamQuery.page"
            :page-sizes="[10, 20, 50, 100]"
            :page-size="teamQuery.size"
            :total="teamTotal"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleTeamSizeChange"
            @current-change="handleTeamPageChange"
          />
        </el-card>
      </el-tab-pane>

      <!-- 请假管理标签 -->
      <el-tab-pane label="请假管理" name="leave">
        <el-card shadow="never">
          <el-form :inline="true" :model="leaveQuery" class="search-form">
            <el-form-item label="人员">
              <el-select v-model="leaveQuery.staffId" placeholder="全部人员" clearable filterable style="width: 180px">
                <el-option v-for="item in activeStaffList" :key="item.id" :label="item.staffName + '(' + item.staffCode + ')'" :value="item.id" />
              </el-select>
            </el-form-item>
            <el-form-item label="状态">
              <el-select v-model="leaveQuery.status" placeholder="全部状态" clearable style="width: 130px">
                <el-option label="待审批" value="pending" />
                <el-option label="已通过" value="approved" />
                <el-option label="已驳回" value="rejected" />
              </el-select>
            </el-form-item>
            <el-form-item label="日期范围">
              <el-date-picker
                v-model="leaveQuery.dateRange"
                type="daterange"
                range-separator="至"
                start-placeholder="开始日期"
                end-placeholder="结束日期"
                value-format="yyyy-MM-dd"
                style="width: 260px"
              />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" icon="el-icon-search" @click="searchLeave">查询</el-button>
              <el-button type="primary" icon="el-icon-plus" @click="openAddLeaveDialog">新增请假</el-button>
              <el-button icon="el-icon-refresh-left" @click="resetLeaveQuery">重置</el-button>
            </el-form-item>
          </el-form>

          <el-table :data="getFilteredLeaveList()" border stripe style="margin-top: 10px">
            <el-table-column type="index" label="序号" width="60" align="center" />
            <el-table-column prop="staffCode" label="工号" width="100" />
            <el-table-column prop="staffName" label="姓名" width="100" />
            <el-table-column prop="leaveType" label="请假类型" width="110">
              <template slot-scope="{ row }">{{ leaveTypeText(row.leaveType) }}</template>
            </el-table-column>
            <el-table-column prop="startDate" label="开始日期" width="120" />
            <el-table-column prop="endDate" label="结束日期" width="120" />
            <el-table-column prop="days" label="天数" width="80" align="right" />
            <el-table-column prop="reason" label="请假原因" min-width="180" show-overflow-tooltip />
            <el-table-column prop="status" label="状态" width="100">
              <template slot-scope="{ row }">
                <el-tag :type="leaveStatusType(row.status)">{{ leaveStatusText(row.status) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="260" fixed="right">
              <template slot-scope="{ row }">
                <el-button type="text" size="small" @click="openEditLeaveDialog(row)">编辑</el-button>
                <el-button type="text" size="small" style="color:#67C23A" @click="approveLeave(row, 'approved')">通过</el-button>
                <el-button type="text" size="small" style="color:#E6A23C" @click="approveLeave(row, 'rejected')">驳回</el-button>
                <el-button type="text" size="small" style="color:#F56C6C" @click="deleteLeave(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>

      <!-- 加班管理标签 -->
      <el-tab-pane label="加班管理" name="overtime">
        <el-card shadow="never">
          <el-form :inline="true" :model="overtimeQuery" class="search-form">
            <el-form-item label="人员">
              <el-select v-model="overtimeQuery.staffId" placeholder="全部人员" clearable filterable style="width: 180px">
                <el-option v-for="item in activeStaffList" :key="item.id" :label="item.staffName + '(' + item.staffCode + ')'" :value="item.id" />
              </el-select>
            </el-form-item>
            <el-form-item label="状态">
              <el-select v-model="overtimeQuery.status" placeholder="全部状态" clearable style="width: 130px">
                <el-option label="待审批" value="pending" />
                <el-option label="已通过" value="approved" />
                <el-option label="已驳回" value="rejected" />
              </el-select>
            </el-form-item>
            <el-form-item label="日期范围">
              <el-date-picker
                v-model="overtimeQuery.dateRange"
                type="daterange"
                range-separator="至"
                start-placeholder="开始日期"
                end-placeholder="结束日期"
                value-format="yyyy-MM-dd"
                style="width: 260px"
              />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" icon="el-icon-search" @click="searchOvertime">查询</el-button>
              <el-button type="primary" icon="el-icon-plus" @click="openAddOvertimeDialog">新增加班</el-button>
              <el-button icon="el-icon-refresh-left" @click="resetOvertimeQuery">重置</el-button>
            </el-form-item>
          </el-form>

          <el-table :data="getFilteredOvertimeList()" border stripe style="margin-top: 10px">
            <el-table-column type="index" label="序号" width="60" align="center" />
            <el-table-column prop="staffCode" label="工号" width="100" />
            <el-table-column prop="staffName" label="姓名" width="100" />
            <el-table-column prop="overtimeDate" label="加班日期" width="120" />
            <el-table-column prop="startTime" label="开始时间" width="120" />
            <el-table-column prop="endTime" label="结束时间" width="120" />
            <el-table-column prop="hours" label="时长(小时)" width="100" align="right" />
            <el-table-column prop="reason" label="加班原因" min-width="180" show-overflow-tooltip />
            <el-table-column prop="status" label="状态" width="100">
              <template slot-scope="{ row }">
                <el-tag :type="overtimeStatusType(row.status)">{{ overtimeStatusText(row.status) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="260" fixed="right">
              <template slot-scope="{ row }">
                <el-button type="text" size="small" @click="openEditOvertimeDialog(row)">编辑</el-button>
                <el-button type="text" size="small" style="color:#67C23A" @click="approveOvertime(row, 'approved')">通过</el-button>
                <el-button type="text" size="small" style="color:#E6A23C" @click="approveOvertime(row, 'rejected')">驳回</el-button>
                <el-button type="text" size="small" style="color:#F56C6C" @click="deleteOvertime(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>
    </el-tabs>

    <!-- 人员表单对话框 -->
    <el-dialog :title="staffDialogTitle" :visible.sync="staffDialogVisible" width="600px" @close="resetStaffForm">
      <el-form ref="staffForm" :model="staffForm" :rules="staffRules" label-width="100px">
        <el-tabs v-model="staffFormActiveSection" type="card">
          <el-tab-pane label="基础信息" name="base">
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="工号" prop="staffCode">
                  <el-input v-model="staffForm.staffCode" placeholder="请输入工号" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="姓名" prop="staffName">
                  <el-input v-model="staffForm.staffName" placeholder="请输入姓名" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="部门" prop="department">
                  <el-input v-model="staffForm.department" placeholder="例如：生产部" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="岗位" prop="positionName">
                  <el-input v-model="staffForm.positionName" placeholder="例如：生产员工" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="性别" prop="gender">
                  <el-input :value="formatGenderLabel(staffForm.gender)" disabled placeholder="根据身份证自动识别" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="学历">
                  <el-input v-model="staffForm.education" placeholder="例如：高中/大专" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="年龄">
                  <el-input :value="staffForm.age != null ? String(staffForm.age) : ''" disabled placeholder="根据身份证自动计算" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="籍贯">
                  <el-input v-model="staffForm.nativePlace" placeholder="例如：广东广州" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="入职日期" prop="entryDate">
                  <el-date-picker v-model="staffForm.entryDate" type="date" placeholder="选择日期" value-format="yyyy-MM-dd" style="width: 100%" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="状态" prop="status">
                  <el-select v-model="staffForm.status" placeholder="请选择状态" style="width: 100%">
                    <el-option label="在职" value="active" />
                    <el-option label="休假" value="leave" />
                    <el-option label="离职" value="resigned" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="所属车间" prop="workshopId">
                  <el-select v-model="staffForm.workshopId" placeholder="请选择车间（非必选）" clearable style="width: 100%" @change="handleFormWorkshopChange">
                    <el-option v-for="item in workshopList" :key="item.id" :label="item.workshopName" :value="item.id" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="所属班组" prop="teamId">
                  <el-select v-model="staffForm.teamId" placeholder="请选择班组（非必选）" clearable style="width: 100%" @change="handleFormTeamChange">
                    <el-option v-for="item in formTeamList" :key="item.id" :label="item.teamName" :value="item.id" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="技能等级" prop="skillLevel">
                  <el-select v-model="staffForm.skillLevel" placeholder="请选择技能等级" style="width: 100%">
                    <el-option label="初级" value="junior" />
                    <el-option label="中级" value="middle" />
                    <el-option label="高级" value="senior" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
          </el-tab-pane>

          <el-tab-pane label="联系与户籍" name="contact">
            <el-form-item label="联系电话" prop="phone">
              <el-input v-model="staffForm.phone" placeholder="请输入联系电话" />
            </el-form-item>
            <el-form-item label="身份证号">
              <el-input v-model="staffForm.idCardNo" placeholder="请输入身份证号码" @input="handleIdCardNoChange" @blur="onStaffIdCardBlur" />
            </el-form-item>
            <el-form-item label="户口所在地">
              <el-input v-model="staffForm.householdAddress" type="textarea" :rows="2" placeholder="请输入户口所在地" />
            </el-form-item>
            <el-form-item label="现居住址">
              <el-input v-model="staffForm.currentAddress" type="textarea" :rows="2" placeholder="请输入现居住址" />
            </el-form-item>
          </el-tab-pane>

          <el-tab-pane label="紧急与体检" name="health">
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="紧急联系人">
                  <el-input v-model="staffForm.emergencyContact" placeholder="请输入紧急联系人" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="联系人关系">
                  <el-input v-model="staffForm.emergencyRelation" placeholder="例如：父母/配偶" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="签约日期">
                  <el-date-picker v-model="staffForm.contractSignDate" type="date" placeholder="选择日期" value-format="yyyy-MM-dd" style="width: 100%" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="体检日期">
                  <el-date-picker v-model="staffForm.medicalExamDate" type="date" placeholder="选择日期" value-format="yyyy-MM-dd" style="width: 100%" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-form-item label="体检情况">
              <el-input v-model="staffForm.medicalExamResult" placeholder="例如：合格" />
            </el-form-item>
            <el-form-item label="备注">
              <el-input v-model="staffForm.remark" type="textarea" :rows="2" placeholder="请输入备注" />
            </el-form-item>
          </el-tab-pane>
        </el-tabs>
      </el-form>
      <div slot="footer">
        <el-button @click="staffDialogVisible = false">取 消</el-button>
        <el-button type="primary" :loading="staffSubmitting" @click="submitStaffForm">确 定</el-button>
      </div>
    </el-dialog>

    <!-- 技能管理对话框 -->
    <el-dialog :title="'技能管理 - ' + currentStaff.staffName" :visible.sync="skillDialogVisible" width="700px">
      <div style="margin-bottom: 10px">
        <el-button type="primary" size="small" icon="el-icon-plus" @click="addSkillRow">添加技能</el-button>
      </div>
      <el-table :data="skillList" border size="small">
        <el-table-column label="设备类型" width="150">
          <template slot-scope="{ row }">
            <el-select v-model="row.equipmentType" placeholder="选择设备类型" size="small" style="width: 100%">
              <el-option v-for="item in equipmentTypeList" :key="item.typeCode" :label="item.typeName" :value="item.typeCode" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="熟练度" width="120">
          <template slot-scope="{ row }">
            <el-select v-model="row.proficiency" placeholder="选择熟练度" size="small" style="width: 100%">
              <el-option label="一般" value="normal" />
              <el-option label="熟练" value="skilled" />
              <el-option label="精通" value="expert" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="最多操作机器数" width="130">
          <template slot-scope="{ row }">
            <el-input-number v-model="row.maxMachines" :min="1" :max="5" size="small" style="width: 100%" />
          </template>
        </el-table-column>
        <el-table-column label="资格证书">
          <template slot-scope="{ row }">
            <el-input v-model="row.certificate" placeholder="资格证书" size="small" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="60">
          <template slot-scope="{ $index }">
            <el-button type="text" size="small" style="color: #F56C6C" @click="removeSkillRow($index)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div slot="footer">
        <el-button @click="skillDialogVisible = false">取 消</el-button>
        <el-button type="primary" :loading="skillSubmitting" @click="saveSkills">保 存</el-button>
      </div>
    </el-dialog>

    <!-- 人员详情对话框 -->
    <el-dialog title="人员详情" :visible.sync="staffDetailVisible" width="600px">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="工号">{{ staffDetail.staffCode }}</el-descriptions-item>
        <el-descriptions-item label="姓名">{{ staffDetail.staffName }}</el-descriptions-item>
        <el-descriptions-item label="部门">{{ staffDetail.department || '-' }}</el-descriptions-item>
        <el-descriptions-item label="岗位">{{ staffDetail.positionName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="性别">{{ staffDetail.gender === 'M' ? '男' : '女' }}</el-descriptions-item>
        <el-descriptions-item label="学历">{{ staffDetail.education || '-' }}</el-descriptions-item>
        <el-descriptions-item label="年龄">{{ staffDetail.age || '-' }}</el-descriptions-item>
        <el-descriptions-item label="籍贯">{{ staffDetail.nativePlace || '-' }}</el-descriptions-item>
        <el-descriptions-item label="联系电话">{{ staffDetail.phone }}</el-descriptions-item>
        <el-descriptions-item label="身份证号">{{ staffDetail.idCardNo || '-' }}</el-descriptions-item>
        <el-descriptions-item label="户口所在地">{{ staffDetail.householdAddress || '-' }}</el-descriptions-item>
        <el-descriptions-item label="现居住址">{{ staffDetail.currentAddress || '-' }}</el-descriptions-item>
        <el-descriptions-item label="紧急联系人">{{ staffDetail.emergencyContact || '-' }}</el-descriptions-item>
        <el-descriptions-item label="联系人关系">{{ staffDetail.emergencyRelation || '-' }}</el-descriptions-item>
        <el-descriptions-item label="签约日期">{{ staffDetail.contractSignDate || '-' }}</el-descriptions-item>
        <el-descriptions-item label="体检日期">{{ staffDetail.medicalExamDate || '-' }}</el-descriptions-item>
        <el-descriptions-item label="体检情况">{{ staffDetail.medicalExamResult || '-' }}</el-descriptions-item>
        <el-descriptions-item label="所属车间">{{ staffDetail.workshopName }}</el-descriptions-item>
        <el-descriptions-item label="所属班组">{{ staffDetail.teamName }}</el-descriptions-item>
        <el-descriptions-item label="技能等级">{{ getSkillLevelText(staffDetail.skillLevel) }}</el-descriptions-item>
        <el-descriptions-item label="入职日期">{{ staffDetail.entryDate }}</el-descriptions-item>
        <el-descriptions-item label="状态">{{ getStatusText(staffDetail.status) }}</el-descriptions-item>
        <el-descriptions-item label="备注">{{ staffDetail.remark }}</el-descriptions-item>
      </el-descriptions>
      <div v-if="staffDetail.skills && staffDetail.skills.length > 0" style="margin-top: 20px">
        <h4>技能列表</h4>
        <el-table :data="staffDetail.skills" border size="small">
          <el-table-column prop="equipmentTypeName" label="设备类型" />
          <el-table-column prop="proficiency" label="熟练度">
            <template slot-scope="{ row }">{{ getProficiencyText(row.proficiency) }}</template>
          </el-table-column>
          <el-table-column prop="maxMachines" label="最多操作机器数" />
          <el-table-column prop="certificate" label="资格证书" />
        </el-table>
      </div>
    </el-dialog>

    <!-- 班组表单对话框 -->
    <el-dialog :title="teamDialogTitle" :visible.sync="teamDialogVisible" width="500px" @close="resetTeamForm">
      <el-form ref="teamForm" :model="teamForm" :rules="teamRules" label-width="100px">
        <el-form-item label="班组编号" prop="teamCode">
          <el-input v-model="teamForm.teamCode" placeholder="请输入班组编号" />
        </el-form-item>
        <el-form-item label="班组名称" prop="teamName">
          <el-input v-model="teamForm.teamName" placeholder="请输入班组名称" />
        </el-form-item>
        <el-form-item label="所属车间" prop="workshopId">
          <el-select v-model="teamForm.workshopId" placeholder="请选择车间" style="width: 100%">
            <el-option v-for="item in workshopList" :key="item.id" :label="item.workshopName" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="班组长">
          <el-select v-model="teamForm.leaderId" placeholder="请选择班组长" clearable style="width: 100%">
            <el-option v-for="item in activeStaffList" :key="item.id" :label="item.staffName + '(' + item.staffCode + ')'" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="默认班次" prop="shiftCode">
          <el-select v-model="teamForm.shiftCode" placeholder="请选择班次" style="width: 100%">
            <el-option v-for="item in shiftList" :key="item.shiftCode" :label="item.shiftName" :value="item.shiftCode" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="teamForm.status">
            <el-radio :label="1">启用</el-radio>
            <el-radio :label="0">停用</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="teamForm.remark" type="textarea" :rows="2" placeholder="请输入备注" />
        </el-form-item>
      </el-form>
      <div slot="footer">
        <el-button @click="teamDialogVisible = false">取 消</el-button>
        <el-button type="primary" :loading="teamSubmitting" @click="submitTeamForm">确 定</el-button>
      </div>
    </el-dialog>

    <!-- 组员列表对话框 -->
    <el-dialog :title="'组员列表 - ' + currentTeam.teamName" :visible.sync="memberDialogVisible" width="860px">
      <el-form :inline="true" :model="memberQuery" class="search-form" style="margin-bottom: 10px;">
        <el-form-item>
          <el-input v-model="memberQuery.keyword" clearable placeholder="姓名/工号" style="width: 220px" />
        </el-form-item>
        <el-form-item>
          <el-button icon="el-icon-refresh" @click="refreshTeamMembers">刷新</el-button>
          <el-button type="primary" icon="el-icon-plus" @click="openAddMemberDialog">新增组员</el-button>
        </el-form-item>
      </el-form>

      <el-table v-loading="memberLoading" :data="getFilteredTeamMembers()" border size="small">
        <el-table-column prop="staffCode" label="工号" width="100" />
        <el-table-column prop="staffName" label="姓名" width="100" />
        <el-table-column prop="gender" label="性别" width="60">
          <template slot-scope="{ row }">{{ row.gender === 'M' ? '男' : '女' }}</template>
        </el-table-column>
        <el-table-column prop="phone" label="联系电话" width="120" />
        <el-table-column prop="skillLevel" label="技能等级" width="100">
          <template slot-scope="{ row }">
            <el-tag :type="getSkillLevelType(row.skillLevel)" size="small">{{ getSkillLevelText(row.skillLevel) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="80">
          <template slot-scope="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">{{ getStatusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="140" align="center">
          <template slot-scope="{ row }">
            <el-button type="text" size="small" @click="editTeamMember(row)">编辑</el-button>
            <el-button type="text" size="small" style="color: #F56C6C" @click="removeTeamMember(row)">移出</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>

    <!-- 新增组员对话框 -->
    <el-dialog title="新增组员" :visible.sync="memberAddDialogVisible" width="520px" @close="resetMemberAddForm">
      <el-form ref="memberAddForm" :model="memberAddForm" label-width="90px">
        <el-form-item label="人员" prop="staffId">
          <el-select v-model="memberAddForm.staffId" filterable placeholder="请选择人员" style="width: 100%">
            <el-option
              v-for="item in getAssignableStaffList()"
              :key="item.id"
              :label="item.staffName + '(' + item.staffCode + ')' + (item.teamName ? ' - 当前班组:' + item.teamName : '')"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <div slot="footer">
        <el-button @click="memberAddDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="memberSubmitting" @click="submitAddMember">确定</el-button>
      </div>
    </el-dialog>

    <!-- 请假申请对话框 -->
    <el-dialog :title="leaveDialogTitle" :visible.sync="leaveDialogVisible" width="560px" @close="resetLeaveForm">
      <el-form ref="leaveForm" :model="leaveForm" :rules="leaveRules" label-width="100px">
        <el-form-item label="人员" prop="staffId">
          <el-select v-model="leaveForm.staffId" placeholder="请选择人员" filterable style="width: 100%" @change="onLeaveStaffChange">
            <el-option v-for="item in activeStaffList" :key="item.id" :label="item.staffName + '(' + item.staffCode + ')'" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="请假类型" prop="leaveType">
          <el-select v-model="leaveForm.leaveType" placeholder="请选择请假类型" style="width: 100%">
            <el-option label="事假" value="personal" />
            <el-option label="病假" value="sick" />
            <el-option label="年假" value="annual" />
            <el-option label="调休" value="adjust" />
          </el-select>
        </el-form-item>
        <el-form-item label="请假日期" prop="dateRange">
          <el-date-picker
            v-model="leaveForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="yyyy-MM-dd"
            style="width: 100%"
            @change="calcLeaveDays"
          />
        </el-form-item>
        <el-form-item label="请假天数" prop="days">
          <el-input-number v-model="leaveForm.days" :min="0.5" :step="0.5" :precision="1" style="width: 100%" />
        </el-form-item>
        <el-form-item label="请假原因" prop="reason">
          <el-input v-model="leaveForm.reason" type="textarea" :rows="3" placeholder="请输入请假原因" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="leaveForm.remark" placeholder="选填" />
        </el-form-item>
      </el-form>
      <div slot="footer">
        <el-button @click="leaveDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="leaveSubmitting" @click="submitLeaveForm">确定</el-button>
      </div>
    </el-dialog>

    <!-- 加班申请对话框 -->
    <el-dialog :title="overtimeDialogTitle" :visible.sync="overtimeDialogVisible" width="560px" @close="resetOvertimeForm">
      <el-form ref="overtimeForm" :model="overtimeForm" :rules="overtimeRules" label-width="100px">
        <el-form-item label="人员" prop="staffId">
          <el-select v-model="overtimeForm.staffId" placeholder="请选择人员" filterable style="width: 100%" @change="onOvertimeStaffChange">
            <el-option v-for="item in activeStaffList" :key="item.id" :label="item.staffName + '(' + item.staffCode + ')'" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="加班日期" prop="overtimeDate">
          <el-date-picker v-model="overtimeForm.overtimeDate" type="date" value-format="yyyy-MM-dd" placeholder="请选择日期" style="width: 100%" />
        </el-form-item>
        <el-form-item label="开始时间" prop="startTime">
          <el-time-picker v-model="overtimeForm.startTime" value-format="HH:mm" format="HH:mm" placeholder="请选择开始时间" style="width: 100%" />
        </el-form-item>
        <el-form-item label="结束时间" prop="endTime">
          <el-time-picker v-model="overtimeForm.endTime" value-format="HH:mm" format="HH:mm" placeholder="请选择结束时间" style="width: 100%" @change="calcOvertimeHours" />
        </el-form-item>
        <el-form-item label="加班时长" prop="hours">
          <el-input-number v-model="overtimeForm.hours" :min="0.5" :step="0.5" :precision="1" style="width: 100%" />
        </el-form-item>
        <el-form-item label="加班原因" prop="reason">
          <el-input v-model="overtimeForm.reason" type="textarea" :rows="3" placeholder="请输入加班原因" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="overtimeForm.remark" placeholder="选填" />
        </el-form-item>
      </el-form>
      <div slot="footer">
        <el-button @click="overtimeDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="overtimeSubmitting" @click="submitOvertimeForm">确定</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import {
  getStaffList, getStaffDetail, addStaff, updateStaff, deleteStaff, batchDeleteStaff, importStaff,
  getStaffSkills, saveStaffSkills, getAllActiveStaff,
  getTeamList, getTeamDetail, addTeam, updateTeam, deleteTeam, getAllShifts,
  getLeaveList, addLeave, updateLeave, approveLeave as approveLeaveApi, deleteLeave as deleteLeaveApi,
  getOvertimeList, addOvertime, updateOvertime, approveOvertime as approveOvertimeApi, deleteOvertime as deleteOvertimeApi
} from '@/api/staff'
import { getWorkshopList, getEquipmentTypeList } from '@/api/equipment'

export default {
  name: 'ProductionStaff',
  data() {
    return {
      activeTab: 'staff',

      // 人员相关
      staffLoading: false,
      staffList: [],
      staffTotal: 0,
      staffSelection: [],
      staffQuery: {
        staffCode: '',
        staffName: '',
        department: '',
        positionName: '',
        teamId: null,
        workshopId: null,
        status: '',
        page: 1,
        size: 10
      },
      staffFormActiveSection: 'base',
      staffDialogVisible: false,
      staffDialogTitle: '',
      staffSubmitting: false,
      staffForm: {
        staffCode: '',
        staffName: '',
        department: '',
        positionName: '',
        gender: 'M',
        education: '',
        age: null,
        nativePlace: '',
        phone: '',
        idCardNo: '',
        householdAddress: '',
        currentAddress: '',
        emergencyContact: '',
        emergencyRelation: '',
        contractSignDate: '',
        medicalExamDate: '',
        medicalExamResult: '',
        workshopId: null,
        teamId: null,
        skillLevel: 'junior',
        entryDate: '',
        status: 'active',
        remark: ''
      },
      staffRules: {
        staffCode: [{ required: true, message: '请输入工号', trigger: 'blur' }],
        staffName: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
        department: [{ required: true, message: '请输入部门', trigger: 'blur' }],
        positionName: [{ required: true, message: '请输入岗位', trigger: 'blur' }]
      },
      staffDetailVisible: false,
      staffDetail: {},

      // 技能相关
      skillDialogVisible: false,
      skillSubmitting: false,
      skillList: [],
      currentStaff: {},

      // 班组相关
      teamLoading: false,
      teamList: [],
      teamTotal: 0,
      teamQuery: {
        teamCode: '',
        teamName: '',
        workshopId: null,
        status: null,
        page: 1,
        size: 10
      },
      teamDialogVisible: false,
      teamDialogTitle: '',
      teamSubmitting: false,
      teamForm: {
        teamCode: '',
        teamName: '',
        workshopId: null,
        leaderId: null,
        shiftCode: '',
        status: 1,
        remark: ''
      },
      teamRules: {
        teamCode: [{ required: true, message: '请输入班组编号', trigger: 'blur' }],
        teamName: [{ required: true, message: '请输入班组名称', trigger: 'blur' }],
        workshopId: [{ required: true, message: '请选择车间', trigger: 'change' }],
        shiftCode: [{ required: true, message: '请选择班次', trigger: 'change' }]
      },
      memberDialogVisible: false,
      memberLoading: false,
      memberQuery: {
        keyword: ''
      },
      memberAddDialogVisible: false,
      memberSubmitting: false,
      memberAddForm: {
        staffId: null
      },
      currentTeam: {},
      teamMembers: [],

      // 请假管理
      leaveQuery: {
        staffId: null,
        status: '',
        dateRange: []
      },
      leaveList: [],
      leaveDialogVisible: false,
      leaveDialogTitle: '新增请假',
      leaveSubmitting: false,
      leaveForm: {
        id: null,
        staffId: null,
        staffCode: '',
        staffName: '',
        leaveType: 'personal',
        dateRange: [],
        startDate: '',
        endDate: '',
        days: 1,
        reason: '',
        status: 'pending',
        remark: ''
      },
      leaveRules: {
        staffId: [{ required: true, message: '请选择人员', trigger: 'change' }],
        leaveType: [{ required: true, message: '请选择请假类型', trigger: 'change' }],
        dateRange: [{ required: true, message: '请选择请假日期', trigger: 'change' }],
        days: [{ required: true, message: '请填写请假天数', trigger: 'blur' }],
        reason: [{ required: true, message: '请填写请假原因', trigger: 'blur' }]
      },

      // 加班管理
      overtimeQuery: {
        staffId: null,
        status: '',
        dateRange: []
      },
      overtimeList: [],
      overtimeDialogVisible: false,
      overtimeDialogTitle: '新增加班',
      overtimeSubmitting: false,
      overtimeForm: {
        id: null,
        staffId: null,
        staffCode: '',
        staffName: '',
        overtimeDate: '',
        startTime: '',
        endTime: '',
        hours: 1,
        reason: '',
        status: 'pending',
        remark: ''
      },
      overtimeRules: {
        staffId: [{ required: true, message: '请选择人员', trigger: 'change' }],
        overtimeDate: [{ required: true, message: '请选择加班日期', trigger: 'change' }],
        startTime: [{ required: true, message: '请选择开始时间', trigger: 'change' }],
        endTime: [{ required: true, message: '请选择结束时间', trigger: 'change' }],
        hours: [{ required: true, message: '请填写加班时长', trigger: 'blur' }],
        reason: [{ required: true, message: '请填写加班原因', trigger: 'blur' }]
      },

      // 基础数据
      workshopList: [],
      allTeamList: [],
      filteredTeamList: [],
      formTeamList: [],
      equipmentTypeList: [],
      shiftList: [],
      activeStaffList: []
    }
  },
  created() {
    this.loadBaseData()
    this.loadStaffList()
    this.loadLeaveData()
    this.loadOvertimeData()
    this.syncTabByRoute()
  },
  watch: {
    '$route.name'() {
      this.syncTabByRoute()
    }
  },
  methods: {
    syncTabByRoute() {
      const routeName = String((this.$route && this.$route.name) || '')
      if (routeName === 'AdministrationLeaveManagement') {
        this.activeTab = 'leave'
        return
      }
      if (routeName === 'AdministrationOvertimeManagement') {
        this.activeTab = 'overtime'
        return
      }
      if (routeName === 'AdministrationPersonnel' || routeName === 'StaffManagement') {
        this.activeTab = 'staff'
      }
    },

    // 加载基础数据
    async loadBaseData() {
      try {
        const [workshopRes, typeRes, shiftRes] = await Promise.all([
          getWorkshopList({ status: 1, page: 1, size: 100 }),
          getEquipmentTypeList({ status: 1, page: 1, size: 100 }),
          getAllShifts()
        ])

        // Load teams separately since we need the result directly
        await this.loadAllTeams()
        await this.loadActiveStaff()

        // 适配 MyBatis-Plus IPage 分页结构 (records)
        this.workshopList = workshopRes.data?.records || workshopRes.data?.list || []
        this.equipmentTypeList = typeRes.data?.records || typeRes.data?.list || []
        this.shiftList = shiftRes.data || []
      } catch (error) {
        console.error('加载基础数据失败', error)
      }
    },

    async loadAllTeams() {
      const res = await getTeamList({ page: 1, size: 200 })
      this.allTeamList = res.data?.records || res.data?.list || []
      this.filteredTeamList = this.allTeamList
      return res
    },

    async loadActiveStaff() {
      const res = await getAllActiveStaff()
      this.activeStaffList = res.data || []
    },

    handleTabChange(tab) {
      if (tab.name === 'staff') {
        this.loadStaffList()
      } else if (tab.name === 'team') {
        this.loadTeamList()
        this.loadActiveStaff()
      } else if (tab.name === 'leave' || tab.name === 'overtime') {
        this.loadActiveStaff()
        if (tab.name === 'leave') {
          this.loadLeaveData()
        } else {
          this.loadOvertimeData()
        }
      }
    },

    // ==================== 人员管理 ====================

    async loadStaffList() {
      this.staffLoading = true
      try {
        const res = await getStaffList(this.staffQuery)
        this.staffList = res.data?.list || []
        // 确保total字段为数字类型
        this.staffTotal = Number(res.data?.total) || 0
        this.staffQuery.page = Number(res.data?.page) || this.staffQuery.page
        this.staffQuery.size = Number(res.data?.size) || this.staffQuery.size
      } catch (error) {
        this.$message.error('加载人员列表失败')
      } finally {
        this.staffLoading = false
      }
    },

    resetStaffQuery() {
      this.staffQuery = {
        staffCode: '',
        staffName: '',
        department: '',
        positionName: '',
        teamId: null,
        workshopId: null,
        status: '',
        page: 1,
        size: 10
      }
      this.filteredTeamList = this.allTeamList
      this.loadStaffList()
    },

    handleWorkshopChange(workshopId) {
      this.staffQuery.teamId = null
      if (workshopId) {
        this.filteredTeamList = this.allTeamList.filter(t => t.workshopId === workshopId)
      } else {
        this.filteredTeamList = this.allTeamList
      }
    },

    handleFormWorkshopChange(workshopId) {
      this.staffForm.teamId = null
      if (workshopId) {
        this.formTeamList = this.allTeamList.filter(t => t.workshopId === workshopId)
      } else {
        this.formTeamList = this.allTeamList
      }
    },

    handleFormTeamChange(teamId) {
      if (!teamId) {
        return
      }
      const selectedTeam = this.allTeamList.find(t => String(t.id) === String(teamId))
      if (selectedTeam && !this.staffForm.workshopId) {
        this.staffForm.workshopId = selectedTeam.workshopId || null
      }
    },

    handleStaffSelectionChange(selection) {
      this.staffSelection = selection
    },

    handleStaffSizeChange(size) {
      this.staffQuery.size = size
      this.loadStaffList()
    },

    handleStaffPageChange(page) {
      this.staffQuery.page = page
      this.loadStaffList()
    },

    openAddStaffDialog() {
      this.staffDialogTitle = '新增人员'
      this.staffFormActiveSection = 'base'
      this.staffForm = {
        staffCode: '',
        staffName: '',
        department: '',
        positionName: '',
        gender: 'M',
        education: '',
        age: null,
        nativePlace: '',
        phone: '',
        idCardNo: '',
        householdAddress: '',
        currentAddress: '',
        emergencyContact: '',
        emergencyRelation: '',
        contractSignDate: '',
        medicalExamDate: '',
        medicalExamResult: '',
        workshopId: null,
        teamId: null,
        skillLevel: 'junior',
        entryDate: '',
        status: 'active',
        remark: ''
      }
      this.applyGenderAgeFromIdCard(false)
      this.formTeamList = this.allTeamList
      this.staffDialogVisible = true
    },

    async openEditStaffDialog(row) {
      this.staffDialogTitle = '编辑人员'
      this.staffFormActiveSection = 'base'
      const res = await getStaffDetail(row.id)
      const data = res.data
      this.staffForm = {
        id: data.id,
        staffCode: data.staffCode,
        staffName: data.staffName,
        department: data.department,
        positionName: data.positionName,
        gender: data.gender,
        education: data.education,
        age: data.age,
        nativePlace: data.nativePlace,
        phone: data.phone,
        idCardNo: data.idCardNo,
        householdAddress: data.householdAddress,
        currentAddress: data.currentAddress,
        emergencyContact: data.emergencyContact,
        emergencyRelation: data.emergencyRelation,
        contractSignDate: data.contractSignDate,
        medicalExamDate: data.medicalExamDate,
        medicalExamResult: data.medicalExamResult,
        workshopId: data.workshopId,
        teamId: data.teamId,
        skillLevel: data.skillLevel,
        entryDate: data.entryDate,
        status: data.status,
        remark: data.remark
      }
      this.applyGenderAgeFromIdCard(false)
      if (data.workshopId) {
        this.formTeamList = this.allTeamList.filter(t => t.workshopId === data.workshopId)
      } else {
        this.formTeamList = this.allTeamList
      }
      this.staffDialogVisible = true
    },

    async submitStaffForm() {
      this.applyGenderAgeFromIdCard(true)
      this.$refs.staffForm.validate(async valid => {
        if (!valid) return
        this.staffSubmitting = true
        try {
          if (this.staffForm.id) {
            await updateStaff(this.staffForm.id, this.staffForm)
            this.$message.success('更新成功')
          } else {
            await addStaff(this.staffForm)
            this.$message.success('新增成功')
          }
          this.staffDialogVisible = false
          this.loadStaffList()
          this.loadAllTeams()
          if (this.memberDialogVisible && this.currentTeam && this.currentTeam.id) {
            this.viewTeamMembers(this.currentTeam)
          }
        } catch (error) {
          this.$message.error(error.message || '操作失败')
        } finally {
          this.staffSubmitting = false
        }
      })
    },

    resetStaffForm() {
      this.staffFormActiveSection = 'base'
      this.$refs.staffForm?.resetFields()
    },

    formatGenderLabel(gender) {
      if (gender === 'M') return '男'
      if (gender === 'F') return '女'
      return ''
    },

    handleIdCardNoChange(value) {
      this.staffForm.idCardNo = String(value || '').toUpperCase().trim()
      this.applyGenderAgeFromIdCard(false)
    },

    onStaffIdCardBlur() {
      this.applyGenderAgeFromIdCard(true)
    },

    deriveGenderAgeByIdCard(idCardNo) {
      const normalized = String(idCardNo || '').toUpperCase().trim()
      if (!normalized) return null
      if (!/^\d{17}[0-9X]$/.test(normalized)) return null

      const year = Number(normalized.slice(6, 10))
      const month = Number(normalized.slice(10, 12))
      const day = Number(normalized.slice(12, 14))
      const birthDate = new Date(year, month - 1, day)
      if (
        Number.isNaN(birthDate.getTime()) ||
        birthDate.getFullYear() !== year ||
        birthDate.getMonth() !== month - 1 ||
        birthDate.getDate() !== day
      ) {
        return null
      }

      const genderBit = Number(normalized.charAt(16))
      if (Number.isNaN(genderBit)) return null
      const gender = genderBit % 2 === 1 ? 'M' : 'F'

      const now = new Date()
      let age = now.getFullYear() - year
      const currentMonth = now.getMonth() + 1
      const currentDay = now.getDate()
      if (currentMonth < month || (currentMonth === month && currentDay < day)) {
        age -= 1
      }
      age = Math.max(0, Math.floor(age))

      return { gender, age }
    },

    applyGenderAgeFromIdCard(showWarn) {
      const derived = this.deriveGenderAgeByIdCard(this.staffForm.idCardNo)
      if (!derived) {
        if (showWarn && this.staffForm.idCardNo) {
          this.$message.warning('身份证格式不正确，无法自动计算性别和年龄')
        }
        if (!this.staffForm.idCardNo) {
          this.staffForm.age = null
        }
        return
      }
      this.staffForm.gender = derived.gender
      this.staffForm.age = derived.age
    },

    handleDeleteStaff(row) {
      this.$confirm(`确定删除人员"${row.staffName}"吗？`, '提示', {
        type: 'warning'
      }).then(async() => {
        await deleteStaff(row.id)
        this.$message.success('删除成功')
        this.loadStaffList()
      }).catch(() => {})
    },

    handleBatchDeleteStaff() {
      this.$confirm(`确定删除选中的${this.staffSelection.length}名人员吗？`, '提示', {
        type: 'warning'
      }).then(async() => {
        const ids = this.staffSelection.map(item => item.id)
        await batchDeleteStaff(ids)
        this.$message.success('批量删除成功')
        this.loadStaffList()
      }).catch(() => {})
    },

    async viewStaffDetail(row) {
      const res = await getStaffDetail(row.id)
      this.staffDetail = res.data || {}
      this.staffDetailVisible = true
    },

    // ==================== 技能管理 ====================

    async openSkillDialog(row) {
      this.currentStaff = row
      const res = await getStaffSkills(row.id)
      this.skillList = res.data || []
      if (this.skillList.length === 0) {
        this.addSkillRow()
      }
      this.skillDialogVisible = true
    },

    addSkillRow() {
      this.skillList.push({
        equipmentType: '',
        proficiency: 'normal',
        maxMachines: 1,
        certificate: ''
      })
    },

    removeSkillRow(index) {
      this.skillList.splice(index, 1)
    },

    async saveSkills() {
      // 过滤空行
      const skills = this.skillList.filter(s => s.equipmentType)

      // 检查重复
      const types = skills.map(s => s.equipmentType)
      if (new Set(types).size !== types.length) {
        this.$message.error('存在重复的设备类型，请检查')
        return
      }

      this.skillSubmitting = true
      try {
        await saveStaffSkills(this.currentStaff.id, skills)
        this.$message.success('技能保存成功')
        this.skillDialogVisible = false
      } catch (error) {
        this.$message.error('保存失败')
      } finally {
        this.skillSubmitting = false
      }
    },

    // ==================== 班组管理 ====================

    async loadTeamList() {
      this.teamLoading = true
      try {
        const res = await getTeamList(this.teamQuery)
        this.teamList = res.data?.list || []
        // 确保total字段为数字类型
        this.teamTotal = Number(res.data?.total) || 0
        this.teamQuery.page = Number(res.data?.page) || this.teamQuery.page
        this.teamQuery.size = Number(res.data?.size) || this.teamQuery.size
      } catch (error) {
        this.$message.error('加载班组列表失败')
      } finally {
        this.teamLoading = false
      }
    },

    resetTeamQuery() {
      this.teamQuery = {
        teamCode: '',
        teamName: '',
        workshopId: null,
        status: null,
        page: 1,
        size: 10
      }
      this.loadTeamList()
    },

    handleTeamSizeChange(size) {
      this.teamQuery.size = size
      this.loadTeamList()
    },

    handleTeamPageChange(page) {
      this.teamQuery.page = page
      this.loadTeamList()
    },

    openAddTeamDialog() {
      this.teamDialogTitle = '新增班组'
      this.teamForm = {
        teamCode: '',
        teamName: '',
        workshopId: null,
        leaderId: null,
        shiftCode: '',
        status: 1,
        remark: ''
      }
      this.teamDialogVisible = true
    },

    async openEditTeamDialog(row) {
      this.teamDialogTitle = '编辑班组'
      const res = await getTeamDetail(row.id)
      const data = res.data
      this.teamForm = {
        id: data.id,
        teamCode: data.teamCode,
        teamName: data.teamName,
        workshopId: data.workshopId,
        leaderId: data.leaderId,
        shiftCode: data.shiftCode,
        status: data.status,
        remark: data.remark
      }
      this.teamDialogVisible = true
    },

    async submitTeamForm() {
      this.$refs.teamForm.validate(async valid => {
        if (!valid) return
        this.teamSubmitting = true
        try {
          if (this.teamForm.id) {
            await updateTeam(this.teamForm.id, this.teamForm)
            this.$message.success('更新成功')
          } else {
            await addTeam(this.teamForm)
            this.$message.success('新增成功')
          }
          this.teamDialogVisible = false
          this.loadTeamList()
          this.loadAllTeams()
        } catch (error) {
          this.$message.error(error.message || '操作失败')
        } finally {
          this.teamSubmitting = false
        }
      })
    },

    resetTeamForm() {
      this.$refs.teamForm?.resetFields()
    },

    handleDeleteTeam(row) {
      this.$confirm(`确定删除班组"${row.teamName}"吗？`, '提示', {
        type: 'warning'
      }).then(async() => {
        await deleteTeam(row.id)
        this.$message.success('删除成功')
        this.loadTeamList()
        this.loadAllTeams()
      }).catch(() => {})
    },

    async viewTeamMembers(row) {
      this.currentTeam = row
      this.memberQuery.keyword = ''
      this.memberLoading = true
      try {
        const res = await getTeamDetail(row.id)
        this.teamMembers = res.data?.members || []
      } finally {
        this.memberLoading = false
      }
      this.memberDialogVisible = true
    },

    async refreshTeamMembers() {
      if (!this.currentTeam || !this.currentTeam.id) return
      await this.viewTeamMembers(this.currentTeam)
    },

    getFilteredTeamMembers() {
      const keyword = String(this.memberQuery.keyword || '').trim().toLowerCase()
      if (!keyword) return this.teamMembers || []
      return (this.teamMembers || []).filter(item => {
        const code = String(item.staffCode || '').toLowerCase()
        const name = String(item.staffName || '').toLowerCase()
        return code.includes(keyword) || name.includes(keyword)
      })
    },

    openAddMemberDialog() {
      this.memberAddForm.staffId = null
      this.memberAddDialogVisible = true
    },

    resetMemberAddForm() {
      this.memberAddForm.staffId = null
    },

    getAssignableStaffList() {
      const existingIds = new Set((this.teamMembers || []).map(x => Number(x.id || x.staffId)).filter(x => x))
      return (this.activeStaffList || []).filter(item => !existingIds.has(Number(item.id)))
    },

    async submitAddMember() {
      if (!this.memberAddForm.staffId) {
        this.$message.warning('请选择人员')
        return
      }
      if (!this.currentTeam || !this.currentTeam.id) {
        this.$message.warning('当前班组无效')
        return
      }

      this.memberSubmitting = true
      try {
        const detailRes = await getStaffDetail(this.memberAddForm.staffId)
        const staff = detailRes.data || {}
        const payload = {
          ...staff,
          workshopId: staff.workshopId || this.currentTeam.workshopId || null,
          teamId: this.currentTeam.id
        }
        await updateStaff(staff.id, payload)
        this.$message.success('新增组员成功')
        this.memberAddDialogVisible = false
        await this.viewTeamMembers(this.currentTeam)
        this.loadTeamList()
        this.loadStaffList()
      } catch (error) {
        this.$message.error(error.message || '新增组员失败')
      } finally {
        this.memberSubmitting = false
      }
    },

    editTeamMember(row) {
      const staffId = row.id || row.staffId
      if (!staffId) {
        this.$message.warning('未找到人员ID')
        return
      }
      this.openEditStaffDialog({ id: staffId })
    },

    removeTeamMember(row) {
      const staffId = row.id || row.staffId
      if (!staffId) {
        this.$message.warning('未找到人员ID')
        return
      }
      this.$confirm(`确定将"${row.staffName}"移出当前班组吗？`, '提示', { type: 'warning' }).then(async() => {
        const detailRes = await getStaffDetail(staffId)
        const staff = detailRes.data || {}
        const payload = {
          ...staff,
          teamId: null
        }
        await updateStaff(staff.id, payload)
        this.$message.success('已移出班组')
        await this.viewTeamMembers(this.currentTeam)
        this.loadTeamList()
        this.loadStaffList()
      }).catch(() => {})
    },

    // ==================== 请假管理 ====================
    async loadLeaveData() {
      const [startDate, endDate] = Array.isArray(this.leaveQuery.dateRange) ? this.leaveQuery.dateRange : []
      const params = {
        staffId: this.leaveQuery.staffId || undefined,
        status: this.leaveQuery.status || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined
      }
      const res = await getLeaveList(params)
      this.leaveList = res.data || []
    },
    leaveTypeText(type) {
      const map = {
        personal: '事假',
        sick: '病假',
        annual: '年假',
        adjust: '调休'
      }
      return map[type] || (type || '-')
    },
    leaveStatusType(status) {
      const map = {
        pending: 'warning',
        approved: 'success',
        rejected: 'danger'
      }
      return map[String(status || '').toLowerCase()] || 'info'
    },
    leaveStatusText(status) {
      const map = {
        pending: '待审批',
        approved: '已通过',
        rejected: '已驳回'
      }
      const key = String(status || '').toLowerCase()
      return map[key] || (status || '-')
    },
    resetLeaveQuery() {
      this.leaveQuery = {
        staffId: null,
        status: '',
        dateRange: []
      }
      this.loadLeaveData()
    },
    searchLeave() {
      this.loadLeaveData()
    },
    getFilteredLeaveList() {
      const { staffId, status, dateRange } = this.leaveQuery || {}
      const [start, end] = Array.isArray(dateRange) ? dateRange : []
      return (this.leaveList || []).filter(item => {
        if (staffId && String(item.staffId) !== String(staffId)) return false
        if (status && String(item.status) !== String(status)) return false
        if (start && end) {
          const s = String(item.startDate || '')
          const e = String(item.endDate || '')
          if (e < start || s > end) return false
        }
        return true
      }).sort((a, b) => String(b.startDate || '').localeCompare(String(a.startDate || '')))
    },
    defaultLeaveForm() {
      return {
        id: null,
        staffId: null,
        staffCode: '',
        staffName: '',
        leaveType: 'personal',
        dateRange: [],
        startDate: '',
        endDate: '',
        days: 1,
        reason: '',
        status: 'pending',
        remark: ''
      }
    },
    openAddLeaveDialog() {
      this.leaveDialogTitle = '新增请假'
      this.leaveForm = this.defaultLeaveForm()
      this.leaveDialogVisible = true
    },
    openEditLeaveDialog(row) {
      this.leaveDialogTitle = '编辑请假'
      this.leaveForm = {
        ...this.defaultLeaveForm(),
        ...row,
        dateRange: row && row.startDate && row.endDate ? [row.startDate, row.endDate] : []
      }
      this.leaveDialogVisible = true
    },
    onLeaveStaffChange(staffId) {
      const s = (this.activeStaffList || []).find(item => String(item.id) === String(staffId))
      this.leaveForm.staffCode = s ? (s.staffCode || '') : ''
      this.leaveForm.staffName = s ? (s.staffName || '') : ''
    },
    calcLeaveDays() {
      const range = this.leaveForm.dateRange || []
      if (!Array.isArray(range) || range.length !== 2) return
      const start = new Date(range[0])
      const end = new Date(range[1])
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return
      const days = Math.floor((end.getTime() - start.getTime()) / (24 * 3600 * 1000)) + 1
      this.leaveForm.days = Number(days.toFixed(1))
    },
    submitLeaveForm() {
      this.$refs.leaveForm.validate(valid => {
        if (!valid) return
        this.leaveSubmitting = true
        Promise.resolve().then(async() => {
          const [startDate, endDate] = this.leaveForm.dateRange || []
          const payload = {
            ...this.leaveForm,
            startDate,
            endDate
          }
          if (!payload.id) {
            await addLeave(payload)
          } else {
            await updateLeave(payload.id, payload)
          }
          await this.loadLeaveData()
          this.leaveDialogVisible = false
          this.$message.success('请假记录保存成功')
        }).catch((error) => {
          this.$message.error(error.message || '请假记录保存失败')
        }).finally(() => {
          this.leaveSubmitting = false
        })
      })
    },
    resetLeaveForm() {
      this.leaveForm = this.defaultLeaveForm()
      this.$refs.leaveForm && this.$refs.leaveForm.clearValidate()
    },
    async approveLeave(row, status) {
      await approveLeaveApi(row.id, status)
      await this.loadLeaveData()
      this.$message.success(status === 'approved' ? '已审批通过' : '已驳回')
    },
    deleteLeave(row) {
      this.$confirm(`确定删除请假记录：${row.staffName}-${row.startDate}~${row.endDate} 吗？`, '提示', {
        type: 'warning'
      }).then(async() => {
        await deleteLeaveApi(row.id)
        await this.loadLeaveData()
        this.$message.success('删除成功')
      }).catch(() => {})
    },

    // ==================== 加班管理 ====================
    async loadOvertimeData() {
      const [startDate, endDate] = Array.isArray(this.overtimeQuery.dateRange) ? this.overtimeQuery.dateRange : []
      const params = {
        staffId: this.overtimeQuery.staffId || undefined,
        status: this.overtimeQuery.status || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined
      }
      const res = await getOvertimeList(params)
      this.overtimeList = res.data || []
    },
    overtimeStatusType(status) {
      const map = {
        pending: 'warning',
        approved: 'success',
        rejected: 'danger'
      }
      return map[String(status || '').toLowerCase()] || 'info'
    },
    overtimeStatusText(status) {
      const map = {
        pending: '待审批',
        approved: '已通过',
        rejected: '已驳回'
      }
      const key = String(status || '').toLowerCase()
      return map[key] || (status || '-')
    },
    resetOvertimeQuery() {
      this.overtimeQuery = {
        staffId: null,
        status: '',
        dateRange: []
      }
      this.loadOvertimeData()
    },
    searchOvertime() {
      this.loadOvertimeData()
    },
    getFilteredOvertimeList() {
      const { staffId, status, dateRange } = this.overtimeQuery || {}
      const [start, end] = Array.isArray(dateRange) ? dateRange : []
      return (this.overtimeList || []).filter(item => {
        if (staffId && String(item.staffId) !== String(staffId)) return false
        if (status && String(item.status) !== String(status)) return false
        if (start && end) {
          const d = String(item.overtimeDate || '')
          if (d < start || d > end) return false
        }
        return true
      }).sort((a, b) => String(b.overtimeDate || '').localeCompare(String(a.overtimeDate || '')))
    },
    defaultOvertimeForm() {
      return {
        id: null,
        staffId: null,
        staffCode: '',
        staffName: '',
        overtimeDate: '',
        startTime: '',
        endTime: '',
        hours: 1,
        reason: '',
        status: 'pending',
        remark: ''
      }
    },
    openAddOvertimeDialog() {
      this.overtimeDialogTitle = '新增加班'
      this.overtimeForm = this.defaultOvertimeForm()
      this.overtimeDialogVisible = true
    },
    openEditOvertimeDialog(row) {
      this.overtimeDialogTitle = '编辑加班'
      this.overtimeForm = {
        ...this.defaultOvertimeForm(),
        ...row
      }
      this.overtimeDialogVisible = true
    },
    onOvertimeStaffChange(staffId) {
      const s = (this.activeStaffList || []).find(item => String(item.id) === String(staffId))
      this.overtimeForm.staffCode = s ? (s.staffCode || '') : ''
      this.overtimeForm.staffName = s ? (s.staffName || '') : ''
    },
    calcOvertimeHours() {
      const start = this.overtimeForm.startTime
      const end = this.overtimeForm.endTime
      if (!start || !end) return
      const [sh, sm] = String(start).split(':').map(v => Number(v || 0))
      const [eh, em] = String(end).split(':').map(v => Number(v || 0))
      const begin = sh * 60 + sm
      const finish = eh * 60 + em
      if (finish <= begin) return
      const hours = (finish - begin) / 60
      this.overtimeForm.hours = Number(Math.max(0.5, hours).toFixed(1))
    },
    submitOvertimeForm() {
      this.$refs.overtimeForm.validate(valid => {
        if (!valid) return
        this.overtimeSubmitting = true
        Promise.resolve().then(async() => {
          const payload = {
            ...this.overtimeForm
          }
          if (!payload.id) {
            await addOvertime(payload)
          } else {
            await updateOvertime(payload.id, payload)
          }
          await this.loadOvertimeData()
          this.overtimeDialogVisible = false
          this.$message.success('加班记录保存成功')
        }).catch((error) => {
          this.$message.error(error.message || '加班记录保存失败')
        }).finally(() => {
          this.overtimeSubmitting = false
        })
      })
    },
    resetOvertimeForm() {
      this.overtimeForm = this.defaultOvertimeForm()
      this.$refs.overtimeForm && this.$refs.overtimeForm.clearValidate()
    },
    async approveOvertime(row, status) {
      await approveOvertimeApi(row.id, status)
      await this.loadOvertimeData()
      this.$message.success(status === 'approved' ? '已审批通过' : '已驳回')
    },
    deleteOvertime(row) {
      this.$confirm(`确定删除加班记录：${row.staffName}-${row.overtimeDate} 吗？`, '提示', {
        type: 'warning'
      }).then(async() => {
        await deleteOvertimeApi(row.id)
        await this.loadOvertimeData()
        this.$message.success('删除成功')
      }).catch(() => {})
    },

    // ==================== 工具方法 ====================

    getSkillLevelType(level) {
      const map = { junior: 'info', middle: '', senior: 'success' }
      return map[level] || 'info'
    },

    getSkillLevelText(level) {
      const map = { junior: '初级', middle: '中级', senior: '高级' }
      return map[level] || level
    },

    getStatusType(status) {
      const map = { active: 'success', leave: 'warning', resigned: 'info' }
      return map[status] || 'info'
    },

    getStatusText(status) {
      const map = { active: '在职', leave: '休假', resigned: '离职' }
      return map[status] || status
    }, getProficiencyText(proficiency) {
      const map = { normal: '一般', skilled: '熟练', expert: '精通' }
      return map[proficiency] || proficiency
    },

    // ==================== 人员导入导出 ====================
    handleDownloadStaffTemplate() {
      import('@/vendor/Export2Excel').then(excel => {
        const header = ['工号', '姓名', '部门', '岗位', '学历', '籍贯', '联系电话', '身份证号码', '户口所在地', '现居住址', '紧急联系人', '紧急联系人关系', '签约日期', '体检日期', '体检情况', '班组ID', '车间ID', '技能等级(junior/middle/senior)', '入职日期', '状态(active/leave/resigned)', '备注']
        const data = [['STF001', '张三', '生产部', '生产员工', '高中', '广东广州', '13800138000', '440101199001011234', '广东省广州市', '广东省广州市天河区XX路', '李四', '配偶', '2026-01-01', '2026-01-03', '合格', '1', '1', 'middle', '2024-01-01', 'active', '']]
        excel.export_json_to_excel({
          header,
          data,
          filename: '人员导入模板'
        })
      })
    },
    handleImportStaff() {
      this.$refs.staffFileInput.click()
    },
    async onStaffFileChange(e) {
      const file = e.target.files[0]
      if (!file) return

      const formData = new FormData()
      formData.append('file', file)

      try {
        const res = await importStaff(formData)
        if (res && (res.code === 200 || res.code === 20000)) {
          this.$message.success(`导入成功：${res.data?.successCount || 0}条，失败：${res.data?.failCount || 0}条`)
          this.loadStaffList()
          this.loadAllTeams()
        } else {
          this.$message.error((res && (res.message || res.msg)) || '导入失败')
        }
      } catch (e) {
        this.$message.error((e && e.message) || '导入失败')
      } finally {
        this.$refs.staffFileInput.value = ''
      }
    },
    handleExportStaff() {
      import('@/vendor/Export2Excel').then(excel => {
        const header = ['工号', '姓名', '性别', '部门', '岗位', '学历', '年龄', '籍贯', '联系电话', '身份证号', '户口所在地', '现居住址', '紧急联系人', '联系人关系', '签约日期', '体检日期', '体检情况', '所属车间', '所属班组', '技能等级', '入职日期', '状态']
        const data = this.staffList.map(item => [
          item.staffCode,
          item.staffName,
          item.gender === 'M' ? '男' : '女',
          item.department,
          item.positionName,
          item.education,
          item.age,
          item.nativePlace,
          item.phone,
          item.idCardNo,
          item.householdAddress,
          item.currentAddress,
          item.emergencyContact,
          item.emergencyRelation,
          item.contractSignDate,
          item.medicalExamDate,
          item.medicalExamResult,
          item.workshopName,
          item.teamName,
          this.getSkillLevelText(item.skillLevel),
          item.entryDate,
          this.getStatusText(item.status)
        ])
        excel.export_json_to_excel({
          header,
          data,
          filename: `人员数据_${new Date().toLocaleDateString().replace(/\//g, '-')}`
        })
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.search-card {
  margin-bottom: 10px;
}
.search-form {
  .el-form-item {
    margin-bottom: 0;
  }
}
.table-toolbar {
  margin-bottom: 10px;
}
</style>
