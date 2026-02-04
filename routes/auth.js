const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { getDb, saveDatabase, getApiKey, setApiKey, getWallet, getWalletRecords, addBalance, refundBalance, getWalletPricing, setWalletPricing, getAllUsersWithWallet, getAllWalletRecords, getAllApiKeysForAdmin } = require('../db');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-in-production';

function base64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function signToken(payload) {
  const payloadStr = JSON.stringify(payload);
  const payloadB64 = base64url(Buffer.from(payloadStr, 'utf8'));
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(payloadB64).digest();
  return payloadB64 + '.' + base64url(sig);
}

function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.trim().split('.');
  if (parts.length !== 2) return null;
  const [payloadB64, sigB64] = parts;
  const sig = Buffer.from(sigB64.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  const expected = crypto.createHmac('sha256', JWT_SECRET).update(payloadB64).digest();
  if (!crypto.timingSafeEqual(sig, expected)) return null;
  try {
    const payloadStr = Buffer.from(payloadB64.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
    const payload = JSON.parse(payloadStr);
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch (e) { return null; }
}

function requireAuth(req, res, next) {
  const raw = req.headers.authorization || req.headers.Authorization || '';
  const token = (raw.replace(/^Bearer\s+/i, '').trim()) || (req.body && req.body.token) || (req.query && req.query.token);
  const user = verifyToken(token);
  if (!user) {
    return res.status(401).json({ success: false, message: '未登录或登录已过期' });
  }
  req.user = user;
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: '需要管理员权限' });
  }
  next();
}

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

    const token = signToken({
      id: user.id,
      username: user.username,
      role: user.role,
      exp: Date.now() + 7 * 24 * 3600 * 1000,
    });
    res.json({
      success: true,
      message: '登录成功',
      token,
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

// 获取当前用户钱包（余额、历史消耗、扣款记录）
router.get('/wallet', requireAuth, (req, res) => {
  try {
    const userId = req.user && req.user.id;
    const wallet = getWallet(userId);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
    const records = getWalletRecords(userId, limit);
    if (!wallet) {
      return res.json({ 
        success: true, 
        balance: 0, 
        consumed: 0,
        records: []
      });
    }
    res.json({
      success: true,
      balance: wallet.balance,
      consumed: wallet.consumed,
      records: records,
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message || '获取钱包失败' });
  }
});

// 获取当前用户钱包信息（完整版，包含所有信息）
router.get('/wallet/info', requireAuth, (req, res) => {
  try {
    const userId = req.user && req.user.id;
    const wallet = getWallet(userId);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 500);
    const records = getWalletRecords(userId, limit);
    const pricing = getWalletPricing();
    if (!wallet) {
      return res.json({ 
        success: true, 
        balance: 0, 
        consumed: 0,
        records: [],
        pricing: pricing
      });
    }
    res.json({
      success: true,
      balance: wallet.balance,
      consumed: wallet.consumed,
      records: records,
      pricing: pricing
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message || '获取钱包信息失败' });
  }
});

// 获取当前用户充值与扣款记录
router.get('/wallet/records', requireAuth, (req, res) => {
  try {
    const userId = req.user && req.user.id;
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
    const records = getWalletRecords(userId, limit);
    res.json({ success: true, records });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message || '获取记录失败' });
  }
});

