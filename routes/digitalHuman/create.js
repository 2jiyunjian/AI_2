/**
 * 数字人 - 创建数字人模块：HeyGen/云雾创建、任务查询、图像生成
 * API Key 由管理员在后台分配，请求时从登录用户解析，不再接受前端传入的 Key
 * 国内数字人（云雾）：成功创建任务/图像后从用户余额扣款
 */
const express = require('express');
const { getApiKey, getWallet, deductBalance, getWalletPricing, getDeductAmount, getWalletRecords } = require('../../db');
const { requireAuth } = require('../auth');
const {
  validateImageUrl,
  validateAudioUrl,
  handleFetchError,
  parseResponse,
  isTokenTypeError,
  isQuotaError,
  isChannelUnavailableError,
  createTokenTypeErrorResponse,
  createQuotaErrorResponse,
  extractErrorMessage,
  analyzeYunwuApiError,
} = require('./utils');

const router = express.Router();

const YUNWU_IMAGES_BASE = 'https://yunwu.ai/kling/v1/images/generations';

const MSG_NO_HEYGEN_KEY = '请先登录，由管理员在后台为您分配 HeyGen API Key';
const MSG_NO_YUNWU_KEY = '请先登录，由管理员在后台为您分配云雾 API Key';

const OPERATION_YUNWU_DIGITAL_HUMAN = 'yunwu_digital_human';
const OPERATION_YUNWU_IMAGE = 'yunwu_image';

// 解析当前用户的 HeyGen API Key（管理员分配）
function resolveHeygenKey(req, res, next) {
  requireAuth(req, res, () => {
    const userId = req.user && req.user.id;
    const key = getApiKey(userId, 'heygen') || getApiKey(0, 'heygen');
    if (!key || !String(key).trim()) {
      return res.status(200).json({ success: false, message: MSG_NO_HEYGEN_KEY });
    }
    req.heygenApiKey = String(key).trim();
    next();
  });
}

// 解析当前用户的云雾 API Key（管理员分配）
function resolveYunwuKey(req, res, next) {
  requireAuth(req, res, () => {
    const userId = req.user && req.user.id;
    const key = getApiKey(userId, 'yunwu') || getApiKey(0, 'yunwu');
    if (!key || !String(key).trim()) {
      return res.status(200).json({ success: false, message: MSG_NO_YUNWU_KEY });
    }
    req.yunwuApiKey = String(key).trim();
    next();
  });
}

// 统一数字人接口：解析当前用户的 HeyGen + 云雾 Key（管理员分配）
function resolveDigitalHumanKeys(req, res, next) {
  requireAuth(req, res, () => {
    const userId = req.user && req.user.id;
    req.heygenApiKey = String((getApiKey(userId, 'heygen') || getApiKey(0, 'heygen')) || '').trim();
    req.yunwuApiKey = String((getApiKey(userId, 'yunwu') || getApiKey(0, 'yunwu')) || '').trim();
    next();
  });
}

// ========== HeyGen API ==========
router.get('/heygen/voices', resolveHeygenKey, async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json');

    const apiKey = req.heygenApiKey;

    if (!apiKey) {
      return res.json({ success: false, message: MSG_NO_HEYGEN_KEY });
    }

    console.log('获取 HeyGen 语音列表:', { hasApiKey: !!apiKey });

    let timeoutId = null;
    try {
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), 20000);

      const response = await fetch('https://api.heygen.com/v2/voices', {
        method: 'GET',
        headers: {
          'X-Api-Key': apiKey,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      const parsed = await parseResponse(response, '获取语音列表');
      if (parsed.error) {
        return getVoicesFromAvatars(apiKey, res);
      }

      const voices = parsed.data?.data?.voices || parsed.data?.voices || parsed.data?.data || [];

      if (Array.isArray(voices) && voices.length > 0) {
        res.json({
          success: true,
          voices: voices.map(v => ({
            voice_id: v.voice_id || v.id || v,
            name: v.name || v.voice_name || v.voice_id || v.id || v,
            language: v.language || v.lang || null,
            gender: v.gender || null,
          })),
        });
      } else {
        return getVoicesFromAvatars(apiKey, res);
      }
    } catch (fetchError) {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      console.warn('获取语音列表失败，尝试从 avatar 信息中获取:', fetchError.message);
      return getVoicesFromAvatars(apiKey, res);
    }
  } catch (error) {
    console.error('获取 HeyGen 语音列表错误:', error);
    res.json({
      success: false,
      message: error.message || '获取语音列表时发生错误',
    });
  }
});

// 辅助函数：从 avatar 信息中获取语音
async function getVoicesFromAvatars(apiKey, res) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const response = await fetch('https://api.heygen.com/v2/avatars', {
      method: 'GET',
      headers: {
        'X-Api-Key': apiKey,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const parsed = await parseResponse(response);
      if (!parsed.error) {
        const avatars = parsed.data?.data?.avatars || parsed.data?.avatars || parsed.data?.data || [];
        const voiceMap = new Map();

        avatars.forEach(avatar => {
          if (avatar.default_voice_id && !voiceMap.has(avatar.default_voice_id)) {
            voiceMap.set(avatar.default_voice_id, {
              voice_id: avatar.default_voice_id,
              name: `默认语音 (${avatar.avatar_name || 'Avatar'})`,
              language: null,
              gender: avatar.gender || null,
            });
          }
        });

        const voices = Array.from(voiceMap.values());
        if (voices.length > 0) {
          return res.json({
            success: true,
            voices,
            note: '这些语音是从 avatar 信息中提取的 default_voice_id',
          });
        }
      }
    }

    return res.json({
      success: true,
      voices: [{ voice_id: '1', name: '默认语音（自动选择）', language: 'auto', gender: null }],
      note: '无法获取语音列表，返回默认选项。如果创建失败，请查看 HeyGen API 文档获取正确的 voice_id 格式。',
    });
  } catch (error) {
    console.error('从 avatar 获取语音失败:', error);
    return res.json({
      success: true,
      voices: [{ voice_id: '1', name: '默认语音（自动选择）', language: 'auto', gender: null }],
      note: '无法获取语音列表，返回默认选项。如果创建失败，请查看 HeyGen API 文档获取正确的 voice_id 格式。',
    });
  }
}

