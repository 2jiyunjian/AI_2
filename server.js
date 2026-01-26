const express = require('express');
const cors = require('cors');
const { initDatabase } = require('./db');
const authRouter = require('./routes/auth');
const aiRouter = require('./routes/ai');
const digitalHumanRouter = require('./routes/digitalHuman');

const app = express();
const PORT = process.env.PORT || 3000;

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
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`服务器运行在 http://0.0.0.0:${PORT}`);
    });
  })
  .catch(err => {
    console.error('数据库初始化失败:', err);
  });
