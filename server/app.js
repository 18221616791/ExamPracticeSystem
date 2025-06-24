const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mammoth = require('mammoth');
const yauzl = require('yauzl');
const JSZip = require('jszip');
const iconv = require('iconv-lite');
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { Logger, logger } = require('./utils/logger');
const { router: wechatRouter, setPool: setWechatPool } = require('./routes/wechat');

const app = express();
const PORT = process.env.PORT || 3000;

// JWT密钥配置
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';

// 中间件
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

// 添加请求日志中间件
app.use((req, res, next) => {
  logger.logRequest(req, res, next);
});

// 全局错误处理中间件
app.use((err, req, res, next) => {
  logger.error('全局错误处理', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method
  });
  res.status(500).json({ success: false, message: '服务器内部错误' });
});

// 创建uploads目录
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// 配置multer用于文件上传
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    // 处理中文文件名
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    cb(null, Date.now() + '-' + originalName);
  }
});

const upload = multer({ storage: storage });

// MySQL数据库连接配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'Pass@word1',
  database: process.env.DB_NAME || 'question_bank',
  charset: 'utf8mb4',
  supportBigNumbers: true,
  bigNumberStrings: true,
  namedPlaceholders: false,
  typeCast: function (field, next) {
    if (field.type === 'TINY' && field.length === 1) {
      return (field.string() === '1'); // 1 = true, 0 = false
    }
    return next();
  }
};

// 创建数据库连接池
const pool = mysql.createPool(dbConfig);

