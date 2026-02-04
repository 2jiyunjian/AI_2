const express = require('express');
const path = require('path');
const cors = require('cors');
const { initDatabase, getWorksStore, setWorksStore, getApiKey, getWallet, getWalletPricing, getDeductAmount, deductBalance, getWalletRecords, addPendingDeduction, getPendingDeduction, removePendingDeduction, refundBalance } = require('./db');
const authRouter = require('./routes/auth');
const aiRouter = require('./routes/ai');
const digitalHumanRouter = require('./routes/digitalHuman');
const payunk = require('./routes/payunk');

const app = express();
const PORT = process.env.PORT || 3000;
// 可配置的监听地址：支持 localhost, 127.0.0.1, 0.0.0.0 或自定义IP
const HOST = process.env.HOST || '0.0.0.0';
// 部署后的URL（用于callback_url等场景，避免localhost导致的问题）
const DEPLOY_URL = process.env.DEPLOY_URL || process.env.CALLBACK_URL || '';

// 中间件
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));
app.use(express.static('public'));
// 音色试听文件：显式挂载，确保 /tts-demos/文件名 可访问
app.use('/tts-demos', express.static(path.join(__dirname, 'public', 'tts-demos')));

// 处理 favicon.ico 请求，避免 404 错误
app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});

// 作品存储 API（必须写在最前，持久化到项目目录数据库；修改后需重启 npm start）
const WORKS_STORE_KEYS = ['media_studio_works', 'cn_dh_works', 'intl_dh_works'];
app.get('/api/works/:key', (req, res) => {
  const key = req.params.key;
  if (!WORKS_STORE_KEYS.includes(key)) {
    return res.status(400).json({ success: false, message: '无效的 key' });
  }
  try {
    const list = getWorksStore(key);
    res.json({ success: true, list });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message || '读取失败' });
  }
});
app.post('/api/works/:key', (req, res) => {
  const key = req.params.key;
  if (!WORKS_STORE_KEYS.includes(key)) {
    return res.status(400).json({ success: false, message: '无效的 key' });
  }
  const list = req.body && (Array.isArray(req.body.list) ? req.body.list : Array.isArray(req.body) ? req.body : null);
  if (list == null) {
    return res.status(400).json({ success: false, message: '请提供 list 数组' });
  }
  try {
    setWorksStore(key, list);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message || '保存失败' });
  }
});

// 畅联支付（payunk）：回调必须为公开 POST，不校验登录
app.post('/api/payunk/callback', (req, res) => payunk.handleCallback(req, res));
app.post('/api/payunk/create', authRouter.requireAuth, (req, res) => payunk.createOrder(req, res));
app.post('/api/payunk/query', authRouter.requireAuth, (req, res) => payunk.queryOrder(req, res));

// 管理员 API Key 配置（显式注册，避免被其他 /api 路由覆盖导致 404）
app.get('/api/admin/api-keys', authRouter.requireAuth, authRouter.requireAdmin, authRouter.handleGetAdminApiKeys);
app.put('/api/admin/api-keys', authRouter.requireAuth, authRouter.requireAdmin, authRouter.handlePutAdminApiKeys);

