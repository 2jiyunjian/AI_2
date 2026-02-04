/**
 * 数字人 - 上传模块：临时资源上传、视频上传、代理
 */
const express = require('express');
const multer = require('multer');
const { tempAssetStore, sweepTempAssets } = require('./utils');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }
});

router.post('/upload-temp-asset', upload.single('file'), async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json');
    if (req.file || (req.files && req.files.length > 0)) {
      const file = req.file || req.files[0];
      const fileType = file.mimetype || '';
      let type = 'image';
      if (fileType.startsWith('image/')) type = 'image';
      else if (fileType.startsWith('audio/')) type = 'audio';
      else if (fileType.startsWith('video/')) type = 'video';
      else {
        return res.json({ success: false, message: '不支持的文件类型，请上传图片、音频或视频文件' });
      }
      const maxSize = type === 'image' ? 10 * 1024 * 1024 : type === 'audio' ? 5 * 1024 * 1024 : 100 * 1024 * 1024;
      if (file.size > maxSize) {
        const maxSizeStr = type === 'image' ? '≤10MB' : type === 'audio' ? '≤5MB' : '≤100MB';
        return res.json({ success: false, message: `文件过大，请上传 ${maxSizeStr} 的文件` });
      }
      const buffer = file.buffer || Buffer.from(file.data);
      const token = `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
      sweepTempAssets();
      tempAssetStore.set(token, { type, buffer, createdAt: Date.now() });
      const baseUrl = (process.env.DEPLOY_URL || process.env.CALLBACK_URL || '').trim();
      const host = baseUrl ? new URL(baseUrl).origin : `${req.protocol || 'http'}://${req.get('host') || req.hostname || 'localhost'}`;
      const url = `${host}/api/temp-asset/${token}`;
      return res.json({ success: true, url, token, type });
    }
    const { type, content } = req.body || {};
    if (content && typeof content === 'string') {
      return res.json({ success: false, message: '不再支持Base64上传。请使用FormData上传文件。' });
    }
    return res.json({ success: false, message: '请使用FormData上传文件，或直接提供URL/ID' });
  } catch (err) {
    console.error('upload-temp-asset error:', err);
    return res.json({ success: false, message: err.message || '上传失败' });
  }
});

router.post('/upload-video', async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json');
    const { videoId, videoUrl, videoFile } = req.body || {};
    if (videoId && String(videoId).trim()) {
      return res.json({ success: true, videoId: String(videoId).trim(), type: 'id' });
    }
    if (videoUrl && String(videoUrl).trim()) {
      const url = String(videoUrl).trim();
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return res.json({ success: false, message: '视频URL必须以 http:// 或 https:// 开头' });
      }
      try { new URL(url); } catch (e) {
        return res.json({ success: false, message: '视频URL格式无效: ' + e.message });
      }
      return res.json({ success: true, videoUrl: url, type: 'url' });
    }
    if (videoFile && typeof videoFile === 'string') {
      let raw = String(videoFile).trim();
      if (raw.startsWith('data:')) {
        const i = raw.indexOf(',');
        raw = i >= 0 ? raw.slice(i + 1) : '';
      }
      raw = raw.replace(/[\s\n\r]/g, '');
      if (!/^[A-Za-z0-9+/=]+$/.test(raw)) {
        return res.json({ success: false, message: '视频文件须为有效 Base64' });
      }
      const maxLen = 100 * 1024 * 1024;
      if (raw.length > maxLen) {
        return res.json({ success: false, message: '视频文件过大，请 ≤100MB' });
      }
      const buffer = Buffer.from(raw, 'base64');
      const token = `v${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
      sweepTempAssets();
      tempAssetStore.set(token, { type: 'video', buffer, createdAt: Date.now() });
      const baseUrl = (process.env.DEPLOY_URL || process.env.CALLBACK_URL || '').trim();
      const host = baseUrl ? new URL(baseUrl).origin : `${req.protocol || 'http'}://${req.get('host') || req.hostname || 'localhost'}`;
      const url = `${host}/api/temp-asset/${token}`;
      return res.json({ success: true, videoUrl: url, token, type: 'url' });
    }
    return res.json({ success: false, message: '请提供 videoId、videoUrl 或 videoFile（Base64）之一' });
  } catch (err) {
    console.error('upload-video error:', err);
    return res.json({ success: false, message: err.message || '上传失败' });
  }
});

router.get('/temp-asset/:token', (req, res) => {
  const token = req.params.token;
  if (!token) return res.status(404).send('Not Found');
  const entry = tempAssetStore.get(token);
  if (!entry || !entry.buffer) return res.status(404).send('Not Found');
  let ct;
  if (entry.type === 'audio') ct = 'audio/mpeg';
  else if (entry.type === 'video') ct = 'video/mp4';
  else ct = 'image/jpeg';
  res.setHeader('Content-Type', ct);
  res.setHeader('Cache-Control', 'public, max-age=1800');
  res.send(entry.buffer);
});

router.get('/proxy-media', async (req, res) => {
  try {
    const rawUrl = req.query.url;
    if (!rawUrl || typeof rawUrl !== 'string') return res.status(400).send('缺少 url 参数');
    const url = rawUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) return res.status(400).send('只允许 http/https 地址');
    try { new URL(url); } catch (e) { return res.status(400).send('URL 格式无效'); }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);
    const resp = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: { 'User-Agent': 'AI-DigitalHuman-Platform/1.0' },
    });
    clearTimeout(timeoutId);
    if (!resp.ok) return res.status(resp.status).send('上游请求失败');
    const contentType = resp.headers.get('content-type') || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    const buf = await resp.arrayBuffer();
    res.send(Buffer.from(buf));
  } catch (err) {
    if (err.name === 'AbortError') return res.status(504).send('请求超时');
    console.error('proxy-media error:', err.message);
    res.status(500).send(err.message || '代理失败');
  }
});

module.exports = router;
