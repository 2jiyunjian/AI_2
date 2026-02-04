/**
 * AI创作工坊 - 生成视频（独立文件）
 * 集成文生视频和图生视频功能
 */
(function () {
  var id = 'text2video';
  var name = '生成视频';
  var icon = '🎥';
  
  // 文生视频模型
  var T2V_MODELS = ['kling-v1', 'kling-v1-6', 'kling-v2-master', 'kling-v2-1-master', 'kling-v2-5-turbo', 'kling-v2-6'];
  // 图生视频模型
  var I2V_MODELS = ['kling-v1', 'kling-v1-5', 'kling-v1-6', 'kling-v2-master', 'kling-v2-1', 'kling-v2-1-master', 'kling-v2-5-turbo', 'kling-v2-6'];
  
  var MODES = ['std', 'pro'];
  var DURATIONS = ['5', '10'];
  var SOUNDS = ['on', 'off'];
  var ASPECT_RATIOS = ['', '16:9', '9:16', '1:1', '4:3', '3:4'];
  
  // 功能模式：text2video（文生视频）或 img2video（图生视频）
  var VIDEO_MODES = [
    { value: 'text2video', label: '文生视频' },
    { value: 'img2video', label: '图生视频' }
  ];
  var currentVideoMode = 'text2video';
  
  // 当前设置
  var currentSettings = {
    model: 'kling-v1',
    mode: 'std',
    duration: '5',
    sound: 'off',
    aspectRatio: '',
    cfgScale: 0.5  // 取值范围 [0, 1]
  };
  

  function getPanel() {
    return [
      '<div class="t2i-container">',
      '  <div class="t2i-header-bar">',
      '    <div class="t2i-header-title">生成视频</div>',
      '    <button type="button" class="t2i-header-model-btn" id="t2v-header-model-btn">',
      '      <span class="t2i-model-text" id="t2v-model-text">kling-v1</span>',
      '      <span class="t2i-dropdown-arrow">▼</span>',
      '    </button>',
      '  </div>',
      '  <div class="t2i-mode-tabs">',
      '    <button type="button" class="t2i-mode-tab active" data-mode="text2video" id="t2v-mode-tab-text2video">文生视频</button>',
      '    <button type="button" class="t2i-mode-tab" data-mode="img2video" id="t2v-mode-tab-img2video">图生视频</button>',
      '  </div>',
      '  <div class="t2i-input-area">',
      '    <div class="t2i-input-box">',
      '      <div class="t2v-image-upload-section" id="t2v-image-upload-section" style="display:none;">',
      '        <div class="t2v-frames-container">',
      '          <div class="t2v-frame-card" id="t2v-start-frame-card">',
      '            <div class="t2v-frame-card-content">',
      '              <div class="t2v-frame-icon">',
      '                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">',
      '                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>',
      '                  <circle cx="8.5" cy="8.5" r="1.5"></circle>',
      '                  <polyline points="21 15 16 10 5 21"></polyline>',
      '                </svg>',
      '                <span class="t2v-frame-plus">+</span>',
      '              </div>',
      '              <div class="t2v-frame-main-text">添加首帧图</div>',
      '              <div class="t2v-frame-sub-text">历史创作</div>',
      '            </div>',
      '            <div class="t2v-frame-preview" id="t2v-start-frame-preview" style="display:none;"></div>',
      '          </div>',
      '          <div class="t2v-frames-arrow">',
      '            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">',
      '              <path d="M7 17L17 7M17 7H7M17 7V17"></path>',
      '            </svg>',
      '          </div>',
      '          <div class="t2v-frame-card" id="t2v-end-frame-card">',
      '            <div class="t2v-frame-card-content">',
      '              <div class="t2v-frame-icon">',
      '                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">',
      '                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>',
      '                  <circle cx="8.5" cy="8.5" r="1.5"></circle>',
      '                  <polyline points="21 15 16 10 5 21"></polyline>',
      '                </svg>',
      '                <span class="t2v-frame-plus">+</span>',
      '              </div>',
      '              <div class="t2v-frame-main-text">添加尾帧图(可选)</div>',
      '              <div class="t2v-frame-sub-text">历史创作</div>',
      '            </div>',
      '            <div class="t2v-frame-preview" id="t2v-end-frame-preview" style="display:none;"></div>',
      '          </div>',
          '        </div>',
      '        <input type="file" id="t2v-start-image-file" accept="image/jpeg,image/jpg,image/png" style="display:none;">',
      '        <input type="file" id="t2v-end-image-file" accept="image/jpeg,image/jpg,image/png" style="display:none;">',
      '      </div>',
      '      <div class="t2i-prompt-row">',
      '        <textarea id="t2v-prompt" class="t2i-prompt-input" placeholder="输入正向提示词，描述你想要的视频内容，不能超过2500字符" maxlength="2500"></textarea>',
      '      </div>',
      '      <div class="t2i-prompt-row">',
      '        <textarea id="t2v-negative" class="t2i-prompt-input t2i-negative-input" placeholder="（可选）输入负向提示词，不想要的元素，不能超过2500字符" maxlength="2500"></textarea>',
      '      </div>',
      '    </div>',
      '  </div>',
      '  <div class="t2i-footer-bar">',
      '    <div class="t2i-footer-controls">',
      '      <button type="button" class="t2i-footer-btn" id="t2v-mode-btn">',
      '        <span id="t2v-mode-text">std</span>',
      '        <span class="t2i-dropdown-arrow">▼</span>',
      '      </button>',
      '      <button type="button" class="t2i-footer-btn" id="t2v-duration-btn">',
      '        <span id="t2v-duration-text">5秒</span>',
      '        <span class="t2i-dropdown-arrow">▼</span>',
      '      </button>',
      '      <button type="button" class="t2i-footer-btn" id="t2v-aspect-btn" style="display:none;">',
      '        <span id="t2v-aspect-text">默认</span>',
      '        <span class="t2i-dropdown-arrow">▼</span>',
      '      </button>',
      '      <button type="button" class="t2i-footer-btn" id="t2v-sound-btn" style="display:none;">',
      '        <span id="t2v-sound-text">off</span>',
      '        <span class="t2i-dropdown-arrow">▼</span>',
      '      </button>',
      '    </div>',
      '    <button type="button" class="t2i-generate-btn" id="t2v-submit">生成</button>',
      '  </div>',
      '</div>',
      '<div class="t2i-model-dropdown" id="t2v-model-dropdown" style="display:none;"></div>',
      '<div class="t2i-mode-dropdown" id="t2v-mode-dropdown" style="display:none;"></div>',
      '<div class="t2i-duration-dropdown" id="t2v-duration-dropdown" style="display:none;"></div>',
      '<div class="t2i-aspect-dropdown" id="t2v-aspect-dropdown" style="display:none;"></div>',
      '<div class="t2i-sound-dropdown" id="t2v-sound-dropdown" style="display:none;"></div>'
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
      body: JSON.stringify({ type: 'image', content: 'dGVzdA==' }),
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
          if (callback) callback(base64Str);
        } else if (url && (!isLocal || hasDeploy)) {
          if (callback) callback(url);
        } else if (base64) {
          var base64Str = extractBase64Str(base64);
          if (callback) callback(base64Str);
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
        if (callback) callback(base64Str);
      } else if (url) {
        if (callback) callback(url);
      } else {
        if (callback) callback('');
      }
    }
  }

  function getVal(id, def) {
    var el = document.getElementById(id);
    if (!el) return def;
    var v = el.value != null ? String(el.value).trim() : '';
    return v === '' ? def : v;
  }

  // 判断模型是否支持声音选项（V2.6及后续版本）
  function isSoundSupported(model) {
    if (!model || typeof model !== 'string') return false;
    // kling-v2-6 及后续版本支持声音
    if (model === 'kling-v2-6') return true;
    // 检查是否是 v2-6 之后的版本（例如 v2-7, v2-8 等）
    var match = model.match(/kling-v2-(\d+)/);
    if (match && parseInt(match[1], 10) >= 6) return true;
    return false;
  }

  // 判断模型是否支持 CFG Scale（kling-v2.x 不支持）
  function isCfgScaleSupported(model) {
    if (!model || typeof model !== 'string') return false;
    // kling-v2.x 系列不支持 CFG Scale
    if (model.startsWith('kling-v2')) return false;
    return true;
  }

  function normalizeTaskStatus(s) {
    var t = (s || '').toString().toLowerCase();
    if (['succeed', 'succeeded', 'success', 'completed', 'done', 'finish', 'finished'].indexOf(t) >= 0) return 'done';
    if (['fail', 'failed', 'error'].indexOf(t) >= 0) return 'failed';
    return 'processing';
  }

  function collectVideoUrls(obj, out) {
    if (!obj || typeof obj !== 'object') return;
    if (Array.isArray(obj)) {
      obj.forEach(function (x) {
        if (typeof x === 'string' && /^https?:\/\//i.test(x) && /\.(mp4|webm|mov|avi)$/i.test(x)) out.push(x);
        else if (x && typeof x === 'object' && x.url && /\.(mp4|webm|mov|avi)$/i.test(x.url)) out.push(x.url);
      });
      return;
    }
    var urlKeys = ['video', 'url', 'videos', 'video_url', 'output_video', 'result_url', 'output_url', 'videoUrl', 'video_file', 'output_file'];
    urlKeys.forEach(function (k) {
      var v = obj[k];
      if (typeof v === 'string' && /^https?:\/\//i.test(v) && /\.(mp4|webm|mov|avi)$/i.test(v)) out.push(v);
      else if (Array.isArray(v)) v.forEach(function (u) {
        if (typeof u === 'string' && /^https?:\/\//i.test(u) && /\.(mp4|webm|mov|avi)$/i.test(u)) out.push(u);
        else if (u && u.url && /\.(mp4|webm|mov|avi)$/i.test(u.url)) out.push(u.url);
      });
    });
    Object.keys(obj).forEach(function (k) {
      if (k !== 'task_status' && k !== 'status' && k !== 'task_id' && k !== 'id') {
        collectVideoUrls(obj[k], out);
      }
    });
  }

  function pollTask(taskId, apiKey, workId, setProgress, resolve, reject, pollCount, apiPath) {
    pollCount = pollCount || 0;
    var maxPolls = 240;
    if (pollCount > maxPolls) {
      reject(new Error('任务超时（10分钟仍未完成），已判定失败'));
      return;
    }
    var url = apiOrigin() + apiPath + '/' + encodeURIComponent(taskId);
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
          if (typeof v === 'string' && /\.(mp4|webm|mov|avi)$/i.test(v)) videos.push(v);
          else if (v && v.url && /\.(mp4|webm|mov|avi)$/i.test(v.url)) videos.push(v.url);
        }
        if (result.videos && Array.isArray(result.videos)) {
          result.videos.forEach(function (v) {
            if (typeof v === 'string' && /\.(mp4|webm|mov|avi)$/i.test(v)) videos.push(v);
            else if (v && v.url && /\.(mp4|webm|mov|avi)$/i.test(v.url)) videos.push(v.url);
          });
        }
        if (!videos.length && result.url) {
          var url = typeof result.url === 'string' ? result.url : (result.url && result.url.url);
          if (url && /\.(mp4|webm|mov|avi)$/i.test(url)) videos.push(url);
        }
        if (!videos.length && data && data.data && data.data.video) {
          var v = data.data.video;
          if (typeof v === 'string' && /\.(mp4|webm|mov|avi)$/i.test(v)) videos.push(v);
          else if (v && v.url && /\.(mp4|webm|mov|avi)$/i.test(v.url)) videos.push(v.url);
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
        if (status === 'failed') {
          reject(new Error((result.message || result.error || data.message || data.error || '任务失败') + ''));
          return;
        }
        if (status === 'done' && !videos.length) {
          var progressText = '状态已完成，等待视频生成，继续轮询…（' + (pollCount + 1) + '/' + maxPolls + '）';
          if (typeof setProgress === 'function') setProgress(progressText, statusRaw);
          if (workId && window.MediaStudio && window.MediaStudio.updateWork) {
            var pw = (window.MediaStudio.getWorks() || []).find(function (w) { return w.id === workId; });
            var n = ((pw && pw.progress) || 0) + 1;
            window.MediaStudio.updateWork(workId, { progress: n, progressStatus: statusRaw || '等待资源' });
          }
          if (window.MediaStudio && window.MediaStudio.refreshWorksList) window.MediaStudio.refreshWorksList();
          setTimeout(function () { pollTask(taskId, apiKey, workId, setProgress, resolve, reject, pollCount + 1, apiPath); }, 2500);
          return;
        }
        var progressText = '轮询中，状态=' + (statusRaw || '处理中') + (videos.length > 0 ? '，已检测到视频链接' : '') + (pollCount > 0 ? '（' + (pollCount + 1) + '/' + maxPolls + '）' : '');
        if (typeof setProgress === 'function') setProgress(progressText, statusRaw);
        if (workId && window.MediaStudio && window.MediaStudio.updateWork) {
          var pw = (window.MediaStudio.getWorks() || []).find(function (w) { return w.id === workId; });
          var n = ((pw && pw.progress) || 0) + 1;
          window.MediaStudio.updateWork(workId, { progress: n, progressStatus: statusRaw || '处理中' });
        }
        if (window.MediaStudio && window.MediaStudio.refreshWorksList) window.MediaStudio.refreshWorksList();
        setTimeout(function () { pollTask(taskId, apiKey, workId, setProgress, resolve, reject, pollCount + 1, apiPath); }, 2500);
      })
      .catch(reject);
  }

  function uploadImageFile(file) {
    return new Promise(function (resolve, reject) {
      if (!file || !file.type || !file.type.startsWith('image/')) {
        reject(new Error('请选择图片文件（.jpg/.jpeg/.png）'));
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        reject(new Error('图片文件过大，请选择 ≤10MB 的图片'));
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
          body: JSON.stringify({ type: 'image', content: raw }),
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
      };
      reader.onerror = function () { reject(new Error('读取文件失败')); };
      reader.readAsDataURL(file);
    });
  }


  function init(container) {
    if (!container) return;
    
    var modeTabText2video = document.getElementById('t2v-mode-tab-text2video');
    var modeTabImg2video = document.getElementById('t2v-mode-tab-img2video');
    var modelBtn = document.getElementById('t2v-header-model-btn');
    var modelText = document.getElementById('t2v-model-text');
    var modelDropdown = document.getElementById('t2v-model-dropdown');
    var modeBtn = document.getElementById('t2v-mode-btn');
    var modeText = document.getElementById('t2v-mode-text');
    var modeDropdown = document.getElementById('t2v-mode-dropdown');
    var durationBtn = document.getElementById('t2v-duration-btn');
    var durationText = document.getElementById('t2v-duration-text');
    var durationDropdown = document.getElementById('t2v-duration-dropdown');
    var aspectBtn = document.getElementById('t2v-aspect-btn');
    var aspectText = document.getElementById('t2v-aspect-text');
    var aspectDropdown = document.getElementById('t2v-aspect-dropdown');
    var soundBtn = document.getElementById('t2v-sound-btn');
    var soundText = document.getElementById('t2v-sound-text');
    var soundDropdown = document.getElementById('t2v-sound-dropdown');
    var generateBtn = document.getElementById('t2v-submit');
    var promptInput = document.getElementById('t2v-prompt');
    var negativeInput = document.getElementById('t2v-negative');
    var imageUploadSection = document.getElementById('t2v-image-upload-section');
    var startFrameCard = document.getElementById('t2v-start-frame-card');
    var endFrameCard = document.getElementById('t2v-end-frame-card');
    var startFramePreview = document.getElementById('t2v-start-frame-preview');
    var endFramePreview = document.getElementById('t2v-end-frame-preview');
    var startFileInput = document.getElementById('t2v-start-image-file');
    var endFileInput = document.getElementById('t2v-end-image-file');
    
    var currentImageUrl = '';
    var currentImageBase64 = '';
    var currentImageFile = null;
    var currentEndImageUrl = '';
    var currentEndImageBase64 = '';
    var currentEndImageFile = null;
    
    // 初始化功能模式标签页
    if (modeTabText2video && modeTabImg2video) {
      modeTabText2video.classList.remove('active');
      modeTabImg2video.classList.remove('active');
      if (currentVideoMode === 'text2video') {
        modeTabText2video.classList.add('active');
      } else {
        modeTabImg2video.classList.add('active');
      }
      
      modeTabText2video.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        currentVideoMode = 'text2video';
        modeTabText2video.classList.add('active');
        modeTabImg2video.classList.remove('active');
        switchVideoMode('text2video');
      });
      
      modeTabImg2video.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        currentVideoMode = 'img2video';
        modeTabText2video.classList.remove('active');
        modeTabImg2video.classList.add('active');
        switchVideoMode('img2video');
      });
    }

    // 切换视频模式
    function switchVideoMode(mode) {
      if (mode === 'img2video') {
        // 显示图片上传区域
        if (imageUploadSection) imageUploadSection.style.display = 'block';
        // 更新模型列表
        if (modelDropdown) {
          var modelHtml = I2V_MODELS.map(function(m) {
            var active = m === currentSettings.model ? 'active' : '';
            return '<div class="t2i-model-dropdown-item ' + active + '" data-model="' + m + '">' + m + '</div>';
          }).join('');
          modelDropdown.innerHTML = modelHtml;
          
          modelDropdown.querySelectorAll('.t2i-model-dropdown-item').forEach(function(item) {
            item.addEventListener('click', function(e) {
              e.stopPropagation();
              var model = item.getAttribute('data-model');
              currentSettings.model = model;
              if (modelText) modelText.textContent = model;
              modelDropdown.querySelectorAll('.t2i-model-dropdown-item').forEach(function(i) {
                i.classList.remove('active');
              });
              item.classList.add('active');
              modelDropdown.style.display = 'none';
            });
          });
        }
        // 更新提示词placeholder
        if (promptInput) {
          promptInput.placeholder = '正向提示词（可选，不能超过2500字符）';
        }
      } else {
        // 隐藏图片上传区域
        if (imageUploadSection) imageUploadSection.style.display = 'none';
        // 更新模型列表
        if (modelDropdown) {
          var modelHtml = T2V_MODELS.map(function(m) {
            var active = m === currentSettings.model ? 'active' : '';
            return '<div class="t2i-model-dropdown-item ' + active + '" data-model="' + m + '">' + m + '</div>';
          }).join('');
          modelDropdown.innerHTML = modelHtml;
          
          modelDropdown.querySelectorAll('.t2i-model-dropdown-item').forEach(function(item) {
            item.addEventListener('click', function(e) {
              e.stopPropagation();
              var model = item.getAttribute('data-model');
              currentSettings.model = model;
              if (modelText) modelText.textContent = model;
              modelDropdown.querySelectorAll('.t2i-model-dropdown-item').forEach(function(i) {
                i.classList.remove('active');
              });
              item.classList.add('active');
              modelDropdown.style.display = 'none';
              
              // 如果切换到不支持声音的模型，自动设置为 off
              if (!isSoundSupported(model)) {
                currentSettings.sound = 'off';
                updateFooterButtons();
              }
            });
          });
        }
        // 更新提示词placeholder
        if (promptInput) {
          promptInput.placeholder = '输入正向提示词，描述你想要的视频内容，不能超过2500字符';
        }
      }
      
      // 更新底部按钮显示
      updateFooterButtons();
    }
    
    // 更新底部按钮文本和显示状态
    function updateFooterButtons() {
      if (modeText) modeText.textContent = currentSettings.mode;
      if (durationText) durationText.textContent = currentSettings.duration + '秒';
      if (aspectText) {
        var aspectLabel = currentSettings.aspectRatio === '' ? '默认' : currentSettings.aspectRatio;
        aspectText.textContent = aspectLabel;
      }
      if (soundText) {
        var soundLabel = currentSettings.sound === 'on' ? '开启' : '关闭';
        soundText.textContent = soundLabel;
      }
      
      // 文生视频模式显示比例和声音按钮，图生视频模式隐藏
      if (aspectBtn && soundBtn) {
        if (currentVideoMode === 'text2video') {
          aspectBtn.style.display = 'flex';
          soundBtn.style.display = 'flex';
        } else {
          aspectBtn.style.display = 'none';
          soundBtn.style.display = 'none';
        }
      }
    }
    
    // 关闭所有下拉框的通用函数
    function closeAllDropdowns(excludeDropdown) {
      if (modelDropdown && modelDropdown !== excludeDropdown) {
        modelDropdown.style.display = 'none';
      }
      if (modeDropdown && modeDropdown !== excludeDropdown) {
        modeDropdown.style.display = 'none';
      }
      if (durationDropdown && durationDropdown !== excludeDropdown) {
        durationDropdown.style.display = 'none';
      }
      if (aspectDropdown && aspectDropdown !== excludeDropdown) {
        aspectDropdown.style.display = 'none';
      }
      if (soundDropdown && soundDropdown !== excludeDropdown) {
        soundDropdown.style.display = 'none';
      }
    }
    
    // 初始化清晰度下拉框（生成模式：std/pro）
    function initModeDropdown() {
      if (!modeDropdown || !modeBtn) return;
      
      var modeHtml = MODES.map(function(m) {
        var active = m === currentSettings.mode ? 'active' : '';
        var label = m === 'std' ? '标准' : '专业';
        return '<div class="t2i-model-dropdown-item ' + active + '" data-mode="' + m + '">' + label + '</div>';
      }).join('');
      modeDropdown.innerHTML = modeHtml;
      
      modeDropdown.querySelectorAll('.t2i-model-dropdown-item').forEach(function(item) {
        item.addEventListener('click', function(e) {
          e.stopPropagation();
          var mode = item.getAttribute('data-mode');
          currentSettings.mode = mode;
          modeDropdown.querySelectorAll('.t2i-model-dropdown-item').forEach(function(i) {
            i.classList.remove('active');
          });
          item.classList.add('active');
          modeDropdown.style.display = 'none';
          updateFooterButtons();
        });
      });
      
      modeDropdown.style.display = 'none';
      modeDropdown.style.position = 'fixed';
      modeDropdown.style.zIndex = '1000';
      
      modeBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        e.preventDefault();
        var currentDisplay = modeDropdown.style.display;
        var isVisible = currentDisplay === 'block' || window.getComputedStyle(modeDropdown).display === 'block';
        
        // 关闭其他所有下拉框
        closeAllDropdowns(modeDropdown);
        
        if (isVisible) {
          modeDropdown.style.display = 'none';
        } else {
          var rect = modeBtn.getBoundingClientRect();
          modeDropdown.style.display = 'block';
          modeDropdown.style.visibility = 'hidden';
          var dropdownHeight = modeDropdown.offsetHeight || 100;
          modeDropdown.style.visibility = 'visible';
          modeDropdown.style.left = rect.left + 'px';
          var topPosition = rect.top - dropdownHeight - 4;
          if (topPosition < 0) {
            modeDropdown.style.top = (rect.bottom + 4) + 'px';
          } else {
            modeDropdown.style.top = topPosition + 'px';
          }
        }
      });
    }
    
    // 初始化时长下拉框（5秒/10秒）
    function initDurationDropdown() {
      if (!durationDropdown || !durationBtn) return;
      
      var durationHtml = DURATIONS.map(function(d) {
        var active = d === currentSettings.duration ? 'active' : '';
        return '<div class="t2i-model-dropdown-item ' + active + '" data-duration="' + d + '">' + d + '秒</div>';
      }).join('');
      durationDropdown.innerHTML = durationHtml;
      
      durationDropdown.querySelectorAll('.t2i-model-dropdown-item').forEach(function(item) {
        item.addEventListener('click', function(e) {
          e.stopPropagation();
          var duration = item.getAttribute('data-duration');
          currentSettings.duration = duration;
          durationDropdown.querySelectorAll('.t2i-model-dropdown-item').forEach(function(i) {
            i.classList.remove('active');
          });
          item.classList.add('active');
          durationDropdown.style.display = 'none';
          updateFooterButtons();
        });
      });
      
      durationDropdown.style.display = 'none';
      durationDropdown.style.position = 'fixed';
      durationDropdown.style.zIndex = '1000';
      
      durationBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        e.preventDefault();
        var currentDisplay = durationDropdown.style.display;
        var isVisible = currentDisplay === 'block' || window.getComputedStyle(durationDropdown).display === 'block';
        if (isVisible) {
          durationDropdown.style.display = 'none';
        } else {
          var rect = durationBtn.getBoundingClientRect();
          durationDropdown.style.display = 'block';
          durationDropdown.style.visibility = 'hidden';
          var dropdownHeight = durationDropdown.offsetHeight || 100;
          durationDropdown.style.visibility = 'visible';
          durationDropdown.style.left = rect.left + 'px';
          var topPosition = rect.top - dropdownHeight - 4;
          if (topPosition < 0) {
            durationDropdown.style.top = (rect.bottom + 4) + 'px';
          } else {
            durationDropdown.style.top = topPosition + 'px';
          }
        }
      });
    }
    
    // 初始化比例下拉框（画面纵横比）
    function initAspectDropdown() {
      if (!aspectDropdown || !aspectBtn) return;
      
      var aspectHtml = ASPECT_RATIOS.map(function(r) {
        var active = r === currentSettings.aspectRatio ? 'active' : '';
        var label = r === '' ? '默认' : r;
        return '<div class="t2i-model-dropdown-item ' + active + '" data-aspect="' + r + '">' + label + '</div>';
      }).join('');
      aspectDropdown.innerHTML = aspectHtml;
      
      aspectDropdown.querySelectorAll('.t2i-model-dropdown-item').forEach(function(item) {
        item.addEventListener('click', function(e) {
          e.stopPropagation();
          var aspect = item.getAttribute('data-aspect');
          currentSettings.aspectRatio = aspect;
          aspectDropdown.querySelectorAll('.t2i-model-dropdown-item').forEach(function(i) {
            i.classList.remove('active');
          });
          item.classList.add('active');
          aspectDropdown.style.display = 'none';
          updateFooterButtons();
        });
      });
      
      aspectDropdown.style.display = 'none';
      aspectDropdown.style.position = 'fixed';
      aspectDropdown.style.zIndex = '1000';
      
      aspectBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        e.preventDefault();
        var currentDisplay = aspectDropdown.style.display;
        var isVisible = currentDisplay === 'block' || window.getComputedStyle(aspectDropdown).display === 'block';
        
        // 关闭其他所有下拉框
        closeAllDropdowns(aspectDropdown);
        
        if (isVisible) {
          aspectDropdown.style.display = 'none';
        } else {
          var rect = aspectBtn.getBoundingClientRect();
          aspectDropdown.style.display = 'block';
          aspectDropdown.style.visibility = 'hidden';
          var dropdownHeight = aspectDropdown.offsetHeight || 100;
          aspectDropdown.style.visibility = 'visible';
          aspectDropdown.style.left = rect.left + 'px';
          var topPosition = rect.top - dropdownHeight - 4;
          if (topPosition < 0) {
            aspectDropdown.style.top = (rect.bottom + 4) + 'px';
          } else {
            aspectDropdown.style.top = topPosition + 'px';
          }
        }
      });
    }
    
    // 初始化声音下拉框（开启/关闭）
    function initSoundDropdown() {
      if (!soundDropdown || !soundBtn) return;
      
      var soundSupported = isSoundSupported(currentSettings.model);
      if (!soundSupported && currentSettings.sound !== 'off') {
        currentSettings.sound = 'off';
      }
      
      var soundHtml = SOUNDS.map(function(s) {
        var active = s === currentSettings.sound ? 'active' : '';
        var disabled = !soundSupported && s === 'on';
        var disabledClass = disabled ? 'disabled' : '';
        var label = s === 'on' ? '开启' : '关闭';
        return '<div class="t2i-model-dropdown-item ' + active + ' ' + disabledClass + '" data-sound="' + s + '"' + (disabled ? ' style="opacity: 0.5; cursor: not-allowed;"' : '') + '>' + label + '</div>';
      }).join('');
      soundDropdown.innerHTML = soundHtml;
      
      soundDropdown.querySelectorAll('.t2i-model-dropdown-item').forEach(function(item) {
        item.addEventListener('click', function(e) {
          e.stopPropagation();
          if (item.classList.contains('disabled')) return;
          var sound = item.getAttribute('data-sound');
          currentSettings.sound = sound;
          soundDropdown.querySelectorAll('.t2i-model-dropdown-item').forEach(function(i) {
            i.classList.remove('active');
          });
          item.classList.add('active');
          soundDropdown.style.display = 'none';
          updateFooterButtons();
        });
      });
      
      soundDropdown.style.display = 'none';
      soundDropdown.style.position = 'fixed';
      soundDropdown.style.zIndex = '1000';
      
      soundBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        e.preventDefault();
        var currentDisplay = soundDropdown.style.display;
        var isVisible = currentDisplay === 'block' || window.getComputedStyle(soundDropdown).display === 'block';
        if (isVisible) {
          soundDropdown.style.display = 'none';
        } else {
          var rect = soundBtn.getBoundingClientRect();
          soundDropdown.style.display = 'block';
          soundDropdown.style.visibility = 'hidden';
          var dropdownHeight = soundDropdown.offsetHeight || 100;
          soundDropdown.style.visibility = 'visible';
          soundDropdown.style.left = rect.left + 'px';
          var topPosition = rect.top - dropdownHeight - 4;
          if (topPosition < 0) {
            soundDropdown.style.top = (rect.bottom + 4) + 'px';
          } else {
            soundDropdown.style.top = topPosition + 'px';
          }
        }
      });
    }
    
    // 初始化模型下拉框
    if (modelDropdown) {
      var modelHtml = T2V_MODELS.map(function(m) {
        var active = m === currentSettings.model ? 'active' : '';
        return '<div class="t2i-model-dropdown-item ' + active + '" data-model="' + m + '">' + m + '</div>';
      }).join('');
      modelDropdown.innerHTML = modelHtml;
      
      modelDropdown.querySelectorAll('.t2i-model-dropdown-item').forEach(function(item) {
        item.addEventListener('click', function(e) {
          e.stopPropagation();
          var model = item.getAttribute('data-model');
          currentSettings.model = model;
          if (modelText) modelText.textContent = model;
          modelDropdown.querySelectorAll('.t2i-model-dropdown-item').forEach(function(i) {
            i.classList.remove('active');
          });
          item.classList.add('active');
          modelDropdown.style.display = 'none';
          
              // 如果切换到不支持声音的模型，自动设置为 off
              if (currentVideoMode === 'text2video' && !isSoundSupported(model)) {
                currentSettings.sound = 'off';
                updateFooterButtons();
                // 重新初始化声音下拉框以反映模型变化
                if (soundDropdown) {
                  initSoundDropdown();
                }
              }
        });
      });
      
      modelDropdown.style.display = 'none';
      modelDropdown.style.position = 'fixed';
      modelDropdown.style.zIndex = '1000';
    }
    
    // 模型按钮点击事件
    if (modelBtn) {
      modelBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        e.preventDefault();
        
        if (!modelDropdown) return;
        
        var currentDisplay = modelDropdown.style.display;
        var computedDisplay = window.getComputedStyle(modelDropdown).display;
        var isVisible = currentDisplay === 'block' || computedDisplay === 'block';
        
        // 关闭其他所有下拉框
        closeAllDropdowns(modelDropdown);
        
        if (isVisible) {
          modelDropdown.style.display = 'none';
        } else {
          var rect = modelBtn.getBoundingClientRect();
          modelDropdown.style.display = 'block';
          modelDropdown.style.visibility = 'hidden';
          var dropdownHeight = modelDropdown.offsetHeight || 200;
          modelDropdown.style.visibility = 'visible';
          
          modelDropdown.style.left = rect.left + 'px';
          var topPosition = rect.top - dropdownHeight - 4;
          if (topPosition < 0) {
            modelDropdown.style.top = (rect.bottom + 4) + 'px';
          } else {
            modelDropdown.style.top = topPosition + 'px';
          }
        }
      });
    }
    
    // 初始化四个底部选择框
    initModeDropdown();
    initDurationDropdown();
    initAspectDropdown();
    initSoundDropdown();
    
    // 初始化时更新按钮显示
    updateFooterButtons();
    
    // 添加首帧图预览
    function addStartFramePreview(imageUrl, imageBase64, file) {
      if (!startFrameCard || !startFramePreview) return;
      
      var previewUrl = imageUrl || (imageBase64 ? (imageBase64.startsWith('data:') ? imageBase64 : 'data:image/jpeg;base64,' + imageBase64) : '');
      if (!previewUrl && file) {
        previewUrl = URL.createObjectURL(file);
      }
      
      var cardContent = startFrameCard.querySelector('.t2v-frame-card-content');
      if (cardContent) cardContent.style.display = 'none';
      
      startFramePreview.style.display = 'block';
      startFramePreview.innerHTML = '<img src="' + previewUrl.replace(/"/g, '&quot;') + '" alt="首帧图" class="t2v-frame-preview-img"><span class="t2v-frame-remove-btn">×</span>';
      
      var removeBtn = startFramePreview.querySelector('.t2v-frame-remove-btn');
      if (removeBtn) {
        removeBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          removeStartFramePreview();
        });
      }
      
      if (previewUrl && previewUrl.startsWith('blob:')) {
        startFramePreview.querySelector('img').onload = function() {
          URL.revokeObjectURL(previewUrl);
        };
      }
    }
    
    // 移除首帧图预览
    function removeStartFramePreview() {
      if (startFrameCard && startFramePreview) {
        var cardContent = startFrameCard.querySelector('.t2v-frame-card-content');
        if (cardContent) cardContent.style.display = 'flex';
        startFramePreview.style.display = 'none';
        startFramePreview.innerHTML = '';
      }
      currentImageUrl = '';
      currentImageBase64 = '';
      currentImageFile = null;
      if (startFileInput) startFileInput.value = '';
    }
    
    // 添加尾帧图预览
    function addEndFramePreview(imageUrl, imageBase64, file) {
      if (!endFrameCard || !endFramePreview) return;
      
      var previewUrl = imageUrl || (imageBase64 ? (imageBase64.startsWith('data:') ? imageBase64 : 'data:image/jpeg;base64,' + imageBase64) : '');
      if (!previewUrl && file) {
        previewUrl = URL.createObjectURL(file);
      }
      
      var cardContent = endFrameCard.querySelector('.t2v-frame-card-content');
      if (cardContent) cardContent.style.display = 'none';
      
      endFramePreview.style.display = 'block';
      endFramePreview.innerHTML = '<img src="' + previewUrl.replace(/"/g, '&quot;') + '" alt="尾帧图" class="t2v-frame-preview-img"><span class="t2v-frame-remove-btn">×</span>';
      
      var removeBtn = endFramePreview.querySelector('.t2v-frame-remove-btn');
      if (removeBtn) {
        removeBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          removeEndFramePreview();
        });
      }
      
      if (previewUrl && previewUrl.startsWith('blob:')) {
        endFramePreview.querySelector('img').onload = function() {
          URL.revokeObjectURL(previewUrl);
        };
      }
    }
    
    // 移除尾帧图预览
    function removeEndFramePreview() {
      if (endFrameCard && endFramePreview) {
        var cardContent = endFrameCard.querySelector('.t2v-frame-card-content');
        if (cardContent) cardContent.style.display = 'flex';
        endFramePreview.style.display = 'none';
        endFramePreview.innerHTML = '';
      }
      currentEndImageUrl = '';
      currentEndImageBase64 = '';
      currentEndImageFile = null;
      if (endFileInput) endFileInput.value = '';
    }
    
    // 首帧图卡片点击事件
    if (startFrameCard && startFileInput) {
      startFrameCard.addEventListener('click', function(e) {
        if (e.target.closest('.t2v-frame-remove-btn')) return;
        if (e.target.closest('.t2v-frame-preview')) return;
        if (e.target.closest('.t2v-frame-sub-text')) return; // 历史创作文本单独处理
        startFileInput.click();
      });
      
      startFileInput.addEventListener('change', function(e) {
        var file = e.target.files && e.target.files[0];
        if (!file) return;
        currentImageFile = file;
        var reader = new FileReader();
        reader.onload = function(e) {
          var base64 = e.target.result;
          currentImageBase64 = base64;
          uploadImageFile(file)
            .then(function(url) {
              currentImageUrl = url;
              var isLocalUrl = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)/i.test(url);
              if (isLocalUrl) {
                currentImageBase64 = base64;
              } else {
                currentImageBase64 = '';
              }
              addStartFramePreview(currentImageUrl, currentImageBase64, file);
              startFileInput.value = '';
            })
            .catch(function(err) {
              addStartFramePreview('', currentImageBase64, file);
              startFileInput.value = '';
            });
        };
        reader.onerror = function() {
          startFileInput.value = '';
        };
        reader.readAsDataURL(file);
      });
    }
    
    // 历史创作选择功能：打开图片选择模态框
    function openHistoryImageSelector(callback) {
      var works = (window.MediaStudio && window.MediaStudio.getWorks()) || [];
      var imageWorks = works.filter(function(w) {
        return w.images && w.images.length > 0 && (w.type === 'text2img' || w.type === 'img2img' || w.type === 'multi-img' || w.type === 'editimg');
      });
      
      if (imageWorks.length === 0) {
        alert('暂无历史图片作品');
        return;
      }
      
      // 创建模态框
      var modal = document.createElement('div');
      modal.className = 't2v-history-modal-overlay';
      modal.innerHTML = [
        '<div class="t2v-history-modal-content">',
        '  <div class="t2v-history-modal-header">',
        '    <h3>选择历史图片</h3>',
        '    <button type="button" class="t2v-history-modal-close">×</button>',
        '  </div>',
        '  <div class="t2v-history-modal-body" id="t2v-history-modal-body">',
        '  </div>',
        '</div>'
      ].join('');
      
      var modalBody = modal.querySelector('#t2v-history-modal-body');
      var imagesHtml = '';
      
      imageWorks.forEach(function(work) {
        if (work.images && work.images.length > 0) {
          work.images.forEach(function(imgUrl) {
            imagesHtml += '<div class="t2v-history-image-item" data-url="' + String(imgUrl).replace(/"/g, '&quot;') + '">' +
              '<img src="' + String(imgUrl).replace(/"/g, '&quot;') + '" alt="历史图片" referrerpolicy="no-referrer" loading="lazy">' +
              '</div>';
          });
        }
      });
      
      modalBody.innerHTML = imagesHtml || '<div style="padding: 40px; text-align: center; color: var(--muted);">暂无图片</div>';
      
      // 绑定图片选择事件
      modalBody.querySelectorAll('.t2v-history-image-item').forEach(function(item) {
        item.addEventListener('click', function() {
          var url = item.getAttribute('data-url');
          if (callback && url) {
            callback(url);
          }
          document.body.removeChild(modal);
        });
      });
      
      // 关闭按钮
      var closeBtn = modal.querySelector('.t2v-history-modal-close');
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
    
    // 首帧图卡片：点击"历史创作"文本打开历史选择
    if (startFrameCard) {
      var startHistoryText = startFrameCard.querySelector('.t2v-frame-sub-text');
      if (startHistoryText) {
        startHistoryText.style.cursor = 'pointer';
        startHistoryText.style.color = 'var(--primary)';
        startHistoryText.addEventListener('click', function(e) {
          e.stopPropagation();
          openHistoryImageSelector(function(url) {
            currentImageUrl = url;
            addStartFramePreview(url, '', null);
          });
        });
      }
    }
    
    // 尾帧图卡片：点击"历史创作"文本打开历史选择
    if (endFrameCard) {
      var endHistoryText = endFrameCard.querySelector('.t2v-frame-sub-text');
      if (endHistoryText) {
        endHistoryText.style.cursor = 'pointer';
        endHistoryText.style.color = 'var(--primary)';
        endHistoryText.addEventListener('click', function(e) {
          e.stopPropagation();
          openHistoryImageSelector(function(url) {
            currentEndImageUrl = url;
            addEndFramePreview(url, '', null);
          });
        });
      }
    }
    
    // 尾帧图卡片点击事件
    if (endFrameCard && endFileInput) {
      endFrameCard.addEventListener('click', function(e) {
        if (e.target.closest('.t2v-frame-remove-btn')) return;
        if (e.target.closest('.t2v-frame-preview')) return;
        if (e.target.closest('.t2v-frame-sub-text')) return; // 历史创作文本单独处理
        endFileInput.click();
      });
      
      endFileInput.addEventListener('change', function(e) {
        var file = e.target.files && e.target.files[0];
        if (!file) return;
        currentEndImageFile = file;
        var reader = new FileReader();
        reader.onload = function(e) {
          var base64 = e.target.result;
          currentEndImageBase64 = base64;
          uploadImageFile(file)
            .then(function(url) {
              currentEndImageUrl = url;
              var isLocalUrl = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)/i.test(url);
              if (isLocalUrl) {
                currentEndImageBase64 = base64;
              } else {
                currentEndImageBase64 = '';
              }
              addEndFramePreview(currentEndImageUrl, currentEndImageBase64, file);
              endFileInput.value = '';
            })
            .catch(function(err) {
              addEndFramePreview('', currentEndImageBase64, file);
              endFileInput.value = '';
            });
        };
        reader.onerror = function() {
          endFileInput.value = '';
        };
        reader.readAsDataURL(file);
      });
    }
    
    // 供作品管理「编辑/重新生成」回填图生视频参考图
    window.MediaStudio.fillImg2videoReference = function(url) {
      if (!url) return;
      var tab = document.getElementById('t2v-mode-tab-img2video');
      if (tab && !tab.classList.contains('active')) {
        tab.click();
      }
      setTimeout(function() {
        if (addStartFramePreview) {
          currentImageUrl = url;
          addStartFramePreview(url, '', null);
        }
      }, 150);
    };
    
    // 点击外部关闭下拉框
    setTimeout(function() {
      document.addEventListener('click', function(e) {
        if (modelDropdown && modelBtn && !modelBtn.contains(e.target) && !modelDropdown.contains(e.target)) {
          modelDropdown.style.display = 'none';
        }
        if (modeDropdown && modeBtn && !modeBtn.contains(e.target) && !modeDropdown.contains(e.target)) {
          modeDropdown.style.display = 'none';
        }
        if (durationDropdown && durationBtn && !durationBtn.contains(e.target) && !durationDropdown.contains(e.target)) {
          durationDropdown.style.display = 'none';
        }
        if (aspectDropdown && aspectBtn && !aspectBtn.contains(e.target) && !aspectDropdown.contains(e.target)) {
          aspectDropdown.style.display = 'none';
        }
        if (soundDropdown && soundBtn && !soundBtn.contains(e.target) && !soundDropdown.contains(e.target)) {
          soundDropdown.style.display = 'none';
        }
      });
    }, 100);
    
    // 初始切换模式
    switchVideoMode(currentVideoMode);
    
    // 生成按钮点击事件
    if (generateBtn) {
      generateBtn.addEventListener('click', function() {
      var apiKey = (window.MediaStudio && window.MediaStudio.getYunwuApiKey()) || '';
      if (!apiKey) {
        alert('请先登录，由管理员在后台分配云雾 API Key 后即可使用');
        return;
      }
      var prompt = getVal('t2v-prompt', '');
        var negativePrompt = getVal('t2v-negative', '');
      
        if (currentVideoMode === 'text2video') {
          // 文生视频
      if (!prompt) {
        return;
      }
      if (prompt.length > 2500) {
        return;
      }
      if (negativePrompt && negativePrompt.length > 2500) {
        return;
      }
          
          // 添加用户消息
          var userContent = prompt;
          if (negativePrompt) userContent += ' 负向提示词：' + negativePrompt;
          userContent += ' 使用模型：' + currentSettings.model;
          userContent += ' 生成模式：' + currentSettings.mode;
          userContent += ' 视频时长：' + currentSettings.duration + '秒';
          if (currentSettings.sound) userContent += ' 声音：' + currentSettings.sound;
          if (currentSettings.aspectRatio) userContent += ' 画面纵横比：' + currentSettings.aspectRatio;

      var body = {
            model_name: currentSettings.model,
        prompt: prompt,
            mode: currentSettings.mode,
            duration: currentSettings.duration,
            sound: currentSettings.sound
      };
      
      if (negativePrompt) body.negative_prompt = negativePrompt;
          if (currentSettings.aspectRatio) body.aspect_ratio = currentSettings.aspectRatio;
          // 只有支持的模型才发送 CFG Scale 参数
          if (isCfgScaleSupported(currentSettings.model) && currentSettings.cfgScale !== undefined) {
            var cfgValue = parseFloat(currentSettings.cfgScale);
            if (!isNaN(cfgValue) && cfgValue >= 0 && cfgValue <= 1) {
              body.cfg_scale = cfgValue;
            }
          }
          
          generateBtn.disabled = true;
      
      // 立即创建作品记录，显示"处理中"状态
      var workId = null;
      var workType = currentVideoMode === 'img2video' ? 'img2video' : 'text2video';
      if (window.MediaStudio && window.MediaStudio.addWork) {
        workId = window.MediaStudio.addWork({
          type: workType,
          status: 'processing',
          taskId: null, // 临时为null，等待API返回
          prompt: prompt,
          title: prompt.toString().slice(0, 80),
          images: [],
          videos: [],
          audios: [],
          model_name: currentSettings.model,
          progress: 0,
          progressStatus: '正在提交请求...'
        });
        
        // 刷新作品列表显示
        if (window.MediaStudio && window.MediaStudio.refreshWorksList) {
          window.MediaStudio.refreshWorksList();
        }
      }
      
      var authHeaders = (window.MediaStudio && window.MediaStudio.getAuthHeaders && window.MediaStudio.getAuthHeaders()) || {};
      fetch(apiOrigin() + '/api/yunwu/videos/text2video', {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders),
        body: JSON.stringify(body),
      })
            .then(function(r) {
              if (!r.ok) {
                return r.text().then(function(text) {
                  var errorData = null;
                  try { errorData = text ? JSON.parse(text) : null; } catch (e) {}
                  var errMsg = (errorData && (errorData.message || errorData.error || (errorData.error && errorData.error.message))) || 
                               (text && text.trim() ? text.trim() : null) || 
                               ('HTTP ' + r.status + ' 错误');
                  // 如果错误消息包含特定关键词，提供更友好的提示
                  if (errMsg && (errMsg.indexOf('负载已饱和') >= 0 || errMsg.indexOf('负载') >= 0 || errMsg.indexOf('饱和') >= 0)) {
                    errMsg = '当前服务负载已饱和，请稍后再试';
                  }
                  
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
                  
                  throw new Error(errMsg);
                });
              }
              return r.json().catch(function() {
                // 如果 JSON 解析失败，返回空对象
                return {};
              });
            })
            .then(function(data) {
          var taskId = (data && data.data && (data.data.id || data.data.task_id || data.data.request_id)) ||
            (data && data.id) || (data && data.task_id) || (data && data.request_id) ||
            (data && data.data && data.data.request_id);
          if (!taskId) {
                var errMsg = (data && (data.message || data.error || (data.error && data.error.message))) ? (data.message || data.error || (data.error && data.error.message)) : '未返回任务 ID';
                generateBtn.disabled = false;
                
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
          taskId = String(taskId);
          
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
              
              // 移除loading消息，添加轮询消息
              chatMessages.pop();
              
              var setProgress = function(txt) {
                chatMessages[chatMessages.length - 1].content = txt;
                saveChatMessages();
              };
              
              return new Promise(function(resolve, reject) {
                pollTask(taskId, apiKey, workId, setProgress, resolve, reject, 0, '/api/yunwu/videos/text2video');
          });
        })
            .then(function(result) {
          var videos = (result && result.videos) || [];
              if (videos.length === 0) {
                generateBtn.disabled = false;
                return;
              }
              
              // 更新最后一条消息
              chatMessages.pop();
              
          if (workId && window.MediaStudio && window.MediaStudio.updateWork) {
            var updates = {
                  status: 'ready',
              videos: videos,
              progress: null,
              progressStatus: null
            };
            if (videos.length) updates.resultUrl = videos[0];
                if (result.videoId) updates.videoId = result.videoId;
            window.MediaStudio.updateWork(workId, updates);
            if (window.MediaStudio && window.MediaStudio.refreshWorksList) window.MediaStudio.refreshWorksList();
          }
              
              generateBtn.disabled = false;
            })
            .catch(function(err) {
              // 移除loading消息（如果存在）
              if (chatMessages.length > 0 && chatMessages[chatMessages.length - 1].content === '正在加载，请稍候...') {
                chatMessages.pop();
              }
              var errorMsg = err.message || String(err);
              // 如果错误消息包含"负载已饱和"等关键词，提供更友好的提示
              if (errorMsg.indexOf('负载已饱和') >= 0 || errorMsg.indexOf('负载') >= 0) {
                errorMsg = '当前服务负载已饱和，请稍后再试';
              }
              if (workId && window.MediaStudio && window.MediaStudio.updateWork) {
                window.MediaStudio.updateWork(workId, { status: 'failed', error: errorMsg, progress: null, progressStatus: null });
                if (window.MediaStudio && window.MediaStudio.refreshWorksList) window.MediaStudio.refreshWorksList();
              }
              generateBtn.disabled = false;
            });
        } else {
          // 图生视频
          if (!currentImageUrl && !currentImageBase64) {
            return;
          }
          if (prompt && prompt.length > 2500) {
            return;
          }
          if (negativePrompt && negativePrompt.length > 2500) {
            return;
          }
          
          chooseUrlOrBase64(currentImageUrl, currentImageBase64, function(finalImage) {
            if (!finalImage) {
              return;
            }
            
            // 添加用户消息
            var userContent = '参考图像：已上传';
            if (prompt) userContent += ' 正向提示词：' + prompt;
            if (negativePrompt) userContent += ' 负向提示词：' + negativePrompt;
            userContent += ' 使用模型：' + currentSettings.model;
            userContent += ' 生成模式：' + currentSettings.mode;
            userContent += ' 视频时长：' + currentSettings.duration + '秒';
            addChatMessage('user', userContent, []);
            addChatMessage('assistant', '正在加载，请稍候...', []);
            
            var body = {
              model_name: currentSettings.model,
              image: finalImage,
              mode: currentSettings.mode,
              duration: parseInt(currentSettings.duration, 10)
            };
            
            if (prompt) body.prompt = prompt;
            if (negativePrompt) body.negative_prompt = negativePrompt;
            // 只有支持的模型才发送 CFG Scale 参数
            if (isCfgScaleSupported(currentSettings.model) && currentSettings.cfgScale !== undefined) {
              var cfgScale = parseFloat(currentSettings.cfgScale);
              if (!isNaN(cfgScale) && cfgScale >= 0 && cfgScale <= 1) {
                body.cfg_scale = cfgScale;
              }
            }
            
            generateBtn.disabled = true;
            var workId = null;
            var authHeadersImg = (window.MediaStudio && window.MediaStudio.getAuthHeaders && window.MediaStudio.getAuthHeaders()) || {};
            fetch(apiOrigin() + '/api/yunwu/videos/image2video', {
              method: 'POST',
              headers: Object.assign({ 'Content-Type': 'application/json' }, authHeadersImg),
              body: JSON.stringify(body),
            })
              .then(function(r) {
                if (!r.ok) {
                  return r.text().then(function(text) {
                    var errorData = null;
                    try { errorData = text ? JSON.parse(text) : null; } catch (e) {}
                    var errMsg = (errorData && (errorData.message || errorData.error || (errorData.error && errorData.error.message))) || 
                                 (text && text.trim() ? text.trim() : null) || 
                                 ('HTTP ' + r.status + ' 错误');
                    // 如果错误消息包含特定关键词，提供更友好的提示
                    if (errMsg && (errMsg.indexOf('负载已饱和') >= 0 || errMsg.indexOf('负载') >= 0 || errMsg.indexOf('饱和') >= 0)) {
                      errMsg = '当前服务负载已饱和，请稍后再试';
                    }
                    throw new Error(errMsg);
                  });
                }
                return r.json().catch(function() {
                  // 如果 JSON 解析失败，返回空对象
                  return {};
                });
              })
              .then(function(data) {
                var taskId = (data && data.data && (data.data.id || data.data.task_id || data.data.request_id)) ||
                  (data && data.id) || (data && data.task_id) || (data && data.request_id) ||
                  (data && data.data && data.data.request_id);
                if (!taskId) {
                  var errMsg = (data && (data.message || data.error || (data.error && data.error.message))) ? (data.message || data.error || (data.error && data.error.message)) : '未返回任务 ID';
                  generateBtn.disabled = false;
                  return Promise.reject(new Error(errMsg));
                }
                taskId = String(taskId);
                if (window.MediaStudio && window.MediaStudio.addWork) {
                  workId = window.MediaStudio.addWork({
                    type: 'img2video',
                    status: 'processing',
                    taskId: taskId,
                    title: (prompt || '图生视频').toString().slice(0, 80),
                    images: [],
                    videos: [],
                    audios: [],
                    model_name: currentSettings.model,
                  });
                }
                
                // 移除loading消息，添加轮询消息
                chatMessages.pop();
                
                var setProgress = function(txt) {
                  chatMessages[chatMessages.length - 1].content = txt;
                  saveChatMessages();
                };
                
                return new Promise(function(resolve, reject) {
                  pollTask(taskId, apiKey, workId, setProgress, resolve, reject, 0, '/api/yunwu/videos/image2video');
                });
              })
              .then(function(result) {
                var videos = (result && result.videos) || [];
                if (videos.length === 0) {
                  generateBtn.disabled = false;
                  return;
                }
                
                // 更新最后一条消息
                chatMessages.pop();
                
                if (workId && window.MediaStudio && window.MediaStudio.updateWork) {
                  var updates = {
                    status: 'ready',
                    videos: videos,
                    progress: null,
                    progressStatus: null
                  };
                  if (videos.length) updates.resultUrl = videos[0];
                  if (result.videoId) updates.videoId = result.videoId;
                  window.MediaStudio.updateWork(workId, updates);
                  if (window.MediaStudio && window.MediaStudio.refreshWorksList) window.MediaStudio.refreshWorksList();
                }
                
                generateBtn.disabled = false;
              })
              .catch(function(err) {
                chatMessages.pop();
                addChatMessage('assistant', '✗ ' + (err.message || String(err)), []);
          if (workId && window.MediaStudio && window.MediaStudio.updateWork) {
            window.MediaStudio.updateWork(workId, { status: 'failed', error: (err && err.message) || String(err), progress: null, progressStatus: null });
            if (window.MediaStudio && window.MediaStudio.refreshWorksList) window.MediaStudio.refreshWorksList();
          }
                generateBtn.disabled = false;
        });
    });
        }
      });
    }
  }

  if (window.MediaStudio && window.MediaStudio.register) {
    window.MediaStudio.register(id, { name: name, icon: icon, getPanel: getPanel, init: init });
  }
})();