// ========== TTS 音色列表（存数据库，可试听） ==========
// 默认种子：音色信息汇总（Voice Name, Voice ID, Voice Language, Voice Demo 文件名）
var TTS_VOICES_SEED = [
  { name: '阳光少年', voice_id: 'genshin_vindi2', language: 'zh', demo: 'genshin_vindi2.mp3' },
  { name: '懂事小弟', voice_id: 'zhinen_xuesheng', language: 'zh', demo: 'zhinen_xuesheng.mp3' },
  { name: '运动少年', voice_id: 'tiyuxi_xuedi', language: 'zh', demo: 'tiyuxi_xuedi.mp3' },
  { name: '青春少女', voice_id: 'ai_shatang', language: 'zh', demo: 'ai_shatang.mp3' },
  { name: '温柔小妹', voice_id: 'genshin_klee2', language: 'zh', demo: 'genshin_klee2.mp3' },
  { name: '元气少女', voice_id: 'genshin_kirara', language: 'zh', demo: 'genshin_kirara.mp3' },
  { name: '阳光男生', voice_id: 'ai_kaiya', language: 'zh', demo: 'ai_kaiya.mp3' },
  { name: '幽默小哥', voice_id: 'tiexin_nanyou', language: 'zh', demo: 'tiexin_nanyou.mp3' },
  { name: '文艺小哥', voice_id: 'ai_chenjiahao_712', language: 'zh', demo: 'ai_chenjiahao_712.mp3' },
  { name: '甜美邻家', voice_id: 'girlfriend_1_speech02', language: 'zh', demo: 'girlfriend_1_speech02.mp3' },
  { name: '温柔姐姐', voice_id: 'chat1_female_new-3', language: 'zh', demo: 'chat1_female_new-3.mp3' },
  { name: '职场女青', voice_id: 'girlfriend_2_speech02', language: 'zh', demo: 'girlfriend_2_speech02.mp3' },
  { name: '活泼男童', voice_id: 'cartoon-boy-07', language: 'zh', demo: 'cartoon-boy-07.mp3' },
  { name: '俏皮女童', voice_id: 'cartoon-girl-01', language: 'zh', demo: 'cartoon-girl-01.mp3' },
  { name: '稳重老爸', voice_id: 'ai_huangyaoshi_712', language: 'zh', demo: 'ai_huangyaoshi_712.mp3' },
  { name: '温柔妈妈', voice_id: 'you_pingjing', language: 'zh', demo: 'you_pingjing.mp3' },
  { name: '严肃上司', voice_id: 'ai_laoguowang_712', language: 'zh', demo: 'ai_laoguowang_712.mp3' },
  { name: '优雅贵妇', voice_id: 'chengshu_jiejie', language: 'zh', demo: 'chengshu_jiejie.mp3' },
  { name: '慈祥爷爷', voice_id: 'zhuxi_speech02', language: 'zh', demo: 'zhuxi_speech02.mp3' },
  { name: '唠叨爷爷', voice_id: 'uk_oldman3', language: 'zh', demo: 'uk_oldman3.mp3' },
  { name: '唠叨奶奶', voice_id: 'laopopo_speech02', language: 'zh', demo: 'laopopo_speech02.mp3' },
  { name: '和蔼奶奶', voice_id: 'heainainai_speech02', language: 'zh', demo: 'heainainai_speech02.mp3' },
  { name: '东北老铁', voice_id: 'dongbeilaotie_speech02', language: 'zh', demo: 'dongbeilaotie_speech02.mp3' },
  { name: '重庆小伙', voice_id: 'chongqingxiaohuo_speech02', language: 'zh', demo: 'chongqingxiaohuo_speech02.mp3' },
  { name: '四川妹子', voice_id: 'chuanmeizi_speech02', language: 'zh', demo: 'chuanmeizi_speech02.mp3' },
  { name: '潮汕大叔', voice_id: 'chaoshandashu_speech02', language: 'zh', demo: 'chaoshandashu_speech02.mp3' },
  { name: '台湾男生', voice_id: 'ai_taiwan_man2_speech02', language: 'zh', demo: 'ai_taiwan_man2_speech02.mp3' },
  { name: '西安掌柜', voice_id: 'xianzhanggui_speech02', language: 'zh', demo: 'xianzhanggui_speech02.mp3' },
  { name: '天津姐姐', voice_id: 'tianjinjiejie_speech02', language: 'zh', demo: 'tianjinjiejie_speech02.mp3' },
  { name: '新闻播报男', voice_id: 'diyinnansang_DB_CN_M_04-v2', language: 'zh', demo: 'diyinnansang_DB_CN_M_04-v2.wav' },
  { name: '译制片男', voice_id: 'yizhipiannan-v1', language: 'zh', demo: 'yizhipiannan-v1.wav' },
  { name: '元气少女', voice_id: 'guanxiaofang-v2', language: 'zh', demo: 'tianmeixuemei-v1.wav' },
  { name: '撒娇女友', voice_id: 'tianmeixuemei-v1', language: 'zh', demo: 'guanxiaofang-v2.wav' },
  { name: '刀片烟嗓', voice_id: 'daopianyansang-v1', language: 'zh', demo: 'daopianyansang-v1.wav' },
  { name: '乖巧正太', voice_id: 'mengwa-v1', language: 'zh', demo: 'mengwa-v1.wav' },
  { name: 'Sunny', voice_id: 'genshin_vindi2', language: 'en', demo: 'Sunny genshin_vindi2.mp3' },
  { name: 'Sage', voice_id: 'zhinen_xuesheng', language: 'en', demo: 'Sage zhinen_xuesheng.mp3' },
  { name: 'Ace', voice_id: 'AOT', language: 'en', demo: 'Ace AOT.mp3' },
  { name: 'Blossom', voice_id: 'ai_shatang', language: 'en', demo: 'Blossom ai_shatang.mp3' },
  { name: 'Peppy', voice_id: 'genshin_klee2', language: 'en', demo: 'Peppy genshin_klee2.mp3' },
  { name: 'Dove', voice_id: 'genshin_kirara', language: 'en', demo: 'Dove genshin_kirara.mp3' },
  { name: 'Shine', voice_id: 'ai_kaiya', language: 'en', demo: 'Shine ai_kaiya.mp3' },
  { name: 'Anchor', voice_id: 'oversea_male1', language: 'en', demo: 'Anchor oversea_male1.mp3' },
  { name: 'Lyric', voice_id: 'ai_chenjiahao_712', language: 'en', demo: 'Lyric ai_chenjiahao_712.mp3' },
  { name: 'Melody', voice_id: 'girlfriend_4_speech02', language: 'en', demo: 'Melody girlfriend_4_speech02.mp3' },
  { name: 'Tender', voice_id: 'chat1_female_new-3', language: 'en', demo: 'Tender chat1_female_new-3.mp3' },
  { name: 'Siren', voice_id: 'chat_0407_5-1', language: 'en', demo: 'Siren chat_0407_5-1.mp3' },
  { name: 'Zippy', voice_id: 'cartoon-boy-07', language: 'en', demo: 'Zippy cartoon-boy-07.mp3' },
  { name: 'Bud', voice_id: 'uk_boy1', language: 'en', demo: 'Bud uk_boy1.mp3' },
  { name: 'Sprite', voice_id: 'cartoon-girl-01', language: 'en', demo: 'Sprite cartoon-girl-01.mp3' },
  { name: 'Candy', voice_id: 'PeppaPig_platform', language: 'en', demo: 'Candy  PeppaPig_platform.mp3' },
  { name: 'Beacon', voice_id: 'ai_huangzhong_712', language: 'en', demo: 'Beacon ai_huangzhong_712.mp3' },
  { name: 'Rock', voice_id: 'ai_huangyaoshi_712', language: 'en', demo: 'Rock ai_huangyaoshi_712.mp3' },
  { name: 'Titan', voice_id: 'ai_laoguowang_712', language: 'en', demo: 'Titan ai_laoguowang_712.mp3' },
  { name: 'Grace', voice_id: 'chengshu_jiejie', language: 'en', demo: 'Grace  chengshu_jiejie.mp3' },
  { name: 'Helen', voice_id: 'you_pingjing', language: 'en', demo: 'Helen you_pingjing.mp3' },
  { name: 'Lore', voice_id: 'calm_story1', language: 'en', demo: 'Lore calm_story1.mp3' },
  { name: 'Crag', voice_id: 'uk_man2', language: 'en', demo: 'Crag uk_man2.mp3' },
  { name: 'Prattle', voice_id: 'laopopo_speech02', language: 'en', demo: 'Prattle laopopo_speech02.mp3' },
  { name: 'Hearth', voice_id: 'heainainai_speech02', language: 'en', demo: 'Hearth laopopo_speech02.mp3' },
  { name: 'The Reader', voice_id: 'reader_en_m-v1', language: 'en', demo: 'reader_en_m-v1.wav' },
  { name: 'Commercial Lady', voice_id: 'commercial_lady_en_f-v1', language: 'en', demo: 'commercial_lady_en_f-v1.wav' },
];

function getTtsVoicesList() {
  var list = getWorksStore('tts_voices');
  if (Array.isArray(list) && list.length > 0) return list;
  setWorksStore('tts_voices', TTS_VOICES_SEED);
  return TTS_VOICES_SEED;
}

// 音色试听基础 URL：demo 为文件名时拼接此地址；可将试听文件放到 public/tts-demos/ 目录
var TTS_DEMO_BASE = process.env.TTS_DEMO_BASE_URL || '/tts-demos/';

