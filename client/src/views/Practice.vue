<template>
  <div class="page-container">
    <van-nav-bar title="刷题练习" left-arrow @click-left="handleBack">
      <template #right>
        <van-icon name="bar-chart-o" @click="$router.push('/practice/stats')" />
      </template>
    </van-nav-bar>
    
    <div class="content-wrapper">
      <!-- 练习模式选择 -->
      <div v-if="!practiceStarted" class="mode-selection">
        <div class="mode-card">
          <h3>选择练习模式</h3>
          
          <van-radio-group v-model="practiceMode" direction="vertical">
            <van-radio name="random" icon-size="18px">
              <template #icon="props">
                <van-icon :name="props.checked ? 'success' : 'circle'" />
              </template>
              <div class="mode-option">
                <div class="mode-title">随机练习</div>
                <div class="mode-desc">从题库中随机选择题目进行练习</div>
              </div>
            </van-radio>
            
            <van-radio name="sequential" icon-size="18px">
              <template #icon="props">
                <van-icon :name="props.checked ? 'success' : 'circle'" />
              </template>
              <div class="mode-option">
                <div class="mode-title">顺序练习</div>
                <div class="mode-desc">按照题目顺序依次练习</div>
              </div>
            </van-radio>
            
            <van-radio name="wrong" icon-size="18px">
              <template #icon="props">
                <van-icon :name="props.checked ? 'success' : 'circle'" />
              </template>
              <div class="mode-option">
                <div class="mode-title">错题练习</div>
                <div class="mode-desc">重新练习之前答错的题目</div>
              </div>
            </van-radio>
          </van-radio-group>
          
          <div class="practice-settings">
            <van-field
              v-model="questionCount"
              type="number"
              label="题目数量"
              placeholder="请输入题目数量"
              :rules="[{ required: true, message: '请输入题目数量' }]"
            />
          </div>
          
          <div class="start-button">
            <van-button
              type="primary"
              size="large"
              block
              @click="startPractice"
              :loading="loading"
            >
              开始练习
            </van-button>
          </div>
        </div>
      </div>
      
      <!-- 练习进行中 -->
      <div v-else-if="currentQuestion" class="practice-content">
        <!-- 进度条 -->
        <div class="progress-bar">
          <van-progress
            :percentage="progressPercentage"
            stroke-width="6px"
            color="#1989fa"
          />
          <div class="progress-text">
            {{ currentQuestionIndex + 1 }} / {{ practiceQuestions.length }}
          </div>
        </div>
        
        <!-- 题目内容 -->
        <div class="question-container">
          <div class="question-header">
            <span class="question-number">#{{ currentQuestion.id }}</span>
            <div class="timer-display">
              <van-icon name="clock-o" />
              <span class="timer-text">{{ formatTime(currentQuestionTime) }}</span>
            </div>
          </div>
          
          <div class="question-content">
            <div class="question-title">{{ currentQuestion.question_text }}</div>
            
            <!-- 单选题 -->
            <div v-if="currentQuestion.question_type === 'single'" class="question-options">
              <div
                v-for="(option, index) in currentQuestion.options"
                :key="index"
                class="option-item"
                :class="{
                  'selected': selectedAnswer === ['A', 'B', 'C', 'D', 'E'][index],
                  'correct': showResult && option === currentQuestion.correct_answer,
                  'wrong': showResult && selectedAnswer === ['A', 'B', 'C', 'D', 'E'][index] && option !== currentQuestion.correct_answer
                }"
                @click="selectAnswer(option, index)"
              >
                <span class="option-label">{{ ['A', 'B', 'C', 'D', 'E'][index] }}</span>
                <span class="option-text">{{ option }}</span>
              </div>
            </div>
            
            <!-- 多选题 -->
            <div v-else-if="currentQuestion.question_type === 'multiple'" class="question-options">
              <div
                v-for="(option, index) in currentQuestion.options"
                :key="index"
                class="option-item multiple"
                :class="{
                  'selected': selectedAnswers.includes(['A', 'B', 'C', 'D', 'E'][index]),
                  'correct': showResult && currentQuestion.correct_answer.includes(option),
                  'wrong': showResult && selectedAnswers.includes(['A', 'B', 'C', 'D', 'E'][index]) && !currentQuestion.correct_answer.includes(option)
                }"
                @click="selectMultipleAnswer(option, index)"
              >
                <span class="option-label">{{ ['A', 'B', 'C', 'D', 'E'][index] }}</span>
                <span class="option-text">{{ option }}</span>
                <van-checkbox :model-value="selectedAnswers.includes(['A', 'B', 'C', 'D', 'E'][index])" />
              </div>
            </div>
            
            <!-- 判断题 -->
            <div v-else-if="currentQuestion.question_type === 'judge'" class="question-options">
              <div
                class="option-item"
                :class="{
                  'selected': selectedAnswer === '正确',
                  'correct': showResult && currentQuestion.correct_answer === '正确',
                  'wrong': showResult && selectedAnswer === '正确' && currentQuestion.correct_answer !== '正确'
                }"
                @click="selectAnswer('正确')"
              >
                <span class="option-label">√</span>
                <span class="option-text">正确</span>
              </div>
              <div
                class="option-item"
                :class="{
                  'selected': selectedAnswer === '错误',
                  'correct': showResult && currentQuestion.correct_answer === '错误',
                  'wrong': showResult && selectedAnswer === '错误' && currentQuestion.correct_answer !== '错误'
                }"
                @click="selectAnswer('错误')"
              >
                <span class="option-label">×</span>
                <span class="option-text">错误</span>
              </div>
            </div>
            
            <!-- 填空题 -->
            <div v-else-if="currentQuestion.question_type === 'fill'" class="fill-answer">
              <van-field
                v-model="fillAnswer"
                placeholder="请输入答案"
                :readonly="showResult"
                class="fill-input"
              />
              <div v-if="showResult" class="correct-answer">
                正确答案：{{ currentQuestion.correct_answer }}
              </div>
            </div>
            
            <!-- 问答题 -->
            <div v-else-if="currentQuestion.question_type === 'essay'" class="essay-answer">
              <van-field
                v-model="essayAnswer"
                type="textarea"
                placeholder="请输入答案"
                :readonly="showResult"
                rows="4"
                class="essay-input"
              />
              <div v-if="showResult" class="correct-answer">
                参考答案：{{ currentQuestion.correct_answer }}
              </div>
            </div>
            
            <!-- 解析 -->
            <div v-if="showResult && currentQuestion.explanation" class="explanation">
              <div class="explanation-title">解析：</div>
              <div class="explanation-content">{{ currentQuestion.explanation }}</div>
            </div>
          </div>
        </div>
        
        <!-- 操作按钮 -->
        <div class="action-buttons">
          <van-button
            v-if="!showResult"
            type="primary"
            size="large"
            block
            @click="submitAnswer"
            :disabled="!canSubmit"
          >
            提交答案
          </van-button>
          
          <div v-else class="result-buttons">
            <van-button
              v-if="currentQuestionIndex < practiceQuestions.length - 1"
              type="primary"
              size="large"
              @click="nextQuestion"
            >
              下一题
            </van-button>
            
            <van-button
              v-else
              type="success"
              size="large"
              @click="finishPractice"
            >
              完成练习
            </van-button>
          </div>
        </div>
      </div>
      
      <!-- 练习结果 -->
      <div v-else-if="practiceResult" class="practice-result">
        <div class="result-card">
          <div class="result-header">
            <van-icon name="trophy-o" size="48" color="#ffd700" />
            <h3>练习完成！</h3>
          </div>
          
          <div class="result-stats">
            <div class="stat-item">
              <div class="stat-value">{{ practiceResult.totalQuestions }}</div>
              <div class="stat-label">总题数</div>
            </div>
            
            <div class="stat-item">
              <div class="stat-value correct">{{ practiceResult.correctCount }}</div>
              <div class="stat-label">答对</div>
            </div>
            
            <div class="stat-item">
              <div class="stat-value wrong">{{ practiceResult.wrongCount }}</div>
              <div class="stat-label">答错</div>
            </div>
            
            <div class="stat-item">
              <div class="stat-value">{{ practiceResult.accuracy }}%</div>
              <div class="stat-label">正确率</div>
            </div>
            
            <div class="stat-item">
              <div class="stat-value">{{ formatTime(practiceResult.totalTime || 0) }}</div>
              <div class="stat-label">总用时</div>
            </div>
          </div>
          
          <div class="result-actions">
            <van-button
              type="primary"
              size="large"
              @click="restartPractice"
            >
              再次练习
            </van-button>
            
            <van-button
              type="default"
              size="large"
              @click="viewStats"
            >
              查看统计
            </van-button>
          </div>
        </div>
      </div>
      
      <!-- 加载状态 -->
      <div v-else-if="loading" class="loading-container">
        <van-loading size="24px">加载题目中...</van-loading>
      </div>
      
      <!-- 无题目状态 -->
      <div v-else class="empty-state">
        <van-icon name="notes-o" size="48" />
        <p>暂无可练习的题目</p>
        <van-button
          type="primary"
          size="small"
          @click="$router.push('/upload')"
        >
          去上传题目
        </van-button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useStore } from 'vuex'
