-- 创建数据库
CREATE DATABASE IF NOT EXISTS question_bank CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建应用用户
CREATE USER IF NOT EXISTS 'app_user'@'%' IDENTIFIED BY 'app_password';

-- 授权
GRANT ALL PRIVILEGES ON question_bank.* TO 'app_user'@'%';

-- 刷新权限
FLUSH PRIVILEGES;

-- 使用数据库
USE question_bank;

-- 创建题目表
CREATE TABLE IF NOT EXISTS questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  question_text TEXT NOT NULL,
  question_type ENUM('single', 'multiple', 'judge', 'fill') NOT NULL DEFAULT 'single',
  options JSON,
  correct_answer TEXT NOT NULL,
  explanation TEXT,
  difficulty ENUM('easy', 'medium', 'hard') DEFAULT 'medium',
  category VARCHAR(100),
  tags JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_category (category),
  INDEX idx_difficulty (difficulty),
  INDEX idx_question_type (question_type),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建用户表
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  email VARCHAR(100),
  role ENUM('admin', 'user') DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_username (username),
  INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建练习记录表
CREATE TABLE IF NOT EXISTS practice_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  question_id INT,
  user_answer TEXT,
  is_correct BOOLEAN,
  time_spent INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_question_id (question_id),
  INDEX idx_is_correct (is_correct),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建错题记录表
CREATE TABLE IF NOT EXISTS wrong_questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  question_id INT,
  user_answer TEXT,
  mistake_count INT DEFAULT 1,
  last_mistake_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_question (user_id, question_id),
  INDEX idx_user_id (user_id),
  INDEX idx_question_id (question_id),
  INDEX idx_is_resolved (is_resolved),
  INDEX idx_last_mistake_at (last_mistake_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 插入默认管理员用户（密码：admin123，已加密）
INSERT IGNORE INTO users (username, password, email, role) VALUES 
('admin', '$2b$10$8K1p/a0dCVWHxqRXnqUNiOCdOzp8f5qJQGjvfuOb5OGjvfuOb5OGjv', 'admin@example.com', 'admin');

-- 插入示例题目
INSERT IGNORE INTO questions (question_text, question_type, options, correct_answer, explanation, difficulty, category) VALUES 
('以下哪个是JavaScript的数据类型？', 'single', '["string", "number", "boolean", "以上都是"]', '以上都是', 'JavaScript有多种基本数据类型，包括string、number、boolean等。', 'easy', '编程基础'),
('HTML是什么的缩写？', 'single', '["HyperText Markup Language", "High Tech Modern Language", "Home Tool Markup Language", "Hyperlink and Text Markup Language"]', 'HyperText Markup Language', 'HTML是HyperText Markup Language的缩写，即超文本标记语言。', 'easy', 'Web开发'),
('CSS可以用来做什么？', 'multiple', '["设置网页样式", "控制布局", "添加动画效果", "处理用户交互"]', '["设置网页样式", "控制布局", "添加动画效果"]', 'CSS主要用于样式设置、布局控制和动画效果，用户交互主要由JavaScript处理。', 'medium', 'Web开发');