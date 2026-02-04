const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

// 数据库文件路径
const DB_PATH = path.join(__dirname, 'users.db');

let db;

// 初始化数据库
async function initDatabase() {
  const SQL = await initSqlJs();

  // 如果数据库文件存在，则加载它
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
    console.log('已加载现有数据库');
  } else {
    db = new SQL.Database();
    console.log('创建新数据库');
  }

  // 创建用户表
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      balance REAL NOT NULL DEFAULT 0,
      consumed REAL NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 兼容旧库：若表已存在且无 balance/consumed，则添加列
  try {
    const info = db.exec("PRAGMA table_info(users)");
    const columns = (info[0] && info[0].values) ? info[0].values.map((row) => row[1]) : [];
    if (columns.length > 0 && !columns.includes('balance')) {
      db.run('ALTER TABLE users ADD COLUMN balance REAL NOT NULL DEFAULT 0');
      console.log('已添加 users.balance 列');
    }
    if (columns.length > 0 && !columns.includes('consumed')) {
      db.run('ALTER TABLE users ADD COLUMN consumed REAL NOT NULL DEFAULT 0');
      console.log('已添加 users.consumed 列');
    }
  } catch (e) {
    console.warn('迁移 users 表列时忽略:', e.message);
  }

  // 作品存储表（key 区分来源，如 media_studio / cn_dh / intl_dh；data 为 JSON 数组）
  db.run(`
    CREATE TABLE IF NOT EXISTS works_store (
      key TEXT PRIMARY KEY,
      data TEXT NOT NULL DEFAULT '[]',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // API Key 配置：user_id = 0 表示默认 Key，否则为对应用户的 Key
  db.run(`
    CREATE TABLE IF NOT EXISTS api_keys (
      user_id INTEGER NOT NULL DEFAULT 0,
      provider TEXT NOT NULL,
      api_key TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, provider)
    )
  `);

  // 钱包充值与扣款记录
  db.run(`
    CREATE TABLE IF NOT EXISTS wallet_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      balance_after REAL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.run('CREATE INDEX IF NOT EXISTS idx_wallet_records_user_created ON wallet_records(user_id, created_at DESC)');

  // AI 创作工坊：待退款记录（任务失败时按 task_id 退款）
  db.run(`
    CREATE TABLE IF NOT EXISTS pending_task_deductions (
      task_id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  saveDatabase();
  console.log('数据库初始化完成');
}

// 保存数据库到文件
function saveDatabase() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

// 获取数据库实例
function getDb() {
  if (!db) {
    throw new Error('数据库尚未初始化，请先调用 initDatabase()');
  }
  return db;
}

// 读取作品列表（key 如 'media_studio_works'）
function getWorksStore(key) {
  const database = getDb();
  const r = database.exec('SELECT data FROM works_store WHERE key = ?', [key]);
  if (!r.length || !r[0].values.length) return [];
  try {
    return JSON.parse(r[0].values[0][0] || '[]');
  } catch (e) {
    return [];
  }
}

// 保存作品列表
function setWorksStore(key, list) {
  const database = getDb();
  const data = JSON.stringify(Array.isArray(list) ? list : []);
  database.run(
    'INSERT OR REPLACE INTO works_store (key, data, updated_at) VALUES (?, ?, datetime("now"))',
    [key, data]
  );
  saveDatabase();
}

// ---------- API Key 配置（默认 + 按用户） ----------
// 获取某用户或默认的 API Key：userId 为 null/undefined/0 表示默认
function getApiKey(userId, provider) {
  const database = getDb();
  const id = (userId == null || userId === 0) ? 0 : parseInt(userId, 10);
  const r = database.exec(
    'SELECT api_key FROM api_keys WHERE user_id = ? AND provider = ?',
    [id, provider]
  );
  if (!r.length || !r[0].values.length) return null;
  return r[0].values[0][0] || null;
}

// 设置某用户或默认的 API Key；空字符串表示删除
function setApiKey(userId, provider, apiKey) {
  const database = getDb();
  const id = (userId == null || userId === 0) ? 0 : parseInt(userId, 10);
  if (!apiKey || String(apiKey).trim() === '') {
    database.run('DELETE FROM api_keys WHERE user_id = ? AND provider = ?', [id, provider]);
  } else {
    database.run(
      'INSERT OR REPLACE INTO api_keys (user_id, provider, api_key, updated_at) VALUES (?, ?, ?, datetime("now"))',
      [id, provider, String(apiKey).trim()]
    );
  }
  saveDatabase();
}

// ---------- 钱包：余额与消耗 ----------
// ---------- 服务端扣款单价配置（由管理员管理） ----------
const DEFAULT_WALLET_PRICING = {
  yunwu_recite: 1,           // 诵读文案（云雾诵读视频）
  yunwu_content_video: 1,   // 统一内容视频-诵读
  yunwu_promote: 1,         // 卖货推送（云雾内容视频 type=promote）
  yunwu_digital_human: 1,
  yunwu_image: 0.5,
  // AI 创作工坊
  yunwu_image2video: 1,
  yunwu_text2video: 1,
  yunwu_lipsync: 1,
  yunwu_multi_image2image: 0.5,
  yunwu_multi_image2video: 1,
  yunwu_text2audio: 0.5,
  yunwu_tts: 0.5,
  yunwu_video2audio: 0.5,
};

// 获取扣款单价配置（服务端/管理员设置）
function getWalletPricing() {
  const list = getWorksStore('wallet_pricing');
  const first = Array.isArray(list) && list.length > 0 ? list[0] : null;
  if (first && typeof first === 'object') {
    return { ...DEFAULT_WALLET_PRICING, ...first };
  }
  return { ...DEFAULT_WALLET_PRICING };
}

// 设置扣款单价配置（管理端调用）
function setWalletPricing(pricing) {
  if (!pricing || typeof pricing !== 'object') return;
  const current = getWalletPricing();
  const merged = { ...current, ...pricing };
  setWorksStore('wallet_pricing', [ merged ]);
}

// 从对象或其嵌套 data 中读取扣费金额（与云雾平台扣费一致时优先使用接口返回值）
function pickCostFromResponse(obj) {
  if (!obj || typeof obj !== 'object') return undefined;
  const cost = obj.cost ?? obj.amount ?? obj.credits_used ?? obj.credits_consumed ?? obj.price ?? obj.fee;
  const usageCost = obj.usage && typeof obj.usage === 'object' ? (obj.usage.cost ?? obj.usage.amount ?? obj.usage.credits_used) : undefined;
  const raw = cost ?? usageCost;
  const num = Number(raw);
  if (!isNaN(num) && num >= 0) return num;
  return undefined;
}

// 根据操作类型与 API 响应解析本次扣款金额：用户扣款额度 = 云雾扣费额度 * 扣款单价配置
function getDeductAmount(operationKey, apiResponseData) {
  const pricing = getWalletPricing();
  const configAmount = pricing[operationKey];
  const unitPrice = typeof configAmount === 'number' && configAmount >= 0 ? configAmount : DEFAULT_WALLET_PRICING[operationKey];
  let yunwuCost;
  if (apiResponseData && typeof apiResponseData === 'object') {
    yunwuCost = pickCostFromResponse(apiResponseData);
    if (yunwuCost == null) {
      const inner = apiResponseData.data && typeof apiResponseData.data === 'object' ? apiResponseData.data : null;
      yunwuCost = inner ? pickCostFromResponse(inner) : undefined;
      if (yunwuCost == null && inner) {
        const innerInner = inner.data && typeof inner.data === 'object' ? inner.data : null;
        yunwuCost = innerInner ? pickCostFromResponse(innerInner) : undefined;
      }
    }
  }
  if (yunwuCost != null) {
    return Math.round(yunwuCost * unitPrice * 100) / 100;
  }
  return unitPrice;
}

// 获取用户钱包（余额、历史消耗）
// 使用数字拼接避免 sql.js 部分环境 exec 不绑定参数导致查不到
function getWallet(userId) {
  if (userId == null || userId === undefined) return null;
  const database = getDb();
  const id = parseInt(userId, 10);
  if (isNaN(id) || id <= 0) return null;
  const r = database.exec(`SELECT balance, consumed FROM users WHERE id = ${id}`);
  if (!r.length || !r[0].values.length) return null;
  const row = r[0].values[0];
  const cols = r[0].columns;
  const balance = row[cols.indexOf('balance')];
  const consumed = row[cols.indexOf('consumed')];
  return {
    balance: Number(balance) || 0,
    consumed: Number(consumed) || 0,
  };
}

// 写入一条钱包记录（充值 recharge / 扣款 deduct）
function addWalletRecord(userId, type, amount, balanceAfter, description) {
  if (userId == null || !type || amount == null) {
    console.warn('addWalletRecord: 参数无效', { userId, type, amount });
    return;
  }
  const database = getDb();
  const id = parseInt(userId, 10);
  const amt = Number(amount);
  const bal = balanceAfter != null ? Number(balanceAfter) : null;
  if (isNaN(id) || id <= 0) {
    console.warn('addWalletRecord: userId 无效', { userId, id });
    return;
  }
  
  console.log('写入钱包记录:', { userId: id, type, amount: amt, balanceAfter: bal, description });
  
  try {
    // 先检查表是否存在
    const tableCheck = database.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='wallet_records'");
    if (!tableCheck || !tableCheck.length || !tableCheck[0].values.length) {
      console.error('wallet_records 表不存在，尝试创建...');
      database.run(`
        CREATE TABLE IF NOT EXISTS wallet_records (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          type TEXT NOT NULL,
          amount REAL NOT NULL,
          balance_after REAL,
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      database.run('CREATE INDEX IF NOT EXISTS idx_wallet_records_user_created ON wallet_records(user_id, created_at DESC)');
      saveDatabase();
    }
    
    const result = database.run(
      'INSERT INTO wallet_records (user_id, type, amount, balance_after, description) VALUES (?, ?, ?, ?, ?)',
      [id, String(type).toLowerCase(), amt, bal, description ? String(description).trim() : '']
    );
    
    // 验证记录是否写入
    const verify = database.exec(`SELECT id, type, amount FROM wallet_records WHERE user_id = ${id} ORDER BY id DESC LIMIT 1`);
    if (verify && verify.length && verify[0].values.length) {
      const cols = verify[0].columns;
      const row = verify[0].values[0];
      console.log('钱包记录写入成功并验证:', { 
        userId: id, 
        type, 
        amount: amt,
        insertedId: row[cols.indexOf('id')],
        insertedType: row[cols.indexOf('type')],
        insertedAmount: row[cols.indexOf('amount')]
      });
    } else {
      console.warn('钱包记录写入后验证失败，未找到刚插入的记录');
    }
    
    saveDatabase();
  } catch (e) {
    console.error('addWalletRecord 写入失败:', e.message, e.stack, { userId: id, type, amount, balanceAfter, description });
    throw e;
  }
}

