/**
 * 数字人 - 诵读文案模块：云雾诵读视频
 * API Key 由管理员在后台分配；扣款金额由服务端配置或 API 返回
 */
const express = require('express');
const { getApiKey, getWallet, deductBalance, getWalletPricing, getDeductAmount, getWalletRecords } = require('../../db');
const { requireAuth } = require('../auth');
const { parseResponse } = require('./utils');

const router = express.Router();
const OPERATION_KEY = 'yunwu_recite';

function resolveYunwuKey(req, res, next) {
  requireAuth(req, res, () => {
    const userId = req.user && req.user.id;
    const key = getApiKey(userId, 'yunwu') || getApiKey(0, 'yunwu');
    if (!key || !String(key).trim()) {
      return res.status(200).json({ success: false, message: '请先登录，由管理员在后台为您分配云雾 API Key' });
    }
    req.yunwuApiKey = String(key).trim();
    next();
  });
}

// 云雾 API：诵读/卖货二次创作（保留向后兼容）
router.post('/yunwu/recite-video', resolveYunwuKey, async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json');
    const apiKey = req.yunwuApiKey;
    const { imageUrl, audioFile } = req.body || {};
    if (!imageUrl || !String(imageUrl).trim()) {
      return res.json({ success: false, message: '请提供数字人参考图（imageUrl，Base64 或可公网访问的 URL）' });
    }
    if (!audioFile || !String(audioFile).trim()) {
      return res.json({ success: false, message: '请提供诵读/推广音频（audioFile，Base64 或可公网访问的 URL）' });
    }

    let finalImage = String(imageUrl).trim();
    if (finalImage.startsWith('data:')) {
      const i = finalImage.indexOf(',');
      finalImage = i >= 0 ? finalImage.slice(i + 1) : finalImage;
    }
    finalImage = finalImage.replace(/[\s\n\r]/g, '');
    if (!/^[A-Za-z0-9+/=]+$/.test(finalImage) && !finalImage.startsWith('http')) {
      return res.json({ success: false, message: '图片格式无效' });
    }

    let raw = String(audioFile).trim();
    if (raw.startsWith('data:')) {
      const i = raw.indexOf(',');
      raw = i >= 0 ? raw.slice(i + 1) : raw;
    }
    raw = raw.replace(/[\s\n\r]/g, '');
    if (!/^[A-Za-z0-9+/=]+$/.test(raw) && !raw.startsWith('http')) {
      return res.json({ success: false, message: '音频格式无效，请提供 .mp3/.wav/.m4a/.aac 的 Base64 或可公网访问的 URL' });
    }
    if (raw.length > 7 * 1024 * 1024) {
      return res.json({ success: false, message: '音频文件过大，请 ≤5MB' });
    }

    const userId = req.user && req.user.id;
    const pricing = getWalletPricing();
    const requiredAmount = pricing[OPERATION_KEY] ?? 1;
    const wallet = getWallet(userId);
    if (!wallet || wallet.balance < requiredAmount) {
      return res.json({ success: false, message: '余额不足，请先充值后再使用诵读功能' });
    }

    const requestBody = {
      image: finalImage,
      audio_id: '',
      sound_file: raw,
      prompt: '',
      mode: 'std',
      callback_url: '',
      external_task_id: `recite_${Date.now()}`,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);
    let response;
    try {
      response = await fetch('https://yunwu.ai/kling/v1/videos/avatar/image2video', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey.trim()}`,
          'Content-Type': 'application/json',
          'User-Agent': 'AI-DigitalHuman-Platform/1.0',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    const parsed = await parseResponse(response, '云雾诵读视频接口');
    if (parsed.error) {
      return res.json({ success: false, message: parsed.message });
    }
    const data = parsed.data;

    if (!response.ok) {
      const msg = data?.message || data?.error || data?.msg || `请求失败 (${response.status})`;
      return res.json({ success: false, message: msg });
    }

    const inner = data?.data;
    const inner2 = (inner && typeof inner === 'object') ? inner.data : null;
    const fromInner = (o) => (o && typeof o === 'object') ? (o.task_id ?? o.id ?? null) : null;
    const queryId = fromInner(inner2) ?? fromInner(inner) ?? data?.task_id ?? data?.id ?? null;
    let taskId = queryId ?? data?.request_id ?? data?.external_task_id ?? null;
    if (taskId != null) taskId = String(taskId);

    if (!taskId) {
      return res.json({
        success: false,
        message: '云雾未返回任务ID。若云雾控制台已显示创建成功，请用控制台中的任务ID在「作品管理」中刷新该任务。',
        debug: data ? { keys: Object.keys(data), sample: JSON.stringify(data).substring(0, 300) } : null,
      });
    }

    // ✅ 只有在API调用成功且返回有效任务ID时才扣款
    const deductAmount = getDeductAmount(OPERATION_KEY, data);
    console.log('=== 开始扣款流程（诵读文案）===');
    console.log('扣款参数: userId=%s amount=%s description=%s', userId, deductAmount, '云雾诵读文案');
    
    const newBalance = deductBalance(userId, deductAmount, '云雾诵读文案');
    if (newBalance == null) {
      console.warn('诵读扣款失败（余额可能已被其他请求扣除）:', userId);
    } else {
      // 验证记录是否写入
      const records = getWalletRecords(userId, 1);
      console.log('扣款后查询记录数量:', records.length, '最近一条:', records[0] ? JSON.stringify(records[0]) : '无');
    }
    
    // 获取最新钱包信息和记录
    const updatedWallet = getWallet(userId);
    const records = getWalletRecords(userId, 10);

    res.json({
      success: true,
      taskId,
      id: taskId,
      status: data?.status || 'processing',
      data,
      deducted: deductAmount,
      balance: newBalance != null ? newBalance : (updatedWallet ? updatedWallet.balance : wallet.balance),
      consumed: updatedWallet ? updatedWallet.consumed : wallet.consumed,
      records: records.slice(0, 5),
    });
  } catch (err) {
    console.error('云雾诵读视频错误:', err);
    // ✅ 失败时不扣款，返回当前钱包信息
    const currentWallet = getWallet(userId);
    const records = getWalletRecords(userId, 10);
    res.json({ 
      success: false, 
      message: err.message || '云雾诵读视频创建失败',
      balance: currentWallet ? currentWallet.balance : 0,
      consumed: currentWallet ? currentWallet.consumed : 0,
      records: records.slice(0, 5),
    });
  }
});

module.exports = router;
