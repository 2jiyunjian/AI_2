const express = require('express');
const cors = require('cors');
const { initDatabase } = require('./db');
const authRouter = require('./routes/auth');
const aiRouter = require('./routes/ai');
const digitalHumanRouter = require('./routes/digitalHuman');

const app = express();
const PORT = process.env.PORT || 3000;
// 可配置的监听地址：支持 localhost, 127.0.0.1, 0.0.0.0 或自定义IP
const HOST = process.env.HOST || '0.0.0.0';
// 部署后的URL（用于callback_url等场景，避免localhost导致的问题）
const DEPLOY_URL = process.env.DEPLOY_URL || process.env.CALLBACK_URL || '';

// 中间件
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// 处理 favicon.ico 请求，避免 404 错误
app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});

// 分组路由
app.use('/api', authRouter);
app.use('/api', aiRouter);
app.use('/api', digitalHumanRouter);

// 网络连接测试端点（用于诊断部署环境网络问题）
app.get('/api/test-network', async (req, res) => {
  try {
    console.log('=== 网络连接测试 ===');
    console.log('测试时间:', new Date().toISOString());
    console.log('测试目标: yunwu.ai');
    
    const testUrl = 'https://yunwu.ai';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    try {
      const startTime = Date.now();
      const response = await fetch(testUrl, { 
        method: 'HEAD',
        signal: controller.signal,
        headers: {
          'User-Agent': 'AI-DigitalHuman-Platform/1.0'
        }
      });
      const duration = Date.now() - startTime;
      clearTimeout(timeoutId);
      
      console.log('网络测试成功:', {
        status: response.status,
        duration: `${duration}ms`,
        url: response.url
      });
      
      res.json({
        success: true,
        status: response.status,
        duration: `${duration}ms`,
        message: '可以访问 yunwu.ai',
        timestamp: new Date().toISOString()
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);
      console.error('网络测试失败:', {
        errorType: fetchError.constructor.name,
        errorName: fetchError.name,
        errorMessage: fetchError.message,
        errorCode: fetchError.code
      });
      
      res.json({
        success: false,
        error: fetchError.message,
        errorType: fetchError.constructor.name,
        errorCode: fetchError.code,
        message: '无法访问 yunwu.ai',
        timestamp: new Date().toISOString(),
        suggestion: '可能是部署环境网络限制，请检查防火墙或网络配置'
      });
    }
  } catch (error) {
    console.error('网络测试端点错误:', error);
    res.json({
      success: false,
      error: error.message,
      message: '测试过程中发生错误'
    });
  }
});

// 启动服务器
initDatabase()
  .then(() => {
    app.listen(PORT, HOST, () => {
      // 根据监听地址显示不同的访问URL
      let accessUrl;
      if (DEPLOY_URL) {
        accessUrl = DEPLOY_URL;
      } else if (HOST === '0.0.0.0') {
        // 生产环境应使用DEPLOY_URL，这里仅作为开发提示
        accessUrl = `请配置 DEPLOY_URL 环境变量`;
      } else {
        accessUrl = `http://${HOST}:${PORT}`;
      }
      console.log(`服务器运行在 http://${HOST}:${PORT}`);
      if (DEPLOY_URL) {
        console.log(`部署URL: ${DEPLOY_URL} (所有API调用将使用此地址)`);
        console.log(`访问地址: ${DEPLOY_URL}`);
      } else {
        console.log(`访问地址: ${accessUrl}`);
        console.log(`⚠️ 警告: 未配置 DEPLOY_URL，请设置环境变量 DEPLOY_URL 以使用线上地址`);
      }
      console.log(`提示: 可通过环境变量 HOST 修改监听地址 (当前: ${HOST})`);
    });
  })
  .catch(err => {
    console.error('数据库初始化失败:', err);
  });