// 扣款：仅当余额足够时扣除，并累加历史消耗；写入扣款记录。返回新余额；不足时返回 null。
function deductBalance(userId, amount, description) {
  if (userId == null || amount == null || Number(amount) <= 0) {
    console.warn('deductBalance: 参数无效', { userId, amount });
    return null;
  }
  const database = getDb();
  const id = parseInt(userId, 10);
  const amt = Number(amount);
  if (isNaN(id) || id <= 0 || isNaN(amt) || amt <= 0) {
    console.warn('deductBalance: 参数解析失败', { userId, id, amount, amt });
    return null;
  }
  const wallet = getWallet(id);
  if (!wallet || wallet.balance < amt) {
    console.warn('deductBalance: 余额不足', { userId: id, balance: wallet?.balance, amount: amt });
    return null;
  }
  
  console.log('开始扣款:', { userId: id, amount: amt, description, balanceBefore: wallet.balance });
  
  database.run(
    'UPDATE users SET balance = balance - ?, consumed = consumed + ? WHERE id = ?',
    [amt, amt, id]
  );
  saveDatabase();
  const after = getWallet(id);
  const newBalance = after ? after.balance : null;
  
  if (newBalance != null) {
    console.log('扣款成功，准备写入记录:', { userId: id, amount: amt, newBalance, description });
    try {
      addWalletRecord(id, 'deduct', amt, newBalance, description || '扣款');
      console.log('扣款记录写入成功:', { userId: id, amount: amt, newBalance });
    } catch (e) {
      console.error('扣款记录写入失败，余额已扣:', e.message, e.stack, { userId: id, amount: amt, description });
      // 即使记录写入失败，也返回新余额（因为余额已经扣了）
    }
  } else {
    console.error('扣款后无法获取新余额:', { userId: id, amount: amt });
  }
  
  return newBalance;
}

