/**
 * AI创作工坊 - 多图参考生图（可灵 multi-image2image）
 * 1~4 张主体参考图 + 可选场景/风格参考图，生成新图
 */
(function () {
  var id = 'editimg';
  var name = '多图参考生图';
  var icon = '🖼️';
  var MODELS = ['kling-v2', 'kling-v2-1'];
  var RATIOS = ['16:9', '9:16', '1:1', '4:3', '3:4', '3:2', '2:3', '21:9'];
  var MAX_SUBJECT_IMAGES = 4;
  var MIN_SUBJECT_IMAGES = 1;

  function getPanel() {
    var modelOpts = MODELS.map(function (m) { return '<option value="' + m + '">' + m + '</option>'; }).join('');
    var ratioOpts = RATIOS.map(function (r) { return '<option value="' + r + '">' + r + '</option>'; }).join('');
    var subjectSlots = [];
    for (var i = 0; i < MAX_SUBJECT_IMAGES; i++) {
      subjectSlots.push(
        '<div class="multi-img-slot" data-index="' + i + '">',
        '  <label>主体参考图 ' + (i + 1) + (i < MIN_SUBJECT_IMAGES ? ' <span class="required">*</span>' : '（可选）') + '</label>',
        '  <div class="t2i-image-input-wrap">',
        '    <input type="text" class="multi-subject-input" data-index="' + i + '" placeholder="图片 URL 或 Base64，或上传">',
        '    <input type="file" class="multi-subject-file" data-index="' + i + '" accept="image/jpeg,image/jpg,image/png" style="display:none;">',
        '    <button type="button" class="btn-secondary multi-subject-upload" data-index="' + i + '">上传</button>',
        '  </div>',
        '  <div class="multi-subject-preview" data-index="' + i + '" style="margin-top:6px;display:none;">',
        '    <img class="multi-subject-preview-img" data-index="' + i + '" style="max-width:120px;max-height:120px;border-radius:6px;border:1px solid var(--border);" alt="预览">',
        '    <button type="button" class="btn-secondary multi-subject-remove" data-index="' + i + '" style="margin-left:8px;font-size:0.85rem;">移除</button>',
        '  </div>',
        '</div>'
      );
    }
    return [
      '<h2 class="panel-title">多图参考生图 · 可灵 Kling</h2>',
      '<p class="hint" style="margin-bottom:12px;">上传 1~4 张主体参考图，可选场景/风格参考图，根据提示词生成新图。</p>',
      '<div class="form-row">',
      '  <label>模型 <span class="required">*</span></label>',
      '  <select id="multi-img-model">' + modelOpts + '</select>',
      '</div>',
      '<div class="form-row">',
      '  <label>正向提示词（可选，不能超过2500字符）</label>',
      '  <textarea id="multi-img-prompt" placeholder="描述想要生成的画面，例如：根据两张图的特点融合" maxlength="2500"></textarea>',
      '</div>',
      subjectSlots.join(''),
      '<div class="form-row">',
      '  <label>场景参考图（可选）</label>',
      '  <div class="t2i-image-input-wrap">',
      '    <input type="text" id="multi-img-scene" placeholder="图片 URL 或 Base64，或上传">',
      '    <input type="file" id="multi-img-scene-file" accept="image/jpeg,image/jpg,image/png" style="display:none;">',
      '    <button type="button" class="btn-secondary" id="multi-img-scene-upload">上传</button>',
      '  </div>',
      '  <div id="multi-img-scene-preview" style="margin-top:6px;display:none;"><img id="multi-img-scene-img" style="max-width:120px;max-height:120px;border-radius:6px;border:1px solid var(--border);" alt="场景"><button type="button" class="btn-secondary" id="multi-img-scene-remove" style="margin-left:8px;font-size:0.85rem;">移除</button></div>',
      '</div>',
      '<div class="form-row">',
      '  <label>风格参考图（可选）</label>',
      '  <div class="t2i-image-input-wrap">',
      '    <input type="text" id="multi-img-style" placeholder="图片 URL 或 Base64，或上传">',
      '    <input type="file" id="multi-img-style-file" accept="image/jpeg,image/jpg,image/png" style="display:none;">',
      '    <button type="button" class="btn-secondary" id="multi-img-style-upload">上传</button>',
      '  </div>',
      '  <div id="multi-img-style-preview" style="margin-top:6px;display:none;"><img id="multi-img-style-img" style="max-width:120px;max-height:120px;border-radius:6px;border:1px solid var(--border);" alt="风格"><button type="button" class="btn-secondary" id="multi-img-style-remove" style="margin-left:8px;font-size:0.85rem;">移除</button></div>',
      '</div>',
      '<div class="form-row">',
      '  <label>画面比例 aspect_ratio</label>',
      '  <select id="multi-img-aspect">' + ratioOpts + '</select>',
      '</div>',
      '<div class="form-row">',
      '  <label>生成数量 n（1~9）</label>',
      '  <input type="number" id="multi-img-n" min="1" max="9" value="1">',
      '</div>',
      '<div class="form-row">',
      '  <button type="button" class="btn-primary" id="multi-img-submit">生成图片</button>',
      '</div>',
      '<div class="result-area" id="multi-img-result">生成结果将显示在此处</div>'
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
    if (!/^[A-Za-z0-9+/=]+$/.test(str)) return '';
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
    var el = document.getElementById('multi-img-result');
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
        reject(new Error('图片不能超过 10MB'));
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
              // 如果返回的是 localhost URL，返回 base64 以便后续使用 base64 编码
              if (isLocalhost) {
                resolve({ url: '', base64: raw });
              } else {
                resolve({ url: url, base64: raw });
              }
            } else {
              // 上传失败，返回 base64
              resolve({ url: '', base64: raw });
            }
          })
          .catch(function () {
            // 请求失败，返回 base64
            resolve({ url: '', base64: raw });
          });
      };
      reader.onerror = function () { reject(new Error('读取文件失败')); };
      reader.readAsDataURL(file);
    });
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
          if (typeof setProgress === 'function') setProgress(progressText);
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
        if (typeof setProgress === 'function') setProgress(progressText);
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
        setResult('<span class="msg-error">' + (err.message || String(err)) + '</span>', true);
        callback('');
      });
      return;
    }
    
    if (!inputVal || typeof inputVal !== 'string') {
      callback('');
      return;
    }
    
    inputVal = inputVal.trim();
    
    // 检查是否是 data:image/ 格式的 base64
    var isBase64Input = /^data:image\//i.test(inputVal);
    if (isBase64Input) {
      imageBase64 = inputVal;
    } else if (/^https?:\/\//i.test(inputVal)) {
      imageUrl = inputVal;
    } else if (inputVal.length > 100) {
      // 可能是纯 base64 字符串
      imageBase64 = inputVal;
    }
    
    if (imageUrl || imageBase64) {
      chooseUrlOrBase64(imageUrl, imageBase64, function (chosen) {
        if (!chosen) {
          setResult('<span class="msg-error">✗ 无法处理图像，请重新上传或输入</span>', true);
          callback('');
          return;
        }
        callback(chosen);
      });
    } else {
      callback('');
    }
  }

  function init(container) {
    if (!container) return;

    var subjectInputs = container.querySelectorAll('.multi-subject-input');
    var subjectFiles = container.querySelectorAll('.multi-subject-file');
    var subjectUploads = container.querySelectorAll('.multi-subject-upload');
    var subjectPreviews = container.querySelectorAll('.multi-subject-preview');
    var subjectPreviewImgs = container.querySelectorAll('.multi-subject-preview-img');
    var subjectRemoves = container.querySelectorAll('.multi-subject-remove');

    subjectUploads.forEach(function (btn) {
      var idx = btn.getAttribute('data-index');
      btn.addEventListener('click', function () {
        var fileInput = container.querySelector('.multi-subject-file[data-index="' + idx + '"]');
        if (fileInput) fileInput.click();
      });
    });
    subjectFiles.forEach(function (fileInput) {
      var idx = fileInput.getAttribute('data-index');
      fileInput.addEventListener('change', function () {
        var file = fileInput.files && fileInput.files[0];
        if (!file) return;
        var input = container.querySelector('.multi-subject-input[data-index="' + idx + '"]');
        var previewWrap = container.querySelector('.multi-subject-preview[data-index="' + idx + '"]');
        var previewImg = container.querySelector('.multi-subject-preview-img[data-index="' + idx + '"]');
        uploadImageFile(file).then(function (res) {
          if (input) input.value = res.url || (res.base64 ? 'data:image/png;base64,' + res.base64.slice(0, 50) + '...' : '');
          if (previewImg) previewImg.src = res.url ? res.url : (res.base64 ? 'data:image/png;base64,' + res.base64 : '');
          if (previewWrap) previewWrap.style.display = 'block';
        });
      });
    });
    subjectRemoves.forEach(function (btn) {
      var idx = btn.getAttribute('data-index');
      btn.addEventListener('click', function () {
        var input = container.querySelector('.multi-subject-input[data-index="' + idx + '"]');
        var fileInput = container.querySelector('.multi-subject-file[data-index="' + idx + '"]');
        var previewWrap = container.querySelector('.multi-subject-preview[data-index="' + idx + '"]');
        var previewImg = container.querySelector('.multi-subject-preview-img[data-index="' + idx + '"]');
        if (input) input.value = '';
        if (fileInput) fileInput.value = '';
        if (previewImg) previewImg.src = '';
        if (previewWrap) previewWrap.style.display = 'none';
      });
    });

    var sceneInput = document.getElementById('multi-img-scene');
    var sceneFile = document.getElementById('multi-img-scene-file');
    var sceneUpload = document.getElementById('multi-img-scene-upload');
    var scenePreview = document.getElementById('multi-img-scene-preview');
    var sceneImg = document.getElementById('multi-img-scene-img');
    var sceneRemove = document.getElementById('multi-img-scene-remove');
    if (sceneUpload && sceneFile) {
      sceneUpload.addEventListener('click', function () { sceneFile.click(); });
      sceneFile.addEventListener('change', function () {
        var file = sceneFile.files && sceneFile.files[0];
        if (!file) return;
        uploadImageFile(file).then(function (res) {
          if (sceneInput) sceneInput.value = res.url || '';
          if (sceneImg) sceneImg.src = res.url || ('data:image/png;base64,' + (res.base64 || '').slice(0, 80) + '...');
          if (scenePreview) scenePreview.style.display = 'block';
        });
      });
    }
    if (sceneRemove && scenePreview) {
      sceneRemove.addEventListener('click', function () {
        if (sceneInput) sceneInput.value = '';
        if (sceneFile) sceneFile.value = '';
        if (sceneImg) sceneImg.src = '';
        scenePreview.style.display = 'none';
      });
    }

    var styleInput = document.getElementById('multi-img-style');
    var styleFile = document.getElementById('multi-img-style-file');
    var styleUpload = document.getElementById('multi-img-style-upload');
    var stylePreview = document.getElementById('multi-img-style-preview');
    var styleImg = document.getElementById('multi-img-style-img');
    var styleRemove = document.getElementById('multi-img-style-remove');
    if (styleUpload && styleFile) {
      styleUpload.addEventListener('click', function () { styleFile.click(); });
      styleFile.addEventListener('change', function () {
        var file = styleFile.files && styleFile.files[0];
        if (!file) return;
        uploadImageFile(file).then(function (res) {
          if (styleInput) styleInput.value = res.url || '';
          if (styleImg) styleImg.src = res.url || ('data:image/png;base64,' + (res.base64 || '').slice(0, 80) + '...');
          if (stylePreview) stylePreview.style.display = 'block';
        });
      });
    }
    if (styleRemove && stylePreview) {
      styleRemove.addEventListener('click', function () {
        if (styleInput) styleInput.value = '';
        if (styleFile) styleFile.value = '';
        if (styleImg) styleImg.src = '';
        stylePreview.style.display = 'none';
      });
    }

    var btn = document.getElementById('multi-img-submit');
    if (!btn) return;

    btn.addEventListener('click', function () {
      var apiKey = window.MediaStudio && window.MediaStudio.getYunwuApiKey && window.MediaStudio.getYunwuApiKey();
      if (!apiKey || !String(apiKey).trim()) {
        setResult('<span class="msg-warning">请先登录，由管理员在后台分配云雾 API Key 后即可使用</span>', true);
        return;
      }

      var subjectList = [];
      var pending = 0;
      var resolved = [];
      var hasError = false;

      for (var i = 0; i < MAX_SUBJECT_IMAGES; i++) {
        var input = container.querySelector('.multi-subject-input[data-index="' + i + '"]');
        var fileInput = container.querySelector('.multi-subject-file[data-index="' + i + '"]');
        var file = fileInput && fileInput.files && fileInput.files[0];
        var val = (input && input.value && input.value.trim()) || '';
        if (i < MIN_SUBJECT_IMAGES && !val && !file) {
          setResult('<span class="msg-warning">请至少上传或填写第 ' + (i + 1) + ' 张主体参考图</span>', true);
          return;
        }
        if (!val && !file) continue;

        pending++;
        (function (index) {
          resolveOneImage(val, file, function (resolvedUrlOrBase64) {
            resolved[index] = resolvedUrlOrBase64;
            if (!resolvedUrlOrBase64 && (index < MIN_SUBJECT_IMAGES || (input && input.value && input.value.trim()))) {
              hasError = true;
            }
            pending--;
            if (pending === 0) {
              for (var j = 0; j < MAX_SUBJECT_IMAGES; j++) {
                if (resolved[j]) subjectList.push({ subject_image: resolved[j] });
              }
              if (hasError || subjectList.length < MIN_SUBJECT_IMAGES) {
                setResult('<span class="msg-warning">请至少提供 1 张有效的主体参考图（URL 或上传）</span>', true);
                return;
              }
              doSubmit(subjectList);
            }
          });
        })(i);
      }

      if (pending === 0 && subjectList.length === 0) {
        setResult('<span class="msg-warning">请至少提供 1 张主体参考图</span>', true);
        return;
      }

      function doSubmit(subjectImageList) {
        var model = getVal('multi-img-model', 'kling-v2');
        var prompt = getVal('multi-img-prompt', '');
        var n = Math.min(9, Math.max(1, parseInt(getVal('multi-img-n', '1'), 10) || 1));
        var aspect_ratio = getVal('multi-img-aspect', '16:9');

        var body = {
          model_name: model,
          subject_image_list: subjectImageList,
          n: n,
          prompt: prompt || '',
          aspect_ratio: aspect_ratio || '16:9',
        };

        var sceneVal = (document.getElementById('multi-img-scene') && document.getElementById('multi-img-scene').value) || '';
        var styleVal = (document.getElementById('multi-img-style') && document.getElementById('multi-img-style').value) || '';
        if (sceneVal && sceneVal.trim()) {
          resolveOneImage(sceneVal.trim(), null, function (one) {
            if (one) body.scene_image = one;
            if (styleVal && styleVal.trim()) {
              resolveOneImage(styleVal.trim(), null, function (two) {
                if (two) body.style_image = two;
                sendRequest(body);
              });
            } else {
              sendRequest(body);
            }
          });
        } else if (styleVal && styleVal.trim()) {
          resolveOneImage(styleVal.trim(), null, function (two) {
            if (two) body.style_image = two;
            sendRequest(body);
          });
        } else {
          sendRequest(body);
        }
      }

      function sendRequest(body) {
        setResult('正在提交任务…', true);
        btn.disabled = true;
        
        var refImgs = (body.subject_image_list || []).map(function (s) { return s && s.subject_image; }).filter(Boolean);
        if (body.scene_image) refImgs.push(body.scene_image);
        if (body.style_image) refImgs.push(body.style_image);
        // 立即创建作品记录，显示"处理中"状态
        var workId = null;
        if (window.MediaStudio && window.MediaStudio.addWork) {
          workId = window.MediaStudio.addWork({
            type: 'editimg',
            status: 'processing',
            taskId: null, // 临时为null，等待API返回
            prompt: body.prompt || '',
            title: (body.prompt || '多图参考生图').toString().slice(0, 80),
            images: [],
            videos: [],
            audios: [],
            referenceImages: refImgs,
            model_name: body.model_name,
            progress: 0,
            progressStatus: '正在提交请求...'
          });
          
          // 刷新作品列表显示
          if (window.MediaStudio && window.MediaStudio.refreshWorksList) {
            window.MediaStudio.refreshWorksList();
          }
        }

        var authHeadersEdit = (window.MediaStudio && window.MediaStudio.getAuthHeaders && window.MediaStudio.getAuthHeaders()) || {};
        fetch(apiOrigin() + '/api/yunwu/images/multi-image2image', {
          method: 'POST',
          headers: Object.assign({ 'Content-Type': 'application/json' }, authHeadersEdit),
          body: JSON.stringify(body),
        })
          .then(function (r) { return r.json(); })
          .then(function (data) {
            var taskId = (data && data.data && (data.data.id || data.data.task_id || data.data.request_id)) ||
              (data && data.id) || (data && data.task_id) || (data && data.request_id);
            if (!taskId) {
              var errMsg = (data && (data.message || data.error || (data.error && data.error.message))) ? (data.message || data.error || (data.error && data.error.message)) : '未返回任务 ID';
              setResult('<span class="msg-error">✗ ' + String(errMsg).replace(/\n/g, '<br>') + '</span>' + (data && data.data ? '<pre>' + JSON.stringify(data, null, 2) + '</pre>' : ''), true);
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
            setResult('任务已创建，轮询中: ' + taskId + ' …', true);
            return new Promise(function (resolve, reject) {
              pollTask(taskId, apiKey, workId, function (txt) { setResult(txt, true); }, resolve, reject, 0);
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
              setResult('<span class="msg-warning">任务完成但未解析到资源链接。</span>' + (raw ? '<details><summary>原始响应</summary><pre>' + JSON.stringify(raw, null, 2).replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</pre></details>' : ''), true);
              btn.disabled = false;
              return;
            }
            var html = '<span class="msg-success">✓ 生成完成</span><br>';
            urls.forEach(function (u, i) {
              html += '<div class="t2i-out"><img src="' + (u || '').replace(/"/g, '&quot;') + '" alt="结果' + (i + 1) + '" style="max-width:100%;border-radius:8px;"><a href="' + (u || '#').replace(/"/g, '&quot;') + '" target="_blank" rel="noopener">打开大图</a></div>';
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
