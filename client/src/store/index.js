import { createStore } from 'vuex'
import axios from 'axios'

const store = createStore({
  state: {
    // 用户相关
    user: JSON.parse(localStorage.getItem('user')) || null,
    token: localStorage.getItem('token') || null,
    
    // 题目相关
    questions: [],
    currentQuestion: null,
    currentQuestionIndex: 0,
    
    // 刷题相关
    practiceQuestions: [],
    practiceStats: {
      totalQuestions: 0,
      totalAnswered: 0,
      correctCount: 0,
      incorrectCount: 0,
      accuracy: 0
    },
    
    // 导入记录
    importRecords: [],
    
    // 加载状态
    loading: false,
    uploadProgress: 0
  },
  
  getters: {
    isLoggedIn: state => !!state.token,
    currentUser: state => state.user,
    userToken: state => state.token,
    userRole: state => state.user ? state.user.role || 'user' : 'guest',
    
    allQuestions: state => state.questions,
    getCurrentQuestion: state => state.currentQuestion,
    getQuestionByIndex: state => index => state.practiceQuestions[index],
    
    getPracticeStats: state => state.practiceStats,
    getImportRecords: state => state.importRecords,
    
    isLoading: state => state.loading,
    getUploadProgress: state => state.uploadProgress
  },
  
  mutations: {
    // 用户相关
    SET_USER(state, user) {
      state.user = user
      if (user) {
        localStorage.setItem('user', JSON.stringify(user))
      } else {
        localStorage.removeItem('user')
      }
    },
    
    SET_TOKEN(state, token) {
      state.token = token
      if (token) {
        localStorage.setItem('token', token)
      } else {
        localStorage.removeItem('token')
      }
    },
    
    LOGOUT(state) {
      state.user = null
      state.token = null
      localStorage.removeItem('user')
      localStorage.removeItem('token')
    },
    
    // 题目相关
    SET_QUESTIONS(state, questions) {
      state.questions = questions
    },
    
    ADD_QUESTION(state, question) {
      state.questions.push(question)
    },
    
    REMOVE_QUESTION(state, questionId) {
      state.questions = state.questions.filter(q => q.id !== questionId)
    },
    
    // 刷题相关
    SET_PRACTICE_QUESTIONS(state, questions) {
      state.practiceQuestions = questions
      state.currentQuestionIndex = 0
      state.currentQuestion = questions[0] || null
    },
    
    SET_CURRENT_QUESTION(state, question) {
      state.currentQuestion = question
    },
    
    SET_CURRENT_QUESTION_INDEX(state, index) {
      state.currentQuestionIndex = index
      state.currentQuestion = state.practiceQuestions[index] || null
    },
    
    UPDATE_PRACTICE_STATS(state, stats) {
      state.practiceStats = { ...state.practiceStats, ...stats }
    },
    
    // 导入记录
    SET_IMPORT_RECORDS(state, records) {
      state.importRecords = records
    },
    
    // 加载状态
    SET_LOADING(state, loading) {
      state.loading = loading
    },
    
    SET_UPLOAD_PROGRESS(state, progress) {
      state.uploadProgress = progress
    }
  },
  
  actions: {
    // 用户登录
    async login({ commit }, credentials) {
      try {
        const response = await axios.post('/api/auth/login', credentials)
        const { token, user } = response.data.data
        
        commit('SET_TOKEN', token)
        commit('SET_USER', user)
        
        return { success: true, user }
      } catch (error) {
        return { success: false, message: error.response?.data?.message || '登录失败' }
      }
    },

    // 用户注册
    async register({ commit }, userData) {
      try {
        const response = await axios.post('/api/auth/register', userData)
        const { token, user } = response.data.data
        
        commit('SET_TOKEN', token)
        commit('SET_USER', user)
        
        return { success: true, user }
      } catch (error) {
        return { success: false, message: error.response?.data?.message || '注册失败' }
      }
    },
    
    // 用户登出
    logout({ commit }) {
      commit('LOGOUT')
    },
    
    // 获取题目列表
    async fetchQuestions({ commit }) {
      try {
        commit('SET_LOADING', true)
        const response = await axios.get('/api/questions')
        commit('SET_QUESTIONS', response.data.data || response.data)
        return { success: true }
      } catch (error) {
        return { success: false, message: error.response?.data?.message || '获取题目失败' }
      } finally {
        commit('SET_LOADING', false)
      }
    },
    
    // 获取刷题题目
    async fetchPracticeQuestions({ commit }, { mode = 'random', count = 10, type = 'all', exam_name = 'all', ids = null } = {}) {
      try {
        commit('SET_LOADING', true)
        let response
        
        if (mode === 'wrong' && ids) {
          // 错题练习模式：获取指定的错题
          response = await axios.get('/api/practice/questions-by-ids', {
            params: { ids: ids.join(',') }
          })
        } else if (mode === 'wrong') {
          // 错题练习模式：获取用户的错题
          response = await axios.get('/api/practice/wrong-questions', {
            params: { limit: count }
          })
          // 转换错题数据格式为练习题目格式
          if (response.data.success && response.data.data.length > 0) {
            const wrongQuestions = response.data.data
            const questionIds = wrongQuestions.map(q => q.id)
            response = await axios.get('/api/practice/questions-by-ids', {
              params: { ids: questionIds.join(',') }
            })
          }
        } else {
          // 随机练习或顺序练习模式
          response = await axios.get('/api/practice/random', {
            params: { count, type, exam_name, mode }
          })
        }
        
        const data = response.data.data || response.data
        commit('SET_PRACTICE_QUESTIONS', data)
        return { success: true, data: data }
      } catch (error) {
        return { success: false, message: error.response?.data?.message || '获取题目失败' }
      } finally {
        commit('SET_LOADING', false)
      }
    },
    
    // 获取刷题统计
    async fetchPracticeStats({ commit }) {
      try {
        const response = await axios.get('/api/practice/stats')
        commit('UPDATE_PRACTICE_STATS', response.data.data || response.data)
        return { success: true, data: response.data.data || response.data }
      } catch (error) {
        return { success: false, message: error.response?.data?.message || '获取统计失败' }
      }
    },

    // 获取练习历史
    async fetchPracticeHistory({ commit }, { page = 1, limit = 10 } = {}) {
      try {
        const response = await axios.get('/api/practice/history', {
          params: { page, limit }
        })
        return { success: true, data: response.data.data, pagination: response.data.pagination }
      } catch (error) {
        return { success: false, message: error.response?.data?.message || '获取练习历史失败' }
      }
    },

    // 获取错题列表
    async fetchWrongQuestions({ commit }, { page = 1, limit = 20 } = {}) {
      try {
        const response = await axios.get('/api/practice/wrong-questions', {
          params: { page, limit }
        })
        return { success: true, data: response.data.data, pagination: response.data.pagination }
      } catch (error) {
        return { success: false, message: error.response?.data?.message || '获取错题列表失败' }
      }
    },
    
    // 提交答案
    async submitAnswer({ commit, state }, { questionId, selectedAnswer, timeSpent, isCorrect }) {
      try {
        const response = await axios.post('/api/practice/submit', {
          questionId,
          selectedAnswer,
          timeSpent,
          isCorrect
        })
        
        // 更新统计数据
        const responseData = response.data.data || response.data
        if (responseData.stats) {
          commit('UPDATE_PRACTICE_STATS', responseData.stats)
        }
        
        return { 
          success: true, 
          isCorrect: responseData.isCorrect,
          correctAnswer: responseData.correctAnswer,
          explanation: responseData.explanation
        }
      } catch (error) {
        return { success: false, message: error.response?.data?.message || '提交失败' }
      }
    },
    
    // 获取导入记录
    async fetchImportRecords({ commit }) {
      try {
        const response = await axios.get('/api/import-records')
        commit('SET_IMPORT_RECORDS', response.data.data || response.data)
        return { success: true, data: response.data.data || response.data }
      } catch (error) {
        return { success: false, message: error.response?.data?.message || '获取记录失败' }
      }
    },
    
    // 上传文件
    async uploadFile({ commit }, { formData, onUploadProgress }) {
      try {
        commit('SET_LOADING', true)
        commit('SET_UPLOAD_PROGRESS', 0)
        
        const response = await axios.post('/api/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          },
          onUploadProgress: (progressEvent) => {
            const progress = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            )
            commit('SET_UPLOAD_PROGRESS', progress)
            if (onUploadProgress) {
              onUploadProgress(progressEvent)
            }
          }
        })
        
        return {
          success: true,
          data: response.data,
          totalQuestions: response.data.totalQuestions,
          message: response.data.message || '上传成功'
        }
      } catch (error) {
        return {
          success: false,
          message: error.response?.data?.message || '上传失败'
        }
      } finally {
        commit('SET_LOADING', false)
      }
    },

    // 删除题目
    async deleteQuestion({ commit }, questionId) {
      try {
        const response = await axios.delete(`/api/questions/${questionId}`)
        if (response.data.success) {
          commit('REMOVE_QUESTION', questionId)
        }
        return { success: true, message: response.data.message || '删除成功' }
      } catch (error) {
        return { success: false, message: error.response?.data?.message || '删除失败' }
      }
    },

    // 更新题目
    async updateQuestion({ commit }, { id, questionData }) {
      try {
        const response = await axios.put(`/api/questions/${id}`, questionData)
        return { success: true, data: response.data.data, message: response.data.message || '更新成功' }
      } catch (error) {
        return { success: false, message: error.response?.data?.message || '更新失败' }
      }
    },

    // 获取用户信息
    async fetchUserInfo({ commit }) {
      try {
        const response = await axios.get('/api/auth/me')
        const userData = response.data.data.user
        commit('SET_USER', userData)
        return { success: true, data: userData }
      } catch (error) {
        return { success: false, message: error.response?.data?.message || '获取用户信息失败' }
      }
    },

    // 获取刷题分类
    async fetchPracticeCategories({ commit }) {
      try {
        const response = await axios.get('/api/practice/categories')
        return { success: true, data: response.data.data || response.data }
      } catch (error) {
        return { success: false, message: error.response?.data?.message || '获取分类失败' }
      }
    }
  }
})

export default store