import { useRouter, useRoute } from 'vue-router'
import { showToast, showConfirmDialog } from 'vant'
import logger from '../utils/logger'

export default {
  name: 'Practice',
  setup() {
    const store = useStore()
    const router = useRouter()
    const route = useRoute()
    
    const loading = ref(false)
    const practiceStarted = ref(false)
    const practiceMode = ref('random')
    const questionCount = ref(10)
    const practiceQuestions = ref([])
    const currentQuestionIndex = ref(0)
    const selectedAnswer = ref('')
    const selectedAnswers = ref([]) // 多选题答案
    const fillAnswer = ref('') // 填空题答案
    const essayAnswer = ref('') // 问答题答案
    const showResult = ref(false)
    const practiceResult = ref(null)
    const userAnswers = ref([])
    const questionStartTime = ref(null) // 题目开始时间
    const totalTimeSpent = ref(0) // 总答题时间（秒）
    const currentTime = ref(Date.now()) // 当前时间，用于实时更新计时器
    
    // 定时器更新当前时间
    let timer = null
    const startTimer = () => {
      timer = setInterval(() => {
        currentTime.value = Date.now()
      }, 1000)
    }
    
    const stopTimer = () => {
      if (timer) {
        clearInterval(timer)
        timer = null
      }
    }
    
    const currentQuestion = computed(() => {
      if (practiceQuestions.value.length > 0 && currentQuestionIndex.value < practiceQuestions.value.length) {
        const question = practiceQuestions.value[currentQuestionIndex.value]
        // 后端已经提供了options字段，无需前端处理
        return question
      }
      return null
    })
    
    const progressPercentage = computed(() => {
      if (practiceQuestions.value.length === 0) return 0
      return Math.round(((currentQuestionIndex.value + 1) / practiceQuestions.value.length) * 100)
    })
    
    // 当前题目已用时间（秒）
    const currentQuestionTime = computed(() => {
      if (!questionStartTime.value) return 0
      return Math.floor((currentTime.value - questionStartTime.value) / 1000)
    })
    
    // 格式化时间显示（mm:ss）
    const formatTime = (seconds) => {
      const mins = Math.floor(seconds / 60)
      const secs = seconds % 60
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    
    // 判断是否可以提交答案
    const canSubmit = computed(() => {
      if (!currentQuestion.value) return false
      
      const questionType = currentQuestion.value.question_type
      
      if (questionType === 'single' || questionType === 'judge') {
        return !!selectedAnswer.value
      } else if (questionType === 'multiple') {
        return selectedAnswers.value.length > 0
      } else if (questionType === 'fill') {
        return !!fillAnswer.value.trim()
      } else if (questionType === 'essay') {
        return !!essayAnswer.value.trim()
      }
      
      return false
    })
    
    // 开始练习
    const startPractice = async () => {
      if (practiceMode.value !== 'wrong' && (!questionCount.value || questionCount.value <= 0)) {
        showToast('请输入有效的题目数量')
        return
      }
      
      loading.value = true
      try {
        const params = {
          mode: practiceMode.value,
          count: parseInt(questionCount.value || 10)
        }
        
        // 如果是错题练习模式
        if (practiceMode.value === 'wrong') {
          // 检查是否有指定的错题ID列表
          const wrongIds = route.query.ids
          if (wrongIds) {
            params.ids = wrongIds.split(',').map(id => parseInt(id))
          } else {
            params.count = 50 // 默认获取最近50道错题
          }
        }
        
        const result = await store.dispatch('fetchPracticeQuestions', params)    
        if (result.success && result.data.length > 0) {
          practiceQuestions.value = result.data
          practiceStarted.value = true
          currentQuestionIndex.value = 0
          userAnswers.value = []
          totalTimeSpent.value = 0
          // 开始第一道题的计时
          questionStartTime.value = Date.now()
          startTimer() // 启动计时器
          logger.info('开始练习', { mode: practiceMode.value, count: result.data.length })
        } else {
          if (practiceMode.value === 'wrong') {
            showToast('暂无错题，请先进行其他练习')
          } else {
            showToast(result.message || '获取练习题目失败')
          }
        }
      } catch (error) {
        showToast('获取练习题目失败')
        logger.error('获取练习题目失败', error)
      } finally {
        loading.value = false
      }
    }
    
    // 选择答案
    const selectAnswer = (answer, index) => {
      if (showResult.value) return
      // 对于选择题，存储选项标号（A、B、C、D等）
      if (currentQuestion.value.question_type === 'single') {
        selectedAnswer.value = ['A', 'B', 'C', 'D', 'E'][index]
      } else {
        // 判断题仍然存储文本
        selectedAnswer.value = answer
      }
    }
    
    // 多选题选择答案
    const selectMultipleAnswer = (answer, index) => {
      if (showResult.value) return
      const optionLabel = ['A', 'B', 'C', 'D', 'E'][index]
      const labelIndex = selectedAnswers.value.indexOf(optionLabel)
      if (labelIndex > -1) {
        selectedAnswers.value.splice(labelIndex, 1)
      } else {
        selectedAnswers.value.push(optionLabel)
      }
    }
    
    // 提交答案
    const submitAnswer = async () => {
      let userAnswer = ''
      let isCorrect = false
      
      const questionType = currentQuestion.value.question_type
      const correctAnswer = currentQuestion.value.correct_answer
      
      // 根据题型获取用户答案并判断正确性
      if (questionType === 'single') {
        if (!selectedAnswer.value) return
        userAnswer = selectedAnswer.value
        // 单选题：将正确答案文本转换为对应的标号进行比较
        const correctIndex = currentQuestion.value.options.indexOf(correctAnswer)
        const correctLabel = correctIndex !== -1 ? ['A', 'B', 'C', 'D', 'E'][correctIndex] : ''
        isCorrect = selectedAnswer.value === correctLabel
      } else if (questionType === 'judge') {
        if (!selectedAnswer.value) return
        userAnswer = selectedAnswer.value
        isCorrect = selectedAnswer.value === correctAnswer
      } else if (questionType === 'multiple') {
        if (selectedAnswers.value.length === 0) return
        userAnswer = selectedAnswers.value.join(',')
        // 多选题：将正确答案文本转换为对应的标号进行比较
        const correctOptions = correctAnswer.split(',')
        const correctLabels = correctOptions.map(option => {
          const index = currentQuestion.value.options.indexOf(option)
          return index !== -1 ? ['A', 'B', 'C', 'D', 'E'][index] : ''
        }).filter(label => label !== '')
        isCorrect = selectedAnswers.value.length === correctLabels.length && 
                   selectedAnswers.value.every(answer => correctLabels.includes(answer))
      } else if (questionType === 'fill') {
        if (!fillAnswer.value.trim()) return
        userAnswer = fillAnswer.value.trim()
        isCorrect = userAnswer === correctAnswer
      } else if (questionType === 'essay') {
        if (!essayAnswer.value.trim()) return
        userAnswer = essayAnswer.value.trim()
        // 问答题暂时不自动判断正确性，需要人工评判
        isCorrect = false
      }
      
      // 计算答题时间
      const currentTime = Date.now()
      const timeSpent = questionStartTime.value ? Math.round((currentTime - questionStartTime.value) / 1000) : 0
      totalTimeSpent.value += timeSpent
      
      // 记录用户答案
      userAnswers.value.push({
        questionId: currentQuestion.value.id,
        userAnswer: userAnswer,
        correctAnswer: correctAnswer,
        isCorrect: isCorrect,
        timeSpent: timeSpent
      })
      
      // 提交答案到后端
      try {
        await store.dispatch('submitAnswer', {
          questionId: currentQuestion.value.id,
          selectedAnswer: userAnswer,
          timeSpent: timeSpent,
          isCorrect: isCorrect
        })
      } catch (error) {
        logger.error('提交答案失败', error)
      }
      
      showResult.value = true
    }
    
    // 下一题
    const nextQuestion = () => {
      currentQuestionIndex.value++
      selectedAnswer.value = ''
      selectedAnswers.value = []
      fillAnswer.value = ''
      essayAnswer.value = ''
      showResult.value = false
      // 重置计时器
      questionStartTime.value = Date.now()
    }
    
    // 完成练习
    const finishPractice = () => {
      stopTimer() // 停止计时器
      
      const correctCount = userAnswers.value.filter(answer => answer.isCorrect).length
      const wrongCount = userAnswers.value.length - correctCount
      const accuracy = Math.round((correctCount / userAnswers.value.length) * 100)
      
      practiceResult.value = {
        totalQuestions: userAnswers.value.length,
        correctCount,
        wrongCount,
        accuracy,
        totalTime: totalTimeSpent.value
      }
      
      practiceStarted.value = false
      logger.info('完成练习', practiceResult.value)
    }
    
    // 重新开始练习
    const restartPractice = () => {
      stopTimer() // 停止计时器
      
      practiceResult.value = null
      practiceStarted.value = false
      currentQuestionIndex.value = 0
      selectedAnswer.value = ''
      showResult.value = false
      userAnswers.value = []
      practiceQuestions.value = []
      // 重置计时相关变量
      questionStartTime.value = null
      totalTimeSpent.value = 0
    }
    
    // 查看统计
    const viewStats = () => {
      router.push('/practice/stats')
    }
    
    // 处理返回
    const handleBack = async () => {
      if (practiceStarted.value && !practiceResult.value) {
        try {
          await showConfirmDialog({
            title: '确认退出',
            message: '练习尚未完成，确定要退出吗？进度将不会保存。'
          })
          router.back()
        } catch (error) {
          // 用户取消
        }
      } else {
        router.back()
      }
    }
    
    onMounted(() => {
      // 检查URL参数，如果是错题练习模式则自动设置
      if (route.query.type === 'wrong') {
        practiceMode.value = 'wrong'
        // 如果有错题ID列表，自动开始练习
        if (route.query.ids) {
          startPractice()
        }
      }
    })
    
    onUnmounted(() => {
      // 组件销毁时清理定时器
      stopTimer()
    })
    
    return {
      loading,
      practiceStarted,
      practiceMode,
      questionCount,
      practiceQuestions,
      currentQuestion,
      currentQuestionIndex,
      selectedAnswer,
      selectedAnswers,
      fillAnswer,
      essayAnswer,
      showResult,
      practiceResult,
      progressPercentage,
      currentQuestionTime,
      formatTime,
      canSubmit,
      startPractice,
      selectAnswer,
      selectMultipleAnswer,
      submitAnswer,
      nextQuestion,
      finishPractice,
      restartPractice,
      viewStats,
      handleBack
    }
  }
}
</script>

<style scoped>
.mode-selection {
  padding: 20px 0;
}

.mode-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.mode-card h3 {
  text-align: center;
  margin-bottom: 24px;
  color: #323233;
  font-size: 18px;
}

.mode-option {
  margin-left: 12px;
}

.mode-title {
  font-size: 16px;
  font-weight: 500;
  color: #323233;
  margin-bottom: 4px;
}

.mode-desc {
  font-size: 14px;
  color: #646566;
}

.van-radio {
  margin-bottom: 16px;
}

.practice-settings {
  margin: 24px 0;
}

.start-button {
  margin-top: 24px;
}

.progress-bar {
  padding: 16px 0;
  text-align: center;
}

.progress-text {
  margin-top: 8px;
  font-size: 14px;
  color: #646566;
}

.question-container {
  background: white;
  border-radius: 12px;
  margin: 16px 0;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.question-header {
  padding: 16px;
  background: #f7f8fa;
  border-bottom: 1px solid #ebedf0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.question-number {
  font-size: 14px;
  color: #646566;
  font-weight: 500;
}

.timer-display {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #1989fa;
  font-size: 14px;
  font-weight: 500;
}

.timer-text {
  font-family: 'Courier New', monospace;
}

.question-content {
  padding: 20px;
}

.question-title {
  font-size: 16px;
  color: #323233;
  line-height: 1.6;
  margin-bottom: 20px;
}

.question-options {
  margin-bottom: 16px;
}

.option-item {
  display: flex;
  align-items: center;
  padding: 16px;
  margin-bottom: 12px;
  background: #f7f8fa;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid transparent;
  position: relative;
}

.option-item:hover {
  background: #e8f4ff;
}

.option-item.selected {
  background: #e8f4ff;
  border-color: #1989fa;
}

.option-item.correct {
  background: #e8f8e8;
  border-color: #52c41a;
}

.option-item.wrong {
  background: #ffe8e8;
  border-color: #ff4d4f;
}

.option-item.multiple {
  justify-content: space-between;
}

.option-item.multiple .van-checkbox {
  pointer-events: none;
}

.fill-answer, .essay-answer {
  margin: 20px 0;
}

.fill-input, .essay-input {
  margin-bottom: 16px;
}

.correct-answer {
  padding: 12px;
  background: #e8f8e8;
  border-radius: 8px;
  color: #52c41a;
  font-weight: 500;
  border-left: 4px solid #52c41a;
}

.option-label {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: #1989fa;
  color: white;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 500;
  margin-right: 12px;
  flex-shrink: 0;
}

.option-item.correct .option-label {
  background: #52c41a;
}

.option-item.wrong .option-label {
  background: #ff4d4f;
}

.option-text {
  flex: 1;
  font-size: 14px;
  color: #323233;
  line-height: 1.5;
}

.explanation {
  background: #f7f8fa;
  border-radius: 8px;
  padding: 16px;
  margin-top: 16px;
}

.explanation-title {
  font-size: 14px;
  font-weight: 500;
  color: #646566;
  margin-bottom: 8px;
}

.explanation-content {
  font-size: 14px;
  color: #323233;
  line-height: 1.6;
}

.action-buttons {
  padding: 16px 0;
}

.result-buttons {
  display: flex;
  gap: 12px;
}

.result-buttons .van-button {
  flex: 1;
}

.practice-result {
  padding: 20px 0;
}

.result-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  text-align: center;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.result-header {
  margin-bottom: 24px;
}

.result-header h3 {
  margin-top: 12px;
  color: #323233;
  font-size: 20px;
}

.result-stats {
  display: flex;
  justify-content: space-around;
  margin-bottom: 24px;
}

.stat-item {
  text-align: center;
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

.result-actions {
  display: flex;
  gap: 12px;
}

.result-actions .van-button {
  flex: 1;
}
</style>