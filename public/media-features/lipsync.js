/**
 * AI创作工坊 - 对口型（独立文件）
 * 对接云雾可灵对口型 API
 */
(function () {
  var id = 'lipsync';
  var name = '对口型';
  var icon = '👄';

  function getPanel() {
    return [
      '<h2 class="panel-title">对口型 · 可灵 Kling 高级对口型</h2>',
      '<div class="form-row">',
      '  <label>视频 <span class="required">*</span></label>',
      '  <div class="t2i-image-input-wrap">',
      '    <input type="text" id="lip-video" placeholder="输入视频 URL 或视频ID，或上传本地视频">',
      '    <input type="file" id="lip-video-file" accept="video/mp4,video/mov" style="display:none;">',
      '    <button type="button" class="btn-secondary" id="lip-upload-video-btn" style="margin-left:8px;margin-top:0;">上传视频</button>',
      '  </div>',
      '  <p class="hint">支持输入视频 URL 或视频ID（通过可灵AI生成的视频的ID），或上传本地视频（.mp4/.mov，≤100MB，2~60秒，720p/1080p）</p>',
      '</div>',
      '<div class="form-row">',
      '  <label>音频 <span class="required">*</span></label>',
      '  <div class="t2i-image-input-wrap">',
      '    <input type="text" id="lip-audio" placeholder="输入音频 URL、音频ID 或 Base64 编码，或上传本地音频">',
      '    <input type="file" id="lip-audio-file" accept="audio/mp3,audio/wav,audio/m4a,audio/aac" style="display:none;">',
      '    <button type="button" class="btn-secondary" id="lip-upload-audio-btn" style="margin-left:8px;margin-top:0;">上传音频</button>',
      '  </div>',
      '  <p class="hint">支持输入音频 URL（优先）、音频ID 或 Base64 编码（备选），或上传本地音频（.mp3/.wav/.m4a/.aac，≤5MB，2~60秒）</p>',
      '</div>',
      '<div class="form-row">',
      '  <label>音频裁剪起点时间（ms）</label>',
      '  <input type="number" id="lip-sound-start-time" min="0" value="0" placeholder="0">',
      '  <p class="hint">以原始音频开始时间为准，开始时间为0分0秒，单位ms</p>',
      '</div>',
      '<div class="form-row">',
      '  <label>音频裁剪终点时间（ms）</label>',
      '  <input type="number" id="lip-sound-end-time" min="0" value="5000" placeholder="5000">',
      '  <p class="hint">终点时间不得晚于原始音频总时长</p>',
      '</div>',
      '<div class="form-row">',
      '  <label>裁剪后音频插入时间（ms）</label>',
      '  <input type="number" id="lip-sound-insert-time" min="0" value="1000" placeholder="1000">',
      '  <p class="hint">插入音频的时间范围与该人脸可对口型时间区间至少重合2秒时长</p>',
      '</div>',
      '<div class="form-row">',
      '  <label>音频音量大小</label>',
      '  <input type="number" id="lip-sound-volume" min="0" max="2" step="0.1" value="1" placeholder="1">',
      '  <p class="hint">值越大，音量越大，取值范围：[0, 2]</p>',
      '</div>',
      '<div class="form-row">',
      '  <label>原始视频音量大小</label>',
      '  <input type="number" id="lip-original-audio-volume" min="0" max="2" step="0.1" value="1" placeholder="1">',
      '  <p class="hint">值越大，音量越大，取值范围：[0, 2]；原视频无声时，当前参数无效果</p>',
      '</div>',
      '<div class="form-row">',
      '  <button type="button" class="btn-primary" id="lip-submit">生成对口型视频</button>',
      '  <button type="button" class="btn-secondary" id="lip-identify-btn" style="margin-left:8px;">先识别视频中的人脸</button>',
      '</div>',
      '<div class="result-area" id="lip-result">生成结果将显示在此处</div>'
    ].join('\n');
  }

  function apiOrigin() {
    var o = (typeof window !== 'undefined' && window.location && window.location.origin) || '';
    return o.replace(/\/+$/, '') || (window.location.protocol + '//' + (window.location.hostname || 'localhost') + (window.location.port ? ':' + window.location.port : ''));
  }

  function setResult(html, isContent) {
    var el = document.getElementById('lip-result');
    if (el) { el.innerHTML = html; el.classList.toggle('has-content', !!isContent); }
  }

  function getVal(id, def) {
    var el = document.getElementById(id);
    if (!el) return def;
    var v = el.value != null ? String(el.value).trim() : '';
    return v === '' ? def : v;
  }

  function uploadAudioFile(file) {
    return new Promise(function (resolve, reject) {
      if (!file || !file.type || !file.type.startsWith('audio/')) {
        reject(new Error('请选择音频文件（.mp3/.wav/.m4a/.aac）'));
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        reject(new Error('音频文件过大，请选择 ≤5MB 的音频'));
        return;
      }
      var reader = new FileReader();
      reader.onload = function (e) {
        var base64 = e.target.result;
        var isDataUrl = base64.startsWith('data:');
        var raw = isDataUrl ? base64.substring(base64.indexOf(',') + 1) : base64;
        fetch(apiOrigin() + '/api/upload-temp-asset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'audio', content: raw }),
        })
          .then(function (r) { return r.json(); })
          .then(function (data) {
            if (data && data.success && data.url) {
              var url = data.url;
              var isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)/i.test(url);
              if (isLocalhost) {
                setResult('<span class="msg-warning">⚠️ 检测到本地地址（' + url + '），云雾 API 可能无法访问。请配置 DEPLOY_URL 环境变量以使用公网地址。</span>', true);
              }
              resolve(url);
            } else {
              reject(new Error(data && data.message ? data.message : '上传失败'));
            }
          })
          .catch(reject);
      };
      reader.onerror = function () { reject(new Error('读取文件失败')); };
      reader.readAsDataURL(file);
    });
  }

  function normalizeTaskStatus(s) {
    var t = (s || '').toString().toLowerCase();
    if (['succeed', 'succeeded', 'success', 'completed', 'done', 'finish', 'finished'].indexOf(t) >= 0) return 'done';
    if (['fail', 'failed', 'error'].indexOf(t) >= 0) return 'failed';
    return 'processing';
  }

  function collectVideoUrls(obj, out) {
    if (!obj || typeof obj !== 'object') return;
    var urlKeys = ['video', 'url', 'videos', 'video_url', 'output_video', 'result_url', 'output_url', 'videoUrl'];
    urlKeys.forEach(function (k) {
      var v = obj[k];
      if (typeof v === 'string' && /^https?:\/\//i.test(v)) out.push(v);
      else if (Array.isArray(v)) v.forEach(function (u) {
        if (typeof u === 'string' && /^https?:\/\//i.test(u)) out.push(u);
        else if (u && u.url) out.push(u.url);
      });
    });
    Object.keys(obj).forEach(function (k) {
      collectVideoUrls(obj[k], out);
    });
  }

  function pollTask(taskId, apiKey, workId, setProgress, resolve, reject) {
    var url = apiOrigin() + '/api/yunwu/videos/advanced-lip-sync/' + encodeURIComponent(taskId);
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
        var videos = [];
        if (result.video || result.videoUrl || result.video_url) {
          var v = result.video || result.videoUrl || result.video_url;
          if (typeof v === 'string') videos.push(v); else if (v && v.url) videos.push(v.url);
        }
        if (!videos.length && result.url) {
          var url = typeof result.url === 'string' ? result.url : (result.url && result.url.url);
          if (url && /\.(mp4|webm|mov|avi)$/i.test(url)) videos.push(url);
        }
        if (!videos.length) collectVideoUrls(data, videos);
        videos = [...new Set(videos.filter(Boolean))];

        var videoId = (result && result.video_id) ||
          (data && data.data && data.data.video_id) ||
          (data && data.data && data.data.task_result && data.data.task_result.video_id) ||
          (data && data.video_id) ||
          '';
        if (status === 'done' && videos.length > 0) {
          resolve({ videos: videos, raw: data, videoId: videoId });
          return;
        }
        if (status === 'done' && !videos.length) {
          resolve({ videos: [], raw: data, videoId: videoId });
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

  var currentSessionId = '';
  var currentFaceId = '';

  function init(container) {
    if (!container) return;
    var btn = document.getElementById('lip-submit');
    var identifyBtn = document.getElementById('lip-identify-btn');
    if (!btn) return;

    var videoInput = document.getElementById('lip-video');
    var videoFileInput = document.getElementById('lip-video-file');
    var uploadVideoBtn = document.getElementById('lip-upload-video-btn');
    var currentVideoUrl = '';
    var currentVideoId = '';

    var audioInput = document.getElementById('lip-audio');
    var audioFileInput = document.getElementById('lip-audio-file');
    var uploadAudioBtn = document.getElementById('lip-upload-audio-btn');
    var currentAudioUrl = '';
    var currentAudioBase64 = '';
    var currentAudioId = '';
    var currentAudioFile = null;

    if (uploadVideoBtn && videoFileInput) {
      uploadVideoBtn.addEventListener('click', function () { videoFileInput.click(); });
      videoFileInput.addEventListener('change', function (e) {
        var file = e.target.files && e.target.files[0];
        if (!file) return;
        setResult('视频文件已选择，请使用视频URL或视频ID', true);
        videoFileInput.value = '';
      });
    }

    if (uploadAudioBtn && audioFileInput) {
      uploadAudioBtn.addEventListener('click', function () { audioFileInput.click(); });
      audioFileInput.addEventListener('change', function (e) {
        var file = e.target.files && e.target.files[0];
        if (!file) return;
        currentAudioFile = file;
        uploadAudioBtn.disabled = true;
        uploadAudioBtn.textContent = '上传中...';
        var reader = new FileReader();
        reader.onload = function (e) {
          var base64 = e.target.result;
          currentAudioBase64 = base64;
          uploadAudioFile(file)
            .then(function (url) {
              currentAudioUrl = url;
              currentAudioBase64 = '';
              if (audioInput) audioInput.value = url;
              uploadAudioBtn.disabled = false;
              uploadAudioBtn.textContent = '上传音频';
              audioFileInput.value = '';
              setResult('<span class="msg-success">✓ 音频已上传并转换为URL</span>', true);
            })
            .catch(function (err) {
              currentAudioUrl = '';
              if (audioInput) audioInput.value = '';
              uploadAudioBtn.disabled = false;
              uploadAudioBtn.textContent = '上传音频';
              audioFileInput.value = '';
              setResult('<span class="msg-warning">⚠️ 上传失败，将使用Base64编码：' + (err.message || '上传失败').replace(/\n/g, '<br>') + '</span>', true);
            });
        };
        reader.onerror = function () {
          setResult('<span class="msg-error">✗ 读取文件失败</span>', true);
          uploadAudioBtn.disabled = false;
          uploadAudioBtn.textContent = '上传音频';
          audioFileInput.value = '';
        };
        reader.readAsDataURL(file);
      });
    }

    if (audioInput) {
      audioInput.addEventListener('blur', function () {
        var val = audioInput.value.trim();
        if (val) {
          var isBase64 = /^data:audio\//i.test(val) || (!/^https?:\/\//i.test(val) && !/^\d+$/.test(val) && val.length > 100);
          var isId = /^\d+$/.test(val);
          if (isId) {
            currentAudioId = val;
            currentAudioUrl = '';
            currentAudioBase64 = '';
          } else if (isBase64) {
            currentAudioBase64 = val;
            currentAudioUrl = '';
            currentAudioId = '';
          } else {
            var isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)/i.test(val);
            if (isLocalhost) {
              setResult('<span class="msg-warning">⚠️ 检测到本地地址（' + val + '），云雾 API 可能无法访问。将尝试使用Base64编码作为备选。</span>', true);
            }
            currentAudioUrl = val;
            currentAudioBase64 = '';
            currentAudioId = '';
          }
        } else {
          currentAudioUrl = '';
          currentAudioBase64 = '';
          currentAudioId = '';
        }
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

    if (identifyBtn) {
      identifyBtn.addEventListener('click', function () {
        var apiKey = (window.MediaStudio && window.MediaStudio.getYunwuApiKey()) || '';
        if (!apiKey) {
          setResult('<span class="msg-warning">请先在「设置」中配置并保存云雾 API Key</span>', true);
          return;
        }
        var videoInputValue = getVal('lip-video', '') || currentVideoUrl || currentVideoId || '';
        if (!videoInputValue) {
          setResult('<span class="msg-warning">请先输入视频 URL 或视频ID</span>', true);
          return;
        }
        identifyBtn.disabled = true;
        identifyBtn.textContent = '识别中...';
        setResult('正在识别人脸…', true);
        var body = { apiKey: apiKey };
        if (/^\d+$/.test(videoInputValue)) {
          body.video_id = videoInputValue;
        } else {
          body.video_url = videoInputValue;
        }
        fetch(apiOrigin() + '/api/yunwu/videos/identify-face', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
          .then(function (r) { return r.json(); })
          .then(function (data) {
            if (data && !data.success && data.message) {
              setResult('<span class="msg-error">✗ ' + (data.message || '识别失败').replace(/\n/g, '<br>') + '</span>', true);
              identifyBtn.disabled = false;
              identifyBtn.textContent = '先识别视频中的人脸';
              return;
            }
            var sessionId = (data && data.data && data.data.session_id) || (data && data.session_id) || '';
            var faces = (data && data.data && data.data.faces) || (data && data.faces) || [];
            if (!sessionId) {
              setResult('<span class="msg-error">✗ 未返回会话ID</span><pre>' + JSON.stringify(data || {}, null, 2) + '</pre>', true);
              identifyBtn.disabled = false;
              identifyBtn.textContent = '先识别视频中的人脸';
              return;
            }
            currentSessionId = sessionId;
            if (faces.length > 0) {
              currentFaceId = faces[0].face_id || '-1';
              setResult('<span class="msg-success">✓ 识别成功</span><br>会话ID: ' + sessionId + '<br>检测到 ' + faces.length + ' 个人脸，默认使用第一个（ID: ' + currentFaceId + '）', true);
            } else {
              setResult('<span class="msg-warning">⚠️ 识别成功但未检测到人脸</span><br>会话ID: ' + sessionId, true);
            }
            identifyBtn.disabled = false;
            identifyBtn.textContent = '先识别视频中的人脸';
          })
          .catch(function (err) {
            setResult('<span class="msg-error">✗ ' + (err.message || String(err)).replace(/\n/g, '<br>') + '</span>', true);
            identifyBtn.disabled = false;
            identifyBtn.textContent = '先识别视频中的人脸';
          });
      });
    }

    btn.addEventListener('click', function () {
      var apiKey = (window.MediaStudio && window.MediaStudio.getYunwuApiKey()) || '';
      if (!apiKey) {
        setResult('<span class="msg-warning">请先在「设置」中配置并保存云雾 API Key</span>', true);
        return;
      }
      if (!currentSessionId) {
        setResult('<span class="msg-warning">请先点击「先识别视频中的人脸」按钮</span>', true);
        return;
      }
      var audioInputValue = getVal('lip-audio', '') || currentAudioUrl || currentAudioId || '';
      var finalAudio = '';
      var useAudioId = false;
      
      if (audioInputValue || currentAudioUrl || currentAudioId || currentAudioBase64) {
        var isId = /^\d+$/.test(audioInputValue || currentAudioId);
        if (isId) {
          finalAudio = audioInputValue || currentAudioId;
          useAudioId = true;
        } else {
          var isBase64Input = /^data:audio\//i.test(audioInputValue) || (!/^https?:\/\//i.test(audioInputValue) && audioInputValue.length > 100);
          var hasValidUrl = currentAudioUrl || (audioInputValue && /^https?:\/\//i.test(audioInputValue) && !/^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)/i.test(audioInputValue));
          var hasLocalhostUrl = (currentAudioUrl || audioInputValue) && /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)/i.test(currentAudioUrl || audioInputValue);
          
          if (hasValidUrl) {
            finalAudio = currentAudioUrl || audioInputValue;
            useAudioId = false;
          } else if (hasLocalhostUrl && currentAudioBase64) {
            finalAudio = currentAudioBase64;
            useAudioId = false;
          } else if (isBase64Input || currentAudioBase64) {
            finalAudio = currentAudioBase64 || audioInputValue;
            useAudioId = false;
          } else if (hasLocalhostUrl) {
            finalAudio = currentAudioUrl || audioInputValue;
            useAudioId = false;
          } else {
            finalAudio = audioInputValue;
            useAudioId = false;
          }
        }
      }
      
      if (!finalAudio) {
        setResult('<span class="msg-warning">请上传或输入音频</span>', true);
        return;
      }

      var body = {
        apiKey: apiKey,
        session_id: currentSessionId,
        face_choose: [{
          face_id: currentFaceId || '-1',
          sound_start_time: parseInt(getVal('lip-sound-start-time', '0'), 10),
          sound_end_time: parseInt(getVal('lip-sound-end-time', '5000'), 10),
          sound_insert_time: parseInt(getVal('lip-sound-insert-time', '1000'), 10),
          sound_volume: parseFloat(getVal('lip-sound-volume', '1'), 10),
          original_audio_volume: parseFloat(getVal('lip-original-audio-volume', '1'), 10)
        }]
      };
      if (useAudioId) {
        body.face_choose[0].audio_id = finalAudio;
      } else {
        body.face_choose[0].sound_file = finalAudio;
      }

      setResult('正在提交任务…', true);
      btn.disabled = true;
      var workId = null;
      fetch(apiOrigin() + '/api/yunwu/videos/advanced-lip-sync', {
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
              type: 'lipsync',
              status: 'processing',
              taskId: taskId,
              title: '对口型视频',
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
          var videos = (result && result.videos) || [];
          var raw = result && result.raw;
          var videoId = (result && result.videoId) || '';
          if (!videos.length && raw) {
            collectVideoUrls(raw, videos);
            videos = [...new Set(videos.filter(Boolean))];
          }
          if (!videoId && raw) {
            videoId = (raw && raw.data && raw.data.video_id) ||
              (raw && raw.data && raw.data.task_result && raw.data.task_result.video_id) ||
              (raw && raw.video_id) ||
              '';
          }
          var hasResources = videos.length > 0;
          if (workId && window.MediaStudio && window.MediaStudio.updateWork) {
            var updates = {
              status: hasResources ? 'ready' : 'failed',
              videos: videos,
              progress: null,
              progressStatus: null
            };
            if (videos.length) updates.resultUrl = videos[0];
            if (videoId) updates.videoId = videoId;
            window.MediaStudio.updateWork(workId, updates);
          }
          if (!hasResources) {
            var msg = '<span class="msg-warning">任务完成但未解析到视频链接。</span>';
            if (raw) {
              msg += '<br><details style="margin-top:12px"><summary style="cursor:pointer">点击展开「查询任务」原始响应（便于排查字段）</summary><pre style="max-height:240px;overflow:auto;font-size:11px;white-space:pre-wrap;background:rgba(0,0,0,0.3);padding:12px;border-radius:8px;margin-top:8px">' + JSON.stringify(raw, null, 2).replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</pre></details>';
            }
            setResult(msg, true);
            btn.disabled = false;
            return;
          }
          var html = '<span class="msg-success">✓ 生成完成</span><br>';
          videos.forEach(function (u, i) {
            html += '<div class="t2i-out"><video src="' + (u || '').replace(/"/g, '&quot;') + '" controls style="max-width:100%;border-radius:8px;"></video><a href="' + (u || '#').replace(/"/g, '&quot;') + '" target="_blank" rel="noopener">打开视频</a></div>';
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
