<template>
  <div class="page-container">
    <van-nav-bar title="题目管理" left-arrow @click-left="$router.back()">
      <template #right>
        <van-icon name="search" @click="showSearch = !showSearch" />
      </template>
    </van-nav-bar>
    
    <!-- 搜索栏 -->
    <div v-if="showSearch" class="search-section">
      <van-field
        v-model="searchKeyword"
        placeholder="搜索题目内容..."
        left-icon="search"
        clearable
        @input="handleSearch"
      />
    </div>
    
    <div class="content-wrapper">
      <!-- 统计信息 -->
      <div class="stats-bar">
        <span>共 {{ filteredQuestions.length }} 道题目</span>
        <van-button
          type="primary"
          size="small"
          @click="refreshQuestions"
          :loading="loading"
        >
          刷新
        </van-button>
      </div>
      
      <!-- 题目列表 -->
      <div v-if="loading" class="loading-container">
        <van-loading size="24px">加载中...</van-loading>
      </div>
      
      <div v-else-if="filteredQuestions.length === 0" class="empty-state">
        <van-icon name="notes-o" size="48" />
        <p>{{ searchKeyword ? '没有找到相关题目' : '暂无题目数据' }}</p>
        <van-button
          v-if="!searchKeyword"
          type="primary"
          size="small"
          @click="$router.push('/upload')"
        >
          去上传题目
        </van-button>
      </div>
      
      <div v-else class="questions-list">
        <div
          v-for="question in paginatedQuestions"
          :key="question.id"
          class="question-card"
        >
          <div class="question-header">
            <span class="question-id">#{{ question.id }}</span>
            <div class="question-actions">
              <van-icon
                name="edit"
                color="#1989fa"
                @click="editQuestion(question)"
              />
              <van-icon
                name="delete"
                color="#ee0a24"
                @click="deleteQuestion(question)"
              />
            </div>
          </div>
          
          <div class="question-content">
            <div class="question-title">{{ question.question_text }}</div>
            
            <div class="question-options">
              <div
                v-for="(option, index) in question.options"
                :key="index"
                class="option-item"
                :class="{ 'correct-option': option === question.correct_answer }"
              >
                {{ ['A', 'B', 'C', 'D'][index] }}. {{ option }}
              </div>
            </div>
            
            <div v-if="question.explanation" class="question-explanation">
              <div class="explanation-title">解析：</div>
              <div class="explanation-content">{{ question.explanation }}</div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 分页 -->
      <div v-if="totalPages > 1" class="pagination">
        <van-button
          :disabled="currentPage === 1"
          @click="currentPage--"
        >
          上一页
        </van-button>
        <span class="page-info">
          {{ currentPage }} / {{ totalPages }}
        </span>
        <van-button
          :disabled="currentPage === totalPages"
          @click="currentPage++"
        >
          下一页
        </van-button>
      </div>
    </div>
    
    <!-- 编辑题目弹窗 -->
    <van-popup v-model:show="showEditDialog" position="center" round>
      <div class="edit-container">
        <h3>编辑题目</h3>
        
        <van-form @submit="handleSaveQuestion">
          <van-field
            v-model="editForm.question"
            label="题目"
            type="textarea"
            rows="3"
            placeholder="请输入题目内容"
            :rules="[{ required: true, message: '请输入题目内容' }]"
          />
          
          <van-field
            v-for="(option, index) in editForm.options"
            :key="index"
            v-model="editForm.options[index]"
            :label="['A', 'B', 'C', 'D'][index] + '选项'"
            placeholder="请输入选项内容"
            :rules="[{ required: true, message: '请输入选项内容' }]"
          />
          
          <van-field name="correctAnswer" label="正确答案">
            <template #input>
              <van-radio-group v-model="editForm.correctAnswer" direction="horizontal">
                <van-radio
                  v-for="(option, index) in editForm.options"
                  :key="index"
                  :name="option"
                >
                  {{ ['A', 'B', 'C', 'D'][index] }}
                </van-radio>
              </van-radio-group>
            </template>
          </van-field>
          
          <van-field
            v-model="editForm.explanation"
            label="解析"
            type="textarea"
            rows="2"
            placeholder="请输入题目解析（可选）"
          />
          
          <div class="dialog-buttons">
            <van-button @click="showEditDialog = false">取消</van-button>
            <van-button type="primary" native-type="submit" :loading="saving">
              保存
            </van-button>
          </div>
        </van-form>
      </div>
    </van-popup>
  </div>
</template>

<script>
import { ref, computed, onMounted, reactive, watch } from 'vue'
import { useStore } from 'vuex'
import { showToast, Dialog } from 'vant'
import logger from '../utils/logger'

