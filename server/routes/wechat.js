const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
const { Logger } = require('../utils/logger');

const router = express.Router();
const logger = new Logger('WECHAT');

// 微信公众号配置
const WECHAT_CONFIG = {
  appId: process.env.WECHAT_APPID || '',
  appSecret: process.env.WECHAT_APPSECRET || '',
  redirectUri: process.env.WECHAT_REDIRECT_URI || 'http://localhost:3000/api/wechat/callback'
};

// JWT配置
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';

// 数据库连接池（从主应用传入）
let pool;

// 设置数据库连接池
function setPool(dbPool) {
  pool = dbPool;
}

/**
 * 生成微信授权登录URL
 * 用于公众号菜单点击跳转
 */
router.get('/auth-url', (req, res) => {
  try {
    if (!WECHAT_CONFIG.appId) {
      return res.status(500).json({
        success: false,
        message: '微信配置未完成，请联系管理员'
      });
    }

    // 生成state参数用于防CSRF攻击
    const state = crypto.randomBytes(16).toString('hex');
    
    // 构造微信授权URL
    const authUrl = `https://open.weixin.qq.com/connect/oauth2/authorize?` +
      `appid=${WECHAT_CONFIG.appId}&` +
      `redirect_uri=${encodeURIComponent(WECHAT_CONFIG.redirectUri)}&` +
      `response_type=code&` +
      `scope=snsapi_userinfo&` +
      `state=${state}#wechat_redirect`;

    logger.info('生成微信授权URL', { state, authUrl });

    res.json({
      success: true,
      data: {
        authUrl,
        state
      }
    });
  } catch (error) {
    logger.error('生成微信授权URL失败', error);
    res.status(500).json({
      success: false,
      message: '生成授权链接失败'
    });
  }
});

/**
 * 微信授权回调处理
 * 用户授权后微信会重定向到这个接口
 */
router.get('/callback', async (req, res) => {
  try {
    const { code, state } = req.query;

    logger.info('收到微信授权回调', { code, state });

    if (!code) {
      logger.warn('微信授权回调缺少code参数');
      return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:8080'}/login?error=auth_failed`);
    }

    // 第一步：通过code换取access_token
    const tokenResponse = await axios.get('https://api.weixin.qq.com/sns/oauth2/access_token', {
      params: {
        appid: WECHAT_CONFIG.appId,
        secret: WECHAT_CONFIG.appSecret,
        code: code,
        grant_type: 'authorization_code'
      }
    });

    const tokenData = tokenResponse.data;
    logger.info('获取微信access_token响应', tokenData);

    if (tokenData.errcode) {
      logger.error('获取微信access_token失败', tokenData);
      return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:8080'}/login?error=token_failed`);
    }

    const { access_token, openid } = tokenData;

    // 第二步：通过access_token获取用户信息
    const userResponse = await axios.get('https://api.weixin.qq.com/sns/userinfo', {
      params: {
        access_token: access_token,
        openid: openid,
        lang: 'zh_CN'
      }
    });

    const userInfo = userResponse.data;
    logger.info('获取微信用户信息响应', userInfo);

    if (userInfo.errcode) {
      logger.error('获取微信用户信息失败', userInfo);
      return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:8080'}/login?error=userinfo_failed`);
    }

    // 第三步：处理用户登录逻辑
    const loginResult = await handleWechatLogin(userInfo);

    if (loginResult.success) {
      // 登录成功，重定向到前端并携带token
      const redirectUrl = `${process.env.CLIENT_URL || 'http://localhost:8080'}/login/success?token=${loginResult.token}`;
      res.redirect(redirectUrl);
    } else {
      logger.error('微信登录处理失败', loginResult);
      res.redirect(`${process.env.CLIENT_URL || 'http://localhost:8080'}/login?error=login_failed`);
    }

  } catch (error) {
    logger.error('微信授权回调处理失败', error);
    res.redirect(`${process.env.CLIENT_URL || 'http://localhost:8080'}/login?error=server_error`);
  }
});

/**
 * 处理微信登录逻辑
 * @param {Object} userInfo 微信用户信息
 * @returns {Object} 登录结果
 */
async function handleWechatLogin(userInfo) {
  try {
    const { openid, nickname, headimgurl, unionid } = userInfo;

    // 查找是否已存在该微信用户
    const [existingUsers] = await pool.execute(
      'SELECT * FROM users WHERE wechat_openid = ?',
      [openid]
    );

    let user;

    if (existingUsers.length > 0) {
      // 用户已存在，更新登录时间和用户信息
      user = existingUsers[0];
      await pool.execute(
        `UPDATE users SET 
         avatar = ?, 
         last_login_at = CURRENT_TIMESTAMP,
         wechat_unionid = ?
         WHERE id = ?`,
        [headimgurl, unionid || null, user.id]
      );
      
      logger.info('微信用户登录', { userId: user.id, nickname });
    } else {
      // 新用户，创建账户
      const username = `wx_${openid.substring(0, 10)}`; // 生成用户名
      
      const [insertResult] = await pool.execute(
        `INSERT INTO users 
         (username, avatar, login_type, wechat_openid, wechat_unionid, role, status) 
         VALUES (?, ?, 'wechat', ?, ?, 'user', 'active')`,
        [username, headimgurl, openid, unionid || null]
      );

      user = {
        id: insertResult.insertId,
        username: username,
        avatar: headimgurl,
        login_type: 'wechat',
        role: 'user'
      };

      logger.info('创建新微信用户', { userId: user.id, nickname });
    }

    // 生成JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username, 
        login_type: 'wechat', 
        role: user.role || 'user' 
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return {
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        avatar: user.avatar,
        login_type: 'wechat',
        role: user.role || 'user'
      }
    };

  } catch (error) {
    logger.error('处理微信登录失败', error);
    return {
      success: false,
      message: '登录处理失败'
    };
  }
}

/**
 * 获取微信用户信息（需要登录）
 */
router.get('/userinfo', async (req, res) => {
  try {
    // 这里需要认证中间件，从token中获取用户ID
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '未登录'
      });
    }

    const [users] = await pool.execute(
      'SELECT id, username, avatar, wechat_openid, login_type, role, created_at FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    res.json({
      success: true,
      data: users[0]
    });

  } catch (error) {
    logger.error('获取微信用户信息失败', error);
    res.status(500).json({
      success: false,
      message: '获取用户信息失败'
    });
  }
});

module.exports = {
  router,
  setPool
};