app.get('/api/tts/voices', function (req, res) {
  try {
    var list = getTtsVoicesList();
    var demoBase = (TTS_DEMO_BASE || '').trim();
    if (demoBase && !/^https?:\/\//i.test(demoBase)) demoBase = demoBase.replace(/\/+$/, '') + (demoBase ? '/' : '');
    var out = list.map(function (v) {
      var demo = (v && v.demo) ? String(v.demo).trim() : '';
      var demoUrl = '';
      if (demo) demoUrl = /^https?:\/\//i.test(demo) ? demo : (demoBase ? demoBase + encodeURIComponent(demo) : '');
      return {
        name: (v && v.name) || '',
        voice_id: (v && (v.voice_id || v.speakerId)) || '',
        language: (v && (v.language || v.voice_language)) || '',
        demo: demo,
        exampleUrl: demoUrl,
      };
    });
    res.json({ success: true, data: { ttsList: out } });
  } catch (e) {
    res.status(500).json({ success: false, message: (e && e.message) || '读取失败' });
  }
});

app.post('/api/tts/voices', function (req, res) {
  try {
    var list = req.body && (Array.isArray(req.body.list) ? req.body.list : req.body.ttsList);
    if (!Array.isArray(list)) return res.status(400).json({ success: false, message: '请提供 list 数组' });
    setWorksStore('tts_voices', list);
    res.json({ success: true, message: '已保存' });
  } catch (e) {
    res.status(500).json({ success: false, message: (e && e.message) || '保存失败' });
  }
});

// 创作工坊·云雾API接口（必须写在 app.use('/api', ...) 之前，否则会被 auth 等 router 先命中并 404）
const YUNWU_IMAGES = 'https://yunwu.ai/kling/v1/images/generations';
const YUNWU_IMAGES_MULTI_IMAGE2IMAGE = 'https://yunwu.ai/kling/v1/images/multi-image2image';
const YUNWU_VIDEOS_TEXT2VIDEO = 'https://yunwu.ai/kling/v1/videos/text2video';
const YUNWU_VIDEOS_IMAGE2VIDEO = 'https://yunwu.ai/kling/v1/videos/image2video';
const YUNWU_VIDEOS_IDENTIFY_FACE = 'https://yunwu.ai/kling/v1/videos/identify-face';
const YUNWU_VIDEOS_LIPSYNC = 'https://yunwu.ai/kling/v1/videos/advanced-lip-sync';
const YUNWU_VIDEOS_MULTI_IMAGE2VIDEO = 'https://yunwu.ai/kling/v1/videos/multi-image2video';
const YUNWU_AUDIO_TEXT_TO_AUDIO = 'https://yunwu.ai/kling/v1/audio/text-to-audio';
const YUNWU_AUDIO_VIDEO_TO_AUDIO = 'https://yunwu.ai/kling/v1/audio/video-to-audio';
const YUNWU_AUDIO_TTS = 'https://yunwu.ai/kling/v1/audio/tts';

// 云雾 API 请求失败时返回可读说明（fetch failed / 网络 / 超时等）
function formatYunwuFetchError(err) {
  if (err.name === 'AbortError') return '请求云雾 API 超时，请稍后重试。';
  const msg = (err.message || String(err)).toLowerCase();
  if (msg.includes('fetch failed') || msg.includes('econnrefused') || msg.includes('enotfound') || msg.includes('getaddrinfo') || msg.includes('network')) {
    return '无法连接云雾 API（网络错误）。请检查：1) 本机网络能否访问 yunwu.ai；2) 防火墙/代理；3) 若在服务器部署，需确保服务器可访问外网。';
  }
  if (msg.includes('certificate') || msg.includes('ssl') || msg.includes('tls')) return '连接云雾 API 时 SSL/TLS 出错，请检查系统证书或代理。';
  return err.message || String(err);
}

// 将云雾 API 返回的英文错误转为友好中文提示
function normalizeYunwuErrorMessage(msg) {
  if (msg == null || typeof msg !== 'string') return msg;
  const m = msg.toLowerCase();
  if (/risk control|failure to pass the risk control/i.test(m)) return '未通过内容安全检测，请修改提示词或参考内容后重试';
  if (/invalid tokens|please wait.*seconds|request id:/i.test(m)) return 'API Key 无效或无权限，请到云雾AI 令牌管理 检查';
  return msg;
}

// 云雾 API Key：优先使用登录用户的管理员分配 Key，否则使用请求体/头中的 Key（兼容旧版）
function getYunwuKey(req) {
  const r = getYunwuKeyAndUser(req);
  return r.key;
}

// 返回 { key, user }，用于扣款时取 userId
function getYunwuKeyAndUser(req) {
  const raw = req.headers.authorization || req.headers.Authorization || '';
  const token = raw.replace(/^Bearer\s+/i, '').trim() || (req.body && req.body.token) || (req.query && req.query.token);
  const user = token && authRouter.verifyToken ? authRouter.verifyToken(token) : null;
  let key = '';
  if (user) {
    const k = getApiKey(user.id, 'yunwu') || getApiKey(0, 'yunwu');
    if (k && String(k).trim()) key = String(k).trim();
  }
  if (!key) {
    const fromReq = (req.body && req.body.apiKey) || req.headers['x-api-key'] || (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '');
    key = fromReq && String(fromReq).trim() ? String(fromReq).trim() : '';
  }
  return { key, user };
}

// 从云雾创建任务响应中解析 task_id
function parseTaskIdFromYunwuResponse(data) {
  if (!data || typeof data !== 'object') return null;
  const fromData = (o) => (o && typeof o === 'object') ? (o.id ?? o.task_id ?? o.request_id ?? null) : null;
  return fromData(data.data) ?? fromData(data) ?? data.id ?? data.task_id ?? data.request_id ?? null;
}

// 从云雾查询任务响应中解析 status（与 works.js normalizeTaskStatus 一致）
function normalizeYunwuTaskStatus(s) {
  const t = (s || '').toString().toLowerCase();
  if (['succeed', 'succeeded', 'success', 'completed', 'done', 'finish', 'finished'].indexOf(t) >= 0) return 'completed';
  if (['fail', 'failed', 'error'].indexOf(t) >= 0) return 'failed';
  return 'processing';
}

// AI 创作工坊：POST 创建任务 + 扣款（成功且有 task_id 时扣款并记录 pending）
async function handleYunwuPostWithDeduction(req, res, yunwuUrl, body, operationKey, description) {
  const { key, user } = getYunwuKeyAndUser(req);
  if (!key) {
    return res.json({ success: false, message: '请先登录，由管理员在后台为您分配云雾 API Key' });
  }
  const userId = user && user.id;
  if (userId) {
    const pricing = getWalletPricing();
    const required = pricing[operationKey] ?? 0.5;
    const wallet = getWallet(userId);
    if (!wallet || wallet.balance < required) {
      return res.json({ success: false, message: '余额不足，请先充值后再使用' });
    }
  }
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);
  let response;
  try {
    response = await fetch(yunwuUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeoutId);
    const msg = err.name === 'AbortError' ? '请求超时' : (err.message || String(err));
    return res.json({ success: false, message: msg });
  }
  clearTimeout(timeoutId);
  const text = await response.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch (e) { data = {}; }
  if (!response.ok) {
    const msg = data?.message || data?.error?.message || data?.error || data?.detail || text || `请求失败 ${response.status}`;
    return res.status(response.status >= 400 ? response.status : 500).json({ success: false, message: normalizeYunwuErrorMessage(msg), data });
  }
  const taskId = parseTaskIdFromYunwuResponse(data);
  if (taskId == null || taskId === '') {
    return res.json({ success: false, message: '云雾未返回任务ID', data });
  }
  const taskIdStr = String(taskId);
  if (userId) {
    const amount = getDeductAmount(operationKey, data);
    const newBalance = deductBalance(userId, amount, description);
    if (newBalance == null) {
      return res.json({ success: false, message: '扣款失败，余额可能不足', data });
    }
    addPendingDeduction(taskIdStr, userId, amount, description);
    const records = getWalletRecords(userId, 5);
    const out = typeof data === 'object' && data !== null ? { ...data } : { data };
    out.deducted = amount;
    out.balance = newBalance;
    out.consumed = getWallet(userId).consumed;
    out.records = records;
    return res.json(out);
  }
  return res.json(typeof data === 'object' && data !== null ? data : { success: true, data });
}

