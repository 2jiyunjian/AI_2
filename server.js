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

// 创作工坊·云雾API接口（必须写在 app.use('/api', ...) 之前，否则会被 auth 等 router 先命中并 404）
const YUNWU_IMAGES = 'https://yunwu.ai/kling/v1/images/generations';
const YUNWU_VIDEOS_IMAGE2VIDEO = 'https://yunwu.ai/kling/v1/videos/image2video';
const YUNWU_VIDEOS_IDENTIFY_FACE = 'https://yunwu.ai/kling/v1/videos/identify-face';
const YUNWU_VIDEOS_LIPSYNC = 'https://yunwu.ai/kling/v1/videos/advanced-lip-sync';
const YUNWU_AUDIO_VIDEO_TO_AUDIO = 'https://yunwu.ai/kling/v1/audio/video-to-audio';

app.post('/api/yunwu/images/test', async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json');
    const apiKey = (req.body && req.body.apiKey) || req.headers['x-api-key'] || (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '');
    if (!apiKey || !String(apiKey).trim()) {
      return res.json({ success: false, message: '请提供云雾 API Key' });
    }
    const key = String(apiKey).trim();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);
    const response = await fetch(YUNWU_IMAGES, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model_name: 'kling-v1', prompt: 'test', n: 1 }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const text = await response.text();
    let data;
    try { data = text ? JSON.parse(text) : {}; } catch (e) { data = {}; }
    const errMsg = (data?.message || data?.error?.message || data?.error || data?.detail || '').toLowerCase();
    if (response.ok) {
      return res.json({ success: true, message: 'API Key 验证通过！文生图接口可用' });
    }
    if (response.status === 400 && (/prompt|invalid|参数|格式/i.test(errMsg) || data?.code !== undefined)) {
      return res.json({ success: true, message: 'API Key 验证通过！文生图接口可用（测试请求参数被拒绝属正常）' });
    }
    if (response.status === 401 || response.status === 403) {
      return res.json({ success: false, message: 'API Key 无效或无权限，请到云雾AI 令牌管理 检查' });
    }
    return res.json({
      success: false,
      message: data?.message || data?.error?.message || data?.error || data?.detail || `验证未通过 (HTTP ${response.status})`,
    });
  } catch (err) {
    const msg = err.name === 'AbortError' ? '请求超时' : (err.message || String(err));
    res.json({ success: false, message: msg });
  }
});

// 图生视频测试接口
app.post('/api/yunwu/videos/image2video/test', async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json');
    const apiKey = (req.body && req.body.apiKey) || req.headers['x-api-key'] || (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '');
    if (!apiKey || !String(apiKey).trim()) {
      return res.json({ success: false, message: '请提供云雾 API Key' });
    }
    const key = String(apiKey).trim();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);
    const response = await fetch(YUNWU_VIDEOS_IMAGE2VIDEO, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model_name: 'kling-v1', image: 'https://example.com/test.jpg', mode: 'std', duration: 5 }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const text = await response.text();
    let data;
    try { data = text ? JSON.parse(text) : {}; } catch (e) { data = {}; }
    const errMsg = (data?.message || data?.error?.message || data?.error || data?.detail || '').toLowerCase();
    if (response.ok) {
      return res.json({ success: true, message: 'API Key 验证通过！图生视频接口可用' });
    }
    if (response.status === 400 && (/image|invalid|参数|格式/i.test(errMsg) || data?.code !== undefined)) {
      return res.json({ success: true, message: 'API Key 验证通过！图生视频接口可用（测试请求参数被拒绝属正常）' });
    }
    if (response.status === 401 || response.status === 403) {
      return res.json({ success: false, message: 'API Key 无效或无权限，请到云雾AI 令牌管理 检查' });
    }
    return res.json({
      success: false,
      message: data?.message || data?.error?.message || data?.error || data?.detail || `验证未通过 (HTTP ${response.status})`,
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
    const apiKey = (req.body && req.body.apiKey) || req.headers['x-api-key'] || (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '');
    if (!apiKey || !String(apiKey).trim()) {
      return res.json({ success: false, message: '请提供云雾 API Key' });
    }
    const key = String(apiKey).trim();
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
      message: data?.message || data?.error?.message || data?.error || data?.detail || `验证未通过 (HTTP ${response.status})`,
    });
  } catch (err) {
    const msg = err.name === 'AbortError' ? '请求超时' : (err.message || String(err));
    res.json({ success: false, message: msg });
  }
});

