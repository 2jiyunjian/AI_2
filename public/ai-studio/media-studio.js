/**
 * AI创作工坊 - 主壳：左侧垂直功能栏 + 右侧内容区（独立模块 v2.0.0）
 */
(function () {
  const STORAGE_KEY_BASE = 'media_studio_yunwu_api_base';
  const STORAGE_KEY_WORKS = 'media_studio_works';
  const WORKS_API_KEY = 'media_studio_works';

  function getToken() {
    try { return (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('token')) || ''; } catch (e) { return ''; }
  }

  function syncWorksToServer() {
    try {
      var list = window.MediaStudio.getWorks();
      fetch('/api/works/' + encodeURIComponent(WORKS_API_KEY), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ list: list })
      }).catch(function () {});
    } catch (e) {}
  }

  window.MediaStudio = {
    features: {},
    currentId: null,

    register: function (id, spec) {
      if (!id || !spec || !spec.name || typeof spec.getPanel !== 'function') return;
      this.features[id] = Object.assign({ id }, spec);
    },

    getYunwuApiBase: function () {
      try { return localStorage.getItem(STORAGE_KEY_BASE) || ''; } catch (e) { return ''; }
    },
    // 文生图等接口的 API Key 由服务器根据登录用户注入（管理员分配），前端不再配置
    getYunwuApiKey: function () {
      return getToken() ? 'SERVER' : '';
    },
    getAuthHeaders: function () {
      var t = getToken();
      return t ? { 'Authorization': 'Bearer ' + t } : {};
    },
    refreshBalance: function () {
      var el = document.getElementById('studioBalance');
      if (!el) return;
      var headers = this.getAuthHeaders();
      if (!headers.Authorization) {
        el.textContent = '';
        el.style.display = 'none';
        return;
      }
      fetch('/api/wallet', { headers: headers })
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (d && d.balance != null) {
            el.textContent = '余额: \u26a1 ' + (Number(d.balance)).toFixed(2);
            el.style.display = '';
          } else {
            el.textContent = '';
            el.style.display = 'none';
          }
        })
        .catch(function () {
          el.textContent = '';
          el.style.display = 'none';
        });
    },
    setYunwuConfig: function (base, apiKey) {
      try {
        if (base != null) localStorage.setItem(STORAGE_KEY_BASE, String(base).trim());
        // apiKey 不再保存，由管理员在后台分配
      } catch (e) {}
    },
    isLocalhost: function () {
      try {
        var origin = window.location.origin || '';
        return /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/i.test(origin);
      } catch (e) { return false; }
    },
    isLocalhostUrl: function (url) {
      if (!url || typeof url !== 'string') return false;
      return /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?/i.test(url);
    },
    chooseUrlOrBase64: function (url, base64, hasDeployUrl) {
      hasDeployUrl = hasDeployUrl || false;
      if (!url && !base64) return '';
      var isLocal = this.isLocalhostUrl(url);
      if (isLocal && !hasDeployUrl && base64) {
        return { type: 'base64', value: base64 };
      }
      if (url && (!isLocal || hasDeployUrl)) {
        return { type: 'url', value: url };
      }
      if (base64) {
        return { type: 'base64', value: base64 };
      }
      if (url) {
        return { type: 'url', value: url };
      }
      return '';
    },
    getWorks: function () {
      try {
        var raw = localStorage.getItem(STORAGE_KEY_WORKS);
        return raw ? JSON.parse(raw) : [];
      } catch (e) { return []; }
    },
    addWork: function (item) {
      var list = this.getWorks();
      item.id = item.id || 'w_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
      item.createdAt = item.createdAt || new Date().toISOString();
      list.unshift(item);
      try {
        localStorage.setItem(STORAGE_KEY_WORKS, JSON.stringify(list.slice(0, 500)));
        syncWorksToServer();
      } catch (e) {}
      return item.id;
    },
    updateWork: function (workId, updates) {
      var list = this.getWorks();
      var i = list.findIndex(function (w) { return w.id === workId; });
      if (i < 0) return;
      var w = list[i];
      Object.keys(updates || {}).forEach(function (k) { w[k] = updates[k]; });
      list[i] = w;
      try {
        localStorage.setItem(STORAGE_KEY_WORKS, JSON.stringify(list.slice(0, 500)));
        syncWorksToServer();
      } catch (e) {}
    },
    syncWorksToServer: syncWorksToServer
  };

  // 设置功能已移至右上角，不再在侧边栏显示
  // editimg（多图参考生图）已集成到 text2img（生成图像）中
  // img2video（图生视频）已集成到 text2video（生成视频）中
  // works（作品管理）已移至右侧面板，不再在左侧菜单显示
  var featureOrder = ['text2img', 'text2video', 'lipsync', 'dubbing'];

  function renderSidebar() {
    var nav = document.getElementById('studioNav');
    if (!nav) return;
    var html = '';
    featureOrder.forEach(function (id) {
      var f = window.MediaStudio.features[id];
      if (!f) return;
      var cls = 'studio-nav-item';
      // 使用 div 而不是 a 标签，避免浏览器显示链接地址
      html += '<div class="' + cls + '" data-id="' + id + '">' +
        '<span class="studio-nav-icon">' + (f.icon || '📌') + '</span>' +
        '<span class="studio-nav-text">' + f.name + '</span></div>';
    });
    nav.innerHTML = html;

    nav.querySelectorAll('.studio-nav-item').forEach(function (el) {
      el.addEventListener('click', function (e) {
        e.preventDefault();
        var id = el.getAttribute('data-id');
        if (id) switchFeature(id);
      });
    });
  }

  function switchFeature(id) {
    // 如果点击的是作品管理，不切换主内容区（因为它在右侧面板）
    if (id === 'works') {
      initWorksPanel();
      return;
    }
    var f = window.MediaStudio.features[id];
    if (!f) return;
    window.MediaStudio.currentId = id;
    document.querySelectorAll('.studio-nav-item').forEach(function (el) {
      el.classList.toggle('active', el.getAttribute('data-id') === id);
    });
    var container = document.getElementById('featureContent');
    if (!container) return;
    var inner = container.querySelector('.studio-content-inner');
    if (!inner) {
      inner = document.createElement('div');
      inner.className = 'studio-content-inner';
      container.appendChild(inner);
    }
    inner.innerHTML = typeof f.getPanel === 'function' ? f.getPanel() : '';
    if (typeof f.init === 'function') f.init(inner);
    if (window.location.hash !== '#' + id) {
      try { window.history.replaceState(null, '', '#' + id); } catch (e) {}
    }
    // 确保主内容区进入视口（从作品管理点击编辑/重新生成时用户能看到正确页面）
    if (container && container.scrollIntoView) {
      try { container.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (e) {}
    }
  }
  
  // 导出switchFeature供works.js使用
  window.MediaStudio.switchFeature = switchFeature;

  function initWorksPanel() {
    var worksFeature = window.MediaStudio.features['works'];
    if (!worksFeature) return;
    var panel = document.getElementById('studioWorksPanel');
    if (!panel) return;
    var inner = panel.querySelector('.studio-works-panel-inner');
    if (!inner) return;
    inner.innerHTML = typeof worksFeature.getPanel === 'function' ? worksFeature.getPanel() : '';
    if (typeof worksFeature.init === 'function') worksFeature.init(inner);
  }

  function getInitialId() {
    var hash = (window.location.hash || '').replace(/^#/, '');
    // 如果hash是settings或works，跳转到第一个功能
    if (hash === 'settings' || hash === 'works') hash = '';
    if (hash && window.MediaStudio.features[hash]) return hash;
    return featureOrder[0];
  }

  function boot() {
    if (window.MediaStudio && typeof window.MediaStudio.refreshBalance === 'function') {
      window.MediaStudio.refreshBalance();
    }
    // 从服务端拉取作品列表并与本地合并，避免覆盖掉刚创建未同步的任务
    try {
      var localList = window.MediaStudio.getWorks();
      fetch('/api/works/' + encodeURIComponent(WORKS_API_KEY))
        .then(function (r) { return r.json(); })
        .then(function (d) {
          var serverList = (d && d.success && Array.isArray(d.list)) ? d.list : [];
          var serverIds = {};
          serverList.forEach(function (w) { serverIds[w.id] = true; });
          // 本地有但服务端没有的（刚创建或未同步成功的）保留到列表前面
          var localOnly = localList.filter(function (w) { return w.id && !serverIds[w.id]; });
          var merged = localOnly.concat(serverList);
          if (merged.length > 0) {
            try {
              localStorage.setItem(STORAGE_KEY_WORKS, JSON.stringify(merged.slice(0, 500)));
              if (window.MediaStudio.refreshWorksList) window.MediaStudio.refreshWorksList();
            } catch (e) {}
          }
        })
        .catch(function () {});
    } catch (e) {}
    // 延迟执行以确保所有脚本都已加载并注册
    // 使用 requestAnimationFrame 确保 DOM 已准备好，然后再延迟一点确保所有脚本都执行完成
    requestAnimationFrame(function() {
      setTimeout(function() {
        renderSidebar();
        initWorksPanel(); // 初始化右侧作品展示区
        var id = getInitialId();
        switchFeature(id);
      }, 100);
    });
    window.addEventListener('hashchange', function () {
      var id2 = (window.location.hash || '').replace(/^#/, '');
      if (id2 && window.MediaStudio.features[id2]) switchFeature(id2);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    setTimeout(boot, 0);
  }
})();
