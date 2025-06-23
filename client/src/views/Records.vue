<template>
  <div class="page-container">
    <van-nav-bar title="导入记录" left-arrow @click-left="$router.back()" />
    
    <div class="content-wrapper">
      <!-- 统计信息 -->
      <div class="stats-bar">
        <span>共 {{ records.length }} 条记录</span>
        <van-button
          type="primary"
          size="small"
          @click="refreshRecords"
          :loading="loading"
        >
          刷新
        </van-button>
      </div>
      
      <!-- 记录列表 -->
      <div v-if="loading" class="loading-container">
        <van-loading size="24px">加载中...</van-loading>
      </div>
      
      <div v-else-if="records.length === 0" class="empty-state">
        <van-icon name="notes-o" size="48" />
        <p>暂无导入记录</p>
        <van-button
          type="primary"
          size="small"
          @click="$router.push('/upload')"
        >
          去上传文件
        </van-button>
      </div>
      
      <div v-else class="records-list">
        <div
          v-for="record in records"
          :key="record.id"
          class="record-card"
        >
          <div class="record-header">
            <div class="file-info">
              <van-icon name="description" color="#1989fa" />
              <span class="file-name">{{ record.filename }}</span>
            </div>
            <div class="status-badge" :class="getStatusClass(record.status)">
              {{ getStatusText(record.status) }}
            </div>
          </div>
          
          <div class="record-content">
            <div class="record-item">
              <span class="label">上传时间：</span>
              <span class="value">{{ formatDate(record.created_at) }}</span>
            </div>
            
            <div class="record-item">
              <span class="label">文件大小：</span>
              <span class="value">{{ formatFileSize(record.fileSize) }}</span>
            </div>
            
            <div v-if="record.processedQuestions !== undefined" class="record-item">
              <span class="label">处理题目：</span>
              <span class="value">{{ record.processedQuestions }} 道</span>
            </div>
            
            <div v-if="record.errorMessage" class="record-item error">
              <span class="label">错误信息：</span>
              <span class="value">{{ record.errorMessage }}</span>
            </div>
            
            <div v-if="record.processingTime" class="record-item">
              <span class="label">处理时间：</span>
              <span class="value">{{ formatDate(record.processingTime) }}</span>
            </div>
          </div>
          
          <div class="record-actions">
            <van-button
              v-if="record.status === 'success' && record.processedQuestions > 0"
              type="primary"
              size="small"
              @click="viewQuestions(record)"
            >
              查看题目
            </van-button>
            
            <van-button
              v-if="record.status === 'failed'"
              type="warning"
              size="small"
              @click="retryUpload(record)"
            >
              重新处理
            </van-button>
            
            <van-button
              type="danger"
              size="small"
              @click="deleteRecord(record)"
            >
              删除记录
            </van-button>
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
import logger from '../utils/logger'

export default {
  name: 'Records',
  setup() {
    const store = useStore()
    const router = useRouter()
    
    const loading = ref(false)
    
    const records = computed(() => store.getters.getImportRecords)
    
    // 获取导入记录
    const fetchRecords = async () => {
      loading.value = true
      try {
        const result = await store.dispatch('fetchImportRecords')
        logger.info('获取导入记录成功', result)
        if (!result.success) {
          showToast(result.message)
          return
        }
        records.value = result.data
      } catch (error) {
        showToast('获取记录失败')
        logger.error('获取导入记录失败', error)
      } finally {
        loading.value = false
      }
    }
    
    // 刷新记录
    const refreshRecords = () => {
      fetchRecords()
    }
    
    // 获取状态样式类
    const getStatusClass = (status) => {
      const statusMap = {
        'pending': 'status-pending',
        'processing': 'status-processing',
        'success': 'status-success',
        'failed': 'status-failed'
      }
      return statusMap[status] || 'status-unknown'
    }
    
    // 获取状态文本
    const getStatusText = (status) => {
      const statusMap = {
        'pending': '等待处理',
        'processing': '处理中',
        'completed': '处理成功',
        'failed': '处理失败'
      }
      return statusMap[status] || '未知状态'
    }
    
    // 格式化日期
    const formatDate = (dateString) => {
      if (!dateString) return '-'
      const date = new Date(dateString)
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    }
    
    // 格式化文件大小
    const formatFileSize = (bytes) => {
      if (!bytes) return '-'
      if (bytes < 1024) return bytes + ' B'
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
      return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
    }
    
    // 查看题目
    const viewQuestions = (record) => {
      // 跳转到题目管理页面，可以考虑添加筛选参数
      router.push('/questions')
    }
    
    // 重新处理
    const retryUpload = async (record) => {
      try {
        await showConfirmDialog({
          title: '确认重新处理',
          message: `确定要重新处理文件 "${record.fileName}" 吗？`
        })
        
        // 重新处理功能暂未实现
        Toast.fail('重新处理功能暂未实现')
        logger.warn('重新处理功能暂未实现', record.id)
      } catch (error) {
        if (error !== 'cancel') {
          showToast('重新处理失败')
          logger.error('重新处理失败', error)
        }
      }
    }
    
    // 删除记录
    const deleteRecord = async (record) => {
      try {
        await showConfirmDialog({
          title: '确认删除',
          message: `确定要删除记录 "${record.fileName}" 吗？此操作不可恢复。`
        })
        
        // 删除记录功能暂未实现
        Toast.fail('删除记录功能暂未实现')
        logger.warn('删除记录功能暂未实现', record.id)
      } catch (error) {
        if (error !== 'cancel') {
          showToast('删除失败')
          logger.error('删除导入记录失败', error)
        }
      }
    }
    
    onMounted(() => {
      fetchRecords()
    })
    
    return {
      loading,
      records,
      refreshRecords,
      getStatusClass,
      getStatusText,
      formatDate,
      formatFileSize,
      viewQuestions,
      retryUpload,
      deleteRecord
    }
  }
}
</script>

<style scoped>
.stats-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  color: #646566;
  font-size: 14px;
}

.records-list {
  margin-bottom: 20px;
}

.record-card {
  background: white;
  border-radius: 8px;
  margin-bottom: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.record-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f7f8fa;
  border-bottom: 1px solid #ebedf0;
}

.file-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.file-name {
  font-size: 14px;
  color: #323233;
  font-weight: 500;
  word-break: break-all;
}

.status-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.status-pending {
  background: #fff7e6;
  color: #fa8c16;
}

.status-processing {
  background: #e6f7ff;
  color: #1890ff;
}

.status-success {
  background: #f6ffed;
  color: #52c41a;
}

.status-failed {
  background: #fff2f0;
  color: #ff4d4f;
}

.status-unknown {
  background: #f5f5f5;
  color: #999;
}

.record-content {
  padding: 16px;
}

.record-item {
  display: flex;
  margin-bottom: 8px;
  font-size: 14px;
}

.record-item.error {
  color: #ff4d4f;
}

.record-item .label {
  color: #646566;
  width: 80px;
  flex-shrink: 0;
}

.record-item .value {
  color: #323233;
  flex: 1;
  word-break: break-all;
}

.record-actions {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  background: #f7f8fa;
  border-top: 1px solid #ebedf0;
}

.record-actions .van-button {
  flex: 1;
}
</style>