// 获取当前用户可用的 API Key（优先用户配置，否则默认）
router.get('/config/api-keys', requireAuth, (req, res) => {
  try {
    const userId = req.user && req.user.id;
    const heygen = getApiKey(userId, 'heygen') || getApiKey(0, 'heygen');
    const yunwu = getApiKey(userId, 'yunwu') || getApiKey(0, 'yunwu');
    res.json({ success: true, heygen: heygen || '', yunwu: yunwu || '' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message || '获取失败' });
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

// ---------- 管理员：API Key 配置（默认 + 按用户） ----------
function maskKey(key) {
  if (!key || key.length <= 8) return key ? '****' : '';
  return key.slice(0, 4) + '****' + key.slice(-4);
}

function handleGetAdminApiKeys(req, res) {
  try {
    const { default: defaultKeys, byUser } = getAllApiKeysForAdmin();
    const db = getDb();
    const result = db.exec('SELECT id, username, role FROM users ORDER BY id');
    const users = (result.length && result[0].values.length)
      ? result[0].values.map(row => ({
          id: row[0],
          username: row[1],
          role: row[2],
          heygen: byUser[row[0]] ? (byUser[row[0]].heygen || '') : '',
          yunwu: byUser[row[0]] ? (byUser[row[0]].yunwu || '') : '',
        }))
      : [];
    res.json({
      success: true,
      default: {
        heygen: defaultKeys.heygen || '',
        yunwu: defaultKeys.yunwu || '',
      },
      defaultMasked: {
        heygen: maskKey(defaultKeys.heygen),
        yunwu: maskKey(defaultKeys.yunwu),
      },
      users: users.map(u => ({
        id: u.id,
        username: u.username,
        role: u.role,
        heygen: u.heygen || '',
        yunwu: u.yunwu || '',
        heygenMasked: maskKey(u.heygen),
        yunwuMasked: maskKey(u.yunwu),
      })),
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message || '获取失败' });
  }
}

function handlePutAdminApiKeys(req, res) {
  try {
    const { type, userId, heygen, yunwu } = req.body || {};
    if (type === 'default') {
      if (heygen !== undefined) setApiKey(0, 'heygen', heygen);
      if (yunwu !== undefined) setApiKey(0, 'yunwu', yunwu);
      return res.json({ success: true, message: '默认 API Key 已更新' });
    }
    if (type === 'user' && userId != null) {
      const uid = parseInt(userId, 10);
      if (isNaN(uid) || uid <= 0) return res.status(400).json({ success: false, message: '无效的 userId' });
      if (heygen !== undefined) setApiKey(uid, 'heygen', heygen);
      if (yunwu !== undefined) setApiKey(uid, 'yunwu', yunwu);
      return res.json({ success: true, message: '用户 API Key 已更新' });
    }
    res.status(400).json({ success: false, message: '请提供 type (default|user) 及 userId（type=user 时）' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message || '更新失败' });
  }
}

router.get('/admin/api-keys', requireAuth, requireAdmin, handleGetAdminApiKeys);
router.put('/admin/api-keys', requireAuth, requireAdmin, handlePutAdminApiKeys);

// ---------- 管理端：用户钱包管理 ----------
// 获取全部用户及钱包（余额、历史消耗）
router.get('/admin/wallet/users', requireAuth, requireAdmin, (req, res) => {
  try {
    const users = getAllUsersWithWallet();
    res.json({ success: true, users });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message || '获取用户钱包失败' });
  }
});

// 获取全部用户的充值与扣款记录
router.get('/admin/wallet/records', requireAuth, requireAdmin, (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 200, 1), 1000);
    const records = getAllWalletRecords(limit);
    res.json({ success: true, records });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message || '获取记录失败' });
  }
});

// 获取扣款单价配置（管理员）
router.get('/admin/wallet/pricing', requireAuth, requireAdmin, (req, res) => {
  try {
    const pricing = getWalletPricing();
    res.json({ success: true, pricing });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message || '获取配置失败' });
  }
});

// 保存扣款单价配置（管理员）
router.put('/admin/wallet/pricing', requireAuth, requireAdmin, (req, res) => {
  try {
    const pricing = req.body && req.body.pricing;
    if (!pricing || typeof pricing !== 'object') {
      return res.status(400).json({ success: false, message: '请提供 pricing 对象' });
    }
    setWalletPricing(pricing);
    res.json({ success: true, message: '扣款单价已更新', pricing: getWalletPricing() });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message || '保存失败' });
  }
});

// 赠送余额（管理员）
router.post('/admin/wallet/grant', requireAuth, requireAdmin, (req, res) => {
  try {
    const userId = req.body && (req.body.userId != null ? parseInt(req.body.userId, 10) : null);
    const amount = req.body && (req.body.amount != null ? Number(req.body.amount) : 100);
    if (!userId || isNaN(userId) || userId <= 0) {
      return res.status(400).json({ success: false, message: '请指定有效用户 ID' });
    }
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ success: false, message: '赠送金额须大于 0' });
    }
    const newBalance = addBalance(userId, amount, '管理员赠送');
    if (newBalance == null) {
      return res.status(400).json({ success: false, message: '用户不存在或赠送失败' });
    }
    res.json({ success: true, message: '赠送成功', balance: newBalance });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message || '赠送失败' });
  }
});

module.exports = router;
module.exports.requireAuth = requireAuth;
module.exports.requireAdmin = requireAdmin;
module.exports.verifyToken = verifyToken;
module.exports.handleGetAdminApiKeys = handleGetAdminApiKeys;
module.exports.handlePutAdminApiKeys = handlePutAdminApiKeys;

