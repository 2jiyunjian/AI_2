const express = require('express');
const https = require('https');
const http = require('http');

const router = express.Router();

// AI模型配置
const AI_MODELS = {
  groq: {
    name: 'Groq (免费)',
    baseUrl: 'https://api.groq.com/openai/v1/chat/completions',
    defaultModel: 'llama-3.3-70b-versatile',
    models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768', 'gemma2-9b-it'],
    free: true,
  },
  openai: {
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1/chat/completions',
    defaultModel: 'gpt-3.5-turbo',
    models: ['gpt-4o', 'gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  },
  claude: {
    name: 'Claude',
    baseUrl: 'https://api.anthropic.com/v1/messages',
    defaultModel: 'claude-3-sonnet-20240229',
    models: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
  },
  deepseek: {
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1/chat/completions',
    defaultModel: 'deepseek-chat',
    models: ['deepseek-chat', 'deepseek-coder'],
  },
  moonshot: {
    name: 'Kimi/Moonshot',
    baseUrl: 'https://api.moonshot.cn/v1/chat/completions',
    defaultModel: 'moonshot-v1-8k',
    models: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'],
  },
  qianwen: {
    name: '通义千问',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    defaultModel: 'qwen-turbo',
    models: ['qwen-max', 'qwen-plus', 'qwen-turbo'],
  },
  glm: {
    name: '智谱AI/GLM',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    defaultModel: 'glm-4-flash',
    models: ['glm-4-plus', 'glm-4-0520', 'glm-4', 'glm-4-flash', 'glm-4-air', 'glm-4-airx', 'glm-4-long', 'glm-3-turbo'],
  },
  yunwu: {
    name: '云雾AI',
    baseUrl: 'https://yunwu.ai/v1/chat/completions',
    defaultModel: 'yunwu',
    models: ['yunwu'],
  },
  heygen: {
    name: 'HeyGen',
    baseUrl: 'https://api.heygen.com/v1/chat/completions', // 注意：HeyGen主要用于数字人生成，可能不支持标准聊天API
    defaultModel: 'heygen',
    models: ['heygen'],
  },
};

// HTTP请求辅助函数（带重试机制）
function makeHttpRequest(options, body, retries = 2) {
  return new Promise((resolve, reject) => {
    const attempt = (attemptNumber) => {
      const protocol = options.port === 443 ? https : http;

      // 添加 keep-alive 和其他优化选项
      const requestOptions = {
        ...options,
        timeout: 90000,
        headers: {
          ...options.headers,
          Connection: 'keep-alive',
        },
      };

      const req = protocol.request(requestOptions, (response) => {
        let data = '';

        response.on('data', chunk => {
          data += chunk;
        });

        response.on('end', () => {
          try {
            const jsonData = JSON.parse(data);

            if (response.statusCode >= 400) {
              // 记录详细的错误信息
              const errorMsg = jsonData.error?.message || jsonData.message || `HTTP ${response.statusCode}`;
              const errorWithStatus = `HTTP ${response.statusCode}: ${errorMsg}`;
              console.error('API返回错误:', {
                statusCode: response.statusCode,
                error: jsonData.error,
                message: jsonData.message,
                fullResponse: jsonData
              });
              reject(new Error(errorWithStatus));
            } else {
              resolve(jsonData);
            }
          } catch (e) {
            console.error('解析响应失败:', {
              error: e.message,
              responseData: data.substring(0, 500),
              statusCode: response.statusCode
            });
            reject(new Error(`解析响应失败 (HTTP ${response.statusCode}): ${data.substring(0, 200)}`));
          }
        });
      });

      req.on('error', (error) => {
        console.error(`请求错误 (尝试 ${attemptNumber + 1}/${retries + 1}):`, error.message);
        console.error('错误详情:', {
          code: error.code,
          message: error.message,
          stack: error.stack
        });

        // 对于连接错误，尝试重试
        if (
          attemptNumber < retries &&
          (error.code === 'ECONNRESET' ||
            error.code === 'EPIPE' ||
            error.message.includes('socket hang up'))
        ) {
          console.log(`正在重试... (${attemptNumber + 2}/${retries + 1})`);
          setTimeout(() => attempt(attemptNumber + 1), 1000);
        } else {
          reject(error);
        }
      });

      req.setTimeout(90000, () => {
        req.destroy();
        if (attemptNumber < retries) {
          console.log(`请求超时，正在重试... (${attemptNumber + 2}/${retries + 1})`);
          setTimeout(() => attempt(attemptNumber + 1), 1000);
        } else {
          reject(new Error('请求超时'));
        }
      });

      req.write(body);
      req.end();
    };

    attempt(0);
  });
}

// 获取支持的AI模型列表
router.get('/ai/models', (req, res) => {
  const modelList = Object.entries(AI_MODELS).map(([id, config]) => ({
    id,
    name: config.name,
    models: config.models,
    defaultModel: config.defaultModel,
  }));
  res.json({ success: true, models: modelList });
});

// AI聊天接口
router.post('/ai/chat', async (req, res) => {
  try {
    const { platform, apiKey, model, messages, systemPrompt, temperature = 0.7, maxTokens = 2048 } = req.body;

    if (!platform || !apiKey) {
      return res.status(400).json({ success: false, message: '请提供平台和API Key' });
    }

    const platformConfig = AI_MODELS[platform];
    if (!platformConfig) {
      return res.status(400).json({ success: false, message: '不支持的AI平台' });
    }

    const selectedModel = model || platformConfig.defaultModel;

    // 构建请求
    let requestBody;
    let headers;

    if (platform === 'claude') {
      // Claude API 格式
      headers = {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      };
      requestBody = JSON.stringify({
        model: selectedModel,
        max_tokens: maxTokens,
        system: systemPrompt || 'You are a helpful assistant.',
        messages: messages.map(m => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
        })),
      });
    } else if (platform === 'heygen') {
      // HeyGen API 格式（主要用于数字人生成，聊天API可能不支持）
      headers = {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      };
      const fullMessages = [];
      if (systemPrompt) {
        fullMessages.push({ role: 'system', content: systemPrompt });
      }
      fullMessages.push(...messages);
      requestBody = JSON.stringify({
        model: selectedModel,
        messages: fullMessages,
        temperature: parseFloat(temperature),
        max_tokens: parseInt(maxTokens, 10),
        stream: false,
      });
    } else {
      // OpenAI 兼容格式
      headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      };

      const fullMessages = [];
      if (systemPrompt) {
        fullMessages.push({ role: 'system', content: systemPrompt });
      }
      fullMessages.push(...messages);

      requestBody = JSON.stringify({
        model: selectedModel,
        messages: fullMessages,
        temperature: parseFloat(temperature),
        max_tokens: parseInt(maxTokens, 10),
        stream: false,
      });
    }

    // 发送请求到AI平台
    const url = new URL(platformConfig.baseUrl);
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers,
    };

    const aiResponse = await makeHttpRequest(options, requestBody);

    // 解析响应
    let assistantMessage;
    if (platform === 'claude') {
      assistantMessage = aiResponse.content?.[0]?.text || '抱歉，我无法生成回复。';
    } else {
      assistantMessage = aiResponse.choices?.[0]?.message?.content || '抱歉，我无法生成回复。';
    }

    res.json({
      success: true,
      message: assistantMessage,
      usage: aiResponse.usage || null,
    });
  } catch (error) {
    console.error('AI聊天错误:', error);
    console.error('错误详情:', {
      message: error.message,
      stack: error.stack,
      platform: req.body?.platform,
      model: req.body?.model
    });

    // 解析错误信息
    let errorMessage = '调用AI服务失败';
    let errorType = 'unknown';

    if (error.message) {
      const msg = error.message.toLowerCase();
      
      // 提取HTTP状态码
      const httpStatusMatch = error.message.match(/http (\d+)/i);
      const httpStatus = httpStatusMatch ? parseInt(httpStatusMatch[1]) : null;

      if (msg.includes('insufficient') || msg.includes('balance') || msg.includes('quota') || msg.includes('exceeded')) {
        errorMessage =
          '💰 API账户余额不足\n\n您的AI平台账户余额已用完，请前往对应平台充值后再试。\n\n常见充值入口：\n• OpenAI: platform.openai.com/account/billing\n• DeepSeek: platform.deepseek.com\n• 通义千问: dashscope.console.aliyun.com';
        errorType = 'balance';
      } else if (
        msg.includes('expired') ||
        msg.includes('token has expired') ||
        msg.includes('token expired')
      ) {
        errorMessage =
          '⏰ API Key 已过期\n\n您的API Key已过期，请前往对应平台重新获取新的API Key。\n\n常见获取入口：\n• OpenAI: platform.openai.com/api-keys\n• Groq: console.groq.com/keys\n• DeepSeek: platform.deepseek.com/api_keys\n• 通义千问: dashscope.console.aliyun.com/apiKey\n• 智谱AI: open.bigmodel.cn/usercenter/apikeys\n\n获取后请更新您的API Key配置。';
        errorType = 'expired';
      } else if (
        httpStatus === 401 ||
        msg.includes('unauthorized') ||
        (msg.includes('invalid') && msg.includes('key')) ||
        msg.includes('authentication')
      ) {
        errorMessage =
          '🔑 API Key 无效\n\n可能的原因：\n• API Key 格式不正确（Groq的Key应以gsk_开头）\n• API Key 已过期或被禁用\n• 复制时包含了多余空格\n\n请重新获取并配置正确的API Key。';
        errorType = 'auth';
      } else if (httpStatus === 429 || msg.includes('rate') || msg.includes('limit')) {
        errorMessage = '⏱️ 请求过于频繁\n\n请稍等片刻后再试，或升级您的API套餐。';
        errorType = 'rate_limit';
      } else if (
        (msg.includes('no available channels') || msg.includes('channel unavailable')) &&
        !msg.includes('解析响应失败')
      ) {
        // 云雾AI特定的错误处理
        if (req.body?.platform === 'yunwu' || msg.includes('yunwu') || msg.includes('group')) {
          errorMessage =
            '🚫 云雾AI服务通道不可用\n\n当前Token分组中没有可用的服务通道处理您的请求。\n\n可能原因：\n• Token分组（Group）配置不正确\n• 该分组不包含聊天API服务\n• 服务通道暂时繁忙或不可用\n\n解决方案：\n1. 访问 https://yunwu.ai/token 检查Token配置\n2. 确保Token的分组（Group）包含聊天API服务\n3. 如果分组不正确，请创建新Token并选择正确的分组\n4. 稍等片刻后重试\n\n💡 提示：云雾AI的聊天API和数字人API可能需要不同的分组配置。';
        } else {
          // 其他平台的通用错误
          errorMessage =
            '🚫 服务暂时不可用\n\n当前没有可用的服务通道处理您的请求。\n\n可能原因：\n• 服务繁忙，所有通道都在使用中\n• 该模型暂时不可用\n• 服务正在维护\n\n建议：\n• 稍等片刻后重试\n• 尝试切换到其他AI平台或模型';
        }
        errorType = 'unavailable';
      } else if (httpStatus === 500 || httpStatus === 502 || httpStatus === 503 || msg.includes('500') || msg.includes('502') || msg.includes('503')) {
        errorMessage = `🔧 AI服务暂时不可用\n\n服务器返回错误 (HTTP ${httpStatus || '500'})，可能原因：\n• 服务器正在维护\n• 服务暂时故障\n• API端点不可用\n\n请稍后再试，或尝试切换到其他AI平台。\n\n原始错误: ${error.message.substring(0, 100)}`;
        errorType = 'server';
      } else if (msg.includes('timeout') || msg.includes('请求超时')) {
        errorMessage = '⏰ 请求超时\n\n服务器响应时间过长，请稍后再试或缩短您的问题。';
        errorType = 'timeout';
      } else if (
        msg.includes('enotfound') ||
        msg.includes('econnrefused') ||
        msg.includes('network')
      ) {
        errorMessage = '🌐 网络连接失败\n\n无法连接到AI服务，请检查您的网络连接。';
        errorType = 'network';
      } else if (
        msg.includes('socket hang up') ||
        msg.includes('econnreset') ||
        msg.includes('epipe')
      ) {
        errorMessage =
          '🔌 连接中断\n\n与AI服务的连接被断开，可能原因：\n• 网络不稳定\n• 需要科学上网访问该API\n• 服务器暂时繁忙\n\n请检查网络后重试。';
        errorType = 'connection';
      } else if (msg.includes('解析响应失败')) {
        errorMessage = `🔧 服务器响应格式错误\n\n无法解析AI服务的响应，可能原因：\n• 服务器返回了非JSON格式的响应\n• 响应数据格式不正确\n• 服务暂时异常\n\n原始错误: ${error.message}`;
        errorType = 'parse_error';
      } else {
        // 显示原始错误信息，但限制长度
        errorMessage = error.message.length > 200 
          ? error.message.substring(0, 200) + '...' 
          : error.message;
      }
    }

    res.status(500).json({ 
      success: false, 
      message: errorMessage, 
      errorType,
      originalError: process.env.NODE_ENV === 'development' ? error.message : undefined // 开发环境显示原始错误
    });
  }
});

