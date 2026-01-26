const express = require('express');
const bcrypt = require('bcryptjs');
const { getDb, saveDatabase } = require('../db');

const router = express.Router();

// 注册接口
router.post('/register', async (req, res) => {
  try {
    const db = getDb();
    const { username, password, role } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: '用户名和密码不能为空' });
    }

    if (username.length < 3) {
      return res.status(400).json({ success: false, message: '用户名至少3个字符' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: '密码至少6个字符' });
    }

    // 检查用户是否已存在
    const result = db.exec('SELECT * FROM users WHERE username = ?', [username]);
    if (result.length > 0 && result[0].values.length > 0) {
      return res.status(400).json({ success: false, message: '用户名已存在' });
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 插入新用户
    db.run('INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
      [username, hashedPassword, role || 'user']);

    saveDatabase();

    res.json({ success: true, message: '注册成功' });
  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 登录接口
router.post('/login', async (req, res) => {
  try {
    const db = getDb();
    const { username, password, role } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: '用户名和密码不能为空' });
    }

    // 查找用户
    const result = db.exec('SELECT * FROM users WHERE username = ? AND role = ?',
      [username, role || 'user']);

    if (result.length === 0 || result[0].values.length === 0) {
      return res.status(401).json({ success: false, message: '用户不存在或角色不匹配' });
    }

    const userRow = result[0].values[0];
    const columns = result[0].columns;

    // 构建用户对象
    const user = {};
    columns.forEach((col, index) => {
      user[col] = userRow[index];
    });

    // 验证密码
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ success: false, message: '密码错误' });
    }

    res.json({
      success: true,
      message: '登录成功',
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 获取所有用户（仅管理员）
router.get('/users', (req, res) => {
  try {
    const db = getDb();
    const result = db.exec('SELECT id, username, role, created_at FROM users');

    if (result.length === 0) {
      return res.json({ success: true, users: [] });
    }

    const columns = result[0].columns;
    const users = result[0].values.map(row => {
      const user = {};
      columns.forEach((col, index) => {
        user[col] = row[index];
      });
      return user;
    });

    res.json({ success: true, users });
  } catch (error) {
    console.error('获取用户列表错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

module.exports = router;

