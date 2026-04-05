<template>
  <div class="login-container">
    <div class="brand-container">
      <img class="brand-logo" :src="brandLogo" alt="FINECHEM" />
      <div class="brand-text-wrap">
        <h3 class="brand-title-cn">方恩电子管理系统</h3>
        <div class="brand-divider" />
        <div class="brand-title-en">FINECHEM MANAGE SYSTEM</div>
      </div>
    </div>
    <el-form
      ref="loginForm"
      :model="loginForm"
      :rules="loginRules"
      :validate-on-rule-change="false"
      class="login-form"
      autocomplete="on"
      label-position="left"
    >
      <el-form-item prop="username">
        <span class="svg-container">
          <i class="el-icon-user-solid input-icon" />
        </span>
        <el-input
          ref="username"
          v-model="loginForm.username"
          placeholder="用户名"
          name="username"
          type="text"
          tabindex="1"
          autocomplete="on"
        />
      </el-form-item>
      <el-form-item prop="password">
        <span class="svg-container">
          <i class="el-icon-lock input-icon" />
        </span>
        <el-input
          :key="passwordType"
          ref="password"
          v-model="loginForm.password"
          :type="passwordType"
          placeholder="密码"
          name="password"
          tabindex="2"
          autocomplete="on"
          @keyup.enter.native="handleLogin"
        />
        <span class="show-pwd" @click="showPwd">
          <svg-icon :icon-class="passwordType === 'password' ? 'eye' : 'eye-open'" />
        </span>
      </el-form-item>
      <el-button :loading="loading" type="primary" class="login-btn" @click.native.prevent="handleLogin">登录</el-button>
    </el-form>
  </div>
</template>

<script>
import axios from 'axios'

export default {
  name: 'Login',
  components: {},
  data() {
    const validatePassword = (rule, value, callback) => {
      if (!value) {
        callback(new Error('请输入密码'))
      } else if (value.length < 6) {
        callback(new Error('密码长度不能少于6位'))
      } else {
        callback()
      }
    }
    return {
      brandLogo: `${process.env.BASE_URL}favicon.png`,
      loginForm: {
        username: '',
        password: ''
      },
      loginRules: {
        username: [{ required: true, trigger: 'blur', message: '请输入用户名' }],
        password: [{ trigger: 'blur', validator: validatePassword }]
      },
      passwordType: 'password',
      capsTooltip: false,
      loading: false,
      showDialog: false,
      redirect: undefined,
      otherQuery: {}
    }
  },
  watch: {
    $route: {
      handler: function(route) {
        const query = route.query
        if (query) {
          this.redirect = query.redirect
          this.otherQuery = this.getOtherQuery(query)
        }
      },
      immediate: true
    }
  },
  created() {
    // window.addEventListener('storage', this.afterQRScan)
  },
  mounted() {
    if (this.loginForm.username === '') {
      this.$refs.username.focus()
    } else if (this.loginForm.password === '') {
      this.$refs.password.focus()
    }
    this.$nextTick(() => {
      this.$refs.loginForm.clearValidate()
    })
  },
  destroyed() {
    // window.removeEventListener('storage', this.afterQRScan)
  },
  methods: {
    checkCapslock(e) {
      const { key } = e
      this.capsTooltip = key && key.length === 1 && (key >= 'A' && key <= 'Z')
    },
    showPwd() {
      if (this.passwordType === 'password') {
        this.passwordType = ''
      } else {
        this.passwordType = 'password'
      }
      this.$nextTick(() => {
        this.$refs.password.focus()
      })
    },
    handleLogin() {
      this.$refs.loginForm.validate(valid => {
        if (valid) {
          this.loading = true
          this.$store.dispatch('user/login', this.loginForm)
            .then(() => {
              this.$router.push({ path: '/dashboard' })
              this.loading = false
            })
            .catch(() => {
              this.loading = false
            })
        } else {
          console.log('error submit!!')
          return false
        }
      })
    },
    async handleChangePwd() {
      if (!this.changePwdForm.username || !this.changePwdForm.oldPassword || !this.changePwdForm.newPassword) {
        this.$message.error('请填写完整信息')
        return
      }
      try {
        const res = await axios.post('/vue-element-admin/user/change-password', this.changePwdForm)
        if (res.data.code === 20000) {
          this.$message.success('密码修改成功')
          this.showChangePwd = false
          this.changePwdForm.oldPassword = ''
          this.changePwdForm.newPassword = ''
        } else {
          this.$message.error(res.data.message)
        }
      } catch (e) {
        this.$message.error('请求失败')
      }
    },
    getOtherQuery(query) {
      return Object.keys(query).reduce((acc, cur) => {
        if (cur !== 'redirect') {
          acc[cur] = query[cur]
        }
        return acc
      }, {})
    }
  }
}
</script>

<style lang="scss">
/* 修复input 背景不协调 和光标变色 */
/* Detail see https://github.com/PanJiaChen/vue-element-admin/pull/927 */

