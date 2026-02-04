/**
 * AI创作工坊 - 图生视频（独立文件）
 * 对接云雾可灵图生视频 API
 */
(function () {
  var id = 'img2video';
  var name = '图生视频';
  var icon = '🎬';
  var MODELS = ['kling-v1', 'kling-v1-5', 'kling-v1-6', 'kling-v2-master', 'kling-v2-1', 'kling-v2-1-master', 'kling-v2-5-turbo', 'kling-v2-6'];
  var MODES = ['std', 'pro'];
  var DURATIONS = ['5', '10'];

  function getPanel() {
    var modelOpts = MODELS.map(function (m) { return '<option value="' + m + '">' + m + '</option>'; }).join('');
    var modeOpts = MODES.map(function (m) { return '<option value="' + m + '">' + m + '</option>'; }).join('');
    var durationOpts = DURATIONS.map(function (d) { return '<option value="' + d + '">' + d + '秒</option>'; }).join('');
    return [
      '<h2 class="panel-title">图生视频 · 可灵 Kling 视频生成</h2>',
      '<div class="form-row">',
      '  <label>模型 <span class="required">*</span></label>',
      '  <select id="i2v-model">' + modelOpts + '</select>',
      '</div>',
      '<div class="form-row">',
      '  <label>参考图像 <span class="required">*</span></label>',
      '  <div class="t2i-image-input-wrap">',
      '    <input type="text" id="i2v-image" placeholder="输入图片 URL 或 Base64 编码，或上传本地图片">',
      '    <input type="file" id="i2v-image-file" accept="image/jpeg,image/jpg,image/png" style="display:none;">',
      '    <button type="button" class="btn-secondary" id="i2v-upload-btn" style="margin-left:8px;margin-top:0;">上传图片</button>',
      '  </div>',
      '  <div id="i2v-image-preview" style="margin-top:8px;display:none;">',
      '    <img id="i2v-preview-img" style="max-width:200px;max-height:200px;border-radius:8px;border:1px solid var(--border);" alt="预览">',
      '    <button type="button" class="btn-secondary" id="i2v-remove-preview" style="margin-left:8px;font-size:0.85rem;">移除</button>',
      '  </div>',
      '  <p class="hint">支持输入图片 URL（优先）或 Base64 编码（备选），或上传本地图片（.jpg/.jpeg/.png，≤10MB）</p>',
      '</div>',
      '<div class="form-row">',
      '  <label>尾帧控制图像（可选）</label>',
      '  <div class="t2i-image-input-wrap">',
      '    <input type="text" id="i2v-image-tail" placeholder="输入图片 URL 或 Base64 编码，或上传本地图片">',
      '    <input type="file" id="i2v-image-tail-file" accept="image/jpeg,image/jpg,image/png" style="display:none;">',
      '    <button type="button" class="btn-secondary" id="i2v-upload-tail-btn" style="margin-left:8px;margin-top:0;">上传图片</button>',
      '  </div>',
      '</div>',
      '<div class="form-row">',
      '  <label>正向提示词（可选，不能超过2500字符）</label>',
      '  <textarea id="i2v-prompt" placeholder="描述视频内容，不能超过2500字符" maxlength="2500"></textarea>',
      '  <p class="hint">用&lt;&lt;&lt;voice_1&gt;&gt;&gt;来指定音色，序号同voice_list参数所引用音色的排列顺序</p>',
      '</div>',
      '<div class="form-row">',
      '  <label>负向提示词（可选）</label>',
      '  <textarea id="i2v-negative" placeholder="不想要的元素" maxlength="2500"></textarea>',
      '</div>',
      '<div class="form-row">',
      '  <label>生成模式 <span class="required">*</span></label>',
      '  <select id="i2v-mode">' + modeOpts + '</select>',
      '  <p class="hint">std：标准模式（性价比高）；pro：专家模式（高品质）</p>',
      '</div>',
      '<div class="form-row">',
      '  <label>视频时长 <span class="required">*</span></label>',
      '  <select id="i2v-duration">' + durationOpts + '</select>',
      '</div>',
      '<div class="form-row">',
      '  <label>CFG Scale（kling-v2.x模型不支持）</label>',
      '  <input type="number" id="i2v-cfg-scale" min="0" max="10" step="0.1" value="0.5" placeholder="0.5">',
      '  <p class="hint">值越大，模型自由度越小，与用户输入的提示词相关性越强</p>',
      '</div>',
      '<div class="form-row">',
      '  <button type="button" class="btn-primary" id="i2v-submit">生成视频</button>',
      '</div>',
      '<div class="result-area" id="i2v-result">生成结果将显示在此处</div>'
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
    var el = document.getElementById('i2v-result');
    if (el) { el.innerHTML = html; el.classList.toggle('has-content', !!isContent); }
  }

  function getVal(id, def) {
    var el = document.getElementById(id);
    if (!el) return def;
    var v = el.value != null ? String(el.value).trim() : '';
    return v === '' ? def : v;
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

  function pollTask(taskId, apiKey, workId, setProgress, resolve, reject, pollCount) {
    pollCount = pollCount || 0;
    var maxPolls = 240;
    if (pollCount > maxPolls) {
      reject(new Error('任务超时（10分钟仍未完成），已判定失败'));
      return;
    }
    var url = apiOrigin() + '/api/yunwu/videos/image2video/' + encodeURIComponent(taskId);
    fetch(url, {
      method: 'GET',
      headers: Object.assign({ 'Content-Type': 'application/json' }, (window.MediaStudio && window.MediaStudio.getAuthHeaders && window.MediaStudio.getAuthHeaders()) || {}),
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
          setTimeout(function () { pollTask(taskId, apiKey, workId, setProgress, resolve, reject, pollCount + 1); }, 2500);
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
        setTimeout(function () { pollTask(taskId, apiKey, workId, setProgress, resolve, reject, pollCount + 1); }, 2500);
      })
      .catch(reject);
  }

  function init(container) {
    if (!container) return;
    var btn = document.getElementById('i2v-submit');
    if (!btn) return;
    var uploadBtn = document.getElementById('i2v-upload-btn');
    var fileInput = document.getElementById('i2v-image-file');
    var imageInput = document.getElementById('i2v-image');
    var previewDiv = document.getElementById('i2v-image-preview');
    var previewImg = document.getElementById('i2v-preview-img');
    var removeBtn = document.getElementById('i2v-remove-preview');
    var currentImageUrl = '';
    var currentImageBase64 = '';
    var currentImageFile = null;

    var uploadTailBtn = document.getElementById('i2v-upload-tail-btn');
    var fileTailInput = document.getElementById('i2v-image-tail-file');
    var imageTailInput = document.getElementById('i2v-image-tail');
    var currentImageTailUrl = '';
    var currentImageTailBase64 = '';

    if (uploadBtn && fileInput) {
      uploadBtn.addEventListener('click', function () { fileInput.click(); });
      fileInput.addEventListener('change', function (e) {
        var file = e.target.files && e.target.files[0];
        if (!file) return;
        currentImageFile = file;
        uploadBtn.disabled = true;
        uploadBtn.textContent = '上传中...';
        var reader = new FileReader();
        reader.onload = function (e) {
          var base64 = e.target.result;
          currentImageBase64 = base64;
          uploadImageFile(file)
            .then(function (url) {
              currentImageUrl = url;
              var isLocalUrl = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)/i.test(url);
              if (isLocalUrl) {
                currentImageBase64 = base64;
                setResult('<span class="msg-success">✓ 图片已上传。本地环境将使用 Base64 提交（云雾无法访问本地 URL）</span>', true);
              } else {
                currentImageBase64 = '';
                setResult('<span class="msg-success">✓ 图片已上传并转换为 URL</span>', true);
              }
              if (imageInput) imageInput.value = url;
              if (previewImg) {
                var blobUrl = URL.createObjectURL(file);
                previewImg.src = blobUrl;
                previewImg.onload = function () { URL.revokeObjectURL(blobUrl); };
              }
              if (previewDiv) previewDiv.style.display = 'block';
              uploadBtn.disabled = false;
              uploadBtn.textContent = '上传图片';
              fileInput.value = '';
            })
            .catch(function (err) {
              currentImageUrl = '';
              if (imageInput) imageInput.value = '';
              if (previewImg) {
                var blobUrl = URL.createObjectURL(file);
                previewImg.src = blobUrl;
                previewImg.onload = function () { URL.revokeObjectURL(blobUrl); };
              }
              if (previewDiv) previewDiv.style.display = 'block';
              uploadBtn.disabled = false;
              uploadBtn.textContent = '上传图片';
              fileInput.value = '';
              setResult('<span class="msg-warning">⚠️ 上传失败，将使用Base64编码：' + (err.message || '上传失败').replace(/\n/g, '<br>') + '</span>', true);
            });
        };
        reader.onerror = function () {
          setResult('<span class="msg-error">✗ 读取文件失败</span>', true);
          uploadBtn.disabled = false;
          uploadBtn.textContent = '上传图片';
          fileInput.value = '';
        };
        reader.readAsDataURL(file);
      });
    }
    if (removeBtn) {
      removeBtn.addEventListener('click', function () {
        currentImageUrl = '';
        currentImageBase64 = '';
        currentImageFile = null;
        if (imageInput) imageInput.value = '';
        if (previewDiv) previewDiv.style.display = 'none';
        if (previewImg) previewImg.src = '';
        if (fileInput) fileInput.value = '';
      });
    }
    if (imageInput) {
      imageInput.addEventListener('blur', function () {
        var url = imageInput.value.trim();
        if (url) {
          var isBase64 = /^data:image\//i.test(url) || (!/^https?:\/\//i.test(url) && url.length > 100);
          if (isBase64) {
            currentImageBase64 = url;
            currentImageUrl = '';
            if (previewDiv) {
              previewDiv.style.display = 'block';
              if (previewImg) previewImg.src = url;
            }
            setResult('<span class="msg-warning">⚠️ 检测到Base64编码，将作为备选方案。建议上传图片获取URL以获得更好的兼容性。</span>', true);
          } else {
            var isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)/i.test(url);
            if (isLocalhost) {
              setResult('<span class="msg-warning">⚠️ 检测到本地地址（' + url + '），云雾 API 可能无法访问。将尝试使用Base64编码作为备选。</span>', true);
            }
            currentImageUrl = url;
            currentImageBase64 = '';
            if (previewDiv) {
              previewDiv.style.display = 'block';
              if (previewImg) previewImg.src = url;
            }
          }
        } else {
          currentImageUrl = '';
          currentImageBase64 = '';
          if (previewDiv) previewDiv.style.display = 'none';
        }
      });
    }

    if (uploadTailBtn && fileTailInput) {
      uploadTailBtn.addEventListener('click', function () { fileTailInput.click(); });
      fileTailInput.addEventListener('change', function (e) {
        var file = e.target.files && e.target.files[0];
        if (!file) return;
        uploadTailBtn.disabled = true;
        uploadTailBtn.textContent = '上传中...';
        var reader = new FileReader();
        reader.onload = function (e) {
          var base64 = e.target.result;
          currentImageTailBase64 = base64;
          uploadImageFile(file)
            .then(function (url) {
              currentImageTailUrl = url;
              var isLocalUrl = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)/i.test(url);
              if (isLocalUrl) currentImageTailBase64 = base64;
              else currentImageTailBase64 = '';
              if (imageTailInput) imageTailInput.value = url;
              uploadTailBtn.disabled = false;
              uploadTailBtn.textContent = '上传图片';
              fileTailInput.value = '';
            })
            .catch(function (err) {
              currentImageTailUrl = '';
              if (imageTailInput) imageTailInput.value = '';
              uploadTailBtn.disabled = false;
              uploadTailBtn.textContent = '上传图片';
              fileTailInput.value = '';
              setResult('<span class="msg-warning">⚠️ 尾帧图片上传失败，将使用Base64编码：' + (err.message || '上传失败').replace(/\n/g, '<br>') + '</span>', true);
            });
        };
        reader.onerror = function () {
          uploadTailBtn.disabled = false;
          uploadTailBtn.textContent = '上传图片';
          fileTailInput.value = '';
        };
        reader.readAsDataURL(file);
      });
    }
    if (imageTailInput) {
      imageTailInput.addEventListener('blur', function () {
        var url = imageTailInput.value.trim();
        if (url) {
          var isBase64 = /^data:image\//i.test(url) || (!/^https?:\/\//i.test(url) && url.length > 100);
          if (isBase64) {
            currentImageTailBase64 = url;
            currentImageTailUrl = '';
          } else {
            var isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)/i.test(url);
            if (isLocalhost && currentImageTailBase64) {
              currentImageTailBase64 = currentImageTailBase64;
            } else {
              currentImageTailUrl = url;
              currentImageTailBase64 = '';
            }
          }
        } else {
          currentImageTailUrl = '';
          currentImageTailBase64 = '';
        }
      });
    }

    btn.addEventListener('click', function () {
      var apiKey = (window.MediaStudio && window.MediaStudio.getYunwuApiKey()) || '';
      if (!apiKey) {
        setResult('<span class="msg-warning">请先登录，由管理员在后台分配云雾 API Key 后即可使用</span>', true);
        return;
      }
      var model = getVal('i2v-model', 'kling-v1');
      var mode = getVal('i2v-mode', 'std');
      var duration = getVal('i2v-duration', '5');
      var imageInputValue = getVal('i2v-image', '') || '';
      var imageTailInputValue = getVal('i2v-image-tail', '') || '';
      
      var imageUrl = currentImageUrl || (imageInputValue && /^https?:\/\//i.test(imageInputValue) ? imageInputValue : '');
      var imageBase64 = currentImageBase64 || (imageInputValue && !/^https?:\/\//i.test(imageInputValue) && imageInputValue.length > 100 ? imageInputValue : '');
      
      if (!imageUrl && !imageBase64 && imageInputValue) {
        var isBase64Input = /^data:image\//i.test(imageInputValue);
        if (isBase64Input) {
          imageBase64 = imageInputValue;
        } else if (/^https?:\/\//i.test(imageInputValue)) {
          imageUrl = imageInputValue;
        } else if (imageInputValue.length > 100) {
          imageBase64 = imageInputValue;
        }
      }
      
      if (!imageUrl && !imageBase64) {
        setResult('<span class="msg-warning">请上传或输入参考图像</span>', true);
        return;
      }

      var finalImage = '';
      var finalImageTail = '';
      
      chooseUrlOrBase64(imageUrl, imageBase64, function (chosen) {
        if (!chosen) {
          setResult('<span class="msg-error">✗ 无法处理图像，请重新上传或输入</span>', true);
          return;
        }
        finalImage = chosen;
        
        var imageTailUrl = currentImageTailUrl || (imageTailInputValue && /^https?:\/\//i.test(imageTailInputValue) ? imageTailInputValue : '');
        var imageTailBase64 = currentImageTailBase64 || (imageTailInputValue && !/^https?:\/\//i.test(imageTailInputValue) && imageTailInputValue.length > 100 ? imageTailInputValue : '');
        
        if (imageTailInputValue && !imageTailUrl && !imageTailBase64) {
          var isBase64Tail = /^data:image\//i.test(imageTailInputValue);
          if (isBase64Tail) {
            imageTailBase64 = imageTailInputValue;
          } else if (/^https?:\/\//i.test(imageTailInputValue)) {
            imageTailUrl = imageTailInputValue;
          } else if (imageTailInputValue.length > 100) {
            imageTailBase64 = imageTailInputValue;
          }
        }
        
        if (imageTailUrl || imageTailBase64) {
          chooseUrlOrBase64(imageTailUrl, imageTailBase64, function (chosenTail) {
            if (chosenTail) finalImageTail = chosenTail;
            submitRequest();
          });
        } else {
          submitRequest();
        }
      });
      
      function submitRequest() {

        var body = {
          model_name: model,
          image: finalImage,
          mode: mode,
          duration: parseInt(duration, 10)
        };
        if (finalImageTail) body.image_tail = finalImageTail;
        if (getVal('i2v-prompt', '')) body.prompt = getVal('i2v-prompt', '');
        if (getVal('i2v-negative', '')) body.negative_prompt = getVal('i2v-negative', '');
        var cfgScale = parseFloat(getVal('i2v-cfg-scale', '0.5'), 10);
        if (!isNaN(cfgScale) && !model.startsWith('kling-v2')) body.cfg_scale = cfgScale;

        setResult('正在提交任务…', true);
        btn.disabled = true;
        
        // 立即创建作品记录，显示"处理中"状态
        var workId = null;
        if (window.MediaStudio && window.MediaStudio.addWork) {
          var refImageUrl = (typeof finalImage === 'string' && (finalImage.startsWith('http') || finalImage.startsWith('data:'))) ? finalImage : (finalImage && finalImage.value) ? finalImage.value : '';
          workId = window.MediaStudio.addWork({
            type: 'img2video',
            status: 'processing',
            taskId: null, // 临时为null，等待API返回
            prompt: getVal('i2v-prompt', ''),
            title: (getVal('i2v-prompt', '') || '图生视频').toString().slice(0, 80),
            images: [],
            videos: [],
            audios: [],
            referenceImages: refImageUrl ? [refImageUrl] : [],
            model_name: model,
            progress: 0,
            progressStatus: '正在提交请求...'
          });
          
          // 刷新作品列表显示
          if (window.MediaStudio && window.MediaStudio.refreshWorksList) {
            window.MediaStudio.refreshWorksList();
          }
        }
        
        var authHeadersI2v = (window.MediaStudio && window.MediaStudio.getAuthHeaders && window.MediaStudio.getAuthHeaders()) || {};
        fetch(apiOrigin() + '/api/yunwu/videos/image2video', {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, authHeadersI2v),
        body: JSON.stringify(body),
      })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          var taskId = (data && data.data && (data.data.id || data.data.task_id || data.data.request_id)) ||
            (data && data.id) || (data && data.task_id) || (data && data.request_id) ||
            (data && data.data && data.data.request_id);
          if (!taskId) {
            var errMsg = (data && (data.message || data.error || (data.error && data.error.message))) ? (data.message || data.error || (data.error && data.error.message)) : '未返回任务 ID，请检查 API 响应';
            setResult('<span class="msg-error">✗ ' + String(errMsg).replace(/\n/g, '<br>') + '</span><pre>' + JSON.stringify(data || {}, null, 2) + '</pre>', true);
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
          setResult('任务已创建，轮询中: ' + taskId + ' …', true);
          var setProgress = function (txt) { setResult(txt, true); };
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
            if (window.MediaStudio && window.MediaStudio.refreshWorksList) window.MediaStudio.refreshWorksList();
          }
          btn.disabled = false;
        });
      }
    });
  }

  if (window.MediaStudio && window.MediaStudio.register) {
    window.MediaStudio.register(id, { name: name, icon: icon, getPanel: getPanel, init: init });
  }
})();
