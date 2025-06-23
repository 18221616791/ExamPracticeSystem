<template>
  <div class="page-container">
    <van-nav-bar title="登录" />
    
    <div class="login-container">
      <div class="logo-section">
        <div class="logo">
          <van-icon name="notes-o" size="48" color="#1989fa" />
        </div>
        <h1 class="app-title">题库管理系统</h1>
        <p class="app-subtitle">专业的题库管理与刷题平台</p>
      </div>
      
      <div class="form-container">
        <van-form @submit="handleLogin">
          <van-field
            v-model="form.username"
            name="username"
            label="用户名"
            placeholder="请输入用户名"
            :rules="[{ required: true, message: '请输入用户名' }]"
          />
          <van-field
            v-model="form.password"
            type="password"
            name="password"
            label="密码"
            placeholder="请输入密码"
            :rules="[{ required: true, message: '请输入密码' }]"
          />
          
          <div class="button-group">
            <van-button
              round
              block
              type="primary"
              native-type="submit"
              :loading="loading"
            >
              登录
            </van-button>
            
            <van-button
              round
              block
              type="default"
              @click="handleRegister"
              :loading="loading"
            >
              注册
            </van-button>
            
            <van-button
              round
              block
              type="warning"
              @click="handleWechatLogin"
              :loading="wechatLoading"
            >
              <van-icon name="wechat" /> 微信登录
            </van-button>
            
            <van-button
              round
              block
              plain
              type="primary"
              @click="handleGuestMode"
            >
              访客模式（仅刷题）
            </van-button>
          </div>
        </van-form>
      </div>
      
      <!-- 微信登录二维码弹窗 -->
      <van-popup v-model:show="showQrCode" position="center" round>
        <div class="qr-code-container">
          <h3>微信扫码登录</h3>
          <div class="qr-code" v-if="qrCodeUrl">
            <img :src="qrCodeUrl" alt="微信登录二维码" />
          </div>
          <p class="qr-tip">请使用微信扫描二维码登录</p>
          <van-button type="default" @click="showQrCode = false">取消</van-button>
        </div>
      </van-popup>
    </div>
  </div>
</template>

<script>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from 'vuex'
import { showToast } from 'vant'
import logger from '../utils/logger'

export default {
  name: 'Login',
  setup() {
    const router = useRouter()
    const store = useStore()
    
    const loading = ref(false)
    const wechatLoading = ref(false)
    const showQrCode = ref(false)
    const qrCodeUrl = ref('')
    
    const form = reactive({
      username: '',
      password: ''
    })
    
    // 账号登录
    const handleLogin = async () => {
      loading.value = true
      try {
        const result = await store.dispatch('login', {
          username: form.username,
          password: form.password,
          loginType: 'account'
        })
        
        if (result.success) {
          showToast('登录成功')
          logger.info('用户登录成功', result.user)
          
          // 根据用户角色跳转
          if (result.user.role === 'admin') {
            router.push('/')
          } else {
            router.push('/practice')
          }
        } else {
          showToast(result.message)
          logger.warn('登录失败', result.message)
        }
      } catch (error) {
        showToast('登录失败')
        logger.error('登录异常', error)
      } finally {
        loading.value = false
      }
    }
    
    // 注册
    const handleRegister = async () => {
      if (!form.username || !form.password) {
        showToast('请填写用户名和密码')
        return
      }
      
      loading.value = true
      try {
        const result = await store.dispatch('register', {
          username: form.username,
          password: form.password
        })
        
        if (result.success) {
          showToast('注册成功')
          logger.info('用户注册成功', result.user)
          
          // 注册成功后跳转到刷题页面（普通用户）
          router.push('/practice')
        } else {
          showToast(result.message)
          logger.warn('注册失败', result.message)
        }
      } catch (error) {
        showToast('注册失败')
        logger.error('注册异常', error)
      } finally {
        loading.value = false
      }
    }
    
    // 微信登录
    const handleWechatLogin = async () => {
      wechatLoading.value = true
      try {
        // 微信登录功能暂未实现
        Toast.fail('微信登录功能暂未实现')
        logger.warn('微信登录功能暂未实现')
      } catch (error) {
        showToast('获取二维码失败')
        logger.error('获取微信二维码失败', error)
      } finally {
        wechatLoading.value = false
      }
    }
    
    // 轮询微信登录状态（暂未实现）
    const pollWechatLogin = (scene) => {
      // 微信登录功能暂未实现
      logger.warn('微信登录轮询功能暂未实现', scene)
    }
    
    // 访客模式
    const handleGuestMode = () => {
      logger.info('进入访客模式')
      router.push('/practice')
    }
    
    return {
      form,
      loading,
      wechatLoading,
      showQrCode,
      qrCodeUrl,
      handleLogin,
      handleRegister,
      handleWechatLogin,
      handleGuestMode
    }
  }
}
</script>

<style scoped>
.login-container {
  padding: 20px;
  min-height: calc(100vh - 46px);
  display: flex;
  flex-direction: column;
}

.logo-section {
  text-align: center;
  padding: 40px 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.logo {
  margin-bottom: 20px;
}

.app-title {
  font-size: 28px;
  font-weight: bold;
  color: #323233;
  margin-bottom: 8px;
}

.app-subtitle {
  font-size: 14px;
  color: #969799;
  margin-bottom: 40px;
}

.form-container {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.button-group {
  margin-top: 24px;
}

.button-group .van-button {
  margin-bottom: 12px;
}

.button-group .van-button:last-child {
  margin-bottom: 0;
}

.qr-code-container {
  padding: 24px;
  text-align: center;
  width: 280px;
}

.qr-code-container h3 {
  margin-bottom: 20px;
  color: #323233;
}

.qr-code {
  margin: 20px 0;
}

.qr-code img {
  width: 200px;
  height: 200px;
  border: 1px solid #ebedf0;
  border-radius: 8px;
}

.qr-tip {
  font-size: 14px;
  color: #646566;
  margin-bottom: 20px;
}
</style>