$bg:#283443;
$light_gray:#fff;
$cursor: #fff;

@supports (-webkit-mask: none) and (not (cater-color: $cursor)) {
  .login-container .el-input input {
    color: $cursor;
  }
}

/* reset element-ui css */
.login-container {
  .el-input {
    display: inline-block;
    height: 47px;
    width: 85%;

    input {
      background: transparent;
      border: 0px;
      appearance: none;
      -webkit-appearance: none;
      border-radius: 0px;
      padding: 12px 5px 12px 15px;
      color: $light_gray;
      height: 47px;
      caret-color: $cursor;

      &:-webkit-autofill {
        box-shadow: 0 0 0px 1000px $bg inset !important;
        -webkit-text-fill-color: $cursor !important;
      }
    }
  }

  .el-form-item {
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(0, 0, 0, 0.1);
    border-radius: 5px;
    color: #454545;
  }
}
</style>

<style lang="scss" scoped>
$bg:#2d3a4b;
$dark_gray:#889aa4;
$light_gray:#eee;

.login-container {
  min-height: 100%;
  width: 100%;
  position: relative;
  background:
    radial-gradient(circle at 14% 18%, rgba(37, 99, 235, 0.22), rgba(37, 99, 235, 0) 42%),
    radial-gradient(circle at 82% 78%, rgba(34, 211, 238, 0.16), rgba(34, 211, 238, 0) 44%),
    linear-gradient(135deg, #1e293b 0%, #0f172a 46%, #111827 100%);
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(148, 163, 184, 0.09) 1px, transparent 1px),
      linear-gradient(90deg, rgba(148, 163, 184, 0.08) 1px, transparent 1px);
    background-size: 38px 38px;
    opacity: 0.16;
    pointer-events: none;
  }

  &::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    height: 2px;
    background: linear-gradient(90deg, rgba(59, 130, 246, 0), rgba(59, 130, 246, 0.85), rgba(6, 182, 212, 0.6), rgba(59, 130, 246, 0));
    opacity: 0.75;
    pointer-events: none;
  }

  .brand-container {
    position: absolute;
    left: 28px;
    top: 24px;
    display: flex;
    align-items: center;
    gap: 18px;
    z-index: 2;
    padding: 14px 18px;
    border: 1px solid rgba(148, 163, 184, 0.25);
    border-radius: 10px;
    backdrop-filter: blur(3px);
    background: linear-gradient(145deg, rgba(22, 31, 49, 0.78), rgba(11, 18, 32, 0.58));
    box-shadow:
      inset 0 1px 0 rgba(191, 219, 254, 0.28),
      inset 0 -1px 0 rgba(15, 23, 42, 0.85),
      0 14px 30px rgba(2, 6, 23, 0.48),
      0 0 0 1px rgba(59, 130, 246, 0.2);
  }

  .brand-logo {
    width: 88px;
    height: 88px;
    border-radius: 10px;
    object-fit: contain;
    background: rgba(255, 255, 255, 0.96);
    padding: 4px;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.7),
      0 0 0 2px rgba(148, 163, 184, 0.2),
      0 0 20px rgba(59, 130, 246, 0.28),
      0 10px 18px rgba(0, 0, 0, 0.35);
  }

  .brand-text-wrap {
    width: 280px;
  }

  .brand-title-cn,
  .brand-title-en {
    margin: 0;
    width: 100%;
    text-align: left;
    color: #f3f4f6;
    white-space: nowrap;
  }

  .brand-title-cn {
    font-size: 34px;
    font-weight: 700;
    letter-spacing: 1.2px;
    line-height: 1.2;
    text-shadow: 0 0 10px rgba(147, 197, 253, 0.2);
  }

  .brand-divider {
    margin: 8px 0 7px;
    width: 100%;
    height: 5px;
    border-radius: 999px;
    background: linear-gradient(90deg, rgba(37, 99, 235, 0.96), rgba(14, 165, 233, 0.96));
    box-shadow: 0 0 12px rgba(37, 99, 235, 0.45);
  }

  .brand-title-en {
    font-size: 16px;
    font-weight: 600;
    letter-spacing: 1.2px;
    color: #dbe3ef;
    line-height: 1.2;
    text-align: left;
  }

  .login-form {
    position: absolute;
    right: 7vw;
    top: 57%;
    transform: translateY(-50%);
    width: 520px;
    max-width: 100%;
    padding: 36px 32px 18px;
    margin: 0;
    overflow: hidden;
    border: 1px solid rgba(148, 163, 184, 0.2);
    border-radius: 12px;
    backdrop-filter: blur(8px);
    background:
      linear-gradient(155deg, rgba(29, 41, 61, 0.78), rgba(12, 20, 36, 0.7)),
      radial-gradient(circle at 25% 0%, rgba(56, 189, 248, 0.22), rgba(56, 189, 248, 0) 40%);
    box-shadow:
      inset 0 1px 0 rgba(191, 219, 254, 0.22),
      inset 0 -1px 0 rgba(15, 23, 42, 0.9),
      0 22px 44px rgba(2, 6, 23, 0.56),
      0 0 0 1px rgba(96, 165, 250, 0.2),
      0 0 34px rgba(37, 99, 235, 0.2);

    &::before {
      content: '';
      position: absolute;
      left: 16px;
      right: 16px;
      top: 0;
      height: 1px;
      background: linear-gradient(90deg, rgba(125, 211, 252, 0), rgba(125, 211, 252, 0.7), rgba(125, 211, 252, 0));
      opacity: 0.65;
    }

    ::v-deep .el-input {
      flex: 1;
      width: auto;
      height: 50px;
    }

    ::v-deep .el-form-item {
      margin-bottom: 14px;
      border-radius: 10px;
      border: 1px solid rgba(96, 165, 250, 0.3);
      background: linear-gradient(180deg, rgba(15, 23, 42, 0.68), rgba(15, 23, 42, 0.42));
      box-shadow: inset 0 1px 0 rgba(191, 219, 254, 0.08), inset 0 -1px 0 rgba(2, 6, 23, 0.9);
      transition: all .2s ease;
    }

    ::v-deep .el-form-item__content {
      display: flex;
      align-items: center;
      position: relative;
    }

    ::v-deep .el-form-item:hover,
    ::v-deep .el-form-item.is-focus,
    ::v-deep .el-form-item:focus-within {
      border-color: rgba(96, 165, 250, 0.62);
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.16), inset 0 1px 0 rgba(191, 219, 254, 0.1);
      background: linear-gradient(180deg, rgba(15, 23, 42, 0.76), rgba(15, 23, 42, 0.52));
    }

    ::v-deep .el-input input {
      height: 50px;
      line-height: 50px;
      padding: 12px 12px 12px 10px;
      color: #e5eefb;
      font-size: 16px;
      letter-spacing: 0.2px;
      background: transparent;
    }

    ::v-deep .el-input input::placeholder {
      color: rgba(191, 219, 254, 0.26);
    }

    ::v-deep .el-form-item__error {
      color: #fda4af;
      padding-top: 4px;
    }
  }

  .tips {
    font-size: 14px;
    color: #fff;
    margin-bottom: 10px;

    span {
      &:first-of-type {
        margin-right: 16px;
      }
    }
  }

  .svg-container {
    padding: 0 0 0 16px;
    margin-right: 19px;
    color: #d8eaff;
    width: 24px;
    height: 50px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    .input-icon {
      font-size: 22px;
      font-weight: 700;
      line-height: 1;
      text-shadow: 0 0 10px rgba(96, 165, 250, 0.55), 0 1px 0 rgba(255, 255, 255, 0.22);
    }
  }

  .show-pwd {
    position: absolute;
    right: 10px;
    top: 8px;
    font-size: 16px;
    color: #8fa3b8;
    cursor: pointer;
    user-select: none;
  }

  .login-btn {
    width: 100%;
    margin-top: 10px;
    margin-bottom: 18px;
    height: 46px;
    border-radius: 10px;
    background: linear-gradient(180deg, #3b82f6 0%, #2563eb 52%, #0ea5e9 100%) !important;
    border: 1px solid rgba(125, 211, 252, 0.55);
    box-shadow:
      inset 0 1px 0 rgba(219, 234, 254, 0.45),
      inset 0 -2px 0 rgba(2, 6, 23, 0.35),
      0 12px 24px rgba(37, 99, 235, 0.4);
    font-size: 19px;
    letter-spacing: 0.5px;
    transform: translateY(0);
    transition: all .18s ease;

    &:hover {
      transform: translateY(-1px);
      box-shadow:
        inset 0 1px 0 rgba(219, 234, 254, 0.5),
        inset 0 -2px 0 rgba(2, 6, 23, 0.35),
        0 14px 26px rgba(37, 99, 235, 0.48);
    }

    &:active {
      transform: translateY(1px);
      box-shadow:
        inset 0 1px 0 rgba(219, 234, 254, 0.3),
        inset 0 -1px 0 rgba(2, 6, 23, 0.28),
        0 6px 16px rgba(37, 99, 235, 0.3);
    }
  }

  @media only screen and (max-width: 980px) {
    .brand-container {
      left: 16px;
      top: 14px;
      transform: scale(0.86);
      transform-origin: left top;
    }

    .login-form {
      right: 50%;
      top: 60%;
      transform: translate(50%, -50%);
      width: calc(100% - 32px);
      max-width: 520px;
    }
  }

  .thirdparty-button {
    position: absolute;
    right: 0;
    bottom: 6px;
  }

  @media only screen and (max-width: 470px) {
    .thirdparty-button {
      display: none;
    }
  }
}
</style>