// AI 创作工坊：GET 查询任务状态 + 失败时退款
async function handleYunwuGetWithRefund(req, res, yunwuUrl, taskId) {
  const key = getYunwuKey(req);
  if (!key) {
    return res.json({ success: false, message: '请先登录，由管理员在后台为您分配云雾 API Key' });
  }
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);
  let response;
  try {
    response = await fetch(yunwuUrl, {
      method: 'GET',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeoutId);
    const msg = err.name === 'AbortError' ? '请求超时' : (err.message || String(err));
    return res.json({ success: false, message: msg });
  }
  clearTimeout(timeoutId);
  const text = await response.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch (e) { data = {}; }
  if (!response.ok) {
    const msg = data?.message || data?.error?.message || data?.error || data?.detail || text || `请求失败 ${response.status}`;
    return res.status(response.status >= 400 ? response.status : 500).json({ success: false, message: normalizeYunwuErrorMessage(msg) });
  }
  const inner = data?.data ?? data;
  const statusRaw = inner?.task_status ?? inner?.status ?? inner?.state ?? (inner?.task_result && inner.task_result.task_status) ?? '';
  const status = normalizeYunwuTaskStatus(statusRaw);
  const pending = getPendingDeduction(taskId);
  if (status === 'failed' && pending) {
    refundBalance(pending.userId, pending.amount, '任务失败退款-' + (pending.description || ''));
    removePendingDeduction(taskId);
    const wallet = getWallet(pending.userId);
    const out = typeof data === 'object' && data !== null ? { ...data } : { data };
    out.refunded = pending.amount;
    out.balance = wallet ? wallet.balance : 0;
    return res.json(out);
  }
  if (status === 'completed' && pending) {
    removePendingDeduction(taskId);
  }
  return res.json(typeof data === 'object' && data !== null ? data : { success: true, data });
}

app.post('/api/yunwu/images/test', async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json');
    const key = getYunwuKey(req);
    if (!key) {
      return res.json({ success: false, message: '请先登录，由管理员在后台为您分配云雾 API Key' });
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);
    // 使用空prompt确保不会实际生成图片，只验证接口可用性
    const response = await fetch(YUNWU_IMAGES, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model_name: 'kling-v1', prompt: '', n: 1 }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const text = await response.text();
    let data;
    try { data = text ? JSON.parse(text) : {}; } catch (e) { data = {}; }
    const errMsg = (data?.message || data?.error?.message || data?.error || data?.detail || '').toLowerCase();
    // 如果返回200成功，说明创建了任务，这是不应该的，应该返回警告
    if (response.ok) {
      // 检查是否返回了任务ID，如果有说明实际创建了任务
      const taskId = (data && data.data && (data.data.id || data.data.task_id || data.data.request_id)) ||
        (data && data.id) || (data && data.task_id) || (data && data.request_id);
      if (taskId) {
        return res.json({ success: true, message: 'API Key 验证通过！图片生成接口可用（注意：测试时创建了任务ID: ' + taskId + '，请手动取消）' });
      }
      return res.json({ success: true, message: 'API Key 验证通过！图片生成接口可用' });
    }
    if (response.status === 400 && (/prompt|invalid|参数|格式|不能为空/i.test(errMsg) || data?.code !== undefined)) {
      return res.json({ success: true, message: 'API Key 验证通过！图片生成接口可用（测试请求参数被拒绝属正常，未生成资源）' });
    }
    if (response.status === 401 || response.status === 403) {
      return res.json({ success: false, message: 'API Key 无效或无权限，请到云雾AI 令牌管理 检查' });
    }
    return res.json({
      success: false,
      message: normalizeYunwuErrorMessage(data?.message || data?.error?.message || data?.error || data?.detail || '') || `验证未通过 (HTTP ${response.status})`,
    });
  } catch (err) {
    const msg = err.name === 'AbortError' ? '请求超时' : (err.message || String(err));
    res.json({ success: false, message: msg });
  }
});

