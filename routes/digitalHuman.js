const express = require('express');

const router = express.Router();

// 由于本路由内部需要调用本机其他接口，这里定义内部端口（需与主服务端口一致）
const INTERNAL_PORT = process.env.PORT || 3000;

// ========== 辅助函数 ==========

// 验证图片URL格式
function validateImageUrl(url) {
  if (!url || typeof url !== 'string') {
    return { valid: false, message: '图片URL不能为空' };
  }
  
  const trimmedUrl = url.trim();
  
  // 必须是 http:// 或 https:// 开头
  if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
    return { valid: false, message: '图片URL必须以 http:// 或 https:// 开头' };
  }
  
  // 检查文件扩展名（不区分大小写）
  const imageExtensions = ['.jpg', '.jpeg', '.png'];
  const urlLower = trimmedUrl.toLowerCase();
  const hasValidExtension = imageExtensions.some(ext => {
    // 检查URL路径中是否包含扩展名（可能在查询参数之前）
    const pathPart = urlLower.split('?')[0]; // 移除查询参数
    return pathPart.endsWith(ext);
  });
  
  if (!hasValidExtension) {
    return { 
      valid: false, 
      message: '图片URL必须以 .jpg、.jpeg 或 .png 结尾。当前URL: ' + trimmedUrl.substring(0, 100) 
    };
  }
  
  // 基本URL格式验证
  try {
    new URL(trimmedUrl);
  } catch (e) {
    return { valid: false, message: '图片URL格式无效: ' + e.message };
  }
  
  return { valid: true };
}

// 验证音频URL格式
function validateAudioUrl(url) {
  if (!url || typeof url !== 'string') {
    return { valid: false, message: '音频URL不能为空' };
  }
  
  const trimmedUrl = url.trim();
  
  // 必须是 http:// 或 https:// 开头
  if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
    return { valid: false, message: '音频URL必须以 http:// 或 https:// 开头' };
  }
  
  // 检查文件扩展名（不区分大小写）
  const audioExtensions = ['.mp3', '.wav', '.m4a', '.aac'];
  const urlLower = trimmedUrl.toLowerCase();
  const hasValidExtension = audioExtensions.some(ext => {
    // 检查URL路径中是否包含扩展名（可能在查询参数之前）
    const pathPart = urlLower.split('?')[0]; // 移除查询参数
    return pathPart.endsWith(ext);
  });
  
  if (!hasValidExtension) {
    return { 
      valid: false, 
      message: '音频URL必须以 .mp3、.wav、.m4a 或 .aac 结尾。当前URL: ' + trimmedUrl.substring(0, 100) 
    };
  }
  
  // 基本URL格式验证
  try {
    new URL(trimmedUrl);
  } catch (e) {
    return { valid: false, message: '音频URL格式无效: ' + e.message };
  }
  
  return { valid: true };
}

// 统一的错误处理函数
function handleFetchError(error, defaultMessage) {
  if (error.name === 'AbortError') {
    return { message: `${defaultMessage}请求超时，请稍后重试`, code: 'TIMEOUT' };
  }
  if (error.code === 'ECONNREFUSED') {
    return { message: '无法连接到服务器，请检查网络连接', code: 'CONNECTION_REFUSED' };
  }
  if (error.code === 'ENOTFOUND') {
    return { message: '无法解析域名，请检查网络连接', code: 'DNS_ERROR' };
  }
  if (error.code === 'ETIMEDOUT') {
    return { message: '连接超时，请稍后重试', code: 'TIMEOUT' };
  }
  if (error.message && error.message.includes('fetch failed')) {
    return {
      message: '网络请求失败。可能的原因：\n1. 网络连接问题\n2. API 端点不正确\n3. 防火墙或代理设置问题',
      code: 'NETWORK_ERROR',
    };
  }
  return { message: error.message || defaultMessage, code: 'UNKNOWN' };
}

