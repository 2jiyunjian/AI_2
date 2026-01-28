/**
 * AI创作工坊 - 配音（独立文件）
 * 对接云雾可灵视频生音效 API
 */
(function () {
  var id = 'dubbing';
  var name = '配音';
  var icon = '🔊';

  function getPanel() {
    return [
      '<h2 class="panel-title">配音 · 可灵 Kling 视频生音效</h2>',
      '<div class="form-row">',
      '  <label>视频 <span class="required">*</span></label>',
      '  <div class="t2i-image-input-wrap">',
      '    <input type="text" id="dub-video" placeholder="输入视频 URL 或视频ID">',
      '    <input type="file" id="dub-video-file" accept="video/mp4,video/mov" style="display:none;">',
      '    <button type="button" class="btn-secondary" id="dub-upload-video-btn" style="margin-left:8px;margin-top:0;">上传视频</button>',
      '  </div>',
      '  <p class="hint">支持输入视频 URL 或视频ID（通过可灵AI生成的视频的ID），或上传本地视频（.mp4/.mov，≤100MB）</p>',
      '</div>',
      '<div class="form-row">',
      '  <button type="button" class="btn-primary" id="dub-submit">生成音效</button>',
      '</div>',
      '<div class="result-area" id="dub-result">生成结果将显示在此处，可播放音频</div>'
    ].join('\n');
  }

  function apiOrigin() {
    var o = (typeof window !== 'undefined' && window.location && window.location.origin) || '';
    return o.replace(/\/+$/, '') || (window.location.protocol + '//' + (window.location.hostname || 'localhost') + (window.location.port ? ':' + window.location.port : ''));
  }

  function setResult(html, isContent) {
    var el = document.getElementById('dub-result');
    if (el) { el.innerHTML = html; el.classList.toggle('has-content', !!isContent); }
  }

  function getVal(id, def) {
    var el = document.getElementById(id);
    if (!el) return def;
    var v = el.value != null ? String(el.value).trim() : '';
    return v === '' ? def : v;
  }

  function normalizeTaskStatus(s) {
    var t = (s || '').toString().toLowerCase();
    if (['succeed', 'succeeded', 'success', 'completed', 'done', 'finish', 'finished'].indexOf(t) >= 0) return 'done';
    if (['fail', 'failed', 'error'].indexOf(t) >= 0) return 'failed';
    return 'processing';
  }

  function collectAudioUrls(obj, out) {
    if (!obj || typeof obj !== 'object') return;
    var urlKeys = ['audio', 'url', 'audios', 'audio_url', 'output_audio', 'result_url', 'output_url', 'audioUrl'];
    urlKeys.forEach(function (k) {
      var v = obj[k];
      if (typeof v === 'string' && /^https?:\/\//i.test(v)) out.push(v);
      else if (Array.isArray(v)) v.forEach(function (u) {
        if (typeof u === 'string' && /^https?:\/\//i.test(u)) out.push(u);
        else if (u && u.url) out.push(u.url);
      });
    });
    Object.keys(obj).forEach(function (k) {
      collectAudioUrls(obj[k], out);
    });
  }

  function pollTask(taskId, apiKey, workId, setProgress, resolve, reject) {
    var url = apiOrigin() + '/api/yunwu/audio/video-to-audio/' + encodeURIComponent(taskId);
    fetch(url, {
      method: 'GET',
      headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' },
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && data.success === false && data.message) {
          reject(new Error(data.message));
          return;
        }
        var statusRaw = (data && data.data && data.data.task_status) ||
          (data && data.task_status) ||
          (data && data.data && data.data.status) ||
          (data && data.status) ||
          (data && data.data && data.data.task_result && data.data.task_result.task_status) ||
          '';
        var status = normalizeTaskStatus(statusRaw);
        var result = (data && data.data && data.data.task_result) ||
          (data && data.data && data.data.result) ||
          (data && data.result) ||
          (data && data.data) ||
          {};
        var audios = [];
        if (result.audio || result.audioUrl || result.audio_url) {
          var a = result.audio || result.audioUrl || result.audio_url;
          if (typeof a === 'string') audios.push(a); else if (a && a.url) audios.push(a.url);
        }
        if (!audios.length && result.url) {
          var url = typeof result.url === 'string' ? result.url : (result.url && result.url.url);
          if (url && /\.(mp3|wav|m4a|aac)$/i.test(url)) audios.push(url);
        }
        if (!audios.length) collectAudioUrls(data, audios);
        audios = [...new Set(audios.filter(Boolean))];

        if (status === 'done' && audios.length > 0) {
          resolve({ audios: audios, raw: data });
          return;
        }
        if (status === 'done' && !audios.length) {
          resolve({ audios: [], raw: data });
          return;
        }
        if (status === 'failed') {
          reject(new Error((result.message || result.error || data.message || data.error || '任务失败') + ''));
          return;
        }
        if (status === 'processing') {
          var progressText = '轮询中，状态=' + (statusRaw || '处理中');
          if (typeof setProgress === 'function') setProgress(progressText, statusRaw);
          if (workId && window.MediaStudio && window.MediaStudio.updateWork) {
            var pw = (window.MediaStudio.getWorks() || []).find(function (w) { return w.id === workId; });
            var n = ((pw && pw.progress) || 0) + 1;
            window.MediaStudio.updateWork(workId, { progress: n, progressStatus: statusRaw || '处理中' });
          }
          setTimeout(function () { pollTask(taskId, apiKey, workId, setProgress, resolve, reject); }, 2500);
          return;
        }
        setTimeout(function () { pollTask(taskId, apiKey, workId, setProgress, resolve, reject); }, 2500);
      })
      .catch(reject);
  }

  function init(container) {
    if (!container) return;
    var btn = document.getElementById('dub-submit');
    if (!btn) return;

    var videoInput = document.getElementById('dub-video');
    var videoFileInput = document.getElementById('dub-video-file');
    var uploadVideoBtn = document.getElementById('dub-upload-video-btn');
    var currentVideoUrl = '';
    var currentVideoId = '';

    if (uploadVideoBtn && videoFileInput) {
      uploadVideoBtn.addEventListener('click', function () { videoFileInput.click(); });
      videoFileInput.addEventListener('change', function (e) {
        var file = e.target.files && e.target.files[0];
        if (!file) return;
        setResult('视频文件已选择，请使用视频URL或视频ID', true);
        videoFileInput.value = '';
      });
    }

    if (videoInput) {
      videoInput.addEventListener('blur', function () {
        var val = videoInput.value.trim();
        if (val) {
          var isId = /^\d+$/.test(val);
          if (isId) {
            currentVideoId = val;
            currentVideoUrl = '';
          } else if (/^https?:\/\//i.test(val)) {
            currentVideoUrl = val;
            currentVideoId = '';
          }
        } else {
          currentVideoUrl = '';
          currentVideoId = '';
        }
      });
    }

    btn.addEventListener('click', function () {
      var apiKey = (window.MediaStudio && window.MediaStudio.getYunwuApiKey()) || '';
      if (!apiKey) {
        setResult('<span class="msg-warning">请先在「设置」中配置并保存云雾 API Key</span>', true);
        return;
      }
      var videoInputValue = getVal('dub-video', '') || currentVideoUrl || currentVideoId || '';
      if (!videoInputValue) {
        setResult('<span class="msg-warning">请输入视频 URL 或视频ID</span>', true);
        return;
      }

      var body = {
        apiKey: apiKey
      };
      if (/^\d+$/.test(videoInputValue)) {
        body.video_id = videoInputValue;
      } else {
        body.video_url = videoInputValue;
      }

      setResult('正在提交任务…', true);
      btn.disabled = true;
      var workId = null;
      fetch(apiOrigin() + '/api/yunwu/audio/video-to-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data && !data.success && data.message) {
            setResult('<span class="msg-error">✗ ' + (data.message || '请求失败').replace(/\n/g, '<br>') + '</span>', true);
            btn.disabled = false;
            return Promise.reject(new Error(data.message));
          }
          var taskId = (data && data.data && (data.data.id || data.data.task_id)) || (data && data.id) || (data && data.task_id);
          if (!taskId) {
            setResult('<span class="msg-error">✗ 未返回任务 ID</span><pre>' + JSON.stringify(data || {}, null, 2) + '</pre>', true);
            btn.disabled = false;
            return Promise.reject(new Error('未返回任务 ID'));
          }
          if (window.MediaStudio && window.MediaStudio.addWork) {
            workId = window.MediaStudio.addWork({
              type: 'dubbing',
              status: 'processing',
              taskId: taskId,
              title: '视频生音效',
              images: [],
              videos: [],
              audios: [],
            });
          }
          setResult('任务已创建，轮询中: ' + taskId + ' …', true);
          var setProgress = function (txt) { setResult(txt, true); };
          return new Promise(function (resolve, reject) {
            pollTask(taskId, apiKey, workId, setProgress, resolve, reject);
          });
        })
        .then(function (result) {
          var audios = (result && result.audios) || [];
          var raw = result && result.raw;
          if (!audios.length && raw) {
            collectAudioUrls(raw, audios);
            audios = [...new Set(audios.filter(Boolean))];
          }
          var hasResources = audios.length > 0;
          if (workId && window.MediaStudio && window.MediaStudio.updateWork) {
            var updates = {
              status: hasResources ? 'ready' : 'failed',
              audios: audios,
              progress: null,
              progressStatus: null
            };
            if (audios.length) updates.resultUrl = audios[0];
            window.MediaStudio.updateWork(workId, updates);
          }
          if (!hasResources) {
            var msg = '<span class="msg-warning">任务完成但未解析到音频链接。</span>';
            if (raw) {
              msg += '<br><details style="margin-top:12px"><summary style="cursor:pointer">点击展开「查询任务」原始响应（便于排查字段）</summary><pre style="max-height:240px;overflow:auto;font-size:11px;white-space:pre-wrap;background:rgba(0,0,0,0.3);padding:12px;border-radius:8px;margin-top:8px">' + JSON.stringify(raw, null, 2).replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</pre></details>';
            }
            setResult(msg, true);
            btn.disabled = false;
            return;
          }
          var html = '<span class="msg-success">✓ 生成完成</span><br>';
          audios.forEach(function (u, i) {
            html += '<div class="t2i-out"><audio src="' + (u || '').replace(/"/g, '&quot;') + '" controls style="max-width:100%;"></audio><a href="' + (u || '#').replace(/"/g, '&quot;') + '" target="_blank" rel="noopener">打开音频</a></div>';
          });
          setResult(html, true);
          btn.disabled = false;
        })
        .catch(function (err) {
          setResult('<span class="msg-error">✗ ' + (err.message || String(err)).replace(/\n/g, '<br>') + '</span>', true);
          if (workId && window.MediaStudio && window.MediaStudio.updateWork) {
            window.MediaStudio.updateWork(workId, { status: 'failed', error: (err && err.message) || String(err), progress: null, progressStatus: null });
          }
          btn.disabled = false;
        });
    });
  }

  if (window.MediaStudio && window.MediaStudio.register) {
    window.MediaStudio.register(id, { name: name, icon: icon, getPanel: getPanel, init: init });
  }
})();