// 文生视频测试接口
app.post('/api/yunwu/videos/text2video/test', async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json');
    const key = getYunwuKey(req);
    if (!key) {
      return res.json({ success: false, message: '请先登录，由管理员在后台为您分配云雾 API Key' });
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);
    // 使用空prompt确保不会实际生成视频，只验证接口可用性
    const response = await fetch(YUNWU_VIDEOS_TEXT2VIDEO, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model_name: 'kling-v1', prompt: '', mode: 'std', duration: '5', sound: 'off' }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const text = await response.text();
    let data;
    try { data = text ? JSON.parse(text) : {}; } catch (e) { data = {}; }
    const errMsg = (data?.message || data?.error?.message || data?.error || data?.detail || '').toLowerCase();
    // 如果返回200成功，说明创建了任务，这是不应该的，应该返回警告
    if (response.ok) {
      const taskId = (data && data.data && (data.data.id || data.data.task_id || data.data.request_id)) ||
        (data && data.id) || (data && data.task_id) || (data && data.request_id);
      if (taskId) {
        return res.json({ success: true, message: 'API Key 验证通过！文生视频接口可用（注意：测试时创建了任务ID: ' + taskId + '，请手动取消）' });
      }
      return res.json({ success: true, message: 'API Key 验证通过！文生视频接口可用' });
    }
    if (response.status === 400 && (/prompt|invalid|参数|格式|不能为空/i.test(errMsg) || data?.code !== undefined)) {
      return res.json({ success: true, message: 'API Key 验证通过！文生视频接口可用（测试请求参数被拒绝属正常，未生成资源）' });
    }
    if (response.status === 401 || response.status === 403) {
      return res.json({ success: false, message: 'API Key 无效或无权限，请到云雾AI 令牌管理 检查' });
    }
    const rawMsg = (data?.message || data?.error?.message || data?.error || data?.detail || '').toString();
    if (/invalid tokens|please wait.*seconds|request id:/i.test(rawMsg)) {
      return res.json({ success: false, message: 'API Key 无效或无权限，请到云雾AI 令牌管理 检查' });
    }
    return res.json({
      success: false,
      message: normalizeYunwuErrorMessage(rawMsg) || `验证未通过 (HTTP ${response.status})`,
    });
  } catch (err) {
    const msg = err.name === 'AbortError' ? '请求超时' : formatYunwuFetchError(err);
    res.json({ success: false, message: msg });
  }
});

// 图生视频测试接口
app.post('/api/yunwu/videos/image2video/test', async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json');
    const key = getYunwuKey(req);
    if (!key) {
      return res.json({ success: false, message: '请先登录，由管理员在后台为您分配云雾 API Key' });
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);
    // 使用无效图片URL确保不会实际生成视频，只验证接口可用性
    const response = await fetch(YUNWU_VIDEOS_IMAGE2VIDEO, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model_name: 'kling-v1', image: 'invalid-url-test', mode: 'std', duration: 5 }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const text = await response.text();
    let data;
    try { data = text ? JSON.parse(text) : {}; } catch (e) { data = {}; }
    const errMsg = (data?.message || data?.error?.message || data?.error || data?.detail || '').toLowerCase();
    // 如果返回200成功，说明创建了任务，这是不应该的，应该返回警告
    if (response.ok) {
      const taskId = (data && data.data && (data.data.id || data.data.task_id || data.data.request_id)) ||
        (data && data.id) || (data && data.task_id) || (data && data.request_id);
      if (taskId) {
        return res.json({ success: true, message: 'API Key 验证通过！图生视频接口可用（注意：测试时创建了任务ID: ' + taskId + '，请手动取消）' });
      }
      return res.json({ success: true, message: 'API Key 验证通过！图生视频接口可用' });
    }
    if (response.status === 400 && (/image|invalid|参数|格式|url|无法访问/i.test(errMsg) || data?.code !== undefined)) {
      return res.json({ success: true, message: 'API Key 验证通过！图生视频接口可用（测试请求参数被拒绝属正常，未生成资源）' });
    }
    if (response.status === 401 || response.status === 403) {
      return res.json({ success: false, message: 'API Key 无效或无权限，请到云雾AI 令牌管理 检查' });
    }
    const rawMsgImg = (data?.message || data?.error?.message || data?.error || data?.detail || '').toString();
    if (/invalid tokens|please wait.*seconds|request id:/i.test(rawMsgImg)) {
      return res.json({ success: false, message: 'API Key 无效或无权限，请到云雾AI 令牌管理 检查' });
    }
    return res.json({
      success: false,
      message: normalizeYunwuErrorMessage(rawMsgImg) || `验证未通过 (HTTP ${response.status})`,
    });
  } catch (err) {
    const msg = err.name === 'AbortError' ? '请求超时' : (err.message || String(err));
    res.json({ success: false, message: msg });
  }
});

// 人脸识别测试接口
app.post('/api/yunwu/videos/identify-face/test', async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json');
    const key = getYunwuKey(req);
    if (!key) {
      return res.json({ success: false, message: '请先登录，由管理员在后台为您分配云雾 API Key' });
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);
    const response = await fetch(YUNWU_VIDEOS_IDENTIFY_FACE, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ video_url: 'https://example.com/test.mp4' }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const text = await response.text();
    let data;
    try { data = text ? JSON.parse(text) : {}; } catch (e) { data = {}; }
    const errMsg = (data?.message || data?.error?.message || data?.error || data?.detail || '').toLowerCase();
    if (response.ok) {
      return res.json({ success: true, message: 'API Key 验证通过！人脸识别接口可用' });
    }
    if (response.status === 400 && (/video|invalid|参数|格式/i.test(errMsg) || data?.code !== undefined)) {
      return res.json({ success: true, message: 'API Key 验证通过！人脸识别接口可用（测试请求参数被拒绝属正常）' });
    }
    if (response.status === 401 || response.status === 403) {
      return res.json({ success: false, message: 'API Key 无效或无权限，请到云雾AI 令牌管理 检查' });
    }
    return res.json({
      success: false,
      message: normalizeYunwuErrorMessage(data?.message || data?.error?.message || data?.error || data?.detail || '') || `验证未通过 (HTTP ${response.status})`,
    });
  } catch (err) {
    const msg = err.name === 'AbortError' ? '请求超时' : (err.message || String(err));
    res.json({ success: false, message: msg });
  }
});

