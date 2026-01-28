/**
 * AI创作工坊 - 设置（独立文件）
 * 云雾 API：连接、按模型接口测试、保存 API Key
 */
(function () {
  var id = 'settings';
  var name = '设置';
  var icon = '⚙️';

  // 与各功能对应的云雾模型测试项（后端已有测试的会在测试时真实请求）
  var MODEL_ITEMS = [
    { id: 'text2img', name: '文生图', apiPath: '/api/yunwu/images/test', method: 'POST', implemented: true },
    { id: 'img2video', name: '图生视频', apiPath: '/api/yunwu/videos/image2video/test', method: 'POST', implemented: true },
    { id: 'lipsync', name: '对口型', apiPath: '/api/yunwu/videos/identify-face/test', method: 'POST', implemented: true },
    { id: 'dubbing', name: '配音（视频生音效）', apiPath: '/api/yunwu/audio/video-to-audio/test', method: 'POST', implemented: true },
    { id: 'editimg', name: '改图', apiPath: null, implemented: false }
  ];

  function getPanel() {
    var base = (window.MediaStudio && window.MediaStudio.getYunwuApiBase()) || '';
    var key = (window.MediaStudio && window.MediaStudio.getYunwuApiKey()) || '';
    var checkboxes = MODEL_ITEMS.map(function (m) {
      var checked = m.implemented ? ' checked' : '';
      return '<label class="ms-check-row"><input type="checkbox" class="ms-model-check" data-id="' + m.id + '"' + checked + '><span>' + m.name + '</span></label>';
    }).join('');
    return [
      '<h2 class="panel-title">云雾 API · 连接与按模型接口测试</h2>',
      '<div class="form-row">',
      '  <label>API 基础地址</label>',
      '  <input type="url" id="ms-yunwu-base" placeholder="留空则经本站代理请求云雾；自建代理时可填代理地址" value="' + (base || '').replace(/"/g, '&quot;') + '">',
      '  <p class="hint">创作工坊各功能会使用此处配置的 Key；「测试连接」经当前站点后端请求云雾验证 Key。</p>',
      '</div>',
      '<div class="form-row">',
      '  <label>API Key</label>',
      '  <input type="password" id="ms-yunwu-key" placeholder="云雾 API 密钥" value="' + (key ? '********' : '') + '" data-has-value="' + (key ? '1' : '') + '">',
      '  <p class="hint">保存后仅显示脱敏，重新输入可覆盖</p>',
      '</div>',
      '<div class="form-row">',
      '  <label>测试以下模型（勾选后将按模型分别测试并显示结果）</label>',
      '  <div class="ms-model-checks" id="ms-model-checks">' + checkboxes + '</div>',
      '</div>',
      '<div class="form-row">',
      '  <div class="ms-action-buttons">',
      '    <button type="button" class="btn-primary" id="ms-yunwu-test">🧪 测试连接</button>',
      '    <button type="button" class="btn-secondary" id="ms-yunwu-save">💾 保存配置</button>',
      '  </div>',
      '</div>',
      '<div class="result-area" id="ms-yunwu-result">测试结果将按模型分行显示</div>'
    ].join('\n');
  }

  function setResult(html, isContent) {
    var el = document.getElementById('ms-yunwu-result');
    if (!el) return;
    el.innerHTML = html;
    el.classList.toggle('has-content', !!isContent);
  }

  function createStatusIcon(status) {
    if (status === 'ok') return '<span class="ms-status-icon ms-status-success">✓</span>';
    if (status === 'pending') return '<span class="ms-status-icon ms-status-pending">○</span>';
    if (status === 'loading') return '<span class="ms-status-icon ms-status-loading">⏳</span>';
    return '<span class="ms-status-icon ms-status-error">✗</span>';
  }

  function getApiKeyForTest(keyEl) {
    var raw = (keyEl && keyEl.value) ? keyEl.value.trim() : '';
    if (raw && raw !== '********') return raw;
    return (window.MediaStudio && window.MediaStudio.getYunwuApiKey()) || '';
  }

  function runSingleModelTest(model, apiKey, origin) {
    return new Promise(function (resolve) {
      if (!model.implemented || !model.apiPath) {
        resolve({ 
          id: model.id, 
          name: model.name, 
          status: 'pending', 
          message: '该模型测试接口待接入，请保存 Key 后在各功能内试用',
          timestamp: new Date().toLocaleTimeString()
        });
        return;
      }
      var url = (origin || '').replace(/\/+$/, '') + model.apiPath;
      var opts = {
        method: model.method || 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: model.method === 'POST' ? JSON.stringify({ apiKey: apiKey }) : undefined
      };
      if (model.method === 'GET') delete opts.body;
      var startTime = Date.now();
      fetch(url, opts)
        .then(function (r) { 
          return r.json().catch(function () { 
            return { success: false, message: '非 JSON 响应（HTTP ' + r.status + '）' }; 
          }); 
        })
        .then(function (data) {
          var duration = Date.now() - startTime;
          resolve({
            id: model.id,
            name: model.name,
            status: data.success ? 'ok' : 'fail',
            message: data.message || data.error || (data.success ? '验证通过' : '验证未通过'),
            duration: duration,
            timestamp: new Date().toLocaleTimeString()
          });
        })
        .catch(function (err) {
          var duration = Date.now() - startTime;
          resolve({ 
            id: model.id, 
            name: model.name, 
            status: 'fail', 
            message: err.message || String(err),
            duration: duration,
            timestamp: new Date().toLocaleTimeString()
          });
        });
    });
  }

  function init(container) {
    if (!container) return;
    var baseEl = document.getElementById('ms-yunwu-base');
    var keyEl = document.getElementById('ms-yunwu-key');
    var testBtn = document.getElementById('ms-yunwu-test');
    var saveBtn = document.getElementById('ms-yunwu-save');
    if (!baseEl || !keyEl || !testBtn || !saveBtn) return;

    testBtn.addEventListener('click', function () {
      var apiKey = getApiKeyForTest(keyEl);
      if (!apiKey) {
        setResult('<span class="msg-warning">请先输入或保存云雾 API Key 再测试</span>', true);
        return;
      }
      var checked = [];
      container.querySelectorAll('.ms-model-check:checked').forEach(function (cb) {
        var m = MODEL_ITEMS.filter(function (x) { return x.id === cb.getAttribute('data-id'); })[0];
        if (m) checked.push(m);
      });
      if (checked.length === 0) {
        setResult('<span class="msg-warning">请至少勾选一个要测试的模型</span>', true);
        return;
      }
      var origin = (window.location.origin || '').replace(/\/+$/, '');
      if (!origin) origin = window.location.protocol + '//' + (window.location.hostname || 'localhost') + (window.location.port ? ':' + window.location.port : '');
      setResult('<div class="ms-test-progress"><div class="ms-progress-bar"><div class="ms-progress-fill" style="width:0%"></div></div><div class="ms-progress-text">准备测试…</div></div>', true);
      testBtn.disabled = true;
      testBtn.textContent = '⏳ 测试中...';

      var total = checked.length;
      var completed = 0;
      var results = [];
      
      function updateProgress() {
        var progressHtml = '<div class="ms-test-progress">';
        progressHtml += '<div class="ms-progress-bar"><div class="ms-progress-fill" style="width:' + (completed / total * 100) + '%"></div></div>';
        progressHtml += '<div class="ms-progress-text">测试中：' + completed + ' / ' + total + '</div>';
        progressHtml += '</div>';
        
        var resultsHtml = results.map(function (r) {
          var icon = createStatusIcon(r.status);
          var msg = (r.message || '').replace(/\n/g, '<br>');
          var duration = r.duration ? ' <span class="ms-duration">(' + r.duration + 'ms)</span>' : '';
          var timestamp = r.timestamp ? ' <span class="ms-timestamp">' + r.timestamp + '</span>' : '';
          var statusClass = r.status === 'ok' ? 'ms-result-card-success' : (r.status === 'pending' ? 'ms-result-card-pending' : 'ms-result-card-error');
          return '<div class="ms-result-card ' + statusClass + '">' +
            '<div class="ms-result-header">' + icon + '<strong>' + r.name + '</strong>' + duration + timestamp + '</div>' +
            '<div class="ms-result-body"><span class="ms-result-msg">' + msg + '</span></div>' +
            '</div>';
        }).join('');
        
        setResult(progressHtml + '<div class="ms-result-list">' + resultsHtml + '</div>', true);
      }
      
      updateProgress();
      
      Promise.all(checked.map(function (m) {
        return runSingleModelTest(m, apiKey, origin).then(function (result) {
          completed++;
          results.push(result);
          updateProgress();
          return result;
        });
      }))
        .then(function (allResults) {
          var successCount = allResults.filter(function (r) { return r.status === 'ok'; }).length;
          var failCount = allResults.filter(function (r) { return r.status === 'fail'; }).length;
          var pendingCount = allResults.filter(function (r) { return r.status === 'pending'; }).length;
          
          var summary = '<div class="ms-test-summary">';
          summary += '<div class="ms-summary-item"><span class="ms-summary-label">总计：</span><span class="ms-summary-value">' + total + '</span></div>';
          summary += '<div class="ms-summary-item"><span class="ms-summary-label ms-summary-success">成功：</span><span class="ms-summary-value">' + successCount + '</span></div>';
          if (failCount > 0) summary += '<div class="ms-summary-item"><span class="ms-summary-label ms-summary-error">失败：</span><span class="ms-summary-value">' + failCount + '</span></div>';
          if (pendingCount > 0) summary += '<div class="ms-summary-item"><span class="ms-summary-label ms-summary-pending">待接入：</span><span class="ms-summary-value">' + pendingCount + '</span></div>';
          summary += '</div>';
          
          var finalResults = allResults.map(function (r) {
            var icon = createStatusIcon(r.status);
            var msg = (r.message || '').replace(/\n/g, '<br>');
            var duration = r.duration ? ' <span class="ms-duration">(' + r.duration + 'ms)</span>' : '';
            var timestamp = r.timestamp ? ' <span class="ms-timestamp">' + r.timestamp + '</span>' : '';
            var statusClass = r.status === 'ok' ? 'ms-result-card-success' : (r.status === 'pending' ? 'ms-result-card-pending' : 'ms-result-card-error');
            return '<div class="ms-result-card ' + statusClass + '">' +
              '<div class="ms-result-header">' + icon + '<strong>' + r.name + '</strong>' + duration + timestamp + '</div>' +
              '<div class="ms-result-body"><span class="ms-result-msg">' + msg + '</span></div>' +
              '</div>';
          }).join('');
          
          setResult(summary + '<div class="ms-result-list">' + finalResults + '</div>', true);
        })
        .catch(function (err) {
          setResult('<div class="ms-result-card ms-result-card-error">' +
            '<div class="ms-result-header"><span class="ms-status-icon ms-status-error">✗</span><strong>测试异常</strong></div>' +
            '<div class="ms-result-body"><span class="ms-result-msg">' + (err.message || String(err)).replace(/\n/g, '<br>') + '</span></div>' +
            '</div>', true);
        })
        .then(function () { 
          testBtn.disabled = false;
          testBtn.textContent = '🧪 测试连接';
        });
    });

    saveBtn.addEventListener('click', function () {
      var base = (baseEl.value || '').trim();
      var key = (keyEl.value || '').trim();
      if (!key || key === '********') key = (window.MediaStudio && window.MediaStudio.getYunwuApiKey()) || '';
      if (window.MediaStudio && window.MediaStudio.setYunwuConfig) {
        window.MediaStudio.setYunwuConfig(base, key);
      }
      keyEl.value = key ? '********' : '';
      keyEl.setAttribute('data-has-value', key ? '1' : '0');
      setResult('<span class="msg-success">✓ 已保存</span> 云雾 API 基础地址与 Key 已写入本地，各功能将使用此配置调用对应模型。', true);
    });
  }

  if (window.MediaStudio && window.MediaStudio.register) {
    window.MediaStudio.register(id, { name: name, icon: icon, getPanel: getPanel, init: init });
  }
})();
