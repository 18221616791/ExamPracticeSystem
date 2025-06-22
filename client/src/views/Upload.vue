<template>
  <div class="page-container">
    <van-nav-bar title="题目上传" left-arrow @click-left="$router.back()" />
    
    <div class="content-wrapper">
      <!-- 上传说明 -->
      <div class="info-card">
        <van-icon name="info-o" color="#1989fa" />
        <div class="info-content">
          <h3>上传说明</h3>
          <ul>
            <li>支持 .doc 和 .docx 格式的Word文档</li>
            <li>文档中的题目格式需要规范</li>
            <li>单次最多上传5个文件</li>
            <li>单个文件大小不超过10MB</li>
          </ul>
        </div>
      </div>
      
      <!-- 文件选择区域 -->
      <div class="upload-section">
        <van-uploader
          v-model="selectedFiles"
          :max-count="1"
          :before-read="beforeRead"
          :after-read="handleFileSelect"
          accept=".doc,.docx,.zip"
        >
          <div class="upload-area">
            <van-icon name="plus" size="40" color="#1989fa" />
            <p>点击选择文件</p>
            <p class="upload-tip">支持 .doc、.docx、.zip 格式（单个文件）</p>
          </div>
        </van-uploader>
      </div>
      
      <!-- 文件列表 -->
      <div v-if="selectedFiles.length > 0" class="file-list">
        <h3 class="section-title">已选择的文件</h3>
        
        <div v-for="(file, index) in selectedFiles" :key="index" class="file-item">
          <div class="file-info">
            <van-icon name="description" color="#1989fa" />
            <div class="file-details">
              <div class="file-name">{{ file.name }}</div>
              <div class="file-size">{{ formatFileSize(file.size) }}</div>
            </div>
          </div>
          <van-icon
            name="cross"
            color="#ee0a24"
            @click="removeFile(index)"
          />
        </div>
      </div>
      
      <!-- 上传按钮 -->
      <div class="button-group">
        <van-button
          type="primary"
          block
          round
          :loading="uploading"
          :disabled="selectedFiles.length === 0"
          @click="handleUpload"
        >
          {{ uploading ? '上传中...' : '开始上传' }}
        </van-button>
      </div>
      
      <!-- 上传进度 -->
      <div v-if="uploading" class="progress-section">
        <div class="progress-info">
          <span>上传进度</span>
          <span>{{ uploadProgress }}%</span>
        </div>
        <van-progress :percentage="uploadProgress" stroke-width="8" />
      </div>
    </div>
    
    <!-- 上传结果弹窗 -->
    <van-popup v-model:show="showResult" position="center" round>
      <div class="result-container">
        <van-icon
          :name="uploadResult.success ? 'success' : 'fail'"
          :color="uploadResult.success ? '#07c160' : '#ee0a24'"
          size="48"
        />
        <h3>{{ uploadResult.success ? '上传成功' : '上传失败' }}</h3>
        <div class="result-details">
          <p v-if="uploadResult.success">
            成功导入 {{ uploadResult.totalQuestions }} 道题目
          </p>
          <p v-else>{{ uploadResult.message }}</p>
        </div>
        <van-button
          type="primary"
          round
          @click="handleResultClose"
        >
          确定
        </van-button>
      </div>
    </van-popup>
  </div>
</template>

<script>
import { ref, computed } from 'vue'
import { useStore } from 'vuex'
import logger from '../utils/logger'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'