// 文生音效接口（扣款 + 失败退款）
app.post('/api/yunwu/audio/text-to-audio', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const body = Object.assign({}, req.body);
  delete body.apiKey;
  if (body.prompt == null) body.prompt = '';
  if (body.duration == null) body.duration = 5;
  return handleYunwuPostWithDeduction(req, res, YUNWU_AUDIO_TEXT_TO_AUDIO, body, 'yunwu_text2audio', 'AI工坊-文生音效');
});

app.get('/api/yunwu/audio/text-to-audio/:id', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const id = req.params.id;
  const url = `${YUNWU_AUDIO_TEXT_TO_AUDIO}/${encodeURIComponent(id)}`;
  return handleYunwuGetWithRefund(req, res, url, id);
});

// 文生音效测试接口
app.post('/api/yunwu/audio/text-to-audio/test', async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json');
    const key = getYunwuKey(req);
    if (!key) {
      return res.json({ success: false, message: '请先登录，由管理员在后台为您分配云雾 API Key' });
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);
    // 使用空prompt确保不会实际生成音频，只验证接口可用性
    const response = await fetch(YUNWU_AUDIO_TEXT_TO_AUDIO, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: '', duration: 3 }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const text = await response.text();
    let data;
    try { data = text ? JSON.parse(text) : {}; } catch (e) { data = {}; }
    const errMsg = (data?.message || data?.error?.message || data?.error || data?.detail || '').toLowerCase();
    // 如果返回200成功，说明创建了任务，这是不应该的，应该返回警告
    if (response.ok) {
      const taskId = (data && data.data && (data.data.id || data.data.task_id || data.data.request_id)) ||
        (data && data.id) || (data && data.task_id) || (data && data.request_id);
      if (taskId) {
        return res.json({ success: true, message: 'API Key 验证通过！文生音效接口可用（注意：测试时创建了任务ID: ' + taskId + '，请手动取消）' });
      }
      return res.json({ success: true, message: 'API Key 验证通过！文生音效接口可用' });
    }
    if (response.status === 400 && (/prompt|invalid|参数|格式|不能为空/i.test(errMsg) || data?.code !== undefined)) {
      return res.json({ success: true, message: 'API Key 验证通过！文生音效接口可用（测试请求参数被拒绝属正常，未生成资源）' });
    }
    if (response.status === 401 || response.status === 403) {
      return res.json({ success: false, message: 'API Key 无效或无权限，请到云雾AI 令牌管理 检查' });
    }
    return res.json({
      success: false,
      message: normalizeYunwuErrorMessage(data?.message || data?.error?.message || data?.error || data?.detail || '') || `验证未通过 (HTTP ${response.status})`,
    });
  } catch (err) {
    res.json({ success: false, message: formatYunwuFetchError(err) });
  }
});

// 语音合成（汉语演讲/朗读）接口：可灵 TTS（扣款 + 失败退款）
app.post('/api/yunwu/audio/tts', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const raw = req.body && typeof req.body === 'object' ? req.body : {};
  const text = (raw.text != null ? String(raw.text) : (raw.prompt != null ? String(raw.prompt) : '')).trim();
  if (!text) {
    return res.status(400).json({ success: false, message: '请输入要合成的文本（text 不能为空）' });
  }
  let speed = 1.0;
  if (raw.voice_speed != null) {
    speed = typeof raw.voice_speed === 'number' ? raw.voice_speed : parseFloat(String(raw.voice_speed), 10);
    if (Number.isNaN(speed) || speed < 0.5 || speed > 2) speed = 1.0;
  }
  const body = {
    text: text,
    voice_id: raw.voice_id != null && String(raw.voice_id).trim() ? String(raw.voice_id).trim() : 'genshin_vindi2',
    voice_language: raw.voice_language != null && String(raw.voice_language).trim() ? String(raw.voice_language).trim() : 'zh',
    voice_speed: speed,
  };
  return handleYunwuPostWithDeduction(req, res, YUNWU_AUDIO_TTS, body, 'yunwu_tts', 'AI工坊-TTS');
});

// 语音合成 - 默认音色（扩充列表，供云雾未开放 voices 接口时使用）
var TTS_DEFAULT_VOICES = [
  { name: '温迪（中文）', speakerId: 'genshin_vindi2', language: 'zh' },
  { name: '女声-中文', speakerId: 'zh_female_1', language: 'zh' },
  { name: '男声-中文', speakerId: 'zh_male_1', language: 'zh' },
  { name: '女声-英文', speakerId: 'en_female_1', language: 'en' },
  { name: '男声-英文', speakerId: 'en_male_1', language: 'en' },
  { name: '女声-日文', speakerId: 'ja_female_1', language: 'ja' },
  { name: '男声-日文', speakerId: 'ja_male_1', language: 'ja' },
  { name: '女声-韩文', speakerId: 'ko_female_1', language: 'ko' },
  { name: '男声-韩文', speakerId: 'ko_male_1', language: 'ko' },
  { name: '旁白-中文', speakerId: 'zh_narrator', language: 'zh' },
  { name: '活泼-中文', speakerId: 'zh_lively', language: 'zh' },
  { name: '沉稳-中文', speakerId: 'zh_calm', language: 'zh' },
];

function parseVoicesResponse(data) {
  var raw = (data && data.data && data.data.ttsList) || (data && data.ttsList) || (data && data.data && Array.isArray(data.data) ? data.data : null);
  if (Array.isArray(raw) && raw.length > 0) return raw;
  return null;
}

app.get('/api/yunwu/audio/tts/voices', async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json');
    const key = getYunwuKey(req);
    if (!key) {
      return res.json({ success: true, data: { ttsList: TTS_DEFAULT_VOICES }, _fallback: 'no_api_key' });
    }
    const headers = { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
    const base = YUNWU_AUDIO_TTS.replace(/\/+$/, '');
    var urlsToTry = [base + '/voices', base.replace(/\/tts\/?$/, '') + '/voices'];
    for (var i = 0; i < urlsToTry.length; i++) {
      var url = urlsToTry[i];
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);
        const response = await fetch(url, {
          method: 'GET',
          headers: headers,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        const responseText = await response.text();
        let data;
        try { data = responseText ? JSON.parse(responseText) : {}; } catch (e) { data = {}; }
        var list = parseVoicesResponse(data);
        if (response.ok && list && list.length > 0) {
          return res.json(typeof data === 'object' && data !== null ? data : { success: true, data: { ttsList: list } });
        }
      } catch (e) { /* try next url */ }
    }
    return res.json({ success: true, data: { ttsList: TTS_DEFAULT_VOICES }, _fallback: true });
  } catch (err) {
    return res.json({ success: true, data: { ttsList: TTS_DEFAULT_VOICES }, _fallback: true });
  }
});

