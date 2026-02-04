/**
 * 数字人 - 卖货推送模块：统一内容视频（诵读/卖货）
 * API Key 由管理员分配；扣款金额由服务端配置或 API 返回
 */
const express = require('express');
const { getApiKey, getWallet, deductBalance, getWalletPricing, getDeductAmount, getWalletRecords } = require('../../db');
const { requireAuth } = require('../auth');
const {
  parseResponse,
  validateImageUrl,
  extractErrorMessage,
  analyzeYunwuApiError,
} = require('./utils');

const router = express.Router();
// 诵读文案用 yunwu_recite，卖货推送用 yunwu_promote，便于管理端分别配置单价
function getOperationKey(type) {
  return type === 'promote' ? 'yunwu_promote' : 'yunwu_recite';
}
function getDeductDescription(type) {
  return type === 'promote' ? '云雾卖货推送' : '云雾诵读文案';
}

function resolveDigitalHumanKeys(req, res, next) {
  requireAuth(req, res, () => {
    const userId = req.user && req.user.id;
    req.heygenApiKey = String((getApiKey(userId, 'heygen') || getApiKey(0, 'heygen')) || '').trim();
    req.yunwuApiKey = String((getApiKey(userId, 'yunwu') || getApiKey(0, 'yunwu')) || '').trim();
    next();
  });
}

