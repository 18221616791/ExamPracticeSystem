const fs = require('fs');
const path = require('path');

// 创建日志目录
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// 日志级别
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

// 获取当前时间戳
function getTimestamp() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

// 格式化日志消息
function formatMessage(level, message, meta = {}) {
  const timestamp = getTimestamp();
  const metaStr = Object.keys(meta).length > 0 ? ` | ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] [${level}] ${message}${metaStr}`;
}

// 写入日志文件
function writeToFile(level, message, meta = {}) {
  const today = new Date().toISOString().slice(0, 10);
  const logFile = path.join(logDir, `${today}.log`);
  const errorLogFile = path.join(logDir, `error-${today}.log`);
  
  const formattedMessage = formatMessage(level, message, meta) + '\n';
  
  // 写入通用日志文件
  fs.appendFileSync(logFile, formattedMessage);
  
  // 错误日志单独记录
  if (level === 'ERROR') {
    fs.appendFileSync(errorLogFile, formattedMessage);
  }
}

// 日志记录器类
class Logger {
  constructor(module = 'APP') {
    this.module = module;
    this.level = process.env.LOG_LEVEL || 'INFO';
  }

  shouldLog(level) {
    return LOG_LEVELS[level] <= LOG_LEVELS[this.level];
  }

  error(message, meta = {}) {
    if (this.shouldLog('ERROR')) {
      const fullMessage = `[${this.module}] ${message}`;
      console.error(`\x1b[31m${formatMessage('ERROR', fullMessage, meta)}\x1b[0m`);
      writeToFile('ERROR', fullMessage, meta);
    }
  }

  warn(message, meta = {}) {
    if (this.shouldLog('WARN')) {
      const fullMessage = `[${this.module}] ${message}`;
      console.warn(`\x1b[33m${formatMessage('WARN', fullMessage, meta)}\x1b[0m`);
      writeToFile('WARN', fullMessage, meta);
    }
  }

  info(message, meta = {}) {
    if (this.shouldLog('INFO')) {
      const fullMessage = `[${this.module}] ${message}`;
      console.log(`\x1b[36m${formatMessage('INFO', fullMessage, meta)}\x1b[0m`);
      writeToFile('INFO', fullMessage, meta);
    }
  }

  debug(message, meta = {}) {
    if (this.shouldLog('DEBUG')) {
      const fullMessage = `[${this.module}] ${message}`;
      console.log(`\x1b[37m${formatMessage('DEBUG', fullMessage, meta)}\x1b[0m`);
      writeToFile('DEBUG', fullMessage, meta);
    }
  }

  // 记录HTTP请求
  logRequest(req, res, next) {
    const start = Date.now();
    const { method, url, ip, headers } = req;
    
    this.info(`HTTP请求开始`, {
      method,
      url,
      ip: ip || req.connection.remoteAddress,
      userAgent: headers['user-agent']
    });

    // 监听响应结束
    res.on('finish', () => {
      const duration = Date.now() - start;
      const { statusCode } = res;
      
      const logLevel = statusCode >= 400 ? 'error' : 'info';
      this[logLevel](`HTTP请求完成`, {
        method,
        url,
        statusCode,
        duration: `${duration}ms`
      });
    });

    if (next) next();
  }

  // 记录数据库操作
  logDatabase(operation, table, data = {}) {
    this.info(`数据库操作`, {
      operation,
      table,
      data: JSON.stringify(data).slice(0, 200) // 限制数据长度
    });
  }

  // 记录文件操作
  logFile(operation, filename, details = {}) {
    this.info(`文件操作`, {
      operation,
      filename,
      ...details
    });
  }

  // 记录用户操作
  logUser(userId, action, details = {}) {
    this.info(`用户操作`, {
      userId,
      action,
      ...details
    });
  }
}

// 创建默认日志实例
const logger = new Logger();

// 导出
module.exports = {
  Logger,
  logger
};