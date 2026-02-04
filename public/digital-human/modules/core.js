/**
 * 数字人 - 核心模块：API 基础 URL、压缩、登录检查
 */
(function () {
  'use strict';

  function getApiBaseUrl() {
    try {
      const customBaseUrl = localStorage.getItem('api_base_url');
      if (customBaseUrl && customBaseUrl.trim()) {
        return customBaseUrl.trim().replace(/\/+$/, '');
      }
    } catch (e) {
      console.warn('无法读取 api_base_url 配置:', e);
    }
    const useLocal = localStorage.getItem('use_local') === 'true';
    const currentOrigin = window.location.origin;
    const isLocalhost = currentOrigin.includes('localhost') || currentOrigin.includes('127.0.0.1');
    if (useLocal || isLocalhost) return '';
    return currentOrigin;
  }

  function buildApiUrl(path) {
    const baseUrl = getApiBaseUrl();
    const normalizedPath = path.startsWith('/') ? path : '/' + path;
    return baseUrl + normalizedPath;
  }

  function compressImageForStorage(dataUrlOrBase64, maxWidth, quality) {
    maxWidth = maxWidth || 640;
    quality = quality == null ? 0.75 : Math.min(1, Math.max(0, quality));
    var str = String(dataUrlOrBase64 || '').trim();
    if (!str) return Promise.resolve('');
    var dataUrl = str.indexOf('data:') === 0 ? str : ('data:image/png;base64,' + str);
    return new Promise(function (resolve) {
      var img = new Image();
      img.onload = function () {
        try {
          var w = img.naturalWidth || img.width;
          var h = img.naturalHeight || img.height;
          if (w > maxWidth || h > maxWidth) {
            if (w > h) {
              h = Math.round(h * maxWidth / w);
              w = maxWidth;
            } else {
              w = Math.round(w * maxWidth / h);
              h = maxWidth;
            }
          }
          var canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          var ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(str.indexOf(',') >= 0 ? str.slice(str.indexOf(',') + 1) : str);
            return;
          }
          ctx.drawImage(img, 0, 0, w, h);
          var out = canvas.toDataURL('image/jpeg', quality);
          resolve(out.indexOf(',') >= 0 ? out.slice(out.indexOf(',') + 1) : out);
        } catch (e) {
          resolve(str.indexOf(',') >= 0 ? str.slice(str.indexOf(',') + 1) : str);
        }
      };
      img.onerror = function () {
        resolve(str.indexOf(',') >= 0 ? str.slice(str.indexOf(',') + 1) : str);
      };
      img.crossOrigin = 'anonymous';
      img.src = dataUrl;
    });
  }

  // 登录检查：未登录时跳转登录页，并带上当前路径以便登录后回到国内/国际数字人原页面
  var user = JSON.parse(sessionStorage.getItem('user'));
  if (!user) {
    var path = window.location.pathname + window.location.search;
    var returnUrl = path ? '?returnUrl=' + encodeURIComponent(path) : '';
    window.location.href = '/' + returnUrl;
  }

  window.getApiBaseUrl = getApiBaseUrl;
  window.buildApiUrl = buildApiUrl;
  window.compressImageForStorage = compressImageForStorage;
})();