// 统一内容视频创建（type: recite | promote）
router.post('/digital-human/content-video', resolveDigitalHumanKeys, async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json');
    const {
      provider,
      type,
      imageUrl,
      audioFile,
      avatarId,
      text,
      voiceId,
      productImage,
      prompt,
      mode = 'std',
    } = req.body || {};

    const apiKey = provider === 'heygen' ? req.heygenApiKey : req.yunwuApiKey;

    if (!provider || !['yunwu', 'heygen'].includes(provider)) {
      return res.status(400).json({
        success: false,
        message: '请提供有效的 provider 参数（yunwu 或 heygen）',
      });
    }
    if (!type || !['recite', 'promote'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: '请提供有效的 type 参数（recite 或 promote）',
      });
    }
    if (!apiKey) {
      return res.status(400).json({
        success: false,
        message: provider === 'yunwu' ? '请先登录，由管理员在后台为您分配云雾 API Key' : '请先登录，由管理员在后台为您分配 HeyGen API Key',
      });
    }

    if (provider === 'yunwu') {
      if (!imageUrl || !String(imageUrl).trim()) {
        return res.status(400).json({
          success: false,
          message: '请提供数字人参考图（imageUrl）',
        });
      }
      if (!audioFile || !String(audioFile).trim()) {
        return res.status(400).json({
          success: false,
          message: '云雾数字人必须提供音频文件（audioFile）',
        });
      }
      let finalImage = String(imageUrl).trim();
      if (!finalImage.startsWith('http://') && !finalImage.startsWith('https://')) {
        return res.status(400).json({
          success: false,
          message: '不再支持Base64格式。请使用FormData上传文件获取URL，或直接提供图片URL。',
        });
      }
      let finalAudioFile = String(audioFile).trim();
      if (!finalAudioFile.startsWith('http://') && !finalAudioFile.startsWith('https://')) {
        return res.status(400).json({
          success: false,
          message: '不再支持Base64格式。请使用FormData上传文件获取URL，或直接提供音频URL。',
        });
      }
      const userId = req.user && req.user.id;
      const operationKey = getOperationKey(type);
      const pricing = getWalletPricing();
      const requiredAmount = pricing[operationKey] ?? 1;
      const wallet = getWallet(userId);
      if (!wallet || wallet.balance < requiredAmount) {
        return res.status(200).json({
          success: false,
          message: '余额不足，请先充值后再使用' + (type === 'promote' ? '卖货推送' : '诵读文案') + '功能',
        });
      }
      const requestBody = {
        image: finalImage,
        audio_id: '',
        sound_file: finalAudioFile,
        prompt: prompt || text || '',
        mode: mode || 'std',
        callback_url: process.env.CALLBACK_URL || process.env.DEPLOY_URL || '',
        external_task_id: `${type}_${Date.now()}`,
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
      const parsed = await parseResponse(response, '云雾内容视频接口');
      if (parsed.error) {
        return res.json({ success: false, message: parsed.message });
      }
      const data = parsed.data;
      if (!response.ok) {
        // ✅ 失败时不扣款，返回当前钱包信息
        const currentWallet = getWallet(userId);
        const records = getWalletRecords(userId, 10);
        const walletInfo = {
          balance: currentWallet ? currentWallet.balance : 0,
          consumed: currentWallet ? currentWallet.consumed : 0,
          records: records.slice(0, 5),
        };
        
        const analyzedError = analyzeYunwuApiError(response, data, response.status);
        if (analyzedError) {
          return res.status(analyzedError.statusCode || 400).json({
            success: analyzedError.success,
            message: analyzedError.message,
            errorCode: analyzedError.errorCode,
            helpUrl: analyzedError.helpUrl,
            ...walletInfo
          });
        }
        return res.json({
          success: false,
          message: extractErrorMessage(data) || `请求失败 (${response.status})`,
          ...walletInfo
        });
      }
      const inner = data?.data;
      const inner2 = (inner && typeof inner === 'object') ? inner.data : null;
      const fromInner = (o) => (o && typeof o === 'object') ? (o.task_id ?? o.id ?? null) : null;
      const queryId = fromInner(inner2) ?? fromInner(inner) ?? data?.task_id ?? data?.id ?? null;
      let taskId = queryId ?? data?.request_id ?? data?.external_task_id ?? null;
      if (taskId != null) taskId = String(taskId);
      if (!taskId) {
        // ✅ 失败时不扣款，返回当前钱包信息
        const currentWallet = getWallet(userId);
        const records = getWalletRecords(userId, 10);
        return res.json({
          success: false,
          message: '云雾未返回任务ID。',
          debug: data ? { keys: Object.keys(data), sample: JSON.stringify(data).substring(0, 300) } : null,
          balance: currentWallet ? currentWallet.balance : 0,
          consumed: currentWallet ? currentWallet.consumed : 0,
          records: records.slice(0, 5),
        });
      }
      // ✅ 只有在API调用成功且返回有效任务ID时才扣款
      const deductAmount = getDeductAmount(operationKey, data);
      const deductDesc = getDeductDescription(type);
      console.log('=== 开始扣款流程（内容视频）===');
      console.log('扣款参数: userId=%s amount=%s description=%s', userId, deductAmount, deductDesc);
      
      const newBalance = deductBalance(userId, deductAmount, deductDesc);
      if (newBalance == null) {
        console.warn('内容视频扣款失败（余额可能已被其他请求扣除）:', userId);
      } else {
        // 验证记录是否写入
        const records = getWalletRecords(userId, 1);
        console.log('扣款后查询记录数量:', records.length, '最近一条:', records[0] ? JSON.stringify(records[0]) : '无');
      }
      
      // 获取最新钱包信息和记录
      const updatedWallet = getWallet(userId);
      const records = getWalletRecords(userId, 10);
      
      return res.json({
        success: true,
        provider: 'yunwu',
        type,
        taskId,
        id: taskId,
        status: data?.status || 'processing',
        data,
        deducted: deductAmount,
        balance: newBalance != null ? newBalance : (updatedWallet ? updatedWallet.balance : wallet.balance),
        consumed: updatedWallet ? updatedWallet.consumed : wallet.consumed,
        records: records.slice(0, 5),
      });
    }

    if (provider === 'heygen') {
      if (!avatarId || !avatarId.trim()) {
        return res.status(400).json({
          success: false,
          message: '请提供有效的 avatar_id。',
        });
      }
      if (!text || !text.trim()) {
        return res.status(400).json({
          success: false,
          message: 'HeyGen需要文案内容（text）',
        });
      }
      const videoInput = {
        character: { type: 'avatar', avatar_id: avatarId.trim() },
        voice: { type: 'text', input_text: text.trim() },
      };
      if (voiceId && voiceId.trim()) {
        videoInput.voice.voice_id = voiceId.trim();
      }
      if (type === 'promote' && productImage) {
        let finalProductImage = String(productImage).trim();
        if (finalProductImage.startsWith('data:')) {
          const i = finalProductImage.indexOf(',');
          finalProductImage = i >= 0 ? finalProductImage.slice(i + 1) : finalProductImage;
        }
        if (finalProductImage.startsWith('http://') || finalProductImage.startsWith('https://')) {
          const urlValidation = validateImageUrl(finalProductImage);
          if (!urlValidation.valid) {
            return res.json({
              success: false,
              message: `商品图片URL格式错误：${urlValidation.message}`,
            });
          }
          videoInput.background = { type: 'image', url: finalProductImage };
        }
      }
      const requestBody = {
        video_inputs: [videoInput],
        dimension: { width: 1280, height: 720 },
      };
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      let response;
      try {
        response = await fetch('https://api.heygen.com/v2/video/generate', {
          method: 'POST',
          headers: {
            'X-Api-Key': apiKey.trim(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }
      const parsed = await parseResponse(response, 'HeyGen内容视频接口');
      if (parsed.error) {
        return res.json({ success: false, message: parsed.message });
      }
      const data = parsed.data;
      if (!response.ok) {
        const errorMsg = data?.detail || data?.message || data?.error?.message || data?.error || `API错误: ${response.status}`;
        return res.json({ success: false, message: errorMsg });
      }
      const videoId = data?.data?.video_id || data?.video_id || data?.id;
      if (!videoId) {
        return res.json({
          success: false,
          message: 'HeyGen API响应中未找到视频ID。',
          debug: { responseData: data },
        });
      }
      return res.json({
        success: true,
        provider: 'heygen',
        type,
        taskId: videoId,
        id: videoId,
        status: 'created',
        data,
      });
    }
  } catch (error) {
    console.error('统一内容视频创建错误:', error);
    res.status(500).json({
      success: false,
      message: error.message || '创建内容视频时发生错误',
    });
  }
});

module.exports = router;