app.get('/api/yunwu/audio/tts/:id', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const id = req.params.id;
  const url = `${YUNWU_AUDIO_TTS}/${encodeURIComponent(id)}`;
  return handleYunwuGetWithRefund(req, res, url, id);
});

// 视频生音效测试接口
app.post('/api/yunwu/audio/video-to-audio/test', async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json');
    const key = getYunwuKey(req);
    if (!key) {
      return res.json({ success: false, message: '请先登录，由管理员在后台为您分配云雾 API Key' });
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);
    // 使用无效视频URL确保不会实际生成音频，只验证接口可用性
    const response = await fetch(YUNWU_AUDIO_VIDEO_TO_AUDIO, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ video_url: 'invalid-url-test' }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const text = await response.text();
    let data;
    try { data = text ? JSON.parse(text) : {}; } catch (e) { data = {}; }
    const errMsg = (data?.message || data?.error?.message || data?.error || data?.detail || '').toLowerCase();
    // 如果返回200成功，说明创建了任务，这是不应该的，应该返回警告
    if (response.ok) {
      const taskId = (data && data.data && (data.data.id || data.data.task_id || data.data.request_id)) ||
        (data && data.id) || (data && data.task_id) || (data && data.request_id);
      if (taskId) {
        return res.json({ success: true, message: 'API Key 验证通过！视频生音效接口可用（注意：测试时创建了任务ID: ' + taskId + '，请手动取消）' });
      }
      return res.json({ success: true, message: 'API Key 验证通过！视频生音效接口可用' });
    }
    if (response.status === 400 && (/video|invalid|参数|格式|url|无法访问/i.test(errMsg) || data?.code !== undefined)) {
      return res.json({ success: true, message: 'API Key 验证通过！视频生音效接口可用（测试请求参数被拒绝属正常，未生成资源）' });
    }
    if (response.status === 401 || response.status === 403) {
      return res.json({ success: false, message: 'API Key 无效或无权限，请到云雾AI 令牌管理 检查' });
    }
    return res.json({
      success: false,
      message: normalizeYunwuErrorMessage(data?.message || data?.error?.message || data?.error || data?.detail || '') || `验证未通过 (HTTP ${response.status})`,
    });
  } catch (err) {
    const msg = err.name === 'AbortError' ? '请求超时' : (err.message || String(err));
    res.json({ success: false, message: msg });
  }
});

app.post('/api/yunwu/images/generations', async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json');
    const body = Object.assign({}, req.body);
    delete body.apiKey;
    if (!body.model_name) body.model_name = 'kling-v1';
    if (body.prompt == null) body.prompt = '';
    if (body.n == null) body.n = 1;
    return handleYunwuPostWithDeduction(req, res, YUNWU_IMAGES, body, 'yunwu_image', 'AI工坊-图片生成');
  } catch (err) {
    const msg = err.name === 'AbortError' ? '请求超时' : (err.message || String(err));
    res.json({ success: false, message: msg });
  }
});

app.get('/api/yunwu/images/generations/:id', async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json');
    const id = req.params.id;
    const url = `${YUNWU_IMAGES}/${encodeURIComponent(id)}`;
    return handleYunwuGetWithRefund(req, res, url, id);
  } catch (err) {
    const msg = err.name === 'AbortError' ? '请求超时' : (err.message || String(err));
    res.json({ success: false, message: msg });
  }
});

// 多图参考生图测试接口
app.post('/api/yunwu/images/multi-image2image/test', async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json');
    const key = getYunwuKey(req);
    if (!key) {
      return res.json({ success: false, message: '请先登录，由管理员在后台为您分配云雾 API Key' });
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);
    // 发送最小化测试请求，只验证接口可用性，不实际生成图片
    // 使用一个1x1像素的透明PNG图片作为测试图片
    const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const testBody = {
      model_name: 'kling-v2',
      prompt: 'test',
      subject_image_list: [testImageBase64],
      n: 1
    };
    const response = await fetch(YUNWU_IMAGES_MULTI_IMAGE2IMAGE, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(testBody),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const text = await response.text();
    let data;
    try { data = text ? JSON.parse(text) : {}; } catch (e) { data = {}; }
    const errMsg = (data?.message || data?.error?.message || data?.error || data?.detail || '').toLowerCase();
    if (response.ok) {
      return res.json({ success: true, message: 'API Key 验证通过！多图参考生图接口可用' });
    }
    if (response.status === 400 && (/image|invalid|参数|格式|subject/i.test(errMsg) || data?.code !== undefined)) {
      return res.json({ success: true, message: 'API Key 验证通过！多图参考生图接口可用（测试请求参数被拒绝属正常）' });
    }
    if (response.status === 401 || response.status === 403) {
      return res.json({ success: false, message: 'API Key 无效或无权限，请到云雾AI 令牌管理 检查' });
    }
    return res.json({
      success: false,
      message: normalizeYunwuErrorMessage(data?.message || data?.error?.message || data?.error || data?.detail || '') || `验证未通过 (HTTP ${response.status})`,
    });
  } catch (err) {
    const msg = err.name === 'AbortError' ? '请求超时' : formatYunwuFetchError(err);
    res.json({ success: false, message: msg });
  }
});

// 多图参考生图接口（可灵 multi-image2image）
app.post('/api/yunwu/images/multi-image2image', async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json');
    const body = Object.assign({}, req.body);
    delete body.apiKey;
    if (!body.model_name) body.model_name = 'kling-v2';
    if (body.prompt == null) body.prompt = '';
    if (body.n == null) body.n = 1;
    if (!Array.isArray(body.subject_image_list) || body.subject_image_list.length === 0) {
      return res.status(400).json({ success: false, message: 'subject_image_list 至少需要 1 张图片，最多 4 张' });
    }
    return handleYunwuPostWithDeduction(req, res, YUNWU_IMAGES_MULTI_IMAGE2IMAGE, body, 'yunwu_multi_image2image', 'AI工坊-多图参考生图');
  } catch (err) {
    const msg = err.name === 'AbortError' ? '请求超时' : (err.message || String(err));
    res.json({ success: false, message: msg });
  }
});