// 视频生音效测试接口
app.post('/api/yunwu/audio/video-to-audio/test', async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json');
    const apiKey = (req.body && req.body.apiKey) || req.headers['x-api-key'] || (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '');
    if (!apiKey || !String(apiKey).trim()) {
      return res.json({ success: false, message: '请提供云雾 API Key' });
    }
    const key = String(apiKey).trim();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);
    const response = await fetch(YUNWU_AUDIO_VIDEO_TO_AUDIO, {
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
      return res.json({ success: true, message: 'API Key 验证通过！视频生音效接口可用' });
    }
    if (response.status === 400 && (/video|invalid|参数|格式/i.test(errMsg) || data?.code !== undefined)) {
      return res.json({ success: true, message: 'API Key 验证通过！视频生音效接口可用（测试请求参数被拒绝属正常）' });
    }
    if (response.status === 401 || response.status === 403) {
      return res.json({ success: false, message: 'API Key 无效或无权限，请到云雾AI 令牌管理 检查' });
    }
    return res.json({
      success: false,
      message: data?.message || data?.error?.message || data?.error || data?.detail || `验证未通过 (HTTP ${response.status})`,
    });
  } catch (err) {
    const msg = err.name === 'AbortError' ? '请求超时' : (err.message || String(err));
    res.json({ success: false, message: msg });
  }
});

app.post('/api/yunwu/images/generations', async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json');
    const apiKey = (req.body && req.body.apiKey) || req.headers['x-api-key'] || (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '');
    if (!apiKey || !String(apiKey).trim()) {
      return res.json({ success: false, message: '请提供云雾 API Key' });
    }
    const key = String(apiKey).trim();
    const body = Object.assign({}, req.body);
    delete body.apiKey;
    if (!body.model_name) body.model_name = 'kling-v1';
    if (body.prompt == null) body.prompt = '';
    if (body.n == null) body.n = 1;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);
    const response = await fetch(YUNWU_IMAGES, {
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
      const msg = data?.message || data?.error?.message || data?.error || data?.detail || text || `请求失败 ${response.status}`;
      return res.status(response.status >= 400 ? response.status : 500).json({ success: false, message: msg, data });
    }
    res.json(typeof data === 'object' && data !== null ? data : { success: true, data });
  } catch (err) {
    const msg = err.name === 'AbortError' ? '请求超时' : (err.message || String(err));
    res.json({ success: false, message: msg });
  }
});

app.get('/api/yunwu/images/generations/:id', async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json');
    const id = req.params.id;
    const apiKey = req.headers['x-api-key'] || req.query.apiKey || (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '');
    if (!apiKey || !String(apiKey).trim()) {
      return res.json({ success: false, message: '请提供云雾 API Key' });
    }
    const url = `${YUNWU_IMAGES}/${encodeURIComponent(id)}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    const response = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${String(apiKey).trim()}`, 'Content-Type': 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const text = await response.text();
    let data;
    try { data = text ? JSON.parse(text) : {}; } catch (e) { data = {}; }
    if (!response.ok) {
      const msg = data?.message || data?.error?.message || data?.error || data?.detail || text || `请求失败 ${response.status}`;
      return res.status(response.status >= 400 ? response.status : 500).json({ success: false, message: msg });
    }
    res.json(typeof data === 'object' && data !== null ? data : { success: true, data });
  } catch (err) {
    const msg = err.name === 'AbortError' ? '请求超时' : (err.message || String(err));
    res.json({ success: false, message: msg });
  }
});

// 图生视频接口
app.post('/api/yunwu/videos/image2video', async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json');
    const apiKey = (req.body && req.body.apiKey) || req.headers['x-api-key'] || (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '');
    if (!apiKey || !String(apiKey).trim()) {
      return res.json({ success: false, message: '请提供云雾 API Key' });
    }
    const key = String(apiKey).trim();
    const body = Object.assign({}, req.body);
    delete body.apiKey;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);
    const response = await fetch(YUNWU_VIDEOS_IMAGE2VIDEO, {
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
      const msg = data?.message || data?.error?.message || data?.error || data?.detail || text || `请求失败 ${response.status}`;
      return res.status(response.status >= 400 ? response.status : 500).json({ success: false, message: msg, data });
    }
    res.json(typeof data === 'object' && data !== null ? data : { success: true, data });
  } catch (err) {
    const msg = err.name === 'AbortError' ? '请求超时' : (err.message || String(err));
    res.json({ success: false, message: msg });
  }
});

app.get('/api/yunwu/videos/image2video/:id', async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json');
    const id = req.params.id;
    const apiKey = req.headers['x-api-key'] || req.query.apiKey || (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '');
    if (!apiKey || !String(apiKey).trim()) {
      return res.json({ success: false, message: '请提供云雾 API Key' });
    }
    const url = `${YUNWU_VIDEOS_IMAGE2VIDEO}/${encodeURIComponent(id)}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    const response = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${String(apiKey).trim()}`, 'Content-Type': 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const text = await response.text();
    let data;
    try { data = text ? JSON.parse(text) : {}; } catch (e) { data = {}; }
    if (!response.ok) {
      const msg = data?.message || data?.error?.message || data?.error || data?.detail || text || `请求失败 ${response.status}`;
      return res.status(response.status >= 400 ? response.status : 500).json({ success: false, message: msg });
    }
    res.json(typeof data === 'object' && data !== null ? data : { success: true, data });
  } catch (err) {
    const msg = err.name === 'AbortError' ? '请求超时' : (err.message || String(err));
    res.json({ success: false, message: msg });
  }
});

