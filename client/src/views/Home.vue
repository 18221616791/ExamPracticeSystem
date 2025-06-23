<template>
  <div class="page-container">
    <van-nav-bar title="题库管理系统">
      <template #right>
        <van-icon name="setting-o" @click="showUserMenu = true" />
      </template>
    </van-nav-bar>
    
    <div class="content-wrapper">
      <!-- 欢迎信息 -->
      <div class="welcome-card">
        <div class="welcome-content">
          <h2>欢迎回来，{{ currentUser?.username }}</h2>
          <p>管理员控制面板</p>
        </div>
        <van-icon name="manager-o" size="48" color="#1989fa" />
      </div>
      
      <!-- 统计卡片 -->
      <div class="stats-grid">
        <div class="stats-card">
          <div class="stats-number">{{ totalQuestions }}</div>
          <div class="stats-label">题目总数</div>
        </div>
        <div class="stats-card">
          <div class="stats-number">{{ totalRecords }}</div>
          <div class="stats-label">导入记录</div>
        </div>
      </div>
      
      <!-- 功能菜单 -->
      <div class="menu-section">
        <h3 class="section-title">功能菜单</h3>
        
        <van-cell-group>
          <van-cell
            title="题目上传"
            label="上传Word文档批量导入题目"
            icon="plus"
            is-link
            @click="$router.push('/upload')"
          />
          <van-cell
            title="题目管理"
            label="查看、编辑、删除题目"
            icon="notes-o"
            is-link
            @click="$router.push('/questions')"
          />
          <van-cell
            title="导入记录"
            label="查看历史导入记录"
            icon="records"
            is-link
            @click="$router.push('/records')"
          />
          <van-cell
            title="刷题练习"
            label="进入刷题模式"
            icon="edit"
            is-link
            @click="$router.push('/practice')"
          />
        </van-cell-group>
      </div>
    </div>
    
    <!-- 用户菜单 -->
    <van-action-sheet
      v-model:show="showUserMenu"
      :actions="userMenuActions"
      @select="handleUserMenuSelect"
      cancel-text="取消"
    />
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'
import { Toast, showConfirmDialog } from 'vant'
import logger from '../utils/logger'

export default {
  name: 'Home',
  setup() {
    const store = useStore()
    const router = useRouter()
    
    const showUserMenu = ref(false)
    const totalQuestions = ref(0)
    const totalRecords = ref(0)
    
    const currentUser = computed(() => store.getters.currentUser)
    
    const userMenuActions = [
      { name: '退出登录', color: '#ee0a24' }
    ]
    
    // 获取统计数据
    const fetchStats = async () => {
      try {
        // 获取题目总数
        const questionsResult = await store.dispatch('fetchQuestions')
        if (questionsResult.success) {
          totalQuestions.value = store.getters.allQuestions.length
        }
        
        // 获取导入记录总数
        const recordsResult = await store.dispatch('fetchImportRecords')
        if (recordsResult.success) {
          totalRecords.value = store.getters.getImportRecords.length
        }
      } catch (error) {
        logger.error('获取统计数据失败', error)
      }
    }
    
    // 处理用户菜单选择
    const handleUserMenuSelect = async (action) => {
      showUserMenu.value = false
      
      if (action.name === '退出登录') {
        try {
          await showConfirmDialog({
            title: '确认退出',
            message: '确定要退出登录吗？'
          })
          
          store.dispatch('logout')
          Toast.success('已退出登录')
          logger.info('用户退出登录')
          router.push('/login')
        } catch (error) {
          // 用户取消
        }
      }
    }
    
    onMounted(() => {
      fetchStats()
    })
    
    return {
      showUserMenu,
      totalQuestions,
      totalRecords,
      currentUser,
      userMenuActions,
      handleUserMenuSelect
    }
  }
}
</script>

<style scoped>
.welcome-card {
  background: linear-gradient(135deg, #1989fa 0%, #1890ff 100%);
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 20px;
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.welcome-content h2 {
  font-size: 20px;
  font-weight: bold;
  margin-bottom: 4px;
}

.welcome-content p {
  font-size: 14px;
  opacity: 0.8;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 24px;
}

.stats-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.stats-number {
  font-size: 28px;
  font-weight: bold;
  color: #1989fa;
  margin-bottom: 4px;
}

.stats-label {
  font-size: 14px;
  color: #646566;
}

.menu-section {
  margin-bottom: 20px;
}

.section-title {
  font-size: 16px;
  font-weight: bold;
  color: #323233;
  margin-bottom: 12px;
  padding-left: 4px;
}

.van-cell-group {
  border-radius: 8px;
  overflow: hidden;
}
</style>