// 赠送/充值：增加用户余额并写入一条 recharge 记录。返回新余额；失败返回 null。
function addBalance(userId, amount, description) {
  if (userId == null || amount == null || Number(amount) <= 0) return null;
  const database = getDb();
  const id = parseInt(userId, 10);
  const amt = Number(amount);
  if (isNaN(id) || id <= 0 || isNaN(amt) || amt <= 0) return null;
  database.run('UPDATE users SET balance = balance + ? WHERE id = ?', [amt, id]);
  saveDatabase();
  const after = getWallet(id);
  const newBalance = after ? after.balance : null;
  if (newBalance != null) {
    addWalletRecord(id, 'recharge', amt, newBalance, description || '充值');
  }
  return newBalance;
}

// 取消扣款/退款：撤销之前的扣款，恢复余额并减少历史消耗；写入退款记录。返回新余额；失败返回 null。
function refundBalance(userId, amount, description) {
  if (userId == null || amount == null || Number(amount) <= 0) return null;
  const database = getDb();
  const id = parseInt(userId, 10);
  const amt = Number(amount);
  if (isNaN(id) || id <= 0 || isNaN(amt) || amt <= 0) return null;
  // 恢复余额，减少历史消耗（但不完全撤销，保留记录）
  database.run(
    'UPDATE users SET balance = balance + ?, consumed = GREATEST(0, consumed - ?) WHERE id = ?',
    [amt, amt, id]
  );
  saveDatabase();
  const after = getWallet(id);
  const newBalance = after ? after.balance : null;
  if (newBalance != null) {
    try {
      addWalletRecord(id, 'refund', amt, newBalance, description || '退款/取消扣款');
    } catch (e) {
      console.error('退款记录写入失败，余额已恢复:', e.message, { userId: id, amount: amt, description });
    }
  }
  return newBalance;
}

