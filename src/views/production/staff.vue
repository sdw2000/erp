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
            <el-table-column prop="gender" label="性别" width="60">
              <template slot-scope="{ row }">
                <span>{{ row.gender === 'M' ? '男' : '女' }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="phone" label="联系电话" width="120" />
            <el-table-column prop="workshopName" label="所属车间" width="120" />
            <el-table-column prop="teamName" label="所属班组" width="120" />
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
    </el-tabs>

    <!-- 人员表单对话框 -->
    <el-dialog :title="staffDialogTitle" :visible.sync="staffDialogVisible" width="600px" @close="resetStaffForm">
      <el-form ref="staffForm" :model="staffForm" :rules="staffRules" label-width="100px">
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
            <el-form-item label="性别" prop="gender">
              <el-radio-group v-model="staffForm.gender">
                <el-radio label="M">男</el-radio>
                <el-radio label="F">女</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="联系电话" prop="phone">
              <el-input v-model="staffForm.phone" placeholder="请输入联系电话" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="所属车间" prop="workshopId">
              <el-select v-model="staffForm.workshopId" placeholder="请选择车间" style="width: 100%" @change="handleFormWorkshopChange">
                <el-option v-for="item in workshopList" :key="item.id" :label="item.workshopName" :value="item.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="所属班组" prop="teamId">
              <el-select v-model="staffForm.teamId" placeholder="请选择班组" style="width: 100%">
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
          <el-col :span="12">
            <el-form-item label="入职日期" prop="entryDate">
              <el-date-picker v-model="staffForm.entryDate" type="date" placeholder="选择日期" value-format="yyyy-MM-dd" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
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
        <el-form-item label="备注">
          <el-input v-model="staffForm.remark" type="textarea" :rows="2" placeholder="请输入备注" />
        </el-form-item>
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
        <el-descriptions-item label="性别">{{ staffDetail.gender === 'M' ? '男' : '女' }}</el-descriptions-item>
        <el-descriptions-item label="联系电话">{{ staffDetail.phone }}</el-descriptions-item>
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
    <el-dialog :title="'组员列表 - ' + currentTeam.teamName" :visible.sync="memberDialogVisible" width="700px">
      <el-table :data="teamMembers" border size="small">
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
      </el-table>
    </el-dialog>
  </div>
</template>

<script>
import {
  getStaffList, getStaffDetail, addStaff, updateStaff, deleteStaff, batchDeleteStaff,
  getStaffSkills, saveStaffSkills, getAllActiveStaff,
  getTeamList, getTeamDetail, addTeam, updateTeam, deleteTeam, getAllShifts
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
        teamId: null,
        workshopId: null,
        status: '',
        page: 1,
        size: 10
      },
      staffDialogVisible: false,
      staffDialogTitle: '',
      staffSubmitting: false,
      staffForm: {
        staffCode: '',
        staffName: '',
        gender: 'M',
        phone: '',
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
        gender: [{ required: true, message: '请选择性别', trigger: 'change' }],
        workshopId: [{ required: true, message: '请选择车间', trigger: 'change' }]
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
      currentTeam: {},
      teamMembers: [],

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
  },
  methods: {
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
      this.allTeamList = res.data?.list || []
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
        this.formTeamList = []
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
      this.staffForm = {
        staffCode: '',
        staffName: '',
        gender: 'M',
        phone: '',
        workshopId: null,
        teamId: null,
        skillLevel: 'junior',
        entryDate: '',
        status: 'active',
        remark: ''
      }
      this.formTeamList = []
      this.staffDialogVisible = true
    },

    async openEditStaffDialog(row) {
      this.staffDialogTitle = '编辑人员'
      const res = await getStaffDetail(row.id)
      const data = res.data
      this.staffForm = {
        id: data.id,
        staffCode: data.staffCode,
        staffName: data.staffName,
        gender: data.gender,
        phone: data.phone,
        workshopId: data.workshopId,
        teamId: data.teamId,
        skillLevel: data.skillLevel,
        entryDate: data.entryDate,
        status: data.status,
        remark: data.remark
      }
      if (data.workshopId) {
        this.formTeamList = this.allTeamList.filter(t => t.workshopId === data.workshopId)
      }
      this.staffDialogVisible = true
    },

    async submitStaffForm() {
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
        } catch (error) {
          this.$message.error(error.message || '操作失败')
        } finally {
          this.staffSubmitting = false
        }
      })
    },

    resetStaffForm() {
      this.$refs.staffForm?.resetFields()
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
      const res = await getTeamDetail(row.id)
      this.teamMembers = res.data?.members || []
      this.memberDialogVisible = true
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
        const header = ['工号', '姓名', '性别(M/F)', '联系电话', '车间ID', '班组ID', '技能等级(junior/middle/senior)', '入职日期', '备注']
        const data = [['STF001', '张三', 'M', '13800138000', '1', '1', 'middle', '2024-01-01', '']]
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

      // Commented out to avoid "importStaff not defined" until import is fixed
      this.$message.warning('导入功能暂不可用')
      /*
      try {
        const res = await importStaff(formData)
        if (res && res.code === 200) {
          this.$message.success(`导入成功：${res.data?.successCount || 0}条，失败：${res.data?.failCount || 0}条`)
          this.loadStaffList()
        } else {
          this.$message.error(res.message || '导入失败')
        }
      } catch (e) {
        this.$message.error('导入失败')
      } finally {
        this.$refs.staffFileInput.value = ''
      }
      */
    },
    handleExportStaff() {
      import('@/vendor/Export2Excel').then(excel => {
        const header = ['工号', '姓名', '性别', '联系电话', '所属车间', '所属班组', '技能等级', '入职日期', '状态']
        const data = this.staffList.map(item => [
          item.staffCode,
          item.staffName,
          item.gender === 'M' ? '男' : '女',
          item.phone,
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