// HeyGen 获取 Avatar 列表
router.get('/heygen/avatars', resolveHeygenKey, async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json');

    const apiKey = req.heygenApiKey;

    console.log('获取 HeyGen Avatar 列表:', { hasApiKey: !!apiKey });

    let timeoutId = null;
    try {
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch('https://api.heygen.com/v2/avatars', {
        method: 'GET',
        headers: {
          'X-Api-Key': apiKey,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      const parsed = await parseResponse(response, '获取 Avatar 列表');
      if (parsed.error) {
        return res.json({ success: false, message: parsed.message });
      }

      const avatars = parsed.data?.data?.avatars || parsed.data?.avatars || parsed.data?.data || [];

      res.json({
        success: true,
        avatars: Array.isArray(avatars) ? avatars : [],
        defaultAvatarId: avatars.length > 0 ? avatars[0]?.avatar_id || avatars[0]?.id || avatars[0] : null,
      });
    } catch (fetchError) {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      const errorInfo = handleFetchError(fetchError, '获取 Avatar 列表');
      return res.json({ success: false, message: errorInfo.message });
    }
  } catch (error) {
    console.error('获取 HeyGen Avatar 列表错误:', error);
    res.json({
      success: false,
      message: error.message || '获取 Avatar 列表时发生错误',
    });
  }
});

// HeyGen 创建视频
router.post('/heygen/video', resolveHeygenKey, async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json');

    const apiKey = req.heygenApiKey;
    const { avatarId, text, voiceId, imageUrl, productName, digitalHumanType, imageFile } = req.body || {};

    console.log('收到 HeyGen 视频创建请求:', {
      hasApiKey: !!apiKey,
      avatarId: avatarId || '未提供',
      textLength: text?.length || 0,
      voiceId: voiceId || 'default',
      hasImage: !!imageUrl,
      digitalHumanType: digitalHumanType || 'video',
    });

    if (!text || !text.trim()) {
      return res.json({ success: false, message: '请提供文案内容' });
    }

    let finalAvatarId = avatarId;
    let defaultVoiceId = null;

    // 如果没有提供 avatarId，尝试获取默认 avatar
    if (!finalAvatarId || finalAvatarId === 'default') {
      console.log('未提供 avatarId，尝试获取默认 avatar...');

      let avatarTimeoutId = null;
      try {
        const controller = new AbortController();
        avatarTimeoutId = setTimeout(() => controller.abort(), 20000);

        const avatarResponse = await fetch('https://api.heygen.com/v2/avatars', {
          method: 'GET',
          headers: {
            'X-Api-Key': apiKey,
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        });

        if (avatarTimeoutId) {
          clearTimeout(avatarTimeoutId);
          avatarTimeoutId = null;
        }

        if (avatarResponse.ok) {
          const parsed = await parseResponse(avatarResponse);
          if (!parsed.error && parsed.data) {
            const avatars = parsed.data?.data?.avatars || parsed.data?.avatars || parsed.data?.data || [];

            if (Array.isArray(avatars) && avatars.length > 0) {
              const firstAvatar = avatars[0];
              finalAvatarId = firstAvatar?.avatar_id || firstAvatar?.id || avatars[0];

              defaultVoiceId =
                firstAvatar?.default_voice_id ||
                avatars.find(a => a?.default_voice_id)?.default_voice_id ||
                avatars.find(a => a?.voice_id)?.voice_id ||
                null;

              console.log('获取到默认 avatar:', finalAvatarId, { defaultVoiceId });
            }
          }
        }
      } catch (avatarError) {
        if (avatarTimeoutId) {
          clearTimeout(avatarTimeoutId);
        }

        const errorInfo = handleFetchError(avatarError, '获取 Avatar 列表');
        if (errorInfo.code === 'TIMEOUT') {
          return res.json({
            success: false,
            message:
              '获取 Avatar 列表超时。\n\n建议：\n1. 检查网络连接\n2. 稍后重试\n3. 或者，如果您知道 avatar_id，可以在创建时直接提供',
          });
        }
        return res.json({
          success: false,
          message: `无法获取 Avatar 列表：${errorInfo.message}\n\n请确保：\n1. 网络连接正常\n2. API Key 有效\n3. 已在 HeyGen 平台创建至少一个 Avatar\n\n或者，您可以直接提供 avatar_id 参数。`,
        });
      }
    }

    if (!finalAvatarId) {
      return res.json({
        success: false,
        message: '未找到可用的 Avatar。请先登录 HeyGen 平台创建 Avatar，或提供有效的 avatar_id。',
      });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const videoInput = {
        character: {
          type: 'avatar',
          avatar_id: finalAvatarId,
        },
        voice: {
          type: 'text',
          input_text: text.trim(),
        },
      };

      if (digitalHumanType === 'image' && imageFile) {
        // 验证图片URL格式（如果是URL格式）
        const trimmedImageFile = String(imageFile).trim();
        if (trimmedImageFile.startsWith('http://') || trimmedImageFile.startsWith('https://')) {
          const urlValidation = validateImageUrl(trimmedImageFile);
          if (!urlValidation.valid) {
            return res.json({ success: false, message: `图片数字人图片URL格式错误：${urlValidation.message}` });
          }
        }
        videoInput.character = {
          type: 'image',
          image_url: trimmedImageFile,
        };
        console.log('使用图片数字人模式');
      }

      // 确定 voice_id
      let finalVoiceId = null;
      if (voiceId && voiceId.trim()) {
        const trimmedVoiceId = voiceId.trim();
        const invalidVoiceIds = ['default', 'en', 'zh', 'en-US', 'zh-CN', 'en-US-female', 'en-US-male', 'zh-CN-female', 'zh-CN-male'];

        if (!invalidVoiceIds.includes(trimmedVoiceId) && (/^\d+$/.test(trimmedVoiceId) || /^[a-zA-Z0-9_-]+$/.test(trimmedVoiceId))) {
          finalVoiceId = trimmedVoiceId;
        }
      }

      if (!finalVoiceId && defaultVoiceId) {
        finalVoiceId = defaultVoiceId;
      }

      if (!finalVoiceId) {
        const hasChinese = /[\u4e00-\u9fa5]/.test(text.trim());
        finalVoiceId = hasChinese ? 'zh' : 'en';
        console.warn('未找到有效的 voice_id，使用推断默认值:', finalVoiceId);
      }

      videoInput.voice.voice_id = finalVoiceId;

      if (imageUrl) {
        // 验证图片URL格式
        const trimmedImageUrl = String(imageUrl).trim();
        if (trimmedImageUrl.startsWith('http://') || trimmedImageUrl.startsWith('https://')) {
          const urlValidation = validateImageUrl(trimmedImageUrl);
          if (!urlValidation.valid) {
            return res.json({ success: false, message: `背景图片URL格式错误：${urlValidation.message}` });
          }
        }
        videoInput.background = {
          type: 'image',
          url: trimmedImageUrl,
        };
      }

      const requestBody = {
        video_inputs: [videoInput],
        dimension: { width: 1280, height: 720 },
      };

      let response;
      let retryCount = 0;
      const maxRetries = 2;

      while (retryCount <= maxRetries) {
        try {
          response = await fetch('https://api.heygen.com/v2/video/generate', {
            method: 'POST',
            headers: {
              'X-Api-Key': apiKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
            signal: controller.signal,
          });
          break;
        } catch (fetchError) {
          retryCount++;
          if (retryCount > maxRetries) {
            const errorInfo = handleFetchError(fetchError, 'HeyGen API');
            clearTimeout(timeoutId);
            return res.json({
              success: false,
              message: errorInfo.message,
              error: fetchError.message,
              code: fetchError.code,
            });
          }
          const waitTime = Math.min(1000 * 2 ** (retryCount - 1), 5000);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }

      clearTimeout(timeoutId);

      const parsed = await parseResponse(response, 'HeyGen API');
      if (parsed.error) {
        return res.json({ success: false, message: parsed.message });
      }

      const data = parsed.data;

      if (data?.error) {
        const errorMsg = data.error?.message || data.error || 'HeyGen API 返回错误';
        let detailedMessage = errorMsg;
        if (errorMsg.includes('voice') || errorMsg.includes('Voice') || errorMsg.includes('voice_id')) {
          detailedMessage = `${errorMsg}\n\n💡 建议：\n1. 请先调用 /api/heygen/voices 获取可用的语音列表\n2. 从列表中选择一个有效的语音\n3. 当前使用的 voice_id: ${finalVoiceId}`;
        }
        return res.json({ success: false, message: detailedMessage });
      }

      if (!response.ok) {
        const errorMsg = data?.error?.message || data?.message || data?.error || `HeyGen API请求失败 (状态码: ${response.status})`;
        return res.json({ success: false, message: errorMsg });
      }

      const videoId = data?.data?.video_id || data?.data?.id || data?.video_id || data?.id;

      if (!videoId) {
        console.warn('HeyGen API 响应中未找到 video_id:', JSON.stringify(data, null, 2));
        return res.json({
          success: false,
          message: 'HeyGen API 响应中未找到 video_id。请检查响应数据或联系技术支持。',
          debug: { responseData: data },
        });
      }

      console.log('成功提取 video_id:', videoId);

      res.json({
        success: true,
        data: {
          ...data,
          video_id: videoId,
          id: videoId,
        },
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);
      const errorInfo = handleFetchError(fetchError, 'HeyGen API');
      return res.json({ success: false, message: errorInfo.message });
    }
  } catch (error) {
    console.error('HeyGen 视频创建错误:', error);
    res.json({
      success: false,
      message: error.message || '创建视频时发生未知错误',
    });
  }
});

// HeyGen 查询任务状态
router.get('/heygen/task/:taskId', resolveHeygenKey, async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json');

    const { taskId } = req.params;
    const apiKey = req.heygenApiKey;

    if (!taskId) {
      return res.json({ success: false, message: '请提供任务ID' });
    }

    console.log('查询 HeyGen 任务状态:', { taskId, hasApiKey: !!apiKey });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const headers = {
        Accept: 'application/json',
        'X-Api-Key': apiKey,
        'Content-Type': 'application/json',
      };

      // 尝试多个端点
      const endpoints = [
        `https://api.heygen.com/v1/video_status.get?video_id=${encodeURIComponent(taskId)}`,
        'https://api.heygen.com/v1/video_status.get',
        `https://api.heygen.com/v2/videos/${taskId}`,
        `https://api.heygen.com/v2/video/${taskId}`,
      ];

      let response;
      let lastError;

      for (const endpoint of endpoints) {
        try {
          const method = endpoint.includes('?') ? 'GET' : endpoint.includes('v1/video_status.get') ? 'POST' : 'GET';
          const body = method === 'POST' ? JSON.stringify({ video_id: taskId }) : undefined;

          response = await fetch(endpoint, {
            method,
            headers,
            body,
            signal: controller.signal,
          });

          if (response.ok) {
            break;
          }
          if (response.status !== 404) {
            break;
          }
        } catch (err) {
          lastError = err;
          continue;
        }
      }

      clearTimeout(timeoutId);

      if (!response || (!response.ok && response.status === 404)) {
        return res.json({
          success: false,
          message: `无法找到任务 (ID: ${taskId})。\n\n可能的原因：\n1. 任务ID不正确或格式错误\n2. 任务已过期或已被删除\n3. API端点已更改\n4. API Key 无效或权限不足`,
          error: 'Task not found (404)',
          taskId,
        });
      }

      const parsed = await parseResponse(response, '查询任务状态');
      if (parsed.error) {
        return res.json({ success: false, message: parsed.message });
      }

      const data = parsed.data;

      if (!response.ok) {
        const errorMsg = data?.error?.message || data?.message || data?.error || `查询任务状态失败 (状态码: ${response.status})`;
        return res.json({ success: false, message: errorMsg });
      }

      const status = data?.data?.status || data?.status;
      let normalizedStatus = 'processing';
      let progress = 0;
      let videoUrl = null;

      if (['completed', 'done', 'success'].includes(status)) {
        normalizedStatus = 'completed';
        progress = 100;
        videoUrl =
          data?.data?.video_url ||
          data?.data?.video_urls?.[0] ||
          data?.data?.result_url ||
          data?.video_url ||
          data?.result_url;
      } else if (['failed', 'error', 'failure'].includes(status)) {
        normalizedStatus = 'failed';
      } else if (['processing', 'pending', 'in_progress', 'waiting'].includes(status)) {
        normalizedStatus = 'processing';
        progress = data?.data?.progress || data?.progress || 0;
      }

      const errMsg =
        data?.data?.error?.message ||
        data?.data?.error ||
        data?.error?.message ||
        data?.error ||
        data?.message ||
        null;

      res.json({
        success: true,
        task: data,
        status: normalizedStatus,
        progress,
        videoUrl,
        error: errMsg,
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);
      const errorInfo = handleFetchError(fetchError, 'HeyGen API');
      return res.json({ success: false, message: errorInfo.message });
    }
  } catch (error) {
    console.error('HeyGen查询状态错误:', error);
    res.json({
      success: false,
      message: error.message || '查询任务状态时发生错误',
    });
  }
});

// HeyGen API 测试端点（使用管理员为当前用户分配的 Key 测试，不再接受前端传入）
router.post('/heygen/test', resolveHeygenKey, async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json');

    const trimmedKey = req.heygenApiKey;
    if (trimmedKey.length < 10 || trimmedKey.length > 200) {
      return res.status(200).json({ success: false, message: 'API Key 格式不正确' });
    }

    console.log('测试 HeyGen API Key:', { hasApiKey: !!trimmedKey, keyLength: trimmedKey.length });

    let timeoutId = null;
    try {
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), 20000);

      const response = await fetch('https://api.heygen.com/v2/avatars', {
        method: 'GET',
        headers: {
          'X-Api-Key': trimmedKey,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      if (response.status === 401 || response.status === 403) {
        return res.status(200).json({
          success: false,
          message: 'API Key 无效或已过期',
        });
      }

      if (!response.ok && response.status !== 404) {
        const parsed = await parseResponse(response);
        return res.status(200).json({
          success: false,
          message: `API 验证失败 (状态码: ${response.status}): ${parsed.data?.message || parsed.data?.error || '未知错误'}`,
        });
      }

      const parsed = await parseResponse(response);
      const avatarCount = parsed.data?.data?.avatars?.length || parsed.data?.avatars?.length || 0;

      return res.status(200).json({
        success: true,
        message: 'API Key 验证通过！',
        avatarCount,
      });
    } catch (fetchError) {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      const errorInfo = handleFetchError(fetchError, 'API');
      if (errorInfo.code === 'TIMEOUT') {
        return res.status(200).json({
          success: true,
          message: 'API Key 格式验证通过（验证超时，实际验证将在使用时进行）',
        });
      }

      if (errorInfo.code === 'CONNECTION_REFUSED' || errorInfo.code === 'DNS_ERROR') {
        return res.status(200).json({
          success: false,
          message: '无法连接到 HeyGen API 服务器，请检查网络连接',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'API Key 格式验证通过（实际验证将在使用时进行）',
      });
    }
  } catch (error) {
    console.error('HeyGen测试错误:', error);
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json({
      success: false,
      message: error.message || '验证过程中发生错误',
    });
  }
});

// ========== 云雾数字人 API ==========

// 云雾数字人创建（严格遵循可灵 Kling 数字人 OpenAPI 规范）
// API文档：POST https://yunwu.ai/kling/v1/videos/avatar/image2video
// 规范要求：
//   - image: 必填，支持Base64编码或URL（.jpg/.jpeg/.png，≤10MB，≥300px，宽高比1:2.5~2.5:1）
//   - audio_id 与 sound_file: 二选一，不能同时为空也不能同时有值
//   - prompt: 必填，正向文本提示词（使用音频时可为空字符串）
//   - mode: 必填，生成视频的模式（如：std）
//   - callback_url: 必填（可为空字符串）
//   - external_task_id: 必填（可为空字符串）
router.post('/yunwu/digital-human', resolveYunwuKey, async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json');

    const apiKey = req.yunwuApiKey;
    const { imageUrl, text, name, description, mode, audioId, audioFile, prompt, callbackUrl, externalTaskId } = req.body || {};

    // 验证 image（必需参数）
    if (!imageUrl) {
      return res.json({ success: false, message: '请提供数字人参考图（imageUrl）：图片 Base64 编码或图片 URL' });
    }

    // 规范：audio_id 与 sound_file 二选一，不能同时为空也不能同时有值
    const hasAudioId = !!(audioId && String(audioId).trim());
    const hasAudioFile = !!(audioFile && String(audioFile).trim());
    if (hasAudioId && hasAudioFile) {
      return res.json({ success: false, message: 'audio_id 与 sound_file 二选一，不能同时传入' });
    }
    if (!hasAudioId && !hasAudioFile) {
      return res.json({
        success: false,
        message: '可灵数字人接口要求必须提供音频。请上传音频文件（audioFile/sound_file）或使用试听接口的 audioId（audio_id）。',
      });
    }

    // ❌ 只支持URL，不再支持Base64
    // 规范：.jpg/.jpeg/.png，≤10MB，≥300px，宽高比 1:2.5~2.5:1
    let finalImage = imageUrl.trim();
    if (finalImage && (finalImage.startsWith('http://') || finalImage.startsWith('https://'))) {
      // 验证图片URL格式
      const urlValidation = validateImageUrl(finalImage);
      if (!urlValidation.valid) {
        return res.json({ success: false, message: urlValidation.message });
      }
      // URL格式正确，直接使用
      console.log('✅ 图片已是URL格式，直接使用');
    } else {
      // ❌ 拒绝Base64输入
      return res.json({ 
        success: false, 
        message: '不再支持Base64格式。请使用FormData上传文件获取URL，或直接提供图片URL。' 
      });
    }

    // ❌ 只支持URL，不再支持Base64
    // 规范：URL，.mp3/.wav/.m4a/.aac，≤5MB，2~60 秒
    let finalSoundFile = '';
    let finalAudioId = '';
    if (hasAudioFile) {
      let raw = String(audioFile).trim();
      
      // 只接受URL格式
      if (raw.startsWith('http://') || raw.startsWith('https://')) {
        // 验证音频URL格式
        const urlValidation = validateAudioUrl(raw);
        if (!urlValidation.valid) {
          return res.json({ success: false, message: urlValidation.message });
        }
        finalSoundFile = raw; // URL 格式
        console.log('✅ 音频已是URL格式，直接使用');
      } else {
        // ❌ 拒绝Base64输入
        return res.json({ 
          success: false, 
          message: '不再支持Base64格式。请使用FormData上传文件获取URL，或直接提供音频URL。' 
        });
      }
      
      console.log('音频文件处理:', {
        hasAudioFile: true,
        isUrl: finalSoundFile.startsWith('http'),
        base64Length: finalSoundFile.length,
        fileSizeMB: finalSoundFile.startsWith('http') ? 'URL' : (finalSoundFile.length * 3 / 4 / 1024 / 1024).toFixed(2),
      });
    } else {
      finalAudioId = String(audioId).trim();
    }

    // 处理 prompt：根据文档，prompt 是必需参数（正向文本提示词）
    // 如果提供了 text 参数，使用 text；否则使用传入的 prompt；如果都没有，使用空字符串
    const finalPrompt = (prompt !== undefined && prompt !== null) ? String(prompt).trim() : 
                        (text !== undefined && text !== null) ? String(text).trim() : '';

    // 处理 mode：必需参数，默认为 'std'
    const finalMode = (mode && String(mode).trim()) || 'std';

    // 处理 callback_url 和 external_task_id：必需参数，但可以为空字符串
    // ✅ 优先使用传入的callbackUrl，否则使用环境变量配置的部署URL，最后使用空字符串
    let finalCallbackUrl = '';
    if (callbackUrl !== undefined && callbackUrl !== null && String(callbackUrl).trim()) {
      finalCallbackUrl = String(callbackUrl).trim();
    } else if (process.env.CALLBACK_URL || process.env.DEPLOY_URL) {
      finalCallbackUrl = (process.env.CALLBACK_URL || process.env.DEPLOY_URL).trim();
    }
    const finalExternalTaskId = (externalTaskId !== undefined && externalTaskId !== null) ? String(externalTaskId).trim() : '';

    console.log('创建云雾数字人任务:', {
      hasApiKey: !!apiKey,
      imageType: finalImage.startsWith('http') ? 'URL' : 'Base64',
      imageLen: finalImage.length,
      useAudioId: !!finalAudioId,
      useSoundFile: !!finalSoundFile,
      prompt: finalPrompt || '(空)',
      mode: finalMode,
      callbackUrl: finalCallbackUrl || '(空)',
      externalTaskId: finalExternalTaskId || '(空)',
    });

    const userId = req.user && req.user.id;
    const pricing = getWalletPricing();
    const requiredAmount = pricing[OPERATION_YUNWU_DIGITAL_HUMAN] ?? 1;
    const wallet = getWallet(userId);
    if (!wallet || wallet.balance < requiredAmount) {
      return res.json({ success: false, message: '余额不足，请先充值后再使用数字人创建功能' });
    }

    // 构建请求体（严格按照 API 文档格式）
    const requestBody = {
      image: finalImage,
      audio_id: finalAudioId || '',
      sound_file: finalSoundFile || '',
      prompt: finalPrompt,
      mode: finalMode,
      callback_url: finalCallbackUrl,
      external_task_id: finalExternalTaskId,
    };

    // 发送请求到云雾API
    let response;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60秒超时

    console.log('=== 开始发送请求到云雾API ===');
    console.log('请求时间:', new Date().toISOString());
    console.log('API端点:', 'https://yunwu.ai/kling/v1/videos/avatar/image2video');
    console.log('部署环境:', process.env.NODE_ENV || 'development');
    console.log('Callback URL:', requestBody.callback_url || '(空)');

    try {
      const fetchStartTime = Date.now();
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
      const fetchDuration = Date.now() - fetchStartTime;
      clearTimeout(timeoutId);
      
      console.log('=== 云雾API请求已发送 ===');
      console.log('请求耗时:', `${fetchDuration}ms`);
      console.log('响应状态:', response.status, response.statusText);
      console.log('响应URL:', response.url);
    } catch (fetchError) {
      clearTimeout(timeoutId);
      const errorInfo = handleFetchError(fetchError, '云雾数字人接口');
      return res.json({ success: false, message: errorInfo.message });
    }

    // 解析响应
    const parsed = await parseResponse(response, '云雾数字人接口');
    if (parsed.error) {
      return res.json({ success: false, message: parsed.message });
    }

    const data = parsed.data;

    // 记录完整的响应数据，便于调试
    console.log('云雾数字人创建接口响应:', {
      status: response.status,
      ok: response.ok,
      dataKeys: Object.keys(data || {}),
      dataPreview: JSON.stringify(data).substring(0, 500)
    });

    // 处理错误响应
    if (!response.ok) {
      const errMsg = data?.message || data?.error?.message || data?.error || data?.detail || `云雾数字人接口请求失败 (状态码: ${response.status})`;
      const errMsgLower = String(errMsg).toLowerCase();
      if (/insufficient quota|quota.*exceeded|余额不足|配额不足|insufficient balance|balance.*insufficient/i.test(errMsgLower)) {
        return res.json({
          success: false,
          message: 'API 配额不足或余额不足。\n\n解决方案：\n1. 访问 https://yunwu.ai/topup 进入余额管理\n2. 充值账户余额\n3. 确认令牌有足够的配额后重试',
        });
      }
      if (/image|图片|invalid.*image|image.*invalid|格式错误|格式无效/i.test(errMsgLower)) {
        return res.json({
          success: false,
          message: '图片格式或内容无效。\n\n请确保：\n1. 图片格式为 .jpg/.jpeg/.png\n2. 文件大小 ≤10MB\n3. 图片尺寸 ≥300px\n4. 图片宽高比在 1:2.5 ~ 2.5:1 之间\n5. 图片完整且未损坏',
        });
      }
      if (/audio|音频|sound_file|audio_id/i.test(errMsgLower)) {
        if (/something went wrong|get the contents|无法读取|读取文件|file.*contents|contents.*file/i.test(errMsgLower)) {
          return res.json({
            success: false,
            message: 'API无法读取音频文件内容。\n\n可能的原因：\n1. 音频文件格式或编码不被支持\n2. 文件已损坏\n3. base64编码有问题\n\n建议：\n• 尝试使用其他音频编辑工具重新保存文件\n• 确保音频文件可以正常播放\n• 尝试转换为MP3格式后重新上传',
          });
        }
        if (/format|格式|invalid|无效|不支持/i.test(errMsgLower)) {
          return res.json({
            success: false,
            message: '音频格式无效。\n\n请确保：\n1. 音频格式为 .mp3/.wav/.m4a/.aac\n2. 文件大小 ≤5MB\n3. 音频时长 2~60 秒\n4. 音频文件完整且未损坏',
          });
        }
        if (/duration|时长|time|seconds|秒/i.test(errMsgLower) && (/invalid|无效|不支持|too|exceed/i.test(errMsgLower))) {
          return res.json({
            success: false,
            message: '音频时长不符合要求。\n\n请确保音频时长在 2~60 秒之间。',
          });
        }
      }
      return res.json({ success: false, message: errMsg });
    }

    const queryId = data?.data?.id ?? data?.id ?? data?.data?.task_id ?? data?.task_id ?? null;
    const taskId = queryId ?? data?.request_id ?? data?.external_task_id ?? null;
    if (!taskId) {
      console.warn('云雾数字人接口响应中未找到任务ID:', {
        status: response.status,
        dataKeys: Object.keys(data || {}),
        dataPreview: JSON.stringify(data).substring(0, 500)
      });
      return res.json({
        success: false,
        message: '云雾数字人接口响应中未找到任务ID，请检查云雾文档或联系技术支持。\n\n响应数据：' + JSON.stringify(data).substring(0, 200),
        debug: data,
      });
    }

    console.log('云雾数字人任务创建成功:', {
      taskId,
      status: data?.status || 'processing',
      responseStatus: response.status,
      dataKeys: Object.keys(data || {})
    });

    // ✅ 只有在API调用成功且返回有效任务ID时才扣款
    const deductAmount = getDeductAmount(OPERATION_YUNWU_DIGITAL_HUMAN, data);
    console.log('=== 开始扣款流程（旧API路径）===');
    console.log('扣款参数: userId=%s amount=%s description=%s', userId, deductAmount, '云雾数字人创建');
    
    const newBalance = deductBalance(userId, deductAmount, '云雾数字人创建');
    if (newBalance == null) {
      console.warn('云雾数字人创建扣款失败（余额可能已被其他请求扣除）:', userId);
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
      records: records.slice(0, 5), // 返回最近5条记录
    });
  } catch (error) {
    console.error('云雾数字人创建错误:', error);
    // ✅ 失败时不扣款，返回当前钱包信息
    const currentWallet = getWallet(userId);
    const records = getWalletRecords(userId, 10);
    res.json({
      success: false,
      message: error.message || '云雾数字人创建时发生错误',
      balance: currentWallet ? currentWallet.balance : 0,
      consumed: currentWallet ? currentWallet.consumed : 0,
      records: records.slice(0, 5),
    });
  }
});