// 人脸识别接口
app.post('/api/yunwu/videos/identify-face', async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json');
    const apiKey = (req.body && req.body.apiKey) || req.headers['x-api-key'] || (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '');
    if (!apiKey || !String(apiKey).trim()) {
      return res.json({ success: false, message: '请提供云雾 API Key' });
    }
    const key = String(apiKey).trim();
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
      const msg = data?.message || data?.error?.message || data?.error || data?.detail || text || `请求失败 ${response.status}`;
      return res.status(response.status >= 400 ? response.status : 500).json({ success: false, message: msg, data });
    }
    res.json(typeof data === 'object' && data !== null ? data : { success: true, data });
  } catch (err) {
    const msg = err.name === 'AbortError' ? '请求超时' : (err.message || String(err));
    res.json({ success: false, message: msg });
  }
});

// 对口型接口
app.post('/api/yunwu/videos/advanced-lip-sync', async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json');
    const apiKey = (req.body && req.body.apiKey) || req.headers['x-api-key'] || (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '');
    if (!apiKey || !String(apiKey).trim()) {
      return res.json({ success: false, message: '请提供云雾 API Key' });
    }
    const key = String(apiKey).trim();
    const body = Object.assign({}, req.body);
    delete body.apiKey;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);
    const response = await fetch(YUNWU_VIDEOS_LIPSYNC, {
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
      const msg = data?.message || data?.error?.message || data?.error || data?.detail || text || `请求失败 ${response.status}`;
      return res.status(response.status >= 400 ? response.status : 500).json({ success: false, message: msg, data });
    }
    res.json(typeof data === 'object' && data !== null ? data : { success: true, data });
  } catch (err) {
    const msg = err.name === 'AbortError' ? '请求超时' : (err.message || String(err));
    res.json({ success: false, message: msg });
  }
});

app.get('/api/yunwu/videos/advanced-lip-sync/:id', async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json');
    const id = req.params.id;
    const apiKey = req.headers['x-api-key'] || req.query.apiKey || (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '');
    if (!apiKey || !String(apiKey).trim()) {
      return res.json({ success: false, message: '请提供云雾 API Key' });
    }
    const url = `${YUNWU_VIDEOS_LIPSYNC}/${encodeURIComponent(id)}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    const response = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${String(apiKey).trim()}`, 'Content-Type': 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const text = await response.text();
    let data;
    try { data = text ? JSON.parse(text) : {}; } catch (e) { data = {}; }
    if (!response.ok) {
      const msg = data?.message || data?.error?.message || data?.error || data?.detail || text || `请求失败 ${response.status}`;
      return res.status(response.status >= 400 ? response.status : 500).json({ success: false, message: msg });
    }
    res.json(typeof data === 'object' && data !== null ? data : { success: true, data });
  } catch (err) {
    const msg = err.name === 'AbortError' ? '请求超时' : (err.message || String(err));
    res.json({ success: false, message: msg });
  }
});

// 视频生音效接口（配音）
app.post('/api/yunwu/audio/video-to-audio', async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json');
    const apiKey = (req.body && req.body.apiKey) || req.headers['x-api-key'] || (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '');
    if (!apiKey || !String(apiKey).trim()) {
      return res.json({ success: false, message: '请提供云雾 API Key' });
    }
    const key = String(apiKey).trim();
    const body = Object.assign({}, req.body);
    delete body.apiKey;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);
    const response = await fetch(YUNWU_AUDIO_VIDEO_TO_AUDIO, {
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
      const msg = data?.message || data?.error?.message || data?.error || data?.detail || text || `请求失败 ${response.status}`;
      return res.status(response.status >= 400 ? response.status : 500).json({ success: false, message: msg, data });
    }
    res.json(typeof data === 'object' && data !== null ? data : { success: true, data });
  } catch (err) {
    const msg = err.name === 'AbortError' ? '请求超时' : (err.message || String(err));
    res.json({ success: false, message: msg });
  }
});

app.get('/api/yunwu/audio/video-to-audio/:id', async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json');
    const id = req.params.id;
    const apiKey = req.headers['x-api-key'] || req.query.apiKey || (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '');
    if (!apiKey || !String(apiKey).trim()) {
      return res.json({ success: false, message: '请提供云雾 API Key' });
    }
    const url = `${YUNWU_AUDIO_VIDEO_TO_AUDIO}/${encodeURIComponent(id)}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    const response = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${String(apiKey).trim()}`, 'Content-Type': 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const text = await response.text();
    let data;
    try { data = text ? JSON.parse(text) : {}; } catch (e) { data = {}; }
    if (!response.ok) {
      const msg = data?.message || data?.error?.message || data?.error || data?.detail || text || `请求失败 ${response.status}`;
      return res.status(response.status >= 400 ? response.status : 500).json({ success: false, message: msg });
    }
    res.json(typeof data === 'object' && data !== null ? data : { success: true, data });
  } catch (err) {
    const msg = err.name === 'AbortError' ? '请求超时' : (err.message || String(err));
    res.json({ success: false, message: msg });
  }
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
