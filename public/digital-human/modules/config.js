/**
 * 数字人 - 配置模块：API Key 仅从服务端获取（管理员分配），用户不可自行配置
 * 依赖：core.js (buildApiUrl)
 */
(function () {
  'use strict';

  var serverKeysFetched = false;

  function buildApiUrl(path) {
    if (typeof window !== 'undefined' && window.buildApiUrl) return window.buildApiUrl(path);
    return '/api' + (path.charAt(0) === '/' ? path : '/' + path);
  }

  function getAuthHeaders() {
    try {
      var token = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('token');
      if (token) return { 'Authorization': 'Bearer ' + token };
    } catch (e) {}
    return {};
  }

  // 从服务端拉取当前用户可用的 API Key（管理员配置或默认），并写入 localStorage
  function fetchAndApplyServerApiKeys() {
    if (serverKeysFetched) return;
    try {
      var token = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('token');
      if (!token) return;
    } catch (e) { return; }
    serverKeysFetched = true;
    fetch(buildApiUrl('/api/config/api-keys'), { headers: getAuthHeaders() })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data.success && data !== null) {
          if (data.heygen && data.heygen.trim()) localStorage.setItem('heygen_api_key', data.heygen.trim());
          if (data.yunwu && data.yunwu.trim()) localStorage.setItem('yunwu_api_key', data.yunwu.trim());
        }
      })
      .catch(function () {});
  }

  // 仅使用服务端下发的 Key（管理员分配），不再读取用户输入
  function getHeyGenApiKey() {
    fetchAndApplyServerApiKeys();
    try {
      var key = localStorage.getItem('heygen_api_key');
      if (key && key.trim()) return key.trim();
    } catch (e) {}
    return '';
  }

  function getYunwuApiKey() {
    fetchAndApplyServerApiKeys();
    try {
      var key = localStorage.getItem('yunwu_api_key');
      if (key && key.trim()) return key.trim();
    } catch (e) {}
    return '';
  }

  function showStatus(elId, message, type) {
    var el = document.getElementById(elId);
    if (!el) return;
    el.textContent = message;
    el.style.display = 'block';
    el.className = type === 'error' ? 'error' : type === 'success' ? 'success' : type === 'warning' ? 'warning' : '';
  }

  // 用户不可自行保存 API Key，仅提示由管理员分配
  function saveHeyGenConfig() {
    showStatus('heygenStatus', 'API Key 由管理员在后台分配，无需在此配置。请先登录后使用。', 'warning');
  }

  function saveYunwuConfig() {
    showStatus('yunwuStatus', 'API Key 由管理员在后台分配，无需在此配置。请先登录后使用。', 'warning');
  }

  // 测试连接：使用当前登录用户的管理员分配 Key（请求不带 apiKey，服务端根据 token 解析）
  async function testHeyGenApi() {
    showStatus('heygenStatus', '⏳ 正在测试连接...', 'warning');
    try {
      var response = await fetch(buildApiUrl('/api/heygen/test'), {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, getAuthHeaders()),
        body: JSON.stringify({})
      });
      var result = await response.json().catch(function () { return { success: false, message: '响应格式错误' }; });
      if (result.success) {
        showStatus('heygenStatus', '✅ ' + (result.message || '连接成功'), 'success');
      } else {
        showStatus('heygenStatus', '❌ ' + (result.message || '连接失败'), 'error');
      }
    } catch (error) {
      showStatus('heygenStatus', '❌ 网络错误: ' + (error.message || String(error)), 'error');
    }
  }

  async function testYunwuApi() {
    showStatus('yunwuStatus', '⏳ 正在测试连接...', 'warning');
    try {
      var response = await fetch(buildApiUrl('/api/yunwu/test'), {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, getAuthHeaders()),
        body: JSON.stringify({})
      });
      var result = await response.json().catch(function () { return { success: false, message: '响应格式错误' }; });
      if (result.success) {
        showStatus('yunwuStatus', '✅ ' + (result.message || '连接成功'), 'success');
      } else {
        showStatus('yunwuStatus', '❌ ' + (result.message || '连接失败'), 'error');
      }
    } catch (error) {
      showStatus('yunwuStatus', '❌ 网络错误: ' + (error.message || String(error)), 'error');
    }
  }

  if (typeof window !== 'undefined') {
    window.getHeyGenApiKey = getHeyGenApiKey;
    window.getYunwuApiKey = getYunwuApiKey;
    window.getAuthHeaders = getAuthHeaders;
    window.saveHeyGenConfig = saveHeyGenConfig;
    window.saveYunwuConfig = saveYunwuConfig;
    window.testHeyGenApi = testHeyGenApi;
    window.testYunwuApi = testYunwuApi;
    window.showStatus = showStatus;
    window.fetchAndApplyServerApiKeys = fetchAndApplyServerApiKeys;
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('token')) fetchAndApplyServerApiKeys();
  }
})();
