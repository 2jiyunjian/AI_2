/**
 * 诵读文案模块 - 仅云雾
 * 依赖：state.js, voices.js(loadCachedVoicesForContext, loadYunwuTTSVoices)
 */
(function () {
  'use strict';

  function loadReciteAvatars() {
    if (typeof window.loadMyDigitalHumans === 'function') {
      window.loadMyDigitalHumans('recite');
    }
  }

  function loadRecitePanel() {
    if (typeof selectedRecitePlatform !== 'undefined') selectedRecitePlatform = 'yunwu';
    if (typeof window.switchReciteAudioMode === 'function') {
      window.switchReciteAudioMode('upload');
    }
    loadReciteAvatars();
    if (typeof window.loadCachedVoicesForContext === 'function') {
      window.loadCachedVoicesForContext('recite');
    }
    if (typeof window.loadYunwuTTSVoices === 'function') {
      window.loadYunwuTTSVoices();
    }
    if (typeof window.initReciteVideoInputs === 'function') {
      window.initReciteVideoInputs();
    }
    if (typeof window.initReciteBottomBarSliders === 'function') {
      window.initReciteBottomBarSliders();
    }
    var scriptInputYunwu = document.getElementById('reciteScriptYunwu');
    if (scriptInputYunwu) {
      scriptInputYunwu.addEventListener('input', window.updateReciteCharCountYunwu);
      if (typeof window.updateReciteCharCountYunwu === 'function') window.updateReciteCharCountYunwu();
    }
    var yunwuSection = document.getElementById('reciteYunwuSection');
    if (yunwuSection) yunwuSection.style.display = 'block';
  }

  function switchRecitePlatform(platform) {
    if (!platform || platform !== 'yunwu') return;
    if (typeof selectedRecitePlatform !== 'undefined') selectedRecitePlatform = 'yunwu';
    loadReciteAvatars();
    var yunwuSection = document.getElementById('reciteYunwuSection');
    if (yunwuSection) yunwuSection.style.display = 'block';
  }

  function updateRecitePlatformUI(platform) {
    if (platform !== 'yunwu') return;
    var yunwuSection = document.getElementById('reciteYunwuSection');
    if (yunwuSection) yunwuSection.style.display = 'block';
    if (typeof window.loadYunwuTTSVoices === 'function') window.loadYunwuTTSVoices();
  }

  function updateReciteCharCountYunwu() {
    var text = (document.getElementById('reciteScriptYunwu') && document.getElementById('reciteScriptYunwu').value) || '';
    var count = text.length;
    var countEl = document.getElementById('reciteCharCountYunwu');
    if (countEl) {
      countEl.textContent = count;
      countEl.style.color = count > 1000 ? 'var(--error)' : 'var(--text-secondary)';
    }
  }

  if (typeof window !== 'undefined') {
    window.loadRecitePanel = loadRecitePanel;
    window.loadReciteAvatars = loadReciteAvatars;
    window.switchRecitePlatform = switchRecitePlatform;
    window.updateRecitePlatformUI = updateRecitePlatformUI;
    window.updateReciteCharCountYunwu = updateReciteCharCountYunwu;
  }
  window.dhReciteReady = true;
})();