// 流式AI聊天接口 (Server-Sent Events)
router.post('/ai/chat/stream', async (req, res) => {
  try {
    const { platform, apiKey, model, messages, systemPrompt, temperature = 0.7, maxTokens = 2048 } = req.body;

    if (!platform || !apiKey) {
      return res.status(400).json({ success: false, message: '请提供平台和API Key' });
    }

    const platformConfig = AI_MODELS[platform];
    if (!platformConfig) {
      return res.status(400).json({ success: false, message: '不支持的AI平台' });
    }

    // 设置SSE响应头
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const selectedModel = model || platformConfig.defaultModel;

    // 构建请求
    let requestBody;
    let headers;

    if (platform === 'claude') {
      headers = {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      };
      requestBody = JSON.stringify({
        model: selectedModel,
        max_tokens: maxTokens,
        stream: true,
        system: systemPrompt || 'You are a helpful assistant.',
        messages: messages.map(m => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
        })),
      });
    } else {
      headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      };

      const fullMessages = [];
      if (systemPrompt) {
        fullMessages.push({ role: 'system', content: systemPrompt });
      }
      fullMessages.push(...messages);

      requestBody = JSON.stringify({
        model: selectedModel,
        messages: fullMessages,
        temperature: parseFloat(temperature),
        max_tokens: parseInt(maxTokens, 10),
        stream: true,
      });
    }

    // 发送流式请求
    const url = new URL(platformConfig.baseUrl);
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      timeout: 120000,
      headers: {
        ...headers,
        Connection: 'keep-alive',
      },
    };

    const protocol = options.port === 443 ? https : http;

    const aiReq = protocol.request(options, (aiRes) => {
      if (aiRes.statusCode >= 400) {
        let errorData = '';
        aiRes.on('data', chunk => { errorData += chunk; });
        aiRes.on('end', () => {
          try {
            const errorJson = JSON.parse(errorData);
            let errorMsg = errorJson.error?.message || 'API调用失败';
            const msgLower = errorMsg.toLowerCase();
            
            // 优化错误信息
            if (msgLower.includes('expired') || msgLower.includes('token has expired') || msgLower.includes('token expired')) {
              errorMsg = '⏰ API Key 已过期，请重新获取并更新您的API Key配置';
            } else if (msgLower.includes('insufficient') || msgLower.includes('balance') || msgLower.includes('quota')) {
              errorMsg = '💰 API账户余额不足，请前往对应平台充值';
            } else if (msgLower.includes('401') || msgLower.includes('unauthorized') || (msgLower.includes('invalid') && msgLower.includes('key'))) {
              errorMsg = '🔑 API Key 无效，请检查并重新配置正确的API Key';
            } else if (msgLower.includes('429') || msgLower.includes('rate') || msgLower.includes('limit')) {
              errorMsg = '⏱️ 请求过于频繁，请稍后再试';
            } else if (msgLower.includes('no available channels') || msgLower.includes('channel unavailable')) {
              // 云雾AI特定的错误处理
              if (req.body?.platform === 'yunwu' || msgLower.includes('yunwu') || msgLower.includes('group')) {
                errorMsg = '🚫 云雾AI服务通道不可用 - Token分组配置可能不正确，请访问 https://yunwu.ai/token 检查配置';
              } else {
                errorMsg = '🚫 服务暂时不可用 - 当前没有可用的服务通道，请稍后重试或尝试其他模型';
              }
            }
            
            res.write(`data: ${JSON.stringify({ error: errorMsg })}\n\n`);
          } catch {
            res.write(`data: ${JSON.stringify({ error: `HTTP ${aiRes.statusCode}` })}\n\n`);
          }
          res.write('data: [DONE]\n\n');
          res.end();
        });
        return;
      }

      aiRes.on('data', (chunk) => {
        const lines = chunk.toString().split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              res.write('data: [DONE]\n\n');
              continue;
            }
            try {
              const parsed = JSON.parse(data);
              let content = '';

              if (platform === 'claude') {
                if (parsed.type === 'content_block_delta') {
                  content = parsed.delta?.text || '';
                }
              } else {
                content = parsed.choices?.[0]?.delta?.content || '';
              }

              if (content) {
                res.write(`data: ${JSON.stringify({ content })}\n\n`);
              }
            } catch {
              // 忽略解析错误
            }
          }
        }
      });

      aiRes.on('end', () => {
        res.write('data: [DONE]\n\n');
        res.end();
      });
    });

    aiReq.on('error', (error) => {
      console.error('流式请求错误:', error.message);
      let errorMsg = error.message;

      // 优化错误信息
      if (error.message.includes('socket hang up') || error.code === 'ECONNRESET') {
        errorMsg = '🔌 连接中断 - 网络不稳定或需要科学上网访问该API，请检查网络后重试';
      } else if (error.code === 'ENOTFOUND') {
        errorMsg = '🌐 无法连接到AI服务 - 请检查网络连接';
      } else if (error.code === 'ETIMEDOUT') {
        errorMsg = '⏰ 连接超时 - 请稍后重试';
      }

      res.write(`data: ${JSON.stringify({ error: errorMsg })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    });

    aiReq.setTimeout(120000, () => {
      aiReq.destroy();
      res.write(`data: ${JSON.stringify({ error: '请求超时' })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    });

    aiReq.write(requestBody);
    aiReq.end();

    // 客户端断开连接时清理
    req.on('close', () => {
      aiReq.destroy();
    });
  } catch (error) {
    console.error('流式AI聊天错误:', error);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  }
});

module.exports = router;

