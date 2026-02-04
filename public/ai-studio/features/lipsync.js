/**
 * AI创作工坊 - 对口型（独立文件）
 * 对接云雾可灵对口型 API
 */
(function () {
  var id = 'lipsync';
  var name = '对口型';
  var icon = '👄';

  // 当前设置
  var currentSettings = {
    soundStartTime: 0,
    soundEndTime: 5000,
    soundInsertTime: 1000,
    soundVolume: 1.0,
    originalAudioVolume: 1.0,
    videoInputMode: 'url', // 'url' 或 'id'
    audioInputMode: 'url' // 'url' 或 'id'
  };

  function getPanel() {
    return [
      '<div class="t2i-container">',
      '  <div class="t2i-header-bar">',
      '    <div class="t2i-header-title">对口型</div>',
      '    <button type="button" class="t2i-header-model-btn" id="lip-header-model-btn">',
      '      <span class="t2i-model-text" id="lip-model-text">默认模型</span>',
      '      <span class="t2i-dropdown-arrow">▼</span>',
      '    </button>',
      '  </div>',
      '  <div class="t2i-input-area">',
      '    <div class="t2i-input-box">',
      '      <!-- 视频上传卡片 -->',
      '      <div class="lip-upload-card" id="lip-video-card">',
      '        <div class="lip-upload-card-content">',
      '          <div class="lip-upload-icon">',
      '            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">',
      '              <path d="M23 7l-7 5 7 5V7z"></path>',
      '              <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>',
      '            </svg>',
      '            <span class="lip-upload-plus">+</span>',
      '          </div>',
      '          <div class="lip-upload-main-text">上传视频</div>',
      '          <div class="lip-upload-sub-text" id="lip-video-history-text">历史创作</div>',
      '        </div>',
      '        <div class="lip-upload-preview" id="lip-video-preview" style="display:none;"></div>',
      '      </div>',
      '      <input type="file" id="lip-video-file" accept="video/mp4,video/mov" style="display:none;">',
      '      <input type="text" id="lip-video-input" class="t2i-prompt-input lip-input-hidden" placeholder="输入视频 URL 或视频ID（仅支持时长不短于2秒且不长于60秒的视频）" style="display:none;">',
      '      <!-- 音频上传卡片 -->',
      '      <div class="lip-upload-card" id="lip-audio-card">',
      '        <div class="lip-upload-card-content">',
      '          <div class="lip-upload-icon">',
      '            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">',
      '              <path d="M9 18V5l12-2v13"></path>',
      '              <circle cx="6" cy="18" r="3"></circle>',
      '              <circle cx="18" cy="16" r="3"></circle>',
      '            </svg>',
      '            <span class="lip-upload-plus">+</span>',
      '          </div>',
      '          <div class="lip-upload-main-text">上传音频</div>',
      '          <div class="lip-upload-sub-text" id="lip-audio-history-text">历史创作</div>',
      '        </div>',
      '        <div class="lip-upload-preview" id="lip-audio-preview" style="display:none;"></div>',
      '      </div>',
      '      <input type="file" id="lip-audio-file" accept="audio/mp3,audio/wav,audio/m4a,audio/aac" style="display:none;">',
      '      <input type="text" id="lip-audio-input" class="t2i-prompt-input lip-input-hidden" placeholder="输入音频 URL、音频ID 或 Base64 编码（仅支持时长不短于2秒且不长于60秒的音频）" style="display:none;">',
      '      <div class="lip-time-group">',
      '        <div class="lip-time-row lip-time-row-two">',
      '          <div class="lip-time-field">',
      '            <label class="lip-time-label">音频裁剪起点(ms)</label>',
      '            <input type="number" id="lip-sound-start-time" class="lip-time-input" min="0" value="0" placeholder="0">',
      '          </div>',
      '          <div class="lip-time-field">',
      '            <label class="lip-time-label">音频裁剪终点(ms)</label>',
      '            <input type="number" id="lip-sound-end-time" class="lip-time-input" min="0" value="5000" placeholder="5000">',
      '          </div>',
      '        </div>',
      '        <div class="lip-time-row lip-time-row-full">',
      '          <div class="lip-time-field">',
      '            <label class="lip-time-label">裁剪后音频插入时间(ms)</label>',
      '            <input type="number" id="lip-sound-insert-time" class="lip-time-input" min="0" value="1000" placeholder="1000">',
      '          </div>',
      '        </div>',
      '      </div>',
      '      <div class="t2i-input-footer">',
      '        <div class="t2i-input-left">',
      '          <div class="lip-volume-controls" style="display:flex;gap:16px;align-items:center;flex-wrap:wrap;">',
      '            <button type="button" class="lip-volume-btn" id="lip-sound-volume-btn">',
      '              <span>音频音量大小</span>',
      '              <span id="lip-sound-volume-value">1.0</span>',
      '              <span class="t2i-dropdown-arrow">▼</span>',
      '            </button>',
      '            <div class="lip-volume-dropdown" id="lip-sound-volume-dropdown" style="display:none;">',
      '              <div class="lip-volume-dropdown-content">',
      '                <input type="range" id="lip-sound-volume" min="0" max="2" step="0.1" value="1" style="width:100%;">',
      '              </div>',
      '            </div>',
      '            <button type="button" class="lip-volume-btn" id="lip-original-audio-volume-btn">',
      '              <span>原始视频音量大小</span>',
      '              <span id="lip-original-audio-volume-value">1.0</span>',
      '              <span class="t2i-dropdown-arrow">▼</span>',
      '            </button>',
      '            <div class="lip-volume-dropdown" id="lip-original-audio-volume-dropdown" style="display:none;">',
      '              <div class="lip-volume-dropdown-content">',
      '                <input type="range" id="lip-original-audio-volume" min="0" max="2" step="0.1" value="1" style="width:100%;">',
      '              </div>',
      '            </div>',
      '          </div>',
      '        </div>',
      '        <button type="button" class="t2i-generate-btn" id="lip-submit">生成</button>',
      '      </div>',
      '    </div>',
      '  </div>',
      '</div>',
      '<div class="t2i-settings-dropdown" id="lip-settings-dropdown" style="display:none;"></div>'
    ].join('\n');
  }

  function apiOrigin() {
    var o = (typeof window !== 'undefined' && window.location && window.location.origin) || '';
    return o.replace(/\/+$/, '') || (window.location.protocol + '//' + (window.location.hostname || 'localhost') + (window.location.port ? ':' + window.location.port : ''));
  }

  function isLocalhostEnvironment() {
    try {
      var origin = window.location.origin || '';
      return /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/i.test(origin);
    } catch (e) { return false; }
  }

  function isLocalhostUrl(url) {
    if (!url || typeof url !== 'string') return false;
    return /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?/i.test(url);
  }

  var hasDeployUrlCache = null;
  function checkHasDeployUrl(callback) {
    if (hasDeployUrlCache !== null) {
      if (callback) callback(hasDeployUrlCache);
      return;
    }
    fetch(apiOrigin() + '/api/upload-temp-asset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'audio', content: 'dGVzdA==' }),
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && data.url) {
          hasDeployUrlCache = !isLocalhostUrl(data.url);
        } else {
          hasDeployUrlCache = false;
        }
        if (callback) callback(hasDeployUrlCache);
      })
      .catch(function () {
        hasDeployUrlCache = false;
        if (callback) callback(false);
      });
  }

  function extractBase64Str(str) {
    if (!str || typeof str !== 'string') return '';
    if (str.startsWith('data:')) {
      var commaIdx = str.indexOf(',');
      if (commaIdx >= 0) str = str.substring(commaIdx + 1);
    }
    str = str.replace(/[\s\n\r]/g, '');
    if (!/^[A-Za-z0-9+/=]+$/.test(str)) {
      return '';
    }
    return str;
  }

  function chooseUrlOrBase64(url, base64, callback) {
    if (!url && !base64) {
      if (callback) callback('');
      return;
    }
    var isLocal = isLocalhostUrl(url);
    var isLocalEnv = isLocalhostEnvironment();
    
    if (isLocalEnv) {
      checkHasDeployUrl(function (hasDeploy) {
        if (isLocal && !hasDeploy && base64) {
          var base64Str = extractBase64Str(base64);
          if (base64Str) {
            if (callback) callback(base64Str);
          } else {
            if (callback) callback('');
          }
        } else if (url && (!isLocal || hasDeploy)) {
          if (callback) callback(url);
        } else if (base64) {
          var base64Str = extractBase64Str(base64);
          if (base64Str) {
            if (callback) callback(base64Str);
          } else {
            if (callback) callback('');
          }
        } else if (url) {
          if (callback) callback(url);
        } else {
          if (callback) callback('');
        }
      });
    } else {
      if (url && !isLocal) {
        if (callback) callback(url);
      } else if (base64) {
        var base64Str = extractBase64Str(base64);
        if (base64Str) {
          if (callback) callback(base64Str);
        } else {
          if (callback) callback('');
        }
      } else if (url) {
        if (callback) callback(url);
      } else {
        if (callback) callback('');
      }
    }
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
      var formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'audio');
      fetch(apiOrigin() + '/api/upload-temp-asset', {
        method: 'POST',
        body: formData,
      })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data && data.success && data.url) {
            var url = data.url;
            var isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)/i.test(url);
            if (isLocalhost) {
              // 本地地址警告可以忽略，因为服务器会处理
            }
            resolve(url);
          } else {
            reject(new Error(data && data.message ? data.message : '上传失败'));
          }
        })
        .catch(reject);
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

  function pollTask(taskId, apiKey, workId, setProgress, resolve, reject, pollCount) {
    pollCount = pollCount || 0;
    var maxPolls = 240;
    if (pollCount >= maxPolls) {
      reject(new Error('轮询超时（已轮询 ' + maxPolls + ' 次，约 ' + Math.round(maxPolls * 2.5 / 60) + ' 分钟），请稍后在「作品管理」中重新查询'));
      return;
    }
    var url = apiOrigin() + '/api/yunwu/videos/advanced-lip-sync/' + encodeURIComponent(taskId);
    var authHeaders = (window.MediaStudio && window.MediaStudio.getAuthHeaders && window.MediaStudio.getAuthHeaders()) || {};
    fetch(url, {
      method: 'GET',
      headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders),
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
          // 任务完成且有资源，立即更新作品状态
          if (workId && window.MediaStudio && window.MediaStudio.updateWork) {
            var updates = {
              status: 'ready',
              videos: videos,
              resultUrl: videos[0],
              videoId: videoId,
              progress: 100,
              progressStatus: '已完成'
            };
            window.MediaStudio.updateWork(workId, updates);
            if (window.MediaStudio.refreshWorksList) window.MediaStudio.refreshWorksList();
          }
          resolve({ videos: videos, raw: data, videoId: videoId });
          return;
        }
        
        if (status === 'done' && !videos.length) {
          var progressText = '任务状态已完成，但视频链接尚未生成，继续轮询中…（' + (pollCount + 1) + '/' + maxPolls + '）';
          if (typeof setProgress === 'function') setProgress(progressText, statusRaw);
          if (workId && window.MediaStudio && window.MediaStudio.updateWork) {
            var pw = (window.MediaStudio.getWorks() || []).find(function (w) { return w.id === workId; });
            var n = ((pw && pw.progress) || 0) + 1;
            window.MediaStudio.updateWork(workId, { progress: n, progressStatus: statusRaw || '处理中（等待视频生成）' });
          }
          if (window.MediaStudio && window.MediaStudio.refreshWorksList) window.MediaStudio.refreshWorksList();
          setTimeout(function () { pollTask(taskId, apiKey, workId, setProgress, resolve, reject, pollCount + 1); }, 2500);
          return;
        }
        
        if (status === 'failed') {
          reject(new Error((result.message || result.error || data.message || data.error || '任务失败') + ''));
          return;
        }
        
        if (status === 'processing') {
          var progressText = '轮询中，状态=' + (statusRaw || '处理中');
          if (videos.length > 0) {
            progressText += '（已检测到 ' + videos.length + ' 个视频链接，等待最终确认）';
          }
          progressText += '（' + (pollCount + 1) + '/' + maxPolls + '）';
          if (typeof setProgress === 'function') setProgress(progressText, statusRaw);
          if (workId && window.MediaStudio && window.MediaStudio.updateWork) {
            var pw = (window.MediaStudio.getWorks() || []).find(function (w) { return w.id === workId; });
            var n = ((pw && pw.progress) || 0) + 1;
            window.MediaStudio.updateWork(workId, { progress: n, progressStatus: statusRaw || '处理中' });
          }
          if (window.MediaStudio && window.MediaStudio.refreshWorksList) window.MediaStudio.refreshWorksList();
          setTimeout(function () { pollTask(taskId, apiKey, workId, setProgress, resolve, reject, pollCount + 1); }, 2500);
          return;
        }
        
        if (window.MediaStudio && window.MediaStudio.refreshWorksList) window.MediaStudio.refreshWorksList();
        setTimeout(function () { pollTask(taskId, apiKey, workId, setProgress, resolve, reject, pollCount + 1); }, 2500);
      })
      .catch(reject);
  }

  var currentSessionId = '';
  var currentFaceId = '';
  
  // 聊天消息管理

  function init(container) {
    if (!container) return;
    
    var btn = document.getElementById('lip-submit');
    if (!btn) return;
    
    // 初始化模型按钮（仅显示，不实现下拉功能）
    var modelBtn = document.getElementById('lip-header-model-btn');
    var modelText = document.getElementById('lip-model-text');
    if (modelText) {
      modelText.textContent = '对口型模型';
    }
    if (modelBtn) {
      // 可以添加点击事件，但目前仅显示
      modelBtn.style.cursor = 'default';
    }
    
    var videoInput = document.getElementById('lip-video-input');
    var videoFileInput = document.getElementById('lip-video-file');
    var currentVideoUrl = '';
    var currentVideoId = '';
    var currentVideoFile = null;
    var currentVideoDuration = 0; // 视频时长（秒）

    var audioInput = document.getElementById('lip-audio-input');
    var audioFileInput = document.getElementById('lip-audio-file');
    var currentAudioUrl = '';
    var currentAudioBase64 = '';
    var currentAudioId = '';
    var currentAudioFile = null;
    var currentAudioDuration = 0; // 音频时长（秒）
    
    // 获取视频时长
    function getVideoDuration(file) {
      return new Promise(function(resolve, reject) {
        var video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = function() {
          window.URL.revokeObjectURL(video.src);
          resolve(video.duration);
        };
        video.onerror = function() {
          window.URL.revokeObjectURL(video.src);
          reject(new Error('无法读取视频时长'));
        };
        video.src = URL.createObjectURL(file);
      });
    }
    
    // 获取音频时长
    function getAudioDuration(file) {
      return new Promise(function(resolve, reject) {
        var audio = document.createElement('audio');
        audio.preload = 'metadata';
        audio.onloadedmetadata = function() {
          window.URL.revokeObjectURL(audio.src);
          resolve(audio.duration);
        };
        audio.onerror = function() {
          window.URL.revokeObjectURL(audio.src);
          reject(new Error('无法读取音频时长'));
        };
        audio.src = URL.createObjectURL(file);
      });
    }
    
    // 格式化时长显示（秒转为 mm:ss 或 hh:mm:ss）
    function formatDuration(seconds) {
      if (!seconds || isNaN(seconds)) return '未知';
      var hours = Math.floor(seconds / 3600);
      var minutes = Math.floor((seconds % 3600) / 60);
      var secs = Math.floor(seconds % 60);
      if (hours > 0) {
        return hours + ':' + (minutes < 10 ? '0' : '') + minutes + ':' + (secs < 10 ? '0' : '') + secs;
      }
      return minutes + ':' + (secs < 10 ? '0' : '') + secs;
    }
    
    
    // 绑定输入框中的设置项事件
    function bindSettingsInputs() {
      var startTimeInput = document.getElementById('lip-sound-start-time');
      var endTimeInput = document.getElementById('lip-sound-end-time');
      var insertTimeInput = document.getElementById('lip-sound-insert-time');
      
      if (startTimeInput) {
        startTimeInput.addEventListener('input', function() {
          currentSettings.soundStartTime = parseInt(this.value, 10) || 0;
        });
      }
      if (endTimeInput) {
        endTimeInput.addEventListener('input', function() {
          currentSettings.soundEndTime = parseInt(this.value, 10) || 5000;
        });
      }
      if (insertTimeInput) {
        insertTimeInput.addEventListener('input', function() {
          currentSettings.soundInsertTime = parseInt(this.value, 10) || 1000;
        });
      }
    }
    
    // 音量控制按钮和下拉框
    var soundVolumeBtn = document.getElementById('lip-sound-volume-btn');
    var soundVolumeDropdown = document.getElementById('lip-sound-volume-dropdown');
    var soundVolumeInput = document.getElementById('lip-sound-volume');
    var soundVolumeValue = document.getElementById('lip-sound-volume-value');
    
    var originalVolumeBtn = document.getElementById('lip-original-audio-volume-btn');
    var originalVolumeDropdown = document.getElementById('lip-original-audio-volume-dropdown');
    var originalVolumeInput = document.getElementById('lip-original-audio-volume');
    var originalVolumeValue = document.getElementById('lip-original-audio-volume-value');
    
    // 关闭所有下拉框的通用函数
    function closeAllDropdowns(excludeDropdown) {
      if (soundVolumeDropdown && soundVolumeDropdown !== excludeDropdown) {
        soundVolumeDropdown.style.display = 'none';
      }
      if (originalVolumeDropdown && originalVolumeDropdown !== excludeDropdown) {
        originalVolumeDropdown.style.display = 'none';
      }
    }
    
    // 音频音量按钮点击事件
    if (soundVolumeBtn && soundVolumeDropdown) {
      soundVolumeBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        var rect = soundVolumeBtn.getBoundingClientRect();
        var computedDisplay = window.getComputedStyle(soundVolumeDropdown).display;
        var isVisible = computedDisplay === 'block';
        
        // 关闭其他所有下拉框
        closeAllDropdowns(soundVolumeDropdown);
        
        if (isVisible) {
          soundVolumeDropdown.style.display = 'none';
        } else {
          soundVolumeDropdown.style.display = 'block';
          soundVolumeDropdown.style.visibility = 'hidden';
          var dropdownHeight = soundVolumeDropdown.offsetHeight || 60;
          soundVolumeDropdown.style.visibility = 'visible';
          
          soundVolumeDropdown.style.left = rect.left + 'px';
          var topPosition = rect.top - dropdownHeight - 4;
          if (topPosition < 0) {
            soundVolumeDropdown.style.top = (rect.bottom + 4) + 'px';
          } else {
            soundVolumeDropdown.style.top = topPosition + 'px';
          }
        }
      });
    }
    
    // 原始视频音量按钮点击事件
    if (originalVolumeBtn && originalVolumeDropdown) {
      originalVolumeBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        var rect = originalVolumeBtn.getBoundingClientRect();
        var computedDisplay = window.getComputedStyle(originalVolumeDropdown).display;
        var isVisible = computedDisplay === 'block';
        
        // 关闭其他所有下拉框
        closeAllDropdowns(originalVolumeDropdown);
        
        if (isVisible) {
          originalVolumeDropdown.style.display = 'none';
        } else {
          originalVolumeDropdown.style.display = 'block';
          originalVolumeDropdown.style.visibility = 'hidden';
          var dropdownHeight = originalVolumeDropdown.offsetHeight || 60;
          originalVolumeDropdown.style.visibility = 'visible';
          
          originalVolumeDropdown.style.left = rect.left + 'px';
          var topPosition = rect.top - dropdownHeight - 4;
          if (topPosition < 0) {
            originalVolumeDropdown.style.top = (rect.bottom + 4) + 'px';
          } else {
            originalVolumeDropdown.style.top = topPosition + 'px';
          }
        }
      });
    }
    
    // 音量滑块事件
    if (soundVolumeInput && soundVolumeValue) {
      soundVolumeInput.addEventListener('input', function() {
        currentSettings.soundVolume = parseFloat(this.value) || 1.0;
        soundVolumeValue.textContent = currentSettings.soundVolume.toFixed(1);
      });
    }
    
    if (originalVolumeInput && originalVolumeValue) {
      originalVolumeInput.addEventListener('input', function() {
        currentSettings.originalAudioVolume = parseFloat(this.value) || 1.0;
        originalVolumeValue.textContent = currentSettings.originalAudioVolume.toFixed(1);
      });
    }
    
    // 点击外部关闭下拉框
    setTimeout(function() {
      document.addEventListener('click', function(e) {
        if (soundVolumeDropdown && soundVolumeBtn && 
            !soundVolumeDropdown.contains(e.target) && 
            !soundVolumeBtn.contains(e.target)) {
          soundVolumeDropdown.style.display = 'none';
        }
        if (originalVolumeDropdown && originalVolumeBtn && 
            !originalVolumeDropdown.contains(e.target) && 
            !originalVolumeBtn.contains(e.target)) {
          originalVolumeDropdown.style.display = 'none';
        }
      });
    }, 100);
    
    // 绑定输入框中的设置项
    bindSettingsInputs();

    // 上传视频文件到服务器（使用FormData）
    function uploadVideoFile(file) {
      return new Promise(function (resolve, reject) {
        if (!file || !file.type || !file.type.startsWith('video/')) {
          reject(new Error('请选择视频文件（.mp4/.mov）'));
          return;
        }
        if (file.size > 100 * 1024 * 1024) {
          reject(new Error('视频文件过大，请选择 ≤100MB 的视频'));
          return;
        }
        var formData = new FormData();
        formData.append('file', file);
        formData.append('type', 'video');
        fetch(apiOrigin() + '/api/upload-temp-asset', {
          method: 'POST',
          body: formData,
        })
          .then(function (r) { return r.json(); })
          .then(function (data) {
            if (data && data.success && data.url) {
              resolve(data.url);
            } else {
              reject(new Error(data && data.message ? data.message : '上传失败'));
            }
          })
          .catch(reject);
      });
    }
    
    // 添加视频预览
    function addVideoPreview(videoUrl, videoId, file) {
      var videoCard = document.getElementById('lip-video-card');
      var previewEl = document.getElementById('lip-video-preview');
      if (!videoCard || !previewEl) return;
      
      var cardContent = videoCard.querySelector('.lip-upload-card-content');
      if (cardContent) cardContent.style.display = 'none';
      
      previewEl.style.display = 'block';
      
      if (file) {
        // 本地文件预览
        var reader = new FileReader();
        reader.onload = function(e) {
          var video = document.createElement('video');
          video.src = e.target.result;
          video.controls = true;
          video.style.width = '100%';
          video.style.height = '100%';
          video.style.objectFit = 'contain';
          previewEl.innerHTML = '';
          previewEl.appendChild(video);
          
          var removeBtn = document.createElement('button');
          removeBtn.className = 'lip-upload-remove-btn';
          removeBtn.innerHTML = '×';
          removeBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            removeVideoPreview();
          });
          previewEl.appendChild(removeBtn);
        };
        reader.readAsDataURL(file);
      } else if (videoUrl) {
        // URL预览
        var video = document.createElement('video');
        video.src = videoUrl;
        video.controls = true;
        video.style.width = '100%';
        video.style.height = '100%';
        video.style.objectFit = 'contain';
        previewEl.innerHTML = '';
        previewEl.appendChild(video);
        
        var removeBtn = document.createElement('button');
        removeBtn.className = 'lip-upload-remove-btn';
        removeBtn.innerHTML = '×';
        removeBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          removeVideoPreview();
        });
        previewEl.appendChild(removeBtn);
      } else if (videoId) {
        // ID显示
        previewEl.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text);">视频ID: ' + videoId + '</div>' +
          '<button class="lip-upload-remove-btn">×</button>';
        var removeBtn = previewEl.querySelector('.lip-upload-remove-btn');
        if (removeBtn) {
          removeBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            removeVideoPreview();
          });
        }
      }
    }
    
    // 移除视频预览
    function removeVideoPreview() {
      var videoCard = document.getElementById('lip-video-card');
      var previewEl = document.getElementById('lip-video-preview');
      if (videoCard && previewEl) {
        var cardContent = videoCard.querySelector('.lip-upload-card-content');
        if (cardContent) cardContent.style.display = 'flex';
        previewEl.style.display = 'none';
        previewEl.innerHTML = '';
      }
      currentVideoUrl = '';
      currentVideoId = '';
      currentVideoFile = null;
      currentVideoDuration = 0;
      if (videoFileInput) videoFileInput.value = '';
      if (videoInput) videoInput.value = '';
    }
    
    // 添加音频预览
    function addAudioPreview(audioUrl, audioId, file) {
      var audioCard = document.getElementById('lip-audio-card');
      var previewEl = document.getElementById('lip-audio-preview');
      if (!audioCard || !previewEl) return;
      
      var cardContent = audioCard.querySelector('.lip-upload-card-content');
      if (cardContent) cardContent.style.display = 'none';
      
      previewEl.style.display = 'block';
      
      if (file) {
        // 本地文件预览
        var reader = new FileReader();
        reader.onload = function(e) {
          var audio = document.createElement('audio');
          audio.src = e.target.result;
          audio.controls = true;
          audio.style.width = '100%';
          previewEl.innerHTML = '';
          previewEl.appendChild(audio);
          
          var removeBtn = document.createElement('button');
          removeBtn.className = 'lip-upload-remove-btn';
          removeBtn.innerHTML = '×';
          removeBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            removeAudioPreview();
          });
          previewEl.appendChild(removeBtn);
        };
        reader.readAsDataURL(file);
      } else if (audioUrl) {
        // URL预览
        var audio = document.createElement('audio');
        audio.src = audioUrl;
        audio.controls = true;
        audio.style.width = '100%';
        previewEl.innerHTML = '';
        previewEl.appendChild(audio);
        
        var removeBtn = document.createElement('button');
        removeBtn.className = 'lip-upload-remove-btn';
        removeBtn.innerHTML = '×';
        removeBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          removeAudioPreview();
        });
        previewEl.appendChild(removeBtn);
      } else if (audioId) {
        // ID显示
        previewEl.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text);">音频ID: ' + audioId + '</div>' +
          '<button class="lip-upload-remove-btn">×</button>';
        var removeBtn = previewEl.querySelector('.lip-upload-remove-btn');
        if (removeBtn) {
          removeBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            removeAudioPreview();
          });
        }
      }
    }
    
    // 移除音频预览
    function removeAudioPreview() {
      var audioCard = document.getElementById('lip-audio-card');
      var previewEl = document.getElementById('lip-audio-preview');
      if (audioCard && previewEl) {
        var cardContent = audioCard.querySelector('.lip-upload-card-content');
        if (cardContent) cardContent.style.display = 'flex';
        previewEl.style.display = 'none';
        previewEl.innerHTML = '';
      }
      currentAudioUrl = '';
      currentAudioId = '';
      currentAudioBase64 = '';
      currentAudioFile = null;
      currentAudioDuration = 0;
      if (audioFileInput) audioFileInput.value = '';
      if (audioInput) audioInput.value = '';
    }
    
    // 历史创作选择功能：打开视频选择模态框
    function openHistoryVideoSelector(callback) {
      var works = (window.MediaStudio && window.MediaStudio.getWorks()) || [];
      var videoWorks = works.filter(function(w) {
        return w.videos && w.videos.length > 0;
      });
      
      if (videoWorks.length === 0) {
        alert('暂无历史视频作品');
        return;
      }
      
      // 创建模态框
      var modal = document.createElement('div');
      modal.className = 'lip-history-modal-overlay';
      modal.innerHTML = [
        '<div class="lip-history-modal-content">',
        '  <div class="lip-history-modal-header">',
        '    <h3>选择历史视频</h3>',
        '    <button type="button" class="lip-history-modal-close">×</button>',
        '  </div>',
        '  <div class="lip-history-modal-body" id="lip-history-video-modal-body">',
        '  </div>',
        '</div>'
      ].join('');
      
      var modalBody = modal.querySelector('#lip-history-video-modal-body');
      var videosHtml = '';
      
      videoWorks.forEach(function(work) {
        if (work.videos && work.videos.length > 0) {
          work.videos.forEach(function(videoUrl) {
            videosHtml += '<div class="lip-history-item" data-url="' + String(videoUrl).replace(/"/g, '&quot;') + '">' +
              '<video src="' + String(videoUrl).replace(/"/g, '&quot;') + '" preload="metadata" muted playsinline referrerpolicy="no-referrer"></video>' +
              '<div class="lip-history-item-label">视频</div>' +
              '</div>';
          });
        }
      });
      
      modalBody.innerHTML = videosHtml || '<div style="padding: 40px; text-align: center; color: var(--muted);">暂无视频</div>';
      
      // 绑定视频选择事件
      modalBody.querySelectorAll('.lip-history-item').forEach(function(item) {
        item.addEventListener('click', function() {
          var url = item.getAttribute('data-url');
          if (callback && url) {
            callback(url);
          }
          document.body.removeChild(modal);
        });
      });
      
      // 关闭按钮
      var closeBtn = modal.querySelector('.lip-history-modal-close');
      closeBtn.addEventListener('click', function() {
        document.body.removeChild(modal);
      });
      
      // 点击背景关闭
      modal.addEventListener('click', function(e) {
        if (e.target === modal) {
          document.body.removeChild(modal);
        }
      });
      
      document.body.appendChild(modal);
    }
    
    // 历史创作选择功能：打开音频选择模态框
    function openHistoryAudioSelector(callback) {
      var works = (window.MediaStudio && window.MediaStudio.getWorks()) || [];
      var audioWorks = works.filter(function(w) {
        return w.audios && w.audios.length > 0;
      });
      
      if (audioWorks.length === 0) {
        alert('暂无历史音频作品');
        return;
      }
      
      // 创建模态框
      var modal = document.createElement('div');
      modal.className = 'lip-history-modal-overlay';
      modal.innerHTML = [
        '<div class="lip-history-modal-content">',
        '  <div class="lip-history-modal-header">',
        '    <h3>选择历史音频</h3>',
        '    <button type="button" class="lip-history-modal-close">×</button>',
        '  </div>',
        '  <div class="lip-history-modal-body" id="lip-history-audio-modal-body">',
        '  </div>',
        '</div>'
      ].join('');
      
      var modalBody = modal.querySelector('#lip-history-audio-modal-body');
      var audiosHtml = '';
      
      audioWorks.forEach(function(work) {
        if (work.audios && work.audios.length > 0) {
          work.audios.forEach(function(audioUrl) {
            audiosHtml += '<div class="lip-history-item" data-url="' + String(audioUrl).replace(/"/g, '&quot;') + '">' +
              '<div class="lip-history-audio-icon">🎵</div>' +
              '<div class="lip-history-item-label">音频</div>' +
              '</div>';
          });
        }
      });
      
      modalBody.innerHTML = audiosHtml || '<div style="padding: 40px; text-align: center; color: var(--muted);">暂无音频</div>';
      
      // 绑定音频选择事件
      modalBody.querySelectorAll('.lip-history-item').forEach(function(item) {
        item.addEventListener('click', function() {
          var url = item.getAttribute('data-url');
          if (callback && url) {
            callback(url);
          }
          document.body.removeChild(modal);
        });
      });
      
      // 关闭按钮
      var closeBtn = modal.querySelector('.lip-history-modal-close');
      closeBtn.addEventListener('click', function() {
        document.body.removeChild(modal);
      });
      
      // 点击背景关闭
      modal.addEventListener('click', function(e) {
        if (e.target === modal) {
          document.body.removeChild(modal);
        }
      });
      
      document.body.appendChild(modal);
    }
    
    // 视频历史创作按钮事件
    var videoHistoryText = document.getElementById('lip-video-history-text');
    if (videoHistoryText) {
      videoHistoryText.addEventListener('click', function(e) {
        e.stopPropagation();
        openHistoryVideoSelector(function(url) {
          currentVideoUrl = url;
          currentVideoId = '';
          currentVideoFile = null;
          removeVideoPreview();
          addVideoPreview(url, '', null);
          if (videoInput) videoInput.value = url;
        });
      });
    }
    
    // 音频历史创作按钮事件
    var audioHistoryText = document.getElementById('lip-audio-history-text');
    if (audioHistoryText) {
      audioHistoryText.addEventListener('click', function(e) {
        e.stopPropagation();
        openHistoryAudioSelector(function(url) {
          currentAudioUrl = url;
          currentAudioId = '';
          currentAudioBase64 = '';
          currentAudioFile = null;
          removeAudioPreview();
          addAudioPreview(url, '', null);
          if (audioInput) audioInput.value = url;
        });
      });
    }

    // 视频卡片点击事件
    var videoCard = document.getElementById('lip-video-card');
    if (videoCard && videoFileInput) {
      videoCard.addEventListener('click', function(e) {
        if (e.target.closest('.lip-upload-remove-btn')) return;
        if (e.target.closest('.lip-upload-preview')) return;
        if (e.target.closest('.lip-upload-sub-text')) return; // 历史创作文本单独处理
        e.stopPropagation();
        videoFileInput.click();
      });
    }
    
    // 视频文件选择事件
    if (videoFileInput) {
      videoFileInput.addEventListener('change', function (e) {
        var file = e.target.files && e.target.files[0];
        if (!file) return;
        currentVideoFile = file;
        currentVideoDuration = 0;
        addVideoPreview('', '', file);
        videoFileInput.value = '';
        
        
        // 获取视频时长（失败不影响上传）
        var durationPromise = getVideoDuration(file).catch(function() {
          // 获取时长失败不影响上传流程
          return 0;
        });
        
        // 同时开始上传
        var uploadPromise = uploadVideoFile(file);
        
        // 等待时长获取和上传都完成
        Promise.all([durationPromise, uploadPromise])
          .then(function(results) {
            var duration = results[0];
            var url = results[1];
            
            if (duration > 0) {
              currentVideoDuration = duration;
            }
            
            currentVideoUrl = url;
            currentVideoId = '';
            currentVideoFile = null;
            removeVideoPreview();
            addVideoPreview(url, '', null);
            if (videoInput) videoInput.value = url;
            
            // 更新消息而不是添加新消息
            var durationText = currentVideoDuration > 0 ? '，时长：' + formatDuration(currentVideoDuration) : '';
          })
          .catch(function(err) {
            currentVideoFile = null;
            currentVideoDuration = 0;
            removeVideoPreview();
          });
      });
    }

    // 音频卡片点击事件
    var audioCard = document.getElementById('lip-audio-card');
    if (audioCard && audioFileInput) {
      audioCard.addEventListener('click', function(e) {
        if (e.target.closest('.lip-upload-remove-btn')) return;
        if (e.target.closest('.lip-upload-preview')) return;
        if (e.target.closest('.lip-upload-sub-text')) return; // 历史创作文本单独处理
        e.stopPropagation();
        audioFileInput.click();
      });
    }
    
    // 音频文件选择事件
    if (audioFileInput) {
      audioFileInput.addEventListener('change', function (e) {
        var file = e.target.files && e.target.files[0];
        if (!file) return;
        currentAudioFile = file;
        currentAudioDuration = 0;
        addAudioPreview('', '', file);
        audioFileInput.value = '';
        
        
        // 读取文件为Base64（用于备用）
        var readerPromise = new Promise(function(resolve, reject) {
          var reader = new FileReader();
          reader.onload = function (e) {
            var base64 = e.target.result;
            currentAudioBase64 = base64;
            resolve();
          };
          reader.onerror = function () {
            // 读取失败不影响上传流程
            resolve();
          };
          reader.readAsDataURL(file);
        });
        
        // 获取音频时长（失败不影响上传）
        var durationPromise = getAudioDuration(file).catch(function() {
          // 获取时长失败不影响上传流程
          return 0;
        });
        
        // 同时开始上传
        var uploadPromise = uploadAudioFile(file);
        
        // 等待所有操作完成
        Promise.all([readerPromise, durationPromise, uploadPromise])
          .then(function(results) {
            var duration = results[1];
            var url = results[2];
            
            if (duration > 0) {
              currentAudioDuration = duration;
            }
            
            currentAudioUrl = url;
            currentAudioBase64 = '';
            currentAudioFile = null;
            removeAudioPreview();
            addAudioPreview(url, '', null);
            if (audioInput) audioInput.value = url;
            
            // 更新消息而不是添加新消息
            var durationText = currentAudioDuration > 0 ? '，时长：' + formatDuration(currentAudioDuration) : '';
          })
          .catch(function (err) {
            currentAudioUrl = '';
            currentAudioBase64 = '';
            currentAudioFile = null;
            currentAudioDuration = 0;
            removeAudioPreview();
          });
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
            removeAudioPreview();
            addAudioPreview('', val, null);
          } else if (isBase64) {
            currentAudioBase64 = val;
            currentAudioUrl = '';
            currentAudioId = '';
            removeAudioPreview();
            addAudioPreview('', '', null);
          } else {
            var isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)/i.test(val);
            if (isLocalhost) {
            }
            currentAudioUrl = val;
            currentAudioBase64 = '';
            currentAudioId = '';
            removeAudioPreview();
            addAudioPreview(val, '', null);
          }
        } else {
          removeAudioPreview();
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
            removeVideoPreview();
            addVideoPreview('', val, null);
          } else if (/^https?:\/\//i.test(val)) {
            currentVideoUrl = val;
            currentVideoId = '';
            removeVideoPreview();
            addVideoPreview(val, '', null);
          }
        } else {
          removeVideoPreview();
        }
      });
    }

    function identifyFace(videoInputValue, callback) {
      var body = {};
      if (/^\d+$/.test(videoInputValue)) {
        body.video_id = videoInputValue;
      } else {
        body.video_url = videoInputValue;
      }
      var authHeaders = (window.MediaStudio && window.MediaStudio.getAuthHeaders && window.MediaStudio.getAuthHeaders()) || {};
      fetch(apiOrigin() + '/api/yunwu/videos/identify-face', {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders),
        body: JSON.stringify(body),
      })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          var inner = (data && data.data && data.data.data) || (data && data.data) || data;
          var sessionId = (inner && inner.session_id) ||
            (data && data.data && data.data.session_id) ||
            (data && data.session_id) ||
            '';
          var faces = (inner && inner.face_data) || (inner && inner.faces) ||
            (data && data.data && data.data.face_data) || (data && data.data && data.data.faces) ||
            (data && data.faces) || [];
          if (!Array.isArray(faces) && faces && typeof faces === 'object') faces = [faces];
          if (!sessionId) {
            var msg = (data && (data.message || data.data && data.data.message)) || '未返回会话ID';
            if (/not found by id|video not found|视频.*未找到/i.test(String(msg))) {
              msg = '人脸识别未找到该视频。请使用「视频资源 ID」或直接粘贴视频 URL，不要使用任务 ID（task_id）。若该 ID 来自可灵任务，请到作品管理中找到对应任务，使用完成后返回的「视频链接」再试。';
            }
            if (callback) callback(new Error(msg));
            return;
          }
          currentSessionId = sessionId;
          if (faces.length > 0) {
            currentFaceId = (faces[0].face_id != null ? String(faces[0].face_id) : '-1');
          } else {
            currentFaceId = '-1';
          }
          if (callback) callback(null, { sessionId: sessionId, faces: faces, faceId: currentFaceId });
        })
        .catch(function (err) {
          if (callback) callback(err);
        });
    }

    btn.addEventListener('click', function () {
      var apiKey = (window.MediaStudio && window.MediaStudio.getYunwuApiKey()) || '';
      if (!apiKey) {
        alert('请先登录，由管理员在后台分配云雾 API Key 后即可使用');
        return;
      }
      var videoInputValue = (videoInput ? videoInput.value.trim() : '') || currentVideoUrl || currentVideoId || '';
      if (!videoInputValue) {
        return;
      }
      var audioInputValue = (audioInput ? audioInput.value.trim() : '') || '';
      if (!audioInputValue && !currentAudioUrl && !currentAudioId && !currentAudioBase64) {
        return;
      }
      
      btn.disabled = true;
      
      function processAudioAndSubmit() {
        var finalAudio = '';
        var useAudioId = false;
        
        var isId = /^\d+$/.test(audioInputValue || currentAudioId);
        if (isId) {
          finalAudio = audioInputValue || currentAudioId;
          useAudioId = true;
          submitLipSyncRequest();
        } else {
          var audioUrl = currentAudioUrl || (audioInputValue && /^https?:\/\//i.test(audioInputValue) ? audioInputValue : '');
          var audioBase64 = currentAudioBase64 || (audioInputValue && !/^https?:\/\//i.test(audioInputValue) && audioInputValue.length > 100 ? audioInputValue : '');
          
          if (!audioUrl && !audioBase64 && audioInputValue) {
            var isBase64Input = /^data:audio\//i.test(audioInputValue);
            if (isBase64Input) {
              audioBase64 = audioInputValue;
            } else if (/^https?:\/\//i.test(audioInputValue)) {
              audioUrl = audioInputValue;
            } else if (audioInputValue.length > 100) {
              audioBase64 = audioInputValue;
            }
          }
          
          if (!audioUrl && !audioBase64) {
            btn.disabled = false;
            return;
          }
          
          chooseUrlOrBase64(audioUrl, audioBase64, function (chosen) {
            if (!chosen) {
              btn.disabled = false;
              return;
            }
            finalAudio = chosen;
            useAudioId = false;
            submitLipSyncRequest();
          });
        }
        
        function submitLipSyncRequest() {
          // 从输入框读取设置值
          var startTimeInput = document.getElementById('lip-sound-start-time');
          var endTimeInput = document.getElementById('lip-sound-end-time');
          var insertTimeInput = document.getElementById('lip-sound-insert-time');
          var soundVolumeInput = document.getElementById('lip-sound-volume');
          var originalVolumeInput = document.getElementById('lip-original-audio-volume');
          
          var soundStartTime = startTimeInput ? (parseInt(startTimeInput.value, 10) || 0) : currentSettings.soundStartTime;
          var soundEndTime = endTimeInput ? (parseInt(endTimeInput.value, 10) || 5000) : currentSettings.soundEndTime;
          var soundInsertTime = insertTimeInput ? (parseInt(insertTimeInput.value, 10) || 1000) : currentSettings.soundInsertTime;
          var soundVolume = soundVolumeInput ? (parseFloat(soundVolumeInput.value) || 1.0) : currentSettings.soundVolume;
          var originalAudioVolume = originalVolumeInput ? (parseFloat(originalVolumeInput.value) || 1.0) : currentSettings.originalAudioVolume;
          
          // 更新 currentSettings
          currentSettings.soundStartTime = soundStartTime;
          currentSettings.soundEndTime = soundEndTime;
          currentSettings.soundInsertTime = soundInsertTime;
          currentSettings.soundVolume = soundVolume;
          currentSettings.originalAudioVolume = originalAudioVolume;
          
          // 添加用户消息
          var userContent = '视频：' + videoInputValue;
          userContent += ' 音频：' + (useAudioId ? 'ID:' + finalAudio : '已上传');
          userContent += ' 起点:' + soundStartTime + 'ms 终点:' + soundEndTime + 'ms 插入:' + soundInsertTime + 'ms';
          userContent += ' 音频音量:' + soundVolume.toFixed(1) + ' 原视频音量:' + originalAudioVolume.toFixed(1);

          var body = {
            session_id: currentSessionId,
            face_choose: [{
              face_id: currentFaceId || '-1',
              sound_start_time: soundStartTime,
              sound_end_time: soundEndTime,
              sound_insert_time: soundInsertTime,
              sound_volume: soundVolume,
              original_audio_volume: originalAudioVolume
            }]
          };
          if (useAudioId) {
            body.face_choose[0].audio_id = finalAudio;
          } else {
            body.face_choose[0].sound_file = finalAudio;
          }

          // 立即创建作品记录，显示"处理中"状态
          var workId = null;
          if (window.MediaStudio && window.MediaStudio.addWork) {
            workId = window.MediaStudio.addWork({
              type: 'lipsync',
              status: 'processing',
              taskId: null, // 临时为null，等待API返回
              prompt: userContent,
              title: '对口型视频',
              images: [],
              videos: [],
              audios: [],
              progress: 0,
              progressStatus: '正在提交请求...'
            });
            
            // 刷新作品列表显示
            if (window.MediaStudio && window.MediaStudio.refreshWorksList) {
              window.MediaStudio.refreshWorksList();
            }
          }
          
          var authHeadersLip = (window.MediaStudio && window.MediaStudio.getAuthHeaders && window.MediaStudio.getAuthHeaders()) || {};
          fetch(apiOrigin() + '/api/yunwu/videos/advanced-lip-sync', {
          method: 'POST',
          headers: Object.assign({ 'Content-Type': 'application/json' }, authHeadersLip),
          body: JSON.stringify(body),
        })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          var taskId = (data && data.data && (data.data.id || data.data.task_id || data.data.request_id)) ||
            (data && data.id) || (data && data.task_id) || (data && data.request_id) ||
            (data && data.data && data.data.request_id);
          if (!taskId) {
            var errMsg = (data && (data.message || data.error || (data.error && data.error.message))) ? (data.message || data.error || (data.error && data.error.message)) : '未返回任务 ID，请检查 API 响应';
            btn.disabled = false;
            
            // 更新作品状态为失败
            if (workId && window.MediaStudio && window.MediaStudio.updateWork) {
              window.MediaStudio.updateWork(workId, {
                status: 'failed',
                progressStatus: errMsg
              });
              if (window.MediaStudio && window.MediaStudio.refreshWorksList) {
                window.MediaStudio.refreshWorksList();
              }
            }
            
            return Promise.reject(new Error(errMsg));
          }
          
          // 更新作品记录的taskId
          if (workId && window.MediaStudio && window.MediaStudio.updateWork) {
            window.MediaStudio.updateWork(workId, {
              taskId: taskId,
              progressStatus: '任务已提交，等待处理...'
            });
            if (window.MediaStudio && window.MediaStudio.refreshWorksList) {
              window.MediaStudio.refreshWorksList();
            }
          }
          var setProgress = function (txt) {
            // 进度更新（已移除聊天显示）
          };
          return new Promise(function (resolve, reject) {
            pollTask(taskId, apiKey, workId, setProgress, resolve, reject, 0);
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
            if (window.MediaStudio && window.MediaStudio.refreshWorksList) window.MediaStudio.refreshWorksList();
          }
          if (!hasResources) {
            btn.disabled = false;
            return;
          }
          btn.disabled = false;
        })
        .catch(function (err) {
          if (workId && window.MediaStudio && window.MediaStudio.updateWork) {
            window.MediaStudio.updateWork(workId, { status: 'failed', error: (err && err.message) || String(err), progress: null, progressStatus: null });
            if (window.MediaStudio && window.MediaStudio.refreshWorksList) window.MediaStudio.refreshWorksList();
          }
          btn.disabled = false;
        });
        }
      }
      
      if (!currentSessionId || currentSessionId !== videoInputValue) {
        identifyFace(videoInputValue, function (err, result) {
          if (err) {
            btn.disabled = false;
            return;
          }
          processAudioAndSubmit();
        });
      } else {
        processAudioAndSubmit();
      }
    });
  }

  if (window.MediaStudio && window.MediaStudio.register) {
    window.MediaStudio.register(id, { name: name, icon: icon, getPanel: getPanel, init: init });
  }
})();
