#!/usr/bin/env node

/**
 * Webhook 自动部署脚本
 * 适用于Git仓库的webhook触发自动部署
 * 支持GitHub、GitLab、Gitee等平台
 */

const express = require('express');
const crypto = require('crypto');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.WEBHOOK_PORT || 3001;
const SECRET = process.env.WEBHOOK_SECRET || 'your-webhook-secret';
const PROJECT_PATH = process.env.PROJECT_PATH || '/opt/question-bank/current';
const GIT_BRANCH = process.env.GIT_BRANCH || 'main';

// 日志函数
function log(message, type = 'INFO') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${type}] ${message}`;
    console.log(logMessage);
    
    // 写入日志文件
    const logFile = path.join(__dirname, 'webhook.log');
    fs.appendFileSync(logFile, logMessage + '\n');
}

// 验证GitHub webhook签名
function verifyGitHubSignature(payload, signature) {
    const hmac = crypto.createHmac('sha256', SECRET);
    hmac.update(payload);
    const calculatedSignature = 'sha256=' + hmac.digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(calculatedSignature));
}

// 验证GitLab webhook token
function verifyGitLabToken(token) {
    return token === SECRET;
}

// 执行命令
function executeCommand(command, cwd = PROJECT_PATH) {
    return new Promise((resolve, reject) => {
        log(`执行命令: ${command}`);
        exec(command, { cwd }, (error, stdout, stderr) => {
            if (error) {
                log(`命令执行失败: ${error.message}`, 'ERROR');
                reject(error);
                return;
            }
            if (stderr) {
                log(`命令警告: ${stderr}`, 'WARN');
            }
            if (stdout) {
                log(`命令输出: ${stdout}`);
            }
            resolve(stdout);
        });
    });
}

// 部署函数
async function deploy() {
    try {
        log('开始自动部署...');
        
        // 1. 拉取最新代码
        await executeCommand(`git fetch origin ${GIT_BRANCH}`);
        await executeCommand(`git reset --hard origin/${GIT_BRANCH}`);
        log('代码更新完成');
        
        // 2. 安装依赖
        await executeCommand('npm install');
        await executeCommand('cd client && npm install');
        log('依赖安装完成');
        
        // 3. 构建前端
        await executeCommand('npm run build');
        log('前端构建完成');
        
        // 4. 重启服务
        await executeCommand('docker-compose down');
        await executeCommand('docker-compose up -d');
        log('服务重启完成');
        
        // 5. 等待服务启动
        await new Promise(resolve => setTimeout(resolve, 30000));
        
        // 6. 健康检查
        try {
            await executeCommand('curl -f http://localhost/health');
            log('健康检查通过');
        } catch (error) {
            log('健康检查失败，但部署继续', 'WARN');
        }
        
        log('自动部署完成', 'SUCCESS');
        return { success: true, message: '部署成功' };
        
    } catch (error) {
        log(`部署失败: ${error.message}`, 'ERROR');
        
        // 尝试回滚
        try {
            log('尝试回滚到上一个版本...');
            await executeCommand('git reset --hard HEAD~1');
            await executeCommand('docker-compose restart');
            log('回滚完成', 'WARN');
        } catch (rollbackError) {
            log(`回滚失败: ${rollbackError.message}`, 'ERROR');
        }
        
        return { success: false, message: error.message };
    }
}

// 中间件：解析JSON和原始body
app.use('/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());

// GitHub Webhook处理
app.post('/webhook/github', async (req, res) => {
    try {
        const signature = req.get('X-Hub-Signature-256');
        const event = req.get('X-GitHub-Event');
        
        if (!signature) {
            return res.status(400).json({ error: '缺少签名' });
        }
        
        // 验证签名
        if (!verifyGitHubSignature(req.body, signature)) {
            log('GitHub webhook签名验证失败', 'ERROR');
            return res.status(401).json({ error: '签名验证失败' });
        }
        
        const payload = JSON.parse(req.body.toString());
        
        // 只处理push事件到指定分支
        if (event === 'push' && payload.ref === `refs/heads/${GIT_BRANCH}`) {
            log(`收到GitHub push事件，分支: ${payload.ref}`);
            
            // 异步执行部署
            deploy().then(result => {
                log(`部署结果: ${JSON.stringify(result)}`);
            });
            
            res.json({ message: '部署已触发' });
        } else {
            log(`忽略GitHub事件: ${event}, 分支: ${payload.ref}`);
            res.json({ message: '事件已忽略' });
        }
        
    } catch (error) {
        log(`GitHub webhook处理错误: ${error.message}`, 'ERROR');
        res.status(500).json({ error: '内部服务器错误' });
    }
});

// GitLab Webhook处理
app.post('/webhook/gitlab', async (req, res) => {
    try {
        const token = req.get('X-Gitlab-Token');
        
        if (!token || !verifyGitLabToken(token)) {
            log('GitLab webhook token验证失败', 'ERROR');
            return res.status(401).json({ error: 'Token验证失败' });
        }
        
        const payload = req.body;
        
        // 只处理push事件到指定分支
        if (payload.object_kind === 'push' && payload.ref === `refs/heads/${GIT_BRANCH}`) {
            log(`收到GitLab push事件，分支: ${payload.ref}`);
            
            // 异步执行部署
            deploy().then(result => {
                log(`部署结果: ${JSON.stringify(result)}`);
            });
            
            res.json({ message: '部署已触发' });
        } else {
            log(`忽略GitLab事件: ${payload.object_kind}, 分支: ${payload.ref}`);
            res.json({ message: '事件已忽略' });
        }
        
    } catch (error) {
        log(`GitLab webhook处理错误: ${error.message}`, 'ERROR');
        res.status(500).json({ error: '内部服务器错误' });
    }
});

// Gitee Webhook处理
app.post('/webhook/gitee', async (req, res) => {
    try {
        const payload = req.body;
        
        // Gitee的简单验证（可以根据需要添加更复杂的验证）
        if (!payload.repository || !payload.ref) {
            return res.status(400).json({ error: '无效的Gitee webhook数据' });
        }
        
        // 只处理push事件到指定分支
        if (payload.ref === `refs/heads/${GIT_BRANCH}`) {
            log(`收到Gitee push事件，分支: ${payload.ref}`);
            
            // 异步执行部署
            deploy().then(result => {
                log(`部署结果: ${JSON.stringify(result)}`);
            });
            
            res.json({ message: '部署已触发' });
        } else {
            log(`忽略Gitee事件，分支: ${payload.ref}`);
            res.json({ message: '事件已忽略' });
        }
        
    } catch (error) {
        log(`Gitee webhook处理错误: ${error.message}`, 'ERROR');
        res.status(500).json({ error: '内部服务器错误' });
    }
});

// 手动触发部署
app.post('/deploy/manual', async (req, res) => {
    try {
        const { token } = req.body;
        
        if (token !== SECRET) {
            return res.status(401).json({ error: 'Token验证失败' });
        }
        
        log('收到手动部署请求');
        
        const result = await deploy();
        res.json(result);
        
    } catch (error) {
        log(`手动部署错误: ${error.message}`, 'ERROR');
        res.status(500).json({ error: '部署失败', message: error.message });
    }
});

// 健康检查
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        project_path: PROJECT_PATH,
        git_branch: GIT_BRANCH
    });
});

// 查看部署日志
app.get('/logs', (req, res) => {
    try {
        const logFile = path.join(__dirname, 'webhook.log');
        if (fs.existsSync(logFile)) {
            const logs = fs.readFileSync(logFile, 'utf8');
            const lines = logs.split('\n').slice(-100); // 最近100行
            res.json({ logs: lines });
        } else {
            res.json({ logs: [] });
        }
    } catch (error) {
        res.status(500).json({ error: '读取日志失败' });
    }
});

// 启动服务器
app.listen(PORT, () => {
    log(`Webhook服务器启动，端口: ${PORT}`);
    log(`项目路径: ${PROJECT_PATH}`);
    log(`监听分支: ${GIT_BRANCH}`);
    log('支持的webhook端点:');
    log('  - GitHub: POST /webhook/github');
    log('  - GitLab: POST /webhook/gitlab');
    log('  - Gitee:  POST /webhook/gitee');
    log('  - 手动:   POST /deploy/manual');
    log('  - 健康:   GET  /health');
    log('  - 日志:   GET  /logs');
});

// 优雅关闭
process.on('SIGTERM', () => {
    log('收到SIGTERM信号，正在关闭服务器...');
    process.exit(0);
});

process.on('SIGINT', () => {
    log('收到SIGINT信号，正在关闭服务器...');
    process.exit(0);
});

// 未捕获的异常处理
process.on('uncaughtException', (error) => {
    log(`未捕获的异常: ${error.message}`, 'ERROR');
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    log(`未处理的Promise拒绝: ${reason}`, 'ERROR');
});

module.exports = app;