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

// 启动服务器
initDatabase()
  .then(() => {
    app.listen(PORT, HOST, () => {
      // 根据监听地址显示不同的访问URL
      let accessUrl;
      if (HOST === '0.0.0.0') {
        accessUrl = `http://localhost:${PORT} 或 http://127.0.0.1:${PORT}`;
      } else {
        accessUrl = `http://${HOST}:${PORT}`;
      }
      console.log(`服务器运行在 http://${HOST}:${PORT}`);
      console.log(`访问地址: ${accessUrl}`);
      console.log(`提示: 可通过环境变量 HOST 修改监听地址 (当前: ${HOST})`);
      if (DEPLOY_URL) {
        console.log(`部署URL: ${DEPLOY_URL} (用于callback_url等场景)`);
      } else {
        console.log(`提示: 可通过环境变量 DEPLOY_URL 或 CALLBACK_URL 设置部署URL，避免localhost导致的问题`);
      }
    });
  })
  .catch(err => {
    console.error('数据库初始化失败:', err);
  });
