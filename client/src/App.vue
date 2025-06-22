<template>
  <div id="app">
    <router-view />
  </div>
</template>

<script>
export default {
  name: 'App'
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Helvetica, Arial, sans-serif;
  background-color: #f7f8fa;
}

#app {
  min-height: 100vh;
}

.page-container {
  min-height: 100vh;
  background-color: #f7f8fa;
}

.content-wrapper {
  padding: 16px;
}

.form-container {
  background: white;
  border-radius: 8px;
  padding: 20px;
  margin: 16px;
}

.button-group {
  padding: 16px;
}

.button-group .van-button {
  margin-bottom: 12px;
}

.stats-card {
  background: white;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
}

.stats-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
}

.stats-label {
  color: #646566;
  font-size: 14px;
}

.stats-value {
  color: #323233;
  font-size: 16px;
  font-weight: 500;
}

.question-card {
  background: white;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
}

.question-title {
  font-size: 16px;
  font-weight: 500;
  color: #323233;
  margin-bottom: 12px;
  line-height: 1.5;
}

.question-options {
  margin: 16px 0;
}

.option-item {
  margin-bottom: 8px;
}

.question-explanation {
  background: #f7f8fa;
  border-radius: 6px;
  padding: 12px;
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
  line-height: 1.5;
}

.result-correct {
  color: #07c160;
}

.result-incorrect {
  color: #ee0a24;
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #969799;
}

.empty-state .van-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.guest-notice {
  background: #fff7e6;
  border: 1px solid #ffd591;
  border-radius: 6px;
  padding: 12px;
  margin: 16px;
  color: #d46b08;
  font-size: 14px;
  text-align: center;
}
</style>