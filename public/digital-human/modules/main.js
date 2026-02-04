/**
 * 数字人 - 主入口：设置弹窗、DOMContentLoaded 时执行 init
 * 依赖：core, config, nav, state, digital-human-cn.js（或后续拆分的 create/recite/promote/works）
 */
(function () {
  'use strict';

  function bindSettingsModal() {
    var btn = document.getElementById('dhSettingsBtn');
    var overlay = document.getElementById('dhSettingsModal');
    var closeBtn = document.getElementById('dhSettingsModalClose');
    if (!overlay) return;

    // 打开设置：显示弹窗并填充已保存的 API Key
    if (btn) {
      btn.addEventListener('click', function () {
        overlay.classList.add('active');
        var heygenKey = localStorage.getItem('heygen_api_key');
        var yunwuKey = localStorage.getItem('yunwu_api_key');
        var heygenInput = document.getElementById('heygenApiKeyModal');
        var yunwuInput = document.getElementById('yunwuApiKeyModal');
        if (heygenInput && heygenKey) heygenInput.value = heygenKey;
        if (yunwuInput && yunwuKey) yunwuInput.value = yunwuKey;
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', function () {
        overlay.classList.remove('active');
      });
    }

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) overlay.classList.remove('active');
    });
  }

  function run() {
    bindSettingsModal();
    if (typeof window.init === 'function') {
      window.init();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
