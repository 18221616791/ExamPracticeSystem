<template>
  <div class="page-container">
    <van-nav-bar title="练习统计" left-arrow @click-left="$router.back()" />
    
    <div class="content-wrapper">
      <!-- 总体统计 -->
      <div class="stats-overview">
        <div class="stats-card">
          <h3>总体统计</h3>
          
          <div class="stats-grid">
            <div class="stat-item">
              <div class="stat-value">{{ overallStats.totalQuestions }}</div>
              <div class="stat-label">总练习题数</div>
            </div>
            
            <div class="stat-item">
              <div class="stat-value correct">{{ overallStats.correctCount }}</div>
              <div class="stat-label">答对题数</div>
            </div>
            
            <div class="stat-item">
              <div class="stat-value wrong">{{ overallStats.wrongCount }}</div>
              <div class="stat-label">答错题数</div>
            </div>
            
            <div class="stat-item">
              <div class="stat-value">{{ overallStats.accuracy }}%</div>
              <div class="stat-label">总正确率</div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 时间筛选 -->
      <div class="time-filter">
        <van-tabs v-model:active="activeTab" @change="handleTabChange">
          <van-tab title="今日" name="today" />
          <van-tab title="本周" name="week" />
          <van-tab title="本月" name="month" />
          <van-tab title="全部" name="all" />
        </van-tabs>
      </div>
      
      <!-- 详细统计 -->
      <div v-if="loading" class="loading-container">
        <van-loading size="24px">加载中...</van-loading>
      </div>
      
      <div v-else class="detailed-stats">
        <!-- 练习记录 -->
        <div class="stats-section">
          <h4>练习记录</h4>
          
          <div v-if="practiceRecords.length === 0" class="empty-state">
            <van-icon name="bar-chart-o" size="48" />
            <p>暂无练习记录</p>
            <van-button
              type="primary"
              size="small"
              @click="$router.push('/practice')"
            >
              开始练习
            </van-button>
          </div>
          
          <div v-else class="records-list">
            <div
              v-for="record in practiceRecords"
              :key="record.id"
              class="record-item"
            >
              <div class="record-header">
                <div class="record-time">{{ formatDate(record.practiceTime) }}</div>
                <div class="record-mode">{{ getModeText(record.mode) }}</div>
              </div>
              
              <div class="record-stats">
                <div class="record-stat">
                  <span class="label">题数：</span>
                  <span class="value">{{ record.totalQuestions }}</span>
                </div>
                
                <div class="record-stat">
                  <span class="label">正确：</span>
                  <span class="value correct">{{ record.correctCount }}</span>
                </div>
                
                <div class="record-stat">
                  <span class="label">错误：</span>
                  <span class="value wrong">{{ record.wrongCount }}</span>
                </div>
                
                <div class="record-stat">
                  <span class="label">正确率：</span>
                  <span class="value">{{ record.accuracy }}%</span>
                </div>
              </div>
              
              <div class="record-actions">
                <van-button
                  size="small"
                  type="primary"
                  @click="viewRecordDetail(record)"
                >
                  查看详情
                </van-button>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 错题统计 -->
        <div class="stats-section">
          <h4>错题统计</h4>
          
          <div v-if="wrongQuestions.length === 0" class="empty-state">
            <van-icon name="smile-o" size="48" />
            <p>暂无错题记录</p>
          </div>
          
          <div v-else class="wrong-questions">
            <div class="wrong-summary">
              <span>共有 {{ wrongQuestions.length }} 道错题</span>
              <van-button
                size="small"
                type="warning"
                @click="practiceWrongQuestions"
              >
                练习错题
              </van-button>
            </div>
            
            <div class="wrong-list">
              <div
                v-for="question in wrongQuestions.slice(0, 5)"
                :key="question.id"
                class="wrong-item"
              >
                <div class="wrong-question">{{ question.question }}</div>
                <div class="wrong-count">错误 {{ question.wrongCount }} 次</div>
              </div>
              
              <div v-if="wrongQuestions.length > 5" class="more-wrong">
                <van-button
                  size="small"
                  type="default"
                  @click="viewAllWrongQuestions"
                >
                  查看全部错题 ({{ wrongQuestions.length }})
                </van-button>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 学习建议 -->
        <div class="stats-section">
          <h4>学习建议</h4>
          
          <div class="suggestions">
            <div v-for="suggestion in suggestions" :key="suggestion.type" class="suggestion-item">
              <van-icon :name="suggestion.icon" :color="suggestion.color" />
              <span>{{ suggestion.text }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 练习记录详情弹窗 -->
    <van-popup v-model:show="showRecordDetail" position="center" round>
      <div class="record-detail">
        <h3>练习详情</h3>
        
        <div v-if="selectedRecord" class="detail-content">
          <div class="detail-header">
            <div class="detail-item">
              <span class="label">练习时间：</span>
              <span class="value">{{ formatDate(selectedRecord.practiceTime) }}</span>
            </div>
            
            <div class="detail-item">
              <span class="label">练习模式：</span>
              <span class="value">{{ getModeText(selectedRecord.mode) }}</span>
            </div>
            
            <div class="detail-item">
              <span class="label">用时：</span>
              <span class="value">{{ formatDuration(selectedRecord.duration) }}</span>
            </div>
          </div>
          
          <div class="detail-stats">
            <div class="stat-row">
              <span>总题数：{{ selectedRecord.totalQuestions }}</span>
              <span>正确率：{{ selectedRecord.accuracy }}%</span>
            </div>
            
            <div class="stat-row">
              <span class="correct">答对：{{ selectedRecord.correctCount }}</span>
              <span class="wrong">答错：{{ selectedRecord.wrongCount }}</span>
            </div>
          </div>
          
          <div class="detail-questions">
            <h5>答题详情</h5>
            
            <div
              v-for="answer in selectedRecord.answers"
              :key="answer.questionId"
              class="answer-item"
              :class="{ 'correct': answer.isCorrect, 'wrong': !answer.isCorrect }"
            >
              <div class="answer-question">{{ answer.question }}</div>
              <div class="answer-info">
                <span>你的答案：{{ answer.userAnswer }}</span>
                <span v-if="!answer.isCorrect">正确答案：{{ answer.correctAnswer }}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="detail-actions">
          <van-button @click="showRecordDetail = false">关闭</van-button>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue'
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import logger from '../utils/logger'

export default {
  name: 'PracticeStats',
  setup() {
    const store = useStore()
    const router = useRouter()
    
    const loading = ref(false)
    const activeTab = ref('today')
    const showRecordDetail = ref(false)
    const selectedRecord = ref(null)
    const practiceRecords = ref([])
    const wrongQuestions = ref([])
    
    const overallStats = computed(() => store.getters.practiceStats)
    
    // 学习建议
    const suggestions = computed(() => {
      const stats = overallStats.value
      const suggestions = []
      
      if (stats.accuracy < 60) {
        suggestions.push({
          type: 'accuracy',
          icon: 'warning-o',
          color: '#ff4d4f',
          text: '正确率偏低，建议加强基础知识学习'
        })
      } else if (stats.accuracy >= 90) {
        suggestions.push({
          type: 'excellent',
          icon: 'success',
          color: '#52c41a',
          text: '正确率很高，继续保持！'
        })
      }
      
      if (wrongQuestions.value.length > 10) {
        suggestions.push({
          type: 'wrong',
          icon: 'info-o',
          color: '#1890ff',
          text: '错题较多，建议重点练习错题'
        })
      }
      
      if (practiceRecords.value.length === 0) {
        suggestions.push({
          type: 'practice',
          icon: 'bulb-o',
          color: '#fa8c16',
          text: '开始练习，提升你的知识水平'
        })
      }
      
      return suggestions
    })
    
    // 获取统计数据
    const fetchStats = async () => {
      loading.value = true
      try {
        const result = await store.dispatch('fetchPracticeStats', {
          timeRange: activeTab.value
        })
        
        if (result.success) {
          practiceRecords.value = result.data.records || []
          wrongQuestions.value = result.data.wrongQuestions || []
        } else {
          Toast.fail(result.message)
        }
      } catch (error) {
        Toast.fail('获取统计数据失败')
        logger.error('获取练习统计失败', error)
      } finally {
        loading.value = false
      }
    }
    
    // 切换时间范围
    const handleTabChange = () => {
      fetchStats()
    }
    
    // 获取模式文本
    const getModeText = (mode) => {
      const modeMap = {
        'random': '随机练习',
        'sequential': '顺序练习',
        'wrong': '错题练习'
      }
      return modeMap[mode] || '未知模式'
    }
    
    // 格式化日期
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
    
    // 格式化时长
    const formatDuration = (seconds) => {
      if (!seconds) return '-'
      const minutes = Math.floor(seconds / 60)
      const remainingSeconds = seconds % 60
      return `${minutes}分${remainingSeconds}秒`
    }
    
    // 查看练习记录详情
    const viewRecordDetail = (record) => {
      selectedRecord.value = record
      showRecordDetail.value = true
    }
    
    // 练习错题
    const practiceWrongQuestions = () => {
      router.push({
        path: '/practice',
        query: { mode: 'wrong' }
      })
    }
    
    // 查看所有错题
    const viewAllWrongQuestions = () => {
      // 可以跳转到专门的错题页面
      showToast('功能开发中')
    }
    
    onMounted(() => {
      fetchStats()
    })
    
    return {
      loading,
      activeTab,
      showRecordDetail,
      selectedRecord,
      practiceRecords,
      wrongQuestions,
      overallStats,
      suggestions,
      handleTabChange,
      getModeText,
      formatDate,
      formatDuration,
      viewRecordDetail,
      practiceWrongQuestions,
      viewAllWrongQuestions
    }
  }
}
</script>

<style scoped>
.stats-overview {
  margin-bottom: 16px;
}

.stats-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.stats-card h3 {
  text-align: center;
  margin-bottom: 20px;
  color: #323233;
  font-size: 18px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.stat-item {
  text-align: center;
  padding: 16px;
  background: #f7f8fa;
  border-radius: 8px;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #323233;
  margin-bottom: 4px;
}

.stat-value.correct {
  color: #52c41a;
}

.stat-value.wrong {
  color: #ff4d4f;
}

.stat-label {
  font-size: 12px;
  color: #646566;
}

.time-filter {
  background: white;
  border-radius: 12px;
  margin-bottom: 16px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.detailed-stats {
  margin-bottom: 20px;
}

.stats-section {
  background: white;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.stats-section h4 {
  margin-bottom: 16px;
  color: #323233;
  font-size: 16px;
  font-weight: 500;
}

.stats-section h5 {
  margin: 16px 0 12px 0;
  color: #646566;
  font-size: 14px;
  font-weight: 500;
}

.records-list {
  margin-bottom: 16px;
}

.record-item {
  background: #f7f8fa;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
}

.record-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.record-time {
  font-size: 14px;
  color: #323233;
  font-weight: 500;
}

.record-mode {
  font-size: 12px;
  color: #646566;
  background: white;
  padding: 2px 8px;
  border-radius: 4px;
}

.record-stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  margin-bottom: 12px;
}

.record-stat {
  font-size: 12px;
}

.record-stat .label {
  color: #646566;
}

.record-stat .value {
  color: #323233;
  font-weight: 500;
}

.record-stat .value.correct {
  color: #52c41a;
}

.record-stat .value.wrong {
  color: #ff4d4f;
}

.record-actions {
  text-align: right;
}

.wrong-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-size: 14px;
  color: #646566;
}

.wrong-list {
  margin-bottom: 16px;
}

.wrong-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: #f7f8fa;
  border-radius: 6px;
  margin-bottom: 8px;
}

.wrong-question {
  flex: 1;
  font-size: 14px;
  color: #323233;
  margin-right: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wrong-count {
  font-size: 12px;
  color: #ff4d4f;
  flex-shrink: 0;
}

.more-wrong {
  text-align: center;
  margin-top: 12px;
}

.suggestions {
  margin-bottom: 16px;
}

.suggestion-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: #f7f8fa;
  border-radius: 6px;
  margin-bottom: 8px;
  font-size: 14px;
  color: #323233;
}

.record-detail {
  padding: 24px;
  width: 90vw;
  max-width: 500px;
  max-height: 80vh;
  overflow-y: auto;
}

.record-detail h3 {
  text-align: center;
  margin-bottom: 20px;
  color: #323233;
}

.detail-header {
  margin-bottom: 16px;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 14px;
}

.detail-item .label {
  color: #646566;
}

.detail-item .value {
  color: #323233;
  font-weight: 500;
}

.detail-stats {
  background: #f7f8fa;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 14px;
}

.stat-row .correct {
  color: #52c41a;
}

.stat-row .wrong {
  color: #ff4d4f;
}

.detail-questions {
  margin-bottom: 20px;
}

.answer-item {
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 8px;
  border-left: 4px solid #ebedf0;
}

.answer-item.correct {
  background: #f6ffed;
  border-left-color: #52c41a;
}

.answer-item.wrong {
  background: #fff2f0;
  border-left-color: #ff4d4f;
}

.answer-question {
  font-size: 14px;
  color: #323233;
  margin-bottom: 6px;
  font-weight: 500;
}

.answer-info {
  font-size: 12px;
  color: #646566;
}

.answer-info span {
  display: block;
  margin-bottom: 2px;
}

.detail-actions {
  text-align: center;
}
</style>