// 云雾数字人API测试（使用管理员为当前用户分配的 Key 测试）
router.post('/yunwu/test', resolveYunwuKey, async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json');

    const trimmedKey = req.yunwuApiKey;
    if (trimmedKey.length < 10 || trimmedKey.length > 200) {
      return res.json({ success: false, message: 'API Key 格式不正确（长度应在10-200字符之间）' });
    }

    const deployUrl = process.env.CALLBACK_URL || process.env.DEPLOY_URL || '';
    const testRequestBody = {
      image: 'https://example.com/test.jpg', // 测试图片URL（预期会失败，但可以验证API Key）
      audio_id: '', // 空字符串，符合规范
      sound_file: '', // 空字符串，符合规范
      prompt: '', // 空字符串，符合规范
      mode: 'std',
      callback_url: deployUrl,
      external_task_id: '',
    };

    console.log('=== 云雾API测试请求详情 ===');
    console.log('时间戳:', new Date().toISOString());
    console.log('API端点:', 'https://yunwu.ai/kling/v1/videos/avatar/image2video');
    console.log('请求方法: POST');
    console.log('API Key长度:', trimmedKey.length);
    console.log('API Key前缀:', trimmedKey.substring(0, 10) + '...');
    console.log('Callback URL:', deployUrl || '(空)');
    console.log('部署环境:', process.env.NODE_ENV || 'development');
    console.log('请求体:', JSON.stringify(testRequestBody, null, 2));

    try {
      // 使用可灵 Kling 数字人 API 探针验证
      // 发送一个测试请求，使用无效但格式正确的参数，以验证 API Key 和接口可用性
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // 20秒超时

      const fetchStartTime = Date.now();
      console.log('开始发送请求到云雾API...');

      const avatarRes = await fetch('https://yunwu.ai/kling/v1/videos/avatar/image2video', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${trimmedKey}`,
          'Content-Type': 'application/json',
          'User-Agent': 'AI-DigitalHuman-Platform/1.0',
        },
        body: JSON.stringify(testRequestBody),
        signal: controller.signal,
      });
      
      const fetchDuration = Date.now() - fetchStartTime;
      clearTimeout(timeoutId);
      
      console.log('=== 云雾API请求完成 ===');
      console.log('请求耗时:', `${fetchDuration}ms`);
      console.log('响应状态:', avatarRes.status, avatarRes.statusText);
      console.log('响应URL:', avatarRes.url);
      console.log('响应类型:', avatarRes.type);

      // 解析响应（无论状态码）
      let avData = {};
      try {
        const responseText = await avatarRes.text();
        if (responseText) {
          avData = JSON.parse(responseText);
        }
      } catch (e) {
        console.warn('解析云雾API响应失败:', e);
      }

      // 提取错误信息（支持多种格式）
      const errorMessage = extractErrorMessage(avData);
      const errorMsgLower = errorMessage.toLowerCase();

      console.log('=== 云雾API测试响应 ===');
      console.log('HTTP状态码:', avatarRes.status, avatarRes.statusText);
      console.log('响应头:', Object.fromEntries(avatarRes.headers.entries()));
      console.log('错误信息:', errorMessage.substring(0, 200));
      console.log('完整响应数据:', JSON.stringify(avData, null, 2));
      console.log('错误信息关键词检测:', {
        hasQuotaError: isQuotaError(errorMessage),
        hasTokenTypeError: isTokenTypeError(errorMessage),
        hasNoChannels: isChannelUnavailableError(errorMessage),
        hasGenericError: /请求失败|failed|error/i.test(errorMsgLower)
      });

      // 使用统一的错误分析函数
      const analyzedError = analyzeYunwuApiError(avatarRes, avData, avatarRes.status);
      if (analyzedError) {
        return res.status(analyzedError.statusCode || 400).json({
          success: analyzedError.success,
          message: analyzedError.message,
          errorCode: analyzedError.errorCode,
          error: analyzedError.error,
          helpUrl: analyzedError.helpUrl
        });
      }

      // 优先检查配额/余额不足错误（如果统一函数未处理）
      if (isQuotaError(errorMessage)) {
        return res.json({
          success: false,
          message: 'API 配额不足或余额不足。\n\n解决方案：\n1. 访问 https://yunwu.ai/topup 进入余额管理\n2. 充值账户余额\n3. 确认令牌有足够的配额后重试',
        });
      }
      
      // 优先检查 "No available channels" 错误（如果统一函数未处理）
      if (isChannelUnavailableError(errorMessage)) {
        return res.json({
          success: false,
          message: '当前令牌分组不支持可灵数字人。\n\n请访问 https://yunwu.ai/token 检查令牌配置。',
        });
      }

      if (avatarRes.status === 401 || avatarRes.status === 403) {
        return res.json({
          success: false,
          message: 'API Key 无效或已过期，请到云雾AI 令牌管理 检查并更换',
        });
      }

      if (avatarRes.status === 400) {
        // 400 状态码：如果错误是关于图片/URL/音频参数的，说明 Key 有效但测试参数不完整（这是预期的）
        // 这些错误表明API Key有效，接口可用，只是测试请求的参数不完整
        if (/image|图片|url|invalid|格式|格式错误/i.test(errorMsgLower) ||
            /audio|音频|sound_file|audio_id|时长无效|请提供有效的/i.test(errorMsgLower)) {
          return res.json({
            success: true,
            message: 'API Key 验证通过！数字人接口可用，可正常创建数字人视频',
          });
        }
        // 其他 400 错误
        return res.json({
          success: false,
          message: errorMessage || '数字人接口返回 400，请检查请求参数或联系云雾AI支持',
        });
      }

      if (avatarRes.ok) {
        return res.json({
          success: true,
          message: 'API Key 验证通过！已成功连接云雾AI',
        });
      }

      // 其他状态码（包括500等服务器错误）
      // 如果错误信息为空或通用（如"请求失败"），可能是Token类型问题或其他配置问题
      // 根据您的日志，详情显示"请求失败,如果多次出现,请联系客服"，这通常是Token配置问题
      if (!errorMessage || errorMessage.trim().length === 0 || 
          /请求失败|failed|error|如果多次出现|请联系客服/i.test(errorMessage) ||
          (avatarRes.status >= 500 && avatarRes.status < 600)) {
        const genericError = analyzeYunwuApiError(avatarRes, { message: errorMessage || '请求失败' }, avatarRes.status);
        if (genericError) {
          return res.status(genericError.statusCode || 400).json({
            success: genericError.success,
            message: genericError.message,
            errorCode: genericError.errorCode || (avatarRes.status >= 500 ? 'SERVER_ERROR' : 'API_ERROR'),
            helpUrl: genericError.helpUrl
          });
        }
      }
      
      // 其他状态码
      return res.json({
        success: false,
        message: errorMessage || `验证未通过 (HTTP ${avatarRes.status})，请确认 API Key 正确且具备可灵数字人权限。可在云雾AI 令牌管理 中新建含「可灵Kling」分组的令牌。`,
      });
    } catch (fetchError) {
      console.error('=== 云雾API请求失败 ===');
      console.error('错误时间:', new Date().toISOString());
      console.error('错误类型:', fetchError.constructor.name);
      console.error('错误名称:', fetchError.name);
      console.error('错误消息:', fetchError.message);
      console.error('错误堆栈:', fetchError.stack);
      console.error('错误代码:', fetchError.code);
      console.error('错误原因:', fetchError.cause);
      
      const err = handleFetchError(fetchError, '云雾API');
      console.error('处理后的错误信息:', err);
      
      if (err.code === 'CONNECTION_REFUSED' || err.code === 'DNS_ERROR' || err.code === 'NETWORK_ERROR') {
        return res.json({
          success: false,
          message: '无法连接云雾AI服务器，请检查网络或代理\n\n可能的原因：\n1. 部署环境无法访问 yunwu.ai\n2. 网络连接问题\n3. DNS解析失败\n\n建议：\n• 检查部署环境的网络配置\n• 确认防火墙规则\n• 查看服务器日志获取详细错误信息',
          errorCode: 'NETWORK_ERROR',
          debug: {
            errorType: fetchError.constructor.name,
            errorMessage: fetchError.message,
            errorCode: fetchError.code
          }
        });
      }
      
      return res.json({
        success: false,
        message: `验证失败：${err.message}\n\n如果部署后无法在云雾API日志中看到请求，可能是：\n1. 部署环境网络限制\n2. 请求被拦截\n3. DNS解析问题\n\n请检查部署环境的服务器日志获取详细错误信息。`,
        errorCode: err.code || 'UNKNOWN',
        debug: {
          errorType: fetchError.constructor.name,
          errorMessage: fetchError.message,
          errorCode: fetchError.code
        }
      });
    }
  } catch (error) {
    console.error('云雾数字人API测试错误:', error);
    res.json({
      success: false,
      message: error.message || '测试过程中发生错误',
    });
  }
});

// ========== 云雾可灵图像生成 API（图片生成） ==========
// 图片生成接口测试（必须放在 /generations/:id 之前，避免被 :id 匹配掉）
router.post('/yunwu/images/test', resolveYunwuKey, async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json');
    const key = req.yunwuApiKey;
    const testBody = { model_name: 'kling-v1', prompt: 'test', n: 1 };
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);
    const response = await fetch(YUNWU_IMAGES_BASE, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testBody),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const text = await response.text();
    let data;
    try { data = text ? JSON.parse(text) : {}; } catch (e) { data = {}; }
    const errMsg = (data?.message || data?.error?.message || data?.error || data?.detail || '').toLowerCase();
    if (response.ok) {
      return res.json({ success: true, message: 'API Key 验证通过！图片生成接口可用' });
    }
    if (response.status === 400 && (/prompt|invalid|参数|格式/i.test(errMsg) || data?.code !== undefined)) {
      return res.json({ success: true, message: 'API Key 验证通过！图片生成接口可用（测试请求参数被拒绝属正常）' });
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

router.post('/yunwu/images/generations', resolveYunwuKey, async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json');
    const key = req.yunwuApiKey;
    const userId = req.user && req.user.id;
    const pricing = getWalletPricing();
    const requiredAmount = pricing[OPERATION_YUNWU_IMAGE] ?? 0.5;
    const wallet = getWallet(userId);
    if (!wallet || wallet.balance < requiredAmount) {
      return res.json({ success: false, message: '余额不足，请先充值后再使用图像生成功能' });
    }
    const body = Object.assign({}, req.body || {});
    delete body.apiKey;
    if (!body.model_name) body.model_name = 'kling-v1';
    if (body.prompt == null) body.prompt = '';
    if (body.n == null) body.n = 1;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);
    const response = await fetch(YUNWU_IMAGES_BASE, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const text = await response.text();
    let data;
    try { data = text ? JSON.parse(text) : {}; } catch (e) { data = {}; }
    if (!response.ok) {
      // ✅ 失败时不扣款，返回当前钱包信息
      const currentWallet = getWallet(userId);
      const records = getWalletRecords(userId, 10);
      const msg = data?.message || data?.error?.message || data?.error || data?.detail || text || `请求失败 ${response.status}`;
      return res.status(response.status >= 400 ? response.status : 500).json({ 
        success: false, 
        message: msg, 
        data,
        balance: currentWallet ? currentWallet.balance : 0,
        consumed: currentWallet ? currentWallet.consumed : 0,
        records: records.slice(0, 5),
      });
    }
    // ✅ 只有在API调用成功时才扣款
    const deductAmount = getDeductAmount(OPERATION_YUNWU_IMAGE, data);
    console.log('=== 开始扣款流程（图像生成）===');
    console.log('扣款参数: userId=%s amount=%s description=%s', userId, deductAmount, '云雾图像生成');
    
    const newBalance = deductBalance(userId, deductAmount, '云雾图像生成');
    if (newBalance == null) {
      console.warn('云雾图像生成扣款失败（余额可能已被其他请求扣除）:', userId);
    } else {
      // 验证记录是否写入
      const records = getWalletRecords(userId, 1);
      console.log('扣款后查询记录数量:', records.length, '最近一条:', records[0] ? JSON.stringify(records[0]) : '无');
    }
    
    // 获取最新钱包信息和记录
    const updatedWallet = getWallet(userId);
    const records = getWalletRecords(userId, 10);
    
    const out = typeof data === 'object' && data !== null ? data : { success: true, data };
    if (typeof out === 'object' && out !== null && !Array.isArray(out)) {
      out.deducted = deductAmount;
      out.balance = newBalance != null ? newBalance : (updatedWallet ? updatedWallet.balance : wallet.balance);
      out.consumed = updatedWallet ? updatedWallet.consumed : wallet.consumed;
      out.records = records.slice(0, 5);
    }
    res.json(out);
  } catch (err) {
    // ✅ 失败时不扣款，返回当前钱包信息
    const currentWallet = getWallet(userId);
    const records = getWalletRecords(userId, 10);
    const msg = err.name === 'AbortError' ? '请求超时' : (err.message || String(err));
    res.json({ 
      success: false, 
      message: msg,
      balance: currentWallet ? currentWallet.balance : 0,
      consumed: currentWallet ? currentWallet.consumed : 0,
      records: records.slice(0, 5),
    });
  }
});

router.get('/yunwu/images/generations/:id', resolveYunwuKey, async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json');
    const id = req.params.id;
    const apiKey = req.yunwuApiKey;
    const url = `${YUNWU_IMAGES_BASE}/${encodeURIComponent(id)}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${String(apiKey).trim()}`,
        'Content-Type': 'application/json',
      },
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

// 云雾数字人任务查询（单个）
// API文档：GET https://yunwu.ai/kling/v1/videos/avatar/image2video/{id}
router.get('/yunwu/task/:taskId', resolveYunwuKey, async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json');

    const { taskId } = req.params;
    const apiKey = req.yunwuApiKey;

    // 验证任务ID
    if (!taskId || !taskId.trim()) {
      return res.json({ success: false, message: '请提供任务ID' });
    }

    const trimmedTaskId = String(taskId).trim();
    console.log('查询云雾数字人任务状态:', { taskId: trimmedTaskId, hasApiKey: !!apiKey });

    // 发送请求到云雾API
    let response;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒超时

    try {
      response = await fetch(`https://yunwu.ai/kling/v1/videos/avatar/image2video/${encodeURIComponent(trimmedTaskId)}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey.trim()}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch (fetchError) {
      clearTimeout(timeoutId);
      const errorInfo = handleFetchError(fetchError, '云雾任务查询接口');
      return res.json({ success: false, message: errorInfo.message });
    }

    // 解析响应
    const parsed = await parseResponse(response, '查询云雾任务状态');
    if (parsed.error) {
      return res.json({ success: false, message: parsed.message });
    }

    const data = parsed.data;

    // 处理错误响应
    if (!response.ok) {
      const errMsg = data?.message || data?.error?.message || data?.error || data?.detail || `查询云雾任务状态失败 (状态码: ${response.status})`;
      const errMsgLower = String(errMsg).toLowerCase();
      
      // 检查任务不存在错误
      if (response.status === 404 || /task.*not.*exist|任务不存在|task_not_exist|not.*found|不存在|404/i.test(errMsgLower)) {
        return res.json({
          success: false,
          message: `任务不存在（ID: ${trimmedTaskId}）。\n\n可能的原因：\n1. 任务ID不正确或格式错误\n2. 任务已被删除或过期\n3. 任务创建失败但返回了错误的ID\n\n建议：\n• 检查任务是否创建成功\n• 尝试重新创建任务\n• 确认任务ID是否正确`,
          error: errMsg,
          taskId: trimmedTaskId,
        });
      }
      
      // 检查认证错误
      if (response.status === 401 || response.status === 403) {
        return res.json({
          success: false,
          message: 'API Key 无效或已过期，请到云雾AI 令牌管理 检查并更换',
        });
      }
      
      // 检查配额/余额不足错误
      if (/insufficient quota|quota.*exceeded|余额不足|配额不足|insufficient balance|balance.*insufficient/i.test(errMsgLower)) {
        return res.json({
          success: false,
          message: 'API 配额不足或余额不足。\n\n解决方案：\n1. 访问 https://yunwu.ai/topup 进入余额管理\n2. 充值账户余额\n3. 确认令牌有足够的配额后重试',
        });
      }
      
      return res.json({ success: false, message: errMsg });
    }

    // 解析任务状态（支持多种可能的字段名）
    const rawStatus = data?.status || data?.task_status || data?.state || data?.data?.status || '';
    let status = 'processing';
    let progress = data?.progress || data?.data?.progress || 0;
    
    // 提取视频URL（支持多种可能的字段名和嵌套结构）
    const videoUrl = data?.video_url || 
                     data?.url || 
                     data?.result?.video_url ||
                     data?.data?.video_url ||
                     data?.data?.url ||
                     data?.result?.url ||
                     null;

    // 标准化状态
    const statusLower = String(rawStatus).toLowerCase();
    if (['succeed', 'succeeded', 'success', 'completed', 'done', 'finish', 'finished'].includes(statusLower)) {
      status = 'completed';
      progress = 100;
    } else if (['failed', 'error', 'failure', 'fail'].includes(statusLower)) {
      status = 'failed';
    } else if (['processing', 'pending', 'in_progress', 'waiting', 'queued', 'running'].includes(statusLower)) {
      status = 'processing';
      // 如果有进度信息，使用它；否则根据状态估算
      if (progress === 0 && statusLower === 'processing') {
        progress = 50; // 默认进度
      }
    }

    // 提取错误信息
    const errMsg = data?.error || 
                   data?.error_message || 
                   data?.message || 
                   data?.data?.error ||
                   data?.data?.error_message ||
                   null;

    console.log('云雾数字人任务查询成功:', {
      taskId: trimmedTaskId,
      status,
      progress,
      hasVideoUrl: !!videoUrl,
      hasError: !!errMsg,
    });

    // 返回成功响应
    res.json({
      success: true,
      taskId: trimmedTaskId,
      id: trimmedTaskId, // 兼容字段
      status,
      progress,
      videoUrl,
      error: errMsg,
      data,
    });
  } catch (error) {
    console.error('云雾任务查询错误:', error);
    res.json({
      success: false,
      message: error.message || '查询云雾任务状态时发生错误',
    });
  }
});