// 统一的响应解析函数
async function parseResponse(response, errorContext = '') {
  const contentType = response.headers.get('content-type') || '';
  let data;

  if (contentType.includes('application/json')) {
    data = await response.json();
  } else {
    const textResp = await response.text();
    if (!response.ok) {
      return {
        error: true,
        message: `${errorContext}请求失败 (状态码: ${response.status}): ${textResp.substring(0, 200)}`,
        status: response.status,
      };
    }
    try {
      data = JSON.parse(textResp);
    } catch {
      return {
        error: true,
        message: `${errorContext}返回了非 JSON 格式的响应 (状态码: ${response.status})`,
        status: response.status,
      };
    }
  }

  return { error: false, data, status: response.status };
}

// ========== HeyGen API ==========

// HeyGen 获取可用语音列表
router.get('/heygen/voices', async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json');

    const apiKey = req.headers['x-api-key'] || req.query.apiKey;

    if (!apiKey) {
      return res.json({ success: false, message: '请提供API Key' });
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
    const timeoutId = setTimeout(() => controller.abort(), 20000);

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
router.get('/heygen/avatars', async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json');

    const apiKey = req.headers['x-api-key'] || req.query.apiKey;

    if (!apiKey) {
      return res.json({ success: false, message: '请提供API Key' });
    }

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
router.post('/heygen/video', async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json');

    const { apiKey, avatarId, text, voiceId, imageUrl, productName, digitalHumanType, imageFile } = req.body;

    console.log('收到 HeyGen 视频创建请求:', {
      hasApiKey: !!apiKey,
      avatarId: avatarId || '未提供',
      textLength: text?.length || 0,
      voiceId: voiceId || 'default',
      hasImage: !!imageUrl,
      digitalHumanType: digitalHumanType || 'video',
    });

    if (!apiKey) {
      return res.json({ success: false, message: '请提供HeyGen API Key' });
    }

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
router.get('/heygen/task/:taskId', async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json');

    const { taskId } = req.params;
    const apiKey = req.headers['x-api-key'] || req.query.apiKey;

    if (!apiKey) {
      return res.json({ success: false, message: '请提供API Key' });
    }

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

// HeyGen API 测试端点
router.post('/heygen/test', async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json');

    const { apiKey } = req.body;

    if (!apiKey) {
      return res.status(200).json({ success: false, message: '请提供API Key' });
    }

    const trimmedKey = apiKey.trim();
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
router.post('/yunwu/digital-human', async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json');

    const { apiKey, imageUrl, text, name, description, mode, audioId, audioFile, prompt, callbackUrl, externalTaskId } = req.body;

    // 验证 API Key
    if (!apiKey) {
      return res.json({ success: false, message: '请提供云雾 API Key' });
    }

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

    // 处理 image：支持 Base64 或 URL
    // 规范：.jpg/.jpeg/.png，≤10MB，≥300px，宽高比 1:2.5~2.5:1
    let finalImage = imageUrl.trim();
    if (finalImage && (finalImage.startsWith('http://') || finalImage.startsWith('https://'))) {
      // 验证图片URL格式
      const urlValidation = validateImageUrl(finalImage);
      if (!urlValidation.valid) {
        return res.json({ success: false, message: urlValidation.message });
      }
      // URL格式正确，直接使用
    } else {
      // 处理 Base64 格式
      if (finalImage.startsWith('data:')) {
        const commaIndex = finalImage.indexOf(',');
        finalImage = commaIndex >= 0 ? finalImage.substring(commaIndex + 1) : finalImage;
      }
      // 清理空白字符
      finalImage = finalImage.replace(/[\s\n\r]/g, '');
      // 验证 base64 格式
      const base64Re = /^[A-Za-z0-9+/=]+$/;
      if (!base64Re.test(finalImage)) {
        return res.json({ success: false, message: '图片 base64 格式无效，请上传 .jpg/.jpeg/.png 格式的图片' });
      }
      // 验证文件大小（base64编码后的大小约为原文件的1.33倍）
      const maxBase64Length = 14 * 1024 * 1024; // 约14MB base64字符串（对应约10MB原始文件）
      if (finalImage.length > maxBase64Length) {
        return res.json({ 
          success: false, 
          message: '图片文件过大，请上传 ≤10MB 的图片文件。支持格式：.jpg/.jpeg/.png' 
        });
      }
    }

    // 处理 sound_file：仅当使用音频文件时
    // 规范：Base64 编码或 URL，.mp3/.wav/.m4a/.aac，≤5MB，2~60 秒
    let finalSoundFile = '';
    let finalAudioId = '';
    if (hasAudioFile) {
      let raw = String(audioFile).trim();
      
      // 如果前端传入了 data URL 格式，提取纯 base64 部分
      if (raw.startsWith('data:')) {
        const commaIndex = raw.indexOf(',');
        if (commaIndex >= 0) {
          raw = raw.substring(commaIndex + 1);
        }
      }
      
      // 清理 base64 字符串（移除空白字符）
      raw = raw.replace(/[\s\n\r]/g, '');
      
      // 验证 base64 格式
      if (!/^[A-Za-z0-9+/=]+$/.test(raw)) {
        // 如果不是 base64，可能是 URL
        if (!raw.startsWith('http://') && !raw.startsWith('https://')) {
          return res.json({ success: false, message: '音频格式无效，请上传 .mp3/.wav/.m4a/.aac 格式的音频文件（Base64 编码或 URL）' });
        }
        // 验证音频URL格式
        const urlValidation = validateAudioUrl(raw);
        if (!urlValidation.valid) {
          return res.json({ success: false, message: urlValidation.message });
        }
        finalSoundFile = raw; // URL 格式
      } else {
        // 验证音频文件大小（base64编码后的大小约为原文件的1.33倍）
        const maxBase64Length = 7 * 1024 * 1024; // 约7MB base64字符串（对应约5MB原始文件）
        if (raw.length > maxBase64Length) {
          return res.json({ 
            success: false, 
            message: '音频文件过大，请上传 ≤5MB 的音频文件。支持格式：.mp3/.wav/.m4a/.aac，时长 2~60 秒' 
          });
        }
        finalSoundFile = raw; // Base64 格式
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
    const finalCallbackUrl = (callbackUrl !== undefined && callbackUrl !== null) ? String(callbackUrl).trim() : '';
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

    try {
      response = await fetch('https://yunwu.ai/kling/v1/videos/avatar/image2video', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
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
      
      console.log('云雾数字人API错误响应:', {
        status: response.status,
        error: errMsg,
        requestBodyPreview: {
          imageType: requestBody.image?.startsWith('http') ? 'URL' : 'Base64',
          imageLen: requestBody.image?.length || 0,
          soundFileLen: requestBody.sound_file?.length || 0,
          hasAudioId: !!requestBody.audio_id,
          prompt: requestBody.prompt || '(空)',
          mode: requestBody.mode,
        }
      });
      
      // 检查配额/余额不足错误
      if (/insufficient quota|quota.*exceeded|余额不足|配额不足|insufficient balance|balance.*insufficient/i.test(errMsgLower)) {
        return res.json({
          success: false,
          message: 'API 配额不足或余额不足。\n\n解决方案：\n1. 访问 https://yunwu.ai/topup 进入余额管理\n2. 充值账户余额\n3. 确认令牌有足够的配额后重试',
        });
      }
      
      // 检查图片相关错误
      if (/image|图片|invalid.*image|image.*invalid|格式错误|格式无效/i.test(errMsgLower)) {
        return res.json({
          success: false,
          message: '图片格式或内容无效。\n\n请确保：\n1. 图片格式为 .jpg/.jpeg/.png\n2. 文件大小 ≤10MB\n3. 图片尺寸 ≥300px\n4. 图片宽高比在 1:2.5 ~ 2.5:1 之间\n5. 图片完整且未损坏',
        });
      }
      
      // 检查音频相关错误
      if (/audio|音频|sound_file|audio_id/i.test(errMsgLower)) {
        // 检查文件内容读取错误
        if (/something went wrong|get the contents|无法读取|读取文件|file.*contents|contents.*file/i.test(errMsgLower)) {
          return res.json({
            success: false,
            message: 'API无法读取音频文件内容。\n\n可能的原因：\n1. 音频文件格式或编码不被支持\n2. 文件已损坏\n3. base64编码有问题\n\n建议：\n• 尝试使用其他音频编辑工具重新保存文件\n• 确保音频文件可以正常播放\n• 尝试转换为MP3格式后重新上传',
          });
        }
        
        // 检查音频格式错误
        if (/format|格式|invalid|无效|不支持/i.test(errMsgLower)) {
          return res.json({
            success: false,
            message: '音频格式无效。\n\n请确保：\n1. 音频格式为 .mp3/.wav/.m4a/.aac\n2. 文件大小 ≤5MB\n3. 音频时长 2~60 秒\n4. 音频文件完整且未损坏\n\n如果问题仍然存在，请尝试：\n• 使用其他音频编辑工具重新保存文件\n• 检查音频文件是否可以正常播放',
          });
        }
        
        // 检查音频时长错误
        if (/duration|时长|time|seconds|秒/i.test(errMsgLower) && (/invalid|无效|不支持|too|exceed/i.test(errMsgLower))) {
          return res.json({
            success: false,
            message: '音频时长不符合要求。\n\n请确保音频时长在 2~60 秒之间。',
          });
        }
      }
      
      return res.json({ success: false, message: errMsg });
    }

    // 提取任务ID（根据API响应格式，可能在多个字段中）
    const taskId = data?.id || data?.task_id || data?.request_id || data?.external_task_id || data?.data?.id || null;
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

    // 返回成功响应
    res.json({
      success: true,
      taskId,
      id: taskId, // 兼容字段
      status: data?.status || 'processing',
      data,
    });
  } catch (error) {
    console.error('云雾数字人创建错误:', error);
    res.json({
      success: false,
      message: error.message || '云雾数字人创建时发生错误',
    });
  }
});

// 云雾数字人API测试
// 用于验证 API Key 是否有效且具备数字人接口权限
router.post('/yunwu/test', async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json');

    const { apiKey } = req.body;

    if (!apiKey) {
      return res.json({ success: false, message: '请提供云雾 API Key' });
    }

    const trimmedKey = apiKey.trim();
    if (trimmedKey.length < 10 || trimmedKey.length > 200) {
      return res.json({ success: false, message: 'API Key 格式不正确（长度应在10-200字符之间）' });
    }

    console.log('测试云雾API（仅验证数字人接口）:', { hasApiKey: true, keyLength: trimmedKey.length });

    try {
      // 使用可灵 Kling 数字人 API 探针验证
      // 发送一个测试请求，使用无效但格式正确的参数，以验证 API Key 和接口可用性
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // 20秒超时

      const avatarRes = await fetch('https://yunwu.ai/kling/v1/videos/avatar/image2video', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${trimmedKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: 'https://example.com/test.jpg', // 测试图片URL（预期会失败，但可以验证API Key）
          audio_id: '', // 空字符串，符合规范
          sound_file: '', // 空字符串，符合规范
          prompt: '', // 空字符串，符合规范
          mode: 'std',
          callback_url: '',
          external_task_id: '',
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

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
      const avErr = avData?.message || 
                    avData?.error?.message || 
                    avData?.error || 
                    avData?.detail ||
                    (typeof avData === 'string' ? avData : '');
      const avErrStr = String(avErr || '');
      const avErrLower = avErrStr.toLowerCase();

      console.log('云雾API响应:', { 
        status: avatarRes.status, 
        error: avErrStr.substring(0, 200),
        hasNoChannels: /no available channels/i.test(avErrLower)
      });

      // 优先检查配额/余额不足错误
      if (/insufficient quota|quota.*exceeded|余额不足|配额不足|insufficient balance|balance.*insufficient/i.test(avErrLower)) {
        return res.json({
          success: false,
          message: 'API 配额不足或余额不足。\n\n解决方案：\n1. 访问 https://yunwu.ai/topup 进入余额管理\n2. 充值账户余额\n3. 确认令牌有足够的配额后重试',
        });
      }

      // ✅ 优先检查令牌类型错误（mistake类型）
      if (/mistake|类型错误|token.*type|令牌类型|token.*invalid|invalid.*token/i.test(avErrLower)) {
        return res.json({
          success: false,
          message: '❌ API令牌类型错误\n\n您的API令牌类型显示为"mistake"，这表示令牌配置不正确。\n\n解决方案：\n1. 访问 https://yunwu.ai/token 进入令牌管理页面\n2. 检查当前令牌的Type是否为"mistake"\n3. 如果Type为"mistake"，请删除该令牌\n4. 创建新令牌，确保：\n   • 选择正确的分组（Group）\n   • 确保分组包含「可灵Kling」或「数字人」服务\n   • Type应该显示为正常类型（不是"mistake"）\n5. 使用新创建的令牌重新配置\n\n💡 提示：如果令牌类型显示为"mistake"，即使有余额也可能无法正常使用。',
          errorCode: 'TOKEN_TYPE_ERROR'
        });
      }
      
      // 优先检查 "No available channels" 错误（令牌分组不支持）
      if (/no available channels|暂无可用|不支持|not available|group.*不支持/i.test(avErrLower) || 
          /可灵|kling|数字人.*不支持|不支持.*数字人/i.test(avErrLower)) {
        return res.json({
          success: false,
          message: '当前令牌分组不支持可灵数字人。\n\n解决方案：\n1. 访问 https://yunwu.ai/token 进入令牌管理\n2. 新建令牌，选择包含「可灵Kling」或「数字人」的分组\n3. 使用新令牌重新测试',
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
        if (/image|图片|url|invalid|格式|格式错误/i.test(avErrLower) ||
            /audio|音频|sound_file|audio_id|时长无效|请提供有效的/i.test(avErrLower)) {
          return res.json({
            success: true,
            message: 'API Key 验证通过！数字人接口可用，可正常创建数字人视频',
          });
        }
        // 其他 400 错误
        return res.json({
          success: false,
          message: avErrStr || '数字人接口返回 400，请检查请求参数或联系云雾AI支持',
        });
      }

      if (avatarRes.ok) {
        return res.json({
          success: true,
          message: 'API Key 验证通过！已成功连接云雾AI',
        });
      }

      // 其他状态码
      return res.json({
        success: false,
        message: avErrStr || `验证未通过 (HTTP ${avatarRes.status})，请确认 API Key 正确且具备可灵数字人权限。可在云雾AI 令牌管理 中新建含「可灵Kling」分组的令牌。`,
      });
    } catch (fetchError) {
      const err = handleFetchError(fetchError, '云雾API');
      if (err.code === 'CONNECTION_REFUSED' || err.code === 'DNS_ERROR' || err.code === 'NETWORK_ERROR') {
        return res.json({
          success: false,
          message: '无法连接云雾AI服务器，请检查网络或代理',
        });
      }
      return res.json({
        success: false,
        message: `验证失败：${err.message}`,
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

// 云雾数字人任务查询（单个）
// API文档：GET https://yunwu.ai/kling/v1/videos/avatar/image2video/{id}
// 规范要求：
//   - id: 路径参数，任务ID（必需）
//   - Authorization: Bearer Token（必需）
router.get('/yunwu/task/:taskId', async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json');

    const { taskId } = req.params;
    const apiKey = req.headers['x-api-key'] || req.query.apiKey;

    // 验证 API Key
    if (!apiKey) {
      return res.json({ success: false, message: '请提供云雾 API Key' });
    }

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
    if (['succeeded', 'success', 'completed', 'done', 'finish', 'finished'].includes(statusLower)) {
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
// 创建数字人任务（统一入口）

router.post('/digital-human/create', async (req, res) => {
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
      apiKey, 
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
    } = req.body;

    // 记录请求信息（脱敏）
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

    // 2. 验证API Key
    if (!apiKey || apiKey.trim().length < 10) {
      return res.status(400).json({ 
        success: false, 
        message: '请提供有效的 API Key' 
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
      console.log('处理云雾数字人创建...');
      
      // 云雾必须提供音频
      const hasValidAudioId = audioId && String(audioId).trim().length > 0;
      const hasValidAudioFile = audioFile && String(audioFile).trim().length > 0;
      
      console.log('音频验证:', {
        hasAudioId: hasValidAudioId,
        audioId: audioId ? String(audioId).substring(0, 20) + '...' : '无',
        hasAudioFile: hasValidAudioFile,
        audioFileLength: audioFile ? String(audioFile).length : 0,
        audioFilePreview: audioFile ? String(audioFile).substring(0, 50) + '...' : '无'
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

      // 准备云雾API请求体
      // ✅ 安全处理imageUrl（防止undefined/null错误）
      let safeImageUrl = typeof imageUrl === 'string' ? imageUrl.trim() : String(imageUrl || '').trim();
      
      // 如果前端传入了 data URL 格式（data:image/...;base64,...），提取纯 base64 部分
      if (safeImageUrl.startsWith('data:')) {
        const commaIndex = safeImageUrl.indexOf(',');
        if (commaIndex >= 0) {
          safeImageUrl = safeImageUrl.substring(commaIndex + 1);
          console.log('从 data URL 提取图片 base64，原始长度:', imageUrl.length, '提取后长度:', safeImageUrl.length);
        }
      }
      
      if (!safeImageUrl || safeImageUrl.length === 0) {
        console.error('图片 base64 为空');
        return res.status(400).json({
          success: false,
          message: '❌ 图片格式错误\n\n图片 base64 编码为空，请重新上传图片文件。'
        });
      }
      
      // 处理音频文件：如果前端传入了 data URL 格式，提取纯 base64 部分
      let finalAudioFile = '';
      if (hasValidAudioFile) {
        let rawAudioFile = typeof audioFile === 'string' ? audioFile.trim() : String(audioFile || '').trim();
        
        // 如果前端传入了 data URL 格式（data:audio/...;base64,...），提取纯 base64 部分
        if (rawAudioFile.startsWith('data:')) {
          const commaIndex = rawAudioFile.indexOf(',');
          if (commaIndex >= 0) {
            finalAudioFile = rawAudioFile.substring(commaIndex + 1);
            console.log('从 data URL 提取音频 base64，原始长度:', rawAudioFile.length, '提取后长度:', finalAudioFile.length);
          } else {
            finalAudioFile = rawAudioFile;
          }
        } else {
          // 已经是纯 base64，直接使用
          finalAudioFile = rawAudioFile;
        }
        
        // 验证 base64 格式
        if (!finalAudioFile || finalAudioFile.trim().length === 0) {
          console.error('音频文件 base64 为空');
          return res.status(400).json({
            success: false,
            message: '❌ 音频文件格式错误\n\n音频文件 base64 编码为空，请重新上传音频文件。'
          });
        }
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
        callback_url: '',
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
        
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey.trim()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal, // ✅ 使用AbortController实现超时
        });
        
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
          const errorMsg = result?.message || result?.error?.message || result?.error || 
                          result?.detail || `API错误: ${response.status}`;
          
          // ✅ 特殊处理：403错误
          if (response.status === 403) {
            const errorMsgLower = errorMsg.toLowerCase();
            
            // ✅ 优先检查令牌类型错误（mistake类型）
            if (/mistake|类型错误|token.*type|令牌类型|token.*invalid|invalid.*token/i.test(errorMsgLower)) {
              // ✅ 修复：在抛出错误前清理timeoutId
              if (timeoutId) {
                clearTimeout(timeoutId);
                timeoutId = null;
              }
              throw new Error('API令牌类型错误（mistake）');
            }
            
            // ✅ 检查配额不足错误（403+配额不足很可能是Token类型为"mistake"导致）
            if (/账号配额不足|配额不足|insufficient quota|quota.*exceeded|余额不足|insufficient balance|balance.*insufficient/i.test(errorMsgLower)) {
              // ✅ 修复：在抛出错误前清理timeoutId
              if (timeoutId) {
                clearTimeout(timeoutId);
                timeoutId = null;
              }
              // 标记为可能是Token类型问题，让catch块处理时优先提示检查Token
              throw new Error('账号配额不足（可能是Token类型为mistake）');
            }
          }
          
          // ✅ 修复：在抛出错误前清理timeoutId
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
          throw new Error(errorMsg);
        }

        // 提取任务ID
        const taskId = result?.id || result?.task_id || result?.request_id || 
                      result?.data?.id || result?.data?.task_id;
        
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
        console.log('任务ID:', taskId);
        console.log('任务状态:', result?.status || 'processing');
        console.log('完整响应数据:', JSON.stringify(result, null, 2));

        return res.json({
          success: true,
          provider: 'yunwu',
          taskId,
          id: taskId, // 兼容字段
          status: result?.status || 'processing',
          message: '数字人创建任务已提交',
          estimatedTime: '约2-5分钟',
          data: result
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
        
        // 处理超时错误
        if (apiError.name === 'AbortError') {
          return res.status(500).json({
            success: false,
            message: '云雾数字人API请求超时（60秒），请稍后重试或检查网络连接',
            error: 'TIMEOUT'
          });
        }
        
        // ✅ 特殊处理：配额不足错误
        const errorMsgLower = (apiError.message || '').toLowerCase();
        
        // ✅ 优先检查令牌类型错误（mistake类型）
        if (/mistake|类型错误|token.*type|令牌类型|token.*invalid|invalid.*token/i.test(errorMsgLower)) {
          return res.status(400).json({
            success: false,
            message: '❌ API令牌类型错误\n\n您的API令牌类型显示为"mistake"，这表示令牌配置不正确。\n\n解决方案：\n1. 访问 https://yunwu.ai/token 进入令牌管理页面\n2. 检查当前令牌的Type是否为"mistake"\n3. 如果Type为"mistake"，请删除该令牌\n4. 创建新令牌，确保：\n   • 选择正确的分组（Group）\n   • 确保分组包含「可灵Kling」或「数字人」服务\n   • Type应该显示为正常类型（不是"mistake"）\n5. 使用新创建的令牌重新配置\n\n💡 提示：如果令牌类型显示为"mistake"，即使有余额也可能无法正常使用。',
            error: 'TOKEN_TYPE_ERROR',
            errorCode: 'TOKEN_TYPE_ERROR',
            helpUrl: 'https://yunwu.ai/token'
          });
        }
        
        // ✅ 特殊处理：403 + 配额不足（很可能是Token类型为"mistake"导致）
        // 注意：在catch块中，response可能未定义，所以只检查错误消息
        if ((errorMsgLower.includes('403') || errorMsgLower.includes('forbidden')) && 
            /账号配额不足|配额不足|insufficient quota|quota.*exceeded|余额不足|insufficient balance|balance.*insufficient/i.test(errorMsgLower)) {
          return res.status(403).json({
            success: false,
            message: '❌ 账号配额不足（可能是Token类型问题）\n\n⚠️ 重要提示：\n如果您的令牌Type显示为"mistake"，即使有余额也会显示"配额不足"。\n\n请按以下步骤操作：\n\n第一步：检查Token类型\n1. 访问 https://yunwu.ai/token 进入令牌管理页面\n2. 查看当前使用的Token，检查Type列\n3. 如果Type显示为"mistake"（红色/粉色标签），这是问题根源\n\n第二步：修复Token类型\n1. 删除Type为"mistake"的Token\n2. 创建新Token，确保：\n   • 选择正确的分组（Group）\n   • 确保分组包含「可灵Kling」或「数字人」服务\n   • Type应该显示为正常类型（不是"mistake"）\n3. 使用新Token重新配置\n\n第三步：检查余额（如果Token类型正常）\n1. 访问 https://yunwu.ai/topup 充值账户余额\n2. 确认Token有足够的配额\n\n💡 提示：Type为"mistake"的Token无法正常使用，必须先修复。',
            error: 'QUOTA_INSUFFICIENT',
            errorCode: 'QUOTA_INSUFFICIENT',
            helpUrl: 'https://yunwu.ai/token',
            suggestCheckToken: true  // 标记建议检查Token类型
          });
        }
        
        // 普通配额不足错误（非403）
        if (/账号配额不足|配额不足|insufficient quota|quota.*exceeded|余额不足|insufficient balance|balance.*insufficient/i.test(errorMsgLower)) {
          return res.status(403).json({
            success: false,
            message: '❌ 账号配额不足\n\n您的云雾AI账号余额或配额已用完，无法创建数字人。\n\n解决方案：\n1. 访问 https://yunwu.ai/topup 充值账户余额\n2. 确认令牌有足够的配额后重试\n\n如有疑问，请联系云雾AI客服。',
            error: 'QUOTA_INSUFFICIENT',
            errorCode: 'QUOTA_INSUFFICIENT',
            helpUrl: 'https://yunwu.ai/topup'
          });
        }
        
        // ✅ 特殊处理：403 Forbidden（可能是配额、权限等问题）
        if (errorMsgLower.includes('403') || errorMsgLower.includes('forbidden')) {
          return res.status(403).json({
            success: false,
            message: `❌ 访问被拒绝 (403)\n\n错误信息：${apiError.message}\n\n可能的原因：\n1. API Key 权限不足\n2. 账号配额已用完\n3. 账户余额不足\n\n解决方案：\n1. 检查 API Key 是否正确且有足够权限\n2. 访问 https://yunwu.ai/topup 充值余额\n3. 联系云雾AI客服确认账户状态`,
            error: 'FORBIDDEN',
            errorCode: 'FORBIDDEN'
          });
        }
        
        console.error('完整错误对象:', JSON.stringify({
          message: apiError.message,
          stack: apiError.stack,
          name: apiError.name
        }, null, 2));
        
        return res.status(500).json({
          success: false,
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

// 查询数字人任务状态（统一入口）
router.get('/digital-human/task/:provider/:taskId', async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json');

    const { provider, taskId } = req.params;
    const apiKey = req.headers['x-api-key'] || req.query.apiKey;

    if (!provider || !['heygen', 'yunwu'].includes(provider)) {
      return res.json({ success: false, message: 'provider 仅支持 heygen 或 yunwu' });
    }

    if (!apiKey) {
      return res.json({
        success: false,
        message: '请提供对应平台的 API Key（请求头 x-api-key 或查询参数 apiKey）',
      });
    }

    if (!taskId || taskId.trim().length === 0) {
      return res.json({ success: false, message: '请提供有效的任务ID' });
    }

    console.log('统一数字人任务查询:', { provider, taskId });

    if (provider === 'yunwu') {
      // 直接调用云雾API，不要通过localhost转发
      try {
        const response = await fetch(
          `https://yunwu.ai/kling/v1/videos/avatar/image2video/${encodeURIComponent(taskId)}`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            timeout: 30000,
          }
        );

        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.message || result.error || `查询失败: ${response.status}`);
        }

        // 标准化响应格式
        const status = result?.status || 'processing';
        const videoUrl = result?.video_url || result?.url || result?.data?.video_url;
        const progress = result?.progress || result?.data?.progress || 0;

        return res.json({
          success: true,
          provider: 'yunwu',
          taskId,
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
