<template>
  <div class="users-page">
    <el-card>
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <div>
          <el-input v-model="filters.username" placeholder="搜索用户名" size="small" style="width:220px;" clearable @keyup.enter.native="fetchUsers">
            <template slot="append">
              <el-button icon="el-icon-search" size="small" @click="fetchUsers" />
            </template>
          </el-input>
        </div>
        <div>
          <el-button type="primary" icon="el-icon-plus" @click="openDialogForCreate">新建用户</el-button>
        </div>
      </div>

      <el-table :data="users" stripe border style="width:100%">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="username" label="用户名" />
        <el-table-column prop="real_name" label="真实姓名" />
        <el-table-column prop="email" label="邮箱" />
        <el-table-column prop="status" label="状态" width="100">
          <template slot-scope="scope">
            <el-tag v-if="scope.row.status === 'active'" type="success">启用</el-tag>
            <el-tag v-else type="info">禁用</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_by" label="创建者" />
        <el-table-column prop="created_at" label="创建时间" />
        <el-table-column prop="updated_at" label="更新时间" />
        <el-table-column label="操作" width="160" fixed="right">
          <template slot-scope="scope">
            <el-button type="text" size="small" @click="openDialogForEdit(scope.row)">编辑</el-button>
            <el-button type="text" size="small" @click="confirmDelete(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div style="display:flex; justify-content:center; margin-top:12px;">
        <el-pagination
          background
          layout="prev, pager, next, sizes, jumper, total"
          :current-page.sync="page"
          :page-size.sync="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="total"
          @current-change="fetchUsers"
          @size-change="fetchUsers"
        />
      </div>
    </el-card>

    <el-dialog :title="dialogTitle" :visible.sync="dialogVisible" width="480px" :before-close="onDialogClose">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" autocomplete="off" />
        </el-form-item>

        <el-form-item label="密码" prop="password">
          <el-input v-model="form.password" type="password" autocomplete="off" :placeholder="isEdit ? '不修改请留空' : ''" />
        </el-form-item>

        <el-form-item label="真实姓名" prop="real_name">
          <el-input v-model="form.real_name" />
        </el-form-item>

        <el-form-item label="邮箱" prop="email">
          <el-input v-model="form.email" />
        </el-form-item>

        <el-form-item label="状态" prop="status">
          <el-select v-model="form.status" placeholder="选择状态">
            <el-option label="启用" value="active" />
            <el-option label="禁用" value="inactive" />
          </el-select>
        </el-form-item>
      </el-form>

      <div slot="footer" class="dialog-footer">
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveUser">保存</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { getUsers, getUser, createUser, updateUser, deleteUser } from '@/api/user'

export default {
  name: 'SystemUsers',
  data() {
    return {
      filters: {
        username: ''
      },
      users: [],
      page: 1,
      pageSize: 10,
      total: 0,

      dialogVisible: false,
      dialogTitle: '新建用户',
      isEdit: false,
      form: {
        id: null,
        username: '',
        password: '',
        real_name: '',
        email: '',
        status: 'active'
      },

      rules: {
        username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
        email: [{ type: 'email', message: '邮箱格式不正确', trigger: 'blur' }]
      }
    }
  },
  mounted() {
    this.fetchUsers()
  },
  methods: {
    fetchUsers() {
      const params = {
        page: this.page,
        size: this.pageSize,
        username: this.filters.username || undefined
      }
      getUsers(params).then(res => {
        // Expecting { data: { items: [...], total: 123 } } or standard list
        if (res && res.data) {
          // handle both paged and non-paged responses
          const body = res.data
          if (body.items && Array.isArray(body.items)) {
            this.users = body.items
            this.total = body.total || body.totalCount || this.users.length
          } else if (Array.isArray(body)) {
            this.users = body
            this.total = body.length
          } else if (body.data && Array.isArray(body.data)) {
            this.users = body.data
            this.total = body.total || body.totalCount || this.users.length
          } else {
            // fallback: try res.data.rows
            this.users = body.rows || []
            this.total = body.total || this.users.length
          }
        }
      }).catch(() => {
        this.$message.error('获取用户列表失败')
      })
    },

    openDialogForCreate() {
      this.dialogTitle = '新建用户'
      this.isEdit = false
      this.form = { id: null, username: '', password: '', real_name: '', email: '', status: 'active' }
      this.dialogVisible = true
      this.$nextTick(() => {
        if (this.$refs.formRef) this.$refs.formRef.resetFields()
      })
    },

    openDialogForEdit(row) {
      this.dialogTitle = '编辑用户'
      this.isEdit = true
      // fetch fresh data
      getUser(row.id).then(res => {
        const u = res.data && (res.data.data || res.data) || {}
        this.form = {
          id: u.id || row.id,
          username: u.username || row.username,
          password: '', // leave blank unless changing
          real_name: u.real_name || row.real_name,
          email: u.email || row.email,
          status: u.status || row.status || 'active'
        }
        this.dialogVisible = true
      }).catch(() => {
        this.$message.error('加载用户信息失败')
      })
    },

    saveUser() {
      this.$refs.formRef.validate(valid => {
        if (!valid) return
        const payload = {
          username: this.form.username,
          real_name: this.form.real_name,
          email: this.form.email,
          status: this.form.status
        }
        if (!this.isEdit) {
          payload.password = this.form.password
          createUser(payload).then(() => {
            this.$message.success('用户已创建')
            this.dialogVisible = false
            this.fetchUsers()
          }).catch(() => { this.$message.error('创建用户失败') })
        } else {
          // if password provided, include, otherwise omit to keep unchanged
          if (this.form.password) payload.password = this.form.password
          updateUser(this.form.id, payload).then(() => {
            this.$message.success('用户已更新')
            this.dialogVisible = false
            this.fetchUsers()
          }).catch(() => { this.$message.error('更新用户失败') })
        }
      })
    },

    confirmDelete(row) {
      this.$confirm(`确认删除用户 "${row.username}" 吗？`, '删除', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        deleteUser(row.id).then(() => {
          this.$message.success('用户已删除')
          this.fetchUsers()
        }).catch(() => {
          this.$message.error('删除失败')
        })
      }).catch(() => {})
    },

    onDialogClose(done) {
      // reset form
      if (this.$refs.formRef) this.$refs.formRef.resetFields()
      done()
    }
  }
}
</script>

<style scoped>
.users-page {
  padding: 12px;
}
</style>
