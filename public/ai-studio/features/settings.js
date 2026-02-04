/**
 * AI创作工坊 - 设置（独立文件）
 * 云雾 API：连接测试、保存 API Key
 */
(function () {
  var id = 'settings';
  var name = '设置';
  var icon = '⚙️';

  // 与各功能对应的云雾模型测试项
  var MODEL_ITEMS = [
    { id: 'text2img', name: '生成图像', apiPath: '/api/yunwu/images/test', method: 'POST', implemented: true },
    { id: 'text2video', name: '生成视频', apiPath: '/api/yunwu/videos/text2video/test', method: 'POST', implemented: true },
    { id: 'img2video', name: '生成视频', apiPath: '/api/yunwu/videos/image2video/test', method: 'POST', implemented: true },
    { id: 'lipsync', name: '对口型', apiPath: '/api/yunwu/videos/identify-face/test', method: 'POST', implemented: true },
    { id: 'text2audio', name: '文生音效', apiPath: '/api/yunwu/audio/text-to-audio/test', method: 'POST', implemented: true },
    { id: 'dubbing', name: '视频生音效', apiPath: '/api/yunwu/audio/video-to-audio/test', method: 'POST', implemented: true },
    { id: 'editimg', name: '多图参考生图', apiPath: '/api/yunwu/images/multi-image2image/test', method: 'POST', implemented: true }
  ];

  function createModal() {
    var modal = document.getElementById('settings-modal-overlay');
    if (modal) return modal;

    // 生成模型勾选框列表，每个模型行包含结果容器（API Key 由管理员在后台分配，用户无需配置）
    var checkboxesHTML = MODEL_ITEMS.map(function(m) {
      var checked = m.implemented ? ' checked' : '';
      return '<div class="settings-model-row" data-id="' + m.id + '"><label class="settings-model-check-row"><input type="checkbox" class="settings-model-check" data-id="' + m.id + '"' + checked + '><span class="settings-model-name">' + m.name + '</span></label><span class="settings-model-result" data-id="' + m.id + '"></span></div>';
    }).join('\n');

    var modalHTML = [
      '<div class="settings-modal-overlay" id="settings-modal-overlay">',
      '  <div class="settings-modal-content">',
      '    <div class="settings-modal-header">',
      '      <h3 class="settings-modal-title">设置</h3>',
      '      <button class="settings-modal-close" id="settings-modal-close">×</button>',
      '    </div>',
      '    <div class="settings-modal-body">',
      '      <p class="settings-api-key-hint">API Key 由管理员在后台分配，无需在此配置。请先登录后使用。</p>',
      '      <div class="settings-models-section">',
      '        <div class="settings-models-header">',
      '          <label class="settings-models-title">测试以下模型端点</label>',
      '          <div class="settings-select-all-btns">',
      '            <button type="button" class="settings-select-all-btn" id="settings-select-all-btn">全选</button>',
      '            <button type="button" class="settings-select-all-btn" id="settings-unselect-all-btn">取消全选</button>',
      '          </div>',
      '        </div>',
      '        <div class="settings-models-list" id="settings-models-list">',
      checkboxesHTML,
      '        </div>',
      '      </div>',
      '      <button type="button" class="settings-test-btn" id="settings-test-btn">测试连接</button>',
      '    </div>',
      '  </div>',
      '</div>'
    ].join('\n');

    var temp = document.createElement('div');
    temp.innerHTML = modalHTML;
    modal = temp.firstElementChild;
    document.body.appendChild(modal);
    return modal;
  }

  function showModal() {
    var modal = createModal();
    modal.classList.add('active');
    
    // 初始化事件（只在第一次创建时绑定）
    if (!modal.dataset.eventsBound) {
      initModalEvents(modal);
      modal.dataset.eventsBound = '1';
    }
  }

  function hideModal() {
    var modal = document.getElementById('settings-modal-overlay');
    if (modal) modal.classList.remove('active');
  }

  function initModalEvents(modal) {
    var closeBtn = modal.querySelector('#settings-modal-close');
    var testBtn = modal.querySelector('#settings-test-btn');
    var selectAllBtn = modal.querySelector('#settings-select-all-btn');
    var unselectAllBtn = modal.querySelector('#settings-unselect-all-btn');

    if (closeBtn) {
      closeBtn.onclick = hideModal;
    }

    // 点击模态框外部关闭
    modal.onclick = function(e) {
      if (e.target === modal) hideModal();
    };

    // 全选按钮
    if (selectAllBtn) {
      selectAllBtn.onclick = function() {
        modal.querySelectorAll('.settings-model-check').forEach(function(cb) {
          cb.checked = true;
        });
      };
    }

    // 取消全选按钮
    if (unselectAllBtn) {
      unselectAllBtn.onclick = function() {
        modal.querySelectorAll('.settings-model-check').forEach(function(cb) {
          cb.checked = false;
        });
      };
    }

    if (testBtn) {
      testBtn.onclick = function() {
        var authHeaders = (window.MediaStudio && window.MediaStudio.getAuthHeaders && window.MediaStudio.getAuthHeaders()) || {};
        if (!authHeaders.Authorization) {
          alert('请先登录。登录后由管理员分配的 API Key 将自动生效。');
          return;
        }

        // 获取勾选的模型
        var checked = [];
        modal.querySelectorAll('.settings-model-check:checked').forEach(function(cb) {
          var modelId = cb.getAttribute('data-id');
          var model = MODEL_ITEMS.filter(function(m) { return m.id === modelId; })[0];
          if (model) checked.push(model);
        });

        if (checked.length === 0) {
          alert('请至少勾选一个要测试的模型');
          return;
        }

        // 清除之前的结果
        modal.querySelectorAll('.settings-model-result').forEach(function(el) {
          el.textContent = '';
          el.className = 'settings-model-result';
        });

        testBtn.disabled = true;
        testBtn.textContent = '测试中...';

        var origin = (window.location.origin || '').replace(/\/+$/, '');
        if (!origin) {
          origin = window.location.protocol + '//' + (window.location.hostname || 'localhost') + (window.location.port ? ':' + window.location.port : '');
        }

        // 测试所有勾选的模型（请求时只带登录态，服务器使用管理员分配的 Key）
        var completed = 0;
        var total = checked.length;

        checked.forEach(function(model) {
          var resultEl = modal.querySelector('.settings-model-result[data-id="' + model.id + '"]');
          if (!resultEl) return;
          
          resultEl.textContent = '测试中...';
          resultEl.className = 'settings-model-result testing';

          runSingleModelTest(model, origin, authHeaders).then(function(result) {
            completed++;
            
            if (resultEl) {
              if (result.status === 'ok') {
                resultEl.textContent = '✓验证通过';
                resultEl.className = 'settings-model-result success';
              } else {
                resultEl.textContent = '× ' + (result.message || '连接失败');
                resultEl.className = 'settings-model-result error';
              }
            }
            
            if (completed === total) {
              testBtn.disabled = false;
              testBtn.textContent = '测试连接';
            }
          });
        });
      };
    }
  }

  function runSingleModelTest(model, origin, authHeaders) {
    return new Promise(function (resolve) {
      if (!model.implemented || !model.apiPath) {
        resolve({ 
          id: model.id, 
          name: model.name, 
          status: 'fail', 
          message: '该模型测试接口待接入',
        });
        return;
      }
      var url = (origin || '').replace(/\/+$/, '') + model.apiPath;
      var headers = Object.assign({ 'Content-Type': 'application/json' }, authHeaders || {});
      var opts = {
        method: model.method || 'POST',
        headers: headers,
        body: model.method === 'POST' ? JSON.stringify({}) : undefined
      };
      if (model.method === 'GET') delete opts.body;
      fetch(url, opts)
        .then(function (r) { 
          return r.json().catch(function () { 
            return { success: false, message: '非 JSON 响应（HTTP ' + r.status + '）' }; 
          }); 
        })
        .then(function (data) {
          resolve({
            id: model.id,
            name: model.name,
            status: data.success ? 'ok' : 'fail',
            message: data.message || data.error || (data.success ? '' : '验证未通过'),
          });
        })
        .catch(function (err) {
          resolve({ 
            id: model.id, 
            name: model.name, 
            status: 'fail', 
            message: err.message || String(err) || '网络错误',
          });
        });
    });
  }

  function showTestResult(resultDiv, success, message) {
    if (!resultDiv) return;
    resultDiv.className = 'settings-test-result ' + (success ? 'success' : 'error') + ' active';
    var icon = success ? '<span class="settings-test-result-icon">✓</span>' : '<span class="settings-test-result-icon">×</span>';
    resultDiv.innerHTML = icon + '<span class="settings-test-result-message">' + (message || '') + '</span>';
  }

  function getPanel() {
    // 设置不再在侧边栏显示，返回空字符串
    return '';
  }

  function init(container) {
    // 设置功能不再在内容区初始化，而是通过右上角按钮触发
  }

  // 初始化设置按钮事件
  function initSettingsButton() {
    var btn = document.getElementById('studioSettingsBtn');
    if (btn) {
      btn.onclick = function(e) {
        e.preventDefault();
        showModal();
      };
    }
  }

  if (window.MediaStudio && window.MediaStudio.register) {
    window.MediaStudio.register(id, { name: name, icon: icon, getPanel: getPanel, init: init });
  }

  // 页面加载完成后初始化设置按钮
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSettingsButton);
  } else {
    setTimeout(initSettingsButton, 0);
  }
})();
