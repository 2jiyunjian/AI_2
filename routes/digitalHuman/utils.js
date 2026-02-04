/**
 * 数字人路由 - 公共工具：校验、错误处理、临时资源存储
 */

// 验证图片URL格式
function validateImageUrl(url) {
  if (!url || typeof url !== 'string') {
    return { valid: false, message: '图片URL不能为空' };
  }
  const trimmedUrl = url.trim();
  if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
    return { valid: false, message: '图片URL必须以 http:// 或 https:// 开头' };
  }
  const imageExtensions = ['.jpg', '.jpeg', '.png'];
  const urlLower = trimmedUrl.toLowerCase();
  const pathPart = urlLower.split('?')[0];
  const hasValidExtension = imageExtensions.some(ext => pathPart.endsWith(ext));
  if (!hasValidExtension) {
    return { valid: false, message: '图片URL必须以 .jpg、.jpeg 或 .png 结尾。当前URL: ' + trimmedUrl.substring(0, 100) };
  }
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
  if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
    return { valid: false, message: '音频URL必须以 http:// 或 https:// 开头' };
  }
  const audioExtensions = ['.mp3', '.wav', '.m4a', '.aac'];
  const urlLower = trimmedUrl.toLowerCase();
  const pathPart = urlLower.split('?')[0];
  const hasValidExtension = audioExtensions.some(ext => pathPart.endsWith(ext));
  if (!hasValidExtension) {
    return { valid: false, message: '音频URL必须以 .mp3、.wav、.m4a 或 .aac 结尾。当前URL: ' + trimmedUrl.substring(0, 100) };
  }
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

// ========== 云雾 API 错误检测 ==========
function isTokenTypeError(errorMessage) {
  if (!errorMessage || typeof errorMessage !== 'string') return false;
  const patterns = [
    /token.*type.*mistake/i, /type.*mistake.*token/i, /令牌类型.*mistake/i,
    /TOKEN_TYPE_ERROR/i, /类型错误.*token/i, /token.*type.*错误/i,
  ];
  return patterns.some(p => p.test(errorMessage.toLowerCase()));
}

function isQuotaError(errorMessage) {
  if (!errorMessage || typeof errorMessage !== 'string') return false;
  return /insufficient quota|余额不足|配额不足|insufficient balance/i.test(errorMessage.toLowerCase());
}

function isChannelUnavailableError(errorMessage) {
  if (!errorMessage || typeof errorMessage !== 'string') return false;
  return /no available channels|暂无可用|不支持.*数字人|可灵.*不支持/i.test(errorMessage.toLowerCase());
}

function createTokenTypeErrorResponse(options = {}) {
  const { statusCode = 400 } = options;
  return {
    success: false,
    message: '❌ API令牌类型错误。请访问 https://yunwu.ai/token 检查并修复令牌配置。',
    error: 'TOKEN_TYPE_ERROR',
    errorCode: 'TOKEN_TYPE_ERROR',
    helpUrl: 'https://yunwu.ai/token',
    statusCode,
  };
}

function createQuotaErrorResponse(options = {}) {
  const { suggestCheckToken = false, statusCode = 403 } = options;
  return {
    success: false,
    message: suggestCheckToken
      ? '❌ 账号配额不足（可能是Token类型问题）。请访问 https://yunwu.ai/token 检查。'
      : '❌ 账号配额不足。请访问 https://yunwu.ai/topup 充值。',
    error: 'QUOTA_INSUFFICIENT',
    errorCode: 'QUOTA_INSUFFICIENT',
    helpUrl: 'https://yunwu.ai/topup',
    statusCode,
  };
}

function extractErrorMessage(responseData) {
  if (!responseData) return '';
  return responseData.message || responseData.error?.message || responseData.error || responseData.detail || (typeof responseData === 'string' ? responseData : '');
}

function analyzeYunwuApiError(response, responseData, httpStatus) {
  const errorMessage = extractErrorMessage(responseData);
  if (isTokenTypeError(errorMessage)) {
    return createTokenTypeErrorResponse({ statusCode: httpStatus || 400 });
  }
  if (isQuotaError(errorMessage)) {
    const suggestCheckToken = /token.*type|type.*token|mistake|令牌类型/i.test(errorMessage) ||
      ['TOKEN_TYPE_ERROR', 'TOKEN_INVALID_TYPE'].includes(responseData?.code);
    return createQuotaErrorResponse({ suggestCheckToken, statusCode: httpStatus || 403 });
  }
  if (isChannelUnavailableError(errorMessage)) {
    return {
      success: false,
      message: '当前令牌分组不支持可灵数字人。请访问 https://yunwu.ai/token 检查。',
      error: 'CHANNEL_UNAVAILABLE',
      errorCode: 'CHANNEL_UNAVAILABLE',
      helpUrl: 'https://yunwu.ai/token',
      statusCode: httpStatus || 400,
    };
  }
  if (httpStatus === 403 && (!errorMessage || /请求失败|failed|error/i.test(errorMessage))) {
    return {
      success: false,
      message: `❌ API验证失败 (HTTP ${httpStatus})。请访问 https://yunwu.ai/token 检查令牌配置。`,
      errorCode: 'API_ERROR',
      helpUrl: 'https://yunwu.ai/token',
      statusCode: httpStatus,
    };
  }
  return null;
}

// 临时资源存储（供上传模块使用）
const tempAssetStore = new Map();
const TEMP_ASSET_MAX_ENTRIES = 80;
const TEMP_ASSET_TTL_MS = 60 * 60 * 1000;

function sweepTempAssets() {
  const now = Date.now();
  for (const [k, v] of tempAssetStore.entries()) {
    if (v && (now - (v.createdAt || 0)) > TEMP_ASSET_TTL_MS) tempAssetStore.delete(k);
  }
  while (tempAssetStore.size > TEMP_ASSET_MAX_ENTRIES) {
    let oldest = null, oldestT = Infinity;
    for (const [k, v] of tempAssetStore.entries()) {
      const t = v && v.createdAt ? v.createdAt : 0;
      if (t < oldestT) { oldestT = t; oldest = k; }
    }
    if (oldest != null) tempAssetStore.delete(oldest); else break;
  }
}

module.exports = {
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
  tempAssetStore,
  sweepTempAssets,
  TEMP_ASSET_MAX_ENTRIES,
  TEMP_ASSET_TTL_MS,
};