export default {
  name: 'Upload',
  setup() {
    const store = useStore()
    const router = useRouter()
    
    const selectedFiles = ref([])
    const uploading = ref(false)
    const showResult = ref(false)
    const uploadResult = ref({ success: false, message: '', totalQuestions: 0 })
    
    const uploadProgress = computed(() => store.getters.getUploadProgress)
    
    // 文件预处理
    const beforeRead = (file) => {
      logger.info('文件预处理:', file)
      
      const fileName = file.name
      const extension = fileName.split('.').pop().toLowerCase()
      
      logger.info('文件信息:', {
        name: fileName,
        size: file.size,
        type: file.type,
        extension: extension
      })
      
      if (!['doc', 'docx', 'zip'].includes(extension)) {
        showToast('只支持 .doc、.docx 和 .zip 格式的文件')
        return false
      }
      
      if (file.size > 10 * 1024 * 1024) {
        showToast('文件大小不能超过10MB')
        return false
      }
      
      logger.info('文件预处理通过')
      return true
    }

    // 处理文件选择
    const handleFileSelect = (file) => {
      logger.info('文件选择事件触发:', file)
      
      if (file && file.file) {
        const actualFile = file.file
        const fileName = actualFile.name
        
        logger.info('文件已添加到列表:', {
          name: fileName,
          size: actualFile.size,
          type: actualFile.type
        })
      } else {
        logger.error('文件对象无效:', file)
      }
    }
    
    // 移除文件
    const removeFile = (index) => {
      selectedFiles.value.splice(index, 1)
      logger.info('移除文件', { index })
    }
    
    // 格式化文件大小
    const formatFileSize = (bytes) => {
      if (bytes === 0) return '0 B'
      const k = 1024
      const sizes = ['B', 'KB', 'MB', 'GB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }
    
    // 处理文件上传
    const handleUpload = async () => {
      if (selectedFiles.value.length === 0) {
        showToast('请选择要上传的文件')
        return
      }
      
      uploading.value = true
      
      try {
        const formData = new FormData()
        // 后端使用upload.single('file')，所以只上传第一个文件
        if (selectedFiles.value.length > 0) {
          const fileObj = selectedFiles.value[0]
          const actualFile = fileObj.file || fileObj
          formData.append('file', actualFile)
          
          logger.info('开始上传文件', {
            name: actualFile.name,
            size: actualFile.size,
            type: actualFile.type
          })
        } else {
          showToast('请选择要上传的文件')
          return
        }
        
        const result = await store.dispatch('uploadFile', {
          formData,
          onUploadProgress: (progressEvent) => {
            logger.info('上传进度', {
              loaded: progressEvent.loaded,
              total: progressEvent.total,
              progress: Math.round((progressEvent.loaded * 100) / progressEvent.total)
            })
          }
        })
        
        if (result.success) {
          uploadResult.value = {
            success: true,
            totalQuestions: result.totalQuestions || 0,
            message: result.message || '上传成功'
          }
          
          logger.info('文件上传成功', {
            totalQuestions: result.totalQuestions
          })
          
          // 清空已选择的文件
          selectedFiles.value = []
        } else {
          uploadResult.value = {
            success: false,
            message: result.message || '上传失败，请重试',
            totalQuestions: 0
          }
          
          logger.error('文件上传失败', result.message)
        }
        
      } catch (error) {
        logger.error('文件上传异常', error)
        uploadResult.value = {
          success: false,
          message: '上传异常，请重试',
          totalQuestions: 0
        }
      } finally {
        uploading.value = false
        showResult.value = true
      }
    }
    
    // 处理结果弹窗关闭
    const handleResultClose = () => {
      showResult.value = false
      
      if (uploadResult.value.success) {
        // 上传成功后跳转到题目管理页面
        router.push('/questions')
      }
    }
    
    return {
      selectedFiles,
      uploading,
      uploadProgress,
      showResult,
      uploadResult,
      beforeRead,
      handleFileSelect,
      removeFile,
      formatFileSize,
      handleUpload,
      handleResultClose
    }
  }
}
</script>

<style scoped>
.info-card {
  background: #f0f9ff;
  border: 1px solid #bae7ff;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
  display: flex;
  align-items: flex-start;
}

.info-content {
  margin-left: 12px;
  flex: 1;
}

.info-content h3 {
  font-size: 16px;
  color: #1989fa;
  margin-bottom: 8px;
}

.info-content ul {
  margin: 0;
  padding-left: 16px;
  color: #646566;
  font-size: 14px;
}

.info-content li {
  margin-bottom: 4px;
}

.upload-section {
  margin-bottom: 20px;
}

.section-title {
  font-size: 16px;
  font-weight: bold;
  color: #323233;
  margin-bottom: 12px;
}

.upload-area {
  border: 2px dashed #ddd;
  border-radius: 8px;
  padding: 40px 20px;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.3s;
}

.upload-area:hover {
  border-color: #1989fa;
}

.upload-area p {
  margin: 8px 0;
  color: #646566;
}

.upload-tip {
  font-size: 12px;
  color: #969799;
}

.file-list {
  margin-bottom: 20px;
}

.file-item {
  background: white;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.file-info {
  display: flex;
  align-items: center;
  flex: 1;
}

.file-details {
  margin-left: 12px;
}

.file-name {
  font-size: 14px;
  color: #323233;
  margin-bottom: 2px;
}

.file-size {
  font-size: 12px;
  color: #969799;
}

.progress-section {
  margin-top: 20px;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 14px;
  color: #646566;
}

.result-container {
  padding: 32px 24px;
  text-align: center;
  width: 280px;
}

.result-container h3 {
  margin: 16px 0 12px;
  color: #323233;
}

.result-details {
  margin-bottom: 24px;
  color: #646566;
  font-size: 14px;
}
</style>