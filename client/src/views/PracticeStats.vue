<template>
  <div class="practice-stats-page">
    <van-nav-bar title="练习统计" left-arrow @click-left="$router.back()" />
    
    <!-- 总体统计卡片 -->
    <div class="stats-overview">
      <div class="stats-card">
        <div class="stats-header">
          <van-icon name="chart-trending-o" color="#1989fa" />
          <span class="stats-title">总体统计</span>
        </div>
        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-value">{{ overallStats?.totalQuestions || 0 }}</div>
            <div class="stat-label">总题数</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ overallStats?.totalAnswered || 0 }}</div>
            <div class="stat-label">已答题</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ overallStats?.correctCount || 0 }}</div>
            <div class="stat-label">答对数</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ (overallStats?.accuracy || 0).toFixed(1) }}%</div>
            <div class="stat-label">正确率</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 功能导航 -->
    <div class="function-nav">
      <van-grid :column-num="3" :border="false">
        <van-grid-item
          icon="clock-o"
          text="练习历史"
          @click="activeTab = 'history'"
          :class="{ active: activeTab === 'history' }"
        />
        <van-grid-item
          icon="bar-chart-o"
          text="成绩分析"
          @click="activeTab = 'analysis'"
          :class="{ active: activeTab === 'analysis' }"
        />
        <van-grid-item
          icon="warning-o"
          text="错题集"
          @click="activeTab = 'wrong'"
          :class="{ active: activeTab === 'wrong' }"
        />
      </van-grid>
    </div>

    <!-- 内容区域 -->
    <div class="content-area">
      <!-- 练习历史 -->
      <div v-if="activeTab === 'history'" class="history-section">
        <div class="section-header">
          <h3>练习历史</h3>
          <van-button
            type="primary"
            size="small"
            @click="refreshHistory"
            :loading="historyLoading"
          >
            刷新
          </van-button>
        </div>
        
        <div v-if="historyLoading" class="loading-container">
          <van-loading size="24px">加载中...</van-loading>
        </div>
        
        <div v-else-if="practiceHistory.length === 0" class="empty-state">
          <van-icon name="notes-o" size="48" />
          <p>暂无练习记录</p>
          <van-button
            type="primary"
            size="small"
            @click="$router.push('/practice')"
          >
            开始练习
          </van-button>
        </div>
        
        <div v-else class="history-list">
          <div
            v-for="record in practiceHistory"
            :key="record.id"
            class="history-card"
            @click="viewHistoryDetail(record)"
          >
            <div class="history-header">
              <div class="history-info">
                <van-icon name="edit" color="#1989fa" />
                <span class="history-title">第{{ record.sessionId }}次练习</span>
              </div>
              <div class="history-score" :class="getScoreClass(record.accuracy)">
                {{ Number(record.accuracy || 0).toFixed(1) }}%
              </div>
            </div>
            
            <div class="history-content">
              <div class="history-item">
                <span class="label">练习时间：</span>
                <span class="value">{{ formatDate(record.createdAt) }}</span>
              </div>
              
              <div class="history-item">
                <span class="label">答题数量：</span>
                <span class="value">{{ record.totalQuestions }} 道</span>
              </div>
              
              <div class="history-item">
                <span class="label">正确/错误：</span>
                <span class="value">
                  <span class="correct">{{ record.correctCount }}</span> / 
                  <span class="wrong">{{ record.wrongCount }}</span>
                </span>
              </div>
              
              <div class="history-item">
                <span class="label">用时：</span>
                <span class="value">{{ formatDuration(record.totalTime) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 成绩分析 -->
      <div v-if="activeTab === 'analysis'" class="analysis-section">
        <div class="section-header">
          <h3>成绩分析</h3>
        </div>
        
        <!-- 分类统计 -->
        <div class="category-stats">
          <h4>分类统计</h4>
          <div v-if="categoryStats.length === 0" class="empty-state">
            <p>暂无分类数据</p>
          </div>
          <div v-else class="category-list">
            <div
              v-for="category in categoryStats"
              :key="category.name"
              class="category-card"
            >
              <div class="category-header">
                <span class="category-name">{{ category.name }}</span>
                <span class="category-accuracy" :class="getScoreClass(category.accuracy)">
                  {{ Number(category.accuracy || 0).toFixed(1) }}%
                </span>
              </div>
              <div class="category-progress">
                <van-progress
                  :percentage="category.accuracy"
                  :color="getProgressColor(category.accuracy)"
                  :show-pivot="false"
                />
              </div>
              <div class="category-details">
                <span>答对 {{ category.correctCount }} / {{ category.totalCount }} 题</span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 最近活动 -->
        <div class="recent-activity">
          <h4>最近活动</h4>
          <div v-if="recentActivity.length === 0" class="empty-state">
            <p>暂无最近活动</p>
          </div>
          <div v-else class="activity-list">
            <div
              v-for="activity in recentActivity"
              :key="activity.date"
              class="activity-item"
            >
              <div class="activity-date">{{ formatDate(activity.date) }}</div>
              <div class="activity-stats">
                <span class="activity-count">{{ activity.count }} 题</span>
                <span class="activity-accuracy" :class="getScoreClass(activity.accuracy)">
                  {{ Number(activity.accuracy || 0).toFixed(1) }}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 错题集 -->
      <div v-if="activeTab === 'wrong'" class="wrong-section">
        <div class="section-header">
          <h3>错题集</h3>
          <van-button
            type="primary"
            size="small"
            @click="refreshWrongQuestions"
            :loading="wrongLoading"
          >
            刷新
          </van-button>
        </div>
        
        <div v-if="wrongLoading" class="loading-container">
          <van-loading size="24px">加载中...</van-loading>
        </div>
        
        <div v-else-if="wrongQuestions.length === 0" class="empty-state">
          <van-icon name="smile-o" size="48" />
          <p>暂无错题，继续加油！</p>
        </div>
        
        <div v-else class="wrong-list">
          <div class="wrong-stats">
            <span>共 {{ wrongQuestions.length }} 道错题</span>
            <van-button
              type="warning"
              size="small"
              @click="practiceWrongQuestions"
            >
              错题练习
            </van-button>
          </div>
          
          <div
            v-for="question in wrongQuestions"
            :key="question.id"
            class="wrong-card"
            @click="viewQuestionDetail(question)"
          >
            <div class="wrong-header">
              <div class="question-type">{{ question.type }}</div>
              <div class="wrong-count">错误 {{ question.wrongCount }} 次</div>
            </div>
            
            <div class="question-content">
              <div class="question-text">{{ question.question }}</div>
            </div>
            
            <div class="wrong-footer">
              <span class="last-wrong">最近错误：{{ formatDate(question.lastWrongAt) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'
import { showToast, showConfirmDialog } from 'vant'
import axios from 'axios'

export default {
  name: 'PracticeStats',
  setup() {
    const store = useStore()
    const router = useRouter()
    
    const activeTab = ref('history')
    const historyLoading = ref(false)
    const wrongLoading = ref(false)
    
    // 数据状态
    const overallStats = ref({
      totalQuestions: 0,
      totalAnswered: 0,
      correctCount: 0,
      incorrectCount: 0,
      accuracy: 0
    })
    
    const practiceHistory = ref([])
    const categoryStats = ref([])
    const recentActivity = ref([])
    const wrongQuestions = ref([])
    
    // 计算属性
    const isLoggedIn = computed(() => store.getters.isLoggedIn)
    
    // 获取总体统计
    const fetchOverallStats = async () => {
      try {
        const response = await axios.get('/api/practice/stats', {
          headers: {
            Authorization: `Bearer ${store.getters.userToken}`
          }
        })
        
        if (response.data.success) {
          overallStats.value = response.data.data
          categoryStats.value = response.data.data.categoryStats || []
          recentActivity.value = response.data.data.recentActivity || []
        }
      } catch (error) {
        console.error('获取统计数据失败:', error)
        if (!isLoggedIn.value) {
          showToast('请先登录')
          router.push('/login')
        }
      }
    }
    
    // 获取练习历史
    const fetchPracticeHistory = async () => {
      if (!isLoggedIn.value) {
        showToast('请先登录')
        router.push('/login')
        return
      }
      
      historyLoading.value = true
      try {
        const result = await store.dispatch('fetchPracticeHistory', {
          page: 1,
          limit: 20
        })
        
        if (result.success) {
          practiceHistory.value = result.data || []
        } else {
          showToast(result.message || '获取练习历史失败')
        }
      } catch (error) {
        console.error('获取练习历史失败:', error)
        showToast('获取练习历史失败')
      } finally {
        historyLoading.value = false
      }
    }
    
    // 获取错题集
    const fetchWrongQuestions = async () => {
      if (!isLoggedIn.value) {
        showToast('请先登录')
        router.push('/login')
        return
      }
      
      wrongLoading.value = true
      try {
        const result = await store.dispatch('fetchWrongQuestions', {
          page: 1,
          limit: 20
        })
        
        if (result.success) {
          wrongQuestions.value = result.data || []
        } else {
          showToast(result.message || '获取错题集失败')
        }
      } catch (error) {
        console.error('获取错题集失败:', error)
        showToast('获取错题集失败')
      } finally {
        wrongLoading.value = false
      }
    }
    
    // 刷新历史记录
    const refreshHistory = () => {
      fetchPracticeHistory()
    }
    
    // 刷新错题集
    const refreshWrongQuestions = () => {
      fetchWrongQuestions()
    }
    
    // 查看历史详情
    const viewHistoryDetail = (record) => {
      // 可以跳转到详细页面或显示弹窗
      showToast('功能开发中')
    }
    
    // 查看题目详情
    const viewQuestionDetail = (question) => {
      // 可以跳转到题目详情页面
      showToast('功能开发中')
    }
    
    // 错题练习
    const practiceWrongQuestions = () => {
      if (wrongQuestions.value.length === 0) {
        showToast('暂无错题')
        return
      }
      
      // 跳转到练习页面，传递错题ID列表
      const wrongIds = wrongQuestions.value.map(q => q.id)
      router.push({
        path: '/practice',
        query: {
          type: 'wrong',
          ids: wrongIds.join(',')
        }
      })
    }
    
    // 工具函数
    const formatDate = (dateString) => {
      if (!dateString) return '-'
      const date = new Date(dateString)
      return date.toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
    
    const formatDuration = (seconds) => {
      if (!seconds) return '-'
      const minutes = Math.floor(seconds / 60)
      const remainingSeconds = seconds % 60
      return `${minutes}分${remainingSeconds}秒`
    }
    
    const getScoreClass = (accuracy) => {
      if (accuracy >= 80) return 'score-excellent'
      if (accuracy >= 60) return 'score-good'
      return 'score-poor'
    }
    
    const getProgressColor = (accuracy) => {
      if (accuracy >= 80) return '#07c160'
      if (accuracy >= 60) return '#ff976a'
      return '#ee0a24'
    }
    
    // 生命周期
    onMounted(() => {
      fetchOverallStats()
      fetchPracticeHistory()
      fetchWrongQuestions()
    })
    
    return {
      activeTab,
      historyLoading,
      wrongLoading,
      overallStats,
      practiceHistory,
      categoryStats,
      recentActivity,
      wrongQuestions,
      refreshHistory,
      refreshWrongQuestions,
      viewHistoryDetail,
      viewQuestionDetail,
      practiceWrongQuestions,
      formatDate,
      formatDuration,
      getScoreClass,
      getProgressColor
    }
  }
}
</script>

<style scoped>
.practice-stats-page {
  min-height: 100vh;
  background-color: #f7f8fa;
}

.stats-overview {
  padding: 16px;
}

.stats-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.stats-header {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
}

.stats-title {
  margin-left: 8px;
  font-size: 18px;
  font-weight: 600;
  color: #323233;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.stat-item {
  text-align: center;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: #1989fa;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 12px;
  color: #969799;
}

.function-nav {
  margin: 0 16px 16px;
  background: white;
  border-radius: 12px;
  overflow: hidden;
}

.function-nav .van-grid-item {
  padding: 20px 0;
}

.function-nav .van-grid-item.active {
  background-color: #f0f9ff;
  color: #1989fa;
}

.content-area {
  padding: 0 16px 16px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #323233;
}

.section-header h4 {
  margin: 20px 0 12px;
  font-size: 16px;
  font-weight: 600;
  color: #323233;
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px 0;
  background: white;
  border-radius: 12px;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  background: white;
  border-radius: 12px;
}

.empty-state .van-icon {
  margin-bottom: 16px;
  color: #c8c9cc;
}

.empty-state p {
  margin: 0 0 16px;
  color: #969799;
}

/* 历史记录样式 */
.history-list {
  space-y: 12px;
}

.history-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  cursor: pointer;
  transition: all 0.3s ease;
}

.history-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.history-info {
  display: flex;
  align-items: center;
}

.history-title {
  margin-left: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #323233;
}

.history-score {
  font-size: 18px;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: 16px;
}

.score-excellent {
  color: #07c160;
  background-color: #f0f9ff;
}

.score-good {
  color: #ff976a;
  background-color: #fff7ed;
}

.score-poor {
  color: #ee0a24;
  background-color: #fef2f2;
}

.history-content {
  space-y: 8px;
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.history-item .label {
  font-size: 14px;
  color: #969799;
}

.history-item .value {
  font-size: 14px;
  color: #323233;
}

.correct {
  color: #07c160;
}

.wrong {
  color: #ee0a24;
}

/* 分类统计样式 */
.category-list {
  space-y: 12px;
}

.category-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.category-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.category-name {
  font-size: 16px;
  font-weight: 600;
  color: #323233;
}

.category-accuracy {
  font-size: 16px;
  font-weight: 600;
}

.category-progress {
  margin-bottom: 8px;
}

.category-details {
  font-size: 12px;
  color: #969799;
}

/* 最近活动样式 */
.activity-list {
  background: white;
  border-radius: 12px;
  overflow: hidden;
}

.activity-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #f7f8fa;
}

.activity-item:last-child {
  border-bottom: none;
}

.activity-date {
  font-size: 14px;
  color: #323233;
}

.activity-stats {
  display: flex;
  align-items: center;
  gap: 12px;
}

.activity-count {
  font-size: 14px;
  color: #969799;
}

.activity-accuracy {
  font-size: 14px;
  font-weight: 600;
}

/* 错题集样式 */
.wrong-stats {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: white;
  border-radius: 12px;
  margin-bottom: 16px;
}

.wrong-list {
  space-y: 12px;
}

.wrong-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  cursor: pointer;
  transition: all 0.3s ease;
}

.wrong-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}

.wrong-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.question-type {
  font-size: 12px;
  color: #1989fa;
  background-color: #f0f9ff;
  padding: 4px 8px;
  border-radius: 4px;
}

.wrong-count {
  font-size: 12px;
  color: #ee0a24;
  background-color: #fef2f2;
  padding: 4px 8px;
  border-radius: 4px;
}

.question-content {
  margin-bottom: 12px;
}

.question-text {
  font-size: 14px;
  color: #323233;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.wrong-footer {
  font-size: 12px;
  color: #969799;
}
</style>