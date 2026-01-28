/**
 * AI创作工坊 - 主壳：左侧垂直功能栏 + 右侧内容区，按功能独立文件注册
 */
(function () {
  const STORAGE_KEY_BASE = 'media_studio_yunwu_api_base';
  const STORAGE_KEY_APIKEY = 'media_studio_yunwu_api_key';
  const STORAGE_KEY_WORKS = 'media_studio_works';

  window.MediaStudio = {
    features: {},
    currentId: null,

    /** 注册功能（由各独立 JS 调用） */
    register: function (id, spec) {
      if (!id || !spec || !spec.name || typeof spec.getPanel !== 'function') return;
      this.features[id] = Object.assign({ id }, spec);
    },

    /** 云雾 API 基础地址（设置页保存） */
    getYunwuApiBase: function () {
      try { return localStorage.getItem(STORAGE_KEY_BASE) || ''; } catch (e) { return ''; }
    },
    /** 云雾 API Key（设置页保存） */
    getYunwuApiKey: function () {
      try { return localStorage.getItem(STORAGE_KEY_APIKEY) || ''; } catch (e) { return ''; }
    },
    /** 供设置页写入 */
    setYunwuConfig: function (base, apiKey) {
      try {
        if (base != null) localStorage.setItem(STORAGE_KEY_BASE, String(base).trim());
        if (apiKey != null) localStorage.setItem(STORAGE_KEY_APIKEY, String(apiKey));
      } catch (e) {}
    },
    /** 作品列表（所有功能的生成结果） */
    getWorks: function () {
      try {
        var raw = localStorage.getItem(STORAGE_KEY_WORKS);
        return raw ? JSON.parse(raw) : [];
      } catch (e) { return []; }
    },
    /** 追加一条作品 */
    addWork: function (item) {
      var list = this.getWorks();
      item.id = item.id || 'w_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
      item.createdAt = item.createdAt || new Date().toISOString();
      list.unshift(item);
      try {
        localStorage.setItem(STORAGE_KEY_WORKS, JSON.stringify(list.slice(0, 500)));
      } catch (e) {}
      return item.id;
    },
    /** 按 id 更新作品（用于轮询中更新进度、完成后写入图片） */
    updateWork: function (workId, updates) {
      var list = this.getWorks();
      var i = list.findIndex(function (w) { return w.id === workId; });
      if (i < 0) return;
      var w = list[i];
      Object.keys(updates || {}).forEach(function (k) { w[k] = updates[k]; });
      list[i] = w;
      try {
        localStorage.setItem(STORAGE_KEY_WORKS, JSON.stringify(list.slice(0, 500)));
      } catch (e) {}
    }
  };

  var featureOrder = ['settings', 'text2img', 'img2video', 'lipsync', 'dubbing', 'editimg', 'works'];

  function renderSidebar() {
    var nav = document.getElementById('studioNav');
    if (!nav) return;
    var html = '';
    featureOrder.forEach(function (id) {
      var f = window.MediaStudio.features[id];
      if (!f) return;
      var cls = 'studio-nav-item' + (id === 'settings' ? ' settings-item' : '');
      var tag = (id === 'settings' || id === 'works') ? '' : '<span class="studio-nav-tag">NEW</span>';
      html += '<a class="' + cls + '" href="#' + id + '" data-id="' + id + '">' +
        '<span class="studio-nav-icon">' + (f.icon || '📌') + '</span>' +
        '<span class="studio-nav-text">' + f.name + '</span>' + tag + '</a>';
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
  }

  function getInitialId() {
    var hash = (window.location.hash || '').replace(/^#/, '');
    if (hash && window.MediaStudio.features[hash]) return hash;
    return featureOrder[0];
  }

  function boot() {
    renderSidebar();
    var id = getInitialId();
    switchFeature(id);
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