// ========== 统一数字人创建/查询接口 ==========
// 创建数字人任务（统一入口）：API Key 由服务器从登录用户解析（管理员分配）
router.post('/digital-human/create', resolveDigitalHumanKeys, async (req, res) => {
  const requestStartTime = new Date().toISOString();
  console.log('=== 开始处理统一数字人创建请求 ===');
  console.log('请求时间:', requestStartTime);
  console.log('请求IP:', req.ip || req.connection.remoteAddress);
  console.log('请求方法:', req.method);
  console.log('请求路径:', req.path);
  
  try {
    res.setHeader('Content-Type', 'application/json');

    const { 
      provider, 
      imageUrl, 
      text = '', 
      name = '', 
      description = '', 
      mode = 'std',
      avatarId, 
      voiceId, 
      audioId, 
      audioFile,
      prompt = ''
    } = req.body || {};

    // API Key 从服务器解析（管理员为当前用户分配）
    const apiKey = provider === 'heygen' ? req.heygenApiKey : req.yunwuApiKey;
    const maskedKey = apiKey ? `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}` : '无';
    const imageSize = imageUrl ? (typeof imageUrl === 'string' ? imageUrl.length : 0) : 0;
    const audioSize = audioFile ? (typeof audioFile === 'string' ? audioFile.length : 0) : 0;
    
    console.log('=== 统一创建请求详情 ===');
    console.log('Provider:', provider);
    console.log('API Key:', maskedKey, `(长度: ${apiKey ? apiKey.length : 0})`);
    console.log('图片信息:', {
      hasImage: !!imageUrl,
      imageType: imageUrl ? (imageUrl.startsWith('http') ? 'URL' : imageUrl.startsWith('data:') ? 'DataURL' : 'Base64') : '无',
      imageSize: imageSize > 0 ? `${(imageSize / 1024).toFixed(2)} KB` : '0 KB',
      imagePreview: imageUrl ? (imageUrl.startsWith('http') ? imageUrl.substring(0, 100) : imageUrl.substring(0, 50) + '...') : '无'
    });
    console.log('音频信息:', {
      hasAudioId: !!audioId,
      audioId: audioId || '无',
      hasAudioFile: !!audioFile,
      audioSize: audioSize > 0 ? `${(audioSize / 1024).toFixed(2)} KB` : '0 KB',
      audioPreview: audioFile ? (audioFile.startsWith('data:') ? audioFile.substring(0, 50) + '...' : audioFile.substring(0, 50) + '...') : '无'
    });
    console.log('其他参数:', {
      text: text || '无',
      textLength: text.length,
      prompt: prompt || '无',
      promptLength: prompt.length,
      name: name || '无',
      description: description || '无',
      mode: mode,
      avatarId: avatarId || '无',
      voiceId: voiceId || '无'
    });

    // ========== 参数验证 ==========
    
    // 1. 验证provider
    if (!provider) {
      return res.status(400).json({ 
        success: false, 
        message: '缺少 provider 参数' 
      });
    }
    
    if (!['heygen', 'yunwu'].includes(provider)) {
      return res.status(400).json({ 
        success: false, 
        message: 'provider 必须是 heygen 或 yunwu' 
      });
    }

    // 2. 验证API Key（由管理员在后台分配）
    if (!apiKey || apiKey.trim().length < 10) {
      return res.status(400).json({ 
        success: false, 
        message: provider === 'heygen' ? MSG_NO_HEYGEN_KEY : MSG_NO_YUNWU_KEY
      });
    }

    // 3. 验证图片
    if (!imageUrl || (typeof imageUrl === 'string' && imageUrl.trim().length === 0)) {
      console.error('图片验证失败:', { 
        hasImageUrl: !!imageUrl, 
        imageUrlType: typeof imageUrl,
        imageUrlLength: imageUrl ? imageUrl.length : 0,
        imageUrlPreview: imageUrl ? imageUrl.substring(0, 50) : '无'
      });
      return res.status(400).json({ 
        success: false, 
        message: '❌ 缺少必需参数：数字人头像图片\n\n请确保：\n1. 在步骤2中上传了数字人头像图片\n2. 图片格式正确（.jpg/.jpeg/.png）\n3. 图片大小不超过10MB\n4. 图片尺寸至少300px' 
      });
    }

    // ========== 云雾API处理 ==========
    if (provider === 'yunwu') {
      console.log('=== 处理云雾数字人创建 ===');
      
      // 云雾必须提供音频
      const hasValidAudioId = audioId && String(audioId).trim().length > 0;
      const hasValidAudioFile = audioFile && String(audioFile).trim().length > 0;
      
      console.log('音频验证详情:', {
        hasAudioId: hasValidAudioId,
        audioId: audioId ? String(audioId).substring(0, 20) + '...' : '无',
        audioIdLength: audioId ? String(audioId).length : 0,
        audioIdTrimmedLength: audioId ? String(audioId).trim().length : 0,
        hasAudioFile: hasValidAudioFile,
        audioFileType: typeof audioFile,
        audioFileIsString: typeof audioFile === 'string',
        audioFileLength: audioFile ? String(audioFile).length : 0,
        audioFileTrimmedLength: audioFile ? String(audioFile).trim().length : 0,
        audioFilePreview: audioFile ? String(audioFile).substring(0, 50) + '...' : '无',
        audioFileStartsWithData: audioFile ? String(audioFile).startsWith('data:') : false
      });
      
      if (!hasValidAudioId && !hasValidAudioFile) {
        console.error('音频验证失败: 未提供音频');
        return res.status(400).json({
          success: false,
          message: '❌ 缺少必需参数：音频文件\n\n云雾数字人必须提供音频，请：\n1. 在步骤2中上传音频文件（.mp3/.wav/.m4a/.aac）\n2. 或使用实时录制功能录制音频\n3. 音频时长：2-60秒\n4. 音频大小：≤5MB',
        });
      }
      
      if (hasValidAudioId && hasValidAudioFile) {
        console.error('音频验证失败: 同时提供了audioId和audioFile');
        return res.status(400).json({
          success: false,
          message: '❌ 参数冲突：audioId 和 audioFile 只能二选一\n\n请只提供以下之一：\n1. audioId（音频ID）\n2. audioFile（音频文件Base64）',
        });
      }

      // ❌ 只支持URL，不再支持Base64
      let safeImageUrl = typeof imageUrl === 'string' ? imageUrl.trim() : String(imageUrl || '').trim();
      
      if (safeImageUrl && (safeImageUrl.startsWith('http://') || safeImageUrl.startsWith('https://'))) {
        console.log('✅ 图片已是URL格式，直接使用');
      } else {
        // ❌ 拒绝Base64输入
        return res.status(400).json({
          success: false,
          message: '不再支持Base64格式。请使用FormData上传文件获取URL，或直接提供图片URL。'
        });
      }
      
      // ❌ 只支持URL，不再支持Base64
      let finalAudioFile = '';
      if (hasValidAudioFile) {
        let rawAudioFile = typeof audioFile === 'string' ? audioFile.trim() : String(audioFile || '').trim();
        
        if (rawAudioFile && (rawAudioFile.startsWith('http://') || rawAudioFile.startsWith('https://'))) {
          finalAudioFile = rawAudioFile;
          console.log('✅ 音频已是URL格式，直接使用');
        } else {
          // ❌ 拒绝Base64输入
          return res.status(400).json({
            success: false,
            message: '不再支持Base64格式。请使用FormData上传文件获取URL，或直接提供音频URL。'
          });
        }
      }

      const userId = req.user && req.user.id;
      const pricing = getWalletPricing();
      const requiredAmount = pricing[OPERATION_YUNWU_DIGITAL_HUMAN] ?? 1;
      const wallet = getWallet(userId);
      if (!wallet || wallet.balance < requiredAmount) {
        return res.status(200).json({
          success: false,
          message: '余额不足，请先充值后再使用数字人创建功能',
        });
      }
      
      const requestBody = {
        // 必需参数
        image: safeImageUrl,
        
        // 音频参数（二选一）
        ...(hasValidAudioId ? { audio_id: String(audioId || '').trim() } : {}),
        ...(hasValidAudioFile ? { sound_file: finalAudioFile } : {}),
        
        // 其他必需参数
        prompt: prompt || text || '', // 使用传入的prompt或text
        mode: mode === 'standard' ? 'std' : mode, // 标准化模式参数
        // ✅ 使用部署后的URL作为callback_url（如果配置了），避免localhost导致的问题
        callback_url: process.env.CALLBACK_URL || process.env.DEPLOY_URL || '',
        external_task_id: '',
        
        // 可选参数
        ...(name ? { external_task_id: `name_${Date.now()}` } : {}) // 可选：使用name作为外部任务ID
      };

      // ✅ 增强日志：记录详细的请求信息
      const apiUrl = 'https://yunwu.ai/kling/v1/videos/avatar/image2video';
      const requestTimestamp = new Date().toISOString();
      const imageSize = requestBody.image ? (typeof requestBody.image === 'string' ? requestBody.image.length : 0) : 0;
      const audioSize = requestBody.sound_file ? (typeof requestBody.sound_file === 'string' ? requestBody.sound_file.length : 0) : 0;
      
      console.log('=== 云雾数字人API调用详情 ===');
      console.log('时间戳:', requestTimestamp);
      console.log('API端点:', apiUrl);
      console.log('请求方法: POST');
      console.log('请求头:', {
        'Authorization': `Bearer ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`,
        'Content-Type': 'application/json'
      });
      console.log('请求体摘要:', {
        imageType: requestBody.image.startsWith('http') ? 'URL' : 'Base64',
        imageSize: imageSize > 0 ? `${(imageSize / 1024).toFixed(2)} KB` : '0 KB',
        imagePreview: requestBody.image.startsWith('http') 
          ? requestBody.image.substring(0, 100) + '...' 
          : `Base64(${requestBody.image.substring(0, 50)}...)`,
        hasAudioId: !!requestBody.audio_id,
        audioId: requestBody.audio_id || '无',
        hasSoundFile: !!requestBody.sound_file,
        audioSize: audioSize > 0 ? `${(audioSize / 1024).toFixed(2)} KB` : '0 KB',
        audioPreview: requestBody.sound_file 
          ? (requestBody.sound_file.startsWith('data:') 
              ? `DataURL(${requestBody.sound_file.substring(0, 50)}...)` 
              : `Base64(${requestBody.sound_file.substring(0, 50)}...)`)
          : '无',
        prompt: requestBody.prompt || '无',
        promptLength: requestBody.prompt.length,
        mode: requestBody.mode,
        external_task_id: requestBody.external_task_id || '无'
      });

      // ✅ 修复：在try块外声明timeoutId，确保catch块可以访问
      let timeoutId = null;
      try {
        // 关键修复：直接调用云雾远程API，不要通过localhost转发
        const fetchStartTime = Date.now();
        const controller = new AbortController();
        timeoutId = setTimeout(() => controller.abort(), 60000); // 60秒超时
        
        console.log('=== 开始发送请求到云雾API ===');
        console.log('请求时间:', new Date().toISOString());
        console.log('API端点:', apiUrl);
        console.log('部署环境:', process.env.NODE_ENV || 'development');
        console.log('Callback URL:', requestBody.callback_url || '(空)');
        
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey.trim()}`,
            'Content-Type': 'application/json',
            'User-Agent': 'AI-DigitalHuman-Platform/1.0',
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal, // ✅ 使用AbortController实现超时
        });
        
        console.log('=== 云雾API请求已发送 ===');
        console.log('响应状态:', response.status, response.statusText);
        console.log('响应URL:', response.url);
        
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null; // 标记已清理
        }
        
        const fetchDuration = Date.now() - fetchStartTime;

        console.log('=== 云雾API响应详情 ===');
        console.log('响应时间:', `${fetchDuration}ms`);
        console.log('响应状态:', response.status, response.statusText);
        console.log('响应头:', Object.fromEntries(response.headers.entries()));
        
        const responseText = await response.text();
        let result;
        try {
          result = responseText ? JSON.parse(responseText) : {};
        } catch (parseError) {
          // ✅ 修复：在抛出错误前清理timeoutId
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
          console.error('=== JSON解析错误 ===');
          console.error('错误信息:', parseError.message);
          console.error('响应文本前500字符:', responseText.substring(0, 500));
          throw new Error(`API响应格式错误: ${responseText.substring(0, 200)}`);
        }

        console.log('响应体:', JSON.stringify(result, null, 2));
        console.log('响应体键:', Object.keys(result || {}));
        
        // 详细记录错误响应
        if (!response.ok) {
          console.error('=== 云雾API错误响应详情 ===');
          console.error('HTTP状态码:', response.status);
          console.error('错误代码:', result?.code || '无');
          console.error('错误消息:', result?.message || '无');
          console.error('请求ID:', result?.request_id || '无');
          console.error('错误数据:', result?.data || '无');
          console.error('完整错误响应:', JSON.stringify(result, null, 2));
          
          // ✅ 提取错误消息，保留原始错误信息
          const errorMsg = extractErrorMessage(result) || `API错误: ${response.status}`;
          
          // ✅ 使用统一的错误分析函数
          const analyzedError = analyzeYunwuApiError(response, result, response.status);
          if (analyzedError) {
            // ✅ 修复：在抛出错误前清理timeoutId
            if (timeoutId) {
              clearTimeout(timeoutId);
              timeoutId = null;
            }
            // 根据错误类型抛出相应的错误，让catch块处理
            if (analyzedError.errorCode === 'TOKEN_TYPE_ERROR') {
              throw new Error('API令牌类型错误（mistake）');
            } else if (analyzedError.errorCode === 'QUOTA_INSUFFICIENT' && analyzedError.suggestCheckToken) {
              throw new Error('账号配额不足（可能是Token类型为mistake）');
            } else {
              throw new Error(errorMsg);
            }
          }
          
          // ✅ 修复：在抛出错误前清理timeoutId
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
          throw new Error(errorMsg);
        }

        // 查询接口 GET /kling/v1/videos/avatar/image2video/{id} 的 path 参数为 id，示例 '825470997289144397'
        // 与云雾控制台/查询接口一致的「查询用 id」优先取自 data.id / id，request_id 仅作备用
        const queryId = result?.data?.id ?? result?.id ?? result?.data?.task_id ?? result?.task_id ?? null;
        const requestId = result?.request_id ?? result?.data?.request_id ?? null;
        const taskId = queryId ?? requestId;
        const altTaskId = (requestId && String(requestId) !== String(taskId)) ? requestId : null;

        if (!taskId) {
          // ✅ 修复：在抛出错误前清理timeoutId
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
          console.warn('未找到任务ID:', result);
          throw new Error('API响应中未包含任务ID');
        }

        console.log('=== 云雾数字人创建成功 ===');
        console.log('任务ID:', taskId, altTaskId ? 'altTaskId: ' + altTaskId : '');
        console.log('任务状态:', result?.status || 'processing');
        console.log('完整响应数据:', JSON.stringify(result, null, 2));

        if (!userId) {
          console.error('云雾数字人创建成功但无法扣款：缺少 userId，请确保请求带登录态');
        }
        // ✅ 只有在API调用成功且返回有效任务ID时才扣款
        const deductAmount = getDeductAmount(OPERATION_YUNWU_DIGITAL_HUMAN, result);
        console.log('=== 开始扣款流程 ===');
        console.log('云雾数字人扣款参数: userId=%s amount=%s description=%s', userId, deductAmount, '云雾数字人创建(统一接口)');
        
        let newBalance = null;
        if (!userId) {
          console.error('扣款失败: userId 为空');
        } else if (!deductAmount || deductAmount <= 0) {
          console.warn('扣款金额无效:', deductAmount);
        } else {
          newBalance = deductBalance(userId, deductAmount, '云雾数字人创建(统一接口)');
          if (newBalance == null) {
            console.warn('云雾数字人创建扣款失败（余额可能已被其他请求扣除或 userId 无效）:', userId);
          } else {
            console.log('云雾数字人扣款成功: userId=%s 扣款金额=%s 扣款后余额=%s', userId, deductAmount, newBalance);
            // 验证记录是否写入
            const records = getWalletRecords(userId, 1);
            console.log('扣款后查询记录数量:', records.length, '最近一条:', records[0] ? JSON.stringify(records[0]) : '无');
          }
        }
        
        // 获取最新钱包信息和记录
        const updatedWallet = getWallet(userId);
        const records = getWalletRecords(userId, 10);

        return res.json({
          success: true,
          provider: 'yunwu',
          taskId,
          id: taskId, // 兼容字段
          ...(altTaskId ? { altTaskId } : {}), // 查询时可作 altId 重试
          status: result?.status || 'processing',
          message: '数字人创建任务已提交',
          estimatedTime: '约2-5分钟',
          data: result,
          deducted: deductAmount,
          balance: newBalance != null ? newBalance : (updatedWallet ? updatedWallet.balance : wallet.balance),
          consumed: updatedWallet ? updatedWallet.consumed : wallet.consumed,
          records: records.slice(0, 5), // 返回最近5条记录
        });

      } catch (apiError) {
        // 清理超时定时器
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        
        console.error('=== 云雾API调用失败 ===');
        console.error('错误时间:', new Date().toISOString());
        console.error('错误消息:', apiError.message);
        console.error('错误堆栈:', apiError.stack);
        console.error('错误类型:', apiError.constructor.name);
        
        // ✅ 失败时不扣款，返回当前钱包信息
        const currentWallet = getWallet(userId);
        const records = getWalletRecords(userId, 10);
        const walletInfo = {
          balance: currentWallet ? currentWallet.balance : 0,
          consumed: currentWallet ? currentWallet.consumed : 0,
          records: records.slice(0, 5),
        };
        
        // 处理超时错误
        if (apiError.name === 'AbortError') {
          return res.status(500).json({
            success: false,
            message: '云雾数字人API请求超时（60秒），请稍后重试或检查网络连接',
            error: 'TIMEOUT',
            ...walletInfo
          });
        }
        
        // ✅ 使用统一的错误分析函数处理错误
        const errorMsg = apiError.message || '';
        const errorMsgLower = errorMsg.toLowerCase();
        
        // 检查是否为Token类型错误
        if (isTokenTypeError(errorMsg)) {
          const tokenErrorResponse = createTokenTypeErrorResponse({ statusCode: 400 });
          return res.status(tokenErrorResponse.statusCode).json({
            success: tokenErrorResponse.success,
            message: tokenErrorResponse.message,
            error: tokenErrorResponse.error,
            errorCode: tokenErrorResponse.errorCode,
            helpUrl: tokenErrorResponse.helpUrl,
            ...walletInfo
          });
        }
        
        // 检查是否为配额不足错误
        if (isQuotaError(errorMsg)) {
          // 检查错误消息中是否包含403或forbidden，这通常表示可能是Token类型问题
          const suggestCheckToken = errorMsgLower.includes('403') || 
                                    errorMsgLower.includes('forbidden') ||
                                    errorMsg.includes('可能是Token类型为mistake');
          
          const quotaErrorResponse = createQuotaErrorResponse({
            suggestCheckToken,
            statusCode: 403
          });
          
          return res.status(quotaErrorResponse.statusCode).json({
            success: quotaErrorResponse.success,
            message: quotaErrorResponse.message,
            error: quotaErrorResponse.error,
            errorCode: quotaErrorResponse.errorCode,
            helpUrl: quotaErrorResponse.helpUrl,
            suggestCheckToken: quotaErrorResponse.suggestCheckToken,
            ...walletInfo
          });
        }
        
        // ✅ 特殊处理：403 Forbidden（可能是配额、权限等问题）
        if (errorMsgLower.includes('403') || errorMsgLower.includes('forbidden')) {
          return res.status(403).json({
            success: false,
            message: `❌ 访问被拒绝 (403)\n\n错误信息：${apiError.message}\n\n可能的原因：\n1. API Key 权限不足\n2. 账号配额已用完\n3. 账户余额不足\n\n解决方案：\n1. 检查 API Key 是否正确且有足够权限\n2. 访问 https://yunwu.ai/topup 充值余额\n3. 联系云雾AI客服确认账户状态`,
            error: 'FORBIDDEN',
            errorCode: 'FORBIDDEN',
            ...walletInfo
          });
        }
        
        console.error('完整错误对象:', JSON.stringify({
          message: apiError.message,
          stack: apiError.stack,
          name: apiError.name
        }, null, 2));
        
        return res.status(500).json({
          success: false,
          ...walletInfo,
          message: `云雾数字人创建失败: ${apiError.message}`,
          error: apiError.toString()
        });
      }
    }

    // ========== HeyGen处理 ==========
    if (provider === 'heygen') {
      console.log('处理HeyGen视频创建...');
      
      // HeyGen必须提供文案
      if (!text || !text.trim()) {
        return res.status(400).json({ 
          success: false, 
          message: 'HeyGen需要文案(text)' 
        });
      }

      // ✅ 修复：验证 avatar_id（根据HeyGen官方文档，avatar_id是必需的且必须有效）
      if (!avatarId || avatarId === 'default' || avatarId === 'default_avatar_id' || avatarId.trim().length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: '请提供有效的 avatar_id。根据HeyGen API要求，必须从 /v2/avatars 接口获取真实的 avatar_id，不能使用默认值。请先调用 /api/heygen/avatars 获取可用的数字人列表并选择一个。' 
        });
      }

      // 构建HeyGen请求体
      const requestBody = {
        video_inputs: [{
          character: {
            type: 'avatar',
            avatar_id: avatarId.trim(), // ✅ 使用有效的 avatar_id
          },
          voice: {
            type: 'text',
            input_text: text.trim(),
            voice_id: voiceId || '1bd001e7e50f421d891986aad5158bc8', // 默认voice（建议也进行验证）
          },
        }],
        dimension: { width: 1280, height: 720 },
      };

      console.log('HeyGen请求体:', {
        hasAvatarId: !!avatarId,
        textLength: text.trim().length,
        voiceId: voiceId || 'default'
      });

      // ✅ 修复：在try块外声明timeoutId，确保catch块可以访问
      let timeoutId = null;
      try {
        // 关键修复：直接调用HeyGen远程API，不要通过localhost转发
        const controller = new AbortController();
        timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒超时
        
        const response = await fetch('https://api.heygen.com/v2/video/generate', {
          method: 'POST',
          headers: {
            'X-Api-Key': apiKey.trim(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal, // ✅ 使用AbortController实现超时
        });
        
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null; // 标记已清理
        }

        console.log('HeyGen API响应状态:', response.status, response.statusText);
        
        const result = await response.json();
        console.log('HeyGen API响应:', result);

        if (!response.ok) {
          // ✅ 修复：在抛出错误前清理timeoutId
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
          const errorMsg = result?.detail || result?.message || result?.error?.message || 
                          result?.error || `API错误: ${response.status}`;
          throw new Error(errorMsg);
        }

        const videoId = result?.data?.video_id || result?.video_id || result?.id;
        
        if (!videoId) {
          // ✅ 修复：在抛出错误前清理timeoutId
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
          console.warn('未找到视频ID:', result);
          throw new Error('API响应中未包含视频ID');
        }

        console.log('HeyGen视频创建成功:', { videoId });

        return res.json({
          success: true,
          provider: 'heygen',
          taskId: videoId,
          id: videoId, // 兼容字段
          status: 'created',
          message: '视频生成任务已创建',
          data: result,
        });

      } catch (apiError) {
        // ✅ 修复：清理超时定时器（确保timeoutId在作用域内）
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        
        console.error('HeyGen API调用失败:', apiError.message);
        
        // 处理超时错误
        if (apiError.name === 'AbortError') {
          return res.status(500).json({
            success: false,
            message: 'HeyGen API请求超时（30秒），请稍后重试或检查网络连接',
            error: 'TIMEOUT'
          });
        }
        
        return res.status(500).json({
          success: false,
          message: `HeyGen视频创建失败: ${apiError.message}`,
          error: apiError.toString()
        });
      }
    }

  } catch (outerError) {
    const errorTime = new Date().toISOString();
    console.error('=== 统一数字人创建接口外层错误 ===');
    console.error('错误时间:', errorTime);
    console.error('错误消息:', outerError.message);
    console.error('错误类型:', outerError.constructor.name);
    console.error('错误堆栈:', outerError.stack);
    console.error('请求体摘要:', {
      provider: req.body?.provider || '未知',
      hasApiKey: !!req.body?.apiKey,
      hasImageUrl: !!req.body?.imageUrl,
      hasAudioFile: !!req.body?.audioFile
    });
    console.error('完整错误对象:', JSON.stringify({
      message: outerError.message,
      name: outerError.name,
      stack: outerError.stack
    }, null, 2));
    
    return res.status(500).json({
      success: false,
      message: `服务器内部错误: ${outerError.message}`,
      timestamp: errorTime
    });
  }
});