export default {
  name: 'Questions',
  setup() {
    const store = useStore()
    
    const loading = ref(false)
    const saving = ref(false)
    const showSearch = ref(false)
    const showEditDialog = ref(false)
    const searchKeyword = ref('')
    const currentPage = ref(1)
    const pageSize = 10
    
    const editForm = reactive({
      id: null,
      question: '',
      options: ['', '', '', ''],
      correctAnswer: '',
      explanation: ''
    })
    
    const questions = computed(() => store.getters.allQuestions)
    
    // 过滤后的题目
    const filteredQuestions = computed(() => {
      if (!searchKeyword.value) {
        return questions.value
      }
      
      const keyword = searchKeyword.value.toLowerCase()
      return questions.value.filter(question => 
        question.question_text.toLowerCase().includes(keyword) ||
        (question.options && question.options.some(option => option.toLowerCase().includes(keyword)))
      )
    })
    
    // 分页后的题目
    const paginatedQuestions = computed(() => {
      const start = (currentPage.value - 1) * pageSize
      const end = start + pageSize
      return filteredQuestions.value.slice(start, end)
    })
    
    // 总页数
    const totalPages = computed(() => {
      return Math.ceil(filteredQuestions.value.length / pageSize)
    })
    
    // 监听搜索结果变化，重置页码
    watch(filteredQuestions, () => {
      currentPage.value = 1
    })
    
    // 获取题目列表
    const fetchQuestions = async () => {
      loading.value = true
      try {
        const result = await store.dispatch('fetchQuestions')
        if (!result.success) {
          showToast(result.message)
        }
      } catch (error) {
        showToast('获取题目失败')
        logger.error('获取题目失败', error)
      } finally {
        loading.value = false
      }
    }
    
    // 刷新题目
    const refreshQuestions = () => {
      fetchQuestions()
    }
    
    // 搜索处理
    const handleSearch = () => {
      // 搜索逻辑已在computed中处理
    }
    
    // 编辑题目
    const editQuestion = (question) => {
      editForm.id = question.id
      editForm.question = question.question_text
      editForm.options = [...(question.options || [])]
      editForm.correctAnswer = question.correct_answer
      editForm.explanation = question.explanation || ''
      showEditDialog.value = true
    }
    
    // 保存题目
    const handleSaveQuestion = async () => {
      saving.value = true
      try {
        const result = await store.dispatch('updateQuestion', {
          id: editForm.id,
          questionData: {
            question: editForm.question,
            options: editForm.options,
            correctAnswer: editForm.correctAnswer,
            explanation: editForm.explanation
          }
        })
        
        if (result.success) {
           Toast.success(result.message)
           showEditDialog.value = false
           
           // 重新获取题目列表以确保数据同步
           await fetchQuestions()
           
           logger.info('题目编辑成功', editForm.id)
         } else {
           Toast.fail(result.message)
         }
      } catch (error) {
         Toast.fail('保存失败')
         logger.error('保存题目失败', error)
       } finally {
        saving.value = false
      }
    }
    
    // 删除题目
    const deleteQuestion = async (question) => {
      try {
        await Dialog.confirm({
          title: '确认删除',
          message: `确定要删除题目 #${question.id} 吗？此操作不可恢复。`
        })
        
        const result = await store.dispatch('deleteQuestion', question.id)
        
        if (result.success) {
           Toast.success(result.message)
           logger.info('题目删除成功', question.id)
         } else {
           Toast.fail(result.message)
         }
      } catch (error) {
         if (error !== 'cancel') {
           Toast.fail('删除失败')
           logger.error('删除题目失败', error)
         }
       }
    }
    
    onMounted(() => {
      fetchQuestions()
    })
    
    return {
      loading,
      saving,
      showSearch,
      showEditDialog,
      searchKeyword,
      currentPage,
      totalPages,
      editForm,
      filteredQuestions,
      paginatedQuestions,
      refreshQuestions,
      handleSearch,
      editQuestion,
      handleSaveQuestion,
      deleteQuestion
    }
  }
}
</script>

<style scoped>
.search-section {
  padding: 12px 16px;
  background: white;
  border-bottom: 1px solid #ebedf0;
}

.stats-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  color: #646566;
  font-size: 14px;
}

.questions-list {
  margin-bottom: 20px;
}

.question-card {
  background: white;
  border-radius: 8px;
  margin-bottom: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.question-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f7f8fa;
  border-bottom: 1px solid #ebedf0;
}

.question-id {
  font-size: 14px;
  color: #646566;
  font-weight: 500;
}

.question-actions {
  display: flex;
  gap: 12px;
}

.question-actions .van-icon {
  cursor: pointer;
  padding: 4px;
}

.question-content {
  padding: 16px;
}

.question-title {
  font-size: 16px;
  color: #323233;
  line-height: 1.5;
  margin-bottom: 12px;
}

.question-options {
  margin-bottom: 12px;
}

.option-item {
  padding: 8px 12px;
  margin-bottom: 6px;
  background: #f7f8fa;
  border-radius: 6px;
  font-size: 14px;
  color: #646566;
}

.correct-option {
  background: #f0f9ff;
  color: #1989fa;
  border: 1px solid #bae7ff;
}

.question-explanation {
  background: #f7f8fa;
  border-radius: 6px;
  padding: 12px;
}

.explanation-title {
  font-size: 14px;
  font-weight: 500;
  color: #646566;
  margin-bottom: 6px;
}

.explanation-content {
  font-size: 14px;
  color: #323233;
  line-height: 1.5;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  padding: 20px 0;
}

.page-info {
  font-size: 14px;
  color: #646566;
}

.edit-container {
  padding: 24px;
  width: 90vw;
  max-width: 400px;
  max-height: 80vh;
  overflow-y: auto;
}

.edit-container h3 {
  text-align: center;
  margin-bottom: 20px;
  color: #323233;
}

.dialog-buttons {
  display: flex;
  gap: 12px;
  margin-top: 20px;
}

.dialog-buttons .van-button {
  flex: 1;
}
</style>