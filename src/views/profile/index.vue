<template>
  <div class="profile-view">
    <el-card>
      <div slot="header"><span>个人中心</span></div>
      <p>用户名：{{ name || '-' }}</p>
      <p>姓名：{{ realName || '-' }}</p>
      <el-button type="primary" @click="openChangePassword">修改密码</el-button>
    </el-card>

    <el-dialog title="修改密码" :visible.sync="changePwdVisible" width="420px" :before-close="onCloseChangePwd">
      <el-form ref="changePwdForm" :model="changePwd" :rules="changePwdRules" label-width="90px">
        <el-form-item label="旧密码" prop="oldPassword">
          <el-input v-model="changePwd.oldPassword" type="password" autocomplete="off" />
        </el-form-item>
        <el-form-item label="新密码" prop="newPassword">
          <el-input v-model="changePwd.newPassword" type="password" autocomplete="off" />
        </el-form-item>
        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input v-model="changePwd.confirmPassword" type="password" autocomplete="off" />
        </el-form-item>
      </el-form>
      <span slot="footer">
        <el-button @click="changePwdVisible = false">取消</el-button>
        <el-button type="primary" @click="submitChangePassword">保存</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'
import { changePassword } from '@/api/user'
export default {
  name: 'Profile',
  data() {
    return {
      changePwdVisible: false,
      changePwd: {
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
      },
      changePwdRules: {
        oldPassword: [{ required: true, message: '请输入旧密码', trigger: 'blur' }],
        newPassword: [
          { required: true, message: '请输入新密码', trigger: 'blur' },
          { min: 6, message: '密码长度至少6位', trigger: 'blur' }
        ],
        confirmPassword: [
          { required: true, message: '请确认新密码', trigger: 'blur' },
          { validator: (rule, value, callback) => {
            if (value !== this.changePwd.newPassword) {
              callback(new Error('两次密码不一致'))
            } else {
              callback()
            }
          }, trigger: 'blur' }
        ]
      }
    }
  },
  computed: {
    ...mapGetters(['name', 'realName', 'roles'])
  },
  methods: {
    openChangePassword() {
      this.changePwdVisible = true
      this.$nextTick(() => {
        if (this.$refs.changePwdForm) this.$refs.changePwdForm.resetFields()
      })
    },
    onCloseChangePwd(done) {
      if (this.$refs.changePwdForm) this.$refs.changePwdForm.resetFields()
      done()
    },
    submitChangePassword() {
      this.$refs.changePwdForm.validate(valid => {
        if (!valid) return
        changePassword({
          oldPassword: this.changePwd.oldPassword,
          newPassword: this.changePwd.newPassword
        }).then(() => {
          this.$message.success('密码修改成功，请重新登录')
          this.changePwdVisible = false
          this.$store.dispatch('user/logout').finally(() => {
            this.$router.push('/login')
          })
        }).catch(err => {
          this.$message.error((err && err.message) || '修改失败')
        })
      })
    }
  }
}
</script>

<style scoped>
.profile-view { padding: 20px }
</style>