// 查询数字人任务状态（统一入口）：API Key 由服务器从登录用户解析
router.get('/digital-human/task/:provider/:taskId', resolveDigitalHumanKeys, async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json');

    const { provider, taskId } = req.params;
    const apiKey = provider === 'heygen' ? req.heygenApiKey : req.yunwuApiKey;
    const altId = req.query.altId; // 可选备用ID，例如 request_id

    if (!provider || !['heygen', 'yunwu'].includes(provider)) {
      return res.json({ success: false, message: 'provider 仅支持 heygen 或 yunwu' });
    }

    if (!apiKey || !String(apiKey).trim()) {
      return res.json({
        success: false,
        message: provider === 'heygen' ? MSG_NO_HEYGEN_KEY : MSG_NO_YUNWU_KEY,
      });
    }

    if (!taskId || taskId.trim().length === 0) {
      return res.json({ success: false, message: '请提供有效的任务ID' });
    }

    console.log('统一数字人任务查询:', { provider, taskId });

    if (provider === 'yunwu') {
      // 直接调用云雾API；云雾创建成功后可能需几秒才可查询，遇 task_not_exist 时重试
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 含重试整体 60s

        const queryYunwu = async (id) => {
          const resp = await fetch(
            `https://yunwu.ai/kling/v1/videos/avatar/image2video/${encodeURIComponent(id)}`,
            {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${apiKey.trim()}`,
                'Content-Type': 'application/json',
              },
              signal: controller.signal,
            }
          );
          const data = await resp.json().catch(() => ({}));
          return { resp, data };
        };

        const isTaskNotExist = (resp, data) => {
          if (!resp) return false;
          const msg = (data?.message || data?.error || '').toLowerCase();
          return resp.status === 404 || /task.*not.*exist|任务不存在|task_not_exist|not.*found|不存在/i.test(msg);
        };

        const idsToTry = [taskId.trim()];
        if (altId && String(altId).trim() && String(altId).trim() !== taskId.trim()) {
          idsToTry.push(String(altId).trim());
        }

        let resp;
        let result;
        const maxRetries = 2;
        const retryDelayMs = 5000;

        for (const id of idsToTry) {
          resp = null;
          result = null;
          for (let attempt = 0; attempt <= maxRetries; attempt++) {
            const { resp: r, data: d } = await queryYunwu(id);
            resp = r;
            result = d;
            if (resp.ok) break;
            if (!isTaskNotExist(resp, result) || attempt === maxRetries) break;
            console.warn('云雾任务查询返回任务不存在，延迟后重试:', { id, attempt: attempt + 1, message: result?.message });
            await new Promise(r => setTimeout(r, retryDelayMs));
          }
          if (resp && resp.ok) break;
          if (idsToTry.indexOf(id) < idsToTry.length - 1) {
            console.warn('主 taskId 查询失败，尝试备用 altId:', { taskId, altId, status: resp?.status, message: result?.message });
          }
        }

        clearTimeout(timeoutId);

        if (!resp || !resp.ok) {
          const errMsg = result?.message || result?.error || `查询失败: ${resp?.status || 'unknown'}`;
          return res.json({
            success: false,
            provider: 'yunwu',
            message: errMsg.includes('task_not_exist') || /任务不存在/i.test(errMsg)
              ? `任务不存在或尚未可查询（已重试）。若云雾控制台显示创建成功，请稍后在「数字人管理」中点击「重新查询」。\n\n原始信息: ${errMsg}`
              : errMsg,
          });
        }

        // 云雾 200 但业务失败：code 非 0 且 message 含“不存在”等则按查询失败返回，避免误判为处理中
        const bodyCode = result?.code ?? result?.data?.code;
        const bodyMsg = String(result?.message ?? result?.data?.message ?? '').toLowerCase();
        if (bodyCode != null && bodyCode !== 0 && bodyCode !== 200 && /task.*not.*exist|任务不存在|not.*found|不存在/i.test(bodyMsg)) {
          return res.json({
            success: false,
            provider: 'yunwu',
            message: `任务不存在或无法查询。若控制台显示已完成，请用控制台里的「任务ID」在失败卡片中「用新ID查询」。\n\n原始: ${result?.message ?? result?.data?.message ?? ''}`,
          });
        }

        // 递归收集视频URL（参考AI创作工坊）
        function collectVideoUrls(obj, out) {
          if (!obj || typeof obj !== 'object') return;
          if (Array.isArray(obj)) {
            obj.forEach(function (x) {
              if (typeof x === 'string' && /^https?:\/\//i.test(x) && /\.(mp4|webm|mov|avi)(\?|#|$)/i.test(x)) {
                out.push(x);
              } else if (x && typeof x === 'object' && x.url && /\.(mp4|webm|mov|avi)(\?|#|$)/i.test(x.url)) {
                out.push(x.url);
              } else if (x && typeof x === 'object') {
                collectVideoUrls(x, out);
              }
            });
            return;
          }
          const urlKeys = ['video', 'url', 'videos', 'video_url', 'output_video', 'result_url', 'output_url', 'videoUrl', 'video_file', 'output_file'];
          urlKeys.forEach(function (k) {
            const v = obj[k];
            if (typeof v === 'string' && /^https?:\/\//i.test(v)) {
              // 检查是否是视频URL
              if (/\.(mp4|webm|mov|avi)(\?|#|$)/i.test(v)) {
                out.push(v);
              } else if (k === 'result_url' || k === 'url') {
                // result_url 和 url 可能是视频，先加入
                out.push(v);
              }
            } else if (Array.isArray(v)) {
              v.forEach(function (u) {
                if (typeof u === 'string' && /^https?:\/\//i.test(u) && /\.(mp4|webm|mov|avi)(\?|#|$)/i.test(u)) {
                  out.push(u);
                } else if (u && u.url && /\.(mp4|webm|mov|avi)(\?|#|$)/i.test(u.url)) {
                  out.push(u.url);
                } else if (u && typeof u === 'object') {
                  collectVideoUrls(u, out);
                }
              });
            } else if (v && typeof v === 'object') {
              collectVideoUrls(v, out);
            }
          });
          // 递归搜索所有字段
          Object.keys(obj).forEach(function (k) {
            if (k !== 'task_status' && k !== 'status' && k !== 'task_id' && k !== 'id' && k !== 'code' && k !== 'message') {
              collectVideoUrls(obj[k], out);
            }
          });
        }
        
        // 与云雾实际响应一致：多字段解析 + 状态标准化（含顶层 status/SUCCESS、data.data.task_status、data.task_result.videos[0].url）
        const rawStatus = result?.status || result?.task_status || result?.state || result?.data?.status
          || result?.data?.data?.task_status || result?.data?.task_status || result?.data?.message || '';
        let status = 'processing';
        let progress = Number(result?.progress ?? result?.data?.progress ?? result?.data?.data?.progress ?? 0) || 0;
        if (typeof result?.progress === 'string' && result.progress.includes('%')) {
          progress = Math.min(100, parseInt(result.progress, 10) || 0);
        }
        
        // 先尝试直接提取（优先级高）
        let videoUrl = result?.video_url || result?.url || result?.result?.video_url
          || result?.data?.video_url || result?.data?.url || result?.result?.url
          || result?.data?.data?.task_result?.videos?.[0]?.url || result?.data?.task_result?.videos?.[0]?.url
          || result?.data?.data?.video_url || result?.data?.data?.url || null;
        
        // 如果直接提取失败，使用递归搜索
        if (!videoUrl || !/\.(mp4|webm|mov|avi)(\?|#|$)/i.test(videoUrl)) {
          const videoUrls = [];
          collectVideoUrls(result, videoUrls);
          // 过滤出视频URL
          const filteredVideos = videoUrls.filter(url => /\.(mp4|webm|mov|avi)(\?|#|$)/i.test(url));
          if (filteredVideos.length > 0) {
            videoUrl = filteredVideos[0];
          } else if (videoUrls.length > 0) {
            // 如果没有明确的视频扩展名，使用第一个URL（可能是result_url）
            videoUrl = videoUrls[0];
          }
        }
        
        const statusLower = String(rawStatus).toLowerCase();
        if (['succeed', 'succeeded', 'success', 'completed', 'done', 'finish', 'finished'].includes(statusLower)) {
          status = 'completed';
          progress = 100;
        } else if (['failed', 'error', 'failure', 'fail'].includes(statusLower)) {
          status = 'failed';
        } else if (['processing', 'pending', 'in_progress', 'waiting', 'queued', 'running'].includes(statusLower)) {
          status = 'processing';
          if (progress === 0) progress = 50;
        }
        // 已拿到视频地址则视为完成，避免控制台已成功但响应字段不同导致一直轮询
        if (status === 'processing' && videoUrl) {
          status = 'completed';
          progress = 100;
        }

        console.log('云雾任务查询解析:', { 
          taskId, 
          rawStatus: rawStatus || '(空)', 
          status, 
          hasVideoUrl: !!videoUrl,
          videoUrl: videoUrl ? (videoUrl.length > 100 ? videoUrl.substring(0, 100) + '...' : videoUrl) : null
        });

        return res.json({
          success: true,
          provider: 'yunwu',
          taskId,
          altId: altId || null,
          status,
          progress,
          videoUrl,
          data: result,
        });
      } catch (apiError) {
        console.error('云雾任务查询API错误:', apiError);
        return res.json({
          success: false,
          provider: 'yunwu',
          message: `查询失败: ${apiError.message}`,
        });
      }
    }

    if (provider === 'heygen') {
      // 直接调用HeyGen API，不要通过localhost转发
      try {
        // HeyGen有多个可能的查询端点
        const endpoints = [
          `https://api.heygen.com/v1/video_status.get?video_id=${encodeURIComponent(taskId)}`,
          `https://api.heygen.com/v2/videos/${taskId}`,
        ];

        let response;
        let result;

        for (const endpoint of endpoints) {
          try {
            response = await fetch(endpoint, {
              method: 'GET',
              headers: {
                'X-Api-Key': apiKey,
                'Content-Type': 'application/json',
              },
              timeout: 30000,
            });

            if (response.ok) {
              result = await response.json();
              break;
            }
          } catch (e) {
            continue;
          }
        }

        if (!response || !response.ok) {
          throw new Error('无法查询HeyGen任务状态');
        }

        // 标准化响应格式
        const status = result?.data?.status || result?.status || 'processing';
        const videoUrl = result?.data?.video_url || result?.video_url || result?.data?.result_url;
        const progress = result?.data?.progress || result?.progress || 0;

        return res.json({
          success: true,
          provider: 'heygen',
          taskId,
          status,
          progress,
          videoUrl,
          data: result,
        });
      } catch (apiError) {
        console.error('HeyGen任务查询API错误:', apiError);
        return res.json({
          success: false,
          provider: 'heygen',
          message: `查询失败: ${apiError.message}`,
        });
      }
    }

  } catch (error) {
    console.error('统一数字人任务查询错误:', error);
    return res.json({
      success: false,
      message: `查询失败: ${error.message}`,
    });
  }
});

module.exports = router;
