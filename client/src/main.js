import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'
import axios from 'axios'
import { Button, Field, Form, Toast, Dialog, Loading, NavBar, Icon, Cell, CellGroup, List, PullRefresh, RadioGroup, Radio, Checkbox, CheckboxGroup, ActionSheet, Popup, Overlay, Uploader, Progress, showToast } from 'vant'
import 'vant/lib/index.css'
import '@vant/touch-emulator'
import logger from './utils/logger'

const app = createApp(App)

// 配置axios
axios.defaults.baseURL = 'http://localhost:3000'
axios.defaults.timeout = 10000

// 请求拦截器
axios.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// 响应拦截器
axios.interceptors.response.use(
  response => {
    return response
  },
  error => {
    if (error.response && error.response.status === 401) {
      // Token过期或无效，清除本地存储并跳转到登录页
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      store.commit('LOGOUT')
      router.push('/login')
      showToast('登录已过期，请重新登录')
    }
    return Promise.reject(error)
  }
)

// 注册Vant组件
app.use(Button)
app.use(Field)
app.use(Form)
app.use(Toast)
app.use(Dialog)
app.use(Loading)
app.use(NavBar)
app.use(Icon)
app.use(Cell)
app.use(CellGroup)
app.use(List)
app.use(PullRefresh)
app.use(RadioGroup)
app.use(Radio)
app.use(Checkbox)
app.use(CheckboxGroup)
app.use(ActionSheet)
app.use(Popup)
app.use(Overlay)
app.use(Uploader)
app.use(Progress)

// 全局属性
app.config.globalProperties.$http = axios

app.use(store).use(router).mount('#app')