// 初始化数据库表
async function initDatabase() {
  const dbLogger = new Logger('DATABASE');
  try {
    dbLogger.info('开始初始化数据库');
    const connection = await pool.getConnection();
    
    // 创建数据库（如果不存在）
    await connection.execute('CREATE DATABASE IF NOT EXISTS question_bank CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    dbLogger.info('数据库创建完成');
    //await connection.execute('USE question_bank');
    
    // 创建题目表
    const createQuestionTable = `
      CREATE TABLE IF NOT EXISTS questions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        exam_name VARCHAR(255) NOT NULL COMMENT '考试名称',
        question_type ENUM('single', 'multiple', 'judge', 'fill', 'essay') NOT NULL COMMENT '题目类型',
        question_text TEXT NOT NULL COMMENT '题目内容',
        option_a TEXT COMMENT '选项A',
        option_b TEXT COMMENT '选项B',
        option_c TEXT COMMENT '选项C',
        option_d TEXT COMMENT '选项D',
        option_e TEXT COMMENT '选项E',
        correct_answer TEXT NOT NULL COMMENT '正确答案',
        explanation TEXT COMMENT '解析',
        difficulty ENUM('easy', 'medium', 'hard') DEFAULT 'medium' COMMENT '难度',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;
    
    await connection.execute(createQuestionTable);
    
    // 创建导入记录表
    const createImportTable = `
      CREATE TABLE IF NOT EXISTS import_records (
        id INT AUTO_INCREMENT PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        total_questions INT DEFAULT 0,
        success_count INT DEFAULT 0,
        error_count INT DEFAULT 0,
        status ENUM('processing', 'completed', 'failed') DEFAULT 'processing',
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;
    
    await connection.execute(createImportTable);
    
    // 创建用户表
    const createUserTable = `
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL COMMENT '用户名',
        password VARCHAR(255) COMMENT '密码哈希',
        email VARCHAR(100) COMMENT '邮箱',
        avatar VARCHAR(255) COMMENT '头像URL',
        role ENUM('admin', 'user', 'guest') DEFAULT 'user' COMMENT '用户角色',
        login_type ENUM('account', 'wechat') DEFAULT 'account' COMMENT '登录类型',
        wechat_openid VARCHAR(100) UNIQUE COMMENT '微信OpenID',
        wechat_unionid VARCHAR(100) COMMENT '微信UnionID',
        status ENUM('active', 'inactive') DEFAULT 'active' COMMENT '用户状态',
        last_login_at TIMESTAMP NULL COMMENT '最后登录时间',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;
    
    await connection.execute(createUserTable);
    
    // 创建微信登录二维码表
    const createWechatQRTable = `
      CREATE TABLE IF NOT EXISTS wechat_qr_codes (
        id VARCHAR(50) PRIMARY KEY COMMENT '二维码ID',
        qr_code_url VARCHAR(500) NOT NULL COMMENT '二维码URL',
        status ENUM('pending', 'scanned', 'confirmed', 'expired') DEFAULT 'pending' COMMENT '状态',
        openid VARCHAR(100) COMMENT '扫码用户OpenID',
        user_info JSON COMMENT '用户信息',
        expires_at TIMESTAMP NOT NULL COMMENT '过期时间',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;
    
    await connection.execute(createWechatQRTable);
    dbLogger.info('微信二维码表创建完成');
    
    // 创建答题记录表
    const createPracticeRecordsTable = `
      CREATE TABLE IF NOT EXISTS practice_records (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL COMMENT '用户ID',
        question_id INT NOT NULL COMMENT '题目ID',
        user_answer TEXT NOT NULL COMMENT '用户答案',
        correct_answer TEXT NOT NULL COMMENT '正确答案',
        is_correct BOOLEAN NOT NULL COMMENT '是否正确',
        time_spent INT DEFAULT 0 COMMENT '答题用时(秒)',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_question_id (question_id),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;
    
    await connection.execute(createPracticeRecordsTable);
    dbLogger.info('答题记录表创建完成');
    
    connection.release();
    dbLogger.info('数据库初始化完成');
  } catch (error) {
    dbLogger.error('数据库初始化失败', {
      error: error.message,
      stack: error.stack
    });
  }
}

// 解析Word文档内容
function parseQuestions(text, examName) {
  const questions = [];
  
  // 按行分割文本
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  let currentQuestion = null;
  let questionNumber = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // 匹配题目编号（如：1.、一、（1）等）
    const questionMatch = line.match(/^(\d+[.、]|[一二三四五六七八九十]+[.、]|\(\d+\)|（\d+）)/);
    
    if (questionMatch) {
      // 保存上一题
      if (currentQuestion) {
        questions.push(currentQuestion);
      }
      
      questionNumber++;
      const questionText = line.replace(questionMatch[0], '').trim();
      
      // 判断题目类型
      let questionType = 'single'; // 默认单选
      if (questionText.includes('多选') || questionText.includes('多项选择')) {
        questionType = 'multiple';
      } else if (questionText.includes('判断') || questionText.includes('对错')) {
        questionType = 'judge';
      } else if (questionText.includes('填空')) {
        questionType = 'fill';
      } else if (questionText.includes('简答') || questionText.includes('论述')) {
        questionType = 'essay';
      }
      
      currentQuestion = {
        exam_name: examName,
        question_type: questionType,
        question_text: questionText,
        option_a: null,
        option_b: null,
        option_c: null,
        option_d: null,
        option_e: null,
        correct_answer: '',
        explanation: ''
      };
    }
    // 匹配选项（A、B、C、D、E）
    else if (currentQuestion && /^[A-E][.、]/.test(line)) {
      // 检查是否是连续选项格式（如：A. xxx B. xxx C. xxx）
      const optionPattern = /([A-E])[.、]([^A-E]*?)(?=\s*[A-E][.、]|$)/g;
      let match;
      let hasMultipleOptions = false;
      
      // 先检查是否包含多个选项
      const tempMatches = [...line.matchAll(optionPattern)];
      if (tempMatches.length > 1) {
        hasMultipleOptions = true;
        // 处理连续选项格式
        tempMatches.forEach(optionMatch => {
          const option = optionMatch[1].toLowerCase();
          const optionText = optionMatch[2].trim();
          if (optionText) {
            currentQuestion[`option_${option}`] = optionText;
          }
        });
      } else {
        // 处理单个选项格式
        const option = line.charAt(0).toLowerCase();
        const optionText = line.substring(2).trim();
        currentQuestion[`option_${option}`] = optionText;
      }
    }
    // 处理可能的选项延续（当选项内容很长时可能会换行）
    else if (currentQuestion && currentQuestion.option_a && !currentQuestion.option_b && 
             line.length > 5 && /[B-E][.、]/.test(line)) {
      // 这可能是选项A后面跟着的其他选项
      const optionPattern = /([A-E])[.、]([^A-E]*?)(?=\s*[A-E][.、]|$)/g;
      const matches = [...line.matchAll(optionPattern)];
      matches.forEach(optionMatch => {
        const option = optionMatch[1].toLowerCase();
        const optionText = optionMatch[2].trim();
        if (optionText && option !== 'a') {
          currentQuestion[`option_${option}`] = optionText;
        }
      });
    }
    // 匹配答案
    else if (line.includes('答案') || line.includes('正确答案')) {
      if (currentQuestion) {
        const answerMatch = line.match(/[答案：:](.*)/i);
        if (answerMatch) {
          let answerText = answerMatch[1].trim();
          
          // 检查是否包含"答案详解"分隔符
          if (answerText.includes('答案详解')) {
            const parts = answerText.split('答案详解');
            const answerPart = parts[0].trim();
            const explanationPart = parts[1] ? parts[1].trim() : '';
            
            // 从答案部分提取答案标号
            const answerMatch = answerPart.match(/([A-E])[、.]?/i);
            if (answerMatch) {
              currentQuestion.correct_answer = answerMatch[1].toUpperCase();
            }
            
            // 从解析部分提取解析内容
            if (explanationPart) {
              const expMatch = explanationPart.match(/[：:]?解析[：:](.*)/i);
              if (expMatch) {
                currentQuestion.explanation = expMatch[1].trim();
              } else if (explanationPart.startsWith('：解析：')) {
                currentQuestion.explanation = explanationPart.substring(4).trim();
              }
            }
          }
          // 检查其他解析模式
           else {
             // 检查是否包含解析
             if (answerText.includes('解析')) {
               const explanationPattern = /([A-E]).*?解析[：:](.*)/i;
               const match = answerText.match(explanationPattern);
               if (match) {
                 currentQuestion.correct_answer = match[1].toUpperCase();
                 currentQuestion.explanation = match[2].trim();
               }
             } else {
               // 简单答案格式
               const simpleAnswerMatch = answerText.match(/^([A-E])[、.]?/);
               if (simpleAnswerMatch) {
                 currentQuestion.correct_answer = simpleAnswerMatch[1].toUpperCase();
                 // 如果答案后面还有内容，可能是解析
                 const remainingText = answerText.substring(simpleAnswerMatch[0].length).trim();
                 if (remainingText && remainingText.length > 3) {
                   currentQuestion.explanation = remainingText;
                 }
               } else {
                 currentQuestion.correct_answer = answerText;
               }
             }
           }
        }
      }
    }
    // 匹配解析
    else if (line.includes('解析') || line.includes('解释')) {
      if (currentQuestion) {
        const explanationMatch = line.match(/[解析解释：:](.*)/i);
        if (explanationMatch) {
          // 如果已经有解析内容，追加；否则设置新的解析
          const newExplanation = explanationMatch[1].trim();
          if (currentQuestion.explanation) {
            currentQuestion.explanation += ' ' + newExplanation;
          } else {
            currentQuestion.explanation = newExplanation;
          }
        }
      }
    }
    // 继续题目内容
    else if (currentQuestion && !currentQuestion.option_a && line.length > 10) {
      currentQuestion.question_text += ' ' + line;
    }
  }
  
  // 添加最后一题
  if (currentQuestion) {
    questions.push(currentQuestion);
  }
  
  return questions;
}

// JWT认证中间件
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: '访问令牌缺失' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: '访问令牌无效' });
    }
    req.user = user;
    next();
  });
};

// 角色权限验证中间件
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: '用户未认证' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: '权限不足' });
    }
    
    next();
  };
};

// 访客权限验证中间件（允许未登录用户访问）
const allowGuest = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    // 未登录用户设置为访客角色
    req.user = { role: 'guest', id: null };
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      // token无效时也设置为访客
      req.user = { role: 'guest', id: null };
    } else {
      req.user = user;
    }
    next();
  });
};

// 刷题权限验证（允许所有角色访问）
const allowPractice = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = { role: 'guest', id: null };
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      req.user = { role: 'guest', id: null };
    } else {
      req.user = user;
    }
    next();
  });
};

// API路由

// 获取所有题目（仅管理员可访问）
app.get('/api/questions', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM questions ORDER BY created_at DESC');
    // 为每个题目添加options字段
    const processedRows = rows.map(question => {
      const options = [];
      if (question.option_a) options.push(question.option_a);
      if (question.option_b) options.push(question.option_b);
      if (question.option_c) options.push(question.option_c);
      if (question.option_d) options.push(question.option_d);
      if (question.option_e) options.push(question.option_e);
      return { ...question, options };
    });
    res.json({ success: true, data: processedRows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 刷题模块 - 获取随机题目（所有角色可访问）
app.get('/api/practice/random', allowPractice, async (req, res) => {
  try {
    const { count = 10, type, exam_name } = req.query;
    
    let sql = 'SELECT * FROM questions';
    let params = [];
    let conditions = [];
    
    if (type && type !== 'all') {
      conditions.push('question_type = ?');
      params.push(type);
    }
    
    if (exam_name && exam_name !== 'all') {
      conditions.push('exam_name = ?');
      params.push(exam_name);
    }
    
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    
    const limitCount = Math.max(1, Math.min(100, parseInt(count) || 10));
    sql += ` ORDER BY RAND() LIMIT ${limitCount}`;
    
    logger.info('获取随机题目', { count, type, exam_name });
    
    const [rows] = await pool.execute(sql, params);
    // 为每个题目添加options字段
    const processedRows = rows.map(question => {
      const options = [];
      if (question.option_a) options.push(question.option_a);
      if (question.option_b) options.push(question.option_b);
      if (question.option_c) options.push(question.option_c);
      if (question.option_d) options.push(question.option_d);
      if (question.option_e) options.push(question.option_e);
      return { ...question, options };
    });
    res.json({ success: true, data: processedRows });
  } catch (error) {
    logger.error('获取随机题目失败', { error: error.message });
    res.status(500).json({ success: false, message: error.message });
  }
});

// 刷题模块 - 获取题目分类（所有角色可访问）
app.get('/api/practice/categories', allowPractice, async (req, res) => {
  try {
    const [examNames] = await pool.execute(
      'SELECT DISTINCT exam_name, COUNT(*) as count FROM questions GROUP BY exam_name ORDER BY exam_name'
    );
    
    const [questionTypes] = await pool.execute(
      'SELECT question_type, COUNT(*) as count FROM questions GROUP BY question_type'
    );
    
    res.json({ 
      success: true, 
      data: {
        examNames,
        questionTypes
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 刷题模块 - 提交答案（所有角色可访问）
app.post('/api/practice/submit', allowPractice, async (req, res) => {
  try {
    const { questionId, selectedAnswer, timeSpent } = req.body;
    const userId = req.user.id;
    
    // 参数验证
    if (!questionId) {
      return res.status(400).json({ success: false, message: '题目ID不能为空' });
    }
    if (selectedAnswer === undefined || selectedAnswer === null) {
      return res.status(400).json({ success: false, message: '答案不能为空' });
    }
    if (timeSpent === undefined || timeSpent === null) {
      return res.status(400).json({ success: false, message: '答题时间不能为空' });
    }
    
    // 访客用户不记录答题记录，但仍返回正确答案
    if (!userId) {
      const [questions] = await pool.execute(
        'SELECT correct_answer, explanation FROM questions WHERE id = ?',
        [questionId]
      );
      
      if (questions.length === 0) {
        return res.status(404).json({ success: false, message: '题目不存在' });
      }
      
      const question = questions[0];
      const isCorrect = selectedAnswer && question.correct_answer && 
                       selectedAnswer.toLowerCase() === question.correct_answer.toLowerCase();
      
      return res.json({
        success: true,
        data: {
          isCorrect,
          correctAnswer: question.correct_answer,
          explanation: question.explanation
        }
      });
    }
    
    // 获取题目信息
    const [questions] = await pool.execute(
      'SELECT * FROM questions WHERE id = ?',
      [questionId]
    );
    
    if (questions.length === 0) {
      return res.status(404).json({ success: false, message: '题目不存在' });
    }
    
    const question = questions[0];
    const isCorrect = selectedAnswer && question.correct_answer && 
                     selectedAnswer.toLowerCase() === question.correct_answer.toLowerCase();
    
    // 记录答题历史
    const finalTimeSpent = timeSpent || 0; // 确保timeSpent不为undefined
    await pool.execute(
      'INSERT INTO practice_records (user_id, question_id, user_answer, correct_answer, is_correct, time_spent) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, questionId, selectedAnswer || '', question.correct_answer, isCorrect, finalTimeSpent]
    );
    
    logger.info('用户答题', {
      userId,
      questionId,
      selectedAnswer,
      isCorrect,
      timeSpent
    });  
    res.json({
      success: true,
      data: {
        isCorrect,
        correctAnswer: question.correct_answer,
        explanation: question.explanation
      }
    });
  } catch (error) {
    logger.error('提交答案失败', { error: error.message });
    res.status(500).json({ success: false, message: error.message });
  }
});

// 刷题模块 - 获取答题统计（所有角色可访问）
app.get('/api/practice/stats', allowPractice, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // 访客用户返回空统计
    if (!userId) {
      return res.json({
        success: true,
        data: {
          totalQuestions: 0,
          correctAnswers: 0,
          accuracy: 0,
          categoryStats: [],
          recentActivity: []
        }
      });
    }
    
    const [totalStats] = await pool.execute(
      'SELECT COUNT(*) as total, SUM(CAST(is_correct AS UNSIGNED)) as correct FROM practice_records WHERE user_id = ?',
      [userId]
    );
    
    const [typeStats] = await pool.execute(
      `SELECT q.question_type, COUNT(*) as total, SUM(CAST(pr.is_correct AS UNSIGNED)) as correct 
       FROM practice_records pr 
       JOIN questions q ON pr.question_id = q.id 
       WHERE pr.user_id = ? 
       GROUP BY q.question_type`,
      [userId]
    );
    
    const [recentRecords] = await pool.execute(
      `SELECT pr.*, q.question_text, q.question_type 
       FROM practice_records pr 
       JOIN questions q ON pr.question_id = q.id 
       WHERE pr.user_id = ? 
       ORDER BY pr.created_at DESC 
       LIMIT 10`,
      [userId]
    );
    
    const total = totalStats[0].total || 0;
    const correct = totalStats[0].correct || 0;
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
    
    res.json({
      success: true,
      data: {
        totalQuestions: total,
        correctAnswers: correct,
        totalAnswered: total,
        correctCount: correct,
        incorrectCount: total - correct,
        accuracy: accuracy,
        categoryStats: typeStats,
        recentActivity: recentRecords
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 获取练习历史记录
app.get('/api/practice/history', authenticateToken, async (req, res) => {
  try {
    const userId = parseInt(req.user.id);
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    
    // 验证userId是否有效
    if (!userId || isNaN(userId)) {
      return res.status(400).json({ success: false, message: '无效的用户ID' });
    }
    
    // 获取练习会话统计
    const [sessions] = await pool.execute(
      `SELECT 
        DATE(created_at) as practice_date,
        COUNT(*) as total_questions,
        SUM(CAST(is_correct AS UNSIGNED)) as correct_count,
        COUNT(*) - SUM(CAST(is_correct AS UNSIGNED)) as wrong_count,
        ROUND(AVG(CAST(is_correct AS UNSIGNED)) * 100, 1) as accuracy,
        SUM(time_spent) as total_time,
        MIN(created_at) as session_start
       FROM practice_records 
       WHERE user_id = ? 
       GROUP BY DATE(created_at)
       ORDER BY practice_date DESC
       LIMIT ${limit} OFFSET ${offset}`,
      [userId]
    );
    
    // 为每个会话添加会话ID（基于日期排序）
    const sessionsWithId = sessions.map((session, index) => ({
      ...session,
      id: `session_${session.practice_date}`,
      sessionId: offset + index + 1,
      createdAt: session.session_start
    }));
    
    res.json({
      success: true,
      data: sessionsWithId
    });
  } catch (error) {
    logger.error('获取练习历史失败', { error: error.message });
    res.status(500).json({ success: false, message: error.message });
  }
});

// 获取错题集
app.get('/api/practice/wrong-questions', authenticateToken, async (req, res) => {
  try {
    const userId = parseInt(req.user.id);
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 50));
    const offset = (page - 1) * limit;
    
    // 验证userId是否有效
    if (!userId || isNaN(userId)) {
      return res.status(400).json({ success: false, message: '无效的用户ID' });
    }
    
    // 获取用户的错题
    const [wrongQuestions] = await pool.execute(
      `SELECT 
        q.id,
        q.question_text as question,
        q.question_type as type,
        q.correct_answer,
        COUNT(pr.id) as wrong_count,
        MAX(pr.created_at) as last_wrong_at
       FROM questions q
       JOIN practice_records pr ON q.id = pr.question_id
       WHERE pr.user_id = ? AND pr.is_correct = FALSE
       GROUP BY q.id, q.question_text, q.question_type, q.correct_answer
       ORDER BY last_wrong_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
      [userId]
    );
    
    res.json({
      success: true,
      data: wrongQuestions
    });
  } catch (error) {
    logger.error('获取错题集失败', { error: error.message });
    res.status(500).json({ success: false, message: error.message });
  }
});

// 根据题目ID获取题目详情
app.get('/api/practice/questions-by-ids', async (req, res) => {
  try {
    const ids = req.query.ids;
    if (!ids) {
      return res.status(400).json({ success: false, message: '缺少题目ID参数' });
    }
    
    const idArray = ids.split(',').map(id => parseInt(id)).filter(id => !isNaN(id));
    if (idArray.length === 0) {
      return res.status(400).json({ success: false, message: '无效的题目ID' });
    }
    
    const placeholders = idArray.map(() => '?').join(',');
    const query = `SELECT * FROM questions WHERE id IN (${placeholders})`;
    
    const [rows] = await pool.execute(query, idArray);
    
    // 处理选择题的选项
    const processedQuestions = rows.map(question => {
      const options = [];
      if (question.option_a) options.push(question.option_a);
      if (question.option_b) options.push(question.option_b);
      if (question.option_c) options.push(question.option_c);
      if (question.option_d) options.push(question.option_d);
      if (question.option_e) options.push(question.option_e);
      return { ...question, options };
    });
    
    res.json({
      success: true,
      data: processedQuestions
    });
  } catch (error) {
    logger.error('根据ID获取题目失败:', error);
    res.status(500).json({ success: false, message: '获取题目失败' });
  }
});

// 获取导入记录（仅管理员可访问）
app.get('/api/import-records', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM import_records ORDER BY created_at DESC');
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 文件上传接口（仅管理员可访问）
app.post('/api/upload', authenticateToken, requireRole(['admin']), upload.single('file'), async (req, res) => {
  const uploadLogger = new Logger('UPLOAD');
  if (!req.file) {
    uploadLogger.warn('文件上传失败：没有上传文件');
    return res.status(400).json({ success: false, message: '请选择文件' });
  }
  
  uploadLogger.info('开始处理文件上传', {
    filename: req.file.originalname,
    size: req.file.size,
    mimetype: req.file.mimetype
  });
  
  const filename = req.file.filename;
  const originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
  const filePath = req.file.path;
  
  try {
    // 创建导入记录
    const [importResult] = await pool.execute(
      'INSERT INTO import_records (filename, status) VALUES (?, ?)',
      [originalName, 'processing']
    );
    const importId = importResult.insertId;
    
    let questions = [];
    
    // 根据文件类型处理
    if (path.extname(originalName).toLowerCase() === '.doc' || path.extname(originalName).toLowerCase() === '.docx') {
      // 处理Word文档
      const result = await mammoth.extractRawText({ path: filePath });
      const examName = path.basename(originalName, path.extname(originalName));
      questions = parseQuestions(result.value, examName);
    } else if (path.extname(originalName).toLowerCase() === '.zip') {
      // 处理ZIP文件
      try {
        const zipData = fs.readFileSync(filePath);
        const zip = await JSZip.loadAsync(zipData);
        
        const filePromises = [];
        zip.forEach((relativePath, file) => {
          if (/\.(doc|docx)$/i.test(relativePath) && !file.dir) {
            filePromises.push(
              file.async('nodebuffer').then(async (content) => {
                try {
                  const tempPath = path.join('uploads', 'temp_' + Date.now() + '_' + relativePath.replace(/[\/\\]/g, '_'));
                  fs.writeFileSync(tempPath, content);
                  
                  const result = await mammoth.extractRawText({ path: tempPath });
                  const examName = path.basename(relativePath, path.extname(relativePath));
                  const fileQuestions = parseQuestions(result.value, examName);
                  
                  // 删除临时文件
                  fs.unlinkSync(tempPath);
                  
                  return fileQuestions;
                } catch (error) {
                  console.error('处理ZIP中的文件失败:', relativePath, error.message);
                  return [];
                }
              })
            );
          }
        });
        
        const results = await Promise.all(filePromises);
        results.forEach(fileQuestions => {
          questions.push(...fileQuestions);
        });
        
      } catch (error) {
        console.error('ZIP文件解析失败:', error.message);
        throw new Error('ZIP文件格式不正确或已损坏，请检查文件完整性');
      }
    }
    
    // 插入题目到数据库
    let successCount = 0;
    let errorCount = 0;
    
    for (const question of questions) {
      try {
        await pool.execute(
          `INSERT INTO questions (exam_name, question_type, question_text, option_a, option_b, option_c, option_d, option_e, correct_answer, explanation) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            question.exam_name,
            question.question_type,
            question.question_text,
            question.option_a,
            question.option_b,
            question.option_c,
            question.option_d,
            question.option_e,
            question.correct_answer,
            question.explanation
          ]
        );
        successCount++;
      } catch (error) {
        console.error('插入题目失败:', error);
        errorCount++;
      }
    }
    
    // 更新导入记录
    await pool.execute(
      'UPDATE import_records SET total_questions = ?, success_count = ?, error_count = ?, status = ? WHERE id = ?',
      [questions.length, successCount, errorCount, 'completed', importId]
    );
    
    // 删除上传的文件
    fs.unlinkSync(filePath);
    
    res.json({
      success: true,
      message: `导入完成！共解析 ${questions.length} 道题目，成功导入 ${successCount} 道，失败 ${errorCount} 道`,
      data: {
        total: questions.length,
        success: successCount,
        error: errorCount
      }
    });
    
  } catch (error) {
    console.error('文件处理失败:', error);
    
    // 更新导入记录为失败状态
    try {
      await pool.execute(
        'UPDATE import_records SET status = ?, error_message = ? WHERE filename = ?',
        ['failed', error.message, originalName]
      );
    } catch (updateError) {
      console.error('更新导入记录失败:', updateError);
    }
    
    // 删除上传的文件
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    res.status(500).json({ success: false, message: '文件处理失败: ' + error.message });
  }
});

// 用户注册
app.post('/api/auth/register', async (req, res) => {
  const authLogger = new Logger('AUTH');
  try {
    const { username, password, email } = req.body;
    
    authLogger.info('用户注册请求', { username, email });
    
    if (!username || !password) {
      authLogger.warn('注册失败：用户名或密码为空', { username });
      return res.status(400).json({ success: false, message: '用户名和密码不能为空' });
    }
    
    // 检查用户名是否已存在
    const [existingUsers] = await pool.execute(
      'SELECT id FROM users WHERE username = ?',
      [username]
    );
    
    if (existingUsers.length > 0) {
      return res.status(400).json({ success: false, message: '用户名已存在' });
    }
    
    // 密码加密
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // 插入新用户
    const [result] = await pool.execute(
      'INSERT INTO users (username, password, email, login_type) VALUES (?, ?, ?, ?)',
      [username, hashedPassword, email || null, 'account']
    );
    
    // 生成JWT token
    const token = jwt.sign(
      { id: result.insertId, username, login_type: 'account', role: 'user' },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    
    res.json({
      success: true,
      message: '注册成功',
      data: {
        token,
        user: {
          id: result.insertId,
          username,
          email: email || null,
          login_type: 'account'
        }
      }
    });
    
  } catch (error) {
    console.error('注册失败:', error);
    res.status(500).json({ success: false, message: '注册失败' });
  }
});

// 用户登录
app.post('/api/auth/login', async (req, res) => {
  const authLogger = new Logger('AUTH');
  try {
    const { username, password } = req.body;
    
    authLogger.info('用户登录请求', { username });
    
    if (!username || !password) {
      authLogger.warn('登录失败：用户名或密码为空', { username });
      return res.status(400).json({ success: false, message: '用户名和密码不能为空' });
    }
    
    // 查找用户
    const [users] = await pool.execute(
      'SELECT * FROM users WHERE username = ? AND login_type = "account"',
      [username]
    );
    
    if (users.length === 0) {
      return res.status(401).json({ success: false, message: '用户名或密码错误' });
    }
    
    const user = users[0];
    
    // 验证密码
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      return res.status(401).json({ success: false, message: '用户名或密码错误' });
    }
    
    // 更新最后登录时间
    await pool.execute(
      'UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?',
      [user.id]
    );
    
    // 生成JWT token
    const token = jwt.sign(
      { id: user.id, username: user.username, login_type: user.login_type, role: user.role || 'user' },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    
    res.json({
      success: true,
      message: '登录成功',
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          avatar: user.avatar,
          login_type: user.login_type,
          last_login_at: user.last_login_at,
          role: user.role || 'user',
          created_at: user.created_at,
          updated_at: user.updated_at,
        }
      }
    });
    
  } catch (error) {
    console.error('登录失败:', error);
    res.status(500).json({ success: false, message: '登录失败' });
  }
});

// 生成微信登录二维码
app.post('/api/auth/wechat/qr', async (req, res) => {
  try {
    // 生成唯一的二维码ID
    const qrId = crypto.randomUUID();
    
    // 模拟微信二维码URL（实际项目中需要调用微信API）
    const qrCodeUrl = `https://mp.weixin.qq.com/cgi-bin/showqrcode?ticket=${qrId}`;
    
    // 设置过期时间（5分钟）
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    
    // 保存二维码信息
    await pool.execute(
      'INSERT INTO wechat_qr_codes (id, qr_code_url, expires_at) VALUES (?, ?, ?)',
      [qrId, qrCodeUrl, expiresAt]
    );
    
    res.json({
      success: true,
      data: {
        qr_id: qrId,
        qr_code_url: qrCodeUrl,
        expires_at: expiresAt
      }
    });
    
  } catch (error) {
    console.error('生成二维码失败:', error);
    res.status(500).json({ success: false, message: '生成二维码失败' });
  }
});

// 检查微信扫码状态
app.get('/api/auth/wechat/status/:qrId', async (req, res) => {
  try {
    const { qrId } = req.params;
    
    const [qrCodes] = await pool.execute(
      'SELECT * FROM wechat_qr_codes WHERE id = ?',
      [qrId]
    );
    
    if (qrCodes.length === 0) {
      return res.status(404).json({ success: false, message: '二维码不存在' });
    }
    
    const qrCode = qrCodes[0];
    
    // 检查是否过期
    if (new Date() > new Date(qrCode.expires_at)) {
      await pool.execute(
        'UPDATE wechat_qr_codes SET status = "expired" WHERE id = ?',
        [qrId]
      );
      return res.json({ success: true, data: { status: 'expired' } });
    }
    
    // 如果已确认，生成token并返回用户信息
    if (qrCode.status === 'confirmed' && qrCode.user_info) {
      const userInfo = JSON.parse(qrCode.user_info);
      
      // 查找或创建用户
      let [users] = await pool.execute(
        'SELECT * FROM users WHERE wechat_openid = ?',
        [qrCode.openid]
      );
      
      let user;
      if (users.length === 0) {
        // 创建新用户
        const [result] = await pool.execute(
          'INSERT INTO users (username, avatar, login_type, wechat_openid, last_login_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)',
          [userInfo.nickname || `微信用户${qrCode.openid.slice(-6)}`, userInfo.headimgurl, 'wechat', qrCode.openid]
        );
        
        user = {
          id: result.insertId,
          username: userInfo.nickname || `微信用户${qrCode.openid.slice(-6)}`,
          avatar: userInfo.headimgurl,
          login_type: 'wechat',
          wechat_openid: qrCode.openid
        };
      } else {
        user = users[0];
        // 更新最后登录时间
        await pool.execute(
          'UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?',
          [user.id]
        );
      }
      
      // 生成JWT token
      const token = jwt.sign(
        { id: user.id, username: user.username, login_type: user.login_type, role: user.role || 'user' },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );
      
      // 删除已使用的二维码
      await pool.execute('DELETE FROM wechat_qr_codes WHERE id = ?', [qrId]);
      
      return res.json({
        success: true,
        data: {
          status: 'confirmed',
          token,
          user: {
            id: user.id,
            username: user.username,
            avatar: user.avatar,
            login_type: user.login_type
          }
        }
      });
    }
    
    res.json({
      success: true,
      data: {
        status: qrCode.status
      }
    });
    
  } catch (error) {
    console.error('检查扫码状态失败:', error);
    res.status(500).json({ success: false, message: '检查扫码状态失败' });
  }
});

// 模拟微信扫码确认（实际项目中这个接口由微信回调）
app.post('/api/auth/wechat/confirm/:qrId', async (req, res) => {
  try {
    const { qrId } = req.params;
    const { openid, userInfo } = req.body;
    
    await pool.execute(
      'UPDATE wechat_qr_codes SET status = "confirmed", openid = ?, user_info = ? WHERE id = ? AND status = "pending"',
      [openid, JSON.stringify(userInfo), qrId]
    );
    
    res.json({ success: true, message: '确认成功' });
    
  } catch (error) {
    console.error('确认扫码失败:', error);
    res.status(500).json({ success: false, message: '确认扫码失败' });
  }
});

// 获取当前用户信息
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const [users] = await pool.execute(
      'SELECT id, username, email, avatar, login_type, last_login_at, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    
    res.json({
      success: true,
      data: {
        user: users[0]
      }
    });
    
  } catch (error) {
    console.error('获取用户信息失败:', error);
    res.status(500).json({ success: false, message: '获取用户信息失败' });
  }
});

// 更新题目（仅管理员可访问）
app.put('/api/questions/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { question, options, correctAnswer, explanation } = req.body;
    
    // 将选项数组转换为单独的字段
    const option_a = options[0] || null;
    const option_b = options[1] || null;
    const option_c = options[2] || null;
    const option_d = options[3] || null;
    const option_e = options[4] || null;
    
    await pool.execute(
      `UPDATE questions SET 
       question_text = ?, 
       option_a = ?, 
       option_b = ?, 
       option_c = ?, 
       option_d = ?, 
       option_e = ?, 
       correct_answer = ?, 
       explanation = ? 
       WHERE id = ?`,
      [question, option_a, option_b, option_c, option_d, option_e, correctAnswer, explanation, id]
    );
    
    res.json({ success: true, message: '题目更新成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 删除题目（仅管理员可访问）
app.delete('/api/questions/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    await pool.execute('DELETE FROM questions WHERE id = ?', [id]);
    res.json({ success: true, message: '题目删除成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 设置微信路由的数据库连接池
setWechatPool(pool);

// 微信登录相关路由
app.use('/api/wechat', wechatRouter);

// 健康检查端点
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// 启动服务器
app.listen(PORT, async () => {
  logger.info(`服务器启动成功`, {
    port: PORT,
    url: `http://localhost:${PORT}`,
    env: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
  await initDatabase();
});

module.exports = app;