app.get('/api/yunwu/images/multi-image2image/:id', async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json');
    const id = req.params.id;
    const url = `${YUNWU_IMAGES_MULTI_IMAGE2IMAGE}/${encodeURIComponent(id)}`;
    return handleYunwuGetWithRefund(req, res, url, id);
  } catch (err) {
    const msg = err.name === 'AbortError' ? '请求超时' : (err.message || String(err));
    res.json({ success: false, message: msg });
  }
});

// 图生视频接口（扣款 + 失败退款）
app.post('/api/yunwu/videos/image2video', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const body = Object.assign({}, req.body);
  delete body.apiKey;
  return handleYunwuPostWithDeduction(req, res, YUNWU_VIDEOS_IMAGE2VIDEO, body, 'yunwu_image2video', 'AI工坊-图生视频');
});

app.get('/api/yunwu/videos/image2video/:id', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const id = req.params.id;
  const url = `${YUNWU_VIDEOS_IMAGE2VIDEO}/${encodeURIComponent(id)}`;
  return handleYunwuGetWithRefund(req, res, url, id);
});

// 文生视频接口（扣款 + 失败退款）
app.post('/api/yunwu/videos/text2video', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const body = Object.assign({}, req.body);
  delete body.apiKey;
  return handleYunwuPostWithDeduction(req, res, YUNWU_VIDEOS_TEXT2VIDEO, body, 'yunwu_text2video', 'AI工坊-文生视频');
});

app.get('/api/yunwu/videos/text2video/:id', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const id = req.params.id;
  const url = `${YUNWU_VIDEOS_TEXT2VIDEO}/${encodeURIComponent(id)}`;
  return handleYunwuGetWithRefund(req, res, url, id);
});

// 人脸识别接口
app.post('/api/yunwu/videos/identify-face', async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json');
    const key = getYunwuKey(req);
    if (!key) {
      return res.json({ success: false, message: '请先登录，由管理员在后台为您分配云雾 API Key' });
    }
    const body = Object.assign({}, req.body);
    delete body.apiKey;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);
    const response = await fetch(YUNWU_VIDEOS_IDENTIFY_FACE, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const text = await response.text();
    let data;
    try { data = text ? JSON.parse(text) : {}; } catch (e) { data = {}; }
    if (!response.ok) {
      let msg = data?.message || data?.error?.message || data?.error || data?.detail || text || `请求失败 ${response.status}`;
      if (response.status === 400 && /not found by id|video not found|From video not found/i.test(String(msg))) {
        msg = '人脸识别未找到该视频。请使用「视频资源 ID」或视频 URL，不要使用任务 ID（task_id）；若来自可灵任务，请使用任务完成后返回的「视频链接」。';
      }
      return res.status(response.status >= 400 ? response.status : 500).json({ success: false, message: normalizeYunwuErrorMessage(msg), data });
    }
    res.json(typeof data === 'object' && data !== null ? data : { success: true, data });
  } catch (err) {
    const msg = err.name === 'AbortError' ? '请求超时' : (err.message || String(err));
    res.json({ success: false, message: msg });
  }
});

// 查询人脸识别任务状态（失败时若有 pending 则退款）
app.get('/api/yunwu/videos/identify-face/:id', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const id = req.params.id;
  const url = `${YUNWU_VIDEOS_IDENTIFY_FACE}/${encodeURIComponent(id)}`;
  return handleYunwuGetWithRefund(req, res, url, id);
});

// 将 data:xxx;base64,YYYY 转为纯 base64 YYYY（云雾对口型等接口要求纯 base64）
function toPureBase64(value) {
  if (value == null || typeof value !== 'string') return value;
  const s = value.trim();
  if (/^data:[^;]+;base64,/.test(s)) return s.replace(/^data:[^;]+;base64,/, '');
  return s;
}

// 对口型接口（扣款 + 失败退款）
app.post('/api/yunwu/videos/advanced-lip-sync', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const body = Object.assign({}, req.body);
  delete body.apiKey;
  if (body.face_choose && Array.isArray(body.face_choose)) {
    body.face_choose = body.face_choose.map((face) => {
      const f = Object.assign({}, face);
      if (f.sound_file != null) f.sound_file = toPureBase64(f.sound_file);
      if (f.video_url != null) f.video_url = toPureBase64(f.video_url);
      return f;
    });
  }
  return handleYunwuPostWithDeduction(req, res, YUNWU_VIDEOS_LIPSYNC, body, 'yunwu_lipsync', 'AI工坊-对口型');
});

// 多图参考生视频接口（扣款 + 失败退款）
app.post('/api/yunwu/videos/multi-image2video', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const body = Object.assign({}, req.body);
  delete body.apiKey;
  return handleYunwuPostWithDeduction(req, res, YUNWU_VIDEOS_MULTI_IMAGE2VIDEO, body, 'yunwu_multi_image2video', 'AI工坊-多图生视频');
});

app.get('/api/yunwu/videos/multi-image2video/:id', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const id = req.params.id;
  const url = `${YUNWU_VIDEOS_MULTI_IMAGE2VIDEO}/${encodeURIComponent(id)}`;
  return handleYunwuGetWithRefund(req, res, url, id);
});

app.get('/api/yunwu/videos/advanced-lip-sync/:id', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const id = req.params.id;
  const url = `${YUNWU_VIDEOS_LIPSYNC}/${encodeURIComponent(id)}`;
  return handleYunwuGetWithRefund(req, res, url, id);
});

// 视频生音效接口（配音）（扣款 + 失败退款）
app.post('/api/yunwu/audio/video-to-audio', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const body = Object.assign({}, req.body);
  delete body.apiKey;
  return handleYunwuPostWithDeduction(req, res, YUNWU_AUDIO_VIDEO_TO_AUDIO, body, 'yunwu_video2audio', 'AI工坊-视频生音效');
});

app.get('/api/yunwu/audio/video-to-audio/:id', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const id = req.params.id;
  const url = `${YUNWU_AUDIO_VIDEO_TO_AUDIO}/${encodeURIComponent(id)}`;
  return handleYunwuGetWithRefund(req, res, url, id);
});

// 分组路由（/api 下未在上述具体路径命中时，才进入各 router）
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
