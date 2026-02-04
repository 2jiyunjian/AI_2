/**
 * AI创作工坊 - 图片生成（独立文件）
 * 对接云雾可灵图像生成 API，参考图像仅支持图片 URL
 */
(function () {
  var id = 'text2img';
  var name = '生成图像';
  var icon = '🖼️';
  var MODELS = ['kling-v1', 'kling-v1-5', 'kling-v2', 'kling-v2-new', 'kling-v2-1'];
  var MULTI_MODELS = ['kling-v2', 'kling-v2-1'];
  var RESOLUTIONS = ['1k', '2k'];
  var RATIOS = ['16:9', '9:16', '1:1', '4:3', '3:4', '3:2', '2:3', '21:9'];
  var REF_TYPES = ['', 'subject', 'face'];
  var MODES = [
    { value: 'text2img', label: '文生图' },
    { value: 'img2img', label: '单图参考' },
    { value: 'multi-img', label: '多图参考' }
  ];
  var MAX_SUBJECT_IMAGES = 4;
  var MIN_SUBJECT_IMAGES = 1;
  var currentMode = 'text2img';

  function getPanel() {
    // 使用默认设置值
    var defaultRes = '1k';
    var defaultRatio = '1:1';
    var defaultN = 1;
    return [
      '<div class="t2i-container">',
      '  <div class="t2i-header-bar">',
      '    <div class="t2i-header-title">图片生成</div>',
      '    <button type="button" class="t2i-header-model-btn" id="t2i-header-model-btn">',
      '      <span class="t2i-model-text" id="t2i-model-text">kling-v1</span>',
      '      <span class="t2i-dropdown-arrow">▼</span>',
      '    </button>',
      '  </div>',
      '  <div class="t2i-mode-tabs">',
      '    <button type="button" class="t2i-mode-tab active" data-mode="text2img" id="t2i-mode-tab-text2img">文生图</button>',
      '    <button type="button" class="t2i-mode-tab" data-mode="img2img" id="t2i-mode-tab-img2img">单图参考</button>',
      '    <button type="button" class="t2i-mode-tab" data-mode="multi-img" id="t2i-mode-tab-multi-img">多图参考</button>',
      '  </div>',
      '  <div class="t2i-input-area">',
      '    <div class="t2i-input-box">',
      '      <div class="t2i-upload-section">',
      '        <div class="t2i-ref-type-tabs">',
      '          <button type="button" class="t2i-ref-type-tab active" data-ref-type="subject" id="t2i-ref-type-subject">角色特征</button>',
      '          <button type="button" class="t2i-ref-type-tab" data-ref-type="face" id="t2i-ref-type-face">人物长相</button>',
      '        </div>',
      '        <div class="t2i-upload-area" id="t2i-upload-area">',
      '          <div class="t2i-upload-area-content">',
      '            <div class="t2i-upload-icon-large">',
      '              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">',
      '                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>',
      '                <circle cx="8.5" cy="8.5" r="1.5"></circle>',
      '                <polyline points="21 15 16 10 5 21"></polyline>',
      '              </svg>',
      '              <span class="t2i-upload-plus">+</span>',
      '            </div>',
      '            <div class="t2i-upload-main-text" id="t2i-upload-main-text">上传「角色特征」参考图</div>',
      '            <div class="t2i-upload-sub-text" id="t2i-upload-sub-text">从历史创作选择,支持 JPG/PNG</div>',
      '          </div>',
      '          <div class="t2i-upload-buttons-wrap" id="t2i-upload-buttons-wrap" style="display:none;"></div>',
      '        </div>',
      '        <div class="t2i-ref-params" id="t2i-ref-params">',
      '          <div class="t2i-ref-param-row">',
      '            <label class="t2i-ref-param-label">参考强度</label>',
      '            <div class="t2i-ref-param-control">',
      '              <input type="range" id="t2i-image-fidelity" class="t2i-ref-slider" min="0" max="1" step="0.01" value="0.5">',
      '              <span class="t2i-ref-value" id="t2i-image-fidelity-value">0.5</span>',
      '            </div>',
      '          </div>',
      '          <div class="t2i-ref-param-row" id="t2i-human-fidelity-row" style="display:none;">',
      '            <label class="t2i-ref-param-label">面部参考强度</label>',
      '            <div class="t2i-ref-param-control">',
      '              <input type="range" id="t2i-human-fidelity" class="t2i-ref-slider" min="0" max="1" step="0.01" value="0.45">',
      '              <span class="t2i-ref-value" id="t2i-human-fidelity-value">0.45</span>',
      '            </div>',
      '          </div>',
      '        </div>',
      '        <input type="file" id="t2i-image-file" accept="image/jpeg,image/jpg,image/png" style="display:none;">',
      '      </div>',
      '      <div class="t2i-multi-img-section" id="t2i-multi-img-section" style="display:none;"></div>',
      '      <div class="t2i-prompt-row">',
      '        <textarea id="t2i-prompt" class="t2i-prompt-input" placeholder="输入正向提示词，描述你想要的画面，不能超过2500字符" maxlength="2500"></textarea>',
      '      </div>',
      '      <div class="t2i-prompt-row">',
      '        <textarea id="t2i-negative" class="t2i-prompt-input t2i-negative-input" placeholder="（可选）输入负向提示词，不想要的元素，不能超过2500字符" maxlength="2500"></textarea>',
      '      </div>',
      '    </div>',
      '  </div>',
      '  <div class="t2i-footer-bar">',
      '    <div class="t2i-footer-controls">',
      '      <button type="button" class="t2i-footer-btn" id="t2i-resolution-btn">',
      '        <span id="t2i-resolution-text">' + defaultRes + '</span>',
      '        <span class="t2i-dropdown-arrow">▼</span>',
      '      </button>',
      '      <button type="button" class="t2i-footer-btn" id="t2i-ratio-btn">',
      '        <span id="t2i-ratio-text">' + defaultRatio + '</span>',
      '        <span class="t2i-dropdown-arrow">▼</span>',
      '      </button>',
      '      <button type="button" class="t2i-footer-btn" id="t2i-count-btn">',
      '        <span id="t2i-count-text">' + defaultN + '张</span>',
      '        <span class="t2i-dropdown-arrow">▼</span>',
      '      </button>',
      '    </div>',
      '    <button type="button" class="t2i-generate-btn" id="t2i-submit">生成</button>',
      '  </div>',
      '</div>',
      '<div class="t2i-model-dropdown" id="t2i-model-dropdown" style="display:none;"></div>',
      '<div class="t2i-resolution-dropdown" id="t2i-resolution-dropdown" style="display:none;"></div>',
      '<div class="t2i-ratio-dropdown" id="t2i-ratio-dropdown" style="display:none;"></div>',
      '<div class="t2i-count-dropdown" id="t2i-count-dropdown" style="display:none;"></div>'
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

  function extractBase64Str(str) {
    if (!str || typeof str !== 'string') return '';
    if (str.startsWith('data:')) {
      var commaIdx = str.indexOf(',');
      if (commaIdx >= 0) str = str.substring(commaIdx + 1);
    }
    str = str.replace(/[\s\n\r]/g, '');
    if (!/^[A-Za-z0-9+/=]+$/.test(str)) return '';
    return str;
  }

  function resolveOneImage(inputVal, file, callback) {
    var imageUrl = '';
    var imageBase64 = '';
    
    if (file && file.type && file.type.startsWith('image/')) {
      uploadImageFile(file).then(function (res) {
        if (res.url) {
          callback(res.url);
        } else {
          chooseUrlOrBase64('', res.base64, callback);
        }
      }).catch(function (err) {
        callback('');
      });
      return;
    }
    
    if (!inputVal || typeof inputVal !== 'string') {
      callback('');
      return;
    }
    
    inputVal = inputVal.trim();
    
    var isBase64Input = /^data:image\//i.test(inputVal);
    if (isBase64Input) {
      imageBase64 = inputVal;
    } else if (/^https?:\/\//i.test(inputVal)) {
      imageUrl = inputVal;
    } else if (inputVal.length > 100) {
      imageBase64 = inputVal;
    }
    
    if (imageUrl || imageBase64) {
      chooseUrlOrBase64(imageUrl, imageBase64, function (chosen) {
        callback(chosen || '');
      });
    } else {
      callback('');
    }
  }

  function pollMultiTask(taskId, apiKey, workId, setProgress, resolve, reject, pollCount) {
    pollCount = pollCount || 0;
    var maxPolls = 240;
    if (pollCount >= maxPolls) {
      reject(new Error('任务超时（约 10 分钟仍未返回资源），请稍后在「作品管理」中重新查询'));
      return;
    }
    var url = apiOrigin() + '/api/yunwu/images/multi-image2image/' + encodeURIComponent(taskId);
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
        var images = [];
        var videos = [];
        var audios = [];
        if (result.images && Array.isArray(result.images)) {
          result.images.forEach(function (x) {
            if (typeof x === 'string') images.push(x); else if (x && x.url) images.push(x.url);
          });
        }
        if (!images.length && result.image) images.push(typeof result.image === 'string' ? result.image : (result.image && result.image.url));
        if (!images.length && result.url) {
          var u = typeof result.url === 'string' ? result.url : (result.url && result.url.url);
          if (u) {
            if (/\.(mp4|webm|mov|avi)$/i.test(u)) videos.push(u);
            else if (/\.(mp3|wav|m4a|aac)$/i.test(u)) audios.push(u);
            else images.push(u);
          }
        }
        if (result.video || result.videoUrl || result.video_url) {
          var v = result.video || result.videoUrl || result.video_url;
          if (typeof v === 'string') videos.push(v); else if (v && v.url) videos.push(v.url);
        }
        if (result.audio || result.audioUrl || result.audio_url) {
          var a = result.audio || result.audioUrl || result.audio_url;
          if (typeof a === 'string') audios.push(a); else if (a && a.url) audios.push(a.url);
        }
        if (!images.length && !videos.length && !audios.length) {
          collectImageUrls(data, images);
          var allUrls = [];
          collectImageUrls(data, allUrls);
          allUrls.forEach(function (u) {
            if (/\.(mp4|webm|mov|avi)$/i.test(u)) videos.push(u);
            else if (/\.(mp3|wav|m4a|aac)$/i.test(u)) audios.push(u);
            else if (!images.includes(u)) images.push(u);
          });
        }
        images = [...new Set(images.filter(Boolean))];
        videos = [...new Set(videos.filter(Boolean))];
        audios = [...new Set(audios.filter(Boolean))];

        if (status === 'done' && (images.length > 0 || videos.length > 0 || audios.length > 0)) {
          // 任务完成且有资源，立即更新作品状态
          if (workId && window.MediaStudio && window.MediaStudio.updateWork) {
            var updates = {
              status: 'ready',
              images: images,
              videos: videos,
              audios: audios,
              progress: 100,
              progressStatus: '已完成'
            };
            if (videos.length) updates.resultUrl = videos[0];
            else if (audios.length) updates.resultUrl = audios[0];
            else if (images.length) updates.resultUrl = images[0];
            window.MediaStudio.updateWork(workId, updates);
            if (window.MediaStudio.refreshWorksList) window.MediaStudio.refreshWorksList();
          }
          resolve({ images: images, videos: videos, audios: audios, raw: data });
          return;
        }
        if (status === 'done' && !images.length && !videos.length && !audios.length) {
          var progressText = '状态已完成，等待资源生成，继续轮询…（' + (pollCount + 1) + '/' + maxPolls + '）';
          if (typeof setProgress === 'function') setProgress(progressText, statusRaw);
          if (workId && window.MediaStudio && window.MediaStudio.updateWork) {
            var pw = (window.MediaStudio.getWorks() || []).find(function (w) { return w.id === workId; });
            var n = ((pw && pw.progress) || 0) + 1;
            window.MediaStudio.updateWork(workId, { progress: n, progressStatus: statusRaw || '等待资源' });
          }
          if (window.MediaStudio && window.MediaStudio.refreshWorksList) window.MediaStudio.refreshWorksList();
          setTimeout(function () { pollMultiTask(taskId, apiKey, workId, setProgress, resolve, reject, pollCount + 1); }, 2500);
          return;
        }
        if (status === 'failed') {
          reject(new Error((result.message || result.error || data.message || data.error || '任务失败') + ''));
          return;
        }
        var progressText = '轮询中，状态=' + (statusRaw || '处理中') + (pollCount > 0 ? '（' + (pollCount + 1) + '/' + maxPolls + '）' : '');
        if (typeof setProgress === 'function') setProgress(progressText, statusRaw);
        if (workId && window.MediaStudio && window.MediaStudio.updateWork) {
          var pw = (window.MediaStudio.getWorks() || []).find(function (w) { return w.id === workId; });
          var n = ((pw && pw.progress) || 0) + 1;
          window.MediaStudio.updateWork(workId, { progress: n, progressStatus: statusRaw || '处理中' });
        }
        if (window.MediaStudio && window.MediaStudio.refreshWorksList) window.MediaStudio.refreshWorksList();
        setTimeout(function () { pollMultiTask(taskId, apiKey, workId, setProgress, resolve, reject, pollCount + 1); }, 2500);
      })
      .catch(reject);
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

  // setResult函数已废弃，改用聊天框显示结果

  function getVal(id, def) {
    var el = document.getElementById(id);
    if (!el) return def;
    var v = el.value != null ? String(el.value).trim() : '';
    return v === '' ? def : v;
  }

  function collectImageUrls(obj, out) {
    if (!obj || typeof obj !== 'object') return;
    if (Array.isArray(obj)) {
      obj.forEach(function (x) {
        if (typeof x === 'string' && /^https?:\/\//i.test(x)) out.push(x);
        else if (x && typeof x === 'object' && x.url) out.push(x.url);
      });
      return;
    }
    if (typeof obj === 'string' && /^https?:\/\//i.test(obj)) {
      out.push(obj);
      return;
    }
    var urlKeys = ['image', 'url', 'images', 'image_url', 'output_image', 'result_url', 'output_url', 'img_url'];
    urlKeys.forEach(function (k) {
      var v = obj[k];
      if (typeof v === 'string' && /^https?:\/\//i.test(v)) out.push(v);
      else if (Array.isArray(v)) v.forEach(function (u) {
        if (typeof u === 'string' && /^https?:\/\//i.test(u)) out.push(u);
        else if (u && u.url) out.push(u.url);
      });
    });
    Object.keys(obj).forEach(function (k) {
      collectImageUrls(obj[k], out);
    });
  }

  function normalizeTaskStatus(s) {
    var t = (s || '').toString().toLowerCase();
    if (['succeed', 'succeeded', 'success', 'completed', 'done', 'finish', 'finished'].indexOf(t) >= 0) return 'done';
    if (['fail', 'failed', 'error'].indexOf(t) >= 0) return 'failed';
    return 'processing';
  }

  function pollTask(taskId, apiKey, workId, setProgress, resolve, reject, pollCount) {
    pollCount = pollCount || 0;
    var maxPolls = 240;
    if (pollCount >= maxPolls) {
      reject(new Error('任务超时（约 10 分钟仍未返回资源），请稍后在「作品管理」中重新查询'));
      return;
    }
    var url = apiOrigin() + '/api/yunwu/images/generations/' + encodeURIComponent(taskId);
    var currentTaskId = String(taskId); // 保存taskId用于匹配
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
        
        // 处理新的API格式：data.data可能是数组（任务列表）或单个任务对象
        var taskData = null;
        if (data && data.data) {
          if (Array.isArray(data.data) && data.data.length > 0) {
            // 任务列表格式：找到匹配taskId的任务
            taskData = data.data.find(function(task) {
              return task && (task.task_id === currentTaskId || String(task.task_id) === currentTaskId);
            }) || data.data[0]; // 如果找不到，使用第一个
          } else if (data.data.task_id || data.data.task_status) {
            // 单个任务格式
            taskData = data.data;
          }
        }
        
        var statusRaw = (taskData && taskData.task_status) ||
          (data && data.data && data.data.task_status) ||
          (data && data.task_status) ||
          (data && data.data && data.data.status) ||
          (data && data.status) ||
          (data && data.data && data.data.task_result && data.data.task_result.task_status) ||
          '';
        var status = normalizeTaskStatus(statusRaw);
        var result = (taskData && taskData.task_result) ||
          (data && data.data && data.data.task_result) ||
          (data && data.data && data.data.result) ||
          (data && data.result) ||
          (data && data.data) ||
          {};
        var images = [];
        var videos = [];
        var audios = [];
        
        // 优先处理新的API格式（task_result.images数组，每个元素有index和url）
        if (taskData && taskData.task_result && taskData.task_result.images && Array.isArray(taskData.task_result.images)) {
          taskData.task_result.images.forEach(function(img) {
            if (img && img.url && typeof img.url === 'string') {
              images.push(img.url);
            }
          });
        } else if (data && data.data) {
          // 兼容：直接检查data.data
          if (Array.isArray(data.data)) {
            data.data.forEach(function(task) {
              if (task && task.task_result && task.task_result.images && Array.isArray(task.task_result.images)) {
                task.task_result.images.forEach(function(img) {
                  if (img && img.url && typeof img.url === 'string') {
                    images.push(img.url);
                  }
                });
              }
            });
          } else if (data.data.task_result && data.data.task_result.images && Array.isArray(data.data.task_result.images)) {
            data.data.task_result.images.forEach(function(img) {
              if (img && img.url && typeof img.url === 'string') {
                images.push(img.url);
              }
            });
          }
        }
        
        // 兼容旧格式：result.images可能是字符串数组或对象数组
        if (!images.length && result.images && Array.isArray(result.images)) {
          result.images.forEach(function (x) {
            if (typeof x === 'string') images.push(x); else if (x && x.url) images.push(x.url);
          });
        }
        if (!images.length && result.image) images.push(typeof result.image === 'string' ? result.image : (result.image && result.image.url));
        if (!images.length && result.url) {
          var url = typeof result.url === 'string' ? result.url : (result.url && result.url.url);
          if (url) {
            if (/\.(mp4|webm|mov|avi)$/i.test(url)) videos.push(url);
            else if (/\.(mp3|wav|m4a|aac)$/i.test(url)) audios.push(url);
            else images.push(url);
          }
        }
        if (result.video || result.videoUrl || result.video_url) {
          var v = result.video || result.videoUrl || result.video_url;
          if (typeof v === 'string') videos.push(v); else if (v && v.url) videos.push(v.url);
        }
        if (result.audio || result.audioUrl || result.audio_url) {
          var a = result.audio || result.audioUrl || result.audio_url;
          if (typeof a === 'string') audios.push(a); else if (a && a.url) audios.push(a.url);
        }
        if (!images.length && !videos.length && !audios.length) {
          collectImageUrls(data, images);
          var allUrls = [];
          collectImageUrls(data, allUrls);
          allUrls.forEach(function (u) {
            if (/\.(mp4|webm|mov|avi)$/i.test(u)) videos.push(u);
            else if (/\.(mp3|wav|m4a|aac)$/i.test(u)) audios.push(u);
            else if (!images.includes(u)) images.push(u);
          });
        }
        images = [...new Set(images.filter(Boolean))];
        videos = [...new Set(videos.filter(Boolean))];
        audios = [...new Set(audios.filter(Boolean))];

        if (status === 'done' && (images.length > 0 || videos.length > 0 || audios.length > 0)) {
          // 任务完成且有资源，立即更新作品状态
          if (workId && window.MediaStudio && window.MediaStudio.updateWork) {
            var updates = {
              status: 'ready',
              images: images,
              videos: videos,
              audios: audios,
              progress: 100,
              progressStatus: '已完成'
            };
            if (videos.length) updates.resultUrl = videos[0];
            else if (audios.length) updates.resultUrl = audios[0];
            else if (images.length) updates.resultUrl = images[0];
            window.MediaStudio.updateWork(workId, updates);
            if (window.MediaStudio.refreshWorksList) window.MediaStudio.refreshWorksList();
          }
          resolve({ images: images, videos: videos, audios: audios, raw: data });
          return;
        }
        if (status === 'done' && !images.length && !videos.length && !audios.length) {
          var progressText = '状态已完成，等待资源生成，继续轮询…（' + (pollCount + 1) + '/' + maxPolls + '）';
          if (typeof setProgress === 'function') setProgress(progressText, statusRaw);
          if (workId && window.MediaStudio && window.MediaStudio.updateWork) {
            var pw = (window.MediaStudio.getWorks() || []).find(function (w) { return w.id === workId; });
            var n = ((pw && pw.progress) || 0) + 1;
            window.MediaStudio.updateWork(workId, { progress: n, progressStatus: statusRaw || '等待资源' });
          }
          if (window.MediaStudio && window.MediaStudio.refreshWorksList) window.MediaStudio.refreshWorksList();
          setTimeout(function () { pollTask(taskId, apiKey, workId, setProgress, resolve, reject, pollCount + 1); }, 2500);
          return;
        }
        if (status === 'failed') {
          reject(new Error((result.message || result.error || data.message || data.error || '任务失败') + ''));
          return;
        }
        var progressText = '轮询中，状态=' + (statusRaw || '处理中') + (pollCount > 0 ? '（' + (pollCount + 1) + '/' + maxPolls + '）' : '');
        if (typeof setProgress === 'function') setProgress(progressText, statusRaw);
        if (workId && window.MediaStudio && window.MediaStudio.updateWork) {
          var pw = (window.MediaStudio.getWorks() || []).find(function (w) { return w.id === workId; });
          var n = ((pw && pw.progress) || 0) + 1;
          window.MediaStudio.updateWork(workId, { progress: n, progressStatus: statusRaw || '处理中' });
        }
        if (window.MediaStudio && window.MediaStudio.refreshWorksList) window.MediaStudio.refreshWorksList();
        setTimeout(function () { pollTask(taskId, apiKey, workId, setProgress, resolve, reject, pollCount + 1); }, 2500);
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
              var url = data.url;
              // 上传成功，图片URL已设置
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

  // 默认设置值
  var defaultSettings = {
    model: 'kling-v1',
    imageRef: '',
    resolution: '1k',
    aspectRatio: '1:1',
    n: 1,
    imageFidelity: 0.5,
    humanFidelity: 0.45
  };
  var currentSettings = Object.assign({}, defaultSettings);
  var currentImageUrl = '';
  var currentImageBase64 = '';

  function init(container) {
    if (!container) return;
    // 每次面板重新挂载时恢复为文生图模式，避免从作品管理点「编辑」文生图时仍显示上次的单图/多图参考
    currentMode = 'text2img';
    
    var uploadBtn = document.getElementById('t2i-upload-image-btn');
    var fileInput = document.getElementById('t2i-image-file');
    var uploadButtonsWrap = document.getElementById('t2i-upload-buttons-wrap');
    var uploadArea = document.getElementById('t2i-upload-area');
    var uploadMainText = document.getElementById('t2i-upload-main-text');
    var uploadSubText = document.getElementById('t2i-upload-sub-text');
    var refTypeSubjectTab = document.getElementById('t2i-ref-type-subject');
    var refTypeFaceTab = document.getElementById('t2i-ref-type-face');
    var refParams = document.getElementById('t2i-ref-params');
    var imageFidelitySlider = document.getElementById('t2i-image-fidelity');
    var imageFidelityValue = document.getElementById('t2i-image-fidelity-value');
    var humanFidelitySlider = document.getElementById('t2i-human-fidelity');
    var humanFidelityValue = document.getElementById('t2i-human-fidelity-value');
    var humanFidelityRow = document.getElementById('t2i-human-fidelity-row');
    var modeTabText2img = document.getElementById('t2i-mode-tab-text2img');
    var modeTabMultiImg = document.getElementById('t2i-mode-tab-multi-img');
    var modelBtn = document.getElementById('t2i-header-model-btn');
    var modelText = document.getElementById('t2i-model-text');
    var modelDropdown = document.getElementById('t2i-model-dropdown');
    var resolutionBtn = document.getElementById('t2i-resolution-btn');
    var resolutionText = document.getElementById('t2i-resolution-text');
    var resolutionDropdown = document.getElementById('t2i-resolution-dropdown');
    var ratioBtn = document.getElementById('t2i-ratio-btn');
    var ratioText = document.getElementById('t2i-ratio-text');
    var ratioDropdown = document.getElementById('t2i-ratio-dropdown');
    var countBtn = document.getElementById('t2i-count-btn');
    var countText = document.getElementById('t2i-count-text');
    var countDropdown = document.getElementById('t2i-count-dropdown');
    var generateBtn = document.getElementById('t2i-submit');
    var promptInput = document.getElementById('t2i-prompt');
    var negativeInput = document.getElementById('t2i-negative');
    var multiImgSection = document.getElementById('t2i-multi-img-section');
    var uploadedImages = []; // 存储上传的图片信息，需在 switchInputMode 首次调用前声明
    
    // 初始化显示文本
    if (resolutionText) {
      resolutionText.textContent = currentSettings.resolution;
    }
    if (ratioText) {
      ratioText.textContent = currentSettings.aspectRatio;
    }
    if (countText) {
      countText.textContent = currentSettings.n + '张';
    }
    
    // 初始化参考类型标签页
    function updateRefTypeTabs() {
      if (!refTypeSubjectTab || !refTypeFaceTab) return;
      
      refTypeSubjectTab.classList.remove('active');
      refTypeFaceTab.classList.remove('active');
      
      if (currentSettings.imageRef === 'subject') {
        refTypeSubjectTab.classList.add('active');
      } else {
        refTypeFaceTab.classList.add('active');
        currentSettings.imageRef = 'face';
      }
      
      updateUploadText();
      updateRefParams();
    }
    
    function updateUploadText() {
      if (!uploadMainText || !uploadSubText) return;
      var refType = currentSettings.imageRef;
      var text = '';
      var subText = '从历史创作选择,支持 JPG/PNG';
      if (refType === 'subject') {
        text = '上传「角色特征」参考图';
      } else if (refType === 'face') {
        text = '上传「人物长相」参考图';
        subText = '从历史创作选择,支持 JPG/PNG（需仅含1张人脸）';
      }
      uploadMainText.textContent = text;
      uploadSubText.textContent = subText;
    }
    
    function updateRefParams() {
      if (!humanFidelityRow) return;
      // 仅当选择"角色特征"时显示面部参考强度
      if (currentSettings.imageRef === 'subject') {
        humanFidelityRow.style.display = 'flex';
      } else {
        humanFidelityRow.style.display = 'none';
      }
    }
    
    // 绑定参考类型标签页事件
    if (refTypeSubjectTab) {
      refTypeSubjectTab.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        currentSettings.imageRef = 'subject';
        updateRefTypeTabs();
      });
    }
    
    if (refTypeFaceTab) {
      refTypeFaceTab.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        currentSettings.imageRef = 'face';
        updateRefTypeTabs();
      });
    }
    
    // 绑定参考强度滑块事件
    if (imageFidelitySlider && imageFidelityValue) {
      imageFidelitySlider.value = currentSettings.imageFidelity || 0.5;
      imageFidelityValue.textContent = parseFloat(imageFidelitySlider.value).toFixed(2);
      imageFidelitySlider.addEventListener('input', function() {
        currentSettings.imageFidelity = parseFloat(this.value);
        imageFidelityValue.textContent = parseFloat(this.value).toFixed(2);
      });
    }
    
    // 绑定面部参考强度滑块事件
    if (humanFidelitySlider && humanFidelityValue) {
      humanFidelitySlider.value = currentSettings.humanFidelity || 0.45;
      humanFidelityValue.textContent = parseFloat(humanFidelitySlider.value).toFixed(2);
      humanFidelitySlider.addEventListener('input', function() {
        currentSettings.humanFidelity = parseFloat(this.value);
        humanFidelityValue.textContent = parseFloat(this.value).toFixed(2);
      });
    }
    
    // 初始化参考类型标签页状态
    updateRefTypeTabs();
    
    // 根据当前模式设置参考类型标签页和参考参数的显示状态
    var refTypeTabs = document.querySelector('.t2i-ref-type-tabs');
    if (refTypeTabs) {
      if (currentMode === 'img2img') {
        refTypeTabs.style.display = 'flex';
      } else {
        refTypeTabs.style.display = 'none';
      }
    }
    if (refParams) {
      if (currentMode === 'img2img') {
        refParams.style.display = 'block';
      } else {
        refParams.style.display = 'none';
      }
    }
    
    // 初始化功能类型标签页
    var modeTabImg2img = document.getElementById('t2i-mode-tab-img2img');
    if (modeTabText2img && modeTabImg2img && modeTabMultiImg) {
      // 设置初始激活状态
      modeTabText2img.classList.remove('active');
      modeTabImg2img.classList.remove('active');
      modeTabMultiImg.classList.remove('active');
      if (currentMode === 'text2img') {
        modeTabText2img.classList.add('active');
      } else if (currentMode === 'img2img') {
        modeTabImg2img.classList.add('active');
      } else {
        modeTabMultiImg.classList.add('active');
      }
      
      // 绑定标签页点击事件
      modeTabText2img.addEventListener('click', function(e) {
        e.preventDefault();
        currentMode = 'text2img';
        modeTabText2img.classList.add('active');
        modeTabImg2img.classList.remove('active');
        modeTabMultiImg.classList.remove('active');
        switchInputMode('text2img');
      });
      
      modeTabImg2img.addEventListener('click', function(e) {
        e.preventDefault();
        currentMode = 'img2img';
        modeTabText2img.classList.remove('active');
        modeTabImg2img.classList.add('active');
        modeTabMultiImg.classList.remove('active');
        switchInputMode('img2img');
      });
      
      modeTabMultiImg.addEventListener('click', function(e) {
        e.preventDefault();
        currentMode = 'multi-img';
        modeTabText2img.classList.remove('active');
        modeTabImg2img.classList.remove('active');
        modeTabMultiImg.classList.add('active');
        switchInputMode('multi-img');
      });
    }
    
    // 切换输入界面
    function switchInputMode(mode) {
      var uploadSection = document.querySelector('.t2i-upload-section');
      var promptRows = document.querySelectorAll('.t2i-prompt-row');
      var promptInput = document.getElementById('t2i-prompt');
      var negativeInput = document.getElementById('t2i-negative');
      var refTypeTabs = document.querySelector('.t2i-ref-type-tabs');
      
      if (mode === 'multi-img') {
        // 显示多图参考生图界面
        // 隐藏单图上传区域和参考类型标签页
        if (uploadSection) uploadSection.style.display = 'none';
        if (refTypeTabs) refTypeTabs.style.display = 'none';
        // 隐藏负向提示词输入框
        if (negativeInput && negativeInput.closest('.t2i-prompt-row')) {
          negativeInput.closest('.t2i-prompt-row').style.display = 'none';
        }
        // 显示正向提示词输入框（修改placeholder）
        if (promptInput) {
          promptInput.placeholder = '正向文本提示词，不能超过2500个字符';
          promptInput.maxLength = 2500;
          promptInput.closest('.t2i-prompt-row').style.display = 'block';
        }
        // 显示多图参考生图输入区域
        if (multiImgSection) {
          multiImgSection.style.display = 'block';
          renderMultiImgSection();
        }
        
        // 更新模型列表为多图参考生图支持的模型，默认kling-v2
        if (modelDropdown) {
          // 如果当前模型不在多图参考生图支持的模型中，切换到kling-v2
          if (MULTI_MODELS.indexOf(currentSettings.model) === -1) {
            currentSettings.model = 'kling-v2';
            if (modelText) modelText.textContent = 'kling-v2';
          }
          
          var modelHtml = MULTI_MODELS.map(function(m) {
            var active = m === currentSettings.model ? 'active' : '';
            return '<div class="t2i-model-dropdown-item ' + active + '" data-model="' + m + '">' + m + '</div>';
          }).join('');
          modelDropdown.innerHTML = modelHtml;
          
          // 重新绑定模型选择事件
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
        
        // 更新底部设置显示
        if (ratioText) ratioText.textContent = currentSettings.aspectRatio;
        if (countText) countText.textContent = currentSettings.n + '张';
        updateFooterDropdowns();
      } else if (mode === 'img2img') {
        // 显示单图参考界面（有上传图片按钮和参考类型标签页）
        if (uploadSection) uploadSection.style.display = 'block';
        if (refTypeTabs) refTypeTabs.style.display = 'flex';
        if (refParams) refParams.style.display = 'block';
        if (promptRows) {
          promptRows.forEach(function(row) {
            row.style.display = 'block';
          });
        }
        // 恢复正向提示词placeholder
        if (promptInput) {
          promptInput.placeholder = '输入正向提示词，描述你想要的画面，不能超过2500字符';
        }
        // 隐藏多图参考生图输入区域
        if (multiImgSection) {
          multiImgSection.style.display = 'none';
        }
        // 更新参考类型标签页显示
        if (refTypeSubjectTab && refTypeFaceTab) {
          updateRefTypeTabs();
        }
        // 如果没有上传图片，显示上传区域
        if (uploadArea && uploadButtonsWrap && uploadedImages.length === 0) {
          var uploadAreaContent = uploadArea.querySelector('.t2i-upload-area-content');
          if (uploadAreaContent) {
            uploadAreaContent.style.display = 'flex';
          }
          uploadButtonsWrap.style.display = 'none';
        }
        
        // 单图参考仅支持kling-v1-5，更新模型列表
        if (modelDropdown) {
          // 如果当前模型不是kling-v1-5，切换到kling-v1-5
          if (currentSettings.model !== 'kling-v1-5') {
            currentSettings.model = 'kling-v1-5';
            if (modelText) modelText.textContent = 'kling-v1-5';
          }
          
          var modelHtml = '<div class="t2i-model-dropdown-item active" data-model="kling-v1-5">kling-v1-5</div>';
          modelDropdown.innerHTML = modelHtml;
          
          // 重新绑定模型选择事件
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
        
        // 更新底部设置显示
        if (resolutionText) resolutionText.textContent = currentSettings.resolution;
        if (ratioText) ratioText.textContent = currentSettings.aspectRatio;
        if (countText) countText.textContent = currentSettings.n + '张';
        updateFooterDropdowns();
      } else {
        // 显示文生图界面（没有上传图片按钮）
        if (uploadSection) uploadSection.style.display = 'none';
        if (refTypeTabs) refTypeTabs.style.display = 'none';
        if (refParams) refParams.style.display = 'none';
        if (promptRows) {
          promptRows.forEach(function(row) {
            row.style.display = 'block';
          });
        }
        // 恢复正向提示词placeholder
        if (promptInput) {
          promptInput.placeholder = '输入正向提示词，描述你想要的画面，不能超过2500字符';
        }
        // 隐藏多图参考生图输入区域
        if (multiImgSection) {
          multiImgSection.style.display = 'none';
        }
        
        // 清除上传的图片（文生图模式不需要参考图）
        if (uploadedImages && uploadedImages.length > 0) {
          uploadedImages = [];
          if (uploadButtonsWrap) {
            var existingPreviews = uploadButtonsWrap.querySelectorAll('.t2i-uploaded-image-btn');
            existingPreviews.forEach(function(btn) {
              btn.remove();
            });
          }
          currentImageUrl = '';
          currentImageBase64 = '';
          // 重置上传区域显示
          if (uploadArea && uploadButtonsWrap) {
            var uploadAreaContent = uploadArea.querySelector('.t2i-upload-area-content');
            if (uploadAreaContent) {
              uploadAreaContent.style.display = 'flex';
            }
            uploadButtonsWrap.style.display = 'none';
          }
        }
        
        // 恢复模型列表
        if (modelDropdown) {
          var modelHtml = MODELS.map(function(m) {
            var active = m === currentSettings.model ? 'active' : '';
            return '<div class="t2i-model-dropdown-item ' + active + '" data-model="' + m + '">' + m + '</div>';
          }).join('');
          modelDropdown.innerHTML = modelHtml;
          
          // 重新绑定模型选择事件
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
        
        // 更新底部设置显示
        if (resolutionText) resolutionText.textContent = currentSettings.resolution;
        if (ratioText) ratioText.textContent = currentSettings.aspectRatio;
        if (countText) countText.textContent = currentSettings.n + '张';
        updateFooterDropdowns();
      }
    }
    
    // 渲染多图参考生图输入区域
    function renderMultiImgSection() {
      if (!multiImgSection) return;
      
      multiImgSection.innerHTML = [
        '<div class="t2i-multi-img-upload-section">',
        '  <div class="t2i-multi-ref-container">',
        '    <div class="t2i-multi-ref-item">',
        '      <div class="t2i-multi-ref-label">主体</div>',
        '      <div class="t2i-multi-ref-content">',
        '        <div class="t2i-multi-subject-grid" id="t2i-multi-subject-grid">',
        '        </div>',
        '        <div class="t2i-multi-subject-upload-area" id="t2i-multi-subject-upload-area">',
        '          <div class="t2i-multi-upload-icon">+</div>',
        '          <div class="t2i-multi-upload-text">点击/拖拽</div>',
        '          <div class="t2i-multi-upload-hint" id="t2i-multi-subject-hint">从历史创作选择,已传(0/4)</div>',
        '        </div>',
        '      </div>',
        '    </div>',
        '    <div class="t2i-multi-ref-item">',
        '      <div class="t2i-multi-ref-label">场景</div>',
        '      <div class="t2i-multi-ref-content">',
        '        <div class="t2i-multi-single-upload-area" id="t2i-multi-scene-upload-area">',
        '          <div class="t2i-multi-upload-icon">+</div>',
        '          <div class="t2i-multi-upload-text">点击/拖拽「场景图」</div>',
        '          <div class="t2i-multi-upload-hint">从历史创作选择,最多1张</div>',
        '        </div>',
        '        <div class="t2i-multi-single-image-wrap" id="t2i-multi-scene-image-wrap" style="display:none;"></div>',
        '      </div>',
        '    </div>',
        '    <div class="t2i-multi-ref-item">',
        '      <div class="t2i-multi-ref-label">风格</div>',
        '      <div class="t2i-multi-ref-content">',
        '        <div class="t2i-multi-single-upload-area" id="t2i-multi-style-upload-area">',
        '          <div class="t2i-multi-upload-icon">+</div>',
        '          <div class="t2i-multi-upload-text">点击/拖拽「风格图」</div>',
        '          <div class="t2i-multi-upload-hint">从历史创作选择,最多1张</div>',
        '        </div>',
        '        <div class="t2i-multi-single-image-wrap" id="t2i-multi-style-image-wrap" style="display:none;"></div>',
        '      </div>',
        '    </div>',
        '  </div>',
        '  <input type="file" id="t2i-multi-subject-file" accept="image/jpeg,image/jpg,image/png" multiple style="display:none;">',
        '  <input type="file" id="t2i-multi-scene-file" accept="image/jpeg,image/jpg,image/png" style="display:none;">',
        '  <input type="file" id="t2i-multi-style-file" accept="image/jpeg,image/jpg,image/png" style="display:none;">',
        '</div>'
      ].join('');
      
      // 初始化多图参考生图的事件绑定
      initMultiImgEvents();
    }
    
    // 初始化多图参考生图事件
    function initMultiImgEvents() {
      // 主体参考图上传（支持多选，最多4张）
      var subjectUploadArea = document.getElementById('t2i-multi-subject-upload-area');
      var subjectFile = document.getElementById('t2i-multi-subject-file');
      var subjectGrid = document.getElementById('t2i-multi-subject-grid');
      var subjectHint = document.getElementById('t2i-multi-subject-hint');
      
      if (subjectUploadArea && subjectFile) {
        subjectUploadArea.addEventListener('click', function() { subjectFile.click(); });
        subjectFile.addEventListener('change', function() {
          var files = Array.from(subjectFile.files || []);
          if (files.length === 0) return;
          
          // 检查当前已有图片数量
          var existingImages = subjectGrid ? subjectGrid.querySelectorAll('.t2i-multi-subject-item') : [];
          var currentCount = existingImages.length;
          var remainingSlots = MAX_SUBJECT_IMAGES - currentCount;
          
          if (files.length > remainingSlots) {
            alert('最多只能上传 ' + MAX_SUBJECT_IMAGES + ' 张主体参考图，当前已有 ' + currentCount + ' 张，还可以上传 ' + remainingSlots + ' 张');
            files = files.slice(0, remainingSlots);
          }
          
          files.forEach(function(file) {
            if (currentCount >= MAX_SUBJECT_IMAGES) return;
            
            var reader = new FileReader();
            reader.onload = function(e) {
              var base64 = e.target.result;
              uploadImageFile(file)
                .then(function(url) {
                  addMultiSubjectImagePreview(url, '', file);
                  currentCount++;
                  updateSubjectHint();
                })
                .catch(function(err) {
                  addMultiSubjectImagePreview('', base64, file);
                  currentCount++;
                  updateSubjectHint();
                });
            };
            reader.onerror = function() {};
            reader.readAsDataURL(file);
          });
          
          subjectFile.value = '';
        });
      }
      
      // 更新主体参考图提示文本
      function updateSubjectHint() {
        if (!subjectHint || !subjectGrid) return;
        var count = subjectGrid.querySelectorAll('.t2i-multi-subject-item').length;
        subjectHint.textContent = '从历史创作选择,已传(' + count + '/' + MAX_SUBJECT_IMAGES + ')';
        // 如果已满4张，隐藏上传区域
        if (subjectUploadArea) {
          subjectUploadArea.style.display = count >= MAX_SUBJECT_IMAGES ? 'none' : 'flex';
        }
      }
      
      // 场景参考图上传
      var sceneUploadArea = document.getElementById('t2i-multi-scene-upload-area');
      var sceneFile = document.getElementById('t2i-multi-scene-file');
      var sceneImageWrap = document.getElementById('t2i-multi-scene-image-wrap');
      
      if (sceneUploadArea && sceneFile) {
        sceneUploadArea.addEventListener('click', function() { sceneFile.click(); });
        sceneFile.addEventListener('change', function() {
          var file = sceneFile.files && sceneFile.files[0];
          if (!file) return;
          
          // 如果已有一张图片，先删除
          if (sceneImageWrap) {
            sceneImageWrap.innerHTML = '';
            sceneImageWrap.style.display = 'none';
            sceneUploadArea.style.display = 'flex';
          }
          
          var reader = new FileReader();
          reader.onload = function(e) {
            var base64 = e.target.result;
            uploadImageFile(file)
              .then(function(url) {
                addMultiImagePreview('scene', url, '', file);
                sceneFile.value = '';
              })
              .catch(function(err) {
                addMultiImagePreview('scene', '', base64, file);
                sceneFile.value = '';
              });
          };
          reader.onerror = function() {
            sceneFile.value = '';
          };
          reader.readAsDataURL(file);
        });
      }
      
      // 风格参考图上传
      var styleUploadArea = document.getElementById('t2i-multi-style-upload-area');
      var styleFile = document.getElementById('t2i-multi-style-file');
      var styleImageWrap = document.getElementById('t2i-multi-style-image-wrap');
      
      if (styleUploadArea && styleFile) {
        styleUploadArea.addEventListener('click', function() { styleFile.click(); });
        styleFile.addEventListener('change', function() {
          var file = styleFile.files && styleFile.files[0];
          if (!file) return;
          
          // 如果已有一张图片，先删除
          if (styleImageWrap) {
            styleImageWrap.innerHTML = '';
            styleImageWrap.style.display = 'none';
            styleUploadArea.style.display = 'flex';
          }
          
          var reader = new FileReader();
          reader.onload = function(e) {
            var base64 = e.target.result;
            uploadImageFile(file)
              .then(function(url) {
                addMultiImagePreview('style', url, '', file);
                styleFile.value = '';
              })
              .catch(function(err) {
                addMultiImagePreview('style', '', base64, file);
                styleFile.value = '';
              });
          };
          reader.onerror = function() {
            styleFile.value = '';
          };
          reader.readAsDataURL(file);
        });
      }
      
      // 初始化时更新提示
      updateSubjectHint();
    }
    
    // 添加主体参考图预览
    function addMultiSubjectImagePreview(imageUrl, imageBase64, file) {
      var subjectGrid = document.getElementById('t2i-multi-subject-grid');
      if (!subjectGrid) return;
      
      var imageId = 'multi_subject_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
      var previewUrl = imageUrl || (imageBase64 ? (imageBase64.startsWith('data:') ? imageBase64 : 'data:image/jpeg;base64,' + imageBase64) : '');
      if (!previewUrl && file) {
        previewUrl = URL.createObjectURL(file);
      }
      
      // 计算当前图片序号
      var currentCount = subjectGrid.querySelectorAll('.t2i-multi-subject-item').length;
      var itemIndex = currentCount + 1;
      
      var item = document.createElement('div');
      item.className = 't2i-multi-subject-item';
      item.setAttribute('data-image-id', imageId);
      item.setAttribute('data-image-url', imageUrl || '');
      item.setAttribute('data-image-base64', imageBase64 || '');
      item.innerHTML = [
        '<div class="t2i-multi-subject-image">',
        '  <img src="' + previewUrl.replace(/"/g, '&quot;') + '" alt="预览" class="t2i-multi-subject-preview">',
        '  <button class="t2i-multi-subject-remove" title="删除">×</button>',
        '</div>',
        '<div class="t2i-multi-subject-label">主体' + itemIndex + '</div>'
      ].join('');
      
      subjectGrid.appendChild(item);
      
      var removeBtn = item.querySelector('.t2i-multi-subject-remove');
      if (removeBtn) {
        removeBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          removeMultiSubjectImagePreview(imageId);
        });
      }
      
      // 更新提示文本
      var subjectHint = document.getElementById('t2i-multi-subject-hint');
      var subjectUploadArea = document.getElementById('t2i-multi-subject-upload-area');
      if (subjectHint) {
        var count = subjectGrid.querySelectorAll('.t2i-multi-subject-item').length;
        subjectHint.textContent = '从历史创作选择,已传(' + count + '/' + MAX_SUBJECT_IMAGES + ')';
      }
      if (subjectUploadArea && currentCount + 1 >= MAX_SUBJECT_IMAGES) {
        subjectUploadArea.style.display = 'none';
      }
    }
    
    // 移除主体参考图预览
    function removeMultiSubjectImagePreview(imageId) {
      var subjectGrid = document.getElementById('t2i-multi-subject-grid');
      var subjectUploadArea = document.getElementById('t2i-multi-subject-upload-area');
      var subjectHint = document.getElementById('t2i-multi-subject-hint');
      
      if (subjectGrid) {
        var item = subjectGrid.querySelector('[data-image-id="' + imageId + '"]');
        if (item) {
          item.remove();
          // 重新编号
          var items = subjectGrid.querySelectorAll('.t2i-multi-subject-item');
          items.forEach(function(it, index) {
            var label = it.querySelector('.t2i-multi-subject-label');
            if (label) {
              label.textContent = '主体' + (index + 1);
            }
          });
          // 更新提示文本
          if (subjectHint) {
            var count = items.length;
            subjectHint.textContent = '从历史创作选择,已传(' + count + '/' + MAX_SUBJECT_IMAGES + ')';
          }
          // 显示上传区域
          if (subjectUploadArea && items.length < MAX_SUBJECT_IMAGES) {
            subjectUploadArea.style.display = 'flex';
          }
        }
      }
    }
    
    // 添加场景/风格参考图预览
    function addMultiImagePreview(type, imageUrl, imageBase64, file) {
      var imageWrap = document.getElementById('t2i-multi-' + type + '-image-wrap');
      var uploadArea = document.getElementById('t2i-multi-' + type + '-upload-area');
      if (!imageWrap || !uploadArea) return;
      
      var imageId = 'multi_' + type + '_' + Date.now();
      var previewUrl = imageUrl || (imageBase64 ? (imageBase64.startsWith('data:') ? imageBase64 : 'data:image/jpeg;base64,' + imageBase64) : '');
      if (!previewUrl && file) {
        previewUrl = URL.createObjectURL(file);
      }
      
      // 隐藏上传区域，显示图片
      uploadArea.style.display = 'none';
      imageWrap.style.display = 'block';
      
      imageWrap.innerHTML = [
        '<div class="t2i-multi-single-image" data-image-id="' + imageId + '" data-image-url="' + (imageUrl || '').replace(/"/g, '&quot;') + '" data-image-base64="' + (imageBase64 || '').replace(/"/g, '&quot;') + '">',
        '  <img src="' + previewUrl.replace(/"/g, '&quot;') + '" alt="预览" class="t2i-multi-single-preview">',
        '  <button class="t2i-multi-single-remove" title="删除">×</button>',
        '</div>'
      ].join('');
      
      var removeBtn = imageWrap.querySelector('.t2i-multi-single-remove');
      if (removeBtn) {
        removeBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          removeMultiImagePreview(type, imageId);
        });
      }
    }
    
    // 移除场景/风格参考图预览（恢复上传区域）
    function removeMultiImagePreview(type, imageId) {
      var imageWrap = document.getElementById('t2i-multi-' + type + '-image-wrap');
      var uploadArea = document.getElementById('t2i-multi-' + type + '-upload-area');
      
      if (imageWrap) {
        var item = imageWrap.querySelector('[data-image-id="' + imageId + '"]');
        if (item) {
          item.remove();
        }
        imageWrap.style.display = 'none';
      }
      if (uploadArea) {
        uploadArea.style.display = 'flex';
      }
    }
    
    // 初始切换界面
    switchInputMode(currentMode);
    
    // 更新底部设置下拉框内容（根据模式）
    function updateFooterDropdowns() {
      // 更新分辨率下拉框（仅在图片生成模式显示）
      if (resolutionDropdown && resolutionBtn) {
        if (currentMode === 'multi-img') {
          resolutionBtn.style.display = 'none';
        } else {
          resolutionBtn.style.display = 'flex';
          var resolutionHtml = RESOLUTIONS.map(function(r) {
            var active = r === currentSettings.resolution ? 'active' : '';
            return '<div class="t2i-resolution-dropdown-item ' + active + '" data-resolution="' + r + '">' + r + '</div>';
          }).join('');
          resolutionDropdown.innerHTML = resolutionHtml;
          
          // 重新绑定事件
          resolutionDropdown.querySelectorAll('.t2i-resolution-dropdown-item').forEach(function(item) {
            item.addEventListener('click', function(e) {
              e.stopPropagation();
              var res = item.getAttribute('data-resolution');
              currentSettings.resolution = res;
              if (resolutionText) resolutionText.textContent = res;
              resolutionDropdown.querySelectorAll('.t2i-resolution-dropdown-item').forEach(function(i) {
                i.classList.remove('active');
              });
              item.classList.add('active');
              resolutionDropdown.style.display = 'none';
            });
          });
        }
      }
      
      // 更新宽高比下拉框
      if (ratioDropdown && ratioBtn) {
        var ratioHtml = RATIOS.map(function(r) {
          var active = r === currentSettings.aspectRatio ? 'active' : '';
          return '<div class="t2i-ratio-dropdown-item ' + active + '" data-ratio="' + r + '">' + r + '</div>';
        }).join('');
        ratioDropdown.innerHTML = ratioHtml;
        
        // 重新绑定事件
        ratioDropdown.querySelectorAll('.t2i-ratio-dropdown-item').forEach(function(item) {
          item.addEventListener('click', function(e) {
            e.stopPropagation();
            var ratio = item.getAttribute('data-ratio');
            currentSettings.aspectRatio = ratio;
            if (ratioText) ratioText.textContent = ratio;
            ratioDropdown.querySelectorAll('.t2i-ratio-dropdown-item').forEach(function(i) {
              i.classList.remove('active');
            });
            item.classList.add('active');
            ratioDropdown.style.display = 'none';
          });
        });
      }
      
      // 更新生成数量下拉框（1-9）
      if (countDropdown && countBtn) {
        var countOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9];
        var countHtml = countOptions.map(function(n) {
          var active = n === currentSettings.n ? 'active' : '';
          return '<div class="t2i-count-dropdown-item ' + active + '" data-count="' + n + '">' + n + '张</div>';
        }).join('');
        countDropdown.innerHTML = countHtml;
        
        // 重新绑定事件
        countDropdown.querySelectorAll('.t2i-count-dropdown-item').forEach(function(item) {
          item.addEventListener('click', function(e) {
            e.stopPropagation();
            var n = parseInt(item.getAttribute('data-count'), 10);
            currentSettings.n = n;
            if (countText) countText.textContent = n + '张';
            countDropdown.querySelectorAll('.t2i-count-dropdown-item').forEach(function(i) {
              i.classList.remove('active');
            });
            item.classList.add('active');
            countDropdown.style.display = 'none';
          });
        });
      }
    }
    
    // 初始化模型下拉框
    if (modelDropdown) {
      var modelHtml = MODELS.map(function(m) {
        var active = m === currentSettings.model ? 'active' : '';
        return '<div class="t2i-model-dropdown-item ' + active + '" data-model="' + m + '">' + m + '</div>';
      }).join('');
      modelDropdown.innerHTML = modelHtml;
      
      // 绑定下拉项点击事件
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
      
      // 确保下拉框初始状态和样式
      modelDropdown.style.display = 'none';
      modelDropdown.style.position = 'fixed';
      modelDropdown.style.zIndex = '1000';
    }

    // 关闭所有下拉框的函数（提前定义，供模型下拉框使用）
    function closeAllDropdowns(excludeDropdown) {
      if (modelDropdown && modelDropdown !== excludeDropdown) modelDropdown.style.display = 'none';
      if (resolutionDropdown && resolutionDropdown !== excludeDropdown) resolutionDropdown.style.display = 'none';
      if (ratioDropdown && ratioDropdown !== excludeDropdown) ratioDropdown.style.display = 'none';
      if (countDropdown && countDropdown !== excludeDropdown) countDropdown.style.display = 'none';
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
          // 先临时显示以获取高度
          modelDropdown.style.display = 'block';
          modelDropdown.style.visibility = 'hidden';
          var dropdownHeight = modelDropdown.offsetHeight || 200;
          modelDropdown.style.visibility = 'visible';
          
          modelDropdown.style.left = rect.left + 'px';
          // 显示在按钮上方，留4px间距
          var topPosition = rect.top - dropdownHeight - 4;
          // 如果上方空间不够，则显示在下方
          if (topPosition < 0) {
            modelDropdown.style.top = (rect.bottom + 4) + 'px';
          } else {
            modelDropdown.style.top = topPosition + 'px';
          }
        }
      });
    }

    // 初始化底部设置下拉框
    function initFooterDropdowns() {
      // 初始化分辨率下拉框
      if (resolutionDropdown && resolutionBtn) {
        resolutionDropdown.style.display = 'none';
        resolutionDropdown.style.position = 'fixed';
        resolutionDropdown.style.zIndex = '1000';
        
        resolutionBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          var rect = resolutionBtn.getBoundingClientRect();
          var isVisible = resolutionDropdown.style.display === 'block';
          
          // 先关闭所有其他下拉框
          closeAllDropdowns();
          
          if (!isVisible) {
            resolutionDropdown.style.display = 'block';
            resolutionDropdown.style.left = rect.left + 'px';
            var topPos = rect.top - resolutionDropdown.offsetHeight - 4;
            if (topPos < 0) {
              resolutionDropdown.style.top = (rect.bottom + 4) + 'px';
            } else {
              resolutionDropdown.style.top = topPos + 'px';
            }
          }
        });
      }
      
      // 初始化宽高比下拉框
      if (ratioDropdown && ratioBtn) {
        ratioDropdown.style.display = 'none';
        ratioDropdown.style.position = 'fixed';
        ratioDropdown.style.zIndex = '1000';
        
        ratioBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          var rect = ratioBtn.getBoundingClientRect();
          var isVisible = ratioDropdown.style.display === 'block';
          
          // 关闭其他所有下拉框
          closeAllDropdowns(ratioDropdown);
          
          if (isVisible) {
            ratioDropdown.style.display = 'none';
          } else {
            ratioDropdown.style.display = 'block';
            ratioDropdown.style.left = rect.left + 'px';
            var topPos = rect.top - ratioDropdown.offsetHeight - 4;
            if (topPos < 0) {
              ratioDropdown.style.top = (rect.bottom + 4) + 'px';
            } else {
              ratioDropdown.style.top = topPos + 'px';
            }
          }
        });
      }
      
      // 初始化生成数量下拉框
      if (countDropdown && countBtn) {
        countDropdown.style.display = 'none';
        countDropdown.style.position = 'fixed';
        countDropdown.style.zIndex = '1000';
        
        countBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          var rect = countBtn.getBoundingClientRect();
          var isVisible = countDropdown.style.display === 'block';
          
          // 关闭其他所有下拉框
          closeAllDropdowns(countDropdown);
          
          if (isVisible) {
            countDropdown.style.display = 'none';
          } else {
            countDropdown.style.display = 'block';
            countDropdown.style.left = rect.left + 'px';
            var topPos = rect.top - countDropdown.offsetHeight - 4;
            if (topPos < 0) {
              countDropdown.style.top = (rect.bottom + 4) + 'px';
            } else {
              countDropdown.style.top = topPos + 'px';
            }
          }
        });
      }
      
      // 初始化下拉框内容
      updateFooterDropdowns();
      
      // 点击外部关闭所有下拉框
      setTimeout(function() {
        document.addEventListener('click', function(e) {
          // 如果点击的不是任何下拉框按钮或下拉框内容，则关闭所有下拉框
          var isClickInside = false;
          if (modelBtn && modelBtn.contains(e.target)) isClickInside = true;
          if (modelDropdown && modelDropdown.contains(e.target)) isClickInside = true;
          if (resolutionBtn && resolutionBtn.contains(e.target)) isClickInside = true;
          if (resolutionDropdown && resolutionDropdown.contains(e.target)) isClickInside = true;
          if (ratioBtn && ratioBtn.contains(e.target)) isClickInside = true;
          if (ratioDropdown && ratioDropdown.contains(e.target)) isClickInside = true;
          if (countBtn && countBtn.contains(e.target)) isClickInside = true;
          if (countDropdown && countDropdown.contains(e.target)) isClickInside = true;
          
          if (!isClickInside) {
            closeAllDropdowns();
          }
        });
      }, 100);
    }
    
    // 初始化底部下拉框
    initFooterDropdowns();

    // 上传图片功能（uploadedImages 已在 init 开头声明）
    function addImagePreview(imageUrl, imageBase64, file) {
      if (!uploadButtonsWrap || !uploadArea) return;
      
      var imageId = 'img_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
      var previewUrl = imageUrl || (imageBase64 ? (imageBase64.startsWith('data:') ? imageBase64 : 'data:image/jpeg;base64,' + imageBase64) : '');
      
      if (!previewUrl && file) {
        previewUrl = URL.createObjectURL(file);
      }
      
      var imageItem = {
        id: imageId,
        url: imageUrl,
        base64: imageBase64,
        previewUrl: previewUrl
      };
      uploadedImages.push(imageItem);
      currentImageUrl = imageUrl || '';
      currentImageBase64 = imageBase64 || '';
      
      // 隐藏上传区域，显示预览
      var uploadAreaContent = uploadArea.querySelector('.t2i-upload-area-content');
      if (uploadAreaContent) {
        uploadAreaContent.style.display = 'none';
      }
      uploadButtonsWrap.style.display = 'flex';
      
      var imageBtn = document.createElement('button');
      imageBtn.className = 't2i-uploaded-image-btn';
      imageBtn.setAttribute('data-image-id', imageId);
      imageBtn.innerHTML = '<img src="' + previewUrl.replace(/"/g, '&quot;') + '" alt="预览" class="t2i-uploaded-image-preview"><span class="t2i-remove-image-btn">×</span>';
      
      uploadButtonsWrap.innerHTML = '';
      uploadButtonsWrap.appendChild(imageBtn);
      
      // 绑定删除事件
      var removeBtn = imageBtn.querySelector('.t2i-remove-image-btn');
      if (removeBtn) {
        removeBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          removeImagePreview(imageId);
        });
      }
    }
    
    function removeImagePreview(imageId) {
      uploadedImages = uploadedImages.filter(function(img) { return img.id !== imageId; });
      var btn = uploadButtonsWrap ? uploadButtonsWrap.querySelector('[data-image-id="' + imageId + '"]') : null;
      if (btn) {
        btn.remove();
      }
      // 更新currentImageUrl和currentImageBase64
      if (uploadedImages.length > 0) {
        var lastImg = uploadedImages[uploadedImages.length - 1];
        currentImageUrl = lastImg.url || '';
        currentImageBase64 = lastImg.base64 || '';
      } else {
        currentImageUrl = '';
        currentImageBase64 = '';
        // 显示上传区域，隐藏预览
        if (uploadArea && uploadButtonsWrap) {
          var uploadAreaContent = uploadArea.querySelector('.t2i-upload-area-content');
          if (uploadAreaContent) {
            uploadAreaContent.style.display = 'flex';
          }
          uploadButtonsWrap.style.display = 'none';
        }
      }
    }
    
    // 上传区域点击事件
    if (uploadArea && fileInput) {
      uploadArea.addEventListener('click', function(e) {
        // 如果点击的是上传区域内容（不是预览按钮），则触发文件选择
        if (e.target.closest('.t2i-upload-area-content')) {
          fileInput.click();
        }
      });
    }
    
    if (fileInput && uploadButtonsWrap) {
      fileInput.addEventListener('change', function(e) {
        var file = e.target.files && e.target.files[0];
        if (!file) return;
        
        // 如果已有一张图片，先删除
        if (uploadedImages.length > 0) {
          var existingImageId = uploadedImages[0].id;
          removeImagePreview(existingImageId);
        }
        
        var reader = new FileReader();
        reader.onload = function(e) {
          var base64 = e.target.result;
          currentImageBase64 = base64;
          uploadImageFile(file)
            .then(function(url) {
              currentImageUrl = url;
              currentImageBase64 = '';
              addImagePreview(url, '', file);
              fileInput.value = '';
            })
            .catch(function(err) {
              currentImageUrl = '';
              addImagePreview('', base64, file);
              fileInput.value = '';
            });
        };
        reader.onerror = function() {
          fileInput.value = '';
          currentImageBase64 = '';
        };
        reader.readAsDataURL(file);
      });
    }

    // 生成按钮
    if (generateBtn) {
      generateBtn.addEventListener('click', function() {
      var apiKey = (window.MediaStudio && window.MediaStudio.getYunwuApiKey()) || '';
      if (!apiKey) {
        alert('请先登录，由管理员在后台分配云雾 API Key 后即可使用');
        return;
      }
      if (currentMode === 'multi-img') {
        submitMultiImgGeneration();
      } else {
        submitText2ImgGeneration();
      }
      });
    }
    
    function submitMultiImgGeneration() {
      var prompt = promptInput ? promptInput.value.trim() : '';
      var subjectList = [];
      var pending = 0;
      var resolved = [];
      var hasError = false;
      
      // 收集主体参考图（从预览网格中获取）
      var subjectGrid = document.getElementById('t2i-multi-subject-grid');
      var uploadedItems = subjectGrid ? subjectGrid.querySelectorAll('.t2i-multi-subject-item') : [];
      var subjectInput = document.getElementById('t2i-multi-subject-input');
      var subjectInputVal = (subjectInput && subjectInput.value && subjectInput.value.trim()) || '';
      
      if (uploadedItems.length === 0 && !subjectInputVal) {
        alert('请至少上传或填写 1 张主体参考图');
        return;
      }
      
      if (uploadedItems.length < MIN_SUBJECT_IMAGES && !subjectInputVal) {
        alert('请至少上传或填写 ' + MIN_SUBJECT_IMAGES + ' 张主体参考图');
        return;
      }
      
      // 从预览按钮中获取图片
      uploadedItems.forEach(function(btn) {
        var imageUrl = btn.getAttribute('data-image-url') || '';
        var imageBase64 = btn.getAttribute('data-image-base64') || '';
        var img = btn.querySelector('img');
        var imageSrc = img ? img.src : '';
        
        pending++;
        (function() {
          var imageToResolve = imageUrl || imageBase64 || imageSrc || '';
          resolveOneImage(imageToResolve, null, function(resolvedUrlOrBase64) {
            if (resolvedUrlOrBase64) {
              subjectList.push({ subject_image: resolvedUrlOrBase64 });
            } else {
              hasError = true;
            }
            pending--;
            if (pending === 0) {
              if (hasError || subjectList.length < MIN_SUBJECT_IMAGES) {
                alert('请至少提供 ' + MIN_SUBJECT_IMAGES + ' 张有效的主体参考图（URL 或上传）');
            return;
          }
              doSubmitMultiImg(subjectList, prompt);
            }
          });
        })();
      });
      
      function doSubmitMultiImg(subjectImageList, promptText) {
        var model = currentSettings.model;
        var n = currentSettings.n;
        var aspect_ratio = currentSettings.aspectRatio;
        
        var body = {
        model_name: model,
          subject_image_list: subjectImageList,
          n: n,
          prompt: promptText || '',
          aspect_ratio: aspect_ratio || '16:9',
        };
        
        // 从预览区域获取场景和风格参考图
        var sceneImageWrap = document.getElementById('t2i-multi-scene-image-wrap');
        var sceneImage = sceneImageWrap ? sceneImageWrap.querySelector('.t2i-multi-single-image') : null;
        var sceneVal = '';
        if (sceneImage) {
          var sceneImg = sceneImage.querySelector('img');
          if (sceneImg) sceneVal = sceneImg.src || '';
          if (!sceneVal) {
            sceneVal = sceneImage.getAttribute('data-image-url') || sceneImage.getAttribute('data-image-base64') || '';
          }
        }
        
        var styleImageWrap = document.getElementById('t2i-multi-style-image-wrap');
        var styleImage = styleImageWrap ? styleImageWrap.querySelector('.t2i-multi-single-image') : null;
        var styleVal = '';
        if (styleImage) {
          var styleImg = styleImage.querySelector('img');
          if (styleImg) styleVal = styleImg.src || '';
          if (!styleVal) {
            styleVal = styleImage.getAttribute('data-image-url') || styleImage.getAttribute('data-image-base64') || '';
          }
        }
        
        // 添加用户消息到聊天框
        var userContent = promptText || '多图参考生图';
        userContent += '\n使用模型：' + model;
        userContent += '\n设置：' + aspect_ratio + ' · ' + n;
        userContent += '\n主体参考图：' + subjectImageList.length + ' 张';
        if (sceneVal) userContent += '\n场景参考图：已上传';
        if (styleVal) userContent += '\n风格参考图：已上传';
        
        var generateBtn = document.getElementById('t2i-submit');
        if (generateBtn) generateBtn.disabled = true;
        
        if (sceneVal && sceneVal.trim()) {
          resolveOneImage(sceneVal.trim(), null, function (one) {
            if (one) body.scene_image = one;
            if (styleVal && styleVal.trim()) {
              resolveOneImage(styleVal.trim(), null, function (two) {
                if (two) body.style_image = two;
                sendMultiImgRequest(body);
              });
            } else {
                sendMultiImgRequest(body);
            }
          });
        } else if (styleVal && styleVal.trim()) {
          resolveOneImage(styleVal.trim(), null, function (two) {
            if (two) body.style_image = two;
                sendMultiImgRequest(body);
          });
        } else {
                sendMultiImgRequest(body);
        }
      }
      
      function sendMultiImgRequest(body) {
        var workId = null;
        
        // 立即创建作品记录，显示"处理中"状态
        if (window.MediaStudio && window.MediaStudio.addWork) {
          workId = window.MediaStudio.addWork({
            type: 'multi-img',
            status: 'processing',
            taskId: null, // 临时为null，等待API返回
            prompt: body.prompt || '',
            title: (body.prompt || '多图参考生图').toString().slice(0, 80),
            images: [],
            videos: [],
            audios: [],
            model_name: body.model_name,
            progress: 0,
            progressStatus: '正在提交请求...'
          });
          
          // 刷新作品列表显示
          if (window.MediaStudio && window.MediaStudio.refreshWorksList) {
            window.MediaStudio.refreshWorksList();
          }
        }
        
        var authHeaders = (window.MediaStudio && window.MediaStudio.getAuthHeaders && window.MediaStudio.getAuthHeaders()) || {};
        fetch(apiOrigin() + '/api/yunwu/images/multi-image2image', {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders),
        body: JSON.stringify(body),
      })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          var taskId = (data && data.data && (data.data.id || data.data.task_id || data.data.request_id)) ||
              (data && data.id) || (data && data.task_id) || (data && data.request_id);
          if (!taskId) {
              var errMsg = (data && (data.message || data.error || (data.error && data.error.message))) ? (data.message || data.error || (data.error && data.error.message)) : '未返回任务 ID';
              var generateBtn = document.getElementById('t2i-submit');
              if (generateBtn) generateBtn.disabled = false;
              
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
          return new Promise(function (resolve, reject) {
              pollMultiTask(taskId, null, workId, function (txt) {
                // 轮询进度更新（已移除聊天显示）
              }, resolve, reject, 0);
          });
        })
        .then(function (result) {
          var urls = (result && result.images) || [];
          var videos = (result && result.videos) || [];
          var audios = (result && result.audios) || [];
          var raw = result && result.raw;
          if (!urls.length && !videos.length && !audios.length && raw) {
            var extra = [];
            collectImageUrls(raw, extra);
            urls = [...new Set(extra.filter(Boolean))];
          }
          var hasResources = urls.length > 0 || videos.length > 0 || audios.length > 0;
          if (workId && window.MediaStudio && window.MediaStudio.updateWork) {
            var updates = {
              status: hasResources ? 'ready' : 'failed',
              images: urls,
              videos: videos,
              audios: audios,
              progress: null,
                progressStatus: null,
            };
            if (videos.length) updates.resultUrl = videos[0];
            else if (audios.length) updates.resultUrl = audios[0];
            else if (urls.length) updates.resultUrl = urls[0];
            window.MediaStudio.updateWork(workId, updates);
            if (window.MediaStudio && window.MediaStudio.refreshWorksList) window.MediaStudio.refreshWorksList();
          }
          if (!hasResources) {
              var generateBtn = document.getElementById('t2i-submit');
              if (generateBtn) generateBtn.disabled = false;
              return;
            }
            var generateBtn = document.getElementById('t2i-submit');
            if (generateBtn) generateBtn.disabled = false;
          })
          .catch(function (err) {
            if (workId && window.MediaStudio && window.MediaStudio.updateWork) {
              window.MediaStudio.updateWork(workId, { status: 'failed', error: (err && err.message) || String(err), progress: null, progressStatus: null });
              if (window.MediaStudio && window.MediaStudio.refreshWorksList) window.MediaStudio.refreshWorksList();
            }
            var generateBtn = document.getElementById('t2i-submit');
            if (generateBtn) generateBtn.disabled = false;
          });
      }
    }
    
    function submitText2ImgGeneration() {
      var prompt = promptInput ? promptInput.value.trim() : '';
      var negative = negativeInput ? negativeInput.value.trim() : '';
      
      if (!prompt) {
        alert('请填写正向提示词');
        return;
      }
      
      // 单图参考模式验证
      if (currentMode === 'img2img') {
        // 单图参考仅支持kling-v1-5
        if (currentSettings.model !== 'kling-v1-5') {
          alert('单图参考仅支持模型 kling-v1-5');
          return;
        }
        
        // 如果有上传图片，image_reference必填
        if (uploadedImages.length > 0) {
          if (!currentSettings.imageRef) {
            alert('使用 kling-v1-5 且上传参考图时，请选择「图片参考类型」');
            return;
          }
        }
      } else {
        // 文生图模式下，如果有图片且使用kling-v1-5，也需要image_reference
        if (uploadedImages.length > 0 && currentSettings.model === 'kling-v1-5' && !currentSettings.imageRef) {
          alert('使用 kling-v1-5 且填写参考图时，请选择「图片参考类型」');
          return;
        }
      }
      
      // 添加用户消息到聊天框
      var userImages = [];
      if (currentImageUrl) userImages.push(currentImageUrl);
      var userContent = prompt;
      if (negative) {
        userContent += '\n' + negative;
      }
      userContent += '\n使用模型：' + currentSettings.model;
      userContent += '\n设置：' + currentSettings.resolution + ' · ' + currentSettings.aspectRatio + ' · ' + currentSettings.n;
      if (currentSettings.imageRef) {
        userContent += '\n图片参考类型：' + (currentSettings.imageRef === 'subject' ? 'subject（角色特征参考）' : 'face（人物长相参考）');
      }
      if (currentSettings.imageFidelity !== undefined) {
        userContent += '\n参考强度：' + currentSettings.imageFidelity;
      }
      if (currentSettings.imageRef === 'subject' && currentSettings.humanFidelity !== undefined) {
        userContent += '\n面部参考强度：' + currentSettings.humanFidelity;
      }
      
      var generateBtn = document.getElementById('t2i-submit');
      if (generateBtn) generateBtn.disabled = true;
      
      // 立即创建作品记录，使单图参考在 chooseUrlOrBase64 异步回调前就能在作品管理中显示
      var workId = null;
      var workType = currentMode === 'multi-img' ? 'multi-img' : (currentMode === 'img2img' ? 'img2img' : 'text2img');
      if (window.MediaStudio && window.MediaStudio.addWork) {
        workId = window.MediaStudio.addWork({
          type: workType,
          status: 'processing',
          taskId: null,
          prompt: prompt,
          negativePrompt: negative || '',
          title: prompt.toString().slice(0, 80),
          images: [],
          videos: [],
          audios: [],
          referenceImages: [],
          model_name: currentSettings.model,
          resolution: currentSettings.resolution,
          progress: 0,
          progressStatus: '正在提交请求...'
        });
        if (window.MediaStudio.refreshWorksList) {
          window.MediaStudio.refreshWorksList();
        }
      }
      
      // 准备图片（使用第一张上传的图片）
      var finalImage = '';
      if (uploadedImages.length > 0) {
        var firstImg = uploadedImages[0];
        chooseUrlOrBase64(firstImg.url, firstImg.base64, function(chosen) {
          if (!chosen) {
            if (typeof chatMessages !== 'undefined' && typeof loadingMsgIndex !== 'undefined') {
              chatMessages[loadingMsgIndex].content = '无法处理图像，请重新上传';
              chatMessages[loadingMsgIndex].loading = false;
              if (typeof renderChat === 'function') renderChat();
              if (typeof saveChatMessages === 'function') saveChatMessages();
            }
            if (workId && window.MediaStudio && window.MediaStudio.updateWork) {
              window.MediaStudio.updateWork(workId, { status: 'failed', progressStatus: '无法处理图像，请重新上传' });
              if (window.MediaStudio.refreshWorksList) window.MediaStudio.refreshWorksList();
            }
            if (generateBtn) generateBtn.disabled = false;
            return;
          }
          finalImage = chosen;
          submitGeneration(workId);
        });
      } else {
        submitGeneration(workId);
      }
      
      function submitGeneration(existingWorkId) {
        var body = {
            model_name: currentSettings.model,
            prompt: prompt,
            n: currentSettings.n,
            resolution: currentSettings.resolution,
            aspect_ratio: currentSettings.aspectRatio
          };
          
          if (negative) body.negative_prompt = negative;
          if (finalImage) {
            body.image = finalImage;
            // 使用kling-v1-5且有图片时，image_reference必填
            if (currentSettings.model === 'kling-v1-5' && currentSettings.imageRef) {
              body.image_reference = currentSettings.imageRef;
              // image_fidelity必填
              body.image_fidelity = currentSettings.imageFidelity !== undefined ? currentSettings.imageFidelity : 0.5;
              // 仅当image_reference为subject时，human_fidelity生效
              if (currentSettings.imageRef === 'subject' && currentSettings.humanFidelity !== undefined) {
                body.human_fidelity = currentSettings.humanFidelity;
              }
            }
          }
          
          var workId = existingWorkId || null;
          var refImgForWork = (workType === 'img2img' && body && body.image) ? (typeof body.image === 'string' ? body.image : (body.image && body.image.value ? body.image.value : '')) : '';
          if (workId && refImgForWork && window.MediaStudio && window.MediaStudio.updateWork) {
            window.MediaStudio.updateWork(workId, { referenceImages: [refImgForWork] });
          }
          
          var authHeaders = (window.MediaStudio && window.MediaStudio.getAuthHeaders && window.MediaStudio.getAuthHeaders()) || {};
          fetch(apiOrigin() + '/api/yunwu/images/generations', {
            method: 'POST',
            headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders),
            body: JSON.stringify(body)
          })
          .then(function(r) { return r.json(); })
          .then(function(data) {
            var taskId = (data && data.data && (data.data.id || data.data.task_id || data.data.request_id)) ||
              (data && data.id) || (data && data.task_id) || (data && data.request_id) ||
              (data && data.data && data.data.request_id);
            if (!taskId) {
              var errMsg = (data && (data.message || data.error || (data.error && data.error.message))) ? 
                (data.message || data.error || (data.error && data.error.message)) : '未返回任务 ID';
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
            
            var setProgress = function(txt) {
              // 进度更新（已移除聊天显示）
            };
            
            return new Promise(function(resolve, reject) {
              pollTask(taskId, null, workId, setProgress, resolve, reject, 0);
            });
          })
          .then(function(result) {
            var urls = (result && result.images) || [];
            var videos = (result && result.videos) || [];
            var audios = (result && result.audios) || [];
            var raw = result && result.raw;
            
            if (!urls.length && !videos.length && !audios.length && raw) {
              var extra = [];
              collectImageUrls(raw, extra);
              urls = [...new Set(extra.filter(Boolean))];
            }
            
            var hasResources = urls.length > 0 || videos.length > 0 || audios.length > 0;
            
          if (workId && window.MediaStudio && window.MediaStudio.updateWork) {
              var updates = {
                status: hasResources ? 'ready' : 'failed',
                images: urls,
                videos: videos,
                audios: audios,
                progress: null,
                progressStatus: null
              };
              if (videos.length) updates.resultUrl = videos[0];
              else if (audios.length) updates.resultUrl = audios[0];
              else if (urls.length) updates.resultUrl = urls[0];
              window.MediaStudio.updateWork(workId, updates);
              if (window.MediaStudio && window.MediaStudio.refreshWorksList) window.MediaStudio.refreshWorksList();
            }
            
            generateBtn.disabled = false;
          })
          .catch(function(err) {
            if (workId && window.MediaStudio && window.MediaStudio.updateWork) {
              window.MediaStudio.updateWork(workId, { 
                status: 'failed', 
                error: (err && err.message) || String(err), 
                progress: null, 
                progressStatus: null 
              });
              if (window.MediaStudio && window.MediaStudio.refreshWorksList) window.MediaStudio.refreshWorksList();
            }
            generateBtn.disabled = false;
          });
      }
    }
    // 供作品管理「重新编辑」填充单图参考：从卡片恢复已上传的参考图
    window.MediaStudio.fillImg2imgReference = function (url) {
      if (url && uploadButtonsWrap && uploadArea) addImagePreview(url, '', null);
    };
  }

  if (window.MediaStudio && window.MediaStudio.register) {
    window.MediaStudio.register(id, { name: name, icon: icon, getPanel: getPanel, init: init });
  }
})();
