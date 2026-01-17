<template>
  <div class="permission-container">
    <el-card>
      <div slot="header" class="clearfix">
        <span>权限管理</span>
      </div>

      <el-tabs v-model="activeTab" @tab-click="handleTabClick">
        <!-- 用户管理Tab -->
        <el-tab-pane label="用户管理" name="users">
          <div class="tab-header">
            <el-form :inline="true" :model="userSearch" class="search-form">
              <el-form-item label="用户名">
                <el-input v-model="userSearch.username" placeholder="请输入用户名" clearable style="width: 160px" />
              </el-form-item>
              <el-form-item>
                <el-button type="primary" icon="el-icon-search" @click="fetchUsers">搜 索</el-button>
                <el-button icon="el-icon-refresh-left" @click="resetUserSearch">重 置</el-button>
              </el-form-item>
            </el-form>            <div class="button-group">
              <el-button type="info" icon="el-icon-document" size="small" @click="downloadUserTemplate">下载模板</el-button>
              <el-button type="warning" icon="el-icon-upload2" size="small" @click="$refs.userFileInput.click()">导入</el-button>
              <el-button type="success" icon="el-icon-download" size="small" @click="exportUsers">导出</el-button>
              <el-button type="primary" icon="el-icon-plus" size="small" @click="openAddUser">新增用户</el-button>
              <input ref="userFileInput" type="file" accept=".xlsx,.xls" style="display: none" @change="handleUserImport">
            </div>
          </div>

          <el-table v-loading="userLoading" :data="users" stripe border style="width: 100%; margin-top: 15px">
            <el-table-column type="index" label="序号" width="60" align="center" />
            <el-table-column prop="username" label="用户名" width="120" />
            <el-table-column prop="realName" label="真实姓名" width="120" />
            <el-table-column label="角色" width="200">
              <template slot-scope="scope">
                <el-tag v-for="role in scope.row.roleNames" :key="role" size="small" style="margin-right: 4px">
                  {{ role }}
                </el-tag>
                <span v-if="!scope.row.roleNames || scope.row.roleNames.length === 0" style="color: #999">未分配</span>
              </template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="80" align="center">
              <template slot-scope="scope">
                <el-tag :type="scope.row.status === '0' ? 'success' : 'info'" size="small">
                  {{ scope.row.status === '0' ? '正常' : '停用' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="createdAt" label="创建时间" width="160" />
            <el-table-column label="操作" width="280" align="center" fixed="right">
              <template slot-scope="scope">
                <el-button size="mini" type="primary" @click="openEditUser(scope.row)">编辑</el-button>
                <el-button size="mini" type="warning" @click="openAssignRole(scope.row)">分配角色</el-button>
                <el-button size="mini" type="danger" @click="confirmDeleteUser(scope.row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>

          <div style="margin-top: 20px; text-align: right;">
            <el-pagination
              :current-page="userPagination.page"
              :page-size="userPagination.size"
              :page-sizes="[10, 20, 50]"
              :total="userPagination.total"
              layout="total, sizes, prev, pager, next, jumper"
              @size-change="handleUserSizeChange"
              @current-change="handleUserPageChange"
            />
          </div>
        </el-tab-pane>

        <!-- 角色管理Tab -->
        <el-tab-pane label="角色管理" name="roles">          <div class="tab-header">
                                                           <div />
                                                           <div class="button-group">
                                                             <el-button type="info" icon="el-icon-document" size="small" @click="downloadRoleTemplate">下载模板</el-button>
                                                             <el-button type="warning" icon="el-icon-upload2" size="small" @click="$refs.roleFileInput.click()">导入</el-button>
                                                             <el-button type="success" icon="el-icon-download" size="small" @click="exportRoles">导出</el-button>
                                                             <el-button type="primary" icon="el-icon-plus" size="small" @click="openAddRole">新增角色</el-button>
                                                             <input ref="roleFileInput" type="file" accept=".xlsx,.xls" style="display: none" @change="handleRoleImport">
                                                           </div>
                                                         </div>

          <el-table v-loading="roleLoading" :data="roles" stripe border style="width: 100%; margin-top: 15px">
            <el-table-column type="index" label="序号" width="60" align="center" />
            <el-table-column prop="name" label="角色标识" width="120" />
            <el-table-column prop="displayName" label="显示名称" width="150" />
            <el-table-column prop="description" label="描述" min-width="200" />
            <el-table-column prop="status" label="状态" width="80" align="center">
              <template slot-scope="scope">
                <el-tag :type="scope.row.status === 1 ? 'success' : 'info'" size="small">
                  {{ scope.row.status === 1 ? '启用' : '禁用' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="160" align="center" fixed="right">
              <template slot-scope="scope">
                <el-button size="mini" type="primary" @click="openEditRole(scope.row)">编辑</el-button>
                <el-button size="mini" type="danger" :disabled="scope.row.name === 'admin'" @click="confirmDeleteRole(scope.row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 用户编辑弹窗 -->
    <el-dialog :title="userDialogTitle" :visible.sync="userDialogVisible" width="500px">
      <el-form ref="userForm" :model="userForm" :rules="userRules" label-width="100px">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="userForm.username" :disabled="isEditUser" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="userForm.password" type="password" :placeholder="isEditUser ? '不修改请留空' : '请输入密码'" />
        </el-form-item>
        <el-form-item label="真实姓名" prop="realName">
          <el-input v-model="userForm.realName" placeholder="请输入真实姓名" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select v-model="userForm.status" style="width: 100%">
            <el-option label="正常" value="0" />
            <el-option label="停用" value="1" />
          </el-select>
        </el-form-item>
      </el-form>
      <span slot="footer">
        <el-button @click="userDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveUser">保存</el-button>
      </span>
    </el-dialog>

    <!-- 角色分配弹窗 -->
    <el-dialog title="分配角色" :visible.sync="assignDialogVisible" width="500px">
      <div style="margin-bottom: 10px;">
        <strong>用户：</strong>{{ currentUser.username }} ({{ currentUser.realName }})
      </div>
      <el-checkbox-group v-model="selectedRoleIds">
        <div v-for="role in roles" :key="role.id" style="margin-bottom: 10px;">
          <el-checkbox :label="role.id">
            <span>{{ role.displayName }}</span>
            <span style="color: #999; margin-left: 10px;">({{ role.name }})</span>
          </el-checkbox>
        </div>
      </el-checkbox-group>
      <span slot="footer">
        <el-button @click="assignDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveAssignRole">保存</el-button>
      </span>
    </el-dialog>

    <!-- 角色编辑弹窗 -->
    <el-dialog :title="roleDialogTitle" :visible.sync="roleDialogVisible" width="500px">
      <el-form ref="roleForm" :model="roleForm" :rules="roleRules" label-width="100px">
        <el-form-item label="角色标识" prop="name">
          <el-input v-model="roleForm.name" :disabled="isEditRole && roleForm.name === 'admin'" placeholder="如: sales, warehouse" />
        </el-form-item>
        <el-form-item label="显示名称" prop="displayName">
          <el-input v-model="roleForm.displayName" placeholder="如: 销售人员" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="roleForm.description" type="textarea" :rows="3" placeholder="角色描述" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="roleForm.status" style="width: 100%">
            <el-option label="启用" :value="1" />
            <el-option label="禁用" :value="0" />
          </el-select>
        </el-form-item>
      </el-form>
      <span slot="footer">
        <el-button @click="roleDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveRole">保存</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import { getUsers, createUser, updateUser, deleteUser, exportUsers, importUsers, downloadUserTemplate } from '@/api/user'
import { getRoles, createRole, updateRole, deleteRole, assignRolesToUser, getUserRoleIds, exportRoles, importRoles, downloadRoleTemplate } from '@/api/role'

export default {
  name: 'PermissionManagement',
  data() {
    return {
      activeTab: 'users',

      // 用户相关
      userLoading: false,
      users: [],
      userSearch: {
        username: ''
      },
      userPagination: {
        page: 1,
        size: 10,
        total: 0
      },
      userDialogVisible: false,
      userDialogTitle: '新增用户',
      isEditUser: false,
      userForm: {
        id: null,
        username: '',
        password: '',
        realName: '',
        status: '0'
      },
      userRules: {
        username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
        password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
      },

      // 角色分配
      assignDialogVisible: false,
      currentUser: {},
      selectedRoleIds: [],

      // 角色相关
      roleLoading: false,
      roles: [],
      roleDialogVisible: false,
      roleDialogTitle: '新增角色',
      isEditRole: false,
      roleForm: {
        id: null,
        name: '',
        displayName: '',
        description: '',
        status: 1
      },
      roleRules: {
        name: [{ required: true, message: '请输入角色标识', trigger: 'blur' }],
        displayName: [{ required: true, message: '请输入显示名称', trigger: 'blur' }]
      }
    }
  },
  created() {
    this.fetchRoles().then(() => {
      this.fetchUsers()
    })
  },
  methods: {
    handleTabClick(tab) {
      if (tab.name === 'users') {
        this.fetchUsers()
      } else if (tab.name === 'roles') {
        this.fetchRoles()
      }
    },

    // ============ 用户管理 ============
    async fetchUsers() {
      this.userLoading = true
      try {
        const params = {
          page: this.userPagination.page,
          size: this.userPagination.size,
          username: this.userSearch.username
        }
        const res = await getUsers(params)
        if (res.code === 200 || res.code === 20000) {
          const data = res.data || {}
          // support different backend shapes: { records: [...], total } or { list: [...], total }
          let list = []
          if (data.records && Array.isArray(data.records)) {
            list = data.records
          } else if (Array.isArray(data.list)) {
            list = data.list
          } else if (Array.isArray(data)) {
            list = data
          }

          // normalize ids to strings to avoid JS precision loss for bigints
          this.users = list.map(u => ({
            ...u,
            id: u.id != null ? String(u.id) : u.id,
            // 确保 status 为字符串，以便与 el-select 的 value="0" 匹配，并修复表格中 === '0' 的判断
            status: u.status != null ? String(u.status) : '0'
          }))
          this.userPagination.total = Number(data.total || list.length)
          this.userPagination.page = Number(data.page || this.userPagination.page)
          this.userPagination.size = Number(data.size || this.userPagination.size)
          // 为每个用户加载角色信息
          // 由于 Vue2 的响应式限制，直接增加属性可能不会触发更新，需要 $set 或重新赋值
          // 另外，并行加载可能更快
          const userPromises = this.users.map(user => this.loadUserRoles(user))
          await Promise.all(userPromises)
          // 强制刷新视图，以防万一
          this.users = [...this.users]
        }
      } catch (e) {
        console.error('获取用户列表失败:', e)
        this.$message.error('获取用户列表失败')
      } finally {
        this.userLoading = false
      }
    },

    async loadUserRoles(user) {
      try {
        const res = await getUserRoleIds(user.id)
        if (res.code === 200) {
          const roleIds = (res.data || []).map(id => String(id))
          // 确保使用 $set 触发响应式更新
          this.$set(user, 'roleIds', roleIds)
          const roleNames = this.roles
            .filter(r => roleIds.includes(r.id))
            .map(r => r.displayName)
          this.$set(user, 'roleNames', roleNames)
        }
      } catch (e) {
        console.error('获取用户角色失败:', e)
        // 即使失败，也设置为空数组，避免界面 undefined
        this.$set(user, 'roleNames', [])
      }
    },

    resetUserSearch() {
      this.userSearch.username = ''
      this.userPagination.page = 1
      this.fetchUsers()
    },

    handleUserSizeChange(size) {
      this.userPagination.size = size
      this.fetchUsers()
    },

    handleUserPageChange(page) {
      this.userPagination.page = page
      this.fetchUsers()
    },

    openAddUser() {
      this.isEditUser = false
      this.userDialogTitle = '新增用户'
      this.userForm = {
        id: null,
        username: '',
        password: '',
        realName: '',
        status: '0'
      }
      this.userRules.password = [{ required: true, message: '请输入密码', trigger: 'blur' }]
      this.userDialogVisible = true
    },

    openEditUser(row) {
      this.isEditUser = true
      this.userDialogTitle = '编辑用户'
      this.userForm = {
        id: row.id,
        username: row.username,
        password: '',
        realName: row.realName || row.real_name,
        status: row.status || '0'
      }
      this.userRules.password = []
      this.userDialogVisible = true
    },

    async saveUser() {
      this.$refs.userForm.validate(async(valid) => {
        if (!valid) return

        try {
          const data = { ...this.userForm }
          if (!data.password) {
            delete data.password
          }

          let res
          if (this.isEditUser) {
            const id = data.id
            if (id == null) {
              this.$message.error('无效用户 id')
              return
            }
            // remove id from request body to avoid client forcing primary key
            delete data.id
            res = await updateUser(id, data)
          } else {
            // ensure no id is sent when creating (protect against leftover or malicious ids)
            if (data.id != null) {
              console.warn('createUser payload contained id, removing before send:', data.id)
              delete data.id
            }
            res = await createUser(data)
          }

          if (res.code === 200 || res.code === 20000) {
            this.$message.success(this.isEditUser ? '更新成功' : '创建成功')
            this.userDialogVisible = false
            this.fetchUsers()
          } else {
            this.$message.error(res.message || '操作失败')
          }
        } catch (e) {
          console.error('保存用户失败:', e)
          this.$message.error('保存失败')
        }
      })
    },

    confirmDeleteUser(row) {
      this.$confirm(`确定要删除用户 "${row.username}" 吗？`, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(async() => {
        try {
          const res = await deleteUser(row.id)
          if (res.code === 200 || res.code === 20000) {
            this.$message.success('删除成功')
            this.fetchUsers()
          } else {
            this.$message.error(res.message || '删除失败')
          }
        } catch (e) {
          console.error('删除用户失败:', e)
          this.$message.error('删除失败')
        }
      }).catch(() => {})
    },

    // ============ 角色分配 ============
    async openAssignRole(row) {
      this.currentUser = row
      console.log('openAssignRole user:', row)
      if (!row || !row.id) {
        this.$message.error('无效用户，无法分配角色')
        return
      }
      try {
        const res = await getUserRoleIds(row.id)
        if (res.code === 200) {
          this.selectedRoleIds = res.data || []
        } else {
          this.selectedRoleIds = []
          this.$message.error(res.message || '获取用户角色失败')
        }
      } catch (e) {
        console.error('获取用户角色失败:', e)
        this.selectedRoleIds = []
        this.$message.error('获取用户角色失败')
      }
      this.assignDialogVisible = true
    },

    async saveAssignRole() {
      if (!this.currentUser || !this.currentUser.id) {
        this.$message.error('无效用户，不能分配角色')
        return
      }

      try {
        console.log('assignRolesToUser request', this.currentUser.id, this.selectedRoleIds)
        // convert selectedRoleIds to numbers for backend (Long expected)
        const roleIdsToSend = this.selectedRoleIds.map(id => Number(id))
        const res = await assignRolesToUser(this.currentUser.id, roleIdsToSend)
        console.log('assignRolesToUser response', res)
        if (res.code === 200 || res.code === 20000) {
          this.$message.success('角色分配成功')
          this.assignDialogVisible = false
          this.fetchUsers()
        } else {
          this.$message.error(res.message || '分配失败')
        }
      } catch (e) {
        console.error('分配角色失败:', e)
        let message = '分配失败'
        if (e && e.response && e.response.data && e.response.data.message) {
          message = e.response.data.message
        } else if (e && e.message) {
          message = e.message
        }
        this.$message.error(message)
      }
    },

    // ============ 角色管理 ============
    async fetchRoles() {
      this.roleLoading = true
      try {
        const res = await getRoles()
        if (res.code === 200) {
          // normalize role ids to strings
          this.roles = (res.data || []).map(r => ({ ...r, id: r.id != null ? String(r.id) : r.id }))
        }
      } catch (e) {
        console.error('获取角色列表失败:', e)
        this.$message.error('获取角色列表失败')
      } finally {
        this.roleLoading = false
      }
    },

    openAddRole() {
      this.isEditRole = false
      this.roleDialogTitle = '新增角色'
      this.roleForm = {
        id: null,
        name: '',
        displayName: '',
        description: '',
        status: 1
      }
      this.roleDialogVisible = true
    },

    openEditRole(row) {
      this.isEditRole = true
      this.roleDialogTitle = '编辑角色'
      this.roleForm = { ...row }
      this.roleDialogVisible = true
    },

    async saveRole() {
      this.$refs.roleForm.validate(async(valid) => {
        if (!valid) return

        try {
          let res
          if (this.isEditRole) {
            res = await updateRole(this.roleForm.id, this.roleForm)
          } else {
            res = await createRole(this.roleForm)
          }

          if (res.code === 200) {
            this.$message.success(this.isEditRole ? '更新成功' : '创建成功')
            this.roleDialogVisible = false
            this.fetchRoles()
          } else {
            this.$message.error(res.message || '操作失败')
          }
        } catch (e) {
          console.error('保存角色失败:', e)
          this.$message.error('保存失败')
        }
      })
    },

    confirmDeleteRole(row) {
      if (row.name === 'admin') {
        this.$message.warning('不能删除超级管理员角色')
        return
      }

      this.$confirm(`确定要删除角色 "${row.displayName}" 吗？`, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(async() => {
        try {
          const res = await deleteRole(row.id)
          if (res.code === 200) {
            this.$message.success('删除成功')
            this.fetchRoles()
          } else {
            this.$message.error(res.message || '删除失败')
          }
        } catch (e) {
          console.error('删除角色失败:', e)
          this.$message.error('删除失败')
        }
      }).catch(() => {})
    },

    // ============ 用户导入导出 ============
    async exportUsers() {
      try {
        const res = await exportUsers({ username: this.userSearch.username })
        const blob = new Blob([res], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = '用户数据.xlsx'
        link.click()
        URL.revokeObjectURL(link.href)
        this.$message.success('导出成功')
      } catch (e) {
        console.error('导出用户失败:', e)
        this.$message.error('导出失败')
      }
    },

    async handleUserImport(e) {
      const file = e.target.files[0]
      if (!file) return
      try {
        const res = await importUsers(file)
        if (res.code === 20000 || res.code === 200) {
          this.$message.success(res.message || '导入成功')
          this.fetchUsers()
        } else {
          this.$message.error(res.message || '导入失败')
        }
      } catch (err) {
        console.error('导入用户失败:', err)
        this.$message.error('导入失败')
      } finally {
        this.$refs.userFileInput.value = ''
      }
    },

    async downloadUserTemplate() {
      try {
        const res = await downloadUserTemplate()
        const blob = new Blob([res], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = '用户导入模板.xlsx'
        link.click()
        URL.revokeObjectURL(link.href)
      } catch (e) {
        console.error('下载模板失败:', e)
        this.$message.error('下载模板失败')
      }
    },

    // ============ 角色导入导出 ============
    async exportRoles() {
      try {
        const res = await exportRoles()
        const blob = new Blob([res], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = '角色数据.xlsx'
        link.click()
        URL.revokeObjectURL(link.href)
        this.$message.success('导出成功')
      } catch (e) {
        console.error('导出角色失败:', e)
        this.$message.error('导出失败')
      }
    },

    async handleRoleImport(e) {
      const file = e.target.files[0]
      if (!file) return
      try {
        const res = await importRoles(file)
        if (res.code === 20000 || res.code === 200) {
          this.$message.success(res.message || '导入成功')
          this.fetchRoles()
        } else {
          this.$message.error(res.message || '导入失败')
        }
      } catch (err) {
        console.error('导入角色失败:', err)
        this.$message.error('导入失败')
      } finally {
        this.$refs.roleFileInput.value = ''
      }
    },

    async downloadRoleTemplate() {
      try {
        const res = await downloadRoleTemplate()
        const blob = new Blob([res], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = '角色导入模板.xlsx'
        link.click()
        URL.revokeObjectURL(link.href)
      } catch (e) {
        console.error('下载模板失败:', e)
        this.$message.error('下载模板失败')
      }
    }
  }
}
</script>

<style scoped>
.permission-container {
  padding: 20px;
}
.tab-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.search-form {
  display: flex;
  align-items: center;
}
.button-group {
  display: flex;
  gap: 8px;
  align-items: center;
}
</style>