// ---------- AI 创作工坊：待退款记录（任务失败时退款） ----------
function addPendingDeduction(taskId, userId, amount, description) {
  if (!taskId || userId == null || amount == null) return;
  const database = getDb();
  const id = parseInt(userId, 10);
  const amt = Number(amount);
  if (isNaN(id) || id <= 0 || isNaN(amt) || amt <= 0) return;
  try {
    database.run(
      'INSERT INTO pending_task_deductions (task_id, user_id, amount, description) VALUES (?, ?, ?, ?)',
      [String(taskId), id, amt, description ? String(description).trim() : '']
    );
    saveDatabase();
  } catch (e) {
    console.error('addPendingDeduction 写入失败:', e.message, { taskId, userId, amount });
    throw e;
  }
}

function getPendingDeduction(taskId) {
  if (!taskId) return null;
  const database = getDb();
  const escaped = String(taskId).replace(/'/g, "''");
  const r = database.exec(`SELECT user_id, amount, description FROM pending_task_deductions WHERE task_id = '${escaped}' LIMIT 1`);
  if (!r.length || !r[0].values.length) return null;
  const cols = r[0].columns;
  const row = r[0].values[0];
  return {
    userId: row[cols.indexOf('user_id')],
    amount: Number(row[cols.indexOf('amount')]) || 0,
    description: row[cols.indexOf('description')] || '',
  };
}

function removePendingDeduction(taskId) {
  if (!taskId) return;
  const database = getDb();
  const escaped = String(taskId).replace(/'/g, "''");
  database.run("DELETE FROM pending_task_deductions WHERE task_id = ?", [String(taskId)]);
  saveDatabase();
}

// 获取全部用户及其钱包信息（管理端）
function getAllUsersWithWallet() {
  const database = getDb();
  const r = database.exec('SELECT id, username, role, balance, consumed FROM users ORDER BY id');
  if (!r.length || !r[0].values.length) return [];
  const cols = r[0].columns;
  return r[0].values.map((row) => ({
    id: row[cols.indexOf('id')],
    username: row[cols.indexOf('username')] || '',
    role: row[cols.indexOf('role')] || 'user',
    balance: Number(row[cols.indexOf('balance')]) || 0,
    consumed: Number(row[cols.indexOf('consumed')]) || 0,
  }));
}

// 获取全部用户的充值与扣款记录（管理端），按时间倒序
function getAllWalletRecords(limit) {
  const database = getDb();
  const cap = Math.min(Math.max(Number(limit) || 200, 1), 1000);
  const r = database.exec(
    `SELECT wr.id, wr.user_id, wr.type, wr.amount, wr.balance_after, wr.description, wr.created_at, u.username ` +
    `FROM wallet_records wr LEFT JOIN users u ON wr.user_id = u.id ORDER BY wr.created_at DESC LIMIT ${cap}`
  );
  if (!r.length || !r[0].values.length) return [];
  const cols = r[0].columns;
  return r[0].values.map((row) => ({
    id: row[cols.indexOf('id')],
    user_id: row[cols.indexOf('user_id')],
    username: row[cols.indexOf('username')] != null ? row[cols.indexOf('username')] : '',
    type: row[cols.indexOf('type')] || 'deduct',
    amount: Number(row[cols.indexOf('amount')]) || 0,
    balance_after: row[cols.indexOf('balance_after')] != null ? Number(row[cols.indexOf('balance_after')]) : null,
    description: row[cols.indexOf('description')] || '',
    created_at: row[cols.indexOf('created_at')] || '',
  }));
}

// 获取用户钱包记录（充值/扣款），按时间倒序，默认最多 100 条
function getWalletRecords(userId, limit) {
  if (userId == null || userId === undefined) return [];
  const database = getDb();
  const id = parseInt(userId, 10);
  if (isNaN(id) || id <= 0) return [];
  const cap = Math.min(Math.max(Number(limit) || 100, 1), 500);
  const r = database.exec(
    `SELECT id, type, amount, balance_after, description, created_at FROM wallet_records WHERE user_id = ${id} ORDER BY created_at DESC LIMIT ${cap}`
  );
  if (!r.length || !r[0].values.length) return [];
  const cols = r[0].columns;
  return r[0].values.map((row) => ({
    id: row[cols.indexOf('id')],
    type: row[cols.indexOf('type')] || 'deduct',
    amount: Number(row[cols.indexOf('amount')]) || 0,
    balance_after: row[cols.indexOf('balance_after')] != null ? Number(row[cols.indexOf('balance_after')]) : null,
    description: row[cols.indexOf('description')] || '',
    created_at: row[cols.indexOf('created_at')] || '',
  }));
}

// 获取所有 API 配置（管理员用）：默认(user_id=0) + 每个用户的 key
function getAllApiKeysForAdmin() {
  const database = getDb();
  const defaultRows = database.exec(
    'SELECT provider, api_key FROM api_keys WHERE user_id = 0'
  );
  const userRows = database.exec(
    'SELECT user_id, provider, api_key FROM api_keys WHERE user_id != 0 ORDER BY user_id, provider'
  );
  const defaultKeys = { heygen: null, yunwu: null };
  if (defaultRows.length && defaultRows[0].values.length) {
    const cols = defaultRows[0].columns;
    defaultRows[0].values.forEach((row) => {
      const provider = row[cols.indexOf('provider')];
      defaultKeys[provider] = row[cols.indexOf('api_key')];
    });
  }
  const byUser = {};
  if (userRows.length && userRows[0].values.length) {
    const cols = userRows[0].columns;
    userRows[0].values.forEach((row) => {
      const uid = row[cols.indexOf('user_id')];
      const provider = row[cols.indexOf('provider')];
      const key = row[cols.indexOf('api_key')];
      if (!byUser[uid]) byUser[uid] = { heygen: null, yunwu: null };
      byUser[uid][provider] = key;
    });
  }
  return { default: defaultKeys, byUser };
}

module.exports = {
  initDatabase,
  saveDatabase,
  getDb,
  getWorksStore,
  setWorksStore,
  getApiKey,
  setApiKey,
  getWalletPricing,
  setWalletPricing,
  getDeductAmount,
  getWallet,
  deductBalance,
  addBalance,
  refundBalance,
  addWalletRecord,
  getWalletRecords,
  addPendingDeduction,
  getPendingDeduction,
  removePendingDeduction,
  getAllUsersWithWallet,
  getAllWalletRecords,
  getAllApiKeysForAdmin,
  DB_PATH,
};

