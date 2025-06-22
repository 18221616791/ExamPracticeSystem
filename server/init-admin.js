const mysql = require('mysql2/promise')
const bcrypt = require('bcrypt')

// 数据库配置
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'Pass@word1',
  database: 'question_bank'
}

async function initAdmin() {
  let connection
  
  try {
    connection = await mysql.createConnection(dbConfig)
    
    // 检查是否已存在管理员用户
    const [existingAdmin] = await connection.execute(
      'SELECT id FROM users WHERE role = ? LIMIT 1',
      ['admin']
    )
    
    if (existingAdmin.length > 0) {
      console.log('管理员用户已存在，无需初始化')
      return
    }
    
    // 创建默认管理员用户
    const adminUsername = 'admin'
    const adminPassword = 'admin123'
    const hashedPassword = await bcrypt.hash(adminPassword, 10)
    
    await connection.execute(
      'INSERT INTO users (username, password, email, role, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
      [adminUsername, hashedPassword, 'admin@example.com', 'admin', 'active']
    )
    
    console.log('默认管理员用户创建成功！')
    console.log('用户名: admin')
    console.log('密码: admin123')
    console.log('请登录后及时修改密码！')
    
  } catch (error) {
    console.error('初始化管理员用户失败:', error.message)
  } finally {
    if (connection) {
      await connection.end()
    }
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  initAdmin()
}

module.exports = initAdmin