/**
 * 畅联支付（payunk.com）接入
 * 文档：统一下单、回调验签、订单查询、退款
 */
const crypto = require('crypto');
const { getWorksStore, setWorksStore, addBalance } = require('../db');

const PAYUNK_APPID = process.env.PAYUNK_APPID || '';
const PAYUNK_KEY = process.env.PAYUNK_KEY || '';
const PAYUNK_BASE = 'https://api2.payunk.com';

const PENDING_ORDERS_KEY = 'payunk_pending_orders';

/** 参与签名的参数：按 key 字典序排序，空值不参与，拼接 key=value&...，最后 &key=商户密钥，MD5 后转大写（或小写） */
function makeSign(data, key, toUpperCase = true) {
  const filtered = {};
  Object.keys(data || {}).forEach((k) => {
    if (data[k] !== '' && data[k] !== undefined && data[k] !== null && k !== 'sign') {
      filtered[k] = typeof data[k] === 'object' ? JSON.stringify(data[k]) : String(data[k]);
    }
  });
  const keys = Object.keys(filtered).sort();
  const stringA = keys.map((k) => `${k}=${filtered[k]}`).join('&');
  const stringSignTemp = stringA + '&key=' + key;
  const sign = crypto.createHash('md5').update(stringSignTemp, 'utf8').digest('hex');
  return toUpperCase ? sign.toUpperCase() : sign.toLowerCase();
}

function getPendingOrders() {
  try {
    const raw = getWorksStore(PENDING_ORDERS_KEY);
    return Array.isArray(raw) ? raw : [];
  } catch (e) {
    return [];
  }
}

function setPendingOrders(orders) {
  const list = Array.isArray(orders) ? orders : [];
  setWorksStore(PENDING_ORDERS_KEY, list.slice(-10000));
}

function findAndConsumePending(outTradeNo) {
  const orders = getPendingOrders();
  const idx = orders.findIndex((o) => o.out_trade_no === outTradeNo);
  if (idx < 0) return null;
  const item = orders[idx];
  orders.splice(idx, 1);
  setPendingOrders(orders);
  return item;
}

/** 生成商户订单号 */
function generateOutTradeNo() {
  return 'PAY_' + Date.now() + '_' + Math.random().toString(36).slice(2, 11);
}

/**
 * 创建支付订单（统一下单）
 * POST /api/payunk/create
 * body: { amount, pay_type?, success_url?, error_url? }
 * 需登录；返回 { success, url, out_trade_no, message }
 */
async function createOrder(req, res) {
  if (!PAYUNK_APPID || !PAYUNK_KEY) {
    return res.status(503).json({ success: false, message: '支付未配置（PAYUNK_APPID/PAYUNK_KEY）' });
  }
  const userId = req.user && req.user.id;
  if (!userId) {
    return res.status(401).json({ success: false, message: '请先登录' });
  }
  const amount = parseFloat(req.body && req.body.amount);
  if (isNaN(amount) || amount <= 0) {
    return res.status(400).json({ success: false, message: '请传入有效金额 amount（元），保留两位小数' });
  }
  const payType = (req.body && req.body.pay_type) || 'wechat';
  const deployUrl = (process.env.DEPLOY_URL || process.env.CALLBACK_URL || '').replace(/\/+$/, '');
  if (!deployUrl) {
    return res.status(500).json({ success: false, message: '请配置 DEPLOY_URL 或 CALLBACK_URL 作为支付回调根地址' });
  }
  const callbackUrl = deployUrl + '/api/payunk/callback';
  const successUrl = (req.body && req.body.success_url) || deployUrl + '/recharge.html?success=1';
  const errorUrl = (req.body && req.body.error_url) || deployUrl + '/recharge.html?error=1';

  const outTradeNo = generateOutTradeNo();
  const amountStr = amount.toFixed(2);
  const extend = JSON.stringify({ user_id: userId });

  const params = {
    appid: PAYUNK_APPID,
    pay_type: payType,
    amount: amountStr,
    callback_url: callbackUrl,
    success_url: successUrl,
    error_url: errorUrl,
    extend,
    out_trade_no: outTradeNo,
  };
  params.sign = makeSign(params, PAYUNK_KEY, true);

  const orders = getPendingOrders();
  orders.push({ out_trade_no: outTradeNo, userId, amount: amountStr, createdAt: new Date().toISOString() });
  setPendingOrders(orders);

  const url = PAYUNK_BASE + '/index/unifiedorder?format=json';
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(params).toString(),
    });
    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch (e) { data = {}; }
    if (data.code !== 200) {
      return res.status(400).json({ success: false, message: data.msg || '创建订单失败', data });
    }
    return res.json({ success: true, url: data.url, out_trade_no: outTradeNo });
  } catch (err) {
    return res.status(502).json({ success: false, message: err.message || '请求支付网关失败' });
  }
}

/**
 * 支付成功回调（畅联 POST 到此地址）
 * POST /api/payunk/callback
 * 验签后给对应用户加余额，并返回 "success"
 */
function handleCallback(req, res) {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  const body = req.body || {};
  const callbacks = body.callbacks;
  const outTradeNo = body.out_trade_no;
  const amountStr = body.amount;
  const theirSign = body.sign;

  if (!outTradeNo || !theirSign) {
    return res.status(400).send('bad request');
  }
  if (!PAYUNK_KEY) {
    console.error('[Payunk] PAYUNK_KEY not configured, cannot verify callback signature');
    return res.status(503).send('service unavailable');
  }
  const sign = makeSign(body, PAYUNK_KEY, true);
  if (sign !== theirSign) {
    console.error('[Payunk] Callback signature mismatch. Expected:', sign, 'Got:', theirSign);
    return res.status(400).send('sign error');
  }
  if (callbacks !== 'CODE_SUCCESS') {
    return res.send('success');
  }
  const pending = findAndConsumePending(outTradeNo);
  if (!pending) {
    return res.send('success');
  }
  const amount = parseFloat(amountStr);
  if (isNaN(amount) || amount <= 0) amount = parseFloat(pending.amount);
  if (amount > 0) {
    addBalance(pending.userId, amount, '畅联支付充值-' + outTradeNo);
  }
  return res.send('success');
}

/**
 * 订单查询
 * POST /api/payunk/query
 * body: { out_trade_no }
 */
async function queryOrder(req, res) {
  if (!PAYUNK_APPID || !PAYUNK_KEY) {
    return res.status(503).json({ success: false, message: '支付未配置（PAYUNK_APPID/PAYUNK_KEY）' });
  }
  const outTradeNo = req.body && req.body.out_trade_no;
  if (!outTradeNo) {
    return res.status(400).json({ success: false, message: '请传入 out_trade_no' });
  }
  const params = { appid: PAYUNK_APPID, out_trade_no: outTradeNo };
  params.sign = makeSign(params, PAYUNK_KEY, false);

  const url = PAYUNK_BASE + '/index/getorder';
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(params).toString(),
    });
    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch (e) { data = {}; }
    if (data.code !== 200) {
      return res.json({ success: false, message: data.msg || '查询失败', code: data.code });
    }
    return res.json({ success: true, data: data.data });
  } catch (err) {
    return res.status(502).json({ success: false, message: err.message || '请求失败' });
  }
}

module.exports = {
  createOrder,
  handleCallback,
  queryOrder,
  makeSign,
};
